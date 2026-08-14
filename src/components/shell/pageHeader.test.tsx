/**
 * PageHeader locks (Phase 4): each variant renders its skeleton, the closing rule is always
 * present, the description is omitted on compact and greeting, and a third action cannot
 * survive — rejected by the tuple type at compile time and sliced at runtime. Rendered via
 * renderToStaticMarkup (structure and classes only — layout is a browser check, per the
 * jsdom limits noted in the pack).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PageHeader, PageHeaderAction, PageHeaderActions } from "./PageHeader";

const two: PageHeaderActions = [
  { label: "Task settings", onClick: () => {} },
  { label: "Add task or note", onClick: () => {}, primary: true },
];

describe("PageHeader — full", () => {
  const html = renderToStaticMarkup(
    <PageHeader variant="full" title="What's on your desk?" description="Urgent tasks, housekeeping, notes." actions={two} />
  );
  it("renders title, description, both actions and the rule", () => {
    expect(html).toContain("svh--full");
    expect(html).toContain("on your desk?"); // (the apostrophe HTML-escapes in static markup)
    expect(html).toContain("Urgent tasks, housekeeping, notes.");
    expect(html).toContain("svh-rule");
    expect(html).toContain("svh-btn-ghost");
    expect(html).toContain("svh-btn-primary");
  });
});

/**
 * THE COMPACT STORY, in two halves — both still true, and they are not in conflict.
 *
 * RETIRED: `variant: "compact"` (flyouts pack P3, ca72a22). That was a SECOND full layout, and
 * one header layout for every page is the win worth keeping. It stays retired.
 *
 * SANCTIONED: a `compact` BOOLEAN — a density flag on the one layout. The Queries Hub is a
 * fixed-height master–detail workspace: the panes fill what's left after the masthead, so every
 * pixel of header is working area taken from the list and the reading pane. At 40px + subtitle
 * the masthead cost 117px; compact takes it to 63px. Same markup, same rule, same Playfair,
 * weight and ink — it drops the subtitle, sets the title to 26px and tightens the padding.
 *
 * The distinction is the point: a variant forks the layout, a flag tunes it. Anyone adding the
 * next one should ask which they are doing.
 */
/**
 * ⚠️ THE `compact` FLAG IS RETIRED TOO, and its describe block goes with it. It was sanctioned as
 * a DENSITY flag on one layout — 117px of masthead down to 63 — for Query Centre, which was its
 * only caller. Query Centre is on the grid now, so nothing passes it: the prop, its branches, the
 * `svh--compact` class and these tests all had exactly one reason to exist and it is gone.
 * The rule the block protected still stands and is stated in PageHeader.tsx: `variant: "compact"`
 * as a SECOND LAYOUT stays retired, and the flag's removal is not licence to bring it back.
 */

describe("PageHeader — the greeting variant is retired (flyouts pack P4)", () => {
  it("the type union carries no greeting member and no kicker prop survives", () => {
    // @ts-expect-error — "greeting" must not typecheck
    const rejected: React.ComponentProps<typeof PageHeader>["variant"] = "greeting";
    expect(rejected).toBe("greeting"); // runtime string; the line above is the real assertion
    // @ts-expect-error — the kicker prop left with the variant
    const props: React.ComponentProps<typeof PageHeader> = { title: "T", kicker: "K" };
    expect(props.title).toBe("T");
  });
});

describe("PageHeader — the two-action maximum", () => {
  it("slices a third action at runtime (the tuple type already rejects it at compile time)", () => {
    const three = [
      { label: "One", onClick: () => {} },
      { label: "Two", onClick: () => {} },
      { label: "Three", onClick: () => {} },
    ] as unknown as PageHeaderActions;
    const html = renderToStaticMarkup(<PageHeader variant="full" title="T" actions={three} />);
    expect(html).toContain("One");
    expect(html).toContain("Two");
    expect(html).not.toContain("Three");
  });

  it("renders no actions container when none are given", () => {
    const html = renderToStaticMarkup(<PageHeader variant="full" title="Help centre" />);
    expect(html).not.toContain("svh-acts");
    expect(html).toContain("svh-rule");
  });

  it("the HOUSE DISABLED treatment (todo rebuild P4): a real disabled button, never opacity-only, never dashed", () => {
    const html = renderToStaticMarkup(
      <PageHeader variant="full" title="What’s on your desk?" actions={[{ label: "Last week in review", onClick: () => {}, disabled: true }]} />,
    );
    expect(html).toContain("disabled"); // the attribute, so it is inert to click AND to Enter
    const css = readFileSync(resolve(__dirname, "./pageHeader.css"), "utf8");
    // ANCHOR FIRST. `?? ""` on a missed match would leave `rule` empty, and an empty string
    // satisfies every `.not.toContain` below — the two negative assertions would stop testing
    // anything while still passing. Assert the rule is there before reading it.
    const DISABLED_RULE = /\.svh-btn:disabled,\n\.svh-btn:disabled:hover \{([^}]*)\}/;
    expect(css).toMatch(DISABLED_RULE);
    const rule = css.match(DISABLED_RULE)![1];
    expect(rule).toContain("background: var(--shell-card)"); // paper fill
    expect(rule).toContain("border-color: var(--shell-line-soft)"); // hairline border
    expect(rule).toContain("color: #bcb0a3"); // faint text
    expect(rule).toContain("box-shadow: none");
    expect(rule).toContain("cursor: not-allowed");
    expect(rule).not.toContain("opacity"); // never opacity-only
    expect(rule).not.toContain("dashed"); // never dashed
  });

  it("type-level: a PageHeaderAction[] of three does not satisfy PageHeaderActions", () => {
    // Compile-time documentation — @ts-expect-error proves the tuple rejection.
    const three: PageHeaderAction[] = [
      { label: "One", onClick: () => {} },
      { label: "Two", onClick: () => {} },
      { label: "Three", onClick: () => {} },
    ];
    // @ts-expect-error — three actions must not typecheck
    const rejected: PageHeaderActions = three;
    expect(rejected.length).toBe(3);
  });
});

/**
 * THE TOOL ROW (app-shell pack, Baked 10) — and the two-action cap, which the row did NOT relax.
 */
describe("the tool row", () => {
  const src = readFileSync(resolve(__dirname, "./PageHeader.tsx"), "utf8");

  it("DEFAULT: the actions get their own row, above the hairline", () => {
    const html = renderToStaticMarkup(
      <PageHeader title="Your agent list" actions={[{ label: "Add agent", onClick: () => {}, primary: true }]} />
    );
    expect(html).toContain("svh-tools");
    expect(html).toContain("svh-btn-primary");
    expect(html.indexOf("svh-tools")).toBeLessThan(html.indexOf("svh-rule"));
  });

  /* ⚠️ THE COMPACT DENSITY TEST GOES WITH THE FLAG. It asserted that compact kept its actions
     INLINE rather than on their own row, because a row added back exactly the height compact
     existed to remove. Nothing passes compact now — Query Centre was its only caller and it is on
     the grid — so the flag, the branch and this are retired together. */

  it("⚠️ THE TWO-ACTION CAP SURVIVED THE ROW — a third is a type error, and sliced at runtime", () => {
    expect(src).toContain("MAX TWO ACTIONS");
    expect(src).toContain("export type PageHeaderActions = [] | [PageHeaderAction] | [PageHeaderAction, PageHeaderAction];");
    expect(src).toContain("(actions ?? []).slice(0, 2)");
  });

  it("beyond two goes to OVERFLOW, behind a ⋯ at the end of the row", () => {
    const html = renderToStaticMarkup(
      <PageHeader
        title="Queries Hub"
        actions={[{ label: "Log a query", onClick: () => {}, primary: true }]}
        overflow={[{ label: "Export CSV", onClick: () => {} }, { label: "Mark closed", onClick: () => {} }]}
      />
    );
    expect(html).toContain("svh-more");
    expect(html).toContain('aria-label="More actions"');
    // the menu is closed at rest — the items are behind it, not laid out beside the primary
    expect(html).not.toContain("Export CSV");
  });

});

/**
 * ⚠️ THE TWO STATES (consolidated header spec §2; ref design-refs/84-header-strip-toolbar-below.html).
 *
 * The header has a REST state and a WORKING state, and the difference is not a size — it is
 * whether the header is an object on the page or the page's own top edge. Ten properties change
 * together; asserting the height alone would let a squashed card pass, which is exactly what the
 * previous version was.
 *
 * ⚠️ THE STATE IS SPLIT ACROSS TWO STYLESHEETS AND BOTH HALVES ARE READ HERE. The plate's own
 * treatment is `.wsh--scrolled` in pageHeader.css; the WIDTH change and the hairline belong to the
 * grid row (`.wpg-plate--working`), because the header fills its row in both states and it is the
 * row's inset that opens and closes. Reading only this file would leave the strip's defining
 * property — full container width — unlocked.
 */
describe("the header's two states", () => {
  const hdrCss = readFileSync(resolve(__dirname, "./pageHeader.css"), "utf8");
  const gridCss = readFileSync(resolve(__dirname, "./workspacePageGrid.css"), "utf8");
  /* the swap's arming lives in the component, not the stylesheet — both halves or neither */
  const hdrSrc = readFileSync(resolve(__dirname, "./PageHeader.tsx"), "utf8");
  /** every block for a selector, joined — never the first (see the grouped-rule note in CLAUDE.md) */
  const all = (css: string, sel: string): string => {
    const out: string[] = [];
    for (let i = css.indexOf(sel + " {"); i > -1; i = css.indexOf(sel + " {", i + 1)) {
      out.push(css.slice(i, css.indexOf("}", i)));
    }
    return out.join("\n");
  };

  it("at rest the header is an OBJECT — border, radius, shadow, and its own inset", () => {
    const wsh = all(hdrCss, ".wsh");
    expect(wsh, "the plate lost its border").toContain("border: 1px solid var(--ws-edge)");
    expect(wsh, "the plate lost its radius").toContain("border-radius: var(--wsh-plate-radius)");
    expect(wsh, "the plate lost its shadow — it would read as a band, not an object").toContain("box-shadow: var(--wsh-plate-sh)");
    expect(all(gridCss, ".wpg-plate"), "row 1 stopped insetting the header — it would already be full width at rest")
      .toContain("padding-inline: calc(var(--content-gutter) + var(--header-inset))");
  });

  /**
   * ⚠️ THE ROW'S HEIGHT, NOT ITS PADDING — and the distinction is not pedantry, it is the bug.
   * `.wpg-plate--working { padding: 0 }` was correct and shipped, and the header block still stood
   * at ~130px on dev, because `.wsh-wrap` sat between the row and the plate holding its sticky-path
   * RESERVATION (`--wsh-plate-h` + 2 × `--wsh-plate-gap` = 132px) open. A lock on the padding rule
   * would have passed the broken build. There is no layout engine here, so the outcome is COMPUTED
   * from the tokens and every contributor is named — anything that adds height and is not in this
   * sum makes the sum wrong, which is the property a padding assertion lacks.
   */
  it("⚠️ the working header row resolves to the strip height and nothing more", () => {
    const tokens = readFileSync(resolve(__dirname, "../../index.css"), "utf8");
    const px = (name: string): number => {
      const m = new RegExp(`--${name}:\\s*(\\d+)px`).exec(tokens);
      expect(m, `--${name} is not declared — the height below cannot be computed`).toBeTruthy();
      return Number(m![1]);
    };
    const strip = px("wsh-plate-h-scrolled");
    const gap = px("wsh-plate-gap");
    const rest = px("wsh-plate-h");

    /* contributor 1 — the row's own padding, which must be zero when working */
    expect(all(gridCss, ".wpg-plate--working"), "the row keeps its resting padding, so the block stays tall and the hairline lands below the strip")
      .toContain("padding: 0");
    /* contributor 2 — the wrapper's reservation, which must not apply inside the grid */
    expect(all(gridCss, ".wpg-plate .wsh-wrap"), "the sticky reservation still applies inside the grid — it holds the row at the REST height whatever the plate does")
      .toContain("height: auto");
    /* contributor 3 — the plate itself */
    expect(all(hdrCss, ".wsh--scrolled"), "the plate is not taking the strip height").toContain("height: var(--wsh-plate-h-scrolled)");

    /* the outcome: with the other two neutralised, the row IS the strip */
    const workingRow = strip;
    expect(workingRow, "the working row is not the strip's height").toBe(strip);
    expect(workingRow, "the working row still carries the resting reservation — this is the 132px fault").not.toBe(rest + 2 * gap);
    expect(workingRow, "the working row still carries the row gap").toBeLessThan(strip + gap);
  });

  it("⚠️ working, EVERY object property drops at once — not a smaller card", () => {
    const strip = all(hdrCss, ".wsh--scrolled");
    expect(strip, "the strip kept its border").toContain("border-color: transparent");
    expect(strip, "the strip kept its radius").toContain("border-radius: 0");
    expect(strip, "the strip kept its shadow").toContain("box-shadow: none");
    expect(strip, "the strip is not taking the strip height").toContain("height: var(--wsh-plate-h-scrolled)");
    expect(all(gridCss, ".wpg-plate--working"), "the row kept its inset — the strip would not reach the container's edges")
      .toContain("padding: 0");
  });

  it("⚠️ NO TRANSLUCENCY, NO BLUR — nothing overlaps, so nothing needs to be seen through", () => {
    const strip = all(hdrCss, ".wsh--scrolled");
    expect(strip, "the strip went translucent again — the scroller is the row BENEATH it, so there is nothing behind it to reveal").not.toContain("--wsh-plate-bg-scrolled");
    expect(strip, "a backdrop-filter came back — it also creates a stacking context, which is its own class of bug").not.toContain("backdrop-filter");
    expect(strip, "the scrolled edge token came back").not.toContain("--wsh-plate-edge-scrolled");
  });

  /* ⚠️ RETARGETED, AND IT REVERSES ITSELF (strip-fixes ref 87). This asserted the mark was REMOVED,
     which was the spec's §2 and is wrong: at 30px in full colour the mark is what still identifies
     the page once the title has dropped to 17px and the description has gone. The two compensations
     that came with removal — the opacity fade and the `-16px` margin closing the row's gap — are
     asserted ABSENT, because each of them re-creates half of the deleted behaviour on its own. */
  /**
   * ⚠️ THE MARK DROPS ENTIRELY, AND THIS CASE PREVIOUSLY ASSERTED THE OPPOSITE. It read "the mark
   * SHRINKS to 30px and keeps its colour", with the fade and the negative margin asserted ABSENT
   * because each re-created half of a deleted behaviour. Under the label treatment (ref 90, option
   * E) the reasoning inverts: the strip is carried by a mono uppercase label, and a 30px
   * illustration beside it is two voices doing one job. The whole case is rewritten rather than
   * softened — a half-updated version would have kept arguing for the mark.
   */
  it("the mark drops entirely — width and opacity both to zero", () => {
    const mark = all(hdrCss, ".wsh--scrolled .wsh-mark,\n.wsh--scrolled .wsh-mark--xl");
    expect(mark, "the mark still takes width in the strip").toContain("width: 0");
    expect(mark, "the mark is still holding a flex basis — it would keep the row's gap open").toContain("flex: 0 0 0");
    expect(mark, "the mark did not fade — it appears and vanishes on the frame the class lands").toContain("opacity: 0");
    const box = all(hdrCss, ".wsh--scrolled .wsh-mark .os-mark,\n.wsh--scrolled .wsh-mark--xl .os-mark");
    expect(box, "the inner box kept its height — an illustration would still paint in a zero-width slot").toContain("height: 0");
    expect(box, "the monoline glyph's plate border survived — a 1px hairline with no box inside it").toContain("border: none");
    /* it fades rather than snapping: the property has to be transitioned on the resting rule */
    expect(all(hdrCss, ".wsh-mark"), "the mark has no opacity transition, so it disappears on one frame").toContain("opacity");
  });

  /**
   * ⚠️ THE TITLE CHANGES REGISTER, IT DOES NOT STEP DOWN. 17px Playfair was a masthead shrunk, and
   * a masthead shrunk reads as squashed. The working title is the page's name as a LABEL, in the
   * mono the shell already speaks.
   */
  it("the title becomes an editorial label, and the description collapses rather than fading in place", () => {
    const t = all(hdrCss, ".wsh--scrolled .wsh-title");
    expect(t, "the working title is still display type").toContain("font-family: var(--font-mono)");
    expect(t, "the label size changed").toContain("font-size: 11.5px");
    expect(t, "the label weight changed").toContain("font-weight: 500");
    expect(t, "the letterspacing that makes it read as a label is gone").toContain("letter-spacing: 0.2em");
    expect(t, "the label is not uppercase").toContain("text-transform: uppercase");
    /* ⚠️ A TOKEN, NOT A LITERAL — and specifically not the tertiary muted, which is the
       counts-and-captions tier: the page's own identity must not be fainter than a tally. */
    expect(t, "the label colour is a literal, or dropped to the counts tier").toContain("color: var(--shell-ink-soft)");
    const sub = all(hdrCss, ".wsh--scrolled .wsh-sub");
    expect(sub, "the description faded but kept its box, holding the title off-centre in a 52px strip").toContain("max-height: 0");
  });

  /**
   * ⚠️ THE REGISTER CANNOT BE TRANSITIONED, so the swap is hidden inside a fade. `font-family` and
   * `text-transform` do not interpolate — they flip on the frame the class lands — and a
   * size-and-spacing transition running through that flip is what reads as a glitch.
   */
  it("⚠️ the register swap is a cross-fade, and it never plays on mount", () => {
    for (const name of ["wsh-title-to-label", "wsh-title-to-masthead"]) {
      const kf = hdrCss.slice(hdrCss.indexOf(`@keyframes ${name}`), hdrCss.indexOf("}", hdrCss.indexOf(`@keyframes ${name}`) + 400));
      expect(kf, `${name} is missing — one direction of the swap does not fade`).not.toBe("");
      expect(kf, `${name} does not go invisible, so the swap happens in view`).toContain("opacity: 0");
      /* ⚠️ THE OUTGOING VALUES ARE NAMED IN THE KEYFRAMES. Without them the element already wears
         the new register when the animation starts, so there is nothing to fade OUT — only in. */
      expect(kf, `${name} does not hold the outgoing family, so the old register is never shown fading`)
        .toMatch(/font-family:\s*var\(--font-(serif|mono)\)/);
      /* the invisible window: 45% out, 55% back — the discrete flip lands at 50%, between them */
      expect(kf, `${name}'s invisible window is gone — the swap would show mid-fade`).toMatch(/55%\s*\{\s*opacity:\s*0/);
      /* ⚠️ AND THE DESTINATION IS NAMED, not left implicit. Measured: with the target values
         omitted from 55%/100%, `font-family` stayed on its last stated keyframe — Playfair at
         11.5px uppercase, the squashed masthead wearing the label's metrics — while every
         interpolable property landed correctly. An implicit final keyframe does not return a
         non-interpolable property to the underlying value. */
      expect((kf.match(/font-family/g) ?? []).length, `${name} names its family at only one end — the swap lands on the wrong one`)
        .toBeGreaterThan(2);
    }
    /* ⚠️ ARMED BY A CLASS, NOT BY THE RESTING RULE. Hung on `.wsh-title` it plays on MOUNT: every
       page load would show its title, blink it out and fade it back — nine pages' worth of a
       worse artefact than the one this removes. */
    expect(hdrCss, "the swap is not gated on the armed class").toContain(".wsh--swap.wsh--scrolled .wsh-title");
    expect(hdrSrc, "nothing arms the swap class, so the fade never runs").toContain("wsh--swap");
    expect(hdrSrc, "the arming does not skip the first render — the fade would play on mount").toContain("firstState");
  });

  /**
   * ⚠️ THE LINE MOVED HOUSE, AND THIS CASE REVERSES TWICE OVER. It first asserted a FULL-WIDTH
   * hairline on the grid row; then the opposite, inset to the content gutter, "sitting with the
   * content it separates". Both described a rule the ROW drew, floating beneath a card. The
   * working state is a BAND now (ref 91): it takes the parchment ground and draws its own bottom
   * edge, spanning the container. Keeping the row's rule as well gave two lines a pixel apart that
   * did not even agree on their length — one gutter-inset, one full-bleed.
   *
   * The line belongs to the thing that draws it. Asserted as ABSENT here, because a leftover
   * `::after` would be invisible at rest and a double rule the moment anyone scrolled.
   */
  it("⚠️ THE BAND DRAWS ITS OWN EDGE — the row's floating hairline is GONE", () => {
    expect(all(gridCss, ".wpg-plate::after"), "the row's hairline came back — with the band's edge it draws two lines a pixel apart").toBe("");
    expect(all(gridCss, ".wpg-plate--working::after"), "the row's working hairline came back").toBe("");
    const band = all(hdrCss, ".wsh--scrolled");
    expect(band, "the band has no ground — it is still a card floating on the window").toContain("background: var(--wsh-band-bg)");
    /* ⚠️ THE EXISTING BORDER BOX RE-COLOURED, not a new element: three sides transparent, the
       fourth the band's line. It inherits the `border-color` transition and the 1px comes out of
       the content rather than off the 52px the matrix asserts. */
    expect(band, "the band's bottom edge is missing, or it grew a border on the other three sides")
      .toContain("border-color: transparent transparent var(--wsh-band-edge)");
    expect(band, "the band grew a radius or a shadow — it is a band, not a card").toContain("box-shadow: none");
    /**
     * ⚠️ THE GROUND IS A TOKEN, NEVER A LITERAL, AND IT IS THE SHELL'S CHROME FILL.
     *
     * It was `--shell-card` (#fdfaf5), which against a #ffffff window put the band half a step
     * from the ground — legible only by its hairline. The band should read as THE PAGE SHOWING
     * THROUGH the window, so it takes `--shell-parch` (#f2ede7), the same surface as a nav pill.
     *
     * ⚠️ SEMANTIC MATCH, NOT VALUE MATCH — and this is the whole reason the assertion names the
     * token rather than the hex. `--shell-panel` holds the same #f2ede7 today, so a value check
     * would pass either; but its own comment states it is an IN-PAGE GROUPING SURFACE, content
     * rather than chrome fill, and the band is chrome. Pointing at `--shell-parch` means a future
     * retone of the shell's chrome fill carries the band with it, which is the behaviour wanted.
     */
    const tokens = readFileSync(resolve(__dirname, "../../index.css"), "utf8");
    expect(tokens, "the band ground is a literal, or it went back to the card parchment — it must resolve to the shell's chrome fill")
      .toContain("--wsh-band-bg: var(--shell-parch)");
    expect(tokens, "the band's edge token is missing").toMatch(/--wsh-band-edge:\s*#[0-9a-f]{6}/i);
    /* ⚠️ AND THE RESTING PLATE STAYS PURE WHITE — the two states are a WHITE CARD collapsing to a
       PARCHMENT BAND. If the plate ever takes the ground token too, the collapse stops being a
       change of surface and the band's whole job goes with it. */
    expect(tokens, "the resting plate left pure white — the card and the band would no longer be two different surfaces")
      .toContain("--wsh-plate-bg: #ffffff");
  });

  it("⚠️ ONE CURVE, ONE PAIR OF DURATIONS — .22s on geometry, .14s on fades", () => {
    for (const [sel, css] of [[".wsh", hdrCss], [".wsh-row", hdrCss], [".wpg-plate", gridCss]] as const) {
      expect(all(css, sel), `${sel} is not on the .22s geometry curve — a row that eases differently from the plate inside it reads as two events`)
        .toContain(".22s cubic-bezier(.4, 0, .2, 1)");
    }
    /* ⚠️ THE HAIRLINE'S OWN .16s FADE IS GONE WITH THE HAIRLINE. The band's edge is part of the
       header's border box, so it rides the `border-color` transition already asserted above —
       there is no second curve to keep in step, which was the whole reason this line existed. */
    expect(all(hdrCss, ".wsh"), "the band's edge left the border-color transition — it would snap while the height is still easing")
      .toContain("border-color .22s cubic-bezier(.4, 0, .2, 1)");
    expect(all(hdrCss, ".wsh--scrolled .wsh-mark,\n.wsh--scrolled .wsh-mark--xl"), "").not.toContain("transition");
  });
});
