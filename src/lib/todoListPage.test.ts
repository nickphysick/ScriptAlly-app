/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks for the To-do list page's derivations (workspace pack, Phase 2).
 */
import { describe, it, expect } from "vitest";
import {
  TODO_GROUPS, HOUSEKEEPING_FOLD, foldRows, isSnoozed, snoozedCount, returnedToday,
  returnedChipLabel,
} from "./todoListPage";

const NOW = Date.parse("2026-08-06T14:00:00Z");

describe("the three type groups", () => {
  it("are Urgent · Housekeeping · Your tasks & notes, each with a LIST swatch", () => {
    expect(TODO_GROUPS.map((g) => g.label)).toEqual(["Urgent", "Housekeeping", "Your tasks & notes"]);
    expect(TODO_GROUPS.map((g) => g.swatch)).toEqual(["urgent", "housekeeping", "yours"]);
  });

  it("holds the two user natures in ONE group — the side container splits them, the page does not", () => {
    // The LISTS facet has five rows (notes separate); the page has three groups. That is a
    // deliberate difference, not a drift, so it is stated rather than left to be noticed.
    expect(TODO_GROUPS).toHaveLength(3);
    expect(TODO_GROUPS.some((g) => g.id === "yours")).toBe(true);
    expect(TODO_GROUPS.some((g) => (g.id as string) === "notes")).toBe(false);
  });
});

describe("the housekeeping fold — a view, never a filter", () => {
  const rows = Array.from({ length: 41 }, (_, i) => i);

  it("shows the working number and reports the remainder", () => {
    const { shown, hidden } = foldRows(rows, false);
    expect(shown).toHaveLength(HOUSEKEEPING_FOLD);
    expect(hidden).toBe(41 - HOUSEKEEPING_FOLD);
  });

  it("expanded shows everything and hides nothing", () => {
    const { shown, hidden } = foldRows(rows, true);
    expect(shown).toHaveLength(41);
    expect(hidden).toBe(0);
  });

  it("a group at or under the limit never folds — no 'SHOW 0 MORE'", () => {
    for (const n of [0, 1, HOUSEKEEPING_FOLD]) {
      const { shown, hidden } = foldRows(rows.slice(0, n), false);
      expect(shown).toHaveLength(n);
      expect(hidden).toBe(0);
    }
  });

  it("THE FOLD DOES NOT CHANGE THE TOTAL — shown + hidden is always the whole group", () => {
    for (const expanded of [true, false]) {
      const { shown, hidden } = foldRows(rows, expanded);
      expect(shown.length + hidden).toBe(rows.length);
    }
  });
});

describe("snoozed — the set behind the foot band and the LISTS row", () => {
  const future = { snoozedUntil: "2026-08-20T00:00:00Z" };
  const past = { snoozedUntil: "2026-08-01T00:00:00Z" };

  it("counts only flags still asleep", () => {
    expect(isSnoozed(future, NOW)).toBe(true);
    expect(isSnoozed(past, NOW)).toBe(false);
    expect(isSnoozed({ snoozedUntil: undefined }, NOW)).toBe(false);
    expect(isSnoozed({ snoozedUntil: "not a date" }, NOW)).toBe(false);
    expect(snoozedCount([future, past, {}, future], NOW)).toBe(2);
  });
});

describe("returnedToday — the chip that explains a row's reappearance, for one day only", () => {
  it("true when the snooze expired earlier TODAY", () => {
    expect(returnedToday({ snoozedUntil: "2026-08-06T09:00:00Z" }, NOW)).toBe(true);
  });

  it("false once the day has turned — 'back today' must not still say so tomorrow", () => {
    expect(returnedToday({ snoozedUntil: "2026-08-05T09:00:00Z" }, NOW)).toBe(false);
  });

  it("false while it is still asleep, and for a row that was never snoozed", () => {
    expect(returnedToday({ snoozedUntil: "2026-08-20T00:00:00Z" }, NOW)).toBe(false);
    expect(returnedToday(undefined, NOW)).toBe(false);
    expect(returnedToday({ snoozedUntil: "rubbish" }, NOW)).toBe(false);
  });

  it("reads the copy register's wording, with the date it went to sleep on", () => {
    expect(returnedChipLabel("2026-08-04T09:00:00Z")).toBe("Snoozed 4 Aug · back today");
    // never the retired vocabulary
    expect(returnedChipLabel("2026-08-04T09:00:00Z")).not.toContain("wakes");
  });

  it("degrades to a plain statement rather than printing an invalid date", () => {
    expect(returnedChipLabel("nonsense")).toBe("Back today");
  });
});
