import { describe, expect, it } from "vitest";
import { badgeText, unseenCount } from "./dashFeedSeen";
import type { FeedEntry } from "./dashFeed";

const at = (y: number, m: number, d: number, h = 10) => new Date(y, m, d, h).getTime();
const e = (ms: number) => ({ at: ms } as FeedEntry);

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
  it("reads 9+ above nine", () => {
    expect(badgeText(3)).toBe("3");
    expect(badgeText(9)).toBe("9");
    expect(badgeText(10)).toBe("9+");
  });
});
