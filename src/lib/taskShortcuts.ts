/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * taskShortcuts — the Tasks page's keyboard DECISIONS, pure (tasks-consolidation; the search
 * shortcut, 9 Aug).
 *
 * ⚠️ WHY A MODULE FOR ONE PREDICATE. It lived as an inline condition inside a `useEffect` closure,
 * which means the only way to assert it was to read the page's source and hope the string still
 * meant what it said. That is the same shape `todoActions` was extracted for: a decision inside a
 * component is a coincidence rather than a guarantee, and this one has two easy ways to be wrong
 * that a source-string test cannot tell apart from correct (a `/` that fires while you are typing,
 * and a `/` that fires with a modifier held).
 *
 * ⚠️ THIS IS THE SEED OF PHASE 6's KEYBOARD WORK, not a finished registry. Phase 6 owns "the whole
 * page drivable without a mouse"; what is here is only what the search field needs today, and it
 * is stated so the phase has somewhere to grow into rather than a second home to compete with.
 */

/** The parts of a keydown this decision reads — a plain shape, so a test needs no DOM. */
export interface ShortcutKey {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
}

/**
 * ⚠️ TWO KEYS, ONE FIELD. `⌘K`/`^K` is the app's established search shortcut and works from
 * anywhere, typing or not — it carries a modifier, so it cannot collide with text entry.
 *
 * `/` is the bare-key form, and it is the one with a trap: it must stand down while the writer is
 * TYPING, or a slash is the single character they cannot enter into their own note. `typing` is
 * supplied by the caller, because "is this element a text surface" is a DOM question and this is
 * not a DOM module.
 *
 * ⚠️ A BARE `/` ALSO STANDS DOWN UNDER ANY MODIFIER. `⌥/` and `⇧/` are real characters on several
 * keyboard layouts (⇧/ is `?` on a UK layout), and `⌘/` belongs to the browser. Claiming the key
 * regardless of modifiers would take all of them.
 */
export function focusesSearch(e: ShortcutKey, typing: boolean): boolean {
  if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) return true;
  return e.key === "/" && !typing && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey;
}

/** The DOM half, kept beside its decision: which elements own the keystroke while focused. */
const TEXT_TAGS = ["INPUT", "TEXTAREA", "SELECT"];

export function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || typeof el.tagName !== "string") return false;
  return el.isContentEditable === true || TEXT_TAGS.includes(el.tagName);
}

/* ── the list's own keys (tasks-consolidation P6; ref sheet 7) ─────────────────────────────── */

/**
 * ⚠️ EVERY ONE OF THESE IS A BARE KEY, so the typing guard is not a nicety — it is the whole
 * reason this is a function rather than a switch inside a handler. `j`, `k`, `s`, `e`, `x` and a
 * space are all characters a writer types into a title; claiming them while a field has focus
 * would make the composer unusable in a way that reads as a broken keyboard rather than as a
 * shortcut. The caller supplies `typing`; this decides nothing about the DOM.
 *
 * ⚠️ AND MODIFIERS ARE NOT OURS. ⌘K is the search; ⌘/⌃/⌥ with any of these belongs to the browser
 * or to the OS, and a page that swallows them takes a tool the writer already had.
 */
export type ListAction =
  | "down" | "up"        // j / k — move the focused row
  | "tick"               // space — complete, or open the flow where the tick is not the act
  | "primary"            // enter — fire the row's primary verb
  | "snooze"             // s — open the dial on the focused row
  | "edit"               // e — the writer's own items only; the row decides, not this
  | "dismiss"            // esc — close the dial, then the menu (the row decides the order)
  | "help";              // ? — the map, over the page

export function listKey(e: ShortcutKey, typing: boolean): ListAction | null {
  if (typing || e.metaKey || e.ctrlKey || e.altKey) return null;
  switch (e.key) {
    case "j": case "J": return "down";
    case "k": case "K": return "up";
    case " ": return "tick";
    case "Enter": return "primary";
    case "s": case "S": return "snooze";
    case "e": case "E": return "edit";
    case "Escape": return "dismiss";
    case "?": return "help";
    default: return null;
  }
}

/**
 * ⚠️ `W` — WORK THE LIST — IS A PAGE KEY, NOT A ROW KEY, and it is separated deliberately: it acts
 * on the whole list rather than on whatever happens to be focused, so it belongs with `/` on the
 * window listener rather than with the row keys inside the list.
 */
export function worksTheList(e: ShortcutKey, typing: boolean): boolean {
  return !typing && !e.metaKey && !e.ctrlKey && !e.altKey && (e.key === "w" || e.key === "W");
}

/**
 * ⚠️ `X` — SELECT — IS DELIBERATELY ABSENT, and this is where the absence is recorded.
 *
 * Sheet 7 says "selection borrows the batch model wholesale". THERE IS NO BATCH MODEL. The
 * ledger's selection machinery was retired with the run sheet (Final Shape P5), `todoLedger`'s
 * `batch*` helpers are the housekeeping COHORT rather than a selection, and board-optimise's own
 * Phase 8 was left unbuilt for exactly this reason with the finding written up and Nick's call
 * still open. Building one fresh here would contradict the phase's own central instruction and is
 * a pack of its own.
 *
 * So `x` is not bound, no checkbox renders, and no selection bar exists. Nothing is half-built.
 */
export const SELECTION_NOT_BUILT = "x" as const;

/** The map `?` opens — one source, so the overlay and the handler cannot list different keys. */
export const KEY_MAP: { key: string; does: string }[] = [
  { key: "J / K", does: "Move down and up the rows" },
  { key: "Space", does: "Tick the focused row — or open its flow, where the tick is not the act" },
  { key: "Enter", does: "Fire the primary verb" },
  { key: "S", does: "Open the snooze dial on the focused row" },
  { key: "E", does: "Edit — your tasks and notes only" },
  { key: "/", does: "Jump to search" },
  { key: "W", does: "Work the list — opens the dock at the top of the order" },
  { key: "Esc", does: "Close the dial, then the menu" },
  { key: "?", does: "This map" },
];
