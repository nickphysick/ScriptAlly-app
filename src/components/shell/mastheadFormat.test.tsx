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
    /* ⚠️ NO SECTION PROVIDER ANY MORE. The kicker is deleted, so a masthead reads nothing from
       context; rendering bare is the honest case rather than a shortcut. */
    <PageHeader variant="workspace" title={p.title} mark={p.mark as never} description={p.description} />,
  );

/** every page-specific word removed, so what is left is the format itself */
const skeleton = (html: string) =>
  html
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

  /**
   * ⚠️ THE KICKER IS DELETED, AND ITS ABSENCE IS ASSERTED OVER ALL TEN. A pill is exactly the kind
   * of thing that comes back on one page; the section is in the crumb three inches above.
   */
  it("⚠️ NO KICKER ANYWHERE — the section is the crumb's job", () => {
    for (const page of PAGES) {
      expect(render(page), `${page.title} drew a kicker`).not.toContain("wsh-kicker");
    }
    const bare = renderToStaticMarkup(<PageHeader variant="workspace" title="Somewhere" />);
    expect(bare, "the header did not render at all").toContain('<h1 class="wsh-title">Somewhere</h1>');
  });

  /**
   * ⚠️ AN ICON IS A SLOT OR NOTHING — never an empty 72px well. Nine of the ten pages have no asset
   * yet, and a reserved box on each would be nine pages with a hole where a picture will go. The
   * GEOMETRY of that (title at the gutter with no icon, gutter + 72 + gap with one) is measured;
   * this is the structural half.
   */
  it("⚠️ NO ICON MEANS NO SLOT, NOT AN EMPTY BOX", () => {
    const without = renderToStaticMarkup(<PageHeader variant="workspace" title="Somewhere" />);
    expect(without, "an empty icon element was rendered").not.toContain("wsh-icon");
    const withIcon = renderToStaticMarkup(
      <PageHeader variant="workspace" title="Contact list" icon="/rolodex.png" />,
    );
    expect(withIcon).toContain('<img class="wsh-icon" src="/rolodex.png" alt=""/>');
    /* ⚠️ `alt=""` IS THE CLAIM, not an oversight: the title names the page beside it, and a screen
       reader hearing it twice is the mark's fault rather than the heading's. */
    expect((withIcon.match(/alt=""/g) ?? []).length, "the icon grew an alt text").toBe(1);
  });

  /**
   * ⚠️ THE ORDER IS PART OF THE FORMAT AND IS ASSERTED AS ONE STRING. Four separate `toContain`
   * checks pass on a header that renders the CTA above the title — this repo already records that a
   * measurement of the parts is not a measurement of the whole.
   */
  /**
   * ⚠️ NO ICON IN THIS CASE, AND THAT IS DELIBERATE RATHER THAN AN OMISSION: React 19 emits a
   * `<link rel="preload" as="image">` ahead of an `<img src>`, so an exact-markup claim carrying one
   * is really a claim about the renderer's preload behaviour. The icon's own markup is asserted in
   * the case above; this one is about ORDER, which is what an exact string is for.
   */
  it("⚠️ TOP RULE, THEN ONE ROW: TEXT THEN PRIMARY — in that order, and nothing after", () => {
    const html = renderToStaticMarkup(
      <PageHeader
        variant="workspace"
        title="Contact list"
        description="Everyone you're querying."
        primary={{ label: "Add new agent", onClick: () => {} }}
      />,
    );
    const shape = html
      .replace(/<svg[\s\S]*?<\/svg>/, "<svg/>")
      .replace(/&#x27;/g, "'");
    expect(shape).toBe(
      '<header class="wsh">'
      + '<div class="wsh-toprule" aria-hidden="true"></div>'
      + '<div class="wsh-row">'
      + '<div class="wsh-text">'
      + '<h1 class="wsh-title">Contact list</h1>'
      + '<p class="wsh-sub">Everyone you\'re querying.</p>'
      + "</div>"
      + '<button type="button" class="wsh-cta"><svg/>Add new agent</button>'
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
    expect(boom({ toolbar: <i>t</i> })).toThrow(/EXACTLY ONE primary action or none/);
  });
  it("refuses an actionsSlot", () => {
    expect(boom({ actionsSlot: <i>s</i> })).toThrow(/EXACTLY ONE primary action or none/);
  });
  it("refuses an overflow menu", () => {
    expect(boom({ overflow: [{ label: "x", onClick: () => {} }] })).toThrow(/EXACTLY ONE primary action or none/);
  });
  it("refuses two actions", () => {
    expect(boom({ actions: [
      { label: "a", primary: true, onClick: () => {} },
      { label: "b", primary: true, onClick: () => {} },
    ] })).toThrow(/EXACTLY ONE primary action or none/);
  });
  it("refuses a lone non-primary action", () => {
    expect(boom({ actions: [{ label: "a", onClick: () => {} }] })).toThrow(/EXACTLY ONE primary action or none/);
  });
  /**
   * ⚠️ THE `actions` ARRAY STAYS REFUSED EVEN AT LENGTH ONE, AND THE `primary` PROP IS THE WAY IN.
   * The distinction is the point of the third form of this guard: a header that accepts a LIST can
   * hold several controls and becomes a second toolbar, which is what this format replaced. One is
   * expressible in the type, so it is expressed there.
   */
  it("refuses a single primary in the `actions` array — the shape the second guard allowed", () => {
    expect(boom({ actions: [{ label: "+ Add a comp", primary: true, onClick: () => {} }] }))
      .toThrow(/EXACTLY ONE primary action or none/);
  });
  it("ACCEPTS the `primary` prop — one control, named as one", () => {
    expect(boom({ primary: { label: "+ Add a comp", onClick: () => {} } })).not.toThrow();
    const html = renderToStaticMarkup(
      <PageHeader variant="workspace" title="Anywhere" primary={{ label: "+ Add a comp", onClick: () => {} }} />,
    );
    expect((html.match(/wsh-cta/g) ?? []).length, "the masthead drew more than one control").toBe(1);
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

  /**
   * ⚠️ THE KICKER'S TWO CASES ARE REPLACED BY THE ICON'S AND THE CTA'S, and the treatment claims
   * invert rather than lapse: what the kicker's cases protected was that a LABEL must not look like
   * a CONTROL. The one control in this format is a control, and what has to be protected now is the
   * opposite — that the icon does not become an object with a frame.
   */
  it("⚠️ THE ICON IS ON THE PAGE GROUND — no tile, no border, no plate, no fill", () => {
    const i = rule(".wsh-icon");
    for (const forbidden of ["background", "border", "border-radius", "box-shadow", "padding"]) {
      expect(i, `the icon grew a ${forbidden} — it is a picture on the ground, not an object`)
        .not.toMatch(new RegExp(`(?:^|[;\\s])${forbidden}\\s*:`));
    }
    /* ⚠️ `contain`, NOT THE REF'S `cover`. Cropping is right inside a frame and wrong without one:
       with no card to crop against, `cover` silently trims a square asset in a non-square slot. */
    expect(i, "the icon crops rather than fitting").toContain("object-fit: contain");
    expect(i, "the icon is not the format's own size").toContain("var(--mast-icon)");
  });

  it("⚠️ THE PRIMARY READS `--btn-ink`, NEVER A LITERAL OF ITS OWN", () => {
    const c = rule(".wsh-cta");
    expect(c, "the masthead's primary states its own near-black").toContain("background: var(--btn-ink)");
    /* ⚠️ THE WHOLE POINT OF THE TOKEN. Before it, this button and the top bar's `+ New` were two
       literals ONE UNIT apart — `#1c130e` and `#1c130f` — on the two buttons whose entire
       justification is that they match. A literal anywhere in this rule reopens that. */
    expect(c, "the primary carries a colour literal beside its token")
      .not.toMatch(/background:\s*#|border:[^;]*#[0-9a-f]{6}/i);
    /* ⚠️ `inherit`, NOT `--font-sans` AND NOT INTER. The stated stack names Inter; `--font-sans` is
       Source Sans Pro; the app's other buttons inherit. Naming either here would make this the only
       button of its kind in the family it is joining. The disagreement is Nick's to settle. */
    expect(c, "the primary named a face instead of inheriting one").toContain("font-family: inherit");
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
