/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The six buckets, the deed and the figure column (visual rebuild, Phase 2).
 *
 * ⚠️ THE TWO THINGS MOST WORTH PINNING HERE ARE THE ONES THAT GO WRONG QUIETLY: a bucket that
 * disagrees with the family its card is filed under, and burgundy spreading past the two cases
 * that earn it. Both look fine on one row and wrong down a column.
 */
import { describe, it, expect } from "vitest";
import { BoardCard } from "./todoBoard";
import { liveFamily } from "./todoFamily";
import {
  cardBucket, bucketFamily, bucketAgreesWithFamily, BUCKET_ORDER, BUCKET_LABEL,
  rowDeed, rowMeta, rowFigure, elapsedFigure, possessive, firstName, daysSince, waitAnchorMs,
} from "./todoBuckets";

const card = (over: Partial<BoardCard> = {}): BoardCard => ({
  key: "k", stream: "do", title: "t", who: "Marcus Reed", subtitle: "", due: "", warn: false,
  snoozes: 0, hk: false, initials: "MR", record: "", committed: false, done: false,
  agentId: "a1", ...over,
});

describe("⚠️ SIX BUCKETS, AND EVERY CARD KIND LANDS IN EXACTLY ONE", () => {
  it("the six, in order, in sentence case", () => {
    expect(BUCKET_ORDER).toEqual(["send", "decide", "chase", "close", "fix", "note"]);
    expect(BUCKET_ORDER.map((b) => BUCKET_LABEL[b]))
      .toEqual(["Send", "Decide", "Chase", "Close", "Fix", "Note"]);
    /* sentence case, not caps — at 8.5px with letter-spacing, caps are a texture not a word */
    for (const b of BUCKET_ORDER) expect(BUCKET_LABEL[b]).not.toBe(BUCKET_LABEL[b].toUpperCase());
  });

  it("every kind the engine raises maps to one bucket, and the map is total", () => {
    const cases: [Partial<BoardCard>, string][] = [
      [{ taskType: "partial_requested" }, "send"],
      [{ taskType: "full_requested" }, "send"],
      [{ taskType: "revise_resubmit" }, "decide"],
      [{ taskType: "offer_received" }, "decide"],
      [{ taskType: "nudge_overdue" }, "chase"],
      [{ taskType: "no_response_close" }, "close"],
      [{ taskType: "data_quality_poor" }, "fix"],
      [{ userTaskId: "u1" }, "note"],
      [{ nature: "note" }, "note"],
    ];
    for (const [over, want] of cases) {
      expect(cardBucket(card(over)), JSON.stringify(over)).toBe(want);
    }
  });

  /**
   * ⚠️ A BUCKET MUST ROLL UP TO THE FAMILY ITS CARD IS FILED UNDER, or the pill and the group
   * heading above it claim different piles — on the same row, in the same glance. `liveFamily`
   * stays the authority for the GROUP; this is how a bucket agrees with it.
   */
  it("⚠️ THE PILL AND THE HEADING CANNOT CLAIM DIFFERENT PILES", () => {
    for (const over of [
      { taskType: "full_requested" }, { taskType: "offer_received" }, { taskType: "revise_resubmit" },
      { taskType: "nudge_overdue", stream: "hk" as const }, { taskType: "no_response_close", stream: "hk" as const },
      { taskType: "data_quality_poor", stream: "hk" as const }, { userTaskId: "u1" }, { nature: "note" as const },
    ]) {
      const c = card(over);
      expect(bucketAgreesWithFamily(c), `${cardBucket(c)} vs ${liveFamily(c)}`).toBe(true);
    }
  });

  it("the roll-up itself, stated", () => {
    expect(bucketFamily("send")).toBe("urgent");
    expect(bucketFamily("decide")).toBe("urgent");
    expect(bucketFamily("chase")).toBe("housekeeping");
    expect(bucketFamily("close")).toBe("housekeeping");
    expect(bucketFamily("fix")).toBe("housekeeping");
    expect(bucketFamily("note")).toBe("yours");
  });
});

describe("⚠️ LINE ONE IS THE DEED ALONE — no agent, no agency, no date", () => {
  it("the acts themselves, derived from the task", () => {
    expect(rowDeed(card({ taskType: "full_requested" }))).toBe("Send your full");
    expect(rowDeed(card({ taskType: "nudge_overdue" }))).toBe("Chase your query");
    expect(rowDeed(card({ taskType: "no_response_close" }))).toBe("Log the close");
  });

  it("⚠️ NO AGENT NAME REACHES LINE ONE, whatever the card's own title says", () => {
    /* the title is a composed sentence ("Send your full to Marcus Reed"); the deed is not */
    const c = card({ taskType: "full_requested", title: "Send your full to Marcus Reed" });
    expect(rowDeed(c)).not.toContain("Marcus");
  });

  it("a writer's own item keeps its own words — the one card whose text they wrote", () => {
    expect(rowDeed(card({ userTaskId: "u1", title: "Water the plants" }))).toBe("Water the plants");
  });
});

describe("⚠️ THE FIGURE'S LABEL, ITS UNIT, AND THE RARITY OF BURGUNDY", () => {
  it("⚠️ UNDER TWO DAYS READS AS A WORD — a figure nobody needs is not a figure", () => {
    expect(elapsedFigure(0)).toEqual({ value: "Today", unit: "" });
    expect(elapsedFigure(1)).toEqual({ value: "Yesterday", unit: "" });
    expect(elapsedFigure(2)).toEqual({ value: "2", unit: "days" });
  });

  /**
   * ⚠️ THE UNIT IS THE AGENT'S OWN WHERE THEY STATE ONE — an agency quoting twelve weeks gets
   * weeks, because a writer comparing "84 days" against a stated "12 weeks" has to do arithmetic
   * the app already did.
   */
  it("a stated window is honoured in its own unit; without one, days", () => {
    expect(elapsedFigure(21, 12)).toEqual({ value: "3", unit: "weeks" });
    expect(elapsedFigure(7, 12)).toEqual({ value: "1", unit: "week" });
    expect(elapsedFigure(21)).toEqual({ value: "21", unit: "days" });
  });

  it("possessives, including names ending in s", () => {
    expect(possessive("Marcus")).toBe("Marcus's");
    expect(possessive("Ada")).toBe("Ada's");
    expect(firstName("Bethany Carter")).toBe("Bethany");
    expect(firstName(undefined)).toBe("");
  });

  it("the label says whose wait it is, and the colour says the same thing", () => {
    const waiting = rowFigure({ card: card(), ballHolder: "writer", elapsedDays: 5 });
    expect(waiting.label).toBe("Marcus's waited");
    expect(waiting.side).toBe("you");
    const yours = rowFigure({ card: card(), ballHolder: "agent", elapsedDays: 5 });
    expect(yours.label).toBe("You've waited");
    expect(yours.side).toBe("them");
  });

  it("⚠️ NO FIRST NAME ON RECORD → `They've waited`, never a blank possessive", () => {
    const c = card({ who: "" });
    expect(rowFigure({ card: c, ballHolder: "writer", elapsedDays: 5 }).label).toBe("They've waited");
  });

  it("a card with no agent is Added or Noticed, and neither side is waiting", () => {
    const mine = card({ agentId: undefined, who: "", userTaskId: "u1" });
    expect(rowFigure({ card: mine, elapsedDays: 3 }).label).toBe("Added");
    expect(rowFigure({ card: mine, elapsedDays: 3 }).side).toBe("neither");
    const hk = card({ agentId: undefined, who: "" });
    expect(rowFigure({ card: hk, elapsedDays: 3 }).label).toBe("Noticed");
  });

  it("a snoozed card states its return date and nothing else", () => {
    const f = rowFigure({ card: card(), backOn: "12 Aug" });
    expect(f.label).toBe("Back on");
    expect(f.value).toBe("12 Aug");
    expect(f.hot).toBe(false);
  });

  /**
   * ⚠️ BURGUNDY IS THE PAGE'S ONLY COLOUR EMPHASIS AND IT IS RARE BY CONSTRUCTION. `hot` is
   * reachable from exactly two branches: an elapsed figure PAST a stated window, and an offer's
   * reply-by RUNNING. If it were reachable from a third the page would drift into a column of red
   * numerals, and the emphasis would stop meaning anything.
   */
  it("⚠️ HOT ONLY PAST A STATED WINDOW, OR ON A RUNNING REPLY-BY", () => {
    /* past the window */
    expect(rowFigure({ card: card(), ballHolder: "agent", statedWeeks: 4, elapsedDays: 29 }).hot).toBe(true);
    /* inside it */
    expect(rowFigure({ card: card(), ballHolder: "agent", statedWeeks: 4, elapsedDays: 27 }).hot).toBe(false);
    /* no stated window — a long wait is not a breach of anything */
    expect(rowFigure({ card: card(), ballHolder: "agent", elapsedDays: 400 }).hot).toBe(false);
    /* the reply-by */
    expect(rowFigure({ card: card({ taskType: "offer_received" }), replyWithinDays: 3 }).hot).toBe(true);
    /* and nothing else is */
    expect(rowFigure({ card: card(), backOn: "12 Aug" }).hot).toBe(false);
    expect(rowFigure({ card: card({ agentId: undefined, who: "" }), elapsedDays: 900 }).hot).toBe(false);
  });

  it("days between two instants, floored and never negative", () => {
    const d = 86400000;
    expect(daysSince(0, d * 3)).toBe(3);
    expect(daysSince(d * 3, 0)).toBe(0);
  });
});

/**
 * ⚠️ THE AGENT WAS PRINTED TWICE — rows read `Tom Ellery · Tom Ellery · Curtis Vane`. `record` is
 * already the composed meta line, and the row prefixed `who` to it again. These lock the three
 * shapes so a second composition cannot be layered back on.
 */
describe("⚠️ THE META LINE IS COMPOSED ONCE", () => {
  it("agent with agency: the name and the agency, once each", () => {
    expect(rowMeta(card({ who: "Tom Ellery", record: "Tom Ellery · Curtis Vane" })))
      .toBe("Tom Ellery · Curtis Vane");
  });

  it("⚠️ agent WITHOUT agency: the name alone — never the name twice, never a dangling separator", () => {
    /* the upstream `filter(Boolean).join(" · ")` already drops the empty half; asserted rather
       than trusted, because that is exactly the join this bug came out of */
    const line = rowMeta(card({ who: "Greg Panetta", record: "Greg Panetta" }));
    expect(line).toBe("Greg Panetta");
    expect(line).not.toMatch(/·/);
    expect(line.match(/Greg Panetta/g)).toHaveLength(1);
  });

  it("no agent at all: the standing subject, never an empty line", () => {
    expect(rowMeta(card({ who: "", record: "", userTaskId: "u1" }))).toBe("Your noteboard");
    expect(rowMeta(card({ who: "", record: "", taskType: "data_quality_poor" }))).toBe("Submission packages");
  });

  it("⚠️ NO NAME APPEARS TWICE IN ANY SHAPE", () => {
    for (const c of [
      card({ who: "Tom Ellery", record: "Tom Ellery · Curtis Vane" }),
      card({ who: "Greg Panetta", record: "Greg Panetta" }),
      card({ who: "Ada Vane", record: "Ada Vane · Vane Literary · On MURPHY'S DAY OUT" }),
    ]) {
      const line = rowMeta(c);
      expect(line.split(c.who).length - 1, line).toBe(1);
    }
  });
});

/**
 * ⚠️ THE ANCHOR IS THE EVENT THAT STARTED **THIS** WAIT. The rail measured every kind from
 * `dateSent` — when the QUERY went — so an offer received on 17 July read `127 weeks` and a full
 * requested on 2 August read `123 weeks`: both counting from the original query. And where
 * `dateSent` was absent it fell back to `now`, which is where `Today` came from on cards that had
 * waited 24 and 47 days.
 */
describe("⚠️ THE WAIT'S ANCHOR IS PER BUCKET, AND IT CAN BE ABSENT", () => {
  const JUL = "2026-07-17T09:00:00Z";
  const AUG = "2026-08-02T09:00:00Z";
  const OLD = "2024-01-05T09:00:00Z"; // the original query — never the anchor for a later wait

  it("a Send counts from the REQUEST, not from the query", () => {
    expect(waitAnchorMs("send", "full_requested", { dateSent: OLD, fullRequestedDate: AUG }))
      .toBe(Date.parse(AUG));
    expect(waitAnchorMs("send", "partial_requested", { dateSent: OLD, partialRequestedDate: JUL }))
      .toBe(Date.parse(JUL));
  });

  it("a Decide counts from the status change that brought the offer in", () => {
    expect(waitAnchorMs("decide", "offer_received", { dateSent: OLD, statusMovedAt: JUL }))
      .toBe(Date.parse(JUL));
  });

  it("a Chase counts from the LATER of the last send and the last reply", () => {
    const anchor = waitAnchorMs("chase", "nudge_overdue", {
      dateSent: OLD, fullSentDate: JUL, lastReplyAt: AUG,
    });
    expect(anchor).toBe(Date.parse(AUG));
  });

  it("a Note counts from when it was added", () => {
    expect(waitAnchorMs("note", undefined, { createdAt: AUG })).toBe(Date.parse(AUG));
  });

  /**
   * ⚠️ A FIX HAS NO ANCHOR THE RECORD CAN SUPPLY, and NaN is the honest answer. `TaskFlag` carries
   * `snoozedUntil`, `committedDate`, `skippedAt` and `resolvedAt` — every date except when the
   * flag was raised. Adding a `createdAt` to the flag is the one change that would resolve it.
   */
  it("⚠️ A FIX IS NOT RESOLVABLE — and it says so rather than guessing", () => {
    expect(Number.isNaN(waitAnchorMs("fix", "data_quality_poor", { dateSent: OLD }))).toBe(true);
  });

  it("⚠️ NO FALLBACK TO TODAY AND NONE TO THE QUERY'S CREATION — a missing anchor is NaN", () => {
    expect(Number.isNaN(waitAnchorMs("send", "full_requested", { dateSent: OLD }))).toBe(true);
    expect(Number.isNaN(waitAnchorMs("decide", "offer_received", { dateSent: OLD }))).toBe(true);
  });
});

/**
 * ⚠️ READ EVERY PAIR ALOUD. `DANIEL'S WAITED / Today` is not English — the label and the figure are
 * chosen in ONE branch so a label can never be handed a figure that does not complete it.
 */
describe("⚠️ THE LABEL AND THE FIGURE ALWAYS FORM A SENTENCE", () => {
  const c = (over: Partial<BoardCard> = {}) => card({ who: "Daniel Okafor", ...over });
  const say = (f: { label: string; value: string; unit: string }) =>
    `${f.label} ${f.value}${f.unit ? ` ${f.unit}` : ""}`.trim();

  it("agent waiting: 2+ days possessive, today and yesterday take `asked`", () => {
    expect(say(rowFigure({ card: c(), ballHolder: "writer", elapsedDays: 12 }))).toBe("Daniel's waited 12 days");
    expect(say(rowFigure({ card: c(), ballHolder: "writer", elapsedDays: 0 }))).toBe("Daniel asked Today");
    expect(say(rowFigure({ card: c(), ballHolder: "writer", elapsedDays: 1 }))).toBe("Daniel asked Yesterday");
  });

  it("writer waiting: `You've waited` at 2+, `You queried` at today and yesterday", () => {
    expect(say(rowFigure({ card: c(), ballHolder: "agent", elapsedDays: 98, statedWeeks: 12 }))).toBe("You've waited 14 weeks");
    expect(say(rowFigure({ card: c(), ballHolder: "agent", elapsedDays: 0 }))).toBe("You queried Today");
    expect(say(rowFigure({ card: c(), ballHolder: "agent", elapsedDays: 1 }))).toBe("You queried Yesterday");
  });

  it("the offer's three states each read as a sentence", () => {
    expect(say(rowFigure({ card: c(), replyWithinDays: 24 }))).toBe("Reply within 24 days");
    expect(say(rowFigure({ card: c(), replyWithinDays: 0 }))).toBe("Reply by Today");
    expect(say(rowFigure({ card: c(), replyWithinDays: -3 }))).toBe("Reply was due 3 days ago");
  });

  it("⚠️ NO ANCHOR: the label says so and there is NO figure at all", () => {
    const f = rowFigure({ card: c(), ballHolder: "agent" });
    expect(f.label).toBe("No date on record");
    expect(f.value).toBe("");
    expect(f.unit).toBe("");
    expect(f.hot).toBe(false);
  });

  it("a snoozed card, and a card with no agent", () => {
    expect(say(rowFigure({ card: c(), backOn: "15 Aug" }))).toBe("Back on 15 Aug");
    const mine = card({ who: "", agentId: undefined, userTaskId: "u1" });
    expect(say(rowFigure({ card: mine, elapsedDays: 5 }))).toBe("Added 5 days");
    expect(say(rowFigure({ card: mine, elapsedDays: 0 }))).toBe("Added Today");
  });

  it("⚠️ EVERY PAIR IS A SENTENCE — no label is ever left with a figure that does not finish it", () => {
    const pairs = [
      rowFigure({ card: c(), ballHolder: "writer", elapsedDays: 0 }),
      rowFigure({ card: c(), ballHolder: "writer", elapsedDays: 1 }),
      rowFigure({ card: c(), ballHolder: "agent", elapsedDays: 0 }),
      rowFigure({ card: c(), ballHolder: "agent", elapsedDays: 2 }),
      rowFigure({ card: c(), replyWithinDays: 0 }),
      rowFigure({ card: c(), replyWithinDays: -1 }),
    ];
    for (const f of pairs) {
      /* a possessive "…'s waited" can never sit over a word figure — that is the bug this table
         exists to make impossible */
      if (!f.unit && f.value) expect(f.label, say(f)).not.toMatch(/waited|within$/);
    }
  });

  it("⚠️ A WORD FIGURE CARRIES NO UNIT — which is how the row knows to set it at 15px", () => {
    expect(rowFigure({ card: c(), ballHolder: "agent", elapsedDays: 0 }).unit).toBe("");
    expect(rowFigure({ card: c(), ballHolder: "agent", elapsedDays: 2 }).unit).toBe("days");
  });
});
