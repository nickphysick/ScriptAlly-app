/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QUERIES ON A PHONE v1 (design-refs/queries-mobile-v1/). At 760px and narrower `Queries` renders this in place of its
 * own tree, and above 760px nothing here mounts, so the desktop and tablet pages are the pages they were.
 *
 * Three screens, all on the URL so the phone's back gesture works:
 *   /queries                the tab: header, chips, the chosen set
 *   /queries?qm=coming      Coming up: the next 21 days
 *   /queries?q=<id>         one query: the app's own query card, laid out for a phone (`QcQueryCard149 layout="phone"`)
 *
 * Every figure comes from `lib/queriesPhone` over the desktop's own rows; every action opens an existing journey.
 */
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import type { Agent, Manuscript, Query } from "../../../types";
import type { QcRow } from "../../../lib/qcSummary";
import { whereItStands } from "../../../lib/qcSummary";
import { nextDoor } from "../../../lib/queryActions/entry";
import { openQueryDrawer } from "../../../lib/queryActions/drawerStore";
import {
  CHIP_LABEL, GROUP_CAP, PHONE_CHIPS, PHONE_SORTS, allSections, cheerFrom, cheerWords, chipCounts, comingUp, defaultChip,
  headerLine, heroOf, pastDueRows, phoneScopeId, quietRows, readChip, rowsFor, stampFor, subLine, waitingGroups, windowGone, writeChip,
  yourMoveGroups, type Cheer, type PhoneChip, type PhoneSort,
} from "../../../lib/queriesPhone";
import { ShellScope } from "../../shell/ShellSidebar";
import { PhoneSearch } from "../../dashboard/phone/PhoneTopBar";
import { QM1_ART } from "./qm1Art";
import "./queriesPhone.css";

/** The body class that hides the shell's own phone bar while this page is on screen. */
export const QM1_BODY_CLASS = "qm1-on";
export const QM1_MEDIA = "(max-width: 760px)";
const ACTIVE_MS_KEY = "scriptally_active_manuscript_id";

/** true at 760px and narrower; false without matchMedia (and so in every unit test) */
export function useQm1Phone(): boolean {
  const read = () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(QM1_MEDIA).matches;
  const [on, setOn] = useState(read);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
    const mq = window.matchMedia(QM1_MEDIA);
    const f = () => setOn(mq.matches);
    f();
    mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, []);
  return on;
}

/* ── icons (the mock's own strokes) ─────────────────────────────────────────────────────────────────────────── */
const sv = (d: React.ReactNode, vb = "0 0 24 24") => <svg viewBox={vb} aria-hidden="true" focusable="false">{d}</svg>;
const I = {
  plus: sv(<path d="M12 5v14M5 12h14" />),
  search: sv(<><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></>),
  cal: sv(<><rect x="4" y="5" width="16" height="15" rx="2.5" /><path d="M4 10h16M9 3v4M15 3v4" /></>),
  chev: sv(<path d="M9 6l6 6-6 6" />),
  down: sv(<path d="M6 9l6 6 6-6" />),
  back: sv(<path d="M15 5l-7 7 7 7" />),
  dots: sv(<><circle cx="12" cy="5" r="1.3" /><circle cx="12" cy="12" r="1.3" /><circle cx="12" cy="19" r="1.3" /></>),
  msg: sv(<path d="M4 6h16v10H8l-4 4z" />),
  bell: sv(<><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" /><path d="M10 20a2 2 0 0 0 4 0" /></>),
  x: sv(<path d="M6 6l12 12M18 6L6 18" />),
  arrow: sv(<path d="M5 12h14M13 6l6 6-6 6" />),
  feather: sv(<path d="M-6 28 C-3 8 3 -10 14 -27M-4 16 C-17 8 -16 -10 12 -25 M-3 7 C10 2 18 -12 14 -27" />, "-24 -30 48 60"),
  plane: sv(<path d="M-22 4 L22 -12 L0 18 L-3 8 Z M-3 8 L22 -12" />, "-26 -18 52 40"),
  env: sv(<><rect x="-18" y="-8" width="36" height="25" rx="2" /><path d="M-18 -8 L0 6 L18 -8" /><path d="M6 -16 h7 l-7 7 h7" /></>, "-24 -22 48 46"),
  stamp: sv(<><rect x="-15" y="-19" width="30" height="38" rx="1" strokeDasharray="3 3" /><rect x="-9" y="-13" width="18" height="18" /></>, "-20 -22 40 44"),
  list: sv(<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />),
};
const CHIP_ICON: Record<PhoneChip, React.ReactNode> = { you: I.feather, agent: I.plane, quiet: I.env, closed: I.stamp, all: I.list };

const Img: React.FC<{ art: { src: string; w: number; h: number }; className: string; slot?: string }> = ({ art, className, slot }) => (
  <img className={className} src={art.src} width={art.w} height={art.h} alt="" aria-hidden="true" draggable={false} data-qm1-art={slot} />
);

export interface QueriesPhoneProps {
  routeActive: boolean;
  loading: boolean;
  /** every query's row (`buildQcRows`), all manuscripts; the page scopes to the active one */
  rows: QcRow[];
  queries: Query[];
  agents: Agent[];
  manuscripts: Manuscript[];
  /** `?ids=` — the dashboard's cards open exactly their own queries */
  idsFilter: string | null;
  /** `?q=` — the query open now, and its card (built by Queries, `layout="phone"`) */
  openId: string | null;
  card: React.ReactNode | null;
  onNavigate: (tab: string, subPageName?: string) => void;
  setSearchQuery?: (q: string) => void;
  /** the list the open query came from, for the card's ‹ N / M › */
  onOrder: (ids: string[]) => void;
  onEditQuery: () => void;
}

export const QueriesPhone: React.FC<QueriesPhoneProps> = (p) => {
  const { rows: allRows, routeActive } = p;
  const navigate = useNavigate();
  const location = useLocation();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const screen: "list" | "coming" | "query" = p.openId ? "query" : params.get("qm") === "coming" ? "coming" : "list";
  const [nowMs] = useState(() => Date.now());

  /* ── the manuscript: the shell's own active key (a pick re-opens the route, so this re-reads on location.key) ── */
  const scopeId = useMemo(() => {
    let id: string | null = null;
    try { id = window.localStorage.getItem(ACTIVE_MS_KEY); } catch { /* storage refused */ }
    return phoneScopeId(p.manuscripts, id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.manuscripts, location.key]);
  const ms = p.manuscripts.find((m) => m.id === scopeId) ?? null;
  const rows = useMemo(() => (scopeId ? allRows.filter((r) => r.manuscriptId === scopeId) : allRows), [allRows, scopeId]);
  const ids = useMemo(() => (p.idsFilter ? new Set(p.idsFilter.split(",").filter(Boolean)) : null), [p.idsFilter]);
  const idRows = useMemo(() => (ids ? allRows.filter((r) => ids.has(r.id)) : null), [allRows, ids]);

  const counts = useMemo(() => chipCounts(rows, nowMs), [rows, nowMs]);
  const line = useMemo(() => headerLine(rows), [rows]);
  const [chip, setChipState] = useState<PhoneChip | null>(() => readChip());
  const chipOn: PhoneChip = chip ?? defaultChip(counts);
  const setChip = (c: PhoneChip) => { setChipState(c); writeChip(c); };
  const [find, setFind] = useState("");
  const [sort, setSort] = useState<PhoneSort>("due");
  const [sortOpen, setSortOpen] = useState(false);
  const [pastOnly, setPastOnly] = useState(false);

  /* the shell's phone bar stands down while this page is the one on screen */
  useEffect(() => {
    if (!routeActive) return undefined;
    document.body.classList.add(QM1_BODY_CLASS);
    return () => document.body.classList.remove(QM1_BODY_CLASS);
  }, [routeActive]);

  /* ── going places ── */
  const pushParams = (set: Record<string, string | null>) => {
    const n = new URLSearchParams(location.search);
    for (const [k, v] of Object.entries(set)) { if (v == null) n.delete(k); else n.set(k, v); }
    n.delete("view");
    const s = n.toString();
    navigate({ pathname: "/queries", search: s ? `?${s}` : "" }, { state: { qm1: true } });
  };
  const back = () => {
    if ((location.state as { qm1?: boolean } | null)?.qm1) { navigate(-1); return; }
    const n = new URLSearchParams(location.search);
    n.delete("q"); n.delete("qm");
    const s = n.toString();
    navigate({ pathname: "/queries", search: s ? `?${s}` : "" }, { replace: true });
  };
  const openQuery = (id: string, order: readonly string[]) => { p.onOrder([...order]); pushParams({ q: id }); };

  /* ── the sheets ── */
  const [plusOpen, setPlusOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const layerOpen = plusOpen || searchOpen || moreOpen;

  /* ── the celebration: a query that moves INTO a request or an offer while the page is on screen ── */
  const seen = useRef<Map<string, string> | null>(null);
  const [cheer, setCheer] = useState<{ id: string; kind: Cheer } | null>(null);
  useEffect(() => {
    if (p.loading) return;
    const prev = seen.current;
    seen.current = new Map(allRows.map((r) => [r.id, String(r.status)]));
    if (!prev || !routeActive) return;
    const c = cheerFrom(prev, allRows.map((r) => ({ id: r.id, status: String(r.status) })));
    if (c) setCheer(c);
  }, [allRows, p.loading, routeActive]);
  const cheerRow = cheer ? allRows.find((r) => r.id === cheer.id) ?? null : null;

  /* the chosen chip scrolls into view */
  const segsRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const box = segsRef.current;
    const on = box?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!box || !on) return;
    if (on.offsetLeft + on.offsetWidth > box.scrollLeft + box.clientWidth || on.offsetLeft < box.scrollLeft) box.scrollLeft = Math.max(0, on.offsetLeft - 16);
  }, [chipOn, screen]);

  const agentOf = (r: QcRow): Agent | undefined => p.agents.find((a) => a.id === r.query.agentId);
  const firstOf = (r: QcRow) => r.agentName.trim().split(/\s+/)[0] || r.agentName;

  /* ── the top nav ──
     Phone app v2 (Part 1C): on the list the page's own bar is gone — the shell's navy band carries the title, the book
     chip, search, feedback and the menu, and the + is the tab bar's. The query and Coming up screens keep their back
     (and More) until Part 3 rebuilds them as sheets. */
  const nav = screen === "list" ? null : (
    <div className="qm1-nav" data-qm1="nav">
      <button type="button" className="qm1-bk" data-qm1="back" onClick={back}>{I.back}Queries</button>
      <span className="qm1-acts">
        {screen === "query" ? (
          <button type="button" className="qm1-ib" data-qm1="more" aria-label="More actions" onClick={() => setMoreOpen(true)}>{I.dots}</button>
        ) : null}
      </span>
    </div>
  );

  /* ── a row ── */
  const row = (r: QcRow, order: readonly string[], opts: { bar?: boolean } = {}) => (
    <PhoneRow key={r.id} r={r} nowMs={nowMs} bar={opts.bar}
      onOpen={() => openQuery(r.id, order)} />
  );
  const group = (key: string, label: string, list: QcRow[], badgeHot: boolean, opts: { bar?: boolean; cap?: boolean } = {}) => (
    <GroupBlock key={key} gkey={key} label={label} list={list} hot={badgeHot} cap={opts.cap ?? true}
      render={(r) => row(r, list.map((x) => x.id), { bar: opts.bar })} />
  );

  /* ── the list screen ── */
  const listBody = (() => {
    if (idRows) {
      const order = idRows.map((r) => r.id);
      return (
        <>
          <div className="qm1-filt" data-qm1="ids-banner">
            <span><b>{idRows.length}</b> {idRows.length === 1 ? "query" : "queries"} from Home</span>
            <button type="button" aria-label="Show all queries" onClick={() => { const n = new URLSearchParams(location.search); n.delete("ids"); navigate({ pathname: "/queries", search: n.toString() ? `?${n}` : "" }, { replace: true }); }}>{I.x}</button>
          </div>
          <div className="qm1-grp" data-qm1="group" data-key="ids">{idRows.map((r) => row(r, order))}</div>
        </>
      );
    }
    if (pastOnly) {
      const list = pastDueRows(rows, nowMs);
      return (
        <>
          <div className="qm1-filt" data-qm1="past-banner">
            <span><b>{list.length}</b> past their date</span>
            <button type="button" aria-label="Show every query" onClick={() => setPastOnly(false)}>{I.x}</button>
          </div>
          {list.length ? <div className="qm1-grp" data-qm1="group" data-key="past">{list.map((r) => row(r, list.map((x) => x.id)))}</div> : null}
        </>
      );
    }
    if (chipOn === "you") {
      const { hero, groups } = yourMoveGroups(rows, nowMs);
      const order = [hero, ...groups.flatMap((g) => g.rows)].filter(Boolean).map((r) => r!.id);
      return (
        <>
          {hero ? <HeroCard r={hero} first={firstOf(hero)} weeks={agentOf(hero)?.responseTimeWeeks ?? null} nowMs={nowMs} onOpen={() => openQuery(hero.id, order)} /> : (
            <EmptyTip art={QM1_ART.glass} title="Nothing for you to do" sub="Every query is with an agent or closed." />
          )}
          {groups.map((g) => group(g.key, g.label, g.rows, !!g.hot))}
        </>
      );
    }
    if (chipOn === "agent") {
      const { soon, later } = waitingGroups(rows, nowMs);
      return (
        <>
          {soon.length ? group("soon", "Reply due soon", soon, false, { bar: true }) : (
            <EmptyTip art={QM1_ART.glass} title="Nothing to do here yet" sub="We’ll nudge you when a reply is late." />
          )}
          {later.length ? group("later", "Later", later, false, { bar: true }) : null}
        </>
      );
    }
    if (chipOn === "quiet" || chipOn === "closed") {
      const list = chipOn === "quiet" ? quietRows(rows, nowMs) : rowsFor(rows, "closed", nowMs);
      return list.length ? group(chipOn, CHIP_LABEL[chipOn], list, false)
        : <EmptyTip art={QM1_ART.glass} title={chipOn === "quiet" ? "No query has gone quiet" : "Nothing closed yet"} sub="" />;
    }
    const secs = allSections(rows, find, sort, nowMs);
    return (
      <>
        <div className="qm1-fsr" data-qm1="find">
          {I.search}
          <input type="search" value={find} onChange={(e) => setFind(e.target.value)} placeholder="Find an agent" aria-label="Find an agent" data-qm1="find-input" />
          <span className="qm1-sowrap">
            <button type="button" className="qm1-so" data-qm1="sort" aria-haspopup="listbox" aria-expanded={sortOpen} onClick={() => setSortOpen((o) => !o)}>
              {I.down}{PHONE_SORTS.find((s) => s.key === sort)!.label}
            </button>
            {sortOpen ? (
              <ul className="qm1-sopop" role="listbox" aria-label="Sort" data-qm1="sort-menu">
                {PHONE_SORTS.map((s) => (
                  <li key={s.key} role="option" aria-selected={s.key === sort}>
                    <button type="button" onClick={() => { setSort(s.key); setSortOpen(false); }}>{s.label}</button>
                  </li>
                ))}
              </ul>
            ) : null}
          </span>
        </div>
        {secs.map((s) => s.key === "closed" ? (
          <button key={s.key} type="button" className="qm1-ah k shut" data-qm1="all-section" data-key="closed" data-count={s.count} onClick={() => setChip("closed")}>
            <span className="ic">{CHIP_ICON.closed}</span><b>{s.label}</b><em>{s.count}</em><span className="cv">{I.chev}</span>
          </button>
        ) : (
          <React.Fragment key={s.key}>
            <div className={`qm1-ah ${s.key === "you" ? "y" : s.key === "agent" ? "a" : "q"}`} data-qm1="all-section" data-key={s.key} data-count={s.count}>
              <span className="ic">{CHIP_ICON[s.key]}</span><b>{s.label}</b><em>{s.count}</em>
            </div>
            {s.count ? (
              <div className="qm1-grp" data-qm1="group" data-key={`all-${s.key}`}>
                {s.top.map((r) => row(r, s.top.map((x) => x.id)))}
                {s.count > s.top.length ? <button type="button" className="qm1-sall" data-qm1="show-all" onClick={() => setChip(s.key)}>Show all {s.count}</button> : null}
              </div>
            ) : null}
          </React.Fragment>
        ))}
      </>
    );
  })();

  const listScreen = (
    <>
      <div className="qm1-hdr" data-qm1="header">
        <div className="qm1-ht">
          {/* Phone app v2 (Part 1C): the title and the book switcher moved up into the shell's band */}
          <p className="qm1-line" data-qm1="line"><b data-qm1="sent">{line.sent}</b> sent · <b data-qm1="active">{line.active}</b> active</p>
        </div>
        <Img art={QM1_ART.desk} className="qm1-hart" slot="desk" />
      </div>
      {!idRows ? (
        <div className="qm1-segs" ref={segsRef} role="group" aria-label="Show" data-qm1="chips">
          {PHONE_CHIPS.map((c) => (
            <button key={c} type="button" className={`qm1-sg ${c}${chipOn === c && !pastOnly ? " on" : ""}`} aria-pressed={chipOn === c && !pastOnly}
              data-qm1="chip" data-key={c} data-count={counts[c]} onClick={() => { setPastOnly(false); setChip(c); }}>
              <span className="ic">{CHIP_ICON[c]}</span><b>{counts[c]}</b>{CHIP_LABEL[c]}
            </button>
          ))}
        </div>
      ) : null}
      <div className="qm1-list" data-qm1="list" data-chip={idRows ? "ids" : pastOnly ? "past" : chipOn}>{p.loading ? <Skeleton /> : listBody}</div>
    </>
  );

  /* ── Coming up ── */
  const coming = useMemo(() => comingUp(rows, nowMs), [rows, nowMs]);
  const comingScreen = (
    <>
      <div className="qm1-cuh" data-qm1="coming-header">
        <div className="qm1-title" role="heading" aria-level={1}>Coming up<small>Your next three weeks</small></div>
        <Img art={QM1_ART.map} className="qm1-cuart" slot="map" />
      </div>
      {coming.past.n > 0 ? (
        <button type="button" className="qm1-od" data-qm1="past-due" data-n={coming.past.n}
          onClick={() => { setPastOnly(true); back(); }}>
          <Img art={QM1_ART.glass} className="qm1-odart" slot="glass" />
          <span className="qm1-odt"><b>{coming.past.n} past {coming.past.n === 1 ? "its" : "their"} date</b>
            <span>{coming.past.nudge} to nudge · {coming.past.send} for you to send</span></span>
          <span className="go">{I.chev}</span>
        </button>
      ) : null}
      {coming.weeks.length === 0 ? <EmptyTip art={QM1_ART.glass} title="A quiet three weeks" sub="Nothing is due in the next 21 days." /> : null}
      {coming.weeks.map((w) => {
        const order = w.days.flatMap((d) => d.entries.map((e) => e.row.id));
        return (
          <React.Fragment key={w.label}>
            <div className="qm1-wk">{w.label}</div>
            {w.days.map((d) => (
              <div key={d.ms} className="qm1-day" data-qm1="day" data-ms={d.ms}>
                <div className={`qm1-dd${d.today ? " tdy" : ""}`} data-qm1="ticket" data-today={d.today ? "" : undefined}>
                  <small>{d.weekday}</small><b>{d.date}</b>
                </div>
                <div className="qm1-evs">
                  {d.entries.map((e) => (
                    <button key={e.row.id} type="button" className="qm1-ev" data-qm1="entry" data-id={e.row.id} onClick={() => openQuery(e.row.id, order)}>
                      <span className={`qm1-av ${tint(e.row, nowMs)}`}>{e.row.initials}</span>
                      <span className="qm1-evt"><b>{e.sentence}</b>{e.sub ? <span>{e.sub}</span> : null}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </React.Fragment>
        );
      })}
    </>
  );

  /* ── the query ── */
  const openRow = p.openId ? allRows.find((r) => r.id === p.openId) ?? null : null;
  const queryScreen = <div className="qm1-qc" data-qm1="query">{p.card}</div>;

  const doorFor = (r: QcRow) => nextDoor(r, nowMs);

  return (
    <div className={`qm1 qm1-${screen}`} data-qm1="page" data-screen={screen}>
      <div className="qm1-dood" aria-hidden="true" />
      <div className="qm1-screen" inert={layerOpen ? true : undefined} aria-hidden={layerOpen || undefined}>
        {nav}
        <div className="qm1-body" data-qm1="body">
          {screen === "list" ? listScreen : screen === "coming" ? comingScreen : queryScreen}
          <div className="qm1-foot" />
        </div>
      </div>
      {plusOpen ? createPortal(
        <div className="qm1-layer">
          <div className="qm1-dim" data-qm1="dim" onClick={() => setPlusOpen(false)} />
          <PlusSheet
            onClose={() => setPlusOpen(false)}
            onReplied={() => { setPlusOpen(false); p.onNavigate("queries", "Record a response"); }}
            onSent={() => { setPlusOpen(false); openQueryDrawer({ mode: "log", ...(scopeId ? { manuscriptId: scopeId } : {}) }); }}
          />
        </div>, document.body) : null}
      {searchOpen ? createPortal(
        <div className="dm1-layer">
          <PhoneSearch agents={p.agents} queries={p.queries} manuscripts={p.manuscripts}
            onClose={() => setSearchOpen(false)}
            onOpenQuery={(id) => openQuery(id, [id])}
            onOpenAgent={(name) => { p.setSearchQuery?.(name); navigate("/agents"); }} />
        </div>, document.body) : null}
      {moreOpen && openRow ? createPortal(
        <div className="qm1-layer">
          <div className="qm1-dim" onClick={() => setMoreOpen(false)} />
          <ActionSheet label={`${openRow.agentName}’s query`} onClose={() => setMoreOpen(false)} items={[
            { key: "edit", label: "Edit query", run: () => { setMoreOpen(false); p.onEditQuery(); } },
            ...(openRow.court !== "closed" ? [{ key: "close", label: "Close query", run: () => { setMoreOpen(false); openQueryDrawer({ mode: "close", queryId: openRow.id }); } }] : []),
          ]} />
        </div>, document.body) : null}
      {cheer && cheerRow ? createPortal(
        <div className="qm1-layer">
          <Celebrate kind={cheer.kind} words={cheerWords(cheer.kind, cheerRow, rows.length ? rows : [cheerRow], ms?.title ?? null, Date.now())}
            onGo={() => {
              const d = doorFor(cheerRow);
              setCheer(null);
              openQueryDrawer(d && d.mode !== "resp" ? { mode: d.mode, queryId: cheerRow.id } : { mode: "sent", queryId: cheerRow.id });
            }}
            onLater={() => setCheer(null)} />
        </div>, document.body) : null}
    </div>
  );
};

/* ── parts ───────────────────────────────────────────────────────────────────────────────────────────────── */

const tint = (r: QcRow, nowMs: number): string => {
  const w = whereItStands(r, nowMs);
  return w === "you" ? "y" : w === "agent" ? "a" : w === "quiet" ? "q" : "k";
};

const GroupBlock: React.FC<{ gkey: string; label: string; list: QcRow[]; hot: boolean; cap: boolean; render: (r: QcRow) => React.ReactNode }> = ({ gkey, label, list, hot, cap, render }) => {
  const [all, setAll] = useState(false);
  const shown = cap && !all && list.length > GROUP_CAP ? list.slice(0, GROUP_CAP) : list;
  return (
    <>
      <div className="qm1-sh" data-qm1="group-head" data-key={gkey}>{label}<span className={`bd${hot ? "" : " n"}`} data-qm1="group-count">{list.length}</span></div>
      <div className="qm1-grp" data-qm1="group" data-key={gkey}>{shown.map(render)}</div>
      {shown.length < list.length ? <button type="button" className="qm1-more" data-qm1="show-more" onClick={() => setAll(true)}>Show {list.length - shown.length} more</button> : null}
    </>
  );
};

/** A row with its swipe: left shows Response and Nudge, right shows Close. Each runs the existing journey. */
const ACT_W = 84;
const PhoneRow: React.FC<{ r: QcRow; nowMs: number; bar?: boolean; onOpen: () => void }> = ({ r, nowMs, bar, onOpen }) => {
  const stamp = stampFor(r, nowMs);
  const gone = bar ? windowGone(r, nowMs) : null;
  const live = r.court !== "closed";
  const [x, setX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const g = useRef<{ x0: number; y0: number; base: number; axis: "x" | "y" | null; moved: boolean } | null>(null);
  /* a drag ends with a click on the same element (a mouse always fires one); it belongs to the drag, not to the row */
  const dragged = useRef(false);
  const settle = (v: number) => setX(v < -ACT_W ? -2 * ACT_W : v > ACT_W / 2 ? ACT_W : 0);
  const onDown = (e: React.PointerEvent) => {
    if (!live || (e.pointerType === "mouse" && e.button !== 0)) return;
    g.current = { x0: e.clientX, y0: e.clientY, base: x, axis: null, moved: false };
  };
  const onMove = (e: React.PointerEvent) => {
    const s = g.current;
    if (!s) return;
    const dx = e.clientX - s.x0, dy = e.clientY - s.y0;
    if (!s.axis) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      s.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (s.axis === "x") { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); setDragging(true); }
    }
    if (s.axis !== "x") return;
    s.moved = true;
    setX(Math.max(-2 * ACT_W, Math.min(ACT_W, s.base + dx)));
  };
  const onUp = () => {
    const s = g.current;
    g.current = null;
    setDragging(false);
    if (s?.moved) { dragged.current = true; settle(x); }
  };
  const run = (mode: "resp" | "nudge" | "close") => { setX(0); openQueryDrawer({ mode, queryId: r.id }); };
  return (
    <div className="qm1-it" data-qm1="row" data-id={r.id} data-where={whereItStands(r, nowMs)} data-swipe={x < 0 ? "left" : x > 0 ? "right" : undefined}>
      {live ? (
        <>
          <div className="qm1-sa l" aria-hidden={x <= 0 ? undefined : true}>
            <button type="button" className="a1" data-qm1="swipe-response" tabIndex={x < 0 ? 0 : -1} onClick={() => run("resp")}>{I.msg}Response</button>
            <button type="button" className="a2" data-qm1="swipe-nudge" tabIndex={x < 0 ? 0 : -1} onClick={() => run("nudge")}>{I.bell}Nudge</button>
          </div>
          <div className="qm1-sa r" aria-hidden={x >= 0 ? undefined : true}>
            <button type="button" className="a3" data-qm1="swipe-close" tabIndex={x > 0 ? 0 : -1} onClick={() => run("close")}>{I.x}Close</button>
          </div>
        </>
      ) : null}
      <button
        type="button" className={`qm1-in${dragging ? " drag" : ""}`} style={{ transform: x ? `translateX(${x}px)` : undefined }}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        onClick={() => { if (dragged.current) { dragged.current = false; return; } if (x !== 0) { setX(0); return; } onOpen(); }}
      >
        <span className={`qm1-av ${tint(r, nowMs)}`} aria-hidden="true">{r.initials}</span>
        <span className="qm1-tx">
          <b data-qm1="row-name">{r.agentName}</b>
          <span data-qm1="row-sub">{subLine(r, nowMs)}</span>
          {gone != null ? <span className="qm1-trk" data-qm1="bar"><i style={{ width: `${Math.round(gone * 100)}%` }} /></span> : null}
        </span>
        {stamp ? <span className={`qm1-stamp${stamp.late ? "" : " ok"}`} data-qm1="stamp" data-late={stamp.late ? "" : undefined}>{stamp.text}</span> : null}
      </button>
    </div>
  );
};

const HeroCard: React.FC<{ r: QcRow; first: string; weeks: number | null; nowMs: number; onOpen: () => void }> = ({ r, first, weeks, nowMs, onOpen }) => {
  const h = heroOf(r, first, typeof weeks === "number" && weeks > 0 ? weeks : null, nowMs);
  const d = nextDoor(r, nowMs);
  return (
    <div className="qm1-hero" data-qm1="hero" data-id={r.id}>
      <Img art={QM1_ART.fly} className="qm1-heroart" slot="fly" />
      <span className="qm1-pill" data-qm1="hero-pill">{h.pill}</span>
      <button type="button" className="qm1-herob" data-qm1="hero-text" onClick={onOpen}>{h.strip.bold}</button>
      {h.sub ? <p data-qm1="hero-sub">{h.sub}</p> : null}
      {h.button && d ? (
        <button type="button" className="qm1-cta" data-qm1="hero-btn" onClick={() => openQueryDrawer({ mode: d.mode, queryId: r.id })}>{h.button}{I.arrow}</button>
      ) : null}
    </div>
  );
};

const EmptyTip: React.FC<{ art: { src: string; w: number; h: number }; title: string; sub: string }> = ({ art, title, sub }) => (
  <div className="qm1-tip" data-qm1="tip"><Img art={art} className="qm1-tipart" slot="glass" /><span><b>{title}</b>{sub ? <span>{sub}</span> : null}</span></div>
);

const Skeleton: React.FC = () => (
  <div className="qm1-grp qm1-sk" aria-hidden="true">{[0, 1, 2, 3].map((i) => <div key={i} className="qm1-skrow"><i /><span><b /><em /></span></div>)}</div>
);

const PlusSheet: React.FC<{ onClose: () => void; onReplied: () => void; onSent: () => void }> = ({ onClose, onReplied, onSent }) => {
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    requestAnimationFrame(() => first.current?.focus({ preventScroll: true }));
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onClose(); } };
    document.addEventListener("keydown", key, true);
    return () => { document.removeEventListener("keydown", key, true); opener?.focus?.({ preventScroll: true }); };
  }, [onClose]);
  return (
    <div className="qm1-sht" role="dialog" aria-modal="true" aria-labelledby="qm1-sht-t" data-qm1="plus-sheet">
      <div className="qm1-grip" aria-hidden="true" />
      <div className="qm1-shtt" id="qm1-sht-t">What happened?</div>
      <div className="qm1-ops">
        <button ref={first} type="button" className="qm1-op" data-qm1="tile-replied" onClick={onReplied}>
          <Img art={QM1_ART.agentReplied} className="qm1-opart" slot="agentReplied" />
          <b>An agent replied</b><span>A request, pass or offer</span>
        </button>
        <button type="button" className="qm1-op" data-qm1="tile-sent" onClick={onSent}>
          <Img art={QM1_ART.flyTwo} className="qm1-opart" slot="flyTwo" />
          <b>I sent a query</b><span>Log it in seconds</span>
        </button>
      </div>
      <button type="button" className="qm1-cta navy full" data-qm1="plus-cancel" onClick={onClose}>Cancel</button>
    </div>
  );
};

const ActionSheet: React.FC<{ label: string; items: { key: string; label: string; run: () => void }[]; onClose: () => void }> = ({ label, items, onClose }) => {
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onClose(); } };
    document.addEventListener("keydown", key, true);
    return () => document.removeEventListener("keydown", key, true);
  }, [onClose]);
  return (
    <div className="qm1-sht" role="dialog" aria-modal="true" aria-label={label} data-qm1="more-sheet">
      <div className="qm1-grip" aria-hidden="true" />
      <div className="qm1-acts2">
        {items.map((it) => <button key={it.key} type="button" className="qm1-act" data-qm1={`more-${it.key}`} onClick={it.run}>{it.label}</button>)}
      </div>
      <button type="button" className="qm1-cta navy full" onClick={onClose}>Cancel</button>
    </div>
  );
};

const CONFETTI = [["#f3c8ba", 30, 70, 20], ["#2a3a52", 80, 150, -30], ["#e2b74f", 300, 60, 45], ["#8aa38c", 330, 170, -10], ["#e8a996", 250, 110, 70], ["#2a3a52", 60, 220, -50]] as const;
const Celebrate: React.FC<{ kind: Cheer; words: ReturnType<typeof cheerWords>; onGo: () => void; onLater: () => void }> = ({ kind, words, onGo, onLater }) => {
  const go = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    requestAnimationFrame(() => go.current?.focus({ preventScroll: true }));
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onLater(); } };
    document.addEventListener("keydown", key, true);
    return () => document.removeEventListener("keydown", key, true);
  }, [onLater]);
  return (
    <div className="qm1-cel" role="dialog" aria-modal="true" aria-labelledby="qm1-cel-h" data-qm1="celebrate" data-kind={kind}>
      {CONFETTI.map(([c, l, t, r], i) => <span key={i} className="qm1-conf" aria-hidden="true" style={{ background: c, left: l, top: t, ["--r" as string]: `${r}deg` }} />)}
      <Img art={QM1_ART.cheer} className="qm1-celart" slot="cheer" />
      <div className="qm1-celh" id="qm1-cel-h">{words.headline}</div>
      <p>{words.line}</p>
      <div className="qm1-chips" data-qm1="cheer-stats">{words.stats.map((s) => <span key={s.label}><b>{s.n}</b>{s.label}</span>)}</div>
      <button ref={go} type="button" className="qm1-cta full" data-qm1="cheer-go" onClick={onGo}>{words.button}</button>
      <button type="button" className="qm1-later" data-qm1="cheer-later" onClick={onLater}>Later</button>
    </div>
  );
};

export default QueriesPhone;
