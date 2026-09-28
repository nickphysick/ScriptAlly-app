/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * RECONSTRUCTED STEPS (clean-up pass, 28 Sep). A step the one-off migration wrote for a query whose
 * log was empty carries `reconstructed: true`. Every surface that draws a query's history draws it
 * with these words and a drained mark, never as a real event (Nick: "the record only contains
 * things that happened, or honestly labelled reconstructions").
 */
export const RECONSTRUCTED_TITLE = "Recorded from the imported status";

export const isReconstructed = (row: unknown): boolean =>
  !!row && typeof row === "object" && (row as { reconstructed?: unknown }).reconstructed === true;
