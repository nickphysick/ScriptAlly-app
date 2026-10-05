import { describe, expect, it } from "vitest";
import { QueryStatus } from "../types";
import { CZ_RECENT, carouselCountLine, carouselRows } from "./qcCarousel";
import { rowsForTile, type QcRow } from "./qcSummary";

/* built out of order on purpose: no sort can pass by luck on a fixture that arrives sorted */
const S = [QueryStatus.QUERIED, QueryStatus.PARTIAL_REQUESTED, QueryStatus.REJECTED, QueryStatus.FULL_SENT, QueryStatus.OFFER, QueryStatus.NO_RESPONSE, QueryStatus.WITHDRAWN];
const rows: QcRow[] = Array.from({ length: 21 }, (_, i) => ({
  id: `q${String(i).padStart(2, "0")}`,
  status: S[i % S.length],
  lastMs: ((i * 7919) % 101) * 86_400_000,
}) as unknown as QcRow);

describe("carouselRows (v126 §3)", () => {
  it("with nothing chosen deals the eight that moved last, most recent first", () => {
    const got = carouselRows(rows, null, "recent");
    expect(got).toHaveLength(CZ_RECENT);
    const want = rows.slice().sort((a, b) => b.lastMs - a.lastMs).slice(0, 8).map((r) => r.id);
    expect(got.map((r) => r.id)).toEqual(want);
  });
  it("oldest first reorders the same eight, never chooses a different eight", () => {
    const recent = carouselRows(rows, null, "recent").map((r) => r.id);
    const oldest = carouselRows(rows, null, "oldest").map((r) => r.id);
    expect(oldest).toEqual(recent.slice().reverse());
  });
  it("a chosen court deals every query in it, with no cap, counted by the desk's own function", () => {
    for (const c of ["you", "agent", "closed"] as const) {
      const got = carouselRows(rows, c, "recent");
      expect(got.map((r) => r.id).sort()).toEqual(rowsForTile(rows, c).map((r) => r.id).sort());
      expect(got.every((r, i) => i === 0 || r.lastMs <= got[i - 1].lastMs)).toBe(true);
    }
    expect(rowsForTile(rows, "agent").length).toBeGreaterThan(CZ_RECENT - 4);
  });
  it("states the head's count line", () => {
    expect(carouselCountLine(27, 8, null)).toBe("LAST 8 OF 27");
    expect(carouselCountLine(27, 4, "you")).toBe("4 QUERIES · FROM THE DESK");
    expect(carouselCountLine(27, 1, "you")).toBe("1 QUERY · FROM THE DESK");
  });
});
