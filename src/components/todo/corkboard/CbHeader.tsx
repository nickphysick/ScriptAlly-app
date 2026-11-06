/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CbHeader — the Corkboard's navy panel header (Corkboard v2, Part B; ref design-refs/corkboard-v13/, `.hp`).
 *
 * ⚠️ A PAGE-LOCAL COPY OF THE CONTACT LIST'S PANEL, NOT A LIFT. The Contact list's header is page-local too
 * (agents/contact/ContactHeader26 + contactV26.css, `.cl26-*`), so this restates its values under `cb2-` rather
 * than importing another page's component: background, radius, padding, the title and sentence faces, the two
 * buttons and the 124px ring. Lock CB2 holds the two panels' background, radius and inset equal on the rendered
 * pages, so a change to one shows as a red on the other. Lift candidate, with the Contact list's.
 *
 * Left: "Corkboard", the sentence (`boardSentence`), "+ New note" and "Add a task" (the second is absent while the
 * board is empty). Right: the ring with its art slot, then At a glance (`glanceRows`; a zero row is not shown) — or,
 * with no rows to show, Pick a colour (five swatches, each starting a note in that paper).
 */
import React from "react";
import { boardSentence, glanceRows, type Glance, type GlanceKey, CORKBOARD_RING_ART } from "../../../lib/corkboard";
import { NOTE_PAPERS } from "../../../lib/noteboard";
import type { NoteColour } from "../../../types";

export interface CbHeaderProps {
  /** null while the notes are loading: the sentence holds its box and the right-hand side is hidden */
  count: number | null;
  glance: Glance;
  special: GlanceKey | null;
  onSpecial: (k: GlanceKey) => void;
  onNew: (colour?: NoteColour) => void;
  onTask: () => void;
}

export const CbHeader: React.FC<CbHeaderProps> = ({ count, glance, special, onSpecial, onNew, onTask }) => {
  const loading = count === null;
  const empty = count === 0;
  const rows = glanceRows(glance);
  const pick = empty || rows.length === 0;
  return (
    <header className="cb2-hd" data-cb2="header">
      <div className="cb2-panel" data-cb2="panel">
        <div className="cb2-left">
          <h1 className="cb2-title" data-page-title="">Corkboard</h1>
          <p className="cb2-line" data-cb2="sentence">
            {loading ? <span className="cb2-sk">&nbsp;</span>
              : boardSentence(count, glance.onTodo).map((r, i) => (r.b ? <b key={i}>{r.t}</b> : <React.Fragment key={i}>{r.t}</React.Fragment>))}
          </p>
          <div className="cb2-btns">
            <button type="button" className="cb2-b1" data-cb2="new-note" onClick={() => onNew()}>+ New note</button>
            {empty ? null : <button type="button" className="cb2-b2" data-cb2="add-task" disabled={loading} onClick={onTask}>Add a task</button>}
          </div>
        </div>
        <div className="cb2-right" data-cb2="right" aria-hidden={loading ? true : undefined}>
          <div className="cb2-ring" data-cb2="ring">
            {CORKBOARD_RING_ART
              ? <img className="cb2-art" src={CORKBOARD_RING_ART} alt="" />
              : <span className="cb2-artph" data-cb2="art-slot">Art to come</span>}
          </div>
          {pick ? (
            <div className="cb2-hw cb2-pick" data-cb2="pick">
              <h2 className="cb2-ht">{empty ? "Pick a colour to start" : "Pick a colour"}</h2>
              <div className="cb2-sws">
                {NOTE_PAPERS.map((p) => (
                  <button key={p.v} type="button" className="cb2-sw" data-paper={p.v} style={{ background: p.hex }}
                    aria-label={`New ${p.name.toLowerCase()} note`} onClick={() => onNew(p.v)}>
                    <span>{p.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="cb2-hw" data-cb2="glance">
              <h2 className="cb2-ht">At a glance</h2>
              <div className={`cb2-rows${special ? " cb2-rows--f" : ""}`}>
                {rows.map((r) => (
                  <button key={r.k} type="button" className="cb2-row" data-glance={r.k} aria-pressed={special === r.k} onClick={() => onSpecial(r.k)}>
                    <b>{r.n}</b><span>{r.words}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
