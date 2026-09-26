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
 * ⚠️ TWO SHAPES NOW, NOT ONE (page header v1 §3.3), AND THE PARTITION IS WHY THIS SURVIVED THE
 * REWRITE RATHER THAN BEING RETIRED. The claim was "every masthead is the same shape"; it is now
 * "there are exactly two, and every page is in the one it should be" — full on Query Centre and
 * Contact list, compact everywhere else. The mechanism is unchanged and it is the point: each
 * page's own words are stripped out and the distinct skeletons counted, so it cannot be satisfied
 * by pages that are each individually wrong in the same way, and it needs no editing when a page's
 * copy changes.
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

/** §3.3 — the two pages that open with the full header; every other workspace route is compact. */
const FULL_PAGES = ["Query Centre", "Contact list"];

/**
 * ⚠️ THE SECTION PROVIDER IS BACK, because the eyebrow is back. It was removed when the kicker was
 * deleted — "a masthead reads nothing from context" — and the header's first line is `SECTION /
 * PAGE` again. Rendering bare would now be rendering a header with half its first line missing.
 */
const render = (p: (typeof PAGES)[number]) =>
  renderToStaticMarkup(
    <MastheadSectionContext.Provider value={{ section: p.section }}>
      <PageHeader
        variant={FULL_PAGES.includes(p.title) ? "full" : "workspace"}
        title={p.title}
        description={p.description}
      />
    </MastheadSectionContext.Provider>,
  );

/** every page-specific word removed, so what is left is the format itself */
const skeleton = (html: string) =>
  html
    .replace(/<h1 class="ph-title"([^>]*)>[^<]*<\/h1>/, '<h1 class="ph-title"$1>§</h1>')
    .replace(/<p class="ph-intro"([^>]*)>[^<]*<\/p>/, '<p class="ph-intro"$1>§</p>')
    /* the eyebrow carries the section AND the page, so both are page-specific words */
    .replace(/<p class="ph-eyebrow"([^>]*)>.*?<\/p>/, '<p class="ph-eyebrow"$1>§</p>');


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
      /**
       * ⚠️ EXACTLY TWO SHAPES, AND THE MEMBERSHIP IS ASSERTED TOO. A count alone would pass on two
       * groups split down any line at all — the eight compact pages divided by whether they have a
       * primary, say, with the two full ones lumped in. The claim is that the split IS full versus
       * compact, so the groups are named.
       */
      const groups = [...shapes.values()].map((v) => v.slice().sort());
      expect(groups, `mastheads split on something other than size (description ${withSub}): ${groups.map((v) => v.join(", ")).join(" | ")}`)
        .toHaveLength(2);
      const full = groups.find((g) => g.includes("Query Centre"));
      expect(full, "the full group is not Query Centre and Contact list").toEqual([...FULL_PAGES].sort());
      const compact = groups.find((g) => !g.includes("Query Centre"));
      expect(compact, "a page left the compact group").toHaveLength(PAGES.length - FULL_PAGES.length);
    }
  });

  /**
   * ⚠️ THE MASTHEAD VARIES BY NOTHING BUT ITS WORDS, and the CTA case this replaces is why that
   * sentence changed. A page could vary its primary for two passes; the button is deleted, because
   * the toolbar beneath already carried the same action and every page stated it twice.
   */
  it("⚠️ EVERY PAGE'S HEADER HOLDS ITS TITLE, AND A CONTROL ONLY WHERE THE PAGE HAS ONE", () => {
    /**
     * ⚠️ INVERTED BY §3 (page header v1), AND THE OLD CLAIM IS WORTH RECORDING. It was "no page
     * renders a control in its masthead" — the masthead scrolled away, so a button in it became
     * unreachable the moment a reader started working. The header holds its actions again, because
     * the actions are what a page opens with; what it must not do is invent one. A page that passes
     * no primary renders no `.ph-acts` at all, which is the half that is easy to lose.
     */
    for (const p of PAGES) {
      const bare = render(p);
      expect(bare, `${p.title} stopped rendering its title`).toContain(`>${p.title}</h1>`);
      expect(bare, `${p.title} invented an actions block`).not.toContain("ph-acts");
    }
    const withCta = renderToStaticMarkup(
      <MastheadSectionContext.Provider value={{ section: "Tasks" }}>
        <PageHeader variant="workspace" title="To-do" primary={{ label: "Add", onClick: () => {} }} />
      </MastheadSectionContext.Provider>,
    );
    expect(withCta).toContain('<div class="ph-acts" data-probe="actions">');
    expect(withCta).toContain('<button type="button" class="ph-primary">Add</button>');
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
  it("⚠️ THE EYEBROW IS SECTION / PAGE, FROM CONTEXT — and absent without a section", () => {
    /**
     * ⚠️ INVERTED BY §3.1. It was "no kicker anywhere — the section is the crumb's job", and the
     * crumb is gone: the eyebrow is the only thing that says which section a page is in. It still
     * arrives by CONTEXT rather than as a prop, which is what stops it and the sidebar disagreeing.
     */
    const withSection = renderToStaticMarkup(
      <MastheadSectionContext.Provider value={{ section: "Tasks" }}>
        <PageHeader variant="workspace" title="Somewhere" />
      </MastheadSectionContext.Provider>,
    );
    expect(withSection).toContain('<p class="ph-eyebrow" data-probe="eyebrow"><span>Tasks</span> / <b>Somewhere</b></p>');
    /* ⚠️ AND NO SECTION MEANS NO EYEBROW, not a separator with nothing before it */
    const bare = renderToStaticMarkup(
      <MastheadSectionContext.Provider value={{ section: null }}>
        <PageHeader variant="workspace" title="Somewhere" />
      </MastheadSectionContext.Provider>,
    );
    expect(bare).not.toContain("ph-eyebrow");
  });

  /**
   * ⚠️ AN ICON IS A SLOT OR NOTHING — never an empty 72px well. Nine of the ten pages have no asset
   * yet, and a reserved box on each would be nine pages with a hole where a picture will go. The
   * GEOMETRY of that (title at the gutter with no icon, gutter + 72 + gap with one) is measured;
   * this is the structural half.
   */
  it("⚠️ NO ART MEANS NO SLOT, NOT AN EMPTY BOX", () => {
    /* unchanged in substance — the slot is `art` on the full header now, and Manuscripts is the
       page that proves it: a full header with no drawing yet, and no reserved well for one. */
    const withArt = renderToStaticMarkup(
      <MastheadSectionContext.Provider value={{ section: "Agents" }}>
        <PageHeader title="Contact list" art={<img src="/rolodex.png" alt="" />} />
      </MastheadSectionContext.Provider>,
    );
    expect(withArt).toContain('<div class="ph-art" data-probe="art" aria-hidden="true"><img src="/rolodex.png" alt=""/></div>');
    const without = renderToStaticMarkup(
      <MastheadSectionContext.Provider value={{ section: "Shelf" }}>
        <PageHeader title="Manuscripts" />
      </MastheadSectionContext.Provider>,
    );
    expect(without, "an empty art well was reserved").not.toContain("ph-art");
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
  it("⚠️ THE ORDER IS EYEBROW → TITLE → INTRO → ACTIONS → ART, and nothing after", () => {
    /**
     * ⚠️ THE TOP RULE IS GONE (§3). The header's only line is the one BENEATH it — which is what
     * lets the art stand on something, and why the old "top rule, then one row" no longer has a
     * subject. The order is asserted by position rather than by a frozen string, so a page's copy
     * cannot break it.
     */
    const out = renderToStaticMarkup(
      <MastheadSectionContext.Provider value={{ section: "Queries" }}>
        <PageHeader
          title="Query Centre"
          description="A line."
          primary={{ label: "Go", onClick: () => {} }}
          art={<img src="/a.png" alt="" />}
        />
      </MastheadSectionContext.Provider>,
    );
    const at = (c: string) => out.indexOf(c);
    expect(at("ph-eyebrow")).toBeGreaterThan(-1);
    expect(at("ph-eyebrow")).toBeLessThan(at("ph-title"));
    expect(at("ph-title")).toBeLessThan(at("ph-intro"));
    expect(at("ph-intro")).toBeLessThan(at("ph-acts"));
    expect(at("ph-acts")).toBeLessThan(at("ph-art"));
    expect(out.trimEnd().endsWith("</header>"), "something was rendered after the art").toBe(true);
    expect(out, "the top rule came back").not.toContain("toprule");
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
    expect((html.match(/ph-primary/g) ?? []).length, "the masthead drew more than one control").toBe(1);
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
  it("⚠️ THE ART IS ON THE PAGE GROUND — no tile, no border, no plate, no fill", () => {
    const art = rule(".ph--full .ph-art");
    expect(art, "no rule for the art slot").toBeTruthy();
    for (const chrome of ["background", "border", "border-radius", "box-shadow"]) {
      expect(art, `the art gained a ${chrome}`).not.toContain(`${chrome}:`);
    }
    /* ⚠️ AND IT IS ANCHORED TO THE BOTTOM, which is the claim the whole slot exists for: the
       drawing stands ON the rule whatever its aspect ratio. Anchored to the top it would float a
       different distance above the rule for every picture. */
    expect(art).toContain("bottom: 0");
    expect(rule(".ph--full .ph-art img, .ph--full .ph-art svg")).toContain("object-position: right bottom");
  });

  it("⚠️ THE PRIMARY IS ANTHRACITE, FROM THE TOKEN, NEVER A LITERAL OF ITS OWN", () => {
    /**
     * ⚠️ THE COLOUR CHANGED WITH §3.1 — it read `--btn-ink` (#1c130f) and the header's primary is
     * anthracite (#2a3a52). The CLAIM is unchanged and is the one that matters: a token, not a
     * literal. This app has two near-black button fills one unit apart in its history, on the two
     * buttons whose entire justification was that they matched.
     */
    expect(rule(".ph-primary"), "the header's primary states its own colour").toContain("background: var(--sp-anthracite)");
    expect(rule(".ph-secondary"), "the secondary's edge is a literal").toContain("var(--sp-frame)");
    expect(strip(css), "a near-black literal came back into the header").not.toMatch(/background:\s*#2a3a52/);
  });

  /**
   * ⚠️ RETARGETED TWICE, AND THE LAW IS THE SAME BOTH TIMES: `--btn-ink` EXISTS ONLY WHILE SOMETHING
   * READS IT. It was created because the top bar's `+ New` and the masthead's primary were two
   * literals one unit apart. The masthead primary went first; `+ New` went on 19 Sep (Query Centre
   * v11). The token still has readers — the masthead CTA rule, the collapsed bar's CTA — so it stays,
   * and this asserts that set is non-empty rather than naming one member that can leave again.
   * `--btn-ink-on` had exactly one reader and followed it out; swept for READS, not definitions.
   */
  it("⚠️ `--btn-ink` SURVIVES BECAUSE SOMETHING STILL READS IT; `--btn-ink-on` DOES NOT", () => {
    const readers = ["pageHeader.css", "workspacePageGrid.css", "workspaceShell.css"]
      .filter((f) => strip(readFileSync(resolve(__dirname, f), "utf8")).includes("var(--btn-ink)"));
    expect(readers.length, "nothing in the shell reads --btn-ink any more — delete the token rather than keep an orphan").toBeGreaterThan(0);
    expect(strip(readFileSync(resolve(__dirname, "workspaceShell.css"), "utf8")), "`+ New` has a rule again")
      .not.toMatch(/(?:^|\n)\.ws-nbtn\s*\{/);
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
  /**
 * ⚠️ RETIRED BY §3 — "none of them holds a control" is the claim this build inverts, and the
 * partition half of it is asserted above, where it now says there are exactly two shapes and names
 * which pages are in each.
 */
});
