/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Render smokes — Phone app v5, Phase A (the dock, the slim bar, Today as the hub, To do, Materials). See
 * `src/test/pageSmoke.tsx` for why these exist and why they assert almost nothing. The node environment has no
 * matchMedia, so the routes take their desktop path; the phone pieces are smoked directly. The rendered checks
 * (pinning, sizes, reachability) are Phase H's measurement.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderPage, renderPageSeeded } from "../../../test/pageSmoke";

vi.mock("../../../lib/db", async () => (await import("../../../test/pageSmoke")).dbMock());
vi.mock("../../../lib/firebase", async () => (await import("../../../test/pageSmoke")).firebaseMock());
vi.mock("../../toast/ToastProvider", async () => (await import("../../../test/pageSmoke")).toastMock());

import { V5Dock, V5MiniBar, pinPageFor, todoLabel } from "./V5Chrome";
import { pinnedAt } from "./V5Tabs";
import { TodayV5 } from "./TodayV5";
import { TodoV5 } from "./TodoV5";
import { MaterialsV5 } from "./MaterialsV5";
import { V3Provider } from "../v3/V3Provider";

const NOW = Date.parse("2026-11-11T12:00:00Z");
const P = (n: React.ReactNode) => <V3Provider on now={NOW}>{n}</V3Provider>;
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

/* a session that last left Today (or Materials) on a given tab — the only way a static render reaches the other bodies */
const onTab = (v: string) => vi.stubGlobal("window", {
  sessionStorage: { getItem: () => v, setItem: () => {} },
  localStorage: { getItem: () => null, setItem: () => {} },
});
afterEach(() => { vi.unstubAllGlobals(); });

describe("Phone app v5 renders", () => {
  it("the dock reads Today, To do, +, Materials, Profile, in that order", () => {
    const b = renderPage(P(<V5Dock pathname="/dashboard" onGo={() => {}} onPlus={() => {}} scroller={() => null} />));
    const words = text(b);
    const at = ["Today", "To do", "Materials", "Profile"].map((w) => words.indexOf(w));
    expect(at.every((i) => i >= 0), String(at)).toBe(true);
    expect([...at].sort((x, y) => x - y)).toEqual(at);
    expect(b).toContain('data-pa5="dock"');
    expect(b.match(/data-pa5="dock-tab"/g)?.length).toBe(4);
    for (const k of ["today", "todo", "materials", "profile"]) expect(b).toContain(`data-tab="${k}"`);
    /* + sits between To do and Materials */
    expect(b.indexOf('data-pa4="plus"')).toBeGreaterThan(b.indexOf('data-tab="todo"'));
    expect(b.indexOf('data-pa4="plus"')).toBeLessThan(b.indexOf('data-tab="materials"'));
    /* the chosen tab follows the address: a pushed page under Today keeps Today chosen */
    const pushed = renderPage(P(<V5Dock pathname="/queries/all" onGo={() => {}} onPlus={() => {}} scroller={() => null} />));
    expect(pushed).toMatch(/class="on"[^>]*data-tab="today"/);
    const mat = renderPage(P(<V5Dock pathname="/queries/packages" onGo={() => {}} onPlus={() => {}} scroller={() => null} />));
    expect(mat).toMatch(/class="on"[^>]*data-tab="materials"/);
  });
  it("the badge's words, and which roots pin their strip", () => {
    expect(todoLabel(0)).toBe("To do");
    expect(todoLabel(1)).toBe("To do, 1 task");
    expect(todoLabel(7)).toBe("To do, 7 tasks");
    expect(pinPageFor("/dashboard")).toBe("today");
    expect(pinPageFor("/materials")).toBe("materials");
    expect(pinPageFor("/todo")).toBeNull();
    expect(pinPageFor("/you")).toBeNull();
  });
  it("the slim bar: the name and search everywhere, the feedback button only where it is given", () => {
    const today = renderPage(<V5MiniBar title="Today" pathname="/dashboard" scroller={() => null} onSearch={() => {}} onFeedback={() => {}} />);
    expect(today).toContain('data-pa5="mini"');
    expect(today).toContain('data-pa5="feedback-btn"');
    expect(today).toContain('aria-label="Give feedback"');
    expect(today).toContain('aria-label="Search"');
    const todo = renderPage(<V5MiniBar title="To do" pathname="/todo" scroller={() => null} onSearch={() => {}} />);
    expect(todo).not.toContain('data-pa5="feedback-btn"');
    expect(todo).toContain("To do");
  });
  it("the pin rule is the ref's: pinned once the strip's natural top reaches the bar's bottom", () => {
    expect(pinnedAt(200, 64)).toBe(false);
    expect(pinnedAt(64, 64)).toBe(true);
    expect(pinnedAt(-400, 64)).toBe(true);
    expect(pinnedAt(64.4, 64)).toBe(true);
    expect(pinnedAt(65, 64)).toBe(false);
  });
  it("Today: day one when empty; the strip of three tabs and the Queries tab when populated", () => {
    const empty = renderPage(P(<TodayV5 />), "/dashboard");
    expect(empty).toContain("Log your first query");
    expect(empty).toContain('data-state="dayone"');
    expect(empty).toContain('data-pa5="today"');
    const full = renderPageSeeded(P(<TodayV5 />), "/dashboard");
    expect(full).toContain('data-pa5="tabs"');
    expect(full.match(/data-pa5="tab"/g)?.length).toBe(3);
    for (const w of ["Queries", "Agents", "Activity"]) expect(full).toContain(`>${w}</button>`);
    expect(full).toMatch(/aria-selected="true"[^>]*data-pa5="tab" data-tab="queries"/);
    expect(full).toContain("Birds-eye view");
    expect(full).toContain("See all queries");
    expect(full).toContain("Active queries");
    expect(full).toContain('data-pa41="header"');
  });
  it("Today's Agents tab is the Agents page's body; its Activity tab is Lately", () => {
    onTab("agents");
    const agents = renderPageSeeded(P(<TodayV5 />), "/dashboard");
    expect(agents).toContain('data-tab="agents"');
    expect(agents).toContain("Everyone on your list");
    expect(agents).not.toContain('data-pa4="agents-hero"');
    vi.unstubAllGlobals();
    onTab("activity");
    const activity = renderPageSeeded(P(<TodayV5 />), "/dashboard");
    expect(activity).toContain("Lately");
    expect(activity).toContain("See all replies");
  });
  it("To do: the task list, and its empty line", () => {
    const empty = renderPage(P(<TodoV5 />), "/todo");
    expect(empty).toContain('data-pa5="todo"');
    expect(empty).toContain("That’s everything for today.");
    expect(renderPageSeeded(P(<TodoV5 />), "/todo")).toContain('data-pa5="todo"');
  });
  it("Materials: the four tabs, each body the Packages page's own part", () => {
    for (const html of [renderPage(P(<MaterialsV5 />), "/materials"), renderPageSeeded(P(<MaterialsV5 />), "/materials")]) {
      expect(html).toContain('data-pa5="materials"');
      for (const w of ["Packages", "Letters", "Versions", "Comps"]) expect(html).toContain(`>${w}</button>`);
      expect(html).toContain("Your packages");
    }
    for (const [tab, word] of [["letters", "Query letters"], ["versions", "Versions"], ["comps", "Comps"]] as const) {
      onTab(tab);
      const html = renderPageSeeded(P(<MaterialsV5 />), "/materials");
      expect(html, tab).toContain(`data-section="${tab}"`);
      expect(html, tab).toContain(word);
      expect(html, tab).not.toContain("Your packages");
      vi.unstubAllGlobals();
    }
  });
});

/* source locks: what the shell mounts and what the router sends where (facts about imports and order) */
describe("Phone app v5 is what the phone mounts", () => {
  const app = readFileSync(resolve(__dirname, "../../../App.tsx"), "utf8");
  const shell = readFileSync(resolve(__dirname, "../../shell/AppShell.tsx"), "utf8");
  it("the shell mounts the v5 dock and slim bar, and the feedback button on Today only", () => {
    expect(shell).toContain("<V5Dock");
    expect(shell).toContain("<V5MiniBar");
    expect(shell).not.toMatch(/<V4TabBar|<V4MiniBar/);
    expect(shell).toContain('onFeedback={pathname === "/dashboard" ? () => openFeedback() : undefined}');
  });
  it("the router asks phoneV5Redirect before the unknown-path guard, and To do is no longer sent to Today", () => {
    const at = app.indexOf("phoneV5Redirect(path, location.search, location.hash)");
    expect(at).toBeGreaterThan(-1);
    expect(at).toBeLessThan(app.indexOf("if (!WORKSPACE_PATHS.has(routeBase(path))) {"));
    expect(app).not.toContain('routeBase(path) === "/todo") return <Navigate to={`/dashboard');
    expect(app).not.toContain('<Navigate to="/manuscripts#materials" replace />');
    expect(app).toContain("<MaterialsRoute><MaterialsLock page=\"letters\"><QueryLettersPage");
  });
});
