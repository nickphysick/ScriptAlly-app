/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * paneJourney — the in-pane journey's PURE model (Item 9, Phase 2; ref
 * design-refs/todo-journey-in-pane.html).
 *
 * ⚠️ THE JOURNEY RENDERS INSIDE THE CARD, AND THAT IS THE WHOLE POINT OF THE MOVE. It was a
 * full-viewport takeover mounted from `FocusFlow`; the card's body becomes the form instead, so
 * nothing overlays and nothing has to be dismissed. The band stays above it the entire time, so the
 * writer never loses who they are recording against.
 *
 * ⚠️ AND IT REMOVES THE `inert` SEAL RATHER THAN PATCHING IT. `useOverlay`'s `sealBackground()`
 * puts `inert` on `#root` on the stated premise that overlays portal to `document.body`; `FocusFlow`
 * does not portal, so the takeover sealed ITSELF and every control inside it was unreachable by
 * pointer and by keyboard — measured, `elementsFromPoint` at the primary's own centre returning
 * `[body, html]`. A journey that is not an overlay cannot have that fault.
 *
 * ⚠️ NOTHING HERE WRITES. The page already owns the send: `quickSendPayload` → `markSentWriteArgs`
 * → `recordMaterialsSent`, with `undoQueryStatus` as its inverse. This model only decides what the
 * writer has said; the same one write path performs it, so the journey and the quick ✓ cannot come
 * to record different things.
 */

/** What the writer has said, once the four steps are answered. */
export interface JourneySendValues {
  /** The material rows they left ticked — labels, in the order the card states them. */
  materials: string[];
  /** Free text from "Anything else?" — a covering line, a note on the changes. */
  also: string;
  /** How it went. */
  method: SendMethod;
  /** The day it went, `YYYY-MM-DD`. */
  sentDate: string;
  /** "Anything to remember" — optional, and optional means optional. */
  note: string;
}

export type SendMethod = "Email" | "Agency portal" | "Post";

/**
 * ⚠️ THE THREE THE REF DRAWS, AND NO "OTHER". A fourth free-text channel would be a field nothing
 * downstream reads — `recordMaterialsSent` has no home for the method at all, and the quick path
 * already stores it only for the receipt's wording.
 */
export const SEND_METHODS: readonly SendMethod[] = ["Email", "Agency portal", "Post"] as const;

/** `YYYY-MM-DD` for a Date, in LOCAL time — never `toISOString`, which is UTC and slips a day. */
export function ymdLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * The journey's opening state.
 *
 * ⚠️ THE MATERIALS OPEN TICKED, because the card states them as a RECORD of what is on file and the
 * journey is confirming rather than choosing from nothing. Untick is the writer correcting it.
 *
 * ⚠️ AND THE METHOD OPENS ON THE QUERY'S OWN, where the record holds one. Defaulting to Email when
 * the record says Post would be the app quietly overwriting a fact it already had.
 */
export function openSend(materials: string[], queryMethod: string | undefined, now: Date): JourneySendValues {
  const m = SEND_METHODS.find((x) => x.toLowerCase() === String(queryMethod ?? "").toLowerCase());
  return { materials: [...materials], also: "", method: m ?? "Email", sentDate: ymdLocal(now), note: "" };
}

/** Which of the three "when" segments a date corresponds to — `other` for anything else. */
export type WhenMode = "today" | "yesterday" | "other";

export function whenMode(sentDate: string, now: Date): WhenMode {
  if (sentDate === ymdLocal(now)) return "today";
  const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  return sentDate === ymdLocal(y) ? "yesterday" : "other";
}

/** "12 Aug" — the chosen day on the relabelled segment. */
export function shortDay(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00`);
  return Number.isNaN(d.getTime()) ? ymd : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/**
 * ⚠️ THE SUMMARY ASSEMBLES FROM WHAT IS ANSWERED, AND STATES NOTHING ELSE. It is the sentence the
 * writer is about to commit, so every clause in it has to be one they actually gave: no materials
 * ticked and it says so plainly rather than naming a default they did not choose.
 *
 * ⚠️ AND IT IS A SENTENCE, NOT A FIELD LIST. "Recording the partial, sent by email today" reads as
 * the thing being done; "Materials: partial / Method: email / Date: today" is a form talking about
 * itself.
 */
export function sendSummary(v: JourneySendValues, now: Date): string {
  const things = [...v.materials, ...(v.also.trim() ? [v.also.trim()] : [])];
  const what = things.length ? things.join(", ") : "nothing marked as going";
  const mode = whenMode(v.sentDate, now);
  const when = mode === "today" ? "today" : mode === "yesterday" ? "yesterday" : `on ${shortDay(v.sentDate)}`;
  return `Recording ${what}, sent by ${v.method.toLowerCase()} ${when}.`;
}

/**
 * ⚠️ THE COMMIT IS ONLY BLOCKED BY A DATE, and deliberately by nothing else. A writer who sent an
 * empty covering email with nothing attached is recording a real thing; a writer with no date is
 * recording an event that did not happen on any day. Materials are a record, not a requirement —
 * the same reason the card marks them rather than asking.
 */
export function canCommitSend(v: JourneySendValues): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(v.sentDate);
}
