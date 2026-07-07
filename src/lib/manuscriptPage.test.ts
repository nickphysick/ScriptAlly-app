import { describe, it, expect } from "vitest";
import {
  isShelvedPresentation,
  stageRows,
  activeQueryCount,
  compactRange,
  wordCountWhisper,
  lastActivityMs,
  recentQueries,
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

describe("lastActivityMs", () => {
  const iso = (s: string) => Date.parse(s);

  it("returns the most recent dated event, not just dateSent", () => {
    const query = {
      dateSent: "2026-01-01",
      partialRequestedDate: "2026-02-01",
      responseReceivedAt: "2026-03-15",
    } as Query;
    expect(lastActivityMs(query)).toBe(iso("2026-03-15"));
  });

  it("coerces a Firestore Timestamp ({seconds}) and a .toDate()", () => {
    expect(lastActivityMs({ dateSent: { seconds: 1_700_000_000 } } as unknown as Query)).toBe(
      1_700_000_000 * 1000
    );
    const d = new Date("2026-05-05T00:00:00Z");
    expect(lastActivityMs({ lastStatusChange: { toDate: () => d } } as unknown as Query)).toBe(
      d.getTime()
    );
  });

  it("is null when nothing is dated (provisional import)", () => {
    expect(lastActivityMs({} as Query)).toBeNull();
  });
});

describe("recentQueries", () => {
  const mk = (id: string, date: string | null): Query =>
    ({ id, ...(date ? { dateSent: date } : {}) }) as Query;

  it("returns the n newest-active, newest first, undated last", () => {
    const list = [
      mk("a", "2026-01-01"),
      mk("b", "2026-03-01"),
      mk("c", null),
      mk("d", "2026-02-01"),
    ];
    expect(recentQueries(list, 3).map((x) => x.id)).toEqual(["b", "d", "a"]);
  });

  it("does not mutate the input array", () => {
    const list = [mk("a", "2026-01-01"), mk("b", "2026-03-01")];
    const before = list.map((x) => x.id);
    recentQueries(list, 1);
    expect(list.map((x) => x.id)).toEqual(before);
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
