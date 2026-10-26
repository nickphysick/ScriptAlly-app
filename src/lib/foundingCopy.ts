/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE "YOUR CONTRIBUTIONS" CARD'S WORDS (Dashboard v93) — the pack's copy table, built from a writer's stats. Pure, so
 * the a/an rule, the 0 and 1 forms and the topPct-null form are unit-tested (`foundingCopy.test.ts`) apart from layout.
 * The app never names our founder: it says "us", "we" or "our founder".
 */
import { TIERS, tierIndex, type FoundingStats, type TierKey } from "./foundingStats";

/** A run of the stat line: plain, bold, or bold and rust. */
export interface Run { t: string; b?: boolean; rust?: boolean }

export const CARD_BAND = "You’re a QueryHawk founding writer";
export const HOW_LABEL = "How it works";

const tierName = (k: TierKey | null) => (k ? TIERS.find((t) => t.key === k)!.name : "");
/** "a Scout", "an Archivist": "an" before a vowel. */
export const article = (word: string) => (/^[aeiou]/i.test(word) ? "an" : "a");

export interface CardCopy {
  /** "FOUNDING WRITER · LEVEL 2 OF 5" (before the first contribution: "FOUNDING WRITER") */
  kicker: string;
  title: string;
  /** the tier's italic line, or the first-contribution prompt */
  line: string;
  stat: Run[];
  /** the compact variant's one line */
  compact: string;
}

const contributions = (n: number) => `${n} ${n === 1 ? "contribution" : "contributions"}`;

export function cardCopy(s: FoundingStats): CardCopy {
  const i = tierIndex(s.tier);
  const next = s.nextTier ? tierName(s.nextTier) : null;
  const waiting: Run[] = s.waiting > 0 ? [{ t: ` ${s.waiting} waiting to be read.` }] : [];

  if (i < 0) {
    return {
      kicker: "FOUNDING WRITER",
      title: "Your first contribution makes you a Fledgling",
      line: "Use Give feedback in the sidebar. Anything useful counts.",
      stat: waiting.length ? [{ t: waiting[0].t.trimStart() }] : [],
      compact: "Your first contribution makes you a Fledgling",
    };
  }

  const tier = TIERS[i];
  const stat: Run[] = [];
  if (s.contributions === 1) {
    stat.push({ t: "Your first contribution.", b: true }, { t: " Welcome to the flock." });
  } else {
    stat.push({ t: contributions(s.contributions), b: true });
    stat.push({ t: s.topPct != null ? ` · top ${s.topPct}% of founding writers.` : "." });
  }
  if (next && s.toNext != null) {
    stat.push({ t: " " }, { t: `${s.toNext} more`, b: true, rust: true }, { t: ` and you become ${article(next)} ` }, { t: next, b: true }, { t: "." });
  } else {
    stat.push({ t: " You’ve reached the top." });
  }
  stat.push(...waiting);

  return {
    kicker: `FOUNDING WRITER · LEVEL ${i + 1} OF ${TIERS.length}`,
    title: `The ${tier.name}`,
    line: tier.line,
    stat,
    compact: `The ${tier.name} · ${contributions(s.contributions)}${next && s.toNext != null ? ` · ${s.toNext} more to ${next}` : ""}`,
  };
}

/** The stat line as plain text (for locks and the accessible name). */
export const runsText = (runs: readonly Run[]) => runs.map((r) => r.t).join("");

/** The "How it works" panel (ref shots/how-it-works-panel.png). ⚠️ The weekly question is not built, so its two rows are left out. */
export const HOW = {
  kicker: "FOUNDING WRITERS",
  title: "How it works",
  /* the lead, with "contribution" set bold */
  lead: ["As one of our first 100 writers, you’re helping build QueryHawk. Everything useful you tell us is a ", "contribution", ", and contributions move you up through the flock, from Fledgling to QueryHawk."],
  flock: "The flock",
  counts: "What counts",
  rows: ["Reporting a problem we can confirm", "Telling us something’s unclear", "Suggesting an idea", "Telling us what works"],
  bonus: "An idea of yours that we build",
  rules: "The fair-play rules",
  fair: [
    { b: "Up to 3 a week count.", t: " Send as much as you like. We read it all, but only three a week move you up." },
    { b: "A sentence or more, in your own words.", t: " One-word notes and repeats of the same point don’t count." },
    { b: "It counts once we’ve read it.", t: " Usually within a few days; until then it shows as waiting." },
    { b: "Your level never goes down.", t: " Take a month off; your hawk will wait." },
  ],
  footBefore: "You give feedback from ",
  footLink: "Give feedback",
  footAfter: " in the sidebar.",
} as const;
