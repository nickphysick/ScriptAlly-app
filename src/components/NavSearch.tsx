/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NavSearch — the shell search field (rail on desktop, slim-bar row on mobile). A thin consumer
 * of the shared smart-search machinery in searchSuggestions.tsx: this file owns only the pill
 * presentation and its variants; all suggestion grouping, keyboard navigation and selection
 * behaviour live in useSearchSuggestions / SearchSuggestionsList (one implementation, shared
 * with the dashboard top-bar search — never fork it).
 *
 * Data is the in-memory useScriptAllyDb() state, so we filter directly (no debounce needed).
 */
import React, { useRef } from "react";
import { Search } from "lucide-react";
import { labelColor, bodyInk, FONT_SANS } from "../lib/designTokens";
import { useSearchSuggestions, SearchSuggestionsList } from "./searchSuggestions";

interface NavSearchProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onNavigate: (tab: string, subPageName?: string) => void;
  /**
   * "desktop" (default) keeps the original 200px pill, hidden below sm.
   * "mobile" is the slim-bar presentation: full-width pill, always visible, autofocused — used by
   * the top bar's mobile search toggle. The default preserves the desktop instance exactly.
   * "rail" is the AppShell sidebar presentation: full-width pill (the rail is ~216px), never
   * autofocused, no breakpoint hiding (the rail itself is desktop-only). Behaviour is otherwise
   * identical to desktop — same typeahead, same result navigation.
   */
  variant?: "desktop" | "mobile" | "rail";
  /** Optional ref to the input — lets the rail focus it from the ⌘K shortcut. */
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export const NavSearch: React.FC<NavSearchProps> = ({ searchQuery, setSearchQuery, onNavigate, variant = "desktop", inputRef }) => {
  const isMobile = variant === "mobile";
  const isRail = variant === "rail";
  const fullWidth = isMobile || isRail;
  const wrapRef = useRef<HTMLDivElement>(null);

  const suggestions = useSearchSuggestions({ searchQuery, setSearchQuery, onNavigate, wrapRef });
  const { showDropdown, onKeyDown, onChange, onFocus } = suggestions;

  return (
    <div ref={wrapRef} className={fullWidth ? "relative w-full" : "relative max-sm:hidden"} style={{ flexShrink: 0 }}>
      {/* Search pill (parchment, as before) */}
      <div
        className="flex items-center gap-2"
        style={{ background: "#ffffff", border: "0.5px solid #e0d5c8", borderRadius: 9, padding: "8px 12px", width: fullWidth ? "100%" : 240 }}
      >
        <Search className="w-[13px] h-[13px] shrink-0" style={{ color: labelColor }} />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search…"
          value={searchQuery}
          autoFocus={isMobile}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls="nav-search-listbox"
          aria-autocomplete="list"
          className="nav-search-field bg-transparent border-none outline-none w-full min-w-0 placeholder-[#c8b8a8]"
          style={{ fontFamily: FONT_SANS, fontSize: 12, color: bodyInk }}
        />
      </div>

      {showDropdown && (
        <SearchSuggestionsList
          suggestions={suggestions}
          searchQuery={searchQuery}
          chrome="classic"
          width={isMobile ? "100%" : 340}
        />
      )}
    </div>
  );
};
