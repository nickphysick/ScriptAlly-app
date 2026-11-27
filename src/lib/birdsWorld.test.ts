/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone Birds-eye world v2, phase 1, and v3, phase 1 — the engine (lib/birdsWorld) against the ref's page script.
 */
import { describe, it, expect } from "vitest";
import { QueryStatus } from "../types";
import type { EyeRow } from "./qcBirdsEye";
import type { QcRow } from "./qcSummary";
import {
  BW_GROUPS, DAY, GAP, GPMAX, RH, RPMAX, RULE, TOPFIT, TOPFOLD, WX, XP, ACT_LABEL, agoOf, changes, dayFromMs, menuActions, noDateDefault, noDateRows, outOn, recapStats, scrubLabel, searchRows, seenLabel, sheetOf, tips,
  aheadTx, allH, barBox, bwCounts, bwGroups, bwRow, chipForCourt, clipR, dm, fadedBand, hasFig, headingTop, inPill, isNoDate, kk,
  makeWorld, num, outcomeWord, replayAt, replayStart, rowSegs, rulerMarks, sampleRows, setAxis, shortName, spaced, stageTx,
  isGoneQuiet, keepFolds, needsSendBy, SB_DEFAULT_WEEKS, zoomForRows, type BwRow,
} from "./birdsWorld";

const NOW = new Date(2026, 10, 25, 12).getTime();
const T0 = new Date(2026, 10, 25).getTime();
const at = (d: number) => T0 + d * DAY;
const Q = QueryStatus;
function eye(id: string, spans: [QueryStatus, number][], due: number | null): EyeRow {
  const status = spans[spans.length - 1][0];
  const row = {
    id, agentName: `Agent ${id}`, agency: "Hale & Finch", status, expectedMs: due == null ? null : at(due), expectedKind: due == null ? null : "reply",
    stageStartMs: at(spans[spans.length - 1][1]), sentMs: at(spans[0][1]), lastMs: at(spans[spans.length - 1][1]),
    history: { spans: spans.map(([s, d], i) => ({ status: s, startMs: at(d), endMs: i < spans.length - 1 ? at(spans[i + 1][1]) : null, current: i === spans.length - 1 })), currentStartMs: at(spans[spans.length - 1][1]), dated: true },
  } as unknown as QcRow;
  return { id, row, court: "agent" } as unknown as EyeRow;
}
const R = (e: EyeRow, closed = false) => bwRow(e, NOW, closed);
const rows = (): BwRow[] => [
  R(eye("five", [[Q.QUERIED, -150], [Q.PARTIAL_REQUESTED, -96], [Q.PARTIAL_SENT, -90], [Q.FULL_REQUESTED, -44], [Q.FULL_SENT, -40]], 30)),
  R(eye("chase", [[Q.QUERIED, -60]], -4)),
  R(eye("quiet", [[Q.QUERIED, -100]], -58)),
  R(eye("near", [[Q.QUERIED, -45]], 11)),
  R(eye("plenty", [[Q.QUERIED, -6]], 50)),
  R(eye("you", [[Q.QUERIED, -40], [Q.PARTIAL_REQUESTED, -11]], 3)),
  R(eye("offer", [[Q.QUERIED, -95], [Q.FULL_SENT, -55], [Q.OFFER, -3]], null)),
  R(eye("nodate", [[Q.QUERIED, -20]], null)),
  R(eye("passed", [[Q.QUERIED, -120], [Q.REJECTED, -70]], null), true),
];
const QUIET = 42;

describe("Phone Birds-eye world v2 — the engine", () => {
  it("rows: real days from today; a closed query ends on its outcome, with its word", () => {
    const r = rows();
    expect(r[0].ev.map((e) => e.d)).toEqual([-150, -96, -90, -44, -40]);
    expect(r[0].due).toBe(30);
    const p = r.find((x) => x.id === "passed")!;
    expect([p.closed, p.due, p.outcome, p.ev[p.ev.length - 1].d]).toEqual([true, null, "Passed", -70]);
    expect([outcomeWord(Q.NO_RESPONSE), outcomeWord(Q.WITHDRAWN)]).toEqual(["No reply", "Withdrawn"]);
    expect(r.find((x) => x.id === "offer")!.you).toBe(true);
  });
  it("the pills split the open queries exactly: All = With you + Needs chasing + Waiting", () => {
    const c = bwCounts(rows());
    expect(c).toEqual({ all: 8, you: 2, chase: 2, wait: 4 });
    expect(c.you + c.chase + c.wait).toBe(c.all);
    for (const set of [rows(), sampleRows()]) {
      const k = bwCounts(set);
      expect(k.you + k.chase + k.wait).toBe(k.all);
      for (const r of set.filter((x) => !x.closed)) expect(["you", "chase", "wait"].filter((f) => inPill(r, f as "you")).length).toBe(1);
    }
    expect([chipForCourt("you"), chipForCourt("quiet"), chipForCourt("agent"), chipForCourt(null)]).toEqual(["you", "chase", "all", "all"]);
  });
  it("v3.2 the groups, in order: Needs action, Within their window, No reply date yet (All and Waiting), Closed (All, last)", () => {
    const g = bwGroups(rows());
    expect(g.map((x) => x.t)).toEqual(["Needs action", "Within their window", "No reply date yet", "Closed"]);
    expect(BW_GROUPS).toEqual(["Needs action", "Within their window", "No reply date yet", "Closed"]);
    /* Needs action: chasing and with-you mixed in one order, the largest share of the window used first (kk) — quiet
       100/42, chase 60/56, you 11/14, offer 3/60; Within their window: near 45/56, five 40/70, plenty 6/56 */
    expect(Object.fromEntries(g.map((x) => [x.t, x.rows.map((r) => r.id)]))).toEqual({
      "Needs action": ["quiet", "chase", "you", "offer"], "Within their window": ["near", "five", "plenty"], "No reply date yet": ["nodate"], Closed: ["passed"],
    });
    /* mixed, not split: a with-you query 40 days into a 20-day send-by window sits between quiet and chase */
    const youLate = R(eye("youLate", [[Q.QUERIED, -60], [Q.FULL_REQUESTED, -40]], -20));
    expect(bwGroups([...rows(), youLate])[0].rows.map((r) => r.id)).toEqual(["quiet", "youLate", "chase", "you", "offer"]);
    expect(g.every((x) => x.label === x.t)).toBe(true);
    expect(bwGroups(rows(), "wait").map((x) => x.t)).toEqual(["Within their window", "No reply date yet"]);
    for (const f of ["chase", "you"] as const) expect(bwGroups(rows(), f).some((x) => x.t === "No reply date yet")).toBe(false);
    expect(noDateRows(rows()).map((r) => r.id)).toEqual(["nodate"]);
    /* the heading follows the pill */
    expect(bwGroups(rows(), "chase").map((x) => [x.t, x.label, x.rows.map((r) => r.id)])).toEqual([["Needs action", "Needs chasing", ["quiet", "chase"]]]);
    expect(bwGroups(rows(), "you").map((x) => [x.t, x.label, x.rows.map((r) => r.id)])).toEqual([["Needs action", "With you", ["you", "offer"]]]);
    /* folds: only today's ids carry */
    expect(keepFolds(["Nearly there", "Plenty of time", "Needs chasing", "With you", "Needs action", "Closed"])).toEqual(["Needs action", "Closed"]);
    expect(bwGroups(rows(), "you").some((x) => x.t === "Closed")).toBe(false);
    expect(isNoDate(rows().find((x) => x.id === "nodate")!)).toBe(true);
    /* with you and no send-by date: drawn in With you (to today), never in "No reply date yet" (a reply date is not the writer's to set there) */
    const youNoDate = R(eye("youNoDate", [[Q.QUERIED, -40], [Q.FULL_REQUESTED, -9]], null));
    expect(isNoDate(youNoDate)).toBe(false);
    expect(bwGroups([...rows(), youNoDate], "you").find((x) => x.label === "With you")!.rows.map((r) => r.id)).toContain("youNoDate");
    expect(bwGroups([...rows(), youNoDate]).find((x) => x.t === "Needs action")!.rows.map((r) => r.id)).toContain("youNoDate");
    expect(noDateRows([...rows(), youNoDate]).map((r) => r.id)).toEqual(["nodate"]);
    /* the "All" layout's height sets the scale for every pill: v3.2's four groups, nine rows */
    expect(allH(rows())).toBe(4 * GAP + 9 * RH + 8);
  });
  it("the span: a fortnight before the first date to three weeks after the last, clamped −365…−60 and 42…365; closed queries don't count", () => {
    expect(setAxis(rows())).toEqual({ D0: -164, D1: 71 });
    expect(setAxis([R(eye("a", [[Q.QUERIED, -5]], 3))])).toEqual({ D0: -60, D1: 42 });
    expect(setAxis([R(eye("a", [[Q.QUERIED, -900]], 900))])).toEqual({ D0: -365, D1: 365 });
    expect(setAxis([...rows(), R(eye("old", [[Q.QUERIED, -800], [Q.REJECTED, -700]], null), true)])).toEqual({ D0: -164, D1: 71 });
  });
  it("segments: the current stage runs straight on (cont) to the reply date, or hatched past it, fading once gone quiet", () => {
    const seg = (id: string, q = QUIET) => rowSegs(rows().find((x) => x.id === id)!, q).map((s) => [s.k, s.a, s.b, s.cont]);
    expect(seg("plenty")).toEqual([["stage", -6, 0, true], ["ahead", 0, 50, false]]);
    expect(seg("chase")).toEqual([["stage", -60, -4, true], ["past", -4, 0, false]]);
    /* 58 days past: hatched 42 days from the reply date, then the fade to today */
    expect(seg("quiet")).toEqual([["stage", -100, -58, true], ["past", -58, -16, true], ["quiet", -16, 0, false]]);
    /* a different setting moves where the fade starts */
    expect(seg("quiet", 28)).toEqual([["stage", -100, -58, true], ["past", -58, -30, true], ["quiet", -30, 0, false]]);
    expect(seg("offer")).toEqual([["stage", -95, -55, false], ["stage", -55, -3, false], ["stage", -3, 0, false]]);
    expect(seg("passed")).toEqual([["stage", -120, -70, false], ["stage", -70, -66, false]]);
    const five = rowSegs(rows()[0], QUIET);
    expect([five[0].first, five[0].last, five[4].last, five[4].cont]).toEqual([true, false, true, true]);
  });
  it("clipR: the replay draws nothing after its now and nothing still to come, the last piece squared off", () => {
    const s = rowSegs(rows()[0], QUIET);
    const mid = clipR(s, -60);
    expect(mid.map((x) => [x.a, x.b])).toEqual([[-150, -96], [-96, -90], [-90, -60]]);
    expect([mid[2].last, mid[2].cont]).toEqual([true, false]);
    expect(clipR(s, 0).some((x) => x.k === "ahead")).toBe(false);
    expect(clipR(s, null)).toEqual(s);
    expect(replayStart(rows())).toBe(-153);
    /* never before the axis's start */
    expect(replayStart(rows(), -120)).toBe(-120);
    expect([replayAt(-100, 0), replayAt(-100, 0.5), replayAt(-100, 1)]).toEqual([-100, -50, 0]);
  });
  it("figures only past its date, for an offer, or a closed outcome — never time still to run", () => {
    const f = (id: string) => { const r = rows().find((x) => x.id === id)!; return hasFig(r) ? num(r).join(" ").trim() : null; };
    expect([f("chase"), f("quiet"), f("offer"), f("passed"), f("plenty"), f("near"), f("nodate")]).toEqual(["4 days past", "8 wks past", "Offer", "Passed", null, null, null]);
    expect(hasFig(rows().find((x) => x.id === "chase")!, true)).toBe(false);
    for (const r of rows()) expect(num(r).join(" ")).not.toMatch(/overdue|\blate\b/i);
  });
  it("words: SHORT names, stageTx's drop order, the still-to-come line, en-GB dates", () => {
    expect([Q.QUERIED, Q.PARTIAL_REQUESTED, Q.PARTIAL_SENT, Q.FULL_REQUESTED, Q.FULL_SENT, Q.OFFER, Q.REJECTED].map(shortName))
      .toEqual(["Queried", "Partial asked", "Partial sent", "Full asked", "Full sent", "Offer", "Passed"]);
    const n = "Partial asked", d = "16 Nov", both = n.length * 7.4 + d.length * 6.6 + 24;
    expect([stageTx(n, d, both), stageTx(n, d, both - 1), stageTx(n, d, n.length * 7.4 + 17), stageTx(n, d, 1)]).toEqual(["both", "name", "date", "none"]);
    expect([aheadTx("Reply by", "14 Jan", 200), aheadTx("Reply by", "14 Jan", 70), aheadTx("Reply by", "14 Jan", 20)]).toEqual(["Reply by 14 Jan", "14 Jan", ""]);
    expect([dm(0, NOW), dm(-70, NOW)]).toEqual(["25 Nov", "16 Sep"]);
    expect(fadedBand(Q.QUERIED)).toBe("color-mix(in srgb,#efe6d6 45%,#fff)");
  });
  it("the ruler's tiers: months, then 4 / 2 / 1 weeks on Mondays, then every day — dates 64px apart, days 22px", () => {
    const ext = { D0: -164, D1: 71 };
    const tier = (ppd: number) => rulerMarks(ext, (d) => (d - ext.D0) * ppd, NOW);
    expect([1, 2.3, 4.6, 9.2, 24].map((p) => tier(p).tier)).toEqual(["months", "4w", "2w", "1w", "days"]);
    expect(tier(1).marks.map((m) => m[1]).slice(0, 3)).toEqual(["Jul", "Aug", "Sep"]);
    const wk = tier(9.2).marks;
    expect(wk.every(([x]) => { const d = Math.round(x / 9.2) + ext.D0; return new Date(T0 + d * DAY + DAY / 2).getDay() === 1; })).toBe(true);
    const days = tier(24);
    expect(days.marks.find((m) => m[1] === "1 Dec")).toBeTruthy();
    expect(days.marks.find((m) => m[1] === "26")).toBeTruthy();
    expect(days.mon).not.toBeNull();
    for (const t of [tier(4.6).marks, tier(24).marks]) {
      const s = spaced(t);
      for (let i = 1; i < s.length; i++) expect(s[i][0] - s[i - 1][0]).toBeGreaterThanOrEqual(s[i][2] ? 22 : 64);
    }
  });
  const world = (f: "all" | "you" | "chase" | "wait" = "all", set = rows()) => makeWorld({ rows: set, filter: f, vpW: 390, vpH: 784, bot: 88 });
  it("scale: time fills the width; rows share the All layout's height; a pill never changes the scale", () => {
    const w = world();
    expect(w.fitS()).toBeCloseTo((390 - 32) / WX, 9);
    expect(w.fitSY()).toBeCloseTo(Math.min(w.fitS() * 3, (784 - TOPFIT - RULE - 88) / (allH(rows()) + 8)), 9);
    for (const f of ["you", "chase", "wait"] as const) { const p = world(f); expect([p.fitS(), p.fitSY(), p.LINE, p.SX(1)]).toEqual([w.fitS(), w.fitSY(), w.LINE, w.SX(1)]); }
    /* the ceiling is the closest level (pinch stops at Weeks) */
    expect(w.maxZ).toBeCloseTo(w.levels[w.levels.length - 1].z * 1.001, 9);
    expect(w.zT()).toBeCloseTo(Math.max(1.05, 24 / (RH * w.fitSY())), 9);
    const z = w.zT() * 1.5;
    expect(w.SX(z)).toBeCloseTo(w.fitS() * Math.pow(z, XP) * (1 + 0.5 * 3), 9);
  });
  it("rows stop at 48px and gaps at 44px; 48px rows are reachable on a long campaign; the mapping round-trips", () => {
    const seventy = Array.from({ length: 70 }, (_, i) => ({ ...rows()[i % 6], id: `r${i}` }));
    for (const w of [world(), world("all", seventy)]) {
      expect(w.rowPx(w.maxZ)).toBe(RPMAX);
      expect(w.gapPx(w.maxZ)).toBe(GPMAX);
      for (const z of [1, 2, w.maxZ]) for (let wy = 0; wy <= w.H; wy += 7.3) expect(Math.abs(w.yOff(w.yWorld(w.yOff(wy, z), z), z) - w.yOff(wy, z))).toBeLessThan(0.5);
    }
    const s = world("all", seventy);
    /* fitted, the rows and gaps end above the reserve */
    /* the ref's own fit: its 8px top margin and 8px tail run past the reserve by up to 16px */
    expect(s.fitView().oy + s.yOff(s.H, 1)).toBeLessThanOrEqual(784 - 88 + 16);
    /* time spans at least 90% of the width when fitted */
    expect(WX * s.SX(1)).toBeGreaterThanOrEqual(0.9 * 390);
    expect(zoomForRows(s, 48) * RH * s.fitSY()).toBeCloseTo(48, 6);
  });
  it("v3: a pill stays fitted (FZ retired); the header folds past z 1.05", () => {
    const all = world();
    expect(all.fitView()).toEqual({ z: 1, ox: (390 - WX * all.SX(1)) / 2, oy: TOPFIT + RULE + 8 });
    for (const f of ["you", "chase", "wait"] as const) { const p = world(f); expect([p.FZ, p.fitView().z]).toEqual([1, 1]); }
    expect([all.topFor(1), all.topFor(1.05), all.topFor(1.06)]).toEqual([TOPFIT, TOPFIT, TOPFOLD]);
    const l = makeWorld({ rows: rows(), filter: "all", vpW: 740, vpH: 360, bot: 16, land: true });
    expect(l.topFor(1)).toBe(TOPFOLD);
  });
  it("clamp, headings and the bar box (ref `inRow`)", () => {
    const w = world();
    expect(w.clamp({ z: 999, ox: 0, oy: 0 }).z).toBe(w.maxZ);
    expect(w.clamp({ z: 0.1, ox: 0, oy: 0 }).z).toBe(1);
    expect(headingTop(50, 44, 600, 96, false)).toEqual({ hy: 96 + RULE, hh: 28, pinned: true });
    expect(barBox(10, 0, false)).toEqual({ th: 4.5, by: 2.75, named: false, one: false, two: false });
    expect(barBox(30, 0, false).named).toBe(false);
    expect(barBox(26, 0, true)).toEqual({ th: 18, by: 4, named: true, one: true, two: false });
    expect(barBox(48, 0, true)).toEqual({ th: 40, by: 4, named: true, one: true, two: true });
    expect(barBox(42, 0, true).two).toBe(true);
  });
  it("the sample campaign is the ref's invented 22 (2 closed, 3 undated), never real data", () => {
    const s = sampleRows();
    expect(s.length).toBe(22);
    expect(s.filter((r) => r.closed).length).toBe(2);
    expect(s.filter((r) => !r.closed && r.due == null && r.status === Q.QUERIED).length).toBe(3);
    expect(s.every((r) => r.id.startsWith("sample"))).toBe(true);
    expect(kk(s[0])).toBeCloseTo(40 / 70, 9);
  });

  it("v3 folding: a folded group keeps its heading and count, its rows go, it holds 1.3 rows of world height", () => {
    const f = makeWorld({ rows: rows(), filter: "all", vpW: 390, vpH: 784, bot: 88, folded: new Set(["Needs action", "Closed"]) });
    const ch = f.G.find((g) => g.t === "Needs action")!;
    expect([ch.folded, ch.n, ch.rows.length, ch.h]).toEqual([true, 4, 0, RH * 1.3]);
    expect(f.G.find((g) => g.t === "Within their window")!.y).toBe(GAP + RH * 1.3);
    /* the scale is All's, folded or not */
    expect(f.fitSY()).toBe(world().fitSY());
  });
  it("v3 levels: All fitted, Months = 120 days across, Weeks = the closer of 42 days and 48px rows (x1.02), each 15% closer", () => {
    for (const set of [rows(), Array.from({ length: 70 }, (_, i) => ({ ...rows()[i % 6], id: `r${i}` }))]) {
      const w = world("all", set), L = w.levels;
      expect(L[0]).toEqual({ t: "All", z: 1 });
      const m = L.find((l) => l.t === "Months"), wk = L.find((l) => l.t === "Weeks")!;
      if (m) expect(120 * w.PPD * w.SX(m.z)).toBeCloseTo(390 - 32, 0);
      expect(wk.z).toBeCloseTo(Math.max(w.zForDays(42), (48 / (RH * w.fitSY())) * 1.02), 9);
      for (let i = 1; i < L.length; i++) expect(L[i].z).toBeGreaterThan(L[i - 1].z * 1.15);
      expect(w.rowPx(wk.z)).toBe(RPMAX);
      expect([w.nearestLv(1), w.nearestLv(wk.z), w.nearestLv(wk.z * 0.98)]).toEqual([0, L.length - 1, L.length - 1]);
    }
  });
  it("v3 the hawk's news: each stage moved and each reply date reached since last opened, oldest first", () => {
    const c = changes(rows(), -12);
    expect(c.map((x) => [x.id, x.d, x.t])).toEqual([
      ["you", -11, "Agent you asked for a partial"],
      ["chase", -4, "Agent chase reached the reply date"],
      ["offer", -3, "Agent offer made an offer"],
    ]);
    /* a change on the day last opened counts only if after it; nothing changes from today */
    expect(changes(rows(), -11).map((x) => x.id)).toEqual(["chase", "offer"]);
    expect(changes(rows(), 0)).toEqual([]);
    expect(dayFromMs(NOW - 6 * DAY, NOW)).toBe(-6);
    expect(seenLabel(-6, NOW)).toBe("Thursday");
    expect(seenLabel(-9, NOW)).toBe("16 Nov");
  });
  it("v3 the hawk's one-liners, in order, each only when it applies", () => {
    expect(tips(rows(), QUIET)).toEqual([
      "2 things are waiting on you. The ball’s in your court.",
      "No replies due this week. A good week to send a few more.",
      "Agent quiet has gone quiet. A nudge, or time to let it go?",
      "150 days on the hunt. Most searches take months, not weeks. Keep going.",
    ]);
    const one = [R(eye("a", [[Q.QUERIED, -5]], 3))];
    expect(tips(one, QUIET)).toEqual(["1 reply is due this week. Fingers crossed.", "5 days on the hunt. Most searches take months, not weeks. Keep going."]);
    for (const t of tips(rows(), QUIET)) expect(t).not.toMatch(/overdue|\blate\b/i);
  });
  it("v3 search: by name or agency, open first then closed, six at most", () => {
    expect(searchRows(rows(), "chase").map((r) => r.id)).toEqual(["chase"]);
    expect(searchRows(rows(), "HALE").length).toBe(6);
    expect(searchRows(rows(), "agent pass").map((r) => r.id)).toEqual(["passed"]);
    expect(searchRows(rows(), "").slice(-1)[0].closed).toBe(false);
  });
  it("v3 the no-date default: the agent's stated time from their card, else 6 weeks", () => {
    expect(noDateDefault(8)).toEqual({ weeks: 8, stated: true });
    expect(noDateDefault(null)).toEqual({ weeks: 6, stated: false });
    expect(noDateDefault(0)).toEqual({ weeks: 6, stated: false });
  });
  it("v3 the long-press menu's actions per state", () => {
    const by = (id: string) => menuActions(rows().find((x) => x.id === id)!).map((a) => ACT_LABEL[a]);
    expect(by("chase")).toEqual(["They replied", "Send a nudge", "Open query", "Edit dates"]);
    expect(by("you")).toEqual(["I’ve sent it", "Open query", "Edit dates"]);
    /* v3.1 (Nick's ruling 1): no Reopen on the phone */
    expect(by("passed")).toEqual(["Open query"]);
    /* v3.1 (ruling 4): an undated with-you query adds "Add send-by date" after "I've sent it" */
    const undated = R(eye("youNoDate", [[Q.QUERIED, -40], [Q.FULL_REQUESTED, -9]], null));
    expect(menuActions(undated).map((a) => ACT_LABEL[a])).toEqual(["I’ve sent it", "Add send-by date", "Open query", "Edit dates"]);
    expect(needsSendBy(undated)).toBe(true);
    expect(needsSendBy(rows().find((x) => x.id === "you")!)).toBe(false);
    /* its timeline's reply step reads "No send-by date yet" (the sheet puts the Add link there) */
    expect(sheetOf(undated, QUIET, NOW).steps.at(-1)).toMatchObject({ k: "nosendby", t: "No send-by date yet" });
    expect(sheetOf(rows().find((x) => x.id === "you")!, QUIET, NOW).steps.some((s) => s.k === "nosendby")).toBe(false);
    expect(SB_DEFAULT_WEEKS).toBe(2);
  });
  it("v3.3 gone quiet: stays hatched (its tail carries the \"!\" when nothing hatched comes before it); sorts last in Needs action", () => {
    /* quiet (−100, due −58): past then quiet at 42 days, the "!" on the past stretch only */
    const marks = (q: number) => rowSegs(rows().find((x) => x.id === "quiet")!, q).filter((s) => s.k === "past" || s.k === "quiet").map((s) => [s.k, !!s.mark]);
    expect(marks(42)).toEqual([["past", true], ["quiet", false]]);
    /* a stage reached after it had already gone quiet (sent −20, due −70, quiet from −28): quiet from its own start, "!" there */
    const late = R(eye("late", [[Q.QUERIED, -120], [Q.PARTIAL_SENT, -20]], -70));
    expect(rowSegs(late, 42).filter((s) => s.k !== "stage").map((s) => [s.k, s.a, s.b, !!s.mark])).toEqual([["quiet", -20, 0, true]]);
    expect(isGoneQuiet(rows().find((x) => x.id === "quiet")!, 42)).toBe(true);
    expect(isGoneQuiet(rows().find((x) => x.id === "chase")!, 42)).toBe(false);
    /* with you and 50 days past a send-by date: its tail fades too, so it counts as gone quiet */
    expect(isGoneQuiet(R(eye("youOld", [[Q.QUERIED, -90], [Q.FULL_REQUESTED, -70]], -50)), 42)).toBe(true);
    /* gone quiet last: quiet (100/42, the most of its window used) drops below chase, you and offer; same under Needs chasing */
    expect(bwGroups(rows(), "all", 42)[0].rows.map((r) => r.id)).toEqual(["chase", "you", "offer", "quiet"]);
    expect(bwGroups(rows(), "chase", 42)[0].rows.map((r) => r.id)).toEqual(["chase", "quiet"]);
    /* within the gone-quiet ones, the same order (most of the window used first) */
    const q2 = R(eye("quiet2", [[Q.QUERIED, -200]], -150));
    expect(bwGroups([...rows(), q2], "all", 42)[0].rows.map((r) => r.id)).toEqual(["chase", "you", "offer", "quiet2", "quiet"]);
    /* no setting given: v3.2's order */
    expect(bwGroups(rows())[0].rows.map((r) => r.id)).toEqual(["quiet", "chase", "you", "offer"]);
    expect(makeWorld({ rows: rows(), filter: "all", vpW: 390, vpH: 784, bot: 88, quietDays: 42 }).G[0].rows.map((x) => x.r.id)).toEqual(["chase", "you", "offer", "quiet"]);
  });
  it("v3.1 the news: the manuscript's title only when two lines would start with the same agent's name", () => {
    const twin = (id: string, d: number) => R(eye(id, [[Q.QUERIED, -60], [Q.FULL_REQUESTED, d]], 10));
    const a = twin("a1", -2), b = twin("a2", -3), c = R(eye("solo", [[Q.QUERIED, -60], [Q.PARTIAL_REQUESTED, -1]], 10));
    b.name = a.name; c.name = "Agent solo";
    const titles: Record<string, string> = { a1: "The Salt Road", a2: "Low Tide", solo: "Unused" };
    const t = changes([a, b, c], -7, (id) => titles[id]).map((x) => x.t);
    expect(t).toEqual([`${a.name} (Low Tide) asked for the full`, `${a.name} (The Salt Road) asked for the full`, "Agent solo asked for a partial"]);
    /* single lines never carry it */
    expect(changes([a, c], -7, (id) => titles[id]).map((x) => x.t)).toEqual([`${a.name} asked for the full`, "Agent solo asked for a partial"]);
  });
  it("v3 the scrubber: what each row was doing that day; how many were out", () => {
    const r = (id: string) => rows().find((x) => x.id === id)!;
    expect([scrubLabel(r("five"), -93, QUIET), scrubLabel(r("five"), -10, QUIET), scrubLabel(r("five"), 10, QUIET)]).toEqual(["Partial asked", "Full sent", "Waiting"]);
    expect([scrubLabel(r("quiet"), -30, QUIET), scrubLabel(r("quiet"), -5, QUIET), scrubLabel(r("you"), 2, QUIET)]).toEqual(["Past its date", "Gone quiet", "To send"]);
    expect(scrubLabel(r("nodate"), -10, QUIET)).toBe("Waiting");
    expect(scrubLabel(r("plenty"), -60, QUIET)).toBeNull();
    expect(outOn(rows(), -110)).toBe(2);
    expect(outOn(rows(), 0)).toBe(8);
  });
  it("v3 the recap's figures and the timeline sheet's steps", () => {
    expect(recapStats(rows())).toEqual({ days: 150, sent: 9, replies: 5, requests: 3, offers: 1 });
    const s = sheetOf(rows().find((x) => x.id === "five")!, QUIET, NOW);
    expect(s.steps.map((x) => [x.k, x.t, x.cur])).toEqual([
      ["done", "Queried", false], ["done", "Partial asked for", false], ["done", "Partial sent", false], ["done", "Full asked for", false], ["done", "Full sent", true], ["next", "Reply due", false],
    ]);
    expect([s.line, s.cta]).toEqual(["Reply expected in 30 days.", "replied"]);
    const q = sheetOf(rows().find((x) => x.id === "quiet")!, QUIET, NOW);
    expect([q.steps.slice(-1)[0].k, q.line]).toEqual(["late", "It’s gone quiet. A last nudge, or time to let it go?"]);
    expect(sheetOf(rows().find((x) => x.id === "you")!, QUIET, NOW).steps.slice(-1)[0].t).toBe("Your send-by date");
    expect(sheetOf(rows().find((x) => x.id === "passed")!, QUIET, NOW).cta).toBeNull();
    expect([agoOf(0), agoOf(-1), agoOf(-9), agoOf(3)]).toEqual(["today", "1 day ago", "9 days ago", "in 3 days"]);
  });
});
