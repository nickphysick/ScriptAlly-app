/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smart Import entitlement — the client's read-only view of the gate enforced server-side in the
 * smartImportMap callable (functions/src/smartImport.ts). PURE READ/DERIVE — it never writes; usage is
 * consumed only by the function via the admin SDK, on `users/{uid}/private/entitlement`.
 *
 * ⚠️ PLAN RULES v1 (12 Nov): SMART IMPORT IS ONCE PER ACCOUNT, ON EVERY PLAN. The monthly Pro allowance is
 * retired, so the plan does not enter into it at all. An account has used its one if EITHER old field is set —
 * the free-once flag, or any Pro month on record — so an account that imported more than once under the old
 * rule keeps its data and simply has none left. The server reads the same rule from
 * `functions/src/entitlementCore.ts` (`smartImportUsed`); `smartImportEntitlement.test.ts` runs both.
 */
import type { SmartImportUsage } from "../types";

export type SmartImportReason = "available" | "used";

export interface SmartImportEntitlement {
  allowed: boolean;
  reason: SmartImportReason;
}

/** Has this account used its one Smart Import? Mirrors `smartImportUsed` in functions/src/entitlementCore.ts. */
export const smartImportUsed = (u: Pick<SmartImportUsage, "smartImportFreeUsed" | "smartImportLastUsedMonth"> | null | undefined): boolean =>
  u?.smartImportFreeUsed === true || (typeof u?.smartImportLastUsedMonth === "string" && u.smartImportLastUsedMonth !== "");

/** Absent usage reads as "not used". */
export function getSmartImportEntitlement(usage: SmartImportUsage | null | undefined): SmartImportEntitlement {
  return smartImportUsed(usage) ? { allowed: false, reason: "used" } : { allowed: true, reason: "available" };
}

/**
 * The callable's refusal reasons that mean "this account's one is spent". `used` is the server's word since plan
 * rules v1; `free_used` and `pro_month_used` are what a not-yet-redeployed server sends, and mean the same now.
 */
export const isUsedRefusal = (reason: unknown): boolean =>
  reason === "used" || reason === "free_used" || reason === "pro_month_used";

/**
 * How the plan card states the allowance: a short tag, and a sentence. Derived from `reason`, never recomputed
 * from usage — the rule is stated once, in `getSmartImportEntitlement`.
 *
 * ⚠️ `used` DOES NOT SELL: it states the fact and stops. The comparison two rows down is where the plans differ.
 */
export interface SmartImportLine {
  /** The chip — a state, in two or three words. */
  tag: string;
  /** The row's one explanatory sentence. */
  note: string;
}

export function smartImportLine(e: SmartImportEntitlement): SmartImportLine {
  switch (e.reason) {
    case "available":
      return { tag: "1 available", note: "The Smart Import that comes with your account hasn't been used." };
    case "used":
      return { tag: "Used", note: "You've used the Smart Import that comes with your account." };
    default: {
      /* ⚠️ EXHAUSTIVE, AND THE DEFAULT WRITES NOTHING. */
      const unhandled: never = e.reason;
      return { tag: "", note: "" };
    }
  }
}
