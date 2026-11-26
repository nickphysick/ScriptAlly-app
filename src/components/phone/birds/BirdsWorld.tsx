/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone Birds-eye world v3 (design-refs/phone-birds-eye-world-v3/phone-birds-eye-world-v3.html; v2's ref for what v3
 * leaves alone) — THE VIEW. Below 768px only: the Birds-eye side of the Queries list's List | Birds-eye switch.
 *   - THE ENGINE IS lib/birdsWorld; THE FRAME IS drawWorld, one layer rebuilt per animation frame in screen space. React
 *     renders the shell, the sheets and the cards; nothing re-renders per pointer move (the view, the scrubber and the
 *     pull live in refs and are painted).
 *   - v3: the level control (All / Months / Weeks; pinch and Ctrl+wheel snap to the nearest, a double tap steps on) in
 *     place of + / −, "See it all" and the mini map; a pill stays fitted; tap a heading to fold its group (remembered on
 *     this device); a hold on a zoomed-in bar opens the quick menu, anywhere else it scrubs; a tap on a bar opens its
 *     timeline sheet; the "?" opens the colour key; search flies to the row; the hawk's news and one-liners; the "No
 *     reply date yet" group and its sheet with the app's slider; pull to refresh on the fitted view; haptics; the
 *     replay's recap.
 *   - EVERY ACTION OPENS THE APP'S OWN JOURNEY (`actOf`): They replied → Record a response (`runAct("reply")`); Send a
 *     nudge and I've sent it → the drawer's nudge and sent journeys (`runAct`); Edit dates → "Edit this query"
 *     (`pa3:edit-query`, as the query page's Edit does); Open query → the query card (`openV3Query`). Reopen has no
 *     phone journey (the card journey is hosted on the desktop Query Centre only), so it opens the query card.
 *   - PER DEVICE (localStorage): when this writer last opened Birds-eye (`BW_SEEN_KEY`, recorded once the news is seen
 *     or the tab is left), and which groups are folded (`BW_FOLD_KEY`).
 * ⚠️ COPY: never "overdue" or "late".
 */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { doc, getDocFromServer } from "firebase/firestore";
import { useV3Data } from "../v3/V3Provider";
import { openV3, openV3Query } from "../v3/v3Store";
import { runAct } from "../v4/acts";
import { eyeRows, type EyeRow } from "../../../lib/qcBirdsEye";
import type { QcRow } from "../../../lib/qcSummary";
import { DEFAULT_QUIET_WEEKS } from "../../../lib/queryState";
import { writerExpectedWrite } from "../../../lib/expectedDate";
import { db } from "../../../lib/firebase";
import {
  PILLS, PILL_LABEL, REPLAY_MS, RH, RULE, TOPFIT, TOPFOLD, WX, bandOf, bwCounts, bwGroups, bwRow, changes, chipForCourt, dateOf, dayFromMs, dm, isDrawn,
  isNoDate, makeWorld, menuActions, noDateRows, recapStats, replayAt, replayStart, rowSegs, sampleRows, seenLabel, tips,
  type BwAct, type BwChange, type BwFilter, type BwRow, type BwView, type World,
} from "../../../lib/birdsWorld";
import { drawWorld } from "./drawWorld";
import { buzz, shadowStyle, wireMotion, type Motion } from "./worldMotion";
import { KeySheet, NoDateSheet, QuickMenu, RecapCard, SearchSheet, TimelineSheet } from "./BirdsSheets";
import "./birdsWorld.css";

const I = (d: string, w = 1.8) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: d }} />
);
export const BW_IC = {
  search: '<circle cx="11" cy="11" r="7"/><path d="M16.5 16.5L21 21"/>',
  play: '<path d="M8 5l11 7-11 7z"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
  key: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.4"/><path d="M12 16.8h.01"/>',
};
/** the Birds-eye hawk (the desktop Birds-eye's own head), read, never changed */
export const BW_HAWK = "/images/qc/be-hawk-head.png";
export const BW_SHADOW = { src: "/images/hawk-shadow.png", version: 1 };
/** the first-visit hint, seen (v1's key, kept) */
export const BW_HINT_KEY = "bw1.hint.seen";
/** when this writer last opened Birds-eye on this device (an instant, ms) */
export const BW_SEEN_KEY = "bw3.lastOpened";
/** the groups folded on this device (a JSON list of group names) */
export const BW_FOLD_KEY = "bw3.folded";
const PULL_AT = 80;

/** a phone on its side (v5's rule, kept): wider than tall and under 560px tall */
export const useLandscape = (): boolean => {
  const read = () => typeof window !== "undefined" && window.innerWidth > window.innerHeight && window.innerHeight < 560;
  const [l, setL] = useState(read);
  useEffect(() => { const f = () => setL(read()); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, []);
  return l;
};
const dockHeight = (): number => {
  if (typeof document === "undefined") return 72;
  const d = document.querySelector<HTMLElement>('[data-pa5="dock"]');
  const r = d?.getBoundingClientRect();
  return r && r.height > 0 && getComputedStyle(d!).display !== "none" ? Math.round(window.innerHeight - r.top) : 72;
};
const calm = (): boolean => { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; } };
const store = {
  get: (k: string): string | null => { try { return window.localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string): void => { try { window.localStorage.setItem(k, v); } catch { /* storage refused: the view still works */ } },
};
const readFolded = (): Set<string> => { try { const v = JSON.parse(store.get(BW_FOLD_KEY) ?? "[]"); return new Set(Array.isArray(v) ? v.map(String) : []); } catch { return new Set(); } };

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
const PADY_CLOSED = 256;

/** what each menu action opens: the app's own journeys (recon); Reopen falls back to the query card */
export function actOf(a: BwAct, id: string): void {
  switch (a) {
    case "replied": runAct("reply", id); return;
    case "nudge": runAct("nudge", id); return;
    case "sent": runAct("sent", id); return;
    case "edit": window.dispatchEvent(new CustomEvent("pa3:edit-query", { detail: id })); return;
    case "open": openV3Query(id); return;
    case "reopen": openV3Query(id); return;
    default: { const unhandled: never = a; void unhandled; }
  }
}

export interface BirdsWorldProps {
  court?: string | null;
  onBack: () => void;
  onList: () => void;
}
type SheetState = null | { k: "row"; id: string } | { k: "key" } | { k: "search" } | { k: "nd"; id: string; queue: string[] };
type TipState = null | { k: "news" } | { k: "line"; i: number };

export const BirdsWorld: React.FC<BirdsWorldProps> = ({ court = null, onBack, onList }) => {
  const v = useV3Data();
  const now = v.now;
  const quietDays = (v.quietWeeks ?? DEFAULT_QUIET_WEEKS) * 7;
  const loc = useLocation();
  const hawk = new URLSearchParams(loc.search).get("hawk") !== "0";
  const land = useLandscape();

  /* ── the engine ── */
  const real = useMemo(() => {
    const open = v.qs.filter((x) => x.court !== "closed"), closed = v.qs.filter((x) => x.court === "closed");
    const live = eyeRows(open.map((x) => x.row as QcRow), now).map((e) => bwRow(e, now));
    const shut = closed.map((x) => bwRow({ id: x.id, row: x.row as QcRow, court: "agent" } as unknown as EyeRow, now, true));
    return [...live, ...shut];
  }, [v.qs, now]);
  const demo = real.length === 0;
  const rows: BwRow[] = useMemo(() => (demo ? sampleRows() : real), [demo, real]);
  const byId = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);
  const counts = useMemo(() => bwCounts(rows), [rows]);
  const [filter, setFilter] = useState<BwFilter>(() => chipForCourt(court));
  useEffect(() => { setFilter(chipForCourt(court)); }, [court]);
  const f: BwFilter = demo ? "all" : filter;
  const [folded, setFolded] = useState<Set<string>>(readFolded);
  const groups = useMemo(() => bwGroups(rows, f), [rows, f]);
  const card = cardFor(demo, f, groups);
  const pady = card?.k === "closed" ? PADY_CLOSED : 0;
  const explorable = !demo && groups.some((g) => g.rows.length);

  /* ── the hawk's news: since this device last opened Birds-eye ── */
  const [seenMs] = useState<number | null>(() => { const v0 = Number(store.get(BW_SEEN_KEY)); return Number.isFinite(v0) && v0 > 0 ? v0 : null; });
  const seenDay = seenMs == null ? 0 : dayFromMs(seenMs, now);
  const news: BwChange[] = useMemo(() => (demo || seenMs == null ? [] : changes(rows, seenDay)), [demo, seenMs, rows, seenDay]);
  const [newsSeen, setNewsSeen] = useState(false);
  const recordVisit = useCallback(() => store.set(BW_SEEN_KEY, String(Date.now())), []);
  /* "last opened" is recorded once the news has been seen, or when the writer leaves the tab — never on a quick look */
  useEffect(() => {
    const away = () => { if (document.visibilityState === "hidden") recordVisit(); };
    document.addEventListener("visibilitychange", away);
    return () => { document.removeEventListener("visibilitychange", away); recordVisit(); };
  }, [recordVisit]);
  const lines = useMemo(() => tips(rows, quietDays), [rows, quietDays]);

  /* ── React state the sheets and cards read ── */
  const [sheet, setSheet] = useState<SheetState>(null);
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [tip, setTip] = useState<TipState>(null);
  const [step, setStep] = useState(-1);
  const [recap, setRecap] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [top, setTop] = useState(TOPFIT);
  const [showHint] = useState(() => store.get(BW_HINT_KEY) !== "1");

  /* ── the view state, off React's render ── */
  const root = useRef<HTMLDivElement>(null);
  const vp = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const over = useRef<HTMLDivElement>(null);
  const hd = useRef<HTMLDivElement>(null);
  const chips = useRef<HTMLDivElement>(null);
  const lvl = useRef<HTMLDivElement>(null);
  const hs = useRef<HTMLImageElement>(null);
  const hint = useRef<HTMLDivElement>(null);
  const recapRef = useRef<HTMLDivElement>(null);
  const W = useRef<World | null>(null);
  const S = useRef<BwView>({ z: 1, ox: 0, oy: 0 });
  const frame = useRef(0);
  const motion = useRef<Motion | null>(null);
  const rp = useRef<{ rt: number | null; raf: number }>({ rt: null, raf: 0 });
  /* ⚠️ declared above paint, which reads it (CLAUDE.md: order, not hoisting) */
  const refreshingRef = useRef(false);
  const live = useRef<{ scrub: number | null; scrubDay: number | null; pull: number; glow: { id: string; d: number | null } | null; refreshes: number }>({ scrub: null, scrubDay: null, pull: 0, glow: null, refreshes: 0 });

  const paint = useCallback(() => {
    const w = W.current, el = layer.current;
    if (!w || !el) return;
    const Sv = S.current, L = live.current;
    const fr = drawWorld(w, Sv, { nowMs: now, quietDays, rt: rp.current.rt, rows, pady, scrub: L.scrub, glow: L.glow });
    el.innerHTML = fr.html;
    if (fr.scrubDay !== L.scrubDay) { if (L.scrubDay != null && fr.scrubDay != null) buzz(4); L.scrubDay = fr.scrubDay; }
    hd.current?.classList.toggle("col", fr.zoomed || w.land);
    /* the pull's pill, under the ruler, following the finger */
    if (over.current) {
      const k = Math.min(1, L.pull / PULL_AT);
      over.current.innerHTML = L.pull > 0 || refreshingRef.current ? `<div class="bw-ptr${refreshingRef.current ? " go" : ""}" data-bw="pull" style="top:${fr.top + RULE + 6 + Math.min(L.pull, 90) * 0.5}px;opacity:${refreshingRef.current ? 1 : k}"><img src="${BW_HAWK}" alt="" style="transform:rotate(${refreshingRef.current ? 0 : k * -30}deg) scale(${0.6 + k * 0.4})"><span>${refreshingRef.current ? "Checking for news…" : k >= 1 ? "Let go to refresh" : "Pull to refresh"}</span></div>` : "";
    }
    const n = w.nearestLv(Sv.z);
    lvl.current?.querySelectorAll<HTMLButtonElement>("button").forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.i) === n)));
    if (hs.current) Object.assign(hs.current.style, shadowStyle(Sv.z, Sv.ox, Sv.oy, w.fitView()));
    const r = root.current;
    if (r) {
      Object.assign(r.dataset, {
        z: Sv.z.toFixed(3), rp: w.rowPx(Sv.z).toFixed(2), off: String(fr.off), ox: Sv.ox.toFixed(2), oy: Sv.oy.toFixed(2), sx: w.SX(Sv.z).toFixed(5),
        d0: String(w.ext.D0), d1: String(w.ext.D1), ppd: w.PPD.toFixed(6), gap: w.gapPx(Sv.z).toFixed(2), top: String(fr.top + RULE), lx: fr.lx.toFixed(2),
        maxz: w.maxZ.toFixed(3), zoomed: fr.zoomed ? "1" : "0", level: w.levels[n].t, levels: w.levels.map((l) => `${l.t}:${l.z.toFixed(3)}`).join(","),
        scrub: fr.scrubDay == null ? "" : String(fr.scrubDay), pull: String(Math.round(L.pull)), refreshes: String(L.refreshes),
      });
    }
    setTop((t) => (t === fr.top ? t : fr.top));
  }, [now, quietDays, rows, pady]); // eslint-disable-line react-hooks/exhaustive-deps
  const draw = useCallback(() => { if (frame.current) return; frame.current = requestAnimationFrame(() => { frame.current = 0; paint(); }); }, [paint]);

  const build = useCallback((keep: boolean) => {
    const el = vp.current;
    if (!el) return;
    const bot = land ? 16 : dockHeight() + 16;
    W.current = makeWorld({ rows, filter: f, vpW: el.clientWidth || 390, vpH: el.clientHeight || 784, bot, land, folded });
    root.current?.style.setProperty("--bw-cb", `${bot + 8}px`);
    S.current = keep ? W.current.clamp(S.current) : W.current.fitView();
    paint();
  }, [rows, f, land, folded, paint]);
  /* a pill or new data opens fitted (a pill stays at z = 1); a fold keeps where you are */
  useLayoutEffect(() => { build(false); }, [rows, f, land]); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => { build(true); }, [folded]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const el = vp.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(() => build(true));
    ro.observe(el);
    return () => ro.disconnect();
  }, [build]);
  useEffect(() => () => { cancelAnimationFrame(frame.current); cancelAnimationFrame(rp.current.raf); }, []);
  useEffect(() => { document.body.classList.toggle("pa41-land", land); return () => document.body.classList.remove("pa41-land"); }, [land]);
  useEffect(() => {
    const c = chips.current;
    if (!c) return undefined;
    const more = () => c.classList.toggle("more", c.scrollLeft + c.clientWidth < c.scrollWidth - 2);
    more(); c.addEventListener("scroll", more, { passive: true }); window.addEventListener("resize", more);
    return () => { c.removeEventListener("scroll", more); window.removeEventListener("resize", more); };
  }, [counts, demo]);
  useEffect(() => { if (!toast) return undefined; const t = setTimeout(() => setToast(null), 2200); return () => clearTimeout(t); }, [toast]);

  /* ── snapping between the levels (ref `snapTo`) ── */
  const snapTo = useCallback((i: number, cx: number, cy: number, today = false) => {
    const w = W.current, m = motion.current;
    if (!w || !m) return;
    buzz(8);
    i = Math.max(0, Math.min(w.levels.length - 1, i));
    if (i === 0) { m.animateTo(w.fitView(), 380); return; }
    const Sv = S.current, z = w.levels[i].z, wx = (cx - Sv.ox) / w.SX(Sv.z), wy = w.yWorld(cy - Sv.oy, Sv.z);
    m.animateTo(w.clamp({ z, ox: today ? w.vpW * 0.7 - w.LINE * w.SX(z) : cx - wx * w.SX(z), oy: cy - w.yOff(wy, z) }), 380);
  }, []);

  /* ── replay, and its recap ── */
  const stopReplay = useCallback((end = false) => {
    cancelAnimationFrame(rp.current.raf);
    if (rp.current.rt == null) return;
    rp.current.rt = null;
    if (root.current) root.current.dataset.replay = "done";
    paint();
    if (end) setRecap(true);
  }, [paint]);
  const replay = useCallback(() => {
    const w = W.current;
    if (rp.current.rt != null || calm()) { stopReplay(); return; }
    if (!w || !rows.some((r) => isDrawn(r) || isNoDate(r))) return;
    motion.current?.stop();
    setRecap(false); setTip(null);
    const t0 = replayStart(rows);
    S.current = w.fitView();
    rp.current.rt = t0;
    if (root.current) root.current.dataset.replay = "running";
    paint();
    const st = performance.now();
    const stepF = (n: number) => {
      const k = Math.min(1, (n - st) / REPLAY_MS);
      rp.current.rt = replayAt(t0, k);
      if (root.current) root.current.dataset.rt = rp.current.rt.toFixed(2);
      paint();
      if (k < 1) rp.current.raf = requestAnimationFrame(stepF); else stopReplay(true);
    };
    rp.current.raf = requestAnimationFrame(stepF);
  }, [rows, paint, stopReplay]);

  /* ── where search flies, and where the news steps (ref `flyTo`, `stepTo`) ── */
  const rowY = (id: string): number | null => { for (const g of W.current?.G ?? []) for (const p of g.rows) if (p.r.id === id) return p.y; return null; };
  const pendingFly = useRef<string | null>(null);
  const flyNow = useCallback((id: string) => {
    const w = W.current, m = motion.current, r = byId.get(id), y = rowY(id);
    if (!w || !m || !r || y == null) return false;
    const z = w.levels[w.levels.length - 1].z, at = r.due != null ? Math.min(0, r.due) : 0;
    live.current.glow = { id, d: null };
    m.animateTo(w.clamp({ z, ox: w.vpW * 0.6 - w.wxd(at) * w.SX(z), oy: w.vpH * 0.42 - w.yOff(y, z) }), 620);
    if (root.current) root.current.dataset.flown = id;
    setTimeout(() => { if (live.current.glow?.id === id) { live.current.glow = null; draw(); } }, 2600);
    return true;
  }, [byId, draw]);
  const flyTo = useCallback((id: string) => {
    setSheet(null);
    const r = byId.get(id);
    if (!r) return;
    /* back to All, and the row's group unfolded, before the flight */
    const g = bwGroups(rows, "all").find((x) => x.rows.some((y) => y.id === id))?.t;
    const needAll = f !== "all", needOpen = !!g && folded.has(g);
    if (needAll || needOpen) {
      pendingFly.current = id;
      if (needAll) setFilter("all");
      if (needOpen) setFolded((s) => { const n = new Set(s); n.delete(g!); store.set(BW_FOLD_KEY, JSON.stringify([...n])); return n; });
      return;
    }
    flyNow(id);
  }, [byId, rows, f, folded, flyNow]);
  useEffect(() => { const id = pendingFly.current; if (id && rowY(id) != null) { pendingFly.current = null; requestAnimationFrame(() => flyNow(id)); } }, [groups, folded, flyNow]); // eslint-disable-line react-hooks/exhaustive-deps

  const stepTo = useCallback((i: number) => {
    const w = W.current, m = motion.current;
    if (!w || !m) return;
    if (i >= news.length) {
      setStep(-1); live.current.glow = null; setNewsSeen(true); recordVisit(); m.animateTo(w.fitView(), 480); return;
    }
    const it = news[i], y = rowY(it.id);
    if (y == null) { stepTo(i + 1); return; }
    setStep(i);
    const z = Math.min(w.maxZ, Math.max(1.2, (48 / (RH * w.fitSY())) * 1.4));
    live.current.glow = { id: it.id, d: it.d };
    m.animateTo(w.clamp({ z, ox: w.vpW * 0.56 - w.wxd(it.d) * w.SX(z), oy: w.vpH * 0.42 - w.yOff(y, z) }), 520);
  }, [news, recordVisit]);

  /* ── movement ── */
  const touched = useCallback((): boolean => {
    if (recap) { setRecap(false); return false; }
    if (rp.current.rt != null) { stopReplay(); return false; }
    const h = hint.current;
    if (h && !h.classList.contains("hide")) { h.classList.add("hide"); store.set(BW_HINT_KEY, "1"); }
    return true;
  }, [recap, stopReplay]);
  const refresh = useCallback(async () => {
    refreshingRef.current = true; setRefreshing(true); live.current.refreshes += 1; draw();
    const t0 = Date.now();
    /* the queries are live (onSnapshot): one round-trip to the server confirms the listener is current */
    try { const uid = v.core.db.currentUser?.id; if (uid) await getDocFromServer(doc(db, "users", uid)); } catch { /* offline: the toast still says what the listener has */ }
    await new Promise((res) => setTimeout(res, Math.max(0, 1100 - (Date.now() - t0))));
    refreshingRef.current = false; setRefreshing(false); draw();
    setToast("You’re up to date.");
  }, [v.core.db.currentUser?.id, draw]);
  useEffect(() => {
    const el = vp.current;
    if (!el || demo) return undefined;
    const m = wireMotion({
      vp: el, world: () => W.current, S, draw, calm, touched,
      openRow: (id) => { const r = byId.get(id); if (!r) return; if (isNoDate(r)) setSheet({ k: "nd", id, queue: noDateRows(rows).map((x) => x.id) }); else setSheet({ k: "row", id }); },
      longPress: (x, y, cx, cy) => {
        const w = W.current;
        if (w && S.current.z > 1.05) {
          const els = document.elementsFromPoint(cx, cy);
          const onBar = els.some((e) => e.classList?.contains("bw-bar") || e.classList?.contains("bw-ndt"));
          const hit = onBar ? (els.find((e) => e.classList?.contains("bw-hit")) as HTMLElement | undefined) : undefined;
          if (hit?.dataset.id) { buzz(12); setMenu({ id: hit.dataset.id, x, y }); return "menu"; }
        }
        buzz(8);
        return "scrub";
      },
      scrubMove: (x) => { live.current.scrub = x; draw(); },
      scrubEnd: () => { live.current.scrub = null; live.current.scrubDay = null; draw(); },
      canPull: () => !refreshingRef.current && S.current.z <= 1.05,
      pull: (dy) => { const L = live.current, was = L.pull; L.pull = Math.max(0, Math.min(140, L.pull + (dy > 0 ? dy * 0.6 : dy))); if (was < PULL_AT && L.pull >= PULL_AT) buzz(10); draw(); },
      pullEnd: () => { const go = live.current.pull >= PULL_AT; live.current.pull = 0; draw(); if (go) void refresh(); },
      snapped: (px, py) => { const w = W.current; if (w) snapTo(w.nearestLv(S.current.z), px, py); },
      doubleTap: (px, py) => { const w = W.current; if (!w) return; const n = w.nearestLv(S.current.z); snapTo(n + 1 < w.levels.length ? n + 1 : 0, px, py); },
    });
    motion.current = m;
    return () => { m.dispose(); motion.current = null; };
  }, [draw, touched, demo, byId, rows, refresh, snapTo]);

  const onClick = (e: React.MouseEvent) => {
    const b = (e.target as Element).closest<HTMLElement>("[data-a]"), w = W.current, m = motion.current;
    if (!b || !w) return;
    const a = b.dataset.a, Sv = S.current;
    if (a === "fold") {
      const t = b.dataset.g!; buzz(8);
      setFolded((s) => { const n = new Set(s); if (n.has(t)) n.delete(t); else n.add(t); store.set(BW_FOLD_KEY, JSON.stringify([...n])); return n; });
      return;
    }
    if (a === "ndset") { const id = b.dataset.id!; setSheet({ k: "nd", id, queue: noDateRows(rows).map((x) => x.id) }); return; }
    if (!m) return;
    if (a === "lvl") { touched(); snapTo(Number(b.dataset.i), w.vpW / 2, (w.vpH - 80) / 2, true); }
    else if (a === "toline") m.animateTo(w.clamp({ z: Sv.z, ox: w.vpW * 0.62 - w.LINE * w.SX(Sv.z), oy: Sv.oy }), 380);
  };

  const pick = (k: BwFilter) => { touched(); buzz(8); setFilter((cur) => (cur === k || k === "all" ? "all" : k)); };
  const onHawk = () => {
    if (demo) return;
    if (news.length && !newsSeen && tip == null && step < 0) { setTip({ k: "news" }); return; }
    if (!lines.length) { setTip(null); return; }
    setTip((t) => (t?.k === "line" ? (t.i + 1 < lines.length ? { k: "line", i: t.i + 1 } : null) : { k: "line", i: 0 }));
  };
  const showMe = () => { setTip(null); stepTo(0); };

  /* the recap's share: the card as a picture, through the phone's share sheet, or a download where there is none */
  const share = async () => {
    const el = recapRef.current;
    if (!el) return;
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(el, { backgroundColor: null, scale: 2, ignoreElements: (n) => n.getAttribute?.("data-html2canvas-ignore") === "true" });
      const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/png"));
      if (!blob) return;
      const file = new File([blob], "querying-so-far.png", { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
      if (nav.share && (!nav.canShare || nav.canShare({ files: [file] }))) { await nav.share({ files: [file], title: "Your querying so far" }); return; }
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    } catch { /* a share the writer cancelled, or no picture: nothing to say */ }
  };
  const recapData = useMemo(() => {
    const w = W.current, stats = recapStats(rows);
    if (!w) return { stats, bars: [] as { l: number; w: number; t: number; c: string }[] };
    const xs = 250 / WX, ys = 96 / Math.max(1, w.H);
    const bars = w.G.flatMap((g) => g.rows.flatMap(({ r, y }) => rowSegs(r, quietDays).filter((s) => s.k === "stage" || s.k === "ahead").map((s) => ({ l: w.wxd(s.a) * xs, w: Math.max(1, (w.wxd(s.b) - w.wxd(s.a)) * xs), t: y * ys, c: bandOf(s.st) }))));
    return { stats, bars };
  }, [rows, recap, quietDays]); // eslint-disable-line react-hooks/exhaustive-deps

  /* the no-date sheet: save sets the writer's own reply date (the app's write), then the next */
  const ndRow = sheet?.k === "nd" ? byId.get(sheet.id) ?? null : null;
  const ndQueue = sheet?.k === "nd" ? sheet.queue : [];
  const ndNext = (id: string, saved: boolean, weeks?: number) => {
    const q = ndQueue.filter((x) => x !== id && byId.get(x) && isNoDate(byId.get(x)!));
    if (saved) {
      const r = byId.get(id);
      if (r && weeks != null) void v.core.db.updateQuery(id, writerExpectedWrite(dateOf((r.ev[0]?.d ?? 0) + weeks * 7, now).toISOString()) as never);
      buzz(8);
    }
    const nxt = q[0];
    if (nxt) { setSheet({ k: "nd", id: nxt, queue: q }); if (saved && weeks != null) setToast(`Saved. Reply by ${dmOf((byId.get(id)?.ev[0]?.d ?? 0) + weeks * 7)}.`); }
    else { setSheet(null); if (saved) setToast("Every query has a reply date."); }
  };
  const dmOf = (d: number) => dm(d, now);
  const statedOf = (id: string): number | null => {
    const q = v.byId.get(id), agentId = (q?.row as { query?: { agentId?: string } } | undefined)?.query?.agentId;
    const a = agentId ? v.core.db.agents.find((x) => x.id === agentId) : undefined;
    return a?.responseTimeWeeks ?? null;
  };

  const vpH = vp.current?.clientHeight ?? 784;
  const cardTop = card ? (card.k === "closed" ? top + RULE + 16 : (top + RULE + vpH - 96) / 2) : 0;
  const levels = W.current?.levels ?? [{ t: "All" as const, z: 1 }];
  const tipTop = top + 4;
  const sheetRow = sheet?.k === "row" ? byId.get(sheet.id) ?? null : null;
  const menuRow = menu ? byId.get(menu.id) ?? null : null;

  const body = (
    <div ref={root} className={`pa-layer bw${land ? " land" : ""}${demo ? " isdemo" : ""}`} data-bw="world" data-pa5="birds-view" data-filter={f}
      data-n={groups.reduce((a, g) => a + g.rows.length, 0)} data-court={court ?? ""} data-replay="idle" data-hawk={hawk ? "1" : "0"} data-demo={demo ? "1" : "0"}
      data-card={card?.k ?? ""} data-news={news.length} data-step={step} data-recap={recap ? "1" : "0"} onClick={onClick}>
      <div ref={vp} className="bw-vp" data-bw="vp">
        <div ref={layer} className={`bw-w${demo ? " demo" : ""}`} data-bw="layer" />
        <div ref={over} className="bw-over" data-bw="over" />
        {card ? (
          <div className={`bw-card${card.k === "closed" ? "" : " mid"}`} data-bw="card" data-k={card.k}
            style={{ top: cardTop, borderRadius: 20, boxShadow: "0 1px 2px rgba(31,38,51,.08),0 12px 32px rgba(31,38,51,.14)" }}>
            <img src={BW_HAWK} alt="" />
            <b>{card.title}</b>
            <span>{card.line}</span>
            {card.cta === "all"
              ? <button type="button" className="bw-go3" data-bw="see-all" onClick={() => pick("all")}>See all queries</button>
              : <button type="button" className="bw-go2" data-bw="log" onClick={() => openV3({ type: "plus" })}>Log a query</button>}
          </div>
        ) : null}
        <div ref={hint} className={`bw-hint${showHint && explorable ? "" : " hide"}`} data-bw="hint">Pinch to zoom · hold to scrub</div>
        <div ref={lvl} className="bw-zc lvl" data-bw="levels">
          {levels.map((l, i) => ({ l, i })).reverse().map(({ l, i }) => <button key={l.t} type="button" data-a="lvl" data-i={i} data-bw="level" data-t={l.t} aria-pressed={i === 0}>{l.t}</button>)}
        </div>
        {step >= 0 && news[step] ? (
          <div className="bw-sinces" data-bw="news-step" style={{ bottom: `var(--bw-cb, 96px)` }}>
            <span><em>{step + 1} of {news.length}</em>{news[step].t}</span>
            <button type="button" data-bw="news-next" onClick={() => stepTo(step + 1)}>{step + 1 < news.length ? "Next" : "Done"}</button>
          </div>
        ) : null}
        {recap ? <RecapCard cardRef={recapRef} stats={recapData.stats} bars={recapData.bars} hawk={BW_HAWK} onShare={() => void share()} onDone={() => setRecap(false)} /> : null}
        {toast ? <div className="bw-tst" data-bw="toast" style={{ bottom: `calc(var(--bw-cb, 96px) + 8px)` }}>{toast}</div> : null}
      </div>
      {hawk ? <div className="bw-hsw" data-bw="hawk" aria-hidden="true"><img ref={hs} className="bw-hs" alt="" src={`${BW_SHADOW.src}?v=${BW_SHADOW.version}`} /></div> : null}
      <div ref={hd} className={`bw-hd${land ? " col" : ""}${f !== "all" ? " filt" : ""}`} data-bw="head">
        <div className="bw-t2">
          <button type="button" className="bw-ib back" aria-label="Back" data-bw="back" onClick={onBack}>{I(BW_IC.back, 2)}</button>
          <button type="button" className="bw-bewrap" data-bw="hawk-btn" aria-label={news.length && !newsSeen ? `${news.length} things changed` : "The hawk"} onClick={onHawk}>
            <img className="bw-behk" data-bw="badge" src={BW_HAWK} alt="" />
            {news.length && !newsSeen ? <em className="bw-bedot" data-bw="news-count">{news.length}</em> : null}
          </button>
          <h1 className="bw-h">Birds-eye view</h1>
          {f !== "all" ? <button type="button" className="bw-fon" data-bw="fon" data-k={f} onClick={() => pick("all")}>{PILL_LABEL[f]} ✕</button> : null}
          <button type="button" className="bw-ib" aria-label="List" data-bw="list" onClick={onList}>{I(BW_IC.list, 2)}</button>
          <button type="button" className="bw-ib" aria-label="Replay your campaign" data-bw="replay" onClick={() => { if (!demo) replay(); }}>{I(BW_IC.play)}</button>
          <button type="button" className="bw-ib" aria-label="What the colours mean" data-bw="key-btn" onClick={() => setSheet({ k: "key" })}>{I(BW_IC.key)}</button>
          <button type="button" className="bw-ib" aria-label="Search" data-bw="search" onClick={() => { if (!demo) setSheet({ k: "search" }); }}>{I(BW_IC.search)}</button>
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
      {/* the hawk's words, under the header: the news (with "Show me"), or a one-liner */}
      {tip?.k === "news" ? (
        <div className="bw-tipb" data-bw="news" style={{ top: tipTop }}>
          <i />
          <b>{news.length} {news.length === 1 ? "thing" : "things"} changed since {seenLabel(seenDay, now)}</b>
          <span className="bw-tipl">{news.slice(0, 3).map((c) => c.t).join(" · ")}</span>
          <button type="button" className="bw-tipgo" data-bw="show-me" onClick={showMe}>Show me</button>
        </div>
      ) : tip?.k === "line" && lines[tip.i] ? (
        <div className="bw-tipb" data-bw="tip" data-i={tip.i} style={{ top: tipTop }} onClick={onHawk}><i />{lines[tip.i]}<small>Tap for another</small></div>
      ) : null}
      {menu && menuRow ? <QuickMenu r={menuRow} acts={menuActions(menuRow)} x={menu.x} y={menu.y} vpW={W.current?.vpW ?? 390} vpH={W.current?.vpH ?? 784} onClose={() => setMenu(null)} onAct={(a) => { setMenu(null); actOf(a, menuRow.id); }} /> : null}
      {sheetRow ? <TimelineSheet r={sheetRow} quietDays={quietDays} nowMs={now} onClose={() => setSheet(null)} onAct={(a) => { setSheet(null); actOf(a, sheetRow.id); }} onOpen={() => { setSheet(null); openV3Query(sheetRow.id); }} /> : null}
      {sheet?.k === "key" ? <KeySheet onClose={() => setSheet(null)} /> : null}
      {sheet?.k === "search" ? <SearchSheet rows={rows} onClose={() => setSheet(null)} onPick={flyTo} /> : null}
      {ndRow ? <NoDateSheet r={ndRow} left={ndQueue.filter((x) => byId.get(x) && isNoDate(byId.get(x)!)).length} statedWeeks={statedOf(ndRow.id)} nowMs={now} hawk={BW_HAWK}
        onClose={() => setSheet(null)} onSave={(wk) => ndNext(ndRow.id, true, wk)} onSkip={() => ndNext(ndRow.id, false)} /> : null}
      {refreshing ? <span hidden data-bw="refreshing" /> : null}
    </div>
  );
  return typeof document === "undefined" ? body : createPortal(body, document.body);
};
