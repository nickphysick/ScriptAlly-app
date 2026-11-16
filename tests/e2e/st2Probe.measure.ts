/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shell tabs v2 — Step 0 probe: on every route, the lip's pixel against the page's just below it (reads only).
 */
import { test } from "@playwright/test";
import { createRequire } from "node:module";
import * as fs from "node:fs";
import { openRoute } from "./measure";

const { PNG } = createRequire(import.meta.url)("playwright-core/lib/utilsBundle") as { PNG: { sync: { read(b: Buffer): { width: number; height: number; data: Buffer } } } };
const OUT = process.env.ST2_OUT ?? "/tmp/st2";
const ROUTES = ["/dashboard", "/queries", "/queries/responses", "/queries/analytics", "/queries/packages", "/materials/letters",
  "/manuscripts/comps", "/manuscripts/versions", "/manuscripts", "/todo", "/todo/corkboard", "/agents", "/agents/discover",
  "/goals", "/import", "/account", "/account/profile", "/account/preferences", "/account/emails", "/account/plan", "/account/data", "/plans", "/help"];

test("st2 ground sweep", async ({ page }) => {
  test.setTimeout(900_000);
  const rows: string[] = [];
  for (const r of ROUTES) {
    await openRoute(page, r, { width: 1512, height: 900 });
    const g = await page.evaluate(() => {
      const vis = (e: Element) => (e as HTMLElement).getBoundingClientRect().width > 0;
      const bar = [...document.querySelectorAll<HTMLElement>(".ws-pagebar")].find(vis)!.getBoundingClientRect();
      const win = [...document.querySelectorAll<HTMLElement>(".ws-window")].find(vis)!.getBoundingClientRect();
      const tab = document.querySelector<HTMLElement>('[data-shell="tabs"] [aria-current="page"]');
      const under = document.elementsFromPoint(win.left + 400, bar.bottom + 16).find((e) => {
        const s = getComputedStyle(e); return s.backgroundColor !== "rgba(0, 0, 0, 0)" || s.backgroundImage !== "none";
      });
      return { bottom: bar.bottom, left: win.left, tab: tab ? getComputedStyle(tab).backgroundColor : "none", under: under ? `${under.tagName.toLowerCase()}.${String(under.className).split(" ").slice(0, 2).join(".")}` : "?" };
    });
    const shot = PNG.sync.read(await page.screenshot({ clip: { x: g.left + 400, y: g.bottom, width: 1, height: 24 } }));
    const px = (y: number) => [...shot.data.slice(y * shot.width * 4, y * shot.width * 4 + 3)].join(",");
    rows.push(`${r.padEnd(22)} tab=${g.tab.padEnd(20)} +4=${px(4).padEnd(12)} +16=${px(16).padEnd(12)} ${px(4) === px(16) ? "same" : "DIFF"}  under=${g.under}`);
  }
  fs.writeFileSync(`${OUT}/ground-sweep.txt`, rows.join("\n"));
});
