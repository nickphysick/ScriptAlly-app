/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v62 — the page's small line marks (the ref's, 24 × 24, stroked in currentColor). Package icons
 * stay the app's own (`v26/icons` Pic). Statuses are never drawn here: StatusDot draws every one.
 */
import React from "react";

const D = {
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></>,
  book: <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />,
  page: <path d="M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6" />,
  clip: <path d="M20 11.5 12 19.5a5 5 0 0 1-7-7l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7L9.8 17.2a1.7 1.7 0 0 1-2.4-2.4L15 7.2" />,
  check: <path d="m5 12 5 5 9-10" />,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  copy: <><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h9" /></>,
  open: <path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5zM12 6.5v13" />,
  arrow: <path d="M3 12h16M14 6l6 6-6 6" />,
  loop: <path d="M19.5 12a7.5 7.5 0 1 1-2.4-5.5M19.5 3.8V8h-4.2" />,
} as const;
export type K62Mark = keyof typeof D;

export const M62: React.FC<{ k: K62Mark; className?: string }> = ({ k, className }) => (
  <svg viewBox="0 0 24 24" className={`k62-svg${className ? ` ${className}` : ""}`} fill="none" stroke="currentColor" strokeWidth={1.8}
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{D[k]}</svg>
);
