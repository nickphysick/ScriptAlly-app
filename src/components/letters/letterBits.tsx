/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query letters v2 — the small shared pieces of the letter desk: the day format, the file-only test and the line icons
 * (the ref's own set, design-refs/query-letters-v2). `fmtDay` moved here from v1's LetterCard, which this pack
 * deleted; its behaviour is unchanged. (v2's `isFileOnly` went with the file box in v2.1: any letter with no text
 * now shows the no-words sheet.)
 */
import React from "react";
import { dayMonth, formatDate } from "../../lib/dates";

export const fmtDay = (iso: string | undefined): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.getFullYear() === new Date().getFullYear() ? dayMonth(d) : formatDate(d, { day: "numeric", month: "short", year: "numeric" });
};

export const Ic: React.FC<{ d: React.ReactNode; w?: number }> = ({ d, w = 1.9 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);
export const COPY = <><rect width="14" height="14" x="8" y="8" rx="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></>;
export const CLIP = <><rect x="8" y="3" width="8" height="4" rx="1" /><path d="M16 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2" /></>;
export const PEN = <><path d="M12 20h9" /><path d="M16.38 3.62a1 1 0 0 1 3 3L7.37 18.64a2 2 0 0 1-.86.5l-2.87.84a.5.5 0 0 1-.62-.62l.84-2.87a2 2 0 0 1 .5-.86z" /></>;
export const LOCK = <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>;
export const ARROW = <><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></>;
export const BOOK = <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />;
export const FILM = <><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M7 3v18M3 7.5h4M3 12h18M3 16.5h4M17 3v18M17 7.5h4M17 16.5h4" /></>;
export const BOX = <><path d="M21 8 12 3 3 8v8l9 5 9-5z" /><path d="m3 8 9 5 9-5M12 13v8" /></>;
export const DOC = <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h4" /></>;
export const TICK = <path d="m5 12 5 5 9-10" />;
export const STAMP = <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5.5" strokeDasharray="2 2" /><path d="m9.5 12 1.8 1.8 3.4-3.6" strokeWidth={1.8} /></>;

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
