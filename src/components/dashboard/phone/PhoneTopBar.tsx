/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The phone dashboard's top bar (Dashboard on the phone v1, Part A; ref design-refs/dashboard-mobile-v1/ screens 01,
 * 05, 06, 07). Home only, below 768px: the mark, the manuscript (the shell's own phone switcher, `ShellScope`),
 * then Search, Feedback and the pink + menu. On the page colour, no band; a hairline arrives once the page scrolls.
 *
 * ⚠️ EVERY CONTROL OPENS SOMETHING THAT ALREADY EXISTS. Search ranks the palette's own corpus (`searchPalette`) and
 * runs a row exactly as the palette does; Feedback opens the shell's FeedbackDock (`openFeedback`); the + menu's
 * three items call the desktop header's own three handlers. Nothing here writes.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageSquareText, Plus, Reply, Search, UserPlus } from "lucide-react";
import type { Agent, Query } from "../../../types";
import { ShellScope } from "../../shell/ShellSidebar";
import { QUERYHAWK_MARK } from "../v105/foundingArt";
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

/* ── the + menu ─────────────────────────────────────────────────────────────────────────────── */

const MENU: { key: keyof PhoneActions; label: string; Icon: typeof Plus }[] = [
  { key: "onLog", label: "Log a query", Icon: Plus },
  { key: "onRecord", label: "Record a response", Icon: Reply },
  { key: "onAddAgent", label: "Add an agent", Icon: UserPlus },
];

const PlusMenu: React.FC<{ actions: PhoneActions }> = ({ actions }) => {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const close = useCallback((focus: boolean) => {
    setOpen(false);
    if (focus) btnRef.current?.focus({ preventScroll: true });
  }, []);
  useEffect(() => {
    if (!open) return undefined;
    requestAnimationFrame(() => menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus({ preventScroll: true }));
    const down = (e: PointerEvent) => {
      const t = e.target as Node | null;
      if (t && (menuRef.current?.contains(t) || btnRef.current?.contains(t))) return;
      close(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(true); return; }
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      const items = [...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
      const i = items.indexOf(document.activeElement as HTMLElement);
      const next = items[(i + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length];
      if (next) { e.preventDefault(); next.focus(); }
    };
    document.addEventListener("pointerdown", down, true);
    document.addEventListener("keydown", key, true);
    return () => { document.removeEventListener("pointerdown", down, true); document.removeEventListener("keydown", key, true); };
  }, [open, close]);
  return (
    <span className="dm1-pluswrap">
      <button
        ref={btnRef} type="button" className={`dm1-ic dm1-plus${open ? " is-open" : ""}`} data-dm1="plus"
        aria-label="Add" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}
      >
        <span className="dm1-plusdisc" aria-hidden="true"><Plus /></span>
      </button>
      {open && (
        <div ref={menuRef} className="dm1-menu" role="menu" aria-label="Add" data-dm1="menu">
          {MENU.map(({ key, label, Icon }, i) => (
            <button
              key={key} type="button" role="menuitem" className={`dm1-mi${i === 0 ? " is-first" : ""}`} data-dm1="menuitem" data-k={key}
              onClick={() => { close(true); actions[key](); }}
            >
              <span className="dm1-midisc" aria-hidden="true"><Icon /></span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}
    </span>
  );
};

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

/* ── the bar ────────────────────────────────────────────────────────────────────────────────── */

export const PhoneTopBar: React.FC<{
  onNavigate: (tab: string, subPageName?: string) => void;
  onPickedManuscript: () => void;
  onSearch: () => void;
  actions: PhoneActions;
  scrolled: boolean;
}> = ({ onNavigate, onPickedManuscript, onSearch, actions, scrolled }) => (
  <header className={`dm1-top${scrolled ? " is-scrolled" : ""}`} data-dm1="top">
    <img className="dm1-mark" src={QUERYHAWK_MARK} alt="" aria-hidden="true" draggable={false} />
    {/* the shell's own phone switcher; a pick re-opens the route so the page reads the new book */}
    <div
      className="dm1-ms" data-dm1="ms"
      onClickCapture={(e) => { if ((e.target as HTMLElement).closest(".sv2-msrow")) window.setTimeout(onPickedManuscript, 0); }}
    >
      <ShellScope onNavigate={onNavigate} />
    </div>
    <div className="dm1-tools">
      <button type="button" className="dm1-ic" aria-label="Search" data-dm1="search-btn" onClick={onSearch}><Search aria-hidden="true" /></button>
      <button type="button" className="dm1-ic" aria-label="Feedback" data-dm1="feedback-btn" onClick={() => openFeedback()}><MessageSquareText aria-hidden="true" /></button>
      <PlusMenu actions={actions} />
    </div>
  </header>
);
