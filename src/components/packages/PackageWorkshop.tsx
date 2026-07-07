/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PackageWorkshop — the single-page rebuild of the Submission Package Builder (ref
 * design-refs/scriptally-workshop-themed.html). Two on-brand framed windows on the desk beneath the
 * qhbar: the WORKSHOP (materials palette + active-package bench + other-packages grid) and PACKAGE
 * ANALYTICS (scope-toggled this-package / all-packages). Building is drag-and-drop with a first-class
 * click fallback; everything happens on one surface with a dirty in-memory draft + save/discard.
 *
 * Same data model + engine as the old builder — a new UI over `versions` + `packages` +
 * packageMetrics. The host provides the qhbar/desk chrome; this component renders the two windows.
 *
 * PHASE 1 (this commit): the two-window shell + band-fill headers (text/icons on --hdrOn) + white
 * bodies + the region frames (palette | building split, analytics scope + body) + the full theme
 * token scaffold. The palette chips, the interactive bench, the other-packages grid and the live
 * analytics land in Phases 2–5; their zones show skeletal placeholders here.
 *
 * Theme: consumes existing tokens; --hdrOn is added per theme in index.css. Workshop-local --wk-*
 * tokens carry the per-theme accents — burgundy (build) + sage (win) in Cappuccino/Bold collapse to
 * Editorial's single graphite accent (--acc), which is honest to its system (the mock's Editorial
 * hexes + charcoal masthead are NOT trusted — Editorial rides its real .t-edn values). No color-mix:
 * the two burgundy/graphite alpha tints are pre-computed rgba per the standing rule.
 */
import React, { useState, useEffect } from "react";
import { ManuscriptVersion, SubmissionPackage, Query, ComponentType } from "../../types";
import { TypeGlyph } from "./TypeGlyph";
import { TYPE_META, BUILDER_TYPES, SLOT_FIELD, SlotSelection, emptySelection, selectionFromPackage } from "./typeMeta";
import { isSlotFilled, UNFILLED_SLOT, reachedFull } from "../../lib/packageMetrics";
import { FONT_SERIF, FONT_MONO } from "../../lib/designTokens";

/** Persist payload for a package — all three slot ids ("" for empty; isValidPackage needs them present). */
export interface PackageSaveFields {
  packageName: string;
  queryLetterVersionId: string;
  synopsisVersionId: string;
  samplePagesVersionId: string;
}
/** An in-memory bench draft (not persisted until Save). Keyed by package id (real) or a temp new id. */
interface Draft {
  name: string;
  sel: SlotSelection;
  isNew: boolean;
  dirty: boolean;
}
const slotNoun = (t: ComponentType) => TYPE_META[t].label.toLowerCase();
const toFields = (name: string, sel: SlotSelection): PackageSaveFields => ({
  packageName: name.trim(),
  queryLetterVersionId: sel[ComponentType.QUERY_LETTER] || UNFILLED_SLOT,
  synopsisVersionId: sel[ComponentType.SYNOPSIS] || UNFILLED_SLOT,
  samplePagesVersionId: sel[ComponentType.SAMPLE_PAGES] || UNFILLED_SLOT,
});
const sameSel = (a: SlotSelection, b: SlotSelection) => BUILDER_TYPES.every((t) => a[t] === b[t]);

/** Workshop-window header icon (tool) + analytics-window header icon (bar chart), from the ref. */
const toolIcon = (
  <svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14.7 6.3a4 4 0 00-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 005.4-5.4l-2.5 2.5-2.1-.4-.4-2.1z" /></svg>
);
const chartIcon = (
  <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M4 20h16" /></svg>
);
const pencilIcon = (
  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20h4L18 10l-4-4L4 16z" /><path d="M13 7l4 4" /></svg>
);

export interface PackageWorkshopProps {
  versions: ManuscriptVersion[];
  packages: SubmissionPackage[];
  queries: Query[];
  /** Inline create from the palette — host calls addVersion (fileAttached:false, contentType:'text'). */
  onCreateVersion: (type: ComponentType, name: string) => void;
  /** Full text edit — host opens MaterialModal for the version. */
  onEditVersion: (version: ManuscriptVersion) => void;
  /** Persist the bench: baseId set → updatePackage, null → addPackage. Returns the (new) package id. */
  onSavePackage: (baseId: string | null, fields: PackageSaveFields) => Promise<string | undefined> | string | undefined;
}

export const PackageWorkshop: React.FC<PackageWorkshopProps> = ({ versions, packages, queries, onCreateVersion, onEditVersion, onSavePackage }) => {
  // Inline-create state for the palette (P2): which group is showing its name input, and its value.
  const [newInType, setNewInType] = useState<ComponentType | null>(null);
  const [newName, setNewName] = useState("");

  // Bench state (P3). ONE package is active + editable; edits live in `drafts` (an overlay on the saved
  // packages) so an unsaved draft survives promotion + theme switch. A draft is keyed by package id
  // (real) or a temp new id; presence + `dirty` mark it. dragMat/overSlot/flash drive DnD affordances.
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [activeId, setActiveId] = useState<string | null>(() => packages[0]?.id ?? null);
  const [dragMat, setDragMat] = useState<string | null>(null);
  const [overSlot, setOverSlot] = useState<ComponentType | null>(null);
  const [flash, setFlash] = useState<ComponentType | null>(null);

  const versionById = (id: string) => versions.find((v) => v.id === id);
  // The saved (prop) baseline for a package as a draft-shaped value.
  const baseOf = (id: string): Draft | null => {
    const p = packages.find((x) => x.id === id);
    return p ? { name: p.packageName, sel: selectionFromPackage(p), isNew: false, dirty: false } : null;
  };
  const effOf = (id: string | null): Draft | null => (id ? drafts[id] ?? baseOf(id) : null);
  const active = effOf(activeId);

  // Keep a valid active package: if the current one vanished (or none yet), fall back to the first saved.
  useEffect(() => {
    if (activeId && (drafts[activeId] || packages.some((p) => p.id === activeId))) return;
    setActiveId(packages[0]?.id ?? null);
  }, [packages, activeId, drafts]);

  // Prune clean drafts once the props reflect them (post-save reconcile) — avoids stale overlays.
  useEffect(() => {
    setDrafts((d) => {
      let changed = false;
      const next = { ...d };
      for (const [id, e] of Object.entries(d)) {
        if (e.dirty || e.isNew) continue;
        const base = baseOf(id);
        if (base && base.name === e.name && sameSel(base.sel, e.sel)) { delete next[id]; changed = true; }
      }
      return changed ? next : d;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packages]);

  const commitNew = (type: ComponentType) => {
    const name = newName.trim();
    if (name) onCreateVersion(type, name);
    setNewInType(null);
    setNewName("");
  };

  // Write an edit to the active package's draft (creating the draft from its baseline on first touch).
  const editActive = (mut: (d: Draft) => Draft) => {
    if (!activeId) return;
    setDrafts((prev) => {
      const cur = prev[activeId] ?? baseOf(activeId) ?? { name: "", sel: emptySelection(), isNew: true, dirty: false };
      return { ...prev, [activeId]: { ...mut(cur), dirty: true } };
    });
  };
  const fillSlot = (type: ComponentType, matId: string) => {
    editActive((d) => ({ ...d, sel: { ...d.sel, [type]: matId } }));
    setFlash(type);
  };
  const clearSlot = (type: ComponentType) => editActive((d) => ({ ...d, sel: { ...d.sel, [type]: UNFILLED_SLOT } }));
  const renameActive = (name: string) => editActive((d) => ({ ...d, name }));

  const isDirty = !!(activeId && drafts[activeId]?.dirty);
  // Save needs a name + a letter whose version still exists (mirrors the composer rule).
  const canSave = !!active && active.name.trim().length > 0
    && isSlotFilled(active.sel[ComponentType.QUERY_LETTER])
    && !!versionById(active.sel[ComponentType.QUERY_LETTER]);

  const save = async () => {
    if (!active || !canSave || !activeId) return;
    const baseId = drafts[activeId]?.isNew ? null : activeId;
    const newId = await onSavePackage(baseId, toFields(active.name, active.sel));
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[activeId];
      return next;
    });
    if (baseId === null && typeof newId === "string") setActiveId(newId);
  };
  const discard = () => {
    if (!activeId) return;
    const wasNew = drafts[activeId]?.isNew;
    setDrafts((prev) => { const n = { ...prev }; delete n[activeId]; return n; });
    if (wasNew) setActiveId(packages[0]?.id ?? null);
  };
  const duplicate = (pkg: Draft) => {
    const id = `wk-new-${Date.now()}`;
    setDrafts((prev) => ({ ...prev, [id]: { name: `Copy of ${pkg.name}`, sel: { ...pkg.sel }, isNew: true, dirty: true } }));
    setActiveId(id);
  };
  const newPackage = () => {
    const id = `wk-new-${Date.now()}`;
    setDrafts((prev) => ({ ...prev, [id]: { name: "", sel: emptySelection(), isNew: true, dirty: true } }));
    setActiveId(id);
  };

  /** Per-package sent / full for the bench + grid result line (derived, never stored). */
  const pkgCounts = (id: string) => {
    const mine = queries.filter((q) => q.packageId === id);
    return { sent: mine.length, full: mine.filter(reachedFull).length };
  };

  // Every package except the active one → the read-only grid (saved packages + any unsaved new drafts).
  const newDraftIds = Object.keys(drafts).filter((id) => drafts[id].isNew);
  const otherIds = [...packages.map((p) => p.id), ...newDraftIds].filter((id) => id !== activeId);

  return (
    <div className="pkgwk">
      <style>{`
        /* ── Workshop-local tokens. Cappuccino sampled from the ref; Bold sampled; Editorial rides its
           REAL .t-edn tokens (graphite single accent — no burgundy/sage/gold in its system). ── */
        .pkgwk { --wk-burg:var(--burg); --wk-acc:var(--sage-d); --wk-gold:var(--gold);
          --wk-bar:#eee2d2; --wk-dash:#c9bca8; --wk-dashd:#e7dbc9;
          --wk-pulse:rgba(124,58,42,.16); --wk-scopebg:rgba(124,58,42,.07); --wk-flash:#e9f0e9; }
        .t-bold .pkgwk { --wk-bar:#e7d3cc; --wk-dash:#caa99f; --wk-dashd:#e3cfc9; }
        .t-edn .pkgwk { --wk-burg:var(--acc); --wk-acc:var(--acc); --wk-gold:var(--muted);
          --wk-bar:var(--abtn-bg); --wk-dash:var(--bd); --wk-dashd:var(--bd);
          --wk-pulse:rgba(68,72,77,.16); --wk-scopebg:rgba(68,72,77,.07); --wk-flash:#eef0f2; }

        /* ── Two-window shell ── */
        .pkgwk .wk-windows { display:flex; gap:24px; align-items:stretch; min-height:640px; }
        .pkgwk .wk-win { background:var(--card); border:var(--bdw) solid var(--bd); border-radius:16px; overflow:hidden; display:flex; flex-direction:column; box-shadow:0 8px 26px rgba(40,28,18,.10); }
        .pkgwk .wk-workshop { flex:1; min-width:0; }
        .pkgwk .wk-analytics { width:376px; flex-shrink:0; }
        .pkgwk .wk-h { display:flex; align-items:center; gap:13px; padding:18px 28px; background:linear-gradient(135deg,var(--band-a),var(--band-b)); border-bottom:var(--bdw) solid var(--bd); }
        .pkgwk .wk-ri { color:var(--hdrOn); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .pkgwk .wk-h h3 { font-family:${FONT_SERIF}; font-size:19px; font-weight:800; color:var(--hdrOn); }
        .pkgwk .wk-tag { margin-left:auto; font-family:${FONT_MONO}; font-size:8.5px; letter-spacing:.1em; text-transform:uppercase; color:var(--hdrOn); opacity:.55; }

        /* Workshop body: palette | building split */
        .pkgwk .wk-body { display:flex; flex:1; min-height:0; }
        .pkgwk .wk-palette { background:var(--card); border-right:var(--bdw) solid var(--bd); padding:22px; width:258px; flex-shrink:0; overflow-y:auto; }
        .pkgwk .wk-building { flex:1; min-width:0; padding:28px 32px; overflow-y:auto; background:var(--card); }
        .pkgwk .pal-lab { font-family:${FONT_MONO}; font-size:8px; letter-spacing:.12em; text-transform:uppercase; color:var(--muted); margin-bottom:15px; }
        .pkgwk .palgroup { margin-bottom:22px; }
        .pkgwk .palgroup-h { display:flex; align-items:center; gap:8px; font-family:${FONT_MONO}; font-size:8.5px; letter-spacing:.06em; text-transform:uppercase; color:var(--hdr); margin-bottom:11px; }
        .pkgwk .palgroup-h .g { color:var(--wk-burg); display:inline-flex; }
        /* Palette chips (draggable + clickable) + inline create (ref .chip / .newchip / .newin) */
        .pkgwk .chip { display:flex; align-items:center; gap:11px; background:var(--card); border:var(--bdw) solid var(--bd); border-radius:10px; padding:12px 13px; margin-bottom:9px; cursor:grab; transition:box-shadow .12s,transform .12s; box-shadow:0 1px 2px rgba(40,28,18,.04); text-align:left; width:100%; font:inherit; color:inherit; }
        .pkgwk .chip:hover { box-shadow:0 5px 14px rgba(58,28,20,.12); transform:translateY(-1px); }
        .pkgwk .chip.dragging { opacity:.4; }
        .pkgwk .chip .cg { width:28px; height:28px; border-radius:8px; background:var(--selBg); color:var(--wk-burg); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .pkgwk .chip .cmid { min-width:0; flex:1; }
        .pkgwk .chip .cn { font-family:${FONT_SERIF}; font-size:14.5px; font-weight:600; line-height:1.12; color:var(--ink); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .pkgwk .chip .cf { font-family:${FONT_MONO}; font-size:7.5px; color:var(--muted); margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .pkgwk .chip .cedit { color:var(--wk-dash); cursor:pointer; background:none; border:0; padding:2px; display:flex; opacity:0; transition:opacity .12s,color .12s; flex-shrink:0; }
        .pkgwk .chip:hover .cedit, .pkgwk .chip:focus-within .cedit { opacity:1; }
        .pkgwk .chip .cedit:hover { color:var(--wk-burg); }
        .pkgwk .chip .grip { color:var(--wk-dash); font-size:13px; letter-spacing:-2px; flex-shrink:0; }
        .pkgwk .newchip { display:flex; align-items:center; gap:8px; border:1.5px dashed var(--wk-dash); border-radius:10px; padding:11px 13px; color:var(--muted); cursor:pointer; font-size:12px; font-style:italic; background:none; width:100%; text-align:left; }
        .pkgwk .newchip:hover { border-color:var(--wk-burg); color:var(--wk-burg); }
        .pkgwk .newin { width:100%; border:1.5px solid var(--wk-burg); border-radius:10px; padding:10px 12px; font-family:${FONT_SERIF}; font-size:13.5px; outline:none; background:var(--card); color:var(--ink); }
        .pkgwk .newin::placeholder { color:var(--muted); font-style:italic; }
        .pkgwk .bench-lab { font-family:${FONT_MONO}; font-size:9.5px; letter-spacing:.1em; text-transform:uppercase; color:var(--wk-burg); display:flex; align-items:center; gap:9px; margin-bottom:16px; }
        .pkgwk .bench-lab .dotp { width:9px; height:9px; border-radius:50%; background:var(--wk-burg); box-shadow:0 0 0 4px var(--wk-pulse); flex-shrink:0; }
        /* Active bench (ref .pkg) — one editable package: name header, three slots, dirty foot. */
        .pkgwk .pkg { background:var(--card); border:var(--bdw) solid var(--bd); border-radius:14px; overflow:hidden; max-width:760px; box-shadow:0 12px 30px rgba(58,28,20,.11); }
        .pkgwk .pkg-h { display:flex; align-items:center; gap:11px; padding:16px 22px; background:linear-gradient(135deg,var(--band-a),var(--band-b)); border-bottom:var(--bdw) solid var(--bd); }
        .pkgwk .pkg-h .name { flex:1; min-width:0; font-family:${FONT_SERIF}; font-size:20px; font-weight:700; color:var(--hdrOn); background:transparent; border:0; border-bottom:1.5px dashed transparent; outline:none; padding-bottom:2px; }
        .pkgwk .pkg-h .name:focus { border-bottom-color:var(--wk-dash); }
        .pkgwk .pkg-h .name::placeholder { color:var(--muted); font-style:italic; }
        .pkgwk .pkg-h .pen { color:var(--hdrOn); opacity:.5; display:flex; flex-shrink:0; }
        .pkgwk .pkg-slots { padding:18px 22px; display:flex; flex-direction:column; gap:12px; }
        .pkgwk .slot { border:1.5px dashed var(--wk-dash); border-radius:11px; padding:16px 17px; display:flex; align-items:center; gap:13px; min-height:70px; transition:background .12s,border-color .12s; }
        .pkgwk .slot.over { border-color:var(--wk-burg); background:var(--selBg); border-style:solid; }
        .pkgwk .slot.filled { border-style:solid; border-color:var(--bd); background:var(--card); }
        .pkgwk .slot.filled.flash { animation:wkFlash .5s ease; }
        @keyframes wkFlash { 0% { background:var(--wk-flash); } 100% { background:var(--card); } }
        .pkgwk .slot .sg { width:34px; height:34px; border-radius:9px; background:var(--selBg); color:var(--muted); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .pkgwk .slot.filled .sg { color:var(--wk-burg); }
        .pkgwk .slot .stxt { font-size:13.5px; color:var(--muted); font-style:italic; }
        .pkgwk .slot .sfill { min-width:0; flex:1; }
        .pkgwk .slot .sfill .sn { font-family:${FONT_SERIF}; font-size:16px; font-weight:600; color:var(--ink); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .pkgwk .slot .sfill .sf { font-family:${FONT_MONO}; font-size:8.5px; color:var(--muted); margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .pkgwk .slot .rm { margin-left:auto; color:var(--muted); cursor:pointer; background:none; border:0; padding:2px; display:flex; flex-shrink:0; font-size:15px; line-height:1; }
        .pkgwk .slot .rm:hover { color:var(--wk-burg); }
        .pkgwk .slot .kick { margin-left:auto; font-family:${FONT_MONO}; font-size:7.5px; letter-spacing:.1em; text-transform:uppercase; color:var(--muted); flex-shrink:0; }
        .pkgwk .pkg-foot { border-top:var(--bdw) solid var(--bd); padding:14px 22px; display:flex; align-items:center; gap:12px; background:var(--card); }
        .pkgwk .pkg-foot .res { font-family:${FONT_MONO}; font-size:9px; color:var(--muted); }
        .pkgwk .pkg-foot .res b { color:var(--wk-acc); }
        .pkgwk .pkg-foot .fa { margin-left:auto; display:flex; gap:14px; align-items:center; }
        .pkgwk .pkg-foot .fa button { font-family:${FONT_MONO}; font-size:9px; letter-spacing:.06em; text-transform:uppercase; border:0; background:none; cursor:pointer; color:var(--muted); }
        .pkgwk .pkg-foot .fa button:disabled { opacity:.45; cursor:not-allowed; }
        .pkgwk .pkg-foot .fa .save { color:var(--wk-burg); font-weight:600; }
        .pkgwk .pkg-foot .fa .discard { color:var(--wk-gold); }
        .pkgwk .pkg-foot .fa .save:disabled { color:var(--muted); }
        /* Other-packages grid (ref .othergrid / .ocard) — read-only summary cards; click promotes to bench. */
        .pkgwk .others-lab { font-family:${FONT_SERIF}; font-size:18px; font-weight:700; color:var(--hdr); margin:34px 0 16px; }
        .pkgwk .othergrid { display:grid; grid-template-columns:repeat(auto-fill,minmax(256px,1fr)); gap:18px; }
        .pkgwk .ocard { background:var(--card); border:var(--bdw) solid var(--bd); border-radius:13px; overflow:hidden; cursor:pointer; transition:transform .12s,box-shadow .12s; box-shadow:0 2px 10px rgba(40,28,18,.06); text-align:left; width:100%; font:inherit; color:inherit; padding:0; }
        .pkgwk .ocard:hover { transform:translateY(-2px); box-shadow:0 11px 26px rgba(58,28,20,.13); }
        .pkgwk .oc-top { display:flex; gap:15px; padding:18px; align-items:flex-start; }
        .pkgwk .ostack { position:relative; width:44px; height:56px; flex-shrink:0; }
        .pkgwk .ostack .sh { position:absolute; width:34px; height:45px; border-radius:4px; border:var(--bdw) solid var(--bd); background:var(--card); }
        .pkgwk .ostack .s1 { left:0; top:8px; transform:rotate(-8deg); }
        .pkgwk .ostack .s2 { left:6px; top:4px; transform:rotate(4deg); background:var(--selBg); }
        .pkgwk .ostack .s3 { left:10px; top:0; transform:rotate(-2deg); display:flex; align-items:center; justify-content:center; color:var(--wk-burg); }
        .pkgwk .oc-top h5 { font-family:${FONT_SERIF}; font-size:16.5px; font-weight:800; color:var(--hdr); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .pkgwk .ocl { font-family:${FONT_MONO}; font-size:9px; line-height:1.75; margin-top:6px; }
        .pkgwk .ocl .lit { color:var(--wk-burg); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .pkgwk .ocl .dim { color:var(--wk-dash); }
        .pkgwk .oc-foot { border-top:var(--bdw) solid var(--bd); background:var(--card); padding:13px 18px; display:flex; align-items:center; gap:9px; }
        .pkgwk .oc-foot .od { width:9px; height:9px; border-radius:50%; background:var(--wk-acc); flex-shrink:0; }
        .pkgwk .oc-foot .od.gold { background:var(--wk-gold); }
        .pkgwk .oc-foot .od.grey { background:var(--wk-dash); }
        .pkgwk .oc-foot .om { font-size:13px; font-weight:600; color:var(--hdr); }
        .pkgwk .oc-foot .om.flat { color:var(--muted); font-weight:400; font-style:italic; }
        .pkgwk .oc-foot .os { margin-left:auto; font-family:${FONT_MONO}; font-size:8.5px; color:var(--muted); }
        .pkgwk .newpkg-card { border:1.5px dashed var(--wk-dash); border-radius:13px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; color:var(--muted); cursor:pointer; min-height:136px; background:none; }
        .pkgwk .newpkg-card:hover { border-color:var(--wk-burg); color:var(--wk-burg); }
        .pkgwk .newpkg-card .pl { font-size:27px; font-weight:300; line-height:1; }
        .pkgwk .newpkg-card .nl { font-family:${FONT_SERIF}; font-size:15px; font-weight:600; }

        /* Analytics body: scope toggle + panel */
        .pkgwk .wk-scope { display:flex; gap:3px; background:var(--wk-scopebg); border-radius:9px; padding:3px; margin:20px 22px 0; }
        .pkgwk .wk-scope button { flex:1; font-family:${FONT_MONO}; font-size:9px; border:0; background:transparent; color:var(--muted); padding:10px 4px; border-radius:7px; cursor:pointer; text-transform:uppercase; }
        .pkgwk .wk-scope button.on { background:var(--card); color:var(--wk-burg); font-weight:600; box-shadow:0 1px 2px rgba(58,28,20,.1); }
        .t-edn .pkgwk .wk-scope button.on { color:var(--wk-acc); }
        .pkgwk .wk-anbody { padding:22px 24px; overflow-y:auto; flex:1; }

        /* Phase-1 skeletal placeholder (removed as each zone is built out) */
        .pkgwk .wk-skel { font-family:${FONT_SERIF}; font-style:italic; font-size:13px; color:var(--muted); line-height:1.6; }

        @media (max-width: 1040px) { .pkgwk .wk-windows { flex-direction:column; } .pkgwk .wk-analytics { width:auto; } }
        @media (max-width: 720px) { .pkgwk .wk-body { flex-direction:column; } .pkgwk .wk-palette { width:auto; border-right:0; border-bottom:var(--bdw) solid var(--bd); } }
      `}</style>

      <div className="wk-windows">
        {/* WORKSHOP window */}
        <section className="wk-win wk-workshop">
          <div className="wk-h"><span className="wk-ri">{toolIcon}</span><h3>Workshop</h3><span className="wk-tag">build &amp; assemble</span></div>
          <div className="wk-body">
            <div className="wk-palette">
              <div className="pal-lab">Your materials — drag or click to use</div>
              {BUILDER_TYPES.map((t) => {
                const items = versions.filter((v) => v.componentType === t);
                const noun = TYPE_META[t].label.toLowerCase();
                return (
                  <div key={t} className="palgroup">
                    <div className="palgroup-h"><span className="g"><TypeGlyph type={t} size={13} /></span>{TYPE_META[t].plural}</div>
                    {items.map((v) => (
                      // Drag OR click OR Enter/Space fills the active package's matching slot (all first-class).
                      // The hover edit pencil opens the full MaterialModal (its click stops propagation).
                      <div
                        key={v.id}
                        className={`chip${dragMat === v.id ? " dragging" : ""}`}
                        draggable
                        data-mat={v.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`Add ${v.versionName} to the active package`}
                        onClick={() => fillSlot(t, v.id)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fillSlot(t, v.id); } }}
                        onDragStart={(e) => { setDragMat(v.id); e.dataTransfer.effectAllowed = "copy"; }}
                        onDragEnd={() => { setDragMat(null); setOverSlot(null); }}
                      >
                        <span className="cg"><TypeGlyph type={t} size={14} /></span>
                        <div className="cmid">
                          <div className="cn">{v.versionName}</div>
                          {v.fileName && <div className="cf">{v.fileName}</div>}
                        </div>
                        <button type="button" className="cedit" aria-label={`Edit ${v.versionName}`} onClick={(e) => { e.stopPropagation(); onEditVersion(v); }}>{pencilIcon}</button>
                        <span className="grip" aria-hidden="true">⋮⋮</span>
                      </div>
                    ))}
                    {newInType === t ? (
                      <input
                        className="newin"
                        autoFocus
                        value={newName}
                        placeholder={`Name your ${noun}…`}
                        aria-label={`Name your new ${noun}`}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") commitNew(t); if (e.key === "Escape") { setNewInType(null); setNewName(""); } }}
                        onBlur={() => { setNewInType(null); setNewName(""); }}
                      />
                    ) : (
                      <button type="button" className="newchip" onClick={() => { setNewInType(t); setNewName(""); }}>＋ New {noun}</button>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="wk-building">
              <div className="bench-lab"><span className="dotp" />Active package — drag materials from the left, or click to add</div>
              {active && activeId ? (
                <div className="pkg">
                  <div className="pkg-h">
                    <input className="name" value={active.name} placeholder="Untitled package" aria-label="Package name" onChange={(e) => renameActive(e.target.value)} />
                    <span className="pen" aria-hidden="true">{pencilIcon}</span>
                  </div>
                  <div className="pkg-slots">
                    {BUILDER_TYPES.map((t) => {
                      const vid = active.sel[t];
                      const v = isSlotFilled(vid) ? versionById(vid) : undefined;
                      const canDrop = dragMat ? versionById(dragMat)?.componentType === t : false;
                      return (
                        <div
                          key={t}
                          className={`slot${v ? " filled" : ""}${overSlot === t ? " over" : ""}${flash === t && v ? " flash" : ""}`}
                          onDragOver={(e) => { if (canDrop) { e.preventDefault(); setOverSlot(t); } }}
                          onDragLeave={() => setOverSlot((s) => (s === t ? null : s))}
                          onDrop={(e) => { if (canDrop && dragMat) { e.preventDefault(); fillSlot(t, dragMat); setOverSlot(null); } }}
                          onAnimationEnd={() => setFlash((f) => (f === t ? null : f))}
                        >
                          <span className="sg"><TypeGlyph type={t} size={16} /></span>
                          {v ? (
                            <>
                              <div className="sfill"><div className="sn">{v.versionName}</div>{v.fileName && <div className="sf">{v.fileName}</div>}</div>
                              <button type="button" className="rm" aria-label={`Remove ${slotNoun(t)}`} onClick={() => clearSlot(t)}>✕</button>
                            </>
                          ) : (
                            <>
                              <span className="stxt">Drop a {slotNoun(t)} here{t === ComponentType.SAMPLE_PAGES ? " (optional)" : ""}</span>
                              <span className="kick">{t === ComponentType.QUERY_LETTER ? "required" : slotNoun(t)}</span>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="pkg-foot">
                    {(() => {
                      const c = drafts[activeId]?.isNew ? { sent: 0, full: 0 } : pkgCounts(activeId);
                      return (
                        <span className="res">
                          {c.sent > 0 ? (
                            <>SENT WITH {c.sent} {c.sent === 1 ? "QUERY" : "QUERIES"}{c.full > 0 ? <> · <b>{c.full} FULL REQUEST{c.full === 1 ? "" : "S"}</b></> : null}</>
                          ) : "NOT SENT YET"}
                        </span>
                      );
                    })()}
                    <span className="fa">
                      {isDirty ? (
                        <>
                          <button type="button" className="save" disabled={!canSave} title={!canSave ? "Add a name and a query letter to save" : undefined} onClick={save}>✓ Save</button>
                          <button type="button" className="discard" onClick={discard}>Discard</button>
                        </>
                      ) : (
                        <button type="button" onClick={() => duplicate(active)}>⧉ Duplicate</button>
                      )}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="wk-skel">No package on the bench yet.</div>
              )}
              {/* Other-packages grid — read-only; click promotes to the bench. + New-package ghost. */}
              <div className="others-lab">Your other packages · {otherIds.length}</div>
              <div className="othergrid">
                {otherIds.map((id) => {
                  const d = effOf(id);
                  if (!d) return null;
                  const c = drafts[id]?.isNew ? { sent: 0, full: 0 } : pkgCounts(id);
                  const dotCls = c.sent === 0 ? "grey" : c.full > 0 ? "" : "gold";
                  const msg = c.sent === 0 ? "Draft — not sent" : c.full > 0 ? `${c.full} full request${c.full === 1 ? "" : "s"}` : "Awaiting reply";
                  const flat = c.sent === 0 || c.full === 0;
                  return (
                    <button key={id} type="button" className="ocard" onClick={() => setActiveId(id)}>
                      <div className="oc-top">
                        <div className="ostack" aria-hidden="true">
                          <span className="sh s1" /><span className="sh s2" />
                          <span className="sh s3"><TypeGlyph type={ComponentType.QUERY_LETTER} size={13} /></span>
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <h5>{d.name || "Untitled package"}</h5>
                          <div className="ocl">
                            {BUILDER_TYPES.map((t) => {
                              const vid = d.sel[t];
                              const v = isSlotFilled(vid) ? versionById(vid) : undefined;
                              return <div key={t} className={v ? "lit" : "dim"}>{v ? v.versionName : `— no ${slotNoun(t)}`}</div>;
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="oc-foot">
                        <span className={`od ${dotCls}`} />
                        <span className={`om${flat ? " flat" : ""}`}>{msg}</span>
                        {c.sent > 0 && <span className="os">{c.sent} sent</span>}
                      </div>
                    </button>
                  );
                })}
                <button type="button" className="newpkg-card" onClick={newPackage}><span className="pl">＋</span><span className="nl">New package</span></button>
              </div>
            </div>
          </div>
        </section>

        {/* ANALYTICS window */}
        <section className="wk-win wk-analytics">
          <div className="wk-h"><span className="wk-ri">{chartIcon}</span><h3>Package analytics</h3></div>
          <div className="wk-scope">
            <button type="button" className="on">This package</button>
            <button type="button">All packages</button>
          </div>
          <div className="wk-anbody">
            <div className="wk-skel">Result hero, readiness checklist and the cross-package leaderboard ({packages.length} package{packages.length === 1 ? "" : "s"}) arrive in Phase 5 — reusing the packageMetrics engine.</div>
          </div>
        </section>
      </div>
    </div>
  );
};
