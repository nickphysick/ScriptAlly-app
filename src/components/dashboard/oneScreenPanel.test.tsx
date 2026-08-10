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
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { OneScreenPanel } from "./OneScreenPanel";

const html = (el: React.ReactElement) => renderToStaticMarkup(el);

describe("OneScreenPanel — the shell the four containers had", () => {
  it("emits `os-card os-lift {variant}` in that order", () => {
    expect(html(<OneScreenPanel variant="os-tasks" />)).toContain('class="os-card os-lift os-tasks"');
    expect(html(<OneScreenPanel variant="os-lead" />)).toContain('class="os-card os-lift os-lead"');
    expect(html(<OneScreenPanel variant="os-actv" />)).toContain('class="os-card os-lift os-actv"');
  });

  it("⚠️ a multi-word variant survives intact — Goals is `os-goal stowable`", () => {
    // the rail's collapse targets `.stowable`; losing it would stop the panel collapsing at all
    expect(html(<OneScreenPanel variant="os-goal stowable" />))
      .toContain('class="os-card os-lift os-goal stowable"');
  });

  it("appends ` isload` exactly as the hand-rolled shells did", () => {
    expect(html(<OneScreenPanel variant="os-tasks" loading />))
      .toContain('class="os-card os-lift os-tasks isload"');
  });

  it("renders the skeleton ONLY while loading, and only when bars are given", () => {
    expect(html(<OneScreenPanel variant="os-tasks" loading skel={["h", ""]} />)).toContain("os-skel");
    expect(html(<OneScreenPanel variant="os-tasks" skel={["h", ""]} />)).not.toContain("os-skel");
    expect(html(<OneScreenPanel variant="os-tasks" loading />)).not.toContain("os-skel");
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
describe("the container rim is an overlay, not a border", () => {
  const css = readFileSync(resolve(__dirname, "./oneScreen.css"), "utf8");
  const bare = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const blk = (sel: string) => {
    const i = bare.indexOf(`${sel} {`);
    expect(i, `${sel} must exist`).toBeGreaterThan(-1);
    return bare.slice(i, bare.indexOf("}", i));
  };

  it("the rim is drawn by ::after, above descendants", () => {
    const r = blk(".os-card::after");
    expect(r).toContain("position: absolute");
    expect(r).toContain("inset: 0");
    expect(r).toContain("box-shadow: inset 0 0 0 1px");
    expect(r).toContain("border-radius: inherit"); // or the rim squares off the corners
  });

  it("⚠️ the overlay never eats a click meant for the card", () => {
    expect(blk(".os-card::after")).toContain("pointer-events: none");
  });

  it("⚠️ the card is the positioning context — without it the overlay escapes the card", () => {
    expect(blk(".os-card")).toContain("position: relative");
  });

  it("⚠️ THE RING IS THE ONLY RIM — no border alongside it, or one hairline has two owners", () => {
    /* An earlier pass kept a border "for geometry". That made the next retune of the rim token a
       two-place edit, and the second place is the one that gets missed. Measured cost of dropping
       it: card size unchanged, contents 1px further out. */
    expect(blk(".os-card")).not.toMatch(/(^|;|\s)border:\s*[\d.]+px/);
  });

  it("⚠️ the rim is NOT a bare inset shadow on the element — that paints beneath children", () => {
    // the whole fault: an opaque band child covers anything painted on the element's own layer
    const card = blk(".os-card");
    expect(card).not.toContain("box-shadow: inset");
  });

  it("⚠️ NO TRANSFORM ON A CARD HOVER — the column clips, and the lifted 2px takes the rim with it", () => {
    /* `.os-colM`/`.os-colR` are overflow:hidden and the cards sit flush to the top of the column,
       so a lift pushes the card's top edge — ring included — past the clip. This asserts across
       EVERY `.os-card...:hover` rule in the sheet, because the bug was a SECOND such rule 870
       lines below the first: reading only the first is what produced a wrong diagnosis. */
    const rules = bare.match(/\.os-card[^{}]*:hover\s*\{[^}]*\}/g) ?? [];
    expect(rules.length).toBeGreaterThan(0);
    for (const r of rules) {
      if (r.includes("::after")) continue; // the ring's own hover is a shadow swap, not a move
      /* ⚠️ `transform: none` is a GUARD, not a lift — the counters card states it so a future
         `os-lift` cannot quietly re-arm a movement. Read the VALUE rather than lookahead-ing past
         the colon, which backtracks and matches the guard itself. */
      for (const [, value] of r.matchAll(/transform:\s*([^;}]+)/g)) {
        expect(value.trim(), `a card hover must not move:\n${r}`).toBe("none");
      }
    }
  });

  it("hover transitions the PSEUDO-ELEMENT's shadow, not the container's rim", () => {
    expect(bare).toContain(".os-card.os-lift:hover::after");
    expect(blk(".os-card.os-lift:hover")).not.toContain("border-color");
  });

  it("hover warms the rim and moves nothing — no transform on a container", () => {
    expect(bare).toContain(".os-card.os-lift:hover::after");
    expect(blk(".os-card.os-lift:hover")).not.toContain("transform");
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
  const pad = (sel: string) => {
    const i = bare.indexOf(`${sel} {`);
    expect(i, `${sel} must exist`).toBeGreaterThan(-1);
    return /padding:\s*([^;]+)/.exec(bare.slice(i, bare.indexOf("}", i)))?.[1].trim();
  };

  it("⚠️ the sage and pink bands share their PADDING — colour differs by purpose, geometry does not", () => {
    expect(pad(".os-th2")).toBe(pad(".os-ahead"));
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

  it("⚠️ the SLIDER gives before the title does at a narrow width", () => {
    // without this the control cluster keeps its full width and ellipses the title at 1024
    expect(bare).toMatch(/\.os-ahead \.os-rangeslider\s*\{[^}]*clamp\(/);
    expect(bare).toMatch(/\.os-ahead \.os-ctrls\s*\{[^}]*min-width:\s*0/);
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

  it("⚠️ `Goal met` survives — the at-or-beyond-target state is not what was rejected", () => {
    const lib = readFileSync(resolve(__dirname, "../../lib/oneScreen.ts"), "utf8");
    expect(lib).toContain('"Goal met"');
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

  it("⚠️ the height is DECLARED and border-box — not left to the contents", () => {
    const m = /\.os-ahead,\s*\.os-th2\s*\{([^}]*)\}/.exec(bare);
    expect(m, "the two bands must share ONE geometry rule").not.toBeNull();
    expect(m![1]).toContain("height: 51px");
    expect(m![1]).toContain("box-sizing: border-box");
    expect(m![1]).toContain("padding: 0 16px");
  });

  it("⚠️ neither band re-declares its own padding — that is how they drifted apart before", () => {
    for (const sel of [".os-ahead {", ".os-th2 {"]) {
      const i = bare.indexOf(sel);
      expect(bare.slice(i, bare.indexOf("}", i)), sel).not.toMatch(/padding:/);
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

  it("⚠️ the controls read AGAINST sage — parchment fill and a green edge, as a pair", () => {
    expect(bare).toMatch(/\.os-ahead \.os-freqsel select\s*\{[^}]*#fffdf9/);
    expect(bare).toMatch(/\.os-ahead \.os-freqsel select\s*\{[^}]*#bcc7b9/);
    expect(bare).toMatch(/slider-runnable-track[\s\S]{0,200}#bcc7b9/);
    expect(bare).toMatch(/slider-thumb[\s\S]{0,160}#7c3a2a/); // burgundy thumb…
    expect(bare).toMatch(/slider-thumb[\s\S]{0,160}#fffdf9/); // …with its white ring
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
    const i = bare.indexOf(".os-colM, .os-colR {");
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

  it("the chart's padding lives in its body instead", () => {
    expect(blk2(".os-lbody")).toMatch(/padding:\s*12px 18px 10px/);
  });
});
