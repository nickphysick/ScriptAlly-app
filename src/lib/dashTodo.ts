/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * dashTodo — the dashboard's to-do rows (v16, 18 Sep; ref design-refs/dashboard-v16-2026-09-18.html).
 *
 * A row per card on the board's live columns: the state glyph, what to do and with whom, the date the
 * clock runs from, how far through the window it is, and the day count.
 *
 * ⚠️ NOT A SECOND BOARD. The cards are `assembleBoardColumns`' — the same call the sidebar badge and
 * every Tasks page make — and every fact on a row comes from the accessors the To-do page's own list
 * rows use (`listRowInputs`, `ticketFacts`). This module arranges them; it derives nothing new about a
 * task.
 *
 * ⚠️ THE BAR IS THE LIST'S CLOCK, NOT THE PANE'S, AND THAT DIFFERENCE IS DELIBERATE. It measures the
 * elapsed figure the row already states against the window the agent stated — the same anchor the day
 * count is counted from, so the number and the bar cannot disagree. The Query Centre's pane re-bases
 * its own bar on a holding reply and answers a different question ("what am I waiting on now"); this
 * one answers "how long has this been going", which is what a list is for.
 *
 * ⚠️ AND A WINDOW NOBODY STATED IS DRAWN FAINTER (Nick, 18 Sep). Where the agency states a reply time
 * the bar is the real thing; where it does not, the house assumption (`STAGE_RESPONSE_WINDOWS`,
 * 8/12/12 weeks) fills in and `stated: false` takes the bar to 55% — so a guessed window never looks
 * like a known one.
 */
import { QueryStatus, type Query } from "../types";
import type { BoardCard } from "./todoBoard";
import { listRowInputs, type TaskData } from "./taskCardFacts";
import { ticketFacts } from "./ticketFacts";
import { STAGE_RESPONSE_WINDOWS } from "./queryAmbient";

export interface TodoBar {
  /** 0–100, clamped: a window that has run out is full, never over */
  pct: number;
  /** the agency stated this window; false means the house assumption filled in */
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
  /** null on a row with no window to draw */
  bar: TodoBar | null;
  urgent: boolean;
}

/** Which of the house windows applies to a query sitting where this one is. */
const stageOf = (status: QueryStatus | null): keyof typeof STAGE_RESPONSE_WINDOWS => {
  if (status === QueryStatus.QUERIED) return "query";
  if (status === QueryStatus.PARTIAL_REQUESTED || status === QueryStatus.PARTIAL_SENT) return "partial";
  return "full";
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
    const agent = q ? i.data.agents.find((a) => a.id === q.agentId) : undefined;
    const weeks = agent?.responseTimeWeeks;
    const stated = typeof weeks === "number" && weeks > 0;
    const status = (q?.status as QueryStatus) ?? null;
    const windowDays = (stated ? (weeks as number) : STAGE_RESPONSE_WINDOWS[stageOf(status)]) * 7;
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
      bar: q && days !== null && windowDays > 0
        ? { pct: Math.max(0, Math.min(1, days / windowDays)) * 100, stated }
        : null,
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
