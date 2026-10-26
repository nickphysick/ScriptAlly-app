/**
 * An agent is named, never "she" or "he" (25 Oct, landing hero v3.2) — the sweep both hero lock files
 * share. The app never stores an agent's pronouns, so every note on the card names them: the first name,
 * or "the agent" when none is saved (`agentRef` in src/marketing/landingCopy.ts, unit-locked there).
 *
 * `WORDING_RECORDER` is an init script. Every animation frame it walks the hero pile's text nodes
 * (cards, chips, the popover and the flip's face) and keeps each distinct string it sees, joined with
 * " | " so two neighbouring nodes can never run together into a false word. Digits are dropped before
 * the string is kept, so the day counter does not make every frame "new".
 */
import { Page } from "@playwright/test";

export type WordingRec = { texts: string[]; labels: string[]; frames: number };

export const WORDING_RECORDER = () => {
  const R: WordingRec = { texts: [], labels: [], frames: 0 };
  (window as unknown as { __hw: WordingRec }).__hw = R;
  const seen = new Set<string>(), labels = new Set<string>();
  const loop = () => {
    const pile = document.querySelector(".mk-hc-pile");
    if (pile) {
      R.frames++;
      const parts: string[] = [];
      const w = document.createTreeWalker(pile, NodeFilter.SHOW_TEXT);
      for (let n = w.nextNode(); n; n = w.nextNode()) { const s = (n.textContent ?? "").trim(); if (s) parts.push(s); }
      const s = parts.join(" | ").replace(/[0-9]/g, "");
      if (!seen.has(s)) { seen.add(s); R.texts.push(s); }
      const small = pile.querySelector(".mk-pillpop small");
      if (small && !labels.has(small.textContent ?? "")) { labels.add(small.textContent ?? ""); R.labels.push(small.textContent ?? ""); }
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
};

/** The brief's list, read literally — plus a word-boundary form that catches the same words at an edge. */
export const PRONOUN_LITERALS = ["She ", "she ", "He ", " he ", " her ", " him "];
export const PRONOUN_WORD = /\b(she|he|her|hers|him|his)\b/i;

export function pronounHits(texts: string[]): string[] {
  const hits: string[] = [];
  for (const t of texts) {
    const lit = PRONOUN_LITERALS.find((p) => t.includes(p));
    const m = t.match(PRONOUN_WORD);
    if (lit || m) hits.push(`${JSON.stringify(lit ?? m![0])} in "${t.slice(0, 160)}"`);
  }
  return hits;
}

/** The named break for both wording locks: the popover's label rewritten to "She asked for". */
export async function breakWording(page: Page) {
  await page.addInitScript(() => {
    new MutationObserver(() => {
      document.querySelectorAll(".mk-pillpop small").forEach((s) => { if (s.textContent !== "She asked for") s.textContent = "She asked for"; });
    }).observe(document, { subtree: true, childList: true, characterData: true });
  });
}
