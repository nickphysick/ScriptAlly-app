import { test } from "@playwright/test";
import { ensureSignedIn } from "./measure";
import { gotoTodo, selectTodoView } from "./todoOpen";
import { openContractView } from "./views";
import { seedDueDates, cleanDueDates, readListView, restoreListView } from "./seedDueDates.mjs";
import { mkdirSync } from "node:fs";
test.setTimeout(900_000);

/**
 * THE LANDING STATE, BESIDE THE CONTRACT, AT ONE WIDTH.
 *
 * ⚠️ THE SAME SIZE IS THE POINT, and so is the same STATE. The contract draws a first visit —
 * grouped by When, Overdue first — and the harness account carries a writer's own later choice,
 * which is the behaviour Phase 3 built. A screenshot of the app in its stored view beside a
 * drawing of the landing state is two pictures of two different things, which is the shape of
 * "it looks like the mockup" this round exists to stop.
 *
 * ⚠️ AND IT PUTS THE ACCOUNT BACK. The stored view is read before, cleared, and written back
 * exactly; the seeded tasks go the same way. The restore is asserted, not hoped for.
 */
const DIR = "reports/todo-list-round";

test("the landing state beside its contract, at 1440", async ({ page }) => {
  mkdirSync(DIR, { recursive: true });
  await ensureSignedIn(page);
  await page.setViewportSize({ width: 1440, height: 900 });

  const savedView = await readListView();
  const seeded = await seedDueDates();
  try {
    await restoreListView(null);
    await gotoTodo(page, "grid");
    await selectTodoView(page, "list");
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${DIR}/app-landing-1440.png` });

    const cpage = await page.context().newPage();
    await cpage.setViewportSize({ width: 1440, height: 900 });
    await openContractView(cpage, "list");
    await cpage.waitForTimeout(500);
    await cpage.screenshot({ path: `${DIR}/contract-landing-1440.png`, fullPage: false });
    await cpage.close();
  } finally {
    await restoreListView(savedView);
    await cleanDueDates();
  }
  const back = await readListView();
  const canon = (v: unknown) => JSON.stringify(v, Object.keys((v ?? {}) as object).sort());
  if (canon(back) !== canon(savedView)) {
    throw new Error("the stored view was NOT put back — this account has been changed");
  }
  // eslint-disable-next-line no-console
  console.log(`\nSHOTS → ${DIR}/{app,contract}-landing-1440.png · ${seeded.length} seeds cleaned\n`);
});
