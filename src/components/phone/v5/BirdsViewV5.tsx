/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v5, Phase E — THE FULL BIRDS-EYE VIEW (design-refs/phone-app-v5/phone-birds-eye-dense-v1.html's rows;
 * phone-hub-v5.html's `mt`, `btrack` with beP "B", `.bed-*`). Below 768px only. It rebuilds v4.1's view
 * (BirdsViewV41, retired) to the dense rows and keeps v4.1's engine, replay, pan, zoom, expansion and landscape.
 *   - THE ENGINE IS THE DESKTOP VIEW'S (lib/qc150): each row's line (`beLine`), the track's extent (`beScale` at its widest
 *     span), the groups in their order (`phoneGroups` → `beGroups`, urgency by due date; the first is "Past its date").
 *     A row's bar is the Today block's own `beTrack` (lib/phoneV5 `bvTrackDays` reads it in days), so the block and the
 *     view draw a row identically. Nothing here restates a rule.
 *   - The header in this mode is the List | Birds-eye switch and search only. Then the spans (1 month / 3 months /
 *     6 months — v4.1's zoom; it opens on 3 months the first time, then on the last one chosen) and v4.1's replay button.
 *   - Rows are 28px: a fixed name column (the mini four-stage track + the surname), then a 12px bar with no text. ⚠️ THE
 *     NAME COLUMN NEVER MOVES: it sits outside every track; a drag moves only the tracks, the ruler and the today line
 *     (one CSS variable, `--x`, on the root — no React render per frame).
 *   - Past its date the bar carries on from the notch to today in a deeper tone. No line, no ring, no beacon.
 *   - The today line (1.5px navy at 60%) runs the height of the rows, above the bars and below an opened row's detail,
 *     the group headings and the fold; the "Today" pill sits in the ruler, which sticks, so the pill stays in sight.
 *   - A row opens v4.1's expansion under it, led by the full name, agency and the one-line status. One at a time.
 *   - A group over five folds to "Show N more". Arriving from Today with `&court=` shows only that group (QueriesV4
 *     passes it), with "Show all" to clear it.
 *   - Once a day the campaign replays (v4.1's key); any touch skips it; reduced motion never replays.
 *   - Landscape (a phone on its side): one header row with the spans, a 184px name column with the full name, no dock.
 * ⚠️ COPY: never "overdue" or "late" (the engine's key `overdue` is an attribute only; the words are phoneV41's).
 */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { MONTHS_SHORT, dayMonth } from "../../../lib/dates";
import { monthBands } from "../../../lib/qcTimeline";
import { beLine, beScale, type BeLine } from "../../../lib/qc150";
import { STAGE_NAME, type QcRow } from "../../../lib/qcSummary";
import { firstTimeToday, longLabel, nextSentence, phoneGroups, stageOn } from "../../../lib/phoneV41";
import { nextActs, type V3Query } from "../../../lib/phoneV3";
import {
  BV_NAME_W, BV_NAME_W_LAND, BV_SPANS, bvFilter, bvFilterLabel, bvFold, bvSpanDays, bvTrackDays, readBvSpan, saveBvSpan, surname,
  type BeCourt, type BvSpan,
} from "../../../lib/phoneV5";
import { useV3Data } from "../v3/V3Provider";
import { openV3Query } from "../v3/v3Store";
import { V3Glyph, statusFill } from "../v3/V3Parts";
import { Cta, Link4 } from "../v4/V4Parts";
import { runAct } from "../v4/acts";
import { MiniTrack } from "./BirdsBlockV5";
import "./phoneV5.css";

const DAY = 86_400_000;
const REST_AT = 0.6;
/** v4.1's once-a-day replay memory, kept */
export const BV_REPLAY_KEY = "pa41.birds-view.replayed";
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const reduced = (): boolean => { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; } };
const startDay = (ms: number): number => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
const useLandscape = (): boolean => {
  const read = () => typeof window !== "undefined" && window.innerWidth > window.innerHeight && window.innerHeight < 560;
  const [l, setL] = useState(read);
  useEffect(() => { const f = () => setL(read()); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, []);
  return l;
};
const at = (s: number, w?: number): React.CSSProperties => (w == null ? { ["--s" as string]: s } : { ["--s" as string]: s, ["--w" as string]: w }) as React.CSSProperties;

interface RowM { q: V3Query; row: QcRow; line: BeLine; group: string; court: string }

export const BirdsViewV5: React.FC<{ switcher: React.ReactNode; corner: React.ReactNode; court?: BeCourt | null; onShowAll?: () => void }> = ({ switcher, corner, court = null, onShowAll }) => {
  const v = useV3Data();
  const now = v.now;
  const loc = useLocation();
  const focusId = new URLSearchParams(loc.search).get("focus");
  const land = useLandscape();

  /* ── the engine ── */
  const byId = v.byId;
  const groups = useMemo(() => phoneGroups(v.qs.map((q) => q.row as QcRow), now), [v.qs, now]);
  const allRows: RowM[] = useMemo(() => groups.flatMap((g) => g.rows.map((e) => {
    const q = byId.get(e.id)!;
    return { q, row: e.row, line: beLine(e, now), group: g.key, court: q ? q.court : "closed" };
  })).filter((r) => r.q), [groups, byId, now]);
  const rows = useMemo(() => bvFilter(allRows, court), [allRows, court]);
  const shown = useMemo(() => groups.map((g) => ({ key: g.key, label: g.label, rows: rows.filter((r) => r.group === g.key) })).filter((g) => g.rows.length), [groups, rows]);
  /* the desktop view's own extent (beScale) at the widest span, over every open query, so the track is the same at every
     span and with or without a filter */
  const ext = useMemo(() => { const sc = beScale(allRows.map((r) => r.line), 182, 182, now); return { fromMs: sc.r0, toMs: sc.r1, days: Math.max(1, Math.round((sc.r1 - sc.r0) / DAY)) }; }, [allRows, now]);
  const TOT = (ext.toMs - ext.fromMs) / DAY;
  const day = useCallback((ms: number) => (ms - ext.fromMs) / DAY, [ext.fromMs]);
  const T = day(now);
  const months = useMemo(() => monthBands(ext, 1), [ext]);
  const firstDay = useMemo(() => { const s = rows.map((r) => r.row.sentMs).filter((m): m is number => m != null); return s.length ? day(Math.min(...s)) : T; }, [rows, day, T]);
  const tracks = useMemo(() => new Map(rows.map((r) => [r.q.id, bvTrackDays(r.line, ext, now)])), [rows, ext, now]);

  /* ── state the render reads ── */
  const [spanK, setSpanK] = useState<BvSpan>(readBvSpan);
  const zoom = bvSpanDays(spanK);
  const [open, setOpen] = useState<string | null>(focusId);
  const [shownOf, setShownOf] = useState<Record<string, boolean>>(() => {
    const g = focusId ? allRows.find((r) => r.q.id === focusId)?.group : undefined;
    return g ? { [g]: true } : {};
  });
  const [stageOf, setStageOf] = useState<Record<string, string | null> | null>(null);
  const [away, setAway] = useState<0 | -1 | 1>(0);

  /* ── the moving parts, kept off React's render (CSS variables on the root) ── */
  const root = useRef<HTMLDivElement>(null);
  const lane = useRef<HTMLDivElement>(null);
  const pill = useRef<HTMLElement>(null);
  const st = useRef({ W: 260, ppd: 3, x: 0, cur: TOT, replaying: false, rid: 0 });
  const setVar = (k: string, val: number) => root.current?.style.setProperty(k, String(val));
  const clampX = useCallback((x: number) => Math.max(Math.min(x, 16), st.current.W - TOT * st.current.ppd - 16), [TOT]);
  const restX = useCallback(() => clampX(REST_AT * st.current.W - T * st.current.ppd), [clampX, T]);
  /** after every move: "Back to today" when today is off the track; month names stick to the visible left edge and give
   *  way to the "Today" pill (measured, so it holds at any text size) */
  const stick = useCallback(() => {
    const s = st.current, el = root.current;
    if (!el) return;
    const nowX = Number(el.style.getPropertyValue("--now") || T) * s.ppd + s.x;
    const off: 0 | -1 | 1 = s.replaying ? 0 : nowX < 8 ? -1 : nowX > s.W - 8 ? 1 : 0;
    setAway((a) => (a === off ? a : off));
    el.dataset.x = String(Math.round(s.x));
    const pw = pill.current?.offsetWidth ?? 0;
    const p0 = nowX - pw / 2 - 4, p1 = nowX + pw / 2 + 4;
    for (const m of el.querySelectorAll<HTMLElement>("[data-mo]")) {
      const left = Number(m.dataset.s) * s.ppd + s.x, mw = Number(m.dataset.w) * s.ppd;
      const b = m.firstElementChild as HTMLElement;
      const bw = b.offsetWidth || 32;
      const dx = Math.max(0, Math.min(-left, mw - bw - 12));
      b.style.transform = `translateX(${dx}px)`;
      const l0 = left + dx + 6, l1 = l0 + bw;
      b.style.visibility = mw < bw + 12 || (l1 > p0 && l0 < p1) ? "hidden" : "";
    }
  }, [T]);
  const setX = useCallback((x: number) => { st.current.x = x; setVar("--x", x); stick(); }, [stick]);
  const setPpd = (p: number) => { st.current.ppd = p; setVar("--ppd", p); if (root.current) root.current.dataset.ppd = p.toFixed(3); };
  const tween = (ms: number, fn: (t: number) => void, done?: () => void) => {
    const id = ++st.current.rid, t0 = performance.now();
    const f = (n: number) => { if (id !== st.current.rid) return; const t = Math.min(1, (n - t0) / ms); fn(ease(t)); if (t < 1) requestAnimationFrame(f); else done?.(); };
    requestAnimationFrame(f);
  };

  /* ── the replay (v4.1's): the today line sweeps from the first query to today, bars clip in behind it, each mini track
     shows the stage of the day, the pill shows the date passing ── */
  const setCur = useCallback((c: number) => {
    st.current.cur = c;
    setVar("--cur", c); setVar("--now", Math.min(c, T));
    const dayMs = ext.fromMs + Math.min(c, T) * DAY;
    const next: Record<string, string | null> = {};
    for (const r of rows) next[r.q.id] = stageOn(r.row, dayMs);
    setStageOf((prev) => (prev && rows.every((r) => prev[r.q.id] === next[r.q.id]) ? prev : next));
    if (pill.current) pill.current.textContent = c >= T - 0.5 ? "Today" : dayMonth(dayMs);
  }, [T, ext.fromMs, rows]);
  const finish = useCallback(() => {
    st.current.replaying = false;
    root.current?.classList.add("done");
    if (root.current) root.current.dataset.replay = "done";
    setCur(TOT); setVar("--now", T);
    /* after setCur, whose own update would otherwise leave the replay's stages in place */
    setStageOf(null);
    if (pill.current) pill.current.textContent = "Today";
    setX(restX());
  }, [setCur, TOT, T, setX, restX]);
  const replay = useCallback(() => {
    setOpen(null);
    if (reduced()) { finish(); return; }
    st.current.replaying = true;
    root.current?.classList.remove("done");
    if (root.current) root.current.dataset.replay = "running";
    const W = st.current.W;
    tween(3400, (t) => { const c = firstDay + (T - firstDay) * t; setCur(c); setX(clampX(Math.min(16, REST_AT * W - c * st.current.ppd))); }, () => {
      const x0 = st.current.x, x1 = restX();
      tween(520, (t) => { setVar("--cur", T + (TOT - T) * t); setX(x0 + (x1 - x0) * t); }, finish);
    });
  }, [finish, firstDay, T, TOT, setCur, setX, clampX, restX]);

  /* ── layout: the track's width and the span ── */
  const layout = useCallback(() => {
    const el = lane.current;
    if (!el) return;
    st.current.W = Math.max(120, el.clientWidth);
    setPpd(st.current.W / zoom);
    setX(st.current.replaying ? st.current.x : restX());
  }, [zoom, setX, restX]);
  useLayoutEffect(() => {
    setCur(TOT); setVar("--now", T);
    layout();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => layout()) : null;
    if (ro && lane.current) ro.observe(lane.current);
    return () => ro?.disconnect();
  }, [land]); // eslint-disable-line react-hooks/exhaustive-deps
  /* the replay: once a day, never with reduced motion, never when arriving at a chosen query */
  useEffect(() => {
    if (focusId) {
      finish();
      requestAnimationFrame(() => root.current?.querySelector<HTMLElement>(`[data-pa5="bv-row"][data-id="${CSS.escape(focusId)}"]`)?.scrollIntoView({ block: "center" }));
      return;
    }
    if (!reduced() && firstTimeToday(BV_REPLAY_KEY, Date.now())) { const t = setTimeout(replay, 350); return () => clearTimeout(t); }
    finish();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const spanTo = (k: BvSpan) => {
    if (st.current.replaying) { st.current.rid++; finish(); }
    saveBvSpan(k);
    const a = st.current.ppd, b = st.current.W / bvSpanDays(k), anchor = (REST_AT * st.current.W - st.current.x) / a;
    setSpanK(k);
    if (reduced()) { setPpd(b); setX(clampX(REST_AT * st.current.W - anchor * b)); return; }
    tween(450, (t) => { setPpd(a + (b - a) * t); setX(clampX(REST_AT * st.current.W - anchor * st.current.ppd)); });
  };
  const backToToday = () => { const a = st.current.x, b = restX(); if (reduced()) setX(b); else tween(420, (t) => setX(a + (b - a) * t)); };

  /* ── pan (v4.1's): a horizontal drag anywhere on the rows moves the tracks, with inertia; a vertical one is the page's
     (touch-action: pan-y). A drag that panned is not a tap. ── */
  const pd = useRef<{ x: number; y: number; x0: number; mode: 0 | 1; id: number } | null>(null);
  const panned = useRef(false);
  const vel = useRef({ v: 0, t: 0, x: 0 });
  const onDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("[data-pa5='bv-detail'], [data-pa5='bv-fold']")) return;
    st.current.rid++; if (st.current.replaying) finish();
    pd.current = { x: e.clientX, y: e.clientY, x0: st.current.x, mode: 0, id: e.pointerId }; panned.current = false; vel.current = { v: 0, t: performance.now(), x: e.clientX };
  };
  const onMove = (e: React.PointerEvent) => {
    const p = pd.current;
    if (!p || e.pointerId !== p.id) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    if (!p.mode) {
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) { p.mode = 1; try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* not capturable */ } }
      else if (Math.abs(dy) > 8) { pd.current = null; return; } else return;
    }
    panned.current = true;
    const t = performance.now();
    vel.current = { v: (e.clientX - vel.current.x) / Math.max(1, t - vel.current.t), t, x: e.clientX };
    setX(clampX(p.x0 + dx));
  };
  const onUp = () => {
    const p = pd.current;
    if (p && p.mode && Math.abs(vel.current.v) > 0.2 && !reduced()) {
      let vv = vel.current.v * 16;
      const id = ++st.current.rid;
      const f = () => { if (id !== st.current.rid) return; vv *= 0.94; setX(clampX(st.current.x + vv)); if (Math.abs(vv) > 0.4) requestAnimationFrame(f); };
      requestAnimationFrame(f);
    }
    pd.current = null;
  };
  const onRow = (id: string) => { if (panned.current) { panned.current = false; return; } setOpen((o) => (o === id ? null : id)); };

  /* the dock hides in landscape (v4.1's body class, kept) */
  useEffect(() => { document.body.classList.toggle("pa41-land", land); return () => document.body.classList.remove("pa41-land"); }, [land]);

  const spans = (
    <div className="pa5bv-ctl" data-pa5="bv-spans">
      {BV_SPANS.map((s) => (
        <button key={s.k} type="button" className={`pa4-chip${spanK === s.k ? " on" : ""}`} data-pa5="bv-span" data-k={s.k} aria-pressed={spanK === s.k} onClick={() => spanTo(s.k)}><span>{s.label}</span></button>
      ))}
      <button type="button" className="pa4-ib pa5bv-rp" aria-label="Replay from the start" data-pa5="bv-replay" data-pa41="replay" onClick={replay}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.6-5.9M4 4v4.5h4.5" /></svg>
      </button>
    </div>
  );

  const nw = land ? BV_NAME_W_LAND : BV_NAME_W;
  return (
    <div ref={root} className={`pa5 pa5bv${land ? " land" : ""}`} data-pa5="birds-view" data-pa4="birds" data-pa41="birds-view" data-span={spanK} data-zoom={zoom}
      data-court={court ?? ""} data-n={rows.length} data-replay="idle"
      style={{ ["--nw" as string]: `${nw}px`, ["--tot" as string]: TOT, ["--today" as string]: T } as React.CSSProperties}>
      <header className="pa5bv-hd" data-pa5="bv-head">
        <div className="pa5bv-sw">{switcher}</div>
        {land ? spans : null}
        <div className="pa5bv-cn">{corner}</div>
      </header>
      {land ? null : spans}
      {court ? (
        <div className="pa5bv-flt" data-pa5="bv-filter" data-k={court}>
          <span>{bvFilterLabel(court, rows.length)}</span>
          <button type="button" className="pa5bv-all" data-pa5="bv-showall" onClick={onShowAll}>Show all</button>
        </div>
      ) : null}
      <div className="pa5bv-body" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} data-pa5="bv-track" data-pa41="track-area">
        <div className="pa5bv-ruler" data-pa5="bv-ruler" data-pa41="ruler" aria-hidden="true">
          <span className="pa5bv-gut" />
          <div className="pa5bv-rv" ref={lane}>
            <div className="pa5bv-cv">
              {months.map((m) => <div key={m.ms} className="pa5bv-mo" data-mo="" data-s={day(m.ms)} data-w={m.width} style={at(day(m.ms), m.width)}><b>{MONTHS_SHORT[new Date(m.ms).getMonth()]}</b></div>)}
              <b className="pa5bv-pill" ref={pill} data-pa5="bv-today" data-pa41="today-pill">Today</b>
            </div>
          </div>
        </div>
        <div className="pa5bv-content">
          <div className="pa5bv-lane" aria-hidden="true"><div className="pa5bv-cv">
            {months.map((m) => <i key={m.ms} className="pa5bv-ml" style={at(day(m.ms))} />)}
            <i className="pa5bv-now" data-pa5="bv-now" />
          </div></div>
          {shown.map((g) => {
            const fold = bvFold(g.rows, !!shownOf[g.key]);
            return (
              <section key={g.key} className="pa5bv-g" data-pa41="vgroup" data-k={g.key} data-n={g.rows.length}>
                <div className="pa5bv-gh" data-pa5="bv-group" data-k={g.key} data-n={g.rows.length}><h2 className="pa5bv-gt">{g.label}</h2><span>{g.rows.length}</span></div>
                {fold.rows.map((r) => {
                  const tk = tracks.get(r.q.id);
                  const cur = tk?.cur ?? null;
                  const stage = stageOf ? stageOf[r.q.id] : String(r.row.status);
                  const isOpen = open === r.q.id;
                  const acts = isOpen ? nextActs(r.q) : null;
                  const agency = r.row.agency && r.row.agency !== "No agency" ? r.row.agency : "";
                  return (
                    <div key={r.q.id} className={`pa5bv-row${stageOf && !stage ? " pre" : ""}${isOpen ? " op" : ""}`} data-pa5="bv-row" data-pa41="vrow"
                      data-id={r.q.id} data-court={r.court} data-from={r.line.cur?.fromMs ?? ""} data-due={r.line.dueMs ?? ""} data-past={r.line.cur?.overdue ? "1" : "0"}
                      data-status={String(r.row.status)} data-state={r.q.state} data-name={r.row.agentName}>
                      <button type="button" className="pa5bv-top" aria-expanded={isOpen} aria-controls={isOpen ? `pa5bv-d-${r.q.id}` : undefined} onClick={() => onRow(r.q.id)}>
                        <span className="pa5bv-nm" data-pa5="bv-names"><MiniTrack status={stage ?? String(r.row.status)} /><b>{land ? r.row.agentName : surname(r.row.agentName) || r.row.agentName}</b></span>
                        <span className="pa5bv-trk" aria-hidden="true"><span className="pa5bv-cv pa5bv-clip">
                          {tk?.past.map((b, i) => <i key={i} className="pa5bv-p" style={{ ...at(b.l, b.w), background: statusFill(b.status) }} />)}
                          {cur ? (<>
                            {cur.rem > 0 ? <i className={`pa5bv-rm${cur.off ? " off" : ""}`} style={{ ...at(cur.l, cur.rem), background: statusFill(cur.status) }} /> : null}
                            <i className="pa5bv-s" data-pa5="bv-solid" style={{ ...at(cur.l, cur.solid), background: statusFill(cur.status) }} />
                            {cur.deep ? <i className="pa5bv-dp" data-pa5="bv-deep" style={{ ...at(cur.deep.l, cur.deep.w), background: statusFill(cur.status) }} /> : null}
                            {cur.notch != null ? <s data-pa5="bv-notch" style={at(cur.notch)} /> : null}
                          </>) : null}
                        </span></span>
                      </button>
                      {isOpen ? (
                        <div className="pa5bv-d" id={`pa5bv-d-${r.q.id}`} data-pa5="bv-detail" data-id={r.q.id} data-pa41="expand">
                          <div className="pa4-b pa5bv-who"><b>{r.row.agentName}</b>{agency ? <span className="pa4-s"> · {agency}</span> : null}</div>
                          <div className="pa4-s pa5bv-say" data-pa5="bv-say">{longLabel(r.row, now)}</div>
                          <div className="pa5bv-xpi">
                            {[...r.row.history.spans].reverse().map((s, k) => {
                              const end = s.endMs ?? startDay(now);
                              const n = Math.max(0, Math.round((end - s.startMs) / DAY));
                              return (
                                <div key={k} className={`pa5bv-st${s.current ? "" : " old"}`} data-pa41="stage">
                                  <V3Glyph status={String(s.status)} size={28} label={false} bg="#fff" />
                                  <b>{STAGE_NAME[s.status] ?? String(s.status)}</b>
                                  <span className="pa4-s pa4-T">{dayMonth(s.startMs)} · {n} {n === 1 ? "day" : "days"}</span>
                                </div>
                              );
                            })}
                            <p className="pa4-b pa4-body pa5bv-nx" data-pa41="next-sentence">{nextSentence(r.row, now)}</p>
                          </div>
                          {acts ? <Cta pa4="vact" data-label={acts.primary.label} onClick={() => runAct(acts.primary.kind, r.q.id)}>{acts.primary.label}</Cta> : null}
                          <Link4 pa4="vopen" onClick={() => openV3Query(r.q.id)}>Open this query</Link4>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
                {fold.more ? <button type="button" className="pa5bv-fold" data-pa5="bv-fold" data-n={fold.more} onClick={() => setShownOf((o) => ({ ...o, [g.key]: true }))}>Show {fold.more} more</button> : null}
              </section>
            );
          })}
        </div>
        {!shown.length ? <p className="pa4-b pa4-empty pa5bv-empty">{court ? "None of these to place on a date." : "No open queries to place on a date."}</p> : null}
        <div className="pa5bv-end" />
      </div>
      {away ? (
        <button type="button" className="pa5bv-btt" data-pa5="bv-back" data-pa41="back-to-today" onClick={backToToday}>{away < 0 ? "‹ Back to today" : "Back to today ›"}</button>
      ) : null}
    </div>
  );
};
