/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Visual constants for user notes (post-its). Values are locked to the mocks
 * (scriptally-notes-fan.html). Critical fill/ink/fold colours are applied as INLINE styles by the
 * components — never Tailwind classes (known footgun) — so they live here as plain strings.
 */
import type { NoteColour } from "../../types";

/** Handwriting face for post-it bodies. Added to the global @import in index.css. */
export const FONT_CAVEAT = "'Caveat', cursive";

export interface NoteTheme {
  fill: string; // paper
  ink: string; // text
  fold: string; // folded bottom-right corner
  sheen: string; // soft glue-line sheen at the top
}

/** The three writer-chosen colours. Pink is the default. */
export const NOTE_THEMES: Record<NoteColour, NoteTheme> = {
  pink: { fill: "#f3d6cc", ink: "#5b3528", fold: "#e6c2b6", sheen: "rgba(120,60,40,.06)" },
  sage: { fill: "#d9e2d3", ink: "#41513b", fold: "#c5d1be", sheen: "rgba(60,80,55,.06)" },
  yellow: { fill: "#f1e4b6", ink: "#5a4a28", fold: "#e4d49c", sheen: "rgba(110,90,40,.06)" },
};

export const NOTE_COLOURS: NoteColour[] = ["pink", "sage", "yellow"];

/** A deeper shade of each note colour — used for the confirm Delete/Complete buttons on the sticky. */
export const NOTE_DEEP_SHADE: Record<NoteColour, { bg: string; ink: string }> = {
  pink: { bg: "#d29c89", ink: "#41201a" },
  sage: { bg: "#9aae90", ink: "#283326" },
  yellow: { bg: "#d6c272", ink: "#443916" },
};

/** Warm fill for a due chip that's due-today/overdue (mock: `.hrow .hd.soon`). */
export const DUE_SOON_BG = "#fbe6da";

/** Staged due-chip palette — cool (ahead) → warm (today/imminent) → over (overdue, with a dot). */
export const DUE_CHIP_STAGES = {
  cool: { bg: "#fff3ed", border: "#eed6c8", ink: "#7c3a2a", dot: null as string | null },
  warm: { bg: "#fbe6da", border: "#f0cdbd", ink: "#7c3a2a", dot: null as string | null },
  over: { bg: "#f6d6c9", border: "#e9b6a4", ink: "#9a3f2c", dot: "#b5402a" as string | null },
};
