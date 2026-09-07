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
import { cssRule, cssRuleCount } from "../../test/cssRule";

const src = readFileSync(resolve(__dirname, "./OneScreenCommunity.tsx"), "utf8");
const css = readFileSync(resolve(__dirname, "./oneScreen.css"), "utf8");
const cssRules = css.replace(/\/\*[\s\S]*?\*\//g, "");
const html = renderToStaticMarkup(<OneScreenCommunity loading={false} />);

const rule = (sel: string) => cssRule(cssRules, sel, "oneScreen.css");

describe("the empty state is the whole of Phase 1", () => {
  /* ⚠️ RETARGETED (empty-state pack): the copy changed wholesale. Both strings were stated
     verbatim by their own pack; this one is current. Locked as an exact string because "verbatim"
     is the whole contract — a paraphrase is the failure this catches. */
  it("renders the pack's copy verbatim", () => {
    expect(COMMUNITY_EMPTY).toBe(
      "As our community builds, you'll be able to benchmark your key stats against other writers at a similar stage.",
    );
    expect(html).toContain("benchmark your key stats against other writers");
  });

  /* ⚠️ NO EXCLAMATION MARK, ANYWHERE — nothing else in the app uses one. Originally this also
     pinned the share button's label (which had lost the exclamation Nick's first copy carried);
     the button is gone, so the rule now stands on the sentence alone. */
  it("⚠️ the tile's prose carries no exclamation mark", () => {
    expect(COMMUNITY_EMPTY).not.toContain("!");
    expect(html).not.toContain("!");
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
  /* ⚠️ RETARGETED (empty-state pack): the `margin-top: auto` FOOTER IS GONE and its absence is
     the assertion. It pushed a top-aligned paragraph's slack downward; the body centres on both
     axes now, so a spacer would fight the centring — and a stray `margin-top: auto` left in the
     sheet would silently un-centre the hero the moment anyone re-added the div. */
  it("⚠️ the body centres itself — no spacer, and none left in the sheet", () => {
    expect(html).not.toContain("os-commfoot");
    expect(cssRules).not.toContain(".os-commfoot");
    const at = cssRules.indexOf(".os-commbody {");
    expect(at).toBeGreaterThan(-1);
    const body = cssRules.slice(at, cssRules.indexOf("}", at));
    expect(body).toContain("align-items: center");
    expect(body).toContain("justify-content: center");
    /* ⚠️ AND NO COMPENSATION — this is what makes the centring survive a child being removed. When
       the share button went, the reflex fix is a `margin` or `padding-bottom` here to "balance"
       the remaining pair; that re-creates the off-centre the deleted spacer caused, with nothing
       left to point at. Centring centres what it contains — asserted, so the reflex fails here. */
    expect(body).not.toContain("margin");
    expect(body).not.toMatch(/padding-(top|bottom)/);
  });

  /* ⚠️ TWO CHILDREN, AND THAT IS THE TILE. Seedling and sentence — the count is the invariant the
     centring rests on, since anything re-added lands inside the same centred column and shifts
     both. Asserted against RENDERED output rather than source, so a conditional that smuggles a
     third child back in at runtime fails here too. */
  it("⚠️ the hero is the seedling and the sentence, nothing else", () => {
    const at = html.indexOf('class="os-commbody"');
    expect(at, "the body must exist to count its children").toBeGreaterThan(-1);
    const body = html.slice(at);
    expect(body).toContain("os-commseed");
    expect(body).toContain("os-commempty");
    expect((body.match(/<(img|p|button|a|div|span)\b/g) ?? []).length).toBe(2);
  });

  /* ⚠️ THE PLATE IS EXTENDED, NEVER DUPLICATED. The band rendered a bespoke `.os-commic` span —
     a fourth copy of a plate three headers already shared. It reads `OneScreenMark` now, so the
     28px box, its fill, its hairline and the degrade path all come from one place. */
  it("⚠️ the band uses the SHARED mark slot, and the fourth copy is deleted", () => {
    const src = readFileSync(resolve(__dirname, "./OneScreenCommunity.tsx"), "utf8");
    expect(src).toContain('<OneScreenMark name="community" />');
    expect(html).toContain('data-mark="community"');
    expect(html).toContain("os-mark");
    expect(cssRules).not.toContain(".os-commic");
  });

  /* ⚠️ 84px AGAINST A 100px SOURCE — never above 100, never upscaled to fill space. */
  it("the seedling is decorative and capped below its intrinsic size", () => {
    expect(html).toContain('alt=""');
    expect(html).toContain('aria-hidden="true"');
    const at = cssRules.indexOf(".os-commseed");
    expect(at).toBeGreaterThan(-1);
    expect(cssRules.slice(at, cssRules.indexOf("}", at))).toContain("width: 84px");
  });

  /* ⚠️ INVERTED (Nick's call): the tile carries NO CONTROL AT ALL. It was a disabled "Spread the
     word" pill awaiting Phase 2 wiring; it is removed, so the assertion flips from "the button is
     inert" to "there is no button" — and it holds for both shapes, since a disabled control and an
     enabled one are equally forbidden now. The tile is a statement, not a call to action.

     ⚠️ THE RULES GO WITH THE ELEMENT. `.os-commshare` is asserted absent from the SHEET too: this
     file has watched three deleted nodes (`.os-commic`, `.os-commfoot`, this) and orphaned styling
     is how each of them would come back — the next person to add markup finds it pre-styled and
     reads that as intent. */
  it("⚠️ the share button is gone — element and rules together, with no handler left behind", () => {
    const src = readFileSync(resolve(__dirname, "./OneScreenCommunity.tsx"), "utf8");
    expect(html).not.toContain("<button");
    expect(html).not.toContain("Spread the word");
    expect(html).not.toContain("os-commshare");
    expect(cssRules).not.toContain(".os-commshare");
    /* ⚠️ COMMENT-STRIPPED — the tombstone trap, hit by this test's first draft: the TODO beside
       the button explained that an enabled control with no `onClick` is the forbidden shape, and
       the guard caught its own explanation. The prose still names the control, so the strip stays. */
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
    expect(code).not.toContain("onClick");
    expect(code).not.toContain("button");
  });

  /* ⚠️ RETARGETED (dashboard redesign, Phase 2). The tile used to sit in the LOWER of two rows
     that shared one `grid-template-columns` with the upper, so it could not drift from the author
     tile's width. It is now the author tile's COLUMN-mate — same track, same width, by being in
     the same column — and the shared declaration is retired with the rows.

     ⚠️ AND THE TILE NO LONGER STRETCHES, WHICH IS THE OTHER HALF OF THE MOVE. It filled a row
     whose height tasks set; a centred hero stretched by a row it does not own is a tile pretending
     to be taller than its content. Natural height now, and the left column's slack is Pro's. */
  it("⚠️ the tile is a column card at its natural height — it never fills a row it does not size", () => {
    expect(cssRules).toContain("grid-template-columns: 440px minmax(0, 1fr) 420px");
    /* ⚠️ REVERSED (refdiff pass, Phase 3), AND THE REASON REVERSED WITH IT. The tile stopped
       stretching when the grid gave the columns a shared row box and the cards were natural height —
       and the three column bottoms then sat 658px apart, which is the fault the ref's
       `align-items: stretch` exists to prevent. The LAST card in a side column closes it: Pro when
       it renders, Community when it does not. Both are `flex: 1 1 auto` so whichever is last takes
       the slack; the tile is no longer pretending to a height it does not own, it is closing a
       column that would otherwise end in a hole. */
    expect(rule(".os-colL .os-comm")).toContain("flex: 1 1 auto");
    expect(rule(".os-colL .os-probanner")).toContain("flex: 1 1 auto");
    /* the retired spine must not survive — a leftover rule is how a deleted layout comes back */
    expect(cssRuleCount(cssRules, ".os-midrow, .os-lowrow")).toBe(0);
  });

  /* ⚠️ THE BAND IS THE SHARED ONE. The first draft restated height/padding here and, being later
     in the sheet, WON — rendering the Community band 7px shorter than every other band. */
  it("⚠️ the band declares no geometry of its own", () => {
    expect(cssRules).not.toMatch(/\.os-commhead \{[^}]*height:/);
    expect(cssRules).not.toMatch(/\.os-commhead \{[^}]*padding:/);
  });
});
