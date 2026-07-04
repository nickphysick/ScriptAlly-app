/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Composer — build or edit a submission package (Phase 7). A band header with an editable name, an
 * optional fork strip (copy an existing package's references), a manifest of the three slots, and a
 * focus-driven picker that shows only the focused slot's materials. Ported from the mockup #v-comp.
 *
 * Focus model (exact): on open, auto-focus the first unfilled slot; clicking an empty row focuses its
 * type; ⇄ SWAP on a filled row focuses that type; after a choice fills a slot, focus advances to the
 * first remaining unfilled slot (or stays put if none). Slots hold version-id references — an unfilled
 * slot is UNFILLED_SLOT (""), written explicitly on save (never omitted). Save is enabled once a name
 * is present and at least one slot is filled; it hands the {name, selection} up to the orchestrator,
 * which does the add/update. "Add a new <type>" is a create-modal stub until Phase 9.
 */
import React, { useState } from "react";
import { ManuscriptVersion, SubmissionPackage, ComponentType } from "../../types";
import { TypeGlyph } from "./TypeGlyph";
import { TYPE_META, BUILDER_TYPES, SlotSelection, selectionFromPackage } from "./typeMeta";
import { UNFILLED_SLOT, isSlotFilled, versionSnippet, packagesUsingVersion } from "../../lib/packageMetrics";
import { FONT_SERIF, FONT_MONO } from "../../lib/designTokens";

const boxIcon = (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round"><path d="M12 2l8.66 5v10L12 22l-8.66-5V7z" /><path d="M12 22V12M3.34 7L12 12l8.66-5" /></svg>
);
const penIcon = (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.8 2.8 0 014 4L7.5 20.5 2 22l1.5-5.5z" /></svg>
);

/** Per-type teaching line shown when the focused type has no saved materials. */
const EMPTY_TEACH: Record<string, string> = {
  [ComponentType.QUERY_LETTER]: "None saved yet — add the letter you actually send to agents.",
  [ComponentType.SYNOPSIS]: "None saved yet — a one-page synopsis covers most agents.",
  [ComponentType.SAMPLE_PAGES]: "None saved yet — most UK agents want the first three chapters.",
};
/** tint-band class suffix per type (hl / hs / hp). */
const TINT_CLASS: Record<string, string> = {
  [ComponentType.QUERY_LETTER]: "hl",
  [ComponentType.SYNOPSIS]: "hs",
  [ComponentType.SAMPLE_PAGES]: "hp",
};

const firstUnfilled = (s: SlotSelection): ComponentType => BUILDER_TYPES.find((t) => !isSlotFilled(s[t])) ?? BUILDER_TYPES[0];

export interface ComposerProps {
  versions: ManuscriptVersion[];
  /** Existing packages for the fork strip (excluding the one being edited). */
  packages: SubmissionPackage[];
  initialName: string;
  initialSelection: SlotSelection;
  onSave: (name: string, selection: SlotSelection) => void;
  onCancel: () => void;
  /** Add a new material of a type (Phase 9); on save it should fill the focused slot. */
  onCreate: (type: ComponentType) => void;
}

export const Composer: React.FC<ComposerProps> = ({ versions, packages, initialName, initialSelection, onSave, onCancel, onCreate }) => {
  const [name, setName] = useState(initialName);
  const [sel, setSel] = useState<SlotSelection>(initialSelection);
  const [focus, setFocus] = useState<ComponentType>(() => firstUnfilled(initialSelection));

  const choose = (vid: string) => {
    const next: SlotSelection = { ...sel, [focus]: vid };
    setSel(next);
    const remaining = BUILDER_TYPES.find((t) => t !== focus && !isSlotFilled(next[t]));
    if (remaining) setFocus(remaining);
  };
  const clearSlot = (t: ComponentType) => { setSel((s) => ({ ...s, [t]: UNFILLED_SLOT })); setFocus(t); };
  const loadFork = (pkg: SubmissionPackage) => { const s = selectionFromPackage(pkg); setName(pkg.packageName); setSel(s); setFocus(firstUnfilled(s)); };

  const canSave = name.trim().length > 0 && BUILDER_TYPES.some((t) => isSlotFilled(sel[t]));
  const fm = TYPE_META[focus];
  const focusVersions = versions.filter((v) => v.componentType === focus);

  return (
    <div className="pkgcomp">
      <style>{`
        .pkgcomp { margin:-16px -16px -20px; }
        .t-bold .pkgcomp { background:#f2e8e6; border-radius:var(--chromerad); }
        .pkgcomp .comp-band { display:flex; align-items:center; gap:12px; padding:13px 18px; background:var(--band); border-bottom:var(--bdw) solid var(--bd); }
        .pkgcomp .bic { color:var(--ink); display:flex; flex-shrink:0; }
        .pkgcomp .hname { display:flex; align-items:center; gap:8px; min-width:0; }
        .pkgcomp .hname input { border:0; outline:0; background:transparent; font-family:${FONT_SERIF}; font-size:19px; font-weight:700; color:var(--ink); border-bottom:1.5px dashed rgba(36,28,21,.3); padding:2px 2px 3px; width:300px; max-width:52vw; }
        .pkgcomp .hname input::placeholder { color:rgba(36,28,21,.45); font-style:italic; font-weight:500; }
        .pkgcomp .pen { color:rgba(36,28,21,.5); display:flex; }
        .pkgcomp .fork { display:flex; align-items:center; gap:10px; padding:9px 18px; border-bottom:var(--bdw) solid var(--bd); background:rgba(124,58,42,.03); font-size:12px; color:#7a6a5e; flex-wrap:wrap; }
        .t-bold .pkgcomp .fork { border-bottom:1px solid rgba(29,23,18,.28); }
        .pkgcomp .fl { font-family:${FONT_MONO}; font-size:8.5px; letter-spacing:.1em; text-transform:uppercase; color:#a4937f; }
        .pkgcomp .pkmini { display:inline-flex; align-items:center; gap:7px; background:#fffefb; border:var(--bdw) solid var(--bd); border-radius:7px; padding:5px 11px; font-size:11px; font-weight:600; cursor:pointer; color:var(--ink); }
        .pkgcomp .pkmini:hover { background:#faeee8; }
        .pkgcomp .pkmini .dup { font-size:13px; color:var(--burg); line-height:1; }
        .pkgcomp .comp-body { padding:18px; }
        .pkgcomp .bwrap { display:flex; gap:16px; align-items:stretch; }
        .pkgcomp .bcanvas { flex:0 1 380px; min-width:300px; display:flex; flex-direction:column; justify-content:center; gap:12px; }
        .pkgcomp .brow { display:flex; align-items:center; gap:13px; background:#fffefb; border-radius:9px; padding:17px 16px; min-height:64px; }
        .pkgcomp .brow.filled { border:var(--bdw) solid var(--bd); box-shadow:0 3px 10px rgba(58,28,20,.07); }
        .pkgcomp .brow.empty { border:1.5px dotted #bfae9a; cursor:pointer; }
        .pkgcomp .brow.col { flex-direction:column; align-items:stretch; padding:0; gap:0; overflow:hidden; }
        .pkgcomp .brow.focus { outline:2px solid var(--sage-d); outline-offset:2px; }
        .pkgcomp .bhd { display:flex; align-items:center; gap:8px; font-family:${FONT_MONO}; font-size:8.5px; letter-spacing:.1em; text-transform:uppercase; padding:7px 13px; }
        .pkgcomp .bhd.hl { background:var(--tl); color:var(--burg); }
        .pkgcomp .bhd.hs { background:var(--ts); color:var(--sage-d); }
        .pkgcomp .bhd.hp { background:var(--tp); color:var(--gold); }
        .pkgcomp .bbd { padding:14px 16px; font-size:11.5px; font-style:italic; color:var(--muted); }
        .pkgcomp .brow.focus .bbd { color:#7a6a5c; }
        .pkgcomp .pg-tag { display:inline-flex; align-items:center; justify-content:center; width:30px; height:30px; border-radius:8px; flex-shrink:0; }
        .pkgcomp .pg-tag.tl { background:var(--tl); color:var(--burg); }
        .pkgcomp .pg-tag.ts { background:var(--ts); color:var(--sage-d); }
        .pkgcomp .pg-tag.tp { background:var(--tp); color:var(--gold); }
        .pkgcomp .bti { font-family:${FONT_SERIF}; font-size:14.5px; font-weight:600; color:var(--ink); min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .pkgcomp .bmeta { font-family:${FONT_MONO}; font-size:8px; color:var(--muted); margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .pkgcomp .bmid { min-width:0; flex:1; }
        .pkgcomp .bact { margin-left:auto; display:flex; gap:10px; align-items:center; flex-shrink:0; }
        .pkgcomp .rm2 { font-family:${FONT_MONO}; font-size:8px; letter-spacing:.05em; color:var(--muted); cursor:pointer; background:none; border:0; padding:0; }
        .pkgcomp .rm2:hover { color:var(--burg); }
        .pkgcomp .pickB { flex:1; min-width:0; background:#fffefb; border:var(--bdw) solid var(--bd); border-radius:10px; overflow:hidden; display:flex; flex-direction:column; }
        .pkgcomp .pickB-h { padding:11px 15px; border-bottom:var(--bdw) solid var(--bd); display:flex; align-items:center; gap:9px; font-family:${FONT_SERIF}; font-size:14.5px; font-weight:600; color:var(--ink); }
        .pkgcomp .pickB-h.hl { background:var(--tl); } .pkgcomp .pickB-h.hs { background:var(--ts); } .pkgcomp .pickB-h.hp { background:var(--tp); }
        .pkgcomp .pickB-h .cnt { margin-left:auto; font-family:${FONT_MONO}; font-size:8px; letter-spacing:.06em; color:#7a6a5c; }
        .pkgcomp .pickB-b { padding:13px; display:grid; grid-template-columns:repeat(auto-fill,minmax(230px,1fr)); gap:11px; align-content:start; flex:1; }
        .pkgcomp .bigcard { background:#fffefb; border:var(--bdw) solid var(--bd); border-radius:8px; padding:12px 14px; cursor:pointer; text-align:left; }
        .pkgcomp .bigcard:hover { background:#faeee8; }
        .pkgcomp .bigcard.current { opacity:.5; cursor:default; }
        .pkgcomp .bigcard.current:hover { background:#fffefb; }
        .pkgcomp .bigcard .nm { font-family:${FONT_SERIF}; font-size:14px; font-weight:600; color:var(--ink); }
        .pkgcomp .bigcard .fm { font-family:${FONT_MONO}; font-size:8px; color:var(--muted); margin:3px 0 7px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .pkgcomp .bigcard .sn { font-family:${FONT_SERIF}; font-style:italic; font-size:11px; color:#6a5a4c; line-height:1.6; max-height:52px; overflow:hidden; -webkit-mask-image:linear-gradient(#000 45%,transparent 95%); mask-image:linear-gradient(#000 45%,transparent 95%); }
        .pkgcomp .bigcard .use { margin-top:9px; font-family:${FONT_MONO}; font-size:8.5px; letter-spacing:.04em; color:var(--burg); }
        .pkgcomp .bigcard.current .use { color:var(--sage-d); }
        .pkgcomp .pickB-empty { padding:20px 16px; font-size:12px; font-style:italic; color:var(--muted); }
        .pkgcomp .pickB-f { padding:10px 15px; border-top:1px dashed #e0d3c2; font-size:10.5px; color:var(--muted); }
        .pkgcomp .pickB-f button { color:var(--burg); text-decoration:underline; text-underline-offset:2px; cursor:pointer; font-weight:500; background:none; border:0; padding:0; font-size:10.5px; }
        .pkgcomp .comp-actions { display:flex; align-items:center; gap:14px; padding:0 18px 18px; }
        .pkgcomp .save-pkg2 { font-family:${FONT_SERIF}; font-size:15px; font-weight:600; color:var(--ink); background:#fffefb; border:var(--bdw) solid var(--bd); border-radius:10px; padding:11px 24px; cursor:pointer; }
        .pkgcomp .save-pkg2:hover:not(:disabled) { background:#faeee8; }
        .pkgcomp .save-pkg2:disabled { opacity:.5; cursor:not-allowed; }
        .pkgcomp .cancel2 { font-size:12.5px; color:var(--muted); background:none; border:0; cursor:pointer; padding:10px 6px; }
        .pkgcomp .cancel2:hover { color:var(--burg); }
        @media (max-width: 760px) { .pkgcomp .bwrap { flex-direction:column; } }
      `}</style>

      <div className="comp-band">
        <span className="bic">{boxIcon}</span>
        <div className="hname">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name this package…" aria-label="Package name" />
          <span className="pen">{penIcon}</span>
        </div>
      </div>

      {packages.length > 0 && (
        <div className="fork">
          <span className="fl">Copy an existing package</span>
          {packages.map((p) => (
            <button key={p.id} type="button" className="pkmini" onClick={() => loadFork(p)} title={`Copy ${p.packageName}`}>{p.packageName} <span className="dup" aria-hidden="true">⧉</span></button>
          ))}
        </div>
      )}

      <div className="comp-body">
        <div className="bwrap">
          <div className="bcanvas">
            {BUILDER_TYPES.map((t) => {
              const m = TYPE_META[t];
              const vid = sel[t];
              const v = isSlotFilled(vid) ? versions.find((x) => x.id === vid) : undefined;
              if (v) {
                return (
                  <div key={t} className="brow filled">
                    <span className={`pg-tag t${TINT_CLASS[t].charAt(1)}`}><TypeGlyph type={t} size={13} /></span>
                    <div className="bmid"><div className="bti">{v.versionName}</div>{v.fileName && <div className="bmeta">{v.fileName}</div>}</div>
                    <div className="bact">
                      <button type="button" className="rm2" onClick={() => setFocus(t)}>⇄ SWAP</button>
                      <button type="button" className="rm2" aria-label="Remove" onClick={() => clearSlot(t)}>✕</button>
                    </div>
                  </div>
                );
              }
              return (
                <div key={t} className={`brow empty col${focus === t ? " focus" : ""}`} role="button" tabIndex={0} onClick={() => setFocus(t)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setFocus(t); } }}>
                  <div className={`bhd ${TINT_CLASS[t]}`}><TypeGlyph type={t} size={12} />{m.label}</div>
                  <div className="bbd">Choose from your materials →</div>
                </div>
              );
            })}
          </div>

          <aside className="pickB">
            <div className={`pickB-h ${TINT_CLASS[focus]}`}>
              <span style={{ color: fm.ink, display: "inline-flex" }}><TypeGlyph type={focus} size={14} /></span>
              Choose a {fm.label.toLowerCase()}
              <span className="cnt">{focusVersions.length} SAVED</span>
            </div>
            <div className="pickB-b">
              {focusVersions.length === 0 ? (
                <div className="pickB-empty">{EMPTY_TEACH[focus]}</div>
              ) : (
                focusVersions.map((v) => {
                  const current = v.id === sel[focus];
                  const snip = versionSnippet(v);
                  const usedIn = packagesUsingVersion(v.id, packages).length;
                  return (
                    <button key={v.id} type="button" className={`bigcard${current ? " current" : ""}`} onClick={current ? undefined : () => choose(v.id)} aria-disabled={current}>
                      <div className="nm">{v.versionName}</div>
                      <div className="fm">{v.fileName || "No file"}{usedIn > 0 ? ` · IN ${usedIn} PACKAGE${usedIn === 1 ? "" : "S"}` : ""}</div>
                      {snip && <div className="sn">{snip}</div>}
                      <div className="use">{current ? "✓ IN THIS PACKAGE" : isSlotFilled(sel[focus]) ? "⇄ SWAP INTO PACKAGE" : "＋ USE IN THIS PACKAGE"}</div>
                    </button>
                  );
                })
              )}
            </div>
            <div className="pickB-f">Not listed? <button type="button" onClick={() => onCreate(focus)}>Add a new {fm.label.toLowerCase()}</button></div>
          </aside>
        </div>
      </div>

      <div className="comp-actions">
        <button type="button" className="save-pkg2" disabled={!canSave} title={!canSave ? "Name the package and fill at least one slot" : undefined} onClick={() => onSave(name.trim(), sel)}>Save package</button>
        <button type="button" className="cancel2" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
};
