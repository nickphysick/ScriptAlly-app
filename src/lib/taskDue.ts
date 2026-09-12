/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE TASK'S DUE DATE — the day it became the writer's to act on (list round, Phase 1; the full
 * derivation table, with where each date is written and which are missing, is
 * `run-artifacts/list-recon.md`).
 *
 * ⚠️ ONE DATE PER TASK, DERIVED AND NEVER STORED. The writer's own date wins wherever they set one —
 * a "hold me to it", a reminder on the query, a dated task — and otherwise the task's natural date:
 * the ask for a request, the arrival of an offer, the close of the agent's window for a nudge, the
 * booked check-in after a nudge, the expected reply for a silence. Every one is READ from the field
 * that already records it. Nothing here computes a day the record does not hold.
 *
 * ⚠️ WHERE NOTHING EXISTS THE ANSWER IS NULL. A housekeeping gap has no raise date anywhere —
 * `TaskFlag` carries every date except its own creation — so it says `none`, the same honest
 * absence `waitAnchorMs` already returns for `fix`. A fabricated date would sort, group and colour a
 * row on the strength of a number nobody typed.
 *
 * ⚠️ OWNER IS WHOSE CLOCK THE DATE IS, AND IT FOLLOWS THE TASK'S KIND — NEVER ITS MAGNITUDE.
 * `owed`: something is chasing the writer (an agent asked; they dated it themselves). `theirs`: the
 * agent's clock is running (their window, their expected reply). `none`: no clock runs. A request
 * is `owed` even with no date on record, because an agent still asked — the contract draws exactly
 * that row (`todo-list-view-contract.html`, the undated partial).
 */
import type { BoardCard } from "./todoBoard";
import { cardBucket, waitAnchorMs } from "./todoBuckets";
import { taskCategory, type Category } from "./todoCategory";
import { replyDeadlineMs } from "./taskPrecedence";
import { MUTED_UNTIL, flagDismissed, localYmdOf } from "./taskFlags";
import type { QueryStatus } from "../types";

export type DueOwner = "owed" | "theirs" | "none";

/** where the day came from — carried so a test, and a reader, can tell two equal days apart */
export type DueSource =
  /** the writer's own snooze return day — "hold me to it", "give it longer", the ⋯ snooze */
  | "hold"
  /** a reminder the writer set on the query — `sendReminderDate`, or `nudgeDate` before any nudge */
  | "reminder"
  /** a dated task's own `dueDate` */
  | "note"
  /** the day the agent asked — a partial, a full, an R&R */
  | "ask"
  /** the day an offer arrived */
  | "arrived"
  /** the day the agent's stated window closed */
  | "window"
  /** the check-in the writer booked when they nudged */
  | "check-in"
  | "none";

export interface DueFact {
  /** the local calendar day, "YYYY-MM-DD", or null where the record holds no date */
  ymd: string | null;
  owner: DueOwner;
  source: DueSource;
}

/**
 * The query's dates as this derivation reads them.
 *
 * ⚠️ THE TIMESTAMP-OR-STRING FIELDS ARRIVE ALREADY COERCED, by the caller's `isoOf` — the one
 * coercion `taskCardFacts` owns. And the two DERIVED dates are named for what they are here
 * (`statusMovedAt`, `lastReplyAt`), exactly as `AnchorInput` names them, because `recomputeQuery`'s
 * single-writer sweep reads an object key spelled like either field as a write.
 */
export interface DueQuery {
  status?: QueryStatus | string;
  dateSent?: string;
  responseDeadline?: string;
  partialRequestedDate?: string;
  fullRequestedDate?: string;
  partialSentDate?: string;
  fullSentDate?: string;
  nudgeDate?: string;
  lastNudgeSentDate?: string;
  sendReminderDate?: string;
  statusMovedAt?: string;
  lastReplyAt?: string;
}

export interface DueInput {
  card: BoardCard;
  query?: DueQuery;
  /** the QUERY's agent — the window belongs to the agent, the dates to the query (`replyTaskFor`) */
  agent?: { responseTimeWeeks?: number; noResponseMeansNo?: boolean };
  userTask?: { dueDate?: string };
  /** the card's own flag — `flagForCard`'s answer, never a second lookup */
  flag?: { snoozedUntil?: string; skippedAt?: string };
}

const DAY_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Any date the record holds, as the LOCAL day it falls on — or null.
 *
 * ⚠️ A `YYYY-MM-DD` IS TAKEN AS THE DAY IT NAMES, NEVER PARSED. `Date.parse("2026-09-14")` is UTC
 * midnight, which is the evening of the 13th anywhere west of Greenwich — a dated task would move
 * back a day for every writer in the Americas, silently. An instant is read on the local clock, the
 * same clock `flagSleeps` draws the snooze boundary with.
 */
export function ymdOf(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (typeof v === "string") {
    const t = v.trim();
    if (DAY_ONLY.test(t)) return t;
    const ms = Date.parse(t);
    return Number.isFinite(ms) ? localYmdOf(ms) : null;
  }
  if (typeof v === "number") return Number.isFinite(v) ? localYmdOf(v) : null;
  if (v instanceof Date) return Number.isFinite(v.getTime()) ? localYmdOf(v.getTime()) : null;
  const d = (v as { toDate?: () => Date } | null)?.toDate?.();
  return d instanceof Date && Number.isFinite(d.getTime()) ? localYmdOf(d.getTime()) : null;
}

/**
 * Whole calendar days from `from` to `to` — positive when `to` is later.
 *
 * ⚠️ IN UTC DAYS, BECAUSE THE DAYS ARE ALREADY LOCAL. Both arguments are local calendar days; taking
 * their difference as UTC midnights makes every day exactly 86,400,000ms, so a clock change in
 * between cannot turn two days into 1.96 and round it to the wrong answer.
 */
export function daysBetweenYmd(from: string, to: string): number {
  const at = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((at(to) - at(from)) / 86400000);
}

/**
 * ⚠️ THE REAL DAYS — what the list sorts by, never the rounded figure it prints. Positive is past
 * due, zero is due today, negative is still ahead.
 */
export const overdueDays = (ymd: string, todayYmd: string): number => daysBetweenYmd(ymd, todayYmd);

/**
 * WHEN a task falls, as the landing state groups it (list round, Phase 3) — the contract's own
 * `bucket()`: anything past its day is Overdue, today and the next seven days are Due this week,
 * further ahead is Coming up, and a task with no date is No date.
 *
 * ⚠️ "THIS WEEK" IS A ROLLING SEVEN DAYS, NOT THE CALENDAR'S. The contract counts from today, so a
 * task due on Sunday is in this week on Monday and still in it on Friday — which is the question a
 * writer is asking ("what is coming"), and it cannot empty itself as the week runs out.
 */
export type WhenBucket = "over" | "week" | "later" | "none";
export const WHEN_ORDER: WhenBucket[] = ["over", "week", "later", "none"];
export const WHEN_LABEL: Record<WhenBucket, string> = {
  over: "Overdue", week: "Due this week", later: "Coming up", none: "No date",
};

export function whenBucket(ymd: string | null, todayYmd: string): WhenBucket {
  if (!ymd) return "none";
  const n = overdueDays(ymd, todayYmd);
  if (n > 0) return "over";
  return n >= -7 ? "week" : "later";
}

/**
 * The writer's hold, as the day it returns — or null.
 *
 * ⚠️ A MUTE IS NOT A DATE AND A DISMISSAL IS THE LATER WORD. `MUTED_UNTIL` is "stop asking" wearing a
 * year-3000 instant, and a dismissed flag may still carry the snooze that preceded it; neither is a
 * day the writer asked to be held to. Both fall through to the task's natural date.
 */
function holdYmd(flag?: DueInput["flag"]): string | null {
  if (!flag?.snoozedUntil || flagDismissed({ skippedAt: flag.skippedAt })) return null;
  const at = Date.parse(flag.snoozedUntil);
  if (!Number.isFinite(at) || at >= Date.parse(MUTED_UNTIL)) return null;
  return localYmdOf(at);
}

/** the agent's window, through the ONE deadline `replyTask` and the Query Centre's rows share */
function windowYmd(q: DueQuery | undefined, agent: DueInput["agent"]): string | null {
  if (!q) return null;
  const ms = replyDeadlineMs({
    status: q.status as QueryStatus,
    dateSent: q.dateSent,
    responseDeadline: q.responseDeadline,
    responseTimeWeeks: agent?.responseTimeWeeks,
    noResponseMeansNo: !!agent?.noResponseMeansNo,
    now: 0,
  });
  return Number.isFinite(ms) ? localYmdOf(ms) : null;
}

/**
 * Whose clock a day is on.
 *
 * ⚠️ A REQUEST IS OWED WITH OR WITHOUT A DATE; EVERYTHING ELSE NEEDS ONE TO BE ANYBODY'S. An agent
 * asked, so the writer owes it whether or not the record says when. A nudge or a silence with no
 * computable window has no clock at all, and a housekeeping gap or a note only becomes the writer's
 * debt once somebody — the writer — dated it.
 */
export function dueOwner(cat: Category, ymd: string | null): DueOwner {
  if (cat === "req") return "owed";
  if (!ymd) return "none";
  return cat === "nudge" || cat === "quiet" ? "theirs" : "owed";
}

export function taskDue(i: DueInput): DueFact {
  const { card, query: q, agent, userTask, flag } = i;
  const cat = taskCategory(card);
  const fact = (ymd: string | null, source: DueSource): DueFact =>
    ({ ymd, owner: dueOwner(cat, ymd), source: ymd ? source : "none" });

  /* the date they set wins, whatever the task — a writer who said "hold me to the 14th" is on the
     14th, not on the day the agent asked */
  const held = holdYmd(flag);
  if (held) return fact(held, "hold");

  const bucket = cardBucket(card);
  switch (bucket) {
    case "note":
      return fact(ymdOf(userTask?.dueDate ?? card.dueYmd), "note");

    case "send":
    case "decide": {
      /* ⚠️ THE REMINDER IS THE WRITER'S; THE OFFER HAS NONE. `sendReminderDate` is the record-response
         form's "Send yourself a reminder" / "Remind yourself to resubmit by" — a request's or an
         R&R's own date. An offer's only writer-set day is its "I need time" hold, read above. */
      if (card.taskType !== "offer_received") {
        const r = ymdOf(q?.sendReminderDate);
        if (r) return fact(r, "reminder");
      }
      /* ⚠️ THE ANCHOR IS `waitAnchorMs`'s — the request date for a send, the status change for an
         offer or an R&R — so the Due chip names the same day the ticket's "Asked on" / "Came in"
         states and the row's days are counted from. A second anchor here is how two cells in one
         row come to disagree about when something happened. */
      const ms = waitAnchorMs(bucket, card.taskType, {
        dateSent: q?.dateSent,
        partialRequestedDate: q?.partialRequestedDate,
        fullRequestedDate: q?.fullRequestedDate,
        partialSentDate: q?.partialSentDate,
        fullSentDate: q?.fullSentDate,
        lastNudgeSentDate: q?.lastNudgeSentDate,
        lastReplyAt: q?.lastReplyAt,
        statusMovedAt: q?.statusMovedAt,
      });
      return fact(Number.isFinite(ms) ? localYmdOf(ms) : null,
        card.taskType === "offer_received" ? "arrived" : "ask");
    }

    case "chase": {
      /* ⚠️ `nudgeDate` MEANS TWO THINGS AND THE CARD ALREADY SAYS WHICH. Before any nudge it is the
         writer's planned nudge — the date `replyTask` raises this very task on; after one it is the
         check-in `buildNudgeWrites` booked. `reason` was recorded by the derivation that had the
         query in hand, so it is read, not re-decided. */
      const n = ymdOf(q?.nudgeDate);
      if (n) return fact(n, card.reason === "nudge-again" ? "check-in" : "reminder");
      return fact(windowYmd(q, agent), "window");
    }

    case "close": {
      /* the expected reply: the booked check-in once the query has been chased, else the window */
      const n = q?.lastNudgeSentDate ? ymdOf(q?.nudgeDate) : null;
      if (n) return fact(n, "check-in");
      return fact(windowYmd(q, agent), "window");
    }

    case "fix":
      /* no raise date exists — see the header; the hold above is the only way one gets a day */
      return fact(null, "none");

    default: {
      const unhandled: never = bucket;
      return unhandled;
    }
  }
}
