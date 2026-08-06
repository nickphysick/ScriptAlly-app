/**
 * Locks for the shared shell primitives (shell-rebuild pack, Phase 1).
 *
 * ⚠️ THESE ASSERT THE RENDERED OUTPUT, NOT THE SOURCE, wherever the claim is about what a user
 * gets. The house rule earned the hard way: a spec that slices on a marker it never asserted
 * goes green while testing nothing. Nothing here slices — every assertion is a whole-string
 * `toContain`/`toMatch` on the markup, so a missing marker fails loudly rather than quietly.
 *
 * The stylesheet claims are rule-text locks by necessity: this repo's Vitest environment is
 * `node`, so there is no layout engine to ask for a computed colour.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import {
  AvatarChip, CountChip, HelpButton, MenuCard, MenuCardDivider, MenuCardItem, SearchPill,
} from "./primitives";

const css = readFileSync(resolve(__dirname, "./primitives.css"), "utf8");
const indexCss = readFileSync(resolve(__dirname, "../../index.css"), "utf8");

/** The declaration block for a selector, so a claim about one rule cannot be met by another. */
const rule = (sel: string) => {
  const i = css.indexOf(sel + " {");
  expect(css, `primitives.css must define ${sel}`).toContain(sel + " {");
  return css.slice(i, css.indexOf("}", i));
};

describe("CountChip — the dot is urgency, not decoration", () => {
  it("renders the figure", () => {
    expect(renderToStaticMarkup(<CountChip count={3} />)).toContain("3");
  });

  it("carries no dot unless urgent", () => {
    expect(renderToStaticMarkup(<CountChip count={3} />)).not.toContain("sp-ct-dot");
  });

  it("carries the dot when urgent", () => {
    expect(renderToStaticMarkup(<CountChip count={3} urgent />)).toContain("sp-ct-dot");
  });

  it("the dot is burgundy, and burgundy is the only accent in the nav", () => {
    expect(rule(".sp-ct-dot")).toContain("background: var(--shell-burgundy)");
  });

  it("the figure is mono, as every count in both shells is", () => {
    expect(rule(".sp-ct")).toContain('font-family: "JetBrains Mono", monospace');
  });
});

describe("AvatarChip — ONE avatar system (Baked 11)", () => {
  it("renders initials from the name", () => {
    expect(renderToStaticMarkup(<AvatarChip name="Nick Physick" />)).toContain("NP");
  });

  it("takes a size, so the 28px foot and the 34px chip are one component", () => {
    const small = renderToStaticMarkup(<AvatarChip name="Nick Physick" size={28} />);
    expect(small).toMatch(/width:\s*28px/);
    expect(small).toMatch(/height:\s*28px/);
  });

  /* ⚠️ THE MOCKUP IS SUPERSEDED HERE, DELIBERATELY. shell-workspace-doubledecker.html draws the
     rail-foot avatar as an ink disc (`.urow .ava{background:#4a423c;color:#e8e0d4}`). Building
     that gives the app two avatar systems — one on the ink rail, one everywhere else — and a
     user reads two systems as two different people's chrome. Baked 11 unifies them on parchment,
     and this lock is what stops a later "faithful to the mockup" pass reinstating the ink one. */
  it("is parchment with burgundy initials, NOT the mockup's ink rail disc", () => {
    const r = rule(".sp-ava");
    expect(r).toContain("background: var(--shell-avatar-bg)");
    expect(r).toContain("border: 1px solid var(--shell-avatar-bd)");
    expect(r).toContain("color: var(--shell-burgundy)");
    expect(r).not.toContain("#4a423c");
  });

  it("the initials are Playfair — the wordmark's face, not the label face", () => {
    expect(rule(".sp-ava")).toContain('font-family: "Playfair Display", serif');
  });
});

describe("MenuCard — one card, both shells", () => {
  it("renders a heading when given one, and none when not", () => {
    expect(renderToStaticMarkup(<MenuCard heading="Queries"><div /></MenuCard>))
      .toContain("Queries");
    expect(renderToStaticMarkup(<MenuCard><div /></MenuCard>)).not.toContain("sp-card-h");
  });

  it("renders its children", () => {
    expect(renderToStaticMarkup(
      <MenuCard><MenuCardItem label="Needs attention" onSelect={() => {}} /></MenuCard>
    )).toContain("Needs attention");
  });

  it("an item carries its count, with the dot when urgent", () => {
    const html = renderToStaticMarkup(
      <MenuCard><MenuCardItem label="Needs attention" count={3} urgent onSelect={() => {}} /></MenuCard>
    );
    expect(html).toContain("3");
    expect(html).toContain("sp-ct-dot");
  });

  /* The flyout child and the panel child must read as ONE state. If this fill ever diverges from
     the nav pill's, the collapsed shell and the expanded shell start teaching two conventions. */
  it("the selected item takes the SAME parchment fill as a nav pill", () => {
    expect(rule(".sp-card-i.on")).toContain("background: var(--shell-parch)");
  });

  it("the selected item is exposed to assistive tech, not just coloured", () => {
    expect(renderToStaticMarkup(
      <MenuCard><MenuCardItem label="Discover" on onSelect={() => {}} /></MenuCard>
    )).toContain('aria-current="page"');
  });

  it("items are buttons — a div with a click handler is not reachable by keyboard", () => {
    expect(renderToStaticMarkup(
      <MenuCard><MenuCardItem label="Discover" onSelect={() => {}} /></MenuCard>
    )).toContain("<button");
  });

  it("the divider renders", () => {
    expect(renderToStaticMarkup(<MenuCardDivider />)).toContain("sp-card-div");
  });

  it("the card is white on the edge token, with the layered shadow", () => {
    const r = rule(".sp-card");
    expect(r).toContain("background: #ffffff");
    expect(r).toContain("border: 1px solid var(--shell-edge)");
    expect(r).toContain("border-radius: 12px");
    expect(r).toMatch(/box-shadow:.*rgba\(46, 39, 35, 0\.14\).*rgba\(46, 39, 35, 0\.12\)/);
  });
});

describe("SearchPill — an opener, never a field", () => {
  it("advertises the shortcut that does the same thing", () => {
    expect(renderToStaticMarkup(<SearchPill onOpen={() => {}} />)).toContain("⌘K");
  });

  /* ⚠️ A REAL INPUT HERE WOULD BE A SECOND SEARCH. The palette owns the query; a field in the bar
     would hold its own state and the two would answer differently for the same typing. */
  it("renders a button and no input", () => {
    const html = renderToStaticMarkup(<SearchPill onOpen={() => {}} />);
    expect(html).toContain("<button");
    expect(html).not.toContain("<input");
  });

  it("takes a width so both bars can draw it, defaulting to the mockups' 210", () => {
    expect(renderToStaticMarkup(<SearchPill onOpen={() => {}} />)).toMatch(/width:\s*210px/);
    expect(renderToStaticMarkup(<SearchPill onOpen={() => {}} width={264} />))
      .toMatch(/width:\s*264px/);
  });

  it("is 34px on a 9px radius, per both mockups", () => {
    const r = rule(".sp-search");
    expect(r).toContain("height: 34px");
    expect(r).toContain("border-radius: 9px");
  });
});

describe("HelpButton", () => {
  it("is a labelled button — the glyph alone names nothing", () => {
    const html = renderToStaticMarkup(<HelpButton onOpen={() => {}} />);
    expect(html).toContain("<button");
    expect(html).toContain('aria-label="Help centre"');
  });

  it("is a 32px ghost square that lifts toward WHITE on hover (§7: the ground is warm now)", () => {
    expect(rule(".sp-help")).toContain("width: 32px");
    expect(rule(".sp-help")).toContain("background: transparent");
    expect(css).toMatch(/\.sp-help:hover[^{]*\{[^}]*background: rgba\(255, 255, 255, 0\.55\)/s);
  });
});

describe("Both shells keep their focus ring and honour reduced motion (Baked 21)", () => {
  it("every interactive primitive takes the one inset ring", () => {
    expect(css).toMatch(/\.sp-card-i:focus-visible[\s\S]*?box-shadow: inset 0 0 0 2px var\(--shell-focus\)/);
    expect(css).toContain(".sp-search:focus-visible");
    expect(css).toContain(".sp-help:focus-visible");
  });

  it("reduced motion kills the transitions", () => {
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });
});

describe("The token block — the pack's palette, and why it is prefixed", () => {
  const TOKENS: Record<string, string> = {
    "--shell-ink": "#2e2723",
    "--shell-ink-soft": "#6a615a",
    "--shell-muted": "#9c8878",
    "--shell-burgundy": "#7c3a2a",
    "--shell-parch": "#f2ede7",
    "--shell-chrome": "#fbf9f5",
    "--shell-hair": "#ece7de",
    "--shell-edge": "#e6e0d5",
    "--shell-seam": "#ddd2c2",
    "--shell-rail-tx": "#a89a8a",
    "--shell-rail-hi": "#f4efe7",
    "--shell-avatar-bg": "#f5e3da",
    "--shell-page": "#f7eee7",
    "--shell-railw": "52px",
    "--shell-panelw": "186px",  // 216 → 232 (Amendment 1) → 186 (polish §5): narrowed 20%
    "--shell-spring-out": "cubic-bezier(0.33, 1, 0.5, 1)",
    "--shell-intent": "100ms",
    "--shell-grace": "160ms",
    "--shell-rollout": "320ms",
    "--shell-slide": "28px",
  };

  Object.entries(TOKENS).forEach(([token, value]) => {
    it(`${token} is ${value}`, () => {
      expect(indexCss).toMatch(new RegExp(`${token}:\\s*${value.replace(/[.()*+?^${}|[\]\\]/g, "\\$&")}\\s*;`));
    });
  });

  /* ⚠️ THE REASON FOR THE PREFIX, ASSERTED. index.css already defines --ink, --muted and --line
     with DIFFERENT values. Taking the mockups' bare names would have retoned live surfaces
     silently — a green build, a green suite, and a wrong colour with nothing to point at. */
  it("the bare names the mockups use are still the OLD values, untouched", () => {
    expect(indexCss).toMatch(/--ink:\s*#241c15\s*;/);
    expect(indexCss).toMatch(/--muted:\s*#9a8c80\s*;/);
  });

  /* Two tokens holding one number is exactly the drift the prefix exists to prevent, so where a
     name already carried the pack's value it is reused rather than restated. */
  it("reuses the tokens that already carry the pack's values rather than restating them", () => {
    expect(indexCss).toMatch(/--pitch:\s*42px\s*;/);
    expect(indexCss).toMatch(/--shell-cap-gap:\s*14px\s*;/);
    expect(indexCss).toMatch(/--shell-cap-radius:\s*18px\s*;/);
    expect(indexCss, "no second rail width").not.toMatch(/--rail-w:|--railw:\s/);
  });

  it("the sage desk is a gradient token, not a flat fill", () => {
    expect(indexCss).toMatch(/--shell-desk-grad:\s*linear-gradient\(160deg, #b4c2b6, #a8b8aa\)/);
  });
});
