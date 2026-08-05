/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * shellColumn — the pure core of the ONE COLUMN (ref design-refs/scriptally-sage-desk.html).
 * The rail and the side panel were two components with their own paddings, which is why
 * alignment kept drifting; this is one column that expands, and the geometry below is the
 * reason it cannot drift again.
 *
 * ⚠️ THE ALIGNMENT CONTRACT. Four tokens expansion never touches — gutter, icon, pitch, kid.
 * On expand ONLY labels, chevrons and children change; ICONS DO NOT MOVE, because the icon's x
 * is `--gutter` in every state by construction, not by two numbers being matched up. If a
 * future change moves an icon between states, the token is being bypassed — that is the bug.
 */

/** The geometry tokens, read from CSS at runtime so there is ONE source, never a JS copy. */
export interface ColumnMetrics {
  gutter: number;
  icon: number;
  kid: number;
  padR: number;
  colMax: number;
}

/** Where the floating selector sits, in px. `radius` and `height` change with the row kind. */
export interface SelectorBox {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
}

/** What the selector is currently marking. `offsetTop` comes from the live row element. */
export type SelectorTarget =
  | { kind: "parent"; offsetTop: number }
  | { kind: "child"; offsetTop: number };

/**
 * THE SELECTOR IS THE ONLY ACTIVE MARKER — no underline, no row fill, no left border, no pill
 * on the icon. That is the trade for a quiet rail, and it is why these four states are the
 * test cases: the marker has to be right in every one of them, because there is nothing else
 * to fall back on.
 *
 *   parent, expanded  → x = gutter,             full width less the right padding, h = icon
 *   child,  expanded  → x = gutter + icon + 1,  shortened to match,                h = kid − 4
 *   parent, collapsed → x = gutter,             width = icon (the icon box alone)
 *   child,  collapsed → IMPOSSIBLE: children are hidden when collapsed, so a child target
 *                       falls back to its parent's box rather than floating over nothing.
 *
 * The +2 on y centres the box in its row (the row is `pitch` tall, the box `icon`); the +1 on
 * the child's x is the mockup's optical nudge, not a rounding artefact.
 */
export function selectorBox(
  target: SelectorTarget,
  collapsed: boolean,
  m: ColumnMetrics
): SelectorBox {
  const isChild = target.kind === "child" && !collapsed;
  if (isChild) {
    const x = m.gutter + m.icon + 1;
    return {
      x,
      y: target.offsetTop + 2,
      width: m.colMax - x - m.padR,
      height: m.kid - 4,
      radius: 9,
    };
  }
  return {
    x: m.gutter,
    y: target.offsetTop + 2,
    // Collapsed, the selector shrinks to the icon box itself — the row's label is gone, so a
    // full-width marker would be marking empty space.
    width: collapsed ? m.icon : m.colMax - m.gutter - m.padR,
    height: m.icon,
    radius: 11,
  };
}

/**
 * ⚠️ THE ICON'S X IS THE SAME IN BOTH STATES, BY CONSTRUCTION. This is the alignment contract
 * expressed as a function: it reads `gutter` and nothing else, so collapsed and expanded cannot
 * disagree. It exists to be asserted — if it ever needs a `collapsed` argument, the contract
 * has already been broken.
 */
export function iconBoxX(m: ColumnMetrics): number {
  return m.gutter;
}

/* ── the navigation model ─────────────────────────────────────────────────── */

export interface ColumnPage {
  key: string;
  label: string;
  path: string;
}

export interface ColumnSection {
  key: "queries" | "agents" | "materials";
  label: string;
  pages: ColumnPage[];
}

/**
 * Sections in the pack's order: Queries · Agents · Materials.
 *
 * ⚠️ ONLY PAGES THAT EXIST ARE LISTED. Baked 4 also names Archive, Query letters, Synopses and
 * Opening samples; **none of them is a route yet**, and Nick's corrected map drops them until
 * they are built. The house rule is that a dead link is never rendered, so they are absent here
 * rather than present and inert — a nav item that goes nowhere teaches the wrong shape of the
 * app. They go in when they exist.
 *
 * `/import` sits under Queries per Nick's note: it is data entry against your own records.
 *
 * NO COUNTS ANYWHERE IN THE COLUMN — counts live on the pages (Baked 4). `useShellNavCounts`
 * went with them.
 */
export const COLUMN_SECTIONS: ColumnSection[] = [
  {
    key: "queries",
    label: "Queries",
    pages: [
      { key: "queries-hub", label: "Queries Hub", path: "/queries" },
      { key: "todo", label: "To-do", path: "/todo" },
      { key: "import", label: "Import", path: "/import" },
    ],
  },
  {
    key: "agents",
    label: "Agents",
    pages: [
      { key: "agents-list", label: "Agent list", path: "/agents" },
      { key: "agents-discover", label: "Discover", path: "/agents/discover" },
    ],
  },
  {
    key: "materials",
    label: "Materials",
    pages: [
      { key: "manuscripts", label: "Manuscripts", path: "/manuscripts" },
      { key: "packages", label: "Submission packages", path: "/manuscripts/packages" },
      { key: "comps", label: "Comparable titles", path: "/manuscripts/comps" },
    ],
  },
];

/** The section a pathname belongs to, and the page within it. Null for anything off the column. */
export function columnHitForPath(
  pathname: string
): { section: ColumnSection; page: ColumnPage } | null {
  for (const section of COLUMN_SECTIONS) {
    for (const page of section.pages) {
      if (page.path === pathname) return { section, page };
    }
  }
  return null;
}

/**
 * CLICKING A SECTION WHILE COLLAPSED EXPANDS THE COLUMN AND OPENS THAT SECTION IN ONE MOVE.
 * This replaces hover flyouts, which are deliberately not built: a flyout is a second surface
 * that has to agree with the panel about everything, and it only exists because the column was
 * hard to open. Making the column easy to open removes the need for it.
 */
export type SectionClickPlan =
  | { kind: "expand-and-open"; section: ColumnSection["key"] }
  | { kind: "open"; section: ColumnSection["key"] }
  | { kind: "close" };

export function sectionClickPlan(
  clicked: ColumnSection["key"],
  collapsed: boolean,
  openSection: ColumnSection["key"] | null
): SectionClickPlan {
  if (collapsed) return { kind: "expand-and-open", section: clicked };
  // Expanded, clicking the section that is already open folds it away; any other switches.
  if (openSection === clicked) return { kind: "close" };
  return { kind: "open", section: clicked };
}
