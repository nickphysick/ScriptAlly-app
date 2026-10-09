/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ MANUSCRIPTS v21 — MS21: the open header, the book and activity, versions, the doors, the empty states ══
 *
 * Ref: design-refs/manuscripts/manuscripts-v21.html (hash-enrolled) and its geometry json. Every
 * geometry lock runs at 1512 × 900 and 1280 × 800 and asserts no horizontal overflow of the sheet.
 *
 * THIS FILE REPLACES manuscriptsV13.measure.ts. What was retired and what was rewritten is named in
 * tests/e2e/RETIRED-manuscripts-v21.md.
 *
 * THREE DEDICATED ACCOUNTS (ms21Fixture.mjs), seeded in `beforeAll` and put back whole in `afterAll`:
 * V5 saves a version, E1 adds a manuscript and E2 deletes one. `MS21_SEEDED=1` skips both seeds, for
 * a run known to write nothing.
 *
 * ONE PASSWORD SIGN-IN PER ACCOUNT PER PORT: the state (IndexedDB included) is saved under `.auth/`
 * and every case opens from it, so a red lock restarts the worker without another sign-in.
 *
 * A LOCK THAT FINDS NO SUBJECT HAS FAILED: every case asserts its population before its claim, and
 * the floor case refuses a run that asserted less than it claims to.
 *
 * `MS21_MUTATE=<name>` injects one named CSS break into the page (h1 · h2 · v1 · v2), so those locks
 * can be shown red without a rebuild. The source mutations are in reports/manuscripts-v21/.
 */
import { test, expect, type Page, type BrowserContext, type Browser } from "@playwright/test";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { KILL_MOTION, KILL_MOTION_ID } from "./measure";
import { assertLocalBundleIsDev } from "./bundleGuard";
import {
  MS_ID, MS_TITLE, FILLED_EMAIL, FILLED_NAME, EMPTY_EMAIL, DELETE_EMAIL, DELETE_MS_TITLE, EXPECT, OTHER_MS_ID,
} from "./ms21Fixture.mjs";

test.setTimeout(180_000);

let asserts = 0;
const ck = (n = 1) => { asserts += n; };
const FLOOR = 260;

const VPS = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;
const wide = (w: number) => w >= 1440;

const MUTATIONS: Record<string, string> = {
  h1: ".ms21-hd{background:#fff!important;border-radius:16px!important}",
  h2: ".ms21-art{justify-self:start!important}",
  v1: ".ms21 .ms21-ban p{white-space:normal!important;max-width:620px!important}",
  v2: ".ms21-vsec{grid-template-columns:1fr 1.4fr!important}",
};
const MUTATE = MUTATIONS[process.env.MS21_MUTATE ?? ""] ?? "";

const readPw = (): string => {
  if (process.env.SA_E2E_PASSWORD) return process.env.SA_E2E_PASSWORD;
  for (const line of readFileSync(resolve(process.cwd(), ".env.local"), "utf8").split("\n")) {
    const m = /^\s*SA_E2E_PASSWORD\s*=\s*(.*)$/.exec(line);
    if (m) return m[1].trim().replace(/^["']|["']$/g, "");
  }
  throw new Error("no SA_E2E_PASSWORD");
};

const SEEDED = process.env.MS21_SEEDED === "1";
const seedNow = (args = "") => execSync(`node tests/e2e/seedManuscriptsV21.mjs ${args}`, { cwd: process.cwd(), stdio: "pipe", timeout: 240_000 });
const seed = (args = "") => { if (!SEEDED) seedNow(args); };

async function signInAs(page: Page, email: string) {
  await assertLocalBundleIsDev();
  await page.goto("/#/signin");
  await page.locator("#au-email").fill(email);
  await page.locator("#au-pw").fill(readPw());
  await page.getByRole("button", { name: /^Sign in$/ }).last().click();
  await expect(page.locator(".ws-window").first()).toBeVisible({ timeout: 30_000 });
}

async function accountContext(browser: Browser, baseURL: string, email: string): Promise<{ ctx: BrowserContext; page: Page }> {
  const port = new URL(baseURL).port || "443";
  const file = resolve(process.cwd(), `tests/e2e/.auth/${email.split("@")[0]}-${port}.json`);
  const viewport = { width: 1512, height: 900 };
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

/** Open a workspace route settled: the page guides marked seen, motion off, fonts loaded. */
async function openAt(page: Page, route: string, vp: { width: number; height: number }, msId: string | null = MS_ID) {
  await page.setViewportSize(vp);
  await page.evaluate((id) => {
    if (id) localStorage.setItem("scriptally_active_manuscript_id", id);
    else localStorage.removeItem("scriptally_active_manuscript_id");
    localStorage.setItem("sa.guide.manuscripts", "1");
    localStorage.setItem("sa.guide.contacts", "1");
  }, msId);
  await page.goto(route);
  await page.addStyleTag({ content: `/*${KILL_MOTION_ID}*/${KILL_MOTION}${MUTATE}` });
  await expect(page.locator(".ws-window").first()).toBeVisible({ timeout: 30_000 });
  await page.waitForFunction(
    (sel) => [...document.querySelectorAll(sel)].some((e) => e.getBoundingClientRect().height > 0),
    route === "/agents" ? ".cl15-hd" : '[data-ms21="header"]', { timeout: 30_000 },
  );
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
}
const openMs = (page: Page, vp: { width: number; height: number }, msId: string | null = MS_ID) => openAt(page, "/manuscripts", vp, msId);

type Box = { x: number; y: number; w: number; h: number; r: number; b: number };
/**
 * Boxes of every VISIBLE match, relative to the page's own scroller (the sheet), with the scroll
 * added back — so a y is a position on the page, wherever it is scrolled to.
 */
const boxes = (page: Page, sel: string): Promise<Box[]> =>
  page.evaluate((sel) => {
    const sc = [...document.querySelectorAll(".wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0)!;
    const s = sc.getBoundingClientRect();
    return [...document.querySelectorAll(sel)].filter((e) => e.getBoundingClientRect().height > 0 || e.getBoundingClientRect().width > 0).map((el) => {
      const b = el.getBoundingClientRect();
      const x = b.x - s.x, y = b.y - s.y + sc.scrollTop;
      return { x, y, w: b.width, h: b.height, r: x + b.width, b: y + b.height };
    });
  }, sel);
const one = async (page: Page, sel: string): Promise<Box> => {
  const all = await boxes(page, sel);
  expect(all.length, `"${sel}" is on the page`).toBeGreaterThan(0);
  return all[0];
};
const texts = (page: Page, sel: string): Promise<string[]> =>
  page.evaluate((sel) => [...document.querySelectorAll(sel)].filter((e) => e.getBoundingClientRect().height > 0).map((e) => (e.textContent ?? "").replace(/\s+/g, " ").trim()), sel);

async function noOverflow(page: Page, where: string) {
  const o = await page.evaluate(() => {
    const sc = [...document.querySelectorAll(".wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0)!;
    return { sw: sc.scrollWidth, cw: sc.clientWidth };
  });
  expect(o.cw, `${where}: the sheet has a width`).toBeGreaterThan(600);
  expect(o.sw, `${where}: no horizontal overflow on the sheet`).toBeLessThanOrEqual(o.cw);
  ck(2);
}

async function pixel(page: Page, x: number, y: number): Promise<number[]> {
  const buf = await page.screenshot({ clip: { x: Math.round(x), y: Math.round(y), width: 1, height: 1 }, animations: "disabled" });
  return page.evaluate(async (b64) => {
    const i = new Image(); i.src = `data:image/png;base64,${b64}`; await i.decode();
    const c = document.createElement("canvas"); c.width = 1; c.height = 1; const x = c.getContext("2d")!; x.drawImage(i, 0, 0);
    return [...x.getImageData(0, 0, 1, 1).data].slice(0, 3);
  }, buf.toString("base64"));
}
const near = (a: number[], b: number[], t = 2) => a.length === 3 && a.every((v, i) => Math.abs(v - b[i]) <= t);

/** Scroll the sheet so `sel` sits in the middle of it, and wait for it to settle. */
async function bring(page: Page, sel: string) {
  await page.evaluate((sel) => {
    const el = [...document.querySelectorAll(sel)].find((e) => e.getBoundingClientRect().height > 0);
    el?.scrollIntoView({ block: "center", behavior: "instant" as ScrollBehavior });
  }, sel);
  await page.waitForTimeout(250);
}

const SHOTS = process.env.MS21_SHOTS === "1";
async function shot(page: Page, name: string) {
  if (!SHOTS) return;
  const dir = resolve(process.cwd(), "reports/manuscripts-v21/shots");
  mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: resolve(dir, `${name}.png`), animations: "disabled" });
}

let ctx: BrowserContext;
let page: Page;
let baseURL = "";

test.beforeAll(async ({ browser }, info) => {
  seed();
  baseURL = String(info.project.use.baseURL ?? "");
  ({ ctx, page } = await accountContext(browser, baseURL, FILLED_EMAIL));
});
test.afterAll(async () => {
  await ctx?.close();
  seed();
});

/* ══ H1 · the open header — no card, the title large, and the Contact list's own three lines ═════ */
for (const vp of VPS) {
  test(`H1 open header @ ${vp.width}`, async () => {
    /* the Contact list first: its header top, hairline and first content, by the same ruler */
    await openAt(page, "/agents", vp);
    const aHd = await one(page, ".cl15-hd");
    const aFirst = await one(page, ".cl15-desk");
    await openMs(page, vp);
    const hd = await one(page, '[data-ms21="header"]');
    const first = await one(page, '[data-ms21="row"]');
    const t = await page.evaluate(() => {
      const h1 = [...document.querySelectorAll('[data-ms21="header"] h1')].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
      const cs = getComputedStyle(h1);
      const dressed: string[] = [];
      for (let el = h1.parentElement; el && !el.classList.contains("wpg-scroll"); el = el.parentElement) {
        const c = getComputedStyle(el);
        if (c.backgroundColor !== "rgba(0, 0, 0, 0)" || parseFloat(c.borderTopLeftRadius) > 0) dressed.push(`${el.className}:${c.backgroundColor}/${c.borderTopLeftRadius}`);
      }
      return { text: h1.textContent, family: cs.fontFamily, size: parseFloat(cs.fontSize), hasHook: h1.hasAttribute("data-page-title"), dressed };
    });
    expect(t.dressed, "no ancestor of the title up to the sheet has a background or a radius").toEqual([]);
    expect(t.text, "the title is the manuscript's title").toBe(MS_TITLE);
    expect(t.family, "Special Elite").toContain("Special Elite");
    expect(t.size, "72 (58 below 1440)").toBe(wide(vp.width) ? 72 : 58);
    expect(t.hasHook, "the title keeps data-page-title").toBe(true);
    expect(Math.abs(hd.y - aHd.y), `header top ${hd.y} against the Contact list's ${aHd.y}`).toBeLessThanOrEqual(2);
    expect(Math.abs(hd.b - aHd.b), `hairline y ${hd.b} against the Contact list's ${aHd.b}`).toBeLessThanOrEqual(2);
    expect(Math.abs(first.y - aFirst.y), `first content top ${first.y} against the Contact list's ${aFirst.y}`).toBeLessThanOrEqual(2);
    ck(8);
    await noOverflow(page, `H1 @ ${vp.width}`);
    await shot(page, `01-header-book-activity-${vp.width}`);
  });
}

/* ══ H2 · the drawing — at the column's right edge, hanging over the hairline, painted above it ══ */
for (const vp of VPS) {
  test(`H2 drawing @ ${vp.width}`, async () => {
    await openMs(page, vp);
    const hd = await one(page, '[data-ms21="header"]');
    const img = await one(page, '[data-ms21="header-art"] img');
    expect(img.w, "the drawing is 330 wide (260 below 1440)").toBeCloseTo(wide(vp.width) ? 330 : 260, 0);
    expect(Math.abs(img.r - hd.r), `the drawing's right edge ${img.r} is the column's ${hd.r}`).toBeLessThanOrEqual(2);
    const hang = img.b - hd.b;
    expect(hang, `the drawing's foot is 12–24 below the hairline (${hang})`).toBeGreaterThanOrEqual(12);
    expect(hang).toBeLessThanOrEqual(24);
    /* painted above: at a point on the hairline, inside the drawing, the drawing is what is on top */
    const top = await page.evaluate(() => {
      const sc = [...document.querySelectorAll(".wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0)!;
      sc.scrollTop = 0;
      const hd = [...document.querySelectorAll('[data-ms21="header"]')].find((e) => e.getBoundingClientRect().height > 0)!;
      const im = hd.querySelector('[data-ms21="header-art"] img')!.getBoundingClientRect();
      const y = hd.getBoundingClientRect().bottom - 0.5, x = im.x + im.width / 2;
      const onScreen = y < innerHeight && x < innerWidth;
      const el = document.elementFromPoint(x, y);
      return { onScreen, tag: el?.tagName ?? "", inArt: !!el?.closest('[data-ms21="header-art"]') };
    });
    expect(top.onScreen, "the probe point is on screen").toBe(true);
    expect(top.inArt, `the drawing paints above the hairline (found ${top.tag})`).toBe(true);
    ck(6);
  });
}

/* ══ B1 · the book — nine facts, the account's name, the current version, the comps line ═══════ */
test("B1 book", async () => {
  await openMs(page, VPS[0]);
  const facts = await page.evaluate(() => {
    const dl = [...document.querySelectorAll('[data-ms21="facts"]')].find((e) => e.getBoundingClientRect().height > 0)!;
    return [...dl.querySelectorAll("[data-ms21-fact]")].map((d) => ({
      key: d.getAttribute("data-ms21-fact"), label: d.querySelector("dt")?.textContent ?? "", value: (d.querySelector("dd")?.textContent ?? "").trim(),
      family: getComputedStyle(d.querySelector("dd")!).fontFamily, colour: getComputedStyle(d.querySelector("dd")!).color,
    }));
  });
  expect(facts.map((f) => f.label), "nine facts, in the oracle's order").toEqual([
    "Status", "Genre", "Age category", "Word count", "Setting", "Series", "Author name", "Querying since", "Current version",
  ]);
  const by = Object.fromEntries(facts.map((f) => [f.key, f]));
  expect(by.author.value, "Author is User.name").toBe(FILLED_NAME);
  expect(by.version.value, "Current version is currentBookVersion().name").toBe(EXPECT.lede.current);
  expect(by.version.family, "the current version is in Special Elite").toContain("Special Elite");
  expect(by.version.colour, "…and rust").toBe("rgb(138, 74, 60)");
  expect(by.words.value, "the word count is en-GB").toBe("50,000");
  expect(by.series.value, "an unset series reads Standalone").toBe("Standalone");
  expect(by.status.value).toBe("Querying");
  expect(by.since.value, "the first send, in full").toBe("10 March 2026");
  const line = (await texts(page, '[data-ms21="comps-line-text"]'))[0];
  expect(line, "the comps line is queryLine(comps, title, readers)").toBe(`${MS_TITLE} will appeal to readers of The Tidewater Line and Salt Road.`);
  ck(10);
  /* the author is not in the modal */
  await page.locator('[data-ms21="header-edit"]:visible').click();
  const dlg = page.locator('[data-ms21="edit-dialog"]');
  await expect(dlg).toBeVisible();
  const labels = await dlg.locator("label, .ms21-fl").allInnerTexts();
  expect(labels.map((l) => l.trim().toLowerCase()), "the modal's fields").toEqual(["title", "word count", "genre", "age category", "logline", "setting", "series", "status"]);
  expect(await dlg.locator('[data-ms21="status-seg"] button').count(), "six statuses").toBe(6);
  await shot(page, "08-edit-details-1512");
  await page.keyboard.press("Escape");
  await expect(dlg).toHaveCount(0);
  await expect(page.locator('[data-ms21="header-edit"]:visible'), "focus returns to the opener").toBeFocused();
  ck(4);
});

/* ══ B2 · the row — equal heights; five rows at most, newest first, this book's only ═══════════ */
for (const vp of VPS) {
  test(`B2 row @ ${vp.width}`, async () => {
    await openMs(page, vp);
    const book = await one(page, '[data-ms21="book"]');
    const act = await one(page, '[data-ms21="activity"]');
    expect(Math.abs(book.y - act.y), "the two cards share a top").toBeLessThanOrEqual(1);
    expect(Math.abs(book.h - act.h), `…and a height (${book.h} / ${act.h})`).toBeLessThanOrEqual(1);
    const rows = await page.evaluate(() => {
      const card = [...document.querySelectorAll('[data-ms21="activity"]')].find((e) => e.getBoundingClientRect().height > 0)!;
      return [...card.querySelectorAll('[data-ms21="arow"]')].map((r) => ({ qid: r.getAttribute("data-qid") || null, at: Number(r.getAttribute("data-at")) }));
    });
    expect(rows.length, "the card has rows").toBeGreaterThan(0);
    expect(rows.length, "five at most").toBeLessThanOrEqual(5);
    expect(rows.map((r) => r.at), "newest first").toEqual([...rows.map((r) => r.at)].sort((a, b) => b - a));
    expect(rows.map((r) => r.qid), "the five rows, by query").toEqual(EXPECT.activityTop5);
    expect(rows.some((r) => r.qid === "ms21-q-8"), `the other book's (${OTHER_MS_ID}) record never shows`).toBe(false);
    /* the card's last row and its foot link are inside the card */
    const more = await one(page, '[data-ms21="activity-all"]');
    expect(more.b, "the foot link is inside the card").toBeLessThanOrEqual(act.b);
    ck(8);
    await noOverflow(page, `B2 @ ${vp.width}`);
  });
}

/* ══ B3 · your move — a rust line, and its row opens the drawer's "sent" journey ═══════════════ */
test("B3 your move", async () => {
  await openMs(page, VPS[0]);
  const moves = await page.evaluate(() => {
    const card = [...document.querySelectorAll('[data-ms21="activity"]')].find((e) => e.getBoundingClientRect().height > 0)!;
    return [...card.querySelectorAll('[data-ms21="arow"][data-you]')].map((r) => {
      const s = r.querySelector('[data-ms21="your-move"]') as HTMLElement;
      return { qid: r.getAttribute("data-qid")!, text: s?.textContent ?? "", colour: s ? getComputedStyle(s).color : "" };
    });
  });
  expect(moves.map((m) => m.qid).sort(), "both owed requests are your-move rows").toEqual([...EXPECT.owed].sort());
  for (const m of moves) {
    expect(m.text, `the line for ${m.qid}`).toBe((EXPECT.yourMove as Record<string, string>)[m.qid]);
    expect(m.colour, "rust").toBe("rgb(154, 75, 50)");
  }
  ck(5);
  await page.locator(`[data-ms21="arow"][data-qid="${EXPECT.owed[0]}"][data-you] button:visible`).click();
  const drawer = page.locator('.qad-drawer[data-qad-drawer="sent"]');
  await expect(drawer, "the drawer's I've-sent-it journey").toBeVisible({ timeout: 10_000 });
  await expect(page.locator(".qad-root.is-open"), "the drawer has opened").toHaveCount(1, { timeout: 10_000 });
  await page.keyboard.press("Escape");
  await expect(drawer).toHaveCount(0, { timeout: 10_000 });
  ck(2);
});

/* ══ V1 · the banner — blush, the sheet's full width, one exact line, the arrow centred ════════ */
for (const vp of VPS) {
  test(`V1 banner @ ${vp.width}`, async () => {
    await openMs(page, vp);
    await bring(page, '[data-ms21="banner"]');
    const r = await page.evaluate(() => {
      const sc = [...document.querySelectorAll(".wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0)!;
      const ban = [...document.querySelectorAll('[data-ms21="banner"]')].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
      const p = ban.querySelector("p") as HTMLElement;
      const before = getComputedStyle(ban, "::before"), after = getComputedStyle(ban, "::after");
      const b = ban.getBoundingClientRect(), s = sc.getBoundingClientRect();
      const one = getComputedStyle(p);
      return {
        bg: before.backgroundColor, text: (p.textContent ?? "").replace(/\s+/g, " ").trim(), sw: p.scrollWidth, cw: p.clientWidth,
        lines: Math.round(p.getBoundingClientRect().height / parseFloat(one.lineHeight)),
        family: one.fontFamily, size: parseFloat(one.fontSize), colour: one.color,
        arrowLeft: parseFloat(after.left), arrowW: parseFloat(after.width), arrowTf: after.transform, banW: b.width,
        /* ⚠️ the sheet shades its own last 10px, so the right-hand sample is taken 14 in */
        sheet: { x: s.x, r: s.x + sc.clientWidth - 12 }, mid: b.y + b.height / 2, label: ban.getAttribute("aria-label"),
        bWeight: getComputedStyle(p.querySelector("b")!).fontWeight, bLine: getComputedStyle(p.querySelector("b")!).textDecorationLine,
      };
    });
    expect(r.bg, "the band is #f3ddd2").toBe("rgb(243, 221, 210)");
    expect(r.text, "the line, exactly").toBe("Prologue first? Fast-paced opening? Leading with a passage of world-building? Track versions of a manuscript to see what's landing best.");
    expect(r.sw, `on one line (scrollWidth ${r.sw} ≤ clientWidth ${r.cw})`).toBeLessThanOrEqual(r.cw);
    expect(r.lines, "one line tall").toBe(1);
    expect(r.family).toContain("Special Elite");
    expect(r.size, "16.2 (13 below 1440)").toBeCloseTo(wide(vp.width) ? 16.2 : 13, 1);
    expect(r.colour).toBe("rgb(91, 42, 31)");
    expect(r.bWeight, "'versions' is underlined, not bold").toBe("400");
    expect(r.bLine).toContain("underline");
    expect(r.label, "labelled A note").toBe("A note");
    /* the arrow: centred on the band */
    const tx = Number(/matrix\([^)]*,\s*(-?[\d.]+),\s*-?[\d.]+\)/.exec(r.arrowTf)?.[1] ?? NaN);
    expect(Math.abs(r.arrowLeft + tx + r.arrowW / 2 - r.banW / 2), "the arrow is centred").toBeLessThanOrEqual(2);
    expect(r.arrowW, "150 (120 below 1440)").toBe(wide(vp.width) ? 150 : 120);
    /* painted edges: the blush reaches both edges of the sheet */
    const blush = [243, 221, 210];
    expect(r.mid, "the band's middle is on screen").toBeLessThan(vp.height);
    const left = await pixel(page, r.sheet.x + 1, r.mid), right = await pixel(page, r.sheet.r - 2, r.mid);
    expect(near(left, blush), `the sheet's left edge is blush (${left})`).toBe(true);
    expect(near(right, blush), `the sheet's right edge is blush (${right})`).toBe(true);
    ck(15);
    /* spacing: 56 (48) above from the book row, 76 (64) below to Versions */
    const row = await one(page, '[data-ms21="row"]'), ban = await one(page, '[data-ms21="banner"]'), vs = await one(page, '[data-ms21="versions"]');
    expect(Math.abs(ban.y - row.b - (wide(vp.width) ? 56 : 48)), "the band's top from the book row").toBeLessThanOrEqual(1);
    expect(Math.abs(vs.y - ban.b - (wide(vp.width) ? 76 : 64)), "Versions from the band").toBeLessThanOrEqual(1);
    ck(2);
    await noOverflow(page, `V1 @ ${vp.width}`);
  });
}

/* ══ V2 · versions is two equal halves, and the drawing is mirrored ════════════════════════════ */
for (const vp of VPS) {
  test(`V2 50/50 @ ${vp.width}`, async () => {
    await openMs(page, vp);
    const left = await one(page, '[data-ms21="versions-text"]');
    const right = await one(page, '[data-ms21="deck-wrap"]');
    expect(Math.abs(left.w - right.w), `the halves differ by ≤ 2 (${left.w} / ${right.w})`).toBeLessThanOrEqual(2);
    expect(right.x - left.r, "the gap is 48 (32)").toBeCloseTo(wide(vp.width) ? 48 : 32, 0);
    const art = await page.evaluate(() => {
      const im = [...document.querySelectorAll('[data-ms21="versions-art"]')].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
      return { tf: getComputedStyle(im).transform, w: im.getBoundingClientRect().width, hidden: im.getAttribute("aria-hidden") };
    });
    const a = Number(/matrix\((-?[\d.]+)/.exec(art.tf)?.[1] ?? NaN);
    expect(a, `the drawing is mirrored (${art.tf})`).toBeLessThan(0);
    expect(art.w, "170 (120) wide").toBeCloseTo(wide(vp.width) ? 170 : 120, 0);
    expect(art.hidden).toBe("true");
    ck(5);
    await bring(page, '[data-ms21="versions"]');
    await shot(page, `02-versions-${vp.width}`);
  });
}

/* ══ V3 · the deck — opens on the current version; one card in front; the rest step right and up ══ */
type Pose = { vid: string; front: boolean; opacity: number; z: number; x: number; y: number; hidden: boolean; ariaHidden: string | null };
const poses = (page: Page): Promise<Pose[]> =>
  page.evaluate(() => {
    const deck = [...document.querySelectorAll('[data-ms21="deck"]')].find((e) => e.getBoundingClientRect().height > 0)!;
    return [...deck.querySelectorAll('[data-ms21="vcard"]')].map((c) => {
      const cs = getComputedStyle(c), b = c.getBoundingClientRect();
      return {
        vid: c.getAttribute("data-vid")!, front: c.hasAttribute("data-front"), opacity: Number(cs.opacity), z: Number(cs.zIndex),
        x: b.x, y: b.y, hidden: cs.visibility === "hidden", ariaHidden: c.getAttribute("aria-hidden"),
      };
    });
  });
for (const vp of VPS) {
  test(`V3 deck @ ${vp.width}`, async () => {
    await openMs(page, vp);
    await bring(page, '[data-ms21="deck"]');
    const order = EXPECT.versionOrder;
    let p = await poses(page);
    expect(p.map((c) => c.vid), "newest first").toEqual(order);
    const fronts = p.filter((c) => c.opacity === 1 && c.z === Math.max(...p.map((x) => x.z)));
    expect(fronts.length, "exactly one card is on top at full opacity").toBe(1);
    expect(fronts[0].vid, "the deck opens on the current version").toBe(order[0]);
    expect(p.filter((c) => c.front).length).toBe(1);
    const step = wide(vp.width) ? 48 : 36;
    for (let k = 1; k < p.length; k += 1) {
      expect(p[k].x, `card ${k} is further right than card ${k - 1}`).toBeGreaterThan(p[k - 1].x);
      expect(p[k].y, `…and higher`).toBeLessThan(p[k - 1].y);
      expect(p[k].opacity, `…and fainter`).toBeLessThan(p[k - 1].opacity);
      expect(p[k].ariaHidden, "a card behind is aria-hidden").toBe("true");
    }
    /* the first card behind sits one step right of the front, less the 6% it shrinks about its centre */
    const w0 = (await one(page, '[data-ms21="vcard"][data-front]')).w;
    expect(Math.abs(p[1].x - p[0].x - (step + w0 * 0.03)), "one step right").toBeLessThanOrEqual(1.5);
    ck(5 + (p.length - 1) * 4);
    /* the counts are versionUsage's */
    const usage = await page.evaluate(() => {
      const deck = [...document.querySelectorAll('[data-ms21="deck"]')].find((e) => e.getBoundingClientRect().height > 0)!;
      const n = (c: Element, k: string) => Number(c.querySelector(`[data-ms21="${k}"] b`)?.textContent);
      return Object.fromEntries([...deck.querySelectorAll('[data-ms21="vcard"]')].map((c) => [c.getAttribute("data-vid"), {
        queried: n(c, "use-queried"), requested: n(c, "use-requested"), sent: n(c, "use-sent"),
        pk: (c.querySelector('[data-ms21="vpk"]')?.textContent ?? ""),
      }]));
    });
    for (const [vid, u] of Object.entries(EXPECT.usage as Record<string, { queried: number; requested: number; sent: number; packages: number }>)) {
      expect({ queried: usage[vid].queried, requested: usage[vid].requested, sent: usage[vid].sent }, `counts for ${vid}`).toEqual({ queried: u.queried, requested: u.requested, sent: u.sent });
      expect(usage[vid].pk, `packages for ${vid}`).toContain(u.packages > 0 ? `In ${u.packages} package${u.packages === 1 ? "" : "s"}` : "In no packages yet");
    }
    ck(6);
    /* the arrows: disabled at the ends, one card at a time */
    const prev = page.locator('[data-ms21="deck-prev"]:visible'), next = page.locator('[data-ms21="deck-next"]:visible');
    await expect(prev, "‹ is disabled on the newest").toBeDisabled();
    await next.click();
    p = await poses(page);
    expect(p.find((c) => c.front)?.vid, "› moves one card").toBe(order[1]);
    expect(p[0].hidden, "the passed card is gone").toBe(true);
    await next.click();
    await expect(next, "› is disabled on the oldest").toBeDisabled();
    await prev.click();
    expect((await poses(page)).find((c) => c.front)?.vid, "‹ moves one card back").toBe(order[1]);
    /* clicking a peeking card brings it to the front */
    await page.locator(`[data-ms21="vcard"][data-vid="${order[2]}"]:visible`).click({ position: { x: (await one(page, `[data-ms21="vcard"][data-vid="${order[2]}"]`)).w - 8, y: 60 } });
    expect((await poses(page)).find((c) => c.front)?.vid, "a peeking card comes forward when clicked").toBe(order[2]);
    /* the arrow keys, with focus inside the deck */
    await page.locator('[data-ms21="vcard"][data-front]:visible').focus();
    await page.keyboard.press("ArrowLeft");
    expect((await poses(page)).find((c) => c.front)?.vid, "← moves to the newer card").toBe(order[1]);
    await page.keyboard.press("ArrowRight");
    expect((await poses(page)).find((c) => c.front)?.vid, "→ moves to the older card").toBe(order[2]);
    const role = await page.locator('[data-ms21="deck-wrap"]:visible').getAttribute("aria-roledescription");
    expect(role).toBe("carousel");
    ck(9);
  });
}

/* ══ V4 · see all — a list of every version, newest first; the label flips ═════════════════════ */
for (const vp of VPS) {
  test(`V4 see all @ ${vp.width}`, async () => {
    await openMs(page, vp);
    const btn = page.locator('[data-ms21="see-all"]:visible');
    await expect(btn).toHaveText(`See all ${EXPECT.versionOrder.length}`);
    expect(await page.locator('[data-ms21="version-list"]:visible').count(), "the list is closed to begin with").toBe(0);
    await btn.click();
    await expect(btn, "the label flips").toHaveText("Hide the list");
    await expect(btn).toHaveAttribute("aria-expanded", "true");
    const rows = await page.locator('[data-ms21="version-list"]:visible [data-ms21="vrow"]').evaluateAll((els) => els.map((e) => e.getAttribute("data-vid")));
    expect(rows, "every version, newest first").toEqual(EXPECT.versionOrder);
    const list = await one(page, '[data-ms21="version-list"]'), vs = await one(page, '[data-ms21="versions"]');
    expect(Math.abs(list.w - vs.w), "the list is the section's full width").toBeLessThanOrEqual(1);
    const pk = await page.locator('[data-ms21="version-list"]:visible [data-ms21="vrow-packages"]').first().evaluate((e) => getComputedStyle(e).display);
    expect(pk === "none", `the Packages column ${wide(vp.width) ? "shows" : "is hidden below 1440"} (${pk})`).toBe(!wide(vp.width));
    ck(7);
    await bring(page, '[data-ms21="version-list"]');
    await shot(page, `04-see-all-${vp.width}`);
    await noOverflow(page, `V4 @ ${vp.width}`);
    await btn.click();
    await expect(btn).toHaveText(`See all ${EXPECT.versionOrder.length}`);
    expect(await page.locator('[data-ms21="version-list"]:visible').count(), "and closes again").toBe(0);
    ck(2);
  });
}

/* ══ M1 · the doors — three in a row, equal heights, the fixture's numbers, the whole card a link ══ */
for (const vp of VPS) {
  test(`M1 doors @ ${vp.width}`, async () => {
    await openMs(page, vp);
    const doors = await boxes(page, '[data-ms21="door"]');
    expect(doors.length, "three doors").toBe(3);
    expect(Math.max(...doors.map((d) => d.y)) - Math.min(...doors.map((d) => d.y)), "one row").toBeLessThanOrEqual(1);
    expect(Math.max(...doors.map((d) => d.h)) - Math.min(...doors.map((d) => d.h)), "equal heights").toBeLessThanOrEqual(1);
    const d = EXPECT.doors;
    expect((await texts(page, '[data-ms21="door-n"]')).map(Number), "the three numbers").toEqual([d.comps, d.letters + d.synopses, d.packages]);
    expect(await texts(page, '[data-ms21="door-sentence"]')).toEqual([
      `Books and films like yours. ${d.inQuery} are in your query letter.`,
      `${d.letters} query letters and ${d.synopses} synopses. You're using ${d.letterInUse}.`,
      `The letter, synopsis and pages you send together. ${d.packageQueries} queries sent so far.`,
    ]);
    /* the band is the sheet's full width */
    await bring(page, '[data-ms21="materials"]');
    const edge = await page.evaluate(() => {
      const sc = [...document.querySelectorAll(".wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0)!;
      const band = [...document.querySelectorAll('[data-ms21="materials"]')].find((e) => e.getBoundingClientRect().height > 0)!;
      const b = band.getBoundingClientRect(), s = sc.getBoundingClientRect();
      return { x: s.x + 1, r: s.x + sc.clientWidth - 14, y: b.y + 20, bg: getComputedStyle(band).backgroundColor };
    });
    expect(edge.bg).toBe("rgb(233, 230, 224)");
    expect(near(await pixel(page, edge.x, edge.y), [233, 230, 224]), "the band reaches the sheet's left edge").toBe(true);
    expect(near(await pixel(page, edge.r, edge.y), [233, 230, 224]), "…and its right").toBe(true);
    ck(8);
    await shot(page, `03-materials-${vp.width}`);
    await noOverflow(page, `M1 @ ${vp.width}`);
    /* the whole card navigates: press its padding, well clear of any text */
    const first = page.locator('[data-ms21="door"][data-door="comps"]:visible');
    const box = (await first.boundingBox())!;
    await first.click({ position: { x: box.width - 6, y: 6 } });
    await expect(page, "the card's corner opens Comparable titles").toHaveURL(/\/manuscripts\/comps/, { timeout: 15_000 });
    ck(1);
  });
}

/* ══ F1 · the footer is page-coloured ══════════════════════════════════════════════════════════ */
test("F1 footer", async () => {
  await openMs(page, VPS[0]);
  const f = await page.evaluate(() => {
    const sc = [...document.querySelectorAll(".wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0)!;
    const af = [...sc.querySelectorAll(".af")].find((e) => e.getBoundingClientRect().height > 0);
    const hd = [...document.querySelectorAll('[data-ms21="header"]')].find((e) => e.getBoundingClientRect().height > 0)!;
    return af ? { bg: getComputedStyle(af).backgroundColor, page: getComputedStyle(sc).backgroundColor, x: af.getBoundingClientRect().x, hx: hd.getBoundingClientRect().x } : null;
  });
  expect(f, "the footer is on the page").not.toBeNull();
  expect(f!.page, "the sheet has a colour").not.toBe("rgba(0, 0, 0, 0)");
  expect(f!.bg, "the footer is the page's colour").toBe(f!.page);
  expect(Math.abs(f!.x - f!.hx), "the footer starts on the column's left edge").toBeLessThanOrEqual(1);
  ck(4);
});

/* ══ V5 · a new version — the name is required; it becomes current; its words show, others' do not ══ */
test("V5 new version", async () => {
  await openMs(page, VPS[0]);
  /* a version saved without a count shows no words line — never "0 words" */
  const before = await page.evaluate(() => {
    const deck = [...document.querySelectorAll('[data-ms21="deck"]')].find((e) => e.getBoundingClientRect().height > 0)!;
    return Object.fromEntries([...deck.querySelectorAll('[data-ms21="vcard"]')].map((c) => [c.getAttribute("data-vid"), c.querySelector('[data-ms21="vwords"]')?.textContent ?? null]));
  });
  expect(before[EXPECT.versionOrder[0]], "the version with a count shows it").toBe("50,000 words");
  expect(before[EXPECT.versionOrder[1]], "a version without a count shows no words line").toBeNull();
  expect(before[EXPECT.versionOrder[2]]).toBeNull();
  ck(3);
  await page.locator('[data-ms21="new-version"]:visible').click();
  const dlg = page.locator('[data-ms21="version-dialog"]');
  await expect(dlg).toBeVisible();
  await shot(page, "09-new-version-1512");
  await dlg.locator('[data-ms21="save"]').click();
  await expect(dlg.locator("#ms21-v-name-err"), "the name is required").toHaveText("Add a name to save it.");
  await expect(dlg, "nothing was saved").toBeVisible();
  await dlg.locator("#ms21-v-name").fill("Tighter midpoint");
  await dlg.locator("#ms21-v-note").fill("Two chapters merged.");
  await dlg.locator("#ms21-v-words").fill("48500");
  await dlg.locator('[data-ms21="save"]').click();
  await expect(dlg).toHaveCount(0, { timeout: 15_000 });
  await expect(page.locator('[data-ms21="vcard"][data-front]:visible [data-ms21="vname"]'), "the new version is at the deck's front").toHaveText("Tighter midpoint", { timeout: 15_000 });
  await expect(page.locator('[data-ms21="vcard"][data-front]:visible [data-ms21="vwords"]'), "its word count is stored and shown").toHaveText("48,500 words");
  await expect(page.locator('[data-ms21="vcard"][data-front]:visible .ms21-vc-chip')).toHaveText("Current version");
  await expect(page.locator('[data-ms21-fact="version"]:visible dd'), "the book card names it").toHaveText("Tighter midpoint");
  await expect(page.locator('[data-ms21="see-all"]:visible')).toHaveText(`See all ${EXPECT.versionOrder.length + 1}`);
  await expect(page.getByText("Saved Tighter midpoint and made it current.").first()).toBeVisible();
  ck(8);
});

/* ══ E1 · no manuscript — the empty header, the banner, three inert previews; Add makes the page ══ */
test("E1 empty", async ({ browser }) => {
  seed("--only empty");
  const { ctx: c, page: p } = await accountContext(browser, baseURL, EMPTY_EMAIL);
  try {
    for (const vp of VPS) {
      await openMs(p, vp, null);
      await expect(p.locator('[data-ms21="header"]:visible h1')).toHaveText("Let's add your book");
      expect((await texts(p, '[data-ms21="sub"]'))[0]).toBe("Title, word count, genre and a line about it. It takes a minute, and everything else in QueryHawk hangs off it.");
      expect(await p.locator('[data-ms21="header"]:visible button').count(), "one button").toBe(1);
      expect((await texts(p, '[data-ms21="banner"] p'))[0]).toBe("Here's what this page does once your book is in.");
      const pv = await p.evaluate(() => [...document.querySelectorAll('[data-ms21="preview"]')].filter((e) => e.getBoundingClientRect().height > 0).map((a) => ({
        title: a.querySelector("h3")?.textContent ?? "", ghostHidden: a.querySelector('[data-ms21="ghost"]')?.getAttribute("aria-hidden"),
        controls: a.querySelectorAll("button, a, input").length, pe: getComputedStyle(a.querySelector('[data-ms21="ghost"]')!).pointerEvents,
      })));
      expect(pv.map((x) => x.title)).toEqual(["Your book on one page", "Every version, tracked", "Everything that goes with it"]);
      for (const x of pv) { expect(x.ghostHidden).toBe("true"); expect(x.controls, "a preview holds no control").toBe(0); expect(x.pe).toBe("none"); }
      for (const sel of ['[data-ms21="book"]', '[data-ms21="activity"]', '[data-ms21="versions"]', '[data-ms21="materials"]']) {
        expect(await p.locator(`${sel}:visible`).count(), `${sel} is not drawn with no manuscript`).toBe(0);
      }
      const hd = await one(p, '[data-ms21="header"]'), ban = await one(p, '[data-ms21="banner"]');
      expect(Math.abs(ban.y - hd.b - (wide(vp.width) ? 72 : 60)), "the banner is 72 (60) under the hairline").toBeLessThanOrEqual(1);
      ck(13 + pv.length * 3 - 3);
      await noOverflow(p, `E1 @ ${vp.width}`);
      await shot(p, `05-empty-${vp.width}`);
    }
    /* Add: a title is required; saving makes the filled page, with the first version as typed */
    await p.locator('[data-ms21="add"]:visible').click();
    const dlg = p.locator('[data-ms21="add-dialog"]');
    await expect(dlg).toBeVisible();
    await shot(p, "07-add-modal-1280");
    await expect(dlg.locator("#ms21-a-version"), "the first version is pre-filled").toHaveValue("First draft");
    await dlg.locator('[data-ms21="save"]').click();
    await expect(dlg.locator("#ms21-a-title-err")).toHaveText("Add a title to save it.");
    await dlg.locator("#ms21-a-title").fill("The Glass Tide");
    await dlg.locator("#ms21-a-words").fill("85000");
    await dlg.locator("#ms21-a-version").fill("Opening on the pier");
    await dlg.locator('[data-ms21="save"]').click();
    await expect(dlg).toHaveCount(0, { timeout: 15_000 });
    await expect(p.locator('[data-ms21="header"]:visible h1'), "the page becomes the filled state").toHaveText("The Glass Tide", { timeout: 15_000 });
    await expect(p.locator('[data-ms21="vcard"][data-front]:visible [data-ms21="vname"]'), "the first version is named as typed").toHaveText("Opening on the pier");
    await expect(p.locator('[data-ms21-fact="version"]:visible dd')).toHaveText("Opening on the pier");
    await expect(p.getByText("The Glass Tide added.").first()).toBeVisible();
    await expect(p.locator('[data-ms21="soon"]:visible'), "one manuscript: the coming-soon chip shows").toHaveCount(1);
    ck(7);
  } finally {
    await c.close();
    seed("--only empty");
  }
});

/* ══ E2 · just deleted — the header names the book that went, and says what went with it ═══════ */
test("E2 deleted", async ({ browser }) => {
  seedNow("--only delete");
  const { ctx: c, page: p } = await accountContext(browser, baseURL, DELETE_EMAIL);
  try {
    await openMs(p, VPS[0], null);
    await expect(p.locator('[data-ms21="header"]:visible h1'), "the book is shown first").toHaveText(DELETE_MS_TITLE);
    seedNow("--delete-ms");
    await expect(p.locator('[data-ms21="header"]:visible h1'), "the just-deleted title").toHaveText("Add your book again", { timeout: 30_000 });
    expect((await texts(p, '[data-ms21="sub"]'))[0]).toBe(`${DELETE_MS_TITLE} has been deleted, along with its queries and materials. Add a manuscript to start again.`);
    await expect(p.getByText(`${DELETE_MS_TITLE} deleted.`).first(), "the toast on arrival").toBeVisible();
    expect(await p.locator('[data-ms21="page"]:visible').getAttribute("data-state")).toBe("deleted");
    expect(await p.locator('[data-ms21="preview"]:visible').count(), "the previews show").toBe(3);
    ck(6);
    await shot(p, "06-deleted-1512");
  } finally {
    await c.close();
    seed("--only delete");
  }
});

test("floor: the run asserted what it claims", () => {
  console.log(`MS21 assertions: ${asserts}`);
  if (process.env.MS21_MUTATE || process.env.MS21_PARTIAL === "1") return;
  expect(asserts, `the run made ${asserts} assertions; fewer than ${FLOOR} means a lock found no subject`).toBeGreaterThanOrEqual(FLOOR);
});
