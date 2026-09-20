import { test } from "@playwright/test";
import { openRoute } from "./measure";
import { openQueryById, openTab, pressAction } from "./openQuery";
import { mkdirSync } from "node:fs";
test("crop the Query sent rung — 1440", async ({ page }) => {
  mkdirSync("reports/drawer3-fix", { recursive: true });
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  const host = await openQueryById(page, "cor-move-b");
  await openTab(page, host, "Tracking");
  await page.locator(`${host.root} .tl-more`).first().waitFor();
  const box = await page.evaluate((rootSel) => {
    /* the host is the docked card above 900px of column, the drawer below it — the caller knows
       which, so the selector is passed in rather than guessed at here */
    const qpn = [...document.querySelectorAll<HTMLElement>(rootSel)].find((e) => e.getBoundingClientRect().height > 0)!;
    const r = qpn.querySelector<HTMLElement>(".tl-ev")!.getBoundingClientRect();
    return { x: r.left - 4, y: r.top - 4, width: r.width + 8, height: Math.min(r.height + 8, 150) };
  }, host.root);
  await page.screenshot({ path: "reports/drawer3-fix/rung-before.png", clip: box });
});
