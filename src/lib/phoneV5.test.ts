import { describe, it, expect } from "vitest";
import {
  MAT_TABS, TODAY_TABS, desktopV5Redirect, isMatTab, isTodayTab, phoneV5Redirect, readTab,
  BE_FEW_LINE, BE_MAX, beFooter, beLabel, beMonthLabels, beTrack, beViewPath, beWindow, cutRows, hasAsked, miniStage, nearestFirst, surname,
} from "./phoneV5";
import { QueryStatus } from "../types";
import type { BeLine } from "./qc150";
import { v3TabFor } from "./phoneV3Nav";

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
