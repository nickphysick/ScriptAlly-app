/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * WorkshopTab — the Workshop half of the two-tab Package Workshop (ref
 * design-refs/scriptally-packages-twotab.html): a 258px materials sidebar beside a grid of package
 * cards. Replaces the shipped palette-plus-bench-plus-grid layout; every BUILD behaviour it had is
 * preserved — drag-and-drop, click-to-add, the keyboard path, dirty in-memory drafts with
 * save/discard, the `""` unfilled-slot sentinel, and the letter-required rule that mirrors
 * `isValidPackage` needing all three slot keys present.
 *
 * WHICH CARD IS EDITABLE (a deliberate, flagged consequence of porting the ref faithfully): the ref
 * gives exactly one card the editing affordances, and it is the ACTIVE one. So the edit target is —
 * in order — an unsaved new draft, else the manuscript's stored active package, else the first
 * package. Every other card is read-only and flips to its results (P4), with "Make active" on the
 * back. Editing a different package is therefore one click ("Make active"), not zero as before.
 *
 * The ACTIVE treatment — solid burgundy pill + double ink outline + deeper offset — renders ONLY for
 * the genuinely stored active package (`Manuscript.activePackageId`), never merely for whatever is
 * being edited, so the card never claims a status the data doesn't hold.
 */
import React, { useEffect, useRef, useState } from "react";
import { ManuscriptVersion, SubmissionPackage, Query, ComponentType } from "../../types";
import { TypeGlyph } from "./TypeGlyph";
import { TYPE_META, BUILDER_TYPES, SlotSelection, emptySelection, selectionFromPackage } from "./typeMeta";
import {
  isSlotFilled, UNFILLED_SLOT, reachedFull, isRequest, packagesUsingVersion,
  materialUsage, materialUsageLine, funnelStages, medianReplyDays, daysToWeeks, formatRate,
} from "../../lib/packageMetrics";
import { PackageSaveFields } from "./PackageWorkshop";

/** An in-memory draft (not persisted until Save). Keyed by package id, or a temp id when new. */
interface Draft { name: string; sel: SlotSelection; isNew: boolean; dirty: boolean }

const slotNoun = (t: ComponentType) => TYPE_META[t].label.toLowerCase();
const toFields = (name: string, sel: SlotSelection): PackageSaveFields => ({
  packageName: name.trim(),
  queryLetterVersionId: sel[ComponentType.QUERY_LETTER] || UNFILLED_SLOT,
  synopsisVersionId: sel[ComponentType.SYNOPSIS] || UNFILLED_SLOT,
  samplePagesVersionId: sel[ComponentType.SAMPLE_PAGES] || UNFILLED_SLOT,
});
const sameSel = (a: SlotSelection, b: SlotSelection) => BUILDER_TYPES.every((t) => a[t] === b[t]);

/** The band's flip control — a refresh arc going to results, a return arrow coming back. */
const spinGlyph = (
  <svg viewBox="0 0 24 24" width={11} height={11} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 12a9 9 0 019-9c2.5 0 4.8 1 6.4 2.6L21 8" /><path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 01-9 9c-2.5 0-4.8-1-6.4-2.6L3 16" /><path d="M3 21v-5h5" />
  </svg>
);
const backGlyph = (
  <svg viewBox="0 0 24 24" width={11} height={11} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 14 4 9l5-5" /><path d="M4 9h10a6 6 0 010 12h-3" />
  </svg>
);

export interface WorkshopTabProps {
  versions: ManuscriptVersion[];
  packages: SubmissionPackage[];
  queries: Query[];
  /** The manuscript's stored active package id (resolved by the host), or null. */
  activePackageId: string | null;
  onCreateVersion: (type: ComponentType, name: string, contentDraft: string) => Promise<string | undefined> | string | undefined;
  onUpdateVersion: (id: string, fields: { versionName: string; contentDraft: string }) => void;
  onDeleteVersion: (id: string) => void;
  onSavePackage: (baseId: string | null, fields: PackageSaveFields) => Promise<string | undefined> | string | undefined;
  /** Promote a package to the manuscript's active one (host → setActivePackage). */
  onMakeActive: (packageId: string) => void;
  /** Bumped by the header's "＋ New package" button — each change opens a fresh draft. */
  newPackageSignal?: number;
  /** FR4: pulse the Edit-materials affordance after the tour ends with no materials yet. */
  pulseAddMaterials?: boolean;
  onDismissPulse?: () => void;
  /** Render a card's results face (P4 supplies the flip; absent → front faces only). */
  renderBack?: (pkg: { id: string; name: string; sent: number }) => React.ReactNode;
}

export const WorkshopTab: React.FC<WorkshopTabProps> = ({
  versions, packages, queries, activePackageId,
  onCreateVersion, onUpdateVersion, onDeleteVersion, onSavePackage, onMakeActive,
  newPackageSignal, pulseAddMaterials, onDismissPulse,
}) => {
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [editId, setEditId] = useState<string | null>(null);
  const [dragMat, setDragMat] = useState<string | null>(null);
  const [overSlot, setOverSlot] = useState<ComponentType | null>(null);
  const [flash, setFlash] = useState<ComponentType | null>(null);
  // Which cards are showing their results face. A Set, so several can be flipped at once.
  const [flipped, setFlipped] = useState<Set<string>>(new Set());
  const toggleFlip = (id: string) => setFlipped((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  // Materials editing lives behind "Edit materials →" — the main column swaps to the editor.
  const [matMode, setMatMode] = useState(false);
  const [selMat, setSelMat] = useState<string | null>(null);
  const [newType, setNewType] = useState<ComponentType | null>(null);
  const [edName, setEdName] = useState("");
  const [edText, setEdText] = useState("");
  const [pendingDelete, setPendingDelete] = useState<{ id: string; usedIn: string[] } | null>(null);

  const versionById = (id: string) => versions.find((v) => v.id === id);
  const baseOf = (id: string): Draft | null => {
    const p = packages.find((x) => x.id === id);
    return p ? { name: p.packageName, sel: selectionFromPackage(p), isNew: false, dirty: false } : null;
  };
  const effOf = (id: string | null): Draft | null => (id ? drafts[id] ?? baseOf(id) : null);

  const newDraftIds = Object.keys(drafts).filter((id) => drafts[id].isNew);
  // The edit target: an unsaved draft first (you just made it), else the stored active, else the first.
  const target = editId && (drafts[editId] || packages.some((p) => p.id === editId))
    ? editId
    : newDraftIds[0] ?? activePackageId ?? packages[0]?.id ?? null;
  const targetDraft = effOf(target);

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

  // The header's "＋ New package" — a signal rather than a callback so the host needn't hold the
  // state. Only a CHANGE opens a draft: the seen-ref starts at the incoming value, so mounting with a
  // perfectly ordinary signal of 0 doesn't conjure a phantom untitled package before you've clicked
  // anything (an effect on a defined value fires on mount).
  const seenSignal = useRef(newPackageSignal);
  useEffect(() => {
    if (newPackageSignal === undefined || newPackageSignal === seenSignal.current) return;
    seenSignal.current = newPackageSignal;
    newPackage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newPackageSignal]);

  useEffect(() => {
    if (selMat) { const v = versionById(selMat); setEdName(v?.versionName ?? ""); setEdText(v?.contentDraft ?? ""); }
    else if (newType) { setEdName(""); setEdText(""); }
    setPendingDelete(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selMat, newType]);

  // ── Draft editing ─────────────────────────────────────────────────────────
  const editTarget = (mut: (d: Draft) => Draft) => {
    if (!target) return;
    setDrafts((prev) => {
      const cur = prev[target] ?? baseOf(target) ?? { name: "", sel: emptySelection(), isNew: true, dirty: false };
      return { ...prev, [target]: { ...mut(cur), dirty: true } };
    });
  };
  const fillSlot = (type: ComponentType, matId: string) => { editTarget((d) => ({ ...d, sel: { ...d.sel, [type]: matId } })); setFlash(type); };
  const clearSlot = (type: ComponentType) => editTarget((d) => ({ ...d, sel: { ...d.sel, [type]: UNFILLED_SLOT } }));
  const isDirty = !!(target && drafts[target]?.dirty);
  // Save needs a name + a letter whose version still exists (mirrors isValidPackage's three keys).
  const canSave = !!targetDraft && targetDraft.name.trim().length > 0
    && isSlotFilled(targetDraft.sel[ComponentType.QUERY_LETTER])
    && !!versionById(targetDraft.sel[ComponentType.QUERY_LETTER]);

  const save = async () => {
    if (!targetDraft || !canSave || !target) return;
    const baseId = drafts[target]?.isNew ? null : target;
    const newId = await onSavePackage(baseId, toFields(targetDraft.name, targetDraft.sel));
    setDrafts((prev) => { const n = { ...prev }; delete n[target]; return n; });
    if (baseId === null && typeof newId === "string") setEditId(newId);
  };
  const discard = () => {
    if (!target) return;
    const wasNew = drafts[target]?.isNew;
    setDrafts((prev) => { const n = { ...prev }; delete n[target]; return n; });
    if (wasNew) setEditId(activePackageId ?? packages[0]?.id ?? null);
  };
  const duplicate = (d: Draft) => {
    const id = `wk-new-${Date.now()}`;
    setDrafts((prev) => ({ ...prev, [id]: { name: `Copy of ${d.name}`, sel: { ...d.sel }, isNew: true, dirty: true } }));
    setEditId(id);
  };
  const newPackage = () => {
    const id = `wk-new-${Date.now()}`;
    setDrafts((prev) => ({ ...prev, [id]: { name: "", sel: emptySelection(), isNew: true, dirty: true } }));
    setEditId(id);
    setMatMode(false);
  };

  // ── Materials editing ─────────────────────────────────────────────────────
  const enterMat = (on: boolean) => { setMatMode(on); setDragMat(null); setOverSlot(null); if (!on) { setSelMat(null); setNewType(null); } };
  const canSaveMat = edName.trim().length > 0;
  const saveMat = async () => {
    if (!canSaveMat) return;
    if (selMat) onUpdateVersion(selMat, { versionName: edName.trim(), contentDraft: edText });
    else if (newType) {
      const id = await onCreateVersion(newType, edName.trim(), edText);
      if (typeof id === "string") { setNewType(null); setSelMat(id); }
    }
  };
  const confirmDelete = () => {
    if (!pendingDelete) return;
    onDeleteVersion(pendingDelete.id);
    setPendingDelete(null); setSelMat(null); setNewType(null);
  };

  // ── Sidebar ───────────────────────────────────────────────────────────────
  const sidebar = (
    <div className="pkgw-side" id="tgt-palette">
      <div className="shead">
        <span className="sl">Your materials</span>
        <button
          type="button"
          className={`edit${pulseAddMaterials && versions.length === 0 && !matMode ? " pulse" : ""}`}
          id="tgt-editmat"
          onClick={() => { onDismissPulse?.(); enterMat(!matMode); }}
        >
          {matMode ? "✓ Done" : versions.length === 0 ? "＋ Add materials" : "Edit materials →"}
        </button>
      </div>
      {versions.length === 0 && (
        <div className="pkgw-teach">No materials yet — <b>Add materials</b> to write your first letter, synopsis or sample pages.</div>
      )}
      {BUILDER_TYPES.map((t) => {
        const items = versions.filter((v) => v.componentType === t);
        if (!items.length && versions.length > 0 && !matMode) return null;
        return (
          <div key={t} className="pkgw-mgrp">
            <div className="sl"><i><TypeGlyph type={t} size={11} /></i>{TYPE_META[t].plural}</div>
            {items.map((v) => {
              const line = materialUsageLine(materialUsage(v.id, packages, queries));
              const use = () => (matMode ? (setNewType(null), setSelMat(v.id)) : fillSlot(t, v.id));
              return (
                <button
                  key={v.id}
                  type="button"
                  className={`pkgw-mchip${dragMat === v.id ? " dragging" : ""}${matMode && selMat === v.id ? " sel" : ""}`}
                  draggable={!matMode}
                  aria-label={matMode ? `Edit ${v.versionName}` : `Add ${v.versionName} to ${targetDraft?.name?.trim() || "the package you're building"}`}
                  onClick={use}
                  onDragStart={!matMode ? (e) => { setDragMat(v.id); e.dataTransfer.effectAllowed = "copy"; } : undefined}
                  onDragEnd={!matMode ? () => { setDragMat(null); setOverSlot(null); } : undefined}
                >
                  <span>
                    <span className="nm2">{v.versionName}</span>
                    <span className={`use${line.hot ? " hot" : ""}`} style={{ display: "block" }}>{line.text}</span>
                  </span>
                  <span className="grip" aria-hidden="true">⋮⋮</span>
                </button>
              );
            })}
            {matMode && (
              <button type="button" className="pkgw-mnew" onClick={() => { setSelMat(null); setNewType(t); }}>
                ＋ New {slotNoun(t)}
              </button>
            )}
          </div>
        );
      })}
      {!matMode && versions.length > 0 && (
        <button type="button" className="pkgw-mnew" onClick={() => { onDismissPulse?.(); enterMat(true); }}>＋ New material</button>
      )}
    </div>
  );

  // ── One package card: front (build) + back (results), on a 3D rotor ──────
  const card = (id: string, d: Draft) => {
    const isTarget = id === target;
    const isActive = id === activePackageId;
    const isNew = !!drafts[id]?.isNew;
    const mine = isNew ? [] : queries.filter((q) => q.packageId === id);
    const sent = mine.length;
    const fulls = mine.filter(reachedFull).length;
    const reqs = mine.filter(isRequest).length;
    const bandTone = isActive || sent > 0 ? "sage" : "tan";
    const pill = isActive ? "Active" : sent > 0 ? `Sent ×${sent}` : "Draft";
    const reqLine = fulls > 0 ? `${fulls} FULL REQ ✓` : reqs > 0 ? `${reqs} REQUEST${reqs === 1 ? "" : "S"} ✓` : null;

    const isFlipped = flipped.has(id);
    const name = d.name.trim() || "Untitled package";
    // The editable card must NOT flip on body clicks — its rows are an editing surface — so only its
    // band button flips it. Every read-only card flips on click, per the ref.
    const faceTap = isTarget ? undefined : () => toggleFlip(id);

    return (
      <div key={id} className={`pkgw-fc${isActive ? " active" : ""}${isFlipped ? " flip" : ""}`} id={isTarget ? "tgt-bench" : undefined}>
        <div className="pkgw-fci">
          {/* front — build face */}
          <div className={`pkgw-face front${faceTap ? " tap" : ""}`} onClick={faceTap} inert={isFlipped ? true : undefined}>
            <div className={`pkgw-band ${bandTone}`}>
              <span className={`pkgw-pill${isActive ? " solid" : ""}`}>{pill}</span>
              {reqLine && <span className="pkgw-req">{reqLine}</span>}
              {isTarget && (
                <button
                  type="button"
                  className="pkgw-spin"
                  aria-label={`Show results for ${name}`}
                  onClick={(e) => { e.stopPropagation(); toggleFlip(id); }}
                >
                  {spinGlyph}
                </button>
              )}
            </div>
            <div className="pkgw-fbd">
              {isTarget ? (
                <input
                  className="nm"
                  value={d.name}
                  placeholder="Untitled package"
                  aria-label="Package name"
                  onChange={(e) => editTarget((x) => ({ ...x, name: e.target.value }))}
                />
              ) : (
                <div className="nm">{d.name || "Untitled package"}</div>
              )}
              <div className="pkgw-rows">
                {BUILDER_TYPES.map((t) => {
                  const vid = d.sel[t];
                  const v = isSlotFilled(vid) ? versionById(vid) : undefined;
                  const canDrop = isTarget && dragMat ? versionById(dragMat)?.componentType === t : false;
                  const emptyText = t === ComponentType.QUERY_LETTER
                    ? (isTarget ? "Add a query letter — required" : "No letter yet — required")
                    : (isTarget ? `Add ${slotNoun(t)}…` : `No ${slotNoun(t)}`);
                  return (
                    <div
                      key={t}
                      className={`pkgw-mrow${v ? "" : " dim"}${overSlot === t && isTarget ? " over" : ""}${flash === t && v && isTarget ? " flash" : ""}`}
                      onDragOver={(e) => { if (canDrop) { e.preventDefault(); setOverSlot(t); } }}
                      onDragLeave={() => setOverSlot((s) => (s === t ? null : s))}
                      onDrop={(e) => { if (canDrop && dragMat) { e.preventDefault(); fillSlot(t, dragMat); setOverSlot(null); } }}
                      onAnimationEnd={() => setFlash((f) => (f === t ? null : f))}
                    >
                      <span className="g3"><TypeGlyph type={t} size={11} /></span>
                      {v ? v.versionName : emptyText}
                      {v && isTarget && (
                        <button type="button" className="rm" aria-label={`Remove ${slotNoun(t)}`} onClick={() => clearSlot(t)}>✕</button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="pkgw-ffoot">
              {isTarget ? (
                <>
                  <span>{sent > 0 ? `SENT ×${sent}` : "NOT SENT YET"}</span>
                  {isDirty ? (
                    <>
                      <button type="button" className="fa2" disabled={!canSave} title={!canSave ? "Add a name and a query letter to save" : undefined} onClick={save}>✓ Save</button>
                      <button type="button" className="fa2" onClick={discard}>Discard</button>
                    </>
                  ) : (
                    <button type="button" className="fa2" onClick={() => duplicate(d)}>⧉ Duplicate</button>
                  )}
                </>
              ) : (
                /* The ref's foot line IS the affordance on a read-only card, so it is a real button:
                   the whole face stays clickable by mouse, and this is what the keyboard reaches. */
                <button type="button" className="fa2" style={{ marginLeft: 0, letterSpacing: ".06em", fontSize: 7.5, fontFamily: "'JetBrains Mono', monospace", color: "inherit" }} aria-label={`Show results for ${name}`} onClick={(e) => { e.stopPropagation(); toggleFlip(id); }}>
                  {sent > 0 ? "TAP TO SEE RESULTS ↻" : "NOT SENT YET ↻"}
                </button>
              )}
            </div>
          </div>

          {/* back — results face */}
          <div className={`pkgw-face back${faceTap ? " tap" : ""}`} onClick={faceTap} inert={isFlipped ? undefined : true}>
            <div className="pkgw-band tan">
              <span className="pkgw-pill">Results</span>
              <button
                type="button"
                className="pkgw-spin"
                aria-label={`Back to ${name}`}
                onClick={(e) => { e.stopPropagation(); toggleFlip(id); }}
              >
                {backGlyph}
              </button>
            </div>
            <div className="pkgw-fbd">
              <div className="nm">{name}</div>
              {sent === 0 ? (
                <div className="note" style={{ marginTop: 14 }}>Nothing to measure yet — add a letter and send it with a query.</div>
              ) : (
                <>
                  {(() => {
                    const f = funnelStages(mine);
                    const med = daysToWeeks(medianReplyDays(id, queries));
                    return (
                      <>
                        <div className="pkgw-hero3">
                          <span className="big">{formatRate(f.replyRate)}</span>
                          <span className="lb"><b>of agents replied</b><span>from {sent} sent</span></span>
                        </div>
                        <div style={{ marginTop: 9 }}>
                          <div className="pkgw-srow">Replies<b>{f.replied} of {sent}</b></div>
                          {med && <div className="pkgw-srow">Median reply<b>{med}</b></div>}
                          <div className="pkgw-srow">Requests<b className={f.requests > 0 ? "gold" : undefined}>{f.requests > 0 ? `${f.requests} ★` : "—"}</b></div>
                        </div>
                      </>
                    );
                  })()}
                </>
              )}
              {!isActive && (
                <button
                  type="button"
                  className="pkgw-mkact"
                  onClick={(e) => { e.stopPropagation(); onMakeActive(id); }}
                  disabled={!!drafts[id]?.isNew}
                  title={drafts[id]?.isNew ? "Save this package first" : undefined}
                >
                  Make active
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── Materials editor (main column, behind "Edit materials →") ─────────────
  const editorPanel = () => {
    const editing = !!selMat;
    if (!editing && !newType) {
      return (
        <div className="pkgw-med">
          <div className="medh">Your materials library</div>
          <div className="medsub">Pick a material on the left to edit it, or start a new one.</div>
          <div className="pkgw-med-empty note">Every package is built from these pieces — write them once, then mix them into as many packages as you like.</div>
        </div>
      );
    }
    const usedIn = selMat ? packagesUsingVersion(selMat, packages).map((p) => p.packageName) : [];
    return (
      <div className="pkgw-med">
        <div className="medh">{editing ? "Edit material" : `New ${slotNoun(newType!)}`}</div>
        <div className="medsub">{editing ? "Changes reach every package this material is in." : "It joins your library, ready to drop into any package."}</div>
        {!editing && (
          <div className="types">
            {BUILDER_TYPES.map((t) => (
              <button key={t} type="button" className={`ty${newType === t ? " on" : ""}`} onClick={() => setNewType(t)}>
                <TypeGlyph type={t} size={13} />{TYPE_META[t].label}
              </button>
            ))}
          </div>
        )}
        <label>
          <span className="lb">Title</span>
          <input type="text" value={edName} onChange={(e) => setEdName(e.target.value)} placeholder="Character-led letter" />
        </label>
        <label>
          <span className="lb">The text</span>
          <textarea value={edText} onChange={(e) => setEdText(e.target.value)} placeholder="Paste or write it here…" />
        </label>
        <div className="medacts">
          <button type="button" className="pkgw-btn pkgw-btn--primary" disabled={!canSaveMat} onClick={saveMat}>
            {editing ? "Save changes" : "Create material"}
          </button>
          {editing && (
            <button type="button" className="pkgw-btn" onClick={() => setPendingDelete({ id: selMat!, usedIn })}>Delete</button>
          )}
        </div>
        {pendingDelete && (
          <div className="warn">
            {pendingDelete.usedIn.length > 0 ? (
              <>Deleting this leaves <b>{pendingDelete.usedIn.join(", ")}</b> with an empty slot. Delete it anyway?</>
            ) : (
              <>Delete this material? It isn&rsquo;t in any package.</>
            )}
            <div className="medacts" style={{ marginTop: 10 }}>
              <button type="button" className="pkgw-btn pkgw-btn--primary" onClick={confirmDelete}>Delete it</button>
              <button type="button" className="pkgw-btn" onClick={() => setPendingDelete(null)}>Keep it</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const cardIds = [...packages.map((p) => p.id), ...newDraftIds];

  return (
    <div className="pkgw-wrap2">
      {sidebar}
      <div className="pkgw-main">
        {matMode ? editorPanel() : (
          <div className="pkgw-pgrid">
            {cardIds.map((id) => { const d = effOf(id); return d ? card(id, d) : null; })}
            <button type="button" className="pkgw-newp" onClick={newPackage}>＋ New package</button>
          </div>
        )}
      </div>
    </div>
  );
};
