/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Dashboard-only floating top bar (v37, tb-w-float + tb-l-center): date left · composed search
 * pill centred (magnifier / input / ⌘K kbd chip) · settings + avatar + display name right.
 * ⌘K / Ctrl+K focuses the search while the dashboard is mounted and visible. The input is wired
 * to the app's existing `searchQuery` flow (the same state the rail typeahead feeds).
 */
import React, { useEffect, useRef } from "react";
import { Search, Settings } from "lucide-react";
import { FONT_SERIF } from "../../lib/designTokens";
import { longDate } from "../../lib/dashboardStats";

interface DashTopBarProps {
  userName: string;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onSettings: () => void;
  onAccount: () => void;
  /** ⌘K only binds while the dashboard route is visible. */
  active: boolean;
}

export const DashTopBar: React.FC<DashTopBarProps> = ({
  userName,
  searchQuery,
  setSearchQuery,
  onSettings,
  onAccount,
  active,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

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
      <div className="sa-dtop-searchwrap">
        <Search width={13} height={13} aria-hidden="true" />
        <input
          ref={inputRef}
          className="sa-dtop-search"
          placeholder="Search agents, queries…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Search agents and queries"
        />
        <kbd>⌘K</kbd>
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
