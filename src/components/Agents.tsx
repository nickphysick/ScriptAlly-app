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
  Pencil,
  Pin,
  Sparkles,
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
import { AgentsTopBar } from "./agents/AgentsTopBar";
import {
  AgentsSubFilter,
  AgentsQueriedFilter,
  AgentsSort,
  filterAgents,
  groupAgents,
  flattenGroups,
  upNextCandidate,
  lastStatusForAgent,
  buildAgentTimeline,
  formatTimelineDate,
  upNextMeta,
} from "../lib/agentsPage";
import "./agents/agentsV2.css";

interface AgentsProps {
  searchQuery?: string;
  onNavigate?: (tab: string, subPageName?: string) => void;
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

/** Up-to-two-letter initials for the avatar discs. */
const agentInitials = (name: string): string =>
  (name || "").trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";

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
    updateAgent,
    deleteAgent,
    setAgentSetAside,
  } = useScriptAllyDb();

  // Selection + controls
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [subFilter, setSubFilter] = useState<AgentsSubFilter>("all");
  const [queriedFilter, setQueriedFilter] = useState<AgentsQueriedFilter>("all");
  const [sortBy, setSortBy] = useState<AgentsSort>("rating");
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

  // ── Derived list state (all client-side, from agentsPage.ts) ──
  const visibleAgents = pendingDelete ? agents.filter((a) => a.id !== pendingDelete.agent.id) : agents;
  const filtered = filterAgents(visibleAgents, queries, subFilter, queriedFilter, search);
  const groups = groupAgents(filtered, sortBy);
  const flat = flattenGroups(groups);
  const upNext = upNextCandidate(filtered, queries);
  const selectedAgent = flat.find((a) => a.id === selectedAgentId) ?? null;

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

  const sendQueryFlow = (agent?: Agent) => {
    if (agent) setSelectedAgentId(agent.id);
    onNavigate?.("queries", "Log a query");
  };

  // Flip the agent's OWN availability (Open ⇄ Closed). Unknown becomes Open on first flip.
  const flipAvailability = async (agent: Agent) => {
    const next = agent.submissionStatus === SubmissionStatus.OPEN ? SubmissionStatus.CLOSED : SubmissionStatus.OPEN;
    await updateAgent(agent.id, { submissionStatus: next });
    setToastMessage(`${firstName(agent.name)} marked ${next === SubmissionStatus.OPEN ? "open" : "closed"} to queries`);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Set aside / bring back — reversible, with an Undo on the set-aside direction.
  const toggleSetAside = async (agent: Agent) => {
    setMenuOpen(false);
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
    const last = lastStatusForAgent(agent.id, queries, activities);
    return (
      <button
        type="button"
        key={agent.id}
        data-agid={agent.id}
        className={`ag-row${sel ? " sel" : ""}`}
        role="option"
        aria-selected={sel}
        onClick={() => setSelectedAgentId(agent.id)}
        style={agent.setAside ? { opacity: 0.62 } : undefined}
      >
        <span className="ag-mono-av" aria-hidden="true">{agentInitials(agent.name)}</span>
        <span className="ag-who">
          <span className="ag-name">
            {agent.pinned && <Pin className="ag-pin-ic" aria-label="Pinned" />}
            {agent.name || "Unnamed agent"}
          </span>
          <span className="ag-agency">{agent.agency || "Independent"}</span>
          <span className="ag-rstars" aria-label={`${agent.starRating || 0} of 5 stars`}>
            <Stars value={agent.starRating || 0} />
          </span>
        </span>
        <span className="ag-rmeta">
          {last && <StatusDot status={last} overrideSize={20} />}
          <span
            className="ag-odot"
            style={{ background: isOpen ? "var(--sd-hue, #7c3a2a)" : "rgba(0,0,0,0.18)" }}
            title={isOpen ? "Open to queries" : "Closed"}
          />
        </span>
        <span className="ag-hoveracts">
          <span
            role="button"
            tabIndex={0}
            title={agent.pinned ? "Unpin" : "Pin"}
            aria-label={agent.pinned ? `Unpin ${agent.name}` : `Pin ${agent.name}`}
            onClick={(e) => { e.stopPropagation(); void togglePinned(agent); }}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); void togglePinned(agent); } }}
            style={{ width: 25, height: 25, borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <Pin style={agent.pinned ? { fill: "currentColor" } : undefined} />
          </span>
          <span
            role="button"
            tabIndex={0}
            title="Send query"
            aria-label={`Send query to ${agent.name}`}
            onClick={(e) => { e.stopPropagation(); sendQueryFlow(agent); }}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); sendQueryFlow(agent); } }}
            style={{ width: 25, height: 25, borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <Send />
          </span>
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
    const socials = displaySocials(a);
    const respKnown = (a.responseTimeWeeks || 0) > 0;

    return (
      <div className="ag-panescroll">
        {/* 1 · Identity */}
        <div className="ag-psec">
          <div className="ag-ident">
            <span className="ag-hero-av" aria-hidden="true">{agentInitials(a.name)}</span>
            <div style={{ minWidth: 0 }}>
              <div className="ag-iname">{a.name || "Unnamed agent"}</div>
              <div className="ag-iag">
                {a.agency || "Independent"}
                {a.email ? ` · ${a.email}` : ""}
              </div>
              <div className="ag-bstars" aria-label={`${a.starRating || 0} of 5 stars`}>
                <Stars value={a.starRating || 0} />
              </div>
              {(a.website?.trim() || socials.length > 0) && (
                <div className="ag-ilinks">
                  {a.website?.trim() && (
                    <a className="ag-lchip" href={hrefFor(a.website)} target="_blank" rel="noopener noreferrer">
                      <LinkIcon aria-hidden="true" /> Website
                    </a>
                  )}
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
              )}
            </div>
            <div className="ag-iright">
              <div style={{ display: "flex", alignItems: "center", gap: 7, position: "relative" }}>
                <button
                  type="button"
                  className="ag-openpill"
                  onClick={() => void flipAvailability(a)}
                  title="Click to flip — the agent's own availability"
                >
                  <span className="ag-d" style={{ background: isOpen ? "var(--sd-hue, #7c3a2a)" : "rgba(0,0,0,0.2)" }} />
                  {isOpen ? "Open to queries" : a.submissionStatus === SubmissionStatus.CLOSED ? "Closed to queries" : "Availability unknown"}
                </button>
                <button
                  type="button"
                  className="ag-kebab"
                  aria-label="More actions"
                  aria-expanded={menuOpen}
                  onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); }}
                >
                  <MoreHorizontal />
                </button>
                {menuOpen && (
                  <>
                    <div style={{ position: "fixed", inset: 0, zIndex: 30 }} onClick={() => setMenuOpen(false)} />
                    <div className="ag-menu">
                      <button type="button" onClick={() => void toggleSetAside(a)}>
                        <Archive /> {a.setAside ? "Bring back" : "Set aside"}
                      </button>
                      <button type="button" className="ag-danger" onClick={() => { setMenuOpen(false); setDeleteModalAgent(a); }}>
                        <Trash2 /> Delete…
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 2 · MSWL band (free-text quote; wish tags arrive with structured MSWL data) */}
        {a.mswlNotes?.trim() && (
          <div className="ag-psec ag-mswl">
            <div className="ag-mswl-quote">“{a.mswlNotes.trim()}”</div>
          </div>
        )}

        {/* 3 · Submission profile */}
        <div className="ag-psec">
          <div className="ag-eyebrow">Submission profile<span className="ag-rule" /></div>
          <div className="ag-facts">
            <div className="ag-fact">
              <div className="ag-flbl">Response time</div>
              <div className="ag-fval">{isOpen && respKnown ? `within ${a.responseTimeWeeks} weeks` : "—"}</div>
              <div className="ag-fsub">
                {isOpen ? (respKnown ? "based on recent replies" : "no response time recorded yet") : "closed to queries"}
              </div>
            </div>
            <div className="ag-fact">
              <div className="ag-flbl">Preferred method</div>
              <div className="ag-fval">{a.submissionMethod || "—"}</div>
              <div className="ag-fsub">{methodSub(a.submissionMethod)}</div>
            </div>
            <div className="ag-fact">
              <div className="ag-flbl">Wanted materials</div>
              <div className="ag-fval soft">{a.materialsWanted?.length ? a.materialsWanted.join(", ") : "—"}</div>
            </div>
          </div>
        </div>

        {/* 4 · History + Notes */}
        <div className="ag-psec">
          <div className="ag-twocol">
            <div className="ag-col">
              <div className="ag-eyebrow">Your history with {firstName(a.name || "them")}<span className="ag-rule" /></div>
              {timeline.length ? (
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
              )}
            </div>
            <div className="ag-col ag-notes-col">
              <div className="ag-eyebrow">Notes<span className="ag-rule" /></div>
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
          </div>
        </div>

        {/* 5 · Community placeholder (static — no data wiring) */}
        <div className="ag-psec">
          <div className="ag-eyebrow">
            Similar agents being queried in the ScriptAlly community
            <span className="ag-pill-soon">Coming soon</span>
            <span className="ag-rule" />
          </div>
          <div className="ag-simrow">
            {[["72%", "46%"], ["58%", "38%"], ["78%", "52%"]].map(([w1, w2], i) => (
              <div className="ag-ph-tile" key={i} aria-hidden="true">
                <span className="ag-ph-av" />
                <span className="ag-ph-lines">
                  <span className="ag-ph-line" style={{ width: w1 }} />
                  <span className="ag-ph-line" style={{ width: w2 }} />
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="agv2">
      <AgentsTopBar
        count={agents.length}
        search={search}
        onSearch={setSearch}
        onAddAgent={() => onNavigate?.("agents", "Add an agent")}
        searchRef={searchRef}
      />

      {/* Control row: segmented filter toggles · sort · selected-agent actions */}
      <div className="ag-chips">
        <div className="ag-seggrp">
          <span className="ag-seglbl" aria-hidden="true">Status</span>
          <div className="ag-seg" role="group" aria-label="Filter by availability">
            {([["all", "All"], ["open", "Open"], ["closed", "Closed"]] as [AgentsSubFilter, string][]).map(([v, label]) => (
              <button type="button" key={v} className={subFilter === v ? "on" : undefined} aria-pressed={subFilter === v} onClick={() => setSubFilter(v)}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <span className="ag-chipdiv" aria-hidden="true" />
        <div className="ag-seggrp">
          <span className="ag-seglbl" aria-hidden="true">Queried</span>
          <div className="ag-seg" role="group" aria-label="Filter by queried">
            {([["all", "All"], ["yes", "Queried"], ["no", "Not queried"]] as [AgentsQueriedFilter, string][]).map(([v, label]) => (
              <button type="button" key={v} className={queriedFilter === v ? "on" : undefined} aria-pressed={queriedFilter === v} onClick={() => setQueriedFilter(v)}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <span className="ag-chipdiv" aria-hidden="true" />
        <select
          className="ag-sortsel"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as AgentsSort)}
          aria-label="Sort agents"
          // Chevron lives here, not in agentsV2.css — the Tailwind v4 CSS parser rejects this data-URI.
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%2384878c' stroke-width='2'%3E%3Cpath d='M3 5l4 4 4-4'/%3E%3C/svg%3E")` }}
        >
          <option value="rating">Sort · Star rating</option>
          <option value="az">Sort · A to Z</option>
          <option value="resp">Sort · Response time</option>
        </select>
        <div className="ag-chipacts">
          <button type="button" className="ag-btn ag-btn-sm" disabled={!selectedAgent} onClick={() => selectedAgent && sendQueryFlow(selectedAgent)}>
            <Send aria-hidden="true" /> Send query
          </button>
          <button type="button" className="ag-btn ag-btn-sm" disabled={!selectedAgent} onClick={() => selectedAgent && openEditAgent(selectedAgent.id)}>
            <Pencil aria-hidden="true" /> Edit profile
          </button>
        </div>
      </div>

      {/* Panes */}
      <div className="ag-panes">
        <div className="ag-listcol">
          {upNext && (
            <button type="button" className="ag-upnext ag-panel" onClick={() => setSelectedAgentId(upNext.id)}>
              <span className="ag-spark" aria-hidden="true"><Sparkles /></span>
              <span style={{ minWidth: 0 }}>
                <span className="ag-ut" style={{ display: "block" }}>Up next</span>
                <span className="ag-un" style={{ display: "block" }}>{upNext.name}</span>
                <span className="ag-um" style={{ display: "block" }}>{upNextMeta(upNext)}</span>
              </span>
              <span
                className="ag-btn ag-btn-sm ag-go"
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); sendQueryFlow(upNext); }}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); sendQueryFlow(upNext); } }}
              >
                Send query
              </span>
            </button>
          )}
          <div className="ag-listbox ag-panel" ref={listRef} role="listbox" aria-label="Agents">
            {flat.length ? (
              groups.map((g) => (
                <React.Fragment key={g.key}>
                  {g.label && (
                    <div className="ag-grp" role="presentation">
                      <span>{g.label}</span>
                      {g.stars && <span className="ag-gstars">{g.stars}</span>}
                    </div>
                  )}
                  {g.rows.map(renderRow)}
                </React.Fragment>
              ))
            ) : (
              <div className="ag-listempty">
                {agents.length ? "No agents match these filters." : "No agents yet — your list starts here."}
              </div>
            )}
          </div>
          <div className="ag-hint" aria-hidden="true">↑ ↓ or J / K to move · / or ⌘K to search</div>
        </div>

        <div className="ag-pane ag-panel">{renderPane()}</div>
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
