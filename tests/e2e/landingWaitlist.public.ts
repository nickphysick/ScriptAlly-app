/**
 * The waiting-list landing page (waitlist v1, 31 Oct; v2, 1 Nov): LW-1 … LW-12 and LW-F, measured on a
 * PRODUCTION build served locally — a stranger's view, no sign-in (the `public` project).
 *
 *   npx vite build --mode production && npx vite preview --host 127.0.0.1 --port 4471 --strictPort
 *   SA_E2E_BASE_URL=http://127.0.0.1:4471 npx playwright test --project public landingWaitlist
 *
 * refs: design-refs/landing-mobile-v17.html (phones), design-refs/landing-desktop-v14.html (desktop).
 *
 * ⚠️ EACH LOCK ASSERTS ITS POPULATION OR ITS POSITIVE CONTROL FIRST, so none can pass on an empty set: LW-1
 * must find Privacy as route-changing (the detector works), LW-3 must see the join bar shown mid-page,
 * LW-4 must see each piece start once it is seen, LW-12 must see the number when a count IS loaded.
 *
 * `LW_MUTATE=<name>` applies a named break in the page, so each lock can be watched going red against the
 * build it guards (see `MUTATIONS`; the run of each is recorded in reports/landing-waitlist-v2/REPORT.md).
 */
import { test, expect, Page } from "@playwright/test";

const PHONE = { width: 390, height: 844 };
const PHONE_L = { width: 430, height: 932 };
const DESK = { width: 1440, height: 900 };

/** Named breaks, one per lock: each undoes the fix that lock guards. CSS is added; a function is run. */
const MUTATIONS: Record<string, string | ((page: Page) => Promise<void>)> = {
  /* LW-1: a pill that navigates, and an anchor whose target is not on the page. */
  LW1: async (page) => page.evaluate(() => { const a = document.querySelector(".mk-det-pills a")!; const b = a.cloneNode(true) as HTMLAnchorElement; b.setAttribute("href", "/about"); a.replaceWith(b); }),
  LW1b: async (page) => page.evaluate(() => document.querySelector(".mk-det-pills a")!.setAttribute("href", "#mk-f-nowhere")),
  LW2: "html{scroll-snap-type:y proximity!important}",
  LW2b: ".mk-wl-sec{scroll-snap-type:x mandatory!important}",
  LW3: ".mk-jbar{transform:none!important;opacity:1!important;pointer-events:auto!important}",
  LW5: ".mk-beb .mk-beb-h{white-space:normal!important;font-size:64px!important}",
  LW5b: ".mk-beb-stage{padding:0 60px}",
  LW6: ".mk-trkd{aspect-ratio:1600/800!important}",
  /* LW-7 (hero v3, 2 Nov): a stretching floor back on the drawer; a big gap; the strap wrapping; the hawk
     off centre; the panel's lines run together or wrapping; and a floor that only makes it taller. */
  LW7: ".mk-wl-hero{min-height:820px!important;justify-content:space-between!important}",
  LW7b: ".mk-wl-lock{margin-top:60px!important}",
  LW7c: ".mk-wl-strap{font-size:58px!important;white-space:normal!important}",
  LW7d: ".mk-wl-herohawk{margin-left:60px!important}",
  LW7e: ".mk-wl-lock-brand{display:inline!important}.mk-wl-lock-trio{display:inline!important}",
  /* The trio's spans sit with no space between them, so it has no place to break; the break adds them. */
  LW7f: async (page) => page.evaluate(() => {
    document.querySelectorAll(".mk-wl-lock-trio > span").forEach((s) => s.after(" "));
    const st = document.createElement("style");
    st.textContent = ".mk-wl-lock{max-width:180px!important}.mk-wl-lock-trio{white-space:normal!important}";
    document.head.append(st);
  }),
  LW7g: ".mk-wl-hero{min-height:820px!important}",
  LW13: ".mk-wl-lock-trio,.mk-dh-pillar b{text-transform:uppercase!important}",
  LW8: ".mk-det-h,.mk-fcopy p,.mk-wl-fline{text-transform:uppercase!important}",
  LW9: ".mk-frow,.mk-wl-feat{scroll-margin-top:-400px!important}",
  LW10: ".mk-vcard{flex-basis:80%!important}",
  LW11: ".mk-vision{margin-top:24px!important}",
  LW11b: ".mk-frow::before{display:none!important}",
  /* The fault LW-F was written after: a 0-1-1 "inherit" rule outranking every single-class face rule. */
  LWF: ".mk-wl p,.mk-wl span{font-family:inherit}",
};
const mutate = async (page: Page, ...names: string[]) => {
  const m = process.env.LW_MUTATE;
  if (!m || !names.includes(m)) return;
  const fix = MUTATIONS[m];
  if (typeof fix === "string") await page.addStyleTag({ content: fix });
  else await fix(page);
  await page.waitForTimeout(150);
};

/** Open "/". The count endpoint is left as the local preview serves it (no count) unless `count` is given. */
async function open(page: Page, vp: { width: number; height: number }, count?: { count: number; cap: number }) {
  await page.route(/googletagmanager\.com|google-analytics\.com/, (r) => r.abort());
  if (count) await page.route("**/api/waitlist", (r) => r.request().method() === "GET"
    ? r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...count, visible: true }) })
    : r.continue());
  await page.setViewportSize(vp);
  await page.goto("/");
  await expect(page.locator(".mk-scope")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
}

/** A missing subject FAILS, naming itself — it never crashes on a null (a crash names a line, not a fact). */
async function present(page: Page, ...sels: string[]) {
  for (const sel of sels) expect(await page.locator(sel).count(), `${sel} is on the page`).toBeGreaterThan(0);
}

/** Scroll so that `share` of the element's height is inside the viewport, entering from the bottom. */
async function showShare(page: Page, sel: string, share: number) {
  await present(page, sel);
  await page.evaluate(([s, f]) => {
    const el = document.querySelector(s as string)!;
    const r = el.getBoundingClientRect();
    const top = r.top + scrollY;
    window.scrollTo({ top: top - innerHeight + r.height * (f as number), behavior: "instant" as ScrollBehavior });
  }, [sel, share]);
  await page.waitForTimeout(80);
}

test.describe("LW-1 · no route-changing link or button on / except Privacy, and every in-page anchor lands", () => {
  for (const vp of [PHONE, DESK]) {
    test(`at ${vp.width}px`, async ({ page }) => {
      await open(page, vp);
      await mutate(page, "LW1", "LW1b");
      const labels: string[] = await page.evaluate(() =>
        Array.from(document.querySelectorAll<HTMLElement>("a, button")).map((e) => (e.textContent ?? "").trim() || e.getAttribute("aria-label") || ""));
      expect(labels.length, "the population is not empty").toBeGreaterThan(8);
      const leaving: string[] = [];
      for (let i = 0; i < labels.length; i++) {
        await page.evaluate((k) => (document.querySelectorAll<HTMLElement>("a, button")[k])?.click(), i);
        await page.waitForTimeout(250);
        const path = new URL(page.url()).pathname;
        if (path !== "/") { leaving.push(`${labels[i]} → ${path}`); await open(page, vp); await mutate(page, "LW1", "LW1b"); }
      }
      console.log(`LW-1 @${vp.width}: ${labels.length} links and buttons; leaving: ${JSON.stringify(leaving)}`);
      expect(leaving.length, "the detector works: Privacy leaves").toBeGreaterThan(0);
      for (const l of leaving) expect(l, "only Privacy may leave the page").toMatch(/^Privacy → \/privacy$/);
      const anchors = await page.evaluate(() => Array.from(document.querySelectorAll("a[href]")).map((a) => {
        const h = a.getAttribute("href")!;
        return { h, lands: h.startsWith("#") ? !!document.getElementById(h.slice(1)) : null };
      }));
      const inPage = anchors.filter((a) => a.h.startsWith("#"));
      console.log(`LW-1 @${vp.width}: in-page anchors ${JSON.stringify(inPage.map((a) => a.h))}`);
      expect(inPage.length, "the six pills (and on phones, See what it does)").toBeGreaterThanOrEqual(6);
      for (const a of anchors) expect(a.h, `an href that leaves: ${a.h}`).toMatch(/^#|^mailto:|^\/privacy$/);
      for (const a of inPage) expect(a.lands, `${a.h}'s target is on the page`).toBe(true);
    });
  }
});

test("LW-2 · phones: html never snaps, the mission carousel is the only snap element, nothing below the nav is sticky", async ({ page }) => {
  await open(page, PHONE);
  await mutate(page, "LW2", "LW2b");
  const r = await page.evaluate(() => {
    const snap = getComputedStyle(document.documentElement).scrollSnapType;
    const nav = document.querySelector(".mk-navwrap")!;
    const all = Array.from(document.querySelectorAll<HTMLElement>("body *"));
    const sticky = all.filter((e) => !nav.contains(e) && e !== nav && getComputedStyle(e).position === "sticky").map((e) => e.className || e.tagName);
    const snappers = all.filter((e) => { const s = getComputedStyle(e).scrollSnapType; return s && s !== "none"; }).map((e) => e.className || e.tagName);
    return { snap, sticky, snappers, checked: all.length };
  });
  console.log("LW-2", JSON.stringify(r));
  expect(r.checked, "the sweep read the page").toBeGreaterThan(200);
  expect(r.snap === "none" || r.snap === "", `html's scroll-snap-type ${r.snap}`).toBe(true);
  expect(r.snappers, "the mission carousel and nothing else").toEqual(["mk-vc"]);
  expect(r.sticky).toEqual([]);
});

test("LW-3 · phones: the join bar shows mid-page, and never once the founding pass is in or above view", async ({ page }) => {
  await open(page, PHONE);
  await mutate(page, "LW3");
  await present(page, ".mk-jbar", ".mk-tkt", ".mk-wl-faq");
  const shown = async () => page.evaluate(() => {
    const b = document.querySelector<HTMLElement>(".mk-jbar"); if (!b) return null;
    const cs = getComputedStyle(b);
    return Number(cs.opacity) > 0.5 && cs.pointerEvents !== "none";
  });
  const at = async (y: () => Promise<void>) => { await y(); await page.waitForTimeout(600); return shown(); };
  const top = await at(async () => { await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior })); });
  const mid = await at(() => showShare(page, "#mk-f-agents", 1));
  const card = await at(async () => { await page.evaluate(() => { const c = document.querySelector(".mk-tkt")!; window.scrollTo({ top: c.getBoundingClientRect().top + scrollY - innerHeight * .5, behavior: "instant" as ScrollBehavior }); }); });
  const faq = await at(async () => { await page.evaluate(() => { const c = document.querySelector(".mk-wl-faq")!; window.scrollTo({ top: c.getBoundingClientRect().top + scrollY - 80, behavior: "instant" as ScrollBehavior }); }); });
  const foot = await at(async () => { await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" as ScrollBehavior })); });
  console.log("LW-3", JSON.stringify({ top, mid, card, faq, foot }));
  expect(top, "hidden over the hero").toBe(false);
  expect(mid, "the positive control: shown once the hero's form has gone").toBe(true);
  expect(card, "hidden with the founding pass in view").toBe(false);
  expect(faq, "hidden below the founding pass").toBe(false);
  expect(foot, "hidden at the foot of the page").toBe(false);
});

/* ── LW-4 ── */
const dayOf = (page: Page, scope: string) => page.evaluate((s) => document.querySelector<HTMLElement>(`${s} [data-hc="day"]`)?.dataset.n ?? null, scope);
const goes = (page: Page, sel: string) => page.locator(sel).getAttribute("class");

test.describe("LW-4 · nothing moves until it is 60% visible; under reduced motion everything is finished", () => {
  for (const [vp, card] of [[{ width: 390, height: 600 }, ".mk-trk"], [DESK, ".mk-trkd"]] as const) {
    test(`${vp.width}px: the Birds-eye window and the card`, async ({ page }) => {
      /* A SHORT phone, so the window starts below the fold and there is something to hold. */
      await open(page, vp);
      const win = `.mk-bef--${vp.width < 761 ? "phone" : "desk"}`;
      await showShare(page, `${win} .mk-bef-win`, 0.4);
      await page.waitForTimeout(1500);
      expect(await goes(page, win), "the window holds at 40%").not.toMatch(/mk-go/);
      await showShare(page, `${win} .mk-bef-win`, 1);
      await page.waitForTimeout(400);
      expect(await goes(page, win), "…and draws in once seen").toMatch(/mk-go/);

      await showShare(page, card, 0.4);
      await page.waitForTimeout(5000);
      expect(await dayOf(page, card), "the card holds its first frame at 40%").toBe("1");
      await showShare(page, card, 1);
      await page.waitForTimeout(6000);
      expect(Number(await dayOf(page, card)), "…and plays once seen").toBeGreaterThan(1);
    });
  }

  for (const vp of [PHONE, DESK]) {
    test(`reduced motion at ${vp.width}px: finished, and still`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await open(page, vp);
      const card = vp === PHONE ? ".mk-trk" : ".mk-trkd";
      await showShare(page, card, 1);
      await page.waitForTimeout(3000);
      expect(await dayOf(page, card), "the card is the story's end").toBe("99");
      expect(await page.locator(`${card} .mk-trk-again`).getAttribute("class"), "no replay offered for a story that never ran").not.toMatch(/mk-on/);
      const win = `.mk-bef--${vp === PHONE ? "phone" : "desk"}`;
      await showShare(page, `${win} .mk-bef-win`, 1);
      const cls = await goes(page, win);
      expect(cls, "drawn finished").toMatch(/mk-go/);
      expect(cls, "with its transitions off").toMatch(/mk-still/);
    });
  }
});

/* LW-5 (REPLACED in v2): the Birds-eye view is its own band now, not a row whose copy shares a column. */
test("LW-5 · desktop: the Birds-eye heading is one line at 1440, and the window is the hero card's width", async ({ page }) => {
  await open(page, DESK);
  await mutate(page, "LW5", "LW5b");
  await present(page, ".mk-beb-h", ".mk-bef--desk .mk-bef-win", ".mk-dh-card");
  const r = await page.evaluate(() => {
    const h = document.querySelector<HTMLElement>(".mk-beb-h")!;
    const range = document.createRange(); range.selectNodeContents(h);
    const lines = new Set(Array.from(range.getClientRects()).map((b) => Math.round(b.top))).size;
    return {
      lines, ink: Math.round(range.getBoundingClientRect().width), box: h.clientWidth,
      win: document.querySelector(".mk-bef--desk .mk-bef-win")!.getBoundingClientRect().width,
      card: document.querySelector(".mk-dh-card")!.getBoundingClientRect().width,
      heroCards: document.querySelectorAll(".mk-dh .mk-hc-pile, .mk-dh [data-hc]").length,
    };
  });
  console.log("LW-5", JSON.stringify(r));
  expect(r.lines, "one line").toBe(1);
  expect(r.ink, "and its ink inside its box").toBeLessThanOrEqual(r.box);
  expect(Math.abs(r.win - r.card), `window ${r.win} vs hero card ${r.card}`).toBeLessThanOrEqual(2);
  expect(r.heroCards, "no HeroCard in the hero").toBe(0);
});

test("LW-6 · desktop: the pile is drawn at the neighbouring illustration's size (±10%)", async ({ page }) => {
  await open(page, DESK);
  await mutate(page, "LW6");
  await page.waitForTimeout(400);
  await present(page, ".mk-trkd .mk-lc", ".mk-rows > .mk-frow:nth-child(3) img.mk-rowillo");
  const r = await page.evaluate(() => {
    let top = Infinity, bottom = -Infinity;
    const cards = Array.from(document.querySelectorAll<HTMLElement>(".mk-trkd .mk-lc"));
    cards.forEach((c) => { const b = c.getBoundingClientRect(); top = Math.min(top, b.top); bottom = Math.max(bottom, b.bottom); });
    const img = document.querySelector<HTMLElement>(".mk-rows > .mk-frow:nth-child(3) img.mk-rowillo")!;
    return { cards: cards.length, pile: bottom - top, illo: img.getBoundingClientRect().height };
  });
  console.log("LW-6", JSON.stringify(r));
  expect(r.cards, "the whole stack is drawn").toBe(5);
  expect(r.illo, "row 3's illustration has laid out").toBeGreaterThan(200);
  expect(Math.abs(r.pile / r.illo - 1), `pile ${r.pile.toFixed(1)} vs illustration ${r.illo.toFixed(1)}`).toBeLessThanOrEqual(0.1);
});

/* LW-7 (hero v3, 2 Nov; was the trio and sub-line until then): the drawer is a centred stack with no
   stretching. At 375×667, 390×844, 411×915 and 430×932 its height is its content plus its padding (±2px),
   no gap between two consecutive items is over 30px, the strap is one line, the hawk is centred (±2px),
   and the lockup panel is exactly two lines — "Query · Track · Discover" over "QueryHawk". At 390×844
   and 411×915 the Birds-eye heading and its rule are wholly in the first screen. */
const PHONE_S = { width: 375, height: 667 };
const PHONE_M = { width: 411, height: 915 };
const drawer = (page: Page) => page.evaluate(() => {
  const box = (e: Element) => { const b = e.getBoundingClientRect(); return { top: b.top, bottom: b.bottom, left: b.left, right: b.right }; };
  const ink = (e: Element) => { const r = document.createRange(); r.selectNodeContents(e); return Array.from(r.getClientRects()).map((x) => ({ top: x.top, bottom: x.bottom, left: x.left, right: x.right })); };
  const lines = (e: Element) => new Set(ink(e).map((x) => Math.round(x.top))).size;
  const hero = document.querySelector(".mk-wl-hero") as HTMLElement;
  const cs = getComputedStyle(hero);
  const h = document.getElementById("mk-be-h")!;
  const q = (s: string) => document.querySelector(".mk-wl-hero " + s);
  const order = [".mk-wl-q", ".mk-wl-strap", ".mk-wl-herohawk", ".mk-wl-lock", ".mk-wl-see", ".mk-wl-signup"];
  const items = order.map((s) => { const e = q(s); return e ? { s, ...box(e) } : { s, top: NaN, bottom: NaN, left: NaN, right: NaN }; });
  /* The panel's two lines: the words' own boxes (the trio's dots are a different size, so read its words). */
  const trioWords = Array.from(document.querySelectorAll(".mk-wl-hero .mk-wl-lock-trio > span:not([aria-hidden])")).map((e) => e.getBoundingClientRect());
  const brand = q(".mk-wl-lock-brand");
  return { vh: innerHeight, scrollY, rule: parseFloat(getComputedStyle(h, "::after").height), drawer: box(hero), heading: box(h),
           padTop: parseFloat(cs.paddingTop), padBottom: parseFloat(cs.paddingBottom), items,
           strapLines: lines(q(".mk-wl-strap")!),
           trioRows: new Set(trioWords.map((r) => Math.round(r.bottom))).size, trioWords: trioWords.length,
           brandLines: brand ? lines(brand) : 0, trioBottom: Math.max(...trioWords.map((r) => r.bottom)), brandTop: brand ? box(brand).top : NaN,
           subShown: !!q(".mk-wl-sub") };
});

test.describe("LW-7 · phones: the drawer is a centred stack, as tall as its content", () => {
  for (const vp of [PHONE_S, PHONE, PHONE_M, PHONE_L]) {
    test(`at ${vp.width}×${vp.height}`, async ({ page }) => {
      await open(page, vp);
      await mutate(page, "LW7", "LW7b", "LW7c", "LW7d", "LW7e", "LW7f", "LW7g");
      await present(page, "#mk-be-h", ".mk-wl-hero", ".mk-wl-strap", ".mk-wl-lock", ".mk-wl-see", ".mk-wl-herohawk", ".mk-wl-signup");
      const r = await drawer(page);
      console.log(`LW-7 @${vp.width}`, JSON.stringify(r));
      expect(r.scrollY, "read at the top of the page").toBe(0);
      for (const it of r.items) expect(Number.isFinite(it.top), `${it.s} is in the drawer`).toBe(true);
      const first = r.items[0], last = r.items[r.items.length - 1];
      const want = r.padTop + (last.bottom - first.top) + r.padBottom;
      const got = r.drawer.bottom - r.drawer.top;
      expect(Math.abs(got - want), `the drawer is ${got.toFixed(1)} tall; its content plus padding is ${want.toFixed(1)}`).toBeLessThanOrEqual(2);
      for (let i = 1; i < r.items.length; i++) {
        const gap = r.items[i].top - r.items[i - 1].bottom;
        expect(gap, `gap ${r.items[i - 1].s} → ${r.items[i].s}`).toBeLessThanOrEqual(30);
      }
      expect(r.strapLines, "No more winging it. is one line").toBe(1);
      const hawk = r.items[2];
      const off = (hawk.left + hawk.right) / 2 - (r.drawer.left + r.drawer.right) / 2;
      expect(Math.abs(off), `the hawk is centred (off by ${off.toFixed(1)})`).toBeLessThanOrEqual(2);
      expect(r.trioWords, "the panel's first line has its three words").toBe(3);
      expect(r.trioRows, "Query · Track · Discover is one line").toBe(1);
      expect(r.brandLines, "QueryHawk is one line").toBe(1);
      expect(r.brandTop, "QueryHawk is the panel's second line").toBeGreaterThanOrEqual(r.trioBottom - 2);
      expect(r.subShown, "the phone draws no sub-line").toBe(false);
      if (vp === PHONE || vp === PHONE_M) {
        expect(r.rule, "the heading draws its rule (inside its box)").toBe(3);
        expect(r.heading.top, "the heading starts below the drawer").toBeGreaterThan(r.drawer.bottom);
        expect(r.heading.bottom, "the heading and its rule are in the first screen").toBeLessThanOrEqual(r.vh);
      }
    });
  }
});

/* LW-13 (hero v3, 2 Nov): the copy on each layout, word for word, and nothing in the hero uppercased.
   Phones: the lockup panel ("Query · Track · Discover" / "QueryHawk") reads to a screen reader as
   "Query, Track, Discover. QueryHawk", and there is no sub-line. Desktop: the sub-line with its bold brand,
   no trio in the copy column, and the three pillars along the card's foot. */
test.describe("LW-13 · the hero's copy, both layouts", () => {
  for (const vp of [PHONE, DESK]) {
    test(`at ${vp.width}px`, async ({ page }) => {
      await open(page, vp);
      await mutate(page, "LW13");
      const hero = vp === PHONE ? ".mk-wl-hero" : ".mk-dh";
      await present(page, hero);
      const r = await page.evaluate((h) => {
        const root = document.querySelector(h)!;
        const els = [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))];
        const lock = root.querySelector(".mk-wl-lock");
        const sub = root.querySelector("[class$='-sub']");
        return {
          n: els.length,
          upper: els.filter((e) => getComputedStyle(e as Element).textTransform === "uppercase").map((e) => (e as HTMLElement).className || e.tagName),
          lockSr: lock?.querySelector(".mk-sr")?.textContent ?? null,
          lockShown: lock ? Array.from(lock.querySelectorAll("[aria-hidden='true'] > *")).map((e) => e.textContent) : null,
          lockDots: lock ? Array.from(lock.querySelectorAll(".mk-wl-lock-dot")).map((e) => e.textContent) : [],
          lockFace: lock ? getComputedStyle(lock.querySelector(".mk-wl-lock-trio")!).fontFamily : "",
          sub: sub ? sub.textContent : null,
          brandWeight: sub?.querySelector("b") ? getComputedStyle(sub.querySelector("b")!).fontWeight : null,
          trio: !!root.querySelector("[class$='-trio']"),
          pillars: Array.from(root.querySelectorAll(".mk-dh-pillar")).map((p) => [p.querySelector("b")?.textContent, p.querySelector("span")?.textContent]),
          trackRust: root.querySelector(".mk-dh-pillar--track b") ? getComputedStyle(root.querySelector(".mk-dh-pillar--track b")!).color : null,

        };
      }, hero);
      console.log(`LW-13 @${vp.width}`, JSON.stringify(r));
      expect(r.n, "the sweep found the hero").toBeGreaterThan(10);
      expect(r.upper).toEqual([]);
      if (vp === PHONE) {
        expect(r.lockSr, "the panel's reading").toBe("Query, Track, Discover. QueryHawk");
        expect(r.lockShown).toEqual(["Query·Track·Discover", "QueryHawk"]);
        expect(r.lockDots).toEqual(["·", "·"]);
        expect(r.lockFace).toMatch(/Special Elite/);
        expect(r.sub, "no sub-line on phones").toBeNull();
      } else {
        expect(r.sub).toBe("Give your manuscript the chance it deserves with QueryHawk.");
        expect(r.brandWeight).toBe("700");
        expect(r.trio, "no trio row in the copy column").toBe(false);
        expect(r.pillars).toEqual([["Query", "Build your agent list"], ["Track", "Track your submissions"], ["Discover", "Master the art of querying"]]);
        expect(r.trackRust, "Track's title is rust").toBe("rgb(162, 69, 42)");
      }
    });
  }
});

test.describe("LW-8 · no uppercase in the feature copy, the banner or the Birds-eye view", () => {
  for (const vp of [PHONE, DESK]) {
    test(`at ${vp.width}px`, async ({ page }) => {
      await open(page, vp);
      await mutate(page, "LW8");
      const scopes = vp === PHONE
        ? ["#mk-features .mk-wl-feat > h3", "#mk-features .mk-wl-feat > p", "#mk-features .mk-wl-feat > ul", ".mk-det", ".mk-bef"]
        : [".mk-beb", ".mk-det", ".mk-fcopy"];
      const r = await page.evaluate((ss) => {
        const els = ss.flatMap((s) => Array.from(document.querySelectorAll<HTMLElement>(s)).flatMap((e) => [e, ...Array.from(e.querySelectorAll<HTMLElement>("*"))]));
        return { n: els.length, upper: els.filter((e) => getComputedStyle(e).textTransform === "uppercase").map((e) => e.className || e.tagName) };
      }, scopes);
      console.log(`LW-8 @${vp.width}`, JSON.stringify(r));
      expect(r.n, "the sweep found its elements").toBeGreaterThan(40);
      expect(r.upper).toEqual([]);
    });
  }
});

test.describe("LW-9 · the six pills, in order, each scrolls its feature to the top of the view", () => {
  const ORDER = ["Query tracking", "A home for your agents", "Bring your list across", "Submission packages", "Speedy email drop", "Comparable titles"];
  for (const vp of [PHONE, DESK]) {
    test(`at ${vp.width}px`, async ({ page }) => {
      await open(page, vp);
      await mutate(page, "LW9");
      const pills = page.locator(".mk-det-pills a");
      expect(await pills.allTextContents()).toEqual(ORDER);
      const tops: Record<string, number> = {};
      for (let i = 0; i < ORDER.length; i++) {
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior }));
        await page.locator(".mk-det-pills a").nth(i).scrollIntoViewIfNeeded();
        const href = await pills.nth(i).getAttribute("href");
        await pills.nth(i).click();
        await page.waitForTimeout(1400);
        tops[ORDER[i]] = await page.evaluate((id) => Math.round(document.getElementById(id)!.getBoundingClientRect().top), href!.slice(1));
        expect(new URL(page.url()).pathname, "nothing navigates").toBe("/");
      }
      console.log(`LW-9 @${vp.width}`, JSON.stringify(tops));
      for (const [k, t] of Object.entries(tops)) {
        expect(t, `${k} lands at the top`).toBeGreaterThanOrEqual(0);
        expect(t, `${k} lands within 120px of the top`).toBeLessThanOrEqual(120);
      }
    });
  }
});

test("LW-10 · phones: the mission's cards each fill the carousel's width, and one is in view at rest", async ({ page }) => {
  await open(page, PHONE);
  await mutate(page, "LW10");
  await present(page, ".mk-vc", ".mk-vcard");
  await page.evaluate(() => document.querySelector(".mk-vc")!.scrollIntoView({ block: "center", behavior: "instant" as ScrollBehavior }));
  await page.waitForTimeout(400);
  const read = () => page.evaluate(() => {
    const vc = document.querySelector<HTMLElement>(".mk-vc")!, cs = getComputedStyle(vc);
    const inner = vc.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const box = vc.getBoundingClientRect();
    const cards = Array.from(vc.querySelectorAll<HTMLElement>(".mk-vcard")).map((c) => {
      const r = c.getBoundingClientRect();
      return { w: r.width, seen: Math.max(0, Math.min(r.right, box.right) - Math.max(r.left, box.left)) / r.width };
    });
    return { inner, cards };
  });
  const rest = await read();
  await page.evaluate(() => { const vc = document.querySelector<HTMLElement>(".mk-vc")!; vc.scrollTo({ left: vc.querySelector<HTMLElement>(".mk-vcard")!.offsetWidth + 24, behavior: "instant" as ScrollBehavior }); });
  await page.waitForTimeout(600);
  const second = await read();
  console.log("LW-10", JSON.stringify({ rest, second }));
  expect(rest.cards.length, "three cards").toBe(3);
  for (const c of rest.cards) expect(Math.abs(c.w - rest.inner), `card ${c.w} vs content ${rest.inner}`).toBeLessThanOrEqual(1);
  expect(rest.cards.filter((c) => c.seen >= 0.95).length, "exactly one card in view at rest").toBe(1);
  expect(second.cards.filter((c) => c.seen >= 0.95).length, "and after a swipe").toBe(1);
  expect(second.cards[1].seen, "…which is the second").toBeGreaterThanOrEqual(0.95);
});

test("LW-11 · desktop: the feature bands alternate edge to edge, and no page ground shows above the vision band", async ({ page }) => {
  await open(page, DESK);
  await mutate(page, "LW11", "LW11b");
  await present(page, ".mk-frow", ".mk-vision");
  const bands = await page.evaluate(() => Array.from(document.querySelectorAll<HTMLElement>(".mk-rows > .mk-frow")).map((row) => {
    const cs = getComputedStyle(row, "::before"), r = row.getBoundingClientRect();
    const left = r.left + parseFloat(cs.left), right = r.right - parseFloat(cs.right);
    return { bg: cs.backgroundColor, display: cs.display, left: Math.round(left), right: Math.round(right) };
  }));
  console.log("LW-11 bands", JSON.stringify(bands));
  expect(bands.length, "six rows").toBe(6);
  bands.forEach((b, i) => {
    expect(b.display, `row ${i + 1} draws its band`).not.toBe("none");
    expect(b.bg, `row ${i + 1}'s colour`).toBe(i % 2 ? "rgb(251, 246, 239)" : "rgb(244, 237, 227)");
    expect(b.left, `row ${i + 1} from the left edge`).toBeLessThanOrEqual(0);
    expect(b.right, `row ${i + 1} to the right edge`).toBeGreaterThanOrEqual(DESK.width);
  });
  /* The one pixel 10px above the vision band's top centre, read off the screen. */
  const y = await page.evaluate(() => { const v = document.querySelector(".mk-vision")!; const t = v.getBoundingClientRect().top + scrollY; window.scrollTo({ top: t - 300, behavior: "instant" as ScrollBehavior }); return 300 - 10; });
  await page.waitForTimeout(300);
  const shot = await page.screenshot({ clip: { x: DESK.width / 2, y, width: 1, height: 1 } });
  const px = await page.evaluate(async (b64) => {
    const img = new Image(); img.src = "data:image/png;base64," + b64; await img.decode();
    const c = document.createElement("canvas"); c.width = c.height = 1; const g = c.getContext("2d")!; g.drawImage(img, 0, 0);
    return Array.from(g.getImageData(0, 0, 1, 1).data.slice(0, 3));
  }, shot.toString("base64"));
  console.log("LW-11 pixel", JSON.stringify(px));
  const near = (a: number[], b: number[]) => a.every((v, i) => Math.abs(v - b[i]) <= 2);
  expect(near(px, [244, 237, 227]) || near(px, [251, 246, 239]), `rgb(${px}) is a feature band, not the page ground (242, 238, 232)`).toBe(true);
});

test.describe("LW-12 · the founding pass states a number only when the count has loaded", () => {
  const stub = (page: Page) => page.evaluate(() => {
    document.querySelector(".mk-tkt")!.scrollIntoView({ block: "center", behavior: "instant" as ScrollBehavior });
    return (document.querySelector(".mk-tkt-st")?.textContent ?? "").trim();
  });
  test("unloaded: the label alone", async ({ page }) => {
    await page.route("**/api/waitlist", (r) => r.request().method() === "GET" ? r.fulfill({ status: 503, body: "" }) : r.continue());
    await open(page, PHONE);
    await page.waitForTimeout(1500);
    const s = await stub(page);
    console.log("LW-12 unloaded", JSON.stringify(s));
    expect(s, "the stub is drawn").toContain("Founding writer pass");
    expect(s).not.toMatch(/No\./);
    expect(s).not.toMatch(/\d/);
  });
  test("loaded: the next place (the positive control)", async ({ page }) => {
    await open(page, PHONE, { count: 13, cap: 50 });
    await page.waitForTimeout(1500);
    const s = await stub(page);
    console.log("LW-12 loaded", JSON.stringify(s));
    expect(s).toBe("Founding writer passNo. 14of 50");
  });
  /* Founding emails v1 (1 Nov): full says so, "All fifty taken", and still states no number. */
  test("full: no number, and the stub says the places are gone", async ({ page }) => {
    await open(page, PHONE, { count: 50, cap: 50 });
    await page.waitForTimeout(1500);
    const s = await stub(page);
    console.log("LW-12 full", JSON.stringify(s));
    expect(s).toBe("Founding writer passAll fifty taken");
    expect(s).not.toMatch(/No\./);
  });
});

/**
 * LW-F (beyond the brief): phones keep the ref's faces. Written after a 0-1-1 `.mk-wl span { font-family:
 * inherit }` silently took the handwriting off "No more winging it." and the typewriter off every Birds-eye
 * bar — through a green suite, because nothing read a computed face.
 */
test("LW-F · phones: each piece is set in the ref's face", async ({ page }) => {
  /* With a count, so the pass's number is drawn and its face can be read. */
  await open(page, PHONE, { count: 13, cap: 50 });
  await mutate(page, "LWF");
  const FACES: Record<string, string> = {
    ".mk-wl-strap": "Caveat", ".mk-bef-bar > span": "Special Elite", ".mk-wl-feat h3": "Special Elite",
    ".mk-wl-lock-brand": "Source Serif 4", ".mk-wl-lock-trio": "Special Elite", ".mk-wl-fline": "Source Serif 4", ".mk-vcard p": "Source Serif 4",
    ".mk-cclead": "Source Serif 4", ".mk-ccnote": "Source Sans 3", ".mk-tkt-st b": "Special Elite",
  };
  await present(page, ...Object.keys(FACES));
  const got = await page.evaluate((sels) => Object.fromEntries(sels.map((s) =>
    [s, getComputedStyle(document.querySelector(s)!).fontFamily.split(",")[0].replace(/"/g, "").trim()])), Object.keys(FACES));
  console.log("LW-F", JSON.stringify(got));
  for (const [sel, face] of Object.entries(FACES)) expect(got[sel], sel).toBe(face);
});
