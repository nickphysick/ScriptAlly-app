/**
 * Query Centre v156.1 §1 — the streak leads the top right. The streak is the run of consecutive weeks that met the
 * target, counting back from this week; this week counts as soon as its target is met, and while it is not yet met it
 * neither adds nor breaks. Fixed weekly series, a 3-a-week target, now = Wed 11 Nov 2026 (w/c 9 Nov).
 */
import { describe, expect, it } from "vitest";
import { weekGoal154 } from "./qc154goal";
import { streakLead, targetLineWords } from "./qc1561";

const NOW = Date.UTC(2026, 10, 11, 12);
const WEEKLY3 = [{ target: 3, cadence: "week" as const, effectiveFrom: "2026-01-01" }];
const DAY = 86_400_000;
/** n sends in the week k weeks before this one (k = 0 is this week), each a few hours before now − 7k days */
const week = (k: number, n: number) => Array.from({ length: n }, (_, i) => NOW - k * 7 * DAY - (i + 1) * 3_600_000);
const lead = (...weeks: [number, number][]) => streakLead(weekGoal154(weeks.flatMap(([k, n]) => week(k, n)), WEEKLY3, NOW));
const SIX_MET: [number, number][] = [[1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3]];

describe("the streak-led top right", () => {
  it("six met weeks and this week one short → 6 week streak, 1 more this week to keep it going.", () => {
    const s = lead(...SIX_MET, [0, 2]);
    expect(s).toMatchObject({ k: 6, flame: true, title: "6 week streak", line: "1 more this week to keep it going." });
  });
  it("the same with this week met → 7 week streak, You've hit your target this week.", () => {
    const s = lead(...SIX_MET, [0, 3]);
    expect(s).toMatchObject({ k: 7, flame: true, title: "7 week streak", line: "You’ve hit your target this week." });
  });
  it("last completed week missed, this week empty → No streak yet, 3 this week starts one.", () => {
    const s = lead([2, 3], [3, 3], [1, 1]);
    expect(s).toMatchObject({ k: 0, flame: false, title: "No streak yet", line: "3 this week starts one." });
  });
  it("last completed week missed, this week met → 1 week streak (singular, no hyphen)", () => {
    const s = lead([2, 3], [1, 1], [0, 3]);
    expect(s).toMatchObject({ k: 1, flame: true, title: "1 week streak", line: "You’ve hit your target this week." });
  });
  it("no streak, one sent of three → 2 more this week starts one.", () => {
    expect(lead([0, 1])).toMatchObject({ k: 0, flame: false, title: "No streak yet", line: "2 more this week starts one." });
  });
  it("no queries at all → No streak yet, 3 this week starts one., no flame", () => {
    expect(lead()).toMatchObject({ k: 0, flame: false, title: "No streak yet", line: "3 this week starts one." });
  });
  it("this week in progress neither adds nor breaks: 6 met weeks, nothing yet this week → 6", () => {
    expect(lead(...SIX_MET).k).toBe(6);
  });
  it("the text alternative names the streak, its line and the line chart", () => {
    expect(lead(...SIX_MET, [0, 2]).alt).toBe("6 week streak. 1 more this week to keep it going. Queries sent per week over the last 20 weeks.");
  });
  it("the centre caption is the target's", () => {
    expect(targetLineWords(3)).toBe("your target · 3 a week");
  });
  it("no hyphenated streak and none of v156's strings", () => {
    const all = [lead(...SIX_MET, [0, 2]), lead(...SIX_MET, [0, 3]), lead([0, 1]), lead()].flatMap((s) => [s.title, s.line, s.alt]).join(" ");
    expect(all).not.toMatch(/-week|sent this week|keeps the streak|Goal met|to hit your goal|your goal/);
  });
});
