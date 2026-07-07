/**
 * topCrumb — the workspace breadcrumb model (design ref: design-refs/topstrip-breadcrumbs-v1.html,
 * variant A "crumb only"; the file's other variants are rejected alternatives).
 *
 * Crumbs are PAGE-LEVEL only — a selected query/agent/manuscript never extends the crumb.
 * Every segment except the last navigates through the existing bridge (`tab` feeds
 * handleNavigate); the root goes to the DASHBOARD (inside the workshop, home is the desk —
 * not the marketing landing). The dashboard itself is exempt (its floating top bar already
 * owns that band — stacking a crumb above it would double the chrome), so it maps to null.
 * Pure module: unit-locked in topCrumb.test.ts.
 */

export interface CrumbSegment {
  label: string;
  /** handleNavigate tab for navigable segments; absent = the current page (bold, inert). */
  tab?: string;
  sub?: string;
}

const ROOT: CrumbSegment = { label: "SCRIPTALLY", tab: "dashboard" };

const CRUMB_TABLE: Record<string, CrumbSegment[]> = {
  "/queries": [ROOT, { label: "QUERYING", tab: "queries" }, { label: "QUERIES HUB" }],
  "/agents": [ROOT, { label: "AGENTS", tab: "agents" }, { label: "DATABASE" }],
  "/agents/discover": [ROOT, { label: "AGENTS", tab: "agents" }, { label: "DISCOVER" }],
  "/manuscripts": [ROOT, { label: "MANUSCRIPTS", tab: "manuscripts" }, { label: "YOUR MANUSCRIPTS" }],
  "/manuscripts/comps": [ROOT, { label: "MANUSCRIPTS", tab: "manuscripts" }, { label: "COMPARABLE TITLES" }],
  "/manuscripts/packages": [ROOT, { label: "MANUSCRIPTS", tab: "manuscripts" }, { label: "SUBMISSION PACKAGES" }],
  "/import": [ROOT, { label: "IMPORT" }],
};

/**
 * The crumb for a pathname, or null = render no strip (dashboard exemption, focus/marketing
 * routes, the guarded dev route, unknowns). Query params never affect the crumb — /queries?q=
 * keeps the QUERIES HUB crumb because only the pathname is consulted.
 */
export function crumbForPath(pathname: string): CrumbSegment[] | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  return CRUMB_TABLE[path] ?? null;
}
