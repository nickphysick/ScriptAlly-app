/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * D5 · what a close writes, pure (no Firebase): the answers, the noreply defaults, and the record the one
 * record-response path is given. `closeSave` writes it; the unit locks read it here.
 */
import type { EventKey } from "../../types";
import type { RecordResponseData } from "../recordResponse";
import { dayIso } from "./dates";

export type CloseWhy = "noreply" | "withdraw" | "gone";

export interface CloseAnswers {
  why: CloseWhy;
  /** the day it closed */
  on: Date;
  /** withdraw: why */
  wd: "offer" | "revise" | "other";
  /** withdraw: the agent has been told */
  told: boolean;
  /** withdraw: remind me to tell them */
  remindTell: boolean;
  /** gone: check on the agent later */
  recheck: "3m" | "6m" | "no";
  note: string;
}

/** a "No reply" close as the journey opens it: today, no note, the journey's own defaults for the rest */
export const noreplyAnswers = (today: Date): CloseAnswers =>
  ({ why: "noreply", on: today, wd: "offer", told: false, remindTell: true, recheck: "3m", note: "" });

/** what the record-response path is given for a close */
export function closeRecord(a: CloseAnswers): RecordResponseData {
  const key: EventKey = a.why === "noreply" ? "closed_no_reply" : a.why === "withdraw" ? "withdrawn" : "closed_agent_gone";
  return {
    responseType: "close",
    materialsType: "Pages", materialsQuantity: 0, materialsOtherText: "", expectedBy: "", sendReminderDate: "",
    dateReceived: dayIso(a.on), rrNotes: "", feedbackType: "Form", feedbackText: "", privateReflection: "", rejectionLesson: "",
    requeryPreference: "", offerDate: "", offerDeadline: "", offerNotes: "",
    closingReason: a.why === "noreply" ? "No response after expected window" : a.why === "withdraw" ? "Withdrew my submission" : "Agent no longer accepting queries",
    closingNotes: [a.why === "withdraw" ? `${{ offer: "An offer elsewhere", revise: "Revising the book", other: "Something else" }[a.wd]}` : "", a.note.trim()].filter(Boolean).join(" · "),
    eventKey: key,
    ...(a.why === "gone" ? { closeAs: "withdrawn" as const, closingToken: "agent_closed" } : {}),
  };
}

