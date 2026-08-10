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

  it("⚠️ the BORDER STAYS, for geometry — removing it shifts every card's contents by 1px", () => {
    expect(blk(".os-card")).toMatch(/border:\s*1px solid/);
  });

  it("hover warms the rim and moves nothing — no transform on a container", () => {
    expect(bare).toContain(".os-card.os-lift:hover::after");
    expect(blk(".os-card.os-lift:hover")).not.toContain("transform");
  });
});
