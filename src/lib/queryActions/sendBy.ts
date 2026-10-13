/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The send-by date of a request, answered one way wherever it is asked (Query panel v2, ruling 3): the
 * response journey's own rule, shared by the edit journey's one-step variant and the correction desk's form.
 *
 *   mode   a week chip ("1w" · "2w" · "4w"), "custom" (a date of the writer's own), "none" (no date given: a
 *          reminder three working days on instead), or null — not answered, so nothing is written.
 *   remind "2d" · "1d" · "0" · "no" — how long before the date the reminder falls.
 *
 * It writes two fields and no others: `expectedSendDate` and `sendReminderDate`.
 */
import { deleteField, Timestamp } from "firebase/firestore";
import { addDays, dayIso, futureWeeks, offWeekend, type Anchor } from "./dates";

export const REMIND: [string, string, number | null][] = [["2d", "Two days before", -2], ["1d", "The day before", -1], ["0", "On the day", 0], ["no", "No reminder", null]];
export const SEND_BY_WEEKS: [string, string, number][] = [["1w", "In a week", 7], ["2w", "In two weeks", 14], ["4w", "In four weeks", 28]];

export interface SendByAnswer { weeks: Anchor[]; none: boolean; sendBy: Date | null; reminder: Date | null; noDateTask: Date }

export function sendByAnswer(today: Date, mode: string | null, custom: Date | null, remind: string): SendByAnswer {
  const weeks = futureWeeks(today, SEND_BY_WEEKS);
  const none = mode === "none";
  const sendBy: Date | null = !mode || none ? null : mode === "custom" ? custom : weeks.find((x) => x.k === mode)?.d ?? null;
  const remindOff = REMIND.find((r) => r[0] === remind)?.[2] ?? null;
  const noDateTask = offWeekend(addDays(today, 3));
  const reminder = none ? noDateTask : sendBy && remindOff !== null ? addDays(sendBy, remindOff) : null;
  return { weeks, none, sendBy, reminder, noDateTask };
}

const stamp = (x: Date) => Timestamp.fromDate(new Date(dayIso(x)));

/**
 * The fields the answer writes. `had` says which the query already carries, so one the answer drops is removed.
 * `clearDue`: "no date given" removes a recorded send-by date (the correction desk, where the writer can see
 * it); the one-step variant leaves it, as the response journey does.
 */
export function sendByFields(a: SendByAnswer, had: { due: boolean; reminder: boolean }, clearDue = true): Record<string, unknown> {
  const f: Record<string, unknown> = {};
  if (a.sendBy) f.expectedSendDate = stamp(a.sendBy);
  else if (a.none && had.due && clearDue) f.expectedSendDate = deleteField();
  if (a.reminder) f.sendReminderDate = stamp(a.reminder);
  else if (had.reminder) f.sendReminderDate = deleteField();
  return f;
}
