/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PHONE APP v2, PART 3 — QUERIES, THE QUERY SHEET AND THE BIRDS-EYE VIEW, PA2-3 (design-refs/phone-app-v2/ screens
 * 04–11). Q1–Q7 at 390 × 844 and 360 × 780; Q8 is PA2-1 S9 re-run on this build.
 *
 * Every lock proved red by a named mutation first — reports/phone-app-v2/part-3/REPORT.md. Nothing here writes: the
 * swipes open their journeys and are cancelled.
 */
import { type Page, test } from "@playwright/test";
import { Ledger, PHONES, colourSweep, imageSweep, openPhone, shot, tag } from "./pa2Lib";

test.setTimeout(480_000);
const PART = "part-3";

const chipNow = (page: Page) => page.evaluate(() => ({
  counts: Object.fromEntries([...document.querySelectorAll<HTMLElement>('[data-qm1="chip"]')].map((c) => [c.dataset.key!, Number(c.dataset.count)])) as Record<string, number>,
  band: [...document.querySelectorAll('[data-pa="band-stats"] b')].map((b) => b.textContent),
  rows: [...document.querySelectorAll<HTMLElement>('[data-qm1="row"]')].filter((r) => r.getBoundingClientRect().height > 0).map((r) => ({ id: r.dataset.id!, where: r.dataset.where!, status: r.dataset.status!, disc: (r.querySelector('.pa-row > :first-child') as HTMLElement | null)?.dataset.status ?? null, glyph: !!r.querySelector('.pa-row > :first-child svg') })),
}));

const swipe = async (page: Page, id: string, dx: number) => {
  const row = page.locator(`[data-qm1="row"][data-id="${id}"] .pa-row`);
  /* the mouse cannot reach a row below the fold: bring it into the middle of the screen first */
  await row.evaluate((e) => e.scrollIntoView({ block: "center" })); await page.waitForTimeout(300);
  const box = await row.boundingBox();
  if (!box) return false;
  const y = box.y + box.height / 2, x0 = box.x + box.width / 2;
  await page.mouse.move(x0, y); await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(x0 + (dx * i) / 8, y);
  await page.mouse.up(); await page.waitForTimeout(400);
  return true;
};

/* a drawer's Escape layer arrives a beat after it shows (CLAUDE.md), so wait for the drawer and a beat; then ✕, then Discard where the
   journey carries answers — never leave a drawer mounted behind the next step */
const closeDrawer = async (page: Page) => {
  const opened = await page.locator("[data-qad-drawer]:visible").first().waitFor({ timeout: 8000 }).then(() => true, () => false);
  await page.waitForTimeout(400);
  /* no drawer, no Escape: the key would close whatever is under it instead (the query sheet) */
  if (!opened) return;
  await page.keyboard.press("Escape"); await page.waitForTimeout(500);
  for (let i = 0; i < 3 && (await page.locator("[data-qad-drawer]:visible").count()); i++) {
    const x = page.locator('[data-qad-drawer]:visible button[aria-label="Close"]').first();
    if (await x.count()) await x.click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(400);
    const d = page.getByRole("button", { name: /^Discard$/ }).first();
    if (await d.isVisible().catch(() => false)) { await d.click({ timeout: 3000 }).catch(() => {}); await page.waitForTimeout(400); }
  }
};

for (const vp of PHONES) {
  test(`PA2-3 · Queries · ${tag(vp)}`, async ({ page }) => {
    const L = new Ledger(PART, `queries-${tag(vp)}`);
    await page.addInitScript(() => { try { sessionStorage.removeItem("sa.qm1.chip"); } catch { /* */ } });
    await openPhone(page, "/queries", vp);
    await page.locator('[data-qm1="chip"][data-count]').first().waitFor({ timeout: 20_000 });
    await page.waitForTimeout(800);
    const c0 = await chipNow(page);
    L.check("pop", `${tag(vp)} five chips and rows`, Object.keys(c0.counts).join(",") === "all,you,agent,quiet,closed" && c0.rows.length > 0, JSON.stringify(c0.counts));
    L.check("Q1", `${tag(vp)} the default is All, every query`, c0.rows.length === c0.counts.all, `${c0.rows.length} vs ${c0.counts.all}`);
    L.check("Q1", `${tag(vp)} the four sets sum to All`, c0.counts.you + c0.counts.agent + c0.counts.quiet + c0.counts.closed === c0.counts.all, JSON.stringify(c0.counts));
    /* Q3 — every row leads with the glyph of its own status */
    L.check("Q3", `${tag(vp)} every row leads with its status glyph`, c0.rows.every((r) => r.disc === r.status && r.glyph), JSON.stringify(c0.rows.filter((r) => r.disc !== r.status || !r.glyph).slice(0, 3)));
    for (const k of ["you", "agent", "quiet", "closed"]) {
      await page.locator(`[data-qm1="chip"][data-key="${k}"]`).click(); await page.waitForTimeout(300);
      const c = await chipNow(page);
      L.check("Q1", `${tag(vp)} ${k}: exactly its ${c0.counts[k]} rows`, c.rows.length === c0.counts[k] && c.rows.every((r) => r.where === k), `${c.rows.length} vs ${c0.counts[k]}; ${[...new Set(c.rows.map((r) => r.where))]}`);
      L.check("Q2", `${tag(vp)} ${k}: the band line does not follow the chip`, JSON.stringify(c.band) === JSON.stringify(c0.band), `${c.band} vs ${c0.band}`);
      const col = await colourSweep(page, { roots: ".pa-band, .pa-q, .pa-tabbar" });
      L.check("Q7", `${tag(vp)} ${k}: white on navy, ink on blush, no green or red`, col.bad.length === 0 && col.navy > 0, col.bad.slice(0, 3).join(" | ") || `navy ${col.navy}`);
      for (const s of await imageSweep(page)) L.check("Q7", `${tag(vp)} ${k}: no image twice`, new Set(s).size === s.length, JSON.stringify(s.filter((x, i) => s.indexOf(x) !== i)));
    }
    await page.locator('[data-qm1="chip"][data-key="all"]').click(); await page.waitForTimeout(300);
    await shot(page, PART, `04-queries-${tag(vp)}`);

    /* Q4 — a right swipe opens the next step (your move) or a nudge, a left swipe opens close; nothing is written */
    const you = c0.rows.find((r) => r.where === "you" && /Requested|Revise/.test(r.status)), agent = c0.rows.find((r) => r.where === "agent");
    for (const [r, dx, want, label] of [[you, 120, "sent", "right on your move: the next step"], [agent, 120, "nudge", "right on theirs: a nudge"], [agent, -120, "close", "left: close"]] as const) {
      if (!r) { L.check("pop", `${tag(vp)} a row for "${label}"`, false, ""); continue; }
      await swipe(page, r.id, dx);
      const btn = dx > 0 ? page.locator(`[data-qm1="row"][data-id="${r.id}"] .pa-acts .l`) : page.locator(`[data-qm1="row"][data-id="${r.id}"] .pa-acts .r`);
      const revealed = (await page.locator(`[data-qm1="row"][data-id="${r.id}"]`).getAttribute("data-swipe")) === (dx > 0 ? "right" : "left");
      L.check("Q4", `${tag(vp)} ${label}: the action is revealed`, revealed, "");
      await btn.click({ timeout: 8000 }).catch(async (e) => { console.log("Q4 click", label, revealed, String(e).slice(0, 600)); await page.screenshot({ path: `/tmp/pa2peek/q4-fail-${tag(vp)}-${dx}.png` }); });
      const mode = await page.locator("[data-qad-drawer]:visible").first().getAttribute("data-qad-drawer", { timeout: 8000 }).catch(() => null);
      L.check("Q4", `${tag(vp)} ${label}: opens ${want ?? "the next-step"} journey`, want ? mode === want : !!mode && mode !== "close" && mode !== "nudge", String(mode));
      await closeDrawer(page);
      const after = await chipNow(page);
      L.check("Q4", `${tag(vp)} ${label}: nothing was written`, JSON.stringify(after.counts) === JSON.stringify(c0.counts) && after.rows.find((x) => x.id === r.id)?.status === r.status, JSON.stringify(after.counts));
    }

    /* Q5 — the sheet: 64%, drags to full, its order, and the next step pinned at the foot at both detents */
    const target = you ?? agent!;
    await page.locator(`[data-qm1="row"][data-id="${target.id}"] .pa-row`).click();
    await page.locator('.pa-qsheet [data-qc149c="card"]').waitFor({ timeout: 15_000 }); await page.waitForTimeout(700);
    const geo = async () => page.evaluate(() => {
      const sh = document.querySelector<HTMLElement>(".pa-qsheet")!, foot = document.querySelector<HTMLElement>('.pa-qsheet [data-qc149c="next-pinned"]');
      const order = ['[data-qc149c="band"]', '.qc149c-agent', '[data-qc149c="stage-track"]', '.qc149c-qsec'].map((s) => document.querySelector<HTMLElement>(`.pa-qsheet ${s}`)?.getBoundingClientRect().top ?? null);
      const sr = sh.getBoundingClientRect(), fr = foot?.getBoundingClientRect();
      return { h: sr.height, H: window.innerHeight, bottom: sr.bottom, foot: fr ? { top: fr.top, bottom: fr.bottom, h: fr.height } : null, order, url: location.search };
    });
    const g1 = await geo();
    L.check("Q5", `${tag(vp)} the sheet opens at 64%`, Math.abs(g1.h - g1.H * 0.64) < 3, `${g1.h} vs ${g1.H * 0.64}`);
    L.check("Q5", `${tag(vp)} ?q= carries the query (back closes it)`, g1.url.includes(`q=${target.id}`), g1.url);
    L.check("Q5", `${tag(vp)} band · agent row · stage track · the latest, in order`, g1.order.every((t, i) => t != null && (i === 0 || t > g1.order[i - 1]!)), JSON.stringify(g1.order));
    L.check("Q5", `${tag(vp)} at 64% the next step is pinned at the sheet's foot`, !!g1.foot && g1.foot.bottom <= g1.bottom + 1 && g1.foot.bottom >= g1.bottom - 40, JSON.stringify(g1.foot));
    await page.locator('.pa-qsheet [data-qc149c="sheet-body"]').evaluate((e) => { e.scrollTop = e.scrollHeight; }); await page.waitForTimeout(300);
    const g1s = await geo();
    L.check("Q5", `${tag(vp)} scrolled, the next step has not moved`, !!g1s.foot && !!g1.foot && Math.abs(g1s.foot.top - g1.foot.top) < 1, JSON.stringify([g1.foot?.top, g1s.foot?.top]));
    await shot(page, PART, `07-query-sheet-${tag(vp)}`);
    const grab = await page.locator('.pa-qsheet [data-pa="grab"]').boundingBox();
    if (grab) {
      await page.mouse.move(grab.x + grab.width / 2, grab.y + 10); await page.mouse.down();
      for (let i = 1; i <= 10; i++) await page.mouse.move(grab.x + grab.width / 2, grab.y + 10 - (g1.H * 0.4 * i) / 10);
      await page.mouse.up(); await page.waitForTimeout(600);
    }
    const g2 = await geo();
    L.check("Q5", `${tag(vp)} dragged up, the sheet is full (screen − 56)`, Math.abs(g2.h - (g2.H - 56)) < 3, `${g2.h} vs ${g2.H - 56}`);
    L.check("Q5", `${tag(vp)} at full the next step is still pinned at the foot`, !!g2.foot && g2.foot.bottom <= g2.bottom + 1 && g2.foot.bottom >= g2.bottom - 40, JSON.stringify(g2.foot));
    await shot(page, PART, `08-query-sheet-full-${tag(vp)}`);
    for (const s of await imageSweep(page)) L.check("Q7", `${tag(vp)} the sheet: no image twice`, new Set(s).size === s.length, JSON.stringify(s));
    /* the pinned next step opens its journey OVER the sheet (it once waited for a desktop panel that never mounts) */
    await page.locator('.pa-qsheet [data-qc149c="next-primary"]').click({ timeout: 8000 });
    const over = await page.waitForFunction(() => { const d = document.querySelector<HTMLElement>("[data-qad-drawer]"); if (!d) return null; const b = d.getBoundingClientRect(); const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return d.contains(hit) ? d.dataset.qadDrawer : null; }, null, { timeout: 8000 }).then((h) => h.jsonValue(), () => null);
    L.check("Q5", `${tag(vp)} the sheet's next step opens its journey over the sheet`, !!over, String(over));
    await closeDrawer(page);
    L.check("Q5", `${tag(vp)} closing the journey leaves the sheet open`, (await page.locator(".pa-qsheet").count()) === 1, "");
    /* the ••• opens the more sheet */
    await page.locator('.pa-qsheet [data-qc149c="more-btn"]').click(); await page.waitForTimeout(500);
    const more = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-pa^="more-"]')].map((e) => e.dataset.pa));
    L.check("Q5", `${tag(vp)} ••• opens the more sheet`, ["more-resp", "more-nudge", "more-edit", "more-pdf", "more-delete"].every((k) => more.includes(k)), more.join(","));
    await shot(page, PART, `10-query-more-${tag(vp)}`);
    await page.keyboard.press("Escape"); await page.waitForTimeout(500);
    L.check("Q5", `${tag(vp)} Escape closes the more sheet and leaves the query sheet open`, (await page.locator('[data-pa="more-resp"]').count()) === 0 && (await page.locator(".pa-qsheet").count()) === 1, page.url());
    if (await page.locator(".pa-qsheet").count()) { await page.goBack(); await page.waitForTimeout(800); }
    L.check("Q5", `${tag(vp)} back closes the sheet and stays on Queries`, (await page.locator(".pa-qsheet").count()) === 0 && !page.url().includes("q=") && new URL(page.url()).pathname === "/queries", page.url());
    if (new URL(page.url()).pathname !== "/queries") { await page.goto("/queries"); await page.locator('[data-pa="band"]').first().waitFor(); await page.waitForTimeout(1200); }

    /* Q6 — the Birds-eye view: every open query, none closed */
    await page.locator('[data-pa="birds-btn"]').click(); await page.locator('[data-pa="birds"]').waitFor(); await page.waitForTimeout(500);
    const birds = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-pa="birds-row"]')].map((b) => ({ id: b.dataset.id, where: b.dataset.where })));
    L.check("Q6", `${tag(vp)} every open query, once`, birds.length === c0.counts.you + c0.counts.agent + c0.counts.quiet && new Set(birds.map((b) => b.id)).size === birds.length, `${birds.length} vs ${c0.counts.you + c0.counts.agent + c0.counts.quiet}`);
    L.check("Q6", `${tag(vp)} no closed query`, birds.every((b) => b.where !== "closed"), "");
    /* ⚠️ ADDED (phone fixes v1): every row was present and the sheet still read as a plain list — the bar's track was a
       span with no display rule under the sheet, so each bar drew 0px tall. Counting rows could not see it; this reads
       the drawn track. Red on the base build (ba0513b6): every track is 0px. */
    const tracks = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-pa="birds-row"] .pa-barh')].map((e) => e.getBoundingClientRect().height));
    L.check("Q6", `${tag(vp)} every row draws its progress track`, tracks.length === birds.length && tracks.every((h) => h >= 6), JSON.stringify(tracks.slice(0, 6)));
    await shot(page, PART, `11-birds-eye-${tag(vp)}`);
    L.done(31);
  });
}
