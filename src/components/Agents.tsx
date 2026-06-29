/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { useScriptAllyDb } from "../lib/db";
import { Agent, AgentSocial, SubmissionStatus, QueryStatus } from "../types";
import { db, handleFirestoreError, OperationType } from "../lib/firebase"; // Required for setting doc in online Mode
import { collection, setDoc, doc, onSnapshot } from "firebase/firestore";
import {
  Search,
  Clock,
  ChevronDown,
  Check,
  Plus,
  Pencil,
  SlidersHorizontal,
  FolderLock,
  Send,
  Star,
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
import { useOpenEditAgent } from "./EditAgentHost";

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

/**
 * Agents-page content palette — SCOPED here (inline styles), deliberately NOT global tokens. The
 * left controls/nav sidebar keeps the existing HOUSE palette (burgundy); only the contact-list
 * content area uses this charcoal/sage scheme.
 */
const CC = {
  bg: "#f2f0ec",
  card: "#fcfbf9",
  primary: "#2d2a26",
  accent: "#e4eae0",
  green: "#6f8161",
  muted: "#8a857c",
  hair: "rgba(45,42,38,0.11)",
  avatarBg: "#f8ece6",
  avatarInk: "#1c1a16",
};

/** Up-to-two-letter initials for the avatar circle. */
const agentInitials = (name: string) =>
  (name || "").trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";

/** Sage section header used inside the expanded card (MSWL band + the three cards). */
const SageHeader: React.FC<{ icon?: React.ReactNode; children: React.ReactNode }> = ({ icon, children }) => (
  <div
    className="flex items-center gap-1.5 px-3.5 py-2 text-[10px] font-mono font-bold uppercase tracking-[0.1em]"
    style={{ background: CC.accent, color: CC.primary, borderBottom: `1px solid ${CC.hair}` }}
  >
    {icon}
    <span>{children}</span>
  </div>
);

/** Five stars, filled = sage; reads the agent's 1–5 rating. */
const SageStars: React.FC<{ value: number; size?: number }> = ({ value, size = 14 }) => (
  <span className="inline-flex items-center gap-[3px]" aria-label={`${value} of 5`}>
    {[1, 2, 3, 4, 5].map((n) => (
      <Star
        key={n}
        style={{ width: size, height: size, color: CC.green, fill: n <= value ? CC.green : "transparent" }}
        strokeWidth={1.6}
      />
    ))}
  </span>
);

export const Agents: React.FC<AgentsProps> = ({ searchQuery, onNavigate }) => {
  const openEditAgent = useOpenEditAgent();
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

  // Edit Agent drawer is now an APP-LEVEL overlay (EditAgentHost) opened via openEditAgent(id) — no
  // route change, scroll preserved. "Edit profile" + the dashboard to-do both call it.

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

  // Accordion: `selectedAgentId` is the single OPEN row (null = all collapsed). Don't auto-open;
  // just collapse if the open agent drops out of the filtered list.
  useEffect(() => {
    if (selectedAgentId && !filteredAndSorted.some(ag => ag.id === selectedAgentId)) {
      setSelectedAgentId(null);
    }
  }, [tabFilter, queryFilter, term, agents.length, selectedAgentId, filteredAndSorted]);

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
      className="flex-grow min-h-0 overflow-hidden w-full flex flex-row p-[8px] gap-[8px]"
      style={{ background: CC.bg, minHeight: "calc(100vh - 108px)", maxHeight: "calc(100vh - 108px)" }}
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

      {/* ---------------- content: full-width contact list (accordion) ---------------- */}
      <div className="flex-grow flex-1 min-w-0 h-full flex flex-col rounded-xl overflow-hidden border" style={{ borderColor: CC.hair, background: CC.bg }}>
        {/* scoped hover/focus that inline styles can't express (classes are agx-* — no global clash) */}
        <style>{`
          .agx-card { transition: box-shadow .15s ease; }
          .agx-card:hover { box-shadow: 0 6px 18px rgba(45,42,38,0.10); }
          .agx-row:hover { background: ${CC.accent} !important; }
          .agx-search:focus { border-color: ${CC.green} !important; box-shadow: 0 0 0 2px rgba(111,129,97,0.16); }
          .agx-note-send:disabled { opacity: .4; cursor: not-allowed; }
        `}</style>

        {/* search + count */}
        <div className="px-4 py-3 flex items-center gap-3 shrink-0 border-b" style={{ borderColor: CC.hair }}>
          <div className="relative flex-1" style={{ maxWidth: 440 }}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: CC.muted }} />
            <input
              type="text"
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
              placeholder="Search agent name or agency…"
              className="agx-search w-full pl-9 pr-3 py-2 rounded-lg text-[13px] outline-none"
              style={{ background: CC.card, border: `1px solid ${CC.hair}`, color: CC.primary }}
            />
          </div>
          <span className="text-[11px] font-medium select-none" style={{ color: CC.muted }}>
            Showing {filteredAndSorted.length} {filteredAndSorted.length === 1 ? "agent" : "agents"}
          </span>
        </div>

        {/* the list */}
        <div className="flex-grow overflow-y-auto custom-query-list-scrollbar p-3" style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {filteredAndSorted.length === 0 ? (
            <div className="py-16 text-center text-[13px] select-none" style={{ color: CC.muted }}>No matching agents found.</div>
          ) : (
            filteredAndSorted.map((agent, i) => {
              const expanded = selectedAgentId === agent.id;
              const isOpen = agent.submissionStatus === SubmissionStatus.OPEN;
              const isClosed = agent.submissionStatus === SubmissionStatus.CLOSED;
              const isQueried = queries.some((q) => q.agentId === agent.id);
              const agentQ = queries.filter((q) => q.agentId === agent.id);
              const isFirstSetAside = !!agent.setAside && (i === 0 || !filteredAndSorted[i - 1].setAside);
              const socials = displaySocials(agent);
              const labelStyle: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: CC.muted, marginBottom: 3 };
              const matPill: React.CSSProperties = { fontSize: 10, padding: "2px 8px", borderRadius: 999, background: CC.accent, color: CC.primary };
              return (
                <React.Fragment key={agent.id}>
                  {isFirstSetAside && (
                    <div className="px-1 pt-1 text-[9px] font-mono uppercase tracking-[0.11em] select-none" style={{ color: CC.muted }}>
                      Set aside · hidden from suggestions
                    </div>
                  )}
                  <div className="agx-card rounded-[14px]" style={{
                    background: CC.card,
                    border: `1px solid ${CC.hair}`,
                    boxShadow: expanded ? "0 6px 20px rgba(45,42,38,0.10)" : "0 1px 2px rgba(45,42,38,0.05)",
                    opacity: agent.setAside ? 0.62 : 1,
                  }}>
                    {/* ── collapsed row (click to expand/collapse) ── */}
                    <button
                      type="button"
                      onClick={() => setSelectedAgentId(expanded ? null : agent.id)}
                      className="agx-row w-full text-left rounded-[14px]"
                      aria-expanded={expanded}
                      style={{ display: "grid", gridTemplateColumns: "44px minmax(150px,1.5fr) minmax(0,1.1fr) auto auto auto 18px", alignItems: "center", gap: 16, padding: "15px 22px", background: "transparent", border: "none", cursor: "pointer" }}
                    >
                      <span className="flex items-center justify-center rounded-full shrink-0 select-none" style={{ width: 44, height: 44, background: CC.avatarBg, color: CC.avatarInk, fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: 15 }}>
                        {agentInitials(agent.name)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate" style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 600, color: CC.primary, lineHeight: 1.15 }}>{agent.name || "Unnamed agent"}</span>
                        <span className="block truncate" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: CC.muted, marginTop: 2 }}>{agent.agency || "Independent"}</span>
                      </span>
                      <span className="hidden md:flex flex-wrap gap-1 min-w-0 items-center">
                        {(agent.genres || []).slice(0, 3).map((g, gi) => (
                          <span key={gi} className="truncate" style={{ fontSize: 10.5, padding: "2px 8px", borderRadius: 999, background: CC.bg, border: `1px solid ${CC.hair}`, color: CC.muted }}>{g}</span>
                        ))}
                        {(agent.genres?.length || 0) > 3 && <span style={{ fontSize: 10.5, color: CC.muted }}>+{agent.genres!.length - 3}</span>}
                      </span>
                      <span className="hidden sm:inline-flex shrink-0"><SageStars value={agent.starRating || 0} /></span>
                      <span className="inline-flex items-center gap-1.5 shrink-0" style={{ fontSize: 11, fontWeight: 600, color: isOpen ? CC.green : CC.muted }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: isOpen ? CC.green : "#b9b4ab", flexShrink: 0 }} />
                        {isOpen ? "Open" : isClosed ? "Closed" : "Unknown"}
                      </span>
                      {isQueried ? (
                        <span className="inline-flex items-center gap-1.5 shrink-0" style={{ fontSize: 10.5, fontWeight: 600, padding: "3px 10px", borderRadius: 999, background: CC.accent, color: CC.primary }}>
                          <Send className="w-3 h-3" /> Queried
                        </span>
                      ) : (
                        <span className="inline-flex items-center shrink-0 select-none" style={{ fontSize: 10.5, fontWeight: 600, padding: "3px 10px", borderRadius: 999, background: "transparent", border: `1px solid ${CC.hair}`, color: CC.muted }}>
                          Not queried
                        </span>
                      )}
                      <ChevronDown className="w-[18px] h-[18px] shrink-0 transition-transform" style={{ color: CC.muted, transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }} />
                    </button>

                    {/* ── expanded detail ── */}
                    {expanded && (
                      <div style={{ borderTop: `1px solid ${CC.hair}` }} className="animate-fade-in">
                        {/* 1. header strip */}
                        <div className="flex items-start justify-between gap-4 flex-wrap px-[22px] py-[18px]" style={{ background: CC.bg }}>
                          <div className="flex items-start gap-3.5 min-w-0">
                            <span className="flex items-center justify-center rounded-full shrink-0 select-none" style={{ width: 58, height: 58, background: CC.avatarBg, color: CC.avatarInk, fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: 21 }}>
                              {agentInitials(agent.name)}
                            </span>
                            <div className="min-w-0">
                              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 600, color: CC.primary, lineHeight: 1.1 }}>{agent.name || "Unnamed agent"}</div>
                              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: CC.muted, marginTop: 3 }}>{agent.agency || "Independent"}</div>
                              {agent.email && <div style={{ fontSize: 12.5, color: CC.primary, marginTop: 5 }} className="break-all">{agent.email}</div>}
                              {(agent.genres?.length || 0) > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {agent.genres!.map((g, gi) => <span key={gi} style={{ fontSize: 10.5, padding: "2px 8px", borderRadius: 999, background: CC.card, border: `1px solid ${CC.hair}`, color: CC.muted }}>{g}</span>)}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                            <button type="button" onClick={() => flipAvailability(agent)} title="Click to flip — the agent's own availability"
                              className="inline-flex items-center gap-1.5 cursor-pointer"
                              style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", padding: "6px 12px", borderRadius: 999, background: isOpen ? CC.accent : "transparent", border: `1px solid ${isOpen ? "transparent" : CC.hair}`, color: isOpen ? CC.green : CC.muted }}>
                              <span style={{ width: 6, height: 6, borderRadius: "50%", background: isOpen ? CC.green : "#b9b4ab" }} />
                              {isOpen ? "Open to queries" : isClosed ? "Closed" : "Availability unknown"}
                            </button>
                            <button type="button" onClick={() => onNavigate?.("queries", "Log a query")}
                              className="inline-flex items-center gap-1.5 cursor-pointer"
                              style={{ fontSize: 12, fontWeight: 600, padding: "7px 14px", borderRadius: 8, background: CC.primary, color: "#fcfbf9", border: "none" }}>
                              <Send className="w-3.5 h-3.5" /> Send query
                            </button>
                            <button type="button" onClick={() => openEditAgent(agent.id)}
                              className="inline-flex items-center gap-1.5 cursor-pointer"
                              style={{ fontSize: 12, fontWeight: 600, padding: "7px 14px", borderRadius: 8, background: "transparent", color: CC.primary, border: `1px solid ${CC.hair}` }}>
                              <Pencil className="w-3.5 h-3.5" /> Edit profile
                            </button>
                            <div className="relative">
                              <button type="button" onClick={(e) => { e.stopPropagation(); setDetailMenuOpen((o) => !o); }} aria-label="More actions"
                                style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${CC.hair}`, background: "transparent", color: CC.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                              {detailMenuOpen && (
                                <>
                                  <div className="fixed inset-0 z-30" onClick={() => setDetailMenuOpen(false)} />
                                  <div className="absolute right-0 top-[36px] z-40 rounded-[11px] p-1.5" style={{ minWidth: 180, background: CC.card, border: `1px solid ${CC.hair}`, boxShadow: "0 12px 30px rgba(45,42,38,0.16)" }}>
                                    <button onClick={() => toggleSetAside(agent)} className="flex items-center gap-2.5 w-full text-left px-2.5 py-2 rounded-[7px] hover:bg-[rgba(111,129,97,0.12)]" style={{ fontSize: 13, color: CC.primary }}>
                                      <Archive className="w-3.5 h-3.5 shrink-0" style={{ color: CC.muted }} /> {agent.setAside ? "Bring back" : "Set aside"}
                                    </button>
                                    <div style={{ height: 1, background: CC.hair, margin: "4px 4px" }} />
                                    <button onClick={() => { setDetailMenuOpen(false); setDeleteModalAgent(agent); }} className="flex items-center gap-2.5 w-full text-left px-2.5 py-2 rounded-[7px] hover:bg-[rgba(168,68,47,0.08)]" style={{ fontSize: 13, color: "#a8442f" }}>
                                      <Trash2 className="w-3.5 h-3.5 shrink-0" /> Delete…
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 2. MSWL band */}
                        <div style={{ borderTop: `1px solid ${CC.hair}` }}>
                          <SageHeader icon={<Book className="w-3 h-3" />}>Manuscript wish list · MSWL</SageHeader>
                          <div className="px-[22px] py-[14px]">
                            {agent.mswlNotes && agent.mswlNotes.trim() ? (
                              <p style={{ fontSize: 13, lineHeight: 1.6, color: CC.primary, fontStyle: "italic", whiteSpace: "pre-wrap" }}>&ldquo;{agent.mswlNotes}&rdquo;</p>
                            ) : (
                              <p style={{ fontSize: 12.5, color: CC.muted }}>
                                No wish list recorded yet — add one via{" "}
                                <button type="button" onClick={() => openEditAgent(agent.id)} style={{ color: CC.primary, fontWeight: 600, background: "none", border: "none", padding: 0, cursor: "pointer", textDecoration: "underline" }}>Edit profile</button>.
                              </p>
                            )}
                          </div>
                        </div>

                        {/* 3. three cards */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 p-[14px]" style={{ background: CC.bg, borderTop: `1px solid ${CC.hair}` }}>
                          {/* Agent profile */}
                          <div className="rounded-[12px] overflow-hidden flex flex-col" style={{ background: CC.card, border: `1px solid ${CC.hair}` }}>
                            <SageHeader icon={<SlidersHorizontal className="w-3 h-3" />}>Agent profile</SageHeader>
                            <div className="p-3.5 space-y-3 text-[12px]" style={{ color: CC.primary }}>
                              <div>
                                <div style={labelStyle}>Response time</div>
                                <div>within {agent.responseTimeWeeks || 6} weeks{agent.noResponseMeansNo && <span style={{ color: CC.muted }}> · silence means pass</span>}</div>
                              </div>
                              <div>
                                <div style={labelStyle}>Preferred method</div>
                                <div>{agent.submissionMethod || "Email"}</div>
                              </div>
                              <div>
                                <div style={labelStyle}>Wanted materials</div>
                                <div className="flex flex-wrap gap-1">
                                  {(() => {
                                    const mats = Array.isArray(agent.materialsWanted)
                                      ? agent.materialsWanted
                                      : Object.keys(agent.materialsWanted || {}).filter((k) => (agent.materialsWanted as any)[k] === true);
                                    return mats.length
                                      ? mats.map((m, mi) => <span key={mi} style={matPill}>{m}</span>)
                                      : <span style={{ color: CC.muted }}>None specified</span>;
                                  })()}
                                </div>
                              </div>
                              {agent.website && (
                                <div>
                                  <div style={labelStyle}>Website</div>
                                  <a href={agent.website.startsWith("http") ? agent.website : `https://${agent.website}`} target="_blank" rel="noreferrer" referrerPolicy="no-referrer" className="break-all" style={{ color: CC.green, fontWeight: 600 }}>{agent.website}</a>
                                </div>
                              )}
                              {socials.length > 0 && (
                                <div>
                                  <div style={labelStyle}>Socials</div>
                                  <div className="flex flex-wrap gap-1">
                                    {socials.map((s, si) => {
                                      const href = socialHref(s.handle);
                                      const inner = <><span style={{ fontWeight: 600 }}>{s.platform}</span><span style={{ color: CC.muted }}> · </span><span className="truncate">{s.handle}</span></>;
                                      return href
                                        ? <a key={si} href={href} target="_blank" rel="noreferrer" referrerPolicy="no-referrer" className="inline-flex items-center max-w-full" style={{ ...matPill }}>{inner}</a>
                                        : <span key={si} className="inline-flex items-center max-w-full" style={{ ...matPill }}>{inner}</span>;
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Query history */}
                          <div className="rounded-[12px] overflow-hidden flex flex-col" style={{ background: CC.card, border: `1px solid ${CC.hair}` }}>
                            <SageHeader icon={<Clock className="w-3 h-3" />}>Query history</SageHeader>
                            <div className="p-3.5 space-y-2.5 flex-grow overflow-y-auto custom-query-list-scrollbar" style={{ maxHeight: 300 }}>
                              {agentQ.length === 0 ? (
                                <div className="py-6 text-center text-[12px]" style={{ color: CC.muted }}>No queries sent yet.</div>
                              ) : (
                                [...agentQ]
                                  .sort((a, b) => (b.dateSent ? new Date(b.dateSent).getTime() : 0) - (a.dateSent ? new Date(a.dateSent).getTime() : 0))
                                  .map((query) => {
                                    const ms = manuscripts.find((m) => m.id === query.manuscriptId);
                                    return (
                                      <div key={query.id} className="rounded-[9px] p-2.5" style={{ background: CC.bg, border: `1px solid ${CC.hair}` }}>
                                        <div className="flex items-start justify-between gap-2">
                                          <span className="font-serif font-semibold text-[12.5px] leading-tight break-words flex-1" style={{ color: CC.primary }}>{ms?.title || "Untitled draft"}</span>
                                          <span className="inline-flex items-center gap-1 shrink-0" style={{ fontSize: 9.5, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: CC.accent, color: CC.primary }}>
                                            <Send className="w-2.5 h-2.5" /> {query.status}
                                          </span>
                                        </div>
                                        <div className="flex justify-between items-center mt-1.5" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: CC.muted }}>
                                          <span>Sent {query.dateSent ? new Date(query.dateSent).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</span>
                                          <span>{query.sendMethod || "Email"}</span>
                                        </div>
                                      </div>
                                    );
                                  })
                              )}
                            </div>
                          </div>

                          {/* Notes */}
                          <div className="rounded-[12px] overflow-hidden flex flex-col" style={{ background: CC.card, border: `1px solid ${CC.hair}` }}>
                            <SageHeader icon={<Notebook className="w-3 h-3" />}>Notes</SageHeader>
                            <div className="p-3.5 flex flex-col flex-grow" style={{ minHeight: 180 }}>
                              <div className="flex-grow overflow-y-auto custom-query-list-scrollbar space-y-2" style={{ maxHeight: 230 }}>
                                {agentNotesList.length === 0 ? (
                                  <div className="py-6 text-center text-[12px]" style={{ color: CC.muted }}>No notes yet. Jot down a call, a preference, a bit of research…</div>
                                ) : (
                                  agentNotesList.map((note) => (
                                    <div key={note.id} className="rounded-[10px] p-2.5" style={{ background: CC.bg, border: `1px solid ${CC.hair}` }}>
                                      <p className="whitespace-pre-wrap break-words" style={{ fontSize: 11.5, lineHeight: 1.5, color: CC.primary }}>{note.text}</p>
                                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: CC.muted, marginTop: 4 }}>{note.createdAt ? formatWhatsAppDate(note.createdAt) : "Just now"}</div>
                                    </div>
                                  ))
                                )}
                              </div>
                              <form onSubmit={(e) => { e.preventDefault(); handleAddAgentNote(noteInput); }} className="flex items-center gap-2 mt-3 rounded-lg p-1 pl-2.5" style={{ background: CC.bg, border: `1px solid ${CC.hair}` }}>
                                <input type="text" value={noteInput} onChange={(e) => setNoteInput(e.target.value)} placeholder="Write a note…" className="flex-grow bg-transparent text-[12px] outline-none" style={{ color: CC.primary }} />
                                <button type="submit" disabled={!noteInput.trim()} className="agx-note-send shrink-0 flex items-center justify-center" aria-label="Add note" style={{ width: 26, height: 26, borderRadius: 999, background: CC.primary, color: "#fcfbf9", border: "none", cursor: "pointer" }}>
                                  <Send className="w-3 h-3" />
                                </button>
                              </form>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </React.Fragment>
              );
            })
          )}
        </div>
      </div>

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
    </div>
  );
};
