import express, { Request, Response, NextFunction } from "express";
import path from "path";
import * as crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { AuthUser, BookAccessControl, AuditLogger, RateLimiter, EmergencyKillSwitch, SessionAuthService, PasswordService } from "./src/lib/security";
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
const PORT = Number(process.env.PORT || 3000);
const AI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 72;
const isProduction = process.env.NODE_ENV === "production";
const sessionCookieName = isProduction ? "__Host-bf_session" : "bf_session";

type AuthenticatedRequest = Request & { authUser?: AuthUser; sessionToken?: string };

function sanitizeUser(user: AuthUser): AuthUser {
  const { passwordHash: _passwordHash, ...safeUser } = user as AuthUser & { passwordHash?: string };
  return safeUser as AuthUser;
}

function parseSessionCookie(req: Request): string {
  const cookieHeader = req.headers.cookie || "";
  const pair = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${sessionCookieName}=`));
  if (!pair) return "";
  try { return decodeURIComponent(pair.slice(sessionCookieName.length + 1)); } catch { return ""; }
}

function extractSessionToken(req: Request): string {
  const authorization = req.headers.authorization;
  return authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : parseSessionCookie(req);
}

function getAuthUser(req: Request): AuthUser {
  const authenticated = req as AuthenticatedRequest;
  if (authenticated.authUser) return authenticated.authUser;
  const token = authenticated.sessionToken || extractSessionToken(req);
  if (!token || token.length < 32) throw new Error("Ugyldig autentiseringstoken.");
  const session = db.getSession(token);
  if (!session) throw new Error("Sesjonen er ugyldig eller utløpt.");
  const user = db.getUser(session.userId);
  if (!user) {
    db.deleteSession(token);
    throw new Error("Brukeren til sesjonen finnes ikke.");
  }
  authenticated.sessionToken = token;
  authenticated.authUser = sanitizeUser(user);
  return authenticated.authUser;
}

function projectAccess(user: AuthUser, project: BookProject, action: "read" | "write" | "admin") {
  return BookAccessControl.validateAccess(user, project.ownerId || "", action);
}

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cache-Control", "no-store");
  if (isProduction) res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  next();
});
app.use(express.json({ limit: "15mb" }));

if (process.env.FOUNDER_PASSWORD) {
  const founder = db.getUsers().find((user) => user.role === "FOUNDER");
  if (founder && !founder.passwordHash) db.saveUser({ ...founder, passwordHash: PasswordService.hash(process.env.FOUNDER_PASSWORD) });
}

AuditLogger.setPersistenceAdapter({ saveAuditLog: (entry) => db.saveAuditLog(entry), getAuditLogs: (limit, filter) => db.getAuditLogs(limit, filter) });
EmergencyKillSwitch.setPersistenceAdapter({ getKillSwitchState: () => db.getKillSwitchState(), setKillSwitchState: (state, actor) => db.setKillSwitchState(state, actor) });
CostGuard.setPersistenceAdapter({ saveCostRecord: (record) => db.saveCostRecord(record), getCostRecords: () => db.getCostRecords() });
VersionService.setPersistenceAdapter({ saveSnapshot: (snapshot) => db.saveSnapshot(snapshot), getSnapshots: (projectId) => db.getSnapshots(projectId) });

let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!aiClient) aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return aiClient;
}

const loginAttempts = new Map<string, { count: number; resetAt: number }>();
function loginRateLimited(key: string): boolean {
  const now = Date.now();
  const current = loginAttempts.get(key);
  if (!current || current.resetAt <= now) {
    loginAttempts.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return false;
  }
  current.count += 1;
  return current.count > 10;
}

function clientKey(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  return (typeof forwarded === "string" ? forwarded.split(",")[0].trim() : req.ip) || "unknown";
}

// Protected API routes are deny-by-default. Client identity headers are deliberately ignored.
app.use("/api", (req: AuthenticatedRequest, res, next) => {
  const publicRoutes = new Set(["GET /health", "POST /auth/login", "POST /auth/logout"]);
  if (publicRoutes.has(`${req.method} ${req.path}`)) return next();

  const token = extractSessionToken(req);
  if (!token || token.length < 32) return res.status(401).json({ error: "Autentisering kreves." });
  const session = db.getSession(token);
  if (!session) return res.status(401).json({ error: "Sesjonen er ugyldig eller utløpt." });
  const user = db.getUser(session.userId);
  if (!user) {
    db.deleteSession(token);
    return res.status(401).json({ error: "Brukeren til sesjonen finnes ikke." });
  }
  req.sessionToken = token;
  req.authUser = sanitizeUser(user);
  return next();
});

app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "bookforge-api", time: new Date().toISOString() }));

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body ?? {};
  if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) return res.status(400).json({ error: "E-postadresse og passord er påkrevd." });
  if (loginRateLimited(clientKey(req))) return res.status(429).json({ error: "For mange innloggingsforsøk. Prøv igjen senere." });
  const user = db.getUsers().find((candidate) => candidate.email.toLowerCase() === email.trim().toLowerCase());
  const validPassword = Boolean(user?.passwordHash) && PasswordService.verify(password, user!.passwordHash!);
  if (!user || !validPassword) {
    AuditLogger.log({ actorId: "anonymous", actorRole: "READER", action: "USER_LOGIN", status: "BLOCKED", metadata: { reason: "INVALID_CREDENTIALS" } });
    return res.status(401).json({ error: "Ugyldig innlogging." });
  }
  const { token, expiresAt } = SessionAuthService.generateSessionToken(user.id);
  db.createSession(user.id, token, expiresAt);
  res.setHeader("Set-Cookie", `${sessionCookieName}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict${isProduction ? "; Secure" : ""}; Max-Age=${SESSION_MAX_AGE_SECONDS}`);
  AuditLogger.log({ actorId: user.id, actorRole: user.role, action: "USER_LOGIN", status: "SUCCESS" });
  return res.json({ expiresAt, user: sanitizeUser(user) });
});

app.post("/api/auth/logout", (req, res) => {
  const token = extractSessionToken(req);
  if (token) {
    const session = db.getSession(token);
    if (session) {
      const user = db.getUser(session.userId);
      AuditLogger.log({ actorId: session.userId, actorRole: user?.role || "READER", action: "USER_LOGOUT", status: "SUCCESS" });
      db.deleteSession(token);
    }
  }
  res.setHeader("Set-Cookie", `${sessionCookieName}=; Path=/; HttpOnly; SameSite=Strict${isProduction ? "; Secure" : ""}; Max-Age=0`);
  res.setHeader("Clear-Site-Data", '"cache", "cookies", "storage"');
  return res.json({ success: true });
});

app.get("/api/auth/me", (req, res) => res.json({ user: getAuthUser(req) }));

app.get("/api/organizations", (req, res) => {
  const user = getAuthUser(req);
  if (user.role === "FOUNDER" || user.role === "ADMIN") return res.json(db.getOrganizations());
  if (!user.organizationId) return res.json([]);
  const org = db.getOrganization(user.organizationId);
  return res.json(org ? [org] : []);
});

app.get("/api/organizations/:id", (req, res) => {
  const user = getAuthUser(req);
  const org = db.getOrganization(req.params.id);
  if (!org) return res.status(404).json({ error: "Organisasjon ikke funnet." });
  if (user.role !== "FOUNDER" && user.role !== "ADMIN" && user.organizationId !== org.id && user.organizationId !== org.slug) return res.status(403).json({ error: "Adgang nektet." });
  return res.json(org);
});

app.get("/api/founder/kill-switch-status", (req, res) => {
  const check = BookAccessControl.requireFounder(getAuthUser(req));
  if (!check.allowed) return res.status(403).json({ error: check.reason });
  return res.json(EmergencyKillSwitch.getState());
});

app.get("/api/founder/stats", (req, res) => {
  const user = getAuthUser(req);
  const check = BookAccessControl.requireFounder(user);
  if (!check.allowed) return res.status(403).json({ error: check.reason });
  const projects = db.getProjects();
  const users = db.getUsers();
  const totalWordsGenerated = projects.reduce((total, project) => total + (project.chapters || []).reduce((sum, chapter) => sum + (chapter.currentWords || (chapter.content?.trim().split(/\s+/).length || 0)), 0), 0);
  const totalRevenueUsd = users.reduce((sum, candidate) => sum + (candidate.subscriptionPlan === "STUDIO" ? 29 : candidate.subscriptionPlan === "PRO" ? 19 : 0), 0);
  return res.json({ totalUsers: users.length, activeProjects: projects.length, totalWordsGenerated, totalAiCostUsd: CostGuard.getTotalPlatformSpend(), totalRevenueUsd, activeJobsCount: RateLimiter.getTotalActiveJobs(), tokenUsage: CostGuard.getTotalTokens(), killSwitch: EmergencyKillSwitch.getState(), auditLogs: AuditLogger.getRecentLogs(50) });
});

app.post("/api/founder/kill-switch", (req, res) => {
  const user = getAuthUser(req);
  try { return res.json(EmergencyKillSwitch.setKillSwitch(Boolean(req.body?.active), user, typeof req.body?.reason === "string" ? req.body.reason.slice(0, 500) : undefined)); }
  catch (error: unknown) { return res.status(403).json({ error: error instanceof Error ? error.message : "Kunne ikke endre Kill Switch." }); }
});

app.get("/api/founder/audit-logs", (req, res) => {
  const user = getAuthUser(req);
  const check = BookAccessControl.requireFounder(user);
  if (!check.allowed) return res.status(403).json({ error: check.reason });
  const parsed = Number.parseInt(String(req.query.limit ?? "50"), 10);
  const limit = Math.min(Math.max(Number.isFinite(parsed) ? parsed : 50, 1), 200);
  return res.json(AuditLogger.getRecentLogs(limit));
});

app.get("/api/books", (req, res) => {
  const user = getAuthUser(req);
  const books = db.getProjects();
  return res.json(user.role === "FOUNDER" || user.role === "ADMIN" ? books : books.filter((book) => !book.ownerId || book.ownerId === user.id));
});

app.get("/api/books/:id", (req, res) => {
  const user = getAuthUser(req);
  const project = db.getProject(req.params.id);
  if (!project) return res.status(404).json({ error: "Bokprosjekt ikke funnet." });
  const check = projectAccess(user, project, "read");
  if (!check.allowed) return res.status(403).json({ error: check.reason });
  return res.json(project);
});

app.post("/api/books", (req, res) => {
  const user = getAuthUser(req);
  const data = req.body ?? {};
  if (typeof data.title !== "string" || !data.title.trim() || data.title.length > 300) return res.status(400).json({ error: "Boktittel er påkrevd og må være kortere enn 300 tegn." });
  const now = new Date().toISOString();
  const book: BookProject = { id: `book-${crypto.randomUUID()}`, ownerId: user.id, title: data.title.trim(), author: typeof data.author === "string" ? data.author.slice(0, 200) : user.name, genre: typeof data.genre === "string" ? data.genre.slice(0, 100) : undefined, description: typeof data.description === "string" ? data.description.slice(0, 5000) : undefined, chapters: Array.isArray(data.chapters) ? data.chapters : [], settings: data.settings && typeof data.settings === "object" ? data.settings : undefined, createdAt: now, updatedAt: now };
  db.saveProject(book);
  AuditLogger.log({ actorId: user.id, actorRole: user.role, action: "CREATE_PROJECT", projectId: book.id, status: "SUCCESS" });
  return res.json(book);
});

app.put("/api/books/:id", (req, res) => {
  const user = getAuthUser(req);
  const existing = db.getProject(req.params.id);
  if (!existing) return res.status(404).json({ error: "Bokprosjekt ikke funnet." });
  const check = projectAccess(user, existing, "write");
  if (!check.allowed) return res.status(403).json({ error: check.reason });
  const data = req.body ?? {};
  const updated: BookProject = { ...existing, title: typeof data.title === "string" && data.title.trim() ? data.title.trim().slice(0, 300) : existing.title, author: typeof data.author === "string" ? data.author.slice(0, 200) : existing.author, genre: typeof data.genre === "string" ? data.genre.slice(0, 100) : existing.genre, description: typeof data.description === "string" ? data.description.slice(0, 5000) : existing.description, chapters: Array.isArray(data.chapters) ? data.chapters : existing.chapters, settings: data.settings && typeof data.settings === "object" ? data.settings : existing.settings, id: existing.id, ownerId: existing.ownerId, createdAt: existing.createdAt, updatedAt: new Date().toISOString() };
  db.saveProject(updated);
  AuditLogger.log({ actorId: user.id, actorRole: user.role, action: "UPDATE_PROJECT", projectId: updated.id, status: "SUCCESS" });
  return res.json(updated);
});

app.delete("/api/books/:id", (req, res) => {
  const user = getAuthUser(req);
  const existing = db.getProject(req.params.id);
  if (!existing) return res.status(404).json({ error: "Bokprosjekt ikke funnet." });
  const check = projectAccess(user, existing, "admin");
  if (!check.allowed) return res.status(403).json({ error: check.reason });
  db.deleteProject(req.params.id);
  AuditLogger.log({ actorId: user.id, actorRole: user.role, action: "DELETE_PROJECT", projectId: req.params.id, status: "SUCCESS" });
  return res.json({ success: true, deletedId: req.params.id });
});

app.get("/api/books/:id/bible", (req, res) => {
  const user = getAuthUser(req);
  const project = db.getProject(req.params.id);
  if (!project) return res.status(404).json({ error: "Bokprosjekt ikke funnet." });
  const check = projectAccess(user, project, "read");
  if (!check.allowed) return res.status(403).json({ error: check.reason });
  return res.json(db.getBible(req.params.id) || new BibleEngine(project).getData());
});

app.put("/api/books/:id/bible", (req, res) => {
  const user = getAuthUser(req);
  const project = db.getProject(req.params.id);
  if (!project) return res.status(404).json({ error: "Bokprosjekt ikke funnet." });
  const check = projectAccess(user, project, "write");
  if (!check.allowed) return res.status(403).json({ error: check.reason });
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) return res.status(400).json({ error: "Ugyldige bibeldata." });
  db.saveBible(req.params.id, req.body);
  AuditLogger.log({ actorId: user.id, actorRole: user.role, action: "UPDATE_BIBLE", projectId: req.params.id, status: "SUCCESS" });
  return res.json({ success: true, bible: req.body });
});

app.post("/api/book/generate-full-book", async (req, res) => {
  const user = getAuthUser(req);
  const body = req.body ?? {};
  const idea = typeof body.idea === "string" ? body.idea.trim().slice(0, 20000) : "";
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 300) : "";
  if (!idea && !title) return res.status(400).json({ error: "En idé eller tittel er påkrevd for å starte bokgenerering." });
  let project = body.projectId ? db.getProject(String(body.projectId)) : undefined;
  if (!project) {
    const now = new Date().toISOString();
    project = { id: body.projectId ? String(body.projectId).slice(0, 100) : `proj-${crypto.randomUUID()}`, ownerId: user.id, title: title || "Uten tittel", idea, genre: typeof body.genre === "string" ? body.genre.slice(0, 100) : "Roman", tone: typeof body.tone === "string" ? body.tone.slice(0, 100) : "Realistisk", lengthLabel: "Standard", targetWords: Number.isFinite(Number(body.targetWords)) ? Math.max(1000, Math.min(300000, Number(body.targetWords))) : 80000, currentWords: 0, targetChapters: Number.isFinite(Number(body.targetChapters)) ? Math.max(1, Math.min(200, Number(body.targetChapters))) : 32, synopsis: "", coverStyle: "Minimalistisk", phase: "planned", progress: 0, activeChapter: 1, acts: Number.isFinite(Number(body.acts)) ? Math.max(1, Math.min(8, Number(body.acts))) : 4, pov: typeof body.pov === "string" ? body.pov.slice(0, 100) : "Tredjeperson personlig", ending: "Lukket", author: typeof body.author === "string" ? body.author.slice(0, 200) : user.name, chapters: [], characters: [], locations: [], timeline: [], continuityRules: [], covers: [], createdAt: now, updatedAt: now } as BookProject;
    db.saveProject(project);
  } else {
    const check = projectAccess(user, project, "write");
    if (!check.allowed) return res.status(403).json({ error: check.reason });
  }
  const ai = getGeminiClient();
  if (!ai) return res.status(503).json({ error: "AI-tjenesten krever konfigurert GEMINI_API_KEY. Falsk simulering er deaktivert." });
  try {
    const job = await FullBookEngine.startGeneration({ projectId: project.id, idea: idea || project.idea || project.title, title: title || project.title, author: typeof body.author === "string" ? body.author.slice(0, 200) : project.author || user.name, genre: typeof body.genre === "string" ? body.genre.slice(0, 100) : project.genre, subgenre: typeof body.subgenre === "string" ? body.subgenre.slice(0, 100) : undefined, tone: typeof body.tone === "string" ? body.tone.slice(0, 100) : project.tone, audience: typeof body.audience === "string" ? body.audience.slice(0, 200) : undefined, language: typeof body.language === "string" ? body.language.slice(0, 100) : "Norsk (Bokmål)", pov: typeof body.pov === "string" ? body.pov.slice(0, 100) : project.pov, targetWords: Number(body.targetWords) || project.targetWords || 80000, targetChapters: Number(body.targetChapters) || project.targetChapters || 32, acts: Number(body.acts) || project.acts || 4, user }, ai);
    return res.json({ jobId: job.id, projectId: job.projectId, status: job.status, phase: job.phase, totalChapters: job.totalChapters, targetWords: job.totalWords });
  } catch (error: unknown) { return res.status(500).json({ error: error instanceof Error ? error.message : "Kunne ikke starte bokgenerering." }); }
});

app.get("/api/book/generation/:jobId", (req, res) => {
  const user = getAuthUser(req);
  const job = FullBookEngine.getJob(req.params.jobId);
  if (!job) return res.status(404).json({ error: "Genereringsjobb ikke funnet." });
  const project = db.getProject(job.projectId);
  if (!project) return res.status(404).json({ error: "Tilknyttet prosjekt ikke funnet." });
  const check = projectAccess(user, project, "read");
  if (!check.allowed) return res.status(403).json({ error: check.reason });
  return res.json(job);
});

app.post("/api/book/generation/:jobId/cancel", (req, res) => {
  const user = getAuthUser(req);
  const job = FullBookEngine.getJob(req.params.jobId);
  if (!job) return res.status(404).json({ error: "Genereringsjobb ikke funnet." });
  const project = db.getProject(job.projectId);
  if (!project) return res.status(404).json({ error: "Tilknyttet prosjekt ikke funnet." });
  const check = projectAccess(user, project, "write");
  if (!check.allowed) return res.status(403).json({ error: check.reason });
  return res.json({ success: FullBookEngine.cancelJob(req.params.jobId), jobId: req.params.jobId });
});

app.post("/api/book/generation/:jobId/resume", async (req, res) => {
  const user = getAuthUser(req);
  const job = FullBookEngine.getJob(req.params.jobId);
  if (!job) return res.status(404).json({ error: "Genereringsjobb ikke funnet." });
  const project = db.getProject(job.projectId);
  if (!project) return res.status(404).json({ error: "Tilknyttet prosjekt ikke funnet." });
  const check = projectAccess(user, project, "write");
  if (!check.allowed) return res.status(403).json({ error: check.reason });
  const ai = getGeminiClient();
  if (!ai) return res.status(503).json({ error: "AI-tjenesten krever konfigurert GEMINI_API_KEY for å gjenoppta genereringsjobben." });
  try { return res.json(await FullBookEngine.resumeJob(req.params.jobId, ai, user)); }
  catch (error: unknown) { return res.status(500).json({ error: error instanceof Error ? error.message : "Kunne ikke gjenoppta genereringsjobb." }); }
});

app.get("/api/book/generation/project/:projectId", (req, res) => {
  const user = getAuthUser(req);
  const project = db.getProject(req.params.projectId);
  if (!project) return res.status(404).json({ error: "Bokprosjekt ikke funnet." });
  const check = projectAccess(user, project, "read");
  if (!check.allowed) return res.status(403).json({ error: check.reason });
  const job = db.getGenerationJobForProject(req.params.projectId);
  if (!job) return res.status(404).json({ error: "Ingen genereringsjobb funnet for dette prosjektet." });
  return res.json(job);
});

app.post("/api/assets/generate", async (req, res) => {
  const user = getAuthUser(req);
  const body = req.body ?? {};
  if (!body.projectId || !body.type || !body.title) return res.status(400).json({ error: "Mangler påkrevde parametere (projectId, type, title)." });
  const project = db.getProject(String(body.projectId));
  if (!project) return res.status(404).json({ error: "Bokprosjekt ikke funnet." });
  const check = projectAccess(user, project, "write");
  if (!check.allowed) return res.status(403).json({ error: check.reason });
  try {
    const asset = await AssetEngine.getInstance().generateAsset(project, { projectId: project.id, type: String(body.type).slice(0, 50), title: String(body.title).slice(0, 300), customPrompt: typeof body.customPrompt === "string" ? body.customPrompt.slice(0, 5000) : undefined, chapterNumber: Number.isFinite(Number(body.chapterNumber)) ? Number(body.chapterNumber) : undefined, characterName: typeof body.characterName === "string" ? body.characterName.slice(0, 200) : undefined, aspectRatio: typeof body.aspectRatio === "string" ? body.aspectRatio.slice(0, 30) : undefined }, getGeminiClient(), user);
    AuditLogger.log({ actorId: user.id, actorRole: user.role, action: "GENERATE_ASSET", projectId: project.id, status: "SUCCESS", metadata: { assetId: asset.id } });
    return res.json(asset);
  } catch (error: unknown) { return res.status(500).json({ error: error instanceof Error ? error.message : "Kunne ikke generere visuelt element." }); }
});

app.get("/api/assets/project/:projectId", (req, res) => {
  const user = getAuthUser(req);
  const project = db.getProject(req.params.projectId);
  if (!project) return res.status(404).json({ error: "Bokprosjekt ikke funnet." });
  const check = projectAccess(user, project, "read");
  if (!check.allowed) return res.status(403).json({ error: check.reason });
  return res.json(db.getAssetsForProject(req.params.projectId));
});

app.get("/api/assets/:id", (req, res) => {
  const user = getAuthUser(req);
  const asset = db.getAsset(req.params.id);
  if (!asset) return res.status(404).json({ error: "Visuelt element ikke funnet." });
  const project = db.getProject(asset.projectId);
  if (!project) return res.status(404).json({ error: "Tilknyttet prosjekt ikke funnet." });
  const check = projectAccess(user, project, "read");
  if (!check.allowed) return res.status(403).json({ error: check.reason });
  return res.json(asset);
});

app.post("/api/book/generate-synopsis", async (req, res) => {
  const user = getAuthUser(req);
  const body = req.body ?? {};
  if (!body.projectId) return res.status(400).json({ error: "projectId er påkrevd." });
  const project = db.getProject(String(body.projectId));
  if (!project) return res.status(404).json({ error: "Bokprosjekt ikke funnet." });
  const check = projectAccess(user, project, "write");
  if (!check.allowed) return res.status(403).json({ error: check.reason });
  try { EmergencyKillSwitch.assertCanGenerate(); } catch (error: unknown) { return res.status(503).json({ error: error instanceof Error ? error.message : "AI er stanset.", killSwitchActive: true }); }
  const jobId = `job-synopsis-${crypto.randomUUID()}`;
  const slot = RateLimiter.acquireJobSlot(user, jobId, "GENERATE_SYNOPSIS");
  if (!slot.success) return res.status(429).json({ error: slot.error });
  try {
    CostGuard.checkBudget(user, project.id);
    const ai = getGeminiClient();
    if (!ai) return res.status(503).json({ error: "AI-tjenesten krever konfigurert GEMINI_API_KEY. Falsk simulering er deaktivert." });
    const prompt = `Du er en prisvinnende forfatter og sjefsredaktør. Lag en fengslende, sammenhengende synopsis på norsk for en bok med følgende spesifikasjon:\nTittel: ${String(body.title || project.title).slice(0, 300)}\nIdé: ${String(body.idea || project.idea || project.title).slice(0, 12000)}\nSjanger: ${String(body.genre || project.genre || "Roman").slice(0, 100)}\nTone: ${String(body.tone || project.tone || "Realistisk").slice(0, 100)}\nFormat: ${String(body.length || "Standard").slice(0, 100)}\n\nSvar i formatet:\nSYNOPSIS: [80-120 ord]\nAKTER: 4\nPOV: 1\nSLUTT: Lukket`;
    const response = await ai.models.generateContent({ model: AI_MODEL, contents: prompt });
    const text = response.text || "";
    const match = text.match(/SYNOPSIS:\s*([\s\S]*?)(?=AKTER:|$)/i);
    const synopsis = match ? match[1].trim() : text.trim();
    CostGuard.recordUsage({ userId: user.id, projectId: project.id, action: "GENERATE_SYNOPSIS", inputTokens: Math.round(prompt.length / 4), outputTokens: Math.round(text.length / 4) });
    AuditLogger.log({ actorId: user.id, actorRole: user.role, action: "GENERATE_SYNOPSIS", projectId: project.id, status: "SUCCESS" });
    return res.json({ synopsis, acts: 4, pov: "1 (Tredjeperson begrenset)", ending: "Lukket" });
  } catch (error: unknown) { return res.status(500).json({ error: error instanceof Error ? error.message : "Kunne ikke generere synopsis." }); }
  finally { RateLimiter.releaseJobSlot(user.id, jobId); }
});

app.post("/api/book/write-chapter", async (req, res) => {
  const user = getAuthUser(req);
  const body = req.body ?? {};
  if (!body.projectId) return res.status(400).json({ error: "projectId er påkrevd." });
  const project = db.getProject(String(body.projectId));
  if (!project) return res.status(404).json({ error: "Bokprosjekt ikke funnet." });
  const check = projectAccess(user, project, "write");
  if (!check.allowed) return res.status(403).json({ error: check.reason });
  try { EmergencyKillSwitch.assertCanGenerate(); } catch (error: unknown) { return res.status(503).json({ error: error instanceof Error ? error.message : "AI er stanset.", killSwitchActive: true }); }
  const chapterNumber = Number(body.chapterNumber);
  if (!Number.isInteger(chapterNumber) || chapterNumber < 1 || chapterNumber > 500) return res.status(400).json({ error: "Ugyldig kapittelnummer." });
  const jobId = `job-chapter-${chapterNumber}-${crypto.randomUUID()}`;
  const slot = RateLimiter.acquireJobSlot(user, jobId, "WRITE_CHAPTER");
  if (!slot.success) return res.status(429).json({ error: slot.error });
  try {
    CostGuard.checkBudget(user, project.id);
    const ai = getGeminiClient();
    if (!ai) return res.status(503).json({ error: "AI-tjenesten krever konfigurert GEMINI_API_KEY. Falsk simulering er deaktivert." });
    const bible = new BibleEngine(body.bibleData && typeof body.bibleData === "object" ? body.bibleData : { title: body.bookTitle || project.title, genre: body.genre || project.genre, tone: body.tone || project.tone });
    const bibleContext = bible.buildContextForChapter(chapterNumber, body.characters);
    const prompt = `Du er en skjønnlitterær forfatter på toppnivå. Skriv et komplett kapittel ${chapterNumber} i romanen "${String(body.bookTitle || project.title).slice(0, 300)}".\nSjanger: ${String(body.genre || project.genre || "Roman").slice(0, 100)}\nTone: ${String(body.tone || project.tone || "Realistisk").slice(0, 100)}\nKapitteltittel: ${String(body.chapterTitle || `Kapittel ${chapterNumber}`).slice(0, 300)}\nHandling/Mål: ${String(body.chapterSummary || "").slice(0, 10000)}\nForrige kapittel: ${String(body.previousSummary || "Romanens åpning").slice(0, 10000)}\nRelevante karakterer: ${String(body.characters || "Hovedpersonen").slice(0, 10000)}\n\n${bibleContext}\n\nSkriv levende, sanselig norsk med naturlig dialog, atmosfære, spenning og kontinuitet. Start direkte med kapittelets åpningssetning.`;
    const response = await ai.models.generateContent({ model: AI_MODEL, contents: prompt });
    const content = response.text || "";
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    CostGuard.recordUsage({ userId: user.id, projectId: project.id, action: "WRITE_CHAPTER", inputTokens: Math.round(prompt.length / 4), outputTokens: Math.round(content.length / 4) });
    AuditLogger.log({ actorId: user.id, actorRole: user.role, action: "WRITE_CHAPTER", projectId: project.id, status: "SUCCESS", metadata: { chapterNumber, wordCount: words } });
    return res.json({ content, wordCount: words });
  } catch (error: unknown) { return res.status(500).json({ error: error instanceof Error ? error.message : "Kunne ikke skrive kapittel." }); }
  finally { RateLimiter.releaseJobSlot(user.id, jobId); }
});

app.post("/api/book/generate-character-journey", async (req, res) => {
  const user = getAuthUser(req);
  try { EmergencyKillSwitch.assertCanGenerate(); } catch (error: unknown) { return res.status(503).json({ error: error instanceof Error ? error.message : "AI stanset.", killSwitchActive: true }); }
  const body = req.body ?? {};
  if (!body.projectId || !body.character || typeof body.character !== "object") return res.status(400).json({ error: "projectId og karakter er påkrevd." });
  const project = db.getProject(String(body.projectId));
  if (!project) return res.status(404).json({ error: "Bokprosjekt ikke funnet." });
  const check = projectAccess(user, project, "read");
  if (!check.allowed) return res.status(403).json({ error: check.reason });
  const ai = getGeminiClient();
  if (!ai) return res.status(503).json({ error: "GEMINI_API_KEY er ikke konfigurert." });
  try {
    const c = body.character;
    const prompt = `Du er en prisvinnende forfattercoach og dramaturg. Generer en dyp, psykologisk innsiktsfull narrativ oppsummering av karakterens utviklingsreise på levende, presist litterært norsk, ca. 140-200 ord.\nBoktittel: ${String(body.bookTitle || project.title).slice(0, 300)}\nKarakternavn: ${String(c.name || "Ukjent").slice(0, 200)}\nRolle: ${String(c.role || "").slice(0, 500)}\nArketype: ${String(c.archetype || "").slice(0, 500)}\nMål: ${String(c.goal || "").slice(0, 1000)}\nBakgrunn: ${String(c.background || "").slice(0, 2000)}\nStemme: ${String(c.voice || "").slice(0, 1000)}\nHemmeligheter: ${String(c.secrets || "").slice(0, 2000)}\nIndre motivasjon: ${String(c.motivationInternal || "Uspesifisert").slice(0, 1000)}\nYtre motivasjon: ${String(c.motivationExternal || "Uspesifisert").slice(0, 1000)}\nIndre konflikt: ${String(c.internalConflict || "Uspesifisert").slice(0, 1000)}\nYtre konflikt: ${String(c.externalConflict || "Uspesifisert").slice(0, 1000)}`;
    const response = await ai.models.generateContent({ model: AI_MODEL, contents: prompt });
    return res.json({ journeySummary: response.text?.trim() || "Karakterreisen kunne ikke genereres." });
  } catch (error: unknown) { return res.status(500).json({ error: error instanceof Error ? error.message : "Kunne ikke generere karakterreise." }); }
});

app.post("/api/book/deep-continuity-audit", async (req, res) => {
  const user = getAuthUser(req);
  const body = req.body ?? {};
  if (!body.projectId) return res.status(400).json({ error: "projectId er påkrevd." });
  const project = db.getProject(String(body.projectId));
  if (!project) return res.status(404).json({ error: "Bokprosjekt ikke funnet." });
  const check = projectAccess(user, project, "read");
  if (!check.allowed) return res.status(403).json({ error: check.reason });
  try { EmergencyKillSwitch.assertCanGenerate(); } catch (error: unknown) { return res.status(503).json({ error: error instanceof Error ? error.message : "AI stanset via Kill Switch", killSwitchActive: true }); }
  try {
    const bible = new BibleEngine({ title: body.bookTitle || project.title, genre: body.genre || project.genre, tone: body.tone || project.tone, characters: body.characters, locations: body.locations, timeline: body.timeline, continuityRules: body.continuityRules });
    const baseReport = ContinuityAgent.auditFullManuscript(body.chapters || [], bible.getData(), "rule_based");
    const ai = getGeminiClient();
    if (!ai) return res.json(baseReport);
    const prompt = `Gjennomfør en grundig kontinuitetskontroll av romanen langs plot, karakter, tidslinje og verdensbygging. Returner kun gyldig JSON med score, verdict, anomalies og strengths.\nKarakterer: ${JSON.stringify((body.characters || []).slice(0, 6))}\nKapitler: ${JSON.stringify((body.chapters || []).slice(0, 8))}\nRegler: ${JSON.stringify(body.continuityRules || [])}`;
    const response = await ai.models.generateContent({ model: AI_MODEL, contents: prompt });
    let result = baseReport;
    try { const parsed = JSON.parse((response.text || "").replace(/```json/gi, "").replace(/```/g, "").trim()); if (parsed && typeof parsed.score === "number") result = { ...baseReport, ...parsed, analysisType: "ai_assisted" }; } catch { /* deterministic report remains authoritative */ }
    AuditLogger.log({ actorId: user.id, actorRole: user.role, action: "CONTINUITY_AUDIT", projectId: project.id, status: "SUCCESS", metadata: { score: result.score } });
    return res.json({ ...result, analyzedAt: new Date().toISOString() });
  } catch (error: unknown) { return res.status(500).json({ error: error instanceof Error ? error.message : "Feil ved kontinuitetsanalyse." }); }
});

app.get("/api/book/versions/:projectId", (req, res) => {
  const user = getAuthUser(req);
  const project = db.getProject(req.params.projectId);
  if (!project) return res.status(404).json({ error: "Bokprosjekt ikke funnet." });
  const check = projectAccess(user, project, "read");
  if (!check.allowed) return res.status(403).json({ error: check.reason });
  return res.json(VersionService.getVersions(req.params.projectId));
});

app.post("/api/book/versions/snapshot", (req, res) => {
  const user = getAuthUser(req);
  const projectId = req.body?.project?.id;
  if (!projectId) return res.status(400).json({ error: "Prosjekt-ID er påkrevd." });
  const project = db.getProject(String(projectId));
  if (!project) return res.status(404).json({ error: "Bokprosjekt ikke funnet." });
  const check = projectAccess(user, project, "write");
  if (!check.allowed) return res.status(403).json({ error: check.reason });
  try { return res.json(VersionService.createSnapshot(project, typeof req.body.summary === "string" ? req.body.summary.slice(0, 500) : "Manuell lagring", user.id)); }
  catch (error: unknown) { return res.status(400).json({ error: error instanceof Error ? error.message : "Kunne ikke lagre versjon." }); }
});

app.post("/api/book/versions/rollback", (req, res) => {
  const user = getAuthUser(req);
  const projectId = String(req.body?.projectId || "");
  const project = db.getProject(projectId);
  if (!project) return res.status(404).json({ error: "Bokprosjekt ikke funnet." });
  const check = projectAccess(user, project, "write");
  if (!check.allowed) return res.status(403).json({ error: check.reason });
  try { const restored = VersionService.rollback(projectId, Number(req.body.versionNumber), user.id); db.saveProject(restored); return res.json(restored); }
  catch (error: unknown) { return res.status(404).json({ error: error instanceof Error ? error.message : "Kunne ikke tilbakestille versjon." }); }
});

app.post("/api/book/versions/revert-chapter", (req, res) => {
  const user = getAuthUser(req);
  const body = req.body ?? {};
  const projectId = String(body.projectId || "");
  const project = db.getProject(projectId);
  if (!project) return res.status(404).json({ error: "Bokprosjekt ikke funnet." });
  const check = projectAccess(user, project, "write");
  if (!check.allowed) return res.status(403).json({ error: check.reason });
  if (!body.currentProject || !body.chapterNumber || !body.targetVersionNumber) return res.status(400).json({ error: "Mangler påkrevde parametere for kapittelgjenoppretting." });
  try { const result = VersionService.revertChapter(projectId, body.currentProject, Number(body.chapterNumber), Number(body.targetVersionNumber), user.id); db.saveProject(result.updatedProject); return res.json(result); }
  catch (error: unknown) { return res.status(400).json({ error: error instanceof Error ? error.message : "Kunne ikke gjenopprette kapittel." }); }
});

app.get("/api/book/versions/:projectId/diff", (req, res) => {
  const user = getAuthUser(req);
  const project = db.getProject(req.params.projectId);
  if (!project) return res.status(404).json({ error: "Bokprosjekt ikke funnet." });
  const check = projectAccess(user, project, "read");
  if (!check.allowed) return res.status(403).json({ error: check.reason });
  const fromVersion = Number.parseInt(String(req.query.from || ""), 10);
  const toVersion = Number.parseInt(String(req.query.to || ""), 10);
  if (!Number.isInteger(fromVersion) || !Number.isInteger(toVersion)) return res.status(400).json({ error: "Ugyldig fra- eller til-versjonsnummer." });
  try { return res.json(VersionService.compareVersions(req.params.projectId, fromVersion, toVersion)); }
  catch (error: unknown) { return res.status(404).json({ error: error instanceof Error ? error.message : "Kunne ikke beregne versjonsdiff." }); }
});

async function startServer(): Promise<void> {
  if (!isProduction) {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, { index: "index.html" }));
    app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
  }
  app.listen(PORT, "0.0.0.0", () => console.log(`BookForge AI server listening on ${PORT}`));
}

startServer().catch((error) => { console.error("[BookForge] Server startup failed:", error); process.exitCode = 1; });
