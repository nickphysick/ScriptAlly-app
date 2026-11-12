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
 * ⚠️ THE SCORE AND THE COUNT ARE HOUSEKEEPING'S OWN (`listHealth` over `hkModel`), handed in — never recomputed here.
 */
import React from "react";
import { RING26, RING26_C, RING26_R, ringArc, ring26Colours } from "../../../lib/contactV26";
import { BRAND_RING } from "../../../lib/contactPrinciples2";
import "./contactV26.css";

export const ARCHIVIST26 = "/images/contact-list-archivist.webp";

export type HealthGround = "navy" | "light";
/** the ring's arc and track on each ground (navy is v26's own `ring26Colours`, drawn by no mounted surface today).
 *  principles v2 — the light ground is the brand pair at every score: navy arc, soft pink track (no green). */
export const healthColours = (pct: number, ground: HealthGround): { arc: string; track: string } =>
  (ground === "navy" ? ring26Colours(pct) : { ...BRAND_RING });

export const ContactHealth26: React.FC<{
  /** Housekeeping's score and gap count, or null while loading */
  health: { pct: number; gaps: number } | null;
  onOpenHealth: () => void;
  /** "Show me who →" (the classic block only) */
  onShowWho?: () => void;
  ground?: HealthGround;
  /** header v2 — the ring is the figure: the score in its centre, one "Fill the gaps" action */
  figure?: boolean;
}> = ({ health: h, onOpenHealth, onShowWho, ground = "navy", figure = false }) => {
  const c = healthColours(h?.pct ?? 0, ground);
  const arc = h ? ringArc(h.pct) : 0;
  const mid = RING26.box / 2;
  return (
    <div className="cl26-health" data-cl26="health" data-ground={ground} data-figure={figure ? "" : undefined} aria-hidden={h ? undefined : true}>
      <button type="button" className="cl26-ring" data-cl26="ring" data-pct={h?.pct ?? ""} disabled={!h}
        aria-label={h ? `List health ${h.pct}%. Open Housekeeping` : "List health"} onClick={onOpenHealth}
        style={{ width: RING26.px, height: RING26.px }}>
        <svg viewBox={`0 0 ${RING26.box} ${RING26.box}`} width={RING26.px} height={RING26.px} aria-hidden="true">
          <circle data-cl26="track" cx={mid} cy={mid} r={RING26_R} fill="none" style={{ stroke: c.track }} strokeWidth={RING26.stroke} />
          {h ? (
            <circle data-cl26="arc" cx={mid} cy={mid} r={RING26_R} fill="none" style={{ stroke: c.arc }} strokeWidth={RING26.stroke}
              strokeLinecap="round" strokeDasharray={`${arc} ${RING26_C}`} transform={`rotate(-90 ${mid} ${mid})`} />
          ) : null}
        </svg>
        {figure ? null : <img className="cl26-arch" data-cl26="archivist" src={ARCHIVIST26} alt="" width={100} height={89} draggable={false} />}
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
            {figure ? (
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
