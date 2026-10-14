/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v4 — the report's screenshots, beside each design-refs/packages-v4/screens/* view at 1512 and
 * 1280, plus v3's drawer views, the every-package-retired state, the empty page with one saved letter, and the page at
 * 1920 and 1024. Not a lock: it asserts nothing. Run with `PK4_SHOTS=1`; it writes nothing otherwise.
 */
import { test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { openRoute } from "./measure";

const ON = process.env.PK4_SHOTS === "1";
const OUT = "reports/packages-v4/shots";
const SCROLLER = `[...document.querySelectorAll('.wpg-scroll')].find((x) => x.querySelector('[data-pk4="page"]'))`;
const seed = (arg?: string) => execFileSync("node", ["tests/e2e/seedPk4.mjs", ...(arg ? [arg] : [])], { stdio: "pipe" }).toString();

async function open(page: Page, ms: string, size: { width: number; height: number }) {
  await page.addInitScript((id) => { try { localStorage.setItem("scriptally_active_manuscript_id", id); sessionStorage.clear(); } catch { /* */ } }, ms);
  await openRoute(page, "/manuscripts/packages", size);
  await page.waitForTimeout(1500);
}
const scrollTo = (page: Page, sel: string, offset = 24) => page.evaluate(`(() => { const s = ${SCROLLER}; const e = document.querySelector('${sel}'); if (s && e) s.scrollTop += e.getBoundingClientRect().top - s.getBoundingClientRect().top - ${offset}; })()`);

test.describe.configure({ mode: "serial" });
test.beforeAll(() => { if (ON) { mkdirSync(OUT, { recursive: true }); console.log(seed()); } });
test.afterAll(() => { if (ON) console.log(seed("--clean")); });

for (const size of [{ width: 1512, height: 900 }, { width: 1280, height: 800 }]) {
  const w = size.width;
  test(`page views ${w}`, async ({ page }) => {
    test.skip(!ON, "PK4_SHOTS=1");
    test.setTimeout(300_000);
    const shot = (n: string) => page.screenshot({ path: `${OUT}/${n}-${w}.png` });
    await open(page, "seed-ms-1", size);
    await shot("01-top");
    await scrollTo(page, '[data-pk4="mat-sheet"]'); await page.waitForTimeout(300); await shot("02-materials");
    await scrollTo(page, '[data-pk4="banner"]', 40); await page.waitForTimeout(300); await shot("03-replies");
    await page.locator('[data-pk4="by"] [data-by="letter"]').click(); await page.waitForTimeout(300);
    await scrollTo(page, '[data-pk4="replies"]'); await page.waitForTimeout(200); await shot("04-replies-letter");
    await page.evaluate(`${SCROLLER}.scrollTop = 0`);
    await page.locator('[data-pk4="card-row"][data-k="sent"]').click(); await page.waitForTimeout(400); await shot("05-card-filter");
    await page.locator('[data-pk4="card-row"][data-k="ret"]').click(); await page.waitForTimeout(400);
    await scrollTo(page, '[data-pk4="pkg-sheet"]'); await page.waitForTimeout(300); await shot("06-retired-open");
  });

  test(`drawer views ${w}`, async ({ page }) => {
    test.skip(!ON, "PK4_SHOTS=1");
    test.setTimeout(300_000);
    const shot = (n: string) => page.screenshot({ path: `${OUT}/${n}-${w}.png` });
    await open(page, "seed-ms-1", size);
    await page.locator('[data-pk4="card"][data-id="seed-pkg-1"]').click(); await page.waitForTimeout(600); await shot("ref-drawer-inside");
    await page.locator('[data-pk4="tab-replies"]').click(); await page.waitForTimeout(500); await shot("ref-drawer-stats");
    await page.locator('[data-pk4="tab-inside"]').click(); await page.waitForTimeout(300);
    await page.locator('[data-pk4="more"]').click(); await page.waitForTimeout(300); await shot("ref-drawer-more");
    await page.keyboard.press("Escape"); await page.waitForTimeout(200);
    await page.locator('[data-pk4="edit"]').click(); await page.waitForTimeout(600); await shot("ref-pkg-edit-sent");
    await page.keyboard.press("Escape"); await page.waitForTimeout(400);
    await page.locator('[data-pk4="new"]').click(); await page.waitForTimeout(600); await shot("ref-pkg-new");
    await page.locator('[data-pk4="park-letter"]').click(); await page.waitForTimeout(500); await shot("parked-material-form");
    await page.keyboard.press("Escape"); await page.waitForTimeout(300); await page.keyboard.press("Escape"); await page.waitForTimeout(400);
    await page.locator('[data-pk4="mat-row"]').first().click(); await page.waitForTimeout(600); await shot("ref-mat-letter");
    await page.keyboard.press("Escape"); await page.waitForTimeout(300);
    await page.locator('[data-pk4="add-material"]').click(); await page.waitForTimeout(600); await shot("ref-mat-new");
  });

  test(`other states ${w}`, async ({ page }) => {
    test.skip(!ON, "PK4_SHOTS=1");
    test.setTimeout(300_000);
    const shot = (n: string) => page.screenshot({ path: `${OUT}/${n}-${w}.png` });
    await open(page, "seed-ms-2", size); await shot("07-empty");
    await scrollTo(page, '[data-pk4="ways"]', 120); await page.waitForTimeout(300); await shot("08-empty-lower");
    await open(page, "pk4-ms-let", size); await scrollTo(page, '[data-pk4="ways"]', 120); await page.waitForTimeout(300); await shot("empty-one-letter");
    await open(page, "pk4-ms-ret", size); await scrollTo(page, '[data-pk4="pkg-sheet"]'); await page.waitForTimeout(300); await shot("every-retired");
  });
}

for (const size of [{ width: 1920, height: 1080 }, { width: 1024, height: 800 }]) {
  test(`page ${size.width}`, async ({ page }) => {
    test.skip(!ON, "PK4_SHOTS=1");
    test.setTimeout(180_000);
    await open(page, "seed-ms-1", size);
    await page.screenshot({ path: `${OUT}/page-${size.width}.png` });
    await scrollTo(page, '[data-pk4="mat-sheet"]'); await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/page-${size.width}-lower.png` });
  });
}

/* the report's "for Nick" figures, read off the page: each manuscript's reply rate, and how many credited queries
   sit in the version tab's "Not recorded" row */
test("facts", async ({ page }) => {
  test.skip(!ON, "PK4_SHOTS=1");
  test.setTimeout(240_000);
  const out: Record<string, unknown> = {};
  for (const ms of ["msv12-ms", "seed-ms-1"]) {
    await open(page, ms, { width: 1512, height: 900 });
    await page.locator('[data-pk4="by"] [data-by="version"]').click(); await page.waitForTimeout(300);
    out[ms] = await page.evaluate(`(() => {
      const nr = document.querySelector('[data-pk4="rows"] [data-pk4="row"][data-id="none"]');
      return { title: document.querySelector('[data-pk4="title"]')?.getAttribute('aria-label'), rate: document.querySelector('[data-pk4="ring-pct"]')?.textContent, rateSub: document.querySelector('[data-pk4="rate-sub"]')?.textContent,
        notRecorded: nr ? Number(nr.querySelector('[data-pk4="row-sent"]').textContent) || 0 : 0,
        withdrawn: document.querySelector('[data-pk4="withdrawn"]')?.textContent ?? null };
    })()`);
  }
  const { writeFileSync } = await import("node:fs");
  writeFileSync("reports/packages-v4/facts.json", JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out));
});
