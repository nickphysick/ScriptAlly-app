/**
 * Auth-aware marketing-nav state — pure, so the tier tests can lock both modes without DOM
 * rendering (repo test convention: node environment, no testing-library).
 *
 * Logged out : Log in (ghost) + "Become a Founding Writer" (the nav's ink pill, → /founders).
 * Logged in  : white "Open dashboard" button + avatar chip — the landing never redirects.
 */

import { LANDING_ONLY } from "../lib/siteMode";

export interface MarketingNavUser {
  name?: string;
  email?: string;
}

export interface MarketingNavState {
  mode: "anon" | "authed";
  /** Right-side primary button label. */
  primaryLabel: string;
  /** Ghost "Log in" shown only while anonymous. */
  showLogIn: boolean;
  /** Avatar-chip initial (authed only) — first letter of name, else email, else "W". */
  avatarInitial: string | null;
}

export function marketingNavState(
  user: MarketingNavUser | null | undefined,
  landingOnly: boolean = LANDING_ONLY,
): MarketingNavState {
  /* LANDING-ONLY: there is no app to log in to or open, so the nav offers neither, whoever is
     looking. The founding offer is the one call to action. */
  /* `LANDING_ONLY ||` is for the build, not the logic: a constant `true` lets the minifier drop the
     signed-in branch below, so the landing-only bundle contains no "Open dashboard" at all. */
  if (LANDING_ONLY || landingOnly) {
    return { mode: "anon", primaryLabel: "Become a Founding Writer", showLogIn: false, avatarInitial: null };
  }
  if (!user) {
    /* ⚠️ THE ANON CTA IS THE FOUNDING OFFER UNTIL LAUNCH, NOT `Start tracking — it's free`. There
       is no self-serve product behind that label yet, so a chrome button offering one is a door to
       a room that is not built; `Log in` continues to serve existing accounts and the founding
       list is the funnel. It navigates to `/founders` rather than setting `#/signup`. */
    return { mode: "anon", primaryLabel: "Become a Founding Writer", showLogIn: true, avatarInitial: null };
  }
  const source = (user.name || user.email || "W").trim() || "W";
  return { mode: "authed", primaryLabel: "Open dashboard", showLogIn: false, avatarInitial: source[0].toUpperCase() };
}
