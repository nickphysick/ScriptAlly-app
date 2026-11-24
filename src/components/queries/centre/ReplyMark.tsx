/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Controls: entry v1 · follow-up 4 — THE MARK OF THE AGENT'S REPLY THAT MOVES NOTHING: the ref's speech bubble
 * (design-refs/controls-entry-v1/controls-v2.html `HOLDG`), drawn as its own small mark.
 *
 * ⚠️ NOT A STATUS, SO NOT StatusDot. StatusDot is the only thing that draws a query's status (CLAUDE.md); this entry
 * has none, by construction, and borrowing a status's ring for it is the decorative borrowing the holding-reply pack
 * did and this follow-up retires. Every kind (a chaser, a holding reply, a note), the old holding replies included.
 * Stroked in `currentColor`, so the note's own `.qc152-g0` colour (#6f655c, the ref's) inks it.
 */
import React from "react";

export const ReplyMark: React.FC<{ size?: number; className?: string }> = ({ size = 18, className }) => (
  <svg className={className ? `sa-reply-mark ${className}` : "sa-reply-mark"} data-mark="reply" viewBox="0 0 24 24" width={size} height={size}
    fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">
    <path d="M5 6.5h14v9.5h-8l-3.5 3v-3H5z" strokeLinejoin="round" fill="none" />
    <path d="M9 11.25h.01M12 11.25h.01M15 11.25h.01" strokeLinecap="round" strokeWidth={2.2} />
  </svg>
);
