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
import { ACCOUNT_SECTION_PATHS } from "../lib/accountRoutes";

/**
 * ⚠️ /terms AND /privacy ARE ROUTES, NOT FILES, AND THAT IS FORCED. Both hosting configs rewrite
 * `**` to `/index.html`, so a static legal page at those paths would be served the SPA instead.
 * The sign-up screen linked to them for a long time while they could not exist.
 */
export const MARKETING_PATHS = new Set(["/", "/pricing", "/about", "/contact", "/terms", "/privacy"]);

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
  /* The settings SECTIONS are real routes (`/account/profile`, …) — spread from the one table so
     a new section cannot be added without being registered here. `/account` itself stays listed
     above: it must survive this check for App.tsx's redirect to it run at all. */
  ...ACCOUNT_SECTION_PATHS,
]);

export type RouteTier = "marketing" | "workspace" | null;

/** Resolve a (trailing-slash-normalised) pathname to its tier; null = unknown → dashboard. */
export function tierForPath(path: string): RouteTier {
  if (MARKETING_PATHS.has(path)) return "marketing";
  if (WORKSPACE_PATHS.has(path)) return "workspace";
  return null;
}
