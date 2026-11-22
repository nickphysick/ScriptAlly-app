/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v26 Part A — LIST HEALTH, lifted out of `ContactHeader26` unchanged (Contact list v27, Phase 1) so the
 * v27 open header can mount the same block: the ring with the archivist breaking out of it, the percentage pill
 * straddling its foot, "List health", "{n} details missing" / "Nothing missing", Open and "Show me who →".
 *
 * ⚠️ ONE BLOCK, TWO GROUNDS. `ground="navy"` is v26's panel (the ring in the on-navy tones, the pill ringed in navy);
 *    `ground="light"` is v27's open header on the page colour, which the ref draws in the SAME table's light tones
 *    (principles v2: the brand pair, `BRAND_RING`, at every score; the pill navy on white). The
 *    markup, the text and every `data-cl26` hook are identical on both.
 * Contact list header v2 (design-refs/contact-list-header-v2.html, frame 1) — `figure`: THE RING IS THE FIGURE. No
 *    archivist; the percentage in the ring's centre (Special Elite 28, ink), no pill at its foot; beside it "List health",
 *    the gaps line and ONE button, "Fill the gaps" (Housekeeping, `onOpenHealth`), none when nothing is missing. Open and
 *    "Show me who →" are not drawn. The ring's size, stroke and colours are as before. Without `figure` — the navy ground,
 *    v26's panel — the block renders exactly as it did (contactHeader27.test.tsx holds its markup).
 * Contact list QC layout v1 (design-refs/contact-list-qc-layout-v7/) — `fill`: the navy header's block. The archivist
 *    breaking out of the ring and the score on the cream pill at its foot (as v26), at the header's size (`size`: ring
 *    140, archivist 118 wide); beside it "List health", the gaps line and ONE button, "Fill the gaps", none at 0 gaps.
 *    On the navy the ring is the brand's pair on that ground: cream arc over the soft pink at 55% (`NAVY_RING`), at every
 *    score — v26's green, amber and red on navy are retired.
 * ⚠️ THE SCORE AND THE COUNT ARE HOUSEKEEPING'S OWN (`listHealth` over `hkModel`), handed in — never recomputed here.
 */
import React from "react";
import { RING26, RING26_C, RING26_R, ringArc } from "../../../lib/contactV26";
import { BRAND_RING } from "../../../lib/contactPrinciples2";
import "./contactV26.css";

export const ARCHIVIST26 = "/images/contact-list-archivist.webp";

export type HealthGround = "navy" | "light";
/** QC layout v1 — the ring on the navy: a cream arc over the soft pink at 55%, at every score */
export const NAVY_RING = { arc: "#f4eee5", track: "rgba(232, 189, 180, 0.55)" } as const;
/** the archivist's drawn width at the ring's default 124px (v26) */
export const ARCH26_W = 100;
/** the ring's arc and track on each ground. principles v2 — the light ground is the brand pair at every score: navy arc,
 *  soft pink track (no green). QC layout v1 — the navy ground is the same pair turned for the navy (`NAVY_RING`). */
export const healthColours = (_pct: number, ground: HealthGround): { arc: string; track: string } =>
  (ground === "navy" ? { ...NAVY_RING } : { ...BRAND_RING });

export const ContactHealth26: React.FC<{
  /** Housekeeping's score and gap count, or null while loading */
  health: { pct: number; gaps: number } | null;
  onOpenHealth: () => void;
  /** "Show me who →" (the classic block only) */
  onShowWho?: () => void;
  ground?: HealthGround;
  /** header v2 — the ring is the figure: the score in its centre, one "Fill the gaps" action */
  figure?: boolean;
  /** QC layout v1 — the archivist and the pill (as v26), with one "Fill the gaps" action (as `figure`) */
  fill?: boolean;
  /** the ring's size in px (v26's 124 by default) */
  size?: number;
  /** the archivist's width in px (v26's 100 by default) */
  arch?: number;
}> = ({ health: h, onOpenHealth, onShowWho, ground = "navy", figure = false, fill = false, size = RING26.px, arch = ARCH26_W }) => {
  const c = healthColours(h?.pct ?? 0, ground);
  const arc = h ? ringArc(h.pct) : 0;
  const mid = RING26.box / 2;
  const one = figure || fill;
  return (
    <div className="cl26-health" data-cl26="health" data-ground={ground} data-figure={figure ? "" : undefined} data-fill={fill ? "" : undefined} aria-hidden={h ? undefined : true}>
      <button type="button" className="cl26-ring" data-cl26="ring" data-pct={h?.pct ?? ""} disabled={!h}
        aria-label={h ? `List health ${h.pct}%. Open Housekeeping` : "List health"} onClick={onOpenHealth}
        style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${RING26.box} ${RING26.box}`} width={size} height={size} aria-hidden="true">
          <circle data-cl26="track" cx={mid} cy={mid} r={RING26_R} fill="none" style={{ stroke: c.track }} strokeWidth={RING26.stroke} />
          {h ? (
            <circle data-cl26="arc" cx={mid} cy={mid} r={RING26_R} fill="none" style={{ stroke: c.arc }} strokeWidth={RING26.stroke}
              strokeLinecap="round" strokeDasharray={`${arc} ${RING26_C}`} transform={`rotate(-90 ${mid} ${mid})`} />
          ) : null}
        </svg>
        {figure ? null : <img className="cl26-arch" data-cl26="archivist" src={ARCHIVIST26} alt="" width={arch} height={Math.round((arch * 89) / ARCH26_W)} draggable={false}
          style={arch === ARCH26_W ? undefined : { width: arch }} />}
        {!h ? null : figure ? <b className="cl26-fig" data-cl26="pct">{h.pct}%</b>
          : <span className="cl26-pct" data-cl26="pct" style={{ "--arc": c.arc } as React.CSSProperties}>{h.pct}%</span>}
      </button>
      <div className="cl26-hw">
        <b className="cl26-ht">List health</b>
        {h ? (
          <>
            <span className="cl26-hm" data-cl26="missing">
              {h.gaps > 0 ? <><em>{h.gaps}</em> {h.gaps === 1 ? "detail" : "details"} missing</> : "Nothing missing"}
            </span>
            {one ? (
              h.gaps > 0 ? <span className="cl26-hb"><button type="button" className="cl26-open cl26-fill" data-cl26="fill" onClick={onOpenHealth}>Fill the gaps</button></span> : null
            ) : (
              <span className="cl26-hb">
                <button type="button" className="cl26-open" data-cl26="open" onClick={onOpenHealth}>Open</button>
                {h.gaps > 0 ? <button type="button" className="cl26-who" data-cl26="who" onClick={onShowWho}>Show me who →</button> : null}
              </span>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
};
