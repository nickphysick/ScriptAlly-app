/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * nudgeDraft — the ONE follow-up-nudge draft generator. A copyable starting point the writer pastes
 * into their OWN email client; ScriptAlly never sends anything. Extracted from NudgeModal so the
 * modal, the To-do drawer and the walkthrough share one text (no duplication). Deliberately brief +
 * warm; built only from what we know (agent first name + send date). Pure + unit-tested.
 */

export interface NudgeDraftInput {
  agentName?: string | null;
  dateSent?: string; // ISO
}

export function nudgeDraft(inp: NudgeDraftInput): string {
  const firstName = inp.agentName ? inp.agentName.split(" ")[0] : null;
  const sentPhrase = inp.dateSent
    ? `, sent on ${new Date(inp.dateSent).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`
    : "";
  return [
    `Dear ${firstName || "there"},`,
    "",
    `I hope this finds you well. I'm writing to gently follow up on my query${sentPhrase}. I remain very enthusiastic about the possibility of working together, and would be grateful for any update when you have a moment.`,
    "",
    "With thanks for your time,",
  ].join("\n");
}
