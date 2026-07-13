/**
 * Locks for the grand masthead (ref grand-masthead-fullpage-v1.html): the responsive title
 * tokens + step, the ChromeSlab `grand` variant, and both hubs opting into it. Artefact-level —
 * jsdom can't compute the 54→40 step (viewport media queries aren't evaluated), so these assert
 * the source contract; the real step is a browser eyeball.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(resolve(__dirname, "../index.css"), "utf8");
const slab = readFileSync(resolve(__dirname, "../components/shell/ChromeSlab.tsx"), "utf8");
const queries = readFileSync(resolve(__dirname, "../components/Queries.tsx"), "utf8");

describe("masthead tokens — the 54→40 step", () => {
  it("defines the grand title at 54px and steps to 40px under 820px viewport height", () => {
    expect(css).toContain("--hub-mast-title: 54px");
    expect(css).toMatch(/@media \(max-height: 819px\)[^}]*--hub-mast-title: 40px/s);
  });

  it("the masthead padding is a token (tunable) and steps with the title", () => {
    expect(css).toContain("--hub-mast-pad: 22px 30px 20px");
    expect(css).toMatch(/@media \(max-height: 819px\)[^}]*--hub-mast-pad:/s);
  });
});

describe("ChromeSlab — the grand variant", () => {
  it("has an opt-in grand prop rendering the masthead block", () => {
    expect(slab).toContain("grand?: boolean");
    expect(slab).toContain("sa-slab-grand");
    expect(slab).toContain("if (grand)");
  });

  it("the grand title uses the masthead size token + the theme heading ink", () => {
    expect(slab).toContain("var(--hub-mast-title, 54px)");
    expect(slab).toContain("var(--hub-head");
    expect(slab).toContain("var(--hub-mast-pad");
  });

  it("the compact slab (default) keeps the 25px two-row header for the other pages", () => {
    expect(slab).toContain("fontSize: 25");
  });
});

describe("Queries hub — the grand masthead is RETIRED (F12 shell, overnight run)", () => {
  it("Queries mounts no ChromeSlab; the F12 header (CrumbStrip via F12Page) carries the page name", () => {
    // The breadcrumb + list footer carry what the masthead + pulse line used to say.
    expect(queries.includes("<ChromeSlab")).toBe(false);
    expect(queries).toContain("<F12Page");
  });
});
