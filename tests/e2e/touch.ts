/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Touch, as a phone does it (phone fixes v1). Never the mouse wheel and never `scrollTo`.
 *
 * - Chromium: a real touch drag through CDP `Input.dispatchTouchEvent` — the browser scrolls natively,
 *   so a clipping ancestor, a nested scroller, `touch-action` or a `preventDefault` listener all stop it
 *   exactly as they would on a phone.
 * - WebKit: Playwright has no native touch-drag for WebKit (only `touchscreen.tap`), and a synthetic
 *   TouchEvent never scrolls natively. So on WebKit `touchDrag` dispatches the touch events (which
 *   proves no listener cancels them — `dispatchEvent` returns false if one does) and then reports the
 *   page's own scroll answer by SCROLLING THE ELEMENT THE FINGER IS ON the way the browser would pick it:
 *   the nearest ancestor that can scroll in that direction. That is the honest reach of an engine with
 *   no touch input; the report says so.
 */
import type { CDPSession, Page } from "@playwright/test";

const cdps = new WeakMap<Page, CDPSession>();
async function cdp(page: Page): Promise<CDPSession> {
  let s = cdps.get(page);
  if (!s) { s = await page.context().newCDPSession(page); cdps.set(page, s); }
  return s;
}

export const engine = (page: Page) => page.context().browser()?.browserType().name() ?? "chromium";

/** Drag a finger from (x, y) by dy (negative = finger moves up = content scrolls down). */
export async function touchDrag(page: Page, x: number, y: number, dy: number, steps = 12): Promise<{ cancelled: boolean }> {
  if (engine(page) === "chromium") {
    const s = await cdp(page);
    await s.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    for (let i = 1; i <= steps; i++) {
      await s.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y + (dy * i) / steps }] });
      await page.waitForTimeout(16);
    }
    await s.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await page.waitForTimeout(250);
    return { cancelled: false };
  }
  return page.evaluate(({ x, y, dy, steps }) => {
    const target = document.elementFromPoint(x, y) ?? document.body;
    /* WebKit has no Touch constructor; a TouchEvent without touch lists still reaches every listener and
       still reports a preventDefault, which is all this half can prove */
    const mk = (type: string, yy: number): Event => {
      try {
        const t = new Touch({ identifier: 1, target, clientX: x, clientY: yy });
        return new TouchEvent(type, { touches: type === "touchend" ? [] : [t], changedTouches: [t], targetTouches: type === "touchend" ? [] : [t], bubbles: true, cancelable: true });
      } catch { return new Event(type, { bubbles: true, cancelable: true }); }
    };
    let cancelled = !target.dispatchEvent(mk("touchstart", y));
    for (let i = 1; i <= steps; i++) if (!target.dispatchEvent(mk("touchmove", y + (dy * i) / steps))) cancelled = true;
    target.dispatchEvent(mk("touchend", y + dy));
    if (!cancelled) {
      /* the scroller the browser would pick: the nearest ancestor that can scroll this way */
      for (let el: Element | null = target; el; el = el.parentElement) {
        const cs = getComputedStyle(el);
        const can = /(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 1 && cs.touchAction !== "none";
        if (can) { el.scrollTop += -dy; break; }
        if (el === document.documentElement || el === document.body) {
          const se = document.scrollingElement!;
          if (se.scrollHeight > se.clientHeight + 1 && getComputedStyle(document.body).overflowY !== "hidden" && getComputedStyle(document.documentElement).overflowY !== "hidden") se.scrollTop += -dy;
          break;
        }
      }
    }
    return { cancelled };
  }, { x, y, dy, steps });
}

/** Swipe up repeatedly until the scroller stops moving; returns how many swipes it took. */
export async function swipeToEnd(page: Page, x: number, y: number, read: () => Promise<number>, max = 40): Promise<number> {
  let last = await read(); let still = 0;
  for (let i = 0; i < max; i++) {
    await touchDrag(page, x, y, -Math.round(y * 0.6));
    const now = await read();
    if (Math.abs(now - last) < 1) { if (++still >= 2) return i; } else still = 0;
    last = now;
  }
  return max;
}

/** A sideways finger swipe across an element (a row's swipe actions). Chromium: a real touch through CDP. WebKit has no
 *  touch input in Playwright, so there the swipe is a pointer drag — which is what the row listens to (pointer events
 *  cover touch and mouse alike); the report says which. */
export async function touchSwipeX(page: Page, x: number, y: number, dx: number, steps = 10): Promise<void> {
  if (engine(page) === "chromium") {
    const s = await cdp(page);
    await s.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    for (let i = 1; i <= steps; i++) { await s.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + (dx * i) / steps, y }] }); await page.waitForTimeout(16); }
    await s.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  } else {
    await page.mouse.move(x, y); await page.mouse.down();
    for (let i = 1; i <= steps; i++) await page.mouse.move(x + (dx * i) / steps, y);
    await page.mouse.up();
  }
  await page.waitForTimeout(400);
}
