/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The ledger's sentences (Query panel v2 §B): what happened, said as a sentence, with its manner in italics —
 * "You sent the query *by email*", "They asked for a partial", "You nudged them *no reply*".
 *
 * They replace the timeline's labels ("Query sent", "Partial requested") in the panel. The data is unchanged:
 * the rows are `buildTimelineRows`' own, and this only chooses the words. One sentence per `QueryStatus`
 * (the table is typed over the enum, so a new status fails to compile until it has one), and one each for
 * the two entries that carry no status: a nudge and a holding reply.
 *
 * "They" is the agent: the app does not know anybody's pronouns, and the masthead above already names them.
 */
import { QueryStatus } from "../types";
import { formatDate } from "./dates";

export interface LedgerSentence { text: string; manner?: string }
export interface LedgerRowLike {
  kind?: "nudge" | "holding";
  status: QueryStatus;
  reconstructed?: boolean;
  /** `buildTimelineRows`' title: for a nudge it carries the outcome ("Nudged — no reply"). */
  title: string;
  sub?: string;
}

const S = QueryStatus;
export const LEDGER_SENTENCE: Record<QueryStatus, string> = {
  [S.QUERIED]: "You sent the query",
  [S.PARTIAL_REQUESTED]: "They asked for a partial",
  [S.PARTIAL_SENT]: "You sent the partial",
  [S.FULL_REQUESTED]: "They asked for the full manuscript",
  [S.FULL_SENT]: "You sent the full manuscript",
  [S.REVISE_RESUBMIT]: "They asked you to revise and resubmit",
  [S.RESUBMITTED]: "You sent the revision",
  [S.OFFER]: "They offered representation",
  [S.REJECTED]: "They passed",
  [S.WITHDRAWN]: "You withdrew the query",
  [S.NO_RESPONSE]: "You closed the query",
  [S.SIGNED]: "You signed with them",
};
const LEDGER_NUDGE = "You nudged them";
const LEDGER_HOLDING = "They replied";
const LEDGER_RECONSTRUCTED = "from the imported status";

/** "by email", "by post", "through an online form", "through QueryManager" — the send's manner. */
export function sendManner(method: string | undefined | null): string | undefined {
  const m = (method ?? "").trim();
  if (!m) return undefined;
  const l = m.toLowerCase();
  if (l === "email") return "by email";
  if (l === "post") return "by post";
  if (l === "online form" || l === "online_form") return "through an online form";
  if (l === "querymanager" || l === "query manager") return "through QueryManager";
  return `by ${m}`;
}

export function ledgerSentence(row: LedgerRowLike, opts: { sendMethod?: string | null; revisionRound?: number | null } = {}): LedgerSentence {
  if (row.kind === "nudge") return { text: LEDGER_NUDGE, manner: /no reply/i.test(row.title) ? "no reply" : undefined };
  if (row.kind === "holding") return { text: LEDGER_HOLDING, manner: "no decision yet" };
  const text = LEDGER_SENTENCE[row.status] ?? row.title;
  /* a starting step the import wrote, never a recorded event: it keeps its sentence and says where it came from */
  if (row.reconstructed) return { text, manner: LEDGER_RECONSTRUCTED };
  if (row.status === S.QUERIED) return { text, manner: sendManner(opts.sendMethod) };
  if (row.status === S.NO_RESPONSE) return { text, manner: "no reply" };
  if (row.status === S.FULL_SENT && (opts.revisionRound ?? 1) >= 2) return { text, manner: `version ${opts.revisionRound}` };
  return { text };
}

/** The date cell: "14 Mar", and the year on a second line only when it is not this year. */
export function ledgerDate(ms: number | undefined, nowMs: number): { day: string; year: string | null } | null {
  if (ms == null || !Number.isFinite(ms)) return null;
  const d = new Date(ms);
  if (isNaN(d.getTime())) return null;
  return { day: formatDate(d, { day: "numeric", month: "short" }), year: d.getFullYear() === new Date(nowMs).getFullYear() ? null : String(d.getFullYear()) };
}
