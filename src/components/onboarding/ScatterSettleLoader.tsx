/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Scatter-and-settle import loader (extraction wait) — built to scriptally-loader-scatter-settle.html.
 * The writer's OWN raw cells (sampled client-side on upload — display only, never the real extraction
 * path) land strewn across the screen at slight angles the instant the file's read. Then, as the real
 * result arrives, each card snaps one-by-one into a neat centred column — straightening as it flies in
 * — and crystallises messy → clean at the moment it lands: the raw line gives way to a real <StatusDot>
 * (locked component, true ring-fill + direction colouring) with a small pop, the agent's name, and an
 * "Agency · Status · Date" line. The loading state lives in a slim bottom bar, out of the way.
 *
 * Truthful: real raw in, real clean out (the clean fields come from the real extraction result, paired
 * by order). For big imports only a representative handful scatter; the rest are noted as "+N more".
 * Reduced-motion: cards are simply present in the tidy clean column — no scatter, no fly-in.
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
  userName?: string;
}

// Scatter slots — offsets (px) from the centre of the stage + a slight rotation. Strewn, a couple
// hanging toward the edges, deterministic (no randomness) so the layout is stable across renders.
const SCATTER = [
  { dx: -300, dy: -158, r: -7 }, { dx: 300, dy: -178, r: 6 },
  { dx: -332, dy: 6, r: 5 }, { dx: 332, dy: -8, r: -6 },
  { dx: -250, dy: 168, r: 7 }, { dx: 282, dy: 176, r: -5 },
  { dx: -36, dy: -196, r: 3 }, { dx: 58, dy: 168, r: -4 },
];
const STEP = 74;          // centred-column row pitch
const MIN_SCATTER = 1500; // ms cards stay strewn before they're allowed to snap (covers fast extraction)
const LAND_STAGGER = 360; // ms between successive cards starting their fly-in
const RESOLVE_LAG = 320;  // ms after a card starts flying in before it crystallises (lands → clean)
const HOLD = 700;         // ms after the last card resolves before handing to the Overview

const prefersReduced = () =>
  typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const CARD_W = 440;

export const ScatterSettleLoader: React.FC<ScatterSettleLoaderProps> = ({ cards, complete, total, onProceed, userName }) => {
  const reduced = prefersReduced();
  const userInitial = userName ? userName[0].toUpperCase() : "?";
  const n = cards.length;
  const [minElapsed, setMinElapsed] = useState(reduced);
  const [settling, setSettling] = useState(reduced);
  const [moved, setMoved] = useState(reduced ? n : 0);     // cards that have snapped to their column slot
  const [resolved, setResolved] = useState(reduced ? n : 0); // cards that have crystallised messy → clean

  // Minimum scatter window so a fast extraction still shows the strewn beat (skipped under reduced-motion).
  useEffect(() => {
    if (reduced) return;
    const t = setTimeout(() => setMinElapsed(true), MIN_SCATTER);
    return () => clearTimeout(t);
  }, [reduced]);

  useEffect(() => {
    if (!reduced && complete && minElapsed) setSettling(true);
  }, [reduced, complete, minElapsed]);

  // Defensive reset if extraction is re-run (complete → false). Real flow is one-shot; matters for a
  // re-upload or the dev harness loop.
  useEffect(() => {
    if (!reduced && !complete) { setSettling(false); setMoved(0); setResolved(0); }
  }, [reduced, complete]);

  // Snap each card in, then crystallise it a beat later; finally hand off to the Overview.
  const proceedRef = useRef(onProceed); proceedRef.current = onProceed;
  useEffect(() => {
    if (!settling) return;
    if (reduced) { const t = setTimeout(() => proceedRef.current(), HOLD); return () => clearTimeout(t); }
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < n; i++) {
      timers.push(setTimeout(() => setMoved((c) => Math.max(c, i + 1)), i * LAND_STAGGER));
      timers.push(setTimeout(() => setResolved((c) => Math.max(c, i + 1)), i * LAND_STAGGER + RESOLVE_LAG));
    }
    timers.push(setTimeout(() => proceedRef.current(), Math.max(0, n - 1) * LAND_STAGGER + RESOLVE_LAG + HOLD));
    return () => timers.forEach(clearTimeout);
  }, [settling, reduced, n]);

  const remainder = Math.max(0, total - n);
  const allShownResolved = resolved >= n;
  const countShown = Math.min(resolved + (allShownResolved ? remainder : 0), total);
  const fill = total > 0 ? Math.round((countShown / total) * 100) : 0;
  const txt = !settling ? "your file, as we found it…" : allShownResolved ? "ready — here's what we found" : "sorting into shape…";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "#fbf7f1", display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "Inter, sans-serif", color: "#3a1c14", backgroundImage: "repeating-linear-gradient(to bottom,transparent 0,transparent 33px,rgba(124,58,42,.022) 33px,rgba(124,58,42,.022) 34px)" }}>
      <style>{`
        @keyframes saScAppear{from{opacity:0}to{opacity:1}}
        @keyframes saScPop{0%{transform:scale(.4);opacity:0}60%{transform:scale(1.14)}100%{transform:scale(1);opacity:1}}
        .sa-sc-card{transition:left .6s cubic-bezier(.34,1.3,.5,1), top .6s cubic-bezier(.34,1.3,.5,1), transform .6s cubic-bezier(.34,1.3,.5,1), background .4s ease, border-color .4s ease;}
        .sa-sc-appear{animation:saScAppear .4s ease both;}
        .sa-sc-layer{position:absolute;left:17px;right:17px;top:0;bottom:0;display:flex;align-items:center;transition:opacity .4s ease;}
        .sa-sc-dotpop svg{animation:saScPop .5s cubic-bezier(.34,1.56,.64,1);}
        @media(prefers-reduced-motion:reduce){.sa-sc-card{transition:none;}.sa-sc-appear{animation:none;}.sa-sc-dotpop svg{animation:none;}}
      `}</style>

      <OnbNav userInitial={userInitial} />

      <main style={{ flex: "1 1 auto", minHeight: 0, position: "relative", overflow: "hidden" }}>
        {n === 0 ? (
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontFamily: SERIF, fontSize: 22, color: "#7c3a2a" }}>Reading your file…</div>
        ) : cards.map((card, i) => {
          const isMoved = i < moved;
          const isDone = i < resolved;
          const slot = SCATTER[i % SCATTER.length];
          // centred column slot vs scattered start
          const colTop = `calc(50% + ${(i - (n - 1) / 2) * STEP}px)`;
          const top = isMoved ? colTop : `calc(50% + ${slot.dy}px)`;
          const left = isMoved ? "50%" : `calc(50% + ${slot.dx}px)`;
          const transform = isMoved ? "translate(-50%, -50%) rotate(0deg)" : `translate(-50%, -50%) rotate(${slot.r}deg)`;
          return (
            <div key={i} className={`sa-sc-card${reduced ? "" : " sa-sc-appear"}`} aria-hidden
              style={{
                position: "absolute", left, top, transform, width: CARD_W, minHeight: 62, zIndex: isMoved ? 20 + i : 10,
                animationDelay: reduced ? undefined : `${50 + i * 80}ms`,
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

        {/* the remainder of a big import — resolves quietly into the base of the stack */}
        {settling && remainder > 0 && (
          <div className="sa-sc-appear" style={{ position: "absolute", left: "50%", top: `calc(50% + ${(n - (n - 1) / 2) * STEP}px)`, transform: "translate(-50%, -50%)", fontFamily: MONO, fontSize: 11.5, color: "#8a8178", background: "#efe7db", padding: "5px 13px", borderRadius: 20, whiteSpace: "nowrap" }}>
            + {remainder} more, tidied
          </div>
        )}
      </main>

      {/* slim bottom status bar — gold blinking pip · status · sage progress · count */}
      <div style={{ flexShrink: 0, height: 52, background: "rgba(253,250,245,.92)", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)", borderTop: "1px solid #e7ddd2", display: "flex", alignItems: "center", gap: 16, padding: "0 22px" }}>
        <style>{`@keyframes saScBlink{0%,100%{opacity:.4}50%{opacity:1}} .sa-sc-pip{animation:saScBlink 1.1s ease-in-out infinite;} @media(prefers-reduced-motion:reduce){.sa-sc-pip{animation:none;}}`}</style>
        <span className="sa-sc-pip" style={{ width: 9, height: 9, borderRadius: "50%", background: "#a8842c", flexShrink: 0 }} />
        <span style={{ fontFamily: MONO, fontSize: 12.5, color: "#6a5c50", whiteSpace: "nowrap" }}>{txt}</span>
        <span style={{ flex: 1, height: 5, borderRadius: 3, background: "#ece3d6", overflow: "hidden", maxWidth: 420 }}>
          <span style={{ display: "block", height: "100%", width: `${fill}%`, background: "linear-gradient(90deg,#8a9e88,#5a6e58)", borderRadius: 3, transition: "width .35s ease" }} />
        </span>
        <span style={{ fontFamily: MONO, fontSize: 11.5, color: "#9a8c80", marginLeft: "auto", whiteSpace: "nowrap" }}>{total > 0 ? `${countShown} / ${total}` : ""}</span>
      </div>
    </div>
  );
};
