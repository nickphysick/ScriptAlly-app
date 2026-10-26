/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v150 Part D (design-refs/query-centre-v150/, screens 04–10) — Birds-eye as the LIST'S SECOND VIEW,
 * inside the list card under the navy bar. The floating pill and the half-screen drawer are retired; the look is the
 * old drawer's (bands, stage-tinted bars, the dot and halo, the zoom pill, the axis, the action buttons).
 *
 * ⚠️ THE TRACK IS BUILT ONCE PER ZOOM AND NEVER PER POINTER MOVE. React lays out one wide track (the axis and every
 *    row's track) at the current scale; moving through time sets `scrollLeft` on the axis and each row's timeline
 *    cell, imperatively, so a drag changes no DOM node and every cell moves by the same offset (QC150-L8).
 * ⚠️ NO TEXT IS EVER CLIPPED MID-WORD (D5). A current bar's label is whole, or its stage name, or nothing — measured,
 *    never guessed — and pins to the visible left edge while its bar's start is out of view; it is hidden, never
 *    cut, once less than its full width is visible. Past-bar labels, tail items, month names and ticks are shown only
 *    while they are wholly in view (`apply`).
 * ⚠️ ONE TIME SCALE: the axis and every row read `beX` against the same `BeScale`, and the today line, the TODAY tag
 *    and an overdue bar's end are the same x (QC150-L6).
 */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePopover } from "../../shell/ListPills";
import type { EyeRow } from "../../../lib/qcBirdsEye";
import {
  BE_GROUPS, BE_SORTS, BE_SPANS, BE_TODAY_AT, beLine, beMonths, beScale, beTicks, beX,
  type BeGroup, type BeGroupOut, type BeLine, type BeSort, type BeZoom,
} from "../../../lib/qc150";
import "./qcv150.css";

const DAY = 86_400_000;
const startOfDay = (ms: number): number => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
const MON_UP = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"] as const;
const WD = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

/** text width in the page's own faces (read from the :root tokens), cached; re-measured once the fonts land */
const cache = new Map<string, number>();
let ctx: CanvasRenderingContext2D | null = null;
function measure(text: string, size: number, token: "--sp-type" | "--sp-mono" = "--sp-type", weight = 400, track = 0): number {
  const k = `${token}|${size}|${weight}|${track}|${text}`;
  const hit = cache.get(k);
  if (hit != null) return hit;
  if (typeof document === "undefined") return text.length * size * 0.6;
  if (!ctx) ctx = document.createElement("canvas").getContext("2d");
  const fam = getComputedStyle(document.documentElement).getPropertyValue(token).trim() || "monospace";
  let w = text.length * size * 0.6;
  if (ctx) { ctx.font = `${weight} ${size}px ${fam}`; w = ctx.measureText(text).width; }
  w += track * size * text.length;
  cache.set(k, w);
  return w;
}

interface Laid {
  line: BeLine;
  /** track x of the current bar's ends, and what its label says inside (full, stage only, or nothing) */
  s: number; e: number; inside: string; rest: string;
}

export const QcBirds150: React.FC<{
  groups: readonly BeGroupOut[];
  banded: boolean;
  nowMs: number;
  /** each row's one next move — the action button's words */
  moves: ReadonlyMap<string, { label: string }>;
  onOpen: (id: string) => void;
  onAct: (id: string) => void;
  selectedId: string | null;
  /** closed queries in the same filtered set (never drawn) */
  closedN: number;
}> = ({ groups, banded, nowMs, moves, onOpen, onAct, selectedId, closedN }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const axRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const todayRef = useRef<HTMLElement>(null);
  const hoverRef = useRef<HTMLElement>(null);
  const tagRef = useRef<HTMLSpanElement>(null);
  const [viewW, setViewW] = useState(0);
  const [zoom, setZoom] = useState<BeZoom>("3m");
  const [fontsTick, setFontsTick] = useState(0);
  const span = BE_SPANS[zoom];
  const today = startOfDay(nowMs);

  const rows: EyeRow[] = useMemo(() => groups.flatMap((g) => g.rows), [groups]);
  const lines = useMemo(() => new Map(rows.map((r) => [r.id, beLine(r, nowMs)])), [rows, nowMs]);
  const scale = useMemo(() => (viewW > 0 ? beScale([...lines.values()], span, viewW, nowMs) : null), [lines, span, viewW, nowMs]);
  const months = useMemo(() => (scale ? beMonths(scale, nowMs) : []), [scale, nowMs]);
  const ticks = useMemo(() => (scale ? beTicks(scale, nowMs) : []), [scale, nowMs]);
  const tx = scale ? beX(scale, today) : 0;

  /* the labels: whole, the stage name, or nothing — decided by measured width before anything is drawn */
  const laid = useMemo(() => {
    const out = new Map<string, Laid>();
    if (!scale) return out;
    void fontsTick;
    for (const [id, l] of lines) {
      if (!l.cur) { out.set(id, { line: l, s: 0, e: 0, inside: "", rest: "" }); continue; }
      const s = beX(scale, l.cur.fromMs);
      const e = l.cur.overdue ? tx : beX(scale, l.cur.toMs);
      const bw = Math.max(e - s, 4);
      const pad = l.cur.overdue ? 44 : 30;
      const inside = bw >= measure(l.cur.label, 14) + pad ? l.cur.label : bw >= measure(l.cur.stage, 14) + pad ? l.cur.stage : "";
      const rest = inside === l.cur.label ? "" : inside ? l.cur.label.slice(l.cur.stage.length).replace(/^ · /, "") : l.cur.label;
      out.set(id, { line: l, s, e, inside, rest });
    }
    return out;
  }, [lines, scale, tx, fontsTick]);

  /* the visible timeline's width, measured off the axis cell (the rows share its column) */
  useLayoutEffect(() => {
    const el = axRef.current;
    if (!el) return undefined;
    const read = () => { const w = el.clientWidth; if (w > 0 && w <= window.innerWidth) setViewW(w); };
    read();
    if (typeof document !== "undefined" && document.fonts) void document.fonts.ready.then(() => { cache.clear(); setFontsTick((n) => n + 1); });
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ── the one offset, and applying it ── */
  const off = useRef(0);
  /** v150.1 §7 — the date at the view's CENTRE, so a re-laid scale (full screen, a resize, a filter) keeps the reader
      where they were: entering or leaving full screen keeps the centre date and the zoom */
  const centreDate = useRef<number | null>(null);
  const placed = useRef(false);
  const anim = useRef(0);
  const W = scale?.width ?? 0;
  const clamp = useCallback((o: number) => Math.max(0, Math.min(Math.max(0, W - viewW), o)), [W, viewW]);
  const apply = useCallback(() => {
    const root = rootRef.current, ax = axRef.current;
    if (!root || !ax || !scale) return;
    off.current = clamp(off.current);
    const o = off.current;
    centreDate.current = scale.r0 + ((o + ax.clientWidth / 2) / scale.ppd) * DAY;
    root.querySelectorAll<HTMLElement>("[data-qc150-tl]").forEach((el) => { el.scrollLeft = o; });
    const V = ax.clientWidth;
    /* a measured width can be a pixel off the painted one, so "wholly in view" keeps 2px clear of each edge */
    const whole = (l: number, r: number) => l >= o + 2 && r <= o + V - 2;
    /* a current bar's label pins (sticky) and is hidden once less than its full width is visible */
    root.querySelectorAll<HTMLElement>("[data-lb]").forEach((el) => {
      const l = +el.dataset.l!, r = +el.dataset.r!, lw = +el.dataset.lw!;
      const ok = el.dataset.lb === "cur" ? Math.min(r, o + V) - Math.max(l, o) >= lw : whole(l, l + lw) && l + lw <= r;
      el.style.visibility = ok ? "" : "hidden";
    });
    /* tail items, ticks, the TODAY tag and month names: shown only while wholly in view */
    root.querySelectorAll<HTMLElement>("[data-wx]").forEach((el) => {
      const l = +el.dataset.wx!, w = +el.dataset.ww!;
      el.style.visibility = whole(l, l + w) ? "" : "hidden";
    });
    root.querySelectorAll<HTMLElement>("[data-mo]").forEach((el) => {
      const l = +el.dataset.l!, r = +el.dataset.r!, lw = +el.dataset.lw!;
      el.style.visibility = Math.min(r, o + V) - Math.max(l, o) >= lw + 20 && Math.max(l, o) + 10 + lw <= o + V ? "" : "hidden";
    });
    const t = todayRef.current, body = bodyRef.current;
    if (t && body) {
      const x = tx - o;
      t.style.left = `${ax.getBoundingClientRect().left - body.getBoundingClientRect().left + x}px`;
      t.style.display = x < 0 || x > V ? "none" : "";
    }
  }, [scale, clamp, tx]);

  const home = useCallback(() => (scale ? tx - viewW * BE_TODAY_AT : 0), [scale, tx, viewW]);
  /* on first layout, today at 60%; after that a re-laid scale keeps the date at the left edge */
  const pendingCentre = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (!scale) return;
    if (pendingCentre.current != null) { off.current = beX(scale, pendingCentre.current) - viewW / 2; pendingCentre.current = null; }
    else if (!placed.current || centreDate.current == null) { off.current = home(); placed.current = true; }
    else off.current = beX(scale, centreDate.current) - viewW / 2;
    apply();
  }, [scale, laid, home, apply, viewW]);

  const goTo = useCallback((target: number, ms = 380) => {
    cancelAnimationFrame(anim.current);
    const o0 = off.current, o1 = clamp(target), t0 = performance.now();
    const calm = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (calm) { off.current = o1; apply(); return; }
    const step = (n: number) => {
      const k = Math.min(1, (n - t0) / ms), e = 1 - Math.pow(1 - k, 3);
      off.current = o0 + (o1 - o0) * e;
      apply();
      if (k < 1) anim.current = requestAnimationFrame(step);
    };
    anim.current = requestAnimationFrame(step);
  }, [clamp, apply]);
  const pickZoom = (z: BeZoom) => {
    if (!scale || z === zoom) return;
    cancelAnimationFrame(anim.current);
    pendingCentre.current = scale.r0 + ((off.current + viewW / 2) / scale.ppd) * DAY;
    setZoom(z);
  };

  /* ── drag anywhere on the axis or the timeline cells, with momentum; a drag never counts as a click ── */
  const drag = useRef<{ x: number; o0: number; lx: number; lt: number; v: number; moved: boolean } | null>(null);
  const swallow = useRef(false);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const down = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const t = e.target as HTMLElement;
      if (!t.closest("[data-qc150='axis'], [data-qc150='be-track']") || t.closest("button")) return;
      cancelAnimationFrame(anim.current);
      drag.current = { x: e.clientX, o0: off.current, lx: e.clientX, lt: performance.now(), v: 0, moved: false };
    };
    const move = (e: PointerEvent) => {
      const d = drag.current;
      const ax = axRef.current;
      if (d) {
        const dx = e.clientX - d.x;
        if (!d.moved && Math.abs(dx) > 3) { d.moved = true; root.classList.add("is-drag"); }
        if (d.moved) {
          off.current = d.o0 - dx;
          apply();
          const n = performance.now();
          d.v = (d.lx - e.clientX) / Math.max(1, n - d.lt);
          d.lx = e.clientX; d.lt = n;
        }
      }
      /* the hover line and its date tag, over the timeline only */
      const h = hoverRef.current, tag = tagRef.current, body = bodyRef.current;
      if (!ax || !h || !tag || !body || !scale) return;
      const a = ax.getBoundingClientRect();
      const x = e.clientX - a.left;
      const over = (e.target as HTMLElement).closest?.("[data-qc150='axis'], [data-qc150='be-track']");
      if (x < 0 || x > a.width || !over) { h.style.display = "none"; tag.style.display = "none"; return; }
      const ms = scale.r0 + ((off.current + x) / scale.ppd) * DAY;
      const dd = new Date(ms);
      h.style.display = "block"; h.style.left = `${a.left - body.getBoundingClientRect().left + x}px`;
      tag.textContent = `${dd.getDate()} ${MON_UP[dd.getMonth()]} · ${WD[dd.getDay()]}`;
      tag.style.display = "block"; tag.style.left = `${x}px`;
    };
    const up = () => {
      const d = drag.current;
      if (!d) return;
      drag.current = null;
      root.classList.remove("is-drag");
      if (!d.moved) return;
      swallow.current = true;
      setTimeout(() => { swallow.current = false; }, 0);
      let v = d.v * 14;
      if (Math.abs(v) <= 1) return;
      const step = () => {
        v *= 0.9;
        off.current += v;
        apply();
        if (Math.abs(v) > 0.4 && off.current > 0 && off.current < W - viewW) anim.current = requestAnimationFrame(step);
      };
      anim.current = requestAnimationFrame(step);
    };
    const leave = () => { if (hoverRef.current) hoverRef.current.style.display = "none"; if (tagRef.current) tagRef.current.style.display = "none"; };
    const wheel = (e: WheelEvent) => {
      if (!(e.target as HTMLElement).closest("[data-qc150='axis'], [data-qc150='be-track']")) return;
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0;
      if (!d) return;
      e.preventDefault();
      cancelAnimationFrame(anim.current);
      off.current += d;
      apply();
    };
    const click = (e: MouseEvent) => { if (swallow.current) { e.stopPropagation(); e.preventDefault(); swallow.current = false; } };
    root.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    root.addEventListener("mouseleave", leave);
    root.addEventListener("wheel", wheel, { passive: false });
    root.addEventListener("click", click, true);
    return () => {
      root.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      root.removeEventListener("mouseleave", leave);
      root.removeEventListener("wheel", wheel);
      root.removeEventListener("click", click, true);
    };
  }, [apply, scale, W, viewW]);
  useEffect(() => () => cancelAnimationFrame(anim.current), []);

  /* ── the sticky date row pins flush under the navy bar: its top is the sticky toolbar's own height ── */
  useLayoutEffect(() => {
    const root = rootRef.current;
    const topw = root?.closest(".qc138-sheet")?.querySelector<HTMLElement>(".qc138-topw");
    if (!root || !topw) return undefined;
    const set = () => root.style.setProperty("--qc150-bvtop", `${topw.offsetHeight + (parseFloat(getComputedStyle(topw).top) || 0)}px`);
    set();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(set);
    ro.observe(topw);
    return () => ro.disconnect();
  }, []);

  const openRow = (id: string) => onOpen(id);

  return (
    <div className="qc150-be" ref={rootRef} data-qc150="birds" data-zoom={zoom} data-r0={scale?.r0} data-ppd={scale?.ppd}>
      <div className="qc150-bvh" data-qc150="daterow">
        <div className="qc150-zc">
          <div className="qc150-zp" role="group" aria-label="Time" data-qc150="zoom">
            {(Object.keys(BE_SPANS) as BeZoom[]).map((z) => (
              <button key={z} type="button" data-z={z} aria-pressed={zoom === z} onClick={() => pickZoom(z)}>{z.toUpperCase()}</button>
            ))}
            <i className="qc150-sep" aria-hidden="true" />
            <button type="button" className="qc150-ar" data-qc150="earlier" aria-label="Earlier" onClick={() => goTo(off.current - viewW / 3)}>‹</button>
            <button type="button" className="qc150-tg" data-qc150="today" aria-label="Back to today" title="Back to today" onClick={() => goTo(home())}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="6" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /></svg>
            </button>
            <button type="button" className="qc150-ar" data-qc150="later" aria-label="Later" onClick={() => goTo(off.current + viewW / 3)}>›</button>
          </div>
        </div>
        <div className="qc150-ax" ref={axRef} data-qc150="axis" data-qc150-tl="">
          {scale ? (
            <div className="qc150-axt" style={{ width: W }}>
              {months.map((m) => (
                <div key={m.ms} className={`qc150-mo${m.cur ? " qc150-mo--cur" : m.future ? " qc150-mo--future" : ""}`} data-qc150="month" style={{ left: m.x, width: m.w }}>
                  {m.name ? (
                    <span data-qc150="month-name" data-mo="" data-l={m.x} data-r={m.x + m.w} data-lw={measure(m.name, 18) + (m.year ? measure(m.year, 10, "--sp-mono", 500, 0.1) + 6 : 0)}>
                      {m.name}{m.year ? <small>{m.year}</small> : null}
                    </span>
                  ) : null}
                </div>
              ))}
              {ticks.map((t) => {
                const w = measure(t.label, 11.5, "--sp-mono", 500);
                return <span key={t.ms} className="qc150-tk" data-qc150="tick" data-wx={t.x - w / 2} data-ww={w} style={{ left: t.x }}>{t.label}</span>;
              })}
              <span className="qc150-tdy" data-qc150="today-tag" data-wx={tx - 28} data-ww={56} style={{ left: tx }}>TODAY</span>
            </div>
          ) : null}
          <span className="qc150-hvt" ref={tagRef} data-qc150="hover-tag" aria-hidden="true" />
        </div>
        <div />
      </div>

      <div className="qc150-bvb" ref={bodyRef} data-qc150="be-body">
        <i className="qc150-vl qc150-vl--t" ref={todayRef} data-qc150="today-line" aria-hidden="true" />
        <i className="qc150-vl qc150-vl--h" ref={hoverRef} data-qc150="hover-line" aria-hidden="true" />
        {groups.map((g) => (
          <section key={g.key} className="qc150-bg" data-qc150="be-group" data-group={g.key}>
            {banded ? <div className="qc150-gb" data-qc150="be-band"><b>{g.label}</b><small>{g.rows.length}</small></div> : null}
            {g.rows.map((r, j) => {
              const L = laid.get(r.id);
              const l = L?.line;
              const move = moves.get(r.id) ?? null;
              return (
                <div key={r.id} className={`qc150-br${l?.when === "watch" ? " qc150-br--w" : ""}${j === g.rows.length - 1 ? " qc150-br--last" : ""}${selectedId === r.id ? " is-sel" : ""}`}
                  data-qc150="be-row" data-id={r.id} data-when={l?.when} role="button" tabIndex={0}
                  onClick={(e) => { if ((e.target as HTMLElement).closest("button")) return; openRow(r.id); }}
                  onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); openRow(r.id); } }}>
                  <div className="qc150-ag">
                    <span className="qc150-d" aria-hidden="true">{r.row.initials}</span>
                    <span className="qc150-who"><b data-qc150="be-name">{r.row.agentName}</b><small>{r.row.agency}</small></span>
                  </div>
                  <div className="qc150-tl" data-qc150="be-track" data-qc150-tl="">
                    {scale && l ? (
                      <div className="qc150-trk" style={{ width: W }}>
                        {l.past.map((b) => {
                          const a = beX(scale, b.fromMs), z = beX(scale, b.toMs) - 3, pw = z - a;
                          if (pw < 4) return null;
                          const lw = measure(b.label, 14) + 28;
                          return (
                            <div key={b.key} className="qc150-bar qc150-bar--past" data-qc150="be-past" data-from={b.fromMs} data-to={b.toMs} title={b.title} style={{ left: a, width: pw }}>
                              {lw + 2 <= pw ? <span className="qc150-lb" data-lb="past" data-l={a} data-r={a + pw} data-lw={lw}>{b.label}</span> : null}
                            </div>
                          );
                        })}
                        {l.cur && L ? (
                          <div className={`qc150-bar qc150-bar--cur qc150-t-${l.cur.tint}${l.cur.overdue ? " qc150-bar--o" : ""}`} data-qc150="be-bar" data-from={l.cur.fromMs}
                            title={l.cur.title} style={{ left: L.s, width: Math.max(L.e - L.s, 4) }}>
                            {L.inside ? <span className="qc150-lb" data-qc150="be-label" data-lb="cur" data-l={L.s} data-r={L.e - (l.cur.overdue ? 22 : 0)} data-lw={measure(L.inside, 14) + 28}>{L.inside}</span> : null}
                          </div>
                        ) : null}
                        {l.cur && L ? <Tail L={L} tx={tx} /> : null}
                      </div>
                    ) : null}
                  </div>
                  <div className="qc150-xa">
                    {move ? <button type="button" data-qc150="be-act" onClick={(e) => { e.stopPropagation(); onAct(r.id); }}>{move.label}</button> : null}
                  </div>
                </div>
              );
            })}
          </section>
        ))}
        {groups.length === 0 ? <p className="qc150-none" data-qc150="be-none">No live queries match.</p> : null}
      </div>
      {closedN > 0 ? <p className="qc150-bvc" data-qc150="be-closed">{closedN} closed {closedN === 1 ? "query isn’t" : "queries aren’t"} shown here — nothing left to wait for.</p> : null}
      <p className="qc150-bvf" data-qc150="be-foot">DRAG THE TIMELINE TO MOVE THROUGH TIME &nbsp;·&nbsp; <i aria-hidden="true" /> MARKS A QUERY PAST ITS DATE &nbsp;·&nbsp; CLICK A ROW TO OPEN IT</p>
    </div>
  );
};

/** the tail: the dot (overdue only), "N DAYS OVER" or "IN ND", then any label that did not fit inside the bar — one
 *  inline row from today (overdue) or the bar's end (others), 12px apart, so its items cannot collide */
const Tail: React.FC<{ L: Laid; tx: number }> = ({ L, tx }) => {
  const l = L.line;
  if (!l.cur) return null;
  const over = l.cur.overdue;
  const x0 = over ? tx : L.e + 10;
  const mark = over ? `${l.daysOver} ${l.daysOver === 1 ? "DAY" : "DAYS"} OVER` : l.dueMs != null ? (l.inDays <= 0 ? "TODAY" : `IN ${l.inDays}D`) : "";
  const items: { key: string; node: React.ReactNode; w: number }[] = [];
  let x = x0 + (over ? 5 + 12 : 0);
  if (mark) {
    const w = measure(mark, 11, "--sp-mono", 500, over ? 0.12 : 0.1);
    items.push({ key: "m", w, node: <span className="qc150-tx" data-qc150="be-mark" data-wx={x} data-ww={w}>{mark}</span> });
    x += w + 12;
  }
  if (L.rest) {
    const w = measure(L.rest, 14);
    items.push({ key: "r", w, node: <span className="qc150-lb2" data-qc150="be-rest" data-wx={x} data-ww={w}>{L.rest}</span> });
  }
  if (!over && !items.length) return null;
  return (
    <div className={`qc150-tail${over ? "" : " qc150-tail--in"}`} data-qc150="be-tail" style={{ left: over ? tx : L.e }}>
      {over ? <span className="qc150-dot" data-qc150="be-dot" data-wx={tx - 5} data-ww={10} /> : null}
      {items.map((i) => <React.Fragment key={i.key}>{i.node}</React.Fragment>)}
    </div>
  );
};

/* ══ D8 · the Birds-eye pills in the navy bar: Group and Sort, separate from the list's ══ */
type BePop = "group" | "sort";
/* v150.1 §5 — the same two-box group icon as the list's pill */
const GROUP_IC = <svg className="qc150-pic gic" viewBox="0 0 20 20" aria-hidden="true"><rect x="2.5" y="2.5" width="15" height="6" rx="1.6" /><path d="M5.5 5.5h4" /><rect x="2.5" y="11.5" width="15" height="6" rx="1.6" /><path d="M5.5 14.5h4" /></svg>;
const SORT_IC = <svg className="qc150-pic" viewBox="0 0 20 20" aria-hidden="true"><path d="M6 4v12M3.5 13.5 6 16l2.5-2.5M14 16V4m-2.5 2.5L14 4l2.5 2.5" /></svg>;
const CARET = <svg className="qc150-pcv" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5l3 3 3-3" /></svg>;

const BeMenu: React.FC<{ anchor: HTMLElement; title: string; opts: readonly { key: string; label: string }[]; value: string; onPick: (k: string) => void; k: BePop }> = ({ anchor, title, opts, value, onPick, k }) => {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  useLayoutEffect(() => {
    const r = anchor.getBoundingClientRect();
    const w = 230;
    setPos({ top: r.bottom + 8, left: Math.max(16, Math.min(r.right - w, window.innerWidth - w - 16)) });
  }, [anchor]);
  return createPortal(
    <div className="lpop qc150-bvm" data-qc150="be-menu" data-k={k} role="menu" aria-label={title} style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}>
      <h6>{title}</h6>
      {opts.map((o) => (
        <button key={o.key} type="button" role="menuitemradio" aria-checked={value === o.key} data-v={o.key} onClick={() => onPick(o.key)}>{o.label}</button>
      ))}
    </div>,
    document.body,
  );
};

export const QcBePills150: React.FC<{ group: BeGroup; onGroup: (g: BeGroup) => void; sort: BeSort; onSort: (s: BeSort) => void; loading?: boolean }> = ({ group, onGroup, sort, onSort, loading = false }) => {
  const pop = usePopover<BePop>();
  const g = BE_GROUPS.find((x) => x.key === group)!;
  const s = BE_SORTS.find((x) => x.key === sort)!;
  return (
    <span className="qc150-bvgs" data-qc150="be-pills">
      <button type="button" className="qc150-bvp" data-qc150="be-group-pill" data-lp="qc150-group" aria-haspopup="menu" aria-expanded={pop.open === "group"} disabled={loading}
        aria-label={`Group Birds-eye by ${g.label}`} onClick={(e) => pop.toggle("group", e.currentTarget)}>{GROUP_IC}<b>{g.label}</b>{CARET}</button>
      <button type="button" className="qc150-bvp" data-qc150="be-sort-pill" data-lp="qc150-sort" aria-haspopup="menu" aria-expanded={pop.open === "sort"} disabled={loading}
        aria-label={`Sort within groups by ${s.label}`} onClick={(e) => pop.toggle("sort", e.currentTarget)}>{SORT_IC}<b>{s.label}</b>{CARET}</button>
      {pop.open === "group" && pop.anchor ? <BeMenu k="group" anchor={pop.anchor} title="GROUP BIRDS-EYE BY" opts={BE_GROUPS} value={group} onPick={(v) => { onGroup(v as BeGroup); pop.close(); }} /> : null}
      {pop.open === "sort" && pop.anchor ? <BeMenu k="sort" anchor={pop.anchor} title="SORT WITHIN GROUPS BY" opts={BE_SORTS} value={sort} onPick={(v) => { onSort(v as BeSort); pop.close(); }} /> : null}
    </span>
  );
};
