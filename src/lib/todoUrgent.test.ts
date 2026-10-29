/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v12 — the Needs you now rule, order and summary (lib/todoUrgent).
 */
import { describe, expect, it } from "vitest";
import { isUrgent, urgentFigures, urgentOrder, urgentSummaryText } from "./todoUrgent";

const TODAY = "2026-10-15";
type G = "you" | "chase" | "quiet" | "tidy" | "mine";
const item = (id: string, g: G, ymd: string | null, taskType?: string) => ({
  id, group: { id: g }, dial: { ymd, kind: ymd == null ? "none" : ymd < TODAY ? "late" : "run" }, card: { taskType },
}) as unknown as Parameters<typeof isUrgent>[0] & { id: string };

describe("isUrgent", () => {
  it("Your move: an offer whatever its date, else due today or earlier", () => {
    expect(isUrgent(item("a", "you", null, "offer_received"), TODAY)).toBe(true);
    expect(isUrgent(item("b", "you", "2026-10-30", "offer_received"), TODAY)).toBe(true);
    expect(isUrgent(item("c", "you", TODAY, "full_requested"), TODAY)).toBe(true);
    expect(isUrgent(item("d", "you", "2026-10-01", "partial_requested"), TODAY)).toBe(true);
    expect(isUrgent(item("e", "you", "2026-10-16", "partial_requested"), TODAY)).toBe(false);
    expect(isUrgent(item("f", "you", null, "revise_resubmit"), TODAY)).toBe(false);
  });
  it("Worth a nudge: only strictly overdue", () => {
    expect(isUrgent(item("a", "chase", "2026-10-14"), TODAY)).toBe(true);
    expect(isUrgent(item("b", "chase", TODAY), TODAY)).toBe(false);
    expect(isUrgent(item("c", "chase", null), TODAY)).toBe(false);
  });
  it("your own tasks: due today or earlier", () => {
    expect(isUrgent(item("a", "mine", TODAY), TODAY)).toBe(true);
    expect(isUrgent(item("b", "mine", "2026-09-01"), TODAY)).toBe(true);
    expect(isUrgent(item("c", "mine", "2026-10-16"), TODAY)).toBe(false);
  });
  it("Gone quiet and Housekeeping never lead, however overdue", () => {
    expect(isUrgent(item("a", "quiet", "2025-01-01"), TODAY)).toBe(false);
    expect(isUrgent(item("b", "tidy", "2025-01-01"), TODAY)).toBe(false);
  });
});

describe("urgentOrder", () => {
  it("Your move (offer first), then your own tasks, then nudges; most overdue first within each", () => {
    const list = [
      item("nudge-new", "chase", "2026-10-10"), item("mine-today", "mine", TODAY), item("you-old", "you", "2026-07-26", "partial_requested"),
      item("nudge-old", "chase", "2026-09-01"), item("offer", "you", "2026-10-23", "offer_received"), item("mine-old", "mine", "2026-10-01"),
      item("you-today", "you", TODAY, "full_requested"),
    ];
    expect(urgentOrder(list).map((x) => (x as { id: string }).id)).toEqual(
      ["offer", "you-old", "you-today", "mine-old", "mine-today", "nudge-old", "nudge-new"]);
  });
});

describe("the summary line", () => {
  it("names each non-zero part, joined with 'and'", () => {
    const list = [item("a", "you", "2026-07-26", "partial_requested"), item("b", "chase", "2026-09-01"), item("c", "mine", TODAY), item("d", "you", "2026-10-23", "offer_received")];
    expect(urgentSummaryText(urgentFigures(list, TODAY))).toBe("4 things to do first: 2 overdue, 1 due today and an offer to answer.");
  });
  it("leaves zero parts out; 'One thing' for one", () => {
    expect(urgentSummaryText(urgentFigures([item("a", "mine", TODAY)], TODAY))).toBe("One thing to do first: 1 due today.");
    expect(urgentSummaryText(urgentFigures([item("a", "chase", "2026-10-01"), item("b", "chase", "2026-10-02")], TODAY))).toBe("2 things to do first: 2 overdue.");
    expect(urgentSummaryText(urgentFigures([item("a", "you", null, "offer_received"), item("b", "you", null, "offer_received")], TODAY))).toBe("2 things to do first: 2 offers to answer.");
  });
  it("is empty when nothing leads", () => {
    expect(urgentSummaryText(urgentFigures([], TODAY))).toBe("");
  });
});
