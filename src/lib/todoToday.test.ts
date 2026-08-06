/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks for the Today page's derivations (workspace pack, Phase 3).
 */
import { describe, it, expect } from "vitest";
import { BoardCard } from "./todoBoard";
import {
  todaySubtitle, clearedAtLabel, suggestedBench, benchWhy, todayQuickAddFields, BENCH_MAX,
} from "./todoToday";

const NOW = Date.parse("2026-08-06T14:32:00Z");

const card = (over: Partial<BoardCard>): BoardCard => ({
  key: "k", stream: "do", title: "t", who: "", subtitle: "", due: "", warn: false, snoozes: 0,
  hk: false, initials: "•", record: "", committed: false, done: false, ...over,
});

describe("todaySubtitle — the size of the list you committed to", () => {
  it("counts done against done + open", () => {
    expect(todaySubtitle(2, 2, NOW)).toBe("2 of 4 cleared — Thursday 6 August");
    expect(todaySubtitle(4, 0, NOW)).toBe("4 of 4 cleared — Thursday 6 August");
  });

  it("a day not yet started reads 0 of N — never '0 of 0', which would deny the plan", () => {
    expect(todaySubtitle(0, 4, NOW)).toBe("0 of 4 cleared — Thursday 6 August");
  });

  it("an empty list says so in words rather than showing a fraction of nothing", () => {
    expect(todaySubtitle(0, 0, NOW)).toBe("Nothing on today's list yet — Thursday 6 August");
  });
});

describe("clearedAtLabel — the time an item settled at", () => {
  it("is a 24h clock time, and absent when there is no stamp", () => {
    expect(clearedAtLabel(NOW)).toMatch(/^\d{2}:\d{2}$/);
    expect(clearedAtLabel(undefined)).toBe("");
    expect(clearedAtLabel(NaN)).toBe("");
  });
});

describe("the suggested bench — the four exclusions (audit item 6)", () => {
  const open = card({ key: "a", taskType: "full_requested", warn: true });
  const note = card({ key: "n", stream: "nt", nature: "note" });
  const snoozedCard = card({ key: "s", taskType: "nudge_overdue", relatedRecordId: "q-s" });
  const dismissedCard = card({ key: "d", taskType: "nudge_overdue", relatedRecordId: "q-d" });
  const onTodayCard = card({ key: "t", taskType: "partial_requested" });

  const flags = [
    { queryId: "q-s", snoozedUntil: "2026-09-01T00:00:00Z" }, // asleep
    { queryId: "q-d", skippedAt: "2026-08-01T00:00:00Z" },    // dismissed
  ];

  it("NEVER suggests a note — 'add this to today' is meaningless for a dateless thing", () => {
    const b = suggestedBench({ candidates: [note, open], flags: [], onToday: new Set(), nowMs: NOW });
    expect(b.map((i) => i.card.key)).toEqual(["a"]);
  });

  it("NEVER re-offers something snoozed — you already said not now", () => {
    const b = suggestedBench({ candidates: [snoozedCard, open], flags, onToday: new Set(), nowMs: NOW });
    expect(b.map((i) => i.card.key)).toEqual(["a"]);
  });

  it("NEVER re-offers something dismissed — you already said no", () => {
    const b = suggestedBench({ candidates: [dismissedCard, open], flags, onToday: new Set(), nowMs: NOW });
    expect(b.map((i) => i.card.key)).toEqual(["a"]);
  });

  it("NEVER suggests what is already on Today — the list you are reading", () => {
    const b = suggestedBench({ candidates: [onTodayCard, open], flags: [], onToday: new Set(["t"]), nowMs: NOW });
    expect(b.map((i) => i.card.key)).toEqual(["a"]);
  });

  it("an EXPIRED snooze is not a silence — the item is back and may be suggested again", () => {
    const expired = [{ queryId: "q-s", snoozedUntil: "2026-08-01T00:00:00Z" }];
    const b = suggestedBench({ candidates: [snoozedCard], flags: expired, onToday: new Set(), nowMs: NOW });
    expect(b.map((i) => i.card.key)).toEqual(["s"]);
  });

  it("caps at three — a longer bench is a second to-do list beside the real one", () => {
    const many = Array.from({ length: 9 }, (_, i) => card({ key: `c${i}`, taskType: "full_requested" }));
    expect(suggestedBench({ candidates: many, flags: [], onToday: new Set(), nowMs: NOW })).toHaveLength(BENCH_MAX);
  });

  it("every item carries a why-line drawn from the card's OWN facts", () => {
    const b = suggestedBench({ candidates: [open], flags: [], onToday: new Set(), nowMs: NOW });
    expect(b[0].why).toBeTruthy();
    expect(b[0].why).not.toMatch(/suggested for you/i);
  });
});

describe("benchWhy — stated, never left for the reader to infer", () => {
  it("names the real reason per kind", () => {
    expect(benchWhy(card({ taskType: "offer_received" }))).toBe("An offer is on the table");
    expect(benchWhy(card({ nature: "task", dueState: "overdue" }))).toBe("Overdue");
    expect(benchWhy(card({ nature: "task", dueState: "today" }))).toBe("Due today");
    expect(benchWhy(card({ taskType: "no_response_close", due: "SILENT 90 DAYS" }))).toBe("SILENT 90 DAYS");
  });

  it("falls back to something true rather than something vague", () => {
    expect(benchWhy(card({ warn: true }))).toBe("Waiting on you");
    expect(benchWhy(card({}))).toBe("On your list");
  });
});

describe("the quick-add makes a DATED TASK, never a note (audit item 7)", () => {
  it("always carries today's date", () => {
    expect(todayQuickAddFields("  Ring the printers  ", "2026-08-06")).toEqual({
      text: "Ring the printers",
      dueDate: "2026-08-06",
    });
  });

  it("there is no path through it that omits the date — a note here would vanish on creation", () => {
    const f = todayQuickAddFields("x", "2026-08-06");
    expect(f.dueDate).toBeTruthy();
    expect(Object.keys(f).sort()).toEqual(["dueDate", "text"]);
  });
});
