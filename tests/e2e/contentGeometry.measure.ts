/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ONE MEASURE — the masthead and the page's content share edges (masthead measure, §1).
 *
 * ⚠️ THIS REPLACES A LOCK THAT ASSERTED THE WRONG THING AND PASSED. The previous pack made the
 * masthead a WINDOW concern — 16px from the window edge, deliberately independent of content — and
 * this file asserted exactly that, at 1280 and 1440, green. On a wide monitor the masthead ran to
 * the walls while the work sat in a narrower measure: 135px out on Query Centre at 2300, with Hide
 * half a screen from anything.
 *
 * ⚠️ TWO WIDTHS ON THE SAME SIDE OF EVERY CAP ARE ONE WIDTH. The old pair, 1280 and 1440, sit below
 * every measure this app uses, so nothing could disagree at either. **2300 is in the list now, and
 * it is the width that does the work** — it is where `--work-max` bites and where a masthead with a
 * rule of its own separates from the content.
 *
 * THE CLAIM IS NOW MUCH SIMPLER, WHICH IS THE POINT: the masthead's left and right offsets EQUAL
 * the first content column's, on every page at every width. Not a number — a relationship, and one
 * that holds by construction because the masthead has no width rule of its own.
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

/* ⚠️ 2300 IS THE ONE THAT MATTERS. Below ~1900 no page's measure binds, so 1280 and 1440 agree
   about everything and prove nothing about a wide monitor. */
const WIDTHS = [1280, 1440, 2300];

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
  };
}, cls);

test("content geometry is unchanged by the masthead's width system", async ({ page }) => {
  const now: Record<string, unknown> = {};
  /* kept apart from `now` deliberately: `now` is the half that must NOT change and is diffed
     against the baseline; this is the half that must, and is asserted as a relationship */
  const mast: Record<string, { masthead: { left: number; right: number } | null }> = {};
  const lines: string[] = [];

  for (const w of WIDTHS) {
    for (const { name, route, cls } of PAGES) {
      await openRoute(page, route, { width: w, height: 900 });
      const r = await read(page, cls);
      expect(r, `${name} @${w}: no visible grid with class .${cls}`).not.toBeNull();
      expect(r!.content, `${name} @${w}: no content element after the chrome — the probe has nothing to hold still`).not.toBeNull();
      now[`${w}|${name}`] = { content: r!.content, row: r!.row, scrollPad: r!.scrollPad };
      mast[`${w}|${name}`] = { masthead: r!.masthead };
      lines.push(
        `${String(w).padEnd(5)} ${name.padEnd(21)} content "${r!.contentClass}" ${r!.content!.left}/${r!.content!.right}` +
        ` · row ${r!.row ? `${r!.row.left}/${r!.row.right}` : "—"} · pad ${r!.scrollPad} · masthead ${r!.masthead!.left}/${r!.masthead!.right}`);
    }
  }
  console.log("\n" + lines.join("\n"));

  /**
   * ⚠️ THE MASTHEAD AND THE CONTENT SHARE EDGES — the whole of §1, asserted per page and per width.
   *
   * It is a RELATIONSHIP, not a figure: the two numbers may be anything, and they must be the same
   * two numbers. That is what makes it hold at a viewport nobody measured, and it is why the
   * masthead is given no width rule of its own — a rule would be a second number to keep in step,
   * which is precisely what the window-inset system was and precisely how it drifted.
   */
  for (const w of WIDTHS) {
    for (const { name } of PAGES) {
      const k = `${w}|${name}`;
      const m = mast[k]!.masthead!;
      const c = (now[k] as { content: { left: number; right: number } }).content;
      expect(m.left, `${name} @${w}: the masthead starts at ${m.left} and the content at ${c.left} — the header has drifted from the work`)
        .toBeCloseTo(c.left, 0);
      expect(m.right, `${name} @${w}: the masthead ends ${m.right} from the edge and the content ${c.right}`)
        .toBeCloseTo(c.right, 0);
    }
  }

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
