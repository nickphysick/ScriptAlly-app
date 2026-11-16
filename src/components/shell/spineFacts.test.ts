/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Manuscript spine v1 — the label's facts line. Four cases, as the brief names them: many with a date, one with a
 * date, some without a date, none. The date is `queryingSince` (the earliest sent date) through `dayMonth`.
 */
import { describe, it, expect } from "vitest";
import { spineFacts, switcherFacts } from "./BarSwitcher";

const q = (dateSent?: string) => ({ dateSent }) as { dateSent?: string };

describe("spineFacts", () => {
  it("many with a date: the count, then the earliest sent day", () => {
    const qs = [q("2025-12-09"), q("2025-12-05"), ...Array.from({ length: 26 }, () => q("2026-01-14"))];
    expect(qs).toHaveLength(28);
    expect(spineFacts(qs)).toBe("28 queries since 5 Dec");
  });
  it("one with a date: singular", () => {
    expect(spineFacts([q("2025-12-05")])).toBe("1 query since 5 Dec");
  });
  it("some without a date: the count alone", () => {
    expect(spineFacts([q(), q(), q()])).toBe("3 queries");
  });
  it("none", () => {
    expect(spineFacts([])).toBe("No queries yet");
  });
  it("leaves the menu's line as it was", () => {
    expect(switcherFacts([q("2025-12-05"), q("2026-01-02")])).toBe("Querying since 5 Dec · 2 queries");
  });
});
