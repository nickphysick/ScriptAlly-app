/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The compact strip (v21 §6) at 1100, 1280, 1440 and 1600 — and the one assertion §6 names in as
 * many words: no stage name may clip.
 *
 * ⚠️ `scrollWidth > clientWidth` IS THE RIGHT INSTRUMENT HERE, unlike on the marketing pages, because
 * the name IS a box that clips: a flex item with `min-width: 0` shrinks to nothing and its text
 * overflows silently. The fix is `min-content`, and this is what proves it holds at the width it
 * was failing at.
 */
import { expect, test } from "@playwright/test";
import { ensureSignedIn, openRoute } from "./measure";

test("the compact strip", async ({ page }) => {
  await ensureSignedIn(page);
  const report: string[] = [];
  let clipped = 0, names = 0;
  for (const w of [1100, 1280, 1440, 1600]) {
    await openRoute(page, "/queries?view=list", { width: w, height: 900 });
    await page.waitForSelector('[data-qcv="sum"]', { timeout: 30_000 });
    await page.waitForTimeout(1200);
    const out = await page.evaluate(() => {
      const q = (s: string) => document.querySelector(s) as HTMLElement | null;
      const r = (e: HTMLElement | null) => e ? { w: +e.getBoundingClientRect().width.toFixed(1), h: +e.getBoundingClientRect().height.toFixed(1) } : null;
      const labels = [...document.querySelectorAll<HTMLElement>(".qcv-stg-l")];
      const bad = labels.filter((e) => e.scrollWidth > e.clientWidth + 0.5).map((e) => e.textContent);
      const gauge = q(".qcv-ga");
      const live = q('[data-qcv="sum-live"]');
      return {
        liveCard: r(live),
        cardInner: live ? +(live.getBoundingClientRect().width).toFixed(1) : null,
        stage: r(q(".qcv-stg")),
        band: r(q('[data-qcv="sum-closed"]')),
        nNames: labels.length,
        clipped: bad,
        gaugeH: gauge ? getComputedStyle(gauge).height : null,
        gaugeGap: gauge ? getComputedStyle(gauge).marginTop : null,
        moreText: q('[data-qcv="gauge-more"]')?.textContent ?? null,
        /* ⚠️ THE WRAP IS THE LABEL TAKING THE FULL ROW, NOT THE LABEL SITTING LOWER. A centred
           single-line label inside a 32px header is already ~10px below the header's top, so a
           top-comparison reports "wrapped" at every width — which it did. */
        headerWrapped: (() => {
          const t = q(".qcv-stg-top"); const l = q(".qcv-stg-l");
          if (!t || !l) return null;
          return l.getBoundingClientRect().width > t.getBoundingClientRect().width * 0.9;
        })(),
      };
    });
    names += out.nNames; clipped += out.clipped.length;
    report.push(`${w}  live ${out.liveCard?.w}x${out.liveCard?.h} · stage ${out.stage?.w}x${out.stage?.h} · band ${out.band?.w}x${out.band?.h} · gauge ${out.gaugeH}/${out.gaugeGap} · wrapped ${out.headerWrapped} · names ${out.nNames} · clipped ${out.clipped.length}${out.clipped.length ? " " + JSON.stringify(out.clipped) : ""} · more "${out.moreText}"`);
    await page.screenshot({ path: `/private/tmp/qc-strip-${w}.png`, clip: { x: 0, y: 150, width: w, height: 420 } });
  }
  console.log("\n@@STRIP\n" + report.join("\n") + `\n\nnames measured ${names}, clipped ${clipped}`);
  /* the population first, so a run that measured nothing cannot report a clean sweep */
  expect(names, "no stage names were measured").toBeGreaterThan(20);
  expect(clipped, "a stage name is clipping").toBe(0);
});
