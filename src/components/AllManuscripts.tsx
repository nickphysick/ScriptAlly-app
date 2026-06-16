/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect, useRef } from "react";
import { useScriptAllyDb } from "../lib/db";
import { Manuscript, ManuscriptStatus, ManuscriptVersion, Query, UserPlan } from "../types";
import { manuscriptGenres } from "../lib/manuscripts";
import { ManuscriptAgentSuggestions } from "./ManuscriptAgentSuggestions";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, setDoc, doc, onSnapshot } from "firebase/firestore";
import {
  Search,
  Clock,
  Book,
  ChevronRight,
  ChevronLeft,
  Check,
  Plus,
  Pencil,
  SlidersHorizontal,
  FolderLock,
  Send,
  AlertTriangle,
  GitCommit,
  MessageSquare,
  X,
  Trash2,
  FileText,
  Bookmark,
  Sparkles,
  Notebook,
  MoreHorizontal,
  Archive,
  Package
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AllManuscriptsProps {
  searchQuery?: string;
  onNavigate?: (tab: string, subPageName?: string) => void;
}

function formatWhatsAppDate(dateString: string): string {
  const d = new Date(dateString);
  const day = d.getDate();
  const month = d.toLocaleString("en-GB", { month: "short" });
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${day} ${month}, ${time}`;
}

export const AllManuscripts: React.FC<AllManuscriptsProps> = ({ searchQuery, onNavigate }) => {
  const {
    currentUser,
    manuscripts,
    versions,
    queries,
    agents,
    updateManuscript,
    deleteManuscript,
    setManuscriptShelved,
  } = useScriptAllyDb();

  // Selection and Filter States
  const [selectedMsId, setSelectedMsId] = useState<string | null>(null);
  const [listSearch, setListSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Drafting/Revising" | "Ready" | "Shelved">("All");
  const [ageGroupFilter, setAgeGroupFilter] = useState<"All" | "Adult" | "Young Adult" | "Middle Grade">("All");
  const [sortOption, setSortOption] = useState<"Highest words" | "Lowest words" | "Alphabetical">("Highest words");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  // Lifecycle UI: delete modal target, detail ⋯ menu, undo toast (shelve/reactivate), and the
  // deferred-delete handle (mirrors the agent flow).
  const [deleteModalMs, setDeleteModalMs] = useState<Manuscript | null>(null);
  const [detailMenuOpen, setDetailMenuOpen] = useState(false);
  const [undoToast, setUndoToast] = useState<{ msg: string; undo: () => void } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ ms: Manuscript } | null>(null);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDeleteRef = useRef<Manuscript | null>(null);

  // Form Editing State
  const [editingMs, setEditingMs] = useState<Manuscript | null>(null);

  // Manuscript Notes State (Card 3 Jottings)
  const [msNotesList, setMsNotesList] = useState<{ id: string; text: string; createdAt: string }[]>([]);
  const [noteInput, setNoteInput] = useState("");

  if (!currentUser) return null;

  // Real-time snapshot notes lookup (identical model to Agent notes)
  useEffect(() => {
    if (!selectedMsId) {
      setMsNotesList([]);
      return;
    }

    if (!currentUser) {
      // No authenticated user (seed/preview): load demo notes from LocalStorage.
      const cached = localStorage.getItem(`scriptally_ms_notes_${currentUser?.id || "seed"}_${selectedMsId}`);
      if (cached) {
        setMsNotesList(JSON.parse(cached));
      } else {
        // Seed default notes
        let defaultNotes: any[] = [];
        if (selectedMsId === "ms-1") {
          defaultNotes = [
            { id: "note-1", text: "Completed outline for Chapter 1-10. Ready to polish the submission package.", createdAt: new Date(Date.now() - 3600000 * 24 * 5).toISOString() },
            { id: "note-2", text: "Check: Agent comments suggested boosting Emily's agency in opening scenes.", createdAt: new Date(Date.now() - 3600000 * 2).toISOString() }
          ];
        }
        localStorage.setItem(`scriptally_ms_notes_${currentUser?.id || "seed"}_${selectedMsId}`, JSON.stringify(defaultNotes));
        setMsNotesList(defaultNotes);
      }
      return;
    }

    // Online mode: real-time snapshot listener on /users/{userId}/manuscripts/{msId}/notes
    const notesColRef = collection(db, "users", currentUser.id, "manuscripts", selectedMsId, "notes");
    const unsub = onSnapshot(notesColRef, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          text: data.text,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt
        });
      });
      // Sort in reverse chronological order (newest first)
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setMsNotesList(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${currentUser.id}/manuscripts/${selectedMsId}/notes`);
    });

    return () => unsub();
  }, [selectedMsId, currentUser?.id]);

  // Commit a still-pending delete if the user navigates away (page unmounts) — never leave it dangling.
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

  // Handle post note
  const handleAddMsNote = async (text: string) => {
    if (!text.trim() || !selectedMsId || !currentUser) return;
    const cleanText = text.trim();
    const now = new Date();

    const noteId = "note-" + Math.random().toString(36).substr(2, 9);
    try {
      await setDoc(doc(db, "users", currentUser.id, "manuscripts", selectedMsId, "notes", noteId), {
        text: cleanText,
        createdAt: now.toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.id}/manuscripts/${selectedMsId}/notes/${noteId}`);
    }
    setNoteInput("");
  };

  // Process filters and sorting
  const term = (listSearch || searchQuery || "").toLowerCase();

  const filteredAndSorted = manuscripts
    .filter(m => {
      // Search term
      if (term) {
        const matchTitle = m.title?.toLowerCase().includes(term);
        const matchGenre = m.genre?.toLowerCase().includes(term);
        return matchTitle || matchGenre;
      }
      return true;
    })
    .filter(m => {
      // Status filter mapping
      if (statusFilter === "All") return true;
      if (statusFilter === "Active") {
        return m.status !== ManuscriptStatus.SHELVED;
      }
      if (statusFilter === "Drafting/Revising") {
        return m.status === ManuscriptStatus.DRAFTING || m.status === ManuscriptStatus.REVISING;
      }
      if (statusFilter === "Ready") {
        return m.status === ManuscriptStatus.READY_TO_QUERY || m.status === ManuscriptStatus.QUERYING || m.status === ManuscriptStatus.ON_SUBMISSION;
      }
      if (statusFilter === "Shelved") {
        return m.status === ManuscriptStatus.SHELVED;
      }
      return true;
    })
    .filter(m => {
      // Age Category filter mapping
      if (ageGroupFilter === "All") return true;
      return m.ageCategory === ageGroupFilter;
    })
    .sort((a, b) => {
      // Shelved books always sink to their own group at the bottom of the list.
      if (!!a.shelved !== !!b.shelved) return a.shelved ? 1 : -1;
      if (sortOption === "Highest words") {
        return b.wordCount - a.wordCount;
      }
      if (sortOption === "Lowest words") {
        return a.wordCount - b.wordCount;
      }
      if (sortOption === "Alphabetical") {
        return a.title.localeCompare(b.title);
      }
      return 0;
    })
    // Optimistically hide a book that's mid-deferred-delete so the list reflects the pending removal.
    .filter((m) => !(pendingDelete && m.id === pendingDelete.ms.id));

  // Keep selection synchronized with filtered list of items
  useEffect(() => {
    if (filteredAndSorted.length > 0) {
      if (!selectedMsId || !filteredAndSorted.some(m => m.id === selectedMsId)) {
        setSelectedMsId(filteredAndSorted[0].id);
      }
    } else {
      setSelectedMsId(null);
    }
  }, [statusFilter, ageGroupFilter, term, manuscripts.length]);

  const activeMs = selectedMsId ? manuscripts.find(m => m.id === selectedMsId) : null;
  const activeMsVersions = activeMs ? versions.filter(v => v.manuscriptId === selectedMsId) : [];

  // ── Lifecycle handlers (chunk 3) ──
  // Shelve / reactivate — reversible flag-flip, with Undo on the shelve direction. No activity log.
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

  // Deferred delete (undo window). The cascade lives in db.deleteManuscript and runs only at commit.
  const commitPendingDelete = async () => {
    const p = pendingDeleteRef.current;
    if (!p) return;
    pendingDeleteRef.current = null;
    if (deleteTimerRef.current) { clearTimeout(deleteTimerRef.current); deleteTimerRef.current = null; }
    setPendingDelete(null);
    await deleteManuscript(p.id);
  };

  // Confirm pressed ("Delete everything"): defer — optimistically hide the book + reselect, open window.
  const requestDeleteMs = (ms: Manuscript) => {
    setDeleteModalMs(null);
    setDetailMenuOpen(false);
    const idx = filteredAndSorted.findIndex((m) => m.id === ms.id);
    const remaining = filteredAndSorted.filter((m) => m.id !== ms.id);
    setSelectedMsId(remaining.length ? (remaining[Math.min(idx, remaining.length - 1)]?.id ?? remaining[0].id) : null);
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
  const activeMsQueries = activeMs ? queries.filter(q => q.manuscriptId === selectedMsId) : [];

  // Edit Submission handlers
  const startEditMs = (m: Manuscript) => {
    setEditingMs({ ...m });
  };

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
        comparableTitles: editingMs.comparableTitles,
        status: editingMs.status,
        shelvedReason: editingMs.shelvedReason || "",
        notes: editingMs.notes || ""
      });

      setToastMessage("Manuscript profiling updated successfully.");
      setTimeout(() => setToastMessage(null), 3000);
      setEditingMs(null);
    } catch (err: any) {
      alert("Error updating manuscript: " + err?.message);
    }
  };

  const getStatusBadge = (status: ManuscriptStatus) => {
    switch (status) {
      case ManuscriptStatus.DRAFTING:
        return { bg: "bg-amber-50 text-amber-700 border-amber-200/50", label: "Drafting" };
      case ManuscriptStatus.REVISING:
        return { bg: "bg-blue-50 text-blue-700 border-blue-200/50", label: "Revising" };
      case ManuscriptStatus.READY_TO_QUERY:
        return { bg: "bg-emerald-50 text-emerald-700 border-emerald-250/50", label: "Ready to Query" };
      case ManuscriptStatus.QUERYING:
        return { bg: "bg-indigo-50 text-indigo-700 border-indigo-200/50", label: "Querying" };
      case ManuscriptStatus.ON_SUBMISSION:
        return { bg: "bg-purple-50 text-purple-700 border-purple-200/50", label: "On Submission" };
      case ManuscriptStatus.SHELVED:
      default:
        return { bg: "bg-stone-100 text-stone-600 border-stone-250/50", label: "Shelved" };
    }
  };

  return (
    <div
      className="flex-grow bg-[#dce0d9] min-h-0 overflow-hidden w-full flex flex-row p-[8px] gap-[8px]"
      style={{ minHeight: "calc(100vh - 64px)", maxHeight: "calc(100vh - 64px)" }}
    >
      {/* ---------------- panel 1: left sidebar controls ---------------- */}
      <div
        className="bg-white border border-[#e8e0d8] rounded-xl p-[12px] flex flex-col h-full overflow-hidden shrink-0 select-none"
        style={{ width: "15%", minWidth: "15%", maxWidth: "15%", flexShrink: 0 }}
      >
        {/* Add Manuscript modal trigger */}
        <button
          onClick={() => onNavigate?.("manuscripts", "Add a manuscript")}
          className="w-full h-[36px] bg-[#7c3a2a] hover:bg-[#6c3224] text-white flex items-center justify-center gap-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors mb-3 border-0"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>Add manuscript</span>
        </button>

        {/* Filters and sorting dividers wrapper */}
        <div className="flex-grow overflow-y-auto space-y-4 pt-1">
          {/* Status filter */}
          <div className="space-y-1">
            <span className="block text-[10px] font-mono uppercase tracking-wider text-stone-400 font-bold border-b border-[#e8e0d8]/50 pb-0.5 mb-1.5">
              Novel Status
            </span>
            <div className="space-y-0.5">
              {[
                { id: "All", label: "All novels", count: manuscripts.length },
                { id: "Active", label: "Active", count: manuscripts.filter(m => m.status !== ManuscriptStatus.SHELVED).length },
                { id: "Drafting/Revising", label: "Drafting/Revising", count: manuscripts.filter(m => m.status === ManuscriptStatus.DRAFTING || m.status === ManuscriptStatus.REVISING).length },
                { id: "Ready", label: "Ready / Querying", count: manuscripts.filter(m => m.status === ManuscriptStatus.READY_TO_QUERY || m.status === ManuscriptStatus.QUERYING || m.status === ManuscriptStatus.ON_SUBMISSION).length },
                { id: "Shelved", label: "Shelved", count: manuscripts.filter(m => m.status === ManuscriptStatus.SHELVED).length }
              ].map(item => {
                const isActive = statusFilter === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setStatusFilter(item.id as any)}
                    className={`w-full text-left py-1 px-1.5 text-[11px] rounded transition-all cursor-pointer flex justify-between items-center ${
                      isActive ? "bg-[#FAF1EF] text-[#7c3a2a] font-bold border-l-2 border-[#7c3a2a]" : "text-stone-600 hover:bg-stone-50"
                    }`}
                  >
                    <span>{item.label}</span>
                    <span className="text-[9px] text-stone-400 font-mono">({item.count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Age Category Filter */}
          <div className="space-y-1">
            <span className="block text-[10px] font-mono uppercase tracking-wider text-stone-400 font-bold border-b border-[#e8e0d8]/50 pb-0.5 mb-1.5">
              Age Group
            </span>
            <div className="space-y-0.5">
              {[
                { id: "All", label: "All ages", count: manuscripts.length },
                { id: "Adult", label: "Adult", count: manuscripts.filter(m => m.ageCategory === "Adult").length },
                { id: "Young Adult", label: "Young Adult", count: manuscripts.filter(m => m.ageCategory === "Young Adult").length },
                { id: "Middle Grade", label: "Middle Grade", count: manuscripts.filter(m => m.ageCategory === "Middle Grade").length }
              ].map(item => {
                const isActive = ageGroupFilter === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setAgeGroupFilter(item.id as any)}
                    className={`w-full text-left py-1 px-1.5 text-[11px] rounded transition-all cursor-pointer flex justify-between items-center ${
                      isActive ? "bg-[#FAF1EF] text-[#7c3a2a] font-bold border-l-2 border-[#7c3a2a]" : "text-stone-600 hover:bg-stone-50"
                    }`}
                  >
                    <span>{item.label}</span>
                    <span className="text-[9px] text-stone-400 font-mono">({item.count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sort options */}
          <div className="space-y-1">
            <span className="block text-[10px] font-mono uppercase tracking-wider text-stone-400 font-bold border-b border-[#e8e0d8]/50 pb-0.5 mb-1.5">
              Sort Options
            </span>
            <div className="space-y-0.5">
              {[
                { id: "Highest words", label: "Highest wordcount" },
                { id: "Lowest words", label: "Lowest wordcount" },
                { id: "Alphabetical", label: "Alphabetical" }
              ].map(item => {
                const isActive = sortOption === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSortOption(item.id as any)}
                    className={`w-full text-left py-1 px-1.5 text-[11px] rounded transition-all cursor-pointer flex justify-between items-center ${
                      isActive ? "bg-[#FAF1EF] text-[#7c3a2a] font-bold border-l-2 border-[#7c3a2a]" : "text-stone-600 hover:bg-stone-50"
                    }`}
                  >
                    <span>{item.label}</span>
                    {isActive && <Check className="w-3.5 h-3.5 text-[#7c3a2a]" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- panel 2: middle list panel ---------------- */}
      <div
        className="bg-white border border-[#e8e0d8] rounded-xl flex flex-col h-full overflow-hidden shrink-0"
        style={{ width: "calc(20% + 50px)", minWidth: "calc(20% + 50px)", maxWidth: "calc(20% + 50px)", flexShrink: 0 }}
      >
        <div className="p-3 border-b border-[#e8e0d8]/60 space-y-1.5 bg-[#fafafa]">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
            <input
              type="text"
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
              placeholder="Search novel name / genre..."
              className="w-full pl-8 pr-3 py-1.5 bg-stone-50 rounded-md border border-[#e8e0d8] text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#7c3a2a]"
            />
          </div>
          <span className="block text-[11px] text-stone-400 pl-0.5 font-medium">
            Showing {filteredAndSorted.length} matching novels
          </span>
        </div>

        {/* Vertical Stack List */}
        <div className="flex-grow overflow-y-auto divide-y divide-[#e8e0d8]/40 custom-query-list-scrollbar">
          {filteredAndSorted.length === 0 ? (
            <div className="p-8 text-center text-stone-400 text-xs select-none">
              No matching novels found.
            </div>
          ) : (
            filteredAndSorted.map((ms, i) => {
              const isSelected = selectedMsId === ms.id;
              const badge = getStatusBadge(ms.status);
              const isFirstShelved = !!ms.shelved && (i === 0 || !filteredAndSorted[i - 1].shelved);

              return (
                <React.Fragment key={ms.id}>
                  {isFirstShelved && (
                    <div className="px-3 pt-3 pb-1 text-[9px] font-mono uppercase tracking-[0.11em] text-stone-400 select-none">
                      Shelved · not suggested for new queries
                    </div>
                  )}
                <div
                  onClick={() => setSelectedMsId(ms.id)}
                  className={`p-3 relative cursor-pointer flex flex-col gap-1 transition-all select-none ${
                    isSelected ? "bg-[#FDF8F6]" : "hover:bg-stone-50 bg-white"
                  } ${ms.shelved ? "opacity-60" : ""}`}
                  style={{
                    borderLeft: isSelected ? "3.5px solid #7c3a2a" : "3.5px solid transparent"
                  }}
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-serif text-[14px] font-bold text-[#3a1c14] truncate leading-tight flex-1 font-serif text-left">
                      {ms.title}
                    </span>
                    {ms.shelved ? (
                      <span className="text-[8px] font-bold font-mono uppercase tracking-[0.04em] px-1.5 py-0.5 rounded-full border shrink-0 bg-stone-100 border-stone-200 text-stone-500">Shelved</span>
                    ) : (
                      <span className={`text-[9.5px] font-semibold tracking-tight px-1.5 rounded border shrink-0 ${badge.bg}`}>
                        {badge.label}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-medium text-[#c9a89e]">
                    <span>{manuscriptGenres(ms).join(", ")} &bull; {ms.ageCategory}</span>
                    <span className="font-mono text-[10px] text-stone-400 font-semibold">{ms.wordCount?.toLocaleString() || 0} words</span>
                  </div>

                  <p className="text-[11px] text-stone-500 line-clamp-2 italic leading-tight text-left mt-0.5">
                    "{ms.logline || "No logline outlined yet."}"
                  </p>
                </div>
                </React.Fragment>
              );
            })
          )}
        </div>
      </div>

      {/* ---------------- panel 3: reading pane ---------------- */}
      {!activeMs ? (
        <div className="bg-white border border-[#e8e0d8] rounded-xl flex-grow flex-1 min-w-0 h-full flex flex-col items-center justify-center p-8 select-none">
          <Book className="w-8 h-8 text-[#a0a89e]/30 mb-2" />
          <span className="text-stone-500 text-sm font-serif">No Manuscript Selected</span>
          <span className="text-stone-400 text-xs mt-1 text-center max-w-[280px]">
            Please select a novel profile from the library list view to access and manage target manuscripts detail files, trackers, timelines and notes.
          </span>
        </div>
      ) : (
        <div className="bg-white border border-[#e8e0d8] rounded-xl flex-grow flex-1 min-w-0 h-full flex flex-col overflow-hidden">
          {/* 1. TOP CONTROL BAR (Exactly same as Agents block) */}
          <div className="h-[44px] border-b border-[#e8e0d8] flex items-center px-4 justify-between bg-[#fafafa] shrink-0 select-none">
            {/* Left group controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => startEditMs(activeMs)}
                className="h-[28px] border border-[#e8e0d8] hover:bg-stone-100 bg-white flex items-center gap-1 px-3 rounded-full text-xs text-stone-700 font-medium cursor-pointer transition-colors"
              >
                <Pencil className="w-3 h-3 text-stone-500" />
                <span>Edit profile</span>
              </button>
              {/* Open the Submission Packages page for THIS manuscript (carries the active id the page reads). */}
              <button
                onClick={() => {
                  localStorage.setItem("scriptally_active_manuscript_id", activeMs.id);
                  onNavigate?.("manuscripts", "Submission packages");
                }}
                className="h-[28px] border border-[#7c3a2a]/20 hover:bg-[#7c3a2a]/[0.07] bg-[#7c3a2a]/[0.04] flex items-center gap-1.5 px-3 rounded-full text-xs text-[#7c3a2a] font-medium cursor-pointer transition-colors"
              >
                <Package className="w-3 h-3" />
                <span>Submission Packages</span>
              </button>
            </div>

            {/* Center controls: filtered listing previous / next slider */}
            <div className="flex items-center gap-2 font-serif">
              <button
                onClick={() => {
                  const idx = filteredAndSorted.findIndex(m => m.id === selectedMsId);
                  if (idx > 0) {
                    setSelectedMsId(filteredAndSorted[idx - 1].id);
                  }
                }}
                disabled={filteredAndSorted.findIndex(m => m.id === selectedMsId) <= 0}
                className="w-7 h-7 hover:bg-stone-100 text-stone-600 rounded flex items-center justify-center cursor-pointer disabled:opacity-30 disabled:hover:bg-transparent"
                title="Previous Manuscript"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-mono font-bold text-stone-500">
                {filteredAndSorted.findIndex(m => m.id === selectedMsId) + 1} / {filteredAndSorted.length}
              </span>
              <button
                onClick={() => {
                  const idx = filteredAndSorted.findIndex(m => m.id === selectedMsId);
                  if (idx >= 0 && idx < filteredAndSorted.length - 1) {
                    setSelectedMsId(filteredAndSorted[idx + 1].id);
                  }
                }}
                disabled={filteredAndSorted.findIndex(m => m.id === selectedMsId) >= filteredAndSorted.length - 1}
                className="w-7 h-7 hover:bg-stone-100 text-stone-600 rounded flex items-center justify-center cursor-pointer disabled:opacity-30 disabled:hover:bg-transparent"
                title="Next Manuscript"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Right group: ⋯ lifecycle menu — Shelve / Reactivate · Delete… */}
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setDetailMenuOpen((o) => !o); }}
                title="More actions"
                aria-label="More actions"
                className="w-[30px] h-[30px] border border-[#e8e0d8] bg-white hover:bg-stone-100 rounded-[6px] flex items-center justify-center cursor-pointer text-stone-500 transition-colors"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              {detailMenuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setDetailMenuOpen(false)} />
                  <div className="absolute right-0 top-[36px] z-40 bg-white border border-[#e8e0d8] rounded-[11px] shadow-[0_12px_30px_rgba(58,28,20,0.16)] p-1.5 min-w-[186px]">
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

          {/* 2. MAIN SCROLL CONTAINER */}
          <div className="flex-grow overflow-y-auto p-5 space-y-5 bg-stone-50/50">
            {/* Top overview layout: title card with primary indicators */}
            <div className="bg-white border border-[#e8e0d8] rounded-xl p-[18px] shadow-3xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-left">
              <div>
                <span className={`text-[10px] font-bold font-mono tracking-wider uppercase border border-stone-200 text-stone-500 px-2 py-0.5 rounded mr-2`}>
                  {activeMs.ageCategory}
                </span>
                <h1 className="font-serif text-[24px] font-bold text-[#3a1c14] leading-tight font-serif mt-1.5">
                  {activeMs.title}
                </h1>
                <p className="text-[12px] text-stone-500 font-medium mt-1">
                  {manuscriptGenres(activeMs).join(", ")} &middot; <span className="font-mono font-bold">{activeMs.wordCount?.toLocaleString() || 0}</span> Words in profile
                </p>
                {activeMs.comparableTitles && (
                  <p className="text-[11px] text-[#7c3a2a] mt-1.5 font-medium italic">
                    Comps: {activeMs.comparableTitles}
                  </p>
                )}
              </div>

              {/* Status and dates panel */}
              <div className="bg-[#FAF8F5] border border-[#e8e0d8] rounded-lg p-3 shrink-0 text-left min-w-[180px]">
                <div style={{ fontSize: '9px', color: '#c9a89e', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
                  Aesthetic Status
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className={`w-2 h-2 rounded-full ${activeMs.status === ManuscriptStatus.READY_TO_QUERY || activeMs.status === ManuscriptStatus.QUERYING || activeMs.status === ManuscriptStatus.ON_SUBMISSION ? 'bg-[#3B6D11]' : 'bg-amber-600'}`} />
                  <span className="text-[13px] font-serif font-bold text-[#3a1c14]">{activeMs.status}</span>
                </div>
                {activeMs.statusChangedDate && (
                  <div className="text-[10px] text-stone-400 font-medium flex items-center gap-1.5 mt-2">
                    <Clock className="w-3 h-3 text-stone-300" />
                    <span>Last moved: {new Date(activeMs.statusChangedDate).toLocaleDateString("en-GB", { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Content Segment Blocks Grid: Block 1 Left details, Block 2 Right ledger tracks */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
              
              {/* Left detail grid card column span 7 */}
              <div className="xl:col-span-7 space-y-5">
                
                {/* Details card profile specifications */}
                <div className="bg-white border border-[#e8e0d8] rounded-xl p-[20px] shadow-3xs text-left">
                  <span className="block text-[10px] font-mono uppercase tracking-wider text-[#7c3a2a] font-black border-b border-[#FAF1EF] pb-1.5 mb-3.5">
                    Creative Materials Overview
                  </span>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-[11px] font-bold text-stone-400 uppercase tracking-wide">Primary Project Logline</h4>
                      <p className="text-stone-800 text-xs italic font-serif leading-relaxed mt-1 p-3 bg-stone-50 border-l-4 border-l-[#7c3a2a]/20 rounded-r-md">
                        "{activeMs.logline || "No logline outlined yet. Tap Edit profile above to summarize the core concept hook!"}"
                      </p>
                    </div>

                    {activeMs.notes && (
                      <div>
                        <h4 className="text-[11px] font-bold text-stone-400 uppercase tracking-wide">Design Notes & Premise</h4>
                        <p className="text-stone-700 text-xs leading-relaxed mt-1 font-sans whitespace-pre-line">
                          {activeMs.notes}
                        </p>
                      </div>
                    )}
                    
                    {activeMs.status === ManuscriptStatus.SHELVED && activeMs.shelvedReason && (
                      <div className="bg-amber-50/50 border border-amber-200 rounded-lg p-3">
                        <h4 className="text-[11px] font-bold text-amber-800 uppercase tracking-wide">Shelved Context Justification</h4>
                        <p className="text-stone-700 text-xs mt-1 leading-relaxed">
                          {activeMs.shelvedReason}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card 3: Jottings Ledger feed (identical layout to Agent side notes) */}
                <div className="bg-white border border-[#e8e0d8] rounded-xl p-[20px] shadow-3xs flex flex-col max-h-[350px] overflow-hidden text-left">
                  <span className="block text-[10px] font-mono uppercase tracking-wider text-[#7c3a2a] font-black border-b border-[#FAF1EF] pb-1.5 mb-3">
                    Project Jottings & Field Notes ({msNotesList.length})
                  </span>

                  {/* Add note row input */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAddMsNote(noteInput);
                    }}
                    className="flex gap-2 mb-3.5"
                  >
                    <input
                      type="text"
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      placeholder="Log creative sparks, target feedback, revisions done..."
                      className="flex-grow text-xs px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7c3a2a] focus:bg-white"
                    />
                    <button
                      type="submit"
                      disabled={!noteInput.trim()}
                      className="bg-stone-800 hover:bg-stone-900 text-stone-100 disabled:opacity-40 disabled:hover:bg-stone-800 px-3.5 py-1.5 rounded-lg text-xs font-bold leading-none shrink-0 transition-all cursor-pointer border-0"
                    >
                      Post Note
                    </button>
                  </form>

                  {/* Notes Feed container scroll */}
                  <div className="flex-grow overflow-y-auto divide-y divide-[#e8e0d8]/30 pr-1.5 custom-query-list-scrollbar">
                    {msNotesList.length === 0 ? (
                      <div className="py-8 text-center text-stone-350 text-xs italic select-none">
                        No manual ledger jottings logged yet. Add your first note above!
                      </div>
                    ) : (
                      msNotesList.map(note => (
                        <div key={note.id} className="py-2.5 flex items-start gap-2.5 text-left first:pt-0">
                          <Bookmark className="w-3.5 h-3.5 text-[#c9a89e]/80 mt-0.5 shrink-0" />
                          <div className="flex-grow">
                            <p className="text-xs text-stone-700 leading-relaxed font-sans">{note.text}</p>
                            <span className="block text-[9px] font-mono text-stone-400 mt-1">
                              {formatWhatsAppDate(note.createdAt)}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

              {/* Right column spans 5 */}
              <div className="xl:col-span-5 space-y-5">
                
                {/* Draft Versions tracker card */}
                <div className="bg-white border border-[#e8e0d8] rounded-xl p-[20px] shadow-3xs text-left">
                  <div className="flex justify-between items-center border-b border-[#FAF1EF] pb-1.5 mb-3.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#7c3a2a] font-black">
                      Active Draft Versions ({activeMsVersions.length})
                    </span>
                    <button
                      onClick={() => {
                        localStorage.setItem("scriptally_active_manuscript_id", activeMs.id);
                        onNavigate?.("manuscripts", "Submission packages");
                      }}
                      className="text-[9px] font-mono text-[#7c3a2a] font-bold hover:underline"
                    >
                      Submission packages &rarr;
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[220px] overflow-y-auto custom-query-list-scrollbar pr-1">
                    {activeMsVersions.length === 0 ? (
                      <p className="text-center py-6 text-stone-400 text-xs italic select-none">No draft versions uploaded. Define these in Submission Packages!</p>
                    ) : (
                      activeMsVersions.map(v => (
                        <div key={v.id} className="p-2 bg-stone-50 rounded-lg border border-stone-100 flex items-center justify-between text-left">
                          <div className="flex items-center gap-2 truncate">
                            <FileText className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                            <div className="truncate">
                              <span className="block text-xs font-bold text-stone-750 truncate">{v.versionName}</span>
                              <span className="block text-[9px] font-mono font-medium text-stone-400 mt-0.5">{v.componentType}</span>
                            </div>
                          </div>
                          {v.fileName && (
                            <span className="text-[9px] font-mono bg-stone-200/50 text-stone-600 px-2 py-0.5 rounded font-semibold shrink-0">
                              {v.fileName}
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Submittal queried agencies list card */}
                <div className="bg-white border border-[#e8e0d8] rounded-xl p-[20px] shadow-3xs text-left">
                  <div className="flex justify-between items-center border-b border-[#FAF1EF] pb-1.5 mb-3.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#7c3a2a] font-black">
                      Associated Query Log ({activeMsQueries.length})
                    </span>
                    <button
                      onClick={() => onNavigate?.("queries", "Queries tracker")}
                      className="text-[9px] font-mono text-[#7c3a2a] font-bold hover:underline"
                    >
                      Queries Desk &rarr;
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[240px] overflow-y-auto custom-query-list-scrollbar pr-1">
                    {activeMsQueries.length === 0 ? (
                      <p className="text-center py-8 text-stone-400 text-xs italic select-none">No active queries registered for this novel yet.</p>
                    ) : (
                      activeMsQueries.map(q => {
                        const agent = agents.find(ag => ag.id === q.agentId);
                        
                        return (
                          <div key={q.id} className="p-2.5 bg-stone-50 rounded-lg border border-stone-100 flex justify-between items-center text-xs gap-3">
                            <div className="truncate text-left flex-1">
                              <span className="font-bold text-stone-850 block truncate leading-tight">{agent?.name || "Unknown Agent"}</span>
                              <span className="text-[10px] text-stone-400 block truncate mt-0.5">{agent?.agency || "Agency"}</span>
                            </div>
                            
                            <div className="text-right shrink-0">
                              <span className="text-[9px] font-mono bg-amber-50 text-amber-700 border border-amber-200/40 px-1.5 py-0.5 rounded font-bold uppercase tracking-tight">
                                {q.status}
                              </span>
                              <span className="block text-[9px] text-stone-400 mt-1 font-mono font-medium">Sent: {new Date(q.dateSent).toLocaleDateString("en-GB", { day: 'numeric', month: 'short' })}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>

            </div>

            {/* Manuscript-scoped community-agent suggestions (genre + wish-list fit) */}
            <ManuscriptAgentSuggestions manuscript={activeMs} />

          </div>
        </div>
      )}

      {/* 4. EDIT/PROFILE DIALOG OVERLAY (Identical style overlay to Agents.tsx edits) */}
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

              <div className="border-b border-stone-100 pb-2 mb-4 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                <h3 className="font-serif text-lg font-bold text-[#3a1c14] text-left leading-none font-serif">Edit Manuscript Profile</h3>
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
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-stone-500 mb-1">Comparable Titles</label>
                    <input
                      type="text"
                      value={editingMs.comparableTitles || ""}
                      onChange={(e) => setEditingMs({ ...editingMs, comparableTitles: e.target.value })}
                      placeholder="e.g. TITLE meets TITLE"
                      className="w-full text-xs p-2 bg-white rounded border border-[#e8d5cc] outline-none focus:ring-1 focus:ring-[#7c3a2a]"
                    />
                  </div>
                </div>

                {editingMs.status === ManuscriptStatus.SHELVED && (
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-stone-500 mb-1">Shelved Reason Context</label>
                    <input
                      type="text"
                      value={editingMs.shelvedReason || ""}
                      onChange={(e) => setEditingMs({ ...editingMs, shelvedReason: e.target.value })}
                      placeholder="e.g. Shelving to focus on YA manuscript submissions..."
                      className="w-full text-xs p-2 bg-white rounded border border-[#e8d5cc] outline-none focus:ring-1 focus:ring-[#7c3a2a]"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-stone-500 mb-1">Manuscript Logline / Hook</label>
                  <textarea
                    required
                    value={editingMs.logline || ""}
                    onChange={(e) => setEditingMs({ ...editingMs, logline: e.target.value })}
                    placeholder="Provide a concise 1-2 sentence core query logline query hook..."
                    className="w-full text-xs p-2 bg-white rounded border border-[#e8d5cc] outline-none focus:ring-1 focus:ring-[#7c3a2a] min-h-[60px]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-stone-500 mb-1">Design Premise & Details (Notes)</label>
                  <textarea
                    value={editingMs.notes || ""}
                    onChange={(e) => setEditingMs({ ...editingMs, notes: e.target.value })}
                    placeholder="Add structured outline materials details..."
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
                    Save configuration
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating HUD toast identical to Agents */}
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

      {/* Undo toast (shelve / reactivate — instant flag-flip) */}
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

      {/* Deferred-delete toast (Manuscript deleted · Undo · ✕) */}
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

      {/* Delete modal — names the consequence, offers Shelve instead */}
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
