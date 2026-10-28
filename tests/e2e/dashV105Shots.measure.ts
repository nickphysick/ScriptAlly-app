/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v105 — the report's shots and the hatch's frames (set DB105_SHOTS=1). Not a lock. The card's stats are seeded
 * through the dev-only `window.__SA_FOUNDING_STATS` aid; the celebration through `window.__SA_FOUNDING_SEEN` (dev only),
 * so no shot writes to the account.
 */
import { test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { DIR, STATS, mockCallable, openDash, shot } from "./db105Lib";
import { liftMotionSuppression } from "./measure";

const VP = { width: 1440, height: 900 };
const send = async (page: Page, k: string) => {
  await page.locator(`[data-d105="kind"][data-k="${k}"]`).filter({ visible: true }).first().click();
  await page.locator('[data-d105="text"]').filter({ visible: true }).first().fill("The calendar view makes my week much clearer, thank you.");
  await page.locator('[data-d105="card"] button:visible', { hasText: /^Send$/ }).first().click();
  await page.locator('[data-d105="card"][data-state="sent"]').waitFor({ timeout: 8000 });
};

test("DB105 shots", async ({ page }) => {
  test.skip(!process.env.DB105_SHOTS, "set DB105_SHOTS=1");
  test.setTimeout(900_000);
  mkdirSync(`${DIR}/shots`, { recursive: true });
  await mockCallable(page, "ok");

  for (const [name, st] of [["idle-egg", "egg"], ["idle-hatching", "hatching"], ["idle-fledgling", "fledgling"], ["idle-mentor", "mentor"]] as const) {
    await openDash(page, VP, { __SA_FOUNDING_STATS: STATS[st] });
    await shot(page, `card-${name}-1440x900.png`);
  }
  for (const k of ["like", "dont", "idea"]) {
    await openDash(page, VP, { __SA_FOUNDING_STATS: STATS.egg });
    await page.locator(`[data-d105="kind"][data-k="${k}"]`).filter({ visible: true }).first().click();
    await page.waitForTimeout(300);
    await shot(page, `card-write-${k}-1440x900.png`);
  }
  for (const [name, st] of [["sent-0", "egg"], ["sent-1", "fledgling"]] as const) {
    await openDash(page, VP, { __SA_FOUNDING_STATS: STATS[st] });
    await liftMotionSuppression(page);
    await send(page, "like");
    await page.waitForTimeout(1800);
    await shot(page, `card-${name}-1440x900.png`);
  }
  for (const [name, st] of [["hatch", "fledgling"], ["rankup", "mentor"]] as const) {
    await openDash(page, VP, { __SA_FOUNDING_STATS: STATS[st], __SA_FOUNDING_SEEN: 0 });
    await liftMotionSuppression(page);
    await page.locator('[data-d105="card"][data-state="celebrate"]').waitFor({ timeout: 8000 });
    await page.waitForTimeout(2600);
    await shot(page, `card-${name}-1440x900.png`);
  }
  /* the idle egg at the other sizes */
  for (const [w, h] of [[1100, 800], [1280, 650], [1366, 768], [1920, 1080]]) {
    await openDash(page, { width: w, height: h }, { __SA_FOUNDING_STATS: STATS.egg });
    await shot(page, `card-idle-egg-${w}x${h}.png`);
  }
  /* How it works, slide by slide */
  await openDash(page, VP, { __SA_FOUNDING_STATS: STATS.egg });
  await liftMotionSuppression(page);
  await page.locator('[data-d105="info"]').filter({ visible: true }).first().click();
  await page.locator('[data-d105h="modal"].on').waitFor({ timeout: 5000 });
  for (let i = 1; i <= 3; i++) {
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${DIR}/shots/how-${i}.png` });
    if (i < 3) await page.locator('[data-d105h="next"]').click();
  }
  /* the hatch, six frames */
  await page.keyboard.press("Escape");
  await openDash(page, VP, { __SA_FOUNDING_STATS: STATS.fledgling, __SA_FOUNDING_SEEN: 0 });
  await liftMotionSuppression(page);
  await page.reload();
  await page.locator('[data-d105="card"][data-state="celebrate"]').waitFor({ timeout: 15000 });
  const t0 = Date.now();
  for (const [i, at] of [0, 600, 1050, 1400, 1800, 2600].entries()) {
    await page.waitForTimeout(Math.max(0, at - (Date.now() - t0)));
    await shot(page, `hatch-frame-${i + 1}-${at}ms.png`);
  }
});
