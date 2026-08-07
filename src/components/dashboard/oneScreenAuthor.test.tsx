/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks for the author tile (v16 §2). The tile MOVED out of the rail into the main column's
 * fixed 302px row, so its locks moved here with it.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { UserPlan } from "../../types";
import { authorBandLine, OneScreenAuthor } from "./OneScreenAuthor";

const css = readFileSync(resolve(__dirname, "./oneScreen.css"), "utf8");
const cssRules = css.replace(/\/\*[\s\S]*?\*\//g, "");
/* ⚠️ the source is read COMMENT-STRIPPED for every absence check — the tombstone trap: a guard
   that greps for a word passes or fails on the comment recording the retirement. */
const src = readFileSync(resolve(__dirname, "./OneScreenAuthor.tsx"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

const rule = (sel: string) => {
  const i = cssRules.indexOf(`${sel} {`);
  expect(i, `${sel} must exist`).toBeGreaterThan(-1);
  return cssRules.slice(i, cssRules.indexOf("}", i));
};

const ms = (over: Record<string, unknown> = {}) => ({
  id: "m1", title: "Murphy's Day Out", ageCategory: "Young Adult", genre: "Thriller", wordCount: 50000, ...over,
}) as any;

const render = (manuscripts: any[] = [ms()]) => renderToStaticMarkup(
  <OneScreenAuthor
    loading={false} manuscripts={manuscripts}
    currentUser={{ id: "u", name: "Michael Li", plan: UserPlan.FREE } as any}
    activeManuscript={manuscripts[0] ?? null} onNavigate={() => {}}
  />,
);

describe("§2 · the band line", () => {
  it("counts manuscripts, and says so in words — never a bare number at one", () => {
    expect(authorBandLine(0)).toBe("No manuscript yet");
    expect(authorBandLine(1)).toBe("Querying one manuscript");
    expect(authorBandLine(4)).toBe("Querying 4 manuscripts");
  });

  /* ⚠️ THE WEEK NUMBER IS RETIRED FROM THIS TILE. It was a second tenure reading beside the
     header's own, measured from a different anchor — the two could disagree on screen. */
  it("no week count, and none reachable: the derivation is not even imported", () => {
    expect(render()).toContain("Querying one manuscript");
    expect(src).not.toContain("weekOfQuerying");
    expect(src).not.toContain("of querying");
    expect(src).not.toContain("Day one");
  });
});

describe("§2 · the tile", () => {
  it("the shelf carries the house mark on a plate — not a drawn spine with 6.5px type", () => {
    const html = render();
    expect(html).toContain("os-msicon");
    expect(html).toContain("manuscript-icon");
    expect(html).not.toContain("os-cover");
    expect(cssRules).not.toContain(".os-ct");
  });

  it("renders the manuscript, both genre pills and the word count", () => {
    const html = render();
    expect(html).toContain("Murphy&#x27;s Day Out");
    expect(html).toContain("Young Adult");
    expect(html).toContain("Thriller");
    expect(html).toContain("50,000 words");
  });

  /* the empty state keeps the CENTRED COMPOSITION — a ghosted plate above the invitation, not a
     bare dashed box, so the tile reads the same shape whether or not there is a manuscript */
  it("no manuscript → the invitation over a ghosted plate", () => {
    const html = render([]);
    expect(html).toContain("os-shelf-add");
    expect(html).toContain("+ Add your manuscript");
    expect(html).toContain("No manuscript yet");
    expect(html).toContain("os-msicon ghost");
  });
});

describe("§2 · the CSS the tile rests on", () => {
  /* ⚠️ THE BODY CENTRES ITS CONTENT — this is the dead-space fix, and it replaces the old
     "the shelf fills" rule. Filling made the shelf as tall as the leftover space and pushed its
     contents apart; centring keeps them together at ANY tile height. */
  it("⚠️ the body CENTRES rather than fills — no gap can open at any height", () => {
    const body = rule(".os-aut-body");
    expect(body).toContain("flex: 1");
    expect(body).toContain("min-height: 0");
    expect(body).toContain("justify-content: center");
    expect(body).toContain("align-items: center");
    expect(rule(".os-shelf")).toContain("justify-content: center");
  });

  /* ⚠️ A REAL CLIPPING CONTAINER, never an overlay ::before border (MountCard canon) — it is
     what lets the sage band meet the burgundy line with no seam. */
  it("⚠️ the frame CLIPS: a child element with overflow:hidden, not a pseudo-element border", () => {
    const f = rule(".os-aut-frame");
    expect(f).toContain("overflow: hidden");
    expect(f).toContain("border: 1px solid #7c3a2a");
    expect(rule(".os-aut")).toContain("padding: 6px"); // the parchment rim
    expect(cssRules).not.toMatch(/\.os-aut(-frame)?::before/);
  });

  it("the band is FLAT sage — no gradient", () => {
    const band = rule(".os-aut-band");
    expect(band).toContain("background: #d7ddd5");
    expect(band).not.toContain("gradient");
  });

  /* ⚠️ these undo THIS FILE'S OWN long-content guards, written when the tile was in the rail. */
  it("the title wraps to two lines and the pills stack — the nowrap guards are lifted", () => {
    const bt = rule(".os-bt");
    expect(bt).toContain("-webkit-line-clamp: 2");
    expect(bt).toContain("white-space: normal");
    expect(bt).not.toContain("white-space: nowrap");
    expect(rule(".os-genres")).toContain("flex-wrap: wrap");
    const g = rule(".os-g");
    expect(g).toContain("max-width: none");
    expect(g).not.toContain("text-overflow");
  });

  /* ⚠️ THE WRAPPER IS LOAD-BEARING, and its absence is silent. `-webkit-line-clamp` requires
     `display:-webkit-box`, and a FLEX ITEM's display is blockified — as a direct child of the
     shelf the title computed to `flow-root`, the clamp died and it collapsed to ZERO HEIGHT with
     the title simply absent from the tile. Browser-measured. The ref wraps it for this reason. */
  it("⚠️ the title is wrapped so it is not a flex item — the clamp dies otherwise", () => {
    expect(render()).toContain('class="os-btw"');
    expect(rule(".os-bt")).toContain("-webkit-box");
    expect(rule(".os-bt")).toContain("-webkit-line-clamp: 2");
  });

  /* ⚠️ the ref's tile is 436px square and this one is 302 — its 96px plate and 20px gaps overflow
     here, measured, with the word count pushed clean out of the tile */
  it("⚠️ the plate is scaled AND yields further when a long title needs the room", () => {
    const p = rule(".os-msicon");
    expect(p).toContain("flex: 0 1 72px");   // scaled from the ref's 96 for a 302px tile
    expect(p).toContain("aspect-ratio: 1");  // stays square as it shrinks
    expect(p).toContain("min-height: 50px"); // below this the mark stops reading
  });

  it("hovering the shelf tips the mark", () => {
    expect(cssRules).toMatch(/\.os-shelf:hover \.os-msicon \{[^}]*rotate\(-2deg\)/);
  });
});
