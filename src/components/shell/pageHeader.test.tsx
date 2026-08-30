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
    for (const prop of ["background:", "border-radius:", "box-shadow:", "border: 1px"]) {
      expect(wsh, `.wsh regained \`${prop}\` — the masthead is drawing itself as an object again`)
        .not.toContain(prop);
    }
    /**
     * ⚠️ `height` IS BOUNDED, BECAUSE `line-height` CONTAINS IT. The masthead closes its own
     * typography — `font-size` and `line-height` on `.wsh`, so the format does not inherit the
     * page's strut — and a bare `not.toContain("height:")` went red on that, over a declaration
     * that has nothing to do with the masthead drawing itself as an object.
     *
     * ⚠️ AND THE LOOSENESS RAN BOTH WAYS, which is the half worth fearing: the same substring form
     * would also have caught `min-height`/`max-height` by accident rather than by intent. The
     * property is matched at a boundary and all three sizing forms are named.
     */
    expect(wsh, "`.wsh` states a height — the masthead is sized by its content, never by a number")
      .not.toMatch(/(?:^|[;{\s])(?:min-|max-)?height\s*:/);
    /* ⚠️ THE CLOSING HAIRLINE IS NOT THE MASTHEAD'S ANY MORE (pinned chrome, §1). It drew one at its
       own MEASURE, so the line stopped short of the window while the shadow beneath it ran full
       width — one boundary rendered as two objects of different lengths. The SLAB carries one
       full-width line at its base, and `workspacePageGrid.test.tsx` asserts it there. */
    expect(wsh, "the masthead drew its own hairline again — the slab's base is the only line in the chrome")
      .not.toContain("border-bottom");
    /* ⚠️ RETARGETED: THE AIR IS ON `.wsh-body` NOW, and `.wsh` states `padding: 0` for a structural
       reason rather than a stylistic one — the top rule sits ABOVE the text's inset, so padding on
       the masthead itself would push the rule down with the words and it would stop reading as the
       page's top edge. The law is unchanged: ONE element states the vertical air. */
    expect(wsh, "the masthead itself pays vertical air as well as its body").toContain("padding: 0");
    expect(decls(all(hdrCss, ".wsh-body")), "the masthead's body stopped stating its own vertical air")
      .toContain("padding: var(--mast-pad-top) 0 var(--mast-pad-btm)");
    /* the 16px gap moved to the slab's base with the hairline — asserted in workspacePageGrid.test */
    expect(wsh, "the masthead kept a bottom margin — that air belongs below the whole slab now")
      .not.toContain("margin-bottom");
  });

  it("⚠️ THE MASTHEAD TWEENS THE SETTLE AND NOTHING ELSE", () => {
    /**
     * ⚠️ THIS CASE IS REVERSED, AND THE REASON IT WAS EVER "NO TRANSITIONS AT ALL" STILL STANDS. The
     * masthead's old transitions eased a CONDENSE — height, background, border-colour, radius,
     * shadow, a button ladder — and that state was deleted; a transition with nothing to interpolate
     * is residue that makes the next reader believe a state still exists.
     *
     * ⚠️ THERE IS A SECOND POSTURE AGAIN (pinned chrome, §2), so the geometry properties tween by
     * design. What must NOT come back is the CARD: a masthead that eased its own ground, frame,
     * radius or shadow would be animating itself into chrome, which is what the whole system removed.
     * So the claim is now about WHICH properties, which is a stronger statement than "none".
     *
     * ⚠️ AND THEY RIDE THE REST RULES, not the stuck ones — a transition declared only on the
     * settled posture eases the way down and snaps on the way back.
     */
    const SETTLING = ["padding", "font-size", "width", "height", "flex-basis", "opacity", "max-height", "margin"];
    const FORBIDDEN = ["background", "border-color", "border-radius", "box-shadow", "color"];
    for (const sel of [".wsh", ".wsh-title", ".wsh-sub", ".wsh-mark", ".wsh-mark .os-mark"]) {
      const t = /transition:([^;}]*)/.exec(decls(all(hdrCss, sel)));
      if (!t) continue;
      /* ⚠️ STRIP THE TIMING FUNCTIONS BEFORE SPLITTING — `cubic-bezier(.4, 0, .2, 1)` carries commas,
         so a naive split on "," reports `0`, `0.2` and `1)` as transitioned properties. */
      const props = t[1].replace(/\([^)]*\)/g, "").split(",").map((x) => x.trim().split(/\s+/)[0]).filter(Boolean);
      expect(props.length, `${sel} declares a transition with no property in it`).toBeGreaterThan(0);
      for (const prop of props) {
        expect(SETTLING, `${sel} tweens \`${prop}\` — the settle moves geometry and type, never paint`)
          .toContain(prop);
        expect(FORBIDDEN, `${sel} eases \`${prop}\` — that is the masthead animating itself into a card`)
          .not.toContain(prop);
      }
    }
    /* ⚠️ AND THE ROW AND THE TEXT BLOCK TWEEN NOTHING — they hold no settling property of their own,
       so a transition there would be easing something nobody declared. */
    for (const sel of [".wsh-row", ".wsh-txt"]) {
      expect(decls(all(hdrCss, sel)), `${sel} gained a transition — nothing about it changes between postures`)
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

  it("⚠️ THE MASTHEAD HOLDS NO CONTROL AND REFUSES EVERY ONE — in the component, not merely in the markup", () => {
    /**
     * ⚠️ THE LAW MOVED FROM THE VARIANT TO THE BEHAVIOUR (amendment 3), and it did not weaken. A
     * guard that only omitted an action would let a page pass one that silently goes nowhere — the
     * same fault as the deleted `count` slot — so it still THROWS. What changed is when: a masthead
     * that scrolls away strands anything in it, and one that pins and settles does not.
     *
     * ⚠️ AND THE BEHAVIOUR IS READ FROM THE GRID, NOT FROM A PROP. A boolean the caller passed would
     * be the caller's opinion, and the one caller with a motive to get it wrong is the one wanting
     * an action in a masthead that leaves. `WorkspacePageGrid` publishes the same `pinned`
     * expression that decides whether its slab actually sticks, so the claim and the behaviour
     * cannot come apart. Both directions are exercised in `pageHeaderDefault.test.tsx`.
     */
    /* ⚠️ THE `LEAVES` CONDITION IS RETIRED, AND WITH IT THE WHOLE TYPE PARTITION. Both the original
       refusal (no actions, ever) and its amendment (no actions where the masthead scrolls away) were
       answers to a header that either stranded a control or had to be restored. It does neither now:
       it scrolls away as content and a separate bar takes over, so one control is simply what a
       masthead holds. What must NOT weaken is that the refusal is a throw rather than a shrug — a
       guard that omits an action lets a page pass one that silently goes nowhere. */
    expect(hdrSrc, "the retired behaviour gate came back — there is one format and it holds one control")
      .not.toContain("useMastheadLeaves");
    /* ⚠️ ONE REFUSAL AGAIN, AND IT COVERS EVERY SHAPE. The guard has moved three times — "no actions
       ever", then "none where the masthead LEAVES", then "exactly one primary" — and the CTA's
       deletion returns it to the first. Four separate messages became one because there is one rule
       again, and the message has to say WHY or it gets worked around. */
    expect(hdrSrc, "the masthead stopped refusing controls outright").toContain("was passed a control");
    expect(hdrSrc, "the refusal lost its reason").toContain("stated it twice");
    expect(hdrSrc, "a per-shape refusal came back — there is one rule now")
      .not.toMatch(/was passed \$\{acts\.length\} actions/);
    /* the refusal names the masthead's whole contents, so a reader can see what it is refusing FROM */
    expect(hdrSrc, "the refusal lost its account of what a masthead is").toContain("controls belong in the grid's control row");
    const ws = sliceBetween(hdrSrc, 'if (variant === "workspace") {', "  return (\n    <header");
    for (const gone of ["wsh-grow", "svh-btn", "wsh-acts", "wsh-mark", "wsh-cta"]) {
      expect(decls(ws), `the workspace branch still renders ${gone}`).not.toContain(gone);
    }
  });

  /**
   * ⚠️ THE MARK IS GONE FROM THE MASTHEAD ENTIRELY, so "one mark size, both families" has no subject
   * left and is replaced by its absence. The rule it retires was real and is worth keeping in view:
   * 52px bare for both families, superseding an earlier "illustrated 52, monoline 38 on a parchment
   * plate" whose reasoning was about a plate that no longer existed. The mark now belongs to the
   * collapsed bar, which draws it at 20px and owns its own rules.
   */
  it("⚠️ NO MARK IN THE MASTHEAD — the sheet has no rules for one", () => {
    const live = decls(hdrCss);
    for (const gone of ["wsh-mark", "wsh-mark--xl"]) {
      expect(live, `\`.${gone}\` still has rules in the masthead's sheet`).not.toMatch(new RegExp(`["\\s.]${gone}[\\s.{,:]`));
    }
  });

  it("⚠️ ONE TITLE SIZE — the solo step is retired with the fixed height", () => {
    const decl = decls(hdrCss);
    /* ⚠️ THE TOKEN'S NAME AND VALUE BOTH MOVED — `--wsh-title-size: 30px` became
       `--mast-title-size: 56px` when the two header types became one format. The claim is unchanged:
       ONE title size, stated once, with no per-page step. */
    /* ⚠️ THE VALUE MOVED 56 → 44 (Phase 2a) AND THE CLAIM DID NOT. Pinning it is deliberate — it is a
       BAKED design token, and the point of pinning one is that a retune is a decision somebody makes
       rather than a number that drifts. What must stay is the pair: one size stated in the shared
       sheet, and nothing page-scoped. */
    expect(decl).toContain("--mast-title-size: 44px");
    /* ⚠️ THE BODY'S AIR IS ASSERTED THROUGH ITS TOKENS RATHER THAN AS A LITERAL PAIR, so a retune
       touches ONE place — the sizing block — instead of three locks. The values are pinned there. */
    for (const [tok, val] of [["--mast-sub-size", "16px"], ["--mast-pad-top", "22px"],
                              ["--mast-pad-btm", "24px"], ["--mast-kick-gap", "11px"]] as const) {
      expect(decl, `the masthead's ${tok} moved off ${val}`).toContain(`${tok}: ${val}`);
    }
    expect(decl, "the old title token survived alongside the new one — two sizes, one masthead")
      .not.toContain("--wsh-title-size");
    /* bounded, so `wsh--solo` cannot be matched by some longer live class that starts with it */
    expect(decl, "the solo step came back — it would add two points to every title-only page")
      .not.toMatch(/["\s`.]wsh--solo["\s`,{]/);
    expect(decl).not.toMatch(/["\s`.]wsh-title--solo["\s`,{]/);
  });
});
