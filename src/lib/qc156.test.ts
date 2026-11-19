/**
 * Query Centre v156 — the "this week" line's geometry (Phase 2); the Views panel's model retired (List filters v1).
 */
import { describe, expect, it } from "vitest";
import { LINE_H, LINE_W, lineAlt, lineGeometry, lineMonths } from "./qc156";

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

/* the Views panel's model (§6) retired with the panel in List filters v1 Phase 2: the Filter panel writes the quick
   fields through lib/qc153Rail `pickQuick` and the stages through lib/qc140 `toggleStage` (their own tests). */
