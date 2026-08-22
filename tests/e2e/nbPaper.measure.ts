/**
 * NOTEBOARD PAPER RUN — flat paper, example papers, reorder, links.
 *
 *   SA_E2E_BASE_URL=dev …                 (red, against HEAD)
 *   SA_E2E_BASE_URL=http://localhost:4193 (green, against the fix)
 *
 * Needs the seeded probe notes for most cases: node tests/e2e/seedNotes.mjs
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

const ROUTE = "/todo/noteboard";
const WIDE = { width: 1440, height: 900 };

/** Every element whose gradient actually PAINTS — declared gradient × effective opacity.
 * ⚠️ THE OPACITY WALK IS LOAD-BEARING. `getComputedStyle().backgroundImage` reports the DECLARED
 * gradient whether or not it draws, and the shell's `.sv2-fade` sits at opacity 0 on every page
 * whose stage does not scroll — correctly gated, invisible, and still "a gradient element". The
 * first draft of this probe counted it and reported a phantom second fade; painted values only. */
const gradientBoxes = (page: import("@playwright/test").Page) =>
  page.evaluate(() => {
    const out: Array<{ cls: string; x: number; y: number; w: number; h: number }> = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>("*"))) {
      const cs = getComputedStyle(el);
      if (!cs.backgroundImage.includes("gradient")) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      let eff = 1;
      let n: HTMLElement | null = el;
      while (n && eff > 0.05) { eff *= parseFloat(getComputedStyle(n).opacity || "1"); n = n.parentElement; }
      if (eff <= 0.05 || cs.visibility === "hidden") continue;
      out.push({ cls: String(el.className).slice(0, 40), x: r.x, y: r.y, w: r.width, h: r.height });
    }
    return out;
  });

test.describe("Phase 1 — flat paper", () => {
  test("⚠️ no gradient-painting element intersects any note or the composer at rest", async ({ page }) => {
    /* ⚠️ THE ASSERTION THAT FAILS TODAY THE WAY THE SCREENSHOT FAILS. The cards and the composer
       are ALREADY flat (measured: background-image none on self and both pseudos) — the fade in
       the screenshot is the zone's scroll hem, a sticky gradient overlay painting OVER them while
       the zone overflows by two pixels. Element-level flatness cannot catch an overlay; only the
       intersection can. */
    /* ⚠️ THE PRECONDITION IS THE POINT: "no gradient over the cards" is a claim about a board
       that does NOT scroll. When it genuinely overflows, the hem IS the affordance and covering
       the bottom card is its whole job. This case ran green at 900 tall against 11 seeded notes
       and then failed the moment Phase 2's example papers ADDED height — 58px of real overflow,
       a correct hem, and a probe reporting it as the bug it was written to catch. So the
       viewport grows until the board fits, and the state is asserted before the claim. */
    await openRoute(page, ROUTE, { width: 1440, height: 1400 });
    const fits = await page.evaluate(() => {
      const zone = document.querySelector(".nb-board")?.closest(".tpl-zone") as HTMLElement | null;
      return zone ? zone.scrollHeight - zone.clientHeight : null;
    });
    expect(fits, "no zone").not.toBeNull();
    console.log(`[flat] zone overflow at 1400 tall: ${fits}px`);
    expect(fits!, "the board still scrolls at 1400 tall — the hem is legitimate here").toBeLessThan(24);
    const grads = await gradientBoxes(page);
    const cards = await page.$$eval(".nb-note, .nb-ghost", (els) =>
      els.map((e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }));
    /* ⚠️ THE FLOOR IS 1, NOT A SEEDED FIGURE. This case ran green for a phase against 11 seeded
       notes and then failed the moment Phase 2's cases cleared the board — a probe that needs
       someone else's fixture is measuring their setup, not the page. One card is the real
       precondition: an intersection needs something to intersect. */
    expect(cards.length, "no cards to test against").toBeGreaterThan(0);
    const hits: string[] = [];
    for (const g of grads) for (const c of cards) {
      const ox = Math.min(g.x + g.w, c.x + c.w) - Math.max(g.x, c.x);
      const oy = Math.min(g.y + g.h, c.y + c.h) - Math.max(g.y, c.y);
      if (ox > 4 && oy > 4) hits.push(`${g.cls} ∩ card at ${Math.round(c.x)},${Math.round(c.y)}`);
    }
    console.log(`[flat] ${grads.length} gradient elements on the page · ${hits.length} intersect cards`);
    for (const h of hits.slice(0, 4)) console.log(`   ${h}`);
    expect(hits, "a gradient overlay paints over the cards at rest").toEqual([]);

    /* …and the composer, open */
    await page.locator(".nb-ghost").click();
    await page.waitForTimeout(300);
    const comp = await page.locator(".nb-compose").boundingBox();
    expect(comp, "no composer").toBeTruthy();
    const grads2 = await gradientBoxes(page);
    const compHits = grads2.filter((g) =>
      Math.min(g.x + g.w, comp!.x + comp!.width) - Math.max(g.x, comp!.x) > 4 &&
      Math.min(g.y + g.h, comp!.y + comp!.height) - Math.max(g.y, comp!.y) > 4);
    console.log(`[flat] composer: ${compHits.length} gradient intersections`);
    expect(compHits.map((g) => g.cls), "a gradient overlay paints over the open composer").toEqual([]);
    await page.locator(".nb-ccancel").click();
  });

  test("the surfaces themselves stay flat — the lock the false premise still deserves", async ({ page }) => {
    /* ⚠️ NEVER-RED, AND RECORDED AS SUCH: the card and the composer were measured flat before
       this run wrote a line (the premise said otherwise). This pins what is true so it cannot
       quietly stop being — the paper-run's own regression fence, not evidence of a fix. */
    await openRoute(page, ROUTE, WIDE);
    const flat = await page.evaluate(() => {
      const read = (el: Element) => {
        const out: string[] = [];
        for (const p of [undefined, "::before", "::after"] as const) {
          const cs = getComputedStyle(el, p);
          if (cs.backgroundImage !== "none") out.push(`${p ?? "self"}:${cs.backgroundImage.slice(0, 40)}`);
        }
        return out;
      };
      const card = document.querySelector(".nb-note");
      return card ? read(card) : null;
    });
    expect(flat, "no card").toBeTruthy();
    expect(flat!).toEqual([]);
  });

  test("⚠️ the hem is an AFFORDANCE again: absent at 2px of overflow, present when the board truly scrolls", async ({ page }) => {
    /* the zone barely overflows at 900 tall with the seeded board — no hem; at 520 it genuinely
       scrolls — hem. The gate is measured overflow, not existence. */
    await openRoute(page, ROUTE, { width: 1440, height: 1400 });
    const rest = await page.evaluate(() => {
      const zone = document.querySelector(".nb-board")?.closest(".tpl-zone") as HTMLElement | null;
      if (!zone) return null;
      return { over: zone.scrollHeight - zone.clientHeight, hem: !!zone.querySelector(".tpl-hem") };
    });
    expect(rest, "no zone").toBeTruthy();
    console.log(`[hem] at 1400 tall: overflow ${rest!.over}px · hem ${rest!.hem}`);
    /* the precondition — a board that fits; the claim below is only meaningful against it */
    expect(rest!.over, "the board scrolls even at 1400 tall — pick a taller viewport").toBeLessThan(24);
    expect(rest!.hem, "the hem renders over a board that does not scroll").toBe(false);

    await page.setViewportSize({ width: 1440, height: 520 });
    await page.waitForTimeout(600);
    const short = await page.evaluate(() => {
      const zone = document.querySelector(".nb-board")?.closest(".tpl-zone") as HTMLElement | null;
      if (!zone) return null;
      return { over: zone.scrollHeight - zone.clientHeight, hem: !!zone.querySelector(".tpl-hem") };
    });
    console.log(`[hem] at 520 tall: overflow ${short!.over}px · hem ${short!.hem}`);
    expect(short!.over).toBeGreaterThan(24);   // the precondition, or the next line is vacuous
    expect(short!.hem, "the affordance was deleted rather than gated").toBe(true);
  });
});

test.describe("Phase 2 — example papers", () => {
  /* ⚠️ THESE RUN ON A NEARLY-EMPTY BOARD, so they clear the seeded fixtures first and restore
     nothing — the seeder is the caller's job. Dismissals are persisted per user, so each case
     un-dismisses through the app's own surface where it can, and the report names what it left. */
  test("keep this → a real note appears, the example goes, and the dismissal SURVIVES RELOAD", async ({ page }) => {
    await openRoute(page, ROUTE, WIDE);
    const board = page.locator(".nb-board");
    await expect(board).toBeVisible();                       // the anchor, before any indexing

    const examples = await page.$$eval("[data-example]", (els) => els.map((e) => e.getAttribute("data-example")));
    console.log(`[ex] examples on the sparse board: ${examples.join(",") || "none"}`);
    if (examples.length === 0) {
      /* the board is not sparse — say so rather than passing vacuously */
      const real = await page.locator(".nb-note:not(.nb-example)").count();
      expect(real, "no examples AND fewer than 3 real notes — the sparse state is broken").toBeGreaterThanOrEqual(3);
      test.skip(true, `board holds ${real} real notes; sparse state not exercisable without clearing them`);
      return;
    }

    const target = examples[0]!;
    const before = await page.$$eval(".nb-note", (els) => els.length);
    await page.locator(`[data-example="${target}"] .nb-keep`).click();
    await page.waitForTimeout(1200);

    /* the whole ordered board: a real note gained, that example gone */
    const after = await page.evaluate(() => Array.from(document.querySelectorAll<HTMLElement>(".nb-note"))
      .map((e) => (e.hasAttribute("data-example") ? `ex:${e.getAttribute("data-example")}` : "real")));
    console.log(`[ex] after keep: ${after.join(" ")}`);
    expect(after.filter((k) => k === "real").length, "no real note was created").toBeGreaterThan(before - examples.length);
    expect(after).not.toContain(`ex:${target}`);

    /* ⚠️ THE RELOAD LEG IS WHAT PROVES THE STORE — state alone would pass without it */
    await page.reload();
    await page.waitForTimeout(2500);
    const reloaded = await page.$$eval("[data-example]", (els) => els.map((e) => e.getAttribute("data-example")));
    console.log(`[ex] after reload: ${reloaded.join(",") || "none"}`);
    expect(reloaded, "the dismissal did not survive reload — the write never reached the store").not.toContain(target);
  });

  test("⚠️ the hint sits BELOW every real note and ABOVE every example — on screen, not just in the DOM", async ({ page }) => {
    /* ⚠️ THE GEOMETRIC HALF. DOM order already read ghost·notes·hint·examples and the screenshot
       still showed the hint orphaned at the foot of column one with the examples it introduces
       beside it — multicol flows by length, so "above the first" was true in the markup and false
       on the page. This asserts the arrangement the reader actually gets. */
    await openRoute(page, ROUTE, { width: 1440, height: 1400 });
    await expect(page.locator(".nb-board")).toBeVisible();
    const d = await page.evaluate(() => {
      const hint = document.querySelector<HTMLElement>(".nb-exhint");
      if (!hint) return null;
      const box = (e: Element) => e.getBoundingClientRect();
      const h = box(hint);
      const reals = Array.from(document.querySelectorAll<HTMLElement>(".nb-note:not(.nb-example)")).map(box);
      const exs = Array.from(document.querySelectorAll<HTMLElement>("[data-example]")).map(box);
      return {
        reals: reals.length, exs: exs.length,
        realsAbove: reals.every((r) => r.bottom <= h.top + 1),
        exsBelow: exs.every((e) => e.top >= h.bottom - 1),
      };
    });
    if (!d) { test.skip(true, "board is not sparse — no hint to place"); return; }
    console.log(`[hint] ${d.reals} real notes above=${d.realsAbove} · ${d.exs} examples below=${d.exsBelow}`);
    expect(d.exs, "no examples to place").toBeGreaterThan(0);
    expect(d.realsAbove, "a real note sits below the hint").toBe(true);
    expect(d.exsBelow, "an example sits above the hint").toBe(true);
  });

  test("under a search, ZERO examples — they are not the user's data and never appear in results", async ({ page }) => {
    await openRoute(page, ROUTE, WIDE);
    await expect(page.locator(".nb-board")).toBeVisible();
    await page.locator(".nb-search input").fill("zzzz-no-match");
    await page.waitForTimeout(400);
    expect(await page.locator("[data-example]").count()).toBe(0);
    await page.locator(".nb-search input").fill("");
  });
});

test.describe("Phase 3 — drag to reorder", () => {
  test("the third onto the first, then RELOAD — the order was written, not just mutated", async ({ page }) => {
    await openRoute(page, ROUTE, { width: 1440, height: 1400 });
    await expect(page.locator(".nb-board")).toBeVisible();
    const bodies = () => page.$$eval(".nb-note:not(.nb-example) .nb-body",
      (els) => els.map((e) => (e as HTMLElement).innerText.split("\n")[0]));
    const before = await bodies();
    expect(before.length, "need four notes to move through the middle").toBeGreaterThanOrEqual(4);
    console.log(`[drag] before: ${before.slice(0, 5).join(" | ")}`);

    /* ⚠️ A REAL HTML5 DRAG, dispatched through the DOM. Playwright's dragTo drives POINTER
       events; native drag-and-drop is a separate event stream (dragstart/dragover/drop) that
       pointer moves do not produce, so a pointer drag would land on a page that never heard of
       it and the probe would report a passing no-op. */
    const started = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll<HTMLElement>(".nb-note:not(.nb-example)"));
      const from = cards[2];
      if (!from) return null;
      const dt = new DataTransfer();
      (window as unknown as { __dt: DataTransfer }).__dt = dt;
      from.dispatchEvent(new DragEvent("dragstart", { bubbles: true, dataTransfer: dt }));
      return true;
    });
    expect(started, "no cards to drag").toBeTruthy();
    /* a beat between pick-up and drop — a real drag has one, and the page needs it to re-render
       the dashed target. (The move itself no longer depends on this: the note in hand is a ref.) */
    await page.waitForTimeout(120);
    const moved = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll<HTMLElement>(".nb-note:not(.nb-example)"));
      const from = cards[2], to = cards[0];
      if (!from || !to) return null;
      const dt = (window as unknown as { __dt: DataTransfer }).__dt;
      to.dispatchEvent(new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer: dt }));
      to.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: dt }));
      from.dispatchEvent(new DragEvent("dragend", { bubbles: true, dataTransfer: dt }));
      return true;
    });
    expect(moved, "the drop had no target").toBeTruthy();
    await page.waitForTimeout(1200);

    const expected = (() => { const n = [...before]; const [m] = n.splice(2, 1); n.splice(0, 0, m); return n; })();
    const after = await bodies();
    console.log(`[drag] after:  ${after.slice(0, 5).join(" | ")}`);
    /* the WHOLE joined sequence, one comparison */
    expect(after.join(" | ")).toBe(expected.join(" | "));

    /* ⚠️ THE RELOAD IS THE PHASE. State alone passes the line above. */
    await page.reload();
    await page.waitForTimeout(2500);
    const reloaded = await bodies();
    console.log(`[drag] reload: ${reloaded.slice(0, 5).join(" | ")}`);
    expect(reloaded.join(" | "), "the order did not survive reload — nothing was written").toBe(expected.join(" | "));
  });
});

test.describe("Phase 4 — link-aware bodies", () => {
  test("one anchor, zero img elements, and the markup readable as text — on the real page", async ({ page }) => {
    await openRoute(page, ROUTE, { width: 1440, height: 1400 });
    const card = page.locator(".nb-note").filter({ hasText: "NBLINK" }).first();
    await expect(card, "the link fixture is not on the board — re-seed").toBeVisible();

    const d = await card.evaluate((el) => ({
      anchors: Array.from(el.querySelectorAll("a")).map((a) => ({
        href: a.getAttribute("href"), target: a.getAttribute("target"), rel: a.getAttribute("rel"),
        text: a.textContent, colour: getComputedStyle(a).color,
      })),
      imgs: el.querySelectorAll("img").length,
      scripts: el.querySelectorAll("script").length,
      text: (el.querySelector(".nb-body") as HTMLElement).innerText,
    }));
    console.log(`[link] anchors=${d.anchors.length} imgs=${d.imgs} colour=${d.anchors[0]?.colour}`);

    expect(d.anchors, "no anchor rendered").toHaveLength(1);
    expect(d.anchors[0].href).toBe("https://bestsellerexperiment.com/ep432");
    expect(d.anchors[0].target).toBe("_blank");
    expect(d.anchors[0].rel).toContain("noopener");
    /* ⚠️ A PAINTED VALUE, not a class — burgundy #7c3a2a */
    expect(d.anchors[0].colour).toBe("rgb(124, 58, 42)");

    /* the injection legs, on the rendered page */
    expect(d.imgs, "an img element was created from note text").toBe(0);
    expect(d.scripts).toBe(0);
    expect(d.text, "the writer cannot read back what they typed").toContain("<img src=x onerror=alert(1)>");
  });
});
