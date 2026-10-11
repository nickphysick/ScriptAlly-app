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

/* ════ B1–B4 · your book ══════════════════════════════════════════════════════════════════════ */
test.describe("B", () => {
  const Q = "s=bookmore&title=The%20October%20Test&name=Lucy%20Sterling";
  const card = (page: import("@playwright/test").Page) => page.locator('[data-o9="book-card"]');
  const pill = (page: import("@playwright/test").Page, id: string) => page.locator(`[data-o9="genre"] .o9-pills [data-genre="${id}"]`);
  const genres = (page: import("@playwright/test").Page) => page.evaluate(() => ({
    picked: [...document.querySelectorAll<HTMLElement>('[data-o9="genre"] .o9-pills [aria-selected="true"]')].map((p) => p.getAttribute("data-genre")),
    primary: [...document.querySelectorAll<HTMLElement>('[data-o9="genre"] .o9-pills [data-primary]')].map((p) => p.getAttribute("data-genre")),
    pills: [...document.querySelectorAll<HTMLElement>('[data-o9="genre"] .o9-pills [role="option"]')].map((p) => (p.textContent ?? "").replace("✓", "").replace("Primary", "").trim()),
    line: [...document.querySelectorAll('[data-o9="genre-line"] > span')].map((x) => (x.textContent ?? "").replace(/\s+/g, " ").trim()).join(" | "),
  }));
  const handed = (page: import("@playwright/test").Page) => page.evaluate(() => (window as unknown as { __onbLab?: { calls: { name: string; arg?: string }[] } }).__onbLab?.calls.filter((c) => c.name === "saveBook").map((c) => JSON.parse(c.arg ?? "null")) ?? []);

  test("B1 the title page: eyebrow, the title typed in, and the byline on its rule", async ({ page }) => {
    await lab(page, Q, WIDE);
    await page.waitForFunction(() => Number(document.querySelector('[data-o9="book-card"]')?.getAttribute("data-typed") ?? 0) > 0, null, { timeout: 5000 });
    const mid = await page.evaluate(() => {
      const h = document.querySelector<HTMLElement>('[data-o9="bookhead"] h1')!;
      const unseen = [...h.querySelectorAll<HTMLElement>(".o9-unseen")].reduce((n, e) => n + (e.textContent ?? "").length, 0);
      return { label: h.getAttribute("aria-label"), unseen, cardOpacity: getComputedStyle(document.querySelector('[data-o9="book-card"]')!).opacity };
    });
    record("B1", "typing", mid);
    expect(mid.label).toBe("The October Test");
    expect(mid.unseen, "the title is still typing in").toBeGreaterThan(0);
    expect(mid.cardOpacity, "the card waits for it").toBe("0");
    await page.waitForFunction(() => { const c = document.querySelector('[data-o9="book-card"]'); return !!c && c.getAttribute("data-typed") === c.getAttribute("data-total"); }, null, { timeout: 8000 });
    await page.waitForTimeout(1300);
    if (MUTATE === "B1") await page.evaluate(() => document.querySelector('[data-o9="byline"]')?.remove());
    const r = await page.evaluate(() => {
      const st = (e: Element | null) => (e ? getComputedStyle(e) : null);
      const eye = document.querySelector('[data-o9="book-eyebrow"]'), h = document.querySelector('[data-o9="bookhead"] h1'), by = document.querySelector('[data-o9="byline"]'), span = by?.querySelector("span") ?? null;
      const before = by ? getComputedStyle(by, "::before") : null, after = by ? getComputedStyle(by, "::after") : null;
      return {
        eyebrow: eye?.textContent ?? "", eyeFace: st(eye)?.fontFamily ?? "", eyeWeight: st(eye)?.fontWeight ?? "", eyeTrack: st(eye)?.letterSpacing ?? "", eyeSize: st(eye)?.fontSize ?? "", eyeColour: st(eye)?.color ?? "",
        title: (h?.textContent ?? ""), titleFace: st(h)?.fontFamily ?? "", titleSize: parseFloat(st(h)?.fontSize ?? "0"),
        byline: span?.textContent ?? null, byFace: st(span)?.fontFamily ?? "", byStyle: st(span)?.fontStyle ?? "", byMax: st(by)?.maxWidth ?? "",
        ruleLead: before ? Math.round(parseFloat(before.width)) : 0, ruleFill: after ? Math.round(parseFloat(after.width)) : 0,
        cardOpacity: getComputedStyle(document.querySelector('[data-o9="book-card"]')!).opacity,
        h2: document.querySelector('[data-o9="book-card"] h2')?.textContent ?? "", sub: document.querySelector('[data-o9="book-card"] .o9-cardsub')?.textContent ?? "",
      };
    });
    record("B1", "at-rest", r);
    await shot(page, "book-more-1440");
    expect(r.eyebrow).toBe("— Your book —");
    expect(r.eyeFace).toMatch(/JetBrains Mono/);
    expect(r.eyeWeight).toBe("600");
    expect(parseFloat(r.eyeTrack) / parseFloat(r.eyeSize), "tracked .24em").toBeCloseTo(0.24, 2);
    expect(r.title).toBe("The October Test");
    expect(r.titleFace).toMatch(/Special Elite/);
    expect(r.titleSize, "about 50px").toBeGreaterThanOrEqual(48);
    expect(r.titleSize).toBeLessThanOrEqual(52);
    expect(r.byline, "the byline").toBe("by Lucy Sterling");
    expect(r.byStyle).toBe("italic");
    expect(r.byFace).toMatch(/Source Serif/);
    expect(r.byMax).toBe("520px");
    expect(r.ruleLead, "a 34px rule before the byline").toBe(34);
    expect(r.ruleFill, "and a rule filling the rest").toBeGreaterThan(100);
    expect(r.cardOpacity).toBe("1");
    expect(r.h2).toBe("Tell us a bit more about it.");
    expect(r.sub).toBe("Each of these helps QueryHawk match you with the right agents and sense-check your list. None is set in stone.");
    await noOverflow(page, "book 1440");
  });

  test("B2 genres: several with one primary, from the fixed list only", async ({ page }) => {
    await lab(page, Q, WIDE, { motion: "reduce" });
    const g0 = await genres(page);
    expect(g0.pills, "nine pills, Crime and Thriller apart").toEqual(["Crime", "Thriller", "Literary fiction", "Fantasy", "Romance", "Historical fiction", "Science fiction", "Women's fiction", "Horror"]);
    expect(g0.picked, "nothing is picked on arrival").toEqual([]);
    expect(await card(page).locator('[data-act="continue"]').isDisabled(), "Continue waits for a genre").toBe(true);
    await pill(page, "fantasy").click(); await pill(page, "romance").click(); await pill(page, "horror").click();
    const g1 = await genres(page);
    expect(g1.picked.sort()).toEqual(["fantasy", "horror", "romance"]);
    expect(g1.primary, "the first picked is the primary").toEqual(["fantasy"]);
    expect(g1.line).toBe("Primary: Fantasy | Also: Romance, Horror");
    await pill(page, "romance").click();
    const g2 = await genres(page);
    expect(g2.primary, "pressing a picked one makes it the primary").toEqual(["romance"]);
    expect(g2.picked.length, "and removes nothing").toBe(3);
    await pill(page, "romance").click();
    const g3 = await genres(page);
    expect(g3.picked, "pressing the primary removes it").not.toContain("romance");
    expect(g3.primary, "and the next picked becomes the primary").toEqual(["fantasy"]);
    // the search: only list items, the typed part bold, and a pick joins the pills
    const search = page.locator('[data-o9="genre-search"] input');
    await search.fill("sp");
    const drop = await page.evaluate(() => ({
      options: [...document.querySelectorAll('[data-o9="genre-drop"] [role="option"]')].map((o) => ({ text: o.textContent, bold: o.querySelector("b")?.textContent })),
      foot: document.querySelector('[data-o9="genre-drop"] .o9-dropfoot')?.textContent,
      floats: getComputedStyle(document.querySelector('[data-o9="genre-drop"]')!).position,
    }));
    record("B2", "search", drop);
    await shot(page, "book-checks-1440");
    expect(drop.options.map((o) => o.text)).toEqual(["Speculative fiction"]);
    expect(drop.options[0].bold?.toLowerCase(), "the typed part is bold").toBe("sp");
    expect(drop.foot).toBe("Pick from the list; it joins your pills above. Can't find yours? Choose the nearest.");
    expect(drop.floats, "the list floats over the fields below").toBe("absolute");
    await page.locator('[data-o9="genre-drop"] [data-genre="speculative-fiction"]').click();
    const g4 = await genres(page);
    expect(g4.pills, "it joined the pills").toContain("Speculative fiction");
    expect(g4.picked).toContain("speculative-fiction");
    // a string that is not in the list adds nothing
    if (MUTATE === "B2") await page.evaluate(() => {
      const input = document.querySelector<HTMLInputElement>('[data-o9="genre-search"] input')!;
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") { const b = document.createElement("button"); b.setAttribute("role", "option"); b.setAttribute("aria-selected", "true"); b.setAttribute("data-genre", "free-text"); b.textContent = input.value; document.querySelector('[data-o9="genre"] .o9-pills')!.appendChild(b); } }, true);
    });
    await search.fill("Grimdark western");
    await search.press("Enter");
    const g5 = await genres(page);
    record("B2", "after-free-text", g5);
    expect(g5.pills, "typing something outside the list adds nothing").toEqual(g4.pills);
    expect(g5.picked).toEqual(g4.picked);
    // what the step hands on: the primary as `genre`, the rest as `subGenres`, in stored form
    await card(page).locator('[data-act="continue"]').click();
    const out = (await handed(page))[0];
    record("B2", "handed-on", out);
    expect(out.genre, "the primary").toBe("Fantasy");
    expect(out.subGenres).toEqual(["Horror", "Speculative fiction"]);
  });

  test("B3 each age category opens its own note, one at a time", async ({ page }) => {
    await lab(page, Q, WIDE, { motion: "reduce" });
    const NOTES: Record<string, string> = {
      "Picture Book": "Read aloud to children up to about 7, told as much through pictures as words, usually under 1,000 words. Think The Very Hungry Caterpillar, The Gruffalo, Where the Wild Things Are.",
      "Early Reader": "Children starting to read on their own, roughly 6 to 9. Short chapters, simple sentences, some illustration. Think Horrid Henry, The Worst Witch, Mr Gum.",
      "Middle Grade": "Readers roughly 8 to 12. Protagonists of that age, adventure and friendship at the heart, nothing too dark on the page. Think Holes, Wonder, The Lion, the Witch and the Wardrobe.",
      "Young Adult": "Readers roughly 12 to 18. Teenage protagonists, first experiences, questions of identity, often told close and in the moment. Think The Hunger Games, The Hate U Give, Noughts & Crosses.",
      "New Adult": "Protagonists roughly 18 to 25, leaving home and finding their feet: first jobs, university, first serious relationships. Think Fourth Wing, A Court of Thorns and Roses, It Ends with Us.",
      Adult: "Written for grown-up readers: any age of protagonist, any theme, no limits on content. It's the largest market, and the one most agents list first. Think Gone Girl, The Thursday Murder Club, Normal People.",
    };
    const row = await page.locator('[data-o9="age"] [role="radio"]').allTextContents();
    expect(row, "the shared list's own labels, in its order").toEqual(Object.keys(NOTES));
    expect(await page.locator('[data-o9="age-note"]').count(), "no note until one is picked").toBe(0);
    for (const [cat, note] of Object.entries(NOTES)) {
      await page.locator('[data-o9="age"]').getByRole("radio", { name: cat, exact: true }).click();
      if (MUTATE === "B3") await page.evaluate((adult) => { document.querySelector('[data-o9="age-note"] p')!.textContent = adult; }, NOTES.Adult);
      const r = await page.evaluate(() => ({
        n: document.querySelectorAll('[data-o9="age-note"]').length,
        eye: document.querySelector('[data-o9="age-note"] .o9-desceye')?.textContent, p: document.querySelector('[data-o9="age-note"] p')?.textContent,
        italics: [...document.querySelectorAll('[data-o9="age-note"] p i')].length,
        checked: [...document.querySelectorAll('[data-o9="age"] [aria-checked="true"]')].map((e) => e.textContent),
      }));
      expect(r.n, `${cat}: one note at a time`).toBe(1);
      expect(r.eye).toBe(`${cat} · what this means`);
      expect(r.p, cat).toBe(note);
      expect(r.italics, `${cat}: its three titles are italic`).toBe(3);
      expect(r.checked).toEqual([cat]);
    }
    record("B3", "categories", row);
  });

  test("B4 the word count: optional, digits only, 1,000 to 500,000", async ({ page }) => {
    await lab(page, Q, WIDE, { motion: "reduce" });
    await pill(page, "fantasy").click();
    const go = card(page).locator('[data-act="continue"]');
    const words = page.locator("#o9-words");
    const state = async () => ({ off: await go.isDisabled(), err: await page.locator('[data-o9="words-error"]').allTextContents(), help: (await page.locator('#o9-words-help').allTextContents())[0] ?? null, value: await words.inputValue() });
    expect(await words.getAttribute("placeholder"), "no genre-based placeholder").toBe("e.g. 85,000");
    const empty = await state();
    expect(empty.off, "empty is allowed").toBe(false);
    expect(empty.help).toBe("The full manuscript, as it stands today.");
    if (MUTATE === "B4") await page.evaluate(() => { const o = new MutationObserver(() => { document.querySelector('[data-o9="words-error"]')?.remove(); const b = document.querySelector<HTMLButtonElement>('[data-o9="book-card"] [data-act="continue"]'); if (b) b.disabled = false; }); o.observe(document.body, { childList: true, subtree: true, attributes: true }); });
    await words.fill("8,500,000");
    const over = await state();
    await words.fill("400");
    const under = await state();
    record("B4", "bounds", { over, under });
    expect(over.err).toEqual(["That's over 500,000 words. Check the number."]);
    expect(over.off, "Continue is off until it is fixed or cleared").toBe(true);
    expect(under.err).toEqual(["That's under 1,000 words. Check the number."]);
    expect(under.off).toBe(true);
    await words.fill("eighty thousand 85,000");
    expect((await state()).value, "letters cannot be typed").toBe("  85,000");
    await words.fill("85,000");
    const ok = await state();
    expect(ok.err).toEqual([]);
    expect(ok.off).toBe(false);
    await go.click();
    expect((await handed(page))[0].wordCount, "85,000 is handed on as 85000").toBe("85000");
  });

  test("B the book at 400: no overflow", async ({ page }) => {
    await lab(page, Q, PHONE, { motion: "reduce" });
    await shot(page, "book-400", true);
    await noOverflow(page, "book 400");
  });
});
