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
import { INK14, Ledger, WIDTHS14, checkOverflow, openContacts } from "./cl14Lib";

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
        /* the carousel and every part it brought: the shell, its items, its track, its selector */
        carousel: document.querySelectorAll('.aglist [data-cz], .aglist .cz-item, .aglist [data-cz-track], .aglist [data-cz-set], .aglist .cl13-seg').length,
      };
    });
    L.check("CL14-1 the hero is v131's compact card, in rgb(42,58,82)", w, r.heroCard && r.heroBg === INK14, `${r.heroCard} ${r.heroBg}`);
    L.check("CL14-1 the strip follows the hero", w, !!r.hero && !!r.strip && r.strip.t > r.hero.b, `${JSON.stringify(r.hero)} ${JSON.stringify(r.strip)}`);
    L.check("CL14-1 no carousel in the DOM", w, r.carousel === 0, `${r.carousel}`);
    await checkOverflow(page, L, w);
  }
  L.done(8);
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

