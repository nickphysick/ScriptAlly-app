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
 * ⚠️ A CHAPTER OPENS ON AN OUTBOUND SEND, WHICH IS NOT WHAT THE REF DRAWS — a deliberate deviation
 * with a reason. 154-timeline.html groups a request WITH the send that answers it, so its second
 * chapter reads "Partial requested · Partial sent". That is legible until the writer has not sent
 * yet: the request opens a chapter named after a send that has not happened, and a query sitting in
 * the writer's court grows a heading for work it is still waiting on. Opening on the SEND means a
 * chapter only ever begins with something the writer actually did, and the request that caused it
 * closes the round before. The pack states this rule in prose; the ref draws the other one.
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
 * Does this status OPEN a round?
 *
 * ⚠️ `QUERIED` IS IN THE SET BY ITS OWN CLAUSE, not by accident: it is the one send no request
 * precedes, so nothing targets it and the derivation above cannot find it.
 */
export const isSendStatus = (status: QueryStatus): boolean =>
  status === QueryStatus.QUERIED || SEND_TARGETS.includes(status);

/** The statuses whose mark-sent action produces `target`, in enum order. */
const producersOf = (target: QueryStatus): QueryStatus[] =>
  Object.values(QueryStatus).filter((s) => {
    const a = getPrimaryAction(s);
    return a.kind === "mark-sent" && a.target === target;
  });

/**
 * What a send is a send OF.
 *
 * ⚠️ THE REQUEST BEFORE IT IS THE AUTHORITY, and the fallback is still derived. Two statuses target
 * `Full sent` — `Full requested` and `Revise & Resubmit` — so the status alone cannot say which
 * round this is; the nearest preceding request can. With no request in the log at all (an import, a
 * query recorded after the fact), the first producer in enum order is the answer, which is the
 * ordinary reading rather than the revision one.
 */
export function chapterSubject(sendStatus: QueryStatus, precedingRequest: QueryStatus | null): ChapterSubject {
  if (sendStatus === QueryStatus.QUERIED) return "query";
  if (precedingRequest) {
    const a = getPrimaryAction(precedingRequest);
    if (a.kind === "mark-sent" && a.target === sendStatus) return a.markKind;
  }
  const first = producersOf(sendStatus)[0];
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
  /** "" for rows that precede the first send — rendered without a heading, never as a blank one. */
  label: string;
  subject: ChapterSubject | null;
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
  let seenRequest: QueryStatus | null = null;

  for (const row of rows) {
    const status = row.status as QueryStatus;
    const opensChapter = !row.kind && isSendStatus(status);
    if (opensChapter) {
      const subject = chapterSubject(status, seenRequest);
      chapters.push({ label: chapterLabel(subject), subject, rows: [row] });
      seenRequest = null;
      continue;
    }
    /* a request is what NAMES the next round, so remember the most recent one */
    if (!row.kind && getPrimaryAction(status).kind === "mark-sent") seenRequest = status;
    if (!chapters.length) chapters.push({ label: "", subject: null, rows: [] });
    chapters[chapters.length - 1].rows.push(row);
  }

  /* repeats get an ordinal — counted over labels, so two partials differ and a partial and a full do not */
  const seen = new Map<string, number>();
  for (const c of chapters) {
    if (!c.label) continue;
    const n = (seen.get(c.label) ?? 0) + 1;
    seen.set(c.label, n);
    c.label = qualifyChapterLabel(c.label, n);
  }

  return { chapters, labelled: chapters.length > 1 };
}
