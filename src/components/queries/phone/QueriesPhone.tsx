/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE QUERIES TAB ON A PHONE (Phone app v2, Part 3; ref design-refs/phone-app-v2/src/v2.js `screenQueries2` · `qRow`
 * QROW B; qsheet.js `ovQuery` QH B · QB B · QL B · QN A; overlays.js `ovBirds`). SUPERSEDES Queries on a phone v1.
 *
 *  - The band (the shell's) carries "Queries", the book chip, an eye for the Birds-eye view, and "{sent} sent ·
 *    {active} active · {n} with you" — the Queries derivations' own counts, which never follow a chip.
 *  - Chips: All · With you · With the agent · Gone quiet · Closed (`whereItStands`' sets). All is grouped by whose move
 *    it is. Each row leads with the status glyph in its fill, then the agent and agency, then the status and the next
 *    date (a fact, never a verdict).
 *  - Swipe right on an open query: the next step (your move) or a nudge (theirs), in blush. Swipe left: Close, in navy.
 *    Each OPENS the journey; nothing writes on a swipe.
 *  - A row opens the query as a pull-up sheet (64%, drag to full; `?q=` so back closes it): the card in its `sheet`
 *    layout. Its ••• opens the more sheet. The eye opens the Birds-eye view.
 *
 * Phones (≤760px, `useQm1Phone`) only; Queries.tsx renders the desktop page otherwise.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import type { Agent, Manuscript, Query } from "../../../types";
import type { QcRow } from "../../../lib/qcSummary";
import { whereItStands } from "../../../lib/qcSummary";
import { STAGE_NAME } from "../../../lib/qcSummary";
import { nextDoor } from "../../../lib/queryActions/entry";
import { openQueryDrawer } from "../../../lib/queryActions/drawerStore";
import { eyeProgress, dueCell } from "../../../lib/qcBirdsEye";
import {
  PA2_CHIPS, PA2_CHIP_LABEL, PA2_GROUPS, cheerFrom, cheerWords, chipCounts, headerLine, nextDateLine, phoneScopeId, readChip, rowsFor, writeChip,
  type Cheer, type PhoneChip,
} from "../../../lib/queriesPhone";
import { QM1_ART } from "./qm1Art";
import { MobileSheet } from "../../shell/MobileSheet";
import { PhoneDisc } from "../../phone/PhoneDisc";
import { PI } from "../../phone/phoneIcons";
import { usePhoneBandExtra, usePhoneBandSlot } from "../../phone/phoneBandStore";
import { ArtPlaceholder } from "../../phone/PhoneArtSpot";
import { QC_SAMPLE_NOW, QC_SAMPLE_ROWS } from "../centre/QcExhibit";
import { exampleRows } from "../../../lib/phonePages";
import { StatusDot } from "../../StatusDot";
import "./queriesPhone.css";
import "./queriesPhoneV2.css";

/** The body class the page sets while it is on screen. */
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
  /** `?ids=` — a link that opens exactly some queries */
  idsFilter: string | null;
  /** `?q=` — the query open now, and its card (built by Queries, `layout="phone"`, `sheet`) */
  openId: string | null;
  card: React.ReactNode | null;
  onNavigate: (tab: string, subPageName?: string) => void;
  setSearchQuery?: (q: string) => void;
  /** the list the open query came from, for the card's ‹ N / M › */
  onOrder: (ids: string[]) => void;
  onEditQuery: () => void;
  /** the more sheet (the card's •••): open state lives in Queries, which builds the card */
  moreOpen?: boolean;
  onMoreClose?: () => void;
  /** the desktop's own delete (with its undo) and PDF, for the more sheet */
  onDelete?: (id: string) => void;
  onPdf?: () => void;
}

export const QueriesPhone: React.FC<QueriesPhoneProps> = (p) => {
  const { rows: allRows, routeActive } = p;
  const navigate = useNavigate();
  const location = useLocation();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
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
  const [chip, setChipState] = useState<PhoneChip>(() => readChip() ?? "all");
  const setChip = (c: PhoneChip) => { setChipState(c); writeChip(c); };
  /* Home's "Where they stand" lands on a chip by URL (`?chip=you`); this page stays mounted, so it is read on every
     arrival (location.key), applied, and taken off the address */
  useEffect(() => {
    const want = params.get("chip") as PhoneChip | null;
    if (!want || !PA2_CHIPS.includes(want)) return;
    setChip(want);
    const next = new URLSearchParams(location.search); next.delete("chip");
    navigate({ pathname: "/queries", search: next.toString() ? `?${next}` : "" }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  useEffect(() => {
    if (!routeActive) return undefined;
    document.body.classList.add(QM1_BODY_CLASS);
    return () => document.body.classList.remove(QM1_BODY_CLASS);
  }, [routeActive]);

  /* ── the band: the counts (fixed whatever the chip) and the Birds-eye eye ── */
  const [birdsOpen, setBirdsOpen] = useState(false);
  /* Part 8A: before the first query on this book, the first-query card and three inert example rows (FRQ A) */
  const firstRun = !p.loading && !idRows && rows.length === 0;
  usePhoneBandSlot("/queries", firstRun ? <div className="pa-bandtx" data-pa="band-empty">Nothing logged yet.</div> : (
    <div className="pa-bstats" data-pa="band-stats">
      <span><b className="pa-num" data-pa="stat-sent">{line.sent}</b> sent</span>
      <span><b className="pa-num" data-pa="stat-active">{line.active}</b> active</span>
      <span><b className="pa-num" data-pa="stat-you">{counts.you}</b> with you</span>
    </div>
  ), [line.sent, line.active, counts.you, firstRun]);
  usePhoneBandExtra("/queries", (
    <button type="button" className="pa-ring" aria-label="Birds-eye view" aria-haspopup="dialog" data-pa="birds-btn" onClick={() => setBirdsOpen(true)}>{PI.eye}</button>
  ), []);

  /* ── going places ── */
  const openQuery = (id: string, order: readonly string[]) => {
    p.onOrder([...order]);
    const n = new URLSearchParams(location.search); n.set("q", id); n.delete("view");
    navigate({ pathname: "/queries", search: `?${n}` }, { state: { qm1: true } });
  };
  const closeQuery = () => {
    if ((location.state as { qm1?: boolean } | null)?.qm1) { navigate(-1); return; }
    const n = new URLSearchParams(location.search); n.delete("q"); n.delete("qm");
    navigate({ pathname: "/queries", search: n.toString() ? `?${n}` : "" }, { replace: true });
  };

  /* ── the celebration: a query that moves INTO a request or an offer (Part 4, CEV C). This page stays mounted on every
     route, so the cheer shows wherever the response was saved on a phone — not only on /queries ── */
  const seen = useRef<Map<string, string> | null>(null);
  const [cheer, setCheer] = useState<{ id: string; kind: Cheer } | null>(null);
  useEffect(() => {
    if (p.loading) return;
    const prev = seen.current;
    seen.current = new Map(allRows.map((r) => [r.id, String(r.status)]));
    if (!prev) return;
    const c = cheerFrom(prev, allRows.map((r) => ({ id: r.id, status: String(r.status) })));
    if (c) setCheer(c);
  }, [allRows, p.loading]);
  const cheerRow = cheer ? allRows.find((r) => r.id === cheer.id) ?? null : null;

  /* ── the list ── */
  const order = (list: readonly QcRow[]) => list.map((r) => r.id);
  const rowEl = (r: QcRow, list: readonly QcRow[]) => <PhoneRow key={r.id} r={r} nowMs={nowMs} onOpen={() => openQuery(r.id, order(list))} />;
  const groups = idRows ? null : chip === "all"
    ? PA2_GROUPS.map((g) => ({ key: g, rows: rowsFor(rows, g, nowMs) })).filter((g) => g.rows.length)
    : [{ key: chip as Exclude<PhoneChip, "all">, rows: rowsFor(rows, chip, nowMs) }];
  const openRow = p.openId ? allRows.find((r) => r.id === p.openId) ?? null : null;

  return (
    <div className="qm1 pa-q" data-qm1="page" data-pa="queries" data-screen="list">
      <div className="pa-qbody" data-qm1="body">
        {firstRun ? (
          <QueriesFirstRun onLog={() => openQueryDrawer({ mode: "log", ...(scopeId ? { manuscriptId: scopeId } : {}) })} onImport={() => navigate("/import")} />
        ) : idRows ? (
          <>
            <div className="pa-qfilt" data-qm1="ids-banner">
              <span>Showing {idRows.length} {idRows.length === 1 ? "query" : "queries"}</span>
              <button type="button" className="pa-link" onClick={() => navigate("/queries")}>Show all</button>
            </div>
            <div className="pa-rows" data-qm1="group" data-key="ids">{idRows.map((r) => rowEl(r, idRows))}</div>
          </>
        ) : (
          <>
            <div className="pa-chips" role="group" aria-label="Show" data-qm1="chips">
              {PA2_CHIPS.map((c) => (
                <button key={c} type="button" className="pa-chip" aria-pressed={chip === c} data-qm1="chip" data-key={c} data-count={counts[c]}
                  onClick={() => setChip(c)}>{PA2_CHIP_LABEL[c]} <b>{counts[c]}</b></button>
              ))}
            </div>
            <div className="pa-rows" data-qm1="list" data-chip={chip}>
              {p.loading ? <Skeleton /> : groups!.map((g) => (
                <React.Fragment key={g.key}>
                  {chip === "all" ? <div className="pa-rowhd" data-qm1="group-head" data-key={g.key}><span>{PA2_CHIP_LABEL[g.key]}</span><span className="pa-n">· {g.rows.length}</span></div> : null}
                  <div data-qm1="group" data-key={g.key}>{g.rows.map((r) => rowEl(r, g.rows))}</div>
                </React.Fragment>
              ))}
              {!p.loading && groups!.every((g) => g.rows.length === 0) ? <p className="pa-sub pa-qnone" data-qm1="none">Nothing here.</p> : null}
            </div>
            {chip === "all" || chip === "closed" ? (
              <button type="button" className="pa-card pa-wallcard" data-pa="wall-card" onClick={() => navigate("/queries/responses")}>
                <span className="pa-spotw"><img src="/images/responses/responses-wall-hawk.webp" alt="" draggable={false} /></span>
                <span className="pa-wtx"><b>See your Wall of no</b><span className="pa-sub">Every pass, in one place you can share</span></span>
                <span className="pa-chev">{PI.chev}</span>
              </button>
            ) : null}
          </>
        )}
      </div>

      {/* the query: a pull-up sheet over the list, 64% and draggable to full; back (or a tap on the scrim) closes it */}
      <MobileSheet open={!!(p.openId && p.card)} onClose={closeQuery} ariaLabel={openRow ? `${openRow.agentName}’s query` : "Query"}
        pa={{ height: "64%", white: true, className: "pa-qsheet" }}>
        <div className="pa-qwrap" data-qm1="query">{p.card}</div>
      </MobileSheet>

      {/* the more sheet (the sheet's •••) */}
      <MobileSheet open={!!(p.moreOpen && openRow)} onClose={() => p.onMoreClose?.()} ariaLabel="More actions" pa={{ height: "auto", drag: false, z: 1010 }}>
        {openRow ? (
          <>
            <h2 className="pa-sht">{openRow.agentName}</h2>
            <div className="pa-group" data-pa="more-sheet">
              {[
                ["resp", "Record a response", PI.reply, () => openQueryDrawer({ mode: "resp", queryId: openRow.id })],
                ["nudge", "Log a nudge", PI.bell, () => openQueryDrawer({ mode: "nudge", queryId: openRow.id })],
                ["edit", "Edit", PI.edit, () => p.onEditQuery()],
                ...(openRow.court !== "closed" ? [["close", "Close", PI.closeq, () => openQueryDrawer({ mode: "close", queryId: openRow.id })] as const] : []),
              ].map(([k, w, ic, run]) => (
                <button key={k as string} type="button" className="pa-li" data-pa={`more-${k}`} onClick={() => { p.onMoreClose?.(); (run as () => void)(); }}>
                  <span className="pa-ico">{ic as React.ReactNode}</span><span className="pa-lt">{w as string}</span>
                </button>
              ))}
            </div>
            <div className="pa-group" style={{ marginTop: 14 }}>
              <button type="button" className="pa-li" data-pa="more-pdf" onClick={() => { p.onMoreClose?.(); p.onPdf?.(); }}>
                <span className="pa-ico">{PI.doc}</span><span className="pa-lt">Download as PDF</span>
              </button>
              <button type="button" className="pa-li" data-pa="more-delete" onClick={() => { p.onMoreClose?.(); p.onDelete?.(openRow.id); }}>
                <span className="pa-ico">{PI.close}</span><span className="pa-lt">Delete this query</span>
              </button>
            </div>
          </>
        ) : null}
      </MobileSheet>

      {/* the Birds-eye view (ref ovBirds): every open query and how far it has come towards its next step */}
      <MobileSheet open={birdsOpen} onClose={() => setBirdsOpen(false)} ariaLabel="Birds-eye view" pa={{ height: "92%" }}>
        <div className="pa-birds" data-pa="birds">
          <img className="pa-birdshead" src="/images/qc/be-hawk-head.png" alt="" draggable={false} />
          <h2 className="pa-sht" style={{ marginBottom: 4 }}>Birds-eye view</h2>
          <p className="pa-sub" style={{ margin: "0 0 16px", fontSize: 14 }}>How far each active query has come towards its next step.</p>
          {PA2_GROUPS.filter((g) => g !== "closed").map((g) => {
            const list = rowsFor(rows, g, nowMs);
            if (!list.length) return null;
            return (
              <React.Fragment key={g}>
                <h3 className="pa-gl" style={{ clear: "both" }}>{PA2_CHIP_LABEL[g]}</h3>
                {list.map((r) => {
                  const e = eyeProgress(r, nowMs);
                  const due = dueCell(r, nowMs);
                  const pct = e.dated ? Math.min(1, e.f ?? 0) : null;
                  return (
                    <button key={r.id} type="button" className="pa-card pa-brow" data-pa="birds-row" data-id={r.id} data-where={g} data-f={e.f ?? ""}
                      onClick={() => { setBirdsOpen(false); openQuery(r.id, order(list)); }}>
                      <span className="pa-brh"><StatusDot status={r.status} overrideSize={20} decorative /><b>{r.agentName}</b>{r.dayN != null ? <span className="pa-sub">Day {r.dayN}</span> : null}</span>
                      <span className="pa-barh"><i style={{ width: pct == null ? 0 : `${Math.round(Math.max(0.03, pct) * 100)}%`, background: g === "you" ? "var(--pa-blush)" : "var(--pa-navy)" }} /></span>
                      <span className="pa-brf pa-sub"><span>{STAGE_NAME[r.status] ?? r.status}</span><span>{g === "you" ? "Your move" : due.date || "No reply date"}</span></span>
                    </button>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>
      </MobileSheet>

      {cheer && cheerRow ? createPortal(
        /* `pa-layer`: the portal sits under <body>, outside the shell's phone token scope (Special Elite is --pa-type) */
        <div className="qm1-layer pa-layer">
          <Celebrate kind={cheer.kind} row={cheerRow} nowMs={nowMs} words={cheerWords(cheer.kind, cheerRow, rows.length ? rows : [cheerRow], ms?.title ?? null, Date.now())}
            onGo={() => {
              /* "See your next step" opens the query sheet, where the next step is pinned (§ Celebrations) */
              setCheer(null);
              navigate({ pathname: "/queries", search: `?q=${encodeURIComponent(cheerRow.id)}` });
            }}
            onLater={() => setCheer(null)} />
        </div>, document.body) : null}
    </div>
  );
};

/* ── a row and its swipe (ref `qRow`, `.sw .acts`): right shows the next step or a nudge, left shows Close ───────── */
const ACT_W = 96;
const PhoneRow: React.FC<{ r: QcRow; nowMs: number; onOpen: () => void }> = ({ r, nowMs, onOpen }) => {
  const where = whereItStands(r, nowMs);
  const live = where !== "closed";
  const mine = where === "you";
  const nd = nextDateLine(r, nowMs);
  const [x, setX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const g = useRef<{ x0: number; y0: number; base: number; axis: "x" | "y" | null; moved: boolean } | null>(null);
  const dragged = useRef(false);
  const settle = (v: number) => setX(v > ACT_W / 2 ? ACT_W : v < -ACT_W / 2 ? -ACT_W : 0);
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
    setX(Math.max(-ACT_W, Math.min(ACT_W, s.base + dx)));
  };
  const onUp = () => {
    const s = g.current;
    g.current = null;
    setDragging(false);
    if (s?.moved) { dragged.current = true; settle(x); }
  };
  /* each action OPENS its journey; nothing is written on the swipe */
  const nextStep = () => { setX(0); const d = nextDoor(r, nowMs); openQueryDrawer({ mode: d ? d.mode : "resp", queryId: r.id }); };
  const nudge = () => { setX(0); openQueryDrawer({ mode: "nudge", queryId: r.id }); };
  const close = () => { setX(0); openQueryDrawer({ mode: "close", queryId: r.id }); };
  return (
    <div className="pa-sw" data-qm1="row" data-id={r.id} data-where={where} data-status={r.status} data-swipe={x < 0 ? "left" : x > 0 ? "right" : undefined}>
      {live ? (
        <div className="pa-acts">
          <button type="button" className="l" data-pa={mine ? "swipe-next" : "swipe-nudge"} tabIndex={x > 0 ? 0 : -1} onClick={mine ? nextStep : nudge}>
            {mine ? PI.send : PI.bell}{mine ? "Next step" : "Nudge"}
          </button>
          <button type="button" className="r" data-pa="swipe-close" tabIndex={x < 0 ? 0 : -1} onClick={close}>{PI.closeq}Close</button>
        </div>
      ) : null}
      <button type="button" className={`pa-row${dragging ? " drag" : ""}`} style={{ transform: x ? `translateX(${x}px)` : undefined }}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        onClick={() => { if (dragged.current) { dragged.current = false; return; } if (x !== 0) { setX(0); return; } onOpen(); }}>
        <PhoneDisc status={r.status} size={40} />
        <span className="pa-mid"><span className="pa-nm" data-qm1="row-name">{r.agentName}</span><span className="pa-ag">{r.agency && r.agency !== "No agency" ? r.agency : ""}</span></span>
        <span className="pa-rt"><span className="pa-st" data-qm1="row-status">{STAGE_NAME[r.status] ?? r.status}</span><span className={`pa-when${nd.mine ? " mv" : ""}`} data-qm1="row-when">{nd.text}</span></span>
      </button>
    </div>
  );
};

const Skeleton: React.FC = () => (
  <div className="qm1-grp qm1-sk" aria-hidden="true">{[0, 1, 2, 3].map((i) => <div key={i} className="qm1-skrow"><i /><span><b /><em /></span></div>)}</div>
);

/* the ref's 34 pieces (restv.js ovCele, CEV C): blush, cream, sand and slate, their place, delay and fall time */
const CONF_COLS = ["#e8c8bc", "#f4f0e9", "#f7efe3", "#d7e0e8"];
const CONFETTI = Array.from({ length: 34 }, (_, i) => ({ left: (i * 37) % 100, bg: CONF_COLS[i % 4], delay: (i % 9) * 0.12, dur: 2.2 + (i % 5) * 0.3 }));
export const STAMP_WORDS: Record<Cheer, string> = { partial: "Partial requested", full: "Full requested", offer: "Offer" };
const Celebrate: React.FC<{ kind: Cheer; row: QcRow; nowMs: number; words: ReturnType<typeof cheerWords>; onGo: () => void; onLater: () => void }> = ({ kind, row, nowMs, words, onGo, onLater }) => {
  const go = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    requestAnimationFrame(() => go.current?.focus({ preventScroll: true }));
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onLater(); } };
    document.addEventListener("keydown", key, true);
    return () => document.removeEventListener("keydown", key, true);
  }, [onLater]);
  const day = row.sentMs != null ? Math.max(0, Math.floor((nowMs - row.sentMs) / 86_400_000)) : null;
  const initials = row.agentName.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
  return (
    <div className="qm1-cel pa-cele" role="dialog" aria-modal="true" aria-labelledby="qm1-cel-h" data-qm1="celebrate" data-pa="cele" data-kind={kind}>
      <div className="pa-conf" aria-hidden="true" data-pa="confetti">
        {CONFETTI.map((c, i) => <i key={i} style={{ left: `${c.left}%`, background: c.bg, animationDelay: `${c.delay}s`, animationDuration: `${c.dur}s` }} />)}
      </div>
      <div className="pa-ccard" data-pa="cele-card">
        <div className="pa-ccband"><span>With you</span><span>Day {day ?? 0}</span></div>
        <div className="pa-ccag">
          <span className="pa-ccav">{initials}</span>
          <div><div className="pa-ccnm">{row.agentName}</div>{row.agency && row.agency !== "No agency" ? <div className="pa-ccsub">{row.agency}</div> : null}</div>
        </div>
        <span className="pa-stamp" data-pa="cele-stamp">{STAMP_WORDS[kind]}</span>
      </div>
      <h2 className="pa-celh" id="qm1-cel-h">{words.headline}</h2>
      <p className="pa-celp">{words.line}</p>
      <button ref={go} type="button" className="pa-celgo" data-qm1="cheer-go" data-pa="cele-next" onClick={onGo}>See your next step</button>
      <button type="button" className="pa-celdone" data-qm1="cheer-later" data-pa="cele-done" onClick={onLater}>Done</button>
    </div>
  );
};

export default QueriesPhone;

/* ── Queries before the first query (Phone app v2, Part 8A; ref v2.js `screenQueries2`'s empty branch at FRQ A) ── */
const QueriesFirstRun: React.FC<{ onLog: () => void; onImport: () => void }> = ({ onLog, onImport }) => (
  <div className="pa-qfirst" data-pa="queries-first-run">
    <section className="pa-qfcard" data-pa="first-card">
      <div className="pa-qfhead"><ArtPlaceholder size={64} /><h2 className="pa-qfh">Let’s log your first query</h2></div>
      <p className="pa-qflede">Every query you log gets its own card: what you sent, when to nudge and what happens next.</p>
      <button type="button" className="pa-btn pri blk" data-pa="first-log" onClick={onLog}>{PI.plus}Log a query</button>
      <button type="button" className="pa-btn sec blk pa-mt10" data-pa="first-import" onClick={onImport}>{PI.upload}Import a spreadsheet</button>
    </section>
    <div className="pa-qfshd"><h2 className="pa-qfh2">What you’ll see here</h2><span className="pa-sub">Examples</span></div>
    {/* the app's own sample rows (the desktop exhibition's), faded and inert — never the writer's */}
    <div className="pa-rows pa-qfex" data-pa="examples" aria-hidden="true" inert>
      {exampleRows(QC_SAMPLE_ROWS).map((r) => <PhoneRow key={r.id} r={r} nowMs={QC_SAMPLE_NOW} onOpen={() => {}} />)}
    </div>
  </div>
);
