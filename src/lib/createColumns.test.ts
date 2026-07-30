/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Create mode · COLUMN NAMES + the manuscript's home (ref design-refs/qdb-create-polish2.html §2).
 *
 * "When you sent it" holds send facts only. The manuscript moved to "What you sent" — it belongs
 * with the materials it went out with, not with the date. And the Journal column is called Notes
 * in BOTH modes, because the same data under two names is how two names start disagreeing.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const pane = read("../components/queries/QueryCreatePane.tsx");
const queries = read("../components/Queries.tsx");

/** Everything between two column headings — the body of the first one. */
const column = (from: string, to: string): string => {
  const a = pane.indexOf(`<span>${from}</span>`);
  const b = pane.indexOf(`<span>${to}</span>`);
  return a < 0 || b < 0 || b < a ? "" : pane.slice(a, b);
};

describe("the three create-mode columns", () => {
  it("are named When you sent it · What you sent · Notes", () => {
    expect(pane).toContain("<span>When you sent it</span>");
    expect(pane).toContain("<span>What you sent</span>");
    expect(pane).toContain("<span>Notes</span>");
    expect(pane, "the old name survives").not.toContain("<span>The send</span>");
    expect(pane, "the old name survives").not.toContain("<span>Journal</span>");
  });
});

describe("the manuscript moved", () => {
  const sendCol = column("When you sent it", "What you sent");
  const sentCol = column("What you sent", "Notes");

  it("the slices are anchored (a missing heading would make every check below vacuous)", () => {
    expect(sendCol).not.toBe("");
    expect(sentCol).not.toBe("");
  });

  it("'When you sent it' holds send facts ONLY", () => {
    expect(sendCol, "the manuscript is still in the send column").not.toContain("Manuscript");
    for (const field of ["Date sent", "Sent by", "Nudge reminder"]) {
      expect(sendCol, `${field} left the send column`).toContain(field);
    }
  });

  it("'What you sent' opens with the manuscript, above a hairline, then the materials", () => {
    expect(sentCol).toContain("<div style={LABEL}>Manuscript</div>");
    const ms = sentCol.indexOf("<div style={LABEL}>Manuscript</div>");
    const rule = sentCol.indexOf('height: 1, background: "var(--line)"');
    const mats = sentCol.indexOf("draft.materials.map");
    expect(rule, "the divider is missing").toBeGreaterThan(-1);
    expect(ms).toBeLessThan(rule);
    expect(rule, "the divider must separate WHICH book from WHAT went with it").toBeLessThan(mats);
  });

  it("both manuscript states came with it — locked single, and the app's own menu", () => {
    expect(sentCol).toContain("Only manuscript");
    expect(sentCol).toContain("F12Menu");
    expect(sentCol, "a native select must never reappear").not.toContain("<select");
  });
});

describe("one name for one thing, across modes", () => {
  it("the reading pane's column is Notes too", () => {
    expect(queries).toContain("<span>Notes</span>");
    expect(queries, "the reading pane still says Journal").not.toContain("<span>Journal</span>");
  });

  it("Tracking is left alone — it shows the activity timeline, not send facts", () => {
    expect(queries).toContain("<span>Tracking</span>");
  });
});
