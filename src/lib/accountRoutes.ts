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
  | "security"
  | "plan"
  | "notifications"
  | "preferences"
  | "tasks"
  | "data";

export interface AccountRoute {
  id: AccountSectionId;
  /** The rail's label — the same words the section card heads with. */
  label: string;
  path: string;
}

/**
 * The rail's order, top to bottom.
 *
 * ⚠️ `tasks` IS TRANSITIONAL AND LEAVES IN PHASE 2. It is here so that THIS commit changes the
 * routing mechanism and nothing else: the page still renders seven sections today, and dropping
 * one of them in a commit whose subject is "routes" would hide a content change inside a
 * mechanism change. Its content becomes a link row inside Preferences; when the rail item goes,
 * `/account/tasks` stops resolving and falls to the redirect below, which is the correct
 * behaviour for a retired path — not a dead end.
 */
export const ACCOUNT_ROUTES: AccountRoute[] = [
  { id: "profile", label: "Profile", path: "/account/profile" },
  { id: "security", label: "Sign-in & security", path: "/account/security" },
  { id: "plan", label: "Plan & billing", path: "/account/plan" },
  { id: "notifications", label: "Notifications", path: "/account/notifications" },
  { id: "preferences", label: "Preferences", path: "/account/preferences" },
  { id: "tasks", label: "Tasks", path: "/account/tasks" },
  { id: "data", label: "Your data", path: "/account/data" },
];

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
  return accountSectionForPath(pathname) ? null : ACCOUNT_DEFAULT_PATH;
}
