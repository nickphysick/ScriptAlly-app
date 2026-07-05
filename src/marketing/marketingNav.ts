/**
 * Auth-aware marketing-nav state — pure, so the tier tests can lock both modes without DOM
 * rendering (repo test convention: node environment, no testing-library).
 *
 * Logged out : Log in (ghost) + "Start tracking — it's free" (white Cappuccino button).
 * Logged in  : white "Open dashboard" button + avatar chip — the landing never redirects.
 */

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

export function marketingNavState(user: MarketingNavUser | null | undefined): MarketingNavState {
  if (!user) {
    return { mode: "anon", primaryLabel: "Start tracking — it's free", showLogIn: true, avatarInitial: null };
  }
  const source = (user.name || user.email || "W").trim() || "W";
  return { mode: "authed", primaryLabel: "Open dashboard", showLogIn: false, avatarInitial: source[0].toUpperCase() };
}
