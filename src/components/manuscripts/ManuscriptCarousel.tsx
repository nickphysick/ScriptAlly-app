/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE SHELF — one tile forward, its neighbours peeking ══════════════════════════════════════
 *
 * Ref: `design-refs/manuscripts-shelf-carousel-v2.html` (generated from the brief's prose; the file
 * says so at its top).
 *
 * ⚠️ THE ARRANGEMENT IS `carouselDeck`'s, NOT THIS FILE'S. Which tile is forward, which peek, which
 * are absent, and — the one that matters — which is FOCUSABLE, are decided by a pure function so
 * they can be asserted without a DOM. This repo has no jsdom; a keyboard claim made only in JSX is
 * a claim nobody can check.
 *
 * ⚠️ EVERY TILE IS A `<button>`. A clickable `div` is not reachable by keyboard, announces nothing,
 * and does not fire on Enter or Space.
 *
 * ⚠️ AND HIDDEN TILES ARE REMOVED FROM THE TAB ORDER AND THE ACCESSIBILITY TREE, because
 * `opacity: 0` does neither. A transparent card off the side of the stage is otherwise reachable by
 * Tab and read out in full from somewhere the reader cannot see.
 */
import React, { useRef, useState } from "react";
import { Manuscript, Query } from "../../types";
import { deckSlots, stepDeck, deckHasPaging } from "../../lib/carouselDeck";
import { plateStats } from "../../lib/manuscriptPlate";
import manuscriptIcon from "../../assets/shell/manuscript-icon.png";
import "./manuscriptCarousel.css";

export interface ManuscriptCarouselProps {
  manuscripts: Manuscript[];
  queries: Query[];
  genresOf: (m: Manuscript) => string[];
  statusOf: (m: Manuscript) => { label: string; shelved: boolean };
  sinceOf: (m: Manuscript) => string;
  onOpen: (id: string) => void;
  onAdd: () => void;
}

export const ManuscriptCarousel: React.FC<ManuscriptCarouselProps> = ({
  manuscripts, queries, genresOf, statusOf, sinceOf, onOpen, onAdd,
}) => {
  const [index, setIndex] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const slots = deckSlots(manuscripts.length, index);
  const paging = deckHasPaging(manuscripts.length);

  /**
   * ⚠️ ARROW KEYS PAGE WHEN THE CAROUSEL HAS FOCUS, and the handler sits on the STAGE rather than
   * on each tile — a tile that has just been paged away from loses focus, so a per-tile handler
   * stops responding after the first press.
   */
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    setIndex((i) => stepDeck(i, e.key === "ArrowLeft" ? -1 : 1, manuscripts.length));
  };

  return (
    <div
      className="mcar"
      ref={stageRef}
      onKeyDown={onKeyDown}
      role="group"
      aria-roledescription="carousel"
      aria-label="Your shelf"
    >
      <div className="mcar-track">
        {slots.map((slot) => {
          const hidden = slot.role === "hidden";
          /**
           * ⚠️ `tabIndex` READS THE DECK'S `focusable`, NOT `hidden`. The first version derived it
           * here from the role and made every PEEKING tile tabbable — so the module computed
           * `focusable`, a lock asserted "exactly one slot is focusable, always", and the renderer
           * ignored both. Green tests about a function the component was not listening to. The
           * browser measurement read `tabbable: 2` and is the only thing that could have.
           *
           * ⚠️ ONE TAB STOP, THEN ARROW KEYS — the roving-tabindex model. You Tab to the carousel
           * and move within it; you do not Tab through a shelf of books to get past it.
           *
           * ⚠️ AND `aria-hidden` IS SEPARATE, because the two do different jobs: `tabIndex={-1}`
           * leaves an element in the accessibility tree, and `aria-hidden` alone leaves it tabbable.
           */
          const offstage = { tabIndex: slot.focusable ? 0 : -1, "aria-hidden": hidden || undefined };

          if (slot.isGhost) {
            return (
              <button
                key="ghost"
                type="button"
                className={`mcar-tile mcar-ghost mcar-${slot.role}${manuscripts.length === 0 ? " mcar-solo" : ""}`}
                onClick={() => (slot.role === "focus" ? onAdd() : setIndex(slot.index))}
                {...offstage}
                aria-label="Add a manuscript"
              >
                {/* The label is the ghost's only content, and it hides while the card peeks. */}
                {slot.showGhostLabel && <span className="mcar-glabel">＋ Add a manuscript</span>}
              </button>
            );
          }

          const m = manuscripts[slot.index];
          const st = statusOf(m);
          const mq = queries.filter((q) => q.manuscriptId === m.id);
          const stats = plateStats(mq);
          return (
            <button
              key={m.id}
              type="button"
              className={`mcar-tile mcar-${slot.role}${st.shelved ? " mcar-shelved" : ""}`}
              /* ⚠️ A NEIGHBOUR BRINGS ITSELF FORWARD; ONLY THE FORWARD TILE OPENS. Clicking a
                 half-hidden card and landing inside a book you could not read the title of is the
                 fault this split prevents. */
              onClick={() => (slot.role === "focus" ? onOpen(m.id) : setIndex(slot.index))}
              {...offstage}
            >
              {/**
                * ⚠️ ARTWORK BLED IN, NO BAND EDGE — no hairline under it, no inner border.
                *
                * ⚠️ AND IT CARRIES THE GLYPH RATHER THAN BEING AN EMPTY RECTANGLE. It was a flat
                * fill with nothing in it — the largest element on the page, and empty, which reads
                * as a failed image load rather than as a book waiting for a cover. This is the same
                * asset the sidebar and the plate already render; a real cover replaces it and
                * changes nothing else.
                */}
              <span className="mcar-art" aria-hidden="true">
                <img className="mcar-glyph" src={manuscriptIcon} alt="" />
                {/* The ribbon OVERHANGS the top-left, which is why the tile must not clip. */}
                <span className="mcar-ribbon">{slot.index + 1}</span>
                <span className="mcar-pill">{st.label}</span>
              </span>
              <span className="mcar-body">
                <span className="mcar-title">{m.title}</span>
                <span className="mcar-chips">
                  {genresOf(m).map((g) => <span key={g} className="mcar-chip">{g}</span>)}
                </span>
                {m.wordCount ? (
                  <span className="mcar-wc">{m.wordCount.toLocaleString("en-GB")} words</span>
                ) : null}
                {/* ⚠️ CLAMPED TO TWO LINES. A third changes the tile's height and the stage's. */}
                {/* ⚠️ THE ABSENT PITCH IS STATED, NOT SKIPPED. Rendering nothing left a gap between
                    the word count and the figures rule that reads as a rendering fault — and the
                    writer cannot act on a line that is not there. It is muted and italic, so it is
                    plainly the app talking rather than the book's own words. */}
                {m.elevatorPitch
                  ? <span className="mcar-pitch">{m.elevatorPitch}</span>
                  : <span className="mcar-pitch mcar-nopitch">No elevator pitch written yet</span>}
                <span className="mcar-figs">
                  {/* ⚠️ LABEL ABOVE VALUE — the opposite of the book page's figures strip, on
                      purpose: this is a card being scanned, that is a page being read. */}
                  <span className="mcar-fig"><span className="mcar-figl">Queries</span><span className="mcar-figv">{stats.queriesSent}</span></span>
                  <span className="mcar-fig"><span className="mcar-figl">Responses</span><span className="mcar-figv">{stats.responses}</span></span>
                  <span className="mcar-fig"><span className="mcar-figl">Since</span><span className="mcar-figv">{sinceOf(m)}</span></span>
                </span>
                <span className="mcar-open">Open</span>
              </span>
            </button>
          );
        })}
      </div>

      {paging && (
        <>
          <button
            type="button" className="mcar-chev mcar-chev-l"
            onClick={() => setIndex((i) => stepDeck(i, -1, manuscripts.length))}
            disabled={index === 0}
            aria-label="Previous"
          >‹</button>
          <button
            type="button" className="mcar-chev mcar-chev-r"
            onClick={() => setIndex((i) => stepDeck(i, 1, manuscripts.length))}
            disabled={index === manuscripts.length}
            aria-label="Next"
          >›</button>
          {/* ⚠️ REAL CONTROLS WITH ACCESSIBLE NAMES, not decoration. Each names its destination. */}
          {/* ⚠️ THE DOTS COUNT BOOKS. The ghost is a deck member you can page to, but it is not a
              manuscript, and a dot for it made the shelf read as holding one more book than it does
              — a count that is wrong about the only thing the reader is counting. */}
          <div className="mcar-dots">
            {slots.filter((s) => !s.isGhost).map((s) => (
              <button
                key={manuscripts[s.index].id}
                type="button"
                className="mcar-dot"
                aria-current={s.role === "focus" ? "true" : undefined}
                aria-label={manuscripts[s.index].title}
                onClick={() => setIndex(s.index)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
