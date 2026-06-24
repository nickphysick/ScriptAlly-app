/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Scatter-and-settle import loader (extraction wait). The writer's OWN raw cells (sampled
 * client-side on upload — display only, never the real extraction path) land scattered across the
 * screen at slight angles while the cloud extraction runs; as the result arrives they snap one-by-one
 * into a neat centred stack, straightening with a slight overshoot, and crystallise messy → clean as
 * they land — the status becoming a real <StatusDot> with a small pop. Loading status sits in a slim
 * bottom bar, never a centred popup.
 *
 * Truthful: real raw in, real clean out (the status comes from the real extraction result, paired by
 * order). For big imports only a representative handful scatter; the rest are noted as "+N more".
 * Reduced-motion: cards are simply present in the tidy clean stack — no scatter, no fly-in.
 *
 * NOTE: built to the written spec (the scriptally-loader-scatter-settle.html mockup was not present
 * at build time) — visual details (scatter spread, timing, card chrome) are the most likely to want
 * a morning tweak.
 */
import React, { useEffect, useRef, useState } from "react";
import { OnbNav } from "./SmartImportReview";
import { StatusDot } from "../StatusDot";
import { QueryStatus } from "../../types";

const SERIF = "'Playfair Display',serif";
const MONO = "'JetBrains Mono',monospace";

export interface LoaderCard { headline: string; raw: string; status?: QueryStatus | string }
export interface ScatterSettleLoaderProps {
  /** Sampled records — `raw` shows immediately; `status` is filled once extraction completes. */
  cards: LoaderCard[];
  /** Extraction finished — begin the snap-and-crystallise settle. */
  complete: boolean;
  /** Total records extracted (drives the count + any "+N more" beyond the scattered sample). */
  total: number;
  /** Called once the settle beat finishes — the host routes to the Overview. */
  onProceed: () => void;
  userName?: string;
}

// Deterministic scatter slots (offset from centre, in vw/vh + rotation) — no randomness, so the
// layout is stable across renders. Up to 8; a big import only ever scatters a representative few.
const SCATTER = [
  { x: -33, y: -20, r: -8 }, { x: 31, y: -25, r: 7 }, { x: -39, y: 15, r: 6 }, { x: 36, y: 19, r: -9 },
  { x: -9, y: -33, r: 4 }, { x: 13, y: 31, r: -6 }, { x: -25, y: 35, r: 9 }, { x: 27, y: -5, r: -4 },
];
const STAGGER = 150;     // ms between successive card landings
const MIN_SCATTER = 1500; // ms cards stay scattered before they're allowed to snap (covers fast extraction)
const HOLD = 650;        // ms after the last card lands before handing to the Overview

const prefersReduced = () =>
  typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const CARD_W = 320;
const GAP = 52;

export const ScatterSettleLoader: React.FC<ScatterSettleLoaderProps> = ({ cards, complete, total, onProceed, userName }) => {
  const reduced = prefersReduced();
  const userInitial = userName ? userName[0].toUpperCase() : "?";
  const n = cards.length;
  const [minElapsed, setMinElapsed] = useState(reduced);
  const [settling, setSettling] = useState(reduced);
  const [landed, setLanded] = useState(reduced ? n : 0); // how many have snapped into the stack

  // Minimum scatter time, so a fast extraction still shows the beat (skipped under reduced-motion).
  useEffect(() => {
    if (reduced) return;
    const t = setTimeout(() => setMinElapsed(true), MIN_SCATTER);
    return () => clearTimeout(t);
  }, [reduced]);

  // Begin settling once extraction is done AND the cards have had their scatter moment.
  useEffect(() => {
    if (!reduced && complete && minElapsed) setSettling(true);
  }, [reduced, complete, minElapsed]);

  // Defensive: if extraction is re-run (complete → false again), drop back to the scattered state.
  // The real flow is one-shot, so this only matters for a re-upload / the dev harness loop.
  useEffect(() => {
    if (!reduced && !complete) { setSettling(false); setLanded(0); }
  }, [reduced, complete]);

  // Land the cards one by one, then hand off to the Overview.
  const proceedRef = useRef(onProceed); proceedRef.current = onProceed;
  useEffect(() => {
    if (!settling) return;
    if (reduced) { const t = setTimeout(() => proceedRef.current(), HOLD); return () => clearTimeout(t); }
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < n; i++) timers.push(setTimeout(() => setLanded((c) => Math.max(c, i + 1)), i * STAGGER));
    timers.push(setTimeout(() => proceedRef.current(), n * STAGGER + HOLD));
    return () => timers.forEach(clearTimeout);
  }, [settling, reduced, n]);

  const remainder = Math.max(0, total - n);
  const progress = total > 0 ? Math.round((settling ? (landed / Math.max(1, n)) : 0) * 100) : 0;
  const statusText = !complete ? "Reading your records…" : settling ? "Tidying everything into place…" : "Almost ready…";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "#f2ede7", display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "Inter, sans-serif", color: "#2a2521" }}>
      <style>{`
        @keyframes saScDotPop{0%{transform:scale(.4);opacity:0}60%{transform:scale(1.12)}100%{transform:scale(1);opacity:1}}
        @keyframes saScFade{from{opacity:0}to{opacity:1}}
        .sa-sc-card{transition:transform .62s cubic-bezier(.34,1.56,.64,1), box-shadow .4s ease;}
        .sa-sc-dot{animation:saScDotPop .42s cubic-bezier(.34,1.56,.64,1) both;}
        .sa-sc-clean{animation:saScFade .3s ease both;}
        @media(prefers-reduced-motion:reduce){.sa-sc-card{transition:none;}.sa-sc-dot,.sa-sc-clean{animation:none;}}
      `}</style>

      <OnbNav userInitial={userInitial} />

      <main style={{ flex: "1 1 auto", minHeight: 0, position: "relative", overflow: "hidden" }}>
        {n === 0 ? (
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontFamily: SERIF, fontSize: 22, color: "#7c3a2a" }}>Reading your file…</div>
        ) : cards.map((card, i) => {
          const isLanded = i < landed;
          const slot = SCATTER[i % SCATTER.length];
          // Scattered (pre-settle) vs the centred stack slot (once landed).
          const transform = isLanded
            ? `translate(-50%, calc(-50% + ${(i - (n - 1) / 2) * GAP}px))`
            : `translate(calc(-50% + ${slot.x}vw), calc(-50% + ${slot.y}vh)) rotate(${slot.r}deg)`;
          const status = card.status;
          return (
            <div key={i} className="sa-sc-card" aria-hidden
              style={{
                position: "absolute", top: "50%", left: "50%", width: CARD_W, marginLeft: 0,
                transform, zIndex: isLanded ? 20 + i : 10,
                background: "#fdfaf5", border: "1px solid #e7ddd2", borderRadius: 13,
                boxShadow: isLanded ? "0 8px 26px -16px rgba(58,28,20,.4)" : "0 22px 50px -22px rgba(58,28,20,.45)",
                padding: "13px 15px", display: "flex", alignItems: "center", gap: 12,
              }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 14.5, color: "#3a1c14", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{card.headline}</div>
                {isLanded && status ? (
                  <div className="sa-sc-clean" style={{ fontFamily: MONO, fontSize: 11, color: "#5a6e58", marginTop: 3 }}>{String(status)}</div>
                ) : (
                  <div style={{ fontFamily: MONO, fontSize: 11, color: "#b3a08f", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{card.raw || "—"}</div>
                )}
              </div>
              {isLanded && status ? (
                <span className="sa-sc-dot" style={{ flexShrink: 0, display: "inline-flex" }}><StatusDot status={status} overrideSize={24} /></span>
              ) : (
                <span style={{ flexShrink: 0, width: 24, height: 24, borderRadius: "50%", border: "2px solid #e3d4c7" }} />
              )}
            </div>
          );
        })}

        {/* the remainder of a big import — resolves quietly into the base of the stack */}
        {settling && remainder > 0 && (
          <div className="sa-sc-clean" style={{ position: "absolute", top: "50%", left: "50%", transform: `translate(-50%, calc(-50% + ${(n - (n - 1) / 2) * GAP + 6}px))`, fontFamily: MONO, fontSize: 11.5, color: "#8a8178", background: "#efe7db", padding: "5px 12px", borderRadius: 20 }}>
            + {remainder} more, tidied
          </div>
        )}
      </main>

      {/* slim bottom status bar — never a centred popup */}
      <div style={{ flexShrink: 0, borderTop: "1px solid #e2d8cc", background: "#fbf7f1", padding: "11px 24px", display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ fontFamily: MONO, fontSize: 12, color: "#7c6a5c", whiteSpace: "nowrap" }}>{statusText}</span>
        <div style={{ flex: 1, height: 4, borderRadius: 4, background: "rgba(138,158,136,.2)", overflow: "hidden", maxWidth: 360 }}>
          <div style={{ height: "100%", width: `${complete ? Math.max(progress, settling ? 8 : 0) : 0}%`, background: "linear-gradient(90deg,#9fb09c,#7c9a78)", borderRadius: 4, transition: "width .4s ease" }} />
        </div>
        <span style={{ fontFamily: MONO, fontSize: 11.5, color: "#9c8878", marginLeft: "auto", whiteSpace: "nowrap" }}>{total > 0 ? `${total} record${total === 1 ? "" : "s"}` : ""}</span>
      </div>
    </div>
  );
};
