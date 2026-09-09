// =====================================================================
// BookForge AI - CostGuard (AI Token Accounting & Financial Defense)
// =====================================================================

import { AuthUser } from "../security";

export interface CostRecord {
  id: string;
  timestamp: string;
  userId: string;
  projectId?: string;
  action: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  isEstimated: boolean;
}

export interface BudgetConfig {
  maxBudgetUsdPerBook: number;
  dailyPlatformBudgetUsd: number;
  warningThresholdPercent: number;
}

export interface CostPersistenceAdapter {
  saveCostRecord(record: CostRecord): void;
  getCostRecords(): CostRecord[];
}

class CostGuardService {
  private config: BudgetConfig = {
    maxBudgetUsdPerBook: 25.0,
    dailyPlatformBudgetUsd: 150.0,
    warningThresholdPercent: 80,
  };

  private records: CostRecord[] = [];
  private persistenceAdapter: CostPersistenceAdapter | null = null;

  // Gemini 3.8 Flash pricing estimate (USD per million tokens)
  private readonly inputCostPerMillion = 0.15;
  private readonly outputCostPerMillion = 0.60;

  constructor() {
    // Zero hardcoded demo usage. System starts cleanly.
    this.records = [];
  }

  setPersistenceAdapter(adapter: CostPersistenceAdapter): void {
    this.persistenceAdapter = adapter;
    try {
      const persisted = adapter.getCostRecords();
      if (persisted && persisted.length > 0) {
        this.records = persisted;
      }
    } catch (err) {
      console.error("[CostGuard] Failed to load persisted cost records:", err);
    }
  }

  /**
   * Estimates cost in USD from input & output tokens.
   */
  calculateCost(inputTokens: number, outputTokens: number): number {
    const inputCost = (inputTokens / 1_000_000) * this.inputCostPerMillion;
    const outputCost = (outputTokens / 1_000_000) * this.outputCostPerMillion;
    return Number((inputCost + outputCost).toFixed(6));
  }

  /**
   * Records an AI usage transaction.
   */
  recordUsage(params: {
    userId: string;
    projectId?: string;
    action: string;
    model?: string;
    inputTokens: number;
    outputTokens: number;
    isEstimated?: boolean;
  }): CostRecord {
    const costUsd = this.calculateCost(params.inputTokens, params.outputTokens);
    const record: CostRecord = {
      id: `cost-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      userId: params.userId,
      projectId: params.projectId,
      action: params.action,
      model: params.model || "gemini-3.8-flash",
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      costUsd,
      isEstimated: params.isEstimated ?? true,
    };

    this.records.push(record);

    if (this.persistenceAdapter) {
      try {
        this.persistenceAdapter.saveCostRecord(record);
      } catch (err) {
        console.error("[CostGuard] Failed to persist cost record:", err);
      }
    }

    return record;
  }

  /**
   * Pre-check before executing an AI call.
   * Founder accounts receive a higher ceiling, never an unlimited one.
   */
  checkBudget(user: AuthUser, projectId?: string): { allowed: boolean; warning?: string } {
    const projectLimit = user.role === "FOUNDER"
      ? Math.max(this.config.maxBudgetUsdPerBook * 10, 250)
      : this.config.maxBudgetUsdPerBook;

    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);
    const platformSpendToday = this.records
      .filter((r) => new Date(r.timestamp).getTime() >= dayStart.getTime())
      .reduce((sum, r) => sum + r.costUsd, 0);

    if (platformSpendToday >= this.config.dailyPlatformBudgetUsd) {
      throw new Error("Plattformens daglige AI-budsjett er nådd. Nye AI-kall er midlertidig blokkert.");
    }

    if (projectId) {
      const projectSpend = this.getProjectSpend(projectId);
      if (projectSpend >= projectLimit) {
        throw new Error(
          `Budsjettgrense nådd for prosjektet (${projectSpend.toFixed(2)} / ${projectLimit}).`
        );
      }
      const pct = (projectSpend / projectLimit) * 100;
      if (pct >= this.config.warningThresholdPercent) {
        return {
          allowed: true,
          warning: `Advarsel: Prosjektet har nådd ${pct.toFixed(0)}% av budsjettgrensen (${projectSpend.toFixed(2)} brukt).`,
        };
      }
    }

    return { allowed: true };
  }

  getProjectSpend(projectId: string): number {
    return this.records
      .filter((r) => r.projectId === projectId)
      .reduce((acc, r) => acc + r.costUsd, 0);
  }

  getTotalPlatformSpend(): number {
    return this.records.reduce((acc, r) => acc + r.costUsd, 0);
  }

  getTotalTokens(): { input: number; output: number; total: number } {
    let input = 0;
    let output = 0;
    for (const r of this.records) {
      input += r.inputTokens;
      output += r.outputTokens;
    }
    return { input, output, total: input + output };
  }

  getRecentRecords(limit = 20): CostRecord[] {
    return this.records.slice(-limit).reverse();
  }

  clearRecords(): void {
    this.records = [];
  }
}

export const CostGuard = new CostGuardService();
