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
  const CHROME = ["wpg-chrome", "wpg-mast", "wpg-tools", "wpg-reclaim"];
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
    /* ⚠️ `null` WHEN A PAGE DECLINES THE SHARED MASTHEAD — a reading, not a crash. `box()` already
       returns null for a missing element; what died was the assertion downstream reading `.left`
       off it. The opted-out population is asserted at zero in `mastheadMatrix`, so this one reports
       the state and names the page rather than repeating that claim. */
    masthead: box(g.querySelector(".wsh") as HTMLElement | null),
    /* the measure box too, so a diff can say which of the two moved */
    mastBox: box(mast),
    /**
     * ⚠️ AND THE MASTHEAD'S RIGHT INSET FROM THE USABLE WIDTH, which is the frame the constancy
     * claim is actually about. `right` above is measured from the WINDOW, and that was the same
     * number on every page only while every page reserved a scrollbar gutter on both sides — a
     * coincidence of `scrollbar-gutter: both-edges`, not a property of the masthead. With the
     * left-hand reservation gone (it was what stopped the wash reaching the edges), a page that
     * scrolls has 15px of scrollbar between its content and the window that a fill page does not,
     * so the window-relative figures split 58/73 while nothing about the masthead moved.
     *
     * Measured from the scroller's CLIENT box, all ten pages read 35 — exactly `--mast-gutter`,
     * left and right. A scrollbar is chrome the browser draws, not part of the page's width.
     */
    mastUsable: (() => {
      const el = g.querySelector(".wsh") as HTMLElement | null;
      if (!el) return null;
      const sb = sc.getBoundingClientRect();
      const eb = el.getBoundingClientRect();
      /* the token too, so the "is the cap binding" question is answered by the page rather than by
         a threshold picked out of the air — my first version guessed 200 and caught the capped
         regime at 2300, where the inset is 177.5 */
      const gut = parseFloat(getComputedStyle(g).getPropertyValue("--mast-gutter")) || 0;
      return { l: r(eb.left - sb.left), r: r(sb.left + sc.clientWidth - eb.right), gut };
    })(),
  };
}, cls);

test("content geometry is unchanged by the masthead's width system", async ({ page }) => {
  const now: Record<string, unknown> = {};
  /* kept apart from `now` deliberately: `now` is the half that must NOT change and is diffed
     against the baseline; this is the half that must, and is asserted as a relationship */
  const mast: Record<string, { masthead: { left: number; right: number } | null; mastUsable: { l: number; r: number; gut: number } | null }> = {};
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
      mast[`${w}|${name}`] = { masthead: r!.masthead, mastUsable: r!.mastUsable };
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
  const missing = WIDTHS.flatMap((w) => PAGES.filter(({ name }) => !mast[`${w}|${name}`]?.masthead).map(({ name }) => `${name} @${w}`));
  expect(missing, `no masthead rendered on: ${missing.join(", ")} — a page declining the shared header leaves this comparison with nothing to compare`)
    .toEqual([]);
  /**
   * ⚠️ THE LAW IS SYMMETRY WITHIN THE USABLE WIDTH, NOT AN IDENTICAL PIXEL ON EVERY PAGE — and the
   * old form was true only by a coincidence that has now been removed.
   *
   * It compared the masthead's window-relative edges and required one distinct value across all ten
   * pages. That held while `scrollbar-gutter: stable both-edges` made every page reserve the bar's
   * width on BOTH sides whether or not it had a bar — so every page had the same usable width, and
   * an identical pixel followed. That reservation is exactly what stopped the masthead's wash
   * reaching the window's edges, and removing it makes the underlying fact visible: a page that
   * scrolls has 15px less usable width than one that does not, because a scrollbar is really there.
   *
   * Measured after the change: at 1440 every page reads 35/35 — precisely `--mast-gutter`, which is
   * the constant the old lock was reaching for and was actually reading as 50/50, the gutter plus a
   * reservation nobody could see. At 2300 the cap binds and the masthead CENTRES, so a scrolling
   * page's ink sits 7.5px left of a fill page's — half of the bar, as centring in a narrower box
   * must. Requiring one pixel there would be requiring the browser not to draw a scrollbar.
   *
   * ⚠️ SO WHAT IS ASSERTED IS THE RULE THAT PRODUCES THE CONSTANT, not the constant. The masthead is
   * SYMMETRIC in the usable box on every page at every width — which is strictly stronger, because
   * it also catches a page whose masthead is off-centre in a way an identical-pixel check across
   * ten equally-wrong pages would not.
   */
  for (const w of WIDTHS) {
    const rows = PAGES.map(({ name }) => ({ name, u: mast[`${w}|${name}`]!.mastUsable }));
    for (const { name, u } of rows) {
      expect(u, `@${w}: ${name} rendered no masthead ink to measure`).not.toBeNull();
      expect(Math.abs(u!.l - u!.r), `@${w}: ${name}'s masthead is not symmetric in the usable width — ${u!.l} left against ${u!.r} right. A scrollbar is chrome the browser draws, not part of the page, so the two insets are measured inside it and must agree.`)
        .toBeLessThanOrEqual(1);
    }
    /* and where the cap does NOT bind, that symmetric inset is `--mast-gutter` itself, on every
       page — the constant the old form was trying to state, now read in the frame it lives in */
    const tight = rows.filter(({ u }) => u!.l <= u!.gut + 1);
    if (tight.length) {
      const vals = [...new Set(tight.map(({ u }) => u!.l))];
      expect(vals, `@${w}: the masthead's gutter differs across pages — ${JSON.stringify(tight.map((x) => [x.name, x.u!.l]))}. \`--mast-gutter\` is 35px, defined once, and NO PAGE OVERRIDES IT.`)
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
