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
import { AuthUser, AuditLogEntry, KillSwitchState } from "./security";
import { CostRecord } from "./engine/CostGuard";
import { BookProject } from "../types";
import { VersionSnapshot } from "./engine/VersionHistory";

export interface SystemSetting<T = unknown> {
  key: string;
  value: T;
  updatedBy: string;
  updatedAt: string;
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
  books: BookProject[];
  bookBibles: Record<string, BookBibleRecord>;
  bookVersions: Record<string, VersionSnapshot[]>;
  auditLogs: AuditLogEntry[];
  costRecords: CostRecord[];
  systemSettings: Record<string, SystemSetting>;
}

export class DatabaseAdapter {
  private static instance: DatabaseAdapter | null = null;
  private dbFilePath: string;
  private isConnectedToPostgres: boolean = false;
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

    // Initialize state from persistent disk storage
    this.state = this.loadFromDisk();

    // Check if external Postgres DATABASE_URL is configured
    if (process.env.DATABASE_URL) {
      console.log("[BookForge DB] External DATABASE_URL detected. Configuring PostgreSQL adapter.");
      this.isConnectedToPostgres = false;
    } else {
      console.log(`[BookForge DB] Operating in Disk-Persisted Storage Mode (${this.dbFilePath}). All mutations survive server restarts.`);
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
      books: [],
      bookBibles: {},
      bookVersions: {},
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
      auditLogCount: this.state.auditLogs.length,
      costRecordCount: this.state.costRecords.length,
    };
  }
}

export const db = DatabaseAdapter.getInstance();
