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
import { decideDuplicates, answerAgents, answerQueries } from "./reviewDrive";

/* ════ W1 · the welcome ════ */
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

/* ════ F1 · the fork's tiles and the Smart Import hand-off ═══════════════════════════ */
test.describe("F1", () => {
  const TILE_LINES: Record<string, string[]> = {
    smart: ["Any spreadsheet, any layout", "QueryHawk reads it for you", "You check it before anything's saved"],
    template: ["A ready-made sheet to fill in", "Set columns, read exactly, every time", "Upload it back whenever you're done"],
    byhand: ["Straight to the agent form", "Quickest for a handful of agents", "Add more at any time"],
  };
  const STEPS: Array<[string, string]> = [
    ["Your sheet, as it is", "Any layout, any wording. Nothing to tidy first."],
    ["QueryHawk reads every row", "Agents, queries, dates and statuses, sorted into place."],
    ["You check what lands", "Anything unclear is asked about. Nothing is saved until you say so."],
  ];

  test("F1 three tiles: a 16:9 slot, three lines, no ring on arrival", async ({ page }) => {
    for (const pick of ["smart", "template", "byhand"]) {
      await lab(page, "s=fork&pick=" + pick, WIDE, { motion: "reduce" });
      const t = await page.evaluate(() => {
        const tiles = [...document.querySelectorAll<HTMLElement>(".sf-tile")];
        return {
          heading: document.querySelector(".sf-open h1")?.textContent ?? "",
          tiles: tiles.map((el) => {
            const slot = el.querySelector<HTMLElement>('[data-o9="slot"]');
            const r = slot?.getBoundingClientRect(); const tr = el.getBoundingClientRect();
            const dots = [...el.querySelectorAll<HTMLElement>("li")].map((li) => getComputedStyle(li, "::before").backgroundColor);
            return {
              id: el.dataset.tile, ringShadow: getComputedStyle(el).boxShadow, ringAttr: el.getAttribute("data-ringed"), ringClass: el.classList.contains("is-ringed"),
              slotRatio: r && r.height ? +(r.width / r.height).toFixed(2) : 0, slotFull: r ? Math.abs(r.width - tr.width) <= 1 && Math.abs(r.top - tr.top) <= 1 : false,
              lines: [...el.querySelectorAll("li")].map((li) => li.textContent ?? ""), dots,
              paragraph: el.querySelectorAll(".sf-tilep").length,
              buttons: [...el.querySelectorAll("button")].map((b) => b.textContent ?? ""), fact: el.querySelector(".sf-fact")?.textContent ?? "",
            };
          }),
          drop: document.querySelectorAll('[data-sf="drop"]').length,
          later: document.querySelector('[data-act="later"]')?.textContent ?? "", desk: document.querySelector('[data-act="desk"]')?.textContent ?? "",
          back: document.querySelectorAll(".sf-under-tiles .sf-back, .sf-under-tiles [data-act=\"back\"]").length,
        };
      });
      record("F1", `fork pick=${pick}`, t);
      expect(t.tiles.map((x) => x.id)).toEqual(["smart", "template", "byhand"]);
      for (const x of t.tiles) {
        expect(Math.abs(x.slotRatio - 16 / 9), `${x.id}: a 16:9 slot (${x.slotRatio})`).toBeLessThanOrEqual(0.03);
        expect(x.slotFull, `${x.id}: the slot is the tile's full width, at its top`).toBe(true);
        expect(x.lines, `${x.id}: three short lines`).toEqual(TILE_LINES[x.id!]);
        expect(x.dots, `${x.id}: navy dots`).toEqual(["rgb(42, 58, 82)", "rgb(42, 58, 82)", "rgb(42, 58, 82)"]);
        expect(x.paragraph, `${x.id}: the paragraph is gone`).toBe(0);
        expect(x.ringClass || x.ringAttr === "true" || /0px 0px 0px 2px/.test(x.ringShadow), `${x.id}: no ring on arrival (pick=${pick})`).toBe(false);
      }
      expect(t.tiles[0].buttons).toEqual(["Import a spreadsheet"]);
      expect(t.tiles[1].buttons).toEqual(["Download the template", "Upload my sheet"]);
      expect(t.tiles[2].buttons).toEqual(["Add an agent"]);
      expect(t.tiles.map((x) => x.fact)).toEqual(["Uses your one Smart Import", "Always free", "Always free · Ends set-up"]);
      expect(t.heading).toBe("How shall we capture your existing agents & queries?");
      expect(t.later).toBe("I've nothing to capture yet");
      expect(t.desk).toBe("match them up yourself");
    }
    await shot(page, "fork-1440", true);
    /* each button still reaches its own handler */
    for (const [sel, want] of [['[data-act="smart"]', "picker"], ['[data-act="download"]', "download"], ['[data-act="upload"]', "templatePicker"], ['[data-act="byhand"]', "byhand"]] as const) {
      await page.evaluate(() => { window.__onbLab = { calls: [] }; });
      await page.locator(sel).click();
      expect(await page.evaluate(() => (window.__onbLab?.calls ?? []).map((c) => c.name)), sel).toEqual([want]);
    }
  });

  test("F1 the hand-off: its heading, no one-shot note, three steps with 96px slots", async ({ page }) => {
    for (const plan of ["free", "pro"]) {
      await lab(page, "s=confirm&plan=" + plan, WIDE, { motion: "reduce" });
      if (MUTATE === "F1") await page.evaluate(() => { const p = document.createElement("p"); p.className = "sf-note"; p.textContent = "This is your one Smart Import. The template never uses it, so keep it for a spreadsheet you'd rather not retype."; document.querySelector(".sf-stepcard")!.appendChild(p); });
      const c = await page.evaluate(() => {
        const col = document.querySelector<HTMLElement>('[data-screen="confirm"]')!;
        const card = col.querySelector<HTMLElement>(".sf-stepcard")!; const how = col.querySelector<HTMLElement>('[data-o9="how"]');
        const cr = card.getBoundingClientRect(); const hr = how?.getBoundingClientRect();
        return {
          heading: col.querySelector("h1")?.textContent ?? "", sub: col.querySelector(".sf-sub")?.textContent ?? "",
          text: (col.textContent ?? "").replace(/\s+/g, " "), notes: card.querySelectorAll(".sf-note").length,
          eyebrow: how?.querySelector('[data-o9="how-eyebrow"]')?.textContent ?? "",
          steps: how ? [...how.querySelectorAll("li")].map((li) => {
            const s = li.querySelector<HTMLElement>('[data-o9="slot"]')!.getBoundingClientRect();
            const b = li.querySelector("b")!;
            return { title: b.textContent ?? "", number: getComputedStyle(b, "::before").content, line: li.querySelector('[data-o9="how-line"]')?.textContent ?? "", slot: [Math.round(s.width), Math.round(s.height)] };
          }) : [],
          beside: !!hr && hr.left >= cr.right - 1,
          card: { label: card.querySelector(".sf-qlab")?.textContent ?? "", file: card.querySelector('[data-sf="file-name"]')?.textContent ?? "", primary: card.querySelector('[data-act="read"]')?.textContent ?? "", change: card.querySelector('[data-act="change"]')?.textContent ?? "" },
        };
      });
      record("F1", `hand-off plan=${plan}`, c);
      expect(c.heading).toBe("Let QueryHawk Smart Import take it from here.");
      expect(c.sub).toBe("Nothing is saved until you've checked what we read.");
      expect(c.notes, "the one-shot note is gone").toBe(0);
      expect(c.text, "this screen no longer names the one Smart Import").not.toMatch(/your one Smart Import|this month's Smart Import|uses your/i);
      expect(c.eyebrow).toBe("What happens next");
      expect(c.steps.map((s) => [s.title, s.line])).toEqual(STEPS);
      expect(c.steps.map((s) => s.slot), "a 96px square slot each").toEqual([[96, 96], [96, 96], [96, 96]]);
      /* a CSS counter: the computed value names the counter, and the list increments it once per step */
      for (const st of c.steps) expect(st.number, "numbered by the list's own counter").toMatch(/counter\(o9how\) " · "/);
      expect(c.beside, "the steps sit beside the card at 1440").toBe(true);
      expect(c.card).toEqual({ label: "The file you chose", file: "my agents FINAL v3.csv", primary: "Read my file", change: "Change" });
    }
    await shot(page, "confirm-1440", true);
    await lab(page, "s=confirm", { width: 1000, height: 800 }, { motion: "reduce" });
    const stacked = await page.evaluate(() => { const c = document.querySelector(".sf-stepcard")!.getBoundingClientRect(); const h = document.querySelector('[data-o9="how"]')!.getBoundingClientRect(); return h.top >= c.bottom - 1; });
    expect(stacked, "below 1100 the steps stack under the card").toBe(true);
  });

  test("F1 the fork and the hand-off at 400: no overflow", async ({ page }) => {
    await lab(page, "s=fork", PHONE, { motion: "reduce" });
    await shot(page, "fork-400", true);
    await noOverflow(page, "fork 400");
    await lab(page, "s=confirm", PHONE, { motion: "reduce" });
    await noOverflow(page, "confirm 400");
  });
});

/* ════ S1 · success marks, and nothing called optional ═══════════════════════════════ */
test.describe("S1", () => {
  const GO = "rgb(78, 125, 96)";
  type P = import("@playwright/test").Page;
  /** Every element on the screen painted with the sage, and whether it is a mark. */
  const sage = (page: P) => page.evaluate((go) => {
    const hits: { where: string; prop: string; mark: boolean }[] = [];
    for (const el of document.querySelectorAll<HTMLElement>(".sf *")) {
      if (el.getBoundingClientRect().width === 0) continue;
      const c = getComputedStyle(el);
      for (const prop of ["backgroundColor", "color", "borderTopColor", "outlineColor", "fill", "stroke"] as const) {
        if (c[prop] === go) hits.push({ where: el.className?.toString?.() || el.tagName, prop, mark: !!el.closest('[data-o9="gomark"]') });
      }
      const b = getComputedStyle(el, "::before"), a = getComputedStyle(el, "::after");
      for (const [ps, name] of [[b, "::before"], [a, "::after"]] as const) {
        if (ps.content !== "none" && (ps.backgroundColor === go || ps.borderTopColor === go)) hits.push({ where: (el.className?.toString?.() || el.tagName) + name, prop: "pseudo", mark: !!el.closest('[data-o9="gomark"]') });
      }
    }
    return hits;
  }, GO);
  const mark = (page: P, scope: string) => page.evaluate((sel) => {
    const m = document.querySelector<HTMLElement>(`${sel} [data-o9="gomark"]`);
    if (!m) return null;
    const r = m.getBoundingClientRect(); const path = m.querySelector("path")!;
    return { size: [Math.round(r.width), Math.round(r.height)], bg: getComputedStyle(m).backgroundColor, radius: getComputedStyle(m).borderRadius, tick: getComputedStyle(path).stroke, drawn: getComputedStyle(path).strokeDashoffset };
  }, scope);
  const reviewText = (page: P) => page.evaluate(() => (document.querySelector<HTMLElement>(".sf-scroll, [data-sf=\"scroll\"]") ?? document.querySelector<HTMLElement>(".sf")!).innerText);

  test("S1 the summary opens on the mark, and its tiers need an answer", async ({ page }) => {
    await lab(page, "s=overview&fx=review&rows=34", WIDE, { motion: "reduce" });
    if (MUTATE === "S1") await page.addStyleTag({ content: ".sf .im-chip--file{background:#4e7d60!important}" });
    const m = await mark(page, '[data-im="summary"]');
    const s = await page.evaluate(() => {
      const t = (sel: string) => document.querySelector(sel)?.textContent ?? "";
      const markRow = document.querySelector('[data-im="markrow"]')!.getBoundingClientRect(); const pops = document.querySelector(".im-pops")!.getBoundingClientRect();
      return {
        title: t('[data-im="title"]'), line: t('[data-im="read-line"]'), lead: t('[data-im="lead"]'),
        bold: [...document.querySelectorAll('[data-im="lead"] b')].map((b) => b.textContent ?? ""),
        tiers: [...document.querySelectorAll(".im-tiers li")].map((li) => ({ tone: (li as HTMLElement).dataset.tier, name: li.querySelector(".im-tname")?.childNodes[0]?.textContent ?? "", chip: li.querySelector(".im-chip")?.textContent ?? "", n: Number(li.querySelector('[data-im="tier-n"]')?.textContent), text: li.querySelector("p")?.textContent ?? "" })),
        captions: [...document.querySelectorAll(".im-st")].map((st) => [(st as HTMLElement).dataset.step, st.querySelector("small")?.textContent ?? ""]),
        markFirst: markRow.bottom <= pops.top, file: t('[data-im="file"]'),
      };
    });
    record("S1", "summary", { m, s });
    await shot(page, "overview-1440", true);
    expect(m, "the summary has a mark").not.toBeNull();
    expect(m!.size).toEqual([84, 84]);
    expect(m!.bg, "the mark is --go").toBe(GO);
    expect(m!.drawn, "under reduced motion the tick is drawn").toBe("0px");
    expect(s.title).toBe("We've read your file.");
    expect(s.line).toBe("34 rows, read and sorted. Nothing is saved yet.");
    expect(s.markFirst, "the mark comes before the cards").toBe(true);
    expect(s.file, "the chip is the file's name alone").not.toMatch(/rows?/);
    const ask = s.tiers.filter((t) => t.tone === "ask");
    expect(ask.length, "both cards have a tier that needs an answer").toBe(2);
    for (const t of ask) expect(t.name.trim()).toBe("Need an answer");
    expect(ask.map((t) => t.chip)).toEqual(["Step 1", "Step 2"]);
    expect(s.captions.filter(([id]) => id === "agents" || id === "queries").map(([, c]) => c)).toEqual(ask.map((t) => `${t.n} to answer`));
    expect(s.lead).toMatch(/^Most of it's ready to go\. .* Each one is a quick pick, and then everything lands at once\.$/);
    expect(s.bold).toEqual([`${ask[0].n} agents need an answer`, `${ask[1].n} queries need an answer`]);
    const text = await reviewText(page);
    expect(text).not.toMatch(/optional/i);
    expect(text).not.toMatch(/chances to sharpen|to sharpen/i);
    const hits = await sage(page);
    expect(hits.filter((h) => h.mark).length, "the sweep sees the mark").toBeGreaterThan(0);
    expect(hits.filter((h) => !h.mark), "nothing but the mark is sage").toEqual([]);
    /* without a row count the line states none */
    await lab(page, "s=overview&fx=review", WIDE, { motion: "reduce" });
    expect(await page.locator('[data-im="read-line"]').textContent()).toBe("Read and sorted. Nothing is saved yet.");
  });

  test("S1 duplicates: Continue lights only when every set is decided, then the mark", async ({ page }) => {
    await lab(page, "s=review&fx=dupes", WIDE, { motion: "reduce" });
    const primary = page.locator('[data-im="primary"]');
    const openSets = () => page.locator('[data-dup-state="open"]').count();
    const before = { open: await openSets(), off: await primary.isDisabled(), hint: await page.locator('[data-im="hint"]').allTextContents() };
    expect(before.open, "the fixture opens with sets to decide").toBeGreaterThan(1);
    expect(before.off, "Continue is off while a set is undecided").toBe(true);
    await decideDuplicates(page, { keepOne: /Finch/ });
    expect(await openSets(), "every set is decided").toBe(0);
    await page.locator('[data-im="dupes-done"]').waitFor({ timeout: 5000 });
    const m = await mark(page, '[data-im="dupes-done"]');
    const d = await page.evaluate(() => ({
      head: document.querySelector('[data-im="dupes-done"] [data-im="title"]')?.textContent ?? "", line: document.querySelector('[data-im="dupes-line"]')?.textContent ?? "",
      list: document.querySelector('[data-im="decided"] .im-listtitle')?.textContent ?? "", change: document.querySelector('[data-im="change-decision"]')?.textContent ?? "",
      rows: [...document.querySelectorAll("[data-decided]")].map((r) => ({ name: r.querySelector(".im-rwname")?.textContent ?? "", sub: r.querySelector(".im-rwsub")?.textContent ?? "", chip: r.querySelector('[data-im="decided-chip"]')?.textContent ?? "", chipBg: getComputedStyle(r.querySelector('[data-im="decided-chip"]')!).backgroundColor })),
      hint: document.querySelector('[data-im="hint"]')?.textContent ?? "", openList: document.querySelectorAll('[data-im="list"]').length,
    }));
    record("S1", "dupes-done", { before, m, d, off: await primary.isDisabled() });
    await shot(page, "dupes-done-1440", true);
    expect(m!.size).toEqual([84, 84]);
    expect(m!.bg).toBe(GO);
    expect(d.head).toBe("Duplicates sorted.");
    expect(d.line).toMatch(/^\d+ sets? merged\. Their queries moved across, nothing lost\. 1 set kept as separate agents\. \d+ agents go forward\.$/);
    expect(d.list).toBe("What you decided");
    expect(d.change).toBe("Change a decision");
    expect(d.rows.length).toBeGreaterThan(1);
    expect(d.rows.filter((r) => r.chip === "Merged").every((r) => r.chipBg === "rgb(225, 234, 226)"), "Merged is sage-soft").toBe(true);
    expect(d.rows.some((r) => r.chip === "Kept both")).toBe(true);
    expect(d.openList, "the list of sets has given way").toBe(0);
    expect(d.hint).toMatch(/^Next, (\d+ agents? needs? an answer|your agents)\.$/);
    expect(await primary.isDisabled(), "Continue lights now").toBe(false);
    expect((await sage(page)).filter((h) => !h.mark)).toEqual([]);
    expect(await reviewText(page)).not.toMatch(/optional/i);
    /* Change a decision brings the sets back, each with its Undo; undoing one puts Continue out again */
    await page.locator('[data-im="change-decision"]').click();
    await page.locator('[data-im="dupe-undo"]').first().click();
    expect(await openSets()).toBeGreaterThan(0);
    expect(await primary.isDisabled()).toBe(true);
  });

  test("S1 queries: the last answer brings the sage band, which accounts for every answer", async ({ page }) => {
    await lab(page, "s=review&fx=review", WIDE, { motion: "reduce" });
    /* the agents step first: answer whatever it asks, by the quickest honest answer */
    await answerAgents(page);
    await page.locator('[data-im="primary"]').click();
    await page.locator('[data-im="review"][data-step="queries"]').waitFor();
    expect(await page.locator('[data-im="all-answered"]').count(), "no band while questions are open").toBe(0);
    const answered = await answerQueries(page);
    expect(answered, "the fixture's queries step asks something").toBeGreaterThan(3);
    await page.locator('[data-im="all-answered"]').waitFor({ timeout: 5000 });
    const m = await mark(page, '[data-im="all-answered"]');
    const a = await page.evaluate(() => ({
      head: document.querySelector('[data-im="all-head"]')?.textContent ?? "", line: document.querySelector('[data-im="all-line"]')?.textContent ?? "",
      band: getComputedStyle(document.querySelector('[data-im="all-answered"]')!).backgroundColor, hint: document.querySelector('[data-im="hint"]')?.textContent ?? "",
      primary: document.querySelector('[data-im="primary"]')?.textContent ?? "", sub: document.querySelector('[data-im="title-sub"]')?.textContent ?? "",
    }));
    record("S1", "queries-done", { m, a, answered });
    await shot(page, "queries-done-1440", true);
    expect(m!.size).toEqual([52, 52]);
    expect(m!.bg).toBe(GO);
    expect(a.band, "the band is sage-soft").toBe("rgb(225, 234, 226)");
    expect(a.head).toMatch(/^All \d+ answered\.$/);
    const parts = a.line.replace(/\.$/, "").split(", ");
    expect(parts.length).toBeGreaterThan(1);
    for (const p of parts) expect(p).toMatch(/^\d+ (dates? confirmed|dates? added|left blank on purpose|status(es)? set|details? checked)$/);
    expect(a.line, "an undated answer is accounted for").toMatch(/\d+ left blank on purpose/);
    expect(a.hint).toMatch(/^\d+ agents and \d+ queries will be written\. The dashboard opens when it's done\.$/);
    expect(a.primary).toBe("Import and get started");
    expect(a.sub).toBe("Every question answered. Nothing is saved yet.");
    expect((await sage(page)).filter((h) => !h.mark)).toEqual([]);
    expect(await reviewText(page)).not.toMatch(/optional/i);
  });
});

/* ════ G1–G4 · the answer deck and the gate ══════════════════════════════════════════ */
test.describe("G", () => {
  type P = import("@playwright/test").Page;
  const primary = (page: P) => page.locator('[data-im="primary"]');
  const state = (page: P) => page.evaluate(() => {
    const t = (sel: string) => document.querySelector(sel)?.textContent?.replace(/\s+/g, " ").trim() ?? "";
    const b = document.querySelector<HTMLButtonElement>('[data-im="primary"]');
    return {
      step: document.querySelector('[data-im="review"]')?.getAttribute("data-step") ?? "",
      n: t('[data-im="title-n"]'), sub: t('[data-im="title-sub"]'),
      deck: document.querySelectorAll('[data-im="deck"]').length, deckTitle: t('[data-im="deck-head"] b'), pos: t('[data-im="deck-pos"]'),
      dots: [...document.querySelectorAll('[data-im="deck-dots"] .o9-dot')].map((d) => (d as HTMLElement).dataset.state),
      name: t('[data-im="deck-card"] .o9-qwho b'), cardSub: t('[data-im="deck-card"] .o9-qwho small'), chip: t('[data-im="deck-chip"]'),
      ask: t('[data-im="deck-ask"]'), why: t('[data-im="deck-why"]'), reason: document.querySelector('[data-im="deck"] [data-reason]')?.getAttribute("data-reason") ?? "",
      coming: [...document.querySelectorAll('[data-im="coming-up"] .im-chip')].map((c) => c.textContent ?? ""), comingLead: t('[data-im="coming-up"] > span'),
      readyHead: t('[data-im="ready"] .im-listtitle'), readyChip: t('[data-im="ready-chip"]'), readyRows: document.querySelectorAll('[data-im="ready"] [data-row-id]').length, showAll: t('[data-im="show-all"]'),
      rail: document.querySelectorAll('[data-im="rail"]').length, hint: t('[data-im="hint"]'),
      primary: b?.textContent?.trim() ?? "", off: b?.disabled ?? null,
    };
  });
  const card = (page: P) => page.locator('[data-im="deck-card"]');

  test("G1 agents: two questions, the primary waits for both, and either answer counts", async ({ page }) => {
    await lab(page, "s=review&fx=gate", WIDE, { motion: "reduce" });
    if (MUTATE === "G1") await page.evaluate(() => { new MutationObserver(() => { const b = document.querySelector<HTMLButtonElement>('[data-im="primary"]'); if (b?.disabled) b.disabled = false; }).observe(document.body, { subtree: true, childList: true, attributes: true }); const b = document.querySelector<HTMLButtonElement>('[data-im="primary"]'); if (b) b.disabled = false; });
    const a0 = await state(page);
    record("G1", "arrival", a0);
    await shot(page, "agents-deck-1440", true);
    expect(a0.step).toBe("agents");
    expect(a0.n).toBe("16");
    expect(a0.sub).toBe("2 need an answer before you go on. The other 14 are ready.");
    expect(a0.deck, "the deck is on the page").toBe(1);
    expect(a0.deckTitle).toBe("Needs an answer");
    expect(a0.pos).toBe("1 of 2");
    expect(a0.dots).toEqual(["on", "open"]);
    expect(a0.rail, "the right rail is gone").toBe(0);
    expect(a0.off, "the primary is disabled while a question is open").toBe(true);
    expect(a0.primary).toBe("Continue to queries · 2 to answer first");
    expect(a0.hint).toBe('Answer the 2 above first. "Carry on without an agency" counts as an answer.');
    expect([a0.name, a0.cardSub, a0.chip]).toEqual(["Priyanka", "No agency in your sheet", "No agency name"]);
    expect(a0.ask).toBe("Which agency is Priyanka with?");
    expect(a0.why).toBe("The sheet has a name and no agency. An agency helps you spot colleagues and duplicates later, but it isn't required.");
    expect([a0.comingLead, a0.coming]).toEqual(["Coming up:", ["Tom Rafferty · no agency name"]]);
    expect([a0.readyHead, a0.readyChip, a0.readyRows, a0.showAll]).toEqual(["Ready to import", "14 ready", 5, "Show all 14"]);
    /* Questions opens the step's own FAQ */
    await page.locator('[data-im="deck-questions"]').click();
    expect(await page.locator('[data-im="deck-faq"] [data-im="faq-q"]').count(), "the FAQ is behind Questions").toBeGreaterThan(2);
    await page.locator('[data-im="deck-questions"]').click();
    /* answer one by saving an agency: the deck moves on by itself, and the primary still waits */
    await card(page).locator("input").first().fill("Meridian Literary");
    await card(page).getByRole("button", { name: "Save agency" }).click();
    const a1 = await state(page);
    record("G1", "after one", a1);
    expect([a1.name, a1.pos, a1.dots]).toEqual(["Tom Rafferty", "2 of 2", ["done", "on"]]);
    expect(a1.off).toBe(true);
    expect(a1.primary).toBe("Continue to queries · 1 to answer first");
    expect(a1.sub).toBe("1 needs an answer before you go on. The other 15 are ready.");
    /* answer the other by carrying on without one: it counts */
    await card(page).getByRole("button", { name: "Carry on without an agency" }).click();
    const a2 = await state(page);
    record("G1", "after both", a2);
    expect(a2.off, "the primary lights").toBe(false);
    expect(a2.primary).toBe("Continue to queries");
    expect(a2.deck, "the deck has given way").toBe(0);
    expect(a2.readyChip).toBe("16 ready");
    await page.locator('[data-im="show-all"]').click();
    expect(await page.locator('[data-im="ready"] [data-row-id]').count()).toBe(16);
    expect(await page.locator('[data-im="ready"] [data-row-id]', { hasText: "Priyanka" }).locator(".im-rwsub").textContent()).toContain("Meridian Literary");
    /* Back keeps every answer: on to queries, answer one, back, forward */
    await primary(page).click();
    await page.locator('[data-im="review"][data-step="queries"]').waitFor();
    const q0 = await state(page);
    await card(page).locator(".o9-pick").first().click();
    await page.locator('[data-im="back"]').click();
    const back = await state(page);
    expect([back.step, back.off, back.deck]).toEqual(["agents", false, 0]);
    await primary(page).click();
    const again = await state(page);
    record("G1", "back keeps answers", { q0: q0.primary, again: again.primary });
    expect(q0.primary).toBe("Import and get started · 9 to answer first");
    expect(again.primary).toBe("Import and get started · 8 to answer first");
  });

  test("G2 queries: nine questions, the blank date among them, and what is written", async ({ page }) => {
    await lab(page, "s=review&fx=gate", WIDE, { motion: "reduce" });
    await answerAgents(page);
    await primary(page).click();
    await page.locator('[data-im="review"][data-step="queries"]').waitFor();
    if (MUTATE === "G2") await page.evaluate(() => {
      /* the named break: the blank date is not asked. Its card answers itself the moment it shows. */
      const go = () => { const c = document.querySelector('[data-im="deck-card"]'); if (c && /has no date for this one/.test(c.textContent ?? "")) [...c.querySelectorAll("button")].find((b) => b.textContent === "I don't have this date")?.click(); };
      new MutationObserver(go).observe(document.body, { subtree: true, childList: true });
    });
    const q0 = await state(page);
    record("G2", "arrival", q0);
    await shot(page, "queries-deck-1440", true);
    expect(q0.n).toBe("16");
    expect(q0.sub).toBe("9 need an answer before anything is saved. The other 7 are ready.");
    expect(q0.dots.length).toBe(9);
    expect([q0.off, q0.primary]).toEqual([true, "Import and get started · 9 to answer first"]);
    expect(q0.hint).toBe("Answer the 9 above first. If you don't have a date, say so on its card and the query is kept undated.");
    expect(q0.coming).toEqual(["1 more date to confirm", "3 more dates needed", "4 more statuses to clarify"]);
    expect([q0.readyHead, q0.readyChip, q0.readyRows, q0.showAll]).toEqual(["Ready to import", "7 ready", 5, "Show all 7"]);
    /* each card by who it is about: the question asked, then the answer given */
    const plan: Record<string, { ask: string; chip: string; do: () => Promise<void> }> = {
      "Meredith Quaye": { ask: 'Your sheet says “03/05/2026”. Which did you mean?', chip: "Date to confirm", do: async () => { await card(page).locator('.o9-pick[data-reading]').first().click(); } },
      "Ruth Castellano": { ask: 'Your sheet says “06/08/2026”. Which did you mean?', chip: "Date to confirm", do: async () => { await card(page).getByRole("button", { name: "Neither · type the date" }).click(); await card(page).locator('input[type="date"]').fill("2026-06-18"); await card(page).getByRole("button", { name: "Save date" }).click(); } },
      "Sean O'Brien": { ask: 'Your sheet says “sometime in May”. When was this sent?', chip: "Date needed", do: async () => { await card(page).locator('input[type="date"]').fill("2026-05-14"); await card(page).getByRole("button", { name: "Save date" }).click(); } },
      "Aoife Brennan": { ask: 'Your sheet says “spring”. When was this sent?', chip: "Date needed", do: async () => { await card(page).getByRole("button", { name: "I don't have this date" }).click(); } },
      "Priyanka": { ask: "Your sheet has no date for this one. When was it sent?", chip: "Date needed", do: async () => { await card(page).locator('input[type="date"]').fill("2026-04-02"); await card(page).getByRole("button", { name: "Save date" }).click(); } },
      "Rhys Hale": { ask: 'Your sheet says “waiting”. Where does this one stand?', chip: "Status to clarify", do: async () => { await card(page).locator('[data-status="Partial Requested"]').click(); } },
      "Harbour & Vale": { ask: 'Your sheet says “sent partial?”. Where does this one stand?', chip: "Status to clarify", do: async () => { await card(page).locator('[data-status="Partial Sent"]').click(); } },
      "Tom Rafferty": { ask: 'Your sheet says “no”. Where does this one stand?', chip: "Status to clarify", do: async () => { await card(page).locator('[data-status="Rejected"]').click(); } },
      "Hattie Lowe": { ask: 'Your sheet says “they want more”. Where does this one stand?', chip: "Status to clarify", do: async () => { await card(page).locator('[data-status="Full Requested"]').click(); } },
    };
    const seen: Array<{ name: string; ask: string; chip: string; left: string }> = [];
    for (let k = 9; k >= 1; k--) {
      const s = await state(page);
      expect(s.off, `${k} to answer: the primary is disabled`).toBe(true);
      expect(s.primary).toBe(`Import and get started · ${k} to answer first`);
      const p = plan[s.name];
      expect(p, `a card for ${s.name}`).toBeTruthy();
      expect([s.ask, s.chip], s.name).toEqual([p.ask, p.chip]);
      seen.push({ name: s.name, ask: s.ask, chip: s.chip, left: s.primary });
      await p.do();
      if (s.name === "Rhys Hale") {
        /* the status set is the fixed list, drawn with its rings */
      }
    }
    record("G2", "asked", seen);
    expect(seen.map((s) => s.name).sort(), "all nine are asked, the blank date among them").toEqual(Object.keys(plan).sort());
    const done = await state(page);
    expect([done.off, done.primary, done.deck]).toEqual([false, "Import and get started", 0]);
    expect(await page.locator('[data-im="all-head"]').textContent()).toBe("All 9 answered.");
    expect(await page.locator('[data-im="all-line"]').textContent()).toBe("2 dates confirmed, 2 dates added, 1 left blank on purpose, 4 statuses set.");
    await primary(page).click();
    const written = await page.evaluate(() => (window.__onbLab as unknown as { result: { agents: { ref: string; name: string; agency?: string }[]; queries: { agentRef: string; status: string; sentDate: string | null }[] } }).result);
    const by = (ref: string) => written.queries.find((q) => q.agentRef === ref)!;
    /* a reading offered by the parser is a full timestamp; a typed date is the day. Both are compared by day. */
    const got = { g8: (by("g8").sentDate ?? "").slice(0, 10), g9: by("g9").sentDate, g10: by("g10").sentDate, g12: by("g12").sentDate, g11: by("g11").sentDate, g13: by("g13").status, g14: by("g14").status, g15: by("g15").status, g16: by("g16").status };
    record("G2", "written", got);
    expect(got).toEqual({ g8: "2026-05-03", g9: "2026-06-18", g10: "2026-05-14", g12: null, g11: "2026-04-02", g13: "Partial Requested", g14: "Partial Sent", g15: "Rejected", g16: "Full Requested" });
    expect(written.queries.length).toBe(16);
  });

  test("G2 the status question is the fixed set, each with its ring; a two-way date cannot be left blank", async ({ page }) => {
    await lab(page, "s=review&fx=gate", WIDE, { motion: "reduce" });
    await answerAgents(page);
    await primary(page).click();
    await page.locator('[data-im="review"][data-step="queries"]').waitFor();
    const twoWay = await card(page).evaluate((c) => [...c.querySelectorAll("button")].map((b) => b.textContent ?? ""));
    expect(twoWay, "two readings and Neither; no way to leave it blank").toEqual(["3 May 2026", "5 Mar 2026", "Neither · type the date"]);
    await page.locator('[data-im="deck-dots"] .o9-dot').nth(5).click();
    const set = await card(page).evaluate((c) => [...c.querySelectorAll<HTMLElement>("[data-status]")].map((b) => ({ label: b.textContent ?? "", ring: !!b.querySelector("svg") })));
    record("G2", "status set", set);
    expect(set.map((s) => s.label)).toEqual(["Queried, no reply yet", "Partial requested", "Partial sent", "Full requested", "Full sent", "Revise & resubmit", "Offer", "Passed", "Withdrawn", "Closed with no reply"]);
    expect(set.every((s) => s.ring), "each with its ring").toBe(true);
    expect(await card(page).locator("input, select, textarea").count(), "picked, never typed").toBe(0);
    await shot(page, "queries-status-1440", true);
  });

  for (const path of ["remove", "name"] as const) {
    test(`G3 a row with no agent and no agency is asked: ${path === "remove" ? "removed, it is listed as not imported" : "given an agency, it imports"}`, async ({ page }) => {
      await page.addInitScript(() => localStorage.removeItem("sa.importSkipped.onb-lab"));
      await lab(page, "s=flow&fx=nameless&floor=50", WIDE, { motion: "reduce" });
      if (MUTATE === "G3") await page.evaluate(() => {
        /* the named break: set aside by itself, as before. The card removes itself the moment it shows. */
        new MutationObserver(() => { const c = document.querySelector('[data-im="deck-card"]'); [...(c?.querySelectorAll("button") ?? [])].find((b) => b.textContent === "Remove this row")?.click(); }).observe(document.body, { subtree: true, childList: true });
      });
      const sum = await page.evaluate(() => ({
        agents: document.querySelector('[data-im="card-agents"] [data-im="total"]')?.textContent, queries: document.querySelector('[data-im="card-queries"] [data-im="total"]')?.textContent,
        ask: document.querySelector('[data-im="card-agents"] [data-tier="ask"] p')?.textContent ?? "",
      }));
      await primary(page).click();
      await page.locator('[data-im="review"][data-step="agents"]').waitFor();
      const a = await state(page);
      record("G3", `${path} arrival`, { sum, a });
      expect([sum.agents, sum.queries], "the summary counts the row").toEqual(["3", "3"]);
      expect(sum.ask).toBe("1 row has no agent or agency. Name it, or remove it.");
      expect(a.deck, "the row is in the deck").toBe(1);
      expect([a.chip, a.ask, a.why]).toEqual(["No agent or agency", "This row has no agent or agency. Who was it sent to?", "Without one, the query can't be tracked. Add a name or an agency, or remove the row."]);
      expect([a.off, a.primary]).toEqual([true, "Continue to queries · 1 to answer first"]);
      expect(Number(a.n), "summary = the review's rows").toBe(Number(sum.agents));
      expect(a.readyRows + 1).toBe(Number(sum.agents));
      if (path === "remove") await card(page).getByRole("button", { name: "Remove this row" }).click();
      else { await card(page).getByPlaceholder("Agency name").fill("Fairground Literary"); await card(page).getByRole("button", { name: "Save", exact: true }).click(); }
      expect(await primary(page).isDisabled()).toBe(false);
      await primary(page).click();
      await page.locator('[data-im="review"][data-step="queries"]').waitFor();
      const qn = Number((await state(page)).n);
      await primary(page).click();
      await page.waitForFunction(() => (window.__onbLab?.calls ?? []).some((c) => c.name === "commit"), null, { timeout: 15_000 });
      await page.waitForFunction(() => document.querySelector('[data-lab-flow="arrived"]') !== null, null, { timeout: 15_000 });
      const out = await page.evaluate(() => ({
        result: (window.__onbLab as unknown as { result: { agents: { name: string; agency?: string }[]; queries: unknown[] } }).result,
        notice: JSON.parse(localStorage.getItem("sa.importSkipped.onb-lab") ?? "null") as null | { count: number; rows: { who: string; status: string; sentDate: string | null; reason: string }[] },
      }));
      record("G3", `${path} written`, { qn, agents: out.result.agents.length, queries: out.result.queries.length, notice: out.notice });
      if (path === "remove") {
        expect([out.result.agents.length, out.result.queries.length, qn]).toEqual([2, 2, 2]);
        expect(out.notice?.count, "the removed row is in the skipped-rows notice").toBe(1);
        /* RE-POINTED (import review v1, Nick's ruling): the writer removed it, so the reason is theirs */
        expect(out.notice!.rows[0]).toMatchObject({ status: "Queried", sentDate: "2026-02-10", reason: "You chose not to import this" });
        expect(out.result.queries.length + out.notice!.count, "written + listed = the rows in the file").toBe(3);
      } else {
        expect([out.result.agents.length, out.result.queries.length, qn]).toEqual([3, 3, 3]);
        expect(out.result.agents.map((x) => x.agency)).toContain("Fairground Literary");
        expect(out.notice, "nothing was left out").toBeNull();
      }
    });
  }

  test("G4 Skip for now, from the queries step, asks first and writes nothing", async ({ page }) => {
    await page.addInitScript(() => localStorage.removeItem("sa.importSkipped.onb-lab"));
    await lab(page, "s=flow&fx=gate&floor=50", WIDE, { motion: "reduce" });
    if (MUTATE === "G4") await page.evaluate(() => {
      /* the named break: leaving does not ask. The confirm's own button is pressed for the writer. */
      new MutationObserver(() => (document.querySelector('[data-im="ask-skip"]') as HTMLElement | null)?.click()).observe(document.body, { subtree: true, childList: true });
    });
    await primary(page).click();
    await page.locator('[data-im="review"][data-step="agents"]').waitFor();
    await answerAgents(page);
    await primary(page).click();
    await page.locator('[data-im="review"][data-step="queries"]').waitFor();
    for (let i = 0; i < 3; i++) await card(page).locator(".o9-pick, button").first().click();
    const before = await state(page);
    await page.locator(".sf-exit").click();
    await page.waitForTimeout(200);
    const asked = await page.evaluate(() => { const a = document.querySelector('[data-im="ask"]'); return a ? { title: a.querySelector("h2")?.textContent, text: a.querySelector("p")?.textContent, buttons: [...a.querySelectorAll("button")].map((b) => b.textContent) } : null; });
    record("G4", "asked", { before: before.primary, asked });
    expect(asked, "Skip for now asks first").toEqual({ title: "Skip set-up for now?", text: "Nothing from this file has been saved yet. You can import a spreadsheet or add agents by hand any time from the Import page.", buttons: ["Keep setting up", "Skip for now"] });
    await page.locator('[data-im="ask-keep"]').click();
    const kept = await state(page);
    expect([kept.step, kept.primary], "Keep setting up returns to the review, answers intact").toEqual(["queries", before.primary]);
    await page.locator(".sf-exit").click();
    await page.locator('[data-im="ask-skip"]').click();
    await page.waitForTimeout(400);
    const after = await page.evaluate(() => ({ calls: (window.__onbLab?.calls ?? []).map((c) => c.name), notice: localStorage.getItem("sa.importSkipped.onb-lab"), result: (window.__onbLab as unknown as { result?: unknown }).result ?? null }));
    record("G4", "after skip", after);
    expect(after.calls.filter((c) => c === "skip").length, "it leaves, once").toBe(1);
    expect(after.calls.filter((c) => /commit|import/i.test(c)), "nothing from the file is written, answered or not").toEqual([]);
    expect([after.notice, after.result]).toEqual([null, null]);
  });

  test("G the deck at 400 and 1280: no overflow, the arrows give way to the dots", async ({ page }) => {
    await lab(page, "s=review&fx=gate", PHONE, { motion: "reduce" });
    await noOverflow(page, "agents 400");
    expect(await page.locator('[data-im="deck-prev"]').isVisible(), "arrows hide below 820").toBe(false);
    await page.locator('[data-im="deck-dots"] .o9-dot').nth(1).click();
    expect((await state(page)).name, "the dots move the deck").toBe("Tom Rafferty");
    await answerAgents(page);
    await primary(page).click();
    await page.locator('[data-im="review"][data-step="queries"]').waitFor();
    await shot(page, "queries-400", true);
    await noOverflow(page, "queries 400");
    await lab(page, "s=review&fx=gate", { width: 1280, height: 800 }, { motion: "reduce" });
    await noOverflow(page, "agents 1280");
    expect(await page.locator('[data-im="deck-prev"]').isVisible()).toBe(true);
  });
});

/* ════ M1 · motion: at rest under reduced motion, once per arrival, and no overflow ══ */
test.describe("M1", () => {
  type P = import("@playwright/test").Page;
  /** Every set-up and review screen, by lab query, with the steps (if any) that reach it. */
  const SCREENS: Array<{ id: string; q: string; reach?: (page: P) => Promise<void> }> = [
    { id: "welcome", q: "s=welcome&name=Lucy%20Sterling" },
    { id: "ack-starting", q: "s=ack&stage=starting" },
    { id: "ack-early", q: "s=ack&stage=early" },
    { id: "ack-deep", q: "s=ack&stage=deep" },
    { id: "ack-interest", q: "s=ack&stage=interest" },
    { id: "book", q: "s=bookmore&title=The%20October%20Test&name=Lucy%20Sterling" },
    { id: "fork", q: "s=fork" },
    { id: "hand-off", q: "s=confirm" },
    { id: "summary", q: "s=overview&fx=gate&rows=16" },
    { id: "duplicates", q: "s=review&fx=dupes" },
    { id: "duplicates-done", q: "s=review&fx=dupes", reach: async (page) => { await decideDuplicates(page); } },
    { id: "agents", q: "s=review&fx=gate" },
    { id: "queries", q: "s=review&fx=gate", reach: async (page) => { await answerAgents(page); await page.locator('[data-im="primary"]').click(); await page.locator('[data-im="review"][data-step="queries"]').waitFor(); } },
    { id: "queries-done", q: "s=review&fx=gate", reach: async (page) => { await answerAgents(page); await page.locator('[data-im="primary"]').click(); await page.locator('[data-im="review"][data-step="queries"]').waitFor(); await answerQueries(page); } },
  ];
  /** What is moving, and what is being held out of sight, in the sheet right now. */
  const atRest = (page: P) => page.evaluate(() => {
    const sheet = document.querySelector<HTMLElement>('[data-sf="scroll"]') ?? document.querySelector<HTMLElement>(".sf")!;
    /* The shell's own reduced-motion rule gives every transition a 0.01ms duration rather than
       none, so one can be "running" for a frame after a font lands. Anything over a millisecond
       is real movement. */
    const long = (a: Animation) => Number(a.effect?.getTiming().duration ?? 0) > 1;
    const running = document.getAnimations().filter((a) => a.playState === "running" && long(a) && sheet.contains((a.effect as KeyframeEffect | null)?.target ?? null))
      .map((a) => { const t = (a.effect as KeyframeEffect).target as HTMLElement; return `${t.className?.toString?.() || t.tagName}:${(a as CSSAnimation).animationName ?? "transition"}`; });
    const hidden: string[] = [];
    for (const el of sheet.querySelectorAll<HTMLElement>('[class*="o9-"], .sf-stepcard, .im-pop, .im-list, .sf-tile')) {
      const c = getComputedStyle(el);
      if (el.getBoundingClientRect().width === 0 || el.closest("[hidden]")) continue;
      if (Number(c.opacity) < 0.99 || c.visibility === "hidden") hidden.push(`${el.className}:${c.opacity}:${c.visibility}`);
    }
    const draws = [...sheet.querySelectorAll<SVGPathElement>(".o9-gomark path, .o9-ackbox path")].map((p) => getComputedStyle(p).strokeDashoffset);
    return { running, hidden, draws, cards: sheet.querySelectorAll(".sf-stepcard, .im-pop, .im-list, .o9-deck, .sf-tile, .o9-panel").length };
  });

  test("M1 under reduced motion every set-up and review screen is at rest when it arrives", async ({ page }) => {
    const seen: Record<string, unknown> = {};
    for (const sc of SCREENS) {
      await lab(page, sc.q, WIDE, { motion: MUTATE === "M1" ? "no-preference" : "reduce" });
      if (sc.reach) await sc.reach(page);
      const r = await atRest(page);
      if (sc.id === "ack-deep") await shot(page, "ack-deep-1440", true);
      seen[sc.id] = r;
      expect(r.cards, `${sc.id}: the screen has drawn`).toBeGreaterThan(0);
      expect(r.running, `${sc.id}: nothing is animating`).toEqual([]);
      expect(r.hidden, `${sc.id}: no card is held out of sight`).toEqual([]);
      for (const d of r.draws) expect(d, `${sc.id}: a tick is drawn, not waiting`).toBe("0px");
    }
    record("M1", "at rest", seen);
  });

  test("M1 with motion, an entrance plays once: a re-render does not replay it", async ({ page }) => {
    const names = (page: P) => page.evaluate(() => document.getAnimations().filter((a) => a.playState === "running").map((a) => (a as CSSAnimation).animationName ?? "transition"));
    /* the book step: once the title has typed and the card is in, picking a genre re-renders the card */
    await lab(page, "s=bookmore&title=Ash&name=Lucy%20Sterling", WIDE);
    await page.locator('[data-o9="book-card"].is-in').waitFor({ timeout: 15_000 });
    await settled(page, 1600);
    expect(await names(page), "the entrance has finished").toEqual([]);
    await page.locator('[data-o9="genre"] button').first().click();
    await page.locator("#o9-words").fill("85,000");
    const afterBook = await names(page);
    /* the summary: nothing on it re-renders by itself; the deck: answering rises the next card, and the deck does not re-pop */
    await lab(page, "s=review&fx=gate", WIDE);
    await settled(page, 2000);
    expect(await names(page), "the review's entrance has finished").toEqual([]);
    await page.locator('[data-im="deck-card"]').getByRole("button", { name: "Carry on without an agency" }).click();
    const afterAnswer = await names(page);
    record("M1", "re-render", { afterBook, afterAnswer });
    expect(afterBook.filter((n) => n === "o9-pop"), "the book card does not pop again").toEqual([]);
    expect(afterAnswer.filter((n) => n === "o9-pop"), "the deck does not re-pop").toEqual([]);
    expect(afterAnswer.filter((n) => n === "o9-rise").length, "the next card rises in place").toBeGreaterThan(0);
  });

  test("M1 no set-up or review screen scrolls sideways at 1440, 1280 or 400", async ({ page }) => {
    let read = 0;
    for (const vp of [WIDE, { width: 1280, height: 800 }, PHONE]) for (const sc of SCREENS) {
      await lab(page, sc.q, vp, { motion: "reduce" });
      if (sc.reach) await sc.reach(page);
      await noOverflow(page, `${sc.id} @${vp.width}`);
      /* and nothing inside the sheet is wider than the sheet */
      const wide = await page.evaluate(() => {
        const sheet = document.querySelector<HTMLElement>('[data-sf="scroll"]') ?? document.querySelector<HTMLElement>(".sf")!;
        const edge = sheet.getBoundingClientRect().right + 1;
        return [...sheet.querySelectorAll<HTMLElement>(".sf-stepcard, .im-pop, .im-list, .o9-deck, .sf-tile, .o9-panel, .o9-alldone, .o9-bar, .sf-btn")].filter((e) => e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().right > edge).map((e) => `${e.className}:${Math.round(e.getBoundingClientRect().right - edge)}`);
      });
      expect(wide, `${sc.id} @${vp.width}: nothing runs past the sheet`).toEqual([]);
      read++;
    }
    expect(read).toBe(SCREENS.length * 3);
  });
});

/* ════ R1 · what this pack must not touch ════════════════════════════════════════════ */
test.describe("R1", () => {
  test("R1 the two loaders and the Import page's tiles are the base's", async ({ page }) => {
    const { execFileSync } = await import("node:child_process");
    const BASE = "4a8e41b5";
    /* the files that draw them are byte-identical to the base */
    const FILES = [
      "src/components/onboarding/ScatterSettleLoader.tsx", "src/components/onboarding/ImportingLoader.tsx", "src/components/onboarding/DashGhost.tsx",
      "src/components/onboarding/HandoffNav.tsx", "src/components/onboarding/SheenWave.tsx", "src/components/import/ImportPage.tsx", "src/components/import/importPage.css",
    ];
    const changed = execFileSync("git", ["diff", "--name-only", BASE, "--", ...FILES], { encoding: "utf8" }).trim().split("\n").filter(Boolean);
    record("R1", "files changed since the base", changed);
    expect(changed, "none of the loaders' or the tiles' files has changed").toEqual([]);
    /* and they render: the reading loader, the importing loader, the three tiles */
    await lab(page, "s=reading&hold=done", WIDE, { motion: "reduce" });
    const reading = await page.evaluate(() => ({ stage: document.querySelectorAll(".im-ssl-stage").length, bar: document.querySelector(".im-ssl-txt")?.textContent ?? "" }));
    await lab(page, "s=importing&done=1", WIDE, { motion: "reduce" });
    const importing = await page.evaluate(() => ({ card: document.querySelectorAll(".im-ldrcard").length, ghost: document.querySelectorAll('[data-im="ghost"], .os-root').length }));
    /* the Import page is not inside the set-up frame, so it is opened directly */
    await page.goto("/#/onb-lab?s=import-page", { waitUntil: "load" });
    await page.reload({ waitUntil: "load" });
    await page.locator('[data-impg="tile"]').first().waitFor({ state: "visible", timeout: 20_000 });
    const tiles = await page.evaluate(() => [...document.querySelectorAll('[data-impg="tile"]')].filter((e) => (e as HTMLElement).offsetParent !== null).map((t) => t.querySelector("h2, h3")?.textContent ?? ""));
    record("R1", "rendered", { reading, importing, tiles });
    expect(reading.stage).toBe(1);
    expect(importing.card).toBe(1);
    expect(tiles.length, "three tiles").toBe(3);
  });
});
