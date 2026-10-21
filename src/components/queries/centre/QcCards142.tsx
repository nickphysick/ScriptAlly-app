/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v142 §C/§D — THE CARDS VIEW (ref design-refs/query-centre-v142/, screens 02, 04, 06, 07).
 *
 *   - The groups are the list's own groups, in the list's order (so search, filters, grouping, "Where it stands" and the
 *     sort all apply exactly as to List). Each group is a section under the Contact list's RULED heading (glyph, name,
 *     mono count, a hairline to the right edge) that sticks directly under the toolbar; No grouping is one grid.
 *   - The grid: three across when the list card is 1,100px or wider (v142.1 A1; it was 1,240), otherwise two; 24px gaps; 30px above the first row,
 *     24px at the sides; cards align to their tops.
 *   - THE CARD IS THE LANDING PAGE'S FRONT CARD, PORTED, NOT REDRAWN: it is built from `src/marketing/heroCard.css`'s own
 *     `.mk-lc*` classes (read-only — this file changes nothing in the marketing tier), so the mat, the inner border, the
 *     band's type and the agent's name are the landing card's by construction. This sheet (qcv142.css) only takes the
 *     card out of the hero's pile (no absolute placement, no tilt) and gives it the Query Centre's content.
 *
 * ⚠️ THE CARD SAYS NOTHING THE ROW DOES NOT: the band's word is `whereItStands`, the day is the row's `dayN`, the pill is
 *    the row's stage, the footer's line is the row's own next line (`nextLine`, rust on the same rule as the row's hot
 *    sub-line) and its link is the row's next move (`nextDoor`). The tracking history is the row peek's own source.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { StatusDot } from "../../StatusDot";
import type { SubmissionPackage } from "../../../types";
import { QueryStatus } from "../../../types";
import type { GroupBy, ListGroup } from "../../../lib/qcCalView";
import type { QcRow } from "../../../lib/qcSummary";
import { STAGE_NAME, WHERE_LABEL, whereItStands, type WhereKey } from "../../../lib/qcSummary";
import type { ComingUp } from "../../../lib/qcComingUp";
import { nextDoor } from "../../../lib/queryActions/entry";
import { nextLine, sentCell } from "../../../lib/qcRowLines";
import type { PeekEvent } from "../../../lib/qc138";
import { MONTHS_SHORT } from "../../../lib/dates";
import "../../../marketing/heroCard.css";
import "./qcv142.css";

export type CardTab = "tracking" | "agent" | "materials";

/** the band's tint and ink, and the pill's ground, per set (the landing card's With you / With the agent / Closed;
 *  Gone quiet is new, a 135° stripe) */
export const CARD_TONE: Record<WhereKey, { bg: string; fg: string; pill: string }> = {
  you: { bg: "#f5e6df", fg: "#7c3a2a", pill: "#f5e6df" },
  agent: { bg: "#e2e6e0", fg: "#4d524a", pill: "#e6e9e4" },
  quiet: { bg: "repeating-linear-gradient(135deg, #ebe6dd 0 6px, #f3efe8 6px 12px)", fg: "#6b5f52", pill: "#efeae2" },
  closed: { bg: "#e4e1db", fg: "#5b524a", pill: "#ece8e3" },
};

const CLOCK = (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><circle cx="8" cy="8" r="6" /><path d="M8 4.5V8l2.5 1.5" /></svg>
);
const DOC = <svg width="11" height="12" viewBox="0 0 11 12" fill="none" stroke="currentColor" strokeWidth="1.1" aria-hidden="true"><rect x="1" y="1" width="9" height="10" rx=".5" /><path d="M3 4h5M3 6h5M3 8h3" /></svg>;

/** "10 MAY", with the year when it is not this year ("14 MAR 2024") */
const upDay = (ms: number, nowMs: number): string => {
  const d = new Date(ms);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()].toUpperCase()}${d.getFullYear() === new Date(nowMs).getFullYear() ? "" : ` ${d.getFullYear()}`}`;
};

/** the package chip's words: "LIGHT PACKAGE", or "NO PACKAGE" */
export const packageChip = (name: string | null): string => {
  if (!name) return "NO PACKAGE";
  const n = name.trim();
  return (/package$/i.test(n) ? n : `${n} package`).toUpperCase();
};

/** the history the card shows, oldest first: the row peek's events once read, else what the row itself dates */
export function cardEvents(r: QcRow, loaded: readonly PeekEvent[] | null): PeekEvent[] {
  const ev = loaded && loaded.length ? [...loaded].sort((a, b) => a.ms - b.ms) : null;
  if (ev) return ev;
  const out: PeekEvent[] = [];
  if (r.sentMs != null) out.push({ name: "Query sent", ms: r.sentMs, status: QueryStatus.QUERIED });
  if (r.status !== QueryStatus.QUERIED && r.stageStartMs != null) out.push({ name: STAGE_NAME[r.status], ms: r.stageStartMs, status: r.status });
  return out;
}

export interface QcCard142Props {
  row: QcRow;
  nowMs: number;
  book: string | null;
  pkg: SubmissionPackage | null;
  coming: ComingUp | null;
  events: readonly PeekEvent[] | null;
  selected: boolean;
  onOpen: () => void;
  onTab: (t: CardTab) => void;
  onAct: () => void;
}

export const CARDS_THREE_FROM = 1100;

export const QcCard142: React.FC<QcCard142Props> = ({ row: r, nowMs, book, pkg, coming, events, selected, onOpen, onTab, onAct }) => {
  const where = whereItStands(r, nowMs);
  const tone = CARD_TONE[where];
  const nx = nextLine(r, coming, nowMs);
  const move = r.court === "closed" ? null : nextDoor(r, nowMs);
  const cell = sentCell(r, pkg, nowMs);
  const sentWith = cell.tiles.filter((t) => t.state === "sent" && !/on request/.test(t.line)).map((t) => t.name);
  const ev = cardEvents(r, events);
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  return (
    /* `qcv-legacy`: the page's own font reset (qcvPage.css) stops here, so the landing card's classes name its faces */
    <div id={`query-row-${r.id}`} className="qc142-card qcv-legacy" role="button" tabIndex={0} data-qc142="card" data-id={r.id} data-where={where} data-status={r.status} aria-current={selected ? "true" : undefined}
      aria-label={`${r.agentName}, ${r.agency}. ${STAGE_NAME[r.status]}`}
      onClick={onOpen} onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onOpen(); } }}>
      <div className="mk-lc qc142-lc" data-qc142="mat">
        <div className="mk-lc-in" data-qc142="inner">
          <div className="mk-lc-band" data-qc142="band" style={{ background: tone.bg, color: tone.fg }}>
            <span data-qc142="band-word">{WHERE_LABEL[where].label}</span>
            {r.dayN != null ? <span className="mk-lc-day" data-qc142="day"><span className="mk-odo-dk">Day</span><span>{r.dayN}</span></span> : <span />}
          </div>
          <div className="mk-lc-agent">
            <span className="mk-lc-disc">{r.initials}</span>
            <div className="qc142-who"><div className="mk-lc-nm" data-qc142="name">{r.agentName}</div><div className="mk-lc-ag">{r.agency}</div></div>
            <span className="mk-lc-pill" data-qc142="pill" style={{ background: tone.pill }}><StatusDot status={r.status} overrideSize={15} />{STAGE_NAME[r.status]}</span>
          </div>
          <div className="mk-lc-ms">
            <small>QUERYING</small>
            <b data-qc142="book">{book ?? "No manuscript"}</b>
            <div className="mk-lc-chips"><span data-qc142="package">{packageChip(cell.slot.kind === "package" ? cell.slot.name : null)}</span></div>
          </div>
          <div className="mk-lc-tabs qc142-tabs" role="group" aria-label="Open the query on">
            {(["tracking", "agent", "materials"] as const).map((t) => (
              <button key={t} type="button" data-qc142="tab" data-tab={t} aria-current={t === "tracking" ? "true" : undefined}
                onClick={(e) => { stop(e); onTab(t); }} onKeyDown={stop}>{t === "tracking" ? "Tracking" : t === "agent" ? "Agent" : "Materials"}</button>
            ))}
          </div>
          <ol className="mk-lc-steps qc142-steps" data-qc142="steps">
            {ev.length > 1 ? <i className="qc142-rail" aria-hidden="true" /> : null}
            {ev.map((e, i) => (
              <li key={`${e.ms}-${i}`} className="mk-lc-step" data-qc142="step">
                <span className="qc142-g" aria-hidden="true">{e.status ? <StatusDot status={e.status} overrideSize={15} /> : <i className="qc142-dot" />}</span>
                <span className="mk-lc-t">{i === 0 ? "Query sent" : e.name}</span>
                <span className="mk-lc-d">{upDay(e.ms, nowMs)}</span>
                {i === 0 && sentWith.length ? (
                  <span className="mk-lc-att" data-qc142="sent-with">{sentWith.map((n) => <span key={n}>{DOC}{n}</span>)}</span>
                ) : null}
              </li>
            ))}
          </ol>
          <div className="mk-lc-ft">
            <span className={nx.hot ? "mk-late" : undefined} data-qc142="due" data-hot={nx.hot ? "" : undefined}>{CLOCK}<em>{nx.line}</em></span>
            {move ? (
              <button type="button" className="qc142-act" data-qc142="act" data-next={move.mode} onClick={(e) => { stop(e); onAct(); }} onKeyDown={stop}>{move.label}</button>
            ) : <span className="qc142-noact" />}
          </div>
        </div>
      </div>
    </div>
  );
};

/** the Cards view's group heading: the Contact list's ruled heading (v20 §D), in this list's words */
export const QcCardsHeading: React.FC<{ label: string; n: number; mark: React.ReactNode; gkey: string }> = ({ label, n, mark, gkey }) => (
  <div className="qc142-rh" data-qc142="ruled" data-group={gkey}>
    <span className="qc142-rhm" aria-hidden="true">{mark}</span>
    <b className="qc142-rhl" data-qc142="ruled-label">{label}</b>
    <em className="qc142-rhn" data-qc142="ruled-count">{n} {n === 1 ? "query" : "queries"}</em>
    <i className="qc142-rhr" aria-hidden="true" />
  </div>
);

export interface QcCards142Props {
  groups: ListGroup[];
  groupBy: GroupBy;
  markOf: (g: ListGroup) => React.ReactNode;
  nowMs: number;
  bookOf: (r: QcRow) => string | null;
  packageOf?: (id: string) => SubmissionPackage | null;
  coming?: ReadonlyMap<string, ComingUp>;
  selectedId: string | null;
  loadPeek?: (id: string) => Promise<PeekEvent[]>;
  onOpen: (id: string) => void;
  onTab: (id: string, t: CardTab) => void;
  onAct: (id: string, bucket: ComingUp["bucket"] | null) => void;
}

/** read every card's history once, a few at a time, through the row peek's own reader */
function useCardEvents(ids: readonly string[], load?: (id: string) => Promise<PeekEvent[]>): ReadonlyMap<string, PeekEvent[]> {
  const cache = useRef(new Map<string, PeekEvent[]>());
  const asked = useRef(new Set<string>());
  const [, bump] = useState(0);
  const sig = ids.join("|");
  useEffect(() => {
    if (!load) return undefined;
    let live = true;
    const todo = ids.filter((id) => !asked.current.has(id));
    todo.forEach((id) => asked.current.add(id));
    const run = async () => {
      for (let i = 0; i < todo.length && live; i += 6) {
        await Promise.all(todo.slice(i, i + 6).map((id) => load(id).then((ev) => { cache.current.set(id, ev); }, () => { cache.current.set(id, []); })));
        if (live) bump((n) => n + 1);
      }
    };
    void run();
    return () => { live = false; todo.forEach((id) => { if (!cache.current.has(id)) asked.current.delete(id); }); };
  }, [sig, load]); // eslint-disable-line react-hooks/exhaustive-deps
  return cache.current;
}

/** §D, v142.1 A1 — three across when the list card (the sheet) is 1,100px or wider (1,208 at 1512 with the sidebar open), else two: read from the sheet's width on mount and
 *  whenever it resizes (a container query would make the sheet a containing block for its own fixed-position popups) */
function useCols(ref: React.RefObject<HTMLElement | null>): 2 | 3 {
  const [cols, setCols] = useState<2 | 3>(2);
  useLayoutEffect(() => {
    const sheet = ref.current?.closest<HTMLElement>(".qc138-sheet");
    if (!sheet) return undefined;
    const read = () => { const w = sheet.offsetWidth; if (w > 0) setCols(w >= CARDS_THREE_FROM ? 3 : 2); };
    read();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(read);
    ro.observe(sheet);
    return () => ro.disconnect();
  }, [ref]);
  return cols;
}

export const QcCards142: React.FC<QcCards142Props> = ({ groups, groupBy, markOf, nowMs, bookOf, packageOf, coming, selectedId, loadPeek, onOpen, onTab, onAct }) => {
  const rows = groups.flatMap((g) => g.rows);
  const boxRef = useRef<HTMLDivElement>(null);
  const cols = useCols(boxRef);
  const events = useCardEvents(rows.map((r) => r.id), loadPeek);
  const card = (r: QcRow) => {
    const pkgId = r.query.sentPackageId || r.query.packageId || null;
    const c = coming?.get(r.id) ?? null;
    return (
      <QcCard142 key={r.id} row={r} nowMs={nowMs} book={bookOf(r)} pkg={pkgId ? packageOf?.(pkgId) ?? null : null} coming={c}
        events={events.get(r.id) ?? null} selected={r.id === selectedId}
        onOpen={() => onOpen(r.id)} onTab={(t) => onTab(r.id, t)} onAct={() => onAct(r.id, c?.bucket ?? null)} />
    );
  };
  if (groupBy === "none") {
    return rows.length ? (
      <div className="qc142-cards" data-qc142="cards" data-cols={cols} ref={boxRef}>
        <div className="qc142-gsec" data-qcv="grp" data-group="all">
          <div className="qc142-grid" data-qc142="grid">{rows.map(card)}</div>
        </div>
      </div>
    ) : null;
  }
  return (
    <div className="qc142-cards" data-qc142="cards" data-cols={cols} ref={boxRef}>
      {groups.map((g) => (
        <section key={g.key} className="qc142-gsec" data-qcv="grp" data-group={g.key} aria-label={`${g.label || "All queries"}: ${g.rows.length} ${g.rows.length === 1 ? "query" : "queries"}`}>
          <QcCardsHeading label={g.label || "All queries"} n={g.rows.length} mark={markOf(g)} gkey={g.key} />
          <div className="qc142-grid" data-qc142="grid">{g.rows.map(card)}</div>
        </section>
      ))}
    </div>
  );
};
