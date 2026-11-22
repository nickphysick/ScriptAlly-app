/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone style v1, Phase 3 — TODAY'S "YOUR MOVE", TO THE SHEET (design-refs/phone-style-v1/phone-today-v6.html, the
 * two scrolled states). The heading sits on the page; the rows sit together in one card (P5, rows never loose).
 *   - A row: the status mark on its stage band in a 40 disc (PsDisc), the name, the one status line, the weeks figure at
 *     14 — the same queries, order, words and door as v4's row (QRowV4); the initials seal comes off.
 *   - THE LEAD CARD (rulings 2, 22 Nov): the FIRST Your move query, drawn as the one coloured card, in its stage tint (an
 *     offer adds the sheen). Its task is that query's To do task — the one To do orders first (lib/phoneV5 `deckOrder`
 *     over the same `ordered` list and today's saved order). Its button calls To do's own `verbOf` for the label and
 *     opens the same PhoneTaskScreen at that task. It saves nothing itself. The headline is the task's own title, the
 *     sentence To do's card carries; the numeral and unit are the row's own time since (QueriesV4 `sinceWord`).
 *   - If the first query has NO task there is no lead card: the heading and the rows only. A later query is never
 *     promoted, and a card is never drawn without its button.
 */
import React, { useMemo, useState } from "react";
import { useV3Data } from "../v3/V3Provider";
import { openV3Query } from "../v3/v3Store";
import { PhoneTaskScreen } from "../../todo/phone/PhoneTaskScreen";
import type { V3Query } from "../../../lib/phoneV3";
import type { WsTask } from "../../../lib/todoWs";
import { deckOrder, readTodoOrder } from "../../../lib/phoneV5";
import { sinceWord } from "../v4/QueriesV4";
import { verbOf } from "./TodoV5";
import { PsDisc, leadBackground } from "../PsParts";

/** "15w" → 15 weeks; "3d" → 3 days; "today" → no numeral */
export function sinceParts(word: string): { n: string | null; unit: string } {
  const m = /^(\d+)([dw])$/.exec(word);
  if (!m) return { n: null, unit: word };
  const one = m[1] === "1";
  return { n: m[1], unit: m[2] === "d" ? (one ? "day" : "days") : (one ? "week" : "weeks") };
}

/** the task To do orders first for a query, or null */
export function leadTaskFor(q: V3Query | undefined, deck: readonly WsTask[]): WsTask | null {
  if (!q) return null;
  return deck.find((t) => t.query?.id === q.id) ?? null;
}

const MoveRow: React.FC<{ q: V3Query; now: number; hasTask: boolean }> = ({ q, now, hasTask }) => (
  <button type="button" className="ps-row" data-pa4="qrow" data-ps="move-row" data-id={q.id} data-court={q.court} data-status={String(q.row.status)}
    data-task={hasTask ? "1" : "0"} onClick={() => openV3Query(q.id)}>
    <PsDisc status={q.row.status} />
    <span className="ps-tx">
      <span className="ps-name">{q.row.agentName}</span>
      <span className="ps-sec" data-pa4="qline">{`${q.status}${q.short ? ` · ${q.short}` : ""}`}</span>
    </span>
    <span className="ps-time">{sinceWord(q.row.lastMs, now)}</span>
  </button>
);

export const YourMoveV5: React.FC<{ mine: readonly V3Query[]; now: number }> = ({ mine: all, now }) => {
  const v = useV3Data();
  /* a DEV-ONLY review aid (Phone style v1, PS1's states): `window.__SA_PS_MOVE = { ids }` keeps only those of the
     writer's own Your move queries, in the app's own order — so the measurement can show the offer state (a subset that
     an offer leads) and the one-query state. Nothing is reordered or invented. The MODE test is at the call site. */
  const moveAid: { ids?: string[] } | null = import.meta.env.MODE !== "production" && typeof window !== "undefined"
    ? ((window as unknown as { __SA_PS_MOVE?: { ids?: string[] } }).__SA_PS_MOVE ?? null) : null;
  const mine = moveAid?.ids ? all.filter((q) => moveAid.ids!.includes(q.id)) : all;
  const { core, ordered } = v;
  /* To do's own order: the same list, with today's "Not now" order applied (TodoV5's deck, before any Undo) */
  const deck = useMemo(() => {
    const byKey = new Map(ordered.map((t) => [t.key, t]));
    return deckOrder(ordered.map((t) => t.key), readTodoOrder(core.todayYmd).back).map((k) => byKey.get(k)).filter((t): t is WsTask => !!t);
  }, [ordered, core.todayYmd]);
  const first = mine[0];
  const task = useMemo(() => leadTaskFor(first, deck), [first, deck]);
  const [opened, setOpened] = useState<string | null>(null);
  if (!mine.length) return null;
  const rest = task ? mine.slice(1) : mine;
  const since = task ? sinceParts(sinceWord(first.row.lastMs, now)) : null;
  return (
    <>
      <h2 className="ps-hdg" data-pa5="your-move" data-ps="move-hdg" data-n={mine.length} data-first-task={task ? "1" : "0"} data-first={first?.id ?? ""} data-first-status={first ? String(first.row.status) : ""}>Your move <small>{mine.length}</small></h2>
      {task && since ? (
        <div className="ps-lead" data-ps="lead" data-id={first.id} data-task-key={task.key} data-status={String(first.row.status)} style={{ background: leadBackground(first.row.status) }}>
          <div className="ps-lead-who">
            <PsDisc status={first.row.status} />
            <div className="ps-tx">
              <span className="ps-name">{first.row.agentName}</span>
              <span className="ps-sec">{first.status}</span>
            </div>
            <div className="ps-lead-n">
              {since.n ? <b>{since.n}</b> : null}
              <span className="ps-cap" data-ps-cap="">{since.unit}</span>
            </div>
          </div>
          <div className="ps-head" data-ps="lead-head">{task.title}</div>
          <button type="button" className="ps-cta" data-ps="lead-cta" onClick={() => setOpened(task.key)}>{verbOf(task)}</button>
        </div>
      ) : null}
      {rest.length ? <div className="ps-card" data-ps="move-card">{rest.map((q) => <MoveRow key={q.id} q={q} now={now} hasTask={!!leadTaskFor(q, deck)} />)}</div> : null}
      {opened ? (
        <PhoneTaskScreen core={core} tasks={deck} startKey={opened} now={v.now} onClose={() => setOpened(null)} onDid={() => setOpened(null)} />
      ) : null}
    </>
  );
};
