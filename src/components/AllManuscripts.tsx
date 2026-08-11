/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Manuscripts overview — the sage plate card. Reference: design-refs/manuscripts-plate.html,
 * treatment B. Built across six phases; run report in reports/manuscripts-plate.md.
 *
 * ONE CARD, not a plate per manuscript: a sage plateband carrying the selected manuscript's
 * identity and three derived figures, a tab row beneath it, and three panes — illustrated Details
 * tiles, the Comparable titles shelf, and Materials on file. A shelf switcher above the card picks
 * the subject when there is more than one manuscript.
 *
 * ⚠️ EVERYTHING ABOVE THE CARD BELONGS TO THE HEADER STREAM. `PageHeader` and `.msv1` are theirs
 * (a7b5d54); this file's business starts at the switcher.
 *
 * ⚠️ SELECTION AND TAB STATE LIVE ABOVE THE CARD so switching manuscripts swaps the plate and panes
 * without remounting it — which is what lets the chosen tab survive the switch. Tab state is LOCAL:
 * no route, no URL param, no persistence.
 *
 * The lifecycle flows (reversible shelve with undo, guarded delete via the cascade manifest) and the
 * edit modal carry over unchanged from the plate list; comps are deliberately absent from the modal.
 */
import React, { useState } from "react";
import { useScriptAllyDb } from "../lib/db";
import { destroyManifest } from "../lib/cascade";
import { ConfirmDestroy } from "./ConfirmDestroy";
import { Manuscript, ManuscriptStatus } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { PageHeader } from "./shell/PageHeader";
import { Plus, Pencil, MoreHorizontal, Archive, Trash2, X, Check } from "lucide-react";
import { isShelvedPresentation } from "../lib/manuscriptPage";
import { manuscriptComps, withCompRemoved } from "../lib/comps";
import { isProUser, scoutLive } from "../lib/suggestComps";
import { plateStats } from "../lib/manuscriptPlate";
import { outInTheWorld, comparableTitlesTile, onTheShelf, submissionMaterials } from "../lib/manuscriptTiles";
import { ManuscriptPlate } from "./manuscripts/ManuscriptPlate";
import { ManuscriptTabs, DEFAULT_MANUSCRIPT_TAB, ManuscriptTabKey } from "./manuscripts/ManuscriptTabs";
import { ManuscriptDetailTiles } from "./manuscripts/ManuscriptDetailTiles";
import { ManuscriptCompsPane } from "./manuscripts/ManuscriptCompsPane";
import { ManuscriptPackagesPane } from "./manuscripts/ManuscriptPackagesPane";
import "./manuscripts/manuscripts.css";

/** Shared with the comps + packages sub-pages — the section's single active-manuscript pointer. */
const ACTIVE_MS_KEY = "scriptally_active_manuscript_id";

interface AllManuscriptsProps {
  searchQuery?: string;
  /** App's handleNavigate bridge — opts.manuscriptId preselects the Log-a-Query manuscript (additive). */
  onNavigate?: (tab: string, subPageName?: string, opts?: { manuscriptId?: string }) => void;
}

export const AllManuscripts: React.FC<AllManuscriptsProps> = ({ onNavigate }) => {
  const { currentUser, manuscripts, queries, packages, versions, activities, taskFlags, updateManuscript, deleteManuscript, setManuscriptShelved } =
    useScriptAllyDb();

  /**
   * ⚠️ SELECTION AND TAB LIVE HERE, ABOVE THE CARD, so switching manuscripts swaps the plate and
   * panes WITHOUT remounting the card — and the chosen tab therefore survives the switch. Seeded
   * from the shared active-manuscript pointer the comps and packages sub-pages already read.
   */
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    try { return localStorage.getItem(ACTIVE_MS_KEY); } catch { return null; }
  });
  const [tab, setTab] = useState<ManuscriptTabKey>(DEFAULT_MANUSCRIPT_TAB);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [deleteModalMs, setDeleteModalMs] = useState<Manuscript | null>(null);
  const [undoToast, setUndoToast] = useState<{ msg: string; undo: () => void } | null>(null);
  const [editingMs, setEditingMs] = useState<Manuscript | null>(null);

  // Plates: active books first, shelved sink to the end.
  const ordered = [...manuscripts]
    .sort((a, b) => Number(isShelvedPresentation(a)) - Number(isShelvedPresentation(b)));

  if (!currentUser) return null;

  /** The card's subject. A stale pointer (deleted manuscript) falls back to the first plate. */
  const selected = ordered.find((m) => m.id === selectedId) ?? ordered[0] ?? null;
  const selectMs = (id: string) => {
    setSelectedId(id);
    try { localStorage.setItem(ACTIVE_MS_KEY, id); } catch { /* private mode — selection is session-only */ }
  };

  // ── lifecycle (carried over: reversible shelve flag-flip with Undo; deferred delete) ──
  const toggleShelved = async (ms: Manuscript) => {
    setMenuOpen(false);
    const next = !ms.shelved;
    await setManuscriptShelved(ms.id, next);
    if (next) {
      setUndoToast({
        msg: `“${ms.title}” shelved — kept, just not suggested`,
        undo: () => { void setManuscriptShelved(ms.id, false); setUndoToast(null); },
      });
      setTimeout(() => setUndoToast((t) => (t && t.msg.startsWith(`“${ms.title}”`) ? null : t)), 6000);
    } else {
      setToastMessage(`“${ms.title}” back in play`);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // 6A: type-to-confirm IS the safety — the delete runs immediately on confirm; no undo window
  // (the guard's dialog says so). The cascade + durable log live in db.deleteManuscript.
  const confirmDestroyMs = async (ms: Manuscript) => {
    setMenuOpen(false);
    await deleteManuscript(ms.id);
    setDeleteModalMs(null);
    setToastMessage(`“${ms.title}” deleted`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // ── edit modal (carried over; comps deliberately absent — the shelf sub-page is the single home) ──
  const startEditMs = (m: Manuscript) => { setMenuOpen(false); setEditingMs({ ...m }); };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMs) return;
    try {
      await updateManuscript(editingMs.id, {
        title: editingMs.title,
        genre: editingMs.genre,
        ageCategory: editingMs.ageCategory,
        wordCount: editingMs.wordCount,
        logline: editingMs.logline,
        status: editingMs.status,
        shelvedReason: editingMs.shelvedReason || "",
        notes: editingMs.notes || "",
      });
      setToastMessage("Manuscript details updated.");
      setTimeout(() => setToastMessage(null), 3000);
      setEditingMs(null);
    } catch (err: any) {
      alert("Error updating manuscript: " + err?.message);
    }
  };

  /* Everything the card states is DERIVED here, per render, from the selected manuscript's own
     records. No counter is stored and none is written. */
  const msQueries = selected ? queries.filter((q) => q.manuscriptId === selected.id) : [];
  const msVersions = selected ? versions.filter((v) => v.manuscriptId === selected.id) : [];
  const msPackages = selected
    ? packages.filter((p) => p.manuscriptId === selected.id && p.status !== "Retired")
    : [];
  const msComps = selected ? manuscriptComps(selected) : [];

  return (
    <div className="msv1">
      {/* The standard page header (shell rollout Phase 5) — full variant. The grand slab's
          "N manuscripts · M in submission" pulse line is dropped with it (no meta slot under
          the header law) — see the rollout report. */}
      <PageHeader
        variant="full"
        title="Your manuscripts"
        description="Every manuscript on your shelf, and what each one is out doing." /* PROVISIONAL copy (flyouts P3) — listed for Nick's review */
        actions={[{
          label: "Add manuscript",
          icon: <Plus aria-hidden="true" />,
          onClick: () => onNavigate?.("manuscripts", "Add a manuscript"),
          primary: true,
        }]}
      />
      <div className="msv-wrap">
        {ordered.length === 0 ? (
          /* ── zero-manuscript state: minimal, in the plate grammar ── */
          <div className="msv-panel">
            <div className="msv-empty">
              <div className="msv-qm">Your library is empty.</div>
              <span className="msv-lab">NO MANUSCRIPTS YET</span>
              <div>
                <button
                  type="button"
                  className="msv-btn"
                  onClick={() => onNavigate?.("manuscripts", "Add a manuscript")}
                >
                  <Plus />
                  Add manuscript
                </button>
              </div>
            </div>
          </div>
        ) : selected ? (
          /*
           * ⚠️ ONE CARD, NOT A PLATE PER MANUSCRIPT. The shelf switcher above picks the subject;
           * the card renders it. Most writers have exactly one manuscript, so a list of one read as
           * an accident — and at five, a column of full-height plates buried everything below the
           * first. The card is the same shape at one and at five.
           */
          <div className="msv-card">
            <ManuscriptPlate
              title={selected.title}
              status={isShelvedPresentation(selected) ? "Shelved" : selected.status}
              shelved={isShelvedPresentation(selected)}
              genres={[selected.ageCategory, selected.genre].filter(Boolean) as string[]}
              wordCount={selected.wordCount}
              logline={selected.logline}
              stats={plateStats(msQueries)}
              onSendQuery={() => onNavigate?.("queries", "Send a query", { manuscriptId: selected.id })}
              onEditDetails={() => startEditMs(selected)}
              /* Shelve / reactivate / guarded delete — carried over whole; see the prop's note. */
              lifecycle={
                <div style={{ position: "relative" }}>
                  <button
                    type="button"
                    className="msv-btn sm"
                    title="More actions"
                    aria-label="More actions"
                    aria-expanded={menuOpen}
                    onClick={() => setMenuOpen((o) => !o)}
                    style={{ padding: "6.5px 9px" }}
                  >
                    <MoreHorizontal />
                  </button>
                  {menuOpen && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                      <div className="absolute right-0 top-[34px] z-40 bg-white border border-[#e8e0d8] rounded-[11px] shadow-[0_12px_30px_rgba(58,28,20,0.16)] p-1.5 min-w-[186px]">
                        <button
                          onClick={() => toggleShelved(selected)}
                          className="flex items-center gap-2.5 w-full text-left px-2.5 py-2 rounded-[7px] text-[13px] text-[#3a1c14] hover:bg-[rgba(138,158,136,0.14)] cursor-pointer"
                        >
                          <Archive className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                          {selected.shelved ? "Reactivate" : "Shelve"}
                        </button>
                        <div className="h-px bg-[#f0eae2] my-1 mx-1" />
                        <button
                          onClick={() => { setMenuOpen(false); setDeleteModalMs(selected); }}
                          className="flex items-center gap-2.5 w-full text-left px-2.5 py-2 rounded-[7px] text-[13px] text-[#a8442f] hover:bg-[rgba(168,68,47,0.08)] cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5 shrink-0" />
                          Delete…
                        </button>
                      </div>
                    </>
                  )}
                </div>
              }
            />

            <ManuscriptTabs active={tab} onChange={setTab} />

            {tab === "details" && (
              <div className="msv-dbody">
                <ManuscriptDetailTiles
                  world={outInTheWorld(msQueries)}
                  comps={comparableTitlesTile(msComps)}
                  shelf={onTheShelf(selected, Date.now())}
                  materials={submissionMaterials(msPackages, msVersions)}
                  onOpenQueriesHub={() => onNavigate?.("queries")}
                  /* A TAB SWITCH, not a navigation — the shelf is a pane of this card. */
                  onOpenShelf={() => setTab("comps")}
                  onEditDetails={() => startEditMs(selected)}
                  onOpenPackageBuilder={() => {
                    selectMs(selected.id);
                    onNavigate?.("manuscripts", "Submission packages");
                  }}
                />
              </div>
            )}

            {tab === "comps" && (
              <ManuscriptCompsPane
                comps={msComps}
                /* The ONE Pro predicate, gating the Scout strip and nothing else on this page. */
                isPro={isProUser(currentUser)}
                scoutAvailable={scoutLive()}
                currentYear={new Date().getFullYear()}
                /* Removal is the shared pure helper + the single writer; adding needs the form the
                   sub-page owns, so it goes there until the comps retirement moves it across. */
                onRemoveComp={(i) => { void updateManuscript(selected.id, { comps: withCompRemoved(msComps, i) }); }}
                onAddComp={() => {
                  selectMs(selected.id);
                  onNavigate?.("manuscripts", "Comparable titles");
                }}
                onCopyPitch={(text) => { void navigator.clipboard?.writeText(text); }}
                onSeeHowItWorks={() => onNavigate?.("plans")}
                onUpgrade={() => onNavigate?.("plans")}
              />
            )}

            {tab === "packages" && (
              <ManuscriptPackagesPane
                versions={msVersions}
                packages={msPackages}
                onOpenBuilder={() => {
                  selectMs(selected.id);
                  onNavigate?.("manuscripts", "Submission packages");
                }}
              />
            )}
          </div>
        ) : null}
      </div>

      {/* ── edit modal (comps field deliberately absent — managed on the shelf sub-page) ── */}
      <AnimatePresence>
        {editingMs && (
          <div className="fixed inset-0 bg-[#3a1c14]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-[#e8d5cc] rounded-2xl w-full max-w-[550px] p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <button
                type="button"
                onClick={() => setEditingMs(null)}
                className="absolute top-4 right-4 p-1 rounded-full text-stone-400 hover:text-stone-600 hover:bg-stone-50 cursor-pointer transition-all border-0"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="border-b border-stone-100 pb-2 mb-4">
                <h3 className="font-serif text-lg font-bold text-[#3a1c14] text-left leading-none">Edit manuscript details</h3>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-4 text-left">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-stone-500 mb-1">Title</label>
                    <input
                      required
                      type="text"
                      value={editingMs.title}
                      onChange={(e) => setEditingMs({ ...editingMs, title: e.target.value })}
                      className="w-full text-xs p-2 bg-white rounded border border-[#e8d5cc] focus:ring-1 focus:ring-[#7c3a2a] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-stone-500 mb-1">Genre</label>
                    <input
                      required
                      type="text"
                      value={editingMs.genre}
                      onChange={(e) => setEditingMs({ ...editingMs, genre: e.target.value })}
                      className="w-full text-xs p-2 bg-white rounded border border-[#e8d5cc] focus:ring-1 focus:ring-[#7c3a2a] outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-stone-500 mb-1">Age Category</label>
                    <select
                      value={editingMs.ageCategory}
                      onChange={(e) => setEditingMs({ ...editingMs, ageCategory: e.target.value })}
                      className="w-full text-xs p-2 bg-white rounded border border-[#e8d5cc] outline-none focus:ring-1 focus:ring-[#7c3a2a]"
                    >
                      <option value="Adult">Adult</option>
                      <option value="Young Adult">Young Adult</option>
                      <option value="Middle Grade">Middle Grade</option>
                      <option value="New Adult">New Adult</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-stone-500 mb-1">Word Count</label>
                    <input
                      type="number"
                      required
                      value={editingMs.wordCount}
                      onChange={(e) => setEditingMs({ ...editingMs, wordCount: Math.max(0, parseInt(e.target.value) || 0) })}
                      className="w-full text-xs p-2 bg-white rounded border border-[#e8d5cc] outline-none focus:ring-1 focus:ring-[#7c3a2a]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-stone-500 mb-1">Status</label>
                    <select
                      value={editingMs.status}
                      onChange={(e) => setEditingMs({ ...editingMs, status: e.target.value as ManuscriptStatus })}
                      className="w-full text-xs p-2 bg-white rounded border border-[#e8d5cc] outline-none focus:ring-1 focus:ring-[#7c3a2a]"
                    >
                      <option value={ManuscriptStatus.DRAFTING}>Drafting</option>
                      <option value={ManuscriptStatus.REVISING}>Revising</option>
                      <option value={ManuscriptStatus.READY_TO_QUERY}>Ready to Query</option>
                      <option value={ManuscriptStatus.QUERYING}>Querying</option>
                      <option value={ManuscriptStatus.ON_SUBMISSION}>On Submission</option>
                      <option value={ManuscriptStatus.SHELVED}>Shelved</option>
                    </select>
                  </div>
                </div>

                {editingMs.status === ManuscriptStatus.SHELVED && (
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-stone-500 mb-1">Shelved Reason</label>
                    <input
                      type="text"
                      value={editingMs.shelvedReason || ""}
                      onChange={(e) => setEditingMs({ ...editingMs, shelvedReason: e.target.value })}
                      placeholder="e.g. Resting until autumn while the voice sharpens..."
                      className="w-full text-xs p-2 bg-white rounded border border-[#e8d5cc] outline-none focus:ring-1 focus:ring-[#7c3a2a]"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-stone-500 mb-1">Logline / Hook</label>
                  <textarea
                    required
                    value={editingMs.logline || ""}
                    onChange={(e) => setEditingMs({ ...editingMs, logline: e.target.value })}
                    placeholder="One or two sentences — the core hook."
                    className="w-full text-xs p-2 bg-white rounded border border-[#e8d5cc] outline-none focus:ring-1 focus:ring-[#7c3a2a] min-h-[60px]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-stone-500 mb-1">Notes</label>
                  <textarea
                    value={editingMs.notes || ""}
                    onChange={(e) => setEditingMs({ ...editingMs, notes: e.target.value })}
                    placeholder="Premise, structure, anything worth keeping to hand..."
                    className="w-full text-xs p-2 bg-white rounded border border-[#e8d5cc] outline-none focus:ring-1 focus:ring-[#7c3a2a] min-h-[85px]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-stone-50">
                  <button
                    type="button"
                    onClick={() => setEditingMs(null)}
                    className="px-4 py-2 rounded-lg text-xs font-bold text-stone-500 hover:bg-stone-50 cursor-pointer bg-white border border-[#e8d5cc]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-[#7c3a2a] hover:bg-[#6c3224] transition-colors cursor-pointer border-0"
                  >
                    Save changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* success toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-55 bg-stone-900 border border-stone-800 text-[#F8F5F0] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.15)] p-4 flex items-center gap-3 select-none"
          >
            <div className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center text-white shrink-0">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
            <p className="text-xs font-bold leading-none">{toastMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* undo toast (shelve / reactivate) */}
      <AnimatePresence>
        {undoToast && (
          <motion.div
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[56] bg-stone-900 text-white rounded-lg py-3 px-5 text-xs font-medium shadow-lg flex items-center gap-3"
          >
            <span>{undoToast.msg}</span>
            <button onClick={undoToast.undo} className="text-[#e8c89a] underline font-mono text-[11px] cursor-pointer">Undo</button>
            <button onClick={() => setUndoToast(null)} title="Dismiss" aria-label="Dismiss" className="text-stone-400 hover:text-white cursor-pointer shrink-0"><X className="w-3.5 h-3.5" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6A hard-delete guard — type-to-confirm + the "Goes with it" manifest (cascade.ts, one
          source with the delete plan). Light mode when nothing depends on the manuscript. */}
      {deleteModalMs && (() => {
        const m = deleteModalMs;
        const manifest = destroyManifest("manuscript", m.id, { queries, activities, taskFlags, versions, packages });
        const light = manifest.queries === 0 && manifest.packages === 0 && manifest.versions === 0 && manifest.activityRecords === 0;
        return (
          <ConfirmDestroy
            kind="manuscript"
            name={m.title}
            manifest={manifest}
            light={light}
            onConfirm={() => confirmDestroyMs(m)}
            onCancel={() => setDeleteModalMs(null)}
          />
        );
      })()}
    </div>
  );
};
