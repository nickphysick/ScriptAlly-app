/**
 * Query Centre v156 — the "this week" line's geometry (Phase 2) and the Views panel's model (Phase 4).
 */
import { describe, expect, it } from "vitest";
import { QueryStatus } from "../types";
import { emptyQc138Filters, type Qc138Filters } from "./qc138";
import { LINE_H, LINE_W, lineAlt, lineGeometry, lineMonths, moreActive156, selectView156, statusRows156, viewOf156, VIEWS_156 } from "./qc156";

/* the ref's own series (design-refs/query-centre-v156.html, the rendered path at 1920): goal 3, this week 2 */
const REF_SERIES = [1, 0, 2, 3, 1, 0, 2, 4, 1, 0, 1, 3, 1, 3, 4, 3, 3, 3, 4, 2];
const REF_LINE = "M0.0 55.5 L20.0 70.0 L40.0 40.9 L60.0 26.4 L80.0 55.5 L100.0 70.0 L120.0 40.9 L140.0 11.8 L160.0 55.5 L180.0 70.0 L200.0 55.5 L220.0 26.4 L240.0 55.5 L260.0 26.4 L280.0 11.8 L300.0 26.4 L320.0 26.4 L340.0 26.4 L360.0 11.8 L380.0 40.9";

describe("the this-week line (v156 §2)", () => {
  it("draws the ref's path, point for point, from the ref's 20-week series", () => {
    const g = lineGeometry(REF_SERIES, 3);
    expect(LINE_W).toBe(380);
    expect(LINE_H).toBe(74);
    expect(g.line).toBe(REF_LINE);
    expect(g.area).toBe(`${REF_LINE} L380 74 L0 74 Z`);
    expect(g.goalY).toBeCloseTo(26.3636, 3);
    expect(g.now).toEqual({ x: 380, y: expect.closeTo(40.909, 2) });
    expect(g.points).toHaveLength(20);
  });
  it("straight segments only: no curve commands", () => {
    expect(lineGeometry(REF_SERIES, 3).line).not.toMatch(/[CQSTA]/);
  });
  it("an all-zero series lies flat along the baseline, and the goal line still shows above it", () => {
    const g = lineGeometry(new Array(20).fill(0), 3);
    expect(g.points.every((p) => p.y === 70)).toBe(true);
    expect(g.line.startsWith("M0.0 70.0 L20.0 70.0")).toBe(true);
    expect(g.goalY).toBeLessThan(70);
    expect(g.goalY).toBeGreaterThan(0);
    expect(g.now).toEqual({ x: 380, y: 70 });
  });
  it("a week above the goal sets the scale, so nothing leaves the box", () => {
    const g = lineGeometry([0, 0, 12, 1], 3);
    expect(Math.min(...g.points.map((p) => p.y))).toBeGreaterThanOrEqual(0);
    expect(g.points[0].x).toBe(0);
    expect(g.points[3].x).toBe(380);
  });
  it("has a text alternative", () => {
    expect(lineAlt({ now: 2, goal: 3, weeks: REF_SERIES.map((count, i) => ({ start: "2026-07-06", count, met: count >= 3, current: i === 19 })) }))
      .toBe("Queries sent per week over the last 20 weeks. This week: 2 of 3.");
  });
  it("names the first month on the left and this month on the right", () => {
    expect(lineMonths([{ start: "2026-06-29" }, { start: "2026-07-06" }, { start: "2026-11-09" }])).toEqual({ first: "Jun", last: "Nov" });
  });
});

const F = (o: Partial<Qc138Filters> = {}): Qc138Filters => ({ ...emptyQc138Filters(), ...o });

describe("the Views panel (v156 §6)", () => {
  it("lists the five views with today's labels, All queries first", () => {
    expect(VIEWS_156.map((v) => v.label)).toEqual(["All queries", "Your move", "Overdue", "Waiting to hear back", "Offers"]);
  });
  it("selecting a view replaces the previous one", () => {
    const a = selectView156(F(), "you");
    expect(viewOf156(a)).toBe("you");
    const b = selectView156(a, "offers");
    expect(viewOf156(b)).toBe("offers");
    expect(b.you).toBe(false);
    expect(b.offers).toBe(true);
    /* selecting the selected view keeps it (a view is picked, never toggled off) */
    expect(viewOf156(selectView156(b, "offers"))).toBe("offers");
  });
  it("All queries clears the view, and leaves the status ticks alone", () => {
    const f = selectView156(F({ stages: [QueryStatus.QUERIED] }), "wait");
    const g = selectView156(f, "all");
    expect(viewOf156(g)).toBe("all");
    expect(g.you || g.waiting || g.offers || g.past).toBe(false);
    expect(g.stages).toEqual([QueryStatus.QUERIED]);
  });
  it("Overdue is the past field, as the quick filter wrote it", () => {
    expect(viewOf156(F({ past: true }))).toBe("over");
    expect(selectView156(F(), "over").past).toBe(true);
  });
  it("leaves out statuses at 0, unless ticked", () => {
    const rows = statusRows156({ q: 7, pr: 1, ps: 0, fr: 1, fs: 0, of: 1, rj: 2, nr: 0 }, F({ stages: [QueryStatus.NO_RESPONSE] }));
    expect(rows.map((r) => r.row.key)).toEqual(["q", "pr", "fr", "of", "rj", "nr"]);
    expect(rows.find((r) => r.row.key === "nr")?.on).toBe(true);
  });
  it("More filters is active for a round, a date filter, or Past their reply date under another view — not for the Overdue view itself", () => {
    expect(moreActive156(F())).toBe(false);
    expect(moreActive156(F({ sent: ["pkg1"] }))).toBe(true);
    expect(moreActive156(F({ dueWeek: true }))).toBe(true);
    expect(moreActive156(F({ missing: true }))).toBe(true);
    expect(moreActive156(F({ overYear: true }))).toBe(true);
    expect(moreActive156(F({ past: true }))).toBe(false);
    expect(moreActive156(F({ past: true, you: true }))).toBe(true);
  });
});
