/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE BOARD (colours-v2 run, Phase 4; ref query-centre-v10-board-headline-locked.html, density B
 * shingled, Headline headers). Seven columns in the pipeline's own order, each a read of where
 * things sit.
 *
 * ⚠️ NO DRAG, AND THAT IS THE DESIGN RATHER THAN AN OMISSION. Status is DERIVED from the activity
 * log by `recomputeQuery`; a card dragged between columns would be asking the board to write a
 * status, which is the one thing this app never does directly. The board is a read — every change
 * of column comes from recording what happened. No handler here accepts a drop.
 *
 * ⚠️ THE COLUMN SAYS WHERE IT SITS; THE BAND SAYS WHAT IT IS. Cards drop their band because the
 * column already names the status — except a card whose status is not the column's own (an R&R in
 * Full Requested, a No response in Closed), which keeps its band so the board never states
 * something the record does not.
 */
import React from "react";
import "./queryBoardView.css";
import { StatusDot } from "../StatusDot";
import type { GridCard } from "./QueryCentreGrid";
import { BOARD_COLUMNS } from "../../lib/queryCentreGrid";
import { stateFor, turnWordFor } from "../../lib/queryCardFacts";
import type { QueryStatus } from "../../types";

export const QueryBoardView: React.FC<{
  rows: readonly GridCard[];
  selectedId?: string | null;
  onOpen?: (id: string) => void;
}> = ({ rows, selectedId, onOpen }) => (
  <div className="qbv" role="list">
    {BOARD_COLUMNS.map((col) => {
      const cards = rows.filter((r) => col.statuses.includes(r.status));
      /* the header's own colour comes from the column's FIRST status — the one it is named for —
         so a column collecting two statuses is still headed by the state it announces */
      const headState = stateFor(col.statuses[0]);
      return (
        <section key={col.key} className={`qbv-col qcc--st-${headState}`} data-qbv-col={col.key} role="listitem">
          <header className="qbv-h">
            <div className="qbv-htop">
              <StatusDot status={col.statuses[0]} overrideSize={20} decorative />
              <span className="qbv-hw">{col.label}</span>
              <span className="qbv-hn">{cards.length}</span>
            </div>
            {/* indented to the WORD, not to the box — the caption belongs to the status beside it */}
            <div className="qbv-hcap">{turnWordFor(col.statuses[0])}</div>
          </header>

          <div className="qbv-cards">
            {cards.map((r) => {
              /* the band survives only where the card's status is not the column's own */
              const alt = r.status !== col.statuses[0];
              const f = r.facts;
              return (
                <article
                  key={r.id}
                  className={`qbv-card qcc--st-${f.state}${alt ? " qbv-card--alt" : ""}${selectedId === r.id ? " qbv-card--on" : ""}`}
                  data-qbv-id={r.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onOpen?.(r.id)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen?.(r.id); } }}
                >
                  <span className="qbv-strip" aria-hidden="true" />
                  {alt && (
                    <div className="qbv-band">
                      <StatusDot status={r.status as QueryStatus} overrideSize={16} decorative />
                      <span>{r.status}</span>
                    </div>
                  )}
                  <div className="qbv-body">
                    <div className="qbv-who">
                      <span className="qbv-chip" aria-hidden="true">{r.initials}</span>
                      <span className="qbv-whotx">
                        <span className="qbv-nm">{r.name}</span>
                        <span className="qbv-ag">{r.agency}</span>
                      </span>
                      {f.leaf && (
                        <span className="qbv-leaf" aria-hidden="true">
                          <span className="qbv-mo">{f.leaf.month}</span>
                          <span className="qbv-dy">{f.leaf.day}</span>
                        </span>
                      )}
                    </div>
                    <div className="qbv-fact">
                      <span className="qbv-fs">
                        {f.attention && <span className="qbv-mk" aria-hidden="true">!</span>}
                        {f.sentence.map((run, i) => (run.strong ? <b key={i}>{run.text}</b> : <React.Fragment key={i}>{run.text}</React.Fragment>))}
                      </span>
                      {f.caption && <span className="qbv-m">{f.caption}</span>}
                    </div>
                  </div>
                </article>
              );
            })}
            {cards.length === 0 && <p className="qbv-empty">Nothing here</p>}
          </div>
        </section>
      );
    })}
  </div>
);
