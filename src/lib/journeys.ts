/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ JOURNEYS ARE DATA (journey round, Phase 1; ref `design-refs/todo-journey-logic.html`) ═══════
 *
 * ⚠️ ONE DECLARATION PER JOURNEY, AND IT IS THE SINGLE SOURCE THE WHOLE PANE READS. A journey's
 * band, its deed register, the intents it offers, and — per intent — the questions, the primary,
 * the optional links, what it writes and what its strip says. Nothing about a journey is decided
 * anywhere else, and nothing branches on a task type outside `journeyIdFor`.
 *
 * ⚠️ AND IT REPLACES TWO UNIONS THAT DISAGREED. Recon found `paneJourney.JourneyKind`
 * (`send · chase · close · offer · note · fix · materials`) beside `paneGate.JourneyKind`
 * (`send · decide · chase · close · fix · bulk · note`) — different members, and **`fix` naming two
 * different journeys**: the agent-record gap in one file and the materials fill-in in the other.
 * `bulk` was in neither's counterpart. One word covering two acts, depending on which file you were
 * reading, is how the pane came to ask a question the gate did not know about.
 *
 * ⚠️ THE REQUIRED LIST IS PER **FLOW**, NOT PER JOURNEY, and that is the change the fork forces.
 * "What does a close require?" has no answer any more — *closing it now* requires a day, *leaving
 * it open* requires a return date, and they are different questions with different writes. The four
 * surfaces the steer round unified (the square, the count, the missing-answers line and now the
 * fill) read `flow.questions`, so they still cannot disagree — they simply read one level deeper.
 *
 * ⚠️ EXHAUSTIVE, WITH THE HOUSE `never` GUARD. A journey without a fork, or a flow without a
 * primary and a required list, fails to compile — because `JOURNEYS` is a `Record<JourneyId, …>`
 * over a closed union and every field below is required rather than optional. Proved by adding a
 * member and reading the error; see the run report.
 */
import { BoardCard } from "./todoBoard";
import { cardBucket } from "./todoBuckets";
import type { ReqField } from "./paneGate";

/**
 * ⚠️ THE RECONCILED UNION. Five are the contract's own journeys; three are journeys this app has
 * that the contract does not draw, and they are members rather than exceptions — a union that
 * omitted them would be a declaration the pane could not read for every card it can dock.
 *
 * The two renames are disambiguations, not preferences: `chase` → `nudge` because the contract, the
 * copy and the writer all call it a nudge, and `fix` → `agentgap` / `fillin` because `fix` was the
 * word covering both.
 */
export type JourneyId =
  | "send"
  | "nudge"
  | "close"
  | "fillin"
  | "note"
  /** an offer or an R&R — a judgement, not a task. Hands off to its own takeover; see `flows`. */
  | "offer"
  /** a gap in an AGENT's record — a different subject from a gap in a query's */
  | "agentgap"
  /** a cohort of imported queries — one task standing for many */
  | "bulk";

/** The band's paper, as the contract names it. */
export type JourneyBand = "now" | "house" | "yours";

/**
 * ⚠️ A TARGET IS A FLOW OR A JOURNEY, NEVER A BARE STRING. The contract's crossovers — closing and
 * nudging are each other's second thoughts — swap the WHOLE journey: band, deed, flow and primary.
 * A string could not say which of the two it meant, and the compiler could not check either.
 */
export type IntentTarget =
  | { kind: "flow"; flow: string }
  | { kind: "journey"; journey: JourneyId };

/**
 * ⚠️ THE FOUR GLYPHS ARE A CLOSED SET, AND AN INTENT DECLARES ITS OWN (drawer round, Phase 3).
 * The contract draws a mark in the fork panel's first column; deriving it from the id or the
 * target would mean a DEFAULT for anything the table did not know, and a default here invents a
 * meaning — the one shape this file's own `FlowWrite` note already refuses. Four marks, one per
 * kind of answer a fork can offer:
 *
 *   ✓  I have done it            — the thing happened; record it
 *   ⏱  not yet, ask me later     — the clock moves, nothing else does
 *   ×  I am not going to         — record that honestly, and close
 *   ↻  do it again / something else — the journey swaps for another
 */
export type IntentGlyph = "✓" | "⏱" | "×" | "↻";

export interface JourneyIntent {
  /** stable, and it becomes part of a DOM id — see `idPrefix` in `TaskPaneBody` */
  id: string;
  title: string;
  subtitle: string;
  /** REQUIRED — the compiler is what makes the next intent state its own mark rather than inherit
   *  somebody else's by falling through a table. */
  glyph: IntentGlyph;
  target: IntentTarget;
}

export interface JourneyFork {
  label: string;
  /** 2–3, per the contract. Fewer is not a fork; more is a menu. */
  options: JourneyIntent[];
}

/**
 * ⚠️ WHAT A FLOW WRITES, DECLARED RATHER THAN INFERRED. This is the field recon found missing: the
 * close's REASON was a constant in `paneCommitValues` (`kind === "close" ? "no_reply" : null`), so
 * every close from the pane recorded a no-response whatever the writer had meant — with the model
 * fully able to express all three. A write the flow declares cannot be wrong about which flow it is.
 */
export type FlowWrite =
  /** the query's own send record — materials, date, expectation, reminder */
  | { kind: "record-send" }
  /** a nudge: a non-status activity plus the next check-in. Never moves the status. */
  | { kind: "record-nudge" }
  /** close, carrying the reason the JOURNEY the writer came from implies */
  | { kind: "close-query"; reason: "no_reply" | "off_record" | "withdrawn" }
  /** the existing snooze primitive — a task moves, nothing on the query changes */
  | { kind: "snooze" }
  /** the existing per-query mute — this suggestion stops, nothing is deleted */
  | { kind: "mute" }
  /** the fill-in's materials record */
  | { kind: "record-materials" }
  /** a writer's own item, ticked */
  | { kind: "tick-note" }
  /** a writer's own item, given a date */
  | { kind: "date-note" }
  /** the cohort table's own committer */
  | { kind: "record-cohort" }
  /**
   * ⚠️ THE DECLARED HAND-OFF. An offer asks for a branch and a decision; an agent-record gap asks
   * for a window, materials and a wish list. This pane draws neither, so routing them to a writer
   * would run a committer with nothing to write behind a button claiming it had recorded something.
   * Stated as a write kind so a journey cannot simply omit the field.
   */
  | { kind: "hand-off" };

/**
 * ⚠️ ONE DELAY OPTION, AND `days` IS THE ONLY THING THE WRITE NEEDS. The label is the writer's
 * words; `days` is what reaches the existing snooze primitive. `kind: "date"` opens the app's own
 * picker and `kind: "never"` ends the asking — both are answers, and the type can say so.
 */
export type DelayOption =
  | { id: string; label: string; kind: "days"; days: number }
  | { id: string; label: string; kind: "date" }
  | { id: string; label: string; kind: "never" };

export interface JourneyFlow {
  /** the ledger's rows, in order — the ONE list the square, the count, the line and the fill read */
  questions: ReqField[];
  primary: string;
  /** the optional fields offered beneath the ledger; `[]` is a decision, not an omission */
  links: ("alongside" | "also")[];
  writes: FlowWrite;
  /**
   * The strip's grammar for this flow — a key, not a sentence. The sentence is built where the
   * VALUES are (`useTaskPaneSession`), because the strip resolves dates and this file is pure.
   */
  strip: "consequences" | "closed" | "note" | "cohort" | "snoozed" | "muted" | "nothing" | "materials";
  /** a standing line above the ledger where the flow has one — the fill-in's "records nothing" */
  info?: string;
  /**
   * ⚠️ THE DELAY QUESTIONS' OWN OPTIONS, PER FLOW — because "hold me to when?" offers tomorrow and
   * "ask you again…" offers three months, and they are the same FIELD asked in different registers.
   * A flow naming `holdday`, `checkin` or `again` without options would draw a question with
   * nothing under it; `journeys.test.ts` refuses that rather than leaving it to be noticed.
   */
  delays?: Partial<Record<"holdday" | "checkin" | "again", DelayOption[]>>;
  /** the hint under a delay question, where the contract gives one */
  delayHints?: Partial<Record<"holdday" | "checkin" | "again", string>>;
  /**
   * ⚠️ WHICH SET OF ANSWERS THE `when` QUESTION OFFERS — a KEY, not a table, for the same reason
   * `strip` is a key: this file is pure and the tables carry functions that build a `DayChoice`.
   *
   * `sent` (the default) is the send's Today / Yesterday / Another date. `import` is the fill-in's,
   * because a query nobody typed has two answers the send does not — the import's own date may
   * stand, and the writer may not know. Omitted means `sent`, which is what every other flow means.
   */
  dayset?: "sent" | "import";
  /** the hint under the `when` question, where the flow's own wording differs from the send's */
  whenHint?: string;
}

export interface Journey {
  id: JourneyId;
  band: JourneyBand;
  /**
   * The register this journey's copy is written in — the contract states one per journey, and it
   * is carried here so it is reviewable rather than an intention someone had once.
   */
  /**
   * ⚠️ THE TONE THIS JOURNEY'S COPY IS WRITTEN IN — DOCUMENTATION THAT IS ENFORCED, AND
   * DELIBERATELY NOT RENDERED (journey round, Phase 8).
   *
   * It is not a string for the page: it is the author's contract, and `journeyRegister.test.ts`
   * turns each one into a checkable vocabulary — the nudge may use no anxious word, the close may
   * pass no verdict, the fill-in may not blame, and no journey may guess an agent's pronouns.
   *
   * So: anyone wiring this into the UI is misreading it, and anyone deleting it as an unread field
   * is deleting the reason those lists exist. It was genuinely unread until Phase 8, which is the
   * state this file has now closed twice — see `strip`, whose seven grammars had no reader.
   */
  register: string;
  fork: JourneyFork;
  flows: Record<string, JourneyFlow>;
}

/* ── the declaration ───────────────────────────────────────────────────────────────────────── */

export const JOURNEYS: Record<JourneyId, Journey> = {
  send: {
    id: "send",
    band: "now",
    register: "A request is good news — brisk, warm, no ceremony. The fork honours that “your turn” does not always mean “done”.",
    fork: {
      label: "Where are you with it?",
      options: [
        { id: "sent", title: "I’ve sent it", subtitle: "Note what went, and set the clock", glyph: "✓",
          target: { kind: "flow", flow: "sent" } },
        { id: "later", title: "Not yet — hold me to it", subtitle: "Pick a day and it lands back on your list", glyph: "⏱",
          target: { kind: "flow", flow: "later" } },
        /* ⚠️ A CROSSOVER, NOT A THIRD FLOW. Deciding not to send is a CLOSE, and it is a close with
           its own reason — withdrawn. Modelling it here would give the app two ways to close a
           query, which is how the two would come to write different things. */
        { id: "wont", title: "I’m not going to send it", subtitle: "Record that, and close the query honestly", glyph: "×",
          target: { kind: "journey", journey: "close" } },
      ],
    },
    flows: {
      sent: { questions: ["unit", "when", "expect", "remind"], primary: "Log as sent",
              links: ["alongside", "also"], writes: { kind: "record-send" }, strip: "consequences" },
      later: { questions: ["holdday"], primary: "Set the reminder", links: [],
               writes: { kind: "snooze" }, strip: "snoozed",
               delays: { holdday: [
                 { id: "tomorrow", label: "Tomorrow", kind: "days", days: 1 },
                 { id: "d3", label: "In 3 days", kind: "days", days: 3 },
                 { id: "week", label: "Next week", kind: "days", days: 7 },
                 { id: "date", label: "A date…", kind: "date" },
               ] },
               delayHints: { holdday: "This task waits quietly until then — nothing is recorded on the query." } },
    },
  },

  nudge: {
    id: "nudge",
    band: "now",
    register: "Matter-of-fact courage — nudging is normal. The app hands the writer the clock, not the anxiety.",
    fork: {
      label: "Where are you with it?",
      options: [
        { id: "nudged", title: "I’ve nudged them", subtitle: "Record it, and reset the clock", glyph: "✓",
          target: { kind: "flow", flow: "nudged" } },
        { id: "wait", title: "I’ll give it a little longer", subtitle: "Choose when this should come back", glyph: "⏱",
          target: { kind: "flow", flow: "wait" } },
        { id: "toclose", title: "Actually — time to close", subtitle: "Enough waiting; record it honestly", glyph: "×",
          target: { kind: "journey", journey: "close" } },
      ],
    },
    flows: {
      /* ⚠️ `checkin` IS REQUIRED, and recon found this is the round's real bug. `requiredFor("chase")`
         was `[]` while `paneCommitValues` supplied `checkBackDays: DEFAULT_CHECKBACK_DAYS` — so a
         nudge logged from the pane wrote a check-in date the writer never chose. A nudge resets the
         clock, so the flow asks for the new clock. */
      nudged: { questions: ["when", "checkin"], primary: "Log the nudge", links: ["also"],
                writes: { kind: "record-nudge" }, strip: "consequences",
                delays: { checkin: [
                  { id: "w2", label: "Ask me in 2 weeks", kind: "days", days: 14 },
                  { id: "m1", label: "Ask me in a month", kind: "days", days: 30 },
                  { id: "date", label: "A date…", kind: "date" },
                  { id: "never", label: "Don’t ask again", kind: "never" },
                ] },
                delayHints: { checkin: "A nudge deserves its own clock — this is when the app checks in next." } },
      wait: { questions: ["holdday"], primary: "Set it aside", links: [],
              writes: { kind: "snooze" }, strip: "snoozed",
              delays: { holdday: [
                { id: "w1", label: "In a week", kind: "days", days: 7 },
                { id: "w2", label: "In 2 weeks", kind: "days", days: 14 },
                { id: "m1", label: "In a month", kind: "days", days: 30 },
                { id: "date", label: "A date…", kind: "date" },
              ] },
              delayHints: { holdday: "The task waits quietly until then." } },
    },
  },

  close: {
    id: "close",
    band: "house",
    register: "Bookkeeping, not a verdict. The fork names the honourable alternatives first.",
    fork: {
      label: "What would you like to do?",
      options: [
        { id: "closenow", title: "Close it now", subtitle: "Records no response — not a rejection. It reopens if a reply ever comes", glyph: "×",
          target: { kind: "flow", flow: "closenow" } },
        { id: "nudgefirst", title: "Nudge them once more first", subtitle: "One more try before the ledger closes", glyph: "↻",
          target: { kind: "journey", journey: "nudge" } },
        { id: "leave", title: "Leave it open for now", subtitle: "Choose when you’d like to be asked again — or not at all", glyph: "⏱",
          target: { kind: "flow", flow: "leave" } },
      ],
    },
    flows: {
      closenow: { questions: ["when"], primary: "Log the close", links: ["also"],
                  /* ⚠️ THE REASON IS THE FLOW'S, AND THE WRITER IS NEVER ASKED TO CATEGORISE THEIR
                     OWN DISAPPOINTMENT. Arriving here from the close card means a silence; arriving
                     from the send fork's "I'm not going to send it" means a withdrawal, and the
                     crossover carries that — see `crossoverWrite`. */
                  writes: { kind: "close-query", reason: "no_reply" }, strip: "closed" },
      leave: { questions: ["again"], primary: "Set it aside", links: [],
               /* ⚠️ THE MUTE IS ONE OF THIS QUESTION'S OWN ANSWERS. The flow declares the delay; the
                  ANSWER decides which of the two writes runs, because "stop asking" and "ask me in
                  a month" are the same question answered two ways rather than two questions. */
               writes: { kind: "snooze" }, strip: "snoozed",
               delays: { again: [
                 { id: "w2", label: "In 2 weeks", kind: "days", days: 14 },
                 { id: "m1", label: "In a month", kind: "days", days: 30 },
                 { id: "m3", label: "In 3 months", kind: "days", days: 90 },
                 { id: "date", label: "A date…", kind: "date" },
                 { id: "never", label: "Stop asking about this one", kind: "never" },
               ] },
               delayHints: { again: "“Stop asking” mutes this suggestion for this query only — it deletes nothing, and every other task still appears." } },
    },
  },

  fillin: {
    id: "fillin",
    band: "house",
    register: "Housekeeping — quick, forgiving, and honest about not remembering.",
    fork: {
      label: "This query came in by import — what went with it?",
      options: [
        { id: "fill", title: "I can fill it in", subtitle: "Tick what went; set the sample if there was one", glyph: "✓",
          target: { kind: "flow", flow: "fill" } },
        { id: "forget", title: "I can’t remember", subtitle: "Fair enough — stop asking, record nothing", glyph: "×",
          target: { kind: "flow", flow: "forget" } },
      ],
    },
    flows: {
      fill: { questions: ["unit", "when"], primary: "Record what went", links: ["also"],
              writes: { kind: "record-materials" }, strip: "materials",
              /* ⚠️ THE IMPORT'S OWN ANSWERS. This asked the SEND's three — Today / Yesterday /
                 Another date — of a query the writer did not type, so the only honest answer
                 ("I don't know") was not among them and the only way out was to name a day. */
              dayset: "import",
              whenHint: "“Not sure” leaves the date blank rather than guessing." },
      /* ⚠️ A FLOW WITH NO QUESTIONS IS NOT A FLOW WITH A MISSING LIST. "I can't remember" records
         nothing and invents nothing; the alternative is a writer making up history to stop a
         prompt, which is the opposite of what this app is for. */
      forget: { questions: [], primary: "Stop asking", links: [], writes: { kind: "mute" },
                strip: "muted",
                info: "Nothing is recorded and nothing is invented. This gap stops appearing on your list; the query itself is untouched." },
    },
  },

  note: {
    id: "note",
    band: "yours",
    register: "The writer’s own words on their own paper — the app’s only jobs are the tick and, if wanted, a date.",
    fork: {
      label: "Your note — what now?",
      options: [
        { id: "tick", title: "Tick it off", subtitle: "Done is done — the tick is dated today", glyph: "✓",
          target: { kind: "flow", flow: "tick" } },
        { id: "date", title: "Give it a date", subtitle: "Turn it into a reminder that comes back", glyph: "⏱",
          target: { kind: "flow", flow: "date" } },
      ],
    },
    flows: {
      /* ⚠️ NO `When`. The tick carries its own date, so asking when it happened asks about an event
         that has not happened yet. */
      tick: { questions: [], primary: "Tick it off", links: ["also"], writes: { kind: "tick-note" },
              strip: "note", info: "Ticking it off is what finishes it." },
      date: { questions: ["holdday"], primary: "Set the date", links: [],
              writes: { kind: "date-note" }, strip: "snoozed",
              delays: { holdday: [
                { id: "tomorrow", label: "Tomorrow", kind: "days", days: 1 },
                { id: "week", label: "Next week", kind: "days", days: 7 },
                { id: "date", label: "A date…", kind: "date" },
              ] } },
    },
  },

  /* ── the three the contract does not draw, declared rather than omitted ──────────────────── */

  offer: {
    id: "offer",
    band: "now",
    register: "A judgement, not a task — the branch belongs to its own surface.",
    /* ⚠️ A ONE-OPTION FORK IS STILL A FORK, and it is honest here: there is one thing to do and the
       pane says what it is rather than offering a choice it cannot honour. The alternative — no
       fork — would make this journey the exception the declaration exists to forbid. */
    fork: {
      label: "An offer needs its own answer",
      options: [
        { id: "open", title: "Answer the offer", subtitle: "Accept, decline, or ask for time — on its own screen", glyph: "↻",
          target: { kind: "flow", flow: "open" } },
      ],
    },
    flows: {
      open: { questions: [], primary: "Reply to the offer", links: [], writes: { kind: "hand-off" },
              strip: "nothing" },
    },
  },

  agentgap: {
    id: "agentgap",
    band: "house",
    register: "Housekeeping about an AGENT rather than a query — a different subject, and its own form.",
    fork: {
      label: "This agent’s record has gaps",
      options: [
        { id: "open", title: "Fill in the agent’s record", subtitle: "Their window, what they ask for, their wish list", glyph: "↻",
          target: { kind: "flow", flow: "open" } },
      ],
    },
    flows: {
      open: { questions: [], primary: "Update the record", links: [], writes: { kind: "hand-off" },
              strip: "nothing" },
    },
  },

  bulk: {
    id: "bulk",
    band: "house",
    register: "One task standing for many queries — the table is the form.",
    fork: {
      label: "These queries came in by import",
      options: [
        { id: "fill", title: "Fill in what you sent", subtitle: "One row per query; copy the first row down if they match", glyph: "✓",
          target: { kind: "flow", flow: "fill" } },
      ],
    },
    flows: {
      fill: { questions: ["rows"], primary: "Log the queries", links: [],
              writes: { kind: "record-cohort" }, strip: "cohort" },
    },
  },
};

/* ── resolution ────────────────────────────────────────────────────────────────────────────── */

/**
 * ⚠️ THE ONE RESOLVER. It reads the same card facts `paneJourneyKind` and `paneGate.journeyKind`
 * read, in the same order, so no card changes journey — what changes is that there is one answer
 * rather than two that disagreed about `fix`.
 */
export function journeyIdFor(card: BoardCard): JourneyId {
  if (card.userTaskId) return "note";
  if (card.taskType === "offer_received") return "offer";
  /* an R&R is a SEND: `sendSpecFor` returns a spec for it and `recordMaterialsSent` performs it */
  if (card.taskType === "revise_resubmit") return "send";
  if (card.taskType === "materials_unrecorded_bulk") return "bulk";
  if (card.taskType === "materials_unrecorded") return "fillin";
  /* ⚠️ HOISTED so the `never` guard can narrow — calling `cardBucket(card)` again in the default
     gives TypeScript a fresh `Bucket` it cannot know is exhausted, and the guard stops guarding.
     The same trap `cardFootHint` carried a note about; it caught me here on the first compile. */
  const bucket = cardBucket(card);
  switch (bucket) {
    case "send": return "send";
    case "chase": return "nudge";
    case "close": return "close";
    case "note": return "note";
    case "decide": return "offer";
    /* everything else in the `fix` bucket is a gap in an AGENT's record */
    case "fix": return "agentgap";
    default: {
      const unhandled: never = bucket;
      return unhandled;
    }
  }
}

/**
 * ⚠️ WHICH SENTENCE A JOURNEY'S DEED IS WRITTEN IN. `deedSentence` switches on a `Bucket`, which is
 * a fact about the CARD — right until a crossover makes the active journey different from the
 * card's. Measured: crossing a send to a close changed the band and left the deed reading "Send
 * your full manuscript…" above a close fork. This is the translation, declared once.
 */
export const JOURNEY_DEED_BUCKET: Record<JourneyId, "send" | "decide" | "chase" | "close" | "fix" | "note"> = {
  send: "send",
  nudge: "chase",
  close: "close",
  fillin: "fix",
  note: "note",
  offer: "decide",
  agentgap: "fix",
  bulk: "fix",
};

/** A journey's declaration. Total over the union, so there is no absent case to handle. */
export const journeyOf = (id: JourneyId): Journey => JOURNEYS[id];

/** One intent, by id — `undefined` only for an id this journey does not offer. */
export const intentOf = (id: JourneyId, intentId: string): JourneyIntent | undefined =>
  JOURNEYS[id].fork.options.find((o) => o.id === intentId);

/**
 * The flow an intent opens, where the intent stays in this journey. A crossover has no flow HERE —
 * it swaps the journey — and returning `undefined` for one is what makes the caller say which it
 * is dealing with rather than guessing.
 */
export function flowFor(id: JourneyId, intentId: string): JourneyFlow | undefined {
  const intent = intentOf(id, intentId);
  if (!intent || intent.target.kind !== "flow") return undefined;
  return JOURNEYS[id].flows[intent.target.flow];
}

/**
 * ⚠️ A CROSSOVER CARRIES ITS REASON. Closing because a silence went on is `no_reply`; closing
 * because the writer decided not to send is `withdrawn`. Same destination flow, different fact —
 * and the writer is never asked to categorise their own disappointment, which is the whole point.
 *
 * Declared as a table rather than decided at the call site: a crossover that forgot to say why
 * would inherit the destination's own reason, which is exactly how a withdrawal would come to be
 * recorded as a silence.
 */
export interface Crossover {
  /** the fact the destination flow records, because the ORIGIN is what knows it */
  reason?: "no_reply" | "off_record" | "withdrawn";
  /**
   * ⚠️ THE VERB A CROSSOVER ARRIVES UNDER, where the contract gives it one.
   * `todo-two-journeys-full.html` draws both crossed closes with **"Close the query"** while the
   * close journey's own flow keeps **"Log the close"** — and the difference is real. Arriving at a
   * CLOSE TASK, you are recording a state the query has already reached; arriving from a send or a
   * nudge, you are ending it now. Same write, two acts, and the button says which.
   */
  primary?: string;
}

export const CROSSOVERS: Partial<Record<`${JourneyId}:${string}`, Crossover>> = {
  "send:wont": { reason: "withdrawn", primary: "Close the query" },
  "nudge:toclose": { reason: "no_reply", primary: "Close the query" },
  /* close → nudge carries no reason: nudging records a nudge, and its own flow asks its own
     questions. A `primary` would override a verb the destination already states correctly. */
  "close:nudgefirst": {},
};

/** the reason a crossover carries, where it carries one */
export const crossoverReason = (from: JourneyId, intentId: string): Crossover["reason"] =>
  CROSSOVERS[`${from}:${intentId}`]?.reason;

/** Every intent that leaves its journey, with where it goes — read by the receipt and by Go back. */
export function crossoverOf(id: JourneyId, intentId: string): JourneyId | undefined {
  const intent = intentOf(id, intentId);
  return intent && intent.target.kind === "journey" ? intent.target.journey : undefined;
}
