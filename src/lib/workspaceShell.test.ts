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
  SHELL_COLLAPSED_KEY, ShellSection, openForHit, readCollapsed, sectionClick, sectionRowState,
  shellCrumb, shellHitFor, writeCollapsed,
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
    expect(sectionClick(sec("todo"), null, null, false)).toEqual({ open: null, go: "/todo", flyout: false });
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
    expect(p).toEqual({ open: null, go: null, flyout: false });
  });

  it("collapsed, a parent opens a flyout instead of navigating", () => {
    const p = sectionClick(sec("queries"), null, null, true);
    expect(p.flyout).toBe(true);
    expect(p.go).toBeNull();
  });

  it("collapsed, a CHILDLESS section still just navigates — nothing to fly out", () => {
    expect(sectionClick(sec("todo"), null, null, true)).toEqual({ open: null, go: "/todo", flyout: false });
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
