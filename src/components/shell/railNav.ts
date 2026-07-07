/**
 * railNav — the rail's grouped index + capture actions as pure data (design refs:
 * design-refs/sidenav-grouped-v5.html structure · sidenav-three-themes-v2.html colour).
 *
 * Kept out of the component so the active-state resolution and the capture → existing-flow
 * contracts are unit-testable (repo convention: pure node tests). The Rail renders from
 * these tables; nothing here touches routing — `tab`/`sub` pairs feed the existing
 * `handleNavigate` bridge, whose interceptions open the existing overlays.
 *
 * Rejection analytics appears in the design refs but is NOT built — deliberately omitted
 * (never render a dead link); the QUERYING group is its future home.
 */

export interface RailNavEntry {
  key: string;
  label: string;
  /** handleNavigate args — the legacy bridge tab (+ optional sub-page). */
  tab: string;
  sub?: string;
  /** The pathname this entry owns (query params never affect activation). */
  path: string;
}

export interface RailGroup {
  /** Mono uppercase eyebrow; null = no eyebrow (Dashboard). Purely visual — no interaction. */
  eyebrow: string | null;
  items: RailNavEntry[];
}

export const RAIL_GROUPS: RailGroup[] = [
  {
    eyebrow: null,
    items: [{ key: "dashboard", label: "Dashboard", tab: "dashboard", path: "/dashboard" }],
  },
  {
    eyebrow: "Querying",
    items: [{ key: "queries-hub", label: "Queries Hub", tab: "queries", path: "/queries" }],
  },
  {
    eyebrow: "Agents",
    items: [
      { key: "agents-db", label: "Agents database", tab: "agents", path: "/agents" },
      { key: "agents-discover", label: "Discover new agents", tab: "agents", sub: "Discover new agents", path: "/agents/discover" },
    ],
  },
  {
    eyebrow: "Manuscripts",
    items: [
      { key: "manuscripts", label: "Your manuscripts", tab: "manuscripts", path: "/manuscripts" },
      { key: "comps", label: "Comparable titles", tab: "manuscripts", sub: "Comparable titles", path: "/manuscripts/comps" },
      { key: "packages", label: "Submission packages", tab: "manuscripts", sub: "Submission packages", path: "/manuscripts/packages" },
    ],
  },
];

/**
 * Which rail entry a pathname lights, or null (focus/marketing/unknown routes light nothing).
 * Exact pathname ownership — `/queries?q=<id>` still lights Queries Hub because params are
 * not part of the pathname; sub-routes light their own entry, never the parent's.
 */
export function railActiveKey(pathname: string): string | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  for (const group of RAIL_GROUPS) {
    for (const item of group.items) {
      if (item.path === path) return item.key;
    }
  }
  return null;
}

/** The three capture actions — each invokes an EXISTING flow via the navigate bridge. */
export const RAIL_CAPTURES = {
  /** Full-width top button — the app-level RecordResponseScreen host's interception. */
  record: { label: "+ Record a response", tab: "queries", sub: "Record a response" },
  /** Compact pair — the existing Log-a-query and Add-an-agent overlay interceptions. */
  query: { label: "+ Query", tab: "queries", sub: "Log a query" },
  agent: { label: "+ Agent", tab: "agents", sub: "Add an agent" },
} as const;

export type RailCaptureKey = keyof typeof RAIL_CAPTURES;

/** Invoke a capture action through the navigate bridge (unit-testable with a spy). */
export function invokeCapture(key: RailCaptureKey, navigate: (tab: string, sub?: string) => void): void {
  const c = RAIL_CAPTURES[key];
  navigate(c.tab, c.sub);
}
