// =====================================================================
// BookForge AI - Backend Server (Express + Gemini + Security & Engine APIs)
// Full Persistence Integration, Hardened Auth & Production Architecture
// =====================================================================

import express, { Request, Response } from "express";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

import {
  AuthUser,
  UserRole,
  BookAccessControl,
  AuditLogger,
  RateLimiter,
  EmergencyKillSwitch,
  SessionAuthService,
  PasswordService,
} from "./src/lib/security";
import { CostGuard } from "./src/lib/engine/CostGuard";
import { BibleEngine } from "./src/lib/engine/BibleEngine";
import { ContinuityAgent } from "./src/lib/engine/ContinuityAgent";
import { VersionService } from "./src/lib/engine/VersionService";
import { FullBookEngine } from "./src/lib/engine/FullBookEngine";
import { AssetEngine } from "./src/lib/engine/AssetEngine";
import { db } from "./src/lib/db";
import { BookProject } from "./src/types";

dotenv.config();

const app = express();
const PORT = 3000;

app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});

app.use(express.json({ limit: "15mb" }));

if (process.env.FOUNDER_PASSWORD) {
  const bootstrapUser = db.getUsers().find((u) => u.role === "FOUNDER");
  if (bootstrapUser && !bootstrapUser.passwordHash) {
    db.saveUser({
      ...bootstrapUser,
      passwordHash: PasswordService.hash(process.env.FOUNDER_PASSWORD),
    });
  }
}

// ---------------------------------------------------------------------
// GLOBAL API AUTHENTICATION GATE
// Deny by default. Public API routes are explicitly allow-listed.
// Protected routes require a live server-side session.
// ---------------------------------------------------------------------
app.use("/api", (req, res, next) => {
  const publicRoutes = new Set([
    "GET /api/health",
    "POST /api/auth/login",
    "POST /api/auth/logout",
  ]);
  const routeKey = `${req.method} ${req.path}`;

  if (publicRoutes.has(routeKey)) {
    return next();
  }

  const authHeader = req.headers.authorization;
  const cookieHeader = req.headers.cookie || "";
  const cookieName = process.env.NODE_ENV === "production" ? "__Host-bf_session" : "bf_session";
  const cookiePair = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`));
  const cookieToken = cookiePair ? decodeURIComponent(cookiePair.slice(cookieName.length + 1)) : "";
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : cookieToken;

  if (!token) {
    return res.status(401).json({ error: "Autentisering kreves." });
  }
  if (!token || token.length < 32) {
    return res.status(401).json({ error: "Ugyldig autentiseringstoken." });
  }

  const session = db.getSession(token);
  if (!session) {
    return res.status(401).json({ error: "Sesjonen er ugyldig eller utløpt." });
  }

  const sessionUser = db.getUser(session.userId);
  if (!sessionUser) {
    db.deleteSession(token);
    return res.status(401).json({ error: "Brukeren til sesjonen finnes ikke." });
  }

  return next();
});

// ---------------------------------------------------------------------
// Connect Core Services to Authoritative Persistence Layer
// ---------------------------------------------------------------------
AuditLogger.setPersistenceAdapter({
  saveAuditLog: (entry) => db.saveAuditLog(entry),
  getAuditLogs: (limit, filter) => db.getAuditLogs(limit, filter),
});

EmergencyKillSwitch.setPersistenceAdapter({
  getKillSwitchState: () => db.getKillSwitchState(),
  setKillSwitchState: (state, actor) => db.setKillSwitchState(state, actor),
});

CostGuard.setPersistenceAdapter({
  saveCostRecord: (record) => db.saveCostRecord(record),
  getCostRecords: () => db.getCostRecords(),
});

VersionService.setPersistenceAdapter({
  saveSnapshot: (snapshot) => db.saveSnapshot(snapshot),
  getSnapshots: (projectId) => db.getSnapshots(projectId),
});

// ---------------------------------------------------------------------
// Lazy Gemini Client Helper
// ---------------------------------------------------------------------
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
  }
  return aiClient;
}

// ---------------------------------------------------------------------
// Hardened User Context Extraction & Database Authentication
// ---------------------------------------------------------------------
function getAuthUser(req: Request): AuthUser {
  const authHeader = req.headers.authorization;
  let userId = (req.headers["x-user-id"] as string) || "";

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    // 1. Authoritative lookup in persistent session storage
    const session = db.getSession(token);
    if (session) {
      const user = db.getUser(session.userId);
      if (user) {
        return user;
      }
      userId = session.userId;
    } else if (token.startsWith("token-")) {
      userId = token.replace("token-", "");
    } else if (token) {
      userId = token;
    }
  }

  // 2. Authoritative lookup in persistent DB by ID
  if (userId) {
    const existing = db.getUser(userId);
    if (existing) {
      return {
        id: existing.id,
        name: existing.name,
        email: existing.email,
        role: existing.role,
        subscriptionPlan: existing.subscriptionPlan,
        organizationId: existing.organizationId,
      };
    }
  }

  // 3. Fallback header extraction with strict role validation
  const roleHeader = (req.headers["x-user-role"] as string) || "FOUNDER";
  const validRoles: UserRole[] = ["FOUNDER", "ADMIN", "AUTHOR", "READER"];
  const role: UserRole = validRoles.includes(roleHeader as UserRole)
    ? (roleHeader as UserRole)
    : "AUTHOR";

  const fallbackUser: AuthUser = {
    id: userId || "user-anne-beth-1",
    name: (req.headers["x-user-name"] as string) || "Anne Beth Andersen",
    email: (req.headers["x-user-email"] as string) || "anne.beth@bookforge.ai",
    role,
    subscriptionPlan: role === "FOUNDER" ? "STUDIO" : "PRO",
  };

  // Ensure record is saved to DB
  if (!db.getUser(fallbackUser.id)) {
    db.saveUser(fallbackUser);
  }

  return fallbackUser;
}

// ---------------------------------------------------------------------
// AUTHENTICATION & SESSION MANAGEMENT
// ---------------------------------------------------------------------
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (typeof email !== "string" || !email.trim() || typeof password !== "string") {
    return res.status(400).json({ error: "E-postadresse og passord er påkrevd." });
  }

  const user = db.getUsers().find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  const validPassword = Boolean(user?.passwordHash) && PasswordService.verify(password, user!.passwordHash!);

  if (!user || !validPassword) {
    AuditLogger.log({
      actorId: "anonymous",
      actorRole: "READER",
      action: "USER_LOGIN",
      status: "BLOCKED",
      metadata: { reason: "INVALID_CREDENTIALS" },
    });
    return res.status(401).json({ error: "Ugyldig innlogging." });
  }

  const { token, expiresAt } = SessionAuthService.generateSessionToken(user.id);
  db.createSession(user.id, token, expiresAt);

  const secureCookie = process.env.NODE_ENV === "production";
  const sessionCookieName = secureCookie ? "__Host-bf_session" : "bf_session";
  res.setHeader(
    "Set-Cookie",
    `${sessionCookieName}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict${secureCookie ? "; Secure" : ""}; Max-Age=259200`
  );
  res.setHeader("Cache-Control", "no-store");

  AuditLogger.log({
    actorId: user.id,
    actorRole: user.role,
    action: "USER_LOGIN",
    status: "SUCCESS",
    metadata: { email: user.email },
  });

  return res.json({
    expiresAt,
    user: { ...user, passwordHash: undefined },
  });
});

app.post("/api/auth/logout", (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    const session = db.getSession(token);
    if (session) {
      AuditLogger.log({
        actorId: session.userId,
        actorRole: "AUTHOR",
        action: "USER_LOGOUT",
        status: "SUCCESS",
      });
      db.deleteSession(token);
    }
  }
  const sessionCookieName = process.env.NODE_ENV === "production" ? "__Host-bf_session" : "bf_session";
  res.setHeader(
    "Set-Cookie",
    `${sessionCookieName}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0` +
      (process.env.NODE_ENV === "production" ? "; Secure" : "")
  );
  res.setHeader("Clear-Site-Data", '"cache", "cookies", "storage"');
  return res.json({ success: true });
});

app.get("/api/auth/me", (req, res) => {
  const user = getAuthUser(req);
  return res.json({ user });
});

// ---------------------------------------------------------------------
// ORGANIZATIONS & TENANCY
// ---------------------------------------------------------------------
app.get("/api/organizations", (req, res) => {
  const user = getAuthUser(req);
  if (user.role === "FOUNDER" || user.role === "ADMIN") {
    return res.json(db.getOrganizations());
  }
  if (!user.organizationId) {
    return res.json([]);
  }
  const org = db.getOrganization(user.organizationId);
  return res.json(org ? [org] : []);
});

app.get("/api/organizations/:id", (req, res) => {
  const user = getAuthUser(req);
  const org = db.getOrganization(req.params.id);
  if (!org) {
    return res.status(404).json({ error: "Organisasjon ikke funnet." });
  }

  const isPrivileged = user.role === "FOUNDER" || user.role === "ADMIN";
  if (!isPrivileged && user.organizationId !== org.id && user.organizationId !== org.slug) {
    return res.status(403).json({ error: "Adgang nektet." });
  }

  return res.json(org);
});

// ---------------------------------------------------------------------
// Health & Platform Status
// ---------------------------------------------------------------------
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    model: "gemini-3.8-flash",
    killSwitchActive: EmergencyKillSwitch.getState().active,
    persistence: "database-adapter",
    serverTime: new Date().toISOString(),
  });
});

app.get("/api/auth/me", (req, res) => {
  const user = getAuthUser(req);
  const allUsers = user.role === "FOUNDER" ? db.getUsers() : undefined;
  return res.json({ user, allUsers });
});

app.get("/api/founder/kill-switch-status", (req, res) => {
  const user = getAuthUser(req);
  const authCheck = BookAccessControl.requireFounder(user);
  if (!authCheck.allowed) return res.status(403).json({ error: authCheck.reason });
  res.json(EmergencyKillSwitch.getState());
});

// ---------------------------------------------------------------------
// FOUNDER MISSION CONTROL & EMERGENCY KILL SWITCH
// ---------------------------------------------------------------------
app.get("/api/founder/stats", (req, res) => {
  const user = getAuthUser(req);
  const authCheck = BookAccessControl.requireFounder(user);
  if (!authCheck.allowed) {
    AuditLogger.log({
      actorId: user.id,
      actorRole: user.role,
      action: "VIEW_FOUNDER_STATS",
      status: "BLOCKED",
      errorMessage: authCheck.reason,
    });
    return res.status(403).json({ error: authCheck.reason });
  }

  const projects = db.getProjects();
  const users = db.getUsers();

  let totalWordsGenerated = 0;
  projects.forEach((p) => {
    p.chapters?.forEach((c) => {
      if (c.content) {
        totalWordsGenerated += c.currentWords || c.content.trim().split(/\s+/).length;
      }
    });
  });

  const tokenUsage = CostGuard.getTotalTokens();
  const spend = CostGuard.getTotalPlatformSpend();

  // Calculated revenue based on active users' subscription tiers
  const totalRevenueUsd = users.reduce((acc, u) => {
    if (u.subscriptionPlan === "STUDIO") return acc + 29;
    if (u.subscriptionPlan === "PRO") return acc + 19;
    return acc;
  }, 0);

  return res.json({
    totalUsers: users.length,
    activeProjects: projects.length,
    totalWordsGenerated,
    totalAiCostUsd: spend,
    totalRevenueUsd,
    activeJobsCount: RateLimiter.getTotalActiveJobs(),
    tokenUsage,
    killSwitch: EmergencyKillSwitch.getState(),
    auditLogs: AuditLogger.getRecentLogs(50),
  });
});

app.post("/api/founder/kill-switch", (req, res) => {
  const user = getAuthUser(req);
  const { active, reason } = req.body;

  try {
    const updated = EmergencyKillSwitch.setKillSwitch(Boolean(active), user, reason);
    return res.json(updated);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Kunne ikke endre Kill Switch";
    return res.status(403).json({ error: msg });
  }
});

app.get("/api/founder/audit-logs", (req, res) => {
  const user = getAuthUser(req);
  const authCheck = BookAccessControl.requireFounder(user);
  if (!authCheck.allowed) {
    return res.status(403).json({ error: authCheck.reason });
  }

  const limit = parseInt(req.query.limit as string) || 50;
  return res.json(AuditLogger.getRecentLogs(limit));
});

// ---------------------------------------------------------------------
// BOOK PROJECTS CRUD (Authoritative Database Operations)
// ---------------------------------------------------------------------
app.get("/api/books", (req, res) => {
  const user = getAuthUser(req);
  const all = db.getProjects();

  if (user.role === "FOUNDER" || user.role === "ADMIN") {
    return res.json(all);
  }

  const filtered = all.filter((p) => !p.ownerId || p.ownerId === user.id);
  return res.json(filtered);
});

app.get("/api/books/:id", (req, res) => {
  const user = getAuthUser(req);
  const book = db.getProject(req.params.id);

  if (!book) {
    return res.status(404).json({ error: "Bokprosjekt ikke funnet." });
  }

  if (book.ownerId) {
    const access = BookAccessControl.validateAccess(user, book.ownerId, "read");
    if (!access.allowed) {
      return res.status(403).json({ error: access.reason });
    }
  }

  return res.json(book);
});

app.post("/api/books", (req, res) => {
  const user = getAuthUser(req);
  const bookData = req.body ?? {};

  if (typeof bookData.title !== "string" || !bookData.title.trim()) {
    return res.status(400).json({ error: "Boktittel er påkrevd." });
  }

  const book: BookProject = {
    title: bookData.title.trim(),
    author: typeof bookData.author === "string" ? bookData.author : user.name,
    genre: typeof bookData.genre === "string" ? bookData.genre : undefined,
    description: typeof bookData.description === "string" ? bookData.description : undefined,
    chapters: Array.isArray(bookData.chapters) ? bookData.chapters : [],
    settings: bookData.settings && typeof bookData.settings === "object" ? bookData.settings : undefined,
    id: `book-${crypto.randomUUID()}`,
    ownerId: user.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.saveProject(book);

  AuditLogger.log({
    actorId: user.id,
    actorRole: user.role,
    action: "CREATE_PROJECT",
    projectId: book.id,
    status: "SUCCESS",
    metadata: { title: book.title },
  });

  return res.json(book);
});

app.put("/api/books/:id", (req, res) => {
  const user = getAuthUser(req);
  const existing = db.getProject(req.params.id);

  if (!existing) {
    return res.status(404).json({ error: "Bokprosjekt ikke funnet." });
  }

  if (existing.ownerId) {
    const access = BookAccessControl.validateAccess(user, existing.ownerId, "write");
    if (!access.allowed) {
      return res.status(403).json({ error: access.reason });
    }
  }

  const incoming = req.body ?? {};
  const updated: BookProject = {
    ...existing,
    title: typeof incoming.title === "string" ? incoming.title.trim() : existing.title,
    author: typeof incoming.author === "string" ? incoming.author : existing.author,
    genre: typeof incoming.genre === "string" ? incoming.genre : existing.genre,
    description: typeof incoming.description === "string" ? incoming.description : existing.description,
    chapters: Array.isArray(incoming.chapters) ? incoming.chapters : existing.chapters,
    settings: incoming.settings && typeof incoming.settings === "object" ? incoming.settings : existing.settings,
    id: existing.id,
    ownerId: existing.ownerId,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };

  db.saveProject(updated);

  AuditLogger.log({
    actorId: user.id,
    actorRole: user.role,
    action: "UPDATE_PROJECT",
    projectId: updated.id,
    status: "SUCCESS",
    metadata: { title: updated.title },
  });

  return res.json(updated);
});

app.delete("/api/books/:id", (req, res) => {
  const user = getAuthUser(req);
  const existing = db.getProject(req.params.id);

  if (!existing) {
    return res.status(404).json({ error: "Bokprosjekt ikke funnet." });
  }

  if (existing.ownerId) {
    const access = BookAccessControl.validateAccess(user, existing.ownerId, "admin");
    if (!access.allowed) {
      return res.status(403).json({ error: access.reason });
    }
  }

  db.deleteProject(req.params.id);

  AuditLogger.log({
    actorId: user.id,
    actorRole: user.role,
    action: "DELETE_PROJECT",
    projectId: req.params.id,
    status: "SUCCESS",
  });

  return res.json({ success: true, deletedId: req.params.id });
});

// ---------------------------------------------------------------------
// BOOK BIBLE PERSISTENCE
// ---------------------------------------------------------------------
app.get("/api/books/:id/bible", (req, res) => {
  const user = getAuthUser(req);
  const project = db.getProject(req.params.id);
  if (!project) return res.status(404).json({ error: "Bokprosjekt ikke funnet." });

  const access = BookAccessControl.validateAccess(user, project.ownerId || "", "read");
  if (!access.allowed) return res.status(403).json({ error: access.reason });

  const bible = db.getBible(req.params.id);
  if (bible) return res.json(bible);

  const engine = new BibleEngine(project);
  return res.json(engine.getData());
});

app.put("/api/books/:id/bible", (req, res) => {
  const user = getAuthUser(req);
  const project = db.getProject(req.params.id);

  if (project && project.ownerId) {
    const access = BookAccessControl.validateAccess(user, project.ownerId, "write");
    if (!access.allowed) {
      return res.status(403).json({ error: access.reason });
    }
  }

  db.saveBible(req.params.id, req.body);

  AuditLogger.log({
    actorId: user.id,
    actorRole: user.role,
    action: "UPDATE_PROJECT",
    projectId: req.params.id,
    status: "SUCCESS",
    metadata: { target: "BOKBIBEL" },
  });

  return res.json({ success: true, bible: req.body });
});

// ---------------------------------------------------------------------
// FULL AUTONOMOUS BOOK GENERATION ENGINE API
// ---------------------------------------------------------------------
app.post("/api/book/generate-full-book", async (req, res) => {
  const user = getAuthUser(req);
  const {
    projectId,
    idea,
    title,
    author,
    genre,
    subgenre,
    tone,
    audience,
    language,
    pov,
    targetWords,
    targetChapters,
    acts,
  } = req.body;

  if (!idea && !title) {
    return res.status(400).json({ error: "En idé eller tittel er påkrevd for å starte bokgenerering." });
  }

  // Verify project existence or create one if not existing
  let project = projectId ? db.getProject(projectId) : undefined;
  if (!project) {
    const newId = projectId || `proj-${Date.now()}`;
    project = {
      id: newId,
      ownerId: user.id,
      title: title || "Uten tittel",
      idea: idea || "",
      genre: genre || "Roman",
      tone: tone || "Realistisk",
      lengthLabel: "Standard",
      targetWords: targetWords || 80000,
      currentWords: 0,
      targetChapters: targetChapters || 32,
      synopsis: "",
      coverStyle: "Minimalistisk",
      phase: "planned",
      progress: 0,
      activeChapter: 1,
      acts: acts || 4,
      pov: pov || "Tredjeperson personlig",
      ending: "Lukket",
      author: author || user.name || "Anne Beth Andersen",
      chapters: [],
      characters: [],
      locations: [],
      timeline: [],
      continuityRules: [],
      covers: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.saveProject(project);
  } else if (project.ownerId) {
    const access = BookAccessControl.validateAccess(user, project.ownerId, "write");
    if (!access.allowed) {
      return res.status(403).json({ error: access.reason });
    }
  }

  const aiClient = getGeminiClient();
  if (!aiClient) {
    return res.status(500).json({
      error: "AI-tjenesten krever en konfigurert GEMINI_API_KEY for ekte bokgenerering. Falsk simulering er strengt deaktivert.",
    });
  }

  try {
    const job = await FullBookEngine.startGeneration(
      {
        projectId: project.id,
        idea: idea || project.idea || project.title,
        title: title || project.title,
        author: author || project.author || user.name,
        genre: genre || project.genre,
        subgenre,
        tone: tone || project.tone,
        audience,
        language: language || "Norsk (Bokmål)",
        pov: pov || project.pov,
        targetWords: targetWords || project.targetWords || 80000,
        targetChapters: targetChapters || project.targetChapters || 32,
        acts: acts || project.acts || 4,
        user,
      },
      aiClient
    );

    return res.json({
      jobId: job.id,
      projectId: job.projectId,
      status: job.status,
      phase: job.phase,
      totalChapters: job.totalChapters,
      targetWords: job.totalWords,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Kunne ikke starte bokgenerering";
    console.error("[Server] Feil ved oppstart av full-book generering:", msg);
    return res.status(500).json({ error: msg });
  }
});

app.get("/api/book/generation/:jobId", (req, res) => {
  const user = getAuthUser(req);
  const job = FullBookEngine.getJob(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: "Genereringsjobb ikke funnet." });
  }
  const project = db.getProject(job.projectId);
  if (!project) return res.status(404).json({ error: "Tilknyttet prosjekt ikke funnet." });
  const access = BookAccessControl.validateAccess(user, project.ownerId || "", "read");
  if (!access.allowed) return res.status(403).json({ error: access.reason });
  return res.json(job);
});

app.post("/api/book/generation/:jobId/cancel", (req, res) => {
  const user = getAuthUser(req);
  const job = FullBookEngine.getJob(req.params.jobId);
  if (!job) return res.status(404).json({ error: "Genereringsjobb ikke funnet." });
  const project = db.getProject(job.projectId);
  if (!project) return res.status(404).json({ error: "Tilknyttet prosjekt ikke funnet." });
  const access = BookAccessControl.validateAccess(user, project.ownerId || "", "write");
  if (!access.allowed) return res.status(403).json({ error: access.reason });
  const success = FullBookEngine.cancelJob(req.params.jobId);
  return res.json({ success, jobId: req.params.jobId });
});

// Resume a generation job from its persistent checkpoint
app.post("/api/book/generation/:jobId/resume", async (req, res) => {
  const user = getAuthUser(req);
  const existingJob = FullBookEngine.getJob(req.params.jobId);
  if (!existingJob) return res.status(404).json({ error: "Genereringsjobb ikke funnet." });
  const project = db.getProject(existingJob.projectId);
  if (!project) return res.status(404).json({ error: "Tilknyttet prosjekt ikke funnet." });
  const access = BookAccessControl.validateAccess(user, project.ownerId || "", "write");
  if (!access.allowed) return res.status(403).json({ error: access.reason });

  const ai = getGeminiClient();
  if (!ai) {
    return res.status(503).json({
      error: "AI-tjenesten krever konfigurert GEMINI_API_KEY for å gjenoppta genereringsjobb. Falsk simulering er deaktivert.",
    });
  }

  try {
    const job = await FullBookEngine.resumeJob(req.params.jobId, ai, user);
    return res.json(job);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Kunne ikke gjenoppta genereringsjobb";
    return res.status(500).json({ error: msg });
  }
});

app.get("/api/book/generation/project/:projectId", (req, res) => {
  const user = getAuthUser(req);
  const project = db.getProject(req.params.projectId);
  if (!project) return res.status(404).json({ error: "Bokprosjekt ikke funnet." });
  const access = BookAccessControl.validateAccess(user, project.ownerId || "", "read");
  if (!access.allowed) return res.status(403).json({ error: access.reason });
  const job = db.getGenerationJobForProject(req.params.projectId);
  if (!job) {
    return res.status(404).json({ error: "Ingen genereringsjobb funnet for dette prosjektet." });
  }
  return res.json(job);
});

// ---------------------------------------------------------------------
// CREATIVE ASSET GENERATION (Covers, Illustrations, Character Art)
// ---------------------------------------------------------------------
app.post("/api/assets/generate", async (req, res) => {
  const user = getAuthUser(req);
  const { projectId, type, title, customPrompt, chapterNumber, characterName, aspectRatio } = req.body;

  if (!projectId || !type || !title) {
    return res.status(400).json({ error: "Mangler påkrevde parametere (projectId, type, title)." });
  }

  const project = db.getProject(projectId);
  if (!project) {
    return res.status(404).json({ error: "Bokprosjekt ikke funnet." });
  }

  if (project.ownerId) {
    const access = BookAccessControl.validateAccess(user, project.ownerId, "write");
    if (!access.allowed) {
      return res.status(403).json({ error: access.reason });
    }
  }

  try {
    const ai = getGeminiClient();
    const assetEngine = AssetEngine.getInstance();
    const asset = await assetEngine.generateAsset(
      project,
      { projectId, type, title, customPrompt, chapterNumber, characterName, aspectRatio },
      ai,
      user
    );

    AuditLogger.log({
      actorId: user.id,
      actorRole: user.role,
      action: "GENERATE_ASSET",
      projectId,
      status: "SUCCESS",
      metadata: { assetId: asset.id, type: asset.type, title: asset.title },
    });

    return res.json(asset);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Kunne ikke generere visuelt element.";
    return res.status(500).json({ error: msg });
  }
});

app.get("/api/assets/project/:projectId", (req, res) => {
  const user = getAuthUser(req);
  const project = db.getProject(req.params.projectId);
  if (!project) return res.status(404).json({ error: "Bokprosjekt ikke funnet." });
  const access = BookAccessControl.validateAccess(user, project.ownerId || "", "read");
  if (!access.allowed) return res.status(403).json({ error: access.reason });
  const assets = db.getAssetsForProject(req.params.projectId);
  return res.json(assets);
});

app.get("/api/assets/:id", (req, res) => {
  const user = getAuthUser(req);
  const asset = db.getAsset(req.params.id);
  if (!asset) {
    return res.status(404).json({ error: "Visuelt element ikke funnet." });
  }
  const project = db.getProject(asset.projectId);
  if (!project) return res.status(404).json({ error: "Tilknyttet prosjekt ikke funnet." });
  const access = BookAccessControl.validateAccess(user, project.ownerId || "", "read");
  if (!access.allowed) return res.status(403).json({ error: access.reason });
  return res.json(asset);
});

// ---------------------------------------------------------------------
// AI GENERATION ENDPOINTS
// ---------------------------------------------------------------------

// API: Generate Synopsis
app.post("/api/book/generate-synopsis", async (req, res) => {
  const user = getAuthUser(req);
  const { idea, title, genre, tone, length, projectId } = req.body;

  // 1. Project Isolation Check
  if (!projectId) return res.status(400).json({ error: "projectId er påkrevd." });
  const synopsisProject = db.getProject(projectId);
  if (!synopsisProject) return res.status(404).json({ error: "Bokprosjekt ikke funnet." });
  const synopsisAccess = BookAccessControl.validateAccess(user, synopsisProject.ownerId || "", "write");
  if (!synopsisAccess.allowed) {
    AuditLogger.log({
      actorId: user.id,
      actorRole: user.role,
      action: "GENERATE_SYNOPSIS",
      projectId,
      status: "BLOCKED",
      errorMessage: synopsisAccess.reason,
    });
    return res.status(403).json({ error: synopsisAccess.reason });
  }
  }

  // 2. Emergency Kill Switch Guard
  try {
    EmergencyKillSwitch.assertCanGenerate();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "AI er stanset via Kill Switch.";
    AuditLogger.log({
      actorId: user.id,
      actorRole: user.role,
      action: "KILL_SWITCH_BLOCKED",
      projectId,
      status: "BLOCKED",
      errorMessage: msg,
    });
    return res.status(503).json({ error: msg, killSwitchActive: true });
  }

  // 3. Rate Limiter Slot Reservation
  const jobId = `job-synopsis-${Date.now()}`;
  const slot = RateLimiter.acquireJobSlot(user, jobId, "GENERATE_SYNOPSIS");
  if (!slot.success) {
    return res.status(429).json({ error: slot.error });
  }

  // 4. Cost Guard Budget Verification
  try {
    CostGuard.checkBudget(user, projectId);
  } catch (err: unknown) {
    RateLimiter.releaseJobSlot(user.id, jobId);
    const msg = err instanceof Error ? err.message : "Budsjett overskredet.";
    return res.status(402).json({ error: msg });
  }

  try {
    const ai = getGeminiClient();

    if (!ai) {
      RateLimiter.releaseJobSlot(user.id, jobId);
      AuditLogger.log({
        actorId: user.id,
        actorRole: user.role,
        action: "GENERATE_SYNOPSIS",
        projectId,
        status: "FAILURE",
        errorMessage: "GEMINI_API_KEY er ikke konfigurert. Falsk simulering er deaktivert.",
      });

      return res.status(503).json({
        error: "AI-tjenesten krever en konfigurert GEMINI_API_KEY for å generere synopsis. Falsk simulering er deaktivert.",
      });
    }

    const prompt = `Du er en prisvinnende forfatter og sjefsredaktør.
Lag en fengslende, sammenhengende synopsis på norsk for en bok med følgende spesifikasjon:
Tittel: ${title}
Idé: ${idea}
Sjanger: ${genre}
Tone: ${tone}
Format: ${length}

Svar i formatet:
SYNOPSIS: [Et sammenhengende, filmatisk avsnitt på ca. 80-120 ord med katalysator, konflikt, eskalerende innsats og klimaktisk dilemma]
AKTER: 4
POV: 1
SLUTT: Lukket`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
    });

    const text = response.text || "";
    const synopsisMatch = text.match(/SYNOPSIS:\s*([\s\S]*?)(?=AKTER:|$)/i);
    const synopsis = synopsisMatch ? synopsisMatch[1].trim() : text.trim();

    CostGuard.recordUsage({
      userId: user.id,
      projectId,
      action: "GENERATE_SYNOPSIS",
      inputTokens: prompt.length / 4,
      outputTokens: text.length / 4,
    });

    AuditLogger.log({
      actorId: user.id,
      actorRole: user.role,
      action: "GENERATE_SYNOPSIS",
      projectId,
      status: "SUCCESS",
      metadata: { title, genre },
    });

    return res.json({
      synopsis,
      acts: 4,
      pov: "1 (Tredjeperson begrenset)",
      ending: "Lukket",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Kunne ikke generere synopsis med AI";
    console.error("Synopsis generation error:", error);
    AuditLogger.log({
      actorId: user.id,
      actorRole: user.role,
      action: "GENERATE_SYNOPSIS",
      projectId,
      status: "FAILURE",
      errorMessage: msg,
    });
    return res.status(500).json({ error: msg });
  } finally {
    RateLimiter.releaseJobSlot(user.id, jobId);
  }
});

// API: Write Chapter (Deeply Integrated with BibleEngine, ContinuityAgent, CostGuard)
app.post("/api/book/write-chapter", async (req, res) => {
  const user = getAuthUser(req);
  const {
    chapterNumber,
    chapterTitle,
    chapterSummary,
    bookTitle,
    genre,
    tone,
    characters,
    previousSummary,
    projectId,
    bibleData,
  } = req.body;

  // 1. Access Control
  if (!projectId) return res.status(400).json({ error: "projectId er påkrevd." });
  const chapterProject = db.getProject(projectId);
  if (!chapterProject) return res.status(404).json({ error: "Bokprosjekt ikke funnet." });
  const chapterAccess = BookAccessControl.validateAccess(user, chapterProject.ownerId || "", "write");
  if (!chapterAccess.allowed) {
    AuditLogger.log({
      actorId: user.id,
      actorRole: user.role,
      action: "WRITE_CHAPTER",
      projectId,
      status: "BLOCKED",
      errorMessage: chapterAccess.reason,
    });
    return res.status(403).json({ error: chapterAccess.reason });
  }

  // 2. Kill Switch Guard
  try {
    EmergencyKillSwitch.assertCanGenerate();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "AI er stanset.";
    AuditLogger.log({
      actorId: user.id,
      actorRole: user.role,
      action: "KILL_SWITCH_BLOCKED",
      projectId,
      status: "BLOCKED",
      errorMessage: msg,
    });
    return res.status(503).json({ error: msg, killSwitchActive: true });
  }

  // 3. Rate Limit Check
  const jobId = `job-chapter-${chapterNumber}-${Date.now()}`;
  const slot = RateLimiter.acquireJobSlot(user, jobId, "WRITE_CHAPTER");
  if (!slot.success) {
    return res.status(429).json({ error: slot.error });
  }

  // 4. Cost Guard Budget Check
  try {
    CostGuard.checkBudget(user, projectId);
  } catch (err: unknown) {
    RateLimiter.releaseJobSlot(user.id, jobId);
    const msg = err instanceof Error ? err.message : "Budsjettgrense nådd.";
    return res.status(402).json({ error: msg });
  }

  try {
    // 5. Bible Context Construction
    const bibleEngine = new BibleEngine(
      bibleData || {
        title: bookTitle,
        genre,
        tone,
      }
    );
    const bibleContext = bibleEngine.buildContextForChapter(chapterNumber, characters);

    const ai = getGeminiClient();
    if (!ai) {
      RateLimiter.releaseJobSlot(user.id, jobId);
      AuditLogger.log({
        actorId: user.id,
        actorRole: user.role,
        action: "WRITE_CHAPTER",
        projectId,
        status: "FAILURE",
        errorMessage: "GEMINI_API_KEY er ikke konfigurert. Simulering eller falsk fallback er deaktivert.",
      });

      return res.status(503).json({
        error: "AI-tjenesten krever en konfigurert GEMINI_API_KEY for ekte kapittelskriving. Falsk simulering er deaktivert.",
      });
    }

    const prompt = `Du er en skjønnlitterær forfatter på toppnivå. Skriv et komplett, velskrevet utdrag for Kapittel ${chapterNumber} i romanen "${bookTitle}".
Sjanger: ${genre}
Tone: ${tone}
Kapitteltittel: ${chapterTitle}
Handling/Mål: ${chapterSummary}
Kontekst fra forrige kapittel: ${previousSummary || "Romanens åpning"}
Relevante karakterer: ${characters || "Hovedpersonen"}

${bibleContext}

Krav:
- Skriv på levende, sanselig norsk med naturlige dialoger, atmosfære, spenning og kontinuitet.
- Hold deg tro mot tone, sjanger og kontinuitetsregler.
- Skriv 4-6 fyldige scener/avsnitt som utfyller handlingen uten oppsummeringer eller metaforklaringer.
- Start direkte med kapittelets åpningssetning.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
    });

    const content = response.text || "";
    const words = content.trim().split(/\s+/).length;

    CostGuard.recordUsage({
      userId: user.id,
      projectId,
      action: "WRITE_CHAPTER",
      inputTokens: Math.round(prompt.length / 4),
      outputTokens: Math.round(content.length / 4),
    });

    AuditLogger.log({
      actorId: user.id,
      actorRole: user.role,
      action: "WRITE_CHAPTER",
      projectId,
      status: "SUCCESS",
      metadata: { chapterNumber, chapterTitle, wordCount: words },
    });

    return res.json({
      content,
      wordCount: words,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Kunne ikke skrive kapittel med AI";
    console.error("Chapter write error:", error);
    AuditLogger.log({
      actorId: user.id,
      actorRole: user.role,
      action: "WRITE_CHAPTER",
      projectId,
      status: "FAILURE",
      errorMessage: msg,
    });
    return res.status(500).json({ error: msg });
  } finally {
    RateLimiter.releaseJobSlot(user.id, jobId);
  }
});

// API: Character Journey Analysis
app.post("/api/book/generate-character-journey", async (req, res) => {
  try {
    EmergencyKillSwitch.assertCanGenerate();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "AI stanset";
    return res.status(503).json({ error: msg, killSwitchActive: true });
  }

  try {
    const { character, bookTitle, genre, tone } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.status(503).json({
        error: "GEMINI_API_KEY er ikke konfigurert. Karakteranalyse krever en aktiv AI-forbindelse.",
      });
    }

    const prompt = `Du er en prisvinnende forfattercoach og dramaturg for en ${genre || "skjønnlitterær"}-roman med ${tone || "filmisk"} tone.
Generer en dyp, psykologisk innsiktsfull og narrativ oppsummering av karakterens utviklingsreise og karakterbue for:

Boktittel: ${bookTitle}
Karakternavn: ${character.name}
Rolle: ${character.role}
Arketype: ${character.archetype}
Mål: ${character.goal}
Bakgrunn: ${character.background}
Stemme/tone: ${character.voice}
Hemmeligheter: ${character.secrets}
Indre motivasjon: ${character.motivationInternal || "Uspesifisert"}
Ytre motivasjon: ${character.motivationExternal || "Uspesifisert"}
Indre konflikt: ${character.internalConflict || "Uspesifisert"}
Ytre konflikt: ${character.externalConflict || "Uspesifisert"}

Krav:
- Skriv på levende, presist litterært norsk (ca. 140–200 ord).
- Fremhev karakterens psykologiske sårbarhet og moralske vendepunkt. Ingen metatekst eller kulepunkter.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
    });

    const journeySummary = response.text?.trim() || "Karakterreisen kunne ikke genereres.";
    return res.json({ journeySummary });
  } catch (error: unknown) {
    console.error("Character journey error:", error);
    return res.status(500).json({ error: "Kunne ikke generere karakterreise" });
  }
});

// API: Deep Continuity Audit (ContinuityAgent Integration)
app.post("/api/book/deep-continuity-audit", async (req, res) => {
  const user = getAuthUser(req);
  const { projectId } = req.body;
  if (!projectId) return res.status(400).json({ error: "projectId er påkrevd." });
  const project = db.getProject(projectId);
  if (!project) return res.status(404).json({ error: "Bokprosjekt ikke funnet." });
  const access = BookAccessControl.validateAccess(user, project.ownerId || "", "read");
  if (!access.allowed) return res.status(403).json({ error: access.reason });
  try {
    EmergencyKillSwitch.assertCanGenerate();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "AI stanset via Kill Switch";
    return res.status(503).json({ error: msg, killSwitchActive: true });
  }

  try {
    const { chapters, characters, timeline, locations, continuityRules, bookTitle, genre, tone } = req.body;

    const bibleEngine = new BibleEngine({
      title: bookTitle,
      genre,
      tone,
      characters,
      locations,
      timeline,
      continuityRules,
    });

    const baseReport = ContinuityAgent.auditFullManuscript(
      chapters || [],
      bibleEngine.getData(),
      "rule_based"
    );

    const ai = getGeminiClient();
    if (!ai) {
      AuditLogger.log({
        actorId: user.id,
        actorRole: user.role,
        action: "CONTINUITY_AUDIT",
        status: "SUCCESS",
        metadata: { score: baseReport.score, anomalyCount: baseReport.anomalies.length },
      });
      return res.json(baseReport);
    }

    const prompt = `Gjennomfør en grundig forfatterfaglig KONTINUITETSKONTROLL (Continuity Audit) av denne romanen langs 4 akser:
1. PLOTT: Årsak og virkning, uløste ledetråder, motstridende handlinger.
2. KARAKTER: Kunnskap karakterer har for tidlig, brudd på etablerte motivasjoner/sårbarheter.
3. TIDSLINJE: Dag/natt-avvik, reisehastigheter, hendelsesrekkefølge.
4. VERDENSBYGGING: Brudd på magiske/fysiske regler, geografi.

Karakterer: ${JSON.stringify((characters || []).slice(0, 6))}
Kapitler: ${JSON.stringify((chapters || []).slice(0, 8))}
Kontinuitetsregler: ${JSON.stringify(continuityRules || [])}

SVAR KUN MED GYLDIG JSON:
{
  "score": 95,
  "verdict": "Vurdering",
  "anomalies": [
    {
      "id": "anom-1",
      "category": "Plott",
      "severity": "Kritisk",
      "chapterNumber": 3,
      "chapterTitle": "Tittel",
      "issue": "Beskrivelse",
      "impact": "Konsekvens for leseren",
      "suggestion": "Forslag til forbedring",
      "resolved": false
    }
  ],
  "strengths": ["Styrke 1", "Styrke 2"]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
    });

    let resultJson = baseReport;
    try {
      const cleaned = (response.text || "").replace(/```json/gi, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      if (parsed && typeof parsed.score === "number") {
        resultJson = {
          ...baseReport,
          ...parsed,
          analysisType: "ai_assisted",
        };
      }
    } catch {
      resultJson = baseReport;
    }

    AuditLogger.log({
      actorId: user.id,
      actorRole: user.role,
      action: "CONTINUITY_AUDIT",
      status: "SUCCESS",
      metadata: { score: resultJson.score },
    });

    return res.json({
      ...resultJson,
      analyzedAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error("Deep continuity audit error:", error);
    return res.status(500).json({ error: "Feil ved kontinuitetsanalyse" });
  }
});

// API: Version Service Endpoints
app.get("/api/book/versions/:projectId", (req, res) => {
  const user = getAuthUser(req);
  const project = db.getProject(req.params.projectId);
  if (!project) return res.status(404).json({ error: "Bokprosjekt ikke funnet." });
  const access = BookAccessControl.validateAccess(user, project.ownerId || "", "read");
  if (!access.allowed) return res.status(403).json({ error: access.reason });
  return res.json(VersionService.getVersions(req.params.projectId));
});

app.post("/api/book/versions/snapshot", (req, res) => {
  const user = getAuthUser(req);
  const { project, summary } = req.body;
  if (!project?.id) return res.status(400).json({ error: "Prosjekt-ID er påkrevd." });
  const storedProject = db.getProject(project.id);
  if (!storedProject) return res.status(404).json({ error: "Bokprosjekt ikke funnet." });
  const access = BookAccessControl.validateAccess(user, storedProject.ownerId || "", "write");
  if (!access.allowed) return res.status(403).json({ error: access.reason });
  const snapshot = VersionService.createSnapshot(storedProject, summary || "Manuell lagring", user.id);

  AuditLogger.log({
    actorId: user.id,
    actorRole: user.role,
    action: "CREATE_VERSION",
    projectId: project.id,
    status: "SUCCESS",
    metadata: { versionNumber: snapshot.versionNumber, summary },
  });

  return res.json(snapshot);
});

app.post("/api/book/versions/rollback", (req, res) => {
  const user = getAuthUser(req);
  const { projectId, versionNumber } = req.body;
  const project = db.getProject(projectId);
  if (!project) return res.status(404).json({ error: "Bokprosjekt ikke funnet." });
  const access = BookAccessControl.validateAccess(user, project.ownerId || "", "write");
  if (!access.allowed) return res.status(403).json({ error: access.reason });

  try {
    const restored = VersionService.rollback(projectId, versionNumber, user.id);
    db.saveProject(restored);

    AuditLogger.log({
      actorId: user.id,
      actorRole: user.role,
      action: "ROLLBACK_VERSION",
      projectId,
      status: "SUCCESS",
      metadata: { restoredVersion: versionNumber },
    });

    return res.json(restored);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Kunne ikke tilbakestille versjon";
    return res.status(404).json({ error: msg });
  }
});

app.post("/api/book/versions/revert-chapter", (req, res) => {
  const user = getAuthUser(req);
  const { projectId, currentProject, chapterNumber, targetVersionNumber } = req.body;

  const storedProject = db.getProject(projectId);
  if (!storedProject) return res.status(404).json({ error: "Bokprosjekt ikke funnet." });
  const access = BookAccessControl.validateAccess(user, storedProject.ownerId || "", "write");
  if (!access.allowed) return res.status(403).json({ error: access.reason });

  if (!projectId || !currentProject || !chapterNumber || !targetVersionNumber) {
    return res.status(400).json({ error: "Mangler påkrevde parametere for kapittelgjenoppretting." });
  }

  try {
    const result = VersionService.revertChapter(
      projectId,
      currentProject,
      Number(chapterNumber),
      Number(targetVersionNumber),
      user.id
    );

    db.saveProject(result.updatedProject);

    AuditLogger.log({
      actorId: user.id,
      actorRole: user.role,
      action: "REVERT_CHAPTER",
      projectId,
      status: "SUCCESS",
      metadata: {
        chapterNumber,
        targetVersionNumber,
        wordDelta: result.chapterDiff.wordDelta,
      },
    });

    return res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Kunne ikke gjenopprette kapittel";
    return res.status(400).json({ error: msg });
  }
});

app.get("/api/book/versions/:projectId/diff", (req, res) => {
  const user = getAuthUser(req);
  const { projectId } = req.params;
  const project = db.getProject(projectId);
  if (!project) return res.status(404).json({ error: "Bokprosjekt ikke funnet." });
  const access = BookAccessControl.validateAccess(user, project.ownerId || "", "read");
  if (!access.allowed) return res.status(403).json({ error: access.reason });
  const fromVersion = parseInt(req.query.from as string);
  const toVersion = parseInt(req.query.to as string);

  if (isNaN(fromVersion) || isNaN(toVersion)) {
    return res.status(400).json({ error: "Ugyldig fra- eller til-versjonsnummer." });
  }

  try {
    const diff = VersionService.compareVersions(projectId, fromVersion, toVersion);
    return res.json(diff);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Kunne ikke beregne versjonsdiff";
    return res.status(404).json({ error: msg });
  }
});

// ---------------------------------------------------------------------
// Server Initialization & Vite Integration
// ---------------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`BookForge AI Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
