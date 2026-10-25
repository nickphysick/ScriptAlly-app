/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Contact list's Filters menu and the agent's social line — moved here from the retired address-book box
 * (navy-bar v1's `book/ContactBook.tsx`, deleted by Contact list v24 Part D) unchanged: the List / Cards bar and full
 * screen's cream row both open this one menu, with its Export.
 */
import React, { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { type AgentFacts, type ContactFilters, emptyContactFilters } from "../../../lib/contactList";
import { mswlLinkOf } from "../../../lib/agentCard";
import "./contactFilters24.css";

/** the agent's first social on record (X, Bluesky, Instagram, any other), else their MSWL page */
export function socialOf(a: AgentFacts["agent"]): string {
  const direct = [a.twitter, a.bluesky, a.instagram].map((s) => (s ?? "").trim()).find(Boolean);
  if (direct) return direct;
  const other = (a.socials ?? []).find((s) => !/mswl/i.test(s.platform) && s.handle.trim());
  if (other) return other.handle.trim();
  return mswlLinkOf(a) ?? "";
}

/* ── the Filters pop-over: genres with counts, Open to queries only, and the footer ─────────────────────────── */

export const FilterMenu: React.FC<{
  anchor: HTMLElement; filters: ContactFilters; onFilters: (f: ContactFilters) => void; genres: { key: string; label: string; n: number }[];
  openN: number; showing: number; total: number; onExport: () => void;
}> = ({ anchor, filters: f, onFilters, genres, openN, showing, total, onExport }) => {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  useLayoutEffect(() => {
    const r = anchor.getBoundingClientRect();
    setPos({ top: r.bottom + 8, left: Math.max(12, Math.min(r.left, window.innerWidth - 332)) });
  }, [anchor]);
  const any = f.genres.length > 0 || f.open === "open";
  const toggleGenre = (k: string) => onFilters({ ...f, genres: f.genres.includes(k) ? f.genres.filter((g) => g !== k) : [...f.genres, k], genreMode: "any" });
  return createPortal(
    <div className="lpop nb1-pop" data-lpop="filters" data-nb1="filter-menu" role="dialog" aria-label="Filter agents" style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}>
      <h6>Genres</h6>
      <div className="nb1-gch">
        {genres.map((g) => (
          <button key={g.key} type="button" data-nb1="genre" data-k={g.key} aria-pressed={f.genres.includes(g.key)} onClick={() => toggleGenre(g.key)}>
            {g.label}<i>{g.n}</i>
          </button>
        ))}
      </div>
      <h6 className="nb1-gap">Submissions</h6>
      <button type="button" className="nb1-ck" data-nb1="open-only" aria-pressed={f.open === "open"}
        onClick={() => onFilters({ ...f, open: f.open === "open" ? "either" : "open" })}>
        <span className="nb1-bx" aria-hidden="true">{f.open === "open" ? "✓" : ""}</span>Open to queries only<em>{openN}</em>
      </button>
      <div className="nb1-mf" data-nb1="filter-foot">
        <span data-nb1="filter-count">{showing} of {total} showing</span>
        {any ? <button type="button" data-nb1="filter-clear" onClick={() => onFilters(emptyContactFilters())}>Clear filters</button> : null}
        <button type="button" data-nb1="export" onClick={onExport} disabled={showing === 0}>Export {showing} {showing === 1 ? "agent" : "agents"}</button>
      </div>
    </div>,
    document.body,
  );
};
