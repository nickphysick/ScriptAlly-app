/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE PANE'S SENTENCES — enumerated over the union, never sampled.
 *
 * ⚠️ THE FOURTH DOOR WAS NOT A DEFAULT. `completionVia` and `journeySummary` were permissive
 * defaults answering as another journey; `TodoDock`'s card footer was a HARDCODED sentence —
 * "Nothing is sent from here — this records what happened." — rendered for all six buckets. Worse,
 * because it did not branch at all, and it surfaced only because it truncated mid-word on a note.
 */
import { describe, it, expect } from "vitest";
import { cardFootHint, cardBucket, type Bucket } from "./todoBuckets";
import { JOURNEY_HINT, JOURNEY_ACT, JOURNEY_PRELINE } from "./paneJourney";
import type { BoardCard } from "./todoBoard";

/** ⚠️ THE UNION ITSELF, so a new member cannot be missed by a sampling test. */
const BUCKETS: Bucket[] = ["send", "decide", "chase", "close", "fix", "note"];

/** A card that really produces each bucket, through `cardBucket` rather than by assertion. */
const cardFor = (b: Bucket): BoardCard => {
  const base = { key: "k", stream: "hk", title: "T", who: "", subtitle: "", due: "", warn: false,
    snoozes: 0, hk: true, initials: "•", record: "", committed: false, done: false } as unknown as BoardCard;
  const withType = (t: string) => ({ ...base, taskType: t } as BoardCard);
  switch (b) {
    case "send":   return withType("full_requested");
    case "decide": return withType("offer_received");
    case "chase":  return withType("nudge_overdue");
    case "close":  return withType("no_response_close");
    case "fix":    return withType("data_quality_poor");
    case "note":   return { ...base, userTaskId: "u1" } as BoardCard;
  }
};

describe("every bucket really is the bucket it claims", () => {
  it.each(BUCKETS)("%s", (b) => {
    /* ⚠️ DERIVED, not asserted — the fixture must produce the bucket through the real mapping,
       or every case below would be testing a shape the system cannot make. */
    expect(cardBucket(cardFor(b))).toBe(b);
  });
});

describe("the card footer's hint", () => {
  it("⚠️ says something DIFFERENT for every bucket — six sentences, not one", () => {
    const said = BUCKETS.map((b) => cardFootHint(cardFor(b)));
    expect(new Set(said).size).toBe(BUCKETS.length);
  });

  it("⚠️ the old hardcoded sentence is gone from every one of them", () => {
    for (const b of BUCKETS) {
      expect(cardFootHint(cardFor(b)), b).not.toBe("Nothing is sent from here — this records what happened.");
    }
  });

  it("no bucket claims a send it does not make", () => {
    for (const b of ["close", "fix", "note", "decide"] as Bucket[]) {
      expect(cardFootHint(cardFor(b)), b).not.toMatch(/records what you sent/i);
    }
  });

  it("a close says it closes, and a note says it is the writer's own", () => {
    expect(cardFootHint(cardFor("close"))).toMatch(/closes the record/i);
    expect(cardFootHint(cardFor("note"))).toMatch(/your own task/i);
  });

  it("⚠️ none of them carries a gendered pronoun for the agent", () => {
    for (const b of BUCKETS) expect(cardFootHint(cardFor(b)), b).not.toMatch(/\b(his|her|hers)\b/i);
  });
});

describe("the journey's own three tables are complete over their unions", () => {
  const KINDS = ["send", "chase", "close", "offer", "note", "fix", "materials"] as const;

  it("every kind has a pre-line, and no two share one", () => {
    const said = KINDS.map((k) => JOURNEY_PRELINE[k]);
    expect(said.every(Boolean)).toBe(true);
    expect(new Set(said).size).toBe(KINDS.length);
  });

  it("every kind but the offer has a hint and an act, each its own", () => {
    const rest = KINDS.filter((k) => k !== "offer");
    const hints = rest.map((k) => JOURNEY_HINT[k as Exclude<typeof KINDS[number], "offer">]);
    expect(hints.every(Boolean)).toBe(true);
    expect(new Set(hints).size).toBe(rest.length);
    const acts = rest.filter((k) => k !== "send")
      .map((k) => JOURNEY_ACT[k as Exclude<typeof KINDS[number], "send" | "offer">]);
    expect(acts.every(Boolean)).toBe(true);
    expect(new Set(acts).size).toBe(acts.length);
  });
});
