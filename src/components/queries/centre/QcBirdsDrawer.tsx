/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QcBirdsDrawer — the Birds-eye view as a floating tab and a half-screen drawer (Query Centre v126
 * §6; ref design-refs/query-centre-v126.html). It replaces the rail's view and the old expanded card.
 *
 * ⚠️ `QcTimeline` OWNS TIME — the scale, the window onto it (v126.2: windowed, not scrolled), the date
 * row, today and the crosshair; this file is the furniture around it — the tab, the dim, the ink
 * header, the three pills and their popovers — and the drawer's own view (`lib/qcBirdsDrawer`).
 *
 * ⚠️ ALWAYS MOUNTED, OPEN OR NOT, so the drawer's grouping, sort and filters survive closing and
 * reopening it within the visit. Nothing about it is stored beyond the page.
 *
 * ⚠️ ESCAPE IS ONE HANDLER, ONE LAYER PER PRESS: an open popover, then a card open over the drawer,
 * then the drawer. The action drawer sits above all three and claims the key first (it listens on
 * `window` in the capture phase), so its press never reaches this one.
 *
 * ⚠️ THE LABELS ARE TEXT AND THE MARKS ARE DRAWN. "Filters", "Grouped: Urgency", "Sort: Due date"
 * are the pills' whole text; the ⛉ ☰ ⌄ the reference types are SVGs, because Special Elite carries
 * none of them and a pill's text is what a reader (and a check) reads.
 */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { lockStageScroll } from "../../../lib/stageScroll";
import { eyeRows } from "../../../lib/qcBirdsEye";
import {
  BVD_DEFAULT, BVD_GROUPS, BVD_ORDER, BVD_SORTS, BVD_STAGE_LABEL, BVD_WHEN, bvdCounts, bvdFilterCount, bvdGroups, pickSort,
  type BvdStage, type BvdView, type BvdWhen,
} from "../../../lib/qcBirdsDrawer";
import type { QcRow } from "../../../lib/qcSummary";
import { QcTimeline } from "./QcTimeline";
import { BE_HAWK_HEAD } from "./qcArt";
import { readWindow } from "./qcWindow";
import "./qcvPage.css";
import "./qcvBirdsDrawer.css";

type Pop = "filter" | "group" | "sort" | null;

const FILTER_SVG = <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M3 5h18l-7 8v6l-4 2v-8z" /></svg>;
const GROUP_SVG = <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>;
const CARET_SVG = <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>;
const DIR_SVG = (rev: boolean) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" style={rev ? { transform: "scaleY(-1)" } : undefined}>
    <path d="M7 4v16M3 16l4 4 4-4M14 6h7M14 11h5M14 16h3" />
  </svg>
);

/** The tab's place: 24px inside the window box's right and bottom, measured — never the viewport's. */
function useTabPlace(): { right: number; bottom: number } | null {
  const [p, setP] = useState<{ right: number; bottom: number } | null>(null);
  useLayoutEffect(() => {
    const read = () => {
      const w = readWindow(null);
      if (!w) return;
      const vh = document.documentElement.clientHeight || window.innerHeight;
      const vw = document.documentElement.clientWidth || window.innerWidth;
      setP({ right: vw - w.right + 24, bottom: vh - (w.top + w.height) + 24 });
    };
    read();
    window.addEventListener("resize", read);
    const win = document.querySelector(".ws-window");
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(read) : null;
    if (ro && win) ro.observe(win);
    return () => { window.removeEventListener("resize", read); ro?.disconnect(); };
  }, []);
  return p;
}

export const QcBirdsDrawer: React.FC<{
  rows: readonly QcRow[];
  nowMs: number;
  open: boolean;
  onOpenDrawer: () => void;
  onCloseDrawer: () => void;
  /** a name or a bar opens the centred card over the drawer; the drawer's row order rides with it so ← → step the drawer's set */
  onOpenQuery: (id: string, set: string[]) => void;
  /** whether that card is open, and how it closes (Escape reaches it before the drawer) */
  cardOpen: boolean;
  onCardClose: () => void;
  /** whether the action drawer is open over everything — the drawer's keys stand down */
  actionOpen: boolean;
  /** each row's one next move — the action pill's words (`nextMove`) */
  moves: ReadonlyMap<string, { label: string }>;
  /** a row's action pill — the one action drawer, in the journey its next move names */
  onAct: (id: string) => void;
  /** a query to centre the timeline on when the drawer opens */
  focusId?: string | null;
  loading?: boolean;
  /**
   * ⚠️ WHETHER THE QUERY CENTRE IS THE PAGE ON SCREEN (Analytics v17, 5 Oct). Every workspace page stays
   * mounted and the tab is portalled to `document.body`, so without this the tab — and its B shortcut —
   * showed on every route, where Analytics' section tab sits in the same corner. The component stays
   * mounted either way, so the drawer's grouping, sort and filters survive a visit elsewhere.
   */
  routeActive?: boolean;
}> = ({ rows, nowMs, open, onOpenDrawer, onCloseDrawer, onOpenQuery, cardOpen, onCardClose, actionOpen, moves, onAct, focusId = null, loading = false, routeActive = true }) => {
  const [view, setView] = useState<BvdView>(BVD_DEFAULT);
  const [pop, setPop] = useState<Pop>(null);
  const popRef = useRef<Pop>(null);
  popRef.current = pop;
  const headRef = useRef<HTMLElement>(null);
  const place = useTabPlace();
  /* the drawer's clock is frozen when it opens, as the expanded card's was: a today that moved on a
     parent's re-render would slide the line, the pill and every bar end under the reader */
  const [clock, setClock] = useState(nowMs);
  useEffect(() => { if (open) setClock(Date.now()); }, [open]);

  const live = useMemo(() => eyeRows(rows, clock), [rows, clock]);
  const counts = useMemo(() => bvdCounts(live, clock), [live, clock]);
  const groups = useMemo(() => bvdGroups(rows, view, clock), [rows, view, clock]);
  const nFilters = bvdFilterCount(view);
  const shown = groups.reduce((n, g) => n + g.shown, 0);

  /* B opens it — never in a field, and never while something is open above the page */
  const keyState = useRef({ open, cardOpen, actionOpen, routeActive });
  keyState.current = { open, cardOpen, actionOpen, routeActive };
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const k = keyState.current;
      if (!k.routeActive || k.open || k.cardOpen || k.actionOpen || e.defaultPrevented || e.altKey || e.metaKey || e.ctrlKey) return;
      if (e.key !== "b" && e.key !== "B") return;
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, select, [contenteditable='true'], [role='dialog']")) return;
      e.preventDefault();
      onOpenDrawer();
    };
    document.addEventListener("keydown", on);
    return () => document.removeEventListener("keydown", on);
  }, [onOpenDrawer]);

  const close = useCallback(() => { setPop(null); onCloseDrawer(); }, [onCloseDrawer]);
  const ladder = useRef({ cardOpen, onCardClose, close });
  ladder.current = { cardOpen, onCardClose, close };
  useEffect(() => {
    if (!open) return undefined;
    const on = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const l = ladder.current;
      if (popRef.current) { setPop(null); return; }
      if (l.cardOpen) { l.onCardClose(); return; }
      l.close();
    };
    document.addEventListener("keydown", on, true);
    return () => document.removeEventListener("keydown", on, true);
  }, [open]);

  /* an outside press closes the popover; the pill that opened it counts as inside */
  useEffect(() => {
    if (!pop) return undefined;
    const away = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('[data-qcv="bvd-pop"], [data-qcv="bvd-pill"], [data-qcv="bvd-dir"]')) return;
      setPop(null);
    };
    document.addEventListener("pointerdown", away, true);
    return () => document.removeEventListener("pointerdown", away, true);
  }, [pop]);

  /* the page behind does not scroll while the drawer is open — the stage, and this page's own scroller */
  useEffect(() => {
    if (!open) return undefined;
    const release = lockStageScroll();
    const port = document.querySelector(".qcv-page")?.closest(".wpg-scroll") as HTMLElement | null;
    if (port) port.style.overflow = "hidden";
    return () => {
      release();
      const el = document.querySelector(".qcv-page")?.closest(".wpg-scroll") as HTMLElement | null;
      if (el) el.style.overflow = "";
    };
  }, [open]);

  /* the slide: mounted closed, then opened on the next frame so the transform has somewhere to come from */
  const [shown2, setShown2] = useState(false);
  useEffect(() => {
    if (!open) { setShown2(false); return undefined; }
    const id = requestAnimationFrame(() => setShown2(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  const toggleWhen = (k: BvdWhen) => setView((v) => ({ ...v, when: v.when.includes(k) ? v.when.filter((x) => x !== k) : [...v.when, k] }));
  const toggleStage = (k: BvdStage) => setView((v) => ({ ...v, stage: v.stage.includes(k) ? v.stage.filter((x) => x !== k) : [...v.stage, k] }));
  const clearFilters = () => setView((v) => ({ ...v, find: "", when: [], stage: [] }));
  const stageKeys = (Object.keys(BVD_STAGE_LABEL) as BvdStage[]).filter((k) => k !== "rr" || counts.stage.rr > 0);
  const groupLabel = BVD_GROUPS.find((g) => g.key === view.groupBy)!.label;
  const sortLabel = BVD_SORTS.find((s) => s.key === view.sortBy)!.label;
  const orderWord = BVD_ORDER[view.sortBy][view.reversed ? 1 : 0];

  const chips: { key: string; label: string; clear: () => void }[] = [
    ...(view.find.trim() ? [{ key: "find", label: `“${view.find.trim()}”`, clear: () => setView((v) => ({ ...v, find: "" })) }] : []),
    ...view.when.map((k) => ({ key: `w:${k}`, label: BVD_WHEN.find((w) => w.key === k)!.label, clear: () => toggleWhen(k) })),
    ...view.stage.map((k) => ({ key: `s:${k}`, label: BVD_STAGE_LABEL[k], clear: () => toggleStage(k) })),
  ];

  const tab = !open && place ? (
    <button
      type="button"
      className="bvd-tab"
      data-qcv="bvd-tab"
      style={{ right: place.right, bottom: place.bottom }}
      onClick={onOpenDrawer}
      aria-label={`Birds-eye view: ${counts.when.overdue} overdue, ${counts.when.upcoming} upcoming. Press B to open.`}
      disabled={loading}
    >
      <span className="bvd-tab-img"><img src={`${BE_HAWK_HEAD.src}?v=${BE_HAWK_HEAD.version}`} width={BE_HAWK_HEAD.width} height={BE_HAWK_HEAD.height} alt="" /></span>
      <span className="bvd-tab-t">
        <b>Birds-eye view</b>
        <small><em>{counts.when.overdue}</em> OVERDUE · <em>{counts.when.upcoming}</em> UPCOMING</small>
      </span>
      <span className="bvd-tab-go" aria-hidden="true">⤢</span>
    </button>
  ) : null;

  const drawer = open ? (
    <>
      <div className={`bvd-dim${shown2 ? " is-in" : ""}`} data-qcv="bvd-dim" onClick={close} aria-hidden="true" />
      <aside className={`bvd${shown2 ? " is-in" : ""}`} data-qcv="bvd" role="dialog" aria-modal="true" aria-labelledby="bvd-title">
        <header className="bvd-head" data-qcv="bvd-head" ref={headRef}>
          {/* ⚠️ INTERIM: the head is cut flat at both sides, so its sides are masked. When the uncut
              drawing arrives, the mask comes off (Nick, v126 §6). */}
          <img className="bvd-hawk" data-qcv="bvd-hawk" src={`${BE_HAWK_HEAD.src}?v=${BE_HAWK_HEAD.version}`} width={BE_HAWK_HEAD.width} height={BE_HAWK_HEAD.height} alt="" aria-hidden="true" />
          {/**
            * v126.2 — ONE GRID: the title, the three pills and the ×. From 1101px they share one 96px
            * row (title left and centred on the hawk, the pills and the × right); below it the pills
            * drop to a second row, as v126 drew it. The filter line is the grid's last row either way,
            * so opening it never moves the title, the pills or the hawk.
            */}
          <h2 id="bvd-title" className="bvd-title" data-qcv="bvd-title">Birds-eye view</h2>
          <button type="button" className="bvd-x" data-qcv="bvd-close" aria-label="Close the Birds-eye view" onClick={close}>
            <svg width="12" height="12" viewBox="0 0 13 13" fill="none" aria-hidden="true"><path d="M2 2l9 9M11 2l-9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </button>
          <div className="bvd-btb" data-qcv="bvd-btb">
            <span className="bvd-pw">
            <button type="button" className={`bvd-pill${nFilters ? " is-set" : ""}`} data-qcv="bvd-pill" data-k="filter"
              aria-haspopup="dialog" aria-expanded={pop === "filter"} onClick={() => setPop((p) => (p === "filter" ? null : "filter"))}>
              {FILTER_SVG}<span>{nFilters ? `Filters (${nFilters})` : "Filters"}</span>
            </button>
            {pop === "filter" && (
              <div className="bvd-pop bvd-pop--filter" data-qcv="bvd-pop" data-k="filter" role="dialog" aria-label="Filters">
                <label className="bvd-pfind">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                  <input value={view.find} onChange={(e) => setView((v) => ({ ...v, find: e.target.value }))} placeholder="Find an agent or agency" aria-label="Find an agent or agency" />
                </label>
                <p className="bvd-ph">When</p>
                <div className="bvd-chips">
                  {BVD_WHEN.map((w) => (
                    <button key={w.key} type="button" className="bvd-chip" data-qcv="bvd-chip" aria-pressed={view.when.includes(w.key)} onClick={() => toggleWhen(w.key)}>
                      {w.label} <em>{counts.when[w.key]}</em>
                    </button>
                  ))}
                </div>
                <p className="bvd-ph">Stage</p>
                <div className="bvd-chips">
                  {stageKeys.map((k) => (
                    <button key={k} type="button" className="bvd-chip" data-qcv="bvd-chip" aria-pressed={view.stage.includes(k)} onClick={() => toggleStage(k)}>
                      {BVD_STAGE_LABEL[k]} <em>{counts.stage[k]}</em>
                    </button>
                  ))}
                </div>
                <div className="bvd-pfoot">
                  <button type="button" className="bvd-pclear" onClick={clearFilters} disabled={!nFilters}>Clear</button>
                  <button type="button" className="bvd-pdone" onClick={() => setPop(null)}>Done</button>
                </div>
              </div>
            )}
            </span>
            <span className="bvd-pw">
            <button type="button" className={`bvd-pill${view.groupBy !== BVD_DEFAULT.groupBy ? " is-set" : ""}`} data-qcv="bvd-pill" data-k="group"
              aria-haspopup="menu" aria-expanded={pop === "group"} onClick={() => setPop((p) => (p === "group" ? null : "group"))}>
              {GROUP_SVG}<span><i>Grouped:</i> {groupLabel}</span>
            </button>
            {pop === "group" && (
              <div className="bvd-pop bvd-pop--group" data-qcv="bvd-pop" data-k="group" role="menu" aria-label="Group by">
                {BVD_GROUPS.map((g) => (
                  <React.Fragment key={g.key}>
                    {g.key === "none" && <hr />}
                    <button type="button" role="menuitemradio" aria-checked={view.groupBy === g.key} data-v={g.key} className="bvd-opt"
                      onClick={() => { setView((v) => ({ ...v, groupBy: g.key })); setPop(null); }}>
                      <i className="bvd-radio" aria-hidden="true" />{g.label}
                    </button>
                  </React.Fragment>
                ))}
              </div>
            )}
            </span>
            <span className="bvd-sortj">
              <button type="button" className={`bvd-pill bvd-pill--l${view.sortBy !== BVD_DEFAULT.sortBy ? " is-set" : ""}`} data-qcv="bvd-pill" data-k="sort"
                aria-haspopup="menu" aria-expanded={pop === "sort"} onClick={() => setPop((p) => (p === "sort" ? null : "sort"))}>
                <span><i>Sort:</i> {sortLabel}</span>{CARET_SVG}
              </button>
              <button type="button" className={`bvd-dir${view.reversed ? " is-set" : ""}`} data-qcv="bvd-dir"
                aria-label={`Sort order: ${orderWord}`} title={`Sort order: ${orderWord}`}
                onClick={() => setView((v) => ({ ...v, reversed: !v.reversed }))}>
                {DIR_SVG(view.reversed)}
              </button>
            {pop === "sort" && (
              <div className="bvd-pop bvd-pop--sort" data-qcv="bvd-pop" data-k="sort" role="menu" aria-label="Sort by">
                {BVD_SORTS.map((s) => (
                  <button key={s.key} type="button" role="menuitemradio" aria-checked={view.sortBy === s.key} data-v={s.key} className="bvd-opt bvd-opt--2"
                    onClick={() => { setView((v) => pickSort(v, s.key)); setPop(null); }}>
                    <i className="bvd-radio" aria-hidden="true" />
                    <span><b>{s.label}</b><small>{s.hint}</small></span>
                  </button>
                ))}
              </div>
            )}
            </span>
          </div>
          {nFilters > 0 && (
            <div className="bvd-fline" data-qcv="bvd-fline">
              <span className="bvd-fshow">Showing <b>{shown}</b> of {live.length}</span>
              {chips.map((c) => (
                <span key={c.key} className="bvd-fchip" data-qcv="bvd-fchip">{c.label}
                  <button type="button" aria-label={`Remove ${c.label}`} onClick={c.clear}>×</button>
                </span>
              ))}
              <button type="button" className="bvd-fclear" data-qcv="bvd-fclear" onClick={clearFilters}>Clear all</button>
            </div>
          )}

        </header>

        <div className="bvd-body" data-qcv="bvd-body">
          {groups.length === 0 && nFilters > 0 ? (
            <div className="bvd-empty" data-qcv="bvd-empty">
              <p>Nothing matches these filters</p>
              <button type="button" onClick={clearFilters}>Clear</button>
            </div>
          ) : (
            <QcTimeline
              rows={rows} groups={groups} banded={view.groupBy !== "none"} nowMs={clock} focusId={focusId}
              onOpen={(id) => onOpenQuery(id, groups.flatMap((g) => g.rows.map((r) => r.id)))} moves={moves} onAct={onAct} keysActive={!cardOpen && !actionOpen && !pop} filtered={nFilters > 0}
            />
          )}
        </div>
        <p className="bvd-foot" data-qcv="bvd-foot">DRAG THE DATES OR USE ← → TO SCROLL · T FOR TODAY · ● MARKS A QUERY PAST ITS DATE · CLICK A ROW TO OPEN IT</p>
      </aside>
    </>
  ) : null;

  if (typeof document === "undefined" || !routeActive) return null;
  return createPortal(<>{tab}{drawer}</>, document.body);
};
