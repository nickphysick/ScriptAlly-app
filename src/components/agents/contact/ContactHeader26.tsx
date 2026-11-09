/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v26 Part A (design-refs/contact-list-v26/, screens 01–03) — THE HEADER: one navy panel. Left, the title,
 * one sentence and two buttons; right, List health as a ring with the archivist breaking out of it, the percentage pill
 * straddling its foot, and the words, Open and "Show me who" beside it.
 *
 * ⚠️ SUPERSEDES the shared title card (`PageHeaderCard`) and At a glance (v25.1's ledger, v25.6's four cells and their
 *    foot lines). The `h1` keeps `data-page-title` (the shell's folder tab and the page guide read it).
 * ⚠️ THE RIGHT HAND NEVER SETS THE PANEL'S HEIGHT: the ring block is centred in its own grid row and the archivist and
 *    the pill overflow it (CL26 H1 holds the panel to its left column ±2).
 * ⚠️ THE SCORE AND THE COUNT ARE HOUSEKEEPING'S OWN (`listHealth` over `hkModel`), handed in — never recomputed here.
 */
import React from "react";
import type { HeaderFigures } from "../../../lib/contactV26";
import { ContactHealth26 } from "./ContactHealth26";
import "./contactV26.css";

/* List health lives in ContactHealth26 since Contact list v27 (unchanged; the v27 header mounts it too) */
export { ARCHIVIST26 } from "./ContactHealth26";

export const ContactHeader26: React.FC<{
  loading: boolean;
  figures: HeaderFigures | null;
  /** Housekeeping's score and gap count, or null while loading */
  health: { pct: number; gaps: number } | null;
  onAdd: () => void;
  addRef?: React.Ref<HTMLButtonElement>;
  onDiscover?: () => void;
  onOpenHealth: () => void;
  onShowWho: () => void;
}> = ({ loading, figures: f, health: h, onAdd, addRef, onDiscover, onOpenHealth, onShowWho }) => {
  return (
    <header className="cl24-hd cl26-hd" data-cl26="header" data-own-header="" data-loading={loading ? "" : undefined} aria-busy={loading || undefined}>
      <div className="cl26-panel" data-cl26="panel">
        <div className="cl26-left" data-cl26="left">
          <h1 className="cl26-title" data-page-title="true" data-cl26="title">Contact list</h1>
          <p className="cl26-line" data-cl26="line">
            {f ? (
              <>
                <b>{f.n}</b> {f.n === 1 ? "agent" : "agents"} on file. You’ve queried <b>{f.q}</b>
                {f.y > 0 ? <>, and <b>{f.y}</b> {f.y === 1 ? "is" : "are"} waiting on you.</> : "."}
              </>
            ) : <span className="cl26-sk" aria-hidden="true">&nbsp;</span>}
          </p>
          <div className="cl26-btns">
            <button type="button" ref={addRef} className="cl26-b1" data-cl26="add" data-cl24="add" data-cl17="add" disabled={loading} onClick={onAdd}>+ Add an agent</button>
            {onDiscover ? <button type="button" className="cl26-b2" data-cl26="discover" data-cl24="discover" onClick={onDiscover}>Discover agents</button> : null}
          </div>
        </div>
        <ContactHealth26 health={h} onOpenHealth={onOpenHealth} onShowWho={onShowWho} />
      </div>
    </header>
  );
};
