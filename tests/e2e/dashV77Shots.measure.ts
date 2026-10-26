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

/** The task card on a tall window, at its first item of each kind (DB77_TASKS=1). */
test("DB77 task shots", async ({ page }) => {
  test.skip(!process.env.DB77_TASKS, "set DB77_TASKS=1");
  test.setTimeout(300_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openDash(page, { width: 1920, height: 1080 }, { __SA_FEEDBACK_ROWS: FIXTURE_ROWS });
  const n = Number((await page.locator('[data-d71="pos-text"]').first().textContent())?.split(" OF ")[1] ?? 1);
  const want = new Set(["nudge", "close", "send"]);
  for (let i = 0; i < n && want.size; i++) {
    const kind = await page.locator('[data-d71="task"]').first().getAttribute("data-kind");
    if (kind && want.has(kind)) { want.delete(kind); await page.mouse.move(2, 2); await page.screenshot({ path: `reports/dashboard-v77/shots/task-${kind}-1920x1080.png` }); }
    await page.locator('[data-d71="next"]').click();
    await page.waitForTimeout(120);
  }
});
