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
import { ctxFor, openV2, scrollInto, VER2_PRE, VPS } from "./ver2Lib";

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
    test("S01 — header, donut and banner state what the fixture holds", async ({ browser, baseURL }) => {
      test.skip(!run("S01"));
      const f = facts();
      expect(f.live, "fixture: versions to show").toBeGreaterThan(2);
      const ctx = await ctxFor(browser, baseURL!, vp);
      const page = await ctx.newPage();
      await openV2(page);
      await closePop(page);
      const r = await page.evaluate(() => ({
        title: document.querySelector("#vTitle")?.textContent,
        total: document.querySelector('[data-vv2="donut"] .hpie-n')?.textContent,
        legend: [...document.querySelectorAll('[data-vv2="donut"] .hpie-r')].map((e) => [e.querySelector("span")?.textContent, e.querySelector("b")?.textContent]),
        banner: document.querySelector('[data-vv2="banner"] .wb-h')?.textContent,
        /* the title's ink against the donut card: the ref's own title spills 3px past its box at 1280 into the gap, so
           the claim is that it never reaches the card, not that it fits its box */
        h1: (() => { const s = document.querySelector("#vTitle") as HTMLElement; const card = document.querySelector('[data-vv2="donut"] .hpie, [data-vv2="donut"] .mcard') as HTMLElement; return s && card ? { inkRight: s.getBoundingClientRect().right, cardLeft: card.getBoundingClientRect().left } : null; })(),
      }));
      console.log(`S01 ${vp.width}`, JSON.stringify(r));
      expect(r.title).toBe(`${f.live} versions on file`);
      expect(Number(r.total)).toBe(f.sentTotal);
      const sum = r.legend.reduce((a, l) => a + Number(l[1]), 0);
      expect(sum, "the legend sums to the total").toBe(f.sentTotal);
      expect(r.legend.find((l) => l[0] === "Not recorded")?.[1]).toBe(String(f.unrecorded));
      expect(r.banner).toContain(`${f.unrecorded} queries are out with agents`);
      expect(r.h1!.inkRight, "the title ends before the donut card").toBeLessThan(r.h1!.cardLeft);
      /* the faces, read off the page: a token cycle once made every one resolve to nothing with every other lock green */
      const type = await page.evaluate(() => {
        const f = (s: string) => { const e = document.querySelector(s); return e ? { family: getComputedStyle(e).fontFamily, size: parseFloat(getComputedStyle(e).fontSize) } : null; };
        return { h1: f("#msH1"), h2: f("#msRH"), body: f('[data-vv2="page"] .mh-by em'), pill: f('[data-vv2="list"] .db-ch li') };
      });
      console.log(`S01 type ${vp.width}`, JSON.stringify(type));
      expect(type.h1!.family).toMatch(/Special Elite/);
      expect(type.h1!.size).toBeGreaterThanOrEqual(40);
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
      expect(await page.locator('[data-vv2="pre-note"]').innerText()).toContain("You’ve already sent 4 queries.");
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
      const legend = await page.evaluate(() => [...document.querySelectorAll('[data-vv2="donut"] .hpie-r')].map((e) => [e.querySelector("span")?.textContent, e.querySelector("b")?.textContent]));
      expect(legend).toEqual([["Original", "4"]]);
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
