/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v42 Part G — How it works, one animated infographic: the pack's words exactly, none of v41's
 * five-step guide, four swappable drawings, and a stylesheet whose FINISHED state is every element's own (only the
 * animations hold the start state), so reduced motion shows everything at once. The rendered half (opacity at 1s and
 * 13s, Play again, Escape) is SP42 L7 in tests/e2e/pk42.measure.ts.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { HOW_INTRO, HOW_STATION_AT, HOW_STATIONS, HOW_TITLE } from "../../../lib/packagesV42";
import { HOW_ART, HowArtChart, HowArtEnvelope, HowArtPages, HowArtTag } from "./howArt";

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

describe("v42 G · How it works", () => {
  it("the title, the intro and the four stations are the pack's, exactly", () => {
    expect(HOW_TITLE).toBe("How packages work");
    expect(HOW_INTRO).toBe("A package is simply what you send an agent. Put one together once, use it as often as you like, and we’ll show you which ones get the best response.");
    expect(HOW_STATIONS).toEqual([
      ["Choose what goes in", "Start with the version of your book, as that decides which pages agents see. Then add your query letter, and a synopsis if you like."],
      ["Give it a name", "Call it something you’ll remember, like “US agents”, and pick an icon. Its tile sits at the top of this page."],
      ["Send it with a query", "When you log a query, choose the package. We’ll keep a note of exactly what that agent received, so you don’t have to."],
      ["See what’s working", "Once a few agents have replied, you’ll see which packages get them asking for more pages."],
    ]);
  });
  it("the stations appear in turn, ending by ~12s", () => {
    expect(HOW_STATION_AT).toHaveLength(4);
    expect([...HOW_STATION_AT].sort((a, b) => a - b)).toEqual([...HOW_STATION_AT]);
    expect(HOW_STATION_AT[3] + 0.9).toBeLessThan(12);
  });
  it("each drawing is its own swappable component", () => {
    expect(HOW_ART).toEqual([HowArtPages, HowArtTag, HowArtEnvelope, HowArtChart]);
    for (const Art of HOW_ART) expect(renderToStaticMarkup(React.createElement(Art))).toContain('class="p42-hw-svg"');
  });
  it("none of v41's five-step guide remains on the page", () => {
    const page = strip(readFileSync("src/components/SubmissionPackages.tsx", "utf8"));
    expect(page).toContain("<Pk42HowItWorks");
    expect(page).not.toContain("Pk41HowItWorks");
    const gfx = readFileSync("src/components/packages/v42/Pk42HowItWorks.tsx", "utf8") + readFileSync("src/lib/packagesV42.ts", "utf8");
    for (const old of ["Step 1 of 5", "Set your current batch", "The strip along the bottom of the header"]) expect(gfx).not.toContain(old);
  });
  it("reduced motion shows the finished state: the start state lives only in the keyframes, and every animation is opt-in", () => {
    const css = strip(readFileSync("src/components/packages/v42/pk42.css", "utf8"));
    const g = css.slice(css.indexOf(".p42-hw {"));
    expect(g.length, "the infographic's rules are in pk42.css").toBeGreaterThan(100);
    const outsideKeyframes = g.replace(/@keyframes[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, "");
    expect(outsideKeyframes).not.toMatch(/opacity:\s*0[;\s}]/);
    expect(outsideKeyframes).not.toMatch(/scaleX\(0\)/);
    /* every `animation:` sits inside the no-preference block */
    const np = g.indexOf("@media (prefers-reduced-motion: no-preference)");
    expect(np).toBeGreaterThan(-1);
    const before = g.slice(0, np);
    expect(before).not.toMatch(/animation\s*:/);
  });
});
