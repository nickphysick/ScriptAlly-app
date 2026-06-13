/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Editable landing copy, centralised so the two provisional spots are easy to change
 * in one place (per the brief):
 *   1. FOUNDER_NOTE — placeholder voice; swap in the real story + name. TODO below.
 *   2. REJECTIONS  — the "In good company" figures are provisional; adjust freely.
 */

/* ── 1. Founder's note ──────────────────────────────────────────────────
 * TODO(nick): replace this placeholder with your true querying story + name.
 * Authenticity here is the strongest converter on the page. */
export const FOUNDER_NOTE = {
  eyebrow: "A note from the desk",
  lead:
    "I built ScriptAlly because I was querying my own novel — and watching the whole hopeful, terrifying process disappear into a spreadsheet I dreaded opening.",
  paragraphs: [
    "Who had I already written to? Which agent wanted the full, and when did they ask? Was that a polite no, or just silence? The work I cared about was the writing. The work that ate my evenings was the {em}admin{/em}.",
    "So I made the tool I wished I'd had: somewhere warm to keep every query, every agent, every nudge — that treats your manuscript like it matters, because it does. If you're somewhere in the long middle of querying right now, this was made for you.",
  ],
  signatureInitial: "S",
  signatureName: "Nick",
  signatureRole: "Maker of ScriptAlly",
  /** Set to "" to hide the dashed placeholder banner once the real story is in. */
  placeholderNote:
    "↑ Placeholder voice — swap in your true story & name. Authenticity here is the strongest converter on the page.",
};

/* ── 2. "In good company" rejection figures (provisional) ───────────────── */
export interface Rejection {
  n: number;
  title: string;
  label: string;
}

export const REJECTIONS: Rejection[] = [
  { n: 12, title: "Harry Potter & the Philosopher's Stone", label: "publishers passed" },
  { n: 26, title: "A Wrinkle in Time", label: "rejections" },
  { n: 23, title: "Dune", label: "rejections" },
  { n: 20, title: "Lord of the Flies", label: "rejections" },
];
