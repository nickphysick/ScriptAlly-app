/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ MANUSCRIPTS v13 — the shelf, the version tiles, Recent activity (M1–M8), and v12's hero locks ══
 *
 * Ref: design-refs/manuscripts/manuscripts-v13.html (hash-enrolled; it renders its own chosen state
 * — Shelf, ink bands — so no attribute is set) and its geometry json. Profile LIGHT: these locks run
 * at 1440, with 1280 where the prompt marks it.
 *
 * ⚠️ THIS FILE REPLACES manuscriptsV12.measure.ts (v13 Phase 4). The v12 locks that still hold are
 * carried here under their own names — L1 (rewritten: the cover meets the COLUMN's right edge now
 * that the rail is gone), L2, L5, L6 (the empty state, F8), L9 (rewritten: a series reads
 * "Standalone"), L11 — and the rest are retired by name in tests/e2e/RETIRED-manuscripts-v13.md
 * (L3 → M5, L4 → M8, L7, L8, L10, the rail half of the geometry cases).
 *
 * ⚠️ TWO DEDICATED ACCOUNTS (ms13Fixture.mjs). The seeder runs in `beforeAll` and again in
 * `afterAll`: M5 saves a version and M7 saves details, and both writes narrate a feed row, so the
 * account is put back whole rather than patched. `MS13_SEEDED=1` skips both, for a run that is
 * known to write nothing (the red run against the tip, where every lock fails before its write).
 *
 * ⚠️ ONE PASSWORD SIGN-IN PER PORT, NOT PER RUN, AND NOT SERIAL MODE. Firebase keeps its session in
 * IndexedDB, which `storageState` only carries when asked (`indexedDB: true`, Playwright ≥ 1.51 —
 * this repo is on 1.62). So the account signs in once, the state is saved under `.auth/` keyed by
 * the preview's port, and every case opens its own context from it. That is what lets the locks run
 * in default mode: in SERIAL mode a red lock skips every lock after it, so a red run against the
 * tip would prove one lock and leave seven unproved; here a red lock restarts the worker and the
 * next one still runs, without feeding the sign-in throttle (house memory: e2e-signin-throttle).
 *
 * ⚠️ A LOCK THAT FINDS NO SUBJECT HAS FAILED. Every case asserts its population before its claim,
 * and the floor case refuses a run that asserted less than it claims to.
 */
import { test, expect, type Page, type BrowserContext, type Browser } from "@playwright/test";
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { visiblePage, KILL_MOTION, KILL_MOTION_ID } from "./measure";
import { assertLocalBundleIsDev } from "./bundleGuard";
import { MS_ID, FILLED_EMAIL, EMPTY_EMAIL, COMPS, EXPECT, OTHER_MS_ID } from "./ms13Fixture.mjs";

test.setTimeout(150_000);

let asserts = 0;
const ck = (n = 1) => { asserts += n; };
/* the count a green run makes (logged by the floor case) less a margin for a lock that legitimately
   finds one fewer subject — a run that measured materially less than last time is red */
const FLOOR = 175;

const readPw = (): string => {
  if (process.env.SA_E2E_PASSWORD) return process.env.SA_E2E_PASSWORD;
  for (const line of readFileSync(resolve(process.cwd(), ".env.local"), "utf8").split("\n")) {
    const m = /^\s*SA_E2E_PASSWORD\s*=\s*(.*)$/.exec(line);
    if (m) return m[1].trim().replace(/^["']|["']$/g, "");
  }
  throw new Error("no SA_E2E_PASSWORD");
};

const SEEDED = process.env.MS13_SEEDED === "1";
const seed = (args = "") => {
  if (SEEDED) return;
  execSync(`node tests/e2e/seedManuscriptsV13.mjs ${args}`, { cwd: process.cwd(), stdio: "pipe", timeout: 240_000 });
};

async function signInAs(page: Page, email: string) {
  await assertLocalBundleIsDev();
  await page.goto("/#/signin");
  await page.locator("#au-email").fill(email);
  await page.locator("#au-pw").fill(readPw());
  await page.getByRole("button", { name: /^Sign in$/ }).last().click();
  await expect(page.locator(".ws-window").first()).toBeVisible({ timeout: 30_000 });
}

/**
 * A signed-in context for one of the two accounts — from the saved state where it still works, else
 * one password sign-in whose state (IndexedDB included) is saved for the next case.
 */
async function accountContext(browser: Browser, baseURL: string, email: string, tag: string): Promise<{ ctx: BrowserContext; page: Page }> {
  const port = new URL(baseURL).port || "443";
  const file = resolve(process.cwd(), `tests/e2e/.auth/ms13-${tag}-${port}.json`);
  const viewport = { width: 1440, height: 900 };
  if (existsSync(file)) {
    const ctx = await browser.newContext({ storageState: file, viewport, baseURL });
    const page = await ctx.newPage();
    await assertLocalBundleIsDev();
    await page.goto("/manuscripts");
    const signedIn = await page.locator(".ws-window").first().waitFor({ state: "visible", timeout: 20_000 })
      .then(() => true).catch(() => false);
    if (signedIn) return { ctx, page };
    await ctx.close();
  }
  const ctx = await browser.newContext({ viewport, baseURL });
  const page = await ctx.newPage();
  await signInAs(page, email);
  await ctx.storageState({ path: file, indexedDB: true });
  return { ctx, page };
}
const filledContext = (browser: Browser, baseURL: string) => accountContext(browser, baseURL, FILLED_EMAIL, "filled");

async function openMs(page: Page, viewport: { width: number; height: number }, msId: string = MS_ID) {
  await page.setViewportSize(viewport);
  await page.evaluate((id) => localStorage.setItem("scriptally_active_manuscript_id", id), msId);
  await page.goto("/manuscripts");
  await page.addStyleTag({ content: `/*${KILL_MOTION_ID}*/${KILL_MOTION}` });
  await expect(page.locator(".ws-window").first()).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(2200);
  return visiblePage(page, ".msv12-wpg");
}

type Box = { x: number; y: number; w: number; h: number; r: number; b: number };
/** Boxes of every match inside the visible page, in document order. */
const boxes = (page: Page, sel: string): Promise<Box[]> =>
  page.evaluate((sel) => {
    const root = (window as unknown as { __saVisRoot: () => Element }).__saVisRoot();
    return [...root.querySelectorAll(sel)].map((el) => {
      const b = el.getBoundingClientRect();
      return { x: b.x, y: b.y, w: b.width, h: b.height, r: b.right, b: b.bottom };
    });
  }, sel);
const one = async (page: Page, sel: string): Promise<Box | null> => (await boxes(page, sel))[0] ?? null;

let ctx: BrowserContext;
let page: Page;

test.beforeAll(async ({ browser }, info) => {
  seed();
  const baseURL = String(info.project.use.baseURL ?? "");
  ({ ctx, page } = await filledContext(browser, baseURL));
});
test.afterAll(async () => {
  await ctx?.close();
  seed("--only filled");
});

/* ══ M1 · one column — no rail; every card shares the hero's left edge and width ═══════════════ */
for (const vp of [{ width: 1440, height: 900 }, { width: 1280, height: 800 }]) {
  test(`M1 one-column @ ${vp.width}`, async () => {
    await openMs(page, vp);
    const rail = await page.evaluate(() => {
      const root = (window as unknown as { __saVisRoot: () => Element }).__saVisRoot();
      return root.querySelectorAll('.msv12-rail, [data-msv12="rail"], .msv13-rail').length;
    });
    expect(rail, "a rail is still in the DOM").toBe(0);
    const hero = await one(page, '[data-msv12="hero"]');
    expect(hero, "the hero renders").toBeTruthy();
    /* ⚠️ THE PAGE SITS IN THE SHARED COLUMN — the gutter is `.wpg-scroll > *`'s padding-inline, the
       grid's own clamp(28px, 3.2vw, 52px) of the WINDOW. A page rule that sets horizontal padding on
       its root zeroes it (v12's `padding: 28px 0 120px` did, from 26 Sep to v13) and every card then
       agrees with the hero while all of them run 46px too wide — which the comparisons below cannot
       see, because they compare the page with itself. */
    const col = await page.evaluate(() => {
      const root = (window as unknown as { __saVisRoot: () => Element }).__saVisRoot();
      const el = root.querySelector('[data-msv12="page"]') as HTMLElement;
      const cs = getComputedStyle(el);
      return { x: el.getBoundingClientRect().x, pl: parseFloat(cs.paddingLeft), pr: parseFloat(cs.paddingRight), vw: window.innerWidth };
    });
    const gutter = Math.min(52, Math.max(28, 0.032 * col.vw));
    expect(Math.abs(col.pl - gutter), `the shared gutter applies on the left (${col.pl} vs ${gutter})`).toBeLessThanOrEqual(0.5);
    expect(Math.abs(col.pr - gutter), `…and on the right (${col.pr} vs ${gutter})`).toBeLessThanOrEqual(0.5);
    expect(Math.abs(hero!.x - (col.x + col.pl)), "the hero starts at the column's padded edge").toBeLessThanOrEqual(1);
    ck(3);
    const parts = [
      ["the shelf", '[data-msv13="shelf"]'],
      ["Versions", '[data-msv13-card="versions"]'],
      ["Recent activity", '[data-msv13-card="activity"]'],
    ] as const;
    ck(2);
    for (const [name, sel] of parts) {
      const b = await one(page, sel);
      expect(b, `${name} renders`).toBeTruthy();
      expect(Math.abs(b!.x - hero!.x), `${name} left vs the hero's @${vp.width}`).toBeLessThanOrEqual(1);
      expect(Math.abs(b!.w - hero!.w), `${name} width vs the hero's @${vp.width}`).toBeLessThanOrEqual(1);
      ck(3);
    }
  });
}

/* ══ M2 · the shelf — three cards in one row, equal heights, gap 16 ═══════════════════════════ */
for (const vp of [{ width: 1440, height: 900 }, { width: 1280, height: 800 }]) {
  test(`M2 shelf @ ${vp.width}`, async () => {
    await openMs(page, vp);
    const cards = await boxes(page, '[data-msv13="shelf"] > [data-msv13-card]');
    expect(cards.length, "three shelf cards").toBe(3);
    ck(1);
    const [a, b, c] = cards;
    expect(Math.abs(a.y - b.y) <= 1 && Math.abs(b.y - c.y) <= 1, "one row").toBe(true);
    expect(Math.abs(a.h - b.h) <= 1 && Math.abs(b.h - c.h) <= 1, `equal heights ${a.h}/${b.h}/${c.h}`).toBe(true);
    expect(Math.abs(b.x - a.r - 16), "gap 1→2").toBeLessThanOrEqual(1);
    expect(Math.abs(c.x - b.r - 16), "gap 2→3").toBeLessThanOrEqual(1);
    ck(4);
    if (vp.width === 1440) {
      /* the mock's 1.1fr 1fr 1fr */
      expect(a.w - b.w, "the first card is wider").toBeGreaterThan(8);
      expect(Math.abs(b.w - c.w), "the other two match").toBeLessThanOrEqual(1);
    } else {
      /* ⚠️ THE MOCK, NOT THE PROMPT'S TEXT: its `@media (max-width:1360px)` sets 1fr 1fr 1fr, and the
         page's shelf width at a 1280 viewport is inside that threshold (a container query here —
         see msv12.css). The prompt's M2 says "the first is wider" at both widths; the mock wins. */
      expect(Math.abs(a.w - b.w) <= 1 && Math.abs(b.w - c.w) <= 1, `equal thirds ${a.w}/${b.w}/${c.w}`).toBe(true);
    }
    ck(2);
  });
}

/* ══ M3 · bands — every container header is the anthracite band; shelf links navigate ══════════ */
test("M3 bands", async () => {
  await openMs(page, { width: 1440, height: 900 });
  const bands = await page.evaluate(() => {
    const root = (window as unknown as { __saVisRoot: () => Element }).__saVisRoot();
    return [...root.querySelectorAll("[data-msv13-card]")].map((card) => {
      const band = card.querySelector(':scope > [data-msv13="band"]') as HTMLElement | null;
      if (!band) return { card: card.getAttribute("data-msv13-card"), band: false as const };
      const cs = getComputedStyle(band);
      return { card: card.getAttribute("data-msv13-card"), band: true as const, bg: cs.backgroundColor, h: band.getBoundingClientRect().height };
    });
  });
  expect(bands.map((b) => b.card).sort(), "five containers").toEqual(["activity", "comps", "materials", "packages", "versions"]);
  ck(1);
  /* ⚠️ THE HEIGHT IS THE MOCK'S, READ FROM THE MOCK — NOT THE PROMPT'S "52" FOR EVERY BAND. Rendered,
     the ref's Recent activity band is 56.125: its "Query Centre ›" link is a flex item, so it is
     blockified and its 5px padding counts, which a 52 for every band would call a fault in a page
     drawn exactly to the mock. The other four are 52. One ruler, one browser, so neither side's
     number is restated here. */
  const ref = await ctx.newPage();
  await ref.setViewportSize({ width: 1440, height: 900 });
  await ref.goto(pathToFileURL(resolve(process.cwd(), "design-refs/manuscripts/manuscripts-v13.html")).href);
  await ref.waitForTimeout(800);
  const refH = await ref.evaluate(() => {
    const key: Record<string, string> = { "c-comps": "comps", "c-mats": "materials", "c-pkgs": "packages", "c-ver": "versions", "c-act": "activity" };
    const out: Record<string, number> = {};
    for (const c of document.querySelectorAll(".card")) {
      if (c.getBoundingClientRect().width === 0) continue;
      const k = Object.keys(key).find((x) => c.classList.contains(x));
      const ch = c.querySelector(":scope > .ch");
      if (k && ch) out[key[k]] = ch.getBoundingClientRect().height;
    }
    return out;
  });
  await ref.close();
  expect(Object.keys(refH).sort(), "the mock's five bands were read").toEqual(["activity", "comps", "materials", "packages", "versions"]);
  ck(1);
  for (const b of bands) {
    expect(b.band, `${b.card} has the band`).toBe(true);
    if (!b.band) continue;
    expect(b.bg, `${b.card} band background`).toBe("rgb(42, 58, 82)");
    expect(Math.abs(b.h - refH[b.card!]), `${b.card} band height ${b.h} vs the mock's ${refH[b.card!]}`).toBeLessThanOrEqual(1);
    expect(b.h, `${b.card} band is at least the 52 the band states`).toBeGreaterThanOrEqual(51);
    ck(4);
  }
  const routes: Record<string, string> = { comps: "/manuscripts/comps", materials: "/manuscripts/packages", packages: "/manuscripts/packages" };
  for (const [card, path] of Object.entries(routes)) {
    const pre = await openMs(page, { width: 1440, height: 900 });
    const link = page.locator(`${pre}[data-msv13-card="${card}"] [data-msv13="band-link"]`);
    expect(await link.count(), `${card} band carries a link`).toBe(1);
    await link.click();
    await expect.poll(() => new URL(page.url()).pathname, { message: `${card} link navigates` }).toBe(path);
    ck(2);
  }
});

/* ══ M4 · comp rows — the right tag per inQuery; the fact equals the tally; off rows faded ══════ */
test("M4 comps-rows", async () => {
  await openMs(page, { width: 1440, height: 900 });
  const r = await page.evaluate(() => {
    const root = (window as unknown as { __saVisRoot: () => Element }).__saVisRoot();
    const card = root.querySelector('[data-msv13-card="comps"]');
    if (!card) return null;
    return {
      fact: (card.querySelector('[data-msv13="comp-fact"]') as HTMLElement | null)?.innerText ?? "",
      rows: [...card.querySelectorAll('[data-msv13="crow"]')].map((row) => {
        const tab = row.querySelector('[data-msv13="ctab"]') as HTMLElement | null;
        return {
          title: (row.querySelector('[data-msv13="ctitle"]') as HTMLElement | null)?.innerText ?? "",
          tag: (row.querySelector('[data-msv13="ctag"]') as HTMLElement | null)?.innerText ?? "",
          off: row.getAttribute("data-off") === "1",
          tabBg: tab ? getComputedStyle(tab).backgroundColor : "",
        };
      }),
    };
  });
  expect(r, "the comps card renders").toBeTruthy();
  expect(r!.rows.length, "three rows").toBe(3);
  ck(2);
  for (const row of r!.rows) {
    const c = COMPS.find((x) => x.title === row.title);
    expect(c, `row "${row.title}" is a fixture comp`).toBeTruthy();
    expect(row.tag.toLowerCase(), `${row.title} tag`).toBe(c!.inQuery ? "in letter" : "not in letter");
    expect(row.off, `${row.title} faded iff not in the letter`).toBe(!c!.inQuery);
    ck(3);
  }
  expect(r!.fact, "the fact line states the tally").toContain(`${EXPECT.compFact.inLetter} of ${EXPECT.compFact.total}`);
  const on = r!.rows.find((x) => !x.off)!;
  const off = r!.rows.find((x) => x.off)!;
  expect(off.tabBg, "the not-in-letter tab is drawn differently").not.toBe(on.tabBg);
  ck(2);
});

/* ══ M5 · version tiles — newest first, one Current and ringed, counts = versionUsage ══════════ */
const tilesRead = () => page.evaluate(() => {
  const root = (window as unknown as { __saVisRoot: () => Element }).__saVisRoot();
  const card = root.querySelector('[data-msv13-card="versions"]');
  if (!card) return null;
  const tiles = [...card.querySelectorAll("[data-msv13-vtile]")] as HTMLElement[];
  return tiles.map((t) => {
    const n = (k: string) => Number((t.querySelector(`[data-msv13="use-${k}"]`) as HTMLElement | null)?.innerText.replace(/\D/g, "") ?? "-1");
    return {
      vid: t.getAttribute("data-vid"),
      isNew: t.getAttribute("data-msv13-vtile") === "new",
      current: !!t.querySelector('[data-msv13="current-tag"]'),
      shadow: getComputedStyle(t).boxShadow,
      border: getComputedStyle(t).borderStyle,
      name: (t.querySelector('[data-msv13="vname"]') as HTMLElement | null)?.innerText ?? "",
      queried: n("queried"), requested: n("requested"), sent: n("sent"),
      pk: (t.querySelector('[data-msv13="use-pk"]') as HTMLElement | null)?.innerText ?? "",
    };
  });
});
const ringed = (shadow: string) => /1\.5px/.test(shadow);

test("M5 version-tiles", async () => {
  await openMs(page, { width: 1440, height: 900 });
  const tiles = await tilesRead();
  expect(tiles, "the versions card renders").toBeTruthy();
  const real = tiles!.filter((t) => !t.isNew);
  expect(real.map((t) => t.vid), "newest first").toEqual(EXPECT.versionOrder);
  expect(tiles![tiles!.length - 1].isNew, "the last tile is New version").toBe(true);
  expect(tiles![tiles!.length - 1].border, "…and dashed").toBe("dashed");
  ck(3);
  expect(real.filter((t) => t.current).map((t) => t.vid), "exactly one Current").toEqual(["ms13-bv-3"]);
  expect(real.filter((t) => ringed(t.shadow)).map((t) => t.vid), "exactly one ringed").toEqual(["ms13-bv-3"]);
  ck(2);
  for (const t of real) {
    const want = EXPECT.usage[t.vid as keyof typeof EXPECT.usage];
    expect({ q: t.queried, r: t.requested, s: t.sent }, `${t.vid} counts`).toEqual({ q: want.queried, r: want.requested, s: want.sent });
    expect(t.pk.toLowerCase(), `${t.vid} packages`).toBe(want.packages === 0 ? "no packages" : `${want.packages} package${want.packages === 1 ? "" : "s"}`);
    ck(2);
  }
  /* saving a new version puts it first, Current and ringed — then the seeder puts the account back */
  const pre = await visiblePage(page, ".msv12-wpg");
  await page.locator(`${pre}[data-msv13-vtile="new"]`).click();
  const dlg = page.locator('[data-msv12="new-version-dialog"]');
  await expect(dlg).toBeVisible({ timeout: 10_000 });
  await dlg.getByLabel(/^name/i).fill("Tighter midpoint");
  await dlg.getByLabel(/what changed/i).fill("Two chapters cut from the middle.");
  await dlg.getByRole("button", { name: /save version/i }).click();
  await expect(dlg).toHaveCount(0, { timeout: 10_000 });
  await expect(page.getByText("Saved Tighter midpoint and made it current.")).toBeVisible({ timeout: 10_000 });
  await expect.poll(async () => (await tilesRead())?.[0]?.name ?? "", { message: "the new version leads", timeout: 15_000 }).toBe("Tighter midpoint");
  const after = (await tilesRead())!;
  expect(after[0].current && ringed(after[0].shadow), "…Current and ringed").toBe(true);
  expect(after.filter((t) => !t.isNew && t.current).length, "still exactly one Current").toBe(1);
  ck(4);
  seed("--only filled");
});

/* ══ M6 · activity — seven at most, newest first, scoped to this book, a mono date column ═══════ */
test("M6 activity", async () => {
  await openMs(page, { width: 1440, height: 900 });
  const r = await page.evaluate(() => {
    const root = (window as unknown as { __saVisRoot: () => Element }).__saVisRoot();
    const card = root.querySelector('[data-msv13-card="activity"]');
    if (!card) return null;
    return {
      link: (card.querySelector('[data-msv13="band-link"]') as HTMLElement | null)?.innerText ?? "",
      rows: [...card.querySelectorAll('[data-msv13="arow"]')].map((row) => ({
        qid: row.getAttribute("data-qid") || null,
        ms: row.getAttribute("data-ms"),
        at: Number(row.getAttribute("data-at")),
        dateFont: getComputedStyle(row.querySelector('[data-msv13="adate"]') as Element).fontFamily,
      })),
    };
  });
  expect(r, "the activity card renders").toBeTruthy();
  expect(r!.rows.length, "seven rows").toBe(7);
  ck(2);
  expect(r!.rows.map((x) => x.qid), "the seven newest on this book, in order").toEqual(EXPECT.activityTop7);
  expect(r!.rows.every((x) => x.ms === MS_ID), "every row is this book's").toBe(true);
  expect(r!.rows.some((x) => x.qid === "ms13-q-8" || x.ms === OTHER_MS_ID), "the other book's newer record").toBe(false);
  ck(3);
  for (let i = 1; i < r!.rows.length; i += 1) {
    expect(r!.rows[i].at, `row ${i} is not newer than row ${i - 1}`).toBeLessThanOrEqual(r!.rows[i - 1].at);
  }
  ck(1);
  expect(r!.rows.every((x) => /JetBrains Mono/i.test(x.dateFont)), "the date column is mono").toBe(true);
  expect(r!.link, "more than seven exist").toMatch(/All activity in the Query Centre/);
  ck(2);
});

/* ══ M7 · edit details — under the facts; every field saves and the hero reflects it ═══════════ */
test("M7 edit-details", async () => {
  const pre = await openMs(page, { width: 1440, height: 900 });
  const btn = await one(page, '[data-msv12="edit-details"]');
  const facts = await one(page, '[data-msv12="facts"]');
  expect(btn && facts, "the button and the facts render").toBeTruthy();
  expect(btn!.y, "the button sits below the facts").toBeGreaterThan(facts!.b);
  expect(Math.abs(btn!.x - facts!.x), "…left-aligned with them").toBeLessThanOrEqual(1);
  ck(3);
  await page.locator(`${pre}[data-msv12="edit-details"]`).click();
  const dlg = page.locator('[data-msv12="edit-dialog"]');
  await expect(dlg).toBeVisible({ timeout: 10_000 });
  const v = {
    title: "Harbour of Glass, revised", author: "Isla Morven-Reid", words: "61500", genre: "Crime",
    logline: "A skipper, a missing brother, one tide.", setting: "Bantry Bay, 1998", series: "The Harbour books",
  };
  await dlg.getByLabel(/^title/i).fill(v.title);
  await dlg.getByLabel(/author name/i).fill(v.author);
  await dlg.getByLabel(/word count/i).fill(v.words);
  await dlg.getByLabel(/^genre/i).fill(v.genre);
  await dlg.getByLabel(/age category/i).selectOption("Young Adult");
  await dlg.getByLabel(/logline/i).fill(v.logline);
  await dlg.getByLabel(/setting/i).fill(v.setting);
  await dlg.getByLabel(/series/i).fill(v.series);
  await dlg.getByRole("button", { name: /^on submission$/i }).click();
  await dlg.getByRole("button", { name: /save details/i }).click();
  await expect(dlg).toHaveCount(0, { timeout: 15_000 });
  const hero = page.locator(`${pre}[data-msv12="hero"]`);
  await expect(hero.locator("h1")).toHaveText(v.title, { timeout: 15_000 });
  const by = (await hero.locator('[data-msv12="byline"]').innerText()).toLowerCase();
  expect(by, "byline: author").toContain(v.author.toLowerCase());
  expect(by, "byline: words").toContain("61,500");
  expect(by, "byline: genre").toContain("crime");
  expect(by, "byline: age").toContain("young adult");
  ck(5);
  await expect(hero.locator('[data-msv12="logline"]')).toHaveText(v.logline);
  await expect(hero.locator('[data-msv12="fact-setting"]')).toContainText(v.setting);
  await expect(hero.locator('[data-msv12="fact-series"]')).toContainText(v.series);
  await expect(hero.locator('[data-msv12="fact-status"]')).toContainText(/on submission/i);
  ck(4);
  seed("--only filled");
});

/* ══ M8 · owed kept — between the hero and the shelf; its button opens the drawer's sent journey ══ */
test("M8 owed-kept", async () => {
  const pre = await openMs(page, { width: 1440, height: 900 });
  const hero = await one(page, '[data-msv12="hero"]');
  const owed = await one(page, '[data-msv12="owed"]');
  const shelf = await one(page, '[data-msv13="shelf"]');
  expect(hero && owed && shelf, "hero, owed list and shelf all render").toBeTruthy();
  expect(owed!.y, "owed starts below the hero").toBeGreaterThanOrEqual(hero!.b - 1);
  expect(owed!.b, "owed ends above the shelf").toBeLessThanOrEqual(shelf!.y + 1);
  ck(3);
  const rows = page.locator(`${pre}[data-msv12="owed-row"]`);
  expect(await rows.count(), "two owed rows").toBe(EXPECT.owed.length);
  const before = (await rows.first().innerText()).replace(/\s+/g, " ");
  await rows.first().locator('[data-msv12="owed-send"]').click();
  const drawer = page.locator('.qad-drawer[data-qad-drawer="sent"]');
  await expect(drawer, "the drawer's I've-sent-it journey").toBeVisible({ timeout: 10_000 });
  /* ⚠️ WAIT FOR OPEN, NOT FOR VISIBLE: the drawer mounts translated off-screen (a box, so "visible")
     and opens two frames later, and its Escape listener attaches only once it is open — a key
     pressed in between lands on nothing and the drawer stays */
  await expect(page.locator(".qad-root.is-open"), "the drawer has opened").toHaveCount(1, { timeout: 10_000 });
  await page.keyboard.press("Escape");
  await expect(drawer).toHaveCount(0, { timeout: 10_000 });
  expect((await rows.first().innerText()).replace(/\s+/g, " "), "closing the drawer wrote nothing").toBe(before);
  ck(3);
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   v12's HERO LOCKS, CARRIED — the hero is v12's desk hero (F5), so what held of it still holds
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

/* ══ L1 · hero-one-row — art, text and cover overlap vertically; the cover ends at the column's edge ══
   v12 asserted "cover right = rail right"; the rail is gone and the hero spans the column, so the
   cover's right edge is the hero's — the page column's padded edge. */
for (const vp of [{ width: 1440, height: 900 }, { width: 1280, height: 800 }]) {
  test(`L1 hero-one-row @ ${vp.width}`, async () => {
    await openMs(page, vp);
    const art = await one(page, '[data-msv12="hero-art"]');
    const text = await one(page, '[data-msv12="hero-text"]');
    const cover = await one(page, '[data-msv12="cover"]');
    const hero = await one(page, '[data-msv12="hero"]');
    expect(art && text && cover && hero, "art, text, cover and hero all render").toBeTruthy();
    ck(1);
    const overlaps = (a: Box, b: Box) => Math.min(a.b, b.b) - Math.max(a.y, b.y);
    expect(overlaps(art!, text!), `art/text overlap @${vp.width}`).toBeGreaterThan(0);
    expect(overlaps(text!, cover!), `text/cover overlap @${vp.width}`).toBeGreaterThan(0);
    expect(overlaps(art!, cover!), `art/cover overlap @${vp.width}`).toBeGreaterThan(0);
    expect(Math.abs(cover!.r - hero!.r), `cover right vs the column's right @${vp.width}`).toBeLessThanOrEqual(1);
    ck(4);
  });
}

/* ══ L2 · art-floats — no mask, no ancestor fill above the page ground, inside its column ═════ */
test("L2 art-floats", async () => {
  await openMs(page, { width: 1440, height: 900 });
  const r = await page.evaluate(() => {
    const root = (window as unknown as { __saVisRoot: () => Element }).__saVisRoot();
    const img = root.querySelector('[data-msv12="hero-img"]') as HTMLElement | null;
    const col = root.querySelector('[data-msv12="hero-art"]') as HTMLElement | null;
    if (!img || !col) return { missing: true as const };
    const cs = getComputedStyle(img);
    const masks = [cs.maskImage, (cs as unknown as Record<string, string>).webkitMaskImage].map((v) => v || "none");
    const fills: string[] = [];
    let el: HTMLElement | null = img.parentElement;
    /* the walk stops at the element that paints the PAGE GROUND — the one fill permitted */
    while (el && !el.classList.contains("wpg-scroll") && !el.classList.contains("msv12-wpg")) {
      const s = getComputedStyle(el);
      const bg = s.backgroundColor;
      const transparent = !bg || bg === "transparent" || /rgba\(\s*\d+,\s*\d+,\s*\d+,\s*0\s*\)/.test(bg);
      if (!transparent || s.backgroundImage !== "none") fills.push(`${el.className}: ${bg} / ${s.backgroundImage.slice(0, 40)}`);
      el = el.parentElement;
    }
    const ib = img.getBoundingClientRect(); const cb = col.getBoundingClientRect();
    const inside = ib.left >= cb.left - 1 && ib.right <= cb.right + 1 && ib.top >= cb.top - 1 && ib.bottom <= cb.bottom + 1;
    return { missing: false as const, masks, fills, inside };
  });
  expect(r.missing, "hero img/column missing").toBe(false);
  if (r.missing) return;
  expect(r.masks, "the art carries a mask").toEqual(["none", "none"]);
  expect(r.fills, "an ancestor paints behind the art").toEqual([]);
  expect(r.inside, "the art leaks outside its column").toBe(true);
  ck(4);
});

/* ══ L5 · statusdot — every status glyph is the app's own StatusDot ═══════════════════════════
   v13 adds the tile footers and the activity rows to the population — the owed rows, the status
   fact, three tiles × three counts and every status record in the activity list. */
test("L5 statusdot", async () => {
  await openMs(page, { width: 1440, height: 900 });
  const r = await page.evaluate(() => {
    const root = (window as unknown as { __saVisRoot: () => Element }).__saVisRoot();
    const wraps = [...root.querySelectorAll("[data-msv12-sd]")];
    const withSvg = wraps.filter((w) => w.querySelector('svg[viewBox="0 0 24 24"]')).length;
    const mockRings = root.querySelectorAll(".dot, .ai.req, .ai.sent, .ai.rep").length;
    return { wraps: wraps.length, withSvg, mockRings };
  });
  expect(r.wraps, "status glyph population").toBeGreaterThanOrEqual(12);
  expect(r.withSvg, "every glyph wrapper holds the real StatusDot").toBe(r.wraps);
  expect(r.mockRings, "no ported .dot rings or .ai stand-ins").toBe(0);
  ck(3);
});

/* ══ L9 · honest-missing — an unset series reads "Standalone"; an unset fact says so and its Add opens the right dialog ══
   v12 asserted "Not recorded" on the series. v13 Phase 2 makes it "Standalone", muted — so the
   "Not recorded" + Add half is measured on the account's SECOND book, which records no setting and
   no version: its Add buttons must open edit-details (with a Setting field) and the version dialog. */
test("L9 honest-missing", async () => {
  let pre = await openMs(page, { width: 1440, height: 900 });
  const series = page.locator(`${pre}[data-msv12="fact-series"]`);
  await expect(series).toContainText("Standalone");
  expect(await series.locator("button").count(), "Standalone offers no Add").toBe(0);
  const muted = await series.locator("dd").evaluate((dd) => [getComputedStyle(dd).color, getComputedStyle(dd.closest("[data-msv12='facts']")!.querySelector("[data-msv12='fact-setting'] dd")!).color]);
  expect(muted[0], "…and is muted against a recorded fact").not.toBe(muted[1]);
  ck(3);
  pre = await openMs(page, { width: 1440, height: 900 }, OTHER_MS_ID);
  const setting = page.locator(`${pre}[data-msv12="fact-setting"]`);
  await expect(setting).toContainText("Not recorded");
  await setting.getByRole("button", { name: /add/i }).click();
  const dlg = page.locator('[data-msv12="edit-dialog"]');
  await expect(dlg, "edit-details opens").toBeVisible({ timeout: 10_000 });
  await expect(dlg.getByLabel(/setting/i), "…with a Setting field").toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dlg).toHaveCount(0, { timeout: 10_000 });
  ck(3);
  const current = page.locator(`${pre}[data-msv12="fact-current"]`);
  await expect(current).toContainText("Not recorded");
  await current.getByRole("button", { name: /add/i }).click();
  const vdlg = page.locator('[data-msv12="new-version-dialog"]');
  await expect(vdlg, "the version dialog opens").toBeVisible({ timeout: 10_000 });
  await page.keyboard.press("Escape");
  await expect(vdlg).toHaveCount(0, { timeout: 10_000 });
  ck(2);
});

/* ══ L11 · no-appraisal — the page's own words never grade the writer ═════════════════════════ */
test("L11 no-appraisal", async () => {
  await openMs(page, { width: 1440, height: 900 });
  const text = await page.evaluate(() => {
    const root = (window as unknown as { __saVisRoot: () => Element }).__saVisRoot();
    return (root as HTMLElement).innerText;
  });
  const banned = /(?<![\w-])(only|already|still|good|bad|slow|fast|poor|strong|weak|overdue|late|behind|impressive|finally|unfortunately)(?![\w-])/i;
  const hit = banned.exec(text);
  expect(hit ? `"${hit[0]}" in: …${text.slice(Math.max(0, hit.index - 40), hit.index + 40)}…` : null, "appraisal word on the page").toBeNull();
  ck(1);
});

/* ══ L6 · empty-examples — five faded sections, a real CTA, nothing clickable in the ghosts (F8) ══ */
test("L6 empty-examples", async ({ browser }, info) => {
  const { ctx: ectx, page: ep } = await accountContext(browser, String(info.project.use.baseURL ?? ""), EMPTY_EMAIL, "empty");
  try {
    await ep.goto("/manuscripts");
    await ep.addStyleTag({ content: `/*${KILL_MOTION_ID}*/${KILL_MOTION}` });
    await expect(ep.locator(".ws-window").first()).toBeVisible({ timeout: 30_000 });
    await ep.waitForTimeout(2000);
    const pre = await visiblePage(ep, ".msv12-wpg");
    const secs = await ep.evaluate(() => {
      const root = (window as unknown as { __saVisRoot: () => Element }).__saVisRoot();
      return [...root.querySelectorAll("[data-msv12-esec]")].map((s) => ({
        key: s.getAttribute("data-msv12-esec"),
        example: !!s.querySelector('[data-msv12="example-tag"]'),
        ghost: (() => {
          const g = s.querySelector("[data-msv12-ghost]") as HTMLElement | null;
          if (!g) return null;
          const cs = getComputedStyle(g);
          return { pe: cs.pointerEvents, aria: g.getAttribute("aria-hidden") };
        })(),
      }));
    });
    const keys = secs.map((s) => s.key).sort();
    expect(keys, "the five sections").toEqual(["comps", "letters", "packages", "synopses", "versions"]);
    for (const s of secs) {
      expect(s.example, `${s.key} carries an Example tag`).toBe(true);
      expect(s.ghost?.pe, `${s.key} ghost is inert`).toBe("none");
      expect(s.ghost?.aria, `${s.key} ghost is aria-hidden`).toBe("true");
    }
    ck(1 + secs.length * 3);
    await expect(ep.locator(`${pre}[data-msv12="empty-hero"]`)).toContainText("Your manuscript starts here");
    ck(1);
    await ep.locator(`${pre}[data-msv12="empty-cta"]`).click();
    /* the existing AddManuscriptFocusForm — its step-1 label is bare text, not a bound <label> */
    await expect(ep.getByText(/Manuscript Title/).first(), "the existing create flow opens").toBeVisible({ timeout: 10_000 });
    ck(1);
  } finally {
    await ectx.close();
  }
});

/* ══ geometry vs the mock — the PAGE COLUMN is the mock's, to the pixel ══════════════════════════
   Both frames are the shell's (a 248px sidebar, the shared column), so the column-level containers
   must sit where the mock draws them: x and width within 1px at 1440 and 1280. The hero is v12's
   (F5), so its height — and every y below it — differs, and is printed rather than asserted. */
for (const vp of [{ width: 1440, height: 900 }, { width: 1280, height: 800 }]) {
  test(`geometry vs mock @ ${vp.width}`, async () => {
    await openMs(page, vp);
    const app = await page.evaluate(() => {
      const root = (window as unknown as { __saVisRoot: () => Element }).__saVisRoot();
      const g = (sel: string) => { const el = root.querySelector(sel); if (!el) return null; const b = el.getBoundingClientRect(); return [b.x, b.y, b.width, b.height].map((v) => Math.round(v * 10) / 10); };
      return {
        hero: g('[data-msv12="hero"]'), shelf: g('[data-msv13="shelf"]'), card: g('[data-msv13-card="comps"]'),
        band: g('[data-msv13-card="comps"] > [data-msv13="band"]'), versions: g('[data-msv13-card="versions"]'),
        vtile: g("[data-msv13-vtile]"), vnew: g('[data-msv13-vtile="new"]'), activity: g('[data-msv13-card="activity"]'),
        edit: g('[data-msv12="edit-details"]'),
      };
    });
    const ref = await ctx.newPage();
    await ref.setViewportSize(vp);
    await ref.goto(pathToFileURL(resolve(process.cwd(), "design-refs/manuscripts/manuscripts-v13.html")).href);
    await ref.waitForTimeout(800);
    const mock = await ref.evaluate(() => {
      const g = (sel: string) => { const el = [...document.querySelectorAll(sel)].find((e) => e.getBoundingClientRect().width > 0); if (!el) return null; const b = el.getBoundingClientRect(); return [b.x, b.y, b.width, b.height].map((v) => Math.round(v * 10) / 10); };
      return {
        hero: g(".desk"), shelf: g(".shelf"), card: g(".shelf .card"), band: g(".shelf .card > .ch"), versions: g(".card.c-ver"),
        vtile: g(".vtile:not(.new)"), vnew: g(".vtile.new"), activity: g(".card.c-act"), edit: g(".desk .edit"),
      };
    });
    await ref.close();
    console.log(`\n[geometry @ ${vp.width}] app vs mock — [x, y, w, h]`);
    for (const k of Object.keys(app) as (keyof typeof app)[]) console.log(`  ${k.padEnd(9)} app ${JSON.stringify(app[k])}  mock ${JSON.stringify(mock[k])}`);
    for (const k of ["shelf", "versions", "activity"] as const) {
      expect(app[k] && mock[k], `${k} measured on both`).toBeTruthy();
      expect(Math.abs(app[k]![0] - mock[k]![0]), `${k} x vs the mock's @${vp.width}`).toBeLessThanOrEqual(1);
      expect(Math.abs(app[k]![2] - mock[k]![2]), `${k} width vs the mock's @${vp.width}`).toBeLessThanOrEqual(1);
      ck(3);
    }
    expect(Math.abs(app.card![2] - mock.card![2]), `first shelf card width vs the mock's @${vp.width}`).toBeLessThanOrEqual(1);
    expect(Math.abs(app.vtile![2] - mock.vtile![2]), `version tile width vs the mock's @${vp.width}`).toBeLessThanOrEqual(1);
    ck(2);
  });
}

/* ══ the floor ════════════════════════════════════════════════════════════════════════════════ */
test("assertion floor", () => {
  console.log(`[assertion floor] ${asserts} assertions this run (floor ${FLOOR})`);
  expect(asserts, `assertion floor — ${asserts} < ${FLOOR}`).toBeGreaterThanOrEqual(FLOOR);
});
