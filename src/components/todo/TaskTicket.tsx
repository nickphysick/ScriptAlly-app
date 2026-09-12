/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE TICKET — one task as a card (QC-chassis round, Phase 3; ref `todo-qc-style.html` `.card`).
 *
 * ⚠️ THE TITLE IS INTER 600, AND THE REF DISAGREES WITH ITSELF ABOUT IT. `todo-qc-style.html`
 * declares `.card .ttl` TWICE — Inter 14.5/600, then Playfair 18/500 two hundred lines later — so
 * the artefact RENDERS Playfair while the brief specifies Inter 600. The brief is a reasoned value
 * in prose and wins under the house rule; recorded here as well as in the round report because a
 * reader diffing the ref against this file will find the difference and think it a mistake.
 *
 * ⚠️ THE EDGE IS THE QUERY'S STATUS, AND NOTHING ELSE CARRIES IT. The card has no `StatusDot` in
 * its body: the dot is in the foot, where the ref puts it, and the edge is the same fact as a
 * colour. Two dots on one card would say one thing twice — the fault this repo already records
 * against the calendar's markers and the agent list's attention pills.
 *
 * ⚠️ AND A CARD WITH NO AGENT SAYS SO IN WORDS. The ref's foot reads "Your own note" where there
 * is no agent rather than drawing an empty avatar — an absent person is a fact, and a blank disc
 * is a person the app failed to name.
 */
import React from "react";
import "./taskTicket.css";
import "./urgentMotion.css";
import { BoardCard } from "../../lib/todoBoard";
import { StatusDot } from "../StatusDot";
import { getStatusLabel } from "../StatusPill";
import { taskCategory, CATEGORY_TAG, CATEGORY_FAMILY } from "../../lib/todoCategory";
import { OWN_NOTE_LINE, type TicketFacts } from "../../lib/ticketFacts";

/* ⚠️ THE SHAPE IS `lib/ticketFacts`'s, IMPORTED — not restated here. Two declarations of one
   record is how a field comes to mean different things at the two ends of it; the derivation owns
   the type, and this file renders whatever it produces. */
/**
 * ⚠️ `snipped` IS A VARIANT, NOT A SECOND TICKET (dashboard redesign, Phase 5). The dashboard's
 * panel is a WINDOW onto the To-do page, so it renders this component with three of its four rows
 * dropped — tag and headline only — rather than a look-alike that would drift from it on the first
 * restyle. Both tinted regions are unchanged and still come from different functions: the edge from
 * `stateFor`, the tag from `CATEGORY_FAMILY`.
 *
 * ⚠️ AND `facts` STAYS REQUIRED. A snipped ticket does not render them, so making the prop optional
 * would let a caller mount one with no facts at all and then discover, on the day the panel wants a
 * date, that its cards were built without one. The derivation is cheap and the shape is the point.
 *
 * ⚠️ THE HEADLINE IS THE ACT WHERE THE CARD HAS A FOOTER, AND THE CARD'S OWN TITLE WHERE IT HAS NOT
 * (list round, Phase 4 — this SUPERSEDES the note that said it was the title in both variants). The
 * contract's card names the person once, in its foot, so the To-do grid's headline is the short deed
 * and the agent's name appears only below it; the dashboard's snipped panel drops the foot, so there
 * the title — which carries the name — is the only place a reader could learn who it is about.
 *
 * It is still the SHORT deed, never `deedSentence`: a grid of tickets is a column of headlines, and
 * `taskDeed`'s own docstring says a column of forty sentences is unreadable. Full sentences stay in
 * the drawer's header.
 */
export const TaskTicket: React.FC<{
  card: BoardCard;
  facts: TicketFacts;
  /**
   * ⚠️ THE TITLE IS THE ACT, AND THE HOST SUPPLIES IT (list round, Phase 4). `card.title` names the
   * agent — "Send your full to Jonathan Marsh" — and the contract's card names the person ONCE, in
   * its footer. So the To-do grid hands in `listTaskText`, the same expression the list's Task cell
   * prints, and the dashboard's snipped panel — which has no footer to name anybody — keeps the
   * card's own title. One derivation, two hosts, no fork.
   */
  deed?: string;
  /** the agency, beneath the agent's name in the foot — the row's own accessor, handed down */
  agency?: string;
  /** the card's verb, quiet in the foot until the card is hovered (`ticketVerb`) */
  verb?: string;
  manuscript?: string;
  selected?: boolean;
  urgent?: boolean;
  /** the status tint painted down the card's leading edge */
  edge: string;
  /** the dashboard's cut: the tag and the headline, and nothing else */
  snipped?: boolean;
  /**
   * ⚠️ THE REF-DIFF HARNESS'S TEXT HANDLE, AND A PROP RATHER THAN A FIXED ATTRIBUTE. This
   * component renders on the dashboard AND on `/todo`, and every workspace page stays mounted —
   * a hardcoded `data-probe-text` would put two of it in one document, and the harness would
   * read whichever came first. The caller that is being measured names itself.
   */
  probeText?: string;
  onOpen: () => void;
}> = ({ card, facts, deed, agency, verb, manuscript, selected, urgent, edge, snipped, probeText, onOpen }) => {
  const cat = taskCategory(card);
  const cls = ["tkt", snipped ? "snip" : "", selected ? "sel" : "", urgent ? "urgent" : ""].filter(Boolean).join(" ");
  return (
    <button type="button" className={cls} onClick={onOpen} aria-pressed={!!selected}>
      {/* the edge is a child rather than a border, so the tint can be a flat fill the card's
          own radius clips — a bordered card cannot round one coloured side on its own */}
      <span className="edge" style={{ background: edge }} aria-hidden />
      <span className="in">
        <span className="top">
          <span className={"tag " + CATEGORY_FAMILY[cat]}>{CATEGORY_TAG[cat]}</span>
          {!snipped && manuscript && <span className="msc">{manuscript}</span>}
          {/* ⚠️ THE STATUS SITS BESIDE THE TAG NOW (list round, Phase 4) — the contract's own top
              line: the card's two words about the query, together, where the foot is the person. */}
          {!snipped && card.status && (
            <span className="qs">
              <StatusDot status={card.status} overrideSize={12} />
              {getStatusLabel(card.status)}
            </span>
          )}
        </span>
        <span className="ttl" data-probe-text={probeText}>{(!snipped && deed) || card.title}</span>
        {!snipped && <span className="facts">
          <span className="cell">
            <span className="k">{facts.dateKey}</span>
            <span className="v">{facts.dateValue}</span>
          </span>
          <span className="cell">
            <span className="k">{facts.spanKey}</span>
            <span className={facts.late ? "v late" : "v"}>{facts.spanValue}</span>
          </span>
        </span>}
        {/* ⚠️ THE FOOT IS THE PERSON (list round, Phase 4) — the agent's name and their agency
            beneath it, with the card's verb at the right. The status left for the top line, so the
            name is said once on the card and the title never says it at all. */}
        {!snipped && <span className="tfoot">
          {card.who ? (
            <>
              <span className="av" aria-hidden>{card.initials}</span>
              <span className="n">{card.who}{agency && <small>{agency}</small>}</span>
            </>
          ) : (
            /* ⚠️ WORDS, NOT AN EMPTY DISC — see the header. The writer's own item wears the family's
                pencil and says what finishes it, which is the contract's own line. */
            <>
              <span className="av yours" aria-hidden>{"\u270e"}</span>
              <span className="n">Your own note<small>{OWN_NOTE_LINE}</small></span>
            </>
          )}
          {/* ⚠️ A LABEL, NOT A CONTROL. The card IS the button; a nested one would be invalid markup
              and a second place to press for the same thing. */}
          {verb && <span className="go">{verb}</span>}
        </span>}
      </span>
    </button>
  );
};
