/**
 * Durable monthly budget guard for the Transit API free tier
 * (1,500 requests per month, 5 per minute).
 *
 * The per-minute limiter (`transitRateLimiter.ts`) protects the short window;
 * this store protects the monthly allowance. It is persisted to a JSON file
 * (default `.local-transit-usage/usage.json`) so process restarts within a
 * deployment instance do not reset the counter. The counter tracks only real
 * upstream requests — never cache hits, in-flight dedupe followers, rejected
 * invalid input, or network-level failures that never reached the upstream
 * server.
 *
 * The month boundary uses America/Los_Angeles (`YYYY-MM`) so the local billing
 * month aligns with the account timezone. The counter is an *estimate* of the
 * provider's billing meter; it is not the provider's official quota record.
 */

import fs from "fs/promises";
import path from "path";

export type TransitRequestCategory = "nearby" | "arrivals" | "plan" | "alerts" | "networks";

export const MONTHLY_REQUEST_LIMIT = 1500;
const WARN_RATIO = 0.7;
const REDUCE_RATIO = 0.85;
const RESERVE_RATIO = 0.95;

/** Nonessential categories are throttled first when the budget is under pressure. */
const LOW_PRIORITY_CATEGORIES: ReadonlySet<TransitRequestCategory> = new Set(["alerts", "networks"]);
/** Only these are allowed once the budget crosses the reserve threshold. */
const RESERVED_CATEGORIES: ReadonlySet<TransitRequestCategory> = new Set(["plan", "arrivals"]);

export interface TransitMonthlyUsage {
  month: string;
  requestCount: number;
  lastRequestAt: string | null;
  byCategory: Partial<Record<TransitRequestCategory, number>>;
}

export type TransitBudgetLevel = "normal" | "warning" | "reduce" | "reserve" | "exhausted";

export interface TransitMonthlyStatus {
  month: string;
  limit: number;
  used: number;
  remaining: number;
  lastRequestAt: string | null;
  level: TransitBudgetLevel;
  byCategory: Partial<Record<TransitRequestCategory, number>>;
  /** Always true: this counter is an estimate, not the provider's billing record. */
  estimated: true;
}

/** America/Los_Angeles month key (`YYYY-MM`). */
export function getMonthKey(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value ?? String(date.getUTCFullYear());
  const month = parts.find((p) => p.type === "month")?.value ?? String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function levelFor(ratio: number): TransitBudgetLevel {
  if (ratio >= 1) return "exhausted";
  if (ratio >= RESERVE_RATIO) return "reserve";
  if (ratio >= REDUCE_RATIO) return "reduce";
  if (ratio >= WARN_RATIO) return "warning";
  return "normal";
}

export interface TransitBudgetGate {
  allowed: boolean;
  code?: "exhausted" | "reserved";
}

export class TransitBudgetStore {
  private readonly filePath: string;
  private readonly limit: number;
  private usage: TransitMonthlyUsage | null = null;
  private writeChain: Promise<void> = Promise.resolve();

  constructor(options: { filePath?: string; limit?: number } = {}) {
    this.filePath =
      options.filePath ??
      process.env.TRANSIT_USAGE_FILE ??
      path.join(process.cwd(), ".local-transit-usage", "usage.json");
    this.limit = options.limit ?? MONTHLY_REQUEST_LIMIT;
  }

  private async ensureLoaded(): Promise<TransitMonthlyUsage> {
    if (this.usage) {
      if (this.usage.month !== getMonthKey()) {
        this.usage = this.emptyUsage();
        await this.persist();
      }
      return this.usage;
    }
    try {
      const text = await fs.readFile(this.filePath, "utf8");
      const parsed = JSON.parse(text) as TransitMonthlyUsage;
      if (parsed && typeof parsed.month === "string" && typeof parsed.requestCount === "number") {
        // Re-check before assigning: a concurrent caller may have already set
        // usage (e.g. the startup warm-up racing a first request) — never clobber
        // a newer in-memory counter with a disk read that started earlier.
        if (!this.usage) this.usage = parsed.month === getMonthKey() ? parsed : this.emptyUsage();
      }
    } catch {
      if (!this.usage) this.usage = this.emptyUsage();
    }
    if (!this.usage) this.usage = this.emptyUsage();
    return this.usage;
  }

  private emptyUsage(): TransitMonthlyUsage {
    return { month: getMonthKey(), requestCount: 0, lastRequestAt: null, byCategory: {} };
  }

  private persist(): Promise<void> {
    if (!this.usage) return Promise.resolve();
    const payload = this.usage;
    this.writeChain = this.writeChain
      .then(async () => {
        await fs.mkdir(path.dirname(this.filePath), { recursive: true });
        await fs.writeFile(this.filePath, JSON.stringify(payload, null, 2));
      })
      .catch(() => {
        // Best-effort durable counter; a failed write must not break transit.
      });
    return this.writeChain;
  }

  private toStatus(usage: TransitMonthlyUsage): TransitMonthlyStatus {
    const used = usage.requestCount;
    return {
      month: usage.month,
      limit: this.limit,
      used,
      remaining: Math.max(0, this.limit - used),
      lastRequestAt: usage.lastRequestAt,
      level: levelFor(used / this.limit),
      byCategory: usage.byCategory,
      estimated: true,
    };
  }

  async snapshot(): Promise<TransitMonthlyStatus> {
    return this.toStatus(await this.ensureLoaded());
  }

  /** Synchronous view of the last known usage for the status endpoint. */
  snapshotSync(): TransitMonthlyStatus {
    const usage = this.usage ?? this.emptyUsage();
    return this.toStatus(usage);
  }

  /** Warm the in-memory cache from disk so `snapshotSync` is accurate. */
  async load(): Promise<void> {
    await this.ensureLoaded();
  }

  async canSpend(category: TransitRequestCategory, now = new Date()): Promise<TransitBudgetGate> {
    const usage = await this.ensureLoaded();
    if (usage.requestCount >= this.limit) return { allowed: false, code: "exhausted" };
    const ratio = usage.requestCount / this.limit;
    if (ratio >= RESERVE_RATIO && !RESERVED_CATEGORIES.has(category)) {
      return { allowed: false, code: "reserved" };
    }
    if (ratio >= REDUCE_RATIO && LOW_PRIORITY_CATEGORIES.has(category)) {
      return { allowed: false, code: "reserved" };
    }
    return { allowed: true };
  }

  async record(category: TransitRequestCategory, now = new Date()): Promise<void> {
    const usage = await this.ensureLoaded();
    usage.requestCount += 1;
    usage.lastRequestAt = now.toISOString();
    usage.byCategory[category] = (usage.byCategory[category] ?? 0) + 1;
    await this.persist();
  }

  reset(): void {
    this.usage = this.emptyUsage();
  }
}

let sharedStore: TransitBudgetStore | null = null;

export function getTransitBudgetStore(): TransitBudgetStore {
  if (!sharedStore) {
    sharedStore = new TransitBudgetStore();
    // Warm the in-memory usage from disk so the status endpoint reports real
    // persisted usage even before the first transit request of the process.
    void sharedStore.load();
  }
  return sharedStore;
}

/** Test seam: forces the next `getTransitBudgetStore()` to build a fresh store. */
export function resetTransitBudgetForTests(): void {
  sharedStore = null;
}
