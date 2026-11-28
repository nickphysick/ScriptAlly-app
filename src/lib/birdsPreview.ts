/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone Birds-eye first look v1 §B — TODAY'S PREVIEW: THE NEXT THREE WEEKS (ref `smartPreview()`, `S.pv` "win").
 *
 * Which rows, and in what order: Birds-eye's own group order (`bwGroups`, so Needs action with gone quiet last, then
 * Within their window, then No reply date yet), keeping only queries with a reply date or an event between a fortnight
 * ago and three weeks ahead, the first four. The preview and the full view always agree on what is most urgent.
 * (The ref sorts its own way, needing action first and then by date; Nick's ruling is Birds-eye's order.)
 *
 * Each row's mini bar is the full view's own pieces (`rowSegs`; a query with no reply date its Queried bar to today, as
 * `ndRow` draws it), in its stage's colour, clipped to the window.
 */
import { bwGroups, isNoDate, rowSegs, type BwRow } from "./birdsWorld";

/** the window, in days from today, and the rows it shows */
export const PV_FROM = -14, PV_TO = 21, PV_ROWS = 4;
/** the mini bar's width (ref `.sv-b`) */
export const PV_W = 180;

export const inPreviewWindow = (r: BwRow): boolean =>
  (r.due != null && r.due >= PV_FROM && r.due <= PV_TO) || r.ev.some((e) => e.d >= PV_FROM && e.d <= PV_TO);

export interface Preview { rows: BwRow[]; open: number; more: number }
/** the preview's rows, and how many more open queries Birds-eye holds */
export function previewPick(all: readonly BwRow[], quietDays: number): Preview {
  const order = bwGroups(all, "all", quietDays).filter((g) => g.t !== "Closed").flatMap((g) => g.rows);
  const rows = order.filter(inPreviewWindow).slice(0, PV_ROWS);
  return { rows, open: order.length, more: order.length - rows.length };
}

/** a day's x on the mini bar (ref `x(d)`), held to the bar */
export const pvX = (d: number): number => Math.max(0, Math.min(PV_W, ((d - PV_FROM) / (PV_TO - PV_FROM)) * PV_W));

export interface PvPiece { l: number; w: number; st: string }
/** a row's pieces on the mini bar: the full view's, in the window */
export function pvPieces(r: BwRow, quietDays: number): PvPiece[] {
  const segs = isNoDate(r) ? [{ a: r.ev[0].d, b: 0, st: "Queried" }] : rowSegs(r, quietDays).map((s) => ({ a: s.a, b: s.b, st: s.st }));
  return segs.filter((s) => s.b >= PV_FROM && s.a <= PV_TO).map((s) => { const l = pvX(s.a); return { l, w: Math.max(3, pvX(s.b) - l), st: s.st }; });
}

/** the right-hand words: "your move", "9d past", or the reply date (`dm` formats a day from today) */
export function pvSay(r: BwRow, dm: (d: number) => string): string {
  if (r.you) return "your move";
  if (r.due != null && r.due < 0) return `${-r.due}d past`;
  return r.due != null ? dm(r.due) : "";
}
