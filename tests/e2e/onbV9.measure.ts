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

/* ════ T1 · the typewriter, and the card that waits for it ═════════════════════════════════════ */
test.describe("T1", () => {
  const read = (page: import("@playwright/test").Page) => page.evaluate(() => {
    const p = document.querySelector<HTMLElement>('[data-o9="passage"]');
    const card = document.querySelector<HTMLElement>('[data-o9="title-card"]');
    const unseen = p ? [...p.querySelectorAll<HTMLElement>(".o9-unseen")].filter((e) => getComputedStyle(e).visibility === "hidden").reduce((n, e) => n + (e.textContent ?? "").length, 0) : -1;
    const total = Number(p?.getAttribute("data-total") ?? 0);
    return {
      present: !!p, total, visibleChars: total - unseen,
      text: p ? [...p.querySelectorAll("p")].map((l) => l.getAttribute("aria-label")) : [],
      box: p ? Math.round(p.getBoundingClientRect().height) : 0,
      cardTop: card ? Math.round(card.getBoundingClientRect().top) : 0,
      cardOpacity: card ? getComputedStyle(card).opacity : "",
      cardInert: card?.hasAttribute("inert") ?? null,
      cursor: document.querySelectorAll('[class*="cursor"], [class*="caret"], [data-cursor]').length,
      focused: document.activeElement?.id ?? "",
      stamp: document.querySelector('[data-o9="stamp-title"]')?.textContent ?? "",
      stampFace: (() => { const e = document.querySelector('[data-o9="stamp-title"]'); return e ? getComputedStyle(e).fontFamily : ""; })(),
    };
  });

  test("T1 the passage types in, and the card is unseen until the last letter", async ({ page }) => {
    await lab(page, "s=ack&stage=early", WIDE);
    if (MUTATE === "T1") await page.addStyleTag({ content: ".sf .o9-late{opacity:1!important}" });
    /* `lab` waits for fonts, so read the clock from the passage's own count rather than assume 0ms */
    await page.waitForFunction(() => Number(document.querySelector('[data-o9="passage"]')?.getAttribute("data-typed") ?? 0) > 0, null, { timeout: 5000 });
    const early = await read(page);
    record("T1", "early", early);
    expect(early.present, "the passage is on screen").toBe(true);
    expect(early.total, "the passage has letters").toBeGreaterThan(100);
    expect(early.text).toEqual([
      "Got it. Your campaign is underway.",
      "QueryHawk picks up from wherever you've got to. In a moment we'll give you hassle-free ways to import whatever list you're working from.",
      "First, your manuscript title.",
    ]);
    expect(early.visibleChars, "just after it starts, fewer than half the letters are visible").toBeLessThan(early.total / 2);
    expect(early.cardOpacity, "the card is unseen while it types").toBe("0");
    expect(early.cardInert, "and cannot be reached").toBe(true);
    expect(early.stamp).toBe("A few queries out");
    expect(early.stampFace).toMatch(/Special Elite/);

    await page.waitForFunction(() => { const p = document.querySelector('[data-o9="passage"]'); return !!p && p.getAttribute("data-typed") === p.getAttribute("data-total"); }, null, { timeout: 9000 });
    await page.waitForTimeout(900);
    const late = await read(page);
    record("T1", "late", late);
    await shot(page, "ack-few-1440");
    expect(late.visibleChars, "every letter is visible").toBe(late.total);
    expect(late.cursor, "no cursor element").toBe(0);
    expect(late.cardOpacity, "the card is shown once the last letter lands").toBe("1");
    expect(late.cardInert).toBe(false);
    expect(late.focused, "the title input took focus").toBe("o9-title");
    expect(late.box, "the passage's box did not change as it typed").toBe(early.box);
    expect(late.cardTop, "and the card did not move").toBe(early.cardTop);
    await noOverflow(page, "ack 1440");
  });

  test("T1 the whole passage takes about four seconds, and a click finishes it at once", async ({ page }) => {
    await lab(page, "s=ack&stage=deep", WIDE);
    const t0 = Date.now();
    await page.waitForFunction(() => { const p = document.querySelector('[data-o9="passage"]'); return !!p && p.getAttribute("data-typed") === p.getAttribute("data-total"); }, null, { timeout: 12_000 });
    const took = Date.now() - t0;
    record("T1", "duration-ms", took);
    expect(took, "about four seconds").toBeGreaterThan(2500);
    expect(took).toBeLessThan(7500);
    await lab(page, "s=ack&stage=interest", WIDE);
    await page.waitForFunction(() => Number(document.querySelector('[data-o9="passage"]')?.getAttribute("data-typed") ?? 0) > 0);
    await page.locator('[data-o9="passage"]').click();
    const r = await read(page);
    expect(r.visibleChars, "a click shows it all").toBe(r.total);
  });

  test("T1 reduced motion: the passage and the card are there at once", async ({ page }) => {
    await lab(page, "s=ack&stage=early", WIDE, { motion: "reduce" });
    const r = await read(page);
    record("T1", "reduced", r);
    expect(r.visibleChars).toBe(r.total);
    expect(r.cardOpacity).toBe("1");
    expect(r.cardInert).toBe(false);
  });
});

/* ════ T2 · Title TBC ═════════════════════════════════════════════════════════════════════════ */
test.describe("T2", () => {
  test("T2 on Just getting started, Title TBC fills Untitled manuscript and lights Continue", async ({ page }) => {
    await lab(page, "s=ack&stage=starting", WIDE, { motion: "reduce" });
    const card = page.locator('[data-o9="title-card"]');
    const tbc = card.locator('[data-act="tbc"]');
    const go = card.locator('[data-act="continue"]');
    await expect(tbc, "the button is on this journey").toHaveText("Title TBC");
    expect(await tbc.evaluate((e) => getComputedStyle(e).backgroundColor), "an ink button, never rust").toBe(await page.evaluate(() => { const i = document.createElement("i"); i.style.background = "var(--sp-anthracite)"; document.querySelector(".sf")!.appendChild(i); const c = getComputedStyle(i).backgroundColor; i.remove(); return c; }));
    /* the readiness question is on the same page: answer it, and Continue is still off without a title */
    await card.getByRole("radio", { name: /Still being written/ }).click();
    expect(await go.isDisabled(), "no title yet").toBe(true);
    if (MUTATE === "T2") await page.evaluate(() => { const b = document.querySelector('[data-act="tbc"]')!; b.addEventListener("click", (e) => e.stopImmediatePropagation(), true); });
    await tbc.click();
    const state = { value: await card.locator("#o9-title").inputValue(), off: await go.isDisabled(), note: (await card.locator('[data-sf="still-writing"]').textContent()) ?? "" };
    record("T2", "after-press", state);
    await shot(page, "ack-start-1440");
    expect(state.value, "the field holds the held title").toBe("Untitled manuscript");
    expect(state.off, "Continue lit as soon as the button was pressed").toBe(false);
    expect(state.note).toBe("Still writing? No problem. In the meantime, QueryHawk's smart database is a great place to build up your agent contact list and collate your materials.");
    await go.click();
    const calls = await page.evaluate(() => (window as unknown as { __onbLab?: { calls: { name: string; arg?: string }[] } }).__onbLab?.calls ?? []);
    expect(calls.filter((c) => c.name === "continue").map((c) => c.arg), "the step hands on that title and the readiness picked").toEqual(["Untitled manuscript|Drafting"]);
  });

  test("T2 the other three journeys have the title field alone", async ({ page }) => {
    for (const stage of ["early", "deep", "interest"]) {
      await lab(page, `s=ack&stage=${stage}`, WIDE, { motion: "reduce" });
      const card = page.locator('[data-o9="title-card"]');
      expect(await card.locator('[data-act="tbc"]').count(), `${stage}: no Title TBC`).toBe(0);
      expect(await card.getByRole("radio").count(), `${stage}: no readiness question`).toBe(0);
      expect(await card.locator('[data-act="continue"]').isDisabled(), `${stage}: Continue is off with no title`).toBe(true);
      await card.locator("#o9-title").fill("The October Test");
      expect(await card.locator('[data-act="continue"]').isDisabled()).toBe(false);
    }
    await shot(page, "ack-interest-1440");
  });
});
