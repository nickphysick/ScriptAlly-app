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
import { nearestEdgeFly, wanderPoints, OPENING, RITUAL_LINES, FLY_SELECTOR } from "../../lib/sessionStage";

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
  const [phase, setPhase] = useState<"opening" | "room" | "close">("opening");
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
      {phase === "room" && (
        // P1 scaffold — Phase 2 builds the room (bar · sheet · actions · footer)
        <div className="tdb-ssroom">
          <div className="tdb-ssbar">
            <span className="tdb-ssk">FOCUSED SESSION · TASK 1 OF {queue.length}</span>
            <button type="button" className="tdb-ssexit" onClick={onClose}>End session ✕</button>
          </div>
        </div>
      )}
    </div>
  );
};
