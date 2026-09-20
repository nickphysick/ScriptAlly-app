/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * dashTodo — the dashboard's to-do rows (v16, 18 Sep; ref design-refs/dashboard-v16-2026-09-18.html).
 *
 * A row per card on the board's live columns: the state glyph, what to do and with whom, the date the
 * clock runs from, and the day count.
 *
 * ⚠️ NOT A SECOND BOARD. The cards are `assembleBoardColumns`' — the same call the sidebar badge and
 * every Tasks page make — and every fact on a row comes from the accessors the To-do page's own list
 * rows use (`listRowInputs`, `ticketFacts`). This module arranges them; it derives nothing new about a
 * task.
 *
 * ⚠️ THE PROGRESS BAR IS RETIRED (20 Sep) — the row states its age as a figure, and a bar beside a
 * figure is the same fact drawn twice. It was the only reader of `TodoBar`, so the type went with it;
 * what survives is `replyWindow`, which is the half that was never about drawing. The task panel's
 * "reply expected" reads it, and a second derivation of a reply window is how two surfaces come to
 * disagree about when a reply is due.
 */
import { QueryStatus, type Query } from "../types";
import type { BoardCard } from "./todoBoard";
import { listRowInputs, type TaskData } from "./taskCardFacts";
import { ticketFacts } from "./ticketFacts";
import { STAGE_RESPONSE_WINDOWS } from "./queryAmbient";

/**
 * How long the agency has to reply to a query sitting where this one is.
 *
 * ⚠️ ONE DERIVATION, BECAUSE TWO SURFACES STATE IT. The to-do row counts a query's age against this
 * window and the task panel's "reply expected" is this window added to the anchor; derived twice,
 * they would eventually disagree about when a reply is due, and neither would look wrong.
 *
 * `stated: false` means the AGENCY said nothing and the house assumption filled in
 * (`STAGE_RESPONSE_WINDOWS`, 8/12/12 weeks) — a guess must never be presented as a fact.
 */
export interface ReplyWindow {
  days: number;
  stated: boolean;
}

/** The card's sentence, split so the row can set the person in italic. */
export interface TodoTitle { pre: string; who: string; post: string }

/**
 * ⚠️ THIS READS A STATED RELATIONSHIP, IT DOES NOT PARSE PROSE. `BoardCard.who` is documented as "the
 * emphasised name INSIDE the title" — the board builds both from the same record — so finding it is a
 * lookup rather than a guess. Where it does not appear (a card with no person, a title the board
 * composed differently) the row states the title plain, which is what it would have done anyway.
 */
export const splitTitle = (title: string, who: string): TodoTitle => {
  const i = who ? title.indexOf(who) : -1;
  if (i < 0) return { pre: title, who: "", post: "" };
  return { pre: title.slice(0, i), who, post: title.slice(i + who.length) };
};

/**
 * ⚠️ A ROW THE WRITER HAS JUST TICKED (feed/to-do round, 20 Sep).
 *
 * Ticking opens the task panel and the panel does the writing; when it commits, the board stops
 * raising that card and the row would simply VANISH — which is the one thing a writer who has just
 * acted must not see, because they cannot tell "recorded" from "lost". So the card holds the row
 * where it was, struck through, saying what went down and offering the way back.
 *
 * ⚠️ `undo` IS A HANDLE, NOT A FLAG, and its absence is meaningful: a completion whose window has
 * closed still shows what was logged and simply offers no way back. A boolean here would have made
 * the row render a dead link — and this repo has already paid for an Undo that restored nothing.
 */
export interface TodoDone {
  /** what the tick recorded, in the app's own words — "Nudge logged", "Full sent" */
  logged: string;
  /** reverses that write; absent once it can no longer be reversed */
  undo?: () => void;
}

export interface TodoRow {
  /** the board card's own key — the drawer opens on it */
  key: string;
  /** the query this is about, where there is one */
  queryId: string | null;
  /** the query's current status, for the glyph; null on a row that is not about a query */
  status: QueryStatus | null;
  /** "Send your full to Jonathan Marsh", split around the person */
  title: TodoTitle;
  /** the mono line beneath — "Asked on 22 August", or what the card is instead */
  meta: string;
  /** the day figure at the right; null where nothing is being counted */
  days: number | null;
  urgent: boolean;
  /**
   * ⚠️ HELD, NEVER DERIVED. `todoRows` always returns `null` here — a completion is something that
   * happened in this session, not a fact about the board, and the board has by then stopped raising
   * the card at all. The CARD holds it and stamps it on (see `OneScreenTasks`), which is why the
   * shape lives on the row rather than beside it: one thing decides what a row looks like.
   */
  done: TodoDone | null;
}

/** Which of the house windows applies to a query sitting where this one is. */
const stageOf = (status: QueryStatus | null): keyof typeof STAGE_RESPONSE_WINDOWS => {
  if (status === QueryStatus.QUERIED) return "query";
  if (status === QueryStatus.PARTIAL_REQUESTED || status === QueryStatus.PARTIAL_SENT) return "partial";
  return "full";
};

/** @see ReplyWindow — the agency's own figure where it gave one, the house window where it did not. */
export const replyWindow = (
  status: QueryStatus | null,
  responseTimeWeeks: number | undefined,
): ReplyWindow => {
  const stated = typeof responseTimeWeeks === "number" && responseTimeWeeks > 0;
  const weeks = stated ? (responseTimeWeeks as number) : STAGE_RESPONSE_WINDOWS[stageOf(status)];
  return { days: weeks * 7, stated };
};

export interface TodoRowsInput {
  cards: readonly BoardCard[];
  data: TaskData;
  /** the cards the board itself calls urgent — the row does not decide this */
  isUrgent?: (c: BoardCard) => boolean;
}

export const todoRows = (i: TodoRowsInput): TodoRow[] =>
  i.cards.map((c) => {
    const inputs = listRowInputs(c, i.data);
    const facts = ticketFacts(c, { days: inputs.days, dateLabel: inputs.anchorDate });
    const q: Query | undefined = c.relatedRecordId
      ? i.data.queries.find((x) => x.id === c.relatedRecordId)
      : undefined;
    const status = (q?.status as QueryStatus) ?? null;
    const days = inputs.days;
    return {
      key: c.key,
      queryId: c.relatedRecordId ?? null,
      status,
      title: splitTitle(c.title, c.who ?? ""),
      /* ⚠️ THE TICKET'S OWN WORDS — "Asked on 22 August". A second vocabulary for the same fact is
         how two surfaces come to call one date two things. Where there is no date the ticket says so
         with its em dash, and the row states the card's own meta line instead. */
      meta: inputs.anchorDate ? `${facts.dateKey} ${facts.dateValue}` : (c.record || facts.spanKey),
      days,
      done: null,
      urgent: i.isUrgent ? i.isUrgent(c) : false,
    };
  });

/**
 * The foot's figure — how many live cards the card is not showing.
 *
 * ⚠️ IT COUNTS THE BOARD, NOT THE VIEWPORT. The rows scroll, so "more waiting" is about the tasks
 * beyond this card's own list rather than the ones below the fold, and it is 0 when the card holds
 * everything (the foot then states the total and the link, never "0 more").
 */
export const moreWaiting = (total: number, shown: number): number => Math.max(0, total - shown);
