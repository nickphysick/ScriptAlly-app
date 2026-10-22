/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * MSV28 — the rendered halves of the Manuscripts v28 locks, at 1512 × 900 and 1280 × 800, on the ms21-filled account.
 * Unit halves: src/lib/manuscriptV28.test.ts, src/lib/ageCategories.test.ts, v28/msv28Smoke.test.tsx.
 * MSV28_ONLY=<id prefix> runs one lock.
 */
import { test, expect, type Page, type Browser } from "@playwright/test";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { FILLED_EMAIL, MS_ID } from "./ms21Fixture.mjs";
import { assertLocalBundleIsDev } from "./bundleGuard";

test.setTimeout(240_000);
const ONLY = process.env.MSV28_ONLY ?? "";
const run = (id: string) => !ONLY || id.startsWith(ONLY);
const pw = () => { for (const l of readFileSync(".env.local", "utf8").split("\n")) { const m = /^\s*SA_E2E_PASSWORD\s*=\s*(.*)$/.exec(l); if (m) return m[1].trim().replace(/^["']|["']$/g, ""); } throw new Error("no pw"); };

export async function ctxFor(browser: Browser, baseURL: string, vp: { width: number; height: number }) {
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
export async function openPage(page: Page) {
  await page.goto("/manuscripts");
  await page.evaluate((id) => { localStorage.setItem("scriptally_active_manuscript_id", id); sessionStorage.setItem("sa.guide.autoOpened", "1"); }, MS_ID);
  await page.goto("/manuscripts");
  await page.waitForSelector('[data-ms27="book"]');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);
}


/* the book's stored fields, read through the dev client (tests/e2e/ms28Fixture.mjs) */
const fx = (...a: string[]) => execFileSync("node", ["tests/e2e/ms28Fixture.mjs", ...a], { encoding: "utf8" }).trim();
const stored = (): Record<string, unknown> => JSON.parse(fx("--get"));
const SNAP = resolve(process.cwd(), "reports/manuscripts-v28/.fixture-snap.json");
async function untilStored(pred: (d: Record<string, unknown>) => boolean): Promise<Record<string, unknown>> {
  let d = stored();
  for (let i = 0; i < 10 && !pred(d); i++) { await new Promise((r) => setTimeout(r, 800)); d = stored(); }
  return d;
}
const drawerSel = '[data-hdr="ms-edit"]';
async function openDrawer(page: Page) {
  await page.locator('[data-ms27="edit"]').click();
  await expect(page.locator(`${drawerSel}.is-in`)).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(450);
}
async function cancel(page: Page) {
  await page.locator('[data-ms21="cancel"]').click();
  await expect(page.locator(`${drawerSel}.is-in`)).toHaveCount(0, { timeout: 10_000 });
}
async function save(page: Page) {
  await page.locator('[data-ms21="save"]').click();
  await expect(page.locator(`${drawerSel}.is-in`)).toHaveCount(0, { timeout: 15_000 });
}
async function bookRow(page: Page, key: string) {
  await page.locator('[data-ms27="full"]').click();
  await page.waitForSelector('[data-ms27bx="root"]');
  await page.waitForTimeout(900);
  const v = await page.locator(`[data-ms27bx="root"] [data-row="${key}"]`).innerText().catch(() => "");
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => !document.querySelector(".ms27-bx"));
  return v.replace(/\s+/g, " ").trim();
}

const VPS = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }];

for (const vp of VPS) {
  test.describe(`MSV28 @ ${vp.width}`, () => {
    test("F1 — the page foot reaches the content bottom less 28, two tiles of one height", async ({ browser, baseURL }) => {
      test.skip(!run("F1"));
      await assertLocalBundleIsDev();
      const ctx = await ctxFor(browser, baseURL!, vp);
      const page = await ctx.newPage();
      await openPage(page);
      const r = await page.evaluate(() => {
        const vis = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].find((e) => e.offsetParent !== null) ?? null;
        const sc = vis(".wpg-scroll"); const foot = vis('[data-ms28="foot"], .ms28-foot');
        const tv = vis('[data-ms28="tile-versions"]'); const tp = vis('[data-ms28="tile-packages"]'); const bar = vis('[data-ms28="bar"]');
        if (!sc || !foot || !tv || !tp || !bar) return { missing: true };
        sc.scrollTop = sc.scrollHeight;
        const s = sc.getBoundingClientRect(); const f = foot.getBoundingClientRect();
        return { missing: false, gap: s.bottom - f.bottom, overflow: sc.scrollHeight - sc.clientHeight,
          tv: tv.getBoundingClientRect().height, tp: tp.getBoundingClientRect().height, soon: !!document.querySelector(".ms27-soon"), barTop: bar.getBoundingClientRect().top, tileTop: tv.getBoundingClientRect().top };
      });
      console.log(`F1 ${vp.width}`, JSON.stringify(r));
      expect(r.missing, "the foot, its bar and both tiles render").toBe(false);
      expect(r.soon, "v27's coming-soon strip is gone").toBe(false);
      expect(Math.abs((r.gap as number) - 28), `foot bottom sits 28 above the content bottom (read ${r.gap})`).toBeLessThanOrEqual(2);
      expect(Math.abs((r.tv as number) - (r.tp as number))).toBeLessThanOrEqual(1);
      expect(r.tv as number).toBeGreaterThanOrEqual(136);
      expect(r.barTop as number, "the bar sits above the tiles").toBeLessThan(r.tileTop as number);
      await ctx.close();
    });

    test("G1 — every drop-down closes on an outside press, Escape (topmost only), Tab away and a pick", async ({ browser, baseURL }) => {
      test.skip(!run("G1"));
      await assertLocalBundleIsDev();
      const ctx = await ctxFor(browser, baseURL!, vp);
      const page = await ctx.newPage();
      await openPage(page);
      const drawer = page.locator('[data-hdr="ms-edit"].is-in');
      /* ⚠️ NOT offsetParent: it is null for a position:fixed element, so the guide's popover read "closed" while open */
      const shown = (sel: string) => page.locator(sel).evaluateAll((els) => els.some((e) => {
        const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
        return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none";
      }));
      const tidy = async (sel: string) => { if (await shown(sel)) { await page.keyboard.press("Escape"); await page.waitForTimeout(400); } };
      const tabAway = async (sel: string) => { for (let i = 0; i < 14 && await shown(sel); i++) await page.keyboard.press("Tab"); return !(await shown(sel)); };
      const readings: Record<string, boolean> = {};

      /* the guide's popover, on the page */
      const pill = page.locator('[data-pck="pill"]').first();
      if (await pill.count()) {
        for (const how of ["outside", "escape", "tab"] as const) {
          await pill.click({ timeout: 10_000 }); await expect(page.locator(".pck-pop")).toBeVisible();
          await page.waitForTimeout(250);
          if (how === "outside") await page.mouse.click(vp.width - 30, vp.height - 12);
          if (how === "escape") await page.keyboard.press("Escape");
          if (how === "tab") readings[`guide:tab`] = await tabAway(".pck-pop:not(.shrink)");
          await page.waitForTimeout(500);
          if (how !== "tab") readings[`guide:${how}`] = !(await shown(".pck-pop"));
          await tidy(".pck-pop"); await page.waitForTimeout(300);
        }
      } else readings["guide:present"] = false;

      await page.locator('[data-ms27="edit"]').click();
      await expect(drawer).toBeVisible();
      await page.waitForTimeout(500);
      const menus = [
        { name: "genre", open: async () => { await page.locator('[data-gx="add"], [data-gx="change"]').first().click({ timeout: 5_000 }); }, sel: '[data-gx="search"]', pick: '[data-gx-opt]' },
        { name: "age", open: async () => { await page.locator("[data-ag-oth]").scrollIntoViewIfNeeded({ timeout: 5_000 }); await page.locator("[data-ag-oth]").click({ timeout: 5_000 }); }, sel: '[data-ag="menu"]', pick: "[data-ag-opt]" },
      ];
      for (const m of menus) {
        for (const how of ["outside", "escape", "tab", "pick"] as const) {
          await m.open(); await expect(page.locator(m.sel)).toBeVisible({ timeout: 5_000 });
          if (how === "outside") await page.locator('[data-ms21-sect="synopsis"] h3, [data-ms21-sect="synopsis"]').first().click({ position: { x: 4, y: 4 } });
          if (how === "escape") await page.keyboard.press("Escape");
          if (how === "tab") { await page.locator(`${m.sel} input, ${m.sel} [tabindex], ${m.sel} button`).first().focus(); readings[`${m.name}:tab`] = await tabAway(m.sel); }
          if (how === "pick") await page.locator(m.pick).first().click();
          await page.waitForTimeout(200);
          if (how !== "tab") readings[`${m.name}:${how}`] = !(await shown(m.sel));
          if (how === "escape") readings[`${m.name}:escape keeps the drawer`] = await drawer.isVisible();
          /* tidy with a press on the drawer's heading, never Escape (an Escape the menu ignored would close the drawer) */
          if (await shown(m.sel)) { await page.locator('[data-hdr="ms-edit"] [data-hdr="head"]').first().click({ position: { x: 6, y: 6 }, timeout: 5_000 }); await page.waitForTimeout(300); }
        }
      }
      await page.locator('[data-ms21="cancel"]').click();
      console.log(`G1 ${vp.width}`, JSON.stringify(readings));
      for (const [k, v] of Object.entries(readings)) expect(v, k).toBe(true);
      expect(Object.keys(readings).length, "every drop-down and every way out was read").toBe(13);
      await ctx.close();
    });

    test("A1 — every Edit details entry opens the right-hand drawer, and no centred modal exists", async ({ browser, baseURL }) => {
      test.skip(!run("A1"));
      await assertLocalBundleIsDev();
      const ctx = await ctxFor(browser, baseURL!, vp);
      const page = await ctx.newPage();
      const entries: [string, () => Promise<void>][] = [
        ["header", async () => { await page.locator('[data-ms27="edit"]').click(); }],
        ["book view", async () => { await page.locator('[data-ms27="full"]').click(); await page.waitForSelector('[data-ms27bx="edit"]'); await page.waitForTimeout(900); await page.locator('[data-ms27bx="edit"]').click(); }],
        ["guide step 1", async () => {
          if (!(await page.locator('[data-pck="popover"]').isVisible())) await page.locator('[data-pck="pill"]').click();
          await page.locator('[data-pck="item"][data-k="details"] button').first().click();
        }],
      ];
      for (const [name, go] of entries) {
        await openPage(page);
        await go();
        await page.waitForSelector('[data-ms21="edit-dialog"]', { timeout: 10_000 });
        await page.waitForTimeout(600);
        const r = await page.evaluate((sel) => {
          const d = document.querySelector<HTMLElement>(sel);
          const b = d?.getBoundingClientRect();
          return { drawer: !!d && !!d.querySelector('[data-ms21="edit-dialog"]'), pos: d ? getComputedStyle(d).position : "", right: b?.right ?? 0, left: b?.left ?? 0,
            vw: innerWidth, modal: document.querySelectorAll(".ms21-modal, .ms21-mc").length };
        }, drawerSel);
        console.log(`A1 ${vp.width} ${name}`, JSON.stringify(r));
        expect(r.drawer, `${name}: the form is inside the drawer`).toBe(true);
        expect(r.pos, `${name}: the drawer is fixed`).toBe("fixed");
        expect(r.vw - r.right, `${name}: the drawer's right edge is at the viewport's right`).toBeLessThanOrEqual(12);
        expect(r.left, `${name}: the drawer is on the right, not centred`).toBeGreaterThan(r.vw * 0.4);
        expect(r.modal, `${name}: no centred modal in the DOM`).toBe(0);
        if (await page.locator('[data-ms21="cancel"]').count()) await page.locator('[data-ms21="cancel"]').click();
        await page.waitForTimeout(400);
      }
      await ctx.close();
    });

    test("A2 — the drawer's sections in order, and no Setting in the drawer or the book view", async ({ browser, baseURL }) => {
      test.skip(!run("A2"));
      await assertLocalBundleIsDev();
      const ctx = await ctxFor(browser, baseURL!, vp);
      const page = await ctx.newPage();
      await openPage(page);
      await page.locator('[data-ms27="full"]').click();
      await page.waitForSelector('[data-ms27bx="root"]');
      await page.waitForTimeout(900);
      const book = await page.locator('[data-ms27bx="root"]').innerText();
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => !document.querySelector(".ms27-bx"));
      await openDrawer(page);
      const titles = await page.locator('[data-ms28="sect-title"]').allInnerTexts();
      const drawer = await page.locator(drawerSel).innerText();
      console.log(`A2 ${vp.width}`, JSON.stringify(titles));
      expect(titles).toEqual(["The book", "Logline", "Elevator pitch", "Synopsis", "Series"]);
      expect(book.length).toBeGreaterThan(40);
      expect(book, "the book view").not.toMatch(/Setting/i);
      expect(drawer, "the drawer").not.toMatch(/Setting/i);
      await cancel(page);
      await ctx.close();
    });

    test("B1 — the series switch writes series on, omits the key off, and the book view follows", async ({ browser, baseURL }) => {
      test.skip(!run("B1"));
      await assertLocalBundleIsDev();
      writeFileSync(SNAP, fx("--get"));
      const ctx = await ctxFor(browser, baseURL!, vp);
      const page = await ctx.newPage();
      try {
        await openPage(page);
        await openDrawer(page);
        const tog = page.locator('[data-ms28="series-toggle"]');
        if ((await tog.getAttribute("aria-checked")) !== "false") { await tog.click(); }
        await tog.click();
        expect(await page.locator('[data-ms28="series-line"]').innerText()).toBe("Yes, it’s part of a series");
        await save(page);
        const on = await untilStored((d) => "series" in d);
        console.log(`B1 ${vp.width} on`, JSON.stringify(on));
        expect(on.series, "on: series is written").toBe("Part of a series");
        expect(await bookRow(page, "series")).toMatch(/Part of a series/);
        await openDrawer(page);
        expect(await tog.getAttribute("aria-checked")).toBe("true");
        await tog.click();
        expect(await page.locator('[data-ms28="series-line"]').innerText()).toBe("No, it’s a standalone");
        await save(page);
        const off = await untilStored((d) => !("series" in d));
        console.log(`B1 ${vp.width} off`, JSON.stringify(off));
        expect("series" in off, "off: the key is omitted, never an empty string").toBe(false);
        expect(await bookRow(page, "series")).toMatch(/Standalone/);
      } finally {
        await ctx.close();
        fx("--restore", SNAP);
      }
    });

    test("B2 — the logline and pitch tags and hints, exactly", async ({ browser, baseURL }) => {
      test.skip(!run("B2"));
      await assertLocalBundleIsDev();
      const ctx = await ctxFor(browser, baseURL!, vp);
      const page = await ctx.newPage();
      await openPage(page);
      await openDrawer(page);
      const t = async (sel: string) => (await page.locator(sel).first().innerText()).trim();
      const r = {
        lt: await t('[data-ms21-sect="logline"] [data-ms28="tag"]'), lh: await t('[data-ms21="logline-hint"]'),
        pt: await t('[data-ms21-sect="elevatorPitch"] [data-ms28="tag"]'), ph: await t('[data-ms21="pitch-hint"]'),
      };
      console.log(`B2 ${vp.width}`, JSON.stringify(r));
      expect(r.lt.toLowerCase()).toBe("one sentence");
      expect(r.lh).toBe("The hook in a single sentence. It’s the line that opens your query letter.");
      expect(r.pt.toLowerCase()).toBe("30 seconds, out loud");
      expect(r.ph).toBe("What you’d say if someone asked what your book’s about: the hook, then the stakes and what makes it yours. Keep it on the tip of your tongue. You never know when the right person might ask.");
      await cancel(page);
      await ctx.close();
    });

    test("C1 — the word-count hint speaks only well outside the thriller range", async ({ browser, baseURL }) => {
      test.skip(!run("C1"));
      await assertLocalBundleIsDev();
      const ctx = await ctxFor(browser, baseURL!, vp);
      const page = await ctx.newPage();
      await openPage(page);
      await openDrawer(page);
      expect(await page.locator('[data-gx="main"]').innerText()).toMatch(/^Thriller/);
      const read: Record<string, string> = {};
      for (const n of [80000, 55000, 50000, 115000]) {
        await page.locator("#ms21-f-words").fill(String(n));
        await page.waitForTimeout(150);
        read[n] = (await page.locator('[data-ms28="wc-hint"]').innerText()).trim();
      }
      console.log(`C1 ${vp.width}`, JSON.stringify(read));
      expect(read[80000]).toBe("");
      expect(read[55000]).toBe("");
      expect(read[50000]).toMatch(/well under/);
      expect(read[115000]).toMatch(/well over/);
      await cancel(page);
      await ctx.close();
    });

    test("D1 — the genre search: ranking, parents, aliases, the own row, and ↓ Enter", async ({ browser, baseURL }) => {
      test.skip(!run("D1"));
      await assertLocalBundleIsDev();
      const ctx = await ctxFor(browser, baseURL!, vp);
      const page = await ctx.newPage();
      await openPage(page);
      await openDrawer(page);
      await page.locator('[data-gx="add"]').click();
      const box = page.locator('[data-gx="search"] input');
      const opts = async () => (await page.locator("[data-gx-opt]").allInnerTexts()).map((x) => x.replace(/\s+/g, " ").trim());
      await box.fill("psych"); await page.waitForTimeout(150);
      const psych = await opts();
      const psychLabels = await page.locator("[data-gx-opt] .gl").evaluateAll((els) => els.map((e) => [...e.childNodes].filter((c) => c.nodeName !== "EM").map((c) => c.textContent).join("").trim()));
      await box.fill("litfic"); await page.waitForTimeout(150);
      const lit = await opts();
      await box.fill("northern gothic"); await page.waitForTimeout(150);
      const own = await opts();
      const ownLast = await page.locator("[data-gx-opt]").last().getAttribute("data-gx-opt");
      await box.fill("psych"); await page.waitForTimeout(150);
      await page.keyboard.press("ArrowDown"); await page.keyboard.press("Enter");
      await page.waitForTimeout(200);
      const chips = (await page.locator('[data-gx="also"]').allInnerTexts()).map((x) => x.replace(/\s+/g, " "));
      console.log(`D1 ${vp.width}`, JSON.stringify({ psych: psych.slice(0, 3), lit: lit.slice(0, 2), own: own.slice(-1), chips }));
      expect(psych[0]).toMatch(/^Psychological thriller/);
      expect(psych[0]).toMatch(/in Thriller/);
      expect(psych[0]).toMatch(/\d[\d,]*.*words/);
      expect(lit.some((o) => /^Literary fiction/.test(o)), "litfic finds Literary fiction by its alias").toBe(true);
      expect(ownLast).toBe("own");
      expect(own[own.length - 1]).toMatch(/Add “northern gothic” as your own genre/);
      /* the row's own label is the text before its <em> notes (innerText runs "horror" into "in Horror") */
      const secondLabel = psychLabels[1];
      expect(chips.some((c) => c.startsWith(secondLabel)), `↓ Enter picked the second row (${secondLabel})`).toBe(true);
      await cancel(page);
      await ctx.close();
    });

    test("D2 — ↑ Main swaps a chip with the main genre in one press, and the save stores it", async ({ browser, baseURL }) => {
      test.skip(!run("D2"));
      await assertLocalBundleIsDev();
      writeFileSync(SNAP, fx("--get"));
      const ctx = await ctxFor(browser, baseURL!, vp);
      const page = await ctx.newPage();
      try {
        await openPage(page);
        await openDrawer(page);
        await page.locator('[data-gx="add"]').click();
        await page.locator('[data-gx="search"] input').fill("psych");
        await page.waitForTimeout(150);
        await page.keyboard.press("Enter");
        const chip = page.locator('[data-gx="also"]').filter({ hasText: "Psychological thriller" });
        await chip.hover();
        await chip.locator("[data-gx-up]").click();
        const main = (await page.locator('[data-gx="main"]').innerText()).replace(/\s+/g, " ");
        const also = (await page.locator('[data-gx="also"]').allInnerTexts()).map((x) => x.replace(/\s+/g, " "));
        console.log(`D2 ${vp.width}`, JSON.stringify({ main, also }));
        expect(main).toMatch(/^Psychological thriller/);
        expect(also.some((a) => a.startsWith("Thriller"))).toBe(true);
        await save(page);
        const d = await untilStored((x) => x.genre === "Psychological thriller");
        console.log(`D2 ${vp.width} stored`, JSON.stringify(d));
        expect(d.genre).toBe("Psychological thriller");
        expect(d.subGenres).toEqual(["Thriller"]);
      } finally {
        await ctx.close();
        fx("--restore", SNAP);
      }
    });

    test("E1 — Adult, Young adult, Middle grade and Other; Other lists Young fiction, Picture book, New adult", async ({ browser, baseURL }) => {
      test.skip(!run("E1"));
      await assertLocalBundleIsDev();
      const ctx = await ctxFor(browser, baseURL!, vp);
      const page = await ctx.newPage();
      await openPage(page);
      await openDrawer(page);
      const seg = (await page.locator('[data-ag="field"] [role="radio"] b').allInnerTexts());
      const oth = (await page.locator("[data-ag-oth] b").innerText()).trim();
      await page.locator("[data-ag-oth]").click();
      const menu = await page.locator("[data-ag-opt] b").allInnerTexts();
      console.log(`E1 ${vp.width}`, JSON.stringify({ seg, oth, menu }));
      expect(seg).toEqual(["Adult", "Young adult", "Middle grade"]);
      expect(oth).toBe("Other");
      expect(menu).toEqual(["Young fiction", "Picture book", "New adult"]);
      await page.keyboard.press("Escape");
      await cancel(page);
      await ctx.close();
    });

    test("E2 — stored legacy ages display as the new labels", async ({ browser, baseURL }) => {
      test.skip(!run("E2"));
      await assertLocalBundleIsDev();
      writeFileSync(SNAP, fx("--get"));
      const ctx = await ctxFor(browser, baseURL!, vp);
      const page = await ctx.newPage();
      const seen: Record<string, { book: string; control: string }> = {};
      try {
        for (const [raw, want] of [["Early Reader", "Young fiction"], ["Middle Grade", "Middle grade"], ["Young Adult", "Young adult"]] as const) {
          fx("--age", raw);
          await openPage(page);
          await page.waitForTimeout(800);
          const book = await bookRow(page, "age");
          await openDrawer(page);
          const control = (await page.locator('[data-ag="field"] [aria-checked="true"] b, [data-ag-oth].on b').first().innerText()).trim();
          await cancel(page);
          seen[raw] = { book, control };
          expect(book.replace(/^Age\s+/i, ""), `${raw}: the book view`).toBe(want);
          expect(control, `${raw}: the age control`).toBe(want);
        }
      } finally {
        console.log(`E2 ${vp.width}`, JSON.stringify(seen));
        await ctx.close();
        fx("--restore", SNAP);
      }
    });
  });
}
