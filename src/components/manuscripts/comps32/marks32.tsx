/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Comparable titles v32: the ref's icons (design-refs/comps-v32/comparable-titles-v32.html, `I`), drawn on a 24 grid
 * with a 1.8 stroke. Book, film and TV are an icon, never a colour.
 */
import React from "react";
import type { CompKind } from "../../../lib/compsLibrary";

const P: Record<string, React.ReactNode> = {
  book: <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />,
  tv: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="m8 3 4 4 4-4" /></>,
  film: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></>,
  open: <path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5zM12 6.5v13" />,
  pen: <path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" />,
};

export const Ic32: React.FC<{ n: keyof typeof P | CompKind; size?: number }> = ({ n, size }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
    width={size} height={size} data-icon={n}>{P[n]}</svg>
);

export const Find32 = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true"><circle cx="7" cy="7" r="4.6" /><path d="m10.6 10.6 3.2 3.2" /></svg>
);

/** The podium card's postmark: the percentage in a navy double ring, outer solid, inner dashed (the ref's `.pmark`). */
export const Postmark32: React.FC<{ pct: number }> = ({ pct }) => (
  <span className="cp32-pmark" aria-hidden="true" data-cp="postmark">
    <svg viewBox="0 0 96 96">
      <circle cx="48" cy="48" r="45" fill="#fff" stroke="currentColor" strokeWidth="2.2" />
      <circle cx="48" cy="48" r="38.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeDasharray="3 3.4" />
      <text x="48" y="58" textAnchor="middle" fontSize="31">{pct}%</text>
    </svg>
  </span>
);
