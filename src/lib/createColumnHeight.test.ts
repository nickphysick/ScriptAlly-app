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

  /* ⚠️ SUPERSEDED BY STAGE 1 (create mode v3). This measured a COMPACT HERO — a 54px mark with
     the title, subtitle and picker side by side — built to claw ~90px back for the three
     columns. Stage 1 deletes that hero: before an agent is chosen the pane holds one centred
     question and three ghost rows, and there are no columns to make room for yet. The height
     pressure this suite was written under does not exist in that state. */
  it("the pre-agent state has no hero to be compact — it is one centred question", () => {
    expect(pane, "the compact hero came back").not.toContain('className="qc-htxt"');
    expect(pane, "the compact hero came back").not.toContain('className="qc-mark"');
    expect(pane).toContain('<div className="qc-ask">');
    expect(rule(".qc-ask"), "the question must be centred, not beside the field")
      .toContain("flex-direction: column");
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
