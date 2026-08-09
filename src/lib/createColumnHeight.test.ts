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

  /* ⚠️ SUPERSEDED THREE TIMES, and the third supersession removes the subject entirely.
     · It measured a COMPACT HERO — a 54px mark with title, subtitle and picker side by side —
       built to claw ~90px back for the three columns.
     · Stage 1 deleted that hero in favour of a centred question with three ghost rows.
     · Stage 1 then adopted stage 2's two-column geometry, so nothing jumped when you picked.
     There is now no pre-agent STATE to compare, because there is no stage: the agent is step one
     inside the same stack as the other three, and the only thing that changes when you pick
     someone is that the reference panel arrives beside a column that was already there. */
  it("there is one row for every state, and the hero is gone from all of them", () => {
    expect(pane, "the compact hero came back").not.toContain('className="qc-htxt"');
    expect(pane, "the compact hero came back").not.toContain('className="qc-mark"');
    expect(pane, "the centred single-column ask came back").not.toContain('className="qc-ask"');
    expect(pane, "the agent hero came back").not.toContain("qc-hero");
    expect(pane.match(/className=\{`qc-two/g)?.length ?? 0, "one row, both states")
      .toBe(1);
  });

  it("the hero/columns gap tightened", () => {
    expect(pane).toContain("minHeight: 0, gap: 12");
  });
});

describe("the columns take the height, and scroll only as a fallback", () => {
  /* ⚠️ THE GRID IS GONE (create mode v3). These asserted a three-column grid that flexed to fill
     with min-height:0, each column scrolling internally as the overflow fallback, around a hero
     that never flexed. The stack has ONE column and shows one section at a time, so there is no
     grid to flex, no per-column scroll to fall back to, and no height budget to protect — the
     pressure this whole suite was written under simply does not exist.

     What replaces it is a rule, not a measurement: only the ACTIVE section's body is mounted, so
     the tall content is never all present at once. */
  it("the grid is retired — one column, one open section", () => {
    expect(pane, "the three-column grid came back").not.toContain('gridTemplateColumns: "1fr 1fr 1fr"');
    expect(pane).toContain('className="qc-stack"');
  });

  it("only the active section's body is mounted, so height is never the sum of four", () => {
    /* Stronger than counting branches: the bodies are thunks and the single call site sits in
       the open branch, so a closed step's content is not merely unmounted — it is never built. */
    expect(pane).toContain("const BODIES: Record<StepId, () => React.ReactNode>");
    expect(pane.match(/BODIES\[id\]\(\)/g)?.length ?? 0).toBe(1);
  });
});
