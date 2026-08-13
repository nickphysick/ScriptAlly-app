/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre · fix pack 1 — the walkthrough corrections (ref design-refs/101-rest-corrections.html).
 *
 * ⚠️ SEVERAL OF THE SIX WERE ALREADY FIXED BY PACK B, and the cases for those are locks on work that
 * landed rather than on work this pack did — kept so the verification is recorded in one place
 * instead of inferred from a silent suite.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const css = read("../components/shell/f12.css");
const queries = read("../components/Queries.tsx");
const code = queries.replace(/\{?\/\*[\s\S]*?\*\/\}?/g, "").replace(/^\s*\/\/.*$/gm, "");
const rule = (sel: string): string => {
  const i = css.indexOf("\n" + sel + " {");
  return i < 0 ? "" : css.slice(i, css.indexOf("}", i) + 1);
};

describe("§1 · the list finishes becoming furniture", () => {
  /**
   * ⚠️ THE FADE HAD ALREADY STOPPED RENDERING, AND ITS MACHINERY HAD NOT. `listFade` was recomputed
   * on every scroll, every resize and every ResizeObserver burst — rAF-throttled, with a timeout
   * fallback, an observer on two elements and a loop guard — and read by nothing at all.
   *
   * ⚠️ AND IT MUST NOT COME BACK. A fade at the foot claims there is more below it; directly beneath
   * sits a foot stating "Showing 24 of 24". The two contradict each other on one screen.
   */
  it("no fade, and none of the machinery that drove it", () => {
    for (const dead of ["listFade", "recomputeListFades", "scheduleListFades"]) {
      expect(code, `${dead} survives — a mechanism driving no pixels`).not.toContain(dead);
    }
    const rows = rule(".f12-rows");
    expect(rows, "the rows container is missing").not.toBe("");
    for (const p of ["mask-image", "-webkit-mask", "linear-gradient"]) {
      expect(rows, `the fade came back as ${p}`).not.toContain(p);
    }
  });

  /* It runs flush from head to foot: the seam is the only drawn line between the two columns. */
  it("the container has no radius and no border but the seam", () => {
    const list = rule(".f12-list");
    expect(list, "the column took a radius — it is furniture, not a card").not.toContain("border-radius");
    expect(list, "the seam went").toContain("border-right: 1px solid var(--hairline)");
    expect(list, "a second edge appeared").not.toMatch(/border-(top|bottom|left):/);
  });
});
