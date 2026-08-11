/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Community tile (community-tile pack, Phase 1) — and the law it exists under.
 *
 * ⚠️ MOST OF THIS FILE GUARDS COPY, NOT CODE, because this tile is where the appraisal law breaks
 * first. A band of other writers' figures invites a verdict, and every plausible "improvement" to
 * it — a green marker inside the band, "you're ahead of 60%", "on track" — is a verdict. Phase 1
 * ships only the empty state, so the guards are cheap now and load-bearing the moment Phase 3
 * lands. They are written against the WHOLE component file, so they hold when the states arrive.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { COMMUNITY_EMPTY, OneScreenCommunity } from "./OneScreenCommunity";

const src = readFileSync(resolve(__dirname, "./OneScreenCommunity.tsx"), "utf8");
const css = readFileSync(resolve(__dirname, "./oneScreen.css"), "utf8");
const cssRules = css.replace(/\/\*[\s\S]*?\*\//g, "");
const html = renderToStaticMarkup(<OneScreenCommunity loading={false} />);

describe("the empty state is the whole of Phase 1", () => {
  it("renders the pack's copy verbatim", () => {
    expect(COMMUNITY_EMPTY).toBe(
      "You're early. Community figures need writers at your stage to compare with. This tile stays quiet until there are.",
    );
    expect(html).toContain("Community figures need writers at your stage");
  });

  it("the band carries the title and the BETA chip", () => {
    expect(html).toContain("Community");
    expect(html).toContain("BETA");
  });

  /* ⚠️ NO CROSS-USER READ EXISTS YET, and Phase 1 must not smuggle one in ahead of the rules that
     make it safe. The tile takes exactly one prop: `loading`. */
  it("⚠️ Phase 1 fetches nothing — no db hook, no aggregate read, no cohort data", () => {
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    expect(code).not.toContain("useScriptAllyDb");
    expect(code).not.toContain("collection(");
    expect(code).not.toContain("aggregate");
  });
});

/**
 * ⚠️ THE APPRAISAL LAW. These assert ABSENCE across the component, so they keep holding as the
 * states are added — a Phase 3 that introduces "you're ahead" fails here, not in review.
 */
describe("⚠️ the appraisal law — no verdicts, ever", () => {
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  /* ⚠️ THE LAW IS ABOUT PROSE, SO IT IS CHECKED AGAINST PROSE. Scanning the raw source matched
     `os-ahead` — the shared band's class — and failed on the word "ahead" inside an identifier.
     These are the component's user-facing strings: quoted literals containing a space, which is
     what separates a sentence from a class name or a prop. */
  const prose = [
    ...(code.match(/"[^"]*\s[^"]*"/g) ?? []),
    ...(code.match(/'[^']*\s[^']*'/g) ?? []),
  ].join(" ").toLowerCase();

  it("the prose carries no adjective of judgement", () => {
    expect(prose.length, "there must be prose to check").toBeGreaterThan(40);
    for (const word of [
      "ahead", "behind", "on track", "healthy", "strong", "good", "poor",
      "better", "worse", "average", "impressive", "should",
    ]) {
      expect(prose, `"${word}" is an appraisal`).not.toContain(word);
    }
  });

  it("the prose carries no ranking, percentile or top-N framing", () => {
    for (const word of ["percentile", "top ", "rank", "outperform", "beats", "%ile", "compared to you"]) {
      expect(prose, `"${word}" ranks the reader`).not.toContain(word);
    }
  });

  /* ⚠️ ONE COLOUR IN EVERY POSITION. A marker that turns sage inside the band and burgundy outside
     it is a verdict rendered in paint rather than words — the same rule, evaded. */
  it("the tile's own rules never switch colour on a value", () => {
    const at = cssRules.indexOf(".os-comm {");
    expect(at).toBeGreaterThan(-1);
    const block = cssRules.slice(at);
    expect(block).not.toMatch(/\.os-comm[^{]*\.(good|bad|over|under|inside|outside)\b/);
  });
});

describe("the tile fills a row it does not size", () => {
  /* ⚠️ THE TASKS CARD SETS THE ROW HEIGHT and the tile fills it — verified by screenshot, since
     jsdom cannot do a flex/grid height chain. What IS assertable is the mechanism: a footer with
     `margin-top: auto`, so the body sits to the top rather than drifting as the task list changes
     length. Browser-measured at 1440: tile 302×147, tasks 500×147 — the tile is not the taller. */
  it("a footer region takes the slack", () => {
    expect(html).toContain("os-commfoot");
    const at = cssRules.indexOf(".os-commfoot");
    expect(at).toBeGreaterThan(-1);
    expect(cssRules.slice(at, cssRules.indexOf("}", at))).toContain("margin-top: auto");
  });

  /* ⚠️ ONE DECLARATION FOR BOTH ROWS — the spine. Two matched pairs of numbers drift; one rule
     cannot. Browser-measured: tile 302 = author 302, tasks 500 = chart 500. */
  it("⚠️ the lower row reuses the upper row's columns, never a second set of widths", () => {
    expect(cssRules).toMatch(/\.os-midrow,\s*\.os-lowrow \{[^}]*grid-template-columns: 302px minmax\(0, 1fr\)/);
    /* ⚠️ ANCHOR ON THE LINE START — `.os-lowrow {` also matches inside the SHARED selector
       `.os-midrow, .os-lowrow {`, so an unanchored slice reads the shared rule and "finds" the
       columns it is asserting are absent. The standalone rule begins a line. */
    const own = /\n\.os-lowrow \{([^}]*)\}/.exec(cssRules);
    expect(own, "the standalone .os-lowrow rule must exist").not.toBeNull();
    expect(own![1]).not.toContain("grid-template-columns");
  });

  /* ⚠️ THE BAND IS THE SHARED ONE. The first draft restated height/padding here and, being later
     in the sheet, WON — rendering the Community band 7px shorter than every other band. */
  it("⚠️ the band declares no geometry of its own", () => {
    expect(cssRules).not.toMatch(/\.os-commhead \{[^}]*height:/);
    expect(cssRules).not.toMatch(/\.os-commhead \{[^}]*padding:/);
  });
});
