/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE BOOK PROFILE — Overview ═══════════════════════════════════════════════════════════════
 *
 * ⚠️ THE STAT ROW'S FIVE FIGURES ARE NOT FIVE INDEPENDENT COUNTS. `stillOpen` and `closed`
 * PARTITION the queries, so the two must sum to `queriesSent` for any input — which is the kind of
 * claim a fixture can satisfy by coincidence and a property cannot. It is asserted over a spread of
 * status mixtures rather than over one hand-built board.
 *
 * ⚠️ AND `agentsHolding` COUNTS PEOPLE. Two live sends to one agent is one agent holding something;
 * counting rows would state a number of human beings that does not exist.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { atAGlance, glanceMeta, pitchMeta } from "../../lib/manuscriptProfile";
import { holdingRows, HoldingRow } from "../../lib/bookVersions";
import { CLOSED_STATUSES } from "../../lib/manuscriptPage";
import { OverviewPane } from "./OverviewPane";
import { Query, QueryStatus, Activity } from "../../types";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const q = (id: string, status: QueryStatus, agentId = "a1"): Query =>
  ({ id, userId: "u", manuscriptId: "m1", agentId, packageId: "", status,
     dateSent: "2026-02-01", materialsWanted: [] } as unknown as Query);
const send = (queryId: string, date: string, status: QueryStatus): Activity =>
  ({ id: `ac-${queryId}`, userId: "u", queryId, manuscriptId: "m1", date,
     description: "sent", resultingStatus: status } as unknown as Activity);

const NAMES: Record<string, string> = { a1: "T. Marsh", a2: "R. Halloway", a3: "J. Okafor" };
const nameOf = (id: string) => NAMES[id] ?? "Agent not recorded";
const day = (iso: string) => iso.slice(0, 10);

/** `atAGlance` from raw queries, the way the dossier composes it — never hand-fed figures. */
const glanceOf = (queries: Query[], activities: Activity[]) => {
  const holders = holdingRows(queries, activities, [], nameOf, day);
  const closed = queries.filter((x) => CLOSED_STATUSES.includes(x.status)).length;
  const responses = queries.filter((x) =>
    x.status !== QueryStatus.QUERIED && !CLOSED_STATUSES.includes(x.status)).length;
  return {
    cells: atAGlance(queries.length, responses, closed, new Set(holders.map((h) => h.agent)).size),
    holders,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
describe("the stat row is a partition, not five separate counts", () => {
  const MIXTURES: QueryStatus[][] = [
    [],
    [QueryStatus.QUERIED],
    [QueryStatus.QUERIED, QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE],
    [QueryStatus.PARTIAL_SENT, QueryStatus.FULL_SENT, QueryStatus.OFFER, QueryStatus.REVISE_RESUBMIT],
    Object.values(QueryStatus),
    [...Object.values(QueryStatus), ...Object.values(QueryStatus)],
  ];

  it("still open + closed = queries sent, for every mixture of statuses", () => {
    for (const mix of MIXTURES) {
      const cells = glanceOf(mix.map((s, i) => q(`q${i}`, s)), []).cells;
      const at = (k: string) => cells.find((c) => c.key === k)!.value;
      expect(at("open") + at("closed"), `mixture ${mix.join("|") || "(empty)"}`).toBe(at("sent"));
    }
  });

  /** Nothing may go negative, at any mixture — a negative count is a derivation admitting defeat. */
  it("states no negative figure", () => {
    for (const mix of MIXTURES) {
      for (const c of glanceOf(mix.map((s, i) => q(`q${i}`, s)), []).cells) {
        expect(c.value, `${c.label} on ${mix.join("|") || "(empty)"}`).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("states all five at nought on an unqueried manuscript rather than omitting them", () => {
    const cells = glanceOf([], []).cells;
    expect(cells).toHaveLength(5);
    expect(cells.every((c) => c.value === 0)).toBe(true);
  });

  /** ⚠️ THE APP REPORTS, NEVER APPRAISES. No cell may carry a verdict word or an ordering claim. */
  it("uses no verdict language in any label", () => {
    const words = /\b(best|worst|strong|weak|good|bad|poor|great|top|leading|winning|success|fail)/i;
    for (const c of atAGlance(9, 4, 5, 2)) expect(c.label).not.toMatch(words);
    expect(glanceMeta(9, 2)).not.toMatch(words);
  });

  /** Closed is quieter, and quieter is the ONLY distinction — never a colour that means bad. */
  it("marks closed as soft and nothing else", () => {
    expect(atAGlance(9, 4, 5, 2).filter((c) => c.soft).map((c) => c.key)).toEqual(["closed"]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("who holds what — agents, not rows", () => {
  /**
   * ⚠️ THE FIXTURE IS THE POINT: two live sends to ONE agent. Counting `holders.length` would say
   * two agents are holding something when one person is.
   */
  it("counts one agent when one agent holds two things", () => {
    const queries = [q("q1", QueryStatus.FULL_SENT, "a1"), q("q2", QueryStatus.PARTIAL_SENT, "a1")];
    const acts = [send("q1", "2026-05-01", QueryStatus.FULL_SENT), send("q2", "2026-03-01", QueryStatus.PARTIAL_SENT)];
    const { cells, holders } = glanceOf(queries, acts);
    expect(holders).toHaveLength(2);
    expect(cells.find((c) => c.key === "holding")!.value).toBe(1);
  });

  it("counts only live sends — a full that was later rejected is not being held", () => {
    const queries = [q("q1", QueryStatus.FULL_SENT, "a1"), q("q2", QueryStatus.REJECTED, "a2")];
    const acts = [send("q1", "2026-05-01", QueryStatus.FULL_SENT), send("q2", "2026-01-01", QueryStatus.FULL_SENT)];
    expect(glanceOf(queries, acts).cells.find((c) => c.key === "holding")!.value).toBe(1);
  });

  it("names what is held without inventing a quantity", () => {
    const rows = holdingRows([q("q1", QueryStatus.PARTIAL_SENT)], [send("q1", "2026-03-03", QueryStatus.PARTIAL_SENT)], [], nameOf, day);
    // The ref writes `Partial · 50 pp`; the record carries the status and not the page count.
    expect(rows[0].holds).toBe("Partial");
    expect(rows[0].holds).not.toMatch(/\d/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("pitchMeta — what the record can support, and no more", () => {
  it("counts the words it was given", () => {
    expect(pitchMeta("One two three")).toBe("3 words");
    expect(pitchMeta("  spaced   out  words ")).toBe("3 words");
    expect(pitchMeta("Alone")).toBe("1 word");
  });

  it("states nothing at all where there is no pitch", () => {
    expect(pitchMeta(null)).toBeNull();
    expect(pitchMeta("")).toBeNull();
  });

  /**
   * ⚠️ `last edited` IS IN THE REF AND IS NOT BUILT. No field records when the elevator pitch was
   * written; `statusChangedDate` is about the STATUS and under an "edited" label would be a
   * plausible number measuring something else — the exact shape of the "Added {date}" fault this
   * page has shipped once already.
   */
  it("never claims when the pitch was edited", () => {
    expect(pitchMeta("some words here")).not.toMatch(/edit|last|ago|\d{4}/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("the pane", () => {
  const row = (over: Partial<HoldingRow> = {}): HoldingRow =>
    ({ queryId: "q1", agent: "T. Marsh", what: "FULL · sent 2 Jun 2026",
       holds: "Full manuscript", sentDay: "2 Jun 2026", versionName: null, ...over });

  const pane = (over: Partial<React.ComponentProps<typeof OverviewPane>> = {}) =>
    renderToStaticMarkup(
      <OverviewPane
        pitch="A fly that shouldn't exist."
        pitchMeta="5 words"
        glance={atAGlance(26, 12, 13, 4)}
        glanceMeta={glanceMeta(26, 4)}
        holders={[row()]}
        onOpenVersions={() => {}}
        {...over}
      />,
    );

  /**
   * ⚠️ THE EDIT CONTROL IS DELIBERATELY ABSENT AND THIS IS WHAT HOLDS IT ABSENT.
   * `Manuscript.elevatorPitch` is not in the manuscript-update allowlist in `firestore.rules`, so
   * a write carrying it is SILENTLY DENIED. A button that appears to save and does not is worse
   * than no button — the same law as the Undo that restored nothing. It returns with the rules line.
   */
  it("offers no way to edit the pitch while the write would be silently denied", () => {
    const html = pane();
    expect(html.toLowerCase()).not.toContain("edit pitch");
    const rules = readFileSync(join(__dirname, "..", "..", "..", "firestore.rules"), "utf8");
    const allow = /allow update:[\s\S]*?affectedKeys\(\)\.hasOnly\(\[([\s\S]*?)\]/g;
    const blocks = [...rules.matchAll(allow)].map((m) => m[1]);
    const manuscriptBlock = blocks.find((b) => b.includes("'bookVersions'"));
    expect(manuscriptBlock, "the manuscript update allowlist moved — re-find it").toBeTruthy();
    expect(manuscriptBlock).not.toContain("elevatorPitch");
  });

  it("says the pitch is unwritten rather than rendering an empty card", () => {
    const html = pane({ pitch: null, pitchMeta: null });
    expect(html).toContain("No elevator pitch written yet.");
    expect(html).toContain("Elevator pitch");
  });

  it("draws the five figures, closed among them and quieter", () => {
    const html = pane();
    for (const n of ["26", "12", "13", "4"]) expect(html).toContain(`>${n}</div>`);
    expect(html).toContain('class="msp-statn soft">13<');
  });

  it("states a nought rather than dropping the cell", () => {
    const html = pane({ glance: atAGlance(0, 0, 0, 0), glanceMeta: glanceMeta(0, 0) });
    expect(html.match(/class="msp-statn(?: soft)?">0</g)).toHaveLength(5);
  });

  it("tables the holders without a version column, and says where that lives", () => {
    const html = pane();
    expect(html).toContain("<th>Agent</th><th>Holds</th><th>Since</th>");
    expect(html).not.toContain("<th>Version</th>");
    expect(html).toContain("Which version each agent holds is shown under");
  });

  it("dashes an undated send rather than fabricating a date", () => {
    expect(pane({ holders: [row({ sentDay: null })] })).toContain('class="msp-num soft">—<');
  });

  it("says nothing is out rather than drawing an empty table", () => {
    const html = pane({ holders: [] });
    expect(html).toContain("Nothing is with an agent right now.");
    expect(html).not.toContain("<table");
    // …and with no table there is no footnote pointing at a column that is not there.
    expect(html).not.toContain("Which version each agent holds");
  });

  /** ⚠️ NO RED. Closed and rejection are grey on this page; a red anywhere would encode a verdict. */
  it("paints no red", () => {
    expect(pane()).not.toMatch(/#(?:f|e|d|c)[0-9a-f]{1,2}[0-3][0-9a-f]{1,2}[0-3]/i);
    expect(pane().toLowerCase()).not.toContain("red");
  });
});
