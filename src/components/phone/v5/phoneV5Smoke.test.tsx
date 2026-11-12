/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Render smokes — Phone app v5, Phase A (the dock, the slim bar, Today as the hub, To do, Materials). See
 * `src/test/pageSmoke.tsx` for why these exist and why they assert almost nothing. The node environment has no
 * matchMedia, so the routes take their desktop path; the phone pieces are smoked directly. The rendered checks
 * (pinning, sizes, reachability) are Phase H's measurement.
 * Phase B: Today's header (TodayHeaderV5) and the Queries tab's Birds-eye block (BirdsBlockV5) — populated, filtered,
 * one row, none.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SMOKE_USER, renderPage, renderPageSeeded, renderPageSeededWith } from "../../../test/pageSmoke";
import { QueryStatus, SubmissionMethod } from "../../../types";

vi.mock("../../../lib/db", async () => (await import("../../../test/pageSmoke")).dbMock());
vi.mock("../../../lib/firebase", async () => (await import("../../../test/pageSmoke")).firebaseMock());
vi.mock("../../toast/ToastProvider", async () => (await import("../../../test/pageSmoke")).toastMock());

import { V5Dock, V5MiniBar, pinPageFor, todoLabel } from "./V5Chrome";
import { pinnedAt } from "./V5Tabs";
import { TodayV5 } from "./TodayV5";
import { TodoV5 } from "./TodoV5";
import { MaterialsV5 } from "./MaterialsV5";
import { V3Provider, useV3Data } from "../v3/V3Provider";
import { TodayHeaderV5 } from "./TodayHeaderV5";
import { BirdsBlockV5 } from "./BirdsBlockV5";
import type { BeCourt } from "../../../lib/phoneV5";

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
    /* Phase B: v5's header and the Birds-eye block on the page (no card, no title); no Up next card on Today */
    expect(full).toContain('data-pa5="today-hd"');
    expect(full).toContain('data-pa5="be"');
    expect(full).not.toContain("Birds-eye view");
    expect(full).not.toContain('data-pa4="up-next"');
    expect(full).not.toContain('data-pa4="quiet"');
    expect(full).toContain("See all queries");
    expect(full).toContain("Active queries");
    expect(full).toContain("of your campaign");
    /* day one: no block, the day-one card */
    expect(empty).not.toContain('data-pa5="be"');
    expect(empty).toContain('data-pa4="dayone"');
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

/* ── Phase B: the header and the Birds-eye block ── */
const DAY = 86_400_000;
const iso = (d: number) => new Date(NOW + d * DAY).toISOString();
/** n open queries to one agent each, sent over the last weeks, their reply dates spread either side of today */
const QS = (n: number) => ({
  agents: Array.from({ length: n }, (_, i) => ({ id: `ag${i}`, userId: SMOKE_USER.id, name: `Agent Number${i}`, agency: `Agency ${i}`, email: "", status: "Active", responseTimeWeeks: 1 + (i % 6) })),
  queries: Array.from({ length: n }, (_, i) => ({
    id: `qq${i}`, userId: SMOKE_USER.id, manuscriptId: "m1", agentId: `ag${i}`, packageId: "", personalisationNotes: "",
    status: i % 4 === 1 ? QueryStatus.PARTIAL_REQUESTED : QueryStatus.QUERIED, dateSent: iso(-10 - i * 3),
    sendMethod: SubmissionMethod.EMAIL, expectedSendDate: iso(-2 + i), materialsWanted: ["Query Letter"],
  })),
});
const Block: React.FC<{ f?: BeCourt | null }> = ({ f = null }) => { const v = useV3Data(); return <BirdsBlockV5 qs={v.qs} c={v.counts} nowMs={v.now} initialFilter={f} />; };
const rowsOf = (html: string) => html.match(/data-pa5="be-row"/g)?.length ?? 0;

describe("Phone app v5, Phase B — Today's header and the Birds-eye block", () => {
  it("the header: Today, the campaign day, feedback and search, the need pill, the figure, the chart and the Mentor", () => {
    const series = [{ endMs: NOW - 14 * DAY, active: 2 }, { endMs: NOW - 7 * DAY, active: 4 }, { endMs: NOW, active: 3 }];
    const html = renderPage(<div className="pa4 pa5"><TodayHeaderV5 day="Day 40 of your campaign" streakWeeks={3} active={3} change={-1} need={7} series={series} dayOne={false}
      onNeed={() => {}} onFeedback={() => {}} onSearch={() => {}} /></div>);
    expect(html).toContain(">Today</h1>");
    expect(html).toContain("Day 40 of your campaign");
    expect(html).toContain('aria-label="Give feedback"');
    expect(html).toContain('data-pa5="feedback-btn"');
    expect(html).toContain('aria-label="Search"');
    expect(html).toMatch(/data-pa5="need" data-n="7"/);
    expect(html).toContain("7 things need you");
    expect(html).toContain('data-pa5="streak"');
    expect(html).toContain("Active queries");
    expect(html).toContain("▼ 1 on last week");
    expect(html).toContain('data-pa5="chart"');
    expect(html).toContain('data-pa5="mentor"');
    /* need before figure (left, then right); nothing at zero */
    expect(html.indexOf('data-pa5="need"')).toBeLessThan(html.indexOf('data-pa5="figure"'));
    const quiet = renderPage(<TodayHeaderV5 day="Day 2 of your campaign" streakWeeks={0} active={1} change={null} need={0} series={series} dayOne={false}
      onNeed={() => {}} onFeedback={() => {}} onSearch={() => {}} />);
    expect(quiet).not.toContain('data-pa5="need"');
    expect(quiet).not.toContain('data-pa5="streak"');
    expect(quiet).not.toContain('data-pa5="change"');
    const one = renderPage(<TodayHeaderV5 day="Getting started" streakWeeks={0} active={0} change={null} need={0} series={[]} dayOne
      onNeed={() => {}} onFeedback={() => {}} onSearch={() => {}} />);
    expect(one).toContain("first query down.");
    expect(one).not.toContain('data-pa5="chart"');
    expect(one).not.toContain('data-pa5="figure"');
  });
  it("the block, populated: three figures, the label, up to eight rows nearest their date, the ruler, the line, the footer", () => {
    const html = renderPageSeededWith(P(<Block />), "/dashboard", QS(11));
    expect(html.match(/data-pa5="be-count"/g)?.length).toBe(3);
    for (const w of ["with you", "with agents", "gone quiet"]) expect(html).toContain(w);
    expect(html).toContain("Nearest their date");
    expect(rowsOf(html)).toBe(8);
    expect(html).toContain('data-pa5="be-pill"');
    expect(html).toContain('data-pa5="be-now"');
    expect(html).not.toContain('data-pa5="be-few"');
    expect(html).toMatch(/All \d+ queries, against their dates/);
    /* every row carries its engine dates; past-date rows carry on (deeper segment) and none draws a ring or a chip */
    const dues = [...html.matchAll(/data-pa5="be-row"[^>]*data-due="(\d*)"/g)].map((m) => (m[1] ? Number(m[1]) : Infinity));
    expect(dues).toEqual([...dues].sort((a, b) => a - b));
    expect(html).toContain('data-past="1"');
    expect(html).toContain('data-pa5="be-deep"');
    expect(html).not.toMatch(/beacon|pa41-bc|pa41-ov/);
    /* the asked rows' current stage is a hollow ring on the mini track */
    expect(html).toContain('data-asked="1"');
    expect(html).toContain('data-pa5="mini-ring"');
    /* surnames, not full names, in the rows */
    expect(html).toContain("<b>Number0</b>");
    expect(html).not.toMatch(/overdue|\blate\b/i);
  });
  it("the block, filtered: the group's rows only, its figure lifted and pressed, Show all, the footer carries the filter", () => {
    const all = renderPageSeededWith(P(<Block />), "/dashboard", QS(11));
    const court = (all.match(/data-pa5="be-row"[^>]*data-court="(you|agent|quiet)"/) ?? [])[1] as BeCourt;
    expect(court).toBeTruthy();
    const html = renderPageSeededWith(P(<Block f={court} />), "/dashboard", QS(11));
    expect(html).toMatch(new RegExp(`aria-pressed="true"[^>]*data-pa5="be-count" data-k="${court}"`));
    expect(html).toContain('data-pa5="be-showall"');
    const courts = [...html.matchAll(/data-pa5="be-row"[^>]*data-court="(\w+)"/g)].map((m) => m[1]);
    expect(courts.length).toBeGreaterThan(0);
    expect(courts.every((k) => k === court)).toBe(true);
    expect(html).toContain(`data-court="${court}"`);
    expect(html).toMatch(/data-pa5="be-foot" data-court="(you|agent|quiet)"/);
  });
  it("the block with one query: one row, the explainer, the singular footer; a zero figure is disabled", () => {
    const html = renderPageSeeded(P(<Block />), "/dashboard");
    expect(rowsOf(html)).toBe(1);
    expect(html).toContain("Each query you log gets a line here. The bar fills as the days pass.");
    expect(html).toContain("Your query, against its date");
    expect(html).toMatch(/disabled=""[^>]*data-pa5="be-count"[^>]*data-n="0"/);
  });
  it("the block with no queries: nothing on Today's Queries tab but the way to the list", () => {
    const html = renderPage(P(<TodayV5 />), "/dashboard");
    expect(html).not.toContain('data-pa5="be"');
    expect(html).not.toContain('data-pa5="be-row"');
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
