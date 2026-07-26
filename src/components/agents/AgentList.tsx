/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Agent list — the page body (design authority: design-refs/agent-list-mockup.html).
 *
 * Phase 1 ships the chrome: header + Add button, filter chips with live counts, the search pill,
 * the three-swatch legend, the count line and the grid frame with its empty states. The cards
 * (Phase 2) and the flip editor (Phase 3+) drop into the grid; every value shown here is derived
 * in src/lib/agentList.ts, never stored.
 *
 * The page owns its own chrome and scroll — it mounts in a bare `fill`+`clip` StagePage.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { useScriptAllyDb } from "../../lib/db";
import { AgentCard } from "./AgentCard";
import { AgentEditor } from "./AgentEditor";
import {
  AgentDraft,
  AgentEditorTab,
  DraftError,
  diffDraft,
  draftFromAgent,
  isDiffEmpty,
  validateDraft,
} from "../../lib/agentDraft";
import { deleteField } from "firebase/firestore";
import { Agent } from "../../types";
import { agentRelationship } from "../../lib/agentList";
import {
  AGENT_LIST_CHIPS,
  AgentListFilter,
  agentCountLine,
  agentListCounts,
  visibleAgents,
} from "../../lib/agentList";
import "./agentList.css";

interface AgentListProps {
  /** A global search landing on this route seeds the page filter. */
  searchQuery?: string;
  /** App's navigate bridge — opts.agentId preselects the Log-a-Query agent. */
  onNavigate?: (tab: string, subPageName?: string, opts?: { agentId?: string }) => void;
}

export const AgentList: React.FC<AgentListProps> = ({ searchQuery, onNavigate }) => {
  const { agents, queries, manuscripts, activities, updateAgent } = useScriptAllyDb();

  const [filter, setFilter] = useState<AgentListFilter>("all");
  const [search, setSearch] = useState(searchQuery?.trim() || "");

  const counts = useMemo(() => agentListCounts(agents, queries), [agents, queries]);
  const visible = useMemo(
    () => visibleAgents(agents, queries, filter, search),
    [agents, queries, filter, search],
  );

  // ── Flip + buffered draft (decision 1) ────────────────────────────────────
  // ONE card is open at a time. Opening clones the agent into `draft`; every editor interaction
  // mutates the draft only; Done validates, diffs and commits a SINGLE updateAgent call; Escape
  // (or opening another card) discards it. Nothing here writes per keystroke.
  const [flippedId, setFlippedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AgentDraft | null>(null);
  const [tab, setTab] = useState<AgentEditorTab>("contact");
  const [error, setError] = useState<DraftError | null>(null);

  const discard = useCallback(() => {
    setFlippedId(null);
    setDraft(null);
    setError(null);
  }, []);

  const onEdit = useCallback(
    (agentId: string) => {
      const agent = agents.find((a) => a.id === agentId);
      if (!agent) return;
      setFlippedId(agentId);
      setDraft(draftFromAgent(agent));
      setTab("contact");
      setError(null);
    },
    [agents],
  );

  const onDone = useCallback(async () => {
    if (!draft) return;
    const invalid = validateDraft(draft);
    if (invalid) {
      setError(invalid);
      setTab(invalid.tab);
      return;
    }
    const original = agents.find((a) => a.id === draft.id);
    if (!original) return discard();

    const diff = diffDraft(original, draft);
    if (!isDiffEmpty(diff)) {
      // deleteField() for values the writer cleared, so absence round-trips as absence rather
      // than a stored 0/false (the repo's existing unset convention).
      const payload: Partial<Agent> = { ...diff.changed };
      for (const key of diff.deletes) {
        (payload as Record<string, unknown>)[key] = deleteField();
      }
      await updateAgent(draft.id, payload);
    }
    discard();
  }, [agents, draft, discard, updateAgent]);

  // ── Escape cascade (three stages, in order) ───────────────────────────────
  // 1. An open popup consumes Escape and closes itself — AgentCountryPicker listens on the
  //    CAPTURE phase and calls stopImmediatePropagation, so this bubble-phase handler never runs
  //    for that key. Dismissing a dropdown must never discard the draft.
  // 2. Focus in a field → blur it, draft untouched.
  // 3. Nothing focused → discard the draft and flip back. No confirmation: silent discard matches
  //    switching cards, and a modal here would be heavier than the risk.
  useEffect(() => {
    if (!flippedId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const el = document.activeElement as HTMLElement | null;
      const inField =
        !!el &&
        (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
      if (inField) {
        e.preventDefault();
        el!.blur();
        return;
      }
      e.preventDefault();
      discard();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flippedId, discard]);

  // A card that scrolls out of the filtered set takes its draft with it.
  useEffect(() => {
    if (flippedId && !visible.some((a) => a.id === flippedId)) discard();
  }, [visible, flippedId, discard]);

  // Phase 6 wires the real draft-agent flow; the header button is a stub until then.
  const onAddAgent = () => onNavigate?.("agents", "Add an agent");
  const onLogQuery = (agent: { id: string }) => onNavigate?.("queries", "Log a query", { agentId: agent.id });

  return (
    <div className="aglist">
      <div className="agl-page">
        <div className="agl-head">
          <div>
            <div className="agl-crumb">
              Querying &nbsp;/&nbsp; <span className="cur">Agents</span>
            </div>
            <h1 className="agl-h1">Your agent list</h1>
            <p className="agl-sub">Everyone you're querying, watching, or saving for later.</p>
          </div>
          <button type="button" className="agl-btn agl-btn-dark agl-btn-add" onClick={onAddAgent}>
            <Plus width={14} height={14} aria-hidden="true" />
            Add new agent
          </button>
        </div>

        <div className="agl-controls">
          {AGENT_LIST_CHIPS.map((chip) => (
            <button
              type="button"
              key={chip.key}
              className={`agl-fchip${filter === chip.key ? " on" : ""}`}
              aria-pressed={filter === chip.key}
              onClick={() => setFilter(chip.key)}
            >
              {chip.label} <span className="n">{counts[chip.key]}</span>
            </button>
          ))}
          <div className="agl-spacer" />
          <div className="agl-search">
            <Search width={14} height={14} aria-hidden="true" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search agents or agencies…"
              aria-label="Search agents or agencies"
            />
          </div>
        </div>

        <div className="agl-legend">
          <span className="agl-leg">
            <span className="sw" style={{ background: "var(--agl-sage-band)" }} />
            Active queries
          </span>
          <span className="agl-leg">
            <span className="sw" style={{ background: "var(--agl-pink-band)" }} />
            No active queries
          </span>
          <span className="agl-leg dim">
            <span className="sw" style={{ background: "var(--agl-grey-band)" }} />
            Closed for submissions
          </span>
        </div>

        <div className="agl-countline">{agentCountLine(visible.length, agents.length)}</div>

        <div className="agl-grid">
          {visible.length === 0 && (
            <div className="agl-empty">
              {agents.length === 0 ? (
                <>
                  <div className="big">No agents yet.</div>
                  <div className="small">Add the first one and your list starts here.</div>
                </>
              ) : (
                <>
                  <div className="big">No agents match.</div>
                  <div className="small">Loosen the filter, or clear the search.</div>
                </>
              )}
            </div>
          )}
          {visible.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              queries={queries}
              manuscripts={manuscripts}
              activities={activities}
              onEdit={onEdit}
              onLogQuery={onLogQuery}
              flipped={flippedId === agent.id}
              editor={
                draft && flippedId === agent.id ? (
                  <AgentEditor
                    draft={draft}
                    onChange={(patch) => setDraft((d) => (d ? { ...d, ...patch } : d))}
                    tab={tab}
                    onTab={setTab}
                    onDone={() => void onDone()}
                    error={error}
                    onImageError={(msg) => setError({ tab: "contact", msg })}
                    isNew={false}
                    hasActiveQueries={agentRelationship(agent.id, queries) === "active"}
                  />
                ) : null
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
};
