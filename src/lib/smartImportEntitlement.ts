/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smart Import entitlement — the client's read-only view of the gate enforced server-side in the
 * smartImportMap callable (functions/src/smartImport.ts). This derives state for the UI (the confirm
 * step, the dashboard credit card, the redemption surfaces) from the user's plan + the two
 * server-written usage fields. It is PURE READ/DERIVE — it never writes; usage is consumed only by
 * the function via the admin SDK.
 *
 * Deliberately dependency-free (no db / firebase import) so it stays unit-testable in the node env.
 * The React hook over the current user lives in useSmartImportEntitlement.ts.
 *
 * Policy mirrored here (must match the function): Free = 1 lifetime; Pro = 1 per UTC calendar month,
 * independent of the free-once. The month maths uses UTC so client and server agree.
 */
import { UserPlan, SmartImportUsage } from "../types";

export type SmartImportReason = "free_available" | "free_used" | "pro_available" | "pro_month_used";

export interface SmartImportEntitlement {
  allowed: boolean;
  tier: "free" | "pro";
  reason: SmartImportReason;
  /** For `pro_month_used` only — ISO "YYYY-MM-DD", first of the next UTC month. */
  nextAvailable?: string;
}

/** Current UTC calendar month as "YYYY-MM" — the same shape the function writes to `smartImportLastUsedMonth`. */
export function utcMonth(d: Date = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** First day (UTC) of the month AFTER the given "YYYY-MM", as ISO "YYYY-MM-DD". Date.UTC's month is
 *  0-based, so passing the 1-based month number lands on the first of the following month. */
export function firstOfNextMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
}

/** Derive entitlement from the user's plan + their usage subdoc. Absent usage reads as "not used".
 *  Pro is evaluated purely on the monthly allowance — the free-once flag is ignored for Pro, so
 *  upgrading unlocks an import straight away. */
export function getSmartImportEntitlement(
  plan: UserPlan | undefined,
  usage: SmartImportUsage | null | undefined,
  now: Date = new Date()
): SmartImportEntitlement {
  const tier: "free" | "pro" = plan === UserPlan.PRO ? "pro" : "free";

  if (tier === "pro") {
    const month = utcMonth(now);
    if (usage?.smartImportLastUsedMonth === month) {
      return { allowed: false, tier, reason: "pro_month_used", nextAvailable: firstOfNextMonth(month) };
    }
    return { allowed: true, tier, reason: "pro_available" };
  }

  if (usage?.smartImportFreeUsed === true) {
    return { allowed: false, tier, reason: "free_used" };
  }
  return { allowed: true, tier, reason: "free_available" };
}
