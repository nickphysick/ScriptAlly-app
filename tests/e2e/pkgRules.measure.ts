/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * RULE 3 AS ARITHMETIC — the check that would have caught every failure in this saga.
 *
 * ⚠️ IT ASSERTS A RELATIONSHIP, NOT A PICTURE. Every earlier lock asked whether the band looked
 * right somewhere; none asked whether the artwork still REACHED the place the fade uncovers. That is
 * one inequality, it holds or it does not, and it is true or false at a width nobody screenshotted.
 */
import { test, expect } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";
import { readPng } from "./pngPixels";

/* the asset's own proportion, read from the file rather than assumed */
const ART_RATIO = 1600 / 192;

for (const width of [1280, 1440, 1920, 2560]) {
  test(`⚠️ RULE 3 — the artwork always reaches the reveal — ${width}`, async ({ page }) => {
    await openRoute(page, "/manuscripts/packages", { width, height: 900 });
    await liftMotionSuppression(page);
    await page.waitForTimeout(1100);
    const r = await page.evaluate(() => {
      const g = [...document.querySelectorAll(".wpg.pkgw-wpg")].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
      const mast = g.querySelector(".wpg-mast") as HTMLElement;
      const mb = mast.getBoundingClientRect();
      const cs = getComputedStyle(mast);
      const af = getComputedStyle(mast, "::after");
      const px = (v: string) => parseFloat(v);
      return {
        mastW: Math.round(mb.width), mastH: Math.round(mb.height),
        /**
         * ⚠️ THE CALC IS RESOLVED BY THE BROWSER, NOT PARSED. `--pkg-reveal-a` is
         * `calc(var(--pkg-text-right) + 60px)`, so reading the property returns that TEXT and
         * `parseFloat` gives NaN — which sailed through the inequality as a silent pass-shaped
         * failure until the message printed it. A throwaway element given that value as its width
         * hands back the number the mask is actually using.
         */
        revealA: (() => {
          const probe = document.createElement("div");
          probe.style.cssText = "position:absolute;visibility:hidden;height:0;width:var(--pkg-reveal-a)";
          mast.appendChild(probe);
          const w = probe.getBoundingClientRect().width;
          probe.remove();
          return Math.round(w);
        })(),
        size: af.backgroundSize, hasArt: /url\(/.test(af.backgroundImage),
      };
    });
    /* the artwork's rendered width follows from the band's height and the asset's ratio */
    const scale = parseFloat(/([\d.]+)%/.exec(r.size)?.[1] ?? "0") / 100;
    const artW = Math.round(r.mastH * scale * ART_RATIO);
    const gap = r.mastW - r.revealA;
    console.log(`  ${width}: measure ${r.mastW}x${r.mastH} · size ${r.size} → artwork ${artW}px · reveal at ${r.revealA} · gap to cover ${gap}`);
    expect(r.hasArt, `${width}: no artwork on the measure`).toBe(true);
    expect(scale, `${width}: the artwork is not sized by the band's height`).toBeGreaterThan(0);
    expect(artW, `${width}: the artwork is ${artW}px but the fade uncovers ${gap}px — there would be a gap between where the reveal opens and where the picture exists`).toBeGreaterThanOrEqual(gap);
  });
}

test("⚠️ SETTLED, THE MASTHEAD IS THE SHARED WASH — no artwork, no tint", async ({ page }) => {
  await openRoute(page, "/manuscripts/packages", { width: 1440, height: 900 });
  await liftMotionSuppression(page);
  await page.waitForTimeout(1100);
  await page.evaluate(async () => {
    const g = [...document.querySelectorAll(".wpg.pkgw-wpg")].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
    const sc = g.querySelector(".wpg-scroll") as HTMLElement;
    for (let t = 0; t <= 400; t += 20) { sc.scrollTop = t; await new Promise((r) => requestAnimationFrame(r)); }
  });
  await page.waitForTimeout(800);
  const g = await page.evaluate(() => {
    const grid = [...document.querySelectorAll(".wpg.pkgw-wpg")].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
    const ch = grid.querySelector(".wpg-chrome") as HTMLElement;
    const mast = grid.querySelector(".wpg-mast") as HTMLElement;
    const b = ch.getBoundingClientRect();
    return {
      stuck: ch.className.includes("wpg-chrome--stuck"),
      band: { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) },
      art: /url\(/.test(getComputedStyle(mast, "::after").backgroundImage),
      mastImg: getComputedStyle(mast).backgroundImage,
      chromeImg: getComputedStyle(ch).backgroundImage,
      washTop: getComputedStyle(grid).getPropertyValue("--mast-wash-top").trim(),
    };
  });
  expect(g.stuck, "the page did not settle — the claim is about the settled state").toBe(true);
  expect(g.art, "the artwork is still painted on a settled masthead").toBe(false);
  expect(g.mastImg, "the tint is still painted on a settled masthead").toBe("none");
  /* the shared wash is back on the slab: a gradient between the two wash tokens */
  const stops = g.chromeImg.match(/rgb\([^)]*\)/g) ?? [];
  expect(stops.length, `settled, the slab draws no wash (${g.chromeImg.slice(0, 50)})`).toBe(2);
  const png = readPng(await page.screenshot({ clip: { x: g.band.x, y: g.band.y, width: g.band.w, height: g.band.h } }));
  const row = Math.round(g.band.h * 0.5);
  const seen = new Set<string>();
  for (let x = 4; x < png.width - 4; x += 60) seen.add(png.at(x, row).join(","));
  console.log(`\n══ SETTLED — ${seen.size} distinct colours across the band's midline\n  ${[...seen].slice(0, 8).join("  ")}`);
  /* ⚠️ THE MIDLINE CROSSES THE TITLE, so ink is expected; what must NOT appear is the tint or the
     illustration. Both are absent above; this reports the spread rather than asserting a count. */
});
