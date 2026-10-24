/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * VER2 — Versions v2's locks on the rendered page (design-refs/versions-v2), at 1512 × 982 and 1280 × 832, on the
 * ms21-filled account's two seeded books (tests/e2e/ver2Fixture.mjs, re-seeded before and after every case that
 * writes). Expected values come from the fixture's own Firestore read (`--facts`), never from lib/versionsV2, and
 * every population is asserted non-zero before anything is asserted about it. VER2_ONLY=<id> runs one lock.
 *
 * Written before the page (Step 0.10) and proved red against dev's build without Versions v2: every case failed,
 * because no `[data-vv2="page"]` existed. A suite that cannot find its subject has failed, not skipped.
 */
import { test, expect, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { ctxFor, openV2, scrollInto, VER2_COLD, VER2_FRESH, VER2_PRE, VER2_WARM, VPS } from "./ver2Lib";

test.setTimeout(300_000);
test.describe.configure({ mode: "serial" });
const ONLY = process.env.VER2_ONLY ?? "";
const run = (id: string) => !ONLY || ONLY.split(",").some((o) => id.startsWith(o));
const fx = (...a: string[]) => execFileSync("npx", ["tsx", "tests/e2e/ver2Fixture.mjs", ...a], { encoding: "utf8" }).trim().split("\n").pop()!;
type Facts = { inUse: string | null; versions: { id: string; name: string; n: number; more: number; all: number; archived: boolean }[]; unrecorded: number; sentTotal: number; live: number };
const facts = (): Facts => JSON.parse(fx("--facts"));
const toastUndo = async (page: Page) => {
  const u = page.locator(".sa-toast-undo").first();
  await u.waitFor({ timeout: 6000 });
  await u.click();
  await page.waitForTimeout(1500);
};
/** the drawer slides in: a box read mid-slide is the animated one, so wait for two equal reads */
const settled = async (page: Page, sel = '[data-vv2="drawer"]') => {
  let last = "";
  for (let i = 0; i < 40; i++) {
    const b = JSON.stringify(await page.locator(sel).boundingBox());
    if (b === last) return;
    last = b; await page.waitForTimeout(100);
  }
  throw new Error(`${sel} never settled`);
};
const closePop = async (page: Page) => { if (await page.locator('[data-pck="popover"]').count()) await page.locator('[data-pck="close"]').click(); await page.waitForTimeout(300); };

test.beforeAll(() => { fx("--seed"); });
test.afterAll(() => { fx("--seed"); fx("--guide-reset"); });

for (const vp of VPS) {
  test.describe(`VER2 @ ${vp.width}`, () => {
    /* v2.2 re-pointed S01: the header's title and its donut are deleted (A1), so the claim that the page states what the
       fixture holds is now made by the banner and the list's own count, and the faces are read off the title card */
    test("S01 — the banner and the list's count state what the fixture holds; the faces are the ref's", async ({ browser, baseURL }) => {
      test.skip(!run("S01"));
      const f = facts();
      expect(f.live, "fixture: versions to show").toBeGreaterThan(2);
      const ctx = await ctxFor(browser, baseURL!, vp);
      const page = await ctx.newPage();
      await openV2(page);
      await closePop(page);
      const r = await page.evaluate(() => ({
        count: document.querySelector("#vCnt")?.textContent,
        banner: document.querySelector('[data-vv2="banner"] .wb-h')?.textContent,
      }));
      console.log(`S01 ${vp.width}`, JSON.stringify(r));
      expect(Number(r.count)).toBe(f.live);
      expect(r.banner).toContain(`${f.unrecorded} queries are out with agents`);
      /* the faces, read off the page: a token cycle once made every one resolve to nothing with every other lock green */
      const type = await page.evaluate(() => {
        const f = (s: string) => { const e = document.querySelector(s); return e ? { family: getComputedStyle(e).fontFamily, size: parseFloat(getComputedStyle(e).fontSize) } : null; };
        return { h1: f("#hbT"), h2: f("#msRH"), body: f('[data-vv2="title"] .hb-tx > p'), pill: f('[data-vv2="list"] .db-ch li') };
      });
      console.log(`S01 type ${vp.width}`, JSON.stringify(type));
      expect(type.h1!.family).toMatch(/Special Elite/);
      expect(type.h1!.size).toBe(34);
      expect(type.h2!.family).toMatch(/Special Elite/);
      expect(type.body!.family).toMatch(/Source Serif 4/);
      expect(type.pill!.family).toMatch(/Source Serif 4/);
      await ctx.close();
    });

    test("S02 — the list: the in-use card pinned first in navy, four columns, no Saved column, three labelled icons", async ({ browser, baseURL }) => {
      test.skip(!run("S02"));
      const f = facts();
      const ctx = await ctxFor(browser, baseURL!, vp);
      const page = await ctx.newPage();
      await openV2(page);
      await closePop(page);
      const r = await page.evaluate(() => {
        const rows = [...document.querySelectorAll<HTMLElement>('[data-vv2="list"] .db-r')];
        return {
          n: rows.length,
          head: [...document.querySelectorAll<HTMLElement>('[data-vv2="list"] .db-h > span')].map((s) => s.textContent?.trim() ?? ""),
          first: rows[0]?.querySelector("b")?.textContent, firstUse: rows[0]?.classList.contains("use"), firstBg: rows[0] ? getComputedStyle(rows[0]).backgroundColor : "",
          icons: rows.map((r) => r.querySelectorAll(".db-act .da").length),
          tips: rows.flatMap((r) => [...r.querySelectorAll<HTMLElement>(".db-act .da")].map((b) => b.dataset.tip ?? "")),
          sent: rows.map((r) => [r.querySelector("b")?.textContent, r.querySelector(".db-q b")?.textContent ?? "0"]),
        };
      });
      console.log(`S02 ${vp.width}`, JSON.stringify(r));
      expect(r.n, "every live version is a row").toBe(f.live);
      expect(r.head).toEqual(["Version", "What changed", "Words", "Queries sent", ""]);
      expect(r.head.join(" ")).not.toMatch(/Saved/);
      expect(r.firstUse, "the in-use version is pinned first").toBe(true);
      expect(r.first).toBe(f.inUse);
      expect(r.firstBg, "the pinned card is navy").toBe("rgb(42, 58, 82)");
      expect(new Set(r.icons)).toEqual(new Set([3]));
      expect(r.tips.every((t) => t.length > 0), "every icon has a label").toBe(true);
      for (const [name, n] of r.sent) expect(Number(n), `${name}'s queries sent`).toBe(f.versions.find((v) => v.name === name)!.n);
      /* the label shows on hover */
      await scrollInto(page, '[data-vv2="list-sec"]', 20);
      const pencil = page.locator('[data-vv2="row"]').nth(1).locator('[data-vv2="edit"]');
      await pencil.hover(); await page.waitForTimeout(250);
      const after = await pencil.evaluate((b) => getComputedStyle(b, "::after").content);
      expect(after, "the hover label is drawn").toContain("Edit version");
      await ctx.close();
    });

    test("S06 — search highlights and counts; sort flips the order", async ({ browser, baseURL }) => {
      test.skip(!run("S06"));
      const ctx = await ctxFor(browser, baseURL!, vp);
      const page = await ctx.newPage();
      await openV2(page);
      await closePop(page);
      await page.locator('[data-vv2="search"]').fill("ferry");
      const s = await page.evaluate(() => ({ marks: document.querySelectorAll('[data-vv2="list"] mark').length, rows: document.querySelectorAll('[data-vv2="row"]').length, count: document.querySelector('[data-vv2="match"]')?.textContent, sep: !!document.querySelector(".db-sep") }));
      console.log(`S06 ${vp.width}`, JSON.stringify(s));
      expect(s.marks, "matches are highlighted").toBeGreaterThan(0);
      expect(s.count).toBe(`${s.rows} of 5 match`);
      expect(s.sep, "nothing is pinned while searching").toBe(false);
      await page.locator('[data-vv2="search"]').fill("");
      const order = () => page.evaluate(() => [...document.querySelectorAll('[data-vv2="row"]:not(.use) .vl-n')].map((e) => e.textContent));
      const before = await order();
      await page.locator('[data-vv2="sort"]').click();
      const flipped = await order();
      expect(await page.locator("#dbSortT").textContent()).toBe("Oldest first");
      expect(flipped, "oldest first reverses the order").toEqual([...before].reverse());
      await ctx.close();
    });

    test("S04 — archive confirm, then Undo restores the manuscript exactly", async ({ browser, baseURL }) => {
      test.skip(!run("S04"));
      fx("--seed");
      const before = fx("--ms");
      const ctx = await ctxFor(browser, baseURL!, vp);
      const page = await ctx.newPage();
      await openV2(page);
      await closePop(page);
      await scrollInto(page, '[data-vv2="list-sec"]', 20);
      await page.locator('[data-vv2="row"][data-id="ver2-bv-2"] [data-vv2="bin"]').click();
      const body = await page.locator('[data-vv2="confirm-body"]').innerText();
      expect(body).toContain("Its 3 queries keep their version.");
      expect(body).toContain("You can bring it back");
      await page.locator('[data-vv2="confirm-go"]').click();
      await page.waitForTimeout(1500);
      expect(await page.locator('[data-vv2="row"][data-id="ver2-bv-2"]').count(), "off the list").toBe(0);
      expect(await page.locator('[data-vv2="archived"] summary').textContent()).toBe("Archived · 1");
      const mid = JSON.parse(fx("--ms"));
      expect(mid.bookVersions.find((v: { id: string }) => v.id === "ver2-bv-2").archived).toBe(true);
      await toastUndo(page);
      expect(fx("--ms"), "Undo put the manuscript back byte for byte").toBe(before);
      await ctx.close();
    });

    test("S05 — delete confirm names the child that moves and the package that loses it; delete + Undo", async ({ browser, baseURL }) => {
      test.skip(!run("S05"));
      fx("--seed");
      const before = fx("--ms");
      const ctx = await ctxFor(browser, baseURL!, vp);
      const page = await ctx.newPage();
      await openV2(page);
      await closePop(page);
      await scrollInto(page, '[data-vv2="list-sec"]', 20);
      await page.locator('[data-vv2="row"][data-id="ver2-bv-3"] [data-vv2="bin"]').click();
      const body = await page.locator('[data-vv2="confirm-body"]').innerText();
      console.log(`S05 ${vp.width}`, body.replace(/\n/g, " | "));
      expect(body).toContain("Premise up front started from it.");
      expect(body).toContain("It’ll start from Fast-paced opening instead.");
      expect(body).toContain("It’s in Autumn pack. That package will have no version until you pick one.");
      expect(await page.locator('#cxPkT').textContent()).toBe("Delete Tighter first chapter?");
      await page.locator('[data-vv2="confirm-go"]').click();
      await page.waitForTimeout(1500);
      const mid = JSON.parse(fx("--ms"));
      expect(mid.bookVersions.some((v: { id: string }) => v.id === "ver2-bv-3")).toBe(false);
      expect(mid.bookVersions.find((v: { id: string }) => v.id === "ver2-bv-4").parentId).toBe("ver2-bv-1");
      expect(mid.bookVersionSeq, "the number is not given out again").toBe(4);
      await toastUndo(page);
      expect(fx("--ms"), "Undo put the manuscript back byte for byte").toBe(before);
      await ctx.close();
      fx("--seed");
    });

    test("S11/S12 — the drawer: four stat cards, a four-band funnel, and each band's tooltip", async ({ browser, baseURL }) => {
      test.skip(!run("S11"));
      const f = facts();
      const fast = f.versions.find((v) => v.name === f.inUse)!;
      expect(fast.n, "fixture: the in-use version has 5+ sent").toBeGreaterThanOrEqual(5);
      const ctx = await ctxFor(browser, baseURL!, vp);
      const page = await ctx.newPage();
      await openV2(page);
      await closePop(page);
      await scrollInto(page, '[data-vv2="list-sec"]', 20);
      await page.locator('[data-vv2="row"].use').click();
      await page.waitForSelector('[data-vv2="drawer"] .vk2');
      await settled(page);
      const cards = await page.evaluate(() => [...document.querySelectorAll('[data-vv2="drawer"] .vk2 > div')].map((d) => [d.querySelector("span")?.textContent, d.querySelector("b")?.textContent, d.querySelector("i")?.textContent]));
      console.log(`S11 ${vp.width}`, JSON.stringify(cards));
      expect(cards.map((c) => c[0])).toEqual(["Sent", "Replied", "Asked for more", "Average reply"]);
      expect(cards[0][1]).toBe(String(fast.n));
      expect(cards[2][1]).toBe(`${Math.round((fast.more / fast.n) * 100)}%`);
      expect(cards[2][2]).toBe(`${fast.more} of ${fast.n}`);
      const bands = page.locator('[data-vv2="drawer"] .hfC-b');
      expect(await bands.count()).toBe(4);
      const want = [`${fast.n} queries sent`, `of ${fast.n} replied ·`, `who replied asked for more ·`, "No offers yet"];
      for (let i = 0; i < 4; i++) {
        const b = (await bands.nth(i).boundingBox())!;
        await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
        await page.waitForTimeout(150);
        const tip = await page.locator(`[data-vv2="funnel"] .hfC-tip[data-tip="${i}"]:not([hidden])`).innerText();
        console.log(`S12 ${vp.width} band ${i}`, tip.replace(/\n/g, " | "));
        expect(tip).toContain(want[i]);
        const faded = await page.evaluate((k) => [...document.querySelectorAll('[data-vv2="drawer"] .hfC-b')].map((r, j) => j === k ? null : getComputedStyle(r).opacity).filter(Boolean), i);
        expect(faded.every((o) => Number(o) < 0.6), "the other bands fade").toBe(true);
      }
      /* keyboard: a focused band shows its tooltip too */
      await page.mouse.move(5, 5);
      await bands.nth(1).focus();
      await page.waitForTimeout(150);
      expect(await page.locator('[data-vv2="funnel"] .hfC-tip[data-tip="1"]:not([hidden])').count(), "focus shows the tooltip").toBe(1);
      await ctx.close();
    });

    test("S14 — fewer than 5 sent: counts and 'too early for a %', never a percentage", async ({ browser, baseURL }) => {
      test.skip(!run("S14"));
      const f = facts();
      const dual = f.versions.find((v) => v.id === "ver2-bv-2")!;
      expect(dual.n).toBeGreaterThan(0);
      expect(dual.n).toBeLessThan(5);
      const ctx = await ctxFor(browser, baseURL!, vp);
      const page = await ctx.newPage();
      await openV2(page);
      await closePop(page);
      await scrollInto(page, '[data-vv2="list-sec"]', 20);
      await page.locator('[data-vv2="row"][data-id="ver2-bv-2"]').click();
      await page.waitForSelector('[data-vv2="drawer"] .vk2');
      const t = await page.locator('[data-vv2="drawer"] .vk2').innerText();
      console.log(`S14 ${vp.width}`, t.replace(/\n/g, " | "));
      expect(t).toContain(`of ${dual.n} · too early for a %`);
      expect(t).not.toMatch(/\d+\s*%/);
      await page.keyboard.press("Escape");
      const league = await page.locator('[data-vv2="league-row"][data-id="ver2-bv-2"]').innerText();
      expect(league).toContain("too early to tell");
      expect(league).not.toMatch(/\d+%/);
      await ctx.close();
    });

    test("S15/S16 — a duplicate name blocks Save; Original's form is locked", async ({ browser, baseURL }) => {
      test.skip(!run("S15"));
      const ctx = await ctxFor(browser, baseURL!, vp);
      const page = await ctx.newPage();
      await openV2(page);
      await closePop(page);
      await scrollInto(page, '[data-vv2="list-sec"]', 20);
      await page.locator('[data-vv2="row"][data-id="ver2-bv-2"] [data-vv2="edit"]').click();
      await page.locator('[data-vv2="name"]').fill("  fast-PACED opening ");
      expect(await page.locator("#vErr").textContent()).toBe("You already have a version called this.");
      expect(await page.locator('[data-vv2="save"]').isDisabled(), "Save is blocked").toBe(true);
      expect(await page.locator('[data-vv2="from"] button').first().isDisabled(), "a sent version's start is fixed").toBe(true);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(400);
      await page.locator('[data-vv2="row"][data-id="ver2-bv-0"] [data-vv2="edit"]').click();
      expect(await page.locator('[data-vv2="name"]').isDisabled(), "Original's name is locked").toBe(true);
      expect(await page.locator('#vWords').isDisabled(), "Original's words are locked").toBe(true);
      expect(await page.locator('[data-vv2="form"] .vfrom, [data-vv2="change-in"]').count(), "no Starts from, no changes").toBe(0);
      expect(await page.locator('[data-vv2="form"] .fv-note').innerText()).toContain("Original is your manuscript as you first sent it.");
      await ctx.close();
    });

    test("S17/S18 — Which version went? warns when a version was saved after the send", async ({ browser, baseURL }) => {
      test.skip(!run("S17"));
      const ctx = await ctxFor(browser, baseURL!, vp);
      const page = await ctx.newPage();
      await openV2(page);
      await closePop(page);
      await page.locator('[data-vv2="assign"]').click();
      const rows = page.locator('[data-vv2="pick-row"]');
      expect(await rows.count()).toBe(facts().unrecorded);
      await page.locator('[data-vv2="pick-trigger"]').first().click();
      const heads = await page.locator(".vp-m .vp-k").allTextContents();
      expect(heads).toContain("Saved after you sent this query");
      await page.locator('[data-vv2="pick"][data-late="1"]').first().click();
      const warn = await page.locator('[data-vv2="late"]').first().innerText();
      console.log(`S18 ${vp.width}`, warn);
      expect(warn).toMatch(/^Are you sure\? .+ was saved \d+ (days|weeks|months) after you sent the query to .+\.$/);
      expect(await page.locator("#fiN").textContent()).toBe(`1 of ${facts().unrecorded} will be recorded`);
      await ctx.close();
    });

    test("S27 — the first save creates Original and counts the earlier queries towards it; Undo restores", async ({ browser, baseURL }) => {
      test.skip(!run("S27"));
      fx("--seed");
      const before = fx("--ms", VER2_PRE);
      const ctx = await ctxFor(browser, baseURL!, vp);
      const page = await ctx.newPage();
      await openV2(page, VER2_PRE);
      await closePop(page);
      /* v2.2 re-pointed: the pre-note is now the empty state's line (C1) */
      expect(await page.locator('[data-vv2="ev-sub"]').innerText()).toContain("You’ve already sent 4 queries.");
      await page.locator('[data-vv2="first"]').click();
      expect(await page.locator('[data-vv2="first-note"]').innerText()).toContain("You already have 4 queries out.");
      await page.locator('[data-vv2="name"]').fill("Shorter opening");
      await page.locator('[data-vv2="change-in"]').fill("Cut the first chapter");
      await page.keyboard.press("Enter");
      expect(await page.locator("#vReady").textContent()).toBe("Ready. Original is saved too, with your 4 queries.");
      await page.locator('[data-vv2="save"]').click();
      await page.waitForTimeout(1500);
      const toast = await page.locator(".sa-toast").first().innerText();
      expect(toast).toContain("Saved Shorter opening. Your 4 earlier queries count towards Original.");
      const ms = JSON.parse(fx("--ms", VER2_PRE));
      expect(ms.bookVersions.map((v: { name: string; num: number; original?: boolean }) => [v.name, v.num, !!v.original])).toEqual([["Original", 0, true], ["Shorter opening", 1, false]]);
      expect(ms.inUseBookVersionId).toBe(ms.bookVersions[1].id);
      /* v2.2 re-pointed: the donut's legend is deleted (A1); Original's own card now carries the 4 */
      await expect.poll(() => page.locator('[data-vv2="row"]').count(), { timeout: 8000 }).toBe(2);
      const orig = await page.locator(`[data-vv2="row"][data-id="${ms.bookVersions[0].id}"] .db-q b`).innerText();
      expect(orig).toBe("4");
      await toastUndo(page);
      expect(fx("--ms", VER2_PRE), "Undo restores the book with no versions").toBe(before);
      await ctx.close();
    });

    test("S19–S21 — the guide's four ticks come from real actions", async ({ browser, baseURL }) => {
      test.skip(!run("S19"));
      fx("--seed"); fx("--guide-reset");
      const ctx = await ctxFor(browser, baseURL!, vp);
      const page = await ctx.newPage();
      await openV2(page);
      const pill = page.locator('[data-pck="pill"]');
      await expect(pill).toBeVisible({ timeout: 10_000 });
      const count = async () => (await page.locator('[data-pck="count"]').textContent())?.trim();
      expect(await count(), "Add a version is done by the versions already saved").toBe("1 of 4");
      await closePop(page);
      await scrollInto(page, '[data-vv2="list-sec"]', 20);
      /* edit: a real save */
      await page.locator('[data-vv2="row"][data-id="ver2-bv-4"] [data-vv2="edit"]').click();
      await page.locator('[data-vv2="name"]').fill("Premise up front, again");
      await page.locator('[data-vv2="save"]').click();
      await expect.poll(count, { timeout: 8000 }).toBe("2 of 4");
      /* use: a real change of the version in use */
      await page.locator('[data-vv2="row"][data-id="ver2-bv-2"] [data-vv2="use"]').click();
      await expect.poll(count, { timeout: 8000 }).toBe("3 of 4");
      /* check: open a version that has gone out */
      await page.locator('[data-vv2="row"][data-id="ver2-bv-0"]').click();
      await page.waitForSelector('[data-vv2="drawer"] .vk2');
      await page.keyboard.press("Escape");
      await expect.poll(count, { timeout: 8000 }).toMatch(/4 of 4|✓/);
      await ctx.close();
      fx("--seed"); fx("--guide-reset");
    });

    /* ══ v2.1 — Tracking & performance warming up (design-refs/versions-v2-1, S30) ══ */
    const warm = async (page: Page) => page.evaluate(() => ({
      band: !!document.querySelector('[data-vv2="tracking"]'),
      panel: !!document.querySelector('[data-vv2="warming"]'),
      carousel: document.querySelectorAll('[data-vv2="carousel"]').length,
      league: document.querySelectorAll('[data-vv2="league"]').length,
      compare: document.querySelectorAll('[data-vv2="compare"]').length,
      ready: document.querySelector('[data-vv2="warm-ready"]')?.textContent?.replace(/\s+/g, " ").trim() ?? null,
      eta: document.querySelector('[data-vv2="warm-eta"]')?.textContent?.replace(/\s+/g, " ").trim() ?? null,
      rows: [...document.querySelectorAll('[data-vv2="warm-row"]')].map((r) => r.textContent?.replace(/\s+/g, " ").trim()),
      examples: [...document.querySelectorAll('[data-vv2="warming"] figcaption b')].map((b) => b.textContent),
      titleFace: (() => { const h = document.querySelector('[data-vv2="warming"] .wt-tx h3'); return h ? getComputedStyle(h).fontFamily : null; })(),
    }));

    test("W1 — two versions short of 5 sent each: the divider and the warming-up panel, no carousel, no league, no Compare", async ({ browser, baseURL }) => {
      test.skip(!run("W1"));
      fx("--seed");
      const ctx = await ctxFor(browser, baseURL!, vp);
      const page = await ctx.newPage();
      await openV2(page, VER2_WARM);
      await closePop(page);
      const rows = await page.locator('[data-vv2="row"]').count();
      expect(rows, "population: the book's two versions are on the page").toBe(2);
      const r = await warm(page);
      console.log(`W1 ${vp.width}`, JSON.stringify(r));
      expect(r.band, "the navy divider band shows").toBe(true);
      expect(r.panel, "the warming-up panel shows").toBe(true);
      expect(r.carousel + r.league, "no carousel, no league").toBe(0);
      expect(r.compare, "no Compare button").toBe(0);
      expect(r.ready).toBe("Progress 1 of 2 versions ready");
      expect(r.rows.length, "population: progress rows").toBe(2);
      expect(r.rows[0]).toMatch(/Original.*7 sent.*Ready/i);
      expect(r.rows[1]).toMatch(/Shorter first page.*2 sent.*3 to go/);
      expect(r.eta).toBe("About 7 weeks away at your pace: you sent 2 queries in the last 30 days, and 3 more are needed.");
      expect(r.examples).toEqual(["A card for every version", "A league table", "How far each one gets"]);
      expect(r.titleFace, "the title is in the typewriter face, not brand.tsx's forced heading face").toMatch(/Special Elite/);
      await ctx.close();
    });

    test("W2 — logging queries until the second version reaches 5 swaps the panel for the full section, without a reload", async ({ browser, baseURL }) => {
      test.skip(!run("W2"));
      fx("--seed");
      const ctx = await ctxFor(browser, baseURL!, vp);
      const page = await ctx.newPage();
      await openV2(page, VER2_WARM);
      await closePop(page);
      expect((await warm(page)).panel, "precondition: the panel is showing").toBe(true);
      await page.evaluate(() => { (window as unknown as { __vv2Mark: number }).__vv2Mark = 1; });
      fx("--warm-log", "2");
      await page.waitForTimeout(2500);
      const mid = await warm(page);
      expect(mid.panel, "one short: still warming up").toBe(true);
      expect(mid.rows[1]).toMatch(/4 sent.*1 to go/);
      fx("--warm-log", "1");
      await expect.poll(async () => (await warm(page)).panel, { timeout: 15_000 }).toBe(false);
      const r = await warm(page);
      console.log(`W2 ${vp.width}`, JSON.stringify(r));
      expect(await page.evaluate(() => (window as unknown as { __vv2Mark?: number }).__vv2Mark), "no reload happened").toBe(1);
      expect(r.carousel, "the carousel arrived").toBe(1);
      expect(r.league, "the league arrived").toBe(1);
      /* v2.2 re-pointed: the header's Compare is deleted (A1, D6), so the full section arrives with no Compare anywhere */
      expect(r.compare, "no Compare button (v2.2 A1)").toBe(0);
      await ctx.close();
      fx("--seed");
    });

    test("W3 — nothing sent in 30 days: the pace-0 copy", async ({ browser, baseURL }) => {
      test.skip(!run("W3"));
      const ctx = await ctxFor(browser, baseURL!, vp);
      const page = await ctx.newPage();
      await openV2(page, VER2_COLD);
      await closePop(page);
      const r = await warm(page);
      expect(r.panel, "population: the panel is showing").toBe(true);
      expect(r.eta).toBe("3 more queries needed. Send with your versions and this fills in by itself.");
      await ctx.close();
    });

    test("W4 — the empty state still hides the band", async ({ browser, baseURL }) => {
      test.skip(!run("W4"));
      const ctx = await ctxFor(browser, baseURL!, vp);
      const page = await ctx.newPage();
      await openV2(page, VER2_FRESH);
      await closePop(page);
      expect(await page.locator('[data-vv2="empty"]').count(), "population: the empty state is showing").toBe(1);
      const r = await warm(page);
      expect(r.band || r.panel, "no band, no panel").toBe(false);
      await ctx.close();
    });

    /* ══ v2.2 — the title card, the tinted list panel, the empty states (design-refs/versions-v2-2, S31–S37) ══ */
    const card = async (page: Page) => page.evaluate(() => {
      const c = document.querySelector('[data-vv2="title"]');
      const t = (s: string) => c?.querySelector(s)?.textContent?.replace(/\s+/g, " ").trim() ?? null;
      return {
        card: !!c,
        hero: document.querySelectorAll('[data-vv2="header"], .mh.vh, #msH1').length,
        donut: document.querySelectorAll('[data-vv2="donut"], .hpie, .mh-r').length,
        h1: t("h1"), tag: t(".hb-tag"), line: t(".hb-tx > p"),
        buttons: [...(c?.querySelectorAll("button") ?? [])].map((b) => b.textContent?.replace(/\s+/g, " ").trim()),
      };
    });

    test("T1 — no header hero and no donut; the title card states Versions, PRO, the title and both buttons", async ({ browser, baseURL }) => {
      test.skip(!run("T1"));
      const ctx = await ctxFor(browser, baseURL!, vp);
      const page = await ctx.newPage();
      await openV2(page);
      await closePop(page);
      expect(await page.locator('[data-vv2="row"]').count(), "population: versions on file").toBeGreaterThan(0);
      const a = await card(page);
      console.log(`T1 full ${vp.width}`, JSON.stringify(a));
      expect(a.card, "the title card is on the page").toBe(true);
      expect(a.hero, "the header hero is gone from the DOM").toBe(0);
      expect(a.donut, "the donut is gone from the DOM").toBe(0);
      expect(a.h1).toBe("Versions Pro");
      expect(a.tag).toBe("Pro");
      expect(a.line).toBe("Save each version of Tide Tables as it changes. QueryHawk records which one went out with every query, so you can see which gets agents asking for more.");
      expect(a.buttons).toEqual(["+ New version", "How it works"]);
      await openV2(page, VER2_FRESH);
      await closePop(page);
      expect(await page.locator('[data-vv2="empty"]').count(), "population: a book with no versions").toBe(1);
      const b = await card(page);
      console.log(`T1 fresh ${vp.width}`, JSON.stringify(b));
      expect(b.buttons).toEqual(["+ Save your first version", "How it works"]);
      expect(b.line).toContain("Dead Reckoning");
      await page.locator('[data-vv2="title"] [data-vv2="how"]').click();
      await expect(page.locator(".cx-explain h4")).toHaveText("How version tracking works", { timeout: 5000 });
      await ctx.close();
    });

    test("T2 — the list section sits in the tinted panel, heading row and every card inside", async ({ browser, baseURL }) => {
      test.skip(!run("T2"));
      const ctx = await ctxFor(browser, baseURL!, vp);
      const page = await ctx.newPage();
      await openV2(page);
      await closePop(page);
      const r = await page.evaluate(() => {
        const sec = document.querySelector<HTMLElement>('[data-vv2="list-sec"]');
        const rows = [...document.querySelectorAll('[data-vv2="row"]')];
        return { bg: sec ? getComputedStyle(sec).backgroundColor : null, radius: sec ? getComputedStyle(sec).borderTopLeftRadius : null,
          head: !!sec?.querySelector("#msRH"), rows: rows.length, inside: rows.filter((x) => sec?.contains(x)).length,
          sep: (() => { const e = sec?.querySelector(".db-sep span"); return e ? getComputedStyle(e).color : null; })() };
      });
      console.log(`T2 ${vp.width}`, JSON.stringify(r));
      expect(r.rows, "population: cards").toBeGreaterThan(0);
      expect(r.bg).toBe("rgb(232, 236, 242)");
      expect(r.radius).toBe("22px");
      expect(r.head).toBe(true);
      expect(r.inside, "every card is inside the panel").toBe(r.rows);
      expect(r.sep).toBe("rgba(42, 58, 82, 0.6)");
      await ctx.close();
    });

    test("T3 — empty, no queries: a hairline container, Original 'None yet', the dashed row opens the first save, Original saved with it", async ({ browser, baseURL }) => {
      test.skip(!run("T3"));
      fx("--seed");
      const before = fx("--ms", VER2_FRESH);
      const ctx = await ctxFor(browser, baseURL!, vp);
      const page = await ctx.newPage();
      const errs: string[] = [];
      page.on("pageerror", (e) => errs.push(e.message));
      page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
      await openV2(page, VER2_FRESH);
      await closePop(page);
      const r = await page.evaluate(() => {
        const ev = document.querySelector<HTMLElement>('[data-vv2="empty"]');
        const t = (s: string) => ev?.querySelector(s)?.textContent?.replace(/\s+/g, " ").trim() ?? null;
        return { ev: !!ev, bg: ev ? getComputedStyle(ev).backgroundColor : null, ring: ev ? getComputedStyle(ev).boxShadow : null,
          h2: t("h2"), sub: t('[data-vv2="ev-sub"]'), q: t('[data-vv2="ev-q"]'), add: t('[data-vv2="first"]'), foot: t(".ev-foot"),
          heads: [...(ev?.querySelectorAll(".ev-h span") ?? [])].map((x) => x.textContent) };
      });
      console.log(`T3 ${vp.width}`, JSON.stringify(r));
      expect(r.ev, "population: the empty state").toBe(true);
      expect(r.bg, "a hairline container: no fill").toBe("rgba(0, 0, 0, 0)");
      expect(r.ring).toContain("rgba(28, 19, 15, 0.14)");
      expect(r.h2).toBe("No versions yet");
      expect(r.sub).toBe("Your list will start with two: your original manuscript, and your first change to it.");
      expect(r.heads).toEqual(["Version", "What changed", "Words", "Queries sent"]);
      expect(r.q).toBe("None yet");
      for (const part of ["Your first version", "Starts from Original", "e.g. Cut the prologue", "Opens on the ferry at dawn", "+ Save your first version"]) expect(r.add, `the dashed row says "${part}"`).toContain(part);
      expect(r.foot).toBe("A version is the same story told a different way. A new book is a new manuscript.");
      await page.locator('[data-vv2="first"]').click();
      await page.waitForSelector('[data-vv2="name"]');
      const note = await page.locator('[data-vv2="first-note"] p').innerText();
      expect(note).toBe("We’ll save your original manuscript as Original too, so this version has somewhere to start from.");
      await page.locator('[data-vv2="name"]').fill("Ferry at dawn");
      await page.locator('[data-vv2="change-in"]').fill("Opens on the ferry at dawn");
      await page.keyboard.press("Enter");
      /* wait for the re-render: the line is read after Enter adds the change */
      await expect(page.locator("#vReady")).toHaveText("Ready. Original is saved too.", { timeout: 5000 });
      const subs = await page.locator("#cgPv .ln-v small").allTextContents();
      expect(subs[0], "the diagram's parent sub-line").toBe("Your original manuscript");
      await page.locator('[data-vv2="save"]').click();
      await page.waitForTimeout(1500);
      expect(await page.locator(".sa-toast").first().innerText()).toContain("Saved Ferry at dawn, and Original with it.");
      const ms = JSON.parse(fx("--ms", VER2_FRESH));
      expect(ms.bookVersions.map((v: { name: string; num: number; original?: boolean }) => [v.name, v.num, !!v.original])).toEqual([["Original", 0, true], ["Ferry at dawn", 1, false]]);
      expect(errs, "no console errors").toEqual([]);
      await toastUndo(page);
      expect(fx("--ms", VER2_FRESH), "Undo restores the book with no versions").toBe(before);
      await ctx.close();
    });

    test("T4 — empty, queries already out: the line and Original's queries name them", async ({ browser, baseURL }) => {
      test.skip(!run("T4"));
      const ctx = await ctxFor(browser, baseURL!, vp);
      const page = await ctx.newPage();
      await openV2(page, VER2_PRE);
      await closePop(page);
      const r = await page.evaluate(() => ({
        sub: document.querySelector('[data-vv2="ev-sub"]')?.textContent?.replace(/\s+/g, " ").trim() ?? null,
        q: [document.querySelector('[data-vv2="ev-q"] b')?.textContent ?? null, document.querySelector('[data-vv2="ev-q"] small')?.textContent ?? null],
        bold: document.querySelector('[data-vv2="ev-sub"] b')?.textContent ?? null,
      }));
      console.log(`T4 ${vp.width}`, JSON.stringify(r));
      expect(r.sub).toBe("You’ve already sent 4 queries. When you save your first version, we’ll count them towards your Original. If any went out differently, it’s easy to change.");
      expect(r.bold).toBe("4 queries");
      expect(r.q).toEqual(["4", "already out · they’ll count here"]);
      await ctx.close();
    });

    test("T5 — the comparisons note only with no versions; warming with fewer than two ready; the full section otherwise", async ({ browser, baseURL }) => {
      test.skip(!run("T5"));
      const ctx = await ctxFor(browser, baseURL!, vp);
      const page = await ctx.newPage();
      const read = () => page.evaluate(() => ({
        note: document.querySelectorAll('[data-vv2="compare-note"]').length,
        warming: document.querySelectorAll('[data-vv2="warming"]').length,
        state: document.querySelector('[data-vv2="tracking"]')?.getAttribute("data-state") ?? null,
        noteText: document.querySelector('[data-vv2="compare-note"]')?.textContent?.replace(/\s+/g, " ").trim() ?? null,
        tiles: [...document.querySelectorAll('[data-vv2="compare-note"] figcaption b')].map((b) => b.textContent),
      }));
      await openV2(page, VER2_FRESH); await closePop(page);
      const a = await read();
      await openV2(page, VER2_WARM); await closePop(page);
      const b = await read();
      await openV2(page); await closePop(page);
      const c = await read();
      console.log(`T5 ${vp.width}`, JSON.stringify({ a, b, c }));
      expect(a).toMatchObject({ note: 1, warming: 0, state: null });
      for (const part of ["Tracking & performance", "Your versions, compared, right here", "Once two versions have each gone out with 5 queries, this page shows which one gets agents asking for more.", "Sort by asked for more, most sent or fastest replies.", "Every version side by side, ranked by requests.", "Sent, replied, asked for more, offers."]) expect(a.noteText, `the note says "${part}"`).toContain(part);
      expect(a.tiles).toEqual(["A card for every version", "A league table", "How far each one gets"]);
      expect(b).toMatchObject({ note: 0, warming: 1, state: "warming" });
      expect(c).toMatchObject({ note: 0, warming: 0, state: "full" });
      await ctx.close();
    });

    test("T6 — the guide's step 1 spotlight lands on a visible button, empty and populated", async ({ browser, baseURL }) => {
      test.skip(!run("T6"));
      fx("--guide-reset");
      const ctx = await ctxFor(browser, baseURL!, vp);
      const page = await ctx.newPage();
      for (const ms of [VER2_FRESH, undefined]) {
        await openV2(page, ms);
        const pill = page.locator('[data-pck="pill"]');
        await expect(pill).toBeVisible({ timeout: 10_000 });
        if (!(await page.locator('[data-pck="popover"]').count())) await pill.click();
        await page.locator('[data-pck="item"][data-k="add"] > button').click();
        await page.waitForSelector('[data-pck="dim"][data-hole]', { timeout: 8000 });
        await page.waitForTimeout(700);
        const r = await page.evaluate(() => {
          const h = JSON.parse(document.querySelector('[data-pck="dim"]')!.getAttribute("data-hole")!);
          const x = h.left + h.width / 2, y = h.top + h.height / 2;
          const hit = document.elementsFromPoint(x, y).find((e) => !e.closest('[data-pck="spot"]')) as HTMLElement | undefined;
          const btn = hit?.closest<HTMLElement>('[data-vv2="title"] button, button[data-vv2="first"]') ?? null;
          return { hole: h, inView: y > 0 && y < innerHeight && x > 0 && x < innerWidth, btn: btn ? btn.textContent?.replace(/\s+/g, " ").trim() : null, where: btn?.closest('[data-vv2="title"]') ? "title" : btn ? "empty" : hit?.className ?? null };
        });
        console.log(`T6 ${ms ?? "ver2-ms"} ${vp.width}`, JSON.stringify(r));
        expect(r.inView, "the hole is on screen").toBe(true);
        expect(r.btn, "the hole's centre is a visible Add button").not.toBeNull();
        await page.keyboard.press("Escape");
      }
      await ctx.close();
      fx("--guide-reset");
    });

    test("S29 — Free sees the lock over an inert, blurred page that opens nothing", async ({ browser, baseURL }) => {
      test.skip(!run("S29"));
      const ctx = await ctxFor(browser, baseURL!, vp);
      const page = await ctx.newPage();
      await openV2(page, undefined, { free: true });
      const r = await page.evaluate(() => {
        const under = document.querySelector<HTMLElement>('[data-vv2="under"]');
        return { state: document.querySelector('[data-vv2="page"]')?.getAttribute("data-state"), lock: !!document.querySelector('[data-vv2="lock"]'), inert: under?.hasAttribute("inert"), filter: under ? getComputedStyle(under).filter : "" };
      });
      expect(r).toEqual({ state: "locked", lock: true, inert: true, filter: expect.stringMatching(/blur/) });
      await page.locator('[data-vv2="row"]').first().click({ force: true, timeout: 3000 }).catch(() => {});
      expect(await page.locator('[data-vv2="drawer"].on, .cx-drw.on').count(), "nothing opens under the lock").toBe(0);
      await page.locator('[data-vv2="plans"]').click();
      await expect(page).toHaveURL(/\/plans/);
      await page.evaluate(() => sessionStorage.removeItem("sa.dev.versionsFree"));
      await ctx.close();
    });
  });
}
