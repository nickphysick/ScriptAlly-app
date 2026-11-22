/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v25.2 — the report's screens, one beside each of the ref's `screens/*`, from the deployed dev site
 * (`CL252_SHOTS=1 SA_E2E_BASE_URL=dev`). Skipped unless asked. Read-only: every edit box is opened and cancelled.
 */
import { test, type Page } from "@playwright/test";
import { openCl24, shot } from "./cl252Lib";

const ON = process.env.CL252_SHOTS === "1";
const T = { timeout: 8000 };
test.skip(!ON, "CL252_SHOTS=1 to take the report's screens");

const scrollTo = (page: Page, sel: string, off: number) => page.evaluate(([s, o]) => {
  const t = [...document.querySelectorAll<HTMLElement>(s as string)].find((e) => e.offsetWidth);
  const sc = [...document.querySelectorAll<HTMLElement>(".agl-wpg .wpg-scroll")].find((e) => e.offsetWidth);
  if (t && sc) sc.scrollBy(0, t.getBoundingClientRect().top - sc.getBoundingClientRect().top - (o as number));
}, [sel, off] as const);
const card = "[data-cl24='panel'] [data-cl24='agent-card']";

for (const w of [1512, 1280]) test(`CL252 screens @ ${w}`, async ({ page }) => {
  test.setTimeout(400_000);
  const vp = { width: w, height: w === 1512 ? 900 : 800 };
  await openCl24(page, vp);
  await scrollTo(page, "[data-cl25='title']", 10); await page.waitForTimeout(500);
  await shot(page, `01-rows-${w}`);
  if (w === 1280) {
    await page.locator("[data-cl24='row'][data-k='you']").first().click(T); await page.waitForTimeout(900);
    await page.locator(`${card} [data-cl24='link'][data-k='edit']`).first().click(T); await page.waitForTimeout(900);
    await shot(page, "09-edit-agent-1280");
    return;
  }
  await scrollTo(page, "[data-cl24='group'][data-k='agent']", 10); await page.waitForTimeout(400);
  await shot(page, "02-rows-querying-1512");
  await scrollTo(page, "[data-cl24='group'][data-k='none']", 10); await page.waitForTimeout(400);
  await shot(page, "03-rows-not-queried-1512");
  /* 04 — the card on a your-move agent */
  await scrollTo(page, "[data-cl25='title']", 10);
  await page.locator("[data-cl24='row'][data-k='you']").first().click(T); await page.waitForTimeout(900);
  await shot(page, "04-card-your-move-1512");
  /* 05–08 — the inline edits, each opened and cancelled */
  await page.locator(`${card} [data-cl252='wish-edit'], ${card} [data-cl24='wish-add']`).first().click(T); await page.waitForTimeout(500);
  await shot(page, "05-edit-wishlist-1512");
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  await page.locator(`${card} [data-cl24='genres']`).first().click(T).catch(() => {}); await page.waitForTimeout(500);
  await page.locator(`${card} [data-ae='genre-input']`).first().focus().catch(() => {}); await page.waitForTimeout(400);
  await shot(page, "06-edit-genres-1512");
  await page.keyboard.press("Escape"); await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  await page.locator(`${card} [data-cl24='fact'][data-k='reply']`).first().click(T); await page.waitForTimeout(500);
  await shot(page, "07-edit-replies-1512");
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  const add = page.locator(`${card} [data-cl24='ct-add']`).first();
  if (await add.count()) { await add.click(T); await page.waitForTimeout(500); }
  await shot(page, "08-add-email-1512");
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  /* 09 — Edit agent */
  await page.locator(`${card} [data-cl24='link'][data-k='edit']`).first().click(T); await page.waitForTimeout(900);
  await shot(page, "09-edit-agent-1512");
  await page.keyboard.press("Escape"); await page.waitForTimeout(400);
  /* 10 — full screen */
  await openCl24(page, vp, { full: true }); await page.waitForTimeout(800);
  await page.locator("[data-cl24='book-row'][data-k='you']").first().click(T).catch(() => {}); await page.waitForTimeout(800);
  await shot(page, "10-full-screen-1512");
});
