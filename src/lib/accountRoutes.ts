/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * accountRoutes — the settings sections, named once, as REAL PATHS.
 *
 * ⚠️ THE SECTION USED TO BE `useState` INSIDE THE PAGE, WHICH MADE EVERY SECTION UNLINKABLE. A
 * support reply, an onboarding email or an in-app prompt could only ever say "open Settings, then
 * click Notifications" — and a refresh threw the reader back to Profile. The section is now the
 * URL, so `/account/notifications` is a thing you can send someone.
 *
 * ⚠️ FOUR SURFACES DECIDE WHETHER A PATH EXISTS, AND THEY ALL READ THIS FILE. An exact-path set
 * that does not know about a route does not error — it silently sends you somewhere else, which
 * is precisely how `/queries/analytics` became a dead link that four other surfaces believed in
 * (see the note on WORKSPACE_PATHS in marketing/routeTiers.ts). The four:
 *   · `WORKSPACE_PATHS` (marketing/routeTiers.ts) — absent ⇒ redirected to /dashboard
 *   · `WORKSPACE_SHELL_PATHS` (lib/shellForRoute.ts) — absent ⇒ throws in dev
 *   · `SHELL_SETUP_PATHS` (shell/shellV2Nav.ts) — absent ⇒ the Setup rib stops lighting
 *   · `CRUMB_EXTRAS` (shell/shellV2Nav.ts) — absent ⇒ no breadcrumb at all
 * Each of those now SPREADS a list derived from here rather than restating six strings.
 *
 * Deliberately dependency-free — it is imported by the route tier table, the shell map and the
 * page itself, and an import of anything heavier would put a cycle through all three.
 */

export type AccountSectionId =
  | "profile"
  | "preferences"
  | "emails"
  | "plan"
  | "data";

export interface AccountRoute {
  id: AccountSectionId;
  /** The rail's label. */
  label: string;
  path: string;
}

/**
 * ⚠️ FIVE SECTIONS, IN THE REF'S ORDER (non-workspace v1, Phase 2; design-refs/settings-v2.html `SECTIONS`):
 * You, Preferences, Emails, Plan, Your data. "You" keeps the `/account/profile` address so every link already
 * out there still lands on it; Sign-in & security moved into You, Tasks into Preferences, Notifications became
 * Emails. The three retired addresses redirect (`ACCOUNT_LEGACY`).
 */
export const ACCOUNT_ROUTES: AccountRoute[] = [
  { id: "profile", label: "You", path: "/account/profile" },
  { id: "preferences", label: "Preferences", path: "/account/preferences" },
  { id: "emails", label: "Emails", path: "/account/emails" },
  { id: "plan", label: "Plan", path: "/account/plan" },
  { id: "data", label: "Your data", path: "/account/data" },
];

/** Retired section addresses and where they live now. */
export const ACCOUNT_LEGACY: Readonly<Record<string, string>> = {
  "/account/security": "/account/profile",
  "/account/notifications": "/account/emails",
  "/account/tasks": "/account/preferences",
};

/** The bare route. Kept as its own constant because three checks below compare against it. */
export const ACCOUNT_ROOT = "/account";

/** Where `/account` and any unrecognised `/account/*` land. */
export const ACCOUNT_DEFAULT_PATH = "/account/profile";

/** The section paths, for the four exact-path sets to spread. `/account` is NOT among them — it
 *  is already registered everywhere, and it resolves by redirect rather than by rendering. */
export const ACCOUNT_SECTION_PATHS: string[] = ACCOUNT_ROUTES.map((r) => r.path);

/** The section an exact pathname renders, or null if the path is not a section. */
export function accountSectionForPath(pathname: string): AccountSectionId | null {
  return ACCOUNT_ROUTES.find((r) => r.path === pathname)?.id ?? null;
}

/**
 * The path this URL should be REPLACED with, or null to render it as it stands.
 *
 * ⚠️ THE PREFIX TEST IS `"/account/"`, NOT `"/account"`. A bare `startsWith("/account")` also
 * matches `/accounts`, `/account-recovery` and anything else that happens to begin with those
 * eight characters — it would capture a route this file knows nothing about and redirect it into
 * settings. The house has been bitten by exactly this shape of loose prefix match before (the
 * class-name lock family in CLAUDE.md); it is the same mistake wearing a pathname.
 */
export function accountRedirectFor(pathname: string): string | null {
  const ours = pathname === ACCOUNT_ROOT || pathname.startsWith(`${ACCOUNT_ROOT}/`);
  if (!ours) return null;
  if (accountSectionForPath(pathname)) return null;
  return ACCOUNT_LEGACY[pathname] ?? ACCOUNT_DEFAULT_PATH;
}

/**
 * Is this pathname inside settings?
 *
 * ⚠️ THE SHELL ASKS THIS, WHICH IS WHY IT LIVES HERE AND NOT IN THE SHELL. Settings mode swaps the
 * nav, dissolves the window and changes the top bar; the condition for all three is "which routes
 * ARE settings", and that is this file's question. A predicate written in `shellV2Nav` would be a
 * fifth surface deciding whether a path exists, which is the exact failure the note at the top of
 * this file lists four cures for.
 *
 * ⚠️ AND IT INCLUDES THE BARE ROOT DELIBERATELY, even though `accountRedirectFor` replaces it
 * before anything renders. The redirect is one navigation, so there is a frame in which the
 * pathname is `/account`; a predicate that said "no" for it would flash the app nav back for that
 * frame, on every entry.
 */
export function isAccountPath(pathname: string): boolean {
  return pathname === ACCOUNT_ROOT || accountSectionForPath(pathname) !== null;
}
