// =====================================================================
// BookForge AI - Security, Access Control, Audit Logging & Rate Limiting
// =====================================================================

export type UserRole = "FOUNDER" | "ADMIN" | "AUTHOR" | "READER";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  subscriptionPlan: "FREE" | "PRO" | "STUDIO" | "ENTERPRISE";
}

export type SecurityAction =
  | "CREATE_PROJECT"
  | "UPDATE_PROJECT"
  | "DELETE_PROJECT"
  | "GENERATE_SYNOPSIS"
  | "WRITE_CHAPTER"
  | "CONTINUITY_AUDIT"
  | "UPDATE_BIBLE"
  | "EXPORT_BOOK"
  | "CREATE_VERSION"
  | "ROLLBACK_VERSION"
  | "REVERT_CHAPTER"
  | "TOGGLE_KILL_SWITCH"
  | "VIEW_FOUNDER_STATS"
  | "RATE_LIMIT_BLOCKED"
  | "KILL_SWITCH_BLOCKED";

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorRole: UserRole;
  action: SecurityAction;
  projectId?: string;
  status: "SUCCESS" | "FAILURE" | "BLOCKED";
  metadata?: Record<string, unknown>;
  errorMessage?: string;
}

export interface KillSwitchState {
  active: boolean;
  reason?: string;
  activatedBy?: string;
  activatedAt?: string;
}

/**
 * 1. BookAccessControl
 * Enforces project isolation and role-based permissions.
 */
export class BookAccessControl {
  /**
   * Validates whether a user can read or write to a book project.
   * FOUNDER and ADMIN have cross-project authority.
   * Standard AUTHOR users can only access projects they own.
   */
  static validateAccess(
    user: AuthUser,
    projectOwnerId: string,
    action: "read" | "write" | "admin" = "write"
  ): { allowed: boolean; reason?: string } {
    if (!user || !user.id) {
      return { allowed: false, reason: "Uautorisert forespørsel: Ingen gyldig brukeridentitet funnet." };
    }

    // Founder has full enterprise access
    if (user.role === "FOUNDER") {
      return { allowed: true };
    }

    // Admin has administrative access
    if (user.role === "ADMIN") {
      return { allowed: true };
    }

    if (action === "admin") {
      return { allowed: false, reason: "Krever FOUNDER- eller ADMIN-rettigheter." };
    }

    // Regular authors must own the project
    if (user.id !== projectOwnerId) {
      return {
        allowed: false,
        reason: `Prosjektisolasjon: Bruker ${user.id} har ikke tilgang til prosjekt eid av ${projectOwnerId}.`,
      };
    }

    return { allowed: true };
  }

  /**
   * Enforces that the action must be executed by a user with FOUNDER role.
   */
  static requireFounder(user: AuthUser): { allowed: boolean; reason?: string } {
    if (!user || user.role !== "FOUNDER") {
      return {
        allowed: false,
        reason: "Adgang nektet: Denne handlingen krever rollen FOUNDER.",
      };
    }
    return { allowed: true };
  }
}

/**
 * 2. AuditLogger
 * Persistent in-memory and dispatchable log stream for all security events.
 */
class AuditLoggerService {
  private logs: AuditLogEntry[] = [];
  private maxLogs = 500;

  constructor() {
    // Seed initial bootstrap log
    this.log({
      actorId: "system",
      actorRole: "FOUNDER",
      action: "CREATE_PROJECT",
      status: "SUCCESS",
      metadata: { note: "Security audit subsystem initialized." },
    });
  }

  log(params: {
    actorId: string;
    actorRole: UserRole;
    action: SecurityAction;
    projectId?: string;
    status: "SUCCESS" | "FAILURE" | "BLOCKED";
    metadata?: Record<string, unknown>;
    errorMessage?: string;
  }): AuditLogEntry {
    const entry: AuditLogEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      ...params,
    };

    // Keep memory bound to prevent leak
    this.logs.unshift(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    return entry;
  }

  getRecentLogs(limit = 50, filterAction?: SecurityAction): AuditLogEntry[] {
    if (filterAction) {
      return this.logs.filter((l) => l.action === filterAction).slice(0, limit);
    }
    return this.logs.slice(0, limit);
  }

  clearLogs(): void {
    this.logs = [];
  }
}

export const AuditLogger = new AuditLoggerService();

/**
 * 3. RateLimiter
 * Manages active concurrent AI jobs and hourly throughput per user.
 * Eliminates race conditions with atomic lock checks.
 */
class RateLimiterService {
  // Map of userId -> Set of active job IDs
  private activeJobsByUser: Map<string, Set<string>> = new Map();
  // Map of userId -> Array of timestamps in ms
  private requestTimestampsByUser: Map<string, number[]> = new Map();

  private defaultMaxConcurrent = 2;
  private maxRequestsPerHour = 100;

  /**
   * Attempts to acquire a slot for a concurrent generation job.
   * Throws or returns an error if limits are breached.
   */
  acquireJobSlot(
    user: AuthUser,
    jobId: string,
    jobType: string
  ): { success: boolean; error?: string } {
    // FOUNDER bypass: unlimited concurrent generation
    if (user.role === "FOUNDER") {
      const current = this.activeJobsByUser.get(user.id) || new Set();
      current.add(jobId);
      this.activeJobsByUser.set(user.id, current);
      return { success: true };
    }

    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    // Check hourly volume
    const timestamps = (this.requestTimestampsByUser.get(user.id) || []).filter(
      (ts) => ts > oneHourAgo
    );
    if (timestamps.length >= this.maxRequestsPerHour) {
      AuditLogger.log({
        actorId: user.id,
        actorRole: user.role,
        action: "RATE_LIMIT_BLOCKED",
        status: "BLOCKED",
        errorMessage: `Timegrense overskredet (${this.maxRequestsPerHour} forespørsler/time)`,
      });
      return {
        success: false,
        error: `Rate limit overskredet: Maksimalt ${this.maxRequestsPerHour} AI-handlinger tillatt per time.`,
      };
    }

    // Check concurrent jobs
    const current = this.activeJobsByUser.get(user.id) || new Set();
    if (current.size >= this.defaultMaxConcurrent) {
      AuditLogger.log({
        actorId: user.id,
        actorRole: user.role,
        action: "RATE_LIMIT_BLOCKED",
        status: "BLOCKED",
        errorMessage: `Maks antall samtidige jobber nådd (${this.defaultMaxConcurrent})`,
      });
      return {
        success: false,
        error: `Samtidighetsbegrensning: Du har allerede ${current.size} aktive genereringsjobber som kjører. Vent til en fullføres.`,
      };
    }

    // Atomic assignment
    current.add(jobId);
    this.activeJobsByUser.set(user.id, current);
    timestamps.push(now);
    this.requestTimestampsByUser.set(user.id, timestamps);

    return { success: true };
  }

  /**
   * Releases a job slot once completed or aborted.
   */
  releaseJobSlot(userId: string, jobId: string): void {
    const current = this.activeJobsByUser.get(userId);
    if (current) {
      current.delete(jobId);
      if (current.size === 0) {
        this.activeJobsByUser.delete(userId);
      }
    }
  }

  getActiveJobCount(userId: string): number {
    return this.activeJobsByUser.get(userId)?.size || 0;
  }

  getTotalActiveJobs(): number {
    let total = 0;
    for (const set of this.activeJobsByUser.values()) {
      total += set.size;
    }
    return total;
  }
}

export const RateLimiter = new RateLimiterService();

/**
 * 4. Emergency Kill Switch
 * Global safety brake capable of instantly halting all AI generation across the platform.
 */
class EmergencyKillSwitchService {
  private state: KillSwitchState = {
    active: false,
  };

  getState(): KillSwitchState {
    return { ...this.state };
  }

  setKillSwitch(active: boolean, user: AuthUser, reason?: string): KillSwitchState {
    const check = BookAccessControl.requireFounder(user);
    if (!check.allowed) {
      throw new Error(check.reason);
    }

    this.state = {
      active,
      reason: active ? reason || "Emergency Kill Switch aktivert av FOUNDER" : undefined,
      activatedBy: active ? user.name : undefined,
      activatedAt: active ? new Date().toISOString() : undefined,
    };

    AuditLogger.log({
      actorId: user.id,
      actorRole: user.role,
      action: "TOGGLE_KILL_SWITCH",
      status: "SUCCESS",
      metadata: { active, reason: this.state.reason },
    });

    return this.getState();
  }

  assertCanGenerate(): void {
    if (this.state.active) {
      throw new Error(
        `AI-generering er midlertidig deaktivert på plattformnivå: ${
          this.state.reason || "Emergency Kill Switch er aktiv."
        }`
      );
    }
  }
}

export const EmergencyKillSwitch = new EmergencyKillSwitchService();
