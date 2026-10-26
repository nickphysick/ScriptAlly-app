/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v25.1 — the report's screens, one beside each of the ref's `screens/*`, from the deployed dev site
 * (`CL251_SHOTS=1 SA_E2E_BASE_URL=dev`). Skipped unless asked.
 *
 * ⚠️ 05–08 (Who replied, What did … say?) are taken on the Query Centre: those flows live there. On the Contact list,
 *    "Record a response" opens the query drawer's own picker (report §1).
 */
import { test, type Page } from "@playwright/test";
import { openCl24, openQc149, shot } from "./cl251Lib";

const ON = process.env.CL251_SHOTS === "1";
const T = { timeout: 8000 };
test.skip(!ON, "CL251_SHOTS=1 to take the report's screens");

const scrollTo = (page: Page, sel: string, off: number) => page.evaluate(([s, o]) => {
  const t = [...document.querySelectorAll<HTMLElement>(s as string)].find((e) => e.offsetWidth);
  const sc = [...document.querySelectorAll<HTMLElement>(".agl-wpg .wpg-scroll")].find((e) => e.offsetWidth);
  if (t && sc) sc.scrollBy(0, t.getBoundingClientRect().top - sc.getBoundingClientRect().top - (o as number));
}, [sel, off] as const);

for (const w of [1512, 1280]) test(`CL251 screens @ ${w}`, async ({ page }) => {
  test.setTimeout(400_000);
  const vp = { width: w, height: w === 1512 ? 900 : 800 };
  await openCl24(page, vp);
  await scrollTo(page, "[data-cl251='glance']", 10); await page.waitForTimeout(400);
  await shot(page, `01-glance-${w}`);
  await page.locator("[data-cl251='cell'][data-k='querying']").first().click(T);
  await page.waitForTimeout(500);
  await shot(page, `02-glance-querying-${w}`);
  await openCl24(page, vp);
  await scrollTo(page, "[data-cl25='title']", 10); await page.waitForTimeout(400);
  await shot(page, `10-rows-${w}`);
  if (w === 1280) {
    await page.locator("[data-cl251='head'][data-key='reply']").first().click(T);
    await page.waitForTimeout(500);
    await shot(page, "13-sort-replies-1280");
    return;
  }
  /* 11 — Not queried, with the closed-to-queries tag */
  await page.locator("[data-cl251='cell'][data-k='none']").first().click(T);
  await page.waitForTimeout(400);
  await scrollTo(page, "[data-cl251='closed-tag']", 300); await page.waitForTimeout(400);
  await shot(page, "11-rows-not-queried-closed-1512");
  await page.locator("[data-cl251='cell'][data-k='none']").first().click(T);
  await page.waitForTimeout(300);
  await scrollTo(page, "[data-cl25='title']", 10);
  await page.locator("[data-cl251='head'][data-key='rating']").first().click(T);
  await page.waitForTimeout(500);
  await shot(page, "12-sort-rating-1512");
  /* 03/04 — the log, in place on the Contact list */
  await openCl24(page, vp);
  await page.locator(".ws-cap--bar .ws-capl").first().click(T); await page.waitForTimeout(1200);
  await shot(page, "03-log-pick-1512");
  await page.locator("[data-qc149f='agent']").first().click(T); await page.waitForTimeout(800);
  await shot(page, "04-log-details-1512");
  /* 09 — Add an agent */
  await openCl24(page, vp);
  await page.locator("[data-cl24='add']").first().click(T); await page.waitForTimeout(1200);
  await shot(page, "09-add-agent-header-only-1512");
  /* 05–08 — Recording response, on the Query Centre */
  await openQc149(page, vp);
  await page.locator("[data-qc149='record']").first().click(T); await page.waitForTimeout(1200);
  await shot(page, "05-record-who-1512");
  await page.locator("[data-qc149f='who-item']").first().click(T); await page.waitForTimeout(1300);
  await shot(page, "06-record-say-1512");
  await page.locator("[data-qc149c='resp-opt'][data-k='partial']").first().click(T); await page.waitForTimeout(500);
  await shot(page, "07-record-partial-1512");
  await page.locator("[data-qc149c='resp-opt'][data-k='pass']").first().click(T); await page.waitForTimeout(500);
  await shot(page, "08-record-pass-1512");
});
