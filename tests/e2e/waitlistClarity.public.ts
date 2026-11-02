/**
 * WLC-3 (waitlist clarity v1, 2 Nov; ref design-refs/landing-waitlist-clarity-v1.html): every "Join" on the
 * landing scrolls to the founding section and focuses its email field once the scroll has ended.
 *   · phone (390×844): the hero's "Join the waitlist", the nav's "Join" and the join bar → the "Founding writer
 *     pass" card (`.mk-tkt`), field `#mk-close-email`;
 *   · desktop (1440×900): the hero's "Join the waitlist" and the nav's pass → `.mk-claimband`, field `#mk-band-email`.
 * Each target clears the sticky nav. The field takes focus with the page already still (the scroll position
 * when focus lands equals the final one, and focus did not move it). Under reduced motion the page jumps.
 */
import { test, expect, type Page } from "@playwright/test";

const PHONE = { width: 390, height: 844 };
const DESK = { width: 1440, height: 900 };

const open = async (page: Page, vp: { width: number; height: number }) => {
  await page.setViewportSize(vp);
  await page.route("**/api/waitlist", (r) => r.fulfill({ contentType: "application/json", body: '{"visible":true,"cap":50,"count":13}' }));
  await page.goto("/", { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  /* Record where the page was when the field took focus, and every focus event's target. */
  await page.evaluate(() => {
    (window as unknown as { __wlc: unknown[] }).__wlc = [];
    /* Where the founding section sat ON SCREEN when focus landed: scroll anchoring can change scrollY after the
       page is still without anything moving, so stillness is read as the target's place, not the scroll offset. */
    document.addEventListener("focusin", (e) => {
      const t = document.querySelector(".mk-claimband") ?? document.querySelector(".mk-tkt");
      (window as unknown as { __wlc: unknown[] }).__wlc.push({ id: (e.target as HTMLElement).id, y: scrollY, top: t ? t.getBoundingClientRect().top : null, t: performance.now() });
    }, true);
  });
};

const settle = async (page: Page) => {
  let last = -1;
  for (let i = 0; i < 60; i++) {
    const y = await page.evaluate(() => scrollY);
    if (y === last) break;
    last = y;
    await page.waitForTimeout(100);
  }
  await page.waitForTimeout(300);
};

const read = (page: Page, target: string, field: string) => page.evaluate(({ target, field }) => {
  const nav = document.querySelector(".mk-navwrap")!.getBoundingClientRect().bottom;
  const t = document.querySelector(target)!.getBoundingClientRect();
  const f = document.getElementById(field)!.getBoundingClientRect();
  return { nav, targetTop: t.top, fieldTop: f.top, fieldBottom: f.bottom, vh: innerHeight, y: scrollY,
    active: document.activeElement?.id ?? null, focus: (window as unknown as { __wlc: { id: string; y: number; top: number }[] }).__wlc };
}, { target, field });

type Case = { name: string; vp: typeof PHONE; click: (p: Page) => Promise<void>; target: string; field: string };
const CASES: Case[] = [
  { name: "phone · hero button", vp: PHONE, click: (p) => p.locator(".mk-wl-fjoin").click(), target: ".mk-tkt", field: "mk-close-email" },
  { name: "phone · nav Join", vp: PHONE, click: (p) => p.locator(".mk-wljoin").click(), target: ".mk-tkt", field: "mk-close-email" },
  { name: "phone · join bar", vp: PHONE, target: ".mk-tkt", field: "mk-close-email",
    click: async (p) => {
      /* Past the hero, by an instant scroll, once the page has loaded its count (until then the shell can still put
         the page back at the top). The page scrolls smoothly by default, so the scroll is asked for instant. */
      await p.waitForSelector(".mk-places--hero:not(.mk-places--wait)");
      await p.waitForTimeout(500);
      await p.evaluate(() => window.scrollTo({ top: 1600, behavior: "instant" }));
      await p.waitForSelector(".mk-jbar.mk-on", { timeout: 5000 });
      await p.evaluate(() => (document.querySelector(".mk-jbar.mk-on") as HTMLElement).click());
      await p.evaluate(() => (window as unknown as { __wlc: unknown[] }).__wlc.length = 0);
    } },
  { name: "desk · hero button", vp: DESK, click: (p) => p.locator(".mk-dh-fjoin").click(), target: ".mk-claimband", field: "mk-band-email" },
  { name: "desk · nav pass", vp: DESK, click: (p) => p.locator(".mk-navpass").click(), target: ".mk-claimband", field: "mk-band-email" },
];

test.describe("WLC-3 · every Join goes to the founding section's form, then focuses its field", () => {
  for (const c of CASES) {
    test(c.name, async ({ page }) => {
      await open(page, c.vp);
      await c.click(page);
      await settle(page);
      const r = await read(page, c.target, c.field);
      console.log(`WLC-3 ${c.name}`, JSON.stringify(r));
      expect(r.active, "the email field has focus").toBe(c.field);
      expect(r.targetTop, "the target clears the sticky nav").toBeGreaterThanOrEqual(r.nav);
      expect(r.targetTop - r.nav, `the target sits just under the nav (${(r.targetTop - r.nav).toFixed(1)})`).toBeLessThanOrEqual(24);
      expect(r.fieldTop, "the field is below the nav").toBeGreaterThanOrEqual(r.nav);
      expect(r.fieldBottom, "the field is on screen").toBeLessThanOrEqual(r.vh);
      const f = r.focus.filter((e) => e.id === c.field);
      expect(f.length, "the field took focus once").toBe(1);
      expect(Math.abs(f[0].top - r.targetTop), `focus landed with the section where it rests (${f[0].top.toFixed(1)} then ${r.targetTop.toFixed(1)})`).toBeLessThanOrEqual(1);
    });
  }

  for (const vp of [PHONE, DESK]) {
    test(`reduced motion jumps · ${vp.width}`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await open(page, vp);
      const btn = vp === PHONE ? ".mk-wl-fjoin" : ".mk-dh-fjoin";
      const field = vp === PHONE ? "mk-close-email" : "mk-band-email";
      const y0 = await page.evaluate(() => scrollY);
      await page.locator(btn).click();
      /* Two frames after the click the page has already jumped: no smooth scroll on the way. */
      const early = await page.evaluate(() => new Promise<number>((res) => requestAnimationFrame(() => requestAnimationFrame(() => res(scrollY)))));
      await settle(page);
      const r = await read(page, vp === PHONE ? ".mk-tkt" : ".mk-claimband", field);
      console.log(`WLC-3 reduced ${vp.width}`, JSON.stringify({ y0, early, ...r }));
      expect(r.active).toBe(field);
      expect(Math.abs(early - r.y), `jumped, not scrolled (${early} two frames in, ${r.y} at rest, from ${y0})`).toBeLessThanOrEqual(r.nav);
      expect(r.targetTop, "the target clears the sticky nav").toBeGreaterThanOrEqual(r.nav);
    });
  }
});
