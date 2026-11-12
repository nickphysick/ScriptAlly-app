/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v26 (design-refs/contact-list-v26/, screens 01–11) — THE LIST IS ONE BIG CARD: the landing page's framed
 * card (white, padding 10, radius 22; a 1px #a5837b frame inside at radius 13, clipped) opening on a navy band.
 *
 *   B  the band       "{shown} agents" · Find · Group · Sort — the List / Cards switch and Full screen retired (v27: the
 *                     Filters button too; the filter rail beside the list replaced it)
 *   C  the index      under the band: the sections the list draws, as jumps (A–Z, weeks, months or statuses)
 *   D  the rows       three columns (Agent · What they want · Your query) and a margin labelling each section
 *   E  the menus      Group (Letter · Status · No grouping), Sort (the four)
 *
 * ⚠️ THE PIN IS ONE STICKY BLOCK — the band, the index row, the applied row and the column headings — 12px below the
 *    scroller's top. It sits inside the frame, which clips (`overflow: clip`, never `hidden`: hidden would make the frame
 *    a scroll container and the pin would stick to it). While it is stuck a page-coloured mask behind it covers the 12px
 *    above and the card's white sides beside it, so rows never show around it; at rest the mask is off.
 * ⚠️ ONE READER, ON SCROLL (rAF, capture): whether the pin is stuck, and the section nearest the pinned headings.
 */
import { bandCount, noMatchCopy } from "../../../lib/contactPrinciples";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { StatusDot } from "../../StatusDot";
import { QueryStatus } from "../../../types";
import { agentInitials, agentPrimary } from "../../../lib/agentDisplay";
import { type AgentFacts, type ContactFilters, type SortKey, appliedFilters } from "../../../lib/contactList";
import { STAGE_NAME } from "../../../lib/qcSummary";
import { CL_SORT_FIELDS } from "../../../lib/cardsSort";
import { SortChipButton, SortChipMenu } from "../../shell/SortChip";
import { usePopover } from "../../shell/ListPills";
import { GROUP_ICON150 } from "../../queries/centre/QcToolbar140";
import { GroupMenu, NQ_RING, SetGlyph } from "./ContactSheet24";
import { GenrePills } from "../../shared/agentRowParts";
import { FIT_WORDS } from "../card/agentPills";
import type { Group26Key } from "../../../lib/contactListMemory";
import { GROUP26_OPTIONS, drawnSections, sections, type Section } from "../../../lib/contactV26";
import type { StatusKey } from "../../../lib/contactList";
import "./contactV26.css";
import "./contactPrinciples.css";

export const GROUP26_LABEL: Record<Group26Key, string> = { letter: "Letter", status: "Status", none: "No grouping" };

export interface ContactSheet26Props {
  /** the agents the list shows, already filtered and sorted */
  pool: readonly AgentFacts[];
  all: readonly AgentFacts[];
  group: Group26Key;
  onGroup: (g: Group26Key) => void;
  sortKey: SortKey;
  reversed: boolean;
  onSort: (v: { key: SortKey; reversed: boolean }) => void;
  filters: ContactFilters;
  onFilters: (f: ContactFilters) => void;
  onClearAll: () => void;
  search: string;
  onSearch: (v: string) => void;
  genreWord: (raw: string) => string;
  genreHit: (raw: string) => boolean;
  openId: string | null;
  onOpen: (id: string) => void;
  onExport: (rows: readonly AgentFacts[]) => void;
  /** the page guide's tick: an index entry was used */
  onJump?: () => void;
  /** E — how many rows the list would show under these filters (v27: read by the rail, no longer by the band) */
  wouldShow?: (f: ContactFilters) => number;
  /** E — Housekeeping's gap words for an agent ("reply time", "wishlist"…), in its order, or null */
  gapsOf: (id: string) => readonly string[] | null;
  /** E — "Fill in →": the card's editor at the agent's first missing field */
  onFill: (id: string) => void;
  /** E — a set the page narrowed to from a link (the dashboard's Agents on file), shown as its own applied chip */
  setChip?: { label: string; onDrop: () => void } | null;
  /** E — the applied row's "Clear filters" (the filters and any such set; Find is the band's own) */
  onClearFilters: () => void;
  /** principles v1 — the list's frame draws loading (skeleton rows) or can't-load in place of the rows; default "list" */
  state?: "list" | "loading" | "error";
  /** principles v1 — can't load's "Try again" */
  onRetry?: () => void;
  /** principles v1 — day one (three or fewer agents, none queried): the panel under the rows, its outline add */
  dayOne?: { onAdd: () => void } | null;
}

const I = {
  cv: <svg className="cl26-cv" viewBox="0 0 12 12" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M3 4.5l3 3 3-3" /></svg>,
  find: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></svg>,
};

/** the stage words in Your query: the app's own names; not queried and closed-to-queries are their own */
export function queryWords(x: AgentFacts): { kind: "nq" | "shut" | "stage"; words: string; status?: QueryStatus } {
  const q = x.q;
  if (!q || x.stand === "none") return x.door === "closed" ? { kind: "shut", words: "Closed to queries" } : { kind: "nq", words: "Not queried" };
  return { kind: "stage", words: STAGE_NAME[q.status as QueryStatus] ?? String(q.status), status: q.status as QueryStatus };
}

/** the pin's sticky top as laid out — `var(--pin-cover, 12px)` resolved (12 when it cannot be read) */
const pinTopOf = (pin: HTMLElement): number => { const v = parseFloat(getComputedStyle(pin).top); return Number.isFinite(v) ? v : 12; };

export const ContactSheet26: React.FC<ContactSheet26Props> = (p) => {
  const pop = usePopover<"filters" | "group" | "sort">();
  const cardRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const bandRef = useRef<HTMLDivElement>(null);
  const byId = useMemo(() => new Map(p.all.map((x) => [x.agent.id, x])), [p.all]);
  /* C/D — THE ONE PARTITION: the index names these and the list draws these, in this order */
  const secs = useMemo(() => sections(p.pool, p.group, p.sortKey, p.reversed), [p.pool, p.group, p.sortKey, p.reversed]);
  const drawn = useMemo(() => drawnSections(secs), [secs]);
  const secEls = useRef(new Map<string, HTMLElement>());
  const [current, setCurrent] = useState<string | null>(null);
  const jumping = useRef<{ key: string; until: number } | null>(null);

  /* the pin's height, published for the margin labels' sticky top */
  useLayoutEffect(() => {
    const pin = pinRef.current, card = cardRef.current;
    if (!pin || !card) return undefined;
    const put = () => card.style.setProperty("--cl26-pin-h", `${pin.offsetHeight}px`);
    put();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(put);
    ro.observe(pin);
    return () => ro.disconnect();
  }, []);

  /* ONE READER: is the pin stuck. Contact list header v2: the pin's sticky top is read off the pin itself
     (`var(--pin-cover, 12px)`: the lip's 12px, or below the slim pinned row while it shows), never a literal */
  const [stuck, setStuck] = useState(false);
  const read = useCallback(() => {
    const pin = pinRef.current, card = cardRef.current;
    const sc = card?.closest<HTMLElement>(".wpg-scroll");
    if (!pin || !card || !sc) return;
    const top = sc.getBoundingClientRect().top;
    const at = pinTopOf(pin);
    const s = pin.getBoundingClientRect().top <= top + at + 0.5 && card.getBoundingClientRect().top < top + at;
    setStuck((v) => (v === s ? v : s));
    /* the section nearest the pinned headings: the last one whose top has reached the headings' foot */
    const line = top + at + pin.offsetHeight + 2;
    let cur: string | null = null;
    for (const sec of drawnRef.current) {
      const el = secEls.current.get(sec.key);
      if (!el) continue;
      if (cur === null || el.getBoundingClientRect().top <= line) cur = sec.key; else break;
    }
    const j = jumping.current;
    if (j && performance.now() < j.until) cur = j.key; else jumping.current = null;
    setCurrent((v) => (v === cur ? v : cur));
  }, []);
  const drawnRef = useRef(drawn);
  drawnRef.current = drawn;
  useEffect(() => { read(); }, [drawn, read]);
  /* a click: the section's first row lands directly under the pinned headings */
  const jump = useCallback((key: string) => {
    const el = secEls.current.get(key), pin = pinRef.current;
    const sc = cardRef.current?.closest<HTMLElement>(".wpg-scroll");
    if (!el || !pin || !sc) return;
    /* where the pin will sit once there: under the slim pinned row, which shows as soon as the header is gone */
    const slim = cardRef.current?.closest<HTMLElement>(".clv-group")?.querySelector<HTMLElement>(":scope > .clh2-slim");
    const ahead = slim && !slim.hasAttribute("data-shown") ? slim.offsetHeight : 0;
    const delta = el.getBoundingClientRect().top - (sc.getBoundingClientRect().top + pinTopOf(pin) + ahead + pin.offsetHeight);
    const reduce = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    jumping.current = { key, until: performance.now() + (reduce ? 50 : 900) };
    setCurrent(key);
    sc.scrollTo({ top: sc.scrollTop + delta, behavior: reduce ? "auto" : "smooth" });
    p.onJump?.();
  }, [p]);
  useEffect(() => {
    const sc = cardRef.current?.closest<HTMLElement>(".wpg-scroll");
    if (!sc) return undefined;
    let raf = 0;
    const on = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; read(); }); };
    sc.addEventListener("scroll", on, { passive: true, capture: true });
    window.addEventListener("resize", on);
    read();
    return () => { sc.removeEventListener("scroll", on, { capture: true } as EventListenerOptions); window.removeEventListener("resize", on); if (raf) cancelAnimationFrame(raf); };
  }, [read]);

  /* E — one count per applied-filters chip (the pick "Ready to query" sets two filters, and shows two chips) */
  const applied = useMemo(() => appliedFilters(p.filters, (k) => p.genreWord(k) || k), [p.filters, p]); // eslint-disable-line react-hooks/exhaustive-deps
  const state = p.state ?? "list";
  /* principles v1 — what is applied, in the order the band and applied row draw it (Find, a set, the filters), each with
     the way to take just that one off: the no-matches state names them and offers to remove the last */
  const findText = p.search.trim();
  const named: { label: string; drop: () => void }[] = [
    ...(findText ? [{ label: findText, drop: () => p.onSearch("") }] : []),
    ...(p.setChip ? [{ label: p.setChip.label, drop: p.setChip.onDrop }] : []),
    /* the sentence names the genre itself, as the mock does ("Domestic noir"), not the chip's "Genre: …" */
    ...applied.map((a) => ({ label: a.label.replace(/^Genre:\s*/, ""), drop: () => p.onFilters(a.drop(p.filters)) })),
  ];
  const none = noMatchCopy(named.map((n) => n.label));
  const groupChanged = p.group !== "letter";
  const sortChanged = p.sortKey !== "surname" || p.reversed;
  const sortBy = (k: SortKey) => p.onSort({ key: k, reversed: p.sortKey === k ? !p.reversed : false });

  return (
    <section className="cl26-card" data-cl26="card" ref={cardRef} data-kind={drawn[0]?.kind ?? "all"}>
      <div className="cl26-frame" data-cl26="frame">
        <div className="cl26-pin" data-cl26="pin" ref={pinRef} data-stuck={stuck ? "" : undefined}>
          <div className="cl26-band" data-cl26="band" ref={bandRef}>
            <b className="cl26-count" data-cl26="count" data-n={p.pool.length}>{bandCount(p.pool.length, p.all.length, state)}</b>
            <label className="cl26-find" data-cl26="find" data-cl24="find" data-nb1="find">
              {I.find}
              <input value={p.search} onChange={(e) => p.onSearch(e.target.value)} placeholder="Find an agent or agency" aria-label="Find an agent or agency" autoComplete="off" />
            </label>
            <span className="cl26-sp" aria-hidden="true" />
            {/* v27 — the Filters button is retired: the filter rail beside the list (ContactRail27) is the one way in */}
            <button type="button" className="cl26-ch" data-cl26="group" data-on={groupChanged ? "" : undefined} aria-haspopup="menu" aria-expanded={pop.open === "group"}
              aria-label={`Grouped by ${GROUP26_LABEL[p.group]}. Change the grouping`} onClick={(e) => pop.toggle("group", e.currentTarget)}>
              {GROUP_ICON150}<span className="cl26-by">Grouped by</span><b>{GROUP26_LABEL[p.group]}</b>{I.cv}
            </button>
            <span className="cl26-sortw" data-on={sortChanged ? "" : undefined}>
              <SortChipButton fields={CL_SORT_FIELDS} value={{ key: p.sortKey, reversed: p.reversed }} open={pop.open === "sort"} className="cl26-ch cl26-sort" ns="cl26"
                onToggle={(a) => pop.toggle("sort", a)} />
            </span>
          </div>
          {p.group !== "none" && drawn.length > 0 ? <Index26 secs={secs} current={current ?? drawn[0]?.key ?? null} onJump={jump} /> : null}
          {applied.length > 0 || p.setChip ? (
            <div className="cl26-ap" data-cl26="applied" role="status">
              <span className="cl26-aps">Showing <b>{p.pool.length}</b> of {p.all.length}</span>
              {p.setChip ? (
                <button type="button" className="cl26-apc" data-cl26="applied-chip" data-k="set" onClick={p.setChip.onDrop} aria-label={`Remove ${p.setChip.label}`}>{p.setChip.label} ×</button>
              ) : null}
              {applied.map((a) => (
                <button key={a.key} type="button" className="cl26-apc" data-cl26="applied-chip" data-k={a.key} onClick={() => p.onFilters(a.drop(p.filters))} aria-label={`Remove ${a.label}`}>{a.label} ×</button>
              ))}
              <button type="button" className="cl26-apx" data-cl26="applied-clear" onClick={p.onClearFilters}>Clear filters</button>
            </div>
          ) : null}
          <div className="cl26-th" role="row" data-cl26="heads">
            <span className="cl26-thm" aria-hidden="true" />
            <span role="columnheader" aria-sort={p.sortKey === "surname" ? (p.reversed ? "descending" : "ascending") : "none"}>
              <button type="button" className={p.sortKey === "surname" ? "on" : undefined} data-cl26="head" data-key="surname" onClick={() => sortBy("surname")}>
                Agent<i aria-hidden="true">{p.sortKey === "surname" && p.reversed ? "↑" : "↓"}</i>
              </button>
            </span>
            <span role="columnheader" className="cl26-thx" data-cl26="head-want">What they want</span>
            <span role="columnheader" aria-sort={p.sortKey === "status" ? (p.reversed ? "descending" : "ascending") : "none"}>
              <button type="button" className={p.sortKey === "status" ? "on" : undefined} data-cl26="head" data-key="status" onClick={() => sortBy("status")}>
                Your query<i aria-hidden="true">{p.sortKey === "status" && p.reversed ? "↑" : "↓"}</i>
              </button>
            </span>
            <span aria-hidden="true" />
          </div>
        </div>

        {state === "loading" ? (
          /* principles v1 — skeleton rows (a disc, two lines, two cells), shimmering; no spinner */
          <div data-clp="state" data-k="loading" aria-busy="true" aria-label="Loading your agents">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="clp-sk" aria-hidden="true">
                <i className="c" /><span><i style={{ width: `${70 - i * 4}%` }} /><i className="s" /></span><span><i style={{ width: "55%" }} /></span><span><i style={{ width: "65%" }} /></span>
              </div>
            ))}
          </div>
        ) : state === "error" ? (
          <div className="clp-msg" data-clp="state" data-k="error" role="alert">
            <h3>Your agents didn’t load.</h3>
            <p>Nothing’s been lost. It’s usually the connection. Try again, and if it keeps happening, let us know through Give feedback.</p>
            <div className="clp-acts"><button type="button" className="clp-btn" data-clp="retry" onClick={p.onRetry}>Try again</button></div>
          </div>
        ) : p.pool.length === 0 ? (
          <div className="clp-msg" data-cl26="none" data-clp="state" data-k="none" role="status">
            <h3>{none.title}</h3>
            {none.line ? <p>{none.line}</p> : null}
            <div className="clp-acts">
              <button type="button" className="clp-btn" data-cl26="reset" onClick={p.onClearAll}>Clear the filters</button>
              {none.removeLast ? <button type="button" className="clp-btn l" data-clp="remove-last" onClick={named[named.length - 1].drop}>{none.removeLast}</button> : null}
            </div>
          </div>
        ) : (
          <div className="cl26-body" role="rowgroup" data-cl26="rows" data-cl24="table" data-kind={drawn[0]?.kind ?? "all"}>
            {drawn.map((sec) => (
              <div key={sec.key} className="cl26-sec" data-cl26="section" data-k={sec.key} data-kind={sec.kind} data-n={sec.ids.length}
                ref={(el) => { if (el) secEls.current.set(sec.key, el); else secEls.current.delete(sec.key); }}>
                {sec.kind === "set" ? (
                  <div className="cl26-gh" data-cl26="group-head" data-k={sec.set}>
                    <SectionGlyph s={sec} size={17} /><b>{sec.label}</b><small>{sec.ids.length}</small>
                  </div>
                ) : null}
                <span className="cl26-mg" data-cl26="margin" aria-hidden="true">
                  {sec.kind === "all" || sec.kind === "set" ? null : (
                    <span className="cl26-mgl" data-cl26="margin-label" data-big={sec.big ?? ""} data-small={sec.small ?? ""}>
                      {sec.kind === "stage" ? <SectionGlyph s={sec} size={24} /> : <b>{sec.big}</b>}
                      {sec.small ? <small>{sec.small}</small> : null}
                    </span>
                  )}
                </span>
                <div className="cl26-rows">
                  {sec.ids.map((id) => { const x = byId.get(id); return x ? <Row26 key={id} x={x} p={p} /> : null; })}
                </div>
              </div>
            ))}
          </div>
        )}
        {state === "list" && p.dayOne && p.pool.length > 0 ? (
          <div className="clp-next" data-clp="state" data-k="day1">
            <p><b>Add the agents you’re thinking about querying</b>, even if you’re not ready yet. With a few more on file, your list can show who fits your book and who’s open now.</p>
            <button type="button" className="clp-btn" data-clp="day1-add" onClick={p.dayOne.onAdd}>+ Add another agent</button>
          </div>
        ) : null}
      </div>

      {pop.open === "sort" && pop.anchor ? (
        <SortChipMenu anchor={pop.anchor} fields={CL_SORT_FIELDS} value={{ key: p.sortKey, reversed: p.reversed }} ns="cl26" heading="Sort by" note={null}
          onChange={(v) => p.onSort(v as { key: SortKey; reversed: boolean })} />
      ) : null}
      {pop.open === "group" && pop.anchor ? (
        <GroupMenu anchor={pop.anchor} options={GROUP26_OPTIONS} value={p.group} className="cl26-gpop" onPick={(g) => { p.onGroup(g); pop.close(); }} />
      ) : null}
    </section>
  );
};

/** a stage section's glyph: the StatusDot of the stage (a closed run is the passed mark), the dotted ring for not queried */
const STAGE_STATUS: Record<StatusKey, QueryStatus | null> = {
  none: null, queried: QueryStatus.QUERIED, pr: QueryStatus.PARTIAL_REQUESTED, ps: QueryStatus.PARTIAL_SENT, fr: QueryStatus.FULL_REQUESTED,
  fs: QueryStatus.FULL_SENT, rr: QueryStatus.REVISE_RESUBMIT, resub: QueryStatus.RESUBMITTED, offer: QueryStatus.OFFER, signed: QueryStatus.SIGNED,
  closed: QueryStatus.REJECTED,
};
/** Your move as a group: the mini navy disc with the rust "!" (the row disc's own, small) */
export const MiniYou: React.FC<{ size?: number }> = ({ size = 17 }) => (
  <span className="cl26-mini" data-cl26="mini-you" aria-hidden="true" style={{ "--d": `${size}px` } as React.CSSProperties}><i>!</i></span>
);
export const SectionGlyph: React.FC<{ s: Section; size?: number }> = ({ s, size = 16 }) => {
  if (s.set) return s.set === "you" ? <MiniYou size={size} /> : <SetGlyph k={s.set} size={size} />;
  if (s.stage) { const st = STAGE_STATUS[s.stage]; return st ? <StatusDot status={st} overrideSize={size} /> : NQ_RING; }
  return null;
};

/** the agent's disc, coloured by who the query is with: navy (with the agent), navy with the rust "!" (your move), a
 *  dotted ring (not queried), stone (closed) */
export const Disc26: React.FC<{ x: AgentFacts; size?: number }> = ({ x, size }) => (
  <span className={`cl26-dsc cl26-dsc--${x.stand}`} data-cl26="disc" data-k={x.stand} aria-hidden="true"
    style={size ? ({ "--d": `${size}px` } as React.CSSProperties) : undefined}>
    {agentInitials(x.agent).slice(0, 2)}
    {x.stand === "you" ? <i className="cl26-bang">!</i> : null}
  </span>
);

/** principles v2 — Agent fit by the name: five small stars, display only (fit is set on the card), nothing when unrated */
export const FitStars: React.FC<{ n: 1 | 2 | 3 | 4 | 5 }> = ({ n }) => {
  const w = `Agent fit: ${FIT_WORDS[n]}`;
  return (
    <span className="clp2-fit" data-clp2="fit" data-n={n} role="img" title={w} aria-label={w}>
      {[1, 2, 3, 4, 5].map((i) => <i key={i} className={i <= n ? "on" : undefined} aria-hidden="true">★</i>)}
    </span>
  );
};

const Row26: React.FC<{ x: AgentFacts; p: ContactSheet26Props }> = ({ x, p }) => {
  const a = x.agent;
  const name = agentPrimary(a);
  const agency = (a.name ?? "").trim() ? (a.agency ?? "").trim() : "";
  const sub = [agency, x.loc].filter(Boolean).join(" · ");
  const qw = queryWords(x);
  const gaps = p.filters.missing ? p.gapsOf(a.id) : null;
  const open = () => p.onOpen(a.id);
  return (
    <div role="row" tabIndex={0} className="cl26-row" data-cl26="row" data-cl24="row" data-id={a.id} data-k={x.stand} aria-current={p.openId === a.id ? "true" : undefined}
      aria-label={`${name}${agency ? `, ${agency}` : ""}`}
      onClick={(e) => { if ((e.target as HTMLElement).closest("button, a")) return; open(); }}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); return; }
        /* principles v1 — ↑ ↓ move between the rows the list draws, in drawn order, kept clear of the pinned headings */
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          const rows = [...(e.currentTarget.closest("[data-cl26='rows']")?.querySelectorAll<HTMLElement>("[data-cl26='row']") ?? [])];
          const next = rows[rows.indexOf(e.currentTarget) + (e.key === "ArrowDown" ? 1 : -1)];
          if (!next) return;
          e.preventDefault();
          next.focus({ preventScroll: true });
          rowIntoView(next);
        }
      }}>
      <span role="cell" className="cl26-who" data-cl26="agent">
        <Disc26 x={x} />
        <span className="cl26-whot"><span className="clp2-nl"><b data-cl26="name" data-cl252="name">{name}</b>{a.starRating ? <FitStars n={a.starRating} /> : null}</span>{sub ? <small data-cl26="agency">{sub}</small> : null}
          {/* E — while Missing details is on: what this agent is missing, and the door to fill it in */}
          {gaps && gaps.length ? (
            <span className="cl26-miss" data-cl26="missing-line">
              Missing {gaps.join(", ")} · <button type="button" data-cl26="fill" onClick={() => p.onFill(a.id)}>Fill in →</button>
            </span>
          ) : null}
        </span>
      </span>
      <span role="cell" className="cl26-want" data-cl26="want">
        <GenrePills genres={a.genres ?? []} hit={p.genreHit} word={p.genreWord} max={Infinity} empty="No genres yet" fit />
      </span>
      <span role="cell" className={`cl26-q cl26-q--${qw.kind}`} data-cl26="query" data-status={qw.status ?? qw.kind}>
        {qw.kind === "stage" ? <StatusDot status={qw.status!} overrideSize={16} /> : qw.kind === "shut" ? <StatusDot status={QueryStatus.WITHDRAWN} overrideSize={16} /> : NQ_RING}
        <span>{qw.words}</span>
      </span>
      <span role="cell" className="cl26-chev" aria-hidden="true">›</span>
    </div>
  );
};

/** a row into view under the pin: `nearest`, then lifted clear of the pinned block (the band, index and headings) */
function rowIntoView(row: HTMLElement) {
  row.scrollIntoView({ block: "nearest" });
  const pin = row.closest("[data-cl26='card']")?.querySelector<HTMLElement>("[data-cl26='pin']");
  const sc = row.closest<HTMLElement>(".wpg-scroll");
  if (!pin || !sc) return;
  const under = pin.getBoundingClientRect().bottom - row.getBoundingClientRect().top;
  if (under > 0) sc.scrollTop -= under;
}

/* ── C · the index row ──────────────────────────────────────────────────────────────────────────────────────────── */
/* It names exactly the sections the list draws, in the same order (the one `sections` partition). A–Z under Letter by
   Surname, equal widths, an empty letter at .3 and disabled; a week, a month (a year marker where the year changes) or a
   status otherwise, each with its count. When the entries overflow, the strip scrolls sideways with a fade and an arrow
   at each end; the current entry is kept in view. */
const Index26: React.FC<{ secs: readonly Section[]; current: string | null; onJump: (key: string) => void }> = ({ secs, current, onJump }) => {
  const stripRef = useRef<HTMLDivElement>(null);
  const [over, setOver] = useState<{ l: boolean; r: boolean; on: boolean }>({ l: false, r: false, on: false });
  const az = secs.length > 0 && secs[0].kind === "letter";
  const measure = useCallback(() => {
    const el = stripRef.current;
    if (!el) return;
    const on = el.scrollWidth > el.clientWidth + 1;
    const next = { on, l: on && el.scrollLeft > 1, r: on && el.scrollLeft + el.clientWidth < el.scrollWidth - 1 };
    setOver((v) => (v.on === next.on && v.l === next.l && v.r === next.r ? v : next));
  }, []);
  useLayoutEffect(() => {
    measure();
    const el = stripRef.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure, secs]);
  /* the current entry, centred when it changes */
  useEffect(() => {
    const el = stripRef.current;
    const b = current ? el?.querySelector<HTMLElement>(`[data-cl26="ix"][data-k="${CSS.escape(current)}"]`) : null;
    if (!el || !b || el.scrollWidth <= el.clientWidth + 1) return;
    const left = b.offsetLeft - (el.clientWidth - b.offsetWidth) / 2;
    el.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [current]);
  const by = (dir: -1 | 1) => { const el = stripRef.current; if (el) el.scrollBy({ left: dir * el.clientWidth * 0.7, behavior: "smooth" }); };
  let lastYear: number | null = null;
  return (
    <div className="cl26-ix" data-cl26="index" data-az={az ? "" : undefined} data-over={over.on ? "" : undefined} role="navigation" aria-label="Jump to a section">
      {over.on ? <button type="button" className="cl26-ixa" data-cl26="ix-prev" aria-label="Scroll the index back" disabled={!over.l} onClick={() => by(-1)}>‹</button> : null}
      <div className="cl26-ixw" data-l={over.l ? "" : undefined} data-r={over.r ? "" : undefined}>
        <div className="cl26-ixs" ref={stripRef} onScroll={measure} data-cl26="ix-strip">
          {secs.map((sec) => {
            const empty = !!sec.empty || sec.ids.length === 0;
            const year = sec.kind === "month" && sec.year != null && sec.year !== lastYear ? sec.year : null;
            if (sec.kind === "month" && sec.year != null) lastYear = sec.year;
            return (
              <React.Fragment key={sec.key}>
                {year != null ? <span className="cl26-ixy" data-cl26="ix-year">{year}</span> : null}
                <button type="button" className="cl26-ixe" data-cl26="ix" data-k={sec.key} data-n={sec.ids.length}
                  aria-current={current === sec.key ? "true" : undefined} disabled={empty} onClick={() => onJump(sec.key)}
                  aria-label={az ? `${sec.label}${empty ? ", no agents" : `, ${sec.ids.length}`}` : `${sec.label}, ${sec.ids.length}`}>
                  {sec.kind === "set" || sec.kind === "stage" ? <SectionGlyph s={sec} size={15} /> : null}
                  <span className="cl26-ixl">{sec.label}</span>
                  {az ? null : <em className="cl26-ixn">{sec.ids.length}</em>}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>
      {over.on ? <button type="button" className="cl26-ixa" data-cl26="ix-next" aria-label="Scroll the index on" disabled={!over.r} onClick={() => by(1)}>›</button> : null}
    </div>
  );
};
