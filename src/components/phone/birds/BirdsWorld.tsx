/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone Birds-eye world v1 (design-refs/phone-birds-eye-world-v1/phone-birds-eye-world-v1.html) — THE VIEW. Below 768px
 * only: the Birds-eye side of the Queries list's List | Birds-eye switch. One canvas you zoom and pan, every live query
 * against one finish line.
 *   - THE ENGINE IS lib/birdsWorld (the desktop's `beLine` over `eyeRows`, the ref's maths); THE FRAME IS drawWorld (the
 *     ref's `draw()`), one layer rebuilt per animation frame in screen space. React renders the shell once; nothing
 *     here re-renders per pointer move (the view state lives in a ref).
 *   - The header is the ref's compact navy band: "Birds-eye", then back, list, replay and search; under it the four
 *     count chips, which filter (their counts never change with the filter). Zoomed in (z > 1.05) it folds; a chosen
 *     filter shows as one white chip beside the title. The build adds back (the shell's pushed header is covered) and
 *     List (the switch's other side), named in the report.
 *   - The axis is each query's reply date; `?be=calendar` lines the rows up on today instead (Nick to rule).
 *   - Phase 3: pinch, drag, glide, wheel and Ctrl+wheel, double tap (worldMotion); + / −, "See it all", the mini map,
 *     the first-visit hint (remembered under BW_HINT_KEY); the line's edge-pinned pill glides the line back to 62%
 *     across; the hawk's shadow (`?hawk=0` turns it off — Nick to rule); replay; a tap opens the query sheet the
 *     Queries list's row opens (`openV3Query`).
 *   - Replay: a tap zooms out to fit, then draws each row's stages in from its first date to today, in date order,
 *     over 1.8s; any touch skips it; reduced motion never replays. v5's once-a-day automatic replay is retired here.
 * ⚠️ COPY: never "overdue" or "late".
 */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { useV3Data } from "../v3/V3Provider";
import { openV3, openV3Query } from "../v3/v3Store";
import { eyeRows } from "../../../lib/qcBirdsEye";
import type { QcRow } from "../../../lib/qcSummary";
import {
  BW_CHIPS, CHIP_WORDS, RULE, axisExt, bwCounts, bwGroups, bwRow, chipForCourt, level, makeWorld, type BwAxis, type BwFilter, type BwView, type World,
} from "../../../lib/birdsWorldV1";
import { drawMini, drawWorld } from "./drawWorld";
import { shadowStyle, wireMotion, type Motion } from "./worldMotion";
import "./birdsWorld.css";

const I = (d: string, w = 1.8) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: d }} />
);
export const BW_IC = {
  search: '<circle cx="11" cy="11" r="7"/><path d="M16.5 16.5L21 21"/>',
  play: '<path d="M8 5l11 7-11 7z"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
};

/** a phone on its side (v5's rule, kept): wider than tall and under 560px tall */
export const useLandscape = (): boolean => {
  const read = () => typeof window !== "undefined" && window.innerWidth > window.innerHeight && window.innerHeight < 560;
  const [l, setL] = useState(read);
  useEffect(() => { const f = () => setL(read()); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, []);
  return l;
};
/** the dock's height, read off the page (the ref's 104 was its own dock plus 42; the build keeps the dock + 16) */
const dockHeight = (): number => {
  if (typeof document === "undefined") return 72;
  const d = document.querySelector<HTMLElement>('[data-pa5="dock"]');
  const r = d?.getBoundingClientRect();
  return r && r.height > 0 && getComputedStyle(d!).display !== "none" ? Math.round(window.innerHeight - r.top) : 72;
};

/** the first-visit hint, seen (a new key: v5's replay key is retired with its view) */
export const BW_HINT_KEY = "bw1.hint.seen";
export const BW_SHADOW = { src: "/images/hawk-shadow.png", version: 1 };
const REPLAY_MS = 1800;
const calm = (): boolean => { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; } };
const hintSeen = (): boolean => { try { return window.localStorage.getItem(BW_HINT_KEY) === "1"; } catch { return true; } };

export interface BirdsWorldProps {
  /** the `&court=` the list arrived with; the nearest chip filter is applied */
  court?: string | null;
  onBack: () => void;
  onList: () => void;
}

export const BirdsWorld: React.FC<BirdsWorldProps> = ({ court = null, onBack, onList }) => {
  const v = useV3Data();
  const now = v.now;
  const loc = useLocation();
  const q = new URLSearchParams(loc.search);
  const axis: BwAxis = q.get("be") === "calendar" ? "calendar" : "reply";
  const hawk = q.get("hawk") !== "0";
  const land = useLandscape();

  /* ── the engine ── */
  const live = useMemo(() => eyeRows(v.qs.map((x) => x.row as QcRow), now).map((e) => bwRow(e, now)), [v.qs, now]);
  const counts = useMemo(() => bwCounts(live), [live]);
  const ext = useMemo(() => axisExt(live, axis), [live, axis]);
  const [filter, setFilter] = useState<BwFilter>(() => chipForCourt(court));
  useEffect(() => { setFilter(chipForCourt(court)); }, [court]);
  const groups = useMemo(() => bwGroups(live, filter), [live, filter]);

  /* ── the view state, off React's render ── */
  const root = useRef<HTMLDivElement>(null);
  const vp = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const hd = useRef<HTMLDivElement>(null);
  const W = useRef<World | null>(null);
  const S = useRef<BwView>({ z: 1, ox: 0, oy: 0 });
  const frame = useRef(0);
  const mini = useRef<HTMLDivElement>(null);
  const fit = useRef<HTMLButtonElement>(null);
  const zin = useRef<HTMLButtonElement>(null);
  const zout = useRef<HTMLButtonElement>(null);
  const hs = useRef<HTMLImageElement>(null);
  const hint = useRef<HTMLDivElement>(null);
  const motion = useRef<Motion | null>(null);
  /** the replay's front, in calendar days (null: everything drawn) */
  const clip = useRef<{ c: number | null; raf: number }>({ c: null, raf: 0 });
  const [showHint] = useState(() => !hintSeen());

  const paint = useCallback(() => {
    const w = W.current, el = layer.current;
    if (!w || !el) return;
    const Sv = S.current;
    const f = drawWorld(w, Sv, { axis, nowMs: now, clip: clip.current.c, sel: null });
    el.innerHTML = f.html;
    hd.current?.classList.toggle("col", f.zoomed || w.land);
    fit.current?.classList.toggle("hide", !f.zoomed);
    if (zin.current) zin.current.disabled = Sv.z >= w.maxZ - 1e-6;
    if (zout.current) zout.current.disabled = Sv.z <= 1 + 1e-6;
    const m = mini.current;
    if (m) { m.classList.toggle("hide", !f.zoomed); if (f.zoomed) m.innerHTML = drawMini(w, Sv, axis); }
    if (hs.current) Object.assign(hs.current.style, shadowStyle(Sv.z, Sv.ox, Sv.oy, w.fitView()));
    const r = root.current;
    if (r) {
      const rp = w.rowPx(Sv.z);
      r.dataset.z = Sv.z.toFixed(3); r.dataset.rp = rp.toFixed(2); r.dataset.level = level(rp); r.dataset.off = String(f.off);
      r.dataset.ox = Sv.ox.toFixed(2); r.dataset.oy = Sv.oy.toFixed(2); r.dataset.sx = w.SX(Sv.z).toFixed(5);
      r.dataset.d0 = String(w.ext.D0); r.dataset.ppd = w.PPD.toFixed(6); r.dataset.gap = w.gapPx(Sv.z).toFixed(2);
      r.dataset.top = String(f.top + RULE);
    }
  }, [axis, now]);
  /* every draw goes through one frame: many pointer moves in a frame are one paint */
  const draw = useCallback(() => { if (frame.current) return; frame.current = requestAnimationFrame(() => { frame.current = 0; paint(); }); }, [paint]);

  const build = useCallback((keep: boolean) => {
    const el = vp.current;
    if (!el) return;
    const bot = land ? 16 : dockHeight() + 16;
    W.current = makeWorld({ groups, ext, vpW: el.clientWidth || 390, vpH: el.clientHeight || 784, bot, land });
    root.current?.style.setProperty("--bw-cb", `${bot + 8}px`);
    S.current = keep ? W.current.clamp(S.current) : W.current.fitView();
    paint();
  }, [groups, ext, land, paint]);

  useLayoutEffect(() => { build(false); }, [groups, ext, land]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const el = vp.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(() => build(true));
    ro.observe(el);
    return () => ro.disconnect();
  }, [build]);
  useEffect(() => () => { cancelAnimationFrame(frame.current); cancelAnimationFrame(clip.current.raf); }, []);

  /* ── replay ── */
  const endReplay = useCallback(() => {
    if (clip.current.c == null) return;
    cancelAnimationFrame(clip.current.raf); clip.current.c = null;
    if (root.current) root.current.dataset.replay = "done";
    draw();
  }, [draw]);
  const replay = useCallback(() => {
    const w = W.current;
    if (!w || calm()) return;
    motion.current?.stop();
    S.current = w.fitView();
    const first = Math.min(0, ...w.G.flatMap((g) => g.rows.flatMap((p) => p.r.ev.map((e) => e.d))));
    const t0 = performance.now();
    if (root.current) root.current.dataset.replay = "running";
    const step = (n: number) => {
      const k = Math.min(1, (n - t0) / REPLAY_MS);
      clip.current.c = first + (0 - first) * k;
      paint();
      if (k < 1) clip.current.raf = requestAnimationFrame(step); else endReplay();
    };
    clip.current.c = first;
    clip.current.raf = requestAnimationFrame(step);
  }, [paint, endReplay]);

  /* ── movement (phase 3) ── */
  const touched = useCallback(() => {
    endReplay();
    const h = hint.current;
    if (h && !h.classList.contains("hide")) { h.classList.add("hide"); try { window.localStorage.setItem(BW_HINT_KEY, "1"); } catch { /* storage refused */ } }
  }, [endReplay]);
  useEffect(() => {
    const el = vp.current;
    if (!el) return undefined;
    const m = wireMotion({ vp: el, world: () => W.current, S, draw, calm, touched, openRow: (id) => openV3Query(id) });
    motion.current = m;
    return () => { m.dispose(); motion.current = null; };
  }, [draw, touched]);
  /* the controls and the line's pill: one delegate (the pill is redrawn every frame) */
  const onClick = (e: React.MouseEvent) => {
    const b = (e.target as Element).closest<HTMLElement>("[data-a]"), w = W.current, m = motion.current;
    if (!b || !w || !m) return;
    const a = b.dataset.a, Sv = S.current;
    touched();
    if (a === "zin") m.zoomAt(w.vpW / 2, (w.vpH - 80) / 2, 1.8);
    else if (a === "zout") m.zoomAt(w.vpW / 2, (w.vpH - 80) / 2, 1 / 1.8);
    else if (a === "fit") m.animateTo(w.fitView(), 420);
    else if (a === "toline") m.animateTo(w.clamp({ z: Sv.z, ox: w.vpW * 0.62 - w.LINE * w.SX(Sv.z), oy: Sv.oy }), 380);
  };
  /* the dock hides in landscape (v4.1's body class, kept) */
  useEffect(() => { document.body.classList.toggle("pa41-land", land); return () => document.body.classList.remove("pa41-land"); }, [land]);

  const pick = (k: BwFilter) => setFilter((f) => (f === k || k === "all" ? "all" : k));

  const body = (
    <div ref={root} className={`pa-layer bw${land ? " land" : ""}`} data-bw="world" data-pa5="birds-view" data-axis={axis} data-filter={filter}
      data-n={groups.reduce((a, g) => a + g.rows.length, 0)} data-court={court ?? ""} data-replay="idle" data-hawk={hawk ? "1" : "0"} onClick={onClick}>
      <div ref={vp} className="bw-vp" data-bw="vp">
        <div ref={layer} className="bw-w" data-bw="layer" />
        {!groups.length ? <p className="bw-empty" data-bw="empty">{filter === "all" ? "No open queries to place on a date." : "None of these right now."}</p> : null}
        <div ref={hint} className={`bw-hint${showHint ? "" : " hide"}`} data-bw="hint">Pinch to zoom · drag to explore</div>
        <div ref={mini} className="bw-mini hide" data-bw="mini" aria-hidden="true" />
        <button ref={fit} type="button" className="bw-fit hide" data-bw="fit" data-a="fit">See it all</button>
        <div className="bw-zc" data-bw="zoom">
          <button ref={zin} type="button" data-a="zin" data-bw="zin" aria-label="Zoom in">{I(BW_IC.plus, 2.2)}</button>
          <button ref={zout} type="button" data-a="zout" data-bw="zout" aria-label="Zoom out" disabled>{I(BW_IC.minus, 2.2)}</button>
        </div>
      </div>
      {hawk ? <div className="bw-hsw" data-bw="hawk" aria-hidden="true"><img ref={hs} className="bw-hs" alt="" src={`${BW_SHADOW.src}?v=${BW_SHADOW.version}`} /></div> : null}
      <div ref={hd} className={`bw-hd${land ? " col" : ""}`} data-bw="head">
        <div className="bw-t2">
          <button type="button" className="bw-ib back" aria-label="Back" data-bw="back" onClick={onBack}>{I(BW_IC.back, 2)}</button>
          <h1 className="bw-h">Birds-eye</h1>
          {filter !== "all" ? <button type="button" className="bw-fon" data-bw="fon" data-k={filter} onClick={() => pick("all")}>{CHIP_WORDS[filter]} ✕</button> : null}
          <button type="button" className="bw-ib" aria-label="List" data-bw="list" onClick={onList}>{I(BW_IC.list, 2)}</button>
          <button type="button" className="bw-ib" aria-label="Replay" data-bw="replay" onClick={() => { touched(); replay(); }}>{I(BW_IC.play)}</button>
          <button type="button" className="bw-ib" aria-label="Search" data-bw="search" onClick={() => openV3({ type: "search" })}>{I(BW_IC.search)}</button>
        </div>
        <div className="bw-chips" data-bw="chips">
          {BW_CHIPS.map((k) => (
            <button key={k} type="button" className={`bw-c2${filter === k ? " on" : ""}`} aria-pressed={filter === k} data-bw="chip" data-k={k} data-n={counts[k]} onClick={() => pick(k)}>
              <b>{counts[k]}</b> {CHIP_WORDS[k]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
  return typeof document === "undefined" ? body : createPortal(body, document.body);
};
