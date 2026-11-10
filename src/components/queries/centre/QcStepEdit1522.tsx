/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v152.2 §2.4 (screens 70–72) — ✎ EDIT TURNS THAT ONE BUBBLE INTO A SMALL FORM, IN PLACE. When, the step's
 * materials, the agent's words (their steps only), and "Delete this step", which asks once and says what goes with it
 * and what the card goes back to. The step's type is not editable here: changing it is delete and record again. This
 * replaces v152.1's whole-history "Fix a mistake" form (F4).
 */
import React, { useState } from "react";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import type { StepMaterial } from "../../../lib/qc152Write";
import type { QueryStatus } from "../../../types";
import { CalendarField, MatChips, PopCtx, type MatEnv } from "./QcEdit152";
import { StepGlyph } from "./QcBubble152";

const sod = (ms: number) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };

export interface StepEditProps {
  side: "me" | "them";
  status: QueryStatus | null;
  kind: "nudge" | "holding" | "told" | null;
  title: string;
  ms: number;
  mats: StepMaterial[];
  /** a request carries no version */
  request: boolean;
  words: string;
  first: string;
  env: MatEnv;
  nowMs: number;
  /** the days either side it may not cross (its neighbours) */
  floorMs: number | null;
  ceilMs: number | null;
  /** "Sent the partial depends on it, so it goes too. Sophie's card goes back to Queried, …" */
  deleteText: string;
  busy: boolean;
  /** Log a query v1.1 — the Query sent step only: how it went, and the package it went as (the date, method and package
   *  of a query are edited here and nowhere else) */
  how?: { value: string | null; options: { v: string; label: string }[] } | null;
  pkg?: { value: string | null; options: { id: string; name: string }[] } | null;
  onSave: (v: { dayMs: number; mats: StepMaterial[]; words: string; how?: string | null; pkgId?: string | null }) => Promise<boolean>;
  onDelete: () => Promise<boolean>;
  onCancel: () => void;
}

export const QcStepEdit1522: React.FC<StepEditProps> = (p) => {
  const pop = React.useContext(PopCtx);
  const [d, setD] = useState(p.ms);
  const [mats, setMats] = useState<StepMaterial[]>(p.mats);
  const [words, setWords] = useState(p.words);
  const [how, setHow] = useState<string | null>(p.how?.value ?? null);
  const [pkgId, setPkgId] = useState<string | null>(p.pkg?.value ?? null);
  const [del, setDel] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [conf, setConf] = useState(false);
  const up = () => { if (dirty) setConf(true); else p.onCancel(); };
  useEscapeLayer(true, () => {
    if (pop.open) { pop.setOpen(null); return; }
    if (del) { setDel(false); return; }
    if (conf) { setConf(false); return; }
    up();
  }, ESC_LEVEL.pageModal);
  const blocked = (ms: number) => {
    if (ms > sod(p.nowMs)) return "In the future";
    if (p.floorMs != null && ms < sod(p.floorMs)) return "Before the step above";
    if (p.ceilMs != null && ms > sod(p.ceilMs)) return "After the step below";
    return "";
  };
  return (
    <div className={`qc152-m ${p.side} qc1522-edit`} data-qc1522="step-edit">
      <div className="qc1522-ebx">
        <div className="qc1522-eh"><span className="g">{StepGlyph({ status: p.status, kind: p.kind })}</span><b data-qc1522="edit-title">{p.title}</b><span className="sp" />
          <button type="button" className="qc1522-x" aria-label="Close" data-qc1522="edit-x" onClick={up}>✕</button></div>
        <div className="qc1522-fl tight">
          <label>When</label>
          <div className="qc1522-dp on" data-qc1522="edit-date"><CalendarField id="edit" valueMs={d} nowMs={p.nowMs} blocked={blocked} onChange={(ms) => { setD(sod(ms)); setDirty(true); }} /></div>
          {p.how ? <>
            <label>How</label>
            <div className="qc1522-sseg" role="radiogroup" aria-label="How it went" data-qc1522="edit-how">
              {p.how.options.map((o) => <button key={o.v} type="button" role="radio" aria-checked={how === o.v} className={how === o.v ? "on" : undefined} data-v={o.v}
                onClick={() => { setHow(o.v); setDirty(true); }}>{o.label}</button>)}
            </div>
          </> : null}
          {p.pkg ? <>
            <label>Package</label>
            <div className="qc1522-sseg" role="radiogroup" aria-label="The package it went as" data-qc1522="edit-pkg">
              {[...p.pkg.options, { id: "", name: "No package" }].map((o) => <button key={o.id || "none"} type="button" role="radio" aria-checked={(pkgId ?? "") === o.id} className={(pkgId ?? "") === o.id ? "on" : undefined} data-v={o.id}
                onClick={() => { setPkgId(o.id || null); setDirty(true); }}>{o.name}</button>)}
            </div>
          </> : null}
          {p.kind !== "nudge" && p.kind !== "told" ? <>
            <label>Materials</label>
            <div><MatChips id="edit" mats={mats} onChange={(m) => { setMats(m); setDirty(true); }} env={p.env} stepMs={d} request={p.request} addLabel="+ Add" /></div>
          </> : null}
          {p.side === "them" ? <>
            <label>Their words</label>
            <div><textarea className="qc1522-ta" data-qc1522="edit-words" maxLength={500} value={words} placeholder={`Paste ${p.first}’s reply. Optional.`} onChange={(e) => { setWords(e.target.value); setDirty(true); }} /></div>
          </> : null}
        </div>
        {del ? (
          <div className="qc1522-conf in" data-qc1522="delete-confirm">
            <span>{p.deleteText}</span><span className="sp" />
            <button type="button" className="qc1522-lk" data-qc1522="keep-step" onClick={() => setDel(false)}>Keep it</button>
            <button type="button" className="qc1522-btn nv sm" data-qc1522="delete-ok" disabled={p.busy} onClick={() => void p.onDelete()}>Delete</button>
          </div>
        ) : conf ? (
          <div className="qc1522-conf in" data-qc1522="discard-strip">
            <span>Discard what you’ve entered?</span><span className="sp" />
            <button type="button" className="qc1522-lk" data-qc1522="keep" onClick={() => setConf(false)}>Keep editing</button>
            <button type="button" className="qc1522-btn nv sm" data-qc1522="discard" onClick={p.onCancel}>Discard</button>
          </div>
        ) : (
          <div className="qc1522-ef">
            <button type="button" className="qc1522-lk rust" data-qc1522="delete-step" onClick={() => setDel(true)}>Delete this step</button>
            <span className="sp" />
            <button type="button" className="qc1522-btn gh sm" data-qc1522="edit-cancel" onClick={up}>Cancel</button>
            <button type="button" className="qc1522-btn nv sm" data-qc1522="edit-save" disabled={p.busy || !dirty} onClick={() => void p.onSave({ dayMs: d, mats, words: words.trim(), ...(p.how ? { how } : {}), ...(p.pkg ? { pkgId } : {}) })}>Save</button>
          </div>
        )}
      </div>
    </div>
  );
};
