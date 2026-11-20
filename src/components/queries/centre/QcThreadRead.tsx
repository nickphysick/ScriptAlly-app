/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Agent card v2 — THE QUERY CARD'S THREAD, READ-ONLY: the same derivation (lib/qcThread152 `buildThread` over the
 * steps `buildCardView` gathers) drawn with the same `Bubble` and the same "x days later" lines at the side of whoever's
 * message it is. No ✎ Edit, no fold, no draft, no motion: the agent card's History is a record, and every action on a
 * query is the query card's (its "Open the query" door).
 *
 * ⚠️ IT DRAWS INSIDE A `.qc152` ROOT, so the query card's own stylesheets place it; nothing here restates their CSS.
 */
import React from "react";
import { buildThread, viaKind, type ThreadStepIn } from "../../../lib/qcThread152";
import type { QueryState } from "../../../lib/queryState";
import { Bubble, chipIcon } from "./QcBubble152";

export interface ThreadReadProps {
  steps: readonly ThreadStepIn[];
  first: string;
  nowMs: number;
  state: QueryState;
  replyMs: number | null;
  agentWeeks: number | null;
  initials: string;
  /** the data hook the measurement reads the bubbles by */
  queryId: string;
}

export const ThreadRead: React.FC<ThreadReadProps> = (p) => {
  const thread = buildThread(p.steps, { first: p.first, nowMs: p.nowMs, state: p.state, replyMs: p.replyMs, agentWeeks: p.agentWeeks });
  const msgs = thread.filter((x) => x.t === "msg").length;
  return (
    <div className="qc152-th" data-qc152="thread" data-acv2="thread" data-query={p.queryId} data-steps={msgs}>
      {thread.map((it) => (it.t === "wait" ? (
        <div key={it.key} className={`qc1522-lt ${it.side}`} data-qc152="wait" data-qc1522="wait" data-side={it.side} data-label={it.label} title={it.tip ?? undefined}>{it.label}</div>
      ) : (
        <Bubble key={it.key} side={it.side} status={it.status} kind={it.kind} title={it.title} date={it.date} dated={it.dated}
          stamp={it.stamp} viaIcon={it.side === "me" ? viaKind(it.via) : null}
          tint={it.tint} grey={it.grey} initials={p.initials}
          chips={it.chips.length ? <span className="qc152-chs" data-qc152="chips">{it.chips.map((c, k) => <span key={k} className="qc152-ch" data-qc152="chip">{chipIcon(c.label)}{c.label}</span>)}</span> : null}
          via={it.via} quote={it.quote} follows={it.follows} nth={it.nth} sub={it.sub}
          outer={{ "data-qc152": "msg", "data-side": it.side, "data-status": it.status ?? undefined, "data-kind": it.kind ?? undefined, "data-activity": it.activityId }} />
      )))}
    </div>
  );
};
