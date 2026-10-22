/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * MSV281 — Manuscripts v28.1's locks, rendered, at 1512 × 900 and 1280 × 800 on the ms21-filled account:
 * A1 the header's labels, A2 the logline strip has no link and the full width, A3 the closing quote mark.
 * A3 writes the book's logline (long, short, empty) and puts it back through tests/e2e/ms28Fixture.mjs.
 * MSV281_ONLY=<id> runs one lock.
 */
import { test, expect, type Page, type Browser } from "@playwright/test";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { FILLED_EMAIL, MS_ID } from "./ms21Fixture.mjs";
import { assertLocalBundleIsDev } from "./bundleGuard";

test.setTimeout(300_000);
const ONLY = process.env.MSV281_ONLY ?? "";
const run = (id: string) => !ONLY || id.startsWith(ONLY);
const pw = () => { for (const l of readFileSync(".env.local", "utf8").split("\n")) { const m = /^\s*SA_E2E_PASSWORD\s*=\s*(.*)$/.exec(l); if (m) return m[1].trim().replace(/^["']|["']$/g, ""); } throw new Error("no pw"); };
const fx = (...a: string[]) => execFileSync("node", ["tests/e2e/ms28Fixture.mjs", ...a], { encoding: "utf8" }).trim();
const SNAP = resolve(process.cwd(), "reports/manuscripts-v28-1/.fixture-snap.json");

async function ctxFor(browser: Browser, baseURL: string, vp: { width: number; height: number }) {
  const port = new URL(baseURL).port || "443";
  const file = resolve(process.cwd(), `tests/e2e/.auth/${FILLED_EMAIL.split("@")[0]}-${port}.json`);
  if (!existsSync(file)) {
    const c = await browser.newContext({ baseURL, viewport: vp });
    const p = await c.newPage();
    await p.goto("/#/signin");
    await p.locator("#au-email").fill(FILLED_EMAIL);
    await p.locator("#au-pw").fill(pw());
    await p.getByRole("button", { name: /^Sign in$/ }).last().click();
    await expect(p.locator(".ws-work").first()).toBeVisible({ timeout: 30_000 });
    await c.storageState({ path: file, indexedDB: true });
    await c.close();
  }
  return browser.newContext({ storageState: file, viewport: vp, baseURL });
}
async function openPage(page: Page) {
  await page.goto("/manuscripts");
  await page.evaluate((id) => { localStorage.setItem("scriptally_active_manuscript_id", id); sessionStorage.setItem("sa.guide.autoOpened", "1"); }, MS_ID);
  await page.goto("/manuscripts");
  await page.waitForSelector('[data-ms27="book"]');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);
}
async function openBook(page: Page) {
  await page.locator('[data-ms27="full"]').click();
  await page.waitForSelector('[data-ms27bx="root"]');
  await page.waitForTimeout(1000);
}
async function closeBook(page: Page) {
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => !document.querySelector(".ms27-bx"));
}

/* the quote's reading on one line element: the text, the mark, the last word's line, the opening mark's colour, and a
   sweep of widths in which the mark must never leave the last word's line */
const quoteProbe = (sel: string) => {
  const p = [...document.querySelectorAll<HTMLElement>(sel)].find((e) => e.getBoundingClientRect().height > 0);
  if (!p) return { found: false } as const;
  const cq = p.querySelector<HTMLElement>('[data-ms28="close-quote"]');
  const q = p.querySelector<HTMLElement>('[data-ms28="qend"]');
  const text = (p.textContent ?? "").trim();
  const textRects = (): DOMRect[] => {
    const out: DOMRect[] = [];
    const w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      if (cq && cq.contains(n)) continue;
      const r = document.createRange(); r.selectNodeContents(n);
      out.push(...[...r.getClientRects()].filter((x) => x.width > 0));
    }
    return out;
  };
  const lineTops = () => [...new Set(textRects().map((r) => Math.round(r.top)))].sort((a, b) => a - b);
  const lastTop = () => { const t = lineTops(); return t[t.length - 1]; };
  /* the mark's own glyph box: a Range over its text, not the inline box (whose line-height is 0) */
  const markTop = () => { if (!cq) return null; const r = document.createRange(); r.selectNodeContents(cq); return r.getBoundingClientRect().top; };
  /* the OPENING mark is a ::before, which no Range can measure: a clone of the closing mark placed first on line 1 sits
     beside it in the same font, size and drop, so its glyph top is the opening mark's */
  const openGap = (() => {
    if (!cq) return null;
    const c = cq.cloneNode(true) as HTMLElement; c.removeAttribute("data-ms28"); c.style.marginLeft = "0";
    p.insertBefore(c, p.firstChild);
    const r = document.createRange(); r.selectNodeContents(c); const top = r.getBoundingClientRect().top;
    const first = lineTops()[0];
    c.remove();
    return first - top;
  })();
  const reading = {
    found: true, text, endsWithClose: text.endsWith("”"), lines: lineTops().length,
    markColour: cq ? getComputedStyle(cq).color : null, openColour: getComputedStyle(p, "::before").color,
    openContent: getComputedStyle(p, "::before").content,
    markFont: cq ? getComputedStyle(cq).fontSize + " " + getComputedStyle(cq).fontFamily.split(",")[0] : null,
    openFont: getComputedStyle(p, "::before").fontSize + " " + getComputedStyle(p, "::before").fontFamily.split(",")[0],
    gap: cq ? lastTop() - (markTop() ?? 0) : null, openGap, nowrap: q ? getComputedStyle(q).whiteSpace : null,
    sweepWorst: 0, sweepWidths: 0,
  };
  if (cq) {
    /* narrow the line px by px: the mark must stay on the last word's line at every width */
    const keep = [p.style.width, p.style.flex, p.style.maxWidth];
    const full = p.getBoundingClientRect().width;
    let worst = 0, n = 0;
    for (let w = Math.round(full); w >= Math.max(180, full * 0.45); w -= 1) {
      p.style.flex = "none"; p.style.maxWidth = "none"; p.style.width = `${w}px`;
      worst = Math.max(worst, Math.abs(lastTop() - (markTop() ?? 0) - reading.gap!)); n++;
    }
    [p.style.width, p.style.flex, p.style.maxWidth] = keep;
    reading.sweepWorst = worst; reading.sweepWidths = n;
  }
  return reading;
};

const VPS = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }];
const LONG = "A ferry skipper has one Saturday to find his missing brother before the tide turns, and the men who took him, three brothers of their own with a boat and a grudge, carry the evidence out past the harbour wall and into the open sea, where nobody will ever think to look for it.";
const SHORT = "A skipper races the tide.";

for (const vp of VPS) {
  test.describe(`MSV281 @ ${vp.width}`, () => {
    test("A1 — the header reads Edit and View summary; each opens its own place; no old label anywhere", async ({ browser, baseURL }) => {
      test.skip(!run("A1"));
      await assertLocalBundleIsDev();
      const ctx = await ctxFor(browser, baseURL!, vp);
      const page = await ctx.newPage();
      await openPage(page);
      const labels = await page.locator('[data-ms27="acts"] button').allInnerTexts();
      const names = await page.locator('[data-ms27="acts"] button').evaluateAll((b) => b.map((e) => e.getAttribute("aria-label")));
      const pageText = await page.locator('[data-ms27="page"]').innerText();
      /* the labels first, so a wrong label is a named red rather than a click that waits out the test */
      console.log(`A1 ${vp.width} labels`, JSON.stringify({ labels, names }));
      expect(labels).toEqual(["Edit", "View summary"]);
      expect(names).toEqual(["Edit the book's details", "View the book's summary"]);
      await page.locator('[data-ms27="acts"] button', { hasText: /^View summary$/ }).click();
      await page.waitForSelector('[data-ms27bx="root"]');
      await page.waitForTimeout(1000);
      const bookText = await page.locator('[data-ms27bx="root"]').innerText();
      const bookEdit = (await page.locator('[data-ms27bx="edit"]').innerText()).trim();
      await closeBook(page);
      await page.locator('[data-ms27="acts"] button', { hasText: /^Edit$/ }).click();
      await page.waitForSelector('[data-hdr="ms-edit"].is-in [data-ms21="edit-dialog"]', { timeout: 10_000 });
      /* ⚠️ read it once it has stopped moving: mid-slide the right edge read −656, and "≤ 12" passed on it */
      await page.waitForFunction(() => { const d = document.querySelector<HTMLElement>('[data-hdr="ms-edit"]'); return !!d && d.getAnimations({ subtree: false }).every((a) => a.playState !== "running") && d.getBoundingClientRect().right <= innerWidth; }, null, { timeout: 5_000 });
      await page.waitForTimeout(300);
      const drawer = await page.evaluate(() => { const d = document.querySelector<HTMLElement>('[data-hdr="ms-edit"]')!; const b = d.getBoundingClientRect(); return { pos: getComputedStyle(d).position, right: innerWidth - b.right, left: b.left, vw: innerWidth }; });
      await page.locator('[data-ms21="cancel"]').click();
      console.log(`A1 ${vp.width}`, JSON.stringify({ bookEdit, drawer }));
      expect(bookEdit).toBe("Edit");
      expect(drawer.pos).toBe("fixed");
      expect(drawer.right, "the drawer's right edge is on screen, at the viewport's right").toBeGreaterThanOrEqual(0);
      expect(drawer.right).toBeLessThanOrEqual(12);
      expect(drawer.left).toBeGreaterThan(drawer.vw * 0.4);
      for (const [n, t] of [["page", pageText], ["book view", bookText]] as const) {
        expect(t.length, `${n} has text`).toBeGreaterThan(40);
        expect(t.replace(/Save details/g, ""), n).not.toMatch(/Edit details|Full details|Read it all/i);
      }
      await ctx.close();
    });

    test("A2 — the logline strip holds no link or button, and its line spans the strip", async ({ browser, baseURL }) => {
      test.skip(!run("A2"));
      await assertLocalBundleIsDev();
      const ctx = await ctxFor(browser, baseURL!, vp);
      const page = await ctx.newPage();
      await openPage(page);
      const r = await page.evaluate(() => {
        const s = [...document.querySelectorAll<HTMLElement>('[data-ms27="logline"]')].find((e) => e.getBoundingClientRect().height > 0)!;
        const p = s.querySelector<HTMLElement>(".ms27-lg")!;
        const sb = s.getBoundingClientRect(); const cs = getComputedStyle(s);
        const inner = sb.right - parseFloat(cs.borderRightWidth) - parseFloat(cs.paddingRight);
        return { controls: s.querySelectorAll("a, button, [role=button]").length, empty: p.classList.contains("is-empty"), pRight: p.getBoundingClientRect().right, inner };
      });
      console.log(`A2 ${vp.width}`, JSON.stringify(r));
      expect(r.empty, "the fixture has a logline").toBe(false);
      expect(r.controls, "no link or button in the strip").toBe(0);
      expect(Math.abs(r.inner - r.pRight), `line right ${r.pRight} vs strip inner right ${r.inner}`).toBeLessThanOrEqual(2);
      await ctx.close();
    });

    test("A3 — a rust closing quote on the last line, long and short, page and book view; none when empty", async ({ browser, baseURL }) => {
      test.skip(!run("A3"));
      await assertLocalBundleIsDev();
      writeFileSync(SNAP, fx("--get"));
      const ctx = await ctxFor(browser, baseURL!, vp);
      const page = await ctx.newPage();
      const seen: Record<string, unknown> = {};
      try {
        for (const [name, text] of [["long", LONG], ["short", SHORT]] as const) {
          fx("--logline", text);
          await openPage(page);
          await expect(page.locator('[data-ms27="logline"] .ms27-lg').first()).toContainText(text.slice(-12), { timeout: 15_000 });
          const strip = await page.evaluate(quoteProbe, '[data-ms27="logline"] .ms27-lg');
          await openBook(page);
          const book = await page.evaluate(quoteProbe, ".ms27-bx-lg");
          await closeBook(page);
          seen[name] = { strip, book };
          for (const [where, r] of [["strip", strip], ["book", book]] as const) {
            const m = `${name} ${where}`;
            expect(r.found, `${m}: the line is drawn`).toBe(true);
            if (!r.found) continue;
            expect(r.endsWithClose, `${m}: ends with ”`).toBe(true);
            expect(r.openContent, `${m}: the opening mark`).toContain("“");
            expect(r.markColour, `${m}: the closing mark is the opening mark's colour`).toBe(r.openColour);
            expect(r.markFont, `${m}: and its font`).toBe(r.openFont);
            /* the brief's "within 4px of the last line's top", read against the opening mark: both 40px glyphs sit the
               same 4.75px below their 17px line's top, so the claim is that the closing mark sits on the last line
               exactly as the opening mark sits on the first */
            expect(Math.abs(r.gap! - r.openGap!), `${m}: the closing mark sits on the last line as the opening mark on the first (${r.gap} vs ${r.openGap})`).toBeLessThanOrEqual(1);
            expect(Math.abs(r.gap!), `${m}: and it is on the last line, not below it (${r.gap})`).toBeLessThanOrEqual(8);
            expect(r.sweepWidths, `${m}: the sweep ran`).toBeGreaterThan(50);
            expect(r.sweepWorst, `${m}: at every width the mark stays on the last word's line`).toBeLessThanOrEqual(4);
          }
          if (name === "long") expect((strip as { lines: number }).lines, "the long logline wraps to 3 lines in the strip").toBe(3);
          if (name === "short") expect((strip as { lines: number }).lines).toBe(1);
        }
        fx("--logline", "");
        await openPage(page);
        await expect(page.locator('[data-ms27="add-logline"]')).toBeVisible({ timeout: 15_000 });
        const empty = await page.evaluate(() => ({ marks: document.querySelectorAll('[data-ms27="logline"] [data-ms28="close-quote"]').length, add: !!document.querySelector('[data-ms27="add-logline"]') }));
        await openBook(page);
        const emptyBook = await page.evaluate(() => document.querySelectorAll('[data-ms27bx="root"] [data-ms28="close-quote"]').length);
        await closeBook(page);
        seen.empty = { ...empty, emptyBook };
        expect(empty.add, "empty: Add one stays").toBe(true);
        expect(empty.marks, "empty: no closing mark in the strip").toBe(0);
        expect(emptyBook, "empty: no closing mark in the book view").toBe(0);
      } finally {
        console.log(`A3 ${vp.width}`, JSON.stringify(seen));
        await ctx.close();
        fx("--restore", SNAP);
      }
    });
  });
}
