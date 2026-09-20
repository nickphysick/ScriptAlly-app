/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ THE EXTRACTION IS A VISUAL NO-OP, AND THIS IS WHAT SAYS SO.
 *
 * `OneScreenPanel` replaced four hand-rolled card shells. The whole value of doing that in its own
 * commit is that any pixel which moves is a bug rather than a judgement call — so these pin the
 * rendered class strings to exactly what the four containers emitted before, character for
 * character, including the order of `os-card os-lift {variant}`.
 */
import { describe, it, expect } from "vitest";
import { sliceBetween } from "../../test/sliceBetween";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { OneScreenPanel } from "./OneScreenPanel";
import { cssRule, cssRuleCount } from "../../test/cssRule";

const html = (el: React.ReactElement) => renderToStaticMarkup(el);

describe("OneScreenPanel — the shell the four containers had", () => {
  it("emits `os-card os-lift {variant}` in that order", () => {
    expect(html(<OneScreenPanel variant="os-tasks" />)).toContain('class="os-card os-lift os-tasks"');
    expect(html(<OneScreenPanel variant="os-lead" />)).toContain('class="os-card os-lift os-lead"');
    expect(html(<OneScreenPanel variant="os-actv" />)).toContain('class="os-card os-lift os-actv"');
  });

  it("⚠️ a multi-word variant survives intact", () => {
    /* ⚠️ THE EXAMPLE WAS `os-goal stowable` AND THE MODIFIER IS RETIRED — nothing stows the goals
       card since it moved to the left column. The CLAIM is about the component and is unchanged: a
       variant with a space in it must reach the class list whole, because a panel that silently
       drops its second word loses whatever that word was for. Asserted on a synthetic pair so the
       case cannot lapse again when a real variant is renamed. */
    expect(html(<OneScreenPanel variant="os-goal os-extra" />))
      .toContain('class="os-card os-lift os-goal os-extra"');
  });

  it("appends ` isload` exactly as the hand-rolled shells did", () => {
    expect(html(<OneScreenPanel variant="os-tasks" loading />))
      .toContain('class="os-card os-lift os-tasks isload"');
  });

  it("renders the skeleton ONLY while loading, and only when bars are given", () => {
    expect(html(<OneScreenPanel variant="os-tasks" loading skel={["h", ""]} />)).toContain("os-skel");
    expect(html(<OneScreenPanel variant="os-tasks" skel={["h", ""]} />)).not.toMatch(/["\s`]os-skel["\s`]/);
    expect(html(<OneScreenPanel variant="os-tasks" loading />)).not.toMatch(/["\s`]os-skel["\s`]/);
  });

  /* ⚠️ v33 — THE BAND IS THE PANEL'S, INSIDE THE FRAME, AHEAD OF THE BODY. The `head` prop is retired
     with its last consumer; what a consumer passes now is only what is IN the band. */
  it("⚠️ the band is the frame's first child, and the body follows it inside the same frame", () => {
    const out = html(
      <OneScreenPanel variant="os-x" probe="p" band={<h3>H</h3>}>
        <div className="body">B</div>
      </OneScreenPanel>
    );
    /* ⚠️ THE FOUR TONES ARE RETIRED (the feed/to-do pass): every band is the one navy, so a per-card
       tone class is a knob with nothing behind it. Asserted ABSENT as well as the class being right,
       because a panel that silently kept emitting one would look identical and mean something. */
    expect(out).toContain('class="os-card os-lift os-x"');
    expect(out).not.toContain("os-tone--");
    expect(out).toMatch(/<div class="os-frame" data-probe="p-frame"><div class="os-band" data-probe="p-band"><h3>H<\/h3><\/div><div class="body">B<\/div><\/div>/);
  });

  it("a panel with no band draws no band — the frame still wraps the body", () => {
    const out = html(<OneScreenPanel variant="os-x"><i>B</i></OneScreenPanel>);
    expect(out).not.toContain("os-band");
    expect(out).toContain('<div class="os-frame"><i>B</i></div>');
  });

  it("`os-lift` is the default and can be turned off explicitly", () => {
    expect(html(<OneScreenPanel variant="os-x" lift={false} />)).toContain('class="os-card os-x"');
  });
});

/**
 * ⚠️ THE RIM SURVIVES A BAND (§2). Browser-proven cause: a child with an opaque background inside
 * a rounded `overflow:hidden` parent is clipped to the BORDER box and paints over the parent's
 * border. jsdom cannot render, so what is pinned here is the shape of the fix — an overlay that
 * paints above descendants — and the two things that would silently undo it.
 */
/**
 * ⚠️ THE `::after` RIM IS RETIRED, AND THE LAW IT CARRIED IS INVERTED RATHER THAN LOST (refdiff
 * pass, Phase 3). The overlay ring existed so a card's hairline could sit ABOVE its descendants
 * without a border adding 2px to the box. The ref draws a plain `1px solid var(--line)` border with
 * an 18px radius, and the refdiff reported the difference on every card at every width — bg, radius
 * and border width, three misses each.
 *
 * So the rule is now the mirror of what it was: ONE owner for the hairline, and it is the border.
 * A surviving `::after` ring beside it would be the two-owners fault the old law was written
 * against, arriving from the other side.
 */
/**
 * ⚠️ THE CARD'S LOOK IS FIVE TOKENS, AND THE TOKENS ARE THE CLAIM (v16, 18 Sep).
 *
 * The ref draws white paper, a hairline, a 14px radius, 20/22 of padding and a shadow so faint it
 * reads as a lifted edge rather than a drop. Those are declared ONCE on `.os-root` because a styling
 * pass follows: the retune is that block, not a sweep of the sheet. So what is pinned here is that
 * `.os-card` READS them — a literal creeping back into this rule is how two cards come to differ by
 * one unit, invisibly, which this repo has already paid for once on two buttons.
 *
 * ⚠️ AND THERE IS STILL EXACTLY ONE OWNER OF THE HAIRLINE. The `::after` ring was retired when the
 * border became real; a ring alongside the border is the two-owners fault arriving from the far side.
 */
describe("the card is the ref's paper, and it reads its values from tokens", () => {
  const bare = readFileSync(resolve(__dirname, "./oneScreen.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

  it("⚠️ every value on the card comes from `--dash-*`, never a literal", () => {
    /* ⚠️ v33 — THE CARD IS A RIM AND A FRAME. The rim is the card's own white (never parchment), 6px,
       with no border of its own; the frame is the burgundy line and it CLIPS, which is what lets the
       band take its top corners. Both read tokens; neither carries a literal. */
    const c = cssRule(bare, ".os-card", "oneScreen.css");
    expect(c).toContain("background: var(--dash-card)");
    expect(c).toContain("border: 0");
    expect(c).toContain("border-radius: var(--dash-radius)");
    expect(c).toContain("padding: var(--dash-rim)");
    expect(c).toContain("box-shadow: var(--dash-shadow)");
    expect(c).toContain("container-type: inline-size");
    const f = cssRule(bare, ".os-frame", "oneScreen.css");
    expect(f).toContain("border: 1px solid var(--dash-frame)");
    expect(f).toContain("border-radius: var(--dash-frame-radius)");
    expect(f).toContain("padding: var(--dash-pad)");
    expect(f).toContain("background: var(--dash-card)");
    expect(f).toContain("overflow: hidden");
    expect(f, "a hex on the frame's own rule").not.toMatch(/#[0-9a-f]{3,8}/i);
    /* no card puts parchment back on its rim */
    expect(bare).not.toMatch(/\.os-(lead|qa|cl|feed|todo)\s*\{[^}]*background:\s*var\(--dash-parchment\)/);
    /* a colour literal on this rule is the thing the token block exists to prevent */
    expect(c, "a hex on the card's own rule").not.toMatch(/#[0-9a-f]{3,8}/i);
    /* ⚠️ AND ITS STACKING LAYER, which is not decoration: the sidebar's seam scrim is `z-index: 0`
       and inert, so a card at auto is washed over at its left edge. It was dropped in the v16 sheet
       rewrite and only `dash-rail-v33.mjs` noticed. */
    expect(c).toContain("z-index: 1");
    expect(c).toContain("position: relative");
  });

  it("the tokens are declared, and declared once, on the page root", () => {
    const root = cssRule(bare, ".os-root", "oneScreen.css");
    for (const t of ["--dash-card", "--dash-hair", "--dash-radius", "--dash-rim", "--dash-frame-radius", "--dash-pad", "--dash-shadow", "--dash-frame"]) {
      expect(root, `${t} must be declared on .os-root`).toContain(`${t}:`);
      expect((bare.match(new RegExp(`${t}\\s*:`, "g")) ?? []).length, `${t} is declared twice`).toBe(1);
    }
    expect(root).toContain("--dash-radius: 16px");
    expect(root).toContain("--dash-rim: 6px");
    expect(root).toContain("--dash-frame-radius: 11px");
    expect(root).toContain("--dash-pad: 18px 22px 16px");
    expect(root).toContain("--dash-shadow: 0 2px 8px rgba(28, 19, 15, 0.06)");
    expect(root, "burgundy is the frame's line").toContain("--dash-frame: #7c3a2a");
  });

  it("⚠️ and the retired ring did not survive the border — one hairline, one owner", () => {
    expect(bare, "the ::after ring is back alongside the border").not.toMatch(/\.os-card::after\s*\{/);
  });
});

/**
 * ⚠️ THE BANDS ARE RETIRED, RULE AND ELEMENT TOGETHER (v16).
 *
 * Every card on the old dashboard wore a coloured band — sage `.os-ahead`, pink `.os-th2` — and a
 * long run of this file existed to hold the two to one geometry, because they had drifted twice.
 * The ref draws no band at all: a title, a mono eyebrow and a chip on the card's own paper. So the
 * claim inverts, and what it is worth is stated at the top of this file: a replacement that is ADDED
 * leaves the original reachable, and a dormant band rule is a second header treatment waiting for
 * the next reader to reattach it.
 *
 * ⚠️ THE COMMUNITY CARD IS THE ONE SURVIVOR AND IS NOT AN EXCEPTION — it declares `.os-commhead`
 * itself now (see `oneScreenCommunity.test.tsx`), precisely so that nothing on the page depends on
 * a shared rule the page no longer has.
 */
describe("the band era is over, and nothing of it is left reachable", () => {
  const bare = readFileSync(resolve(__dirname, "./oneScreen.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const files = ["OneScreenTasks", "OneScreenFeed", "OneScreenChart", "OneScreenClosed", "OneScreenActions",
                 "OneScreenDashboard", "OneScreenSkeleton", "OneScreenHeader"];

  it("⚠️ no band rule survives in the sheet", () => {
    for (const sel of [".os-ahead", ".os-th2", ".os-lh", ".os-ll", ".os-bandkey", ".os-lbody"]) {
      expect(cssRuleCount(bare, sel), `${sel} is still declared`).toBe(0);
    }
  });

  it("⚠️ and no card on the page emits one", () => {
    for (const f of files) {
      const src = readFileSync(resolve(__dirname, `./${f}.tsx`), "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
      for (const cls of ["os-ahead", "os-th2", "os-lh", "os-lbody"]) {
        expect(src, `${f} still renders ${cls}`).not.toMatch(new RegExp(`["\\s\`]${cls}["\\s\`]`));
      }
    }
  });

  /* ⚠️ THE BRUSH, THE CHIPS, THE SLIDER AND THE CONTROL CLUSTER went with the chart they operated
     (stage 3), and the Daily/Monthly toggle went with v16's single grain. A control that is replaced
     leaves nothing reachable behind it — the chart states its grain in a chip rather than offering a
     menu with one item in it. */
  it("⚠️ the retired chart controls are gone from the sheet and from the chart", () => {
    for (const sel of [".os-brush", ".os-bw", ".os-bshade", ".os-bwin", ".os-freqchips", ".os-ctrls",
                       ".os-rangelbl", ".os-rangeslider", ".os-rangecap", ".os-ctrlrow", ".os-freqsel",
                       ".os-actog"]) {
      expect(cssRuleCount(bare, sel), sel).toBe(0);
    }
    expect(bare).not.toContain("::-moz-range-track");
    const chart = readFileSync(resolve(__dirname, "./OneScreenChart.tsx"), "utf8");
    expect(chart).not.toContain('type="range"');
    /* ⚠️ v33 — AND THE GRAIN CHIP WENT TOO. The grain follows the campaign's length now (daily and
       stepped under twelve weeks, weekly and smoothed after), so there is nothing to state: no grain
       is named anywhere in the card, and the one control it has is the minimap's window. */
    const code = chart.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
    expect(code).not.toMatch(/Daily|Weekly|Monthly/);
    expect(code).not.toContain('data-probe="chart-controls"');
  });
});

/**
 * ⚠️ NOTHING ON THIS PAGE CLIPS ITS CARDS, AND THAT IS A DECISION.
 *
 * The old grid's columns were `overflow: hidden`, so a card's shadow ended in a hard line down the
 * column edge — the one thing a soft shadow must never have — and a 10px bleed allowance existed to
 * buy room before the cut. Both are retired. The old rule's reason, "without the clip a tall card
 * pushes past its column silently", is answered rather than dropped: it does, and now you see it. A
 * clip never fixed an overflowing card; it hid one.
 */
describe("the rows do not clip, so no shadow is cut", () => {
  const bare = readFileSync(resolve(__dirname, "./oneScreen.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

  it("neither row clips, and the retired columns are gone entirely", () => {
    for (const sel of [".os-row1", ".os-row2"]) {
      expect(cssRule(bare, sel, "oneScreen.css"), `${sel} clips`).not.toMatch(/overflow:\s*(hidden|clip)/);
    }
    for (const sel of [".os-colL", ".os-colM", ".os-colR", ".os-toprow", ".os-midrow"]) {
      expect(cssRuleCount(bare, sel), `${sel} outlived its grid`).toBe(0);
    }
    expect(bare, "the bleed allowance outlived the clip it bought room against").not.toContain("--os-bleed");
  });

  /* ⚠️ THE CARDS THAT SCROLL CLIP THEMSELVES, AND THAT IS NOT THE SAME THING. Row two's two cards
     hold internal scrollers; the scroller clips, the card does not, so a card's own shadow is whole
     while its content is bounded. */
  it("the scrolling cards bound their contents without clipping their own box", () => {
    const scroll = cssRule(bare, ".os-scroll", "oneScreen.css");
    expect(scroll).toMatch(/overflow-y:\s*auto/);
    expect(scroll).toContain("min-height: 0");
  });
});

/**
 * ⚠️ `Goal met` IS RETIRED AND THE CARD THAT SAID IT IS GONE WITH THE RAIL (v16) — the lock stays,
 * because the words are the point rather than the card. A verdict ages; a date does not. The module
 * is still live (`dailyLedger` and the ledger's own types are the chart's), so the phrase could come
 * back into it without anything rendering a goals card at all.
 */
describe("the page delivers no verdicts", () => {
  it("⚠️ `Goal met` and `goalFigure` are both gone from the ledger module", () => {
    const lib = readFileSync(resolve(__dirname, "../../lib/oneScreen.ts"), "utf8");
    /* comments stripped: prose about a retired phrase is not the phrase */
    const decls = lib.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    expect(decls).not.toContain("Goal met");
    expect(decls).not.toContain("goalFigure");
  });
});
