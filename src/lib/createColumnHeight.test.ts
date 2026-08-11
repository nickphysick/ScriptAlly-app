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
/* ⚠️ THE ANCHOR IS WIDENED, THE ASSERTIONS ARE NOT. The step-stack CHASSIS — the three
   treatments, the summary rows, the numbered head, the Back/Next footer, Enter-to-advance and the
   pulse — was extracted to `StepStack` so the response takeover wears the same rhythm rather than a
   copy of it. Create mode is now TWO files, and "the pane's source" honestly means both: every
   assertion below is unchanged and still fails if its subject disappears from wherever it lives. */
const pane = read("../components/queries/QueryCreatePane.tsx") + read("../components/queries/StepStack.tsx");
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
  /* ⚠️ AMENDED AGAIN: the centred single-column question is retired too. Stage 1 now uses the
     SAME two-column geometry as stage 2, so choosing an agent replaces the right column's
     content rather than introducing a column — nothing jumps under the pointer. */
  it("the pre-agent state is two columns, like the state it leads to", () => {
    expect(pane, "the compact hero came back").not.toContain('className="qc-htxt"');
    expect(pane, "the compact hero came back").not.toContain('className="qc-mark"');
    expect(pane, "the centred single-column ask came back").not.toContain('className="qc-ask"');
    /* ⚠️ AMENDED AGAIN: stage 1 is now a SINGLE column. It has no reference panel — no agent is
       chosen, so there is nothing to describe — and the picker grid takes the width the panel
       would have held. Matching stage 2's geometry was the old reason for a second column, and
       it was never worth a column of suggestions nobody had asked for. */
    expect(pane).toContain('className="qc-two qc-two-solo"');
    expect(pane.match(/className="qc-two/g)?.length ?? 0, "one row per stage, no more").toBe(2);
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

  it("only the active section's body is mounted, so height is never the sum of three", () => {
    /* ⚠️ THE PROPERTY, NOT A COUNT (step-stack extraction). The height claim is that exactly one
       body is in the document; one gate inside the map guarantees it for every step, where three
       matching spellings only sampled it. */
    const map = pane.slice(pane.indexOf("{steps.map((s) => {"));
    expect(map, "the map over the step order is missing").not.toBe("");
    expect(map).toContain('{state === "active" && (');
    expect(map).toContain('<div className="qc-body">{s.body}</div>');
  });
});
