/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE DRAWER'S HERO — its second line and its three chips.
 *
 * ⚠️ PORTED FROM `design-refs/todo-qc-style.html`, whose `renderAll()` builds the hero as
 * `<div class="title">deed</div><div class="line">situation + register</div><div class="chips">…`
 * with the chips reading manuscript · agent · wait. Phase 5 of the QC-chassis round built the
 * drawer's MECHANISM and not its ANATOMY: there was no hero at all, and the deed sat inside the
 * scrolling form as a plain document title.
 *
 * ⚠️ THE REGISTER SENTENCE IS THE REF'S OWN, VERBATIM, INCLUDING ITS PUNCTUATION. The curly
 * apostrophe and the em dash are part of the copy — this repo already has a standing rule that a
 * sentence which reads slightly better than the artefact it was signed off from no longer matches
 * it. Three journeys have one; three do not, and an absent register is an EMPTY STRING rather than
 * an invented sentence. `decide` (an offer, an R&R) has no verb in the contract at all, so it gets
 * no register — inventing one would be a claim about tone nobody has made.
 *
 * ⚠️ AND THE SITUATION CLAUSE IS THE TICKET'S OWN DERIVATION, NOT A SECOND ONE. `ticketFacts`
 * already answers "what happened, and when" for every bucket — `Asked on 1 August`, `Quiet since
 * 14 March 2024`, `Came in 3 September`. The hero states that pair as a sentence rather than
 * re-deriving it, so the drawer and the ticket behind it cannot come to disagree about the date.
 * The ref's own `.line` strings are hand-written per fixture row ("Jonathan Marsh asked for the
 * full on 2 April"), which is a thing a mockup can do and an app cannot.
 */
import type { TicketFacts } from "./ticketFacts";
import { EM_DASH } from "./ticketFacts";

/** the six buckets `ticketFacts` keys on — imported by name so the two cannot drift apart */
export type HeroBucket = "send" | "decide" | "chase" | "close" | "fix" | "note";

/**
 * The journey's register sentence — the contract's, character for character.
 *
 * ⚠️ AN ABSENT REGISTER IS `""`. The contract appends nothing for `Fix` or `Note`, and has no
 * `decide` verb; a default sentence here would be the app inventing a tone for a journey whose
 * tone nobody has set, which is the same fault as a default branch that writes.
 */
export const REGISTER: Record<HeroBucket, string> = {
  send: "It’s your turn.",
  chase: "Nudging is normal — the clock is yours.",
  close: "Closing is bookkeeping, not a verdict.",
  decide: "",
  fix: "",
  note: "",
};

/**
 * The situation clause: what happened and when, as a sentence.
 *
 * Returns `""` when there is no date on record — `ticketFacts` renders that as an em dash, and
 * "Asked on —." is a sentence with a hole in it. The chips still state the absence; the line
 * simply does not claim a date it has not got.
 */
export function heroSituation(facts: Pick<TicketFacts, "dateKey" | "dateValue">): string {
  if (!facts.dateValue || facts.dateValue === EM_DASH) return "";
  return `${facts.dateKey} ${facts.dateValue}.`;
}

/**
 * The wait chip: the span, in the ref's own order — value then label, lowercased ("7 weeks
 * waiting", "2½ years quiet"). With no span on record it reads `No date`, which is what the
 * contract prints for the same case.
 */
export function heroWait(facts: Pick<TicketFacts, "spanKey" | "spanValue">): string {
  if (!facts.spanValue || facts.spanValue === EM_DASH) return "No date";
  return `${facts.spanValue} ${facts.spanKey.toLowerCase()}`;
}

/**
 * The hero's second line: situation, then register.
 *
 * ⚠️ A CROSSOVER SUPPRESSES THE REGISTER, which is the contract's own rule (`TK.cross ? '' : …`).
 * The register is written for the journey you started in; after a crossover the deed above it
 * belongs to a different one, and a sentence saying "It's your turn" over a withdrawal would be
 * reassuring the writer about work they have just decided not to do.
 */
export function heroLine(
  bucket: HeroBucket,
  facts: Pick<TicketFacts, "dateKey" | "dateValue">,
  opts: { crossed?: boolean } = {},
): string {
  const situation = heroSituation(facts);
  const register = opts.crossed ? "" : REGISTER[bucket];
  return [situation, register].filter(Boolean).join(" ");
}
