/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Agent card v2 — the report's screens: one agent per stand (your move, with the agent, not queried, closed), each tab, at
 * 1512 × 900 and 1280 × 800. Shots only; the locks are acv2.measure.ts.
 */
import { test } from "@playwright/test";
import { execFileSync } from "node:child_process";
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
  /* the To-do list's door: the seeded task linked to Nora, its preview pressed */
  execFileSync("node", ["tests/e2e/seedAcv2.mjs"], { stdio: "inherit" });
  await openApp(page, "/todo", vp);
  const task = page.getByText("Ask Nora about the York anthology").first();
  await task.click({ timeout: 10_000 }).catch(() => console.log("  AC2 shots · the seeded task is not on the To-do list"));
  await page.waitForTimeout(900);
  const prev = page.locator("[data-tws='preview'][data-kind='agent']:visible").first();
  if (await prev.count()) {
    await page.screenshot({ path: `${dir}/1512-todo-preview.png` });
    await prev.click();
    const real = page.locator("[data-cl262='panel'] [data-acv2='card']");
    await real.first().waitFor({ timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(900);
    if (await real.count()) await page.screenshot({ path: `${dir}/1512-todo-door.png` });
    else console.log("  AC2 shots · pressing the To-do preview opened no agent card");
  } else { console.log("  AC2 shots · no agent preview on the To-do list"); await page.screenshot({ path: `${dir}/1512-todo-miss.png` }); }
  execFileSync("node", ["tests/e2e/seedAcv2.mjs", "--clean"], { stdio: "inherit" });
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
