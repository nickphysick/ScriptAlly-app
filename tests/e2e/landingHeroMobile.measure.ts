/**
 * The landing hero on phones (23 Oct, ref design-refs/landing-hero-mobile-v1.html) — the rendered locks.
 *
 *   HM1  fit: at 390 × 844, 375 × 667 and 430 × 932 the front card and all four behind it are inside the
 *        viewport horizontally, and the front card ends no more than 12px below the drawer's resting top
 *        — EXCEPT where the .56 floor binds, where the scale must be exactly the floor (see the case)
 *   HM2  drawer: scrolling the drawer's travel brings the sheet's top to the header's foot with a 0px
 *        radius, and the hero is still in the DOM, sticky, behind it
 *   HM3  sign-up: with the story run to its end and no scroll, the sign-up shows and is a FoundingSignup
 *        (its field carries that component's label); scrolled first, it never appears
 *   HM4  counter: a stubbed count of 14 of 50 reads "36 places left" with 3 of 10 segments; no count, no number
 *   HM5  copy: "No more winging it." is on the rendered page exactly once, at 390 and at 1440
 *   HM6  reduced motion (phones): the static end state, the drawer grown, nothing animating, no fly-past
 *   HM7  phones draw no cast shadow; the fly-past is the versioned file, flown once along its curve
 *
 * The public page needs no sign-in, so this file opens it itself. Run without the setup project:
 *   SA_E2E_BASE_URL=http://127.0.0.1:<port> npx playwright test landingHeroMobile --project measure --no-deps
 *   HM_MUTATE=<name>   apply one lock's named break in the page, to prove that lock goes red
 *   HM_SHOTS=1         write screenshots to reports/landing-hero-mobile/shots
 *
 * Every reading states its population first: a sweep over nothing passes, and says nothing.
 */
import { test, expect, Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const MUTATE = process.env.HM_MUTATE ?? "";
const SHOTS = !!process.env.HM_SHOTS;
const OUT = resolve("reports/landing-hero-mobile/shots");
const PHRASE = "No more winging it.";

/** Each lock's named break. A stylesheet where one will do; the rest act on the page in `open`. */
const CSS_BREAKS: Record<string, string> = {
  HM1: ".mk-hc-pile--phone{transform:translate(-560px,30px) scale(.8)!important}",
  HM2: ".mk-hp-stage{position:relative!important}",
  HM3: ".mk-hp-sheet--grown .mk-hp-su{visibility:hidden!important;max-height:0!important}",
  HM4: ".mk-navpill-c{display:none!important}",
  HM6: ".mk-hp-fly{display:block!important}",
};

type Count = { claimed: number; cap: number } | null;

async function open(page: Page, vp: { width: number; height: number }, o: { reduce?: boolean; count?: Count } = {}) {
  await page.setViewportSize(vp);
  await page.emulateMedia({ reducedMotion: o.reduce ? "reduce" : "no-preference" });
  if (o.count !== undefined) {
    const c = o.count;
    await page.route("**/api/waitlist*", (r) => c
      ? r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ visible: true, cap: c.cap, count: c.claimed }) })
      : r.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html>" }));
  }
  if (MUTATE === "HM3b") {
    /* HM3's second half: the "has the reader scrolled?" check is blinded, so the drawer grows anyway. */
    await page.addInitScript(() => { Object.defineProperty(window, "scrollY", { get: () => 0, configurable: true }); });
  }
  if (MUTATE === "HM7") {
    /* A cast shadow put back on the phone pile. */
    await page.addInitScript(() => {
      const t = setInterval(() => {
        const pile = document.querySelector(".mk-hc-pile--phone");
        if (!pile) return;
        clearInterval(t);
        const img = document.createElement("img"); img.className = "mk-lc-cast"; img.src = "/images/hawk-shadow.png?v=24b7a5ea";
        pile.appendChild(img);
      }, 20);
    });
  }
  await page.goto("/", { waitUntil: "commit" });
  await page.waitForSelector(vp.width <= 760 ? ".mk-hp" : ".mk-herotitle", { state: "attached" });
  const css = CSS_BREAKS[MUTATE];
  if (css) await page.addStyleTag({ content: css });
  await page.evaluate(() => document.fonts.ready);
}

const shot = async (page: Page, name: string) => {
  if (!SHOTS) return;
  mkdirSync(OUT, { recursive: true });
  await page.screenshot({ path: resolve(OUT, name + ".png") });
};

test.describe("landing hero on phones", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  /* ⚠️ THE 12px CLAUSE AND THE .56 FLOOR CANNOT BOTH HOLD ON A 667px SCREEN, AND THE CASE SAYS SO. The
     front card is ~690 frame units tall; at the .56 floor that is 386px, and the drawer's resting top on
     a 667 screen is 357px below the header — so even a card touching the header ends ~29px past it. The
     floor is a baked decision; the case asserts the 12px rule where it can hold and, where the floor
     binds, that the scale IS the floor (so a fit that gave up early still fails), reporting the overlap. */
  test("HM1 fit: every card inside the width; the front card ends at the drawer (or the floor binds)", async ({ page }) => {
    const seen: string[] = [];
    let held = 0, floored = 0;
    for (const vp of [{ width: 390, height: 844 }, { width: 375, height: 667 }, { width: 430, height: 932 }]) {
      await open(page, vp);
      await page.waitForTimeout(2600); // the deal is over by 1.81s
      const r = await page.evaluate(() => {
        const cards = [...document.querySelectorAll(".mk-hc-pile--phone .mk-lc")].map((e) => e.getBoundingClientRect());
        const front = document.querySelector('[data-hc="front"]')!.getBoundingClientRect();
        const sheet = document.querySelector(".mk-hp-sheet")!.getBoundingClientRect();
        return {
          n: cards.length, vw: document.documentElement.clientWidth,
          left: Math.min(...cards.map((c) => c.left)), right: Math.max(...cards.map((c) => c.right)),
          below: front.bottom - sheet.top, scale: Number((document.querySelector(".mk-hc-pile") as HTMLElement).dataset.scale),
        };
      });
      seen.push(`${vp.width}x${vp.height}: scale ${r.scale} below ${r.below.toFixed(1)}`);
      console.log(`HM1 @${vp.width}x${vp.height}`, JSON.stringify(r));
      expect(r.n, "population: the front card and four behind it").toBe(5);
      expect(r.left, `@${vp.width}: nothing cut off on the left`).toBeGreaterThanOrEqual(0);
      expect(r.right, `@${vp.width}: nothing cut off on the right`).toBeLessThanOrEqual(r.vw);
      if (r.below > 12) floored++; else held++;
      if (r.below > 12) expect(r.scale, `@${vp.width}x${vp.height}: past the drawer by ${r.below.toFixed(1)}px, so the floor must be what binds`).toBe(0.56);
      else expect(r.below).toBeLessThanOrEqual(12);
      await shot(page, `hm1-${vp.width}x${vp.height}`);
    }
    console.log("HM1", seen.join(" · "), `· held ${held} · floored ${floored}`);
    /* The branch tally: the 12px rule was exercised, not only the floor. */
    expect(held, "the 12px rule held on at least one screen").toBeGreaterThan(0);
  });

  test("HM2 drawer: the travel brings the sheet to the header, square, over a sticky hero", async ({ page }) => {
    await open(page, { width: 390, height: 844 });
    await page.waitForTimeout(800);
    const run = await page.evaluate(() => window.innerHeight - document.querySelector(".mk-nav")!.getBoundingClientRect().height - 250);
    expect(run, "the travel is the stage less the drawer (784 − 250)").toBe(534);
    await page.evaluate((y) => window.scrollTo(0, y), run);
    await page.waitForTimeout(300);
    const r = await page.evaluate(() => {
      const nav = document.querySelector(".mk-navwrap")!.getBoundingClientRect();
      const sheet = document.querySelector(".mk-hp-sheet")!;
      const stage = document.querySelector(".mk-hp-stage")!;
      const sb = sheet.getBoundingClientRect(), st = stage.getBoundingClientRect();
      return {
        sheetTop: sb.top, navBottom: nav.bottom, radius: getComputedStyle(sheet).borderTopLeftRadius,
        inDom: document.contains(stage), position: getComputedStyle(stage).position, stageTop: st.top,
        behind: Number(getComputedStyle(stage).zIndex) < Number(getComputedStyle(sheet).zIndex),
      };
    });
    console.log("HM2", JSON.stringify(r));
    expect(Math.abs(r.sheetTop - r.navBottom), "the sheet's top is the header's foot").toBeLessThanOrEqual(1);
    expect(r.radius).toBe("0px");
    expect(r.inDom, "the hero is still in the DOM").toBe(true);
    expect(r.position).toBe("sticky");
    expect(Math.abs(r.stageTop - r.navBottom), "and still stuck under the header, behind the sheet").toBeLessThanOrEqual(1);
    expect(r.behind).toBe(true);
  });

  test("HM3 sign-up: it opens when the story ends unscrolled, is a FoundingSignup, and never after a scroll", async ({ page }) => {
    test.setTimeout(150000);
    await open(page, { width: 390, height: 844 });
    await page.waitForFunction(() => document.querySelector(".mk-hp-sheet")!.classList.contains("mk-hp-sheet--grown"), null, { timeout: 60000 });
    await page.waitForTimeout(1000);
    const field = page.locator(".mk-hp-su").getByLabel("Email address");
    const r = await page.evaluate(() => {
      const su = document.querySelector(".mk-hp-su")!;
      const input = su.querySelector<HTMLInputElement>('input[type="email"]');
      const b = input?.getBoundingClientRect();
      return { vis: getComputedStyle(su).visibility, h: (su as HTMLElement).offsetHeight, id: input?.id ?? null,
        onScreen: !!b && b.top >= 0 && b.bottom <= window.innerHeight, scrollY: window.scrollY };
    });
    console.log("HM3 unscrolled", JSON.stringify(r));
    expect(r.scrollY).toBe(0);
    expect(r.vis).toBe("visible");
    expect(r.onScreen, "the field is on screen").toBe(true);
    expect(r.id, "the FoundingSignup mount, by its id prefix").toBe("mk-drawer-email");
    await expect(field, "its field is labelled as FoundingSignup labels it").toBeVisible();
    await shot(page, "hm3-grown");

    await open(page, { width: 390, height: 844 });
    await page.waitForTimeout(3000);
    await page.evaluate(() => window.scrollTo(0, 120));
    await page.waitForFunction(() => document.querySelector(".mk-again")!.classList.contains("mk-again--on"), null, { timeout: 60000 });
    await page.waitForTimeout(2200); // the grow is due 0.6s after Watch again
    const s = await page.evaluate(() => ({ grown: document.querySelector(".mk-hp-sheet")!.classList.contains("mk-hp-sheet--grown"),
      vis: getComputedStyle(document.querySelector(".mk-hp-su")!).visibility }));
    console.log("HM3 scrolled first", JSON.stringify(s));
    expect(s.grown, "scrolled first: the drawer does not grow").toBe(false);
    expect(s.vis).toBe("hidden");
  });

  test("HM4 counter: 14 of 50 reads 36 places left and 3 of 10 segments; no count, no number", async ({ page }) => {
    await open(page, { width: 390, height: 844 }, { count: { claimed: 14, cap: 50 } });
    await page.waitForTimeout(2600); // the count-up is over by 2.0s
    const r = await page.evaluate(() => ({
      text: (document.querySelector(".mk-navpill") as HTMLElement).innerText,
      segs: document.querySelectorAll(".mk-navpill-c b").length,
      on: document.querySelectorAll(".mk-navpill-c b.mk-on").length,
    }));
    console.log("HM4 live", JSON.stringify(r));
    expect(r.segs, "population: ten segments").toBe(10);
    expect(r.text).toContain("36 places left");
    expect(r.on).toBe(3);
    await open(page, { width: 390, height: 844 }, { count: null });
    await page.waitForTimeout(1500);
    const n = await page.evaluate(() => ({
      text: (document.querySelector(".mk-navpill") as HTMLElement).innerText.trim(),
      segs: document.querySelectorAll(".mk-navpill-c b").length,
    }));
    console.log("HM4 none", JSON.stringify(n));
    expect(n.text, "no count: the first line only").toBe("Become a founding writer");
    expect(n.segs).toBe(0);
  });

  test("HM5 copy: the phrase is on the rendered page exactly once, at 390 and 1440", async ({ page }) => {
    for (const vp of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
      await open(page, vp);
      await page.waitForTimeout(500);
      /* Rendered text, whitespace folded: the desktop headline is two block lines in the DOM. */
      const n = await page.evaluate((p) => (document.body.innerText.replace(/\s+/g, " ").split(p).length - 1), PHRASE);
      console.log(`HM5 @${vp.width}`, n);
      expect(n, `@${vp.width}`).toBe(1);
    }
  });

  test("HM6 reduced motion on a phone: the end state, the drawer grown, nothing moving", async ({ page }) => {
    await open(page, { width: 390, height: 844 }, { reduce: true });
    await page.waitForTimeout(2600); // past the moment the deal and the fly-past would have run
    const r = await page.evaluate(() => {
      const hp = document.querySelector(".mk-hp")!;
      return {
        day: document.querySelector('[data-hc="day"]')!.getAttribute("data-n"),
        band: document.querySelector('[data-hc="bandt"]')!.textContent,
        pill: document.querySelector('[data-hc="pill"]')!.textContent,
        steps: hp.querySelectorAll(".mk-lc-step").length,
        final: getComputedStyle(document.querySelector('[data-hc="pf"]')!).opacity,
        grown: document.querySelector(".mk-hp-sheet")!.classList.contains("mk-hp-sheet--grown"),
        su: getComputedStyle(document.querySelector(".mk-hp-su")!).visibility,
        fly: getComputedStyle(document.querySelector(".mk-hp-fly")!).display,
        again: getComputedStyle(document.querySelector(".mk-again")!).display,
        running: hp.getAnimations({ subtree: true }).filter((a) => a.playState === "running").length,
      };
    });
    console.log("HM6", JSON.stringify(r));
    expect(r.day).toBe("99");
    expect(r.band).toBe("With you");
    expect(r.pill).toBe("Full requested");
    expect(r.steps).toBe(5);
    expect(r.final).toBe("1");
    expect(r.grown, "the drawer arrives grown").toBe(true);
    expect(r.su).toBe("visible");
    expect(r.fly, "no fly-past").toBe("none");
    expect(r.again, "no Watch again").toBe("none");
    expect(r.running, "nothing animating in the hero").toBe(0);
    await shot(page, "hm6-reduced");
  });

  test("HM7 no cast shadow on a phone; the fly-past is the versioned file, flown once on its curve", async ({ page }) => {
    await open(page, { width: 390, height: 844 });
    const r = await page.evaluate(() => {
      const fly = document.querySelector<HTMLElement>(".mk-hp-fly")!;
      const anims = fly.getAnimations();
      const c = getComputedStyle(fly);
      return {
        casts: document.querySelectorAll(".mk-lc-cast").length,
        src: fly.querySelector("img")!.getAttribute("src"),
        path: c.getPropertyValue("offset-path"), anims: anims.length,
        timing: anims[0] ? (anims[0].effect as KeyframeEffect).getTiming() : null,
      };
    });
    console.log("HM7", JSON.stringify(r));
    expect(r.casts, "phones draw no cast shadow").toBe(0);
    expect(r.src).toBe("/images/hawk-fly.webp?v=ebcb32c2");
    expect(r.path).toContain("M -170 600");
    expect(r.anims, "one pass").toBe(1);
    expect(r.timing).toMatchObject({ duration: 1000, delay: 1500, easing: "linear", iterations: 1 });
  });
});
