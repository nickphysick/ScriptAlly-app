/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Agent card v1 — the rendered locks, phase by phase (design authority:
 * design-refs/agent-card-housekeeping-v7.html, measured at 1440×900 and 1280×800).
 *
 * Phase 1: the card is APP-LEVEL — one host, opened through the store, over any route; a row
 * carries the list's own order; the card no longer closes when its agent leaves the filter; and
 * Escape goes through ONE stack, so a list open inside the card closes before the card hears it.
 *
 * Phase 2: the QUICK VIEW — the mock's frame by the same ruler, a slate band on every agent, the
 * query section's tone by standing, the primary button by stage, ‹ › through the list's order,
 * the stars and the wishlist stamp with their Undo, the ⋯ menu, and Escape's cascade.
 * (Phase 2's editor is still the old form — `[data-clv="profile"].clv-pcard--edit` — until Phase 3.)
 *
 * ⚠️ MOST OF PHASE 2 RUNS IN THE LAB (#/contact-lab, "The cast"): the five standings exist only in
 * `contactFixture`, and the lab's writer is its own cast, so nothing here touches an account. The
 * cases that need the signed-in app (a route other than the Contact list) write nothing.
 *
 * ⚠️ EVERY /agents PROBE GOES THROUGH `visiblePage` — every workspace page stays mounted, and
 * `document.querySelector` answers about whichever copy is first in the DOM. The card itself is
 * portalled to <body> and is the only one, so it is addressed directly.
 */
import { expect, test, type Page } from "@playwright/test";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { assertLocalBundleIsDev } from "./bundleGuard";
import { openRoute, visiblePage } from "./measure";
import { harnessDb } from "./harnessDocs";
import { collection, deleteDoc, deleteField, doc, getDoc, getDocs, query as fsQuery, updateDoc, where } from "firebase/firestore";

let asserts = 0;
let ran = 0;
const bump = (n = 1) => { asserts += n; };

test.beforeAll(async () => { await assertLocalBundleIsDev(); });
test.beforeEach(() => { ran += 1; });
test.afterAll(() => {
  // eslint-disable-next-line no-console
  console.log(`[agentCardV1] assertions run: ${asserts} across ${ran} tests (this worker)`);
  /* ⚠️ THE FLOOR — a suite that finds no subject fails in the language of a failure, never as a
     shorter green; it scales with the tests this worker ran (the per-worker counter). */
  if (asserts < ran * 2) throw new Error(`agentCardV1 ran only ${asserts} assertions across ${ran} tests — a subject went missing`);
});

const CARD = '[data-ac="card"]';
/* the suites run from the repo root (process.cwd()), as the other refs are opened */
const MOCK = pathToFileURL(resolve("design-refs/agent-card-housekeeping-v7.html")).href;

type Req = { agentId: string | null; tab?: string; focus?: string; from?: string; sequence?: string[]; seq: number } | null;
const handle = (page: Page) => ({
  open: (id: string, opts?: Record<string, unknown>) =>
    page.evaluate(([id, opts]) => (window as unknown as { __saAgentCard: { open: (i: string, o?: unknown) => void } }).__saAgentCard.open(id as string, opts), [id, opts ?? {}] as const),
  current: () => page.evaluate(() => (window as unknown as { __saAgentCard: { current: () => Req } }).__saAgentCard.current()),
  close: () => page.evaluate(() => (window as unknown as { __saAgentCard: { close: () => void } }).__saAgentCard.close()),
});

/** the rendered rows' ids, in order, on the VISIBLE Contact list */
const rowIds = (page: Page, scope: string) =>
  page.evaluate((scope) => Array.from(document.querySelectorAll<HTMLElement>(`${scope} [data-clv="row"][data-agent-card]`)).map((r) => r.dataset.agentCard!), scope);

/** ⚠️ MEASURE AFTER THE ENTRANCE — an element mid-animation reports its animated box (CLAUDE.md). */
const settle = (page: Page) => page.evaluate(async () => {
  const card = document.querySelector('[data-ac="card"]');
  if (!card) return;
  await Promise.all(card.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => undefined)));
});

/** the lab over the fixture's cast — no sign-in, and its writer is its own copy */
async function openLab(page: Page, vp = { width: 1440, height: 900 }) {
  await page.setViewportSize(vp);
  await page.goto("/#/contact-lab");
  await page.waitForSelector('[data-lab-view="cast"]');
  await page.click('[data-lab-view="cast"]');
  await page.waitForSelector('[data-clv="row"]');
  return visiblePage(page, ".agl-wpg");
}
async function openFromRow(page: Page, scope: string, id: string) {
  await page.click(`${scope} [data-agent-card="${id}"]`);
  await page.waitForSelector(CARD);
  await settle(page);
}
async function closeCard(page: Page) {
  await page.keyboard.press("Escape");
  await page.waitForSelector(CARD, { state: "detached" });
}

test.describe("phase 1 — the card is app-level", () => {
  test("opened through the store over the Query Centre, it renders that agent's card — and Escape closes it", async ({ page }) => {
    await openRoute(page, "/agents", { width: 1440, height: 900 });
    const scope = await visiblePage(page, ".agl-wpg");
    const first = await page.evaluate((scope) => {
      const r = document.querySelector<HTMLElement>(`${scope} [data-clv="row"][data-agent-card]`);
      return r ? { id: r.dataset.agentCard!, name: (r.querySelector(".clv-rwho b")?.textContent ?? "").trim() } : null;
    }, scope);
    expect(first, "no row on the Contact list to open").not.toBeNull();
    bump();
    if (!first) return;

    await openRoute(page, "/queries", { width: 1440, height: 900 });
    expect(await page.locator(CARD).count(), "a card is open before anything asked for one").toBe(0);
    await handle(page).open(first.id);
    const card = page.locator(CARD);
    await expect(card, "the store opened nothing over the Query Centre — the host is not app-level").toBeVisible({ timeout: 10_000 });
    /* the row and the card both name the agent through `agentPrimary` — so equality, not a likeness */
    expect(first.name.length, "the row named no agent").toBeGreaterThan(0);
    expect((await page.textContent(`${CARD} #ac-name`))?.trim(), "the card over the Query Centre is not the agent the store was asked for").toBe(first.name);
    await page.keyboard.press("Escape");
    await expect(card, "Escape did not close the card").toHaveCount(0, { timeout: 5_000 });
    bump(4);
  });

  test("a row opens the card carrying the list's own order — and, under Find, the narrowed order", async ({ page }) => {
    await openRoute(page, "/agents", { width: 1440, height: 900 });
    const scope = await visiblePage(page, ".agl-wpg");
    const all = await rowIds(page, scope);
    expect(all.length, "too few rows to say anything about an order").toBeGreaterThan(3);
    await page.click(`${scope} [data-clv="row"][data-agent-card="${all[1]}"]`);
    await expect(page.locator(CARD)).toBeVisible();
    const r1 = await handle(page).current();
    expect(r1?.agentId, "the row opened a different agent").toBe(all[1]);
    expect(r1?.from).toBe("row");
    expect(r1?.sequence, "the card was not handed the list's rendered order").toEqual(all);
    await handle(page).close();
    await expect(page.locator(CARD)).toHaveCount(0);

    /* narrow: the first three letters of the first row's agency or name — a real subset */
    const term = await page.evaluate((scope) => {
      const r = document.querySelector<HTMLElement>(`${scope} [data-clv="row"]`);
      return (r?.innerText ?? "").trim().split(/\s+/)[0].slice(0, 4);
    }, scope);
    await page.fill(`${scope} [data-clv="find"] input`, term);
    await page.waitForTimeout(300);
    const narrowed = await rowIds(page, scope);
    expect(narrowed.length, `Find "${term}" did not narrow the list`).toBeLessThan(all.length);
    expect(narrowed.length).toBeGreaterThan(0);
    await page.click(`${scope} [data-clv="row"][data-agent-card="${narrowed[0]}"]`);
    await expect(page.locator(CARD)).toBeVisible();
    const r2 = await handle(page).current();
    expect(r2?.sequence, "under Find the card must step through the NARROWED order").toEqual(narrowed);
    await handle(page).close();
    bump(8);
  });

  test("the card stays open when its agent is outside the list's filter", async ({ page }) => {
    await openRoute(page, "/agents", { width: 1440, height: 900 });
    const scope = await visiblePage(page, ".agl-wpg");
    const all = await rowIds(page, scope);
    const target = all[all.length - 1];
    /* a Find term that keeps the FIRST row and drops the last — then open the last one anyway,
       the way a Housekeeping row or a task can (they read every agent, not the filtered view) */
    const term = await page.evaluate(([scope, a, b]) => {
      const text = (id: string) => (document.querySelector<HTMLElement>(`${scope} [data-agent-card="${id}"]`)?.innerText ?? "").toLowerCase();
      const ta = text(a); const tb = text(b);
      const words = ta.split(/[^a-z']+/).filter((w) => w.length >= 4);
      return words.find((w) => !tb.includes(w)) ?? null;
    }, [scope, all[0], target] as const);
    expect(term, "could not find a Find term that separates two agents").not.toBeNull();
    if (!term) return;
    await page.fill(`${scope} [data-clv="find"] input`, term);
    await page.waitForTimeout(300);
    expect((await rowIds(page, scope)).includes(target), "the filter still shows the target — the case is vacuous").toBe(false);
    await handle(page).open(target, { from: "hk" });
    await page.waitForTimeout(800);
    await expect(page.locator(CARD), "the card closed itself because its agent is outside the filter").toBeVisible();
    await handle(page).close();
    bump(3);
  });

  test("one Escape stack: an open country list closes first, the editor second, the card third", async ({ page }) => {
    await openRoute(page, "/agents", { width: 1440, height: 900 });
    const scope = await visiblePage(page, ".agl-wpg");
    await page.click(`${scope} [data-clv="row"]`);
    await page.waitForSelector(CARD);
    await page.click(`${CARD} [data-ac="edit"]`);
    /* (Phase 2's editor is still the old form) */
    await page.waitForSelector('[data-clv="profile"].clv-pcard--edit');
    await page.click('[data-clv="profile"] .agl-cc-control');
    await expect(page.locator('[data-clv="profile"] .agl-cc-menu')).toBeVisible();
    await page.keyboard.press("Escape");
    const s1 = await page.evaluate(() => ({
      menu: !!document.querySelector('[data-clv="profile"] .agl-cc-menu'),
      editing: !!document.querySelector('[data-clv="profile"].clv-pcard--edit'),
    }));
    expect(s1.menu, "Escape left the country list open").toBe(false);
    expect(s1.editing, "Escape on an open list reached the CARD — the list is not above it on the stack").toBe(true);
    await page.keyboard.press("Escape");
    await page.waitForSelector(CARD);
    const s2 = await page.evaluate(() => ({
      view: !!document.querySelector('[data-ac="card"]'),
      editing: !!document.querySelector('[data-clv="profile"].clv-pcard--edit'),
    }));
    expect(s2.view && !s2.editing, "the second Escape did not return the card to its quick view").toBe(true);
    await page.keyboard.press("Escape");
    await expect(page.locator(CARD), "the third Escape did not close the card").toHaveCount(0, { timeout: 5_000 });
    bump(4);
  });

  test("the lab mounts the host too: a row in #/contact-lab opens the card over the cast", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/#/contact-lab");
    await page.waitForSelector('[data-lab-view="cast"]');
    await page.click('[data-lab-view="cast"]');
    const row = page.locator('[data-clv="row"]').first();
    await expect(row, "the lab rendered no rows over the cast").toBeVisible({ timeout: 10_000 });
    await row.click();
    await expect(page.locator(CARD), "the lab's rows open nothing — its host is missing").toBeVisible({ timeout: 5_000 });
    bump(2);
  });
});

/* ══════════════════════════════════ phase 2 — the quick view ══════════════════════════════════ */

/** the frame's geometry, relative to the card — what is the mock's whatever the agent */
const frameGeom = (page: Page, sel: { card: string; band: string; q: string; sec: string; head: string; ini: string }) =>
  page.evaluate((sel) => {
    const box = (e: Element | null) => (e ? e.getBoundingClientRect() : null);
    const card = box(document.querySelector(sel.card))!;
    const band = box(document.querySelector(sel.band))!;
    const q = box(document.querySelector(sel.q))!;
    const head = box(document.querySelector(sel.head))!;
    const ini = box(document.querySelector(sel.ini))!;
    const secs = [...document.querySelectorAll(sel.sec)].map((e) => e.getBoundingClientRect());
    const qEl = document.querySelector(sel.q) as HTMLElement;
    return {
      cardW: card.width, cardX: card.x, bandH: band.height, bandW: band.width,
      qW: q.width, qX: q.x - card.x, qRadius: getComputedStyle(qEl).borderTopLeftRadius,
      headTop: head.y - card.y, iniX: ini.x - card.x, iniW: ini.width,
      secX: secs[0] ? secs[0].x - card.x : NaN, secW: secs[0] ? secs[0].width : NaN, secs: secs.length,
      cardRadius: getComputedStyle(document.querySelector(sel.card) as HTMLElement).borderTopLeftRadius,
      viewportW: window.innerWidth,
    };
  }, sel);

test.describe("phase 2 — the quick view", () => {
  for (const vp of [{ width: 1440, height: 900 }, { width: 1280, height: 800 }] as const) {
    test(`the frame is the mock's, by one ruler, at ${vp.width}: 548 wide, a 48 band, the 504 query section, the 492 sections`, async ({ page }) => {
      /* the oracle first, in the same browser at the same viewport */
      await page.setViewportSize(vp);
      await page.goto(MOCK);
      await page.waitForTimeout(400);
      await page.evaluate(() => {
        const w = window as unknown as { __C: { n: string; id: number }[]; __ac: { open: (id: number, o: unknown) => void } };
        w.__ac.open(w.__C.find((c) => c.n === "Aisha Kapoor")!.id, { lift: true });
      });
      await page.waitForTimeout(500);
      const mock = await frameGeom(page, { card: "#ac", band: "#acBand", q: "#acQ", sec: "#acBody .qv-s", head: "#acHead", ini: "#acHead .qv-ini" });
      expect(mock.cardW, "the mock did not open its card").toBeGreaterThan(400);

      const scope = await openLab(page, vp);
      await openFromRow(page, scope, "fx-stub0-live");
      const app = await frameGeom(page, { card: CARD, band: '[data-ac="band"]', q: '[data-ac="q"]', sec: '[data-ac="body"] .acq-s', head: '[data-ac="head"]', ini: '[data-ac="head"] .acq-ini' });

      expect(Math.abs(app.cardW - 548), `the quick view is ${app.cardW} wide, not 548`).toBeLessThanOrEqual(2);
      for (const k of ["cardW", "bandH", "bandW", "qW", "qX", "headTop", "iniX", "iniW", "secX", "secW"] as const) {
        expect(Math.abs(app[k] - mock[k]), `${k}: app ${app[k]} against the mock's ${mock[k]}`).toBeLessThanOrEqual(1);
      }
      expect(app.qRadius, "the query section's corners").toBe(mock.qRadius);
      expect(app.cardRadius, "the card's corners").toBe(mock.cardRadius);
      expect(app.secs, "the four sections under the query: genres, wishlist, materials, notes").toBe(4);
      await closeCard(page);
      bump(16);
    });
  }

  test("the band is slate on EVERY standing — the token resolves, and the band's ground is it", async ({ page }) => {
    const scope = await openLab(page);
    /* ⚠️ THE TWO-NOTHINGS GUARD: resolve the token on a probe first — an undeclared token and a
       transparent band would otherwise agree with each other */
    const slate = await page.evaluate(() => {
      const p = document.createElement("div");
      p.style.background = "var(--clv-slate)";
      document.body.appendChild(p);
      const v = getComputedStyle(p).backgroundColor;
      p.remove();
      return v;
    });
    expect(slate, "--clv-slate resolves to nothing").toBe("rgb(95, 123, 147)");
    for (const id of ["fx-none", "fx-stub0-live", "fx-bare", "fx-shut", "fx-fresh", "fx-reopen"]) {
      await openFromRow(page, scope, id);
      const bg = await page.evaluate(() => getComputedStyle(document.querySelector('[data-ac="band"]')!).backgroundColor);
      expect(bg, `${id}: the band is ${bg}, not the slate`).toBe(slate);
      await closeCard(page);
      bump();
    }
    bump();
  });

  test("only the query section changes colour — each standing's ground is decision 2's; YOUR MOVE is ink", async ({ page }) => {
    const scope = await openLab(page);
    const want: Record<string, { bg: string; label: string }> = {
      "fx-none": { bg: "rgb(245, 230, 223)", label: "Your move" },
      "fx-stub0-live": { bg: "rgb(247, 239, 227)", label: "With the agent" },
      "fx-bare": { bg: "rgb(215, 224, 232)", label: "Offer on the table" },
      "fx-shut": { bg: "rgb(228, 225, 219)", label: "Closed · passed" },
      "fx-fresh": { bg: "rgb(255, 255, 255)", label: "Not yet queried" },
      "fx-reopen": { bg: "rgb(228, 225, 219)", label: "Closed to submissions" },
    };
    for (const [id, w] of Object.entries(want)) {
      await openFromRow(page, scope, id);
      const r = await page.evaluate(() => {
        const q = document.querySelector('[data-ac="q"]') as HTMLElement;
        const chip = q.querySelector('[data-ac="tone"]') as HTMLElement;
        const cs = getComputedStyle(q);
        return { bg: cs.backgroundColor, shadow: cs.boxShadow, label: chip.textContent?.trim() ?? "", chipBg: getComputedStyle(chip).backgroundColor, chipFg: getComputedStyle(chip).color };
      });
      expect(r.bg, `${id}: the query section's ground`).toBe(w.bg);
      expect(r.label, `${id}: the chip`).toBe(w.label);
      if (id === "fx-fresh") expect(r.shadow, "not queried is white WITH a hairline").toContain("inset");
      if (id === "fx-none") {
        expect(r.chipBg, "YOUR MOVE is an ink chip").toBe("rgb(28, 19, 15)");
        expect(r.chipFg).toBe("rgb(255, 255, 255)");
      }
      await closeCard(page);
      bump(2);
    }
    bump(3);
  });

  test("the primary button by stage — and past the expected date the nudge carries Record a response", async ({ page }) => {
    const scope = await openLab(page);
    const want: Record<string, { label: string; act: string; secondary?: string }> = {
      "fx-bare": { label: "Answer the offer", act: "offer" },
      "fx-none": { label: "Send the partial", act: "sent" },
      "fx-shut-live": { label: "Send the full", act: "sent" },
      "fx-long": { label: "Send a nudge", act: "nudge", secondary: "Record a response" },
      "fx-stub0-live": { label: "Record a response", act: "resp" },
      "fx-fresh": { label: "Log a query", act: "log" },
      "fx-reopen": { label: "Remind me when they reopen", act: "remind" },
      "fx-shut": { label: "Open in Query Centre", act: "qc" },
    };
    for (const [id, w] of Object.entries(want)) {
      await openFromRow(page, scope, id);
      const r = await page.evaluate(() => {
        const p = document.querySelector('[data-ac="primary"]') as HTMLElement | null;
        const s = document.querySelector('[data-ac="secondary"]') as HTMLElement | null;
        return { label: p?.textContent?.trim() ?? "", act: p?.dataset.act ?? "", sec: s?.textContent?.trim() ?? null };
      });
      expect(r.label, `${id}: the primary`).toBe(w.label);
      expect(r.act, `${id}: what it opens`).toBe(w.act);
      expect(r.sec, `${id}: the second button`).toBe(w.secondary ?? null);
      await closeCard(page);
      bump(3);
    }
  });

  test("‹ › and ← → step through the list's order: the count, the agent, the SAME session, the row's ring", async ({ page }) => {
    const scope = await openLab(page);
    const ids = await rowIds(page, scope);
    expect(ids.length).toBeGreaterThan(4);
    await openFromRow(page, scope, ids[1]);
    const r0 = await handle(page).current();
    expect(await page.textContent(`${CARD} [data-ac="count"]`)).toBe(`2 of ${ids.length}`);
    await page.click(`${CARD} [data-ac="next"]`);
    await expect(page.locator(`${CARD} [data-ac="count"]`)).toHaveText(`3 of ${ids.length}`);
    const r1 = await handle(page).current();
    expect(r1?.agentId, "› did not move to the next agent in the list's order").toBe(ids[2]);
    expect(r1?.seq, "a step re-opened the card — it must move the same session").toBe(r0?.seq);
    const ring = await page.evaluate((scope) => [...document.querySelectorAll<HTMLElement>(`${scope} [data-clv="row"][aria-current="true"]`)].map((r) => r.dataset.agentCard), scope);
    expect(ring, "the row's ring did not move with the card").toEqual([ids[2]]);
    /* the keys, when no field has focus */
    await page.keyboard.press("ArrowLeft");
    await expect(page.locator(`${CARD} [data-ac="count"]`)).toHaveText(`2 of ${ids.length}`);
    expect((await handle(page).current())?.agentId).toBe(ids[1]);
    await page.keyboard.press("ArrowLeft");
    await expect(page.locator(`${CARD} [data-ac="count"]`)).toHaveText(`1 of ${ids.length}`);
    expect(await page.isDisabled(`${CARD} [data-ac="prev"]`), "‹ stays live at the first agent").toBe(true);
    await closeCard(page);
    /* no order, no arrows */
    await handle(page).open(ids[0], { from: "hk" });
    await page.waitForSelector(CARD);
    expect(await page.locator(`${CARD} [data-ac="prev"], ${CARD} [data-ac="count"]`).count(), "arrows without an order").toBe(0);
    await closeCard(page);
    bump(10);
  });

  test("the stars save at once with Undo in the foot — and Undo puts back NO rating at all", async ({ page }) => {
    const scope = await openLab(page);
    const rating = () => page.evaluate((scope) => document.querySelector<HTMLElement>(`${scope} [data-agent-card="fx-sparse"]`)?.dataset.rating, scope);
    expect(await rating(), "precondition: the sparse agent is unrated").toBe("none");
    await openFromRow(page, scope, "fx-sparse");
    await page.click(`${CARD} [data-ac="stars"] button:nth-child(3)`);
    await expect(page.locator(`${CARD} [data-ac="foot"].on`)).toContainText("Rated 3 stars.");
    expect(await rating(), "the row behind the card did not take the rating").toBe("3");
    await page.click(`${CARD} [data-ac="undo"]`);
    await expect.poll(rating, { message: "Undo did not put back the absence — a stand-in value was written" }).toBe("none");
    expect(await page.locator(`${CARD} [data-ac="stars"] button[aria-pressed="true"]`).count()).toBe(0);
    /* the current star again clears it */
    await page.click(`${CARD} [data-ac="stars"] button:nth-child(4)`);
    await expect.poll(rating).toBe("4");
    await page.click(`${CARD} [data-ac="stars"] button:nth-child(4)`);
    await expect(page.locator(`${CARD} [data-ac="foot"].on`)).toContainText("Rating cleared.");
    await expect.poll(rating).toBe("none");
    await closeCard(page);
    bump(8);
  });

  test("the wishlist stamp: quiet, 'mark checked' only on hover or focus, today with Undo — and never lastCheckedDate", async ({ page }) => {
    const scope = await openLab(page);
    /* a wishlist never checked reads "not checked yet" — the agent's lastCheckedDate (set on every
       fixture agent) must not stand in for it */
    await openFromRow(page, scope, "fx-long");
    expect((await page.textContent(`${CARD} [data-ac="stamp"]`))?.replace("✓ mark checked", "").trim(),
      "a never-checked wishlist borrowed a date — the stamp reads mswlCheckedAt and nothing else").toBe("not checked yet");
    await closeCard(page);

    await openFromRow(page, scope, "fx-stale");
    const stamp = () => page.evaluate(() => (document.querySelector('[data-ac="stamp"]')?.firstChild?.textContent ?? "").trim());
    expect(await stamp()).toBe("checked Jan 2026");
    const op = () => page.evaluate(() => getComputedStyle(document.querySelector('[data-ac="mark-checked"]')!).opacity);
    await page.mouse.move(5, 5);
    await page.waitForTimeout(250);
    expect(await op(), "'mark checked' shows at rest — the stamp is meant to be quiet").toBe("0");
    await page.hover(`${CARD} [data-ac="s-wishlist"]`);
    await page.waitForTimeout(250);
    expect(await op(), "'mark checked' does not appear on hover").toBe("1");
    await page.click(`${CARD} [data-ac="mark-checked"]`);
    await expect.poll(stamp).toBe("checked today");
    await expect(page.locator(`${CARD} [data-ac="foot"].on`)).toContainText("Wishlist marked as checked today.");
    await page.click(`${CARD} [data-ac="undo"]`);
    await expect.poll(stamp, { message: "Undo did not put the earlier stamp back" }).toBe("checked Jan 2026");
    await closeCard(page);
    bump(7);
  });

  test("Escape's cascade: an open ⋯ menu first, an open note composer next (its words kept), the card last", async ({ page }) => {
    const scope = await openLab(page);
    await openFromRow(page, scope, "fx-long");
    await page.click(`${CARD} [data-ac="more"]`);
    await expect(page.locator(`${CARD} [data-ac="menu"]`)).toBeVisible();
    await page.keyboard.press("Escape");
    expect(await page.locator(`${CARD} [data-ac="menu"]`).count(), "Escape left the menu open").toBe(0);
    expect(await page.locator(CARD).count(), "Escape on an open menu closed the card").toBe(1);
    await page.click(`${CARD} [data-ac="open-compose"]`);
    await page.keyboard.type("Met at Harrogate");
    await page.keyboard.press("Escape");
    expect(await page.locator(`${CARD} [data-ac="compose"] textarea`).count(), "Escape left the composer open").toBe(0);
    expect(await page.locator(CARD).count(), "Escape in the composer closed the card").toBe(1);
    await page.click(`${CARD} [data-ac="open-compose"]`);
    expect(await page.inputValue(`${CARD} [data-ac="compose"] textarea`), "closing the composer lost the words").toBe("Met at Harrogate");
    await page.keyboard.press("Escape");
    await closeCard(page);
    bump(6);
  });

  test("E opens the editor, and stands down in a field", async ({ page }) => {
    const scope = await openLab(page);
    await openFromRow(page, scope, "fx-long");
    await page.click(`${CARD} [data-ac="open-compose"]`);
    await page.keyboard.type("e");
    expect(await page.locator('[data-clv="profile"].clv-pcard--edit').count(), "E in a field opened the editor").toBe(0);
    expect(await page.inputValue(`${CARD} [data-ac="compose"] textarea`)).toBe("e");
    await page.keyboard.press("Escape"); // the composer
    await page.keyboard.press("e");
    await expect(page.locator('[data-clv="profile"].clv-pcard--edit'), "E did not open the editor").toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(CARD), "leaving the editor did not land on the quick view").toBeVisible();
    await closeCard(page);
    bump(4);
  });

  test("a torn slip and '+ Website' open the editor at their field, and leaving it lands on the quick view", async ({ page }) => {
    const scope = await openLab(page);
    await openFromRow(page, scope, "fx-none");
    await page.click(`${CARD} [data-ac="torn-wishlist"] button`);
    await expect(page.locator('[data-clv="profile"].clv-pcard--edit'), "the slip's Add opened no editor").toBeVisible();
    expect(await handle(page).current().then((r) => r?.agentId)).toBe("fx-none");
    await page.click('[data-clv="profile"] .clv-cx');
    await expect(page.locator(CARD)).toBeVisible();
    await closeCard(page);
    await openFromRow(page, scope, "fx-shut-live");
    await page.click(`${CARD} [data-ac="add-website"]`);
    await expect(page.locator('[data-clv="profile"].clv-pcard--edit'), "'+ Website' opened no editor").toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(CARD)).toBeVisible();
    await closeCard(page);
    bump(5);
  });

  test("the History is shut until asked, and lists an undated stage ONCE", async ({ page }) => {
    const scope = await openLab(page);
    await openFromRow(page, scope, "fx-none");
    expect(await page.locator(`${CARD} [data-ac="histbody"]`).count(), "the history is open before anyone asked").toBe(0);
    await page.click(`${CARD} [data-ac="hist"]`);
    const steps = await page.evaluate(() => [...document.querySelectorAll('[data-ac="trail"] li')].map((l) => (l.textContent ?? "").trim()));
    expect(steps.length).toBeGreaterThan(0);
    expect(steps.filter((s) => s.startsWith("Partial requested")), `the stage is listed twice: ${JSON.stringify(steps)}`).toHaveLength(1);
    expect(steps[steps.length - 1]).toMatch(/not dated$/);
    expect(await page.getAttribute(`${CARD} [data-ac="hist"]`, "aria-expanded")).toBe("true");
    await closeCard(page);
    bump(5);
  });

  test("Remind me when they reopen adds the dated To-do — Housekeeping's gap closes — and Undo reopens it", async ({ page }) => {
    const scope = await openLab(page);
    const listed = () => page.evaluate((s) => !!document.querySelector(`${s} [data-clv="hk-sec"][data-gap="reopen"] [data-agent="fx-reopen"]`), scope);
    expect(await listed(), "precondition: the dated closed door is in Housekeeping").toBe(true);
    await openFromRow(page, scope, "fx-reopen");
    await page.click(`${CARD} [data-ac="primary"]`);
    await expect(page.locator(`${CARD} [data-ac="foot"].on`)).toContainText("Reminder added to To-do for 1 Nov: check Tomas Keller has reopened.");
    await expect.poll(listed, { message: "the reminder did not close Housekeeping's reopen gap" }).toBe(false);
    await page.click(`${CARD} [data-ac="undo"]`);
    await expect.poll(listed, { message: "Undo did not take the reminder away" }).toBe(true);
    await closeCard(page);
    bump(4);
  });

  test("a note that does not land keeps its words — the lab has no account to write to", async ({ page }) => {
    /* ⚠️ THE PRECONDITION IS THE LAB ITSELF: it renders the real host with no signed-in account, so
       the notes write is refused — the one place the failure branch can be driven without breaking
       anything on purpose */
    const scope = await openLab(page);
    await openFromRow(page, scope, "fx-long");
    await page.click(`${CARD} [data-ac="open-compose"]`);
    await page.keyboard.type("A note that cannot land");
    await page.click(`${CARD} [data-ac="save-note"]`);
    await expect(page.locator(`${CARD} [data-ac="foot"].on`), "a refused note said nothing").toContainText("Couldn’t save the note", { timeout: 15_000 });
    expect(await page.inputValue(`${CARD} [data-ac="compose"] textarea`), "a refused note lost its words").toBe("A note that cannot land");
    await page.keyboard.press("Escape");
    await closeCard(page);
    bump(2);
  });

  test("a note composed in place lands as the latest — and is removed again in the same run", async ({ page }) => {
    await openRoute(page, "/agents", { width: 1440, height: 900 });
    const scope = await visiblePage(page, ".agl-wpg");
    const pick = await page.evaluate((scope) => document.querySelector<HTMLElement>(`${scope} [data-clv="row"]`)?.dataset.agentCard ?? null, scope);
    expect(pick, "population first — no agent on this account").not.toBeNull();
    if (!pick) return;
    const { db, uid } = await harnessDb();
    const agentRef = doc(db, "users", uid, "agents", pick);
    const before = (await getDoc(agentRef)).data() ?? {};
    const text = `zz probe note ${Date.now()}`;
    try {
      await page.click(`${scope} [data-agent-card="${pick}"]`);
      await page.waitForSelector(CARD);
      await page.click(`${CARD} [data-ac="open-compose"]`);
      await page.keyboard.type(text);
      await page.click(`${CARD} [data-ac="save-note"]`);
      await expect(page.locator(`${CARD} [data-ac="foot"].on`)).toContainText("Note saved.", { timeout: 15_000 });
      await expect(page.locator(`${CARD} [data-ac="latest-note"] p`), "the saved note is not the latest").toHaveText(text, { timeout: 15_000 });
      expect(await page.locator(`${CARD} [data-ac="compose"] textarea`).count(), "the composer stayed open after a save").toBe(0);
      await closeCard(page);
      bump(3);
    } finally {
      /* ⚠️ RESTORE IN THE SAME RUN, WHATEVER THE CASE SAID: the note and the card's cached preview */
      for (const d of (await getDocs(fsQuery(collection(db, "users", uid, "agents", pick, "notes"), where("text", "==", text)))).docs) await deleteDoc(d.ref);
      await updateDoc(agentRef, { notePreview: typeof before.notePreview === "string" ? before.notePreview : deleteField() });
      const left = (await getDocs(fsQuery(collection(db, "users", uid, "agents", pick, "notes"), where("text", "==", text)))).size;
      expect(left, "THE PROBE NOTE WAS NOT REMOVED — the account has been changed").toBe(0);
      bump();
    }
  });

  test("the ⋯ menu names only what the card can do — over another page 'Open in Contact list' comes first, and takes the card there", async ({ page }) => {
    await openRoute(page, "/agents", { width: 1440, height: 900 });
    const scope = await visiblePage(page, ".agl-wpg");
    /* an agent with a query and an email, so every item has a subject */
    const pick = await page.evaluate((scope) => {
      const r = document.querySelector<HTMLElement>(`${scope} [data-clv="row"]:not([data-stand="none"])`);
      return r?.dataset.agentCard ?? null;
    }, scope);
    expect(pick, "population first — no queried agent on this account").not.toBeNull();
    if (!pick) return;
    await page.click(`${scope} [data-agent-card="${pick}"]`);
    await page.waitForSelector(CARD);
    await page.click(`${CARD} [data-ac="more"]`);
    const onList = await page.evaluate(() => [...document.querySelectorAll('[data-ac="menu"] button')].map((b) => b.textContent?.trim()));
    expect(onList, "on the Contact list the menu offers to open the Contact list").not.toContain("Open in Contact list");
    expect(onList).toContain("Open in Query Centre");
    await page.keyboard.press("Escape");
    await closeCard(page);

    await openRoute(page, "/queries", { width: 1440, height: 900 });
    await handle(page).open(pick);
    await page.waitForSelector(CARD);
    await page.click(`${CARD} [data-ac="more"]`);
    const over = await page.evaluate(() => [...document.querySelectorAll('[data-ac="menu"] button')].map((b) => b.textContent?.trim()));
    expect(over[0], "over another page, 'Open in Contact list' is the first item").toBe("Open in Contact list");
    await page.click(`${CARD} [data-ac="menu-contacts"]`);
    await page.waitForFunction(() => window.location.pathname === "/agents");
    await expect(page.locator(CARD), "the card did not travel to the Contact list").toBeVisible();
    expect((await handle(page).current())?.agentId).toBe(pick);
    await closeCard(page);
    bump(6);
  });
});
