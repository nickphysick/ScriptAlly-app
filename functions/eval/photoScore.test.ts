/**
 * The photo evaluation's scorer (smart-import-photos-v1, phase 4): a perfect read scores 100%, and
 * each kind of mistake is counted where it belongs. Run over a truth file the renderer wrote.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { assembleResult } from "../src/assembleImport";
import { parseReply } from "../src/smartImportCore";
import { scorePhotoRead, perfectReply, srcHit, expectedCodes, type PhotoTruth } from "./photoScore";
import { PHOTO_LISTS } from "./photoLists";

const DIR = join("functions", "eval", "photo-truth");
const truth = (id: string) => JSON.parse(readFileSync(join(DIR, `${id}.json`), "utf8")) as PhotoTruth;
const read = (t: PhotoTruth, edit?: (v: any) => void) => {
  const p = parseReply(perfectReply(t));
  if (!p.ok) throw new Error("bad stub");
  edit?.(p.value);
  return assembleResult(p.value, { photos: { pageCount: t.pages } });
};

describe("the truth files", () => {
  it("one per list, 12 lists, 1–3 pages, 8–40 entries, every handwriting style present", () => {
    const files = readdirSync(DIR).filter((f) => f.endsWith(".json"));
    expect(files).toHaveLength(12);
    for (const l of PHOTO_LISTS) {
      const t = truth(l.id);
      expect(t.pages).toBeGreaterThanOrEqual(1); expect(t.pages).toBeLessThanOrEqual(3);
      expect(t.entries.length).toBeGreaterThanOrEqual(8); expect(t.entries.length).toBeLessThanOrEqual(40);
      for (const e of t.entries) { expect(e.band![0]).toBeLessThan(e.band![1]); expect(e.page).toBeLessThanOrEqual(t.pages); }
    }
    expect(new Set(PHOTO_LISTS.filter((l) => l.style === "hand").map((l) => l.font)).size).toBe(3);
    const all = PHOTO_LISTS.flatMap((l) => truth(l.id).entries);
    expect(all.some((e) => e.crossed) && all.some((e) => e.mark === "✓") && all.some((e) => e.mark === "✗") && all.some((e) => e.mark === "?") && all.some((e) => e.illegibleAgency)).toBe(true);
  });
});

describe("scorePhotoRead", () => {
  const t = truth("hand-caveat-1p");
  it("a perfect read scores every field, code and band", () => {
    const s = scorePhotoRead(t, read(t));
    expect(s.wrong).toEqual([]);
    expect(s.correct).toEqual({ name: t.entries.length, agency: t.entries.length, status: t.entries.length, date: t.entries.length });
    expect(s.src).toEqual({ hit: t.entries.length, of: t.entries.length });
  });
  it("a wrong name, a missed crossing-out and a band on the wrong line are each counted", () => {
    const crossed = t.entries.findIndex((e) => e.crossed);
    const s = scorePhotoRead(t, read(t, (v) => {
      v.agents[0].name = "Amara Brenan"; // one edit away: paired, but wrong
      v.queries[crossed].reasons = (v.queries[crossed].reasons ?? []).filter((c: string) => c !== "crossed-out");
      v.queries[1].src = { p: 1, y: [0.8, 0.85] };
    }));
    expect(s.correct.name).toBe(t.entries.length - 1);
    expect(s.codes["crossed-out"].fn).toBe(1);
    expect(s.src.hit).toBe(t.entries.length - 1);
  });
  it("a band must hold the line's centre, on its page, and be no taller than a quarter of the page", () => {
    const e = t.entries[0];
    const c = (e.band![0] + e.band![1]) / 2;
    expect(srcHit({ p: e.page, y: [c - 0.02, c + 0.02] }, e)).toBe(true);
    expect(srcHit({ p: e.page + 1, y: [c - 0.02, c + 0.02] }, e)).toBe(false);
    expect(srcHit({ p: e.page, y: [c + 0.01, c + 0.05] }, e)).toBe(false);
    expect(srcHit({ p: e.page, y: [0, 0.9] }, e)).toBe(false);
  });
  it("a tick raises nothing; ✗ and ? do", () => {
    expect([...expectedCodes({ ...t.entries[0], mark: "✓", crossed: false, date: "1/2" })]).toEqual([]);
    expect([...expectedCodes({ ...t.entries[0], mark: "✗", crossed: false, date: "1/2" })]).toEqual(["mark-unclear"]);
  });
});
