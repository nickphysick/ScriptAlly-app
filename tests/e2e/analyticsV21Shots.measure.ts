/**
 * Analytics v21 — the report's screenshots (not a lock): one beside each reference screen at 1512 and 1280, the empty page
 * at 390, the page cut to one query (the thin-sample state), and the top at 1920 and 1024. AN21_SHOTS=1 to run.
 * The empty page's fixture is seeded and removed in the same run (tests/e2e/seedAn21.mjs).
 */
import { test, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { openAn } from "./an17Lib";

const DIR = "reports/analytics-v21/shots";
const VP = (w: number) => (w <= 760 ? { width: w, height: 844 } : w === 1280 ? { width: 1280, height: 800 } : { width: w, height: 900 });
test.skip(!process.env.AN21_SHOTS, "AN21_SHOTS=1 to take the report's screenshots");

async function open(page: Page, w: number, ms: string) {
  await page.addInitScript((id) => { try { localStorage.setItem("scriptally_active_manuscript_id", id); } catch { /* */ } }, ms);
  await openAn(page, VP(w));
}
async function scrollTo(page: Page, sel: string, off = 30) {
  await page.evaluate(({ sel, off }) => {
    const p = [...document.querySelectorAll<HTMLElement>('[data-a17="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
    const sc = p.closest(".wpg-scroll") as HTMLElement;
    const t = [...p.querySelectorAll<HTMLElement>(sel)].find((e) => e.getBoundingClientRect().height > 0);
    if (t) sc.scrollTop = t.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - off;
  }, { sel, off });
  await page.waitForTimeout(300);
}

test("populated", async ({ page }) => {
  test.setTimeout(400_000);
  mkdirSync(DIR, { recursive: true });
  for (const w of [1512, 1280]) {
    await open(page, w, "seed-ms-1");
    await page.screenshot({ path: `${DIR}/01-top-${w}.png` });
    for (const [name, sec] of [["02-stages", 0], ["03-replies-window", 3], ["04-steps", 4], ["05-records", 5], ["06-how-things-stand", 7], ["07-reading", 8]] as const) {
      await scrollTo(page, `[data-a17="sec"][data-sec="${sec}"]`);
      await page.screenshot({ path: `${DIR}/${name}-${w}.png` });
    }
  }
  for (const w of [1920, 1024]) {
    await open(page, w, "seed-ms-1");
    await page.screenshot({ path: `${DIR}/top-${w}.png` });
  }
});

test("one query", async ({ page }) => {
  test.setTimeout(200_000);
  await page.addInitScript(() => { (window as unknown as { __SA_AN_LIMIT?: number }).__SA_AN_LIMIT = 1; });
  await open(page, 1512, "seed-ms-1");
  await page.screenshot({ path: `${DIR}/one-query-top-1512.png` });
  for (const sec of [3, 4, 5]) { await scrollTo(page, `[data-a17="sec"][data-sec="${sec}"]`); await page.screenshot({ path: `${DIR}/one-query-sec${sec + 1}-1512.png` }); }
});

test.describe("empty", () => {
  test.beforeAll(() => { execSync("node tests/e2e/seedAn21.mjs empty", { stdio: "pipe" }); });
  test.afterAll(() => { execSync("node tests/e2e/seedAn21.mjs restore", { stdio: "pipe" }); });
  test("empty", async ({ page }) => {
    test.setTimeout(300_000);
    for (const w of [1512, 1280, 390]) {
      await open(page, w, "seed-an21-empty");
      await page.screenshot({ path: `${DIR}/08-empty-${w}.png` });
      await scrollTo(page, ".a21-aeh");
      await page.screenshot({ path: `${DIR}/09-empty-lower-${w}.png` });
      await scrollTo(page, '[data-a21="ways"]', 120);
      await page.screenshot({ path: `${DIR}/10-empty-ways-${w}.png` });
    }
  });
});
