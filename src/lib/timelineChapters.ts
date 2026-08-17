/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * timelineChapters — a long query read as ROUNDS rather than as events (§1, ref 154-timeline.html,
 * treatment B).
 *
 * ⚠️ A READING OF THE SEQUENCE, NEVER A STORED FIELD. Exactly like status: nothing writes a chapter,
 * nothing migrates when the rule changes, and a corrected activity re-chapters the timeline the
 * moment it lands. Pure so the rule can be locked without a browser.
 *
 * ⚠️ A CHAPTER OPENS AT THE REQUEST THAT STARTS THE ROUND, NOT AT THE SEND THAT ANSWERS IT — the
 * ref's grouping, reinstated. An earlier pass opened chapters on the outbound send, reasoning that a
 * chapter should never be named after work the writer had not done; the cost was worse in both
 * directions. It put "Partial requested" at the END of the previous round, so the heading "The
 * partial" fell BETWEEN the request and the send that answered it — the two events a reader most
 * needs to see together. And because it took two sends to make two chapters, a query in the writer's
 * court showed no rounds at all, which is exactly when the reader most wants to see where they are.
 * A round is the exchange; the request is what opens it.
 *
 * ⚠️ AND NEITHER THE SEND SET NOR THE LABEL IS A HAND-WRITTEN LIST OF STATUSES. Both come out of the
 * CTA engine: a status is a SEND when some other status's mark-sent action TARGETS it, and a round's
 * SUBJECT is the `markKind` of the request that opened it. That is what lets one status carry two
 * labels — a `Full sent` after `Full requested` is "The full", and the same status after a
 * `Revise & Resubmit` is "Revise and resubmit" — which a per-status lookup could never express.
 */
import { QueryStatus } from "../types";
import { getPrimaryAction } from "./queryPrimaryAction";

/** What a round is ABOUT. `markKind`'s three values, plus the initial send no request precedes. */
export type ChapterSubject = "query" | "partial" | "full" | "resubmit";

/** Everything a request can ask the writer to send — derived, so a new one arrives for free. */
const SEND_TARGETS: QueryStatus[] = Object.values(QueryStatus)
  .map((s) => getPrimaryAction(s))
  .flatMap((a) => (a.kind === "mark-sent" ? [a.target] : []));

/**
 * Does this status OPEN a round? A REQUEST does — it is the event the round is about.
 *
 * ⚠️ DERIVED FROM THE CTA ENGINE, never a list of statuses: a request is exactly a status whose
 * primary action is "mark something as sent", which is the same fact the command bar's button and
 * the agent list's whose-turn axis read. A new request status joins without an edit here.
 */
export const isRequestStatus = (status: QueryStatus): boolean => getPrimaryAction(status).kind === "mark-sent";

/** A send is anything a request can target, plus the first query, which no request precedes. */
export const isSendStatus = (status: QueryStatus): boolean =>
  status === QueryStatus.QUERIED || SEND_TARGETS.includes(status);

/** The statuses whose mark-sent action produces `target`, in enum order. */
const producersOf = (target: QueryStatus): QueryStatus[] =>
  Object.values(QueryStatus).filter((s) => {
    const a = getPrimaryAction(s);
    return a.kind === "mark-sent" && a.target === target;
  });

/**
 * What the round this row opens is ABOUT.
 *
 * ⚠️ THE REQUEST NAMES ITS OWN ROUND — its `markKind` IS the subject, which is why one status can
 * head two differently-named rounds: a `Full sent` after `Full requested` belongs to "The full",
 * the same status after an R&R belongs to "Revise and resubmit". A per-status lookup could not
 * express that, and here it does not have to: the opener is the request, and the request knows.
 *
 * ⚠️ AND A SEND CAN STILL OPEN THE FIRST CHAPTER, because something has to. `Queried` is the
 * ordinary case; a log that begins at `Partial sent` with no request recorded (an import, a
 * correction) is named from the request that WOULD have produced it, in enum order — still derived,
 * and still better than an unnamed round.
 */
export function openerSubject(status: QueryStatus): ChapterSubject {
  if (status === QueryStatus.QUERIED) return "query";
  const own = getPrimaryAction(status);
  if (own.kind === "mark-sent") return own.markKind;
  const first = producersOf(status)[0];
  if (first) {
    const a = getPrimaryAction(first);
    if (a.kind === "mark-sent") return a.markKind;
  }
  return "query";
}

/**
 * ⚠️ THREE OF THE FOUR ARE BUILT FROM THE SUBJECT WORD; the fourth is spelled out because English
 * will not take it — "the resubmit" is not a phrase, and the round is universally called by the
 * request that opened it. One exception, stated, rather than a table of four.
 */
export const chapterLabel = (subject: ChapterSubject): string =>
  subject === "resubmit" ? "Revise and resubmit" : `The ${subject}`;

const ORDINAL = ["", "", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth"];

/**
 * The same label twice is a real case — two partials, two revisions — and two identical headings
 * would say the timeline had repeated itself rather than that the writer had.
 *
 * ⚠️ THE ORDINAL GOES WHERE ENGLISH WANTS IT. A label beginning "The " takes it inside ("The second
 * partial"); anything else takes it in parentheses, which is the only form that survives a label
 * that is already a sentence fragment.
 */
export function qualifyChapterLabel(label: string, nth: number): string {
  if (nth <= 1) return label;
  const word = ORDINAL[nth] ?? `${nth}th`;
  return label.startsWith("The ") ? `The ${word} ${label.slice(4)}` : `${label} (${word})`;
}

export interface Chapter<T> {
  label: string;
  subject: ChapterSubject;
  rows: T[];
}

export interface ChapteredTimeline<T> {
  chapters: Chapter<T>[];
  /**
   * ⚠️ THE THRESHOLD LIVES HERE, NOT IN THE COMPONENT. "The query" over a single line is worse than
   * no heading at all, so labels appear only once there is more than one round to tell apart — and
   * that is a fact about the derivation, which is where a renderer can neither forget it nor apply
   * a different figure on a second surface.
   */
  labelled: boolean;
}

/** A row this can chapter: its status, and whether it is a status row at all. */
export interface ChapterableRow {
  status: QueryStatus | string;
  /** Non-status rows (nudges, notes) never open a chapter — they belong to the round they fall in. */
  kind?: string;
}

export function chapterise<T extends ChapterableRow>(rows: T[]): ChapteredTimeline<T> {
  const chapters: Chapter<T>[] = [];

  for (const row of rows) {
    const status = row.status as QueryStatus;
    /* ⚠️ THE FIRST ROW ALWAYS OPENS A CHAPTER, which is what makes §3b unconditional: there is no
       such thing as an unnamed round, so "when chapters are labelled, every chapter is labelled"
       needs no exception for a log that begins mid-story. */
    const opens = !chapters.length || (!row.kind && isRequestStatus(status));
    if (opens) {
      const subject = openerSubject(status);
      chapters.push({ label: chapterLabel(subject), subject, rows: [row] });
      continue;
    }
    chapters[chapters.length - 1].rows.push(row);
  }

  /* repeats get an ordinal — counted over labels, so two partials differ and a partial and a full do not */
  const seen = new Map<string, number>();
  for (const c of chapters) {
    const n = (seen.get(c.label) ?? 0) + 1;
    seen.set(c.label, n);
    c.label = qualifyChapterLabel(c.label, n);
  }

  return { chapters, labelled: chapters.length > 1 };
}
