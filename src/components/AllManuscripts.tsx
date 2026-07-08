/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Manuscripts overview v2 — frontispiece plates. Reference:
 * design-refs/manuscripts-page-v2.html, variant A (Frontispiece).
 *
 * Each manuscript is a full-width plate: a corner status pill, a centred stack (AGE · GENRE label,
 * Playfair title, word-count line — NO genre-range whisper here — ornament rule, logline epigraph,
 * Send a query), and an expander that opens an accordion reveal. The reveal's three mini-panels
 * land in v2 Phase 3; this phase carries the rest state + the actions row (Edit details + the
 * lifecycle ⋯ menu, moved wholesale from v1). Comps left for their own sub-page (Phase 1).
 *
 * The shelved treatment (grey "Shelved" pill, plate dimmed, Send hidden) keys off
 * isShelvedPresentation — Shelved status OR the reversible `shelved` overlay. Lifecycle
 * (shelve/reactivate/deferred-delete + undo) and the edit modal carry over unchanged.
 */
import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { useScriptAllyDb } from "../lib/db";
import { Manuscript, ManuscriptStatus } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { ChromeSlab, MASTHEAD_CTA_STYLE } from "./shell/ChromeSlab";
import { Plus, Send, Pencil, MoreHorizontal, Archive, Trash2, X, Check, ChevronDown } from "lucide-react";
import { isShelvedPresentation, activeQueryCount } from "../lib/manuscriptPage";
import { manuscriptComps } from "../lib/comps";
import { PlateReveal } from "./manuscripts/RevealPanels";
import "./manuscripts/manuscripts.css";

/** Shared with the comps + packages sub-pages — the section's single active-manuscript pointer. */
const ACTIVE_MS_KEY = "scriptally_active_manuscript_id";

/**
 * Accordion reveal — animates its own height between 0 and content, then releases to `auto` so
 * late content growth isn't clipped. Replaces the mockup's `grid-template-rows: 0fr→1fr` trick,
 * which collapses to 0px inside the stage's definite-height scroll context. Reduced motion still
 * measures/toggles; the CSS transition is disabled by media query, so it snaps.
 */
const Reveal: React.FC<{ open: boolean; children: React.ReactNode }> = ({ open, children }) => {
  const innerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | "auto">(open ? "auto" : 0);

  useLayoutEffect(() => {
    const inner = innerRef.current;
    if (!inner) return;
    if (open) {
      setHeight(inner.scrollHeight);
      const t = setTimeout(() => setHeight("auto"), 360); // release after the transition
      return () => clearTimeout(t);
    }
    // From auto → an explicit px, then next frame → 0 so the height transition has two keyframes.
    setHeight(inner.scrollHeight);
    const raf = requestAnimationFrame(() => setHeight(0));
    return () => cancelAnimationFrame(raf);
  }, [open]);

  return (
    <div className="msv-reveal" style={{ height }}>
      <div ref={innerRef} className="msv-reveal-inner">{children}</div>
    </div>
  );
};

interface AllManuscriptsProps {
  searchQuery?: string;
  /** App's handleNavigate bridge — opts.manuscriptId preselects the Log-a-Query manuscript (additive). */
  onNavigate?: (tab: string, subPageName?: string, opts?: { manuscriptId?: string }) => void;
}

export const AllManuscripts: React.FC<AllManuscriptsProps> = ({ onNavigate }) => {
  const { currentUser, manuscripts, queries, agents, packages, updateManuscript, deleteManuscript, setManuscriptShelved } =
    useScriptAllyDb();

  const [openId, setOpenId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [deleteModalMs, setDeleteModalMs] = useState<Manuscript | null>(null);
  const [undoToast, setUndoToast] = useState<{ msg: string; undo: () => void } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ ms: Manuscript } | null>(null);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDeleteRef = useRef<Manuscript | null>(null);
  const [editingMs, setEditingMs] = useState<Manuscript | null>(null);

  // Plates: active books first, shelved sink to the end; a book mid-deferred-delete is hidden.
  const ordered = [...manuscripts]
    .sort((a, b) => Number(isShelvedPresentation(a)) - Number(isShelvedPresentation(b)))
    .filter((m) => !(pendingDelete && m.id === pendingDelete.ms.id));

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

  const toggle = (id: string) => setOpenId((o) => (o === id ? null : id));

  // ── lifecycle (carried over: reversible shelve flag-flip with Undo; deferred delete) ──
  const toggleShelved = async (ms: Manuscript) => {
    setMenuOpenId(null);
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
    setMenuOpenId(null);
    if (openId === ms.id) setOpenId(null);
    pendingDeleteRef.current = ms;
    setPendingDelete({ ms });
    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    deleteTimerRef.current = setTimeout(() => { void commitPendingDelete(); }, 7000);
  };

  const undoPendingDelete = () => {
    if (deleteTimerRef.current) { clearTimeout(deleteTimerRef.current); deleteTimerRef.current = null; }
    pendingDeleteRef.current = null;
    setPendingDelete(null);
  };

  // ── edit modal (carried over; comps deliberately absent — the shelf sub-page is the single home) ──
  const startEditMs = (m: Manuscript) => { setMenuOpenId(null); setEditingMs({ ...m }); };

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

  // "In submission" = manuscripts with ≥1 active (non-closed) query — activeQueryCount over each
  // manuscript's scoped queries (the same pipeline predicate the field roster uses).
  const inSubmission = manuscripts.filter((m) => activeQueryCount(queries.filter((q) => q.manuscriptId === m.id)) > 0).length;

  return (
    <div className="msv1">
      <ChromeSlab
        onNavigate={onNavigate}
        grand
        title="Your manuscripts"
        meta={`${manuscripts.length} ${manuscripts.length === 1 ? "manuscript" : "manuscripts"} · ${inSubmission} in submission`}
        tools={
          <button
            type="button"
            style={MASTHEAD_CTA_STYLE}
            onClick={() => onNavigate?.("manuscripts", "Add a manuscript")}
          >
            <Plus style={{ width: 15, height: 15 }} />
            Add manuscript
          </button>
        }
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
        ) : (
          <div className="msv-tilegrid">
            {ordered.map((m) => {
              const shel = isShelvedPresentation(m);
              const open = openId === m.id;
              return (
                <div key={m.id} className={`msv-plate${shel ? " shelved" : ""}${open ? " open" : ""}`}>
                  <span className={`msv-statuspill msv-platepill${shel ? " grey" : ""}`}>
                    <span className="msv-dt" />
                    {shel ? "Shelved" : m.status}
                  </span>

                  {/* head — click toggles the reveal (buttons inside stop propagation) */}
                  <div className="msv-plate-head msv-fphead" onClick={() => toggle(m.id)}>
                    <span className="msv-lab">
                      {(m.ageCategory || "").toUpperCase()} · {(m.genre || "").toUpperCase()}
                    </span>
                    <h2 className="msv-fptitle">{m.title}</h2>
                    <div className="msv-wcline">
                      <span className="msv-wc">{(m.wordCount ?? 0).toLocaleString("en-GB")} words</span>
                    </div>
                    <div className="msv-orn"><i /></div>
                    <div className={`msv-fplogline${m.logline ? "" : " empty"}`}>
                      {m.logline || "No logline yet — add one in Edit details."}
                    </div>
                    {!shel && (
                      <div className="msv-restsend">
                        <button
                          type="button"
                          className="msv-btn sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigate?.("queries", "Send a query", { manuscriptId: m.id });
                          }}
                        >
                          <Send />
                          Send a query
                        </button>
                      </div>
                    )}
                  </div>

                  {/* accordion reveal — three band panels + the lifecycle actions row */}
                  <Reveal open={open}>
                      <PlateReveal
                        queries={queries.filter((q) => q.manuscriptId === m.id)}
                        agents={agents}
                        packages={packages.filter((p) => p.manuscriptId === m.id && p.status !== "Retired")}
                        comps={manuscriptComps(m)}
                        onOpenHub={() => onNavigate?.("queries")}
                        onOpenBuilder={() => {
                          localStorage.setItem(ACTIVE_MS_KEY, m.id);
                          onNavigate?.("manuscripts", "Submission packages");
                        }}
                        onManageComps={() => {
                          localStorage.setItem(ACTIVE_MS_KEY, m.id);
                          onNavigate?.("manuscripts", "Comparable titles");
                        }}
                      />
                      <div className="msv-actionsect msv-s4">
                        <div className="msv-actions">
                          <button type="button" className="msv-btn sm" onClick={() => startEditMs(m)}>
                            <Pencil />
                            Edit details
                          </button>
                          <div style={{ position: "relative" }}>
                            <button
                              type="button"
                              className="msv-btn sm"
                              title="More actions"
                              aria-label="More actions"
                              aria-expanded={menuOpenId === m.id}
                              onClick={() => setMenuOpenId((o) => (o === m.id ? null : m.id))}
                              style={{ padding: "6.5px 9px" }}
                            >
                              <MoreHorizontal />
                            </button>
                            {menuOpenId === m.id && (
                              <>
                                <div className="fixed inset-0 z-30" onClick={() => setMenuOpenId(null)} />
                                <div className="absolute left-0 top-[34px] z-40 bg-white border border-[#e8e0d8] rounded-[11px] shadow-[0_12px_30px_rgba(58,28,20,0.16)] p-1.5 min-w-[186px]">
                                  <button
                                    onClick={() => toggleShelved(m)}
                                    className="flex items-center gap-2.5 w-full text-left px-2.5 py-2 rounded-[7px] text-[13px] text-[#3a1c14] hover:bg-[rgba(138,158,136,0.14)] cursor-pointer"
                                  >
                                    <Archive className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                                    {m.shelved ? "Reactivate" : "Shelve"}
                                  </button>
                                  <div className="h-px bg-[#f0eae2] my-1 mx-1" />
                                  <button
                                    onClick={() => { setMenuOpenId(null); setDeleteModalMs(m); }}
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
                      </div>
                  </Reveal>

                  <button type="button" className="msv-expander" onClick={() => toggle(m.id)}>
                    <span>{open ? "LESS" : "MORE DETAILS"}</span>
                    <ChevronDown />
                  </button>
                </div>
              );
            })}

            <button
              type="button"
              className="msv-ghost"
              onClick={() => onNavigate?.("manuscripts", "Add a manuscript")}
            >
              <span className="msv-plus">+</span>
              <span className="msv-cap">ADD A MANUSCRIPT</span>
              <span className="msv-ghost-sub">— the shelf holds more than one.</span>
            </button>
          </div>
        )}
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
