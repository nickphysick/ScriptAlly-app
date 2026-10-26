/**
 * The landing page on phones, v3 (26 Oct; ref design-refs/landing-mobile-v3.html) — the rendered locks.
 *
 *   LS1 snap (390 × 844): html's scroll-snap-type is "y proximity"; there are exactly seven page snap
 *       points (the six captions and the closing beat), each with scroll-snap-stop "always" except
 *       the beat; a caption's scroll-margin-top is 60 + the panel's height within 2px; snapping to
 *       caption 3 leaves its top within 2px of the panel's bottom and makes picture 3 current
 *   LS2 captions (390 × 844 and 360 × 640): six, each with its "N of 6" label, its heading, its line
 *       and exactly three points — two at 360 × 640, where S5 drops the third — matching landingCopy
 *   LS3 closing beat: "And so much more." appears once, after the sixth caption and before the
 *       vision; at its snap position the vision's top is on screen
 *   LS4 reduced motion: no snapping (scroll-snap-type none) and no cross-fade on the picture
 *
 * The v2 locks (landingMobileV2: LV1–LV6) still cover the panel's geometry, no sideways scroll, the
 * vision, the join bar, the drawer and the join bar's reduced motion.
 *
 *   SA_E2E_BASE_URL=http://127.0.0.1:<port> npx playwright test landingMobileV3 --project measure --no-deps
 *   LS_MUTATE=<name>   apply one lock's named break in the page, to prove that lock goes red
 */
import { test, expect, Page } from "@playwright/test";
import { FEATURE_STORY, featureStoryLabel, VISION_NAVY_HEADING as STORY_MORE_HEADING } from "../../src/marketing/landingCopy";

const MUTATE = process.env.LS_MUTATE ?? "";
const P390 = { width: 390, height: 844 }, P360 = { width: 360, height: 640 };

const CSS_BREAKS: Record<string, string> = {
  LS1: "html:has(.mk-story){scroll-snap-type:none!important}",
  LS1b: ".mk-s3{scroll-snap-stop:normal!important}",
  LS1c: ".mk-s3{scroll-margin-top:60px!important}",
  LS1d: ".mk-ccard{scroll-snap-align:start!important}",
  LS1e: ".mk-spimg img.mk-on{opacity:0!important}.mk-spimg img:first-child{opacity:1!important}",
  LS3: ".mk-tl{height:120svh!important}",
  LS4: "html:has(.mk-story){scroll-snap-type:y proximity!important}",
  LS4b: ".mk-spimg img{transition:opacity .45s!important}",
};

async function open(page: Page, vp: { width: number; height: number }, o: { reduce?: boolean } = {}) {
  await page.setViewportSize(vp);
  await page.emulateMedia({ reducedMotion: o.reduce ? "reduce" : "no-preference" });
  await page.route("**/api/waitlist*", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ visible: true, cap: 50, count: 2 }) }));
  if (MUTATE === "LS2") await page.addInitScript(() => {
    /* Caption 1 one point short. */
    new MutationObserver(() => { const l = document.querySelectorAll(".mk-s3")[0]?.querySelectorAll("li"); if (l && l.length === 3) l[2].remove(); }).observe(document, { subtree: true, childList: true });
  });
  if (MUTATE === "LS2b") await page.addInitScript(() => {
    /* A caption's label wrong. */
    new MutationObserver(() => { const n = document.querySelectorAll(".mk-s3n")[3]; if (n && n.textContent !== "4 OF 7") n.textContent = "4 OF 7"; }).observe(document, { subtree: true, childList: true, characterData: true });
  });
  if (MUTATE === "LS3b") await page.addInitScript(() => {
    /* The beat's heading stated a second time, before the story. */
    new MutationObserver(() => { const st = document.querySelector(".mk-story"); if (st && !document.querySelector(".ls-dupe")) { const p = document.createElement("p"); p.className = "ls-dupe"; p.textContent = "And so much more."; st.before(p); } }).observe(document, { subtree: true, childList: true });
  });
  await page.goto("/", { waitUntil: "commit" });
  await page.waitForSelector(".mk-s3", { state: "attached" });
  const css = CSS_BREAKS[MUTATE];
  if (css) await page.addStyleTag({ content: css });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
}

test.describe("landing on phones v3", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("LS1 snap: y proximity; seven page snap points; the caption's margin is the bar plus the panel; caption 3 lands under the picture", async ({ page }) => {
    test.setTimeout(60000);
    await open(page, P390);
    const r = await page.evaluate(() => {
      /* A page snap point is an element with a snap alignment whose scroll container is the page —
         the vision carousel's own cards snap inside their rail and are not counted. */
      const inX = (e: Element) => { for (let n = e.parentElement; n; n = n.parentElement) if (/auto|scroll/.test(getComputedStyle(n).overflowX)) return true; return false; };
      const pts = Array.from(document.querySelectorAll<HTMLElement>("body *")).filter((e) => getComputedStyle(e).scrollSnapAlign.trim() !== "none" && !inX(e));
      const panel = document.querySelector(".mk-spimg")!.getBoundingClientRect().height;
      return {
        type: getComputedStyle(document.documentElement).scrollSnapType,
        points: pts.map((e) => [e.className.split(" ")[0], getComputedStyle(e).scrollSnapStop]),
        margins: Array.from(document.querySelectorAll(".mk-s3")).map((e) => parseFloat(getComputedStyle(e).scrollMarginTop)),
        panel,
      };
    });
    console.log("LS1", JSON.stringify(r));
    /* Computed styles drop a value's default, so "y proximity" serialises as "y". */
    expect(["y", "y proximity"], `html's scroll-snap-type is y proximity (${r.type})`).toContain(r.type);
    expect(r.points.length, "exactly seven page snap points").toBe(7);
    expect(r.points.map((p) => p[0]), "six captions, then the closing beat").toEqual(["mk-s3", "mk-s3", "mk-s3", "mk-s3", "mk-s3", "mk-s3", "mk-tl"]);
    expect(r.points.slice(0, 6).map((p) => p[1]), "every caption stops the flick").toEqual(Array(6).fill("always"));
    for (const m of r.margins) expect(Math.abs(m - (60 + r.panel)), `a caption's scroll-margin-top is 60 + the panel (${m})`).toBeLessThanOrEqual(2);
    await page.evaluate(() => document.querySelectorAll(".mk-s3")[2].scrollIntoView({ block: "start", behavior: "instant" }));
    await page.waitForTimeout(800);
    const at = await page.evaluate(() => ({
      cap: document.querySelectorAll(".mk-s3")[2].getBoundingClientRect().top,
      panel: document.querySelector(".mk-spimg")!.getBoundingClientRect().bottom,
      visible: Array.from(document.querySelectorAll(".mk-spimg img")).map((i, k) => (+getComputedStyle(i).opacity > 0.9 ? k : -1)).filter((k) => k >= 0),
      on: Array.from(document.querySelectorAll(".mk-s3")).findIndex((c) => c.classList.contains("mk-on")),
    }));
    console.log("LS1 at caption 3", JSON.stringify(at));
    expect(Math.abs(at.cap - at.panel), "caption 3 sits directly under the picture").toBeLessThanOrEqual(2);
    expect(at.visible, "picture 3 is the visible one").toEqual([2]);
    expect(at.on, "and caption 3 is current").toBe(2);
  });

  test("LS2 captions: six, each a label, a heading, a line and its points, matching the copy", async ({ page }) => {
    test.setTimeout(60000);
    for (const [vp, n] of [[P390, 3], [P360, 2]] as const) {
      await open(page, vp);
      const caps = await page.evaluate(() => Array.from(document.querySelectorAll(".mk-s3")).map((c) => ({
        label: (c.querySelector(".mk-s3n") as HTMLElement | null)?.innerText ?? "",
        heading: c.querySelector("h3")?.textContent ?? "",
        line: c.querySelector("p")?.textContent ?? "",
        points: Array.from(c.querySelectorAll("li")).filter((l) => l.getBoundingClientRect().height > 0).map((l) => (l.textContent ?? "").trim()),
      })));
      console.log(`LS2 @${vp.width}×${vp.height}`, JSON.stringify(caps.map((c) => [c.label, c.points.length])));
      expect(caps.length, "six captions").toBe(6);
      caps.forEach((c, i) => {
        const want = FEATURE_STORY[i];
        expect(c.label, `caption ${i + 1}'s label`).toBe(featureStoryLabel(i + 1, 6).toUpperCase());
        expect(c.heading).toBe(want.heading);
        expect(c.line).toBe(want.line);
        expect(c.points, `caption ${i + 1} at ${vp.width}×${vp.height}: ${n} points`).toEqual(want.points.slice(0, n));
      });
    }
  });

  test("LS3 closing beat: once, after the sixth caption and before the vision, with the vision on screen", async ({ page }) => {
    test.setTimeout(60000);
    await open(page, P390);
    const r = await page.evaluate((h) => {
      const all = Array.from(document.querySelectorAll("body *")).filter((e) => e.children.length === 0 && (e.textContent ?? "").trim() === h);
      const beat = all[0], last = document.querySelectorAll(".mk-s3")[5], vision = document.querySelector(".mk-vision--navy");
      const after = (a: Element, b: Element) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
      return { count: all.length, afterSixth: !!beat && after(last, beat), beforeVision: !!beat && !!vision && after(beat, vision) };
    }, STORY_MORE_HEADING);
    console.log("LS3", JSON.stringify(r));
    expect(r.count, `"${STORY_MORE_HEADING}" appears once`).toBe(1);
    expect(r.afterSixth, "after the sixth caption").toBe(true);
    expect(r.beforeVision, "and before the vision").toBe(true);
    await page.evaluate(() => document.querySelector(".mk-tl")!.scrollIntoView({ block: "start", behavior: "instant" }));
    await page.waitForTimeout(800);
    const s = await page.evaluate(() => ({ beat: document.querySelector(".mk-tl")!.getBoundingClientRect().top, vision: document.querySelector(".mk-vision--navy")!.getBoundingClientRect().top, H: innerHeight }));
    console.log("LS3 at the beat", JSON.stringify(s));
    expect(Math.abs(s.beat - 60), "the beat snaps under the bar").toBeLessThanOrEqual(2);
    expect(s.vision, "the vision's top is on screen beneath it").toBeLessThan(s.H);
    expect(s.vision).toBeGreaterThan(s.beat);
  });

  test("LS4 reduced motion: no snapping and no cross-fade", async ({ page }) => {
    test.setTimeout(60000);
    await open(page, P390, { reduce: true });
    const r = await page.evaluate(() => ({
      type: getComputedStyle(document.documentElement).scrollSnapType,
      fade: getComputedStyle(document.querySelector(".mk-spimg img")!).transitionDuration,
      captions: document.querySelectorAll(".mk-s3").length,
    }));
    console.log("LS4", JSON.stringify(r));
    expect(r.captions, "population: the story is on the page").toBe(6);
    expect(r.type, "no snapping").toBe("none");
    expect(r.fade.split(",").every((d) => parseFloat(d) === 0), `no cross-fade (${r.fade})`).toBe(true);
  });
});
