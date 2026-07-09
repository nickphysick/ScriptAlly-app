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
import { ManuscriptVersion, SubmissionPackage, Query, Agent, ComponentType } from "../../types";
import { TypeGlyph } from "./TypeGlyph";
import { TYPE_META, BUILDER_TYPES, SlotSelection, emptySelection, selectionFromPackage } from "./typeMeta";
import { isSlotFilled, UNFILLED_SLOT, reachedFull, overallAttachStats, rankPackagesByRequests, strongestPackage, packagesUsingVersion, meetsSampleThreshold, MIN_SENDS_FOR_CLAIM } from "../../lib/packageMetrics";
import { agentPrimary, AGENT_NOT_SPECIFIED } from "../../lib/agentDisplay";
import { FONT_SERIF, FONT_MONO, FONT_SANS } from "../../lib/designTokens";

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
const materialIcon = (
  <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinejoin="round" aria-hidden="true"><path d="M4 5h11l5 5v9H4z" /><path d="M15 5v5h5" /><path d="M8 14h8M8 17h5" strokeLinecap="round" /></svg>
);
const pencilIcon = (
  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20h4L18 10l-4-4L4 16z" /><path d="M13 7l4 4" /></svg>
);
const fileIcon = (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" aria-hidden="true"><path d="M14 3H6a1 1 0 00-1 1v16a1 1 0 001 1h12a1 1 0 001-1V8z" /><path d="M14 3v5h5" /></svg>
);

export interface PackageWorkshopProps {
  versions: ManuscriptVersion[];
  packages: SubmissionPackage[];
  queries: Query[];
  /** Agents for the "Sent to" list (resolving a package's linked queries to names). */
  agents: Agent[];
  /** Create a material from the inline editor (host addVersion, fileAttached:false, contentType:'text').
   *  Returns the new id so the editor can re-select it. */
  onCreateVersion: (type: ComponentType, name: string, contentDraft: string) => Promise<string | undefined> | string | undefined;
  /** Update a material's name + body text (host updateVersion). */
  onUpdateVersion: (id: string, fields: { versionName: string; contentDraft: string }) => void;
  /** Delete a material (host deleteVersion). The workshop guards orphaning before calling this. */
  onDeleteVersion: (id: string) => void;
  /** Persist the bench: baseId set → updatePackage, null → addPackage. Returns the (new) package id. */
  onSavePackage: (baseId: string | null, fields: PackageSaveFields) => Promise<string | undefined> | string | undefined;
  /** Re-run the guided tour (the workshop-header "?" chip). Absent → the chip is hidden. */
  onStartTour?: () => void;
  /** Pulse the "＋ Add materials" affordance (set by the host when the tour ends with 0 materials).
   *  Only shown while materials are still empty; cleared via onDismissPulse on the first click. */
  pulseAddMaterials?: boolean;
  /** Clear the add-materials pulse (called on the first Add-materials click). */
  onDismissPulse?: () => void;
}

export const PackageWorkshop: React.FC<PackageWorkshopProps> = ({ versions, packages, queries, agents, onCreateVersion, onUpdateVersion, onDeleteVersion, onSavePackage, onStartTour, pulseAddMaterials, onDismissPulse }) => {
  // Mode (Phase A): "packages" (build/assemble) or "materials" (edit the library). The palette + the
  // middle + the right window all follow it; the breadcrumb reflects it. selMat = the material being
  // edited in materials mode. Palette inline-create is GONE — creation now lives in the editor (Phase B).
  const [mode, setMode] = useState<"packages" | "materials">("packages");
  const [selMat, setSelMat] = useState<string | null>(null);
  // Analytics scope (P5): "package" (the active one — always relevant, even pre-send) or "all".
  const [anScope, setAnScope] = useState<"package" | "all">("package");

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

  // Keep a valid active package. If the manuscript has none and there's no draft yet, open a fresh
  // empty one so the bench is always ready-to-fill (the no-packages empty state).
  useEffect(() => {
    if (activeId && (drafts[activeId] || packages.some((p) => p.id === activeId))) return;
    if (packages.length === 0 && Object.keys(drafts).length === 0) { newPackage(); return; }
    setActiveId(packages[0]?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Materials editor state (Phase B). newType set = creating a new material of that type; selMat set =
  // editing an existing one. edName/edText are the live form fields; pendingDelete drives the orphan guard.
  const [newType, setNewType] = useState<ComponentType | null>(null);
  const [edName, setEdName] = useState("");
  const [edText, setEdText] = useState("");
  const [pendingDelete, setPendingDelete] = useState<{ id: string; usedIn: string[] } | null>(null);

  // Sync the form fields when the editing target changes (select a material, or start a new one).
  useEffect(() => {
    if (selMat) { const v = versions.find((x) => x.id === selMat); setEdName(v?.versionName ?? ""); setEdText(v?.contentDraft ?? ""); }
    else if (newType) { setEdName(""); setEdText(""); }
    setPendingDelete(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selMat, newType]);

  // Entering materials mode clears any package DnD affordance; leaving it clears the selection + editor.
  const enterMode = (m: "packages" | "materials") => {
    setMode(m);
    setDragMat(null);
    setOverSlot(null);
    if (m === "packages") { setSelMat(null); setNewType(null); }
  };
  const selectMat = (id: string) => { setNewType(null); setSelMat(id); };
  const startNew = () => { setSelMat(null); setNewType(BUILDER_TYPES[0]); };
  const canSaveMat = edName.trim().length > 0;
  const saveMat = async () => {
    if (!canSaveMat) return;
    if (selMat) {
      onUpdateVersion(selMat, { versionName: edName.trim(), contentDraft: edText });
    } else if (newType) {
      const id = await onCreateVersion(newType, edName.trim(), edText);
      if (typeof id === "string") { setNewType(null); setSelMat(id); }
    }
    // Stays in materials mode (Done is the explicit exit) — a deliberate deviation from the mock's
    // save→packages kick, so you can edit several materials in one pass.
  };
  const requestDelete = () => {
    if (!selMat) return;
    const usedIn = packagesUsingVersion(selMat, packages).map((p) => p.packageName);
    setPendingDelete({ id: selMat, usedIn });
  };
  const confirmDelete = () => {
    if (!pendingDelete) return;
    onDeleteVersion(pendingDelete.id);
    setPendingDelete(null);
    setSelMat(null);
    setNewType(null);
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

  // ── Analytics (P5). This-package figures are per-active; the All view reuses the packageMetrics
  // engine (overallAttachStats / rankPackagesByRequests / strongestPackage) exactly as the shipped
  // PackageStats does. Honest below MIN_SENDS_FOR_CLAIM — a raw count is a fact; a ranking is caveated.
  const renderThisPackage = () => {
    if (!active || !activeId) return <div className="an-hero flat"><span className="big">No package selected</span></div>;
    const isNew = !!drafts[activeId]?.isNew;
    const aq = isNew ? [] : queries.filter((q) => q.packageId === activeId);
    const sent = aq.length;
    const full = aq.filter(reachedFull).length;
    const sentTo = [...new Set(aq.map((q) => { const a = agents.find((x) => x.id === q.agentId); return a ? agentPrimary(a) : AGENT_NOT_SPECIFIED; }))];
    return (
      <>
        <div className="an-title">{active.name || "Untitled package"}</div>
        <div className="an-sub">Active package</div>
        <div className="an-sec">Result so far</div>
        {sent > 0 ? (
          full > 0 ? (
            <div className="an-hero"><span className="big">{full}</span><span className="lab"><b>Full request{full === 1 ? "" : "s"} ✓</b><span>from {sent} sent</span></span></div>
          ) : (
            <div className="an-hero flat"><span className="big">Awaiting reply</span></div>
          )
        ) : (
          <div className="an-hero flat"><span className="big">Not sent yet</span></div>
        )}
        {sent > 0 && sent < MIN_SENDS_FOR_CLAIM ? (
          <div className="annote">Sent to {sent} so far — a couple more will give a fair read on whether this version pulls requests.</div>
        ) : sent === 0 ? (
          <div className="annote">Attach it to a query from the Queries Hub to start tracking how it does.</div>
        ) : null}
        <div className="an-sec">Ready to send?</div>
        {BUILDER_TYPES.map((t) => {
          const has = isSlotFilled(active.sel[t]);
          return <div key={t} className="ck"><span className={`cb ${has ? "yes" : "no"}`}>{has ? "✓" : "–"}</span>{TYPE_META[t].label}{t === ComponentType.SAMPLE_PAGES && <span className="cd">optional</span>}</div>;
        })}
        <div className="an-sec">Sent to</div>
        {sentTo.length ? <div className="agc">{sentTo.map((n, i) => <span key={i}>{n}</span>)}</div> : <div className="ck"><span className="cd">Not attached to any query yet</span></div>}
      </>
    );
  };

  const renderAllPackages = () => {
    const overall = overallAttachStats(packages, queries);
    const ranked = rankPackagesByRequests(packages, queries).filter((r) => r.stat.sent > 0);
    const winner = strongestPackage(packages, queries);
    const attribution = versions
      .map((v) => {
        const inPkgs = packagesUsingVersion(v.id, packages);
        const requested = inPkgs.filter((p) => queries.some((q) => q.packageId === p.id && reachedFull(q))).length;
        return { v, inCount: inPkgs.length, requested };
      })
      .filter((x) => x.inCount > 0);
    return (
      <>
        <div className="anfig">
          <div><div className="v">{packages.length}</div><div className="k">Packages</div></div>
          <div><div className="v">{overall.sent}</div><div className="k">Sent</div></div>
          <div><div className="v win">{overall.requests}</div><div className="k">Requests</div></div>
        </div>
        <div className="an-sec">Best at winning requests</div>
        {ranked.length ? ranked.map((r, i) => {
          const isBest = winner?.pkg.id === r.pkg.id;
          return (
            <div key={r.pkg.id} className={`lb${isBest ? " best" : ""}`}>
              <span className="rank">{i + 1}</span>
              <div className="ln">
                <div className="lnm">{r.pkg.packageName}{isBest && <span className="star"> ★</span>}{!r.ranked && <span className="early">early</span>}</div>
                <div className="bar"><i style={{ width: `${Math.max(Math.round((r.stat.requestRate ?? 0) * 100), 4)}%` }} /></div>
              </div>
              <div className="lv"><b>{r.stat.requests}</b>/{r.stat.sent}</div>
            </div>
          );
        }) : <div className="ck"><span className="cd">Send a few to see rankings</span></div>}
        <div className="annote">Early days — rankings firm up once each package has gone to {MIN_SENDS_FOR_CLAIM} or more agents.</div>
        <div className="an-sec">Materials that show up in requests</div>
        {attribution.length ? attribution.map(({ v, inCount, requested }) => (
          <div key={v.id} className="mrow">
            <span className="mg"><TypeGlyph type={v.componentType} size={13} /></span>
            <div style={{ minWidth: 0 }}><div className="mn">{v.versionName}</div><div className="mm">IN {inCount} PACKAGE{inCount === 1 ? "" : "S"}</div></div>
            {requested > 0 && <span className="mx">{requested} REQUESTED ✓</span>}
          </div>
        )) : <div className="ck"><span className="cd">No materials in a package yet</span></div>}
      </>
    );
  };

  // Material analytics (Phase C) — the right window in materials mode. Usage is derived from the engine
  // (packagesUsingVersion) + reachedFull for the "full request" count that matches the rest of the workshop.
  const materialUsage = (id: string) => {
    const inP = packagesUsingVersion(id, packages);
    const ids = new Set(inP.map((p) => p.id));
    const mine = queries.filter((q) => ids.has(q.packageId));
    return { n: inP.length, sent: mine.length, full: mine.filter(reachedFull).length, names: inP.map((p) => p.packageName) };
  };
  const renderMaterialAnalytics = () => {
    if (!selMat) {
      const surfaced = versions.filter((v) => (BUILDER_TYPES as ComponentType[]).includes(v.componentType));
      const unused = surfaced.filter((v) => packagesUsingVersion(v.id, packages).length === 0).length;
      return (
        <>
          <div className="an-title">Your materials</div>
          <div className="an-sub">Overview</div>
          <div className="an-sec">Library</div>
          <div className="anfig">
            <div><div className="v">{surfaced.length}</div><div className="k">Materials</div></div>
            <div><div className="v">{unused}</div><div className="k">Unused</div></div>
          </div>
          <div className="annote">Pick a material on the left to see where it&rsquo;s used and how it&rsquo;s performing.</div>
        </>
      );
    }
    const v = versionById(selMat);
    if (!v) return null;
    const u = materialUsage(selMat);
    const typeLabel = TYPE_META[v.componentType].label;
    if (u.n === 0) {
      return (
        <>
          <div className="an-title">{v.versionName}</div>
          <div className="an-sub">{typeLabel}</div>
          <div className="an-sec">Where it&rsquo;s used</div>
          <div className="an-hero flat"><span className="big">Not in any package yet</span></div>
          <div className="annote">Add this to a package in Packages mode to start tracking how it does with agents.</div>
        </>
      );
    }
    return (
      <>
        <div className="an-title">{v.versionName}</div>
        <div className="an-sub">{typeLabel}</div>
        <div className="an-sec">How it&rsquo;s doing</div>
        <div className="anfig">
          <div><div className="v">{u.n}</div><div className="k">In packages</div></div>
          <div><div className="v">{u.sent}</div><div className="k">Sent</div></div>
          <div><div className="v win">{u.full}</div><div className="k">Full req&rsquo;s</div></div>
        </div>
        <div className="an-sec">Used in</div>
        <div className="agc">{u.names.map((n, i) => <span key={i}>{n}</span>)}</div>
        {u.sent < MIN_SENDS_FOR_CLAIM && <div className="annote">Only {u.sent} send{u.sent === 1 ? "" : "s"} so far across its packages — too early to say if this piece is pulling requests.</div>}
      </>
    );
  };

  return (
    <div className={`pkgwk mode-${mode}`}>
      <style>{`
        /* ── Workshop-local tokens. Cappuccino sampled from the ref; Bold sampled; Editorial rides its
           REAL .t-edn tokens (graphite single accent — no burgundy/sage/gold in its system). ── */
        .pkgwk { --wk-burg:var(--burg); --wk-acc:var(--sage-d); --wk-gold:var(--gold);
          --wk-bar:#eee2d2; --wk-dash:#c9bca8; --wk-dashd:#e7dbc9;
          --wk-pulse:rgba(124,58,42,.16); --wk-scopebg:rgba(124,58,42,.07); --wk-flash:#e9f0e9;
          /* FR2: fill the stage (pkg-root, a height-bounded flex column) so the two windows size to
             the viewport and their inner regions scroll — never the page. */
          display:flex; flex-direction:column; flex:1; min-height:0; }
        .t-bold .pkgwk { --wk-bar:#e7d3cc; --wk-dash:#caa99f; --wk-dashd:#e3cfc9; }
        .t-edn .pkgwk { --wk-burg:var(--acc); --wk-acc:var(--acc); --wk-gold:var(--muted);
          --wk-bar:var(--abtn-bg); --wk-dash:var(--bd); --wk-dashd:var(--bd);
          --wk-pulse:rgba(68,72,77,.16); --wk-scopebg:rgba(68,72,77,.07); --wk-flash:#eef0f2; }

        /* ── Materials-mode breadcrumb (ref .crumb) — reflects the mode; sits above the windows in the
           header zone. Root class .mode-packages / .mode-materials drives the palette + middle switch. */
        .pkgwk .wk-crumb { display:flex; align-items:center; gap:8px; font-family:${FONT_MONO}; font-size:11px; letter-spacing:.08em; color:var(--hdr); padding:2px 4px 16px; }
        .pkgwk .wk-crumb .root { opacity:.55; }
        .pkgwk .wk-crumb .sep { opacity:.4; }
        .pkgwk .wk-crumb .cur { font-weight:600; }
        /* ── Two-window shell ── */
        .pkgwk .wk-windows { display:flex; gap:24px; align-items:stretch; flex:1; min-height:0; }
        .pkgwk .wk-win { background:var(--card); border:var(--bdw) solid var(--bd); border-radius:16px; overflow:hidden; display:flex; flex-direction:column; box-shadow:0 8px 26px rgba(40,28,18,.10); }
        .pkgwk .wk-workshop { flex:1; min-width:0; }
        .pkgwk .wk-analytics { width:376px; flex-shrink:0; }
        .pkgwk .wk-h { display:flex; align-items:center; gap:13px; padding:18px 28px; background:linear-gradient(135deg,var(--band-a),var(--band-b)); border-bottom:var(--bdw) solid var(--bd); }
        .pkgwk .wk-ri { color:var(--hdrOn); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .pkgwk .wk-h h3 { font-family:${FONT_SERIF}; font-size:19px; font-weight:800; color:var(--hdrOn); }
        .pkgwk .wk-tag { margin-left:auto; font-family:${FONT_MONO}; font-size:8.5px; letter-spacing:.1em; text-transform:uppercase; color:var(--hdrOn); opacity:.55; }
        .pkgwk .wk-help { margin-left:12px; width:24px; height:24px; border-radius:50%; border:var(--bdw) solid var(--bd); background:var(--card); color:var(--hdrOn); font-family:${FONT_MONO}; font-size:12px; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; line-height:1; }
        .pkgwk .wk-help:hover { background:var(--btnH); }

        /* Workshop body: palette | building split */
        .pkgwk .wk-body { display:flex; flex:1; min-height:0; }
        .pkgwk .wk-palette { background:var(--card); border-right:var(--bdw) solid var(--bd); padding:22px; width:258px; flex-shrink:0; overflow-y:auto; }
        .pkgwk .wk-building { flex:1; min-width:0; padding:28px 32px; overflow-y:auto; background:var(--card); }
        .pkgwk .pal-lab { font-family:${FONT_MONO}; font-size:8px; letter-spacing:.12em; text-transform:uppercase; color:var(--muted); margin-bottom:15px; }
        /* Palette top header — label + the single mode toggle (Edit materials → / ✓ Done). */
        .pkgwk .pal-toph { display:flex; align-items:center; margin-bottom:14px; }
        .pkgwk .pal-toph .pl { font-family:${FONT_MONO}; font-size:8px; letter-spacing:.12em; text-transform:uppercase; color:var(--muted); }
        .pkgwk .pal-toph .em { margin-left:auto; font-family:${FONT_MONO}; font-size:8.5px; color:var(--wk-burg); cursor:pointer; border:1px solid var(--btnBd); border-radius:7px; padding:5px 9px; background:var(--card); }
        .pkgwk .pal-toph .em:hover { background:var(--btnH); }
        .pkgwk .pal-teach { font-size:11.5px; font-style:italic; color:var(--muted); line-height:1.5; margin-bottom:16px; }
        .pkgwk .pal-teach b { color:var(--wk-burg); font-style:normal; font-weight:600; }
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
        /* Materials mode: chips become a selectable list — no drag, grip hidden, an "edit ›" affordance,
           the selected chip ringed (ref .mode-materials .chip). */
        .pkgwk.mode-materials .chip { cursor:pointer; }
        .pkgwk.mode-materials .chip .grip { display:none; }
        .pkgwk.mode-materials .chip .cedit { display:none; }
        .pkgwk.mode-materials .chip .edita { display:flex; margin-left:auto; font-family:${FONT_MONO}; font-size:8px; color:var(--muted); flex-shrink:0; }
        .pkgwk .chip .edita { display:none; }
        .pkgwk.mode-materials .chip.sel { border-color:var(--wk-burg); box-shadow:0 0 0 2px var(--wk-pulse); }
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

        /* FR4 — pre-materials empty states (ref .mid-empty / .an-empty) + the add-materials pulse. */
        .pkgwk .mid-empty { height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; gap:6px; padding:30px; }
        .pkgwk .me-illo { width:120px; height:96px; opacity:.85; margin-bottom:6px; }
        .pkgwk .me-title { font-family:${FONT_SERIF}; font-size:22px; font-weight:800; color:var(--hdr); }
        .pkgwk .me-sub { font-size:12.5px; color:var(--muted); line-height:1.6; max-width:340px; }
        .pkgwk .me-cta { margin-top:14px; font-family:${FONT_SERIF}; font-size:15px; font-weight:700; color:var(--btnT); background:var(--btnBg); border:1px solid var(--btnBd); border-radius:11px; padding:12px 26px; cursor:pointer; }
        .pkgwk .me-cta:hover { background:var(--btnH); }
        .pkgwk .an-empty { height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; gap:6px; padding:20px; }
        .pkgwk .ae-illo { width:110px; height:84px; opacity:.7; margin-bottom:8px; }
        .pkgwk .ae-title { font-family:${FONT_SERIF}; font-size:17px; font-weight:800; color:var(--hdr); }
        .pkgwk .ae-sub { font-size:12px; color:var(--muted); line-height:1.6; max-width:280px; }
        @keyframes wkMatPulse { 0%,100% { box-shadow:0 0 0 0 var(--wk-pulse-ring); } 50% { box-shadow:0 0 0 9px rgba(124,58,42,0); } }
        .pkgwk { --wk-pulse-ring:rgba(124,58,42,.35); }
        .t-edn .pkgwk { --wk-pulse-ring:rgba(68,72,77,.35); }
        .pkgwk .pal-toph .em.pulse { animation:wkMatPulse 1.8s ease-out infinite; border-color:var(--wk-burg); color:var(--wk-burg); font-weight:600; }
        @media (prefers-reduced-motion: reduce) { .pkgwk .pal-toph .em.pulse { animation:none; box-shadow:0 0 0 3px var(--wk-pulse-ring); } }

        /* Analytics body: scope toggle + panel */
        .pkgwk .wk-scope { display:flex; gap:3px; background:var(--wk-scopebg); border-radius:9px; padding:3px; margin:20px 22px 0; }
        .pkgwk .wk-scope button { flex:1; font-family:${FONT_MONO}; font-size:9px; border:0; background:transparent; color:var(--muted); padding:10px 4px; border-radius:7px; cursor:pointer; text-transform:uppercase; }
        .pkgwk .wk-scope button.on { background:var(--card); color:var(--wk-burg); font-weight:600; box-shadow:0 1px 2px rgba(58,28,20,.1); }
        .t-edn .pkgwk .wk-scope button.on { color:var(--wk-acc); }
        .pkgwk .wk-anbody { padding:22px 24px; overflow-y:auto; flex:1; }
        /* Analytics panel (ref .an-*) — accent is --wk-acc (sage in Capp/Bold, graphite in Editorial). */
        .pkgwk .an-title { font-family:${FONT_SERIF}; font-size:20px; font-weight:800; color:var(--hdr); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .pkgwk .an-sub { font-family:${FONT_MONO}; font-size:8px; letter-spacing:.06em; text-transform:uppercase; color:var(--muted); margin-top:3px; }
        .pkgwk .an-sec { font-family:${FONT_MONO}; font-size:8.5px; letter-spacing:.14em; text-transform:uppercase; color:var(--muted); margin:24px 0 12px; }
        .pkgwk .an-hero { background:var(--card); border:var(--bdw) solid var(--bd); border-radius:13px; padding:20px 22px; display:flex; align-items:center; gap:17px; }
        .pkgwk .an-hero .big { font-family:${FONT_SERIF}; font-size:50px; font-weight:800; color:var(--wk-acc); line-height:.82; }
        .pkgwk .an-hero .lab b { display:block; font-size:15px; font-weight:700; color:var(--hdr); }
        .pkgwk .an-hero .lab span { font-family:${FONT_MONO}; font-size:8.5px; letter-spacing:.05em; text-transform:uppercase; color:var(--muted); margin-top:3px; display:block; }
        .pkgwk .an-hero.flat .big { color:var(--muted); font-size:16px; font-family:${FONT_MONO}; font-weight:500; text-transform:uppercase; letter-spacing:.04em; align-self:center; }
        .pkgwk .ck { display:flex; align-items:center; gap:10px; font-size:13.5px; padding:6px 0; color:var(--ink); }
        .pkgwk .ck .cb { width:20px; height:20px; border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:12px; flex-shrink:0; }
        .pkgwk .ck .cb.yes { background:var(--selBg); color:var(--wk-acc); }
        .pkgwk .ck .cb.no { background:var(--selBg); color:var(--wk-dash); }
        .pkgwk .ck .cd { color:var(--muted); font-style:italic; font-size:12.5px; }
        .pkgwk .agc { display:flex; flex-wrap:wrap; gap:7px; }
        .pkgwk .agc span { font-family:${FONT_MONO}; font-size:9.5px; background:var(--selBg); color:var(--hdr); border-radius:7px; padding:6px 11px; }
        .pkgwk .anfig { display:flex; gap:22px; background:var(--card); border:var(--bdw) solid var(--bd); border-radius:13px; padding:18px 20px; }
        .pkgwk .anfig .v { font-family:${FONT_SERIF}; font-size:29px; font-weight:800; color:var(--hdr); line-height:1; }
        .pkgwk .anfig .v.win { color:var(--wk-acc); }
        .pkgwk .anfig .k { font-family:${FONT_MONO}; font-size:7.5px; letter-spacing:.07em; text-transform:uppercase; color:var(--muted); margin-top:5px; }
        .pkgwk .annote { margin-top:14px; font-size:12px; font-style:italic; color:var(--muted); line-height:1.55; background:var(--card); border:var(--bdw) solid var(--bd); border-left:3px solid var(--wk-acc); border-radius:0 10px 10px 0; padding:13px 15px; }
        .pkgwk .lb { display:flex; align-items:center; gap:11px; padding:11px 0; border-bottom:1px dashed var(--wk-dashd); }
        .pkgwk .lb:last-child { border-bottom:0; }
        .pkgwk .lb .rank { font-family:${FONT_MONO}; font-size:9.5px; color:var(--muted); width:13px; flex-shrink:0; }
        .pkgwk .lb .ln { flex:1; min-width:0; }
        .pkgwk .lb .lnm { font-family:${FONT_SERIF}; font-size:14.5px; font-weight:700; color:var(--hdr); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .pkgwk .lb .lnm .early { font-family:${FONT_MONO}; font-size:7px; font-weight:500; letter-spacing:.08em; text-transform:uppercase; color:var(--muted); border:1px solid var(--bd); border-radius:4px; padding:1px 5px; margin-left:8px; vertical-align:middle; }
        .pkgwk .lb .bar { height:6px; border-radius:3px; background:var(--wk-bar); margin-top:6px; overflow:hidden; }
        .pkgwk .lb .bar i { display:block; height:100%; background:var(--wk-acc); border-radius:3px; }
        .pkgwk .lb .lv { font-family:${FONT_MONO}; font-size:9.5px; color:var(--muted); text-align:right; flex-shrink:0; }
        .pkgwk .lb .lv b { color:var(--wk-acc); font-size:13px; }
        .pkgwk .lb.best .lnm .star { color:var(--wk-gold); }
        .pkgwk .mrow { display:flex; align-items:center; gap:11px; padding:10px 0; border-bottom:1px dashed var(--wk-dashd); }
        .pkgwk .mrow:last-child { border-bottom:0; }
        .pkgwk .mrow .mg { width:26px; height:26px; border-radius:8px; background:var(--selBg); color:var(--wk-burg); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .pkgwk .mrow .mn { font-size:13px; font-weight:600; color:var(--ink); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .pkgwk .mrow .mm { font-family:${FONT_MONO}; font-size:8px; color:var(--muted); margin-top:2px; }
        .pkgwk .mrow .mx { margin-left:auto; font-family:${FONT_MONO}; font-size:9px; color:var(--wk-acc); flex-shrink:0; }

        /* Phase-1 skeletal placeholder (removed as each zone is built out) */
        .pkgwk .wk-skel { font-family:${FONT_SERIF}; font-style:italic; font-size:13px; color:var(--muted); line-height:1.6; }

        /* Materials-mode middle (ref .med / .edcard / .edpick) — the editor shell + empty state.
           The editor FORM (type picker, fields, footer) lands in Phase B. */
        .pkgwk .med { max-width:720px; }
        .pkgwk .med-lab { font-family:${FONT_MONO}; font-size:9.5px; letter-spacing:.1em; text-transform:uppercase; color:var(--wk-burg); display:flex; align-items:center; gap:9px; margin-bottom:16px; }
        .pkgwk .med-lab .dotp { width:9px; height:9px; border-radius:50%; background:var(--wk-burg); box-shadow:0 0 0 4px var(--wk-pulse); flex-shrink:0; }
        .pkgwk .edcard { background:var(--card); border:var(--bdw) solid var(--bd); border-radius:14px; overflow:hidden; box-shadow:0 12px 30px rgba(58,28,20,.11); }
        .pkgwk .edcard-h { padding:15px 22px; background:linear-gradient(135deg,var(--band-a),var(--band-b)); border-bottom:var(--bdw) solid var(--bd); display:flex; align-items:center; gap:10px; }
        .pkgwk .edcard-h h4 { font-family:${FONT_SERIF}; font-size:18px; font-weight:800; color:var(--hdrOn); }
        .pkgwk .edpick { display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; color:var(--muted); gap:9px; padding:70px 30px; }
        .pkgwk .edpick .mi { font-size:34px; opacity:.4; }
        .pkgwk .edpick .mt { font-family:${FONT_SERIF}; font-size:18px; color:var(--hdr); }
        .pkgwk .edpick .ms { font-size:12.5px; line-height:1.55; max-width:280px; }
        /* Editor form (ref .edcard-h .newbtn / .typepick / .flabel / .finput / .ftext / .ffile / .med-foot) */
        .pkgwk .edcard-h .newbtn { margin-left:auto; font-family:${FONT_MONO}; font-size:8.5px; text-transform:uppercase; color:var(--btnT); background:rgba(255,255,255,.6); border:1px solid var(--btnBd); border-radius:8px; padding:8px 12px; cursor:pointer; }
        .pkgwk .edcard-h .newbtn:hover { background:var(--btnH); }
        .pkgwk .edcard-b { padding:22px; }
        .pkgwk .typepick { display:flex; gap:9px; margin-bottom:18px; }
        .pkgwk .typepick button { flex:1; font-family:${FONT_MONO}; font-size:8.5px; text-transform:uppercase; border:1px solid var(--btnBd); background:var(--card); color:var(--muted); border-radius:9px; padding:12px 4px; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:6px; }
        .pkgwk .typepick button.on { border-color:var(--wk-burg); color:var(--wk-burg); background:var(--selBg); }
        .pkgwk .flabel { font-family:${FONT_MONO}; font-size:8px; letter-spacing:.12em; text-transform:uppercase; color:var(--muted); margin:16px 0 7px; }
        .pkgwk .flabel.first { margin-top:0; }
        .pkgwk .finput { width:100%; border:var(--bdw) solid var(--bd); border-radius:10px; padding:12px 14px; font-family:${FONT_SERIF}; font-size:16px; color:var(--ink); outline:none; background:var(--card); }
        .pkgwk .finput:focus { border-color:var(--wk-burg); }
        .pkgwk .ftext { width:100%; border:var(--bdw) solid var(--bd); border-radius:10px; padding:13px 14px; font-size:13.5px; line-height:1.65; color:var(--ink); outline:none; min-height:200px; resize:vertical; background:var(--card); font-family:${FONT_SANS}; }
        .pkgwk .ftext:focus { border-color:var(--wk-burg); }
        .pkgwk .ffile { display:flex; align-items:center; gap:9px; border:1.5px dashed var(--wk-dash); border-radius:10px; padding:12px 14px; color:var(--muted); font-size:12.5px; font-style:italic; }
        .pkgwk .ffile .soon { margin-left:auto; font-family:${FONT_MONO}; font-size:7.5px; letter-spacing:.08em; text-transform:uppercase; background:var(--tp); color:var(--gold); border-radius:5px; padding:3px 7px; font-style:normal; }
        .t-edn .pkgwk .ffile .soon { background:var(--selBg); color:var(--muted); }
        .pkgwk .med-foot { margin-top:20px; display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
        .pkgwk .med-foot .save { font-family:${FONT_SERIF}; font-size:16px; font-weight:700; color:var(--btnT); background:var(--btnBg); border:1px solid var(--btnBd); border-radius:11px; padding:13px 28px; cursor:pointer; }
        .pkgwk .med-foot .save:hover:not(:disabled) { background:var(--btnH); }
        .pkgwk .med-foot .save:disabled { opacity:.5; cursor:not-allowed; }
        .pkgwk .med-foot .del { margin-left:auto; font-family:${FONT_MONO}; font-size:8.5px; text-transform:uppercase; color:var(--muted); background:none; border:0; cursor:pointer; }
        .pkgwk .med-foot .del:hover { color:var(--wk-burg); }
        /* Delete orphan guard (warn-and-confirm — don't silently empty package slots). */
        .pkgwk .delwarn { margin-top:16px; border:var(--bdw) solid var(--bd); border-left:3px solid var(--wk-burg); border-radius:0 10px 10px 0; padding:14px 16px; background:var(--card); }
        .pkgwk .delwarn p { font-size:12.5px; color:var(--ink); line-height:1.55; }
        .pkgwk .delwarn .used { font-family:${FONT_MONO}; font-size:9px; color:var(--wk-burg); margin-top:6px; }
        .pkgwk .delwarn .row { display:flex; gap:12px; margin-top:12px; align-items:center; }
        .pkgwk .delwarn .yes { font-family:${FONT_MONO}; font-size:9px; letter-spacing:.06em; text-transform:uppercase; color:#fff; background:var(--wk-burg); border:0; border-radius:8px; padding:9px 14px; cursor:pointer; }
        .pkgwk .delwarn .no { font-family:${FONT_MONO}; font-size:9px; text-transform:uppercase; color:var(--muted); background:none; border:0; cursor:pointer; }
        @media (max-width: 1040px) { .pkgwk .wk-windows { flex-direction:column; } .pkgwk .wk-analytics { width:auto; } }
        @media (max-width: 720px) { .pkgwk .wk-body { flex-direction:column; } .pkgwk .wk-palette { width:auto; border-right:0; border-bottom:var(--bdw) solid var(--bd); } }
      `}</style>

      <div className="wk-crumb"><span className="root">Builder</span><span className="sep">/</span><span className="cur">{mode === "materials" ? "Materials" : "Packages"}</span></div>
      <div className="wk-windows">
        {/* WORKSHOP window */}
        <section className="wk-win wk-workshop">
          <div className="wk-h">
            <span className="wk-ri">{toolIcon}</span><h3>Workshop</h3>
            <span className="wk-tag">build &amp; assemble</span>
            {onStartTour && <button type="button" className="wk-help" onClick={onStartTour} aria-label="Show me around" title="Show me around">?</button>}
          </div>
          <div className="wk-body">
            <div className="wk-palette" id="tgt-palette">
              <div className="pal-toph">
                <span className="pl">Your materials</span>
                <span className={`em${pulseAddMaterials && versions.length === 0 && mode !== "materials" ? " pulse" : ""}`} id="tgt-editmat" role="button" tabIndex={0} onClick={() => { onDismissPulse?.(); enterMode(mode === "materials" ? "packages" : "materials"); }} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onDismissPulse?.(); enterMode(mode === "materials" ? "packages" : "materials"); } }}>
                  {mode === "materials" ? "✓ Done" : versions.length === 0 ? "＋ Add materials" : "Edit materials →"}
                </span>
              </div>
              {versions.length === 0 && (
                <div className="pal-teach">No materials yet — hit <b>Add materials</b> to write your first letter, synopsis or pages.</div>
              )}
              {BUILDER_TYPES.map((t) => {
                const items = versions.filter((v) => v.componentType === t);
                return (
                  <div key={t} className="palgroup">
                    <div className="palgroup-h"><span className="g"><TypeGlyph type={t} size={13} /></span>{TYPE_META[t].plural}</div>
                    {items.map((v) => {
                      // Packages mode: drag / click / Enter fills the active slot. Materials mode: click selects
                      // for editing (no drag, grip hidden, "edit ›" affordance, selected chip ringed).
                      const useMat = () => (mode === "materials" ? selectMat(v.id) : fillSlot(t, v.id));
                      return (
                        <div
                          key={v.id}
                          className={`chip${dragMat === v.id ? " dragging" : ""}${mode === "materials" && selMat === v.id ? " sel" : ""}`}
                          draggable={mode === "packages"}
                          data-mat={v.id}
                          role="button"
                          tabIndex={0}
                          aria-label={mode === "materials" ? `Edit ${v.versionName}` : `Add ${v.versionName} to the active package`}
                          onClick={useMat}
                          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); useMat(); } }}
                          onDragStart={mode === "packages" ? (e) => { setDragMat(v.id); e.dataTransfer.effectAllowed = "copy"; } : undefined}
                          onDragEnd={mode === "packages" ? () => { setDragMat(null); setOverSlot(null); } : undefined}
                        >
                          <span className="cg"><TypeGlyph type={t} size={14} /></span>
                          <div className="cmid">
                            <div className="cn">{v.versionName}</div>
                            {v.fileName && <div className="cf">{v.fileName}</div>}
                          </div>
                          <span className="edita" aria-hidden="true">edit ›</span>
                          <span className="grip" aria-hidden="true">⋮⋮</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            <div className="wk-building">
              {mode === "packages" ? (
                versions.length === 0 ? (
                  <div className="mid-empty">
                    <svg className="me-illo" viewBox="0 0 120 96" fill="none" stroke="var(--wk-burg)" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M34 20h38a2 2 0 012 2v50a2 2 0 01-2 2H34a2 2 0 01-2-2V22a2 2 0 012-2z" />
                      <path d="M40 32h26M40 40h26M40 48h18" opacity=".45" />
                      <path d="M84 34l10 10L64 74l-13 3 3-13z" />
                      <path d="M81 37l10 10" />
                      <path d="M97 22c3 2 4 6 2 8" stroke="var(--wk-gold)" />
                      <path d="M102 17c1 1 1 3 0 4" stroke="var(--wk-gold)" />
                    </svg>
                    <div className="me-title">First, add your materials</div>
                    <div className="me-sub">Write or paste your query letter, synopsis and sample pages. Once they&rsquo;re in your library, you&rsquo;ll build them into packages right here.</div>
                    <button type="button" className="me-cta" onClick={() => { onDismissPulse?.(); enterMode("materials"); }}>＋ Add materials</button>
                  </div>
                ) : (
                <>
              <div className="bench-lab"><span className="dotp" />Active package — drag materials from the left, or click to add</div>
              {active && activeId ? (
                <div className="pkg" id="tgt-bench">
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
                </>
                )
              ) : (
                <div className="med">
                  <div className="med-lab"><span className="dotp" />Editing materials — pick from the left, or start new</div>
                  <div className="edcard">
                    <div className="edcard-h">
                      <h4>{selMat ? (versionById(selMat)?.versionName || "Material") : newType ? "New material" : "Materials"}</h4>
                      <button type="button" className="newbtn" onClick={startNew}>＋ New material</button>
                    </div>
                    {selMat || newType ? (
                      (() => {
                        const editType = selMat ? versionById(selMat)?.componentType ?? BUILDER_TYPES[0] : newType ?? BUILDER_TYPES[0];
                        const noun = TYPE_META[editType].label.toLowerCase();
                        const file = selMat ? versionById(selMat)?.fileName : undefined;
                        return (
                          <div className="edcard-b">
                            {newType && !selMat && (
                              <div className="typepick">
                                {BUILDER_TYPES.map((t) => (
                                  <button key={t} type="button" className={newType === t ? "on" : ""} onClick={() => setNewType(t)}>
                                    <TypeGlyph type={t} size={15} /><span>{TYPE_META[t].label}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                            <div className="flabel first">Title</div>
                            <input className="finput" value={edName} onChange={(e) => setEdName(e.target.value)} placeholder={`Name this ${noun}…`} aria-label="Material title" />
                            <div className="flabel">The text</div>
                            <textarea className="ftext" value={edText} onChange={(e) => setEdText(e.target.value)} placeholder={`Paste or write the full ${noun}…`} aria-label="Material text" />
                            <div className="flabel">Attached file</div>
                            <div className="ffile" aria-disabled="true" title="File attachments are coming soon">{fileIcon}{file || "Upload a file"}<span className="soon">Coming soon</span></div>
                            <div className="med-foot">
                              <button type="button" className="save" disabled={!canSaveMat} title={!canSaveMat ? "Give the material a title first" : undefined} onClick={saveMat}>{selMat ? "Save changes" : "Create material"}</button>
                              {selMat && <button type="button" className="del" onClick={requestDelete}>Delete material</button>}
                            </div>
                            {pendingDelete && (
                              <div className="delwarn">
                                <p>{pendingDelete.usedIn.length ? "This material is used in a package — deleting it will empty those slots." : "Delete this material? This can’t be undone."}</p>
                                {pendingDelete.usedIn.length > 0 && <div className="used">USED IN: {pendingDelete.usedIn.join(" · ")}</div>}
                                <div className="row">
                                  <button type="button" className="yes" onClick={confirmDelete}>{pendingDelete.usedIn.length ? "Delete anyway" : "Delete"}</button>
                                  <button type="button" className="no" onClick={() => setPendingDelete(null)}>Cancel</button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()
                    ) : (
                      <div className="edpick"><div className="mi" aria-hidden="true">✎</div><div className="mt">Edit your materials</div><div className="ms">Pick a material from the list on the left, or start a new one.</div></div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ANALYTICS window — follows the mode: package stats while building, material stats while editing. */}
        <section className="wk-win wk-analytics" id="tgt-analytics">
          <div className="wk-h"><span className="wk-ri">{mode === "materials" ? materialIcon : chartIcon}</span><h3>{mode === "materials" ? "Material analytics" : "Package analytics"}</h3></div>
          {mode === "packages" && packages.length > 0 && (
            <div className="wk-scope">
              <button type="button" className={anScope === "package" ? "on" : ""} onClick={() => setAnScope("package")}>This package</button>
              <button type="button" className={anScope === "all" ? "on" : ""} onClick={() => setAnScope("all")}>All packages</button>
            </div>
          )}
          <div className="wk-anbody">
            {mode === "materials" ? (
              renderMaterialAnalytics()
            ) : packages.length === 0 ? (
              <div className="an-empty">
                <svg className="ae-illo" viewBox="0 0 110 84" fill="none" stroke="var(--wk-acc)" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M18 70V44M38 70V28M58 70V52M78 70V36" opacity=".4" strokeDasharray="3 5" />
                  <path d="M12 70h86" />
                  <path d="M14 58l20-16 18 12 26-22" />
                  <path d="M70 32h8v8" />
                  <circle cx="34" cy="42" r="1.6" fill="var(--wk-acc)" />
                </svg>
                <div className="ae-title">Nothing to measure yet</div>
                <div className="ae-sub">Build a package and attach it to a query in the Queries Hub — its results appear here, and you&rsquo;ll see which version wins requests.</div>
              </div>
            ) : anScope === "package" ? (
              renderThisPackage()
            ) : (
              renderAllPackages()
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
