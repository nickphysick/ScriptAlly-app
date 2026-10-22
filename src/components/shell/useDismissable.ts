/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * useDismissable — Manuscripts v28 Part G: ONE way a drop-down, menu, popover or combobox closes. While `open`, it
 * closes on:
 *
 *   · a pointer press outside `rootRef` (capture phase, so a handler that stops propagation cannot keep it open)
 *   · focus moving outside it (Tab away)
 *   · Escape — as a layer on the app's ONE escape stack (lib/escapeStack), so Escape closes only the topmost layer:
 *     a menu inside the edit drawer closes and the drawer stays (the drawer is `pageDrawer`, this defaults above it)
 *
 * A pick closes it too, but that is the caller's: it knows what a pick is.
 *
 * `ignore` names presses that must not count as "outside" (the button that opened it, which toggles on its own click:
 * closing first would reopen it on the same press).
 */
import { useEffect, useRef } from "react";
import { ESC_LEVEL, useEscapeLayer } from "../../lib/escapeStack";

export function useDismissable(
  open: boolean,
  rootRef: React.RefObject<HTMLElement | null>,
  close: () => void,
  opts: { level?: number; ignore?: (target: Element) => boolean } = {},
): void {
  const latest = useRef(close);
  latest.current = close;
  const ignore = useRef(opts.ignore);
  ignore.current = opts.ignore;
  useEscapeLayer(open, () => latest.current(), opts.level ?? ESC_LEVEL.pageModal);
  useEffect(() => {
    if (!open) return undefined;
    const outside = (t: EventTarget | null): boolean => {
      if (!(t instanceof Node)) return false;
      if (rootRef.current?.contains(t)) return false;
      if (t instanceof Element && ignore.current?.(t)) return false;
      return true;
    };
    const down = (e: PointerEvent) => { if (outside(e.target)) latest.current(); };
    const focus = (e: FocusEvent) => { if (outside(e.target)) latest.current(); };
    document.addEventListener("pointerdown", down, true);
    document.addEventListener("focusin", focus, true);
    return () => {
      document.removeEventListener("pointerdown", down, true);
      document.removeEventListener("focusin", focus, true);
    };
  }, [open, rootRef]);
}
