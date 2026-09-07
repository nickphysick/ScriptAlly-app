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

/**
 * How the plan card states the allowance: a short tag, and a sentence.
 *
 * ⚠️ IT IS DERIVED FROM `reason`, NOT RECOMPUTED FROM PLAN AND USAGE. The policy is stated once in
 * `getSmartImportEntitlement` and mirrored server-side in the callable; a second reading of the
 * same two fields here would be a third copy of the rule, free to disagree with both. This takes
 * the entitlement's own answer and puts words on it.
 *
 * ⚠️ THE FOUR SENTENCES SAY WHAT IS TRUE OF THE STATE THEY DESCRIBE, and the ref's does not. It
 * draws "This month's import hasn't been used. Your next one arrives on 1 October." on one row —
 * two facts that cannot both be the point at once. If it has not been used, the next one is not
 * what a reader needs; if it has, the next one is the only thing they need. `nextAvailable` is
 * only ever set on `pro_month_used`, which is the model saying the same thing.
 *
 * ⚠️ AND `free_used` DOES NOT SELL. "You've used yours — upgrade for one a month" is a true
 * sentence and it is an advertisement in a settings row, on a page whose plan card already carries
 * one honest CTA. It states the fact and stops; the comparison two rows down is where the
 * difference between the plans belongs.
 */
export interface SmartImportLine {
  /** The chip — a state, in two or three words. */
  tag: string;
  /** The row's one explanatory sentence. */
  note: string;
}

export function smartImportLine(
  e: SmartImportEntitlement,
  formatDate: (iso: string) => string,
): SmartImportLine {
  switch (e.reason) {
    case "free_available":
      return { tag: "1 available", note: "The Smart Import that comes with a free account hasn't been used." };
    case "free_used":
      return { tag: "Used", note: "You've used the Smart Import that comes with a free account." };
    case "pro_available":
      return { tag: "1 available", note: "This month's Smart Import hasn't been used." };
    case "pro_month_used":
      /* ⚠️ THE DATE IS THE WHOLE POINT OF THIS BRANCH, and it is the one branch that can lack it —
         `nextAvailable` is optional on the type. Without it the sentence says WHEN nothing, so it
         says something else instead rather than printing "arrives on undefined". */
      return {
        tag: "Used",
        note: e.nextAvailable
          ? `You've used this month's. Your next one arrives on ${formatDate(e.nextAvailable)}.`
          : "You've used this month's. Your next one arrives at the start of next month.",
      };
    default: {
      /* ⚠️ EXHAUSTIVE, AND THE DEFAULT WRITES NOTHING. A reason this function has not been taught
         is exactly the case nobody has thought about; the house rule is that such a branch does
         nothing rather than guessing, and `never` makes it a compile error instead. */
      const unhandled: never = e.reason;
      return { tag: "", note: "" };
    }
  }
}
