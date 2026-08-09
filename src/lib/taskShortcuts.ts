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
