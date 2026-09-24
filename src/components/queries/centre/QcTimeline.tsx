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
import { StatusDot } from "../../StatusDot";
import { groupRows, type CalView } from "../../../lib/qcCalView";
import type { QcRow } from "../../../lib/qcSummary";
import {
  NUDGE_WEEKS, PXD_DEFAULT, ZOOM_PRESETS, activePreset, clampPxd, crosshairAt, edgeCounts, extentOf,
  heatWeeks, monthTicks, msAt, pxdForPreset, scrollForToday, tlRow, trackWidth, weekTicks, xAt, zoomAbout,
  type Crosshair, type TlRow,
} from "../../../lib/qcTimeline";
import "./qcvTimeline.css";

const DAY = 86_400_000;
/** §8.6 — the names column, and §8.1's Courier column above it are the same width. */
export const NAMES_W = 260;

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
  onNudge: (id: string) => void;
}> = ({ rows, view, packageName, nowMs, focusId = null, onOpen, onNudge }) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [boxW, setBoxW] = useState(0);
  const [pxd, setPxd] = useState(PXD_DEFAULT);
  const [cross, setCross] = useState<Crosshair | null>(null);
  const [scrollLeft, setScrollLeft] = useState(0);

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
  const heat = useMemo(() => heatWeeks(rows, ext, nowMs), [rows, ext, nowMs]);
  const months = useMemo(() => monthTicks(ext, pxd, nowMs), [ext, pxd, nowMs]);
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
  const placed = useRef(false);
  useLayoutEffect(() => {
    if (placed.current || boxW <= 0 || rows.length === 0) return undefined;
    const put = () => {
      const node = scrollRef.current;
      if (!node) return false;
      const L = latest.current;
      const focus = L.focusId ? L.tl.get(L.focusId) : null;
      const at = focus?.row.expectedMs ?? focus?.row.stageStartMs ?? null;
      const want = at != null ? Math.max(0, xAt(L.ext, L.pxd, at) - L.boxW / 2) : scrollForToday(L.ext, L.pxd, L.boxW, L.nowMs);
      node.scrollLeft = want;
      if (Math.abs(node.scrollLeft - want) < 1) { placed.current = true; setScrollLeft(node.scrollLeft); return true; }
      return false;
    };
    if (put()) return undefined;
    const id = requestAnimationFrame(() => { if (!put()) requestAnimationFrame(put); });
    return () => cancelAnimationFrame(id);
  }, [boxW, rows.length]);

  const pan = useCallback((weeksBy: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollLeft = Math.max(0, el.scrollLeft + weeksBy * 7 * pxd);
    setScrollLeft(el.scrollLeft);
  }, [pxd]);

  const toPreset = useCallback((key: string) => {
    const p = ZOOM_PRESETS.find((z) => z.key === key);
    const el = scrollRef.current;
    if (!p || !el || boxW <= 0) return;
    const next = zoomAbout(ext, pxd, pxdForPreset(p, boxW), el.scrollLeft, boxW / 2);
    setPxd(next.pxd);
    requestAnimationFrame(() => { if (scrollRef.current) { scrollRef.current.scrollLeft = next.scrollLeft; setScrollLeft(next.scrollLeft); } });
  }, [ext, pxd, boxW]);

  /* ⚠️ ctrl/⌘-WHEEL ZOOMS ABOUT THE POINTER; a plain wheel scrolls, as it should */
  const onWheel = useCallback((e: React.WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const el = scrollRef.current;
    if (!el) return;
    const at = e.clientX - el.getBoundingClientRect().left;
    const next = zoomAbout(ext, pxd, clampPxd(pxd * (e.deltaY < 0 ? 1.12 : 1 / 1.12)), el.scrollLeft, at);
    setPxd(next.pxd);
    requestAnimationFrame(() => { if (scrollRef.current) { scrollRef.current.scrollLeft = next.scrollLeft; setScrollLeft(next.scrollLeft); } });
  }, [ext, pxd]);

  /* §8.9 — the crosshair, snapped to the day, hidden over the names column and the controls */
  const onMove = useCallback((e: React.MouseEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    const t = e.target as HTMLElement;
    if (t.closest("[data-qcv='tl-names'], [data-qcv='tl-controls'], [data-qcv='tl-marker']")) { setCross(null); return; }
    setCross(crosshairAt(ext, pxd, el.scrollLeft + (e.clientX - el.getBoundingClientRect().left), nowMs));
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
    el.scrollTo({ left: Math.max(0, xAt(ext, pxd, ms) - boxW / 2), behavior: "smooth" });
  };

  const bar = (r: TlRow, b: TlRow["bars"][number]) => {
    const left = xAt(ext, pxd, b.fromMs);
    const w = Math.max(2, xAt(ext, pxd, b.toMs) - left);
    const pc = (ms: number) => ((xAt(ext, pxd, ms) - left) / w) * 100;
    return (
      <button
        key={b.key}
        type="button"
        className={`qcv-tl-bar${b.current ? " qcv-tl-bar--now" : " qcv-tl-bar--past"}${b.you ? " qcv-tl-bar--you" : ""}`}
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
        <span className="qcv-tl-words" data-qcv="tl-words">{b.current ? b.words : b.label}</span>
      </button>
    );
  };

  return (
    <div className="qcv-tl" ref={boxRef} data-qcv="tl" style={{ ["--qcv-tl-names" as string]: `${NAMES_W}px` }}>
      {/* §8.4 — the lane. Its controls are OVERLAYS over the scroller, never inside it. */}
      <div className="qcv-tl-lane" data-qcv="tl-lane">
        <div className="qcv-tl-controls" data-qcv="tl-controls">
          <span className="qcv-tl-nav" data-qcv="tl-nav">
            <button type="button" onClick={() => pan(-NUDGE_WEEKS)} aria-label="Four weeks earlier">‹</button>
            <button type="button" className="qcv-tl-today" onClick={() => { const el = scrollRef.current; if (el && boxW > 0) { el.scrollTo({ left: scrollForToday(ext, pxd, boxW, nowMs), behavior: "smooth" }); } }}>Today</button>
            <button type="button" onClick={() => pan(NUDGE_WEEKS)} aria-label="Four weeks later">›</button>
          </span>
          <span className="qcv-tl-zoom" data-qcv="tl-zoom" role="group" aria-label="Zoom">
            {ZOOM_PRESETS.map((p) => (
              <button key={p.key} type="button" data-z={p.key} aria-pressed={activePreset(pxd, boxW) === p.key} onClick={() => toPreset(p.key)}>{p.label}</button>
            ))}
          </span>
        </div>
        {/* §8.8 — the edge markers, clear of the controls, and absent when there is nothing off-screen */}
        {edges.earlier > 0 && edges.nearestEarlier != null && (
          <button type="button" className="qcv-tl-marker qcv-tl-marker--l" data-qcv="tl-marker" onClick={() => glide(edges.nearestEarlier!)}>‹ {edges.earlier} due earlier</button>
        )}
        {edges.later > 0 && edges.nearestLater != null && (
          <button type="button" className="qcv-tl-marker qcv-tl-marker--r" data-qcv="tl-marker" onClick={() => glide(edges.nearestLater!)}>{edges.later} due later ›</button>
        )}
        {/* §8.9 — the tag rides the lane, clamped clear of the controls */}
        {cross && (
          <span className={`qcv-tl-tag${cross.today ? " qcv-tl-tag--today" : ""}`} data-qcv="tl-tag" style={{ left: Math.max(NAMES_W + 8, NAMES_W + cross.x - scrollLeft) }}>{cross.label}</span>
        )}
      </div>

      <div className="qcv-tl-scroll" ref={scrollRef} data-qcv="tl-scroll" onWheel={onWheel} onMouseMove={onMove} onMouseLeave={() => setCross(null)}>
        <div className="qcv-tl-inner" style={{ width: NAMES_W + width }}>
          {/* §8.4 — the date tier: the heat, the months, the week ticks and the TODAY pill */}
          <div className="qcv-tl-tier" data-qcv="tl-tier" style={{ marginLeft: NAMES_W, width }}>
            <div className="qcv-tl-heat" data-qcv="tl-heat" aria-hidden="true">
              {heat.map((h) => (
                <i key={h.ms} style={{ left: xAt(ext, pxd, h.ms), width: Math.max(1, 7 * pxd - 1), height: `${h.heightPc}%`, opacity: h.opacity }} />
              ))}
            </div>
            {months.map((m) => <span key={m.ms} className="qcv-tl-mon" data-qcv="tl-month" style={{ left: m.x }}>{m.label}</span>)}
            {weeks.map((w) => <i key={w.ms} className="qcv-tl-wk" style={{ left: w.x }} aria-hidden="true" />)}
            <span className="qcv-tl-todaypill" data-qcv="tl-todaypill" style={{ left: todayX }}>Today</span>
          </div>

          {/* §8.6 — the rows, with the names cell sticky-left */}
          <div className="qcv-tl-rows" data-qcv="tl-rows">
            {/* ⚠️ THE TODAY LINE IS THE ROWS' OWN, at the same x every bar is placed from */}
            <i className="qcv-tl-todayline" data-qcv="tl-todayline" style={{ left: NAMES_W + todayX }} aria-hidden="true" />
            {cross && <i className="qcv-tl-cross" data-qcv="tl-cross" style={{ left: NAMES_W + cross.x }} aria-hidden="true" />}
            {groups.length === 0 ? (
              <p className="qcv-tl-none" data-qcv="tl-none">Nothing here with these settings.</p>
            ) : groups.map((g) => (
              <section key={g.key} data-qcv="tl-group" data-group={g.key}>
                {/* §8.3 — a heading shows whenever grouping is on, even where there is one group;
                    only "Nothing" removes them. Its words are the GROUP's, so Status and package
                    groups name themselves rather than falling back to an attention label. */}
                {view.groupBy !== "none" && (
                  <div className="qcv-tl-band" data-qcv="tl-band"><span>{g.label}<i>{g.count}</i></span></div>
                )}
                {g.rows.map((r) => {
                  const t = tl.get(r.id)!;
                  return (
                    <div
                      key={r.id}
                      className={`qcv-tl-row${r.group === "watch" ? " qcv-tl-row--watch" : ""}${focusId === r.id ? " qcv-tl-row--focus" : ""}`}
                      data-qcv="tl-row"
                      data-id={r.id}
                      onClick={() => onOpen(r.id)}
                    >
                      <div className="qcv-tl-names" data-qcv="tl-names">
                        <i className="qcv-tl-ini" aria-hidden="true">{r.row.initials}</i>
                        <span className="qcv-tl-who">
                          <b className="qcv-tl-nm">{r.row.agentName}</b>
                          <span className="qcv-tl-st"><StatusDot status={r.row.status} overrideSize={11} decorative />{r.stage}</span>
                        </span>
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
