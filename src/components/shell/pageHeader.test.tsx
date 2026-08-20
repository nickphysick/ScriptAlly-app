/**
 * PageHeader locks (Phase 4): each variant renders its skeleton, the closing rule is always
 * present, the description is omitted on compact and greeting, and a third action cannot
 * survive — rejected by the tuple type at compile time and sliced at runtime. Rendered via
 * renderToStaticMarkup (structure and classes only — layout is a browser check, per the
 * jsdom limits noted in the pack).
 */
import { describe, it, expect } from "vitest";
import { sliceBetween } from "../../test/sliceBetween";
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
/**
 * ⚠️ THE MASTHEAD HAS ONE STATE, AND THIS BLOCK REPLACES THE ONE THAT ASSERTED TWO.
 *
 * What stood here locked the plate ↔ band condense: the card's border/radius/shadow at rest, the
 * 52px strip, the mark dropping to zero, the register cross-fade, the white-on-band buttons, the
 * shared .22s curve. Every one of those described a state the masthead can no longer reach, so the
 * whole block was asserting CSS no element can match — which is the vacuous-lock family CLAUDE.md
 * keeps re-teaching, in its most expensive form: green, detailed, and about nothing.
 *
 * The band's RULES are still in pageHeader.css and are deleted at step 4 with the rest of the
 * machinery. These assert what the masthead IS.
 */
describe("the masthead is content, not chrome", () => {
  const hdrCss = readFileSync(resolve(__dirname, "./pageHeader.css"), "utf8");
  const gridCss = readFileSync(resolve(__dirname, "./workspacePageGrid.css"), "utf8");
  const hdrSrc = readFileSync(resolve(__dirname, "./PageHeader.tsx"), "utf8");
  /** every block for a selector, joined — never the first (see the grouped-rule note in CLAUDE.md) */
  const all = (css: string, sel: string): string => {
    const out: string[] = [];
    for (let i = css.indexOf(sel + " {"); i > -1; i = css.indexOf(sel + " {", i + 1)) {
      out.push(css.slice(i, css.indexOf("}", i)));
    }
    return out.join("\n");
  };
  /* ⚠️ COMMENTS STRIPPED BEFORE ANY `not.toContain`. This file's prose names every property it
     retired, so a bare search over the raw text finds the explanation and calls it the code. */
  const decls = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

  it("⚠️ NO CARD TREATMENT — the masthead paints nothing", () => {
    /* This is the visual whole of the pack: an object laid ON the page becomes the first thing ON
       it. Anything reinstated here turns content back into chrome and re-earns the collapse
       mechanism the pack deleted. */
    const wsh = decls(all(hdrCss, ".wsh"));
    for (const prop of ["background:", "border-radius:", "box-shadow:", "border: 1px", "height:"]) {
      expect(wsh, `.wsh regained \`${prop}\` — the masthead is drawing itself as an object again`)
        .not.toContain(prop);
    }
    /* what it DOES draw: the closing hairline, and the air around it */
    expect(wsh).toContain("border-bottom: 1px solid var(--ws-edge)");
    expect(wsh).toContain("padding: 26px 0 20px");
    expect(wsh).toContain("margin-bottom: 16px");
  });

  it("⚠️ NO TRANSITIONS AT ALL — there is no state to tween between", () => {
    /* Every transition the masthead carried eased the condense: height, padding, background,
       border-colour, radius, shadow, the title's size, the mark's box, the button ladder. With one
       state they animate nothing, and a transition with nothing to interpolate is the residue that
       makes the next reader believe a state still exists. */
    for (const sel of [".wsh", ".wsh-row", ".wsh-title", ".wsh-sub", ".wsh-mark", ".wsh-txt"]) {
      expect(decls(all(hdrCss, sel)), `${sel} kept a transition — the condense it eased is gone`)
        .not.toContain("transition");
    }
  });

  it("⚠️ THE MASTHEAD IS THE FIRST CHILD OF THE SCROLLER, AND THE CONTROL ROW IS THE SECOND", () => {
    /* The order IS the design. The masthead leaves when work starts; the control row is what stays,
       so it has to sit beneath the thing that goes. A grid row above the scroller — which is what
       both used to be — would pin the masthead in place and there would be nothing to leave. */
    const grid = readFileSync(resolve(__dirname, "./WorkspacePageGrid.tsx"), "utf8");
    /* ⚠️ `</div>` IS THE WRONG CLOSING ANCHOR — the toolbar renders one INSIDE the scroller, so the
       first match ends the slice before `{children}` and the order check reads -1. Anchored on the
       dock instead, which is the next real code after the scroller closes. */
    const scroller = sliceBetween(grid, 'className="wpg-scroll"', "{dock &&");
    const mast = scroller.indexOf("{masthead}");
    const tools = scroller.indexOf("{toolbar &&");
    const kids = scroller.indexOf("{children}");
    expect(mast, "the masthead is not inside the scroller").toBeGreaterThan(-1);
    expect(tools, "the control row is not inside the scroller").toBeGreaterThan(mast);
    expect(kids, "the page's content does not follow both").toBeGreaterThan(tools);
  });

  it("⚠️ NO CHROME ROW SURVIVES IN THE GRID — the plate row is deleted, not emptied", () => {
    /* An empty row still reserves its track and still takes the grid's gap; a row that renders
       nothing is how a "removed" header keeps costing height nobody can see. */
    expect(decls(gridCss), "the grid still styles a plate row").not.toMatch(/[\s,]\.wpg-plate[\s,{]/);
    expect(decls(gridCss)).toContain("grid-template-rows: minmax(0, 1fr) auto");
  });

  it("⚠️ THE MASTHEAD REFUSES ACTIONS IN THE COMPONENT, not merely in the markup", () => {
    /* A guard that only omitted them would let a page pass an action that silently goes nowhere —
       the same fault as the deleted `count` slot. It throws, and the throw is what the design rests
       on: nothing actionable means nothing to strand when the masthead leaves. */
    expect(hdrSrc).toContain("masthead holds NO actions");
    const ws = sliceBetween(hdrSrc, 'if (variant === "workspace") {', "  return (\n    <header");
    for (const gone of ["wsh-acts", "wsh-grow", "svh-btn"]) {
      expect(decls(ws), `the workspace branch still renders ${gone}`).not.toContain(gone);
    }
  });

  it("⚠️ ONE MARK SIZE PER FAMILY — 52 bare, 38 plated, and the pair is the rule", () => {
    /* `markHasArt` decides, never a prop: a page converts when its drawing lands rather than when
       someone remembers to pass a size. Scaling the plated glyph WITH the illustration would turn a
       small badge into a large blank tile, which is why the two families do not share a number. */
    expect(all(hdrCss, ".wsh-mark--xl")).toContain("flex: 0 0 52px");
    expect(all(hdrCss, ".wsh-mark--xl .os-mark")).toContain("width: 52px");
    expect(all(hdrCss, ".wsh-mark")).toContain("flex: 0 0 38px");
    expect(all(hdrCss, ".wsh-mark .os-mark")).toContain("width: 38px");
  });

  it("⚠️ ONE TITLE SIZE — the solo step is retired with the fixed height", () => {
    const decl = decls(hdrCss);
    expect(decl).toContain("--wsh-title-size: 30px");
    /* bounded, so `wsh--solo` cannot be matched by some longer live class that starts with it */
    expect(decl, "the solo step came back — it would add two points to every title-only page")
      .not.toMatch(/["\s`.]wsh--solo["\s`,{]/);
    expect(decl).not.toMatch(/["\s`.]wsh-title--solo["\s`,{]/);
  });
});
