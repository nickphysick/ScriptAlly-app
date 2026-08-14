/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Fix pack 3 §1 — no fade on the Query Centre.
 *
 * ⚠️ THIS FILE ASSERTS AGAINST THE MECHANISMS, NOT AGAINST THE ELEMENTS, AND THAT DISTINCTION IS
 * THE WHOLE REASON IT EXISTS. A previous lock asserted that the list scroller carried no gradient
 * and no mask. That was TRUE, it passed honestly, and the fade was still on the page — because the
 * declaration was never on the element being asked about. Naming the containers is how a fade
 * survives a test written to remove it.
 *
 * There turned out to be TWO mechanisms, not one:
 *
 *   1. `EdgeFadeScroll` — a relative frame with two absolute 28px gradient overlays. It wrapped all
 *      three reading-pane cards (Tracking, What you sent, Notes).
 *   2. `.wpg-hem` — `WorkspacePageGrid`'s own top and bottom fades, grid items in the scroll row,
 *      driven by the same scroll evaluation as the header. That is the fade at the foot of the page.
 *
 * ⚠️ BOTH ARE DELIBERATE ELSEWHERE AND NEITHER IS DELETED. `EdgeFadeScroll` still serves the Agents
 * list and two dashboard surfaces; `.wpg-hem` still serves every non-fill page in the shell. What
 * changed is that this page opts out of both — so these cases are written to fail if the OPT-OUT is
 * undone, not if the mechanism exists.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WorkspacePageGrid } from "../components/shell/WorkspacePageGrid";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const strip = (s: string) => s.replace(/\{?\/\*[\s\S]*?\*\/\}?/g, "").replace(/^\s*\/\/.*$/gm, "");
const queries = strip(read("../components/Queries.tsx"));
const paneScroll = strip(read("../components/queries/PaneScroll.tsx"));
const css = read("../components/shell/f12.css").replace(/\/\*[\s\S]*?\*\//g, "");

describe("§1 · mechanism 1 — the reading pane's cards do not fade", () => {
  /**
   * ⚠️ THE PAGE MUST NOT REACH THE FADE COMPONENT AT ALL. Asserting "no gradient in Queries.tsx"
   * would pass while `EdgeFadeScroll` supplied one from its own file — which is exactly how the
   * previous lock passed. The import is the mechanism's only route onto this page, so the import is
   * what is asserted.
   */
  it("the page does not use the fade scroller, by any route", () => {
    expect(queries, "EdgeFadeScroll is back on the Query Centre").not.toContain("EdgeFadeScroll");
    expect(queries, "the cards lost their scroller entirely").toContain("PaneScroll");
  });

  /* ⚠️ AND ITS REPLACEMENT MUST NOT GROW ONE. `PaneScroll` is the layout contract without the
     decoration; a gradient, a mask or an opacity-toggled overlay appearing here would put the fade
     back one level down, where the case above cannot see it. */
  it("its replacement declares no fade of its own", () => {
    for (const p of ["linear-gradient", "mask", "radial-gradient"]) {
      expect(paneScroll, `PaneScroll grew a ${p}`).not.toContain(p);
    }
  });

  /* ⚠️ THE SHARED COMPONENT IS NOT TOUCHED. If a future pass "fixes" the fade by gutting
     EdgeFadeScroll, the Agents list and two dashboard surfaces lose a signal they genuinely
     need. This case states that the opt-out is local. */
  it("the shared fade scroller still exists for the surfaces that want it", () => {
    const shared = read("../components/EdgeFadeScroll.tsx");
    expect(shared, "EdgeFadeScroll was gutted instead of opted out of").toContain("linear-gradient");
  });
});

describe("§1 · mechanism 2 — the page's own foot does not fade", () => {
  /**
   * ⚠️ ASSERTED AGAINST RENDERED OUTPUT, NOT SOURCE. The hems are two divs behind a condition; a
   * source test would be reading the condition rather than its result, and would pass on a
   * condition that never evaluates the way it looks.
   */
  it("a fill page renders no hems, and a normal page still does", () => {
    const fill = renderToStaticMarkup(
      React.createElement(WorkspacePageGrid, { fill: true, plate: null }, "body"),
    );
    const normal = renderToStaticMarkup(
      React.createElement(WorkspacePageGrid, { plate: null }, "body"),
    );
    expect(fill, "the fill page's foot fade came back").not.toContain("wpg-hem");
    expect(normal, "the opt-out escaped onto every page in the shell").toContain("wpg-hem");
  });
});

describe("§1 · mechanism 3 — the list does not fade either", () => {
  /**
   * ⚠️ THE LIST WAS ALREADY CLEAN, AND THIS CASE EXISTS TO KEEP IT THAT WAY. It is the one
   * container the earlier lock did name, and the fade was never there — so what is worth holding is
   * that neither of the two real mechanisms arrives on it later. `Showing 24 of 24` sits directly
   * beneath the list and answers the question a fade would be asking.
   */
  it("no gradient or mask reaches the list's own rules", () => {
    const listRules = css
      .split("\n")
      .filter((l) => /^\.f12-(list|lhead|lfoot|rows)\b/.test(l.trim()))
      .join("\n");
    expect(listRules, "the list's rules vanished — this case is testing nothing")
      .toMatch(/\.f12-list/);
    for (const p of ["linear-gradient", "mask-image", "-webkit-mask"]) {
      expect(listRules, `the list grew a ${p}`).not.toContain(p);
    }
  });
});
