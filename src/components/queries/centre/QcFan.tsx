/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QcFan — a stat card's queries, dealt across the screen as a hand of cards (v21 §5).
 *
 * ⚠️ IT DEALS RATHER THAN FILTERS, AND THAT IS THE WHOLE IDEA (§1.4). Pressing "12 queried" does
 * not narrow a list somewhere else; it puts those twelve queries in front of you as cards, and
 * picking one takes you to it. The fan is the answer to "which twelve?", which a filtered list
 * makes you scroll to find out.
 *
 * ⚠️ AT MOST FIFTEEN GET A CARD, AND THE SIXTEENTH PLACE IS THE STACK (Nick, 21 Sep). The header
 * still states the full count — "50 queried" — because the cap changes the DEAL and never the
 * COUNT. `fanHand` decides which fifteen and how many are left; this file only draws them.
 *
 * ⚠️ THE CARD IS THE APP'S ONE QUERY CARD, PLACED BY ITS HOST. Not a copy of it, and not a variant
 * of it: `QueryCard` without an anchor renders in place and installs no dismissal of its own, which
 * is what lets sixteen of them live inside one modal without sixteen Escape handlers fighting over
 * the key. Its 260px, its missing tab row and its tighter foot come from `.qcf` descendant rules —
 * the treatment follows the host, as the To-do reference card already established.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { QueryCard, type QueryCardModel } from "../../dashboard/QueryCard";
import { FAN_CARD_W, fanCentreY, fanLayout } from "../../../lib/qcFan";
import type { QcRow } from "../../../lib/qcSummary";
import "./qcFan.css";

/** How long a card takes to reach its place, and how far apart the deals are. */
const DEAL_MS = 460;
const STAGGER_MS = 28;
/**
 * ⚠️ THE STAGGER STOPS AFTER THE TENTH CARD (§5). Sixteen cards at 28ms apart would make the last
 * one land 420ms after the first and 880ms after the click — long enough that the hand looks like
 * it is still loading. Capping the delay means the tail arrives together, which reads as one deal.
 */
const STAGGER_CAP = 10;

export interface QcFanProps {
  /** What the stat card said — the FULL count, not the hand. */
  title: string;
  /** The queries that got a card, latest activity first. */
  dealt: QcRow[];
  /** How many did not, and so the stack card's number. 0 draws no stack. */
  more: number;
  /** "+1 withdrawn, not shown" — stated only when there are withdrawn queries (ruling 2). */
  withdrawnNote: string | null;
  /** The card that opened this, so the deal starts from it and focus goes back to it. */
  origin: HTMLElement | null;
  /** Build the miniature for one row. */
  model: (row: QcRow) => QueryCardModel;
  /** Open this query in the Ledger. */
  onPick: (id: string) => void;
  /** The stack card: the Ledger, filtered to this status, nothing selected. */
  onSeeAll: () => void;
  onClose: () => void;
}

const prefersStill = () =>
  typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export const QcFan: React.FC<QcFanProps> = ({
  title, dealt, more, withdrawnNote, origin, model, onPick, onSeeAll, onClose,
}) => {
  const deckRef = useRef<HTMLDivElement>(null);
  const [vp, setVp] = useState(() => ({
    w: typeof window === "undefined" ? 1280 : window.innerWidth,
    h: typeof window === "undefined" ? 800 : window.innerHeight,
  }));
  const still = prefersStill();
  /* `dealing` is true for the one frame the cards spend at the origin; the transition does the rest */
  const [dealing, setDealing] = useState(!still);

  const hand = dealt.length + (more > 0 ? 1 : 0);
  const layout = useMemo(() => fanLayout(hand, vp.w, vp.h), [hand, vp.w, vp.h]);
  const centreY = fanCentreY(vp.h);

  /* the deal starts from the middle of the control that was pressed */
  const from = useMemo(() => {
    const r = origin?.getBoundingClientRect();
    return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: vp.w / 2, y: vp.h / 2 };
  }, [origin, vp.w, vp.h]);

  useEffect(() => {
    const onResize = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /* ⚠️ ONE FRAME AT THE ORIGIN, THEN RELEASE. Setting the final position in the same paint as the
     initial one gives no transition at all — the browser never sees two values. */
  useEffect(() => {
    if (still) return undefined;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setDealing(false)));
    return () => cancelAnimationFrame(id);
  }, [still]);

  /**
   * ⚠️ THE BODY IS LOCKED, NOT THE STAGE. `lockStageScroll` is the workspace's own helper and locks
   * the stage scroller; the fan covers the whole viewport including the chrome, so what must not
   * move is the document. The Query Centre's page does not scroll behind it either way.
   */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const close = useCallback(() => {
    onClose();
    /* focus goes back to the card that opened the fan — after the close has rendered */
    window.setTimeout(() => origin?.focus(), 0);
  }, [onClose, origin]);

  /**
   * ⚠️ FOCUS STARTS ON THE MIDDLE CARD (§5) and the arrows move between them.
   *
   * ⚠️ AND THE MODAL TRAPS TAB RATHER THAN LETTING IT WALK THE PAGE BEHIND. Everything focusable in
   * here is a card or the ✕, so the trap is the deck plus one button rather than a general
   * focusable sweep — which cannot go stale as the cards change.
   */
  const focusAt = useCallback((i: number) => {
    const cards = deckRef.current?.querySelectorAll<HTMLElement>("[data-qcv='fan-card']");
    if (!cards || cards.length === 0) return;
    const n = cards.length;
    cards[((i % n) + n) % n].focus();
  }, []);

  useEffect(() => {
    const mid = Math.floor(hand / 2);
    const id = window.setTimeout(() => focusAt(mid), still ? 0 : DEAL_MS / 2);
    return () => window.clearTimeout(id);
  }, [hand, focusAt, still]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); return; }
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const cards = [...(deckRef.current?.querySelectorAll<HTMLElement>("[data-qcv='fan-card']") ?? [])];
    const at = cards.indexOf(document.activeElement as HTMLElement);
    if (at < 0) return;
    e.preventDefault();
    focusAt(at + (e.key === "ArrowRight" ? 1 : -1));
  };

  /* where a card sits, and where it starts from */
  const place = (i: number): React.CSSProperties => {
    const c = layout.cards[i];
    if (!c) return { display: "none" };
    const x = dealing ? from.x - FAN_CARD_W / 2 : c.left;
    const y = dealing ? from.y : centreY + c.drop;
    return {
      left: `${x}px`,
      top: `${y}px`,
      zIndex: c.z,
      opacity: dealing ? 0 : 1,
      transform: dealing
        ? "translateY(-50%) scale(.3)"
        : `translateY(-50%) rotate(${c.rotate.toFixed(3)}deg)`,
      transition: still ? "none" : `transform ${DEAL_MS}ms cubic-bezier(.2,.8,.2,1) ${Math.min(i, STAGGER_CAP) * STAGGER_MS}ms, left ${DEAL_MS}ms cubic-bezier(.2,.8,.2,1) ${Math.min(i, STAGGER_CAP) * STAGGER_MS}ms, top ${DEAL_MS}ms cubic-bezier(.2,.8,.2,1) ${Math.min(i, STAGGER_CAP) * STAGGER_MS}ms, opacity ${DEAL_MS / 2}ms linear ${Math.min(i, STAGGER_CAP) * STAGGER_MS}ms`,
    };
  };

  return createPortal(
    <div
      className={`qcf${still ? " qcf--still" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="qcf-title"
      data-qcv="fan"
      onKeyDown={onKeyDown}
    >
      {/* the backdrop is its own element so a click on it closes and a click on a card does not */}
      <div className="qcf-back" data-qcv="fan-back" onClick={close} aria-hidden="true" />

      <header className="qcf-head">
        <b id="qcf-title" className="qcf-count" data-qcv="fan-title">{title}</b>
        <span className="qcf-hint">Choose one to open it in the Ledger</span>
        {/* ⚠️ THE WITHDRAWN LINE IS STATED, NEVER DEALT (ruling 2). The closed card counts Rejected
            and No Response; a withdrawal is the writer's own decision and is not an outcome the
            fan shows — so it is accounted for out loud rather than silently dropped. */}
        {withdrawnNote && <span className="qcf-wd" data-qcv="fan-withdrawn">{withdrawnNote}</span>}
        <button type="button" className="qcf-x" data-qcv="fan-close" aria-label="Close" onClick={close}>✕</button>
      </header>

      <div className="qcf-deck" ref={deckRef} data-qcv="fan-deck">
        {dealt.map((row, i) => (
          <div
            key={row.id}
            className="qcf-card"
            data-qcv="fan-card"
            data-id={row.id}
            style={place(i)}
            role="button"
            tabIndex={-1}
            aria-label={`${row.agentName} — ${row.agency}`}
            onClick={() => onPick(row.id)}
            onKeyDown={(e) => {
              if (e.key !== "Enter" && e.key !== " ") return;
              e.preventDefault();
              onPick(row.id);
            }}
          >
            <QueryCard model={model(row)} />
          </div>
        ))}

        {/* ⚠️ THE STACK IS A CARD IN THE HAND, NOT A CONTROL BESIDE IT — it takes focus in turn and
            Enter activates it, so the keyboard never meets a gap where the sixteenth card is. */}
        {more > 0 && (
          <div
            className="qcf-card qcf-stack"
            data-qcv="fan-card"
            data-stack="true"
            style={place(dealt.length)}
            role="button"
            tabIndex={-1}
            aria-label={`${more} more — see them in the Ledger`}
            onClick={onSeeAll}
            onKeyDown={(e) => {
              if (e.key !== "Enter" && e.key !== " ") return;
              e.preventDefault();
              onSeeAll();
            }}
          >
            {/* the two edges behind it are what make it read as the side of a deck */}
            <span className="qcf-stack-e qcf-stack-e2" aria-hidden="true" />
            <span className="qcf-stack-e qcf-stack-e1" aria-hidden="true" />
            <span className="qcf-stack-face">
              <b>+{more} more</b>
              <small>See them in the Ledger</small>
            </span>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};
