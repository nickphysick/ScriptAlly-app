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
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useStickyStack } from "../../shell/stickyStack";
import { createPortal } from "react-dom";
import { StatusDot } from "../../StatusDot";
import { Mark } from "../QueryCard";
import type { SubmissionPackage } from "../../../types";
import type { GroupBy, ListGroup } from "../../../lib/qcCalView";
import type { QcRow } from "../../../lib/qcSummary";
import { STAGE_NAME, tileCourt } from "../../../lib/qcSummary";
import type { ComingUp } from "../../../lib/qcComingUp";
import { nextDoor } from "../../../lib/queryActions/entry";
import { nextLine, sentCell } from "../../../lib/qcRowLines";
import { peekSummary, peekTone, YOUR_MOVE_STATUSES, type PeekEvent } from "../../../lib/qc138";
import { TL4, TL4_FONTS, tl4Layout, tl4Stops, type Tl4Kind, type Tl4Measure } from "../../../lib/qcTl4";
import { StageGlyph } from "./StageGlyph";
import { bandArtOf } from "../../../lib/qcBandArt";
import { BandMark, JumpMark, TONE_ART, TONE_ICON } from "./bandMarks";
import { QcToolbar140, type Qc140Jump, type Qc140Pop } from "./QcToolbar140";
import type { PopoverState } from "../../shell/ListPills";
import { JUMP_COLUMN_LABEL, jumpColumn, jumpLabel, monthJumps } from "../../../lib/qc140";
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
      /* v18.3 §E — the headings row is stuck the same way: at its sticky top with the list still running under it
         (the shared `.lth` then draws its 8px shade) */
      const h = root.querySelector<HTMLElement>(".qc138-heads");
      if (h) {
        const top = parseFloat(getComputedStyle(h).top) || 0;
        const r = h.getBoundingClientRect();
        const at = r.top - sc.getBoundingClientRect().top;
        const stuck = Math.abs(at - top) < 1 && root.getBoundingClientRect().bottom > r.bottom + 1 && sc.scrollTop > 0;
        if (stuck) h.setAttribute("data-stuck", ""); else h.removeAttribute("data-stuck");
      }
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(read); };
    read();
    sc.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => { sc.removeEventListener("scroll", on); window.removeEventListener("resize", on); if (raf) cancelAnimationFrame(raf); };
  }, [box, sig]);
}
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
      {/* v138.1 §E — past the date the ring stays and is COMPLETE (no dash), in rust on a rust track; never a fill */}
      <svg viewBox={`0 0 ${DIAL.box} ${DIAL.box}`} aria-hidden="true">
        <circle className="qc138-dial-tr" cx={c} cy={c} r={DIAL.r} fill="none" strokeWidth={DIAL.w} />
        {over ? (
          <circle className="qc138-dial-arc" data-qcv="row-dial-arc" cx={c} cy={c} r={DIAL.r} fill="none" strokeWidth={DIAL.w} />
        ) : (
          <circle className="qc138-dial-arc" data-qcv="row-dial-arc" cx={c} cy={c} r={DIAL.r} fill="none" strokeWidth={DIAL.w} strokeLinecap="round"
            strokeDasharray={`${(frac * DIAL_C).toFixed(2)} ${DIAL_C.toFixed(2)}`} transform={`rotate(-90 ${c} ${c})`} />
        )}
      </svg>
      <b className="qc138-dial-d">{d.getDate()}</b>
      <i className="qc138-dial-m">{MON[d.getMonth()]}</i>
    </span>
  );
};

/* canvas text measure for the timeline's labels — the faces are TL4_FONTS, the stylesheet's own */
let tl4Ctx: CanvasRenderingContext2D | null = null;
/* a canvas font cannot read var(): each token is resolved from :root once and kept */
const tl4Fams = new Map<string, string>();
const tl4Font = (spec: string): string => spec.replace(/var\((--[\w-]+)\)/g, (_, v: string) => {
  if (!tl4Fams.has(v)) tl4Fams.set(v, getComputedStyle(document.documentElement).getPropertyValue(v).trim() || "serif");
  return tl4Fams.get(v)!;
});
const tl4Measure: Tl4Measure = (text, font) => {
  if (typeof document === "undefined") return text.length * 7;
  tl4Ctx = tl4Ctx ?? document.createElement("canvas").getContext("2d");
  if (!tl4Ctx) return text.length * 7;
  tl4Ctx.font = tl4Font(TL4_FONTS[font]);
  return tl4Ctx.measureText(text).width;
};
const MARK_KIND: Record<Tl4Kind, string> = { ev: "event", was: "wasdue", today: "today", due: "due" };

/**
 * v138.4 — THE PEEK AS ONE POSITIONED TRACK (lib/qcTl4 does the layout; this renders it). 120px tall, the track's
 * centre at 58: bars between the markers, markers at their true dates, labels in two lanes, durations above the bars,
 * a month axis under them. `aria-hidden`: the panel is the accessible route.
 *
 * ⚠️ ONE WRITER: the width, read by a ResizeObserver on open and on resize; the layout is derived from it. Labels are
 *    measured with the real faces, so the layout is re-derived once `document.fonts` has settled.
 */
const Peek: React.FC<{ events: readonly PeekEvent[] | null; due: number | null; nowMs: number; closed: boolean; yours: boolean }> = ({ events, due, nowMs, closed, yours }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(0);
  const [fonts, setFonts] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const read = () => { const w = el.clientWidth; if (w > 0) setW((cur) => (Math.abs(cur - w) < 0.5 ? cur : w)); };
    read();
    let live = true;
    document.fonts?.ready?.then(() => { if (live) setFonts((n) => n + 1); });
    if (typeof ResizeObserver === "undefined") return () => { live = false; };
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => { live = false; ro.disconnect(); };
  }, []);
  const S = events ? tl4Stops(events, { due, now: nowMs, closed, yours }) : null;
  const lay = S && W ? tl4Layout(S, W, tl4Measure, nowMs) : null;
  void fonts;
  const over = !!S?.some((s) => s.kind === "was");
  const { TY, H, LANE } = TL4;
  return (
    <div ref={ref} className={`qc138-peek qc138-tl4${S ? "" : " qc138-peek--wait"}`} data-qcv="peek" data-over={over ? "" : undefined} aria-hidden="true">
      {S && lay ? (
        <div className="qc138-chain" data-qcv="peek-chain">
          {lay.bars.map((b, k) => (
            <span key={`b${k}`} className={`qc138-t4b ${b.cls}${b.court ? ` ${b.court}` : ""}`} data-qcv="peek-bar" data-cls={b.cls} data-court={b.court || undefined} data-days={b.days}
              style={{ left: `${b.a}px`, width: `${b.b - b.a}px` }} />
          ))}
          {lay.axis.ticks.map((x, k) => <span key={`k${k}`} className="qc138-t4k" style={{ left: `${x}px` }} />)}
          {lay.axis.labels.map((a) => <span key={`a${a.x}`} className={`qc138-t4a${a.yr ? " yr" : ""}`} data-qcv="peek-axis" style={{ left: `${a.x}px` }}>{a.text}</span>)}
          {lay.durs.map((d, k) => (
            <span key={`d${k}`} className={`qc138-t4d ${d.cls}${d.court ? ` ${d.court}` : ""}`} data-qcv="peek-dur" style={{ left: `${d.x}px` }}>{d.text}</span>
          ))}
          {lay.marks.map((m) => {
            const st = S[m.i];
            const unmapped = st.kind === "ev" && !st.glyph;
            return (
              <span key={`m${m.i}`} className={`qc138-mk qc138-mk--${MARK_KIND[st.kind]}${m.tone ? ` ${m.tone}` : ""}`} data-qcv="peek-stop" data-kind={MARK_KIND[st.kind]}
                data-glyph={st.glyph ?? undefined} data-unmapped={unmapped ? "" : undefined} title={m.title} style={{ left: `${m.x}px`, ["--i" as string]: m.i }}>
                {st.glyph ? <StageGlyph k={st.glyph} ring="peek" dashed={!!st.status && YOUR_MOVE_STATUSES.includes(st.status)} className="qc138-mk-svg" />
                  : st.kind === "today" ? <i className="qc138-mk-tick" />
                  : <i className="qc138-mk-dot" />}
              </span>
            );
          })}
          {lay.labels.map((l) => (
            <span key={`l${l.i}`} className={`qc138-t4l ${l.al} ${l.lane} ${l.tone}`} data-qcv="peek-label" data-lane={l.lane} data-stop={l.i} title={l.title}
              style={{ left: `${l.L}px`, width: `${l.R - l.L}px`, ...(l.lane === "up" ? { bottom: `${H - TY + LANE}px` } : { top: `${TY + LANE}px` }) }}>
              <b data-qcv="peek-name">{l.name}</b>
              {l.date ? <small className={l.tone === "today" ? "ov" : undefined} data-qcv={l.tone === "today" ? "peek-over" : "peek-date"}>{l.date}</small> : null}
              {l.notes.map((t) => <span key={t} className="qc138-t4n" data-qcv="peek-note">{t}</span>)}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
};

/**
 * v138.2 §B — THE DRAWER: a grid on the row's own column template (`--qc138-cols`, the row's gap), under a 1px dashed
 * rule in the tone's colour. The summary sits under Agent, from the name's left; the timeline runs across First
 * queried to Due, and the scale is computed within that span. No background, box or bar of its own: the row's tint
 * (§A) is the drawer's ground.
 * ⚠️ NOT `aria-hidden`: the summary's link is focusable while the peek is open. The chain itself stays hidden.
 */
const PeekDrawer: React.FC<{ summary: React.ReactNode; children: React.ReactNode }> = ({ summary, children }) => (
  <div className="qc138-drw" data-qcv="peek-drawer">
    <div className="qc138-sum" data-qcv="peek-summary">{summary}</div>
    <div className="qc138-tlw" data-qcv="peek-span">{children}</div>
  </div>
);

/**
 * v138.2 §C — THE SUMMARY: three lines, 3px apart. If a line would wrap (the narrow grid), the link hides and the
 * text truncates with an ellipsis — measured on open and on resize, `data-tight` saying which.
 * ⚠️ THE LINK STOPS THE ROW'S OWN CLICK, so it opens the panel on its timeline tab and nothing else.
 */
const PeekSum: React.FC<{ s: ReturnType<typeof peekSummary>; onTimeline?: () => void; href?: string }> = ({ s, onTimeline, href }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [tight, setTight] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const read = () => {
      const lines = [...el.querySelectorAll<HTMLElement>("[data-qcv='peek-sum-head'], [data-qcv='peek-sum-line']")];
      if (lines.every((l) => l.clientWidth === 0)) return;
      setTight(lines.some((l) => l.scrollWidth > l.clientWidth + 0.5));
    };
    read();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [s.head, s.line]);
  return (
    <div ref={ref} className="qc138-sumc" data-tight={tight ? "" : undefined}>
      <div className="qc138-sum-h" data-qcv="peek-sum-head">{s.head}</div>
      <div className={`qc138-sum-l${s.hot ? " hot" : ""}`} data-qcv="peek-sum-line" data-hot={s.hot || undefined}>{s.line}</div>
      {onTimeline ? (
        <a className="qc138-sum-a" data-qcv="peek-link" href={href ?? "#"} hidden={tight}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onTimeline(); }}
          onKeyDown={(e) => e.stopPropagation()}>Open the full timeline {"\u2192"}</a>
      ) : null}
    </div>
  );
};

/* `now`: a forced today for the case (the v138.4 acceptance cases are dated against 8 Oct) */
interface LabCase { events: PeekEvent[]; due: number | null; closed?: boolean; yours?: boolean; now?: number }
const PeekLab: React.FC<{ nowMs: number }> = ({ nowMs }) => {
  const cases = typeof window !== "undefined" ? (window as unknown as { __SA_QC138_PEEK_LAB?: LabCase[] }).__SA_QC138_PEEK_LAB : undefined;
  if (!cases?.length) return null;
  return (
    <div className="qc138-peeklab" data-qc138="peek-lab">
      {cases.map((c, i) => (
        <div key={i} className="qc138-peekw" data-open="" data-qc138="peek-case">
          <div className="qc138-peeki"><PeekDrawer summary={<PeekSum s={peekSummary({ sent: c.events[0]?.ms ?? null, due: c.due, closedAt: c.closed ? c.events[c.events.length - 1]?.ms ?? null : null, closed: !!c.closed, yours: !!c.yours, now: c.now ?? nowMs })} onTimeline={() => {}} />}><Peek events={c.events} due={c.due} nowMs={c.now ?? nowMs} closed={!!c.closed} yours={!!c.yours} /></PeekDrawer></div>
        </div>
      ))}
    </div>
  );
};

/** "What you sent" (v138.5 §F): the package chip, as wide as its name up to the column (or "+ Add" when nothing is
    recorded), over the four material icons; with no package and something recorded, the icons alone on line 1 */
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
      ) : null}
      <span className="qc138-mic" data-qcv="sent-icons">
        {m.tiles.map((t) => (
          <span key={t.kind} className={`qc138-tile${t.state === "sent" ? " on" : ""}`} data-qcv="sent-tile" data-kind={t.kind} data-state={t.state}
            tabIndex={0} role="img" aria-label={`${t.name}: ${t.line}`} data-tip={t.name} data-tl={t.line}>
            <Mark kind={t.kind} />
          </span>
        ))}
      </span>
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
  /** v138.6 §B — the sticky stack's writer runs while this list is the page on screen */
  stickyOn?: boolean;
  /** v140 §A — how many filters are on (search not counted), the Filters chip's ✕, and its menu */
  filterCount: number;
  onClearFilters?: () => void;
  filtersMenu?: (pop: PopoverState<Qc140Pop>) => React.ReactNode;
  /** v140 §D — the applied-filters row, under the toolbar while anything narrows the list */
  applied?: React.ReactNode;
  /** v140 §C — the pinned band (QcBand140), drawn above the toolbar while the list is pinned */
  band?: React.ReactNode;
  /** the list is still loading: the toolbar's controls wait */
  loading?: boolean;
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
  /** v138.1 §F — the search, in the navy row */
  onFind?: (v: string) => void;
  findRef?: React.Ref<HTMLInputElement>;
  ringId?: string | null;
  /** v138 §H — the page-load entrance is running: bands and the first 16 rows land in list order */
  entering?: boolean;
  /** v138.1 §F — shown inside the sheet when nothing matches */
  deadEnd?: React.ReactNode;
  /** v138 §G — the rows ticked for a bulk action */
  selected?: ReadonlySet<string>;
  onPick?: (id: string) => void;
  /** v138 §F — the query's dated events, from its activity log (the panel's own source) */
  loadPeek?: (id: string) => Promise<PeekEvent[]>;
  /** v138.2 §C — "Open the full timeline →": open the query's panel on its timeline (Tracking) tab */
  onTimeline?: (id: string) => void;
  /** group keys folded at first sight (Part D: Closed) */
  folded: ReadonlySet<string>;
  onFold: (key: string) => void;
  /** v139 §B — the page guide's practice query: its own band above every group, whatever the grouping or sort, and in
   *  no count. `leaving` fades it out as it is cleared. */
  practice?: { row: QcRow; leaving: boolean } | null;
  /** v140 §F — THE ARRIVAL: a new `key` (the list's load, and every grouping, filter and search change) plays one
   *  arrival over the bands and rows on screen, once the list is built and before it is painted. `delayMs` holds it
   *  back (the page-load entrance, while the sheet itself is still rising). */
  arrival?: { key: string; delayMs?: number };
  /** v140 §F — the unpinned scroll position, for the visit: read once for the list's first draw (a reload within the
   *  visit) and again when the route comes back with its scroller at the top; written as the list scrolls unpinned. */
  scrollMemory?: { read: () => number; write: (y: number) => void };
}

/** v140 §F — the arrival's values: 420ms on cubic-bezier(.2,.8,.2,1) from −10px and transparent, 24ms apart, the
 *  stagger capped at the 17th item */
export const ARRIVAL_140 = { ms: 420, easing: "cubic-bezier(.2,.8,.2,1)", from: -10, step: 24, items: 17 } as const;

export const QcList138: React.FC<QcList138Props> = ({
  groups, groupBy, onGroup, toneOf, filterCount, onClearFilters, filtersMenu, applied, band = null, loading = false, stickyOn = true, sort, onHeading, density, onDensity, full, onFull,
  selectedId, onOpen, nowMs, coming, packageOf, onAct, onEdit, onClose, onAddSent, onOpenPackage, find = "", onFind, findRef, ringId = null, folded, onFold, loadPeek, onTimeline, selected, onPick, entering = false, deadEnd = null, practice = null, arrival, scrollMemory,
}) => {
  /* §H — the order things land in: bands and rows, one sequence, the first 16 staggered and the rest with the last */
  let seq = 0;
  const nextSeq = () => Math.min(16, seq++);
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
  /* §H — as each of the first 16 rows lands, its dial sweeps (Web Animations: a var() in a keyframe fails here) */
  useEffect(() => {
    if (!entering) return;
    boxRef.current?.querySelectorAll<HTMLElement>(".qc138-row").forEach((row) => {
      const i = Number(row.style.getPropertyValue("--qi")) || 0;
      const arc = row.querySelector<SVGCircleElement>(".qc138-dial-arc");
      const to = arc?.getAttribute("stroke-dasharray");
      if (arc && to && typeof arc.animate === "function") {
        arc.animate([{ strokeDasharray: `0 ${DIAL_C.toFixed(2)}` }, { strokeDasharray: to }], { duration: 700, delay: 960 + i * 40, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" });
      }
    });
  }, [entering]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => window.clearTimeout(peekTimer.current), []);
  const boxRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  useStickyStack(topRef, stickyOn);
  const tip = useTip(boxRef);
  const rows = groups.flatMap((g) => g.rows);
  useStuckBands(boxRef, `${groups.map((g) => `${g.key}:${g.rows.length}`).join("|")}|${[...folded].join(",")}|${density}`);
  /* ── v140 §F — THE SCROLL, FOR THE VISIT (unpinned only). Read once at mount; put back on the list's first draw
     (inside the arrival's layout effect, before paint and before the arrival picks the rows on screen, so the rows that
     arrive are the ones the reader comes back to). A first draw while pinned drops it: it is the unpinned position. ── */
  const scrollPending = useRef<number | null>(scrollMemory ? scrollMemory.read() || null : null);
  const scroller = () => boxRef.current?.closest<HTMLElement>(".wpg-scroll") ?? null;
  const restoreScroll = () => {
    const y = scrollPending.current;
    scrollPending.current = null;
    const sc = scroller();
    if (y && sc && !full) sc.scrollTop = y;
  };
  /* coming back to the route: a scroller the browser reset to its top (display: none loses it) is put back */
  const wasOn = useRef(stickyOn);
  useLayoutEffect(() => {
    const back = stickyOn && !wasOn.current;
    wasOn.current = stickyOn;
    if (!back || full || !scrollMemory || scrollPending.current != null) return;
    const sc = scroller();
    const y = scrollMemory.read();
    if (sc && y && sc.scrollTop === 0) sc.scrollTop = y;
  });
  useEffect(() => {
    if (!stickyOn || full || !scrollMemory || loading) return undefined;
    const sc = scroller();
    if (!sc) return undefined;
    let raf = 0;
    const save = () => { raf = 0; scrollMemory.write(sc.scrollTop); };
    const on = () => { if (!raf) raf = requestAnimationFrame(save); };
    sc.addEventListener("scroll", on, { passive: true });
    return () => { sc.removeEventListener("scroll", on); if (raf) cancelAnimationFrame(raf); };
  }, [stickyOn, full, loading, scrollMemory]);
  /* ── v140 §F — THE ARRIVAL. The bands and rows ON SCREEN come in from the top, in list order, each from translateY(−10px)
     and opacity 0 over 420ms, 24ms apart, the stagger capped at the 17th; off screen nothing animates. A row still
     arriving from the change before keeps its animation (typing in Find would otherwise blink the list on every key).
     `fill: backwards` only, so once it ends nothing holds a style. Reduced motion: nothing moves. Web Animations, so no
     keyframe reads a custom property (and the QC138 entrance's own CSS animations are not what this is). ── */
  const arriving = useRef(new WeakMap<Element, Animation>());
  const arrivedKey = useRef<string | null>(null);
  useLayoutEffect(() => {
    /* ⚠️ only while the list is the page on screen: every page stays mounted, so the data can land while /queries is
       hidden; the key is then kept for the moment the route is opened, which is the reader's "load" */
    if (!arrival || !stickyOn || arrivedKey.current === arrival.key) return;
    arrivedKey.current = arrival.key;
    if (scrollPending.current != null && !loading && rows.length) restoreScroll();
    const root = boxRef.current?.querySelector<HTMLElement>(".qc138-body");
    if (!root || typeof root.animate !== "function" || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const sc = scroller();
    const view = sc ? sc.getBoundingClientRect() : { top: 0, bottom: window.innerHeight };
    let i = 0;
    for (const el of root.querySelectorAll<HTMLElement>('[data-qcv="row"], [data-qcv="gband"], [data-qc139="practice-band"]')) {
      const b = el.getBoundingClientRect();
      if (b.height === 0 || b.bottom <= view.top) continue;
      if (b.top >= view.bottom) break;
      const delay = (arrival.delayMs ?? 0) + Math.min(i, ARRIVAL_140.items - 1) * ARRIVAL_140.step;
      i += 1;
      const was = arriving.current.get(el);
      if (was && was.playState === "running") continue;
      el.setAttribute("data-qc140-arrive", "");
      const a = el.animate([{ opacity: 0, transform: `translateY(${ARRIVAL_140.from}px)` }, { opacity: 1, transform: "none" }],
        { duration: ARRIVAL_140.ms, delay, easing: ARRIVAL_140.easing, fill: "backwards" });
      a.onfinish = a.oncancel = () => el.removeAttribute("data-qc140-arrive");
      arriving.current.set(el, a);
    }
  });
  /* v140 §A — the jump row: a button per group (its band's mark, its label, its count), or, ungrouped, one per month of
     the sort column's date, in list order */
  const jumps: Qc140Jump[] = groupBy === "none"
    ? monthJumps(rows, jumpColumn(sort.key), nowMs).map((m) => ({ key: m.key, label: m.label, full: m.label, n: m.n, mark: null, to: { kind: "row", id: m.firstId } }))
    : groups.map((g) => {
        const tone = toneOf(g);
        const full = g.label || "All queries";
        return { key: g.key, label: jumpLabel(groupBy, g.key, full), full, n: g.rows.length, mark: <JumpMark art={bandArtOf(groupBy, g.key)} tone={tone} />, to: { kind: "group", key: g.key } };
      });

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
    const picked = !!selected?.has(r.id);
    /* v138.2 §A — while its peek is open the whole row takes the tone's tint; before (the 450ms wait) it is Lift's white */
    const peekOpen = peekId === r.id;
    return (
      <div key={r.id} id={`query-row-${r.id}`} className={`qc138-row${closed ? " qc138-row--closed" : ""}${ringId === r.id ? " kf" : ""}${picked ? " picked" : ""}`} data-picked={picked ? "" : undefined} data-ring={ringId === r.id || undefined} data-peek={peekOpen ? peekTone(due, nowMs, closed) : undefined}
        data-qcv="row" data-id={r.id} data-qid={r.id} data-court={tileCourt(r.status) ?? "closed"} data-last={r.lastMs} data-status={r.status} data-you={r.withYou ? "true" : "false"} data-move={yours ? "true" : "false"}
        data-due={due ?? undefined} data-first={r.sentMs ?? undefined} data-from={r.stageStartMs ?? r.lastMs} data-name={r.agentName}
        role="option" aria-selected={on} tabIndex={on || (!selectedId && r === rows[0]) ? 0 : -1}
        onClick={() => onOpen(r.id)}
        onMouseEnter={(e) => enter(r.id, e.currentTarget)} onMouseLeave={leave}
        style={{ ["--qi" as string]: nextSeq() }}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === "Enter") { e.preventDefault(); onOpen(r.id); }
          /* §G — Space or x ticks the focused row */
          else if (e.key === " " || e.key === "x" || e.key === "X") { e.preventDefault(); onPick?.(r.id); }
        }}>
        <div className="qc138-ag" data-qcv="row-agent">
          {/* §G — the circle is the row's select box: clicking it ticks the row without opening it */}
          <button type="button" className="qc138-pick" data-qcv="row-pick" aria-pressed={picked} aria-label={`${picked ? "Unselect" : "Select"} the query to ${r.agentName}`}
            onClick={(e) => { e.stopPropagation(); onPick?.(r.id); }} onKeyDown={(e) => e.stopPropagation()}>
            <AgentDisc initials={r.initials} standing={closed ? "closed" : "querying"} size={density === "compact" ? 26 : 40} selected={picked} className="qc138-disc" attrs={{ "data-qcv": "row-chip" }} />
            {picked ? null : <span className="qc138-pickbox" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M3.5 8.5 6.5 11.5 12.5 4.5" /></svg></span>}
          </button>
          <span className="qc138-agt">
            <b data-qcv="row-name" title={r.agentName}>{hl(r.agentName)}</b>
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
        <div className="qc138-peekw" data-open={peekOpen ? "" : undefined}>
          <div className="qc138-peeki">
            {peekOpen ? (
              <PeekDrawer summary={<PeekSum href={`/queries?q=${encodeURIComponent(r.id)}`} onTimeline={onTimeline ? () => onTimeline(r.id) : undefined}
                s={peekSummary({ sent: r.sentMs, due: closed ? null : due, closedAt: closed ? r.stageStartMs ?? r.lastMs : null, closed, yours, now: nowMs })} />}>
                <Peek events={peekCache.current.get(r.id) ?? null} due={closed ? null : due} nowMs={nowMs} closed={closed} yours={yours} />
              </PeekDrawer>
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="qc138-sheet" data-qc138="sheet" data-density={density} ref={boxRef} {...tip.handlers}>
      {/* v138.6 §B — THE STICKY ROW, in a wrapper that sticks under the sheet's lip and fills the lip's 12px with the
          sheet's colour. v140 §A — what sticks is the toolbar (QcToolbar140), and under it the applied-filters row while
          anything narrows the list: `useStickyStack` measures the two together, so the headings and the current group
          band stick under both. */}
      <div className="qc138-topw" data-qc138="top-wrap">
        <div className="qc140-stk" data-qc140="stack" data-pinned={full ? "" : undefined} ref={topRef}>
          {/* v140 §C — pinned, the navy band sits above the toolbar inside the sticky stack, so the headings and the
              current group band stick under both */}
          {full ? band : null}
          <QcToolbar140 rootRef={boxRef} pinned={full} loading={loading} groupBy={groupBy} onGroup={onGroup} density={density} onDensity={onDensity}
            jumpColumn={groupBy === "none" ? JUMP_COLUMN_LABEL[jumpColumn(sort.key)] : null} jumps={jumps}
            find={find} onFind={onFind} findRef={findRef} filterCount={filterCount} onClearFilters={onClearFilters ?? (() => {})}
            filtersMenu={filtersMenu ?? (() => null)} onPin={onFull} />
          {applied}
        </div>
      </div>
      <div className="qc138-heads lth" data-qc138="headings" role="row">
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
      {/* a dev-only review aid: `window.__SA_QC138_PEEK_LAB` forces peek cases (the F2 edge-case sheet); production
          builds drop the branch, since MODE is replaced at build time */}
      {import.meta.env.MODE !== "production" ? <PeekLab nowMs={nowMs} /> : null}
      <div className="qc138-body" data-qcv="list">
        {/* v139 §B — the practice band: first, always; never counted (the title, the bands' counts and the glyphs read
            the page's own rows, and Pip is not one of them) */}
        {practice ? (
          <div className={`qc138-grp qc139-practice${practice.leaving ? " out" : ""}`} data-qc139="practice" data-group="practice">
            <div className="qc138-band qc139-pband" data-qc139="practice-band">
              <span className="qc138-gart" aria-hidden="true" />
              <b className="qc138-gt">Practice</b>
              <span className="qc139-stamp" data-qc139="stamp">PRACTICE</span>
              <span className="qc138-gh">Only on this screen · not saved to your account</span>
            </div>
            <div role="listbox" aria-label="Practice: 1 query" className="qc138-rows">
              {renderRow(practice.row)}
            </div>
          </div>
        ) : null}
        {groups.length === 0 && deadEnd ? deadEnd : null}
        {/* v140 §D — No grouping is ONE list in the order the headings sort it: no bands */}
        {groupBy === "none" && rows.length ? (
          <div className="qc138-grp qc140-flat" data-qcv="grp" data-group="all">
            <div role="listbox" aria-label={`All queries: ${rows.length} ${rows.length === 1 ? "query" : "queries"}`} className="qc138-rows">
              {rows.map(renderRow)}
            </div>
          </div>
        ) : null}
        {groupBy === "none" ? null : groups.map((g) => {
          const tone = toneOf(g);
          const shut = folded.has(g.key);
          const label = g.label || "All queries";
          return (
            <div key={g.key} className={`qc138-grp${shut ? " shut" : ""}`} data-qcv="grp" data-group={g.key}>
              <button type="button" className={`qc138-band qc138-band--${tone}`} data-qcv="gband" data-group={g.key} data-tone={tone} style={{ ["--qi" as string]: nextSeq() }}
                aria-expanded={!shut} onClick={() => onFold(g.key)}>
                {/* v139 §C — under Status, Next action and Package the band draws its own mark in the art slot, and never
                    the default grouping's talon or hourglass (which used to appear on every non-urgency band) */}
                {(() => {
                  const art = bandArtOf(groupBy, g.key);
                  if (art) return <BandMark art={art} />;
                  return (
                    <>
                      <span className="qc138-gart" aria-hidden="true">{TONE_ICON[tone]}</span>
                      {TONE_ART[tone] ? (
                        <img className={`qc138-gimg qc138-gimg--${tone}`} data-qcv="gband-art" src={TONE_ART[tone]!.src} width={TONE_ART[tone]!.w} height={TONE_ART[tone]!.h} alt="" aria-hidden="true" draggable={false} />
                      ) : null}
                    </>
                  );
                })()}
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

/**
 * v138 §G — THE BULK BAR: with any rows ticked, an ink bar rises at the bottom centre of the page sheet, 22px up:
 * "{n} selected" · Nudge · Record a response · Close · ✕. Each action runs the existing journey for each ticked
 * query in turn, through the panel. Portalled into the sheet (`.ws-window`), so it centres on the sheet.
 */
export const BulkBar138: React.FC<{
  anchor: React.RefObject<HTMLElement | null>;
  on: boolean;
  count: number;
  onNudge: () => void;
  onRecord: () => void;
  onClose: () => void;
  onClear: () => void;
}> = ({ anchor, on, count, onNudge, onRecord, onClose, onClear }) => {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => { setHost(on ? anchor.current?.closest<HTMLElement>(".ws-window") ?? null : null); }, [anchor, on]);
  if (!on || !host || count === 0) return null;
  return createPortal(
    <div className="qc138-bulk" role="toolbar" aria-label="Selected queries" data-qc138="bulk">
      <span className="qc138-bulk-n" data-qc138="bulk-count" role="status">{count} selected</span>
      <button type="button" className="qc138-bulk-p" data-qc138="bulk-nudge" onClick={onNudge}>Nudge</button>
      <button type="button" data-qc138="bulk-record" onClick={onRecord}>Record a response</button>
      <button type="button" data-qc138="bulk-close" onClick={onClose}>Close</button>
      <button type="button" className="qc138-bulk-x" data-qc138="bulk-clear" aria-label="Clear the selection" onClick={onClear}>
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg>
      </button>
    </div>,
    host,
  );
};
