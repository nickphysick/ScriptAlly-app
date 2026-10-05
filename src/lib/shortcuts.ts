/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE KEYBOARD SHORTCUTS — one registry (manuscript switcher v2, Part B). Every binding reads its
 * key from here and the shortcuts sheet lists what is here, so the sheet and the bindings cannot
 * disagree.
 *
 * ⚠️ IT LISTS ONLY SHORTCUTS THAT EXIST — a binding that reaches the page, verified. Two bindings in
 * the Query Centre's internals are deliberately absent: `/` (its target, `browseSearchRef`, is
 * attached to nothing, so the handler always returns) and ⌘↵ (create mode's form is not shown to
 * be reachable on today's page). Escape closing a surface and Enter/arrows inside a menu are UI
 * conventions, not shortcuts, and are not listed either.
 *
 * ⚠️ `bound` NAMES THE FILE THAT READS THE ENTRY, and a unit lock checks that file actually does —
 * so an entry with no binding fails, which is the sheet's promise.
 */

export type ShortcutScope = "Everywhere" | "To-do list" | "Calendar" | "A task's choices" | "Comparable titles" | "The agent card";
export const SCOPE_ORDER: readonly ShortcutScope[] = ["Everywhere", "To-do list", "Calendar", "A task's choices", "Comparable titles", "The agent card"];

/** One way to press it. `mod` is ⌘ on a Mac and Ctrl elsewhere; letters match either case. */
export interface KeyChord { key: string; mod?: boolean }

export interface Shortcut {
  /** The ways to press it — any one matches. */
  chords: readonly KeyChord[];
  /** What it does, as the sheet says it. */
  label: string;
  scope: ShortcutScope;
  /** The source file whose binding reads this entry (checked by a unit lock). */
  bound: string;
  /** Whether it stands down while focus is in an editable field (the binding's own rule, stated). */
  inFields: "stands down" | "works";
}

const k = (key: string, mod = false): KeyChord => ({ key, mod });

export const SHORTCUTS = {
  search:           { chords: [k("k", true)], label: "Search", scope: "Everywhere", bound: "src/components/shell/usePalette.tsx", inFields: "works" },
  sidebar:          { chords: [k("\\", true), k("[")], label: "Collapse or expand the sidebar", scope: "Everywhere", bound: "src/components/shell/useSidebarCollapsed.ts", inFields: "stands down" },
  switchManuscript: { chords: [k("m")], label: "Switch manuscript", scope: "Everywhere", bound: "src/components/shell/BarSwitcher.tsx", inFields: "stands down" },
  shortcuts:        { chords: [k("?")], label: "Show keyboard shortcuts", scope: "Everywhere", bound: "src/components/shell/ShortcutsSheet.tsx", inFields: "stands down" },
  undo:             { chords: [k("z", true)], label: "Undo, while its note is showing", scope: "Everywhere", bound: "src/components/queryActions/UndoBar.tsx", inFields: "stands down" },
  todoSearch:       { chords: [k("/")], label: "Find a task", scope: "To-do list", bound: "src/lib/taskShortcuts.ts", inFields: "stands down" },
  todoDown:         { chords: [k("j"), k("ArrowDown")], label: "Next task", scope: "To-do list", bound: "src/lib/taskShortcuts.ts", inFields: "stands down" },
  todoUp:           { chords: [k("k"), k("ArrowUp")], label: "Previous task", scope: "To-do list", bound: "src/lib/taskShortcuts.ts", inFields: "stands down" },
  todoOpen:         { chords: [k("Enter")], label: "Open the task", scope: "To-do list", bound: "src/lib/taskShortcuts.ts", inFields: "stands down" },
  todoSnooze:       { chords: [k("s")], label: "Snooze the task", scope: "To-do list", bound: "src/lib/taskShortcuts.ts", inFields: "stands down" },
  todoDismiss:      { chords: [k("d")], label: "Dismiss the task", scope: "To-do list", bound: "src/lib/taskShortcuts.ts", inFields: "stands down" },
  todoClose:        { chords: [k("Escape")], label: "Close the open task", scope: "To-do list", bound: "src/lib/taskShortcuts.ts", inFields: "stands down" },
  calBack:          { chords: [k("ArrowLeft")], label: "A week earlier", scope: "Calendar", bound: "src/components/todo/TodoCalendarPage.tsx", inFields: "stands down" },
  calForward:       { chords: [k("ArrowRight")], label: "A week later", scope: "Calendar", bound: "src/components/todo/TodoCalendarPage.tsx", inFields: "stands down" },
  calToday:         { chords: [k("t")], label: "Back to today", scope: "Calendar", bound: "src/components/todo/TodoCalendarPage.tsx", inFields: "stands down" },
  taskChoice:       { chords: [k("1"), k("9")], label: "Choose an option by its number (1 to 9)", scope: "A task's choices", bound: "src/components/todo/TaskPane.tsx", inFields: "stands down" },
  compAdd:          { chords: [k("n")], label: "Add a comparable title", scope: "Comparable titles", bound: "src/components/manuscripts/ComparableTitlesPage.tsx", inFields: "stands down" },
  /* the quick view's keys (Agent card v1 §2–3) — they act only on the card that is open, and only
     when no field has focus; the card's own handler stops them reaching a page beneath it */
  cardEdit:         { chords: [k("e")], label: "Edit the agent", scope: "The agent card", bound: "src/components/agents/card/AgentQuickView.tsx", inFields: "stands down" },
  cardPrev:         { chords: [k("ArrowLeft")], label: "Previous agent in the list", scope: "The agent card", bound: "src/components/agents/card/AgentQuickView.tsx", inFields: "stands down" },
  cardNext:         { chords: [k("ArrowRight")], label: "Next agent in the list", scope: "The agent card", bound: "src/components/agents/card/AgentQuickView.tsx", inFields: "stands down" },
} as const satisfies Record<string, Shortcut>;

export type ShortcutId = keyof typeof SHORTCUTS;

/** The minimal event a matcher needs — a DOM KeyboardEvent or a test's plain object. */
export interface KeyLike { key: string; metaKey?: boolean; ctrlKey?: boolean; altKey?: boolean; shiftKey?: boolean }

/**
 * Does this event press one of the shortcut's chords? A `mod` chord needs ⌘ or Ctrl; a plain chord
 * refuses ⌘, Ctrl and Alt. Letters compare case-insensitively. `?` is matched by the character it
 * types, whatever the layout puts it under (it is ⇧/ on a UK or US keyboard).
 *
 * ⚠️ THE RANGE CHORD: `taskChoice` lists 1 and 9 as its ends, and matches any digit between them.
 */
export function matchesShortcut(sc: Shortcut, e: KeyLike): boolean {
  const mod = e.metaKey || e.ctrlKey;
  if (sc === SHORTCUTS.taskChoice) return !mod && !e.altKey && /^[1-9]$/.test(e.key);
  return sc.chords.some((c) => {
    if (c.mod ? !mod : (mod || e.altKey)) return false;
    return c.key.length === 1 ? e.key.toLowerCase() === c.key.toLowerCase() : e.key === c.key;
  });
}

/** Focus is in something that owns typed characters. */
export function isEditableTarget(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el || typeof el.closest !== "function") return false;
  return !!el.closest("input, textarea, select, [contenteditable]:not([contenteditable='false'])");
}

/** A modal is open: anything that declares `aria-modal`, or an open `<dialog>`, and is laid out. */
export function modalOpen(): boolean {
  if (typeof document === "undefined") return false;
  return [...document.querySelectorAll<HTMLElement>('[aria-modal="true"], dialog[open]')].some((e) => e.getBoundingClientRect().width > 0);
}

/** The guard the plain-key global shortcuts share: never in a field, never over a modal. */
export function shortcutBlocked(e: { target: EventTarget | null }): boolean {
  return isEditableTarget(e.target) || modalOpen();
}

/** The keycaps for one chord, by platform: ["⌘", "K"] on a Mac, ["Ctrl", "K"] elsewhere. */
export function keycaps(c: KeyChord, mac: boolean): string[] {
  const NAMES: Record<string, string> = { ArrowDown: "↓", ArrowUp: "↑", ArrowLeft: "←", ArrowRight: "→", Enter: "↵", Escape: "Esc", "\\": "\\" };
  const key = NAMES[c.key] ?? (c.key.length === 1 ? c.key.toUpperCase() : c.key);
  return c.mod ? [mac ? "⌘" : "Ctrl", key] : [key];
}

export const isMac = (): boolean =>
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || "");

/** The single-key label a control's tooltip names ("M", "?"). */
export const shortcutLabel = (id: ShortcutId): string => keycaps(SHORTCUTS[id].chords[0], isMac()).join("");

/** The registry grouped by scope, in the sheet's order. */
export function shortcutGroups(): { scope: ShortcutScope; items: { id: ShortcutId; sc: Shortcut }[] }[] {
  const ids = Object.keys(SHORTCUTS) as ShortcutId[];
  return SCOPE_ORDER.map((scope) => ({
    scope,
    items: ids.filter((id) => SHORTCUTS[id].scope === scope).map((id) => ({ id, sc: SHORTCUTS[id] as Shortcut })),
  })).filter((g) => g.items.length > 0);
}
