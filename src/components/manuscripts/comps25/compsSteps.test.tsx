/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Comparable titles v27, lock V10's source half: ONE steps component. The empty card and the pop-up
 * both render `CompsSteps`, and no other file in src/ writes the steps' words or their markup.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { CompsSteps, HOW_STEPS, STEPS_HEADING, STEPS_PICK } from "./CompsSteps";

const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(f) ? [p] : [];
});
const SELF = join("src", "components", "manuscripts", "comps25", "compsSteps.test.tsx");
const HOME = join("src", "components", "manuscripts", "comps25", "CompsSteps.tsx");
const files = walk(join(process.cwd(), "src")).map((p) => p.slice(process.cwd().length + 1)).filter((p) => p !== SELF);
const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

describe("V10 · one steps component", () => {
  /* comps v28: the heading is the generic "How it works." (Analytics v24's own steps card writes the same words, by
     design), so it is no longer a fingerprint of this component. The three step headings are comps' own, and stay. */
  it("only CompsSteps.tsx writes the steps' three headings", () => {
    expect(files.length).toBeGreaterThan(400);
    expect(STEPS_HEADING).toBe("How it works.");
    for (const words of HOW_STEPS.map((s) => s.head)) {
      const hits = files.filter((p) => read(p).includes(words));
      expect(hits, `"${words}" is written in ${hits.join(", ")}`).toEqual([HOME]);
    }
  });
  it("only CompsSteps.tsx emits the steps' classes", () => {
    const hits = files.filter((p) => /["'`\s]cv-hsteps(?:-[a-z]+)?["'`\s]/.test(read(p)));
    expect(hits).toEqual([HOME]);
  });
  it("exactly two files mount it: the page (the empty card) and the pop-up", () => {
    const hits = files.filter((p) => /<CompsSteps\b/.test(read(p))).sort();
    expect(hits).toEqual([
      join("src", "components", "manuscripts", "ComparableTitlesPage.tsx"),
      join("src", "components", "manuscripts", "comps25", "CompsHowDialog.tsx"),
    ].sort());
    expect(read(join("src", "components", "manuscripts", "ComparableTitlesPage.tsx")).split("<CompsSteps").length - 1).toBe(1);
  });
  it("the door into the picker is drawn only when a host passes one", () => {
    const bare = renderToStaticMarkup(<CompsSteps headingId="a" />);
    const door = renderToStaticMarkup(<CompsSteps headingId="b" onPick={() => {}} />);
    expect(bare).not.toContain(STEPS_PICK);
    expect(door).toContain(STEPS_PICK);
    expect((bare.match(/data-cv="how-step"/g) ?? []).length).toBe(3);
    /* the same markup either way, less the door */
    expect(door.replace(/<button[^>]*data-cv="how-pick"[^>]*>[^<]*<\/button>/, "").replace('id="b"', "").replace('aria-labelledby="b"', "")).toBe(bare.replace('id="a"', "").replace('aria-labelledby="a"', ""));
  });
});
