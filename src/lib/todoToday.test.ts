/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks for the Today page's derivations (workspace pack, Phase 3).
 */
import { describe, it, expect } from "vitest";
import { BoardCard } from "./todoBoard";
import {
  todaySubtitle, clearedAtLabel, suggestedBench, benchWhy, benchHeading, todayQuickAddFields, BENCH_MAX,
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

describe("⚠️ benchWhy is a REASON, not a kind (corrections fix 7)", () => {
  it("names why THIS one, with its own evidence in it", () => {
    expect(benchWhy(card({ taskType: "offer_received" }))).toBe("an offer is on the table");
    expect(benchWhy(card({ nature: "task", dueState: "overdue" }))).toBe("overdue");
    expect(benchWhy(card({ nature: "task", dueState: "today" }))).toBe("due today");
    // a stale query is a minute's work — that is the reason to pick it, not the fact it is stale
    expect(benchWhy(card({ taskType: "no_response_close", due: "SILENT 90 DAYS" }))).toBe("about a minute");
    // the nudge carries its own age
    expect(benchWhy(card({ taskType: "nudge_overdue", due: "96 DAYS · NO REPLY" })))
      .toBe("oldest unanswered request · 96 days");
  });

  it("⚠️ NEVER echoes the KIND — that is the meta chip's job, sitting right beside it", () => {
    /* It used to fall through to `card.kind.toLowerCase()`, so the line repeated the chip and
       told you nothing you could not already see. */
    for (const kind of ["AGENT WAITING", "STALE", "WISH LIST", "OFFER"]) {
      const why = benchWhy(card({ kind, taskType: "partial_requested" }));
      expect(why.toUpperCase()).not.toBe(kind);
    }
    expect(benchWhy(card({ kind: "WISH LIST" }))).toBe("next on your list");
  });

  it("falls back to the plainest true thing, never a dressed-up kind", () => {
    expect(benchWhy(card({ warn: true }))).toBe("next on your list");
    expect(benchWhy(card({}))).toBe("next on your list");
  });
});

describe("the bench heading states the bench, not its guarantee (fix 7)", () => {
  it("reads the copy register's line", () => {
    expect(benchHeading(9)).toBe("THE MOST PRESSING OF THE 9 REMAINING");
  });

  it("⚠️ does NOT leak the exclusion promise — that is the derivation's business, and the test's", () => {
    expect(benchHeading(9)).not.toMatch(/snooz|dismiss|never/i);
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
