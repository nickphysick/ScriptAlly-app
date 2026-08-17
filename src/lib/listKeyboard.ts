/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * listKeyboard — the Query Centre list's navigation model (pairing pack §4c).
 *
 * ⚠️ PURE, BECAUSE THE ONLY THING THE BROWSER CAN PROVE HERE IS THE SCROLLING. This repo's suites
 * are `environment: 'node'` — no jsdom — so a key handler written inline in the component is a
 * handler no test can call. Every decision the widget makes is a function of (keys, positions,
 * labels) and lives here; the component owns focus, scroll and the DOM, which is what the browser
 * measure covers.
 *
 * ⚠️ INDICES INTO ONE VISUAL ORDER, NEVER "the filtered list" AND "the rendered list". The caller
 * passes the flat order it actually draws — groups partition it, and a folded group contributes
 * nothing — so "Down crosses a group boundary" is not a special case here. It is what happens when
 * headings are simply not in the array.
 */

/** The keys the list answers to. Everything else falls through to the page. */
export type ListNavKey = "ArrowUp" | "ArrowDown" | "Home" | "End" | "PageUp" | "PageDown";

export const LIST_NAV_KEYS: readonly ListNavKey[] = ["ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"];

export const isListNavKey = (key: string): key is ListNavKey => (LIST_NAV_KEYS as readonly string[]).includes(key);

/**
 * Where a navigation key lands.
 *
 * ⚠️ THE ARROWS CLAMP; THEY DO NOT WRAP. Wrapping a 40-row list means Down at the bottom silently
 * returns you to the top, which in a master–detail list ALSO changes what the pane is reading — so
 * a held-down arrow key would cycle the whole database past the reader. Type-ahead wraps because a
 * search that gives up at the end has failed to search; movement does not.
 *
 * ⚠️ AND FROM NOWHERE, DOWN GOES TO THE FIRST AND UP TO THE LAST. `current` is -1 when nothing in
 * the list holds focus yet; both keys must land somewhere, and landing at the near end is what the
 * key's direction means.
 */
export function nextIndex(key: ListNavKey, current: number, count: number, pageSize: number): number | null {
  if (count <= 0) return null;
  const last = count - 1;
  const page = Math.max(1, Math.floor(pageSize));
  const at = current >= 0 && current <= last ? current : -1;
  switch (key) {
    case "ArrowDown": return at < 0 ? 0 : Math.min(last, at + 1);
    case "ArrowUp": return at < 0 ? last : Math.max(0, at - 1);
    case "Home": return 0;
    case "End": return last;
    case "PageDown": return at < 0 ? Math.min(last, page - 1) : Math.min(last, at + page);
    case "PageUp": return at < 0 ? 0 : Math.max(0, at - page);
  }
}

/** How long a typed run stays one search. */
export const TYPEAHEAD_MS = 500;

/**
 * ⚠️ A SINGLE PRINTABLE CHARACTER, AND NOT WHILE A MODIFIER IS DOWN. `⌘K` and `⌥F` are the page's
 * own; treating their letter as type-ahead would move the reader's selection every time they
 * reached for a shortcut. `key.length === 1` is what separates "a" from "ArrowDown".
 */
export const isTypeAheadKey = (key: string, mods: { alt?: boolean; ctrl?: boolean; meta?: boolean }): boolean =>
  key.length === 1 && key !== " " && !mods.alt && !mods.ctrl && !mods.meta;

/**
 * The row a typed buffer selects.
 *
 * ⚠️ IT SEARCHES FROM THE ROW AFTER THE CURRENT ONE AND WRAPS, so a second press of the same letter
 * moves to the next match rather than sitting on the first. That is the whole behaviour of
 * type-ahead in a list, and it is why `from` is an input rather than always 0.
 *
 * ⚠️ A RUN OF ONE REPEATED LETTER MATCHES ON THAT LETTER, not on the run. "aaa" typed quickly means
 * "the third agent starting with A", not "an agent called aaa…" — the ARIA convention, and without
 * it a repeated key sticks on one row and looks broken.
 */
export function typeAheadIndex(labels: readonly string[], buffer: string, from: number): number | null {
  const n = labels.length;
  if (!n || !buffer) return null;
  const b = buffer.toLowerCase();
  const repeated = b.length > 1 && [...b].every((c) => c === b[0]);
  const needle = repeated ? b[0] : b;
  /* ⚠️ A REPEATED RUN ALWAYS ADVANCES; a growing buffer may match where it already is, because the
     writer is narrowing rather than stepping. */
  const start = repeated || b.length === 1 ? from + 1 : from;
  for (let i = 0; i < n; i++) {
    const at = ((start + i) % n + n) % n;
    if ((labels[at] ?? "").toLowerCase().startsWith(needle)) return at;
  }
  return null;
}

/**
 * Where focus goes when the list under it changes — a filter, a sort, a search, a deletion.
 *
 * ⚠️ NOT THE TOP, AND NOT `<body>`. Landing on the top throws the reader back to the start of a
 * list they were part-way down; landing nowhere silently ends the keyboard session, and the next
 * Tab restarts from the page's first control. Both are the same fault: the widget forgetting where
 * the writer was because its contents moved.
 *
 * ⚠️ FORWARD FIRST, THEN BACK. Filtering usually REMOVES rows, so the row that took the missing
 * one's place is the one now under the writer's eye. Falling back to the previous surviving row
 * keeps focus inside the list when the removal was at the end.
 */
export function nearestSurvivor(previous: readonly string[], next: readonly string[], fromId: string | null): string | null {
  if (!next.length) return null;
  if (fromId && next.includes(fromId)) return fromId;
  const at = fromId ? previous.indexOf(fromId) : -1;
  if (at < 0) return next[0];
  for (let d = 1; d < previous.length; d++) {
    const fwd = previous[at + d];
    if (fwd && next.includes(fwd)) return fwd;
    const back = previous[at - d];
    if (back && next.includes(back)) return back;
  }
  return next[0];
}

/**
 * How many rows a page key moves.
 *
 * ⚠️ DERIVED FROM THE VIEWPORT AND THE ROW, never a constant. "By a viewport" is a promise about
 * what the writer sees; a fixed 10 keeps that promise only at one window height and one row height,
 * and this list's rows change height with the group they are in.
 *
 * ⚠️ AND IT IS AT LEAST ONE. A zero row height — a list measured before layout — would otherwise
 * make PageDown a key that does nothing, which is indistinguishable from a broken handler.
 */
export function pageSizeFor(viewportPx: number, rowPx: number): number {
  if (!(rowPx > 0) || !(viewportPx > 0)) return 1;
  return Math.max(1, Math.floor(viewportPx / rowPx));
}
