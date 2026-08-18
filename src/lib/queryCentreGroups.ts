/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre §5 — WHAT THE LIST IS FOR.
 *
 * The list answered "when did I send this": a flat run of rows, each with a date on the right. It
 * answers "who do I chase" now — grouped by state, with the right-hand figure stating a POSITION
 * rather than a date. Same data, a different question.
 *
 * ⚠️ EVERYTHING HERE IS DERIVED. No stored group, no stored lateness, no `isOverdue` flag — the
 * group is a function of the query's status, its agent's stated window and the clock, evaluated at
 * render. A stored one would be wrong every morning.
 *
 * ⚠️ AND IT COMPOSES THE TWO RULES THIS APP ALREADY HAS, rather than adding a third. Membership of
 * `move` / `waiting` / `closed` is `queryBucket` — the same function the filter pills and
 * `getPrimaryAction` read. Whether a waiting query has lapsed is `replyOverdue` from
 * `taskPrecedence` — the same module the to-do generator and the Nudge button read. This file
 * decides only how those two answers are ARRANGED.
 */
import { ElapsedSense, elapsedPhrase } from "./elapsed";
import { Query, Agent, QueryStatus } from "../types";
import { queryBucket } from "./queryAmbient";
import { replyOverdue, replyDeadlineMs } from "./taskPrecedence";

export type ListGroup = "overdue" | "waiting" | "move" | "closed";

/**
 * ⚠️ OVERDUE FIRST, CLOSED LAST — the order is the point of the section. The list is read top-down
 * by someone deciding what to do this morning, so what has lapsed is what they meet first.
 */
export const GROUP_ORDER: readonly ListGroup[] = ["overdue", "waiting", "move", "closed"];

/**
 * ⚠️ `YOUR MOVE`, WHERE THE REF DRAWS `WITH THE AGENT` — a deliberate deviation, flagged.
 *
 * The ref's third group holds the `in`-direction rows: partial requested, full requested, revise &
 * resubmit. In every one of them the agent has ASKED and the writer owes the pages — the ball is
 * with the writer, which is the opposite of what "with the agent" says. This page's own filter
 * pills already name that set "Your move", from `queryBucket`, and two surfaces on one screen
 * naming one set two different ways is the divergence this repo keeps paying for.
 *
 * A mockup wins on what it shows; it does not win a factual claim about whose turn it is.
 */
/**
 * ⚠️ "OVERDUE" LEAVES THE PRODUCT (§4c). It asserts the agent failed an obligation they never made:
 * a response window is a stated intention, not a contract, and a query past it is a query that has
 * not been answered — which is what the app can honestly say. The derivation is untouched; only the
 * word is.
 */
export const GROUP_LABEL: Record<ListGroup, string> = {
  overdue: "NO REPLY YET",
  waiting: "WAITING",
  move: "YOUR MOVE",
  closed: "CLOSED",
};

type AgentLike = { responseTimeWeeks?: number; noResponseMeansNo?: boolean } | null | undefined;
type QueryLike = Pick<Query, "status"> & { dateSent?: string; responseDeadline?: string; lastNudgeSentDate?: string };

const inputFor = (q: QueryLike, a: AgentLike, now: number) => ({
  status: q.status as QueryStatus,
  dateSent: q.dateSent,
  responseDeadline: q.responseDeadline,
  responseTimeWeeks: a?.responseTimeWeeks,
  noResponseMeansNo: !!a?.noResponseMeansNo,
  lastNudgeSentDate: q.lastNudgeSentDate,
  now,
});

/**
 * ⚠️ A WAITING QUERY WITH NO STATED WINDOW STAYS IN `waiting`, NOT `overdue`. There is nothing for
 * it to be late against; the "set a reply window" to-do item is what unblocks it. Guessing a
 * default window here would put a row in the chase group on the strength of a number nobody typed.
 */
export function listGroupFor(query: QueryLike, agent: AgentLike, now: number = Date.now()): ListGroup {
  const bucket = queryBucket(query.status as QueryStatus);
  if (bucket === "closed") return "closed";
  if (bucket === "move") return "move";
  return replyOverdue(inputFor(query, agent, now)) ? "overdue" : "waiting";
}

/**
 * The right-hand figure. `left` counts down to the expected reply, `late` counts up from it, `date`
 * is the row's own date — the three cases the pack names.
 *
 * ⚠️ THE FIGURE AND THE GROUP READ ONE DEADLINE. If the countdown came from the STAGE windows
 * (`STAGE_RESPONSE_WINDOWS`, 8/12/12 weeks) while the group came from the agent's stated one, a row
 * could sit under OVERDUE reading "27 DAYS LEFT" — two clocks, both defensible, contradicting each
 * other three pixels apart. `replyDeadlineMs` is the single instant both sides read.
 */
export type RowFigure =
  | { kind: "left"; days: number }
  | { kind: "late"; days: number }
  | { kind: "date" };

export function rowFigure(query: QueryLike, agent: AgentLike, now: number = Date.now()): RowFigure {
  const bucket = queryBucket(query.status as QueryStatus);
  if (bucket !== "waiting") return { kind: "date" };
  const deadline = replyDeadlineMs(inputFor(query, agent, now));
  /* an undated import, or an agent with no stated window: there is no position to state, so the row
     keeps the date it has always had rather than inventing one */
  if (Number.isNaN(deadline)) return { kind: "date" };
  const DAY = 86400000;
  if (now < deadline) return { kind: "left", days: Math.max(1, Math.ceil((deadline - now) / DAY)) };
  return { kind: "late", days: Math.max(0, Math.floor((now - deadline) / DAY)) };
}

/**
 * ⚠️ SINGULARS AGREE. "1 DAYS LEFT" is the kind of thing that makes a writer distrust every other
 * number on the page, and it is one `=== 1`.
 *
 * ⚠️ AND `+0 DAYS` IS `DUE TODAY`. The day the window expires is neither "left" nor "late" by any
 * useful reading, and a zero on a row is the least informative thing it could say.
 */
/**
 * ⚠️ THE FIGURE SCALES ITS UNIT (§4a), THROUGH THE ONE FORMATTER. `+847 DAYS` made the reader
 * divide before the number meant anything; `2¼ years` is the same fact in the unit a person would
 * have used. The exact date rides in a `title` on the figure — approximate display, precise truth.
 *
 * ⚠️ AND THE "+" IS GONE WITH "OVERDUE" (§4c). A plus sign on a wait is an overrun against a
 * deadline the agency never agreed to; the duration alone states the same fact without the verdict.
 */
export function figureText(f: RowFigure): string | null {
  if (f.kind === "date") return null;
  if (f.kind === "left") return `${elapsedPhrase(f.days)} left`;
  return f.days === 0 ? "today" : elapsedPhrase(f.days);
}

/**
 * ⚠️ THE CLOSED GROUP FOLDS ONLY WHEN IT IS WORTH FOLDING. A first-time writer with two rejections
 * behind them should see both: hiding them teaches that the app is keeping something from you, and
 * it saves four rows of nothing. The fold earns its place once the group is long enough to push the
 * live work off the screen.
 */
export const CLOSED_FOLD_MIN = 5;
export function foldClosed(n: number): boolean {
  return n >= CLOSED_FOLD_MIN;
}

/**
 * ⚠️ WHICH SENTENCE A ROW'S DURATION IS IN (§4a). "With agent for 2¼ years" is true only while the
 * query is actually with an agent; on a rejected one it is a false statement about someone's own
 * submission, which is worse than a vague one.
 *
 * ⚠️ IT READS THE GROUP, NOT THE STATUS, so the words and the row's position cannot disagree — the
 * group is already the answer to "where does this stand", derived from `getPrimaryAction`.
 */
export function elapsedSenseFor(group: ListGroup): ElapsedSense {
  if (group === "closed") return "closed";
  if (group === "move") return "your-move";
  return "with-agent";
}

/**
 * WHEN THE WRITER LAST SENT SOMETHING — the anchor the list row's relative date measures from.
 *
 * ⚠️ THE LAST OUTBOUND SEND, NOT THE QUERY'S CREATION. A query whose partial went last month has
 * been "with the agent" for a month, not for the eight months since it was first queried, and the
 * row's figure is a statement about the current wait. `createdDate` is not read at all.
 *
 * ⚠️ IT IS THE NEWEST OF THE THREE SEND FIELDS, not a status→field map. Those are the only three
 * dates on a query that record the writer sending something — `dateSent`, `partialSentDate`,
 * `fullSentDate` — and taking the newest that EXISTS holds for a query in the writer's court too,
 * where the current status names no send at all (a partial request's last send is still the query).
 *
 * ⚠️ AND A RESUBMISSION LANDS ON `fullSentDate` BY THE SAME ROUTE, because that is the field the
 * mark-sent flow writes; the reading needs no knowledge of which round it is.
 */
export function lastSendMs(query: { dateSent?: string; partialSentDate?: string; fullSentDate?: string }): number | null {
  const times = [query.dateSent, query.partialSentDate, query.fullSentDate]
    .map((iso) => (iso ? new Date(iso).getTime() : NaN))
    .filter((t) => !Number.isNaN(t));
  return times.length ? Math.max(...times) : null;
}
