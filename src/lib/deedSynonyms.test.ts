/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ ONE CARD, ONE DEED — asserted as an IDENTITY between the two surfaces, not as each reading the
 * right variable. There were three wordings for one card (`listDeed` "Consider closing", `rowDeed`
 * "Log the close", and `card.title` on notes), which is the three-activity-stores disease in copy:
 * every one of them read correctly and they disagreed anyway.
 *
 * A test that checked "the band reads `rowDeed`" would have passed throughout. This compares the
 * two DERIVATIONS against each other for every card type, so a future synonym fails here rather
 * than on a screen.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { taskDeed } from "./todoBuckets";
import { listDeed } from "./taskListRow";
import { bandDeed } from "./todoHandoff";
import { BoardCard } from "./todoBoard";

const card = (over: Partial<BoardCard>): BoardCard => ({
  key: "k", stream: "do", title: "A sentence the card happens to carry", who: "Ana Duarte",
  subtitle: "", due: "", warn: false, snoozes: 0, hk: false, initials: "AD", record: "Duarte Words",
  committed: false, done: false, ...over,
} as BoardCard);

const TYPES = [
  "partial_requested", "full_requested", "revise_resubmit",
  "offer_received", "nudge_overdue", "no_response_close",
  "materials_unrecorded", "materials_unrecorded_bulk",
];

describe("the row and the band say the same thing", () => {
  it("every task type renders one string across both surfaces", () => {
    for (const taskType of TYPES) {
      const c = card({ taskType });
      const row = listDeed({ card: c, partial: taskType === "partial_requested" });
      const band = bandDeed(c);
      expect(band, `${taskType}: the band and the row disagree`).toBe(row);
      expect(band, `${taskType}: the deed fell back to the card's sentence`)
        .not.toBe(c.title);
    }
  });

  it("a note's deed is the writer's own words on both surfaces", () => {
    /* ⚠️ NOT A SYNONYM — a note's deed IS `card.title`, which is a different fact from three
       wordings for one derived deed. Asserted so the collapse above cannot swallow it. */
    const n = card({ nature: "note", userTaskId: "u1", title: "Check W&A for new agents" });
    expect(listDeed({ card: n })).toBe("Check W&A for new agents");
    expect(bandDeed(n)).toBe("Check W&A for new agents");
  });

  it("no retired verb survives in any deed", () => {
    /* the review's four, as WORDS a reader sees */
    for (const taskType of TYPES) {
      const d = taskDeed(card({ taskType })).toLowerCase();
      for (const v of ["log", "record", "mark", "chase"]) {
        /* "Fill in what you sent" is the fix deed; "record" must not appear in any of them */
        expect(d, `${taskType} says "${v}"`).not.toMatch(new RegExp("\\b" + v + "\\b"));
      }
    }
  });

  it("⚠️ `rowDeed` is an alias, and nothing reads it as a second table", () => {
    /* ⚠️ ON DECLARATIONS — the deprecation note names `rowDeed` while explaining it. */
    const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    const buckets = strip(readFileSync(join(__dirname, "todoBuckets.ts"), "utf8"));
    /* one line, delegating — never a switch of its own */
    expect(buckets).toContain("export const rowDeed = (c: BoardCard): string => taskDeed(c);");
    for (const dead of ["Answer the offer", "Chase your query", "Log the close", "Send your full\""]) {
      expect(buckets, `the old table survives: ${dead}`).not.toContain(dead);
    }
  });
});
