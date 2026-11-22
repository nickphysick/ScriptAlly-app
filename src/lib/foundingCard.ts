/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE FOUNDING CARD'S WORDS AND RULES (Dashboard v105, ref design-refs/dashboard-v105/founding-flow-v104.html). Pure,
 * so every string, the a/an rule, the number words and the "which celebration" rule are unit-tested apart from layout
 * (`foundingCard.test.ts`). The app never names our founder: it says "us", "we" or "our founder".
 */
import { FEEDBACK_MAX, type FeedbackKind } from "./beta";
import { TIERS, cardTier, type FoundingStats } from "./foundingStats";

export const FEEDBACK_LIMIT = FEEDBACK_MAX;

/* ── the ID strip ── */

/** "FOUNDING WRITER · No. 023" where the waitlist proves a place; "FOUNDING WRITER" where it does not (Nick, 27 Oct). */
export function idLine(foundingNo: number | null): string {
  return foundingNo == null ? "FOUNDING WRITER" : `FOUNDING WRITER · No. ${String(foundingNo).padStart(3, "0")}`;
}

/** The writer's first name: the first word of their display name ("" when there is none). */
export const firstName = (name: string | null | undefined): string => (name ?? "").trim().split(/\s+/)[0] ?? "";

/* ── the card's idle words ── */

export const IDLE = {
  title: "Your feedback shapes QueryHawk",
  line: "Tell us what works, what doesn’t and what you’d add. We read every word.",
  ranks: "Top contributors enter a weekly prize draw, and climbing the ranks earns a special thank-you at launch.",
} as const;

/* ── compose ── */

export type ComposeKey = "like" | "dont" | "idea";
export interface ComposeSpec {
  key: ComposeKey;
  /** the idle button's label */
  label: string;
  /** the compose head's question */
  question: string;
  placeholder: string;
  /** the kind sent, unless the chips choose it ("What I don’t") */
  kind: FeedbackKind;
}

/** ⚠️ THE KIND SENT IS THE CALLABLE'S OWN STRING (`FEEDBACK_KINDS`, straight apostrophe), never the label's curly one:
 *  the function refuses anything not in its list. */
export const COMPOSE: readonly ComposeSpec[] = [
  { key: "like", label: "What I like", question: "What do you like?", placeholder: "Tell us what’s working for you…", kind: "Something I liked" },
  { key: "dont", label: "What I don’t", question: "What isn’t working?", placeholder: "What happened, or where did you get stuck?", kind: "Something's broken" },
  { key: "idea", label: "An idea", question: "What would you add?", placeholder: "Something you wish QueryHawk did…", kind: "An idea" },
];
export const composeFor = (k: ComposeKey): ComposeSpec => COMPOSE.find((c) => c.key === k)!;

/** "What I don’t": the chip is the kind; broken is the default. */
export const DONT_CHIPS: readonly { label: string; kind: FeedbackKind }[] = [
  { label: "Something’s broken", kind: "Something's broken" },
  { label: "Something’s confusing", kind: "Something's confusing" },
];

export const COMPOSE_NOTE = "Goes straight to us. We read every word.";
export const SEND_FAILED = "That didn’t send. Try again?";

/** Send is ready when there is non-whitespace text, within the limit. */
export const canSend = (text: string): boolean => text.trim().length > 0 && text.length <= FEEDBACK_LIMIT;

/* ── sent ── */

export interface SentCopy { title: string; body: string }
export function sentCopy(tier: number, name: string | null | undefined): SentCopy {
  const first = firstName(name);
  const title = first ? `Thank you, ${first}.` : "Thank you.";
  return tier === 0
    ? { title, body: "Your note is with us, and your egg is starting to crack. It hatches as soon as we’ve read it, usually within a few days." }
    : { title, body: "Your note is with us, and it counts once we’ve read it." };
}

/* ── the celebration ── */

/** "a Scout", "an Archivist". */
export const article = (word: string) => (/^[aeiou]/i.test(word) ? "an" : "a");

const WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
/** The ref writes "Two more notes": a small number is a word, a large one stays a numeral. */
const count = (n: number) => (n >= 0 && n <= 10 ? WORDS[n] : String(n));

/** The next-step sentence: "Two more notes and you become an Archivist." / "You’ve reached the top." */
export function nextStep(s: Pick<FoundingStats, "nextTier" | "toNext">): string {
  const next = s.nextTier ? TIERS.find((t) => t.key === s.nextTier) : null;
  if (!next || s.toNext == null) return "You’ve reached the top.";
  return `${count(s.toNext)} more ${s.toNext === 1 ? "note" : "notes"} and you become ${article(next.name)} ${next.name}.`;
}

export interface CelebrationCopy { kicker: string; title: string; body: string; button: string }
/** Tier 1 is the hatch; tiers 2–5 are a rank-up. The body is the tier's line, then the next step. */
export function celebrationCopy(s: FoundingStats): CelebrationCopy {
  const t = cardTier(s);
  const tier = TIERS[t - 1];
  const body = `${tier.line} ${nextStep(s)}`;
  return t === 1
    ? { kicker: "YOU’VE HATCHED", title: `Meet your ${tier.name}`, body, button: "Give more feedback" }
    : { kicker: "YOU’VE RANKED UP", title: `You’re now ${article(tier.name)} ${tier.name}`, body, button: "Give more feedback" };
}

/**
 * Should the card celebrate? Only once the live stats have loaded, only where something can record that it was seen,
 * and only when the shown rank is above the rank last celebrated. Several ranks passed at once celebrate the highest:
 * the one value returned is the rank shown, which is also the value recorded as seen.
 */
export function celebrateTier(shown: number, seen: number | null | undefined, canRecord: boolean): number | null {
  if (!canRecord || shown < 1) return null;
  const s = typeof seen === "number" && Number.isInteger(seen) ? seen : 0;
  return shown > s ? shown : null;
}

/* ── How it works (the slides) ── */

export const HOW_SLIDES = [
  { title: "Tell us anything", body: "What you like, what you don’t, and what you’d add. We read every word, and each note counts once we’ve read it." },
  { title: "Climb the ranks", body: "One note hatches your Fledgling. Then 3, 8, 15 and 25 notes take you all the way to QueryHawk. Your rank never goes down." },
  { title: "Get thanked", body: "Each week our top contributors are entered into a prize draw, and every writer who reaches QueryHawk gets a special thank-you at launch.", fine: "Fair play: up to 3 notes a week count, a sentence or more, in your own words." },
] as const;
export const HOW_TITLE = "How it works";

/** The ranks, Egg first: the photo labels and the strip's six heads. */
export const RANK_NAMES = ["Egg", ...TIERS.map((t) => t.name)] as const;
