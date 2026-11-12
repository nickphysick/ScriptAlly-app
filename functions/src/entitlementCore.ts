/**
 * The server's entitlement rule (plan rules v1): founding flag, then plan, then the trial window. PURE, no Firebase
 * import, so `src/lib/entitlementsAgree.test.ts` can run it beside the client's `src/lib/entitlements.ts` and fail the
 * moment the two disagree.
 *
 * ⚠️ THIS IS THE ONE SERVER COPY OF THE RULE. `extractFromEmail`, `suggestComps` and `smartImportMap` all read it
 *    through `entitlement.ts`; no callable states its own condition.
 * ⚠️ THE TRIAL IS DERIVED FROM THE SIGN-IN ACCOUNT'S CREATION TIME (admin `getUser().metadata.creationTime`), never
 *    from the stored `trialStartDate`, which nothing reads any more. Founding accounts have no trial clock.
 */

/** Days of full Pro from account creation. Mirrors `TRIAL_DAYS` in `src/lib/planRules.ts` (asserted equal). */
export const TRIAL_DAYS = 14;
export const DAY_MS = 86_400_000;
/** Mirrors `UserPlan.PRO` in `src/types.ts`. */
export const PRO_PLAN = "Pro";

export type EntitlementBasis = "founding" | "pro" | "trial" | "free";

export interface EntitlementFacts {
  /** `users/{uid}/private/entitlement.founding === true` — server-written, never by the app. */
  founding: boolean;
  /** `users/{uid}.plan`. */
  plan: string | null | undefined;
  /** The sign-in account's creation time, ms. Null when unknown — which never grants a trial. */
  createdMs: number | null;
  nowMs: number;
}

/** Founding first, then a paid plan, then the first 14 days (day 1 to day 14), then Free. */
export function entitlementBasis(f: EntitlementFacts): EntitlementBasis {
  if (f.founding) return "founding";
  if (f.plan === PRO_PLAN) return "pro";
  if (f.createdMs != null && f.nowMs - f.createdMs < TRIAL_DAYS * DAY_MS) return "trial";
  return "free";
}

/** Every Pro feature (Query letters, versions, packages, their results, comps, the Scout, Smart email drop). */
export const hasPro = (b: EntitlementBasis): boolean => b !== "free";


/**
 * SMART IMPORT IS ONCE PER ACCOUNT, ON EVERY PLAN (plan rules v1). The monthly Pro allowance is retired, and an
 * account that ever used either old allowance has used its one: the free-once flag, or any Pro month on record. An
 * account that imported more than once under the old rule keeps its data and simply has none left. Mirrors
 * `smartImportUsed` in src/lib/smartImportEntitlement.ts (`smartImportEntitlement.test.ts` runs both).
 */
export interface SmartImportFields { smartImportFreeUsed?: unknown; smartImportLastUsedMonth?: unknown }
export const smartImportUsed = (e: SmartImportFields | null | undefined): boolean =>
  e?.smartImportFreeUsed === true || (typeof e?.smartImportLastUsedMonth === "string" && e.smartImportLastUsedMonth !== "");
