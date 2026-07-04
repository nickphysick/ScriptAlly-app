/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Manuscripts page v1 — bookplate hero + comp shelf. Reference:
 * design-refs/manuscripts-page-v1.html (the visual source of truth).
 *
 * Page grammar: a control row (YOUR MANUSCRIPT(S) label · spine switcher only when >1 ·
 * Add manuscript), the bookplate hero for the active manuscript, then the lower grid —
 * comparable titles (the shelf is the ONLY comp-editing surface) beside the "In the field"
 * and "Submission materials" cards. Everything on the page is derived at read time from
 * manuscripts/queries/versions — nothing page-specific is stored.
 *
 * The shelved treatment (grey "Shelved" pill, dimmed spine, hidden send affordances) keys off
 * isShelvedPresentation — Shelved status OR the reversible `shelved` overlay. Lifecycle
 * (shelve/reactivate/delete + undo) and the edit modal carry over from the previous interior.
 */
import React, { useState, useEffect, useRef } from "react";
import { useScriptAllyDb } from "../lib/db";
import { CompTitle, Manuscript, ManuscriptStatus } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Send, Pencil, MoreHorizontal, Archive, Trash2, X, Check } from "lucide-react";
import { FieldCard } from "./manuscripts/FieldCard";
import { MaterialsCard } from "./manuscripts/MaterialsCard";
import { CompShelf } from "./manuscripts/CompShelf";
import { isShelvedPresentation, wordCountWhisper } from "../lib/manuscriptPage";
import { manuscriptComps, withCompAdded, withCompRemoved } from "../lib/comps";
import "./manuscripts/manuscripts.css";

/** Shared with the Submission Packages page — it reads this key to scope itself on open. */
const ACTIVE_MS_KEY = "scriptally_active_manuscript_id";

interface AllManuscriptsProps {
  searchQuery?: string;
  onNavigate?: (tab: string, subPageName?: string) => void;
}

export const AllManuscripts: React.FC<AllManuscriptsProps> = ({ onNavigate }) => {
  const {
    currentUser,
    manuscripts,
    versions,
    queries,
    updateManuscript,
    deleteManuscript,
    setManuscriptShelved,
  } = useScriptAllyDb();

  const [selectedMsId, setSelectedMsId] = useState<string | null>(
    () => localStorage.getItem(ACTIVE_MS_KEY)
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [deleteModalMs, setDeleteModalMs] = useState<Manuscript | null>(null);
  const [detailMenuOpen, setDetailMenuOpen] = useState(false);
  const [undoToast, setUndoToast] = useState<{ msg: string; undo: () => void } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ ms: Manuscript } | null>(null);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDeleteRef = useRef<Manuscript | null>(null);
  const [editingMs, setEditingMs] = useState<Manuscript | null>(null);

  // Spines: active books first, shelved-presentation books sink to the end (stable within groups);
  // a book mid-deferred-delete is optimistically hidden.
  const ordered = [...manuscripts]
    .sort((a, b) => Number(isShelvedPresentation(a)) - Number(isShelvedPresentation(b)))
    .filter((m) => !(pendingDelete && m.id === pendingDelete.ms.id));

  // Keep the selection valid: fall back to the first spine when the stored/previous id is gone.
  useEffect(() => {
    if (ordered.length === 0) {
      if (selectedMsId !== null) setSelectedMsId(null);
      return;
    }
    if (!selectedMsId || !ordered.some((m) => m.id === selectedMsId)) {
      setSelectedMsId(ordered[0].id);
    }
  }, [manuscripts, pendingDelete]);

  // Commit a still-pending delete if the page unmounts — never leave it dangling.
  useEffect(() => {
    return () => {
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
      const p = pendingDeleteRef.current;
      if (p) {
        pendingDeleteRef.current = null;
        void deleteManuscript(p.id);
      }
    };
  }, []);

  if (!currentUser) return null;

  const selectMs = (id: string) => {
    setSelectedMsId(id);
    localStorage.setItem(ACTIVE_MS_KEY, id);
  };

  const activeMs = selectedMsId ? manuscripts.find((m) => m.id === selectedMsId) : null;
  const msVersions = activeMs ? versions.filter((v) => v.manuscriptId === activeMs.id) : [];
  const msQueries = activeMs ? queries.filter((q) => q.manuscriptId === activeMs.id) : [];
  const msComps = activeMs ? manuscriptComps(activeMs) : [];
  const shelvedP = activeMs ? isShelvedPresentation(activeMs) : false;
  const whisper = activeMs ? wordCountWhisper(activeMs.ageCategory, activeMs.genre) : null;

  // Shelf writes — the ONLY comp-editing path. A first write on a legacy-string doc converts it
  // to the structured array (the stray comparableTitles field is left behind, never written).
  const addComp = async (c: CompTitle) => {
    if (!activeMs) return;
    await updateManuscript(activeMs.id, { comps: withCompAdded(msComps, c) });
  };
  const removeComp = async (index: number) => {
    if (!activeMs) return;
    await updateManuscript(activeMs.id, { comps: withCompRemoved(msComps, index) });
  };

  // ── lifecycle (carried over: reversible shelve flag-flip with Undo; deferred delete) ──
  const toggleShelved = async (ms: Manuscript) => {
    setDetailMenuOpen(false);
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

  const commitPendingDelete = async () => {
    const p = pendingDeleteRef.current;
    if (!p) return;
    pendingDeleteRef.current = null;
    if (deleteTimerRef.current) { clearTimeout(deleteTimerRef.current); deleteTimerRef.current = null; }
    setPendingDelete(null);
    await deleteManuscript(p.id);
  };

  const requestDeleteMs = (ms: Manuscript) => {
    setDeleteModalMs(null);
    setDetailMenuOpen(false);
    const remaining = ordered.filter((m) => m.id !== ms.id);
    setSelectedMsId(remaining.length ? remaining[0].id : null);
    pendingDeleteRef.current = ms;
    setPendingDelete({ ms });
    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    deleteTimerRef.current = setTimeout(() => { void commitPendingDelete(); }, 7000);
  };

  const undoPendingDelete = () => {
    if (deleteTimerRef.current) { clearTimeout(deleteTimerRef.current); deleteTimerRef.current = null; }
    const p = pendingDeleteRef.current;
    pendingDeleteRef.current = null;
    setPendingDelete(null);
    if (p) setSelectedMsId(p.id);
  };

  // ── edit modal (carried over; comps deliberately absent — the shelf is the single home) ──
  const startEditMs = (m: Manuscript) => setEditingMs({ ...m });

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

  return (
    <div className="msv1">
      <div className="msv-wrap">
        {/* ── control row ── */}
        <div className="msv-controlrow">
          <div className="msv-crleft">
            <span className="msv-lab">
              {manuscripts.length > 1 ? `YOUR MANUSCRIPTS · ${manuscripts.length}` : "YOUR MANUSCRIPT"}
            </span>
            {manuscripts.length > 1 && (
              <div className="msv-spines">
                {ordered.map((m) => {
                  const sp = isShelvedPresentation(m);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      className={`msv-spine${m.id === selectedMsId ? " on" : ""}${sp ? " shelved" : ""}`}
                      onClick={() => selectMs(m.id)}
                    >
                      <span className="msv-spine-t">{m.title}</span>
                      <span className="msv-spine-c">{sp ? "SHELVED" : m.genre}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <button
            type="button"
            className="msv-btn"
            onClick={() => onNavigate?.("manuscripts", "Add a manuscript")}
          >
            <Plus />
            Add manuscript
          </button>
        </div>

        {!activeMs ? (
          /* ── zero-manuscript state: minimal, in the page grammar ── */
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
        ) : (
          <>
            {/* ── bookplate hero ── */}
            <div className="msv-panel">
              <div className="msv-hero">
                <div className="msv-toprow">
                  <span className="msv-lab">
                    {(activeMs.ageCategory || "").toUpperCase()} · {(activeMs.genre || "").toUpperCase()}
                  </span>
                  <span className={`msv-statuspill${shelvedP ? " grey" : ""}`}>
                    <span className="msv-dt" />
                    {shelvedP ? "Shelved" : activeMs.status}
                  </span>
                </div>
                <h1 className="msv-title">{activeMs.title}</h1>
                <div className="msv-metaline">
                  <span className="msv-wc">{(activeMs.wordCount ?? 0).toLocaleString("en-GB")} words</span>
                  {whisper && <span className="msv-wcnote">· {whisper}</span>}
                </div>
                {activeMs.logline ? (
                  <div className="msv-logline">{activeMs.logline}</div>
                ) : (
                  <div className="msv-logline empty">No logline yet — add one in Edit details.</div>
                )}
                {shelvedP && activeMs.shelvedReason && (
                  <div className="msv-shelvednote">{activeMs.shelvedReason}</div>
                )}
                <div className="msv-actions">
                  {!shelvedP && (
                    <button
                      type="button"
                      className="msv-btn"
                      onClick={() => onNavigate?.("queries", "Send a query")}
                    >
                      <Send />
                      Send a query
                    </button>
                  )}
                  <button type="button" className="msv-btn" onClick={() => startEditMs(activeMs)}>
                    <Pencil />
                    Edit details
                  </button>
                  {/* quiet ⋯ lifecycle menu — shelve/reactivate · delete (existing flows) */}
                  <div style={{ position: "relative" }}>
                    <button
                      type="button"
                      className="msv-btn sm"
                      title="More actions"
                      aria-label="More actions"
                      aria-expanded={detailMenuOpen}
                      onClick={(e) => { e.stopPropagation(); setDetailMenuOpen((o) => !o); }}
                      style={{ padding: "8px 9px" }}
                    >
                      <MoreHorizontal />
                    </button>
                    {detailMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setDetailMenuOpen(false)} />
                        <div className="absolute left-0 top-[36px] z-40 bg-white border border-[#e8e0d8] rounded-[11px] shadow-[0_12px_30px_rgba(58,28,20,0.16)] p-1.5 min-w-[186px]">
                          <button
                            onClick={() => toggleShelved(activeMs)}
                            className="flex items-center gap-2.5 w-full text-left px-2.5 py-2 rounded-[7px] text-[13px] text-[#3a1c14] hover:bg-[rgba(138,158,136,0.14)] cursor-pointer"
                          >
                            <Archive className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                            {activeMs.shelved ? "Reactivate" : "Shelve"}
                          </button>
                          <div className="h-px bg-[#f0eae2] my-1 mx-1" />
                          <button
                            onClick={() => { setDetailMenuOpen(false); setDeleteModalMs(activeMs); }}
                            className="flex items-center gap-2.5 w-full text-left px-2.5 py-2 rounded-[7px] text-[13px] text-[#a8442f] hover:bg-[rgba(168,68,47,0.08)] cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 shrink-0" />
                            Delete…
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                {/* corner motif — open book + plane, behind content */}
                <svg className="msv-heromotif" viewBox="0 0 150 96" aria-hidden="true">
                  <path d="M20 78c18-8 36-8 55-1 19-7 37-7 55 1" />
                  <path d="M20 78v-40c18-8 36-8 55-1v40c-19-7-37-7-55 1z" opacity=".7" />
                  <path d="M130 78v-40c-18-8-36-8-55-1" opacity=".7" />
                  <path d="M75 37v40" opacity=".6" />
                  <path d="M96 18l22-8-7 20-6-5-9-7z" opacity=".9" />
                  <path d="M64 26c8-4 17-7 25-9" strokeDasharray="3 5" opacity=".8" />
                </svg>
              </div>
            </div>

            {/* ── lower grid: comps + right column ── */}
            <div className="msv-lower">
              <div className="msv-panel">
                <div className="msv-band">
                  <h3>Comparable titles</h3>
                  <span className="msv-lab">THE &lsquo;X MEETS Y&rsquo; OF YOUR PITCH</span>
                </div>
                <CompShelf
                  comps={msComps}
                  currentYear={new Date().getFullYear()}
                  onAdd={addComp}
                  onRemove={removeComp}
                />
                {/* Suggestions land beneath the shelf hairline (Phase 4). */}
              </div>
              <div className="msv-rightcol">
                <FieldCard
                  queries={msQueries}
                  shelved={shelvedP}
                  onOpenHub={() => onNavigate?.("queries")}
                  onSendFirst={() => onNavigate?.("queries", "Send a query")}
                />
                <MaterialsCard
                  versions={msVersions}
                  onOpenBuilder={() => {
                    localStorage.setItem(ACTIVE_MS_KEY, activeMs.id);
                    onNavigate?.("manuscripts", "Submission packages");
                  }}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── edit modal (comps field deliberately absent — managed on the shelf) ── */}
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

      {/* deferred-delete toast */}
      <AnimatePresence>
        {pendingDelete && (
          <motion.div
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-stone-900 text-white rounded-lg py-3 px-5 text-xs font-medium shadow-lg flex items-center gap-3"
          >
            <span>Manuscript deleted</span>
            <button onClick={undoPendingDelete} className="text-[#e8c89a] underline font-mono text-[11px] cursor-pointer">Undo</button>
            <button onClick={() => { void commitPendingDelete(); }} title="Dismiss now" aria-label="Dismiss now" className="text-stone-400 hover:text-white cursor-pointer shrink-0"><X className="w-3.5 h-3.5" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* delete modal — names the consequence, offers Shelve instead */}
      {deleteModalMs && (() => {
        const m = deleteModalMs;
        const relatedQ = queries.filter((q) => q.manuscriptId === m.id);
        const qn = relatedQ.length;
        const agentCount = new Set(relatedQ.map((q) => q.agentId)).size;
        return (
          <div className="fixed inset-0 bg-stone-950/40 backdrop-blur-sm flex items-center justify-center p-5 z-[60]" onClick={() => setDeleteModalMs(null)}>
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#fdfaf5] rounded-[15px] w-[min(460px,94vw)] shadow-2xl overflow-hidden relative"
            >
              <div className="p-6">
                <div className="w-[42px] h-[42px] rounded-[11px] bg-[rgba(168,68,47,0.12)] text-[#a8442f] flex items-center justify-center mb-3.5">
                  <Trash2 className="w-5 h-5" />
                </div>
                <h3 className="font-serif text-[19px] leading-tight mb-2.5 text-[#3a1c14]">Delete “{m.title}”?</h3>
                <p className="text-[13.5px] font-light leading-relaxed text-[rgba(58,28,20,0.72)]">
                  {qn > 0 ? (
                    <>This permanently removes the manuscript and its <b className="text-[#7c3a2a] font-medium">{qn} quer{qn > 1 ? "ies" : "y"}</b>{agentCount > 0 ? <> — and clears those from <b className="text-[#7c3a2a] font-medium">{agentCount} agent{agentCount > 1 ? "s’" : "’s"} histor{agentCount > 1 ? "ies" : "y"}</b></> : null}. Can’t be undone. To keep the record, shelve it instead.</>
                  ) : (
                    <>This permanently removes the manuscript. It has no queries, so nothing else is affected. To keep it, shelve it instead.</>
                  )}
                </p>
                <div className="flex items-center gap-2.5 mt-5 flex-wrap">
                  <button onClick={() => requestDeleteMs(m)} className="font-mono text-[11px] rounded-[9px] py-2.5 px-4 bg-[#a8442f] text-white hover:brightness-110 cursor-pointer">Delete everything</button>
                  <button onClick={() => setDeleteModalMs(null)} className="font-mono text-[11px] rounded-[9px] py-2.5 px-4 text-stone-500 hover:text-[#3a1c14] cursor-pointer">Cancel</button>
                  {!m.shelved && (
                    <button onClick={() => { setDeleteModalMs(null); toggleShelved(m); }} className="ml-auto font-mono text-[10.5px] text-[#7c3a2a] opacity-80 hover:opacity-100 hover:underline cursor-pointer p-2">Shelve instead</button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        );
      })()}
    </div>
  );
};
