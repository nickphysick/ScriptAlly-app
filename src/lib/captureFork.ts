/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The capture fork — two doors (two-door import v1; ref design-refs/two-door-import-v1/): "I have a
 * list" and "I'm starting fresh". Pure: copy and the button contract, with no React and no db, so the
 * wording can be locked without rendering.
 */

export type CaptureOption = "list" | "fresh";

/** Fixed order (two-door import v1): a writer either has a list or is starting fresh. The template is
 *  not a door of its own: a file that already uses our column headings is recognised on upload
 *  (lib/importReadRoute) and read straight in, with no Smart Import run. */
export const CAPTURE_OPTIONS: CaptureOption[] = ["list", "fresh"];

/**
 * One door. ⚠️ THERE IS NO `primaryLabel`, NO `fit` TAG AND NO REVEAL. Each door has its own
 * buttons, so there is nothing to choose before acting. The fact line states COST and nothing else.
 */
export interface CaptureChoice {
  key: CaptureOption;
  title: string;
  /** Three short lines: what it takes, what it does, what it asks of you. */
  lines: [string, string, string];
}

export const CAPTURE_HEADING = "How shall we capture your list?";
export const CAPTURE_SUB = "Bring the list you already keep, or start a new one here.";

export const CAPTURE_CHOICES: Record<CaptureOption, CaptureChoice> = {
  list: {
    key: "list",
    title: "I have a list",
    lines: ["A spreadsheet, a document, or a photo of your notebook", "Smart Import reads it into your database", "You answer a few questions, only where it matters"],
  },
  fresh: {
    key: "fresh",
    title: "I'm starting fresh",
    lines: ["Add agents as you find them", "Log each query when you send it", "Nothing to prepare"],
  },
};

/** Door one's buttons, in order. The first is the page's one filled navy button. */
export const CAPTURE_UPLOAD_ACTION = "Upload a file";
/** Door one's second button: the same door, read from photos of the list. */
export const CAPTURE_PHOTOS_ACTION = "Use photos";
/** Door one's caption, under its buttons. */
export const CAPTURE_LIST_CAPTION = "It doesn't need tidying first.";
/** Door two's one button: what "I've nothing to capture yet" did — set-up ends on the dashboard. */
export const CAPTURE_FRESH_ACTION = "Take me to my dashboard";

/** The quiet line under the doors: the headings sheet, for a writer who keeps a spreadsheet. */
export const CAPTURE_QUIET_LINE = "Keeping your list in a spreadsheet? Use our column headings and it's read straight in.";
export const CAPTURE_QUIET_LINK = "Download the headings";

/**
 * Door one's fact line: what it costs, and nothing else. A headings file costs nothing, but the
 * door's main read is Smart Import, and that is what the line states (plan rules v1: one per account).
 */
export function captureFact(option: CaptureOption): string {
  return option === "list" ? "Uses your one Smart Import" : "";
}

/** The file types the picker accepts, and so the only ones a drop is taken for. */
export const CAPTURE_ACCEPT = [".csv", ".xlsx", ".xls"] as const;
export function acceptsDroppedFile(name: string): boolean {
  const lower = name.toLowerCase();
  return CAPTURE_ACCEPT.some((ext) => lower.endsWith(ext));
}
