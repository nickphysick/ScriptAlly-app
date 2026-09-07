import { test } from "@playwright/test";
import { ensureSignedIn } from "./measure";
import { openTaskInView } from "./todoOpen";
import { openContract } from "./anatomy";
import { mkdirSync } from "node:fs";
test.setTimeout(900_000);

/**
 * The report's evidence: the drawer open with its index card, beside the contract rendered at the
 * same size, at both widths.
 *
 * ⚠️ THE CONTRACT IS SHOT AT THE SAME VIEWPORT, WHICH IS THE POINT. Two pictures at two sizes
 * cannot be compared by eye, and "it looks like the mockup" taken at the mockup's own convenient
 * width is the claim this whole round exists to stop being made.
 *
 * ⚠️ AND THE MOTION IS ALLOWED TO FINISH FIRST. The card enters on a .36s transition with a .14s
 * delay; a screenshot taken on arrival catches it 120px to the right of where it lives, which
 * would read as the fault this round fixed.
 */
const DIR = "reports/todo-anatomy";

test("the drawer and the contract, side by side at 1440 and 1920", async ({ page }) => {
  mkdirSync(DIR, { recursive: true });
  await ensureSignedIn(page);

  for (const [w, h] of [[1440, 900], [1920, 1080]] as const) {
    await page.setViewportSize({ width: w, height: h });
    await openTaskInView(page, "grid", 1, { navigate: true });
    /* the entrance is .36s on a .14s delay — 900ms clears it with room */
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${DIR}/app-${w}.png` });

    const cpage = await page.context().newPage();
    await cpage.setViewportSize({ width: w, height: h });
    await openContract(cpage, "now", "Agent request");
    await cpage.waitForTimeout(900);
    await cpage.screenshot({ path: `${DIR}/contract-${w}.png` });
    await cpage.close();
  }
  console.log(`\nSHOTS → ${DIR}/{app,contract}-{1440,1920}.png\n`);
});
