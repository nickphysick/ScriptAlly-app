/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query card v167 §C step 3 (design-refs/query-card-v167/query-card-v167.html, "What does {first} ask for?") — the
 * asks drawer's body, one screen, in this order: Query letter, Synopsis (ticks); A sample ("Pages, chapters or words"),
 * which expands IN PLACE to the app's SampleControl, units and amount only; Something else, which expands in place to
 * four suggestions and one free-text field. The list scrolls inside the drawer.
 *
 * ⚠️ EXPAND IN PLACE: `grid-template-rows` 0fr → 1fr (260ms) with the contents fading; nothing above the tile moves.
 * ⚠️ SAVED THROUGH THE AGENT MATERIALS ENCODER (lib/qcAsks167 → lib/agentMaterials), never a hand-built string; no
 *    fixed amounts anywhere ("First 5 pages" and the rest of the old ASK_POOL are gone).
 * ⚠️ QUERYHAWK NEVER WRITES FOR THE WRITER: the free-text field starts empty; the suggestions are names, not words.
 */
import React, { useEffect, useMemo, useState } from "react";
import { Chip, SampleControl } from "../../queryActions/controls";
import "../../queryActions/queryDrawer.css";
import type { Book } from "../../../lib/queryActions/sample";
import { materialLabel } from "../../../lib/materials";
import { OTHER_SUGGESTIONS, asksAny, asksFromStored, asksToStored, asksUnchanged, sampleOf, type AsksDraft } from "../../../lib/qcAsks167";
import { PickTile, TK, type ProfileIn, type ProfilePatch } from "./QcProfile167";

const Expand: React.FC<{ k: string; on: boolean; label: string; sub?: string; onToggle: () => void; children: React.ReactNode }> = ({ k, on, label, sub, onToggle, children }) => (
  <div className={`qc167-xt${on ? " on" : ""}`} data-qc167="expand" data-x={k}>
    <button type="button" className="xh" aria-expanded={on} data-qc167="expand-head" onClick={onToggle}>
      <span className="t"><b>{label}</b>{sub ? <i>{sub}</i> : null}</span><span className="k" aria-hidden="true">{TK}</span>
    </button>
    <div className="exp" data-qc167="expand-body"><div className="expi" inert={!on || undefined}>{children}</div></div>
  </div>
);

export const QcAsks167: React.FC<{ prof: ProfileIn; book: Book; onPatch: (p: ProfilePatch | null) => void }> = ({ prof, book, onPatch }) => {
  const [d, setD] = useState<AsksDraft>(() => asksFromStored(prof.materialsWanted));
  const set = (p: Partial<AsksDraft>) => setD((x) => ({ ...x, ...p }));
  const out = useMemo(() => asksToStored(d), [d]);
  useEffect(() => {
    onPatch(asksAny(d) && !asksUnchanged(d, prof.materialsWanted) ? { materialsWanted: out } : null);
  }, [out]); // eslint-disable-line react-hooks/exhaustive-deps
  const sample = d.edited ?? sampleOf(d.sampleRow);
  return (
    <div className="qc167-asks-ed" data-qc167="asks-drawer">
      <div className="qc167-mt">
        <PickTile on={d.ql} label={materialLabel("Query letter")} onPick={() => set({ ql: !d.ql })} data={{ "data-ask": "ql" }} />
        <PickTile on={d.syn} label="Synopsis" onPick={() => set({ syn: !d.syn })} data={{ "data-ask": "syn" }} />
      </div>
      <Expand k="sample" on={d.sample} label="A sample" sub="Pages, chapters or words" onToggle={() => set({ sample: !d.sample })}>
        <SampleControl sample={sample} book={book} name="profile" openingOnly onChange={(s) => set({ edited: s })} />
      </Expand>
      <Expand k="other" on={d.other} label="Something else" onToggle={() => set({ other: !d.other })}>
        <div className="qc167-sug" data-qc167="suggestions">
          {OTHER_SUGGESTIONS.map((x) => (
            <Chip key={x} on={d.picks.includes(x)} onClick={() => set({ picks: d.picks.includes(x) ? d.picks.filter((y) => y !== x) : [...d.picks, x] })}>{x}</Chip>
          ))}
        </div>
        <input type="text" className="sp-fld" data-qc167="other-text" value={d.free} aria-label={`Something else ${prof.first} asks for`}
          placeholder="Or type something else, e.g. A writing CV" onChange={(e) => set({ free: e.target.value })} />
      </Expand>
    </div>
  );
};
