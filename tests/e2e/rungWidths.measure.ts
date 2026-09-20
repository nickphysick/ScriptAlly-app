import { test } from "@playwright/test";
import { openRoute } from "./measure";
import { openQueryById, openTab, pressAction } from "./openQuery";
import { mkdirSync } from "node:fs";
test("the rung across widths", async ({ page }) => {
  mkdirSync("reports/drawer3-fix", { recursive: true });
  for (const width of [1024, 1152, 1280, 1440, 1728]) {
    await openRoute(page, "/queries", { width, height: 900 });
    const host = await openQueryById(page, "cor-move-b");
    await openTab(page, host, "Tracking");
    await page.locator(`${host.root} .tl-more`).first().waitFor();
    const r = await page.evaluate((rootSel) => {
      const qpn = [...document.querySelectorAll<HTMLElement>(rootSel)].find((e) => e.getBoundingClientRect().height > 0)!;
      const row = qpn.querySelector<HTMLElement>(".tl-r1")!;
      const t = row.querySelector<HTMLElement>(".tl-ttl")!.getBoundingClientRect();
      const m = row.querySelector<HTMLElement>(".qp-inplace")!.getBoundingClientRect();
      return { rowH: +row.getBoundingClientRect().height.toFixed(1), tTop: +t.top.toFixed(1), tBottom: +t.bottom.toFixed(1), mTop: +m.top.toFixed(1), mBottom: +m.bottom.toFixed(1), mLeft: +m.left.toFixed(1), tRight: +t.right.toFixed(1), sameLine: m.top < t.bottom };
    }, host.root);
    console.log(`W${width} ` + JSON.stringify(r));
  }
});
