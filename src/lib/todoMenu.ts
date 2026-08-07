/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * todoMenu — the board card's ⋯ menu, as data (board fixes II, Phase 1; ref
 * design-refs/todo-board-settled.html, menu M2).
 *
 * ⚠️ THE MENU IS A MODEL, NOT MARKUP. Every per-kind and per-column variation lives HERE, in one
 * pure function the tests can walk exhaustively — the component renders whatever this returns and
 * decides nothing. The old `cardVerbs` flat list is retired: it could not say WHY an item was
 * offered (its three intents were implicit in the order), and its variants had started to
 * accumulate as inline conditions at the render site.
 *
 * The grammar is THREE INTENT GROUPS — DO IT · PUT IT OFF · GO ELSEWHERE — plus an unheaded
 * management group for a user task's own Edit/Delete. Two whole-menu collapses: the DONE column
 * (Undo + Open the query and nothing else — a finished card needs no planning), and a sweep card
 * loses GO ELSEWHERE entirely (it spans many records, so there is no one place to go).
 *
 * ⚠️ EVERY ITEM THAT OPENS SOMETHING SAYS SO: "…" in the label for an item that opens a dialogue
 * or confirm, `goes` (rendered ▸) for an item that takes you somewhere (the dock, the query, the
 * agent), and a `sub` parent (rendered ▸, expanding in place) for the tier choices. A menu item
 * that silently opened a second surface would be a door with no handle drawn on it.
 */
import { BoardCard } from "./todoBoard";
import { TodoColumnId, isSweepCard } from "./todoColumns";

export type MenuItemId =
  | "action"        // Action now / Start the sweep — the dock (or the sweep's sheet)
  | "today"         // ＋ Add to today ↔ − Remove from today
  | "snooze-1"      // the tiers — tomorrow
  | "snooze-7"      // the tiers — a week
  | "unsnooze"      // Return it now (Snoozed column only)
  | "dismiss-week"  // the fork's first tier — not now, back in a week
  | "dismiss-never" // the fork's second tier — never this query / these agents
  | "dismiss-rule"  // the fork's third tier — never any agent missing this (sweeps only)
  | "undo-done"     // Done column, user tasks — untick
  | "open-query"
  | "view-agent"
  | "edit-task"
  | "delete-task"
  | "give-date"    // the Noteboard's conversion door (tasks-pages P4)
  | "tags";        // the tag sheet (tasks-pages P5 — arrives WITH its picker)

export interface MenuLeaf {
  kind: "leaf";
  id: MenuItemId;
  label: string;
  /** The weighted first line (Action now) — bold in the render. */
  weight?: true;
  /** Takes you somewhere (dock / query / agent) — rendered with the ▸ marker. */
  goes?: true;
  disabled?: true;
  /** The refusal states its reason (shown as the control's title). */
  why?: string;
  danger?: true;
}

export interface MenuParent {
  kind: "sub";
  id: "snooze" | "resnooze" | "dismiss";
  label: string;
  sub: MenuLeaf[];
}

export type MenuEntry = MenuLeaf | MenuParent;

export interface MenuGroup {
  /** The mono intent head — null for the unheaded management / collapsed groups. */
  head: "DO IT" | "PUT IT OFF" | "GO ELSEWHERE" | null;
  entries: MenuEntry[];
}

const leaf = (id: MenuItemId, label: string, extra?: Partial<MenuLeaf>): MenuLeaf =>
  ({ kind: "leaf", id, label, ...extra }) as MenuLeaf;

/** The snooze tiers — the SAME vocabulary the Later menus ship ("Remind me tomorrow" / "Give it
 *  a week"). ⚠️ AN OFFER'S SNOOZE IS CAPPED AT TOMORROW: its reply-by window is not yours to
 *  move, so the week tier is simply absent rather than disabled — a tier that can never be
 *  chosen is not a choice. */
function snoozeTiers(isOffer: boolean): MenuLeaf[] {
  const tiers = [leaf("snooze-1", "Remind me tomorrow")];
  if (!isOffer) tiers.push(leaf("snooze-7", "Give it a week"));
  return tiers;
}

/** The dismiss tiers — the never-fork's own copy, verbatim, so the menu and the fork cannot
 *  drift apart about what each tier means. */
function dismissTiers(sweep: boolean): MenuLeaf[] {
  return sweep
    ? [
        leaf("dismiss-week", "Not now — back in a week"),
        leaf("dismiss-never", "Never — just these agents"),
        leaf("dismiss-rule", "Never — any agent missing this"),
      ]
    : [
        leaf("dismiss-week", "Not now — back in a week"),
        leaf("dismiss-never", "Never — just this query"),
      ];
}

export function cardMenu(card: BoardCard, column: TodoColumnId): MenuGroup[] {
  const sweep = isSweepCard(card);
  const isOffer = card.taskType === "offer_received";
  const isUserTask = !!card.userTaskId;

  /* ⚠️ DONE COLLAPSES. A cleared card offers exactly its way back (user tasks — the untick) and
     its record. Planning verbs on a finished thing would imply it is not finished. */
  if (column === "done" || card.done) {
    const entries: MenuEntry[] = [];
    if (isUserTask) entries.push(leaf("undo-done", "Undo — put it back"));
    if (card.relatedRecordId && !isUserTask) entries.push(leaf("open-query", "Open the query", { goes: true }));
    return [{ head: null, entries }];
  }

  const doIt: MenuEntry[] = [
    sweep
      ? leaf("action", "Start the sweep", { weight: true, goes: true })
      : leaf("action", "Action now", { weight: true, goes: true }),
  ];
  /* A sweep is a standing pile, never a Today commitment — the columns already refuse it. */
  if (!sweep) {
    doIt.push(
      column === "today"
        ? leaf("today", "− Remove from today")
        : leaf("today", "＋ Add to today"),
    );
  }

  const putOff: MenuEntry[] = [];
  if (column === "snoozed") {
    /* ⚠️ IN SNOOZED THE SNOOZE LINE CHANGES SHAPE: the card is already put away, so the choices
       are to wake it or to move its date — never a second "Snooze…" that reads as a no-op. */
    putOff.push(leaf("unsnooze", "Return it now"));
    putOff.push({ kind: "sub", id: "resnooze", label: "Change the date…", sub: snoozeTiers(isOffer) });
  } else {
    putOff.push({ kind: "sub", id: "snooze", label: "Snooze…", sub: snoozeTiers(isOffer) });
  }
  if (isOffer) {
    /* ⚠️ AN OFFER HAS NO DISMISS, ANYWHERE — and the line still renders, disabled and saying so.
       Its absence would read as an oversight; a writer who has been told once still deserves the
       reminder at the moment they reach for it. (Carried over from cardVerbs, verbatim.) */
    putOff.push(leaf("dismiss-week", "Dismiss — not for offers", {
      disabled: true,
      why: "An offer has a reply-by date that is not yours to move.",
    }));
  } else if (!isUserTask) {
    putOff.push({ kind: "sub", id: "dismiss", label: "Dismiss…", sub: dismissTiers(sweep) });
  }
  /* A user task has no dismiss: its put-off is the snooze, and its removal is Delete below —
     the fork is the DERIVED cards' stance machinery, and a user task has no rule to mute. */

  const elsewhere: MenuEntry[] = [];
  if (!sweep && card.relatedRecordId && !isUserTask) {
    elsewhere.push(leaf("open-query", "Open the query", { goes: true }));
  }
  if (!sweep && card.agentId) {
    elsewhere.push(leaf("view-agent", "View the agent", { goes: true }));
  }

  const groups: MenuGroup[] = [
    { head: "DO IT", entries: doIt },
    { head: "PUT IT OFF", entries: putOff },
  ];
  if (elsewhere.length) groups.push({ head: "GO ELSEWHERE", entries: elsewhere });
  if (isUserTask) {
    groups.push({
      head: null,
      entries: [
        leaf("edit-task", "Edit the task…"),
        leaf("tags", "Tags…"), // tasks-pages P5 — lands with the picker, never a dead line
        leaf("delete-task", "Delete the task…", { danger: true }),
      ],
    });
  }
  return groups;
}

/**
 * ⚠️ THE NOTEBOARD'S ⋯ MENU (tasks-pages P4) — grouped as everywhere else, through the same
 * PortalMenu shell. A note is USER CONTENT, the only deletable kind, so Delete is here — behind
 * the styled confirm and an 8s undo at the page. "Give it a date…" is the CONVERSION door: one
 * write (dueDate), and the note becomes a task — leaves this board, joins Your tasks, appears on
 * the Calendar. ("Tags…" joins this menu in Phase 5 WITH its picker — a menu line shipped ahead
 * of its surface would be a dead affordance.)
 */
export function noteMenu(): MenuGroup[] {
  return [
    {
      head: null,
      entries: [
        leaf("edit-task", "Edit the note…"),
        leaf("give-date", "Give it a date…"),
        leaf("tags", "Tags…"), // tasks-pages P5 — lands with the picker
      ],
    },
    {
      head: null,
      entries: [leaf("delete-task", "Delete the note…", { danger: true })],
    },
  ];
}

/* ── placement ─────────────────────────────────────────────────────────────────────────────── */

export interface MenuPlace {
  left: number;
  top: number;
  /** True when the menu opens upward (flipped off the viewport's bottom edge). */
  up: boolean;
}

/**
 * Where the portal menu sits — fixed coordinates from the trigger's rect. Right-aligned to the
 * trigger (the seat is the card's bottom-right corner), opening DOWNWARD by default and flipping
 * UP when the menu would cross the viewport's bottom edge; both axes clamp to an 8px inset so the
 * menu is never drawn off-screen. Pure, so the flip is testable without a DOM.
 */
export function placeMenu(
  trigger: { left: number; right: number; top: number; bottom: number },
  menu: { w: number; h: number },
  viewport: { w: number; h: number },
  gap = 6,
): MenuPlace {
  const left = Math.max(8, Math.min(trigger.right - menu.w, viewport.w - menu.w - 8));
  const up = trigger.bottom + gap + menu.h > viewport.h - 8;
  const top = up
    ? Math.max(8, trigger.top - gap - menu.h)
    : trigger.bottom + gap;
  return { left, top, up };
}
