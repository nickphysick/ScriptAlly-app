/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * VER2 probe — a dev aid for the port: opens the Versions page signed in and prints the result of VER2_PROBE (a JS
 * expression evaluated in the page). Asserts nothing; never part of a gate.
 */
import { test } from "@playwright/test";
import { ctxFor, openV2, VPS } from "./ver2Lib";

test.setTimeout(300_000);
test("VER2 probe", async ({ browser, baseURL }) => {
  test.skip(!process.env.VER2_PROBE);
  const vp = VPS.find((v) => String(v.width) === (process.env.VER2_W ?? "1512")) ?? VPS[0];
  const ctx = await ctxFor(browser, baseURL!, vp);
  const page = await ctx.newPage();
  await openV2(page, process.env.VER2_MS ?? undefined);
  if (await page.locator('[data-pck="popover"]').count()) await page.locator('[data-pck="close"]').click();
  console.log("PROBE " + JSON.stringify(await page.evaluate(process.env.VER2_PROBE!), null, 1));
  await ctx.close();
});
