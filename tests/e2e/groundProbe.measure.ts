/**
 * WHAT IS ACTUALLY BEHIND THE CONTENT — the paint chain at a point, per page.
 *
 * ⚠️ WRITTEN BECAUSE A SOURCE SWEEP SAID ONE THING AND THE PIXELS SAID ANOTHER. `.ws-window`
 * computes to the new ground on every page, and the pixel immediately under the collapsed band on
 * the Contact list is pure white — so something between the window and the content is painting.
 * A stylesheet comment ("no bespoke ground — the page inherits the stage's canvas") is not
 * evidence; the chain of computed backgrounds is.
 */
import { test } from "@playwright/test";
import { openRoute } from "./measure";

const PAGES: [string, string][] = [
  ["Query Centre", "/queries"],
  ["Contact list", "/agents"],
  ["Discover", "/agents/discover"],
  ["Manuscripts", "/manuscripts"],
  ["Submission packages", "/manuscripts/packages"],
  ["Analytics", "/queries/analytics"],
  ["To-do", "/todo"],
  ["Calendar", "/todo/calendar"],
  ["Noteboard", "/todo/noteboard"],
  ["Comparable titles", "/manuscripts/comps"],
];

test("the paint chain under the content, every page", async ({ page }) => {
  const rows: Record<string, unknown>[] = [];
  for (const [label, route] of PAGES) {
    await openRoute(page, route, { width: 1440, height: 900 });
    const r = await page.evaluate(() => {
      const g = [...document.querySelectorAll(".wpg")].find((x) => x.getBoundingClientRect().height > 0) as HTMLElement;
      if (!g) return { chain: "no grid", opaque: "—", scrollRow: "—" };
      const sc = g.querySelector(".wpg-scroll") as HTMLElement;
      const b = sc.getBoundingClientRect();
      /* a point in the scroll row's own gutter — left of any content, so what is read is the
         surface the content SITS ON rather than a card that happens to be under the cursor */
      const el = document.elementFromPoint(b.left + 4, b.top + 6) as HTMLElement | null;
      const chain: string[] = [];
      let first = "";
      for (let n = el; n; n = n.parentElement) {
        const bg = getComputedStyle(n).backgroundColor;
        const painted = bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent";
        if (painted) {
          const name = `${n.tagName.toLowerCase()}.${(n.className.toString() || "").split(" ").filter(Boolean).slice(0, 2).join(".")}`;
          chain.push(`${name} ${bg}`);
          if (!first) first = bg;
        }
        if (n.classList?.contains("ws-window")) break;
      }
      return {
        chain: chain.join("  ←  ") || "nothing painted",
        opaque: first || "—",
        scrollRow: getComputedStyle(sc).backgroundColor,
      };
    });
    rows.push({ page: label, ...r });
  }
  console.log("\n══ THE PAINT CHAIN UNDER THE CONTENT (nearest painted surface first) ══");
  console.table(rows);
});
