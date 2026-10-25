/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PRICING ON PHONES — the locks for /pricing at and below 760px (25 Oct; ref
 * design-refs/pricing-page-mobile-v1.html). Each lock is a rendered-page claim, taken at 390 × 844
 * and 375 × 667 unless it says otherwise.
 *
 *   PVM-1 the switch      at 760 the phone tree, at 761 the desktop one; one h1 either way, the box's
 *   PVM-2 the box         across the join; the drawing mirrored and perched above it; the sheet not moved
 *   PVM-3 the first screen  H1, counter, field, Claim and the toggle all on screen at 390 × 844
 *   PVM-4 the carousel    swiping to the third perk moves the current dot to the third
 *   PVM-5 the tiers       switch and track agree after a tap and after a swipe; Free shorter than Pro
 *   PVM-6 the sheet       modal: focus held, page still; Escape returns focus; the result lights one tile
 *   PVM-7 the sticky bar  hidden by the form, shown once it is gone, hidden by the sheet, absent with
 *                         no figure, never over the footer's links; its button brings the field back
 *   PVM-8 the accordion   a question opens with aria-expanded and shows its answer
 *   PVM-9 the copy        no "pass", no £5.99 in any of the four tails, the eight questions verbatim
 *   PVM-10 the faces      Special Elite 400 / Source Serif 4 / JetBrains Mono where the ref puts them
 *
 *   PVM_MUTATE=<name>  applies a lock's named CSS break in the page, to prove it goes red.
 *   Breaks in BEHAVIOUR are source changes: `node scripts/pricing-mobile-mutate.mjs apply <name>`,
 *   rebuild, run, `… restore`. Both kinds are recorded in reports/pricing-v4-mobile/redbefore/.
 *   PVM_SHOTS=1        writes the seven phones and the 375 × 667 pair to reports/pricing-v4-mobile/shots.
 *
 * ⚠️ THE COUNT IS MOCKED: a local preview has no `/api/waitlist`, so the counter would never render
 * and every claim about it — and about the sticky bar, which needs it — would pass on an absence.
 *
 *   SA_E2E_BASE_URL=http://127.0.0.1:<port> npx playwright test tests/e2e/pricingMobile.measure.ts
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { assertLocalBundleIsDev } from "./bundleGuard";
import { estimateCampaign, type CampaignAnswers } from "../../src/marketing/campaignEstimate";

const TODAY = "2026-10-24T12:00:00";
const SHOTS = "reports/pricing-v4-mobile/shots";
const REF = "file://" + resolve("design-refs/pricing-page-mobile-v1.html");
const MUTATE = process.env.PVM_MUTATE ?? "";
/* Read, not imported: Playwright's loader wants an import attribute for JSON, which the app's
   TypeScript config does not take. */
const refCases = JSON.parse(readFileSync(resolve("src/marketing/campaignEstimate.ref.json"), "utf8")) as unknown[];
const PHONES = [{ width: 390, height: 844 }, { width: 375, height: 667 }];

/** Each lock's named CSS break, applied after load. */
const MUTATIONS: Record<string, string> = {
  /* PVM-2 */
  across: ".mk-pvm .mk-pvbox{margin-top:0!important}",
  mirror: ".mk-pvm .mk-pvart{transform:none!important}",
  perch: ".mk-pvm .mk-pvart{top:20px!important}",
  /* the draft's bug: nothing between the box's margin and the sheet establishes a formatting context */
  collapse: ".mk-scope{display:block!important}.mk-sheet:has(.mk-pvm),.mk-pvm{display:block!important}",
  /* the flow-root declarations alone, with the shell's flex column left in place (see PVM-2) */
  flowroot: ".mk-sheet:has(.mk-pvm),.mk-pvm{display:block!important}",
  /* PVM-3 */
  fold: ".mk-pvm .mk-pvin{padding-top:300px!important}",
  /* PVM-5 */
  stretch: ".mk-pvm .mk-pvtrack{align-items:stretch!important}",
  /* PVM-7 */
  stickshow: ".mk-pvlayer.mk-pvstick{transform:none!important;visibility:visible!important}",
  stickpad: ".mk-scope:has(.mk-pvstick.mk-on){padding-bottom:0!important}",
  /* PVM-8 */
  answer: ".mk-pvm .mk-pvqaa{display:none!important}",
  /* PVM-10 */
  face: ".mk-scope .mk-pvh1{font-family:Georgia,serif!important}",
  serif: ".mk-pvm .mk-pvsub{font-family:Georgia,serif!important}",
  mono: ".mk-pvm .mk-pvmore{font-family:var(--mk-f-serif)!important}",
};

test.beforeAll(async () => { await assertLocalBundleIsDev(); });
/* ⚠️ A CONTROL THAT IS NOT THERE FAILS IN SECONDS. Without this a click on a missing element waits
   out the whole test timeout — the first run of PVM-6 sat for seven minutes on exactly that. */
test.use({ actionTimeout: 10_000 });

async function open(page: Page, vp: { width: number; height: number }, count = true, motion = false) {
  await page.setViewportSize(vp);
  await page.clock.setFixedTime(new Date(TODAY));
  await page.route("**/api/waitlist", (route) =>
    count && route.request().method() === "GET"
      ? route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, count: 37, cap: 100 }) })
      : route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html>" }));
  await page.goto("/pricing", { waitUntil: "load" });
  await page.waitForSelector(".mk-pvbox, .mk-fb");
  if (!motion) await page.addStyleTag({ content: "*,*::before,*::after{transition:none!important;animation:none!important}html{scroll-behavior:auto!important}" });
  if (MUTATIONS[MUTATE]) await page.addStyleTag({ content: MUTATIONS[MUTATE] });
  await page.evaluate(() => document.fonts.ready);
  if (count) await page.waitForSelector(".mk-pvcount .mk-fmcount, .mk-fb .mk-fmcount");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(150);
}

const rect = (page: Page, sel: string) => page.locator(sel).first().evaluate((e) => {
  const r = e.getBoundingClientRect();
  return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, height: r.height, width: r.width, docTop: r.top + window.scrollY };
});
const scrollTo = (page: Page, y: number) => page.evaluate((t) => { window.scrollTo(0, t); }, y).then(() => page.waitForTimeout(150));
const docTop = (page: Page, sel: string) => rect(page, sel).then((r) => r.docTop);
/** Until the window's scroll position holds still for 300ms (or 4s pass). */
async function settleScroll(page: Page) {
  await page.waitForTimeout(350);
  let last = -1, still = 0;
  for (let i = 0; i < 40 && still < 3; i++) {
    const y = await page.evaluate(() => window.scrollY);
    still = Math.abs(y - last) < 0.5 ? still + 1 : 0;
    last = y;
    await page.waitForTimeout(100);
  }
}

/** Drive the sheet to its result. `agents` is a multiple of 5, or "idk". */
async function drive(page: Page, a: { stage: string; kind: string; len: string | null; agents: number | "idk"; pace: string }) {
  const STAGE: Record<string, string> = { prep: "Getting ready", ready: "Ready to start", already: "Already querying" };
  const KIND: Record<string, string> = { novel: "A novel", nonfic: "Non-fiction", pb: "A picture book" };
  const LEN: Record<string, string> = { s: "Under 80k", m: "80k to 110k", l: "Over 110k" };
  const PACE: Record<string, string> = { steady: "A few at a time", brisk: "Bigger batches", unsure: "Not sure yet" };
  const pick = (t: string) => page.locator(".mk-pvsheet .mk-pvopt", { hasText: t }).first().click();
  const next = () => page.click(".mk-pvsheet .mk-pvjsnext");
  await pick(STAGE[a.stage]); await next();
  await pick(KIND[a.kind]); if (a.len) await pick(LEN[a.len]); await next();
  /* ⚠️ THE SHEET KEEPS ITS ANSWERS BETWEEN OPENINGS, so the stepper is walked from wherever it
     is now, and "I don't know" is read before it is pressed. */
  const idk = page.locator(".mk-pvsheet .mk-pvidk");
  const isIdk = async () => (await idk.getAttribute("aria-pressed")) === "true";
  const step = (d: "Fewer agents" | "More agents") => page.click(`.mk-pvsheet .mk-pvstepper button[aria-label="${d}"]`);
  if (a.agents === "idk") { if (!(await isIdk())) await idk.click(); }
  else {
    if (await isIdk()) await step("More agents"); /* a press clears "I don't know" */
    const now = async () => Number(await page.locator(".mk-pvsheet .mk-pvstepper output").innerText());
    while ((await now()) > a.agents) await step("Fewer agents");
    while ((await now()) < a.agents) await step("More agents");
  }
  await next();
  await pick(PACE[a.pace]); await next();
  await page.waitForSelector(".mk-pvsheet .mk-pvres");
}
const CASE_A = { stage: "prep", kind: "novel", len: "m", agents: "idk" as const, pace: "unsure" };

/* ═══════════════ PVM-1 the switch ═══════════════ */
test("PVM-1 at 760 the phone tree renders and at 761 the desktop one — one h1 either way, the box's", async ({ page }) => {
  for (const [w, phone] of [[760, true], [761, false]] as const) {
    await open(page, { width: w, height: 900 });
    const n = await page.evaluate(() => ({
      h1: document.querySelectorAll("h1").length, phoneH1: document.querySelectorAll(".mk-pvbox h1").length,
      deskH1: document.querySelectorAll(".mk-fb h1").length, phoneTree: !!document.querySelector(".mk-pvm"), deskTree: !!document.querySelector(".mk-pv4"),
    }));
    console.log(`PVM-1 @${w}`, JSON.stringify(n));
    expect(n.h1, `one h1 @${w}`).toBe(1);
    expect(n.phoneTree, `phone tree @${w}`).toBe(phone);
    expect(n.deskTree, `desktop tree @${w}`).toBe(!phone);
    expect(phone ? n.phoneH1 : n.deskH1, `the h1 is the box's @${w}`).toBe(1);
  }
});

/* ═══════════════ PVM-2 the box ═══════════════ */
for (const vp of PHONES) {
  test(`PVM-2 @${vp.width}: the box straddles the join, the drawing is mirrored and perched, the sheet has not moved up`, async ({ page }) => {
    await open(page, vp);
    const nav = await rect(page, ".mk-navwrap");
    const sheet = await rect(page, ".mk-sheet");
    const bx = await rect(page, ".mk-pvbox");
    const art = await rect(page, ".mk-pvart");
    const t = await page.locator(".mk-pvart").evaluate((e) => getComputedStyle(e).transform);
    console.log(`PVM-2 @${vp.width}`, JSON.stringify({ navBottom: nav.bottom, sheetTop: sheet.top, box: [bx.top, bx.bottom], artTop: art.top, t }));
    expect.soft(bx.top, "the box's top is above the sheet's").toBeLessThan(sheet.top);
    expect.soft(bx.bottom, "the box's bottom is below the sheet's top").toBeGreaterThan(sheet.top);
    expect.soft(t, "the drawing is mirrored").toBe("matrix(-1, 0, 0, 1, 0, 0)");
    expect.soft(art.top, "the drawing's top is above the box's").toBeLessThan(bx.top);
    expect.soft(art.bottom, "…and it still overlaps the box (perched on it, not floating)").toBeGreaterThan(bx.top);
    /* ⚠️ THE SHEET STARTS 150px UNDER THE NAV, WHERE THE BOX'S −116px MARGIN CANNOT REACH IT.
       Two things guarantee it, and only one is this page's: the shell's sheet is a flex item (which
       starts its own formatting context), and the sheet and the page root are `flow-root`. Removing
       the `flow-root`s alone leaves this green (`PVM_MUTATE=flowroot`); taking the flex column away
       as well reproduces the draft's bug and turns it red (`collapse`). The `flow-root`s stay: they
       are the page's own guarantee, and the flex column is the shell's to change. */
    expect.soft(Math.abs(sheet.top - (nav.bottom + 150)), "the sheet starts 150px under the nav (flow-root)").toBeLessThan(0.5);
  });
}

/* ═══════════════ PVM-3 the first screen ═══════════════ */
test("PVM-3 @390 × 844: the H1, the counter, the field, Claim and the toggle are all on screen", async ({ page }) => {
  const vp = { width: 390, height: 844 };
  await open(page, vp);
  for (const sel of [".mk-pvh1", ".mk-pvcount .mk-fmcount", ".mk-pvform input[type=email]", ".mk-pvform button[type=submit]", ".mk-pvmore"]) {
    const r = await rect(page, sel);
    console.log(`PVM-3 ${sel} ${r.top.toFixed(1)}–${r.bottom.toFixed(1)}`);
    expect(r.top, `${sel} top`).toBeGreaterThanOrEqual(0);
    expect(r.bottom, `${sel} is above the fold`).toBeLessThanOrEqual(vp.height);
  }
});

/* ═══════════════ PVM-4 the carousel ═══════════════ */
for (const vp of PHONES) {
  test(`PVM-4 @${vp.width}: swiping to the third perk moves the current dot to the third`, async ({ page }) => {
    await open(page, vp);
    await page.click(".mk-pvmore");
    await expect(page.locator(".mk-pvmore")).toHaveAttribute("aria-expanded", "true");
    const on = () => page.$$eval(".mk-pvdots i", (d) => d.map((x) => x.classList.contains("mk-on")));
    expect(await on(), "the first dot is current to begin with").toEqual([true, false, false, false]);
    /* A swipe, as the browser reports one: the row scrolls, and a scroll event fires. */
    await page.locator(".mk-pvperks").evaluate((el) => {
      const card = (el.firstElementChild as HTMLElement).offsetWidth;
      el.scrollTo({ left: 2 * (card + 10), behavior: "instant" as ScrollBehavior });
    });
    await page.waitForTimeout(250);
    const dots = await on();
    console.log(`PVM-4 @${vp.width}`, JSON.stringify(dots));
    expect(dots, "the third dot is current").toEqual([false, false, true, false]);
    const w = await page.$$eval(".mk-pvdots i", (d) => d.map((x) => (x as HTMLElement).offsetWidth));
    expect(w[2], "and it is the wide pill").toBeGreaterThan(w[0]);
  });
}

/* ═══════════════ PVM-5 the tiers ═══════════════ */
for (const vp of PHONES) {
  test(`PVM-5 @${vp.width}: the switch and the track agree after a tap and after a swipe; Free is shorter than Pro`, async ({ page }) => {
    await open(page, vp);
    const sel = () => page.$$eval(".mk-pvseg [role=tab]", (b) => b.map((x) => x.getAttribute("aria-selected")));
    const where = () => page.locator(".mk-pvtrack").evaluate((el) => {
      const [free, pro] = [...el.querySelectorAll<HTMLElement>(".mk-pvtier")];
      return { left: el.scrollLeft, free: free.offsetLeft - 18, pro: Math.min(pro.offsetLeft - 18, el.scrollWidth - el.clientWidth) };
    });
    expect(await sel()).toEqual(["true", "false"]);
    await page.click(".mk-pvseg [role=tab]:nth-of-type(2)");
    await page.waitForTimeout(400);
    let w = await where();
    console.log(`PVM-5 @${vp.width} tap Pro`, JSON.stringify(w), await sel());
    expect(await sel(), "a tap on Pro selects Pro").toEqual(["false", "true"]);
    expect(Math.abs(w.left - w.pro), "…and scrolls the track to the Pro card").toBeLessThan(2);
    /* A swipe back to Free. */
    await page.locator(".mk-pvtrack").evaluate((el) => el.scrollTo({ left: 0, behavior: "instant" as ScrollBehavior }));
    await page.waitForTimeout(250);
    w = await where();
    console.log(`PVM-5 @${vp.width} swipe Free`, JSON.stringify(w), await sel());
    expect(await sel(), "a swipe back moves the switch to Free").toEqual(["true", "false"]);
    const thumb = await page.locator(".mk-pvseg").getAttribute("data-on");
    expect(thumb, "…and the thumb with it").toBe("0");
    const free = await rect(page, "#mk-pvtier-free"), pro = await rect(page, "#mk-pvtier-pro");
    console.log(`PVM-5 @${vp.width} heights free ${free.height} pro ${pro.height}`);
    expect(free.height, "the Free card keeps its own height").toBeLessThan(pro.height);
  });
}

/* ═══════════════ PVM-6 the sheet ═══════════════ */
for (const vp of PHONES) {
  test(`PVM-6 @${vp.width}: the sheet is modal, Escape returns focus, and the result lights exactly one tile`, async ({ page }) => {
    await open(page, vp);
    const plansTop = await docTop(page, ".mk-pvplans");
    await scrollTo(page, plansTop - 120);
    await page.click(".mk-pvsuit");
    await expect(page.locator(".mk-pvjs")).toHaveClass(/mk-open/);
    const inSheet = () => page.evaluate(() => !!document.activeElement && !!document.querySelector(".mk-pvsheet")!.contains(document.activeElement));
    expect.soft(await inSheet(), "focus moved into the sheet").toBe(true);
    /* Tab and Shift+Tab, well past the number of controls — focus never leaves. */
    let escaped = 0;
    for (let i = 0; i < 12; i++) { await page.keyboard.press("Tab"); if (!(await inSheet())) escaped++; }
    for (let i = 0; i < 6; i++) { await page.keyboard.press("Shift+Tab"); if (!(await inSheet())) escaped++; }
    expect.soft(escaped, "Tab never takes focus out of the sheet").toBe(0);
    /* The page behind does not scroll. */
    const y0 = await page.evaluate(() => window.scrollY);
    await page.mouse.move(vp.width / 2, 40);
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(250);
    const y1 = await page.evaluate(() => window.scrollY);
    console.log(`PVM-6 @${vp.width} scroll ${y0} → ${y1}`);
    expect.soft(y1, "the page behind did not scroll").toBe(y0);
    /* Escape closes it, and focus goes back to the button that opened it. */
    await page.keyboard.press("Escape");
    await expect(page.locator(".mk-pvjs")).not.toHaveClass(/mk-open/);
    const back = await page.evaluate(() => document.activeElement?.className ?? "");
    expect.soft(back, "focus returned to the opener").toContain("mk-pvsuit");
    expect.soft(await page.evaluate(() => getComputedStyle(document.documentElement).overflow), "the page scrolls again").not.toBe("hidden");
    /* Open from the FAQ's link this time, drive to case (a)'s result, and see it in the plans. */
    await page.locator(".mk-pvqa > button", { hasText: "Which plan should I choose?" }).click();
    await page.click(".mk-pvsuitlink");
    await expect(page.locator(".mk-pvjs")).toHaveClass(/mk-open/);
    await drive(page, CASE_A);
    await page.click(".mk-pvsheet .mk-pvjsnext");
    await expect(page.locator(".mk-pvjs")).not.toHaveClass(/mk-open/);
    /* ⚠️ WAIT FOR THE SCROLL TO ARRIVE, not for a fixed time: it starts 300ms after the close and is
       smooth, so a reading taken on a timer is a reading of the page in flight. */
    await settleScroll(page);
    const want = estimateCampaign({ stage: "prep", kind: "novel", len: "m", agents: 40, agentsUnknown: true, pace: "unsure" }, new Date(TODAY)).fit;
    const lit = await page.$$eval(".mk-pvpt--fit", (t) => t.map((x) => Number((x as HTMLElement).dataset.m)));
    const plans = await rect(page, ".mk-pvplans");
    console.log(`PVM-6 @${vp.width} lit ${JSON.stringify(lit)} want ${want} plansTop ${plans.top.toFixed(1)}`);
    expect(lit, "exactly one tile is navy, the estimate's").toEqual([want]);
    expect(await page.locator(".mk-pvpt--fit").evaluate((e) => getComputedStyle(e).backgroundColor), "and it is the navy").toBe("rgb(42, 58, 82)");
    expect(plans.top, "Pro plans was brought into view, under the nav").toBeGreaterThanOrEqual(55);
    expect(plans.top, "…near the top of the screen").toBeLessThan(vp.height / 2);
  });
}

/* ═══════════════ PVM-7 the sticky bar ═══════════════ */
for (const vp of PHONES) {
  test(`PVM-7 @${vp.width}: the sticky sign-up shows only once the form has gone, never over the footer, and brings the field back`, async ({ page }) => {
    await open(page, vp);
    const shown = () => page.locator(".mk-pvstick").evaluate((e) => {
      const r = e.getBoundingClientRect(), c = getComputedStyle(e);
      return c.visibility === "visible" && r.top < window.innerHeight && r.bottom > 0;
    });
    expect.soft(await shown(), "hidden while the form is on screen").toBe(false);
    await scrollTo(page, await docTop(page, ".mk-pvlaunch"));
    expect.soft(await shown(), "shown once the form has scrolled away").toBe(true);
    /* hidden while the questions sheet is open */
    await scrollTo(page, (await docTop(page, ".mk-pvplans")) - 120);
    await page.click(".mk-pvsuit");
    await expect(page.locator(".mk-pvjs")).toHaveClass(/mk-open/);
    expect.soft(await shown(), "hidden while the sheet is open").toBe(false);
    await page.keyboard.press("Escape");
    await expect(page.locator(".mk-pvjs")).not.toHaveClass(/mk-open/);
    expect.soft(await shown(), "back once the sheet has closed").toBe(true);
    /* never over the footer's links, at the very bottom of the page */
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(200);
    const bar = await rect(page, ".mk-pvstick");
    const links = await page.$$eval(".mk-foot a, .mk-foot button", (els) => els.map((e) => e.getBoundingClientRect()).filter((r) => r.height > 0).map((r) => r.bottom));
    const lowest = Math.max(...links);
    console.log(`PVM-7 @${vp.width} bar ${bar.top.toFixed(1)} lowest footer link ${lowest.toFixed(1)} of ${links.length}`);
    expect.soft(links.length, "the footer's links were found").toBeGreaterThan(3);
    expect.soft(lowest, "the footer's last link is clear of the bar").toBeLessThanOrEqual(bar.top);
    /* the bar's button brings the field into view, focused */
    await page.click(".mk-pvstick button");
    await page.waitForTimeout(700);
    const field = await page.evaluate(() => {
      const f = document.getElementById("mk-pricing-email")!; const r = f.getBoundingClientRect();
      return { focused: document.activeElement === f, top: r.top, bottom: r.bottom };
    });
    console.log(`PVM-7 @${vp.width} field`, JSON.stringify(field));
    expect.soft(field.focused, "the email field is focused").toBe(true);
    expect.soft(field.top, "…and in view").toBeGreaterThanOrEqual(0);
    expect.soft(field.bottom, "…and in view").toBeLessThanOrEqual(vp.height);
  });
}
test("PVM-7b with no counter figure the sticky bar is absent", async ({ page }) => {
  await open(page, { width: 390, height: 844 }, false);
  await page.waitForTimeout(500);
  await scrollTo(page, await docTop(page, ".mk-pvlaunch"));
  const n = await page.locator(".mk-pvstick").count();
  const c = await page.locator(".mk-pvcount .mk-fmcount").count();
  console.log("PVM-7b stick", n, "counter", c);
  expect(c, "no counter without a figure").toBe(0);
  expect(n, "no sticky bar without a figure").toBe(0);
});

/* ═══════════════ PVM-8 the accordion ═══════════════ */
test("PVM-8 opening a question sets aria-expanded and shows its answer", async ({ page }) => {
  await open(page, { width: 390, height: 844 });
  const q = page.locator(".mk-pvqa > button").nth(3);
  const id = await q.getAttribute("aria-controls");
  expect(await q.getAttribute("aria-expanded")).toBe("false");
  expect(await page.locator(`#${id}`).isVisible(), "closed, the answer is hidden").toBe(false);
  await q.click();
  expect(await q.getAttribute("aria-expanded"), "open").toBe("true");
  const a = await rect(page, `#${id}`);
  console.log("PVM-8 answer height", a.height);
  expect(await page.locator(`#${id}`).isVisible(), "the answer shows").toBe(true);
  expect(a.height, "…with its text").toBeGreaterThan(40);
});

/* ═══════════════ PVM-9 the copy ═══════════════ */
/** The ref's eight questions, read from the ref's own script — the page must say them verbatim. */
const REF_QAS: [string, string][] = (() => {
  const src = readFileSync(resolve("design-refs/pricing-page-mobile-v1.html"), "utf8");
  const start = src.indexOf("const QAS = [");
  const end = src.indexOf("];", start);
  if (start < 0 || end < 0) throw new Error("the ref's QAS array was not found");
  return new Function("return " + src.slice(start + "const QAS = ".length, end + 1))() as [string, string][];
})();
const flat = (s: string) => s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
test("PVM-9 no 'pass', no £5.99 in any of the four tails, and the eight questions verbatim", async ({ page }) => {
  test.setTimeout(180_000);
  await open(page, { width: 390, height: 844 });
  /* Every question open, so the answers are read as shown. */
  for (const b of await page.locator(".mk-pvqa > button").all()) await b.click();
  const qa = await page.$$eval(".mk-pvqa", (els) => els.map((e) => [e.querySelector("button span")!.textContent!, (e.querySelector(".mk-pvqaa") as HTMLElement).innerText]));
  expect.soft(REF_QAS.length, "the ref has eight questions (not vacuous)").toBe(8);
  expect.soft(qa.map(([q, a]) => [q, flat(a)]), "the eight questions and answers, verbatim").toEqual(REF_QAS.map(([q, a]) => [q, flat(a)]));
  /* One case per tail, from the ref's own recording on this date. */
  const today = TODAY.slice(0, 10);
  const byTail = new Map<string, CampaignAnswers>();
  for (const c of refCases as { today: string; answers: CampaignAnswers; tail: string }[]) if (c.today === today && !byTail.has(c.tail)) byTail.set(c.tail, c.answers);
  expect.soft(byTail.size, "the four tails are all exercised").toBe(4);
  const seen: string[] = [];
  await scrollTo(page, (await docTop(page, ".mk-pvplans")) - 120);
  for (const [tail, a] of byTail) {
    await page.click(".mk-pvsuit");
    await expect(page.locator(".mk-pvjs")).toHaveClass(/mk-open/);
    if (await page.locator(".mk-pvsheet .mk-pvres").count()) await page.click(".mk-pvsheet .mk-pvresagain");
    await drive(page, { ...a, agents: a.agentsUnknown ? "idk" : a.agents });
    const got = await page.locator(".mk-pvsheet .mk-pvrestail").innerText();
    seen.push(got);
    expect.soft(got, "the tail is the estimate module's").toBe(estimateCampaign(a, new Date(TODAY)).tail);
    expect.soft(got, "and the ref's").toBe(tail);
    expect.soft(await page.locator(".mk-pvsheet").innerText(), "no £5.99 in any result").not.toMatch(/5\.99/);
    await page.keyboard.press("Escape");
    await expect(page.locator(".mk-pvjs")).not.toHaveClass(/mk-open/);
  }
  console.log("PVM-9 tails", JSON.stringify(seen));
  /* The whole page, sheet included, open: no "pass" or "passes" anywhere. */
  await page.click(".mk-pvsuit");
  const text = await page.evaluate(() => document.body.innerText);
  const passes = text.match(/\bpass(es)?\b/gi) ?? [];
  expect.soft(passes, "the page never calls a plan a pass").toEqual([]);
  expect.soft(text, "no £5.99 anywhere on the page").not.toMatch(/5\.99/);
});

/* ═══════════════ PVM-10 the faces ═══════════════ */
test("PVM-10 the faces: Special Elite 400, Source Serif 4 and JetBrains Mono where the ref puts them", async ({ page }) => {
  await open(page, { width: 390, height: 844 });
  /* ⚠️ `fonts.load`, NOT `fonts.check` ALONE — the same reason as PV4-4. */
  const loaded = await page.evaluate(() => Promise.all(["Special Elite", "Source Serif 4", "JetBrains Mono"]
    .map(async (f) => [f, (await document.fonts.load(`16px "${f}"`)).length, document.fonts.check(`16px "${f}"`)] as const)));
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
    console.log(`PVM-10 ${sel} ${f.family} ${f.weight}`);
    expect.soft(f.family, sel).toBe(family);
    if (weight) expect.soft(f.weight, `${sel} weight`).toBe(weight);
  };
  await expectFace(".mk-pvh1", "Special Elite", "400");
  await expectFace(".mk-pvptprice", "Special Elite", "400");
  await expectFace(".mk-pvsub", "Source Serif 4");
  await expectFace(".mk-pvform button[type=submit]", "Source Serif 4");
  await expectFace(".mk-pvsuit", "Source Serif 4");
  await expectFace(".mk-pvmore", "JetBrains Mono");
  await expectFace(".mk-pvcount .mk-fmmeta", "JetBrains Mono");
  await scrollTo(page, (await docTop(page, ".mk-pvplans")) - 120);
  await page.click(".mk-pvsuit");
  await expect(page.locator(".mk-pvjs")).toHaveClass(/mk-open/);
  await expectFace(".mk-pvsheet .mk-pvq", "Special Elite", "400");
  await expectFace(".mk-pvsheet .mk-pvopt", "Source Serif 4");
});

/* ═══════════════ The screenshots — the ref's seven phones, and the 375 × 667 pair ═══════════════ */
test("shots: the seven phones beside the ref's, and the top and result at 375 × 667", async ({ page }) => {
  test.skip(!process.env.PVM_SHOTS);
  test.setTimeout(240_000);
  mkdirSync(SHOTS, { recursive: true });
  /* The ref's own seven phones, each the element the ref draws. */
  await page.setViewportSize({ width: 1900, height: 1100 });
  await page.clock.setFixedTime(new Date(TODAY));
  await page.goto(REF);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(900);
  const names = ["1-top", "2-open", "3-tiers", "4-plans", "5-q2", "6-result", "7-faq"];
  for (let i = 0; i < 7; i++) await page.locator(".screen").nth(i).screenshot({ path: `${SHOTS}/${names[i]}-ref.png` });

  for (const vp of [{ width: 390, height: 844 }, { width: 375, height: 667 }]) {
    const tag = vp.width === 390 ? "" : "-375";
    const shoot = (n: string) => page.screenshot({ path: `${SHOTS}/${n}${tag}-app.png` });
    await open(page, vp);
    await shoot("1-top");
    if (vp.width === 390) {
      await page.click(".mk-pvmore");
      await scrollTo(page, (await docTop(page, ".mk-pvbox")) + 120 - 60);
      await shoot("2-open");
      await page.click(".mk-pvmore");
      await scrollTo(page, (await docTop(page, ".mk-pvlaunch")) - 10 - 60);
      await shoot("3-tiers");
      await scrollTo(page, (await docTop(page, ".mk-pvplans")) - 120);
      await shoot("4-plans");
    }
    await scrollTo(page, (await docTop(page, ".mk-pvplans")) - 120);
    await page.click(".mk-pvsuit");
    const pick = (t: string) => page.locator(".mk-pvsheet .mk-pvopt, .mk-pvsheet .mk-pvidk", { hasText: t }).first().click();
    await pick("Getting ready"); await page.click(".mk-pvjsnext");
    await pick("A novel"); await pick("80k to 110k");
    await page.mouse.move(0, 0);
    if (vp.width === 390) await shoot("5-q2");
    await page.click(".mk-pvjsnext"); await pick("I don't know"); await page.click(".mk-pvjsnext");
    await pick("Not sure yet"); await page.click(".mk-pvjsnext");
    await page.mouse.move(0, 0);
    await page.waitForTimeout(150);
    await shoot("6-result");
    if (vp.width === 390) {
      await page.keyboard.press("Escape");
      await scrollTo(page, (await docTop(page, ".mk-pvfaq")) - 20 - 60);
      await page.locator(".mk-pvqa > button").nth(3).click();
      await page.mouse.move(0, 0);
      await shoot("7-faq");
    }
    await page.unrouteAll({ behavior: "ignoreErrors" });
  }
});
