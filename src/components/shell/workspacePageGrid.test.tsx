/**
 * WorkspacePageGrid — the chrome-outside-the-scroller contract (amendment 9).
 *
 * ⚠️ THESE LOCK THE MECHANISM, NOT A MEASUREMENT. This repo's tests are `environment: 'node'` — no
 * jsdom, no layout, no IntersectionObserver — so "the chrome stays put" can only be asserted
 * structurally: the chrome rows are SIBLINGS of the scroll row, nothing is sticky, nothing takes a
 * `top`, and the plate learns it should condense from CONTEXT rather than by finding a scroller.
 *
 * ⚠️ THE PRIMITIVE IS INERT AT THIS COMMIT — nothing imports it. That is deliberate sequencing, and
 * the last assertion here pins it: a page converts per commit, and the old path stays alive until
 * the last one is off it, so any stop between commits leaves a working app.
 */
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { WorkspacePageGrid, PlateCondensedContext } from "./WorkspacePageGrid";

const css = readFileSync(resolve(__dirname, "workspacePageGrid.css"), "utf8");
const src = readFileSync(resolve(__dirname, "WorkspacePageGrid.tsx"), "utf8");

/**
 * ⚠️ READ THE RULES, NOT THE PROSE — and this file learned it the hard way on its first run. Both
 * `position: sticky` and `querySelector` appear in the COMMENTS here, explaining what this design
 * deliberately does NOT do; asserting their absence against the raw text failed on the very
 * warnings that exist to prevent them. Every "must not contain" below reads a comment-stripped copy.
 */
const cssRules = css.replace(/\/\*[\s\S]*?\*\//g, "");
const srcCode = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/** ⚠️ EVERY block for a selector, joined — never the first. One rule per selector is the intent
 *  (the stylesheet says so), and this is what fails loudly if that ever stops being true. */
const block = (selector: string): string => {
  const out: string[] = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(cssRules))) {
    if (m[1].split(",").map((x) => x.trim()).includes(selector)) out.push(m[2]);
  }
  return out.join(" ");
};

describe("the three-row grid — chrome outside the scroller", () => {
  it("⚠️ NOTHING IS STICKY AND NOTHING TAKES A `top` — that is the whole point", () => {
    /* The sticky arrangement encoded another element's height as a literal (`calc(56px + gap)`),
       which was silently wrong by 32px on the Tasks family. Siblings of the scroller need no
       offset, so there is no number to get wrong. */
    expect(cssRules, "a sticky position came back into the grid — chrome outside the scroller does not need one, and needing one is the bug").not.toContain("position: sticky");
    /* ⚠️ EXTRACT THE VALUE, DO NOT LOOK AHEAD PAST IT. The first draft was
       `not.toMatch(/top\s*:\s*(?!0)/)` and it flagged `top: 0` — `\s*` backtracks to zero width, so
       the lookahead tested the SPACE rather than the digit and passed. Reading each declaration and
       comparing it says what is meant, and cannot be defeated by backtracking. */
    const tops = [...cssRules.matchAll(/(?:^|[;{\s])top\s*:\s*([^;}]+)/gm)].map((m) => m[1].trim());
    for (const value of tops) {
      expect(value, `a non-zero \`top\` offset appeared (\`top: ${value}\`) — that is another element's height encoded as a literal, the \`calc(100vh - 64px)\` fault`).toBe("0");
    }
    expect(srcCode, "the component reintroduced sticky positioning").not.toContain("sticky");
  });

  it("the scroll row is `minmax(0, 1fr)` — a plain `1fr` grows to its content and never scrolls", () => {
    expect(block(".wpg"), "the grid lost its row template").toContain("grid-template-rows: auto auto minmax(0, 1fr)");
    expect(block(".wpg"), "the grid itself started scrolling — only row 3 may").toContain("overflow: hidden");
    expect(block(".wpg-scroll"), "the scroll row stopped scrolling").toContain("overflow-y: auto");
    expect(block(".wpg-scroll"), "`min-height: 0` went — the row will refuse to shrink below its content and push the frame open").toContain("min-height: 0");
  });

  it("⚠️ EVERY ROW IS PLACED EXPLICITLY — auto-placement breaks the toolbar-less pages", () => {
    /* Without a toolbar, auto-placement puts the scroller in track 2 (an `auto` track), so it sizes
       to its content and never scrolls — on exactly the pages with least to show. */
    expect(block(".wpg-plate")).toContain("grid-row: 1");
    expect(block(".wpg-tools")).toContain("grid-row: 2");
    expect(block(".wpg-scroll")).toContain("grid-row: 3");
  });

  it("the toolbar row has NO container — one hairline, no frame, no fill", () => {
    const t = block(".wpg-tools").replace(/\s+/g, " ");
    expect(t, "the toolbar gained a fill — it is controls and a hairline, not a second plate").not.toMatch(/(^|[;\s])background\s*:/);
    expect(t, "the toolbar gained a shadow").not.toMatch(/(^|[;\s])box-shadow\s*:/);
    expect(t, "the toolbar gained a full border — the one line beneath it is the chrome/content boundary").not.toMatch(/(^|[;\s])border\s*:/);
    expect(t, "the hairline beneath the toolbar went").toContain("border-bottom: 1px solid var(--ws-edge)");
  });

  it("the scroll row carries `scroll-padding-top` — missing throughout before this", () => {
    expect(block(".wpg-scroll")).toContain("scroll-padding-top");
  });

  it("⚠️ the sentinel costs NO layout height", () => {
    const s = block(".wpg-sentinel").replace(/\s+/g, " ");
    expect(s, "the sentinel left absolute positioning — in flow it adds a pixel to every page").toContain("position: absolute");
    expect(s).toContain("height: 1px");
  });

  it("⚠️ the condense is observed at the BOUNDARY, not recomputed on every scroll frame", () => {
    expect(srcCode, "the scroll listener came back — the condense is a boundary event and should be reported as one").not.toContain("addEventListener(\"scroll\"");
    expect(src, "the IntersectionObserver went").toContain("new IntersectionObserver");
    expect(src, "the observer lost its `root` — with the default it watches the VIEWPORT, which is the wrong scrollport entirely").toMatch(/\{\s*root,/);
  });

  it("⚠️ THE PLATE IS TOLD, IT DOES NOT LOOK — no DOM traversal, no class strings", () => {
    /* `closest(grid) → querySelector(scroll)` holds until something inside the scroll row is itself
       a scroller, and then it silently finds the wrong one. Two strings coupling two components
       across the DOM is the hardcoded `top` offset again, just harder to spot. */
    expect(srcCode, "a DOM lookup for the scroller appeared — that is the fragility the context replaces").not.toContain("querySelector");
    expect(srcCode, "a `closest()` traversal appeared").not.toContain("closest(");
    expect(src, "the context is gone — the plate would have to go looking again").toContain("PlateCondensedContext");
  });

  it("⚠️ the context default is `null`, distinguishable from `false`", () => {
    /* `false` would be a plausible default and a plate mounted outside a grid would read it and
       quietly never condense. `null` means "no grid above me", which a consumer can complain about. */
    expect(src).toContain("React.createContext<boolean | null>(null)");
    let seen: boolean | null | undefined;
    const Probe: React.FC = () => { seen = React.useContext(PlateCondensedContext); return null; };
    renderToStaticMarkup(<Probe />);
    expect(seen, "the context no longer defaults to null outside a grid").toBeNull();
  });

  it("renders three rows, and NO toolbar row when there is no toolbar", () => {
    const withBar = renderToStaticMarkup(
      <WorkspacePageGrid plate={<i>plate</i>} toolbar={<i>tools</i>}>body</WorkspacePageGrid>,
    );
    expect(withBar).toContain("wpg-plate");
    expect(withBar).toContain("wpg-tools");
    expect(withBar).toContain("wpg-scroll");
    /* the chrome rows are SIBLINGS of the scroller — the plate must not be inside it */
    expect(withBar.indexOf("wpg-plate")).toBeLessThan(withBar.indexOf("wpg-scroll"));

    const bare = renderToStaticMarkup(<WorkspacePageGrid plate={<i>plate</i>}>body</WorkspacePageGrid>);
    expect(bare, "an empty toolbar row rendered — it would draw its hairline with nothing above it, and reserve space the page does not use").not.toContain("wpg-tools");
  });

  /**
   * ⚠️ THE CONVERSION CENSUS. This started life as "nothing imports it yet" and was updated the
   * moment Contact list converted — deliberately, because that is the point: each page moving is a
   * decision someone records here, not a drift nobody notices.
   *
   * ⚠️ BOTH HALVES MATTER. The converted list proves the new path is live; the UNCONVERTED list
   * proves the old one still is. A half-converted app that typechecks is the failure this
   * sequencing exists to prevent, so the day this list empties is the day the sticky machinery —
   * `.wsh-wrap`, the reservation padding, the frosted state and the legacy scroll listener — comes
   * out, and not before.
   */
  it("⚠️ THE CONVERSION IS PARTIAL, and both halves are asserted", () => {
    const CONVERTED = [
      ["Contact list", "../agents/AgentList.tsx"],
      ["Manuscripts", "../AllManuscripts.tsx"],
      ["Comparable titles", "../manuscripts/ComparableTitlesPage.tsx"],
    ] as const;
    const NOT_YET = [
      ["Tasks family", "../todo/TasksPageLayout.tsx"],
    ] as const;
    for (const [page, file] of CONVERTED) {
      expect(
        readFileSync(resolve(__dirname, file), "utf8"),
        `${page} is listed as converted but no longer renders the grid`,
      ).toContain("WorkspacePageGrid");
    }
    for (const [page, file] of NOT_YET) {
      const t = readFileSync(resolve(__dirname, file), "utf8");
      expect(t, `${page} converted — move it into CONVERTED above, and check whether this was the LAST one`).not.toContain("WorkspacePageGrid");
      expect(t, `${page} is still on the old path, so it must still pass its toolbar to the plate`).toContain("toolbar=");
    }
    /* the legacy path must survive while anything is still on it */
    const ph = readFileSync(resolve(__dirname, "PageHeader.tsx"), "utf8");
    expect(ph, "PageHeader stopped consuming the grid — converted pages would fall back to the scroll listener and condense on the wrong element").toContain("PlateCondensedContext");
    expect(ph, "the legacy scroll listener went while pages are still on it — they would stop condensing entirely").toContain("useCondensed");
  });
});
