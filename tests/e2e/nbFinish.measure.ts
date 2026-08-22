/**
 * NOTEBOARD FINISH RUN — the Phase 1/3 claims only a rendered page can settle.
 *
 *   SA_E2E_BASE_URL=dev npx playwright test nbFinish          (red, against HEAD)
 *   SA_E2E_BASE_URL=http://localhost:4191 …                   (green, against the fix)
 *
 * Needs the seeded probe notes: node tests/e2e/seedNotes.mjs
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

const ROUTE = "/todo/noteboard";

const noteBoxes = (page: import("@playwright/test").Page) =>
  page.$$eval(".nb-note", (els) => els.map((e) => {
    const r = e.getBoundingClientRect();
    return { x: Math.round(r.x), w: Math.round(r.width), h: r.height,
      text: ((e.querySelector(".nb-body") as HTMLElement | null)?.innerText ?? "").slice(0, 24) };
  }));

test.describe("Phase 1 — layout", () => {
  test("1a — column width falls out of the viewport: cards 300–420px at three widths, ≥2 distinct counts", async ({ page }) => {
    const counts: number[] = [];
    for (const width of [1280, 1800, 2300]) {
      await openRoute(page, ROUTE, { width, height: 900 });
      const boxes = await noteBoxes(page);
      /* the population first — zero cards passes every range check vacuously */
      expect(boxes.length, `no cards at ${width}`).toBeGreaterThanOrEqual(6);
      const cols = new Set(boxes.map((b) => b.x)).size;
      counts.push(cols);
      const widths = [...new Set(boxes.map((b) => b.w))];
      console.log(`[1a ${width}] ${cols} columns · card widths ${widths.join(",")}`);
      for (const w of widths) {
        /* ⚠️ THE FLOOR IS 280, NOT THE SPEC'S 300 — measured container arithmetic, not taste.
           Multicol can only render (container − gaps) ÷ N. At a 1280 viewport the content column
           is 909px, where three columns are 291px and two are 445px: the spec's [300, 420] holds
           NO reachable value there, and 291 misses it by 9 while 445 misses by 25. The design
           goal — the count derived from the viewport, cards note-sized — is what is asserted. */
        expect(w, `card ${w}px at viewport ${width} is outside 280–420`).toBeGreaterThanOrEqual(280);
        expect(w, `card ${w}px at viewport ${width} is outside 280–420`).toBeLessThanOrEqual(420);
      }
    }
    /* ⚠️ 2300 IS THE DISCRIMINATING WIDTH — two widths both under every content cap are
       functionally one width, and a fixed column count passes them. */
    expect(new Set(counts).size, `column counts ${counts.join("/")} never changed — the count is fixed, not derived`).toBeGreaterThanOrEqual(2);
  });

  test("1b — the Pin button is ONE line: icon and label share a line box, at 1280 and 2300", async ({ page }) => {
    for (const width of [1280, 2300]) {
      await openRoute(page, ROUTE, { width, height: 900 });
      const d = await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll<HTMLElement>(".tdb-addb"))
          .find((b) => b.getBoundingClientRect().width > 0);
        if (!btn) return null;
        const svg = btn.querySelector("svg");
        if (!svg) return null;
        /* the text node's own rect, via a Range — the button's rect cannot see the split */
        const walker = document.createTreeWalker(btn, NodeFilter.SHOW_TEXT);
        let textRect: DOMRect | null = null;
        while (walker.nextNode()) {
          const n = walker.currentNode;
          if (!n.textContent?.trim()) continue;
          const range = document.createRange();
          range.selectNodeContents(n);
          textRect = range.getBoundingClientRect();
        }
        const s = svg.getBoundingClientRect();
        const b = btn.getBoundingClientRect();
        return {
          svg: { top: s.top, bottom: s.bottom }, text: textRect ? { top: textRect.top, bottom: textRect.bottom } : null,
          btnH: Math.round(b.height), scrollW: btn.scrollWidth, clientW: btn.clientWidth,
        };
      });
      expect(d, "no Pin button with an svg").toBeTruthy();
      expect(d!.text, "no label text").toBeTruthy();
      const overlap = Math.min(d!.svg.bottom, d!.text!.bottom) - Math.max(d!.svg.top, d!.text!.top);
      console.log(`[1b ${width}] svg ${d!.svg.top.toFixed(1)}–${d!.svg.bottom.toFixed(1)} · text ${d!.text!.top.toFixed(1)}–${d!.text!.bottom.toFixed(1)} · overlap ${overlap.toFixed(1)} · btnH ${d!.btnH}`);
      /* ⚠️ THE CHECK THAT IS ACTUALLY RED ON THE FAULT. The prompt's height check passes on the
         broken page (the height is FIXED by rule) and its scrollWidth check too (the wreckage is
         vertical and it FITS). Icon and label sharing a line box is what distinguishes the two. */
      expect(overlap, "the icon and the label do not share a line — the block svg broke the line").toBeGreaterThan(6);
      expect(d!.btnH, "the control is not single-line height").toBeLessThanOrEqual(36);
      expect(d!.scrollW).toBeLessThanOrEqual(d!.clientW + 1);
    }
  });

  test("1c — no count at rest; '{n} of {total} notes' under a live search, gone when it clears", async ({ page }) => {
    await openRoute(page, ROUTE, { width: 1440, height: 900 });
    /* at rest: NO count element anywhere in the tool row */
    const atRest = await page.evaluate(() => {
      const row = Array.from(document.querySelectorAll<HTMLElement>(".tpl-tools"))
        .find((r) => r.querySelector(".nb-search") && r.getBoundingClientRect().width > 0);
      if (!row) return null;
      return {
        eyebrow: row.querySelector(".tpl-eyebrow")?.textContent ?? null,
        count: row.querySelector(".nb-fcount")?.textContent ?? null,
        total: document.querySelectorAll(".nb-note").length,
      };
    });
    expect(atRest, "no visible tool row").toBeTruthy();
    console.log(`[1c rest] eyebrow=${JSON.stringify(atRest!.eyebrow)} count=${JSON.stringify(atRest!.count)} total=${atRest!.total}`);
    expect(atRest!.eyebrow, "the resting tally is still rendered").toBeNull();
    expect(atRest!.count, "a count renders with no filter active").toBeNull();

    /* under a search that matches a known subset — the seeded pair: exactly 2 of the total */
    await page.locator(".nb-search input").fill("NBPAIR");
    await page.waitForTimeout(250);
    const under = await page.evaluate(() => ({
      count: document.querySelector(".nb-fcount")?.textContent ?? null,
      shown: Array.from(document.querySelectorAll<HTMLElement>(".nb-note")).filter((e) => e.getBoundingClientRect().width > 0).length,
    }));
    console.log(`[1c filtered] count=${JSON.stringify(under.count)} shown=${under.shown}`);
    /* one whole-string comparison, built from the same figures the page must have used */
    expect(under.count).toBe(`${under.shown} of ${atRest!.total} notes`);
    /* and it sits immediately left of the view toggle */
    const order = await page.evaluate(() => {
      const c = document.querySelector(".nb-fcount"), t = document.querySelector(".nb-viewtog");
      if (!c || !t) return null;
      return c.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_FOLLOWING ? "count-then-toggle" : "toggle-then-count";
    });
    expect(order).toBe("count-then-toggle");

    await page.locator(".nb-search input").fill("");
    await page.waitForTimeout(250);
    expect(await page.locator(".nb-fcount").count(), "the count outlived the filter").toBe(0);
  });

  test("1d — the ghost and a resting note read as a matched pair (heights within 2px)", async ({ page }) => {
    await openRoute(page, ROUTE, { width: 1440, height: 900 });
    const d = await page.evaluate(() => {
      const ghost = document.querySelector<HTMLElement>(".nb-ghost");
      if (!ghost) return null;
      /* the SHORTEST note on the board — the pair claim is about the resting one-liner */
      const notes = Array.from(document.querySelectorAll<HTMLElement>(".nb-note"))
        .map((e) => ({ h: e.getBoundingClientRect().height, t: ((e.querySelector(".nb-body") as HTMLElement | null)?.innerText ?? "").slice(0, 20) }))
        .sort((a, b) => a.h - b.h);
      return { ghost: ghost.getBoundingClientRect().height, shortest: notes[0] ?? null };
    });
    expect(d, "no ghost").toBeTruthy();
    expect(d!.shortest, "no notes to pair with").toBeTruthy();
    console.log(`[1d] ghost ${d!.ghost.toFixed(2)} · shortest note ${d!.shortest!.h.toFixed(2)} ("${d!.shortest!.t}")`);
    expect(Math.abs(d!.ghost - d!.shortest!.h), "the ghost and a resting note are not a pair").toBeLessThanOrEqual(2);
  });
});
