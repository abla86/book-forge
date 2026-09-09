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
}

export interface BudgetConfig {
  maxBudgetUsdPerBook: number;
  dailyPlatformBudgetUsd: number;
  warningThresholdPercent: number;
}

class CostGuardService {
  private config: BudgetConfig = {
    maxBudgetUsdPerBook: 25.0,
    dailyPlatformBudgetUsd: 150.0,
    warningThresholdPercent: 80,
  };

  private records: CostRecord[] = [];

  // Gemini 3.8 Flash pricing estimate (USD per million tokens)
  private readonly inputCostPerMillion = 0.15;
  private readonly outputCostPerMillion = 0.60;

  constructor() {
    // Initialize with baseline demo usage for realistic dashboard metrics
    this.recordUsage({
      userId: "user-founder-1",
      projectId: "book-riket-under-regnet",
      action: "GENERATE_PLAN",
      inputTokens: 3200,
      outputTokens: 4800,
    });
    this.recordUsage({
      userId: "user-founder-1",
      projectId: "book-riket-under-regnet",
      action: "WRITE_CHAPTER",
      inputTokens: 1800,
      outputTokens: 2550,
    });
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
    };

    this.records.push(record);
    return record;
  }

  /**
   * Pre-check before executing an AI call.
   * Throws if budget would be exceeded (unless user is FOUNDER).
   */
  checkBudget(user: AuthUser, projectId?: string): { allowed: boolean; warning?: string } {
    if (user.role === "FOUNDER") {
      // Founders have unlimited creation authority
      return { allowed: true };
    }

    if (projectId) {
      const projectSpend = this.getProjectSpend(projectId);
      if (projectSpend >= this.config.maxBudgetUsdPerBook) {
        throw new Error(
          `Budsjettgrense nådd for prosjektet ($${projectSpend.toFixed(2)} / $${this.config.maxBudgetUsdPerBook}). Kontakt support eller oppgrader til Studio.`
        );
      }
      const pct = (projectSpend / this.config.maxBudgetUsdPerBook) * 100;
      if (pct >= this.config.warningThresholdPercent) {
        return {
          allowed: true,
          warning: `Advarsel: Prosjektet har nådd ${pct.toFixed(0)}% av budsjettgrensen ($${projectSpend.toFixed(2)} brukt).`,
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
}

export const CostGuard = new CostGuardService();
