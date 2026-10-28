/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v25.6 — the report's screens, one beside each reference screen (01–06). Writes nothing. The three
 * scores come from the dev-only `__SA_CL_HEALTH` stub, so they need a dev build (dev hosting is one).
 */
import { test } from "@playwright/test";
import { openCl24, scrollTo, shot } from "./cl256Lib";

test("CL256 shots", async ({ page }) => {
  test.setTimeout(300_000);
  const cases: [string, number, { width: number; height: number }][] = [
    ["01-glance-93-1512", 93, { width: 1512, height: 900 }], ["02-glance-72-1512", 72, { width: 1512, height: 900 }],
    ["03-glance-44-1512", 44, { width: 1512, height: 900 }], ["04-glance-93-1280", 93, { width: 1280, height: 800 }],
  ];
  for (const [name, pct, vp] of cases) {
    await page.addInitScript((p) => { (window as unknown as { __SA_CL_HEALTH: number }).__SA_CL_HEALTH = p; }, pct);
    await openCl24(page, vp, { grouped: true });
    await page.mouse.move(3, 3);
    await shot(page, name);
  }
  for (const [name, vp] of [["05-pinned-1512", { width: 1512, height: 900 }], ["06-pinned-1280", { width: 1280, height: 800 }]] as const) {
    await openCl24(page, vp, { grouped: true });
    await scrollTo(page, 900);
    await page.mouse.move(3, 3);
    await shot(page, name);
  }
});
