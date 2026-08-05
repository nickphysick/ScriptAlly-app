/**
 * Locks for the double-decker shell's state grammar (shell-rebuild pack, Phase 2).
 *
 * ⚠️ THE FIXTURES THAT MATTER are the Baked-5 pair — parent quiet while open, fill and count
 * rolled up while shut — and the longest-path rule. Each was a real failure mode before it was a
 * test: two fills read as two selections, a shut section with no count hides the attention that
 * made it worth opening, and a first-match prefix scan lights Contact list while you are on
 * Discover.
 */
import { describe, it, expect } from "vitest";
import {
  PEEK_GRACE_MS, PEEK_INTENT_MS, SHELL_COLLAPSED_KEY, ShellSection, collapseKeyAllowed, openForHit,
  peeksOnHover, railBadge, railClick, readCollapsed, sectionClick, sectionRowState, shellCrumb,
  shellHitFor, writeCollapsed,
} from "./workspaceShell";

const SECTIONS: ShellSection[] = [
  { id: "dashboard", label: "Dashboard", path: "/dashboard" },
  {
    id: "queries",
    label: "Queries",
    def: "q-all",
    children: [
      { id: "q-all", label: "All queries", path: "/queries" },
      { id: "q-att", label: "Needs attention", path: "/queries?status=attention", count: 3, urgent: true },
      { id: "q-await", label: "Awaiting response", path: "/queries?status=awaiting" },
      { id: "q-closed", label: "Closed", path: "/queries?status=closed" },
    ],
  },
  {
    id: "agents",
    label: "Agents",
    def: "a-list",
    children: [
      { id: "a-list", label: "Contact list", path: "/agents" },
      { id: "a-disc", label: "Discover", path: "/agents/discover" },
    ],
  },
  { id: "materials", label: "Materials", path: "/manuscripts/packages" },
  { id: "todo", label: "To-do", path: "/todo", count: 4, urgent: true },
];

const sec = (id: string) => SECTIONS.find((s) => s.id === id)!;

describe("shellHitFor — the route owns what is lit", () => {
  it("lights a childless section on its own path", () => {
    expect(shellHitFor(SECTIONS, "/todo")).toEqual({ section: "todo" });
  });

  it("lights the exact child when the filter is in the URL", () => {
    expect(shellHitFor(SECTIONS, "/queries", "?status=attention"))
      .toEqual({ section: "queries", child: "q-att" });
  });

  it("accepts a search string with or without its leading ?", () => {
    expect(shellHitFor(SECTIONS, "/queries", "status=closed"))
      .toEqual({ section: "queries", child: "q-closed" });
  });

  it("falls to the section's default child on an unfiltered visit", () => {
    expect(shellHitFor(SECTIONS, "/queries")).toEqual({ section: "queries", child: "q-all" });
  });

  /* ⚠️ THE FIXTURE: /agents is a PREFIX of /agents/discover. A first-match prefix scan lights
     Contact list while you are standing on Discover — the exact bug this ordering prevents. */
  it("lights Discover on /agents/discover, NOT the contact list it is prefixed by", () => {
    expect(shellHitFor(SECTIONS, "/agents/discover")).toEqual({ section: "agents", child: "a-disc" });
  });

  it("still lights the contact list on /agents itself", () => {
    expect(shellHitFor(SECTIONS, "/agents")).toEqual({ section: "agents", child: "a-list" });
  });

  it("an unknown filter value falls back to the section rather than lighting nothing", () => {
    expect(shellHitFor(SECTIONS, "/queries", "?status=nonsense")?.section).toBe("queries");
  });
});

describe("Baked 5 — ONE fill on screen at a time", () => {
  const hit = { section: "queries", child: "q-att" };

  /* Two fills read as two selections. The parent is context while its children are on screen. */
  it("accordion OPEN: the parent goes quiet, keeping no fill", () => {
    const r = sectionRowState(sec("queries"), hit, "queries", false);
    expect(r.fill).toBe("quiet");
    expect(r.open).toBe(true);
  });

  it("accordion OPEN: the rail icon stays lit — the section is still where you are", () => {
    expect(sectionRowState(sec("queries"), hit, "queries", false).railOn).toBe(true);
  });

  it("accordion SHUT: the fill rolls UP to the parent", () => {
    expect(sectionRowState(sec("queries"), hit, null, false).fill).toBe("pill");
  });

  /* A shut section with no count hides the very attention that made it worth opening. */
  it("accordion SHUT: the child's attention count rolls up too, dot and all", () => {
    const r = sectionRowState(sec("queries"), hit, null, false);
    expect(r.count).toEqual({ n: 3, urgent: true });
  });

  it("accordion OPEN: the parent does NOT also show the child's count", () => {
    expect(sectionRowState(sec("queries"), hit, "queries", false).count).toBeNull();
  });

  it("an inactive section carries no fill at all", () => {
    expect(sectionRowState(sec("agents"), hit, "queries", false).fill).toBe("none");
    expect(sectionRowState(sec("agents"), hit, "queries", false).railOn).toBe(false);
  });

  it("a childless section with its own count always shows it", () => {
    expect(sectionRowState(sec("todo"), hit, null, false).count).toEqual({ n: 4, urgent: true });
  });

  it("a childless active section takes the pill — it has no children to hand it to", () => {
    expect(sectionRowState(sec("todo"), { section: "todo" }, null, false).fill).toBe("pill");
  });
});

describe("Baked 7 — collapsed forces the accordion shut", () => {
  const hit = { section: "queries", child: "q-att" };

  /* ⚠️ A collapsed parent held open would give its fill away to children that cannot render:
     a quiet row with nothing beneath it. Collapsed always rolls up. */
  it("a collapsed section is never open, even when openId names it", () => {
    const r = sectionRowState(sec("queries"), hit, "queries", true);
    expect(r.open).toBe(false);
    expect(r.fill).toBe("pill");
    expect(r.count).toEqual({ n: 3, urgent: true });
  });

  it("the tooltip composes Section · Child", () => {
    expect(sectionRowState(sec("queries"), hit, "queries", true).tip).toBe("Queries · Needs attention");
  });

  it("a section you are not in tips with its own label alone", () => {
    expect(sectionRowState(sec("agents"), hit, null, true).tip).toBe("Agents");
  });
});

describe("sectionClick — a parent is a destination as well as a toggle", () => {
  it("a childless section navigates and opens nothing", () => {
    expect(sectionClick(sec("todo"), null, null, false)).toEqual({ open: null, go: "/todo", expand: false });
  });

  it("a parent opens the accordion AND lands on its default child", () => {
    const p = sectionClick(sec("queries"), null, null, false);
    expect(p.open).toBe("queries");
    expect(p.go).toBe("/queries");
  });

  /* Reopening from elsewhere in the section must not throw you off the child you are on. */
  it("reopening a section you are already inside does not move you", () => {
    const p = sectionClick(sec("queries"), { section: "queries", child: "q-att" }, null, false);
    expect(p.open).toBe("queries");
    expect(p.go).toBeNull();
  });

  it("clicking the section you are in, while it is open, shuts it", () => {
    const p = sectionClick(sec("queries"), { section: "queries", child: "q-att" }, "queries", false);
    expect(p).toEqual({ open: null, go: null, expand: false });
  });
});

/**
 * ⚠️⚠️ AMENDMENT 1 (E2) — HOVER PEEKS, CLICK COMMITS. This SUPERSEDES the original Baked 7, under
 * which a collapsed parent's click opened a flyout. The two grammars are different products:
 * Slack/Jira click-navigates and STAYS collapsed (collapse as a setting); Notion/Linear commits
 * and RESTORES (collapse as a temporary focus mode). This is the second, and these fixtures are
 * what stop a later pass drifting back to the first.
 */
describe("Amendment 1 — every click expands, and none opens a flyout", () => {
  it("collapsed, a CHILDLESS section expands AND navigates", () => {
    expect(sectionClick(sec("todo"), null, null, true))
      .toEqual({ open: null, go: "/todo", expand: true });
  });

  it("collapsed, a SECTIONED row expands, opens its accordion and lands on the default child", () => {
    expect(sectionClick(sec("queries"), null, null, true))
      .toEqual({ open: "queries", go: "/queries", expand: true });
  });

  /* Moving you off the child you are standing on would be the surprise, not the service. */
  it("collapsed, it keeps the current child when that child belongs to the section", () => {
    const p = sectionClick(sec("queries"), { section: "queries", child: "q-att" }, null, true);
    expect(p.expand).toBe(true);
    expect(p.open).toBe("queries");
    expect(p.go).toBeNull();
  });

  it("collapsed, a child of ANOTHER section does not count as current", () => {
    const p = sectionClick(sec("queries"), { section: "agents", child: "a-disc" }, null, true);
    expect(p.go).toBe("/queries");
  });

  it("expanded clicks never set expand", () => {
    expect(sectionClick(sec("todo"), null, null, false).expand).toBe(false);
    expect(sectionClick(sec("queries"), null, null, false).expand).toBe(false);
  });

  it("no click path returns a flyout — the property is gone entirely", () => {
    const p = sectionClick(sec("queries"), null, null, true);
    expect(Object.keys(p)).toEqual(["open", "go", "expand"]);
  });
});

describe("Amendment 1 (E1) — hover peeks, pointer only", () => {
  it("peeks only when collapsed AND the section has children", () => {
    expect(peeksOnHover(sec("queries"), true)).toBe(true);
    expect(peeksOnHover(sec("queries"), false)).toBe(false);
    expect(peeksOnHover(sec("todo"), true)).toBe(false);
  });

  it("carries the specced timings", () => {
    expect(PEEK_INTENT_MS).toBe(120);
    expect(PEEK_GRACE_MS).toBe(160);
  });
});

/* ⚠️ `[` IS A CHARACTER. A bare-key shortcut that fires inside a field eats the keystroke and
   reads as the app dropping input — so it is suppressed while typing, and the palette counts as
   typing because it is a text field wearing a dialog. */
describe("Amendment 1 (E5) — `[` toggles, except while typing", () => {
  it("acts on ordinary focus", () => {
    expect(collapseKeyAllowed("BUTTON", false, false)).toBe(true);
    expect(collapseKeyAllowed("DIV", false, false)).toBe(true);
    expect(collapseKeyAllowed(null, false, false)).toBe(true);
  });

  it("is suppressed in every editable target", () => {
    expect(collapseKeyAllowed("INPUT", false, false)).toBe(false);
    expect(collapseKeyAllowed("TEXTAREA", false, false)).toBe(false);
    expect(collapseKeyAllowed("SELECT", false, false)).toBe(false);
    expect(collapseKeyAllowed("DIV", true, false)).toBe(false);
  });

  it("is suppressed while the palette is open", () => {
    expect(collapseKeyAllowed("BUTTON", false, true)).toBe(false);
  });

  it("is case-insensitive about the tag name", () => {
    expect(collapseKeyAllowed("input", false, false)).toBe(false);
  });
});

describe("shellCrumb — Section · Child, and never the manuscript", () => {
  it("reads Section · Child", () => {
    expect(shellCrumb(SECTIONS, { section: "queries", child: "q-att" }))
      .toEqual({ section: "Queries", child: "Needs attention" });
  });

  it("a childless section has no child segment", () => {
    expect(shellCrumb(SECTIONS, { section: "todo" })).toEqual({ section: "To-do", child: undefined });
  });

  it("is null when nothing is lit", () => {
    expect(shellCrumb(SECTIONS, null)).toBeNull();
  });
});

describe("openForHit — arriving by route expands the section you land in", () => {
  it("expands a section reached at one of its children", () => {
    expect(openForHit({ section: "queries", child: "q-att" })).toBe("queries");
  });

  it("expands nothing for a childless section", () => {
    expect(openForHit({ section: "todo" })).toBeNull();
  });
});

describe("Baked 8 — collapse persists, and a locked-down browser never costs the shell", () => {
  it("the key is the baked one", () => {
    expect(SHELL_COLLAPSED_KEY).toBe("scriptally.shell.collapsed");
  });

  it("round-trips", () => {
    const bag: Record<string, string> = {};
    const store = {
      getItem: (k: string) => bag[k] ?? null,
      setItem: (k: string, v: string) => { bag[k] = v; },
    };
    expect(readCollapsed(store)).toBe(false);
    writeCollapsed(store, true);
    expect(readCollapsed(store)).toBe(true);
    writeCollapsed(store, false);
    expect(readCollapsed(store)).toBe(false);
  });

  /* Safari in private mode throws on setItem. The shell must open anyway. */
  it("survives a storage that throws, in both directions", () => {
    const hostile = {
      getItem: () => { throw new Error("denied"); },
      setItem: () => { throw new Error("denied"); },
    };
    expect(readCollapsed(hostile)).toBe(false);
    expect(() => writeCollapsed(hostile, true)).not.toThrow();
  });

  it("survives no storage at all (SSR)", () => {
    expect(readCollapsed(null)).toBe(false);
    expect(() => writeCollapsed(null, true)).not.toThrow();
  });
});

/**
 * ⚠️ AMENDMENT 1 (B) — THE RAIL IS A SET OF DESTINATIONS, NOT DISCLOSURE CONTROLS. It never
 * toggles a section shut: an icon that sometimes navigated and sometimes closed the thing you
 * were looking at would be two controls wearing one glyph. That is the ONE way rail and panel
 * clicks differ, and it is what these fixtures hold.
 */
describe("railClick — always lands, never toggles shut", () => {
  it("expanded, it opens the section and goes to the default child", () => {
    expect(railClick(sec("queries"), null, false))
      .toEqual({ open: "queries", go: "/queries", expand: false });
  });

  /* THE fixture: the panel row shuts here; the rail must not. */
  it("does NOT shut a section you are already in with its accordion open", () => {
    const hit = { section: "queries", child: "q-att" };
    expect(sectionClick(sec("queries"), hit, "queries", false).open).toBeNull();
    expect(railClick(sec("queries"), hit, false).open).toBe("queries");
  });

  it("keeps the child you are on when it belongs to the section", () => {
    const p = railClick(sec("queries"), { section: "queries", child: "q-att" }, false);
    expect(p.go).toBeNull();
  });

  it("collapsed, it also expands", () => {
    expect(railClick(sec("queries"), null, true).expand).toBe(true);
    expect(railClick(sec("todo"), null, true))
      .toEqual({ open: null, go: "/todo", expand: true });
  });

  it("a childless section navigates and opens nothing", () => {
    expect(railClick(sec("todo"), null, false))
      .toEqual({ open: null, go: "/todo", expand: false });
  });
});

/* ⚠️ A DOT, NOT A NUMBER — 52px has no room for a legible figure, and a badge on every section
   that merely HAS items would make the rail a count display rather than an alert. */
describe("railBadge — attention only", () => {
  it("badges a section with its own urgent count", () => {
    expect(railBadge(sec("todo"))).toBe(true);
  });

  it("badges a section whose child carries an urgent count", () => {
    expect(railBadge(sec("queries"))).toBe(true); // this fixture still has one
  });

  it("does not badge a section with no counts at all", () => {
    expect(railBadge(sec("agents"))).toBe(false);
    expect(railBadge(sec("dashboard"))).toBe(false);
  });

  it("does not badge a ZERO count", () => {
    expect(railBadge({ id: "x", label: "X", count: 0, urgent: true })).toBe(false);
  });

  /* A count without urgency is a quantity, not a demand. */
  it("does not badge a count that is not urgent", () => {
    expect(railBadge({ id: "x", label: "X", count: 9 })).toBe(false);
  });
});
