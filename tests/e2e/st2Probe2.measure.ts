/** @license SPDX-License-Identifier: Apache-2.0 — Shell tabs v2 Step 0 probe (reads only). */
import { test } from "@playwright/test";
import * as fs from "node:fs";
import { openRoute } from "./measure";
test("st2 ground rules", async ({ page }) => {
  test.setTimeout(300_000);
  const out: string[] = [];
  for (const r of ["/queries/packages", "/goals"]) {
    await openRoute(page, r, { width: 1512, height: 900 });
    out.push(r + "\n" + await page.evaluate(() => {
      const vis = (e: Element) => (e as HTMLElement).getBoundingClientRect().width > 0;
      const bar = [...document.querySelectorAll<HTMLElement>(".ws-pagebar")].find(vis)!.getBoundingClientRect();
      const win = [...document.querySelectorAll<HTMLElement>(".ws-window")].find(vis)!.getBoundingClientRect();
      return document.elementsFromPoint(win.left + 400, bar.bottom + 16).slice(0, 10).map((e) => {
        const s = getComputedStyle(e);
        return `  ${e.tagName.toLowerCase()}.${String(e.className).split(" ").join(".")} bg=${s.backgroundColor} img=${s.backgroundImage.slice(0, 120)}`;
      }).join("\n") + "\n  app=" + document.querySelector(".ws-app")!.className;
    }));
  }
  fs.writeFileSync(`${process.env.ST2_OUT}/ground-rules.txt`, out.join("\n"));
});
