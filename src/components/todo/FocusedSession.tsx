/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE FOCUSED SESSION — v7 (design-refs/session-v7.html): IN PLACE — the chrome and the
 * "What's on your desk?" title NEVER leave; the title crossfades to "Clearing the desk" and
 * the board transforms around it. The GATHER → the CURTAINS + DIM (the stage wings + a
 * slight wash; the card stays bright) → the CARRIAGE at the rest line (handled: stamp →
 * slide out left, the next slides in from the right; skip: no stamp, the requeue slides in)
 * → the CLOSE in place, Back to your desk reassembling the board. Supersedes the room (v5)
 * and pool-of-light (v6) packs.
 *
 * The ENGINE is unchanged: the board's own queue (boardCards order, captured at launch) and
 * the page's existing primitives — presentation + session bookkeeping only; it writes
 * NOTHING. The hero's title + sub-slot are driven up through onHero.
 *
 * Refs: session-v7.html (the master; transition A only) · session-content.html frame A/D.
 *
 * Z: the overlay sits at 48 (beneath the flow 50, the toast 60, the ask 90). Inside it: the
 * dim(0) < the card(3) < the curtains(6, at the edges only).
 */
import React, { useEffect, useRef, useState } from "react";
import { BoardCard } from "../../lib/todoBoard";
import {
  gatherTransform, staggerFor, restTop, GATHER, CARRIAGE, RITUAL_LINES,
  EXIT_LEFT, EXIT_RIGHT, EXIT_FADE, EXIT_BAR, DISSOLVE, GATHER_SELECTOR,
  curtainWidth, CURTAIN, sessionRegion, FRAME,
} from "../../lib/sessionStage";
import { whereThisStands, STATUS_OWED } from "../../lib/sessionContext";
import { useScriptAllyDb } from "../../lib/db";
import { getPrimaryAction } from "../../lib/queryPrimaryAction";
import { QueryStatus } from "../../types";

/** The hero's in-session view-model (v7): ToDoPage renders the crossfading title + the
 *  fixed sub-slot's single occupant from this — the hero stays a real stacked flow. */
export type HeroSession =
  | { clearing: boolean; slot: null }
  | { clearing: boolean; slot: { kind: "ritual"; index: number } }
  | { clearing: boolean; slot: { kind: "session"; i: number; n: number } };

export interface FocusedSessionProps {
  /** The session queue — the engine's own boardCards order, captured at launch. */
  queue: BoardCard[];
  /** The board wrap element — the gather transforms ITS contents (never the app chrome). */
  wrapEl: HTMLElement | null;
  /** The live board keys — a task vanishing from them means the desk already reflects it. */
  liveKeys: Set<string>;
  onOpenJourney: (card: BoardCard) => void;
  onQuickComplete: (card: BoardCard) => Promise<void> | void;
  canQuickComplete: (card: BoardCard) => boolean;
  /** v7 — report the hero's in-session state up (the title crossfade + the sub-slot occupant). */
  /** v9 — the REDO's takeback: the board's own inverse (the undo toast's), by card. */
  canUndoHandled: (c: BoardCard) => boolean;
  onUndoHandled: (c: BoardCard) => void | Promise<void>;
  onHero: (h: HeroSession) => void;
  onClose: () => void;
}

const LANE_LABEL: Record<string, string> = { do: "URGENT", hk: "HOUSEKEEPING", nt: "NOTES" };

export const FocusedSession: React.FC<FocusedSessionProps> = ({ queue, wrapEl, liveKeys, onOpenJourney, onQuickComplete, canQuickComplete, canUndoHandled, onUndoHandled, onHero, onClose }) => {
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  const { queries, agents } = useScriptAllyDb();
  const [phase, setPhase] = useState<"gather" | "session" | "close">("gather");
  // ── the engine seat (unchanged from the room pack): the session-local ORDER (skip
  // requeues to its end), the index, and the session's own event ledger. ──
  const [order, setOrder] = useState<BoardCard[]>(queue);
  const [index, setIndex] = useState(0);
  const [handled, setHandled] = useState<BoardCard[]>([]);
  const [skipped, setSkipped] = useState<BoardCard[]>([]);
  const startedAt = useRef(Date.now());
  // THE CARRIAGE — the leaving clone + the incoming slide; dealRef guards the vanish effect
  const [deal, setDeal] = useState<{ card: BoardCard; kind: "handled" | "skip" | "back" } | null>(null);
  const [rose, setRose] = useState(false);
  // v9 — the REDO's incoming page arrives from the LEFT (the carriage reversed)
  const [roseBack, setRoseBack] = useState(false);
  const dealRef = useRef(false);
  // the close — the frozen timer + the review expansion
  const closedAt = useRef<number | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  useEffect(() => {
    if (phase === "close" && closedAt.current === null) closedAt.current = Date.now();
  }, [phase]);
  // browser back lands safely on the board (the unmount guard strips every inline style)
  useEffect(() => {
    const onPop = () => onClose();
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [onClose]);

  // ── the gather's own progress ──
  const [composed, setComposed] = useState(reduce); // the settled session composition
  const [bigOn, setBigOn] = useState(reduce);
  // measured geometry: the subtitle under the title, the ritual/session line in the
  // search's vacated slot, the seat region below the hero, the card's rest offset
  const [geo, setGeo] = useState({ subTop: 120, slotTop: 160, wrapTop: 210, restY: 40, barBottom: 0, regionH: 400 });
  // v7 — the curtains + the dim: on with the gather, off with the reverse; the width is a
  // token by viewport so the card wrap can inset by it (the curtains clip nothing).
  const [curtains, setCurtains] = useState(reduce);
  const [curtW, setCurtW] = useState(curtainWidth(window.innerWidth));
  const bigRef = useRef<HTMLDivElement | null>(null);
  const timers = useRef<number[]>([]);
  const styled = useRef<Set<HTMLElement>>(new Set());
  const composedRef = useRef(reduce);
  const at = (ms: number, fn: () => void) => { timers.current.push(window.setTimeout(fn, ms)); };
  const mark = (el: HTMLElement) => { styled.current.add(el); return el; };
  const stripAll = () => {
    for (const el of styled.current) el.style.cssText = "";
    styled.current.clear();
  };

  function measure() {
    setCurtW(curtainWidth(window.innerWidth));
    const title = wrapEl?.querySelector<HTMLElement>(".tdb-ask");
    const slot = wrapEl?.querySelector<HTMLElement>(".tdb-srchrow");
    const tr = title?.getBoundingClientRect();
    const sr = slot?.getBoundingClientRect();
    const subTop = tr ? tr.bottom + 2 : 120;
    const slotTop = sr ? Math.max(60, sr.top + sr.height / 2 - 12) : subTop + 40;
    // v9 — THE APP BAR IS EXEMPT: the board wrap begins at the bar's bottom edge, so the
    // curtains and the dim start there and the bar is never covered.
    const barBottom = Math.max(0, wrapEl?.getBoundingClientRect().top ?? 0);
    // v9 — THE SPACING LAW: a real clear band below the progress row; the region runs to the
    // stage foot (the quiet exit's strip), and the page centres inside it.
    const region = sessionRegion(sr ? sr.bottom : slotTop + 30, window.innerHeight);
    const wrapTop = region.top;
    const regionH = region.height;
    const cardH = bigRef.current?.offsetHeight || 240;
    setGeo({ subTop, slotTop, wrapTop, restY: restTop(regionH, cardH), barBottom, regionH });
    return { subTop, slotTop, wrapTop, regionH, cardH, barBottom };
  }

  /** The composed session state, applied instantly (the skip + reduced-motion entry). */
  function applyComposedInstant() {
    composedRef.current = true;
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    onHero({ clearing: true, slot: null });
    if (!wrapEl) { setBigOn(true); setComposed(true); setPhase("session"); return; }
    for (const el of Array.from(wrapEl.querySelectorAll<HTMLElement>(EXIT_LEFT))) { mark(el); el.style.transition = "none"; el.style.transform = `translateX(-${GATHER.exitSlidePct}%)`; el.style.opacity = "0"; }
    for (const el of Array.from(wrapEl.querySelectorAll<HTMLElement>(EXIT_RIGHT))) { mark(el); el.style.transition = "none"; el.style.transform = `translateX(${GATHER.exitSlidePct}%)`; el.style.opacity = "0"; }
    for (const el of Array.from(wrapEl.querySelectorAll<HTMLElement>(EXIT_FADE))) { mark(el); el.style.transition = "none"; el.style.opacity = "0"; }
    for (const el of Array.from(wrapEl.querySelectorAll<HTMLElement>(EXIT_BAR))) { mark(el); el.style.transition = "none"; el.style.transform = "translateY(-130%)"; el.style.opacity = "0"; }
    for (const el of Array.from(wrapEl.querySelectorAll<HTMLElement>(DISSOLVE))) { mark(el); el.style.transition = "none"; el.style.background = "transparent"; el.style.borderColor = "transparent"; el.style.boxShadow = "none"; }
    for (const el of Array.from(wrapEl.querySelectorAll<HTMLElement>(GATHER_SELECTOR))) { mark(el); el.style.transition = "none"; el.style.opacity = "0"; }
    setBigOn(true);
    setComposed(true);
    setPhase("session");
    requestAnimationFrame(() => measure());
  }

  // ── THE GATHER (once) ──
  useEffect(() => {
    measure();
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    if (reduce) {
      setCurtains(true);
      applyComposedInstant();
      return () => { window.removeEventListener("resize", onResize); stripAll(); };
    }
    requestAnimationFrame(() => setCurtains(true)); // the curtains close as the session begins
    if (!wrapEl) { applyComposedInstant(); return () => window.removeEventListener("resize", onResize); }
    // 1 — the board's furniture leaves; the sheet dissolves; the items float on the desk
    for (const el of Array.from(wrapEl.querySelectorAll<HTMLElement>(EXIT_LEFT))) {
      mark(el); el.style.transition = `transform ${GATHER.exitMs}ms cubic-bezier(.5,.05,.6,1), opacity ${GATHER.exitMs - 100}ms`;
      el.style.transform = `translateX(-${GATHER.exitSlidePct}%)`; el.style.opacity = "0";
    }
    for (const el of Array.from(wrapEl.querySelectorAll<HTMLElement>(EXIT_RIGHT))) {
      mark(el); el.style.transition = `transform ${GATHER.exitMs}ms cubic-bezier(.5,.05,.6,1), opacity ${GATHER.exitMs - 100}ms`;
      el.style.transform = `translateX(${GATHER.exitSlidePct}%)`; el.style.opacity = "0";
    }
    for (const el of Array.from(wrapEl.querySelectorAll<HTMLElement>(EXIT_FADE))) {
      mark(el); el.style.transition = `opacity ${GATHER.searchFadeMs}ms`; el.style.opacity = "0";
    }
    at(300, () => {
      if (!wrapEl) return;
      for (const el of Array.from(wrapEl.querySelectorAll<HTMLElement>(EXIT_BAR))) {
        mark(el); el.style.transition = `transform ${GATHER.docBarMs}ms, opacity ${GATHER.docBarMs - 50}ms`;
        el.style.transform = "translateY(-130%)"; el.style.opacity = "0";
      }
      for (const el of Array.from(wrapEl.querySelectorAll<HTMLElement>(DISSOLVE))) {
        mark(el); el.style.transition = `background ${GATHER.dissolveMs}ms, border-color ${GATHER.dissolveMs}ms, box-shadow ${GATHER.dissolveMs}ms`;
        el.style.background = "transparent"; el.style.borderColor = "transparent"; el.style.boxShadow = "none";
      }
    });
    // 2 — the ritual lines in the search's vacated slot
    onHero({ clearing: true, slot: null }); // the title crossfades to "Clearing the desk" as the session begins
    RITUAL_LINES.forEach((_, i) => at(GATHER.ritualStartMs + i * GATHER.lineMs, () => onHero({ clearing: true, slot: { kind: "ritual", index: i } })));
    // 3 — the gather: every other item flies onto the first task's footprint
    at(GATHER.gatherStartMs, () => {
      if (!wrapEl || composedRef.current) return;
      const items = Array.from(wrapEl.querySelectorAll<HTMLElement>(GATHER_SELECTOR)).filter((el) => el.getClientRects().length > 0);
      const firstKey = queue[0]?.key ?? "";
      const firstEl = wrapEl.querySelector<HTMLElement>(`[data-tdbkey="${(window.CSS?.escape ?? ((s: string) => s))(firstKey)}"]`);
      // first-from-engine; a collapsed group hides a member's element — the sheet's centre stands in
      const fr: DOMRect | { left: number; top: number; width: number; height: number } =
        firstEl?.getBoundingClientRect() ??
        (() => {
          const m = wrapEl.querySelector<HTMLElement>(".tdb-mainc")?.getBoundingClientRect();
          return { left: (m ? m.left + m.width / 2 : window.innerWidth / 2) - 95, top: (m ? m.top + 120 : 260), width: 190, height: 96 };
        })();
      const flyers = items.filter((el) => el !== firstEl);
      const s = staggerFor(flyers.length + 1);
      if (firstEl) { mark(firstEl); firstEl.style.position = "relative"; firstEl.style.zIndex = "30"; }
      flyers.forEach((el, i) => {
        const r = el.getBoundingClientRect();
        const f = gatherTransform({ left: r.left, top: r.top, width: r.width, height: r.height }, { left: fr.left, top: fr.top, width: fr.width, height: fr.height }, i + 1);
        at(i * s, () => {
          mark(el);
          el.style.transition = `transform ${GATHER.flyMs}ms cubic-bezier(.4,.1,.3,1), opacity ${GATHER.flyMs - 150}ms`;
          el.style.transform = `translate(${f.dx}px, ${f.dy}px) scale(${f.scale}) rotate(${f.rot}deg)`;
          el.style.opacity = String(GATHER.gatherOpacity);
          el.style.zIndex = String(Math.max(1, 20 - i));
        });
      });
      // 4 — the morph: the pile grows in one motion to the rest position
      const gatherEnd = flyers.length * s + GATHER.flyMs;
      at(gatherEnd, () => {
        if (composedRef.current) return;
        const g = measure();
        const gRestY = restTop(g.regionH, g.cardH);
        const big = bigRef.current;
        if (big) {
          const seatLeft = window.innerWidth / 2 - GATHER.sessionCardW / 2;
          const dx = fr.left - seatLeft;
          const dy = fr.top - (g.wrapTop + gRestY);
          const sc = fr.width / GATHER.sessionCardW;
          big.style.transition = "none";
          big.style.transform = `translate(${dx}px, ${dy}px) scale(${sc})`;
          setBigOn(true);
          requestAnimationFrame(() => requestAnimationFrame(() => {
            big.style.transition = `transform ${GATHER.morphMs}ms cubic-bezier(.25,.8,.3,1.05)`;
            big.style.transform = "none";
          }));
        }
        for (const el of [...flyers, ...(firstEl ? [firstEl] : [])]) {
          el.style.transition = "opacity 300ms";
          el.style.opacity = "0";
        }
        // the edges settle in as the morph lands; the session line takes the slot
        at(GATHER.edgesAtMs, () => {
          composedRef.current = true;
          setComposed(true);
          setPhase("session"); // the sync effect fills the session line
        });
      });
    });
    return () => {
      window.removeEventListener("resize", onResize);
      timers.current.forEach((t) => window.clearTimeout(t));
      // never leave a wrecked board behind (unmount from any path)
      stripAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Skip the overture: any click/keypress jumps to the composed session state. */
  function jumpToComposed() {
    if (composedRef.current || phase !== "gather") return;
    if (wrapEl) {
      for (const el of Array.from(wrapEl.querySelectorAll<HTMLElement>(GATHER_SELECTOR))) { mark(el); el.style.transition = "none"; el.style.opacity = "0"; }
    }
    if (bigRef.current) { bigRef.current.style.transition = "none"; bigRef.current.style.transform = "none"; }
    applyComposedInstant();
  }

  /** Back to your desk — the compressed reassembly (~700ms), then every style strips. */
  function backToDesk() {
    setCurtains(false); // the curtains withdraw + the dim lifts WITH the reassembly
    onHero({ clearing: false, slot: null }); // the title crossfades back WITH the reassembly
    for (const el of styled.current) {
      el.style.transition = `transform ${GATHER.reverseMs}ms ease, opacity ${GATHER.reverseMs}ms ease, background ${GATHER.reverseMs}ms ease, border-color ${GATHER.reverseMs}ms ease, box-shadow ${GATHER.reverseMs}ms ease`;
      el.style.transform = "";
      el.style.opacity = "";
      el.style.background = "";
      el.style.borderColor = "";
      el.style.boxShadow = "";
      el.style.zIndex = "";
    }
    window.setTimeout(() => { stripAll(); onClose(); }, GATHER.reverseMs + 60);
  }

  // ── the engine (unchanged): where-this-stands · advance · handled · skip ──
  const current = order[index];
  const total = order.length;
  /** v9 — a page REDONE after it was stamped arrives with its stamp still on it. */
  const stampedCurrent = !!current && handled.some((x) => x.key === current.key);
  const lane = (c: BoardCard) => LANE_LABEL[c.stream] ?? "";
  /** v9 — the running head: the tag and the lane AS TEXT (no pill chrome, no family band). */
  const runHead = (c: BoardCard): string[] => {
    const first = c.taskType === "offer_received" ? `★ ${c.due}` : c.due;
    return [first, lane(c)].filter(Boolean) as string[];
  };
  const isOffer = (c: BoardCard) => c.taskType === "offer_received";
  /** "Where this stands" — assembled from EXISTING derived fields only (the template lib
   *  omits any clause whose fact is missing; "" hides the card). */
  function standFor(c: BoardCard): string {
    if (c.userTaskId) return "";
    const q = c.relatedRecordId ? queries.find((x) => x.id === c.relatedRecordId) : undefined;
    const agentName = c.who || undefined;
    if (c.taskType === "offer_received") {
      const outstanding = queries
        .filter((x) => x.id !== q?.id && getPrimaryAction(x.status as QueryStatus).ballHolder === "agent")
        .map((x) => agents.find((a) => a.id === x.agentId)?.name)
        .filter((n): n is string => !!n);
      return whereThisStands({ kind: "offer", agentName, offerDate: q?.lastStatusChange, outstanding });
    }
    if (c.taskType === "no_response_close") {
      const agent = q ? agents.find((a) => a.id === q.agentId) : undefined;
      const silentDays = q?.dateSent ? Math.max(0, Math.floor((Date.now() - new Date(q.dateSent).getTime()) / 86400000)) : undefined;
      return whereThisStands({ kind: "stale", agentName, silentDays, windowWeeks: agent?.responseTimeWeeks || undefined });
    }
    if (c.taskType === "nudge_overdue") {
      const agent = q ? agents.find((a) => a.id === q.agentId) : undefined;
      return whereThisStands({ kind: "nudge", sentDate: q?.dateSent, windowWeeks: agent?.responseTimeWeeks || undefined });
    }
    if (c.taskType === "data_quality_poor") {
      return whereThisStands({ kind: "dq", batchLine: c.subtitle || undefined });
    }
    return whereThisStands({ kind: "awaiting-send", agentName, sentDate: q?.dateSent, requestedDate: q?.lastStatusChange, owed: q ? STATUS_OWED[q.status as string] : undefined });
  }
  /** Advance past the current task; dead queue entries (completed outside the session's own
   *  stamps) fast-forward silently — they were never session actions. */
  function advancePast(nextIndex: number) {
    let i = nextIndex;
    while (i < order.length && !liveKeys.has(order[i].key)) i += 1;
    if (i >= order.length) { setPhase("close"); return; }
    setIndex(i);
  }
  /** HANDLED (its write already landed — the vanish drove this): the CARRIAGE runs — the
   *  stamp lands and holds, the card slides out left, the next slides in from the right. */
  function markHandledAdvance(c: BoardCard) {
    if (dealRef.current) return;
    dealRef.current = true;
    setHandled((h) => (h.some((x) => x.key === c.key) ? h : [...h, c]));
    setDeal({ card: c, kind: "handled" });
    // P4 — the LAST card's sweep completes before the close mounts (an instant phase flip
    // would unmount the clone mid-flight); the close then fades into the same centre region.
    const willClose = !order.slice(index + 1).some((x) => liveKeys.has(x.key));
    const advanceAtMs = reduce ? 400 : CARRIAGE.stampHoldMs + CARRIAGE.overlapMs;
    const clearAtMs = reduce ? 420 : CARRIAGE.stampHoldMs + CARRIAGE.slideOutMs + 60;
    at(advanceAtMs, () => { if (!willClose) { advancePast(index + 1); setRose(true); } });
    at(clearAtMs, () => { setDeal(null); dealRef.current = false; if (willClose) setPhase("close"); });
    at(clearAtMs + CARRIAGE.slideInMs, () => setRose(false));
  }
  /** Skip for now — no stamp: the sheet slides to the BOTTOM of the stack (down and behind,
   *  the honest requeue — the engine has no requeue of its own; recon) and the next rises.
   *  Skipping the last live task ends the session. */
  /** v9 — ‹ PREVIOUS · REDO: the carriage runs BACKWARDS. The current page slides out RIGHT,
   *  the previous slides in from the LEFT and becomes current again — handled or not. A page
   *  that was stamped arrives WITH its stamp and offers the board's own takeback. */
  function goPrevious() {
    if (index <= 0 || dealRef.current) return;
    dealRef.current = true;
    if (!reduce) setDeal({ card: current, kind: "back" });
    const step = () => { setIndex(index - 1); setRoseBack(true); setRose(true); };
    at(reduce ? 0 : CARRIAGE.overlapMs, step);
    at(reduce ? 20 : CARRIAGE.slideOutMs + 60, () => { setDeal(null); dealRef.current = false; });
    at((reduce ? 20 : CARRIAGE.slideOutMs + 60) + CARRIAGE.slideInMs, () => { setRose(false); setRoseBack(false); });
  }

  function skipCurrent() {
    if (!current || dealRef.current) return;
    const c0 = current;
    const rest = order.filter((_, i2) => i2 !== index);
    const next = [...rest, c0]; // the requeue — to the session order's end
    setSkipped((k) => (k.some((x) => x.key === c0.key) ? k : [...k, c0]));
    if (!rest.some((x) => liveKeys.has(x.key))) { setOrder(next); setPhase("close"); return; }
    dealRef.current = true;
    if (!reduce) setDeal({ card: c0, kind: "skip" });
    const doRequeue = () => {
      setOrder(next);
      let i = index;
      while (i < next.length && !liveKeys.has(next[i].key)) i += 1;
      if (i >= next.length) { setPhase("close"); return; }
      setIndex(i);
      setRose(true);
    };
    at(reduce ? 0 : CARRIAGE.overlapMs, doRequeue);
    at(reduce ? 20 : CARRIAGE.slideOutMs + 60, () => { setDeal(null); dealRef.current = false; });
    at((reduce ? 20 : CARRIAGE.slideOutMs + 60) + CARRIAGE.slideInMs, () => setRose(false));
  }
  // the round-trip law: a journey that completed the current task returns to a board without
  // it — the session detects the vanish and deals it as handled; a surviving task resumes
  // in place. (Mark handled itself only fires the primitive; the vanish drives the advance,
  // so a declined dup-guard honestly stays put.)
  useEffect(() => {
    if (phase !== "session" || !current || dealRef.current) return;
    if (!liveKeys.has(current.key)) markHandledAdvance(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveKeys, phase, index, order]);
  // v7 — the hero's sub-slot follows the session: the mono TASK i OF n line while working, and
  // it empties at the close (the title stays "Clearing the desk" until Back to your desk).
  useEffect(() => {
    if (phase === "session" && composed) onHero({ clearing: true, slot: { kind: "session", i: Math.min(index + 1, total), n: total } });
    else if (phase === "close") onHero({ clearing: true, slot: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, composed, index, total]);

  // P3 — the whisper names the next LIVE task (dead entries fast-forward silently anyway)
  const nextUp = order.slice(index + 1).find((x) => liveKeys.has(x.key));
  const anyLive = order.some((x) => liveKeys.has(x.key));

  // ── render — everything positioned from the MEASURED board (the title stays real) ──
  return (
    <div className="tdb-ss" role="dialog" aria-modal="true" aria-label="Focused session" tabIndex={-1}>
      {/* v9 — the overlay itself is pointer-transparent (its interactive children opt back in),
          so nothing it lays over the hero can swallow a click. The overture's skip catcher is
          its OWN layer and exists only while the opening plays. */}
      {phase === "gather" && !composed && (
        <div className="tdb-fsskip" onPointerDown={jumpToComposed} onKeyDown={jumpToComposed} aria-hidden />
      )}
      {/* v7 — the hero's title + sub-slot are driven up through onHero (ToDoPage renders them
          in the real stacked-flow hero); this overlay carries the curtains, the dim + the card. */}
      {/* the DIM: a slight wash over the work area below the hero — the card renders above it */}
      <div className={`tdb-fsdim${curtains ? " on" : ""}`} style={{ top: geo.wrapTop }} aria-hidden />
      {/* the CURTAINS: ink panels close from the screen edges (the stage wings) — v9: they
          begin at the APP BAR's bottom edge, which stays full-width above everything */}
      <div className={`tdb-fscurt l${curtains ? " on" : ""}`} style={{ width: curtW, top: geo.barBottom }} aria-hidden />
      <div className={`tdb-fscurt r${curtains ? " on" : ""}`} style={{ width: curtW, top: geo.barBottom }} aria-hidden />
      {/* the seat region below the hero — the card + the close live here, INSET by the curtains */}
      <div className="tdb-fswrap" style={{ top: geo.wrapTop, left: curtW, right: curtW }}>
        {phase !== "close" && current && (
          <>
            <div className="tdb-fsseat" style={{ top: geo.restY }}>
              {/* v7 — no pool, no deck: the curtains + dim carry the mode (the deck-edge motif
                  is retired; P3 fades the gathered pile fully). */}
              {deal && (
                <div className={`tdb-fsleave ${deal.kind}${reduce ? " static" : ""}`} aria-hidden>
                  <div className="tdb-fspage lv">
                    <div className={`tdb-fsrun${deal.card.taskType === "offer_received" ? " urgent" : ""}`}>
                      {runHead(deal.card).map((w, i2) => <span key={w + i2}>{w}</span>)}
                    </div>
                    <h2>{deal.card.title}</h2>
                    {(deal.card.subtitle || deal.card.who) && (
                      <div className="tdb-fsms">{[deal.card.subtitle, deal.card.who].filter(Boolean).join(" · ")}</div>
                    )}
                  </div>
                  {deal.kind === "handled" && <span className="tdb-ssstamp" aria-hidden>✓</span>}
                </div>
              )}
              {/* v9 — THE MANUSCRIPT PAGE (session-v9-page.html, composition A): no card
                  grammar at all. One generous white page — a mono running head, the task
                  typeset as a title, the context written as PROSE under a hairline rule, the
                  actions split (the ink primary left, the quiet text links right), and
                  prev/next as a book's running footer. */}
              <div ref={bigRef} className={`tdb-fspage${bigOn ? " on" : ""}${rose ? " carriagein" : ""}${roseBack ? " carriageback" : ""}`}>
                <div className={`tdb-fsrun${isOffer(current) ? " urgent" : ""}`}>
                  {runHead(current).map((w, i2) => <span key={w + i2}>{w}</span>)}
                </div>
                <h2>{current.title}</h2>
                {(current.subtitle || current.who) && (
                  <div className="tdb-fsms">{[current.subtitle, current.who].filter(Boolean).join(" · ")}</div>
                )}
                {standFor(current) && <p className="tdb-fsbody">{standFor(current)}</p>}
                <div className="tdb-fsacts">
                  <button type="button" className="tdb-ssb bp on" disabled={!!deal} onClick={() => onOpenJourney(current)}>Action now</button>
                  {canQuickComplete(current) && (
                    <button type="button" className="tdb-btnh em tdb-ssbig" disabled={!!deal} onClick={() => onQuickComplete(current)}>✓ Mark handled</button>
                  )}
                  <span className="tdb-fsquiet">
                    <button type="button" className="tdb-fstl" disabled={!!deal} onClick={() => onOpenJourney(current)}>＋ Today’s list</button>
                    <button type="button" className="tdb-fstl" disabled={!!deal} onClick={() => onOpenJourney(current)}>🕐 Snooze or dismiss</button>
                  </span>
                </div>
                {/* the running footer — the book's own navigation */}
                <div className="tdb-fspfoot">
                  <span className="l">
                    {index > 0 ? (
                      <button type="button" className="tdb-fsnav" disabled={!!deal} onClick={goPrevious}>‹ PREVIOUS · REDO</button>
                    ) : <i />}
                    {stampedCurrent && canUndoHandled(current) && (
                      <button type="button" className="tdb-fsnav und" onClick={() => onUndoHandled(current)}>UNDO HANDLED</button>
                    )}
                  </span>
                  <button type="button" className="tdb-fsnav" disabled={!!deal} onClick={skipCurrent}>SKIP · NEXT ›</button>
                </div>
                {stampedCurrent && <span className="tdb-ssstamp on" aria-hidden>✓</span>}
              </div>
            </div>
          </>
        )}
        {phase === "close" && (
          // ── THE CLOSE, IN PLACE (frame D) — the same centre region; the subtitle and the
          // session line have faded; Back to your desk reassembles the board. The session
          // holds NO local state needing sync and writes NOTHING.
          <div className="tdb-ssclose">
            <h1>{anyLive ? "Good session." : "Desk cleared."}</h1>
            <div className="tdb-ssub">Every box ticked turns the dial in your favour.</div>
            <div className="tdb-sssum">
              <div className="tdb-sssumrow"><span className="tdb-sssd done" aria-hidden>✓</span>Handled<span className="tdb-sssn">{handled.length}</span></div>
              {skipped.length > 0 && (
                <div className="tdb-sssumrow"><span className="tdb-sssd skip" aria-hidden />Skipped — back on your desk<span className="tdb-sssn">{skipped.length}</span></div>
              )}
              <div className="tdb-sssumrow"><span className="tdb-sssd time" aria-hidden>⏱</span>Session length<span className="tdb-sssn">{Math.max(1, Math.round(((closedAt.current ?? Date.now()) - startedAt.current) / 60000))} MIN</span></div>
              {reviewOpen && (handled.length > 0 || skipped.length > 0) && (
                <div className="tdb-ssreviewlist">
                  {handled.map((c) => (
                    <div key={c.key} className="tdb-sssumrow sub"><span className="tdb-sssd done" aria-hidden>✓</span>{c.title}</div>
                  ))}
                  {skipped.map((c) => (
                    <div key={c.key} className="tdb-sssumrow sub"><span className="tdb-sssd skip" aria-hidden />{c.title}</div>
                  ))}
                </div>
              )}
            </div>
            <div className="tdb-ssexits">
              <button type="button" className="tdb-ssb bp on" onClick={backToDesk}>Back to your desk</button>
              {(handled.length > 0 || skipped.length > 0) && (
                <button type="button" className="tdb-btnh tdb-ssbig" onClick={() => setReviewOpen((v) => !v)}>Review what you did</button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
