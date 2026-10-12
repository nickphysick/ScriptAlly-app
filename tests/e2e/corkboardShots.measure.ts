/**
 * Corkboard v1 — the report's screenshots (reports/corkboard-v1/shots). Not a lock: it asserts nothing but
 * that each state was reached. `CB_SHOTS=1` writes them; a routine run skips.
 *
 *   CB_SHOTS=1 SA_E2E_BASE_URL=http://127.0.0.1:4611 npx playwright test corkboardShots --project=measure
 */
import { test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { DIR, ROUTE, open, only } from "./cbLib";

const OUT = `${DIR}/shots`;
const shot = async (page: import("@playwright/test").Page, name: string, full = true) => {
  mkdirSync(OUT, { recursive: true });
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false, animations: "disabled" });
  void full;
};

test.describe("Corkboard v1 — shots", () => {
  test.skip(!process.env.CB_SHOTS, "set CB_SHOTS=1 to write the screenshots");

  test("the board beside the reference's screens", async ({ page }) => {
    await only(page, "cbseed-");
    await open(page, ROUTE, { width: 1512, height: 1206 });
    await shot(page, "01-board-1512");
    await open(page, ROUTE, { width: 1280, height: 1206 });
    await shot(page, "01-board-1280");
  });
});
