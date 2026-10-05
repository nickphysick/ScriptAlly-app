/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QcTimeline — the Birds-eye drawer's body (Query Centre v126.2; ref design-refs/query-centre-v130.html):
 * the date row, the rows, the bars, today and the crosshair.
 *
 * ⚠️ THE ROWS ARE THREE COLUMNS — names · track · action — AND NOTHING RUNS UNDER THE ACTION. The
 * action column is a sibling of the track, never an overlay on it, so a bar or a sentence cannot be
 * painted beneath the pill that acts on it.
 *
 * ⚠️ THE TRACK IS WINDOWED, NOT SCROLLED (v126.2). It was a native horizontal scroller with a
 * sticky names column: every bar, month and label existed at its full content x and the scroller
 * clipped what fell outside — so a clipped element still REPORTED the box it would have had, and a
 * label could sit thousands of pixels right of the drawer while looking fine. Now the view holds one
 * number, `off` (the content x at the track's visible left edge), and every element is computed
 * straight into visible coordinates: what is off-screen is not drawn, and what is partly on screen
 * is drawn already cut to the track. Nothing can be outside the track because nothing is placed there.
 *
 * ⚠️ THE EDGE MARKERS ("‹ 16 due earlier") ARE RETIRED IN THE DRAWER (v126.2). In a 52px date row
 * beside a 220px corner they sat on top of the month and week labels, and v130 draws none; the
 * time control's ‹ › and the T key are the ways along.
 *
 * ⚠️ AND TODAY IS STILL ONE DERIVATION. The today line, the TODAY pill, an overdue bar's end and its
 * days-over label all come from `xAt(…) − off` against the same extent and scale, so they meet on
 * the same pixel at every zoom.
 */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { TAB_KEY } from "../QueryPanel";
import { whenOf, type BvdGroupOut } from "../../../lib/qcBirdsDrawer";
import type { QcRow } from "../../../lib/qcSummary";
import {
  NUDGE_WEEKS, PXD_DEFAULT, TODAY_AT, ZOOM_PRESETS, activePreset, clampPxd, crosshairAt, extentOf,
  monthBands, pxdForPreset, tlRow, trackWidth, weekTicks, xAt, zoomAbout,
  type Crosshair, type TlRow,
} from "../../../lib/qcTimeline";
import "./qcvTimeline.css";

const DAY = 86_400_000;
/** v126.2 — the names column and the date row's corner are one width. */
export const NAMES_W = 220;
/** v126.2 — the action column: one pill per row, right-aligned, clear of the track. */
export const ACT_W = 164;
/** the body's own inset, each side — the date row and the rows share it */
export const BODY_PAD = 18;

const startOfDay = (ms: number): number => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };

/**
 * ⚠️ A SENTENCE IS PLACED BY ITS MEASURED WIDTH, NEVER CUT. Whether it fits inside its bar, after it,
 * or not at all is decided before it is drawn — so nothing is ever ellipsised mid-sentence. The
 * families are read from the `:root` tokens the stylesheet uses, so the measure and the paint are
 * the same face; a canvas measures a face that has not loaded in its fallback, which is why the
 * component re-renders when the fonts land.
 */
const measureCache = new Map<string, number>();
let canvasCtx: CanvasRenderingContext2D | null = null;
function textW(text: string, size: number, weight: number, token: "--sp-type" | "--sp-mono", tracking = 0): number {
  const key = `${token}|${weight}|${size}|${tracking}|${text}`;
  const hit = measureCache.get(key);
  if (hit != null) return hit;
  if (typeof document === "undefined") return text.length * size * 0.6;
  if (!canvasCtx) canvasCtx = document.createElement("canvas").getContext("2d");
  const fam = getComputedStyle(document.documentElement).getPropertyValue(token).trim() || "monospace";
  let w = text.length * size * 0.6;
  if (canvasCtx) { canvasCtx.font = `${weight} ${size}px ${fam}`; w = canvasCtx.measureText(text).width; }
  w += tracking * size * text.length;
  measureCache.set(key, w);
  return w;
}
const sentenceW = (s: string): number => textW(s, 11.5, 400, "--sp-type");
const markW = (s: string): number => textW(s, 8.5, 700, "--sp-mono", 0.06);

export const QcTimeline: React.FC<{
  rows: readonly QcRow[];
  /** the groups, decided by the drawer's own model (`bvdGroups`): filtered, grouped and sorted */
  groups: readonly BvdGroupOut[];
  /** whether bands are drawn — false for "No grouping" */
  banded: boolean;
  nowMs: number;
  focusId?: string | null;
  onOpen: (id: string) => void;
  /** each row's one next move — the pill's words; the page resolves the journey it opens */
  moves: ReadonlyMap<string, { label: string }>;
  /** a row's action pill — through the one action drawer */
  onAct: (id: string) => void;
  /** ← → and T are live only while nothing sits above the drawer (a card, the action drawer) */
  keysActive?: boolean;
  /** "3 of 6" while filtered */
  filtered?: boolean;
}> = ({ rows, groups, banded, nowMs, focusId = null, onOpen, moves, onAct, keysActive = true, filtered = false }) => {
  const openTracking = useCallback((id: string) => {
    try { sessionStorage.setItem(TAB_KEY, "tracking"); } catch { /* the card's default is fine */ }
    onOpen(id);
  }, [onOpen]);
  const boxRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const tierRef = useRef<HTMLDivElement>(null);
  /** the visible track's width — the rows' scroller less its inset, the names and the action column */
  const [trackW, setTrackW] = useState(0);
  /** the rows' scroller's own scrollbar, so the date row stops where the rows' tracks stop */
  const [gutter, setGutter] = useState(0);
  const [pxd, setPxd] = useState(PXD_DEFAULT);
  const [off, setOff] = useState(0);
  const [cross, setCross] = useState<Crosshair | null>(null);
  const [, setFontsTick] = useState(0);

  const ext = useMemo(() => extentOf(rows, nowMs), [rows, nowMs]);
  const tl = useMemo(() => {
    const out = new Map<string, TlRow>();
    for (const g of groups) for (const r of g.rows) out.set(r.id, tlRow(r.row, nowMs));
    return out;
  }, [groups, nowMs]);
  const today = startOfDay(nowMs);
  const width = trackWidth(ext, pxd);
  const W = trackW;
  /** where today lands when the view is "on today" */
  const todayOff = xAt(ext, pxd, today) - W * TODAY_AT;
  /**
   * ⚠️ THE OFFSET MAY RUN PAST THE EXTENT WHEN TODAY NEEDS IT TO. An account whose first query is a
   * fortnight old has less history than 40% of a 6M track; clamping to the extent would leave today
   * somewhere else and the T key unable to put it back.
   */
  const clampOff = useCallback((o: number, p = pxd, w = W) => {
    const tOff = xAt(ext, p, today) - w * TODAY_AT;
    const lo = Math.min(0, tOff);
    const hi = Math.max(trackWidth(ext, p) - w, tOff);
    return Math.min(hi, Math.max(lo, o));
  }, [ext, pxd, W, today]);

  const vx = (ms: number) => xAt(ext, pxd, ms) - off;
  const tx = vx(today);
  const months = useMemo(() => monthBands(ext, pxd), [ext, pxd]);
  const weeks = useMemo(() => weekTicks(ext, pxd), [ext, pxd]);

  /**
   * The track's own width, measured off the rows' scroller. ⚠️ A width wider than the window is not
   * a width — it is a read taken before the drawer has laid out — and is refused rather than placed.
   */
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    const read = () => {
      const w = el.clientWidth;
      if (w <= 0 || w > window.innerWidth) return;
      setTrackW(Math.max(0, w - 2 * BODY_PAD - NAMES_W - ACT_W));
      setGutter(Math.max(0, el.offsetWidth - el.clientWidth));
    };
    read();
    if (typeof document !== "undefined" && document.fonts) {
      void document.fonts.ready.then(() => { measureCache.clear(); setFontsTick((n) => n + 1); read(); });
    }
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /**
   * ⚠️ ON OPEN, TODAY SITS AT 40% — and again whenever the extent, the zoom or the width changes,
   * UNTIL the reader moves the view. After that it is theirs (`touched`). The guard waits for rows:
   * an empty account's extent is three weeks wide, and a placement made against it is right for
   * nothing once fifty queries arrive.
   */
  const latest = useRef({ ext, pxd, W, nowMs, focusId, tl, clampOff });
  latest.current = { ext, pxd, W, nowMs, focusId, tl, clampOff };
  const placedFor = useRef<string | null>(null);
  const touched = useRef(false);
  useLayoutEffect(() => {
    if (touched.current || W <= 0 || rows.length === 0) return;
    const key = `${ext.fromMs}:${ext.toMs}:${pxd}:${W}`;
    if (placedFor.current === key) return;
    const L = latest.current;
    const focus = L.focusId ? L.tl.get(L.focusId) : null;
    const at = focus?.row.expectedMs ?? focus?.row.stageStartMs ?? null;
    const want = at != null ? xAt(L.ext, L.pxd, at) - L.W / 2 : xAt(L.ext, L.pxd, startOfDay(L.nowMs)) - L.W * TODAY_AT;
    setOff(L.clampOff(want));
    placedFor.current = key;
  }, [W, pxd, rows.length, ext.fromMs, ext.toMs]);

  /* once the drawer has slid in, the width is re-read and the placement re-run (unless touched) */
  useEffect(() => {
    const el = scrollRef.current;
    const card = el?.closest("[data-qcv='bvd']");
    if (!el || !card) return undefined;
    const settle = (e: Event) => {
      if ((e as TransitionEvent).propertyName !== "transform" || e.target !== card) return;
      placedFor.current = null;
      setTrackW(Math.max(0, el.clientWidth - 2 * BODY_PAD - NAMES_W - ACT_W));
    };
    card.addEventListener("transitionend", settle);
    return () => card.removeEventListener("transitionend", settle);
  }, []);

  const mine = useCallback(() => { touched.current = true; }, []);
  const panBy = useCallback((px: number) => { mine(); setOff((o) => clampOff(o + px)); }, [mine, clampOff]);
  const pan = useCallback((weeksBy: number) => panBy(weeksBy * 7 * pxd), [panBy, pxd]);
  const toToday = useCallback(() => { if (W <= 0) return; mine(); setOff(clampOff(todayOff)); }, [W, mine, clampOff, todayOff]);
  const away = W > 0 && Math.abs(off - clampOff(todayOff)) > 2;

  /**
   * ⚠️ A PRESET ZOOMS ABOUT TODAY WHILE TODAY IS ON SCREEN, so the reader who opened on today is
   * still on today at 6W and 6M (40% at every preset); a reader who has dragged elsewhere zooms
   * about the middle of what they are looking at.
   */
  const zoomTo = useCallback((nextPxd: number, at: number) => {
    const z = zoomAbout(ext, pxd, nextPxd, off, at);
    setPxd(z.pxd);
    setOff(clampOff(z.scrollLeft, z.pxd));
  }, [ext, pxd, off, clampOff]);
  const toPreset = useCallback((key: string) => {
    const p = ZOOM_PRESETS.find((z) => z.key === key);
    if (!p || W <= 0) return;
    mine();
    const onToday = !away;
    const at = onToday ? W * TODAY_AT : tx >= 0 && tx <= W ? tx : W / 2;
    zoomTo(pxdForPreset(p), at);
  }, [W, mine, away, tx, zoomTo]);

  /**
   * ctrl/⌘-wheel and a trackpad pinch zoom about the pointer; a sideways wheel pans; a plain
   * vertical wheel scrolls the rows, as it should. Bound natively because a passive React listener
   * cannot cancel the page zoom.
   */
  const wheelRef = useRef({ zoomTo, panBy, pxd, mine });
  wheelRef.current = { zoomTo, panBy, pxd, mine };
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return undefined;
    const on = (e: WheelEvent) => {
      const tier = tierRef.current;
      if (!tier) return;
      const k = wheelRef.current;
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        k.mine();
        k.zoomTo(clampPxd(k.pxd * Math.exp(-e.deltaY * 0.008)), e.clientX - tier.getBoundingClientRect().left);
        return;
      }
      const dx = e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX;
      if (Math.abs(dx) > Math.abs(e.deltaY) || (e.shiftKey && dx)) { e.preventDefault(); k.panBy(dx); }
    };
    el.addEventListener("wheel", on, { passive: false });
    return () => el.removeEventListener("wheel", on);
  }, []);

  /**
   * DRAGGING THE DATES (or any track) pans the view 1:1. ⚠️ The press refuses to start on anything
   * interactive — a bar, a pill, a control, the names — so those still behave as clicks; and a press
   * that moves under 3px is a click, not a drag.
   */
  const drag = useRef<{ id: number; x: number; off: number; moved: boolean } | null>(null);
  const [dragging, setDragging] = useState(false);
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const t = e.target as HTMLElement;
    if (!t.closest("[data-qcv='bvd-dates'], [data-qcv='tl-track']")) return;
    if (t.closest("button, a, input, [role='button']")) return;
    drag.current = { id: e.pointerId, x: e.clientX, off, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    document.body.style.userSelect = "none";
    e.preventDefault();
  }, [off]);
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = drag.current;
    if (d && e.pointerId === d.id) {
      const dx = e.clientX - d.x;
      if (!d.moved) {
        if (Math.abs(dx) < 3) return;
        d.moved = true;
        setDragging(true);
        setCross(null);
        mine();
      }
      setOff(clampOff(d.off - dx));
      return;
    }
    /* the crosshair, snapped to the day, only over the track itself */
    const tier = tierRef.current;
    if (!tier) return;
    const t = e.target as HTMLElement;
    if (!t.closest("[data-qcv='bvd-dates'], [data-qcv='tl-track']") || t.closest("[data-qcv='bvd-pop']")) { setCross(null); return; }
    const px = e.clientX - tier.getBoundingClientRect().left;
    if (px < 0 || px > W) { setCross(null); return; }
    setCross(crosshairAt(ext, pxd, off + px, nowMs));
  }, [mine, clampOff, ext, pxd, off, nowMs, W]);
  const endDrag = useCallback((e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    drag.current = null;
    setDragging(false);
    document.body.style.userSelect = "";
    const el = e.currentTarget as HTMLElement;
    if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
  }, []);

  /* the time control: 6W 3M 6M, then ‹ ⌖ › — earlier, today, later */
  const timeControls = (
    <div className="bvd-time" data-qcv="bvd-time" role="group" aria-label="Time">
      {ZOOM_PRESETS.map((p) => (
        <button key={p.key} type="button" className="bvd-z" data-z={p.key} aria-pressed={activePreset(pxd) === p.key} onClick={() => toPreset(p.key)}>{p.label.toUpperCase()}</button>
      ))}
      <i className="bvd-sep" data-qcv="bvd-sep" aria-hidden="true" />
      <button type="button" className="bvd-nav" data-qcv="bvd-earlier" onClick={() => pan(-NUDGE_WEEKS)} aria-label="Four weeks earlier">‹</button>
      <button type="button" className={`bvd-nav bvd-today${away ? " is-away" : ""}`} data-qcv="bvd-today" onClick={toToday}
        aria-label="Back to today" title="Back to today">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="6" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
        </svg>
      </button>
      <button type="button" className="bvd-nav" data-qcv="bvd-later" onClick={() => pan(NUDGE_WEEKS)} aria-label="Four weeks later">›</button>
    </div>
  );

  /* ← → scroll a week and T returns to today — never in a field, never with something above the drawer */
  const keysRef = useRef({ keysActive, pan, toToday });
  keysRef.current = { keysActive, pan, toToday };
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const k = keysRef.current;
      if (!k.keysActive || e.defaultPrevented || e.altKey || e.metaKey || e.ctrlKey) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, select, [contenteditable='true'], [role='menu'], [data-qcv='bvd-pop']")) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); k.pan(-1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); k.pan(1); }
      else if (e.key === "t" || e.key === "T") { e.preventDefault(); k.toToday(); }
    };
    document.addEventListener("keydown", on);
    return () => document.removeEventListener("keydown", on);
  }, []);

  /**
   * One row's track: its bars cut to the window, each bar's sentence placed where it fits whole,
   * and the end label. Everything is in visible track coordinates, 0 … W.
   */
  const track = (r: TlRow) => {
    const out: React.ReactNode[] = [];
    const due = r.row.expectedMs;
    for (const b of r.bars) {
      const L = vx(b.fromMs), R = vx(b.toMs);
      if (R <= 0 || L >= W) continue;
      const l = Math.max(0, L), rr = Math.min(W, R);
      const w = Math.max(2, rr - l);
      const cutL = L < 0, cutR = R > W;
      const overdue = b.current && due != null && due < today;
      const dueAt = overdue ? vx(due!) - l : null;
      const split = b.current && b.aheadFromMs != null ? Math.min(w, Math.max(0, vx(b.aheadFromMs) - l)) : null;
      const torn = b.torn === "start" && cutL ? null : b.torn === "end" && cutR ? null : b.torn;
      out.push(
        <button
          key={b.key}
          type="button"
          className={`qcv-tl-bar bvd-bar${b.current ? " qcv-tl-bar--now" : " qcv-tl-bar--past"}${overdue ? " bvd-bar--over" : ""}${torn ? ` qcv-tl-bar--torn-${torn}` : ""}${cutL ? " bvd-bar--cutl" : ""}${cutR ? " bvd-bar--cutr" : ""}`}
          data-qcv={b.current ? "bvd-bar" : "bvd-prev"}
          data-status={b.status}
          data-current={b.current ? "true" : "false"}
          style={{ left: l, width: w, ["--qcv-state" as string]: `var(--state-${r.row.state})` }}
          title={b.title}
          /* a torn bar opens the card on Tracking, where its missing date is recorded */
          onClick={() => (b.torn ? openTracking(r.id) : onOpen(r.id))}
        >
          <u className={`bvd-part bvd-part--solid${split != null && split < w ? " bvd-part--l" : ""}`} data-part="solid" style={split != null ? { left: 0, width: split } : { left: 0, right: 0 }} />
          {split != null && split < w && <u className="bvd-part bvd-part--after bvd-part--r" data-part="after" style={{ left: split, right: 0 }} />}
          {dueAt != null && dueAt >= 0 && dueAt <= w && <i className="bvd-duetick" data-qcv="bvd-duetick" style={{ left: dueAt }} aria-hidden="true" />}
          {overdue && !cutR && <i className="bvd-beacon" data-qcv="bvd-beacon" aria-hidden="true" />}
        </button>,
      );

      /* ⚠️ THE SENTENCE IS WHOLE OR ABSENT. Inside the bar if it fits; else, for the current stage,
         just after the bar's end (overdue: after its days-over label) if that is inside the track;
         else omitted — its full text is always on the bar's title. */
      const text = b.current ? b.words : b.label;
      if (!text) continue;
      const tw = sentenceW(text);
      let at: number | null = null;
      let outside = false;
      if (tw + 20 <= w) at = l + 10;
      else if (b.current) {
        let ox = rr + 8;
        if (overdue) { const lab = overLabel(due!); ox = Math.max(0, tx) + 8 + markW(lab) + 10; }
        if (ox >= 0 && ox + tw <= W) { at = ox; outside = true; }
      }
      if (at != null) {
        out.push(<span key={`${b.key}:w`} className={`bvd-words${outside ? " bvd-words--out" : ""}${b.current ? "" : " bvd-words--past"}`} data-qcv="tl-words" data-place={outside ? "after" : "inside"} style={{ left: at }}>{text}</span>);
      }
      /* the end labels, on the current stage only */
      if (b.current && due != null) {
        if (overdue) {
          const lab = overLabel(due);
          const lw = markW(lab);
          const x = tx + 8;
          if (x >= 0 && x + lw <= W) out.push(<b key={`${b.key}:o`} className="bvd-over" data-qcv="bvd-over" style={{ left: x }}>{lab}</b>);
        } else if (!outside) {
          const days = Math.round((startOfDay(due) - today) / DAY);
          const lab = days <= 0 ? "TODAY" : `IN ${days}D`;
          const lw = markW(lab);
          const x = Math.min(rr + 8, W - lw);
          if (x >= 0) out.push(<b key={`${b.key}:i`} className="bvd-in" data-qcv="bvd-in" style={{ left: x }}>{lab}</b>);
        }
      }
    }
    return out;
  };
  function overLabel(due: number): string {
    const n = Math.max(1, Math.round((today - startOfDay(due)) / DAY));
    return `${n} ${n === 1 ? "DAY" : "DAYS"} OVER`;
  }

  /* the date row's labels, each drawn only where it fits whole inside the track */
  const monthEls = months.map((m) => {
    const L = m.x - off, R = m.x + m.width - off;
    if (R <= 0 || L >= W) return null;
    const l = Math.max(0, L), rr = Math.min(W, R);
    const need = textW(m.month, 13, 400, "--sp-type") + 3 + textW(m.year, 8, 400, "--sp-mono", 0.1) + 16;
    return (
      <span key={m.ms} className={`qcv-tl-mb${m.alt ? " qcv-tl-mb--alt" : ""}`} data-qcv="tl-month" style={{ left: l, width: rr - l }}>
        {rr - l >= need && <b data-qcv="tl-monthlabel">{m.month}<u>{m.year}</u></b>}
      </span>
    );
  });
  const pillHalf = 24;

  return (
    <div
      className={`qcv-tl bvd-tl${dragging ? " qcv-tl-scroll--drag" : ""}`}
      ref={boxRef}
      data-qcv="tl"
      data-dragging={dragging ? "true" : "false"}
      data-off={Math.round(off)}
      style={{ ["--qcv-tl-names" as string]: `${NAMES_W}px`, ["--bvd-ac" as string]: `${ACT_W}px` }}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}
      onMouseLeave={() => setCross(null)}
    >
      {/* the date row: the corner over the names (the time control at its left), the dates over the
          tracks, and an empty cell over the action column — the dates stop where the action begins */}
      <div className="qcv-tl-daterow" data-qcv="tl-daterow" style={{ paddingRight: BODY_PAD + gutter }}>
        <div className="qcv-tl-corner" data-qcv="tl-corner">{timeControls}</div>
        <div className="qcv-tl-tier" data-qcv="bvd-dates" ref={tierRef}>
          {monthEls}
          {weeks.map((wk) => {
            const x = wk.x - off;
            return x > 12 && x < W - 12 ? <span key={wk.ms} className="qcv-tl-wk" data-qcv="bvd-date" style={{ left: x }}>{wk.label}</span> : null;
          })}
          {tx >= pillHalf && tx <= W - pillHalf && <span className="qcv-tl-todaypill" data-qcv="tl-todaypill" style={{ left: tx }}>Today</span>}
          {cross && <i className="qcv-tl-cross qcv-tl-cross--tier" data-qcv="tl-cross-tier" style={{ left: cross.x - off }} aria-hidden="true" />}
          {cross && (() => {
            const lw = textW(cross.label, 8, 400, "--sp-mono", 0.1) + 16;
            const at = Math.min(W - lw / 2, Math.max(lw / 2, cross.x - off));
            return <span className={`qcv-tl-tag${cross.today ? " qcv-tl-tag--today" : ""}`} data-qcv="tl-tag" style={{ left: at }}>{cross.label}</span>;
          })()}
        </div>
        <div className="bvd-daterow-ac" aria-hidden="true" />
      </div>

      <div className="qcv-tl-scroll" ref={scrollRef} data-qcv="tl-scroll">
        <div className="qcv-tl-rows" data-qcv="tl-rows">
          {tx >= 0 && tx <= W && <i className="qcv-tl-todayline" data-qcv="bvd-todayline" style={{ left: NAMES_W + tx }} aria-hidden="true" />}
          {cross && <i className="qcv-tl-cross" data-qcv="tl-cross" style={{ left: NAMES_W + cross.x - off }} aria-hidden="true" />}
          {groups.length === 0 ? (
            <p className="qcv-tl-none" data-qcv="bvd-none">Nothing matches these filters</p>
          ) : groups.map((g) => (
            <section key={g.key} className="qcv-tl-group" data-qcv={banded ? "bvd-group" : "bvd-list"} data-group={g.key}>
              {banded && (
                <div className="qcv-tl-band" data-qcv="tl-band">
                  <span>
                    {g.dot && <i className="bvd-gdot" style={{ background: `var(--state-${g.dot})` }} aria-hidden="true" />}
                    <b data-qcv="bvd-glabel">{g.label}</b>
                    <i>{filtered && g.shown !== g.of ? `${g.shown} of ${g.of}` : g.shown}</i>
                  </span>
                </div>
              )}
              {g.rows.map((r) => {
                const t = tl.get(r.id)!;
                const move = moves.get(r.id) ?? null;
                const late = r.row.expectedMs != null && r.row.expectedMs < today;
                return (
                  <div
                    key={r.id}
                    className={`qcv-tl-row${r.group === "watch" ? " qcv-tl-row--watch" : ""}${focusId === r.id ? " qcv-tl-row--focus" : ""}${late ? " qcv-tl-row--late" : ""}`}
                    data-qcv="bvd-row"
                    data-att={whenOf(r.row, nowMs)}
                    data-id={r.id}
                    data-qid={r.id}
                  >
                    <div
                      className="qcv-tl-names"
                      data-qcv="tl-names"
                      role="button"
                      tabIndex={0}
                      onClick={() => onOpen(r.id)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(r.id); } }}
                    >
                      <i className="qcv-tl-ini" aria-hidden="true">{r.row.initials}</i>
                      <span className="qcv-tl-who">
                        <b className="qcv-tl-nm" data-qcv="tl-name" title={r.row.agentName}>{r.row.agentName}</b>
                        <small className="qcv-tl-ag" data-qcv="tl-agency">{r.row.agency}</small>
                      </span>
                    </div>
                    <div className="qcv-tl-track" data-qcv="tl-track">{track(t)}</div>
                    <div className="bvd-actcell" data-qcv="bvd-actcell">
                      {move && (
                        <button type="button" className="bvd-act" data-qcv="bvd-act"
                          aria-label={`${move.label}: ${r.row.agentName}`}
                          onClick={(e) => { e.stopPropagation(); onAct(r.id); }}>{move.label}</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};
