/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks for the settled desk's card chrome and tooltip surface (dashboard redesign, Phase 2).
 *
 * Whole-string assertions only — nothing here slices on a marker, per the house rule about specs
 * that split on a class they never asserted exists.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { DeskCard } from "./DeskCard";

const css = readFileSync(resolve(__dirname, "./deskTooltip.css"), "utf8");
const cssRules = css.replace(/\/\*[\s\S]*?\*\//g, "");
const rule = (sel: string) => {
  expect(css, `deskTooltip.css must define ${sel}`).toContain(sel + " {");
  const i = css.indexOf(sel + " {");
  return css.slice(i, css.indexOf("}", i));
};

describe("the card chrome", () => {
  it("is a sage band over a parchment body, with a neutral shadow", () => {
    const card = rule(".dk-card");
    expect(card).toContain("background: #fffdf9");
    expect(card).toContain("border: 1px solid #e3d9cc");
    expect(card).toContain("border-radius: 16px");
    expect(card).toContain("0 1px 2px rgba(58, 28, 20, 0.04), 0 5px 18px rgba(58, 28, 20, 0.06)");
    expect(rule(".dk-band")).toContain("linear-gradient(135deg, #d7ddd5, #d5dbd3)");
  });

  /* ⚠️ NO THICK INK BORDERS, NO COLOURED SHADOWS — the chrome rule shared with the Contact list
     and Discover. Asserted against RULES, not prose, so a comment naming the retired treatment
     cannot fail its own guard. */
  it("carries no ink border and no coloured drop shadow", () => {
    expect(cssRules).not.toMatch(/border:\s*1\.5px/);
    expect(cssRules).not.toMatch(/border:\s*2px/);
    expect(cssRules).not.toMatch(/box-shadow:[^;]*rgba\(124,\s*58,\s*42/); // burgundy cast
  });

  it("the outlined mono pill takes the sage-band border, and the warm one off-band", () => {
    const pill = rule(".dk-pill");
    expect(pill).toContain("border: 1px solid #9aa894");
    expect(pill).toContain("background: #fffdf9");
    expect(pill).toContain("border-radius: 99px");
    expect(pill).toContain("font-size: 9px");
    expect(pill).toContain("letter-spacing: 0.14em");
    expect(rule(".dk-pill.warm")).toContain("border-color: #b9aa97");
  });

  it("renders the band, the pill and the foot it is given", () => {
    const html = renderToStaticMarkup(
      <DeskCard title="The story so far" pill={<span className="dk-pill">This fortnight</span>} foot={<span>foot</span>}>
        <p>body</p>
      </DeskCard>,
    );
    expect(html).toContain("dk-card");
    expect(html).toContain("The story so far");
    expect(html).toContain("dk-pill");
    expect(html).toContain("dk-foot");
    expect(html).toContain("dk-body");
  });

  it("`bare` drops the body padding for bodies that draw their own rows", () => {
    const html = renderToStaticMarkup(<DeskCard title="Live pipeline" bare><p>rows</p></DeskCard>);
    expect(html).not.toContain("dk-body");
    expect(html).toContain("rows");
  });

  it("a card with no foot renders no foot rule", () => {
    const html = renderToStaticMarkup(<DeskCard title="x"><p>y</p></DeskCard>);
    expect(html).not.toContain("dk-foot");
  });
});

describe("the tooltip surface", () => {
  it("is parchment with the ref's two-stop shadow and 280px cap", () => {
    const tip = rule(".dk-tip");
    expect(tip).toContain("background: #fdfaf5");
    expect(tip).toContain("border: 1px solid #e3d9cc");
    expect(tip).toContain("border-radius: 12px");
    expect(tip).toContain("padding: 13px 15px 14px");
    expect(tip).toContain("max-width: 280px");
    expect(tip).toContain("position: fixed");
  });

  /* ⚠️ THE MODE LADDER. A plain tooltip must never eat a click, an interactive one must accept the
     pointer travelling into it, and a pinned one is a dialogue. Three states, one surface. */
  it("plain ignores the pointer; interactive accepts it; pinned is stronger", () => {
    expect(rule(".dk-tip")).toContain("pointer-events: none");
    expect(rule(".dk-tip.live")).toContain("pointer-events: auto");
    const pin = rule(".dk-tip.pinned");
    expect(pin).toContain("border-color: #cdbfae");
    expect(pin).toContain("0 16px 42px rgba(58, 28, 20, 0.2)");
  });

  /* ⚠️ ASSERTED AT SOURCE, because it cannot be rendered here: DeskTooltip portals into
     `document.body`, and with no jsdom there is no document — the component returns null by its own
     guard. So the copy and the dismissal wiring are checked in the file that owns them. */
  it("a pinned card says how to dismiss it, and closes on click-away, scroll and Escape", () => {
    expect(rule(".dk-pinnote")).toContain("text-align: center");
    const tsx = readFileSync(resolve(__dirname, "./DeskTooltip.tsx"), "utf8");
    expect(tsx).toContain("Click away to close");
    expect(tsx).toContain('e.key === "Escape"');
    expect(tsx).toContain('addEventListener("pointerdown"');
    expect(tsx).toContain('addEventListener("scroll"');
    // the anchor's own click toggles the pin — it must not ALSO count as an outside click
    expect(tsx).toContain("data-desk-tip-anchor");
  });

  it("honours reduced motion", () => {
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });
});
