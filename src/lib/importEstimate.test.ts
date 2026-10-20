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
    expect(footBar(base({}))).toEqual({ left: "Opening your file…", right: "150 rows · about 2 minutes", fill: null, rung: null, hold: null });
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
    expect(footBar(base({ phase: "tidying", rowsDone: 140 }))).toEqual({ left: "Tidying records…", right: "almost there", fill: 100, rung: null, hold: null });
    expect(footBar(base({ phase: "tidying" }, { ready: true }))).toEqual({ left: "Ready", right: "150 of 150 rows read", fill: 100, rung: null, hold: null });
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

/* ── The live run's follow-ups (reports/smart-import-loader-v2/live-dev-150.json) ─────────────────
 * The replay drives footBar exactly as ScatterSettleLoader does: one update per streamed count and
 * one per second of the loader's clock, each fed the previous result's smoothing state. The clock
 * starts when the loader mounted (the first bar state the page recorded), not at the click. */
interface LiveRecord { rowsTotal: number; resultS: number; streamed: { t: number; rows: number }[]; ui: { t: number }[] }
const LIVE: LiveRecord = JSON.parse(readFileSync(join(process.cwd(), "reports/smart-import-loader-v2/live-dev-150.json"), "utf8"));
type Shown = { t: number; right: string; rung: number | null };
function replayLive(): Shown[] {
  const mount = LIVE.ui[0].t, N = LIVE.rowsTotal;
  const ticks: number[] = [];
  for (let t = mount; t < LIVE.resultS; t += 1) ticks.push(t);
  const times = [...new Set([...ticks, ...LIVE.streamed.map((s) => s.t)])].filter((t) => t < LIVE.resultS).sort((a, b) => a - b);
  let p: LoaderProgress = applyImportUpdate(PROGRESS_START, { type: "start", rowsTotal: N });
  let k = 0, rung: number | null = null, hold: unknown = null, firstRow: { atS: number; rows: number } | null = null;
  const out: Shown[] = [];
  for (const t of times) {
    while (k < LIVE.streamed.length && LIVE.streamed[k].t <= t) {
      p = applyImportUpdate(p, { type: "rows", rows: LIVE.streamed[k].rows });
      if (!firstRow && p.rowsDone >= 1) firstRow = { atS: LIVE.streamed[k].t - mount, rows: p.rowsDone };
      k++;
    }
    const f = footBar({ progress: p, elapsedS: t - mount, sinceRetryS: 0, ready: false, rung, hold, firstRow } as FootInput) as ReturnType<typeof footBar> & { hold?: unknown };
    out.push({ t, right: f.right, rung: f.rung });
    rung = f.rung; hold = f.hold ?? null;
  }
  return out;
}
/** The seconds each label can mean, [lo, hi), from fmtLeft's own edges. */
const band = (r: string): [number, number] | null => {
  if (r.startsWith("a few seconds")) return [0, 10];
  const m = /about (\d+) seconds/.exec(r); if (m) return [+m[1] - 5, +m[1] + 5];
  if (r.startsWith("about a minute")) return [45, 80];
  const n = /about (\d)(½?) minutes/.exec(r); if (n) { const v = (+n[1] + (n[2] ? 0.5 : 0)) * 60; return [v - 15, v + 15]; }
  return null;
};
const labelChanges = (shown: Shown[]) => shown.filter((s, i) => i > 0 && s.right !== shown[i - 1].right);

describe("the time left on the live 150-row read", () => {
  it("1 · moves to a new label only once it has held 2 s, and never flips back", () => {
    const shown = replayLive().filter((s) => /left$/.test(s.right));
    const changes = labelChanges(shown);
    expect(changes.length, "the countdown moved at all").toBeGreaterThan(5);
    for (let i = 1; i < changes.length; i++)
      expect(changes[i].t - changes[i - 1].t, `"${changes[i - 1].right}" → "${changes[i].right}" at ${changes[i].t.toFixed(1)} s`).toBeGreaterThanOrEqual(2);
    // A → B → A within 10 s is a flicker, whatever the spacing.
    const all = [shown[0], ...changes];
    for (let i = 2; i < all.length; i++)
      if (all[i].right === all[i - 2].right) expect(all[i].t - all[i - 2].t, `flip back to "${all[i].right}" at ${all[i].t.toFixed(1)} s`).toBeGreaterThan(10);
  });
  it("1 · never steps back by more than one rung", () => {
    const shown = replayLive().filter((s) => s.rung !== null);
    for (let i = 1; i < shown.length; i++) expect(shown[i].rung! - shown[i - 1].rung!).toBeLessThanOrEqual(1);
  });
});

describe("the time left against what was really left, on the live read", () => {
  const judged = () => replayLive().map((s) => ({ ...s, left: LIVE.resultS - s.t, band: band(s.right) })).filter((s) => s.band);
  it("2 · never says more than ~20 s beyond what is left (it said 'about 2½ minutes' with 84 s to go)", () => {
    for (const s of judged()) expect(s.band![0] - s.left, `"${s.right}" with ${s.left.toFixed(0)} s left`).toBeLessThanOrEqual(20);
  });
  it("3 · at the end, never more than 5 s early: in the last 30 s the time left is inside the label's band + 5 s", () => {
    // Guard, not a fix: by this measure the end was already 0.4 s at worst before the hold; with it,
    // 0.0. No tidy allowance was added — tidying took 0.1 s on the live read (last count 90.72 s,
    // result 90.84 s). "a few seconds left" now first shows 8 s before the end (it was 10).
    const end = judged().filter((s) => s.left < 30);
    expect(end.length).toBeGreaterThan(10);
    for (const s of end) expect(s.left - s.band![1], `"${s.right}" with ${s.left.toFixed(1)} s left`).toBeLessThanOrEqual(5);
  });
});

describe("the pace, from the first counted row", () => {
  const base = (d: number, elapsedS: number, firstRow: { atS: number; rows: number } | null) =>
    ({ progress: { rowsTotal: 150, rowsDone: d, phase: "reading", stream: "live" }, elapsedS, sinceRetryS: 0, ready: false, rung: null, hold: null, firstRow } as FootInput);
  it("2 · start-up time does not count: 3.6 s for 6 rows after the first is 0.6 s a row", () => {
    // first row at 4 s, row 7 at 7.6 s → 0.6 s a row → 143 × 0.6 + 1 = 86.8 s → "about 1½ minutes".
    expect(footBar(base(7, 7.6, { atS: 4, rows: 1 })).right).toBe("about 1½ minutes left");
  });
  it("2 · keeps the estimate until 6 rows have arrived", () => {
    expect(footBar(base(5, 30, { atS: 4, rows: 1 })).right).toBe(footBar(base(5, 30, null)).right);
    expect(footBar(base(5, 30, { atS: 4, rows: 1 })).right).toBe(`${fmtEst(estSeconds(150) - 30)} left`);
  });
  it("2 · early on, never more than the original estimate (no 'about 2½ minutes' on a 2-minute file)", () => {
    // A slow start: 7 rows in by 30 s. The estimate has 75.5 s left; the pace alone would say ~10 min.
    const f = footBar(base(7, 30, { atS: 4, rows: 1 }));
    expect(f.rung!).toBeLessThanOrEqual(leftRung(estSeconds(150) - 30));
    expect(f.right).toBe("about a minute left");
  });
});

describe("before the total is known", () => {
  it("4 · never says '0 rows': the right-hand text is empty", () => {
    const at = (p: Partial<LoaderProgress>) => footBar({ progress: { ...PROGRESS_START, ...p }, elapsedS: 0, sinceRetryS: 0, ready: false, rung: null } as FootInput).right;
    expect(at({})).toBe("");
    expect(at({ phase: "reading" })).toBe("");
    expect(at({ stream: "none" })).toBe("");
    for (const p of [{}, { phase: "reading" as const }, { stream: "none" as const }]) expect(at(p)).not.toMatch(/\b0 rows/);
  });
});
