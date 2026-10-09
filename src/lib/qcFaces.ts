/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE HEADER'S FACES (Query Centre v134 §1) — up to eight agent discs under the subheader, coloured by
 * court: up to three with you, up to three with agents, up to two closed, in that order.
 *
 * ⚠️ A GROUP WITH FEWER DOES NOT LEND ITS SLOTS. The row stays short and honest: 0 / 2 / 1 draws two
 * blue discs and one grey, never eight.
 *
 * ⚠️ THE COURT IS THE DESK'S OWN (`tileCourt`), so a disc's colour and the desk's three cards cannot
 * disagree. A withdrawn or signed query sits in no court: it is in the hero's number and in "+N more",
 * and on no disc.
 *
 * Order inside a group: with you, most urgent first (past its date first, then the soonest date, a
 * dateless one last); with agents, the most recent activity first; closed, the most recently closed
 * first (`stageStartMs`, the day it reached the closing stage — never `lastMs`).
 */
import { STAGE_NAME, tileCourt, type QcRow, type TileCourt } from "./qcSummary";

export const FACE_CAP: Record<TileCourt, number> = { you: 3, agent: 3, closed: 2 };
export const FACE_COURT_WORDS: Record<TileCourt, string> = { you: "with you", agent: "with agents", closed: "closed" };

export interface Face { id: string; court: TileCourt; initials: string; name: string; line: string }
export interface Faces {
  faces: Face[];
  /** the hero's number */
  total: number;
  /** total less the discs drawn; 0 hides "+N more" */
  more: number;
  /** "8 of 27 queries shown: 3 with you, 3 with agents, 2 closed" */
  sentence: string;
}

const FAR = Number.MAX_SAFE_INTEGER;
const byId = (a: QcRow, b: QcRow) => a.id.localeCompare(b.id);

export function facesFor(rows: readonly QcRow[], nowMs: number, cap: Record<TileCourt, number> = FACE_CAP): Faces {
  const of = (c: TileCourt) => rows.filter((r) => tileCourt(r.status) === c);
  const over = (r: QcRow) => (r.expectedMs != null && r.expectedMs < nowMs ? 0 : 1);
  const you = of("you").sort((a, b) => over(a) - over(b) || (a.expectedMs ?? FAR) - (b.expectedMs ?? FAR) || b.lastMs - a.lastMs || byId(a, b));
  const agent = of("agent").sort((a, b) => b.lastMs - a.lastMs || byId(a, b));
  const closed = of("closed").sort((a, b) => (b.stageStartMs ?? 0) - (a.stageStartMs ?? 0) || b.lastMs - a.lastMs || byId(a, b));
  const take = (list: QcRow[], court: TileCourt): Face[] => list.slice(0, cap[court]).map((r) => ({
    id: r.id, court, initials: r.initials, name: r.agentName, line: `${STAGE_NAME[r.status]} · ${FACE_COURT_WORDS[court]}`,
  }));
  const faces = [...take(you, "you"), ...take(agent, "agent"), ...take(closed, "closed")];
  const n = (c: TileCourt) => faces.filter((f) => f.court === c).length;
  const total = rows.length;
  return {
    faces, total, more: Math.max(0, total - faces.length),
    sentence: `${faces.length} of ${total} ${total === 1 ? "query" : "queries"} shown: ${n("you")} with you, ${n("agent")} with agents, ${n("closed")} closed`,
  };
}
