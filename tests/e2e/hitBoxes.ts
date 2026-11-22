/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Hit boxes, measured the way a finger meets them (public pages on phones v1, P5).
 *
 * ⚠️ SAMPLED, NOT COMPUTED. A control's tap area is its own box plus whatever pseudo-element extends
 * it, clipped by any ancestor that clips, minus whatever is painted over it. Reading `::after`'s
 * computed insets gets the first part and none of the rest. `elementFromPoint` answers all of it:
 * a pseudo-element hits as its element, a clipped area hits nothing, a covered area hits the cover.
 * So the box is the bounding box of every sampled point that lands on the control.
 *
 * ⚠️ EVERY CONTROL IS SCROLLED INTO VIEW BEFORE IT IS SAMPLED, because `elementFromPoint` outside the
 * viewport returns null and a probe of an off-screen control reports a box of zero — the vacuous
 * shape the house rules name. Boxes come back in DOCUMENT coordinates so two controls sampled at
 * different scroll positions can be compared; a control inside a sticky or fixed bar is sampled
 * with the page at the top, where its document position is its screen position.
 */
import type { Page } from "@playwright/test";

export type HitBox = { label: string; x: number; y: number; w: number; h: number };

/** Samples each element matched by `selector` (visible ones only) inside `root`. */
export async function sampleHitBoxes(page: Page, selector: string, root = "body"): Promise<HitBox[]> {
  return page.evaluate(async ([sel, rootSel]) => {
    const host = document.querySelector(rootSel);
    if (!host) return [];
    const els = [...host.querySelectorAll<HTMLElement>(sel)].filter((e) => {
      const r = e.getBoundingClientRect();
      const cs = getComputedStyle(e);
      return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none";
    });
    const out: { label: string; x: number; y: number; w: number; h: number }[] = [];
    const frame = () => new Promise((r) => requestAnimationFrame(() => r(null)));
    for (const el of els) {
      const fixed = !!el.closest(".mk-navwrap, .sf-bar");
      if (fixed) window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
      else el.scrollIntoView({ block: "center", behavior: "instant" as ScrollBehavior });
      await frame(); await frame();
      const r = el.getBoundingClientRect();
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      const pad = 34;
      for (let y = Math.floor(r.top - pad); y <= Math.ceil(r.bottom + pad); y += 1) {
        if (y < 0 || y >= innerHeight) continue;
        for (let x = Math.floor(r.left - pad); x <= Math.ceil(r.right + pad); x += 1) {
          if (x < 0 || x >= innerWidth) continue;
          const hit = document.elementFromPoint(x + 0.5, y + 0.5);
          if (hit && (hit === el || el.contains(hit))) {
            if (x < x0) x0 = x; if (y < y0) y0 = y; if (x + 1 > x1) x1 = x + 1; if (y + 1 > y1) y1 = y + 1;
          }
        }
      }
      const label = ((el.textContent || "").trim() || el.getAttribute("aria-label") || el.className).slice(0, 32);
      out.push(x0 === Infinity ? { label, x: 0, y: 0, w: 0, h: 0 }
        : { label, x: x0 + scrollX, y: y0 + scrollY, w: x1 - x0, h: y1 - y0 });
    }
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    return out;
  }, [selector, root] as const);
}

/** Every pair whose boxes share more than a pixel each way. Touching edges are not overlaps: on a 1px
 *  sampling grid two controls meeting at a sub-pixel edge can both claim the boundary row. */
export function overlaps(boxes: HitBox[]): string[] {
  const bad: string[] = [];
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j];
    const ix = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const iy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    if (ix > 1 && iy > 1) bad.push(`${a.label} ∩ ${b.label} (${ix}×${iy})`);
  }
  return bad;
}
