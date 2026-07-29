/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Queries Hub v4 · PHASE 1 locks — the shared header column, the wider workspace, and the
 * labelled list-card pills (ref design-refs/queries-hub-v4.html; the Guides view draws the
 * header column's edges).
 *
 * jsdom can measure none of this, so these lock the CAUSES the pixels follow from: that the
 * header block reads the shared column tokens (the same ones the agent list reads, so the two
 * pages' headers line up), that the workspace deliberately does NOT (it keeps its wider cap),
 * and that the list-card controls are labelled rather than icon-only.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

const f12 = readFileSync(new URL("../components/shell/f12.css", import.meta.url), "utf8");
const queries = readFileSync(new URL("../components/Queries.tsx", import.meta.url), "utf8");
const shellComp = readFileSync(new URL("../components/shell/F12Shell.tsx", import.meta.url), "utf8");
const block = (selector: string): string => {
  const i = f12.indexOf(selector + " {");
  if (i === -1) return "";
  return f12.slice(i, f12.indexOf("}", i));
};

describe("Queries hub · the header block sits in the SHARED content column", () => {
  // The header block = the page-header seat, the action row, and the active-filter chips.
  for (const sel of [".f12-hd2", ".f12-ctl", ".f12-chips"]) {
    it(`${sel} reads the shared column tokens, not the workspace cap`, () => {
      const rule = block(sel);
      expect(rule, `${sel} is missing from f12.css`).not.toBe("");
      expect(
        rule,
        `${sel} left the shared column — the Queries header would stop lining up with the agent list's`,
      ).toContain("var(--sa-col-max)");
      expect(rule, `${sel} lost the shared gutter`).toContain("var(--sa-col-gut)");
      expect(
        rule,
        `${sel} is back on the workspace cap — the header would run wider than the agent list's`,
      ).not.toContain("var(--maxw)");
    });
  }

  it("the WORKSPACE keeps its own wider cap — the differential is the point", () => {
    const body = block(".f12-body");
    expect(
      body,
      "the list + reading pane fell into the header column — the hub's workspace is deliberately wider (ref Guides view)",
    ).toContain("var(--maxw)");
    expect(body).not.toContain("var(--sa-col-max)");
  });

  it("the action row right-aligns; the --listw spacer that locked it to the list pane is gone", () => {
    expect(block(".f12-zone-read")).toContain("justify-content: flex-end");
    expect(f12, "the retired left-zone rule is still in the stylesheet").not.toContain(".f12-zone-list {");
  });
});

describe("Queries hub · the list card's Filter / Sort are LABELLED pills", () => {
  it("both controls render through PillTrig, not the icon-only trigger", () => {
    expect(queries).toContain("<PillTrig");
    expect(queries, "an icon-only trigger came back to the list head").not.toContain("<IconTrig");
    expect(queries).toContain('label="Filter"');
    expect(queries).toContain('label="Sort"');
  });

  it("PillTrig carries the agent-list pill grammar: label, chevron, shared pink active state", () => {
    expect(shellComp).toContain("f12-pill");
    expect(shellComp, "the chevron left the pill — it no longer reads as a dropdown").toContain("f12-cv");
    const pill = block(".f12-pill");
    expect(pill, "the pill lost the agent-list geometry (36px tall, 10px radius)").toContain("height: 36px");
    expect(pill).toContain("border-radius: 10px");
    // The shared "this control is doing something" treatment — pink, as on the agent list.
    expect(f12).toContain(".f12-pill.f12-active { background: var(--pink-t)");
  });
});
