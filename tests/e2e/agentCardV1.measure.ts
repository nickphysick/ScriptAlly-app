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
 *
 * Phase 3: the EDITOR — the same card widened to 780 in four tabs, as tall on every tab, by the
 * mock's ruler; the inputs that never store typed text where the app keeps a list; the reply time's
 * origin rule; Escape's cascade through every popup; the carried-over answers; a save; and the
 * `socials` entries a save must leave byte for byte.
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
/** the editor — the same card, widened (P3); `data-ae-mode` says which: edit or new */
const EDITOR = '[data-ac="card"] [data-ae-mode="edit"]';
const ADDCARD = '[data-ac="card"] [data-ae-mode="new"]';
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

  /* ⚠️ RETARGETED (P3): the old form's country picker is gone with the form; the stack's law is
     unchanged — a list open inside the card closes before the card hears the key. */
  test("one Escape stack: an open country list closes first, the editor second, the card third", async ({ page }) => {
    await openRoute(page, "/agents", { width: 1440, height: 900 });
    const scope = await visiblePage(page, ".agl-wpg");
    await page.click(`${scope} [data-clv="row"]`);
    await page.waitForSelector(CARD);
    await page.click(`${CARD} [data-ac="edit"]`);
    await page.waitForSelector(EDITOR);
    await page.click(`${CARD} [data-ae="country"] [data-cymore]`);
    await expect(page.locator(`${CARD} [data-ae="country-list"]`)).toBeVisible();
    await page.keyboard.press("Escape");
    const s1 = await page.evaluate(() => ({
      list: !!document.querySelector('[data-ae="country-list"]'),
      editing: !!document.querySelector('[data-ae-mode="edit"]'),
    }));
    expect(s1.list, "Escape left the country list open").toBe(false);
    expect(s1.editing, "Escape on an open list reached the CARD — the list is not above it on the stack").toBe(true);
    await page.keyboard.press("Escape");
    await expect(page.locator(`${CARD} [data-ac="head"]`), "the second Escape did not return the card to its quick view").toBeVisible();
    expect(await page.locator(EDITOR).count()).toBe(0);
    await page.keyboard.press("Escape");
    await expect(page.locator(CARD), "the third Escape did not close the card").toHaveCount(0, { timeout: 5_000 });
    bump(5);
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
    expect(await page.locator(EDITOR).count(), "E in a field opened the editor").toBe(0);
    expect(await page.inputValue(`${CARD} [data-ac="compose"] textarea`)).toBe("e");
    await page.keyboard.press("Escape"); // the composer
    await page.keyboard.press("e");
    await expect(page.locator(EDITOR), "E did not open the editor").toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(CARD), "leaving the editor did not land on the quick view").toBeVisible();
    await closeCard(page);
    bump(4);
  });

  test("a torn slip and '+ Website' open the editor at their field, and leaving it lands on the quick view", async ({ page }) => {
    const scope = await openLab(page);
    await openFromRow(page, scope, "fx-none");
    await page.click(`${CARD} [data-ac="torn-wishlist"] button`);
    await expect(page.locator(EDITOR), "the slip's Add opened no editor").toBeVisible();
    expect(await handle(page).current().then((r) => r?.agentId)).toBe("fx-none");
    /* P3: it opens ON that tab, with the field focused (the door's promise) */
    expect(await page.getAttribute(`${CARD} [data-tab="want"]`, "aria-selected"), "the slip opened the editor on another tab").toBe("true");
    await expect.poll(() => page.evaluate(() => document.activeElement?.getAttribute("data-ae")), { message: "the wishlist is not focused" }).toBe("wishlist");
    await page.click(`${CARD} [data-ae="cancel"]`);
    await expect(page.locator(`${CARD} [data-ac="head"]`)).toBeVisible();
    await closeCard(page);
    await openFromRow(page, scope, "fx-shut-live");
    await page.click(`${CARD} [data-ac="add-website"]`);
    await expect(page.locator(EDITOR), "'+ Website' opened no editor").toBeVisible();
    expect(await page.getAttribute(`${CARD} [data-tab="who"]`, "aria-selected")).toBe("true");
    await expect.poll(() => page.evaluate(() => document.activeElement?.getAttribute("data-ae")), { message: "the website field is not focused" }).toBe("website");
    await page.keyboard.press("Escape");
    await expect(page.locator(`${CARD} [data-ac="head"]`)).toBeVisible();
    await closeCard(page);
    bump(9);
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

/* ══════════════════════════════════ phase 3 — the editor ══════════════════════════════════ */

/** open the editor through the store, the way a door does, and let the entrance finish */
async function openEditor(page: Page, id: string, tab = "who", extra: Record<string, unknown> = {}) {
  await handle(page).open(id, { tab, ...extra });
  await page.waitForSelector(EDITOR);
  await settle(page);
}
const tabTo = async (page: Page, tab: string) => {
  await page.click(`${CARD} [data-ae="tabs"] [data-tab="${tab}"]`);
  await expect(page.locator(`${CARD} [data-sec="${tab}"].on`)).toHaveCount(1);
};
const sum = (page: Page) => page.evaluate(() => (document.querySelector('[data-ae="sum"]')?.textContent ?? "").trim());
const chips = (page: Page) => page.evaluate(() => [...document.querySelectorAll('[data-ae="genres"] .ae-chip')].map((c) => (c.firstChild?.textContent ?? "").trim()));
const stepText = (page: Page, ae: string) => page.evaluate((ae) => (document.querySelector(`[data-ae="${ae}"] b`)?.textContent ?? "").trim(), ae);
const saveDisabled = (page: Page) => page.evaluate(() => (document.querySelector('[data-ae="save"]') as HTMLButtonElement | null)?.disabled ?? null);
/** leave a dirty editor through its own ask — nothing written */
async function discard(page: Page) {
  await page.click(`${CARD} [data-ae="cancel"]`);
  await page.click(`${CARD} [data-ae="discard"]`);
  await expect(page.locator(EDITOR)).toHaveCount(0);
}
/** the card's box and the editor's furniture — the mock's selectors or the app's */
const edGeom = (page: Page, sel: { card: string; tabs: string; foot: string }) => page.evaluate((sel) => {
  const r = (s: string) => { const b = document.querySelector(s)!.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; };
  return { card: r(sel.card), tabs: r(sel.tabs), foot: r(sel.foot) };
}, sel);

test.describe("phase 3 — the editor", () => {
  for (const vp of [{ width: 1440, height: 900 }, { width: 1280, height: 800 }] as const) {
    test(`the editor is the mock's by one ruler at ${vp.width}: 780 wide, ONE height on all four tabs, the tabs 50, the foot 55`, async ({ page }) => {
      /* the oracle first, same browser, same viewport */
      await page.setViewportSize(vp);
      await page.goto(MOCK);
      await page.waitForTimeout(400);
      await page.evaluate(() => {
        const w = window as unknown as { __C: { n: string; id: number }[]; __ac: { open: (id: number, o: unknown) => void } };
        w.__ac.open(w.__C.find((c) => c.n === "Aisha Kapoor")!.id, { lift: true });
      });
      await page.waitForTimeout(400);
      const mock: Record<string, Awaited<ReturnType<typeof edGeom>>> = {};
      for (const t of ["who", "want", "work", "notes"]) {
        await page.evaluate((t) => (window as unknown as { __ac: { openEditor: (k: string) => void } }).__ac.openEditor(t), t);
        await page.waitForTimeout(450);
        mock[t] = await edGeom(page, { card: "#ac", tabs: ".ae-tabs", foot: "#acFoot" });
      }
      expect(mock.who.card.w, "the mock did not widen into its editor").toBeGreaterThan(700);

      await openLab(page, vp);
      await openEditor(page, "fx-long");
      const app: Record<string, Awaited<ReturnType<typeof edGeom>>> = {};
      for (const t of ["who", "want", "work", "notes"]) {
        await tabTo(page, t);
        app[t] = await edGeom(page, { card: CARD, tabs: `${CARD} [data-ae="tabs"]`, foot: `${CARD} [data-ae="foot"]` });
      }
      const hs = Object.values(app).map((g) => g.card.h);
      expect(Math.max(...hs) - Math.min(...hs), `the editor changes height between tabs: ${hs.join(", ")}`).toBeLessThanOrEqual(1);
      expect(Math.abs(app.who.card.w - 780), `the editor is ${app.who.card.w} wide, not 780`).toBeLessThanOrEqual(2);
      expect(Math.abs(app.who.card.w - mock.who.card.w), "the editor's width against the mock's").toBeLessThanOrEqual(1);
      expect(Math.abs(app.who.card.h - mock.who.card.h), `the editor is ${app.who.card.h} tall against the mock's ${mock.who.card.h}`).toBeLessThanOrEqual(2);
      expect(Math.abs(app.who.card.x - mock.who.card.x), "the editor's x against the mock's").toBeLessThanOrEqual(1);
      expect(Math.abs(app.who.card.y - mock.who.card.y), "the editor's y against the mock's").toBeLessThanOrEqual(1.5);
      expect(Math.abs(app.who.tabs.h - 50), `the tabs are ${app.who.tabs.h} tall`).toBeLessThanOrEqual(1);
      expect(Math.abs(app.who.foot.h - 55), `the foot is ${app.who.foot.h} tall`).toBeLessThanOrEqual(1);
      expect(Math.abs(app.who.tabs.h - mock.who.tabs.h)).toBeLessThanOrEqual(1);
      expect(Math.abs(app.who.foot.h - mock.who.foot.h)).toBeLessThanOrEqual(1);
      /* the editor's band is the same slate — the token resolved first (the two-nothings guard) */
      const band = await page.evaluate(() => {
        const p = document.createElement("div");
        p.style.background = "var(--clv-slate)";
        document.body.appendChild(p);
        const slate = getComputedStyle(p).backgroundColor;
        p.remove();
        return { slate, band: getComputedStyle(document.querySelector('[data-ae="band"]')!).backgroundColor };
      });
      expect(band.slate, "--clv-slate resolves to nothing").toBe("rgb(95, 123, 147)");
      expect(band.band, "the editor's band is not the slate").toBe(band.slate);
      await page.keyboard.press("Escape");
      await closeCard(page);
      bump(12);
    });
  }

  test("the inputs hand back the app's own values: no date box, no free text where there is a list, the sample steps and snaps, and Save waits on an empty Other", async ({ page }) => {
    await openLab(page);
    await openEditor(page, "fx-none");
    const dateBoxes = () => page.locator(`${CARD} input[type="date"]`).count();
    expect(await dateBoxes(), "a bare date box in the card").toBe(0);

    /* the genre field: typed text is a FILTER — Tab away and nothing is added */
    await tabTo(page, "want");
    const g0 = await chips(page);
    await page.click(`${CARD} [data-ae="genre-input"]`);
    await page.keyboard.type("Zzzq");
    await page.keyboard.press("Tab");
    expect(await chips(page), "typed genre text was stored as a genre").toEqual(g0);
    expect(await sum(page), "typed genre text counted as a change").toBe("No changes yet.");

    /* the country: the search filters; nothing typed is kept */
    await tabTo(page, "who");
    const c0 = await page.evaluate(() => document.querySelector('[data-ae="country"] [aria-pressed="true"]')?.getAttribute("data-cty") ?? "");
    expect(await page.locator(`${CARD} [data-ae="country"] input`).count(), "a free input among the quick picks").toBe(0);
    await page.click(`${CARD} [data-ae="country"] [data-cymore]`);
    await page.keyboard.type("Narnia");
    await page.keyboard.press("Escape");
    const c1 = await page.evaluate(() => document.querySelector('[data-ae="country"] [aria-pressed="true"]')?.getAttribute("data-cty") ?? "");
    expect(c1, "the country search stored what was typed").toBe(c0);
    expect(await sum(page)).toBe("No changes yet.");

    /* how to submit: the enum's four, labelled as the drawer labels them, and no input at all */
    await tabTo(page, "work");
    expect(await page.locator(`${CARD} [data-ae="method"] input`).count()).toBe(0);
    expect(await page.evaluate(() => [...document.querySelectorAll('[data-ae="method"] button')].map((b) => b.textContent?.trim())))
      .toEqual(["Email", "QueryManager", "Online form", "Post"]);
    /* the reopening date is text with a link, and the calendar is buttons — even open */
    await page.click(`${CARD} [data-ae="door"] [data-v="closed"]`);
    await expect(page.locator(`${CARD} [data-ae="calendar"]`)).toBeVisible();
    expect(await dateBoxes(), "the calendar is a bare date box").toBe(0);
    await page.keyboard.press("Escape");
    await page.click(`${CARD} [data-ae="door"] [data-v="open"]`);

    /* the sample: each unit steps in its own size, and switching unit snaps to its default */
    await tabTo(page, "want");
    if (!(await page.locator(`${CARD} [data-mt-row="smp"]:not(.off)`).count())) await page.click(`${CARD} [data-mt="smp"]`);
    const steps: string[] = [];
    for (const u of ["Chapters", "Pages", "Words"]) {
      await page.click(`${CARD} [data-ae="unit"] [data-v="${u}"]`);
      steps.push(await stepText(page, "smp-step"));
      await page.click(`${CARD} [data-ae="smp-step"] [data-d="1"]`);
      steps.push(await stepText(page, "smp-step"));
    }
    expect(steps, "the sample's snap and step").toEqual(["First 3", "First 4", "First 10", "First 15", "First 5,000", "First 5,500"]);

    /* Other ticked and empty: Save waits, the foot names why, the tab carries the rust dot */
    await page.click(`${CARD} [data-mt="oth"]`);
    expect(await saveDisabled(page), "Save is live with Other ticked and empty").toBe(true);
    expect(await sum(page)).toBe("Say what the other material is, or untick it");
    expect(await page.getAttribute(`${CARD} [data-dot="want"]`, "class")).toContain("err");
    await page.fill(`${CARD} [data-ae="other"]`, "Author photo");
    expect(await saveDisabled(page), "Save stayed disabled once Other said something").toBe(false);
    await discard(page);
    await closeCard(page);
    bump(15);
  });

  test("the reply time starts at Unknown: + gives 6, the colleagues' window is offered only when they state one, and nothing returns it to Unknown", async ({ page }) => {
    await openLab(page);
    /* an agency with no colleague on the list */
    await openEditor(page, "fx-sparse", "work");
    expect(await stepText(page, "weeks")).toBe("Unknown");
    expect(await page.locator(`${CARD} [data-ae="use-weeks"]`).count(), "a borrowed window offered with no colleague to borrow from").toBe(0);
    expect(await page.textContent(`${CARD} [data-vl="weeks"]`)).toContain("Press + to start at 6 weeks.");
    await page.click(`${CARD} [data-ae="weeks"] [data-d="1"]`);
    expect(await stepText(page, "weeks"), "the first + must go to 6").toBe("6 weeks");
    for (let i = 0; i < 8; i++) {
      const minus = page.locator(`${CARD} [data-ae="weeks"] [data-d="-1"]`);
      if (await minus.isDisabled()) break;
      await minus.click();
    }
    expect(await stepText(page, "weeks"), "the stepper went past one week").toBe("1 week");
    expect(await page.isDisabled(`${CARD} [data-ae="weeks"] [data-d="-1"]`), "the minus is live at one week — a road back to Unknown").toBe(true);
    expect(await page.evaluate(() => [...document.querySelectorAll('[data-sec="work"] button')].some((b) => /unknown/i.test(b.textContent ?? ""))),
      "a control offers Unknown once a window is set").toBe(false);
    await discard(page);
    await closeCard(page);

    /* a new agent at an agency whose colleague STATES a window: borrow it in one press */
    await page.evaluate(() => (window as unknown as { __saAgentCard: { openNew: () => void } }).__saAgentCard.openNew());
    await page.waitForSelector(ADDCARD);
    await settle(page);
    await page.fill(`${CARD} [data-ae="agency"]`, "The Lantern Agency");
    await page.keyboard.press("Tab");
    await tabTo(page, "work");
    await expect(page.locator(`${CARD} [data-ae="use-weeks"]`)).toHaveText("Use 6 weeks · others at The Lantern Agency");
    await page.click(`${CARD} [data-ae="use-weeks"]`);
    expect(await stepText(page, "weeks")).toBe("6 weeks");
    await page.click(`${CARD} [data-ae="cancel"]`);
    await page.click(`${CARD} [data-ae="discard"]`);
    await expect(page.locator(CARD)).toHaveCount(0);

    /* …and a colleague whose only figure is the stub 0 states nothing */
    await page.evaluate(() => (window as unknown as { __saAgentCard: { openNew: () => void } }).__saAgentCard.openNew());
    await page.waitForSelector(ADDCARD);
    await settle(page);
    await page.fill(`${CARD} [data-ae="agency"]`, "Voss Literary");
    await page.keyboard.press("Tab");
    await tabTo(page, "work");
    expect(await page.locator(`${CARD} [data-ae="use-weeks"]`).count(), "the stub 0 was offered as a window").toBe(0);
    await page.click(`${CARD} [data-ae="cancel"]`);
    await page.click(`${CARD} [data-ae="discard"]`);
    await expect(page.locator(CARD)).toHaveCount(0);
    bump(10);
  });

  test("Escape's cascade in the editor: each popup closes only itself — the genre list included — a dirty editor asks, and the backdrop never discards", async ({ page }) => {
    const scope = await openLab(page);
    await openEditor(page, "fx-long", "want");
    const editing = () => page.locator(EDITOR).count();
    /* the genre list, opened by focus */
    await page.click(`${CARD} [data-ae="genre-input"]`);
    await expect(page.locator(`${CARD} [data-ae="genre-input-list"]`)).toBeVisible();
    await page.keyboard.press("Escape");
    expect(await page.locator(`${CARD} [data-ae="genre-input-list"]`).count(), "Escape left the genre list open").toBe(0);
    expect(await editing(), "Escape in the genre list closed the editor — the draft would be gone").toBe(1);
    /* …and with words in it */
    await page.keyboard.type("Cri");
    await expect(page.locator(`${CARD} [data-ae="genre-input-list"]`)).toBeVisible();
    await page.keyboard.press("Escape");
    expect(await editing()).toBe(1);
    expect(await sum(page)).toBe("No changes yet.");
    /* the agency list */
    await tabTo(page, "who");
    await page.click(`${CARD} [data-ae="agency"]`);
    await expect(page.locator(`${CARD} [data-ae="agency-list"]`)).toBeVisible();
    await page.keyboard.press("Escape");
    expect(await page.locator(`${CARD} [data-ae="agency-list"]`).count()).toBe(0);
    expect(await editing()).toBe(1);
    /* the calendar — and closing the door makes the draft dirty */
    await tabTo(page, "work");
    await page.click(`${CARD} [data-ae="door"] [data-v="closed"]`);
    await expect(page.locator(`${CARD} [data-ae="calendar"]`)).toBeVisible();
    await page.keyboard.press("Escape");
    expect(await page.locator(`${CARD} [data-ae="calendar"]`).count(), "Escape left the calendar open").toBe(0);
    expect(await editing()).toBe(1);
    /* dirty: Escape asks, and the changed tab's dot pulses */
    await page.keyboard.press("Escape");
    await expect(page.locator(`${CARD} [data-ae="ask"]`), "a dirty editor left without asking").toContainText("Discard your changes to Aisha Kapoor?");
    expect(await page.getAttribute(`${CARD} [data-dot="work"]`, "class"), "the changed tab's dot did not pulse").toContain("nag");
    /* Escape on the ask closes the ask, not the editor */
    await page.keyboard.press("Escape");
    expect(await page.locator(`${CARD} [data-ae="ask"]`).count()).toBe(0);
    expect(await sum(page), "the ask did not give the summary back").toMatch(/^1 change\b/);
    /* the backdrop asks too — never a silent discard */
    await page.mouse.click(20, 450);
    await expect(page.locator(`${CARD} [data-ae="ask"]`), "the backdrop discarded a dirty draft").toBeVisible();
    await page.click(`${CARD} [data-ae="discard"]`);
    await expect(page.locator(`${CARD} [data-ac="head"]`), "Discard did not return to the quick view").toBeVisible();
    expect(await page.getAttribute(`${scope} [data-agent-card="fx-long"]`, "data-door"), "a discarded draft was written").toBe("open");
    await closeCard(page);
    bump(15);
  });

  test("answers carried over open the editor dirty, on their tab, saying so — until the next edit", async ({ page }) => {
    await openLab(page);
    await openEditor(page, "fx-long", "want", { prefill: { genres: ["Crime", "Gothic"] } });
    expect(await page.getAttribute(`${CARD} [data-tab="want"]`, "aria-selected")).toBe("true");
    expect(await chips(page), "the carried genres are not the draft's").toEqual(["Crime", "Gothic"]);
    expect(await sum(page)).toBe("Carried over what you picked. Save on the card when you’re done.");
    expect(await saveDisabled(page), "a carried-over draft cannot be saved").toBe(false);
    expect(await page.getAttribute(`${CARD} [data-dot="want"]`, "class")).toContain("ch");
    await page.click(`${CARD} [data-ae="genres"] button[aria-label="Remove Gothic"]`);
    expect(await sum(page), "the carry-over line outlived the next edit").toMatch(/^\d+ changes?/);
    await discard(page);
    /* …and the pencil later starts CLEAN: the carried answers belonged to that opening */
    await page.click(`${CARD} [data-ac="edit"]`);
    await page.waitForSelector(EDITOR);
    expect(await sum(page), "the carried answers came back on the next opening").toBe("No changes yet.");
    await page.keyboard.press("Escape");
    await closeCard(page);
    bump(8);
  });

  test("the add card: three tabs and no Notes, a name OR an agency is enough, a duplicate blocks with its way through, and a pasted link files itself", async ({ page }) => {
    await openLab(page);
    await page.evaluate(() => (window as unknown as { __saAgentCard: { openNew: () => void } }).__saAgentCard.openNew());
    await page.waitForSelector(ADDCARD);
    await settle(page);
    expect(await page.evaluate(() => [...document.querySelectorAll('[data-ae="tabs"] [data-tab]')].map((t) => t.getAttribute("data-tab"))))
      .toEqual(["who", "want", "work"]);
    expect((await page.textContent(`${CARD} [data-ae="band-chip"]`))?.trim()).toBe("New agent");
    await expect.poll(() => page.evaluate(() => document.activeElement?.getAttribute("data-ae")), { message: "the add card does not open name-focused" }).toBe("name");
    expect(await saveDisabled(page), "Add is live on an empty card").toBe(true);
    expect(await sum(page)).toBe("A name or an agency is needed");
    await page.fill(`${CARD} [data-ae="agency"]`, "Probe & Co");
    await page.keyboard.press("Tab");
    expect(await saveDisabled(page), "an agency alone must be enough").toBe(false);
    /* a name already on the list: Save waits, and the way through opens them instead */
    await page.fill(`${CARD} [data-ae="name"]`, "Aisha Kapoor");
    await expect(page.locator(`${CARD} [data-ae="dup"]`)).toContainText("Already on your list");
    expect(await saveDisabled(page), "a duplicate name did not block Add").toBe(true);
    await page.fill(`${CARD} [data-ae="name"]`, "Zz Probe");
    /* the paste field sorts a link into its place */
    await page.fill(`${CARD} [data-ae="paste"]`, "manuscriptwishlist.com/mswl-post/zz-probe");
    await expect(page.locator(`${CARD} [data-vl="paste"]`)).toHaveText("✓ Filed under MSWL");
    expect(await page.inputValue(`${CARD} [data-ae="mswl"]`), "the pasted MSWL link was not filed under MSWL").toBe("manuscriptwishlist.com/mswl-post/zz-probe");
    await page.fill(`${CARD} [data-ae="paste"]`, "hale and harrow");
    await expect(page.locator(`${CARD} [data-vl="paste"]`)).toHaveText("That doesn’t look like a link");
    await page.fill(`${CARD} [data-ae="name"]`, "Aisha Kapoor");
    await page.click(`${CARD} [data-ae="dup-open"]`);
    await expect(page.locator(`${CARD} #ac-name`), "Open them instead did not open the existing agent").toHaveText("Aisha Kapoor");
    expect(await page.locator(ADDCARD).count(), "the add card stayed behind the agent it opened").toBe(0);
    await closeCard(page);
    bump(12);
  });

  test("a save narrows the card back to the quick view and says so — Enter in a field saves too (the lab)", async ({ page }) => {
    const scope = await openLab(page);
    await openEditor(page, "fx-sparse", "who");
    await page.fill(`${CARD} [data-ae="city"]`, "Leeds");
    await page.keyboard.press("Tab");
    expect(await sum(page)).toBe("1 change");
    await page.click(`${CARD} [data-ae="save"]`);
    await expect(page.locator(`${CARD} [data-ac="head"]`), "the save did not return to the quick view").toBeVisible();
    await settle(page);
    const w = await page.evaluate(() => document.querySelector('[data-ac="card"]')!.getBoundingClientRect().width);
    expect(Math.abs(w - 548), `the card did not narrow back: ${w}`).toBeLessThanOrEqual(2);
    await expect(page.locator(`${CARD} [data-ac="foot"].on`)).toContainText("Saved.");
    await expect.poll(() => page.evaluate((s) => document.querySelector<HTMLElement>(`${s} [data-agent-card="fx-sparse"]`)?.innerText ?? "", scope),
      { message: "the row behind the card did not take the save" }).toContain("Leeds");
    /* Enter in a plain field saves (the mock's keys) */
    await page.click(`${CARD} [data-ac="edit"]`);
    await page.waitForSelector(EDITOR);
    await page.fill(`${CARD} [data-ae="email"]`, "ottoline@frayn.co.uk");
    await page.keyboard.press("Enter");
    await expect(page.locator(`${CARD} [data-ac="head"]`), "Enter in a field did not save").toBeVisible();
    await closeCard(page);
    bump(6);
  });

  test("the Notes tab edits a note in place, and a delete is struck with Undo — carried out when the editor goes (the account, restored)", async ({ page }) => {
    await openRoute(page, "/agents", { width: 1440, height: 900 });
    const scope = await visiblePage(page, ".agl-wpg");
    const pick = await page.evaluate((scope) => document.querySelector<HTMLElement>(`${scope} [data-clv="row"]`)?.dataset.agentCard ?? null, scope);
    expect(pick, "population first — no agent on this account").not.toBeNull();
    if (!pick) return;
    const { db, uid } = await harnessDb();
    const agentRef = doc(db, "users", uid, "agents", pick);
    const before = (await getDoc(agentRef)).data() ?? {};
    const stamp = Date.now();
    const first = `zz probe note ${stamp}`;
    const edited = `zz probe note ${stamp} edited`;
    const noteRef = doc(db, "users", uid, "agents", pick, "notes", `zzprobe-${stamp}`);
    const probes = () => getDocs(fsQuery(collection(db, "users", uid, "agents", pick, "notes"), where("text", "in", [first, edited])));
    try {
      const { setDoc } = await import("firebase/firestore");
      await setDoc(noteRef, { text: first, createdAt: new Date().toISOString() });
      await page.click(`${scope} [data-agent-card="${pick}"]`);
      await page.waitForSelector(CARD);
      await page.click(`${CARD} [data-ac="edit"]`);
      await page.waitForSelector(EDITOR);
      await tabTo(page, "notes");
      const row = page.locator(`${CARD} [data-ae="note"][data-note="zzprobe-${stamp}"]`);
      await expect(row, "the seeded note is not in the Notes tab").toBeVisible({ timeout: 15_000 });
      /* edit in place — saved as written, outside Save changes */
      await row.hover();
      await row.locator('[data-ae="note-edit-open"]').click();
      await page.fill(`${CARD} [data-ae="note-edit"]`, edited);
      await page.click(`${CARD} [data-ae="note-save"]`);
      await expect.poll(async () => (await getDoc(noteRef)).data()?.text, { message: "the edit did not reach the note", timeout: 15_000 }).toBe(edited);
      expect(await sum(page), "a note's edit counted as a change to Save").toBe("No changes yet.");
      /* delete: struck with Undo, and Undo keeps it */
      await row.hover();
      await row.locator('[data-ae="note-delete"]').click();
      await expect(row, "the deleted note is not struck").toHaveClass(/struck/);
      await row.locator('[data-ae="note-undo"]').click();
      await expect(row).not.toHaveClass(/struck/);
      expect((await getDoc(noteRef)).exists(), "Undo did not keep the note").toBe(true);
      /* delete again and leave: the strike is carried out — closing is not an Undo */
      await row.hover();
      await row.locator('[data-ae="note-delete"]').click();
      await page.keyboard.press("Escape");
      await expect(page.locator(`${CARD} [data-ac="head"]`)).toBeVisible();
      await expect.poll(async () => (await getDoc(noteRef)).exists(), { message: "leaving the editor did not carry out the delete", timeout: 15_000 }).toBe(false);
      await closeCard(page);
      bump(6);
    } finally {
      /* ⚠️ RESTORE IN THE SAME RUN: any probe note left, and the card's cached preview */
      for (const d of (await probes()).docs) await deleteDoc(d.ref);
      await updateDoc(agentRef, { notePreview: typeof before.notePreview === "string" ? before.notePreview : deleteField() });
      expect((await probes()).size, "THE PROBE NOTE WAS NOT REMOVED — the account has been changed").toBe(0);
      bump();
    }
  });

  test("a save leaves every other social byte for byte — and the MSWL link joins as its own entry (the account, restored)", async ({ page }) => {
    const ID = "clv-fx-never";
    const { db, uid } = await harnessDb();
    const ref = doc(db, "users", uid, "agents", ID);
    const snap = await getDoc(ref);
    expect(snap.exists(), "the fixture agent is not on this account — run tests/e2e/seedContactFixture.mjs").toBe(true);
    const before = snap.data() ?? {};
    const THREE = [
      { platform: "X / Twitter", handle: "@probe_x" },
      { platform: "Bluesky", handle: "@probe.bsky.social" },
      { platform: "Instagram", handle: "@probe_ig" },
    ];
    try {
      await updateDoc(ref, { socials: THREE });
      await openRoute(page, "/agents", { width: 1440, height: 900 });
      const scope = await visiblePage(page, ".agl-wpg");
      await page.click(`${scope} [data-agent-card="${ID}"]`);
      await page.waitForSelector(CARD);
      await page.click(`${CARD} [data-ac="edit"]`);
      await page.waitForSelector(EDITOR);
      /* a save that changes nothing social leaves the list exactly as it was */
      await page.fill(`${CARD} [data-ae="city"]`, "Probe Town");
      await page.keyboard.press("Tab");
      await page.click(`${CARD} [data-ae="save"]`);
      await expect(page.locator(`${CARD} [data-ac="foot"].on`)).toContainText("Saved", { timeout: 15_000 });
      expect((await getDoc(ref)).data()?.socials, "an unrelated save rewrote the socials").toEqual(THREE);
      /* the MSWL link: its own entry, appended, every other entry untouched and in place */
      await page.click(`${CARD} [data-ac="edit"]`);
      await page.waitForSelector(EDITOR);
      await page.fill(`${CARD} [data-ae="mswl"]`, "manuscriptwishlist.com/mswl-post/probe");
      await page.click(`${CARD} [data-ae="save"]`);
      await expect(page.locator(`${CARD} [data-ac="foot"].on`)).toContainText("Saved", { timeout: 15_000 });
      expect((await getDoc(ref)).data()?.socials, "the socials did not survive byte for byte beside the MSWL entry")
        .toEqual([...THREE, { platform: "MSWL", handle: "https://manuscriptwishlist.com/mswl-post/probe" }]);
      await closeCard(page);
      bump(3);
    } finally {
      /* ⚠️ RESTORE IN THE SAME RUN, whatever the case said: the three fields this case can touch */
      const back = (k: string) => (k in before ? before[k] : deleteField());
      await updateDoc(ref, { socials: back("socials"), city: back("city") });
      const now = (await getDoc(ref)).data() ?? {};
      expect(JSON.stringify(now.socials ?? null), "THE FIXTURE'S SOCIALS WERE NOT RESTORED — the account has been changed").toBe(JSON.stringify(before.socials ?? null));
      expect(now.city ?? null, "THE FIXTURE'S CITY WAS NOT RESTORED").toBe(before.city ?? null);
      bump(2);
    }
  });
});
