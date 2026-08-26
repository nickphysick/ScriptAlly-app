/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * paneCommit — the pane form's answers, in the shape the committers already take.
 *
 * ⚠️ THIS EXISTS BECAUSE THE WRITE PATH ALREADY DID. `ToDoPage` holds a committer per journey, each
 * of which calls the same writer `FocusFlow` calls — and every one of them was UNREACHABLE, because
 * their entrance `commitFromPane` lost its caller when `PaneJourney.tsx` was deleted. The primary
 * opened the takeover instead, so the pane asked its questions and a second dialog asked them again.
 * What was missing was never a writer. It was this: the pane's own value shape translated into the
 * committers'.
 *
 * ⚠️ AND IT IS A TRANSLATION, NOT A DERIVATION. Nothing here decides anything the writer did not
 * say. Every field is either an answer they gave, or ABSENT — the one exception is stated at its
 * own site and is a value the app already states out loud elsewhere.
 */
import type { MaterialRow } from "./agentMaterials";
import { materialsWantedFromRows, materialRowsFromAgent } from "./agentMaterials";
import { agentWindowMs } from "./expectedDate";
import { DEFAULT_CHECKBACK_DAYS } from "./todoWalk";
import { SEND_METHODS, seedNotify, type JourneyKind, type JourneySendValues, type SendMethod } from "./paneJourney";
/**
 * ⚠️ A TYPE-ONLY IMPORT FROM THE COMPONENT, DELIBERATELY. `import type` is erased at compile time,
 * so this file gains no runtime dependency on React or on the pane — the thing the house rule about
 * `lib/` importing components is actually protecting against. The alternative was restating four
 * unions here, which is the fault this whole round is about: one declaration, read twice.
 */
import type { SendBodyValues, DayChoice, ExpectChoice, RemindChoice } from "../components/todo/TaskPaneBody";

/** local `YYYY-MM-DD`, matching `paneJourney.ymdLocal` — dates on this form are days, not instants */
const ymd = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** noon local, so a day never slides across a timezone boundary on its way to an ISO string */
const noonISO = (y: string): string => new Date(`${y}T12:00:00`).toISOString();

/**
 * The day the writer said, or `null`.
 *
 * ⚠️ `null` UNTIL THEY SAY, and that is the whole point of the function. It returned TODAY for an
 * unanswered When and for a revealed-but-empty "Another date…" alike — a real date standing in for
 * an unmade choice, which reads downstream exactly like an answer.
 */
export function paneSentYMD(when: DayChoice | null, now: Date): string | null {
  if (!when) return null;
  if (when.kind === "date") return when.ymd || null;
  const d = new Date(now.getTime());
  if (when.kind === "yesterday") d.setDate(d.getDate() - 1);
  return ymd(d);
}

/**
 * When they expect to hear, as an ISO instant — or `undefined`.
 *
 * ⚠️ THROUGH `agentWindowMs`, THE ONE PLACE A WINDOW BECOMES A DATE. The strip promises this number
 * and the record stores it; computing it twice is how a page comes to promise one date and write
 * another. A window with no send date to hang off resolves to nothing rather than to today.
 */
export function paneExpectISO(expect: ExpectChoice | null, sentYMD: string | null): string | undefined {
  if (!expect) return undefined;
  if (expect.kind === "date") return expect.ymd ? noonISO(expect.ymd) : undefined;
  if (!sentYMD) return undefined;
  const ms = agentWindowMs(new Date(noonISO(sentYMD)).getTime(), expect.weeks);
  return ms == null ? undefined : new Date(ms).toISOString();
}

/**
 * The reminder, resolved to an instant — or `undefined`.
 *
 * ⚠️ `No reminder` AND "never asked" BOTH RESOLVE TO ABSENT, and that is correct rather than lossy.
 * The difference between them lives in the form, not in the record: an app storing "the writer
 * declined a reminder" would be keeping a fact about a conversation rather than about a query.
 *
 * ⚠️ A LEAD WITH NO REPLY DATE TO HANG OFF IS NOT A DATE. Omitted, never guessed — the fault the
 * deed round removed one layer up, where "A custom date…" silently became a fortnight.
 */
export function paneNudgeISO(remind: RemindChoice | null, expectISO: string | undefined): string | undefined {
  if (!remind || remind.kind === "none") return undefined;
  if (remind.kind === "date") return remind.ymd ? noonISO(remind.ymd) : undefined;
  if (!expectISO) return undefined;
  return new Date(new Date(expectISO).getTime() - remind.days * 86400000).toISOString();
}

/**
 * ⚠️ WHICH JOURNEYS THE PANE CAN COMMIT — declared, exhaustive, closed with `never`.
 *
 * A journey commits in place only if the pane FORM ASKS ITS QUESTIONS. Two do not, and both keep
 * the takeover deliberately rather than by omission:
 *
 *   · `offer` — three branches (notify · decide · need time), none of which this form draws. Its
 *     committer needs a branch and a decision, and would silently write nothing without them.
 *   · `fix` (agent record gaps — NOT the materials fill-in) — response window, materials, wish
 *     list. The pane renders none of those fields, so its committer would find nothing to save.
 *
 * A permissive default here is the exact shape this codebase keeps closing: it would route a
 * journey the form cannot answer to a writer that then does nothing, silently, behind a button
 * that says it recorded something.
 */
export function paneCommits(kind: JourneyKind): boolean {
  switch (kind) {
    case "send": return true;
    case "chase": return true;
    case "close": return true;
    case "materials": return true;
    case "note": return true;
    case "offer": return false;
    case "fix": return false;
    default: {
      const unhandled: never = kind;
      return unhandled;
    }
  }
}

export interface PaneCommitInput {
  /**
   * ⚠️ WHICH OF THE THREE WAYS THIS QUERY ENDED — supplied by the journey the writer came from, and
   * never asked of the writer. See the note at `reason` below.
   */
  closeReason?: "no_reply" | "off_record" | "withdrawn";
  /**
   * ⚠️ `"bulk"` IS NOT A `JourneyKind`, AND SAYING SO IS THE POINT. `paneJourneyKind` predates the
   * cohort table and has no member for it; the cohort is decided by the CARD, and its committer
   * reads the page's row state rather than these values. Naming it here rather than passing a
   * neighbouring kind keeps the object from claiming to be a journey it is not.
   */
  kind: JourneyKind | "bulk";
  body: SendBodyValues;
  /** the query's own send method, where the record has one */
  queryMethod?: string;
  now: Date;
}

/**
 * The pane's answers as `JourneySendValues` — the shape every committer already takes.
 *
 * ⚠️ THE ONE STATED DEFAULT IS THE CHASE'S CHECK-BACK, and it is stated rather than invented:
 * `DEFAULT_CHECKBACK_DAYS` is the value the quick rail already writes and the takeover already
 * opens on. The pane does not ask the question — its chase form has no check-back control — so the
 * honest options were this shared default or refusing to commit a chase at all. A second number
 * here would be a second answer to "when does a nudge come back".
 *
 * ⚠️ AND THE CLOSE'S REASON IS FIXED BECAUSE THE JOURNEY IS. The close bucket is exactly
 * `no_response_close` — one task type, one outcome — and the pane's own strip says so on screen
 * before the press: "Closed as no response". Supplying `no_reply` makes the write agree with the
 * sentence the writer read; leaving it null would make the primary do nothing.
 */
export function paneCommitValues(inp: PaneCommitInput): JourneySendValues {
  const { body, kind, now } = inp;
  const sent = paneSentYMD(body.when, now);
  const expectISO = paneExpectISO(body.expect, sent);
  const method: SendMethod =
    SEND_METHODS.find((x) => x.toLowerCase() === String(inp.queryMethod ?? "").toLowerCase()) ?? "Email";

  return {
    /* the parcel: the ticked rows, encoded by the one encoder the record already uses */
    materials: materialsWantedFromRows(body.rows),
    /* "Anything else going with it?" travels WITH the parcel — the committer appends it to materials */
    also: body.alongside,
    method,
    /**
     * ⚠️ A CHASE HAS NO REQUIRED DAY AND ITS COMMITTER NEEDS ONE, SO THE DAY IS TODAY.
     *
     * Measured, not reasoned: an empty string reached `commitChaseFromPane`, which builds the
     * check-back with `new Date("" + "T12:00:00")` — an Invalid Date whose `.toISOString()` THROWS.
     * The throw landed in an async callback nobody awaited, so the primary wrote nothing, said
     * nothing, and left the card exactly where it was. Silent, and indistinguishable from a button
     * that does not work.
     *
     * Today is the value the quick rail already stamps (`quickNudgePayload`'s `nowIso`) for the
     * same act, so this is the shared default rather than a second answer — and the form still
     * renders its When section, so a writer who names a day is recorded on that day instead.
     *
     * ⚠️ EVERY OTHER JOURNEY KEEPS THE EMPTY STRING, deliberately. `send`, `close` and `fix` all
     * require a day or never read one, so a fallback there would put a date in the record that
     * nobody chose — which is the fault this pane exists to remove.
     */
    sentDate: sent ?? (kind === "chase" ? ymd(now) : ""),
    /* "Anything else? OPTIONAL" is the remembered note, not part of the parcel */
    note: body.also,
    checkBackDays: DEFAULT_CHECKBACK_DAYS,
    /**
     * ⚠️ THE CLOSE'S REASON IS THE JOURNEY'S NOW, NOT A CONSTANT (journey round, Phase 4).
     *
     * This read `kind === "close" ? "no_reply" : null` — a hard-coded reason — so every close from
     * the pane recorded a NO-RESPONSE whatever the writer had meant, while `CLOSE_REASONS` was
     * fully able to express all three and `commitCloseFromPane` already routed through it. The
     * plumbing was complete and unused.
     *
     * It arrives from the FORK: crossing from the send journey's "I'm not going to send it" is a
     * WITHDRAWAL, crossing from the nudge's "time to close" is a silence, and the close task itself
     * is a silence. The default stays `no_reply` for a caller that supplies none, because that is
     * the close bucket's own meaning — but a caller that knows is now able to say.
     */
    reason: kind === "close" ? (inp.closeReason ?? "no_reply") : null,
    /* the agent-gaps fields — the pane asks none of them, which is why `paneCommits("fix")` is false */
    fixResponseWeeks: "",
    fixNoMeansNo: false,
    fixMaterials: [],
    fixMswl: "",
    /* the fill-in journey writes from the ROWS themselves, in the app's own material model */
    recordRows: body.rows,
    /* the offer branch — untouched here for the same reason as the gaps, and never defaulted */
    branch: null,
    decision: null,
    remindDate: "",
    ...seedNotify(),
    /* the two answers that had no home on this interface until the pane collected them */
    ...(expectISO ? { writerExpectedDate: expectISO } : {}),
    ...(() => {
      const n = paneNudgeISO(body.remind, expectISO);
      return n ? { nudgeDate: n } : {};
    })(),
  };
}

/** re-exported so a caller needs one import to build the rows a blank form starts from */
export const blankMaterialRows = (): MaterialRow[] => materialRowsFromAgent([]);
