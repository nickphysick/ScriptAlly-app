/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ THE DEFAULT VARIANT'S OUTPUT IS FROZEN. THIS IS THE CONTRACT THE WHOLE PACK RESTS ON.
 *
 * `PageHeader` is mounted by ten pages. Five of them — Manuscripts, Comparable titles, Import,
 * Help centre and Plans — are NOT meant to get the band, and they are protected by nothing except
 * the fact that they never pass `variant="workspace"`. That protection is only real if adding the band
 * left the default path untouched.
 *
 * So this asserts the rendered markup of `variant="full"` **character for character**, against a
 * string captured before the band existed. It fails if anyone alters default rendering — which is
 * exactly what it is for. If it fails and the change was intended, the frozen string is updated in
 * the SAME commit as the change, deliberately, never as a green-ing fix.
 */
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { PageHeader, type PageHeaderActions } from "./PageHeader";
import { WorkspacePageGrid } from "./WorkspacePageGrid";
/* ⚠️ THE BOUNDED SLICE FAILS LOUDLY ON A MISSING ANCHOR. `indexOf` returns -1 and `slice(-1)`
   reads as "one character from the end", so a renamed marker silently widens the slice to the rest
   of the document and every assertion over it starts covering markup it was never meant to see. */
import { sliceBetween } from "../../test/sliceBetween";

/**
 * ⚠️ THE MASTHEAD NO LONGER NEEDS A GRID ABOVE IT (in-flow masthead, step 1). It read the grid's
 * condensed state through context and threw without one; it has no state at all now, so it renders
 * bare quite happily. `renderInGrid` survives because several assertions below are about where the
 * masthead sits INSIDE the grid, which is the thing this pack moved.
 */
const render = (el: React.ReactElement) => renderToStaticMarkup(el);
/** the workspace variant only — it reads its state from the grid and throws without one */
const renderInGrid = (el: React.ReactElement) =>
  renderToStaticMarkup(<WorkspacePageGrid masthead={el}>{null}</WorkspacePageGrid>);
/**
 * ⚠️ A GRID WHOSE MASTHEAD LEAVES — `fill` with no `settleOn`, which is what `pinned` is derived
 * from. `renderInGrid` above is the other kind: not `fill`, therefore PINNED. The two exist because
 * the masthead's refusal now depends on the behaviour rather than on the variant name, and a test
 * that only ever rendered one of them would assert half the law.
 */
const renderInLeavingGrid = (el: React.ReactElement) =>
  renderToStaticMarkup(<WorkspacePageGrid masthead={el} fill>{null}</WorkspacePageGrid>);

describe("⚠️ the default variant is frozen", () => {
  it("title only — byte for byte", () => {
    expect(render(<PageHeader title="Help centre" />)).toBe(
      '<header class="svh svh--full"><div class="svh-top"><div class="svh-txt">'
      + '<h1 class="svh-title">Help centre</h1></div></div><div class="svh-rule"></div></header>'
    );
  });

  it("title + description + one action — byte for byte", () => {
    const out = render(
      <PageHeader
        title="Your agent list"
        description="Everyone you're querying."
        actions={[{ label: "Add new agent", onClick: () => {} }]}
      />
    );
    expect(out).toBe(
      '<header class="svh svh--full"><div class="svh-top"><div class="svh-txt">'
      + '<h1 class="svh-title">Your agent list</h1>'
      + '<div class="svh-sub">Everyone you&#x27;re querying.</div></div></div>'
      + '<div class="svh-tools"><button type="button" class="svh-btn svh-btn-ghost">Add new agent</button></div>'
      + '<div class="svh-rule"></div></header>'
    );
  });

  it("⚠️ an explicit variant=\"full\" is identical to omitting it", () => {
    expect(render(<PageHeader variant="full" title="T" />)).toBe(render(<PageHeader title="T" />));
  });

  it("⚠️ the workspace props are INERT on the default — passing them changes nothing", () => {
    /* a page that adds a mark before flipping its variant must not half-render the plate.
       ⚠️ `count` LEFT THIS CASE because the prop is DELETED (amendment 7). It cannot be passed
       inertly when it cannot be passed at all — tsc is the guard now, and it is a stronger one. */
    expect(render(<PageHeader title="T" mark="queries" />))
      .toBe(render(<PageHeader title="T" />));
  });

  it("the default still renders its closing rule", () => {
    expect(render(<PageHeader title="T" />)).toContain('<div class="svh-rule">');
  });
});

describe("the workspace variant", () => {
  it("renders title and no mark — and nothing actionable unless a CTA is passed", () => {
    const out = renderInGrid(<PageHeader variant="workspace" title="Query Centre" mark="queries" />);
    expect(out).toContain('class="wsh"');
    expect(out).toContain("Query Centre");
    /* ⚠️ THE MARK IS DECLARED AND NOT DRAWN. It belongs to the collapsed bar now; the prop survives
       so that bar knows which one, rather than a second table keyed by route. */
    /* ⚠️ SCOPED TO THE HEADER, BECAUSE THE GRID NOW DRAWS ONE TOO. The collapsed bar states the
       page's mark at 20px — that is the whole reason the prop survives — so a document-wide search
       for `data-mark` finds the BAR's and reports the masthead as drawing one. The claim is about
       where the mark is, so the slice has to be as well. */
    expect(sliceBetween(out, '<header class="wsh"', "</header>"), "the masthead drew a declared mark")
      .not.toContain('data-mark="queries"');
    /* ⚠️ ASSERTED STRUCTURALLY, NOT AGAINST A LIST OF LABELS. A name list passes the day someone
       adds a button this test has never heard of, which is precisely the day it should fail. */
    const masthead = sliceBetween(out, '<header class="wsh"', "</header>");
    expect(masthead).not.toContain("<button");
    expect(masthead).not.toContain("<a ");
  });

  /**
   * ⚠️ THE TWO REFUSAL CASES ARE REPLACED, NOT WEAKENED, AND THE LAW THEY ASSERTED IS RETIRED. They
   * proved that a masthead which SCROLLS AWAY throws when handed an action while a pinning one
   * accepts it — the Type A / Type B partition. There is one format now and it holds exactly one
   * control, so "does this page's masthead leave" no longer decides anything. What must not weaken
   * is that the guard THROWS rather than silently dropping a prop; the full set of refusals lives in
   * `mastheadFormat.test.tsx`, and this keeps the one that is about the grid.
   */
  it("⚠️ THE MASTHEAD REFUSES EVERY CONTROL RATHER THAN IGNORING ONE — inside a grid or outside it", () => {
    const one = [{ label: "A", primary: true, onClick: () => {} }] as const satisfies PageHeaderActions;
    expect(() => renderInGrid(<PageHeader variant="workspace" title="T" mark="todo" actions={one} />))
      .toThrow(/holds NONE/);
    /* ⚠️ AND OUTSIDE A GRID TOO. The guard asks nothing of its surroundings, so the refusal cannot
       depend on where the header happens to be mounted — which the behaviour-gated form did. */
    expect(() => render(<PageHeader variant="workspace" title="T" mark="todo" actions={one} />))
      .toThrow(/holds NONE/);
    /* the accepting direction, or "refuses" is indistinguishable from "refuses everything" */
    expect(() => renderInGrid(<PageHeader variant="workspace" title="T" mark="todo" />)).not.toThrow();
  });

  it("⚠️ THE COUNT SLOT IS GONE FROM THE MARKUP, not merely unused (amendment 7)", () => {
    /* The prop is deleted, so nothing CAN pass one; this guards the other half — that no residue
       of the strip survives in the rendered plate for a future caller to half-render. */
    const out = renderInGrid(<PageHeader variant="workspace" title="Settings" mark="settings" />);
    expect(out).not.toContain("wsh-count");
  });

  it("⚠️ THE SLAB IS THE FIRST THING IN THE SCROLLER, AND THE MASTHEAD IS THE FIRST THING IN IT", () => {
    /* `.wsh-wrap` reserved a sticky plate's rest height so condensing could not pull the content
       below it upward. Nothing sticks and nothing condenses, so both the wrapper and the
       reservation are deleted — and the masthead now opens the scroll row rather than a chrome row
       above it. That ORDER is the contract: the control row anchors, so it has to come second. */
    const out = renderInGrid(<PageHeader variant="workspace" title="T" mark="todo" />);
    expect(out).not.toContain("wsh-wrap");
    /**
     * ⚠️ THE SLAB OPENS THE SCROLL ROW NOW (pinned chrome, §1). The mini bar used to, because it was
     * `sticky; top: 0` and the control row stacked beneath it — an ordering that only mattered while
     * there were TWO pinned things. There is one, and the masthead is the first thing inside it.
     *
     * The claim is unchanged in kind and is still asserted as an ORDER rather than as one adjacency:
     * scroller, then the slab, then the masthead, then the controls — all inside the scrollport, none
     * of it in a chrome row above.
     */
    const KEYS = ["wpg-scroll", "wpg-chrome", "wpg-mast", "wsh-toprule", "wsh-body"];
    const order = KEYS.map((k) => out.indexOf(k));
    for (const [i, k] of KEYS.entries()) {
      expect(order[i], `${k} is not in the rendered output`).toBeGreaterThan(-1);
      if (i) expect(order[i], `${k} does not follow ${KEYS[i - 1]}`).toBeGreaterThan(order[i - 1]);
    }
    /* ⚠️ AND THE MINI BAR IS NOT IN A SCROLL PAGE'S OUTPUT AT ALL — not hidden by CSS, not rendered.
       Two pinned elements at `top: 0` is the arrangement the slab exists to end. */
    expect(out, "the mini bar came back to a scrolling page").not.toContain("wpg-mini");
  });

  it("⚠️ THERE IS NO CONDENSED STATE — the band and its classes are unreachable", () => {
    /* This used to assert that the rest state renders first, because a condensed first paint would
       flash 88 → 56 → 88 on mount. The state itself is gone: no band, no label register, no
       cross-fade. Asserted against the RENDERED output in both grid states, so a `condensed` grid
       cannot bring it back through a path the markup forgot about. */
    /* ⚠️ THE `condensed` PROP IS RETIRED (masthead rethink, step 4), so there is no longer a mode to
       toggle here. The claim is unchanged and is if anything simpler: the band's classes are
       unreachable from any state the grid can be in. */
    const out = renderToStaticMarkup(
      <WorkspacePageGrid masthead={<PageHeader variant="workspace" title="T" mark="todo" />}>{null}</WorkspacePageGrid>
    );
    expect(out).not.toContain("wsh--scrolled");
    expect(out).not.toContain("wsh--swap");
  });

  it("⚠️ NO DESCRIPTION → NO ELEMENT, AND NO SOLO STEP EITHER", () => {
    /* ⚠️ THE SOLO STEP IS RETIRED (in-flow masthead, step 1), and its reason went with the plate.
       A fixed-height card kept its height with or without a description, so a title-only page had
       to grow its type to look deliberate rather than broken. In flow a title-only page is simply
       shorter — nothing is reserved, so there is nothing to fill. One title size app-wide.
       ⚠️ THE CLASSES ARE ASSERTED ABSENT, not merely unstyled: a class the markup emits and no rule
       consumes is what a bundle sweep exists to find. */
    const solo = renderInGrid(<PageHeader variant="workspace" title="Query Centre" mark="queries" />);
    expect(solo).not.toContain("wsh-sub");
    expect(solo).not.toContain("wsh--solo");
    expect(solo).not.toContain("wsh-title--solo");
    const withSub = renderInGrid(<PageHeader variant="workspace" title="Contact list" mark="contacts" description="Everyone you're querying." />);
    expect(withSub).toContain("wsh-sub");
    /* ⚠️ ONE CLASS IN BOTH STATES — the only difference is whether the paragraph exists. */
    expect(withSub).toContain('class="wsh"');
    expect(solo).toContain('class="wsh"');
  });

  /**
   * ⚠️ INVERTED WITH THE FORMAT: every mark key is still a legal DECLARATION and none of them draws.
   * The population matters as much as the claim — asserting it for one key would pass on a masthead
   * that happened to reject that one, and the point is that the rule is about the masthead rather
   * than about any particular drawing.
   */
  it("every mark key is accepted and none is drawn", () => {
    const KEYS = ["queries", "todo", "calendar", "contacts", "packages", "analytics",
      "noteboard", "discover", "settings"] as const;
    expect(KEYS.length, "the mark census shrank").toBeGreaterThan(8);
    for (const m of KEYS) {
      const out = renderInGrid(<PageHeader variant="workspace" title="T" mark={m} />);
      expect(out, `${m} threw or failed to render`).toContain('class="wsh"');
      expect(sliceBetween(out, '<header class="wsh"', "</header>"),
        `${m} is drawn in the masthead — marks belong to the collapsed bar`).not.toContain(`data-mark="${m}"`);
      /* ⚠️ AND IT IS DRAWN IN THE BAR, which is the other half: "not in the masthead" alone passes on
         a mark that reaches nothing at all, and the prop would then be a declaration with no reader. */
      expect(out, `${m} is declared and drawn nowhere — the bar should carry it`).toContain(`data-mark="${m}"`);
    }
  });
});

describe("⚠️ the shell never mounts PageHeader", () => {
  it("no shell component renders it — or the Dashboard gets a band the day a route is added", () => {
    const { readFileSync, readdirSync } = require("node:fs") as typeof import("node:fs");
    const { join } = require("node:path") as typeof import("node:path");
    for (const f of readdirSync(__dirname).filter((n) => n.endsWith(".tsx") && !n.includes(".test."))) {
      if (f === "PageHeader.tsx") continue;
      expect(readFileSync(join(__dirname, f), "utf8"), `${f} must not mount PageHeader`)
        .not.toMatch(/<PageHeader/);
    }
  });
});

/**
 * ⚠️ THE MASTHEAD'S SHAPE IS A RULE, NOT A KNOB — and this describe block survives its own subject.
 *
 * It was written when `compact` and `greeting` were retired: any caller could shrink any header for
 * any reason, so the height was a caller's opinion. There is no height to choose now (the masthead
 * is sized by its contents), but the underlying claim is the same and still worth holding: exactly
 * ONE input changes what this component renders, and it is `description`.
 */
describe("no prop can choose the masthead's shape", () => {
  /** the masthead's own markup, sliced out of whatever it is mounted in */
  const shape = (el: React.ReactElement) => sliceBetween(renderInGrid(el), '<header class="wsh"', "</header>");

  it("only `description` changes it — and it changes ONE element", () => {
    const solo = shape(<PageHeader variant="workspace" title="T" mark="todo" />);
    const withSub = shape(<PageHeader variant="workspace" title="T" mark="todo" description="D" />);
    expect(solo).not.toContain("wsh-sub");
    expect(withSub).toContain("wsh-sub");
    /* ⚠️ AND NOTHING ELSE MOVES WITH IT. Adding the paragraph must not change the header's class,
       the title's class or the mark's — the solo step is retired, so the two states differ by the
       description alone. */
    expect(withSub.replace(/<p class="wsh-sub">.*?<\/p>/, "")).toBe(solo);

    /* ⚠️ THE ACTION-BEARING PROPS ARE NOT IN THIS LIST ANY MORE — they THROW (see above) rather
       than being inert, which is the stronger guarantee and the one the design needs. What remains
       are the props a masthead legitimately takes. */
    for (const extra of [
      { titleAdornment: <span>Pro</span> },
      { scrollLabel: "ignored" },
    ]) {
      const s2 = shape(<PageHeader variant="workspace" title="T" mark="todo" {...(extra as object)} />);
      /* the adornment lands INSIDE the title and nothing else shifts */
      expect(s2.replace(/<span>Pro<\/span>/, ""), JSON.stringify(Object.keys(extra))).toBe(solo);
    }
  });

  it("⚠️ an EMPTY description is not a description — it must not buy an empty paragraph", () => {
    expect(shape(<PageHeader variant="workspace" title="T" mark="todo" description="" />))
      .toBe(shape(<PageHeader variant="workspace" title="T" mark="todo" />));
  });
});
