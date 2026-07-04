/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Dashboard-only floating top bar (v37, tb-w-float + tb-l-center): date left · composed search
 * pill centred (magnifier / input / ⌘K kbd chip) · settings + avatar + display name right.
 * ⌘K / Ctrl+K focuses the search while the dashboard is mounted and visible.
 *
 * The pill is the CANONICAL dashboard search: it consumes the same shared suggestion machinery
 * as the rail search (useSearchSuggestions / SearchSuggestionsList — identical groups, ranking,
 * keyboard navigation and selection semantics), rendered as a theme-aware floating card.
 * Escape closes the dropdown first, then blurs the field. The rail search is hidden on this
 * route, so the ⌘K registration here is the only one live on the dashboard.
 */
import React, { useEffect, useRef } from "react";
import { Search, Settings } from "lucide-react";
import { FONT_SERIF } from "../../lib/designTokens";
import { longDate } from "../../lib/dashboardStats";
import { useSearchSuggestions, SearchSuggestionsList } from "../searchSuggestions";

interface DashTopBarProps {
  userName: string;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onNavigate: (tab: string, subPageName?: string) => void;
  onSettings: () => void;
  onAccount: () => void;
  /** ⌘K only binds while the dashboard route is visible. */
  active: boolean;
}

export const DashTopBar: React.FC<DashTopBarProps> = ({
  userName,
  searchQuery,
  setSearchQuery,
  onNavigate,
  onSettings,
  onAccount,
  active,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const suggestions = useSearchSuggestions({ searchQuery, setSearchQuery, onNavigate, wrapRef });
  const { showDropdown, onKeyDown, onChange, onFocus } = suggestions;

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  return (
    <div className="sa-dtop">
      <div className="sa-dtop-left">
        <span className="sa-dtop-date">{longDate(new Date())}</span>
      </div>
      <div ref={wrapRef} className="sa-dtop-searchwrap" style={{ position: "relative" }}>
        <Search width={13} height={13} aria-hidden="true" />
        <input
          ref={inputRef}
          className="sa-dtop-search"
          placeholder="Search agents, queries…"
          value={searchQuery}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          onKeyDown={(e) => {
            const consumed = onKeyDown(e);
            // Escape with the dropdown already closed → second stage: blur the field.
            if (!consumed && e.key === "Escape") inputRef.current?.blur();
          }}
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls="nav-search-listbox"
          aria-autocomplete="list"
          aria-label="Search agents and queries"
        />
        <kbd>⌘K</kbd>
        {showDropdown && (
          <SearchSuggestionsList suggestions={suggestions} searchQuery={searchQuery} chrome="theme" width="100%" />
        )}
      </div>
      <div className="sa-dtop-right">
        <button type="button" className="sa-dtop-icon" title="Settings" aria-label="Settings" onClick={onSettings}>
          <Settings width={15} height={15} />
        </button>
        <button type="button" className="sa-dtop-user" onClick={onAccount} title="Account settings">
          <span
            className="flex items-center justify-center select-none shrink-0"
            style={{
              width: 26, height: 26, borderRadius: "50%",
              background: "var(--card, #fdfaf5)", border: "1px solid rgba(124,58,42,0.25)",
              fontFamily: FONT_SERIF, fontSize: 11, fontWeight: 500, color: "var(--acc, #7c3a2a)",
            }}
          >
            {userName[0]?.toUpperCase()}
          </span>
          <span>{userName}</span>
        </button>
      </div>
    </div>
  );
};
