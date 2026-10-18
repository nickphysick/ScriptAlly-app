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

export interface ContactColumnWidths {
  /** the room the grid has: the row's content box */
  avail: number;
  /** the gap between two columns */
  gap: number;
  /** the Agent column's floor: the least it may be squeezed to before the contacts stack */
  agentFloor: number;
  /** the Date added cells' longest entry at 15px, and the heading (with its sort mark), which does not scale */
  date: number; dateHead: number;
  /** the longest website and email at 15px; the headings */
  web: number; webHead: number;
  email: number; emailHead: number;
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
  const side = (fs: number) => [date(fs), Math.max(w.web * k(fs), w.webHead), Math.max(w.email * k(fs), w.emailHead), w.replies, w.status];
  const sideCols = side(CONTACT_FS);
  const fixedSide = sideCols.reduce((a, b) => a + b, 0) + 5 * w.gap;
  if (w.avail - fixedSide >= w.agentFloor) {
    return { stacked: false, fs: CONTACT_FS, count: 6, cols: `minmax(0, 1fr) ${sideCols.map(px).join(" ")}` };
  }
  const stack = (fs: number) => [date(fs), Math.max(Math.max(w.web, w.email) * k(fs), w.bothHead), w.replies, w.status];
  let fs = CONTACT_FS - CONTACT_FS_STEP;
  for (; fs > CONTACT_FS_MIN; fs -= CONTACT_FS_STEP) {
    const fixed = stack(fs).reduce((a, b) => a + b, 0) + 4 * w.gap;
    if (w.avail - fixed >= w.agentFloor) break;
  }
  fs = Math.max(CONTACT_FS_MIN, fs);
  return { stacked: true, fs, count: 5, cols: `minmax(0, 1fr) ${stack(fs).map(px).join(" ")}` };
}
