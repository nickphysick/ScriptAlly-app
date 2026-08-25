/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * paneGate — what each journey REQUIRES before its primary may write.
 *
 * ⚠️ ONE DECLARATION PER JOURNEY, EXHAUSTIVE, CLOSED WITH `never`. A new journey cannot be added
 * without saying what it requires: the switch below fails to compile until it does. That is the
 * guard the house rule asks for, and it is the opposite of the shape this codebase keeps closing —
 * a permissive default that ships every new kind with someone else's behaviour attached.
 *
 * ⚠️ AND THE REQUIREMENT IS A LIST OF FIELDS, NOT A BOOLEAN. "Is this complete?" cannot tell the
 * writer WHICH answer is missing, and the whole of the gate's behaviour — scroll to it, focus it,
 * flash its label — needs the field's identity. So the validator returns the first missing field's
 * key, and the pane finds it by `data-req`.
 *
 * ⚠️ THE GATE DOES NOT WRITE AND DOES NOT KNOW HOW. It runs pane-side, ahead of the same single
 * commit path the takeover uses; a gate that also committed would be a second write path, which is
 * the standing law in `ToDoPage.tsx` and the reason this file is pure.
 */
import { BoardCard } from "./todoBoard";
import { cardBucket } from "./todoBuckets";

/**
 * The journeys the pane draws. `bulk` is its own member rather than a flag on `fix`: the two are
 * the same BUCKET and completely different questions — one query's materials against a cohort's —
 * and folding them would make the required-fields table lie about one of them.
 */
export type JourneyKind = "send" | "decide" | "chase" | "close" | "fix" | "bulk" | "note";

/**
 * The keys the pane's labels carry as `data-req`, so the gate can find the field it names.
 *
 * ⚠️ THREE ARRIVED WITH THE FORK (journey round, Phase 1), and each is a question no journey could
 * ask before it had intents: `holdday` — "hold me to when?", the delay intents' only question;
 * `checkin` — "if nothing comes back…", the nudge's new clock; `again` — "ask you again…", the
 * close's leave-it-open. All three are REQUIRED by the flows that draw them, which is the point:
 * a delay with no date is not a delay, and a nudge with no check-in is the limbo recon found.
 */
export type ReqField =
  | "unit" | "when" | "expect" | "remind" | "rows"
  | "holdday" | "checkin" | "again";

/**
 * ⚠️ A REQUIREMENT IS DATA, AND FOUR SURFACES READ IT (steer round, Phase 1).
 *
 * The steer square (the first unanswered), the count chip (how many are unanswered), the missing
 * line (their NAMES) and the scroll target (the first unanswered again) are four statements about
 * one set. Before this they were four readings: a key, a boolean, a hand-written phrase and a
 * `data-req` lookup — which is four chances for the page to say "2 to answer" beside a square on a
 * section the line does not mention.
 *
 * They cannot disagree now because there is nothing to disagree with: one array, read four times.
 *
 * ⚠️ `name` IS THE WRITER'S PHRASE, NOT THE LABEL. The missing line reads "Still to answer: what
 * you're sending, when it went and your reminder" — a sentence — while the section's own label is
 * a mono heading ("WHAT ARE YOU SENDING?"). Splicing headings into prose produces a sentence
 * shouting in the middle, so the phrase is declared beside the id rather than derived from it.
 *
 * ⚠️ AND `id` IS THE SECTION'S DOM ANCHOR. It is what the square is set on and what the scroll
 * jumps to, so a requirement the gate can name is a section the pane can reach — by construction,
 * not by a second table.
 */
export interface Requirement {
  /** the section's DOM anchor — `s-unit`, `s-when`, … */
  id: string;
  /** the phrase the missing line uses, mid-sentence and lower case */
  name: string;
  /**
   * ⚠️ THE LEDGER'S OWN LABEL, AND IT IS A FIFTH READING OF THIS DECLARATION RATHER THAN A SECOND
   * TABLE (workspace round, Phase 3). The form is a ledger of fixed rows now — one row per required
   * answer — so the row's heading is a property of the requirement, beside the phrase the missing
   * line uses. Two registers, one entry: `name` is mid-sentence prose ("when it went"), `label` is
   * a heading ("When"), and splicing either into the other's place reads wrong.
   */
  label: string;
  /** the field key, kept so `data-req` and the answers map stay in step */
  field: ReqField;
  /** answered? — a predicate over the journey's own state */
  isAnswered: (a: GateAnswers) => boolean;
}

/** The declaration, one entry per requirable answer. `id` is the anchor the pane renders. */
const REQ: Record<ReqField, Omit<Requirement, "isAnswered">> = {
  unit:   { id: "s-unit",   name: "what you're sending",         label: "What you sent",  field: "unit" },
  when:   { id: "s-when",   name: "when it went",                label: "When",           field: "when" },
  expect: { id: "s-expect", name: "when you expect to hear back", label: "Reply expected", field: "expect" },
  remind: { id: "s-remind", name: "your reminder",               label: "Nudge reminder", field: "remind" },
  /* ⚠️ `rows` NEVER APPEARS IN A LEDGER, and it carries a label anyway because the record is
     exhaustive. A cohort's form is `BulkFillTable`, not a row of questions — there is no single
     field to open, which is the same reason its primary is the one that goes inert rather than
     pointing at a first missing answer. */
  rows:   { id: "s-rows",   name: "at least one query",          label: "The queries",    field: "rows" },
  /* the fork's own three — see `ReqField` for why each is required rather than defaulted */
  holdday: { id: "s-holdday", name: "when to be reminded",         label: "Hold me to when?", field: "holdday" },
  checkin: { id: "s-checkin", name: "when the app checks in",      label: "If nothing comes back…", field: "checkin" },
  again:   { id: "s-again",   name: "when to be asked again",      label: "Ask you again…",   field: "again" },
};

/**
 * ⚠️ REQUIREMENTS FROM A LIST OF FIELDS — the per-FLOW entry point (journey round, Phase 2). The
 * fork made "what does this journey require" a question with no answer: a close's *close it now*
 * needs a day and its *leave it open* needs a return date. The flow names its fields; this turns
 * them into the same `Requirement` objects the four surfaces have always read, so nothing
 * downstream learns that anything changed.
 */
export function requirementsOf(fields: readonly ReqField[]): Requirement[] {
  return fields.map((f) => ({ ...REQ[f], isAnswered: (a: GateAnswers) => a[f] }));
}

/** The journey's requirements, as data — the ONE list all four surfaces read. */
export function requirementsFor(kind: JourneyKind): Requirement[] {
  return requirementsOf(requiredFor(kind));
}

/**
 * The section a field lives in. Exported because the pane needs it to scroll, and because a second
 * copy of this map inside the component is what a restatement looks like — one that was also a
 * `const` read from a deferred callback, which threw `Cannot access before initialization` at
 * runtime with a clean typecheck. `tsc` cannot see a TDZ across a `setTimeout`.
 */
export const anchorFor = (f: ReqField): string => REQ[f].id;

/** Those still unanswered, in the form's own order. */
export const unanswered = (kind: JourneyKind, a: GateAnswers): Requirement[] =>
  requirementsFor(kind).filter((r) => !r.isAnswered(a));

/** The same, from a flow's own list — what the pane reads now the fork exists. */
export const unansweredOf = (fields: readonly ReqField[], a: GateAnswers): Requirement[] =>
  requirementsOf(fields).filter((r) => !r.isAnswered(a));

/** The first unmet requirement in a flow's own order, or `null` when it may commit. */
export function firstMissingOf(fields: readonly ReqField[], a: GateAnswers): ReqField | null {
  for (const f of fields) if (!a[f]) return f;
  return null;
}

/**
 * ⚠️ THE MISSING LINE'S GRAMMAR, BUILT ONCE. "a, b and c" — an Oxford-less list with "and" before
 * the last, and a bare phrase when there is one. Assembled here so the sentence cannot come out
 * differently on a journey with two requirements than on one with four.
 */
export function missingPhrase(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** A bulk card stands for a SET; every other fill-in stands for one query. */
export const isBulkCard = (c: BoardCard): boolean => c.taskType === "materials_unrecorded_bulk";

export function journeyKind(c: BoardCard): JourneyKind {
  const b = cardBucket(c);
  if (b === "fix" && isBulkCard(c)) return "bulk";
  return b;
}

/**
 * ⚠️ WHAT EACH JOURNEY REQUIRES, AND THE EMPTY LISTS ARE DECISIONS RATHER THAN GAPS.
 *
 * A NOTE requires nothing: ticking it off is the whole act, and the tick carries its own date.
 * A CHASE requires nothing here either — its own journey asks its own questions and this pane's
 * form has none to withhold. Both are stated as `[]` rather than omitted, because an omission
 * would be indistinguishable from having forgotten them.
 */
export function requiredFor(kind: JourneyKind): ReqField[] {
  switch (kind) {
    /* the parcel, the day, the expectation and the reminder — the four the send form asks */
    case "send": return ["unit", "when", "expect", "remind"];
    /* closing records a day and nothing else; there is no parcel and nothing to expect */
    case "close": return ["when"];
    /* one query's materials: the parcel, and the day it went */
    case "fix": return ["unit", "when"];
    /* a cohort: at least one row touched. There is no single field to scroll to — see the pane */
    case "bulk": return ["rows"];
    case "note": return [];
    case "decide": return [];
    case "chase": return [];
    default: {
      const unhandled: never = kind;
      return unhandled;
    }
  }
}

/** What the pane knows about the answers so far — supplied by the form, never read from the DOM. */
export interface GateAnswers {
  /** a unit chosen AND an amount in it — or a full manuscript, which has no unit to pick */
  unit: boolean;
  when: boolean;
  expect: boolean;
  remind: boolean;
  /** bulk: at least one row touched */
  rows: boolean;
  /** the delay intents' day — a delay with no date is not a delay */
  holdday: boolean;
  /** the nudge's next clock. Its "Don't ask again" answer counts as answered: it IS an answer. */
  checkin: boolean;
  /** the close's leave-it-open. "Stop asking about this one" likewise. */
  again: boolean;
}

/**
 * The first requirement the writer has not met, or `null` when the journey may commit.
 *
 * ⚠️ FIRST IN THE DECLARATION'S OWN ORDER, which is the order the form asks them in — so the field
 * the pane scrolls to is the first one going DOWN the page, not whichever the object happened to
 * enumerate first.
 */
export function firstMissing(kind: JourneyKind, a: GateAnswers): ReqField | null {
  for (const f of requiredFor(kind)) if (!a[f]) return f;
  return null;
}

export const gateOpen = (kind: JourneyKind, a: GateAnswers): boolean => firstMissing(kind, a) === null;
