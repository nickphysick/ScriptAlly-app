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
import { boardSentence, glanceRows, figureRows, type Figures, type FigureKey, type Glance, type GlanceKey, CORKBOARD_RING_ART } from "../../../lib/corkboard";
import { NOTE_PAPERS } from "../../../lib/noteboard";
import type { NoteColour } from "../../../types";
import { WorkspaceNavyHeader } from "../../shell/WorkspaceNavyHeader";

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
   (the board's count) "on your board"; + New note and Add a task (none while the board is empty, as before). The bar:
   the headline and + New note. Its place, height and the gap beneath it are the app's header locks (wsHeaders).

   CORKBOARD v15 (ref design-refs/corkboard-v15/, `.brk` / `.pick`) — THE RIGHT-HAND BLOCK: up to three typewriter
   figures in a row, split by hairlines, each with its icon and words (lib/corkboard `figureRows`: linked to agents, on
   your to-do list, pinned to top; ⚠️ A FIGURE AT ZERO IS NOT SHOWN). Each is a button that filters the board to those
   notes (pressed: the figure turns terracotta and its words underline); pressing it again clears the filter. With no
   figure above zero it is "Pick a colour" and the five papers; on an empty board, "Pick a colour to start". ══ */
export const cbTitle = (n: number): string => `${n} ${n === 1 ? "note" : "notes"}`;
export const CB_EMPTY_TITLE = "No notes yet";
const ico = (d: React.ReactNode, w = 1.8) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);
export const CB15_ICON = {
  pin: ico(<path d="M9 3h6l-1 6 4 4H6l4-4-1-6zM12 13v8" />),
  tick: ico(<path d="M5 12.5l4.5 4.5L19 7.5" />, 2.2),
  link: ico(<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M17 8.5h4.5M19.2 6.2v4.6" /></>),
  col: ico(<><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M14 20v-6h6" /></>),
  todo: ico(<><path d="M10 6h10M10 12h10M10 18h10" /><path d="m3.5 6 1.2 1.2L7 5M3.5 12l1.2 1.2L7 11M3.5 18l1.2 1.2L7 17" /></>),
  more: ico(<><circle cx="5" cy="12" r="1.3" fill="currentColor" /><circle cx="12" cy="12" r="1.3" fill="currentColor" /><circle cx="19" cy="12" r="1.3" fill="currentColor" /></>),
  edit: ico(<path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" />),
  up: ico(<path d="M12 19V6M6 11l6-6 6 6" />),
  down: ico(<path d="M12 5v13M6 13l6 6 6-6" />),
  stack: ico(<><rect x="4" y="4" width="13" height="13" rx="1.5" /><path d="M20 8v12H8" /></>),
  bin: ico(<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13" />),
  find: ico(<><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></>),
  board: ico(<><rect x="3.5" y="3.5" width="7" height="7" rx="1" /><rect x="13.5" y="3.5" width="7" height="7" rx="1" /><rect x="3.5" y="13.5" width="7" height="7" rx="1" /><rect x="13.5" y="13.5" width="7" height="7" rx="1" /></>),
  back: ico(<path d="M19 12H5M11 6l-6 6 6 6" />, 2),
} as const;
const FIG_ICON: Readonly<Record<FigureKey, React.ReactNode>> = { linked: CB15_ICON.link, onTodo: CB15_ICON.tick, pinned: CB15_ICON.pin };

export interface CbNavyHeaderProps {
  /** null while the notes are loading */
  count: number | null;
  figures: Figures;
  /** the figure filtering the board, if one is */
  special: FigureKey | null;
  onSpecial: (k: FigureKey) => void;
  onNew: (colour?: NoteColour) => void;
  onTask: () => void;
}
export const CbNavyHeader: React.FC<CbNavyHeaderProps> = ({ count, figures: f, special, onSpecial, onNew, onTask }) => {
  const loading = count === null;
  const empty = count === 0;
  const title = loading ? " " : empty ? CB_EMPTY_TITLE : cbTitle(count);
  const rows = figureRows(f);
  const right = rows.length && !empty ? (
    <div className="cb15-brk" data-cb15="figures">
      {rows.map((r) => (
        <button key={r.k} type="button" className={special === r.k ? "cb15-on" : undefined} data-fig={r.k} aria-pressed={special === r.k}
          title="Show only these" onClick={() => onSpecial(r.k)}>
          <b>{r.n}</b><span>{FIG_ICON[r.k]}{r.words}</span>
        </button>
      ))}
    </div>
  ) : (
    <div className="cb15-pick" data-cb15="pick" data-cb2="pick">
      <div className="cb15-st">{empty ? "Pick a colour to start" : "Pick a colour"}</div>
      <div className="cb15-sl">Each one starts a new note on that paper.</div>
      <div className="cb15-psws">
        {NOTE_PAPERS.map((p) => (
          <button key={p.v} type="button" className="cb2-hsw" data-paper={p.v} aria-label={`New ${p.name.toLowerCase()} note`} onClick={() => onNew(p.v)}>
            <i style={{ ["--c" as string]: p.hex }} aria-hidden="true" /><span aria-hidden="true">{p.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
  return (
    <WorkspaceNavyHeader page="corkboard" art="corkboard-header" loading={loading}
      title={title}
      forLine={{ text: "on your board" }}
      actions={<>
        <button type="button" className="qc1531-b qc1531-b--n" data-cb2="new-note" onClick={() => onNew()}>+ New note</button>
        {empty ? null : <button type="button" className="qc1531-b qc1531-b--g" data-cb2="add-task" disabled={loading} onClick={onTask}>Add a task</button>}
      </>}
      right={right}
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
