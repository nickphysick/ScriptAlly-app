/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v24 Part B (design-refs/contact-list-v24/, screens 01–03, 06) — THE LIST SHEET: one white sheet under the
 * view row, opening on the Query Centre v149's navy bar.
 *
 *   the bar      List / Cards on the left (a segmented control on the navy); Filters · Grouped by · Sorted by · Full
 *                screen on the right (icon-only, prefixes dropped, at a window of 1440 or less, as on the Query Centre)
 *   List         a contacts table grouped by where each agent stands (Your move, Querying, Not queried, Closed), the
 *                column headings sticky under the bar and each group heading under them
 *   Cards        the AgentPaperCard `framed` grid of Contact list v20, three across from a sheet of 1,100px, else two
 *
 * ⚠️ ONE LIST, TWO DRAWINGS: both views draw exactly the agents handed in (`pool`, already filtered and sorted), under
 *    the same groups, so a card's order is its row's order.
 * ⚠️ THE ROW OR CARD OPENS THE AGENT CARD (`onOpen`); its own links and "+ Add" buttons answer their own clicks.
 * ⚠️ THE SHEET CLIPS (`overflow: clip`), NEVER HIDES: `hidden` would make it a scroll container and every sticky
 *    would pin to it instead of the page.
 */
import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { StatusDot } from "../../StatusDot";
import { QueryStatus } from "../../../types";
import { agentInitials, agentPrimary } from "../../../lib/agentDisplay";
import { type AgentFacts, type ContactFilters, type SortKey, addedLabel, genreList } from "../../../lib/contactList";
import { STAGE_NAME } from "../../../lib/qcSummary";
import { CL_SORT_FIELDS } from "../../../lib/cardsSort";
import { SortChipButton, SortChipMenu } from "../../shell/SortChip";
import { usePopover } from "../../shell/ListPills";
import { FULL_ICON } from "../../shell/ViewTitleRow";
import { GROUP_ICON150 } from "../../queries/centre/QcToolbar140";
import { FilterMenu } from "./ContactFilters24";
import { AgentPaperCard, type PaperAddKey } from "../../shared/AgentPaperCard";
import { paperDataOf } from "../../../lib/contactCards";
import type { PersonalGenre } from "../../../lib/genres";
import type { AgentCardField, AgentCardTab } from "../../../lib/agentCardStore";
import { agentsWord, cardsAcross, rowSecond, setGroups, SET_LABEL, type SetKey } from "../../../lib/contactV24";
import { hrefFor } from "../../../lib/quickAdd";
import type { ContactView } from "../../../lib/contactListMemory";
import "./contactV24.css";
import { GenrePills, NIB, QueryPill, Tally, Track } from "../../shared/agentRowParts";
import { fillGapsWords } from "../../../lib/contactHousekeeping";
import "./contactV252.css";
import "./contactV253.css";
import { daysSinceSent } from "../../../lib/queryTrack";

export const SET_GLYPH: Record<SetKey, QueryStatus | null> = {
  you: QueryStatus.PARTIAL_REQUESTED, agent: QueryStatus.QUERIED, none: null, closed: QueryStatus.REJECTED,
};
/** the dotted ring for "Not queried" (a set, not a status: no StatusDot names it) */
export const NQ_RING = (
  <svg className="cl24-nq" viewBox="0 0 14 14" width="15" height="15" aria-hidden="true"><circle cx="7" cy="7" r="5.6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="1.6 2" /></svg>
);
export const SetGlyph: React.FC<{ k: SetKey; size?: number }> = ({ k, size = 17 }) => {
  const s = SET_GLYPH[k];
  return s ? <StatusDot status={s} overrideSize={size} /> : NQ_RING;
};
/** the state disc: dashed navy ring (not queried) · navy (querying) · navy with a rust "!" (your move, v25.2 B) · grey (closed) */
export const StateDisc: React.FC<{ x: AgentFacts; size?: number; className?: string }> = ({ x, size, className }) => (
  <span className={`cl24-dsc cl24-dsc--${x.stand}${className ? ` ${className}` : ""}`} data-cl24="disc" data-k={x.stand} aria-hidden="true"
    style={size ? ({ "--d": `${size}px` } as React.CSSProperties) : undefined}>{agentInitials(x.agent).slice(0, 2)}</span>
);

const I = {
  filt: <svg className="cl24-ic" viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M3 5.5h14M5.5 10h9M8 14.5h4" /></svg>,
  cv: <svg className="cl24-cv" viewBox="0 0 12 12" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M3 4.5l3 3 3-3" /></svg>,
  mail: <svg viewBox="0 0 16 16" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true"><rect x="2" y="3.5" width="12" height="9" rx="1.4" /><path d="m2.5 4.3 5.5 4.4 5.5-4.4" /></svg>,
  web: <svg viewBox="0 0 16 16" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true"><circle cx="8" cy="8" r="6" /><path d="M2 8h12M8 2c2 2 2 10 0 12M8 2c-2 2-2 10 0 12" /></svg>,
  plus: <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M8 3v10M3 8h10" /></svg>,
};
const copy = (text: string) => { void navigator.clipboard?.writeText(text).catch(() => {}); };

export interface ContactSheet24Props {
  pool: readonly AgentFacts[];
  all: readonly AgentFacts[];
  view: ContactView;
  grouped: boolean;
  onGrouped: (g: boolean) => void;
  sortKey: SortKey;
  reversed: boolean;
  onSort: (v: { key: SortKey; reversed: boolean }) => void;
  filters: ContactFilters;
  onFilters: (f: ContactFilters) => void;
  onClearAll: () => void;
  full: boolean;
  onFull: () => void;
  genreWord: (raw: string) => string;
  genreHit: (raw: string) => boolean;
  personalGenres: PersonalGenre[];
  nowMs: number;
  openId: string | null;
  onOpen: (id: string) => void;
  onLog: (id: string) => void;
  onEdit: (id: string, tab: AgentCardTab, focus?: AgentCardField) => void;
  onExport: (rows: readonly AgentFacts[]) => void;
  /** Contact list v25.3 — the row's one gap action: Housekeeping's count for the agent (null: no gaps), and its door */
  gapOf?: (agentId: string) => { n: number } | null;
  onFillGaps?: (agentId: string) => void;
  search: string;
  /** v25 A3 — Find is the navy bar's own search well, first in the bar */
  onSearch: (v: string) => void;
}

/* v25.1 E1/E3/E4 — five columns, every heading a sort: Agent · Genres · Replies in · Your query · Your rating. The
   Submissions column is gone (a closed-and-not-queried agent says so in Your query), Added gave way to Your rating
   (still on the agent card), and at ≤1440 of window the last column drops. */
const COLS: { key: SortKey; label: string }[] = [
  { key: "surname", label: "Agent" }, { key: "fit", label: "What they want" }, { key: "reply", label: "Replies in" },
  { key: "urgency", label: "Your query" }, { key: "rating", label: "Your rating" },
];

export const ContactSheet24: React.FC<ContactSheet24Props> = (p) => {
  const pop = usePopover<"filters" | "group" | "sort">();
  const sheetRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const byId = useMemo(() => new Map(p.all.map((x) => [x.agent.id, x])), [p.all]);
  const groups = useMemo(() => (p.grouped ? setGroups(p.pool) : [{ key: null as SetKey | null, label: "", ids: p.pool.map((x) => x.agent.id) }]), [p.grouped, p.pool]);

  /* v25.1 C3 — the bar folds at 1440 of WINDOW, the Query Centre's rule (contactV24.css's media query); v25's
     sheet-measured `data-s1440` is retired */

  /* Cards: three across from a sheet of 1,100px, measured before paint and on every resize */
  const [across, setAcross] = useState(3);
  useLayoutEffect(() => {
    const el = sheetRef.current;
    if (!el) return undefined;
    const read = () => { if (el.offsetWidth > 0) setAcross(cardsAcross(el.offsetWidth)); };
    read();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const filterN = p.filters.genres.length + (p.filters.open === "open" ? 1 : 0);
  const allGenres = useMemo(
    () => genreList(p.all, (k, raw) => p.genreWord(raw) || k).sort((a, b) => a.label.localeCompare(b.label)),
    [p.all, p], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const openN = p.all.filter((x) => x.openKey === "open").length;
  const sortBy = (k: SortKey) => p.onSort({ key: k, reversed: p.sortKey === k ? !p.reversed : false });

  return (
    <div className="cl24-sheet" data-cl24="sheet" data-view={p.view} ref={sheetRef}>
      <div className="cl24-bar" data-cl24="bar" ref={barRef}>
        <label className="qc150-bfind" data-cl24="find" data-cl25="find" data-nb1="find">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></svg>
          <input value={p.search} onChange={(e) => p.onSearch(e.target.value)} placeholder="Find an agent or agency" aria-label="Find an agent or agency" autoComplete="off" />
        </label>
        {/* v25 C — the List | Cards switch moved out of the bar, to the list's title row (ContactListTitle25) */}
        <button type="button" className="cl24-ch cl24-ch--fil" data-cl24="filters" data-nb1="filters" aria-haspopup="dialog" aria-expanded={pop.open === "filters"}
          aria-label={filterN ? `Filters: ${filterN} applied` : "Filters"} onClick={(e) => pop.toggle("filters", e.currentTarget)}>
          {I.filt}<span className="cl24-cl">Filters</span>{filterN ? <em className="cl24-n" data-cl24="filters-n">{filterN}</em> : null}
        </button>
        <button type="button" className="cl24-ch" data-cl24="group" aria-haspopup="menu" aria-expanded={pop.open === "group"}
          aria-label={p.grouped ? "Grouped by Status. Change the grouping" : "Not grouped. Group the list"} data-cl25="group" onClick={(e) => pop.toggle("group", e.currentTarget)}>
          {GROUP_ICON150}<b>{p.grouped ? "Status" : "Group"}</b>{I.cv}
        </button>
        <SortChipButton fields={CL_SORT_FIELDS} value={{ key: p.sortKey, reversed: p.reversed }} open={pop.open === "sort"} className="cl24-ch cl24-sort" ns="cl24"
          onToggle={(a) => pop.toggle("sort", a)} toolbar={() => barRef.current} />
        <button type="button" className="cl24-fs" data-cl24="full" data-nb1="full" data-pin-list="" aria-pressed={p.full} aria-keyshortcuts="F" aria-label="Full screen" onClick={p.onFull}>
          {FULL_ICON}<span className="cl24-fslb">Full screen</span>
        </button>
      </div>

      {p.pool.length === 0 ? (
        <div className="cl24-none" data-cl24="none" role="status">
          No agents match{p.search.trim() ? ` “${p.search.trim()}”` : ""}.
          <button type="button" data-cl24="reset" onClick={p.onClearAll}>Clear search and filters</button>
        </div>
      ) : p.view === "list" ? (
        <div className="cl24-tbl" data-cl24="table" role="table" aria-label="Agents">
          <div className="cl24-th" role="row" data-cl24="heads">
            {COLS.map((c, i) => (
              <span key={c.label} role="columnheader" data-col={i + 1} data-key={c.key}
                aria-sort={c.key === p.sortKey ? (p.reversed ? "descending" : "ascending") : "none"}>
                {/* v25.1 E4 — every heading sorts: a first click in its first direction, a second reverses it */}
                <button type="button" className={c.key === p.sortKey ? "on" : undefined} data-cl251="head" data-key={c.key} onClick={() => sortBy(c.key)}>
                  <span>{c.label}</span><i aria-hidden="true">{c.key === p.sortKey && p.reversed ? "↑" : "↓"}</i>
                </button>
              </span>
            ))}
          </div>
          {groups.map((g) => (
            <div key={g.key ?? "all"} className="cl24-grp" role="rowgroup" data-cl24="group" data-k={g.key ?? "all"}>
              {g.key ? (
                <div className="cl24-gh" data-cl24="group-head" data-k={g.key}>
                  <SetGlyph k={g.key} /><b>{SET_LABEL[g.key]}</b><small>{agentsWord(g.ids.length)}</small>
                </div>
              ) : null}
              {g.ids.map((id) => { const x = byId.get(id); return x ? <Row key={id} x={x} p={p} /> : null; })}
            </div>
          ))}
        </div>
      ) : (
        <div className="cl24-cg" data-cl24="cards" style={{ "--cols": across } as React.CSSProperties} data-cols={across}>
          {groups.map((g) => (
            <section key={g.key ?? "all"} className="cl24-cgs" data-cl24="card-group" data-k={g.key ?? "all"}>
              {g.key ? (
                <div className="cl24-rh" data-cl24="card-head" data-k={g.key}>
                  <SetGlyph k={g.key} size={18} /><b>{SET_LABEL[g.key]}</b><small>{agentsWord(g.ids.length)}</small><hr />
                </div>
              ) : null}
              <div className="cl24-grid">
                {g.ids.map((id) => { const x = byId.get(id); return x ? <Card key={id} x={x} p={p} /> : null; })}
              </div>
            </section>
          ))}
        </div>
      )}

      {pop.open === "filters" && pop.anchor ? (
        <FilterMenu anchor={pop.anchor} filters={p.filters} onFilters={p.onFilters} genres={allGenres} openN={openN}
          showing={p.pool.length} total={p.all.length} onExport={() => p.onExport(p.pool)} />
      ) : null}
      {pop.open === "sort" && pop.anchor ? (
        <SortChipMenu anchor={pop.anchor} fields={CL_SORT_FIELDS} value={{ key: p.sortKey, reversed: p.reversed }} ns="cl24" heading="Sort by" note={null}
          onChange={(v) => p.onSort(v as { key: SortKey; reversed: boolean })} />
      ) : null}
      {pop.open === "group" && pop.anchor ? (
        <GroupMenu anchor={pop.anchor} grouped={p.grouped} onGrouped={(g) => { p.onGrouped(g); pop.close(); }} />
      ) : null}
    </div>
  );
};

/* ── the Group by menu: Status, or none ─────────────────────────────────────────────────────────────────────── */
const GroupMenu: React.FC<{ anchor: HTMLElement; grouped: boolean; onGrouped: (g: boolean) => void }> = ({ anchor, grouped, onGrouped }) => {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  useLayoutEffect(() => {
    const r = anchor.getBoundingClientRect();
    setPos({ top: r.bottom + 8, left: Math.max(12, Math.min(r.right - 300, window.innerWidth - 312)) });
  }, [anchor]);
  const opt = (on: boolean, label: string, line: string, v: boolean) => (
    <button type="button" role="menuitemradio" aria-checked={on} className="cl24-gopt" data-cl24="group-opt" data-v={v ? "status" : "none"} onClick={() => onGrouped(v)}>
      <i aria-hidden="true">{on ? "●" : ""}</i><span><b>{label}</b><small>{line}</small></span>
    </button>
  );
  return (
    <div className="lpop cl24-gpop" data-lpop="group" data-cl24="group-menu" role="menu" aria-label="Group by" style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}>
      <h6>Group by</h6>
      {opt(grouped, "Status", "Your move, querying, not queried, closed", true)}
      {opt(!grouped, "No grouping", "One list, in the order you sort by", false)}
    </div>
  );
};

/* ── a List row ─────────────────────────────────────────────────────────────────────────────────────────────── */
/* v25.2 A — the QueryHawk row: the typewriter name over agency · city in mono; the genre pills; replies in; the status
   pill with its day count over the track and the next step; the tally bars; and, as a second grid row spanning every
   column from the name's left edge, the wishlist behind the nib.
   v25.3 — A ROW DOES NOT ADVERTISE WHAT IS MISSING: an empty cell is blank (no dash, no "No … yet", no "+ Add"), a row
   with no wishlist has no wishlist line, and an unrated agent's rating cell is empty. The row's gaps are ONE action on
   hover — "Fill in {n} gaps →", Housekeeping's count — first in the hover group, opening the card's edit mode at the
   first missing field. The pills fit their cell: whole pills only, then "+n". */
const Row: React.FC<{ x: AgentFacts; p: ContactSheet24Props }> = ({ x, p }) => {
  const a = x.agent;
  const name = agentPrimary(a);
  const agency = (a.name ?? "").trim() ? (a.agency ?? "").trim() : "";
  const sub = [agency, x.loc].filter(Boolean).join(" · ");
  const genres = a.genres ?? [];
  const weeks = typeof a.responseTimeWeeks === "number" && a.responseTimeWeeks > 0 ? a.responseTimeWeeks : null;
  const rule = a.noResponseMeansNo === true ? "no reply means no" : a.noResponseMeansNo === false ? "always replies" : null;
  const wish = (a.mswlNotes ?? "").trim();
  const rated = typeof a.starRating === "number" && a.starRating > 0;
  const email = (a.email ?? "").trim();
  const site = (a.website ?? "").trim();
  const q = x.q;
  const queried = !!q && x.stand !== "none";
  const second = queried ? rowSecond(x, p.nowMs) : null;
  const closed = queried && q!.court === "closed";
  const day = queried && !closed ? daysSinceSent(q!.sentMs, p.nowMs) : null;
  const gap = p.gapOf?.(a.id) ?? null;
  const on = p.openId === a.id;
  const open = () => p.onOpen(a.id);
  return (
    <div role="row" tabIndex={0} className={`cl24-tr cl252-tr${wish ? "" : " cl253-nowl"}`} data-cl24="row" data-nb1="name-row" data-id={a.id} data-k={x.stand} aria-current={on ? "true" : undefined}
      aria-label={`${name}${agency ? `, ${agency}` : ""}`}
      onClick={(e) => { if ((e.target as HTMLElement).closest("button, a")) return; open(); }}
      onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); open(); } }}>
      <span role="cell" className="cl24-who">
        <StateDisc x={x} />
        <span className="cl24-whot cl252-whot"><b data-cl252="name">{name}</b>{sub ? <small data-cl252="agency">{sub}</small> : null}</span>
      </span>
      <span role="cell" className="cl24-gen cl252-gen" data-cl24="genres" data-total={genres.length}>
        <GenrePills genres={genres} hit={p.genreHit} word={p.genreWord} max={Infinity} empty={null} fit />
      </span>
      <span role="cell" className="cl24-c2 cl252-rep" data-col="3" data-cl252="replies">
        {weeks ? <><b>~{weeks} {weeks === 1 ? "wk" : "wks"}</b>{rule ? <small>{rule}</small> : null}</> : null}
      </span>
      <span role="cell" className="cl24-qs cl252-qs" data-cl24="query">
        {!queried ? (
          x.door === "closed" ? <span className="cl24-shut cl251-shut" data-cl251="closed-tag">Closed to queries</span>
            : <span className="cl252-nq"><em>Not queried</em><button type="button" className="cl252-hlog" data-cl24="log" onClick={() => p.onLog(a.id)}>{I.plus}Log a query</button></span>
        ) : (
          <>
            <span className="cl252-ql1">
              <QueryPill status={q!.status} />
              {day != null ? <span className="cl252-day" data-cl252="day" data-n={day}>DAY {day}</span> : null}
            </span>
            <span className="cl252-ql2">
              <Track status={q!.status} dates={q!.query} />
              {second?.due ? <span className="cl252-next" data-cl252="next">{second.text}</span>
                : <span className="cl252-sent" data-cl252="sent">{closed ? "Closed" : second?.text ?? ""}</span>}
            </span>
          </>
        )}
      </span>
      <span role="cell" className="cl24-ad cl252-rate" data-col="5" data-cl251="rating" data-n={rated ? a.starRating : 0}>
        {rated ? <Tally n={a.starRating} /> : null}
      </span>
      {wish ? (
        <span className="cl252-wl" data-cl252="wishlist" role="cell">
          {NIB}
          <span className="cl252-wq" data-cl252="wish-text"><i aria-hidden="true">“</i>{wish}<i aria-hidden="true">”</i></span>
        </span>
      ) : null}
      <span className="cl24-qa" data-cl24="quick">
        {gap && p.onFillGaps ? (
          <button type="button" className="cl253-fill" data-cl253="fill" data-n={gap.n} onClick={() => p.onFillGaps!(a.id)}>{fillGapsWords(gap.n)} →</button>
        ) : null}
        {email ? <button type="button" className="cl253-ic" title="Copy email" aria-label={`Copy ${name}’s email`} data-cl24="copy-email" onClick={() => copy(email)}>{I.mail}</button> : null}
        {site ? <a href={hrefFor(site) ?? undefined} className="cl253-ic" target="_blank" rel="noreferrer noopener" title="Open website" aria-label={`Open ${name}’s website`} data-cl24="open-site">{I.web}</a> : null}
      </span>
    </div>
  );
};

/* ── a card ─────────────────────────────────────────────────────────────────────────────────────────────────── */
const ADD_TARGET: Record<PaperAddKey, { tab: AgentCardTab; focus: AgentCardField }> = {
  website: { tab: "who", focus: "website" }, email: { tab: "who", focus: "email" },
  genres: { tab: "want", focus: "genres" }, wishlist: { tab: "want", focus: "wishlist" }, materials: { tab: "want", focus: "materials" },
};
const Card: React.FC<{ x: AgentFacts; p: ContactSheet24Props }> = ({ x, p }) => {
  const data = paperDataOf(x, p.genreHit, p.personalGenres);
  const open = () => p.onOpen(x.agent.id);
  return (
    <div role="button" tabIndex={0} className="cl24-card" data-cl24="card" data-id={x.agent.id} data-k={x.stand} aria-current={p.openId === x.agent.id || undefined}
      aria-label={`${data.name}${data.agency ? `, ${data.agency}` : ""}. ${data.statusLabel}`}
      onClick={(e) => { if ((e.target as HTMLElement).closest("a, button")) return; open(); }}
      onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); open(); } }}>
      {/* v20 §F — a card whose next step is the writer's wears the app's pink band */}
      <AgentPaperCard variant="framed" data={data} tone={x.stand === "you" ? "pink" : undefined} yourMove={x.stand === "you"}
        onAdd={(k) => { const t = ADD_TARGET[k]; p.onEdit(x.agent.id, t.tab, t.focus); }} />
    </div>
  );
};

/** the loading beat: the sheet's own bar and a few row shapes, inert */
export const SheetSkeleton: React.FC = () => (
  <div className="cl24-sheet cl24-sk" data-cl24="skeleton" aria-hidden="true">
    <div className="cl24-bar" />
    {[0, 1, 2, 3, 4].map((i) => <div key={i} className="cl24-skr"><i /><i /><i /></div>)}
  </div>
);
