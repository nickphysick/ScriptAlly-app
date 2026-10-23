/**
 * Landing hero v3 (20 Oct, ref design-refs/landing-hero-v3.html) — the rendered locks LH1–LH8.
 * The unit locks (copy strings, rule values, the end-state markup) live in src/marketing/*.test.*;
 * these are the claims only a rendered page can carry.
 *
 *   LH1  the sub is the typewriter face, the brand on its rust highlighter, two lines breaking
 *        after "representation?" — at 1440 and 1280
 *   LH2  with reduced motion: the card is the story's end state and its feed is scrollable
 *   LH3  the headline, the sub and the actions never animate and are opaque from first paint
 *   LH4  the day counter never goes back and never holds a day for more than 2.5s, Day 32 → 99
 *   LH5  when the nudge form is open nothing over the card is filled but the form itself
 *   LH6  the band's heading is on screen and on one line, and the front card is centred on the copy
 *   LH7  the hawk's shadow loads with its version, sits above the cards and copy at .2, uncropped
 *   LH8  the pile is aria-hidden and the headline is the page's only h1
 *
 * The public page needs no sign-in, so this file opens it itself. Run it without the setup project:
 *   SA_E2E_BASE_URL=http://127.0.0.1:<port> npx playwright test landingHeroV3 --project measure --no-deps
 *   LH3_MUTATE=<name>   apply one lock's named break, to prove that lock goes red
 *   LH3_SHOTS=1         write the report's screenshots to reports/landing-hero-v3/shots
 *
 * Every reading states its population first: a sweep over nothing passes, and says nothing.
 */
import { test, expect, Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const MUTATE = process.env.LH3_MUTATE ?? "";
const SHOTS = !!process.env.LH3_SHOTS;
const OUT = resolve("reports/landing-hero-v3/shots");

/** Each lock's named break. A stylesheet where one will do; the rest act on the page in `mutate`. */
const CSS_BREAKS: Record<string, string> = {
  LH1: ".mk-herosub{font-family:Georgia,serif!important}",
  LH1b: ".mk-herosub{width:330px!important}",
  LH3: ".mk-herotitle{animation:mkLcDot 1s infinite!important}",
  LH6: ".mk-statband{padding-top:520px!important}",
  LH6b: ".mk-hc-pile{margin-top:60px!important}",
  LH7: ".mk-lc-cast{opacity:.5!important}",
  LH7b: ".mk-lc-cast{left:-420px!important}",
};

async function open(page: Page, vp: { width: number; height: number }, reduce = false) {
  await page.setViewportSize(vp);
  await page.emulateMedia({ reducedMotion: reduce ? "reduce" : "no-preference" });
  if (MUTATE === "LH4") {
    /* LH4's break: the clock's frames arrive only every three seconds, so a day is held too long. */
    await page.addInitScript(() => {
      const raf = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (cb) => window.setTimeout(() => raf(cb), 3000) as unknown as number;
    });
  }
  await page.goto("/", { waitUntil: "commit" });
  await page.waitForSelector(".mk-herotitle", { state: "attached" });
  const css = CSS_BREAKS[MUTATE];
  if (css) await page.addStyleTag({ content: css });
}

const settle = async (page: Page) => {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(3200); // the entrance is over by 2.15s and the shadow by 3.1s
};

const shot = async (page: Page, name: string) => {
  if (!SHOTS) return;
  mkdirSync(OUT, { recursive: true });
  await page.screenshot({ path: resolve(OUT, name + ".png") });
};

test.describe("landing hero v3", () => {
  /* A logged-out visitor: the landing page is public, and this file must not depend on a sign-in. */
  test.use({ storageState: { cookies: [], origins: [] } });

  test("LH1 the sub: the typewriter face, the brand highlighted, two lines broken after the question", async ({ page }) => {
    for (const vp of [{ width: 1440, height: 780 }, { width: 1280, height: 800 }]) {
      await open(page, vp);
      await page.evaluate(() => document.fonts.ready);
      const r = await page.evaluate(() => {
        const sub = document.querySelector(".mk-herosub") as HTMLElement;
        const b = sub.querySelector("b") as HTMLElement;
        /* Every text node's line boxes, grouped by their top: that is the line count, and the first
           text node's own lines say where the break falls. */
        const lines = new Map<number, string>();
        const walk = document.createTreeWalker(sub, NodeFilter.SHOW_TEXT);
        let first: number[] = [];
        for (let n = walk.nextNode(), i = 0; n; n = walk.nextNode(), i++) {
          const rg = document.createRange(); rg.selectNodeContents(n);
          const tops = Array.from(rg.getClientRects()).filter((x) => x.width > 0).map((x) => Math.round(x.top));
          if (i === 0) first = [...new Set(tops)];
          tops.forEach((t) => lines.set(t, (lines.get(t) ?? "") + n!.textContent));
        }
        return {
          family: getComputedStyle(sub).fontFamily, bFamily: getComputedStyle(b).fontFamily,
          bText: b.textContent, bShadow: getComputedStyle(b).boxShadow,
          lines: [...lines.keys()].sort((a, c) => a - c).map((k) => lines.get(k)!.trim()), firstLines: first.length,
        };
      });
      console.log(`LH1 @${vp.width}`, JSON.stringify(r));
      expect(r.lines.length, "population: the sub's text was read").toBeGreaterThan(0);
      expect(r.family, `@${vp.width}: the sub's face`).toMatch(/^"?Special Elite/);
      expect(r.bFamily, "the brand inherits the face").toMatch(/^"?Special Elite/);
      expect(r.bText).toBe("QueryHawk");
      expect(r.bShadow, "the rust highlighter").toMatch(/rgba\(162, 69, 42, 0\.16\).*inset|inset.*rgba\(162, 69, 42, 0\.16\)/);
      expect(r.lines, `@${vp.width}: two lines`).toHaveLength(2);
      expect(r.firstLines, "the first sentence holds one line").toBe(1);
      expect(r.lines[0]).toBe("Hunting for literary agent representation?");
      expect(r.lines[1]).toBe("Smarten your search with QueryHawk.");
    }
  });

  test("LH2 reduced motion: the card is the story's end state, and the feed scrolls", async ({ page }) => {
    await open(page, { width: 1440, height: 780 }, true);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);
    if (MUTATE === "LH2") await page.evaluate(() => document.querySelector('[data-hc="tlv"]')!.classList.remove("mk-lc-tlv--scroll"));
    const r = await page.evaluate(() => {
      const q = (k: string) => document.querySelector(`[data-hc="${k}"]`) as HTMLElement;
      const tlv = q("tlv");
      return {
        day: q("day").getAttribute("aria-label"), band: q("bandt").textContent, pill: q("pill").textContent,
        final: q("pf").querySelector(".mk-lc-nt")!.textContent, finalBtn: q("pf").querySelector("b")!.textContent, finalOpacity: getComputedStyle(q("pf")).opacity,
        nudgeOpacity: getComputedStyle(q("pn")).opacity, formOpacity: getComputedStyle(q("lf")).opacity,
        foot: q("ftt").textContent, act: q("fta").textContent,
        steps: document.querySelectorAll(".mk-lc-step").length,
        overflowY: getComputedStyle(tlv).overflowY, sh: tlv.scrollHeight, ch: tlv.clientHeight, st: tlv.scrollTop,
        running: document.getAnimations().filter((a) => a.playState === "running" && (a as CSSAnimation).animationName !== "mkLcDot").length,
      };
    });
    console.log("LH2", JSON.stringify(r));
    expect(r.steps, "population: five lines").toBe(5);
    expect(r.day).toBe("Day 99");
    expect(r.band).toBe("With you");
    expect(r.pill).toBe("Full requested");
    expect(r.final).toBe("Eleanor wants the full! Send it by 5 July.");
    expect(r.finalBtn).toBe("Mark sent");
    expect(r.finalOpacity).toBe("1");
    expect(r.nudgeOpacity, "the nudge panel is not showing").toBe("0");
    expect(r.formOpacity, "the form is closed").toBe("0");
    expect(r.foot).toBe("Send the full by 5 July");
    expect(r.act).toBe("Mark full sent");
    expect(r.overflowY, "the feed is the writer's to scroll").toBe("auto");
    expect(r.sh, "there is history above the fold of the feed").toBeGreaterThan(r.ch);
    expect(r.st + r.ch, "and it rests at the bottom").toBeGreaterThanOrEqual(r.sh - 1);
    expect(r.running, "nothing animates under reduced motion").toBe(0);
    await shot(page, "reduced-motion-1440x780");
  });

  test("LH3 the text is still: opaque from first paint, never animated", async ({ page }) => {
    await open(page, { width: 1440, height: 780 });
    const t0 = Date.now();
    const readings: { at: number; ok: boolean; detail: string }[] = [];
    for (const at of [0, 1500, 4000]) {
      const wait = at - (Date.now() - t0);
      if (wait > 0) await page.waitForTimeout(wait);
      const r = await page.evaluate(() => [".mk-herotitle", ".mk-herosub", ".mk-heroctas"].map((s) => {
        const e = document.querySelector(s) as HTMLElement;
        let op = 1;
        for (let n: HTMLElement | null = e; n; n = n.parentElement) op *= +getComputedStyle(n).opacity;
        return { s, op, anims: e.getAnimations({ subtree: true }).length };
      }));
      readings.push({ at, ok: r.every((x) => x.op === 1 && x.anims === 0), detail: JSON.stringify(r) });
    }
    console.log("LH3", readings.map((x) => `${x.at}ms ${x.detail}`).join("\n"));
    expect(readings).toHaveLength(3);
    for (const x of readings) expect(x.ok, `at ${x.at}ms: ${x.detail}`).toBe(true);
  });

  test("LH4 the clock never goes back and never holds a day for more than 2.5s, Day 32 → 99", async ({ page }) => {
    test.setTimeout(120000);
    await open(page, { width: 1440, height: 780 });
    const seq: { t: number; n: number }[] = [];
    const t0 = Date.now();
    while (Date.now() - t0 < 60000) {
      const n = await page.evaluate(() => Number(document.querySelector('[data-hc="day"]')?.getAttribute("data-n")));
      seq.push({ t: Date.now() - t0, n });
      if (n === 99 && seq.some((s) => s.n === 32)) break;
      await page.waitForTimeout(500);
    }
    /* The story opens on Day 32 (the markup's static Day 99 hands over to it while the card is still
       invisible); the run is from the first 32 to the first 99. The clock starts moving at 2.4s, and
       the hold that counts is from the first day it LEAVES 32. */
    const from = seq.findIndex((s) => s.n === 32);
    const to = seq.findIndex((s, i) => i > from && s.n === 99);
    const run = seq.slice(from, to + 1);
    const moved = run.findIndex((s) => s.n !== 32);
    console.log("LH4", run.map((s) => `${(s.t / 1000).toFixed(1)}:${s.n}`).join(" "));
    expect(from, "the story reached Day 32").toBeGreaterThanOrEqual(0);
    expect(to, "and Day 99").toBeGreaterThan(from);
    expect(moved, "the clock left Day 32").toBeGreaterThan(0);
    let longest = 0, since = run[moved].t;
    for (let i = moved; i < run.length; i++) {
      expect(run[i].n, `at ${run[i].t}ms the counter went back`).toBeGreaterThanOrEqual(run[i - 1].n);
      if (run[i].n !== run[i - 1].n) since = run[i].t;
      longest = Math.max(longest, run[i].t - since);
    }
    console.log(`LH4 samples ${run.length}, longest hold ${longest}ms`);
    expect(run.length, "population: the run was sampled").toBeGreaterThan(40);
    expect(longest, "no day is held for more than 2.5s").toBeLessThanOrEqual(2500);
  });

  test("LH5 the nudge form opens over the card, and nothing dims the card behind it", async ({ page }) => {
    test.setTimeout(90000);
    await open(page, { width: 1440, height: 780 });
    await page.waitForFunction(() => +getComputedStyle(document.querySelector('[data-hc="lf"]')!).opacity > 0.95, null, { timeout: 60000, polling: 100 });
    if (MUTATE === "LH5") {
      await page.evaluate(() => {
        const d = document.createElement("div");
        d.style.cssText = "position:absolute;inset:0;background:rgba(28,19,15,.35);z-index:20;border-radius:20px";
        document.querySelector('[data-hc="front"]')!.appendChild(d);
      });
    }
    const r = await page.evaluate(() => {
      const card = document.querySelector('[data-hc="front"]') as HTMLElement;
      const form = document.querySelector('[data-hc="lf"]') as HTMLElement;
      const cr = card.getBoundingClientRect();
      /* The card's own face — the element that HOLDS its band — is the card, not something over it. */
      const band = card.querySelector('[data-hc="band"]')!;
      const filled = (e: Element, pseudo?: string) => {
        const c = getComputedStyle(e, pseudo);
        return !/rgba\(0, 0, 0, 0\)|transparent/.test(c.backgroundColor) || c.backgroundImage !== "none";
      };
      const bad = new Set<string>();
      let points = 0;
      for (let fx = 0.08; fx < 1; fx += 0.12) for (let fy = 0.06; fy < 1; fy += 0.11) {
        const x = cr.left + cr.width * fx, y = cr.top + cr.height * fy;
        const stack = document.elementsFromPoint(x, y);
        const at = stack.indexOf(card); if (at < 0) continue;
        points++;
        for (const e of stack.slice(0, at)) {
          if (form.contains(e) || e.classList.contains("mk-lc-cast") || e.contains(band)) continue;
          const b = e.getBoundingClientRect();
          /* An overlay is something laid over the card's face — at least half its area. */
          if (b.width * b.height >= cr.width * cr.height * 0.5 && filled(e)) bad.add(e.className || e.tagName);
        }
      }
      for (const host of [card, card.firstElementChild!]) for (const p of ["::before", "::after"]) {
        const c = getComputedStyle(host, p);
        if (c.content !== "none" && c.content !== "normal" && filled(host, p)) bad.add((host as HTMLElement).className + p);
      }
      return { points, bad: [...bad], formShadow: getComputedStyle(form).boxShadow };
    });
    console.log("LH5", JSON.stringify(r));
    expect(r.points, "population: points over the card").toBeGreaterThan(30);
    expect(r.bad, "nothing but the form fills the space over the card").toEqual([]);
    expect(r.formShadow, "the form carries its own soft shadow").not.toBe("none");
    await shot(page, "nudge-form-1440x780");
  });

  test("LH6 the band's heading is on screen and on one line; the front card is centred on the copy", async ({ page }) => {
    for (const vp of [{ width: 1204, height: 594 }, { width: 1440, height: 780 }, { width: 1920, height: 1080 }]) {
      await open(page, vp);
      await settle(page);
      const r = await page.evaluate(() => {
        const h = document.querySelector(".mk-stattitle") as HTMLElement;
        const rg = document.createRange(); rg.selectNodeContents(h);
        const tops = new Set(Array.from(rg.getClientRects()).filter((x) => x.width > 0).map((x) => Math.round(x.top)));
        const hb = h.getBoundingClientRect();
        const cp = document.querySelector(".mk-herocopy")!.getBoundingClientRect();
        const fr = document.querySelector('[data-hc="front"]')!.getBoundingClientRect();
        return { top: hb.top, bottom: hb.bottom, lines: tops.size, vh: innerHeight,
                 copyMid: cp.top + cp.height / 2, cardMid: fr.top + fr.height / 2 };
      });
      console.log(`LH6 @${vp.width}x${vp.height}`, JSON.stringify(r));
      expect(r.lines, `@${vp.width}: population`).toBeGreaterThan(0);
      expect(r.top, `@${vp.width}: the band's heading starts on screen`).toBeGreaterThanOrEqual(0);
      expect(r.bottom, `@${vp.width}: …and ends above the fold`).toBeLessThanOrEqual(r.vh);
      expect(r.lines, `@${vp.width}: on one line`).toBe(1);
      expect(Math.abs(r.cardMid - r.copyMid), `@${vp.width}: the card's centre on the copy's`).toBeLessThanOrEqual(8);
      await shot(page, `hero-${vp.width}x${vp.height}`);
    }
  });

  test("LH7 the shadow: versioned, above the cards and copy at .2, and never cropped", async ({ page }) => {
    /* RETIRED AT 390 (phone hero, 23 Oct): phones draw no cast shadow — the hawk's shadow flies over once
       instead, which `landingHeroMobile.measure.ts` HM7 holds. 820 keeps the stacked regime covered. */
    for (const vp of [{ width: 1920, height: 1080 }, { width: 1440, height: 780 }, { width: 1204, height: 594 }, { width: 820, height: 900 }]) {
      await open(page, vp);
      await settle(page);
      const r = await page.evaluate(() => {
        const cast = document.querySelector(".mk-lc-cast") as HTMLImageElement;
        const pile = cast.parentElement!;
        const copy = document.querySelector(".mk-herocopy")!;
        const c = getComputedStyle(cast);
        const cards = Array.from(pile.querySelectorAll(".mk-lc")).filter((e) => (e as HTMLElement).offsetParent);
        const b = cast.getBoundingClientRect();
        const nav = document.querySelector(".mk-navwrap")!.getBoundingClientRect();
        return {
          src: cast.getAttribute("src"), loaded: cast.complete && cast.naturalWidth > 0,
          opacity: c.opacity, z: c.zIndex, blend: c.mixBlendMode,
          cardsBelow: cards.length > 0 && cards.every((e) => (parseInt(getComputedStyle(e).zIndex) || 0) < (parseInt(c.zIndex) || 0)),
          pileAfterCopy: !!(copy.compareDocumentPosition(pile) & Node.DOCUMENT_POSITION_FOLLOWING),
          left: b.left, right: b.right, top: b.top + scrollY, cw: document.documentElement.clientWidth,
          underNav: Math.max(0, nav.bottom - b.top), sw: document.documentElement.scrollWidth,
        };
      });
      console.log(`LH7 @${vp.width}`, JSON.stringify(r));
      expect(r.src).toBe("/images/hawk-shadow.png?v=24b7a5ea");
      expect(r.loaded, "the file loads").toBe(true);
      expect(r.opacity).toBe("0.2");
      expect(r.blend).toBe("multiply");
      expect(r.cardsBelow, "above every card").toBe(true);
      expect(r.pileAfterCopy, "and painted after the copy").toBe(true);
      expect(r.left, `@${vp.width}: not cropped on the left`).toBeGreaterThanOrEqual(0);
      expect(r.right, `@${vp.width}: not cropped on the right`).toBeLessThanOrEqual(r.cw);
      expect(r.top, `@${vp.width}: not cropped at the top of the page`).toBeGreaterThanOrEqual(0);
      expect(r.sw, `@${vp.width}: and the page does not scroll sideways`).toBeLessThanOrEqual(r.cw);
      if (vp.width === 820) await shot(page, "hero-820x900");
    }
  });

  test("LH8 the pile is decorative; the headline is the page's only h1", async ({ page }) => {
    await open(page, { width: 1440, height: 780 });
    if (MUTATE === "LH8") await page.evaluate(() => document.querySelector(".mk-hc-pile")!.removeAttribute("aria-hidden"));
    const r = await page.evaluate(() => ({
      hidden: document.querySelector(".mk-hc-pile")!.getAttribute("aria-hidden"),
      h1s: Array.from(document.querySelectorAll("h1")).map((h) => h.textContent),
    }));
    expect(r.hidden).toBe("true");
    expect(r.h1s).toEqual(["No more winging it."]);
  });
});
