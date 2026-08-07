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

  it("no manuscript → the ghost add shelf, never an empty plate", () => {
    const html = render([]);
    expect(html).toContain("os-shelf-add");
    expect(html).toContain("+ Add your manuscript");
    expect(html).toContain("No manuscript yet");
    expect(html).not.toContain("os-msicon");
  });
});

describe("§2 · the CSS the tile rests on", () => {
  /* ⚠️ the tile is a FIXED 302px, so the shelf must take the leftover height. Without flex:1 the
     shelf sizes to its content and the tile ends on a blank gap. */
  it("the shelf FILLS: body is a column, shelf is flex 1", () => {
    expect(rule(".os-aut")).toContain("flex-direction: column");
    const body = rule(".os-aut-body");
    expect(body).toContain("flex: 1");
    expect(body).toContain("min-height: 0");
    const shelf = rule(".os-shelf");
    expect(shelf).toContain("flex: 1");
    expect(shelf).toContain("min-height: 0");
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

  it("hovering the shelf tips the mark", () => {
    expect(cssRules).toMatch(/\.os-shelf:hover \.os-msicon \{[^}]*rotate\(-2deg\)/);
  });
});
