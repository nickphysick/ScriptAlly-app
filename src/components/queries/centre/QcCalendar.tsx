/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QcCalendar — the Calendar view (Query Centre v11). One continuous track at 11px a day, from the
 * month of the earliest query to three months ahead; one lane per query; one bar per stage of its
 * journey. Geometry and words come from `lib/qcCalendar`; this draws them and owns the scroll.
 *
 * It is NOT the To-do board. That board (`shared/timeline`) drew one bar per wait with action rings;
 * its rings' buttons were never wired on this page (`requestAction` was not passed), so they were
 * decoration here and they go with it. To-do keeps its board untouched.
 *
 * ⚠️ STICKY INSIDE A CLIPPED BOX FAILS. A past bar hides a label it has no room for with
 * `overflow: clip`, never `hidden`: `hidden` makes the bar a scroll container, and the agent's name —
 * `position: sticky` inside it, so it stays readable when the bar starts off-screen — stops sticking.
 *
 * ⚠️ THE GROUP HEADINGS ARE STICKY TO THE LEFT AT THE BOX'S *VISIBLE* WIDTH, which only the box knows:
 * a ResizeObserver publishes it as `--qcv-vw`, so it survives a window resize after load — not only
 * a fresh one.
 */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { StatusDot } from "../../StatusDot";
import { PAGE_DAYS, PX_PER_DAY, calAxis, calGroups, calTrack, rangeLabel, todayScrollLeft } from "../../../lib/qcCalendar";
import { STAGE_NAME, type QcRow } from "../../../lib/qcSummary";
import { stateFor as stateOf } from "../../../lib/queryCardFacts";
import "./qcvPage.css";
import "./qcvCalendar.css";

export type CalDensity = "x" | "c";
export const CAL_DENSITY_KEY = "sa.qcCalDensity";
export const readDensity = (stored: string | null): CalDensity => (stored === "c" ? "c" : "x");

export const QcCalendar: React.FC<{
  /** What the sentence shows. */
  rows: readonly QcRow[];
  /** What sets the TRACK — the scoped set, so the track does not jump when the filter narrows. */
  trackRows: readonly QcRow[];
  selectedId: string | null;
  onOpen: (id: string) => void;
  nowMs: number;
}> = ({ rows, trackRows, selectedId, onOpen, nowMs }) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const [density, setDensity] = useState<CalDensity>(() => { try { return readDensity(localStorage.getItem(CAL_DENSITY_KEY)); } catch { return "x"; } });
  const [closed, setClosed] = useState<ReadonlySet<string>>(new Set());
  const [range, setRange] = useState("");
  const track = useMemo(() => calTrack(trackRows, nowMs), [trackRows, nowMs]);
  const axis = useMemo(() => calAxis(track, nowMs), [track, nowMs]);
  const groups = useMemo(() => calGroups(rows, track, nowMs), [rows, track, nowMs]);

  const pickDensity = (d: CalDensity) => { setDensity(d); try { localStorage.setItem(CAL_DENSITY_KEY, d); } catch { /* expanded next time */ } };

  const sync = useCallback(() => {
    const box = boxRef.current;
    if (!box) return;
    box.style.setProperty("--qcv-vw", `${box.clientWidth}px`);
    setRange(rangeLabel(track, box.scrollLeft, box.clientWidth));
  }, [track]);

  /* it opens with today 46% of the way across — before paint, so it never opens on January and jumps */
  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    box.scrollLeft = todayScrollLeft(track, box.clientWidth);
    sync();
  }, [track, sync]);
  useEffect(() => {
    const box = boxRef.current;
    if (!box || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(sync);
    ro.observe(box);
    return () => ro.disconnect();
  }, [sync]);

  const page = (dir: -1 | 0 | 1) => {
    const box = boxRef.current;
    if (!box) return;
    const reduce = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    box.scrollTo({ left: dir === 0 ? todayScrollLeft(track, box.clientWidth) : box.scrollLeft + dir * PAGE_DAYS * PX_PER_DAY, behavior: reduce ? "auto" : "smooth" });
  };

  /* ── dragging the background scrolls it. The click that ENDS a drag of more than 6px is ignored. ── */
  const drag = useRef<{ x: number; moved: number } | null>(null);
  const swallow = useRef(false);
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = drag.current, box = boxRef.current;
      if (!d || !box) return;
      const dx = e.clientX - d.x;
      if (Math.abs(dx) > 3 || d.moved) { d.moved += Math.abs(dx); box.classList.add("qcv-cal-box--drag"); box.scrollLeft -= dx; d.x = e.clientX; }
    };
    const up = () => {
      const d = drag.current;
      if (!d) return;
      swallow.current = d.moved > 6;
      drag.current = null;
      boxRef.current?.classList.remove("qcv-cal-box--drag");
      window.setTimeout(() => { swallow.current = false; }, 0);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up); };
  }, []);

  return (
    <div className="qcv-cal" data-qcv="cal" data-dens={density}>
      <div className="qcv-cal-bar" data-qcv="cal-bar">
        <button type="button" className="qcv-cal-nv" aria-label="Earlier" onClick={() => page(-1)}>‹</button>
        <button type="button" className="qcv-cal-nv qcv-cal-nv--today" onClick={() => page(0)}>Today</button>
        <button type="button" className="qcv-cal-nv" aria-label="Later" onClick={() => page(1)}>›</button>
        <b className="qcv-cal-range" data-qcv="cal-range" aria-live="off">{range}</b>
        <div className="qcv-cal-dens" role="group" aria-label="Calendar density" data-qcv="cal-dens">
          {([["x", "Expanded"], ["c", "Compact"]] as const).map(([k, l]) => (
            <button key={k} type="button" aria-pressed={density === k} onClick={() => pickDensity(k)}>{l}</button>
          ))}
        </div>
      </div>

      <div ref={boxRef} className="qcv-cal-box" data-qcv="cal-box" tabIndex={0} role="region" aria-label="Calendar of queries. Scroll sideways, or use Earlier and Later."
        onScroll={sync}
        onPointerDown={(e) => { if (e.button === 0) drag.current = { x: e.clientX, moved: 0 }; }}
        onClickCapture={(e) => { if (swallow.current) { e.stopPropagation(); e.preventDefault(); } }}>
        <div className="qcv-cal-inner" style={{ width: track.widthPx }}>
          <div className="qcv-cal-axis" data-qcv="cal-axis" aria-hidden="true">
            {axis.months.map((m) => <b key={`m${m.x}`} className="qcv-cal-mon" style={{ left: m.x }}>{m.label}</b>)}
            {axis.mondays.map((d) => <i key={`d${d.x}`} className="qcv-cal-day" style={{ left: d.x }}>{d.label}</i>)}
            <b className="qcv-cal-now" style={{ left: axis.today.x }}>{axis.today.label}</b>
          </div>
          <div className="qcv-cal-lanes">
            <i className="qcv-cal-today" data-qcv="cal-today" style={{ left: track.todayX }} aria-hidden="true" />
            {groups.map((g) => {
              const open = !closed.has(g.key);
              return (
                <React.Fragment key={g.key}>
                  <button type="button" className="qcv-cal-grp" data-qcv="cal-group" data-group={g.key} aria-expanded={open}
                    onClick={() => setClosed((c) => { const n = new Set(c); if (n.has(g.key)) n.delete(g.key); else n.add(g.key); return n; })}>
                    <b>{g.label}</b><i>{String(g.count).padStart(2, "0")}</i>
                  </button>
                  {open && (
                    <div className="qcv-cal-gl">
                      {g.lanes.map((lane) => (
                        <div key={lane.id} className="qcv-cal-lane" data-qcv="cal-lane" data-selected={lane.id === selectedId ? "true" : undefined}>
                          {lane.bars.map((b) => (
                            <button key={b.key} type="button" data-qcv={b.current ? "cal-seg" : "cal-hist"} data-id={lane.id} data-status={b.status} data-you={b.you ? "true" : "false"}
                              className={`qcv-bar${b.current ? "" : " qcv-bar--hist"}${b.openRight ? " qcv-bar--open" : ""}${b.you ? " qcv-bar--you" : ""}`}
                              style={{ left: b.left, width: b.width, ["--qcv-state" as string]: `var(--state-${stateOf(b.status)})` }}
                              tabIndex={b.current ? 0 : -1} aria-pressed={lane.id === selectedId} title={b.current ? undefined : b.title}
                              aria-label={`${lane.row.agentName}. ${b.title}`} onClick={() => onOpen(lane.id)}>
                              {/* compact: one line */}
                              <span className="qcv-bar-c"><StatusDot status={b.status} overrideSize={15} decorative /><b>{lane.row.agentName}</b><small>{b.tail}</small></span>
                              {/* expanded: a small card */}
                              <span className="qcv-bar-xb"><span className="qcv-bar-stick"><StatusDot status={b.status} overrideSize={14} decorative /><b>{STAGE_NAME[b.status]}</b><em>{b.court}</em></span></span>
                              <span className="qcv-bar-xi"><b className="qcv-bar-nm">{lane.row.agentName}</b><i className="qcv-bar-ag">{lane.row.agency}</i><span className="qcv-bar-fact">{b.line}{b.note && <small>{b.note}</small>}</span></span>
                              {/* ⚠️ THE OVERRUN IS A CHILD OF THE BAR (§8), never a second bar beside
                                  it — two siblings would fight over hover and selection, and a
                                  reader could put the pointer "between" one query's two pieces. */}
                              {b.over && <i className="qcv-bar-over" style={{ left: `${b.over.left}px`, width: `${b.over.width}px` }} aria-hidden="true" />}
                              {b.end && <i className={`qcv-bar-end qcv-bar-end--${b.end}`} aria-hidden="true" />}
                            </button>
                          ))}
                        </div>
                      ))}
                      {g.undated.length > 0 && (
                        <p className="qcv-cal-undated" data-qcv="cal-undated"><b>Stage not dated</b>{g.undated.map((r) => (
                          <button key={r.id} type="button" aria-pressed={r.id === selectedId} onClick={() => onOpen(r.id)}>{r.agentName}</button>
                        ))}</p>
                      )}
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};


/** Loading: a blank control row and six lanes of bars at mixed offsets, at the current density. */
export const QcCalendarSkeleton: React.FC = () => {
  let density: CalDensity = "x";
  try { density = readDensity(typeof localStorage === "undefined" ? null : localStorage.getItem(CAL_DENSITY_KEY)); } catch { /* expanded */ }
  return (
    <div className="qcv-cal" data-dens={density} aria-hidden="true">
      <div className="qcv-cal-bar" data-qcv="cal-bar" />
      <div className="qcv-cal-box qcv-cal-box--sk" data-qcv="cal-box">
        <div className="qcv-skw" style={{ padding: "18px 0" }}>
          {[[8, 38], [20, 52], [4, 30], [30, 44], [14, 60], [40, 36]].map(([l, w], i) => (
            <div key={i} className="qcv-cal-lane"><span className="qcv-sk qcv-sk--q qcv-cal-barsk" style={{ width: `${w}%`, marginLeft: `${l}%` }} /></div>
          ))}
        </div>
      </div>
    </div>
  );
};
