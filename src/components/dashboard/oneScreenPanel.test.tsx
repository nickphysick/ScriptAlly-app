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

  it("⚠️ the head precedes the body — it is the card's first child after the skeleton", () => {
    const out = html(
      <OneScreenPanel variant="os-actv" head={<div className="os-ahead">H</div>}>
        <div className="body">B</div>
      </OneScreenPanel>
    );
    expect(out.indexOf("os-ahead")).toBeLessThan(out.indexOf('class="body"'));
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
describe("the container rim is the card's own border, and there is only one of it", () => {
  const bare = readFileSync(resolve(__dirname, "./oneScreen.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  it("⚠️ the card draws a real border — the ref's 1px line, not an overlay ring", () => {
    const c = cssRule(bare, ".os-card", "oneScreen.css");
    expect(c).toContain("border: 1px solid #e6dfd6");
    expect(c).toContain("border-radius: 18px");
    expect(c).toContain("background: #fdfbf7");
  });

  it("⚠️ and the retired ring did not survive it — one hairline, one owner", () => {
    expect(bare, "the ::after ring is back alongside the border").not.toMatch(/\.os-card::after\s*\{/);
  });
});


/**
 * ⚠️ EVERY CONTAINER'S BAND IS THE SAME OBJECT (§2).
 *
 * Active queries was the last container on plain parchment. It now wears `.os-ahead`, the same
 * band as Activity and Goals, and `.os-th2` — the pink tasks band — was 2px taller than the other
 * three on padding alone (11/18 against 10/16). Nobody had noticed, because until the marks landed
 * no two bands sat side by side at a shared height. Browser-measured after the fix: all four at
 * 49px, spread 0, at 1440 AND 1024.
 */
describe("the bands are one geometry, coloured by purpose", () => {
  const css = readFileSync(resolve(__dirname, "./oneScreen.css"), "utf8");
  const bare = css.replace(/\/\*[\s\S]*?\*\//g, "");
  it("⚠️ the sage and pink bands share their PADDING — colour differs by purpose, geometry does not", () => {
    /* ⚠️ THEY SHARE IT BY BEING ONE RULE, which is a stronger claim than two rules that agree: the
       two cannot drift, because there is only one declaration to edit. */
    const grouped = /(?:^|\n)\.os-ahead,\s*\.os-th2\s*\{([^}]*)\}/m.exec(bare);
    expect(grouped, "the two bands must share ONE geometry rule").not.toBeNull();
    /* ⚠️ RETARGETED OFF THE VALUES (v22). It read `padding: 0 20px` and `height: 51px`, which was
       the geometry when the band was a stated height with its contents centred; the ref's band is
       `14px 20px` with `padding-bottom:4px` from `ch-bare` and no height at all, so its contents sit
       HIGH in the band. Centring them cost the to-do badge 4.6px at every width while the band's own
       height stayed in tolerance — the diff blamed the badge, which was innocent.
       THE CLAIM WAS NEVER THE NUMBERS: it is that there is ONE rule, so the two bands cannot drift.
       The numbers are decided against the ref by `scripts/dash-refdiff.mjs` and pinning them here
       would go red on every retune of something this lock has no opinion about. */
    expect(grouped![1]).toMatch(/padding:\s*\d+px/);
    /* ⚠️ A FLOOR, AND ITS VALUE IS DELIBERATELY BELOW THE BAND'S NATURAL HEIGHT (v26). It was 51 —
       the v22 band's stated height, kept as a minimum when the band went content-driven — and the
       ref's band is 50.2, so it BOUND on every card and every band ran 0.8px tall. A floor that
       binds is not a floor. 44 is the honest one: the padding plus the 26px mark, i.e. a band with
       nothing in it but its tile. The claim is that a floor exists and does not bind, so the
       assertion is on the relationship rather than on the number. */
    const floor = Number(/min-height:\s*(\d+)px/.exec(grouped![1])?.[1]);
    expect(floor, "the shared band must state a floor").toBeGreaterThan(0);
    expect(floor, "a floor above the band's natural 50.2px height binds on every card").toBeLessThan(50);
    expect(grouped![1]).toContain("box-sizing: border-box");
    /* and neither may state a competing padding elsewhere — see the base-rule case below */
  });

  /* ⚠️ THE CHART'S BAND EXCEPTION IS RETIRED WITH THE BAND (dashboard stage 3, 17 Sep). The chart used to
     wear `.os-ahead` with a scoped `.os-lead > .os-ahead` override that let it hold two rows; the new
     chart has a header of its own (`.os-achead` — the hawk, the headline and the grain toggle), so the
     shared band is back to its two members and there is no exception left to scope. */
  it("⚠️ the shared band has no exception left — no chart override, and nothing wraps by default", () => {
    const shared = /(?:^|\n)\.os-ahead,\s*\.os-th2\s*\{([^}]*)\}/m.exec(bare)![1];
    expect(shared).toMatch(/min-height:\s*\d+px/);
    expect(shared).not.toMatch(/flex-wrap:\s*wrap/);
    expect(bare).not.toMatch(/\.os-lead > \.os-ahead\s*\{/);
    expect(bare).not.toMatch(/(?:^|\n)\.os-th2\s*\{[^}]*flex-wrap:\s*wrap/);
  });

  it("Active queries has a header of its own now, and it is not the shared band", () => {
    const chart = readFileSync(resolve(__dirname, "./OneScreenChart.tsx"), "utf8");
    expect(chart).toMatch(/<div className="os-achead" data-probe="chart-header">/);
    expect(chart).not.toContain('className="os-ahead"');
    expect(chart).not.toContain('className="os-lh"');
  });

  it("⚠️ the retired chart header is GONE, not merely unused", () => {
    // a dormant `.os-lh` is a second treatment waiting to be reattached by the next reader
    expect(bare).not.toMatch(/\.os-lh\s*\{/);
    expect(bare).not.toMatch(/\.os-ll\s*\{/);
  });

  /* ⚠️ THE BRUSH, THE CHIPS AND THE CONTROL CLUSTER ARE RETIRED (stage 3), rule and element together — a
     control that is replaced leaves nothing reachable behind it. The grain toggle that replaced the
     chips sits in the chart's own header. */
  it("⚠️ the retired controls are gone from the sheet, and the toggle is in the chart's header", () => {
    for (const sel of [".os-brush", ".os-bw", ".os-bshade", ".os-bwin", ".os-freqchips", ".os-ctrls",
                       ".os-rangelbl", ".os-rangeslider", ".os-rangecap", ".os-ctrlrow", ".os-freqsel"]) {
      expect(cssRuleCount(bare, sel), sel).toBe(0);
    }
    expect(bare).not.toContain("::-moz-range-track");
    const chart = readFileSync(resolve(__dirname, "./OneScreenChart.tsx"), "utf8");
    const head = sliceBetween(chart, '<div className="os-achead" data-probe="chart-header">', '<div className="os-acbody">', "the chart's header");
    expect(head).toContain('className="os-actog"');
    expect(chart).not.toContain('type="range"');
  });
});

/**
 * ⚠️ THE GOALS CARD IS DELIBERATELY UNBANDED (headers P2). Tried, rejected: its header names the
 * card rather than operating it, and the sage band gave it a weight the card does not carry.
 */
describe("Querying goals keeps its bare header", () => {
  const rail = readFileSync(resolve(__dirname, "./OneScreenRail.tsx"), "utf8");
  const goalHead = rail.slice(rail.indexOf('className="os-goal-r1"'), rail.indexOf("</h2>", rail.indexOf('className="os-goal-r1"')));

  it("no band and no mark box in the goals header", () => {
    expect(goalHead).not.toContain("os-ahead");
    expect(goalHead).not.toContain("OneScreenMark");
  });

  /* ⚠️ REVERSED BY THE GOALS PACK, AND THE REVERSAL IS THE POINT. This case used to require
     `"Goal met"` in oneScreen.ts, on the reasoning that the at-or-beyond-target STATE was not what
     the header pass rejected. That still holds — the state survives, and is now the card's fullest
     moment — but the WORDS do not: "Goal met" is a verdict, and the rebuilt card may not deliver
     one. It states the day instead ("Target reached 19 August"), which is a fact that stays true
     rather than a cheer that ages. The assertion is inverted rather than deleted, so the phrase
     cannot drift back in.

     ⚠️ THE CASE ABOVE IS UNTOUCHED. The bare header is a separate decision, re-confirmed in the
     browser on 23 Aug against a local build and deployed dev before this pack was written. */
  it("⚠️ `Goal met` is retired — the reached state states a DAY, never a verdict", () => {
    const lib = readFileSync(resolve(__dirname, "../../lib/oneScreen.ts"), "utf8");
    /* comments stripped: this file's own prose quotes the retired phrase, twice */
    const decls = lib.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    expect(decls).not.toContain("Goal met");
    expect(decls).not.toContain("goalFigure");
  });
});

/**
 * ⚠️ THE BAND'S HEIGHT IS STATED, NOT DERIVED (headers P3). All three bands used to be sized by
 * their contents and agreed only by coincidence — measured 51 against 49 before the padding was
 * unified, and any control, longer title or font fallback would have parted them again.
 * Browser-measured after the fix: 51.00 on all three, spread 0, at 1280 / 1440 / 1920.
 */
describe("one band geometry, declared", () => {
  const bare = readFileSync(resolve(__dirname, "./oneScreen.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

  /* ⚠️ INVERTED BY THE REF (v22), AND THE OLD CLAIM IS THE ONE THAT WAS WRONG. This required the
     band's height to be DECLARED, "not left to the contents" — on the reasoning that three bands
     agreeing structurally beats three bands that happen to measure the same. The reasoning holds
     and the mechanism was the wrong one: the ref's band has no height, its air is 14px above and
     4px below, and a stated height with centred contents is a different thing that merely measures
     close. The agreement now comes from ONE shared rule plus a FLOOR, which is the same structural
     guarantee — an empty band is still 51px — without contradicting the ref. */
  it("⚠️ the band's air is the ref's, and the 51px survives as a FLOOR", () => {
    const m = /\.os-ahead,\s*\.os-th2\s*\{([^}]*)\}/.exec(bare);
    expect(m, "the two bands must share ONE geometry rule").not.toBeNull();
    expect(m![1]).toMatch(/min-height:\s*\d+px/);
    expect(m![1]).toContain("box-sizing: border-box");
    /* asymmetric: more air above the contents than below, which is what puts them high in the band */
    const pad = /padding:\s*(\d+)px\s+\d+px\s+(\d+)px/.exec(m![1]);
    expect(pad, "the band states a three-value padding").not.toBeNull();
    expect(Number(pad![1])).toBeGreaterThan(Number(pad![2]));
    expect(m![1]).not.toMatch(/(?:^|;)\s*height:\s*51px/);
  });

  /* ⚠️ THE BASE RULES, ANCHORED — see `geom`. The chart's scoped override DOES declare a padding
     (the ref's own `#chartCard .hd`), which is the point of it; what must not happen is either
     BASE band growing a padding of its own, because that is how the two drifted apart before. */
  it("⚠️ neither band re-declares its own padding — that is how they drifted apart before", () => {
    for (const sel of [".os-ahead", ".os-th2"]) {
      const m = new RegExp(`(?:^|\\n)\\${sel}\\s*\\{([^}]*)\\}`, "m").exec(bare);
      if (m) expect(m[1], sel).not.toMatch(/padding:/);
    }
  });

  it("titles never wrap; the controls give instead", () => {
    expect(bare).toMatch(/\.os-ahead h2,\s*\.os-th2 h2\s*\{[^}]*white-space:\s*nowrap/);
  });

  /* ⚠️ RETARGETED (stage 3): the figure is in the chart's own header, beside its words. */
  it("⚠️ the figure is IN the chart's header, and the loose wrapper beneath is gone", () => {
    const chart = readFileSync(resolve(__dirname, "./OneScreenChart.tsx"), "utf8");
    const head = sliceBetween(chart, '<div className="os-achead" data-probe="chart-header">', '<div className="os-acbody">', "the chart's header");
    expect(head).toContain('className="os-acn"');
    expect(chart).not.toContain('className="os-fig"'); // nothing floats beneath the header
    expect(bare).not.toMatch(/\.os-fig\s*\{/);
  });

  /* ⚠️ RETARGETED (stage 3): the shared card states no padding, as before; the chart has no band to run
     edge to edge any more, so it pads itself like the other two cards in its row, and the body rule
     that carried its gutter (`.os-lbody`) is retired. */
  it("⚠️ the card states no padding of its own — each card pads itself", () => {
    const i = bare.indexOf(".os-card {");
    expect(bare.slice(i, bare.indexOf("}", i))).not.toMatch(/padding:/);
    for (const sel of [".os-lead", ".os-qa", ".os-cl"]) {
      expect(cssRule(bare, sel), sel).toMatch(/padding:\s*\d+px/);
    }
    expect(cssRuleCount(bare, ".os-lbody")).toBe(0);
  });
});

/**
 * ⚠️ A CLIPPING COLUMN SLICES ITS CHILDREN'S SHADOWS (P4). The bleed allowance grows the clip
 * outward and pulls the box back, so the shadows survive and nothing moves. Browser-measured with
 * and without: card positions identical, gap 15px both ways, page still does not scroll.
 */
describe("the columns bleed, and nothing moves", () => {
  const bare = readFileSync(resolve(__dirname, "./oneScreen.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const col = (() => {
    const i = bare.indexOf(".os-colL, .os-colR {");
    expect(i, "the columns must share one rule").toBeGreaterThan(-1);
    return bare.slice(i, bare.indexOf("}", i));
  })();

  /* ⚠️ THE BLEED IS RETIRED, AND THE CLAIM INVERTS (v26, Phase 8). The columns clipped, so their
     children's shadows ended at the column edge, and a 10px padding/negative-margin pair bought
     10px of room before the cut. The technique was sound and the problem was the wrong one: these
     shadows reach ~18px, so 10px of bleed sliced every one of them — a hard termination down the
     column's edge, which is the single thing a soft shadow must never have. The ref does not clip
     at all (`.page2 .lcol, .page2 .rcol, .toprow{overflow:visible}`), so neither do we, and there
     is nothing left to bleed past.
     ⚠️ THE OLD RULE'S REASON — "without the overflow, a tall card pushes past its column silently"
     — is answered rather than dropped: it does, and now you SEE it. A clip never fixed an
     overflowing card; it hid one. */
  it("the columns do not clip, so nothing needs a bleed allowance", () => {
    expect(col).toContain("overflow: visible");
    expect(col).not.toContain("overflow: hidden");
    expect(col).not.toContain("var(--os-bleed)");
    /* the row that replaced the top row (stage 3) does not clip either — a card's shadow crosses it */
    expect(cssRule(bare, ".os-row2")).not.toMatch(/overflow:\s*(hidden|clip)/);
    expect(cssRuleCount(bare, ".os-toprow")).toBe(0);
    /* and every card is in one stacking layer, so a shadow paints over an earlier sibling */
    expect(bare).toMatch(/\.os-card \{[^}]*z-index:\s*1/);
  });

  /* ⚠️ RETIRED WITH THE BLEED IT EXISTED FOR (v26, Phase 8). `content-box` was required BECAUSE of
     the padding/negative-margin pair: under `border-box` the padding ate into `height: 100%` and
     the negative margin then pulled the content 10px out of place instead of restoring it. With no
     padding there is nothing for the box model to eat, and the column inherits the sheet's own
     `border-box` like everything else. The case is deleted rather than inverted: "the column is not
     content-box" is not a law, it is the absence of one.
     ⚠️ AND THE PADDING WAS INFLATING THE COLUMN, which is how it showed up: 20px of vertical
     padding OUTSIDE `min-height: 100%` left the activity panel measuring short of the ref. */

  /* the clip is gone entirely — see "the columns do not clip" above, which asserts its absence */
});

/**
 * ⚠️ A BAND MUST MEET ITS CARD'S EDGES — and the height tests could not see that it didn't.
 *
 * THE FAULT: `.os-lead` kept the `padding: 13px 18px 9px` it wore as a plain card when the band
 * arrived, so `.os-ahead` sat 18px in from each side and 13px down, inside a card that was also
 * `overflow: visible` — a square band floating within a rounded card. Every band still measured
 * 51px, so every test passed.
 *
 * A band's geometry is its POSITION as much as its size. Browser-measured after the fix: left, top
 * and width identical to the card on all three (deltas 0.00).
 */
describe("the bands meet their cards' edges", () => {
  const bare = readFileSync(resolve(__dirname, "./oneScreen.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  /* ⚠️ ANCHOR AT A RULE BOUNDARY. `indexOf(".os-lead {")` also matches INSIDE
     `.os-midrow .os-lead {`, so the naive helper read the midrow's height rule and reported the
     card as unclipped. The slice-anchoring trap, caught by its own assertion. */
  const blk2 = (sel: string) => {
    const re = new RegExp(`(^|[}\\n])\\s*\\${sel}\\s*\\{([^}]*)\\}`, "m");
    const m = re.exec(bare);
    expect(m, `${sel} must exist as a rule of its own`).not.toBeNull();
    return m![2];
  };

  /* ⚠️ TWO BANDED CARDS SINCE STAGE 3 — the chart's header is its own and the card pads itself */
  it("⚠️ every banded card carries NO padding — the padding belongs to its body", () => {
    for (const sel of [".os-tasks", ".os-actv"]) {
      const b = blk2(sel);
      const p = /padding:\s*([^;]+)/.exec(b)?.[1]?.trim();
      expect(p === undefined || p === "0", `${sel} padding is "${p}" — it would inset the band`).toBe(true);
    }
  });

  it("⚠️ every banded card CLIPS, or the band's corners escape the card radius", () => {
    for (const sel of [".os-tasks", ".os-actv"]) {
      expect(blk2(sel), `${sel} must clip`).toContain("overflow: hidden");
    }
  });

  /* ⚠️ RETARGETED (stage 3): this held the chart body's padding (`.os-lbody`, v22's `10px 22px 4px`) and
     the legend's place beside it. Both are retired with the band; what survives is their absence. */
  it("the chart has no band, no body wrapper and no legend", () => {
    const chart = readFileSync(resolve(__dirname, "./OneScreenChart.tsx"), "utf8");
    expect(chart).not.toContain('className="os-lbody"');
    expect(chart).not.toContain('className="os-bandkey"');
    expect(bare).not.toMatch(/\.os-bandkey\s*\{/);
  });
});
