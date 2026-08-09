/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TaskList — the consolidated Tasks page's BODY (tasks-consolidation, Phase 2; ref
 * design-refs/tasks-page.html, the third frame).
 *
 * ⚠️ THIS REPLACES THE FOUR-COLUMN BOARD, AND THE ARGUMENT IS PLACEMENT. The board asked the
 * writer where a thing belonged — To do, Today, Snoozed, Done — and then had to keep four columns
 * agreeing about one set. The ranked order of ONE list is the plan now, so the groups answer
 * "what KIND of thing is this", which the app can already derive, instead of "where did you put
 * it", which it could not.
 *
 * ⚠️ THE LIST OWNS NO STATE THAT MATTERS AND WRITES NOTHING. Its groups are `taskGroups(cols)`,
 * its fold is `groupSlice`, its pills and journeys are `taskRow`, its ticks are `isTickable`, and
 * every verb resolves through the SAME `cardMenu` model the board's ⋯ used. Two pieces of local
 * state are view memory only (the snoozed fold, a sweep's session-high member count) — losing
 * either changes nothing true.
 *
 * ⚠️ THE ROW IS ONE ELEMENT CARRYING ITS OWN GRID. Never `display: contents` on the row with the
 * cells promoted to grid items: `contents` deletes the row's box, so hover, focus and any future
 * selected band fracture into six separate rectangles and the divider has nothing to hang off.
 * The rule is load-bearing enough to be tested rather than commented (`tasksList.test.tsx`).
 *
 * ⚠️ WHICH VERB SLOTS FILL IS ASKED OF THE MENU MODEL, NEVER OF A SECOND PER-KIND TABLE. The four
 * slots are fixed tracks and an absent verb leaves its slot standing, so every primary in a panel
 * starts at the same x and an absence is legible. Phase 3 added the per-kind NAMES (Start, Close,
 * Return, Undo) and the pill tones and journeys in `lib/taskRow` — presentation the menu has no
 * opinion about. The split is the point: the menu says WHETHER, taskRow says WHAT IT IS CALLED,
 * so the row and the menu cannot disagree about what a card allows.
 */
import React, { useRef, useState } from "react";
import { ChevronRight, ChevronDown, Clock, MoreHorizontal, X, Check } from "lucide-react";
import { BoardCard } from "../../lib/todoBoard";
import { TaskGroup, groupSlice, showMoreLabel } from "../../lib/todoGroups";
/* P3 — what the row SAYS about its kind: the pill's tone, the primary's name, the journey.
   (Whether a verb exists at all stays `cardMenu`'s answer — see below.) */
import { rowPill, rowPrimaryLabel, rowJourney } from "../../lib/taskRow";
import { isTickable, completionVia } from "../../lib/todoActions";
import { cardMenu, MenuLeaf, MenuEntry, MenuItemId } from "../../lib/todoMenu";
import { TodoColumnId, isSweepCard } from "../../lib/todoColumns";
import { PortalMenu } from "./PortalMenu";
import "./todoGroups.css";

export interface TaskListProps {
  groups: TaskGroup[];
  /** Housekeeping's fold — hoisted to the page so a re-render of the list never loses it. */
  hkExpanded: boolean;
  onToggleHk: () => void;
  /** The row's door: the dock, on this card. */
  onOpen: (card: BoardCard) => void;
  /** The tick — the page's one completion path. Only offered where `isTickable` says so. */
  onTick: (card: BoardCard) => void;
  /** A menu leaf, performed by the page with its existing primitives (as the board's ⋯ was). */
  onVerb: (card: BoardCard, item: MenuLeaf, column: TodoColumnId) => void;
}

/**
 * ⚠️ THE GROUP → COLUMN MAP EXISTS BECAUSE THE MENU MODEL STILL SPEAKS COLUMNS, and that is the
 * honest reading rather than a leftover: `cardMenu`'s "column" is really the card's STATE — is it
 * live, asleep, or finished — and the three states outlived the four columns. Mapping here keeps
 * one menu model instead of forking it for a page that no longer has columns.
 */
export function groupColumn(id: TaskGroup["id"]): TodoColumnId {
  if (id === "snoozed") return "snoozed";
  if (id === "done") return "done";
  return "todo";
}

/** The heading dot — the group's own family tone, so the heading and its pills agree. */
const GROUP_DOT: Record<TaskGroup["id"], string> = {
  now: "#d98b74",
  housekeeping: "#d9c49a",
  yours: "#a8bca4",
  snoozed: "#c4bcb2",
  done: "#b9c9b4",
};

/** Does the menu offer this leaf, live? A disabled line is an explanation, not an affordance. */
function offers(groups: ReturnType<typeof cardMenu>, id: MenuItemId): boolean {
  const hit = (e: MenuEntry): boolean =>
    e.kind === "leaf" ? e.id === id && !e.disabled : e.sub.some((s) => s.id === id && !s.disabled);
  return groups.some((g) => g.entries.some(hit));
}

interface OpenMenu {
  key: string;
  card: BoardCard;
  column: TodoColumnId;
  anchor: HTMLElement;
  openSub?: "snooze" | "resnooze" | "dismiss";
}

export const TaskList: React.FC<TaskListProps> = ({ groups, hkExpanded, onToggleHk, onOpen, onTick, onVerb }) => {
  const [menu, setMenu] = useState<OpenMenu | null>(null);
  /* Snoozed opens in place. Session-only and deliberately so: a band that remembered being open
     would greet you with the things you had put away. */
  const [snzOpen, setSnzOpen] = useState(false);
  /* A sweep's session-high member count — DERIVED VIEW MEMORY, carried over from the board's own
     rail rather than re-derived: with a baseline the meter can say "5 OF 16" as the pile shrinks,
     and a pile you have not started is a pile rather than a 0% failure. */
  const sweepBase = useRef(new Map<string, number>());

  const closeMenu = (returnFocus: boolean) => {
    setMenu((m) => {
      if (m && returnFocus) m.anchor.focus();
      return null;
    });
  };

  const openMenu = (
    e: React.MouseEvent<HTMLButtonElement>,
    card: BoardCard,
    column: TodoColumnId,
    openSub?: OpenMenu["openSub"],
  ) => {
    e.stopPropagation();
    const anchor = e.currentTarget;
    setMenu((m) => (m?.key === card.key && m.openSub === openSub
      ? null
      : { key: card.key, card, column, anchor, openSub }));
  };

  const sweepFigure = (c: BoardCard): { label: string; pct: number } => {
    const m = isSweepCard(c) ? c.sweepOf : 0;
    const base = Math.max(sweepBase.current.get(c.key) ?? 0, m);
    sweepBase.current.set(c.key, base);
    const fixed = base - m;
    return fixed > 0
      ? { label: `${fixed} OF ${base} DONE`, pct: Math.round((fixed / base) * 100) }
      : { label: c.due, pct: 0 };
  };

  const renderRow = (c: BoardCard, column: TodoColumnId) => {
    const menuModel = cardMenu(c, column);
    const sweep = isSweepCard(c);
    const fig = sweep ? sweepFigure(c) : null;
    const pill = rowPill(c, column);
    const journey = rowJourney(c, column);

    /* SLOT 1 — the primary. ⚠️ THE MENU SAYS WHETHER, `taskRow` SAYS WHAT IT IS CALLED. Absent
       where the TICK IS THE ACT: a writer's own item is finished by ticking it, so a second verb
       beside the circle would be two names for one act. */
    const primary: { id: MenuItemId; label: string; ghost?: true } | null =
      column === "done" ? (offers(menuModel, "undo-done") ? { id: "undo-done", label: rowPrimaryLabel(c, column), ghost: true } : null)
      : column === "snoozed" ? { id: "unsnooze", label: rowPrimaryLabel(c, column) }
      : completionVia(c) === "user-task" ? null
      : { id: "action", label: rowPrimaryLabel(c, column) };

    /* SLOT 2 — the clock. It opens the ⋯ menu AT its date tiers rather than owning a second
       chooser; Phase 4 swaps that submenu for the dial, at this one call site. Absent on a
       finished row, and on a sleeping one (its snooze is "change the date", which lives in ⋯).
       ⚠️ THE PERMISSION IS THE MENU'S, like the dismissal's. It was `snoozeVia(c) !== "none"`
       for one browser walk, and that put a SWEEP — which has no `relatedRecordId`, because it
       stands for many — in the state of refusing a snooze on the row while offering one in its
       own ⋯ menu. Two answers to one question, on one card. */
    const clock = column !== "done" && column !== "snoozed" && offers(menuModel, "snooze-1");

    /* SLOT 3 — the dismissal. ⚠️ THE PERMISSION IS THE MENU'S, NOT A SECOND TABLE: an offer's
       dismiss line is rendered DISABLED with its reason, so `offers` refuses it and the slot
       stands empty — which is exactly the ref's rule for offers and deadlines. */
    const dismiss = offers(menuModel, "dismiss-week");

    const tickable = isTickable(c);

    return (
      <div
        key={c.key}
        data-tdgkey={c.key}
        className={`tdg-row${c.done ? " done" : ""}`}
        role="button"
        tabIndex={0}
        aria-label={c.title}
        onClick={() => onOpen(c)}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
            e.preventDefault();
            onOpen(c);
          }
        }}
      >
        <div className="tdg-cc">
          {tickable && (
            <button
              type="button"
              className={`tdg-tick${c.done ? " dn" : ""}`}
              aria-label={c.done ? `Undo “${c.title}”` : `Mark “${c.title}” done`}
              onClick={(e) => { e.stopPropagation(); onTick(c); }}
            >
              <Check size={11} aria-hidden />
            </button>
          )}
        </div>

        <div style={{ minWidth: 0 }}>
          <div className="tdg-t">{c.title}</div>
          {/* the why-line sits BENEATH the title rather than competing for its width */}
          {(c.subtitle || c.record) && <div className="tdg-sub">{c.subtitle || c.record}</div>}
        </div>

        <div className="tdg-cc">
          {/* ⚠️ GUARDED AT THE DERIVATION: `rowPill` returns null where a card has no kind, so an
              empty pill — chrome with nothing in it, which reads as a load failure rather than an
              absence — cannot be drawn from here. The WORDS are the card's own derived `kind`;
              only the tone is per-kind. */}
          {pill && <span className={`tdg-pill tone-${pill.tone}`}>{pill.label}</span>}
        </div>

        <div className="tdg-cc">
          {/* ⚠️ THE METER NAMES THE STAGE, NOT A PERCENTAGE — except for a sweep, where the count
              IS the fact ("5 OF 16 DONE"). The two never appear together: a pile has no journey
              and a journey has no pile. */}
          <div className="tdg-jrny">
            {sweep ? (
              <>
                <div className="tdg-bar" aria-hidden><i style={{ width: `${fig!.pct}%` }} /></div>
                <div className="tdg-stlab">{fig!.label}</div>
              </>
            ) : journey && (
              <>
                <div className="tdg-steps" aria-hidden>
                  {journey.stages.map((s, i) => <span key={i} className={`tdg-stp ${s}`} />)}
                </div>
                <div className="tdg-stlab">{journey.label}</div>
              </>
            )}
          </div>
        </div>

        <div className="tdg-cr">
          {/* ⚠️ THE AGE NEVER ECHOES THE METER BESIDE IT (browser-measured, 9 Aug). A sweep that
              has not been started yet takes `c.due` as its meter label ("16 TO FIX"), and the age
              lane read the same field — so the row stated one figure twice, side by side. It is
              the board's own band law in a new lane: the right lane must not mirror its
              neighbour. A sweep has no age, and an em dash is what the ref draws there. */}
          <span className="tdg-age">{sweep ? "—" : c.due}</span>
        </div>

        <div className="tdg-verbs" onClick={(e) => e.stopPropagation()}>
          {primary ? (
            <button
              type="button"
              className={`tdg-vb go${primary.ghost ? " ghost" : ""}`}
              onClick={() => {
                const leaf = menuModel
                  .flatMap((g) => g.entries)
                  .flatMap((e) => (e.kind === "leaf" ? [e] : e.sub))
                  .find((l) => l.id === primary.id);
                if (leaf) onVerb(c, leaf, column);
              }}
            >
              {primary.label}
            </button>
          ) : <span className="tdg-slot" />}

          {clock ? (
            <button
              type="button"
              className="tdg-vb"
              aria-haspopup="menu"
              aria-label={`Snooze “${c.title}”`}
              title="Snooze"
              onClick={(e) => openMenu(e, c, column, "snooze")}
            >
              <Clock size={13} aria-hidden />
            </button>
          ) : <span className="tdg-slot" />}

          {dismiss ? (
            <button
              type="button"
              className="tdg-vb"
              aria-haspopup="menu"
              aria-label={`Dismiss “${c.title}”`}
              title="Dismiss"
              onClick={(e) => openMenu(e, c, column, "dismiss")}
            >
              <X size={13} aria-hidden />
            </button>
          ) : <span className="tdg-slot" />}

          <button
            type="button"
            className="tdg-vb"
            aria-haspopup="menu"
            aria-expanded={menu?.key === c.key}
            aria-label={`Actions for ${c.title}`}
            onClick={(e) => openMenu(e, c, column)}
          >
            <MoreHorizontal size={13} aria-hidden />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="tdg">
      {menu && (
        <PortalMenu
          anchor={menu.anchor}
          groups={cardMenu(menu.card, menu.column)}
          openSub={menu.openSub}
          ariaLabel={`Actions for ${menu.card.title}`}
          onPick={(item) => { setMenu(null); onVerb(menu.card, item, menu.column); }}
          onClose={closeMenu}
        />
      )}

      {groups.map((g) => {
        const column = groupColumn(g.id);

        /* ⚠️ SNOOZED IS A SLIM FOLD, NOT A PANEL. It is the one group you asked for less of. */
        if (g.id === "snoozed") {
          return (
            <React.Fragment key={g.id}>
              <button
                type="button"
                className="tdg-fold"
                aria-expanded={snzOpen}
                onClick={() => setSnzOpen((v) => !v)}
              >
                <h3>
                  <span className="tdg-foldchev" aria-hidden><ChevronRight size={13} /></span>
                  {g.label}
                </h3>
                <span className="tdg-n">{g.cards.length}</span>
                <span className="tdg-desc">{g.description}</span>
              </button>
              {snzOpen && (
                <div className="tdg-sect">
                  <div className="tdg-panel">{g.cards.map((c) => renderRow(c, column))}</div>
                </div>
              )}
            </React.Fragment>
          );
        }

        /* ⚠️ ONLY HOUSEKEEPING FOLDS, AND `groupSlice` IS WHAT REFUSES THE REST. Hiding something
           that needs you now behind a "show more" is the one thing this page must not do — and
           the day's cleared work is never behind a toggle either (the rule the retired corner
           panel's spec carried). */
        const { visible, more } = groupSlice(g, hkExpanded);

        return (
          <div key={g.id} className="tdg-sect">
            <div className="tdg-shd">
              <h3>
                {g.id === "done"
                  ? <span className="tdg-foldchev" aria-hidden><ChevronDown size={13} /></span>
                  : <span className="tdg-dot" style={{ background: GROUP_DOT[g.id] }} aria-hidden />}
                {g.label}
              </h3>
              <span className="tdg-n">{g.cards.length}</span>
              <span className="tdg-desc">{g.description}</span>
            </div>
            <div className="tdg-panel">{visible.map((c) => renderRow(c, column))}</div>
            {more > 0 && (
              <div className="tdg-more">
                <button type="button" className="tdg-moreb" onClick={onToggleHk}>
                  <ChevronDown size={11} aria-hidden />
                  {showMoreLabel(more)}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
