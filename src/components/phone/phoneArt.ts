/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v2 — THE ONE ART TABLE (Part 1A; ref design-refs/phone-app-v2/README.md "Illustrations"). Every picture
 * on a phone screen comes from here. A slot is a real app image or `null`; a `null` slot renders the ref's dashed
 * placeholder circle (`PhoneArtSpot`) and is NEVER filled with another drawing — the illustrator's piece replaces the
 * null, one line here.
 *
 * ⚠️ NO SCREEN SHOWS ONE SOURCE TWICE (QM1 L11, now every phone screen). Two slots may point at one file only where no
 *    screen ever shows both; the locks sweep the rendered page for repeats, so a clash fails a lock rather than a
 *    review.
 *
 * The Queries on a phone v1 slots moved here unchanged; `queries/phone/qm1Art.ts` re-exports them as `QM1_ART`.
 */
import { COURIER_CUTOUT, QC_INKWELL, QC_LIST_FLIGHT, QC_PLATE_FIGURE } from "../queries/centre/qcArt";
import { QC_DESK_HAWK } from "../queries/centre/QcHeader138";

export interface PhoneArtSrc { src: string; w: number; h: number }
const art = (src: string, v: string | number, w: number, h: number): PhoneArtSrc => ({ src: `${src}?v=${v}`, w, h });

/** the Queries on a phone v1 slots, as they were */
export const QM1_SLOTS = {
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

/**
 * The phone app v2 slots. `null` = the ref draws a dashed placeholder there until the illustrator's piece arrives.
 * The keys are the ref's own where it names one (README "Illustrations").
 */
export const PHONE_ART = {
  /** the menu's sign-off: the hawk mark (ref `hawkhead`) — the ONLY logo inside the app (ref BRAND A) */
  mark: art("/images/queryhawk-logo.png", 1, 500, 500),
  /** the menu's sign-off: the wordmark (ref `wordmark`) */
  wordmark: art("/images/queryhawk_title.png", 1, 500, 100),
  /** the snackbar's small round picture (ref `toastHtml`: the placeholder) */
  snack: null as PhoneArtSrc | null,
  /** Home's Up next card (Part 2) */
  upNext: null as PhoneArtSrc | null,
} as const;

export type PhoneArtKey = keyof typeof PHONE_ART;
