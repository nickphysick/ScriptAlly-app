/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * workspaceShell — the pure state grammar of the DOUBLE-DECKER shell (shell-rebuild pack, Phase 2;
 * ref design-refs/shell-workspace-doubledecker.html).
 *
 * ⚠️ ONE FILL ON SCREEN AT A TIME (Baked 5). This is the rule the whole file exists to hold, and
 * it is the one most likely to be "simplified" into "the active row gets the fill":
 *
 *   · accordion OPEN  → the active CHILD carries the parchment pill; the parent goes QUIET
 *                       (bold ink, no fill) — it is context, not a destination.
 *   · accordion SHUT  → the fill AND the attention count ROLL UP to the parent, because the
 *                       child that owns them is not on screen to carry them.
 *
 * A parent and its child both filled reads as two selections; a shut section with no count hides
 * the attention that made it worth opening. Both are locked.
 *
 * ⚠️ ACTIVE STATE IS OWNED BY THE ROUTE, never by click. The shell derives what is lit from the
 * pathname and search, so a link, a back button and a click all agree. `openId` is the ONLY piece
 * of local state, because "which section is expanded" genuinely is not in the URL.
 */

/** A child row — always a real destination. A child with no route is a dead link, so there is no
 *  optional path here: absence is expressed by omitting the child. */
export interface ShellChild {
  id: string;
  label: string;
  /** Where it goes, search included (e.g. "/queries?status=attention"). */
  path: string;
  count?: number;
  /** Burgundy dot — attention, not volume. */
  urgent?: boolean;
}

export interface ShellSection {
  id: string;
  label: string;
  /** Childless sections navigate directly; parents fall back to this when nothing else is lit. */
  path?: string;
  children?: ShellChild[];
  /** The child a parent opens onto. Required when `children` is present. */
  def?: string;
  count?: number;
  urgent?: boolean;
}

/** What the route says is lit. `child` is absent for childless sections. */
export interface ShellHit {
  section: string;
  child?: string;
}

/**
 * ⚠️ LONGEST PATH WINS, and the ordering is why. `/agents` is a prefix of `/agents/discover`, so a
 * first-match scan lights the contact list while you are on Discover. Matching is exact on
 * pathname+search first, then exact on pathname, then longest-prefix — never "startsWith, first
 * hit", which is the bug this comment exists to prevent.
 */
export function shellHitFor(
  sections: ShellSection[],
  pathname: string,
  search = "",
): ShellHit | null {
  const full = `${pathname}${search && !search.startsWith("?") ? `?${search}` : search}`;

  // 1. A child whose whole path (including its filter) matches what the browser is showing.
  for (const sec of sections) {
    for (const ch of sec.children ?? []) {
      if (ch.path === full) return { section: sec.id, child: ch.id };
    }
  }
  // 2. A childless section's own exact path.
  for (const sec of sections) {
    if (!sec.children && sec.path === pathname) return { section: sec.id };
  }
  // 3. A child on this pathname, ignoring the filter — the default child of an unfiltered visit.
  for (const sec of sections) {
    const bare = (sec.children ?? []).filter((c) => c.path.split("?")[0] === pathname);
    if (bare.length) {
      const def = bare.find((c) => c.id === sec.def) ?? bare[0];
      return { section: sec.id, child: def.id };
    }
  }
  // 4. Longest matching prefix, so a sub-route lights its own section rather than a shorter one.
  let best: ShellHit | null = null;
  let bestLen = -1;
  for (const sec of sections) {
    const own = sec.path && pathname.startsWith(sec.path) ? sec.path.length : -1;
    if (own > bestLen) { bestLen = own; best = { section: sec.id }; }
    for (const ch of sec.children ?? []) {
      const base = ch.path.split("?")[0];
      if (pathname.startsWith(base) && base.length > bestLen) {
        bestLen = base.length;
        best = { section: sec.id, child: ch.id };
      }
    }
  }
  return best;
}

/** The panel label's treatment. `quiet` is bold ink with NO fill — context, not a destination. */
export type LabelFill = "none" | "pill" | "quiet";

export interface ShellCount {
  n: number;
  urgent: boolean;
}

export interface RowState {
  /** The rail icon cell's rounded square. Lit for the active SECTION in every state. */
  railOn: boolean;
  fill: LabelFill;
  /** Own count, or a child's rolled up while shut. Null when there is nothing to say. */
  count: ShellCount | null;
  open: boolean;
  /** Composed `Section · Child` — the collapsed tooltip (Baked 7). */
  tip: string;
}

/**
 * The whole of Baked 5, in one function.
 *
 * ⚠️ `collapsed` FORCES EVERY SECTION SHUT (Baked 7). The accordion cannot be open in a 52px rail
 * — there is nowhere for a child to render — so the roll-up is what a collapsed parent shows, and
 * the flyout is where its children go. Passing the real `openId` here while collapsed would light
 * a parent quiet with no children beneath it: a row that has given its fill away to nothing.
 */
export function sectionRowState(
  sec: ShellSection,
  hit: ShellHit | null,
  openId: string | null,
  collapsed: boolean,
): RowState {
  const secActive = hit?.section === sec.id;
  const hasKids = !!sec.children?.length;
  const open = !collapsed && hasKids && openId === sec.id;

  const fill: LabelFill = !secActive ? "none" : open ? "quiet" : "pill";

  let count: ShellCount | null = typeof sec.count === "number"
    ? { n: sec.count, urgent: !!sec.urgent }
    : null;
  // THE ROLL-UP: a shut parent speaks for the child that is not on screen to speak for itself.
  if (!count && hasKids && !open) {
    const kid = sec.children!.find((c) => typeof c.count === "number");
    if (kid) count = { n: kid.count!, urgent: !!kid.urgent };
  }

  const child = secActive && hit?.child
    ? sec.children?.find((c) => c.id === hit.child)
    : undefined;

  return {
    railOn: secActive,
    fill,
    count,
    open,
    tip: sec.label + (child ? ` · ${child.label}` : ""),
  };
}

/**
 * The bar's crumb (Baked 13) — `Section · Child`.
 *
 * ⚠️ THE MANUSCRIPT IS DELIBERATELY ABSENT. The shell's selector carries which book you are in,
 * on every page and in every state; repeating it in the crumb gives that fact two homes, and two
 * homes eventually disagree.
 */
export function shellCrumb(
  sections: ShellSection[],
  hit: ShellHit | null,
): { section: string; child?: string } | null {
  if (!hit) return null;
  const sec = sections.find((s) => s.id === hit.section);
  if (!sec) return null;
  const child = hit.child ? sec.children?.find((c) => c.id === hit.child) : undefined;
  return { section: sec.label, child: child?.label };
}

/**
 * What a click on a parent row does.
 *
 * ⚠️ A PARENT IS A DESTINATION AS WELL AS A TOGGLE. Clicking `Queries` opens the accordion AND
 * lands on its default child — an accordion that only expands leaves you looking at a menu when
 * you asked for a page. Re-clicking the section you are already in collapses it (the mockup's
 * behaviour), because at that point the toggle is the only thing left to want.
 */
export interface SectionClick {
  /** The section to expand, or null to shut the accordion. */
  open: string | null;
  /** Where to navigate. Null when the click only toggles. */
  go: string | null;
  /** Collapsed parents with children open a flyout instead of navigating (Baked 7). */
  flyout: boolean;
}

export function sectionClick(
  sec: ShellSection,
  hit: ShellHit | null,
  openId: string | null,
  collapsed: boolean,
): SectionClick {
  const hasKids = !!sec.children?.length;

  if (collapsed && hasKids) return { open: openId, go: null, flyout: true };
  if (!hasKids) return { open: null, go: sec.path ?? null, flyout: false };

  const alreadyHere = hit?.section === sec.id;
  if (alreadyHere && openId === sec.id) return { open: null, go: null, flyout: false };

  const def = sec.children!.find((c) => c.id === sec.def) ?? sec.children![0];
  // Already in the section but shut: reopen without moving off the child you are actually on.
  const go = alreadyHere && hit?.child ? null : def.path;
  return { open: sec.id, go, flyout: false };
}

/** The section that should be open when the route decides for you (arriving, or navigating in). */
export function openForHit(hit: ShellHit | null): string | null {
  return hit?.child ? hit.section : null;
}

/** Baked 8 — the persisted collapse key. Named once so the shell and its locks cannot disagree. */
export const SHELL_COLLAPSED_KEY = "scriptally.shell.collapsed";

export function readCollapsed(store: Pick<Storage, "getItem"> | null | undefined): boolean {
  try {
    return store?.getItem(SHELL_COLLAPSED_KEY) === "1";
  } catch {
    // A locked-down browser must not cost the user their shell.
    return false;
  }
}

export function writeCollapsed(
  store: Pick<Storage, "setItem"> | null | undefined,
  collapsed: boolean,
): void {
  try {
    store?.setItem(SHELL_COLLAPSED_KEY, collapsed ? "1" : "0");
  } catch {
    /* Persistence is a convenience; failing to save it is not worth an error. */
  }
}
