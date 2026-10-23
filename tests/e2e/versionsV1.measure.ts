/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * VER1 — Versions v1's locks on the rendered page, at 1512 × 900 and 1280 × 800, on the ms21-filled account. Expected
 * values come from tests/e2e/ver1Fixture.mjs (Firestore read directly) or from the page's own data attributes
 * compared with what it draws — never from lib/versionsPage, the code under test. B2 writes (Change, then Undo) and
 * asserts the manuscript document comes back byte-for-byte. VER1_ONLY=<id> runs one lock.
 */
import { test, expect, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { assertLocalBundleIsDev } from "./bundleGuard";
import { ctxFor, openVersions, VPS } from "./ver1Lib";

test.setTimeout(300_000);
const ONLY = process.env.VER1_ONLY ?? "";
const run = (id: string) => !ONLY || id.startsWith(ONLY);
const fx = (a: string) => execFileSync("npx", ["tsx", "tests/e2e/ver1Fixture.mjs", a], { encoding: "utf8" }).trim().split("\n").pop()!;
const facts = () => JSON.parse(fx("--facts")) as { live: number; activeName: string | null; unversioned: number; activePackageId: string | null };
const RUST = ["rgb(162, 69, 42)", "rgb(181, 87, 63)", "rgb(160, 69, 46)", "rgb(138, 58, 36)"];
const scrollTo = async (page: Page, sel: string) => page.evaluate((s) => {
  const el = document.querySelector(s) as HTMLElement | null; const sc = [...document.querySelectorAll<HTMLElement>(".wpg-scroll")].find((e) => e.offsetHeight > 0);
  if (el && sc) sc.scrollTop += el.getBoundingClientRect().top - sc.getBoundingClientRect().top - 80;
}, sel);

for (const vp of VPS) {
  test.describe(`VER1 @ ${vp.width}`, () => {
    test("A1 — the route renders, its sidebar row is lit with its icon, and both smokes exist", async ({ browser, baseURL }) => {
      test.skip(!run("A1"));
      await assertLocalBundleIsDev();
      const ctx = await ctxFor(browser, baseURL!, vp);
      const page = await ctx.newPage();
      await openVersions(page);
      const r = await page.evaluate(() => {
        const row = [...document.querySelectorAll<HTMLElement>(".ws-ni")].find((e) => e.getAttribute("aria-label") === "Versions");
        /* ⚠️ THE ROW'S OWN ICON, not "an svg": a row with no icon of its own falls back to its section's (WorkspaceShell) */
        return { state: document.querySelector('[data-ver1="page"]')?.getAttribute("data-state"), lit: row?.getAttribute("aria-current"), icon: !!row?.querySelector("svg.lucide-arrow-left-right") };
      });
      console.log(`A1 ${vp.width}`, JSON.stringify(r));
      expect(r.state).toBe("filled");
      expect(r.lit, "the Versions row is the lit one").toBe("page");
      expect(r.icon, "the row carries its icon").toBe(true);
      const smoke = readdirSync("src/components/versions").filter((f) => /Smoke\.test\.tsx$/.test(f));
      expect(smoke.length).toBeGreaterThan(0);
      await ctx.close();
    });

    test("A2 — Free sees the lock card over a blurred, inert page that writes nothing; Pro sees no lock", async ({ browser, baseURL }) => {
      test.skip(!run("A2"));
      await assertLocalBundleIsDev();
      const before = fx("--ms");
      const ctx = await ctxFor(browser, baseURL!, vp);
      const page = await ctx.newPage();
      await openVersions(page);
      expect(await page.locator('[data-ver1="lock"]').count(), "Pro: no lock").toBe(0);
      await openVersions(page, { free: true });
      const r = await page.evaluate(() => {
        const under = document.querySelector<HTMLElement>(".ver1-under");
        return { state: document.querySelector('[data-ver1="page"]')?.getAttribute("data-state"), lock: !!document.querySelector('[data-ver1="lock"]'),
          inert: under?.hasAttribute("inert") ?? false, blur: under ? getComputedStyle(under).filter : "", cardUnder: !!under?.querySelector('[data-ver1="active-card"]') };
      });
      console.log(`A2 ${vp.width}`, JSON.stringify(r));
      expect(r.state).toBe("locked");
      expect(r.lock).toBe(true);
      expect(r.inert, "the page under the card is inert").toBe(true);
      expect(r.blur).toMatch(/blur/);
      expect(r.cardUnder, "the header card is under the blur").toBe(true);
      /* try to write: the Change button and a row, under the lock — nothing may reach Firestore */
      await page.locator('[data-ver1="change"]').click({ force: true, timeout: 3000 }).catch(() => {});
      await page.locator('[data-ver1="row"]').first().click({ force: true, timeout: 3000 }).catch(() => {});
      expect(await page.locator('[data-ver1="change-menu"], [data-hdr="ver-insights"]').count(), "nothing opens under the lock").toBe(0);
      await page.locator('[data-ver1="plans"]').click();
      await expect(page).toHaveURL(/\/plans/);
      expect(fx("--ms"), "the Free page wrote nothing").toBe(before);
      await page.evaluate(() => sessionStorage.removeItem("sa.dev.versionsFree"));
      await ctx.close();
    });

    test("B1 — the active card states the version and nothing else, and it is the derived one", async ({ browser, baseURL }) => {
      test.skip(!run("B1"));
      await assertLocalBundleIsDev();
      const f = facts();
      const ctx = await ctxFor(browser, baseURL!, vp);
      const page = await ctx.newPage();
      await openVersions(page);
      const r = await page.evaluate(() => {
        const c = document.querySelector<HTMLElement>('[data-ver1="active-card"]')!;
        const body = [...c.querySelectorAll<HTMLElement>(".ver1-avc-v b, .ver1-avc-v i, .ver1-avc-f")].map((e) => e.innerText).join(" ");
        return { name: c.querySelector('[data-ver1="active-name"]')?.textContent, all: c.innerText, body };
      });
      console.log(`B1 ${vp.width}`, JSON.stringify({ ...r, expect: f.activeName }));
      expect(r.name).toBe(f.activeName ?? "None yet");
      expect(r.all, "no % on the card").not.toMatch(/%/);
      expect(r.body, "no figure in the card's body or foot").not.toMatch(/\d/);
      await ctx.close();
    });

    test("B2 — Change: portalled, in view, a pick moves the active version, Undo restores the document; it closes four ways", async ({ browser, baseURL }) => {
      test.skip(!run("B2"));
      await assertLocalBundleIsDev();
      const before = fx("--ms");
      const f0 = facts();
      const ctx = await ctxFor(browser, baseURL!, vp);
      const page = await ctx.newPage();
      await openVersions(page);
      const menu = page.locator('[data-ver1="change-menu"]');
      const openM = async () => { await page.locator('[data-ver1="change"]').click(); await expect(menu).toBeVisible(); await page.waitForTimeout(150); };
      await openM();
      const where = await menu.evaluate((m) => { const r = m.getBoundingClientRect(); return { parent: m.parentElement?.tagName, inView: r.top >= 0 && r.left >= 0 && r.bottom <= innerHeight && r.right <= innerWidth }; });
      expect(where.parent, "portalled to <body>").toBe("BODY");
      expect(where.inView, "inside the viewport").toBe(true);
      /* ⚠️ A BARE PRESS, MOVING NO FOCUS: a real click also moves focus out, and the Tab-away handler would close the
         menu for it — so a click could not tell the outside-press handler was gone */
      await page.evaluate(() => document.querySelector(".ver1-tb, [data-ver1='list']")!.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })));
      await page.waitForTimeout(150);
      await expect(menu).toHaveCount(0);
      await openM(); await page.keyboard.press("Escape"); await expect(menu).toHaveCount(0);
      await openM(); for (let i = 0; i < 12 && await menu.count(); i++) await page.keyboard.press("Tab"); await expect(menu).toHaveCount(0);
      /* the pick: a version that is not active and is stated by a live package */
      await openM();
      const opts = await page.locator("[data-ver1-opt]").evaluateAll((els) => els.map((e) => ({ id: e.getAttribute("data-ver1-opt"), on: e.getAttribute("aria-checked") === "true", name: e.querySelector("b")?.textContent })));
      const target = opts.find((o) => !o.on && o.name !== "Prologue first, wilderness world building") ?? opts.find((o) => !o.on)!;
      await page.locator(`[data-ver1-opt="${target.id}"]`).click();
      await expect(menu).toHaveCount(0);
      let f1 = facts();
      for (let i = 0; i < 10 && f1.activeName === f0.activeName; i++) { await page.waitForTimeout(500); f1 = facts(); }
      console.log(`B2 ${vp.width}`, JSON.stringify({ from: f0.activeName, picked: target.name, now: f1.activeName }));
      expect(f1.activeName, "the derived active version moved").toBe(target.name);
      await expect(page.locator('[data-ver1="active-name"]')).toHaveText(target.name!);
      await page.locator(".sa-toast-undo").click({ timeout: 5000 });
      let after = fx("--ms");
      for (let i = 0; i < 10 && after !== before; i++) { await page.waitForTimeout(500); after = fx("--ms"); }
      expect(after, "Undo restored the manuscript byte-for-byte").toBe(before);
      await ctx.close();
    });

    test("B3 — the banner shows exactly when queries reach no version, with their count; no row reads Not recorded", async ({ browser, baseURL }) => {
      test.skip(!run("B3"));
      await assertLocalBundleIsDev();
      const f = facts();
      const ctx = await ctxFor(browser, baseURL!, vp);
      const page = await ctx.newPage();
      await openVersions(page);
      const r = await page.evaluate(() => ({
        banner: document.querySelector('[data-ver1="banner"]')?.getAttribute("data-count") ?? null,
        text: document.querySelector('[data-ver1="banner"]')?.textContent ?? "",
        rows: [...document.querySelectorAll('[data-ver1="row"]')].map((e) => e.textContent ?? ""),
      }));
      console.log(`B3 ${vp.width}`, JSON.stringify({ banner: r.banner, expect: f.unversioned }));
      expect(f.unversioned, "the fixture has a query with no version").toBeGreaterThan(0);
      expect(r.banner, "the banner shows, with the fixture's count").toBe(String(f.unversioned));
      expect(r.text).toContain(f.unversioned === 1 ? "1 query is out with agents" : `${f.unversioned} queries are out with agents`);
      expect(r.rows.length).toBeGreaterThan(0);
      for (const t of r.rows) expect(t).not.toMatch(/Not recorded/);
      await ctx.close();
    });

    test("C1 — every row's glyph counts sum to its Sent, and the heading and rows share one grid", async ({ browser, baseURL }) => {
      test.skip(!run("C1"));
      await assertLocalBundleIsDev();
      const ctx = await ctxFor(browser, baseURL!, vp);
      const page = await ctx.newPage();
      await openVersions(page);
      const r = await page.evaluate(() => {
        const xs = (el: Element) => [...el.children].map((c) => Math.round((c as HTMLElement).getBoundingClientRect().left * 10) / 10);
        const head = document.querySelector('[data-ver1="list-head"]')!;
        const rows = [...document.querySelectorAll('[data-ver1="row"]')];
        return {
          sums: rows.map((row) => ({ sent: Number(row.getAttribute("data-sent")), glyphs: [...row.querySelectorAll('[data-ver1="glyphs"] [data-n]')].reduce((n, g) => n + Number(g.getAttribute("data-n")), 0) })),
          head: xs(head), rows: rows.map(xs),
        };
      });
      console.log(`C1 ${vp.width}`, JSON.stringify(r));
      expect(r.sums.some((s) => s.sent > 0), "a sent version is present").toBe(true);
      for (const s of r.sums) expect(s.glyphs).toBe(s.sent);
      for (const row of r.rows) row.forEach((x, i) => expect(Math.abs(x - r.head[i]), `column ${i}`).toBeLessThanOrEqual(1));
      await ctx.close();
    });

    test("C2 — a row opens the drawer on its version's queries; Escape closes it and focus returns to the row", async ({ browser, baseURL }) => {
      test.skip(!run("C2"));
      await assertLocalBundleIsDev();
      const ctx = await ctxFor(browser, baseURL!, vp);
      const page = await ctx.newPage();
      await openVersions(page);
      const row = page.locator('[data-ver1="row"]').filter({ has: page.locator('[data-ver1="glyphs"]') }).first();
      const id = await row.getAttribute("data-version");
      const sent = Number(await row.getAttribute("data-sent"));
      await row.click();
      const dr = page.locator('[data-ver1="insights"]');
      await expect(dr).toBeVisible();
      expect(await dr.getAttribute("data-version")).toBe(id);
      expect(await dr.locator('[data-ver1="query"]').count(), "the drawer lists the version's queries").toBe(sent);
      await page.waitForTimeout(400);
      const inDrawer = await page.evaluate(() => !!document.activeElement?.closest('[data-hdr="ver-insights"]'));
      expect(inDrawer, "the drawer took focus").toBe(true);
      await page.keyboard.press("Escape");
      await expect(dr).toHaveCount(0);
      await page.waitForTimeout(200);
      const focused = await page.evaluate(() => document.activeElement?.getAttribute("data-version") ?? document.activeElement?.tagName);
      console.log(`C2 ${vp.width}`, JSON.stringify({ id, sent, focused }));
      expect(focused, "focus returned to the row").toBe(id);
      await ctx.close();
    });

    test("D1 — cards follow the ranking with unsent last, and no positive figure is rust", async ({ browser, baseURL }) => {
      test.skip(!run("D1"));
      await assertLocalBundleIsDev();
      const ctx = await ctxFor(browser, baseURL!, vp);
      const page = await ctx.newPage();
      await openVersions(page);
      await scrollTo(page, '[data-ver1="cards"]');
      const r = await page.evaluate((rust) => {
        const cards = [...document.querySelectorAll('[data-ver1="card"]')].map((c) => ({ sent: Number(c.getAttribute("data-sent")), req: Number(c.getAttribute("data-requests")), n: Number(c.getAttribute("data-n")) }));
        const positive = [...document.querySelectorAll<HTMLElement>('.ver1-rc-v, .ver1-best, .ver1-sh-big, .ver1-vl-p b, .ver1-stt.hot, [data-ver1="card-pct"], [data-ver1="rate"], .ver1-say')]
          .filter((e) => e.offsetParent !== null).map((e) => getComputedStyle(e).color);
        return { cards, rustHits: positive.filter((c) => rust.includes(c)), checked: positive.length };
      }, RUST);
      console.log(`D1 ${vp.width}`, JSON.stringify(r));
      const sent = r.cards.filter((c) => c.sent > 0), unsent = r.cards.filter((c) => c.sent === 0);
      expect(r.cards.slice(0, sent.length).every((c) => c.sent > 0), "unsent versions come last").toBe(true);
      expect(unsent.length + sent.length).toBe(r.cards.length);
      for (let i = 1; i < sent.length; i++) {
        const a = sent[i - 1], b = sent[i];
        const ok = a.req > b.req || (a.req === b.req && (a.req / a.sent > b.req / b.sent || (a.req / a.sent === b.req / b.sent && a.n > b.n)));
        expect(ok, `card ${i} is in ranking order`).toBe(true);
      }
      expect(r.checked).toBeGreaterThan(2);
      expect(r.rustHits, "no positive figure computes to rust").toEqual([]);
      await ctx.close();
    });

    test("D2 — every heading sorts; thin rows stay last; rate is replies ÷ answered on every row", async ({ browser, baseURL }) => {
      test.skip(!run("D2"));
      await assertLocalBundleIsDev();
      const ctx = await ctxFor(browser, baseURL!, vp);
      const page = await ctx.newPage();
      await openVersions(page);
      await scrollTo(page, '[data-ver1="league"]');
      const read = () => page.evaluate(() => [...document.querySelectorAll('[data-ver1="league-row"]')].map((r) => ({
        id: r.getAttribute("data-version"), sent: Number(r.getAttribute("data-sent")), replies: Number(r.getAttribute("data-replies")),
        answered: Number(r.getAttribute("data-answered")), requests: Number(r.getAttribute("data-requests")),
        avg: r.getAttribute("data-avg") === "" ? null : Number(r.getAttribute("data-avg")), rateText: r.querySelector('[data-ver1="rate"]')?.textContent ?? "",
      })));
      const val = (k: string, x: Awaited<ReturnType<typeof read>>[number]) =>
        k === "sent" ? (x.sent || null) : k === "replies" ? (x.sent ? x.replies : null) : k === "rate" ? (x.answered ? x.replies / x.answered : null) : k === "requests" ? (x.sent ? x.requests : null) : x.avg;
      const orders: Record<string, string[]> = {};
      for (const k of ["sent", "replies", "rate", "requests", "avg"]) {
        await page.locator(`[data-ls="${k}"]`).click();
        await page.waitForTimeout(120);
        const rows = await read();
        orders[k] = rows.map((x) => x.id!);
        const thinFrom = rows.findIndex((x) => x.answered < 4);
        if (thinFrom >= 0) for (const x of rows.slice(thinFrom)) expect(x.answered < 4, `${k}: thin rows stay last`).toBe(true);
        for (const part of [rows.filter((x) => x.answered >= 4), rows.filter((x) => x.answered < 4)]) {
          for (let i = 1; i < part.length; i++) {
            const a = val(k, part[i - 1]), b = val(k, part[i]);
            if (a == null) expect(b, `${k}: missing values sort last`).toBeNull();
            else if (b != null) expect(k === "avg" ? a <= b : a >= b, `${k}: row ${i} in order`).toBe(true);
          }
        }
        for (const x of rows) {
          const want = x.sent && x.answered ? `${Math.round((x.replies / x.answered) * 100)}%` : "–";
          expect(x.rateText, `${k}: rate = replies ÷ answered for ${x.id}`).toBe(want);
        }
      }
      console.log(`D2 ${vp.width}`, JSON.stringify(orders));
      expect(new Set(Object.values(orders).map((o) => o.join())).size, "at least one heading reorders the rows").toBeGreaterThan(1);
      await ctx.close();
    });

    test("D3 — the lead cell is the rows' sum, and the banner plus the versions' live queries is the book's live queries", async ({ browser, baseURL }) => {
      test.skip(!run("D3"));
      await assertLocalBundleIsDev();
      const f = facts();
      const ctx = await ctxFor(browser, baseURL!, vp);
      const page = await ctx.newPage();
      await openVersions(page);
      const r = await page.evaluate(() => {
        const rows = [...document.querySelectorAll('[data-ver1="league-row"]')];
        return {
          lead: document.querySelector('[data-ver1="lead-sum"]')?.textContent ?? "",
          req: rows.reduce((n, x) => n + Number(x.getAttribute("data-requests")), 0),
          sent: rows.reduce((n, x) => n + Number(x.getAttribute("data-sent")), 0),
          live: [...document.querySelectorAll('[data-ver1="row"]')].reduce((n, x) => n + Number(x.getAttribute("data-live")), 0),
          banner: Number(document.querySelector('[data-ver1="banner"]')?.getAttribute("data-count") ?? 0),
        };
      });
      console.log(`D3 ${vp.width}`, JSON.stringify({ ...r, fixtureLive: f.live }));
      expect(r.lead).toBe(`${r.req} requests from ${r.sent} queries`);
      expect(r.banner + r.live, "banner + versions' live = the book's live queries").toBe(f.live);
      await ctx.close();
    });

    test("E1 — Add to a package and Change open the package form with that version chosen; an unknown version opens it empty", async ({ browser, baseURL }) => {
      test.skip(!run("E1"));
      await assertLocalBundleIsDev();
      const before = fx("--ms");
      const ctx = await ctxFor(browser, baseURL!, vp);
      const page = await ctx.newPage();
      const chosen = async () => {
        await page.waitForSelector('[data-pk4="pkgform"]', { timeout: 20_000 });
        await page.waitForTimeout(300);
        return page.locator('[data-pk4="pick-version"] [aria-checked="true"] strong').allInnerTexts();
      };
      /* from the row of a version that is not sent yet */
      await openVersions(page);
      const row = page.locator('[data-ver1="row"]').filter({ has: page.locator('[data-ver1="add-row"]') }).first();
      const name = (await row.locator(".ver1-vl-id b").first().innerText()).trim();
      const id = await row.getAttribute("data-version");
      await row.locator('[data-ver1="add-row"]').click();
      await expect(page).toHaveURL(new RegExp(`/manuscripts/packages\\?new=1&version=${id}`));
      const fromRow = await chosen();
      /* from Change, on a version no live package holds */
      await openVersions(page);
      await page.locator('[data-ver1="change"]').click();
      await page.locator(`[data-ver1-opt="${id}"]`).click();
      await expect(page).toHaveURL(/\/manuscripts\/packages\?new=1&version=/);
      const fromChange = await chosen();
      /* a version the book does not hold: the form opens with none chosen */
      await page.goto("/manuscripts/packages?new=1&version=bv-not-this-book");
      const fromBogus = await chosen();
      console.log(`E1 ${vp.width}`, JSON.stringify({ name, id, fromRow, fromChange, fromBogus }));
      expect(fromRow, "Add to a package: the form opens with that version chosen").toEqual([name]);
      expect(fromChange, "Change: the form opens with that version chosen").toEqual([name]);
      expect(fromBogus, "an unknown version: nothing chosen").toEqual([]);
      expect(fx("--ms"), "opening the form wrote nothing").toBe(before);
      await ctx.close();
    });
  });
}
