/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Reusable sheen-wave border — a soft sage highlight that travels around a calm sage edge. A masked
 * gradient on the border only (mask-composite: exclude over a padded ::before), animated by shifting
 * background-position. Calm and premium — NOT a rotating "loading" ring. Reduced-motion → static edge.
 *
 * Used by the all-sorted screen (Phase 7) and the import loader's crystallised cards (Phase 8). Self-
 * injecting CSS so it works inside any shell (the loader isn't inside ReviewShell).
 */
import React from "react";

export const SHEEN_WAVE_CSS = `
.sa-sheen-wave{ position:relative; }
.sa-sheen-wave::before{
  content:""; position:absolute; inset:0; border-radius:inherit; padding:var(--sheen-w,1.5px); pointer-events:none; z-index:1;
  background:
    linear-gradient(110deg, transparent 28%, rgba(138,158,136,.95) 50%, transparent 72%),
    linear-gradient(#c2d0bd,#c2d0bd);
  background-size:220% 100%, 100% 100%; background-repeat:no-repeat;
  -webkit-mask:linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite:xor;
          mask:linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);  mask-composite:exclude;
  animation:saSheenWave 3.8s linear infinite;
}
@keyframes saSheenWave{ 0%{ background-position:170% 0, 0 0 } 100%{ background-position:-170% 0, 0 0 } }
@media(prefers-reduced-motion:reduce){ .sa-sheen-wave::before{ animation:none; background:linear-gradient(#c2d0bd,#c2d0bd); } }
`;

/** Wraps children with the travelling sage sheen-wave border. `radius` sets the corner radius (the
 *  masked border follows it); `borderWidth` the band thickness. Self-injects its CSS once per mount. */
export const SheenWave: React.FC<{ radius?: number; borderWidth?: number; style?: React.CSSProperties; className?: string; children: React.ReactNode }> =
  ({ radius = 18, borderWidth = 1.5, style, className, children }) => (
    <div className={`sa-sheen-wave${className ? ` ${className}` : ""}`} style={{ borderRadius: radius, ["--sheen-w" as string]: `${borderWidth}px`, ...style }}>
      <style>{SHEEN_WAVE_CSS}</style>
      {children}
    </div>
  );
