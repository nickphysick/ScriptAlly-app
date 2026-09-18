/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DashPopup — the one popup the dashboard's two charts share (v33, 18 Sep; ref
 * design-refs/dashboard-v33.html `.tip`).
 *
 * ⚠️ ONE POPUP, ONE LOCK, TWO OWNERS. The active-queries chart and the closed ring both show it; only
 * one can have it pinned, and WHILE ONE IS PINNED THE OTHER SHOWS NOTHING ON HOVER. That rule needs a
 * single owner of the state, which is why this is a provider above both cards rather than a tooltip
 * inside each.
 *
 * ⚠️ IT IS PORTALLED TO `body`, SO NO CARD CLIPS IT — and that puts it OUTSIDE `.os-root` and outside
 * the theme class, where none of the page's tokens resolve. A token that resolves to nothing paints
 * nothing, silently. So the sheet gives `.os-tip` literal values, and the three tokens the content
 * genuinely inherits (`StatusDot`'s hue pair and the typewriter face) are COPIED from the page's root
 * onto the popup the first time it shows (not at mount — see `PopupHost`).
 *
 * ⚠️ THE CARDS DO NOT RE-RENDER WHEN THE POINTER MOVES. The api in context is stable for the page's
 * life; the popup's own state lives in a tiny store that only `PopupHost` subscribes to. A context
 * value that changed per mousemove would re-render both charts sixty times a second.
 *
 * ⚠️ PINNING: a click pins (at once, whatever the hover delay was doing); a pinned popup takes
 * pointer events so its links work; a click anywhere outside it releases it — in the CAPTURE phase,
 * so when that click lands on a chart, the old pin is gone before the chart's own handler pins the new
 * one, in the same click. Escape releases too.
 */
import React, { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

export type PopupOwner = "chart" | "ring";

interface PopupState {
  owner: PopupOwner | null;
  content: React.ReactNode;
  /** the pointer, in viewport px */
  cx: number;
  cy: number;
  /** the card the popup must stay inside */
  box: { left: number; top: number; right: number; bottom: number } | null;
  pinned: boolean;
}

export interface DashPopupApi {
  /** hover: ignored entirely while anything is pinned */
  show(owner: PopupOwner, content: React.ReactNode, cx: number, cy: number, card: Element | null): void;
  /** hover left: ignored while pinned */
  hide(owner: PopupOwner): void;
  /** click / Enter: replaces whatever was pinned */
  pin(owner: PopupOwner, content: React.ReactNode, cx: number, cy: number, card: Element | null): void;
  release(): void;
  locked(): PopupOwner | null;
  /** an owner's own highlights must come off when ITS pin is released from elsewhere */
  onRelease(owner: PopupOwner, fn: () => void): () => void;
}

const EMPTY: PopupState = { owner: null, content: null, cx: 0, cy: 0, box: null, pinned: false };

/** The inert api — what a card gets when it is rendered with no provider above it (tests, labs). */
const NOOP: DashPopupApi = {
  show() {}, hide() {}, pin() {}, release() {}, locked: () => null, onRelease: () => () => {},
};

const Ctx = createContext<DashPopupApi>(NOOP);
export const useDashPopup = (): DashPopupApi => useContext(Ctx);

const rectOf = (el: Element | null): PopupState["box"] => {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
};

/** 16px right of and below the pointer; flipped if it would cross the card; then held 6px inside it. */
export const placeAtCursor = (
  w: number, h: number, cx: number, cy: number,
  box: { left: number; top: number; right: number; bottom: number },
): { x: number; y: number } => {
  const g = 16, m = 6;
  let x = cx + g, y = cy + g;
  if (x + w > box.right - m) x = cx - w - g;
  if (y + h > box.bottom - m) y = cy - h - g;
  x = Math.max(box.left + m, Math.min(box.right - w - m, x));
  y = Math.max(box.top + m, Math.min(box.bottom - h - m, y));
  return { x, y };
};

/* the tokens the popup's CONTENT inherits, copied across the portal — see the header */
const CARRIED = ["--sd-hue", "--sd-centre", "--os-type"] as const;

const PopupHost: React.FC<{
  subscribe: (fn: () => void) => () => void;
  read: () => PopupState;
  rootRef: React.RefObject<HTMLElement | null>;
  tipRef: React.RefObject<HTMLDivElement | null>;
}> = ({ subscribe, read, rootRef, tipRef }) => {
  const st = useSyncExternalStore(subscribe, read, () => EMPTY);
  /* the last content stays in the box while it fades out, or the popup collapses as it leaves */
  const last = useRef<React.ReactNode>(null);
  if (st.owner) last.current = st.content;

  /* ⚠️ CARRIED WHEN IT FIRST SHOWS, NOT WHEN IT MOUNTS. This host is a DESCENDANT of the page's root,
     and React runs a child's layout effects before it attaches an ancestor's ref — so at mount
     `rootRef.current` is still null, and a mount-once effect would copy nothing, for ever, in
     silence. By the first hover the root is long attached. */
  const carried = useRef(false);

  useLayoutEffect(() => {
    const tip = tipRef.current, root = rootRef.current;
    if (!tip || !st.owner || !st.box) return;
    if (!carried.current && root) {
      const cs = getComputedStyle(root);
      for (const name of CARRIED) {
        const v = cs.getPropertyValue(name).trim();
        if (v) tip.style.setProperty(name, v);
      }
      carried.current = true;
    }
    const { x, y } = placeAtCursor(tip.offsetWidth, tip.offsetHeight, st.cx, st.cy, st.box);
    tip.style.left = `${Math.round(x)}px`;
    tip.style.top = `${Math.round(y)}px`;
  }, [st, tipRef, rootRef]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      ref={tipRef}
      className={`os-tip${st.owner ? " on" : ""}${st.pinned ? " pinned" : ""}`}
      data-probe="dash-popup"
      data-owner={st.owner ?? undefined}
      role={st.pinned ? "dialog" : "tooltip"}
      aria-hidden={st.owner ? undefined : true}
    >
      {last.current}
    </div>,
    document.body,
  );
};

export const DashPopupProvider: React.FC<{
  /** the page's root — where the carried tokens are read from */
  rootRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
}> = ({ rootRef, children }) => {
  const state = useRef<PopupState>(EMPTY);
  const subs = useRef(new Set<() => void>());
  const releaseSubs = useRef(new Map<PopupOwner, Set<() => void>>());
  const tipRef = useRef<HTMLDivElement | null>(null);

  const set = (next: PopupState) => { state.current = next; subs.current.forEach((fn) => fn()); };

  const api = useMemo<DashPopupApi>(() => ({
    show(owner, content, cx, cy, card) {
      if (state.current.pinned) return;
      set({ owner, content, cx, cy, box: rectOf(card), pinned: false });
    },
    hide(owner) {
      if (state.current.pinned || state.current.owner !== owner) return;
      set({ ...state.current, owner: null });
    },
    pin(owner, content, cx, cy, card) {
      const was = state.current;
      if (was.pinned && was.owner && was.owner !== owner) releaseSubs.current.get(was.owner)?.forEach((fn) => fn());
      set({ owner, content, cx, cy, box: rectOf(card), pinned: true });
    },
    release() {
      const was = state.current;
      if (!was.pinned) return;
      set({ ...was, owner: null, pinned: false });
      if (was.owner) releaseSubs.current.get(was.owner)?.forEach((fn) => fn());
    },
    locked: () => (state.current.pinned ? state.current.owner : null),
    onRelease(owner, fn) {
      const bag = releaseSubs.current.get(owner) ?? new Set();
      bag.add(fn); releaseSubs.current.set(owner, bag);
      return () => { bag.delete(fn); };
    },
  }), []);

  useEffect(() => {
    const onClick = (ev: MouseEvent) => {
      if (!state.current.pinned) return;
      if (tipRef.current && ev.target instanceof Node && tipRef.current.contains(ev.target)) return;
      api.release();
    };
    const onKey = (ev: KeyboardEvent) => { if (ev.key === "Escape" && state.current.pinned) api.release(); };
    /* a pinned popup is `position: fixed` at the place it was pinned; the page scrolling under it
       would leave it pointing at nothing, so a scroll lets it go */
    const onScroll = (ev: Event) => {
      /* only the PAGE moving counts — the feed scrolling inside its own card moves neither chart */
      const t = ev.target, root = rootRef.current;
      if (!root || !(t instanceof Node) || !t.contains(root)) return;
      if (state.current.pinned) api.release(); else if (state.current.owner) set({ ...state.current, owner: null });
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKey);
    document.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("scroll", onScroll, true);
    };
  }, [api]);

  const subscribe = React.useCallback((fn: () => void) => { subs.current.add(fn); return () => { subs.current.delete(fn); }; }, []);
  const read = React.useCallback(() => state.current, []);

  return (
    <Ctx.Provider value={api}>
      {children}
      <PopupHost subscribe={subscribe} read={read} rootRef={rootRef} tipRef={tipRef} />
    </Ctx.Provider>
  );
};
