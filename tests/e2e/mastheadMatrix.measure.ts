/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE ACCEPTANCE MATRIX — the in-flow masthead, every in-scope page, on a real browser.
 *
 * ⚠️ CROSS-PAGE EQUALITY, NOT CONSTANTS. The standard is "identical to every other page", so this
 * collects each page's readings and compares them to EACH OTHER at the end. A file full of
 * `toBe(102)` would pass while all ten drifted together, which is the failure this whole pack was
 * cleaning up after: six headers once "matched" because the one element that differed between them
 * was absent from every measurement.
 *
 * ⚠️ AND EVERY CLAIM STATES ITS OWN PRECONDITION. A check that passes because the page never
 * reached the state it names is the shape behind several faults in this pack — a stacking probe
 * satisfied by `undefined` off-screen, an invariance claim across a scroll that never moved the
 * masthead out of view. Where a reading only means something in a particular state, that state is
 * asserted before the reading is used.
 */
import { test, expect, Page } from "@playwright/test";
import { openRoute, liftMotionSuppression, scrollbarWidth } from "./measure";

/** the page-specific class on each grid root — `.tpl-wpg` is shared by the three Tasks pages */
const PAGES: { name: string; route: string; cls: string; fill: boolean }[] = [
  { name: "Query Centre",        route: "/queries",             cls: "qc-wpg",  fill: true  },
  { name: "Analytics",           route: "/queries/analytics",   cls: "qa-wpg",  fill: false },
  { name: "Contact list",        route: "/agents",              cls: "agl-wpg", fill: false },
  { name: "Discover",            route: "/agents/discover",     cls: "dv-wpg",  fill: false },
  { name: "Manuscripts",         route: "/manuscripts",         cls: "msv-wpg", fill: true  },
  { name: "Comparable titles",   route: "/manuscripts/comps",   cls: "ct-wpg",  fill: false },
  { name: "Submission packages", route: "/manuscripts/packages",cls: "pkgw-wpg",fill: false },
  { name: "To-do list",          route: "/todo",                cls: "tpl-wpg", fill: true  },
  { name: "Calendar",            route: "/todo/calendar",       cls: "tpl-wpg", fill: true  },
  { name: "Noteboard",           route: "/todo/noteboard",      cls: "tpl-wpg", fill: true  },
];

const readMasthead = (page: Page, cls: string) => page.evaluate((c) => {
  const r = (n: number) => Math.round(n * 10) / 10;
  const all = [...document.querySelectorAll(`.wpg.${c}`)] as HTMLElement[];
  const g = all.find((e) => e.getBoundingClientRect().height > 0);
  if (!g) return null;
  const mast = g.querySelector(".wsh") as HTMLElement;
  const wrap = g.querySelector(".wpg-mast") as HTMLElement;
  const sc = g.querySelector(".wpg-scroll") as HTMLElement;
  const row = g.querySelector(".wpg-tools") as HTMLElement | null;
  const mark = mast.querySelector(".os-mark") as HTMLElement | null;
  const mini = g.querySelector(".wpg-mini") as HTMLElement | null;
  const title = mast.querySelector(".wsh-title") as HTMLElement;
  const cs = getComputedStyle(mast);
  const scb = sc.getBoundingClientRect();
  /* edges are reported as insets from BOTH window edges, so a reading names a position rather than
     a coordinate that changes with the viewport */
  const win = document.documentElement.clientWidth;
  return {
    fill: g.classList.contains("wpg--fill"),
    height: r(mast.getBoundingClientRect().height),
    padTop: cs.paddingTop, padBottom: cs.paddingBottom,
    marginBottom: cs.marginBottom,
    borderBottom: cs.borderBottomWidth,
    /* the card treatment that must be absent on every page */
    background: cs.backgroundColor, radius: cs.borderTopLeftRadius, shadow: cs.boxShadow,
    borderTop: cs.borderTopWidth, borderLeft: cs.borderLeftWidth,
    titleSize: getComputedStyle(title).fontSize,
    /* the description, and its box — a title-only page has neither, and that is the ONE legitimate
       reason for two mastheads to differ in height */
    hasSub: !!mast.querySelector(".wsh-sub"),
    subH: (() => {
      const e = mast.querySelector(".wsh-sub") as HTMLElement | null;
      if (!e) return 0;
      const b = e.getBoundingClientRect();
      return r(b.height + parseFloat(getComputedStyle(e).marginTop));
    })(),
    titleWeight: getComputedStyle(title).fontWeight,
    markW: mark ? r(mark.getBoundingClientRect().width) : -1,
    markH: mark ? r(mark.getBoundingClientRect().height) : 0,
    titleH: r(title.getBoundingClientRect().height),
    padSum: r(parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) + parseFloat(cs.borderBottomWidth)),
    illustrated: !!mark?.querySelector("img"),
    /**
     * ⚠️ STRUCTURAL, NEVER A LIST OF LABELS. A name list passes the day someone adds a control this
     * matrix has never heard of, which is exactly the day it should fail.
     *
     * ⚠️ COUNTED ON `.wpg-mast`, THE MASTHEAD AS A WHOLE — not on `.wsh` (masthead rethink, step 5).
     * Hide is the one permitted action and it is rendered BESIDE the header rather than through it,
     * so counting inside `.wsh` alone would report zero on a fill page and the rule would be
     * asserting nothing about the very control it exists to bound.
     */
    actionable: wrap.querySelectorAll("button, a, input, select, textarea, [role='button']").length,
    /* the header element itself must still carry none — no page may put a control in it */
    headerActionable: mast.querySelectorAll("button, a, input, select, textarea, [role='button']").length,
    /* where the control row sits relative to the scroller — the gap between chrome and controls */
    rowTop: row ? r(row.getBoundingClientRect().top - scb.top) : -1,
    hasRow: !!row,
    wrapTop: r(wrap.getBoundingClientRect().top - scb.top),
    /**
     * ⚠️ THE THREE THINGS THAT MUST SHARE ONE WIDTH: the masthead, its closing hairline (drawn as
     * the header's own `border-bottom`, so the header's box IS the hairline's width) and the mini
     * bar. They are what the masthead system is; a bar at the content gutter beside a masthead 64px
     * wider would read as a different object arriving rather than the same one folding.
     */
    mastEdges: `${r(wrap.getBoundingClientRect().left)}/${r(win - wrap.getBoundingClientRect().right)}`,
    ruleEdges: `${r(mast.getBoundingClientRect().left)}/${r(win - mast.getBoundingClientRect().right)}`,
    miniEdges: mini ? `${r(mini.getBoundingClientRect().left)}/${r(win - mini.getBoundingClientRect().right)}` : "",
    /* the mini bar: rendered on every scrolling page (at zero height until stuck), absent on a fill
       page until its masthead is folded */
    miniPresent: !!mini,
    miniActionable: mini ? mini.querySelectorAll("button, a, input, [role='button']").length : -1,
    /* the inset, with the scrollbar reservation measured beside it rather than assumed away */
    barReserve: r((sc.offsetWidth - sc.clientWidth) / 2),
    mastInset: r(wrap.getBoundingClientRect().left - sc.getBoundingClientRect().left),
  };
}, cls);

test("⚠️ THE MASTHEAD IS IDENTICAL ON EVERY IN-SCOPE PAGE", async ({ page }) => {
  const bar = await scrollbarWidth(page).catch(() => -1);
  const rows: { name: string; r: NonNullable<Awaited<ReturnType<typeof readMasthead>>> }[] = [];

  for (const p of PAGES) {
    await openRoute(page, p.route, { width: 1440, height: 900 });
    await liftMotionSuppression(page);
    const r = await readMasthead(page, p.cls);
    expect(r, `${p.name}: no visible grid with class .${p.cls}`).not.toBeNull();
    expect(r!.fill, `${p.name}: the fill variant disagrees with the census`).toBe(p.fill);
    rows.push({ name: p.name, r: r! });
  }

  console.log(
    `\nscrollbar width: ${bar}px (the harness's one blind spot — macOS decides this)\n` +
    rows.map(({ name, r }) =>
      `${name.padEnd(21)} h ${String(r.height).padStart(6)} · pad ${r.padTop}/${r.padBottom} · mb ${r.marginBottom}` +
      ` · title ${r.titleSize}/${r.titleWeight} · mark ${r.markW}${r.illustrated ? " (art)" : ""}` +
      ` · sub ${r.hasSub ? r.subH : "none"} · actionable ${r.actionable} · rowTop ${r.rowTop}`).join("\n"));

  /* ── every reading compared to every other page's, never to a constant ── */
  const same = (key: keyof (typeof rows)[0]["r"], why: string) => {
    const seen = new Map<string, string[]>();
    for (const { name, r } of rows) {
      const v = String(r[key]);
      seen.set(v, [...(seen.get(v) ?? []), name]);
    }
    expect([...seen.entries()].map(([v, ns]) => `${v}: ${ns.join(", ")}`).join(" | "),
      `${why} — the pages disagree`).not.toContain(" | ");
  };

  same("padTop", "the masthead's top padding");
  same("padBottom", "the masthead's bottom padding");
  same("marginBottom", "the gap from the masthead to what follows");
  same("borderBottom", "the masthead's closing hairline");
  same("titleSize", "the title size");
  same("titleWeight", "the title weight");
  same("background", "the masthead's ground");
  same("radius", "the masthead's corner radius");
  same("shadow", "the masthead's shadow");

  /**
   * ⚠️ THE HEIGHT IS A DERIVATION, AND ASSERTING IT AS A CONSTANT WAS WRONG — caught by this matrix
   * on its first run, then caught again one attempt later for getting the arithmetic wrong.
   *
   * THE RULE, in Nick's words: the masthead's height is a function of the MARK and the TITLE — and
   * of the description where a page has one — and of nothing else. Not of whatever ornament a page
   * hangs on its title (two carry a `Pro` pill; both are absolutely positioned out of the title's
   * line box precisely so this reading cannot move), and not of any page-scoped rule.
   *
   *     height = padding-top + max(mark, title + description) + padding-bottom + hairline
   *
   * ⚠️ THE `max()` IS THE PART BOTH EARLIER VERSIONS MISSED. `.wsh-row` centres a mark against a
   * text column, so whichever is TALLER sets the row. On a title-only page the 38px monoline mark
   * is taller than the 31px title and therefore owns the height; adding a description only buys
   * height once the text column passes the mark. That is why To-do measures 85 against everyone
   * else's 102.5, and why the difference is 17.5 rather than the description's own 24.9 box —
   * a number I asserted first, and which was simply not the rule.
   *
   * ⚠️ ASSERTED PER PAGE RATHER THAN AS GROUP EQUALITY, which is strictly stronger: it names every
   * input that may contribute, so a page that grows by 6px from something the design has not named
   * fails even if some other page happens to grow by the same amount.
   */
  for (const { name, r } of rows) {
    const derived = r.padSum + Math.max(r.markH, r.titleH + r.subH);
    expect(r.height, `${name}: the masthead is ${r.height}px, but mark ${r.markH} / title ${r.titleH} / description ${r.subH} / padding ${r.padSum} derive ${derived} — it is spending height on something unnamed`)
      .toBeCloseTo(derived, 0);
  }

  /* ⚠️ AND PAGES IN THE SAME CONDITION AGREE, which follows from the derivation but is asserted
     because it is the thing a reader actually cares about: two pages side by side must read as
     deliberate. Grouped by whether the page has a description — the one legitimate reason to
     differ, and the step-1 rule ("no description element — no reserved space"). */
  const withSub = rows.filter((x) => x.r.hasSub);
  const soloRows = rows.filter((x) => !x.r.hasSub);
  expect(withSub.length, "no page has a description — the height derivation is untested").toBeGreaterThan(1);
  expect([...new Set(withSub.map((x) => x.r.height))],
    `pages with a description disagree on height: ${withSub.map((x) => `${x.name} ${x.r.height}`).join(", ")}`)
    .toHaveLength(1);
  if (soloRows.length > 1) {
    expect([...new Set(soloRows.map((x) => x.r.height))],
      `title-only pages disagree on height: ${soloRows.map((x) => `${x.name} ${x.r.height}`).join(", ")}`)
      .toHaveLength(1);
  }

  /* ⚠️ NO CARD TREATMENT ANYWHERE — the whole visual change of the pack, asserted as values rather
     than as the absence of a rule, because a page can reintroduce any of them from its own sheet. */
  for (const { name, r } of rows) {
    expect(r.radius, `${name}: the masthead has a corner radius — it is drawing itself as a card`).toBe("0px");
    expect(r.shadow, `${name}: the masthead has a shadow`).toBe("none");
    expect(r.borderTop, `${name}: the masthead has a top border`).toBe("0px");
    expect(r.borderLeft, `${name}: the masthead has a side border`).toBe("0px");
    expect(r.borderBottom, `${name}: the masthead lost its closing hairline`).toBe("1px");
    /**
     * ⚠️ ONE ACTION ON A FILL PAGE, NONE ON A SCROLLING ONE — and the exception is exactly one thing.
     *
     * The rule the design rests on is that the masthead holds nothing you might reach for, so it
     * never needs restoring within a visit. A fill page cannot honour that literally: nothing
     * scrolls, so the masthead needs a way to leave, and Hide IS that way. A scrolling page has one
     * already — scrolling — so it keeps the rule unchanged.
     *
     * ⚠️ AND THE HEADER ELEMENT ITSELF CARRIES NONE ON EVERY PAGE. Hide is the grid's, rendered
     * beside `.wsh`; `PageHeader` still throws if a page hands it an action. Two counts, because
     * "one control on the masthead" and "no page may add one" are different claims.
     */
    const pages = PAGES.find((p) => p.name === name)!;
    expect(r.actionable, `${name}: the masthead carries ${r.actionable} controls; a ${pages.fill ? "fill" : "scrolling"} page's carries ${pages.fill ? 1 : 0}`)
      .toBe(pages.fill ? 1 : 0);
    expect(r.headerActionable, `${name}: a control was put inside the header element itself`).toBe(0);
    /* the masthead opens the scroll row — the control row anchors, so it must come second */
    expect(r.wrapTop, `${name}: something sits above the masthead inside the scroller`).toBeLessThanOrEqual(0.5);
  }

  /**
   * ⚠️ THE MASTHEAD, ITS HAIRLINE AND THE MINI BAR SHARE ONE WIDTH — WITHIN A PAGE, NOT ACROSS THEM.
   *
   * ⚠️ THIS REPLACES TWO ASSERTIONS THAT WERE BOTH TRUE OF THE WRONG DESIGN (masthead measure, §1).
   * They were "the masthead sits 16px inside the scroll row" and "every page's masthead has the same
   * edges" — correct while the masthead was a WINDOW concern with a width rule of its own, and that
   * is exactly the model that put the header 135px wider than the work on Query Centre at 2300.
   *
   * ⚠️ PAGES KEEP THEIR OWN GUTTERS AND MEASURES, so their mastheads are DELIBERATELY not equal to
   * each other: 35px on Query Centre and the Tasks family, 80 elsewhere, and Query Centre's work
   * surface caps at `--work-max`. A cross-page equality here would now be asserting that those
   * differences do not exist. The relationship that matters — masthead edges EQUAL the content's,
   * on every page at every width, including 2300 — is `contentGeometry.measure.ts`'s, where the
   * content is measured beside it.
   *
   * What stays here is the claim this file is placed to make: the three pieces of masthead chrome
   * are one object, so within a page they must share one width. A mini bar at the content gutter
   * beside a masthead 64px wider would read as a different object arriving rather than the same one
   * folding.
   */
  for (const { name, r } of rows) {
    expect(r.ruleEdges, `${name}: the closing hairline is not the masthead's own width`).toBe(r.mastEdges);
    if (r.miniPresent) {
      expect(r.miniEdges, `${name}: the mini bar sits at ${r.miniEdges} against the masthead's ${r.mastEdges}`)
        .toBe(r.mastEdges);
    }
  }

  /**
   * ⚠️ THE MINI BAR IS RENDERED ON EVERY SCROLLING PAGE AND ON NO FILL PAGE AT REST — presence, not
   * height. It is 0px tall until the page sticks, which is why this asserts that it EXISTS rather
   * than what it measures; the height and the stacking are `miniBar.measure.ts`'s job.
   *
   * ⚠️ AND ITS ONE CONTROL IS A FILL-PAGE AFFORDANCE. A scrolling page's masthead comes back by
   * scrolling up, so a chevron there would be a second way to do what the page already does — and
   * `-1` here means "no bar at all", which is the correct answer for a fill page at rest.
   */
  for (const { name, r } of rows) {
    const fill = PAGES.find((p) => p.name === name)!.fill;
    expect(r.miniPresent, `${name}: a ${fill ? "fill" : "scrolling"} page ${r.miniPresent ? "renders" : "does not render"} a mini bar at rest`).toBe(!fill);
    if (!fill) expect(r.miniActionable, `${name}: the mini bar carries ${r.miniActionable} control(s) on a scrolling page`).toBe(0);
  }

  /* ⚠️ TWO MARK SIZES AND EXACTLY TWO — illustrated bare, monoline on its parchment plate. Derived
     from the artwork by `markHasArt`, never passed in, so a page converts when its drawing lands. */
  const artSizes = new Set(rows.filter((x) => x.r.illustrated).map((x) => x.r.markW));
  const glyphSizes = new Set(rows.filter((x) => !x.r.illustrated).map((x) => x.r.markW));
  expect([...artSizes], "the illustrated marks are not all one size").toEqual([52]);
  expect([...glyphSizes], "the monoline marks are not all one size").toEqual([38]);

  /* ⚠️ AND THE CONTROL ROW SITS THE SAME DISTANCE BELOW ON EVERY PAGE THAT HAS ONE. This is where
     Submission packages diverged by 14px: its own body rhythm (`display:flex; gap:14px`) was on the
     scroll row, so it reached the grid's chrome once the chrome moved inside. */
  const withRow = rows.filter((x) => x.r.hasRow);
  expect(withRow.length, "no page renders a control row — the matrix would be asserting nothing").toBeGreaterThan(1);
  const rowTops = new Set(withRow.map((x) => x.r.rowTop));
  expect([...rowTops], `the control row sits at different heights: ${withRow.map((x) => `${x.name} ${x.r.rowTop}`).join(", ")}`)
    .toHaveLength(1);
});

test("⚠️ THE DASHBOARD IS UNTOUCHED — it renders none of this chrome", async ({ page }) => {
  /* The pack's one hard exclusion. Asserted on the RENDERED page rather than by not having opened
     its files: the dashboard could acquire the grid through a shared component without anyone
     editing `Dashboard.tsx`, and that is exactly the way it would happen. */
  await openRoute(page, "/dashboard", { width: 1440, height: 900 });
  const seen = await page.evaluate(() => {
    const visible = (sel: string) =>
      [...document.querySelectorAll(sel)].filter((e) => e.getBoundingClientRect().height > 0).length;
    return { grids: visible(".wpg"), mastheads: visible(".wsh"), rows: visible(".wpg-tools") };
  });
  expect(seen.grids, "the dashboard grew a WorkspacePageGrid").toBe(0);
  expect(seen.mastheads, "the dashboard grew a masthead").toBe(0);
  expect(seen.rows, "the dashboard grew a control row").toBe(0);
});
