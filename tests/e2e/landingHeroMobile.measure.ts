/**
 * The landing hero on phones — the rendered locks. v3 (24 Oct, ref design-refs/landing-hero-mobile-v3.html):
 * one short looping story on the card. (v1's long story and v2's dashboard story are retired; their locks
 * HM9–HM12 went with v2.)
 *
 *   HM1  footer: at 390 × 844, 375 × 667, 412 × 915 and 430 × 932 every card is inside the screen, the
 *        front card's footer top is at or below the drawer's resting top, and its final panel's bottom is
 *        above it; where the screen has the height, the card's top is within 42px of the header and the
 *        pile uses the width (within 8px of each edge) — Nick, 24 Oct: "reach a bit higher"
 *   HM2  drawer: scrolling the drawer's travel brings the sheet's top to the header's foot with a 0px
 *        radius, and the hero is still in the DOM, sticky, behind it
 *   HM3  sign-up: after the story's FIRST run, unscrolled, the sign-up shows and is a FoundingSignup;
 *        scrolled first, it never appears
 *   HM4  counter: counts down from the cap to the places left; no count, no number
 *   HM5  copy: "No more winging it." is on the rendered page exactly once, at 390 and at 1440
 *   HM6  reduced motion (phones): the static end state, footer under the grown drawer, nothing moving
 *   HM7  phones draw no cast shadow; the fly-past is the versioned file, flown once along its curve
 *   HM8  with the drawer grown, the card's last panel is still above it and the scale never exceeds .86
 *   HM13 copy (v3.1): the front card reads "The Taloned Mr Ripley", every back card "Lord of the Wings";
 *        the 15-pages chip, and nothing of v2's story
 *   HM14 chips (v3.1, rewritten): "Task created", "Task complete" and "Reminder set" each appear INSIDE
 *        their own line's chip row (.mk-lc-att), wholly inside the screen, and are gone within 3.5s; no
 *        floating pill element exists at any moment
 *   HM16 popover (v3.1; v3.2 longer loop): "Eleanor asked for" drops from the status pill — its top
 *        within 16px below the pill — and is gone before "Partial requested" starts typing
 *   HM18 flip (v3.2): the card's face (.mk-cgx) shows exactly twice a run, at Day 36 and Day 99; on the
 *        way in and on the way out the card turns through edge-on (rotateY passes ±90°); the popover is
 *        never visible while the face is; the face is gone before the popover opens and before "Full
 *        requested" types
 *   HM19 confetti (v3.2): every piece's centre stays above the face's title at every frame
 *   HM20 wording (v3.2): across a whole run no she/he/her/him anywhere on the card; the popover reads
 *        "Eleanor asked for"
 *   HM21 reduced motion (v3.2): no flip — no visible face, and the card never leaves the page's plane
 *   HM17 buttons (v3.1): Join is ink navy rgb(42, 58, 82); See how it works has no fill and an underline
 *   HM15 loop: after a full story the front card leaves and a fresh one reads Day 1 within 2s; the
 *        drawer grows once and stays grown
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
import { WORDING_RECORDER, WordingRec, pronounHits, breakWording } from "./heroWording";

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
  HM1v3: ".mk-hp-hero{top:-40px!important}",
  HM16: ".mk-pillpop{margin-top:40px!important}",
  HM17: ".mk-hp-suform .mk-btn{background:#a2452a!important}",
  HM17b: ".mk-hp-how{background:#2a3a52!important;text-decoration:none!important}",
  /* v3.2: the card held flat (no turn), the face left showing, the popover shown over the face. */
  HM18: '[data-hc="front"]{transform:rotate(.8deg)!important}',
  HM18b: ".mk-cgx{opacity:1!important}",
  HM18c: ".mk-pillpop{opacity:1!important}",
  HM19: ".mk-cgx .mk-fx{top:96%!important}",
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
  if (MUTATE === "HM20") await breakWording(page);
  if (MUTATE === "HM21" || MUTATE === "HM21b") {
    /* A flip under reduced motion: a visible face on the card, or the card turned about Y. */
    const face = MUTATE === "HM21";
    await page.addInitScript((face) => {
      const t = setInterval(() => {
        const front = document.querySelector<HTMLElement>('[data-hc="front"]');
        if (!front) return;
        clearInterval(t);
        if (face) { const g = document.createElement("div"); g.className = "mk-cgx"; g.setAttribute("style", "display:block!important;opacity:1"); front.appendChild(g); }
        else front.style.setProperty("transform", "rotate(.8deg) perspective(1600px) rotateY(30deg)", "important");
      }, 20);
    }, face);
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

  /* ⚠️ THE FLOOR IS .45 (Nick, 23 Oct), SO THE 12px RULE NOW HOLDS ON A 667px SCREEN TOO, AND THE CASE
     ASSERTS IT THERE RATHER THAN EXCUSING IT. Under the brief's .56 the front card ended 57px under the
     drawer at 375 × 667 and its last panel was hidden; this case is red against that build. It also
     reads the last panel itself, because "the card ends at the drawer" is a proxy for the claim that
     matters — the panel the story ends on can be seen. */
  /* REWRITTEN (v3, L2): the footer sits under the drawer's resting top and the final panel above it —
     the ref's own placement at 390 × 844 (S .73, TOP 64) leaves 3px and 1.3px, and every other size
     keeps that relationship. Read at rest, after the deal, before anything has grown. */
  test("HM1 footer: every card inside the screen; the footer under the drawer, the final panel above it", async ({ page }) => {
    const seen: string[] = [];
    for (const vp of [{ width: 390, height: 844 }, { width: 375, height: 667 }, { width: 412, height: 915 }, { width: 430, height: 932 }]) {
      await open(page, vp);
      await page.waitForTimeout(2600); // the deal is over by 1.81s
      const r = await page.evaluate(() => {
        const cards = [...document.querySelectorAll(".mk-hc-pile--phone .mk-lc")].map((e) => e.getBoundingClientRect());
        const sheet = document.querySelector(".mk-hp-sheet")!.getBoundingClientRect();
        const foot = document.querySelector('[data-hc="front"] .mk-lc-ft')!.getBoundingClientRect();
        const slot = document.querySelector('[data-hc="slot"]')!.getBoundingClientRect();
        const nav = document.querySelector(".mk-nav")!.getBoundingClientRect().bottom;
        const front = document.querySelector('[data-hc="front"]')!.getBoundingClientRect();
        return {
          frontTop: front.top - nav,
          n: cards.length, vw: document.documentElement.clientWidth,
          left: Math.min(...cards.map((c) => c.left)), right: Math.max(...cards.map((c) => c.right)),
          footBelow: foot.top - sheet.top, panelBelow: slot.bottom - sheet.top,
          scale: Number((document.querySelector(".mk-hc-pile") as HTMLElement).dataset.scale),
        };
      });
      seen.push(`${vp.width}x${vp.height}: scale ${r.scale} top ${r.frontTop.toFixed(1)} footer ${r.footBelow.toFixed(1)} panel ${r.panelBelow.toFixed(1)}`);
      console.log(`HM1 @${vp.width}x${vp.height}`, JSON.stringify(r));
      expect(r.n, "population: the front card and four behind it").toBe(5);
      expect(r.left, `@${vp.width}: nothing cut off on the left`).toBeGreaterThanOrEqual(0);
      expect(r.right, `@${vp.width}: nothing cut off on the right`).toBeLessThanOrEqual(r.vw);
      expect(r.footBelow, `@${vp.width}x${vp.height}: the footer's top is at or under the drawer's resting top`).toBeGreaterThanOrEqual(0);
      expect(r.panelBelow, `@${vp.width}x${vp.height}: the final panel is above it`).toBeLessThanOrEqual(0);
      expect(r.scale, `@${vp.width}x${vp.height}: never below the .45 floor`).toBeGreaterThanOrEqual(0.45);
      if (vp.height >= 800) {
        expect(r.frontTop, `@${vp.width}x${vp.height}: the card reaches up to within 42px of the header`).toBeLessThanOrEqual(42);
        expect(Math.max(r.left, r.vw - r.right), `@${vp.width}x${vp.height}: the pile uses the width`).toBeLessThanOrEqual(8);
      }
      await shot(page, `hm1-${vp.width}x${vp.height}`);
    }
    console.log("HM1", seen.join(" · "));
  });

  test("HM2 drawer: the travel brings the sheet to the header, square, over a sticky hero", async ({ page }) => {
    await open(page, { width: 390, height: 844 });
    await page.waitForTimeout(800);
    /* The drawer's resting height is at least 250 and grows on a tall phone (24 Oct), so the travel is
       read from the page: the stage less the drawer as it actually rests. */
    const run = await page.evaluate(() => window.innerHeight - document.querySelector(".mk-nav")!.getBoundingClientRect().height + parseFloat(getComputedStyle(document.querySelector(".mk-hp-sheet")!).marginTop));
    expect(run, "the travel is the stage less the resting drawer").toBeGreaterThan(400);
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

  test("HM3 sign-up: it opens after the first run unscrolled, is a FoundingSignup, and never after a scroll", async ({ page }) => {
    /* REWRITTEN (v3): the drawer grows after the loop's FIRST run, ~26s in (measured), and never again. */
    test.setTimeout(240000);
    await open(page, { width: 390, height: 844 });
    await page.waitForFunction(() => document.querySelector(".mk-hp-sheet")!.classList.contains("mk-hp-sheet--grown"), null, { timeout: 120000 });
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
    /* There is no Watch again on a phone (v3): wait past the first run's own grow moment instead —
       the moment the card is dealt away, which comes 1.4s after the grow would have. */
    await page.waitForFunction(() => document.querySelector('[data-hc="front"]')!.getAnimations().some((a) => JSON.stringify((a.effect as KeyframeEffect).getKeyframes()).includes("-130%")), null, { timeout: 120000, polling: 50 });
    await page.waitForTimeout(3500);
    const s = await page.evaluate(() => ({ grown: document.querySelector(".mk-hp-sheet")!.classList.contains("mk-hp-sheet--grown"),
      vis: getComputedStyle(document.querySelector(".mk-hp-su")!).visibility }));
    console.log("HM3 scrolled first", JSON.stringify(s));
    expect(s.grown, "scrolled first: the drawer does not grow").toBe(false);
    expect(s.vis).toBe("hidden");
  });

  /* REWRITTEN (v2 P4): the number counts DOWN from the cap to the places left, never up from 0 —
     sampled through the run, every reading lies between them and none rises. */
  test("HM4 counter: counts down from 50 to 36 places left, 3 of 10 segments; no count, no number", async ({ page }) => {
    await open(page, { width: 390, height: 844 }, { count: { claimed: 14, cap: 50 } });
    const seen: number[] = [];
    for (let i = 0; i < 14; i++) {
      const t = await page.evaluate(() => document.querySelector(".mk-navpill-c em")?.textContent ?? "");
      const n = Number(/^(\d+) places left$/.exec(t)?.[1]);
      if (Number.isFinite(n)) seen.push(n);
      await page.waitForTimeout(150);
    }
    console.log("HM4 run", seen.join(" "));
    expect(seen.length, "population: the counter was read through its run").toBeGreaterThan(8);
    expect(seen[0], "it starts at the cap, or on its way down from it").toBeGreaterThan(36);
    for (let i = 1; i < seen.length; i++) expect(seen[i], `reading ${i} never rises`).toBeLessThanOrEqual(seen[i - 1]);
    expect(Math.min(...seen), "and never goes below the places left").toBeGreaterThanOrEqual(36);
    await page.waitForTimeout(600); // the count is over by 2.0s
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
        again: document.querySelectorAll(".mk-hp .mk-again").length,
        footBelow: document.querySelector('[data-hc="front"] .mk-lc-ft')!.getBoundingClientRect().top - document.querySelector(".mk-hp-sheet")!.getBoundingClientRect().top,
        running: hp.getAnimations({ subtree: true }).filter((a) => a.playState === "running").length,
        /* v3 L6 (+ v3.1 C3/C6): the front card's title, the 15-pages chip and profile heads; no chips, no popover */
        titles: [...hp.querySelectorAll(".mk-hc-pile--phone .mk-lc-ms b")].map((b) => b.textContent),
        heads: [...hp.querySelectorAll(".mk-hc-pile--phone .mk-lc-agent .mk-lc-disc")].map((d) => !!d.querySelector("svg") && (d.textContent ?? "").trim() === ""),
        pages: [...hp.querySelectorAll('[data-hc="steps"] .mk-lc-step')][0]?.querySelectorAll(".mk-lc-att > span")[2]?.textContent ?? null,
        pills: hp.querySelectorAll(".mk-up, .mk-taskchip, .mk-pillpop").length,
        heroAnims: (document.querySelector(".mk-hp-hero") as HTMLElement).getAnimations().length,
      };
    });
    console.log("HM6", JSON.stringify(r));
    expect(r.titles, "population: five phone cards — the front card first in the DOM order").toHaveLength(5);
    expect([...r.titles].sort(), "the front card's title and four 'Lord of the Wings'").toEqual(["Lord of the Wings", "Lord of the Wings", "Lord of the Wings", "Lord of the Wings", "The Taloned Mr Ripley"]);
    expect(r.heads, "every phone disc is a profile head, no initials").toEqual(Array(5).fill(true));
    expect(r.pages).toBe("15 pages");
    expect(r.pills, "no chips, no popover, no floating pill").toBe(0);
    expect(r.heroAnims, "no push-and-highlight").toBe(0);
    expect(r.day).toBe("99");
    expect(r.band).toBe("With you");
    expect(r.pill).toBe("Full requested");
    expect(r.steps).toBe(5);
    expect(r.final).toBe("1");
    expect(r.grown, "the drawer arrives grown").toBe(true);
    expect(r.su).toBe("visible");
    expect(r.fly, "no fly-past").toBe("none");
    expect(r.again, "no Watch again on a phone").toBe(0);
    expect(r.footBelow, "the footer is under the drawer").toBeGreaterThanOrEqual(0);
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
    /* REWRITTEN (v2 P2): the shadow crosses while the cards are still being dealt — at 650ms, was 1500. */
    expect(r.timing).toMatchObject({ duration: 1000, delay: 650, easing: "linear", iterations: 1 });
  });

  /* ⚠️ THE REF EASES THE CARD TO .86 "SO ITS FINAL PANEL STAYS VISIBLE", AND THIS CASE HOLDS THE REASON.
     On a short phone .86 left the grown drawer over the panel (95px at the .56 floor, 60 at .45), so the
     grown scale is derived from the panel; on the ref's own screen it must still come out at .86.
     Read under reduced motion, which arrives grown with nothing moving. */
  /* REWRITTEN (v3): the ref's v3 placement puts the final panel 1.3px above the RESTING drawer at
     every size, so once the drawer rises 128px the card always has to ease back further than the ref's
     fixed .86 to keep the panel in view (the ruling) — ~.76 at 390. The ".86 where there is room" clause
     of v2's case has no screen left to hold on, and goes. */
  test("HM8 grown: the last panel stays above the drawer, and the scale never exceeds .86", async ({ page }) => {
    const seen: string[] = [];
    for (const vp of [{ width: 390, height: 844 }, { width: 375, height: 667 }, { width: 430, height: 932 }]) {
      await open(page, vp, { reduce: true });
      await page.waitForTimeout(500);
      const r = await page.evaluate(() => {
        const sheet = document.querySelector(".mk-hp-sheet")!;
        const panel = document.querySelector('[data-hc="slot"]')!.getBoundingClientRect();
        return {
          grown: sheet.classList.contains("mk-hp-sheet--grown"),
          panelBelow: panel.bottom - sheet.getBoundingClientRect().top,
          k: (document.querySelector(".mk-hp-hero") as HTMLElement).style.transform,
        };
      });
      seen.push(`${vp.width}x${vp.height}: ${r.k} panel ${r.panelBelow.toFixed(1)}`);
      console.log(`HM8 @${vp.width}x${vp.height}`, JSON.stringify(r));
      expect(r.grown, "population: the drawer is grown").toBe(true);
      expect(r.panelBelow, `@${vp.width}x${vp.height}: the last panel is above the grown drawer`).toBeLessThanOrEqual(0);
      const k = Number(/scale\(([\d.]+)\)/.exec(r.k)?.[1]);
      expect(k, `@${vp.width}x${vp.height}: never more than the ref's .86`).toBeLessThanOrEqual(0.86);
      await shot(page, `hm8-${vp.width}x${vp.height}`);
    }
    console.log("HM8", seen.join(" · "));
  });

  /* ═════ v3 ═════ */
  /* REWRITTEN (v3.1, C3): the FRONT card is "The Taloned Mr Ripley"; the back cards stay "Lord of the Wings". */
  test("HM13 copy: the front card's title, Lord of the Wings on every back card, and nothing of v2's story", async ({ page }) => {
    await open(page, { width: 390, height: 844 }, { reduce: true });
    await page.waitForTimeout(500);
    const r = await page.evaluate(() => ({
      front: document.querySelector('[data-hc="front"] .mk-lc-ms b')?.textContent,
      backs: [...document.querySelectorAll(".mk-hc-pile--phone .mk-lc")].filter((c) => c.getAttribute("data-hc") !== "front").map((c) => c.querySelector(".mk-lc-ms b")?.textContent),
      chip: [...document.querySelectorAll('[data-hc="steps"] .mk-lc-step')][0]?.querySelectorAll(".mk-lc-att > span")[2]?.textContent,
      html: document.querySelector(".mk-hp")!.outerHTML,
    }));
    /* (v3.1: the sample switcher's classes are live again — in the popover — so they leave this list.) */
    const gone = ["Who are you querying?", "Logging query…", "11 active queries", "Agents on file", "mk-lcd", "mk-lcq", "mk-lcf", "Record a response · ", "RECORD A RESPONSE", "Lead future queries with the opening voice"];
    const found = gone.filter((g) => r.html.includes(g));
    console.log("HM13", JSON.stringify({ front: r.front, backs: r.backs, chip: r.chip, found }));
    expect(r.front, "the front card's manuscript").toBe("The Taloned Mr Ripley");
    expect(r.backs, "population: four back cards, each 'Lord of the Wings'").toEqual(Array(4).fill("Lord of the Wings"));
    expect(r.chip).toBe("15 pages");
    expect(found, "nothing of v2's story in the rendered phone hero").toEqual([]);
  });

  /* One recorded run of the loop at a width: every status tag, with its line, as it settles and as it
     goes; the card's out-sweep and the Day it opens on next; and every change to the drawer's grown class. */
  type Rec = {
    tags: { cls: string; text: string; createdAt: number; shownAt: number | null; goneAt: number | null; tag: number[] | null; lineIdx: number; inAtt: boolean }[];
    floating: number; pop: { shownAt: number | null; gap: number | null; goneAt: number | null; typeAt: number | null; opAtType: number | null };
    out: number | null; after: { t: number; day: string; op: number; band: string }[]; grownEvents: string[]; vw: number; vh: number;
  };
  const RECORDER = () => {
    const R: Rec = { tags: [], floating: 0, pop: { shownAt: null, gap: null, goneAt: null, typeAt: null, opAtType: null }, out: null, after: [], grownEvents: [], vw: innerWidth, vh: innerHeight };
    (window as unknown as { __hm3: Rec }).__hm3 = R;
    const seen = new Map<Element, Rec["tags"][number]>();
    let lastGrown: boolean | null = null;
    setInterval(() => {
      const t = document.timeline.currentTime as number;
      const front = document.querySelector<HTMLElement>('[data-hc="front"]'), sheet = document.querySelector(".mk-hp-sheet");
      if (!front || !sheet) return;
      const grown = sheet.classList.contains("mk-hp-sheet--grown");
      if (grown !== lastGrown) { if (lastGrown !== null || grown) R.grownEvents.push(grown ? "grow" : "shrink"); lastGrown = grown; }
      const steps = [...document.querySelectorAll<HTMLElement>('[data-hc="steps"] .mk-lc-step')];
      R.floating = Math.max(R.floating, document.querySelectorAll(".mk-up").length);
      /* The popover: its gap below the pill once fully in, the moment it is gone, and the moment the
         Partial requested line's first letter appears. */
      const pop = front.querySelector<HTMLElement>(".mk-pillpop"), pill = document.querySelector('[data-hc="pill"]');
      if (pop && pill) {
        const op = +getComputedStyle(pop).opacity;
        if (R.pop.shownAt === null && op > .99) { R.pop.shownAt = t; R.pop.gap = pop.getBoundingClientRect().top - pill.getBoundingClientRect().bottom; }
        if (R.pop.shownAt !== null && R.pop.goneAt === null && op < .05) R.pop.goneAt = t;
      }
      const ch = steps[1]?.querySelector<HTMLElement>(".mk-lc-t span");
      if (R.pop.shownAt !== null && R.pop.typeAt === null && ch && +getComputedStyle(ch).opacity > 0) {
        R.pop.typeAt = t; R.pop.opAtType = pop ? +getComputedStyle(pop).opacity : 0; // read on the SAME sample
      }
      document.querySelectorAll<HTMLElement>(".mk-taskchip, .mk-up").forEach((g) => {
        let rec = seen.get(g);
        if (!rec) { rec = { cls: g.className, text: g.textContent ?? "", createdAt: t, shownAt: null, goneAt: null, tag: null, lineIdx: steps.indexOf(g.closest<HTMLElement>(".mk-lc-step")!), inAtt: !!g.parentElement?.matches(".mk-lc-att") }; seen.set(g, rec); R.tags.push(rec); }
        const op = +getComputedStyle(g).opacity;
        if (rec.shownAt === null && op > .99) { rec.shownAt = t; const b = g.getBoundingClientRect(); rec.tag = [b.left, b.top, b.right, b.bottom]; }
        if (rec.shownAt !== null && rec.goneAt === null && op < .05) rec.goneAt = t;
      });
      for (const [g, rec] of seen) if (rec.shownAt !== null && rec.goneAt === null && !g.isConnected) rec.goneAt = t;
      if (R.out === null) for (const a of front.getAnimations()) {
        if (JSON.stringify((a.effect as KeyframeEffect).getKeyframes()).includes("-130%") && a.startTime != null) R.out = (a.startTime as number) + (a.effect!.getTiming().delay as number);
      }
      if (R.out !== null && t > R.out && t < R.out + 4000) R.after.push({ t, day: document.querySelector('[data-hc="day"]')?.getAttribute("data-n") ?? "", op: +getComputedStyle(front).opacity, band: document.querySelector('[data-hc="bandt"]')?.textContent ?? "" });
    }, 50);
  };
  async function record(page: Page, vp: { width: number; height: number }, ms: number) {
    await page.addInitScript(RECORDER);
    await open(page, vp);
    await page.waitForTimeout(ms);
    return page.evaluate(() => (window as unknown as { __hm3: Rec }).__hm3);
  }

  /* REWRITTEN (v3.1, C1): the notes are chips in their own line's chip row, never a floating pill. */
  test("HM14 chips: inside their own line's chip row, inside the screen, gone in 3.5s; no floating pill", async ({ page }) => {
    test.setTimeout(240000);
    let k0 = 0;
    for (const vp of [{ width: 390, height: 844 }, { width: 375, height: 667 }]) {
      const r = await record(page, vp, 37000); // v3.2: the two flips make a run ~33s
      console.log(`HM14 @${vp.width}`, JSON.stringify({ floating: r.floating, chips: r.tags.map((x) => ({ text: x.text, line: x.lineIdx, inAtt: x.inAtt, tag: x.tag?.map((v) => +v.toFixed(1)), held: x.goneAt && x.shownAt ? Math.round(x.goneAt - x.shownAt) : null })) }));
      /* The first run only: by 37s the loop's second run may have made its own. */
      expect(r.out, `@${vp.width}: population — the first run ended`).not.toBeNull();
      const first = r.tags.filter((x) => x.createdAt < r.out!);
      const want: [string, number][] = [["Task created", 1], ["Task complete", 2], ["Reminder set", 3]];
      expect(first.map((x) => x.text), `@${vp.width}: population — the three chips, in order, and nothing else`).toEqual(want.map((w) => w[0]));
      expect(r.floating, `@${vp.width}: no floating pill element at any moment`).toBe(0);
      first.forEach((x, k) => {
        expect(x.cls, `@${vp.width}: "${x.text}" is a task chip`).toContain("mk-taskchip");
        expect(x.inAtt && x.lineIdx === want[k][1], `@${vp.width}: "${x.text}" sits in line ${want[k][1]}'s chip row (found line ${x.lineIdx}, in row ${x.inAtt})`).toBe(true);
        expect(x.tag, `@${vp.width}: "${x.text}" was shown`).toBeTruthy();
        const [l, tp, rt, bt] = x.tag!;
        expect(l >= 0 && tp >= 0 && rt <= r.vw && bt <= r.vh, `@${vp.width}: "${x.text}" wholly inside the screen ${JSON.stringify(x.tag)}`).toBe(true);
        expect(x.goneAt, `@${vp.width}: "${x.text}" went`).not.toBeNull();
        expect(x.goneAt! - x.shownAt!, `@${vp.width}: "${x.text}" gone within 3.5s`).toBeLessThanOrEqual(3500);
      });
      if (k0++ === 0) expect(first.map((x) => x.cls.includes("--done")), "only Task complete is the sage chip").toEqual([false, true, false]);
    }
  });

  test("HM16 popover: it drops from the status pill and is gone before Partial requested types", async ({ page }) => {
    /* v3.2: the label names the agent — HM20 sweeps the run for it; this case keeps the geometry. */
    test.setTimeout(120000);
    const r = await record(page, { width: 390, height: 844 }, 16000); // v3.2: the partial's flip comes first
    console.log("HM16", JSON.stringify(r.pop));
    expect(r.pop.shownAt, "population: the popover came in").not.toBeNull();
    expect(r.pop.gap!, "its top is below the pill").toBeGreaterThanOrEqual(0);
    expect(r.pop.gap!, "within 16px of it").toBeLessThanOrEqual(16);
    expect(r.pop.goneAt, "it went").not.toBeNull();
    expect(r.pop.typeAt, "population: the line typed in").not.toBeNull();
    /* Read on the sample that first sees a letter, so two 50ms-sampled times are never compared. */
    expect(r.pop.opAtType!, "already gone when the first letter of Partial requested appears").toBeLessThan(.05);
  });

  test("HM17 buttons: Join is ink navy; See how it works is an underlined link with no fill", async ({ page }) => {
    await open(page, { width: 390, height: 844 }, { reduce: true }); // the drawer arrives grown
    await page.waitForTimeout(500);
    const r = await page.evaluate(() => {
      const join = document.querySelector<HTMLElement>(".mk-hp-suform .mk-btn")!, how = document.querySelector<HTMLElement>(".mk-hp-how")!;
      const j = getComputedStyle(join), h = getComputedStyle(how);
      return { joinText: join.textContent?.trim(), joinBg: j.backgroundColor, joinFg: j.color, howBg: h.backgroundColor, howLine: h.textDecorationLine, howHref: how.getAttribute("href"), howChevron: !!how.querySelector("svg") };
    });
    console.log("HM17", JSON.stringify(r));
    expect(r.joinText, "population: the drawer's Join").toBe("Join");
    expect(r.joinBg).toBe("rgb(42, 58, 82)");
    expect(r.joinFg).toBe("rgb(255, 255, 255)");
    expect(r.howBg, "See how it works has no fill").toBe("rgba(0, 0, 0, 0)");
    expect(r.howLine, "and is underlined").toContain("underline");
    expect(r.howHref, "still a jump to the status band").toBe("#pulse");
    expect(r.howChevron, "with its chevron").toBe(true);
  });

  test("HM15 loop: the card leaves, a fresh one opens on Day 1 within 2s, and the drawer grows once", async ({ page }) => {
    test.setTimeout(240000);
    const r = await record(page, { width: 390, height: 844 }, 60000); // two runs of the loop
    const fresh = r.after.find((x) => x.day === "1" && x.op > .9);
    console.log("HM15", JSON.stringify({ out: r.out, fresh, grownEvents: r.grownEvents, samples: r.after.length }));
    expect(r.out, "population: the card was dealt away").not.toBeNull();
    expect(r.after.length, "population: the hand-over was sampled").toBeGreaterThan(20);
    expect(fresh, "a fresh card reads Day 1").toBeTruthy();
    expect(fresh!.t - r.out!, "within 2s of the card leaving").toBeLessThanOrEqual(2000);
    expect(fresh!.band).toBe("With the agent");
    expect(r.grownEvents, "the drawer grows once, after the first run, and stays grown").toEqual(["grow"]);
  });

  /* ── v3.2: the flip ─────────────────────────────────────────────────────────────────────────────
     One frame-by-frame recording of the card's first run: its turn about Y (from the computed matrix:
     θ = atan2(−m13, m11), the rest rotation of .8° about Z being too small to matter), the face's and
     the popover's opacity, the day, each face's band, the moment "Partial requested" and "Full
     requested" type their first letter, and the confetti against the face's title. */
  type Frame = [t: number, theta: number, face: number, pop: number, day: string];
  type FlipRec = {
    frames: Frame[]; bands: string[]; partialAt: number | null; fullAt: number | null; out: number | null;
    fx: { frames: number; pieces: number; worst: number | null; worstAt: number | null };
  };
  const FLIP_RECORDER = () => {
    const R: FlipRec = { frames: [], bands: [], partialAt: null, fullAt: null, out: null, fx: { frames: 0, pieces: 0, worst: null, worstAt: null } };
    (window as unknown as { __hf: FlipRec }).__hf = R;
    let started = false;
    const loop = () => {
      const t = document.timeline.currentTime as number;
      const front = document.querySelector<HTMLElement>('[data-hc="front"]');
      if (front) {
        const m = new DOMMatrix(getComputedStyle(front).transform);
        const theta = Math.atan2(-m.m13, m.m11) * 180 / Math.PI;
        const g = front.querySelector<HTMLElement>(".mk-cgx"), pop = front.querySelector<HTMLElement>(".mk-pillpop");
        const face = g ? +getComputedStyle(g).opacity : 0, pp = pop ? +getComputedStyle(pop).opacity : 0;
        R.frames.push([Math.round(t), +theta.toFixed(1), +face.toFixed(2), +pp.toFixed(2), document.querySelector('[data-hc="day"]')?.getAttribute("data-n") ?? ""]);
        if (g && face > .5) {
          const b = g.querySelector(".mk-cgx-band")?.textContent ?? "";
          if (R.bands[R.bands.length - 1] !== b) R.bands.push(b);
          const title = g.querySelector<HTMLElement>(".mk-cgx-t");
          const fx = [...g.querySelectorAll<HTMLElement>(".mk-fx")].filter((f) => +getComputedStyle(f).opacity > 0);
          if (title && fx.length) {
            R.fx.frames++; R.fx.pieces = Math.max(R.fx.pieces, fx.length);
            const top = title.getBoundingClientRect().top;
            for (const f of fx) { const r = f.getBoundingClientRect(), d = (r.top + r.bottom) / 2 - top; if (R.fx.worst === null || d > R.fx.worst) { R.fx.worst = d; R.fx.worstAt = Math.round(t); } }
          }
        }
        const steps = [...front.querySelectorAll<HTMLElement>(".mk-lc-step")];
        const typed = (k: string) => { const st = steps.find((x) => (x.textContent ?? "").startsWith(k)); const c = st?.querySelector<HTMLElement>(".mk-lc-t span"); return !!c && +getComputedStyle(c).opacity > 0; };
        /* The card mounts on its finished state (Day 99, every line typed) for a few frames before the
           story starts, so a line counts as typing only once the story has opened on Day 1. */
        if (R.frames[R.frames.length - 1][4] === "1") started = true;
        if (started && R.partialAt === null && typed("Partial requested")) R.partialAt = Math.round(t);
        if (started && R.fullAt === null && typed("Full requested")) R.fullAt = Math.round(t);
        if (R.out === null) for (const a of front.getAnimations()) if (JSON.stringify((a.effect as KeyframeEffect).getKeyframes()).includes("-130%") && a.startTime != null) R.out = (a.startTime as number) + (a.effect!.getTiming().delay as number);
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  };
  async function recordFlip(page: Page, ms: number) {
    await page.addInitScript(FLIP_RECORDER);
    await open(page, { width: 390, height: 844 });
    await page.waitForTimeout(ms);
    return page.evaluate(() => (window as unknown as { __hf: FlipRec }).__hf);
  }
  /* The face's showings: contiguous runs of frames with the face more than half in. */
  const episodes = (fr: Frame[]) => {
    const eps: { start: number; end: number; i0: number; i1: number; day: string }[] = [];
    fr.forEach((f, i) => {
      const on = f[2] > .5, last = eps[eps.length - 1];
      if (on && (!last || last.i1 !== i - 1)) eps.push({ start: f[0], end: f[0], i0: i, i1: i, day: f[4] });
      else if (on) { last.end = f[0]; last.i1 = i; }
    });
    return eps;
  };
  /* The turn passes edge-on when two neighbouring frames sit on opposite sides of it: one past +45°,
     the next past −45° (or the reverse). Going through 0° instead would need the small angles between. */
  const passesEdgeOn = (fr: Frame[], from: number, to: number) => {
    for (let i = Math.max(1, from); i <= Math.min(fr.length - 1, to); i++) {
      const a = fr[i - 1][1], b = fr[i][1];
      if (fr[i][0] - fr[i - 1][0] < 80 && ((a > 45 && b < -45) || (a < -45 && b > 45))) return [a, b];
    }
    return null;
  };

  test("HM18 flip: the face shows twice, at Day 36 and Day 99, turning through edge-on; never over the popover", async ({ page }) => {
    test.setTimeout(180000);
    const r = await recordFlip(page, 36000);
    const eps = episodes(r.frames).filter((e) => r.out === null || e.start < r.out);
    const popOn = r.frames.find((f) => f[3] > .05)?.[0] ?? null;
    const both = r.frames.filter((f) => f[2] > .05 && f[3] > .05);
    const turns = eps.map((e) => ({ day: e.day, in: passesEdgeOn(r.frames, e.i0 - 30, e.i0 + 3), out: passesEdgeOn(r.frames, e.i1 - 3, e.i1 + 30) }));
    console.log("HM18", JSON.stringify({ frames: r.frames.length, out: r.out, eps: eps.map(({ start, end, day }) => ({ start, end, day })), bands: r.bands, turns, popOn, both: both.length, partialAt: r.partialAt, fullAt: r.fullAt }));
    expect(r.frames.length, "population: the card was sampled every frame").toBeGreaterThan(1200);
    expect(r.out, "population: the first run ended").not.toBeNull();
    expect(eps.map((e) => e.day), "the face shows exactly twice in a run, at Day 36 and Day 99").toEqual(["36", "99"]);
    expect(r.bands, "its band names the request and the day").toEqual(["Partial requestedDay 36", "Full requestedDay 99"]);
    turns.forEach((x) => {
      expect(x.in, `Day ${x.day}: the card turns in through edge-on (rotateY passes ±90°)`).not.toBeNull();
      expect(x.out, `Day ${x.day}: and back out through it`).not.toBeNull();
    });
    expect(both.length, "the popover is never visible while the face is").toBe(0);
    expect(popOn, "population: the popover opened").not.toBeNull();
    expect(eps[0].end, "the partial's face is gone before the popover opens").toBeLessThan(popOn!);
    expect(r.partialAt, "population: Partial requested typed, after the partial's face").toBeGreaterThan(eps[0].end);
    expect(r.fullAt, "population: Full requested typed").not.toBeNull();
    expect(eps[1].end, "the full's face is gone before Full requested types").toBeLessThan(r.fullAt!);
    expect(r.frames.find((f) => f[0] >= r.fullAt!)![2], "and is still gone on the frame its first letter appears").toBeLessThan(.05);
  });

  test("HM19 confetti: every piece's centre stays above the face's title", async ({ page }) => {
    test.setTimeout(180000);
    const r = await recordFlip(page, 30000);
    console.log("HM19", JSON.stringify(r.fx));
    expect(r.fx.frames, "population: frames with confetti in the air").toBeGreaterThan(20);
    expect(r.fx.pieces, "population: the burst is 18 pieces").toBe(18);
    expect(r.fx.worst!, "the lowest piece's centre is still above the title's top edge").toBeLessThan(0);
  });

  test("HM20 wording: no she or he anywhere on the card across a run; the popover reads Eleanor asked for", async ({ page }) => {
    test.setTimeout(180000);
    await page.addInitScript(WORDING_RECORDER);
    await open(page, { width: 390, height: 844 });
    await page.waitForTimeout(36000);
    const r = await page.evaluate(() => (window as unknown as { __hw: WordingRec }).__hw);
    const hits = pronounHits(r.texts);
    console.log("HM20", JSON.stringify({ frames: r.frames, distinct: r.texts.length, labels: r.labels, faces: r.texts.filter((t) => t.includes("wants")).map((t) => t.match(/[A-Z][a-z ]+ wants[^|]*/)?.[0]).filter((x, i, a) => a.indexOf(x) === i), hits }));
    expect(r.frames, "population: a whole run sampled").toBeGreaterThan(1200);
    expect(r.texts.some((t) => t.includes("Full requested")), "population: the run reached Full requested").toBe(true);
    expect(r.texts.some((t) => t.includes("wants the full!")), "population: the full's face was read").toBe(true);
    expect(hits, "no she/he/her/him on the card at any frame").toEqual([]);
    expect(r.labels, "the popover names the agent").toEqual(["Eleanor asked for"]);
  });

  test("HM21 reduced motion: no flip — no visible face, and the card stays flat", async ({ page }) => {
    test.setTimeout(60000);
    await open(page, { width: 390, height: 844 }, { reduce: true });
    const r = await page.evaluate(() => new Promise<{ frames: number; faces: number; turned: number }>((done) => {
      const R = { frames: 0, faces: 0, turned: 0 }, t0 = performance.now();
      const loop = () => {
        const front = document.querySelector<HTMLElement>('[data-hc="front"]');
        if (front) {
          R.frames++;
          document.querySelectorAll<HTMLElement>(".mk-cgx").forEach((g) => { const c = getComputedStyle(g); if (c.display !== "none" && +c.opacity > 0) R.faces++; });
          if (!new DOMMatrix(getComputedStyle(front).transform).is2D) R.turned++;
        }
        if (performance.now() - t0 < 8000) requestAnimationFrame(loop); else done(R);
      };
      requestAnimationFrame(loop);
    }));
    console.log("HM21", JSON.stringify(r));
    expect(r.frames, "population: the card was sampled").toBeGreaterThan(200);
    expect(r.faces, "no frame shows a face").toBe(0);
    expect(r.turned, "no frame turns the card about Y").toBe(0);
  });
});
