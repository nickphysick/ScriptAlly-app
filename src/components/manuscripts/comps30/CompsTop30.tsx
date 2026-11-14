/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Comparable titles — the page's header. Workspace headers v1 (14 Nov) replaced v30 §A's navy title card (its disc,
 * its paragraph and its early "Too soon to say" / "Nothing sent yet" blocks) with the shared navy header
 * (shell/WorkspaceNavyHeader), dressed by the Query Centre's sheets.
 *
 * ⚠️ THE LEADER IS `highlightOf` (lib/compsShelf), AS BEFORE: the ring is its rate, the figures its own.
 */
import React from "react";
import type { Highlight } from "../../../lib/compsShelf";
import { WorkspaceNavyHeader, WsnhRing, WsnhWords } from "../../shell/WorkspaceNavyHeader";


export type TopState =
  | { kind: "loading" }
  | { kind: "nobook" }
  | { kind: "empty"; book: string }
  | { kind: "listed"; book: string; total: number; sent: number; highlight: Highlight; full: boolean };

/** Workspace headers v1: "7 comps on file" — the shelf's count */
export const compsTitle = (n: number): string => `${n} ${n === 1 ? "comp" : "comps"} on file`;
export const COMPS_EMPTY_TITLE = "No comps yet";
export const COMPS_NO_BOOK_TITLE = "No manuscript yet";

/* Workspace headers v1 (design-refs/workspace-headers-v1, "Comparable titles") — the navy header: the count on file for
   the book; Add and Log; on the right the leader once there is one (`highlightOf`, as before: its ring is its rate, its
   title, "<n> of the <n> queries that named it", Open). With no leader yet the right block is absent. The header's
   paragraph is gone, and "How comp tracking works" sits on the shelf's heading row. */
export const CompsTop30: React.FC<{
  state: TopState;
  addRef?: React.Ref<HTMLButtonElement>;
  onAdd: () => void;
  onPick: () => void;
  onExplain: () => void;
  onOpen: (key: string) => void;
  onLetters: () => void;
}> = ({ state, addRef, onAdd, onPick, onExplain, onOpen, onLetters }) => {
  const title = state.kind === "listed" ? compsTitle(state.total) : state.kind === "empty" ? COMPS_EMPTY_TITLE : state.kind === "nobook" ? COMPS_NO_BOOK_TITLE : " ";
  const h = state.kind === "listed" && state.highlight.kind === "ready" ? state.highlight : null;
  return (
    <WorkspaceNavyHeader page="comps" art="comps-header" loading={state.kind === "loading"}
      title={title}
      forLine={state.kind === "listed" || state.kind === "empty" ? { lead: "for", text: state.book } : null}
      actions={state.kind === "listed" ? <>
        <button ref={addRef} type="button" className="qc1531-b qc1531-b--n" data-cp="add" data-cx-key="add" disabled={state.full} onClick={onAdd}>+ Add a comp</button>
        <button type="button" className="qc1531-b qc1531-b--g" data-cp="pick" data-cx-key="pick" onClick={onPick}>Log comps in a letter</button>
      </> : state.kind === "empty" ? <>
        <button ref={addRef} type="button" className="qc1531-b qc1531-b--n" data-cp="add" data-cx-key="add" onClick={onAdd}>+ Add your first comp</button>
        <button type="button" className="qc1531-b qc1531-b--g" data-cp="explain" data-cx-key="explain" onClick={onExplain}>What makes a good comp?</button>
      </> : state.kind === "loading" ? <>
        <button type="button" className="qc1531-b qc1531-b--n" disabled>+ Add a comp</button>
        <button type="button" className="qc1531-b qc1531-b--g" disabled>Log comps in a letter</button>
      </> : null}
      right={h ? <>
        <WsnhRing pct={h.pct} />
        <WsnhWords lead="Agents ask for more most with" name={<span data-cp="hl-title">{h.title}</span>}
          sub={<><b data-cp="hl-asked">{h.asked}</b> of the {h.queries} queries that named it</>}>
          <span className="wsnh-acts">
            <button type="button" className="qc1531-b qc1531-b--g" data-cp="hl-open" data-cx-key="hl-open" onClick={() => onOpen(h.key)}>Open</button>
            <button type="button" className="wsnh-lnk" data-cp="hl-letters" onClick={onLetters}>Compare your letters</button>
          </span>
        </WsnhWords>
      </> : null}
      bar={state.kind === "nobook" || state.kind === "loading" ? null : {
        title,
        aside: h ? <><b>{h.title}</b><em>gets the most requests</em></> : null,
        button: state.kind === "listed"
          ? { label: "+ Add a comp", onClick: onAdd, disabled: state.full }
          : { label: "+ Add your first comp", onClick: onAdd },
      }} />
  );
};
