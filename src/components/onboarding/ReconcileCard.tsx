/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ReconcileCard — a repeated submission, on the duplicates step (onboarding v5 part 2; ref
 * design-refs/onboarding/onboarding-journey-v5.html #dupes). It asks the writer to confirm two
 * recorded rows are the SAME submission at two stages (collapse → keep one query, the other row's
 * facts go into its history) or, rarely, to keep them as two separate queries.
 *
 * Presentational only: it owns its own row-selection + split-note UI state, but performs NO model
 * mutation — every decision is reported via the callback props (onLooksRight / onSplit / onChange).
 * The parent owns the `resolved` flag; null = working state, set = sorted (post-decision) state.
 *
 * ⚠️ ITS WORDS ARE THE BUILD'S. The two rows are choices: the kept one is ringed and labelled
 * "kept", the other "discard", and the engine's current row "most recent". Statuses are drawn by
 * <StatusDot>. Its dress is in importFlow.css; the block sits inside the duplicates list card.
 */
import React, { useState } from "react";
import "./importFlow.css";
import { QueryStatus } from "../../types";
import { StatusDot } from "../StatusDot";
import { Chip } from "./ImportParts";

export interface ReconcileCardRow {
  id: string; // query id (stable key)
  status: QueryStatus; // exact enum
  dateLabel: string; // pre-formatted, e.g. "1 May 2024" or "no date"
  note: string; // e.g. "asked for 50pp"; "" when the row has no note
}

export interface ReconcileCardProps {
  agentName: string; // headline: "Two rows for {agentName}"
  manuscriptTitle: string; // confirming context (per-row title + "manuscript" mono tag). If "", omit the title line.
  rows: ReconcileCardRow[]; // exactly two rows
  defaultKeptId: string; // engine-derived current row's id → pre-selected on mount
  resolved: { keptId: string; kind: "collapsed" | "split" } | null; // null = working; set = sorted
  onLooksRight: (keptId: string) => void; // user confirmed collapse, keeping this row
  onSplit: () => void; // keep both as separate queries (the rare split)
  onChange: () => void; // "↩ Change this" — revert from sorted back to working
  /** The duplicate set this card settles — its leader's id, carried on the block for the locks. */
  setId?: string;
}

export const ReconcileCard: React.FC<ReconcileCardProps> = ({
  agentName, manuscriptTitle, rows, defaultKeptId, resolved, onLooksRight, onSplit, onChange, setId,
}) => {
  // Selection starts at the engine-derived current row; pressing a row re-selects (working state only).
  const [selectedId, setSelectedId] = useState<string>(defaultKeptId);
  const [splitOpen, setSplitOpen] = useState<boolean>(false);
  const hasTitle = manuscriptTitle.trim().length > 0;

  // ── SORTED STATE ───────────────────────────────────────────────────────────
  if (resolved !== null) {
    const kept = rows.find((r) => r.id === resolved.keptId) ?? rows[0];
    const other = rows.find((r) => r.id !== kept.id) ?? rows[1];
    return (
      <div className="im-dupe" data-im="reconcile" data-state={resolved.kind} data-dup-set={setId} data-dup-state={resolved.kind} data-dup-kind="reconcile">
        <div className="im-result" data-im="reconcile-result">
          {resolved.kind === "split" ? (
            <span><b>{agentName}</b> — kept as <b>two separate queries</b>.</span>
          ) : (
            <span>
              <b>{agentName}</b> — kept as one query at <b>{kept.status}</b>. We discarded the duplicate row, but saved{" "}
              <b>{other.status.toLowerCase()}{other.note ? ` · "${other.note}"` : ""}</b> to the query's history.
            </span>
          )}
        </div>
        <div className="im-dupeact">
          <button type="button" className="sf-link sf-link--quiet" onClick={onChange} data-im="reconcile-change">↩ Change this</button>
        </div>
      </div>
    );
  }

  // ── WORKING STATE ──────────────────────────────────────────────────────────
  const selected = rows.find((r) => r.id === selectedId) ?? rows[0];
  const other = rows.find((r) => r.id !== selected.id) ?? rows[1];
  return (
    <div className="im-dupe" data-im="reconcile" data-state="open" data-dup-set={setId} data-dup-state="open" data-dup-kind="reconcile">
      <h3 className="im-dupeh">Two rows for {agentName}</h3>
      <p>
        These look like the <b>same submission</b>, recorded at two stages — not two separate queries. We'll keep one
        query, and use the other row to fill in its history.
      </p>
      <div className="im-picks" role="radiogroup" aria-label={`Which row to keep for ${agentName}`}>
        {rows.map((row) => {
          const isSelected = row.id === selected.id;
          const isLatest = row.id === defaultKeptId;
          return (
            <button type="button" role="radio" aria-checked={isSelected} key={row.id}
              className={`im-pick${isSelected ? " is-kept" : ""}`} onClick={() => setSelectedId(row.id)} data-pick={row.id}>
              <i className={`im-rdot${isSelected ? " is-on" : ""}`} aria-hidden="true" />
              <span>
                {hasTitle && <span className="im-pickname">{manuscriptTitle} <span className="im-when">manuscript</span></span>}
                <span className="im-stat"><StatusDot status={row.status} overrideSize={18} />{row.status}<small className="im-when">{row.dateLabel}</small></span>
                {row.note && <q>"{row.note}"</q>}
              </span>
              <span className="im-pickend">
                {isLatest && <Chip>most recent</Chip>}
                {isSelected ? <Chip className="im-chip--navy">kept</Chip> : <Chip>discard</Chip>}
              </span>
            </button>
          );
        })}
      </div>

      {/* what comes of it */}
      <div className="im-result im-result--col" data-im="reconcile-result">
        <span className="im-harvest"><StatusDot status={selected.status} overrideSize={18} /><span>One query, kept at <b>{selected.status}</b></span></span>
        <small>Kept from the discarded row</small>
        <span className="im-harvest">
          <StatusDot status={other.status} overrideSize={18} />
          <b>{other.status}</b>
          {other.note && <i>"{other.note}"</i>}
          <span>· {other.dateLabel}</span>
        </span>
        <i>Added to this query's history — you'll see it in the query's details.</i>
      </div>

      {splitOpen && (
        <div className="im-splitask" data-im="split-ask">
          <b>Keep both as separate queries?</b>
          <br />
          Only if {agentName} is genuinely handling two different manuscripts for you. The same manuscript twice is
          almost always one submission — so this is rare.
          <div>
            <button type="button" className="sf-btn sf-btn--sm" onClick={onSplit}>Keep both</button>
            <button type="button" className="sf-link sf-link--quiet" onClick={() => setSplitOpen(false)}>Never mind</button>
          </div>
        </div>
      )}

      <div className="im-dupeact">
        <button type="button" className="sf-link sf-link--quiet" aria-expanded={splitOpen} onClick={() => setSplitOpen((o) => !o)} data-im="reconcile-split">
          These are actually different submissions
        </button>
        <span className="im-sp" />
        <button type="button" className="sf-btn sf-btn--sm" onClick={() => onLooksRight(selected.id)} data-im="reconcile-right">Looks right</button>
      </div>
    </div>
  );
};
