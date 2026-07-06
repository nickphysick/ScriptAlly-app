/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Composer (v2 + guided pass) — build or edit a submission package. The guided redesign adds a
 * chapter header (parcel illustration + the task in one sentence), an inset rounded name band, a
 * one-line order-of-play guide, headers on EVERY slot row carrying the first/then/optional step
 * words, and a type scale-up (24px name, 18px picker header, 17px titles). The "⧉ Copy existing"
 * control in the band's top-right slides open a right-hand drawer of the existing packages — each a
 * mini card with a "⧉ Copy into composer" that clones its three version-id references, names it
 * "Copy of <name>", closes the drawer and re-runs slot focus. Hidden when zero packages exist.
 *
 * Focus model (unchanged): auto-focus the first unfilled slot on open; clicking an empty row focuses
 * its type; ⇄ SWAP focuses that type; a choice advances focus to the first remaining unfilled slot.
 * Slots hold version-id references; an unfilled slot is UNFILLED_SLOT (""), written explicitly on save.
 * Save is enabled once a name is present and ≥1 slot is filled. Colours are theme tokens — the name
 * band is var(--band) (vivid pink #f4c7c2 in Bold, matching the Hub's "What you sent" header).
 */
import React, { useState, useEffect } from "react";
import { ManuscriptVersion, SubmissionPackage, ComponentType } from "../../types";
import { TypeGlyph } from "./TypeGlyph";
import { TYPE_META, BUILDER_TYPES, SlotSelection, selectionFromPackage } from "./typeMeta";
import { UNFILLED_SLOT, isSlotFilled, versionSnippet, packagesUsingVersion } from "../../lib/packageMetrics";
import { FONT_SERIF, FONT_MONO } from "../../lib/designTokens";

const boxIcon = (
  <svg width={21} height={21} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round"><path d="M12 2l8.66 5v10L12 22l-8.66-5V7z" /><path d="M12 22V12M3.34 7L12 12l8.66-5" /></svg>
);

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
/** dot colour per type, for the drawer content lines. */
const DOT_COLOUR: Record<string, string> = {
  [ComponentType.QUERY_LETTER]: "var(--burg)",
  [ComponentType.SYNOPSIS]: "var(--sage-d)",
  [ComponentType.SAMPLE_PAGES]: "var(--gold)",
};
/** The order-of-play step word per slot (guided ref .stepn): the letter's the only must-have. */
const STEP_WORD: Record<string, string> = {
  [ComponentType.QUERY_LETTER]: "first",
  [ComponentType.SYNOPSIS]: "then",
  [ComponentType.SAMPLE_PAGES]: "optional",
};
/** Chapter-header parcel illustration, ported verbatim from the ref (gold string accent included). */
const parcelIllo = (
  <svg width={76} height={76} viewBox="0 0 96 96" fill="none" stroke="#7c3a2a" strokeWidth={1.7} strokeLinejoin="round" aria-hidden="true"><path d="M48 14l28 16v32L48 78 20 62V30z" /><path d="M48 78V46M20 30l28 16 28-16" /><path d="M34 22l28 16" opacity={0.45} /><path d="M42 8c2-3 10-3 12 0" stroke="#a8842c" strokeLinecap="round" /></svg>
);

const firstUnfilled = (s: SlotSelection): ComponentType => BUILDER_TYPES.find((t) => !isSlotFilled(s[t])) ?? BUILDER_TYPES[0];

export interface ComposerProps {
  versions: ManuscriptVersion[];
  /** All active packages for the manuscript — feeds the picker "IN N packages" badge. */
  packages: SubmissionPackage[];
  /** The package being edited, if any — excluded from the copy-drawer source list. */
  editingId?: string;
  initialName: string;
  initialSelection: SlotSelection;
  onSave: (name: string, selection: SlotSelection) => void;
  onCancel: () => void;
  onCreate: (type: ComponentType) => void;
  /** A material created via this composer's "Add a new …", handed back once the write resolves: it
   *  slots straight into its type's slot with the normal post-choice focus advance. The token marks
   *  each create so successive picks re-fire. Creates from the rail/manager/first-visit never set it. */
  autoPick?: { type: ComponentType; versionId: string; token: number };
}

export const Composer: React.FC<ComposerProps> = ({ versions, packages, editingId, initialName, initialSelection, onSave, onCancel, onCreate, autoPick }) => {
  const [name, setName] = useState(initialName);
  const [sel, setSel] = useState<SlotSelection>(initialSelection);
  const [focus, setFocus] = useState<ComponentType>(() => firstUnfilled(initialSelection));
  const [drawerOpen, setDrawerOpen] = useState(false);
  // The copy drawer offers every OTHER package (you don't copy a package into itself).
  const drawerPackages = packages.filter((p) => p.id !== editingId);

  // Apply a composer-origin create: same semantics as choose(), but keyed by the pick's TYPE rather
  // than live focus — the write resolves after the modal has closed, and a click landing in that gap
  // must not misdirect the material into whichever slot is focused by then. Fires once per token;
  // `sel` is deliberately not a dep (the render that carries a new token carries current sel).
  useEffect(() => {
    if (!autoPick) return;
    const next: SlotSelection = { ...sel, [autoPick.type]: autoPick.versionId };
    setSel(next);
    const remaining = BUILDER_TYPES.find((t) => t !== autoPick.type && !isSlotFilled(next[t]));
    if (remaining) setFocus(remaining);
  }, [autoPick?.token]);

  const choose = (vid: string) => {
    const next: SlotSelection = { ...sel, [focus]: vid };
    setSel(next);
    const remaining = BUILDER_TYPES.find((t) => t !== focus && !isSlotFilled(next[t]));
    if (remaining) setFocus(remaining);
  };
  const clearSlot = (t: ComponentType) => { setSel((s) => ({ ...s, [t]: UNFILLED_SLOT })); setFocus(t); };
  const copyFrom = (pkg: SubmissionPackage) => {
    const s = selectionFromPackage(pkg);
    setName(`Copy of ${pkg.packageName}`);
    setSel(s);
    setFocus(firstUnfilled(s));
    setDrawerOpen(false);
  };

  // A slot only counts as filled if its version still exists (a deleted version renders empty, so
  // enabling Save on a dead id would be inconsistent with the manifest).
  const canSave = name.trim().length > 0 && BUILDER_TYPES.some((t) => isSlotFilled(sel[t]) && versions.some((v) => v.id === sel[t]));
  const fm = TYPE_META[focus];
  const focusVersions = versions.filter((v) => v.componentType === focus);

  return (
    <div className="pkgcomp">
      <style>{`
        .pkgcomp { position:relative; overflow:hidden; border-radius:var(--chromerad); border:var(--bdw) solid var(--bd); background:var(--pane); }
        .t-bold .pkgcomp { background:var(--card); } /* white ground beneath the pink name band (matches the inner cards) */
        /* Chapter header (guided ref .cp-head) — the task in one sentence, over the parcel illustration. */
        .pkgcomp .cp-head { display:flex; align-items:flex-start; gap:26px; padding:28px 36px 22px; }
        .pkgcomp .cp-head .illo { flex-shrink:0; margin-top:4px; }
        .pkgcomp .cp-head h2 { font-family:${FONT_SERIF}; font-size:34px; font-weight:800; color:var(--headT); letter-spacing:-.4px; }
        .pkgcomp .cp-head p { font-size:14.5px; color:#6a594d; line-height:1.6; margin-top:7px; max-width:620px; }
        /* Name band is an inset rounded band beneath the header (ref .cp-name; was full-bleed with a rule). */
        .pkgcomp .c2-band { display:flex; align-items:center; gap:14px; margin:0 36px; padding:18px 22px; border-radius:12px; background:linear-gradient(135deg,var(--band-a),var(--band-b)); }
        .pkgcomp .bic { color:var(--headT); display:flex; flex-shrink:0; }
        .pkgcomp .hname input { border:0; outline:0; background:transparent; font-family:${FONT_SERIF}; font-size:24px; font-weight:700; color:var(--ink); border-bottom:1.5px dashed rgba(36,28,21,.3); padding:2px 2px 5px; width:400px; max-width:48vw; }
        .pkgcomp .hname input::placeholder { color:rgba(36,28,21,.45); font-style:italic; font-weight:500; }
        /* New-capp only (ref .c2-band input): mocha name text + mocha-dashed underline; Bold keeps ink. */
        .t-capp .pkgcomp .hname input { color:var(--headT); border-bottom-color:rgba(93,64,55,.35); }
        .t-capp .pkgcomp .hname input::placeholder { color:rgba(93,64,55,.5); }
        .pkgcomp .copybtn { margin-left:auto; display:inline-flex; align-items:center; gap:8px; font-family:${FONT_MONO}; font-size:9.5px; letter-spacing:.07em; text-transform:uppercase; color:#6a4436; background:rgba(255,254,251,.55); border:1px solid rgba(124,58,42,.18); border-radius:9px; padding:9px 14px; cursor:pointer; }
        .pkgcomp .copybtn:hover { background:#fffefb; color:var(--burg); }
        /* New-capp only (ref .copybtn): mocha text + taupe hairline on the translucent chip. */
        .t-capp .pkgcomp .copybtn { color:var(--btnT); border-color:var(--btnBd); }
        .pkgcomp .c2-body { display:flex; gap:22px; padding:24px 36px; }
        .pkgcomp .mani { flex:0 1 440px; min-width:360px; display:flex; flex-direction:column; justify-content:center; gap:14px; }
        /* One-line order-of-play guide above the slots (ref .cp-guide). */
        .pkgcomp .cp-guide { font-size:12.5px; color:#8a7264; font-style:italic; padding:0 2px 2px; }
        /* Every slot row now carries a HEADER (type + step word) over its body — filled rows included
           (guided ref .crow) — so the first/then/optional order reads at a glance. */
        .pkgcomp .brow { display:flex; flex-direction:column; align-items:stretch; background:#fffefb; border-radius:11px; overflow:hidden; }
        .pkgcomp .brow.filled { border:var(--bdw) solid var(--bd); box-shadow:0 3px 10px rgba(58,28,20,.07); }
        .t-bold .pkgcomp .brow.filled { border:1.5px solid #1d1712; }
        .pkgcomp .brow.empty { border:1.5px dotted #bfae9a; cursor:pointer; }
        .pkgcomp .brow.focus { outline:2px solid var(--sage-d); outline-offset:2px; }
        .pkgcomp .bpad { display:flex; align-items:center; gap:12px; padding:16px 18px; min-height:60px; }
        .pkgcomp .bhd { display:flex; align-items:center; gap:9px; font-family:${FONT_MONO}; font-size:10px; letter-spacing:.1em; text-transform:uppercase; padding:10px 16px; }
        .pkgcomp .bhd .stepn { margin-left:auto; font-family:${FONT_SERIF}; font-style:italic; font-size:14px; color:#b3a291; text-transform:none; letter-spacing:0; }
        .pkgcomp .bhd.hl { background:var(--tl); color:var(--burg); } .pkgcomp .bhd.hs { background:var(--ts); color:var(--sage-d); } .pkgcomp .bhd.hp { background:var(--tp); color:var(--gold); }
        .pkgcomp .bhd .dotac { display:none; }
        /* Quiet Cappuccino (ref .bhd): empty-slot headers go foam + mocha; the type tint survives as a
           7px dot right-aligned in the header. Bold keeps the tinted headers (dot hidden). */
        .t-capp .pkgcomp .bhd.hl, .t-capp .pkgcomp .bhd.hs, .t-capp .pkgcomp .bhd.hp { background:var(--band-a); color:var(--headT); }
        /* The step word owns the right edge now; the quiet-pass tint dot follows it at the header gap. */
        .t-capp .pkgcomp .bhd .dotac { display:inline-block; width:7px; height:7px; border-radius:50%; }
        .t-capp .pkgcomp .bhd.hl .dotac { background:var(--tl); }
        .t-capp .pkgcomp .bhd.hs .dotac { background:var(--ts); }
        .t-capp .pkgcomp .bhd.hp .dotac { background:var(--tp); }
        .pkgcomp .bbd { font-size:13.5px; font-style:italic; color:var(--muted); }
        .pkgcomp .brow.focus .bbd { color:#7a6a5c; }
        .pkgcomp .bti { font-family:${FONT_SERIF}; font-size:17px; font-weight:600; color:var(--ink); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .pkgcomp .bmeta { font-family:${FONT_MONO}; font-size:9px; color:var(--muted); margin-top:3px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .pkgcomp .bmid { min-width:0; flex:1; }
        .pkgcomp .bact { margin-left:auto; display:flex; gap:12px; font-family:${FONT_MONO}; font-size:9px; color:var(--muted); flex-shrink:0; }
        .pkgcomp .bact button { background:none; border:0; padding:0; cursor:pointer; font:inherit; color:inherit; }
        .pkgcomp .bact button:hover { color:var(--burg); }
        .pkgcomp .pick { flex:1; min-width:0; background:#fffefb; border:var(--bdw) solid var(--bd); border-radius:11px; overflow:hidden; display:flex; flex-direction:column; }
        .t-bold .pkgcomp .pick { border:1.5px solid #1d1712; }
        .pkgcomp .pick-h { padding:14px 20px; border-bottom:var(--bdw) solid var(--bd); display:flex; align-items:center; gap:10px; font-family:${FONT_SERIF}; font-size:18px; font-weight:700; color:var(--ink); }
        .pkgcomp .pick-h.hl { background:var(--tl); } .pkgcomp .pick-h.hs { background:var(--ts); } .pkgcomp .pick-h.hp { background:var(--tp); }
        /* Glyph ink moved from inline style to per-type classes (same values — Bold unchanged). */
        .pkgcomp .pick-h.hl .pickg { color:var(--burg); } .pkgcomp .pick-h.hs .pickg { color:var(--sage-d); } .pkgcomp .pick-h.hp .pickg { color:var(--gold); }
        /* Quiet Cappuccino: the picker header is chrome (same family as the slot headers) — foam +
           mocha, no dot (the header names the type in text and the glyph carries it). Bold keeps tints. */
        .t-capp .pkgcomp .pick-h.hl, .t-capp .pkgcomp .pick-h.hs, .t-capp .pkgcomp .pick-h.hp { background:var(--band-a); color:var(--headT); }
        .t-capp .pkgcomp .pick-h .pickg { color:var(--headT); }
        .pkgcomp .pick-h .cnt { margin-left:auto; font-family:${FONT_MONO}; font-size:9px; color:#7a6a5c; }
        .pkgcomp .pick-b { padding:16px; display:grid; grid-template-columns:repeat(auto-fill,minmax(250px,1fr)); gap:13px; align-content:start; flex:1; }
        .pkgcomp .bigcard { background:#fffefb; border:var(--bdw) solid var(--bd); border-radius:10px; padding:16px 18px; cursor:pointer; text-align:left; }
        .t-bold .pkgcomp .bigcard { border:1.5px solid #1d1712; }
        .pkgcomp .bigcard:hover { background:#faeee8; }
        .pkgcomp .bigcard.current { opacity:.5; cursor:default; }
        .pkgcomp .bigcard.current:hover { background:#fffefb; }
        .pkgcomp .bigcard .nm { font-family:${FONT_SERIF}; font-size:17px; font-weight:700; color:var(--ink); }
        .pkgcomp .bigcard .fm { font-family:${FONT_MONO}; font-size:9px; color:var(--muted); margin:4px 0 8px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .pkgcomp .bigcard .sn { font-family:${FONT_SERIF}; font-style:italic; font-size:12.5px; color:#6a5a4c; line-height:1.6; max-height:56px; overflow:hidden; -webkit-mask-image:linear-gradient(#000 45%,transparent 95%); mask-image:linear-gradient(#000 45%,transparent 95%); }
        .pkgcomp .bigcard .use { margin-top:10px; font-family:${FONT_MONO}; font-size:9.5px; color:var(--burg); }
        .pkgcomp .bigcard.current .use { color:var(--sage-d); }
        .pkgcomp .pick-empty { padding:20px 16px; font-size:12.5px; font-style:italic; color:var(--muted); }
        .pkgcomp .pick-f { padding:12px 18px; border-top:1px dashed #e0d3c2; font-size:12px; color:var(--muted); }
        .pkgcomp .pick-f button { color:var(--burg); text-decoration:underline; text-underline-offset:2px; cursor:pointer; font-weight:500; background:none; border:0; padding:0; font-size:12px; }
        .pkgcomp .c2-foot { display:flex; align-items:center; gap:16px; padding:0 36px 30px; }
        .pkgcomp .save { font-family:${FONT_SERIF}; font-size:17px; font-weight:600; color:var(--ink); background:#fffefb; border:var(--bdw) solid var(--bd); border-radius:11px; padding:14px 30px; cursor:pointer; }
        .t-bold .pkgcomp .save { border:1.5px solid #1d1712; }
        .pkgcomp .save:hover:not(:disabled) { background:#faeee8; }
        /* New-capp only (ref .btn): Save joins the white/taupe/mocha treatment; Bold stays white/ink. */
        .t-capp .pkgcomp .save { color:var(--btnT); border-color:var(--btnBd); }
        .t-capp .pkgcomp .save:hover:not(:disabled) { background:var(--btnH); }
        .pkgcomp .save:disabled { opacity:.5; cursor:not-allowed; }
        .pkgcomp .cancel { font-size:13.5px; color:var(--muted); background:none; border:0; cursor:pointer; }
        .pkgcomp .cancel:hover { color:var(--burg); }
        /* copy drawer */
        .pkgcomp .drawer { position:absolute; top:0; right:0; bottom:0; width:320px; background:#fffefb; border-left:var(--bdw) solid var(--bd); box-shadow:-14px 0 34px rgba(58,28,20,.14); display:flex; flex-direction:column; z-index:5; }
        .t-bold .pkgcomp .drawer { border-left:1.5px solid #1d1712; }
        .pkgcomp .drawer-h { padding:15px 18px; background:linear-gradient(135deg,var(--band-a),var(--band-b)); border-bottom:var(--bdw) solid var(--bd); display:flex; align-items:center; gap:10px; }
        .pkgcomp .drawer-h h4 { font-family:${FONT_SERIF}; font-size:17px; font-weight:700; color:var(--headT); }
        .pkgcomp .drawer-h .x { margin-left:auto; cursor:pointer; color:#6a4436; font-size:15px; background:none; border:0; padding:0; line-height:1; }
        .pkgcomp .drawer-b { padding:14px; display:flex; flex-direction:column; gap:11px; overflow-y:auto; }
        .pkgcomp .drawer-note { font-size:10.5px; color:var(--muted); font-style:italic; padding:2px 4px; }
        .pkgcomp .dpk { border:var(--bdw) solid var(--bd); border-radius:10px; overflow:hidden; background:#fffefb; }
        .t-bold .pkgcomp .dpk { border:1.5px solid #1d1712; }
        .pkgcomp .dpk-h { padding:9px 14px; background:linear-gradient(135deg,var(--band-a),var(--band-b)); display:flex; align-items:center; border-bottom:var(--bdw) solid var(--bd); }
        .pkgcomp .dpk-h .nm { font-family:${FONT_SERIF}; font-size:14.5px; font-weight:700; color:var(--headT); }
        .pkgcomp .dpk-b { padding:10px 14px 12px; }
        .pkgcomp .dpk .ln { display:flex; gap:7px; align-items:center; font-size:11.5px; color:#6a5a50; padding:2.5px 0; }
        .pkgcomp .dpk .dd { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
        .pkgcomp .dpk .cta { margin-top:9px; width:100%; font-family:${FONT_MONO}; font-size:9px; letter-spacing:.06em; text-transform:uppercase; background:var(--btnBg); border:1px solid var(--btnBd); color:var(--burg); border-radius:8px; padding:8px; cursor:pointer; }
        .pkgcomp .dpk .cta:hover { background:var(--btnH); }
        @media (max-width: 820px) { .pkgcomp .c2-body { flex-direction:column; } .pkgcomp .drawer { width:100%; } }
      `}</style>

      {/* Chapter header — the task in one sentence, over the parcel illustration (guided ref). */}
      <div className="cp-head">
        <span className="illo">{parcelIllo}</span>
        <div>
          <h2>Build a package</h2>
          <p>Pick one of each from your library — a letter first, a synopsis, pages if you have them — give the bundle a name you&rsquo;ll recognise, and save. You&rsquo;ll attach it to queries from the Queries Hub.</p>
        </div>
      </div>

      <div className="c2-band">
        <span className="bic">{boxIcon}</span>
        <div className="hname"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name this package…" aria-label="Package name" /></div>
        {drawerPackages.length > 0 && <button type="button" className="copybtn" onClick={() => setDrawerOpen(true)}>⧉ Copy existing</button>}
      </div>

      <div className="c2-body">
        <div className="mani">
          <div className="cp-guide">Fill the slots from the picker on the right — the letter&rsquo;s the only must-have.</div>
          {BUILDER_TYPES.map((t) => {
            const m = TYPE_META[t];
            const vid = sel[t];
            const v = isSlotFilled(vid) ? versions.find((x) => x.id === vid) : undefined;
            // Every slot row carries the header (type + step word + quiet-pass tint dot); the body is
            // the filled material or the choose hint.
            const head = (
              <div className={`bhd ${TINT_CLASS[t]}`}><TypeGlyph type={t} size={13} />{m.label}<span className="stepn">{STEP_WORD[t]}</span><span className="dotac" aria-hidden="true" /></div>
            );
            if (v) {
              return (
                <div key={t} className="brow filled">
                  {head}
                  <div className="bpad">
                    <div className="bmid"><div className="bti">{v.versionName}</div>{v.fileName && <div className="bmeta">{v.fileName}</div>}</div>
                    <div className="bact">
                      <button type="button" onClick={() => setFocus(t)}>⇄ SWAP</button>
                      <button type="button" aria-label="Remove" onClick={() => clearSlot(t)}>✕</button>
                    </div>
                  </div>
                </div>
              );
            }
            return (
              <div key={t} className={`brow empty${focus === t ? " focus" : ""}`} role="button" tabIndex={0} onClick={() => setFocus(t)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setFocus(t); } }}>
                {head}
                <div className="bpad"><span className="bbd">Choose from your materials →</span></div>
              </div>
            );
          })}
        </div>

        <aside className="pick">
          <div className={`pick-h ${TINT_CLASS[focus]}`}>
            <span className="pickg" style={{ display: "inline-flex" }}><TypeGlyph type={focus} size={15} /></span>
            Choose a {fm.label.toLowerCase()}
            <span className="cnt">{focusVersions.length} SAVED</span>
          </div>
          <div className="pick-b">
            {focusVersions.length === 0 ? (
              <div className="pick-empty">{EMPTY_TEACH[focus]}</div>
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
          <div className="pick-f">Not listed? <button type="button" onClick={() => onCreate(focus)}>Add a new {fm.label.toLowerCase()}</button></div>
        </aside>
      </div>

      <div className="c2-foot">
        <button type="button" className="save" disabled={!canSave} title={!canSave ? "Name the package and fill at least one slot" : undefined} onClick={() => onSave(name.trim(), sel)}>Save package</button>
        <button type="button" className="cancel" onClick={onCancel}>Cancel</button>
      </div>

      {drawerOpen && drawerPackages.length > 0 && (
        <div className="drawer">
          <div className="drawer-h"><h4>Copy an existing package</h4><button type="button" className="x" aria-label="Close" onClick={() => setDrawerOpen(false)}>✕</button></div>
          <div className="drawer-b">
            <div className="drawer-note">Copies the contents into your new package — the original is untouched.</div>
            {drawerPackages.map((p) => (
              <div key={p.id} className="dpk">
                <div className="dpk-h"><span className="nm">{p.packageName}</span></div>
                <div className="dpk-b">
                  {BUILDER_TYPES.map((t) => {
                    const s = selectionFromPackage(p);
                    const v = isSlotFilled(s[t]) ? versions.find((x) => x.id === s[t]) : undefined;
                    if (!v) return null;
                    return <div key={t} className="ln"><span className="dd" style={{ background: DOT_COLOUR[t] }} />{v.versionName}</div>;
                  })}
                  <button type="button" className="cta" onClick={() => copyFrom(p)}>⧉ Copy into composer</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
