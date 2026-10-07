/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v14 (design-refs/contact-list-v14.html) — the rendered locks, §10 of the pack, at 1512 × 900
 * and 1280 × 800. Each was proved red by its named mutation before its green was believed
 * (reports/contact-list-v14/mutation-proofs-p*.jsonl).
 *
 * ⚠️ RUN AT ONE WORKER (`--workers=1`): the writing cases share the harness account with every other contact
 * suite, and two workers on one account interfere (Contact list v13's report).
 */
import { test } from "@playwright/test";
import { INK14, LOADED_ROW, Ledger, WIDTHS14, checkOverflow, near, openContacts } from "./cl14Lib";

test.beforeEach(async ({ page }) => {
  /* the page guide auto-opens on a first visit; every lock but the guide's reads the page without it */
  await page.addInitScript(() => { try { localStorage.setItem("sa.guide.contacts", "1"); } catch { /* private mode */ } });
});

/* ── lock 1 · order and rhythm: the hero card, the strip, the next-step section, the workspace; no carousel ── */
test("CL14-1 · order", async ({ page }) => {
  const L = new Ledger("cl14-1");
  for (const vp of WIDTHS14) {
    await openContacts(page, vp);
    const w = `${vp.width}`;
    const r = await page.evaluate(() => {
      const pick = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().height > 0) ?? null;
      const b = (e: Element | null) => { if (!e) return null; const x = e.getBoundingClientRect(); return { t: x.top, b: x.bottom, h: x.height }; };
      const hero = pick('.aglist [data-probe="page-header"][data-band]');
      return {
        hero: b(hero), heroBg: hero ? getComputedStyle(hero).backgroundColor : null,
        heroCard: !!hero?.classList.contains("ph--card") && !!hero?.classList.contains("ph--compact"),
        strip: b(pick('.aglist [data-cl13="strip"]')),
        next: b(pick('.aglist [data-cl14="next"]')),
        /* the carousel and every part it brought: the shell, its items, its track, its selector */
        carousel: document.querySelectorAll('.aglist [data-cz], .aglist .cz-item, .aglist [data-cz-track], .aglist [data-cz-set], .aglist .cl13-seg').length,
      };
    });
    L.check("CL14-1 the hero is v131's compact card, in rgb(42,58,82)", w, r.heroCard && r.heroBg === INK14, `${r.heroCard} ${r.heroBg}`);
    L.check("CL14-1 the strip follows the hero", w, !!r.hero && !!r.strip && r.strip.t > r.hero.b, `${JSON.stringify(r.hero)} ${JSON.stringify(r.strip)}`);
    L.check("CL14-1 no carousel in the DOM", w, r.carousel === 0, `${r.carousel}`);
    L.check("CL14-1 the next-step section follows the strip, 44 (±1) under it", w, !!r.strip && !!r.next && near(r.next.t - r.strip.b, 44, 1), `${r.strip && r.next ? r.next.t - r.strip.b : "—"}`);
    await checkOverflow(page, L, w);
  }
  L.done(10);
});

/* ── lock 2 · the figures are inert: clicking any of them changes nothing on the page ── */
test("CL14-2 · figures inert", async ({ page }) => {
  const L = new Ledger("cl14-2");
  for (const vp of WIDTHS14) {
    await openContacts(page, vp);
    const w = `${vp.width}`;
    /* the page's whole state, as text a reader could compare: the list's markup, the scroll, the URL, and
       whatever overlays are open */
    const snap = () => page.evaluate(() => {
      const root = [...document.querySelectorAll<HTMLElement>(".aglist")].find((e) => e.getBoundingClientRect().height > 0)!;
      const sc = root.closest<HTMLElement>(".wpg-scroll") ?? root.querySelector<HTMLElement>(".wpg-scroll");
      return JSON.stringify({
        html: root.outerHTML.length, rows: [...root.querySelectorAll("[data-agent-card]")].map((r) => r.getAttribute("data-agent-card")).join(","),
        pressed: root.querySelectorAll('[aria-pressed="true"]').length, scroll: sc?.scrollTop ?? -1, href: location.href,
        overlays: document.querySelectorAll('[data-ac="overlay"], [data-hdr], .qad-root.is-open, .lpop').length,
      });
    });
    const cells = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('.aglist [data-cl13="strip"] [data-cl13-cell]')]
      .filter((c) => c.getBoundingClientRect().height > 0)
      .map((c) => ({ label: c.getAttribute("data-cl13-cell"), tag: c.tagName, cursor: getComputedStyle(c).cursor, tab: c.tabIndex })));
    L.check("CL14-2 five figures, none a control (no button, no pointer, not focusable)", w,
      cells.length === 5 && cells.every((c) => c.tag !== "BUTTON" && c.cursor !== "pointer" && c.tab < 0), JSON.stringify(cells));
    for (const c of cells) {
      const before = await snap();
      await page.locator(`.aglist [data-cl13="strip"] [data-cl13-cell="${c.label}"]`).first().click();
      await page.waitForTimeout(300);
      const after = await snap();
      L.check(`CL14-2 clicking "${c.label}" changes nothing`, w, after === before, after === before ? "" : `${before} → ${after}`);
    }
    await checkOverflow(page, L, w);
  }
  L.done(14);
});


/* ── lock 3 · the next-step section: Ready on the fixture, the card is the agent card, no space under it ── */
test("CL14-3 · next step", async ({ page }) => {
  const L = new Ledger("cl14-3");
  for (const vp of WIDTHS14) {
    await openContacts(page, vp);
    const w = `${vp.width}`;
    const r = await page.evaluate(() => {
      const pick = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().height > 0) ?? null;
      const b = (e: Element | null) => { if (!e) return null; const x = e.getBoundingClientRect(); return { t: x.top, b: x.bottom, h: x.height, w: x.width }; };
      const next = pick('.aglist [data-cl14="next"]');
      const frame = next?.querySelector<HTMLElement>(".cl14-nx") ?? null;
      const card = next?.querySelector<HTMLElement>('[data-cl14="card"] > .cl13-ac') ?? null;
      return {
        state: next?.getAttribute("data-state") ?? null, frame: b(frame), card: b(card),
        /* the shared blocks' signature: the identity and the three blocks, marked as a carousel card's */
        blocks: card ? [...card.querySelectorAll("[data-cl13-blk]")].map((e) => e.getAttribute("data-cl13-blk")).sort().join(",") : "",
        classes: card ? ["acq-head", "acq-ini"].filter((c) => card.querySelector(`.${c}`)).length : 0,
        /* none of the quick view's hooks: no id, no data-ac, no escape-stack overlay */
        ids: card ? card.querySelectorAll("[id]").length : -1, dataAc: card ? card.querySelectorAll("[data-ac]").length : -1,
        chip: card?.querySelector('[data-cl13="ctone"]')?.textContent?.trim() ?? null,
        seeAll: next?.querySelector('[data-cl14="see-all"]')?.textContent?.trim() ?? null,
      };
    });
    L.check("CL14-3 with the fixture, the state is Ready", w, r.state === "ready", `${r.state}`);
    L.check("CL14-3 the middle is the agent card, its band chip First up", w, !!r.card && r.chip === "First up", `${r.chip}`);
    L.check("CL14-3 the card carries the shared blocks' signature (identity + genres + wishlist + materials)", w,
      r.classes === 2 && /genres/.test(r.blocks) && /wishlist/.test(r.blocks) && /materials/.test(r.blocks), `${r.classes} · ${r.blocks}`);
    L.check("CL14-3 none of the quick view's hooks (no id, no data-ac)", w, r.ids === 0 && r.dataAc === 0, `ids ${r.ids} data-ac ${r.dataAc}`);
    L.check("CL14-3 the frame's bottom is 22 (±2) below the card's", w, !!r.frame && !!r.card && near(r.frame.b - r.card.b, 22, 2), `${r.frame && r.card ? (r.frame.b - r.card.b).toFixed(1) : "—"}`);
    L.check("CL14-3 no space under the card: the frame is no taller than the card + 22", w, !!r.frame && !!r.card && r.frame.h <= r.card.h + 22 + 0.5, `frame ${r.frame?.h.toFixed(1)} card ${r.card?.h.toFixed(1)}`);
    L.check("CL14-3 the card is 318 wide at 1512, 290 at 1280", w, !!r.card && near(r.card.w, vp.width >= 1440 ? 318 : 290, 1), `${r.card?.w}`);
    /* See all N: the list shows exactly the ready set (read the rows, not the counter) */
    const n = Number((r.seeAll ?? "").match(/\d+/)?.[0] ?? NaN);
    /* ⚠️ a missing button is a failed READING, never a timeout — a crash names a line, not the property */
    let rows = -1;
    if (Number.isFinite(n)) {
      await page.locator('.aglist [data-cl14="see-all"]').filter({ visible: true }).first().click();
      await page.waitForTimeout(700);
      rows = await page.locator(`.aglist ${LOADED_ROW}`).filter({ visible: true }).count();
    }
    L.check("CL14-3 See all N leaves exactly N rows in the list", w, Number.isFinite(n) && rows === n, `button ${n} rows ${rows}`);
    await checkOverflow(page, L, w);
  }
  /* clicking the card opens the agent card; a ledger row's Log a query opens the drawer */
  await openContacts(page, { width: 1512, height: 900 });
  const cardBlock = page.locator('.aglist [data-cl14="card"] .cl13-ac [data-cl13-blk="s-wishlist"]').filter({ visible: true }).first();
  if (await cardBlock.count()) {
    await cardBlock.click();
    await page.locator('[data-ac="overlay"]').first().waitFor({ state: "attached", timeout: 5000 }).catch(() => {});
  }
  const opened = await page.locator('[data-ac="overlay"]').count();
  L.check("CL14-3 clicking the card opens the agent card", "1512", opened > 0, `${opened}`);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  const row = page.locator('.aglist [data-cl14="nl-row"]').filter({ visible: true }).first();
  if (await row.count()) {
    await row.hover();
    await row.locator('[data-cl14="nl-log"]').click();
    await page.locator(".qad-root.is-open").first().waitFor({ state: "attached", timeout: 5000 }).catch(() => {});
    const drawer = await page.locator(".qad-root.is-open").count();
    L.check("CL14-3 a Next-in-line row's Log a query opens the journey", "1512", drawer > 0, `${drawer}`);
    await page.keyboard.press("Escape");
  } else L.check("CL14-3 a Next-in-line row exists on the fixture", "1512", false, "no ledger row");
  L.done(18);
});
