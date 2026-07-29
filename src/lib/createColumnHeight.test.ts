/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Create mode · RECLAIMED COLUMN HEIGHT (ref design-refs/qdb-focus-spotlight.html).
 *
 * jsdom has no layout, so the real verification is a browser measurement (recorded in the commit
 * and the report): at 1440×900 the three columns show their contents with no internal scrolling,
 * with 232px/187px of slack in the two fixed-height columns; the first to scroll is "What you
 * sent", at roughly a 613px viewport. What IS testable here is that the height the measurement
 * depends on hasn't been quietly given back.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const pane = read("../components/queries/QueryCreatePane.tsx");
const css = read("../components/shell/f12.css");

const rule = (selector: string): string => {
  const at = css.indexOf("\n" + selector + " {");
  return at < 0 ? "" : css.slice(at, css.indexOf("}", at) + 1);
};

describe("the two sources of reclaimed height", () => {
  it("the footer is gone (~95px) — asserted in createCommandBar.test.ts, restated here as intent", () => {
    expect(pane).not.toContain("qc-foot");
  });

  it("the hero is compact (~90px): 54px mark, tighter padding, text BESIDE the field", () => {
    expect(rule(".f12-hero.qc-hero")).toContain("padding: 16px 20px");
    expect(rule(".qc-mark")).toContain("width: 54px");
    // beside, not above: the text block is its own flex sibling of the picker
    expect(pane).toContain('<div className="qc-htxt">');
    // (window wide enough to span the comment that sits between the two blocks)
    expect(pane).toMatch(/qc-htxt[\s\S]{0,800}<div className="qc-picker"/);
    expect(pane, "the old 76px mark survives").not.toContain("width: 76, height: 76");
  });

  it("the hero/columns gap tightened", () => {
    expect(pane).toContain("minHeight: 0, gap: 12");
  });
});

describe("the columns take the height, and scroll only as a fallback", () => {
  it("the grid flexes to fill, with min-height:0 so it can actually shrink", () => {
    expect(pane).toMatch(/gridTemplateColumns: "1fr 1fr 1fr"[^}]*flex: 1, minHeight: 0/);
  });

  it("each column body keeps its internal scroll as the overflow fallback", () => {
    expect(pane.match(/overflowY: "auto", flex: 1, minHeight: 0/g)?.length ?? 0).toBe(2);
    // the Notes column is a flex textarea — it shrinks rather than overflowing, which is why it
    // never drives the fold (measured: it reports content == box at every height)
    expect(pane).toContain('display: "flex", flex: 1, minHeight: 0');
  });

  it("the hero never flexes — it is the fixed cost the columns budget around", () => {
    expect(pane).toContain('className="f12-hero qc-hero" style={{ flex: "none"');
  });
});
