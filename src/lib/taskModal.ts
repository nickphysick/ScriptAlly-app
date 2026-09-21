/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * taskModal — what the task modal asks, per journey, and what each answer writes
 * (task-modal round, 21 Sep; ref `task-modal.html`).
 *
 * ⚠️ THE CHANGE THIS ROUND MAKES IS NOT THE STYLING — IT IS THAT EVERY JOURNEY NOW ASKS. Until now
 * a tick COMMITTED on a send and on a nudge (`quickDone` with the defaults) and only asked on a
 * quiet card, where `QUIET_CHOICES` offered three. Nick's ruling, 21 Sep: *"a commit the user can't
 * see is a commit they don't trust. One click plus a visible confirmation is the price, and it's
 * the right price."* So the tick opens the modal and **only the modal writes** — which is why this
 * table is three answers per journey rather than one plus a special case.
 *
 * ⚠️ AND THE THIRD ANSWER ON EACH IS A WRITE THE OLD PATHS COULD NOT MAKE. A send card could not
 * close a query and a nudge card could not mute itself, because `commitFromPane` routes on the
 * CARD's journey — so values for a different verb land in the card's own arm. Both are explicit
 * `CommitRequest` kinds now (Nick: *"the seam wants a kind field that names the write, not the
 * card"*), which is the third time that seam has been asked for and the last time it should be.
 *
 * ⚠️ IT IS PURE AND IT STATES ONLY WHAT THE WRITE DOES. Every `records` line here is read by a
 * writer deciding which of three things to do, so it is a claim about the app's behaviour in the
 * same class as any other copy: "Adds a task" was in the ref for the feed's second answer and is
 * NOT here, because the board is already raising a card for that query and what the code does is
 * snooze it (Nick, 21 Sep: *"my copy assumed a case the board already handles"*).
 */
import { completionVia } from "./todoActions";
import type { BoardCard } from "./todoBoard";

/**
 * The three journeys the modal can finish.
 *
 * ⚠️ `page` IS THE FOURTH AND IT IS NOT A MODAL STATE. A housekeeping card is a gap in a record
 * that gets filled on the page where the gap is; the modal would have to host a takeover to offer
 * it, which is the thing `openFlow` exists to hand off. A door that meets one sends it to the page.
 */
export type ModalJourney = "sent" | "nudge" | "quiet";

/** the row's own classification, narrowed to what this modal can host */
export function modalJourney(card: BoardCard): ModalJourney | null {
  switch (completionVia(card)) {
    case "mark-sent": return "sent";
    case "log-nudge": return "nudge";
    case "close-query": return "quiet";
    default: return null;
  }
}

/**
 * What an answer does when the primary is pressed.
 *
 * ⚠️ NAMED FOR THE WRITE, NOT FOR THE CARD. `commit` is the journey's own completion — a send on a
 * send card, a nudge on a nudge card. The other three name themselves, so a reader of the modal can
 * see what a press will do without knowing which journey they are in.
 */
export type ModalWrite = "commit" | "close" | "snooze" | "mute";

export interface ModalAnswer {
  key: string;
  /** what the WRITER is doing, in their words */
  title: string;
  /** one line of why they would choose it */
  why: string;
  /** ⚠️ what the APP will do with it — see the header; this is a behavioural claim */
  records: string;
  write: ModalWrite;
  /** the glyph key; the component owns the drawing */
  ico: "dot" | "clock" | "minus" | "circle" | "part";
}

/**
 * ⚠️ THE QUIET SET IS `QUIET_CHOICES` MOVED HERE, WORD FOR WORD, and the ref reproduces it almost
 * exactly — same three titles, same glosses, same footers. That agreement is the reason to trust
 * the other two sets: the one journey that already asked, asked in these words, and the mockup
 * arrived at them independently.
 */
const ANSWERS: Record<ModalJourney, ModalAnswer[]> = {
  sent: [
    { key: "sent", title: "I’ve sent it", why: "Note what went, and set the clock.", records: "", write: "commit", ico: "dot" },
    { key: "later", title: "Not yet — hold me to it", why: "Pick a day and it comes back.", records: "Snoozes the task", write: "snooze", ico: "clock" },
    { key: "wont", title: "I’m not going to send it", why: "Record that, and close honestly.", records: "Closes the query", write: "close", ico: "minus" },
  ],
  nudge: [
    { key: "nudged", title: "I’ve nudged them", why: "Log the chase and set the next one.", records: "Records a nudge", write: "commit", ico: "circle" },
    { key: "later", title: "Not yet — remind me", why: "Pick a day and it comes back.", records: "Snoozes the task", write: "snooze", ico: "clock" },
    { key: "leave", title: "I’ll leave it", why: "Stop suggesting nudges for this one.", records: "Query unchanged", write: "mute", ico: "minus" },
  ],
  quiet: [
    { key: "close", title: "Close it, no reply", why: "Two nudges and nothing back. Record that.", records: "Closes the query", write: "close", ico: "minus" },
    { key: "nudge", title: "Nudge once more", why: "Logs a third nudge and resets the clock.", records: "Back to Queried", write: "commit", ico: "circle" },
    { key: "snooze", title: "Leave it a while", why: "Snooze it. Nothing changes on the query.", records: "Comes back later", write: "snooze", ico: "clock" },
  ],
};

/**
 * The three answers, with the send's first `records` line completed from the materials in question.
 *
 * ⚠️ THE SEND'S FIRST ANSWER IS THE ONE LINE THAT CANNOT BE A CONSTANT — it says "Records a full
 * sent" or "Records a partial sent", and which of those is a fact about the card. The ref draws
 * both, one per state, which is what a mockup does; here it is one table and one substitution.
 */
export function modalAnswers(journey: ModalJourney, partial: boolean): ModalAnswer[] {
  const base = ANSWERS[journey];
  if (journey !== "sent") return base;
  const word = partial ? "partial" : "full";
  return base.map((a) => (a.write === "commit" ? { ...a, records: `Records a ${word} sent`, ico: partial ? "part" : "dot" } : a));
}

/** the question above the three, in the mono line with the rust dot */
export const modalQuestion = (journey: ModalJourney): string =>
  journey === "quiet" ? "What would you like to do?" : "Where are you with it?";

/** the ink button's label — it says what pressing it does, never "Save" */
export function modalPrimaryLabel(journey: ModalJourney, answer: ModalAnswer): string {
  if (answer.write === "snooze") return "Snooze it";
  if (answer.write === "close") return "Close the query";
  if (answer.write === "mute") return "Stop suggesting it";
  return journey === "nudge" || answer.key === "nudge" ? "Log the nudge" : "Log as sent";
}

/**
 * The foot's mono line.
 *
 * ⚠️ IT IS LONGER THAN THE CARD'S OWN `records` ON PURPOSE, where there is more to say. The card is
 * read while choosing between three; this is read with one chosen, and it is the last thing before
 * a write. The nudge's *"the query stays Queried"* and the close's *"you can reopen it from
 * Closed"* are both the ref's, and both answer the question a writer has at that moment.
 */
export function modalFootLine(journey: ModalJourney, answer: ModalAnswer, partial: boolean): string {
  switch (answer.write) {
    case "close": return "This closes the query · you can reopen it from Closed";
    case "snooze": return "This only hides the task · nothing changes on the query";
    case "mute": return "This stops the suggestion · nothing changes on the query";
    default:
      return journey === "sent"
        ? `This records a ${partial ? "partial" : "full"} sent`
        : "This records a nudge · the query stays Queried";
  }
}

/** which form rows the chosen answer needs — the ref renders only the relevant ones */
export type ModalRow = "materials" | "when" | "expected" | "remind" | "method" | "again" | "closedAs" | "countsAs";

export function modalRows(journey: ModalJourney, answer: ModalAnswer): ModalRow[] {
  if (answer.write === "snooze" || answer.write === "mute") return [];
  if (answer.write === "close") return ["closedAs", "countsAs"];
  if (journey === "sent") return ["materials", "when", "expected", "remind"];
  return ["when", "method", "again"];
}

/**
 * The top-left tag.
 *
 * ⚠️ THE FEED'S TAG IS NOT A GROUP, AND THAT IS WHY IT IS A SEPARATE ANSWER RATHER THAN A FOURTH
 * GROUP NAME. The other three say which part of the board you are in; this one says you did not
 * come from the board at all, which is also why §4 gives it no prev/next and no counter.
 */
export function modalTag(journey: ModalJourney, fromFeed: boolean): { label: string; tone: "rose" | "sand" | "stone" } {
  if (fromFeed) return { label: "From the activity feed", tone: "rose" };
  if (journey === "nudge") return { label: "Worth a nudge", tone: "sand" };
  if (journey === "quiet") return { label: "Gone quiet", tone: "stone" };
  return { label: "Needs you now", tone: "rose" };
}

/**
 * The plain-words line under the title — "Asked 22 Aug · 26 days ago · it's your turn."
 *
 * ⚠️ IT OMITS WHAT IT DOES NOT KNOW RATHER THAN INVENTING A CLAUSE. An undated anchor drops the
 * date and the span and leaves the turn, which is still true; the alternative — a plausible date
 * derived from the nearest thing to hand — is the fault this repo records against `Added {date}`.
 */
export function modalWhen(
  journey: ModalJourney,
  anchorDate: string | null,
  days: number | null,
  nudges: number,
): string {
  const parts: string[] = [];
  if (anchorDate) parts.push(journey === "nudge" || journey === "quiet" ? `Queried ${anchorDate}` : `Asked ${anchorDate}`);
  if (days !== null) parts.push(`${days} ${days === 1 ? "day" : "days"} ago`);
  if (journey === "sent") parts.push("it’s your turn.");
  else if (nudges > 0) parts.push(`nudged ${nudges === 1 ? "once" : nudges === 2 ? "twice" : `${nudges} times`}.`);
  return parts.join(" · ");
}

/**
 * "Task n of N".
 *
 * ⚠️ IT MEANS THE LIST YOU CAME FROM, NEVER A GLOBAL (Nick, 21 Sep). The dashboard's board is
 * manuscript-scoped and capped and the To-do page's `dockable` is neither, so one number cannot
 * serve both — and on the dashboard it must never exceed what the card itself shows: **if the card
 * says "All 18" the modal never says "of 19"**. Each door passes its own ordered list, which is
 * what makes that true by construction rather than by two components agreeing.
 */
export const modalCounter = (index: number, total: number): string | null =>
  total > 1 && index >= 0 ? `Task ${index + 1} of ${total}` : null;
