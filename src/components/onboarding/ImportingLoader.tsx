/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Post-import loading screen — shown the instant "Import and get started" is pressed, held for a
 * deliberate minimum so the moment never feels empty. Purely presentational: it does not commit
 * anything or know real progress. The host (BranchB) runs the commit + 5s floor and flips `complete`
 * when it's safe to route; the cycling status lines are decorative reassurance, not real stages.
 * Visual source of truth: scriptally-importing-loader.html.
 */
import React, { useEffect, useRef, useState } from "react";
import { OnbNav } from "./SmartImportReview";

const SERIF = "'Playfair Display',serif";
const MONO = "'JetBrains Mono',monospace";

// Decorative reassurance only — NOT wired to real commit stages, no fake percentage.
const MESSAGES = [
  "Filing your agents…",
  "Lining up your queries…",
  "Building your pipeline…",
  "Sorting your submissions…",
  "Tidying the desk…",
  "Almost ready…",
];

const ringStyle: React.CSSProperties = {
  position: "absolute", top: "50%", left: "50%", width: 104, height: 104, margin: "-52px 0 0 -52px",
  borderRadius: "50%", border: "1.5px solid rgba(138,158,136,.5)",
};

export interface ImportingLoaderProps {
  /** Flip to the completion state (rings stop, disc warms to sage, book → tick), then proceed. */
  complete: boolean;
  /** Called once, ~900ms after `complete` turns true — the host routes to the dashboard. */
  onProceed: () => void;
  /** User's display name — the slim nav shows the first initial as avatar (same as the review nav). */
  userName?: string;
}

export const ImportingLoader: React.FC<ImportingLoaderProps> = ({ complete, onProceed, userName }) => {
  const userInitial = userName ? userName[0].toUpperCase() : "?";
  const [msgIndex, setMsgIndex] = useState(0);

  // Cycle the decorative status lines while loading; stop the moment we're complete.
  useEffect(() => {
    if (complete) return;
    const id = setInterval(() => setMsgIndex((i) => (i + 1) % MESSAGES.length), 950);
    return () => clearInterval(id);
  }, [complete]);

  // On completion, hold the "You're all set" beat, then hand back to the host to route.
  const proceedRef = useRef(onProceed);
  proceedRef.current = onProceed;
  useEffect(() => {
    if (!complete) return;
    const id = setTimeout(() => proceedRef.current(), 900);
    return () => clearTimeout(id);
  }, [complete]);

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(circle at 50% 38%,rgba(255,255,255,.55),transparent 55%), repeating-linear-gradient(94deg,rgba(150,120,90,.022) 0 2px,transparent 2px 5px), #ece4d8", fontFamily: "Inter, sans-serif", color: "#2a2521" }}>
      <style>{`
        @keyframes saLdrBreathe{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
        @keyframes saLdrPing{0%{transform:scale(.85);opacity:.55}80%{opacity:0}100%{transform:scale(1.95);opacity:0}}
        @keyframes saLdrSlide{0%{left:-40%}100%{left:100%}}
        @keyframes saLdrSettle{from{transform:scale(1.06)}to{transform:scale(1)}}
        @keyframes saLdrFade{from{opacity:0}to{opacity:1}}
        .sa-ldr-disc{animation:saLdrBreathe 2.6s ease-in-out infinite;}
        .sa-ldr-stage.done .sa-ldr-disc{animation:saLdrSettle .6s ease forwards;}
        .sa-ldr-ring{animation:saLdrPing 2.4s ease-out infinite;}
        .sa-ldr-ring.r2{animation-delay:1.2s;}
        .sa-ldr-slider{animation:saLdrSlide 1.35s ease-in-out infinite;}
        @media(prefers-reduced-motion:reduce){
          .sa-ldr-disc,.sa-ldr-ring,.sa-ldr-slider{animation:none!important;}
          .sa-ldr-ring{opacity:.25;}
          .sa-ldr-slider{display:none;}
        }
      `}</style>

      <OnbNav userInitial={userInitial} />

      <main style={{ minHeight: "calc(100vh - 56px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className={`sa-ldr-stage${complete ? " done" : ""}`} style={{ padding: "40px 30px", textAlign: "center" }}>
          {/* Emblem — parchment disc + breathing book, two sage rings pulsing outward */}
          <div style={{ position: "relative", width: 200, height: 200, display: "grid", placeItems: "center", margin: "0 auto 30px" }}>
            {!complete && (
              <>
                <span className="sa-ldr-ring" style={ringStyle} />
                <span className="sa-ldr-ring r2" style={ringStyle} />
              </>
            )}
            <div className="sa-ldr-disc" style={{ width: 104, height: 104, borderRadius: "50%", background: complete ? "#e6ebe3" : "#fdfaf5", display: "grid", placeItems: "center", color: complete ? "#5a6e58" : "#7c3a2a", position: "relative", zIndex: 2, boxShadow: "0 18px 38px -18px rgba(60,40,28,.45),inset 0 1px 0 rgba(255,255,255,.7)", transition: "background .5s, color .5s" }}>
              {complete ? (
                <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4 10-11"/></svg>
              ) : (
                <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 6.5C10.5 5 8 4.5 5 5v13c3-.5 5.5 0 7 1.5"/><path d="M12 6.5C13.5 5 16 4.5 19 5v13c-3-.5-5.5 0-7 1.5"/><path d="M12 6.5v14"/></svg>
              )}
            </div>
          </div>

          <h1 style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 25, color: "#33302b", margin: "0 0 12px" }}>
            {complete ? "You're all set" : "Setting up your dashboard"}
          </h1>
          <p key={complete ? "done" : msgIndex} style={{ fontFamily: MONO, fontSize: 13, letterSpacing: ".02em", color: "#8a8178", margin: "0 auto 26px", minHeight: 18, animation: "saLdrFade .3s ease" }}>
            {complete ? "Opening your dashboard…" : MESSAGES[msgIndex]}
          </p>
          <div style={{ width: 240, height: 5, borderRadius: 5, background: complete ? "linear-gradient(90deg,#9fb09c,#8a9e88)" : "rgba(138,158,136,.18)", overflow: "hidden", position: "relative", margin: "0 auto" }}>
            {!complete && <span className="sa-ldr-slider" style={{ position: "absolute", top: 0, left: "-40%", height: "100%", width: "38%", borderRadius: 5, background: "linear-gradient(90deg,transparent,#9fb09c,transparent)" }} />}
          </div>
        </div>
      </main>
    </div>
  );
};
