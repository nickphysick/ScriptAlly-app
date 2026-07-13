/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Agents page v2 — viewport-locked two-pane contact list + reading pane, themed via the shipped
 * root-class tokens (design ref: design-refs/agents-page-v2.html; styles in agents/agentsV2.css).
 * List column: Up next card · grouped list (Pinned top, star tiers under the rating sort,
 * set-aside sunk) · keyboard hint. Reading pane: identity · MSWL band · submission profile ·
 * history + notes · community placeholder. Every derived value (last status, tiers, Up next,
 * timeline) comes from src/lib/agentsPage.ts — derived over stored, nothing written back.
 */
import React, { useState, useEffect, useRef } from "react";
import { useScriptAllyDb } from "../lib/db";
import { Agent, AgentSocial, SubmissionStatus, SubmissionMethod } from "../types";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, setDoc, doc, onSnapshot } from "firebase/firestore";
import {
  Send,
  Plus,
  BookOpen,
  Clock,
  Mail,
  FileText,
  MoreHorizontal,
  Archive,
  Trash2,
  Check,
  X,
  PauseCircle,
  Link as LinkIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useOpenEditAgent } from "./EditAgentHost";
import { StatusDot } from "./StatusDot";
import { EdgeFadeScroll } from "./EdgeFadeScroll";
import { F12Page, Icirc, F12Primary, Trig, F12Popover, PopSection, PRow, Chip } from "./shell/F12Shell";
import {
  paneProvenance,
  agentQueried,
  lastStatusForAgent,
  buildAgentTimeline,
  formatTimelineDate,
} from "../lib/agentsPage";
import { agentPrimary, agentSecondary, agentInitials } from "../lib/agentDisplay";
import { agentLocation, flagFor, isHomeMarket, getHomeCountry, countryName } from "../lib/territory";
import { SegmentedToggle } from "./forms";
import "flag-icons/css/flag-icons.min.css";
import "./agents/agentsV2.css";

interface AgentsProps {
  searchQuery?: string;
  /** App's handleNavigate bridge — opts.agentId preselects the Log-a-Query agent (additive). */
  onNavigate?: (tab: string, subPageName?: string, opts?: { agentId?: string }) => void;
  /** True while /agents is the visible route — gates the page's keyboard bindings (⌘K, /, j/k). */
  active?: boolean;
}

/** A handle is treated as a clickable link only when it's an explicit URL or a bare domain. */
const isLinkyHandle = (handle: string): boolean => {
  const h = handle.trim();
  return /^https?:\/\//i.test(h) || /^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(h);
};
const hrefFor = (handle: string): string =>
  /^https?:\/\//i.test(handle.trim()) ? handle.trim() : `https://${handle.trim()}`;

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

// Avatar initials + primary/secondary lines come from the shared agentDisplay helpers (the
// agency-primary fallback rule) — no local name-only copy may shadow them.
const firstName = (n: string) => n.split(" ")[0];

/** Five stars in the theme star colour (12px rows / 14px identity). */
const Stars: React.FC<{ value: number }> = ({ value }) => (
  <>
    {[1, 2, 3, 4, 5].map((n) => (
      <svg key={n} viewBox="0 0 24 24" className={n <= value ? "ag-st-on" : "ag-st-off"} strokeWidth={1.6} aria-hidden="true">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ))}
  </>
);

/** The submission-method sub-line on the facts row. */
const methodSub = (m: SubmissionMethod | string): string => {
  switch (m) {
    case SubmissionMethod.ONLINE_FORM: return "via agency website";
    case SubmissionMethod.QUERY_MANAGER: return "via QueryManager";
    case SubmissionMethod.POST: return "by post";
    default: return "direct to inbox";
  }
};

export const Agents: React.FC<AgentsProps> = ({ searchQuery, onNavigate, active = false }) => {
  const openEditAgent = useOpenEditAgent();
  const {
    currentUser,
    agents,
    queries,
    manuscripts,
    activities,
    tasks,
    updateAgent,
    deleteAgent,
    setAgentSetAside,
  } = useScriptAllyDb();

  // Selection + controls
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  /* ── F12 Contact List model (ref agents-contact-list-v3.html) ──
     openFilter — OPEN TO QUERIES radio · queriedFilter — YOUR HISTORY radio (Queried / Idle) ·
     starFilter — STAR RATING checkboxes (4-and-up / 3-and-up / Unrated, OR-combined) ·
     countryFilter — LOCATION radio over the REAL agent.country field (ISO; options are the
     distinct countries on file — there is no `location` field; country IS the location model) ·
     needsNoMswl / needsNoSub — NEEDS ATTENTION checkboxes, both derived. */
  const [openFilter, setOpenFilter] = useState<"all" | "open" | "closed">("all");
  const [queriedFilter, setQueriedFilter] = useState<"all" | "yes" | "no">("all");
  const [starFilter, setStarFilter] = useState<("4up" | "3up" | "unrated")[]>([]);
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [needsNoMswl, setNeedsNoMswl] = useState(false);
  const [needsNoSub, setNeedsNoSub] = useState(false);
  /* Sort (grouped Fit / Your activity / Alphabetical; default star rating) + Group by. */
  const [agSort, setAgSort] = useState<string>("rating");
  const [agGroup, setAgGroup] = useState<"none" | "agency" | "status" | "queried">("none");
  const [agFilterOpen, setAgFilterOpen] = useState(false);
  const [agSortOpen, setAgSortOpen] = useState(false);
  const [agGroupOpen, setAgGroupOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Lifecycle UI state: toasts, guarded-delete modal, the identity ⋯ menu, deferred delete.
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [deleteModalAgent, setDeleteModalAgent] = useState<Agent | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [undoToast, setUndoToast] = useState<{ msg: string; undo: () => void } | null>(null);
  // Deferred delete: on confirm we DON'T delete immediately — we hold it for an undo window, then
  // commit (timeout / ✕ dismiss / navigate-away). Undo cancels with nothing deleted to restore.
  const [pendingDelete, setPendingDelete] = useState<{ agent: Agent; qn: number } | null>(null);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDeleteRef = useRef<{ agent: Agent; qn: number } | null>(null);

  // Notes (per-agent subcollection)
  const [agentNotesList, setAgentNotesList] = useState<{ id: string; text: string; createdAt: string }[]>([]);
  const [noteInput, setNoteInput] = useState("");
  /* 4d — History / Notes render as underline tabs (was 50/50 columns). */
  const [paneTab, setPaneTab] = useState<"history" | "notes">("history");

  // A global search navigation lands here with the term — adopt it into the page filter once.
  useEffect(() => {
    if (searchQuery && searchQuery.trim()) setSearch(searchQuery);
  }, [searchQuery]);

  // Real-time snapshot notes lookup on /users/{userId}/agents/{agentId}/notes.
  useEffect(() => {
    if (!selectedAgentId) {
      setAgentNotesList([]);
      return;
    }
    if (!currentUser) {
      // No authenticated user (seed/preview): demo notes from LocalStorage.
      const cached = localStorage.getItem(`scriptally_agent_notes_seed_${selectedAgentId}`);
      setAgentNotesList(cached ? JSON.parse(cached) : []);
      return;
    }
    const notesColRef = collection(db, "users", currentUser.id, "agents", selectedAgentId, "notes");
    const unsub = onSnapshot(
      notesColRef,
      (snapshot) => {
        const list: { id: string; text: string; createdAt: string }[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as { text: string; createdAt: { toDate?: () => Date } | string };
          list.push({
            id: docSnap.id,
            text: data.text,
            createdAt:
              typeof data.createdAt === "object" && data.createdAt?.toDate
                ? data.createdAt.toDate().toISOString()
                : (data.createdAt as string),
          });
        });
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); // newest first
        setAgentNotesList(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `users/${currentUser.id}/agents/${selectedAgentId}/notes`);
      },
    );
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

  // ── Derived list state (all client-side; no new reads) ──
  const homeCountry = getHomeCountry(currentUser);
  const visibleAgents = pendingDelete ? agents.filter((a) => a.id !== pendingDelete.agent.id) : agents;
  const queryCountFor = (id: string) => queries.filter((q) => q.agentId === id).length;
  const lastQueriedMs = (id: string) =>
    queries.filter((q) => q.agentId === id && q.dateSent).reduce((m, q) => Math.max(m, new Date(q.dateSent!).getTime() || 0), 0);
  /* "No submission details" = neither a preferred method nor wanted materials on file (derived). */
  const noSubDetails = (a: Agent) => !a.submissionMethod && !(a.materialsWanted?.length);

  const filtered = visibleAgents.filter((a) => {
    if (openFilter === "open" && a.submissionStatus !== SubmissionStatus.OPEN) return false;
    if (openFilter === "closed" && a.submissionStatus !== SubmissionStatus.CLOSED) return false;
    const q = agentQueried(a.id, queries);
    if (queriedFilter === "yes" && !q) return false;
    if (queriedFilter === "no" && q) return false;
    if (starFilter.length) {
      const r = a.starRating || 0;
      const hit = (starFilter.includes("4up") && r >= 4) || (starFilter.includes("3up") && r >= 3) || (starFilter.includes("unrated") && r === 0);
      if (!hit) return false;
    }
    if (countryFilter !== "all" && a.country !== countryFilter) return false;
    if (needsNoMswl && !!a.mswlNotes?.trim()) return false;
    if (needsNoSub && !noSubDetails(a)) return false;
    const term = search.trim().toLowerCase();
    if (term) {
      const hay = `${agentPrimary(a)} ${agentSecondary(a) || ""} ${a.agency || ""}`.toLowerCase();
      if (!hay.includes(term)) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (agSort) {
      case "last_queried": return lastQueriedMs(b.id) - lastQueriedMs(a.id);
      case "most_queried": return queryCountFor(b.id) - queryCountFor(a.id);
      case "idle_first": {
        const ai = agentQueried(a.id, queries) ? 1 : 0;
        const bi = agentQueried(b.id, queries) ? 1 : 0;
        return ai - bi || (b.starRating || 0) - (a.starRating || 0);
      }
      case "agent_az": return agentPrimary(a).localeCompare(agentPrimary(b));
      case "agency_az": return (a.agency || "").localeCompare(b.agency || "");
      case "recent": return (new Date(b.dateAdded || 0).getTime() || 0) - (new Date(a.dateAdded || 0).getTime() || 0);
      case "rating":
      default: return (b.starRating || 0) - (a.starRating || 0) || agentPrimary(a).localeCompare(agentPrimary(b));
    }
  });

  /* Group by — sticky mono section headers in the list (None / Agency / Open–closed / Queried–idle). */
  const groups: { key: string; label: string | null; rows: Agent[] }[] = (() => {
    if (agGroup === "agency") {
      const by = new Map<string, Agent[]>();
      for (const a of sorted) {
        const k = agentSecondary(a) || a.agency || "Independent";
        by.set(k, [...(by.get(k) || []), a]);
      }
      return [...by.entries()].sort((x, y) => x[0].localeCompare(y[0])).map(([k, rows]) => ({ key: k, label: k, rows }));
    }
    if (agGroup === "status") {
      const open = sorted.filter((a) => a.submissionStatus === SubmissionStatus.OPEN);
      const closed = sorted.filter((a) => a.submissionStatus === SubmissionStatus.CLOSED);
      const unknown = sorted.filter((a) => a.submissionStatus !== SubmissionStatus.OPEN && a.submissionStatus !== SubmissionStatus.CLOSED);
      return [
        { key: "open", label: "Open to queries", rows: open },
        { key: "closed", label: "Closed", rows: closed },
        { key: "unknown", label: "Unknown", rows: unknown },
      ].filter((g) => g.rows.length);
    }
    if (agGroup === "queried") {
      const yes = sorted.filter((a) => agentQueried(a.id, queries));
      const no = sorted.filter((a) => !agentQueried(a.id, queries));
      return [
        { key: "queried", label: "Queried", rows: yes },
        { key: "idle", label: "Idle", rows: no },
      ].filter((g) => g.rows.length);
    }
    return [{ key: "all", label: null, rows: sorted }];
  })();
  const flat = groups.flatMap((g) => g.rows);
  const idleCount = flat.filter((a) => !agentQueried(a.id, queries)).length;
  /* Distinct countries on file (real data) → the LOCATION radio options. */
  const countriesOnFile = [...new Set(visibleAgents.map((a) => a.country).filter(Boolean) as string[])]
    .sort((x, y) => (countryName(x) || x).localeCompare(countryName(y) || y));
  const selectedAgent = flat.find((a) => a.id === selectedAgentId) ?? null;
  /* Tasks touching the selected agent — the agent's own tasks + tasks on their queries (derived,
     from the tasks array already in DbProvider; no new reads). */
  const agentTaskCount = (() => {
    if (!selectedAgent) return 0;
    const qids = new Set(queries.filter((q) => q.agentId === selectedAgent.id).map((q) => q.id));
    return tasks.filter((t) => t.relatedRecordId === selectedAgent.id || qids.has(t.relatedRecordId)).length;
  })();

  // Default selection = first list item; selection persists where possible, re-anchors when the
  // selected agent drops out of the filtered list.
  useEffect(() => {
    if (!flat.length) {
      if (selectedAgentId !== null) setSelectedAgentId(null);
      return;
    }
    if (!selectedAgentId || !flat.some((a) => a.id === selectedAgentId)) {
      setSelectedAgentId(flat[0].id);
    }
  }, [flat.map((a) => a.id).join("|")]);

  // Close the identity ⋯ menu whenever the selection changes.
  useEffect(() => setMenuOpen(false), [selectedAgentId]);

  const moveSelection = (dir: 1 | -1) => {
    if (!flat.length) return;
    const i = flat.findIndex((a) => a.id === selectedAgentId);
    const next = flat[Math.min(Math.max(i + dir, 0), flat.length - 1)];
    if (next && next.id !== selectedAgentId) {
      setSelectedAgentId(next.id);
      requestAnimationFrame(() => {
        listRef.current
          ?.querySelector(`[data-agid="${CSS.escape(next.id)}"]`)
          ?.scrollIntoView({ block: "nearest" });
      });
    }
  };

  // ── Keyboard: ↑/↓ + j/k move selection, / and ⌘K focus search, Esc blurs (on the input).
  // None fire while focus is in an input/select/textarea. Bound only while the route is visible.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      const t = e.target as HTMLElement | null;
      const inField =
        !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
      if (inField) return;
      if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        moveSelection(1);
      } else if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        moveSelection(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, flat.map((a) => a.id).join("|"), selectedAgentId]);

  // ── Actions ──
  const handleAddAgentNote = async (text: string) => {
    if (!text.trim() || !selectedAgentId || !currentUser) return;
    const cleanText = text.trim();
    const noteId = "note-" + Math.random().toString(36).substr(2, 9);
    try {
      await setDoc(doc(db, "users", currentUser.id, "agents", selectedAgentId, "notes", noteId), {
        text: cleanText,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.id}/agents/${selectedAgentId}/notes/${noteId}`);
    }
    setNoteInput("");
  };

  const togglePinned = async (agent: Agent) => {
    await updateAgent(agent.id, { pinned: !agent.pinned });
  };

  /* Client-side CSV of the CURRENT filtered list — pure frontend, no new reads. */
  const exportAgentsCSV = () => {
    if (!flat.length) return;
    const esc = (v: string | number | undefined | null) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = [
      ["Name", "Agency", "Open to queries", "Star rating", "Country", "Queries sent"].map(esc).join(","),
      ...flat.map((a) => [
        esc(agentPrimary(a)), esc(agentSecondary(a) || a.agency || ""),
        esc(a.submissionStatus === SubmissionStatus.OPEN ? "Open" : a.submissionStatus === SubmissionStatus.CLOSED ? "Closed" : "Unknown"),
        esc(a.starRating || ""), esc(countryName(a.country) || a.country || ""), esc(queryCountFor(a.id)),
      ].join(",")),
    ].join("\n");
    const blob = new Blob([rows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "scriptally-contact-list.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const sendQueryFlow = (agent?: Agent) => {
    if (agent) setSelectedAgentId(agent.id);
    // The toolbar passes the selected agent, Up next its candidate, the row hover its row —
    // all preselect the Log-a-Query form via the additive opts.agentId seam.
    onNavigate?.("queries", "Log a query", agent ? { agentId: agent.id } : undefined);
  };

  // Flip the agent's OWN availability (Open ⇄ Closed). Unknown becomes Open on first flip.
  // Set an agent's availability (Open/Closed) through the existing updateAgent path — the same
  // writer the pill used; now driven by the reading-pane's canonical SegmentedToggle.
  const setAvailability = async (agent: Agent, next: SubmissionStatus) => {
    if (next === agent.submissionStatus) return;
    await updateAgent(agent.id, { submissionStatus: next });
    setToastMessage(`${firstName(agentPrimary(agent))} marked ${next === SubmissionStatus.OPEN ? "open" : "closed"} to queries`);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Set aside / bring back — reversible, with an Undo on the set-aside direction.
  const toggleSetAside = async (agent: Agent) => {
    setMenuOpen(false);
    const next = !agent.setAside;
    await setAgentSetAside(agent.id, next);
    if (next) {
      setUndoToast({
        msg: `${firstName(agentPrimary(agent))} set aside — history kept, hidden from suggestions`,
        undo: () => { void setAgentSetAside(agent.id, false); setUndoToast(null); },
      });
      setTimeout(() => setUndoToast((t) => (t && t.msg.startsWith(firstName(agentPrimary(agent))) ? null : t)), 6000);
    } else {
      setToastMessage(`${firstName(agentPrimary(agent))} back in your active list`);
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

  // Confirm pressed (clean Delete / Delete anyway): DON'T delete yet — optimistically hide the
  // agent, reselect a neighbour, and open the undo window.
  const requestDeleteAgent = (agent: Agent) => {
    setDeleteModalAgent(null);
    setMenuOpen(false);
    const qn = queries.filter((q) => q.agentId === agent.id).length;
    const idx = flat.findIndex((a) => a.id === agent.id);
    const remaining = flat.filter((a) => a.id !== agent.id);
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

  if (!currentUser) return null;

  // ── Render helpers ──
  const renderRow = (agent: Agent) => {
    const sel = agent.id === selectedAgentId;
    const isOpen = agent.submissionStatus === SubmissionStatus.OPEN;
    const qn = queryCountFor(agent.id);
    return (
      <button
        type="button"
        key={agent.id}
        data-agid={agent.id}
        className={`f12-row${sel ? " f12-sel" : ""}`}
        role="option"
        aria-selected={sel}
        onClick={() => setSelectedAgentId(agent.id)}
        style={agent.setAside ? { opacity: 0.62 } : undefined}
      >
        <span className="f12-av" aria-hidden="true">{agentInitials(agent)}</span>
        <span className="f12-mid">
          <span className="f12-nm">{agentPrimary(agent)}</span>
          <span className="f12-ag">{agentSecondary(agent) || "Independent"}</span>
        </span>
        <span className="f12-end">
          {/* open/closed dot — sage fill = open, hollow grey ring = closed/unknown */}
          <span
            aria-hidden="true"
            title={isOpen ? "Open to queries" : "Closed"}
            style={{
              width: 9, height: 9, borderRadius: "50%",
              background: isOpen ? "var(--sage)" : "transparent",
              border: isOpen ? "1.5px solid var(--sage)" : "1.5px solid #c9beb0",
            }}
          />
          <span className="f12-d2">{qn === 0 ? "IDLE" : qn === 1 ? "1 QUERY" : `${qn} QUERIES`}</span>
        </span>
      </button>
    );
  };

  const renderPane = () => {
    if (!agents.length) {
      return (
        <div className="ag-pane-empty">
          <div className="ag-iname">No agents yet</div>
          <p style={{ maxWidth: 360, lineHeight: 1.55 }}>
            Your agent database starts here — add the agents you're researching and every query,
            note and reply stays attached to them.
          </p>
          <button type="button" className="ag-btn" onClick={() => onNavigate?.("agents", "Add an agent")}>
            Add agent
          </button>
        </div>
      );
    }
    const a = selectedAgent;
    if (!a) return <div className="ag-pane-empty">Select an agent to see their profile.</div>;

    const isOpen = a.submissionStatus === SubmissionStatus.OPEN;
    const timeline = buildAgentTimeline(a.id, queries, manuscripts, activities);
    // The canonical link trio owns the X position, so the socials tail drops X/Twitter entries
    // (Bluesky / Instagram / QueryTracker / Other still render as solid chips after the trio).
    const socials = displaySocials(a).filter((s) => !/twitter|^x\b|^x\s*\//i.test(s.platform));
    const respKnown = (a.responseTimeWeeks || 0) > 0;
    const hasMswl = !!a.mswlNotes?.trim();
    // Territory marker (display-only): a resolvable country gates the whole marker — unset/unknown
    // renders nothing. Home market = sage pill; foreign = flag + place name (titled — a flag alone
    // is ambiguous). City rides along via agentLocation(); never fabricated.
    const location = agentLocation(a);
    const locFlag = flagFor(a.country);
    const homeMarket = isHomeMarket(a.country, getHomeCountry(currentUser));

    // One chip of the canonical trio: solid (linked when the value is an URL/domain, titled text
    // chip otherwise) when populated; a dashed ghost prompt opening the Edit drawer when empty.
    const trioChip = (label: string, value: string | undefined) => {
      const v = value?.trim();
      if (!v) {
        return (
          <button type="button" className="ag-lchip ghost" onClick={() => openEditAgent(a.id)} title={`Add ${label}`}>
            <Plus aria-hidden="true" /> {label}
          </button>
        );
      }
      return isLinkyHandle(v) ? (
        <a className="ag-lchip" href={hrefFor(v)} target="_blank" rel="noopener noreferrer">
          <LinkIcon aria-hidden="true" /> {label}
        </a>
      ) : (
        <span className="ag-lchip" title={v} style={{ cursor: "default" }}>
          <LinkIcon aria-hidden="true" /> {label}
        </span>
      );
    };

    return (
      <>
      <EdgeFadeScroll outerClassName="ag-panewrap" scrollClassName="ag-panescroll" fade="var(--paper, #faf6f0)">
        {/* 1 · Identity — the F12 hero: sage LEFT spine (::before, clipped by the radius; NO top
            rule), pink avatar + black initials, Playfair name, mono-caps agency, burgundy stars. */}
        <div className="f12-hero" style={{ margin: "16px 16px 0" }}>
            <span className="f12-bigav" aria-hidden="true">{agentInitials(a)}</span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="f12-hn" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{agentPrimary(a)}</div>
              <div style={{ fontFamily: "var(--f12-mono)", fontSize: 9, letterSpacing: "0.11em", textTransform: "uppercase", color: "var(--muted)", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {agentSecondary(a) || "Independent"}
                {a.email ? ` · ${a.email}` : ""}
              </div>
              {location && locFlag && (
                homeMarket ? (
                  <span className="ag-loc home" title="In your home market">{location}</span>
                ) : (
                  <span className="ag-loc" title={countryName(a.country)}>
                    <span className={locFlag} aria-hidden="true" />
                    {location}
                  </span>
                )
              )}
              <div className="ag-bstars" aria-label={`${a.starRating || 0} of 5 stars`}>
                <Stars value={a.starRating || 0} />
              </div>
              {/* Canonical trio — always present (ghost prompts when empty) — then any other socials.
                  Interim sourcing until the dedicated URL fields land: Socials reads `twitter`;
                  Publishers Marketplace has no field yet, so it ghosts (opens the Edit drawer). */}
              <div className="ag-ilinks">
                {trioChip("Website", a.website)}
                {trioChip("Socials", a.twitter)}
                {trioChip("Publishers Marketplace", undefined)}
                {socials.map((s, i) =>
                  isLinkyHandle(s.handle) ? (
                    <a key={i} className="ag-lchip" href={hrefFor(s.handle)} target="_blank" rel="noopener noreferrer">
                      <LinkIcon aria-hidden="true" /> {s.platform}
                    </a>
                  ) : (
                    <span key={i} className="ag-lchip" title={s.handle} style={{ cursor: "default" }}>
                      <LinkIcon aria-hidden="true" /> {s.platform}
                    </span>
                  ),
                )}
              </div>
            </div>
            <div className="ag-iright" style={{ alignSelf: "flex-start" }}>
              {/* Open/Closed segmented pill — the canonical SegmentedToggle (untouched), its active
                  segment SAGE via the .t-f12 scoped override in f12.css. Unknown → neither side lit. */}
              <span
                className="ag-availtoggle"
                data-status={a.submissionStatus === SubmissionStatus.OPEN ? "open" : a.submissionStatus === SubmissionStatus.CLOSED ? "closed" : "unknown"}
              >
                <span className="ag-availdot" aria-hidden="true" />
                <SegmentedToggle<SubmissionStatus>
                  ariaLabel="Submission status"
                  value={(a.submissionStatus as SubmissionStatus) ?? SubmissionStatus.UNKNOWN}
                  options={[{ value: SubmissionStatus.OPEN, label: "Open" }, { value: SubmissionStatus.CLOSED, label: "Closed" }]}
                  onChange={(v) => void setAvailability(a, v)}
                />
              </span>
            </div>
        </div>

        {/* 2 · MSWL band — never hidden. Populated = the centred quote; empty = a thin clickable
            prompt opening the Edit drawer. The agent's genres render beneath either variant. */}
        <div className={`ag-psec${hasMswl ? " ag-mswl" : ""}`}>
          {hasMswl ? (
            <div className="ag-mswl-quote">“{a.mswlNotes!.trim()}”</div>
          ) : (
            /* 4d — SINGLE-ROW empty strip: dotted outline, no fill, icon + label + copy on one
               line, the add pill on the right (~a third of the old block's height). */
            <button type="button" className="f12-wishrow" onClick={() => openEditAgent(a.id)}>
              <BookOpen aria-hidden="true" />
              <span className="f12-wl">Manuscript wish list</span>
              <span className="f12-wc">Add what this agent is looking for and it'll show here.</span>
              <span className="f12-wa">+ Add wish list</span>
            </button>
          )}
          {(a.genres?.length || 0) > 0 && (
            <div className="ag-wtags">
              {a.genres!.map((g) => (
                <span className="ag-wtag" key={g}>{g}</span>
              ))}
            </div>
          )}
        </div>

        {/* 3 · Submission profile — three cards with SAGE gradient header bands + 19px dark-sage
            icons (the eyebrow + hairline-cell layout is retired; contents unchanged). */}
        <div className="ag-psec">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            <div className="f12-card" style={{ minWidth: 0 }}>
              <div className="f12-chh"><Clock aria-hidden="true" /><span>Response time</span></div>
              <div className="f12-cbb" style={{ padding: 14 }}>
                {respKnown ? (
                  <div className="ag-fval">within {a.responseTimeWeeks} weeks</div>
                ) : (
                  <div className="ag-fval empty">Not specified yet</div>
                )}
                <div className="ag-fsub">
                  {isOpen ? (respKnown ? "based on recent replies" : "add it in the Edit drawer") : "closed to queries"}
                </div>
              </div>
            </div>
            <div className="f12-card" style={{ minWidth: 0 }}>
              <div className="f12-chh"><Mail aria-hidden="true" /><span>Method</span></div>
              <div className="f12-cbb" style={{ padding: 14 }}>
                {a.submissionMethod ? (
                  <div className="ag-fval">{a.submissionMethod}</div>
                ) : (
                  <div className="ag-fval empty">Not specified yet</div>
                )}
                <div className="ag-fsub">{methodSub(a.submissionMethod)}</div>
              </div>
            </div>
            <div className="f12-card" style={{ minWidth: 0 }}>
              <div className="f12-chh"><FileText aria-hidden="true" /><span>Materials</span></div>
              <div className="f12-cbb" style={{ padding: 14 }}>
                {a.materialsWanted?.length ? (
                  <div className="ag-fval soft">{a.materialsWanted.join(", ")}</div>
                ) : (
                  <div className="ag-fval empty">Not specified yet</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 4 · History / Notes — UNDERLINE TABS (4d; was 50/50 columns). Contents unchanged. */}
        <div className="ag-psec">
          <div className="f12-tabs" role="tablist" aria-label="History and notes">
            <button type="button" role="tab" aria-selected={paneTab === "history"} className={`f12-tab${paneTab === "history" ? " f12-on" : ""}`} onClick={() => setPaneTab("history")}>
              Your history
            </button>
            <button type="button" role="tab" aria-selected={paneTab === "notes"} className={`f12-tab${paneTab === "notes" ? " f12-on" : ""}`} onClick={() => setPaneTab("notes")}>
              Notes{agentNotesList.length ? ` · ${agentNotesList.length}` : ""}
            </button>
          </div>
          {paneTab === "history" ? (
            timeline.length ? (
              <div className="ag-tl-scroll">
                <div className="ag-tl">
                  {timeline.map((e) => (
                    <div className="ag-tle" key={e.id}>
                      <span className="ag-tldot">
                        <StatusDot status={e.status} overrideSize={19} decorative />
                      </span>
                      <div className="ag-tlrow">
                        <span className="ag-tls">{e.label}</span>
                        <span className="ag-tlm">{e.manuscriptTitle}</span>
                        <span className="ag-tld">{e.dateLabel}</span>
                      </div>
                      {e.note && <div className="ag-tlnote">{e.note}</div>}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="ag-tl-empty">No queries sent yet — a clean slate.</div>
            )
          ) : (
            <div className="ag-notes-col" style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
              <div className="ag-notes-scroll">
                {agentNotesList.length ? (
                  agentNotesList.map((n) => (
                    <div className="ag-nbubble" key={n.id}>
                      <div className="ag-ntext">{n.text}</div>
                      <div className="ag-ndate">{formatTimelineDate(n.createdAt)}</div>
                    </div>
                  ))
                ) : (
                  <div className="ag-notes-empty">
                    Updates, comments, private research — write anything here. It stays attached to this agent.
                  </div>
                )}
              </div>
              <div className="ag-note-in">
                <input
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") void handleAddAgentNote(noteInput); }}
                  placeholder="Write a note…"
                  aria-label="Write a note"
                />
                <button
                  type="button"
                  className="ag-note-send"
                  aria-label="Save note"
                  disabled={!noteInput.trim()}
                  onClick={() => void handleAddAgentNote(noteInput)}
                >
                  <Send />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 5 · Community placeholder — compact strip (desk rule: no skeleton voids) */}
        <div className="ag-psec">
          <div className="ag-commstrip">
            Similar agents being queried in the ScriptAlly community
            <span className="ag-pill-soon">Coming soon</span>
          </div>
        </div>
        {/* Colophon — closes the CONTENT (the pinned footer below closes the card) */}
        <div className="ag-colophon" aria-hidden="true">❦</div>
      </EdgeFadeScroll>
      {/* 4d — slim pane meta footer (replaces the pane-foot command bar; Send query + Edit
          profile live in the control bar now): ADDED <date> · n QUERIES left, the ⋯ lifecycle
          menu (Set aside — kept so it doesn't lose its only surface; deliberate deviation from
          the ref) + the open/closed state right. */}
      <div className="f12-panefoot">
        <span>{paneProvenance(a, queries.filter((q) => q.agentId === a.id).length)}</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span style={{ position: "relative", display: "inline-flex" }}>
            <button
              type="button"
              aria-label="More actions"
              aria-expanded={menuOpen}
              onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); }}
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: 6, color: "var(--muted)" }}
            >
              <MoreHorizontal style={{ width: 14, height: 14 }} />
            </button>
            {menuOpen && (
              <>
                <div style={{ position: "fixed", inset: 0, zIndex: 30 }} onClick={() => setMenuOpen(false)} />
                <div style={{ position: "absolute", right: 0, bottom: "calc(100% + 6px)", zIndex: 31, background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 10, boxShadow: "var(--sh-3)", padding: 4, minWidth: 170, textTransform: "none", letterSpacing: 0 }}>
                  <button type="button" style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "7px 10px", borderRadius: 7, fontFamily: "var(--f12-body)", fontSize: 12.5, color: "var(--ink-2)" }} onClick={() => void toggleSetAside(a)}>
                    <Archive style={{ width: 14, height: 14 }} /> {a.setAside ? "Bring back" : "Set aside"}
                  </button>
                </div>
              </>
            )}
          </span>
          <span className="f12-open">
            <i style={{ background: isOpen ? "var(--sage)" : "transparent", border: isOpen ? "1.5px solid var(--sage)" : "1.5px solid #c9beb0" }} />
            {isOpen ? "Open" : a.submissionStatus === SubmissionStatus.CLOSED ? "Closed" : "Unknown"}
          </span>
        </span>
      </div>
      </>
    );
  };

  /* ── F12 active-filter chips ── */
  const resetAgFilters = () => {
    setOpenFilter("all"); setQueriedFilter("all"); setStarFilter([]); setCountryFilter("all");
    setNeedsNoMswl(false); setNeedsNoSub(false);
  };
  const agChips: { key: string; label: string; remove: () => void }[] = [
    ...(openFilter !== "all" ? [{ key: "open", label: openFilter.toUpperCase(), remove: () => setOpenFilter("all") }] : []),
    ...(queriedFilter !== "all" ? [{ key: "qd", label: queriedFilter === "yes" ? "QUERIED" : "IDLE", remove: () => setQueriedFilter("all") }] : []),
    ...starFilter.map((sf) => ({ key: `st:${sf}`, label: sf === "4up" ? "4★ AND UP" : sf === "3up" ? "3★ AND UP" : "UNRATED", remove: () => setStarFilter((prev) => prev.filter((x) => x !== sf)) })),
    ...(countryFilter !== "all" ? [{ key: "loc", label: (countryName(countryFilter) || countryFilter).toUpperCase(), remove: () => setCountryFilter("all") }] : []),
    ...(needsNoMswl ? [{ key: "nomswl", label: "NO WISH LIST", remove: () => setNeedsNoMswl(false) }] : []),
    ...(needsNoSub ? [{ key: "nosub", label: "NO SUBMISSION DETAILS", remove: () => setNeedsNoSub(false) }] : []),
  ];

  const AG_SORTS: { group: string; items: { key: string; label: string; sub?: string }[] }[] = [
    { group: "Fit", items: [{ key: "rating", label: "Star rating", sub: "Your best fits first" }] },
    { group: "Your activity", items: [
      { key: "last_queried", label: "Last queried", sub: "Most recent submission first" },
      { key: "most_queried", label: "Most queried" },
      { key: "idle_first", label: "Idle first", sub: "Agents you haven't approached yet" },
    ]},
    { group: "Alphabetical", items: [
      { key: "agent_az", label: "Agent · A to Z" },
      { key: "agency_az", label: "Agency · A to Z" },
      { key: "recent", label: "Recently added" },
    ]},
  ];
  const toggleStar = (v: "4up" | "3up" | "unrated") =>
    setStarFilter((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));

  return (
    <F12Page
      tools={
        <>
          <Icirc title="Export CSV" onClick={() => exportAgentsCSV()}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5" /><path d="M4 21h16" /></svg>
          </Icirc>
          <Icirc title="Help" onClick={() => onNavigate?.("help")}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 3.4 2.33c-.7.27-.9.87-.9 1.67" /><path d="M12 17h.01" /></svg>
          </Icirc>
          <F12Primary onClick={() => onNavigate?.("agents", "Add an agent")}>Add agent</F12Primary>
        </>
      }
    >
      {/* ── F12 CONTROL BAR — left zone (list width): FILTER · SORT · GROUP BY pills; right zone:
          Send query · Edit profile · View tasks (count) │ PDF · Delete right-aligned. Quiet
          buttons only. The old masthead + subtitle and the pane-foot command bar are retired —
          the breadcrumb and the list footer carry that. ── */}
      <div className="f12-ctl">
        <div className="f12-zone-list">
          <div className="f12-popwrap">
            <Trig
              label="FILTER"
              open={agFilterOpen}
              count={agChips.length}
              onClick={() => { setAgSortOpen(false); setAgGroupOpen(false); setAgFilterOpen((o) => !o); }}
              icon={<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18l-7 8v6l-4-2v-4L3 5z" /></svg>}
            />
            {agFilterOpen && (
              <F12Popover
                width={288}
                title="Filter"
                onClose={() => setAgFilterOpen(false)}
                headAction={<button type="button" className="f12-reset" onClick={resetAgFilters}>RESET ALL</button>}
                footText={<><b>{filtered.length}</b>&nbsp;OF {visibleAgents.length} AGENTS</>}
              >
                <PopSection label="Open to queries">
                  <PRow kind="rad" on={openFilter === "all"} label="All agents" onClick={() => setOpenFilter("all")} />
                  <PRow kind="rad" on={openFilter === "open"} label="Open" sub="Currently accepting submissions" onClick={() => setOpenFilter("open")} />
                  <PRow kind="rad" on={openFilter === "closed"} label="Closed" onClick={() => setOpenFilter("closed")} />
                </PopSection>
                <PopSection label="Your history">
                  <PRow kind="rad" on={queriedFilter === "all"} label="Queried or not" onClick={() => setQueriedFilter("all")} />
                  <PRow kind="rad" on={queriedFilter === "yes"} label="Queried" sub="You've sent at least one query" onClick={() => setQueriedFilter("yes")} />
                  <PRow kind="rad" on={queriedFilter === "no"} label="Idle" sub="On file, never queried" onClick={() => setQueriedFilter("no")} />
                </PopSection>
                <PopSection label="Star rating">
                  <PRow kind="box" on={starFilter.includes("4up")} label="4 and up" onClick={() => toggleStar("4up")} />
                  <PRow kind="box" on={starFilter.includes("3up")} label="3 and up" onClick={() => toggleStar("3up")} />
                  <PRow kind="box" on={starFilter.includes("unrated")} label="Unrated" onClick={() => toggleStar("unrated")} />
                </PopSection>
                {countriesOnFile.length > 0 && (
                  <PopSection label="Location">
                    <PRow kind="rad" on={countryFilter === "all"} label="Anywhere" onClick={() => setCountryFilter("all")} />
                    {countriesOnFile.map((c) => (
                      <PRow key={c} kind="rad" on={countryFilter === c} label={countryName(c) || c} onClick={() => setCountryFilter(c)} />
                    ))}
                  </PopSection>
                )}
                <PopSection label="Needs attention">
                  <PRow kind="box" on={needsNoMswl} label="No wish list on file" onClick={() => setNeedsNoMswl((v) => !v)} />
                  <PRow kind="box" on={needsNoSub} label="No submission details" onClick={() => setNeedsNoSub((v) => !v)} />
                </PopSection>
              </F12Popover>
            )}
          </div>
          <div className="f12-popwrap">
            <Trig
              label="SORT"
              open={agSortOpen}
              onClick={() => { setAgFilterOpen(false); setAgGroupOpen(false); setAgSortOpen((o) => !o); }}
              icon={<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M7 12h10M10 18h4" /></svg>}
            />
            {agSortOpen && (
              <F12Popover
                width={276}
                title="Sort"
                onClose={() => setAgSortOpen(false)}
                footText={(AG_SORTS.flatMap((g) => g.items).find((i) => i.key === agSort)?.label || "Star rating").toUpperCase()}
              >
                {AG_SORTS.map((g) => (
                  <PopSection key={g.group} label={g.group}>
                    {g.items.map((i) => (
                      <PRow key={i.key} kind="rad" on={agSort === i.key} label={i.label} sub={i.sub} onClick={() => setAgSort(i.key)} />
                    ))}
                  </PopSection>
                ))}
              </F12Popover>
            )}
          </div>
          <div className="f12-popwrap">
            <Trig
              label={agGroup === "none" ? "NO GROUPS" : agGroup === "agency" ? "BY AGENCY" : agGroup === "status" ? "BY STATUS" : "BY HISTORY"}
              open={agGroupOpen}
              onClick={() => { setAgFilterOpen(false); setAgSortOpen(false); setAgGroupOpen((o) => !o); }}
              icon={<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h10" /></svg>}
            />
            {agGroupOpen && (
              <F12Popover width={250} title="Group by" onClose={() => setAgGroupOpen(false)} footText="">
                <PopSection label="Group rows">
                  <PRow kind="rad" on={agGroup === "none"} label="None" onClick={() => setAgGroup("none")} />
                  <PRow kind="rad" on={agGroup === "agency"} label="Agency" onClick={() => setAgGroup("agency")} />
                  <PRow kind="rad" on={agGroup === "status"} label="Open / closed" onClick={() => setAgGroup("status")} />
                  <PRow kind="rad" on={agGroup === "queried"} label="Queried / idle" onClick={() => setAgGroup("queried")} />
                </PopSection>
              </F12Popover>
            )}
          </div>
        </div>

        <div className="f12-zone-read">
          <button type="button" className="f12-act" disabled={!selectedAgent} onClick={() => selectedAgent && sendQueryFlow(selectedAgent)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4Z" /></svg>
            Send query
          </button>
          <button type="button" className="f12-act" disabled={!selectedAgent} onClick={() => selectedAgent && openEditAgent(selectedAgent.id)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
            Edit profile
          </button>
          <button type="button" className="f12-act" disabled={!selectedAgent} onClick={() => onNavigate?.("todo")}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h10M4 12h10M4 18h10" /><path d="m17 6 1.5 1.5L21.5 4" /><path d="m17 12 1.5 1.5L21.5 10" /></svg>
            View tasks
            {agentTaskCount > 0 && <span className="f12-cnt">{agentTaskCount}</span>}
          </button>
          <div className="f12-right">
            <button type="button" className="f12-act" disabled title="Coming soon — agent record PDF">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" /></svg>
              PDF
            </button>
            <button type="button" className="f12-act f12-del" disabled={!selectedAgent} onClick={() => selectedAgent && setDeleteModalAgent(selectedAgent)}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Active filters — removable pink chips beneath the bar (the panes never resize). */}
      {agChips.length > 0 && (
        <div className="f12-chips">
          {agChips.map((c) => (
            <Chip key={c.key} onRemove={c.remove}>{c.label}</Chip>
          ))}
          <button type="button" className="f12-clear" onClick={resetAgFilters}>CLEAR ALL</button>
        </div>
      )}

      {/* ── Panes — the F12 list beside the reading pane, in the centred column ── */}
      <div className="f12-body" style={{ paddingTop: agChips.length ? 0 : "var(--gut)" }}>
        <div className="f12-pane f12-list">
          <div className="f12-lsearch">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input
              ref={searchRef}
              type="text"
              placeholder="Find agent or agency…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Find agent or agency"
            />
          </div>
          <div ref={listRef} className="f12-rows" role="listbox" aria-label="Agents">
            {flat.length ? (
              groups.map((g) => (
                <React.Fragment key={g.key}>
                  {g.label && <div className="f12-ghead">{g.label}</div>}
                  {g.rows.map(renderRow)}
                </React.Fragment>
              ))
            ) : (
              <div style={{ textAlign: "center", padding: "48px 16px", color: "var(--faint)", fontSize: 12, fontStyle: "italic" }}>
                {agents.length ? "No agents match these filters." : "No agents yet — your list starts here."}
              </div>
            )}
          </div>
          <div className="f12-lfoot">
            <span>SHOWING <b>{flat.length}</b> OF {visibleAgents.length} · {idleCount} IDLE</span>
            <button type="button" onClick={() => exportAgentsCSV()}>EXPORT CSV</button>
            <span className="f12-kbd">↑↓ · ⏎</span>
          </div>
        </div>

        {/* Reading pane — its OWN content (identity / wish list / submission profile / history +
            notes), reskinned in 4d. The .agv2 wrapper keeps the pane's page-scoped CSS resolving;
            its desk paint + padding are neutralised inline (the F12 shell owns the ground). */}
        <div className="f12-pane f12-detail">
          <div className="agv2 ag-pane" style={{ padding: 0, background: "transparent", overflow: "hidden", flex: 1, minHeight: 0, minWidth: 0, display: "flex", flexDirection: "column" }}>
            {renderPane()}
          </div>
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
                      {agentPrimary(a)} has {qn} quer{qn > 1 ? "ies" : "y"} in your pipeline
                    </h3>
                    <p className="text-[13.5px] font-light leading-relaxed text-[rgba(58,28,20,0.72)]">
                      Deleting {firstName(agentPrimary(a))} would also erase those <b className="text-[#7c3a2a] font-medium">{qn} quer{qn > 1 ? "ies" : "y"}</b> from the manuscripts they belong to — losing that part of your record. <b className="text-[#7c3a2a] font-medium">Set them aside</b> instead: they vanish from suggestions but the history stays, and you can bring them back.
                    </p>
                    <div className="flex items-center gap-2.5 mt-5 flex-wrap">
                      <button onClick={() => { setDeleteModalAgent(null); void toggleSetAside(a); }} className="font-mono text-[11px] rounded-[9px] py-2.5 px-4 bg-[#f5e2da] text-[#7c3a2a] border-[0.5px] border-[#e8c8bc] hover:bg-[#efd5ca] cursor-pointer">Set aside</button>
                      <button onClick={() => setDeleteModalAgent(null)} className="font-mono text-[11px] rounded-[9px] py-2.5 px-4 text-stone-500 hover:text-[#3a1c14] cursor-pointer">Cancel</button>
                      <button onClick={() => requestDeleteAgent(a)} className="ml-auto font-mono text-[10.5px] text-[#a8442f] opacity-80 hover:opacity-100 hover:underline cursor-pointer p-2">Delete anyway</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-[42px] h-[42px] rounded-[11px] bg-[rgba(168,68,47,0.12)] text-[#a8442f] flex items-center justify-center mb-3.5">
                      <Trash2 className="w-5 h-5" />
                    </div>
                    <h3 className="font-serif text-[19px] leading-tight mb-2.5 text-[#3a1c14]">Delete {agentPrimary(a)}?</h3>
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
    </F12Page>
  );
};
