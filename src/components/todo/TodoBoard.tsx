/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TodoBoard — the four-column board (workspace pack, Phase 4; ref
 * design-refs/todo-workspace-pages.html).
 *
 * ⚠️ THE BOARD OWNS NO STATE AND WRITES NOTHING. Every column is a state the app already has, and
 * every drag resolves through `dropPlan` to a verb that already exists. This component decides
 * where a card is DRAWN; it never decides where a card IS. That is the whole reason the "Doing"
 * column is dead: it was the only one that could not be derived, so it would have had to be
 * stored, and a stored placement is a second system that has to agree with the first.
 *
 * ⚠️ DRAG IS NEVER THE ONLY PATH. Every verb a drag performs is also on the card's ⋯ menu, because
 * a board reachable only by pointer is a board some people cannot use at all.
 */
import React, { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { BoardCard } from "../../lib/todoBoard";
import { TODO_COLUMNS, TodoColumnId, BoardColumns, dropPlan, DropPlan, bandFamily, cardVerbs, CardVerb } from "../../lib/todoColumns";
import "./todoBoard.css";

export interface TodoBoardProps {
  columns: BoardColumns;
  /** The board asks; the page performs. Every one of these is an EXISTING verb. */
  onPlan: (card: BoardCard, plan: DropPlan, from: TodoColumnId, to: TodoColumnId) => void;
  /** Opening a card — the same handler the rows use. */
  onOpen: (card: BoardCard) => void;
  /** A ⋯ verb, performed by the page with its existing primitives. */
  onVerb: (card: BoardCard, verb: CardVerb, column: TodoColumnId) => void;
}

const COL_EMPTY: Record<TodoColumnId, string> = {
  todo: "Nothing waiting.",
  today: "Nothing committed to today.",
  snoozed: "Nothing put away.",
  done: "Nothing cleared yet today.",
};

export const TodoBoard: React.FC<TodoBoardProps> = ({ columns, onPlan, onOpen, onVerb }) => {
  const [dragging, setDragging] = useState<{ card: BoardCard; from: TodoColumnId } | null>(null);
  const [over, setOver] = useState<TodoColumnId | null>(null);
  const [menu, setMenu] = useState<string | null>(null);

  const perform = (card: BoardCard, from: TodoColumnId, to: TodoColumnId) => {
    const plan = dropPlan(card, from, to);
    onPlan(card, plan, from, to);
  };

  return (
    <div className="tbd">
      {TODO_COLUMNS.map((col) => {
        const cards = columns[col.id];
        const isOver = over === col.id && dragging !== null && dragging.from !== col.id;
        return (
          <section
            key={col.id}
            className={`tbd-col${isOver ? " over" : ""}`}
            aria-label={col.label}
            onDragOver={(e) => { e.preventDefault(); setOver(col.id); }}
            onDragLeave={() => setOver((c) => (c === col.id ? null : c))}
            onDrop={(e) => {
              e.preventDefault();
              setOver(null);
              if (dragging && dragging.from !== col.id) perform(dragging.card, dragging.from, col.id);
              setDragging(null);
            }}
          >
            <div className="tbd-head">
              <h3>{col.label}</h3>
              <span className="tbd-cn">{cards.length}</span>
            </div>

            {/* The drop zone LABELS THE ACT (the copy register). A zone that only highlights
                leaves you to guess what letting go will do — and for Snoozed the answer is not
                "snooze it", it is "ask you for a date". */}
            {isOver && <div className="tbd-drop">{col.dropLabel}</div>}

            <div className="tbd-body">
              {cards.length === 0 && (
                <div className="tbd-empty">
                  {COL_EMPTY[col.id]}
                  {/* ⚠️ ONE QUIET LINE, NOT A CARD (corrections fix 8). An empty Today is the one
                      column where the reader can act immediately, and the bench is where the
                      answer is — so it points there. A card here would look like work; this is a
                      sentence. */}
                  {col.id === "today" && (
                    <> <a className="tbd-lift" href="/todo/today">— lift something from the bench</a></>
                  )}
                </div>
              )}

              {cards.map((c) => (
                <article
                  key={c.key}
                  /* ⚠️ THE INK BORDER IS URGENT-ONLY, AND URGENT IS THE LANE (corrections fix 5).
                     It keyed on `warn`, which derivedCopy sets true for offers, fulls, stale
                     queries and old nudges alike — most of the board. So nearly every card wore
                     ink and the border stopped distinguishing anything. `stream === "do"` is the
                     Urgent lane, the same set the counting law calls urgent, so the border now
                     means what the group heading means. */
                  className={`tbd-card${c.stream === "do" ? " urgent" : ""}${c.done ? " done" : ""}`}
                  draggable
                  tabIndex={0}
                  role="button"
                  aria-label={c.title}
                  onDragStart={() => setDragging({ card: c, from: col.id })}
                  onDragEnd={() => { setDragging(null); setOver(null); }}
                  onClick={() => onOpen(c)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(c); }
                  }}
                >
                  {/* THE 24px BAND — kind on the left, its figures on the right. Populated per
                      Phase 0B: the facet is carried through now, so this is never blank. */}
                  {/* ⚠️ BAND GRAMMAR: KIND left | STATUS-OR-DATE right, and the right lane NEVER
                      mirrors the left (corrections fix 4). The guard is here as well as at the
                      derivation, because a lane that echoes its neighbour is a rendering fault
                      whichever end produced it — and the band is where it shows. */}
                  <div className={`tbd-band fam-${bandFamily(c)}`}>
                    <span className="tbd-kind">{c.kind}</span>
                    {c.due && c.due !== c.kind && <span className="tbd-when">{c.due}</span>}
                  </div>
                  <div className="tbd-t">{c.title}</div>
                  {c.record && <div className="tbd-meta">{c.record}</div>}

                  {/* ⚠️ KEYBOARD PARITY. The same verbs, off the pointer. */}
                  <div className="tbd-foot" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="tbd-more"
                      aria-haspopup="menu"
                      aria-expanded={menu === c.key}
                      aria-label={`Move ${c.title}`}
                      onClick={() => setMenu((k) => (k === c.key ? null : c.key))}
                    >
                      <MoreHorizontal size={15} aria-hidden />
                    </button>
                    {/* ⚠️ VERBS, NEVER "Move to X" — the menu names the ACT, not what happens to
                        the card. */}
                    {menu === c.key && (
                      <div className="tbd-menu" role="menu">
                        {cardVerbs(c, col.id).map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            role="menuitem"
                            disabled={v.disabled}
                            title={v.why}
                            onClick={() => { setMenu(null); onVerb(c, v, col.id); }}
                          >
                            {v.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>

            {/* Done clears at midnight — but the log keeps it, and saying so is the difference
                between "this vanishes" and "this moves to where you can find it". */}
            {col.id === "done" && cards.length > 0 && (
              <div className="tbd-foot-note">Clears at midnight · kept in the log</div>
            )}
          </section>
        );
      })}
    </div>
  );
};
