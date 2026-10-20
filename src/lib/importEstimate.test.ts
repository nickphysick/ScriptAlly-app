import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { countDataRows, applyImportUpdate, PROGRESS_START, type LoaderProgress } from "./importEstimate";
import { bufferToCsv } from "./sheetText";

describe("countDataRows", () => {
  it("counts the rows under the header, skipping blank lines", () => {
    expect(countDataRows("Agent,Agency\nA,B\n,,\nC,D\n\n  \nE,F")).toBe(3);
    expect(countDataRows("")).toBe(0);
    expect(countDataRows("Agent,Agency")).toBe(0);
  });
  it("adds every sheet's rows, each under its own header", () => {
    expect(countDataRows("### Sheet: Active\nAgent\nA\nB\n### Sheet: Archive\nAgent\nC")).toBe(3);
  });
  it("over-counts non-data lines that are not blank — a title, a totals line (documented)", () => {
    expect(countDataRows("My tracker\nAgent,Agency\nA,B\nTotal: 1")).toBe(3);
  });
  it("never under-counts a fixture's true rows (locked against all of them)", () => {
    const m = JSON.parse(readFileSync(join("tests", "fixtures", "smart-eval", "manifest.json"), "utf8"));
    let exact = 0;
    for (const f of m.fixtures) {
      const truth = JSON.parse(readFileSync(f.expected, "utf8")).queries.length;
      const n = countDataRows(bufferToCsv(readFileSync(f.file)));
      expect(n, f.id).toBeGreaterThanOrEqual(truth);
      if (n === truth) exact++;
    }
    expect(exact).toBeGreaterThanOrEqual(38);
  });
});

describe("applyImportUpdate", () => {
  const at = (p: Partial<LoaderProgress>): LoaderProgress => ({ ...PROGRESS_START, rowsTotal: 150, ...p });
  it("start sets the total and opens", () => {
    expect(applyImportUpdate(at({ phase: "reading", rowsDone: 9 }), { type: "start", rowsTotal: 40 })).toEqual({ rowsTotal: 40, rowsDone: 0, phase: "opening", stream: "live" });
  });
  it("rows reads the raw count, never negative — and NOT capped: overshoot is footBar's to handle", () => {
    expect(applyImportUpdate(at({}), { type: "rows", rows: 12 })).toMatchObject({ phase: "reading", rowsDone: 12, stream: "live" });
    expect(applyImportUpdate(at({}), { type: "rows", rows: 999 }).rowsDone).toBe(999);
    expect(applyImportUpdate(at({}), { type: "rows", rows: -3 }).rowsDone).toBe(0);
  });
  it("retry starts the count again", () => {
    expect(applyImportUpdate(at({ phase: "reading", rowsDone: 40 }), { type: "retry" })).toMatchObject({ phase: "retry", rowsDone: 0 });
  });
  it("quiet drops to the clock only while still opening", () => {
    expect(applyImportUpdate(at({}), { type: "quiet" }).stream).toBe("none");
    expect(applyImportUpdate(at({ phase: "reading", rowsDone: 3 }), { type: "quiet" }).stream).toBe("live");
  });
  it("plain runs on the clock from the start; a later count brings it back to live", () => {
    const p = applyImportUpdate(at({ phase: "reading", rowsDone: 5 }), { type: "plain" });
    expect(p).toMatchObject({ phase: "opening", stream: "none", rowsDone: 0 });
    expect(applyImportUpdate(p, { type: "rows", rows: 1 }).stream).toBe("live");
  });
  it("result tidies", () => {
    expect(applyImportUpdate(at({ phase: "reading", rowsDone: 149 }), { type: "result" }).phase).toBe("tidying");
  });
});

// ── Phase 3: the foot bar's words ─────────────────────────────────────────────────────────────────
import { estSeconds, fmtEst, fmtLeft, leftRung, rungLabel, stepRung, secondsLeft, footBar, FOOT_READY, type FootInput } from "./importEstimate";
import { READY_TXT } from "../components/onboarding/ScatterSettleLoader";

describe("fmtEst", () => {
  it("names the three sizes the brief names", () => {
    expect(fmtEst(estSeconds(40))).toBe("about 30 seconds");
    expect(fmtEst(estSeconds(150))).toBe("about 2 minutes");
    expect(fmtEst(estSeconds(300))).toBe("about 3½ minutes");
  });
  it("covers every branch, at its edges", () => {
    expect(fmtEst(0)).toBe("a few seconds");
    expect(fmtEst(19.9)).toBe("a few seconds");
    expect(fmtEst(20)).toBe("about 20 seconds");
    expect(fmtEst(44)).toBe("about 40 seconds");
    expect(fmtEst(45)).toBe("about 50 seconds");
    expect(fmtEst(49.9)).toBe("about 50 seconds");
    expect(fmtEst(50)).toBe("about a minute");
    expect(fmtEst(79.9)).toBe("about a minute");
    expect(fmtEst(80)).toBe("about 1½ minutes");
    expect(fmtEst(105)).toBe("about 2 minutes");
    expect(fmtEst(135)).toBe("about 2½ minutes");
  });
});

describe("fmtLeft", () => {
  it("covers every branch, never a negative", () => {
    expect(fmtLeft(-20)).toBe("a few seconds left");
    expect(fmtLeft(9.9)).toBe("a few seconds left");
    expect(fmtLeft(10)).toBe("about 10 seconds left");
    expect(fmtLeft(44.9)).toBe("about 40 seconds left");
    expect(fmtLeft(45)).toBe("about a minute left");
    expect(fmtLeft(79.9)).toBe("about a minute left");
    expect(fmtLeft(80)).toBe("about 1½ minutes left");
    expect(fmtLeft(200)).toBe("about 3½ minutes left");
  });
  it("is exactly the rung ladder: every second from -5 to 400 reads the same both ways", () => {
    for (let s = -5; s <= 400; s += 0.5) expect(rungLabel(leftRung(s)), `${s}s`).toBe(fmtLeft(s));
  });
});

describe("stepRung", () => {
  it("takes the target when there is no previous label, else moves one rung towards it", () => {
    expect(stepRung(null, 9)).toBe(9);
    expect(stepRung(3, 9)).toBe(4);
    expect(stepRung(9, 3)).toBe(8);
    expect(stepRung(5, 5)).toBe(5);
  });
});

describe("secondsLeft", () => {
  it("uses the estimate for the first 6 rows, then the observed pace", () => {
    expect(secondsLeft(150, 0, 10)).toBeCloseTo(estSeconds(150) - 10);
    expect(secondsLeft(150, 5, 10)).toBeCloseTo(estSeconds(150) - 10);
    expect(secondsLeft(150, 6, 3.6)).toBeCloseTo(144 * 0.6 + 1);
  });
});

describe("footBar", () => {
  const base = (p: Partial<FootInput["progress"]>, x: Partial<FootInput> = {}): FootInput => ({
    progress: { rowsTotal: 150, rowsDone: 0, phase: "opening", stream: "live", ...p }, elapsedS: 0, sinceRetryS: 0, ready: false, rung: null, ...x,
  });
  it("opening: the row count and the estimate, and the shimmer", () => {
    expect(footBar(base({}))).toEqual({ left: "Opening your file…", right: "150 rows · about 2 minutes", fill: null, rung: null });
  });
  it("reading, no rows yet: the first rows, still the shimmer", () => {
    expect(footBar(base({ phase: "reading" }))).toMatchObject({ left: "Reading your first rows…", right: "150 rows · about 2 minutes", fill: null });
  });
  it("reading: the row, the time left, and the fill, capped at N", () => {
    const f = footBar(base({ phase: "reading", rowsDone: 75 }, { elapsedS: 45 }));
    expect(f.left).toBe("Reading row 75 of 150");
    expect(f.right).toBe("about a minute left"); // 75 × 0.6 + 1 = 46 s, past fmtLeft's 45 s edge
    expect(f.fill).toBeCloseTo(2 + 0.5 * 94);
    expect(footBar(base({ phase: "reading", rowsDone: 999 }, { elapsedS: 90 })).left).toBe("Reading row 150 of 150");
  });
  it("a count that reaches or passes the total: the text holds at N of N, the time says 'almost there', and the fill keeps rising but stays under 96% — only the result gives 100%", () => {
    const fills: number[] = [];
    for (const d of [140, 149, 150, 151, 160, 300, 10_000]) {
      const f = footBar(base({ phase: "reading", rowsDone: d }, { elapsedS: 90 }));
      fills.push(f.fill!);
      expect(f.fill!).toBeLessThan(96);
      if (d >= 150) expect(f).toMatchObject({ left: "Reading row 150 of 150", right: "almost there", rung: null });
    }
    for (let k = 1; k < fills.length; k++) expect(fills[k]).toBeGreaterThan(fills[k - 1]);
    expect(fills[0]).toBeCloseTo(2 + (140 / 150) * 94); // below N: exactly d / N, unchanged
    expect(footBar(base({ phase: "tidying", rowsDone: 10_000 })).fill).toBe(100);
  });
  it("retry: another look, a fresh estimate, and the fill back to 2%", () => {
    expect(footBar(base({ phase: "retry" }, { sinceRetryS: 0 }))).toMatchObject({ left: "Having another look…", right: "about 2 minutes left", fill: 2 });
  });
  it("tidying, and ready", () => {
    expect(footBar(base({ phase: "tidying", rowsDone: 140 }))).toEqual({ left: "Tidying records…", right: "almost there", fill: 100, rung: null });
    expect(footBar(base({ phase: "tidying" }, { ready: true }))).toEqual({ left: "Ready", right: "150 of 150 rows read", fill: 100, rung: null });
    expect(FOOT_READY).toBe(READY_TXT);
  });
  it("no stream: fills by the clock, held at 90%, then 'almost there'", () => {
    const a = footBar(base({ stream: "none" }, { elapsedS: 10 }));
    expect(a.left).toBe("Reading your file…");
    expect(a.fill).toBeCloseTo((10 / estSeconds(150)) * 100);
    expect(footBar(base({ stream: "none" }, { elapsedS: 100 })).fill).toBe(90);
    expect(footBar(base({ stream: "none" }, { elapsedS: 200 }))).toMatchObject({ right: "almost there", fill: 90 });
  });
  it("never moves the time left more than one rung between two updates, whatever the pace does", () => {
    // A jerky read: rows arrive in bursts, then stall; the label must still step one rung at a time.
    let rung: number | null = null, prev: number | null = null;
    const bursts = [6, 6, 6, 40, 40, 41, 41, 41, 41, 90, 90, 130, 131, 149];
    bursts.forEach((d, k) => {
      const f = footBar(base({ phase: "reading", rowsDone: d }, { elapsedS: 4 + k * 6, rung }));
      if (prev !== null && f.rung !== null) expect(Math.abs(f.rung - prev), `update ${k}`).toBeLessThanOrEqual(1);
      prev = f.rung; rung = f.rung;
    });
  });
});
