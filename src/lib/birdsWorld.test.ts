/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone Birds-eye world v2, phase 1 — the engine (lib/birdsWorld) against the ref's page script.
 */
import { describe, it, expect } from "vitest";
import { QueryStatus } from "../types";
import type { EyeRow } from "./qcBirdsEye";
import type { QcRow } from "./qcSummary";
import {
  BW_GROUPS, DAY, GAP, GPMAX, MAXZ_MIN, RH, RPMAX, RULE, TOPFIT, TOPFOLD, WX, XP,
  aheadTx, allH, barBox, bwCounts, bwGroups, bwRow, chipForCourt, clipR, dm, fadedBand, hasFig, headingTop, inPill, isNoDate, kk,
  makeWorld, noDateHere, num, outcomeWord, replayAt, replayStart, rowSegs, rulerMarks, sampleRows, setAxis, shortName, spaced, stageTx,
  zoomForRows, type BwRow,
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
  it("the groups, in order, Closed last and under All only; no-date queries are not drawn but footed under All and Waiting", () => {
    const g = bwGroups(rows());
    expect(g.map((x) => x.t)).toEqual(["Needs chasing", "Nearly there", "Plenty of time", "With you", "Closed"]);
    expect(g.map((x) => x.t)).toEqual(BW_GROUPS.filter((t) => g.some((x) => x.t === t)));
    expect(Object.fromEntries(g.map((x) => [x.t, x.rows.map((r) => r.id)]))).toEqual({
      "Needs chasing": ["quiet", "chase"], "Nearly there": ["near"], "Plenty of time": ["five", "plenty"], "With you": ["you", "offer"], Closed: ["passed"],
    });
    expect(bwGroups(rows(), "chase").map((x) => x.t)).toEqual(["Needs chasing"]);
    expect(bwGroups(rows(), "you").some((x) => x.t === "Closed")).toBe(false);
    expect(isNoDate(rows().find((x) => x.id === "nodate")!)).toBe(true);
    expect([noDateHere(rows(), "all").length, noDateHere(rows(), "wait").length, noDateHere(rows(), "chase").length, noDateHere(rows(), "you").length]).toEqual([1, 1, 0, 0]);
    /* the "All" layout's height sets the scale for every pill: five groups, eight drawn rows, the footer */
    expect(allH(rows())).toBe(5 * GAP + 8 * RH + 52 + 8);
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
    expect([dm(0, NOW), dm(-70, NOW)]).toEqual(["25 Nov", "16 Sept"]);
    expect(fadedBand(Q.QUERIED)).toBe("color-mix(in srgb,#efe6d6 45%,#fff)");
  });
  it("the ruler's tiers: months, then 4 / 2 / 1 weeks on Mondays, then every day — dates 64px apart, days 22px", () => {
    const ext = { D0: -164, D1: 71 };
    const tier = (ppd: number) => rulerMarks(ext, (d) => (d - ext.D0) * ppd, NOW);
    expect([1, 2.3, 4.6, 9.2, 24].map((p) => tier(p).tier)).toEqual(["months", "4w", "2w", "1w", "days"]);
    expect(tier(1).marks.map((m) => m[1]).slice(0, 3)).toEqual(["Jul", "Aug", "Sept"]);
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
    expect(w.maxZ).toBeCloseTo(Math.max(MAXZ_MIN, (48 / (RH * w.fitSY())) * 2.6), 9);
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
    /* time spans at least 90% of the width when fitted */
    expect(WX * s.SX(1)).toBeGreaterThanOrEqual(0.9 * 390);
    expect(zoomForRows(s, 48) * RH * s.fitSY()).toBeCloseTo(48, 6);
  });
  it("FZ: a short pill opens closer in, every row still fitting, up to 48px rows; the header folds only past it", () => {
    const all = world();
    expect(all.FZ).toBe(1);
    expect(all.fitView()).toEqual({ z: 1, ox: (390 - WX * all.SX(1)) / 2, oy: TOPFIT + RULE + 8 });
    const ch = world("chase");
    expect(ch.FZ).toBeGreaterThan(1);
    expect(ch.rowPx(ch.FZ)).toBeLessThanOrEqual(RPMAX + 1e-9);
    expect(ch.yOff(ch.H, ch.FZ)).toBeLessThanOrEqual(784 - TOPFIT - RULE - 88 - 8);
    expect([ch.topFor(ch.FZ), ch.topFor(ch.FZ + 0.051)]).toEqual([TOPFIT, TOPFOLD]);
    expect(ch.fitView().z).toBeCloseTo(ch.FZ, 9);
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
});
