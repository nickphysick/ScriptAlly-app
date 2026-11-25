/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone Birds-eye world v1, phase 1 — the engine (lib/birdsWorld) against the ref's own `world.js` maths.
 */
import { describe, it, expect } from "vitest";
import { QueryStatus } from "../types";
import type { EyeRow } from "./qcBirdsEye";
import type { QcRow } from "./qcSummary";
import { beLine } from "./qc150";
import {
  BW_GROUPS, DAY, GAP, GPMAX, GPMIN, MAXZ, RH, RPMAX, RULE, TOPFIT, TOPFOLD, WX, XP,
  aheadTx, axisExt, barBox, bwCounts, bwFilter, bwGroups, bwRow, chipForCourt, dm, groupOf, headingTop, level, makeWorld, num,
  rowSegs, rulerMarks, shortName, spaced, stageTx, zoomForRows, type BwRow,
} from "./birdsWorld";

const NOW = new Date(2026, 10, 25, 12).getTime();
const T0 = new Date(2026, 10, 25).getTime();
const at = (d: number) => T0 + d * DAY;
/** a row as the desktop derives it: spans (status, day), the current one last, and a reply date in days */
function eye(id: string, spans: [QueryStatus, number][], due: number | null, kind: "reply" | "sendBy" = "reply"): EyeRow {
  const status = spans[spans.length - 1][0];
  const row = {
    id, agentName: `Agent ${id}`, agency: "Hale & Finch", status,
    expectedMs: due == null ? null : at(due), expectedKind: due == null ? null : kind,
    stageStartMs: at(spans[spans.length - 1][1]), sentMs: at(spans[0][1]),
    history: { spans: spans.map(([s, d], i) => ({ status: s, startMs: at(d), endMs: i < spans.length - 1 ? at(spans[i + 1][1]) : null, current: i === spans.length - 1 })), currentStartMs: at(spans[spans.length - 1][1]), dated: true },
  } as unknown as QcRow;
  return { id, row, court: "agent" } as unknown as EyeRow;
}
const Q = QueryStatus;
const rows = (): BwRow[] => [
  /* the ref's b0: five stages, then past its date */
  eye("a", [[Q.QUERIED, -150], [Q.PARTIAL_REQUESTED, -96], [Q.PARTIAL_SENT, -90], [Q.FULL_REQUESTED, -44], [Q.FULL_SENT, -40]], -40 + 70),
  eye("b", [[Q.QUERIED, -60]], -60 + 56),
  eye("c", [[Q.QUERIED, -51]], -51 + 42),
  eye("d", [[Q.QUERIED, -45]], -45 + 56),
  eye("e", [[Q.QUERIED, -40], [Q.PARTIAL_REQUESTED, -11]], -11 + 14, "sendBy"),
  eye("f", [[Q.QUERIED, -100]], -100 + 42),
  eye("g", [[Q.QUERIED, -20]], null),
  eye("h", [[Q.QUERIED, -6]], 50),
].map((e) => bwRow(e, NOW));

describe("Phone Birds-eye world v1 — the engine", () => {
  it("the premise: beLine gives every dated stage before the current one and the current one, with real start dates", () => {
    const l = beLine(eye("a", [[Q.QUERIED, -150], [Q.PARTIAL_REQUESTED, -96], [Q.FULL_SENT, -40]], 30), NOW);
    expect(l.past.map((b) => b.fromMs)).toEqual([at(-150), at(-96)]);
    expect(l.cur?.fromMs).toBe(at(-40));
  });
  it("a row's stages are read in days from today, each with its own status", () => {
    const a = rows()[0];
    expect(a.ev.map((e) => e.d)).toEqual([-150, -96, -90, -44, -40]);
    expect(a.ev.map((e) => e.status)).toEqual([Q.QUERIED, Q.PARTIAL_REQUESTED, Q.PARTIAL_SENT, Q.FULL_REQUESTED, Q.FULL_SENT]);
    expect(a.start).toBe(-40);
    expect(a.due).toBe(30);
    expect(a.kk).toBeCloseTo(40 / 70, 6);
  });
  it("the groups, in order: Past its date · Nearly there · Plenty of time · Waiting on you · No date; most elapsed first", () => {
    const g = bwGroups(rows());
    expect(g.map((x) => x.t)).toEqual(BW_GROUPS.filter((t) => g.some((x) => x.t === t)));
    expect(g.map((x) => x.t)).toEqual(["Past its date", "Nearly there", "Plenty of time", "Waiting on you", "No date"]);
    const ids = Object.fromEntries(g.map((x) => [x.t, x.rows.map((r) => r.id)]));
    /* f: 100 of 42 days; c: 51 of 42; b: 60 of 56 */
    expect(ids["Past its date"]).toEqual(["f", "c", "b"]);
    expect(ids["Waiting on you"]).toEqual(["e"]);
    expect(ids["No date"]).toEqual(["g"]);
    for (const x of g) for (let i = 1; i < x.rows.length; i++) if (x.t !== "No date") expect(x.rows[i - 1].kk!).toBeGreaterThanOrEqual(x.rows[i].kk!);
    /* the thresholds: 1 and over, 0.75 to under 1, under 0.75 */
    const k = (kk: number) => groupOf({ ...rows()[1], kk, due: 5, you: false });
    expect([k(1), k(0.9999), k(0.75), k(0.7499)]).toEqual(["Past its date", "Nearly there", "Nearly there", "Plenty of time"]);
  });
  it("the chips filter, and their counts never change with the filter", () => {
    const r = rows();
    expect(bwCounts(r)).toEqual({ all: 8, past: 3, week: 1, you: 1 });
    expect(bwFilter(r, "past").map((x) => x.id).sort()).toEqual(["b", "c", "f"]);
    expect(bwFilter(r, "week").map((x) => x.id)).toEqual(["e"]);
    expect(bwGroups(r, "you").map((g) => g.t)).toEqual(["Waiting on you"]);
    expect(chipForCourt("you")).toBe("you");
    expect(chipForCourt("quiet")).toBe("past");
    expect(chipForCourt("agent")).toBe("all");
  });
  it("segments on the reply axis: stages end to end, then past its date to today (hatched) — the reply date at 0", () => {
    const f = rows().find((x) => x.id === "f")!;
    const s = rowSegs(f, "reply");
    expect(s.map((x) => [x.k, x.a, x.b])).toEqual([["stage", -42, 0], ["past", 0, 58]]);
    const a = rowSegs(rows()[0], "reply");
    expect(a.map((x) => [x.k, x.a, x.b])).toEqual([["stage", -180, -126], ["stage", -126, -120], ["stage", -120, -74], ["stage", -74, -70], ["stage", -70, -30], ["ahead", -30, 0]]);
    expect(a[0].first && !a[0].last && a[4].last).toBe(true);
  });
  it("segments on the calendar: today at 0, still to come dashed to the reply date; no date runs to today only", () => {
    const h = rowSegs(rows().find((x) => x.id === "h")!, "calendar");
    expect(h.map((x) => [x.k, x.a, x.b])).toEqual([["stage", -6, 0], ["ahead", 0, 50]]);
    const g = rowSegs(rows().find((x) => x.id === "g")!, "calendar");
    expect(g.map((x) => [x.k, x.a, x.b])).toEqual([["stage", -20, 0]]);
    expect(rowSegs(rows().find((x) => x.id === "g")!, "reply").map((x) => x.k)).toEqual(["stage"]);
  });
  it("the figure: the number and its unit (ref `num`)", () => {
    expect(num({ due: -56 })).toEqual(["8", "wks past"]);
    expect(num({ due: -10 })).toEqual(["10", "days past"]);
    expect(num({ due: -1 })).toEqual(["1", "day past"]);
    expect(num({ due: 12 })).toEqual(["12", "days to go"]);
    expect(num({ due: 1 })).toEqual(["1", "day to go"]);
    expect(num({ due: 28 })).toEqual(["4", "wks to go"]);
    expect(num({ due: null })).toEqual(["", "No date"]);
    for (const d of [-80, -3, 0, 5, 40]) expect(num({ due: d }).join(" ")).not.toMatch(/overdue|\blate\b/i);
  });
  it("in-bar words: SHORT names, and stageTx drops name and date, then the date, then the name", () => {
    expect([Q.QUERIED, Q.PARTIAL_REQUESTED, Q.PARTIAL_SENT, Q.FULL_REQUESTED, Q.FULL_SENT, Q.OFFER, Q.REJECTED].map(shortName))
      .toEqual(["Queried", "Partial asked", "Partial sent", "Full asked", "Full sent", "Offer", "Passed"]);
    const n = "Partial asked", d = "16 Nov";
    const both = n.length * 7.4 + d.length * 6.6 + 24, name = n.length * 7.4 + 18, date = d.length * 6.6 + 18;
    expect(stageTx(n, d, both)).toBe("both");
    expect(stageTx(n, d, both - 1)).toBe("name");
    expect(stageTx(n, d, name - 1)).toBe("date");
    expect(stageTx(n, d, date - 1)).toBe("none");
    expect(aheadTx("Reply by", "14 Jan", 200)).toBe("Reply by 14 Jan");
    expect(aheadTx("Reply by", "14 Jan", 70)).toBe("14 Jan");
    expect(aheadTx("Reply by", "14 Jan", 30)).toBe("");
    expect(dm(0, NOW)).toBe("25 Nov");
  });
  it("the ruler: weeks either side of the reply date, months on the calendar, at least 52px apart", () => {
    const ext = axisExt([], "reply");
    expect(ext).toEqual({ D0: -140, D1: 70, lab: "Reply due" });
    const X = (d: number) => (d - ext.D0) * 2;
    const m = rulerMarks("reply", ext, X, NOW);
    expect(m.map((x) => x[1])).toEqual(["−20 wks", "−16 wks", "−12 wks", "−8 wks", "−4 wks", "+4 wks", "+8 wks"]);
    const s = spaced(m.map(([x, t]) => [x / 2, t] as [number, string]));
    for (let i = 1; i < s.length; i++) expect(s[i][0] - s[i - 1][0]).toBeGreaterThanOrEqual(52);
    expect(s.length).toBeLessThan(m.length);
    const cal = rulerMarks("calendar", axisExt([], "calendar"), X, NOW).map((x) => x[1]);
    expect(cal).toEqual(["Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan"]);
    /* the ref's extents, whatever the data (a stage beyond them is held at the edge by wxd) */
    expect(axisExt(rows(), "reply")).toEqual({ D0: -140, D1: 70, lab: "Reply due" });
    expect(axisExt(rows(), "calendar")).toEqual({ D0: -180, D1: 60, lab: "Today" });
    const w = makeWorld({ groups: bwGroups(rows()), ext: axisExt(rows(), "reply"), vpW: 390, vpH: 784, bot: 90 });
    expect(w.wxd(-400)).toBe(0);
    expect(w.wxd(400)).toBe(WX);
  });
  const world = (vpH = 784, land = false) => makeWorld({ groups: bwGroups(rows()), ext: axisExt(rows(), "reply"), vpW: 390, vpH, bot: 90, land });
  it("the scales: SX grows as z^0.25 then faster from the Timeline level; SY = fitSY·z; fitSY up to 3×", () => {
    const w = world();
    expect(w.fitS()).toBeCloseTo((390 - 32) / WX, 9);
    expect(w.fitSY()).toBeCloseTo(Math.min(w.fitS() * 3, (784 - TOPFIT - RULE - 90) / (w.H + 8)), 9);
    /* the fitted rows end inside the screen, whatever the campaign's size */
    for (const n of [3, 22, 60]) {
      const many = makeWorld({ groups: [{ t: "Plenty of time", rows: Array.from({ length: n }, () => rows()[3]) }], ext: axisExt(rows(), "reply"), vpW: 390, vpH: 784, bot: 90 });
      const f = many.fitView();
      /* the ref's own fit leaves its 8px top margin to the reserve: within 8px of it, never into the dock */
      expect(f.oy + many.yOff(many.H - 12, 1)).toBeLessThanOrEqual(784 - 90 + 8);
      /* and rows can always be zoomed to 100px */
      expect(many.rowPx(many.maxZ)).toBe(RPMAX);
      expect(many.maxZ).toBeGreaterThanOrEqual(MAXZ);
    }
    expect(w.zT()).toBeCloseTo(86 / (RH * w.fitSY()), 9);
    const z = Math.min(w.zT() * 0.9, 1.5);
    expect(w.SX(z)).toBeCloseTo(w.fitS() * Math.pow(z, XP), 9);
    const z2 = w.zT() * 1.5;
    expect(w.SX(z2)).toBeCloseTo(w.fitS() * Math.pow(z2, XP) * (1 + 0.5 * 3), 9);
    expect(w.SY(2)).toBeCloseTo(w.fitSY() * 2, 9);
  });
  it("a long campaign fits with its gaps at the 30px floor, so headings never overlap", () => {
    const many = makeWorld({ groups: bwGroups(Array.from({ length: 70 }, (_, i) => ({ ...rows()[i % 8], id: `r${i}` }))), ext: axisExt([], "reply"), vpW: 390, vpH: 784, bot: 90 });
    expect(many.gapPx(1)).toBe(GPMIN);
    const last = many.fitView().oy + many.yOff(many.H - 12, 1);
    expect(last).toBeLessThanOrEqual(784 - 90 + 8);
    expect(last).toBeGreaterThan(784 - 90 - 24);
  });
  it("rows grow to 100px and gaps to 44px; the bent mapping round-trips within 0.5px", () => {
    const w = world();
    for (const z of [1, 2, 4, w.maxZ]) {
      expect(w.rowPx(z)).toBeLessThanOrEqual(RPMAX);
      expect(w.gapPx(z)).toBeLessThanOrEqual(GPMAX);
      for (let wy = 0; wy <= w.H; wy += 7.3) expect(Math.abs(w.yOff(w.yWorld(w.yOff(wy, z), z), z) - w.yOff(wy, z))).toBeLessThan(0.5);
    }
    expect(w.rowPx(w.maxZ)).toBe(RPMAX);
    expect(w.gapPx(w.maxZ)).toBe(GPMAX);
    /* the first row starts one gap in */
    expect(w.yOff(GAP, 1)).toBeCloseTo(w.gapPx(1), 6);
    expect(zoomForRows(w, 56) * RH * w.fitSY()).toBeCloseTo(56, 6);
  });
  it("clamp, fitView and topFor: the header folds past z 1.05, and the world's top follows it", () => {
    const w = world();
    expect(w.topFor(1)).toBe(TOPFIT);
    expect(w.topFor(1.06)).toBe(TOPFOLD);
    expect(w.fitView()).toEqual({ z: 1, ox: (390 - WX * w.SX(1)) / 2, oy: TOPFIT + RULE + 8 });
    expect(w.clamp({ z: 99, ox: 0, oy: 0 }).z).toBe(w.maxZ);
    expect(w.maxZ).toBe(Math.max(MAXZ, (1.3 * RPMAX) / (RH * w.fitSY())));
    expect(w.clamp({ z: 0.2, ox: 0, oy: 0 }).z).toBe(1);
    const c = w.clamp({ z: 3, ox: 9999, oy: 9999 });
    expect(c.ox).toBe(16);
    expect(c.oy).toBe(TOPFOLD + RULE + 8);
    const c2 = w.clamp({ z: 3, ox: -99999, oy: -99999 });
    expect(c2.ox).toBeCloseTo(390 - WX * w.SX(3) - 16, 6);
    expect(c2.oy).toBeCloseTo(784 - w.yOff(w.H, 3) - 90, 6);
    /* landscape: folded from the start */
    const l = world(390, true);
    expect(l.topFor(1)).toBe(TOPFOLD);
    expect(l.fitView().oy).toBe(TOPFOLD + RULE + 8);
  });
  it("levels, bars and headings by row height (ref `draw()`)", () => {
    expect([10, 22, 30, 44, 56, 72, 84, 86, 100].map(level)).toEqual(["Overview", "Names", "Names", "Figures", "Figures", "Dates", "Dates", "Timeline", "Timeline"]);
    expect(barBox(12, 0)).toEqual({ th: 6, by: 3, tall: false });
    expect(barBox(30, 0).th).toBe(5);
    expect(barBox(56, 0).th).toBe(8);
    expect(barBox(100, 0)).toEqual({ th: 26, by: 100 - 12 - 26, tall: true });
    /* natural, pinned under the ruler, pushed away by the next */
    expect(headingTop(300, 44, 600, 96, false)).toEqual({ hy: 300 + 44 - 28 - 6, hh: 28, pinned: false });
    expect(headingTop(50, 44, 600, 96, false)).toEqual({ hy: 96 + RULE, hh: 28, pinned: true });
    expect(headingTop(-400, 44, 140, 96, false).hy).toBe(140 - 28 - 2);
  });
});
