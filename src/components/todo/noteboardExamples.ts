/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Examples drawer's content — six groups, nine notes (build Phase 7).
 *
 * ⚠️ DATA, NOT JSX, and PORTED VERBATIM from design-refs/noteboard-mockup.html's EXAMPLES
 * array. `noteboardExamples.test.ts` re-parses that array out of the ref and compares it to this
 * module, so "verbatim" is a mechanical claim rather than something somebody checked once. Edit
 * the ref and this file together, or the lock says so.
 *
 * ⚠️ THE SQUARE BRACKETS ARE THE MOCKUP'S AND THEY STAY. "[agent]", "[podcast]" are blanks the
 * writer fills, not placeholders somebody forgot to replace — an example that named a real agent
 * would be a recommendation, and this drawer does not make those.
 *
 * ⚠️ ONE WORD DIVERGES FROM THE REF, AND IT MUST. The mockup writes "Heard [agent] on [podcast]
 * — SHE'S hunting locked-room mysteries". An agent is a real person whose pronouns this app never
 * stores, so every surface says the agent / the agency / they — a rule that names example and
 * placeholder text explicitly. It reads "they're" here. `NOTE_EXAMPLE_DIVERGENCES` declares it and
 * the lock allows exactly that one difference and no other.
 *
 * ⚠️ AND THE SECOND PRONOUN IN THIS FILE STAYS. "the sister who stopped believing in HER" is a
 * one-line pitch for an INVENTED NOVEL — the writer's own words about a character, the same
 * carve-out that protects the loglines in seeds.ts. A regex sweep hits both; only one is about a
 * person this app is describing. Read every match before changing one.
 *
 * ⚠️ AND THESE ARE STARTING POINTS, NOT TEMPLATES. Using one seeds the composer with an
 * editable copy; nothing reaches the board until the writer presses Pin it.
 */
import { NoteColour } from "../../types";

export interface NoteExample {
  colour: NoteColour;
  tag: string;
  body: string;
}

export interface NoteExampleGroup {
  group: string;
  items: NoteExample[];
}

export const NOTE_EXAMPLES: readonly NoteExampleGroup[] = [
  {
    group: "Personalisation",
    items: [
      { colour: "yellow", tag: "agents", body: "Heard [agent] on [podcast] — they’re hunting locked-room mysteries with an unreliable narrator. Save the exact quote for the opening line of the letter." },
      { colour: "pink", tag: "agents", body: "[Agent]’s #MSWL: \"speculative fiction that feels like literary fiction wearing a disguise.\" That’s the book. Query when their window opens." },
    ],
  },
  {
    group: "The letter & package",
    items: [
      { colour: "sage", tag: "letter", body: "One-line pitch, draft 4: When a small-town archivist vanishes, the sister who stopped believing in her must decide which of the town’s stories were ever true." },
      { colour: "yellow", tag: "letter", body: "Standard UK package: letter + one-page synopsis + first three chapters (or first 50 pages). Always check the agency page — some want 5k words, some want 10k." },
    ],
  },
  {
    group: "Comps",
    items: [
      { colour: "pink", tag: "comps", body: "Comp shortlist: recent (under 5 yrs), same shelf, sold well but not a phenomenon. \"X meets Y\" only if both halves pull weight." },
    ],
  },
  {
    group: "Reading the responses",
    items: [
      { colour: "sage", tag: "strategy", body: "Response patterns so far: two mentioned the opening, one asked for the full off the same pages. Wait for one more data point before changing anything." },
      { colour: "yellow", tag: "strategy", body: "Batch plan: 6–8 queries at a time. If a batch comes back quiet, revise the letter before the next one — don’t burn the whole list on draft one." },
    ],
  },
  {
    group: "If the call comes",
    items: [
      { colour: "pink", tag: "calls", body: "Before saying yes: ask for time to notify other agents with the full (1–2 weeks is normal), and ask to speak to one of their current clients." },
    ],
  },
  {
    group: "While you wait",
    items: [
      { colour: "sage", tag: "next-book", body: "Book two seed: a coastal village where the tide brings back things people threw away. Write 200 words on it every time a response lands." },
    ],
  },
];

/**
 * The single deliberate difference between this module and the ref, declared so the lock can
 * allow exactly it and refuse every other drift.
 */
export const NOTE_EXAMPLE_DIVERGENCES: ReadonlyArray<{ ref: string; here: string; why: string }> = [
  {
    ref: "she\u2019s hunting locked-room mysteries",
    here: "they\u2019re hunting locked-room mysteries",
    why: "an agent is a real person whose pronouns the app never stores; the rule names example text",
  },
];
