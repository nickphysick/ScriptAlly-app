/** DASHBOARD v77 — report shots only (DB77_SIZES × DB77_STATES). Not a lock. The callable is mocked. */
import { test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { FIXTURE_ROWS, driveFw, mockSend, openDash, type FwState } from "./db77Lib";

const SIZES = (process.env.DB77_SIZES ?? "1920x1080").split(",").map((s) => { const [w, h] = s.split("x").map(Number); return { width: w, height: h }; });
const STATES = (process.env.DB77_STATES ?? "idle").split(",") as FwState[];
test("DB77 shots", async ({ page }) => {
  test.setTimeout(900_000);
  mkdirSync("reports/dashboard-v77/shots", { recursive: true });
  await mockSend(page, true);
  for (const vp of SIZES) for (const st of STATES) {
    await openDash(page, vp, { __SA_FEEDBACK_ROWS: FIXTURE_ROWS });
    await driveFw(page, st);
    await page.mouse.move(2, 2);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `reports/dashboard-v77/shots/${process.env.DB77_TAG ?? "page"}-${vp.width}x${vp.height}-${st}.png` });
  }
});
