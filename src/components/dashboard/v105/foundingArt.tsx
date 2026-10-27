/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE EGG, THE NEST AND THE HATCH (Dashboard v105) — the ref's inline SVG, ported as drawn
 * (design-refs/dashboard-v105/founding-flow-v104.html): the egg with its spots, the nest's two bands and twigs, the
 * zigzag crack, and the egg cut into two halves by the `cb`/`ct` clip paths. All `aria-hidden`: the label beside each
 * drawing says what it is.
 *
 * ⚠️ THE CLIP-PATH IDS ARE PER INSTANCE (`useId`). The card and the How it works slides can both draw a cracked egg, and
 *    `url(#cb)` resolves to the FIRST element with that id in the document — a second copy would clip by the first's.
 */
import React, { useId } from "react";

/** The tier heads: placeholder crops of existing art until the illustrator draws the tiers (v93's files). */
export const TIER_HEAD = [
  "/images/founding/tiers/fledgling-head.png",
  "/images/founding/tiers/archivist-head.png",
  "/images/founding/tiers/scout-head.png",
  "/images/founding/tiers/mentor-head.png",
  "/images/founding/tiers/queryhawk-head.png",
] as const;
/** The head for a card tier (1–5), or null for the egg (0). */
export const headFor = (tier: number): string | null => (tier >= 1 && tier <= 5 ? TIER_HEAD[tier - 1] : null);

export const QUERYHAWK_MARK = "/images/app/queryhawk-mark.png";

const EGG_FILL = <ellipse cx="60" cy="44" rx="21" ry="27" fill="#dfe8ec" stroke="#1c130f" strokeWidth="2.2" />;
const SPOTS = (
  <g fill="#8a4a3c">
    <ellipse cx="54" cy="40" rx="3.2" ry="2.4" /><ellipse cx="66" cy="33" rx="2.2" ry="1.7" /><ellipse cx="68" cy="50" rx="3.6" ry="2.6" />
    <ellipse cx="52" cy="56" rx="2" ry="1.6" /><ellipse cx="61" cy="62" rx="2.6" ry="1.8" /><circle cx="72" cy="40" r="1.3" /><circle cx="48" cy="47" r="1.2" />
  </g>
);
const NEST = (
  <>
    <path d="M14 58c6 22 26 32 46 32s40-10 46-32" fill="#9a6a3c" stroke="#1c130f" strokeWidth="2.2" />
    <path d="M12 57c10 7 30 11 48 11s38-4 48-11" fill="#b9864f" stroke="#1c130f" strokeWidth="2.2" />
    <g fill="none" stroke="#1c130f" strokeWidth="1.4" strokeLinecap="round" opacity=".75">
      <path d="M20 66c10 6 22 8 34 7" /><path d="M30 76c10 4 22 5 36 2" /><path d="M62 72c12 0 24-3 34-8" /><path d="M40 84c10 2 22 2 32-1" />
      <path d="M8 54l10 4" /><path d="M102 58l12-5" /><path d="M16 61l-6 6" /><path d="M106 62l7 5" />
    </g>
  </>
);
const CRACK = "39,42 45,36 51,44 57,36 63,44 69,36 75,44 81,40";

/** The whole egg in its nest (idle at tier 0, the ranks strip, the slides). */
export const EggNest: React.FC<{ className?: string }> = ({ className = "d105-nest" }) => (
  <svg className={className} viewBox="0 0 120 100" aria-hidden="true" data-d105="egg">
    <g className="d105-egg">
      {EGG_FILL}
      <path d="M47 30c3-4 7-6 11-6" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".8" />
      {SPOTS}
    </g>
    {NEST}
  </svg>
);

/**
 * The cracked egg, in halves, with the bird behind them and the nest in front: the sent state (the crack draws on and
 * the halves wobble), idle HATCHING (drawn, wobbling) and the hatch (the halves fly and sink, the bird rises, the
 * starburst turns). Which of those plays is the parent's class.
 */
export const HatchScene: React.FC<{ bird: string | null }> = ({ bird }) => {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const cb = `d105cb${id}`, ct = `d105ct${id}`;
  return (
    <div className="d105-scene" aria-hidden="true" data-d105="scene">
      <span className="d105-sb" data-d105="burst" />
      <svg className="d105-sbot" viewBox="0 0 120 100">
        <defs>
          <clipPath id={cb}><polygon points="0,100 0,40 39,42 45,36 51,44 57,36 63,44 69,36 75,44 81,40 120,40 120,100" /></clipPath>
          <clipPath id={ct}><polygon points="0,0 120,0 120,40 81,40 75,44 69,36 63,44 57,36 51,44 45,36 39,42 0,40" /></clipPath>
        </defs>
        <g clipPath={`url(#${cb})`}>{EGG_FILL}{SPOTS}</g>
        <polyline className="d105-zz" data-d105="crack" points={CRACK} fill="none" stroke="#1c130f" strokeWidth="2" strokeLinejoin="round" />
      </svg>
      {bird && <img className="d105-sfl" src={bird} alt="" draggable={false} data-d105="bird" />}
      <svg className="d105-stop" viewBox="0 0 120 100">
        <g clipPath={`url(#${ct})`}>{EGG_FILL}{SPOTS}</g>
        <polyline points={CRACK} fill="none" stroke="#1c130f" strokeWidth="2" strokeLinejoin="round" />
      </svg>
      <svg className="d105-snest" viewBox="0 0 120 100">{NEST}</svg>
    </div>
  );
};

/* ── the three feedback icons (the ref's, stroked in ink) ── */
export const ICONS: Record<"like" | "dont" | "idea", React.ReactNode> = {
  like: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 11v9H4v-9zM7 11l4-8c1.4 0 2.3 1.1 2 2.5L12.3 9H18a2 2 0 0 1 2 2.3l-1.2 6.6A2.5 2.5 0 0 1 16.3 20H7" /></svg>,
  dont: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 13V4h3v9zM17 13l-4 8c-1.4 0-2.3-1.1-2-2.5l.7-3.5H6a2 2 0 0 1-2-2.3l1.2-6.6A2.5 2.5 0 0 1 7.7 4H17" /></svg>,
  idea: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V16h5.2v-.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z" /></svg>,
};
export const INFO_ICON = <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5h.01" /></svg>;
export const GIFT_ICON = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3.5" y="9" width="17" height="11.5" rx="1.5" /><rect x="2.5" y="6.5" width="19" height="3.5" rx="1" /><path d="M12 6.5v14" />
    <path d="M12 6.5C10.5 3.5 7 3 7 5s3.5 1.5 5 1.5zM12 6.5c1.5-3 5-3.5 5-1.5s-3.5 1.5-5 1.5z" />
  </svg>
);
