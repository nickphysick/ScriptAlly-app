/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PROBE — what is actually on /todo, before anything is asserted about it.
 *
 * ⚠️ IT ASKS RATHER THAN ASSUMES. §7's acceptance pass needs one card of each of the six buckets
 * and the pane's width at three viewports; both are facts about the harness ACCOUNT's data, not
 * about the code, so neither can be read out of the repo. This run reports them and the
 * conformance pass consumes what it finds.
 */
import { test } from "@playwright/test";
import { openRoute, scrollbarWidth } from "./measure";

const WIDTHS = [1440, 1920, 2560];

test("probe — /todo's rows, buckets and pane width at three viewports", async ({ page }) => {
  for (const width of WIDTHS) {
    await openRoute(page, "/todo", { width, height: 900 });
    const bar = await scrollbarWidth(page);

    const reading = await page.evaluate(() => {
      const vis = (el: Element | null) => !!el && el.getBoundingClientRect().height > 0;
      const rect = (sel: string) => {
        const el = [...document.querySelectorAll(sel)].find(vis) as HTMLElement | undefined;
        if (!el) return null;
        const b = el.getBoundingClientRect();
        return { w: Math.round(b.width * 10) / 10, h: Math.round(b.height * 10) / 10, x: Math.round(b.x * 10) / 10 };
      };
      const rows = [...document.querySelectorAll(".tdg-row")].slice(0, 60).map((r) => ({
        cls: r.getAttribute("class") ?? "",
        text: (r.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 90),
      }));
      return {
        rows: rows.length,
        sample: rows.slice(0, 25),
        pane: rect(".tdk-w"),
        dock: rect(".tdk"),
        split: rect(".tdb-split") ?? rect(".wpg-scroll"),
        body: rect(".tdk-body"),
        bodyTracks: (() => {
          const el = [...document.querySelectorAll(".tdk-body")].find(vis) as HTMLElement | undefined;
          return el ? getComputedStyle(el).gridTemplateColumns : null;
        })(),
        groups: [...document.querySelectorAll(".tdg-sec, .tdg-gtitle, .tdg-head")]
          .map((g) => (g.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 60)).slice(0, 20),
      };
    });

    console.log(`\n═══ ${width}px ═══  scrollbar ${bar}px (${bar === 0 ? "OVERLAY — see measure.ts" : "classic"})`);
    console.log(JSON.stringify(reading, null, 2));
  }
});
