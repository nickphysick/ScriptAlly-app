/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TWO MEASURES — the content takes its page's, the masthead takes one constant.
 *
 * ⚠️ THIS IS THE THIRD POSITION ON MASTHEAD WIDTH, AND THIS FILE HAS NOW ASSERTED ALL THREE. First
 * the masthead measured from the WINDOW (16px inset, independent of content) — wrong on a wide
 * monitor, where it ran to the walls while the work sat in a narrower column. Then it took each
 * PAGE's measure, which this file asserted as "masthead edges EQUAL content edges" — and that was
 * wrong in the opposite direction: pages do not share a gutter, so the masthead's left edge moved
 * between 35px and 80px as you changed page. A page header that moves when the page changes is the
 * one thing a page header exists not to do.
 *
 * ⚠️ SO THE CLAIM IS CROSS-PAGE EQUALITY AGAIN — the thing §1 deleted, now correct because there is
 * ONE gutter for the masthead. The masthead's left offset is identical on all ten pages, at every
 * width. `--mast-gutter` is defined once and no page overrides it, so this holds by construction
 * rather than by ten values being kept in step.
 *
 * ⚠️ AND CONTENT MUST NOT HAVE MOVED. That is the gate the amendment is measured against: the gutter
 * moved off the scroll row and onto the measures inside it, which is exactly the kind of change that
 * shifts something by a few pixels and is never noticed. Byte-identical at 1280 and 1440 against the
 * pre-pack baseline; 2300 is captured here for the first time.
 *
 * ⚠️ 2300 IS THE WIDTH THAT DOES THE WORK. 1280 and 1440 both sit below every cap this app uses, so
 * they agree about everything and prove nothing about a wide monitor — the finding that let the
 * window-inset system pass its own lock for a whole pack.
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
  /* ⚠️ THE SLAB IS CHROME (pinned chrome, §1) — masthead and control row live inside `.wpg-chrome`
     now, so the scroller's first child is the slab and a content finder that does not know it
     reports the CHROME as the page's content. It did: "content \"wpg-chrome\"" on all ten pages. */
  const CHROME = ["wpg-chrome", "wpg-mast", "wpg-mini", "wpg-tools"];
  const row = g.querySelector(".wpg-tools") as HTMLElement | null;
  const win = document.documentElement.clientWidth;
  /**
   * ⚠️ THE FIRST CONTENT ELEMENT, FOUND STRUCTURALLY. The page's content is whatever follows the
   * masthead and the control row inside the scroller — never a named class, because ten pages name
   * theirs ten different things and a list would rot the first time one was renamed.
   */
  const content = [...sc.children].find(
    (e) => !CHROME.some((c) => e.classList.contains(c)) && !e.classList.contains("wpg-hem")
      && (e as HTMLElement).getBoundingClientRect().height > 0,
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
    /**
     * ⚠️ THE MASTHEAD'S INK, NOT ITS BOX — `.wsh` inside `.wpg-mast`, which is the padded measure.
     * The box's edge is 35px outside the ink, so comparing the BOX against a page's content edge is
     * off by exactly one `--mast-gutter` and reads as the constant having been chosen wrongly.
     * What a reader sees line up is the mark and the title, and those sit at the ink.
     */
    masthead: box(g.querySelector(".wsh") as HTMLElement),
    /* the measure box too, so a diff can say which of the two moved */
    mastBox: box(mast),
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
      /**
       * ⚠️ `scrollPad` LEFT THE INVARIANT SET, AND IT HAD TO. It was recorded to prove the gutter had
       * not moved; §A moves it deliberately — off the scroll row and onto the measures inside it — so
       * it now reads `0px` on every page and would fail this diff on every page, correctly and
       * uselessly. What it stood proxy for is the CONTENT's inset, which `content.left` measures
       * directly and which must not have moved by so much as a pixel.
       */
      now[`${w}|${name}`] = { content: r!.content, row: r!.row };
      mast[`${w}|${name}`] = { masthead: r!.masthead };
      lines.push(
        `${String(w).padEnd(5)} ${name.padEnd(21)} content "${r!.contentClass}" ${r!.content!.left}/${r!.content!.right}` +
        ` · row ${r!.row ? `${r!.row.left}/${r!.row.right}` : "—"} · pad ${r!.scrollPad} · masthead ${r!.masthead!.left}/${r!.masthead!.right}`);
    }
  }
  console.log("\n" + lines.join("\n"));

  /**
   * ⚠️ THE MASTHEAD IS IN THE SAME PLACE ON EVERY PAGE — the claim of §A, at each width.
   *
   * Asserted page-against-page rather than against a number, so it holds at a viewport nobody
   * measured; and asserted at all three widths, because the cap binds only at the widest and a law
   * that holds at one width is a coincidence.
   */
  for (const w of WIDTHS) {
    const lefts = PAGES.map(({ name }) => ({ name, v: mast[`${w}|${name}`]!.masthead!.left }));
    const rights = PAGES.map(({ name }) => ({ name, v: mast[`${w}|${name}`]!.masthead!.right }));
    for (const [edge, set] of [["left", lefts], ["right", rights]] as const) {
      const vals = [...new Set(set.map((x) => x.v))];
      expect(vals, `@${w}: the masthead's ${edge} edge differs across pages — ${JSON.stringify(set.map((x) => [x.name, x.v]))}`)
        .toHaveLength(1);
    }
  }

  /**
   * ⚠️ AND ON THE PAGES WHOSE GUTTER *IS* THE MASTHEAD'S, THE TWO STILL COINCIDE. That is what makes
   * 35 the right value rather than an arbitrary one: Query Centre and the three Tasks pages take
   * `--content-gutter-tight`, and their content lines up with the masthead exactly. On the wider
   * pages the masthead sits outside the content, deliberately — a constant does not bend to a page.
   *
   * ⚠️ THIS IS THE HALF OF §1'S CLAIM THAT SURVIVES, and keeping it is what stops `--mast-gutter`
   * drifting to a number that matches no page at all.
   */
  const TIGHT = ["Query Centre", "To-do list", "Calendar", "Noteboard"];
  const contentOf = (k: string) => (now[k] as { content: { left: number; right: number } }).content;
  for (const w of [1280, 1440]) {
    for (const name of TIGHT) {
      const m = mast[`${w}|${name}`]!.masthead!;
      const c = contentOf(`${w}|${name}`);
      expect(m.left, `${name} @${w}: the masthead starts at ${m.left} and the content at ${c.left} — the constant gutter no longer matches the tight pages it was chosen for`)
        .toBeCloseTo(c.left, 0);
    }
  }
  /**
   * ⚠️ AT 2300 ONLY QUERY CENTRE STILL MATCHES, AND THE REASON IS A LIVE INCONSISTENCY RATHER THAN A
   * FAULT IN THIS PACK. The masthead caps at `--work-max` on every page. Query Centre caps its
   * content at the same token, so the two stay together at any width. The three Tasks pages cap
   * their content at NOTHING — `--wpg-measure` is unset on `.tpl-wpg` — so at 2300 the board runs to
   * 297 from the window edge while the masthead sits at 432 inside its measure.
   *
   * ⚠️ NOT ASSERTED AWAY AND NOT SILENTLY FIXED. Giving `.tpl-wpg` the shared cap would align them —
   * and would also narrow three pages' content on a wide monitor, which is a product decision and
   * not this pack's to take. What IS asserted is the direction: the masthead may sit INSIDE the
   * content it titles, never outside it, which is the failure the whole pack has been chasing.
   */
  for (const name of TIGHT) {
    const m = mast[`2300|${name}`]!.masthead!;
    const c = contentOf(`2300|${name}`);
    if (name === "Query Centre") {
      expect(m.left, `${name} @2300: it caps its content at the shared measure, so the masthead must sit on it`).toBeCloseTo(c.left, 0);
    } else {
      expect(m.left, `${name} @2300: the masthead starts at ${m.left}, OUTSIDE its content at ${c.left} — a header wider than the work it titles is the fault this pack exists to fix`)
        .toBeGreaterThanOrEqual(c.left);
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
