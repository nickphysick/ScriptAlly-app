/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The phone Agents tab's words for three agent facts (Phone app v2, Part 6). Each is null — or the door's own
 * "not known" — when the record does not say, so a missing fact is left out rather than shown as a dash.
 */
import { DOOR_NOT_KNOWN, doorOf } from "./agentList";
import { SubmissionMethod, type Agent } from "../types";

/** how they take submissions, in the ref's words; null when the record does not say */
export function howWords(m: SubmissionMethod | string | undefined | null): string | null {
  switch (m) {
    case SubmissionMethod.EMAIL: return "By email";
    case SubmissionMethod.ONLINE_FORM: return "Online form";
    case SubmissionMethod.QUERY_MANAGER: return "QueryManager";
    case SubmissionMethod.POST: return "By post";
    default: return null;
  }
}
/** the reply time as a fact ("6 weeks"); null when the record does not state one (0 is the quick-add stub) */
export const replyWords = (weeks: number | null | undefined): string | null => (weeks && weeks > 0 ? `${weeks} ${weeks === 1 ? "week" : "weeks"}` : null);
/** the door, three ways: never "Open" for a door nobody stated */
export const doorWords = (a: Pick<Agent, "submissionStatus">): string => {
  const d = doorOf(a);
  return d === "open" ? "Open to submissions" : d === "closed" ? "Closed to submissions" : DOOR_NOT_KNOWN;
};
