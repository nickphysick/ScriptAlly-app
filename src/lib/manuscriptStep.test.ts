/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ THE MANUSCRIPT ARROWS (polish P6) — a shortcut through the list, never the only route.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { stepManuscript } from "./shellSidebar";

const three = [{ id: "a" }, { id: "b" }, { id: "c" }];

describe("stepManuscript", () => {
  it("steps forward and back", () => {
    expect(stepManuscript(three, "a", 1)).toBe("b");
    expect(stepManuscript(three, "b", -1)).toBe("a");
  });

  it("⚠️ WRAPS rather than clamping — clamping would give the arrows a second disabled state", () => {
    expect(stepManuscript(three, "c", 1)).toBe("a");
    expect(stepManuscript(three, "a", -1)).toBe("c");
  });

  it("one manuscript has nowhere to go, and says so by returning the same id", () => {
    expect(stepManuscript([{ id: "only" }], "only", 1)).toBe("only");
  });

  it("no manuscripts yields null rather than throwing", () => {
    expect(stepManuscript([], null, 1)).toBeNull();
    expect(stepManuscript([], "ghost", -1)).toBeNull();
  });

  it("⚠️ an unknown current id steps from the FIRST — matching resolveActiveManuscript's fallback", () => {
    // resolveActiveManuscript falls back to manuscripts[0] for an unknown stored id; if this
    // stepped from somewhere else, one press would jump to an unrelated book.
    expect(stepManuscript(three, "deleted", 1)).toBe("b");
    expect(stepManuscript(three, null, -1)).toBe("c");
  });
});

/**
 * ⚠️ THE ARROWS LIVE INSIDE THE CARD (fixes-2 A1) — an arrow that steps between manuscripts must
 * be attached to the manuscript it steps FROM. Below the card it belonged to nothing, and the
 * double-chevron pair it used read as the sidebar-collapse idiom rather than a stepper.
 */
describe("the stepper's chrome", () => {
  const tsx = readFileSync(join(__dirname, "../components/shell/WorkspaceShell.tsx"), "utf8");
  const css = readFileSync(join(__dirname, "../components/shell/workspaceShell.css"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "");

  it("uses SINGLE chevrons — the double pair is the collapse idiom", () => {
    expect(tsx).toContain("<ChevronLeft aria-hidden");
    expect(tsx).toContain("<ChevronRight aria-hidden");
    expect(tsx).not.toContain("<ChevronsLeft aria-hidden");
    expect(tsx).not.toContain("<ChevronsRight aria-hidden");
  });

  it("⚠️ the arrows are INSIDE the card, absolutely centred at its right edge", () => {
    const nav = css.slice(css.indexOf(".ws-msnav {"), css.indexOf("}", css.indexOf(".ws-msnav {")));
    expect(nav).toContain("position: absolute");
    expect(nav).toContain("translateY(-50%)");
    // the card must be the positioning context, or the arrows escape to the panel
    const pill = css.slice(css.indexOf(".ws-mspill {"), css.indexOf("}", css.indexOf(".ws-mspill {")));
    expect(pill).toContain("position: relative");
  });

  it("⚠️ the opener is not a BUTTON INSIDE A BUTTON — the card is a div", () => {
    // a nested button is invalid markup and the inner one never receives its own click
    expect(tsx).toContain('<div className={`ws-mspill${manyMs ? "" : " static"}`}>');
    expect(tsx).toContain('className="ws-msopen"');
  });

  it("both arrows are labelled and disabled together at one manuscript", () => {
    expect(tsx).toContain('aria-label="Previous manuscript"');
    expect(tsx).toContain('aria-label="Next manuscript"');
    expect((tsx.match(/className="ws-msarrow" disabled=\{!manyMs\}/g) ?? [])).toHaveLength(2);
  });
});
