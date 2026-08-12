/**
 * Route-tier model — every route belongs to exactly one tier, and each tier owns its chrome.
 *
 *   marketing  — public shop window: "/" (landing) + "/pricing". MarketingShell chrome.
 *                Rendered for EVERYONE — a signed-in user is never auto-redirected off "/".
 *   workspace  — EVERYTHING signed-in, in the ONE capsule shell (capsule fixes P5: the focus
 *                tier is retired — /account, /plans and /help are workspace routes now; the
 *                shell census is capsule · marketing · onboarding-outside, nothing else).
 *
 * Pure module: no React, no Firebase — App.tsx branches on tierForPath, and the tests lock
 * the resolution table.
 */

// ⚠️ "/pricing" IS TEMPORARILY OUT. The page that rendered there was a developer sandbox on a
// public route; it is deleted, and a real public pricing page returns in phase 5, at which point
// this set gains "/pricing" back. TODO(phase-5).
export const MARKETING_PATHS = new Set(["/"]);

/** The workspace route set — the capsule-shell tier (every authenticated route). */
export const WORKSPACE_PATHS = new Set([
  /* ⚠️ `/queries/analytics` BELONGS HERE, AND ITS ABSENCE WAS A LIVE DEAD LINK. The sidebar links
     to it (`workspaceNav.ts`), `shellForRoute` maps it and `App.tsx` renders it — but an
     unregistered path falls through to `<Navigate to="/dashboard">` a few lines below, so
     clicking Analytics silently went home. Four surfaces agreed the page existed; this one set
     decided it did not, and it is the one the router asks. Found by the acceptance matrix, which
     reported "no visible .wpg" on a page that renders one. */
  "/dashboard", "/queries", "/queries/analytics",
  // The To-do WORKSPACE — four pages, one section (workspace pack P1).
  "/todo", "/todo/calendar", "/todo/noteboard",
  "/agents", "/agents/discover",
  "/manuscripts", "/manuscripts/comps", "/manuscripts/packages", "/import",
  "/account", "/plans", "/help",
]);

export type RouteTier = "marketing" | "workspace" | null;

/** Resolve a (trailing-slash-normalised) pathname to its tier; null = unknown → dashboard. */
export function tierForPath(path: string): RouteTier {
  if (MARKETING_PATHS.has(path)) return "marketing";
  if (WORKSPACE_PATHS.has(path)) return "workspace";
  return null;
}
