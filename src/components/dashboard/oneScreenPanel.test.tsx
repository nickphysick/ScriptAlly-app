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
    expect(grouped![1]).toContain("min-height: 51px");
    expect(grouped![1]).toContain("box-sizing: border-box");
    /* and neither may state a competing padding elsewhere — see the base-rule case below */
  });

  /* ⚠️ ONE EXCEPTION, SCOPED AND NAMED — the chart's band (refdiff pass, Phase 5). Measured in the
     ref: to-do 50.2, activity 50.2, chart 115.3, because the chart's header carries a stat readout
     AND the control cluster on two rows. Holding it to the shared 51 made the whole card 52px
     shorter than the ref's and moved every card in the middle column. The exception is a descendant
     selector, so the shared rule is untouched and a THIRD band cannot quietly join it. */
  /* ⚠️ RETARGETED, AND THE EXCEPTION IS SMALLER THAN IT WAS (v22). This asserted that the chart's
     band overrode the shared band's stated HEIGHT. It no longer does, and not because the exception
     was loosened — because the shared band became faithful to the ref, which states no height
     either. Three declarations dropped out of the override the moment that landed. What is left,
     and what this case now asserts, is the one way the chart's band really does differ: it holds two
     rows below the breakpoint and one above it. */
  it("⚠️ the chart's band is the one that WRAPS, and the wrap is scoped rather than a loosened default", () => {
    const shared = /(?:^|\n)\.os-ahead,\s*\.os-th2\s*\{([^}]*)\}/m.exec(bare)![1];
    expect(shared).toContain("min-height: 51px");     // the floor all three share
    expect(shared).not.toMatch(/flex-wrap:\s*wrap/); // and none of them wraps by default
    const lead = /\.os-lead > \.os-ahead\s*\{([^}]*)\}/.exec(bare);
    expect(lead, "the chart's band override must exist").not.toBeNull();
    /* ⚠️ `nowrap` AT THE BASE AND THE STACK IN ITS OWN REGIME (ref v16, Phase 5) — the ref's `.hd`
       is `flex-wrap: nowrap` and its ≤1700 block turns wrapping on. Both halves are asserted,
       because a base that wraps puts the break wherever the contents run out of room, which is a
       different place at every width and inside the control cluster at some of them. */
    expect(lead![1]).toContain("flex-wrap: nowrap");
    expect(bare).toMatch(/max-width:\s*1699px[\s\S]{0,400}?\.os-lead > \.os-ahead\s*\{[^}]*flex-wrap:\s*wrap/);
    /* ⚠️ AND THE EXCEPTION MAY NOT SPREAD — ANCHORED, because it did not used to be. This forbade
       `height: auto` on `.os-th2` with a bare `\.os-th2\s*\{`, which also matches the TAIL of
       `.os-ahead, .os-th2 {` — so the moment the shared rule legitimately took `height: auto` the
       lock reported the sage band as having stolen the chart's exception, about a declaration the
       two bands share by design. A selector in a source lock is anchored at a line start or it
       matches every rule that ends with it. The claim is now the wrap, which is the real exception. */
    expect(bare).not.toMatch(/(?:^|\n)\.os-th2\s*\{[^}]*flex-wrap:\s*wrap/);
  });

  it("Active queries wears the shared band, not a header of its own", () => {
    const chart = readFileSync(resolve(__dirname, "./OneScreenChart.tsx"), "utf8");
    expect(chart).toContain('<div className="os-ahead">');
    expect(chart).not.toContain('className="os-lh"');
  });

  it("⚠️ the retired chart header is GONE, not merely unused", () => {
    // a dormant `.os-lh` is a second treatment waiting to be reattached by the next reader
    expect(bare).not.toMatch(/\.os-lh\s*\{/);
    expect(bare).not.toMatch(/\.os-ll\s*\{/);
  });

  /* ⚠️ RETARGETED (dashboard redesign, Phase 4). The SLIDER is replaced by the BRUSH, so the
     `clamp()` that let it give ground before the title did has no subject. The law it stood for is
     unchanged and still worth holding — the control cluster must yield before the card's name is
     ellipsed — so it is asserted where it now lives: the brush is a fixed, deliberately modest
     width and the cluster still carries `min-width: 0` so it, rather than the title, is what
     shrinks. */
  it("⚠️ the CONTROLS give before the title does at a narrow width", () => {
    expect(bare).toMatch(/\.os-ahead \.os-ctrls\s*\{[^}]*min-width:\s*0/);
    /* ⚠️ THE FIXED WIDTH IS THE THUMBNAIL'S, NOT THE PILL'S. The brush is a capsule around a
       230px picture and a label, so the pill sizes to its contents while `.os-bw` is what states
       a width — asserting it on the wrapper would pass on a pill that stretched the band. */
    expect(cssRule(bare, ".os-bw")).toMatch(/width:\s*\d+px/);
    expect(cssRule(bare, ".os-brush")).toContain("flex: none");
    /* and the retired slider must not survive its replacement — an added control leaves the
       original reachable; a swapped one does not */
    expect(cssRuleCount(bare, ".os-rangeslider")).toBe(0);
    expect(cssRuleCount(bare, ".os-rangecap")).toBe(0);
  });

  it("the controls are IN the band — no separate control row was introduced", () => {
    const chart = readFileSync(resolve(__dirname, "./OneScreenChart.tsx"), "utf8");
    const open = chart.indexOf('<div className="os-ahead">');
    const band = chart.slice(open, chart.indexOf("</div>", chart.indexOf("os-rangelbl", open)));
    expect(band).toContain("os-ctrls");
    expect(bare).not.toMatch(/\.os-ctrlrow\s*\{/); // the 45px row the preview measured and rejected
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
    expect(m![1]).toContain("min-height: 51px");
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

  it("⚠️ the figure is IN the band, and the loose wrapper beneath is gone", () => {
    const chart = readFileSync(resolve(__dirname, "./OneScreenChart.tsx"), "utf8");
    const bandOpen = chart.indexOf('<div className="os-ahead">');
    const band = chart.slice(bandOpen, chart.indexOf("</div>", chart.indexOf("os-rangelbl", bandOpen)));
    expect(band).toContain("os-n");
    expect(chart).not.toContain('className="os-fig"'); // nothing floats beneath the header
    expect(bare).not.toMatch(/\.os-fig\s*\{/);
  });

  it("⚠️ the card has no padding — the band runs edge to edge and the BODY is padded", () => {
    expect(bare).toMatch(/\.os-lbody\s*\{[^}]*padding:/);
    const i = bare.indexOf(".os-card {");
    expect(bare.slice(i, bare.indexOf("}", i))).not.toMatch(/padding:/);
  });

  /* ⚠️ RETARGETED TWICE. First (P3) the slider gained a parchment CAPSULE so it could be read
     against the sage band. The band is gone (Phase 2) and the slider with it (Phase 4), so neither
     the capsule nor the "against sage" reasoning has a subject. The frequency select keeps its own
     pair, because it is still a control on a card and still needs an edge.

     ⚠️ AND THE BRUSH IS LEGIBLE BY BEING A PICTURE, which is the point of replacing the slider: the
     track's travelled fill existed to say where you were on an abstract scale, and a thumbnail of
     your own record with the excluded span shaded says it without a scale at all. */
  it("⚠️ the controls carry their own edge, and the brush carries a picture", () => {
    expect(bare).toMatch(/\.os-ahead \.os-freqsel select\s*\{[^}]*#fffdf9/);
    expect(bare).toMatch(/\.os-ahead \.os-freqsel select\s*\{[^}]*#bcc7b9/);
    /* ⚠️ THE EXCLUDED SPAN IS SHADED, NEVER HIDDEN — the reader can see what they are leaving out,
       which is the entire reason a brush beats a slider. It is card paper at 62% (ref `.shade`),
       not a grey and not opaque; an opaque mask would hide the history it exists to show. */
    const shade = cssRule(bare, ".os-bshade");
    expect(shade).toMatch(/opacity:\s*0?\.\d+/);
    expect(shade).toContain("#fdfbf7");
    /* ⚠️ THE HANDLE IS THE SELECTION'S LEFT EDGE — a rule with a grip on it, drawn in CSS on
       `.os-bwin`, because the native thumb cannot carry a rule AND a grip. The native thumb is
       therefore a transparent hit area, and asserting a colour on it now would be asserting the
       absence of the drawing. */
    expect(cssRule(bare, ".os-bwin")).toContain("border-left: 2px solid #1c130f");
    expect(bare).toMatch(/\.os-bwin::before\s*\{[^}]*border:\s*1\.5px solid #1c130f/);

    /* ⚠️ FIREFOX IGNORES -webkit- PSEUDO-ELEMENTS ENTIRELY — without these it renders the browser
       default, a blue OS slider laid over the thumbnail. The law is unchanged; the LIST is one
       shorter, because `::-moz-range-progress` styled the TRAVELLED FILL and the brush has no
       track fill to travel — the shaded span is drawn in the SVG beneath, where a picture belongs.
       Asserting it here would demand a rule for a part this control does not have. */
    expect(bare).toContain("::-moz-range-track");
    expect(bare).toContain("::-moz-range-thumb");
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

  it("the allowance is a token, applied as equal padding and negative margin", () => {
    expect(bare).toContain("--os-bleed: 10px");
    expect(col).toContain("padding: var(--os-bleed)");
    expect(col).toContain("margin: calc(var(--os-bleed) * -1)");
  });

  it("⚠️ `content-box` IS REQUIRED — border-box eats the padding and the margin then shifts content", () => {
    expect(col).toContain("box-sizing: content-box");
  });

  it("the columns still clip — the bleed widens the clip, it does not remove it", () => {
    expect(col).toContain("overflow: hidden");
  });
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

  it("⚠️ every banded card carries NO padding — the padding belongs to its body", () => {
    for (const sel of [".os-lead", ".os-tasks", ".os-actv"]) {
      const b = blk2(sel);
      const p = /padding:\s*([^;]+)/.exec(b)?.[1]?.trim();
      expect(p === undefined || p === "0", `${sel} padding is "${p}" — it would inset the band`).toBe(true);
    }
  });

  it("⚠️ every banded card CLIPS, or the band's corners escape the card radius", () => {
    for (const sel of [".os-lead", ".os-tasks", ".os-actv"]) {
      expect(blk2(sel), `${sel} must clip`).toContain("overflow: hidden");
    }
  });

  /* ⚠️ RETARGETED TO v22's VALUE AND TO THE STRUCTURE UNDER IT. The comment quoted
     `.chart{padding:14px 20px 6px}` from an earlier ref; v22 says `10px 22px 4px`, and the legend
     is a SIBLING of the chart rather than a child of it. While it was a child this padding had to
     stand in for two elements' gutters at once and the plot took whatever the legend left — 291px
     against the ref's 308.4, with no padding value that could fix it. */
  /* ⚠️ THE SIBLING HALF OF THIS CASE RETIRED WITH THE LEGEND (v26, Phase 5). It asserted that the
     legend sat OUTSIDE the chart body — which mattered while there was a legend, because nested it
     made the body's padding stand in for two elements' gutters and the plot took whatever was left.
     There is no legend now, so the claim that survives is the padding's, and the absence. */
  it("the chart's padding lives in its body, and there is no legend inside it", () => {
    expect(blk2(".os-lbody")).toMatch(/padding:\s*10px 22px 4px/);
    const chart = readFileSync(resolve(__dirname, "./OneScreenChart.tsx"), "utf8");
    expect(chart.indexOf('<div className="os-lbody">'), "the chart body must exist").toBeGreaterThan(-1);
    expect(chart).not.toContain('className="os-bandkey"');
  });
});
