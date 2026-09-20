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
 *   "side"           — BESIDE it, right by default and flipped left when the right has no room,
 *                      its top on the trigger's top and shifted up only as far as the window makes
 *                      necessary. Needs `menuRef`, and `width`, because a panel beside a row cannot
 *                      take its width from a row. See the note on `width` below.
 */
export function useFixedMenu<T extends HTMLElement = HTMLDivElement>(
  open: boolean,
  opts?: {
    placement?: "down" | "up" | "auto" | "side";
    menuRef?: RefObject<HTMLElement | null>;
    /**
     * Which of the menu's edges lands on the trigger's (§8).
     *
     * ⚠️ "left" IS THE DEFAULT AND EVERY EXISTING CALLER KEEPS IT. A right-aligned menu is what a
     * trigger near the right of its container needs — anchored left, a 288px panel hung off a 40px
     * icon reaches 248px into whatever is beside it.
     *
     * ⚠️ "auto" PICKS THE SIDE FROM WHERE THE TRIGGER SITS — right-aligned once its left edge is
     * past the viewport's midline, left-aligned otherwise. It exists because the `left` branch
     * clamps the trigger's edge and knows NOTHING of the menu's own width: a 260px panel hung off
     * a trigger at x=1128 in a 1280 viewport computes a perfectly legal `left: 1128` and renders
     * 108px off the screen. Measured on the Query Centre's Group popover, whose right edge came
     * back at 1388 against a viewport of 1280.
     *
     * ⚠️ AND IT IS A THIRD VALUE RATHER THAN A CHANGE TO `left`. Every existing caller keeps the
     * behaviour it was tuned with; only a caller that asks gets the new one.
     */
    align?: "left" | "right" | "auto";
    /**
     * Hold the menu inside the viewport, and cap its height to the room it has (§8).
     *
     * ⚠️ OPT-IN, BECAUSE IT SETS `max-height`, and a caller whose own stylesheet caps its body
     * would then have two limits. The panels that ask for it have a head and a foot outside their
     * scrolling body, which is exactly why capping the BODY was not enough: 70vh of body plus a
     * head plus a foot is more than the window.
     */
    constrain?: boolean;
    /**
     * The menu's own width, for `"side"` only.
     *
     * ⚠️ REQUIRED THERE, AND `minWidth: trigger.width` IS NOT SET FOR IT. Every other placement hangs
     * a menu off a control roughly its own size, so matching the trigger's width is a sensible floor.
     * A side panel is anchored to a ROW — 600px of feed entry — and inheriting that width would make
     * the panel wider than the column it is escaping. The flip also has to know the width BEFORE the
     * panel is placed: deciding "is there room on the right" from a measured `offsetWidth` reads the
     * width the panel had at its PREVIOUS position, which is the first thing the flip changes.
     */
    width?: number;
    /**
     * An anchor the caller already holds, in place of the `triggerRef` this hook hands back.
     *
     * ⚠️ IT EXISTS BECAUSE A REF POINTED AT SOMEBODY ELSE'S ELEMENT IS POINTED TOO LATE. Every other
     * caller renders its own trigger, so `triggerRef` is attached during the same commit and the
     * layout effect below reads it. A popover anchored to a row it did not render has to assign the
     * ref in an effect — which runs AFTER this one — so the first placement read `null`, returned
     * early, and nothing ever re-ran it: measured, a 400px popover rendered at x 0, y 900, full
     * viewport width, with every declaration correct.
     */
    anchorEl?: HTMLElement | null;
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
    /* ⚠️ DECLARED HERE, NOT INSIDE THE DOWN/UP BRANCH BELOW, because `"side"` returns before reaching
       it — a `const` read above its declaration in the same scope is a TDZ, and one `tsc` does see. */
    const EDGE_ = 8;
    const update = () => {
      const el = opts?.anchorEl ?? triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      // "up" anchors the menu's BOTTOM just above the trigger top, so it grows upward regardless
      // of its own height — for triggers pinned low in the viewport (the Queries command bar).
      /**
       * ⚠️ BESIDE, AND THE FLIP IS DECIDED FROM THE STATED WIDTH. Right of the trigger where the
       * room is, left where it is not; and where neither side fits — a narrow window — it takes the
       * roomier side and is clamped to the window's edge rather than being pushed off it.
       */
      if (placement === "side") {
        const W = opts?.width ?? 0;
        const h = menuRef?.current?.offsetHeight ?? 0;
        const roomRight = window.innerWidth - r.right - GAP - EDGE_;
        const roomLeft = r.left - GAP - EDGE_;
        const right = roomRight >= W || roomRight >= roomLeft;
        /* the top follows the trigger, and gives only as much as the window insists on */
        const top = Math.max(EDGE_, Math.min(r.top, window.innerHeight - EDGE_ - (h || 0)));
        setMenuStyle({
          position: "fixed",
          width: W || undefined,
          top,
          bottom: "auto",
          ...(right
            ? { left: Math.min(r.right + GAP, window.innerWidth - EDGE_ - W), right: "auto" as const }
            : { left: Math.max(EDGE_, r.left - GAP - W), right: "auto" as const }),
          ...(constrain ? { maxHeight: Math.max(200, window.innerHeight - 2 * EDGE_) } : {}),
        });
        return;
      }
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
      const EDGE = EDGE_;
      /* the midline rule — resolved per open, so a resize or a scroll re-decides it */
      const side_ = align === "auto" ? (r.left > window.innerWidth / 2 ? "right" : "left") : align;
      const side = side_ === "right"
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
    /**
     * ⚠️ AND WHEN THE MENU ITSELF CHANGES HEIGHT, because every placement that reads `offsetHeight`
     * is otherwise decided once, against whatever the panel happened to be at its first layout.
     * Measured on the query peek: the popover is placed, its history arrives from Firestore three
     * seconds later, it grows, and its foot is left below the fold — with the placement arithmetic
     * perfectly correct about the panel it measured. `"auto"` had the same latent fault.
     */
    const ro = menuRef?.current && typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => update()) : null;
    if (ro && menuRef?.current) ro.observe(menuRef.current);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
      ro?.disconnect();
    };
  }, [open, placement, menuRef, align, constrain, opts?.width, opts?.anchorEl]);

  return { triggerRef, menuStyle };
}
