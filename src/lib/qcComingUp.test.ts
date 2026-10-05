/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QC7 — ONE VOCABULARY: the Query Centre row's Coming-up line and the To-do list's item for the
 * same query come from ONE derivation, so the two surfaces cannot disagree about what is next.
 */
import { describe, expect, it } from "vitest";
import { comingUp, cardsByQuery, COMING_VERB, COMING_ACTION, SEND_VERB } from "./qcComingUp";
import { cardBucket, taskDeed, BUCKET_ORDER, type Bucket } from "./todoBuckets";
import type { BoardCard } from "./todoBoard";
import type { QcRow } from "./qcSummary";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 1);
const card = (taskType: string, queryId = "q1"): BoardCard =>
  ({ key: `k-${taskType}-${queryId}`, stream: "do", title: "t", who: "w", subtitle: "", due: "", warn: false,
     snoozes: 0, hk: false, initials: "AB", record: "", committed: false, done: false,
     taskType, relatedRecordId: queryId } as unknown as BoardCard);
const row = (expectedMs: number | null, id = "q1"): QcRow => ({ id, expectedMs } as unknown as QcRow);

/** The task types the board can raise, one per bucket the Query Centre can draw. */
const TYPE_FOR: Record<Exclude<Bucket, "note">, string> = {
  send: "full_requested",
  decide: "offer_received",
  chase: "nudge_overdue",
  close: "no_response_close",
  fix: "materials_missing",
};

describe("QC7 · the row's Coming-up verb is the To-do list's own derivation", () => {
  /**
   * ⚠️ THE CLAIM IS ABOUT THE BUCKET, NOT THE STRING, and that is the stronger form. The To-do list
   * says "Send your full manuscript" where this column says "Send full" — 21 characters of 13.5px
   * typewriter against a 160px column, measured — so comparing the two strings would fail on a
   * correct build. What must not differ is WHICH ACT each surface thinks is next, and that is one
   * call to `cardBucket` on both sides.
   */
  it("every bucket the board can raise is answered by BOTH surfaces, from one call", () => {
    for (const b of BUCKET_ORDER) {
      if (b === "note") continue;
      const c = card(TYPE_FOR[b]);
      expect(cardBucket(c), `${b}: the fixture's task type does not land in it`).toBe(b);
      const up = comingUp(c, row(NOW + 7 * DAY), NOW);
      expect(up, `${b}: the Query Centre says nothing is coming up`).toBeTruthy();
      expect(up!.bucket, `${b}: the two surfaces disagree about the act`).toBe(cardBucket(c));
      /* …and both have words for it, which is what "one vocabulary, two registers" means */
      expect(taskDeed(c).length, `${b}: the To-do list has no deed`).toBeGreaterThan(0);
      expect(up!.verb.length, `${b}: the column has no verb`).toBeGreaterThan(0);
      expect(up!.action.length, `${b}: the tray has no imperative`).toBeGreaterThan(0);
    }
  });

  /**
   * ⚠️ THE TABLES ARE EXHAUSTIVE BY TYPE, and this asserts they are exhaustive in FACT — a
   * `Record<Bucket, string>` with a bucket missing is a compile error, but a bucket added later
   * with an empty string is not.
   */
  it("every bucket has a verb and an imperative, and `send` has both of its pair", () => {
    for (const b of BUCKET_ORDER) {
      if (b === "note") continue;
      expect(COMING_ACTION[b], b).toBeTruthy();
      if (b !== "send") expect(COMING_VERB[b as keyof typeof COMING_VERB], b).toBeTruthy();
    }
    expect(SEND_VERB.partial).toBeTruthy();
    expect(SEND_VERB.full).toBeTruthy();
    /* a partial request and a full request are different things to send, and the column says which */
    expect(comingUp(card("partial_requested"), row(NOW + DAY), NOW)!.verb).toBe(SEND_VERB.partial);
    expect(comingUp(card("full_requested"), row(NOW + DAY), NOW)!.verb).toBe(SEND_VERB.full);
  });

  /**
   * ⚠️ A QUERY WITH NO BOARD CARD HAS NOTHING COMING UP. A task can be snoozed, dismissed or muted,
   * and a query sitting inside its agency's window raises none at all — inventing a line there would
   * be the app telling a writer to do something nobody asked of them.
   */
  it("no card, no line — and a user's own note is not a query's next step", () => {
    expect(comingUp(undefined, row(NOW), NOW)).toBeNull();
    expect(comingUp(null, row(NOW), NOW)).toBeNull();
    expect(comingUp({ ...card("x"), nature: "note", userTaskId: "u1" } as BoardCard, row(NOW), NOW)).toBeNull();
  });

  /**
   * ⚠️ ONLY A SEND AND A NUDGE CARRY A COUNTDOWN — the reference's own split, and not a length
   * compromise: a close is a judgement and an offer wants an answer rather than a countdown to one.
   */
  it("the countdown is a send's and a nudge's; a close and a decision are bare", () => {
    expect(comingUp(card("full_requested"), row(NOW + 7 * DAY), NOW)!.tail).toEqual({ lead: "in", figure: "7 days" });
    expect(comingUp(card("nudge_overdue"), row(NOW + 4 * DAY), NOW)!.tail).toEqual({ lead: "in", figure: "4 days" });
    expect(comingUp(card("offer_received"), row(NOW + 14 * DAY), NOW)!.tail, "an offer counts down").toBeNull();
    expect(comingUp(card("no_response_close"), row(NOW - 90 * DAY), NOW)!.tail, "a close counts down").toBeNull();
    /* past the date the figure is the overrun, and the lead goes */
    expect(comingUp(card("full_requested"), row(NOW - 30 * DAY), NOW)!.tail).toEqual({ lead: "", figure: "4 weeks over" });
  });

  /**
   * ⚠️ AN OFFER INSIDE ITS DEADLINE IS NOT OVERDUE. The reference draws its one offer with the ink
   * dot, which is true of ITS example and not of the state: a decision due in a fortnight has not
   * gone past anything. A close always is — the board raises one only once the window has long gone.
   */
  it("`over` is the date having gone, plus a close — never a bucket by itself", () => {
    expect(comingUp(card("offer_received"), row(NOW + 14 * DAY), NOW)!.over).toBe(false);
    expect(comingUp(card("offer_received"), row(NOW - DAY), NOW)!.over).toBe(true);
    expect(comingUp(card("no_response_close"), row(NOW + 999 * DAY), NOW)!.over).toBe(true);
    expect(comingUp(card("full_requested"), row(NOW + DAY), NOW)!.over).toBe(false);
    expect(comingUp(card("full_requested"), row(NOW - DAY), NOW)!.over).toBe(true);
  });

  /**
   * ⚠️ FIRST CARD WINS, because the board has already collapsed an agent's cards for one manuscript
   * into one piece of work — taking a later one would reverse that decision quietly.
   */
  it("`cardsByQuery` indexes on relatedRecordId, keeps the first, and drops the unattached", () => {
    const m = cardsByQuery([card("full_requested", "q1"), card("nudge_overdue", "q1"), card("offer_received", "q2"),
      { ...card("x"), relatedRecordId: undefined } as BoardCard]);
    expect([...m.keys()].sort()).toEqual(["q1", "q2"]);
    expect(m.get("q1")!.taskType).toBe("full_requested");
  });
});

describe("v126 §7 · the tray's action is one drawer door per bucket", () => {
  it("maps every bucket to a drawer journey, and Consider closing presets the no-reply reason", async () => {
    const { trayRequest } = await import("./qcComingUp");
    const { QueryStatus: S } = await import("../types");
    expect(trayRequest("send", S.PARTIAL_REQUESTED, "q")).toEqual({ mode: "sent", queryId: "q" });
    expect(trayRequest("chase", S.QUERIED, "q")).toEqual({ mode: "nudge", queryId: "q" });
    expect(trayRequest("close", S.QUERIED, "q")).toEqual({ mode: "close", queryId: "q", preset: { closeWhy: "noreply" } });
    expect(trayRequest("fix", S.QUERIED, "q")).toEqual({ mode: "edit", queryId: "q" });
    expect(trayRequest("decide", S.OFFER, "q")?.mode).toBe("offer");
  });
});
