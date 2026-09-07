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
import { taskCategory, CATEGORY_TAG, CATEGORY_FAMILY } from "../../lib/todoCategory";
import type { TicketFacts } from "../../lib/ticketFacts";

/* ⚠️ THE SHAPE IS `lib/ticketFacts`'s, IMPORTED — not restated here. Two declarations of one
   record is how a field comes to mean different things at the two ends of it; the derivation owns
   the type, and this file renders whatever it produces. */
export const TaskTicket: React.FC<{
  card: BoardCard;
  facts: TicketFacts;
  manuscript?: string;
  selected?: boolean;
  urgent?: boolean;
  /** the status tint painted down the card's leading edge */
  edge: string;
  onOpen: () => void;
}> = ({ card, facts, manuscript, selected, urgent, edge, onOpen }) => {
  const cat = taskCategory(card);
  const cls = ["tkt", selected ? "sel" : "", urgent ? "urgent" : ""].filter(Boolean).join(" ");
  return (
    <button type="button" className={cls} onClick={onOpen} aria-pressed={!!selected}>
      {/* the edge is a child rather than a border, so the tint can be a flat fill the card's
          own radius clips — a bordered card cannot round one coloured side on its own */}
      <span className="edge" style={{ background: edge }} aria-hidden />
      <span className="in">
        <span className="top">
          <span className={"tag " + CATEGORY_FAMILY[cat]}>{CATEGORY_TAG[cat]}</span>
          {manuscript && <span className="msc">{manuscript}</span>}
        </span>
        <span className="ttl">{card.title}</span>
        <span className="facts">
          <span className="cell">
            <span className="k">{facts.dateKey}</span>
            <span className="v">{facts.dateValue}</span>
          </span>
          <span className="cell">
            <span className="k">{facts.spanKey}</span>
            <span className={facts.late ? "v late" : "v"}>{facts.spanValue}</span>
          </span>
        </span>
        <span className="tfoot">
          {card.who ? (
            <>
              <span className="av" aria-hidden>{card.initials}</span>
              <span className="n">{card.who}</span>
              {card.status && (
                <span className="qs">
                  <StatusDot status={card.status} overrideSize={11} />
                </span>
              )}
            </>
          ) : (
            /* ⚠️ WORDS, NOT AN EMPTY DISC — see the header. */
            <span className="n own">Your own note</span>
          )}
        </span>
      </span>
    </button>
  );
};
