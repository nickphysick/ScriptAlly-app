/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Create mode · FOCUS MODE (ref design-refs/qdb-create-polish.html §3).
 *
 * While a draft is open everything except the pane and the draft row recedes. The two things
 * that make it a dim and not a scrim: no overlay (the list owns its own scroll and stacking
 * context), and no pointer-events:none (a dimmed row must still run the click-away confirm).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const queries = read("../components/Queries.tsx");
/** Comments stripped: a count of class usages must not include the comment explaining them. */
const queriesCode = queries.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const css = read("../components/shell/f12.css");

describe("focus mode dims without a scrim", () => {
  it("the dim is a state class on the surfaces, not an overlay", () => {
    expect(css).toContain(".qh-focus .qh-dim {");
    expect(queries, "the page root must carry the state").toContain('creating ? " qh-focus" : ""');
    // An overlay would need to sit above the list, which owns its own scroll and stacking context.
    const rule = css.slice(css.indexOf(".qh-focus .qh-dim {"), css.indexOf("}", css.indexOf(".qh-focus .qh-dim {")));
    expect(rule).toContain("opacity: 0.34");
    expect(rule).toContain("saturate");
  });

  it("dimmed areas STAY CLICKABLE — the click-away/discard path runs from a dimmed row", () => {
    const rule = css.slice(css.indexOf(".qh-focus .qh-dim {"), css.indexOf("}", css.indexOf(".qh-focus .qh-dim {")));
    expect(rule, "pointer-events:none would kill the click-away confirm").not.toContain("pointer-events");
    expect(css.slice(css.indexOf(".qh-dim {"), css.indexOf("}", css.indexOf(".qh-dim {"))))
      .not.toContain("pointer-events");
    // and the row's own handler still resolves the draft before selecting
    expect(queries).toContain("onClick={() => (creating ? closeCreate(() => setSelectedQueryId(q.id)) : setSelectedQueryId(q.id))}");
  });

  it("the transition sits on .qh-dim so it eases BOTH ways", () => {
    // Inside .qh-focus it would only animate the dim-in: removing the class removes the
    // transition in the same recalculation, and the way back would snap.
    const base = css.slice(css.indexOf("\n.qh-dim {"), css.indexOf("}", css.indexOf("\n.qh-dim {")));
    expect(base).toContain("transition: opacity 0.22s");
    expect(base).toContain("filter 0.22s");
  });

  it("reduced motion applies the state instantly", () => {
    expect(css).toContain("@media (prefers-reduced-motion: reduce) { .qh-dim { transition: none; } }");
  });

  it("the pane and the DRAFT row are never dimmed", () => {
    expect(queries, "the draft row must not carry qh-dim").not.toMatch(/f12-row f12-draft[^`]*qh-dim/);
    expect(queries, "the reading pane must not carry qh-dim").not.toMatch(/f12-detail[^>]*qh-dim/);
    // masthead · control bar · chips · list head · both list feet · sibling rows
    expect(queriesCode.match(/qh-dim/g)?.length ?? 0).toBe(7);
  });
});

