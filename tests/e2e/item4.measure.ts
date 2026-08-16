import { test } from "@playwright/test";
import { openRoute } from "./measure";
import { resolve } from "node:path";
test.setTimeout(240_000);
test("item 4 — the band between the header and the control bar", async ({ page }) => {
  await openRoute(page, "/todo", { width: 1920, height: 1000 });
  const r = await page.evaluate(() => {
    const vis = (e: Element) => e.getBoundingClientRect().height > 0;
    const g = (s: string) => [...document.querySelectorAll(s)].find(vis) as HTMLElement | undefined;
    const n = (x: number) => Math.round(x * 10) / 10;
    const plate = g(".wpg-plate"); const wsh = g(".wsh"); const bar = g(".tdw-cbar") ?? g(".tdb-cbar");
    const title = g(".wsh-title");
    return {
      plateH: plate ? n(plate.getBoundingClientRect().height) : null,
      wshH: wsh ? n(wsh.getBoundingClientRect().height) : null,
      titleBottom: title ? n(title.getBoundingClientRect().bottom) : null,
      barTop: bar ? n(bar.getBoundingClientRect().top) : null,
      emptyBand: title && bar ? n(bar.getBoundingClientRect().top - title.getBoundingClientRect().bottom) : null,
      scrollPadTop: g(".wpg-scroll") ? getComputedStyle(g(".wpg-scroll")!).paddingTop : null,
    };
  });
  console.log("AT REST:", JSON.stringify(r));
  await page.screenshot({ path: resolve(process.cwd(), "reports/pane/item4-rest.png"), clip: { x: 240, y: 60, width: 1500, height: 340 } }).catch(() => {});
});
