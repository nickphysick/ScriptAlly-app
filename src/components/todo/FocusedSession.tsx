/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE FOCUSED SESSION — FINAL (the in-place design, design-refs/session-final.html v6.1):
 * the chrome and the "What's on your desk?" title NEVER leave; the board transforms around
 * them. The GATHER (sidebars slide away, the sheet dissolves, every other item flies onto
 * the first task, the pile morphs to the centred rest) → the POOL OF LIGHT (the card is the
 * one heavy object on a bright desk) → the DEAL at the rest line → the CLOSE in place, with
 * Back to your desk reassembling the board. This supersedes the dark-room presentation
 * (veil/spotlight/room) entirely.
 *
 * The ENGINE is unchanged: the board's own queue (boardCards order, captured at launch) and
 * the page's existing primitives — this component is presentation + session bookkeeping
 * only; it writes NOTHING.
 *
 * Refs: session-final.html (the master choreography, both views) · session-focus-signal.html
 * option 5 (the pool; 0–4 rejected) · session-content.html frame A/D (the card's content +
 * the close's ledger) · session-deal.html option A (stamp/sweep/rise).
 *
 * Z law: the overlay sits at 48 — beneath the journey flow (50), the toast (60) and the ask
 * (90), above the board. Inside the seat: the pool(0) < the deck edges(1) < the skip
 * clone(2) < the card(3) < the handled clone(4).
 */
import React, { useEffect, useRef, useState } from "react";
import { BoardCard } from "../../lib/todoBoard";
import {
  gatherTransform, staggerFor, restTop, GATHER, DEAL, RITUAL_LINES,
  EXIT_LEFT, EXIT_RIGHT, EXIT_FADE, EXIT_BAR, DISSOLVE, GATHER_SELECTOR,
} from "../../lib/sessionStage";
import { whereThisStands, STATUS_OWED } from "../../lib/sessionContext";
import { useScriptAllyDb } from "../../lib/db";
import { getPrimaryAction } from "../../lib/queryPrimaryAction";
import { QueryStatus } from "../../types";

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
  onClose: () => void;
}

const LANE_LABEL: Record<string, string> = { do: "URGENT", hk: "HOUSEKEEPING", nt: "NOTES" };

export const FocusedSession: React.FC<FocusedSessionProps> = ({ queue, wrapEl, liveKeys, onOpenJourney, onQuickComplete, canQuickComplete, onClose }) => {
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
  // THE DEAL — the leaving clone + the rise; dealRef guards the vanish effect
  const [deal, setDeal] = useState<{ card: BoardCard; kind: "handled" | "skip" } | null>(null);
  const [rose, setRose] = useState(false);
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
  const [line, setLine] = useState(-1);
  const [edgesOn, setEdgesOn] = useState(reduce);
  const [bigOn, setBigOn] = useState(reduce);
  // measured geometry: the subtitle under the title, the ritual/session line in the
  // search's vacated slot, the seat region below the hero, the card's rest offset
  const [geo, setGeo] = useState({ subTop: 120, slotTop: 160, wrapTop: 210, restY: 40 });
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
    const title = wrapEl?.querySelector<HTMLElement>(".tdb-ask");
    const slot = wrapEl?.querySelector<HTMLElement>(".tdb-srchrow");
    const tr = title?.getBoundingClientRect();
    const sr = slot?.getBoundingClientRect();
    const subTop = tr ? tr.bottom + 2 : 120;
    const slotTop = sr ? Math.max(60, sr.top + sr.height / 2 - 12) : subTop + 40;
    const wrapTop = (sr ? sr.bottom : slotTop + 30) + 8;
    const regionH = Math.max(200, window.innerHeight - wrapTop);
    const cardH = bigRef.current?.offsetHeight || 240;
    setGeo({ subTop, slotTop, wrapTop, restY: restTop(regionH, cardH) });
    return { subTop, slotTop, wrapTop, regionH, cardH };
  }

  /** The composed session state, applied instantly (the skip + reduced-motion entry). */
  function applyComposedInstant() {
    composedRef.current = true;
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    if (!wrapEl) { setLine(-1); setBigOn(true); setEdgesOn(true); setComposed(true); setPhase("session"); return; }
    for (const el of Array.from(wrapEl.querySelectorAll<HTMLElement>(EXIT_LEFT))) { mark(el); el.style.transition = "none"; el.style.transform = `translateX(-${GATHER.exitSlidePct}%)`; el.style.opacity = "0"; }
    for (const el of Array.from(wrapEl.querySelectorAll<HTMLElement>(EXIT_RIGHT))) { mark(el); el.style.transition = "none"; el.style.transform = `translateX(${GATHER.exitSlidePct}%)`; el.style.opacity = "0"; }
    for (const el of Array.from(wrapEl.querySelectorAll<HTMLElement>(EXIT_FADE))) { mark(el); el.style.transition = "none"; el.style.opacity = "0"; }
    for (const el of Array.from(wrapEl.querySelectorAll<HTMLElement>(EXIT_BAR))) { mark(el); el.style.transition = "none"; el.style.transform = "translateY(-130%)"; el.style.opacity = "0"; }
    for (const el of Array.from(wrapEl.querySelectorAll<HTMLElement>(DISSOLVE))) { mark(el); el.style.transition = "none"; el.style.background = "transparent"; el.style.borderColor = "transparent"; el.style.boxShadow = "none"; }
    for (const el of Array.from(wrapEl.querySelectorAll<HTMLElement>(GATHER_SELECTOR))) { mark(el); el.style.transition = "none"; el.style.opacity = "0"; }
    setLine(-1);
    setBigOn(true);
    setEdgesOn(true);
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
      applyComposedInstant();
      return () => { window.removeEventListener("resize", onResize); stripAll(); };
    }
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
    RITUAL_LINES.forEach((_, i) => at(GATHER.ritualStartMs + i * GATHER.lineMs, () => setLine(i)));
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
          setEdgesOn(true);
          setLine(-1);
          setComposed(true);
          setPhase("session");
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
  const lane = (c: BoardCard) => LANE_LABEL[c.stream] ?? "";
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
  /** HANDLED (its write already landed — the vanish drove this): the DEAL runs — the stamp
   *  lands and holds, the sheet sweeps off left, the next rises with the advance. */
  function markHandledAdvance(c: BoardCard) {
    if (dealRef.current) return;
    dealRef.current = true;
    setHandled((h) => (h.some((x) => x.key === c.key) ? h : [...h, c]));
    setDeal({ card: c, kind: "handled" });
    const advanceAtMs = reduce ? 400 : DEAL.stampHoldMs + DEAL.riseDelayMs;
    const clearAtMs = reduce ? 420 : DEAL.stampHoldMs + DEAL.sweepMs + 60;
    at(advanceAtMs, () => { advancePast(index + 1); setRose(true); });
    at(clearAtMs, () => { setDeal(null); dealRef.current = false; });
    at(clearAtMs + DEAL.riseMs, () => setRose(false));
  }
  /** Skip for now — no stamp: the sheet slides to the BOTTOM of the stack (down and behind,
   *  the honest requeue — the engine has no requeue of its own; recon) and the next rises.
   *  Skipping the last live task ends the session. */
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
    at(reduce ? 0 : DEAL.skipAdvanceMs, doRequeue);
    at(reduce ? 20 : DEAL.skipMs + 60, () => { setDeal(null); dealRef.current = false; });
    at((reduce ? 20 : DEAL.skipMs + 60) + DEAL.riseMs, () => setRose(false));
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

  const remaining = order.slice(index + 1).filter((x) => liveKeys.has(x.key)).length;
  const anyLive = order.some((x) => liveKeys.has(x.key));

  // ── render — everything positioned from the MEASURED board (the title stays real) ──
  return (
    <div className="tdb-ss" role="dialog" aria-modal="true" aria-label="Focused session"
      onPointerDown={phase === "gather" && !composed ? jumpToComposed : undefined}
      onKeyDown={phase === "gather" && !composed ? jumpToComposed : undefined}
      tabIndex={-1}>
      {/* the "Focused session" subtitle under the standing title */}
      <div className={`tdb-fssub${composed && phase !== "close" ? " on" : ""}`} style={{ top: geo.subTop }}>Focused session</div>
      {/* the ritual lines / the session line — the search's vacated slot */}
      <div className="tdb-fsslot" style={{ top: geo.slotTop }}>
        {phase === "gather" && !composed && (
          <div className="tdb-fsrit" aria-live="polite">
            {RITUAL_LINES.map((l, i) => (
              <span key={l} className={line === i ? "on" : line > i ? "off" : ""}>{l}</span>
            ))}
          </div>
        )}
        {composed && phase !== "close" && (
          <div className="tdb-fsses">
            FOCUSED SESSION · TASK <b>{Math.min(index + 1, total)}</b> OF <b>{total}</b> ·{" "}
            <button type="button" className="tdb-fsend" onClick={() => setPhase("close")}>END SESSION ✕</button>
          </div>
        )}
      </div>
      {/* the seat region below the hero — the stack, the card, the close all live here */}
      <div className="tdb-fswrap" style={{ top: geo.wrapTop }}>
        {phase !== "close" && current && (
          <>
            <div className={`tdb-fsseat${composed ? " lit" : ""}`} style={{ top: geo.restY }}>
              {/* P2 — THE POOL OF LIGHT (option 5): no page treatment; the card carries the
                  mode. The pool + the deep shadow arrive with the morph's landing and leave
                  with the close (this whole branch unmounts at phase "close"). */}
              {composed && <div className="tdb-fspool" aria-hidden />}
              {edgesOn && remaining >= 2 && <div className="tdb-fsdeck d2" aria-hidden />}
              {edgesOn && remaining >= 1 && <div className="tdb-fsdeck d1" aria-hidden />}
              {deal && (
                <div className={`tdb-fsleave ${deal.kind}${reduce ? " static" : ""}`} aria-hidden>
                  <div className="tdb-fscard lv">
                    <div className={`tdb-band ${deal.card.stream}`}>
                      <span className={`tdb-tag due${deal.card.taskType === "offer_received" ? " offer" : ""}`}>{deal.card.taskType === "offer_received" ? `★ ${deal.card.due}` : deal.card.due}</span>
                    </div>
                    <div className="tdb-fscardc">
                      <h2>{deal.card.title}</h2>
                      {deal.card.subtitle && <div className="tdb-fsms">{deal.card.subtitle}</div>}
                    </div>
                  </div>
                  {deal.kind === "handled" && <span className="tdb-ssstamp" aria-hidden>✓</span>}
                </div>
              )}
              <div ref={bigRef} className={`tdb-fscard${bigOn ? " on" : ""}${rose ? " rise" : ""}`}>
                <div className={`tdb-band ${current.stream}`}>
                  <span className={`tdb-tag due${isOffer(current) ? " offer" : ""}`}>{isOffer(current) ? `★ ${current.due}` : current.due}</span>
                  <span className="tdb-fslane">{lane(current)}</span>
                </div>
                <div className="tdb-fscardc">
                  <h2>{current.title}</h2>
                  {(current.subtitle || current.who) && (
                    <div className="tdb-fsms">{[current.subtitle, current.who].filter(Boolean).join(" · ")}</div>
                  )}
                  {standFor(current) && (
                    <div className="tdb-ssctx"><b>WHERE THIS STANDS</b>{standFor(current)}</div>
                  )}
                  <div className="tdb-ssacts">
                    <button type="button" className="tdb-ssb bp on" disabled={!!deal} onClick={() => onOpenJourney(current)}>Action now</button>
                    {canQuickComplete(current) && (
                      <button type="button" className="tdb-btnh em tdb-ssbig" disabled={!!deal} onClick={() => onQuickComplete(current)}>✓ Mark handled</button>
                    )}
                    <button type="button" className="tdb-btnh tdb-ssbig" disabled={!!deal} onClick={skipCurrent}>Skip for now</button>
                  </div>
                </div>
              </div>
            </div>
            {composed && order[index + 1] && (
              <div className="tdb-ssnext" style={{ top: geo.restY - 26 }}>NEXT UP · <i>{order[index + 1].title}</i></div>
            )}
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
