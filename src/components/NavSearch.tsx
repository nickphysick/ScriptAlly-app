/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Nav search — a live typeahead over the user's agents and queries. As you type, a parchment
 * dropdown shows matching Agents (initials avatar + name + agency) then Queries (the real
 * StatusDot for the query's status + agent name + manuscript · status), each capped at 4.
 * Full keyboard support; opens results via the app's existing routes (no new data paths):
 *   agent  → onNavigate("agents") + setSearchQuery(name)  (Agents filters + auto-selects it)
 *   query  → onNavigate("queries", query.id)              (Queries selects it by id)
 *
 * Data is the in-memory useScriptAllyDb() state, so we filter directly (no debounce needed).
 * The field stays bound to the shared searchQuery so it also keeps filtering the active page.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useScriptAllyDb } from "../lib/db";
import { StatusDot } from "./StatusDot";
import { Agent, Query } from "../types";
import {
  parchment,
  burgundy,
  bodyInk,
  mutedInk,
  sageText,
  FONT_SERIF,
  FONT_SANS,
  FONT_MONO,
  labelColor,
} from "../lib/designTokens";

interface NavSearchProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onNavigate: (tab: string, subPageName?: string) => void;
}

const PINK = "#f8e7dc";
const CAP = 4;

/** "Eva Vance" → "EV", "Arthur Conan Doyle" → "ACD" (max 3). */
const initialsOf = (name: string) =>
  (name || "")
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .join("")
    .slice(0, 3)
    .toUpperCase() || "?";

type Flat =
  | { kind: "agent"; agent: Agent }
  | { kind: "query"; query: Query; agent?: Agent; manuscriptTitle: string };

export const NavSearch: React.FC<NavSearchProps> = ({ searchQuery, setSearchQuery, onNavigate }) => {
  const { agents, queries, manuscripts } = useScriptAllyDb();
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const term = searchQuery.trim().toLowerCase();

  const { agentResults, queryResults, flat } = useMemo(() => {
    if (!term) return { agentResults: [] as Agent[], queryResults: [] as Flat[], flat: [] as Flat[] };

    const agentResults = agents
      .filter((a) => a.name.toLowerCase().includes(term) || (a.agency || "").toLowerCase().includes(term))
      .slice(0, CAP);

    const queryResults: Flat[] = queries
      .map((q) => {
        const agent = agents.find((a) => a.id === q.agentId);
        const manuscriptTitle = manuscripts.find((m) => m.id === q.manuscriptId)?.title || "Untitled manuscript";
        return { kind: "query" as const, query: q, agent, manuscriptTitle };
      })
      .filter(
        (r) =>
          (r.agent?.name || "").toLowerCase().includes(term) ||
          r.manuscriptTitle.toLowerCase().includes(term) ||
          String(r.query.status).toLowerCase().includes(term)
      )
      .slice(0, CAP);

    const flat: Flat[] = [...agentResults.map((agent) => ({ kind: "agent" as const, agent })), ...queryResults];
    return { agentResults, queryResults, flat };
  }, [term, agents, queries, manuscripts]);

  // Top result highlighted by default whenever the result set changes.
  useEffect(() => {
    setHighlight(0);
  }, [term, flat.length]);

  // Outside-click closes the dropdown.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const showDropdown = open && term.length > 0;
  const hasResults = flat.length > 0;

  const openAgent = (a: Agent) => {
    setOpen(false);
    onNavigate("agents");
    setSearchQuery(a.name); // Agents page filters by this and auto-selects the match
  };
  const openQuery = (q: Query) => {
    setOpen(false);
    onNavigate("queries", q.id); // Queries page selects this id (clears the shared search)
  };
  const openFlat = (item: Flat) => (item.kind === "agent" ? openAgent(item.agent) : openQuery(item.query));

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!showDropdown || !hasResults) {
      if (e.key === "ArrowDown" && term) setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % flat.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h - 1 + flat.length) % flat.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = flat[highlight] || flat[0];
      if (item) openFlat(item);
    }
  };

  const rowBase: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    margin: "0 7px", // inset so the highlight pill stays inside the inset frame
    padding: "8px 9px",
    borderRadius: 8,
    cursor: "pointer",
    textAlign: "left",
    width: "calc(100% - 14px)",
    background: "transparent",
    border: "none",
  };
  const sectionLabel: React.CSSProperties = {
    fontFamily: FONT_MONO,
    fontSize: 9,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: sageText,
    padding: "9px 16px 5px",
  };

  let idx = -1; // running index across the flattened list (agents then queries)

  return (
    <div ref={wrapRef} className="relative max-sm:hidden" style={{ flexShrink: 0 }}>
      {/* Search pill (parchment, as before) */}
      <div
        className="flex items-center gap-2"
        style={{ background: "#ffffff", border: "0.5px solid #e0d5c8", borderRadius: 9, padding: "8px 12px", width: 200 }}
      >
        <Search className="w-[13px] h-[13px] shrink-0" style={{ color: labelColor }} />
        <input
          type="text"
          placeholder="Search…"
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setOpen(e.target.value.trim().length > 0); }}
          onFocus={() => { if (term) setOpen(true); }}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls="nav-search-listbox"
          aria-autocomplete="list"
          className="bg-transparent border-none outline-none w-full min-w-0 placeholder-[#c8b8a8]"
          style={{ fontFamily: FONT_SANS, fontSize: 12, color: bodyInk }}
        />
      </div>

      {showDropdown && (
        <div
          id="nav-search-listbox"
          role="listbox"
          className="absolute left-0 top-[calc(100%+8px)]"
          style={{
            width: 340,
            maxWidth: "90vw",
            background: parchment,
            borderRadius: 12,
            boxShadow: "0 1px 3px rgba(40,22,14,.10), 0 12px 30px rgba(40,22,14,.18)",
            overflow: "hidden",
            zIndex: 60,
            position: "absolute",
          }}
        >
          {/* signature inset frame */}
          <div aria-hidden="true" style={{ position: "absolute", inset: 5, border: "1px solid rgba(124,58,42,0.22)", borderRadius: 8, pointerEvents: "none", zIndex: 2 }} />

          <div style={{ position: "relative", zIndex: 1, padding: "6px 0" }}>
            {!hasResults && (
              <div style={{ fontFamily: FONT_SANS, fontSize: 12.5, color: mutedInk, fontStyle: "italic", padding: "12px 16px" }}>
                No matches for “{searchQuery.trim()}”
              </div>
            )}

            {agentResults.length > 0 && (
              <>
                <div style={sectionLabel}>Agents</div>
                {agentResults.map((a) => {
                  idx += 1;
                  const i = idx;
                  const active = i === highlight;
                  return (
                    <button
                      key={a.id}
                      role="option"
                      aria-selected={active}
                      onMouseEnter={() => setHighlight(i)}
                      onClick={() => openAgent(a)}
                      style={{ ...rowBase, background: active ? PINK : "transparent" }}
                    >
                      <span
                        className="flex items-center justify-center shrink-0"
                        style={{ width: 28, height: 28, borderRadius: "50%", background: PINK, border: "0.5px solid #e8c8bc", fontFamily: FONT_SERIF, fontSize: 11, fontWeight: 600, color: burgundy }}
                      >
                        {initialsOf(a.name)}
                      </span>
                      <span style={{ minWidth: 0 }}>
                        <span className="truncate" style={{ display: "block", fontFamily: FONT_SERIF, fontSize: 13.5, color: burgundy, lineHeight: 1.15 }}>{a.name}</span>
                        <span className="truncate" style={{ display: "block", fontFamily: FONT_SANS, fontSize: 11, color: mutedInk }}>{a.agency || "Independent"}</span>
                      </span>
                    </button>
                  );
                })}
              </>
            )}

            {queryResults.length > 0 && (
              <>
                <div style={sectionLabel}>Queries</div>
                {queryResults.map((r) => {
                  if (r.kind !== "query") return null;
                  idx += 1;
                  const i = idx;
                  const active = i === highlight;
                  const agentName = r.agent?.name || "Unknown agent";
                  return (
                    <button
                      key={r.query.id}
                      role="option"
                      aria-selected={active}
                      onMouseEnter={() => setHighlight(i)}
                      onClick={() => openQuery(r.query)}
                      style={{ ...rowBase, background: active ? PINK : "transparent" }}
                    >
                      <span className="shrink-0 flex items-center justify-center" style={{ width: 28 }}>
                        <StatusDot status={r.query.status} size={16} />
                      </span>
                      <span style={{ minWidth: 0 }}>
                        <span className="truncate" style={{ display: "block", fontFamily: FONT_SERIF, fontSize: 13.5, color: burgundy, lineHeight: 1.15 }}>{agentName}</span>
                        <span className="truncate" style={{ display: "block", fontFamily: FONT_SANS, fontSize: 11, color: mutedInk }}>{r.manuscriptTitle} · {String(r.query.status)}</span>
                      </span>
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
