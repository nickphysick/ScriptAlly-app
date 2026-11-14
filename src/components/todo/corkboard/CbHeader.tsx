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
 *
 * ⚠️ WORKSPACE HEADERS v1 (14 Nov): ON A PHONE ONLY. From 768px up the page opens on `CbNavyHeader` (below), the shared
 *    navy header; this panel stays for the phone, which the workspace headers do not reach.
 */
import React from "react";
import { boardSentence, glanceRows, type Glance, type GlanceKey, CORKBOARD_RING_ART } from "../../../lib/corkboard";
import { NOTE_PAPERS } from "../../../lib/noteboard";
import type { NoteColour } from "../../../types";
import { WorkspaceNavyHeader, WsnhWords } from "../../shell/WorkspaceNavyHeader";

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

/* ══ Workspace headers v1 (design-refs/workspace-headers-v1, "Corkboard") — the desktop's navy header: "<n> notes"
   (the board's count, as the sentence counted it) "on your board"; + New note and Add a task (none while the board is
   empty, as before); on the right "Pick a colour" and the five swatches, each starting a note in that paper, as the
   panel's did. The bar: the headline and + New note. Empty: "No notes yet", + New note, no right block. ══ */
export const cbTitle = (n: number): string => `${n} ${n === 1 ? "note" : "notes"}`;
export const CB_EMPTY_TITLE = "No notes yet";
export const CbNavyHeader: React.FC<{ count: number | null; onNew: (colour?: NoteColour) => void; onTask: () => void }> = ({ count, onNew, onTask }) => {
  const loading = count === null;
  const empty = count === 0;
  const title = loading ? " " : empty ? CB_EMPTY_TITLE : cbTitle(count);
  return (
    <WorkspaceNavyHeader page="corkboard" art="corkboard-header" loading={loading}
      title={title}
      forLine={{ text: "on your board" }}
      actions={<>
        <button type="button" className="qc1531-b qc1531-b--n" data-cb2="new-note" onClick={() => onNew()}>+ New note</button>
        {empty ? null : <button type="button" className="qc1531-b qc1531-b--g" data-cb2="add-task" disabled={loading} onClick={onTask}>Add a task</button>}
      </>}
      right={empty ? null : (
        <div className="cb2-hpick" data-cb2="pick">
          <WsnhWords name="Pick a colour" />
          <div className="cb2-hsws">
            {NOTE_PAPERS.map((p) => (
              <button key={p.v} type="button" className="cb2-hsw" data-paper={p.v} aria-label={`New ${p.name.toLowerCase()} note`} onClick={() => onNew(p.v)}>
                <i style={{ background: p.hex }} aria-hidden="true" /><span aria-hidden="true">{p.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      bar={{ title, button: { label: "+ New note", onClick: () => onNew() } }} />
  );
};

/** at 768px and up the page opens on the navy header; below it, on the phone's panel. With no `matchMedia` (a node
 *  render) it is the desktop, as the rest of the desktop pages assume. */
export function useCbWide(): boolean {
  const q = "(min-width: 768px)";
  const [on, setOn] = React.useState(() => typeof window === "undefined" || typeof window.matchMedia !== "function" || window.matchMedia(q).matches);
  React.useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
    const m = window.matchMedia(q);
    const put = () => setOn(m.matches);
    put();
    m.addEventListener("change", put);
    return () => m.removeEventListener("change", put);
  }, []);
  return on;
}
