/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v149 Part A — the banner's model and the chips' press, against `whereItStands` (never literals on both
 * sides: the banner's n is asserted EQUAL to the With you count from `whereCounts`).
 */
import { describe, expect, it } from "vitest";
import { QueryStatus, type Query } from "../types";
import { whereCounts, type QcRow } from "./qcSummary";
import { pressView, waitingBanner, waitingRows, whenWords } from "./qc149";

const DAY = 86_400_000;
const NOW = new Date(2026, 9, 24, 12).getTime();
let n = 0;
const row = (status: QueryStatus, expectedMs: number | null, name?: string, agentId?: string): QcRow => {
  n++;
  name ??= `Agent ${n}`;
  agentId ??= `a${n}`;
  return {
  id: `q${n}`, query: { id: `q${n}`, agentId } as unknown as Query, status, court: "you", withYou: false, agentName: name, agency: "An Agency",
  initials: name.split(" ").map((w) => w[0]).join(""), expectedMs, stageStartMs: null, sentMs: NOW - 40 * DAY,
} as unknown as QcRow;
};

describe("v149 A2 — the waiting-on-you banner", () => {
  const rows = [
    row(QueryStatus.FULL_REQUESTED, NOW + 7 * DAY, "Jonathan Marsh"),
    row(QueryStatus.OFFER, NOW + 1 * DAY, "Tom Ellery"),
    row(QueryStatus.PARTIAL_REQUESTED, NOW - 8 * DAY, "Clara Beaumont"),
    row(QueryStatus.PARTIAL_REQUESTED, null, "Marcus Reed"),
    row(QueryStatus.QUERIED, NOW + 30 * DAY, "Leah Goldstein"),
    row(QueryStatus.REJECTED, null, "Aisha Kapoor"),
  ];
  it("counts exactly the With you set (whereCounts' own number)", () => {
    expect(waitingBanner(rows, NOW).n).toBe(whereCounts(rows, NOW).you);
    expect(waitingBanner(rows, NOW).n).toBeGreaterThan(0);
  });
  it("orders the most urgent first: overdue, then soonest, then undated", () => {
    expect(waitingRows(rows, NOW).map((r) => r.agentName)).toEqual(["Clara Beaumont", "Tom Ellery", "Jonathan Marsh", "Marcus Reed"]);
    const b = waitingBanner(rows, NOW);
    expect(b.next).toMatch(/for Clara Beaumont · 8 days over$/);
    expect(b.faces.map((f) => f.initials)).toEqual(["CB", "TE", "JM", "MR"]);
  });
  it("one disc per agent, at most five", () => {
    const many = Array.from({ length: 8 }, (_, i) => row(QueryStatus.FULL_REQUESTED, NOW + i * DAY, `Agent X${i}`));
    const same = [row(QueryStatus.FULL_REQUESTED, NOW, "Same One", "dup"), row(QueryStatus.PARTIAL_REQUESTED, NOW + DAY, "Same One", "dup")];
    expect(waitingBanner(many, NOW).faces).toHaveLength(5);
    expect(waitingBanner(same, NOW).faces).toHaveLength(1);
  });
  it("is empty, with no next line, when nothing waits on the writer", () => {
    const b = waitingBanner([row(QueryStatus.QUERIED, NOW + 30 * DAY)], NOW);
    expect(b.n).toBe(0);
    expect(b.next).toBeNull();
  });
  it("words the date relative to today", () => {
    expect([whenWords(NOW, NOW), whenWords(NOW + DAY, NOW), whenWords(NOW + 6 * DAY, NOW), whenWords(NOW - DAY, NOW), whenWords(NOW - 3 * DAY, NOW), whenWords(null, NOW)])
      .toEqual(["today", "tomorrow", "in 6 days", "yesterday", "3 days over", "no date set"]);
  });
});

describe("v149 A3 — the view chips are single-select", () => {
  it("a press chooses that view; pressing the chosen one, or All, goes back to All", () => {
    expect(pressView(null, "you")).toBe("you");
    expect(pressView("you", "agent")).toBe("agent");
    expect(pressView("you", "you")).toBeNull();
    expect(pressView("quiet", null)).toBeNull();
  });
});
