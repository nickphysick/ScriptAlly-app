/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CONTENT GEOMETRY — the pledge that the masthead's width system moves NOTHING else.
 *
 * ⚠️ THE MASTHEAD IS ABOUT TO ESCAPE ITS PAGE'S GUTTER, and the whole risk of that is collateral:
 * a negative margin, a token rename or a re-homed padding that also shifts the cards, the control
 * row or the panes. This captures where each page's content actually sits BEFORE the change and
 * asserts it byte-identical after — the one check that cannot be satisfied by the masthead looking
 * right.
 *
 * ⚠️ TWO WIDTHS, BECAUSE A LAW THAT HOLDS AT EXACTLY ONE WIDTH IS A COINCIDENCE. 1280 and 1440.
 *
 * Usage:  SA_BASELINE=1 npx playwright test tests/e2e/contentGeometry.measure.ts   → write baseline
 *         npx playwright test tests/e2e/contentGeometry.measure.ts                 → diff against it
 */
import { test, expect, Page } from "@playwright/test";
import { openRoute } from "./measure";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const BASELINE = resolve(new URL(".", import.meta.url).pathname, "__baseline__/contentGeometry.json");

const PAGES: { name: string; route: string; cls: string }[] = [
  { name: "Query Centre",        route: "/queries",              cls: "qc-wpg"   },
  { name: "Analytics",           route: "/queries/analytics",    cls: "qa-wpg"   },
  { name: "Contact list",        route: "/agents",               cls: "agl-wpg"  },
  { name: "Discover",            route: "/agents/discover",      cls: "dv-wpg"   },
  { name: "Manuscripts",         route: "/manuscripts",          cls: "msv-wpg"  },
  { name: "Comparable titles",   route: "/manuscripts/comps",    cls: "ct-wpg"   },
  { name: "Submission packages", route: "/manuscripts/packages", cls: "pkgw-wpg" },
  { name: "To-do list",          route: "/todo",                 cls: "tpl-wpg"  },
  { name: "Calendar",            route: "/todo/calendar",        cls: "tpl-wpg"  },
  { name: "Noteboard",           route: "/todo/noteboard",       cls: "tpl-wpg"  },
];

const WIDTHS = [1280, 1440];

const read = (page: Page, cls: string) => page.evaluate((c) => {
  const r = (n: number) => Math.round(n * 10) / 10;
  /* by class AND displayed — `.tpl-wpg` is shared by the three Tasks pages, and "first with a box"
     changes subject the moment anything navigates */
  const all = [...document.querySelectorAll(`.wpg.${c}`)] as HTMLElement[];
  const g = all.find((e) => e.getBoundingClientRect().height > 0);
  if (!g) return null;
  const sc = g.querySelector(".wpg-scroll") as HTMLElement;
  const mast = g.querySelector(".wpg-mast") as HTMLElement;
  const row = g.querySelector(".wpg-tools") as HTMLElement | null;
  const win = document.documentElement.clientWidth;
  /**
   * ⚠️ THE FIRST CONTENT ELEMENT, FOUND STRUCTURALLY. The page's content is whatever follows the
   * masthead and the control row inside the scroller — never a named class, because ten pages name
   * theirs ten different things and a list would rot the first time one was renamed.
   */
  const content = [...sc.children].find(
    (e) => e !== mast && e !== row && !e.classList.contains("wpg-hem") && (e as HTMLElement).getBoundingClientRect().height > 0,
  ) as HTMLElement | undefined;
  const box = (e: Element | undefined | null) => {
    if (!e) return null;
    const b = e.getBoundingClientRect();
    return { left: r(b.left), right: r(win - b.right) };
  };
  return {
    win,
    /* what must NOT move */
    content: box(content),
    contentClass: content ? (content.className || content.tagName).toString().split(" ")[0] : "none",
    row: box(row),
    scrollPad: getComputedStyle(sc).paddingLeft,
    /* what the pack DOES move — recorded so a diff says which half changed */
    masthead: box(mast),
    /**
     * ⚠️ THE MASTHEAD'S INSET FROM THE SCROLL ROW'S OWN EDGE, with the scrollbar reservation
     * measured alongside rather than assumed away. `scrollbar-gutter: stable both-edges` reserves
     * one scrollbar width on EACH side, so `offsetWidth - clientWidth` is twice it. Under overlay
     * scrollbars that is 0 and the inset is 16 from the window; under classic ones it is 16 + ~15.
     * That variance is the existing app-wide decision, which content already pays — stated here,
     * never compensated for, or the masthead becomes the one element in the app fighting it.
     */
    barReserve: r((sc.offsetWidth - sc.clientWidth) / 2),
    mastInset: r(mast.getBoundingClientRect().left - sc.getBoundingClientRect().left),
  };
}, cls);

test("content geometry is unchanged by the masthead's width system", async ({ page }) => {
  const now: Record<string, unknown> = {};
  /* kept apart from `now` deliberately: `now` is the half that must NOT change and is diffed
     against the baseline; this is the half that must, and is asserted as a relationship */
  const mast: Record<string, { masthead: { left: number; right: number } | null; mastInset: number; barReserve: number }> = {};
  const lines: string[] = [];

  for (const w of WIDTHS) {
    for (const { name, route, cls } of PAGES) {
      await openRoute(page, route, { width: w, height: 900 });
      const r = await read(page, cls);
      expect(r, `${name} @${w}: no visible grid with class .${cls}`).not.toBeNull();
      expect(r!.content, `${name} @${w}: no content element after the chrome — the probe has nothing to hold still`).not.toBeNull();
      now[`${w}|${name}`] = { content: r!.content, row: r!.row, scrollPad: r!.scrollPad };
      mast[`${w}|${name}`] = { masthead: r!.masthead, mastInset: r!.mastInset, barReserve: r!.barReserve };
      lines.push(
        `${String(w).padEnd(5)} ${name.padEnd(21)} content "${r!.contentClass}" ${r!.content!.left}/${r!.content!.right}` +
        ` · row ${r!.row ? `${r!.row.left}/${r!.row.right}` : "—"} · pad ${r!.scrollPad} · masthead ${r!.masthead!.left}/${r!.masthead!.right}`);
    }
  }
  console.log("\n" + lines.join("\n"));

  /**
   * ⚠️ THE MASTHEAD'S OWN EDGES: EQUAL ON EVERY PAGE, AND 16px FROM THE SCROLL ROW'S EDGE ONCE THE
   * SCROLLBAR RESERVATION IS TAKEN OFF. This is the half of step 2 that is supposed to CHANGE, so
   * it is asserted as a relationship in its own right rather than diffed against the baseline.
   *
   * Before this step the masthead sat at its page's content gutter — 342 on seven pages and 297 on
   * the three tight ones, two mastheads 45px apart while claiming to be the same object.
   */
  const insets = new Set<number>();
  const edges = new Set<string>();
  for (const w of WIDTHS) {
    for (const { name, route, cls } of PAGES) {
      const k = `${w}|${name}`;
      const m = mast[k]!;
      expect(m.mastInset - m.barReserve, `${name} @${w}: the masthead sits ${m.mastInset - m.barReserve}px inside the scroll row (bar reserve ${m.barReserve}) — the inset is 16`)
        .toBeCloseTo(16, 0);
      insets.add(m.mastInset);
      edges.add(`${m.masthead!.left}/${m.masthead!.right}`);
      void route; void cls;
    }
  }
  expect([...edges], `the masthead's edges differ page to page: ${[...edges].join(" · ")}`).toHaveLength(1);
  expect([...insets], "the masthead's inset differs page to page").toHaveLength(1);

  if (process.env.SA_BASELINE) {
    mkdirSync(dirname(BASELINE), { recursive: true });
    writeFileSync(BASELINE, JSON.stringify(now, null, 2) + "\n");
    console.log(`\nbaseline written: ${BASELINE}`);
    return;
  }

  /* ⚠️ THE BASELINE MUST EXIST OR THIS CASE IS ASSERTING NOTHING — the precondition, stated. A
     missing file silently comparing against `{}` is the vacuous-green shape this repo keeps
     re-teaching. */
  expect(existsSync(BASELINE), `no baseline at ${BASELINE} — run with SA_BASELINE=1 BEFORE the change`).toBe(true);
  const before = JSON.parse(readFileSync(BASELINE, "utf8"));
  expect(Object.keys(before).length, "the baseline is empty").toBe(Object.keys(now).length);
  for (const key of Object.keys(before)) {
    expect(now[key], `${key}: content or control-row geometry moved`).toEqual(before[key]);
  }
});
