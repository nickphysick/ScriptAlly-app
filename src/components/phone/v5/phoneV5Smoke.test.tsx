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
 * Phase E: the full Birds-eye view (BirdsViewV5) — populated, filtered, landscape; and the list's switch into it.
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
import { AgentsTabV5 } from "./AgentsTabV5";
import { GapsSheetV5 } from "./GapsSheetV5";
import { BirdsViewV5 } from "./BirdsViewV5";
import { QueriesV4 } from "../v4/QueriesV4";

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
  it("Today's Agents tab is v5's (Phase C); its Activity tab is Lately only", () => {
    onTab("agents");
    const agents = renderPageSeeded(P(<TodayV5 />), "/dashboard");
    expect(agents).toContain('data-tab="agents"');
    expect(agents).toContain('data-pa5="agents-tab"');
    expect(agents).not.toContain('data-pa4="agents-hero"');
    vi.unstubAllGlobals();
    onTab("activity");
    const activity = renderPageSeeded(P(<TodayV5 />), "/dashboard");
    expect(activity).toContain("Lately");
    expect(activity).toContain("See all replies");
    expect(activity).not.toContain('data-pa4="founding"');
  });
  it("To do: the Up next card, and its empty line (Phase D's own smokes are below)", () => {
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

/* ── Phase C: Today's Agents tab, List health and the gap-filling sheet ── */
/** an agent with every Housekeeping detail on file (no gap of any kind) */
const FULL_AGENT = {
  id: "a1", userId: SMOKE_USER.id, name: "Ada Reader", agency: "Reader & Co", email: "ada@example.com", website: "https://example.com",
  country: "GB", city: "London", genres: ["Literary Fiction"], mswlNotes: "Quiet literary novels with a strong sense of place.", starRating: 4,
  submissionStatus: "Open", submissionMethod: SubmissionMethod.EMAIL, responseTimeWeeks: 8, materialsWanted: ["Query Letter"],
  dateAdded: "2026-01-02T00:00:00.000Z", lastCheckedDate: "2026-01-02T00:00:00.000Z",
};

describe("Phone app v5, Phase C — the Agents tab and filling the gaps", () => {
  it("populated: the summary (three figures that add up to the list), List health with its groups, Next to query, See all, Discover", () => {
    const html = renderPageSeeded(P(<div className="pa4 pa5"><AgentsTabV5 /></div>), "/dashboard");
    expect(html).toContain('data-pa5="agents-summary"');
    const counts = [...html.matchAll(/data-pa5="ag-count" data-k="(\w+)" data-n="(\d+)"/g)].map((m) => [m[1], Number(m[2])] as const);
    expect(counts.map((c) => c[0])).toEqual(["toquery", "querying", "closed"]);
    expect(counts.reduce((n, c) => n + c[1], 0)).toBe(1);
    for (const w of ["to query", "querying", "closed"]) expect(html).toContain(w);
    expect(html).toContain("1 agent on your list");
    /* the seed's agent has no wishlist: one gap, so List health shows, with its ring and the one group that has a gap */
    expect(html).toMatch(/data-pa5="health"[^>]*data-gaps="1" data-agents="1"/);
    expect(html).toContain('data-pa5="health-ring"');
    expect(html).toContain("1 gap across 1 agent");
    expect(html).toMatch(/data-pa5="gap-group" data-group="matches" data-n="1"/);
    expect(html).toContain("Know who fits your book");
    expect(html).not.toContain('data-group="dates"');
    expect(html).toContain('data-pa5="fill-gaps"');
    expect(html).toContain("Fill in the gaps");
    /* the seed's agent is queried, so Next to query is v4's "everyone has a query" card */
    expect(html).toContain('data-pa5="best-fit"');
    expect(html).toContain("Everyone on your list has a query");
    expect(html).toContain('data-pa5="see-all-agents"');
    expect(html).toContain("See all 1 agent");
    expect(html).toContain('data-pa5="discover-row"');
    /* the order: Summary → List health → Next to query → See all → Discover */
    const at = ['data-pa5="agents-summary"', 'data-pa5="health"', 'data-pa5="best-fit"', 'data-pa5="see-all-agents"', 'data-pa5="discover-row"'].map((k) => html.indexOf(k));
    expect([...at].sort((x, y) => x - y)).toEqual(at);
    /* nothing of AgentsV4's old bare body is here */
    for (const k of ['data-pa4="shelf"', 'data-pa4="waiting"', 'data-pa4="everyone"', 'data-pa4="agents-line"']) expect(html).not.toContain(k);
    expect(html).not.toMatch(/overdue|\blate\b/i);
  });
  it("an agent not yet queried is the best fit, under Next to query", () => {
    const html = renderPageSeededWith(P(<div className="pa4 pa5"><AgentsTabV5 /></div>), "/dashboard", { queries: [] });
    expect(html).toContain("Next to query");
    expect(html).toContain('data-pa4="fit-log"');
    expect(html).toMatch(/data-pa5="ag-count" data-k="toquery" data-n="1"/);
    expect(html).toMatch(/disabled=""[^>]*data-pa5="ag-count" data-k="closed" data-n="0"/);
  });
  it("at 100% with no gaps, List health is not there", () => {
    const html = renderPageSeededWith(P(<div className="pa4 pa5"><AgentsTabV5 /></div>), "/dashboard", { agents: [FULL_AGENT] });
    expect(html).toContain('data-pa5="agents-summary"');
    expect(html).not.toContain('data-pa5="health"');
    expect(html).not.toContain('data-pa5="fill-gaps"');
    expect(html).toContain('data-pa5="best-fit"');
  });
  it("the sheet: the ring, 'n of N' and the strip, the agent, the gap's own copy, the drawer's control and the three buttons", () => {
    const html = renderPageSeeded(P(<GapsSheetV5 group={null} />), "/dashboard");
    expect(html).toMatch(/data-pa5="gaps-sheet" data-i="1" data-total="1"/);
    expect(html).toContain("Filling the gaps · 1 of 1");
    expect(html).toContain('data-pa5="health-ring"');
    expect(html.match(/<i class="cur"/g)?.length).toBe(1);
    expect(html).toMatch(/data-pa5="gap-card" data-agent="a1" data-kind="wishlist"/);
    expect(html).toContain("Ada Reader");
    expect(html).toMatch(/Reader &amp; Co · queried \d+ months? ago/);
    expect(html).toContain("What Ada is hoping to find");
    expect(html).toContain("Where to find it");
    expect(html).toContain('data-hk8="wish"');
    expect(html).toContain('aria-label="Close"');
    for (const [k, w] of [["gap-save", "Save and next"], ["gap-later", "Ask me later"], ["gap-skip", "Skip"]]) {
      expect(html).toContain(`data-pa5="${k}"`);
      expect(html).toContain(w);
    }
    /* nothing is answered yet, so Save waits */
    expect(html).toContain('data-pa5="gap-save" disabled=""');
    expect(html).not.toMatch(/overdue|\blate\b/i);
  });
  it("the sheet with nothing to fill: the plain finished state and Done", () => {
    const html = renderPageSeededWith(P(<GapsSheetV5 group="dates" />), "/dashboard", { agents: [FULL_AGENT] });
    expect(html).toMatch(/data-pa5="gaps-sheet"[^>]*data-total="0" data-done="1"/);
    expect(html).toContain("That’s every gap for now.");
    expect(html).toContain('data-pa5="gaps-doneb"');
  });
});

/* source locks: Housekeeping's fix handlers live in ONE hook, called by the Contact list and the phone's sheet */
describe("Housekeeping's fix handlers are one shared hook (Nick, 12 Nov)", () => {
  const read = (p: string) => readFileSync(resolve(__dirname, p), "utf8");
  const list = read("../../agents/AgentList.tsx");
  const hook = read("../../agents/contact/useHkFixes.ts");
  const phone = read("./usePhoneHk.ts");
  const sheet = read("./GapsSheetV5.tsx");
  it("AgentList and the phone both call useHkFixes", () => {
    expect(list).toContain('import { useHkFixes } from "./contact/useHkFixes";');
    expect(list).toMatch(/= useHkFixes\(\{/);
    expect(phone).toContain('import { useHkFixes } from "../../agents/contact/useHkFixes";');
    expect(phone).toMatch(/= useHkFixes\(\{/);
    /* the sheet's writes are the hook's: its save, its Later */
    expect(sheet).toContain("fixes.onHkFix(cur, answer)");
    expect(sheet).toContain("fixes.onLater(cur)");
  });
  it("AgentList no longer defines the handlers inline; the hook holds them", () => {
    for (const k of ["const writeFix = useCallback", "const onHkFix = useCallback", "const onWishlistStill = useCallback", "laterPath(item.agent.id", "showAllPath()", "commitCardSave("]) {
      expect(list, k).not.toContain(k);
    }
    for (const k of ["const writeFix = useCallback", "const onHkFix = useCallback", "const onWishlistStill = useCallback", "laterPath(item.agent.id, item.gap, hkToday)", "showAllPath()", "commitCardSave({ uid: currentUser.id, agent, queries, patch, resolveTaskFlag })"]) {
      expect(hook, k).toContain(k);
    }
    expect(list).toContain("onFix={onHkFixGuided}");
    expect(list).toContain("onLater={onHkLater}");
    expect(list).toContain("onShowAll={onHkShowAll}");
    expect(list).toContain("onWishlistStill={onWishlistStill}");
  });
  it("the phone writes nothing itself: no writer is called from the Agents tab or the sheet", () => {
    for (const src of [sheet, read("./AgentsTabV5.tsx")]) {
      expect(src).not.toMatch(/updateUserPaths\(|commitCardSave|commitAgentEdits|addUserTask\(|updateAgent\(/);
    }
  });
  it("the founding writer card left Today for Profile", () => {
    expect(read("./TodayV5.tsx")).not.toContain("FoundingCard");
    expect(read("../v4/YouV4.tsx")).toContain("<FoundingCardV5 uid={currentUser?.id ?? null} />");
  });
});

/* ── Phase D — To do: the Up next card ── */
const TD = (id: string, text: string, due: string, done = false) => ({
  id, userId: SMOKE_USER.id, text, done, dueDate: due, createdAt: iso(-5), updatedAt: iso(-1), ...(done ? { completedAt: iso(0) } : {}),
});
const ownTasks = (n: number) => ({
  userTasks: [TD("u1", "Read the contract", "2026-11-05"), TD("u2", "Ring the bank", "2026-11-11"), TD("u3", "Print the pages", "2026-11-10"), TD("u4", "Check the address", "2026-11-09")]
    .slice(0, n).concat([TD("u9", "Post the letter", "2026-11-10", true)]),
});
describe("Phone app v5, Phase D — To do", () => {
  it("populated: the header, one card with its fill, chips, line, verb and Not now, the edges, Then and Done today", () => {
    const html = renderPageSeededWith(P(<TodoV5 />), "/todo", ownTasks(4));
    expect(html).toMatch(/data-pa5="todo" data-n="4" data-done="1"/);
    expect(html).toContain(">To do</h1>");
    expect(html).toContain("4 things need you · 1 done today");
    expect(html).toContain('aria-label="Search"');
    expect(html.match(/data-pa5="todo-card"/g)?.length).toBe(1);
    expect(html).toMatch(/data-pa5="todo-card" data-key="[^"]+" data-i="1" data-total="4"/);
    expect(html).toContain("1 of 4");
    expect(html).toContain('data-pa5="todo-fill"');
    expect(html).toContain('data-pa5="todo-chips"');
    expect(html).toContain("Was due 5 Nov");
    expect(html).toContain('data-pa5="todo-verb"');
    expect(html).toContain(">Mark done</button>");
    expect(html).toContain('data-pa5="todo-later"');
    expect(html).toContain("Not now, show the next one");
    expect(html).toContain(">Later</span>");
    expect(html).toContain(">Do it</span>");
    expect(html.match(/data-pa5="todo-edge"/g)?.length).toBe(2);
    expect(html).toContain(">Then</h2>");
    expect(html.match(/data-pa5="todo-then-row"/g)?.length).toBe(3);
    expect(html).toContain(">Done today</h2>");
    expect(html.match(/data-pa5="todo-done-row"/g)?.length).toBe(1);
    expect(html).toContain("<s class=\"pa4-b\">Post the letter</s>");
    expect(html).not.toContain('data-pa5="todo-empty"');
    expect(html).not.toContain('data-pa5="todo-stamp"');
    expect(text(html)).not.toMatch(/overdue|\blate\b/i);
  });
  it("one task: the card, no edges, no Then", () => {
    const html = renderPageSeededWith(P(<TodoV5 />), "/todo", { userTasks: [TD("u2", "Ring the bank", "2026-11-11")] });
    expect(html).toContain("1 thing needs you");
    expect(html).not.toContain("done today");
    expect(html.match(/data-pa5="todo-card"/g)?.length).toBe(1);
    expect(html).toContain('data-total="1"');
    expect(html).not.toContain('data-pa5="todo-edge"');
    expect(html).not.toContain('data-pa5="todo-then-row"');
    expect(html).not.toContain('data-pa5="todo-done-row"');
  });
  it("empty: that's everything for today, and Done today still shows", () => {
    const html = renderPageSeededWith(P(<TodoV5 />), "/todo", ownTasks(0));
    expect(html).toContain('data-pa5="todo-empty"');
    expect(html).toContain("That’s everything for today.");
    expect(html).toContain("Nothing needs you · 1 done today");
    expect(html).not.toContain('data-pa5="todo-card"');
    expect(html.match(/data-pa5="todo-done-row"/g)?.length).toBe(1);
  });
  it("the card's button and its right swipe call the same open function; nothing on the page writes", () => {
    const src = readFileSync(resolve(__dirname, "./TodoV5.tsx"), "utf8");
    /* the button */
    expect(src).toMatch(/data-pa5="todo-verb"[^>]*onClick=\{tap\(openJourney\)\}/);
    /* the swipe: a right commit calls the same function, and nothing else opens the card's journey */
    expect(src).toContain('if (out === "do") openJourney();');
    expect(src.match(/openJourney\(\)/g)?.length).toBe(1);
    expect(src.match(/openTask\(top\.t, true\)/g)?.length).toBe(1);
    /* the journey is the existing one, with the save and the cancel told apart by PhoneTaskScreen's own callbacks */
    expect(src).toContain("<PhoneTaskScreen core={core} tasks={deck} startKey={opened.t.key} now={now} onClose={onClose} onDid={onDid} />");
    /* no writer is imported, and none is called */
    const imports = src.match(/^import[^;]+;/gm) ?? [];
    for (const i of imports) expect(i).not.toMatch(/lib\/db|firebase|recomputeQuery|queryActions|drawerStore|useWsCore|wsFlows|taskFlags|Write|update|add|delete/i);
    /* the code, without its comments (the header names the snackbar it relies on) */
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    expect(code).not.toMatch(/core\.(snoozeTask|dismissWrite|ownDoneWrite|makeFlow|bringBackWrite|db)\b/);
    expect(code).not.toMatch(/showUndoBar|updateUserTask|upsertTaskFlag|setDoc|updateDoc|addDoc|deleteDoc/);
    expect(code).toContain("onDid={onDid}");
  });
});

/* ── Phase E: the full Birds-eye view (BirdsViewV5) ── */
const View: React.FC<{ court?: BeCourt | null }> = ({ court = null }) => <BirdsViewV5 switcher={<i data-t="sw" />} corner={<i data-t="corner" />} court={court} onShowAll={() => {}} />;
const vrows = (html: string) => html.match(/data-pa5="bv-row"/g)?.length ?? 0;
/* a phone with storage that remembers, held upright or on its side */
const phone = (w: number, h: number, store: Record<string, string> = {}) => vi.stubGlobal("window", {
  innerWidth: w, innerHeight: h,
  sessionStorage: { getItem: () => null, setItem: () => {} },
  localStorage: { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; } },
  matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
});

describe("Phone app v5, Phase E — the full Birds-eye view", () => {
  it("populated: the switch and search only in the header, the spans opening on 3 months, the ruler's pill, groups that fold at five", () => {
    const html = renderPageSeededWith(P(<View />), "/queries/all", QS(14));
    expect(html).toContain('data-pa5="birds-view"');
    expect(html).toContain('data-span="3m"');
    /* the header holds what it is given (the switch, search) and nothing of v4.1's: no title, no live/past sentence, no art */
    const head = html.slice(html.indexOf('data-pa5="bv-head"'), html.indexOf("</header>"));
    expect(head).toContain('data-t="sw"');
    expect(head).toContain('data-t="corner"');
    expect(head).not.toMatch(/<h1|<img|live quer/);
    expect(html).not.toContain("Birds-eye view</h1>");
    /* the spans: three, 3 months pressed; v4.1's zoom chips are gone */
    expect(html.match(/data-pa5="bv-span"/g)?.length).toBe(3);
    for (const w of ["1 month", "3 months", "6 months"]) expect(html).toContain(w);
    expect(html).toMatch(/aria-pressed="true" data-pa5="bv-span" data-k="3m"|data-pa5="bv-span" data-k="3m" aria-pressed="true"/);
    expect(html).not.toContain("6 weeks");
    /* the ruler, the pill and the line; every row carries its engine dates and court */
    for (const k of ["bv-track", "bv-today", "bv-now", "bv-names"]) expect(html).toContain(`data-pa5="${k}"`);
    expect(html).toMatch(/data-pa5="bv-row" data-pa41="vrow" data-id="qq\d+" data-court="(you|agent|quiet)" data-from="\d+" data-due="\d*" data-past="[01]"/);
    /* groups: the first is the phone's "Past its date"; a heading carries its count; one over five folds */
    expect(html).toContain("Past its date");
    const groups = [...html.matchAll(/data-pa5="bv-group" data-k="(\w+)" data-n="(\d+)"/g)].map((m) => [m[1], Number(m[2])] as const);
    expect(groups.length).toBeGreaterThan(0);
    expect(groups.reduce((a, g) => a + g[1], 0)).toBe(14);
    const folds = [...html.matchAll(/data-pa5="bv-fold" data-n="(\d+)"/g)].map((m) => Number(m[1]));
    expect(folds.length).toBe(groups.filter((g) => g[1] > 5).length);
    expect(folds.length).toBeGreaterThan(0);
    expect(vrows(html)).toBe(groups.reduce((a, g) => a + Math.min(5, g[1]), 0));
    for (const n of folds) expect(html).toContain(`Show ${n} more`);
    /* past its date: the bar carries on (the deeper segment) — no beacon, no overrun line, no text in a bar */
    expect(html).toContain('data-past="1"');
    expect(html).toContain('data-pa5="bv-deep"');
    expect(html).toContain('data-pa5="bv-notch"');
    expect(html).not.toMatch(/beacon|pa41v-bc|pa41v-ov|pa41v-lb|data-lb=/);
    /* the name column: the mini track and the surname, outside the moving track */
    expect(html).toMatch(/data-pa5="bv-names"><svg class="pa5-mt"[\s\S]*?<b>Number\d+<\/b><\/span><span class="pa5bv-trk"/);
    expect(html.replace(/<[^>]+>/g, " ")).not.toMatch(/overdue|\blate\b/i);
    /* nothing filtered, so no "Show all" */
    expect(html).not.toContain('data-pa5="bv-showall"');
  });
  it("filtered from Today: only that group's queries, the filter named, and Show all", () => {
    const all = renderPageSeededWith(P(<View />), "/queries/all", QS(14));
    const court = (all.match(/data-pa5="bv-row"[^>]*data-court="(you|agent|quiet)"/) ?? [])[1] as BeCourt;
    expect(court).toBeTruthy();
    const html = renderPageSeededWith(P(<View court={court} />), "/queries/all", QS(14));
    expect(html).toContain(`data-court="${court}"`);
    expect(html).toContain('data-pa5="bv-filter"');
    expect(html).toContain('data-pa5="bv-showall"');
    const courts = [...html.matchAll(/data-pa5="bv-row"[^>]*data-court="(\w+)"/g)].map((m) => m[1]);
    expect(courts.length).toBeGreaterThan(0);
    expect(courts.every((k) => k === court)).toBe(true);
    const n = Number((html.match(/data-pa5="birds-view"[^>]*data-n="(\d+)"/) ?? [])[1]);
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThan(14);
  });
  it("the last span chosen is what it opens on", () => {
    phone(390, 844, { "pa5.birds-view.span": "6m" });
    expect(renderPageSeededWith(P(<View />), "/queries/all", QS(6))).toContain('data-span="6m"');
  });
  it("landscape: the land class, the spans in the header row, the full name in the column", () => {
    phone(740, 360);
    const html = renderPageSeededWith(P(<View />), "/queries/all", QS(6));
    expect(html).toMatch(/class="pa5 pa5bv land"/);
    const head = html.slice(html.indexOf('data-pa5="bv-head"'), html.indexOf("</header>"));
    expect(head).toContain('data-pa5="bv-spans"');
    expect(html).toMatch(/data-pa5="bv-names"><svg[\s\S]*?<b>Agent Number\d+<\/b>/);
    vi.unstubAllGlobals();
    phone(390, 844);
    const up = renderPageSeededWith(P(<View />), "/queries/all", QS(6));
    expect(up).not.toMatch(/class="pa5 pa5bv land"/);
    expect(up.slice(up.indexOf('data-pa5="bv-head"'), up.indexOf("</header>"))).not.toContain('data-pa5="bv-spans"');
  });
  it("the list's Birds-eye switch lands on the v5 view, carrying a filter from Today", () => {
    const html = renderPageSeededWith(P(<QueriesV4 />), "/queries/all?view=birds&court=agent", QS(8));
    expect(html).toContain('data-view="bird"');
    expect(html).toContain('data-pa5="birds-view"');
    expect(html).toMatch(/data-pa5="birds-view"[^>]*data-court="agent"/);
    const list = renderPageSeededWith(P(<QueriesV4 />), "/queries/all?court=agent", QS(8));
    expect(list).toContain('data-view="list"');
    expect(list).not.toContain('data-pa5="birds-view"');
  });
});
