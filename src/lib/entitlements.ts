/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Plan entitlements — what an account has, in one place (plan rules v1, 12 Nov).
 *
 * ⚠️ ONE RESOLVER: founding flag, then plan, then the 14-day trial (`resolveEntitlement` below). Every gate in the
 *    app reads it, and the server mirrors it (`functions/src/entitlementCore.ts`).
 * ⚠️ THE FOUR OPEN-TO-ALL SWITCHES ARE RETIRED. `PACKAGES_OPEN_TO_ALL`, `VERSIONS_FOUNDING_ACCESS`,
 *    `DISCOVER_OPEN_TO_ALL` and `MATERIALS_OPEN_TO_ALL` stood in for founding access while no account carried a founding
 *    flag; the flag now exists (users/{uid}/private/entitlement.founding), so each switch is replaced by `canUse`.
 * ⚠️ THE SERVER NEVER GATED PACKAGES — firestore.rules checks only the letter on create and the sent lock; functions/
 *    has no package check. Packages, versions, letters and comps are client entitlements; the Scout and Smart email
 *    drop are enforced by their callables too.
 */
import { UserPlan } from "../types";
import type { ProEntitlement } from "./workspaceShell";
import { TRIAL_DAYS, type ProFeature } from "./planRules";

/** True when this account may create and attach submission packages. */
export function packagesUnlocked(e: Entitlement): boolean {
  return canUse(e, "packages");
}

/** Submission packages v41's founding note: shown to a founding writer — the flag itself. */
export function packagesViaFounding(e: Entitlement): boolean {
  return e.basis === "founding";
}

/** True when this account may use (and save to) the Versions page. */
export function versionsUnlocked(e: Entitlement): boolean {
  return canUse(e, "versions");
}

/** True when this account has the Scout (Discover). */
export function discoverUnlocked(e: Entitlement): boolean {
  return canUse(e, "scout");
}

/** True when this account has Materials (Query letters, Comparable titles, Submission packages). */
export function materialsUnlocked(e: Entitlement): boolean {
  return canUse(e, "letters");
}

/** Which Pro feature each nav entitlement stands for. */
const NAV_FEATURE: Readonly<Record<ProEntitlement, ProFeature>> = {
  discover: "scout",
  packages: "packages",
  versions: "versions",
  materials: "letters",
};

/** The nav entitlements this account does NOT have: the rail and the full sidebar draw a Pro mark for these only. */
export function navLockedFor(e: Entitlement): Set<ProEntitlement> {
  return new Set((Object.keys(NAV_FEATURE) as ProEntitlement[]).filter((k) => !canUse(e, NAV_FEATURE[k])));
}

/* ══════════════ Plan rules v1 — the one resolver ══════════════
   ⚠️ FOUNDING FLAG, THEN PLAN, THEN THE TRIAL WINDOW — and nothing else decides what an account has. The server mirrors
   this in `functions/src/entitlementCore.ts`; `entitlementsAgree.test.ts` runs both over the same cases.
   ⚠️ THE FOUNDING FLAG is `users/{uid}/private/entitlement.founding`, written only by the server. THE TRIAL is 14 days
   from the sign-in account's creation (auth metadata), derived, never stored: `trialStartDate` is not read. */
export const DAY_MS = 86_400_000;

export type EntitlementBasis = "founding" | "pro" | "trial" | "free";

export interface EntitlementFacts {
  founding: boolean;
  plan: string | null | undefined;
  /** The sign-in account's creation time, ms. Null when unknown, which never grants a trial. */
  createdMs: number | null;
  nowMs: number;
}

/** Founding first, then a paid plan, then the first 14 days (day 1 to day 14), then Free. */
export function entitlementBasis(f: EntitlementFacts): EntitlementBasis {
  if (f.founding) return "founding";
  if (f.plan === UserPlan.PRO) return "pro";
  if (f.createdMs != null && f.nowMs - f.createdMs < TRIAL_DAYS * DAY_MS) return "trial";
  return "free";
}

/**
 * What the app reads. `pending` is the moment before the private entitlement doc has loaded: nothing is locked and no
 * upgrade prompt is drawn, so a founding writer never sees a flash of Free.
 */
export interface Entitlement {
  basis: EntitlementBasis | "pending";
  /** Every Pro feature is open (founding, Pro, trial — and pending). */
  pro: boolean;
  /** Upgrade prompts may be drawn: trial and Free only. Never founding, never Pro, never pending. */
  prompts: boolean;
  /** When the trial ends (ms), for a trial account; otherwise null. */
  trialEndsMs: number | null;
}

export function resolveEntitlement(f: Omit<EntitlementFacts, "founding"> & { founding: boolean | null }): Entitlement {
  if (f.founding === null) return { basis: "pending", pro: true, prompts: false, trialEndsMs: null };
  const basis = entitlementBasis({ ...f, founding: f.founding });
  return {
    basis,
    pro: basis !== "free",
    prompts: basis === "trial" || basis === "free",
    trialEndsMs: basis === "trial" && f.createdMs != null ? f.createdMs + TRIAL_DAYS * DAY_MS : null,
  };
}

/** May this account use (create and edit in) a Pro feature? One answer for all seven: Pro work is all-or-nothing. */
export const canUse = (e: Entitlement, _feature: ProFeature): boolean => e.pro;
/** A Pro page on Free: it opens and its lists show, and nothing in it can be created or edited. */
export const readOnly = (e: Entitlement, feature: ProFeature): boolean => !canUse(e, feature);

/** Which plan-table column is this account's: founding writers and paid Pro hold Pro; a trial is still on Free. */
export const planColumn = (e: Entitlement): "free" | "pro" => (e.basis === "founding" || e.basis === "pro" ? "pro" : "free");
