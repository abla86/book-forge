// =====================================================================
// BookForge AI - Unified Database & Persistence Layer
// Conforms to Enterprise Schema (schema.sql)
// Provides persistent storage for:
// - Users & RBAC
// - Books & Chapters
// - Book Bibles
// - Book Versions
// - Audit Logs
// - Cost Records
// - System Settings (Emergency Kill Switch)
// =====================================================================

import fs from "fs";
import path from "path";
import { Pool } from "pg";
import { AuthUser, AuditLogEntry, KillSwitchState } from "./security";
import { CostRecord } from "./engine/CostGuard";
import { BookProject, BookGenerationJob, GenerationChunk, CreativeAsset } from "../types";
import { VersionSnapshot } from "./engine/VersionHistory";

export interface SystemSetting<T = unknown> {
  key: string;
  value: T;
  updatedBy: string;
  updatedAt: string;
}

export interface OrganizationRecord {
  id: string;
  name: string;
  slug: string;
  tier: "FREE" | "PRO" | "STUDIO" | "ENTERPRISE";
  createdAt: string;
}

export interface SessionRecord {
  token: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
}

export interface BookBibleRecord {
  bookId: string;
  characters: unknown[];
  locations: unknown[];
  timeline: unknown[];
  continuityRules: unknown[];
  plotThreads: unknown[];
  foreshadowing: unknown[];
  updatedAt: string;
}

export interface PersistenceState {
  users: AuthUser[];
  organizations: OrganizationRecord[];
  sessions: Record<string, SessionRecord>;
  books: BookProject[];
  bookBibles: Record<string, BookBibleRecord>;
  bookVersions: Record<string, VersionSnapshot[]>;
  generationJobs: Record<string, BookGenerationJob>;
  generationChunks: Record<string, GenerationChunk[]>;
  creativeAssets: Record<string, CreativeAsset[]>;
  auditLogs: AuditLogEntry[];
  costRecords: CostRecord[];
  systemSettings: Record<string, SystemSetting>;
}

export class DatabaseAdapter {
  private static instance: DatabaseAdapter | null = null;
  private dbFilePath: string;
  private isConnectedToPostgres: boolean = false;
  private pgPool: Pool | null = null;
  private state: PersistenceState;

  private constructor() {
    // Determine storage location
    const storageDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(storageDir)) {
      try {
        fs.mkdirSync(storageDir, { recursive: true });
      } catch (err) {
        console.warn("Could not create /data directory:", err);
      }
    }
    this.dbFilePath = path.join(storageDir, "bookforge-db.json");

    // Load local state only for development bootstrap/compatibility.
    // Production requires a reachable PostgreSQL database.
    this.state = this.loadFromDisk();

    // Check if external Postgres DATABASE_URL is configured
    if (process.env.DATABASE_URL) {
      console.log("[BookForge DB] External DATABASE_URL detected. Initializing PostgreSQL pool adapter...");
      try {
        this.pgPool = new Pool({
          connectionString: process.env.DATABASE_URL,
          ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: true } : undefined,
          max: 10,
          idleTimeoutMillis: 30000,
        });

        // Test connection asynchronously
        this.pgPool.query("SELECT NOW()")
          .then(() => {
            this.isConnectedToPostgres = true;
            console.log("[BookForge DB] Successfully connected to PostgreSQL database.");
          })
          .catch((err) => {
            this.isConnectedToPostgres = false;
            if (process.env.NODE_ENV === "production") {
              throw new Error(`PostgreSQL-tilkobling feilet i production: ${err.message}`);
            }
            console.warn("[BookForge DB] PostgreSQL connection error in development:", err.message);
          });
      } catch (poolErr) {
        console.warn("[BookForge DB] Failed to construct PostgreSQL Pool:", poolErr);
        this.isConnectedToPostgres = false;
      }
    } else {
      if (process.env.NODE_ENV === "production") {
        throw new Error("DATABASE_URL er påkrevd i production. Disk-basert fallback er deaktivert.");
      }
      console.log(`[BookForge DB] Operating in Disk-Persisted Storage Mode (${this.dbFilePath}) for local development only.`);
    }
  }

  public static getInstance(): DatabaseAdapter {
    if (!DatabaseAdapter.instance) {
      DatabaseAdapter.instance = new DatabaseAdapter();
    }
    return DatabaseAdapter.instance;
  }

  private loadFromDisk(): PersistenceState {
    const defaultState: PersistenceState = {
      users: [
        {
          id: "user-anne-beth-1",
          name: "Anne Beth Andersen",
          email: "anne.beth@bookforge.ai",
          role: "FOUNDER",
          subscriptionPlan: "STUDIO",
        },
      ],
      organizations: [
        {
          id: "org-bookforge-main",
          name: "BookForge Creative Studio",
          slug: "bookforge-studio",
          tier: "STUDIO",
          createdAt: new Date().toISOString(),
        },
      ],
      sessions: {},
      books: [],
      bookBibles: {},
      bookVersions: {},
      generationJobs: {},
      generationChunks: {},
      creativeAssets: {},
      auditLogs: [],
      costRecords: [],
      systemSettings: {
        emergency_kill_switch: {
          key: "emergency_kill_switch",
          value: { active: false },
          updatedBy: "SYSTEM",
          updatedAt: new Date().toISOString(),
        },
        platform_limits: {
          key: "platform_limits",
          value: {
            maxConcurrentJobsPerUser: 2,
            maxBudgetUsdPerBook: 25.0,
            rateLimitPerHour: 120,
          },
          updatedBy: "SYSTEM",
          updatedAt: new Date().toISOString(),
        },
      },
    };

    if (fs.existsSync(this.dbFilePath)) {
      try {
        const raw = fs.readFileSync(this.dbFilePath, "utf8");
        const parsed = JSON.parse(raw);
        return {
          ...defaultState,
          ...parsed,
          organizations: parsed.organizations || defaultState.organizations,
          sessions: parsed.sessions || {},
          generationChunks: parsed.generationChunks || {},
          creativeAssets: parsed.creativeAssets || {},
          systemSettings: {
            ...defaultState.systemSettings,
            ...(parsed.systemSettings || {}),
          },
        };
      } catch (err) {
        console.error("[BookForge DB] Failed to parse existing db file, using clean defaults:", err);
        return defaultState;
      }
    }

    return defaultState;
  }

  private saveToDisk(): void {
    try {
      fs.writeFileSync(this.dbFilePath, JSON.stringify(this.state, null, 2), "utf8");
    } catch (err) {
      console.error("[BookForge DB] Failed to save state to disk:", err);
    }
  }

  public getStorageMode(): { mode: "POSTGRES" | "DISK_PERSISTED"; path: string; hasPostgresUrl: boolean } {
    return {
      mode: this.isConnectedToPostgres ? "POSTGRES" : "DISK_PERSISTED",
      path: this.dbFilePath,
      hasPostgresUrl: Boolean(process.env.DATABASE_URL),
    };
  }

  // -------------------------------------------------------------------
  // Users & Roles
  // -------------------------------------------------------------------
  public getUsers(): AuthUser[] {
    return [...this.state.users];
  }

  public getUser(id: string): AuthUser | undefined {
    return this.state.users.find((u) => u.id === id);
  }

  public saveUser(user: AuthUser): void {
    const idx = this.state.users.findIndex((u) => u.id === user.id);
    if (idx >= 0) {
      this.state.users[idx] = { ...user };
    } else {
      this.state.users.push({ ...user });
    }
    this.saveToDisk();
  }

  // -------------------------------------------------------------------
  // System Settings & Emergency Kill Switch
  // -------------------------------------------------------------------
  public getKillSwitchState(): KillSwitchState {
    const setting = this.state.systemSettings["emergency_kill_switch"];
    if (setting && setting.value && typeof setting.value === "object") {
      return setting.value as KillSwitchState;
    }
    return { active: false };
  }

  public setKillSwitchState(state: KillSwitchState, actorName: string): void {
    this.state.systemSettings["emergency_kill_switch"] = {
      key: "emergency_kill_switch",
      value: state,
      updatedBy: actorName,
      updatedAt: new Date().toISOString(),
    };
    this.saveToDisk();
  }

  // -------------------------------------------------------------------
  // Audit Logs
  // -------------------------------------------------------------------
  public saveAuditLog(entry: AuditLogEntry): void {
    this.state.auditLogs.unshift(entry);
    if (this.state.auditLogs.length > 1000) {
      this.state.auditLogs = this.state.auditLogs.slice(0, 1000);
    }
    this.saveToDisk();
  }

  public getAuditLogs(limit = 50, filterAction?: string): AuditLogEntry[] {
    if (filterAction && filterAction !== "all") {
      return this.state.auditLogs.filter((l) => l.action === filterAction).slice(0, limit);
    }
    return this.state.auditLogs.slice(0, limit);
  }

  // -------------------------------------------------------------------
  // Cost Records
  // -------------------------------------------------------------------
  public saveCostRecord(record: CostRecord): void {
    this.state.costRecords.push(record);
    this.saveToDisk();
  }

  public getCostRecords(): CostRecord[] {
    return [...this.state.costRecords];
  }

  public getCostRecordsForProject(projectId: string): CostRecord[] {
    return this.state.costRecords.filter((r) => r.projectId === projectId);
  }

  // -------------------------------------------------------------------
  // Books & Projects
  // -------------------------------------------------------------------
  public saveProject(book: BookProject): void {
    const index = this.state.books.findIndex((b) => b.id === book.id);
    if (index >= 0) {
      this.state.books[index] = { ...book, updatedAt: new Date().toISOString() };
    } else {
      this.state.books.push({ ...book, updatedAt: new Date().toISOString() });
    }
    this.saveToDisk();
  }

  public saveBook(book: BookProject): void {
    this.saveProject(book);
  }

  public getProject(id: string): BookProject | undefined {
    return this.state.books.find((b) => b.id === id);
  }

  public getBook(id: string): BookProject | undefined {
    return this.getProject(id);
  }

  public getProjects(): BookProject[] {
    return [...this.state.books];
  }

  public getAllBooks(): BookProject[] {
    return this.getProjects();
  }

  public deleteProject(id: string): boolean {
    const prevLen = this.state.books.length;
    this.state.books = this.state.books.filter((b) => b.id !== id);
    delete this.state.bookBibles[id];
    delete this.state.bookVersions[id];
    this.saveToDisk();
    return this.state.books.length < prevLen;
  }

  // -------------------------------------------------------------------
  // Book Bibles
  // -------------------------------------------------------------------
  public getBible(bookId: string): unknown | undefined {
    return this.state.bookBibles[bookId];
  }

  public saveBible(bookId: string, bibleData: unknown): void {
    this.state.bookBibles[bookId] = {
      ...(bibleData as Record<string, unknown>),
      bookId,
      updatedAt: new Date().toISOString(),
    } as BookBibleRecord;
    this.saveToDisk();
  }

  // -------------------------------------------------------------------
  // Book Versions & Snapshots
  // -------------------------------------------------------------------
  public saveSnapshot(snapshot: VersionSnapshot): void {
    const projectId = snapshot.projectId;
    if (!this.state.bookVersions[projectId]) {
      this.state.bookVersions[projectId] = [];
    }
    this.state.bookVersions[projectId].unshift(snapshot);
    this.saveToDisk();
  }

  public saveVersion(projectId: string, version: VersionSnapshot): void {
    this.saveSnapshot(version);
  }

  public getSnapshots(projectId: string): VersionSnapshot[] {
    return [...(this.state.bookVersions[projectId] || [])];
  }

  public getVersions(projectId: string): VersionSnapshot[] {
    return this.getSnapshots(projectId);
  }

  // -------------------------------------------------------------------
  // Book Generation Jobs
  // -------------------------------------------------------------------
  public saveGenerationJob(job: BookGenerationJob): void {
    if (!this.state.generationJobs) {
      this.state.generationJobs = {};
    }
    this.state.generationJobs[job.id] = { ...job };
    this.saveToDisk();
  }

  public getGenerationJob(jobId: string): BookGenerationJob | undefined {
    if (!this.state.generationJobs) return undefined;
    return this.state.generationJobs[jobId];
  }

  public getGenerationJobForProject(projectId: string): BookGenerationJob | undefined {
    if (!this.state.generationJobs) return undefined;
    const all = Object.values(this.state.generationJobs);
    // Return latest job for project
    return all
      .filter((j) => j.projectId === projectId)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0];
  }

  public getGenerationJobs(): BookGenerationJob[] {
    if (!this.state.generationJobs) return [];
    return Object.values(this.state.generationJobs);
  }

  // -------------------------------------------------------------------
  // Generation Chunks (Chunk-level Persistent Recovery)
  // -------------------------------------------------------------------
  public saveChunk(chunk: GenerationChunk): void {
    if (!this.state.generationChunks) {
      this.state.generationChunks = {};
    }
    const key = `${chunk.jobId}_ch${chunk.chapterNumber}`;
    if (!this.state.generationChunks[key]) {
      this.state.generationChunks[key] = [];
    }
    const existingIdx = this.state.generationChunks[key].findIndex((c) => c.chunkIndex === chunk.chunkIndex);
    if (existingIdx >= 0) {
      this.state.generationChunks[key][existingIdx] = { ...chunk };
    } else {
      this.state.generationChunks[key].push({ ...chunk });
    }
    this.saveToDisk();

    // Async sync to Postgres if connected
    if (this.isConnectedToPostgres && this.pgPool) {
      this.pgPool
        .query(
          `INSERT INTO generation_chunks (job_id, project_id, chapter_number, chunk_index, content, word_count, tokens_used, is_continuation)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (job_id, chapter_number, chunk_index)
           DO UPDATE SET content = EXCLUDED.content, word_count = EXCLUDED.word_count`,
          [
            chunk.jobId,
            chunk.projectId,
            chunk.chapterNumber,
            chunk.chunkIndex,
            chunk.content,
            chunk.wordCount,
            JSON.stringify(chunk.tokensUsed || {}),
            chunk.isContinuation,
          ]
        )
        .catch((err) => console.warn("[BookForge DB] Postgres chunk sync warning:", err.message));
    }
  }

  public getChunks(jobId: string, chapterNumber?: number): GenerationChunk[] {
    if (!this.state.generationChunks) return [];
    if (chapterNumber !== undefined) {
      const key = `${jobId}_ch${chapterNumber}`;
      return [...(this.state.generationChunks[key] || [])].sort((a, b) => a.chunkIndex - b.chunkIndex);
    }
    const result: GenerationChunk[] = [];
    for (const [key, chunks] of Object.entries(this.state.generationChunks)) {
      if (key.startsWith(`${jobId}_`)) {
        result.push(...chunks);
      }
    }
    return result.sort((a, b) => (a.chapterNumber !== b.chapterNumber ? a.chapterNumber - b.chapterNumber : a.chunkIndex - b.chunkIndex));
  }

  // -------------------------------------------------------------------
  // Creative Assets (Cover Art, Illustrations, Maps)
  // -------------------------------------------------------------------
  public saveAsset(asset: CreativeAsset): void {
    if (!this.state.creativeAssets) {
      this.state.creativeAssets = {};
    }
    if (!this.state.creativeAssets[asset.projectId]) {
      this.state.creativeAssets[asset.projectId] = [];
    }
    const idx = this.state.creativeAssets[asset.projectId].findIndex((a) => a.id === asset.id);
    if (idx >= 0) {
      this.state.creativeAssets[asset.projectId][idx] = { ...asset };
    } else {
      this.state.creativeAssets[asset.projectId].unshift({ ...asset });
    }
    this.saveToDisk();
  }

  public getAssets(projectId: string): CreativeAsset[] {
    if (!this.state.creativeAssets || !this.state.creativeAssets[projectId]) return [];
    return [...this.state.creativeAssets[projectId]];
  }

  public getAsset(id: string): CreativeAsset | undefined {
    if (!this.state.creativeAssets) return undefined;
    for (const list of Object.values(this.state.creativeAssets)) {
      const found = list.find((a) => a.id === id);
      if (found) return found;
    }
    return undefined;
  }

  // -------------------------------------------------------------------
  // Sessions & Authentication
  // -------------------------------------------------------------------
  public createSession(userId: string, token: string, expiresAt: string): void {
    if (!this.state.sessions) {
      this.state.sessions = {};
    }
    this.state.sessions[token] = {
      token,
      userId,
      expiresAt,
      createdAt: new Date().toISOString(),
    };
    this.saveToDisk();
  }

  public getSession(token: string): SessionRecord | undefined {
    if (!this.state.sessions) return undefined;
    const session = this.state.sessions[token];
    if (!session) return undefined;
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      delete this.state.sessions[token];
      this.saveToDisk();
      return undefined;
    }
    return session;
  }

  public deleteSession(token: string): void {
    if (this.state.sessions && this.state.sessions[token]) {
      delete this.state.sessions[token];
      this.saveToDisk();
    }
  }

  // -------------------------------------------------------------------
  // Organizations
  // -------------------------------------------------------------------
  public getOrganizations(): OrganizationRecord[] {
    return [...(this.state.organizations || [])];
  }

  public getOrganization(id: string): OrganizationRecord | undefined {
    return (this.state.organizations || []).find((o) => o.id === id || o.slug === id);
  }

  public saveOrganization(org: OrganizationRecord): void {
    if (!this.state.organizations) {
      this.state.organizations = [];
    }
    const idx = this.state.organizations.findIndex((o) => o.id === org.id);
    if (idx >= 0) {
      this.state.organizations[idx] = { ...org };
    } else {
      this.state.organizations.push({ ...org });
    }
    this.saveToDisk();
  }

  // -------------------------------------------------------------------
  // Stats Aggregation (for Founder Dashboard)
  // -------------------------------------------------------------------
  public getAggregatedStats() {
    const books = this.state.books;
    const totalWords = books.reduce((acc, b) => {
      const bookWords = (b.chapters || []).reduce((cAcc, c) => cAcc + (c.currentWords || 0), 0);
      return acc + bookWords;
    }, 0);

    const totalSpend = this.state.costRecords.reduce((acc, r) => acc + (r.costUsd || 0), 0);
    const totalInputTokens = this.state.costRecords.reduce((acc, r) => acc + (r.inputTokens || 0), 0);
    const totalOutputTokens = this.state.costRecords.reduce((acc, r) => acc + (r.outputTokens || 0), 0);

    const jobs = this.getGenerationJobs();
    const activeJobs = jobs.filter((j) => j.status === "running").length;
    const failedJobs = jobs.filter((j) => j.status === "failed").length;

    return {
      totalUsers: this.state.users.length,
      activeProjects: books.length,
      totalWordsGenerated: totalWords,
      totalAiCostUsd: Number(totalSpend.toFixed(4)),
      totalTokens: {
        input: totalInputTokens,
        output: totalOutputTokens,
        total: totalInputTokens + totalOutputTokens,
      },
      activeGenerationJobs: activeJobs,
      failedGenerationJobs: failedJobs,
      auditLogCount: this.state.auditLogs.length,
      costRecordCount: this.state.costRecords.length,
    };
  }
}

export const db = DatabaseAdapter.getInstance();
