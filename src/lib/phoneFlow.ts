/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PHONE APP v2, PART 4 — the flow layout's words. Pure.
 *
 * A journey's steps keep their own titles everywhere else (the desktop drawer's stepper, its review, the parked chip).
 * On a phone each step is asked as a question in a sentence, with the agent by first name (the ref's pattern, FLOWS in
 * design-refs/phone-app-v2/src/flows.js). The MEANING is the journey's: a step the ref does not have keeps its own
 * title as the question, and a step the app does not have is never invented here.
 */

export type FlowMode = "log" | "resp" | "sent" | "nudge" | "close" | "offer" | "edit" | string;

/** "Hannah Cole" → "Hannah"; an empty name reads "the agent" */
export const firstOf = (name: string | null | undefined): string => (name ?? "").trim().split(/\s+/)[0] || "";

/**
 * The question a step is asked as on the phone. `title` is the journey's own step title; `first` the agent's first
 * name ("" before one is chosen). Unknown titles come back as themselves.
 */
export function phoneQuestion(mode: FlowMode, title: string, first: string): string {
  const who = first || "the agent";
  const T: Record<string, string> = {
    /* log a query */
    "Agent and book": "Who did you query?",
    "Sending": first ? `When and how did it go to ${first}?` : "When and how did it go?",
    "What you sent": `What did you send ${who}?`,
    "Response expectations": "When should we expect a reply?",
    "If they don't reply": `If ${who} doesn’t reply?`,
    /* record a response */
    "The response": `What did ${who} say?`,
    "What they asked for": `What did ${who} ask for?`,
    "What they'd like revised": `What would ${who} like revised?`,
    "When you'll send it by": "When will you send it?",
    "When you'll resubmit by": "When will you resubmit?",
    "Feedback": "Anything to remember?",
    "The query": "Who replied?",
    /* mark sent */
    "The request": `What did ${who} ask for?`,
    "What you're sending": `What did you send ${who}?`,
    "Sending it": "When and how did it go?",
    "Reading window": "When should we expect a reply?",
    /* nudge */
    "The nudge": `When did you nudge ${who}?`,
    "If it's still quiet": "If it’s still quiet?",
    "When to nudge": `When will you nudge ${who}?`,
    /* close */
    "Where it stands": mode === "close" ? `Why are you closing ${first ? `${first}’s` : "this"} query?` : "Where it stands",
    "Calling it": "When are you calling it?",
    "Withdrawing": "Why, and when?",
    "Their status": `When did ${who} pass?`,
    /* the offer */
    "The offer": mode === "offer" ? `What has ${who} offered?` : `What did ${who} offer?`,
    "The others": "Who else has it?",
    "The call": `How did the call with ${who} go?`,
    "Your decision": "What have you decided?",
    /* correct the record */
    "Set a send-by date": "When will you send it?",
    "Edit an entry": "Which entry needs correcting?",
  };
  return T[title] ?? title;
}

/** the check card's heading (the ref's "Look right?") */
export const CHECK_QUESTION = "Look right?";

/**
 * Log a query has no steps past the first until an agent is chosen (`view.ok`), so its card names the slots to come in
 * the journey's own step titles. Kept beside LogJourney's titles: a renamed step there leaves this placeholder stale,
 * which phoneFlow.test.ts checks against the source.
 */
export const LOG_SLOTS = ["Sending", "What you sent", "Response expectations", "If they don't reply"] as const;
