/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QcTimeline — the expanded Birds-eye view's body (v65 §8.4–§8.9): the date row, the rows, the
 * bars, the today line, the crosshair and the edge markers.
 *
 * ⚠️ THE LANE'S CONTROLS ARE OVERLAYS, LIFTED OUT OF THE SCROLLING AXIS (§8.4, §8.10). They are
 * siblings of the scroller, positioned over it — not children of the thing that scrolls and not
 * children of the thing that re-renders when the rows rebuild. In the mockup they were inside the
 * axis and a re-render lost them; the fix is structural rather than a re-attach, because a control
 * that has to be put back is a control that will one day not be.
 *
 * ⚠️ AND THE TODAY LINE IS PLACED FROM THE ROWS' OWN TRACK, never from padding arithmetic. It, the
 * TODAY pill's centre and an overdue bar's end all come from `xAt` against the same extent and the
 * same scale — so they meet on the same pixel at every zoom because they are one derivation, not
 * three numbers that agree today.
 */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { StatusDot } from "../../StatusDot";
import { dueCell } from "../../../lib/qcBirdsEye";
import { groupRows, type CalView } from "../../../lib/qcCalView";
import type { QcRow } from "../../../lib/qcSummary";
import {
  NUDGE_WEEKS, PXD_DEFAULT, ZOOM_PRESETS, activePreset, clampPxd, crosshairAt, edgeCounts, extentOf,
  monthBands, msAt, pxdForPreset, scrollForToday, tlRow, trackWidth, weekTicks, xAt, zoomAbout,
  type Crosshair, type TlRow,
} from "../../../lib/qcTimeline";
import "./qcvTimeline.css";

const DAY = 86_400_000;
/** §8.6 — the names column, and §8.1's Courier column above it are the same width. */
/* §6 — 300 since v65.2 (it was 260): the names cell now carries the due date and its distance at
   its right, which is 44px of type the old width had nowhere to put. */
export const NAMES_W = 330;

export const QcTimeline: React.FC<{
  rows: readonly QcRow[];
  /** §8.3 — which rows, in which groups, in what order. */
  view: CalView;
  /** §8.3 — a package's name for the package grouping; absent means every row is "No package". */
  packageName?: (id: string) => string | null;
  nowMs: number;
  /** The query a rail row arrived from: ringed, and scrolled to the middle. */
  focusId?: string | null;
  /** §8.11 — a row or a bar opens the query, centred and in focus. */
  onOpen: (id: string) => void;
  /** §8.7 — the dotted chip opens the app's nudge flow for that query. */
  /** §6 — Filter, Sort and ↺, rendered into the date row's top lane. */
  leftControls?: React.ReactNode;
  /**
   * §4.2 — where the time controls are DRAWN. They belong to the tray in layout A and to the
   * scroll state here, so they are rendered by this component and portalled into that host: the
   * handlers stay beside the value they drive, and the pixels land where the design puts them.
   * `null` keeps them in the lane, which is what the To-do page's calendar still wants.
   */
  timeHost?: HTMLElement | null;
  /** §4.2 — Find's term, lower-cased. It MARKS and FADES rows; it never filters them. */
  find?: string;
  onNudge: (id: string) => void;
}> = ({ rows, view, packageName, nowMs, focusId = null, onOpen, leftControls, onNudge, timeHost = null, find = "" }) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [boxW, setBoxW] = useState(0);
  const [pxd, setPxd] = useState(PXD_DEFAULT);
  const [cross, setCross] = useState<Crosshair | null>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  /**
   * §8.9 — the lane's controls, MEASURED rather than restated.
   *
   * ⚠️ THE TAG RIDES THE SAME LANE THE CONTROLS SIT IN, so its clamp has to know how wide they are.
   * It clamped against the names column only, and a pointer anywhere under the nav or the zoom drew
   * an ink date pill over them at `z-index: 5` against their `4` — a control half covered by
   * something that reads like a control. Their width is `nav + gap + zoom`, three values this file
   * does not own, so it is read off the element instead of arithmetic.
   */
  const ctlRef = useRef<HTMLDivElement>(null);
  /**
   * ⚠️ `--qcv-xp-ext` IS RETIRED (v65.2 §6), NOT MERELY UNREAD. It published the distance from the
   * lane's top to the date tier's foot so the Courier's column could overflow DOWNWARD through the
   * date row without adding to the tray's height — the whole mechanism v65.1 phase 1 was built on.
   * §6 retires that column, so the number has nobody to tell: a publication with no reader is a
   * knob the next person goes looking for, and this repo has paid for one of those already.
   */
  const laneRef = useRef<HTMLDivElement>(null);
  const tierRef = useRef<HTMLDivElement>(null);
  const tagRef = useRef<HTMLSpanElement>(null);
  /**
   * §10 — THE TAG'S OWN WIDTH, MEASURED. The clamp has to fire when the tag's LEFT EDGE would cross
   * the bound, not when its centre would: the rule centres it with `translateX(-50%)`, so a trigger
   * that compares the centre lets half the tag slide under the names column while reporting itself
   * clear. Measured on the page: a tag left edge at 561.5 against a bound of 591, from a centre
   * that was one pixel the right side of it.
   */
  const [tagW, setTagW] = useState(0);
  useLayoutEffect(() => {
    const el = tagRef.current;
    if (!el) return;
    const w = el.getBoundingClientRect().width;
    if (w > 0 && Math.abs(w - tagW) > 0.5) setTagW(w);
  });


  const ext = useMemo(() => extentOf(rows, nowMs), [rows, nowMs]);
  /**
   * ⚠️ THE FILTER AND THE SORT ARE `groupRows`', NEVER THIS COMPONENT'S. It decided the groups
   * itself until phase 6, and the controls that replaced that call are a second view of the same
   * state — the popover's checkboxes and the stat cards read and write one value, so neither can
   * be showing a set the rows disagree with.
   */
  const groups = useMemo(() => groupRows(rows, view, nowMs, packageName), [rows, view, nowMs, packageName]);
  const tl = useMemo(() => {
    const out = new Map<string, TlRow>();
    for (const g of groups) for (const r of g.rows) out.set(r.id, tlRow(r.row, nowMs));
    return out;
  }, [groups, nowMs]);
  const width = trackWidth(ext, pxd);
  const todayX = xAt(ext, pxd, new Date(nowMs).setHours(0, 0, 0, 0));
  const months = useMemo(() => monthBands(ext, pxd), [ext, pxd]);
  const weeks = useMemo(() => weekTicks(ext, pxd), [ext, pxd]);
  const edges = useMemo(() => edgeCounts([...tl.values()], ext, pxd, scrollLeft, boxW), [tl, ext, pxd, scrollLeft, boxW]);

  /* the track's own width, measured — everything the lane places is placed against it */
  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return undefined;
    const read = () => setBoxW(el.clientWidth - NAMES_W);
    read();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /**
   * ⚠️ ON OPEN, TODAY SITS AT 58% — once, or every re-render would yank the view back.
   *
   * ⚠️ AND THE EFFECT DEPENDS ON ONE NUMBER, BECAUSE AN EFFECT THAT DEPENDS ON A VALUE REBUILT
   * EVERY RENDER CANCELS ITS OWN ANIMATION FRAME FOR EVER. Written with `[boxW, ext, pxd, nowMs,
   * focusId, tl]` it looked exhaustive and correct; `rows` arrives as a fresh array from the page's
   * own render, so `ext` and `tl` were new objects every time, the effect re-ran, its cleanup
   * cancelled the frame it had just armed, and the next one armed another. `scrollLeft` stayed 0
   * and the view opened two and a half years in the past — through twenty-five green cases, because
   * the line, the pill and twenty-four bar ends all agreed with each other out there.
   *
   * So the placement runs on `boxW` alone — a number — and reads everything else from a ref at the
   * moment it fires. Measured before the fix: a `scrollLeft = 9000` typed by hand into the same
   * scroller stuck immediately, which is what proved the DOM was never the problem.
   *
   * ⚠️ AND THE WRITE IS CONFIRMED RATHER THAN ASSUMED. A `scrollLeft` set before the track's
   * thousands of pixels exist is clamped to zero and reports nothing.
   *
   * ⚠️ AND IT WAITS FOR ROWS, WHICH IS THE FAULT THAT ACTUALLY SHIPPED. With no data the extent is
   * three weeks wide, today's x is about 220, and `scrollForToday` correctly answers ZERO. The
   * write then succeeds — 0 is 0 — `placed` records a success, and the view never places itself
   * again once fifty queries arrive and the track becomes twelve thousand pixels long. A guard that
   * fires against an empty account locks in an answer that was right for nothing and wrong for
   * everything. It is the same shape as refusing a zero rect, one input along: an empty SET is as
   * unmeasured as an unlaid-out box.
   */
  const latest = useRef({ ext, pxd, boxW, nowMs, focusId, tl });
  latest.current = { ext, pxd, boxW, nowMs, focusId, tl };
  /**
   * ⚠️ AND IT RE-PLACES WHEN THE EXTENT MOVES, WHICH IS THE SAME FAULT ONE STEP ALONG (v65.1).
   *
   * The guard above waits for rows — but rows can arrive in more than one batch, and the extent's
   * left edge is the EARLIEST send in whatever has arrived. Place against a first batch of recent
   * queries and the answer is right for that extent; when the older ones land, `fromMs` moves years
   * to the left and the scroll that was 58% of the way along is now the extent's START. A one-shot
   * `placed` flag then refuses to correct it, which is a view opening in 2023 with every number in
   * it agreeing — the shape this file has already been caught by twice.
   *
   * ⚠️ SO THE GUARD IS THE EXTENT IT WAS PLACED AGAINST, NOT A BOOLEAN — and `touched` is what
   * stops it fighting the reader. Anything the reader does to the track (a wheel, a pan, a zoom, a
   * Today, a glide) marks it, and from then on the view is theirs and nothing re-places it.
   */
  const placedFor = useRef<string | null>(null);
  const touched = useRef(false);
  useLayoutEffect(() => {
    if (touched.current || boxW <= 0 || rows.length === 0) return undefined;
    /**
     * ⚠️ THE KEY IS THE EXTENT **AND THE MEASURED WIDTH**, because a width read before the card has
     * laid out is not a narrow box — it is the CONTENT's width, and the placement it produces is a
     * plausible number the success check cannot refuse. Measured on a re-open: `clientWidth` came
     * back as 12050 (the whole track) rather than 1128, so `boxW` was 11750, `scrollForToday`
     * answered 3023 against a correct 9358, the write succeeded, `placedFor` recorded it, and the
     * view opened **two years in the past** — on every open after the first, through a green suite.
     * Keying on the pair means a corrected width re-places; `touched` still keeps it off a reader.
     */
    const key = `${ext.fromMs}:${boxW}`;
    if (placedFor.current === key) return undefined;
    const put = () => {
      const node = scrollRef.current;
      if (!node) return false;
      const L = latest.current;
      const focus = L.focusId ? L.tl.get(L.focusId) : null;
      const at = focus?.row.expectedMs ?? focus?.row.stageStartMs ?? null;
      const want = at != null ? Math.max(0, xAt(L.ext, L.pxd, at) - L.boxW / 2) : scrollForToday(L.ext, L.pxd, L.boxW, L.nowMs);
      node.scrollLeft = want;
      if (Math.abs(node.scrollLeft - want) < 1) { placedFor.current = `${L.ext.fromMs}:${L.boxW}`; setScrollLeft(node.scrollLeft); return true; }
      return false;
    };
    if (put()) return undefined;
    const id = requestAnimationFrame(() => { if (!put()) requestAnimationFrame(put); });
    return () => cancelAnimationFrame(id);
  }, [boxW, rows.length, ext.fromMs]);

  /**
   * §4.2 — THE FIRST MATCH SCROLLS INTO VIEW, 110px below the body's top.
   *
   * ⚠️ IT SCROLLS THE ROWS VERTICALLY AND LEAVES THE DATES ALONE. Find is about WHO, not WHEN —
   * moving the track sideways would answer a question nobody asked and lose the reader their place
   * in the calendar. And it is the SCROLLER's own `scrollTop`, never `scrollIntoView`, which would
   * scroll every ancestor including the page behind the overlay.
   */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !find) return;
    const hit = el.querySelector("[data-find='hit']") as HTMLElement | null;
    if (!hit) return;
    const top = hit.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop - 110;
    el.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }, [find]);

  /** Anything the reader does to the track is theirs: nothing re-places it afterwards. */
  const mine = useCallback(() => { touched.current = true; }, []);

  const pan = useCallback((weeksBy: number) => {
    const el = scrollRef.current;
    if (!el) return;
    mine();
    el.scrollLeft = Math.max(0, el.scrollLeft + weeksBy * 7 * pxd);
    setScrollLeft(el.scrollLeft);
  }, [pxd, mine]);

  const toPreset = useCallback((key: string) => {
    const p = ZOOM_PRESETS.find((z) => z.key === key);
    const el = scrollRef.current;
    if (!p || !el || boxW <= 0) return;
    mine();
    const next = zoomAbout(ext, pxd, pxdForPreset(p), el.scrollLeft, boxW / 2);
    setPxd(next.pxd);
    requestAnimationFrame(() => { if (scrollRef.current) { scrollRef.current.scrollLeft = next.scrollLeft; setScrollLeft(next.scrollLeft); } });
  }, [ext, pxd, boxW, mine]);

  /**
   * §9 — ctrl/⌘-WHEEL AND TRACKPAD PINCH ZOOM ABOUT THE POINTER; a plain wheel scrolls, as it should.
   *
   * ⚠️ THE CURVE IS `e^(−deltaY × 0.008)`, NOT A FIXED STEP PER NOTCH. A pinch arrives as a stream
   * of ctrl-wheels whose `deltaY` carries how far the fingers moved, so a constant 1.12 per event
   * makes the zoom a function of how many events the hardware sends rather than of the gesture.
   *
   * ⚠️ AND IT IS COALESCED TO ONE RE-RENDER PER FRAME. A pinch delivers events faster than the
   * browser paints; re-rendering each one rebuilds every row and the gesture stutters against its
   * own work. The pending scale accumulates and the frame applies whatever it has reached.
   */
  const zoomPend = useRef<{ pxd: number; at: number } | null>(null);
  const zoomFrame = useRef(0);
  const onWheel = useCallback((e: React.WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const el = scrollRef.current;
    if (!el) return;
    mine();
    const at = e.clientX - el.getBoundingClientRect().left;
    const from = zoomPend.current?.pxd ?? pxd;
    zoomPend.current = { pxd: clampPxd(from * Math.exp(-e.deltaY * 0.008)), at };
    if (zoomFrame.current) return;
    zoomFrame.current = requestAnimationFrame(() => {
      zoomFrame.current = 0;
      const p = zoomPend.current;
      zoomPend.current = null;
      const sc = scrollRef.current;
      if (!p || !sc) return;
      const next = zoomAbout(ext, pxd, p.pxd, sc.scrollLeft, p.at);
      setPxd(next.pxd);
      requestAnimationFrame(() => { if (scrollRef.current) { scrollRef.current.scrollLeft = next.scrollLeft; setScrollLeft(next.scrollLeft); } });
    });
  }, [ext, pxd, mine]);

  /**
   * §9 — DRAGGING THE DATES. A press on the date tier pans the calendar 1:1 with the pointer.
   *
   * ⚠️ THE HIT AREA EXCLUDES EVERYTHING INTERACTIVE IN THE LANE, and that is not tidiness: this was
   * a real fault in the mock, where the drag captured the pointer and swallowed the lane's own
   * clicks. A press on Today, ‹, ›, the zoom or an edge marker must behave as a click, so the drag
   * refuses to start on any of them rather than starting and then trying to tell them apart.
   *
   * ⚠️ AND A PRESS THAT MOVES UNDER 3px IS NOT A DRAG. Without that floor every click on the tier
   * is a one-pixel pan, and the crosshair blinks off under a reader who only meant to point.
   *
   * ⚠️ NO INERTIA, DELIBERATELY. The content follows the pointer exactly and stops when it stops:
   * a flick that carries on is a second model of where the dates are, and this view already has
   * one — the scroll position the today line, the pill and every bar are placed from.
   */
  const drag = useRef<{ id: number; x: number; scroll: number; moved: boolean } | null>(null);
  const [dragging, setDragging] = useState(false);
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const el = scrollRef.current;
    if (!el || e.button !== 0) return;
    const t = e.target as HTMLElement;
    if (t.closest("button, a, input, [role='button'], [data-qcv='tl-marker'], [data-qcv='tl-names'], [data-qcv='xp-ctl']")) return;
    drag.current = { id: e.pointerId, x: e.clientX, scroll: el.scrollLeft, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    document.body.style.userSelect = "none";
    e.preventDefault();
  }, []);
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = drag.current, el = scrollRef.current;
    if (!d || !el || e.pointerId !== d.id) return;
    const dx = e.clientX - d.x;
    if (!d.moved) {
      if (Math.abs(dx) < 3) return;
      d.moved = true;
      setDragging(true);
      setCross(null);
      mine();
    }
    /* 1:1, horizontal only — the browser clamps at the extent's ends and nothing rubber-bands */
    el.scrollLeft = d.scroll - dx;
    setScrollLeft(el.scrollLeft);
  }, [mine]);
  const endDrag = useCallback((e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    drag.current = null;
    setDragging(false);
    document.body.style.userSelect = "";
    const el = e.currentTarget as HTMLElement;
    if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
  }, []);

  /* §8.9 — the crosshair, snapped to the day, hidden over the names column and the controls */
  const onMove = useCallback((e: React.MouseEvent) => {
    const el = scrollRef.current;
    if (!el || drag.current?.moved) return;
    const t = e.target as HTMLElement;
    /* §10 — it hides over the names column, the lane's controls, a popover and a marker. The
       popover is the one that was missing: it hangs OVER the rows, so a crosshair drawn under it
       is a line a reader can see through a panel they are reading. */
    if (t.closest("[data-qcv='tl-names'], [data-qcv='tl-controls'], [data-qcv='tl-marker'], [data-qcv='xp-pop'], [data-qcv='xp-ctl']")) { setCross(null); return; }
    /* ⚠️ THE POINTER IS IN THE SCROLLER'S BOX AND `crosshairAt` WANTS THE TRACK'S. The scroller
       starts at the names column, so `scrollLeft + (clientX - left)` is a CONTENT x and the track
       begins `NAMES_W` into it — measured, the line was drawn 298px right of the pointer and the
       tag named a day a fortnight later, with every declaration reading correctly. */
    setCross(crosshairAt(ext, pxd, el.scrollLeft + (e.clientX - el.getBoundingClientRect().left) - NAMES_W, nowMs));
  }, [ext, pxd, nowMs]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    const on = () => setScrollLeft(el.scrollLeft);
    el.addEventListener("scroll", on, { passive: true });
    return () => el.removeEventListener("scroll", on);
  }, []);

  const glide = (ms: number) => {
    const el = scrollRef.current;
    if (!el) return;
    mine();
    el.scrollTo({ left: Math.max(0, xAt(ext, pxd, ms) - boxW / 2), behavior: "smooth" });
  };

  /**
   * §4.2 — ‹ Today › and the zoom, rendered ONCE and placed in one of two homes: the tray's own
   * host in the expanded view, or this component's lane where there is no host.
   *
   * ⚠️ ONE ELEMENT, TWO PLACES — never two copies. Two `Today` buttons would be two controls that
   * have to agree about one scroller, and the second one to be written is the one that forgets.
   */
  const timeControls = (
    <div className="qcv-tl-controls" data-qcv="tl-controls" ref={ctlRef}>
      <span className="qcv-tl-nav" data-qcv="tl-nav">
        <button type="button" onClick={() => pan(-NUDGE_WEEKS)} aria-label="Four weeks earlier">‹</button>
        <button type="button" className="qcv-tl-today" onClick={() => { const el = scrollRef.current; if (el && boxW > 0) { mine(); el.scrollTo({ left: scrollForToday(ext, pxd, boxW, nowMs), behavior: "smooth" }); } }}>Today</button>
        <button type="button" onClick={() => pan(NUDGE_WEEKS)} aria-label="Four weeks later">›</button>
      </span>
      <span className="qcv-tl-zoom" data-qcv="tl-zoom" role="group" aria-label="Zoom">
        {ZOOM_PRESETS.map((p) => (
          <button key={p.key} type="button" data-z={p.key} aria-pressed={activePreset(pxd) === p.key} onClick={() => toPreset(p.key)}>{p.label}</button>
        ))}
      </span>
    </div>
  );

  const bar = (r: TlRow, b: TlRow["bars"][number]) => {
    const left = xAt(ext, pxd, b.fromMs);
    const w = Math.max(2, xAt(ext, pxd, b.toMs) - left);
    const pc = (ms: number) => ((xAt(ext, pxd, ms) - left) / w) * 100;
    return (
      <button
        key={b.key}
        type="button"
        className={`qcv-tl-bar${b.current ? " qcv-tl-bar--now" : " qcv-tl-bar--past"}${b.you ? " qcv-tl-bar--you" : ""}${b.undated ? " qcv-tl-bar--undated" : ""}`}
        data-qcv="tl-bar"
        data-status={b.status}
        data-current={b.current ? "true" : "false"}
        style={{ left, width: w, ["--qcv-state" as string]: `var(--state-${r.row.state})` }}
        title={b.title}
        onClick={(e) => { e.stopPropagation(); onOpen(r.id); }}
      >
        {/* the ink stretch from the expected date to today, and the hollow one beyond today */}
        {b.overFromMs != null && <u className="qcv-tl-over" data-qcv="tl-over" style={{ left: `${pc(b.overFromMs)}%`, right: 0 }} />}
        {b.aheadFromMs != null && <u className="qcv-tl-ahead" data-qcv="tl-ahead" style={{ left: `${pc(b.aheadFromMs)}%`, right: 0 }} />}
        {/**
          * §7 — THE SENTENCE IS ANCHORED TO THE VISIBLE PART OF ITS BAR, and the offset is computed
          * rather than declared.
          *
          * ⚠️ `position: sticky` WAS THE FIRST ANSWER AND IT CANNOT WORK HERE. The bar carries
          * `overflow: hidden`, which makes it the sticky child's nearest scrollport — so the words
          * stuck to the BAR, which never scrolls, and a bar beginning off-screen still took them
          * with it. Measured: a sentence's ink at −8360 against a visible edge of 568.
          *
          * The track's visible left edge, in the track's own coordinates, is exactly `scrollLeft`
          * (the names cell covers the first `NAMES_W` of the viewport and the track begins there),
          * so the inset is how far the bar's left is behind it, plus the 10px §7 asks for. It is a
          * MARGIN rather than a transform because a margin also takes the width away, which is what
          * turns "does not fit" into the bar's own ellipsis.
          */}
        <span
          className="qcv-tl-words"
          data-qcv="tl-words"
          style={{ marginLeft: Math.max(0, Math.min(scrollLeft + 10 - left, w - 24)) }}
        >{b.current ? b.words : b.label}</span>
      </button>
    );
  };

  return (
    <div className="qcv-tl" ref={boxRef} data-qcv="tl" style={{ ["--qcv-tl-names" as string]: `${NAMES_W}px` }}>
      {/**
        * §5 — THE LANE IS AN OVERLAY WITH NO HEIGHT OF ITS OWN NOW. It was a 52px row above the
        * dates; §5 gives the DATE ROW its own 60px with a corner cell inside it, so a second row
        * would be 52px of white nobody asked for. What still lives here is what must NOT scroll
        * with the dates: the edge markers and the crosshair's tag.
        *
        * ⚠️ AND IT IS STILL A SIBLING OF THE SCROLLER, WHICH IS THE WHOLE POINT. The rows rebuild on
        * every zoom, filter and group change; the lane does not, so what sits in it is the same
        * element before and after — §11 lock 6, and the reason none of it is in the scrolling body.
        */}
      <div className="qcv-tl-lane" data-qcv="tl-lane" ref={laneRef}>
        {timeHost ? createPortal(timeControls, timeHost) : timeControls}
        {/* §8.8 — the edge markers, clear of the controls, and absent when there is nothing off-screen */}
        {edges.earlier > 0 && edges.nearestEarlier != null && (
          <button type="button" className="qcv-tl-marker qcv-tl-marker--l" data-qcv="tl-marker" onClick={() => glide(edges.nearestEarlier!)}>‹ {edges.earlier} due earlier</button>
        )}
        {edges.later > 0 && edges.nearestLater != null && (
          <button type="button" className="qcv-tl-marker qcv-tl-marker--r" data-qcv="tl-marker" onClick={() => glide(edges.nearestLater!)}>{edges.later} due later ›</button>
        )}
        {/**
          * §5 — THE TAG'S BOUNDS ARE THE NAMES COLUMN AND THE PANEL'S RIGHT EDGE.
          *
          * ⚠️ IT USED TO CLEAR THE TIME CONTROLS, AND THOSE HAVE LEFT THE LANE (§4.2). The guard was
          * `NAMES_W + 18 + <the cluster's measured width> + 8` — a clearance around a cluster now in the
          * tray, so keeping it would clamp the tag away from a strip of empty lane for no reason
          * anybody reading the page could see. The controls moved, so the clearance goes with them:
          * what remains is the names column, which is opaque and would hide the tag behind it.
          */}
        {cross && (() => {
          const guard = NAMES_W + 8;
          const at = NAMES_W + cross.x - scrollLeft;
          /* the tag is centred, so it is its LEFT EDGE that must clear the bound */
          const under = at - tagW / 2 < guard;
          return (
            <span
              ref={tagRef}
              className={`qcv-tl-tag${cross.today ? " qcv-tl-tag--today" : ""}`}
              data-qcv="tl-tag"
              /* ⚠️ UNDER THE CONTROLS IT LEFT-ALIGNS AT THE GUARD RATHER THAN CENTRING ON IT. The
                 rule centres the tag with `translateX(-50%)`, so clamping the CENTRE would still
                 put half of it under the zoom pill; dropping the transform is what makes the guard
                 mean the tag's own left edge. */
              style={under ? { left: guard, transform: "none" } : { left: at }}
            >{cross.label}</span>
          );
        })()}
      </div>

      {/**
        * §9 — THE PRESS IS BOUND ON THE SCROLLER, and the tier is what declares itself a handle.
        * Capture belongs to one element or a pointer that leaves the tier mid-drag stops panning;
        * binding it here means the gesture survives the pointer crossing a row, a bar or the lane,
        * and `onPointerDown` is what refuses to start on anything interactive.
        */}
      <div
        className={`qcv-tl-scroll${dragging ? " qcv-tl-scroll--drag" : ""}`}
        ref={scrollRef} data-qcv="tl-scroll" data-dragging={dragging ? "true" : "false"}
        onWheel={onWheel} onMouseMove={onMove} onMouseLeave={() => setCross(null)}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}
      >
        <div className="qcv-tl-inner" style={{ width: NAMES_W + width }}>
          {/* §B1 — the date row: the month bands, the Monday dates and TODAY. Nothing beneath them. */}
          {/**
            * §5–§6 — THE CORNER CELL, over the names, 330 × 60, WHITE AND OPAQUE. It is sticky-left
            * inside the scroller, so it holds its place over the names column while the dates run
            * under it — and it is what §6's Filter, Group, Sort and ↺ sit in.
            *
            * ⚠️ IT IS INSIDE THE SCROLLER AND THE DATES ARE TOO, which is the only arrangement in
            * which the two cannot disagree: a corner drawn outside would be a second element that
            * has to be told how wide the names column is.
            */}
          <div className="qcv-tl-daterow" data-qcv="tl-daterow">
          <div className="qcv-tl-corner" data-qcv="tl-corner">{leftControls}</div>
          <div className="qcv-tl-tier" data-qcv="tl-tier" ref={tierRef} style={{ width }}>
            {/**
              * §5 — MONTH BANDS. One band per month across the row's full height, alternating, each
              * naming itself at its own left edge — and the LABEL is sticky at the names column's
              * right + 8, so the month you are looking at is always the one named.
              *
              * ⚠️ THIS IS WHAT RETIRED THE MONTH LABELS' CLEARANCE. They were points that had to
              * dodge the TODAY pill, and a clearance written as a share of the TRACK put 376px of
              * hole either side of today on a three-year pipeline — thirty-five labels rendered and
              * not one of them visible. A band has somewhere else to put its name.
              */}
            {months.map((m) => (
              <span key={m.ms} className={`qcv-tl-mb${m.alt ? " qcv-tl-mb--alt" : ""}`} data-qcv="tl-month" style={{ left: m.x, width: m.width }}>
                <b data-qcv="tl-monthlabel">{m.month}<u>{m.year}</u></b>
              </span>
            ))}
            {/* §5 — every Monday's date, centred on its own x with a tick above it */}
            {weeks.map((w) => (
              <span key={w.ms} className="qcv-tl-wk" data-qcv="tl-monday" style={{ left: w.x }}>{w.label}</span>
            ))}
            <span className="qcv-tl-todaypill" data-qcv="tl-todaypill" style={{ left: todayX }}>Today</span>
            {/* §10 — the crosshair runs through the DATE TIER as well as the rows: a line that
                stopped at the tier's foot would leave the tag it belongs to floating over nothing. */}
            {cross && <i className="qcv-tl-cross qcv-tl-cross--tier" data-qcv="tl-cross-tier" style={{ left: cross.x }} aria-hidden="true" />}
          </div>
          </div>

          {/* §8.6 — the rows, with the names cell sticky-left */}
          <div className="qcv-tl-rows" data-qcv="tl-rows">
            {/* ⚠️ THE TODAY LINE IS THE ROWS' OWN, at the same x every bar is placed from */}
            <i className="qcv-tl-todayline" data-qcv="tl-todayline" style={{ left: NAMES_W + todayX }} aria-hidden="true" />
            {cross && <i className="qcv-tl-cross" data-qcv="tl-cross" style={{ left: NAMES_W + cross.x }} aria-hidden="true" />}
            {groups.length === 0 ? (
              <p className="qcv-tl-none" data-qcv="tl-none">Nothing here with these settings.</p>
            ) : groups.map((g) => (
              <section key={g.key} className="qcv-tl-group" data-qcv="tl-group" data-group={g.key}>
                {/* §8.3 — a heading shows whenever grouping is on, even where there is one group;
                    only "Nothing" removes them. Its words are the GROUP's, so Status and package
                    groups name themselves rather than falling back to an attention label. */}
                {view.groupBy !== "none" && (
                  <div className="qcv-tl-band" data-qcv="tl-band">
                    {/* §6 — a Next-action band says what the action IS; the other groupings have
                        nothing to add to their own names, so they carry no hint rather than one
                        invented to fill the slot. */}
                    <span>{g.label}{g.hint && <em>{g.hint}</em>}<i>{g.count}</i></span>
                  </div>
                )}
                {g.rows.map((r) => {
                  const t = tl.get(r.id)!;
                  return (
                    <div
                      key={r.id}
                      className={`qcv-tl-row${r.group === "watch" ? " qcv-tl-row--watch" : ""}${focusId === r.id ? " qcv-tl-row--focus" : ""}${dueCell(r.row, nowMs).kind === "past" ? " qcv-tl-row--late" : ""}${find ? (r.row.agentName.toLowerCase().includes(find) ? " qcv-tl-row--hit" : " qcv-tl-row--miss") : ""}`}
                      data-qcv="tl-row"
                      data-find={find ? (r.row.agentName.toLowerCase().includes(find) ? "hit" : "miss") : undefined}
                      data-id={r.id}
                      onClick={() => onOpen(r.id)}
                    >
                      <div className="qcv-tl-names" data-qcv="tl-names">
                        <i className="qcv-tl-ini" aria-hidden="true">{r.row.initials}</i>
                        <span className="qcv-tl-who">
                          <b className="qcv-tl-nm">{r.row.agentName}</b>
                          <span className="qcv-tl-st"><StatusDot status={r.row.status} overrideSize={11} decorative />{r.stage}</span>
                        </span>
                        {/**
                          * §7 / §1.8 — THE DUE DATE AND ITS DISTANCE, exactly as the rail's right
                          * column states them, from the same `dueCell`. Two surfaces, one
                          * derivation: a second formatter here is how "9 Sep · 10d over" comes to
                          * read differently in two places that are showing the same query.
                          */}
                        {(() => { const d = dueCell(r.row, nowMs); return (
                          <span className={`qcv-tl-due${d.urgent ? " qcv-tl-due--late" : ""}`} data-qcv="tl-due" data-due={d.kind}>
                            <b data-qcv="tl-due-date">{d.date}</b>
                            <u data-qcv="tl-due-dist">{d.distance}</u>
                          </span>
                        ); })()}
                      </div>
                      <div className="qcv-tl-track" data-qcv="tl-track" style={{ width }}>
                        {t.bars.map((b) => bar(t, b))}
                        {/* §8.7 — the dotted chip, after the bar, on agent-side overdue only */}
                        {t.nudge && (
                          <button
                            type="button"
                            className="qcv-tl-nudge"
                            data-qcv="tl-nudge"
                            style={{ left: xAt(ext, pxd, t.bars[t.bars.length - 1]?.toMs ?? nowMs) + 10 }}
                            onClick={(e) => { e.stopPropagation(); onNudge(r.id); }}
                          >
                            <span aria-hidden="true">✉</span> {t.nudge.text}
                          </button>
                        )}
                        {/* §8.7 — the dotted ring holding what a with-you stage owes next */}
                        {t.ghost && (
                          <span className="qcv-tl-ghost" data-qcv="tl-ghost" title={t.ghost.label} style={{ left: xAt(ext, pxd, t.bars[t.bars.length - 1]?.toMs ?? nowMs) + 10 }}>
                            <StatusDot status={t.ghost.status} overrideSize={13} decorative />
                          </span>
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
    </div>
  );
};
