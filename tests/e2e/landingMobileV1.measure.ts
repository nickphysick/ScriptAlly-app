/**
 * The landing page on phones, v1 (26 Oct; ref design-refs/landing-mobile-v1.html) — the rendered locks.
 *
 *   LM1 strip (390 and 375): the founding strip is above the bar, 40px, rgb(38, 50, 74), its type white;
 *       its fill is the share of places TAKEN (the ref's 6px minimum aside); it scrolls away while the
 *       bar stays at top 0; the bar holds no pill and no segments; before the live figure arrives it
 *       renders no number and no track
 *   LM2 swipe (390 and 375): exactly one horizontal strip with six cards; the page never scrolls
 *       sideways; after the strip is scrolled to the third card the third dot is the active one (an
 *       18px navy pill) and the count reads "3 / 6"; → moves on a card
 *   LM3 vision: three compact rows with 76px pictures; "Make querying straightforward." is on the
 *       page, and "Make querying simple." is on no public page at any width
 *   LM4 closing card: at 390 the landing has the closing card and no FoundingBand; at 1440 the band
 *       and no card; the hawks overlap the card's top edge; its list is C1 exactly; its link is /founders
 *   LM5 offer copy: no public page, at 390 or 1440, says "six months", "Six months free", "Half price"
 *       or "for life" (one named exemption: Pricing's FAQ answer on how long a campaign runs, which is
 *       about the campaign and not the offer)
 *   LM6 reduced motion: the strip's first count on screen is the final one; the swipe never
 *       smooth-scrolls
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
  LM1: ".mk-fs{position:fixed!important;top:0;left:0;right:0;z-index:80}",
  LM1b: ".mk-fs-tr b{width:90%!important}",
  LM1c: ".mk-fs{height:48px!important}",
  LM2: ".mk-rail{overflow-x:visible!important}",
  /* The page body's sideways guard is three defences — the rail scrolls itself, the sheet clips, and
     marketing pages clip `html` and `body` too — so the break that proves the "never scrolls sideways"
     claim removes all three. */
  LM2d: "html,body{overflow-x:visible!important}.mk-sheet{overflow:visible!important}.mk-rail{overflow-x:visible!important}",
  LM2b: ".mk-dots i.mk-on{width:6px!important;background:rgba(28,19,15,.18)!important}",
  LM3b: ".mk-vrow img{width:180px!important}",
  LM4: ".mk-ccart{top:12px!important}",
  LM4b: ".mk-claimband{display:none!important}",
  LM6: ".mk-rail{scroll-behavior:smooth!important}",
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
  if (MUTATE === "LM1d") await page.addInitScript(() => {
    /* The pill put back in the phone bar. */
    const t = setInterval(() => { const r = document.querySelector(".mk-navright"); if (!r) return; clearInterval(t); const b = document.createElement("button"); b.className = "mk-navpill"; b.innerHTML = '<span class="mk-navpill-t">Become a founding writer</span><span class="mk-navpill-c"><i><b class="mk-on"></b><b></b></i><em>48 places left</em></span>'; r.appendChild(b); }, 20);
  });
  if (MUTATE === "LM1e") await page.addInitScript(() => {
    /* A placeholder number in the strip before the live figure. */
    /* …present only while there is no live figure, as a placeholder would be. */
    setInterval(() => {
      const s = document.querySelector(".mk-fs"); if (!s) return;
      const fake = s.querySelector(".lm-fake");
      if (!s.querySelector(".mk-fs-tr")) { if (!fake) { const n = document.createElement("span"); n.className = "lm-fake"; n.textContent = "50 left"; s.appendChild(n); } }
      else fake?.remove();
    }, 5);
  });
  if (MUTATE === "LM2c") await page.addInitScript(() => {
    /* The count frozen on the first card. */
    new MutationObserver(() => { const c = document.querySelector(".mk-swipecnt"); if (c && c.textContent !== "1 / 6") c.textContent = "1 / 6"; }).observe(document, { subtree: true, childList: true, characterData: true });
  });
  if (MUTATE === "LM4c") await page.addInitScript(() => {
    /* The card's list one bullet short. */
    new MutationObserver(() => { const l = document.querySelectorAll(".mk-cclist li"); if (l.length === 4) l[3].remove(); }).observe(document, { subtree: true, childList: true });
  });
  if (MUTATE === "LM6b") await page.addInitScript(() => {
    /* The reduced-motion check blinded, so the strip counts down anyway. */
    const mm = window.matchMedia.bind(window);
    window.matchMedia = (q: string) => (q.includes("reduce") ? { ...mm("(min-width: 1px) and (max-width: 0px)"), matches: false, media: q } as MediaQueryList : mm(q));
  });
  await page.goto(o.route ?? "/", { waitUntil: "commit" });
  await page.waitForSelector(".mk-navwrap", { state: "attached" });
  const css = CSS_BREAKS[MUTATE];
  if (css) await page.addStyleTag({ content: css });
  await page.evaluate(() => document.fonts.ready);
}

test.describe("landing on phones v1", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("LM1 strip: above the bar, 40px, navy and white; the fill is the share taken; it scrolls away; no pill; no number before the count", async ({ page }) => {
    test.setTimeout(120000);
    for (const vp of PHONES) {
      await open(page, vp);
      await page.waitForTimeout(2600); // the count-down is over by 2.0s
      const r = await page.evaluate(() => {
        const s = document.querySelector<HTMLElement>(".mk-fs")!, bar = document.querySelector(".mk-navwrap")!;
        const sb = s.getBoundingClientRect(), bb = bar.getBoundingClientRect();
        const tr = s.querySelector(".mk-fs-tr")?.getBoundingClientRect().width ?? 0, b = s.querySelector(".mk-fs-tr b")?.getBoundingClientRect().width ?? 0;
        const types = [".mk-fs-t"].map((q) => getComputedStyle(s.querySelector(q)!).color);
        return {
          top: sb.top, h: sb.height, bottom: sb.bottom, barTop: bb.top, bg: getComputedStyle(s).backgroundColor, types,
          tr, b, n: (s.querySelector(".mk-fs-n") as HTMLElement | null)?.innerText ?? null,
          pills: document.querySelectorAll(".mk-nav .mk-navpill, .mk-nav .mk-navpill-c, .mk-navwrap .mk-on").length,
          barText: (document.querySelector(".mk-nav") as HTMLElement).innerText.trim(),
        };
      });
      console.log(`LM1 @${vp.width}`, JSON.stringify(r));
      expect(r.n, `@${vp.width}: population — the live count`).toBe("36 left");
      expect(r.top, `@${vp.width}: the strip is the first thing on the page`).toBe(0);
      expect(r.h, `@${vp.width}: 40px tall`).toBe(40);
      expect(Math.abs(r.bottom - r.barTop), `@${vp.width}: and the bar sits right under it`).toBeLessThanOrEqual(.5);
      expect(r.bg).toBe("rgb(38, 50, 74)");
      expect(r.types, "its words are white").toEqual(["rgb(255, 255, 255)"]);
      expect(r.tr, "population: a track").toBeGreaterThan(40);
      expect(Math.abs(r.b - Math.max(6, r.tr * (50 - 36) / 50)), `@${vp.width}: the fill is (cap − left) / cap of the track`).toBeLessThanOrEqual(1);
      expect(r.pills, `@${vp.width}: no pill or segment bar in the phone bar`).toBe(0);
      expect(r.barText, `@${vp.width}: the bar is the brand and the menu`).toBe("QueryHawk");
      await page.evaluate(() => window.scrollTo({ top: 300, behavior: "instant" }));
      await page.waitForTimeout(300);
      const s = await page.evaluate(() => ({ strip: document.querySelector(".mk-fs")!.getBoundingClientRect().bottom, bar: document.querySelector(".mk-navwrap")!.getBoundingClientRect().top }));
      console.log(`LM1 @${vp.width} scrolled`, JSON.stringify(s));
      expect(s.strip, `@${vp.width}: the strip has scrolled away`).toBeLessThanOrEqual(0);
      expect(s.bar, `@${vp.width}: the bar stays at the top`).toBe(0);
    }
    /* Before the figure: sample every frame while the count is held back. */
    await open(page, PHONES[0], { count: "hold" });
    const early = await page.evaluate(() => new Promise<{ frames: number; digits: string[]; tracks: number }>((done) => {
      const R = { frames: 0, digits: [] as string[], tracks: 0 }, t0 = performance.now();
      const loop = () => {
        const s = document.querySelector<HTMLElement>(".mk-fs");
        if (s) { R.frames++; if (/\d/.test(s.textContent ?? "") && R.digits.length < 3) R.digits.push(s.textContent ?? ""); if (s.querySelector(".mk-fs-tr")) R.tracks++; }
        if (performance.now() - t0 < 2000) requestAnimationFrame(loop); else done(R);
      };
      requestAnimationFrame(loop);
    }));
    console.log("LM1 before the count", JSON.stringify(early));
    expect(early.frames, "population: the strip was read before the count arrived").toBeGreaterThan(60);
    expect(early.digits, "no number before the live figure").toEqual([]);
    expect(early.tracks, "and no track").toBe(0);
  });

  test("LM2 swipe: one strip of six; the page never scrolls sideways; card 3 lights dot 3 and reads 3 / 6", async ({ page }) => {
    test.setTimeout(120000);
    for (const vp of PHONES) {
      await open(page, vp);
      await page.locator(".mk-swipehead").scrollIntoViewIfNeeded();
      const r = await page.evaluate(() => ({
        rails: document.querySelectorAll(".mk-rail").length,
        cards: document.querySelectorAll(".mk-rail > .mk-fc").length,
        overflow: getComputedStyle(document.querySelector(".mk-rail")!).overflowX,
        sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
      }));
      expect(r.rails, `@${vp.width}: exactly one strip`).toBe(1);
      expect(r.cards, `@${vp.width}: six cards`).toBe(6);
      expect(r.sw, `@${vp.width}: the page body never scrolls sideways`).toBeLessThanOrEqual(r.cw);
      await page.evaluate(() => { const r = document.querySelector<HTMLElement>(".mk-rail")!, c = r.children[2] as HTMLElement; r.scrollLeft = c.offsetLeft - (r.clientWidth - c.offsetWidth) / 2; });
      await page.waitForTimeout(500);
      const s = await page.evaluate(() => ({
        sx: window.scrollX, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
        cnt: document.querySelector(".mk-swipecnt")!.textContent,
        dots: Array.from(document.querySelectorAll(".mk-dots i")).map((d) => { const c = getComputedStyle(d); return [d.getBoundingClientRect().width, c.backgroundColor]; }),
      }));
      console.log(`LM2 @${vp.width}`, JSON.stringify({ ...r, ...s }));
      expect(s.sx, `@${vp.width}: the window did not move sideways`).toBe(0);
      expect(s.sw).toBeLessThanOrEqual(s.cw);
      expect(s.dots.length, "population: six dots").toBe(6);
      const active = s.dots.map((d, i) => (d[0] === 18 && d[1] === "rgb(42, 58, 82)" ? i : -1)).filter((i) => i >= 0);
      expect(active, `@${vp.width}: the third dot is the active one, an 18px navy pill`).toEqual([2]);
      expect(s.cnt, `@${vp.width}: the count`).toBe("3 / 6");
      await page.focus(".mk-rail"); await page.keyboard.press("ArrowRight"); await page.waitForTimeout(900);
      expect(await page.evaluate(() => document.querySelector(".mk-swipecnt")!.textContent), "→ moves on a card").toBe("4 / 6");
    }
  });

  test("LM3 vision: three compact rows, 76px pictures; straightforward, and never simple", async ({ page }) => {
    test.setTimeout(180000);
    await open(page, PHONES[0]);
    await page.locator(".mk-vision").scrollIntoViewIfNeeded(); await page.waitForTimeout(400);
    const v = await page.evaluate(() => ({
      rows: Array.from(document.querySelectorAll(".mk-vision .mk-vrow")).map((r) => r.querySelector("img")!.getBoundingClientRect().width),
      heads: Array.from(document.querySelectorAll(".mk-vision .mk-vrowh3")).map((h) => h.textContent),
    }));
    console.log("LM3 rows", JSON.stringify(v));
    expect(v.rows, "three rows, each picture 76px wide").toEqual([76, 76, 76]);
    expect(v.heads).toContain("Make querying straightforward.");
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
    /* The one named exemption: Pricing's FAQ on how long a first campaign runs — the campaign's length,
       not the offer's. It is removed, by its exact words, before the sweep reads the page. */
    const EXEMPT = "Most first campaigns run around six months";
    const BANNED = ["six months", "Six months free", "Half price", "for life"];
    const hits: string[] = []; let pages = 0, chars = 0;
    for (const vp of [PHONES[0], DESK]) for (const route of ROUTES) {
      await open(page, vp, { route }); await page.waitForTimeout(500);
      const t = (await page.evaluate(() => document.body.textContent ?? "")).split(EXEMPT).join("");
      pages++; chars += t.length;
      for (const b of BANNED) if (t.includes(b)) hits.push(`${route} @${vp.width}: "${b}"`);
    }
    console.log("LM5", pages, chars, JSON.stringify(hits));
    expect(pages, "population: every public page at both widths").toBe(14);
    expect(chars, "population: the pages had text").toBeGreaterThan(20000);
    expect(hits, "no retired offer wording on any public page").toEqual([]);
  });

  test("LM6 reduced motion: the strip's first count is its final one; the swipe never smooth-scrolls", async ({ page }) => {
    test.setTimeout(60000);
    await page.addInitScript(() => {
      const seen: string[] = [];
      (window as unknown as { __lm6: string[] }).__lm6 = seen;
      const loop = () => { const n = document.querySelector<HTMLElement>(".mk-fs-n"); const t = n?.textContent ?? ""; if (t && seen[seen.length - 1] !== t) seen.push(t); requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
    });
    await open(page, PHONES[0], { reduce: true });
    await page.waitForTimeout(2600);
    const seen = await page.evaluate(() => (window as unknown as { __lm6: string[] }).__lm6);
    console.log("LM6 counts", JSON.stringify(seen));
    expect(seen, "the only count ever on screen is the final one").toEqual(["36 left"]);
    await page.locator(".mk-swipehead").scrollIntoViewIfNeeded();
    const m = await page.evaluate(() => new Promise<{ behaviour: string; positions: number[]; target: number }>((done) => {
      const r = document.querySelector<HTMLElement>(".mk-rail")!;
      r.focus();
      const c = r.children[1] as HTMLElement, target = Math.round(c.offsetLeft - (r.clientWidth - c.offsetWidth) / 2);
      r.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
      const positions: number[] = []; let k = 0;
      const loop = () => { positions.push(Math.round(r.scrollLeft)); if (++k < 12) requestAnimationFrame(loop); else done({ behaviour: getComputedStyle(r).scrollBehavior, positions, target }); };
      requestAnimationFrame(loop);
    }));
    console.log("LM6 swipe", JSON.stringify(m));
    expect(m.behaviour, "the strip declares no smooth scrolling").toBe("auto");
    const between = m.positions.filter((p) => p > 0 && Math.abs(p - m.target) > 2);
    expect(m.positions[m.positions.length - 1], "population: the key moved the strip").toBeGreaterThan(0);
    expect(between, "it jumps to the next card — no frame in between").toEqual([]);
  });
});
