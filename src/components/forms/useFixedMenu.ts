import { useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from "react";

/**
 * Anchors a field's popover (dropdown / date picker / search menu) with `position: fixed`,
 * positioned from the trigger's bounding rect and kept in sync on scroll + resize.
 *
 * Why: once FormShell's body becomes a `max-height` + `overflow-y:auto` scroll region, an
 * absolutely-positioned popover inside it gets clipped by that scroll container — worst for
 * fields low in the body. A `position: fixed` element's containing block is the viewport (there
 * are no transformed ancestors in the form shell), so it escapes the clip entirely. The menu
 * stays a DOM child of its wrapper, so existing outside-click handling is unaffected.
 *
 * `attach the returned triggerRef to the trigger element, and spread menuStyle onto the menu.
 *
 * PLACEMENT
 *   "down" (default) — below the trigger. Every existing caller; unchanged.
 *   "up"             — above it, for triggers pinned low (the Queries command bar).
 *   "auto"           — down if it fits, up if it doesn't. Needs `menuRef` so the menu's real
 *                      height can be measured; a tall popover (the date picker's calendar) below
 *                      a trigger near the foot of the window is otherwise cut off by the viewport.
 */
export function useFixedMenu<T extends HTMLElement = HTMLDivElement>(
  open: boolean,
  opts?: {
    placement?: "down" | "up" | "auto";
    menuRef?: RefObject<HTMLElement | null>;
    /**
     * Which of the menu's edges lands on the trigger's (§8).
     *
     * ⚠️ "left" IS THE DEFAULT AND EVERY EXISTING CALLER KEEPS IT. A right-aligned menu is what a
     * trigger near the right of its container needs — anchored left, a 288px panel hung off a 40px
     * icon reaches 248px into whatever is beside it.
     */
    align?: "left" | "right";
    /**
     * Hold the menu inside the viewport, and cap its height to the room it has (§8).
     *
     * ⚠️ OPT-IN, BECAUSE IT SETS `max-height`, and a caller whose own stylesheet caps its body
     * would then have two limits. The panels that ask for it have a head and a foot outside their
     * scrolling body, which is exactly why capping the BODY was not enough: 70vh of body plus a
     * head plus a foot is more than the window.
     */
    constrain?: boolean;
  },
) {
  const triggerRef = useRef<T>(null);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const placement = opts?.placement ?? "down";
  const menuRef = opts?.menuRef;
  const align = opts?.align ?? "left";
  const constrain = opts?.constrain ?? false;

  useLayoutEffect(() => {
    if (!open) return;
    const GAP = 8;
    const update = () => {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      // "up" anchors the menu's BOTTOM just above the trigger top, so it grows upward regardless
      // of its own height — for triggers pinned low in the viewport (the Queries command bar).
      let up = placement === "up";
      if (placement === "auto") {
        // Measured, not guessed: the popover is in the DOM by the time this layout effect runs
        // (its open class lands in the same commit), so its height is real. Flip only when there
        // genuinely isn't room below AND there is room above — otherwise a short viewport would
        // trade a bottom clip for a top one.
        const h = menuRef?.current?.offsetHeight ?? 0;
        const roomBelow = window.innerHeight - r.bottom;
        const roomAbove = r.top;
        up = h > 0 && roomBelow < h + GAP && roomAbove > roomBelow;
      }
      /**
       * ⚠️ THE EDGE, AND THEN THE WINDOW (§8). Right-aligning is `right: innerWidth - r.right`,
       * which keeps the menu's right edge on the trigger's however wide the menu turns out to be —
       * a `left` computed from an assumed width would drift the moment the content changed.
       *
       * ⚠️ AND THE CLAMP IS A `max-height`, not a nudge upward. A menu taller than the room has to
       * give something up; moving it would only put its head off the top instead of its foot off
       * the bottom. `EDGE` keeps it clear of the window's own edge.
       */
      const EDGE = 8;
      const side = align === "right"
        ? { right: Math.max(EDGE, window.innerWidth - r.right), left: "auto" as const }
        : { left: Math.min(r.left, window.innerWidth - EDGE), right: "auto" as const };
      const room = up ? r.top - GAP - EDGE : window.innerHeight - r.bottom - EDGE;
      setMenuStyle({
        position: "fixed",
        ...side,
        minWidth: r.width,
        ...(up
          ? { bottom: window.innerHeight - r.top + GAP, top: "auto" as const }
          : { top: r.bottom - 4, bottom: "auto" as const }),
        /* ⚠️ THE PANEL TAKES THE CAP; ITS BODY DOES THE SCROLLING. `overflow-y: auto` here scrolls
           the whole panel, which takes the FOOT out of view with the content — measured, the Done
           button at 984 in a 900px window. The panel is a flex column, so a `max-height` on it
           squeezes the body and leaves the head and foot pinned. */
        ...(constrain ? { maxHeight: Math.max(200, room) } : {}),
      });
    };
    update();
    // capture: scroll events don't bubble, so catch them from the scrolling body too.
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, placement, menuRef, align, constrain]);

  return { triggerRef, menuStyle };
}
