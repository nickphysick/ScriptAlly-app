/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PRICING v3 (ref design-refs/pricing-page-v1.html) — the locks that need a rendered page.
 *
 *   PV1 the faces: Special Elite 400 for display, Source Serif 4 for text and buttons, JetBrains Mono
 *       for the labels — read off the computed style, with the face proved loaded
 *   PV2 the banner's order ON SCREEN: the counter sits above the form
 *   PV3 the counter is live or absent: no figure, no counter and no number in the band
 *   PV4 the journey: Next opens only once a step is answered, a novel needs its length, and the
 *       result's pass and its one highlighted tile are campaignEstimate's
 *   PV5 the fold: at 1440×900 and 1280×800 the H1, the counter, the form and both tier prices are
 *       on screen without scrolling
 *   shots (PV_SHOTS=1): top, question 1 and the result at 1440×900, 1280×800 and 390×844
 *
 * ⚠️ THE COUNT IS MOCKED where a lock needs it, the way landingColoursV2 does: a local preview has
 * no `/api/waitlist`, so the counter would otherwise never render and every claim about it would
 * pass on an absence.
 *
 *   SA_E2E_BASE_URL=http://127.0.0.1:<port> npx playwright test tests/e2e/pricingV3.measure.ts
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { assertLocalBundleIsDev } from "./bundleGuard";
import { estimateCampaign, type CampaignAnswers } from "../../src/marketing/campaignEstimate";

const TODAY = "2026-10-21T12:00:00";
const SHOTS = "reports/pricing-v3/shots/narrow";

test.beforeAll(async () => { await assertLocalBundleIsDev(); });

async function open(page: Page, vp: { width: number; height: number }, count: boolean) {
  await page.setViewportSize(vp);
  await page.clock.setFixedTime(new Date(TODAY));
  await page.route("**/api/waitlist", (route) =>
    count && route.request().method() === "GET"
      ? route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, count: 37, cap: 100 }) })
      : route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html>" }));
  await page.goto("/pricing", { waitUntil: "load" });
  await page.waitForSelector(".mk-pv3band");
  await page.addStyleTag({ content: "*,*::before,*::after{transition:none!important;animation:none!important}html{scroll-behavior:auto!important}" });
  await page.evaluate(() => document.fonts.ready);
  if (count) await page.waitForSelector(".mk-pv3count .mk-fmcount");
  await page.evaluate(() => window.scrollTo(0, 0));
}

/** Drive the journey to its result. Picks are option labels; `len` only for a novel. */
async function drive(page: Page, a: { stage: string; kind: string; len?: string; agents: number; pace: string }) {
  const jy = page.locator(".mk-jy");
  const next = jy.locator(".mk-jynext");
  const pick = (t: string) => jy.getByRole("button", { name: t, exact: false }).first();
  await expect(next, "question 1 opens with Next disabled").toBeDisabled();
  await pick(a.stage).click();
  await expect(next).toBeEnabled();
  await next.click();
  await expect(next, "question 2 opens with Next disabled").toBeDisabled();
  await pick(a.kind).click();
  if (a.len) {
    await expect(next, "a novel needs its length").toBeDisabled();
    await pick(a.len).click();
  }
  await expect(next).toBeEnabled();
  await next.click();
  await expect(next, "the agents count has a default").toBeEnabled();
  const out = jy.locator(".mk-jystepper output");
  while (Number(await out.textContent()) > a.agents) await jy.getByRole("button", { name: "Fewer agents" }).click();
  while (Number(await out.textContent()) < a.agents) await jy.getByRole("button", { name: "More agents" }).click();
  await next.click();
  await expect(next, "question 4 opens with Next disabled").toBeDisabled();
  await pick(a.pace).click();
  await next.click();
  await page.waitForSelector(".mk-jyplan");
}

const font = (page: Page, sel: string) => page.locator(sel).first().evaluate((e) => {
  const c = getComputedStyle(e);
  return { family: c.fontFamily.split(",")[0].replace(/["']/g, "").trim(), weight: c.fontWeight };
});

test("PV1 the faces are the marketing faces, and they loaded", async ({ page }) => {
  await open(page, { width: 1440, height: 900 }, true);
  const loaded = await page.evaluate(() => ({
    elite: document.fonts.check('16px "Special Elite"'),
    serif: document.fonts.check('16px "Source Serif 4"'),
    mono: document.fonts.check('16px "JetBrains Mono"'),
  }));
  expect(loaded).toEqual({ elite: true, serif: true, mono: true });
  await drive(page, { stage: "Getting ready", kind: "A novel", len: "80,000 to 110,000", agents: 40, pace: "A few at a time" });
  const display = [".mk-pv3h1", ".mk-pv3amt", ".mk-pv3tname", ".mk-pv3launch", ".mk-jytitle", ".mk-jybig", ".mk-jyplanname", ".mk-jymini b"];
  const text = [".mk-pv3sub", ".mk-pv3tlist li", ".mk-pv3a", ".mk-pv3q", ".mk-pv3form button", ".mk-jywhy", ".mk-jyagain"];
  const mono = [".mk-pv3kicker", ".mk-pv3count .mk-fmmeta", ".mk-jycount", ".mk-jypm", ".mk-jyflag"];
  for (const s of display) expect(await font(page, s), s).toEqual({ family: "Special Elite", weight: "400" });
  for (const s of text) expect((await font(page, s)).family, s).toBe("Source Serif 4");
  for (const s of mono) expect((await font(page, s)).family, s).toBe("JetBrains Mono");
  /* the question face, read on a question screen rather than the result */
  await page.locator(".mk-jyagain").click();
  expect(await font(page, ".mk-jyq"), ".mk-jyq").toEqual({ family: "Special Elite", weight: "400" });
  expect((await font(page, ".mk-jyopt")).family, ".mk-jyopt").toBe("Source Serif 4");
  expect((await font(page, ".mk-jynext")).family, ".mk-jynext").toBe("Source Serif 4");
});

test("PV2 the counter sits above the form, on screen", async ({ page }) => {
  for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await open(page, vp, true);
    const r = await page.evaluate(() => {
      const c = document.querySelector(".mk-pv3count .mk-fmcount")!.getBoundingClientRect();
      const f = document.querySelector(".mk-pv3form")!.getBoundingClientRect();
      return { countBottom: c.bottom, formTop: f.top, countH: c.height };
    });
    expect(r.countH, `${vp.width}: the counter has a box`).toBeGreaterThan(0);
    expect(r.countBottom, `${vp.width}: counter above form`).toBeLessThanOrEqual(r.formTop);
  }
});

test("PV3 with no figure there is no counter and no number in the band", async ({ page }) => {
  await open(page, { width: 1440, height: 900 }, false);
  await page.waitForTimeout(800); /* the count request has been answered (with HTML) */
  expect(await page.locator(".mk-pv3count .mk-fmcount").count()).toBe(0);
  const digits = await page.locator(".mk-pv3band").evaluate((e) => (e as HTMLElement).innerText.match(/\d+/g));
  expect(digits).toEqual(["100"]);
});

const CASES: { a: { stage: string; kind: string; len?: string; agents: number; pace: string }; answers: CampaignAnswers }[] = [
  { a: { stage: "Getting ready", kind: "A novel", len: "80,000 to 110,000", agents: 40, pace: "A few at a time" },
    answers: { stage: "prep", kind: "novel", len: "m", agents: 40, pace: "steady" } },
  { a: { stage: "Ready to start", kind: "A picture book", agents: 20, pace: "Bigger batches" },
    answers: { stage: "ready", kind: "pb", len: null, agents: 20, pace: "brisk" } },
  { a: { stage: "Already querying", kind: "Non-fiction", agents: 15, pace: "Bigger batches" },
    answers: { stage: "already", kind: "nonfic", len: null, agents: 15, pace: "brisk" } },
];

test("PV4 the journey gates each step and its result is campaignEstimate's", async ({ page }) => {
  const fits = new Set<number>();
  for (const c of CASES) {
    await open(page, { width: 1440, height: 900 }, false);
    await drive(page, c.a);
    const want = estimateCampaign(c.answers, new Date(TODAY));
    fits.add(want.fit);
    const got = await page.evaluate(() => ({
      fit: Number(document.querySelector(".mk-jyplan")!.getAttribute("data-fit")),
      label: document.querySelector(".mk-jybig")!.textContent,
      tiles: Array.from(document.querySelectorAll(".mk-jymini--fit")).map((t) => Number(t.getAttribute("data-m"))),
      focused: document.activeElement?.classList.contains("mk-jybig"),
    }));
    expect(got.fit, JSON.stringify(c.answers)).toBe(want.fit);
    expect(got.label).toBe(want.label);
    expect(got.tiles, "exactly one tile highlighted, the fitting pass").toEqual([want.fit]);
    expect(got.focused, "focus moved to the result").toBe(true);
  }
  expect(fits.size, "the cases reach more than one pass (not a monoculture)").toBeGreaterThan(1);
});

test("PV5 the H1, the counter, the form and both prices are above the fold", async ({ page }) => {
  for (const vp of [{ width: 1440, height: 900 }, { width: 1280, height: 800 }]) {
    await open(page, vp, true);
    const boxes = await page.evaluate(() => {
      const r = (e: Element) => { const b = e.getBoundingClientRect(); return { top: b.top, bottom: b.bottom, h: b.height }; };
      return {
        h1: r(document.querySelector(".mk-pv3h1")!),
        counter: r(document.querySelector(".mk-pv3count .mk-fmcount")!),
        form: r(document.querySelector(".mk-pv3form")!),
        prices: Array.from(document.querySelectorAll(".mk-pv3tier .mk-pv3price")).map(r),
        vh: window.innerHeight,
      };
    });
    expect(boxes.prices).toHaveLength(2);
    for (const [name, b] of [["h1", boxes.h1], ["counter", boxes.counter], ["form", boxes.form], ["free price", boxes.prices[0]], ["pro price", boxes.prices[1]]] as const) {
      expect(b.h, `${vp.width}: ${name} has a box`).toBeGreaterThan(0);
      expect(b.top, `${vp.width}: ${name} below the top`).toBeGreaterThanOrEqual(0);
      expect(b.bottom, `${vp.width}: ${name} above the fold (${boxes.vh})`).toBeLessThanOrEqual(boxes.vh);
    }
  }
});

test("shots: top, question 1 and the result at three widths", async ({ page }) => {
  test.skip(!process.env.PV_SHOTS, "PV_SHOTS=1 to write the report's screenshots");
  mkdirSync(SHOTS, { recursive: true });
  for (const vp of [{ width: 1440, height: 900 }, { width: 1280, height: 800 }, { width: 390, height: 844 }]) {
    await open(page, vp, true);
    await page.screenshot({ path: `${SHOTS}/top-${vp.width}x${vp.height}.png` });
    await page.locator("#how-long").evaluate((e) => e.scrollIntoView({ block: "start" }));
    await page.evaluate(() => window.scrollBy(0, -100));
    await page.screenshot({ path: `${SHOTS}/question1-${vp.width}x${vp.height}.png` });
    await drive(page, CASES[0].a);
    await page.locator(".mk-jy").evaluate((e) => e.scrollIntoView({ block: "start" }));
    await page.evaluate(() => window.scrollBy(0, -100));
    await page.screenshot({ path: `${SHOTS}/result-${vp.width}x${vp.height}.png` });
  }
});
