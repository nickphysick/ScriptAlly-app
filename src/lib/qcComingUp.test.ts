/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QC7 — ONE VOCABULARY: the Query Centre row's Coming-up line and the To-do list's item for the
 * same query come from ONE derivation, so the two surfaces cannot disagree about what is next.
 */
import { describe, expect, it } from "vitest";
import { comingUp, cardsByQuery, COMING_VERB, COMING_ACTION, SEND_VERB, trayLabel, trayOpen, trayRequest } from "./qcComingUp";
import { leadDoors, nextDoor, nextWords, NEXT_WORDS } from "./queryActions/entry";
import { nextLine } from "./qcRowLines";
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

/* RE-POINTED (ruling, 13 Oct): the Birds-eye pill is the row's one next move, card or no card. The board card's
   bucket no longer chooses the journey; `trayRequest` still maps a bucket to its journey for the surfaces that
   are a board card (the To-do page). Held in "one next move for every row" below. */
describe("v126.2 · the Birds-eye row's one next move", () => {
  it("is the row's own next move, whatever card is raised", async () => {
    const { nextMove } = await import("./qcComingUp");
    const { QueryStatus: S } = await import("../types");
    /* v141.1 — "past the date" is an expected date 5 days gone: inside the nudge window */
    const r = (status: string, court: string, o: { pastExpected?: boolean } = {}) =>
      ({ id: "q1", status, court, dayN: 30, ...o, expectedMs: o.pastExpected ? Date.now() - 5 * DAY : Date.now() + 20 * DAY } as unknown as QcRow);
    for (const t of Object.values(TYPE_FOR)) {
      expect(nextMove(card(t), r(S.QUERIED, "agent"), NOW)).toEqual({ label: "Record a response", request: { mode: "resp", queryId: "q1" } });
      expect(nextMove(card(t), r(S.QUERIED, "agent", { pastExpected: true }), NOW)).toEqual({ label: "Nudge", request: { mode: "nudge", queryId: "q1" } });
      expect(nextMove(card(t), r(S.FULL_REQUESTED, "you"), NOW)?.request.mode).toBe("sent");
    }
    expect(nextMove(undefined, r(S.OFFER, "offer"), NOW)?.request.mode).toBe("offer");
  });
});

describe("v126.2.1 · an overdue send reads '<Stage> N days over', without the verb", () => {
  it("Partial / Full once the date has passed; unchanged while it has not", () => {
    const over = comingUp(card("partial_requested"), row(NOW - 2 * DAY), NOW)!;
    expect(`${over.verb} ${over.tail?.figure}`).toBe("Partial 2 days over");
    const full = comingUp(card("full_requested"), row(NOW - 3 * DAY), NOW)!;
    expect(`${full.verb} ${full.tail?.figure}`).toBe("Full 3 days over");
    const soon = comingUp(card("partial_requested"), row(NOW + 5 * DAY), NOW)!;
    expect(soon.verb).toBe(SEND_VERB.partial);
    expect(soon.tail?.lead).toBe("in");
  });
});

/* RE-POINTED (ruling, 13 Oct): the tray's label is the panel's PRIMARY, not the panel's button for the bucket's
   journey; and no bucket keeps words of its own ("Fill it in" for the fix bucket is gone from the tray). */
describe("Query panel v1 · the tray's label is the panel's primary", () => {
  it("one label for one act, from the panel's own table", async () => {
    const { QueryStatus: S } = await import("../types");
    const { panelDoors } = await import("./queryActions/entry");
    /* v141.1 — the lead is the nudge window's (lib/nudgeWindow), so a row carries an expected date: past it by 5 days
       is a nudge, by 40 days (the old "a year with the agent" case, 400) gone quiet */
    const now = Date.now();
    const row = (status: string, court = "you", dayN: number | null = 10, pastExpected = false) =>
      ({ status, court, dayN, pastExpected, expectedMs: pastExpected ? now - 5 * DAY : dayN != null && dayN > 365 ? now - 40 * DAY : now + 20 * DAY } as never);
    expect(trayLabel("send", row(S.FULL_REQUESTED))).toBe("Mark full sent");
    expect(trayLabel("send", row(S.PARTIAL_REQUESTED))).toBe("Mark partial sent");
    expect(trayLabel("decide", row(S.OFFER, "offer"))).toBe("Record your answer");
    expect(trayLabel("chase", row(S.QUERIED, "agent", 60, true))).toBe("Nudge");
    expect(trayLabel("chase", row(S.QUERIED, "agent", 10))).toBe("Record a response");
    expect(trayLabel("close", row(S.QUERIED, "agent", 400))).toBe("Close query");
    expect(trayLabel("fix", row(S.QUERIED, "agent", 3))).toBe("Record a response");
    /* derived against the panel's table, never a second list */
    expect(trayLabel("chase", row(S.QUERIED, "agent", 60, true))).toBe(panelDoors(S.QUERIED, "nudge").find((d) => d.primary)!.label);
    expect(COMING_ACTION.fix.length).toBeGreaterThan(0);
  });
});

describe("one next move for every row (ruling, 13 Oct)", () => {
  const NOW2 = Date.now();
  /* v141.1 — RE-POINTED to the nudge window (lib/nudgeWindow): `over` is days past the expected date (null: no date
     ever, `dayN` days in the stage). The year-with-the-agent states became "past the nudge window" ones. */
  const mk = (status: string, court: string, dayN: number | null, o: { over?: number | null; kept?: boolean } = {}) => {
    const over = o.over === undefined ? -30 : o.over;
    return ({ id: "q", status, court, dayN, pastExpected: over != null && over >= 0, sentMs: dayN != null ? NOW2 - dayN * 86_400_000 : null,
      expectedMs: over == null ? null : NOW2 - over * 86_400_000, stageStartMs: dayN != null ? NOW2 - dayN * 86_400_000 : null,
      query: o.kept ? { closureOfferDismissed: true } : {} } as never);
  };
  /* every state the rule names, and what leads in it */
  const STATES: [string, never, string, string][] = [
    ["waiting, inside the date", mk("Queried", "agent", 20), "Record a response", "Waiting"],
    ["past the reply date, inside the nudge window", mk("Queried", "agent", 90, { over: 5 }), "Nudge", "Nudge"],
    ["inside the window, kept", mk("Full Sent", "agent", 200, { over: 5, kept: true }), "Nudge", "Nudge"],
    ["past the nudge window", mk("Queried", "agent", 400, { over: 40 }), "Close query", "Consider closing"],
    ["no date ever, long in the stage", mk("Partial Sent", "agent", 400, { over: null }), "Close query", "Consider closing"],
    ["past the nudge window, kept", mk("Queried", "agent", 400, { over: 40, kept: true }), "Record a response", "Waiting"],
    ["inside the last day of the nudge window", mk("Queried", "agent", 365, { over: 27.5 }), "Nudge", "Nudge"],
    ["a partial owed", mk("Partial Requested", "you", 400), "Mark partial sent", "Send partial"],
    ["a full owed", mk("Full Requested", "you", 10), "Mark full sent", "Send full"],
    ["a revision owed", mk("Revise & Resubmit", "you", 10), "Mark revision sent", "Send revision"],
    ["an offer", mk("Offer", "offer", 10), "Record your answer", "Decide on offer"],
  ];
  const cards = [null, { bucket: "chase", verb: "Nudge" }, { bucket: "close", verb: "Consider closing" }, { bucket: "fix", verb: "Record what you sent" }, { bucket: "send", verb: "Send full" }] as never[];
  it("the panel's primary, the tray's button and journey, the column and the Birds-eye pill are that one move — whatever card the board holds", async () => {
    const { nextMove } = await import("./qcComingUp");
    const leads = new Set<string>();
    for (const [name, r, lead, words] of STATES) {
      const primary = leadDoors(r).find((d) => d.primary)!;
      expect(primary.label, name).toBe(lead);
      expect(nextDoor(r)?.label, name).toBe(lead);
      expect(nextWords(r), name).toBe(words);
      expect(NEXT_WORDS[lead], name).toBe(words);
      for (const c of cards) {
        for (const b of ["chase", "close", "fix", "send", "decide"] as const) {
          expect(trayLabel(b, r), `${name} · bucket ${b}`).toBe(lead);
          expect(trayOpen(b, r)?.mode, `${name} · bucket ${b}`).toBe(primary.mode);
        }
        expect(trayOpen(null, r)?.mode, name).toBe(primary.mode);
        expect(nextMove(c, r, NOW2), name).toEqual({ label: lead, request: trayOpen(null, r) });
        expect(nextLine(r, c, NOW2).phrase, `${name} · the column`).toBe(words);
      }
      leads.add(lead);
    }
    /* every branch of the rule was entered */
    expect([...leads].sort()).toEqual(["Close query", "Mark full sent", "Mark partial sent", "Mark revision sent", "Nudge", "Record a response", "Record your answer"]);
  });
  it("Record a response is a secondary door wherever it does not lead", () => {
    for (const [name, r, lead] of STATES) {
      if (lead === "Record a response" || lead === "Record your answer") continue;
      expect(leadDoors(r).filter((d) => !d.primary).map((d) => d.label), name).toContain("Record a response");
    }
  });
  it("Close as the lead carries the no-reply reason; a closed query's move is a late reply", () => {
    expect(trayOpen("chase", mk("Queried", "agent", 400, { over: 40 }))).toEqual({ mode: "close", queryId: "q", preset: { closeWhy: "noreply" } });
    expect(nextDoor(mk("Rejected", "closed", 400))?.label).toBe("Record a late reply");
    expect(nextDoor(mk("Signed", "closed", 10))).toBeNull();
  });
  it("inside the last week of the wait the column names it \"Reply due\": the move is still Record a response", () => {
    const r = { ...(mk("Queried", "agent", 50) as object), expectedMs: NOW2 + 3 * 86_400_000 } as never;
    expect(nextDoor(r)?.label).toBe("Record a response");
    expect(nextLine(r, null, NOW2).phrase).toBe("Reply due");
  });
});
