/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ THE ATTENTION ORDER — one comparator, over the register and nothing else.
 *
 * The register is `cardFacts`' (see `registerOf`), so this file re-derives nothing: hand it the
 * register a card is already showing and it puts the queries in the order the cards say they are
 * in. A second reading of "is this late" here is how a sort and a chip come to disagree about the
 * same query, which is the fault this repo records more than any other.
 *
 * ⚠️ AND THE ORDER IS A JUDGEMENT, WHICH IS WHY IT IS A TABLE AND NOT A CHAIN OF `if`s. `you`
 * leads because it is the only register where nothing happens until the writer acts. `late` next,
 * because it is the one where something has already not happened. `offer` is above `calm` and below
 * both — it is good news that can wait a day, where a passed window cannot. `closed` last: it is
 * the archive, and it sorts newest-first because a recent close is still news.
 */
import type { Register } from "./queryCardFacts";

export const ATTENTION_RANK: Record<Register, number> = {
  you: 0,
  late: 1,
  offer: 2,
  calm: 3,
  closed: 4,
};

/** what the comparator needs, all of it already derived elsewhere */
export interface AttentionRow {
  register: Register;
  /** the resolved expected reply, for ordering `calm` by which reply lands first */
  expectedMs: number | null;
  /** when a closed query closed, for ordering the archive newest-first */
  closedMs: number | null;
  /** the tie-break inside every register */
  lastActivityMs: number;
}

const FAR = Number.MAX_SAFE_INTEGER;

/**
 * ⚠️ THE WITHIN-REGISTER RULE DIFFERS PER REGISTER, AND THAT IS THE POINT OF THE KEY.
 * `calm` sorts by the nearest expected reply — the useful question there is "what lands next".
 * `closed` sorts newest-first. Everything else falls straight through to last activity, because in
 * a register that is asking something of the reader, recency is the only ordering that means
 * anything: there is no date to count to.
 */
export function compareAttention(a: AttentionRow, b: AttentionRow): number {
  const byRank = ATTENTION_RANK[a.register] - ATTENTION_RANK[b.register];
  if (byRank !== 0) return byRank;

  if (a.register === "calm") {
    /* ⚠️ A CALM QUERY WITH NO STATED WINDOW SORTS LAST AMONG THE CALM, not first. There is no date
       to land, so it cannot be the next thing to land — the same reason `due_soonest` uses a far
       sentinel rather than zero. */
    const d = (a.expectedMs ?? FAR) - (b.expectedMs ?? FAR);
    if (d !== 0) return d;
  }
  if (a.register === "closed") {
    const d = (b.closedMs ?? 0) - (a.closedMs ?? 0);
    if (d !== 0) return d;
  }
  return b.lastActivityMs - a.lastActivityMs;
}
