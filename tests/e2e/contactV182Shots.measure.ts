/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v18.2 — the report's screenshots that the locks do not take (CL182_SHOTS=1 in the locks takes the
 * rest). Read-only: nothing here writes to the account except the intro flag (cleared, then set by "Not now").
 */
import { expect, test, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { openContacts16 } from "./cl16Lib";

const DIR = "reports/contact-list-v18-2/shots";
const shot = async (page: Page, name: string) => { mkdirSync(DIR, { recursive: true }); await page.screenshot({ path: `${DIR}/${name}.png` }); };
const openAgent = async (page: Page, id: string) => {
  const row = page.locator(`.aglist [data-agent-card="${id}"]`).filter({ visible: true }).first();
  await row.scrollIntoViewIfNeeded(); await row.click();
  await expect(page.locator(`[data-ap="panel"][data-ap-id="${id}"]`)).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(500);
};
const home = async (page: Page) => {
  await page.keyboard.press("h"); await page.waitForTimeout(1000);
  if (await page.locator('[data-hk8="intro-start"]').count()) { await page.locator('[data-hk8="intro-start"]').click(); await page.waitForTimeout(600); }
  if (await page.locator('[data-hk8="ways-all"]').count()) { await page.locator('[data-hk8="ways-all"]').click(); await page.waitForTimeout(600); }
};

test("shots · header hovers and 1920", async ({ page }) => {
  test.setTimeout(240_000);
  await openContacts16(page, { width: 1512, height: 900 });
  await page.locator(".cl17-hd .cl17-card").filter({ visible: true }).first().hover(); await page.waitForTimeout(500);
  await shot(page, "03-card-hover-1512");
  await page.locator(".cl17-hd .cl18-tabs button:not([disabled]):not([aria-current='true'])").filter({ visible: true }).nth(3).hover(); await page.waitForTimeout(400);
  await shot(page, "04-tab-hover-1512");
  await openContacts16(page, { width: 1920, height: 1080 });
  await shot(page, "x-agents-1920");
});

test("shots · History: an offer, two manuscripts, never queried", async ({ page }) => {
  test.setTimeout(600_000);
  await openContacts16(page, { width: 1512, height: 900 });
  const ids = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".aglist [data-clv='row'][data-agent-card]")].filter((e) => e.getBoundingClientRect().height > 0).map((e) => e.getAttribute("data-agent-card")!));
  const want = { offer: false, two: false, none: false };
  for (const id of ids) {
    if (want.offer && want.two && want.none) break;
    await openAgent(page, id);
    await page.locator('[data-ap="card"] [data-ap-tab="queries"]').click(); await page.waitForTimeout(400);
    const r = await page.evaluate(() => ({
      offer: [...document.querySelectorAll('[data-ap-h="title"]')].some((t) => / offered representation$/.test(t.textContent ?? "")),
      books: new Set([...document.querySelectorAll('[data-ap-h="ms"]')].map((m) => m.textContent)).size,
      empty: !!document.querySelector('[data-ap-h="empty"]'),
    }));
    if (r.offer && !want.offer) { want.offer = true; await shot(page, "10-history-offer-1512"); }
    if (r.books >= 2 && !want.two) { want.two = true; await shot(page, "x-history-two-manuscripts-1512"); }
    if (r.empty && !want.none) { want.none = true; await shot(page, "11-history-not-queried-1512"); }
    await page.keyboard.press("Escape"); await page.waitForTimeout(500);
  }
  console.log(JSON.stringify(want));
});

test("shots · Housekeeping: intro, ways at 1280 × 720, focus, by agent", async ({ page }) => {
  test.setTimeout(400_000);
  execSync("node tests/e2e/hkFlags.mjs --clear");
  await openContacts16(page, { width: 1512, height: 900 });
  await page.keyboard.press("h"); await page.waitForTimeout(1200);
  await shot(page, "13-hk-intro-1512");
  await page.locator('[data-hk8="not-now"]').click(); await page.waitForTimeout(600);
  execSync("node tests/e2e/hkFlags.mjs --clear");
  await openContacts16(page, { width: 1280, height: 720 });
  await page.keyboard.press("h"); await page.waitForTimeout(1200);
  await page.locator('[data-hk8="intro-start"]').click(); await page.waitForTimeout(700);
  await shot(page, "15-hk-ways-1280x720");
  await page.locator('[data-hk8="ways-all"]').click(); await page.waitForTimeout(500);
  await page.keyboard.press("Escape"); await page.waitForTimeout(500);
  await openContacts16(page, { width: 1512, height: 900 });
  await home(page);
  await page.locator('[data-hk8="fill-all"]').click(); await page.waitForTimeout(800);
  await shot(page, "18-hk-focus-1512");
  await page.keyboard.press("Escape"); await page.waitForTimeout(500);
  await openContacts16(page, { width: 1280, height: 800 });
  await home(page);
  await page.locator('[data-hkv="view"][data-v="agent"]').click(); await page.waitForTimeout(400);
  await page.locator('[data-hk8="all-head"]').scrollIntoViewIfNeeded(); await page.waitForTimeout(300);
  await shot(page, "22-hk-by-agent-1280");
  await page.locator('[data-hkv="view"][data-v="detail"]').click();
  await page.keyboard.press("Escape");
});
