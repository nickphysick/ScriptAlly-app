import { test } from "@playwright/test";
import { openRoute } from "./measure";
const OUT = "/Users/nickphysick/ScriptAlly-app/reports/calendar-v63";
const NAME = process.env.SHOT_NAME ?? "shot";
test("shot", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  /* today centred: the window's own centre is today by construction (`movedOffToday` guards it) */
  await page.screenshot({ path: `${OUT}/${NAME}-1440.png` });
});
