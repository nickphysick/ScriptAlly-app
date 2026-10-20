/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The "Did you know?" card on Smart Import's reading screen — its words, its timings and its art.
 * Built to design-refs/onboarding/smart-import-loader-v2/loader-v2.dc.html. The words are exact;
 * edit them here only.
 */

export interface ImportTip { title: string; body: string }

export const IMPORT_TIPS: readonly ImportTip[] = [
  { title: "Whose move is it?", body: "Your Query Centre will tell you at a glance which queries need your attention and which ones you don't need to worry about right now." },
  { title: "Heads up", body: "When a query passes its agent's reply window, we'll add a nudge to your to-do list. Nothing slips through the cracks." },
  { title: "Record a response", body: "Got an answer? Log what came back, good news or bad, and see your campaign analytics and to-do list update in real time." },
  { title: "Materials & Packages", body: "Track which manuscript versions, letters and synopses are getting agents asking for more." },
  { title: "Benchmarking", body: "Track your response rate and how far your queries are getting, and use the analysis to shape your campaign." },
];

/** The card appears this long into the read, and a new tip follows this long after the last. */
export const TIP_SHOW_AFTER_MS = 3000;
export const TIP_EVERY_MS = 7000;

/**
 * ⚠️ PLACEHOLDER ILLUSTRATION. `tip-hawk.png` is the stand-in supplied with the design ref, awaiting
 * the commissioned artwork. It is 1200 × 1200 and 1.3 MB for a 168 px slot; the real file should be
 * exported near 2× that (≈336 px). Swapping it is this one constant and the file it names.
 */
export const IMPORT_TIP_ART = { src: "/images/import/tip-hawk.png", version: "082dc088", width: 168, height: 168 } as const;
