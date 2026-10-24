/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PRICING v4 (ref design-refs/pricing-page-v2.html) — the locks that need a rendered page.
 *
 *   PV4-1 the box sits across the join: at 1440×900 its top is above the sheet's top and its bottom
 *         below it; the drawing is mirrored (scaleX −1); the toggle's ink is centred on the box ±1px;
 *         opened, the panel's bottom meets the toggle's top with a gap of 0
 *   PV4-2 the counter is live or absent: with no figure no counter renders and the box states no
 *         number but the H1's 100; with one, the line reads exactly "{n} places left"
 *   PV4-3 the questions: Next is disabled until each step is answered, a novel needs its length,
 *         "I don't know" sets 40 and the stepper clears it, "Not sure yet" estimates as steady, and
 *         the result's plan is campaignEstimate's with exactly that one tile navy
 *   PV4-4 the faces: Special Elite 400 for the H1, a price, a question and the estimate; Source
 *         Serif 4 for body and buttons; JetBrains Mono for the kicker, the counter line and the
 *         toggle — read off the computed style, with each face proved loaded
 *   PV4-5 the fold: at 1440×900 and 1280×800 the H1, the counter, the form and the toggle are on
 *         screen without scrolling
 *   shots (PV4_SHOTS=1): the top closed and open, Pro plans with the questions on question 1, the
 *         result — at 1440×900, 1280×800 and 390×844, beside the ref at the same sizes
 *
 *   PV4_MUTATE=<name>  applies a lock's named break in the page, to prove the lock goes red.
 *
 * ⚠️ THE COUNT IS MOCKED where a lock needs it: a local preview has no `/api/waitlist`, so the
 * counter would otherwise never render and every claim about it would pass on an absence.
 *
 *   SA_E2E_BASE_URL=http://127.0.0.1:<port> npx playwright test tests/e2e/pricingV4.measure.ts
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { assertLocalBundleIsDev } from "./bundleGuard";
import { estimateCampaign, type CampaignAnswers } from "../../src/marketing/campaignEstimate";

const TODAY = "2026-10-24T12:00:00";
const SHOTS = "reports/pricing-v4/shots";
const REF = "file://" + resolve("design-refs/pricing-page-v2.html");
const MUTATE = process.env.PV4_MUTATE ?? "";

/** Each lock's named break, as a stylesheet applied after load. */
const MUTATIONS: Record<string, string> = {
  across: ".mk-pv4 .mk-fb{margin-top:0!important}",
  mirror: ".mk-pv4 .mk-fbart{transform:none!important}",
  centre: ".mk-pv4 .mk-fbmore{justify-content:flex-start!important}",
  gap: ".mk-pv4 .mk-fbdetail{margin-bottom:10px!important}",
  face: ".mk-scope .mk-fbh1{font-family:Georgia,serif!important}",
  mono: ".mk-pv4 .mk-fbcount .mk-fmmeta{font-family:var(--mk-f-serif)!important}",
  fold: ".mk-pv4 .mk-fbtext{padding-top:400px!important}",
};

test.beforeAll(async () => { await assertLocalBundleIsDev(); });

async function open(page: Page, vp: { width: number; height: number }, count: boolean) {
  await page.setViewportSize(vp);
  await page.clock.setFixedTime(new Date(TODAY));
  await page.route("**/api/waitlist", (route) =>
    count && route.request().method() === "GET"
      ? route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, count: 37, cap: 100 }) })
      : route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html>" }));
  await page.goto("/pricing", { waitUntil: "load" });
  await page.waitForSelector(".mk-fb");
  await page.addStyleTag({ content: "*,*::before,*::after{transition:none!important;animation:none!important}html{scroll-behavior:auto!important}" });
  if (MUTATIONS[MUTATE]) await page.addStyleTag({ content: MUTATIONS[MUTATE] });
  await page.evaluate(() => document.fonts.ready);
  if (count) await page.waitForSelector(".mk-fbcount .mk-fmcount");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(100);
}

const box = (page: Page, sel: string) => page.locator(sel).first().evaluate((e) => {
  const r = e.getBoundingClientRect();
  return { top: r.top + window.scrollY, bottom: r.bottom + window.scrollY, left: r.left, right: r.right, vt: r.top, vb: r.bottom };
});

test("PV4-1 the box sits across the join, its drawing mirrored, its toggle centred and flush", async ({ page }) => {
  await open(page, { width: 1440, height: 900 }, true);
  const fb = await box(page, ".mk-fb");
  const sheet = await box(page, ".mk-sheet");
  console.log("PV4-1 across", JSON.stringify({ box: [fb.top, fb.bottom], sheetTop: sheet.top }));
  expect(fb.top, "the box's top is above the sheet's").toBeLessThan(sheet.top);
  expect(fb.bottom, "the box's bottom is below the sheet's top").toBeGreaterThan(sheet.top);

  const t = await page.locator(".mk-fbart").evaluate((e) => getComputedStyle(e).transform);
  console.log("PV4-1 art transform", t);
  expect(t, "the drawing is mirrored").toBe("matrix(-1, 0, 0, 1, 0, 0)");

  /* The toggle's INK — the leading rule, the label, the chevron and the trailing rule — not its
     box, which spans the box's whole width and is centred whatever its contents do. */
  const ink = await page.locator(".mk-fbmore").evaluate((b) => {
    const lbl = b.querySelector(".mk-fbmorelbl")!.getBoundingClientRect();
    const chev = b.querySelector(".mk-fbchev")!.getBoundingClientRect();
    const after = getComputedStyle(b, "::after");
    const right = chev.right + parseFloat(after.marginLeft) + parseFloat(after.width) + parseFloat(getComputedStyle(b).columnGap || "0");
    return { left: lbl.left, right };
  });
  const mid = (ink.left + ink.right) / 2, boxMid = (fb.left + fb.right) / 2;
  console.log("PV4-1 toggle centre", mid.toFixed(2), "box centre", boxMid.toFixed(2));
  expect(Math.abs(mid - boxMid), "the toggle is centred on the box").toBeLessThanOrEqual(1);

  await page.click(".mk-fbmore");
  await expect(page.locator(".mk-fbmore")).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator(".mk-fbmorelbl")).toHaveText("Show less");
  const panel = await box(page, ".mk-fbdetail");
  const tog = await box(page, ".mk-fbmore");
  console.log("PV4-1 open gap", (tog.top - panel.bottom).toFixed(3));
  expect(panel.bottom - panel.top, "the panel is open").toBeGreaterThan(100);
  expect(Math.abs(tog.top - panel.bottom), "no strip between the panel and the toggle").toBeLessThan(0.5);
});

test("PV4-2 the counter is live or absent, and reads '{n} places left'", async ({ page }) => {
  await open(page, { width: 1440, height: 900 }, false);
  expect(await page.locator(".mk-fb .mk-fmcount").count(), "no figure, no counter").toBe(0);
  const text = await page.locator(".mk-fbtext").innerText();
  expect(text.match(/\d+/g), "no number in the box but the H1's 100").toEqual(["100"]);
  await page.unrouteAll({ behavior: "ignoreErrors" });

  await open(page, { width: 1440, height: 900 }, true);
  const line = (await page.locator(".mk-fbcount .mk-fmmeta").innerText()).trim();
  console.log("PV4-2 line", JSON.stringify(line));
  /* text-transform uppercases it on screen; the words are read from the DOM */
  expect(await page.locator(".mk-fbcount .mk-fmmeta").textContent()).toBe("63 places left");
  expect(await page.locator(".mk-fbcount .mk-fmbar").getAttribute("aria-label")).toBe("37 of 100 places claimed");
});

async function answer(page: Page, label: string) {
  await page.locator(".mk-pv4how button", { hasText: label }).first().click();
}

test("PV4-3 the questions open, gate each step, and turn exactly the fitting tile navy", async ({ page }) => {
  await open(page, { width: 1440, height: 900 }, true);
  const how = page.locator("#how-long");
  await expect(how, "hidden until the link opens it").toBeHidden();
  await page.click(".mk-pv4suit");
  await expect(how).toBeVisible();
  await expect(page.locator(".mk-pv4suit")).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator(".mk-pv4suit")).toHaveText("Hide the questions");
  await page.waitForTimeout(500);
  await expect(page.locator(".mk-jyq"), "focus moves to the first question").toBeFocused();

  const next = page.locator(".mk-jynext");
  expect(await page.locator(".mk-pv4ptile--fit").count(), "no tile navy before a result").toBe(0);
  await expect(next, "question 1 opens with Next disabled").toBeDisabled();
  await answer(page, "Getting ready");
  await expect(next).toBeEnabled();
  await next.click();
  await expect(next, "question 2 opens with Next disabled").toBeDisabled();
  await answer(page, "A novel");
  await expect(next, "a novel needs its length").toBeDisabled();
  await answer(page, "80,000 to 110,000");
  await expect(next).toBeEnabled();
  await next.click();

  const out = page.locator(".mk-jystepper output");
  await expect(next, "the agents count has a default").toBeEnabled();
  await page.getByRole("button", { name: "More agents" }).click();
  await expect(out).toHaveText("45");
  await page.click(".mk-jyidk");
  await expect(out, "I don't know sets 40").toHaveText("40");
  await expect(page.locator(".mk-jyidk")).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Fewer agents" }).click();
  await expect(page.locator(".mk-jyidk"), "the stepper clears it").toHaveAttribute("aria-pressed", "false");
  await expect(out).toHaveText("35");
  await page.click(".mk-jyidk");
  await expect(out).toHaveText("40");
  await next.click();

  await expect(next, "question 4 opens with Next disabled").toBeDisabled();
  await answer(page, "Not sure yet");
  await next.click();
  await page.waitForSelector(".mk-jyplan");

  const a: CampaignAnswers = { stage: "prep", kind: "novel", len: "m", agents: 40, agentsUnknown: true, pace: "unsure" };
  const want = estimateCampaign(a, new Date(TODAY));
  const steady = estimateCampaign({ ...a, pace: "steady" }, new Date(TODAY));
  expect(want.fit, "Not sure yet estimates as steady").toBe(steady.fit);
  expect(want.label).toBe(steady.label);
  await expect(page.locator(".mk-jybig")).toHaveText(want.label);
  await expect(page.locator(".mk-jywhy")).toHaveText(want.why);
  expect(Number(await page.locator(".mk-jyplan").getAttribute("data-fit"))).toBe(want.fit);
  /* The fit reaches the tiles in an effect after the result paints — wait for it, never sample. */
  await expect(page.locator(".mk-pv4ptile--fit")).toHaveCount(1);
  const navy = await page.locator(".mk-pv4ptile--fit").evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.m));
  console.log("PV4-3", JSON.stringify({ label: want.label, fit: want.fit, navy }));
  expect(navy, "exactly the fitting tile is navy").toEqual([String(want.fit)]);
  const bg = await page.locator(".mk-pv4ptile--fit").evaluate((e) => getComputedStyle(e).backgroundColor);
  expect(bg, "and it is the navy").toBe("rgb(42, 58, 82)");
});

test("PV4-4 the faces", async ({ page }) => {
  await open(page, { width: 1440, height: 900 }, true);
  await page.click(".mk-pv4suit");
  await page.waitForTimeout(500);
  /* ⚠️ `fonts.load`, NOT `fonts.check` ALONE: a face is fetched when something first asks for it, so
     a check made before that answers false about a page that is fine. `load` resolves with the faces
     it found — an empty list means the page declares no such face, which is the real failure. */
  const loaded = await page.evaluate(() => Promise.all(["Special Elite", "Source Serif 4", "JetBrains Mono"]
    .map(async (f) => [f, (await document.fonts.load(`16px "${f}"`)).length, document.fonts.check(`16px "${f}"`)] as const)));
  console.log("PV4-4 loaded", JSON.stringify(loaded));
  for (const [f, faces, ok] of loaded) {
    expect(faces, `${f} is declared and loads`).toBeGreaterThan(0);
    expect(ok, `${f} is loaded`).toBe(true);
  }
  const face = (sel: string) => page.locator(sel).first().evaluate((e) => {
    const c = getComputedStyle(e);
    return { family: c.fontFamily.split(",")[0].replace(/["']/g, "").trim(), weight: c.fontWeight };
  });
  const expectFace = async (sel: string, family: string, weight?: string) => {
    const f = await face(sel);
    console.log(`PV4-4 ${sel} ${f.family} ${f.weight}`);
    expect(f.family, sel).toBe(family);
    if (weight) expect(f.weight, `${sel} weight`).toBe(weight);
  };
  for (const s of [".mk-fbh1", ".mk-pv4pprice", ".mk-jyq"]) await expectFace(s, "Special Elite", "400");
  await expectFace(".mk-fbsub", "Source Serif 4");
  await expectFace(".mk-fbform button", "Source Serif 4");
  await expectFace(".mk-pv4suit", "Source Serif 4");
  for (const s of [".mk-fbtag", ".mk-fbcount .mk-fmmeta", ".mk-fbmore"]) await expectFace(s, "JetBrains Mono");
  /* the estimate, after a short drive */
  await answer(page, "Ready to start"); await page.click(".mk-jynext");
  await answer(page, "A picture book"); await page.click(".mk-jynext");
  await page.click(".mk-jynext");
  await answer(page, "A few at a time"); await page.click(".mk-jynext");
  await expectFace(".mk-jybig", "Special Elite", "400");
});

for (const vp of [{ width: 1440, height: 900 }, { width: 1280, height: 800 }]) {
  test(`PV4-5 the fold @${vp.width}: the H1, the counter, the form and the toggle are on screen`, async ({ page }) => {
    await open(page, vp, true);
    for (const sel of [".mk-fbh1", ".mk-fbcount .mk-fmcount", ".mk-fbform", ".mk-fbmore"]) {
      const r = await box(page, sel);
      console.log(`PV4-5 @${vp.width} ${sel} ${r.vt.toFixed(1)}–${r.vb.toFixed(1)}`);
      expect(r.vt, `${sel} top`).toBeGreaterThanOrEqual(0);
      expect(r.vb, `${sel} is above the fold`).toBeLessThanOrEqual(vp.height);
    }
  });
}

test("shots: top closed and open, Pro plans on question 1, the result — app beside ref", async ({ page }) => {
  test.skip(!process.env.PV4_SHOTS);
  test.setTimeout(240_000);
  mkdirSync(SHOTS, { recursive: true });
  for (const vp of [{ width: 1440, height: 900 }, { width: 1280, height: 800 }, { width: 390, height: 844 }]) {
    const sides: [string, string, Record<string, string>][] = [
      ["app", "/pricing", { more: ".mk-fbmore", link: ".mk-pv4suit", plans: ".mk-pv4plans", next: ".mk-jynext", btn: ".mk-pv4how button", res: ".mk-jyplan" }],
      ["ref", REF, { more: ".fbmore", link: ".suit-link", plans: ".plansbox", next: ".jy-step:not([hidden]) .jy-next", btn: ".suit button", res: ".jy-plan" }],
    ];
    for (const [side, url, s] of sides) {
      await page.setViewportSize(vp);
      await page.clock.setFixedTime(new Date(TODAY));
      await page.route("**/api/waitlist", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, count: 37, cap: 100 }) }));
      await page.goto(url, { waitUntil: "load" });
      await page.addStyleTag({ content: "*,*::before,*::after{transition:none!important;animation:none!important}html{scroll-behavior:auto!important}" });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(300);
      const tag = `${vp.width}-${side}`;
      await page.screenshot({ path: `${SHOTS}/top-closed-${tag}.png` });
      await page.click(s.more);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: `${SHOTS}/top-open-${tag}.png` });
      await page.click(s.more);
      await page.click(s.link);
      await page.waitForTimeout(500);
      await page.locator(s.plans).evaluate((e) => e.scrollIntoView({ block: "start" }));
      await page.evaluate(() => window.scrollBy(0, -90));
      await page.screenshot({ path: `${SHOTS}/plans-q1-${tag}.png` });
      const pick = (t: string) => page.locator(s.btn, { hasText: t }).first().click();
      await pick("Getting ready"); await page.click(s.next);
      await pick("A novel"); await pick("80,000 to 110,000"); await page.click(s.next);
      await pick("I don't know"); await page.click(s.next);
      await pick("Not sure yet"); await page.click(s.next);
      await page.waitForSelector(s.res);
      await page.locator(s.plans).evaluate((e) => e.scrollIntoView({ block: "start" }));
      await page.evaluate(() => window.scrollBy(0, -90));
      await page.screenshot({ path: `${SHOTS}/result-${tag}.png`, fullPage: false });
      await page.unrouteAll({ behavior: "ignoreErrors" });
    }
  }
});
