/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shared smart-search machinery — extracted VERBATIM from NavSearch so the rail search and the
 * dashboard top-bar search consume one implementation (no forked suggestion logic anywhere).
 *
 *  - buildSearchSuggestions / stepHighlight: pure (unit-tested) — grouping, ranking, caps and
 *    the ↑/↓ wrap. Data is the in-memory useScriptAllyDb() state, so there is no debounce and
 *    no loading state by design.
 *  - useSearchSuggestions: the stateful hook (open/highlight/outside-click/keyboard/navigation).
 *    Selection semantics are unchanged: an agent navigates to the Agents page and seeds
 *    searchQuery as its filter; a query deep-selects via onNavigate("queries", id).
 *  - SearchSuggestionsList: the dropdown. `chrome="classic"` is the byte-for-byte NavSearch
 *    parchment card (inset burgundy frame); `chrome="theme"` renders the same rows on the
 *    theme tokens (card surface, --bd border, soft shadow) for the dashboard top bar.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useScriptAllyDb } from "../lib/db";
import { Agent, Query } from "../types";
import { StatusDot } from "./StatusDot";
import { burgundy, bodyInk, parchment, mutedInk, sageText, FONT_SERIF, FONT_SANS, FONT_MONO } from "../lib/designTokens";
import { buildSearchSuggestions, initialsOf, stepHighlight, SearchHit } from "../lib/searchSuggestionsCore";

// Pure core re-exported so consumers/tests have one import path of record.
export { buildSearchSuggestions, initialsOf, stepHighlight, SEARCH_CAP } from "../lib/searchSuggestionsCore";
export type { SearchHit, SearchSuggestionGroups } from "../lib/searchSuggestionsCore";

const PINK = "#f8e7dc";

export interface UseSearchSuggestionsArgs {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onNavigate: (tab: string, subPageName?: string) => void;
  /** Wrapper element — clicks outside it close the dropdown. */
  wrapRef: React.RefObject<HTMLElement | null>;
}

export const useSearchSuggestions = ({ searchQuery, setSearchQuery, onNavigate, wrapRef }: UseSearchSuggestionsArgs) => {
  const { agents, queries, manuscripts } = useScriptAllyDb();
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const term = searchQuery.trim().toLowerCase();
  const groups = useMemo(
    () => buildSearchSuggestions(term, agents, queries, manuscripts),
    [term, agents, queries, manuscripts],
  );
  const { flat } = groups;

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
  }, [open, wrapRef]);

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
  const openFlat = (item: SearchHit) => (item.kind === "agent" ? openAgent(item.agent) : openQuery(item.query));

  /** Shared key handling. Returns true when the key was consumed (Escape-with-closed falls
   *  through so consumers can add their own second-stage behaviour, e.g. blur). */
  const onKeyDown = (e: React.KeyboardEvent): boolean => {
    if (e.key === "Escape") {
      if (open) {
        setOpen(false);
        return true;
      }
      return false;
    }
    if (!showDropdown || !hasResults) {
      if (e.key === "ArrowDown" && term) {
        setOpen(true);
        return true;
      }
      return false;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => stepHighlight(e.key, h, flat.length));
      return true;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const item = flat[highlight] || flat[0];
      if (item) openFlat(item);
      return true;
    }
    return false;
  };

  const onChange = (value: string) => {
    setSearchQuery(value);
    setOpen(value.trim().length > 0);
  };
  const onFocus = () => {
    if (term) setOpen(true);
  };

  return { groups, term, open, setOpen, showDropdown, hasResults, highlight, setHighlight, openAgent, openQuery, openFlat, onKeyDown, onChange, onFocus };
};

export interface SearchSuggestionsListProps {
  suggestions: ReturnType<typeof useSearchSuggestions>;
  searchQuery: string;
  /** classic = the NavSearch parchment card (unchanged); theme = var(--card)/--bd for the dashboard. */
  chrome?: "classic" | "theme";
  /** Dropdown width (classic desktop default 340; mobile passes "100%"). */
  width?: number | string;
}

export const SearchSuggestionsList: React.FC<SearchSuggestionsListProps> = ({
  suggestions,
  searchQuery,
  chrome = "classic",
  width = 340,
}) => {
  const { groups, hasResults, highlight, setHighlight, openAgent, openQuery } = suggestions;
  const { agentResults, queryResults } = groups;

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
  const highlightBg = chrome === "theme" ? "var(--abtn-hov, #f4f2ef)" : PINK;

  const card: React.CSSProperties =
    chrome === "theme"
      ? {
          width,
          maxWidth: "90vw",
          background: "var(--card, #fffefb)",
          border: "var(--bdw, 1px) solid var(--bd, #d8cebf)",
          borderRadius: 12,
          boxShadow: "0 1px 3px rgba(20,20,20,.08), 0 12px 30px rgba(20,20,20,.14)",
          overflow: "hidden",
          zIndex: 60,
          position: "absolute",
        }
      : {
          width,
          maxWidth: typeof width === "string" ? "100%" : "90vw",
          background: parchment,
          borderRadius: 12,
          boxShadow: "0 1px 3px rgba(40,22,14,.10), 0 12px 30px rgba(40,22,14,.18)",
          overflow: "hidden",
          zIndex: 60,
          position: "absolute",
        };

  let idx = -1; // running index across the flattened list (agents then queries)

  return (
    <div id="nav-search-listbox" role="listbox" className="absolute left-0 top-[calc(100%+8px)]" style={card}>
      {/* signature inset frame — the classic chrome only */}
      {chrome === "classic" && (
        <div aria-hidden="true" style={{ position: "absolute", inset: 5, border: "1px solid rgba(124,58,42,0.22)", borderRadius: 8, pointerEvents: "none", zIndex: 2 }} />
      )}

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
                  style={{ ...rowBase, background: active ? highlightBg : "transparent" }}
                >
                  {/* Monogram follows the StatusDot token pair so it lands burgundy-on-blush in
                      Capp, ink-on-soft-pink in Bold, graphite-on-grey in Editorial; the fallbacks
                      are the pre-theme colours for un-themed surfaces (mobile slim bar). */}
                  <span
                    className="flex items-center justify-center shrink-0"
                    style={{ width: 28, height: 28, borderRadius: "50%", background: `var(--sd-centre, ${PINK})`, border: "0.5px solid var(--sd-hue, #e8c8bc)", fontFamily: FONT_SERIF, fontSize: 11, fontWeight: 600, color: `var(--sd-hue, ${burgundy})` }}
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
                  style={{ ...rowBase, background: active ? highlightBg : "transparent" }}
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
  );
};
