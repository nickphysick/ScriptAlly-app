/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The sidebar's capture button — "Log a query", split (sidebar metrics pass; ref
 * design-refs/shell/sidebar-metrics-states.html). The unit halves of SB1, SB2, SB4 and SB9. The
 * rendered halves — geometry, the menu's keyboard, the rail's portalled flyout, the motion table —
 * are tests/e2e/sidebarCapture.measure.ts, because a source string cannot see a clipped flyout or a
 * transition duration.
 */
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { sliceBetween } from "../../test/sliceBetween";
import { SHORTCUTS } from "../../lib/shortcuts";
import { CAPTURE_FLYOUT_ROWS, CAPTURE_MENU_ROWS, runCaptureRow } from "./SidebarCapture";
import { RAIL_CAPTURES } from "./railNav";

import { SIDEBAR_COLLAPSED_KEY } from "./useSidebarCollapsed";

vi.mock("../../lib/db", async () => (await import("../../test/pageSmoke")).dbMock());
import { WorkspaceShell } from "./WorkspaceShell";

const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const SRC = strip(readFileSync(resolve(__dirname, "SidebarCapture.tsx"), "utf8"));
const CSS = strip(readFileSync(resolve(__dirname, "workspaceShell.css"), "utf8"));

const shell = (collapsed = false) => {
  if (collapsed) localStorage.setItem(SIDEBAR_COLLAPSED_KEY, "1");
  try {
    return renderToStaticMarkup(
      <MemoryRouter initialEntries={["/queries"]}>
        <WorkspaceShell
          sections={[{ id: "workspace", label: "Workspace", def: "dash", children: [{ id: "dash", label: "Dashboard", path: "/dashboard", icon: "dash" }] }]}
          icons={{ dash: <svg /> }}
          onNavigatePath={() => {}}
          onOpenSearch={() => {}}
          onOpenHelp={() => {}}
          onNavigate={() => {}}
        >
          <div>page</div>
        </WorkspaceShell>
      </MemoryRouter>,
    );
  } finally {
    localStorage.removeItem(SIDEBAR_COLLAPSED_KEY);
  }
};

describe("SB1 — one capture control, in the sidebar, between the brand and the nav", () => {
  it("exactly one, after the brand and before the nav; its main segment is named Log a query; the bar holds none", () => {
    const html = shell();
    expect(html.match(/data-shell="capture"/g), "capture controls rendered").toHaveLength(1);
    const brand = html.indexOf('class="ws-brand"');
    const cap = html.indexOf('data-shell="capture"');
    const nav = html.indexOf('<nav class="ws-nav"');
    expect(brand).toBeGreaterThan(-1);
    expect(cap).toBeGreaterThan(brand);
    expect(nav).toBeGreaterThan(cap);
    const capture = sliceBetween(html, 'data-shell="capture"', '<nav class="ws-nav"', "the capture control");
    expect(capture).toMatch(/class="ws-capl"[^>]*>.*Log a query<\/span><\/button>/);
    /* the bar: no capture control, no "+ New" */
    const bar = sliceBetween(html, 'data-probe="navrow"', "</header>", "the bar");
    expect(bar).not.toContain("ws-cap");
    expect(bar).not.toContain("Log a query");
    expect(bar).not.toContain("+ New");
  });
  it("the chevron declares its menu", () => {
    const html = shell();
    expect(html).toMatch(/class="ws-capr" aria-label="More ways to add" aria-haspopup="menu" aria-expanded="false"/);
  });
  it("collapsed, it is one tile with the same accessible name", () => {
    const html = shell(true);
    expect(html.match(/data-shell="capture"/g)).toHaveLength(1);
    expect(html).toMatch(/class="ws-capb ws-captile" aria-label="Log a query" aria-haspopup="menu"/);
    expect(html).not.toContain('class="ws-capl"');
  });
  it("is never called + New — in its file or its rules", () => {
    expect(readFileSync(resolve(__dirname, "SidebarCapture.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "")).not.toContain("+ New");
    expect(CSS).not.toMatch(/\.ws-nbtn|\.ws-newmenu|\.ws-newwrap/);
  });
});

describe("SB2 — every row is an existing contract", () => {
  it("Log a query, Record a response and Add an agent are invokeCapture's contracts; Add a manuscript is the switcher footer's call", () => {
    const calls: [string, string | undefined][] = [];
    const nav = (t: string, s?: string) => { calls.push([t, s]); };
    for (const id of ["query", "record", "agent", "manuscript"] as const) runCaptureRow(id, nav);
    expect(calls).toEqual([
      [RAIL_CAPTURES.query.tab, RAIL_CAPTURES.query.sub],
      [RAIL_CAPTURES.record.tab, RAIL_CAPTURES.record.sub],
      [RAIL_CAPTURES.agent.tab, RAIL_CAPTURES.agent.sub],
      ["manuscripts", "Add a manuscript"],
    ]);
    /* the switcher's footer makes exactly this call — two derivations, one string */
    const shellSrc = readFileSync(resolve(__dirname, "WorkspaceShell.tsx"), "utf8");
    expect(shellSrc).toContain('onAdd={() => onNavigate?.("manuscripts", "Add a manuscript")}');
  });
  it("the menu's rows, in order, and the flyout puts Log a query first", () => {
    expect(CAPTURE_MENU_ROWS.map((r) => r.id)).toEqual(["record", "agent", "manuscript"]);
    expect(CAPTURE_FLYOUT_ROWS.map((r) => r.id)).toEqual(["query", "record", "agent", "manuscript"]);
    expect(CAPTURE_MENU_ROWS.find((r) => r.id === "agent")!.sep, "the hairline sits between Record and Add an agent").toBe(true);
  });
  it("no new path: the file navigates only through invokeCapture and runCaptureRow, and writes nothing", () => {
    const calls = [...SRC.matchAll(/\b(navigate|onNavigate)\(/g)].length;
    /* `navigate(` appears exactly once — inside runCaptureRow's manuscript branch */
    expect(calls).toBe(1);
    expect(SRC).toContain('if (id === "manuscript") navigate("manuscripts", "Add a manuscript");');
    expect(SRC).not.toMatch(/useScriptAllyDb|addQuery|updateQuery|setDoc|addDoc/);
  });
});

describe("SB4 — the eyebrows are ruled (source half; rendered half in the measure)", () => {
  it("each label carries a flex-grown hairline as its own ::after, and margins 20/6", () => {
    expect(CSS).toMatch(/\.ws-glabel::after \{ content: ""; flex: 1; height: 1px; background: var\(--shell-rule\); \}/);
    expect(CSS).toMatch(/\.ws-glabel \{[^}]*margin: 20px 8px 6px;/);
    const html = shell();
    expect(html).toContain('<div class="ws-glabel">Workspace</div>');
  });
});

describe("SB9 — no key opens the menu", () => {
  it("the registry has no entry for it, and `n` is still only Comparable titles' add", () => {
    for (const sc of Object.values(SHORTCUTS)) expect(sc.bound).not.toContain("SidebarCapture");
    const nBound = Object.values(SHORTCUTS).filter((sc) => sc.chords.some((c) => c.key.toLowerCase() === "n"));
    expect(nBound.map((sc) => sc.bound)).toEqual(["src/components/manuscripts/ComparableTitlesPage.tsx"]);
  });
  it("the component binds no global key and advertises none", () => {
    expect(SRC).not.toMatch(/aria-keyshortcuts|matchesShortcut|SHORTCUTS/);
    /* its one document keydown listener answers Escape and nothing else */
    const onKey = sliceBetween(SRC, "const onKey = (e: KeyboardEvent) => {", "};", "the document key handler");
    expect(onKey).toContain('if (e.key !== "Escape"');
    expect(onKey).not.toMatch(/e\.key === "[a-zA-Z]"/);
  });
});
