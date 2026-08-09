/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks for the author tile — option D, the icon hero (ref author-tile-round2.html).
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { UserPlan } from "../../types";
import { OneScreenAuthor } from "./OneScreenAuthor";

const cssRules = readFileSync(resolve(__dirname, "./oneScreen.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const baseCss = cssRules.replace(/@media[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, "");
const rule = (sel: string) => {
  const out: string[] = [];
  for (let i = baseCss.indexOf(`${sel} {`); i > -1; i = baseCss.indexOf(`${sel} {`, i + 1)) {
    out.push(baseCss.slice(i, baseCss.indexOf("}", i)));
  }
  expect(out.length, `${sel} must exist as a BASE rule`).toBeGreaterThan(0);
  return out.join("\n");
};

const ms = (over: Record<string, unknown> = {}) => ({
  id: "m1", title: "Murphy's Day Out", ageCategory: "Young Adult", genre: "Thriller", wordCount: 50000, ...over,
}) as any;

const render = (manuscripts: any[] = [ms()]) => renderToStaticMarkup(
  <OneScreenAuthor
    loading={false} manuscripts={manuscripts}
    currentUser={{ id: "u", name: "Michael Li", plan: UserPlan.FREE } as any}
    activeManuscript={manuscripts[0] ?? null} onNavigate={() => {}} />,
);

describe("option D · the icon hero", () => {
  it("the manuscript is the hero: plate, title, genres, word count", () => {
    const html = render();
    expect(html).toContain("os-msicon");
    expect(html).toContain("manuscript-icon");
    expect(html).toContain("Murphy&#x27;s Day Out");
    expect(html).toContain("Young Adult");
    expect(html).toContain("Thriller");
    expect(html).toContain("50,000 words");
  });

  it("the byline sits under a rule: 'by' above the name", () => {
    const html = render();
    expect(html).toContain("os-authrule");
    expect(html).toContain("os-by");
    expect(html).toContain(">by<b>Michael Li</b>");
  });

  /* ⚠️ A REAL AFFORDANCE, never a dead badge — it goes where the profile lives. */
  it("⚠️ the + badge is a real button with an accessible name", () => {
    const html = render();
    expect(html).toContain('aria-label="Add a photo"');
    expect(html).toMatch(/<button[^>]*class="os-aut-add"/);
  });

  /* ⚠️ OPTION A IS GONE — frame, band and the header arrangement with it. */
  it("⚠️ no frame, no sage band, no header — and no orphaned CSS for them", () => {
    const html = render();
    for (const gone of ["os-aut-frame", "os-aut-band", "os-aut-who", "os-aut-sub", "os-aut-nm", "os-shelf"]) {
      expect(html, gone).not.toContain(gone);
      expect(cssRules, gone).not.toContain(gone);
    }
  });

  /* the count is already stated by the header counters — it has no home in option D */
  it("the 'Querying n manuscripts' line is dropped, not relocated", () => {
    expect(render()).not.toContain("Querying");
    const src = readFileSync(resolve(__dirname, "./OneScreenAuthor.tsx"), "utf8");
    expect(src).not.toContain("authorBandLine");
  });

  it("no manuscript → the invitation over a ghosted plate, byline intact", () => {
    const html = render([]);
    expect(html).toContain("os-hero-add");
    expect(html).toContain("+ Add your manuscript");
    expect(html).toContain("os-msicon ghost");
    expect(html).toContain("os-by"); // the byline survives a missing manuscript
  });
});

describe("option D · the CSS it rests on", () => {
  /* ⚠️ CENTRED AS A WHOLE — this is the dead-space fix. */
  it("⚠️ the tile centres its single column, vertically and horizontally", () => {
    const a = rule(".os-aut");
    expect(a).toContain("flex-direction: column");
    expect(a).toContain("align-items: center");
    expect(a).toContain("justify-content: center");
    expect(a).toContain("text-align: center");
  });

  it("the hero plate: ~96px square, 18px radius, the ref's soft shadow", () => {
    const p = rule(".os-msicon");
    expect(p).toContain("flex: 0 1 96px");     // scaled from the ref's 136 for a 302px tile
    expect(p).toContain("aspect-ratio: 1");
    expect(p).toContain("border-radius: 18px");
    expect(p).toContain("box-shadow: 0 6px 18px rgba(58, 28, 20, 0.10)");
  });

  it("the title is Playfair 26 with the ref's tracking, clamping at two lines", () => {
    const t = rule(".os-bt");
    expect(t).toContain("font-size: 26px");
    expect(t).toContain("letter-spacing: -0.01em");
    expect(t).toContain("-webkit-line-clamp: 2");
    expect(t).toContain("white-space: normal");
    expect(rule(".os-btw")).toContain("display: block"); // not a flex item — the clamp needs that
  });

  it("the pills wrap; the rule is 56px; the photo is 52px with a 19px badge", () => {
    expect(rule(".os-genres")).toContain("flex-wrap: wrap");
    expect(rule(".os-authrule")).toContain("width: 56px");
    expect(rule(".os-aut-pic")).toContain("width: 52px");
    expect(rule(".os-aut-add")).toContain("width: 19px");
  });
});
