/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Comparable titles v32 §A (design-refs/comps-v32/): the page's header — the shared navy header
 * (shell/WorkspaceNavyHeader), unchanged, with this page's words in its slots: "{n} comparable titles", Add and How it
 * works, and on the right the current letter's comps.
 *
 * ⚠️ THE CURRENT LETTER IS `inUseLetter` (lib/queryLetters), the one the Letters page marks "In use for new queries";
 *    its comps are `compsInLetter` (lib/compUsage) and its sends compUsage's `sentByLetter`. Nothing here counts.
 * ⚠️ THE HEADLINE'S SIZE IS THIS PAGE'S ONLY (`.cp32-hdr`, comps32.css §A): the header component and every other
 *    page's header are untouched.
 */
import React from "react";
import { WorkspaceNavyHeader } from "../../shell/WorkspaceNavyHeader";

export interface CurrentLetter { id: string; name: string; sent: number; titles: string[] }

export type TopState32 =
  | { kind: "loading" }
  | { kind: "nobook" }
  | { kind: "empty"; book: string }
  | { kind: "listed"; book: string; total: number; full: boolean; current: CurrentLetter | null };

/** "7 comparable titles", "1 comparable title" */
export const compsTitle32 = (n: number): string => `${n} comparable ${n === 1 ? "title" : "titles"}`;
export const COMPS_EMPTY_TITLE32 = "No comparable titles yet";
export const COMPS_NO_BOOK_TITLE32 = "No manuscript yet";

export const CompsTop32: React.FC<{
  state: TopState32;
  addRef?: React.Ref<HTMLButtonElement>;
  onAdd: () => void;
  onHow: () => void;
  onExplain: () => void;
  onSeeLetter: (letterId: string) => void;
}> = ({ state, addRef, onAdd, onHow, onExplain, onSeeLetter }) => {
  const title = state.kind === "listed" ? compsTitle32(state.total) : state.kind === "empty" ? COMPS_EMPTY_TITLE32
    : state.kind === "nobook" ? COMPS_NO_BOOK_TITLE32 : " ";
  const cur = state.kind === "listed" ? state.current : null;
  return (
    <WorkspaceNavyHeader page="comps" art="comps-header" loading={state.kind === "loading"} className="cp32-hdr"
      title={title}
      forLine={state.kind === "listed" || state.kind === "empty" ? { lead: "for", text: state.book } : null}
      actions={state.kind === "listed" ? <>
        <button ref={addRef} type="button" className="qc1531-b qc1531-b--n" data-cp="add" data-cx-key="add" disabled={state.full} onClick={onAdd}>+ Add a comp</button>
        <button type="button" className="qc1531-b qc1531-b--g" data-cp="how" data-cx-key="how" onClick={onHow}>How it works</button>
      </> : state.kind === "empty" ? <>
        <button ref={addRef} type="button" className="qc1531-b qc1531-b--n" data-cp="add" data-cx-key="add" onClick={onAdd}>+ Add your first comp</button>
        <button type="button" className="qc1531-b qc1531-b--g" data-cp="explain" data-cx-key="explain" onClick={onExplain}>What makes a good comp?</button>
      </> : state.kind === "loading" ? <>
        <button type="button" className="qc1531-b qc1531-b--n" disabled>+ Add a comp</button>
        <button type="button" className="qc1531-b qc1531-b--g" disabled>How it works</button>
      </> : null}
      right={cur ? (
        <div className="cp32-cb" data-cp="current" data-letter={cur.id}>
          <span className="cp32-cbk">In your current letter</span>
          <b className="cp32-cbn" data-cp="current-comps">
            {cur.titles.length
              ? cur.titles.map((t, i) => <span key={`${t}-${i}`} data-cp="current-comp">{t}</span>)
              : <span data-cp="current-none">No comps yet</span>}
          </b>
          <span className="cp32-cbs" data-cp="current-letter">
            {cur.name}{cur.sent ? `, sent to ${cur.sent} ${cur.sent === 1 ? "agent" : "agents"}` : ", not sent yet"}
          </span>
          <button type="button" className="qc1531-b qc1531-b--g" data-cp="current-see" data-cx-key="current-see" onClick={() => onSeeLetter(cur.id)}>See the letter</button>
        </div>
      ) : null}
      bar={state.kind === "nobook" || state.kind === "loading" ? null : {
        title,
        aside: cur && cur.titles.length ? <><b data-cp="slim-current">{cur.titles.length}</b><em>in your current letter</em></> : null,
        button: state.kind === "listed"
          ? { label: "Add a comp", onClick: onAdd, disabled: state.full }
          : { label: "Add your first comp", onClick: onAdd },
      }} />
  );
};
