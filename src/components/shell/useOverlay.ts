/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * useOverlay — the shell's ONE set of overlay obligations (§3).
 *
 * ⚠️ THIS IS AN EXTRACTION, NOT A NEW MECHANISM. Every line here already existed, twice, copied
 * verbatim between `todo/FocusFlow.tsx` and `todo/TaskSettingsSheet.tsx`: the same focus capture,
 * the same `lockStageScroll`, the same Tab trap walking DOM order, the same scrim-class click test.
 * A third copy was the alternative, and a third copy is how three overlays end up with three
 * slightly different ideas of what Tab does.
 *
 * What an overlay owes the person using it:
 *   · focus is trapped inside it, and returns to whatever invoked it on close;
 *   · Escape leaves — including while the entrance is still playing;
 *   · a click on the backdrop leaves, through whatever guard the host imposes;
 *   · assistive technology cannot walk into the page behind it;
 *   · the page behind it does not scroll.
 *
 * ⚠️ THE TWO EXISTING CALL SITES DIFFERED IN ONE REAL WAY AND ONE ACCIDENTAL ONE, and the
 * difference between those is the whole reason this is parameterised rather than fixed:
 *   · REAL: FocusFlow's backdrop click NUDGES the sheet (it holds a staged model that a stray click
 *     must not discard); TaskSettingsSheet's CLOSES (every switch has already been written, so
 *     there is nothing to lose). Both are correct for what they hold. `onScrimClick` is the seam.
 *   · ACCIDENTAL: one selector list included `select` and `textarea` and the other did not, so Tab
 *     escaped a settings sheet the moment anyone put a dropdown in it. The union is taken — an
 *     accidental difference is a bug in whichever copy is smaller, not a decision to preserve.
 *
 * ⚠️ INERTNESS IS APPLIED TO THE APP ROOT, NOT TO THE OVERLAY'S SIBLINGS. Overlays here portal to
 * `document.body`, so the thing to seal off is `#root` — and `inert` (React 19 supports it as a
 * real prop, but this is a DOM node we do not own) both removes it from the tab order and hides it
 * from assistive technology, which is two of the five obligations in one attribute. It is
 * REFERENCE-COUNTED: two overlays open at once (the sheet, and the dirty guard's confirm) must not
 * have the first one to close un-seal the page under the second.
 */
import { useEffect, useLayoutEffect, useRef } from "react";
import { lockStageScroll } from "../../lib/stageScroll";

/** Everything focusable, as the union of what the two extracted copies looked for. */
const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * ⚠️ COUNTED, NOT SET AND UNSET. `inert` is a single attribute on one shared node, so the naive
 * `add on mount / remove on unmount` unseals the page as soon as ANY overlay closes — and the
 * Query Centre sheet is routinely open underneath its own discard confirm. The count is
 * module-level because the node is.
 */
let inertDepth = 0;

function sealBackground(): () => void {
  const root = typeof document === "undefined" ? null : document.getElementById("root");
  if (!root) return () => {};
  inertDepth += 1;
  if (inertDepth === 1) root.setAttribute("inert", "");
  return () => {
    inertDepth = Math.max(0, inertDepth - 1);
    if (inertDepth === 0) root.removeAttribute("inert");
  };
}

export interface OverlayOptions {
  /**
   * Escape pressed. Bound on the WINDOW rather than on the root, so it works before anything inside
   * has been focused and while the entrance animation is still running — a writer who opened this
   * by accident should not have to wait for it to arrive before undoing it.
   */
  onEscape?: () => void;
  /**
   * Capture phase + `stopImmediatePropagation`, for an overlay sitting over a page that owns
   * Escape for something else. Off by default: swallowing the key is a decision, and permanent
   * chrome that does it reaches past its own business.
   */
  captureEscape?: boolean;
  /** Class names that ARE the backdrop — a click landing on one of these is a backdrop click. */
  scrimClasses: readonly string[];
  /** What a backdrop click means here. Omit and a backdrop click does nothing. */
  onScrimClick?: () => void;
}

export interface OverlayHandles {
  /** `onKeyDown` for the overlay root. */
  trapTab: (e: React.KeyboardEvent) => void;
  /** `onClick` for the overlay root. */
  scrimClick: (e: React.MouseEvent) => void;
}

/**
 * Call from a component that is MOUNTED ONLY WHILE OPEN — the mount is what arms every obligation
 * here, and a hook cannot be called conditionally. Hosts that keep an `open` flag should split an
 * inner component rather than gate this call.
 */
export function useOverlay<T extends HTMLElement>(
  rootRef: React.RefObject<T | null>,
  opts: OverlayOptions
): OverlayHandles {
  const { onEscape, captureEscape = false, scrimClasses, onScrimClick } = opts;

  /* Handlers are read through a ref so the mount effect below never re-runs on a new closure —
     re-running it would re-capture the invoker as whatever currently has focus, which by then is
     something inside the overlay, and "return focus on close" would return it to itself. */
  const latest = useRef({ onEscape, onScrimClick, scrimClasses });
  latest.current = { onEscape, onScrimClick, scrimClasses };

  /* ⚠️ `useLayoutEffect`, NOT `useEffect`. The invoker has to be read before the browser has had a
     chance to move focus anywhere, and the root has to take focus in the same frame it appears —
     otherwise the first Tab is measured against whatever was focused on the page behind. */
  useLayoutEffect(() => {
    const invoker = document.activeElement as HTMLElement | null;
    const releaseScroll = lockStageScroll();
    const unseal = sealBackground();
    rootRef.current?.focus();
    return () => {
      releaseScroll();
      unseal();
      /* ⚠️ RESTORED LAST, AND ONLY AFTER THE PAGE IS INTERACTIVE AGAIN. Focusing a node inside an
         element that is still `inert` silently does nothing. */
      invoker?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!onEscape) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (captureEscape) e.stopImmediatePropagation();
      latest.current.onEscape?.();
    };
    window.addEventListener("keydown", onKey, captureEscape);
    return () => window.removeEventListener("keydown", onKey, captureEscape);
  }, [onEscape, captureEscape]);

  const trapTab = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab") return;
    const root = rootRef.current;
    if (!root) return;
    /* `offsetParent !== null` is the cheap "is it actually on screen" test both copies used; it
       correctly excludes a step that is rendered but hidden, which these sheets are full of. */
    const els = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE))
      .filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);
    if (!els.length) return;
    const first = els[0];
    const last = els[els.length - 1];
    /* The root itself counts as "at the start": it holds focus on open, so the first Shift+Tab
       must wrap to the end rather than fall out of the overlay entirely. */
    if (e.shiftKey && (document.activeElement === first || document.activeElement === root)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const scrimClick = (e: React.MouseEvent) => {
    const t = e.target as HTMLElement;
    /* ⚠️ THE TARGET MUST *BE* THE BACKDROP, never merely be inside it. A `closest()` test here would
       treat every click in the overlay as a backdrop click, because the backdrop is the ancestor of
       everything. */
    if (latest.current.scrimClasses.some((c) => t.classList.contains(c))) {
      latest.current.onScrimClick?.();
    }
  };

  return { trapTab, scrimClick };
}
