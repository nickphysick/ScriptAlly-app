/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v19 §C, v19.1 §D — THE COLUMNS' WIDTHS. Pure: the row measures each column's longest entry (and its
 * heading), this decides the grid.
 *
 *   · Agent (v19.1 §D — it no longer takes the slack, which ballooned it on a sparse list): the widest of the disc + gap
 *     + widest name, the disc + gap + widest agency · location line, and its heading; then + 8; floor 230, ceiling 330;
 *   · every other column is as wide as its longest entry or its heading, whichever is wider — so a Website or Email
 *     column with nothing in it keeps its heading's width (and the "+ Add" link's, which shows on hover);
 *   · the room left over is shared equally between the gaps, up to 56px a gap; anything left after that goes to the
 *     right of the Email column (the Website / Email pair grows), never to Agent;
 *   · Website and Email sit side by side when they fit at the body size (15px) beside Agent at its width and the
 *     least gaps; otherwise they stack in one "Website and email" column, and the contact type (date, website, email)
 *     steps down in 0.5px steps from 14.5 until the row fits, never below 12px. They are never shortened. Should the
 *     row still not fit at 12px, Agent gives way (its track becomes flexible) rather than anything overflowing.
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
  /** the least gap between two columns (the spare room widens it, up to CONTACT_GAP_MAX) */
  gap: number;
  /** v19.1 §D — the widest of disc + gap + name and disc + gap + agency · location line, and the Agent heading */
  agent: number; agentHead: number;
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

/** v19.1 §D — the Agent column's air, floor and ceiling, and the widest a gap grows to */
export const CONTACT_AGENT_AIR = 8;
export const CONTACT_AGENT_MIN = 230;
export const CONTACT_AGENT_MAX = 330;
export const CONTACT_GAP_MAX = 56;
/** the least gap between two columns (as v19's 20) */
export const CONTACT_GAP = 20;

/** `gap` is the column gap the grid uses (px) — the headings and the rows read the same one */
export interface ContactColumnFit { stacked: boolean; fs: number; cols: string; count: 5 | 6; gap: number }

/** v19.1 §D — the Agent column's width, by the rule above */
export const agentColumn = (agent: number, head: number): number =>
  Math.min(CONTACT_AGENT_MAX, Math.max(CONTACT_AGENT_MIN, Math.max(agent, head) + CONTACT_AGENT_AIR));

export function fitContactColumns(w: ContactColumnWidths): ContactColumnFit {
  const k = (fs: number) => fs / CONTACT_FS;
  const date = (fs: number) => Math.max(w.date * k(fs), w.dateHead);
  /* a value is its icon plus its text at the size; a missing one is its "+ Add" link, which does not scale */
  const val = (t: number, add: number | undefined, fs: number) => Math.max(t > 0 ? t * k(fs) + CONTACT_ICON : 0, add ?? 0);
  const web = (fs: number) => val(w.web, w.webAdd, fs);
  const email = (fs: number) => val(w.email, w.emailAdd, fs);
  const side = (fs: number) => [date(fs), Math.max(web(fs), w.webHead), Math.max(email(fs), w.emailHead), w.replies, w.status];
  const stack = (fs: number) => [date(fs), Math.max(web(fs), email(fs), w.bothHead), w.replies, w.status];
  const A = agentColumn(w.agent, w.agentHead);
  const sum = (xs: number[]) => xs.reduce((x, y) => x + y, 0);
  const round = (xs: number[]) => xs.map((n) => Math.ceil(n + 0.5));
  /* the columns decided: share what is left between the gaps (≤ 56 each), the rest to the right of the Email column
     (`grow` is that track's index in `rest`) */
  const lay = (rest: number[], grow: number, stacked: boolean, fs: number): ContactColumnFit => {
    const tracks = [A, ...round(rest)].map(Math.ceil);
    const n = tracks.length - 1;
    const spare = Math.max(0, w.avail - sum(tracks) - n * w.gap);
    const gap = Math.min(CONTACT_GAP_MAX, w.gap + spare / n);
    const left = Math.floor(Math.max(0, w.avail - sum(tracks) - n * gap));
    tracks[grow + 1] += left;
    return { stacked, fs, count: stacked ? 5 : 6, gap: Math.floor(gap * 100) / 100, cols: tracks.map((t) => `${t}px`).join(" ") };
  };
  const sideCols = side(CONTACT_FS);
  if (A + sum(round(sideCols)) + 5 * w.gap <= w.avail) return lay(sideCols, 2, false, CONTACT_FS);
  let fs = CONTACT_FS - CONTACT_FS_STEP;
  for (; fs > CONTACT_FS_MIN; fs -= CONTACT_FS_STEP) {
    if (A + sum(round(stack(fs))) + 4 * w.gap <= w.avail) break;
  }
  fs = Math.max(CONTACT_FS_MIN, fs);
  const rest = stack(fs);
  if (A + sum(round(rest)) + 4 * w.gap <= w.avail) return lay(rest, 1, true, fs);
  /* nothing fits even at 12px: Agent gives way */
  return { stacked: true, fs, count: 5, gap: w.gap, cols: `minmax(0, 1fr) ${round(rest).map((t) => `${t}px`).join(" ")}` };
}
