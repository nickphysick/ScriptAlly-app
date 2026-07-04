import { describe, it, expect } from "vitest";
import {
  isShelvedPresentation,
  stageRows,
  activeQueryCount,
  compactRange,
  wordCountWhisper,
} from "./manuscriptPage";
import { ManuscriptStatus, Query, QueryStatus } from "../types";

const q = (status: QueryStatus): Query =>
  ({ id: Math.random().toString(36), status }) as Query;

describe("isShelvedPresentation", () => {
  it("is true for Shelved status, the shelved overlay, or both", () => {
    expect(isShelvedPresentation({ status: ManuscriptStatus.SHELVED })).toBe(true);
    expect(isShelvedPresentation({ status: ManuscriptStatus.QUERYING, shelved: true })).toBe(true);
    expect(isShelvedPresentation({ status: ManuscriptStatus.SHELVED, shelved: true })).toBe(true);
  });
  it("is false for an active status with no overlay", () => {
    expect(isShelvedPresentation({ status: ManuscriptStatus.QUERYING })).toBe(false);
    expect(isShelvedPresentation({ status: ManuscriptStatus.DRAFTING, shelved: false })).toBe(false);
  });
});

describe("stageRows", () => {
  it("zero-suppresses and keeps canonical pipeline order", () => {
    const rows = stageRows([
      q(QueryStatus.FULL_SENT),
      q(QueryStatus.QUERIED),
      q(QueryStatus.QUERIED),
      q(QueryStatus.PARTIAL_REQUESTED),
    ]);
    expect(rows.map((r) => r.label)).toEqual(["Queried", "Partial Requested", "Full Sent"]);
    expect(rows.map((r) => r.count)).toEqual([2, 1, 1]);
  });

  it("aggregates all closed statuses into one Closed row with the Rejected dot", () => {
    const rows = stageRows([
      q(QueryStatus.REJECTED),
      q(QueryStatus.WITHDRAWN),
      q(QueryStatus.NO_RESPONSE),
      q(QueryStatus.QUERIED),
    ]);
    const closed = rows[rows.length - 1];
    expect(closed.label).toBe("Closed");
    expect(closed.count).toBe(3);
    expect(closed.dotStatus).toBe(QueryStatus.REJECTED);
  });

  it("never folds Revise & Resubmit into Closed", () => {
    const rows = stageRows([q(QueryStatus.REVISE_RESUBMIT), q(QueryStatus.REJECTED)]);
    expect(rows.map((r) => r.label)).toEqual(["Revise & Resubmit", "Closed"]);
  });

  it("treats Offer as an active row after R&R", () => {
    const rows = stageRows([q(QueryStatus.OFFER), q(QueryStatus.REVISE_RESUBMIT)]);
    expect(rows.map((r) => r.label)).toEqual(["Revise & Resubmit", "Offer"]);
  });

  it("returns [] for no queries", () => {
    expect(stageRows([])).toEqual([]);
  });
});

describe("activeQueryCount", () => {
  it("counts non-closed statuses only (Offer and R&R are active)", () => {
    expect(
      activeQueryCount([
        q(QueryStatus.QUERIED),
        q(QueryStatus.OFFER),
        q(QueryStatus.REVISE_RESUBMIT),
        q(QueryStatus.REJECTED),
        q(QueryStatus.NO_RESPONSE),
        q(QueryStatus.WITHDRAWN),
      ])
    ).toBe(3);
  });
});

describe("compactRange", () => {
  it("compacts thousands to a shared k suffix", () => {
    expect(compactRange("70,000 – 100,000")).toBe("70–100k");
    expect(compactRange("90,000 – 120,000")).toBe("90–120k");
    expect(compactRange("5,000 – 10,000")).toBe("5–10k");
  });
  it("leaves sub-thousand ranges plain", () => {
    expect(compactRange("300 – 800")).toBe("300–800");
  });
});

describe("wordCountWhisper", () => {
  it("builds age-short + lowercase genre phrases", () => {
    expect(wordCountWhisper("Young Adult", "Steampunk Fantasy")).toBe(
      "YA steampunk fantasy typically runs 50–80k"
    );
    expect(wordCountWhisper("Adult", "Gothic Mystery")).toBe(
      "adult gothic mystery typically runs 70–90k"
    );
  });
  it("avoids doubling when the genre already carries the age", () => {
    expect(wordCountWhisper("Young Adult", "Young Adult")).toBe(
      "young adult typically runs 50–80k"
    );
  });
  it("uses the age phrase alone when no genre is set for young categories", () => {
    expect(wordCountWhisper("Picture Book", "")).toBe("picture book typically runs 300–800");
  });
  it("returns null when the shared range lookup has nothing (adult, no genre)", () => {
    expect(wordCountWhisper("Adult", "")).toBeNull();
  });
});
