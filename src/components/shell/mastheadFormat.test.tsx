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

const render = (p: (typeof PAGES)[number]) =>
  renderToStaticMarkup(
    <MastheadSectionContext.Provider value={{ section: p.section }}>
      <PageHeader variant="workspace" title={p.title} mark={p.mark as never} description={p.description} />
    </MastheadSectionContext.Provider>,
  );

/** every page-specific word removed, so what is left is the format itself */
const skeleton = (html: string) =>
  html
    .replace(/<span class="wsh-kicker">[^<]*<\/span>/, '<span class="wsh-kicker">§</span>')
    .replace(/<h1 class="wsh-title">[^<]*<\/h1>/, '<h1 class="wsh-title">§</h1>')
    .replace(/<p class="wsh-sub">[^<]*<\/p>/, '<p class="wsh-sub">§</p>');


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

  /**
   * ⚠️ THE MASTHEAD VARIES BY NOTHING BUT ITS WORDS, and the CTA case this replaces is why that
   * sentence changed. A page could vary its primary for two passes; the button is deleted, because
   * the toolbar beneath already carried the same action and every page stated it twice.
   */
  it("⚠️ NO PAGE RENDERS A CONTROL IN ITS MASTHEAD — all ten, both directions", () => {
    for (const p of PAGES) {
      const html = render(p);
      expect(html, `${p.title} renders a button in its masthead`).not.toContain("<button");
      expect(html, `${p.title} renders a link in its masthead`).not.toContain("<a ");
      expect(html, `${p.title} kept the retired CTA element`).not.toContain("wsh-cta");
    }
    /* ⚠️ AND THE OTHER DIRECTION: the masthead still renders. "No button" is satisfied by a header
       that failed to render at all, which is the shape a structural check has to exclude. */
    expect(PAGES.every((p) => render(p).includes('<h1 class="wsh-title">')), "a masthead stopped rendering its title").toBe(true);
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
  it("⚠️ TOP RULE, THEN KICKER, TITLE, SUBTITLE — in that order, and nothing after", () => {
    const html = render({ ...PAGES[9], description: "Notes to self, undated." });
    expect(html).toBe(
      '<header class="wsh">'
      + '<div class="wsh-toprule" aria-hidden="true"></div>'
      + '<div class="wsh-body">'
      + '<span class="wsh-kicker">Tasks</span>'
      + '<h1 class="wsh-title">Noteboard</h1>'
      + '<p class="wsh-sub">Notes to self, undated.</p>'
      + "</div></header>",
    );
  });
});

/**
 * ⚠️ ONE CONTROL MEANS ONE, AND THE GUARD IS A THROW RATHER THAN A COMMENT. Each refusal names what
 * to do instead, because a throw that only says "no" gets worked around — and every one of these was
 * a real shape a page had passed at some point in this system's life.
 */
/**
 * ⚠️ THE REFUSAL IS BACK TO ITS ORIGINAL FORM, AND IT HAS NOW MOVED THREE TIMES. "No actions, ever"
 * → "none where the masthead LEAVES" (when the two header types made anchoring the question) →
 * "exactly one primary" (when the format gained a CTA) → no actions, ever. Each move had a reason and
 * the reasons are in `PageHeader`; what matters here is that the guard still THROWS rather than
 * dropping a prop, because a page that passes a control which silently goes nowhere is the fault all
 * three forms were written against.
 */
describe("the masthead refuses every control", () => {
  const boom = (props: Record<string, unknown>) => () =>
    renderToStaticMarkup(<PageHeader variant="workspace" title="Anywhere" {...props} />);

  it("refuses a toolbar", () => {
    expect(boom({ toolbar: <i>t</i> })).toThrow(/holds NONE/);
  });
  it("refuses an actionsSlot", () => {
    expect(boom({ actionsSlot: <i>s</i> })).toThrow(/holds NONE/);
  });
  it("refuses an overflow menu", () => {
    expect(boom({ overflow: [{ label: "x", onClick: () => {} }] })).toThrow(/holds NONE/);
  });
  it("refuses two actions", () => {
    expect(boom({ actions: [
      { label: "a", primary: true, onClick: () => {} },
      { label: "b", primary: true, onClick: () => {} },
    ] })).toThrow(/holds NONE/);
  });
  it("refuses a lone non-primary action", () => {
    expect(boom({ actions: [{ label: "a", onClick: () => {} }] })).toThrow(/holds NONE/);
  });
  /* ⚠️ THE SHAPE THAT USED TO BE THE ALLOWED ONE. A single primary was the whole of the previous
     form's permission; asserting that it now throws is what makes the reversion a claim rather than
     a deletion. */
  it("refuses a single primary — the one shape the previous guard allowed", () => {
    expect(boom({ actions: [{ label: "+ Add a comp", primary: true, onClick: () => {} }] })).toThrow(/holds NONE/);
  });
  it("renders without complaint when passed none", () => {
    expect(boom({})).not.toThrow();
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

  /**
   * ⚠️ THE CTA'S OWN CASE IS DELETED WITH THE BUTTON, AND WHAT SURVIVES IS THE TOKEN IT LEFT BEHIND.
   * `--btn-ink` was created because the top bar's `+ New` and the masthead's primary were two
   * literals one unit apart; the primary is gone and the token still has a consumer, which is the
   * only reason it is not deleted too. `--btn-ink-on` had exactly one reader and follows the button
   * out — swept for READS rather than definitions.
   */
  it("⚠️ `--btn-ink` SURVIVES BECAUSE `+ New` READS IT; `--btn-ink-on` DOES NOT", () => {
    const shell = strip(readFileSync(resolve(__dirname, "workspaceShell.css"), "utf8"));
    const nbtn = /(?:^|\n)\.ws-nbtn\s*\{([^}]*)\}/.exec(shell);
    expect(nbtn, "the top bar's `+ New` has no rule").toBeTruthy();
    expect(nbtn![1], "the token's last consumer went back to a literal — delete the token or keep the reader")
      .toContain("background: var(--btn-ink)");
    expect(strip(root), "--btn-ink was deleted while something still reads it").toContain("--btn-ink: #1c130f");
    expect(strip(root), "--btn-ink-on is still declared and nothing reads it").not.toContain("--btn-ink-on");
    for (const f of ["pageHeader.css", "workspacePageGrid.css", "workspaceShell.css"]) {
      expect(strip(readFileSync(resolve(__dirname, f), "utf8")), `${f} still reads --btn-ink-on`)
        .not.toContain("var(--btn-ink-on");
    }
  });

  it("⚠️ `--mast-cta-bd` IS GONE, and nothing reads it", () => {
    for (const f of ["pageHeader.css", "workspacePageGrid.css", "illustratedMasthead.css"]) {
      expect(strip(readFileSync(resolve(__dirname, f), "utf8")), `${f} still reads --mast-cta-bd`)
        .not.toContain("var(--mast-cta-bd");
    }
    expect(strip(root), "--mast-cta-bd is still declared").not.toContain("--mast-cta-bd:");
  });

  /**
   * ⚠️ THE PARTITION SURVIVES ITS SUBJECT. It asserted that a CTA rendered identically on all ten;
   * with the button gone the same claim is that the masthead does, and it is the stronger form —
   * there is no longer anything a page may vary but its own words.
   */
  it("⚠️ EVERY MASTHEAD IS THE SAME SHAPE, AND NONE OF THEM HOLDS A CONTROL", () => {
    const shapes = new Map<string, string[]>();
    for (const p of PAGES) {
      const k = skeleton(render({ ...p, description: "A line about this page." }));
      shapes.set(k, [...(shapes.get(k) ?? []), p.title]);
      expect(k, `${p.title} renders a control`).not.toContain("<button");
    }
    expect(PAGES.length, "the census shrank").toBe(10);
    expect([...shapes.keys()], `mastheads differ: ${[...shapes.values()].map((v) => v.join(", ")).join(" | ")}`)
      .toHaveLength(1);
  });
});
