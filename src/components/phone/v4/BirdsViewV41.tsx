/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v4.1 — THE FULL BIRDS-EYE VIEW (design-refs/phone-app-v4-1/phone-birds-eye-v1.html, a working prototype whose
 * behaviour is the spec): every open query on real dates, the phone version of the desktop drawer.
 *   - THE ENGINE IS THE DESKTOP VIEW'S (the Query Centre's Birds-eye at 768px and up, lib/qc150): each row's line
 *     (`beLine`), the range (`beScale`), the groups in their order (`beGroups`, urgency by due date). Months and week
 *     ticks are lib/qcTimeline's calendar helpers. Nothing here restates a rule (PA41-7); the first group is named
 *     "Past its date" (PA41-13).
 *   - Drag sideways to move through time, with inertia; vertical scroll is never captured (PA41-9).
 *   - Zoom (6 weeks / 3 months / 6 months) animates about the centre; "Back to today" appears when today is off-screen.
 *   - Once a day it replays the campaign: the today line sweeps from the first query to today (3.4s, cubic), bars clip
 *     in behind it, each glyph changes with its stage, the pill shows the date passing. Any touch skips it; the replay
 *     button runs it again; reduced motion never replays and opens settled on today (PA41-12).
 *   - A row's top line expands it in place: its stages newest first, the sentence about the next date, ONE navy
 *     button (lib/phoneV3 `nextActs`, the existing journey) and "Open this query" (PA41-10).
 *   - Long groups fold at five (PA41-8). Landscape becomes the desktop layout: a 184px name column, wide tracks, the
 *     chips in the header, no tab bar.
 */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { MONTHS_SHORT, dayMonth } from "../../../lib/dates";
import { monthBands, weekTicks } from "../../../lib/qcTimeline";
import { beLine, beScale, type BeLine } from "../../../lib/qc150";
import { STAGE_NAME, type QcRow } from "../../../lib/qcSummary";
import { ZOOM_DAYS, firstTimeToday, longLabel, nextSentence, phoneGroups, shortSay, stageOn } from "../../../lib/phoneV41";
import { nextActs, type V3Query } from "../../../lib/phoneV3";
import { useV3Data } from "../v3/V3Provider";
import { openV3Query } from "../v3/v3Store";
import { V3Glyph, statusFill } from "../v3/V3Parts";
import { CAST, Cta, Link4 } from "./V4Parts";
import { runAct } from "./acts";
import "./phoneV4.css";

const DAY = 86_400_000;
const FOLD_AT = 5;
const NAME_W = 184;
const REST_AT = 0.6;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const reduced = (): boolean => { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; } };
const startDay = (ms: number): number => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
const useLandscape = (): boolean => {
  const read = () => typeof window !== "undefined" && window.innerWidth > window.innerHeight && window.innerHeight < 560;
  const [l, setL] = useState(read);
  useEffect(() => { const f = () => setL(read()); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, []);
  return l;
};

/** a past bar's stage: the history span that starts where the bar does */
const pastStatus = (row: QcRow, fromMs: number, i: number): string =>
  String(row.history.spans.find((s) => s.startMs === fromMs)?.status ?? row.history.spans.filter((s) => !s.current)[i]?.status ?? row.status);

interface RowM { q: V3Query; row: QcRow; line: BeLine; group: string }

export const BirdsViewV41: React.FC<{ switcher: React.ReactNode; corner: React.ReactNode }> = ({ switcher, corner }) => {
  const v = useV3Data();
  const now = v.now;
  const loc = useLocation();
  const focusId = new URLSearchParams(loc.search).get("focus");
  const land = useLandscape();

  /* ── the engine ── */
  const byId = v.byId;
  const groups = useMemo(() => phoneGroups(v.qs.map((q) => q.row as QcRow), now), [v.qs, now]);
  const rows: RowM[] = useMemo(() => groups.flatMap((g) => g.rows.map((e) => ({ q: byId.get(e.id)!, row: e.row, line: beLine(e, now), group: g.key }))).filter((r) => r.q), [groups, byId, now]);
  /* the desktop view's own range (beScale) at its widest zoom, so the track's extent is the same at every zoom */
  const ext = useMemo(() => { const sc = beScale(rows.map((r) => r.line), 182, 182, now); return { fromMs: sc.r0, toMs: sc.r1, days: Math.max(1, Math.round((sc.r1 - sc.r0) / DAY)) }; }, [rows, now]);
  const day = useCallback((ms: number) => (ms - ext.fromMs) / DAY, [ext.fromMs]);
  const T = day(startDay(now));
  const TOT = ext.days;
  const months = useMemo(() => monthBands(ext, 1), [ext]);
  const weeks = useMemo(() => weekTicks(ext, 1), [ext]);
  const firstDay = useMemo(() => { const s = rows.map((r) => r.row.sentMs).filter((m): m is number => m != null); return s.length ? day(Math.min(...s)) : T; }, [rows, day, T]);
  const live = rows.length;
  const pastN = rows.filter((r) => r.row.expectedMs != null && r.row.expectedMs < now).length;
  const settledSub = `${live} live ${live === 1 ? "query" : "queries"}${pastN ? ` · ${pastN} past ${pastN === 1 ? "its date" : "their date"}` : ""}`;

  /* ── state the render reads ── */
  const [zoom, setZoom] = useState(90);
  const [open, setOpen] = useState<string | null>(focusId);
  const [shownOf, setShownOf] = useState<Record<string, boolean>>({});
  const [stageOf, setStageOf] = useState<Record<string, string | null> | null>(null);
  const [popOf, setPopOf] = useState<Record<string, number>>({});
  const [away, setAway] = useState<0 | -1 | 1>(0);

  /* ── the moving parts, kept off React's render (CSS variables on the root) ── */
  const root = useRef<HTMLDivElement>(null);
  const lane = useRef<HTMLDivElement>(null);
  const pill = useRef<HTMLElement>(null);
  const sub = useRef<HTMLSpanElement>(null);
  const st = useRef({ W: 360, ppd: 4, x: 0, cur: TOT, replaying: false, rid: 0 });
  const setVar = (k: string, val: number) => root.current?.style.setProperty(k, String(val));
  const clampX = useCallback((x: number) => Math.max(Math.min(x, 16), st.current.W - TOT * st.current.ppd - 16), [TOT]);
  const restX = useCallback(() => clampX(REST_AT * st.current.W - T * st.current.ppd), [clampX, T]);
  const stick = useCallback(() => {
    const s = st.current, el = root.current;
    if (!el) return;
    const nowX = T * s.ppd + s.x;
    const off: 0 | -1 | 1 = s.replaying ? 0 : nowX < 8 ? -1 : nowX > s.W - 8 ? 1 : 0;
    setAway((a) => (a === off ? a : off));
    el.dataset.x = String(Math.round(s.x));
    /* labels stick to the visible left edge as the track moves */
    for (const l of el.querySelectorAll<HTMLElement>("[data-lb]")) {
      const s0 = Number(l.dataset.s), bw = Number(l.dataset.w) * s.ppd - 2, w = Number(l.dataset.lw || 0);
      const left = s0 * s.ppd + s.x;
      (l.firstElementChild as HTMLElement).style.transform = `translateX(${Math.max(0, Math.min(-left, bw - w - 20))}px)`;
    }
    for (const m of el.querySelectorAll<HTMLElement>("[data-mo]")) {
      const left = Number(m.dataset.s) * s.ppd + s.x, mw = Number(m.dataset.w) * s.ppd;
      const b = m.firstElementChild as HTMLElement;
      b.style.transform = `translateX(${Math.max(0, Math.min(-left, mw - 44))}px)`;
      b.style.visibility = mw < 40 ? "hidden" : "";
    }
  }, [T]);
  const setX = useCallback((x: number) => { st.current.x = x; setVar("--x", x); stick(); }, [stick]);
  const setPpd = (p: number) => { st.current.ppd = p; setVar("--ppd", p); root.current?.classList.toggle("far", p < 3.4); if (root.current) root.current.dataset.ppd = p.toFixed(3); };
  /** each bar's label: the long form, then the short, then none, whichever fits */
  const labels = useCallback(() => {
    const el = root.current;
    if (!el) return;
    for (const l of el.querySelectorAll<HTMLElement>("[data-lb]")) {
      const sp = l.firstElementChild as HTMLElement, bw = Number(l.dataset.w) * st.current.ppd - 2;
      sp.style.visibility = "";
      sp.textContent = l.dataset.long ?? "";
      if (sp.offsetWidth + 20 > bw) { sp.textContent = l.dataset.short ?? ""; if (sp.offsetWidth + 20 > bw) sp.style.visibility = "hidden"; }
      l.dataset.lw = String(sp.offsetWidth);
    }
    stick();
  }, [stick]);
  const tween = (ms: number, fn: (t: number) => void, done?: () => void) => {
    const id = ++st.current.rid, t0 = performance.now();
    const f = (n: number) => { if (id !== st.current.rid) return; const t = Math.min(1, (n - t0) / ms); fn(ease(t)); if (t < 1) requestAnimationFrame(f); else done?.(); };
    requestAnimationFrame(f);
  };

  /* ── the replay ── */
  const setCur = useCallback((c: number, live2: boolean) => {
    st.current.cur = c;
    setVar("--cur", c); setVar("--now", Math.min(c, T));
    const dayMs = ext.fromMs + Math.min(c, T) * DAY;
    const next: Record<string, string | null> = {};
    let out = 0;
    for (const r of rows) { const k = stageOn(r.row, dayMs); next[r.q.id] = k; if (k) out++; }
    setStageOf((prev) => {
      if (prev && rows.every((r) => prev[r.q.id] === next[r.q.id])) return prev;
      if (live2 && prev) setPopOf((p) => { const o = { ...p }; for (const r of rows) if (prev[r.q.id] && prev[r.q.id] !== next[r.q.id]) o[r.q.id] = (o[r.q.id] ?? 0) + 1; return o; });
      return next;
    });
    if (pill.current) pill.current.textContent = c >= T - 0.5 ? "Today" : dayMonth(dayMs);
    if (sub.current) sub.current.textContent = c >= T - 0.5 ? settledSub : `${out} ${out === 1 ? "query" : "queries"} out`;
  }, [T, ext.fromMs, rows, settledSub]);
  const finish = useCallback(() => {
    st.current.replaying = false;
    root.current?.classList.add("done");
    if (root.current) root.current.dataset.replay = "done";
    setStageOf(null);
    setCur(TOT, false); setVar("--now", T);
    setX(restX());
  }, [setCur, TOT, T, setX, restX]);
  const replay = useCallback(() => {
    setOpen(null);
    if (reduced()) { finish(); return; }
    st.current.replaying = true;
    root.current?.classList.remove("done");
    if (root.current) root.current.dataset.replay = "running";
    const W = st.current.W;
    tween(3400, (t) => { const c = firstDay + (T - firstDay) * t; setCur(c, true); setX(clampX(Math.min(16, REST_AT * W - c * st.current.ppd))); }, () => {
      const x0 = st.current.x, x1 = restX();
      tween(520, (t) => { setVar("--cur", T + (TOT - T) * t); setX(x0 + (x1 - x0) * t); }, finish);
    });
  }, [finish, firstDay, T, TOT, setCur, setX, clampX, restX]);

  /* ── layout: lane width, zoom ── */
  const layout = useCallback(() => {
    const el = lane.current;
    if (!el) return;
    st.current.W = Math.max(120, el.clientWidth);
    setPpd(st.current.W / zoom);
    setX(st.current.replaying ? st.current.x : restX());
    labels();
  }, [zoom, setX, restX, labels]);
  useLayoutEffect(() => {
    setVar("--tot", TOT);
    setCur(TOT, false); setVar("--now", T);
    layout();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => layout()) : null;
    if (ro && lane.current) ro.observe(lane.current);
    return () => ro?.disconnect();
  }, [land]); // eslint-disable-line react-hooks/exhaustive-deps
  /* the replay: once a day, never with reduced motion, never when arriving at a chosen query */
  useEffect(() => {
    if (focusId) {
      finish();
      requestAnimationFrame(() => root.current?.querySelector<HTMLElement>(`[data-pa41="vrow"][data-id="${CSS.escape(focusId)}"]`)?.scrollIntoView({ block: "center" }));
      return;
    }
    if (!reduced() && firstTimeToday("pa41.birds-view.replayed", Date.now())) { const t = setTimeout(replay, 350); return () => clearTimeout(t); }
    finish();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const zoomTo = (days: number) => {
    if (st.current.replaying) { st.current.rid++; finish(); }
    const a = st.current.ppd, b = st.current.W / days, anchor = (REST_AT * st.current.W - st.current.x) / a;
    setZoom(days);
    for (const l of root.current?.querySelectorAll<HTMLElement>("[data-lb] > span") ?? []) l.style.visibility = "hidden";
    if (reduced()) { setPpd(b); setX(clampX(REST_AT * st.current.W - anchor * b)); labels(); return; }
    tween(450, (t) => { setPpd(a + (b - a) * t); setX(clampX(REST_AT * st.current.W - anchor * st.current.ppd)); }, labels);
  };
  const backToToday = () => { const a = st.current.x, b = restX(); if (reduced()) setX(b); else tween(420, (t) => setX(a + (b - a) * t)); };

  /* ── pan: a horizontal drag moves the track, with inertia; a vertical one is the page's (touch-action: pan-y) ── */
  const pd = useRef<{ x: number; y: number; x0: number; mode: 0 | 1; id: number } | null>(null);
  const panned = useRef(false);
  const vel = useRef({ v: 0, t: 0, x: 0 });
  const onDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button, a, [data-pa41='expand']")) return;
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
  const onTop = (id: string) => { if (panned.current) { panned.current = false; return; } setOpen((o) => (o === id ? null : id)); };

  /* the tab bar hides in landscape */
  useEffect(() => { document.body.classList.toggle("pa41-land", land); return () => document.body.classList.remove("pa41-land"); }, [land]);

  const chips = (
    <div className="pa41v-ctl" data-pa41="zooms">
      {ZOOM_DAYS.map(([k, l, d]) => (
        <button key={k} type="button" className={`pa4-chip${zoom === d ? " on" : ""}`} data-pa41="zoom" data-k={k} aria-pressed={zoom === d} onClick={() => zoomTo(d)}><span>{l}</span></button>
      ))}
      <button type="button" className="pa4-ib pa41v-rp" aria-label="Replay from the start" data-pa41="replay" onClick={replay}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.6-5.9M4 4v4.5h4.5" /></svg>
      </button>
    </div>
  );

  const S = (ms: number) => day(ms);
  return (
    <div ref={root} className={`pa41v${land ? " land" : ""}${open ? " focus" : ""}`} data-pa4="birds" data-pa41="birds-view" data-zoom={zoom} data-replay="idle"
      style={{ ["--ll" as string]: land ? `${NAME_W}px` : "0px", ["--today" as string]: T } as React.CSSProperties}>
      <header className="pa4-hero pa41v-hd" data-pa4="birds-hero">
        <img className="pa4-shadow" src={CAST.shadow} alt="" />
        <div className="pa41v-ht">
          <div style={{ minWidth: 0 }}><h1 className="pa4-d2" data-pa4="headline">Birds-eye view</h1><span className="pa4-s pa41v-sub" ref={sub} data-pa41="sub">{settledSub}</span></div>
          {land ? chips : <img src={CAST.beHead} alt="" data-pa4="cast" className="pa41v-head" />}
          <div className="pa4-corner">{corner}</div>
        </div>
        {land ? null : <div style={{ position: "relative", marginTop: 16 }}>{switcher}</div>}
      </header>
      {land ? null : chips}
      <div className="pa41v-body" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} data-pa41="track-area">
        <div className="pa41v-ruler" data-pa41="ruler">
          <div className="pa41v-rv" ref={lane}>
            <div className="pa41v-cv">
              {months.map((m) => {
                const s0 = S(m.ms), w = m.width;
                return <div key={m.ms} className={`pa41v-mo${m.alt ? " alt" : ""}`} data-mo="" data-s={s0} data-w={w} style={{ ["--s" as string]: s0, ["--w" as string]: w } as React.CSSProperties}><b>{MONTHS_SHORT[new Date(m.ms).getMonth()]}</b></div>;
              })}
              {weeks.filter((k) => { const d = new Date(k.ms).getDate(); return d > 3 && d < 27; }).map((k) => <span key={k.ms} className="pa41v-wk" style={{ ["--s" as string]: S(k.ms) } as React.CSSProperties}>{k.label}</span>)}
              <b className="pa41v-pill" ref={pill} data-pa41="today-pill">Today</b>
            </div>
          </div>
        </div>
        <div className="pa41v-content">
          <div className="pa41v-lane" aria-hidden="true"><div className="pa41v-cv">
            {months.map((m) => <i key={m.ms} className="pa41v-ml" style={{ ["--s" as string]: S(m.ms) } as React.CSSProperties} />)}
            <i className="pa41v-nl" data-pa41="now-line" />
          </div></div>
          {groups.map((g) => {
            const mine = rows.filter((r) => r.group === g.key);
            const folded = mine.length > FOLD_AT && !shownOf[g.key];
            return (
              <section key={g.key} data-pa41="vgroup" data-k={g.key} data-n={mine.length}>
                <div className="pa41v-gh"><h2 className="pa4-T pa41v-gt">{g.label}</h2><span className="pa4-s">{mine.length}</span></div>
                {(folded ? mine.slice(0, FOLD_AT) : mine).map((r) => {
                  const say = shortSay(r.row, now);
                  const cur = r.line.cur;
                  const shownStage = stageOf ? stageOf[r.q.id] : String(r.row.status);
                  const acts = nextActs(r.q);
                  const isOpen = open === r.q.id;
                  return (
                    <div key={r.q.id} className={`pa41v-row${stageOf && !shownStage ? " pre" : ""}${isOpen ? " open" : ""}`} data-pa41="vrow" data-id={r.q.id} data-state={r.q.state} data-name={r.row.agentName}>
                      <button type="button" className="pa41v-top" data-pa41="vtop" aria-expanded={isOpen} onClick={() => onTop(r.q.id)}>
                        <span key={popOf[r.q.id] ?? 0} className={popOf[r.q.id] ? "pa41v-pop" : ""}><V3Glyph status={shownStage ?? String(r.row.status)} size={28} label={false} /></span>
                        <span className="pa41v-who"><b>{r.row.agentName}</b><i>{r.row.agency && r.row.agency !== "No agency" ? r.row.agency : ""}</i></span>
                        <span className={`pa4-T pa41v-say${say.past ? " hot" : ""}`} data-pa41="say">{say.text}</span>
                      </button>
                      <div className="pa41v-trk" aria-hidden="true"><div className="pa41v-cv pa41v-clip">
                        {r.line.past.map((b, i) => (
                          <i key={b.key} className="pa41v-bar past" data-pa41="past" data-from={b.fromMs} data-to={b.toMs} style={{ ["--s" as string]: S(b.fromMs), ["--w" as string]: Math.max(1.5, (b.toMs - b.fromMs) / DAY), background: statusFill(pastStatus(r.row, b.fromMs, i)) } as React.CSSProperties} />
                        ))}
                        {cur ? (r.line.dueMs == null ? (<>
                          <i className="pa41v-bar nod" data-pa41="cur" data-from={cur.fromMs} data-to={cur.toMs} style={{ ["--s" as string]: S(cur.fromMs), ["--w" as string]: T - S(cur.fromMs) + 6, background: statusFill(String(r.row.status)) } as React.CSSProperties} />
                          <span className="pa41v-lb" data-lb="" data-s={S(cur.fromMs)} data-w={Math.max(1, T - S(cur.fromMs))} data-long={cur.stage} data-short={cur.stage} style={{ ["--s" as string]: S(cur.fromMs), ["--w" as string]: Math.max(1, T - S(cur.fromMs)) } as React.CSSProperties}><span /></span>
                        </>) : (() => {
                          /* past its date the bar ends at the date and the overrun line runs on to today (the prototype's
                             drawing); the bar's own dates stay the engine's, on data-from / data-to (PA41-7) */
                          const due = r.line.dueMs;
                          const w = (due - cur.fromMs) / DAY;
                          return (<>
                            {cur.overdue ? null : <i className="pa41v-bar rem" style={{ ["--s" as string]: S(cur.fromMs), ["--w" as string]: w, background: statusFill(String(r.row.status)) } as React.CSSProperties} />}
                            <i className="pa41v-bar" data-pa41="cur" data-from={cur.fromMs} data-to={cur.toMs} style={{ ["--s" as string]: S(cur.fromMs), ["--w" as string]: Math.max(0, Math.min(T, S(due)) - S(cur.fromMs)), background: statusFill(String(r.row.status)) } as React.CSSProperties} />
                            {cur.overdue ? (<>
                              <i className="pa41v-ov" style={{ ["--s" as string]: S(due), ["--w" as string]: T - S(due) } as React.CSSProperties} />
                              <i className="pa41v-bc" data-pa41="beacon" style={{ ["--s" as string]: T } as React.CSSProperties} />
                            </>) : null}
                            <span className="pa41v-lb" data-lb="" data-s={S(cur.fromMs)} data-w={w} data-long={longLabel(r.row, now)} data-short={cur.stage}
                              style={{ ["--s" as string]: S(cur.fromMs), ["--w" as string]: w } as React.CSSProperties}><span /></span>
                          </>);
                        })()) : null}
                      </div></div>
                      <div className="pa41v-xp" data-pa41="expand"><div>
                        {isOpen ? (
                          <div className="pa41v-xpi">
                            <div>
                              {[...r.row.history.spans].reverse().map((s, k) => {
                                const end = s.endMs ?? startDay(now);
                                const n = Math.max(0, Math.round((end - s.startMs) / DAY));
                                return (
                                  <div key={k} className={`pa41v-st${s.current ? "" : " old"}`} data-pa41="stage">
                                    <V3Glyph status={String(s.status)} size={28} label={false} bg="#fff" />
                                    <b>{STAGE_NAME[s.status] ?? String(s.status)}</b>
                                    <span className="pa4-s pa4-T">{dayMonth(s.startMs)} · {n} {n === 1 ? "day" : "days"}</span>
                                  </div>
                                );
                              })}
                              <p className="pa4-b pa4-body pa41v-nx" data-pa41="next-sentence">{nextSentence(r.row, now)}</p>
                            </div>
                            <div>
                              {acts ? <Cta pa4="vact" data-label={acts.primary.label} onClick={() => runAct(acts.primary.kind, r.q.id)}>{acts.primary.label}</Cta> : null}
                              <Link4 pa4="vopen" onClick={() => openV3Query(r.q.id)}>Open this query</Link4>
                            </div>
                          </div>
                        ) : null}
                      </div></div>
                    </div>
                  );
                })}
                {folded ? <Link4 pa4="fold" data-pa41="fold" data-n={mine.length - FOLD_AT} onClick={() => setShownOf((o) => ({ ...o, [g.key]: true }))}>Show {mine.length - FOLD_AT} more</Link4> : null}
              </section>
            );
          })}
          {!groups.length ? <p className="pa4-b pa4-empty" style={{ padding: "16px 24px" }}>No open queries to place on a date.</p> : null}
        </div>
      </div>
      {away ? (
        <button type="button" className="pa41v-btt" data-pa41="back-to-today" onClick={backToToday}>{away < 0 ? "‹ Back to today" : "Back to today ›"}</button>
      ) : null}
    </div>
  );
};
