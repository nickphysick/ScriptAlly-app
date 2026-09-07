/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE BOARD — the five categories as columns (QC-chassis round, Phase 4; ref `todo-qc-style.html`
 * `.board` / `.col` / `.bcard`).
 *
 * ⚠️ THE COLUMNS ARE THE CATEGORIES, AND THAT IS WHY URGENT IS NOT ONE. `CATEGORIES` partitions
 * every card exactly once, so the five column counts sum to the board and no card is in two places
 * or none. Urgent is a LENS over the same set — a send whose clock is running is still an Agent
 * request — and a sixth column would drain into another overnight as time passed. It is drawn on
 * the cards it applies to, never as a place to put them.
 *
 * ⚠️ AND EVERY COLUMN RENDERS, INCLUDING THE EMPTY ONES. A column that vanished when it emptied
 * would make the board's shape depend on the data, so the five would move under the reader as
 * tasks were finished — and an empty Gone quiet is information: nothing has gone quiet. It says
 * so in words rather than leaving a hole.
 *
 * ⚠️ THE CLASSES ARE `brd-`, NOT `tbd-`, AND THAT IS NOT A STYLE CHOICE. `todoBoard.css` already
 * declares `.tbd-col`, `.tbd-card` and `.tbd-empty` for the RETIRED four-column board
 * (`TodoBoard.tsx`, which this repo's own comments confirm is "mounted nowhere"). That stylesheet
 * is still loaded — `PortalMenu` imports it — so reusing those names would have silently dressed
 * this board in a retired one's rules, with nothing to point at.
 *
 * ⚠️ AND `TodoBoard.tsx` IS A DEAD COMPONENT WITH A LIVE STYLESHEET — flagged, not deleted here.
 * Retiring it is the "replacement swapped, not added" rule and it should happen; it is out of this
 * phase's scope because `todoBoard.css` also serves `PortalMenu`, which was extracted from it, so
 * the deletion is a real untangling rather than a line removal.
 *
 * ⚠️ THE BOARD IS NOT DRAGGABLE, deliberately and per the brief's own out-of-scope list. Dragging
 * a card between these columns would mean changing what KIND of task it is, which is not a thing a
 * writer can decide: the category is derived from the query's state. A board that looks draggable
 * and is not would be worse than one that plainly is not.
 */
import React from "react";
import "./taskBoard.css";
import { BoardCard } from "../../lib/todoBoard";
import { StatusDot } from "../StatusDot";
import {
  CATEGORIES, Category, CATEGORY_LABEL, CATEGORY_CAPTION, CATEGORY_FAMILY, taskCategory,
} from "../../lib/todoCategory";

/** the glyph each column wears — direction and kind, matching the tiles' own marks */
const GLYPH: Record<Category, string> = {
  req: "←", nudge: "↻", quiet: "…", house: "⚙", yours: "✍",
};

export const TaskBoard: React.FC<{
  cards: BoardCard[];
  selectedKey?: string;
  /** the mono fact under each card — the row's own `due` chip, passed in rather than re-derived */
  factOf: (c: BoardCard) => string;
  /** the elapsed figure, and whether it is a clock the writer is answerable to */
  spanOf: (c: BoardCard) => { text: string; late: boolean };
  urgentOf: (c: BoardCard) => boolean;
  onOpen: (c: BoardCard) => void;
}> = ({ cards, selectedKey, factOf, spanOf, urgentOf, onOpen }) => {
  /* ⚠️ ONE PASS, NOT FIVE FILTERS. Five `cards.filter(…)` calls would each re-derive the category
     of every card — the same answer computed five times, and five chances for one of them to be
     asked differently. */
  const byCat = new Map<Category, BoardCard[]>(CATEGORIES.map((c) => [c, []]));
  for (const c of cards) byCat.get(taskCategory(c))!.push(c);

  return (
    <div className="brd">
      {CATEGORIES.map((cat) => {
        const col = byCat.get(cat)!;
        return (
          <section className="brd-col" key={cat} aria-label={CATEGORY_LABEL[cat]}>
            <header className="brd-colh">
              <div className="r1">
                <span className={"ic " + CATEGORY_FAMILY[cat]} aria-hidden>{GLYPH[cat]}</span>
                <span className="t">{CATEGORY_LABEL[cat]}</span>
                <span className="c">{col.length}</span>
              </div>
              <div className="r2">{CATEGORY_CAPTION[cat]}</div>
            </header>
            <div className="brd-stack">
              {col.length === 0 ? (
                /* ⚠️ WORDS, NOT A HOLE — see the header. */
                <p className="brd-empty">Nothing here</p>
              ) : col.map((c) => {
                const span = spanOf(c);
                const cls = ["brd-card", selectedKey === c.key ? "sel" : "",
                  urgentOf(c) ? "urgent" : ""].filter(Boolean).join(" ");
                return (
                  <button type="button" className={cls} key={c.key} onClick={() => onOpen(c)}
                          aria-pressed={selectedKey === c.key}>
                    <span className="main">
                      <span className="disc" aria-hidden>{c.who ? c.initials : "✍"}</span>
                      <span className="who">
                        <span className="nm">{c.title}</span>
                        <span className="ag">{c.who ? c.record || c.who : "Your own note"}</span>
                      </span>
                    </span>
                    <span className="fact">
                      <span className="l">
                        {c.status && <StatusDot status={c.status} overrideSize={11} />}
                        {factOf(c)}
                      </span>
                      <span className={span.late ? "m2 late" : "m2"}>{span.text}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
};
