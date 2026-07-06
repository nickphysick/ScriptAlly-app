import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";

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
 */
export function useFixedMenu<T extends HTMLElement = HTMLDivElement>(
  open: boolean,
  opts?: { placement?: "down" | "up" },
) {
  const triggerRef = useRef<T>(null);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const placement = opts?.placement ?? "down";

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      // "up" anchors the menu's BOTTOM just above the trigger top, so it grows upward regardless
      // of its own height — for triggers pinned low in the viewport (the Queries command bar).
      setMenuStyle(
        placement === "up"
          ? { position: "fixed", bottom: window.innerHeight - r.top + 8, left: r.left, minWidth: r.width, top: "auto", right: "auto" }
          : { position: "fixed", top: r.bottom - 4, left: r.left, minWidth: r.width, right: "auto" },
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
  }, [open, placement]);

  return { triggerRef, menuStyle };
}
