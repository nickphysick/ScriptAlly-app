/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Scatter-and-settle import loader (extraction wait) — built to scriptally-loader-scatter-settle.html
 * + scriptally-loader-liveliness.html. The writer's OWN raw cells (sampled client-side on upload —
 * display only, never the real extraction path) land strewn across the screen at slight angles the
 * instant the file's read. While extraction runs the screen stays ALIVE: the scattered cards drift
 * gently and independently, on-brand process-sparks pop and fade, the bottom bar eases smoothly toward
 * ~78% (never parked) and the status text rotates honestly through read → parse → match → tidy. None
 * of this races ahead — the drift / sparks / bar-ease / text keep cycling until extraction ACTUALLY
 * returns. Then each card snaps one-by-one into a neat centred column and crystallises messy → clean:
 * the raw line gives way to a real <StatusDot> with a small pop, the agent's name, and an
 * "Agency · Status · Date" line, and the bar completes to 100%.
 *
 * Truthful: real raw in, real clean out (clean fields from the real result, paired by order). For big
 * imports only a representative handful scatter; the rest are noted as "+N more". Reduced-motion: no
 * drift, no sparks, no fly-in — just the easing bar + rotating status text, then the clean stack.
 */
import React, { useEffect, useRef, useState } from "react";
import { OnbNav } from "./SmartImportReview";
import { StatusDot } from "../StatusDot";
import { QueryStatus } from "../../types";

const SERIF = "'Playfair Display',serif";
const MONO = "'JetBrains Mono',monospace";

export interface LoaderCard {
  /** The row's raw cells as the writer typed them — shown while scattered. */
  messy: string;
  /** Clean agent name (Playfair) — filled once extraction completes. */
  name?: string;
  /** The clean detail parts — agency + date sit muted, the status is highlighted in ink between them. */
  agency?: string;
  date?: string;
  /** Drives the real StatusDot AND the highlighted status label — filled once extraction completes. */
  status?: QueryStatus | string;
}
export interface ScatterSettleLoaderProps {
  cards: LoaderCard[];
  /** Extraction finished — begin the snap-and-crystallise settle. */
  complete: boolean;
  /** Total records extracted (drives the count + any "+N more" beyond the scattered sample). */
  total: number;
  /** Called once the settle beat finishes — the host routes to the Overview. */
  onProceed: () => void;
  /** Hard-timeout / unrecoverable wait — the host exits to its fallback (never dead-ends onboarding). */
  onTimeout?: () => void;
  userName?: string;
}

// Scatter slots — offsets (px) from the centre of the stage + a slight rotation + per-card drift
// (bob amplitude/rotation + a varied duration & delay so each breathes independently). Deterministic.
const SCATTER = [
  { dx: -300, dy: -158, r: -7, bx: 5, by: -7, br: 1.4, d: 3.6, dl: 0 },
  { dx: 300, dy: -178, r: 6, bx: -6, by: 6, br: -1.1, d: 4.0, dl: 0.5 },
  { dx: -332, dy: 6, r: 5, bx: 7, by: 5, br: 1.0, d: 3.3, dl: 0.9 },
  { dx: 332, dy: -8, r: -6, bx: -5, by: -6, br: -1.3, d: 3.8, dl: 0.25 },
  { dx: -250, dy: 168, r: 7, bx: 6, by: -5, br: 1.0, d: 3.5, dl: 0.7 },
  { dx: 282, dy: 176, r: -5, bx: -7, by: 5, br: -1.0, d: 4.1, dl: 0.15 },
  { dx: -36, dy: -196, r: 3, bx: 5, by: 6, br: 1.3, d: 3.4, dl: 0.55 },
  { dx: 58, dy: 168, r: -4, bx: -6, by: -6, br: -1.0, d: 3.9, dl: 0.85 },
];
const STEP = 74;          // centred-column row pitch
// ── Three-zone timing spine: Intro (fixed) → Work (elastic, loops till extraction) → Reveal (gated) ──
const INTRO_MS = 1200;    // fixed intro beat (the squeeze-pop scatter entrance)
const FLOOR_MS = 2800;    // Reveal floor: fast extraction is padded to here so the reveal never flashes
const SLOW_AT_MS = 10000; // past this, the status text owns up to a larger import
const TIMEOUT_MS = 30000; // hard wait ceiling → host fallback (never an infinite loop)
const LAND_STAGGER = 360; // ms between successive cards starting their fly-in
const RESOLVE_LAG = 320;  // ms after a card starts flying in before it crystallises (lands → clean)
const HOLD = 700;         // ms after the last card resolves before handing to the Overview
const WAIT_TXT = ["Reading your file…", "Parsing agents…", "Interpreting dates…", "Matching statuses…", "Tidying records…", "Almost there…"];
const SLOW_TXT = "Larger import — almost there…";
const SPARK_KINDS = ["q", "a", "p", "d"] as const;
const SPARK_GLYPH: Record<typeof SPARK_KINDS[number], React.ReactNode> = {
  q: "?",
  a: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="3.4" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" /></svg>,
  p: <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M2 12 22 3 13 22l-2.5-7.5L2 12Z" /></svg>,
  d: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M4 9h16M8 3v4M16 3v4" /></svg>,
};

const prefersReduced = () =>
  typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const CARD_W = 440;

export const ScatterSettleLoader: React.FC<ScatterSettleLoaderProps> = ({ cards, complete, total, onProceed, onTimeout, userName }) => {
  const reduced = prefersReduced();
  const userInitial = userName ? userName[0].toUpperCase() : "?";
  const n = cards.length;
  const [introDone, setIntroDone] = useState(reduced); // intro beat over → the Work zone (drift) begins
  const [minElapsed, setMinElapsed] = useState(false); // Reveal floor reached
  const [slow, setSlow] = useState(false);             // a larger import — own up to the longer wait
  const [settling, setSettling] = useState(false);
  const [moved, setMoved] = useState(0);     // cards that have snapped to their column slot
  const [resolved, setResolved] = useState(0); // cards that have crystallised messy → clean
  const [txtIdx, setTxtIdx] = useState(0);     // rotating status line during the wait
  const [waitStarted, setWaitStarted] = useState(false); // kicks the bar's ease off the start line
  const [sparks, setSparks] = useState<{ id: number; kind: typeof SPARK_KINDS[number]; x: number; y: number }[]>([]);
  const sparkId = useRef(0);

  // Timing spine — Intro (fixed) then the Reveal floor. The floor pads a fast extraction so the reveal
  // never flashes. Reduced-motion keeps the gate (we still wait for the data) but skips the timed
  // theatre — records appear in order the moment extraction returns.
  useEffect(() => {
    if (reduced) { setIntroDone(true); setMinElapsed(true); return; }
    const t1 = setTimeout(() => setIntroDone(true), INTRO_MS);
    const t2 = setTimeout(() => setMinElapsed(true), FLOOR_MS);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [reduced]);

  // Larger-import status shift (both motion prefs) + a hard wait ceiling → the host's fallback, so a
  // hung or error-bound extraction never spins forever. Both disarm the moment the data is back.
  const timeoutRef = useRef(onTimeout); timeoutRef.current = onTimeout;
  useEffect(() => {
    if (complete) return; // data's back — the settle path owns the rest
    const slowT = setTimeout(() => setSlow(true), SLOW_AT_MS);
    const killT = setTimeout(() => timeoutRef.current?.(), TIMEOUT_MS);
    return () => { clearTimeout(slowT); clearTimeout(killT); };
  }, [complete]);

  // Begin settling ONLY once extraction has actually returned (and, for the animated path, the cards
  // have had their scatter moment). Honest: nothing snaps or completes before the data is ready.
  useEffect(() => {
    if (complete && minElapsed) setSettling(true);
  }, [complete, minElapsed]);

  // Defensive reset if extraction is re-run (complete → false). Real flow is one-shot; matters for a
  // re-upload or the dev harness loop.
  useEffect(() => {
    if (!complete) { setSettling(false); setMoved(0); setResolved(0); }
  }, [complete]);

  // Kick the bar off the start line so its long ease toward ~78% animates (instead of rendering parked).
  useEffect(() => { const id = requestAnimationFrame(() => setWaitStarted(true)); return () => cancelAnimationFrame(id); }, []);

  // Rotating honest status text — cycles through the read→tidy phases until the settle begins (both
  // motion preferences; this is the reduced-motion path's main sign of life).
  useEffect(() => {
    if (settling) return;
    const id = setInterval(() => setTxtIdx((i) => (i + 1) % WAIT_TXT.length), 1300);
    return () => clearInterval(id);
  }, [settling]);

  // Process-sparks pop around the cards while we wait (animated path only) — a few at a time, never a swarm.
  useEffect(() => {
    if (reduced || settling || n === 0) return;
    const spawn = () => {
      const kind = SPARK_KINDS[sparkId.current % SPARK_KINDS.length];
      const id = ++sparkId.current;
      const x = 12 + Math.random() * 76, y = 16 + Math.random() * 60; // % of the stage
      setSparks((s) => [...s, { id, kind, x, y }]);
      setTimeout(() => setSparks((s) => s.filter((sp) => sp.id !== id)), 1500);
    };
    const id = setInterval(spawn, 560);
    return () => { clearInterval(id); setSparks([]); };
  }, [reduced, settling, n]);

  // Snap each card in, then crystallise it a beat later; finally hand off to the Overview. Reduced-motion
  // skips the fly-in (cards are simply present, clean) but still only proceeds once complete.
  const proceedRef = useRef(onProceed); proceedRef.current = onProceed;
  useEffect(() => {
    if (!settling) return;
    if (reduced) { setMoved(n); setResolved(n); const t = setTimeout(() => proceedRef.current(), HOLD); return () => clearTimeout(t); }
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < n; i++) {
      timers.push(setTimeout(() => setMoved((c) => Math.max(c, i + 1)), i * LAND_STAGGER));
      timers.push(setTimeout(() => setResolved((c) => Math.max(c, i + 1)), i * LAND_STAGGER + RESOLVE_LAG));
    }
    timers.push(setTimeout(() => proceedRef.current(), Math.max(0, n - 1) * LAND_STAGGER + RESOLVE_LAG + HOLD));
    return () => timers.forEach(clearTimeout);
  }, [settling, reduced, n]);

  const remainder = Math.max(0, total - n);
  const allShownResolved = settling && resolved >= n;
  const countShown = Math.min(resolved + (allShownResolved ? remainder : 0), total);
  // Bar: eases to ~78% across the wait (never parked), then completes to 100% as cards resolve.
  const barW = settling ? Math.round(78 + (resolved / Math.max(1, n)) * 22) : (waitStarted ? 78 : 4);
  const barTransition = settling ? "width .45s ease" : "width 6s cubic-bezier(.25,.6,.4,1)";
  const txt = allShownResolved ? "ready — here's what we found" : settling ? "Tidying records…" : slow ? SLOW_TXT : WAIT_TXT[txtIdx];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "#fbf7f1", display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "Inter, sans-serif", color: "#3a1c14", backgroundImage: "repeating-linear-gradient(to bottom,transparent 0,transparent 33px,rgba(124,58,42,.022) 33px,rgba(124,58,42,.022) 34px)" }}>
      <style>{`
        @keyframes saScAppear{from{opacity:0}to{opacity:1}}
        @keyframes saScPop{0%{transform:scale(.4);opacity:0}60%{transform:scale(1.14)}100%{transform:scale(1);opacity:1}}
        /* gentle independent drift while we wait (offsets/rotation/duration set per card via vars) */
        @keyframes saScBob{0%,100%{transform:translate(-50%,-50%) rotate(var(--r,0deg))}50%{transform:translate(calc(-50% + var(--bx,5px)), calc(-50% + var(--by,-6px))) rotate(calc(var(--r,0deg) + var(--br,1deg)))}}
        @keyframes saScSpark{0%{transform:scale(.3);opacity:0}20%{transform:scale(1.1);opacity:1}55%{transform:scale(1);opacity:1}100%{transform:scale(.96) translateY(-10px);opacity:0}}
        .sa-sc-card{transition:left .6s cubic-bezier(.34,1.3,.5,1), top .6s cubic-bezier(.34,1.3,.5,1), transform .6s cubic-bezier(.34,1.3,.5,1), background .4s ease, border-color .4s ease;}
        .sa-sc-appear{animation:saScAppear .4s ease both;}
        .sa-sc-float{animation:saScBob var(--d,3.6s) ease-in-out infinite;animation-delay:var(--dl,0s);}
        .sa-sc-layer{position:absolute;left:17px;right:17px;top:0;bottom:0;display:flex;align-items:center;transition:opacity .4s ease;}
        .sa-sc-dotpop svg{animation:saScPop .5s cubic-bezier(.34,1.56,.64,1);}
        .sa-sc-spark{position:absolute;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;pointer-events:none;animation:saScSpark 1.5s ease forwards;z-index:6;}
        .sa-sc-spark.q{background:#f7eed8;color:#a8842c;font-family:${SERIF};font-weight:700;font-size:18px;}
        .sa-sc-spark.a{background:#e9ede6;color:#5a6e58;}
        .sa-sc-spark.p{background:#f5e2da;color:#7c3a2a;}
        .sa-sc-spark.d{background:#eef1ec;color:#5a6e58;}
        @media(prefers-reduced-motion:reduce){.sa-sc-card{transition:none;}.sa-sc-appear,.sa-sc-float,.sa-sc-dotpop svg,.sa-sc-spark{animation:none;}}
      `}</style>

      <OnbNav userInitial={userInitial} />

      <main style={{ flex: "1 1 auto", minHeight: 0, position: "relative", overflow: "hidden" }}>
        {n === 0 ? (
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontFamily: SERIF, fontSize: 22, color: "#7c3a2a" }}>Reading your file…</div>
        ) : cards.map((card, i) => {
          const slot = SCATTER[i % SCATTER.length];
          const isMoved = i < moved;
          const isDone = i < resolved;
          // reduced-motion: cards sit straight in the centred column (no scatter, no fly-in).
          const inStack = reduced || isMoved;
          const drifting = !reduced && introDone && !settling && !isMoved; // bob through the Work zone (after the intro beat)
          const colTop = `calc(50% + ${(i - (n - 1) / 2) * STEP}px)`;
          const top = inStack ? colTop : `calc(50% + ${slot.dy}px)`;
          const left = inStack ? "50%" : `calc(50% + ${slot.dx}px)`;
          const transform = inStack ? "translate(-50%, -50%) rotate(0deg)" : `translate(-50%, -50%) rotate(${slot.r}deg)`;
          return (
            <div key={i} className={`sa-sc-card${reduced ? "" : " sa-sc-appear"}${drifting ? " sa-sc-float" : ""}`} aria-hidden
              style={{
                position: "absolute", left, top, transform, width: CARD_W, minHeight: 62, zIndex: isMoved ? 20 + i : 10,
                animationDelay: reduced ? undefined : `${50 + i * 80}ms`,
                ["--r" as string]: `${slot.r}deg`, ["--bx" as string]: `${slot.bx}px`, ["--by" as string]: `${slot.by}px`, ["--br" as string]: `${slot.br}deg`, ["--d" as string]: `${slot.d}s`, ["--dl" as string]: `${slot.dl}s`,
                background: isDone ? "#fdfcf9" : "#fff", border: `1px solid ${isDone ? "#e3ddd0" : "#e7ddd2"}`, borderRadius: 13,
                boxShadow: isMoved ? "0 8px 22px -16px rgba(58,28,20,.34)" : "0 14px 30px -16px rgba(58,28,20,.4)",
                padding: "13px 17px",
              }}>
              {/* messy (raw) layer */}
              <div className="sa-sc-layer" style={{ opacity: isDone ? 0 : 1, gap: 10 }}>
                <span style={{ width: 22, height: 22, borderRadius: 6, background: "#f2ece3", display: "flex", alignItems: "center", justifyContent: "center", color: "#bcae9f", flexShrink: 0, fontSize: 12 }}>▦</span>
                <span style={{ fontFamily: MONO, fontSize: 12.5, color: "#a89a8c", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{card.messy}</span>
              </div>
              {/* clean (resolved) layer */}
              <div className="sa-sc-layer" style={{ opacity: isDone ? 1 : 0, gap: 13 }}>
                <span className={isDone ? "sa-sc-dotpop" : undefined} style={{ flexShrink: 0, display: "inline-flex" }}>
                  {card.status ? <StatusDot status={card.status} overrideSize={30} /> : <span style={{ width: 30, height: 30, borderRadius: "50%", border: "2px solid #e3d4c7", display: "inline-block" }} />}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 600, lineHeight: 1.1, color: "#3a1c14", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{card.name || "—"}</div>
                  <div style={{ fontFamily: MONO, fontSize: 11.5, color: "#9a8c80", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {card.agency ? `${card.agency} · ` : ""}<span style={{ color: "#3a1c14" }}>{card.status ? String(card.status) : ""}</span>{card.date ? ` · ${card.date}` : ""}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* process-sparks — on-brand glyphs popping around the cards while we work */}
        {sparks.map((s) => (
          <div key={s.id} className={`sa-sc-spark ${s.kind}`} aria-hidden style={{ left: `${s.x}%`, top: `${s.y}%` }}>{SPARK_GLYPH[s.kind]}</div>
        ))}

        {/* the remainder of a big import — resolves quietly into the base of the stack */}
        {settling && remainder > 0 && (
          <div className="sa-sc-appear" style={{ position: "absolute", left: "50%", top: `calc(50% + ${(n - (n - 1) / 2) * STEP}px)`, transform: "translate(-50%, -50%)", fontFamily: MONO, fontSize: 11.5, color: "#8a8178", background: "#efe7db", padding: "5px 13px", borderRadius: 20, whiteSpace: "nowrap" }}>
            + {remainder} more, tidied
          </div>
        )}
      </main>

      {/* slim bottom status bar — gold blinking pip · rotating status · smoothly-easing progress · count */}
      <div style={{ flexShrink: 0, height: 52, background: "rgba(253,250,245,.92)", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)", borderTop: "1px solid #e7ddd2", display: "flex", alignItems: "center", gap: 16, padding: "0 22px" }}>
        <style>{`@keyframes saScBlink{0%,100%{opacity:.4}50%{opacity:1}} .sa-sc-pip{animation:saScBlink 1.1s ease-in-out infinite;} @media(prefers-reduced-motion:reduce){.sa-sc-pip{animation:none;}}`}</style>
        <span className="sa-sc-pip" style={{ width: 9, height: 9, borderRadius: "50%", background: "#a8842c", flexShrink: 0 }} />
        <span key={txt} style={{ fontFamily: MONO, fontSize: 12.5, color: "#6a5c50", whiteSpace: "nowrap", minWidth: 168, animation: "saScAppear .25s ease" }}>{txt}</span>
        <span style={{ flex: 1, height: 5, borderRadius: 3, background: "#ece3d6", overflow: "hidden", maxWidth: 420 }}>
          <span style={{ display: "block", height: "100%", width: `${barW}%`, background: "linear-gradient(90deg,#8a9e88,#5a6e58)", borderRadius: 3, transition: barTransition }} />
        </span>
        <span style={{ fontFamily: MONO, fontSize: 11.5, color: "#9a8c80", marginLeft: "auto", whiteSpace: "nowrap" }}>{total > 0 ? `${countShown} / ${total}` : ""}</span>
      </div>
    </div>
  );
};
