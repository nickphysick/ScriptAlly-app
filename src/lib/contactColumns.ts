/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v19 §C — THE COLUMNS' WIDTHS. Pure: the row measures each column's longest entry (and its heading),
 * this decides the grid.
 *
 *   · every column is as wide as its longest entry or its heading, whichever is wider; Agent takes the slack;
 *   · Website and Email sit side by side when they fit at the body size (15px) with Agent still holding its floor;
 *   · otherwise they stack in one "Website and email" column, and the contact type (date, website, email) steps
 *     down in 0.5px steps from 14.5 until the row fits, never below 12px. They are never shortened.
 *
 * Widths of the scaling cells are passed at 15px (the row normalises what it read), so one measurement serves
 * every step: a run of text scales linearly with its font size.
 */

export const CONTACT_FS = 15;
export const CONTACT_FS_MIN = 12;
export const CONTACT_FS_STEP = 0.5;
/** v19.1 §B — the room a website or email's icon takes before its text: the 15px icon, its 6px gap and 1px of air.
 *  It does not scale with the type. */
export const CONTACT_ICON = 22;

export interface ContactColumnWidths {
  /** the room the grid has: the row's content box */
  avail: number;
  /** the gap between two columns */
  gap: number;
  /** the Agent column's floor: the least it may be squeezed to before the contacts stack */
  agentFloor: number;
  /** the Date added cells' longest entry at 15px, and the heading (with its sort mark), which does not scale */
  date: number; dateHead: number;
  /** the longest website and email TEXT at 15px (the ↗ included; 0 when there is none) — the icon is added here; the
   *  headings */
  web: number; webHead: number;
  email: number; emailHead: number;
  /** v19.1 §A — the widest "+ Add website" / "+ Add email" (fixed 14px, so unscaled; 0 when none is missing) */
  webAdd?: number; emailAdd?: number;
  /** the stacked column's heading ("Website and email") */
  bothHead: number;
  /** Replies and Query status: as on dev, they do not scale */
  replies: number; status: number;
}

export interface ContactColumnFit { stacked: boolean; fs: number; cols: string; count: 5 | 6 }

const px = (n: number) => `${Math.ceil(n + 0.5)}px`;

export function fitContactColumns(w: ContactColumnWidths): ContactColumnFit {
  const k = (fs: number) => fs / CONTACT_FS;
  const date = (fs: number) => Math.max(w.date * k(fs), w.dateHead);
  /* a value is its icon plus its text at the size; a missing one is its "+ Add" link, which does not scale */
  const val = (t: number, add: number | undefined, fs: number) => Math.max(t > 0 ? t * k(fs) + CONTACT_ICON : 0, add ?? 0);
  const web = (fs: number) => val(w.web, w.webAdd, fs);
  const email = (fs: number) => val(w.email, w.emailAdd, fs);
  const side = (fs: number) => [date(fs), Math.max(web(fs), w.webHead), Math.max(email(fs), w.emailHead), w.replies, w.status];
  const sideCols = side(CONTACT_FS);
  const fixedSide = sideCols.reduce((a, b) => a + b, 0) + 5 * w.gap;
  if (w.avail - fixedSide >= w.agentFloor) {
    return { stacked: false, fs: CONTACT_FS, count: 6, cols: `minmax(0, 1fr) ${sideCols.map(px).join(" ")}` };
  }
  const stack = (fs: number) => [date(fs), Math.max(web(fs), email(fs), w.bothHead), w.replies, w.status];
  let fs = CONTACT_FS - CONTACT_FS_STEP;
  for (; fs > CONTACT_FS_MIN; fs -= CONTACT_FS_STEP) {
    const fixed = stack(fs).reduce((a, b) => a + b, 0) + 4 * w.gap;
    if (w.avail - fixed >= w.agentFloor) break;
  }
  fs = Math.max(CONTACT_FS_MIN, fs);
  return { stacked: true, fs, count: 5, cols: `minmax(0, 1fr) ${stack(fs).map(px).join(" ")}` };
}
