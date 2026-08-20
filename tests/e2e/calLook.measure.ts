/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * calLook — a LOOK at the deployed Calendar, not a check of it.
 *
 * ⚠️ THE ACCEPTANCE RUN ASKS WHETHER THE THINGS I CHANGED ARE RIGHT. This one exists to catch what
 * I did not think to assert: the states a reviewer actually meets — a day whose record is open, the
 * layer switched off, the collapsed width, an empty day. Screenshots, no assertions.
 */
import { test } from "@playwright/test";
import { openRoute } from "./measure";

const ROUTE = "/todo/calendar";
const shot = (name: string) => `reports/calendar-fixes/look-${name}.png`;

test("calendar — a look at it", async ({ page }) => {
  /* 1 — the month, both widths */
  for (const width of [1440, 1920]) {
    await openRoute(page, ROUTE, { width, height: 900 });
    await page.screenshot({ path: shot(`month-${width}`) });
  }

  await openRoute(page, ROUTE, { width: 1440, height: 900 });

  /* 2 — a day that has record entries: 18 August carries the holding replies */
  const day18 = page.locator(".cal-cell", { has: page.locator(".cal-dn", { hasText: /^18$/ }) }).first();
  await day18.click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: shot("day-with-record") });

  /* 3 — a record row expanded in place */
  const rec = page.locator(".cal-recmain").first();
  if (await rec.count()) {
    await rec.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: shot("record-expanded") });
  }

  /* 4 — an empty day: 26 August has nothing */
  const day26 = page.locator(".cal-cell", { has: page.locator(".cal-dn", { hasText: /^26$/ }) }).first();
  await day26.click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: shot("empty-day") });

  /* 5 — the record layer switched OFF */
  await page.locator(".cal-recbtn").click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: shot("record-off") });
  await page.locator(".cal-recbtn").click();

  /* 6 — the collapsed width */
  await openRoute(page, ROUTE, { width: 1000, height: 900 });
  await page.screenshot({ path: shot("collapsed-1000"), fullPage: true });

  console.log("shots written to reports/calendar-fixes/look-*.png");
});
