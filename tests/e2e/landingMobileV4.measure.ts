/**
 * The landing page on phones, v4 (26 Oct; ref design-refs/landing-mobile-v4.html) — the rendered locks.
 *
 *   LT1 top (390, every public page): no founding strip; the bar holds "Log in", which goes to the
 *       sign-in route (#/login) signed out, with white text on rgba(255, 255, 255, 0.1) and no underline;
 *       the bar is still sticky at top 0 once the page has scrolled
 *   LT2 drawer: the drawer's top corners reach 0px radius exactly at the bar, are still rounded short of
 *       it, and the grab handle brings it to the bar
 *   LT3 vision: no closing beat (.mk-tl); the vision starts straight after the sixth caption (no gap over
 *       8px), with rounded top corners, and reads "And so much more." and "…the principles we built it
 *       on:"; exactly one frame and one line carousel of three; scrolling the carousel to line 3 makes
 *       picture 3 the visible one and dot 3 active; every heading is white
 *   LT4 reduced motion: no cross-fade on the vision's frame
 * (v3's snap lock LS1 now counts six snap points: landingMobileV3.)
 *
 *   SA_E2E_BASE_URL=http://127.0.0.1:<port> npx playwright test landingMobileV4 --project measure --no-deps
 *   LT_MUTATE=<name>   apply one lock's named break in the page, to prove that lock goes red
 */
import { test, expect, Page } from "@playwright/test";
import { VISION_NAVY_HEADING, VISION_NAVY_LEAD } from "../../src/marketing/landingCopy";

const MUTATE = process.env.LT_MUTATE ?? "";
const P390 = { width: 390, height: 844 };
const ROUTES = ["/", "/pricing", "/about", "/contact", "/founders", "/terms", "/privacy"];

const CSS_BREAKS: Record<string, string> = {
  LT1b: ".mk-lg{background:#26324a!important}",
  LT1c: ".mk-lg{text-decoration:underline!important}",
  LT1d: ".mk-navwrap{position:relative!important}",
  LT3: ".mk-vision.mk-vision--navy{margin-top:120px!important}",
  LT3b: ".mk-vision.mk-vision--navy{border-radius:0!important}",
  LT3c: ".mk-vbf img.mk-on{opacity:0!important}.mk-vbf img:first-child{opacity:1!important}",
  LT3d: ".mk-vbt .mk-vbth3{color:#1c130f!important}",
  /* The drawer's real travel made longer than the travel HeroPhone measured (a stage taller than the
     one it sized), so its corners square off and the grab handle stops short of the real bar. */
  LT2: ".mk-hp-stage{height:900px!important}",
  LT4: ".mk-vbf img{transition:opacity .45s!important}",
};

async function open(page: Page, vp: { width: number; height: number }, o: { route?: string; reduce?: boolean } = {}) {
  await page.setViewportSize(vp);
  await page.emulateMedia({ reducedMotion: o.reduce ? "reduce" : "no-preference" });
  await page.route("**/api/waitlist*", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ visible: true, cap: 50, count: 2 }) }));
  if (MUTATE === "LT1") await page.addInitScript(() => {
    /* A strip put back above the bar. */
    setInterval(() => { const w = document.querySelector(".mk-navwrap"); if (w && !document.querySelector(".mk-fs")) { const a = document.createElement("a"); a.className = "mk-fs"; a.textContent = "Become a founding writer"; w.before(a); } }, 50);
  });
  if (MUTATE === "LT1e") await page.addInitScript(() => {
    /* "Log in" sent somewhere else. */
    document.addEventListener("click", (e) => { if ((e.target as Element).closest?.(".mk-lg")) { e.stopPropagation(); e.preventDefault(); location.hash = "#/signup"; } }, true);
  });
  if (MUTATE === "LT3e") await page.addInitScript(() => {
    /* The closing beat put back between the story and the vision. */
    new MutationObserver(() => { const v = document.querySelector(".mk-vision--navy"); if (v && !document.querySelector(".mk-tl")) { const d = document.createElement("div"); d.className = "mk-tl"; v.before(d); } }).observe(document, { subtree: true, childList: true });
  });
  if (MUTATE === "LT3f") await page.addInitScript(() => {
    /* The lead changed back to v3's words. */
    new MutationObserver(() => { const l = document.querySelector(".mk-nl"); if (l && !l.textContent!.startsWith("v3")) l.textContent = "v3: And here's why we built it:"; }).observe(document, { subtree: true, childList: true, characterData: true });
  });
  await page.goto(o.route ?? "/", { waitUntil: "commit" });
  await page.waitForSelector(".mk-navwrap", { state: "attached" });
  const css = CSS_BREAKS[MUTATE];
  if (css) await page.addStyleTag({ content: css });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
}

test.describe("landing on phones v4", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("LT1 top: no strip on any public page; Log in in the bar, white on white at 10%, no underline, to sign-in; the bar sticks", async ({ page }) => {
    test.setTimeout(180000);
    let read = 0;
    for (const route of ROUTES) {
      await open(page, P390, { route });
      const r = await page.evaluate(() => {
        const lg = document.querySelector<HTMLElement>(".mk-navwrap .mk-lg"), c = lg ? getComputedStyle(lg) : null;
        return {
          strip: document.querySelectorAll(".mk-fs, .mk-fs-t, .mk-fs-tr").length,
          text: lg?.textContent ?? null, fg: c?.color, bg: c?.backgroundColor, deco: c?.textDecorationLine,
          barTop: document.querySelector(".mk-navwrap")!.getBoundingClientRect().top,
        };
      });
      expect(r.strip, `${route}: no founding strip`).toBe(0);
      expect(r.text, `${route}: the bar holds Log in`).toBe("Log in");
      expect(r.fg, `${route}: white`).toBe("rgb(255, 255, 255)");
      expect(r.bg, `${route}: on white at 10%`).toBe("rgba(255, 255, 255, 0.1)");
      expect(r.deco, `${route}: no underline`).toBe("none");
      expect(r.barTop, `${route}: the bar is at the top`).toBe(0);
      await page.hover(".mk-lg");
      expect(await page.evaluate(() => getComputedStyle(document.querySelector(".mk-lg")!).textDecorationLine), `${route}: no underline on hover`).toBe("none");
      await page.evaluate(() => window.scrollTo({ top: 1200, behavior: "instant" })); await page.waitForTimeout(300);
      expect(await page.evaluate(() => document.querySelector(".mk-navwrap")!.getBoundingClientRect().top), `${route}: still stuck at 0 once scrolled`).toBe(0);
      read++;
    }
    expect(read, "population: every public page").toBe(ROUTES.length);
    await open(page, P390);
    await page.click(".mk-lg"); await page.waitForTimeout(500);
    expect(await page.evaluate(() => location.hash), "Log in goes to the sign-in route").toBe("#/login");
  });

  test("LT2 drawer: rounded until the bar, square at it; the grab handle reaches it", async ({ page }) => {
    test.setTimeout(60000);
    await open(page, P390, { reduce: true }); // the drawer arrives grown, so its travel is settled
    await page.waitForSelector(".mk-hp-sheet"); await page.waitForTimeout(800);
    /* The travel is read from the page itself — the sheet's top less the bar — not from HeroPhone's sums. */
    const travel = await page.evaluate(() => document.querySelector(".mk-hp-sheet")!.getBoundingClientRect().top + scrollY - document.querySelector(".mk-navwrap")!.getBoundingClientRect().bottom);
    const at = async (y: number) => {
      await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), y); await page.waitForTimeout(250);
      return page.evaluate(() => ({ sheet: document.querySelector(".mk-hp-sheet")!.getBoundingClientRect().top, bar: document.querySelector(".mk-navwrap")!.getBoundingClientRect().bottom, r: parseFloat(getComputedStyle(document.querySelector(".mk-hp-sheet")!).borderTopLeftRadius) }));
    };
    const short = await at(Math.round(travel - 30)), there = await at(Math.round(travel));
    console.log("LT2", JSON.stringify({ travel, short, there }));
    expect(short.sheet - short.bar, "precondition: 30px short of the bar").toBeGreaterThan(20);
    expect(short.r, "still rounded short of the bar").toBeGreaterThan(0.5);
    expect(Math.abs(there.sheet - there.bar), "population: at the bar").toBeLessThanOrEqual(1);
    expect(there.r, "square exactly at the bar").toBe(0);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" })); await page.waitForTimeout(200);
    await page.locator(".mk-hp-grab").click({ force: true }); await page.waitForTimeout(700);
    const g = await page.evaluate(() => ({ sheet: document.querySelector(".mk-hp-sheet")!.getBoundingClientRect().top, bar: document.querySelector(".mk-navwrap")!.getBoundingClientRect().bottom }));
    console.log("LT2 grab", JSON.stringify(g));
    expect(Math.abs(g.sheet - g.bar), "the grab handle brings the drawer to the bar").toBeLessThanOrEqual(1);
  });

  test("LT3 vision: straight after the story, rounded, the new words, one frame and three lines; line 3 shows picture 3", async ({ page }) => {
    test.setTimeout(60000);
    await open(page, P390);
    await page.waitForSelector(".mk-vision--navy", { state: "attached" });
    const r = await page.evaluate(() => {
      const v = document.querySelector<HTMLElement>(".mk-vision--navy")!, caps = document.querySelectorAll(".mk-s3");
      const inX = (e: Element) => /auto|scroll/.test(getComputedStyle(e).overflowX) && e.scrollWidth > e.clientWidth + 1;
      return {
        beat: document.querySelectorAll(".mk-tl").length,
        gap: v.getBoundingClientRect().top - caps[caps.length - 1].getBoundingClientRect().bottom,
        radius: [getComputedStyle(v).borderTopLeftRadius, getComputedStyle(v).borderTopRightRadius],
        text: v.textContent ?? "",
        frames: v.querySelectorAll(".mk-vbf").length,
        carousels: Array.from(v.querySelectorAll("*")).filter(inX).map((e) => e.children.length),
        heads: Array.from(v.querySelectorAll("h2, h3")).map((h) => getComputedStyle(h).color),
      };
    });
    console.log("LT3", JSON.stringify({ ...r, text: r.text.slice(0, 120) }));
    expect(r.beat, "no closing beat").toBe(0);
    expect(Math.abs(r.gap), `the vision starts straight after the sixth caption (gap ${r.gap})`).toBeLessThanOrEqual(8);
    expect(r.radius, "rounded top corners").toEqual(["26px", "26px"]);
    expect(r.text).toContain(VISION_NAVY_HEADING);
    expect(r.text).toContain(VISION_NAVY_LEAD);
    expect(r.frames, "exactly one frame").toBe(1);
    expect(r.carousels, "exactly one line carousel, of three").toEqual([3]);
    expect(r.heads.length, "population: the headings").toBe(4);
    expect(r.heads.every((c) => c === "rgb(255, 255, 255)"), `every heading is white (${r.heads})`).toBe(true);
    await page.evaluate(() => document.querySelector(".mk-vision--navy")!.scrollIntoView({ block: "start", behavior: "instant" }));
    await page.evaluate(() => { const r = document.querySelector<HTMLElement>(".mk-vrail")!, c = r.children[2] as HTMLElement; r.scrollLeft = c.offsetLeft - (r.clientWidth - c.offsetWidth) / 2; });
    await page.waitForTimeout(900);
    const s = await page.evaluate(() => ({
      frame: Array.from(document.querySelectorAll(".mk-vbf img")).map((i, k) => (+getComputedStyle(i).opacity > 0.9 ? k : -1)).filter((k) => k >= 0),
      dots: Array.from(document.querySelectorAll(".mk-vdots i")).map((d, k) => (d.getBoundingClientRect().width === 18 && getComputedStyle(d).backgroundColor === "rgb(232, 180, 163)" ? k : -1)).filter((k) => k >= 0),
    }));
    console.log("LT3 line 3", JSON.stringify(s));
    expect(s.frame, "picture 3 is the visible one").toEqual([2]);
    expect(s.dots, "dot 3 is active").toEqual([2]);
  });

  test("LT4 reduced motion: no cross-fade on the vision's frame", async ({ page }) => {
    test.setTimeout(60000);
    await open(page, P390, { reduce: true });
    await page.waitForSelector(".mk-vbf img", { state: "attached" });
    const t = await page.evaluate(() => Array.from(document.querySelectorAll(".mk-vbf img")).map((i) => getComputedStyle(i).transitionDuration));
    console.log("LT4", JSON.stringify(t));
    expect(t.length, "population: three pictures").toBe(3);
    expect(t.every((d) => d.split(",").every((x) => parseFloat(x) === 0)), `no cross-fade (${t})`).toBe(true);
  });
});
