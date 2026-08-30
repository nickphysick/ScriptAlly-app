/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ ONE MASTHEAD FORMAT, TEN PAGES ════════════════════════════════════════════════════════════
 *
 * ⚠️ THIS REPLACES `mastheadSlot.test.tsx`, DELETED IN THE SAME COMMIT. That file's whole premise was
 * that the action slot was ADDITIVE — nine pages rendering byte-identically to the header that
 * existed before the slot did, on both kinds of grid, because the slot's render was gated on whether
 * the masthead pinned. There are no kinds of grid now and no gate: one format, one CTA, ten pages.
 * Its cases could not be retargeted because their subject is the thing that went.
 *
 * ⚠️ ASSERTED AS A PARTITION, NOT AS A LIST OF PAGES. The claim is "every masthead is the same
 * shape", so the check strips each page's own words out of its markup and requires ONE distinct
 * skeleton across all ten. A per-page expectation would pass on ten pages that were each
 * individually wrong in the same way, and would need editing every time a page's copy changed.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PageHeader } from "./PageHeader";
import { MastheadSectionContext } from "./mastheadSection";

/**
 * ⚠️ THE MARK NAMES ARE THE APP'S OWN, TAKEN FROM THE PAGES. An earlier draft of the file this
 * replaces invented `"agents"` for two of them and `OneScreenMark` threw on an undefined entry — a
 * fixture handing a component an input its real callers cannot produce. They are kept here even
 * though nothing draws them, because "a declared mark is still not drawn" is one of the claims.
 */
const PAGES: { title: string; mark: string; section: string; description?: string }[] = [
  { title: "Query Centre", mark: "queries", section: "Querying" },
  { title: "Analytics", mark: "analytics", section: "Querying" },
  { title: "Contact list", mark: "contacts", section: "Agents" },
  { title: "Discover", mark: "discover", section: "Agents" },
  { title: "Manuscripts", mark: "manuscripts", section: "Shelf" },
  { title: "Comparable titles", mark: "comps", section: "Shelf" },
  { title: "Submission packages", mark: "packages", section: "Querying" },
  { title: "To-do", mark: "todo", section: "Tasks" },
  { title: "Calendar", mark: "calendar", section: "Tasks" },
  { title: "Noteboard", mark: "noteboard", section: "Tasks", description: "Notes to self, undated." },
];

const render = (p: (typeof PAGES)[number], cta?: string) =>
  renderToStaticMarkup(
    <MastheadSectionContext.Provider value={{ section: p.section }}>
      <PageHeader
        variant="workspace"
        title={p.title}
        mark={p.mark as never}
        description={p.description}
        actions={cta ? [{ label: cta, primary: true, onClick: () => {} }] : undefined}
      />
    </MastheadSectionContext.Provider>,
  );

/** every page-specific word removed, so what is left is the format itself */
const skeleton = (html: string) =>
  html
    .replace(/<span class="wsh-kicker">[^<]*<\/span>/, '<span class="wsh-kicker">§</span>')
    .replace(/<h1 class="wsh-title">[^<]*<\/h1>/, '<h1 class="wsh-title">§</h1>')
    .replace(/<p class="wsh-sub">[^<]*<\/p>/, '<p class="wsh-sub">§</p>')
    .replace(/(<button type="button" class="wsh-cta">)[^<]*/, "$1§");

describe("one masthead format, ten pages", () => {
  it("⚠️ EVERY MASTHEAD IS THE SAME SHAPE — asserted as a partition, not per page", () => {
    /* ⚠️ THE DESCRIPTION IS THE ONE LEGITIMATE STRUCTURAL DIFFERENCE, so the partition is taken
       within each group rather than across all ten — a page with no description renders no element
       and reserves no space, which is a rule rather than a divergence. */
    for (const withSub of [false, true]) {
      const rows = PAGES.map((p) => ({ p, html: render({ ...p, description: withSub ? "A line about this page." : undefined }) }));
      const shapes = new Map<string, string[]>();
      for (const { p, html } of rows) {
        const k = skeleton(html);
        shapes.set(k, [...(shapes.get(k) ?? []), p.title]);
      }
      expect(rows.length, "the census shrank — a page left the format").toBe(10);
      expect([...shapes.keys()], `mastheads disagree on shape (description ${withSub}): ${[...shapes.values()].map((v) => v.join(", ")).join(" | ")}`)
        .toHaveLength(1);
    }
  });

  it("⚠️ THE CTA IS THE ONLY THING A PAGE MAY VARY, and its text does not change the shape", () => {
    const a = skeleton(render(PAGES[0], "+ Log new query"));
    const b = skeleton(render(PAGES[4], "+ Add manuscript"));
    expect(a, "two pages with different CTA text render different mastheads").toBe(b);
    /* and a page without one is the same format minus that element — never a reserved empty box */
    const none = render(PAGES[0]);
    expect(none, "an empty CTA was rendered for a page that passes none").not.toContain("wsh-cta");
  });

  it("⚠️ NO MARK AT REST, EVEN WHERE A PAGE DECLARES ONE", () => {
    for (const p of PAGES) {
      const html = render(p);
      expect(html, `${p.title} draws a mark in its masthead — the mark belongs to the collapsed bar`).not.toContain("wsh-mark");
      expect(html, `${p.title}'s mark artwork reached the masthead by another route`).not.toContain("os-mark");
    }
  });

  it("⚠️ THE KICKER IS THE SECTION, AND ABSENCE RENDERS NOTHING RATHER THAN AN EMPTY PILL", () => {
    expect(render(PAGES[0])).toContain('<span class="wsh-kicker">Querying</span>');
    const outside = renderToStaticMarkup(<PageHeader variant="workspace" title="Somewhere" />);
    expect(outside, "a header with no section drew an empty pill").not.toContain("wsh-kicker");
    expect(outside, "the header did not render at all").toContain('<h1 class="wsh-title">Somewhere</h1>');
  });

  /**
   * ⚠️ THE ORDER IS PART OF THE FORMAT AND IS ASSERTED AS ONE STRING. Four separate `toContain`
   * checks pass on a header that renders the CTA above the title — this repo already records that a
   * measurement of the parts is not a measurement of the whole.
   */
  it("⚠️ TOP RULE, THEN KICKER, TITLE, SUBTITLE, CTA — in that order", () => {
    const html = render({ ...PAGES[9], description: "Notes to self, undated." }, "+ New note");
    expect(html).toBe(
      '<header class="wsh">'
      + '<div class="wsh-toprule" aria-hidden="true"></div>'
      + '<div class="wsh-body">'
      + '<span class="wsh-kicker">Tasks</span>'
      + '<h1 class="wsh-title">Noteboard</h1>'
      + '<p class="wsh-sub">Notes to self, undated.</p>'
      + '<button type="button" class="wsh-cta">+ New note</button>'
      + "</div></header>",
    );
  });
});

/**
 * ⚠️ ONE CONTROL MEANS ONE, AND THE GUARD IS A THROW RATHER THAN A COMMENT. Each refusal names what
 * to do instead, because a throw that only says "no" gets worked around — and every one of these was
 * a real shape a page had passed at some point in this system's life.
 */
describe("the masthead refuses everything but one primary", () => {
  const boom = (props: Record<string, unknown>) => () =>
    renderToStaticMarkup(<PageHeader variant="workspace" title="Anywhere" {...props} />);

  it("refuses a toolbar", () => {
    expect(boom({ toolbar: <i>t</i> })).toThrow(/no tool row/);
  });
  it("refuses an actionsSlot", () => {
    expect(boom({ actionsSlot: <i>s</i> })).toThrow(/holds ONE control/);
  });
  it("refuses an overflow menu", () => {
    expect(boom({ overflow: [{ label: "x", onClick: () => {} }] })).toThrow(/second control wearing a menu/);
  });
  it("refuses two actions", () => {
    expect(boom({ actions: [
      { label: "a", primary: true, onClick: () => {} },
      { label: "b", primary: true, onClick: () => {} },
    ] })).toThrow(/was passed 2 actions/);
  });
  it("refuses a lone non-primary action", () => {
    expect(boom({ actions: [{ label: "a", onClick: () => {} }] })).toThrow(/PRIMARY/);
  });
  it("accepts exactly one primary", () => {
    expect(boom({ actions: [{ label: "+ Add a comp", primary: true, onClick: () => {} }] })).not.toThrow();
  });
});


/**
 * ══ THE KICKER IS A LABEL, THE CTA IS THE APP'S BUTTON ════════════════════════════════════════
 * (ref design-refs/kicker-cta-options.html — kicker option 4, button option 2.)
 */
describe("the kicker's and the CTA's treatment", () => {
  const css = readFileSync(resolve(__dirname, "pageHeader.css"), "utf8");
  const root = readFileSync(resolve(__dirname, "../../index.css"), "utf8");
  const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, "");
  const rule = (sel: string) => {
    const m = new RegExp(`(?:^|\\n)\\${sel}\\s*\\{([^}]*)\\}`).exec(css);
    expect(m, `no rule for ${sel}`).toBeTruthy();
    return strip(m![1]);
  };

  it("⚠️ BOTH OF THE KICKER'S COLOURS COME FROM TOKENS, never inline rgba", () => {
    const k = rule(".wsh-kicker");
    expect(k, "the kicker's ink is a literal").toContain("color: var(--mast-kick-ink)");
    expect(k, "the kicker's border is a literal").toContain("border: 1px solid var(--mast-kick-bd)");
    /* ⚠️ AND THE RULE CARRIES NO COLOUR OF ITS OWN. Asserting the two `var()`s alone passes on a rule
       that ALSO states an rgba somewhere else — which is exactly how a second value gets in. */
    expect(k, "the kicker states a colour literal alongside its tokens").not.toMatch(/#[0-9a-f]{3,8}|rgba?\(/i);
    for (const [tok, val] of [["--mast-kick-ink", "#807168"], ["--mast-kick-bd", "rgba(25, 18, 16, 0.14)"]] as const) {
      expect(strip(root), `${tok} is not declared as ${val}`).toContain(`${tok}: ${val}`);
    }
  });

  it("⚠️ IT IS A LABEL, NOT A CONTROL — mono, 9px, regular, half-weight border", () => {
    const k = rule(".wsh-kicker");
    /* the four things that made an outlined capsule read as pressable */
    expect(k).toContain("font-family: var(--font-mono)");
    expect(k).toContain("font-size: 10px");
    expect(k).toContain("font-weight: 400");
    expect(k).toContain("letter-spacing: 0.18em");
    expect(k, "the kicker went back to Playfair").not.toContain("--font-serif");
  });

  it("⚠️ THE CTA READS THE SHARED NEAR-BLACK TOKEN, and the top bar reads the same one", () => {
    const c = rule(".wsh-cta");
    expect(c).toContain("background: var(--btn-ink)");
    expect(c).toContain("border: 1px solid var(--btn-ink)");
    expect(c).toContain("color: var(--btn-ink-on)");
    expect(c, "the CTA is pink again").not.toContain("--pink");
    /* ⚠️ THE OTHER READER IS ASSERTED, because "matches + New" is the entire reason for the change and
       a token with one consumer would leave the top bar on its own literal — which is what it was:
       `#1c130e`, one unit from this. */
    const shell = strip(readFileSync(resolve(__dirname, "workspaceShell.css"), "utf8"));
    const nbtn = /(?:^|\n)\.ws-nbtn\s*\{([^}]*)\}/.exec(shell);
    expect(nbtn, "the top bar's `+ New` has no rule").toBeTruthy();
    expect(nbtn![1], "the top bar's `+ New` is back on a literal — the two buttons can drift again")
      .toContain("background: var(--btn-ink)");
    /* ⚠️ SCOPED TO THAT RULE, NOT THE SHEET. A file-wide ban on the near-black also catches
       `color: #1c130e` on a text element two hundred lines away, which is not a button fill and not
       this claim — the first version failed on exactly that. */
    expect(nbtn![1], "a near-black literal survives inside the button's own rule").not.toMatch(/#1c130[ef]/i);
  });

  it("⚠️ `--mast-cta-bd` IS GONE, and nothing reads it", () => {
    for (const f of ["pageHeader.css", "workspacePageGrid.css", "illustratedMasthead.css"]) {
      expect(strip(readFileSync(resolve(__dirname, f), "utf8")), `${f} still reads --mast-cta-bd`)
        .not.toContain("var(--mast-cta-bd");
    }
    expect(strip(root), "--mast-cta-bd is still declared").not.toContain("--mast-cta-bd:");
  });

  /**
   * ⚠️ THE CTA IS IDENTICAL ON ALL TEN, ASSERTED AS A PARTITION. Only one page carries one today —
   * Phase 5 assigns the rest — so the population is SYNTHESISED: every page rendered with a CTA, its
   * own words stripped, and one distinct skeleton required. A check over the single live CTA would
   * be satisfied by one page and prove nothing about the format.
   */
  it("⚠️ THE CTA RENDERS IDENTICALLY ON ALL TEN — partition, not a page list", () => {
    const shapes = new Map<string, string[]>();
    for (const p of PAGES) {
      /* ⚠️ ONE DESCRIPTION FOR EVERY PAGE. Noteboard is the only entry that carries one, so leaving
         the census as it stands compares a masthead WITH a subtitle against nine without and reports
         two shapes — a real structural difference, and not the one this case is about. */
      const html = render({ ...p, description: "A line about this page." }, `+ Do the thing on ${p.title}`);
      const k = skeleton(html);
      shapes.set(k, [...(shapes.get(k) ?? []), p.title]);
    }
    expect(PAGES.length, "the census shrank").toBe(10);
    expect([...shapes.keys()], `CTAs differ across pages: ${[...shapes.values()].map((v) => v.join(", ")).join(" | ")}`)
      .toHaveLength(1);
  });

  it("⚠️ AND THE MASTHEAD STILL HOLDS EXACTLY ONE CONTROL", () => {
    const html = render(PAGES[0], "+ Log new query");
    expect((html.match(/<button/g) ?? []).length, "the masthead grew a second control").toBe(1);
  });
});
