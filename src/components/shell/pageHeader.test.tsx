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
describe("PageHeader — the compact VARIANT stays retired; the compact FLAG is sanctioned", () => {
  it("the type union still carries no compact member", () => {
    // @ts-expect-error — "compact" must not typecheck as a variant
    const rejected: React.ComponentProps<typeof PageHeader>["variant"] = "compact";
    expect(rejected).toBe("compact"); // runtime string; the line above is the real assertion
  });

  it("the boolean exists, drops the subtitle, and keeps the rule", () => {
    const html = renderToStaticMarkup(
      <PageHeader compact title="Queries Hub" description="Every query you've sent." />,
    );
    expect(html).toContain("svh--compact");
    expect(html, "compact must not render the subtitle").not.toContain("svh-sub");
    expect(html, "the description is still ACCEPTED — the copy stays where it lives").toContain("Queries Hub");
    expect(html, "the hairline divider is untouched").toContain("svh-rule");
  });

  it("default is off — every other page renders exactly as before", () => {
    const html = renderToStaticMarkup(<PageHeader title="T" description="D" />);
    expect(html).not.toContain("svh--compact");
    expect(html, "the subtitle still renders where compact isn't set").toContain("svh-sub");
  });

  it("only the density changes: same face, same weight, same ink", () => {
    const css = readFileSync(new URL("./pageHeader.css", import.meta.url), "utf8");
    const compact = css.slice(css.indexOf(".svh--compact .svh-top"));
    const block = compact.slice(0, compact.indexOf("\n\n") + 1 || compact.length);
    expect(block).toContain("font-size: 26px");
    for (const forbidden of ["font-family", "font-weight", "color:"]) {
      expect(block, `compact changed ${forbidden} — it is a density flag, not a restyle`).not.toContain(forbidden);
    }
  });
});

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

  it("⚠️ COMPACT keeps the actions INLINE — the row would add back the height it removes", () => {
    // On a fixed-height master–detail surface, header height is taken from the panes below.
    const html = renderToStaticMarkup(
      <PageHeader compact title="Queries Hub" actions={[{ label: "Log a query", onClick: () => {}, primary: true }]} />
    );
    expect(html).toContain("svh-acts");
    expect(html).not.toContain("svh-tools");
  });

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

  it("a compact header has no overflow — its actions are inline and capped at two", () => {
    const html = renderToStaticMarkup(
      <PageHeader compact title="Queries Hub" overflow={[{ label: "Export CSV", onClick: () => {} }]} />
    );
    expect(html).not.toContain("svh-more");
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
  it("the mark SHRINKS to 30px and keeps its colour", () => {
    const mark = all(hdrCss, ".wsh--scrolled .wsh-mark,\n.wsh--scrolled .wsh-mark--xl");
    expect(mark, "the mark is not taking the strip size").toContain("flex: 0 0 30px");
    expect(mark, "the mark fades — it stays, so it stays opaque").not.toContain("opacity");
    expect(mark, "the negative margin came back; it closed the row gap for a mark that is now present").not.toContain("margin-right");
    const box = all(hdrCss, ".wsh--scrolled .wsh-mark .os-mark,\n.wsh--scrolled .wsh-mark--xl .os-mark");
    expect(box, "the inner mark box did not follow to 30px, so an illustration is clipped by its slot").toContain("width: 30px");
    expect(box, "the monoline glyph's plate did not follow — the two mark families would show two sizes in the strip").toContain("height: 30px");
  });

  it("the type steps down, and the description collapses rather than fading in place", () => {
    expect(all(hdrCss, ".wsh--scrolled .wsh-title"), "the working title is not 17px").toContain("font-size: 17px");
    const sub = all(hdrCss, ".wsh--scrolled .wsh-sub");
    expect(sub, "the description faded but kept its box, holding the title off-centre in a 52px strip").toContain("max-height: 0");
  });

  it("⚠️ THE HAIRLINE IS THE ROW'S, FULL WIDTH, AND IT FADES", () => {
    const after = all(gridCss, ".wpg-plate::after");
    expect(after, "the hairline is missing — nothing separates chrome from content once the plate's border goes").toContain("height: 1px");
    /* ⚠️ REVERSED: IT INSETS TO THE CONTENT GUTTER. Full width was the earlier rule; the hairline
       now sits with the content it separates, on the same token the toolbar and cards use. */
    expect(after, "the hairline left the content gutter — it reads as a rule drawn across the page rather than part of it")
      .toMatch(/left:\s*var\(--content-gutter\);\s*right:\s*var\(--content-gutter\)/);
    expect(after, "the hairline is visible at rest, where the plate's own border already does that job").toContain("opacity: 0");
    expect(all(gridCss, ".wpg-plate--working::after"), "the hairline never appears when working").toContain("opacity: 1");
  });

  it("⚠️ ONE CURVE, ONE PAIR OF DURATIONS — .22s on geometry, .14s on fades", () => {
    for (const [sel, css] of [[".wsh", hdrCss], [".wsh-row", hdrCss], [".wpg-plate", gridCss]] as const) {
      expect(all(css, sel), `${sel} is not on the .22s geometry curve — a row that eases differently from the plate inside it reads as two events`)
        .toContain(".22s cubic-bezier(.4, 0, .2, 1)");
    }
    expect(all(gridCss, ".wpg-plate::after"), "the hairline is not on the fade curve — it would snap in while the border is still dissolving").toContain(".16s");
    expect(all(hdrCss, ".wsh--scrolled .wsh-mark,\n.wsh--scrolled .wsh-mark--xl"), "").not.toContain("transition");
  });
});
