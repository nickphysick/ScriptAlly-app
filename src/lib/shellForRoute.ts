/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * shellForRoute — ONE mapping, in ONE place: which shell a route renders in.
 *
 * ⚠️ A ROUTE NOT IN THE MAP FAILS LOUDLY IN DEVELOPMENT, by throwing. A silent default is how a
 * page ends up in the wrong chrome for a month — nobody reports it, because it looks like a
 * decision someone made. But **a throw in production is worse than wrong chrome**, so the throw
 * is dev-only and production falls back to the workspace shell.
 *
 * ⚠️ THIS MAP IS THE ROUTES WE HAVE, NOT THE PRODUCT WE WANT. Archive, Agent detail, Manuscript
 * detail, Query letters, Synopses, Opening samples, Package builder, Task settings, Guides and
 * Contact were all in the pack's list and are all absent: they go in when they are built. Adding
 * a route here without building it is the one way to reintroduce a dead link.
 */

/**
 * ⚠️⚠️ AMENDMENT 1 (G) — EVERY SIGNED-IN ROUTE IS A WORKSPACE ROUTE NOW, and the dashboard is the
 * reason. With Dashboard on the top-nav shell, every visit home swapped the ENTIRE chrome: the
 * sidebar vanished, the nav relocated to the top, the ground changed colour. That is a jarring
 * loss of wayfinding on the most-visited page in the app, and in-shell homes are the norm
 * everywhere it matters (Linear, Notion, Stripe). Settings, Plans and Help followed it rather
 * than being stranded in a shell nothing else used.
 */
export const WORKSPACE_SHELL_PATHS = new Set([
  "/dashboard",
  "/queries",
  "/queries/analytics",
  "/todo",
  "/todo/today",
  "/todo/calendar",
  "/todo/noteboard",
  "/agents",
  "/agents/discover",
  "/manuscripts",
  "/manuscripts/packages",
  "/manuscripts/comps",
  // Data entry against your own records — it belongs beside the queries it creates.
  "/import",
  "/account", // Settings
  "/plans",   // Plan & billing
  "/help",    // Help centre
]);

/**
 * ⚠️ EMPTY, AND DELIBERATELY KEPT (Amendment 1, G4). The top-nav shell is PARKED, not deleted:
 * `TopNavShell` and its morphing mega-menus are intact and unmounted, held for the public
 * marketing site (showcase, pricing) where they become the logged-out header. Deleting the set
 * would delete the seam it comes back through.
 */
export const TOPNAV_SHELL_PATHS = new Set<string>([]);

export type ShellKind = "workspace" | "topnav";

/**
 * The shell a signed-in route renders in. Marketing routes ("/" and "/pricing") and the pre-auth
 * hashes (sign-in, sign-up, password reset) never reach this — they have no shell at all, which
 * is why they are absent rather than mapped to a third value.
 *
 * `isDev` is injected rather than read from `import.meta.env` so the behaviour is testable in
 * both directions — the whole point of the rule is what it does in each.
 */
export function shellForRoute(path: string, isDev: boolean): ShellKind {
  if (WORKSPACE_SHELL_PATHS.has(path)) return "workspace";
  if (TOPNAV_SHELL_PATHS.has(path)) return "topnav";
  if (isDev) {
    throw new Error(
      `[shellForRoute] "${path}" is in no shell. Add it to WORKSPACE_SHELL_PATHS or ` +
      `TOPNAV_SHELL_PATHS in lib/shellForRoute.ts — and only once the page actually exists. ` +
      `A silent default is how a page ends up in the wrong chrome for a month.`
    );
  }
  // Production: wrong chrome beats a white screen.
  return "workspace";
}
