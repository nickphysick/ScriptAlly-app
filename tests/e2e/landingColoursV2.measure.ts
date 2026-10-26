/**
 * Landing colours v2 — the public site in the app's colours. Locks LC2 N1–N3, H1, S1, V1,
 * F1–F2, T1 (K1 and C1 are unit locks, in src/marketing/marketingTokens.test.ts).
 *
 * ⚠️ H2 AND S2 ARE RETIRED BY LANDING HERO v3 (20 Oct), NOT LOOSENED. H2 held the shadow column's
 * picture to its pre-pack box and its .18 opacity; S2 held every box on the landing page to the
 * pre-pack geometry. The hero they describe is gone — the shadow is cast over a card pile now and
 * every section below the hero moved with the new hero's height — so both are claims about a page
 * that no longer exists. Their replacements are `landingHeroV3.measure.ts` (the cast shadow, the
 * hero's sizing) and N3 here, which still holds the anchor landing. H1 is re-pointed to v3's ground.
 *
 * The public pages need no sign-in, so this file opens them itself rather than through `openRoute`.
 *
 *   LC2_CAPTURE=1   write the pre-pack geometry to reports/landing-colours-v2/baseline/geometry.json
 *                   (run ONCE, against the build made before the pack's first edit)
 *   LC2_MUTATE=<n>  apply lock <n>'s named break in the page, to prove the lock goes red
 *   LC2_SHOTS=1     write the report's screenshots
 *
 * Every reading states its population first: a sweep over nothing passes, and says nothing.
 */
import { test, expect, Page } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ensureSignedIn } from "./measure";

const ROUTES = ["/", "/pricing", "/about", "/contact", "/founders", "/terms", "/privacy"];
const VPS = [
  { width: 1440, height: 900 },
  { width: 1280, height: 800 },
  { width: 390, height: 844 },
];
/** The nav's regimes: full links (1440, 1280), burger on one row (900), and — since the phone hero
 *  (23 Oct) — the 60px phone row with the founding pill (390). The 600px wrap no longer renders at
 *  any width this suite reads. */
const PHONE = 760;
const NAV_VPS = [...VPS.slice(0, 2), { width: 900, height: 800 }, VPS[2]];
const OUT = resolve("reports/landing-colours-v2");
const GEOMETRY = resolve(OUT, "baseline/geometry.json");
const CAPTURE = !!process.env.LC2_CAPTURE;
const MUTATE = process.env.LC2_MUTATE ?? "";
const SHOTS = !!process.env.LC2_SHOTS;

const INK = [27, 36, 51];

/** Each lock's named break, as a stylesheet. The two that need the DOM are applied in `mutate`. */
const MUTATIONS: Record<string, string> = {
  N1: ".mk-navwrap.mk-scrolled{background:rgba(247,244,238,.92)!important;backdrop-filter:blur(8px)!important}",
  N3: ".mk-navword{font-size:40px!important}",
  H1: ".mk-herowrap{background:#1b2433!important}",
  S1: ".mk-sheet{border-bottom-left-radius:0!important;border-bottom-right-radius:0!important}",
  V1: ".mk-vision{background-color:#ffffff!important}",
  F1: ".mk-claimcard .mk-betamsg{color:#3a1c14!important;background:none!important}",
  F2: ".mk-claimform input{color:#f4eee5!important}.mk-betanote{color:rgba(244,238,229,.62)!important}" +
      ".mk-claimnum,.mk-claimof,.mk-claimleft,.mk-fmmeta,.mk-fmtally{color:#f4eee5!important}",
  T1: ".mk-foot{border-top:1px solid #e7ddd2!important}",
  /* The phone retargets' own breaks (phone hero, 23 Oct) — each turns only the ≤760px branch red. */
  /* RETARGETED (landing on phones v1, 26 Oct): the pill is gone; the phone's founding offer is the strip. */
  N2p: ".mk-fs{background:#1b2433!important}",
  V1p: ".mk-vision.mk-vision--navy{background:#e9e6e0!important}",
  /* v3: page snapping switched off, so the phone's jump lands on the band rather than on caption 1. */
  N3s: "html:has(.mk-story){scroll-snap-type:none!important}",
  N3p: "@media (max-width:760px){.mk-scope .mk-nav{height:72px!important}}",
  H1p: ".mk-hp-stage{background:#ffffff!important}",
  S1p: ".mk-sheet{border-top-left-radius:18px!important;border-top-right-radius:18px!important}",
};

async function mutate(page: Page) {
  if (!MUTATE) return;
  const css = MUTATIONS[MUTATE];
  if (css) await page.addStyleTag({ content: css });
  if (MUTATE === "N2") {
    await page.evaluate(() => {
      const word = document.querySelector(".mk-navword");
      if (!word) return;
      const img = document.createElement("img");
      img.src = "/images/queryhawk_title.png";
      img.alt = "QueryHawk";
      img.style.height = "34px";
      word.replaceWith(img);
    });
  }
}

type Mock = "none" | "count" | "sent" | "dupe" | "full" | "error" | "down" | "hold";

/** The waitlist endpoint, answered the way the function answers. `none` leaves the SPA's HTML. */
async function mockWaitlist(page: Page, mock: Mock) {
  if (mock === "none") return;
  await page.route("**/api/waitlist", async (route) => {
    const json = (status: number, body: unknown) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (route.request().method() === "GET") return json(200, { ok: true, count: 37, cap: 100 });
    if (mock === "sent") return json(200, { ok: true, count: 38, cap: 100 });
    if (mock === "dupe") return json(200, { ok: true, alreadyJoined: true, count: 37, cap: 100 });
    if (mock === "full") return json(200, { ok: true, full: true, count: 100, cap: 100 });
    if (mock === "error") return json(500, { ok: false });
    if (mock === "down") return route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html>" });
    if (mock === "hold") { await new Promise((r) => setTimeout(r, 8000)); return json(200, { ok: true }); }
    return json(200, { ok: true, count: 37, cap: 100 });
  });
}

async function open(page: Page, route: string, vp: { width: number; height: number }, mock: Mock = "none") {
  await page.setViewportSize(vp);
  await mockWaitlist(page, mock);
  await page.goto(route, { waitUntil: "load" });
  await page.waitForSelector(".mk-navwrap");
  await page.addStyleTag({
    content: "*,*::before,*::after{transition:none!important;animation:none!important}" +
      "html{scroll-behavior:auto!important}",
  });
  await page.evaluate(() => (document as Document).fonts.ready);
  await mutate(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(120);
}

const rgb = (s: string): number[] => {
  const m = /rgba?\(([^)]+)\)/.exec(s);
  if (!m) return [0, 0, 0, 0];
  const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
  return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
};
const over = (fg: number[], bg: number[]) => {
  const a = fg[3] ?? 1;
  return [0, 1, 2].map((i) => fg[i] * a + bg[i] * (1 - a));
};
const lum = (c: number[]) => {
  const f = (v: number) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
};
const contrast = (a: number[], b: number[]) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const near = (c: number[], want: number[], tol = 1) => [0, 1, 2].every((i) => Math.abs(c[i] - want[i]) <= tol);

/**
 * The colour a reader sees for each match: its ink over whatever is painted behind it. The ground
 * is found by walking up and compositing every background colour until one is opaque — so a
 * translucent field on the navy panel is measured against what it actually sits on.
 */
async function inks(page: Page, selector: string, pseudo?: string) {
  const raw = await page.evaluate(({ selector, pseudo }) => {
    const out: Array<{ text: string; color: string; grounds: string[] }> = [];
    for (const el of Array.from(document.querySelectorAll(selector)) as HTMLElement[]) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const grounds: string[] = [];
      for (let n: HTMLElement | null = el; n; n = n.parentElement) grounds.push(getComputedStyle(n).backgroundColor);
      out.push({
        text: (el.textContent ?? "").trim().slice(0, 40) || (el as HTMLInputElement).placeholder || el.tagName,
        color: getComputedStyle(el, pseudo ?? null).color,
        grounds,
      });
    }
    return out;
  }, { selector, pseudo });
  return raw.map((r) => {
    /* Composite from the farthest ancestor inward, over white where nothing at all is painted. */
    let ground = [255, 255, 255];
    for (const g of [...r.grounds].reverse()) ground = over(rgb(g), ground);
    const ink = over(rgb(r.color), ground);
    return { text: r.text, ink, ground, ratio: contrast(ink, ground) };
  });
}

/** Pixels off a screenshot of the viewport, decoded in the page (no decoder dependency). */
async function pixels(page: Page, points: Array<[number, number]>): Promise<number[][]> {
  const shot = (await page.screenshot()).toString("base64");
  return page.evaluate(async ({ shot, points }) => {
    const img = new Image();
    img.src = "data:image/png;base64," + shot;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    const k = img.naturalWidth / window.innerWidth;
    return points.map(([x, y]) => Array.from(ctx.getImageData(Math.round(x * k), Math.round(y * k), 1, 1).data).slice(0, 3));
  }, { shot, points });
}

async function navHeights(page: Page) {
  const h = () => page.evaluate(() => document.querySelector(".mk-navwrap")!.getBoundingClientRect().height);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForFunction(() => !document.querySelector(".mk-navwrap")!.classList.contains("mk-scrolled"));
  const rest = await h();
  /* A short page cannot scroll far enough to condense; pad it so every route can. */
  await page.evaluate(() => { document.body.style.minHeight = "3000px"; window.scrollTo(0, 400); });
  await page.waitForFunction(() => document.querySelector(".mk-navwrap")!.classList.contains("mk-scrolled"));
  await page.waitForTimeout(80);
  const condensed = await h();
  return { rest, condensed };
}

/** The landing's own sections, by class. No element on these pages carries a `data-probe`. */
const BOXES = [
  ".mk-navwrap", ".mk-nav", ".mk-logo", ".mk-links button", ".mk-login", ".mk-navright .mk-btn", ".mk-burger",
  ".mk-herowrap", ".mk-hero", ".mk-herocopy", ".mk-herotitle", ".mk-herosub", ".mk-heroctas", ".mk-heropill",
  ".mk-herolink",
  ".mk-statband", ".mk-stattitle",
  ".mk-featband", ".mk-rows", ".mk-frow", ".mk-frow h3", ".mk-fcopy", ".mk-fcopy p", ".mk-rowillo",
  ".mk-vision", ".mk-visionin", ".mk-visionh2", ".mk-visionpoints", ".mk-vfig", ".mk-vfig img", ".mk-vh3",
  ".mk-vbody", ".mk-visionmore",
  ".mk-claimband", ".mk-claimgrid", ".mk-claimart", ".mk-claimcard", ".mk-claimkicker", ".mk-claimh2",
  ".mk-claimlead", ".mk-claimlist li", ".mk-claimask", ".mk-claimform", ".mk-claimform input[type=email]",
  ".mk-claimform button", ".mk-betanote",
  ".mk-foot", ".mk-footinner", ".mk-footgrid", ".mk-footbrand", ".mk-footmark", ".mk-wordmark", ".mk-foottag",
  ".mk-footglyphs", ".mk-footcol", ".mk-footcol button", ".mk-footbase", ".mk-footmail",
];

async function boxes(page: Page) {
  /* Walk the page once so every lazy picture has its box, then read in document coordinates. */
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 600) {
      window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 30));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForFunction(() => !document.querySelector(".mk-navwrap")!.classList.contains("mk-scrolled"));
  await page.waitForTimeout(100);
  return page.evaluate((sels) => {
    const out: Record<string, number[][]> = {};
    for (const sel of sels) {
      out[sel] = (Array.from(document.querySelectorAll(sel)) as HTMLElement[])
        .filter((e) => e.getBoundingClientRect().width > 0)
        .map((e) => { const r = e.getBoundingClientRect(); return [r.x, r.y + window.scrollY, r.width, r.height]; });
    }
    return out;
  }, BOXES);
}

/** `See how it works` → #pulse: the gap between the nav's bottom edge and the section's top. */
async function anchorGap(page: Page) {
  await page.evaluate(() => window.scrollTo(0, 0));
  /* RETARGET (phone hero, 23 Oct): on a phone the jump is the drawer's "See how it works". Same law —
     the band lands at the nav's foot — through whichever of the two links the page renders. */
  await page.click((page.viewportSize()?.width ?? 1440) <= PHONE ? ".mk-hp-how" : ".mk-herolink");
  await page.waitForTimeout(400);
  return page.evaluate(() =>
    document.querySelector("#pulse")!.getBoundingClientRect().top -
    document.querySelector(".mk-navwrap")!.getBoundingClientRect().bottom);
}

const key = (vp: { width: number }) => String(vp.width);
const baseline = () => {
  expect(existsSync(GEOMETRY), "no baseline geometry — run with LC2_CAPTURE=1 against the pre-pack build").toBe(true);
  return JSON.parse(readFileSync(GEOMETRY, "utf8"));
};
const shot = async (page: Page, name: string, fullPage = false) => {
  if (!SHOTS) return;
  mkdirSync(resolve(OUT, "shots"), { recursive: true });
  await page.screenshot({ path: resolve(OUT, "shots", name + ".png"), fullPage });
};

test.describe("LC2", () => {
  test("capture: the pre-pack geometry", async ({ page }) => {
    test.skip(!CAPTURE, "capture runs once, on request");
    const g: Record<string, unknown> = { nav: {}, boxes: {}, anchor: {} };
    for (const route of ROUTES) for (const vp of NAV_VPS) {
      await open(page, route, vp);
      (g.nav as Record<string, unknown>)[route + "@" + key(vp)] = await navHeights(page);
    }
    for (const vp of VPS) {
      await open(page, "/", vp);
      (g.boxes as Record<string, unknown>)[key(vp)] = await boxes(page);
      (g.anchor as Record<string, unknown>)[key(vp)] = await anchorGap(page);
    }
    mkdirSync(resolve(OUT, "baseline"), { recursive: true });
    writeFileSync(GEOMETRY, JSON.stringify(g, null, 1));
    console.log("LC2 captured", Object.keys(g.nav as object).length, "nav readings");
  });

  test("N1 the nav's ground is ink, opaque, at rest and condensed, on every public route", async ({ page }) => {
    test.skip(CAPTURE);
    let read = 0;
    for (const route of ROUTES) for (const vp of VPS) {
      await open(page, route, vp);
      for (const state of ["rest", "condensed"]) {
        if (state === "condensed") {
          await page.evaluate(() => { document.body.style.minHeight = "3000px"; window.scrollTo(0, 400); });
          await page.waitForFunction(() => document.querySelector(".mk-navwrap")!.classList.contains("mk-scrolled"));
        }
        const s = await page.evaluate(() => {
          const c = getComputedStyle(document.querySelector(".mk-navwrap")!);
          return { bg: c.backgroundColor, blur: c.backdropFilter };
        });
        expect(s.bg, `${route} @${vp.width} ${state}: nav ground`).toBe("rgb(27, 36, 51)");
        expect(s.blur, `${route} @${vp.width} ${state}: backdrop-filter`).toBe("none");
        read++;
      }
    }
    console.log("LC2 N1 readings", read);
    expect(read).toBe(ROUTES.length * VPS.length * 2);
  });

  test("N2 the wordmark is type on ink, the primary is the cream button, and every link reads", async ({ page }) => {
    test.skip(CAPTURE);
    for (const vp of VPS) {
      await open(page, "/", vp);
      const w = await page.evaluate(() => {
        const brand = document.querySelector(".mk-nav .mk-brand")!;
        const word = brand.querySelector(".mk-navword");
        const c = word ? getComputedStyle(word) : null;
        /* RETARGET (landing on phones v1, 26 Oct): at ≤760px the bar holds no primary at all — the
           founding offer is the strip ABOVE the bar, a lighter navy with white type. */
        const primary = document.querySelector(".mk-navright .mk-btn");
        const strip = document.querySelector(".mk-fs"), stripT = document.querySelector(".mk-fs-t");
        const btn = primary ? getComputedStyle(primary) : null;
        return {
          primary: !!primary, stripBg: strip ? getComputedStyle(strip).backgroundColor : null,
          stripFg: stripT ? getComputedStyle(stripT).color : null,
          imgs: Array.from(brand.querySelectorAll("img")).map((i) => i.getAttribute("src") ?? ""),
          text: word?.textContent ?? null, color: c?.color ?? null, family: c?.fontFamily ?? null,
          name: brand.getAttribute("aria-label"),
          btnBg: btn?.backgroundColor ?? null, btnFg: btn?.color ?? null,
        };
      });
      expect(w.imgs.filter((s) => /title/.test(s)), `@${vp.width}: the wordmark is not a picture`).toEqual([]);
      expect(w.imgs.length, "the mark is still drawn").toBe(1);
      expect(w.text).toBe("QueryHawk");
      expect(w.color).toBe("rgb(244, 238, 229)");
      /* RETARGET (phone hero): the phone row sets the wordmark in Source Serif 4 700, per its ref. */
      expect(w.family ?? "").toMatch(vp.width <= PHONE ? /Source Serif 4/ : /Playfair Display/);
      expect(w.name).toBe("QueryHawk home");
      if (vp.width <= PHONE) {
        expect(w.primary, `@${vp.width}: the phone bar holds no primary`).toBe(false);
        expect(w.stripBg, `@${vp.width}: the founding strip is the lighter navy`).toBe("rgb(38, 50, 74)");
        expect(w.stripFg, `@${vp.width}: with white type`).toBe("rgb(255, 255, 255)");
      } else {
        expect(w.btnBg).toBe("rgb(243, 238, 230)");
        expect(w.btnFg).toBe("rgb(27, 36, 51)");
      }
      if (vp.width <= 1080) await page.click(".mk-burger");
      const links = await inks(page, vp.width <= 1080 ? ".mk-navpanel button" : ".mk-links button, .mk-login");
      console.log(`LC2 N2 @${vp.width}`, links.map((l) => `${l.text} ${l.ratio.toFixed(2)}`).join(" · "));
      expect(links.length, "nav links measured").toBeGreaterThanOrEqual(5);
      for (const l of links) {
        expect(near(l.ground, INK), `${l.text} sits on ink`).toBe(true);
        expect(l.ratio, `${l.text} against the bar`).toBeGreaterThanOrEqual(4.5);
      }
      if (vp.width <= 1080) await shot(page, `nav-panel-${vp.width}`);
    }
  });

  test("N3 the nav's heights and the anchor landing are the pre-pack ones", async ({ page }) => {
    test.skip(CAPTURE);
    const base = baseline();
    let read = 0;
    for (const route of ROUTES) for (const vp of NAV_VPS) {
      await open(page, route, vp);
      const now = await navHeights(page);
      /* RETARGET (phone hero, 23 Oct): at ≤760px the bar is a NEW regime — one 60px row in both states,
         because the landing's sticky stage sits at `top: var(--mk-nav-h)` — so it is held to that, not
         to the pre-pack wrapped bar's 128.8. Every other width is still held to its capture. */
      if (vp.width <= PHONE) {
        expect(Math.abs(now.rest - 60), `${route} @${vp.width} rest ${now.rest}`).toBeLessThanOrEqual(0.5);
        expect(Math.abs(now.condensed - 60), `${route} @${vp.width} condensed ${now.condensed}`).toBeLessThanOrEqual(0.5);
        read++;
        continue;
      }
      const was = base.nav[route + "@" + key(vp)];
      expect(Math.abs(now.rest - was.rest), `${route} @${vp.width} rest ${now.rest} vs ${was.rest}`).toBeLessThanOrEqual(0.5);
      expect(Math.abs(now.condensed - was.condensed), `${route} @${vp.width} condensed ${now.condensed} vs ${was.condensed}`).toBeLessThanOrEqual(0.5);
      read++;
    }
    expect(read).toBe(ROUTES.length * NAV_VPS.length);
    for (const vp of VPS) {
      await open(page, "/", vp);
      if (vp.width <= PHONE) {
        /* RETARGET (landing on phones v3, 26 Oct): the page snaps to the feature captions on a phone, and
           the band sits just above the first of them, so the jump is pulled on to caption 1's snap: it
           lands directly under the picture (the band line scrolls under the bar). Measured stable. */
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.click(".mk-hp-how"); await page.waitForTimeout(1200);
        /* ⚠️ Caption 1 always follows the panel in flow, so "under the picture" alone holds snapped or not;
           what the snap decides is that the panel is STUCK under the bar, which is asserted too. */
        const land = await page.evaluate(() => ({
          gap: document.querySelector(".mk-s3")!.getBoundingClientRect().top - document.querySelector(".mk-spimg")!.getBoundingClientRect().bottom,
          panel: document.querySelector(".mk-spimg")!.getBoundingClientRect().top - document.querySelector(".mk-navwrap")!.getBoundingClientRect().bottom,
        }));
        console.log(`LC2 N3 anchor @${vp.width}: caption 1 ${land.gap.toFixed(2)} from the picture, the picture ${land.panel.toFixed(2)} from the bar`);
        expect(Math.abs(land.panel), `anchor landing @${vp.width}: the picture is stuck under the bar`).toBeLessThanOrEqual(1);
        expect(Math.abs(land.gap), `anchor landing @${vp.width}: caption 1 snapped under the picture`).toBeLessThanOrEqual(2);
        continue;
      }
      const gap = await anchorGap(page);
      console.log(`LC2 N3 anchor @${vp.width}: ${gap.toFixed(2)} (was ${Number(base.anchor[key(vp)]).toFixed(2)})`);
      /* RETARGET (phone hero, 23 Oct): at ≤760px the jump is the drawer's link and the band lands AT the
         nav's foot (the pre-pack wrapped bar left 8.5px); the law is the landing, so it is held to 0. */
      expect(Math.abs(gap - (vp.width <= PHONE ? 0 : base.anchor[key(vp)])), `anchor landing @${vp.width}`).toBeLessThanOrEqual(1);
    }
  });

  /* RE-POINTED (landing hero v3): the hero's ground is the ref's `.hero` gradient now — paper white
     at the top to `--mk-hero-foot` (#eeebe5) at its foot — rather than white to 62% and the oat. */
  test("H1 the hero is paper white fading to its foot, with ink type", async ({ page }) => {
    test.skip(CAPTURE);
    for (const vp of VPS) {
      await open(page, "/", vp);
      /* RETARGET (phone hero, 23 Oct): on a phone the hero is the navy stage under the bar with the
         cream drawer over its foot, and the type that opens the page is the drawer's question. */
      if (vp.width <= PHONE) {
        const r = await page.evaluate(() => {
          const st = document.querySelector(".mk-hp-stage")!.getBoundingClientRect();
          const sh = document.querySelector(".mk-hp-sheet")!.getBoundingClientRect();
          return { stageTop: st.top, sheetTop: sh.top, color: getComputedStyle(document.querySelector(".mk-hp-q2")!).color };
        });
        await page.addStyleTag({ content: ".mk-hp-scope{visibility:hidden!important}" });
        const [stage, drawer] = await pixels(page, [[8, r.stageTop + 8], [8, r.sheetTop + 40]]);
        console.log(`LC2 H1 @${vp.width} phone`, JSON.stringify({ stage, drawer, title: r.color }));
        expect(near(stage, [30, 40, 57], 6), `stage ${stage}`).toBe(true);
        expect(near(drawer, [251, 249, 245], 2), `drawer ${drawer}`).toBe(true);
        expect(r.color).toBe("rgb(28, 19, 15)");
        continue;
      }
      /* The pile and its shadow are hidden for this one reading: the claim is the ground. */
      await page.addStyleTag({ content: ".mk-herobox{visibility:hidden!important}" });
      const hero = await page.evaluate(() => {
        const r = document.querySelector(".mk-herowrap")!.getBoundingClientRect();
        return { top: r.top, h: r.height, color: getComputedStyle(document.querySelector(".mk-herotitle")!).color };
      });
      const [top] = await pixels(page, [[24, hero.top + 24]]);
      /* Stacked, the hero is taller than a phone's screen by design (the copy, then the pile), so its
         foot is brought on screen before it is read rather than assumed to be there. */
      const footY = await page.evaluate(() => {
        const r = document.querySelector(".mk-herowrap")!.getBoundingClientRect();
        if (r.bottom > innerHeight) window.scrollTo(0, scrollY + r.bottom - innerHeight + 40);
        return new Promise<number>((done) => requestAnimationFrame(() =>
          done(document.querySelector(".mk-herowrap")!.getBoundingClientRect().bottom - 1)));
      });
      expect(footY, "the hero's foot is on screen").toBeLessThanOrEqual(vp.height);
      const [foot] = await pixels(page, [[24, footY]]);
      console.log(`LC2 H1 @${vp.width}`, JSON.stringify({ top, foot, title: hero.color }));
      /* RETARGET (desktop hero v4.1, 25 Oct): at 900px and up the hero sits in a white card over the
         navy, and the nav's ink carries on into its top; its ground below the card runs from the oat
         to the band's top colour (#efece6). The 761–899px stacked hero keeps the paper white. */
      const carded = vp.width >= 900;
      expect(near(top, carded ? INK : [251, 249, 245], 2), `top ${top}`).toBe(true);
      expect(near(foot, carded ? [239, 236, 230] : [238, 235, 229], 2), `foot ${foot}`).toBe(true);
      expect(hero.color).toBe("rgb(28, 19, 15)");
    }
  });

  test("S1 one light sheet with four 18px corners between the ink nav and the ink footer", async ({ page }) => {
    test.skip(CAPTURE);
    let read = 0;
    for (const route of ROUTES) for (const vp of VPS) {
      await open(page, route, vp);
      const s = await page.evaluate(() => {
        const el = document.querySelector(".mk-sheet") as HTMLElement | null;
        if (!el) return null;
        const c = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        const d = document.documentElement;
        return {
          radii: [c.borderTopLeftRadius, c.borderTopRightRadius, c.borderBottomLeftRadius, c.borderBottomRightRadius],
          top: r.top, left: r.left, right: r.right, docBottom: r.bottom + window.scrollY,
          overflow: d.scrollWidth - d.clientWidth, cw: d.clientWidth,
          footTop: document.querySelector(".mk-foot")!.getBoundingClientRect().top + window.scrollY,
        };
      });
      expect(s, `${route}: the sheet exists`).toBeTruthy();
      /* RETARGET (phone hero, 23 Oct): on the landing at ≤760px the navy stage meets the bar square, so
         the sheet's top corners are 0 there and only its bottom arcs are read. */
      const phoneLanding = route === "/" && vp.width <= PHONE;
      /* RETARGET (desktop hero v4.1, 25 Oct): at 900px and up the landing's hero carries the nav's ink on
         into its top, so the sheet's top arcs AND the point 20px in are ink there (still 18px corners,
         just ink against ink); only the bottom is read as light-inside-ink, and the top is held ink. */
      const navyLanding = route === "/" && vp.width >= 900;
      expect(s!.radii, `${route} @${vp.width}`).toEqual(phoneLanding ? ["0px", "0px", "18px", "18px"] : ["18px", "18px", "18px", "18px"]);
      expect(s!.overflow, `${route} @${vp.width}: horizontal overflow`).toBeLessThanOrEqual(0);
      expect(Math.abs(s!.footTop - s!.docBottom), "the footer starts where the sheet ends").toBeLessThanOrEqual(0.5);
      const L = s!.left, R = s!.right - 1;
      /* ⚠️ /pricing OPENS ON A NAVY BAND INSET INTO THE SHEET (pricing v3, 21 Oct; ref pricing-page-v1):
         18px of oat round it, 10px below 640. At 390 the "20px in" point is inside the band, so on that
         page the sheet's own ground is read in its side gutter, 5px in and 60px down — past the arc. */
      const inset: [number, number][] = route === "/pricing" ? [[L + 5, s!.top + 60], [R - 5, s!.top + 60]] : [[L + 20, s!.top + 20], [R - 20, s!.top + 20]];
      const topPx = await pixels(page, [[L + 2, s!.top + 2], [R - 2, s!.top + 2], ...inset]);
      /* Bring the sheet's bottom edge into the middle of the viewport, then read its corners. */
      await page.evaluate((y) => window.scrollTo(0, y - window.innerHeight / 2), s!.docBottom);
      await page.waitForTimeout(80);
      const by = await page.evaluate(() => document.querySelector(".mk-sheet")!.getBoundingClientRect().bottom);
      const botPx = await pixels(page, [[L + 2, by - 3], [R - 2, by - 3], [L + 20, by - 21], [R - 20, by - 21]]);
      if (navyLanding) expect(topPx.every((p) => near(p, INK, 2)), `${route} @${vp.width} the top is the navy carrying on: ${JSON.stringify(topPx)}`).toBe(true);
      for (const [name, px] of (phoneLanding || navyLanding ? [["bottom", botPx]] : [["top", topPx], ["bottom", botPx]]) as Array<readonly [string, number[][]]>) {
        expect(near(px[0], INK, 2) && near(px[1], INK, 2), `${route} @${vp.width} ${name} arcs are ink: ${JSON.stringify(px.slice(0, 2))}`).toBe(true);
        expect(lum(px[2]) > 0.7 && lum(px[3]) > 0.7, `${route} @${vp.width} ${name} 20px in is light: ${JSON.stringify(px.slice(2))}`).toBe(true);
      }
      read++;
    }
    console.log("LC2 S1 routes x widths", read);
    expect(read).toBe(ROUTES.length * VPS.length);
  });

  test("V1 the vision band is stone, holding three white cards", async ({ page }) => {
    test.skip(CAPTURE);
    for (const vp of VPS) {
      await open(page, "/", vp);
      if (vp.width <= PHONE) {
        /* RETARGET (landing on phones v2, 26 Oct): on a phone the vision is the navy carousel of three
           cards (v1's white rows are gone); the stone band with white cards is the desktop's. */
        const p = await page.evaluate(() => ({
          band: getComputedStyle(document.querySelector(".mk-vision")!).backgroundColor,
          cards: document.querySelectorAll(".mk-vision .mk-vn").length,
          desk: document.querySelectorAll(".mk-vision .mk-vpoint").length,
        }));
        expect(p.band, `@${vp.width}: the phone's vision band is navy`).toBe("rgb(27, 36, 51)");
        expect(p.cards, `@${vp.width}: three carousel cards`).toBe(3);
        expect(p.desk, `@${vp.width}: and none of the desktop's cards`).toBe(0);
        continue;
      }
      const v = await page.evaluate(() => ({
        band: getComputedStyle(document.querySelector(".mk-vision")!).backgroundColor,
        cards: Array.from(document.querySelectorAll(".mk-vision .mk-vpoint")).map((c) => {
          const s = getComputedStyle(c);
          return [s.backgroundColor, s.borderTopLeftRadius, s.borderBottomRightRadius];
        }),
      }));
      expect(v.band).toBe("rgb(233, 230, 224)");
      expect(v.cards.length).toBe(3);
      for (const c of v.cards) expect(c).toEqual(["rgb(255, 255, 255)", "14px", "14px"]);
      const overlap = await page.evaluate(() => {
        const r = Array.from(document.querySelectorAll(".mk-vpoint")).map((c) => c.getBoundingClientRect());
        return r.some((a, i) => r.some((b, j) => j > i && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom));
      });
      expect(overlap, `@${vp.width}: the cards do not overlap`).toBe(false);
    }
  });

  test("F1 everything on the navy founding panel reads, in every outcome state", async ({ page }) => {
    test.skip(CAPTURE);
    const measured: string[] = [];
    const check = async (label: string, selector: string, floor = 4.5, pseudo?: string) => {
      const found = await inks(page, selector, pseudo);
      expect(found.length, `${label}: ${selector} is on the page`).toBeGreaterThan(0);
      for (const f of found) {
        console.log(`LC2 F1 ${label} · ${selector}${pseudo ?? ""} · ${f.ratio.toFixed(2)} · "${f.text}"`);
        expect(f.ratio, `${label}: ${selector}${pseudo ?? ""} "${f.text}"`).toBeGreaterThanOrEqual(floor);
      }
    };
    const P = ".mk-claimcard ";
    /* RETARGET (landing on phones v1, 26 Oct): the navy band is the desktop's; on a phone the landing
       closes on the founding card (landingMobileV1's LM4), so this reads the two desktop widths. */
    const DESK = VPS.filter((v) => v.width > PHONE);
    for (const vp of DESK) {
      for (const state of ["idle", "invalid", "sending", "sent", "dupe", "full", "error", "down"] as const) {
        const mock: Mock = state === "idle" || state === "invalid" ? "count" : state === "sending" ? "hold" : state;
        await open(page, "/", vp, mock);
        await page.locator(".mk-claimcard").scrollIntoViewIfNeeded();
        const panel = await page.evaluate(() => {
          const c = getComputedStyle(document.querySelector(".mk-claimcard")!);
          return [c.backgroundColor, c.borderTopLeftRadius];
        });
        expect(panel, "the panel is the navy panel").toEqual(["rgb(45, 58, 80)", "14px"]);
        if (state !== "idle") {
          await page.fill(P + "input[type=email]", state === "invalid" ? "not-an-address" : "writer@example.com");
          await page.click(P + ".mk-claimform button[type=submit]");
          if (state === "invalid") await page.waitForSelector(P + ".mk-betainvalid");
          else if (state === "sending") await page.waitForSelector(P + "button[type=submit][disabled]");
          else await page.waitForSelector(P + ".mk-betamsg");
        }
        await check(state, P + ".mk-claimkicker, " + P + ".mk-claimh2, " + P + ".mk-claimlead, " + P + ".mk-claimlist li, " + P + ".mk-claimask");
        if (["idle", "invalid", "sending", "error"].includes(state)) {
          await check(state, P + "input[type=email]");
          if (state === "idle") await check(state, P + "input[type=email]", 3, "::placeholder");
          await check(state, P + ".mk-claimform button[type=submit]");
          await check(state, P + ".mk-betanote, " + P + ".mk-betanote .mk-doclink");
        }
        if (state === "invalid") await check(state, P + ".mk-betainvalid");
        if (["sent", "dupe", "full", "error", "down"].includes(state)) await check(state, P + ".mk-betamsg, " + P + ".mk-betamsg a, " + P + ".mk-betamsg button");
        if (state !== "down") {
          await check(state, P + ".mk-claimnum, " + P + ".mk-claimof, " + P + ".mk-claimleft");
          const bar = await page.evaluate(() => [
            getComputedStyle(document.querySelector(".mk-claimcard .mk-claimtrack")!).backgroundColor,
            getComputedStyle(document.querySelector(".mk-claimcard .mk-claimfill")!).backgroundColor,
          ]);
          expect(bar, "the counter's track and fill").toEqual(["rgba(244, 238, 229, 0.16)", "rgb(224, 161, 136)"]);
        }
        measured.push(state + "@" + vp.width);
        if (vp.width !== 1280) await page.locator(".mk-claimcard").screenshot(SHOTS ? { path: resolve(OUT, "shots", `founding-${state}-${vp.width}.png`) } : {});
      }
    }
    console.log("LC2 F1 states measured:", measured.length);
    expect(measured.length).toBe(8 * DESK.length);
  });

  test("F2 the same parts on a light ground keep a dark-on-light treatment", async ({ page }) => {
    test.skip(CAPTURE);
    let n = 0;
    const light = async (label: string, selector: string, floor = 4.5, pseudo?: string) => {
      const found = await inks(page, selector, pseudo);
      expect(found.length, `${label}: ${selector} is on the page`).toBeGreaterThan(0);
      for (const f of found) {
        console.log(`LC2 F2 ${label} · ${selector}${pseudo ?? ""} · ${f.ratio.toFixed(2)}`);
        expect(lum(f.ground), `${label}: ${selector} sits on a light ground`).toBeGreaterThan(0.7);
        expect(f.ratio, `${label}: ${selector}${pseudo ?? ""}`).toBeGreaterThanOrEqual(floor);
        n++;
      }
    };
    for (const vp of VPS) {
      await open(page, "/founders", vp, "count");
      const H = ".mk-fwcol ";
      await light("founders hero", H + "input[type=email]");
      await light("founders hero", H + "input[type=email]", 3, "::placeholder");
      await light("founders hero", H + ".mk-betanote, " + H + ".mk-betanote .mk-doclink");
      await light("founders hero", H + ".mk-claimnum, " + H + ".mk-claimof, " + H + ".mk-claimleft");
      const btn = await inks(page, H + "button[type=submit]");
      expect(btn.length).toBe(1);
      expect(btn[0].ratio, "the hero's submit: its label on its own fill").toBeGreaterThanOrEqual(4.5);
      expect(near(btn[0].ground, [42, 58, 82]), "on a light ground the submit stays the navy button").toBe(true);
      /* ⚠️ RETIRED HERE (pricing v3, 21 Oct): /pricing's tally sits on the founding band's NAVY now,
         so it is no longer a light mount. Its contrast on navy is asserted in pricingV3.measure.ts. */
    }
    expect(n).toBeGreaterThan(20);
  });

  test("T1 the footer is the page's ink ground, with no rule above it", async ({ page }) => {
    test.skip(CAPTURE);
    for (const route of ["/", "/about"]) for (const vp of VPS) {
      await open(page, route, vp);
      const f = await page.evaluate(() => {
        const c = getComputedStyle(document.querySelector(".mk-foot")!);
        return {
          bg: c.backgroundColor, page: getComputedStyle(document.querySelector(".mk-scope")!).backgroundColor,
          top: c.borderTopWidth, heads: Array.from(document.querySelectorAll(".mk-footcol h4")).map((h) => getComputedStyle(h).color),
        };
      });
      expect(f.bg).toBe("rgb(27, 36, 51)");
      expect(f.page, "the page ground behind everything").toBe(f.bg);
      expect(f.top, "no hairline where it starts").toBe("0px");
      expect(f.heads.length).toBe(3);
      for (const h of f.heads) expect(h).toBe("rgb(217, 150, 122)");
      const links = await inks(page, ".mk-foot button, .mk-foot a, .mk-foottag, .mk-footbase p, .mk-wordmark");
      expect(links.length, "footer text measured").toBeGreaterThanOrEqual(12);
      for (const l of links) {
        expect(near(l.ground, INK), `${l.text} sits on ink`).toBe(true);
        expect(l.ratio, `${route} @${vp.width} footer "${l.text}"`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  test("shots: every public page, top to bottom", async ({ page }) => {
    test.skip(CAPTURE || !SHOTS);
    for (const route of ROUTES) for (const vp of [VPS[0], VPS[2]]) {
      await open(page, route, vp, "count");
      await boxes(page);
      await shot(page, `page-${route === "/" ? "landing" : route.slice(1)}-${vp.width}`, true);
    }
    await open(page, "/", VPS[0]);
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForFunction(() => document.querySelector(".mk-navwrap")!.classList.contains("mk-scrolled"));
    await shot(page, "nav-condensed-1440");
  });
});

test("LC2 signed in: the nav offers the dashboard on the cream button, beside a cream avatar", async ({ page }) => {
  test.skip(CAPTURE || !process.env.LC2_SIGNED_IN, "signs in as the harness account; on request");
  await page.setViewportSize(VPS[0]);
  await page.goto("/dashboard");
  await ensureSignedIn(page);
  await page.goto("/", { waitUntil: "load" });
  await page.waitForSelector(".mk-avatar");
  const s = await page.evaluate(() => {
    const b = getComputedStyle(document.querySelector(".mk-navright .mk-btn")!);
    const a = getComputedStyle(document.querySelector(".mk-avatar")!);
    return {
      label: document.querySelector(".mk-navright .mk-btn")!.textContent,
      btn: [b.backgroundColor, b.color], avatar: [a.backgroundColor, a.color],
      h: document.querySelector(".mk-navwrap")!.getBoundingClientRect().height,
    };
  });
  console.log("LC2 signed-in", JSON.stringify(s));
  expect(s.label).toBe("Open dashboard");
  expect(s.btn).toEqual(["rgb(243, 238, 230)", "rgb(27, 36, 51)"]);
  expect(s.avatar).toEqual(["rgba(244, 238, 229, 0.12)", "rgb(244, 238, 229)"]);
  expect(s.h).toBe(88);
  mkdirSync(resolve(OUT, "shots"), { recursive: true });
  await page.screenshot({ path: resolve(OUT, "shots", "nav-signed-in-1440.png"), clip: { x: 0, y: 0, width: 1440, height: 140 } });
});
