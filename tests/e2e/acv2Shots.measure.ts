/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Agent card v2 — the report's screens: one agent per stand (your move, with the agent, not queried, closed), each tab, at
 * 1512 × 900 and 1280 × 800. Shots only; the locks are acv2.measure.ts.
 */
import { test } from "@playwright/test";
import { AC, cardClip, openAc, shotDir, SIZES, tab } from "./acv2Lib";
import { openApp } from "./pageHeaderV2Lib";

test.describe.configure({ mode: "serial" });
for (const vp of SIZES) {
  test(`AC2 shots · ${vp.width}`, async ({ page }) => {
    test.setTimeout(240_000);
    const dir = shotDir();
    for (const stand of ["you", "agent", "none", "closed"]) {
      await openAc(page, vp, { stand });
      for (const t of ["profile", "history", "notes"] as const) {
        await tab(page, t);
        await page.screenshot({ path: `${dir}/${vp.width}-${stand}-${t}.png`, clip: await cardClip(page) });
      }
      await page.keyboard.press("Escape");
      await page.waitForTimeout(500);
    }
    void AC;
  });
}

/* the card from other doors: the To-do desk's preview (a picture of the card), and search over the Dashboard (a read door) */
test("AC2 shots · doors", async ({ page }) => {
  test.setTimeout(180_000);
  const dir = shotDir();
  const vp = SIZES[0];
  await openApp(page, "/todo", vp);
  const items = page.locator("[data-tws='tray'] button:visible");
  const n = Math.min(await items.count(), 30);
  for (let i = 0; i < n; i++) {
    if (await page.locator(".tws-agcard:visible").count()) break;
    await items.nth(i).click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(600);
  }
  const prev = page.locator(".tws-agcard:visible").first();
  if (await prev.count()) await prev.screenshot({ path: `${dir}/1512-todo-preview.png` });
  else console.log("  AC2 shots · no To-do task showed an agent card preview");
  await openApp(page, "/dashboard", vp);
  await page.keyboard.press("ControlOrMeta+k");
  await page.waitForTimeout(500);
  await page.keyboard.type("Clara");
  await page.waitForTimeout(800);
  await page.keyboard.press("Enter");
  const card = page.locator("[data-cl262='panel'] [data-acv2='card']");
  await card.first().waitFor({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(900);
  if (await card.count()) await page.screenshot({ path: `${dir}/1512-dashboard-search-door.png` });
  else { console.log("  AC2 shots · search over the Dashboard opened no agent card"); await page.screenshot({ path: `${dir}/1512-dashboard-search-miss.png` }); }
});
