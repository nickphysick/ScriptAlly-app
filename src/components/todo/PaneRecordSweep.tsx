/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE BULK RECORD GAP, IN THE PANE.
 *
 * ⚠️ THE SAME CARD SHELL AND THE SAME `psw-` GRAMMAR AS `PaneSweep`, deliberately — a cohort is not
 * a different kind of object from a task, and this page must not grow a second bulk surface. What
 * differs is only what a row holds: `PaneSweep` keys on an AGENT and takes one answer from a chip
 * list, this keys on a QUERY and takes four. That is why it is a sibling rather than a rule inside
 * `PaneSweep` — see the note at the head of `materialsSweep`.
 *
 * ⚠️ BODY AND FOOT ARE SPLIT for the reason every journey's are: the card's scroller is a grid row,
 * and a footer rendered inside it scrolls away with the content.
 */
import React, { useState } from "react";
import { Check } from "lucide-react";
import { SampleSpecPicker } from "../materials/SampleSpecPicker";
import { MATERIAL_ROW_NAMES, snapToUnit, type MaterialRow } from "../../lib/agentMaterials";
import {
  SWEEP_CAVEAT, SWEEP_VISIBLE_ROWS, copyFirstDown, fillFromAsks, rowHasAnswer,
  sweepActLabel, sweepAnsweredCount, sweepRowSummary, type RecordSweepRow,
} from "../../lib/materialsSweep";
import "./paneRecordSweep.css";

export interface PaneRecordSweepProps {
  rows: RecordSweepRow[];
  onChange: (rows: RecordSweepRow[]) => void;
}

export const PaneRecordSweep: React.FC<PaneRecordSweepProps> = ({ rows, onChange }) => {
  const [showAll, setShowAll] = useState(false);
  /* ⚠️ ONE EDITOR OPEN AT A TIME. Fourteen unit steppers hanging open is a wall of controls; the
     row states its own value inline and the editor arrives when it is asked for. */
  const [editing, setEditing] = useState<string | null>(null);

  const visible = showAll ? rows : rows.slice(0, SWEEP_VISIBLE_ROWS);
  const hidden = rows.length - visible.length;

  const setRow = (i: number, patch: Partial<RecordSweepRow>) =>
    onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const setMats = (i: number, next: MaterialRow[]) => setRow(i, { rows: next });

  return (
    <>
      {/* ⚠️ TWO FILLS, AND NEITHER IS A PACKAGE-FOR-ALL. One reads each agency's own guidelines; the
          other says "the same as the first". A single template applied to every row would state
          that every send carried the same parcel. */}
      <div className="prs-fills">
        <button type="button" className="prs-fill" onClick={() => onChange(fillFromAsks(rows))}>
          Start from what each agent asks for
        </button>
        <button type="button" className="prs-fill" onClick={() => onChange(copyFirstDown(rows))}>
          Copy the first row down
        </button>
      </div>
      <p className="prs-caveat">{SWEEP_CAVEAT}</p>

      {visible.map((r, i) => {
        const answered = rowHasAnswer(r);
        const summary = sweepRowSummary(r);
        const sampleOn = r.rows.some((x) => x.kind === "qty" && x.on);
        const sampleRow = r.rows.find((x) => x.kind === "qty");
        return (
          <div className={`psw-row prs-row${answered ? " done" : ""}${r.skipped ? " skipped" : ""}`} key={r.queryId}>
            <div className="psw-top">
              <span className="psw-who">
                <span className="psw-name">{r.agentName}</span>
                {r.agency && <span className="psw-agy"> · {r.agency}</span>}
              </span>
              <span className="psw-sp" />
              {answered ? (
                <span className="psw-state"><Check size={11} aria-hidden /> Recorded</span>
              ) : (
                <button type="button" className="psw-skip"
                  onClick={() => setRow(i, { skipped: !r.skipped })}>
                  {r.skipped ? "Bring back" : "Skip"}
                </button>
              )}
            </div>

            {/* the send this attaches to — stated, never asked for */}
            <p className="prs-sent">Sent {r.sentOn}</p>

            {!r.skipped && (
              <>
                <div className="prs-ticks">
                  {r.rows.filter((x) => x.kind === "binary").map((x) => (
                    <button type="button" key={x.key} className={`prs-tick${x.on ? " on" : ""}`}
                      aria-pressed={x.on}
                      onClick={() => setMats(i, r.rows.map((y) => (y.key === x.key ? { ...y, on: !y.on } : y)))}>
                      <span className="prs-bx" aria-hidden>{x.on ? <Check size={9} /> : null}</span>
                      {x.name}
                    </button>
                  ))}

                  {/* ⚠️ THE SAMPLE STATES ITS OWN VALUE INLINE — "3 chapters", not a bare tick. Its
                      unit editor opens BENEATH THIS ROW ONLY, on demand. */}
                  {sampleRow && (
                    <button type="button" className={`prs-tick${sampleOn ? " on" : ""}`} aria-pressed={sampleOn}
                      onClick={() => {
                        if (!sampleOn) {
                          setMats(i, r.rows.map((y) => (y.kind === "qty"
                            ? { ...y, on: true, amount: snapToUnit(y.unit) } : y)));
                          setEditing(r.queryId);
                          return;
                        }
                        setEditing(editing === r.queryId ? null : r.queryId);
                      }}>
                      <span className="prs-bx" aria-hidden>{sampleOn ? <Check size={9} /> : null}</span>
                      {sampleOn && sampleRow.kind === "qty" && sampleRow.amount
                        ? `${sampleRow.amount} ${sampleRow.unit.toLowerCase()}`
                        : MATERIAL_ROW_NAMES.sample}
                    </button>
                  )}

                  {r.rows.filter((x) => x.kind === "text").map((x) => (
                    <button type="button" key={x.key} className={`prs-tick${x.on ? " on" : ""}`}
                      aria-pressed={x.on}
                      onClick={() => setMats(i, r.rows.map((y) => (y.key === "other" ? { ...y, on: !y.on } : y)))}>
                      <span className="prs-bx" aria-hidden>{x.on ? <Check size={9} /> : null}</span>
                      Something else
                    </button>
                  ))}
                </div>

                {sampleOn && editing === r.queryId && (
                  <div className="prs-editor">
                    <SampleSpecPicker rows={r.rows} onChange={(next) => setMats(i, next)}
                      join="and" idPrefix={`prs-${r.queryId}`} hideSummary />
                  </div>
                )}

                {r.rows.find((x) => x.kind === "text")?.on && (
                  <input type="text" className="prs-other"
                    value={(r.rows.find((x) => x.kind === "text") as { text: string } | undefined)?.text ?? ""}
                    placeholder="What else went with it?"
                    onChange={(e) => setMats(i, r.rows.map((y) => (y.key === "other" ? { ...y, text: e.target.value } : y)))} />
                )}

                {summary && <p className="prs-sum">{summary}</p>}
              </>
            )}
          </div>
        );
      })}

      {/* ⚠️ THE REST ARE BEHIND A DISCLOSURE, NEVER DROPPED — and it states how many. */}
      {hidden > 0 && (
        <button type="button" className="prs-more" onClick={() => setShowAll(true)}>
          Show {hidden} more
        </button>
      )}
    </>
  );
};

export interface PaneRecordSweepFootProps {
  rows: RecordSweepRow[];
  onDismissAll: () => void;
  onCommit: () => void;
  saving?: boolean;
}

export const PaneRecordSweepFoot: React.FC<PaneRecordSweepFootProps> = ({ rows, onDismissAll, onCommit, saving = false }) => {
  const n = sweepAnsweredCount(rows);
  return (
    <div className="psw-foot">
      {/* ⚠️ NO PROGRESS BAR AND NO PER-ROW STATUS COLUMN. The count is the whole of the state. */}
      <span className="psw-hint">{n === 0 ? "Tick what went with each query." : `${n} ready to record.`}</span>
      {/* ⚠️ A BULK DISMISSAL, because fourteen tasks must not need dismissing one at a time. */}
      <button type="button" className="psw-ghost" onClick={onDismissAll}>Leave them all unrecorded</button>
      <button type="button" className="psw-prime" disabled={n === 0 || saving} onClick={onCommit}>
        {sweepActLabel(n)}
      </button>
    </div>
  );
};
