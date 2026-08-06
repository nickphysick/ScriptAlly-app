/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TodoBoard — the four-column board (workspace pack, Phase 4; board fixes II, Phase 1; ref
 * design-refs/todo-board-settled.html).
 *
 * ⚠️ THE BOARD OWNS NO STATE AND WRITES NOTHING. Every column is a state the app already has, and
 * every drag resolves through `dropPlan` to a verb that already exists. This component decides
 * where a card is DRAWN; it never decides where a card IS. That is the whole reason the "Doing"
 * column is dead: it was the only one that could not be derived, so it would have had to be
 * stored, and a stored placement is a second system that has to agree with the first.
 *
 * ⚠️ DRAG IS NEVER THE ONLY PATH. Every verb a drag performs is also on the card's ⋯ menu, because
 * a board reachable only by pointer is a board some people cannot use at all.
 *
 * ⚠️ THE ⋯ MENU IS A PORTAL TO document.body (board fixes II, P1). It used to render inside the
 * card's foot, and the card carries `overflow` clipping — so the menu drew CLIPPED to the card's
 * box, a strip of buttons with their labels cut off. Positioning is fixed-coordinate from the
 * trigger's rect (the pure `placeMenu` — flips upward at the viewport's bottom edge), and the
 * menu closes on outside press, Escape (focus returns to the trigger), any scroll, resize, and
 * history navigation. Its CONTENTS are the pure `cardMenu` model — the component renders whatever
 * that returns and decides nothing per-kind itself.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal } from "lucide-react";
import { BoardCard } from "../../lib/todoBoard";
import { TODO_COLUMNS, TodoColumnId, BoardColumns, dropPlan, DropPlan, bandFamily } from "../../lib/todoColumns";
import { cardMenu, placeMenu, MenuEntry, MenuLeaf, MenuGroup } from "../../lib/todoMenu";
import "./todoBoard.css";

export interface TodoBoardProps {
  columns: BoardColumns;
  /** The board asks; the page performs. Every one of these is an EXISTING verb. */
  onPlan: (card: BoardCard, plan: DropPlan, from: TodoColumnId, to: TodoColumnId) => void;
  /** Opening a card — the dock's door (board fixes II, P2). */
  onOpen: (card: BoardCard) => void;
  /** A ⋯ menu leaf, performed by the page with its existing primitives. */
  onVerb: (card: BoardCard, item: MenuLeaf, column: TodoColumnId) => void;
}

const COL_EMPTY: Record<TodoColumnId, string> = {
  todo: "Nothing waiting.",
  today: "Nothing committed to today.",
  snoozed: "Nothing put away.",
  done: "Nothing cleared yet today.",
};

interface OpenMenu {
  key: string;
  card: BoardCard;
  column: TodoColumnId;
  anchor: HTMLElement;
  /** Pre-open a submenu — the drag-to-Snoozed drop opens the menu AT its date tiers. */
  openSub?: "snooze" | "resnooze" | "dismiss";
}

/**
 * The portal menu. Rendered once at board level for whichever card is open — never inside a
 * card, so no card style (overflow, transform, z-index) can clip or trap it.
 */
const BoardCardMenu: React.FC<{
  open: OpenMenu;
  onPick: (item: MenuLeaf) => void;
  onClose: (returnFocus: boolean) => void;
}> = ({ open, onPick, onClose }) => {
  const elRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const [sub, setSub] = useState<string | null>(open.openSub ?? null);
  const groups = cardMenu(open.card, open.column);

  /* Position after first paint (the menu's height depends on its contents), and re-place when a
     submenu expands — the height change can push it past the viewport's bottom edge. */
  useLayoutEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const r = open.anchor.getBoundingClientRect();
    const p = placeMenu(r, { w: el.offsetWidth, h: el.offsetHeight },
      { w: window.innerWidth, h: window.innerHeight });
    setPos({ left: p.left, top: p.top });
  }, [open.anchor, sub]);

  // Focus the first enabled item once placed — the keyboard arrives inside the menu.
  useEffect(() => {
    if (!pos) return;
    const first = elRef.current?.querySelector<HTMLButtonElement>("button.tbd-mi:not(:disabled)");
    first?.focus();
    // run once, on placement — not again when a submenu re-places the menu
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos !== null]);

  /* The closers: outside press · Escape (focus back to the trigger) · any scroll · resize ·
     history navigation. The trigger itself counts as "outside" here deliberately — its own click
     handler toggles, and a pointerdown-close followed by a click-reopen would make the button
     unable to close its menu. */
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node | null;
      if (t && (elRef.current?.contains(t) || open.anchor.contains(t))) return;
      onClose(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(true); }
    };
    const onAway = () => onClose(false);
    document.addEventListener("pointerdown", onDown);
    // capture-phase: the stage scrolls, not the window — a bubbling listener would never hear it
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("scroll", onAway, true);
    window.addEventListener("resize", onAway);
    window.addEventListener("popstate", onAway);
    window.addEventListener("hashchange", onAway);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("scroll", onAway, true);
      window.removeEventListener("resize", onAway);
      window.removeEventListener("popstate", onAway);
      window.removeEventListener("hashchange", onAway);
    };
  }, [open.anchor, onClose]);

  const walk = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = Array.from(
      elRef.current?.querySelectorAll<HTMLButtonElement>("button.tbd-mi:not(:disabled)") ?? [],
    );
    if (!items.length) return;
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    const next = e.key === "ArrowDown"
      ? items[(i + 1 + items.length) % items.length]
      : items[(i - 1 + items.length) % items.length];
    next.focus();
  };

  const renderLeaf = (item: MenuLeaf, inSub: boolean) => (
    <button
      key={item.id + (inSub ? "-sub" : "")}
      type="button"
      role="menuitem"
      className={`tbd-mi${item.weight ? " weight" : ""}${item.danger ? " danger" : ""}${inSub ? " insub" : ""}`}
      disabled={item.disabled}
      title={item.why}
      onClick={() => onPick(item)}
    >
      {item.label}
      {item.goes && <span className="tbd-mgo" aria-hidden>▸</span>}
    </button>
  );

  const renderEntry = (entry: MenuEntry) => {
    if (entry.kind === "leaf") return renderLeaf(entry, false);
    const openSub = sub === entry.id;
    return (
      <React.Fragment key={entry.id}>
        <button
          type="button"
          role="menuitem"
          aria-haspopup="true"
          aria-expanded={openSub}
          className="tbd-mi"
          onClick={() => setSub((s) => (s === entry.id ? null : entry.id))}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") { e.preventDefault(); setSub(entry.id); }
            if (e.key === "ArrowLeft") { e.preventDefault(); setSub(null); }
          }}
        >
          {entry.label}
          <span className={`tbd-mgo${openSub ? " open" : ""}`} aria-hidden>▸</span>
        </button>
        {openSub && <div className="tbd-misub">{entry.sub.map((s) => renderLeaf(s, true))}</div>}
      </React.Fragment>
    );
  };

  const renderGroup = (g: MenuGroup, i: number) => (
    <React.Fragment key={i}>
      {g.head ? (
        <div className="tbd-mhead">{g.head}</div>
      ) : (
        i > 0 && <div className="tbd-msep" aria-hidden />
      )}
      {g.entries.map(renderEntry)}
    </React.Fragment>
  );

  return createPortal(
    <div
      ref={elRef}
      className="t-f12 tbd-menu2"
      role="menu"
      aria-label={`Actions for ${open.card.title}`}
      style={pos ? { left: pos.left, top: pos.top } : { left: 0, top: 0, visibility: "hidden" }}
      onKeyDown={walk}
    >
      {groups.filter((g) => g.entries.length > 0).map(renderGroup)}
    </div>,
    document.body,
  );
};

export const TodoBoard: React.FC<TodoBoardProps> = ({ columns, onPlan, onOpen, onVerb }) => {
  const [dragging, setDragging] = useState<{ card: BoardCard; from: TodoColumnId } | null>(null);
  const [over, setOver] = useState<TodoColumnId | null>(null);
  const [menu, setMenu] = useState<OpenMenu | null>(null);
  const cardEls = useRef(new Map<string, HTMLElement>());
  /* ⚠️ CLICK vs DRAG, BY MOVEMENT (board fixes II, P2). The card is the dock's door AND a
     draggable, and browsers do not reliably suppress the click after an HTML5 drag — so a slow
     drag could dock the card it just moved. Two guards: a dragstart poisons the gesture outright,
     and a press that travels more than the threshold is a drag even if dragstart never fired
     (a cancelled drag must not fall through to an accidental open). */
  const pressAt = useRef<{ x: number; y: number } | null>(null);
  const draggedRef = useRef(false);
  const DRAG_THRESHOLD_PX = 5;
  const clickIsDrag = (e: React.MouseEvent): boolean => {
    if (draggedRef.current) { draggedRef.current = false; return true; }
    const p = pressAt.current;
    return !!p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > DRAG_THRESHOLD_PX;
  };

  const closeMenu = (returnFocus: boolean) => {
    setMenu((m) => {
      if (m && returnFocus) m.anchor.focus();
      return null;
    });
  };

  const perform = (card: BoardCard, from: TodoColumnId, to: TodoColumnId) => {
    const plan = dropPlan(card, from, to);
    /* ⚠️ THE SNOOZE DROP OPENS THE DATE CHOICE ON THE CARD (P1). The plan says "ask for a date";
       the page's Later popover only ever mounted on the ledger rows, so on the board the drop
       used to ask NOTHING — the card just stayed put. The ⋯ menu is the board's chooser now, so
       the drop opens it with the date tiers already expanded. The zone's label ("DROP TO CHOOSE
       A RETURN DATE") was always the promise; this is the promise kept. */
    if (plan.kind === "snooze-popover") {
      const anchor = cardEls.current.get(card.key);
      if (anchor) { setMenu({ key: card.key, card, column: from, anchor, openSub: "snooze" }); return; }
    }
    onPlan(card, plan, from, to);
  };

  return (
    <div className="tbd">
      {menu && (
        <BoardCardMenu
          open={menu}
          onClose={closeMenu}
          onPick={(item) => { setMenu(null); onVerb(menu.card, item, menu.column); }}
        />
      )}
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
                  ref={(el) => {
                    if (el) cardEls.current.set(c.key, el);
                    else cardEls.current.delete(c.key);
                  }}
                  /* ⚠️ THE INK BORDER IS URGENT-ONLY, AND URGENT IS THE FAMILY (P4). The border
                     and the band read the SAME consolidated map (todoFamily via bandFamily), so
                     they cannot disagree: a pink band always wears the ink border, and no other
                     family ever does. (History: it first keyed on `warn` — most of the board wore
                     ink; then on the lane, which put ink on a promoted user task's sage band.) */
                  className={`tbd-card${bandFamily(c) === "urgent" ? " urgent" : ""}${c.done ? " done" : ""}`}
                  draggable
                  tabIndex={0}
                  role="button"
                  aria-label={c.title}
                  onPointerDown={(e) => { pressAt.current = { x: e.clientX, y: e.clientY }; }}
                  onDragStart={() => { draggedRef.current = true; setDragging({ card: c, from: col.id }); }}
                  onDragEnd={() => { setDragging(null); setOver(null); }}
                  /* ⚠️ THE CARD IS THE DOOR (P2): clicking opens the dock on this card — unless
                     the press was a drag (see clickIsDrag). Enter is the same door for keyboards. */
                  onClick={(e) => { if (!clickIsDrag(e)) onOpen(c); }}
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
                  {/* the door's whisper (P2, ref .hint): OPEN ▸ surfaces on hover, tucked under
                      the band in the seat's reserved corridor — always in the DOM, CSS-revealed,
                      so nothing reflows and screen readers are not shouted at twice (the card
                      already announces as a button). */}
                  <span className="tbd-hint" aria-hidden>OPEN ▸</span>
                  <div className="tbd-t">{c.title}</div>
                  {c.record && <div className="tbd-meta">{c.record}</div>}

                  {/* ⚠️ THE SEAT (P1, ref option A): ONE ⋯, bottom-right, in a permanently
                      reserved lane — the card's text padding reserves it, so nothing ever sits
                      under it and nothing appears or disappears on hover. Faint at rest; the
                      card's hover darkens it and gives it its chip. KEYBOARD PARITY: the same
                      verbs, off the pointer. */}
                  <button
                    type="button"
                    className="tbd-more"
                    aria-haspopup="menu"
                    aria-expanded={menu?.key === c.key}
                    aria-label={`Actions for ${c.title}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      const anchor = e.currentTarget;
                      setMenu((m) => (m?.key === c.key ? null : { key: c.key, card: c, column: col.id, anchor }));
                    }}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal size={15} aria-hidden />
                  </button>
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
