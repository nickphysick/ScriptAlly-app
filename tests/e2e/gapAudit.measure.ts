/**
 * THE GAP UNDER THE HEADER — what it measures, and who pays it.
 *
 * ⚠️ THE TOKEN IS NOT THE GAP. The matrix reads `--content-top-gap` off whichever row is first
 * below the hairline and reports `70+0` — which says the GRID pays it once, and says nothing about
 * what a page adds underneath. Comparable titles reportedly measures ~140 against a 70px token, so
 * the reading that matters is the PIXEL distance from the header card's bottom edge to the first
 * thing drawn below it, with every contributor between them itemised.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
/**
 * ⚠️ THE OPTED-OUT PAGES COME FROM THE ONE REGISTER (Nick's condition, 20 Sep). This census read
 * `.wsh` on every page and called `getBoundingClientRect()` on the Query Centre's null, which is a
 * crash rather than a finding — and the page had declined the shared masthead a day earlier, with
 * `mastheadMatrix` the only suite that knew. A page opts out everywhere at once.
 */
import { isOptedOut } from "./optedOut";

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

test("the gap under the header, itemised", async ({ page }) => {
  const rows: Record<string, unknown>[] = [];
  const declined: string[] = [];
  for (const [label, route] of PAGES) {
    if (isOptedOut(label) || isOptedOut(route)) { declined.push(label); continue; }
    await openRoute(page, route, { width: 1440, height: 900 });
    const r = await page.evaluate(() => {
      const n = (v: string) => Math.round((parseFloat(v) || 0) * 10) / 10;
      const g = [...document.querySelectorAll(".wpg")].find((x) => x.getBoundingClientRect().height > 0) as HTMLElement;
      if (!g) return { total: -1, items: "no grid", fill: false, tools: false };
      const wsh = g.querySelector(".wsh") as HTMLElement;
      const sc = g.querySelector(".wpg-scroll") as HTMLElement;
      const tools = g.querySelector(".wpg-tools") as HTMLElement | null;
      /* the first element below the header that actually DRAWS something — text, a border, a fill.
         An empty wrapper is not where the gap ends; it is one of the things paying it. */
      const draws = (el: HTMLElement) => {
        const c = getComputedStyle(el);
        const own = el.getBoundingClientRect();
        if (own.height < 1) return false;
        if (c.backgroundColor !== "rgba(0, 0, 0, 0)" && c.backgroundColor !== "transparent") return true;
        if (c.backgroundImage !== "none") return true;
        if (["borderTopWidth", "borderLeftWidth"].some((k) => parseFloat(c[k as never]) > 0)) return true;
        /* a text node of its own */
        return [...el.childNodes].some((k) => k.nodeType === 3 && (k.textContent ?? "").trim().length > 0);
      };
      let first: HTMLElement | null = null;
      const walk = (el: Element, d: number) => {
        if (first || d > 6) return;
        for (const kid of Array.from(el.children)) {
          if (first) return;
          const k = kid as HTMLElement;
          if (getComputedStyle(k).display === "none" || k.getBoundingClientRect().height < 1) continue;
          if (draws(k)) { first = k; return; }
          walk(k, d + 1);
        }
      };
      walk(tools ?? sc, 0);
      const headBottom = wsh.getBoundingClientRect().bottom;
      const items: string[] = [];
      if (tools) items.push(`tools padTop ${n(getComputedStyle(tools).paddingTop)}`);
      items.push(`scroll padTop ${n(getComputedStyle(sc).paddingTop)}`);
      /* every box between the scroll row and that first drawn thing, and what it contributes */
      if (first) {
        const chain: HTMLElement[] = [];
        for (let p: HTMLElement | null = first; p && p !== sc && p !== tools; p = p.parentElement) chain.unshift(p);
        for (const el of chain) {
          const c = getComputedStyle(el);
          const pt = n(c.paddingTop), mt = n(c.marginTop);
          if (pt || mt) {
            const nm = (el.className.toString() || el.tagName.toLowerCase()).split(" ")[0].slice(0, 18);
            items.push(`${nm} ${pt ? `padTop ${pt}` : ""}${pt && mt ? " + " : ""}${mt ? `marTop ${mt}` : ""}`);
          }
        }
      }
      return {
        total: first ? Math.round((first.getBoundingClientRect().top - headBottom) * 10) / 10 : -1,
        firstDrawn: first ? (first.className.toString() || first.tagName).slice(0, 24) : "—",
        items: items.join("  ·  "),
        tools: !!tools,
        token: n(getComputedStyle(sc).paddingTop) || n(getComputedStyle(tools ?? sc).paddingTop),
      };
    });
    rows.push({ page: label, ...r });
  }
  console.log("\n══ THE GAP UNDER THE HEADER (card's bottom edge → first thing drawn) ══");
  console.table(rows);
  if (declined.length) console.log(`opted out of the shared masthead, not measured here: ${declined.join(", ")}`);
  /**
   * ⚠️ THE POPULATION, BOTH WAYS — a census with no assertion cannot fail, and this one did not
   * fail, it CRASHED on a null `.wsh`. Skipping a page silently would put the same hazard back
   * where nobody looks, so the skip is counted: the declined set must be exactly the register's,
   * and every other page must have been measured.
   */
  expect(declined.sort(), "the pages skipped here are not the ones in the opted-out register")
    .toEqual(PAGES.map(([l]) => l).filter((l) => isOptedOut(l)).sort());
  expect(rows.length, "pages were dropped from the census without being named").toBe(PAGES.length - declined.length);
  expect(rows.filter((r) => r.total === -1).map((r) => r.page), "a page still in the treatment drew no header").toEqual([]);
});
