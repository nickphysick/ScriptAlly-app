import { test } from "@playwright/test";
import { ensureSignedIn } from "./measure";
import { gotoTodo, selectTodoView } from "./todoOpen";
import { openContractView, type ViewName } from "./views";
import { mkdirSync } from "node:fs";
test.setTimeout(1_200_000);

/**
 * The report's evidence: each view beside the contract rendered at the same viewport.
 *
 * ⚠️ THE SAME SIZE IS THE POINT. Two pictures at two widths cannot be compared by eye, and "it
 * looks like the mockup", taken at the mockup's own convenient width, is the claim this round
 * exists to stop being made.
 */
const DIR = "reports/todo-three-views";

test("the three views beside the contract, at 1440 and 1920", async ({ page }) => {
  mkdirSync(DIR, { recursive: true });
  await ensureSignedIn(page);

  for (const [w, h] of [[1440, 900], [1920, 1080]] as const) {
    await page.setViewportSize({ width: w, height: h });
    await gotoTodo(page, "grid");
    for (const view of ["grid", "list", "board"] as ViewName[]) {
      await selectTodoView(page, view);
      await page.waitForTimeout(700);
      await page.screenshot({ path: `${DIR}/app-${view}-${w}.png` });

      const cpage = await page.context().newPage();
      await cpage.setViewportSize({ width: w, height: h });
      await openContractView(cpage, view);
      await cpage.waitForTimeout(500);
      await cpage.screenshot({ path: `${DIR}/contract-${view}-${w}.png` });
      await cpage.close();
    }
  }
  console.log(`\nSHOTS → ${DIR}/{app,contract}-{grid,list,board}-{1440,1920}.png\n`);
});
