/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone Birds-eye world v2 (design-refs/phone-birds-eye-world-v2/phone-birds-eye-world-v2.html) — THE VIEW. Below 768px
 * only: the Birds-eye side of the Queries list's List | Birds-eye switch. One canvas you zoom and pan: every open query
 * on its real dates, today as the line.
 *   - THE ENGINE IS lib/birdsWorld; THE FRAME IS drawWorld (the ref's `draw()`), one layer rebuilt per animation frame in
 *     screen space. React renders the shell; nothing here re-renders per pointer move (the view state lives in a ref).
 *   - The header (ref `.hd2`): the Birds-eye hawk in a round badge, "Birds-eye view", then back and List (v1's, kept:
 *     the world covers the pushed header), replay and search. Under it the four pills with their counts after the
 *     label — All, With you, Needs chasing, Waiting — scrolling sideways, fading at the right while there is more.
 *     Zoomed past the pill's opening (z > FZ + 0.05) it folds: the pills go; a chosen filter shows as one white chip
 *     ("Needs chasing ✕") and the title is hidden.
 *   - Empty states (ref `.bwc`): one card. No queries at all: the card over a blurred invented sample (lib/birdsWorld
 *     `sampleRows`, never real data), with no pills, gestures, zoom controls or hint. A pill with nothing: its own card
 *     with "See all queries". Only closed queries: the card at the top, the Closed section below it.
 *   - Replay (ref `replay`): fit, then the campaign plays forwards from its first date to today over 6s, ease in-out;
 *     any touch, or play again, stops it at today; reduced motion never plays.
 *   - "Add dates" opens the Queries list (it has no no-date filter to open; named in the report).
 * ⚠️ COPY: never "overdue" or "late".
 */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { useV3Data } from "../v3/V3Provider";
import { openV3, openV3Query } from "../v3/v3Store";
import { eyeRows, type EyeRow } from "../../../lib/qcBirdsEye";
import type { QcRow } from "../../../lib/qcSummary";
import { DEFAULT_QUIET_WEEKS } from "../../../lib/queryState";
import {
  PILLS, PILL_LABEL, REPLAY_MS, RULE, TOPFIT, TOPFOLD, bwCounts, bwGroups, bwRow, chipForCourt, isDrawn, makeWorld, replayAt, replayStart,
  sampleRows, type BwFilter, type BwRow, type BwView, type World,
} from "../../../lib/birdsWorld";
import { drawWorld } from "./drawWorld";
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
/** the Birds-eye hawk (the desktop Birds-eye's own head), read, never changed */
export const BW_HAWK = "/images/qc/be-hawk-head.png";
export const BW_SHADOW = { src: "/images/hawk-shadow.png", version: 1 };
/** the first-visit hint, seen (v1's key, kept) */
export const BW_HINT_KEY = "bw1.hint.seen";

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
const calm = (): boolean => { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; } };
const hintSeen = (): boolean => { try { return window.localStorage.getItem(BW_HINT_KEY) === "1"; } catch { return true; } };

/** the empty-state card's words (ref `draw()`'s card); null when the world has something to show */
export type BwCard = { k: "none" | "you" | "chase" | "wait" | "closed" | "open"; title: string; line: string; cta: "log" | "all" };
export function cardFor(demo: boolean, f: BwFilter, groups: { t: string }[]): BwCard | null {
  if (demo) return { k: "none", title: "No queries out yet", line: "Log your first query and it lands here, with every stage on its own dates.", cta: "log" };
  const open = groups.filter((g) => g.t !== "Closed").length;
  if (!groups.length) {
    if (f === "you") return { k: "you", title: "Nothing’s with you", line: "When an agent asks for pages or makes an offer, it’ll show up here.", cta: "all" };
    if (f === "chase") return { k: "chase", title: "Nothing needs chasing", line: "Every query is still inside its reply window.", cta: "all" };
    if (f === "wait") return { k: "wait", title: "Nothing waiting on a reply", line: "Everything out with agents is past its date or back with you.", cta: "all" };
    return { k: "open", title: "No open queries", line: "Log a query to start tracking it here.", cta: "log" };
  }
  if (!open && f === "all") return { k: "closed", title: "No open queries", line: "Your closed queries are below.", cta: "log" };
  return null;
}
/** the space above the rows when the "only closed" card sits on top (ref `PADY`) */
const PADY_CLOSED = 256;

export interface BirdsWorldProps {
  /** the `&court=` the list arrived with; the nearest pill is applied */
  court?: string | null;
  onBack: () => void;
  onList: () => void;
}

export const BirdsWorld: React.FC<BirdsWorldProps> = ({ court = null, onBack, onList }) => {
  const v = useV3Data();
  const now = v.now;
  /* the writer's own "A query goes quiet after" (Settings), read through useV3; the app's default is 4 weeks */
  const quietDays = (v.quietWeeks ?? DEFAULT_QUIET_WEEKS) * 7;
  const loc = useLocation();
  const hawk = new URLSearchParams(loc.search).get("hawk") !== "0";
  const land = useLandscape();

  /* ── the engine: open queries through the desktop's own rows (`eyeRows`), closed ones by the phone's court ── */
  const real = useMemo(() => {
    const open = v.qs.filter((x) => x.court !== "closed"), closed = v.qs.filter((x) => x.court === "closed");
    const live = eyeRows(open.map((x) => x.row as QcRow), now).map((e) => bwRow(e, now));
    const shut = closed.map((x) => bwRow({ id: x.id, row: x.row as QcRow, court: "agent" } as unknown as EyeRow, now, true));
    return [...live, ...shut];
  }, [v.qs, now]);
  const demo = real.length === 0;
  const rows: BwRow[] = useMemo(() => (demo ? sampleRows() : real), [demo, real]);
  const counts = useMemo(() => bwCounts(rows), [rows]);
  const [filter, setFilter] = useState<BwFilter>(() => chipForCourt(court));
  useEffect(() => { setFilter(chipForCourt(court)); }, [court]);
  const f: BwFilter = demo ? "all" : filter;
  const groups = useMemo(() => bwGroups(rows, f), [rows, f]);
  const card = cardFor(demo, f, groups);
  const pady = card?.k === "closed" ? PADY_CLOSED : 0;
  const explorable = !demo && groups.some((g) => g.rows.some((r) => isDrawn(r) || r.closed));

  /* ── the view state, off React's render ── */
  const root = useRef<HTMLDivElement>(null);
  const vp = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const hd = useRef<HTMLDivElement>(null);
  const chips = useRef<HTMLDivElement>(null);
  const zin = useRef<HTMLButtonElement>(null);
  const zout = useRef<HTMLButtonElement>(null);
  const hs = useRef<HTMLImageElement>(null);
  const hint = useRef<HTMLDivElement>(null);
  const W = useRef<World | null>(null);
  const S = useRef<BwView>({ z: 1, ox: 0, oy: 0 });
  const frame = useRef(0);
  const motion = useRef<Motion | null>(null);
  /** the replay's "now", in days from today (null: not replaying) */
  const rp = useRef<{ rt: number | null; raf: number }>({ rt: null, raf: 0 });
  const [showHint] = useState(() => !hintSeen());
  const [top, setTop] = useState(TOPFIT);

  const paint = useCallback(() => {
    const w = W.current, el = layer.current;
    if (!w || !el) return;
    const Sv = S.current;
    const fr = drawWorld(w, Sv, { nowMs: now, quietDays, rt: rp.current.rt, rows, pady });
    el.innerHTML = fr.html;
    hd.current?.classList.toggle("col", fr.zoomed || w.land);
    if (zin.current) zin.current.disabled = Sv.z >= w.maxZ - 1e-6;
    if (zout.current) zout.current.disabled = Sv.z <= 1 + 1e-6;
    if (hs.current) Object.assign(hs.current.style, shadowStyle(Sv.z, Sv.ox, Sv.oy, w.fitView()));
    const r = root.current;
    if (r) {
      const rpx = w.rowPx(Sv.z);
      Object.assign(r.dataset, {
        z: Sv.z.toFixed(3), fz: w.FZ.toFixed(3), rp: rpx.toFixed(2), off: String(fr.off), ox: Sv.ox.toFixed(2), oy: Sv.oy.toFixed(2), sx: w.SX(Sv.z).toFixed(5),
        d0: String(w.ext.D0), d1: String(w.ext.D1), ppd: w.PPD.toFixed(6), gap: w.gapPx(Sv.z).toFixed(2), top: String(fr.top + RULE), lx: fr.lx.toFixed(2),
        maxz: w.maxZ.toFixed(3), zoomed: fr.zoomed ? "1" : "0",
      });
    }
    setTop((t) => (t === fr.top ? t : fr.top));
  }, [now, quietDays, rows, pady]);
  const draw = useCallback(() => { if (frame.current) return; frame.current = requestAnimationFrame(() => { frame.current = 0; paint(); }); }, [paint]);

  const build = useCallback((keep: boolean) => {
    const el = vp.current;
    if (!el) return;
    const bot = land ? 16 : dockHeight() + 16;
    W.current = makeWorld({ rows, filter: f, vpW: el.clientWidth || 390, vpH: el.clientHeight || 784, bot, land });
    root.current?.style.setProperty("--bw-cb", `${bot + 8}px`);
    S.current = keep ? W.current.clamp(S.current) : W.current.fitView();
    paint();
  }, [rows, f, land, paint]);
  useLayoutEffect(() => { build(false); }, [rows, f, land]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const el = vp.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(() => build(true));
    ro.observe(el);
    return () => ro.disconnect();
  }, [build]);
  useEffect(() => () => { cancelAnimationFrame(frame.current); cancelAnimationFrame(rp.current.raf); }, []);
  /* the dock hides in landscape (v4.1's body class, kept) */
  useEffect(() => { document.body.classList.toggle("pa41-land", land); return () => document.body.classList.remove("pa41-land"); }, [land]);
  /* the pill row fades at its right edge while there is more to see */
  useEffect(() => {
    const c = chips.current;
    if (!c) return undefined;
    const more = () => c.classList.toggle("more", c.scrollLeft + c.clientWidth < c.scrollWidth - 2);
    more(); c.addEventListener("scroll", more, { passive: true }); window.addEventListener("resize", more);
    return () => { c.removeEventListener("scroll", more); window.removeEventListener("resize", more); };
  }, [counts, demo]);

  /* ── replay ── */
  const stopReplay = useCallback(() => {
    cancelAnimationFrame(rp.current.raf);
    if (rp.current.rt == null) return;
    rp.current.rt = null;
    if (root.current) root.current.dataset.replay = "done";
    paint();
  }, [paint]);
  const replay = useCallback(() => {
    const w = W.current;
    if (rp.current.rt != null || calm()) { stopReplay(); return; }
    if (!w || !rows.some(isDrawn)) return;
    motion.current?.stop();
    const t0 = replayStart(rows);
    S.current = w.fitView();
    rp.current.rt = t0;
    if (root.current) root.current.dataset.replay = "running";
    paint();
    const st = performance.now();
    const step = (n: number) => {
      const k = Math.min(1, (n - st) / REPLAY_MS);
      rp.current.rt = replayAt(t0, k);
      if (root.current) root.current.dataset.rt = rp.current.rt.toFixed(2);
      paint();
      if (k < 1) rp.current.raf = requestAnimationFrame(step); else stopReplay();
    };
    rp.current.raf = requestAnimationFrame(step);
  }, [rows, paint, stopReplay]);

  /* ── movement: none on the sample behind the no-queries card ── */
  const touched = useCallback(() => {
    stopReplay();
    const h = hint.current;
    if (h && !h.classList.contains("hide")) { h.classList.add("hide"); try { window.localStorage.setItem(BW_HINT_KEY, "1"); } catch { /* storage refused */ } }
  }, [stopReplay]);
  useEffect(() => {
    const el = vp.current;
    if (!el || demo) return undefined;
    const m = wireMotion({ vp: el, world: () => W.current, S, draw, calm, touched, openRow: (id) => openV3Query(id) });
    motion.current = m;
    return () => { m.dispose(); motion.current = null; };
  }, [draw, touched, demo]);
  const onClick = (e: React.MouseEvent) => {
    const b = (e.target as Element).closest<HTMLElement>("[data-a]"), w = W.current, m = motion.current;
    if (!b || !w) return;
    const a = b.dataset.a, Sv = S.current;
    if (a === "nodate") { onList(); return; }
    if (!m) return;
    touched();
    if (a === "zin") m.zoomAt(w.vpW / 2, (w.vpH - 80) / 2, 1.8);
    else if (a === "zout") m.zoomAt(w.vpW / 2, (w.vpH - 80) / 2, 1 / 1.8);
    else if (a === "toline") m.animateTo(w.clamp({ z: Sv.z, ox: w.vpW * 0.62 - w.LINE * w.SX(Sv.z), oy: Sv.oy }), 380);
  };

  const pick = (k: BwFilter) => { touched(); setFilter((cur) => (cur === k || k === "all" ? "all" : k)); };
  const vpH = vp.current?.clientHeight ?? 784;
  const cardTop = card ? (card.k === "closed" ? top + RULE + 16 : (top + RULE + vpH - 96) / 2) : 0;
  const t0 = land ? TOPFOLD : top;

  const body = (
    <div ref={root} className={`pa-layer bw${land ? " land" : ""}${demo ? " isdemo" : ""}`} data-bw="world" data-pa5="birds-view" data-filter={f}
      data-n={groups.reduce((a, g) => a + g.rows.length, 0)} data-court={court ?? ""} data-replay="idle" data-hawk={hawk ? "1" : "0"} data-demo={demo ? "1" : "0"}
      data-card={card?.k ?? ""} onClick={onClick}>
      <div ref={vp} className="bw-vp" data-bw="vp">
        <div ref={layer} className={`bw-w${demo ? " demo" : ""}`} data-bw="layer" />
        {card ? (
          <div className={`bw-card${card.k === "closed" ? "" : " mid"}`} data-bw="card" data-k={card.k}
            /* the prompt's own values (radius 20, the ref's shadow), which the phone sheet's ratchet would refuse in a sheet */
            style={{ top: cardTop, borderRadius: 20, boxShadow: "0 1px 2px rgba(31,38,51,.08),0 12px 32px rgba(31,38,51,.14)" }}>
            <img src={BW_HAWK} alt="" />
            <b>{card.title}</b>
            <span>{card.line}</span>
            {card.cta === "all"
              ? <button type="button" className="bw-go3" data-bw="see-all" onClick={() => pick("all")}>See all queries</button>
              : <button type="button" className="bw-go2" data-bw="log" onClick={() => openV3({ type: "plus" })}>Log a query</button>}
          </div>
        ) : null}
        <div ref={hint} className={`bw-hint${showHint && explorable ? "" : " hide"}`} data-bw="hint">Pinch to zoom · drag to explore</div>
        <div className="bw-zc" data-bw="zoom">
          <button ref={zin} type="button" data-a="zin" data-bw="zin" aria-label="Zoom in">{I(BW_IC.plus, 2.2)}</button>
          <button ref={zout} type="button" data-a="zout" data-bw="zout" aria-label="Zoom out" disabled>{I(BW_IC.minus, 2.2)}</button>
        </div>
      </div>
      {hawk ? <div className="bw-hsw" data-bw="hawk" aria-hidden="true"><img ref={hs} className="bw-hs" alt="" src={`${BW_SHADOW.src}?v=${BW_SHADOW.version}`} /></div> : null}
      <div ref={hd} className={`bw-hd${land ? " col" : ""}${f !== "all" ? " filt" : ""}`} data-bw="head" style={{ ["--bw-top" as string]: `${t0}px` } as React.CSSProperties}>
        <div className="bw-t2">
          <button type="button" className="bw-ib back" aria-label="Back" data-bw="back" onClick={onBack}>{I(BW_IC.back, 2)}</button>
          <img className="bw-behk" data-bw="badge" src={BW_HAWK} alt="" />
          <h1 className="bw-h">Birds-eye view</h1>
          {f !== "all" ? <button type="button" className="bw-fon" data-bw="fon" data-k={f} onClick={() => pick("all")}>{PILL_LABEL[f]} ✕</button> : null}
          <button type="button" className="bw-ib" aria-label="List" data-bw="list" onClick={onList}>{I(BW_IC.list, 2)}</button>
          <button type="button" className="bw-ib" aria-label="Replay your campaign" data-bw="replay" onClick={() => { if (!demo) replay(); }}>{I(BW_IC.play)}</button>
          <button type="button" className="bw-ib" aria-label="Search" data-bw="search" onClick={() => openV3({ type: "search" })}>{I(BW_IC.search)}</button>
        </div>
        {demo ? null : (
          <div ref={chips} className="bw-chips" data-bw="chips">
            {PILLS.map((k) => (
              <button key={k} type="button" className={`bw-c2${f === k ? " on" : ""}`} aria-pressed={f === k} data-bw="chip" data-k={k} data-n={counts[k]} onClick={() => pick(k)}>
                {PILL_LABEL[k]} <b>{counts[k]}</b>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
  return typeof document === "undefined" ? body : createPortal(body, document.body);
};
