/**
 * The landing page on phones, v2 (26 Oct; ref design-refs/landing-mobile-v2.html) — the rendered locks.
 *
 *   LV1 story (390 × 844, 375 × 667): the picture panel is sticky at top 60 and its height is
 *       min((innerHeight − 60) / 2, 420) within 2px; with caption 3 past 84% of the viewport, picture 3
 *       is the visible one and three progress steps are filled; once the story has gone by, the panel
 *       is no longer stuck and sits above the vision
 *   LV2 no swipe: the feature section holds no horizontal scroller, and the page body never scrolls
 *       sideways at 390, 375 or 360
 *   LV3 vision: the section is rgb(27, 36, 51); it holds exactly one horizontal carousel of three
 *       cards; scrolling to card 2 makes dot 2 the active one (an 18px pink pill); the headings are white
 *   LV4 join bar: hidden while the hero is on screen; visible over the features; hidden while the
 *       closing card's top is above 85% of the viewport; it takes the reader to the founding sign-up;
 *       its button is rgb(232, 180, 163) with black text; no number before the live figure; absent on
 *       /about and /pricing
 *   LV5 drawer: its top corners stay rounded until its top reaches the sticky bar, and the grab handle
 *       brings it to the bar
 *   LV6 reduced motion: no cross-fade on the picture, no slide on the join bar
 *
 * The public page needs no sign-in. Run without the setup project:
 *   SA_E2E_BASE_URL=http://127.0.0.1:<port> npx playwright test landingMobileV2 --project measure --no-deps
 *   LV_MUTATE=<name>   apply one lock's named break in the page, to prove that lock goes red
 *
 * Every reading states its population first: a sweep over nothing passes, and says nothing.
 */
import { test, expect, Page } from "@playwright/test";

const MUTATE = process.env.LV_MUTATE ?? "";
const P390 = { width: 390, height: 844 }, P375 = { width: 375, height: 667 }, P360 = { width: 360, height: 640 };

const CSS_BREAKS: Record<string, string> = {
  LV1: ".mk-spimg{position:relative!important}",
  LV1b: ".mk-spimg{height:300px!important}",
  LV1c: ".mk-spimg img.mk-on{opacity:0!important}.mk-spimg img:first-child{opacity:1!important}",
  LV1d: ".mk-spbar i.mk-on{background:rgba(28,19,15,.12)!important}",
  /* The panel still sticky, but its section's bounds taken away, so it would stay stuck past the story. */
  LV1e: ".mk-story{display:contents!important}",
  LV2: ".mk-spsteps{display:flex!important;overflow-x:auto!important}.mk-spt{flex:0 0 300px!important}",
  LV2b: "html,body{overflow-x:visible!important}.mk-sheet{overflow:visible!important}.mk-spt{width:600px!important}",
  LV3: ".mk-vision.mk-vision--navy{background:#ffffff!important}",
  LV3b: ".mk-vdots i.mk-on{width:6px!important;background:rgba(255,255,255,.22)!important}",
  LV3c: ".mk-vn .mk-vnh3{color:#1c130f!important}",
  LV3d: ".mk-vrail{overflow-x:visible!important}",
  LV4: ".mk-jbar{transform:none!important;opacity:1!important}",
  LV4c: ".mk-jbj{background:#2a3a52!important;color:#ffffff!important}",
  LV6: ".mk-spimg img{transition:opacity .45s!important}",
  LV6b: ".mk-jbar{transition:transform .35s!important}",
};

type Count = { claimed: number; cap: number } | "hold";

async function open(page: Page, vp: { width: number; height: number }, o: { route?: string; reduce?: boolean; count?: Count } = {}) {
  await page.setViewportSize(vp);
  await page.emulateMedia({ reducedMotion: o.reduce ? "reduce" : "no-preference" });
  const c = o.count ?? { claimed: 2, cap: 50 };
  await page.route("**/api/waitlist*", async (r) => {
    if (c === "hold") await new Promise((res) => setTimeout(res, 3000));
    const n = c === "hold" ? { claimed: 2, cap: 50 } : c;
    return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ visible: true, cap: n.cap, count: n.claimed }) });
  });
  if (MUTATE === "LV4b") await page.addInitScript(() => {
    /* The closing card hidden from the bar (renamed), so the bar no longer steps aside for it. */
    new MutationObserver(() => { document.querySelectorAll(".mk-ccard").forEach((c) => { c.classList.remove("mk-ccard"); c.classList.add("lv-card"); }); }).observe(document, { subtree: true, childList: true });
  });
  if (MUTATE === "LV4d") await page.addInitScript(() => {
    /* A placeholder number in the bar before the live figure. */
    setInterval(() => {
      const b = document.querySelector(".mk-jbar .mk-jbt"); if (!b) return;
      const fake = b.querySelector(".lv-fake");
      if (!b.querySelector(".mk-jbc")) { if (!fake) { const n = document.createElement("span"); n.className = "lv-fake"; n.textContent = "50 places left"; b.appendChild(n); } }
      else fake?.remove();
    }, 5);
  });
  if (MUTATE === "LV4e") await page.addInitScript(() => {
    /* The bar's link pointed somewhere else, and its own handler bypassed. */
    document.addEventListener("click", (e) => {
      const a = (e.target as Element).closest?.(".mk-jbar"); if (!a) return;
      e.stopPropagation(); e.preventDefault(); history.pushState({}, "", "/about"); dispatchEvent(new PopStateEvent("popstate"));
    }, true);
  });
  if (MUTATE === "LV4f") await page.addInitScript(() => {
    /* The bar put on every page. */
    setInterval(() => { const s = document.querySelector(".mk-scope"); if (location.pathname !== "/" && s && !s.querySelector(".mk-jbar")) { const a = document.createElement("a"); a.className = "mk-jbar"; s.appendChild(a); } }, 50);
  });
  if (MUTATE === "LV5") await page.addInitScript(() => {
    /* The drawer's travel measured without the strip, as before D1. */
    const d = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetHeight")!;
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", { configurable: true, get(this: HTMLElement) { return this.classList?.contains("mk-fs") ? 0 : d.get!.call(this); } });
  });
  await page.goto(o.route ?? "/", { waitUntil: "commit" });
  await page.waitForSelector(".mk-navwrap", { state: "attached" });
  const css = CSS_BREAKS[MUTATE];
  if (css) await page.addStyleTag({ content: css });
  await page.evaluate(() => document.fonts.ready);
}

/** Scroll so element `k` of `sel` has its top at `at` × the viewport's height. */
const scrollTo = (page: Page, sel: string, k: number, at: number) =>
  page.evaluate(([s, k, at]) => { const e = document.querySelectorAll(s)[k as number]; window.scrollTo({ top: e.getBoundingClientRect().top + scrollY - innerHeight * (at as number), behavior: "instant" }); }, [sel, k, at] as const);

test.describe("landing on phones v2", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("LV1 story: the panel sticks at 60 at half the screen; caption 3 shows picture 3 and three steps; then it lets go", async ({ page }) => {
    test.setTimeout(120000);
    for (const vp of [P390, P375]) {
      await open(page, vp);
      await page.waitForSelector(".mk-spt", { state: "attached" });
      await scrollTo(page, ".mk-spt", 2, 0.6); await page.waitForTimeout(800);
      const r = await page.evaluate(() => {
        const p = document.querySelector<HTMLElement>(".mk-spimg")!, b = p.getBoundingClientRect(), c = getComputedStyle(p);
        const imgs = Array.from(p.querySelectorAll("img")).map((i) => +getComputedStyle(i).opacity);
        const steps = Array.from(p.querySelectorAll(".mk-spbar i")).map((i) => getComputedStyle(i).backgroundColor);
        const cap = document.querySelectorAll(".mk-spt")[2].getBoundingClientRect().top;
        return { position: c.position, top: b.top, h: b.height, H: innerHeight, imgs, filled: steps.filter((s) => s === "rgb(42, 58, 82)").length, steps: steps.length, cap };
      });
      console.log(`LV1 @${vp.width}`, JSON.stringify(r));
      expect(r.imgs.length, "population: six pictures").toBe(6);
      expect(r.cap, "precondition: caption 3 is past 84% of the viewport").toBeLessThan(r.H * 0.84);
      expect(r.position).toBe("sticky");
      expect(Math.abs(r.top - 60), `@${vp.width}: stuck at 60`).toBeLessThanOrEqual(1);
      expect(Math.abs(r.h - Math.min((r.H - 60) / 2, 420)), `@${vp.width}: min((innerHeight − 60) / 2, 420)`).toBeLessThanOrEqual(2);
      expect(r.imgs.map((o, i) => (o > 0.9 ? i : -1)).filter((i) => i >= 0), `@${vp.width}: picture 3 is the visible one`).toEqual([2]);
      expect(r.filled, `@${vp.width}: three steps filled`).toBe(3);
      await scrollTo(page, ".mk-vision--navy", 0, 0.5); await page.waitForTimeout(500);
      const after = await page.evaluate(() => ({ top: document.querySelector(".mk-spimg")!.getBoundingClientRect().top, bottom: document.querySelector(".mk-spimg")!.getBoundingClientRect().bottom, vision: document.querySelector(".mk-vision--navy")!.getBoundingClientRect().top }));
      console.log(`LV1 @${vp.width} after`, JSON.stringify(after));
      expect(after.top, `@${vp.width}: after the story the panel has let go of the bar`).toBeLessThan(59);
      expect(after.bottom, `@${vp.width}: and sits above the vision`).toBeLessThanOrEqual(after.vision + 1);
    }
  });

  test("LV2 no swipe: the features hold no horizontal scroller; the page never scrolls sideways", async ({ page }) => {
    test.setTimeout(120000);
    for (const vp of [P390, P375, P360]) {
      await open(page, vp);
      await page.waitForSelector(".mk-spt", { state: "attached" });
      for (const k of [0, 3, 5]) {
        await scrollTo(page, ".mk-spt", k, 0.6); await page.waitForTimeout(300);
        const r = await page.evaluate(() => {
          const scrollers = Array.from(document.querySelectorAll<HTMLElement>(".mk-story, .mk-story *")).filter((e) => /auto|scroll/.test(getComputedStyle(e).overflowX) && e.scrollWidth > e.clientWidth + 1).length;
          return { n: document.querySelectorAll(".mk-story *").length, scrollers, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, sx: scrollX };
        });
        if (k === 0) console.log(`LV2 @${vp.width}`, JSON.stringify(r));
        expect(r.n, "population: the feature section").toBeGreaterThan(20);
        expect(r.scrollers, `@${vp.width}: no horizontal scroller in the features`).toBe(0);
        expect(r.sw, `@${vp.width}: the page body never scrolls sideways`).toBeLessThanOrEqual(r.cw);
        expect(r.sx).toBe(0);
      }
    }
  });

  test("LV3 vision: navy, one carousel of three, card 2 lights dot 2, white headings", async ({ page }) => {
    test.setTimeout(60000);
    await open(page, P390);
    await page.waitForSelector(".mk-vision--navy", { state: "attached" });
    await scrollTo(page, ".mk-vision--navy", 0, 0.1); await page.waitForTimeout(400);
    const r = await page.evaluate(() => {
      const v = document.querySelector<HTMLElement>(".mk-vision--navy")!;
      const carousels = Array.from(v.querySelectorAll<HTMLElement>("*")).filter((e) => /auto|scroll/.test(getComputedStyle(e).overflowX) && e.scrollWidth > e.clientWidth + 1);
      return { bg: getComputedStyle(v).backgroundColor, carousels: carousels.length, cards: carousels[0]?.children.length ?? 0, heads: Array.from(v.querySelectorAll(".mk-vnh3")).map((h) => getComputedStyle(h).color) };
    });
    console.log("LV3", JSON.stringify(r));
    expect(r.bg).toBe("rgb(27, 36, 51)");
    expect(r.carousels, "exactly one horizontal carousel").toBe(1);
    expect(r.cards, "of three cards").toBe(3);
    expect(r.heads, "the headings are white").toEqual(["rgb(255, 255, 255)", "rgb(255, 255, 255)", "rgb(255, 255, 255)"]);
    await page.evaluate(() => { const r = document.querySelector<HTMLElement>(".mk-vrail")!, c = r.children[1] as HTMLElement; r.scrollLeft = c.offsetLeft - (r.clientWidth - c.offsetWidth) / 2; });
    await page.waitForTimeout(500);
    const dots = await page.evaluate(() => Array.from(document.querySelectorAll(".mk-vdots i")).map((d) => [d.getBoundingClientRect().width, getComputedStyle(d).backgroundColor]));
    console.log("LV3 dots", JSON.stringify(dots));
    expect(dots.length, "population: three dots").toBe(3);
    expect(dots.map((d, i) => (d[0] === 18 && d[1] === "rgb(232, 180, 163)" ? i : -1)).filter((i) => i >= 0), "dot 2 is the active one, an 18px pink pill").toEqual([1]);
  });

  test("LV4 join bar: hidden over the hero, shown over the features, hidden with the card; pink Join; live or absent; landing only", async ({ page }) => {
    test.setTimeout(120000);
    const read = () => page.evaluate(() => {
      const j = document.querySelector<HTMLElement>(".mk-jbar"); if (!j) return null;
      const r = j.getBoundingClientRect(), c = getComputedStyle(j), btn = j.querySelector(".mk-jbj");
      return { visible: +c.opacity > 0.9 && r.bottom <= innerHeight && r.top < innerHeight, top: r.top, text: j.innerText.replace(/\n/g, " | "), btnBg: btn ? getComputedStyle(btn).backgroundColor : null, btnFg: btn ? getComputedStyle(btn).color : null };
    });
    await open(page, P390);
    await page.waitForSelector(".mk-jbar", { state: "attached" }); await page.waitForTimeout(800);
    const hero = await read();
    expect(hero, "population: the bar is on the landing page").not.toBeNull();
    expect(hero!.visible, "hidden while the hero is on screen").toBe(false);
    await scrollTo(page, ".mk-spt", 2, 0.6); await page.waitForTimeout(700);
    const feat = await read();
    expect(feat!.visible, "visible over the features").toBe(true);
    expect(feat!.text).toBe("Become a founding writer | 48 places left | Join");
    expect(feat!.btnBg, "the Join button is pink").toBe("rgb(232, 180, 163)");
    expect(feat!.btnFg, "with black text").toBe("rgb(28, 19, 15)");
    await scrollTo(page, ".mk-ccard, .lv-card", 0, 0.6); await page.waitForTimeout(700);
    const card = await read();
    const cardTop = await page.evaluate(() => document.querySelector(".mk-ccard, .lv-card")!.getBoundingClientRect().top / innerHeight);
    console.log("LV4", JSON.stringify({ hero, feat, card, cardTop }));
    expect(cardTop, "precondition: the card's top is above 85% of the viewport").toBeLessThan(0.85);
    expect(card!.visible, "hidden while the closing card is on screen").toBe(false);
    await scrollTo(page, ".mk-spt", 2, 0.6); await page.waitForTimeout(700);
    expect((await read())!.visible, "scrolling back brings it back").toBe(true);
    await page.click(".mk-jbar"); await page.waitForTimeout(1200);
    const target = await page.evaluate(() => ({ path: location.pathname, focus: document.activeElement?.id ?? "" }));
    console.log("LV4 link", JSON.stringify(target));
    expect(target, "it takes the reader to the founding sign-up").toEqual({ path: "/", focus: "mk-close-email" });
    /* Before the figure: every frame while the count is held back. */
    await open(page, P390, { count: "hold" });
    const early = await page.evaluate(() => new Promise<{ frames: number; digits: string[]; tracks: number }>((done) => {
      const R = { frames: 0, digits: [] as string[], tracks: 0 }, t0 = performance.now();
      const loop = () => {
        const j = document.querySelector<HTMLElement>(".mk-jbar");
        if (j) { R.frames++; if (/\d/.test(j.textContent ?? "") && R.digits.length < 3) R.digits.push(j.textContent ?? ""); if (j.querySelector(".mk-jbc i")) R.tracks++; }
        if (performance.now() - t0 < 2000) requestAnimationFrame(loop); else done(R);
      };
      requestAnimationFrame(loop);
    }));
    console.log("LV4 before the count", JSON.stringify(early));
    expect(early.frames, "population: the bar was read before the count arrived").toBeGreaterThan(60);
    expect(early.digits, "no number before the live figure").toEqual([]);
    expect(early.tracks, "and no track").toBe(0);
    for (const route of ["/about", "/pricing"]) {
      await open(page, P390, { route }); await page.waitForTimeout(800);
      expect(await page.evaluate(() => document.querySelectorAll(".mk-jbar").length), `not on ${route}`).toBe(0);
    }
  });

  test("LV5 drawer: the corners stay rounded until the bar, and the grab handle reaches it", async ({ page }) => {
    test.setTimeout(60000);
    await open(page, P390, { reduce: true }); // the drawer arrives grown, so its travel is settled
    await page.waitForSelector(".mk-hp-sheet"); await page.waitForTimeout(1000);
    const travel = await page.evaluate(() => document.querySelector(".mk-hp-sheet")!.getBoundingClientRect().top + scrollY - document.querySelector(".mk-nav")!.getBoundingClientRect().height);
    const at = async (y: number) => {
      await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), y); await page.waitForTimeout(250);
      return page.evaluate(() => ({ sheet: document.querySelector(".mk-hp-sheet")!.getBoundingClientRect().top, bar: document.querySelector(".mk-navwrap")!.getBoundingClientRect().bottom, r: parseFloat(getComputedStyle(document.querySelector(".mk-hp-sheet")!).borderTopLeftRadius) }));
    };
    const short = await at(Math.round(travel - 30)), there = await at(Math.round(travel));
    console.log("LV5", JSON.stringify({ travel, short, there }));
    expect(short.sheet - short.bar, "precondition: 30px short of the bar").toBeGreaterThan(20);
    expect(short.r, "the corners are still rounded short of the bar").toBeGreaterThan(0.5);
    expect(Math.abs(there.sheet - there.bar), "population: at the bar").toBeLessThanOrEqual(1);
    expect(there.r, "and square once it reaches it").toBe(0);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" })); await page.waitForTimeout(200);
    await page.locator(".mk-hp-grab").click({ force: true }); await page.waitForTimeout(600);
    const g = await page.evaluate(() => ({ sheet: document.querySelector(".mk-hp-sheet")!.getBoundingClientRect().top, bar: document.querySelector(".mk-navwrap")!.getBoundingClientRect().bottom }));
    console.log("LV5 grab", JSON.stringify(g));
    expect(Math.abs(g.sheet - g.bar), "the grab handle brings the drawer to the bar").toBeLessThanOrEqual(1);
  });

  test("LV6 reduced motion: no cross-fade on the picture, no slide on the join bar", async ({ page }) => {
    test.setTimeout(60000);
    await open(page, P390, { reduce: true });
    await page.waitForSelector(".mk-spt", { state: "attached" });
    const t = await page.evaluate(() => ({
      img: getComputedStyle(document.querySelector(".mk-spimg img")!).transitionDuration,
      bar: getComputedStyle(document.querySelector(".mk-jbar")!).transitionDuration,
    }));
    await scrollTo(page, ".mk-spt", 0, 0.6); await page.waitForTimeout(400);
    /* Move to caption 2 and read the pictures on the next frames: an instant swap has no frame between. */
    const frames = await page.evaluate(() => new Promise<number[][]>((done) => {
      const e = document.querySelectorAll(".mk-spt")[1]; window.scrollTo({ top: e.getBoundingClientRect().top + scrollY - innerHeight * 0.6, behavior: "instant" });
      const out: number[][] = []; let k = 0;
      const loop = () => { out.push(Array.from(document.querySelectorAll(".mk-spimg img")).map((i) => +(+getComputedStyle(i).opacity).toFixed(2))); if (++k < 10) requestAnimationFrame(loop); else done(out); };
      requestAnimationFrame(loop);
    }));
    console.log("LV6", JSON.stringify({ t, last: frames[frames.length - 1] }));
    expect(t.img.split(",").every((d) => parseFloat(d) === 0), `no cross-fade on the picture (${t.img})`).toBe(true);
    expect(t.bar.split(",").every((d) => parseFloat(d) === 0), `no slide on the join bar (${t.bar})`).toBe(true);
    expect(frames[frames.length - 1][1], "population: picture 2 came in").toBe(1);
    const between = frames.flat().filter((o) => o > 0.02 && o < 0.98);
    expect(between, "no frame is mid-fade").toEqual([]);
  });
});
