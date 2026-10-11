/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Smart Import confirm step's sentence — pure, so it can be tested without the component.
 *
 * ⚠️ THIS SCREEN EXISTS TO NAME THE FILE. It is the beat where a writer spends a one-shot
 * entitlement (one free Smart Import ever, or one a month on Pro), so "which file?" is the only
 * question it asks. The named and unnamed forms are therefore NOT interchangeable: the unnamed one
 * is a fallback for a state that should not happen, not a neutral alternative.
 *
 * The bug this replaces: `fileName` was set at the top of `runMapping`, which is what this screen's
 * own primary button calls — so the name arrived one screen too late and the fallback rendered every
 * time. It is set in `pickFile` now, before the screen mounts.
 */


/** The lead sentence: names the file when we have one, and says so plainly when we do not. */
export function confirmFileLead(fileName: string | null | undefined): {
  /** Text before the filename (or the whole sentence when there is no name). */
  before: string;
  /** The filename to emphasise, or null when unnamed. */
  name: string | null;
  /** Text after the filename; empty when unnamed. */
  after: string;
} {
  const name = (fileName || "").trim();
  if (!name) {
    return {
      before: "We'll read your file and show you everything before anything is saved. You confirm what lands.",
      name: null,
      after: "",
    };
  }
  return {
    before: "We'll read ",
    name,
    after: " and show you everything before anything is saved. You confirm what lands.",
  };
}
