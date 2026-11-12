/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Plan entitlements — what a plan unlocks, in one place.
 *
 * ⚠️ FOUNDING-MEMBER ACCESS (Nick, 27 Sep; packages v2 D7): every account gets full Submission
 * packages access for now. The Free block in `addPackage`, the Manuscripts page's Pro lock and Pro
 * tag on packages, and the query form's "Attach a package · Pro" lock all read `packagesUnlocked`,
 * so turning gating back on is this one constant. `UserPlan` and `isProUser` stay: gates return.
 *
 * ⚠️ THE SERVER NEVER GATED PACKAGES — firestore.rules checks only the letter on create and the
 * sent lock; functions/ has no package check. This is a client entitlement only.
 */
import { UserPlan } from "../types";
import type { ProEntitlement } from "./workspaceShell";
import { TRIAL_DAYS, type ProFeature } from "./planRules";

export const PACKAGES_OPEN_TO_ALL = true;

/** True when this account may create and attach submission packages. */
export function packagesUnlocked(e: Entitlement): boolean {
  return PACKAGES_OPEN_TO_ALL || canUse(e, "packages");
}

/**
 * Submission packages v41 — "a founding writer": someone whose packages come from FOUNDING ACCESS, not a paid plan.
 * ⚠️ THERE IS NO FOUNDING FIELD ON THE ACCOUNT (see VERSIONS_FOUNDING_ACCESS below): during the beta every account is a
 * founding member, and Pro pages are open to them through `PACKAGES_OPEN_TO_ALL`. So the answer is that constant and
 * the plan: open to all, and not on paid Pro. A paid Pro user is never told the page is a founding perk; when founding
 * access ends (the constant goes false) nobody is.
 */
export function packagesViaFounding(e: Entitlement): boolean {
  /* Plan rules v1: the founding flag itself, not "open to all and not paid". */
  return e.basis === "founding";
}

/**
 * ⚠️ VERSIONS IS PRO, AND FOUNDING MEMBERS HAVE IT IN FULL (Nick, 22 Oct; Versions v1). There is no founding
 * flag on the account: during the beta every account is a founding member (the sidebar's feedback card says so
 * to everyone), so founding access is this one constant, exactly as packages' is. When founding access ends,
 * turn it off and the gate is Pro alone.
 */
export const VERSIONS_FOUNDING_ACCESS = true;

/** True when this user may use the Versions page: Pro, or a founding member while founding access is on. */
export function versionsUnlocked(e: Entitlement, foundingAccess: boolean = VERSIONS_FOUNDING_ACCESS): boolean {
  return foundingAccess || canUse(e, "versions");
}

/**
 * DISCOVER (sidebar rail v1, 5 Nov). Discover is a Pro page in the nav, but nothing has ever gated it
 * (Discover v1: "Pro is the pill only"), and every account has full access for now, as with packages.
 * The sidebar's Pro tag reads this, so it stays dormant until gating returns — one constant, like
 * `PACKAGES_OPEN_TO_ALL`. This gates no route and no write; it only decides whether the tag is drawn.
 */
export const DISCOVER_OPEN_TO_ALL = true;

/** True when this user has Discover. */
export function discoverUnlocked(e: Entitlement): boolean {
  return DISCOVER_OPEN_TO_ALL || canUse(e, "scout");
}

/**
 * MATERIALS (sidebar materials v1, 6 Nov): the nav's Materials section — Query letters, Comparable titles and
 * Submission packages — is Pro as a whole, open to all while founding access lasts, like the others. Packages keeps
 * its own `PACKAGES_OPEN_TO_ALL`, which six readers (the package writers among them) use; this one decides the nav's
 * marks, and the page locks arrive with the Query letters pack.
 */
export const MATERIALS_OPEN_TO_ALL = true;

/** True when this user has Materials. */
export function materialsUnlocked(e: Entitlement, open: boolean = MATERIALS_OPEN_TO_ALL): boolean {
  return open || canUse(e, "letters");
}

/** Each nav entitlement's open-to-all switch, as it stands today. */
export const NAV_OPEN: Readonly<Record<ProEntitlement, boolean>> = {
  discover: DISCOVER_OPEN_TO_ALL,
  packages: PACKAGES_OPEN_TO_ALL,
  versions: VERSIONS_FOUNDING_ACCESS,
  materials: MATERIALS_OPEN_TO_ALL,
};

/**
 * The nav entitlements this user does NOT have: the rail and the full sidebar draw a Pro mark for these and nothing
 * else (sidebar materials v1). Empty for every account today, because every switch is open. `open` overrides a
 * switch, which is how a test, and the dev-only review aid, see the nav a Free writer will see once gating returns.
 */
export function navLockedFor(
  e: Entitlement,
  open: Partial<Record<ProEntitlement, boolean>> = {},
): Set<ProEntitlement> {
  const out = new Set<ProEntitlement>();
  if (e.pro) return out;
  for (const k of Object.keys(NAV_OPEN) as ProEntitlement[]) if (!(open[k] ?? NAV_OPEN[k])) out.add(k);
  return out;
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
