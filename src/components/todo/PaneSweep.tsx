/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE GROUP SWEEP, IN THE PANE (ref design-refs/todo-group-sweep.html).
 *
 * ⚠️ THE SAME CARD SHELL AS EVERY OTHER TASK — sage band, white body, footer. A cohort is not a
 * different kind of object from a task; it is a task with more than one subject, and giving it its
 * own chrome would teach that the page has two work surfaces.
 *
 * ⚠️ IT IS A BODY AND A FOOT, SPLIT, for the reason the journey is: the card's scroller is a grid
 * row and a footer rendered inside it scrolls away with the content. The measurement that found
 * that fault reported a commit control at y 1271 in a 1000px viewport.
 */
import React from "react";
import { Check, ExternalLink } from "lucide-react";
import {
  SWEEP_ANSWERS, SWEEP_LEAD, SweepRow, SweepRule, sweepActLabel, sweepAnswered, sweepHint,
} from "../../lib/paneSweep";
import "./paneSweep.css";

export interface SweepMember {
  /** The agent's id — the write target, and the row's identity. */
  agentId: string;
  name: string;
  agency?: string;
  /** Their listing, where one is on file. Absent → no link rather than a dead one. */
  website?: string;
}

export interface PaneSweepProps {
  rule: SweepRule;
  members: SweepMember[];
  rows: SweepRow[];
  onChange: (rows: SweepRow[]) => void;
}

export const PaneSweep: React.FC<PaneSweepProps> = ({ rule, members, rows, onChange }) => {
  const spec = SWEEP_ANSWERS[rule];
  const set = (i: number, patch: Partial<SweepRow>) =>
    onChange(rows.map((r, n) => (n === i ? { ...r, ...patch } : r)));

  /* ⚠️ PICKING CLEARS A SKIP, because answering is the stronger statement of the two — you came
     back to a row you had set aside. Skipping clears a pick for the same reason in reverse. */
  const pick = (i: number, j: number) =>
    set(i, { pick: rows[i].pick === j ? null : j, skipped: false });

  return (
    <>
      <p className="psw-lead">{SWEEP_LEAD[rule]}</p>

      {members.map((m, i) => {
        const row = rows[i] ?? { pick: null, text: "", skipped: false };
        const answered = spec.mode === "text" ? !!row.text.trim() : row.pick !== null;
        return (
          <div className={`psw-row${answered && !row.skipped ? " done" : ""}${row.skipped ? " skipped" : ""}`} key={m.agentId}>
            <div className="psw-top">
              <span className="psw-who">
                <span className="psw-name">{m.name}</span>
                {m.agency && <span className="psw-agy"> · {m.agency}</span>}
              </span>
              <span className="psw-sp" />
              {answered && !row.skipped ? (
                <span className="psw-state"><Check size={11} aria-hidden /> Answered</span>
              ) : (
                <button type="button" className="psw-skip"
                  onClick={() => set(i, { skipped: !row.skipped, pick: null, text: "" })}>
                  {row.skipped ? "Bring back" : "Skip"}
                </button>
              )}
            </div>

            {/* ⚠️ A SKIPPED ROW HIDES ITS ANSWERS BUT KEEPS ITS NAME. It is still on the list — that
                is the whole point of skipping rather than dismissing — so it must still be visible
                and must still be reachable by "Bring back". */}
            {!row.skipped && (
              <>
                {spec.mode === "text" ? (
                  <div className="psw-text">
                    <input type="text" value={row.text} placeholder={spec.placeholder}
                      onChange={(e) => set(i, { text: e.target.value })} />
                  </div>
                ) : (
                  <div className="psw-chips">
                    {spec.mode === "weeks"
                      ? spec.options.map((w, j) => (
                        <button type="button" key={w} className={`psw-chip${row.pick === j ? " on" : ""}`}
                          aria-pressed={row.pick === j} onClick={() => pick(i, j)}>{w} weeks</button>
                      ))
                      : spec.options.map((o, j) => (
                        <button type="button" key={o.label} className={`psw-chip${row.pick === j ? " on" : ""}`}
                          aria-pressed={row.pick === j} onClick={() => pick(i, j)}>{o.label}</button>
                      ))}
                  </div>
                )}
                {/* ⚠️ THE LINK IS OMITTED WHERE THERE IS NO SITE ON FILE, never rendered dead. The
                    row's whole purpose is that the record is incomplete; a link to nowhere is the
                    same fault one field along. */}
                {m.website && (
                  <a className="psw-link" href={/^https?:/i.test(m.website) ? m.website : `https://${m.website}`}
                    target="_blank" rel="noreferrer noopener">
                    <ExternalLink size={11} aria-hidden /> Open their submissions page
                  </a>
                )}
              </>
            )}
          </div>
        );
      })}
    </>
  );
};

export interface PaneSweepFootProps {
  rule: SweepRule;
  rows: SweepRow[];
  onSkipRest: () => void;
  onCommit: () => void;
  saving?: boolean;
}

export const PaneSweepFoot: React.FC<PaneSweepFootProps> = ({ rule, rows, onSkipRest, onCommit, saving = false }) => {
  const answered = sweepAnswered(rows, rule);
  return (
    <div className="psw-foot">
      <span className="psw-hint">{sweepHint(answered)}</span>
      <button type="button" className="psw-ghost" onClick={onSkipRest}>Skip the rest for now</button>
      {/* ⚠️ DISABLED AT ZERO, because there is nothing to record — not because the writer has
          failed to do something. The hint beside it states that in words. */}
      <button type="button" className="psw-prime" disabled={answered === 0 || saving} onClick={onCommit}>
        <Check size={14} aria-hidden /> {saving ? "Recording…" : sweepActLabel(answered)}
      </button>
    </div>
  );
};
