/**
 * Smart Import from photos v1.1, issue 6 — the corner hawk's resting place after his sequence.
 *   npm run e2e:emu -- tests/e2e/hawkRest.measure.ts
 *
 * HR1: his box on the loading page, once the sequence is over, is his box on the loaded dashboard,
 * to within 1px, at 1440 × 900 and 1280 × 800. Both are the one Dash2Hawk; this proves the loading
 * page mounts him where the dashboard does (the set-up frame is a different shell around him).
 * HR_MUTATE=offset moves the loading page's hawk 6px, and the lock must go red.
 */
import { test, expect, type Page } from "@playwright/test";
import { openRoute } from "./measure";

const MUT = process.env.HR_MUTATE ?? "";
const box = (page: Page) => page.evaluate(() => {
  const r = document.querySelector('[data-d2="hawk"] .d2-rise')?.getBoundingClientRect();
  return r ? [r.left, r.top, r.width, r.height].map((v) => Math.round(v * 10) / 10) : null;
});

for (const vp of [{ width: 1440, height: 900 }, { width: 1280, height: 800 }]) {
  test(`HR1 · the hawk rests where the dashboard draws him · ${vp.width}`, async ({ page }) => {
    await openRoute(page, "/dashboard", vp);
    await page.waitForSelector('[data-d2="hawk"]');
    await page.waitForFunction(() => document.querySelector('.d58-page[data-loading="0"]'), null, { timeout: 30_000 });
    const loaded = await box(page);
    if (process.env.HR_SHOTS && vp.width === 1440) await page.screenshot({ path: "reports/smart-import-photos-v1-1/handoff-loaded-1440.png" });

    await page.goto("/#/onb-lab?s=importing&handoff=1&intro=1");
    await page.waitForSelector('[data-d2="hawk"]');
    if (MUT === "offset") await page.addStyleTag({ content: '[data-d2="hawk"] { right: 10px !important; }' });
    await page.waitForFunction(() => !document.querySelector('[data-d2="hawk"][data-intro]'), null, { timeout: 10_000 });
    const resting = await box(page);

    console.log(`HR1 ${vp.width}: loaded ${JSON.stringify(loaded)} · loading page at rest ${JSON.stringify(resting)}`);
    expect(loaded).not.toBeNull();
    expect(resting).not.toBeNull();
    for (let i = 0; i < 4; i++) expect(Math.abs(resting![i] - loaded![i])).toBeLessThanOrEqual(1);
  });
}
