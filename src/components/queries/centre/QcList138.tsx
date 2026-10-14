/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v138 §C — THE LIST SHEET (ref design-refs/query-centre-v138/query-centre-v138.html): one white
 * sheet, radius 20. A navy top row ("Showing all {N} queries, grouped by {group}", the density control and full
 * screen), then the mono headings strip, then the groups and their rows. No group cards.
 *
 * ⚠️ THERE IS NO SORT CONTROL: every heading is a button that sorts (`aria-sort`, Enter and Space), and rows sort
 *    WITHIN each group because the groups are cut from an already-sorted list.
 * ⚠️ ONE GRID FOR HEADINGS AND ROWS (`--qc138-cols`), so each heading sits over its column with no script offsets.
 *    The Next move cell is a SUBGRID over the last two tracks: the action in track 5, the due figure in track 6.
 * ⚠️ EVERY WORD A ROW SAYS COMES FROM `lib/qcRowLines` AND `lib/qc138`, and its next move from Query panel v2's
 *    one predicate (`nextDoor`).
 */
import React, { useEffect, useRef, useState } from "react";
import { StatusDot } from "../../StatusDot";
import { Mark } from "../QueryCard";
import type { SubmissionPackage } from "../../../types";
import type { GroupBy, ListGroup } from "../../../lib/qcCalView";
import { GROUP_BY_OPTIONS } from "../../../lib/qcCalView";
import type { QcRow } from "../../../lib/qcSummary";
import { STAGE_NAME, tileCourt } from "../../../lib/qcSummary";
import type { ComingUp } from "../../../lib/qcComingUp";
import { nextDoor } from "../../../lib/queryActions/entry";
import { nextLine, sentCell } from "../../../lib/qcRowLines";
import { peekChain, type PeekEvent } from "../../../lib/qc138";
import { DIAL, DIAL_C, HEADINGS, TRACK_STOPS, dialOf, dueOf, sentenceCase, stageDetail, startOfDay, trackLevel, type Qc138Sort, type Qc138SortKey } from "../../../lib/qc138";
import { isYourMoveRow } from "../../../lib/queryCentreGroups";
import { AgentDisc } from "../../shared/AgentDisc";
import { useTip } from "./QcList132";
import type { QcDensity } from "../../../lib/qcListMemory";
import { MONTHS_SHORT } from "../../../lib/dates";
import "./qcvList138.css";

const MON = MONTHS_SHORT;
const DAY_MS = 86_400_000;

/** "14 Mar", with the year only when it is not this year ("14 Mar 2024") */
export const firstQueried = (ms: number, nowMs: number): string => {
  const d = new Date(ms);
  const y = new Date(nowMs).getFullYear();
  return `${d.getDate()} ${MON[d.getMonth()]}${d.getFullYear() === y ? "" : ` ${d.getFullYear()}`}`;
};
/** the compact due date: "30 Sep", or "30 Sep '25" in another year */
export const dueText = (ms: number, nowMs: number): string => {
  const d = new Date(ms);
  const y = new Date(nowMs).getFullYear();
  return `${d.getDate()} ${MON[d.getMonth()]}${d.getFullYear() === y ? "" : ` ’${String(d.getFullYear()).slice(2)}`}`;
};
/** whole days from today to the due date: negative when it has passed */
export const daysTo = (ms: number, nowMs: number): number => Math.round((startOfDay(ms) - startOfDay(nowMs)) / DAY_MS);
export const dueTitle = (ms: number, nowMs: number): string => {
  const d = daysTo(ms, nowMs);
  if (d < 0) return `${-d} ${d === -1 ? "day" : "days"} over`;
  return `${d} ${d === 1 ? "day" : "days"} left`;
};

const ICON = {
  x: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8" /></svg>,
  pen: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.5 2.5l3 3-7.5 7.5H3v-3z" /><path d="M9 4l3 3" /></svg>,
  glass: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2h8M4 14h8M5 2c0 4 6 4 6 6s-6 2-6 6M11 2c0 4-6 4-6 6s6 2 6 6" /></svg>,
  box: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"><rect x="2" y="3" width="12" height="3" rx="1" /><path d="M3 6v7h10V6M6.5 9h3" /></svg>,
  clock: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="6" /><path d="M8 4.5V8l2.5 1.5" /></svg>,
  pkg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"><path d="M3 8l9-4 9 4-9 4z" /><path d="M3 8v8l9 4 9-4V8" /><path d="M12 12v8" /></svg>,
  full: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2.5h4v4M13.5 2.5 9 7M6.5 13.5h-4v-4M2.5 13.5 7 9" /></svg>,
  comfy: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M3 4.5h10M3 8h10M3 11.5h10" /></svg>,
  dense: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M3 3.5h10M3 6.5h10M3 9.5h10M3 12.5h10" /></svg>,
};

export type BandTone = "you" | "waiting" | "closed";
/** v138 §D — the session's folded bands */
export const QC138_FOLD_KEY = "sa.qc138.folded";

/**
 * v138 §D — A BAND IS STUCK while it sits at its sticky top with its rows still under it. Derived from boxes on every
 * scroll of the page's scroller (rAF-throttled), never an observer: a missed event would be permanent.
 */
function useStuckBands(box: React.RefObject<HTMLElement | null>, sig: string): void {
  useEffect(() => {
    const root = box.current;
    const sc = root?.closest<HTMLElement>(".wpg-scroll");
    if (!root || !sc) return undefined;
    let raf = 0;
    const read = () => {
      raf = 0;
      root.querySelectorAll<HTMLElement>(".qc138-band").forEach((b) => {
        const top = parseFloat(getComputedStyle(b).top) || 0;
        const r = b.getBoundingClientRect();
        const grp = b.parentElement?.getBoundingClientRect();
        const at = r.top - sc.getBoundingClientRect().top;
        const stuck = Math.abs(at - top) < 1 && !!grp && grp.bottom > r.bottom + 1 && grp.top < r.top - 1;
        if (stuck) b.setAttribute("data-stuck", ""); else b.removeAttribute("data-stuck");
      });
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(read); };
    read();
    sc.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => { sc.removeEventListener("scroll", on); window.removeEventListener("resize", on); if (raf) cancelAnimationFrame(raf); };
  }, [box, sig]);
}
const TONE_ICON: Record<BandTone, React.ReactNode> = { you: ICON.pen, waiting: ICON.glass, closed: ICON.box };

/** Where it stands: four 9px dots (Queried · Partial · Full · Offer), 15 apart, joined by 11×2 lines */
const Track: React.FC<{ level: number; yours: boolean; closed: boolean }> = ({ level, yours, closed }) => (
  <span className={`qc138-trk${yours ? " qc138-trk--you" : ""}${closed ? " qc138-trk--closed" : ""}`} data-qcv="row-track" data-level={level} aria-hidden="true">
    {TRACK_STOPS.map((stop, i) => (
      <React.Fragment key={stop}>
        {i > 0 ? <i className={`qc138-tl${i <= level ? " on" : ""}`} /> : null}
        <b className={`qc138-td${i <= level ? " on" : ""}${i === level && yours && !closed ? " last" : ""}`} title={i <= level ? `${stop}: reached` : `${stop}: not yet`} />
      </React.Fragment>
    ))}
  </span>
);

/** Due, comfortable: a 52px dial. The arc is the share of the wait gone; past the date it is a solid rust disc. */
const Dial: React.FC<{ frac: number; over: boolean; due: number; yours: boolean; title: string }> = ({ frac, over, due, yours, title }) => {
  const d = new Date(due);
  const c = DIAL.box / 2;
  return (
    <span className={`qc138-dial${over ? " over" : ""}${yours ? " you" : ""}`} data-qcv="row-dial" data-over={over ? "" : undefined} data-frac={frac.toFixed(3)} title={title}>
      {over ? null : (
        <svg viewBox={`0 0 ${DIAL.box} ${DIAL.box}`} aria-hidden="true">
          <circle className="qc138-dial-tr" cx={c} cy={c} r={DIAL.r} fill="none" strokeWidth={DIAL.w} />
          <circle className="qc138-dial-arc" data-qcv="row-dial-arc" cx={c} cy={c} r={DIAL.r} fill="none" strokeWidth={DIAL.w} strokeLinecap="round"
            strokeDasharray={`${(frac * DIAL_C).toFixed(2)} ${DIAL_C.toFixed(2)}`} transform={`rotate(-90 ${c} ${c})`} />
        </svg>
      )}
      <b className="qc138-dial-d">{d.getDate()}</b>
      <i className="qc138-dial-m">{MON[d.getMonth()]}</i>
    </span>
  );
};

/**
 * v138 §F — THE PEEK: a chain of at most five stops with labelled gaps, never a scaled axis. Pale navy, or blush
 * with a rust bar when the query is overdue. `aria-hidden`: the panel is the accessible route to the same history.
 */
const Peek: React.FC<{ events: readonly PeekEvent[] | null; due: number | null; nowMs: number; closed: boolean; yours: boolean }> = ({ events, due, nowMs, closed, yours }) => {
  if (!events) return <div className="qc138-peek qc138-peek--wait" data-qcv="peek" aria-hidden="true" />;
  const ch = peekChain(events, { due, now: nowMs, closed, yours });
  return (
    <div className={`qc138-peek${ch.overdue ? " over" : ""}${yours ? " you" : ""}`} data-qcv="peek" data-over={ch.overdue ? "" : undefined} aria-hidden="true">
      <div className="qc138-chain" data-qcv="peek-chain">
        {ch.stops.map((st, i) => (
          <React.Fragment key={`${st.kind}-${i}`}>
            {i > 0 ? (
              <span className={`qc138-seg qc138-seg--${ch.segs[i - 1].kind}`} data-qcv="peek-seg" style={{ flexGrow: ch.segs[i - 1].grow }}>
                <em data-qcv="peek-seg-label">{ch.segs[i - 1].label}</em><i className="qc138-seg-ln" /><i className="qc138-seg-strut" />
              </span>
            ) : null}
            <span className={`qc138-stop qc138-stop--${st.kind}${st.today ? " is-today" : ""}${i === 0 ? " first" : ""}${i === ch.stops.length - 1 ? " last" : ""}`} data-qcv="peek-stop" data-kind={st.kind}>
              <i className="qc138-sd" />
              <b data-qcv="peek-name">{st.name}</b>
              {st.date ? <small data-qcv="peek-date">{st.date}</small> : null}
            </span>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

/** "What you sent": a 92px package chip (or an empty 92px space), a rule, four 30px tiles */
const SentCell138: React.FC<{ row: QcRow; pkg: SubmissionPackage | null; nowMs: number; onAdd: () => void; onPackage: () => void }> = ({ row, pkg, nowMs, onAdd, onPackage }) => {
  const m = sentCell(row, pkg, nowMs);
  return (
    <div className="qc138-mats" data-qcv="sent" data-slot={m.slot.kind} data-known={m.known ? "true" : "false"}>
      {m.slot.kind === "package" ? (
        <button type="button" className="qc138-pkg qc138-pkg--on" data-qcv="row-pkg" data-tip={m.slot.title} data-tl={m.slot.line}
          onClick={(e) => { e.stopPropagation(); onPackage(); }}>
          {ICON.pkg}<span className="qc138-pkg-word">{m.slot.name}</span>
        </button>
      ) : m.slot.kind === "add" ? (
        <button type="button" className="qc138-pkg qc138-pkg--add" data-qcv="row-add" data-tip={m.slot.title} data-tl={m.slot.line}
          onClick={(e) => { e.stopPropagation(); onAdd(); }}>
          <span className="qc138-pkg-plus" aria-hidden="true">+</span><span className="qc138-pkg-word">Add</span>
        </button>
      ) : (
        <span className="qc138-pkg qc138-pkg--none" data-qcv="row-pkg-none" aria-hidden="true" />
      )}
      <i className="qc138-sep" aria-hidden="true" />
      {m.tiles.map((t) => (
        <span key={t.kind} className={`qc138-tile${t.state === "sent" ? " on" : ""}`} data-qcv="sent-tile" data-kind={t.kind} data-state={t.state}
          tabIndex={0} role="img" aria-label={`${t.name}: ${t.line}`} data-tip={t.name} data-tl={t.line}>
          <Mark kind={t.kind} />
        </span>
      ))}
    </div>
  );
};

export interface QcList138Props {
  groups: ListGroup[];
  groupBy: GroupBy;
  onGroup: (g: GroupBy) => void;
  /** the band tone for each group key */
  toneOf: (g: ListGroup) => BandTone;
  /** every query in scope, and how many the filters leave */
  total: number;
  shown: number;
  filtered: boolean;
  onClearAll: () => void;
  sort: Qc138Sort;
  onHeading: (k: Qc138SortKey) => void;
  density: QcDensity;
  onDensity: (d: QcDensity) => void;
  full: boolean;
  onFull: () => void;
  selectedId: string | null;
  onOpen: (id: string) => void;
  nowMs: number;
  coming?: ReadonlyMap<string, ComingUp>;
  packageOf?: (id: string) => SubmissionPackage | null;
  onAct?: (id: string, bucket: ComingUp["bucket"] | null) => void;
  onEdit?: (id: string) => void;
  onClose?: (id: string) => void;
  onAddSent?: (id: string) => void;
  onOpenPackage?: (packageId: string | null) => void;
  find?: string;
  ringId?: string | null;
  /** v138 §F — the query's dated events, from its activity log (the panel's own source) */
  loadPeek?: (id: string) => Promise<PeekEvent[]>;
  /** group keys folded at first sight (Part D: Closed) */
  folded: ReadonlySet<string>;
  onFold: (key: string) => void;
}

export const QcList138: React.FC<QcList138Props> = ({
  groups, groupBy, onGroup, toneOf, total, shown, filtered, onClearAll, sort, onHeading, density, onDensity, full, onFull,
  selectedId, onOpen, nowMs, coming, packageOf, onAct, onEdit, onClose, onAddSent, onOpenPackage, find = "", ringId = null, folded, onFold, loadPeek,
}) => {
  /* §F — the peek opens after 450ms of continuous hover; the events are fetched from the first moment */
  const [peekId, setPeekId] = useState<string | null>(null);
  const [, setLoaded] = useState(0);
  const peekCache = useRef(new Map<string, PeekEvent[]>());
  const peekTimer = useRef<number | undefined>(undefined);
  const calm = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const enter = (id: string, el: HTMLElement) => {
    if (loadPeek && !peekCache.current.has(id)) {
      loadPeek(id).then((ev) => { peekCache.current.set(id, ev); setLoaded((n) => n + 1); }).catch(() => { peekCache.current.set(id, []); setLoaded((n) => n + 1); });
    }
    window.clearTimeout(peekTimer.current);
    peekTimer.current = window.setTimeout(() => setPeekId(id), 450);
    /* §F2 — the dial's arc sweeps from empty to its value (Web Animations: a var() in a keyframe fails here) */
    if (!calm()) {
      const arc = el.querySelector<SVGCircleElement>(".qc138-dial-arc");
      const to = arc?.getAttribute("stroke-dasharray");
      if (arc && to && typeof arc.animate === "function") arc.animate([{ strokeDasharray: `0 ${DIAL_C.toFixed(2)}` }, { strokeDasharray: to }], { duration: 700, easing: "cubic-bezier(.2,.8,.2,1)" });
    }
  };
  const leave = () => { window.clearTimeout(peekTimer.current); setPeekId(null); };
  useEffect(() => () => window.clearTimeout(peekTimer.current), []);
  const boxRef = useRef<HTMLDivElement>(null);
  const tip = useTip(boxRef);
  const [groupOpen, setGroupOpen] = useState(false);
  const groupBtn = useRef<HTMLButtonElement>(null);
  const rows = groups.flatMap((g) => g.rows);
  useStuckBands(boxRef, `${groups.map((g) => `${g.key}:${g.rows.length}`).join("|")}|${[...folded].join(",")}|${density}`);
  const groupLabel = GROUP_BY_OPTIONS.find((o) => o.key === groupBy)?.label ?? "Urgency";
  useEffect(() => {
    if (!groupOpen) return undefined;
    const down = (e: PointerEvent) => {
      const t = e.target as Node;
      if (groupBtn.current?.contains(t) || (t instanceof Element && t.closest('[data-qc138="group-menu"]'))) return;
      setGroupOpen(false);
    };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); setGroupOpen(false); groupBtn.current?.focus(); } };
    document.addEventListener("pointerdown", down, true);
    document.addEventListener("keydown", key, true);
    return () => { document.removeEventListener("pointerdown", down, true); document.removeEventListener("keydown", key, true); };
  }, [groupOpen]);

  const hl = (text: string): React.ReactNode => {
    const q = find.trim();
    if (!q) return text;
    const i = text.toLowerCase().indexOf(q.toLowerCase());
    return i < 0 ? text : <>{text.slice(0, i)}<mark>{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>;
  };

  const renderRow = (r: QcRow) => {
    const on = r.id === selectedId;
    const next = coming?.get(r.id) ?? null;
    const nx = nextLine(r, next, nowMs);
    const move = nextDoor(r);
    const closed = r.court === "closed";
    const pkgId = r.query.sentPackageId || r.query.packageId || null;
    const pkg = pkgId ? packageOf?.(pkgId) ?? null : null;
    const due = dueOf(r);
    const dd = due != null ? daysTo(due, nowMs) : null;
    const dueTone = dd == null ? "none" : dd < 0 ? "over" : dd <= 7 ? "soon" : "later";
    const yours = isYourMoveRow(r);
    const detail = stageDetail(r, nowMs);
    const dial = dialOf(r, nowMs);
    return (
      <div key={r.id} id={`query-row-${r.id}`} className={`qc138-row${closed ? " qc138-row--closed" : ""}${ringId === r.id ? " kf" : ""}`} data-ring={ringId === r.id || undefined}
        data-qcv="row" data-id={r.id} data-qid={r.id} data-court={tileCourt(r.status) ?? "closed"} data-last={r.lastMs} data-status={r.status} data-you={r.withYou ? "true" : "false"} data-move={yours ? "true" : "false"} data-name={r.agentName}
        role="option" aria-selected={on} tabIndex={on || (!selectedId && r === rows[0]) ? 0 : -1}
        onClick={() => onOpen(r.id)}
        onMouseEnter={(e) => enter(r.id, e.currentTarget)} onMouseLeave={leave}
        onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onOpen(r.id); } }}>
        <div className="qc138-ag" data-qcv="row-agent">
          <AgentDisc initials={r.initials} standing={closed ? "closed" : "querying"} size={density === "compact" ? 26 : 40} className="qc138-disc" attrs={{ "data-qcv": "row-chip" }} />
          <span className="qc138-agt">
            <b data-qcv="row-name">{hl(r.agentName)}</b>
            <small data-qcv="row-agency">{hl(r.agency)}</small>
          </span>
        </div>
        <div className="qc138-fq" data-qcv="row-first">
          <span className="qc138-fqd" data-qcv="row-first-date">{r.sentMs != null ? firstQueried(r.sentMs, nowMs) : "Not dated"}</span>
          {r.dayN != null ? <span className="qc138-fqn" data-qcv="row-day">day {r.dayN}</span> : null}
        </div>
        <div className="qc138-st" data-qcv="row-stand">
          <div className="qc138-ws1"><StatusDot status={r.status} overrideSize={12} /><span>{STAGE_NAME[r.status]}</span></div>
          <Track level={trackLevel(r)} yours={yours} closed={closed} />
          {detail ? <div className={`qc138-sub${detail.hot ? " hot" : ""}`} data-qcv="row-standline" data-hot={detail.hot || undefined}>{detail.text}</div> : null}
        </div>
        <div className="qc138-snt" data-qcv="row-sent">
          <SentCell138 row={r} pkg={pkg} nowMs={nowMs} onAdd={() => (onAddSent ?? onEdit)?.(r.id)} onPackage={() => onOpenPackage?.(pkgId)} />
        </div>
        <div className="qc138-nx" data-qcv="row-next">
          <div className="qc138-nxm">
            <div className="qc138-nxt" data-qcv="row-verb">{nx.phrase}</div>
            <div className={`qc138-sub${nx.hot ? " hot" : ""}`} data-qcv="row-nextline" data-hot={nx.hot || undefined}>{sentenceCase(nx.line)}</div>
          </div>
          <div className="qc138-due" data-qcv="row-due" data-tone={dueTone} title={due != null && !closed ? dueTitle(due, nowMs) : undefined}>
            {due == null || closed ? null : density === "compact" || !dial
              ? <span className="qc138-dt" data-qcv="row-due-text">{dueText(due, nowMs)}</span>
              : <Dial frac={dial.frac} over={dial.over} due={dial.due} yours={yours} title={dueTitle(due, nowMs)} />}
          </div>
          <span className="qc138-tray" data-qcv="row-tray">
            {move && !closed && (
              <button type="button" className="qc138-pillbtn" data-qcv="row-act" data-next={move.mode}
                onClick={(e) => { e.stopPropagation(); onAct?.(r.id, next?.bucket ?? null); }}>{move.label}</button>
            )}
            <button type="button" className="qc138-ghost" data-qcv="row-edit"
              onClick={(e) => { e.stopPropagation(); onEdit?.(r.id); }} aria-label={`Edit the query to ${r.agentName}`}>{ICON.pen}</button>
            {!closed && (
              <button type="button" className="qc138-ghost" data-qcv="row-close"
                onClick={(e) => { e.stopPropagation(); onClose?.(r.id); }} aria-label={`Close the query to ${r.agentName}`}>{ICON.x}</button>
            )}
          </span>
        </div>
        <div className="qc138-peekw" data-open={peekId === r.id ? "" : undefined} aria-hidden="true">
          <div className="qc138-peeki">
            {peekId === r.id ? <Peek events={peekCache.current.get(r.id) ?? null} due={closed ? null : due} nowMs={nowMs} closed={closed} yours={yours} /> : null}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="qc138-sheet" data-qc138="sheet" data-density={density} ref={boxRef} {...tip.handlers}>
      <div className="qc138-top" data-qc138="top" data-qcv="ws-head">
        <p className="qc138-say" data-qc138="showing" data-qcv="ws-title">
          {filtered
            ? <>Showing <b data-qc138="shown">{shown}</b> of <b data-qc138="total">{total}</b>,</>
            : <>Showing all <b data-qc138="total">{total}</b> {total === 1 ? "query" : "queries"},</>}
          {" "}<span className="qc138-gb">grouped by</span>{" "}
          <button type="button" ref={groupBtn} className="qc138-grp" data-qc138="group" aria-haspopup="menu" aria-expanded={groupOpen}
            onClick={() => setGroupOpen((o) => !o)}>{groupLabel}</button>
          {filtered ? <button type="button" className="qc138-clear" data-qc138="clear-all" onClick={onClearAll}>Clear all</button> : null}
          {groupOpen ? (
            <span className="qc138-gmenu" role="menu" data-qc138="group-menu">
              {GROUP_BY_OPTIONS.map((o) => (
                <button key={o.key} type="button" role="menuitemradio" aria-checked={groupBy === o.key} data-g={o.key}
                  onClick={() => { onGroup(o.key); setGroupOpen(false); groupBtn.current?.focus(); }}>{o.label}</button>
              ))}
            </span>
          ) : null}
        </p>
        <span className="qc138-tools">
          <span className="qc138-dens" role="group" aria-label="Row density" data-qcv="ws-density">
            <button type="button" aria-pressed={density === "comfortable"} data-d="comfortable" title="Comfortable rows" aria-label="Comfortable rows" onClick={() => onDensity("comfortable")}>{ICON.comfy}</button>
            <button type="button" aria-pressed={density === "compact"} data-d="compact" title="Compact rows" aria-label="Compact rows" onClick={() => onDensity("compact")}>{ICON.dense}</button>
          </span>
          <button type="button" className="qc138-fs" data-qc138="full" aria-pressed={full} title={full ? "Leave full screen" : "Full screen"} aria-label={full ? "Leave full screen" : "Full screen"} onClick={onFull}>{ICON.full}</button>
        </span>
      </div>
      <div className="qc138-heads" data-qc138="headings" role="row">
        {HEADINGS.map((h) => {
          const on = sort.key === h.key;
          return (
            <div key={h.key} role="columnheader" className={`qc138-h${on ? " on" : ""}`} data-k={h.key} data-qc138="heading"
              aria-sort={on ? (sort.reversed ? "descending" : "ascending") : "none"}>
              <button type="button" onClick={() => onHeading(h.key)}>
                <span>{h.label}</span><i aria-hidden="true">{on && sort.reversed ? "↑" : "↓"}</i>
              </button>
            </div>
          );
        })}
      </div>
      <div className="qc138-body" data-qcv="list">
        {groups.map((g) => {
          const tone = toneOf(g);
          const shut = folded.has(g.key);
          const label = g.label || "All queries";
          return (
            <div key={g.key} className={`qc138-grp${shut ? " shut" : ""}`} data-qcv="grp" data-group={g.key}>
              <button type="button" className={`qc138-band qc138-band--${tone}`} data-qcv="gband" data-group={g.key} data-tone={tone}
                aria-expanded={!shut} onClick={() => onFold(g.key)}>
                <span className="qc138-gart" aria-hidden="true">{TONE_ICON[tone]}</span>
                <b className="qc138-gt" data-qcv="gband-t">{label}</b>
                <span className="qc138-gn" data-qcv="gband-n">{g.rows.length} {g.rows.length === 1 ? "query" : "queries"}</span>
                {g.hint ? <span className="qc138-gh" data-qcv="gband-h">{g.hint}</span> : <span className="qc138-gh" />}
                <span className="qc138-chev" aria-hidden="true">▾</span>
              </button>
              {!shut && (
                <div role="listbox" aria-label={`${label}: ${g.rows.length} ${g.rows.length === 1 ? "query" : "queries"}`} className="qc138-rows">
                  {g.rows.map(renderRow)}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {tip.node}
    </div>
  );
};
