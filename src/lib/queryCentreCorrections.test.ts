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

describe("§2 · rows on one grid", () => {
  /**
   * ⚠️ THE DATES WERE RAGGED BECAUSE THE COLUMN SIZED TO ITS CONTENT. As a flex row `.f12-end` was
   * `flex: none`, so a row reading "30 Jun 2024" pushed its date left of one reading "13 Aug" —
   * browser-measured at two x positions, 600 and 606, in the same list. After: a single 578.
   */
  it("three tracks, the last one fixed", () => {
    const r = rule(".f12-row");
    expect(r, "the row rule is missing").not.toBe("");
    expect(r, "the row went back to flex — the date column would size to its content")
      .toContain("display: grid");
    expect(r).toContain("grid-template-columns: 32px minmax(0, 1fr) var(--f12-datew)");
    expect(css, "the date track's width is not declared").toContain("--f12-datew: 56px");
  });

  /* ⚠️ AN `auto` TRACK COLLAPSES ON AN EM DASH, which puts a dateless row's column somewhere else
     again — the same fault wearing a different hat. Fixed means fixed for both. */
  it("a dateless row keeps the column rather than collapsing it", () => {
    expect(code, "the em dash fallback went").toContain('formatListRowDate(q.dateSent) ?? "—"');
    expect(rule(".f12-row .f12-d2"), "the date hugs instead of filling its track")
      .toContain("width: 100%");
    expect(rule(".f12-row .f12-d2")).toContain("text-align: right");
  });

  /* One row is one height, always — so neither the name nor the agency may wrap. */
  it("name and agency truncate, never wrap", () => {
    for (const sel of [".f12-row .f12-nm", ".f12-row .f12-ag"]) {
      const r = rule(sel);
      expect(r, `${sel} is missing`).not.toBe("");
      expect(r, `${sel} can wrap — the row would change height`).toContain("white-space: nowrap");
      expect(r, `${sel} truncates without an ellipsis`).toContain("text-overflow: ellipsis");
    }
    expect(rule(".f12-row"), "the row's height stopped being fixed").toContain("height: 56px");
  });

  it("hover is a wash; selected lifts to white with a burgundy spine", () => {
    expect(rule(".f12-row:hover")).toContain("background: var(--panel)");
    expect(rule(".f12-row.f12-sel")).toContain("background: var(--white)");
    expect(rule(".f12-row.f12-sel::before"), "the spine went back to ink").toContain("background: var(--burg)");
  });
});
