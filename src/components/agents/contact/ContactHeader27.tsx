/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v27 (design-refs/contact-list-v27/contact-list-v27.html) — THE HEADER: the Query Centre's open header
 * layout (`QcHeader1531`: straight on the page's ground, no card, three columns) with the Contact list's own content.
 *
 *   left    the binoculars bird, mirrored so it faces the title (a placeholder: `CL27_HEADER_ART`)
 *   middle  "{n} agents on file", the rule-flanked "you've queried {q}", then + Add an agent and Discover agents
 *   right   List health, exactly as v26 built it (`ContactHealth26`), on the light ground
 *
 * It renders the Query Centre's own classes (`qc1531-*`); the page root carries `.cl27`, which those rules name beside
 * `.qc151` (`:is(.qc151, .cl27)`, the same specificity), so the two headers cannot drift. contactV27.css holds only the
 * Contact list's differences (the 200px art column, the mirrored bird, List health on the light ground).
 *
 * ⚠️ v26's sentence ("… and 5 are waiting on you") is gone: "waiting on you" is the rail's Your move pill and tile.
 * ⚠️ The buttons keep every hook the v26 ones carried (`data-cl26`, `data-cl24`, `data-cl17`), and the add button's ref.
 */
import React from "react";
import type { HeaderFigures } from "../../../lib/contactV26";
import { ContactHealth26 } from "./ContactHealth26";
import "../../queries/centre/qcv1531.css";
import "./contactV27.css";

/** the header's drawing — the existing asset, mirrored in CSS (`.cl27-art img`), for now */
export const CL27_HEADER_ART = "/images/contact/discover-binoculars-bird.webp";

/** "41 agents on file", "1 agent on file" */
export const onFileTitle = (n: number): string => `${n} ${n === 1 ? "agent" : "agents"} on file`;

export const ContactHeader27: React.FC<{
  loading: boolean;
  figures: HeaderFigures | null;
  /** Housekeeping's score and gap count, or null while loading */
  health: { pct: number; gaps: number } | null;
  onAdd: () => void;
  addRef?: React.Ref<HTMLButtonElement>;
  onDiscover?: () => void;
  onOpenHealth: () => void;
  onShowWho: () => void;
}> = ({ loading, figures: f, health, onAdd, addRef, onDiscover, onOpenHealth, onShowWho }) => (
  <header className="cl24-hd qc1531-hd cl27-hd" data-cl26="header" data-cl27="header" data-own-header=""
    data-loading={loading ? "" : undefined} aria-busy={loading || undefined}>
    <div className="qc1531-art cl27-art" data-cl27="art" aria-hidden="true">
      <img src={CL27_HEADER_ART} alt="" width={200} draggable={false} />
    </div>
    <div className="qc1531-main" data-cl27="main">
      <h1 className="qc1531-t" data-page-title="true" data-cl26="title" data-cl27="title">{f ? onFileTitle(f.n) : " "}</h1>
      <p className="qc1531-for" data-cl27="for">
        <i aria-hidden="true" />
        {f ? <span><em>you’ve queried</em> {f.q}</span> : <span aria-hidden="true">&nbsp;</span>}
        <i aria-hidden="true" />
      </p>
      <div className="qc1531-acts">
        <button type="button" ref={addRef} className="qc1531-b qc1531-b--n" data-cl26="add" data-cl24="add" data-cl17="add" data-cl27="add"
          disabled={loading} onClick={onAdd}>+ Add an agent</button>
        {onDiscover ? (
          <button type="button" className="qc1531-b qc1531-b--g" data-cl26="discover" data-cl24="discover" data-cl27="discover" onClick={onDiscover}>Discover agents</button>
        ) : null}
      </div>
    </div>
    <div className="qc1531-rc cl27-rc" data-cl27="health">
      <ContactHealth26 health={health} onOpenHealth={onOpenHealth} onShowWho={onShowWho} ground="light" />
    </div>
  </header>
);
