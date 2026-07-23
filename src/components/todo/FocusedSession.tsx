/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE FOCUSED SESSION (the session pack) — the cinematic container: the opening (darken →
 * the desk clears → ritual lines → the spotlight reveal), the session room, the between-task
 * deal, and the close. The ENGINE is the board's own queue (boardCards order, captured at
 * launch) and the page's existing primitives — this component is presentation + session
 * bookkeeping only; no new write paths.
 *
 * Refs: design-refs/session-opening.html (the opening, v3.1 — the card only exists where the
 * light is) · session-room.html frames A/D (the room + the close; frame B superseded by the
 * deal) · session-deal.html option A (the paper stack).
 *
 * Z law: the overlay sits at 48 — beneath the journey flow (50), the toast (60) and the ask
 * (90), above the board. Inside the opening: dim(1) < the first card(2) < the canvas veil(3)
 * < the ritual lines(4) < the pair(5) — the card mounts BENEATH the veil and is visible only
 * inside the beam.
 */
import React, { useEffect, useRef, useState } from "react";
import { BoardCard } from "../../lib/todoBoard";
import { nearestEdgeFly, wanderPoints, OPENING, RITUAL_LINES, FLY_SELECTOR, DEAL } from "../../lib/sessionStage";
import { whereThisStands, STATUS_OWED } from "../../lib/sessionContext";
import { useScriptAllyDb } from "../../lib/db";
import { getPrimaryAction } from "../../lib/queryPrimaryAction";
import { QueryStatus } from "../../types";

export interface FocusedSessionProps {
  /** The session queue — the engine's own boardCards order, captured at launch. */
  queue: BoardCard[];
  /** The board wrap element — the opening flies ITS contents (never the app chrome). */
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
  const [phase, setPhase] = useState<"opening" | "room" | "close">("opening");
  // ── session P2: the room's engine seat — the session-local ORDER (skip requeues to its
  // end), the index, and the session's own event ledger (the close reads it). ──
  const [order, setOrder] = useState<BoardCard[]>(queue);
  const [index, setIndex] = useState(0);
  const [handled, setHandled] = useState<BoardCard[]>([]);
  const [skipped, setSkipped] = useState<BoardCard[]>([]);
  const startedAt = useRef(Date.now());
  // ── session P3: THE DEAL — the leaving clone + the rise; dealRef guards the vanish
  // effect against re-firing while the choreography runs. ──
  const [deal, setDeal] = useState<{ card: BoardCard; kind: "handled" | "skip" } | null>(null);
  const [rose, setRose] = useState(false);
  const dealRef = useRef(false);
  // the opening's own progress — "final" = the lit-card + pair composition
  const [openingFinal, setOpeningFinal] = useState(reduce);
  const [line, setLine] = useState(-1); // the active ritual line
  const [pairOn, setPairOn] = useState<0 | 1 | 2>(reduce ? 2 : 0);
  const [firstOn, setFirstOn] = useState(reduce);
  const [veilOn, setVeilOn] = useState(reduce);
  const [dimOn, setDimOn] = useState(false);

  const veilRef = useRef<HTMLCanvasElement | null>(null);
  const firstRef = useRef<HTMLDivElement | null>(null);
  const timers = useRef<number[]>([]);
  const raf = useRef<number | null>(null);
  const flown = useRef<HTMLElement[]>([]);
  const finalRef = useRef(reduce);
  const at = (ms: number, fn: () => void) => { timers.current.push(window.setTimeout(fn, ms)); };

  /** The canvas veil: full dark with the soft-edged beam punched out (the ref's draw). */
  function draw(x: number, y: number, r: number) {
    const cv = veilRef.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = `rgba(26,13,9,${OPENING.veilTo})`;
    ctx.fillRect(0, 0, cv.width, cv.height);
    const g = ctx.createRadialGradient(x, y, r * 0.55, x, y, r);
    ctx.globalCompositeOperation = "destination-out";
    g.addColorStop(0, "rgba(0,0,0,1)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 7);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
  }
  function sizeVeil() {
    const cv = veilRef.current;
    if (!cv) return;
    cv.width = window.innerWidth;
    cv.height = window.innerHeight;
  }
  function lockSpot() {
    const r = firstRef.current?.getBoundingClientRect();
    if (!r) return;
    draw(r.left + r.width / 2, r.top + r.height / 2, Math.max(r.width, r.height) * OPENING.spotLockScale);
  }

  /** The desk clears: every visible board object flies through its nearest viewport edge. */
  function flyOut() {
    if (!wrapEl) return;
    const els = Array.from(wrapEl.querySelectorAll<HTMLElement>(FLY_SELECTOR)).filter((el) => el.getClientRects().length > 0);
    flown.current = els;
    const W = window.innerWidth;
    const H = window.innerHeight;
    els.forEach((el, i) => {
      const r = el.getBoundingClientRect();
      const f = nearestEdgeFly(r.left + r.width / 2, r.top + r.height / 2, r.width, r.height, W, H);
      at(i * OPENING.flyStaggerMs, () => {
        el.style.transition = `transform ${OPENING.flyMs}ms cubic-bezier(.5,.05,.6,1), opacity ${OPENING.flyFadeMs}ms`;
        el.style.transform = `translate(${f.tx}px, ${f.ty}px) rotate(${f.rot}deg)`;
        el.style.opacity = "0";
      });
    });
  }
  /** The reverse (Back to desk) — compressed; then every inline style is stripped. */
  function restoreDesk(ms: number) {
    for (const el of flown.current) {
      el.style.transition = `transform ${ms}ms ease, opacity ${ms}ms ease`;
      el.style.transform = "";
      el.style.opacity = "";
    }
    window.setTimeout(() => {
      for (const el of flown.current) el.style.cssText = el.style.cssText.replace(/transition:[^;]*;?|transform:[^;]*;?|opacity:[^;]*;?/g, "");
      flown.current = [];
    }, ms + 60);
  }
  /** Skip: any input during the sequence jumps to the final composition. */
  function jumpToFinal() {
    if (finalRef.current || phase !== "opening") return;
    finalRef.current = true;
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    if (raf.current) cancelAnimationFrame(raf.current);
    for (const el of flown.current) {
      el.style.transition = "none";
      el.style.transform = "";
      el.style.opacity = "0";
    }
    setLine(-1);
    setDimOn(true);
    setVeilOn(true);
    setFirstOn(true);
    setPairOn(2);
    setOpeningFinal(true);
    requestAnimationFrame(() => { sizeVeil(); lockSpot(); });
  }

  // ── the opening sequence (once) ──
  useEffect(() => {
    sizeVeil();
    const onResize = () => { sizeVeil(); if (finalRef.current) lockSpot(); };
    window.addEventListener("resize", onResize);
    if (reduce) {
      // reduced motion starts at the final composition — no movement anywhere
      setDimOn(true);
      if (wrapEl) {
        const els = Array.from(wrapEl.querySelectorAll<HTMLElement>(FLY_SELECTOR)).filter((el) => el.getClientRects().length > 0);
        flown.current = els;
        for (const el of els) { el.style.transition = "none"; el.style.opacity = "0"; }
      }
      requestAnimationFrame(() => { sizeVeil(); lockSpot(); });
      finalRef.current = true;
      return () => window.removeEventListener("resize", onResize);
    }
    setDimOn(true); // 1 — the slow darken (1.1s wash)
    at(OPENING.flyDelayMs, flyOut); // 2 — the desk clears via nearest edges
    RITUAL_LINES.forEach((_, i) => at(OPENING.linesDelayMs + i * OPENING.lineMs, () => setLine(i))); // 3 — the lines
    const linesEnd = OPENING.linesDelayMs + RITUAL_LINES.length * OPENING.lineMs;
    at(linesEnd, () => {
      // 4 — full dark; the first card mounts UNSEEN beneath the veil; the light must find it
      setLine(-1);
      setVeilOn(true);
      draw(-999, -999, 1);
      setFirstOn(true);
      at(OPENING.spotDelayMs, wander);
    });
    function wander() {
      const r = firstRef.current?.getBoundingClientRect();
      if (!r) { finish(); return; }
      const target = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      const pts = wanderPoints(window.innerWidth, window.innerHeight, target);
      let seg = 0;
      let t0: number | null = null;
      let from = { x: window.innerWidth / 2, y: window.innerHeight + 60 }; // enters from below
      const ease = (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);
      const step = (ts: number) => {
        if (t0 === null) t0 = ts;
        const dur = seg === pts.length - 1 ? OPENING.spotLockMs : OPENING.spotSegMs;
        const t = Math.min(1, (ts - t0) / dur);
        const e = ease(t);
        const to = pts[seg];
        draw(from.x + (to.x - from.x) * e, from.y + (to.y - from.y) * e, OPENING.spotRadius);
        if (t < 1) { raf.current = requestAnimationFrame(step); return; }
        from = to;
        seg += 1;
        t0 = null;
        if (seg < pts.length) { raf.current = requestAnimationFrame(step); return; }
        finish();
      };
      raf.current = requestAnimationFrame(step);
    }
    function finish() {
      lockSpot();
      finalRef.current = true;
      setOpeningFinal(true);
      at(OPENING.pairDelayMs, () => setPairOn(1));
      at(OPENING.pairDelayMs + OPENING.pairGapMs, () => setPairOn(2));
    }
    return () => {
      window.removeEventListener("resize", onResize);
      timers.current.forEach((t) => window.clearTimeout(t));
      if (raf.current) cancelAnimationFrame(raf.current);
      // never leave a wrecked board behind (unmount from any path)
      for (const el of flown.current) el.style.cssText = el.style.cssText.replace(/transition:[^;]*;?|transform:[^;]*;?|opacity:[^;]*;?/g, "");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Back to desk — the compressed rewind: veil lifts, cards return from their edges. */
  function backToDesk() {
    setVeilOn(false);
    setDimOn(false);
    setFirstOn(false);
    setPairOn(0);
    restoreDesk(OPENING.reverseMs);
    window.setTimeout(onClose, OPENING.reverseMs + 40);
  }
  function beginRoom() {
    setPhase("room");
  }

  const first = queue[0];
  const lane = (c: BoardCard) => LANE_LABEL[c.stream] ?? "";
  const isOffer = (c: BoardCard) => c.taskType === "offer_received";

  // ── session P2: the room ──
  const current = order[index];
  const total = order.length;
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
  /** The current task is HANDLED (its write already landed — the vanish drove this): the
   *  DEAL runs — the stamp lands and holds, the sheet sweeps off left, the next rises with
   *  the advance (progress + footer tick WITH the rise). Reduced motion: the stamp appears
   *  without its pop for a beat, then the instant swap. */
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
      // the slot now holds what WAS next; fast-forward any dead entries (the wrap can land
      // back on the skipped task itself once everything between has gone)
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
    if (phase !== "room" || !current || dealRef.current) return;
    if (!liveKeys.has(current.key)) markHandledAdvance(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveKeys, phase, index, order]);

  // ── render ──
  return (
    <div className="tdb-ss" role="dialog" aria-modal="true" aria-label="Focused session"
      onPointerDown={phase === "opening" && !openingFinal ? jumpToFinal : undefined}
      onKeyDown={phase === "opening" && !openingFinal ? jumpToFinal : undefined}
      tabIndex={-1}>
      {phase === "opening" && (
        <>
          <div className={`tdb-ssdim${dimOn ? " on" : ""}`} aria-hidden />
          {first && (
            <div ref={firstRef} className={`tdb-ssfirst${firstOn ? " on" : ""}`} aria-hidden={!openingFinal}>
              <div className={`tdb-sscard ${first.stream}`}>
                <div className={`tdb-band ${first.stream}`}>
                  <span className={`tdb-tag due${isOffer(first) ? " offer" : ""}`}>{isOffer(first) ? `★ ${first.due}` : first.due}</span>
                </div>
                <div className="tdb-sscardc">
                  <h3>{first.title}</h3>
                  <div className="tdb-ssms">{[first.subtitle, `1 of ${queue.length}`, lane(first).toLowerCase()].filter(Boolean).join(" · ")}</div>
                </div>
              </div>
            </div>
          )}
          <canvas ref={veilRef} className={`tdb-ssveil${veilOn ? " on" : ""}`} aria-hidden />
          <div className="tdb-sslines" aria-live="polite">
            {RITUAL_LINES.map((l, i) => (
              <span key={l} className={line === i ? "on" : line > i ? "off" : ""}>{l}</span>
            ))}
          </div>
          <div className="tdb-ssctas">
            <button type="button" className={`tdb-ssb bp${pairOn >= 1 ? " on" : ""}`} onClick={beginRoom}>▶ Begin session</button>
            <button type="button" className={`tdb-ssb bw${pairOn >= 2 ? " on" : ""}`} onClick={backToDesk}>Back to desk</button>
          </div>
        </>
      )}
      {phase === "room" && current && (
        // ── session P2: THE ROOM (session-room.html frame A) — one task, centred; nothing
        // else exists. Action now opens the journey OVER the session (z 50 > 48) and a
        // surviving task resumes in place; a completed one vanishes from liveKeys and deals.
        <div className="tdb-ssroom">
          <div className="tdb-ssbar">
            <span className="tdb-ssk">FOCUSED SESSION · TASK {Math.min(index + 1, total)} OF {total}</span>
            <span className="tdb-ssprog" aria-hidden><b style={{ width: `${Math.round(((index + 1) / Math.max(1, total)) * 100)}%` }} /></span>
            <span className="tdb-ssk">{lane(current)}</span>
            <button type="button" className="tdb-ssexit" onClick={() => setPhase("close")}>End session ✕</button>
          </div>
          <div className="tdb-ssroomc">
            {/* P3 — the STACK: at most two sheet-edges peek beneath (the true count lives in
                the bar); the leaving clone deals over the top. */}
            <div className="tdb-ssstack">
              {(() => {
                const remaining = order.slice(index + 1).filter((x) => liveKeys.has(x.key)).length;
                return (
                  <>
                    {remaining >= 2 && <div className="tdb-ssdeck d2" aria-hidden />}
                    {remaining >= 1 && <div className="tdb-ssdeck d1" aria-hidden />}
                  </>
                );
              })()}
              {deal && (
                <div className={`tdb-ssleave ${deal.kind}${reduce ? " static" : ""}`} aria-hidden>
                  <div className="tdb-ssheet lv">
                    <div className={`tdb-band ${deal.card.stream}`}>
                      <span className={`tdb-tag due${deal.card.taskType === "offer_received" ? " offer" : ""}`}>{deal.card.taskType === "offer_received" ? `★ ${deal.card.due}` : deal.card.due}</span>
                    </div>
                    <div className="tdb-ssheetc">
                      <h2>{deal.card.title}</h2>
                      {deal.card.subtitle && <div className="tdb-ssms2">{deal.card.subtitle}</div>}
                    </div>
                  </div>
                  {deal.kind === "handled" && <span className="tdb-ssstamp" aria-hidden>✓</span>}
                </div>
              )}
            <div className={`tdb-ssheet${rose ? " rise" : ""}`}>
              <div className={`tdb-band ${current.stream}`}>
                <span className={`tdb-tag due${isOffer(current) ? " offer" : ""}`}>{isOffer(current) ? `★ ${current.due}` : current.due}</span>
              </div>
              <div className="tdb-ssheetc">
                <h2>{current.title}</h2>
                {(current.subtitle || current.who) && (
                  <div className="tdb-ssms2">{[current.subtitle, current.who].filter(Boolean).join(" · ")}</div>
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
            {order[index + 1] && (
              <div className="tdb-ssnext">NEXT UP · <i>{order[index + 1].title}</i></div>
            )}
          </div>
        </div>
      )}
      {phase === "close" && (
        // P2 scaffold — Phase 4 builds the full close (the ledger + review expansion)
        <div className="tdb-ssroom">
          <div className="tdb-ssclose">
            <h1>{order.some((x) => liveKeys.has(x.key)) ? "Good session." : "Desk cleared."}</h1>
            <div className="tdb-ssub">Every box ticked turns the dial in your favour.</div>
            <div className="tdb-ssexits">
              <button type="button" className="tdb-ssb bp on" onClick={onClose}>Back to your desk</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
