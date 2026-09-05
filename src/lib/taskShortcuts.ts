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
  /* ⚠️ TRIMMED TO THE WIRED SET (tightened round, Phase 2) — the page now CALLS this function,
     which changes what membership means: an action decided here and wired nowhere is a key that
     does nothing, the exact fault the old docstring warned the overlay against. The retired
     members — "tick" (space), "more" (.), "open" (o), "edit" (e) — belonged to the icon cluster,
     which is gone; if a future round wires one, it re-enters HERE first, with its key. */
  | "down" | "up"        // j / k and the arrows — move the focused row
  | "primary"            // enter — open the focused row in the workspace pane
  | "snooze"             // s — open the snooze panel on the focused row
  | "dismiss"            // d — open the dismiss confirm on the focused row
  | "close";             // esc — close the sheet (the page chains it last, after search)

/**
 * ⚠️ FOUR OF THESE ARE THE CLUSTER'S ICONS, ONE KEY EACH, AND THAT PAIRING IS THE POINT (icon
 * cluster P3). Every icon's tooltip prints its key, so the pointer path TEACHES the keyboard path;
 * a key the tooltip names and this function does not answer would be a lie told by the chrome.
 *
 * ⚠️ `Escape` WAS CALLED `dismiss` AND IS NOW `close`, because `x` needed the word. They are
 * genuinely different acts — Escape shuts a surface, `x` dismisses a CARD — and one name for both
 * is how a handler comes to close a menu when it meant to put a task away.
 */
export function listKey(e: ShortcutKey, typing: boolean): ListAction | null {
  if (typing || e.metaKey || e.ctrlKey || e.altKey) return null;
  switch (e.key) {
    case "j": case "J": case "ArrowDown": return "down";
    case "k": case "K": case "ArrowUp": return "up";
    case "Enter": return "primary";
    case "s": case "S": return "snooze";
    /* ⚠️ `d` DISMISSES NOW (tightened round, Phase 2) — the contract's key, printed in the list
       footer. `x` is UNBOUND again: its claim to the key was the icon cluster's tooltip, the
       cluster is gone, and a destructive key nothing on the page teaches is a stumble hazard.
       The SELECTION note below is amended in the same commit — the mail-client convention is
       available again. */
    case "d": case "D": return "dismiss";
    case "Escape": return "close";
    default: return null;
  }
}

/**
 * ⚠️ `W` — WORK THE LIST — IS A PAGE KEY, NOT A ROW KEY, and it is separated deliberately: it acts
 * on the whole list rather than on whatever happens to be focused, so it belongs with `/` on the
 * window listener rather than with the row keys inside the list.
 */
/**
 * ⚠️ RETIRED WITH THE BUTTON (corrections, Phase 4). `W` opened the dock over the whole queue; the
 * dock IS the right-hand pane now and never leaves the screen, so the key entered a mode you were
 * already in. It is OFF `KEY_MAP` — the overlay must not advertise a key that does nothing, which
 * is the fault the map is built FROM `KEY_MAP` to prevent.
 *
 * The predicate survives unreferenced by the page so the key stays claimed rather than silently
 * falling through to the browser; deleting it is a follow-up once nothing reads it at all.
 */
export function worksTheList(e: ShortcutKey, typing: boolean): boolean {
  return !typing && !e.metaKey && !e.ctrlKey && !e.altKey && (e.key === "w" || e.key === "W");
}

/**
 * ⚠️ `X` IS UNBOUND AGAIN (tightened round, Phase 2) — dismiss moved to `d`, the contract's key.
 * The icon cluster whose tooltip taught `x` is long gone, and a destructive key nothing on the
 * page advertises is a stumble hazard rather than a shortcut. Consequence for the still-unbuilt
 * selection model: the mail-client convention (`x` selects) is AVAILABLE again, should selection
 * ever be built. Nothing selection-shaped exists today — that half of the old note stands.
 */
export const SELECTION_STILL_NOT_BUILT = true;

/**
 * The map `?` opens — one source, so the overlay and the handler cannot list different keys.
 *
 * ⚠️ EVERY KEY THE CLUSTER'S TOOLTIPS PRINT IS ANSWERED HERE. The tooltips teach four keys and
 * this map teaches the rest; a key advertised on an icon and missing from the map would leave the
 * page's own help sheet contradicting its own chrome. Locked against `listKey` in both directions.
 */
export const KEY_MAP: { key: string; does: string }[] = [
  { key: "J / K", does: "Move down and up the rows" },
  { key: "Enter", does: "Open the focused row in the workspace" },
  { key: "S", does: "Open the snooze panel on the focused row" },
  { key: "D", does: "Dismiss the focused row — a confirm first, undo from the receipt" },
  { key: "/", does: "Jump to search" },
  { key: "Esc", does: "Close the sheet" },
];
