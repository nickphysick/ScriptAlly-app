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

/** Pages you WORK IN — the sage desk, the column, the content capsule. */
export const WORKSPACE_SHELL_PATHS = new Set([
  "/queries",
  "/todo",
  "/agents",
  "/agents/discover",
  "/manuscripts",
  "/manuscripts/packages",
  "/manuscripts/comps",
  // Data entry against your own records — it belongs beside the queries it creates.
  "/import",
]);

/** Pages you READ — the flat warm page, masthead and mega-menus. */
export const TOPNAV_SHELL_PATHS = new Set([
  "/dashboard",
  "/account", // Settings
  "/plans",   // Plan & billing
  "/help",    // Help centre
]);

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
