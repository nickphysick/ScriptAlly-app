/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QC132 R4 — "Recently updated": the sentence, the seven-day window and the verb table.
 */
import { describe, it, expect } from "vitest";
import { QueryStatus } from "../types";
import type { QcRow } from "./qcSummary";
import { MOVE_VERB, movedAt, recentRows, recentSentence, sayRuns } from "./qcRecent";

const DAY = 86_400_000;
const NOW = Date.parse("2026-10-08T12:00:00Z");
let n = 0;
const row = (name: string, status: QueryStatus, daysAgo: number | null): QcRow => ({
  id: `q${++n}`, agentName: name, status, query: { id: `q${n}`, status }, stageStartMs: daysAgo == null ? null : NOW - daysAgo * DAY,
  sentMs: daysAgo == null ? null : NOW - 90 * DAY, lastMs: NOW, history: { spans: [], currentStartMs: null, dated: false },
} as unknown as QcRow);
const text = (rows: QcRow[]) => sayRuns(recentSentence(rows, NOW)).map((r) => r.text).join("");

describe("R4 · the verb table covers every status a move can land on", () => {
  it("one verb per QueryStatus, in the ruled words", () => {
    for (const s of Object.values(QueryStatus)) expect(MOVE_VERB[s], s).toBeTruthy();
    expect(MOVE_VERB[QueryStatus.QUERIED]).toBe("has your query");
    expect(MOVE_VERB[QueryStatus.PARTIAL_SENT]).toBe("has your partial");
    expect(MOVE_VERB[QueryStatus.FULL_SENT]).toBe("has your full");
    expect(MOVE_VERB[QueryStatus.PARTIAL_REQUESTED]).toBe("asked for a partial");
    expect(MOVE_VERB[QueryStatus.FULL_REQUESTED]).toBe("asked for the full");
    expect(MOVE_VERB[QueryStatus.OFFER]).toBe("made an offer");
    expect(MOVE_VERB[QueryStatus.REJECTED]).toBe("passed");
    expect(MOVE_VERB[QueryStatus.NO_RESPONSE]).toBe("closed with no reply");
    /* Nick, 8 Oct — the four the brief's table left out */
    expect(MOVE_VERB[QueryStatus.REVISE_RESUBMIT]).toBe("asked for a revision");
    expect(MOVE_VERB[QueryStatus.RESUBMITTED]).toBe("has your revision");
    expect(MOVE_VERB[QueryStatus.SIGNED]).toBe("signed with you");
    expect(MOVE_VERB[QueryStatus.WITHDRAWN]).toBe("no longer has your query");
  });
});

describe("R4 · the sentence", () => {
  it("nothing moved this week: names the last change, who and when", () => {
    expect(text([row("Tom Ellery", QueryStatus.WITHDRAWN, 9), row("Ada Penhallow", QueryStatus.QUERIED, 20)]))
      .toBe("Nothing has moved this week. The last change was Tom Ellery, who no longer has your query on 29 Sep.");
  });
  it("one move this week", () => {
    expect(text([row("Tom Ellery", QueryStatus.OFFER, 2), row("Ada Penhallow", QueryStatus.QUERIED, 20)]))
      .toBe("One thing moved this week: Tom Ellery made an offer.");
  });
  it("three moves: commas and 'and', newest first", () => {
    expect(text([row("A One", QueryStatus.REJECTED, 1), row("B Two", QueryStatus.OFFER, 3), row("C Three", QueryStatus.FULL_REQUESTED, 5)]))
      .toBe("Three things moved this week: A One passed, B Two made an offer and C Three asked for the full.");
  });
  it("five moves: three named, and the rest counted", () => {
    const rows = [1, 2, 3, 4, 5].map((d, i) => row(`N${i}`, QueryStatus.QUERIED, d));
    expect(text(rows)).toBe("Five things moved this week: N0 has your query, N1 has your query and N2 has your query, and 2 more.");
  });
  it("the seven-day boundary: 7 days in, 8 days out", () => {
    expect(text([row("In Side", QueryStatus.QUERIED, 7)])).toMatch(/^One thing moved this week/);
    expect(text([row("Out Side", QueryStatus.QUERIED, 8)])).toMatch(/^Nothing has moved this week/);
  });
  it("names are the bold runs", () => {
    const runs = sayRuns(recentSentence([row("Tom Ellery", QueryStatus.OFFER, 2)], NOW));
    expect(runs.filter((r) => r.bold).map((r) => r.text)).toEqual(["One thing", "Tom Ellery"]);
  });
  it("an undated move is never 'this week', and sorts last", () => {
    const rows = recentRows([row("Undated", QueryStatus.QUERIED, null), row("Dated", QueryStatus.QUERIED, 3)], null);
    expect(rows.map((r) => r.agentName)).toEqual(["Dated", "Undated"]);
    expect(movedAt(rows[1])).toBeNull();
  });
});
