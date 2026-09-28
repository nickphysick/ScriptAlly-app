/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The To-do list's row cards (v2; ref `.row`), under sticky anthracite group heads.
 *
 * ⚠️ EVERY PRESS OPENS A SURFACE AND NONE OF THEM WRITES. The tick, the row, the action button — all
 * three call `onOpen`, and the surface that opens is the one place a task is finished. The tick is
 * a door shaped like a tick, never a commit: a status change one click from a card is the fault
 * the whole design is built against.
 *
 * ⚠️ A STATUS IS DRAWN BY `StatusDot` AND NOTHING ELSE, imported, never redrawn.
 */
import React from "react";
import { StatusDot } from "../../StatusDot";
import { STATE_TOKEN, stateFor } from "../../../lib/queryCardFacts";
import { STAGE_NAME } from "../../../lib/qcSummary";
import type { QueryStatus } from "../../../types";
import type { V2Group, V2Row } from "../../../lib/todoV2";

const initials = (name: string) => {
  if (!name || name === "—") return "··";
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase();
};

export const bandFor = (r: V2Row) => (r.card.status ? STATE_TOKEN[stateFor(r.card.status as QueryStatus)] : STATE_TOKEN.closed);

const Tick = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m4 12 5 5L20 6" /></svg>
);

export const V2RowCard: React.FC<{ r: V2Row; landed: boolean; onOpen: (r: V2Row) => void }> = ({ r, landed, onOpen }) => {
  const status = r.card.status as QueryStatus | undefined;
  return (
    <div
      className={`tdv2-row${r.past ? " past" : ""}${landed ? " landed" : ""}`}
      data-row-key={r.key}
      data-todo-v2="row"
      data-tile={r.tile}
      data-cat={r.cat}
      role="button"
      tabIndex={0}
      aria-label={`${r.deed}${r.who !== "—" ? `, ${r.who}` : ""}`}
      onClick={() => onOpen(r)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(r); } }}
    >
      <span className="tdv2-band" style={{ background: bandFor(r) }} data-todo-v2="band" />
      <div className="tdv2-inner">
        <button
          type="button"
          className="tdv2-tick"
          data-todo-v2="tick"
          title="Finish this task"
          aria-label={`Finish: ${r.deed}`}
          onClick={(e) => { e.stopPropagation(); onOpen(r); }}
        ><Tick /></button>
        <div className="tdv2-deedwrap">
          <div className="tdv2-tagline">
            <span className={`tdv2-ttag${r.yours ? " yourmove" : ""}`}>{r.yours ? "Your move" : r.typeLabel}</span>
            {r.yours && <span className="tdv2-ttag">{r.typeLabel}</span>}
          </div>
          <div className="tdv2-deed">{r.deed}</div>
        </div>
        <div className="tdv2-agentcell">
          <span className="tdv2-av" aria-hidden="true">{initials(r.who)}</span>
          <span className="tdv2-agt"><b>{r.who}</b><span>{r.agency}</span></span>
        </div>
        <div className="tdv2-datecell">
          <div className="tdv2-dk">{r.dateKey}</div>
          <div className="tdv2-dv">{r.dateValue}{r.spanValue ? <em> · {r.spanValue}</em> : null}</div>
        </div>
        <div className="tdv2-actcell">
          {status && (
            <span className="tdv2-statuspill">
              <StatusDot status={status} overrideSize={13} decorative />
              {STAGE_NAME[status] ?? String(status)}
            </span>
          )}
          <button
            type="button"
            className="tdv2-act"
            data-todo-v2="act"
            onClick={(e) => { e.stopPropagation(); onOpen(r); }}
          >{r.verb}</button>
        </div>
      </div>
    </div>
  );
};

export const V2Rows: React.FC<{
  groups: V2Group[];
  landedKey: string | null;
  onOpen: (r: V2Row) => void;
  empty: string;
}> = ({ groups, landedKey, onOpen, empty }) => {
  const total = groups.reduce((n, g) => n + g.rows.length, 0);
  if (!total) return <div className="tdv2-empty" data-todo-v2="empty">{empty}</div>;
  return (
    <div className="tdv2-list" data-todo-v2="list">
      {groups.map((g) => (
        <section key={g.id} className="tdv2-gsec" data-group={g.id}>
          {g.label && (
            <div className="tdv2-ghead" data-todo-v2="ghead">
              <b>{g.label}</b><span className="tdv2-gn">{g.rows.length}</span>
            </div>
          )}
          <div className="tdv2-rows">
            {g.rows.map((r) => <V2RowCard key={r.key} r={r} landed={r.key === landedKey} onOpen={onOpen} />)}
          </div>
        </section>
      ))}
    </div>
  );
};
