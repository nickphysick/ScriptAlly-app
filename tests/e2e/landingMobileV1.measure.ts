/**
 * The landing page on phones, v1 (26 Oct; ref design-refs/landing-mobile-v1.html) — the rendered locks.
 *
 *   LM1 RETIRED (landing on phones v4): the founding strip is gone — see landingMobileV4's LT1.
 *   LM2 RETIRED (landing on phones v2): the swipe strip is gone — see landingMobileV2.
 *   LM3 vision: "Make querying straightforward." is on the landing, and "Make querying simple." is on
 *       no public page at any width (its compact-rows half retired with the rows in v2)
 *   LM4 closing card: at 390 the landing has the closing card and no FoundingBand; at 1440 the band
 *       and no card; the hawks overlap the card's top edge; its list is C1 exactly; its link is /founders
 *   LM5 offer copy: no public page, at 390 or 1440, says "six months", "Six months free", "Half price"
 *       or "for life" (named exemptions: Pricing's FAQ answers on how long a campaign runs, which are
 *       about the campaign and not the offer — main's v3 sentence and the Pricing v4 branch's)
 *   LM6 RETIRED (landing on phones v4): it read the strip's count, and the strip is gone.
 *
 * The public page needs no sign-in. Run without the setup project:
 *   SA_E2E_BASE_URL=http://127.0.0.1:<port> npx playwright test landingMobileV1 --project measure --no-deps
 *   LM_MUTATE=<name>   apply one lock's named break in the page, to prove that lock goes red
 *
 * Every reading states its population first: a sweep over nothing passes, and says nothing.
 */
import { test, expect, Page } from "@playwright/test";

const MUTATE = process.env.LM_MUTATE ?? "";
const PHONES = [{ width: 390, height: 844 }, { width: 375, height: 667 }];
const DESK = { width: 1440, height: 900 };
const ROUTES = ["/", "/pricing", "/about", "/contact", "/founders", "/terms", "/privacy"];
const GETS = [
  "QueryHawk Pro, free for your entire querying campaign",
  "A direct line to the founder",
  "Smart Import to bring your list across",
  "An exclusive Early Bird discount for the writers you invite when we launch",
];

/** Each lock's named break, as a stylesheet; the rest act on the page in `open`. */
const CSS_BREAKS: Record<string, string> = {
  LM4: ".mk-ccart{top:12px!important}",
  LM4b: ".mk-claimband{display:none!important}",
};

/** A text rewrite, applied for the life of the page by an observer — the wording locks' breaks. */
const REWRITES: Record<string, [string, string]> = {
  LM3: ["Make querying straightforward.", "Make querying simple."],
  LM5: ["A direct line to the founder", "Half price for as long as you need it"],
};

type Count = { claimed: number; cap: number } | "hold" | null;

async function open(page: Page, vp: { width: number; height: number }, o: { route?: string; reduce?: boolean; count?: Count } = {}) {
  await page.setViewportSize(vp);
  await page.emulateMedia({ reducedMotion: o.reduce ? "reduce" : "no-preference" });
  const c = o.count === undefined ? { claimed: 14, cap: 50 } : o.count;
  await page.route("**/api/waitlist*", async (r) => {
    if (c === "hold") { await new Promise((res) => setTimeout(res, 3000)); return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ visible: true, cap: 50, count: 14 }) }); }
    return c
      ? r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ visible: true, cap: c.cap, count: c.claimed }) })
      : r.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html>" });
  });
  const rw = REWRITES[MUTATE];
  if (rw) await page.addInitScript(([from, to]) => {
    const fix = () => {
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = w.nextNode(); n; n = w.nextNode()) if (n.textContent && n.textContent.includes(from)) n.textContent = n.textContent.split(from).join(to);
    };
    new MutationObserver(fix).observe(document, { subtree: true, childList: true, characterData: true });
  }, rw);
  if (MUTATE === "LM4c") await page.addInitScript(() => {
    /* The card's list one bullet short. */
    new MutationObserver(() => { const l = document.querySelectorAll(".mk-cclist li"); if (l.length === 4) l[3].remove(); }).observe(document, { subtree: true, childList: true });
  });
  await page.goto(o.route ?? "/", { waitUntil: "commit" });
  await page.waitForSelector(".mk-navwrap", { state: "attached" });
  const css = CSS_BREAKS[MUTATE];
  if (css) await page.addStyleTag({ content: css });
  await page.evaluate(() => document.fonts.ready);
}

test.describe("landing on phones v1", () => {
  test.use({ storageState: { cookies: [], origins: [] } });



  /* RETIRED HALF (landing on phones v2, 26 Oct): the three compact rows are gone — the phone's vision
     is the navy vision (since v4 one frame with lines you swipe), locked in landingMobileV4's LT3. The sweep below stands. */
  test("LM3 vision: straightforward on the landing, and never simple anywhere", async ({ page }) => {
    test.setTimeout(180000);
    const hits: string[] = []; let pages = 0;
    for (const vp of [PHONES[0], DESK]) for (const route of ROUTES) {
      await open(page, vp, { route }); await page.waitForTimeout(500);
      const t = await page.evaluate(() => document.body.textContent ?? "");
      pages++;
      if (t.includes("Make querying simple.")) hits.push(`${route} @${vp.width}`);
      if (route === "/" && !t.includes("Make querying straightforward.")) hits.push(`/ @${vp.width}: straightforward missing`);
    }
    console.log("LM3 sweep", pages, JSON.stringify(hits));
    expect(pages, "population: every public page at both widths").toBe(14);
    expect(hits, "the old heading is nowhere; the new one is on the landing at both widths").toEqual([]);
  });

  test("LM4 closing card: the card on a phone, the band on the desk; the hawks break its top edge; C1; /founders", async ({ page }) => {
    test.setTimeout(120000);
    await open(page, PHONES[0]);
    await page.locator(".mk-close").scrollIntoViewIfNeeded(); await page.waitForTimeout(800);
    const c = await page.evaluate(() => {
      const card = document.querySelector(".mk-ccard"), art = document.querySelector(".mk-ccart");
      const cb = card?.getBoundingClientRect(), ab = art?.getBoundingClientRect();
      const vis = (q: string) => Array.from(document.querySelectorAll<HTMLElement>(q)).filter((e) => e.getBoundingClientRect().height > 0).length;
      return {
        card: vis(".mk-close .mk-ccard"), band: vis(".mk-claimband"),
        overlap: cb && ab ? [ab.top, cb.top, ab.bottom] : null,
        list: Array.from(document.querySelectorAll(".mk-cclist li")).map((l) => (l.textContent ?? "").trim()),
        href: document.querySelector(".mk-ccmore")?.getAttribute("href"),
        form: !!document.querySelector(".mk-ccard #mk-close-email"), counter: !!document.querySelector(".mk-ccard .mk-places"),
      };
    });
    console.log("LM4 phone", JSON.stringify(c));
    expect(c.card, "at 390 the landing has the closing card").toBe(1);
    expect(c.band, "and no founding band").toBe(0);
    expect(c.overlap, "population: the card and its hawks").not.toBeNull();
    const [aTop, cTop, aBottom] = c.overlap!;
    expect(aTop < cTop && cTop < aBottom, `the hawks overlap the card's top edge (${aTop.toFixed(1)} < ${cTop.toFixed(1)} < ${aBottom.toFixed(1)})`).toBe(true);
    expect(c.list, "the card's list is C1, exactly").toEqual(GETS);
    expect(c.form && c.counter, "the shared sign-up and counter are in it").toBe(true);
    expect(c.href).toBe("/founders");
    await page.click(".mk-ccmore"); await page.waitForTimeout(600);
    expect(new URL(page.url()).pathname, "the link goes to /founders").toBe("/founders");
    await open(page, DESK); await page.waitForTimeout(600);
    const d = await page.evaluate(() => {
      const vis = (q: string) => Array.from(document.querySelectorAll<HTMLElement>(q)).filter((e) => e.getBoundingClientRect().height > 0).length;
      return { card: document.querySelectorAll(".mk-close").length, band: vis(".mk-claimband"), list: Array.from(document.querySelectorAll(".mk-claimlist li")).map((l) => (l.textContent ?? "").trim()) };
    });
    console.log("LM4 desk", JSON.stringify(d));
    expect(d.band, "at 1440 the landing has the founding band").toBe(1);
    expect(d.card, "and no closing card").toBe(0);
    expect(d.list, "whose list is C1 too").toEqual(GETS);
  });

  test("LM5 offer copy: no public page says six months, Half price or for life", async ({ page }) => {
    test.setTimeout(180000);
    /* The named exemptions: Pricing's FAQ on how long a campaign runs — the campaign's length, not the
       offer's. main's Pricing (v3) says it one way and the Pricing v4 branch (on dev, unmerged) another;
       each is removed, by its exact words, before the sweep reads the page. */
    const EXEMPT = ["Most first campaigns run around six months", "often six months or more once agents start reading full manuscripts"];
    const BANNED = ["six months", "Six months free", "Half price", "for life"];
    const hits: string[] = []; let pages = 0, chars = 0;
    for (const vp of [PHONES[0], DESK]) for (const route of ROUTES) {
      await open(page, vp, { route }); await page.waitForTimeout(500);
      const t = EXEMPT.reduce((acc, e) => acc.split(e).join(""), await page.evaluate(() => document.body.textContent ?? ""));
      pages++; chars += t.length;
      for (const b of BANNED) if (t.includes(b)) hits.push(`${route} @${vp.width}: "${b}"`);
    }
    console.log("LM5", pages, chars, JSON.stringify(hits));
    expect(pages, "population: every public page at both widths").toBe(14);
    expect(chars, "population: the pages had text").toBeGreaterThan(20000);
    expect(hits, "no retired offer wording on any public page").toEqual([]);
  });

});
