/**
 * Landing hero on the desk — v3 (20 Oct, ref design-refs/landing-hero-v3.html), with the card's story,
 * entrance and hawk from v4 (25 Oct, ref design-refs/landing-hero-v4.html) — the rendered locks.
 * The unit locks (copy strings, rule values, the end-state markup) live in src/marketing/*.test.*;
 * these are the claims only a rendered page can carry.
 *
 *   LH1  the sub is the typewriter face, the brand on its rust highlighter, two lines breaking
 *        after "representation?" — at 1440 and 1280
 *   LH2  with reduced motion (v4 R1/H4): the card is the story's end state — the new titles, head discs
 *        and 15-pages chip, no chips or popover — its feed scrollable; no fly-past; the cast shadow at
 *        rest (.2) from first paint
 *   LH3  the headline, the sub and the actions never animate and are opaque from first paint
 *   LH4  loop (v4, rewritten): the counter never goes back within a run, Day 1 → 99; then the card
 *        leaves and a fresh one reads Day 1 within 2s
 *   LH5  RETIRED (v4): there is no nudge form on the desk any more
 *   LH6  the band's heading is on screen and on one line, and the front card is centred on the copy
 *   LH7  the hawk's shadow loads with its version, sits above the cards and copy at .2, uncropped
 *   LH8  the pile is aria-hidden and the headline is the page's only h1
 *   LH9  popover (v4): its top within 16px below the status pill; it shows 10, then 1, 2, 3 in that
 *        order; gone when "Partial requested" starts typing
 *   LH10 chips (v4): each chip inside its own line's chip row, rust rgb(245, 230, 223) or sage
 *        rgb(230, 236, 227), gone within 3.5s; no floating pill
 *   LH11 hawk (v4): the fly layer is a child of <body> above the nav and the pile, nothing between it
 *        and the root clips it, it animates once and is still by 3s; the cast shadow is at .2 by 4s and
 *        does not move with the pointer, while the cards do
 *   LH12 entrance (v4): no back card animates translate on load; the front's first keyframe is scale .86
 *   LH13 copy (v4): "The Taloned Mr Ripley" on the front card, "Lord of the Wings" on every back card
 *   LH14 carded (v4.1): at 1440 × 860, 1280 × 720 and 1204 × 594 the white card exists, the copy's
 *        centre is within 8px of the card's, and the pile's overhangs above and below differ by ≤16px;
 *        where the pile is taller than the card it breaks out at both edges
 *   LH15 seam (v4.1): every pixel row from inside the nav down into the navy band, sampled in a column
 *        away from the card, is the nav's ink #1b2433
 *   LH16 counter (v4.1): under the actions; "N places left" with N from the shared store against the
 *        cap of 50; its fill is (cap − N) / cap of the track
 *   LH17 cap (v4.1): no rendered marketing page says "first 100" or "100 places"; Pricing and the phone
 *        pill state the same N as the landing hero
 *   LH18 reduced motion (v4.1): the counter's first visible state is already its final value
 *   LH19 no flip on the desk (phone v3.2): across a whole run at 1440 × 780 there is never a .mk-cgx
 *        element, and no card is ever turned about Y (every computed transform is 2D, no keyframe
 *        names rotateY)
 *   LH20 wording (v3.2): across a whole run no she/he/her/him anywhere on the card; the popover reads
 *        "Eleanor asked for"
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
import { WORDING_RECORDER, WordingRec, pronounHits, breakWording } from "./heroWording";

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
  LH9: ".mk-pillpop{margin-top:40px!important}",
  LH11: ".mk-hfly{z-index:10!important}",
  LH14: ".mk-hcard{top:0!important;bottom:auto!important;height:200px!important}",
  LH15: ".mk-herowrap.mk-herowrap--carded{background-image:none!important;box-shadow:none!important}",
  LH15b: ".mk-herowrap.mk-herowrap--carded{box-shadow:none!important}",
  LH16: ".mk-places-bar i{width:90%!important}",
  /* v3.2: the desk's front card turned about Y. */
  LH19b: '[data-hc="front"]{transform:perspective(1600px) rotateY(24deg)!important}',
};

async function open(page: Page, vp: { width: number; height: number }, reduce = false) {
  await page.setViewportSize(vp);
  await page.emulateMedia({ reducedMotion: reduce ? "reduce" : "no-preference" });
  await page.goto("/", { waitUntil: "commit" });
  await page.waitForSelector(".mk-herotitle", { state: "attached" });
  const css = CSS_BREAKS[MUTATE];
  if (css) await page.addStyleTag({ content: css });
}

const settle = async (page: Page) => {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(3700); // v4: the pop is over by 1.4s, the cast shadow settles by ~3.15s after mount
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

  /* REWRITTEN (v4 R1/H4): the new card, no chips or popover, no fly-past, the cast at .2 from first paint. */
  test("LH2 reduced motion: the card is the story's end state, the feed scrolls, the hawk is at rest", async ({ page }) => {
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
        nudgeOpacity: getComputedStyle(q("pn")).opacity,
        front: q("front").querySelector(".mk-lc-ms b")!.textContent,
        backs: Array.from(document.querySelectorAll(".mk-hc-pile .mk-lc--back .mk-lc-ms b")).map((b) => b.textContent),
        heads: Array.from(document.querySelectorAll(".mk-hc-pile .mk-lc-disc")).map((d) => !!d.querySelector("svg") && (d.textContent ?? "").trim() === ""),
        pages: q("steps").querySelectorAll(".mk-lc-step")[0].querySelectorAll(".mk-lc-att > span")[2]?.textContent,
        extras: document.querySelectorAll(".mk-taskchip, .mk-pillpop, .mk-up").length,
        fly: document.querySelectorAll(".mk-hfly").length,
        cast: getComputedStyle(document.querySelector(".mk-lc-cast")!).opacity, castAnims: document.querySelector(".mk-lc-cast")!.getAnimations().length,
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
    expect(r.front, "the front card's manuscript").toBe("The Taloned Mr Ripley");
    expect(r.backs, "population: four back cards, each 'Lord of the Wings'").toEqual(Array(4).fill("Lord of the Wings"));
    expect(r.heads, "every disc is a profile head, no initials").toEqual(Array(5).fill(true));
    expect(r.pages).toBe("15 pages");
    expect(r.extras, "no task chips, popover or floating pill").toBe(0);
    expect(r.fly, "no fly-past under reduced motion").toBe(0);
    expect(r.cast, "the cast shadow at rest").toBe("0.2");
    expect(r.castAnims, "and still").toBe(0);
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

 /* REWRITTEN (v4 S5): the story runs Day 1 → 99, never going back, then the card leaves and a fresh one
     reads Day 1 within 2s. (v3's "Day 32 → 99, no day held over 2.5s" is retired with the long story.) */
  test("LH4 loop: the counter never goes back within a run; the card leaves and a new one reads Day 1 within 2s", async ({ page }) => {
    test.setTimeout(120000);
    await page.addInitScript(() => {
      const R = { seq: [] as [number, number][], out: null as number | null, fresh: null as number | null };
      (window as unknown as { __lh4: typeof R }).__lh4 = R;
      const tick = () => {
        const t = performance.now(), d = document.querySelector('[data-hc="day"]'), f = document.querySelector<HTMLElement>('[data-hc="front"]');
        if (d && f) {
          const n = Number(d.getAttribute("data-n")); const last = R.seq[R.seq.length - 1];
          if (!last || last[1] !== n) R.seq.push([Math.round(t), n]);
          if (R.out === null) for (const a of f.getAnimations()) if (JSON.stringify((a.effect as KeyframeEffect).getKeyframes()).includes("-130%") && a.startTime != null) R.out = (a.startTime as number) + (a.effect!.getTiming().delay as number);
          if (R.out !== null && R.fresh === null && t > R.out && n === 1 && +getComputedStyle(f).opacity > .9) R.fresh = Math.round(t);
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await open(page, { width: 1440, height: 780 });
    await page.waitForFunction(() => (window as unknown as { __lh4: { fresh: number | null } }).__lh4.fresh !== null, null, { timeout: 90000, polling: 200 });
    const r = await page.evaluate(() => (window as unknown as { __lh4: { seq: [number, number][]; out: number; fresh: number } }).__lh4);
    /* The first run: from the story's first Day 1 to its Day 99 (the markup's static 99 comes before it). */
    const from = r.seq.findIndex((x) => x[1] === 1), to = r.seq.findIndex((x, i) => i > from && x[1] === 99);
    const run = r.seq.slice(from, to + 1);
    console.log("LH4", JSON.stringify({ run: run.map((x) => x[1]), out: Math.round(r.out), fresh: r.fresh }));
    expect(from, "population: the run reached Day 1").toBeGreaterThanOrEqual(0);
    expect(to, "and Day 99").toBeGreaterThan(from);
    expect(run.length, "population: the clock moved through the run").toBeGreaterThan(20);
    for (let i = 1; i < run.length; i++) expect(run[i][1], `at ${run[i][0]}ms the counter went back`).toBeGreaterThanOrEqual(run[i - 1][1]);
    expect(r.fresh - r.out, "a fresh card reads Day 1 within 2s of the card leaving").toBeLessThanOrEqual(2000);
  });

  /* LH5 RETIRED (v4 S4): there is no nudge form on the desk — Nudge is pressed and the reminder goes
     straight to "You nudged Eleanor". Its "nothing dims the card" claim had nothing left to hold. */

  /* GEOMETRY MOVED (v4.1): the copy and the pile are both centred on the white card now, so the front
     card alone is no longer on the copy's centre (15px off at 1204 × 594, by design). The clause
     becomes "the copy is centred on the card"; the pile's centring on it is LH14's. */
  test("LH6 the band's heading is on screen and on one line; the copy is centred on the card", async ({ page }) => {
    for (const vp of [{ width: 1204, height: 594 }, { width: 1440, height: 780 }, { width: 1920, height: 1080 }]) {
      await open(page, vp);
      await settle(page);
      const r = await page.evaluate(() => {
        const h = document.querySelector(".mk-stattitle") as HTMLElement;
        const rg = document.createRange(); rg.selectNodeContents(h);
        const tops = new Set(Array.from(rg.getClientRects()).filter((x) => x.width > 0).map((x) => Math.round(x.top)));
        const hb = h.getBoundingClientRect();
        const cp = document.querySelector(".mk-herocopy")!.getBoundingClientRect();
        const fr = document.querySelector(".mk-hcard")!.getBoundingClientRect();
        return { top: hb.top, bottom: hb.bottom, lines: tops.size, vh: innerHeight,
                 copyMid: cp.top + cp.height / 2, cardMid: fr.top + fr.height / 2 };
      });
      console.log(`LH6 @${vp.width}x${vp.height}`, JSON.stringify(r));
      expect(r.lines, `@${vp.width}: population`).toBeGreaterThan(0);
      expect(r.top, `@${vp.width}: the band's heading starts on screen`).toBeGreaterThanOrEqual(0);
      expect(r.bottom, `@${vp.width}: …and ends above the fold`).toBeLessThanOrEqual(r.vh);
      expect(r.lines, `@${vp.width}: on one line`).toBe(1);
      expect(Math.abs(r.cardMid - r.copyMid), `@${vp.width}: the copy's centre on the white card's`).toBeLessThanOrEqual(8);
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

  /* One recorded run of the desk story: the popover (its gap below the pill, the numbers it shows in
     order, its opacity on the sample that first sees a letter of Partial requested) and every chip. */
  type Rec = {
    pop: { gap: number | null; seq: string[]; opAtType: number | null };
    chips: { text: string; line: number; inAtt: boolean; bg: string; createdAt: number; shownAt: number | null; goneAt: number | null }[];
    floating: number; out: number | null;
  };
  const RECORDER = () => {
    const R: Rec = { pop: { gap: null, seq: [], opAtType: null }, chips: [], floating: 0, out: null };
    (window as unknown as { __lhr: Rec }).__lhr = R;
    const seen = new Map<Element, Rec["chips"][number]>();
    setInterval(() => {
      const t = performance.now(), front = document.querySelector<HTMLElement>('[data-hc="front"]'); if (!front) return;
      const steps = Array.from(front.querySelectorAll<HTMLElement>(".mk-lc-step"));
      R.floating = Math.max(R.floating, document.querySelectorAll(".mk-up").length);
      const pop = front.querySelector<HTMLElement>(".mk-pillpop"), pill = front.querySelector('[data-hc="pill"]');
      if (pop && pill) {
        const op = +getComputedStyle(pop).opacity;
        if (op > .99) {
          if (R.pop.gap === null) R.pop.gap = pop.getBoundingClientRect().top - pill.getBoundingClientRect().bottom;
          const n = pop.querySelector(".mk-smp-n")!.textContent ?? "";
          if (R.pop.seq[R.pop.seq.length - 1] !== n) R.pop.seq.push(n);
        }
      }
      const ch = steps[1]?.querySelector<HTMLElement>(".mk-lc-t span");
      if (R.pop.gap !== null && R.pop.opAtType === null && ch && +getComputedStyle(ch).opacity > 0) R.pop.opAtType = pop ? +getComputedStyle(pop).opacity : 0;
      document.querySelectorAll<HTMLElement>(".mk-taskchip, .mk-up").forEach((g) => {
        let rec = seen.get(g);
        if (!rec) { rec = { text: g.textContent ?? "", line: steps.indexOf(g.closest<HTMLElement>(".mk-lc-step")!), inAtt: !!g.parentElement?.matches(".mk-lc-att"), bg: getComputedStyle(g).backgroundColor, createdAt: t, shownAt: null, goneAt: null }; seen.set(g, rec); R.chips.push(rec); }
        const op = +getComputedStyle(g).opacity;
        if (rec.shownAt === null && op > .99) rec.shownAt = t;
        if (rec.shownAt !== null && rec.goneAt === null && op < .05) rec.goneAt = t;
      });
      for (const [g, rec] of seen) if (rec.shownAt !== null && rec.goneAt === null && !g.isConnected) rec.goneAt = t;
      if (R.out === null) for (const a of front.getAnimations()) if (JSON.stringify((a.effect as KeyframeEffect).getKeyframes()).includes("-130%") && a.startTime != null) R.out = (a.startTime as number) + (a.effect!.getTiming().delay as number);
    }, 40);
  };
  async function record(page: Page, ms: number) {
    await page.addInitScript(RECORDER);
    await open(page, { width: 1440, height: 780 });
    await page.waitForTimeout(ms);
    return page.evaluate(() => (window as unknown as { __lhr: Rec }).__lhr);
  }

  test("LH9 popover: under the status pill, 10 then 1, 2, 3, and gone before Partial requested types", async ({ page }) => {
    test.setTimeout(90000);
    const r = await record(page, 13000);
    console.log("LH9", JSON.stringify(r.pop));
    expect(r.pop.gap, "population: the popover came in").not.toBeNull();
    expect(r.pop.gap!, "its top is below the pill").toBeGreaterThanOrEqual(0);
    expect(r.pop.gap!, "within 16px of it").toBeLessThanOrEqual(16);
    expect(r.pop.seq, "it shows 10, then 1, 2, 3, in that order").toEqual(["10", "1", "2", "3"]);
    expect(r.pop.opAtType, "population: the line typed in").not.toBeNull();
    expect(r.pop.opAtType!, "already gone when the first letter of Partial requested appears").toBeLessThan(.05);
  });

  test("LH10 chips: in their own line's chip row, rust or sage, gone within 3.5s; no floating pill", async ({ page }) => {
    test.setTimeout(120000);
    const r = await record(page, 26000);
    const first = r.chips.filter((x) => r.out === null || x.createdAt < r.out);
    console.log("LH10", JSON.stringify({ floating: r.floating, chips: first.map((x) => ({ ...x, held: x.goneAt && x.shownAt ? Math.round(x.goneAt - x.shownAt) : null })) }));
    const want: [string, number, string][] = [["Task created", 1, "rgb(245, 230, 223)"], ["Task complete", 2, "rgb(230, 236, 227)"], ["Reminder set", 3, "rgb(245, 230, 223)"]];
    expect(first.map((x) => x.text), "population: the three chips, in order").toEqual(want.map((w) => w[0]));
    expect(r.floating, "no floating pill at any moment").toBe(0);
    first.forEach((x, k) => {
      expect(x.inAtt && x.line === want[k][1], `"${x.text}" sits in line ${want[k][1]}'s chip row (found line ${x.line}, in row ${x.inAtt})`).toBe(true);
      expect(x.bg, `"${x.text}" is ${k === 1 ? "sage" : "rust"}, never the cream chip`).toBe(want[k][2]);
      expect(x.shownAt, `"${x.text}" was shown`).not.toBeNull();
      expect(x.goneAt, `"${x.text}" went`).not.toBeNull();
      expect(x.goneAt! - x.shownAt!, `"${x.text}" gone within 3.5s`).toBeLessThanOrEqual(3500);
    });
  });

  test("LH11 hawk: above the nav and the pile, unclipped, flown once; the cast settles at .2 and stays still", async ({ page }) => {
    test.setTimeout(60000);
    await open(page, { width: 1440, height: 780 });
    await page.waitForSelector(".mk-hfly", { state: "attached" });
    const a = await page.evaluate(() => {
      const layer = document.querySelector<HTMLElement>(".mk-hfly")!, bird = layer.querySelector<HTMLElement>(".mk-hfly-bird")!;
      const z = (e: Element) => parseInt(getComputedStyle(e).zIndex) || 0;
      /* ⚠️ <html> and <body> clip the x axis at the viewport's edge (marketing.css), which the brief
         allows ("it may leave via the viewport edge"); the claim is that nothing between the layer and
         them clips it — the hero, the sheet, any container. */
      const clips: string[] = [];
      for (let n: HTMLElement | null = bird.parentElement; n && n !== document.body; n = n.parentElement) { const c = getComputedStyle(n); if (/hidden|clip/.test(c.overflow + c.overflowX + c.overflowY)) clips.push(n.className); }
      return { parent: layer.parentElement === document.body, z: z(layer), nav: z(document.querySelector(".mk-navwrap")!), hero: z(document.querySelector(".mk-herowrap")!), clips, anims: bird.getAnimations().length };
    });
    await page.waitForTimeout(3000);
    const still = await page.evaluate(() => document.querySelector<HTMLElement>(".mk-hfly-bird")!.getAnimations().filter((x) => x.playState === "running").length);
    await page.waitForTimeout(1200);
    await page.mouse.move(300, 300); await page.waitForTimeout(100);
    const before = await page.evaluate(() => ({ cast: getComputedStyle(document.querySelector(".mk-lc-cast")!).translate, front: getComputedStyle(document.querySelector('[data-hc="front"]')!).translate }));
    await page.mouse.move(1300, 650, { steps: 8 }); await page.waitForTimeout(900);
    const b = await page.evaluate(() => {
      return { castOp: getComputedStyle(document.querySelector(".mk-lc-cast")!).opacity,
               cast: getComputedStyle(document.querySelector(".mk-lc-cast")!).translate, front: getComputedStyle(document.querySelector('[data-hc="front"]')!).translate };
    });
    console.log("LH11", JSON.stringify({ a, still, before, b }));
    expect(a.parent, "the fly layer is a child of <body>, outside the hero and the sheet").toBe(true);
    expect(a.z, "above the nav").toBeGreaterThan(a.nav);
    expect(a.z, "and above the hero and its pile").toBeGreaterThan(a.hero);
    expect(a.clips, "nothing between it and the root clips it").toEqual([]);
    expect(a.anims, "it flies once").toBe(1);
    expect(still, "and is not running at 3s").toBe(0);
    expect(b.castOp, "the cast shadow is at .2 by 4s").toBe("0.2");
    expect(b.cast, "the cast shadow does not move with the pointer").toBe(before.cast);
    expect(b.front, "while the front card does").not.toBe(before.front);
  });

  test("LH12 entrance: the cards pop — no back card is dealt, the front starts at scale .86", async ({ page }) => {
    await page.addInitScript(() => {
      const kf: string[] = [];
      (window as unknown as { __lh12: string[] }).__lh12 = kf;
      const orig = Element.prototype.animate;
      Element.prototype.animate = function (this: Element, k: Keyframe[] | PropertyIndexedKeyframes | null, o?: number | KeyframeAnimationOptions) {
        if (this.matches?.(".mk-hc-pile .mk-lc") && Array.isArray(k)) kf.push(JSON.stringify({ front: this.getAttribute("data-hc") === "front", k }));
        return orig.call(this, k, o as KeyframeAnimationOptions);
      };
    });
    await open(page, { width: 1440, height: 780 });
    await page.waitForTimeout(1200);
    const raw = await page.evaluate(() => (window as unknown as { __lh12: string[] }).__lh12);
    const all = raw.map((x) => JSON.parse(x) as { front: boolean; k: Record<string, unknown>[] });
    const backs = all.filter((x) => !x.front), front = all.filter((x) => x.front);
    console.log("LH12", JSON.stringify({ backs: backs.length, front: front.map((f) => f.k[0]) }));
    expect(backs.length, "population: the four back cards' entrances").toBe(4);
    expect(backs.filter((x) => x.k.some((f) => "translate" in f)).length, "no back card animates translate on load (no dealing)").toBe(0);
    expect(front.length, "population: the front card's entrance").toBeGreaterThan(0);
    expect(parseFloat(String(front[0].k[0].scale)), "its first keyframe is scale .86").toBe(.86);
  });

  test("LH13 copy: The Taloned Mr Ripley on the front card, Lord of the Wings on every back card", async ({ page }) => {
    await open(page, { width: 1440, height: 780 }, true);
    await page.waitForTimeout(300);
    const r = await page.evaluate(() => ({
      front: document.querySelector('.mk-hc-pile [data-hc="front"] .mk-lc-ms b')?.textContent,
      backs: Array.from(document.querySelectorAll(".mk-hc-pile .mk-lc--back .mk-lc-ms b")).map((b) => b.textContent),
    }));
    console.log("LH13", JSON.stringify(r));
    expect(r.front).toBe("The Taloned Mr Ripley");
    expect(r.backs, "population: four back cards").toEqual(Array(4).fill("Lord of the Wings"));
  });

  /* ═════ v4.1: the hero in a card over the navy, the places counter, the cap of 50 ═════ */
  /** The endpoint, answering as the real server does today: its stored cap is still 100. */
  const stub = (page: Page, count = 3, cap = 100) =>
    page.route("**/api/waitlist**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ visible: true, cap, count }) }));

  test("LH14 carded: the card, the copy centred in it, the pile breaking out evenly", async ({ page }) => {
    test.setTimeout(120000);
    const seen: string[] = [];
    for (const vp of [{ width: 1440, height: 860 }, { width: 1280, height: 720 }, { width: 1204, height: 594 }]) {
      await stub(page);
      await open(page, vp);
      await settle(page);
      const r = await page.evaluate(() => {
        const c = document.querySelector(".mk-hcard")?.getBoundingClientRect();
        if (!c || !c.height) return null;
        const cards = Array.from(document.querySelectorAll<HTMLElement>(".mk-hc-pile .mk-lc")).filter((e) => e.offsetParent).map((e) => e.getBoundingClientRect());
        const cp = document.querySelector(".mk-herocopy")!.getBoundingClientRect();
        const top = Math.min(...cards.map((x) => x.top)), bot = Math.max(...cards.map((x) => x.bottom));
        return { n: cards.length, over: c.top - top, under: bot - c.bottom, copyMid: (cp.top + cp.bottom) / 2 - (c.top + c.bottom) / 2, pileH: bot - top, cardH: c.height };
      });
      seen.push(`${vp.width}x${vp.height}: ${r ? `over ${r.over.toFixed(1)} under ${r.under.toFixed(1)} copy ${r.copyMid.toFixed(1)}` : "no card"}`);
      expect(r, `@${vp.width}: the white card exists`).not.toBeNull();
      expect(r!.n, "population: the visible cards").toBeGreaterThanOrEqual(3);
      expect(Math.abs(r!.copyMid), `@${vp.width}: the copy is centred in the card`).toBeLessThanOrEqual(8);
      expect(Math.abs(r!.over - r!.under), `@${vp.width}: the pile breaks out evenly (above ${r!.over.toFixed(1)}, below ${r!.under.toFixed(1)})`).toBeLessThanOrEqual(16);
      /* ⚠️ At 1204 × 594 the card's own floor (copy + 90) is taller than the pile — as in the ref — so
         the pile sits inside it, evenly; it can only break out where it is the taller of the two. */
      if (r!.pileH > r!.cardH) {
        expect(r!.over, `@${vp.width}: the pile's top is above the card's`).toBeGreaterThan(0);
        expect(r!.under, `@${vp.width}: its bottom below the card's`).toBeGreaterThan(0);
      }
      await shot(page, `carded-${vp.width}x${vp.height}`);
    }
    console.log("LH14", seen.join(" · "));
  });

  test("LH15 seam: the nav's ink runs into the navy band with no row of any other colour", async ({ page }) => {
    await stub(page);
    await open(page, { width: 1440, height: 860 });
    await settle(page);
    const box = await page.evaluate(() => {
      const nav = document.querySelector(".mk-navwrap")!.getBoundingClientRect(), card = document.querySelector(".mk-hcard")!.getBoundingClientRect();
      return { navTop: nav.top, navBottom: nav.bottom, cardLeft: card.left, cardTop: card.top };
    });
    /* A column 20px in from the left, clear of the card (which starts 64 frame units in), from the
       middle of the nav down to the card's top — all of it must be the nav's ink. */
    const x = 20, y0 = Math.round((box.navTop + box.navBottom) / 2), y1 = Math.round(box.cardTop) - 2;
    const png = await page.screenshot({ clip: { x, y: y0, width: 1, height: y1 - y0 } });
    const rows = await page.evaluate(async (b64) => {
      const i = new Image(); await new Promise((r) => { i.onload = r; i.src = "data:image/png;base64," + b64; });
      const c = document.createElement("canvas"); c.width = i.width; c.height = i.height; const g = c.getContext("2d")!; g.drawImage(i, 0, 0);
      const d = g.getImageData(0, 0, 1, i.height).data, out: number[][] = [];
      for (let k = 0; k < d.length; k += 4) out.push([d[k], d[k + 1], d[k + 2]]);
      return out;
    }, png.toString("base64"));
    const off = rows.map((p, k) => ({ y: y0 + k, p })).filter(({ p }) => Math.abs(p[0] - 27) > 1 || Math.abs(p[1] - 36) > 1 || Math.abs(p[2] - 51) > 1);
    console.log("LH15", JSON.stringify({ x, y0, y1, rows: rows.length, off: off.slice(0, 5) }));
    expect(x, "the column is clear of the card").toBeLessThan(box.cardLeft);
    expect(rows.length, "population: the rows from the nav to the card").toBeGreaterThan(20);
    expect(off, "every row is #1b2433").toEqual([]);
  });

  test("LH16 counter: under the actions, N from the shared store against 50, the fill (cap − N) / cap", async ({ page }) => {
    await stub(page, 3, 100);
    await open(page, { width: 1440, height: 860 });
    await page.waitForSelector(".mk-places:not(.mk-places--wait)");
    await page.waitForTimeout(2200); // the count-down ends 1.8s after mount
    const r = await page.evaluate(() => {
      const pl = document.querySelector<HTMLElement>(".mk-places")!, acts = document.querySelector(".mk-heroctas")!.getBoundingClientRect();
      const bar = pl.querySelector(".mk-places-bar")!.getBoundingClientRect(), fill = pl.querySelector(".mk-places-bar i")!.getBoundingClientRect();
      const b = pl.getBoundingClientRect();
      return { text: pl.querySelector("span")!.textContent, label: pl.getAttribute("aria-label"), left: pl.dataset.left, cap: pl.dataset.cap, top: b.top, x: b.left, actsBottom: acts.bottom, actsLeft: acts.left, share: fill.width / bar.width };
    });
    console.log("LH16", JSON.stringify(r));
    expect(r.top, "the counter is under the actions").toBeGreaterThan(r.actsBottom);
    expect(Math.abs(r.x - r.actsLeft), "and aligned with them").toBeLessThanOrEqual(1);
    expect(r.cap, "the cap every counter draws against").toBe("50");
    expect(r.left, "N is the cap less the store's claimed count").toBe("47");
    expect(r.text, "it reads N places left").toBe("47 places left");
    expect(r.label).toBe("47 of 50 founding places left");
    expect(Math.abs(r.share - 3 / 50), "the fill is (cap − N) / cap of the track").toBeLessThan(.005);
  });

  test("LH17 cap: no page says 100 places; Pricing and the phone pill state the hero's N", async ({ page }) => {
    test.setTimeout(90000);
    const bad: string[] = [];
    for (const route of ["/", "/pricing", "/founders", "/about", "/contact"]) {
      await stub(page);
      await open(page, { width: 1440, height: 860 });
      if (route !== "/") await page.goto(route, { waitUntil: "load" });
      await page.waitForTimeout(800);
      const text = await page.evaluate(() => document.body.innerText);
      for (const t of ["first 100", "100 places", "hundred founding", "first hundred", "one hundred writers"]) if (text.toLowerCase().includes(t)) bad.push(`${route}: ${t}`);
    }
    expect(bad, "no rendered marketing page states the old cap").toEqual([]);
    await stub(page); await open(page, { width: 1440, height: 860 }); await page.waitForSelector(".mk-places:not(.mk-places--wait)");
    const hero = await page.evaluate(() => document.querySelector<HTMLElement>(".mk-places")!.dataset.left);
    await stub(page); await page.goto("/pricing", { waitUntil: "load" }); await page.waitForTimeout(1500);
    /* Pricing's N, from whichever counter it draws: v3's tally ("3/50" — claimed of cap) or v4's line
       ("47 places left", on dev while the Pricing v4 branch is unmerged). Both come from the store. */
    const pricing = await page.evaluate(() => {
      const tally = document.querySelector(".mk-fmtally")?.textContent?.match(/^(\d+)\/(\d+)$/);
      if (tally) return String(Number(tally[2]) - Number(tally[1]));
      return document.querySelector(".mk-fmmeta")?.textContent?.match(/^(\d+) places left$/)?.[1];
    });
    await page.setViewportSize({ width: 390, height: 844 }); await stub(page); await page.goto("/", { waitUntil: "load" }); await page.waitForTimeout(1500);
    const pill = await page.evaluate(() => document.querySelector(".mk-navpill-c .mk-sr")?.textContent);
    console.log("LH17", JSON.stringify({ hero, pricing, pill }));
    expect(hero, "population: the hero's N").toBe("47");
    expect(pricing, "Pricing states the same N against the same cap").toBe("47");
    expect(pill, "the phone pill states the same N").toBe("47 places left");
  });

  test("LH18 reduced motion: the counter's first visible state is its final value", async ({ page }) => {
    await page.addInitScript(() => {
      const seen: string[] = []; (window as unknown as { __lh18: string[] }).__lh18 = seen;
      const tick = () => { const pl = document.querySelector(".mk-places:not(.mk-places--wait)"); if (pl) { const t = pl.querySelector("span")!.textContent!; const w = (pl.querySelector(".mk-places-bar i") as HTMLElement).style.width; if (seen[seen.length - 1] !== t + "|" + w) seen.push(t + "|" + w); } if (seen.length < 5 && performance.now() < 6000) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    });
    await stub(page, 3, 100);
    await open(page, { width: 1440, height: 860 }, true);
    await page.waitForTimeout(2500);
    const seen = await page.evaluate(() => (window as unknown as { __lh18: string[] }).__lh18);
    console.log("LH18", JSON.stringify(seen));
    expect(seen.length, "population: the counter appeared").toBeGreaterThan(0);
    expect(seen, "one state, the final one, from its first frame").toEqual(["47 places left|6%"]);
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

  test("LH19 no flip on the desk: no face element and no turn about Y across a whole run", async ({ page }) => {
    test.setTimeout(120000);
    if (MUTATE === "LH19") await page.addInitScript(() => {
      /* A face put on the desk's front card, as the phone's flip would. */
      setTimeout(() => { const f = document.querySelector('[data-hc="front"]'); if (f) { const g = document.createElement("div"); g.className = "mk-cgx"; f.appendChild(g); } }, 3000);
    });
    await page.addInitScript(() => {
      const R = { frames: 0, cards: 0, cgx: 0, turned: [] as string[], rotateKf: 0 };
      (window as unknown as { __lhf: typeof R }).__lhf = R;
      const loop = () => {
        const cards = document.querySelectorAll<HTMLElement>(".mk-hc-pile [data-hc]");
        if (cards.length) {
          R.frames++; R.cards = Math.max(R.cards, cards.length);
          if (document.querySelector(".mk-cgx")) R.cgx++;
          cards.forEach((c) => {
            const tr = getComputedStyle(c).transform;
            if (tr !== "none" && !new DOMMatrix(tr).is2D && R.turned.length < 5) R.turned.push(`${c.getAttribute("data-hc")}: ${tr.slice(0, 60)}`);
            for (const a of c.getAnimations()) if (JSON.stringify((a.effect as KeyframeEffect).getKeyframes()).includes("rotateY")) R.rotateKf++;
          });
        }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    });
    await open(page, { width: 1440, height: 780 });
    await page.waitForTimeout(31000); // a whole desk run is ~29s
    const r = await page.evaluate(() => (window as unknown as { __lhf: { frames: number; cards: number; cgx: number; turned: string[]; rotateKf: number } }).__lhf);
    console.log("LH19", JSON.stringify(r));
    expect(r.frames, "population: a whole run sampled every frame").toBeGreaterThan(1200);
    expect(r.cards, "population: the pile's cards were read").toBeGreaterThan(1);
    expect(r.cgx, "no frame has a .mk-cgx element on the desk").toBe(0);
    expect(r.turned, "no card is turned about Y").toEqual([]);
    expect(r.rotateKf, "no animation on a card names rotateY").toBe(0);
  });

  test("LH20 wording: no she or he anywhere on the card across a run; the popover reads Eleanor asked for", async ({ page }) => {
    test.setTimeout(120000);
    if (MUTATE === "LH20") await breakWording(page);
    await page.addInitScript(WORDING_RECORDER);
    await open(page, { width: 1440, height: 780 });
    await page.waitForTimeout(31000);
    const r = await page.evaluate(() => (window as unknown as { __hw: WordingRec }).__hw);
    const hits = pronounHits(r.texts);
    console.log("LH20", JSON.stringify({ frames: r.frames, distinct: r.texts.length, labels: r.labels, hits }));
    expect(r.frames, "population: a whole run sampled").toBeGreaterThan(1200);
    expect(r.texts.some((t) => t.includes("Full requested")), "population: the run reached Full requested").toBe(true);
    expect(hits, "no she/he/her/him on the card at any frame").toEqual([]);
    expect(r.labels, "the popover names the agent").toEqual(["Eleanor asked for"]);
  });
});
