/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BulkFillTable — THE PORT of `design-refs/todo-short-and-bulk.html`'s bulk journey.
 *
 * ⚠️ THE TABLE IS THE JOURNEY. The pane fell through to a generic form with nowhere to update
 * anything: a cohort card that stood for fifteen queries opened a page that could answer about
 * none of them. One row per query, tick what went, set the sample inline.
 *
 * ⚠️ LIFTED OUT OF `PaneRecordSweep`, NOT WRAPPED. Its markup was a stack of cards built for the
 * dock — one `.psw-row` per query with the four materials as a chip list inside it — and the
 * contract draws a TABLE, where the columns do the naming once instead of every row repeating it.
 * What came across is the LOGIC, and it did not have to move at all: `materialsSweep` was already
 * a pure library, so the fills, the answer test, the row summary and the write set are the same
 * functions the retired component called. Nothing about a cohort was re-derived to draw it
 * differently.
 *
 * ⚠️ AND THE FIVE-ROW FOLD IS A DELIBERATE EXCEPTION TO THE EVERYTHING-SHOWS RULE, scoped to
 * COHORT TABLES alone. The list shows every task because a hidden task is work you do not know
 * about; a cohort's fifteenth row is the same work as its first, and fifteen rows of steppers is a
 * wall rather than a page. It states its own count and how many are behind the fold, so nothing is
 * silently truncated — which is the half of the rule that always applies.
 */
import React, { useState } from "react";
import { Check } from "lucide-react";
import { SampleSpecPicker } from "../materials/SampleSpecPicker";
import { snapToUnit, type MaterialRow } from "../../lib/agentMaterials";
import {
  SWEEP_CAVEAT, SWEEP_VISIBLE_ROWS, copyFirstDown, fillFromAsks, rowHasAnswer,
  type RecordSweepRow,
} from "../../lib/materialsSweep";

export interface BulkFillTableProps {
  rows: RecordSweepRow[];
  onChange: (rows: RecordSweepRow[]) => void;
}

/** the three tick columns, in the contract's order — named once, here */
const TICKS: { key: string; head: string }[] = [
  { key: "letter", head: "Covering letter" },
  { key: "synopsis", head: "Synopsis" },
];

export const BulkFillTable: React.FC<BulkFillTableProps> = ({ rows, onChange }) => {
  const [showAll, setShowAll] = useState(false);
  /* ⚠️ ONE EDITOR OPEN AT A TIME. Fifteen unit steppers hanging open is a wall of controls; the
     cell states its own value inline and the editor arrives when it is asked for. */
  const [editing, setEditing] = useState<string | null>(null);

  /**
   * ⚠️ OLDEST SENT FIRST, AND SORTED HERE RATHER THAN ASSUMED. The cohort arrives in whatever order
   * the gap derivation found it; the writer works down a list that starts with the query that has
   * been waiting longest, because that is the one whose record is most out of date.
   */
  const ordered = [...rows].sort((a, b) => a.sentMs - b.sentMs);
  const visible = showAll ? ordered : ordered.slice(0, SWEEP_VISIBLE_ROWS);
  const hidden = ordered.length - visible.length;

  /* patches are applied against the row's IDENTITY, never its index — the table is sorted, and an
     index into the sorted view is not an index into the array the caller holds */
  const setMats = (queryId: string, next: MaterialRow[]) =>
    onChange(rows.map((r) => (r.queryId === queryId ? { ...r, rows: next } : r)));

  const toggle = (r: RecordSweepRow, key: string) =>
    setMats(r.queryId, r.rows.map((y) => (y.key === key ? { ...y, on: !y.on } : y)));

  return (
    <>
      {/* ⚠️ TWO FILLS, AND NEITHER IS A PACKAGE-FOR-ALL. One reads each agency's own guidelines; the
          other says "the same as the first". A single template applied to every row would state
          that every send carried the same parcel. */}
      <div className="fillrow">
        <button type="button" className="fb" onClick={() => onChange(fillFromAsks(rows))}>
          Start from what each agent asks for
        </button>
        <button type="button" className="fb" onClick={() => onChange(copyFirstDown(rows))}>
          Copy the first row down
        </button>
        <span className="caveat">{SWEEP_CAVEAT}</span>
      </div>

      {/* ⚠️ THE COHORT'S OWN ANCHOR. `s-rows` is what the declaration names, so the square and the
          scroll reach the table by the same route every other requirement is reached — there is no
          special case for the one journey whose answer is "touch a row". */}
      <table className="bulk" id="s-rows">
        <thead>
          <tr>
            <th>Agent</th>
            <th>Sent</th>
            {TICKS.map((t) => <th key={t.key}>{t.head}</th>)}
            <th>Opening sample</th>
            {/* ⚠️ THE ONE OPTIONAL COLUMN, AND THE TAG IS ON THE HEADER. Marking it per cell would
                repeat the same word down fifteen rows to say one thing about the column. */}
            <th>Something else <span className="opttag">OPTIONAL</span></th>
          </tr>
        </thead>
        <tbody>
          {visible.map((r) => {
            const sampleRow = r.rows.find((x) => x.kind === "qty");
            const sampleOn = !!sampleRow && sampleRow.kind === "qty" && sampleRow.on;
            const other = r.rows.find((x) => x.kind === "text");
            return (
              <React.Fragment key={r.queryId}>
                <tr className={rowHasAnswer(r) ? "bulkrow done" : "bulkrow"}>
                  <td>
                    <span className="bulk-who">{r.agentName}</span>
                    {r.agency && <span className="bulk-agy"> · {r.agency}</span>}
                  </td>
                  {/* the sent date carries its own millisecond stamp, so the ordering this table
                      claims can be read off the page rather than taken on trust */}
                  <td className="bulk-sent" data-ms={r.sentMs}>{r.sentOn}</td>
                  {TICKS.map((t) => {
                    const row = r.rows.find((x) => x.key === t.key);
                    return (
                      <td key={t.key}>
                        <button type="button" aria-label={`${t.head} — ${r.agentName}`}
                          className={row?.on ? "tick on" : "tick"} aria-pressed={!!row?.on}
                          onClick={() => toggle(r, t.key)}>
                          {row?.on ? <Check size={10} /> : null}
                        </button>
                      </td>
                    );
                  })}
                  <td>
                    {/* ⚠️ THE SAMPLE CELL STATES ITS VALUE AND OPENS THE REAL PICKER — never a
                        free-text prompt. "3 chapters" is a unit and an amount, and a box that
                        accepts any words would record a quantity nothing can read back. */}
                    <button type="button" className="samp"
                      aria-label={`Opening sample — ${r.agentName}`}
                      onClick={() => {
                        if (!sampleOn) {
                          setMats(r.queryId, r.rows.map((y) => (y.kind === "qty"
                            ? { ...y, on: true, amount: snapToUnit(y.unit) } : y)));
                          setEditing(r.queryId);
                          return;
                        }
                        setEditing(editing === r.queryId ? null : r.queryId);
                      }}>
                      {sampleOn && sampleRow?.kind === "qty" && sampleRow.amount
                        ? `${sampleRow.amount} ${sampleRow.unit.toLowerCase()}`
                        : "set…"}
                    </button>
                  </td>
                  <td>
                    <input type="text" className="txt bulk-other"
                      aria-label={`Something else — ${r.agentName}`}
                      value={other && other.kind === "text" ? other.text : ""}
                      placeholder="—"
                      onChange={(e) => setMats(r.queryId, r.rows.map((y) => (y.key === "other" && y.kind === "text"
                        ? { ...y, on: e.target.value.trim() !== "", text: e.target.value } : y)))} />
                  </td>
                </tr>
                {sampleOn && editing === r.queryId && (
                  <tr className="bulk-editrow">
                    <td colSpan={6}>
                      <SampleSpecPicker rows={r.rows} onChange={(next) => setMats(r.queryId, next)}
                        join="and" mode="sent" idPrefix={`bulk-${r.queryId}`} hideSummary />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>

      {/* ⚠️ THE FOLD STATES WHAT IS BEHIND IT. A count that said only "5" would be a truncation
          nobody could see; this says how many there are and how they are ordered. */}
      <div className="bulk-foot">
        Showing {visible.length} of {ordered.length} · oldest first
        {hidden > 0 && (
          <>
            {" · "}
            <a href="#" className="bulk-showall"
              onClick={(e) => { e.preventDefault(); setShowAll(true); }}>show all {ordered.length}</a>
          </>
        )}
      </div>
    </>
  );
};
