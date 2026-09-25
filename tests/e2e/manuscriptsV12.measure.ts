/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ MANUSCRIPTS v12 — the page against its locks, and against the mock by one ruler ═══════════
 *
 * Ref: design-refs/manuscripts/manuscripts-v12.html (hash-enrolled), whose default body
 * attributes are exactly the ported set. The eleven locks (L1–L11) live here in rendered form;
 * derivation-level halves are doubled as unit locks beside the code they guard.
 *
 * ⚠️ TWO OWNED ACCOUNTS, NOT THE SHARED HARNESS ONE. `firestore.rules` denies a client changing
 * its own `plan`, so the Free/Pro fixture runs on `msv12-pro@` (whose user doc the seeder may
 * delete and recreate) and the empty state on `msv12-empty@`. See seedManuscriptsV12.mjs.
 *
 * ⚠️ SERIAL, ONE SHARED PAGE, TWO SIGN-INS PER RUN. Every password sign-in feeds the Firebase
 * throttle (the house e2e-signin-throttle hazard), so the filled account signs in once in
 * beforeAll and every filled case reuses that context; the empty case makes the run's second.
 *
 * ⚠️ ASSERTION FLOOR. A run that finds no subjects has failed, not skipped — `ck()` counts and
 * the last test refuses a run under the floor.
 */
import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { visiblePage, KILL_MOTION, KILL_MOTION_ID } from "./measure";
import { assertLocalBundleIsDev } from "./bundleGuard";
import { MS_ID, PRO_EMAIL, EMPTY_EMAIL, EXPECT, PKGS } from "./msv12Fixture.mjs";

test.describe.configure({ mode: "serial" });
test.setTimeout(150_000);

let asserts = 0;
const ck = (n = 1) => { asserts += n; };
const FLOOR = 60;

const readPw = (): string => {
  if (process.env.SA_E2E_PASSWORD) return process.env.SA_E2E_PASSWORD;
  for (const line of readFileSync(resolve(process.cwd(), ".env.local"), "utf8").split("\n")) {
    const m = /^\s*SA_E2E_PASSWORD\s*=\s*(.*)$/.exec(line);
    if (m) return m[1].trim().replace(/^["']|["']$/g, "");
  }
  throw new Error("no SA_E2E_PASSWORD");
};

const seed = (args = "") => {
  execSync(`node tests/e2e/seedManuscriptsV12.mjs ${args}`, { cwd: process.cwd(), stdio: "pipe", timeout: 180_000 });
};

/** Sign an owned fixture account in by the form — ensureSignedIn only knows the harness user. */
async function signInAs(page: Page, email: string) {
  await assertLocalBundleIsDev();
  await page.goto("/#/signin");
  await page.locator("#au-email").fill(email);
  await page.locator("#au-pw").fill(readPw());
  await page.getByRole("button", { name: /^Sign in$/ }).last().click();
  await expect(page.locator(".ws-window").first()).toBeVisible({ timeout: 30_000 });
}

/** Open /manuscripts on an already-signed-in page, scoped to the fixture manuscript. */
async function openMs(page: Page, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport);
  await page.evaluate((id) => localStorage.setItem("scriptally_active_manuscript_id", id), MS_ID);
  await page.goto("/manuscripts");
  await page.addStyleTag({ content: `/*${KILL_MOTION_ID}*/${KILL_MOTION}` });
  await expect(page.locator(".ws-window").first()).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(2000);
  return visiblePage(page, ".msv12-wpg");
}

type Box = { x: number; y: number; w: number; h: number; r: number; b: number };
const box = async (page: Page, sel: string): Promise<Box | null> => {
  const r = await page.evaluate((sel) => {
    const w = window as unknown as { __saVisRoot?: () => Element };
    const root: Element | Document = w.__saVisRoot ? w.__saVisRoot() : document;
    const el = root.querySelector(sel);
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { x: b.x, y: b.y, w: b.width, h: b.height, r: b.right, bb: b.bottom };
  }, sel);
  return r ? { x: r.x, y: r.y, w: r.w, h: r.h, r: r.r, b: r.bb } : null;
};

/** The content window's own box — every position in the brief is stated relative to it. */
const winBox = async (page: Page): Promise<Box> => {
  const r = await page.evaluate(() => {
    const el = document.querySelector(".ws-window");
    if (!el) throw new Error("no .ws-window");
    const b = el.getBoundingClientRect();
    return { x: b.x, y: b.y, w: b.width, h: b.height, r: b.right, bb: b.bottom };
  });
  return { x: r.x, y: r.y, w: r.w, h: r.h, r: r.r, b: r.bb };
};

const rel = (b: Box, win: Box) => ({ x: Math.round(b.x - win.x), y: Math.round(b.y - win.y), w: Math.round(b.w), h: Math.round(b.h) });

let ctx: BrowserContext;
let page: Page;

test.beforeAll(async ({ browser }) => {
  seed();
  ctx = await browser.newContext({ viewport: { width: 1440, height: 800 } });
  page = await ctx.newPage();
  await signInAs(page, PRO_EMAIL);
});
test.afterAll(async () => { await ctx?.close(); });

/* ══ L1 · hero-one-row — art, text and cover overlap vertically; cover right = rail right ═════ */
for (const width of [1024, 1280, 1440, 1920]) {
  test(`L1 hero-one-row @ ${width}`, async () => {
    await openMs(page, { width, height: width >= 1920 ? 1080 : 800 });
    const art = await box(page, '[data-msv12="hero-art"]');
    const text = await box(page, '[data-msv12="hero-text"]');
    const cover = await box(page, '[data-msv12="cover"]');
    const rail = await box(page, '[data-msv12="rail"]');
    expect(art, "hero art missing").toBeTruthy();
    expect(text, "hero text missing").toBeTruthy();
    expect(cover, "cover missing").toBeTruthy();
    expect(rail, "rail missing").toBeTruthy();
    ck(4);
    const overlaps = (a: Box, b: Box) => Math.min(a.b, b.b) - Math.max(a.y, b.y);
    expect(overlaps(art!, text!), `art/text overlap @${width}`).toBeGreaterThan(0);
    expect(overlaps(text!, cover!), `text/cover overlap @${width}`).toBeGreaterThan(0);
    expect(overlaps(art!, cover!), `art/cover overlap @${width}`).toBeGreaterThan(0);
    expect(Math.abs(cover!.r - rail!.r), `cover right vs rail right @${width}`).toBeLessThanOrEqual(1);
    ck(4);
  });
}

/* ══ L2 · art-floats — no mask, no ancestor fill above the page ground, inside its column ═════ */
test("L2 art-floats", async () => {
  await openMs(page, { width: 1440, height: 800 });
  const r = await page.evaluate(() => {
    const root = (window as unknown as { __saVisRoot: () => Element }).__saVisRoot();
    const img = root.querySelector('[data-msv12="hero-img"]') as HTMLElement | null;
    const col = root.querySelector('[data-msv12="hero-art"]') as HTMLElement | null;
    if (!img || !col) return { missing: true as const };
    const cs = getComputedStyle(img);
    const masks = [cs.maskImage, (cs as unknown as Record<string, string>).webkitMaskImage].map((v) => v || "none");
    const fills: string[] = [];
    let el: HTMLElement | null = img.parentElement;
    /* the walk stops at the element that paints the PAGE GROUND (`.wpg-scroll` carries
       --msv12-page) — the one fill the lock permits: "no ancestor background other than the page
       ground". Anything between the art and the ground is a plate, and a plate is the fault. */
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

/* ══ L3 · one-edge — a query with an unrecorded opening lands in NO version row's count ═══════ */
test("L3 one-edge (rendered counts)", async () => {
  await openMs(page, { width: 1440, height: 800 });
  const rows = await page.evaluate(() => {
    const root = (window as unknown as { __saVisRoot: () => Element }).__saVisRoot();
    return [...root.querySelectorAll('[data-msv12="vrow"]')].map((r) => ({
      vid: r.getAttribute("data-msv12-vid"),
      qtotal: Number(r.getAttribute("data-qtotal") ?? "-1"),
      cur: r.getAttribute("data-cur") === "1",
    }));
  });
  expect(rows.length, "three version rows").toBe(3);
  const byId = Object.fromEntries(rows.map((r) => [r.vid, r]));
  expect(byId["msv12-bv-3"]?.qtotal, "bv-3 counts its package's four queries").toBe(4);
  expect(byId["msv12-bv-2"]?.qtotal, "bv-2 counts its package's two").toBe(2);
  expect(byId["msv12-bv-1"]?.qtotal, "bv-1 counts none").toBe(0);
  const sum = rows.reduce((s, r) => s + Math.max(r.qtotal, 0), 0);
  expect(sum, `the unattributed queries (${EXPECT.outsideAllVersions.join(", ")}) are in no row`).toBe(6);
  expect(byId["msv12-bv-3"]?.cur, "the newest version wears Current").toBe(true);
  ck(6);
});

/* ══ L4 · status-modal — Send opens TaskModal; dismissing writes nothing ══════════════════════ */
test("L4 status-modal", async () => {
  const pre = await openMs(page, { width: 1440, height: 800 });
  const rows = page.locator(`${pre}[data-msv12="owed-row"]`);
  expect(await rows.count(), "two owed rows").toBe(2);
  ck(1);
  const firstText = (await rows.first().innerText()).replace(/\s+/g, " ");
  expect(firstText, "the newest request first").toMatch(/full manuscript/i);
  ck(1);
  await rows.first().locator('[data-msv12="owed-send"]').click();
  const modal = page.locator(".tm-dim");
  await expect(modal, "TaskModal opens").toBeVisible({ timeout: 10_000 });
  ck(1);
  await page.keyboard.press("Escape");
  await expect(modal).toHaveCount(0, { timeout: 10_000 });
  const after = (await rows.first().innerText()).replace(/\s+/g, " ");
  expect(after, "dismissing the modal changed nothing").toBe(firstText);
  ck(2);
});

/* ══ L5 · statusdot — every status glyph is the app's own StatusDot ═══════════════════════════ */
test("L5 statusdot", async () => {
  await openMs(page, { width: 1440, height: 800 });
  const r = await page.evaluate(() => {
    const root = (window as unknown as { __saVisRoot: () => Element }).__saVisRoot();
    const wraps = [...root.querySelectorAll("[data-msv12-sd]")];
    const withSvg = wraps.filter((w) => w.querySelector('svg[viewBox="0 0 24 24"]')).length;
    const mockRings = root.querySelectorAll(".dot").length;
    return { wraps: wraps.length, withSvg, mockRings };
  });
  expect(r.wraps, "status glyph population").toBeGreaterThanOrEqual(12);
  expect(r.withSvg, "every glyph wrapper holds the real StatusDot").toBe(r.wraps);
  expect(r.mockRings, "no ported .dot rings").toBe(0);
  ck(3);
});

/* ══ L8 · tray-art — cut edges sit on the tray's own edges, clear of the text ═════════════════ */
test("L8 tray-art", async () => {
  await openMs(page, { width: 1440, height: 800 });
  const tray = await box(page, '[data-msv12="tray"]');
  const art = await box(page, '[data-msv12="tray-art"]');
  expect(tray && art, "tray and art present").toBeTruthy();
  ck(1);
  expect(Math.abs(art!.r - tray!.r), "art right = tray right").toBeLessThanOrEqual(1);
  expect(Math.abs(art!.b - tray!.b), "art bottom = tray bottom").toBeLessThanOrEqual(1);
  /* the text is measured as INK — the widest CHILD's rect — not as its max-width container: the
     container is capped at 150px whether or not any line reaches it, and the mock's own numbers
     put that cap 2px past the art's BOX (whose left edge is the cut-out's transparent margin).
     The claim is "the art never overlaps the text", and the text is the ink. */
  const inkRight = await page.evaluate(() => {
    const root = (window as unknown as { __saVisRoot: () => Element }).__saVisRoot();
    const kids = [...root.querySelectorAll('[data-msv12="tray-text"] *')];
    return Math.max(...kids.map((k) => k.getBoundingClientRect().right));
  });
  expect(inkRight, "the tray text has measurable ink").toBeGreaterThan(0);
  expect(art!.x, "art clear of the text's ink").toBeGreaterThanOrEqual(inkRight - 1);
  ck(4);
});

/* ══ L9 · honest-missing — the unset series says so, and Add opens edit-details ═══════════════ */
test("L9 honest-missing", async () => {
  const pre = await openMs(page, { width: 1440, height: 800 });
  const series = page.locator(`${pre}[data-msv12="fact-series"]`);
  await expect(series).toContainText("Not recorded");
  ck(1);
  await series.getByRole("button", { name: /add/i }).click();
  const dlg = page.locator('[data-msv12="edit-dialog"]');
  await expect(dlg, "edit-details opens").toBeVisible({ timeout: 10_000 });
  await expect(dlg.getByLabel(/series/i), "…with a Series field").toBeVisible();
  ck(2);
  await page.keyboard.press("Escape");
  await expect(dlg).toHaveCount(0, { timeout: 10_000 });
});

/* ══ L10 · sticky-rail — after 600px of scroll the rail rides at window top + 28 ══════════════ */
test("L10 sticky-rail", async () => {
  await openMs(page, { width: 1440, height: 800 });
  const pos = await page.evaluate(() => {
    const root = (window as unknown as { __saVisRoot: () => Element }).__saVisRoot();
    const el = root.querySelector('[data-msv12="rail"]') as HTMLElement;
    return getComputedStyle(el).position;
  });
  expect(pos, "sticky, never fixed").toBe("sticky");
  ck(1);
  await page.evaluate(() => {
    const sc = document.querySelector(".msv12-wpg .wpg-scroll") as HTMLElement;
    sc.scrollTop = 600;
  });
  await page.waitForTimeout(300);
  const win = await winBox(page);
  const rail = await box(page, '[data-msv12="rail"]');
  expect(Math.abs(rail!.y - (win.y + 28)), `rail top ${rail!.y} vs window ${win.y}+28`).toBeLessThanOrEqual(1.5);
  ck(1);
});

/* ══ L11 · no-appraisal — the page's own words never grade the writer ═════════════════════════ */
test("L11 no-appraisal", async () => {
  await openMs(page, { width: 1440, height: 800 });
  const text = await page.evaluate(() => {
    const root = (window as unknown as { __saVisRoot: () => Element }).__saVisRoot();
    return (root as HTMLElement).innerText;
  });
  const banned = /(?<![\w-])(only|already|still|good|bad|slow|fast|poor|strong|weak|overdue|late|behind|impressive|finally|unfortunately)(?![\w-])/i;
  const hit = banned.exec(text);
  expect(hit ? `"${hit[0]}" in: …${text.slice(Math.max(0, hit.index - 40), hit.index + 40)}…` : null, "appraisal word on the page").toBeNull();
  ck(1);
});

/* ══ L7 · pro-gate — Free sees the teaser, Pro sees the cards; restored in-run ════════════════ */
test("L7 pro-gate", async () => {
  try {
    seed("--plan Free");
    const pre = await openMs(page, { width: 1440, height: 800 });
    await expect(page.locator(`${pre}[data-msv12="pro-lock"]`), "Free: the teaser").toBeVisible();
    expect(await page.locator(`${pre}[data-msv12="pkg"]`).count(), "Free: no package cards").toBe(0);
    await expect(page.locator(`${pre}[data-msv12="pkg-inuse"]`)).toHaveCount(0);
    ck(3);
  } finally {
    seed("--plan Pro");
  }
  const pre2 = await openMs(page, { width: 1440, height: 800 });
  expect(await page.locator(`${pre2}[data-msv12="pkg"]`).count(), "Pro: every fixture package is a card").toBe(PKGS.length);
  await expect(page.locator(`${pre2}[data-msv12="pro-lock"]`)).toHaveCount(0);
  ck(2);
});

/* ══ L6 · empty-examples — five faded sections, a real CTA, nothing clickable in the ghosts ═══ */
test("L6 empty-examples", async ({ browser }) => {
  const ectx = await browser.newContext({ viewport: { width: 1440, height: 800 } });
  const ep = await ectx.newPage();
  try {
    await signInAs(ep, EMPTY_EMAIL);
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
    await expect(
      ep.getByText(/Manuscript Title/).first(),
      "the existing create flow opens",
    ).toBeVisible({ timeout: 10_000 });
    ck(1);
  } finally {
    await ectx.close();
  }
});

/* ══ Reference geometry — printed side by side; the relational rules asserted ═════════════════ */
for (const vp of [{ width: 1280, height: 800 }, { width: 1920, height: 1080 }] as const) {
  test(`geometry @ ${vp.width}`, async () => {
    await openMs(page, vp);
    const win = await winBox(page);
    const take = async (name: string, sel: string) => ({ name, b: await box(page, sel) });
    const rows = [
      await take("hero", '[data-msv12="hero"]'),
      await take("hero art", '[data-msv12="hero-art"]'),
      await take("hero text", '[data-msv12="hero-text"]'),
      await take("cover", '[data-msv12="cover"]'),
      await take("first owed", '[data-msv12="owed-row"]'),
      await take("rail", '[data-msv12="rail"]'),
      await take("tray", '[data-msv12="tray"]'),
      await take("tray art", '[data-msv12="tray-art"]'),
    ];
    console.log(`\n[geometry @ ${vp.width}] window ${Math.round(win.w)}×${Math.round(win.h)} at (${Math.round(win.x)},${Math.round(win.y)})`);
    for (const r of rows) console.log(`  ${r.name.padEnd(10)} ${r.b ? JSON.stringify(rel(r.b, win)) : "ABSENT"}`);
    for (const r of rows) { expect(r.b, `${r.name} present`).toBeTruthy(); ck(1); }
    const col = await box(page, '[data-msv12="col"]');
    const rail = await box(page, '[data-msv12="rail"]');
    expect(Math.abs(rail!.x - (col!.r + 28)), "rail left = col right + 28").toBeLessThanOrEqual(1.5);
    ck(1);
  });
}

/* ══ The mock, by the same ruler — measurements printed for the report ════════════════════════ */
test("mock reference render", async ({ browser }) => {
  const mctx = await browser.newContext();
  const mp = await mctx.newPage();
  try {
    const mock = "file://" + resolve(process.cwd(), "design-refs/manuscripts/manuscripts-v12.html");
    for (const vp of [{ width: 1280, height: 800 }, { width: 1920, height: 1080 }]) {
      await mp.setViewportSize(vp);
      await mp.goto(mock);
      await mp.evaluate(() => (document as unknown as { fonts?: { ready: Promise<unknown> } }).fonts?.ready);
      await mp.waitForTimeout(400);
      const rows = await mp.evaluate(() => {
        const win = document.querySelector(".window")!.getBoundingClientRect();
        const g = (sel: string) => {
          const el = document.querySelector(sel);
          if (!el) return null;
          const b = el.getBoundingClientRect();
          return [Math.round(b.x - win.x), Math.round(b.y - win.y), Math.round(b.width), Math.round(b.height)];
        };
        return {
          hero: g(".hero7:not(.e-hero)"), art: g(".hero7:not(.e-hero) .h7-art"), text: g(".hero7:not(.e-hero) .h7-text"),
          cover: g(".hero7:not(.e-hero) .h7-cover .cover-ph"), owed: g(".owed-row"),
          rail: g(".rail:not(.e-rail)"), tray: g(".rail:not(.e-rail) .tray"), trayArt: g(".rail:not(.e-rail) .tray-art"),
        };
      });
      console.log(`\n[mock @ ${vp.width}]`, JSON.stringify(rows));
      expect(rows.hero, "mock hero rendered").toBeTruthy();
      ck(1);
    }
  } finally {
    await mctx.close();
  }
});

/* ══ the floor ════════════════════════════════════════════════════════════════════════════════ */
test("assertion floor", () => {
  expect(asserts, `assertion floor — ${asserts} < ${FLOOR} means the run measured less than last time`).toBeGreaterThanOrEqual(FLOOR);
});
