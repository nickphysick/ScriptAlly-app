/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v62 — the page's small line marks (the ref's, 24 × 24, stroked in currentColor). Package icons
 * stay the app's own (`v26/icons` Pic). Statuses are never drawn here: StatusDot draws every one.
 */
import React from "react";

const D = {
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
