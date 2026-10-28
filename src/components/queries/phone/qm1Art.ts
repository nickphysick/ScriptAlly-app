/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Queries on a phone v1 — THE ART SLOTS. Every picture on the phone Query Centre comes from this table, so swapping in
 * a commissioned piece is one line here. Two slots are placeholders until the illustrator delivers:
 *
 *  - `agentReplied` ("hawk opening a letter"): the + sheet's first tile. Until then, the flying hawk.
 *  - `cheer` ("hawk cheering with a manuscript"): the celebration. Until then, the hawk at the desk.
 *
 * ⚠️ NO SCREEN SHOWS ONE SOURCE TWICE (QM1 L11). The app holds the flying hawk as two files (`qc-list-flight.png` and
 *    `courier-cutout.png`), so the Your-move card and the + sheet's two tiles never share a source: the card and the
 *    first tile use one, the second tile the other, and the page under the sheet is inert while the sheet is open.
 */
import { COURIER_CUTOUT, QC_INKWELL, QC_LIST_FLIGHT, QC_PLATE_FIGURE } from "../centre/qcArt";
import { QC_DESK_HAWK } from "../centre/QcHeader138";

export interface Qm1Art { src: string; w: number; h: number }
const art = (src: string, v: string | number, w: number, h: number): Qm1Art => ({ src: `${src}?v=${v}`, w, h });

export const QM1_ART = {
  /** the page header: the hawk at its desk */
  desk: art(QC_DESK_HAWK.src, QC_DESK_HAWK.version, QC_DESK_HAWK.w, QC_DESK_HAWK.h),
  /** the Your-move card: the flying hawk */
  fly: art(QC_LIST_FLIGHT.src, QC_LIST_FLIGHT.version, QC_LIST_FLIGHT.width, QC_LIST_FLIGHT.height),
  /** the + sheet's "I sent a query": the flying hawk, the second file */
  flyTwo: art(COURIER_CUTOUT.src, COURIER_CUTOUT.version, COURIER_CUTOUT.width, COURIER_CUTOUT.height),
  /** Waiting's tip and Coming up's past-due card: the hourglass hawk */
  glass: art("/images/query-centre/waiting-hourglass.webp", "770b5827", 108, 111),
  /** Coming up's header: the hawk with the map */
  map: art(QC_PLATE_FIGURE.src, QC_PLATE_FIGURE.version, QC_PLATE_FIGURE.width, QC_PLATE_FIGURE.height),
  /** the query's next step: quill and ink */
  quill: art(QC_INKWELL.src, QC_INKWELL.version, QC_INKWELL.width, QC_INKWELL.height),
  /** ART SLOT — "hawk opening a letter" (placeholder: the flying hawk) */
  agentReplied: art(QC_LIST_FLIGHT.src, QC_LIST_FLIGHT.version, QC_LIST_FLIGHT.width, QC_LIST_FLIGHT.height),
  /** ART SLOT — "hawk cheering with a manuscript" (placeholder: the hawk at the desk) */
  cheer: art(QC_DESK_HAWK.src, QC_DESK_HAWK.version, QC_DESK_HAWK.w, QC_DESK_HAWK.h),
} as const;
