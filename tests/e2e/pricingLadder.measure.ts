/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PRICING LADDER — the locks for the Pro ladder, the quiet monthly roll-on and the phone's Free / Pro
 * tabs (26 Oct; refs design-refs/pricing-plans-ladder-v1.html and pricing-phone-plans-v1.html, layout A).
 * Desktop at 1440 × 900 and 1280 × 800; phone at 390 × 844 and 375 × 667.
 *
 *   PL-1 the ladder   four rows in a radiogroup, 6 months checked on load, one checked at a time, the
 *                     arrow keys move the check, and the rows' prices and mono lines
 *   PL-2 the result   exactly one row checked and flagged "Fits your campaign", the estimate's; on
 *                     desktop the questions open beneath the cards; on a phone "See it in the plans"
 *                     opens the Pro tab and brings the Pro card into view under the pinned tabs
 *   PL-3 the tabs     (phone) Pro on load; Free shows only the Free card; pinned under the nav while
 *                     the Pro card scrolls; the arrow keys move between them
 *   PL-4 removals     no Pro plans container, no plan tiles, no swipe track, at either width
 *   PL-5 the copy     the small print exactly once; the three FAQ answers and two tails verbatim; the
 *                     other five answers unchanged; none of the retired words anywhere in the page
 *
 *   PL_MUTATE=<name>  a lock's named CSS break, applied in the page. Breaks in behaviour are source
 *   changes: `node scripts/pricing-ladder-mutate.mjs apply <name>`, rebuild, run, `… restore`.
 *   PL_SHOTS=1        writes the screenshots to reports/pricing-ladder/shots.
 *
 *   SA_E2E_BASE_URL=http://127.0.0.1:<port> npx playwright test tests/e2e/pricingLadder.measure.ts
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { assertLocalBundleIsDev } from "./bundleGuard";
import { estimateCampaign, type CampaignAnswers } from "../../src/marketing/campaignEstimate";

const TODAY = "2026-10-24T12:00:00";
const SHOTS = "reports/pricing-ladder/shots";
const MUTATE = process.env.PL_MUTATE ?? "";
const DESKS = [{ width: 1440, height: 900 }, { width: 1280, height: 800 }];
const PHONES = [{ width: 390, height: 844 }, { width: 375, height: 667 }];
const ALL = [...DESKS, ...PHONES];
const isPhone = (w: number) => w <= 760;

const MUTATIONS: Record<string, string> = {
  /* PL-3: the tabs scroll away with the page */
  unpin: ".mk-pvm .mk-pvtabs{position:static!important}",
  /* PL-3: both panels show */
  panel: ".mk-pvm .mk-pvpanel[hidden]{display:block!important}",
};

test.beforeAll(async () => { await assertLocalBundleIsDev(); });
test.use({ actionTimeout: 10_000 });

async function open(page: Page, vp: { width: number; height: number }) {
  await page.setViewportSize(vp);
  await page.clock.setFixedTime(new Date(TODAY));
  await page.route("**/api/waitlist", (route) => route.request().method() === "GET"
    ? route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, count: 37, cap: 100 }) })
    : route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html>" }));
  await page.goto("/pricing", { waitUntil: "load" });
  await page.waitForSelector(isPhone(vp.width) ? ".mk-pvm .mk-ladder" : ".mk-pv4 .mk-ladder");
  await page.addStyleTag({ content: "*,*::before,*::after{transition:none!important;animation:none!important}html{scroll-behavior:auto!important}" });
  if (MUTATIONS[MUTATE]) await page.addStyleTag({ content: MUTATIONS[MUTATE] });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);
}
const rect = (page: Page, sel: string) => page.locator(sel).first().evaluate((e) => {
  const r = e.getBoundingClientRect();
  return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height, docTop: r.top + window.scrollY };
});
const scrollTo = (page: Page, y: number) => page.evaluate((t) => window.scrollTo(0, t), y).then(() => page.waitForTimeout(150));
async function settleScroll(page: Page) {
  await page.waitForTimeout(350);
  let last = -1, still = 0;
  for (let i = 0; i < 40 && still < 3; i++) {
    const y = await page.evaluate(() => window.scrollY);
    still = Math.abs(y - last) < 0.5 ? still + 1 : 0; last = y;
    await page.waitForTimeout(100);
  }
}
const rows = (page: Page) => page.$$eval(".mk-ladder:not([hidden]) .mk-rung", (r) => r.map((x) => ({
  m: (x as HTMLElement).dataset.m, checked: x.getAttribute("aria-checked"), role: x.getAttribute("role"),
  flag: x.querySelector(".mk-rungflag")?.textContent ?? null, visible: (x as HTMLElement).offsetParent !== null,
})));

/** Drive the questions to their result: inline on desktop, in the sheet on a phone. */
async function drive(page: Page, phone: boolean, a: CampaignAnswers) {
  const STAGE = { prep: "Getting ready", ready: "Ready to start", already: "Already querying" } as const;
  const KIND = { novel: "A novel", nonfic: "Non-fiction", pb: "A picture book" } as const;
  const LEN = phone ? { s: "Under 80k", m: "80k to 110k", l: "Over 110k" } : { s: "Under 80,000 words", m: "80,000 to 110,000", l: "Over 110,000" };
  const PACE = { steady: "A few at a time", brisk: "Bigger batches", unsure: "Not sure yet" } as const;
  const scope = phone ? ".mk-pvsheet" : ".mk-pv4how";
  const pick = (t: string) => page.locator(`${scope} button`, { hasText: t }).first().click();
  const next = () => page.click(phone ? ".mk-pvsheet .mk-pvjsnext" : ".mk-jynext");
  const out = page.locator(phone ? ".mk-pvsheet .mk-pvstepper output" : ".mk-jystepper output");
  const idk = page.locator(phone ? ".mk-pvsheet .mk-pvidk" : ".mk-jyidk");
  await pick(STAGE[a.stage]); await next();
  await pick(KIND[a.kind]); if (a.len) await pick(LEN[a.len]); await next();
  if (a.agentsUnknown) { if ((await idk.getAttribute("aria-pressed")) !== "true") await idk.click(); }
  else {
    if ((await idk.getAttribute("aria-pressed")) === "true") await page.getByRole("button", { name: "More agents" }).first().click();
    while (Number(await out.innerText()) > a.agents) await page.getByRole("button", { name: "Fewer agents" }).first().click();
    while (Number(await out.innerText()) < a.agents) await page.getByRole("button", { name: "More agents" }).first().click();
  }
  await next();
  await pick(PACE[a.pace]); await next();
  await page.waitForSelector(phone ? ".mk-pvsheet .mk-pvres" : ".mk-jyplan");
}
const CASE_12: CampaignAnswers = { stage: "prep", kind: "novel", len: "m", agents: 40, agentsUnknown: true, pace: "unsure" };
const CASE_6: CampaignAnswers = { stage: "ready", kind: "nonfic", len: null, agents: 40, agentsUnknown: false, pace: "brisk" };

/* ═══════════════ PL-1 the ladder ═══════════════ */
for (const vp of ALL) {
  test(`PL-1 @${vp.width}: the ladder is four radios, 6 months on load, one checked at a time`, async ({ page }) => {
    await open(page, vp);
    const group = page.locator(".mk-ladder:visible");
    expect.soft(await group.count(), "one ladder on screen").toBe(1);
    expect.soft(await group.getAttribute("role"), "a radiogroup").toBe("radiogroup");
    let r = await rows(page);
    console.log(`PL-1 @${vp.width}`, JSON.stringify(r.map((x) => [x.m, x.checked])));
    expect.soft(r.map((x) => x.m), "four rows, in order").toEqual(["1", "3", "6", "12"]);
    expect.soft(r.every((x) => x.role === "radio"), "each row is a radio").toBe(true);
    expect.soft(r.filter((x) => x.checked === "true").map((x) => x.m), "6 months is checked on load, and only it").toEqual(["6"]);
    const prices = await page.$$eval(".mk-ladder:not([hidden]) .mk-rungprice", (e) => e.map((x) => x.textContent));
    const lines = await page.$$eval(".mk-ladder:not([hidden]) .mk-rungline", (e) => e.map((x) => x.textContent));
    expect.soft(prices, "the prices").toEqual(["£7.99", "£19", "£29", "£45"]);
    expect.soft(lines, "the mono lines").toEqual(["The monthly rate", "£6.33 a month · save 20%", "£4.83 a month · save 40%", "£3.75 a month · save 53%"]);
    /* a click moves the check, and only one row is ever checked */
    await page.locator('.mk-ladder:visible .mk-rung[data-m="3"]').click();
    r = await rows(page);
    expect.soft(r.filter((x) => x.checked === "true").map((x) => x.m), "a click checks 3 months, and only it").toEqual(["3"]);
    /* the arrow keys move the check and the focus together, as a radio group's do */
    await page.keyboard.press("ArrowDown");
    r = await rows(page);
    expect.soft(r.filter((x) => x.checked === "true").map((x) => x.m), "ArrowDown checks the next row").toEqual(["6"]);
    expect.soft(await page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.m), "…and focuses it").toBe("6");
    expect.soft(await page.locator(".mk-ladder:visible .mk-rung--fit").count(), "nothing is flagged without a result").toBe(0);
  });
}

/* ═══════════════ PL-2 the result ═══════════════ */
for (const vp of DESKS) {
  test(`PL-2 @${vp.width}: a result opens beneath the cards and checks and flags exactly the fitting row`, async ({ page }) => {
    await open(page, vp);
    const link = page.locator(".mk-pv4 .mk-lsuit");
    await expect(page.locator("#how-long")).toBeHidden();
    await link.click();
    await expect(link).toHaveAttribute("aria-expanded", "true");
    await expect(link).toHaveText("Hide the questions");
    const pair = await rect(page, ".mk-lpair"), how = await rect(page, "#how-long");
    const box = await page.locator("#how-long").evaluate((e) => { const c = getComputedStyle(e); return { w: e.getBoundingClientRect().width, b: c.borderTopWidth + " " + c.borderTopStyle + " " + c.borderTopColor, r: c.borderTopLeftRadius }; });
    console.log(`PL-2 @${vp.width} how`, JSON.stringify(box), "below pair", (how.top - pair.bottom).toFixed(1));
    expect.soft(how.top, "the questions open beneath the cards").toBeGreaterThan(pair.bottom);
    expect.soft(box.w, "in the old Pro plans box's 952 width").toBe(952);
    expect.soft(box.b, "with its hairline").toBe("1px solid rgba(28, 19, 15, 0.13)");
    expect.soft(box.r, "and its radius").toBe("26px");
    for (const [a, name] of [[CASE_6, "6"], [CASE_12, "12"]] as const) {
      if (await page.locator(".mk-jyagain").count()) await page.click(".mk-jyagain");
      await drive(page, false, a);
      const want = String(estimateCampaign(a, new Date(TODAY)).fit);
      /* ⚠️ WAIT FOR THIS RESULT'S ROW, NOT FOR "A" FLAGGED ROW: the second case starts with the first
         case's row still flagged, so a count of one is true before the new result has arrived. */
      await expect(page.locator(`.mk-ladder:visible .mk-rung--fit[data-m="${want}"]`)).toHaveCount(1);
      const r = await rows(page);
      console.log(`PL-2 @${vp.width} case ${name}`, JSON.stringify(r.filter((x) => x.checked === "true" || x.flag)));
      expect.soft(want, "the case fits what its name says").toBe(name);
      expect.soft(r.filter((x) => x.checked === "true").map((x) => x.m), "exactly one row checked, the estimate's").toEqual([want]);
      expect.soft(r.filter((x) => x.flag).map((x) => [x.m, x.flag]), "exactly one row flagged, the estimate's").toEqual([[want, "Fits your campaign"]]);
    }
  });
}
for (const vp of PHONES) {
  test(`PL-2 @${vp.width}: "See it in the plans" opens Pro, checks and flags the fitting row, and brings it into view`, async ({ page }) => {
    await open(page, vp);
    /* Start on Free, so the result has to switch the tab itself. */
    await scrollTo(page, (await rect(page, ".mk-pvlaunch")).docTop - 60);
    await page.click("#mk-pvtab-pro");
    await page.locator(".mk-pvm .mk-lsuit").click();
    await expect(page.locator(".mk-pvjs")).toHaveClass(/mk-open/);
    await page.keyboard.press("Escape");
    await page.click("#mk-pvtab-free");
    await expect(page.locator("#mk-pvtab-free")).toHaveAttribute("aria-selected", "true");
    /* …and open the sheet from the FAQ's link, which is reachable whichever tab is showing. */
    await page.locator(".mk-pvqa > button", { hasText: "Which plan should I choose?" }).click();
    await page.click(".mk-pvsuitlink");
    await expect(page.locator(".mk-pvjs")).toHaveClass(/mk-open/);
    if (await page.locator(".mk-pvsheet .mk-pvres").count()) await page.click(".mk-pvsheet .mk-pvresagain");
    await drive(page, true, CASE_12);
    const want = String(estimateCampaign(CASE_12, new Date(TODAY)).fit);
    await page.click(".mk-pvsheet .mk-pvjsnext");
    await expect(page.locator(".mk-pvjs")).not.toHaveClass(/mk-open/);
    await settleScroll(page);
    const st = await page.evaluate(() => ({
      tab: document.querySelector("#mk-pvtab-pro")!.getAttribute("aria-selected"),
      nav: document.querySelector(".mk-navwrap")!.getBoundingClientRect().bottom,
      tabsTop: document.querySelector(".mk-pvtabs")!.getBoundingClientRect().top,
      tabsBottom: document.querySelector(".mk-pvtabs")!.getBoundingClientRect().bottom,
      card: document.querySelector("#mk-pvpanel-pro .mk-lcard")!.getBoundingClientRect().top,
      focus: (document.activeElement as HTMLElement | null)?.dataset.m ?? null,
    }));
    const r = await rows(page);
    console.log(`PL-2 @${vp.width}`, JSON.stringify({ ...st, want, checked: r.filter((x) => x.checked === "true").map((x) => x.m) }));
    expect.soft(st.tab, "the Pro tab is selected").toBe("true");
    expect.soft(r.filter((x) => x.checked === "true").map((x) => x.m), "exactly one row checked, the estimate's").toEqual([want]);
    expect.soft(r.filter((x) => x.flag).map((x) => [x.m, x.flag]), "exactly one row flagged, the estimate's").toEqual([[want, "Fits your campaign"]]);
    expect.soft(Math.abs(st.tabsTop - st.nav), "the tabs are pinned under the nav").toBeLessThan(1);
    expect.soft(st.card, "the Pro card starts below the pinned tabs").toBeGreaterThanOrEqual(st.tabsBottom - 1);
    expect.soft(st.card, "…close under them, in view").toBeLessThan(st.tabsBottom + 40);
    expect.soft(st.focus, "focus is on the checked row").toBe(want);
  });
}

/* ═══════════════ PL-3 the tabs (phone) ═══════════════ */
for (const vp of PHONES) {
  test(`PL-3 @${vp.width}: Pro on load, Free shows only Free, pinned while Pro scrolls, arrow keys move`, async ({ page }) => {
    await open(page, vp);
    const sel = () => page.$$eval(".mk-pvtabsin [role=tab]", (b) => b.map((x) => x.getAttribute("aria-selected")));
    const shown = () => page.$$eval(".mk-pvm .mk-lcard", (c) => c.filter((x) => (x as HTMLElement).offsetParent !== null).map((x) => x.classList.contains("mk-lcard--pro") ? "pro" : "free"));
    expect.soft(await page.locator(".mk-pvtabsin").getAttribute("role"), "a tablist").toBe("tablist");
    expect.soft(await sel(), "Pro is selected on load").toEqual(["false", "true"]);
    expect.soft(await shown(), "only the Pro card shows").toEqual(["pro"]);
    await page.click("#mk-pvtab-free");
    expect.soft(await sel(), "a tap on Free selects it").toEqual(["true", "false"]);
    expect.soft(await shown(), "…and only the Free card shows").toEqual(["free"]);
    /* the arrow keys move between the tabs, selecting as they go */
    await page.keyboard.press("ArrowRight");
    expect.soft(await sel(), "ArrowRight selects Pro").toEqual(["false", "true"]);
    expect.soft(await page.evaluate(() => document.activeElement?.id), "…and focuses it").toBe("mk-pvtab-pro");
    await page.keyboard.press("ArrowLeft");
    expect.soft(await sel(), "ArrowLeft selects Free").toEqual(["true", "false"]);
    await page.keyboard.press("End");
    expect.soft(await sel(), "End selects Pro").toEqual(["false", "true"]);
    /* pinned under the nav while the Pro card scrolls under it */
    const card = await rect(page, "#mk-pvpanel-pro .mk-lcard");
    await scrollTo(page, card.docTop + card.height / 2 - 200);
    const p = await page.evaluate(() => ({
      nav: document.querySelector(".mk-navwrap")!.getBoundingClientRect().bottom,
      tabs: document.querySelector(".mk-pvtabs")!.getBoundingClientRect().top,
      card: document.querySelector("#mk-pvpanel-pro .mk-lcard")!.getBoundingClientRect().top,
    }));
    console.log(`PL-3 @${vp.width}`, JSON.stringify(p));
    expect.soft(p.card, "the precondition: the Pro card's top has scrolled under the nav").toBeLessThan(p.nav);
    expect.soft(Math.abs(p.tabs - p.nav), "the tabs stay pinned just under the nav").toBeLessThan(1);
  });
}

/* ═══════════════ PL-4 removals ═══════════════ */
for (const vp of ALL) {
  test(`PL-4 @${vp.width}: no Pro plans container, no plan tiles, no swipe track`, async ({ page }) => {
    await open(page, vp);
    const found = await page.evaluate(() => {
      const sels = [".mk-pv4plans", ".mk-pv4pgrid", ".mk-pv4ptile", ".mk-pvplans", ".mk-pvpgrid", ".mk-pvpt", ".mk-pvtrack", ".mk-pvseg", ".mk-pvtier"];
      return { counts: sels.map((s) => [s, document.querySelectorAll(s).length]), text: document.querySelector(".mk-scope")!.textContent ?? "" };
    });
    console.log(`PL-4 @${vp.width}`, JSON.stringify(found.counts));
    for (const [s, n] of found.counts) expect.soft(n, `${s} is gone`).toBe(0);
    expect.soft(found.text, "the Pro plans box's subline is gone").not.toContain("Every Pro feature, for as long as your campaign runs.");
    expect.soft(await page.locator(".mk-ladder").count(), "the population: the ladder is there").toBeGreaterThan(0);
  });
}

/* ═══════════════ PL-5 the copy ═══════════════ */
/** The FAQ answers the refs state: the ladder ref's wording panel for the three that changed, the phone
 *  ref's script for the five that did not. Read from the files, never retyped. */
const LADDER_COPY: Record<string, string> = (() => {
  const src = readFileSync(resolve("design-refs/pricing-plans-ladder-v1.html"), "utf8");
  const dl = src.slice(src.indexOf("const COPY = `"), src.indexOf("</dl>`;"));
  const out: Record<string, string> = {};
  for (const m of dl.matchAll(/<dt>([^<]+)<\/dt><dd>([\s\S]*?)<\/dd>/g)) out[m[1]] = m[2].replace(/<[^>]+>/g, "");
  if (Object.keys(out).length < 5) throw new Error("the ladder ref's wording panel was not found");
  return out;
})();
const PHONE_QAS: [string, string][] = (() => {
  const src = readFileSync(resolve("design-refs/pricing-page-mobile-v1.html"), "utf8");
  const i = src.indexOf("const QAS = ["), j = src.indexOf("];", i);
  return new Function("return " + src.slice(i + "const QAS = ".length, j + 1))() as [string, string][];
})();
const CHANGED = ["Is Pro a subscription?", "What if my campaign runs longer than planned?", "What if I sign with an agent before my plan runs out?"];
const flat = (s: string) => s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const FORBIDDEN = [/\bpass(es)?\b/i, /never renews/i, /won't renew/i, /options to extend/i, /£5\.99/, /Add to any plan/];
const SMALL = "Renews monthly at £7.99 once your plan ends. Cancel any time.";
const TAIL_13 = "If you're still querying after that, your plan simply carries on month by month.";

for (const vp of ALL) {
  test(`PL-5 @${vp.width}: the small print once, the FAQ and tails verbatim, none of the retired words`, async ({ page }) => {
    test.setTimeout(120_000);
    const phone = isPhone(vp.width);
    await open(page, vp);
    /* the small print, exactly once in what the reader can see */
    const seen = (await page.evaluate(() => document.body.innerText)).split(SMALL).length - 1;
    expect.soft(seen, "the small print appears exactly once").toBe(1);
    /* the FAQ: the three changed answers as the ladder ref words them, the other five as before */
    const qa = await page.$$eval(phone ? ".mk-pvqa" : ".mk-pv4qa", (els) => els.map((e) => [
      (e.querySelector("button span, .mk-pv4q") as HTMLElement).textContent!, (e.querySelector(".mk-pvqaa, .mk-pv4a") as HTMLElement).textContent!,
    ]));
    const want = PHONE_QAS.map(([q, a]) => [q, flat(CHANGED.includes(q) ? LADDER_COPY[q] : a)]);
    expect.soft(CHANGED.every((q) => LADDER_COPY[q]), "the ref states all three changed answers").toBe(true);
    expect.soft(qa.map(([q, a]) => [q, flat(a)]), "the eight answers").toEqual(want);
    /* the two tails that run past the plan, from a result that reaches each */
    const tails: string[] = [];
    const runLate: CampaignAnswers = { stage: "ready", kind: "nonfic", len: null, agents: 65, agentsUnknown: false, pace: "steady" };
    const over13: CampaignAnswers = { stage: "prep", kind: "novel", len: "l", agents: 150, agentsUnknown: false, pace: "steady" };
    for (const a of [runLate, over13]) {
      if (phone) {
        await scrollTo(page, (await rect(page, ".mk-pvlaunch")).docTop - 60);
        await page.locator(".mk-pvm .mk-lsuit").click();
        if (await page.locator(".mk-pvsheet .mk-pvres").count()) await page.click(".mk-pvsheet .mk-pvresagain");
      } else {
        if (await page.locator("#how-long").isHidden()) await page.locator(".mk-pv4 .mk-lsuit").click();
        if (await page.locator(".mk-jyagain").count()) await page.click(".mk-jyagain");
      }
      await drive(page, phone, a);
      const got = (await page.locator(phone ? ".mk-pvsheet .mk-pvrestail" : ".mk-jytail").textContent())!;
      tails.push(got);
      expect.soft(got, "the tail is the estimate module's").toBe(estimateCampaign(a, new Date(TODAY)).tail);
      if (phone) { await page.keyboard.press("Escape"); await expect(page.locator(".mk-pvjs")).not.toHaveClass(/mk-open/); }
    }
    console.log(`PL-5 @${vp.width} tails`, JSON.stringify(tails));
    expect.soft(tails, "the two tails, verbatim (the ladder ref's, and the brief's for over thirteen months)")
      .toEqual([LADDER_COPY['"Which plan suits me best?" results that run past the plan'], TAIL_13]);
    /* none of the retired words anywhere in the page, hidden parts included */
    const all = (await page.evaluate(() => document.querySelector(".mk-scope")!.textContent ?? "")) ?? "";
    for (const re of FORBIDDEN) expect.soft(all.match(re)?.[0] ?? null, `no ${re}`).toBeNull();
  });
}

/* ═══════════════ Screenshots ═══════════════ */
test("shots: desktop closed and with a 6-month result; phone Pro, Free and a 12-month result", async ({ page }) => {
  test.skip(!process.env.PL_SHOTS);
  test.setTimeout(240_000);
  mkdirSync(SHOTS, { recursive: true });
  for (const vp of DESKS) {
    await open(page, vp);
    await page.locator(".mk-pv4soon").screenshot({ path: `${SHOTS}/desk-closed-${vp.width}.png` });
    await page.locator(".mk-pv4 .mk-lsuit").click();
    await drive(page, false, CASE_6);
    await page.mouse.move(0, 0);
    await page.locator(".mk-lpair").screenshot({ path: `${SHOTS}/desk-fit6-${vp.width}.png` });
    await page.unrouteAll({ behavior: "ignoreErrors" });
  }
  for (const vp of PHONES) {
    await open(page, vp);
    const top = (await rect(page, ".mk-pvlaunch")).docTop - 60;
    await scrollTo(page, top);
    await page.screenshot({ path: `${SHOTS}/phone-pro-${vp.width}.png` });
    await page.click("#mk-pvtab-free");
    await page.screenshot({ path: `${SHOTS}/phone-free-${vp.width}.png` });
    await page.click("#mk-pvtab-pro");
    await page.locator(".mk-pvm .mk-lsuit").click();
    await drive(page, true, CASE_12);
    await page.click(".mk-pvsheet .mk-pvjsnext");
    await settleScroll(page);
    await page.screenshot({ path: `${SHOTS}/phone-fit12-${vp.width}.png` });
    await page.unrouteAll({ behavior: "ignoreErrors" });
  }
});
