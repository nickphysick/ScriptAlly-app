/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v24 Part D (design-refs/contact-list-v24/, screens 08–12) — FULL SCREEN IS THE ADDRESS BOOK. The full-
 * screen hook (`usePinList("agents")`, F, Esc) is unchanged; what it draws is this, over the page sheet:
 *
 *   the band      the Query Centre's full-screen band as a Contact list variant (QcBand140 is untouched): the archivist
 *                 breaking out top left, "{N} agents on file", the four sets as weighted bars (each a filter; the count
 *                 shows all), List health as a ring (opens Housekeeping), "+ Add an agent"
 *   the cream row Find (or the selection's bar while anything is ticked), Filters, Sorted by, "Exit full screen"
 *   the list      a light A–Z list (letter headings sticky), rows 62 tall, the pale selected row, the A–Z strip
 *   the card      the agent card laid out wide (AgentCardWide24), sliding in when the agent changes
 *
 * ⚠️ THE BOOK SITS OVER THE PAGE SHEET, NOT THE WINDOW: its edges are the sheet's (`--ink-sheet-l/-r/-b`, published by
 *    the shell) and its top the shell bar's bottom, so the sidebar and the bar stay as they are.
 * ⚠️ THE SELECTION FOLLOWS FILTERS while the agent is still visible; otherwise the first Your move agent, else the first.
 */
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { StatusDot } from "../../StatusDot";
import { QueryStatus } from "../../../types";
import { agentPrimary } from "../../../lib/agentDisplay";
import { type AgentFacts, type ContactFilters, type SortKey, genreList, hasMissingDetails } from "../../../lib/contactList";
import { THUMB_LETTERS, bookSections, thumbShown } from "../../../lib/contactBook";
import { CL_SORT_FIELDS } from "../../../lib/cardsSort";
import { SortChipButton, SortChipMenu } from "../../shell/SortChip";
import { usePopover } from "../../shell/ListPills";
import { FilterMenu } from "./ContactFilters24";
import { CONTACT_ART } from "./ContactHeader24";
import { StateDisc, YourMoveMark } from "./ContactSheet24";
import { SET_LABEL, SET_ORDER, rowDue, type SetCounts, type SetKey } from "../../../lib/contactV24";
import "./contactV24.css";

const SEG_COLOUR: Record<SetKey, string> = { you: "#c9765d", agent: "#9fb1cc", none: "#9fb1cc", closed: "#8d97a8" };
const I = {
  find: <svg viewBox="0 0 16 16" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><circle cx="7" cy="7" r="4.6" /><path d="m10.4 10.4 3.3 3.3" /></svg>,
  filt: <svg className="cl24-ic" viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M3 5.5h14M5.5 10h9M8 14.5h4" /></svg>,
  ex: <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7.5 3v4.5H3M17 7.5h-4.5V3M12.5 17v-4.5H17M3 12.5h4.5V17" /></svg>,
  tick: <svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true"><path d="M2.5 6.2l2.2 2.2 4.8-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>,
};

export interface AddressBook24Props {
  pool: readonly AgentFacts[];
  all: readonly AgentFacts[];
  counts: SetCounts;
  set: SetKey | null;
  /** v25 B2 — At a glance's Querying (two sets) is applied: no segment is lit, and "All" is not either */
  multi?: boolean;
  onSet: (k: SetKey | null) => void;
  health: { pct: number; gaps: number } | null;
  onFill: () => void;
  onAdd: () => void;
  search: string;
  onSearch: (v: string) => void;
  filters: ContactFilters;
  onFilters: (f: ContactFilters) => void;
  onClearAll: () => void;
  sortKey: SortKey;
  reversed: boolean;
  onSort: (v: { key: SortKey; reversed: boolean }) => void;
  genreWord: (raw: string) => string;
  onExit: () => void;
  onExport: (rows: readonly AgentFacts[]) => void;
  nowMs: number;
  selectRequest: { id: string; seq: number } | null;
  /** the wide card for the selected agent, its position in the list and the step */
  renderCard: (x: AgentFacts, index: number, total: number, onStep: (d: -1 | 1) => void, onSelect: (id: string) => void) => React.ReactNode;
}

export const ContactAddressBook24: React.FC<AddressBook24Props> = (p) => {
  const { pool, all, nowMs } = p;
  const ids = useMemo(() => pool.map((x) => x.agent.id), [pool]);
  const byId = useMemo(() => new Map(all.map((x) => [x.agent.id, x])), [all]);
  const sections = useMemo(() => bookSections(pool, p.sortKey), [pool, p.sortKey]);
  const order = useMemo(() => sections.flatMap((s) => s.ids), [sections]);

  /* the selection: the wanted agent while visible, else the first Your move, else the first */
  const [want, setWant] = useState<string | null>(null);
  const sel = want && order.includes(want) ? want : (pool.find((x) => x.stand === "you")?.agent.id ?? order[0] ?? null);
  const reqSeq = useRef(0);
  useEffect(() => {
    const r = p.selectRequest;
    if (!r || r.seq === reqSeq.current) return;
    reqSeq.current = r.seq;
    if (byId.has(r.id)) { if (!order.includes(r.id)) { p.onSet(null); p.onClearAll(); } setWant(r.id); requestAnimationFrame(() => intoView(r.id)); }
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const namesRef = useRef<HTMLDivElement>(null);
  const intoView = (id: string) => {
    const n = namesRef.current;
    const el = n?.querySelector<HTMLElement>(`[data-cl24="book-row"][data-id="${CSS.escape(id)}"]`);
    if (!n || !el) return;
    const head = 34;
    if (el.offsetTop - head < n.scrollTop) n.scrollTop = el.offsetTop - head - 4;
    else if (el.offsetTop + el.offsetHeight > n.scrollTop + n.clientHeight) n.scrollTop = el.offsetTop + el.offsetHeight - n.clientHeight + 4;
  };
  const pick = (id: string) => { setWant(id); requestAnimationFrame(() => intoView(id)); };
  const step = (d: -1 | 1) => { const i = sel ? order.indexOf(sel) : -1; const n = order[i + d]; if (n) pick(n); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    step(e.key === "ArrowDown" ? 1 : -1);
  };
  const jump = (letter: string) => {
    const n = namesRef.current;
    const el = n?.querySelector<HTMLElement>(`[data-cl24="book-head"][data-label="${letter}"]`);
    if (n && el) n.scrollTo({ top: el.offsetTop, behavior: "auto" });
  };
  const have = new Set(sections.map((s) => s.label));

  /* ticks and Export (NB1's) */
  const [ticked, setTicked] = useState<ReadonlySet<string>>(() => new Set());
  const tick = (id: string) => setTicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  useEffect(() => { setTicked((s) => { const keep = [...s].filter((id) => byId.has(id)); return keep.length === s.size ? s : new Set(keep); }); }, [byId]);
  const tickedFacts = all.filter((x) => ticked.has(x.agent.id));

  /* the top: the shell bar's bottom, measured (the panel's own way) */
  const [top, setTop] = useState<number | null>(null);
  useLayoutEffect(() => {
    const read = () => {
      const bar = [...document.querySelectorAll<HTMLElement>(".ws-pagebar")].find((b) => b.getBoundingClientRect().height > 0);
      const b = bar?.getBoundingClientRect().bottom ?? 0;
      if (b > 0) setTop(Math.round(b * 10) / 10);
    };
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);
  /* the page underneath does not scroll, and the folder tab turns navy */
  useEffect(() => {
    document.documentElement.setAttribute("data-cl24-full", "");
    return () => document.documentElement.removeAttribute("data-cl24-full");
  }, []);

  /* the band tightens when its sets would collide (MEASURED, as QcBand140 does): the left inset and the drawing shrink, the
     count's words shorten and the ring's words go */
  const bandRef = useRef<HTMLDivElement>(null);
  const [tight, setTight] = useState(false);
  useLayoutEffect(() => {
    const band = bandRef.current;
    if (!band) return undefined;
    const measure = () => {
      if (band.clientWidth === 0) return;
      band.classList.remove("tight");
      const bad = band.scrollWidth > band.clientWidth + 0.5;
      if (bad) band.classList.add("tight");
      setTight((t) => (t === bad ? t : bad));
    };
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(band);
    return () => ro.disconnect();
  }, [p.counts, p.health, top]);
  const pop = usePopover<"filters" | "sort">();
  const rowRef = useRef<HTMLDivElement>(null);
  const filterN = p.filters.genres.length + (p.filters.open === "open" ? 1 : 0);
  const allGenres = useMemo(() => genreList(all, (k, raw) => p.genreWord(raw) || k).sort((a, b) => a.label.localeCompare(b.label)), [all, p]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = all.length;
  const selFacts = sel ? byId.get(sel) ?? null : null;
  const selIndex = sel ? order.indexOf(sel) : -1;
  const ringC = 2 * Math.PI * 16;

  return (
    <div className={`cl24-ab${tight ? " tight" : ""}`} data-cl24="book" data-nb1="book" data-full="" data-tight={tight ? "" : undefined} style={top != null ? ({ "--cl24-top": `${top}px` } as React.CSSProperties) : undefined}>
      <div className="cl24-fsh" data-cl24="book-top">
        <img className="cl24-fart" data-cl24="book-art" src={CONTACT_ART} alt="" aria-hidden="true" draggable={false} />
        <div className={`cl24-fband${tight ? " tight" : ""}`} data-cl24="band" ref={bandRef}>
          <button type="button" className="cl24-fhero" data-cl24="band-count" aria-pressed={p.set === null && !p.multi} onClick={() => p.onSet(null)}>
            <b>{total}</b><span className="cl24-fw">{total === 1 ? "agent on file" : "agents on file"}</span><span className="cl24-fs2">{total === 1 ? "agent" : "agents"}</span>
          </button>
          <span className="cl24-fdiv" aria-hidden="true" />
          <div className="cl24-fsegs" role="group" aria-label="Where they stand">
            {SET_ORDER.map((k) => (
              <button key={k} type="button" className={`cl24-fseg cl24-fseg--${k}`} data-cl24="band-seg" data-k={k} data-n={p.counts[k]} aria-pressed={p.set === k}
                style={{ "--w": Math.max(p.counts[k], 3), "--c": SEG_COLOUR[k] } as React.CSSProperties} onClick={() => p.onSet(p.set === k ? null : k)}>
                {/* v25.5 D — Your move's key is the rust "!" disc (14px here), not a swatch */}
                <i aria-hidden="true" /><span>{k === "you" ? <YourMoveMark size={14} /> : null}<b>{p.counts[k]}</b>{SET_LABEL[k]}</span>
              </button>
            ))}
          </div>
          <span className="cl24-fdiv" aria-hidden="true" />
          {p.health ? (
            <button type="button" className="cl24-fring" data-cl24="band-health" title="Fill in the gaps" onClick={p.onFill}
              aria-label={`List health ${p.health.pct}%. ${p.health.gaps} details missing. Open Housekeeping`}>
              <svg viewBox="0 0 40 40" aria-hidden="true">
                <circle cx="20" cy="20" r="16" fill="none" stroke="#c9765d" strokeWidth="5" />
                <circle cx="20" cy="20" r="16" fill="none" stroke="#f4eee5" strokeWidth="5" strokeDasharray={`${Math.max(0, (ringC * p.health.pct) / 100 - 2)} ${ringC}`} transform="rotate(-90 20 20)" />
              </svg>
              <span className="cl24-frt"><b>{p.health.pct}%<em>list health</em></b><small>{p.health.gaps} {p.health.gaps === 1 ? "detail" : "details"} missing</small></span>
            </button>
          ) : null}
          <button type="button" className="cl24-fadd" data-cl24="band-add" onClick={p.onAdd}>+ Add an agent</button>
        </div>
        <div className="cl24-ftool" data-cl24="book-tools" ref={rowRef}>
          {ticked.size > 0 ? (
            <div className="cl24-fsel" data-nb1="selection" role="toolbar" aria-label="Selected agents">
              <b data-nb1="selected-n">{ticked.size} selected</b>
              <button type="button" data-nb1="bulk-all" onClick={() => setTicked(new Set(ids))} disabled={ids.every((id) => ticked.has(id))}>Select all {ids.length}</button>
              <button type="button" data-nb1="bulk-export" onClick={() => p.onExport(tickedFacts)}>Export {ticked.size}</button>
              <button type="button" data-nb1="bulk-clear" onClick={() => setTicked(new Set())}>Clear</button>
            </div>
          ) : (
            <label className="cl24-ffind" data-cl24="book-find" data-nb1="find">
              {I.find}
              <input value={p.search} onChange={(e) => { p.onSearch(e.target.value); if (namesRef.current) namesRef.current.scrollTop = 0; }}
                placeholder="Find an agent or agency" aria-label="Find an agent or agency" autoComplete="off" />
            </label>
          )}
          <span className="cl24-sp" />
          <button type="button" className="cl24-fch" data-cl24="book-filters" data-nb1="filters" aria-haspopup="dialog" aria-expanded={pop.open === "filters"}
            aria-label={filterN ? `Filters: ${filterN} applied` : "Filters"} onClick={(e) => pop.toggle("filters", e.currentTarget)}>
            {I.filt}<span className="cl24-cl">Filters</span>{filterN ? <em className="cl24-n">{filterN}</em> : null}
          </button>
          <SortChipButton fields={CL_SORT_FIELDS} value={{ key: p.sortKey, reversed: p.reversed }} open={pop.open === "sort"} className="cl24-fch cl24-sort" ns="cl24"
            onToggle={(a) => pop.toggle("sort", a)} toolbar={() => rowRef.current} />
          <button type="button" className="cl24-fex" data-cl24="exit" data-nb1="full" data-pin-list="" aria-pressed="true" aria-keyshortcuts="F" onClick={p.onExit}>
            {I.ex}<span>Exit full screen</span>
          </button>
        </div>
      </div>
      <div className="cl24-fsb" data-cl24="book-body">
        <div className="cl24-fsl" data-cl24="book-list">
          <div className="cl24-scr" ref={namesRef} tabIndex={0} aria-label="Agents" data-cl24="book-names" data-nb1="names" onKeyDown={onKey}>
            {pool.length === 0 ? (
              <div className="cl24-none" data-cl24="book-none" role="status">
                No agents match{p.search.trim() ? ` “${p.search.trim()}”` : ""}.
                <button type="button" onClick={() => { p.onSet(null); p.onClearAll(); }}>Clear search and filters</button>
              </div>
            ) : sections.map((s) => (
              <div key={s.key} className="cl24-lsec" data-cl24="book-section" data-label={s.label}>
                <div className="cl24-lh" data-cl24="book-head" data-label={s.label}><span>{s.label}</span>{p.sortKey === "surname" ? null : <small>{s.n}</small>}</div>
                {s.ids.map((id) => {
                  const x = byId.get(id)!;
                  const due = rowDue(x, nowMs);
                  const on = id === sel;
                  const t = ticked.has(id);
                  const agency = (x.agent.name ?? "").trim() ? (x.agent.agency ?? "").trim() : "";
                  return (
                    <div key={id} role="button" tabIndex={-1} className="cl24-br" data-cl24="book-row" data-nb1="name-row" data-id={id} data-k={x.stand}
                      aria-current={on ? "true" : undefined} data-ticked={t ? "" : undefined} onClick={() => pick(id)}>
                      <span className="cl24-bav">
                        <StateDisc x={x} size={36} />
                        <button type="button" role="checkbox" aria-checked={t} className="cl24-tk" data-nb1="tick"
                          aria-label={`Select ${agentPrimary(x.agent)}`} onClick={(e) => { e.stopPropagation(); tick(id); }}>{t ? I.tick : null}</button>
                      </span>
                      <span className="cl24-whot"><b>{agentPrimary(x.agent)}</b>{agency ? <small>{agency}</small> : null}</span>
                      {x.stand !== "none" && x.q ? (
                        <span className={`cl24-rt${due ? " due" : ""}`} data-cl24="book-rt">
                          <StatusDot status={x.q.status as QueryStatus} overrideSize={13} />{due ? <span data-cl24="book-due">{due}</span> : null}
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          {thumbShown(p.sortKey) && pool.length > 0 ? (
            <nav className="cl24-alpha" data-cl24="alpha" aria-label="Jump to letter">
              {THUMB_LETTERS.map((l) => <button key={l} type="button" data-j={l} disabled={!have.has(l)} onClick={() => jump(l)}>{l}</button>)}
            </nav>
          ) : null}
        </div>
        <div className="cl24-fsd" data-cl24="book-detail">
          {selFacts ? <div key={selFacts.agent.id} className="cl24-slide" data-cl24="slide">{p.renderCard(selFacts, selIndex, order.length, step, pick)}</div> : null}
        </div>
      </div>
      {pop.open === "filters" && pop.anchor ? (
        <FilterMenu anchor={pop.anchor} filters={p.filters} onFilters={p.onFilters} genres={allGenres} openN={all.filter((x) => x.openKey === "open").length}
          missingN={all.filter(hasMissingDetails).length}
          showing={pool.length} total={all.length} onExport={() => p.onExport(pool)} />
      ) : null}
      {pop.open === "sort" && pop.anchor ? (
        <SortChipMenu anchor={pop.anchor} fields={CL_SORT_FIELDS} value={{ key: p.sortKey, reversed: p.reversed }} ns="cl24" heading="Sort by" note={null}
          onChange={(v) => p.onSort(v as { key: SortKey; reversed: boolean })} />
      ) : null}
    </div>
  );
};
