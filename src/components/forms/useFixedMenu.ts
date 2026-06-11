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
export function useFixedMenu<T extends HTMLElement = HTMLDivElement>(open: boolean) {
  const triggerRef = useRef<T>(null);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setMenuStyle({ position: "fixed", top: r.bottom - 4, left: r.left, minWidth: r.width, right: "auto" });
    };
    update();
    // capture: scroll events don't bubble, so catch them from the scrolling body too.
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  return { triggerRef, menuStyle };
}
