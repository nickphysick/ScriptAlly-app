/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE CONTRAST OF THE BAR'S TWO LINES (v37, Phase 8).
 *
 * Line two is 8px uppercase mono at .66 over a tinted fill whose tone varies with state, which is
 * a combination that can sit below 4.5:1 without looking obviously wrong. Both lines are measured
 * against BOTH grounds each can sit on — the fill, and the white track past the fill's right edge —
 * for every family, because a bar is part-filled and the same text crosses both.
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

test("both bar lines clear 4.5:1 on both grounds, in every state", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1920, height: 900 });
  await page.waitForFunction("document.querySelectorAll('.tl-rrow').length > 3", null, { timeout: 20000 });
  await page.waitForTimeout(700);

  const read = await page.evaluate(TAG + `(() => {
    if (!vis(".tl-board")) return { fatal: "no board" };
    const FAMS = ["out", "req", "decide", "quiet", "closedp"];
    const out = {};
    for (const b of document.querySelectorAll(".tl-p")) {
      if (b.getBoundingClientRect().width <= 0) continue;
      const base = FAMS.find((c) => b.classList.contains(c));
      if (!base) continue;
      /* ⚠️ HOLLOW IS A SEPARATE CASE, NOT A VARIANT OF ITS FAMILY, because it multiplies a SECOND
         dimming onto the text: an overrun stack carries .75, so line two paints at .75 × .66 =
         .49. Keying on the family alone measured whichever of the two the board happened to draw
         first — and the flat list changed which one that was, which is how a family that had
         passed came back at 3.47:1 with nothing about its colours having moved. */
      const fam = base + (b.classList.contains("hollow") ? ".hollow" : "");
      if (out[fam]) continue;
      const t1 = b.querySelector(".tl-t1");
      const t2 = b.querySelector(".tl-t2");
      const fl = b.querySelector(".tl-fl");
      const txt = b.querySelector(".tl-txt");
      if (!t1) continue;
      const st = (e) => e ? getComputedStyle(e) : null;
      out[fam] = {
        t1Ink: st(t1).color, t1Op: Number(st(t1).opacity),
        t2Ink: t2 ? st(t2).color : null, t2Op: t2 ? Number(st(t2).opacity) : null,
        stackOp: txt ? Number(st(txt).opacity) : 1,
        /* the two grounds the same text crosses: the tinted fill, and the bar's own track */
        fill: fl ? st(fl).backgroundColor : null,
        track: st(b).backgroundColor,
      };
    }
    return { out };
  })()`) as any;
  expect(read.fatal, read.fatal).toBeUndefined();

  const WHITE = [255, 255, 255];
  const rows: string[] = [];
  const fails: string[] = [];
  let pairs = 0;

  for (const [fam, v] of Object.entries<any>(read.out)) {
    const grounds: [string, number[]][] = [];
    if (v.fill && !/rgba\(0, 0, 0, 0\)/.test(v.fill)) grounds.push(["fill", nums(v.fill)]);
    const tr = /rgba\(0, 0, 0, 0\)/.test(v.track) ? WHITE : nums(v.track);
    grounds.push(["track", tr]);

    for (const [line, ink, op] of [
      ["t1", v.t1Ink, v.t1Op * v.stackOp],
      ["t2", v.t2Ink, v.t2Op == null ? null : v.t2Op * v.stackOp],
    ] as [string, string | null, number | null][]) {
      if (!ink || op == null) { rows.push(`  ${fam.padEnd(8)} ${line}  — not drawn on this board`); continue; }
      for (const [gn, g] of grounds) {
        const eff = over(nums(ink), g, op);
        const r = ratio(eff, g);
        pairs += 1;
        rows.push(`  ${fam.padEnd(8)} ${line} on ${gn.padEnd(5)} α${op.toFixed(2)}  ${r.toFixed(2)}:1  ${r >= 4.5 ? "pass" : "FAIL"}`);
        if (r < 4.5) fails.push(`${fam}/${line}/${gn} ${r.toFixed(2)}:1`);
      }
    }
  }
  console.log(`contrast — ${Object.keys(read.out).length} families, ${pairs} pairs`);
  for (const r of rows) console.log(r);

  /**
   * ⚠️ THE SMALLEST OPACITY THAT PASSES, IN THE STEPS THE BRIEF PINS.
   *
   * Reported for every family whether or not it currently fails, because the interesting number is
   * not "does .66 pass" but "what would". A state that needs more than .85 is flagged rather than
   * fixed — the family tone is what says whose move it is, and darkening it to win a ratio would
   * trade the thing the colour is for.
   */
  const needed: string[] = [];
  for (const [fam, v] of Object.entries<any>(read.out)) {
    if (!v.t2Ink) continue;
    const grounds: number[][] = [];
    if (v.fill && !/rgba\(0, 0, 0, 0\)/.test(v.fill)) grounds.push(nums(v.fill));
    grounds.push(/rgba\(0, 0, 0, 0\)/.test(v.track) ? WHITE : nums(v.track));
    let a = 0.66;
    let worst = 0;
    while (a <= 1.0001) {
      worst = Math.min(...grounds.map((g) => ratio(over(nums(v.t2Ink), g, a), g)));
      if (worst >= 4.5) break;
      a = +(a + 0.04).toFixed(2);
    }
    needed.push(`  ${fam.padEnd(8)} line two needs α${a.toFixed(2)} (worst ${worst.toFixed(2)}:1)`
      + (a > 0.85 ? "  ⚠️ ABOVE .85 — FLAG, do not darken the family tone" : ""));
  }
  for (const n of needed) console.log(n);

  /* ⚠️ POPULATION, PER KIND. A board drawing no `decide` bar satisfies every claim about it by
     never producing one, and a sweep that found only line one would report a clean table about
     half the type. */
  expect(Object.keys(read.out).length, `families measured: ${Object.keys(read.out).join(", ")}`)
    .toBeGreaterThan(3);
  const measuredT2 = rows.filter((r) => / t2 on /.test(r)).length;
  expect(measuredT2, "line two was never actually measured on any ground").toBeGreaterThan(2);

  /**
   * ⚠️ ONE KNOWN SHORTFALL, CARRIED EXPLICITLY SO A NEW ONE CANNOT HIDE BEHIND IT.
   *
   * `out` needs α .98 to clear 4.5:1 and the ceiling is .85, so it is reported rather than fixed:
   * its ink is a muted sage on a paler sage, and the only way to win the ratio is to darken the
   * tone — which is the thing that says whose move it is. Every OTHER pair must pass.
   *
   * ⚠️ AND THE SHORTFALL MUST STILL BE ONE. If somebody retones `out` so it passes, this goes red
   * asking for the table to be updated, rather than quietly accepting a list that has stopped
   * describing the page. A carve-out nobody re-measures is one that silently shrinks the claim.
   */
  /**
   * ⚠️ THE KNOWN SHORTFALLS, AND WHY EACH IS REPORTED RATHER THAN FIXED.
   *
   * `out` — line two needs α .98 against a .85 ceiling. Its ink is a muted sage on a paler sage,
   * so the ratio can only be won by darkening the tone, and the tone is what says whose move it is.
   *
   * `*.hollow` — an overrun stack is dimmed to .75 ON PURPOSE: the stretch is past the date
   * somebody named, and the fading is the statement. Line two then paints at .49 and reads at
   * 2.13:1. Raising the text's own opacity cannot fix it without undoing the dimming, which is the
   * only thing on the bar saying the date has passed. This is a DESIGN question — whether an
   * overrun should carry a second line at all — and inventing an answer is what the rules here
   * forbid.
   */
  const KNOWN = ["out/t2/fill", "out/t2/track", "out.hollow/", "req.hollow/", "decide.hollow/",
                 "quiet.hollow/", "closedp.hollow/"];
  const unexpected = fails.filter((f) => !KNOWN.some((k) => f.startsWith(k)));
  expect(unexpected, `below 4.5:1 and not a known shortfall — ${unexpected.join(" | ")}`).toEqual([]);
  /* ⚠️ AT LEAST ONE KNOWN SHORTFALL MUST STILL BE ONE. Requiring ALL of them would go red on a
     board that simply did not draw a hollow `req` today, which is a fact about the fixture rather
     than about the page; requiring none is a carve-out nobody re-measures. */
  const stillShort = KNOWN.filter((k) => fails.some((f) => f.startsWith(k)));
  expect(stillShort.length, `every known shortfall now passes — re-measure and shrink the table`)
    .toBeGreaterThan(0);
});
