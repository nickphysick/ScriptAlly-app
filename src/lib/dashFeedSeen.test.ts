import { describe, expect, it } from "vitest";
import { badgeText, unseenCount } from "./dashFeedSeen";
import type { FeedEntry } from "./dashFeed";

const at = (y: number, m: number, d: number, h = 10) => new Date(y, m, d, h).getTime();
const e = (ms: number, dir: "in" | "out" = "in") => ({ at: ms, dir } as FeedEntry);

describe("the feed tab's unseen badge", () => {
  const now = new Date(2026, 9, 16, 15);
  const entries = [e(at(2026, 9, 16, 9)), e(at(2026, 9, 16, 14)), e(at(2026, 9, 15)), e(at(2026, 9, 1))];
  it("counts what arrived after the drawer was last opened", () => {
    expect(unseenCount(entries, at(2026, 9, 16, 12), now)).toBe(1);
    expect(unseenCount(entries, at(2026, 9, 14), now)).toBe(3);
    expect(unseenCount(entries, at(2026, 9, 16, 15), now)).toBe(0);
  });
  it("with no stored time, counts today's entries", () => {
    expect(unseenCount(entries, null, now)).toBe(2);
  });
  /* DFV-A (Dashboard first visit v1, A5): the writer's own acts are entries, never news — a new account opened
     with a badge of 1 (its own "added a manuscript") and S5 read 9+ with nothing from any agent */
  it("DFV-A: never counts the writer's own acts, with or without a stored time", () => {
    const mine = [e(at(2026, 9, 16, 9), "out"), e(at(2026, 9, 16, 14), "out"), e(at(2026, 9, 16, 11), "in")];
    expect(unseenCount(mine, null, now)).toBe(1);
    expect(unseenCount(mine, at(2026, 9, 16, 8), now)).toBe(1);
    expect(unseenCount([e(at(2026, 9, 16, 9), "out")], null, now)).toBe(0);
  });
  it("reads 9+ above nine", () => {
    expect(badgeText(3)).toBe("3");
    expect(badgeText(9)).toBe("9");
    expect(badgeText(10)).toBe("9+");
  });
});
