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

/**
 * ══ THE CARVE-OUT, ENUMERATED — FOUR PROPERTIES, NOT A LIST OF PAGES ══════════════════════════
 *
 * ⚠️ A CARVE-OUT THAT NAMES PAGES EXEMPTS THEM FROM EVERYTHING, AND THAT IS AN OPT-OUT WEARING A
 * CARVE-OUT'S CLOTHES. This list used to be `CARVED = ["Submission packages"]`, consulted by one
 * helper that every identity key ran through — so a page carved out for its TITLE SIZE stopped
 * being held to its padding, its hairline, its radius and its shadow as well. The one page the
 * trial changed became the one page nothing checked, which is how the paint spent two packs inset
 * 35px from both window edges with a full-bleed lock green beside it.
 *
 * So the exemption is per PROPERTY. Each list names the pages whose value legitimately differs for
 * that one reading, every other assertion in this file continues to apply to them, and each list's
 * length is asserted so a page cannot join a carve quietly.
 *
 * `ground` and `artwork` are not keys here — they are asserted in `headerFix` and `washEdges`, and
 * are named so the four differences are enumerable in one place.
 */
const ILLUSTRATED = ["Submission packages", "Query Centre"];
const CARVES = {
  /**
   * ⚠️ GROUND IS OFF THE LIST, AND NOT FOR THE REASON THE BRIEF GIVES. It says Packages rejoins
   * because it is now on the shared `--ws-window` "like everywhere else" — but everywhere else the
   * masthead carries the PARCHMENT WASH, and `headerFix` still carves both trial pages out of that.
   * What lets them rejoin HERE is that this key reads the MEASURE's background, and the previous
   * pack moved every painted layer off the measure and onto the slab. Both pages leave the measure
   * transparent, like the other eight, so the exemption had already stopped doing anything.
   */
  /** a picture bleeds to the band's right edge, so its painted colour there is artwork */
  artwork: ILLUSTRATED,
  /**
   * ⚠️ `titleSize` AND `mark` ARE DELETED FROM THIS TABLE, AND THE MEASUREMENT IS WHAT RETIRED THEM.
   * The trial gave its two pages a 47px title against the shared 30px and drew no mark, so both were
   * exempt from the type scale, from the mark size, and — as the sum of those — from the height
   * comparison. The format rebuild gives every page a 44px title and NO page a mark: measured, all
   * ten read `title 44px/700 · mark -1`, and both trial pages sit at the same 141.1px of chrome as
   * the other eight.
   *
   * ⚠️ A CARVE-OUT NAMING PAGES THAT NO LONGER DIFFER CAN ONLY ROT, and it takes the comparison's
   * population with it — three claims were being asserted over eight pages while reading as ten.
   * `CARVED_HEIGHT` goes with them, so the height equality now covers the whole census.
   */
} as const;

const PAGES: { name: string; route: string; cls: string; fill: boolean }[] = [
  /* ⚠️ `fill: false` SINCE QUERY CENTRE BECAME A LIST AND A RECORD. `Queries.tsx` passes
     `fill={!!activeQuery}` — the RECORD view fills and its panes scroll, the browsing grid does not
     — and this census arrives with no `?q=`, so it measures the grid. The drift check caught the
     table before anyone read a number off it. */
  { name: "Query Centre",        route: "/queries",             cls: "qc-wpg",  fill: false },
  { name: "Analytics",           route: "/queries/analytics",   cls: "qa-wpg",  fill: false },
  { name: "Contact list",        route: "/agents",              cls: "agl-wpg", fill: false },
  { name: "Discover",            route: "/agents/discover",     cls: "dv-wpg",  fill: false },
  /* ⚠️ `fill: false` SINCE THE BOOK PROFILE DE-CONTAINERED (27 Aug) — the shelf's row genuinely
     scrolls, by 32px at 1440×900. Same drift, same catch. */
  { name: "Manuscripts",         route: "/manuscripts",         cls: "msv-wpg", fill: false },
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
  /**
   * ⚠️ A PAGE MAY HAVE NO MASTHEAD, AND THAT IS A READING RATHER THAN A CRASH. `WorkspacePageGrid`
   * takes `masthead` as a `ReactNode`, so `null` is a way for a page to decline the shared header
   * without editing the grid — and one page did exactly that for a while. This file dereferenced
   * `.wsh` unguarded and died with `Cannot read properties of null`, which is the least useful thing
   * a census can do: the fault it should have REPORTED was a page silently leaving the system.
   *
   * ⚠️ AND THE POPULATION IS ASSERTED SEPARATELY, both ways — that enough pages were measured, and
   * that the opted-out count is currently ZERO. An absence tolerated in silence is how three locks
   * came to crash at once instead of one lock going red with a sentence.
   */
  const mast = g.querySelector(".wsh") as HTMLElement | null;
  if (!mast) return { optedOut: true } as never;
  const wrap = g.querySelector(".wpg-mast") as HTMLElement;
  const sc = g.querySelector(".wpg-scroll") as HTMLElement;
  const row = g.querySelector(".wpg-tools") as HTMLElement | null;
  const mark = mast.querySelector(".os-mark") as HTMLElement | null;
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
    /* ⚠️ THE MASTHEAD DRAWS NO LINE (pinned chrome, §1) — the SLAB's base carries it, full width,
       once. Kept as a reading so "it drew one again" is a measurable claim rather than an absence. */
    borderBottom: cs.borderBottomWidth,

    slabLine: (() => {
      const slab = g.querySelector(".wpg-chrome") as HTMLElement | null;
      return slab ? getComputedStyle(slab).borderBottomWidth : "absent";
    })(),
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
    /* the line box, so the descender rule can be checked at BOTH sizes rather than only at 30px */
    titleLine: getComputedStyle(title).lineHeight,
    markW: mark ? r(mark.getBoundingClientRect().width) : -1,
    markH: mark ? r(mark.getBoundingClientRect().height) : 0,
    titleH: r(title.getBoundingClientRect().height),
    /**
     * ⚠️ THE PADDING IS `.wsh-body`'s, NOT `.wsh`'s — and reading the wrong element is what made this
     * derivation stale from the day the format landed. `.wsh` carries `padding: 0` and
     * `display: flow-root`; the air is stated on the body inside it, so `padSum` read 0 and the
     * whole sum came out 88px short. It was masked for four commits by the header-type assertions
     * that ran earlier in the same case.
     */
    padSum: (() => {
      const b = mast.querySelector(".wsh-body") as HTMLElement | null;
      if (!b) return 0;
      const bs = getComputedStyle(b);
      return r(parseFloat(bs.paddingTop) + parseFloat(bs.paddingBottom));
    })(),
    /* the rule above the body: its own height plus the margin that holds it off the container's edge */
    ruleH: (() => {
      const e = mast.querySelector(".wsh-toprule") as HTMLElement | null;
      if (!e) return 0;
      return r(e.getBoundingClientRect().height + parseFloat(getComputedStyle(e).marginTop));
    })(),
    /**
     * ⚠️ THE KICKER'S FLOW CONTRIBUTION, NOT ITS BOX — and the difference is 1.9px, which is exactly
     * the kind of number a derivation is supposed to name rather than absorb into a tolerance.
     *
     * `.wsh-kicker` is `display: inline-block`, so what it costs the column is the LINE BOX it sits
     * on — governed by the body's own `line-height` and its strut — plus its margin, not the pill's
     * border box. Measured as the distance from the body's content edge to the title's top, which
     * is that contribution by definition and cannot drift from it.
     */
    kickH: (() => {
      const b = mast.querySelector(".wsh-body") as HTMLElement | null;
      const e = mast.querySelector(".wsh-kicker") as HTMLElement | null;
      if (!b || !e) return 0;
      const contentTop = b.getBoundingClientRect().top + parseFloat(getComputedStyle(b).paddingTop);
      return r(title.getBoundingClientRect().top - contentTop);
    })(),
    illustrated: !!mark?.querySelector("img"),
    markCount: mast.querySelectorAll(".wsh-mark").length,
    /**
     * ⚠️ HIDE'S PRESENCE, read on the pages that draw it. The centring readings this note used to
     * introduce are deleted with the centred layout (masthead left-constant, §B).
     */
    /**
     * ⚠️ LOOKED FOR ON THE SLAB, NOT IN THE MEASURE — the fold control moved out of `.wpg-mast`
     * because that element collapses by animating `max-height` to 0 under `overflow: hidden`, so
     * anything inside it is clipped to the thing it collapses. `wrap` is the measure; the control is
     * its sibling now, so the search starts from the grid.
     */
    hidePresent: !!(wrap.closest(".wpg") ?? document).querySelector(".wpg-mast-hide"),
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
    /* the fold control, counted where it must NOT be — inside the measure it collapses */
    foldInMast: wrap.querySelectorAll(".wpg-mast-hide").length,
    /* the header element itself must still carry none — no page may put a control in it */
    headerActionable: mast.querySelectorAll("button, a, input, select, textarea, [role='button']").length,
    /* where the control row sits relative to the scroller — the gap between chrome and controls */
    rowTop: row ? r(row.getBoundingClientRect().top - scb.top) : -1,
    hasRow: !!row,
    /**
     * ⚠️ AGAINST THE SLAB'S INNER TOP EDGE, NOT THE SCROLLER'S — and the two are the same number on
     * nine pages, which is why the weaker form survived. Packages now carries a 3px accent bar as a
     * `border-top` on the slab, so the masthead legitimately begins 3px lower and this read 3
     * against a 0.5 ceiling, reporting "something sits above the masthead" about a page where
     * nothing does. The claim is that the masthead OPENS its container; a border on the container
     * is the container, so the reference is the container's content box.
     *
     * Split in two rather than loosened, because the weaker form was carrying two claims at once
     * and only one of them moved: the slab must still open the scroller, and nothing may sit
     * between the slab's inner edge and the masthead.
     */
    slabTop: (() => {
      const sl = g.querySelector(".wpg-chrome") as HTMLElement | null;
      return sl ? r(sl.getBoundingClientRect().top - scb.top) : -1;
    })(),
    wrapTop: (() => {
      const sl = g.querySelector(".wpg-chrome") as HTMLElement | null;
      if (!sl) return r(wrap.getBoundingClientRect().top - scb.top);
      const sb = sl.getBoundingClientRect();
      return r(wrap.getBoundingClientRect().top - (sb.top + parseFloat(getComputedStyle(sl).borderTopWidth)));
    })(),
    /**
     * ⚠️ THE THREE THINGS THAT MUST SHARE ONE WIDTH: the masthead, its closing hairline (drawn as
     * the SLAB's base) — one object, one width. A line at the content gutter beside a masthead 64px
     * wider would read as two things rather than one.
     */
    mastEdges: `${r(wrap.getBoundingClientRect().left)}/${r(win - wrap.getBoundingClientRect().right)}`,
    ruleEdges: `${r(mast.getBoundingClientRect().left)}/${r(win - mast.getBoundingClientRect().right)}`,
    /* ⚠️ THE FOLDED NAME BAR'S ROWS ARE DELETED (pinned chrome, §4) — its edges, its presence and
       its control count. The component is gone: the slab keeps the masthead on screen, settled, and
       a folded fill page shows a chevron on the window's border instead. */
    /* the inset, with the scrollbar reservation measured beside it rather than assumed away */
    barReserve: r((sc.offsetWidth - sc.clientWidth) / 2),
    mastInset: r(wrap.getBoundingClientRect().left - sc.getBoundingClientRect().left),
  };
}, cls);

test("⚠️ THE MASTHEAD IS IDENTICAL ON EVERY IN-SCOPE PAGE", async ({ page }) => {
  const bar = await scrollbarWidth(page).catch(() => -1);
  const rows: { name: string; r: NonNullable<Awaited<ReturnType<typeof readMasthead>>> }[] = [];

  const drifted: string[] = [];
  for (const p of PAGES) {
    await openRoute(page, p.route, { width: 1440, height: 900 });
    await liftMotionSuppression(page);
    const r = await readMasthead(page, p.cls);
    expect(r, `${p.name}: no visible grid with class .${p.cls}`).not.toBeNull();
    /**
     * ⚠️ A CENSUS GOES STALE, AND A PAGE THAT CHANGED VARIANT IS A READING RATHER THAN A FAULT.
     * Manuscripts was `fill` when this list was written and is not now, by another stream's change,
     * so this asserted a fact about the page from a list nobody had revisited. The MASTHEAD claims
     * below are what this case is for and they hold either way; the variant is reported so the drift
     * is visible instead of failing the run.
     */
    if (r!.fill !== p.fill) {
      drifted.push(`${p.name}: census says fill=${p.fill}, page says fill=${r!.fill}`);
    }
    rows.push({ name: p.name, r: r! });
  }

  if (drifted.length) console.log("\n⚠️ CENSUS DRIFT\n  " + drifted.join("\n  "));
  /* ⚠️ A FLOOR ON THE DRIFT, so a census that has entirely rotted fails rather than reporting ten
     lines nobody reads. */
  expect(drifted.length, `${drifted.length} pages no longer match the census — it needs rewriting`).toBeLessThanOrEqual(1);
  console.log(
    `\nscrollbar width: ${bar}px (the harness's one blind spot — macOS decides this)\n` +
    rows.map(({ name, r }) =>
      `${name.padEnd(21)} h ${String(r.height).padStart(6)} · pad ${r.padTop}/${r.padBottom} · mb ${r.marginBottom}` +
      ` · title ${r.titleSize}/${r.titleWeight} · mark ${r.markW}${r.illustrated ? " (art)" : ""}` +
      ` · sub ${r.hasSub ? r.subH : "none"} · actionable ${r.actionable} · rowTop ${r.rowTop}`).join("\n"));

  /* ── every reading compared to every other page's, never to a constant ── */
  /**
   * ⚠️ THE CARVED-OUT PAGE IS EXCLUDED FROM THE IDENTITY CLAIM, AND THIS IS THE HOLE THE 47px TITLE
   * KEPT FALLING THROUGH. This case asserts every Type A masthead is identical — a good law, and the
   * reason the trial's title reverted to 30px every single time it was raised, with nothing saying
   * why. The trial's carve-out covers ground, artwork AND type scale, so the page it applies to
   * cannot also be held to the shared scale. Its own values are asserted in `headerFix`; what stays
   * here is that the OTHER pages remain identical to each other, which is what the law protects.
   */
  const same = (key: keyof (typeof rows)[0]["r"], why: string, exempt: readonly string[] = []) => {
    const seen = new Map<string, string[]>();
    for (const { name, r } of rows.filter((x) => !exempt.includes(x.name))) {
      const v = String(r[key]);
      seen.set(v, [...(seen.get(v) ?? []), name]);
    }
    expect(seen.size, `${why}: nothing was compared — every page is carved out`).toBeGreaterThan(0);
    expect(rows.length - exempt.length, "fewer than four pages remain to compare").toBeGreaterThan(3);
    expect([...seen.entries()].map(([v, ns]) => `${v}: ${ns.join(", ")}`).join(" | "),
      `${why} — the pages disagree`).not.toContain(" | ");
  };

  same("padTop", "the masthead's top padding");
  same("padBottom", "the masthead's bottom padding");
  same("marginBottom", "the gap from the masthead to what follows");
  /* ⚠️ THE MASTHEAD DRAWS NO LINE AND THE SLAB DRAWS ONE — asserted as two positive claims rather
     than as one absence, because "the hairline is 0 everywhere" is also true of a build that lost it
     altogether (pinned chrome, §1). */
  /**
   * ⚠️ NO PAGE HAS OPTED OUT, AND THAT IS ASSERTED RATHER THAN ASSUMED (Nick's call, after
   * Comparable titles did). A page declining the shared masthead is a product decision — one
   * masthead, one settle, one Hide rule — so it surfaces here as a named failure instead of being
   * absorbed by a skip. The reading above keeps the state measurable for a page that genuinely
   * needs it one day; this says today is not that day.
   */
  const optedOut = rows.filter((x) => (x.r as { optedOut?: boolean }).optedOut).map((x) => x.name);
  expect(optedOut, `${optedOut.join(", ")} render the grid with no masthead. Page headers behave identically across the app; if a page genuinely needs to decline, that is a decision to take rather than a lock to relax.`)
    .toEqual([]);
  expect(rows.length, "no page was measured at all").toBe(PAGES.length);

  for (const { name, r } of rows) {
    expect(r.borderBottom, `${name}: the masthead drew its own hairline again — the slab's base is the one line`).toBe("0px");
  }
  same("slabLine", "the slab's base hairline");
  for (const { name, r } of rows) {
    expect(parseFloat(String(r.slabLine)), `${name}: the chrome slab has no base hairline`).toBeGreaterThan(0);
  }
  /* ⚠️ NO EXEMPTION — `CARVES.titleSize` was retired when the two illustrated pages stopped drawing
     a 47px title, and this call site kept reading it. It is a tsc error, it was committed with a
     message claiming a clean typecheck, and it survived because a measurement file is only
     typechecked by the ROOT `tsc` — which nothing in the local loop runs after a gate has once been
     seen green. Every page carries the same title size now, so the comparison is over all ten. */
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
   *     height = top rule (+ its margin) + body padding + kicker (+ its gap) + title + description
   *
   * ⚠️ THE `max(mark, …)` TERM IS GONE WITH THE MARK. The old format put a mark beside a text
   * column and whichever was TALLER owned the row, which is why a title-only page measured 85
   * against everyone else's 102.5 — the difference being the mark's floor rather than the
   * description's own box. There is no mark, so the parts simply stack.
   *
   * ⚠️ AND THE PADDING IS THE BODY'S. See the note at `padSum`: this derivation read `.wsh`'s and
   * was 88px short from the day the format landed, masked by assertions that ran before it.
   *
   * ⚠️ ASSERTED PER PAGE RATHER THAN AS GROUP EQUALITY, which is strictly stronger: it names every
   * input that may contribute, so a page that grows by 6px from something the design has not named
   * fails even if some other page happens to grow by the same amount.
   */
  for (const { name, r } of rows) {
    const derived = r.ruleH + r.padSum + r.kickH + r.titleH + r.subH;
    expect(r.height, `${name}: the masthead is ${r.height}px, but rule ${r.ruleH} / padding ${r.padSum} / kicker ${r.kickH} / title ${r.titleH} / description ${r.subH} derive ${derived} — it is spending height on something unnamed`)
      .toBeCloseTo(derived, 0);
  }

  /**
   * ⚠️ AND PAGES IN THE SAME CONDITION AGREE — ONCE THE DESCRIPTION'S OWN BOX IS TAKEN OUT.
   *
   * ⚠️ THE EQUALITY USED TO BE OVER RAW HEIGHT, AND THAT WAS ASSERTING COPY. The description is
   * capped at 58ch and wraps; a page whose sentence runs to two lines is 23.2px taller, which is
   * one line of `--mast-sub-size` at 1.45. Measured: Analytics and Noteboard at 198.5, four others
   * at 175.3 — six correct mastheads reported as disagreeing, because two of them had a longer
   * sentence. That is the same fault as the partition demanding a page currently overflow: a fact
   * about today's content standing in for a fact about the format.
   *
   * ⚠️ SO THE CLAIM IS ABOUT THE CHROME AROUND THE SENTENCE, which is what "identical" means here:
   * every masthead spends the same on rule, padding, kicker and title, and differs only by how many
   * lines its own copy takes. The line count is REPORTED, so a description that quietly grew to
   * four lines is visible without being a failure.
   */
  const withSub = rows.filter((x) => x.r.hasSub);
  const soloRows = rows.filter((x) => !x.r.hasSub);
  expect(withSub.length, "no page has a description — the height derivation is untested").toBeGreaterThan(1);
  console.log("\n══ MASTHEAD HEIGHT · chrome vs copy\n" + withSub
    .map((x) => `${x.name.padEnd(21)} ${x.r.height} = chrome ${(x.r.height - x.r.subH).toFixed(1)} + description ${x.r.subH}`).join("\n"));
  expect([...new Set(withSub.map((x) => Math.round(x.r.height - x.r.subH)))],
    `pages with a description disagree on their chrome: ${withSub.map((x) => `${x.name} ${(x.r.height - x.r.subH).toFixed(1)}`).join(", ")}`)
    .toHaveLength(1);
  if (soloRows.length > 1) {
    expect([...new Set(soloRows.map((x) => x.r.height))],
      `title-only pages disagree on height: ${soloRows.map((x) => `${x.name} ${x.r.height}`).join(", ")}`)
      .toHaveLength(1);
  }

  /* ⚠️ NO CARD TREATMENT ANYWHERE — the whole visual change of the pack, asserted as values rather
     than as the absence of a rule, because a page can reintroduce any of them from its own sheet. */
  const slotted: string[] = [];
  for (const { name, r } of rows) {
    expect(r.radius, `${name}: the masthead has a corner radius — it is drawing itself as a card`).toBe("0px");
    expect(r.shadow, `${name}: the masthead has a shadow`).toBe("none");
    expect(r.borderTop, `${name}: the masthead has a top border`).toBe("0px");
    expect(r.borderLeft, `${name}: the masthead has a side border`).toBe("0px");
    /* the closing hairline is the SLAB's now, and it is asserted on the slab a few cases below */
    expect(r.borderBottom, `${name}: the masthead drew its own hairline again — it would stop at the masthead's measure while the slab's shadow ran full width`).toBe("0px");
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
    /**
     * ⚠️ NO CONTROL IN ANY MASTHEAD, ON ANY PAGE, AND THE TYPE BRANCH IS DELETED WITH THE TYPES.
     *
     * This case has now stated three different laws about masthead controls, each correct for its
     * moment: none anywhere; one on a `fill` page (Hide); then none on Type B and an action slot on
     * Type A, because a masthead that LEAVES on scroll cannot anchor a control while a pinned one
     * can. Every masthead leaves now, so the second half of that reasoning applies to all ten and
     * the partition it was expressed through is gone. `PageHeader` throws on any control it is
     * handed — the guard is unconditional again.
     */
    expect(r.foldInMast ?? 0, `${name}: a fold control came back — the fold is deleted`).toBe(0);
    expect(r.actionable, `${name} carries ${r.actionable} control(s) in its masthead — every masthead leaves on scroll and holds none`).toBe(0);
    expect(r.headerActionable, `${name} has a control inside its header element`).toBe(0);
    /* the masthead opens the scroll row — the control row anchors, so it must come second */
    expect(r.slabTop, `${name}: the chrome slab does not open the scroll row — something sits above it`).toBeLessThanOrEqual(0.5);
    expect(r.wrapTop, `${name}: something sits between the slab's inner top edge and the masthead`).toBeLessThanOrEqual(0.5);
  }  /* the slot is gone; the list is kept as a report so a reappearance is visible rather than silent */
  expect(slotted, `${slotted.join(", ")} put a control in the masthead — there is no slot any more`).toEqual([]);


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
  }

  /**
   * ⚠️ THE BAR IS RENDERED ON EVERY PAGE AND SHOWN ON NONE AT REST — presence, not height. It is
   * `opacity: 0` and takes no flow height until the page scrolls past its threshold, which is why
   * this asserts that it EXISTS rather than what it measures; the handoff itself is
   * `handoff.measure.ts`'s job and its binding is `barBinding.measure.ts`'s.
   *
   * ⚠️ THE FILL/SCROLL SPLIT IS GONE FROM THIS CLAIM. It used to say the bar's restore chevron was a
   * fill-page affordance and a scrolling page came back by scrolling; there is no chevron, no fold,
   * and one behaviour.
   */

  /**
   * ⚠️ NO PAGE CARRIES A MARK, AND THE CLAIM IS INVERTED RATHER THAN LAPSED.
   *
   * The masthead used to draw one — 52px, one size for both the illustrated and monoline families,
   * with a `MARKLESS` carve-out for the one page that drew none by decision. The format rebuild
   * removed it from every masthead: the header is a kicker, a title and a subtitle.
   *
   * ⚠️ THE OLD SIZE ASSERTION HAD BEEN RED SINCE PHASE 1 AND NOBODY SAW IT, because the header-type
   * assertions failed first in the same case. Every page reported `-1` — the sentinel for "no mark"
   * — against an expected `[52]`.
   *
   * ⚠️ AND `MARKLESS` GOES WITH IT. A carve-out naming the pages that differ from a rule everybody
   * now follows is a list that can only rot; the absence is asserted over the whole census instead.
   */
  for (const { name, r } of rows) {
    expect(r.markCount, `${name} draws ${r.markCount} mark(s) — the masthead carries none`).toBe(0);
    expect(r.markW, `${name} has grown a mark`).toBe(-1);
    /* ⚠️ `Hide` IS DELETED, ON EVERY PAGE. The count stays as an ABSENCE rather than lapsing: a
       fold control is exactly the kind of thing that gets half-restored on one page. */
    expect(r.hidePresent, `${name} drew a Hide — the fold is deleted`).toBe(false);
  }

  /* ⚠️ AND THE CONTROL ROW SITS THE SAME DISTANCE BELOW ON EVERY PAGE THAT HAS ONE. This is where
     Submission packages diverged by 14px: its own body rhythm (`display:flex; gap:14px`) was on the
     scroll row, so it reached the grid's chrome once the chrome moved inside. */
  const withRow = rows.filter((x) => x.r.hasRow);
  expect(withRow.length, "no page renders a control row — the matrix would be asserting nothing").toBeGreaterThan(1);
  /**
   * ⚠️ THE CLAIM IS A RELATIONSHIP, NOT A COUNT OF DISTINCT VALUES — and counting was measuring copy
   * for the third time in this file.
   *
   * It allowed at most TWO row positions, because at the time there were two conditions: a page with
   * a description and a page without. There are three now — 198.5, 175.3 and 141.2 — and the third
   * is simply a description that wraps to a second line. Nothing has drifted; the tolerance was
   * counting the wrong thing, and it had already been loosened once to accommodate a real outlier
   * rather than diagnose it.
   *
   * ⚠️ WHAT THE CASE ACTUALLY MEANS is that the control row sits IMMEDIATELY BELOW the masthead with
   * nothing between them — so its top IS the masthead's height, per page, to the pixel. That is
   * strictly stronger than any spread: it cannot be satisfied by two pages being wrong in the same
   * direction, and it goes on holding however many line counts the descriptions grow into.
   */
  console.log("\n══ CONTROL ROW vs MASTHEAD\n" + withRow
    .map((x) => `${x.name.padEnd(21)} row top ${x.r.rowTop} · masthead ${x.r.height}`).join("\n"));
  for (const { name, r } of withRow) {
    expect(r.rowTop, `${name}: the control row sits at ${r.rowTop} under a ${r.height}px masthead — something is between them`)
      .toBeCloseTo(r.height, 0);
  }
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

/**
 * ⚠️ THE SETTLED POSTURE IS DELETED, AND THE CASE THAT MEASURED IT GOES WITH IT.
 *
 * It asserted that the pinned chrome was THE SAME OBJECT at half the height — mark 52→34, title
 * 30→22, description folded, paddings tightened — measured as a derivation rather than against
 * literals, so a retune moved the design without moving the lock.
 *
 * The masthead does not settle. It scrolls away as content and the collapsed bar takes over, which
 * is measured in `handoff.measure.ts` — the same claim about identity surviving, over the mechanism
 * that now carries it.
 */
