/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The answer deck (onboarding v9; ref design-refs/onboarding-v9, mock option A): the review's
 * questions, one card at a time, on both the agents and the queries steps.
 *
 * IT DRAWS AND IT MOVES; IT DECIDES NOTHING. What is asked, what counts as an answer and what is
 * written are the review's (`SmartImportReview`) and the gate's (`lib/reviewGate`). The deck is
 * handed its cards with an `answered` flag each, and keeps one number of its own: which card is
 * on show.
 *
 * WHEN A QUESTION IS ANSWERED THE DECK MOVES TO THE NEXT OPEN ONE BY ITSELF. Answered cards stay
 * in the deck (their dot turns cream), so the arrows and the dots can go back to one and change
 * it. The deck pops in once; moving between cards rises the new card in place.
 *
 * The arrows hide below 820px, where the dots (always pressable) are the way to move.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useIsMobile } from "../../shell/mobileChrome";
import { useSetupFootHost } from "../SetupFrame";
import { Chip, Disc } from "../ImportParts";
import "./onbV9.css";

export interface DeckCard {
  key: string;
  initials: string;
  /** "agency" draws the stone disc of a row with no agent name. */
  tone?: "live" | "agency";
  name: string;
  sub: string;
  chip: string;
  answered: boolean;
  /** The question and its answers, or (once answered) what was said and the way to change it. */
  body: React.ReactNode;
}

export const DECK_TITLE = "Needs an answer";
export const DECK_QUESTIONS = "Questions";

const firstOpen = (cards: DeckCard[], from = 0): number => {
  for (let k = 0; k < cards.length; k++) { const i = (from + k) % cards.length; if (!cards[i].answered) return i; }
  return Math.min(from, Math.max(0, cards.length - 1));
};

export const ReviewDeck: React.FC<{
  cards: DeckCard[];
  /** The step's FAQ, shown under the head when "Questions" is pressed. */
  faq: React.ReactNode;
}> = ({ cards, faq }) => {
  const [at, setAt] = useState(() => firstOpen(cards));
  const isMobile = useIsMobile();
  const [faqOpen, setFaqOpen] = useState(false);
  const i = Math.min(at, cards.length - 1);
  const card = cards[i];

  /* The card on show has just been answered: go to the next open one, IN THE SAME RENDER. Done in
     an effect it painted the answered card for a frame first, and anything reading the deck in
     that frame saw a question with no answers on it. Only the change from open to answered moves
     the deck, so going BACK to an answered card with an arrow stays put. */
  const [seen, setSeen] = useState<{ key: string; answered: boolean } | null>(card ? { key: card.key, answered: card.answered } : null);
  if (card && (!seen || seen.key !== card.key || seen.answered !== card.answered)) {
    if (seen && seen.key === card.key && !seen.answered && card.answered && cards.some((c) => !c.answered)) {
      const next = firstOpen(cards, i + 1);
      setAt(next);
      setSeen({ key: cards[next].key, answered: cards[next].answered });
    } else {
      setSeen({ key: card.key, answered: card.answered });
    }
  }

  if (!card) return null;
  if (isMobile) return <PhoneDeck cards={cards} at={i} setAt={setAt} />;
  return (
    <section className="o9-deck o9-pop" data-im="deck" aria-label={DECK_TITLE}>
      <div className="o9-deckhead" data-im="deck-head">
        <b>{DECK_TITLE}</b>
        <span className="o9-deckpos" data-im="deck-pos">{i + 1} of {cards.length}</span>
        <button type="button" className="sf-link o9-decklink" aria-expanded={faqOpen} onClick={() => setFaqOpen((o) => !o)} data-im="deck-questions">{DECK_QUESTIONS}</button>
        <div className="o9-dots" data-im="deck-dots">
          {cards.map((c, k) => (
            <button
              key={c.key} type="button" className={`o9-dot${k === i ? " is-on" : c.answered ? " is-done" : ""}`}
              aria-label={`Question ${k + 1} of ${cards.length}${c.answered ? ", answered" : ""}`} aria-current={k === i ? "true" : undefined}
              data-state={k === i ? "on" : c.answered ? "done" : "open"} onClick={() => setAt(k)}
            />
          ))}
        </div>
      </div>
      {faqOpen && <div className="o9-deckfaq" data-im="deck-faq">{faq}</div>}
      <div className="o9-deckbody">
        <button type="button" className="o9-deckarrow" disabled={i === 0} aria-label="Previous question" onClick={() => setAt(i - 1)} data-im="deck-prev">‹</button>
        <div className="o9-qcard o9-rise" key={card.key} data-im="deck-card" data-card={card.key} data-answered={card.answered ? "1" : "0"}>
          <div className="o9-qwho">
            <Disc initials={card.initials} tone={card.tone ?? "live"} />
            <div><b>{card.name}</b><small>{card.sub}</small></div>
            <Chip hot={!card.answered} data-im="deck-chip">{card.chip}</Chip>
          </div>
          {card.body}
        </div>
        <button type="button" className="o9-deckarrow" disabled={i === cards.length - 1} aria-label="Next question" onClick={() => setAt(i + 1)} data-im="deck-next">›</button>
      </div>
    </section>
  );
};

/* ═══ The deck on a phone (set-up on phones v1, board 2 2B + 3B; DOCS.headB, askB) ═══
   On the step: a navy-headed card showing the first open row and "Answer this". Answering opens one
   question per screen — the row as a card in a navy band, then the SAME `card.body` (the deck's own
   `DeckQuestions` component, its field, its answers, its handlers) in the sheet below, with "Save and
   next" and "Skip" pinned at the foot. "Save and next" presses the question's own save button;
   "Skip" moves on and leaves it unanswered, as the deck's arrow does. The deck's same-render advance
   (above) moves to the next open card the moment an answer lands, so nothing here moves it.
   ⚠️ A LOCAL LAYOUT, AND A LIFT CANDIDATE: phone app v2's `PhoneFlowShell` is built round a query
   journey's `JourneyView` (court, day, saves), and the deck is not one. */
const PhoneDeck: React.FC<{ cards: DeckCard[]; at: number; setAt: (i: number) => void }> = ({ cards, at, setAt }) => {
  const [open, setOpen] = useState(false);
  const host = useSetupFootHost();
  const bodyRef = useRef<HTMLDivElement>(null);
  const [hasSave, setHasSave] = useState(false);
  const card = cards[at];
  const left = cards.filter((c) => !c.answered).length;
  useLayoutEffect(() => { setHasSave(!!bodyRef.current?.querySelector(".o9-ans > .sf-btn")); });
  /* Everything answered: the question screen has done its job. */
  useEffect(() => { if (open && left === 0) setOpen(false); }, [open, left]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); setOpen(false); } };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open]);
  const first = cards.find((c) => !c.answered) ?? card;
  const kind = (c: DeckCard) => (c.key.startsWith("q-") ? "Query" : "Agent");
  const layer = open && card && (
    <div className="o9-ql" role="dialog" aria-modal="true" aria-label={DECK_TITLE} data-im="q-layer">
      <div className="o9-qlband">
        <div className="o9-qlrow">
          <button type="button" className="o9-qlback" onClick={() => setOpen(false)} data-im="q-back">‹ Review</button>
          <span className="o9-qlpos" data-im="q-pos">{at + 1} of {cards.length}</span>
        </div>
        <div className="o9-qlcard" data-im="q-card" data-card={card.key}>
          <div className="o9-qlcb"><span>{card.answered ? "Answered" : DECK_TITLE}</span><span>{kind(card)}</span></div>
          <div className="o9-qlca">
            <Disc initials={card.initials} tone={card.tone ?? "live"} />
            <span><b>{card.name}</b><small className="o9-qlgap">{card.chip}</small></span>
          </div>
          <div className="o9-qlcf"><span>{card.sub}</span></div>
        </div>
      </div>
      <div className="o9-qlsheet">
        <div className="o9-qlchips" aria-hidden="true"><span className="is-on">{card.chip}</span></div>
        <div className="o9-qlbody" ref={bodyRef} key={card.key} data-im="deck-card" data-card={card.key} data-answered={card.answered ? "1" : "0"}>
          {card.body}
        </div>
      </div>
      <div className="o9-qlpin">
        <button type="button" className="sf-link" onClick={() => setAt(firstOpen(cards, at + 1))} data-im="q-skip">Skip</button>
        {hasSave && !card.answered && (
          <button type="button" className="sf-btn" data-im="q-save"
            onClick={() => (bodyRef.current?.querySelector(".o9-ans > .sf-btn") as HTMLButtonElement | null)?.click()}>
            Save and next
          </button>
        )}
      </div>
    </div>
  );
  return (
    <>
      <section className="o9-pdeck" data-im="deck" aria-label={DECK_TITLE}>
        <div className="o9-pdeckh" data-im="deck-head"><b>{DECK_TITLE}</b><span data-im="deck-pos">{cards.indexOf(first) + 1} of {cards.length}</span></div>
        <div className="o9-pdeckrow">
          <Disc initials={first.initials} tone={first.tone ?? "live"} />
          <span><b>{first.name}</b><small>{first.sub}</small></span>
        </div>
        <div className="o9-pdeckgo">
          <button type="button" className="sf-btn" onClick={() => { setAt(cards.indexOf(first)); setOpen(true); }} data-im="deck-answer">Answer this</button>
        </div>
      </section>
      {layer && (host?.parentElement ? createPortal(layer, host.parentElement) : layer)}
    </>
  );
};
