/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The phone search (PhoneSearch): it ranks the palette's own corpus (`searchPalette`) and runs a row exactly as the
 * palette does. Nothing here writes.
 *
 * The phone dashboard's top bar that lived here (the mark, the manuscript switcher, Search, Feedback and the pink +
 * menu) is RETIRED by Phone app v2, Part 1C: the shell's navy band and the tab bar's + took its jobs.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import type { Agent, Query } from "../../../types";
import { ShellScope } from "../../shell/ShellSidebar";
import { openFeedback } from "../../../lib/feedbackStore";
import { buildCorpus, rankItems, type PaletteItem } from "../../../lib/searchPalette";
import { agentPrimary, agentSecondary } from "../../../lib/agentDisplay";
import { STAGE_NAME } from "../../../lib/qcSummary";
import { initialsOf } from "../../../lib/searchSuggestionsCore";

export interface PhoneActions {
  onLog: () => void;
  onRecord: () => void;
  onAddAgent: () => void;
}

/* ── search ─────────────────────────────────────────────────────────────────────────────────── */

interface SearchRow { id: string; name: string; sub: string; initials: string; run: () => void }

/** A stored date (Timestamp, ISO string or ms) as ms; 0 when it cannot be read. */
const msOf = (v: unknown): number => {
  if (v && typeof (v as { toDate?: unknown }).toDate === "function") return (v as { toDate: () => Date }).toDate().getTime();
  if (typeof v === "number") return v;
  return typeof v === "string" ? Date.parse(v) || 0 : 0;
};
const movedAt = (q: Query): number => msOf(q.lastStatusChange) || msOf(q.dateSent);

/** The agent's latest query on any book, by its own last change. */
const latestQuery = (queries: readonly Query[], agentId: string): Query | null => {
  let best: Query | null = null, at = -1;
  for (const q of queries) {
    if (q.agentId !== agentId) continue;
    const t = movedAt(q);
    if (t > at) { best = q; at = t; }
  }
  return best;
};

export const PhoneSearch: React.FC<{
  agents: readonly Agent[];
  queries: readonly Query[];
  manuscripts: Parameters<typeof buildCorpus>[0]["manuscripts"];
  onClose: () => void;
  onOpenQuery: (queryId: string) => void;
  onOpenAgent: (name: string) => void;
}> = ({ agents, queries, manuscripts, onClose, onOpenQuery, onOpenAgent }) => {
  const [term, setTerm] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true })); }, []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onClose(); } };
    document.addEventListener("keydown", key, true);
    return () => document.removeEventListener("keydown", key, true);
  }, [onClose]);
  const agentById = useMemo(() => new Map(agents.map((a) => [a.id, a])), [agents]);
  const subFor = (a: Agent | undefined, q: Query | null) =>
    [a ? agentSecondary(a) : "", q ? STAGE_NAME[q.status] : ""].filter(Boolean).join(" · ");
  /* the palette's own corpus and ranking — agents and queries only; a row runs as the palette runs it */
  const corpus = useMemo(
    () => buildCorpus({ agents: agents as Agent[], queries: queries as Query[], manuscripts, now: Date.now(), agentLabel: (a) => ({ primary: agentPrimary(a), secondary: agentSecondary(a) }) })
      .filter((i) => i.group === "Agents" || i.group === "Queries"),
    [agents, queries, manuscripts],
  );
  const toRow = useCallback((item: PaletteItem): SearchRow | null => {
    if (item.run.kind === "agent") {
      const a = agentById.get(item.run.agentId);
      const name = item.run.name;
      return { id: item.id, name, sub: subFor(a, a ? latestQuery(queries, a.id) : null), initials: initialsOf(name), run: () => onOpenAgent(name) };
    }
    if (item.run.kind === "query") {
      const qid = item.run.queryId;
      const q = queries.find((x) => x.id === qid) ?? null;
      const a = q ? agentById.get(q.agentId) : undefined;
      const name = a ? agentPrimary(a) : item.title;
      return { id: item.id, name, sub: subFor(a, q), initials: initialsOf(name), run: () => onOpenQuery(qid) };
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentById, queries, onOpenAgent, onOpenQuery]);
  /* with nothing typed: the agents of the three queries that moved most recently */
  const recent = useMemo<SearchRow[]>(() => {
    const seen = new Set<string>();
    const out: SearchRow[] = [];
    const sorted = [...queries].sort((a, b) => movedAt(b) - movedAt(a));
    for (const q of sorted) {
      if (seen.has(q.agentId)) continue;
      const a = agentById.get(q.agentId);
      if (!a) continue;
      seen.add(q.agentId);
      const name = agentPrimary(a);
      out.push({ id: `recent:${q.id}`, name, sub: subFor(a, q), initials: initialsOf(name), run: () => onOpenQuery(q.id) });
      if (out.length === 3) break;
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queries, agentById, onOpenQuery]);
  const found = useMemo(() => {
    if (!term.trim()) return null;
    const rows: SearchRow[] = [];
    for (const item of rankItems(corpus, term)) {
      const r = toRow(item);
      if (r) rows.push(r);
      if (rows.length === 8) break;
    }
    return rows;
  }, [term, corpus, toRow]);
  const rows = found ?? recent;
  return (
    <div className="dm1-search" role="dialog" aria-modal="true" aria-label="Search" data-dm1="search">
      <div className="dm1-shead">
        <label className="dm1-sfield">
          <Search aria-hidden="true" />
          <input
            ref={inputRef} type="search" value={term} onChange={(e) => setTerm(e.target.value)}
            placeholder="Agents, agencies, queries" aria-label="Search agents, agencies and queries" data-dm1="search-input"
          />
        </label>
        <button type="button" className="dm1-scancel" onClick={onClose} data-dm1="search-cancel">Cancel</button>
      </div>
      <p className="dm1-slabel">{found ? (found.length ? "Results" : "No matches") : "Recent"}</p>
      {rows.length > 0 && (
        <ul className="dm1-group dm1-srows" data-dm1="search-rows">
          {rows.map((r) => (
            <li key={r.id}>
              <button type="button" className="dm1-srow" onClick={() => { onClose(); r.run(); }}>
                <span className="dm1-sav" aria-hidden="true">{r.initials}</span>
                <span className="dm1-stxt"><b>{r.name}</b>{r.sub && <small>{r.sub}</small>}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="dm1-snote">Searches agents, agencies and your queries across the whole app.</p>
    </div>
  );
};

/* (The bar itself — PhoneTopBar and its + menu — is RETIRED by Phone app v2, Part 1C: the shell's navy band and the
   tab bar's + took their jobs. This module keeps PhoneSearch, which two phone pages still open.) */
