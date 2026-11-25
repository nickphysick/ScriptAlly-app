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
 * ⚠️ COPY: never "overdue" or "late".
 */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { useV3Data } from "../v3/V3Provider";
import { openV3 } from "../v3/v3Store";
import { eyeRows } from "../../../lib/qcBirdsEye";
import type { QcRow } from "../../../lib/qcSummary";
import {
  BW_CHIPS, CHIP_WORDS, axisExt, bwCounts, bwGroups, bwRow, chipForCourt, level, makeWorld, type BwAxis, type BwFilter, type BwView, type World,
} from "../../../lib/birdsWorld";
import { drawWorld } from "./drawWorld";
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

  const draw = useCallback(() => {
    const w = W.current, el = layer.current;
    if (!w || !el) return;
    const f = drawWorld(w, S.current, { axis, nowMs: now, clip: null, sel: null });
    el.innerHTML = f.html;
    hd.current?.classList.toggle("col", f.zoomed || w.land);
    const r = root.current;
    if (r) { r.dataset.z = S.current.z.toFixed(3); r.dataset.rp = w.rowPx(S.current.z).toFixed(2); r.dataset.level = level(w.rowPx(S.current.z)); r.dataset.off = String(f.off); }
  }, [axis, now]);
  const schedule = useCallback(() => { if (frame.current) return; frame.current = requestAnimationFrame(() => { frame.current = 0; draw(); }); }, [draw]);

  const build = useCallback((keep: boolean) => {
    const el = vp.current;
    if (!el) return;
    const bot = land ? 16 : dockHeight() + 16;
    W.current = makeWorld({ groups, ext, vpW: el.clientWidth || 390, vpH: el.clientHeight || 784, bot, land });
    root.current?.style.setProperty("--bw-cb", `${bot + 8}px`);
    S.current = keep ? W.current.clamp(S.current) : W.current.fitView();
    draw();
  }, [groups, ext, land, draw]);

  useLayoutEffect(() => { build(false); }, [groups, ext, land]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const el = vp.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(() => build(true));
    ro.observe(el);
    return () => ro.disconnect();
  }, [build]);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  /* the dock hides in landscape (v4.1's body class, kept) */
  useEffect(() => { document.body.classList.toggle("pa41-land", land); return () => document.body.classList.remove("pa41-land"); }, [land]);
  void schedule;

  const pick = (k: BwFilter) => setFilter((f) => (f === k || k === "all" ? "all" : k));

  const body = (
    <div ref={root} className={`pa-layer bw${land ? " land" : ""}`} data-bw="world" data-pa5="birds-view" data-axis={axis} data-filter={filter}
      data-n={groups.reduce((a, g) => a + g.rows.length, 0)} data-court={court ?? ""} data-replay="idle">
      <div ref={vp} className="bw-vp" data-bw="vp">
        <div ref={layer} className="bw-w" data-bw="layer" />
        {!groups.length ? <p className="bw-empty" data-bw="empty">{filter === "all" ? "No open queries to place on a date." : "None of these right now."}</p> : null}
      </div>
      <div ref={hd} className={`bw-hd${land ? " col" : ""}`} data-bw="head">
        <div className="bw-t2">
          <button type="button" className="bw-ib back" aria-label="Back" data-bw="back" onClick={onBack}>{I(BW_IC.back, 2)}</button>
          <h1 className="bw-h">Birds-eye</h1>
          {filter !== "all" ? <button type="button" className="bw-fon" data-bw="fon" data-k={filter} onClick={() => pick("all")}>{CHIP_WORDS[filter]} ✕</button> : null}
          <button type="button" className="bw-ib" aria-label="List" data-bw="list" onClick={onList}>{I(BW_IC.list, 2)}</button>
          <button type="button" className="bw-ib" aria-label="Replay" data-bw="replay">{I(BW_IC.play)}</button>
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
