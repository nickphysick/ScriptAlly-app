/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE CONTRAST OF THE BAR'S TWO LINES (v37, Phase 8).
 *
 * Since v39 a card is ONE surface — white, or the cream a quiet card takes — because the fill is
 * deleted. Text no longer crosses from a tint onto a track, so the two-ground sweep collapses to
 * one; the shape is kept so a second ground can return if a card ever gains one.
 *
 * ⚠️ THE OPACITY IS COMPOSITED, NOT ASSUMED. `getComputedStyle(...).color` returns the DECLARED
 * ink; the .66 lives on the element as `opacity`, which multiplies at paint time. Reading the
 * colour alone would report the contrast of text nobody sees.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

const TAG = `
  const vis = (sel) => [...document.querySelectorAll(sel)]
    .find((e) => e.getBoundingClientRect().height > 0) || null;
`;

/** WCAG relative luminance, then the ratio. */
const lum = ([r, g, b]: number[]) => {
  const f = (c: number) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a: number[], b: number[]) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
/** ink over ground at alpha — what the eye actually receives */
const over = (ink: number[], ground: number[], a: number) =>
  ink.map((c, i) => c * a + ground[i] * (1 - a));
const nums = (s: string) => (s.match(/[\d.]+/g) || []).map(Number).slice(0, 3);

test("every word on a card clears 4.5:1 against the surface it sits on", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1920, height: 900 });
  await page.waitForFunction("document.querySelectorAll('.tl-rrow').length > 3", null, { timeout: 20000 });
  await page.waitForTimeout(700);

  const read = await page.evaluate(TAG + `(() => {
    if (!vis(".tl-board")) return { fatal: "no board" };
    /* ⚠️ A CARD IS ONE SURFACE SINCE v39 — white, or the cream a no-response takes — because the
       fill is deleted. So every word's ground is the card it sits on, and a pill's ground is its
       own fill. The pair is measured, never assumed from the token names. */
    const out = { pairs: [] };
    const seen = new Set();
    for (const c of document.querySelectorAll(".tl-p")) {
      if (c.getBoundingClientRect().width <= 0) continue;
      const base = ["out","req","decide","quiet","closedp"].find((x) => c.classList.contains(x)) || "?";
      /* ⚠️ HOLLOW IS ITS OWN CASE, because the ruling gives it its own ink — a stretch past its
         named date is transparent, dashed, and quieter in its words. Keying by family alone
         reported whichever of the two the board drew first, which is how a family that passes and
         a family that does not came back as one number. */
      const fam = base + (c.classList.contains("hollow") ? ".hollow" : "");
      const card = getComputedStyle(c).backgroundColor;
      for (const [what, sel] of [["headline", ".tl-hl"], ["detail", ".tl-cdt"]]) {
        const e = c.querySelector(sel);
        if (!e) continue;
        const k = fam + "/" + what;
        if (seen.has(k)) continue;
        seen.add(k);
        out.pairs.push({ k, ink: getComputedStyle(e).color, op: Number(getComputedStyle(e).opacity), ground: card });
      }
      const p = c.querySelector(".tl-pill");
      if (p) {
        const tone = [...p.classList].find((x) => x !== "tl-pill") || "?";
        const k = "pill." + tone;
        if (!seen.has(k)) {
          seen.add(k);
          out.pairs.push({ k, ink: getComputedStyle(p).color, op: Number(getComputedStyle(p).opacity),
                           ground: getComputedStyle(p).backgroundColor, over: card });
        }
      }
    }
    return out;
  })()`) as any;
  expect(read.fatal, read.fatal).toBeUndefined();

  const WHITE = [255, 255, 255];
  const solid = (c: string, under: number[]) => {
    const n = nums(c);
    const a = /rgba/.test(c) ? Number((c.match(/[\d.]+\)$/) || ["1)"])[0].replace(")", "")) : 1;
    return over(n, under, a);
  };
  const rows: string[] = [];
  const fails: string[] = [];
  for (const p of read.pairs) {
    const under = p.over ? solid(p.over, WHITE) : WHITE;
    const g = solid(p.ground, under);
    const eff = over(nums(p.ink), g, p.op);
    const r = ratio(eff, g);
    rows.push(`  ${String(p.k).padEnd(16)} α${p.op.toFixed(2)}  ${r.toFixed(2)}:1  ${r >= 4.5 ? "pass" : "FAIL"}`);
    if (r < 4.5) fails.push(`${p.k} ${r.toFixed(2)}:1`);
  }
  console.log(`contrast — ${read.pairs.length} pairs on the card`);
  for (const r of rows) console.log(r);

  /* ⚠️ POPULATION, PER KIND. A board drawing no pill satisfies every claim about pills by never
     drawing one, and a sweep that found only headlines would report a clean table about half the
     type on the card. */
  expect(read.pairs.filter((p: any) => /headline/.test(p.k)).length, "no headline measured").toBeGreaterThan(1);
  expect(read.pairs.filter((p: any) => /detail/.test(p.k)).length, "no detail measured").toBeGreaterThan(1);
  expect(read.pairs.filter((p: any) => /^pill\./.test(p.k)).length, "no pill measured").toBeGreaterThan(1);
  /**
   * ⚠️ THE DETAIL LINE IS A KNOWN SHORTFALL, AND IT CANNOT BE FIXED FROM HERE.
   *
   * `--card-dt` is `#8a7a6c` — the palette's `muted`, pinned by the pack and drawn by the ref —
   * and on white it reads 4.13:1. v37's shortfalls could be answered by raising an opacity; this
   * one is already at α1.00, so there is no headroom: the INK is too light, and darkening it means
   * changing a pinned value.
   *
   * ⚠️ AND IT IS ONE PAIR, NOT FOUR. Every family reports the same 4.13 because a card is
   * monochrome now — which is the colour law working, and the reason the number is worth acting on:
   * it is not one state's problem, it is every detail line on the board.
   *
   * Reported for Nick rather than resolved. Everything else on the card clears: headlines at
   * 17.5–18.3, and all three drawn pills between 4.66 and 14.59.
   */
  /**
   * ⚠️ THE CARVE-OUT MOVED WITH THE RULING, and both halves of that are worth stating.
   *
   * The DETAIL line was the shortfall part one flagged: `#8a7a6c` on white at 4.13:1 with no
   * opacity left to raise. The ruling changed the pinned ink to `#6f6055`, and it now measures
   * 6.03:1 — so that carve-out is GONE rather than kept as an exemption nobody re-measured.
   *
   * What is exempt now is the HOLLOW card, whose text the same ruling pins at `#9c8878`: on the
   * ground it reads 3.38:1, headline and detail alike. It is a deliberate quietening of a stretch
   * that has outlived its own date, and lifting it means changing a value the ruling set. Reported.
   */
  const KNOWN = /\.hollow\//;
  const unexpected = fails.filter((f) => !KNOWN.test(f.split(" ")[0]));
  expect(unexpected, `below 4.5:1 and not the known detail shortfall — ${unexpected.join(" | ")}`).toEqual([]);
  /* ⚠️ AND IT MUST STILL BE ONE. If the muted ink is ever darkened this goes red asking for the
     carve-out to be removed, rather than quietly keeping an exemption that has stopped applying. */
  expect(fails.length, "every known shortfall now clears 4.5:1 — remove this carve-out").toBeGreaterThan(0);
});
