/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v25 — the report's screens, one beside each of the ref's `screens/*`, taken from the deployed dev site
 * (`CL25_SHOTS=1 SA_E2E_BASE_URL=dev`). Skipped unless asked: a routine run writes no images.
 */
import { test } from "@playwright/test";
import { openCl24, openQc149, shot } from "./cl25Lib";

const ON = process.env.CL25_SHOTS === "1";
const T = { timeout: 8000 };
const top = async (page: import("@playwright/test").Page, sel: string, off: number) => page.evaluate(([s, o]) => {
  const t = [...document.querySelectorAll<HTMLElement>(s as string)].find((e) => e.offsetWidth);
  const sc = [...document.querySelectorAll<HTMLElement>(".agl-wpg .wpg-scroll")].find((e) => e.offsetWidth);
  if (t && sc) sc.scrollBy(0, t.getBoundingClientRect().top - sc.getBoundingClientRect().top - (o as number));
}, [sel, off] as const);

test.skip(!ON, "CL25_SHOTS=1 to take the report's screens");

for (const w of [1512, 1280]) test(`CL25 screens @ ${w}`, async ({ page }) => {
  test.setTimeout(300_000);
  const vp = { width: w, height: w === 1512 ? 900 : 800 };
  await openCl24(page, vp);
  await shot(page, `01-top-${w}`);
  await top(page, "[data-cl25='title']", 40); await page.waitForTimeout(400);
  await shot(page, `02-list-${w}`);
  await page.locator("[data-cl25='view-tab'][data-v='cards']").first().click(T);
  await page.waitForTimeout(600);
  await shot(page, `03-cards-${w}`);
  await page.locator("[data-cl25='view-tab'][data-v='list']").first().click(T);
  await openCl24(page, vp);
  await page.locator("[data-cl25='card'][data-k='none'] [data-cl25='hit']").first().click(T);
  await page.waitForTimeout(600);
  await shot(page, `04-glance-not-queried-${w}`);
  await openCl24(page, vp, { full: true });
  await shot(page, `05-full-screen-${w}`);
  if (w === 1512) {
    await openCl24(page, vp);
    await page.locator(".ws-cap--bar .ws-capr").first().click(T); await page.waitForTimeout(300);
    await page.locator("[data-cap='record']").first().click(T); await page.waitForTimeout(1200);
    await shot(page, `08-drawer-record-${w}`);
    await openQc149(page, vp);
    await page.locator("[data-qc149='log']").first().click(T); await page.waitForTimeout(1200);
    await shot(page, `07-drawer-log-${w}`);
  }
});

test("CL25 screens @ 2560", async ({ page }) => {
  test.setTimeout(240_000);
  const vp = { width: 2560, height: 1440 };
  await openCl24(page, vp, { full: true });
  await shot(page, "06-full-screen-2560");
  await openCl24(page, vp);
  await shot(page, "09-normal-2560");
});
