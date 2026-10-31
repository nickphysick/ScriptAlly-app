/**
 * The waiting-list landing page (waitlist v1, 31 Oct): LW-1 … LW-6, measured on a PRODUCTION build served
 * locally — a stranger's view, no sign-in (the `public` project).
 *
 *   npx vite build --mode production && npx vite preview --host 127.0.0.1 --port 4471 --strictPort
 *   SA_E2E_BASE_URL=http://127.0.0.1:4471 npx playwright test --project public landingWaitlist
 *
 * refs: design-refs/landing-mobile-v7.html, design-refs/landing-desktop-v5.html,
 * design-refs/birdseye-focus-v1.html option 2.
 *
 * ⚠️ EACH LOCK ASSERTS ITS POPULATION OR ITS POSITIVE CONTROL FIRST, so none can pass on an empty set: LW-1
 * must find Privacy as route-changing (the detector works), LW-3 must see the join bar shown mid-page
 * (the bar exists and can show), LW-4 must see each piece start once it is seen.
 *
 * `LW_MUTATE=<name>` applies a named break in the page, so each lock can be watched going red against the
 * build it guards (see `MUTATIONS`). Every lock was also red against the pre-waitlist build (f3f75601).
 */
import { test, expect, Page } from "@playwright/test";

const PHONE = { width: 390, height: 844 };
const DESK = { width: 1440, height: 900 };

/** Named breaks, one per lock that a stylesheet can break. LW-1 and LW-4 are proved against the old build. */
const MUTATIONS: Record<string, string> = {
  LW2: "html{scroll-snap-type:y proximity!important}",
  LW3: ".mk-jbar{transform:none!important;opacity:1!important;pointer-events:auto!important}",
  LW5: ".mk-frow--be{grid-template-columns:1fr 1fr!important}",
  LW6: ".mk-trkd{aspect-ratio:1600/800!important}",
};
const mutate = async (page: Page, name: string) => {
  if (process.env.LW_MUTATE === name) await page.addStyleTag({ content: MUTATIONS[name] });
};

/** Open "/", with the consent bar answered unless the lock wants it. */
async function open(page: Page, vp: { width: number; height: number }, consent = true) {
  /* ⚠️ GOOGLE'S TAG NEVER LOADS HERE: LW-1 presses Accept on the consent bar, and a production build would
     then send a real page view to the live property. Blocked at the network, whatever is pressed. */
  await page.route(/googletagmanager\.com|google-analytics\.com/, (r) => r.abort());
  await page.setViewportSize(vp);
  if (consent) await page.addInitScript(() => localStorage.setItem("qh.analyticsConsent", "denied"));
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

test.describe("LW-1 · no route-changing link or button on / except Privacy", () => {
  for (const vp of [PHONE, DESK]) {
    test(`at ${vp.width}px`, async ({ page }) => {
      await open(page, vp, false);
      const labels: string[] = await page.evaluate(() =>
        Array.from(document.querySelectorAll<HTMLElement>("a, button")).map((e) => (e.textContent ?? "").trim() || e.getAttribute("aria-label") || ""));
      expect(labels.length, "the population is not empty").toBeGreaterThan(8);
      const leaving: string[] = [];
      for (let i = 0; i < labels.length; i++) {
        await page.evaluate((k) => (document.querySelectorAll<HTMLElement>("a, button")[k])?.click(), i);
        await page.waitForTimeout(250);
        const path = new URL(page.url()).pathname;
        if (path !== "/") { leaving.push(`${labels[i]} → ${path}`); await open(page, vp, false); }
      }
      console.log(`LW-1 @${vp.width}: ${labels.length} links and buttons; leaving: ${JSON.stringify(leaving)}`);
      expect(leaving.length, "the detector works: Privacy leaves").toBeGreaterThan(0);
      for (const l of leaving) expect(l, "only Privacy may leave the page").toMatch(/^Privacy → \/privacy$/);
      const hrefs: string[] = await page.evaluate(() => Array.from(document.querySelectorAll("a[href]")).map((a) => a.getAttribute("href")!));
      for (const h of hrefs) expect(h, `an href that leaves: ${h}`).toMatch(/^#|^mailto:|^\/privacy$/);
    });
  }
});

test("LW-2 · phones: html never snaps, and nothing below the nav is sticky", async ({ page }) => {
  await open(page, PHONE);
  await mutate(page, "LW2");
  const r = await page.evaluate(() => {
    const snap = getComputedStyle(document.documentElement).scrollSnapType;
    const nav = document.querySelector(".mk-navwrap")!;
    const sticky = Array.from(document.querySelectorAll<HTMLElement>("body *"))
      .filter((e) => !nav.contains(e) && e !== nav && getComputedStyle(e).position === "sticky")
      .map((e) => e.className || e.tagName);
    return { snap, sticky, checked: document.querySelectorAll("body *").length };
  });
  console.log("LW-2", JSON.stringify(r));
  expect(r.checked, "the sweep read the page").toBeGreaterThan(200);
  expect(r.snap === "none" || r.snap === "", `scroll-snap-type ${r.snap}`).toBe(true);
  expect(r.sticky).toEqual([]);
});

test("LW-3 · phones: the join bar shows mid-page, and never once the founding card is in or above view", async ({ page }) => {
  await open(page, PHONE);
  await mutate(page, "LW3");
  await present(page, ".mk-jbar", ".mk-ccard", ".mk-wl-faq");
  const shown = async () => page.evaluate(() => {
    const b = document.querySelector<HTMLElement>(".mk-jbar"); if (!b) return null;
    const cs = getComputedStyle(b);
    return Number(cs.opacity) > 0.5 && cs.pointerEvents !== "none";
  });
  const at = async (y: () => Promise<void>) => { await y(); await page.waitForTimeout(600); return shown(); };
  const top = await at(async () => { await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior })); });
  const mid = await at(() => showShare(page, ".mk-wl-feat:nth-of-type(3)", 1));
  const card = await at(async () => { await page.evaluate(() => { const c = document.querySelector(".mk-ccard")!; window.scrollTo({ top: c.getBoundingClientRect().top + scrollY - innerHeight * .5, behavior: "instant" as ScrollBehavior }); }); });
  const faq = await at(async () => { await page.evaluate(() => { const c = document.querySelector(".mk-wl-faq")!; window.scrollTo({ top: c.getBoundingClientRect().top + scrollY - 80, behavior: "instant" as ScrollBehavior }); }); });
  const foot = await at(async () => { await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" as ScrollBehavior })); });
  console.log("LW-3", JSON.stringify({ top, mid, card, faq, foot }));
  expect(top, "hidden over the hero").toBe(false);
  expect(mid, "the positive control: shown once the hero's form has gone").toBe(true);
  expect(card, "hidden with the founding card in view").toBe(false);
  expect(faq, "hidden below the founding card").toBe(false);
  expect(foot, "hidden at the foot of the page").toBe(false);
});

/* ── LW-4 ── */
const dayOf = (page: Page, scope: string) => page.evaluate((s) => document.querySelector<HTMLElement>(`${s} [data-hc="day"]`)?.dataset.n ?? null, scope);
const chipsSeen = (page: Page) => page.evaluate(() => (window as unknown as { __chips?: number }).__chips ?? 0);
const watchChips = async (page: Page) => { await present(page, ".mk-bew-show"); return page.evaluate(() => {
  const w = window as unknown as { __chips: number }; w.__chips = 0;
  new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => { if ((n as Element).classList?.contains("mk-bew-chip")) w.__chips++; })))
    .observe(document.querySelector(".mk-bew-show")!, { childList: true });
}); };

test.describe("LW-4 · nothing moves until it is 60% visible; under reduced motion everything is finished", () => {
  test("phone: the Birds-eye showcase and the card", async ({ page }) => {
    /* A SHORT phone, so the window starts below the fold: at 390 × 844 it is ~75% on screen at first
       paint and rightly starts at once, which leaves nothing to hold. */
    await open(page, { width: 390, height: 600 });
    await watchChips(page);
    await showShare(page, ".mk-bew-win", 0.4);
    await page.waitForTimeout(3500);
    expect(await chipsSeen(page), "the showcase holds at 40%").toBe(0);
    await showShare(page, ".mk-bew-win", 1);
    await page.waitForTimeout(3500);
    expect(await chipsSeen(page), "…and plays once seen").toBeGreaterThan(0);

    await showShare(page, ".mk-trk", 0.4);
    await page.waitForTimeout(5000);
    expect(await dayOf(page, ".mk-trk"), "the card holds its first frame at 40%").toBe("1");
    await showShare(page, ".mk-trk", 1);
    await page.waitForTimeout(6000);
    expect(Number(await dayOf(page, ".mk-trk")), "…and plays once seen").toBeGreaterThan(1);
  });

  test("desktop: the focus window and the pile", async ({ page }) => {
    await open(page, DESK);
    await showShare(page, ".mk-bef-win", 0.4);
    await page.waitForTimeout(1500);
    expect(await page.locator(".mk-bef").getAttribute("class"), "the window holds at 40%").not.toMatch(/mk-go/);
    await showShare(page, ".mk-bef-win", 1);
    await page.waitForTimeout(400);
    expect(await page.locator(".mk-bef").getAttribute("class"), "…and draws in once seen").toMatch(/mk-go/);

    await showShare(page, ".mk-trkd", 0.4);
    await page.waitForTimeout(5000);
    expect(await dayOf(page, ".mk-trkd"), "the pile's card holds its first frame at 40%").toBe("1");
    await showShare(page, ".mk-trkd", 1);
    await page.waitForTimeout(6000);
    expect(Number(await dayOf(page, ".mk-trkd")), "…and plays once seen").toBeGreaterThan(1);
  });

  for (const vp of [PHONE, DESK]) {
    test(`reduced motion at ${vp.width}px: finished, and still`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await open(page, vp);
      const card = vp === PHONE ? ".mk-trk" : ".mk-trkd";
      await showShare(page, card, 1);
      await page.waitForTimeout(3000);
      expect(await dayOf(page, card), "the card is the story's end").toBe("99");
      expect(await page.locator(`${card} .mk-trk-again`).getAttribute("class"), "no replay offered for a story that never ran").not.toMatch(/mk-on/);
      if (vp === PHONE) {
        await watchChips(page);
        await showShare(page, ".mk-bew-win", 1);
        await page.waitForTimeout(3500);
        expect(await chipsSeen(page), "the showcase never changes").toBe(0);
        const anims = await page.evaluate(() => document.querySelector(".mk-bew-win")!.getAnimations({ subtree: true }).length);
        expect(anims, "nothing animates in the window").toBe(0);
      } else {
        await showShare(page, ".mk-bef-win", 1);
        const cls = await page.locator(".mk-bef").getAttribute("class");
        expect(cls, "drawn finished").toMatch(/mk-go/);
        expect(cls, "with its transitions off").toMatch(/mk-still/);
      }
    });
  }
});

test("LW-5 · desktop: the Birds-eye copy sits in the rows' copy column, and the hero has no card", async ({ page }) => {
  await open(page, DESK);
  await mutate(page, "LW5");
  await present(page, ".mk-rows > .mk-frow", ".mk-dh");
  const r = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll<HTMLElement>(".mk-rows > .mk-frow"));
    const x = (row: HTMLElement) => row.querySelector<HTMLElement>(".mk-fcopy")!.getBoundingClientRect().left;
    return {
      rows: rows.length, be: rows[0].classList.contains("mk-frow--be"),
      beX: x(rows[0]), row3X: x(rows[2]),
      heroCards: document.querySelectorAll(".mk-dh .mk-hc-pile, .mk-dh [data-hc]").length,
      hero: !!document.querySelector(".mk-dh"),
    };
  });
  console.log("LW-5", JSON.stringify(r));
  expect(r.rows, "seven rows").toBe(7);
  expect(r.be, "row 1 is the Birds-eye window").toBe(true);
  expect(Math.abs(r.beX - r.row3X), `copy x ${r.beX} vs row 3's ${r.row3X}`).toBeLessThanOrEqual(2);
  expect(r.hero, "the hero is rendered").toBe(true);
  expect(r.heroCards, "no HeroCard in the hero").toBe(0);
});

test("LW-6 · desktop: the pile is drawn at the neighbouring illustration's size (±10%)", async ({ page }) => {
  await open(page, DESK);
  await mutate(page, "LW6");
  /* The pile is fitted by a ResizeObserver, a frame after any layout change: read after it has run. */
  await page.waitForTimeout(400);
  await present(page, ".mk-trkd .mk-lc", ".mk-rows > .mk-frow:nth-child(3) img.mk-rowillo");
  /* Read before the pile is seen: the story holds its first frame there, so no card is mid-animation. */
  const r = await page.evaluate(() => {
    let top = Infinity, bottom = -Infinity;
    const cards = Array.from(document.querySelectorAll<HTMLElement>(".mk-trkd .mk-lc"));
    cards.forEach((c) => { const b = c.getBoundingClientRect(); top = Math.min(top, b.top); bottom = Math.max(bottom, b.bottom); });
    const rows = Array.from(document.querySelectorAll<HTMLElement>(".mk-rows > .mk-frow"));
    const img = rows[2].querySelector<HTMLElement>("img.mk-rowillo")!;
    return { cards: cards.length, pile: bottom - top, illo: img.getBoundingClientRect().height };
  });
  console.log("LW-6", JSON.stringify(r));
  expect(r.cards, "the whole stack is drawn").toBe(5);
  expect(r.illo, "row 3's illustration has laid out").toBeGreaterThan(200);
  expect(Math.abs(r.pile / r.illo - 1), `pile ${r.pile.toFixed(1)} vs illustration ${r.illo.toFixed(1)}`).toBeLessThanOrEqual(0.1);
});
