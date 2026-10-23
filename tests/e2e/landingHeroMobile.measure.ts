/**
 * The landing hero on phones (23 Oct, ref design-refs/landing-hero-mobile-v1.html) — the rendered locks.
 *
 *   HM1  fit: at 390 × 844, 375 × 667 and 430 × 932 the front card and all four behind it are inside the
 *        viewport horizontally, the front card ends no more than 12px below the drawer's resting top, and
 *        its last panel (where the story ends) is wholly above the drawer — on all three screens
 *   HM2  drawer: scrolling the drawer's travel brings the sheet's top to the header's foot with a 0px
 *        radius, and the hero is still in the DOM, sticky, behind it
 *   HM3  sign-up: with the story run to its end and no scroll, the sign-up shows and is a FoundingSignup
 *        (its field carries that component's label); scrolled first, it never appears
 *   HM4  counter: a stubbed count of 14 of 50 reads "36 places left" with 3 of 10 segments; no count, no number
 *   HM5  copy: "No more winging it." is on the rendered page exactly once, at 390 and at 1440
 *   HM6  reduced motion (phones): the static end state, the drawer grown, nothing animating, no fly-past
 *   HM7  phones draw no cast shadow; the fly-past is the versioned file, flown once along its curve
 *   HM8  with the drawer grown, the card's last panel is still above it, the scale never exceeds the
 *        ref's .86 and is .86 wherever the panel has room
 *  v2 (ref design-refs/landing-hero-mobile-v2.html) — one recorded run of the whole story per width:
 *   HM9  no flicker: across the agent pick the row is never invisible, and from the end of the slide to
 *        400ms after the land its disc never moves more than 1px, nor its name's size 0.5px, between
 *        50ms samples — and the list's row and the card's row agree at the hand-over
 *   HM10 band: before "Log query" the band reads "Logging query…" and the pill is hidden; 300ms after
 *        the press it reads "With the agent", and the pill shows "Queried" once its stamp lands
 *   HM11 pills: the six pills, in order, each settled ≥14px inside every edge at 390 and 375 wide;
 *        Partial sent raises none
 *   HM12 zoom: the push-and-highlight runs for Query sent, Partial requested and Full requested only
 *   HM13 copy: "Your manuscript" on every phone card, the Query sent chip "15 pages", and "Lead future
 *        queries with the opening voice" nowhere
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
  HM9: '.mk-lcq-p .mk-lc-nm{font-size:19px!important}',
  HM9b: '[data-hc="agent"]{visibility:hidden!important}',
  HM10: '[data-hc="pill"]{opacity:1!important}',
  HM11: ".mk-up{right:6px!important}",
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

  /* ⚠️ THE FLOOR IS .45 (Nick, 23 Oct), SO THE 12px RULE NOW HOLDS ON A 667px SCREEN TOO, AND THE CASE
     ASSERTS IT THERE RATHER THAN EXCUSING IT. Under the brief's .56 the front card ended 57px under the
     drawer at 375 × 667 and its last panel was hidden; this case is red against that build. It also
     reads the last panel itself, because "the card ends at the drawer" is a proxy for the claim that
     matters — the panel the story ends on can be seen. */
  test("HM1 fit: every card inside the width; the front card ends at the drawer; its last panel above it", async ({ page }) => {
    const seen: string[] = [];
    let held = 0;
    for (const vp of [{ width: 390, height: 844 }, { width: 375, height: 667 }, { width: 430, height: 932 }]) {
      await open(page, vp);
      await page.waitForTimeout(2600); // the deal is over by 1.81s
      const r = await page.evaluate(() => {
        const cards = [...document.querySelectorAll(".mk-hc-pile--phone .mk-lc")].map((e) => e.getBoundingClientRect());
        const front = document.querySelector('[data-hc="front"]')!.getBoundingClientRect();
        const sheet = document.querySelector(".mk-hp-sheet")!.getBoundingClientRect();
        const panel = document.querySelector('[data-hc="slot"]')!.getBoundingClientRect();
        return {
          n: cards.length, vw: document.documentElement.clientWidth,
          left: Math.min(...cards.map((c) => c.left)), right: Math.max(...cards.map((c) => c.right)),
          below: front.bottom - sheet.top, panelBelow: panel.bottom - sheet.top, scale: Number((document.querySelector(".mk-hc-pile") as HTMLElement).dataset.scale),
        };
      });
      seen.push(`${vp.width}x${vp.height}: scale ${r.scale} below ${r.below.toFixed(1)} panel ${r.panelBelow.toFixed(1)}`);
      console.log(`HM1 @${vp.width}x${vp.height}`, JSON.stringify(r));
      expect(r.n, "population: the front card and four behind it").toBe(5);
      expect(r.left, `@${vp.width}: nothing cut off on the left`).toBeGreaterThanOrEqual(0);
      expect(r.right, `@${vp.width}: nothing cut off on the right`).toBeLessThanOrEqual(r.vw);
      if (r.below <= 12) held++;
      expect(r.below, `@${vp.width}x${vp.height}: the front card ends at the drawer`).toBeLessThanOrEqual(12);
      expect(r.panelBelow, `@${vp.width}x${vp.height}: the last panel is above the drawer`).toBeLessThanOrEqual(0);
      expect(r.scale, `@${vp.width}x${vp.height}: never below the .45 floor`).toBeGreaterThanOrEqual(0.45);
      await shot(page, `hm1-${vp.width}x${vp.height}`);
    }
    console.log("HM1", seen.join(" · "), `· held ${held}`);
    expect(held, "population: all three screens measured and held").toBe(3);
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
    /* REWRITTEN (v2): the story now opens on the dashboard and logs the query on the card, so it runs
       ~59s to the grow (measured) where v1's ran ~30. The 60s wait raced it. */
    test.setTimeout(330000);
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
    await page.waitForFunction(() => document.querySelector(".mk-again")!.classList.contains("mk-again--on"), null, { timeout: 120000 });
    await page.waitForTimeout(2200); // the grow is due 0.6s after Watch again
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
        again: getComputedStyle(document.querySelector(".mk-again")!).display,
        running: hp.getAnimations({ subtree: true }).filter((a) => a.playState === "running").length,
        /* v2 P6: "Your manuscript", the 15-pages chip and profile heads; no dashboard, forms, pills or zooms */
        titles: [...hp.querySelectorAll(".mk-hc-pile--phone .mk-lc-ms b")].map((b) => b.textContent),
        heads: [...hp.querySelectorAll(".mk-hc-pile--phone .mk-lc-agent .mk-lc-disc")].map((d) => !!d.querySelector("svg") && (d.textContent ?? "").trim() === ""),
        pages: [...hp.querySelectorAll('[data-hc="steps"] .mk-lc-step')][0]?.querySelectorAll(".mk-lc-att > span")[2]?.textContent ?? null,
        overlays: ['[data-hc="lcd"]', '[data-hc="lcq"]', '[data-hc="lcf"]', '[data-hc="lr"]'].map((q) => getComputedStyle(document.querySelector(q)!).opacity),
        pills: hp.querySelectorAll(".mk-up").length,
        heroAnims: (document.querySelector(".mk-hp-hero") as HTMLElement).getAnimations().length,
      };
    });
    console.log("HM6", JSON.stringify(r));
    expect(r.titles, "population: five phone cards, each 'Your manuscript'").toEqual(Array(5).fill("Your manuscript"));
    expect(r.heads, "every phone disc is a profile head, no initials").toEqual(Array(5).fill(true));
    expect(r.pages).toBe("15 pages");
    expect(r.overlays, "no dashboard, agent list, query form or response form").toEqual(["0", "0", "0", "0"]);
    expect(r.pills, "no status pills").toBe(0);
    expect(r.heroAnims, "no push-and-highlight").toBe(0);
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
    /* REWRITTEN (v2 P2): the shadow crosses while the cards are still being dealt — at 650ms, was 1500. */
    expect(r.timing).toMatchObject({ duration: 1000, delay: 650, easing: "linear", iterations: 1 });
  });

  /* ⚠️ THE REF EASES THE CARD TO .86 "SO ITS FINAL PANEL STAYS VISIBLE", AND THIS CASE HOLDS THE REASON.
     On a short phone .86 left the grown drawer over the panel (95px at the .56 floor, 60 at .45), so the
     grown scale is derived from the panel; on the ref's own screen it must still come out at .86.
     Read under reduced motion, which arrives grown with nothing moving. */
  /* REWRITTEN (v2): v2's roomier manuscript block makes the card 8px taller, so on the ref's own
     390 × 844 the ref's fixed .86 would leave the last panel 3.8px under the grown drawer (measured on
     the v2 ref). The ruling is the panel, so the grown scale is derived — 0.847 there — and this case
     holds the RULE: the panel is above the drawer, the scale never exceeds the ref's .86, and it IS
     .86 wherever the panel has the room (430 × 932). */
  test("HM8 grown: the last panel stays above the drawer; the scale is .86 where it has room, never more", async ({ page }) => {
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
      if (vp.width === 430) expect(r.k, "with room for the panel the grown scale is the ref's").toBe("scale(0.86)");
      await shot(page, `hm8-${vp.width}x${vp.height}`);
    }
    console.log("HM8", seen.join(" · "));
  });

  /* ═════ v2: one recorded run of the whole story per width ═════
     The recorder goes in before the page loads and samples every 50ms: the visible agent row (the
     list's while it is over the card, the card's once it shows), the band and the status pill, every
     status pill box once settled (opacity exactly 1, i.e. after its slide-in and before its exit), and
     each push-and-highlight with the line it is on. The run ends at the grow. */
  type Run = {
    schedule: Record<string, { start: number; end: number }>;
    rows: { t: number; vis: string | null; x: number; y: number; fs: number; h: number }[];
    hand: { list: number[]; card: number[] } | null;
    band: { t: number; band: string; pillOp: number; pill: string }[];
    pills: { text: string; created: number; settled: { l: number; r: number; t: number; b: number } | null }[];
    zooms: number[]; vw: number; vh: number;
  };
  const RECORDER = () => {
    const w = window as unknown as { __hm: Run };
    const R: Run = { schedule: {}, rows: [], hand: null, band: [], pills: [], zooms: [], vw: innerWidth, vh: innerHeight };
    w.__hm = R;
    const q = (s: string) => document.querySelector<HTMLElement>(s);
    const op = (el: Element) => +getComputedStyle(el).opacity;
    /* a scheduled animation's window, found by a fragment of its keyframes */
    const note = (key: string, el: HTMLElement | null, frag: string) => {
      if (!el || R.schedule[key]) return;
      for (const a of el.getAnimations()) {
        const tm = a.effect!.getTiming(), kf = JSON.stringify((a.effect as KeyframeEffect).getKeyframes());
        if (kf.includes(frag) && a.startTime != null) { const st = (a.startTime as number) + (tm.delay as number); R.schedule[key] = { start: st, end: st + (tm.duration as number) }; return; }
      }
    };
    const seen = new Map<Element, Run["pills"][number]>();
    setInterval(() => {
      const t = document.timeline.currentTime as number;
      const ag = q('[data-hc="agent"]'), ew = q('[data-hc="lcq-pick"]'), pick = q('[data-hc="lcq"]');
      note("tap", ew, "0.86"); note("slide", ew, "translate("); note("land", ag, '"opacity":"1"'); /* getKeyframes() hands values back as strings */ note("go", q('[data-hc="lcf-go"]'), "0.86");
      if (ag && ew && pick) {
        const agVis = op(ag) >= .5 && getComputedStyle(ag).visibility !== "hidden", listVis = op(pick) * op(ew) >= .5;
        const vis = agVis ? ag : listVis ? ew : null;
        const d = vis?.querySelector(".mk-lc-disc")?.getBoundingClientRect(), nm = vis?.querySelector<HTMLElement>(".mk-lc-nm");
        R.rows.push({ t, vis: vis === ag ? "card" : vis === ew ? "list" : null, x: d?.left ?? NaN, y: d?.top ?? NaN, fs: nm ? parseFloat(getComputedStyle(nm).fontSize) : NaN, h: nm?.getBoundingClientRect().height ?? NaN });
        const sl = R.schedule.slide;
        if (!R.hand && sl && t > sl.end + 20) {
          const a = ag.querySelector(".mk-lc-disc")!.getBoundingClientRect(), b = ew.querySelector(".mk-lc-disc")!.getBoundingClientRect();
          const an = ag.querySelector<HTMLElement>(".mk-lc-nm")!, bn = ew.querySelector<HTMLElement>(".mk-lc-nm")!;
          R.hand = { list: [b.left, b.top, parseFloat(getComputedStyle(bn).fontSize), bn.getBoundingClientRect().height], card: [a.left, a.top, parseFloat(getComputedStyle(an).fontSize), an.getBoundingClientRect().height] };
        }
      }
      const bandT = q('[data-hc="bandt"]'), pill = q('[data-hc="pill"]');
      if (bandT && pill) R.band.push({ t, band: bandT.textContent ?? "", pillOp: op(pill), pill: (pill.textContent ?? "").trim() });
      document.querySelectorAll<HTMLElement>(".mk-up").forEach((g) => {
        let rec = seen.get(g);
        if (!rec) { rec = { text: g.textContent ?? "", created: t, settled: null }; seen.set(g, rec); R.pills.push(rec); }
        if (!rec.settled && getComputedStyle(g).opacity === "1") { const b = g.getBoundingClientRect(); rec.settled = { l: b.left, r: innerWidth - b.right, t: b.top, b: innerHeight - b.bottom }; }
      });
      const hero = q(".mk-hp-hero");
      if (hero) for (const a of hero.getAnimations()) {
        const kf = JSON.stringify((a.effect as KeyframeEffect).getKeyframes());
        const id = (a as unknown as { __hm?: boolean });
        if (kf.includes('"scale":"1.2"') && !id.__hm) { id.__hm = true; R.zooms.push(Number(hero.dataset.zoom)); }
      }
    }, 50);
  };
  async function walk(page: Page, vp: { width: number; height: number }) {
    await page.addInitScript(RECORDER);
    await open(page, vp);
    await page.waitForFunction(() => document.querySelector(".mk-hp-sheet")!.classList.contains("mk-hp-sheet--grown"), null, { timeout: 150000 });
    await page.waitForTimeout(400);
    return page.evaluate(() => (window as unknown as { __hm: Run }).__hm);
  }

  test.describe("v2: the story, recorded", () => {
    let r390: Run;
    test.beforeAll(async ({ browser }) => {
      test.setTimeout(240000);
      const page = await browser.newPage({ storageState: { cookies: [], origins: [] } });
      r390 = await walk(page, { width: 390, height: 844 });
      await page.close();
    });

    test("HM9 no flicker: the picked row slides onto the card's row and hands over in one frame", async () => {
      const r = r390, s = r.schedule;
      expect(s.tap && s.slide && s.land, `population: the tap, slide and land were scheduled — ${JSON.stringify(s)}`).toBeTruthy();
      const win = r.rows.filter((x) => x.t >= s.tap.start && x.t <= s.land.start + 400);
      console.log("HM9 schedule", JSON.stringify(s), "samples", win.length, "hand", JSON.stringify(r.hand));
      expect(win.length, "population: the pick was sampled every 50ms").toBeGreaterThan(20);
      const gaps = win.filter((x) => x.vis === null);
      expect(gaps.map((x) => Math.round(x.t - s.tap.start)), "the row is never invisible").toEqual([]);
      const settle = win.filter((x) => x.t >= s.slide.end);
      expect(settle.length, "population: samples after the slide").toBeGreaterThan(5);
      expect(settle.some((x) => x.vis === "list") && settle.some((x) => x.vis === "card"), "the hand-over happens inside the window").toBe(true);
      for (let i = 1; i < settle.length; i++) {
        const a = settle[i - 1], b = settle[i];
        expect(Math.hypot(b.x - a.x, b.y - a.y), `disc jumped between ${Math.round(a.t - s.tap.start)} and ${Math.round(b.t - s.tap.start)}ms (${a.vis}→${b.vis})`).toBeLessThanOrEqual(1);
        expect(Math.abs(b.fs - a.fs), "the name's size never jumps").toBeLessThanOrEqual(0.5);
        expect(Math.abs(b.h - a.h), "nor its drawn height").toBeLessThanOrEqual(0.5);
      }
      expect(r.hand, "the two rows were read at the hand-over").toBeTruthy();
      const [L, C] = [r.hand!.list, r.hand!.card];
      expect(Math.hypot(L[0] - C[0], L[1] - C[1]), "the list's row lands exactly on the card's").toBeLessThanOrEqual(1);
      expect(Math.abs(L[2] - C[2]), "in the same type").toBeLessThanOrEqual(0.5);
    });

    test("HM10 band: Logging query… and no pill until Log query; With the agent and Queried after", async () => {
      const r = r390, go = r.schedule.go;
      expect(go, "population: the press of Log query was scheduled").toBeTruthy();
      const pressEnd = go.end;
      const before = r.band.filter((x) => x.t < go.start && x.t > go.start - 6000);
      expect(before.length, "population: the band was read before the press").toBeGreaterThan(20);
      expect([...new Set(before.map((x) => x.band))], "before the press").toEqual(["Logging query…"]);
      expect(Math.max(...before.map((x) => x.pillOp)), "the pill is hidden before the press").toBeLessThan(.05);
      const after = r.band.find((x) => x.t >= pressEnd + 300);
      console.log("HM10 300ms after the press", JSON.stringify(after));
      expect(after?.band).toBe("With the agent");
      /* The pill stamps in from the press's end + 300ms over 340ms (the ref's), so "shows" is read once it has landed. */
      const shown = r.band.find((x) => x.t >= pressEnd + 700);
      expect(shown?.pill).toBe("Queried");
      expect(shown?.pillOp).toBeGreaterThan(.95);
    });

    test("HM12 zoom: push-and-highlight for Query sent, Partial requested and Full requested only", async () => {
      console.log("HM12 zoomed lines", JSON.stringify(r390.zooms));
      expect(r390.zooms, "steps 0, 1, 4 — never Partial sent (2) or the nudge (3)").toEqual([0, 1, 4]);
    });

    test("HM11 pills: the six in order, each settled ≥14px inside the viewport, at 390 and 375; none for Partial sent", async ({ browser }) => {
      test.setTimeout(240000);
      const page = await browser.newPage({ storageState: { cookies: [], origins: [] } });
      const r375 = await walk(page, { width: 375, height: 667 });
      await page.close();
      const want = ["Query logged", "Task created", "Note added", "Task created", "Reminder set", "Task created"];
      for (const [w, r] of [["390", r390], ["375", r375]] as const) {
        console.log(`HM11 @${w}`, JSON.stringify(r.pills.map((p) => [p.text.slice(0, 26), p.settled && Object.values(p.settled).map((v) => +v.toFixed(1))])));
        expect(r.pills.map((p) => want.find((x) => p.text.startsWith(x)) ?? p.text), `@${w}: the six pills, in order — and so none for Partial sent`).toEqual(want);
        for (const p of r.pills) {
          expect(p.settled, `@${w}: "${p.text}" settled`).toBeTruthy();
          for (const [edge, v] of Object.entries(p.settled!)) expect(v, `@${w}: "${p.text.slice(0, 30)}" ${edge} edge`).toBeGreaterThanOrEqual(13.5);
        }
      }
    });
  });

  test("HM13 copy: Your manuscript on every phone card, the 15-pages chip, and no retired line", async ({ page }) => {
    await open(page, { width: 390, height: 844 }, { reduce: true });
    await page.waitForTimeout(500);
    const r = await page.evaluate(() => ({
      titles: [...document.querySelectorAll(".mk-hc-pile--phone .mk-lc-ms b")].map((b) => b.textContent),
      chip: [...document.querySelectorAll('[data-hc="steps"] .mk-lc-step')][0]?.querySelectorAll(".mk-lc-att > span")[2]?.textContent,
      retired: document.documentElement.outerHTML.includes("Lead future queries with the opening voice"),
    }));
    console.log("HM13", JSON.stringify(r));
    expect(r.titles).toEqual(Array(5).fill("Your manuscript"));
    expect(r.chip).toBe("15 pages");
    expect(r.retired).toBe(false);
  });
});
