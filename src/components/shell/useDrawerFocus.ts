/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Drawers for keyboard and screen-reader users (overnight fixes v1, Part 7; the app audit's last High finding).
 *
 * One hook for the drawer shells (SidePanel, DrawerShell, HalfDrawer and the page drawers that have their own root).
 * - ON OPEN, focus moves in: to the first field when the drawer opens on a form, otherwise to its close button, then to
 *   its heading. A drawer (or its host) that has already put focus inside is left alone (autoFocus, QueryPanelHost's
 *   title, AddAgentJourney's first field).
 * - MODAL (a scrim, the page not usable): Tab and Shift+Tab wrap inside, and `#root` is `inert`, through useOverlay's
 *   one reference-counted seal (two drawers can be open at once).
 * - NON-MODAL (the page stays live): focus moves in, nothing is trapped, nothing is inert.
 * - ON CLOSE, focus goes back to the control that opened it. If that control is gone, it goes to the row or card it
 *   belonged to (the same `data-id` on the page), and failing that to the page's main heading. A host that restores
 *   focus itself wins: this one only acts if focus was lost (it is on <body>, or on a node that has left the page).
 *
 * ⚠️ NO VISUAL CHANGE. Nothing here sets a style or a class. A heading takes `tabindex="-1"` only at the moment it is
 * focused, and programmatic focus after a mouse open draws no focus ring (:focus-visible follows the last input).
 * ⚠️ ESCAPE IS NOT HANDLED HERE. The drawers keep their own escape layers (lib/escapeStack), so a dirty form's guard
 * still runs through its existing close path.
 */
import { useEffect, useLayoutEffect, useRef } from "react";
import { FOCUSABLE, sealBackground } from "./useOverlay";

const FIELDS = 'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])';
const shown = (el: HTMLElement) => el.offsetParent !== null || el.getClientRects().length > 0;

/** Where focus lands on open: the first field on a form, else the close button, else the heading, else the root. */
export function focusTarget(root: HTMLElement): HTMLElement {
  const field = [...root.querySelectorAll<HTMLElement>(FIELDS)].find(shown);
  if (field) return field;
  const close = [...root.querySelectorAll<HTMLElement>('button[aria-label^="Close"], button[aria-label^="close"], [data-close], button[data-act="close"]')].find(shown);
  if (close) return close;
  const h = [...root.querySelectorAll<HTMLElement>('h1, h2, h3, [role="heading"]')].find(shown);
  if (h) { if (!h.hasAttribute("tabindex")) h.setAttribute("tabindex", "-1"); return h; }
  if (!root.hasAttribute("tabindex")) root.setAttribute("tabindex", "-1");
  return root;
}

function pageHeading(): HTMLElement | null {
  const h = [...document.querySelectorAll<HTMLElement>("h1[data-page-title], main h1, h1")].find(shown) ?? null;
  if (h && !h.hasAttribute("tabindex")) h.setAttribute("tabindex", "-1");
  return h;
}

/* the open modal traps, oldest first: only the top-most one acts on Tab (a query drawer over a dimmed panel) */
const traps: object[] = [];

export interface DrawerFocusOptions {
  /** a scrim, the page not usable: trap Tab and make the page inert */
  modal: boolean;
}

/**
 * Call with the drawer root's ref and whether it is open. `modal` may change while it is open (a SidePanel dims while
 * an action runs): the trap and the seal follow it; the open/close focus moves happen once per open.
 */
export function useDrawerFocus<T extends HTMLElement>(rootRef: React.RefObject<T | null>, open0: boolean, opts: DrawerFocusOptions): void {
  /* DEV-ONLY REVIEW AID: `window.__SA_DR_OFF = true` turns the whole hook off, so DR7 can screenshot a drawer with and
     without it in one build. Gated at the call site: a production build never reads it. */
  const off = import.meta.env.MODE !== "production" && typeof window !== "undefined" && !!(window as unknown as { __SA_DR_OFF?: boolean }).__SA_DR_OFF;
  const open = open0 && !off;
  const { modal } = opts;
  const opener = useRef<HTMLElement | null>(null);
  const openerKey = useRef<string | null>(null);

  /* open → close: capture the opener in the same frame the drawer appears, move focus in, and give it back on close */
  useLayoutEffect(() => {
    if (!open) return undefined;
    const root0 = rootRef.current;
    const active = document.activeElement as HTMLElement | null;
    if (active && active !== document.body && !(root0 && root0.contains(active))) {
      opener.current = active;
      openerKey.current = active.closest<HTMLElement>("[data-id]")?.getAttribute("data-id") ?? null;
    }
    /* after the drawer's own autoFocus / its host's focus has had its frame: only if focus is not inside yet */
    const raf = requestAnimationFrame(() => {
      const root = rootRef.current;
      if (!root || root.contains(document.activeElement)) return;
      focusTarget(root).focus({ preventScroll: true });
    });
    return () => {
      cancelAnimationFrame(raf);
      const back = opener.current, key = openerKey.current;
      opener.current = null; openerKey.current = null;
      /* the next frame: after the seal lifts (focus into an inert page does nothing) and after a host's own restore */
      requestAnimationFrame(() => {
        const a = document.activeElement;
        const lost = !a || a === document.body || !(a as Node).isConnected || !!rootRef.current?.contains(a);
        if (!lost) return;
        const target = back && back.isConnected && shown(back) ? back
          : (key ? [...document.querySelectorAll<HTMLElement>(`[data-id="${CSS.escape(key)}"]`)].find(shown) ?? null : null) ?? pageHeading();
        target?.focus({ preventScroll: true });
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /* modal: the seal and the trap, for as long as the drawer is open AND modal */
  useEffect(() => {
    if (!open || !modal) return undefined;
    const unseal = sealBackground();
    const token = {};
    traps.push(token);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || traps[traps.length - 1] !== token) return;
      const root = rootRef.current;
      if (!root) return;
      const els = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => !el.hasAttribute("disabled") && shown(el) && el.tabIndex >= 0);
      if (!els.length) { e.preventDefault(); return; }
      const first = els[0], last = els[els.length - 1];
      const a = document.activeElement as HTMLElement | null;
      /* focus in another dialog (a card opened over this drawer, with its own trap) is that dialog's business */
      if (a && !root.contains(a) && a.closest('[role="dialog"], [aria-modal="true"]')) return;
      if (!a || !root.contains(a)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); return; }
      if (e.shiftKey && (a === first || a === root || !els.includes(a) && a.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      const i = traps.indexOf(token); if (i >= 0) traps.splice(i, 1);
      unseal();
    };
  }, [open, modal, rootRef]);
}
