/**
 * Onboarding v9 — a warmer set-up, and a review that won't let incomplete data through. Locks OB9.
 *
 * Measured on `#/onb-lab` (each screen over fixtures inside the real `SetupFrame`; no sign-in, no
 * writes). The walk that needs an account is its own file. Each lock was red on the base first and
 * is red under its named mutation (`OB9_MUTATE=<lock>`); readings in reports/onb-v9/.
 * The e2e password is never printed.
 */
import { test, expect } from "@playwright/test";
import { lab, record, shot, noOverflow, settled, MUTATE, WIDE, PHONE } from "./ob9Lib";

/* ════ W1 · the welcome ═══════════════════════════════════════════════════════════════════════ */
test.describe("W1", () => {
  const read = (page: import("@playwright/test").Page) => page.evaluate(() => {
    const vis = (e: Element | null): e is HTMLElement => !!e && (e as HTMLElement).getBoundingClientRect().width > 0;
    const panel = document.querySelector<HTMLElement>('[data-o9="welcome-panel"]');
    const card = document.querySelector<HTMLElement>('[data-o9="welcome-card"]');
    const probe = document.createElement("i"); probe.style.background = "var(--hpanel-bg)"; document.querySelector(".sf")!.appendChild(probe);
    const band = getComputedStyle(probe).backgroundColor; probe.remove();
    const opts = card ? [...card.querySelectorAll<HTMLElement>('[role="radio"]')].filter(vis) : [];
    const lefts = [...new Set(opts.map((o) => Math.round(o.getBoundingClientRect().left)))];
    const h1 = panel?.querySelector("h1") ?? null;
    return {
      panel: !!panel && vis(panel), panelBg: panel ? getComputedStyle(panel).backgroundColor : "", band,
      eyebrow: panel?.querySelector('[data-o9="eyebrow"]')?.textContent ?? "",
      headingLines: h1 ? [...h1.querySelectorAll("span")].map((s) => s.textContent ?? "") : [],
      headingFace: h1 ? getComputedStyle(h1).fontFamily : "",
      line: panel?.querySelector('[data-o9="welcome-line"]')?.textContent ?? "",
      slot: (() => { const s = panel?.querySelector<HTMLElement>('[data-o9="slot"]'); if (!s || !vis(s)) return null; const r = s.getBoundingClientRect(); return { w: Math.round(r.width), ratio: +(r.width / r.height).toFixed(2), text: (s.textContent ?? "").trim() }; })(),
      card: !!card && vis(card),
      cardEyebrow: card ? card.querySelectorAll(".sf-qlab, [data-o9=\"eyebrow\"]").length : -1,
      cardText: (card?.textContent ?? "").replace(/\s+/g, " ").trim(),
      options: opts.length, columns: lefts.length,
      openTitle: document.querySelectorAll('[data-screen="welcome"] .sf-open').length,
      continueOff: (card?.querySelector(".sf-btn") as HTMLButtonElement | null)?.disabled ?? null,
    };
  });

  test("W1 the welcome is an ink panel over a card of four options, two-up", async ({ page }) => {
    await lab(page, "s=welcome&name=Lucy%20Sterling", WIDE);
    await settled(page, 1800);
    if (MUTATE === "W1") {
      /* the named break: the open heading comes back and the panel goes */
      await page.evaluate(() => {
        const col = document.querySelector('[data-screen="welcome"]')!;
        const head = document.createElement("header"); head.className = "sf-open";
        head.innerHTML = '<h1 class="sf-title">Let\'s set things up around your journey.</h1>';
        document.querySelector('[data-o9="welcome-panel"]')?.replaceWith(head);
        void col;
      });
    }
    const r = await read(page);
    record("W1", "1440", r);
    await shot(page, "welcome-1440");
    expect(r.panel, "the ink panel is on screen").toBe(true);
    expect(r.band, "the navy token resolves").toMatch(/^rgb\(/);
    expect(r.panelBg, "its background is the header panel's navy").toBe(r.band);
    expect(r.eyebrow).toBe("Welcome");
    expect(r.headingLines).toEqual(["Welcome to QueryHawk, Lucy.", "Let's get you on board."]);
    expect(r.headingFace).toMatch(/Special Elite/);
    expect(r.line).toBe("To make your set-up as quick as possible, let us know where you are in your querying journey.");
    expect(r.slot, "one empty 4:3 illustration slot on the ink").not.toBeNull();
    expect(r.slot!.ratio).toBeCloseTo(1.33, 1);
    expect(Math.abs(r.slot!.w - 340)).toBeLessThanOrEqual(2);
    expect(r.slot!.text, "the slot holds no words and no drawing").toBe("");
    expect(r.card).toBe(true);
    expect(r.cardEyebrow, "no eyebrow and no question line in the card").toBe(0);
    expect(r.cardText).not.toContain("Where are you in your querying journey?");
    expect(r.options).toBe(4);
    expect(r.columns, "the options are two columns").toBe(2);
    expect(r.openTitle, "no open heading").toBe(0);
    expect(r.continueOff, "Continue is off until one is picked").toBe(true);
    await noOverflow(page, "welcome 1440");
  });

  test("W1 with no name the heading drops it; at 400 the options are one column", async ({ page }) => {
    await lab(page, "s=welcome", PHONE);
    await settled(page, 1800);
    const r = await read(page);
    record("W1", "400", r);
    await shot(page, "welcome-400", true);
    expect(r.headingLines).toEqual(["Welcome to QueryHawk.", "Let's get you on board."]);
    expect(r.options).toBe(4);
    expect(r.columns, "one column on a phone").toBe(1);
    await noOverflow(page, "welcome 400");
  });
});
