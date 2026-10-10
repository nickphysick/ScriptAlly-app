/**
 * Landing colours v2 — the public site in the app's colours. Locks LC2 N1–N3, H1–H2, S1–S2, V1,
 * F1–F2, T1 (K1 and C1 are unit locks, in src/marketing/marketingTokens.test.ts).
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

const ROUTES = ["/", "/pricing", "/about", "/contact", "/founders", "/terms", "/privacy"];
const VPS = [
  { width: 1440, height: 900 },
  { width: 1280, height: 800 },
  { width: 390, height: 844 },
];
/** The nav's three regimes: full links (1440, 1280), burger on one row (900), wrapped (390). */
const NAV_VPS = [...VPS.slice(0, 2), { width: 900, height: 800 }, VPS[2]];
const OUT = resolve("reports/landing-colours-v2");
const GEOMETRY = resolve(OUT, "baseline/geometry.json");
const CAPTURE = !!process.env.LC2_CAPTURE;
const MUTATE = process.env.LC2_MUTATE ?? "";
const SHOTS = !!process.env.LC2_SHOTS;

const INK = [27, 36, 51];
const CREAM = [244, 238, 229];

/** Each lock's named break, as a stylesheet. The two that need the DOM are applied in `mutate`. */
const MUTATIONS: Record<string, string> = {
  N1: ".mk-navwrap.mk-scrolled{background:rgba(247,244,238,.92)!important;backdrop-filter:blur(8px)!important}",
  N3: ".mk-navword{font-size:40px!important}",
  H1: ".mk-herowrap{background:#1b2433!important}",
  H2: ".mk-heroart img{opacity:.5!important}",
  S1: ".mk-sheet{border-bottom-left-radius:0!important;border-bottom-right-radius:0!important}",
  S2: ".mk-statband{padding-bottom:76px!important}",
  V1: ".mk-vision{background-color:#ffffff!important}",
  F1: ".mk-claimcard .mk-betamsg{color:#3a1c14!important;background:none!important}",
  F2: ".mk-claimform input{color:#f4eee5!important}.mk-betanote{color:rgba(244,238,229,.62)!important}" +
      ".mk-claimnum,.mk-claimof,.mk-claimleft,.mk-fmmeta,.mk-fmtally{color:#f4eee5!important}",
  T1: ".mk-foot{border-top:1px solid #e7ddd2!important}",
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
  ".mk-herolink", ".mk-heroart img",
  ".mk-statband", ".mk-stateyebrow", ".mk-stattitle",
  ".mk-featband", ".mk-rows", ".mk-frow", ".mk-frow h3", ".mk-fcopy", ".mk-fcopy p", ".mk-rowillo",
  ".mk-vision", ".mk-visionin", ".mk-visionh2", ".mk-visionpoints", ".mk-vfig", ".mk-vfig img", ".mk-vh3",
  ".mk-vbody", ".mk-visionmore",
  ".mk-claimband", ".mk-claimgrid", ".mk-claimart", ".mk-claimcard", ".mk-claimkicker", ".mk-claimh2",
  ".mk-claimlead", ".mk-claimlist li", ".mk-claimask", ".mk-claimform", ".mk-claimform input[type=email]",
  ".mk-claimform button", ".mk-betanote",
  ".mk-foot", ".mk-footinner", ".mk-footgrid", ".mk-footbrand", ".mk-footmark", ".mk-wordmark", ".mk-foottag",
  ".mk-footglyphs", ".mk-footcol", ".mk-footcol button", ".mk-footbase", ".mk-footmail",
];

/**
 * The one stated exception to ±1. The vision band's two 1px edge rules were deleted and its inner
 * box took those two pixels as padding, so the band's own box and everything below it are
 * unmoved while this inner box is 1px higher and 2px taller.
 */
const S2_TOLERANCE: Record<string, number> = { ".mk-visionin": 2 };

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

const shadow = (page: Page) => page.evaluate(() => {
  const img = document.querySelector(".mk-heroart img") as HTMLElement | null;
  if (!img) return null;
  const r = img.getBoundingClientRect();
  return { box: [r.x, r.y + window.scrollY, r.width, r.height], opacity: getComputedStyle(img).opacity };
});

/** `See how it works` → #pulse: the gap between the nav's bottom edge and the section's top. */
async function anchorGap(page: Page) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.click(".mk-herolink");
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
    const g: Record<string, unknown> = { nav: {}, boxes: {}, shadow: {}, anchor: {} };
    for (const route of ROUTES) for (const vp of NAV_VPS) {
      await open(page, route, vp);
      (g.nav as Record<string, unknown>)[route + "@" + key(vp)] = await navHeights(page);
    }
    for (const vp of VPS) {
      await open(page, "/", vp);
      (g.boxes as Record<string, unknown>)[key(vp)] = await boxes(page);
      (g.shadow as Record<string, unknown>)[key(vp)] = await shadow(page);
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
        const btn = getComputedStyle(document.querySelector(".mk-navright .mk-btn")!);
        return {
          imgs: Array.from(brand.querySelectorAll("img")).map((i) => i.getAttribute("src") ?? ""),
          text: word?.textContent ?? null, color: c?.color ?? null, family: c?.fontFamily ?? null,
          name: brand.getAttribute("aria-label"),
          btnBg: btn.backgroundColor, btnFg: btn.color,
        };
      });
      expect(w.imgs.filter((s) => /title/.test(s)), `@${vp.width}: the wordmark is not a picture`).toEqual([]);
      expect(w.imgs.length, "the mark is still drawn").toBe(1);
      expect(w.text).toBe("QueryHawk");
      expect(w.color).toBe("rgb(244, 238, 229)");
      expect(w.family ?? "").toMatch(/Playfair Display/);
      expect(w.name).toBe("QueryHawk home");
      expect(w.btnBg).toBe("rgb(243, 238, 230)");
      expect(w.btnFg).toBe("rgb(27, 36, 51)");
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
      const was = base.nav[route + "@" + key(vp)];
      expect(Math.abs(now.rest - was.rest), `${route} @${vp.width} rest ${now.rest} vs ${was.rest}`).toBeLessThanOrEqual(0.5);
      expect(Math.abs(now.condensed - was.condensed), `${route} @${vp.width} condensed ${now.condensed} vs ${was.condensed}`).toBeLessThanOrEqual(0.5);
      read++;
    }
    expect(read).toBe(ROUTES.length * NAV_VPS.length);
    for (const vp of VPS) {
      await open(page, "/", vp);
      const gap = await anchorGap(page);
      console.log(`LC2 N3 anchor @${vp.width}: ${gap.toFixed(2)} (was ${Number(base.anchor[key(vp)]).toFixed(2)})`);
      expect(Math.abs(gap - base.anchor[key(vp)]), `anchor landing @${vp.width}`).toBeLessThanOrEqual(1);
    }
  });

  test("H1 the hero is paper white fading to oat, with ink type", async ({ page }) => {
    test.skip(CAPTURE);
    for (const vp of VPS) {
      await open(page, "/", vp);
      /* The shadow is hidden for this one reading: it is a wash over the ground, and H2 holds it. */
      await page.addStyleTag({ content: ".mk-heroart img{visibility:hidden!important}" });
      const hero = await page.evaluate(() => {
        const r = document.querySelector(".mk-herowrap")!.getBoundingClientRect();
        return { top: r.top, h: r.height, color: getComputedStyle(document.querySelector(".mk-herotitle")!).color };
      });
      expect(hero.top + hero.h, "the hero's foot is on screen").toBeLessThanOrEqual(vp.height);
      const [top, third, foot] = await pixels(page, [
        [24, hero.top + 24], [24, hero.top + hero.h * 0.3], [24, hero.top + hero.h - 1],
      ]);
      console.log(`LC2 H1 @${vp.width}`, JSON.stringify({ top, third, foot, title: hero.color }));
      expect(near(top, [251, 249, 245]), `top ${top}`).toBe(true);
      expect(near(third, [251, 249, 245]), `30% ${third}`).toBe(true);
      expect(near(foot, [242, 238, 232]), `foot ${foot}`).toBe(true);
      expect(hero.color).toBe("rgb(28, 19, 15)");
    }
  });

  test("H2 the shadow is the same picture in the same place", async ({ page }) => {
    test.skip(CAPTURE);
    const base = baseline();
    for (const vp of VPS) {
      await open(page, "/", vp);
      const now = await shadow(page);
      expect(now, "the shadow is rendered").toBeTruthy();
      expect(now!.opacity).toBe(vp.width <= 900 ? "0.12" : "0.18");
      const was = base.shadow[key(vp)].box as number[];
      now!.box.forEach((v, i) => expect(Math.abs(v - was[i]), `shadow box[${i}] @${vp.width}: ${v} vs ${was[i]}`).toBeLessThanOrEqual(0.5));
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
      expect(s!.radii, `${route} @${vp.width}`).toEqual(["18px", "18px", "18px", "18px"]);
      expect(s!.overflow, `${route} @${vp.width}: horizontal overflow`).toBeLessThanOrEqual(0);
      expect(Math.abs(s!.footTop - s!.docBottom), "the footer starts where the sheet ends").toBeLessThanOrEqual(0.5);
      const L = s!.left, R = s!.right - 1;
      const topPx = await pixels(page, [[L + 2, s!.top + 2], [R - 2, s!.top + 2], [L + 20, s!.top + 20], [R - 20, s!.top + 20]]);
      /* Bring the sheet's bottom edge into the middle of the viewport, then read its corners. */
      await page.evaluate((y) => window.scrollTo(0, y - window.innerHeight / 2), s!.docBottom);
      await page.waitForTimeout(80);
      const by = await page.evaluate(() => document.querySelector(".mk-sheet")!.getBoundingClientRect().bottom);
      const botPx = await pixels(page, [[L + 2, by - 3], [R - 2, by - 3], [L + 20, by - 21], [R - 20, by - 21]]);
      for (const [name, px] of [["top", topPx], ["bottom", botPx]] as const) {
        expect(near(px[0], INK, 2) && near(px[1], INK, 2), `${route} @${vp.width} ${name} arcs are ink: ${JSON.stringify(px.slice(0, 2))}`).toBe(true);
        expect(lum(px[2]) > 0.7 && lum(px[3]) > 0.7, `${route} @${vp.width} ${name} 20px in is light: ${JSON.stringify(px.slice(2))}`).toBe(true);
      }
      read++;
    }
    console.log("LC2 S1 routes x widths", read);
    expect(read).toBe(ROUTES.length * VPS.length);
  });

  test("S2 nothing on the landing page moved", async ({ page }) => {
    test.skip(CAPTURE);
    const base = baseline();
    for (const vp of [VPS[0], VPS[2]]) {
      await open(page, "/", vp);
      const now = await boxes(page);
      const was = base.boxes[key(vp)] as Record<string, number[][]>;
      let compared = 0;
      const moved: string[] = [];
      for (const sel of BOXES) {
        expect(now[sel].length, `${sel} @${vp.width}: population`).toBe(was[sel].length);
        now[sel].forEach((b, i) => {
          compared++;
          const d = b.map((v, k) => Math.abs(v - was[sel][i][k]));
          if (Math.max(...d) > (S2_TOLERANCE[sel] ?? 1)) moved.push(`${sel}[${i}] ${b.map((v) => v.toFixed(1))} was ${was[sel][i].map((v) => v.toFixed(1))}`);
        });
      }
      console.log(`LC2 S2 @${vp.width}: ${compared} boxes compared, ${moved.length} moved`);
      expect(compared).toBeGreaterThan(60);
      expect(moved, moved.join("\n")).toEqual([]);
    }
  });

  test("V1 the vision band is stone, holding three white cards", async ({ page }) => {
    test.skip(CAPTURE);
    for (const vp of VPS) {
      await open(page, "/", vp);
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
    for (const vp of VPS) {
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
    expect(measured.length).toBe(8 * VPS.length);
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
      await open(page, "/pricing", vp, "count");
      await light("pricing tally", ".mk-tierplaces .mk-fmmeta, .mk-tierplaces .mk-fmtally");
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

export { CREAM };
