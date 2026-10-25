/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v23 — THE ADDRESS BOOK (ref design-refs/navy-bar-address-book-v1/contact-list-v23.html, looks "th-a
 * th-x": the whole list on navy, a navy strip across the card panel). It replaces the Cards and List views, their title
 * row, the navy toolbar, the filter strip and the list body: ONE box of two columns —
 *
 *   left (navy):   the count · Find, Filters, Sort · the status pills · the agents, in sections that follow the sort,
 *                  with the A–Z thumb index while sorted by surname
 *   right (oat):   a navy strip (‹ › and "N OF M", Full screen) over the agent's card, the landing card's frame
 *
 * ⚠️ DOCKED, NEVER STICKY. The box is the scroll container's height less 40. The page scrolls until the box is 20px
 *    from the top; after that a wheel over the box scrolls the list inside it. Nothing is `position: sticky` against
 *    the page, so the header and the panel cannot move separately.
 * ⚠️ BUILT AS ORDINARY COMPONENTS, NOT THE MOCK'S SHADOW ROOT: the mock's CSS (`window.__BK2CSS`) is the oracle for
 *    values only.
 * ⚠️ EVERY PAGE STAYS MOUNTED: every probe is `data-nb1`, which no other page uses.
 */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { StatusDot } from "../../StatusDot";
import { QueryStatus } from "../../../types";
import { agentInitials, agentPrimary } from "../../../lib/agentDisplay";
import { type AgentFacts, type ContactFilters, type SortKey, addedLabel, emptyContactFilters, genreList } from "../../../lib/contactList";
import {
  BOOK_PILLS, type BookPill, COURT_WORD, STATE_LABEL, THUMB_LETTERS, bookCount, bookSections, bookState, bookSteps, dueTag,
  inPill, lastInTouch, selectionIn, stepDate, stepFrom, thumbShown,
} from "../../../lib/contactBook";
import { firstNameOf, methodAnswer, panelDoor, panelFoot } from "../../../lib/agentPanel";
import { mswlLinkOf } from "../../../lib/agentCard";
import { hrefFor } from "../../../lib/quickAdd";
import { rowDateLine } from "../../../lib/contactList";
import { STAGE_NAME } from "../../../lib/qcSummary";
import { CL_SORT_FIELDS } from "../../../lib/cardsSort";
import { SortChipMenu } from "../../shell/SortChip";
import { usePopover } from "../../shell/ListPills";
import { FULL_ICON } from "../../shell/ViewTitleRow";
import type { AgentCardField, AgentCardTab } from "../../../lib/agentCardStore";
import "../../shell/findWell.css";
import "./contactBook.css";

export type BookJourney = "log" | "resp" | "sent" | "nudge" | "close" | "offer" | "edit";

export interface ContactBookProps {
  /** what Find, the filters and the header's group leave, sorted (the pills narrow it further) */
  pool: readonly AgentFacts[];
  /** every agent, for the count and the filters' tallies */
  all: readonly AgentFacts[];
  /** a filter, Find or the header's group narrows the list */
  narrowed: boolean;
  search: string;
  onSearch: (v: string) => void;
  searchRef?: React.Ref<HTMLInputElement>;
  filters: ContactFilters;
  onFilters: (f: ContactFilters) => void;
  onClearAll: () => void;
  sortKey: SortKey;
  reversed: boolean;
  onSort: (v: { key: SortKey; reversed: boolean }) => void;
  genreWord: (raw: string) => string;
  genreHit: (raw: string) => boolean;
  /** the manuscript in scope */
  bookTitle: string | null;
  nowMs: number;
  full: boolean;
  onFull: () => void;
  /** a door elsewhere on the page asked for this agent (a deep link, Housekeeping): select it and dock */
  selectRequest: { id: string; seq: number } | null;
  onEdit: (id: string, tab?: AgentCardTab, focus?: AgentCardField) => void;
  /** ⋯ — the agent card's quick view, whose menu keeps what the retired panel's ⋯ held (Delete agent, Open in Query
   *  Centre, Copy email) and the agent's notes thread */
  onMore: (id: string) => void;
  onJourney: (id: string, mode: BookJourney, queryId: string | null) => void;
  onOpenQuery: (queryId: string) => void;
  gapsOf: (id: string) => string | null;
  onFillIn: (id: string) => void;
  onNotes: (id: string, text: string) => Promise<boolean>;
  onExport: (rows: readonly AgentFacts[]) => void;
  /** the route is on screen (every workspace page stays mounted) */
  active: boolean;
}

export const SEL_KEY = "sa.contactBook.sel";
const readSel = (): string | null => { try { return sessionStorage.getItem(SEL_KEY); } catch { return null; } };
const writeSel = (id: string | null) => { try { if (id) sessionStorage.setItem(SEL_KEY, id); else sessionStorage.removeItem(SEL_KEY); } catch { /* private */ } };

const I = {
  find: <svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true"><circle cx="8.6" cy="8.6" r="5.6" /><path d="M12.8 12.8l4 4" /></svg>,
  filt: <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M3 5h14M6 10h8M8.5 15h3" /></svg>,
  sort: <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 4v12M3 13l3 3 3-3M14 16V4M11 7l3-3 3 3" /></svg>,
  ex: <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7.5 3v4.5H3M17 7.5h-4.5V3M12.5 17v-4.5H17M3 12.5h4.5V17" /></svg>,
  l: <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4l-6 6 6 6" /></svg>,
  r: <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 4l6 6-6 6" /></svg>,
  mail: <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M3.5 7.5l8.5 6 8.5-6" /></svg>,
  web: <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>,
  at: <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M16 12v1.5a2.5 2.5 0 0 0 5 0V12a9 9 0 1 0-3.5 7.1" /></svg>,
  form: <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h3" /></svg>,
  ring: <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7" fill="#fff" stroke="#1c130f" strokeWidth="1.6" /><path d="M6.8 10.2l2.2 2.1 4.2-4.4" fill="none" stroke="#1c130f" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  tick: <svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true"><path d="M2.5 6.2l2.2 2.2 4.8-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>,
};

/** the agent's first social on record (X, Bluesky, Instagram, any other), else their MSWL page */
export function socialOf(a: AgentFacts["agent"]): string {
  const direct = [a.twitter, a.bluesky, a.instagram].map((s) => (s ?? "").trim()).find(Boolean);
  if (direct) return direct;
  const other = (a.socials ?? []).find((s) => !/mswl/i.test(s.platform) && s.handle.trim());
  if (other) return other.handle.trim();
  return mswlLinkOf(a) ?? "";
}
const copy = (text: string) => { void navigator.clipboard?.writeText(text).catch(() => {}); };

/* ═════════════════════════════════════════════════════════════════════════════════════════════════════════════ */

export const ContactBook: React.FC<ContactBookProps> = (p) => {
  const { pool, all, sortKey, reversed, nowMs, full } = p;
  const [pill, setPill] = useState<BookPill>("");
  const visible = useMemo(() => pool.filter((x) => inPill(x, pill)), [pool, pill]);
  const ids = useMemo(() => visible.map((x) => x.agent.id), [visible]);
  const byId = useMemo(() => new Map(all.map((x) => [x.agent.id, x])), [all]);
  const narrowed = p.narrowed || !!pill;
  const sections = useMemo(() => bookSections(visible, sortKey), [visible, sortKey]);

  /* ── the selection: the remembered agent if in view, else the first in view ── */
  const [want, setWant] = useState<string | null>(() => readSel());
  const sel = selectionIn(ids, want);
  useEffect(() => { if (sel) writeSel(sel); }, [sel]);
  const selFacts = sel ? byId.get(sel) ?? null : null;

  /* ── the ticks (B6) ── */
  const [ticked, setTicked] = useState<ReadonlySet<string>>(() => new Set());
  const tick = (id: string) => setTicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  useEffect(() => { setTicked((s) => { const keep = [...s].filter((id) => byId.has(id)); return keep.length === s.size ? s : new Set(keep); }); }, [byId]);

  const pop = usePopover<"filters" | "sort">();
  const rootRef = useRef<HTMLDivElement>(null);
  const namesRef = useRef<HTMLDivElement>(null);

  /* ── B1 · docking: the box is the scroller's height less 40; a wheel over the box first brings it to 20 from the top ── */
  const [boxH, setBoxH] = useState<number | null>(null);
  useLayoutEffect(() => {
    const root = rootRef.current;
    const sc = root?.closest<HTMLElement>(".wpg-scroll");
    if (!root || !sc) return undefined;
    const read = () => {
      if (sc.clientHeight > 0) setBoxH(sc.clientHeight - 40);
    };
    read();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(read);
    ro.observe(sc);
    return () => ro.disconnect();
  }, [p.active]);
  const dock = useCallback((behavior: ScrollBehavior = "auto") => {
    const root = rootRef.current;
    const sc = root?.closest<HTMLElement>(".wpg-scroll");
    if (!root || !sc) return;
    const gap = root.getBoundingClientRect().top - sc.getBoundingClientRect().top - 20;
    if (Math.abs(gap) > 1) sc.scrollTo({ top: sc.scrollTop + gap, behavior });
  }, []);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const on = (e: WheelEvent) => {
      if (full || e.deltaY <= 0) return;
      const sc = root.closest<HTMLElement>(".wpg-scroll");
      if (!sc) return;
      const gap = root.getBoundingClientRect().top - sc.getBoundingClientRect().top - 20;
      if (gap > 1) { e.preventDefault(); sc.scrollTop += Math.min(e.deltaY, gap); }
    };
    root.addEventListener("wheel", on, { passive: false });
    return () => root.removeEventListener("wheel", on);
  }, [full]);

  /* a door elsewhere asked for an agent: show it (clearing a pill that hides it) and dock */
  const reqSeq = useRef(0);
  useEffect(() => {
    const r = p.selectRequest;
    if (!r || r.seq === reqSeq.current) return;
    reqSeq.current = r.seq;
    const x = byId.get(r.id);
    if (!x) return;
    if (!inPill(x, pill)) setPill("");
    setWant(r.id);
    requestAnimationFrame(() => { dock("smooth"); scrollRowIntoView(r.id); });
  }); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── the list ── */
  const scrollRowIntoView = (id: string) => {
    const n = namesRef.current;
    const el = n?.querySelector<HTMLElement>(`[data-nb1="name-row"][data-id="${CSS.escape(id)}"]`);
    if (!n || !el) return;
    const head = 34;
    if (el.offsetTop - head < n.scrollTop) n.scrollTop = el.offsetTop - head - 4;
    else if (el.offsetTop + el.offsetHeight > n.scrollTop + n.clientHeight) n.scrollTop = el.offsetTop + el.offsetHeight - n.clientHeight + 4;
  };
  const pick = (id: string) => { setWant(id); requestAnimationFrame(() => scrollRowIntoView(id)); };
  const toTop = () => { if (namesRef.current) namesRef.current.scrollTop = 0; };
  const onNamesKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const next = stepFrom(ids, sel, e.key === "ArrowDown" ? 1 : -1);
    if (next) pick(next);
  };
  const jump = (letter: string) => {
    const n = namesRef.current;
    const el = n?.querySelector<HTMLElement>(`[data-nb1="section"][data-label="${letter}"]`);
    if (n && el) n.scrollTo({ top: el.offsetTop, behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  const have = new Set(sections.map((s) => s.label));

  /* ── the header ── */
  const filterN = p.filters.genres.length + (p.filters.open === "open" ? 1 : 0);
  const sortLabel = sortKey === "surname" ? (reversed ? "Z–A" : "A–Z") : CL_SORT_FIELDS.find((f) => f.key === sortKey)?.label ?? "";
  const [findW, setFindW] = useState(400);
  const findRef = useRef<HTMLLabelElement>(null);
  useLayoutEffect(() => {
    const el = findRef.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(() => { if (el.offsetWidth > 0) setFindW(el.offsetWidth); });
    ro.observe(el);
    return () => ro.disconnect();
  });
  const allGenres = useMemo(
    () => genreList(all, (k, raw) => p.genreWord(raw) || k).sort((a, b) => a.label.localeCompare(b.label)),
    [all, p], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const openN = all.filter((x) => x.openKey === "open").length;

  /* full screen: the page underneath must not scroll */
  useEffect(() => {
    if (!full || !p.active) return undefined;
    document.documentElement.setAttribute("data-nb1-full", "");
    return () => document.documentElement.removeAttribute("data-nb1-full");
  }, [full, p.active]);

  const style = { ...(boxH != null ? { ["--nb1-h" as string]: `${Math.max(420, boxH)}px` } : {}) } as React.CSSProperties;
  const tickedFacts = all.filter((x) => ticked.has(x.agent.id));

  return (
    <div className="nb1-book" data-nb1="book" data-full={full ? "" : undefined} ref={rootRef} style={style}>
      {/* ── left: the navy column ── */}
      <section className="nb1-lc" data-nb1="list-col" aria-label="Agents">
        <div className="nb1-top" data-nb1="header">
          <h2 className="nb1-count" data-nb1="count" aria-live="polite" aria-atomic="true">{bookCount(visible.length, all.length, narrowed)}</h2>
          {ticked.size > 0 ? (
            <div className="nb1-sel" data-nb1="selection" role="toolbar" aria-label="Selected agents">
              <b data-nb1="selected-n">{ticked.size} selected</b>
              <button type="button" data-nb1="bulk-all" onClick={() => setTicked(new Set(ids))} disabled={ids.every((id) => ticked.has(id))}>Select all {ids.length}</button>
              <button type="button" data-nb1="bulk-export" onClick={() => p.onExport(tickedFacts)}>Export {ticked.size}</button>
              <button type="button" className="nb1-selx" data-nb1="bulk-clear" onClick={() => setTicked(new Set())}>Clear</button>
            </div>
          ) : (
            <div className="nb1-sr" data-nb1="search-row">
              <label className="nb1-find fw-well" data-nb1="find" ref={findRef}>
                {I.find}
                <input ref={p.searchRef} value={p.search} onChange={(e) => { p.onSearch(e.target.value); toTop(); }}
                  placeholder={findW < 270 ? "Find an agent" : "Find an agent or agency"} aria-label="Find an agent or agency" autoComplete="off" />
              </label>
              <button type="button" className="nb1-ib" data-nb1="filters" data-lp="nb1-filters" aria-haspopup="dialog" aria-expanded={pop.open === "filters"}
                aria-label={filterN ? `Filters: ${filterN} applied` : "Filters"} title="Filters" onClick={(e) => pop.toggle("filters", e.currentTarget)}>
                {I.filt}{filterN ? <em data-nb1="filters-n">{filterN}</em> : null}
              </button>
              <button type="button" className="nb1-ib nb1-sortb" data-nb1="sort" data-lp="nb1-sort" aria-haspopup="menu" aria-expanded={pop.open === "sort"}
                aria-label={`Sorted by ${sortLabel}. Change the order`} onClick={(e) => pop.toggle("sort", e.currentTarget)}>
                {I.sort}<span>{sortLabel}</span>
              </button>
            </div>
          )}
          <div className="nb1-seg" role="group" aria-label="Where they stand" data-nb1="pills">
            {BOOK_PILLS.map((b) => (
              <button key={b.key || "all"} type="button" data-nb1="pill" data-k={b.key || "all"} aria-pressed={pill === b.key}
                onClick={() => { setPill(b.key); toTop(); }}>
                {b.key ? <i className={`nb1-sw nb1-k-${b.key}`} aria-hidden="true" /> : null}{b.label}
              </button>
            ))}
          </div>
        </div>
        <div className="nb1-body">
          <div className="nb1-names" ref={namesRef} tabIndex={0} aria-label="Agents" data-nb1="names" onKeyDown={onNamesKey}>
            {visible.length === 0 ? (
              <div className="nb1-none" data-nb1="none" role="status">
                No agents match{p.search.trim() ? ` “${p.search.trim()}”` : ""}.
                <button type="button" data-nb1="reset" onClick={() => { setPill(""); p.onClearAll(); }}>Clear search and filters</button>
              </div>
            ) : sections.map((s) => (
              <div key={s.key} className="nb1-sec" data-nb1="section" data-label={s.label}>
                <div className="nb1-lt" data-nb1="section-head">
                  <span>{s.label}</span>
                  {sortKey === "surname" ? null : <small data-nb1="section-n">{s.n}</small>}
                </div>
                {s.ids.map((id) => {
                  const x = byId.get(id)!;
                  const k = bookState(x);
                  const due = dueTag(x, nowMs);
                  const on = id === sel;
                  const t = ticked.has(id);
                  const agency = x.agent.name.trim() ? (x.agent.agency ?? "").trim() : "";
                  return (
                    <div key={id} role="button" tabIndex={-1} className="nb1-nm" data-nb1="name-row" data-id={id} data-k={k}
                      aria-current={on ? "true" : undefined} data-ticked={t ? "" : undefined} onClick={() => pick(id)}>
                      <span className={`nb1-av nb1-k-${k}`} data-nb1="avatar" data-k={k} title={STATE_LABEL[k]}>
                        <span className="nb1-ini">{agentInitials(x.agent).slice(0, 2)}</span>
                        <button type="button" role="checkbox" aria-checked={t} className="nb1-tk" data-nb1="tick"
                          aria-label={`Select ${agentPrimary(x.agent)}`} onClick={(e) => { e.stopPropagation(); tick(id); }}>{t ? I.tick : null}</button>
                      </span>
                      <span className="nb1-tx">
                        <b>{agentPrimary(x.agent)}</b>
                        {agency ? <small>{agency}</small> : null}
                      </span>
                      {due ? <span className="nb1-due" data-nb1="due">{due.text}</span> : null}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          {thumbShown(sortKey) && visible.length > 0 ? (
            <nav className="nb1-thumb" data-nb1="thumb" aria-label="Jump to letter">
              {THUMB_LETTERS.map((l) => (
                <button key={l} type="button" data-j={l} disabled={!have.has(l)} onClick={() => jump(l)}>{l}</button>
              ))}
            </nav>
          ) : null}
        </div>
      </section>

      {/* ── right: the strip and the card ── */}
      <section className="nb1-rp" data-nb1="card-col" aria-label="The agent">
        <div className="nb1-rtop" data-nb1="strip">
          {(() => {
            const i = sel ? ids.indexOf(sel) : -1;
            const prev = stepFrom(ids, sel, -1), next = stepFrom(ids, sel, 1);
            return (
              <>
                <button type="button" className="nb1-nav" data-nb1="prev" aria-label="Previous agent" disabled={!prev} onClick={() => prev && pick(prev)}>{I.l}</button>
                <span className="nb1-pos" data-nb1="pos">{i < 0 ? "" : `${i + 1} OF ${ids.length}`}</span>
                <button type="button" className="nb1-nav" data-nb1="next" aria-label="Next agent" disabled={!next} onClick={() => next && pick(next)}>{I.r}</button>
              </>
            );
          })()}
          <span className="nb1-sp" />
          <button type="button" className="nb1-fs" data-nb1="full" data-pin-list="" aria-pressed={full} aria-keyshortcuts="F" onClick={p.onFull}>
            {full ? I.ex : FULL_ICON}<span>{full ? "Exit full screen" : "Full screen"}</span>
          </button>
        </div>
        <div className="nb1-cw" data-nb1="card-wrap">
          {selFacts ? <BookCard key={selFacts.agent.id} x={selFacts} {...p} /> : null}
        </div>
      </section>

      {pop.open === "filters" && pop.anchor ? (
        <FilterMenu anchor={pop.anchor} filters={p.filters} onFilters={p.onFilters} genres={allGenres} openN={openN}
          showing={visible.length} total={all.length} onExport={() => p.onExport(visible)} />
      ) : null}
      {pop.open === "sort" && pop.anchor ? (
        <SortChipMenu anchor={pop.anchor} fields={CL_SORT_FIELDS} value={{ key: sortKey, reversed }} ns="nb1" heading="Sort by" note={null}
          onChange={(v) => { p.onSort(v as { key: SortKey; reversed: boolean }); toTop(); }} />
      ) : null}
    </div>
  );
};

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

/* ── the card ────────────────────────────────────────────────────────────────────────────────────────────────── */

const BookCard: React.FC<{ x: AgentFacts } & ContactBookProps> = ({ x, nowMs, bookTitle, genreWord, genreHit, onEdit, onMore, onJourney, onOpenQuery, gapsOf, onFillIn, onNotes }) => {
  const a = x.agent;
  const k = bookState(x);
  const q = x.q;
  const first = firstNameOf(a);
  const name = agentPrimary(a);
  const agency = a.name.trim() ? (a.agency ?? "").trim() : "";
  const where = [agency, x.loc].filter(Boolean).join(" · ");
  const added = addedLabel(a);
  const door = panelDoor(a, nowMs);
  const foot = panelFoot(a, x, q, nowMs);
  const weeks = typeof a.responseTimeWeeks === "number" && a.responseTimeWeeks > 0 ? a.responseTimeWeeks : null;
  const genres = a.genres ?? [];
  const hits = genres.filter(genreHit).map(genreWord);
  const gaps = gapsOf(a.id);

  /* the notes: the agent's `notes` field, saved on blur */
  const [draft, setDraft] = useState(a.notes ?? "");
  const saved = useRef(a.notes ?? "");
  useEffect(() => { if ((a.notes ?? "") !== saved.current) { saved.current = a.notes ?? ""; setDraft(a.notes ?? ""); } }, [a.notes]);
  const commitNotes = async () => {
    if (draft === saved.current) return;
    const was = saved.current;
    saved.current = draft;
    const ok = await onNotes(a.id, draft);
    if (!ok) saved.current = was;
  };

  const email = (a.email ?? "").trim();
  const site = (a.website ?? "").trim();
  const social = socialOf(a);
  const method = methodAnswer(a.submissionMethod);

  const line = q ? rowDateLine(q, nowMs) : null;
  const soon = !!q && (q.court === "you" || q.court === "offer") && q.expectedMs != null && q.expectedMs - nowMs < 7 * 86_400_000;
  const late = !!line && (line.over || soon);
  const run = () => {
    const act = foot.primary.act;
    if (act.kind === "journey") onJourney(a.id, act.mode as BookJourney, q?.id ?? null);
    else onEdit(a.id);
  };

  const status = k === "none" ? "Not queried" : q ? STAGE_NAME[q.status as keyof typeof STAGE_NAME] ?? String(q.status) : STATE_LABEL[k];
  const dot = k === "none" || !q ? <i className="nb1-ring" aria-hidden="true" /> : <StatusDot status={q.status as QueryStatus} overrideSize={15} />;

  return (
    <article className={`nb1-card nb1-k-${k}`} data-nb1="card" data-id={a.id} data-k={k}>
      <div className="nb1-in">
        <div className="nb1-band" data-nb1="band"><span>{COURT_WORD[k]}</span><span>{added ? `Added ${added}` : ""}{a.importedNeedsReview ? " · Imported" : ""}</span></div>
        <div className="nb1-hd">
          <span className="nb1-disc" aria-hidden="true">{agentInitials(a).slice(0, 2)}</span>
          <div className="nb1-who">
            <h3 className="nb1-nmL" data-nb1="card-name">{name}</h3>
            {where ? <div className="nb1-agL">{where}</div> : null}
          </div>
          <span className="nb1-pill" data-nb1="status">{dot}{status}</span>
        </div>
        <div className="nb1-cols">
          <div className="nb1-cA">
            <div className="nb1-blk" data-nb1="wishlist">
              <span className="nb1-lab">Wishlist</span>
              <div className={`nb1-wl${(a.mswlNotes ?? "").trim() ? "" : " empty"}`}>{(a.mswlNotes ?? "").trim() || "No wishlist yet"}</div>
              {genres.length ? (
                <div className="nb1-chips">
                  {genres.map((g) => <span key={g} className={genreHit(g) ? "hit" : undefined}>{genreWord(g)}</span>)}
                </div>
              ) : null}
            </div>
            <div className="nb1-facts">
              <div><span className="nb1-lab">Replies in</span><b>{weeks ? `About ${weeks} ${weeks === 1 ? "week" : "weeks"}` : "Not stated"}</b></div>
              <div><span className="nb1-lab">Submissions</span><b>{door.label}</b></div>
            </div>
            <div className="nb1-ctcw">
              <span className="nb1-lab">Contact</span>
              <div className="nb1-ctc" data-nb1="contact">
                <ContactRow icon={I.mail} value={email} add="email" onAdd={() => onEdit(a.id, "who", "email")} btn="COPY" onBtn={() => copy(email)} />
                <ContactRow icon={I.web} value={site.replace(/^https?:\/\//, "").replace(/\/$/, "")} add="website" onAdd={() => onEdit(a.id, "who", "website")}
                  btn="OPEN" href={site ? hrefFor(site) ?? undefined : undefined} />
                <ContactRow icon={I.at} value={social} add="social" onAdd={() => onEdit(a.id, "who", "mswl")} btn="COPY" onBtn={() => copy(social)} />
                <ContactRow icon={I.form} value={method ?? ""} add="how they take queries" onAdd={() => onEdit(a.id, "work", "method")} />
              </div>
            </div>
          </div>
          <div className="nb1-cB">
            <div className="nb1-qblk" data-nb1="query">
              {k === "none" || !q ? (
                <>
                  <span className="nb1-lab">{bookTitle ?? "Your book"}</span>
                  <p className="nb1-nq">You haven’t queried {first} yet.{hits.length ? ` ${first} represents ${hits.join(", ").toLowerCase()}, which fits your book.` : ""}</p>
                  <div className="nb1-qft">
                    <span className="nb1-w">{door.label}</span>
                    {door.kind !== "closed" ? <button type="button" className="nb1-lk" data-nb1="primary" onClick={() => onJourney(a.id, "log", null)}>Log a query</button> : null}
                  </div>
                </>
              ) : (
                <>
                  <span className="nb1-lab">Querying</span>
                  {bookTitle ? <div className="nb1-bk">{bookTitle}</div> : null}
                  <ol className="nb1-steps" data-nb1="steps">
                    <i className="nb1-rail" aria-hidden="true" />
                    {bookSteps(q).map((s, i) => (
                      <li key={`${s.status}-${i}`} className="nb1-st" data-current={s.current ? "" : undefined}>
                        <span className="nb1-sg">{s.current ? <StatusDot status={s.status} overrideSize={15} /> : I.ring}</span>
                        <span className={`nb1-t${s.current ? " cur" : ""}`}>{s.label}</span>
                        <span className="nb1-dd">{stepDate(s.dateMs)}</span>
                      </li>
                    ))}
                  </ol>
                  <div className="nb1-qft">
                    <span className={`nb1-w${late ? " late" : ""}`} data-nb1="due-line">{line?.text ?? ""}</span>
                    {k === "closed" ? (
                      <button type="button" className="nb1-lk" data-nb1="primary" onClick={() => onOpenQuery(q.id)}>See the query</button>
                    ) : foot.primary.act.kind === "journey" ? (
                      <button type="button" className="nb1-lk" data-nb1="primary" onClick={run}>{foot.primary.label}</button>
                    ) : null}
                  </div>
                </>
              )}
            </div>
            <div className="nb1-nts" data-nb1="notes">
              <span className="nb1-lab">Notes</span>
              <textarea value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={() => void commitNotes()}
                placeholder={`Anything worth remembering about ${first}`} aria-label={`Notes about ${name}`} />
            </div>
          </div>
        </div>
        <div className="nb1-cft">
          <span className="nb1-w" data-nb1="last">{lastInTouch(x, nowMs)}</span>
          <span className="nb1-acts">
            {gaps ? <button type="button" className="nb1-lk" data-nb1="fill" onClick={() => onFillIn(a.id)} title={gaps}>Fill in the gaps</button> : null}
            <button type="button" className="nb1-lk" data-nb1="edit" onClick={() => onEdit(a.id, "who")}>Edit agent</button>
            <button type="button" className="nb1-more" data-nb1="more" aria-label={`More for ${name}`} title="More" onClick={() => onMore(a.id)}>
              <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><circle cx="4.5" cy="10" r="1.6" fill="currentColor" /><circle cx="10" cy="10" r="1.6" fill="currentColor" /><circle cx="15.5" cy="10" r="1.6" fill="currentColor" /></svg>
            </button>
          </span>
        </div>
      </div>
    </article>
  );
};

const ContactRow: React.FC<{ icon: React.ReactNode; value: string; add: string; onAdd: () => void; btn?: "COPY" | "OPEN"; onBtn?: () => void; href?: string }> = ({
  icon, value, add, onAdd, btn, onBtn, href,
}) => (
  <div className="nb1-cr" data-nb1="contact-row" data-filled={value ? "" : undefined}>
    {icon}
    {value ? <span>{value}</span> : <button type="button" className="nb1-add" data-nb1="add" data-field={add} onClick={onAdd}>+ Add {add}</button>}
    {value && btn ? (
      href ? <a className="nb1-cp" href={href} target="_blank" rel="noreferrer noopener" data-nb1="contact-btn">{btn}</a>
        : <button type="button" className="nb1-cp" data-nb1="contact-btn" onClick={onBtn}>{btn}</button>
    ) : <i />}
  </div>
);

/* ── the loading beat: the box's own shape, its two columns and the strip, inert ───────────────────────────────── */
export const BookSkeleton: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [h, setH] = useState<number | null>(null);
  useLayoutEffect(() => {
    const sc = ref.current?.closest<HTMLElement>(".wpg-scroll");
    if (sc && sc.clientHeight > 0) setH(sc.clientHeight - 40);
  }, []);
  return (
    <div className="nb1-book nb1-sk" data-nb1="skeleton" aria-hidden="true" ref={ref} style={h != null ? ({ ["--nb1-h" as string]: `${Math.max(420, h)}px` } as React.CSSProperties) : undefined}>
      <section className="nb1-lc">
        <div className="nb1-top">
          <i className="nb1-skl" style={{ width: 130, height: 26 }} />
          <i className="nb1-skl" style={{ display: "block", marginTop: 14, height: 40, borderRadius: 999 }} />
          <i className="nb1-skl" style={{ display: "block", marginTop: 10, width: "80%", height: 22 }} />
        </div>
        <div className="nb1-body" />
      </section>
      <section className="nb1-rp">
        <div className="nb1-rtop" />
        <div className="nb1-cw"><div className="nb1-card"><div className="nb1-in" /></div></div>
      </section>
    </div>
  );
};
