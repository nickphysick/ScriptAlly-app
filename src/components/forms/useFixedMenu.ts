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
  opts?: { placement?: "down" | "up" | "auto"; menuRef?: RefObject<HTMLElement | null> },
) {
  const triggerRef = useRef<T>(null);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const placement = opts?.placement ?? "down";
  const menuRef = opts?.menuRef;

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
      setMenuStyle(
        up
          ? { position: "fixed", bottom: window.innerHeight - r.top + GAP, left: r.left, minWidth: r.width, top: "auto", right: "auto" }
          : { position: "fixed", top: r.bottom - 4, left: r.left, minWidth: r.width, bottom: "auto", right: "auto" },
      );
    };
    update();
    // capture: scroll events don't bubble, so catch them from the scrolling body too.
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, placement, menuRef]);

  return { triggerRef, menuStyle };
}
