/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE LIST (colours-v2 run, Phase 3; ref query-centre-v9-views-locked.html). One row per query,
 * dense enough to triage: Status · Agent · Sent · What went · Where it stands · Court · ⋯.
 *
 * ⚠️ IT IS THE SAME ROWS AND THE SAME SORT, WITH A DIFFERENT RENDERER. `rows` arrives already
 * narrowed and ordered by the page's own machinery, so nothing here filters or re-sorts; clicking
 * a HEADER hands the page a sort key and it does the ordering. A list that sorted its own copy
 * would be a second answer to "what order are these in".
 *
 * ⚠️ AND THE FACT SENTENCE AND THE FOUR SLOTS ARE THE CARD'S OWN, rendered from the same
 * `CardFacts` — including the two absences the card is careful about: no `!` unless attention is
 * true, and NO material cluster at all when nothing was recorded (four faded slots would state
 * that the query went out empty, which is a much stronger claim than "we do not know").
 */
import React from "react";
import "./queryListView.css";
import { StatusDot } from "../StatusDot";
import { Mark } from "./QueryCard";
import type { GridCard } from "./QueryCentreGrid";
import { MATERIAL_SLOTS } from "../../lib/queryCardFacts";
import { MATERIAL_ROW_NAMES } from "../../lib/agentMaterials";
/**
 * ⚠️ THE KEYS ARE THE PAGE'S OWN, NOT `GRID_SORTS`'. The Query Centre sorts on a richer set
 * (`last_activity`, `date_newest`, `waiting_longest`, `due_soonest`, `journey_depth`, `agent_az`)
 * and the Sort popover writes those; a list header handing back a different vocabulary would be a
 * second sort model over one list. The direction is the page's `sortDesc` flag, which reverses
 * whichever key is active — well-defined for all of them, unlike toggling between paired keys.
 */
type SortKey = string;

/** Which sort each header hands back. `null` = the column states no order of its own. */
export const LIST_COLUMNS: readonly { label: string; sort: SortKey | null }[] = [
  { label: "Status", sort: "journey_depth" },
  { label: "Agent", sort: "agent_az" },
  { label: "Sent", sort: "date_newest" },
  { label: "What went", sort: null },
  { label: "Where it stands", sort: "due_soonest" },
  { label: "Court", sort: null },
  { label: "", sort: null },
];

export const QueryListView: React.FC<{
  rows: readonly GridCard[];
  sortKey: SortKey;
  /** true = the page is showing this sort reversed; the header draws the caret from it */
  sortDesc: boolean;
  selectedId?: string | null;
  onSort: (key: SortKey) => void;
  onOpen?: (id: string) => void;
  onMore?: (id: string, anchor: HTMLElement) => void;
}> = ({ rows, sortKey, sortDesc, selectedId, onSort, onOpen, onMore }) => (
  <div className="qlv">
    <div className="qlv-head" role="row">
      {LIST_COLUMNS.map((c, i) =>
        c.sort ? (
          <button
            key={i}
            type="button"
            className={`qlv-h qlv-h--btn${sortKey === c.sort ? " qlv-h--on" : ""}`}
            aria-sort={sortKey === c.sort ? (sortDesc ? "descending" : "ascending") : "none"}
            onClick={() => onSort(c.sort!)}
          >
            {c.label}
            <span className="qlv-caret" aria-hidden="true">{sortKey === c.sort ? (sortDesc ? "▾" : "▴") : ""}</span>
          </button>
        ) : (
          <span key={i} className="qlv-h">{c.label}</span>
        ),
      )}
    </div>

    {rows.map((r) => {
      const f = r.facts;
      return (
        <div
          key={r.id}
          className={`qlv-row qcc--st-${f.state}${selectedId === r.id ? " qlv-row--on" : ""}`}
          data-qlv-id={r.id}
          role="button"
          tabIndex={0}
          onClick={() => onOpen?.(r.id)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen?.(r.id); } }}
        >
          <span className="qlv-st">
            <StatusDot status={r.status} overrideSize={16} decorative />
            {r.status}
          </span>

          <span className="qlv-who">
            <span className="qlv-chip" aria-hidden="true">{r.initials}</span>
            <span className="qlv-whotx">
              <span className="qlv-nm">{r.name}</span>
              <span className="qlv-ag">{r.agency}</span>
            </span>
          </span>

          <span className="qlv-d">
            {f.leaf ? (<>{f.leaf.day} {f.leaf.month}<small>{f.leaf.caption}</small></>) : <span className="qlv-none">—</span>}
          </span>

          <span className="qlv-mats">
            {f.materialsRecorded
              ? MATERIAL_SLOTS.map((k) => (
                  <span key={k} className={`qlv-ic${f.materials[k] ? "" : " qlv-ic--off"}`} title={MATERIAL_ROW_NAMES[k]}>
                    <Mark kind={k} />
                  </span>
                ))
              : <span className="qlv-none">Not recorded</span>}
          </span>

          <span className="qlv-fs">
            <span className="qlv-fstx">
              {f.attention && <span className="qlv-mk" aria-hidden="true">!</span>}
              {f.sentence.map((run, i) => (run.strong ? <b key={i}>{run.text}</b> : <React.Fragment key={i}>{run.text}</React.Fragment>))}
            </span>
            {f.caption && <small>{f.caption}</small>}
          </span>

          <span className="qlv-turn">{f.turnWord}</span>

          <span className="qlv-more">
            <button
              type="button"
              aria-label={`More actions for ${r.name}`}
              onClick={(e) => { e.stopPropagation(); onMore?.(r.id, e.currentTarget); }}
            >⋯</button>
          </span>
        </div>
      );
    })}
  </div>
);
