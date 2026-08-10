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
