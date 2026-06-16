/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { useScriptAllyDb } from "../lib/db";
import { Agent, AgentSocial, SubmissionStatus, SubmissionMethod, QueryStatus } from "../types";
import { StatusPill } from "./StatusPill";
import { db, handleFirestoreError, OperationType } from "../lib/firebase"; // Required for setting doc in online Mode
import { collection, setDoc, doc, onSnapshot } from "firebase/firestore";
import { FitStars } from "./forms";
import {
  Search,
  Clock,
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
  Book,
  Notebook,
  MoreHorizontal,
  Archive,
  PauseCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AgentsProps {
  searchQuery?: string;
  onNavigate?: (tab: string, subPageName?: string) => void;
}

/** A handle is treated as a clickable link only when it's an explicit URL or a bare domain. */
function socialHref(handle: string): string | null {
  const h = handle.trim();
  if (/^https?:\/\//i.test(h)) return h;
  // bare domain like "querytracker.net/..." — no @, no spaces, has a dotted segment
  if (!h.includes("@") && !/\s/.test(h) && /[a-z0-9-]+\.[a-z]{2,}/i.test(h)) return `https://${h}`;
  return null;
}

/**
 * Socials to display for an agent. Prefers the v3 socials[] array; falls back to the legacy
 * discrete twitter/bluesky/instagram fields so older agents still show. Empty handles dropped.
 */
function displaySocials(agent: Agent): AgentSocial[] {
  if (agent.socials && agent.socials.length) {
    return agent.socials.filter((s) => s.handle && s.handle.trim() && s.platform);
  }
  const legacy: AgentSocial[] = [];
  if (agent.twitter?.trim()) legacy.push({ platform: "X / Twitter", handle: agent.twitter.trim() });
  if (agent.bluesky?.trim()) legacy.push({ platform: "Bluesky", handle: agent.bluesky.trim() });
  if (agent.instagram?.trim()) legacy.push({ platform: "Instagram", handle: agent.instagram.trim() });
  return legacy;
}

function formatWhatsAppDate(dateString: string): string {
  const d = new Date(dateString);
  const day = d.getDate();
  const month = d.toLocaleString("en-GB", { month: "short" });
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${day} ${month}, ${time}`;
}

export const Agents: React.FC<AgentsProps> = ({ searchQuery, onNavigate }) => {
  const {
    currentUser,
    agents,
    queries,
    manuscripts,
    updateAgent,
    deleteAgent,
    setAgentSetAside,
  } = useScriptAllyDb();

  // Applet Selection and Filter States
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [listSearch, setListSearch] = useState("");
  const [tabFilter, setTabFilter] = useState<"All" | "Open" | "Closed">("All");
  const [queryFilter, setQueryFilter] = useState<"All" | "Queried" | "Not queried">("All");
  const [sortOption, setSortOption] = useState<"Star rating" | "Response time" | "Date added">("Star rating");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  // Lifecycle UI state: guarded-delete modal target, the detail ⋯ menu, and an undo-able toast.
  const [deleteModalAgent, setDeleteModalAgent] = useState<Agent | null>(null);
  const [detailMenuOpen, setDetailMenuOpen] = useState(false);
  const [undoToast, setUndoToast] = useState<{ msg: string; undo: () => void } | null>(null);
  // Deferred delete: on confirm we DON'T delete immediately — we hold it for an undo window, then
  // commit (timeout / ✕ dismiss / navigate-away). Undo cancels with nothing deleted to restore.
  const [pendingDelete, setPendingDelete] = useState<{ agent: Agent; qn: number } | null>(null);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDeleteRef = useRef<{ agent: Agent; qn: number } | null>(null);

  // Form Editing State
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

  // Agent Notes State (Card 3 Jottings)
  const [agentNotesList, setAgentNotesList] = useState<{ id: string; text: string; createdAt: string }[]>([]);
  const [noteInput, setNoteInput] = useState("");

  if (!currentUser) return null;

  // Real-time snapshot notes lookup
  useEffect(() => {
    if (!selectedAgentId) {
      setAgentNotesList([]);
      return;
    }

    if (!currentUser) {
      // No authenticated user (seed/preview): load demo notes from LocalStorage.
      const cached = localStorage.getItem(`scriptally_agent_notes_${currentUser?.id || "seed"}_${selectedAgentId}`);
      if (cached) {
        setAgentNotesList(JSON.parse(cached));
      } else {
        // Seed default notes for UI friendliness
        let defaultNotes: any[] = [];
        if (selectedAgentId === "agent-1") {
          defaultNotes = [
            { id: "note-1", text: "Met at NYC pitch festival. Expressed strong interest in voice-driven YA thrillers.", createdAt: new Date(Date.now() - 3600000 * 24 * 5).toISOString() },
            { id: "note-2", text: "Note: prefers QueryManager submissions over direct emails.", createdAt: new Date(Date.now() - 3600000 * 2).toISOString() }
          ];
        } else if (selectedAgentId === "agent-2") {
          defaultNotes = [
            { id: "note-3", text: "MSWL check: loves layered queer speculative contemporary stories.", createdAt: new Date(Date.now() - 3600000 * 24 * 10).toISOString() }
          ];
        } else if (selectedAgentId === "agent-3") {
          defaultNotes = [
            { id: "note-4", text: "Spoke via twitter, wants standard 3-layer query pitch package.", createdAt: new Date(Date.now() - 3600000 * 24 * 15).toISOString() }
          ];
        }
        localStorage.setItem(`scriptally_agent_notes_${currentUser?.id || "seed"}_${selectedAgentId}`, JSON.stringify(defaultNotes));
        setAgentNotesList(defaultNotes);
      }
      return;
    }

    // Online mode: real-time snapshot listener on /users/{userId}/agents/{agentId}/notes
    const notesColRef = collection(db, "users", currentUser.id, "agents", selectedAgentId, "notes");
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
      setAgentNotesList(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${currentUser.id}/agents/${selectedAgentId}/notes`);
    });

    return () => unsub();
  }, [selectedAgentId, currentUser?.id]);

  // If the user navigates away (this page unmounts) with a delete still pending, commit it —
  // don't leave it dangling. Uses refs so the cleanup doesn't depend on stale state.
  useEffect(() => {
    return () => {
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
      const p = pendingDeleteRef.current;
      if (p) {
        pendingDeleteRef.current = null;
        void deleteAgent(p.agent.id);
      }
    };
  }, []);

  // Handle post agent note
  const handleAddAgentNote = async (text: string) => {
    if (!text.trim() || !selectedAgentId || !currentUser) return;
    const cleanText = text.trim();
    const now = new Date();

    const noteId = "note-" + Math.random().toString(36).substr(2, 9);
    try {
      await setDoc(doc(db, "users", currentUser.id, "agents", selectedAgentId, "notes", noteId), {
        text: cleanText,
        createdAt: now.toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.id}/agents/${selectedAgentId}/notes/${noteId}`);
    }
    setNoteInput("");
  };

  // Profile modal edit triggers
  const startEditAgent = (agent: Agent) => {
    setEditingAgent(JSON.parse(JSON.stringify(agent)));
  };

  const handleUpdateAgentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAgent) return;
    await updateAgent(editingAgent.id, {
      name: editingAgent.name,
      agency: editingAgent.agency,
      email: editingAgent.email,
      website: editingAgent.website,
      starRating: editingAgent.starRating,
      submissionStatus: editingAgent.submissionStatus,
      mswlNotes: editingAgent.mswlNotes,
      submissionMethod: editingAgent.submissionMethod,
      responseTimeWeeks: editingAgent.responseTimeWeeks,
      noResponseMeansNo: editingAgent.noResponseMeansNo,
      genres: editingAgent.genres,
      notes: editingAgent.notes
    });
    setEditingAgent(null);
    setToastMessage("Agent profile updated safely");
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Filter & Sort Logic for middle panel
  let filteredAndSorted = [...agents];

  // 1. Search Query Box & Top Nav Query
  const term = (listSearch || searchQuery || "").toLowerCase().trim();
  if (term) {
    filteredAndSorted = filteredAndSorted.filter(ag =>
      ag.name.toLowerCase().includes(term) ||
      ag.agency.toLowerCase().includes(term)
    );
  }

  // 2. Submission Status filter (Sidebar)
  if (tabFilter !== "All") {
    filteredAndSorted = filteredAndSorted.filter(ag => ag.submissionStatus === tabFilter);
  }

  // 3. Query Status filter (Sidebar)
  if (queryFilter === "Queried") {
    filteredAndSorted = filteredAndSorted.filter(ag => queries.some(q => q.agentId === ag.id));
  } else if (queryFilter === "Not queried") {
    filteredAndSorted = filteredAndSorted.filter(ag => !queries.some(q => q.agentId === ag.id));
  }

  // 4. Sort Ordering
  filteredAndSorted.sort((a, b) => {
    // Set-aside agents always sink to their own group at the bottom of the list.
    if (!!a.setAside !== !!b.setAside) return a.setAside ? 1 : -1;
    if (sortOption === "Star rating") {
      return (b.starRating || 0) - (a.starRating || 0);
    } else if (sortOption === "Response time") {
      return (a.responseTimeWeeks || 0) - (b.responseTimeWeeks || 0);
    } else if (sortOption === "Date added") {
      return new Date(b.dateAdded || 0).getTime() - new Date(a.dateAdded || 0).getTime();
    }
    return 0;
  });

  // Optimistically hide an agent that's mid-deferred-delete, so the list reflects the pending removal.
  if (pendingDelete) filteredAndSorted = filteredAndSorted.filter((a) => a.id !== pendingDelete.agent.id);

  // Safe fallback list auto selection
  useEffect(() => {
    if (filteredAndSorted.length > 0) {
      const isStillInList = filteredAndSorted.some(ag => ag.id === selectedAgentId);
      if (!isStillInList) {
        setSelectedAgentId(filteredAndSorted[0].id);
      }
    } else {
      setSelectedAgentId(null);
    }
  }, [tabFilter, queryFilter, term, agents.length]);

  const activeAgent = selectedAgentId ? agents.find(ag => ag.id === selectedAgentId) : null;
  const activeAgentQueries = activeAgent ? queries.filter(q => q.agentId === selectedAgentId) : [];

  // ── Lifecycle handlers (chunk 1) ──
  const firstName = (n: string) => n.split(" ")[0];

  // Flip the agent's OWN availability (Open ⇄ Closed). Unknown becomes Open on first flip.
  const flipAvailability = async (agent: Agent) => {
    const next = agent.submissionStatus === SubmissionStatus.OPEN ? SubmissionStatus.CLOSED : SubmissionStatus.OPEN;
    await updateAgent(agent.id, { submissionStatus: next });
    setToastMessage(`${firstName(agent.name)} marked ${next === SubmissionStatus.OPEN ? "open" : "closed"} to queries`);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Set aside / bring back — reversible, with an Undo on the set-aside direction.
  const toggleSetAside = async (agent: Agent) => {
    setDetailMenuOpen(false);
    const next = !agent.setAside;
    await setAgentSetAside(agent.id, next);
    if (next) {
      setUndoToast({
        msg: `${firstName(agent.name)} set aside — history kept, hidden from suggestions`,
        undo: () => { void setAgentSetAside(agent.id, false); setUndoToast(null); },
      });
      setTimeout(() => setUndoToast((t) => (t && t.msg.startsWith(firstName(agent.name)) ? null : t)), 6000);
    } else {
      setToastMessage(`${firstName(agent.name)} back in your active list`);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // ── Deferred delete (undo window) ──
  // Commit for real — the cascade + the durable AGENT_DELETED log both live in db.deleteAgent,
  // so they only ever run here, at commit time (never on click).
  const commitPendingDelete = async () => {
    const p = pendingDeleteRef.current;
    if (!p) return;
    pendingDeleteRef.current = null;
    if (deleteTimerRef.current) { clearTimeout(deleteTimerRef.current); deleteTimerRef.current = null; }
    setPendingDelete(null);
    await deleteAgent(p.agent.id);
  };

  // Confirm pressed (clean Delete / Delete anyway): DON'T delete yet — optimistically hide the agent,
  // reselect a neighbour, and open the undo window. Nothing is written until the window resolves.
  const requestDeleteAgent = (agent: Agent) => {
    setDeleteModalAgent(null);
    setDetailMenuOpen(false);
    const qn = queries.filter((q) => q.agentId === agent.id).length;
    const idx = filteredAndSorted.findIndex((a) => a.id === agent.id);
    const remaining = filteredAndSorted.filter((a) => a.id !== agent.id);
    setSelectedAgentId(remaining.length ? (remaining[Math.min(idx, remaining.length - 1)]?.id ?? remaining[0].id) : null);
    pendingDeleteRef.current = { agent, qn };
    setPendingDelete({ agent, qn });
    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    deleteTimerRef.current = setTimeout(() => { void commitPendingDelete(); }, 7000);
  };

  // Undo: cancel the pending delete — nothing was deleted, so nothing to restore; just un-hide.
  const undoPendingDelete = () => {
    if (deleteTimerRef.current) { clearTimeout(deleteTimerRef.current); deleteTimerRef.current = null; }
    const p = pendingDeleteRef.current;
    pendingDeleteRef.current = null;
    setPendingDelete(null);
    if (p) setSelectedAgentId(p.agent.id);
  };

  return (
    <div
      className="flex-grow bg-[#dce0d9] min-h-0 overflow-hidden w-full flex flex-row p-[8px] gap-[8px]"
      style={{ minHeight: "calc(100vh - 108px)", maxHeight: "calc(100vh - 108px)" }}
    >
      {/* ---------------- panel 1: left sidebar controls ---------------- */}
      <div
        className="bg-white border border-[#e8e0d8] rounded-xl p-[12px] flex flex-col h-full overflow-hidden shrink-0 select-none"
        style={{ width: "15%", minWidth: "15%", maxWidth: "15%", flexShrink: 0 }}
      >
        {/* Add Agent button */}
        <button
          onClick={() => onNavigate?.("agents", "Add an agent")}
          className="w-full h-[36px] bg-[#7c3a2a] hover:bg-[#6c3224] text-white flex items-center justify-center gap-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors mb-3 border-0"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>Add agent</span>
        </button>

        {/* Filters and sorting dividers wrapper */}
        <div className="flex-grow overflow-y-auto space-y-4 pt-1">
          {/* Submission Gate filter */}
          <div className="space-y-1">
            <span className="block text-[10px] font-mono uppercase tracking-wider text-stone-400 font-bold border-b border-[#e8e0d8]/50 pb-0.5 mb-1.5">
              Submission status
            </span>
            <div className="space-y-0.5">
              {[
                { id: "All", label: "All agents", count: agents.length },
                { id: "Open", label: "Open Only", count: agents.filter(a => a.submissionStatus === SubmissionStatus.OPEN).length },
                { id: "Closed", label: "Closed Only", count: agents.filter(a => a.submissionStatus === SubmissionStatus.CLOSED).length }
              ].map(item => {
                const isActive = tabFilter === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setTabFilter(item.id as any)}
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

          {/* Query Status linked filter */}
          <div className="space-y-1">
            <span className="block text-[10px] font-mono uppercase tracking-wider text-stone-400 font-bold border-b border-[#e8e0d8]/50 pb-0.5 mb-1.5">
              Query status
            </span>
            <div className="space-y-0.5">
              {[
                { id: "All", label: "All queried/not", count: agents.length },
                { id: "Queried", label: "Queried", count: agents.filter(ag => queries.some(q => q.agentId === ag.id)).length },
                { id: "Not queried", label: "Not queried", count: agents.filter(ag => !queries.some(q => q.agentId === ag.id)).length }
              ].map(item => {
                const isActive = queryFilter === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setQueryFilter(item.id as any)}
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

          {/* Sort selection indicators */}
          <div className="space-y-1">
            <span className="block text-[10px] font-mono uppercase tracking-wider text-stone-400 font-bold border-b border-[#e8e0d8]/50 pb-0.5 mb-1.5">
              Sort Options
            </span>
            <div className="space-y-0.5">
              {[
                { id: "Star rating", label: "Star rating" },
                { id: "Response time", label: "Response time" },
                { id: "Date added", label: "Date added" }
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
              placeholder="Search agent name / agency..."
              className="w-full pl-8 pr-3 py-1.5 bg-stone-50 rounded-md border border-[#e8e0d8] text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#7c3a2a]"
            />
          </div>
          <span className="block text-[11px] text-stone-400 pl-0.5 font-medium">
            Showing {filteredAndSorted.length} matching agents
          </span>
        </div>

        {/* Vertical Stack List */}
        <div className="flex-grow overflow-y-auto divide-y divide-[#e8e0d8]/40 custom-query-list-scrollbar">
          {filteredAndSorted.length === 0 ? (
            <div className="p-8 text-center text-stone-400 text-xs select-none">
              No matching agents found.
            </div>
          ) : (
            filteredAndSorted.map((agent, i) => {
              const isSelected = selectedAgentId === agent.id;
              const isFirstSetAside = !!agent.setAside && (i === 0 || !filteredAndSorted[i - 1].setAside);

              return (
                <React.Fragment key={agent.id}>
                  {isFirstSetAside && (
                    <div className="px-3 pt-3 pb-1 text-[9px] font-mono uppercase tracking-[0.11em] text-stone-400 select-none">
                      Set aside · hidden from suggestions
                    </div>
                  )}
                <div
                  onClick={() => setSelectedAgentId(agent.id)}
                  className={`p-3 relative cursor-pointer flex flex-col gap-1 transition-all select-none ${
                    isSelected ? "bg-[#FDF8F6]" : "hover:bg-stone-50 bg-white"
                  } ${agent.setAside ? "opacity-60" : ""}`}
                  style={{
                    borderLeft: isSelected ? "3.5px solid #7c3a2a" : "3.5px solid transparent"
                  }}
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-serif text-[14px] font-bold text-[#3a1c14] truncate leading-tight flex-1">
                      {agent.name}
                    </span>
                    {agent.setAside ? (
                      <span className="text-[8px] font-bold font-mono uppercase tracking-[0.04em] px-1.5 py-0.5 rounded-full border shrink-0 bg-stone-100 border-stone-200 text-stone-500">Set aside</span>
                    ) : (
                      <span className={`text-[9px] font-bold font-sans uppercase tracking-[0.03em] px-1.5 py-0.5 rounded border shrink-0 ${
                        agent.submissionStatus === SubmissionStatus.OPEN
                          ? "bg-[#FAF1EF] border-[#EBDCD3]/40 text-[#7c3a2a]"
                          : "bg-stone-50 border-stone-200 text-stone-400"
                      }`}>
                        {agent.submissionStatus}
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] text-stone-400 font-sans leading-none truncate pr-2">
                    {agent.agency || "Independent"}
                  </span>

                  {/* Little matched genres pills */}
                  {agent.genres && agent.genres.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1 max-w-full">
                      {agent.genres.slice(0, 3).map((g, gi) => (
                        <span key={gi} className="bg-stone-50 text-stone-500 text-[8.5px] font-bold px-1.5 py-0.5 rounded border border-stone-200/50 truncate">
                          {g}
                        </span>
                      ))}
                      {agent.genres.length > 3 && (
                        <span className="text-[8.5px] font-bold text-stone-400 pl-0.5">+{agent.genres.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
                </React.Fragment>
              );
            })
          )}
        </div>
      </div>

      {/* ---------------- panel 3: reading pane ---------------- */}
      {!activeAgent ? (
        <div className="bg-white border border-[#e8e0d8] rounded-xl flex-grow flex-1 min-w-0 h-full flex flex-col items-center justify-center p-8 select-none">
          <SlidersHorizontal className="w-8 h-8 text-[#a0a89e]/30 mb-2" />
          <span className="text-stone-500 text-sm font-serif">No Agent Selected</span>
          <span className="text-stone-400 text-xs mt-1 text-center max-w-[280px]">
            Select an agent from the address book list to view their full MSWL, profiling, history, and notes.
          </span>
        </div>
      ) : (
        <div className="bg-white border border-[#e8e0d8] rounded-xl flex-grow flex-1 min-w-0 h-full flex flex-col overflow-hidden">
          {/* 1. TOP CONTROL BAR (Height 44px) */}
          <div className="h-[44px] border-b border-[#e8e0d8] flex items-center px-4 justify-between bg-[#fafafa] shrink-0 select-none">
            {/* Left group controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate?.("queries", "Log a query")}
                className="h-[28px] bg-[#7c3a2a] hover:bg-[#6c3224] text-white flex items-center gap-1.5 px-3.5 rounded-full text-xs font-bold cursor-pointer transition-colors border-0"
              >
                <Plus className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                <span>Send query</span>
              </button>

              <button
                onClick={() => startEditAgent(activeAgent)}
                className="h-[28px] border border-[#e8e0d8] hover:bg-stone-100 bg-white flex items-center gap-1 px-3 rounded-full text-xs text-stone-700 font-medium cursor-pointer transition-colors"
              >
                <Pencil className="w-3 h-3 text-stone-500" />
                <span>Edit profile</span>
              </button>
            </div>

            {/* Center controls: filtered listing previous / next slider */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const idx = filteredAndSorted.findIndex(a => a.id === selectedAgentId);
                  if (idx > 0) {
                    setSelectedAgentId(filteredAndSorted[idx - 1].id);
                  }
                }}
                disabled={filteredAndSorted.findIndex(a => a.id === selectedAgentId) <= 0}
                className="w-7 h-7 hover:bg-stone-100 text-stone-600 rounded flex items-center justify-center cursor-pointer disabled:opacity-30 disabled:hover:bg-transparent"
                title="Previous Agent"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-mono font-bold text-stone-500">
                {filteredAndSorted.findIndex(a => a.id === selectedAgentId) + 1} / {filteredAndSorted.length}
              </span>
              <button
                onClick={() => {
                  const idx = filteredAndSorted.findIndex(a => a.id === selectedAgentId);
                  if (idx >= 0 && idx < filteredAndSorted.length - 1) {
                    setSelectedAgentId(filteredAndSorted[idx + 1].id);
                  }
                }}
                disabled={filteredAndSorted.findIndex(a => a.id === selectedAgentId) >= filteredAndSorted.length - 1}
                className="w-7 h-7 hover:bg-stone-100 text-stone-600 rounded flex items-center justify-center cursor-pointer disabled:opacity-30 disabled:hover:bg-transparent"
                title="Next Agent"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Right group: ⋯ lifecycle menu — Set aside / Bring back · Delete… */}
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
                      onClick={() => toggleSetAside(activeAgent)}
                      className="flex items-center gap-2.5 w-full text-left px-2.5 py-2 rounded-[7px] text-[13px] text-[#3a1c14] hover:bg-[rgba(138,158,136,0.14)] cursor-pointer"
                    >
                      <Archive className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                      {activeAgent.setAside ? "Bring back" : "Set aside"}
                    </button>
                    <div className="h-px bg-[#f0eae2] my-1 mx-1" />
                    <button
                      onClick={() => { setDetailMenuOpen(false); setDeleteModalAgent(activeAgent); }}
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

          {/* INNER SCROLL COLUMN WRAP */}
          <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-stone-50 custom-query-list-scrollbar">
            
            {/* 2. AGENT HEADER CARD (Card 1) */}
            <div className="bg-white border border-[#e8e0d8] rounded-xl p-4 flex flex-col justify-between relative min-h-[135px] shadow-sm select-none">
              {/* Submission status absolute pill in top-right with 10px gap from border */}
              {/* Availability — the agent's OWN status. Clickable to flip (Unknown → Open). */}
              <button
                onClick={() => flipAvailability(activeAgent)}
                title="Click to flip — this is the agent's own availability to queries"
                className={`absolute top-[10px] right-[10px] text-[10px] font-bold uppercase tracking-[0.05em] px-2.5 py-1 border rounded-full cursor-pointer transition-all hover:brightness-95 flex items-center gap-1.5 ${
                  activeAgent.submissionStatus === SubmissionStatus.OPEN
                    ? "bg-[#FAF1EF] text-[#7c3a2a] border-[#EBDCD3]"
                    : activeAgent.submissionStatus === SubmissionStatus.CLOSED
                    ? "bg-[rgba(186,117,23,0.12)] text-[#BA7517] border-[rgba(186,117,23,0.28)]"
                    : "bg-stone-50 text-stone-400 border-stone-200"
                }`}
              >
                <span className="w-[5px] h-[5px] rounded-full" style={{ background: "currentColor" }} />
                {activeAgent.submissionStatus === SubmissionStatus.OPEN
                  ? "Open to queries"
                  : activeAgent.submissionStatus === SubmissionStatus.CLOSED
                  ? "Closed to queries"
                  : "Availability unknown"}
              </button>

              <div className="flex flex-col justify-center pr-[120px]">
                <h2 className="font-serif text-[32px] font-bold text-[#3a1c14] leading-[38px] tracking-tight">
                  {activeAgent.name}
                </h2>
                {activeAgent.agency && (
                  <p className="text-[12.5px] text-[#7c3a2a] leading-snug mt-1 font-medium">
                    {activeAgent.agency} &middot; {activeAgent.email || "No email address logged"}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between mt-3 font-mono text-[11px] text-stone-500 leading-none pb-0.5">
                <div className="flex items-center gap-3">
                  <FitStars value={activeAgent.starRating || 0} size={15} />
                  <span className="text-stone-300">|</span>
                  <span className="flex items-center gap-1 font-sans text-stone-500">
                    Method: <span className="text-stone-700 font-bold">{activeAgent.submissionMethod || "Email"}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* 3. BENTO THREE COLUMN GRID STRETCH WRAP */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-stretch min-h-[460px]">
              
              {/* Card A: Agent Profile */}
              <div className="relative bg-white border border-[#e8e0d8] rounded-xl flex flex-col p-4 pt-8 shadow-sm h-full">
                <span className="absolute top-[-14px] left-1/2 -translate-x-1/2 bg-white border border-[#e8e0d8] py-1 px-4 rounded-full flex items-center gap-1.5 shadow-sm whitespace-nowrap z-10 select-none text-[12px] text-stone-700 font-medium font-sans">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#7c3a2a]" />
                  <span>Agent Profile</span>
                </span>

                <div className="space-y-4 text-xs text-stone-600 mt-2 flex-grow overflow-y-auto max-h-[400px] custom-query-list-scrollbar pr-0.5">
                  {activeAgent.website && (
                    <div>
                      <span className="block text-[9px] font-mono text-stone-400 font-bold uppercase select-none mb-0.5">Website hub</span>
                      <a href={activeAgent.website} referrerPolicy="no-referrer" target="_blank" rel="noreferrer" className="text-[#7c3a2a] hover:underline font-bold break-all">
                        {activeAgent.website}
                      </a>
                    </div>
                  )}

                  {(() => {
                    const socials = displaySocials(activeAgent);
                    if (!socials.length) return null;
                    return (
                      <div>
                        <span className="block text-[9px] font-mono text-stone-400 font-bold uppercase select-none mb-0.5">Socials</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {socials.map((s, si) => {
                            const href = socialHref(s.handle);
                            const cls = "inline-flex items-center gap-1 bg-[#FAF1EF] text-[#7c3a2a] border border-[#EBDCD3] text-[10px] font-semibold px-2 py-0.5 rounded-full max-w-full";
                            const inner = <><span className="font-bold">{s.platform}</span><span className="text-stone-400">·</span><span className="truncate">{s.handle}</span></>;
                            return href ? (
                              <a key={si} href={href} referrerPolicy="no-referrer" target="_blank" rel="noreferrer" className={`${cls} hover:bg-[#f5e2da]`}>{inner}</a>
                            ) : (
                              <span key={si} className={cls}>{inner}</span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  <div>
                    <span className="block text-[9px] font-mono text-stone-400 font-bold uppercase select-none mb-0.5">Response time</span>
                    <span className="text-stone-700 font-semibold font-sans">
                      within {activeAgent.responseTimeWeeks || 6} weeks
                      {activeAgent.noResponseMeansNo && <span className="text-stone-400 font-normal"> (Silence means pass)</span>}
                    </span>
                  </div>

                  {activeAgent.agentNotes && activeAgent.agentNotes.trim() && (
                    <div>
                      <span className="block text-[9px] font-mono text-stone-400 font-bold uppercase select-none mb-0.5">Response policy</span>
                      <span className="text-stone-700 font-semibold font-sans">{activeAgent.agentNotes}</span>
                    </div>
                  )}

                  {activeAgent.genres && activeAgent.genres.length > 0 && (
                    <div>
                      <span className="block text-[9px] font-mono text-stone-400 font-bold uppercase select-none mb-0.5">Matched Genres</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {activeAgent.genres.map((g, gi) => (
                          <span key={gi} className="bg-stone-50 border border-stone-200 text-stone-650 text-[9.5px] font-semibold px-2 py-0.5 rounded-full select-none">
                            {g}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeAgent.materialsWanted && (
                    <div>
                      <span className="block text-[9px] font-mono text-stone-400 font-bold uppercase select-none mb-0.5">Wanted Materials</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(Array.isArray(activeAgent.materialsWanted)
                          ? activeAgent.materialsWanted
                          : Object.keys(activeAgent.materialsWanted || {}).filter(k => (activeAgent.materialsWanted as any)[k] === true)
                        ).map((mat, mi) => (
                          <span key={mi} className="bg-[#FAF1EF] text-[#7c3a2a] border border-[#EBDCD3]/30 text-[9.5px] font-semibold px-2 py-0.5 rounded-full select-none">
                            {mat}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeAgent.mswlNotes && (
                    <div className="border-t border-stone-100 pt-3">
                      <span className="block text-[9px] font-mono text-stone-400 font-bold uppercase select-none mb-1">MSWL Wishlist / Notes</span>
                      <p className="text-stone-600 leading-relaxed font-sans text-[11.5px] whitespace-pre-wrap max-h-[170px] overflow-y-auto custom-query-list-scrollbar">
                        "{activeAgent.mswlNotes}"
                      </p>
                    </div>
                  )}

                  {activeAgent.requeryPreference && (
                    <div className="border-t border-stone-100 pt-3">
                      <span className="block text-[9px] font-mono text-stone-400 font-bold uppercase select-none mb-1">Query again?</span>
                      <span
                        className="inline-flex items-center gap-1.5 py-[3px] px-[10px] rounded-full text-[11px] font-medium font-sans border"
                        style={
                          activeAgent.requeryPreference === "no"
                            ? { background: "#FAF1EF", color: "#7c3a2a", borderColor: "#e8d5cc" }
                            : activeAgent.requeryPreference === "yes"
                            ? { background: "#EEF3EC", color: "#4a6741", borderColor: "#d2e0cc" }
                            : { background: "#FBF6EC", color: "#8a6d2f", borderColor: "#ece0c6" }
                        }
                      >
                        {activeAgent.requeryPreference === "yes"
                          ? "Yes — open to querying again"
                          : activeAgent.requeryPreference === "maybe"
                          ? "Maybe — keep watching"
                          : "No — not the right fit"}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card B: Query History */}
              <div className="relative bg-white border border-[#e8e0d8] rounded-xl flex flex-col p-4 pt-8 shadow-sm h-full">
                <span className="absolute top-[-14px] left-1/2 -translate-x-1/2 bg-white border border-[#e8e0d8] py-1 px-4 rounded-full flex items-center gap-1.5 shadow-sm whitespace-nowrap z-10 select-none text-[12px] text-stone-700 font-medium font-sans">
                  <Clock className="w-3.5 h-3.5 text-[#7c3a2a]" />
                  <span>Query History</span>
                </span>

                <div className="space-y-3.5 mt-2 flex-grow overflow-y-auto max-h-[400px] custom-query-list-scrollbar pr-0.5">
                  {activeAgentQueries.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400 text-xs select-none">
                      <Send className="w-6 h-6 text-stone-300 mb-1.5" />
                      <span>No active queries sent yet.</span>
                      <p className="text-[10px] text-stone-400/80 mt-1 leading-normal">
                        Ready to query {activeAgent.name}? Tap Send Query above!
                      </p>
                    </div>
                  ) : (
                    [...activeAgentQueries]
                      .sort((a,b)=> new Date(b.dateSent).getTime() - new Date(a.dateSent).getTime())
                      .map(query => {
                        const ms = manuscripts.find(m => m.id === query.manuscriptId);
                        return (
                          <div key={query.id} className="p-3 bg-stone-50 border border-stone-100 rounded-lg flex flex-col gap-1.5 hover:border-[#EBDCD3]/40 transition-all select-none">
                            <div className="flex justify-between items-start gap-1">
                              <span className="font-serif font-bold text-stone-850 text-[12.5px] leading-tight break-words flex-1 pr-1">
                                {ms?.title || "Untitled draft"}
                              </span>
                              <div className="scale-75 origin-right shrink-0">
                                <StatusPill status={query.status} />
                              </div>
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-stone-400 font-mono mt-0.5">
                              <span>Sent: {new Date(query.dateSent).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
                              <span>{query.sendMethod || "Email"}</span>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>

              {/* Card C: Notes */}
              <div className="relative bg-white border border-[#e8e0d8] rounded-xl flex flex-col pt-[30px] pr-[14px] pb-[14px] pl-[14px] shadow-sm h-full min-h-[350px]">
                {/* Overlapping Pill Header - Notes */}
                <span className="absolute top-[-14px] left-1/2 -translate-x-1/2 bg-[#fdf8f6] border border-[#d1d5db] py-[5px] px-[16px] rounded-full flex items-center gap-1.5 shadow-sm whitespace-nowrap z-10 select-none text-[12px] text-black shrink-0">
                  <Notebook className="w-3.5 h-3.5 text-black" />
                  <span className="text-black text-[13px] font-normal">Notes</span>
                </span>

                {/* WhatsApp-style messaging box with specific background */}
                <div className="flex-grow flex flex-col justify-between p-3.5 h-full bg-[#FAF8F5] rounded-xl border border-[#ebd8c5]/40 mt-3.5">
                  {/* Chat Messages scroll area with custom scrollbars */}
                  <div
                    className="flex-grow overflow-y-auto max-h-[250px] pr-1 space-y-2 flex flex-col custom-query-list-scrollbar"
                    style={{ backgroundColor: "transparent" }}
                  >
                    {agentNotesList.length === 0 ? (
                      <div className="flex-grow flex flex-col items-center justify-center text-center py-8 px-4 h-full my-auto select-none">
                        <div className="w-10 h-10 rounded-full bg-white/85 flex items-center justify-center mb-2 shadow-xs">
                          <Send className="w-4 h-4 text-stone-400 rotate-45 -translate-x-[1px]" />
                        </div>
                        <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider font-mono">Notes Journal</span>
                        <p className="text-[11px] text-stone-400 mt-1 max-w-[180px] leading-snug font-sans">
                          Send notes on phone calls, meeting updates, or private research details here.
                        </p>
                      </div>
                    ) : (
                      agentNotesList.map((note) => (
                        <div
                          key={note.id}
                          className="relative group max-w-[85%] bg-white text-[#3a1c14] rounded-[15px] pl-[15px] pr-[15px] py-2 shadow-sm text-[11.5px] leading-relaxed text-left self-start animate-fade-in"
                          style={{ borderStyle: "none", borderWidth: "0px" }}
                        >
                          <p className="break-words font-sans text-[#3a1c14] whitespace-pre-wrap text-left pr-1 font-medium leading-normal">{note.text}</p>
                          <div className="text-[9px] text-[#8c706d] text-left mt-1 select-none font-mono flex items-center justify-start gap-1 font-light leading-none">
                            <span>{note.createdAt ? formatWhatsAppDate(note.createdAt) : "Just now"}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Notes Input Field row */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAddAgentNote(noteInput);
                    }}
                    className="p-1 px-2 border rounded-lg bg-white flex items-center justify-between gap-1 shrink-0 mt-3"
                    style={{ borderColor: "#ebd8c5" }}
                  >
                    <input
                      type="text"
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      placeholder="Send a note..."
                      className="flex-grow bg-transparent text-xs p-1 outline-none text-stone-750 focus:ring-0 placeholder-stone-400"
                    />
                    <button
                      type="submit"
                      disabled={!noteInput.trim()}
                      className="w-[22px] h-[22px] rounded-full bg-[#7c3d3d] hover:bg-[#6c3224] flex items-center justify-center text-white cursor-pointer active:scale-95 transition-all shrink-0 p-0 disabled:bg-stone-200 disabled:cursor-not-allowed border-0"
                    >
                      <Send className="w-3 h-3 rotate-[330deg] text-white shrink-0 mr-[1px] mb-[1px]" />
                    </button>
                  </form>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ---------------- TOAST hud ---------------- */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-[999] bg-stone-900 text-white rounded-lg py-3 px-5 text-xs font-bold shadow-lg flex items-center gap-2"
          >
            <Check className="w-4 h-4 text-emerald-500 stroke-[3]" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------------- UNDO TOAST (set aside / bring back — instant flag-flip) ---------------- */}
      <AnimatePresence>
        {undoToast && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[999] bg-stone-900 text-white rounded-lg py-3 px-5 text-xs font-medium shadow-lg flex items-center gap-3"
          >
            <span>{undoToast.msg}</span>
            <button onClick={undoToast.undo} className="text-[#e8c89a] underline font-mono text-[11px] cursor-pointer">Undo</button>
            <button onClick={() => setUndoToast(null)} title="Dismiss" aria-label="Dismiss" className="text-stone-400 hover:text-white cursor-pointer shrink-0"><X className="w-3.5 h-3.5" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------------- DEFERRED-DELETE TOAST (Agent deleted · Undo · ✕) ---------------- */}
      <AnimatePresence>
        {pendingDelete && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[1000] bg-stone-900 text-white rounded-lg py-3 px-5 text-xs font-medium shadow-lg flex items-center gap-3"
          >
            <span>Agent deleted</span>
            <button onClick={undoPendingDelete} className="text-[#e8c89a] underline font-mono text-[11px] cursor-pointer">Undo</button>
            <button onClick={() => { void commitPendingDelete(); }} title="Dismiss now" aria-label="Dismiss now" className="text-stone-400 hover:text-white cursor-pointer shrink-0"><X className="w-3.5 h-3.5" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------------- GUARDED DELETE MODAL ---------------- */}
      {deleteModalAgent && (() => {
        const a = deleteModalAgent;
        const qn = queries.filter((q) => q.agentId === a.id).length;
        const guarded = qn > 0;
        return (
          <div className="fixed inset-0 bg-stone-950/40 backdrop-blur-sm flex items-center justify-center p-5 z-[999]" onClick={() => setDeleteModalAgent(null)}>
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#fdfaf5] rounded-[15px] w-[min(440px,94vw)] shadow-2xl overflow-hidden relative"
            >
              <div className="p-6">
                {guarded ? (
                  <>
                    <div className="w-[42px] h-[42px] rounded-[11px] bg-[rgba(186,117,23,0.12)] text-[#BA7517] flex items-center justify-center mb-3.5">
                      <PauseCircle className="w-5 h-5" />
                    </div>
                    <h3 className="font-serif text-[19px] leading-tight mb-2.5 text-[#3a1c14]">
                      {a.name} has {qn} quer{qn > 1 ? "ies" : "y"} in your pipeline
                    </h3>
                    <p className="text-[13.5px] font-light leading-relaxed text-[rgba(58,28,20,0.72)]">
                      Deleting {firstName(a.name)} would also erase those <b className="text-[#7c3a2a] font-medium">{qn} quer{qn > 1 ? "ies" : "y"}</b> from the manuscripts they belong to — losing that part of your record. <b className="text-[#7c3a2a] font-medium">Set them aside</b> instead: they vanish from suggestions but the history stays, and you can bring them back.
                    </p>
                    <div className="flex items-center gap-2.5 mt-5 flex-wrap">
                      <button onClick={() => { setDeleteModalAgent(null); toggleSetAside(a); }} className="font-mono text-[11px] rounded-[9px] py-2.5 px-4 bg-[#f5e2da] text-[#7c3a2a] border-[0.5px] border-[#e8c8bc] hover:bg-[#efd5ca] cursor-pointer">Set aside</button>
                      <button onClick={() => setDeleteModalAgent(null)} className="font-mono text-[11px] rounded-[9px] py-2.5 px-4 text-stone-500 hover:text-[#3a1c14] cursor-pointer">Cancel</button>
                      <button onClick={() => requestDeleteAgent(a)} className="ml-auto font-mono text-[10.5px] text-[#a8442f] opacity-80 hover:opacity-100 hover:underline cursor-pointer p-2">Delete anyway</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-[42px] h-[42px] rounded-[11px] bg-[rgba(168,68,47,0.12)] text-[#a8442f] flex items-center justify-center mb-3.5">
                      <Trash2 className="w-5 h-5" />
                    </div>
                    <h3 className="font-serif text-[19px] leading-tight mb-2.5 text-[#3a1c14]">Delete {a.name}?</h3>
                    <p className="text-[13.5px] font-light leading-relaxed text-[rgba(58,28,20,0.72)]">
                      They have <b className="text-[#7c3a2a] font-medium">no queries</b>, so nothing else is affected — this just removes them from your agent database.
                    </p>
                    <div className="flex items-center gap-2.5 mt-5">
                      <button onClick={() => requestDeleteAgent(a)} className="font-mono text-[11px] rounded-[9px] py-2.5 px-4 bg-[#a8442f] text-white hover:brightness-110 cursor-pointer">Delete</button>
                      <button onClick={() => setDeleteModalAgent(null)} className="font-mono text-[11px] rounded-[9px] py-2.5 px-4 text-stone-500 hover:text-[#3a1c14] cursor-pointer">Cancel</button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        );
      })()}

      {/* ---------------- COMPREHENSIVE DIALOGUE MODAL EDIT PROFILE ---------------- */}
      <AnimatePresence>
        {editingAgent && (
          <div className="fixed inset-0 bg-stone-950/40 backdrop-blur-sm flex items-center justify-center p-4 z-[999]" id="edit-agent-modal-overlay">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[85vh] overflow-y-auto border border-[#FAF1EF]"
            >
              {/* Modal header */}
              <div className="p-4 border-b border-[#FAF1EF] flex justify-between items-center bg-[#FAF8F5]">
                <h4 style={{ fontFamily: "var(--font-serif, Georgia, serif)" }} className="text-base font-bold text-[#3a1c14]">
                  Edit Agent Details
                </h4>
                <button
                  onClick={() => setEditingAgent(null)}
                  className="text-stone-400 hover:text-stone-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Edit forms */}
              <form onSubmit={handleUpdateAgentSubmit} className="p-5 space-y-4 text-xs text-left">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-stone-500 mb-1">Agent Name</label>
                    <input
                      required
                      type="text"
                      value={editingAgent.name}
                      onChange={(e) => setEditingAgent({ ...editingAgent, name: e.target.value })}
                      className="w-full text-xs p-2 bg-white rounded border border-[#e8d5cc] focus:ring-1 focus:ring-[#7c3a2a] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-stone-500 mb-1">Agency Name</label>
                    <input
                      required
                      type="text"
                      value={editingAgent.agency}
                      onChange={(e) => setEditingAgent({ ...editingAgent, agency: e.target.value })}
                      className="w-full text-xs p-2 bg-white rounded border border-[#e8d5cc] focus:ring-1 focus:ring-[#7c3a2a] outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-stone-500 mb-1">Email address</label>
                    <input
                      type="email"
                      value={editingAgent.email || ""}
                      onChange={(e) => setEditingAgent({ ...editingAgent, email: e.target.value })}
                      className="w-full text-xs p-2 bg-white rounded border border-[#e8d5cc] focus:ring-1 focus:ring-[#7c3a2a] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-stone-500 mb-1">Website URL</label>
                    <input
                      type="url"
                      value={editingAgent.website || ""}
                      onChange={(e) => setEditingAgent({ ...editingAgent, website: e.target.value })}
                      className="w-full text-xs p-2 bg-white rounded border border-[#e8d5cc] focus:ring-1 focus:ring-[#7c3a2a] outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-stone-500 mb-1">Status</label>
                    <select
                      value={editingAgent.submissionStatus}
                      onChange={(e) => setEditingAgent({ ...editingAgent, submissionStatus: e.target.value as SubmissionStatus })}
                      className="w-full text-xs p-2 bg-white rounded border border-[#e8d5cc] outline-none focus:ring-1 focus:ring-[#7c3a2a]"
                    >
                      <option value={SubmissionStatus.OPEN}>Open</option>
                      <option value={SubmissionStatus.CLOSED}>Closed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-stone-500 mb-1">Rating</label>
                    <select
                      value={editingAgent.starRating}
                      onChange={(e) => setEditingAgent({ ...editingAgent, starRating: parseInt(e.target.value) as any })}
                      className="w-full text-xs p-2 bg-white rounded border border-[#e8d5cc] outline-none focus:ring-1 focus:ring-[#7c3a2a]"
                    >
                      <option value="5">Dream Agent (5★)</option>
                      <option value="4">Strong match (4★)</option>
                      <option value="3">Decent fit (3★)</option>
                      <option value="2">Average fit (2★)</option>
                      <option value="1">Reserve list (1★)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-stone-500 mb-1">Genres Looked For (Comma-separated)</label>
                  <input
                    type="text"
                    value={editingAgent.genres ? editingAgent.genres.join(", ") : ""}
                    onChange={(e) => setEditingAgent({ ...editingAgent, genres: e.target.value.split(",").map(val => val.trim()).filter(val => val !== "") })}
                    placeholder="e.g. Literary Fiction, Fantasy, YA"
                    className="w-full text-xs p-2 bg-white rounded border border-[#e8d5cc] outline-none focus:ring-1 focus:ring-[#7c3a2a]"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-stone-500 mb-1">Submission Method</label>
                    <select
                      value={editingAgent.submissionMethod || "Email"}
                      onChange={(e) => setEditingAgent({ ...editingAgent, submissionMethod: e.target.value as SubmissionMethod })}
                      className="w-full text-xs p-2 bg-white rounded border border-[#e8d5cc] outline-none focus:ring-1 focus:ring-[#7c3a2a]"
                    >
                      <option value={SubmissionMethod.EMAIL}>Email</option>
                      <option value={SubmissionMethod.ONLINE_FORM}>Online Form / QueryManager</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-stone-500 mb-1">Response Time (weeks)</label>
                    <input
                      type="number"
                      min="1"
                      value={editingAgent.responseTimeWeeks || 6}
                      onChange={(e) => setEditingAgent({ ...editingAgent, responseTimeWeeks: parseInt(e.target.value) || 6 })}
                      className="w-full text-xs p-2 bg-white rounded border border-[#e8d5cc] outline-none focus:ring-1 focus:ring-[#7c3a2a]"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 py-1 cursor-pointer select-none font-semibold">
                  <input
                    id="no-response-toggle"
                    type="checkbox"
                    checked={editingAgent.noResponseMeansNo}
                    onChange={(e) => setEditingAgent({ ...editingAgent, noResponseMeansNo: e.target.checked })}
                    className="rounded text-[#7c3a2a]"
                  />
                  <label htmlFor="no-response-toggle">Silence policy means pass ("no response means no")</label>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-stone-500 mb-1">Manuscript wishlist text / MSWL</label>
                  <textarea
                    value={editingAgent.mswlNotes || ""}
                    onChange={(e) => setEditingAgent({ ...editingAgent, mswlNotes: e.target.value })}
                    placeholder="Look up their wishlist for specific queries cues..."
                    className="w-full text-xs p-2 bg-white rounded border border-[#e8d5cc] outline-none focus:ring-1 focus:ring-[#7c3a2a] min-h-[60px]"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-4 border-t border-[#FAF1EF]">
                  <button
                    type="button"
                    onClick={() => setEditingAgent(null)}
                    className="bg-stone-200 text-stone-700 text-[10px] font-bold uppercase tracking-wider px-4 py-2 rounded-full cursor-pointer leading-normal border-0"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-[#7c3a2a] text-[#F8F5F0] text-[10px] font-bold uppercase tracking-wider px-4 py-2 rounded-full cursor-pointer leading-normal border-0"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
