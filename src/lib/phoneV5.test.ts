import { describe, it, expect } from "vitest";
import {
  MAT_TABS, TODAY_TABS, desktopV5Redirect, isMatTab, isTodayTab, phoneV5Redirect, readTab,
  BE_FEW_LINE, BE_MAX, beFooter, beLabel, beMonthLabels, beTrack, beViewPath, beWindow, cutRows, hasAsked, miniStage, nearestFirst, surname,
} from "./phoneV5";
import { QueryStatus } from "../types";
import type { BeLine } from "./qc150";
import { v3TabFor } from "./phoneV3Nav";
import {
  AGENT_GROUPS, agentGroupOf, agentPartition, gapGroupCounts, gapQueue, gapStrip, gapsAcross, healthShows, nextGap, queriedAgo,
} from "./phoneV5";
import { GROUP_ORDER, hkModel, type HkAgentCtx } from "./contactHousekeeping";
import { contactPrefsOf } from "./contactPrefs";
import type { Agent } from "../types";

const go = (path: string, search = "", hash = "") => phoneV5Redirect(path, search, hash);

describe("phone v5 addresses (Phase A)", () => {
  it("the tabs inside Today and Materials", () => {
    expect(TODAY_TABS.map((t) => t.label)).toEqual(["Queries", "Agents", "Activity"]);
    expect(MAT_TABS.map((t) => t.label)).toEqual(["Packages", "Letters", "Versions", "Comps"]);
    expect(isTodayTab("agents")).toBe(true);
    expect(isTodayTab("packages")).toBe(false);
    expect(isMatTab("comps")).toBe(true);
    expect(isMatTab(null)).toBe(false);
  });
  it("Today is the hub: /dashboard stays, /queries and /agents land on Today on their tab", () => {
    expect(go("/dashboard")).toBeNull();
    expect(go("/queries")).toBe("/dashboard?tab=queries");
    expect(go("/queries/")).toBe("/dashboard?tab=queries");
    expect(go("/agents")).toBe("/dashboard?tab=agents");
    expect(go("/agents/discover")).toBeNull();
  });
  it("the full list of queries is pushed, and every v4 deep link into it still opens it", () => {
    expect(go("/queries", "?view=birds")).toBe("/queries/all?view=birds");
    expect(go("/queries", "?view=birds&focus=q1")).toBe("/queries/all?view=birds&focus=q1");
    expect(go("/queries", "?court=you")).toBe("/queries/all?court=you");
    expect(go("/queries", "?q=q1")).toBe("/queries/all?q=q1");
    expect(go("/queries/all")).toBeNull();
    expect(go("/queries/all", "?view=birds")).toBeNull();
  });
  it("To do is its own tab again", () => {
    expect(go("/todo")).toBeNull();
    expect(go("/todo", "?x=1")).toBeNull();
    expect(go("/todo/corkboard")).toBeNull();
  });
  it("packages, letters, versions and comps land on Materials on their tab; a deep link opens its thing", () => {
    expect(go("/queries/packages")).toBe("/materials?tab=packages");
    expect(go("/queries/packages", "?pkg=p1")).toBeNull();
    expect(go("/queries/packages", "?build=new")).toBeNull();
    expect(go("/queries/packages", "?ver=v1")).toBeNull();
    expect(go("/materials/letters")).toBe("/materials?tab=letters");
    expect(go("/manuscripts/comps")).toBe("/materials?tab=comps");
    expect(go("/manuscripts/versions")).toBe("/materials?tab=versions");
    expect(go("/manuscripts/versions", "?version=b1")).toBeNull(); // the book page opens it (PhoneSectionLanding)
    expect(go("/manuscripts", "", "#materials")).toBe("/materials?tab=letters");
    expect(go("/manuscripts", "", "#comps")).toBe("/materials?tab=comps");
    expect(go("/manuscripts", "", "#versions")).toBe("/materials?tab=versions");
    expect(go("/manuscripts", "", "#packages")).toBe("/materials?tab=packages");
    expect(go("/manuscripts", "?pkg=p1", "#packages")).toBeNull();
    expect(go("/manuscripts", "?version=b1", "#versions")).toBeNull();
    expect(go("/manuscripts", "?edit=l1", "#materials")).toBeNull();
    expect(go("/materials")).toBeNull();
  });
  it("the book and everything v4 kept under You stay where they are (Profile)", () => {
    for (const p of ["/manuscripts", "/you", "/queries/responses", "/queries/analytics", "/account", "/account/profile", "/goals", "/help", "/plans", "/your-notes", "/import", "/todo/corkboard"]) {
      expect(go(p), p).toBeNull();
      expect(v3TabFor(p), p).toBe("profile");
    }
  });
  it("every landing sits on the dock tab the brief names", () => {
    const land = (to: string) => v3TabFor(to.split(/[?#]/)[0]);
    expect(land(go("/queries")!)).toBe("today");
    expect(land(go("/queries", "?view=birds")!)).toBe("today");
    expect(land(go("/agents")!)).toBe("today");
    for (const [p, h] of [["/queries/packages", ""], ["/materials/letters", ""], ["/manuscripts/comps", ""], ["/manuscripts/versions", ""], ["/manuscripts", "#materials"]]) {
      expect(land(go(p, "", h)!), p + h).toBe("materials");
    }
  });
  it("a computer is kept where it went before v5's two addresses existed", () => {
    expect(desktopV5Redirect("/queries/all", "?view=birds")).toBe("/queries?view=birds");
    expect(desktopV5Redirect("/queries/all", "")).toBe("/queries");
    expect(desktopV5Redirect("/materials", "")).toBe("/dashboard");
    for (const p of ["/queries", "/agents", "/todo", "/materials/letters", "/queries/packages", "/manuscripts"]) expect(desktopV5Redirect(p, ""), p).toBeNull();
  });
  it("a session's tab survives storage refusing (the first tab)", () => {
    expect(readTab("pa5.today.tab", isTodayTab, "queries")).toBe("queries");
  });
});

/* ── Phase B: the Birds-eye block's pure rules ── */
const DAY = 86_400_000;
const NOW = Date.parse("2026-11-12T12:00:00Z");
type L = Pick<BeLine, "past" | "cur" | "dueMs" | "row">;
const line = (o: { start: number; due: number | null; overdue?: boolean; past?: { from: number; to: number }[]; status?: string }): L => ({
  past: (o.past ?? []).map((b, i) => ({ key: `p${i}`, fromMs: NOW + b.from * DAY, toMs: NOW + b.to * DAY, label: "", title: "" })),
  cur: { key: "c", fromMs: NOW + o.start * DAY, toMs: NOW, label: "", title: "", stage: "", tint: "q", overdue: !!o.overdue },
  dueMs: o.due == null ? null : NOW + o.due * DAY,
  row: { status: o.status ?? QueryStatus.QUERIED, history: { spans: [] } } as unknown as L["row"],
});

describe("the Birds-eye block (Phase B)", () => {
  it("nearest their date first: past dates first, undated last, ties in the engine's order", () => {
    const xs = [{ id: "a", dueMs: 30 }, { id: "b", dueMs: null }, { id: "c", dueMs: -5 }, { id: "d", dueMs: 30 }, { id: "e", dueMs: 2 }];
    expect(nearestFirst(xs).map((x) => x.id)).toEqual(["c", "e", "a", "d", "b"]);
  });
  it("cut to eight, by group; `cut` only when some are left out", () => {
    const all = Array.from({ length: 12 }, (_, i) => ({ id: `q${i}`, dueMs: 100 - i, court: (i % 3 === 0 ? "you" : "agent") as "you" | "agent" }));
    const every = cutRows(all, null);
    expect(BE_MAX).toBe(8);
    expect(every.rows).toHaveLength(8);
    expect(every.cut).toBe(true);
    expect(every.rows[0].id).toBe("q11");
    const you = cutRows(all, "you");
    expect(you.rows.map((r) => r.id)).toEqual(["q9", "q6", "q3", "q0"]);
    expect(you.cut).toBe(false);
    expect(cutRows(all, "agent").cut).toBe(false);
    expect(cutRows(all, "quiet").rows).toEqual([]);
  });
  it("the label: the order, the group's name, and how many a cut group shows", () => {
    expect(beLabel(null, true, 8)).toBe("Nearest their date");
    expect(beLabel("you", false, 3)).toBe("With you");
    expect(beLabel("quiet", false, 5)).toBe("Gone quiet");
    expect(beLabel("agent", true, 8)).toBe("With agents · the 8 nearest their date");
  });
  it("the footer, singular and plural, with and without a filter, and where it goes", () => {
    expect(beFooter(26, null)).toBe("All 26 queries, against their dates");
    expect(beFooter(1, null)).toBe("Your query, against its date");
    expect(beFooter(16, "agent")).toBe("All 16 with agents, against their dates");
    expect(beFooter(1, "you")).toBe("The one with you, against its date");
    expect(beViewPath(null)).toBe("/queries/all?view=birds");
    expect(beViewPath("quiet")).toBe("/queries/all?view=birds&court=quiet");
    expect(BE_FEW_LINE).toBe("Each query you log gets a line here. The bar fills as the days pass.");
  });
  it("no verdict words in the block's words", () => {
    const words = [beFooter(3, null), beFooter(1, "quiet"), beLabel("quiet", true, 8), beLabel(null, false, 1), BE_FEW_LINE].join(" ");
    expect(words).not.toMatch(/overdue|late\b/i);
  });
  it("the surname is the name's last word", () => {
    expect(surname("Imogen Farr")).toBe("Farr");
    expect(surname("Daniel O'Rourke")).toBe("O'Rourke");
    expect(surname("  Maud  ")).toBe("Maud");
    expect(surname("")).toBe("");
  });
  it("the mini track's stage, and the ring when the agent has asked", () => {
    expect(miniStage(QueryStatus.QUERIED)).toBe(0);
    expect(miniStage(QueryStatus.PARTIAL_REQUESTED)).toBe(1);
    expect(miniStage(QueryStatus.PARTIAL_SENT)).toBe(1);
    expect(miniStage(QueryStatus.FULL_REQUESTED)).toBe(2);
    expect(miniStage(QueryStatus.FULL_SENT)).toBe(2);
    expect(miniStage(QueryStatus.REVISE_RESUBMIT)).toBe(2);
    expect(miniStage(QueryStatus.RESUBMITTED)).toBe(2);
    expect(miniStage(QueryStatus.OFFER)).toBe(3);
    for (const s of [QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED, QueryStatus.REVISE_RESUBMIT]) expect(hasAsked(s), s).toBe(true);
    for (const s of [QueryStatus.QUERIED, QueryStatus.PARTIAL_SENT, QueryStatus.FULL_SENT, QueryStatus.RESUBMITTED, QueryStatus.OFFER]) expect(hasAsked(s), s).toBe(false);
  });
  it("the window fits the rows, within two to nine weeks back and two to eight ahead", () => {
    /* six queries all sent this week, dates six weeks out: today sits in the left half */
    const week = Array.from({ length: 6 }, (_, i) => line({ start: -i, due: 42 - i }));
    const w = beWindow(week, NOW);
    expect(w.back).toBe(14);
    expect(w.ahead).toBe(47);
    expect((NOW - w.fromMs) / (w.toMs - w.fromMs)).toBeLessThan(0.5);
    /* nothing: the two-week floor either side */
    expect(beWindow([], NOW)).toMatchObject({ back: 14, ahead: 14 });
    /* long waits: the ceilings */
    const long = beWindow([line({ start: -200, due: 300 })], NOW);
    expect(long).toMatchObject({ back: 63, ahead: 56 });
    /* all past their date: nothing ahead but the floor */
    expect(beWindow([line({ start: -40, due: -10, overdue: true })], NOW)).toMatchObject({ back: 44, ahead: 14 });
  });
  it("the track: solid to today, paler to the date with a notch; past its date it carries on, deeper, to today", () => {
    const win = { fromMs: NOW - 20 * DAY, toMs: NOW + 20 * DAY };
    const run = beTrack(line({ start: -10, due: 10 }), win, NOW);
    expect(run.t).toBe(50);
    expect(run.cur).toMatchObject({ l: 25, solid: 25, rem: 50, notch: 75, deep: null, off: false });
    const past = beTrack(line({ start: -16, due: -4, overdue: true }), win, NOW);
    expect(past.cur!.notch).toBe(40);
    expect(past.cur!.solid).toBeCloseTo(30);
    expect(past.cur!.deep!.l).toBe(40);
    expect(past.cur!.deep!.w).toBeCloseTo(10);
    /* a date beyond the window fades off the edge, no notch */
    const far = beTrack(line({ start: -2, due: 60 }), win, NOW);
    expect(far.cur).toMatchObject({ off: true, notch: null });
    expect(far.cur!.l + far.cur!.rem).toBe(100);
    /* no date: solid to today, nothing paler, no notch */
    expect(beTrack(line({ start: -5, due: null }), win, NOW).cur).toMatchObject({ rem: 0, notch: null, deep: null });
    /* earlier stages, clipped to the window */
    const stages = beTrack(line({ start: -6, due: 4, past: [{ from: -30, to: -12 }, { from: -12, to: -6 }] }), win, NOW);
    expect(stages.past.map((b) => [b.l, b.w])).toEqual([[0, 20], [20, 15]]);
  });
  it("month labels: the window's first month, each 1st, none in the last tenth", () => {
    const m = beMonthLabels({ fromMs: Date.parse("2026-10-01T12:00:00Z"), toMs: Date.parse("2026-12-20T12:00:00Z") });
    expect(m.map((x) => x.label)).toEqual(["Oct", "Nov", "Dec"]);
    expect(m.every((x) => x.l < 90)).toBe(true);
    /* the 23rd, nine days from a 1st in a wide window: the first month gives way */
    const crowd = beMonthLabels({ fromMs: Date.parse("2026-10-23T12:00:00Z"), toMs: Date.parse("2027-01-31T12:00:00Z") });
    expect(crowd.map((x) => x.label)).toEqual(["Nov", "Dec", "Jan"]);
  });
});

/* ── Phase C: the Agents summary's partition, List health's groups, the gap session's order ── */

describe("phone v5 Agents tab (Phase C)", () => {
  it("the summary splits the list three ways by each agent's latest query, and every agent is in exactly one group", () => {
    const agents = ["a", "b", "c", "d", "e"].map((id) => ({ id }));
    const latest = new Map<string, { court: string }>([["b", { court: "agent" }], ["c", { court: "you" }], ["d", { court: "closed" }], ["x", { court: "quiet" }]]);
    const p = agentPartition(agents, latest);
    expect(p.toquery.map((a) => a.id)).toEqual(["a", "e"]);
    expect(p.querying.map((a) => a.id)).toEqual(["b", "c"]);
    expect(p.closed.map((a) => a.id)).toEqual(["d"]);
    /* a query to an agent no longer on the list ("x") counts nowhere; the three add up to the list */
    expect(AGENT_GROUPS.reduce((n, k) => n + p[k].length, 0)).toBe(agents.length);
    expect(agentGroupOf(undefined)).toBe("toquery");
    expect(agentGroupOf({ court: "quiet" })).toBe("querying");
    expect(agentGroupOf({ court: "closed" })).toBe("closed");
  });
  it("List health's words, and when it hides", () => {
    expect(gapsAcross(14, 9)).toBe("14 gaps across 9 agents");
    expect(gapsAcross(1, 1)).toBe("1 gap across 1 agent");
    expect(healthShows(null)).toBe(false);
    expect(healthShows({ pct: 100, gaps: 0 })).toBe(false);
    expect(healthShows({ pct: 82, gaps: 14 })).toBe(true);
    expect(healthShows({ pct: 90, gaps: 0 })).toBe(true);
  });

  /* three agents with gaps in every group; Housekeeping's own model orders them */
  const A = (id: string, over: Partial<Agent>): Agent => ({
    id, userId: "u", name: `Agent ${id}`, agency: "Agency", email: "", genres: ["Crime"], mswlNotes: "wants crime", responseTimeWeeks: 6,
    materialsWanted: ["Query Letter"], ...over,
  } as unknown as Agent);
  const agents = [
    A("p", { responseTimeWeeks: undefined, mswlNotes: "" }),
    A("q", { genres: [], agency: "" }),
    A("r", { responseTimeWeeks: undefined }),
  ];
  const ctx = (a: Agent): HkAgentCtx => ({ live: a.id === "r", fits: false, queried: a.id === "r", passedOn: false, hasReopenTask: false });
  const model = hkModel(agents, ctx, contactPrefsOf(null, new Date("2026-11-12T12:00:00Z")));

  it("the groups are Housekeeping's four, in GROUP_ORDER, each counting the visible gaps in it", () => {
    const g = gapGroupCounts(GROUP_ORDER, model.items);
    expect(g.map((x) => x.group)).toEqual(["dates", "packages", "matches", "reminders"]);
    expect(g.reduce((n, x) => n + x.n, 0)).toBe(model.items.length);
    expect(g.find((x) => x.group === "dates")!.n).toBe(model.items.filter((i) => i.gap === "reply").length);
  });
  it("the session runs in Housekeeping's own order; a group's row puts that group's gaps first, in the same order", () => {
    expect(model.items.length).toBeGreaterThan(3);
    expect(gapQueue(model.items, null).map((i) => i.key)).toEqual(model.items.map((i) => i.key));
    const m = gapQueue(model.items, "matches");
    const n = model.items.filter((i) => i.group === "matches").length;
    expect(n).toBeGreaterThan(0);
    expect(m.slice(0, n).every((i) => i.group === "matches")).toBe(true);
    expect(m.slice(0, n).map((i) => i.key)).toEqual(model.items.filter((i) => i.group === "matches").map((i) => i.key));
    expect(m.slice(n).map((i) => i.key)).toEqual(model.items.filter((i) => i.group !== "matches").map((i) => i.key));
    expect(m.length).toBe(model.items.length);
  });
  it("the strip marks saved gaps and the current one; the next gap is the next still open", () => {
    expect(gapStrip(4, 2, ["saved", "skipped"])).toEqual(["on", "", "cur", ""]);
    expect(gapStrip(3, -1, ["saved", "later", "saved"])).toEqual(["on", "", "on"]);
    const keys = ["a", "b", "c", "d"];
    expect(nextGap(keys, 0, new Set(["a", "b", "c", "d"]))).toBe(1);
    expect(nextGap(keys, 0, new Set(["a", "d"]))).toBe(3);
    expect(nextGap(keys, 3, new Set(keys))).toBeNull();
  });
  it("queried N ago", () => {
    const now = Date.parse("2026-11-12T12:00:00Z"), D = 86_400_000;
    expect(queriedAgo(now - 3600_000, now)).toBe("queried today");
    expect(queriedAgo(now - D, now)).toBe("queried 1 day ago");
    expect(queriedAgo(now - 21 * D, now)).toBe("queried 3 weeks ago");
    expect(queriedAgo(now - 90 * D, now)).toBe("queried 3 months ago");
  });
});

/* ── Phase D — To do: today's order, the swipe, the chips, the stamp, the header line ── */
import {
  TODO_ORDER_KEY, deckOrder, doneToday, dragAxis, dragLabel, orderForDay, readTodoOrder, saveTodoOrder, sendToBack, stampWord,
  swipeOutcome, todoChips, todoHeadLine,
} from "./phoneV5";
import { vi, afterEach as afterEachD } from "vitest";

describe("phone v5 To do (Phase D)", () => {
  afterEachD(() => { vi.unstubAllGlobals(); });
  const K = ["a", "b", "c", "d"];
  it("Not now: the card goes to the back of today's order, and the rest keep the workspace's order", () => {
    let o = orderForDay(null, "2026-11-12");
    expect(deckOrder(K, o.back)).toEqual(K);
    o = sendToBack(o, "a", "2026-11-12");
    expect(deckOrder(K, o.back)).toEqual(["b", "c", "d", "a"]);
    o = sendToBack(o, "b", "2026-11-12");
    expect(deckOrder(K, o.back)).toEqual(["c", "d", "a", "b"]);
    /* round the whole pile: every card sent back still cycles */
    o = sendToBack(sendToBack(o, "c", "2026-11-12"), "d", "2026-11-12");
    expect(deckOrder(K, o.back)).toEqual(["a", "b", "c", "d"]);
    o = sendToBack(o, "a", "2026-11-12");
    expect(deckOrder(K, o.back)[0]).toBe("b");
    expect(deckOrder(K, o.back)).toHaveLength(4);
  });
  it("the order follows the list: a task that left it leaves the pile; a new one takes its workspace place", () => {
    const o = sendToBack(orderForDay(null, "2026-11-12"), "a", "2026-11-12");
    expect(deckOrder(["b", "c"], o.back)).toEqual(["b", "c"]);
    expect(deckOrder(["n", "a", "b"], o.back)).toEqual(["n", "b", "a"]);
  });
  it("a task brought back (its Undo) goes on top, even over the workspace's order and today's back", () => {
    const o = sendToBack(orderForDay(null, "2026-11-12"), "c", "2026-11-12");
    expect(deckOrder(K, o.back, ["c"])).toEqual(["c", "a", "b", "d"]);
    expect(deckOrder(K, [], ["d", "zz"])).toEqual(["d", "a", "b", "c"]);
  });
  it("the order resets each day, and a malformed saved value is none", () => {
    const o = sendToBack(orderForDay(null, "2026-11-12"), "a", "2026-11-12");
    expect(orderForDay(o, "2026-11-12").back).toEqual(["a"]);
    expect(orderForDay(o, "2026-11-13").back).toEqual([]);
    expect(sendToBack(o, "b", "2026-11-13")).toEqual({ day: "2026-11-13", back: ["b"] });
    expect(orderForDay({ day: "2026-11-12", back: "a" }, "2026-11-12").back).toEqual([]);
    expect(orderForDay("junk", "2026-11-12").back).toEqual([]);
    expect(orderForDay({ day: "2026-11-12", back: ["a", 3] }, "2026-11-12").back).toEqual(["a"]);
  });
  it("the saved order round-trips through storage, and refused storage is today's empty order", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("window", { localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); } } });
    saveTodoOrder({ day: "2026-11-12", back: ["x"] });
    expect(store.has(TODO_ORDER_KEY)).toBe(true);
    expect(readTodoOrder("2026-11-12").back).toEqual(["x"]);
    expect(readTodoOrder("2026-11-13").back).toEqual([]);
    vi.stubGlobal("window", { localStorage: { getItem: () => { throw new Error("no"); }, setItem: () => { throw new Error("no"); } } });
    expect(readTodoOrder("2026-11-12")).toEqual({ day: "2026-11-12", back: [] });
    expect(() => saveTodoOrder({ day: "2026-11-12", back: [] })).not.toThrow();
  });
  it("the swipe: the axis is decided on the first 8px; it commits past a third of the card's width", () => {
    expect(dragAxis(4, 2)).toBeNull();
    expect(dragAxis(9, 3)).toBe("x");
    expect(dragAxis(-9, 3)).toBe("x");
    expect(dragAxis(3, 9)).toBe("y");
    expect(dragAxis(10, 12)).toBe("y");
    expect(swipeOutcome(121, 360)).toBe("do");
    expect(swipeOutcome(120, 360)).toBe("back");
    expect(swipeOutcome(-121, 360)).toBe("later");
    expect(swipeOutcome(-119, 360)).toBe("back");
    expect(swipeOutcome(0, 360)).toBe("back");
    expect(swipeOutcome(500, 0)).toBe("back");
    expect(dragLabel(55)).toEqual({ l: 0, r: 0.5 });
    expect(dragLabel(-220)).toEqual({ l: 1, r: 0 });
  });
  it("the chips: the date in words and how far off; a passed date said plainly, never late or overdue", () => {
    const now = new Date(2026, 10, 12, 12).getTime();
    expect(todoChips({ kind: "offer", dueYmd: "2026-11-20", replyMs: null, quietDays: null }, now)).toEqual({ lead: "Decide by 20 Nov", rel: "in 8 days" });
    expect(todoChips({ kind: "send", dueYmd: "2026-11-12", replyMs: null, quietDays: null }, now)).toEqual({ lead: "Send by 12 Nov", rel: "today" });
    expect(todoChips({ kind: "own", dueYmd: "2026-11-13", replyMs: null, quietDays: null }, now)).toEqual({ lead: "Do by 13 Nov", rel: "tomorrow" });
    expect(todoChips({ kind: "other", dueYmd: "2027-01-10", replyMs: null, quietDays: null }, now)).toEqual({ lead: "Due 10 Jan 2027", rel: "in 8 weeks" });
    expect(todoChips({ kind: "send", dueYmd: "2026-10-21", replyMs: null, quietDays: null }, now)).toEqual({ lead: "Was due 21 Oct", rel: "3 weeks ago" });
    expect(todoChips({ kind: "quiet", dueYmd: null, replyMs: new Date(2026, 9, 21, 12).getTime(), quietDays: 40 }, now)).toEqual({ lead: "Reply was due 21 Oct", rel: "3 weeks ago" });
    expect(todoChips({ kind: "nudge", dueYmd: "2026-11-12", replyMs: new Date(2026, 10, 11, 12).getTime(), quietDays: null }, now)).toEqual({ lead: "Reply was due 11 Nov", rel: "yesterday" });
    expect(todoChips({ kind: "quiet", dueYmd: null, replyMs: null, quietDays: 5 }, now)).toEqual({ lead: "Last sent 7 Nov", rel: "5 days ago" });
    /* nothing to read: no chip */
    expect(todoChips({ kind: "quiet", dueYmd: null, replyMs: null, quietDays: null }, now)).toBeNull();
    expect(todoChips({ kind: "fix", dueYmd: "2026-11-20", replyMs: null, quietDays: null }, now)).toBeNull();
    expect(todoChips({ kind: "batch", dueYmd: null, replyMs: null, quietDays: null }, now)).toBeNull();
    expect(todoChips({ kind: "send", dueYmd: null, replyMs: null, quietDays: null }, now)).toBeNull();
    expect(todoChips({ kind: "send", dueYmd: "", replyMs: null, quietDays: null }, now)).toBeNull();
    for (let d = -90; d <= 90; d += 1) {
      const ymd = new Date(2026, 10, 12 + d, 12);
      const s = `${ymd.getFullYear()}-${String(ymd.getMonth() + 1).padStart(2, "0")}-${String(ymd.getDate()).padStart(2, "0")}`;
      for (const kind of ["offer", "send", "rr", "nudge", "quiet", "own", "other"]) {
        const c = todoChips({ kind, dueYmd: s, replyMs: ymd.getTime(), quietDays: Math.max(0, -d) }, now);
        expect(`${c?.lead} ${c?.rel}`).not.toMatch(/overdue|late/i);
      }
    }
  });
  it("the stamp's word follows the task's verb; an own task is Done", () => {
    expect(stampWord({ kind: "send", type: "Send" })).toBe("Sent");
    expect(stampWord({ kind: "offer", type: "Decide" })).toBe("Answered");
    expect(stampWord({ kind: "nudge", type: "Nudge" })).toBe("Nudged");
    expect(stampWord({ kind: "quiet", type: "Close" })).toBe("Closed");
    expect(stampWord({ kind: "batch", type: "Fill in" })).toBe("Saved");
    expect(stampWord({ kind: "own", type: "Send" })).toBe("Done");
    expect(stampWord({ kind: "other", type: null })).toBe("Done");
  });
  it("the header line, and done today from the day's start", () => {
    expect(todoHeadLine(7, 2)).toBe("7 things need you · 2 done today");
    expect(todoHeadLine(1, 0)).toBe("1 thing needs you");
    expect(todoHeadLine(0, 3)).toBe("Nothing needs you · 3 done today");
    expect(todoHeadLine(0, 0)).toBe("Nothing needs you");
    expect(doneToday([{ at: 99 }, { at: 100 }, { at: 150 }], 100)).toEqual([{ at: 100 }, { at: 150 }]);
  });
});

/* ── Phase E — the full Birds-eye view: the spans and their memory, the filter, the fold, the switch's address, the bar in days ── */
import {
  BV_SPANS, BV_SPAN_FIRST, BV_SPAN_KEY, bvFilter, bvFilterLabel, bvFold, bvSpanDays, bvSwitchSearch, bvTrackDays, isBvSpan, readBvSpan, saveBvSpan,
} from "./phoneV5";
import { afterEach as afterEachE } from "vitest";

describe("phone v5 full Birds-eye view (Phase E)", () => {
  afterEachE(() => { vi.unstubAllGlobals(); });
  const store = (init: Record<string, string> = {}) => {
    const m = { ...init };
    vi.stubGlobal("window", { localStorage: { getItem: (k: string) => m[k] ?? null, setItem: (k: string, v: string) => { m[k] = v; } } });
    return m;
  };
  it("the spans: 1 month, 3 months, 6 months, read as days for the zoom", () => {
    expect(BV_SPANS.map((s) => s.label)).toEqual(["1 month", "3 months", "6 months"]);
    expect(BV_SPANS.map((s) => s.k).map(bvSpanDays)).toEqual([30, 90, 182]);
    expect(isBvSpan("6w")).toBe(false);
    expect(BV_SPAN_FIRST).toBe("3m");
  });
  it("it opens on 3 months the first time, then on the last span chosen; storage refusing is not a crash", () => {
    const m = store();
    expect(readBvSpan()).toBe("3m");
    saveBvSpan("1m");
    expect(m[BV_SPAN_KEY]).toBe("1m");
    expect(readBvSpan()).toBe("1m");
    store({ [BV_SPAN_KEY]: "garbage" });
    expect(readBvSpan()).toBe("3m");
    vi.stubGlobal("window", { localStorage: { getItem: () => { throw new Error("refused"); }, setItem: () => { throw new Error("refused"); } } });
    expect(readBvSpan()).toBe("3m");
    expect(() => saveBvSpan("6m")).not.toThrow();
  });
  it("the filter keeps only that court's queries; none keeps all", () => {
    const rows = [{ id: "a", court: "you" }, { id: "b", court: "agent" }, { id: "c", court: "quiet" }, { id: "d", court: "agent" }];
    expect(bvFilter(rows, "agent").map((r) => r.id)).toEqual(["b", "d"]);
    expect(bvFilter(rows, "you").map((r) => r.id)).toEqual(["a"]);
    expect(bvFilter(rows, null)).toHaveLength(4);
    expect(bvFilterLabel("quiet", 3)).toBe("Gone quiet · 3");
  });
  it("a group over five folds to Show N more; five or fewer never folds; shown is everything", () => {
    const xs = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(bvFold(xs, false)).toEqual({ rows: [1, 2, 3, 4, 5], more: 3 });
    expect(bvFold(xs, true)).toEqual({ rows: xs, more: 0 });
    expect(bvFold([1, 2, 3, 4, 5], false)).toEqual({ rows: [1, 2, 3, 4, 5], more: 0 });
  });
  it("the switch's address: the view, and a court only where the view can carry it; a chosen query is dropped", () => {
    expect(bvSwitchSearch("?view=birds&court=agent", false, "agent")).toBe("?court=agent");
    expect(bvSwitchSearch("?court=agent", true, "agent")).toBe("?court=agent&view=birds");
    expect(bvSwitchSearch("?view=birds&court=agent", true, "all")).toBe("?view=birds");
    expect(bvSwitchSearch("", true, "closed")).toBe("?view=birds");
    expect(bvSwitchSearch("?view=birds", false, "all")).toBe("");
    expect(bvSwitchSearch("?view=birds&focus=q1", false, "closed")).toBe("?court=closed");
  });
  it("a row's bar in days is the block's own beTrack, over the view's extent", () => {
    const ext = { fromMs: NOW - 40 * DAY, toMs: NOW + 60 * DAY };
    const run = bvTrackDays(line({ start: -10, due: 10 }), ext, NOW);
    expect(run.t).toBeCloseTo(40);
    expect(run.cur!.l).toBeCloseTo(30);
    expect(run.cur!.solid).toBeCloseTo(10);
    expect(run.cur!.rem).toBeCloseTo(20);
    expect(run.cur!.notch).toBeCloseTo(50);
    expect(run.cur!.deep).toBeNull();
    /* past its date: the notch at the date, the deeper segment from it to today */
    const past = bvTrackDays(line({ start: -20, due: -6, overdue: true }), ext, NOW);
    expect(past.cur!.notch).toBeCloseTo(34);
    expect(past.cur!.deep!.l).toBeCloseTo(34);
    expect(past.cur!.deep!.w).toBeCloseTo(6);
    /* the same figures as the block's percent, scaled */
    const pc = beTrack(line({ start: -20, due: -6, overdue: true }), ext, NOW);
    expect(past.cur!.solid).toBeCloseTo(pc.cur!.solid);
  });
});

/* ── Phase F: Materials ── */
import {
  VERSIONS_LOCK, bestClaim, compsWords, firstLine, letterCompCount, lettersNaming, lettersWords, materialFacts, materialQueries, matResult,
  pieceChip, pkgPieces, pkgResult, pkgStats, versionTree, versionsLocked,
} from "./phoneV5";
import { packageMetrics } from "./packageMetrics";
import { factsOf, queriesWithPiece } from "./packagesV40";
import { ComponentType, type ManuscriptVersion, type Query, type SubmissionPackage } from "../types";
import type { V2Version } from "./bookVersions";
import type { AnalyticsRow } from "./analytics";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const PK = (id: string, o: Partial<SubmissionPackage> = {}) => ({
  id, manuscriptId: "m1", userId: "u", packageName: id, queryLetterVersionId: "", synopsisVersionId: "", samplePagesVersionId: "", status: "Active", createdDate: "2026-01-01", ...o,
}) as unknown as SubmissionPackage;
const Q = (id: string, o: Partial<Query> = {}) => ({
  id, userId: "u", manuscriptId: "m1", agentId: `a-${id}`, packageId: "", status: QueryStatus.QUERIED, dateSent: "2026-03-01", personalisationNotes: "", ...o,
}) as unknown as Query;
const MAT = (id: string, type: ComponentType, o: Partial<ManuscriptVersion> = {}) => ({
  id, manuscriptId: "m1", userId: "u", componentType: type, versionName: id, createdDate: "2026-01-01", contentDraft: "", ...o,
}) as unknown as ManuscriptVersion;
const V = (id: string, o: Partial<V2Version> = {}): V2Version => ({
  id, num: 1, name: id, parentId: null, changes: [], original: false, archived: false, archivedDate: null, createdDate: "2026-01-01", wordCount: null, raw: {} as V2Version["raw"], ...o,
});
const asked = (id: string, n: number, more: number, pkgId: string) => Array.from({ length: n }, (_, i) =>
  Q(`${id}${i}`, { packageId: pkgId, status: i < more ? QueryStatus.PARTIAL_REQUESTED : QueryStatus.REJECTED }));

describe("phone v5 Materials (Phase F) — packages are packageMetrics'", () => {
  const pkgs = [PK("A"), PK("B"), PK("C")];
  const qs = [...asked("a", 7, 3, "A"), ...asked("b", 5, 1, "B"), ...asked("c", 2, 0, "C"), Q("solo")];
  it("every package's stat is packageMetrics' own, and its words come from that stat", () => {
    const st = pkgStats(pkgs, qs);
    for (const p of pkgs) expect(st.get(p.id)).toEqual(packageMetrics(p.id, qs));
    expect(pkgResult(st.get("A")!).words).toBe("3 from 7 asked for more");
    expect(pkgResult(st.get("A")!)).toMatchObject({ big: "3", of: "from 7", sent: 7, more: 3 });
    expect(pkgResult(packageMetrics("none", qs)).words).toBe("Not sent yet");
    expect(matResult(0, 0).of).toBeNull();
  });
  it("'best of your N packages' only when packageMetrics would crown it: two or more over the threshold, strictly ahead", () => {
    expect(bestClaim("A", pkgs, qs)).toBe("Best of your two packages so far.");
    expect(bestClaim("B", pkgs, qs)).toBeNull();
    /* one package over the threshold is not "best of" anything */
    expect(bestClaim("A", pkgs, [...asked("a", 7, 3, "A"), ...asked("b", 3, 3, "B")])).toBeNull();
    /* a tie crowns nobody */
    expect(bestClaim("A", pkgs, [...asked("a", 4, 2, "A"), ...asked("b", 4, 2, "B")])).toBeNull();
  });
  it("a package's pieces: an unfilled slot is shown as not set (isSlotFilled), a filled one by name", () => {
    const p = PK("A", { queryLetterVersionId: "L1", synopsisVersionId: "" });
    const pieces = pkgPieces(p, [{ id: "L1", versionName: "Hook-first" }], [{ id: "v1", name: "Version 3" }]);
    expect(pieces.map((x) => [x.k, x.set])).toEqual([["let", true], ["syn", false], ["ver", false]]);
    expect(pieces.map(pieceChip)).toEqual(["Hook-first", "No synopsis", "No manuscript"]);
    expect(pieceChip(pkgPieces(PK("B", { bookVersionId: "v1" }), [], [{ id: "v1", name: "Version 3" }])[2])).toBe("Version 3");
  });
});

describe("phone v5 Materials (Phase F) — letters, comps, versions", () => {
  const L1 = MAT("L1", ComponentType.QUERY_LETTER, { compIds: ["c1", "c2"] });
  const L2 = MAT("L2", ComponentType.QUERY_LETTER);
  const pk = PK("P", { queryLetterVersionId: "L1" });
  const ctx = { packages: [pk], materials: [L1, L2], versions: [] as V2Version[] };
  const rows = (ids: string[]) => new Map(ids.map((id) => [id, { reachedRequest: true } as unknown as AnalyticsRow]));
  it("a letter's result counts its package's queries AND a query sent without a package (on its letter only)", () => {
    const viaPkg = Q("q1", { packageId: "P", sentHow: "package", sentPackageId: "P" });
    const alone = Q("q2", { packageId: "", sentHow: "individual", sentVersions: ["L1"] });
    /* written before `sentHow` was stored: the desktop's rule (pieceOf) credits it to no letter, and the phone agrees */
    const older = Q("q3", { packageId: "", sentMaterials: "Query letter", sentVersions: ["L1"] });
    const other = Q("q4", { packageId: "", sentHow: "individual", sentVersions: ["L2"] });
    const queries = [viaPkg, alone, older, other];
    const f = materialFacts("let", "L1", queries, ctx, rows(["q2"]));
    expect(f.n).toBe(2);
    expect(f.more).toBe(1);
    expect(materialQueries("let", "L1", queries, ctx).map((q) => q.id)).toEqual(["q1", "q2"]);
    /* the phone's figure IS the desktop's, piece by piece */
    const r = rows(["q1", "q2"]);
    for (const [k, id] of [["let", "L1"], ["let", "L2"], ["syn", "S0"]] as const) {
      expect(materialQueries(k, id, queries, ctx)).toEqual(queriesWithPiece(queries, k, id, ctx));
      expect(materialFacts(k, id, queries, ctx, r)).toEqual(factsOf(queriesWithPiece(queries, k, id, ctx), r));
    }
    expect(materialFacts("let", "L2", queries, ctx, rows([])).n).toBe(1);
    /* …and on no package: the package counts only its own */
    expect(packageMetrics("P", queries).sent).toBe(1);
  });
  it("comps per letter, and letters per comp", () => {
    expect(letterCompCount(L1)).toBe(2);
    expect(letterCompCount(L2)).toBeNull();
    expect(letterCompCount({ compIds: [] })).toBe(0);
    expect([compsWords(2), compsWords(1), compsWords(0), compsWords(null)]).toEqual(["Mentions 2 comps", "Mentions 1 comp", "No comps", "Comps not noted"]);
    expect(lettersNaming({ id: "c1" }, [L1, L2, { compIds: ["c1"] }])).toBe(2);
    expect(lettersNaming({ id: "c9" }, [L1])).toBe(0);
    expect(lettersNaming({}, [L1])).toBe(0);
    expect([lettersWords(0), lettersWords(1), lettersWords(3)]).toEqual(["Not in a letter yet", "In 1 letter", "In 3 letters"]);
    expect(firstLine("\n  Dear agent,\nOn the night…")).toBe("Dear agent,");
    expect(firstLine("   ")).toBeNull();
  });
  it("the version tree grows up from the Original: each above its parent, the Original last, archived leaves left out", () => {
    const vs = [
      V("orig", { original: true, num: 1, createdDate: "2026-01-01" }),
      V("v2", { parentId: "orig", num: 2, createdDate: "2026-02-01" }),
      V("v3", { parentId: "v2", num: 3, createdDate: "2026-03-01" }),
      V("v2b", { parentId: "orig", num: 4, createdDate: "2026-04-01" }),
      V("gone", { parentId: "v3", num: 5, createdDate: "2026-05-01", archived: true }),
    ];
    const t = versionTree(vs);
    expect(t.map((n) => n.v.id)).toEqual(["v2b", "v3", "v2", "orig"]);
    expect(t.map((n) => n.parentId)).toEqual(["orig", "v2", "orig", null]);
    expect(t.map((n) => n.depth)).toEqual([1, 2, 1, 0]);
    for (const [i, n] of t.entries()) if (n.parentId) expect(t.findIndex((x) => x.v.id === n.parentId)).toBeGreaterThan(i);
    /* an archived version a live one grew from stays in the tree */
    const kept = versionTree([V("o", { original: true }), V("mid", { parentId: "o", archived: true, num: 2 }), V("tip", { parentId: "mid", num: 3 })]);
    expect(kept.map((n) => n.v.id)).toEqual(["tip", "mid", "o"]);
    expect(versionTree([])).toEqual([]);
  });
  it("the Versions gate is the desktop's: founding access opens it; the dev review aid locks it, never in production", () => {
    const free = { plan: "Free" } as Parameters<typeof versionsLocked>[0];
    expect(versionsLocked(free, "development", () => null)).toBe(false);
    expect(versionsLocked(free, "development", () => "1")).toBe(true);
    expect(versionsLocked(free, "production", () => "1")).toBe(false);
    const desk = readFileSync(resolve(__dirname, "../components/versions/VersionsV2Page.tsx"), "utf8");
    expect(desk).toContain('const locked = reviewFree() || !versionsUnlocked(currentUser, VERSIONS_FOUNDING_ACCESS);');
    expect(desk).toContain('sessionStorage.getItem("sa.dev.versionsFree") === "1"');
    expect(desk).toContain('if (import.meta.env.MODE === "production") return false;');
  });
  it("the lock's copy is the desktop's, word for word", () => {
    const desk = readFileSync(resolve(__dirname, "../components/versions/VersionsV2Page.tsx"), "utf8");
    expect(desk).toContain(`<span>${VERSIONS_LOCK.kicker}</span>`);
    expect(desk).toContain(`<h2 id="lkH">${VERSIONS_LOCK.head}</h2>`);
    expect(desk).toContain(`<p className="d">${VERSIONS_LOCK.body}</p>`);
    for (const [b, t] of VERSIONS_LOCK.bullets) expect(desk).toContain(`<span><b>${b}</b> ${t}</span>`);
    expect(desk).toContain(`>${VERSIONS_LOCK.plans}</button>`);
    expect(desk).toContain(`<small>${VERSIONS_LOCK.small}</small>`);
  });
});

/* ── Phase G — Profile and the feedback sheet ── */
import { FB_FIRST, FB_KINDS, PROFILE_ROWS, YOUR_NOTES_PATH, fbKindFor, fbReady, feedbackAbout, isComposeKey } from "./phoneV5";
import { COMPOSE } from "./foundingCard";
import { FEEDBACK_KINDS, FEEDBACK_MAX } from "./beta";

describe("phone v5 Profile and feedback (Phase G)", () => {
  it("About: the screen in plain words, with the tab chosen where the page has tabs", () => {
    expect(feedbackAbout("/dashboard", { today: "queries" })).toBe("Today · Queries");
    expect(feedbackAbout("/dashboard", { today: "agents" })).toBe("Today · Agents");
    expect(feedbackAbout("/dashboard/", { today: "activity" })).toBe("Today · Activity");
    expect(feedbackAbout("/dashboard")).toBe("Today");
    expect(feedbackAbout("/dashboard", { today: "nonsense" })).toBe("Today");
    expect(feedbackAbout("/materials", { materials: "letters" })).toBe("Materials · Letters");
    expect(feedbackAbout("/materials", { materials: "comps", today: "queries" })).toBe("Materials · Comps");
    expect(feedbackAbout("/todo")).toBe("To do");
    expect(feedbackAbout("/you")).toBe("Profile");
    expect(feedbackAbout("/queries/responses", {}, "Responses")).toBe("Responses");
    expect(feedbackAbout("/somewhere", {}, "  ")).toBe("QueryHawk");
  });
  it("the three kinds, in the ref's order and words, open on An idea, and send COMPOSE's own kind string", () => {
    expect(FB_KINDS.map((k) => k.label)).toEqual(["I like", "I don’t like", "An idea"]);
    expect(FB_FIRST).toBe("idea");
    for (const k of FB_KINDS) {
      expect(fbKindFor(k.key)).toBe(COMPOSE.find((c) => c.key === k.key)!.kind);
      expect(FEEDBACK_KINDS as readonly string[]).toContain(fbKindFor(k.key));
    }
    expect(fbKindFor("like")).toBe("Something I liked");
    expect(fbKindFor("dont")).toBe("Something's broken");
    expect(fbKindFor("idea")).toBe("An idea");
    expect(isComposeKey("dont")).toBe(true);
    expect(isComposeKey("broken")).toBe(false);
  });
  it("Send is ready with words, within the limit, and not while sending", () => {
    expect(fbReady("", false)).toBe(false);
    expect(fbReady("   \n", false)).toBe(false);
    expect(fbReady("Pin a query", false)).toBe(true);
    expect(fbReady("Pin a query", true)).toBe(false);
    expect(fbReady("x".repeat(FEEDBACK_MAX + 1), false)).toBe(false);
  });
  it("Profile's rows: Responses, Your book, Corkboard, Settings — the materials rows are Materials now", () => {
    expect(PROFILE_ROWS.map((r) => r.label)).toEqual(["Responses", "Your book", "Corkboard", "Settings"]);
    expect(PROFILE_ROWS.map((r) => r.path)).toEqual(["/queries/responses", "/manuscripts", "/todo/corkboard", "/account"]);
    for (const r of PROFILE_ROWS) expect(v3TabFor(r.path)).toBe("profile");
    expect(v3TabFor(YOUR_NOTES_PATH)).toBe("profile");
    for (const gone of ["/queries/packages", "/manuscripts#materials", "/manuscripts#comps"]) expect(PROFILE_ROWS.map((r) => r.path)).not.toContain(gone);
  });
});
