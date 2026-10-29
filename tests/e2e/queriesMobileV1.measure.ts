/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QUERIES ON A PHONE v1 — the QM1 locks (design-refs/queries-mobile-v1/). L2–L11 at 390 × 844 and 360 × 780; L1 at
 * 1512 × 900 as a capture of the base build and of this build, then a compare (QM1_L1=capture|compare, QM1_L1_NAME).
 * L12 is the other suites, run as they are.
 *
 * Red first: against deployed dev (the base, which has no phone page) every case below fails at its population check;
 * each lock's named mutation is listed in reports/queries-mobile-v1/REPORT.md, with `QM1_MUTATE=<name>` for the CSS ones.
 *
 * ⚠️ L10 WRITES. It records a response on one live query and presses the undo bar in the same run, so the account is
 *    put back; a run that cannot press Undo fails saying the account has changed.
 */
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { DESK, DIR, Ledger, PHONES, chip, openQ, tag, type VP } from "./qm1Lib";

test.setTimeout(420_000);

/* ── in-page probes ─────────────────────────────────────────────────────────────────────────────────────────── */

/** the colour rules, over everything visible in the page, its layers and the tab bar */
const colourSweep = (page: Page) => page.evaluate(() => {
  const rgb = (s: string) => (s.match(/[\d.]+/g) ?? []).map(Number);
  const isNavy = (bg: string, img: string) => /rgb\(42, 58, 82\)/.test(bg) || /rgb\(52, 72, 106\)|rgb\(42, 58, 82\)/.test(img);
  /* Phone app v2 (Part 1): the shell's blush (#e8c8bc, the tab bar's + and badge) counts as the pink ground too */
  const isPink = (bg: string, img: string) => /rgb\((243, 200, 186|232, 200, 188)\)/.test(bg) || /rgb\(246, 211, 199\)|rgb\(240, 192, 176\)/.test(img);
  const out = { navy: 0, pink: 0, bad: [] as string[] };
  /* Phone app v2 (Part 1B): the tab bar is `.pa-tabbar` now */
  const roots = [...document.querySelectorAll<HTMLElement>(".qm1, .qm1-layer, .pa-tabbar")];
  const name = (e: Element) => `${e.tagName.toLowerCase()}.${String((e as HTMLElement).className).split(" ").slice(0, 2).join(".")}`;
  const textEls = (el: Element) => [el, ...el.querySelectorAll("*")].filter((x) => [...x.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? "").trim()));
  for (const root of roots) for (const el of [root, ...root.querySelectorAll<HTMLElement>("*")]) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden") continue;
    const bg = cs.backgroundColor, img = cs.backgroundImage;
    const [R, G, B, A = 1] = rgb(bg);
    if (A > 0.9 && R > 140 && G < 120 && B < 110 && R - G > 50) out.bad.push(`rust/red fill on ${name(el)} (${bg})`);
    if (isNavy(bg, img)) {
      out.navy++;
      /* Phone app v2: white at any opacity (the ref's selected chip count is rgba(255,255,255,.75), app.css .chip b) */
      for (const t of textEls(el)) if (getComputedStyle(t).color !== "rgb(255, 255, 255)" && !/^rgba\(255, 255, 255, /.test(getComputedStyle(t).color)) out.bad.push(`text on navy is not white: ${name(t)} (${getComputedStyle(t).color})`);
    } else if (isPink(bg, img)) {
      out.pink++;
      /* ink: #1c130f, or the phone app's ink #1f2633 (Phone app v2 rule: text on blush is ink, either) */
      for (const t of textEls(el)) if (!["rgb(28, 19, 15)", "rgb(31, 38, 51)"].includes(getComputedStyle(t).color)) out.bad.push(`text on pink is not ink: ${name(t)} (${getComputedStyle(t).color})`);
    }
  }
  return out;
});

/** the images on screen in one layer: the page (when no sheet is open) and each portalled layer, separately */
const imageSweep = (page: Page) => page.evaluate(() => {
  /* every image the layer renders, in view or not: a screen is its whole scroll, not the part the window shows */
  const vis = (e: Element) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const srcs = (root: Element) => [...root.querySelectorAll<HTMLImageElement>("img")].filter(vis).map((i) => new URL(i.src).pathname);
  const layers = [...document.querySelectorAll(".qm1-layer")];
  const page0 = document.querySelector(".qm1-screen");
  const sets: string[][] = [];
  if (page0 && !page0.hasAttribute("inert")) sets.push(srcs(page0));
  for (const l of layers) sets.push(srcs(l));
  return sets;
});

const rowsIn = (page: Page) => page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-qm1="row"]')]
  .filter((e) => e.getBoundingClientRect().height > 0)
  .map((e) => ({ id: e.dataset.id!, where: e.dataset.where!, late: !!e.querySelector('[data-qm1="stamp"][data-late]'), stamp: e.querySelector('[data-qm1="stamp"]')?.textContent ?? "", sd: e.querySelectorAll('svg circle[r="10"]').length })));

const line = (page: Page) => page.evaluate(() => ({
  sent: Number(document.querySelector('[data-qm1="sent"]')?.textContent ?? NaN),
  active: Number(document.querySelector('[data-qm1="active"]')?.textContent ?? NaN),
}));
const counts = (page: Page) => page.evaluate(() => Object.fromEntries([...document.querySelectorAll<HTMLElement>('[data-qm1="chip"]')].map((c) => [c.dataset.key!, Number(c.dataset.count)])));
const heroId = (page: Page) => page.evaluate(() => document.querySelector<HTMLElement>('[data-qm1="hero"]')?.dataset.id ?? null);

/* ── L2 · L3 · L4 · L5 · L6 · L11 — the tab ──────────────────────────────────────────────────────────────────── */

for (const vp of PHONES) {
  test(`QM1 · the tab · ${tag(vp)}`, async ({ page }) => {
    /* ⚠️ RETIRED 29 OCT (Phone app v2, Part 3): the tab is rebuilt to the ref (Part 3): its chips, header line, rows and images are PA2-3 Q1 (chips filter), Q2 (the band line never follows a chip), Q3 (rows lead with the glyph — the reverse of L6) and Q7 (colour laws, no image twice). */
    test.skip(true, "retired by Phone app v2 Part 3");
    const L = new Ledger(`tab-${tag(vp)}`);
    await openQ(page, vp);
    const pageOn = await page.locator('[data-qm1="page"]').count();
    L.check("pop", `${tag(vp)} the phone page renders`, pageOn === 1, String(pageOn));
    const c = await counts(page);
    const ln0 = await line(page);
    L.check("pop", `${tag(vp)} five chips`, Object.keys(c).length === 5, JSON.stringify(c));
    /* L3 — the header line: sent = All, active = All − Closed, the four sets sum to All; unchanged by every chip */
    L.check("L3", `${tag(vp)} sent equals All`, ln0.sent === c.all, `${ln0.sent} vs ${c.all}`);
    L.check("L3", `${tag(vp)} active equals All less Closed`, ln0.active === c.all - c.closed, `${ln0.active} vs ${c.all - c.closed}`);
    L.check("L3", `${tag(vp)} the four sets sum to All`, c.you + c.agent + c.quiet + c.closed === c.all, JSON.stringify(c));
    /* L4 — the tab bar's chosen item is navy, on Queries.
       ⚠️ RE-POINTED 29 OCT (Phone app v2, Part 1B): the bar is the floating five-slot capsule and its badge moved to To-do
       (the tray's tally). The Queries Your-move badge claim is RETIRED here; the badge's equality is PA2-1 S1. */
    const tab = await page.evaluate(() => { const on = document.querySelector<HTMLElement>('.pa-tb[aria-current="page"]'); return { key: on?.dataset.tab, bg: on ? getComputedStyle(on.querySelector(".pa-tbi")!).backgroundColor : null }; });
    L.check("L4", `${tag(vp)} the tab bar's Queries item is chosen, navy`, tab.key === "queries" && tab.bg === "rgb(42, 58, 82)", JSON.stringify(tab));

    const heroSeen: Record<string, number> = {};
    for (const k of ["you", "agent", "quiet", "closed", "all"]) {
      await chip(page, k);
      const ln = await line(page);
      L.check("L3", `${tag(vp)} ${k}: the header line does not follow the chip`, ln.sent === ln0.sent && ln.active === ln0.active, JSON.stringify(ln));
      const rows = await rowsIn(page);
      const hero = await heroId(page);
      const ids = new Set([...rows.map((r) => r.id), ...(hero ? [hero] : [])]);
      if (k !== "all") {
        /* L4 — each chip shows exactly its set */
        L.check("L4", `${tag(vp)} ${k}: rows shown = the chip's count`, ids.size === c[k], `${ids.size} vs ${c[k]}`);
        L.check("L4", `${tag(vp)} ${k}: every row belongs to the set`, rows.every((r) => r.where === k), JSON.stringify(rows.filter((r) => r.where !== k).map((r) => r.where)));
        heroSeen[k] = hero ? 1 : 0;
      }
      /* L5 — search and sort exist on All only */
      const find = await page.locator('[data-qm1="find"]').count();
      const sort = await page.locator('[data-qm1="sort"]').count();
      L.check("L5", `${tag(vp)} ${k}: search and sort ${k === "all" ? "present" : "absent"}`, k === "all" ? find === 1 && sort === 1 : find === 0 && sort === 0, `${find}/${sort}`);
      /* L6 — rows carry no StatusDot, and a late stamp reads "N days late" */
      L.check("L6", `${tag(vp)} ${k}: no StatusDot in any row`, rows.every((r) => r.sd === 0), String(rows.filter((r) => r.sd).length));
      for (const r of rows.filter((x) => x.late)) L.check("L6", `${tag(vp)} ${k}: a late row says how late`, /^\d+ days? late$/.test(r.stamp), r.stamp);
      /* L2 — the colour rules on this screen */
      const col = await colourSweep(page);
      L.check("L2", `${tag(vp)} ${k}: navy and pink elements found`, col.navy > 0 && col.pink > 0, JSON.stringify({ navy: col.navy, pink: col.pink }));
      L.check("L2", `${tag(vp)} ${k}: text on navy is white, on pink is ink, no rust fill`, col.bad.length === 0, col.bad.slice(0, 4).join(" | "));
      /* L11 — no screen repeats an image source */
      for (const set of await imageSweep(page)) L.check("L11", `${tag(vp)} ${k}: no image twice`, new Set(set).size === set.length, JSON.stringify(set));
    }
    L.check("pop", `${tag(vp)} Your move drew its top card`, heroSeen.you === 1 || c.you === 0, String(heroSeen.you));
    const lateRows = await (async () => { await chip(page, "you"); return (await rowsIn(page)).filter((r) => r.late).length; })();
    L.check("pop", `${tag(vp)} the fixture has a late row`, lateRows > 0, String(lateRows));

    /* L5 — All: four sections summing to sent; Closed folded shut */
    await chip(page, "all");
    const secs = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-qm1="all-section"]')].map((s) => ({ key: s.dataset.key, n: Number(s.dataset.count), tag: s.tagName })));
    L.check("L5", `${tag(vp)} All: four sections in order`, secs.map((s) => s.key).join() === "you,agent,quiet,closed", JSON.stringify(secs));
    L.check("L5", `${tag(vp)} All: the sections sum to sent`, secs.reduce((n, s) => n + s.n, 0) === ln0.sent, `${secs.reduce((n, s) => n + s.n, 0)} vs ${ln0.sent}`);
    const closedRows = await page.locator('[data-qm1="group"][data-key="all-closed"]').count();
    L.check("L5", `${tag(vp)} All: Closed is folded (one row, no list)`, secs[3]?.tag === "BUTTON" && closedRows === 0, `${secs[3]?.tag} · ${closedRows}`);

    /* L6 — the swipe: left exposes Response and Nudge, and each opens its journey */
    await chip(page, "agent");
    for (const [btn, mode] of [["swipe-response", "resp"], ["swipe-nudge", "nudge"]] as const) {
      let open = { swipe: undefined as string | undefined, exposed: false, w: 0 };
      let tries = 0;
      /* one retry: a swipe that lands while the last drawer's scrim is still leaving is the harness's timing, and a broken
         swipe fails both; the attempt count is in the reading */
      while (tries < 2 && !open.exposed) {
      tries++;
      const row = page.locator('[data-qm1="row"]').first();
      /* the drawer's Escape returns focus and can leave the row under the fixed tab bar: centre it before the swipe */
      await row.evaluate((e) => e.scrollIntoView({ block: "center" }));
      await page.waitForTimeout(200);
      const box = (await row.boundingBox())!;
      await page.mouse.move(box.x + box.width - 30, box.y + box.height / 2);
      await page.mouse.down();
      for (let i = 1; i <= 10; i++) await page.mouse.move(box.x + box.width - 30 - i * 22, box.y + box.height / 2 + 1);
      await page.mouse.up();
      await page.waitForTimeout(400);
      open = await page.evaluate(([b]) => {
        const r = document.querySelector<HTMLElement>('[data-qm1="row"]')!;
        const el = r.querySelector<HTMLElement>(`[data-qm1="${b}"]`)!;
        const bb = el.getBoundingClientRect();
        const hit = document.elementFromPoint(bb.left + bb.width / 2, bb.top + bb.height / 2);
        return { swipe: r.dataset.swipe, exposed: !!hit && el.contains(hit), w: Math.round(bb.width) };
      }, [btn] as const);
      if (!open.exposed) { await page.keyboard.press("Escape"); await page.waitForTimeout(800); }
      }
      L.check("L6", `${tag(vp)} a left swipe exposes ${btn}`, open.swipe === "left" && open.exposed, JSON.stringify({ ...open, tries }));
      /* a button the swipe did not expose is a failed reading, never a click that waits out the test */
      if (!open.exposed) { L.check("L6", `${tag(vp)} ${btn} opens its journey`, false, "not exposed"); continue; }
      await page.locator(`[data-qm1="row"] [data-qm1="${btn}"]`).first().click({ timeout: 8000 });
      const drawer = page.locator(`[data-qad-drawer="${mode}"]:visible`);
      const shown = await drawer.waitFor({ timeout: 8000 }).then(() => true, () => false);
      L.check("L6", `${tag(vp)} ${btn} opens the ${mode} journey`, shown, String(shown));
      await page.keyboard.press("Escape");
      /* the drawer's closing scrim takes the pointer until it has gone: wait for it, not for a guess */
      await page.waitForFunction(() => !document.querySelector(".qad-root.is-open"), undefined, { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(500);
    }
    L.done(60);
  });
}

/* ── L7 — a query ───────────────────────────────────────────────────────────────────────────────────────────── */

for (const vp of PHONES) {
  test(`QM1 · a query · ${tag(vp)}`, async ({ page, context }) => {
    /* ⚠️ RETIRED 29 OCT (Phone app v2, Part 3): the query opens as a pull-up sheet, not a pushed screen with ‹ N / M › (Part 3); its next step and order are PA2-3 Q5. */
    test.skip(true, "retired by Phone app v2 Part 3");
    const L = new Ledger(`query-${tag(vp)}`);
    await openQ(page, vp);
    await chip(page, "agent");
    const group = await page.evaluate(() => { const g = document.querySelector<HTMLElement>('[data-qm1="group"]'); return { n: g?.querySelectorAll('[data-qm1="row"]').length ?? 0, id: g?.querySelector<HTMLElement>('[data-qm1="row"]')?.dataset.id ?? null }; });
    L.check("pop", `${tag(vp)} a group to open from`, group.n > 0 && !!group.id, JSON.stringify(group));
    await page.locator('[data-qm1="group"] [data-qm1="row"] .qm1-in').first().click();
    await page.locator('[data-qm1="query"] [data-qc149c="card"]').waitFor({ timeout: 15_000 });
    await page.waitForTimeout(600);
    const card = await page.evaluate(() => {
      const top = (s: string) => document.querySelector<HTMLElement>(`[data-qm1="query"] ${s}`)?.getBoundingClientRect().top ?? null;
      const sizes = [...document.querySelectorAll<HTMLElement>('[data-qm1="query"] :is(.qc149c-ch, [data-qc149c="book-chip"], [data-qc149c="package"], [data-qc149c="step-day"], [data-qc149c="pos"], [data-qc149c="due"] em)')]
        .filter((e) => e.getBoundingClientRect().height > 0 && (e.textContent ?? "").trim())
        .map((e) => parseFloat(getComputedStyle(e).fontSize));
      return {
        order: ["[data-qc149c=\"band\"]", "[data-qc149c=\"name\"]", "[data-qc149c=\"book-block\"]", "[data-qc149c=\"next-block\"]", "[role=\"tablist\"]"].map(top),
        next: document.querySelector('[data-qm1="query"] [data-qc149c="next-sentence"]')?.textContent ?? null,
        pos: document.querySelector('[data-qm1="query"] [data-qc149c="pos"]')?.textContent?.replace(/\s+/g, " ").trim() ?? null,
        sizes,
        id: document.querySelector<HTMLElement>('[data-qm1="query"] [data-qc149c="card"]')?.dataset.id ?? null,
      };
    });
    const o = card.order;
    L.check("L7", `${tag(vp)} band, agent, book block, next step, tabs, in that order`, o.every((x) => x != null) && o.every((x, i) => i === 0 || x! > o[i - 1]!), JSON.stringify(o));
    L.check("L7", `${tag(vp)} chip and date text is at least 11px`, card.sizes.length > 3 && card.sizes.every((s) => s >= 11), JSON.stringify(card.sizes));
    L.check("L7", `${tag(vp)} ‹ N / M › counts the list it came from`, card.pos === `1 / ${group.n}`, `${card.pos} vs 1 / ${group.n}`);
    const col = await colourSweep(page);
    L.check("L2", `${tag(vp)} the query: colour rules`, col.bad.length === 0 && col.navy > 0, col.bad.slice(0, 4).join(" | ") || `navy ${col.navy}`);
    for (const set of await imageSweep(page)) L.check("L11", `${tag(vp)} the query: no image twice`, new Set(set).size === set.length, JSON.stringify(set));
    /* the next step's words are the desktop card's own (the same rule): read off the desktop page for the same query */
    const desk = await context.newPage();
    await desk.setViewportSize(DESK);
    await desk.goto(`/queries?q=${card.id}`);
    const strip = await desk.locator('[data-qc149c="strip-bold"]').first().textContent({ timeout: 30_000 }).catch(() => null);
    L.check("L7", `${tag(vp)} the next step's sentence is the desktop card's`, !!strip && strip === card.next, `${card.next} vs desktop ${strip}`);
    await desk.close();
    /* stepping keeps the count */
    await page.locator('[data-qm1="query"] [data-qc149c="next"]').click();
    await page.waitForTimeout(800);
    const pos2 = await page.locator('[data-qm1="query"] [data-qc149c="pos"]').textContent();
    L.check("L7", `${tag(vp)} › steps to the next of the same list`, (pos2 ?? "").replace(/\s+/g, " ").trim() === `${Math.min(2, group.n)} / ${group.n}`, String(pos2));
    L.done(8);
  });
}

/* ── L8 — Coming up (the clock is moved, never the data) ─────────────────────────────────────────────────────── */

const DAY = 86_400_000;
const midday = (ms: number) => { const d = new Date(ms); d.setHours(12, 0, 0, 0); return d.getTime(); };
const comingDays = (page: Page) => page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-qm1="day"]')].map((d) => ({
  ms: Number(d.dataset.ms), today: d.querySelector<HTMLElement>('[data-qm1="ticket"]')!.hasAttribute("data-today"),
  bg: getComputedStyle(d.querySelector('[data-qm1="ticket"]')!).backgroundColor, n: d.querySelectorAll('[data-qm1="entry"]').length,
})));

test("QM1 · Coming up · 390x844", async ({ page, browser }) => {
    /* ⚠️ RETIRED 29 OCT (Phone app v2, Part 3): Coming up retires on the phone (Part 3): the To-do tab covers dates. */
    test.skip(true, "retired by Phone app v2 Part 3");
  const L = new Ledger("coming-390x844");
  const vp: VP = PHONES[0];
  await openQ(page, vp, { search: "?qm=coming" });
  const real = await comingDays(page);
  const past = await page.evaluate(() => Number(document.querySelector<HTMLElement>('[data-qm1="past-due"]')?.dataset.n ?? 0));
  L.check("pop", "entries in the next 21 days", real.length > 0, String(real.length));
  const t0 = new Date(); t0.setHours(0, 0, 0, 0);
  L.check("L8", "every day is today to day 20", real.every((d) => d.ms >= t0.getTime() && d.ms < t0.getTime() + 21 * DAY), JSON.stringify(real.map((d) => new Date(d.ms).toDateString())));
  L.check("L8", "in date order", real.every((d, i) => i === 0 || d.ms > real[i - 1].ms), JSON.stringify(real.map((d) => d.ms)));
  for (const s of await imageSweep(page)) L.check("L11", "Coming up: no image twice", new Set(s).size === s.length, JSON.stringify(s));
  const col = await colourSweep(page);
  L.check("L2", "Coming up: colour rules", col.bad.length === 0, col.bad.slice(0, 4).join(" | "));
  /* the past-due count is the overdue set: every live row with a late stamp, across the chips */
  await page.locator('[data-qm1="back"]').click();
  await page.locator('[data-qm1="chips"]').waitFor();
  const late = new Set<string>();
  for (const k of ["you", "agent", "quiet"]) { await chip(page, k); for (const r of await rowsIn(page)) if (r.late) late.add(r.id); const h = await page.evaluate(() => document.querySelector('[data-qm1="hero-pill"]')?.textContent ?? ""); if (/late$/i.test(h)) late.add((await heroId(page))!); }
  L.check("L8", "the past-due count equals the overdue queries", past === late.size && past > 0, `${past} vs ${late.size}`);

  /* today's ticket is pink: the clock set to the first entry's day */
  const ctxA = await browser.newContext({ storageState: undefined });
  const pa = await ctxA.newPage();
  await openQ(pa, vp, { search: "?qm=coming", clockMs: midday(real[0].ms) });
  const a = await comingDays(pa);
  const td = a.find((d) => d.today);
  L.check("L8", "with an entry today, today's ticket is pink", !!td && td.ms === real[0].ms && td.bg === "rgb(243, 200, 186)", JSON.stringify(td));
  L.check("L8", "only today is marked", a.filter((d) => d.today).length === 1, String(a.filter((d) => d.today).length));
  await ctxA.close();
  /* day 21 is out: the clock set so the last entry falls on day 21 */
  const lastMs = real[real.length - 1].ms;
  const ctxB = await browser.newContext({ storageState: undefined });
  const pb = await ctxB.newPage();
  const fake = midday(lastMs - 21 * DAY);
  await openQ(pb, vp, { search: "?qm=coming", clockMs: fake });
  const b = await comingDays(pb);
  const f0 = new Date(fake); f0.setHours(0, 0, 0, 0);
  L.check("L8", "an entry on day 21 is not shown", !b.some((d) => d.ms === lastMs) && b.every((d) => d.ms < f0.getTime() + 21 * DAY), JSON.stringify(b.map((d) => new Date(d.ms).toDateString())));
  await ctxB.close();
  L.done(8);
});

/* ── L9 — the + sheet ───────────────────────────────────────────────────────────────────────────────────────── */

for (const vp of PHONES) {
  test(`QM1 · the + sheet · ${tag(vp)}`, async ({ page }) => {
    /* ⚠️ RETIRED 29 OCT (Phone app v2, Part 1D): the page's own + sheet is deleted; the tab bar's + opens the shell's
       "What happened?" sheet, whose doors and colours are PA2-1 S5 and S8. */
    test.skip(true, "retired by Phone app v2 Part 1D — see PA2-1 S5/S8");
    const L = new Ledger(`plus-${tag(vp)}`);
    await openQ(page, vp);
    for (const [tile, mode] of [["tile-replied", "resp"], ["tile-sent", "log"]] as const) {
      await page.locator('[data-qm1="plus"]').click();
      await page.locator('[data-qm1="plus-sheet"]').waitFor();
      if (tile === "tile-replied") {
        const can = await page.evaluate(() => { const b = document.querySelector('[data-qm1="plus-cancel"]')!; const cs = getComputedStyle(b); return { img: cs.backgroundImage, color: cs.color }; });
        L.check("L9", `${tag(vp)} Cancel is navy with white text`, /rgb\(52, 72, 106\)|rgb\(42, 58, 82\)/.test(can.img) && can.color === "rgb(255, 255, 255)", JSON.stringify(can));
        const col = await colourSweep(page);
        L.check("L2", `${tag(vp)} the + sheet: colour rules`, col.bad.length === 0, col.bad.slice(0, 4).join(" | "));
        const sets = await imageSweep(page);
        L.check("L11", `${tag(vp)} the + sheet: the page behind is inert`, sets.length === 1, String(sets.length));
        for (const s of sets) L.check("L11", `${tag(vp)} the + sheet: no image twice`, new Set(s).size === s.length, JSON.stringify(s));
      }
      await page.locator(`[data-qm1="${tile}"]`).click();
      const shown = await page.locator(`[data-qad-drawer="${mode}"]:visible`).waitFor({ timeout: 8000 }).then(() => true, () => false);
      L.check("L9", `${tag(vp)} ${tile} opens the ${mode} journey`, shown, String(shown));
      await page.keyboard.press("Escape");
      await page.waitForTimeout(700);
      const closed = await page.locator("[data-qad-drawer]:visible").count();
      if (closed) { await page.keyboard.press("Escape"); await page.waitForTimeout(500); }
    }
    L.done(5);
  });
}

/* ── L10 — the celebration (WRITES, and puts it back) ───────────────────────────────────────────────────────── */

test("QM1 · the celebration · 390x844", async ({ page }) => {
  const L = new Ledger("celebrate-390x844");
  const vp: VP = PHONES[0];
  await openQ(page, vp);
  await chip(page, "agent");
  const target = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-qm1="row"]')].find((r) => /Queried/.test(r.textContent ?? ""))?.dataset.id ?? null);
  L.check("pop", "a Queried query with the agent", !!target, String(target));
  const record = async (k: "partial" | "pass") => {
    await page.goto(`/queries?q=${target}`);
    await page.locator('[data-qm1="query"] [data-qc149c="card"]').waitFor({ timeout: 20_000 });
    /* the response is the card's main button inside the reply window, its second button after it */
    const primary = (await page.locator('[data-qm1="query"] [data-qc149c="next-primary"]').textContent({ timeout: 3000 }).catch(() => "")) ?? "";
    await page.locator(`[data-qm1="query"] [data-qc149c="${/response/i.test(primary) ? "next-primary" : "next-second"}"]`).click({ timeout: 8000 });
    await page.locator(`[data-qc149c="resp-opt"][data-k="${k}"]`).click({ timeout: 8000 });
    await page.locator('[data-qc149c="save-response"]').click({ timeout: 8000 });
    await page.locator("[data-qad-undo]").waitFor({ timeout: 15_000 });
  };
  const undo = async (why: string) => {
    const ok = await page.locator("[data-qad-undo]").click({ timeout: 5000 }).then(() => true, () => false);
    expect(ok, `UNDO NOT PRESSED after ${why}: the harness account has been changed — restore query ${target}`).toBe(true);
    await page.locator('[data-qad-toast="done"]').waitFor({ timeout: 15_000 });
  };
  /* a request cheers, and its button opens mark-as-sent */
  await record("partial");
  const cheer = await page.locator('[data-qm1="celebrate"]').waitFor({ timeout: 8000 }).then(() => true, () => false);
  const kind = cheer ? await page.locator('[data-qm1="celebrate"]').getAttribute("data-kind") : null;
  L.check("L10", "after recording a partial request, the celebration shows", cheer && kind === "partial", `${cheer} ${kind}`);
  if (cheer) {
    /* the undo bar stays reachable over the celebration (a wrong answer can be undone while it shows) */
    const undoTop = await page.evaluate(() => { const u = document.querySelector<HTMLElement>("[data-qad-undo]"); if (!u) return null; const b = u.getBoundingClientRect(); const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return !!hit && u.contains(hit); });
    L.check("L10", "Undo is on top of the celebration", undoTop === true, String(undoTop));
    const col = await colourSweep(page);
    L.check("L2", "the celebration: colour rules", col.bad.length === 0 && col.pink > 0, col.bad.slice(0, 4).join(" | ") || `pink ${col.pink}`);
    for (const s of await imageSweep(page)) L.check("L11", "the celebration: no image twice", new Set(s).size === s.length, JSON.stringify(s));
    if (process.env.QM1_SHOTS) { mkdirSync(`${DIR}/shots`, { recursive: true }); writeFileSync(`${DIR}/shots/07-celebrate.png`, await page.screenshot()); }
    await page.locator('[data-qm1="cheer-go"]').click();
    const sent = await page.locator('[data-qad-drawer="sent"]:visible').waitFor({ timeout: 8000 }).then(() => true, () => false);
    L.check("L10", "its button opens the mark-as-sent journey", sent, String(sent));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
  }
  await undo("the partial request");
  /* a pass does not */
  await record("pass");
  /* ⚠️ THE UNDO BAR LIVES 8 SECONDS: read, then press it at once. A 2.5s wait plus a dismissal let it expire once and left a
     pass on the account (restored by hand, see the report). The celebration shows within a frame of the save if it shows. */
  await page.waitForTimeout(1200);
  const passCheer = await page.locator('[data-qm1="celebrate"]').count();
  L.check("L10", "after recording a pass, no celebration", passCheer === 0, String(passCheer));
  if (passCheer) await page.locator('[data-qm1="cheer-later"]').click();
  await undo("the pass");
  L.done(4);
});

/* ── L1 — the desktop is untouched ──────────────────────────────────────────────────────────────────────────── */

const L1 = process.env.QM1_L1 ?? "";
const L1_NAME = process.env.QM1_L1_NAME ?? "head";
test("QM1 · L1 desktop capture", async ({ page }) => {
  test.skip(L1 !== "capture");
  mkdirSync(`${DIR}/l1`, { recursive: true });
  /* one fixed clock for every capture: the desktop's dials and day counts run on Date.now, and two captures a minute apart
     differ in a dial's arc (88.58 against 88.59) with nothing changed */
  const t = new Date(); t.setHours(12, 0, 0, 0);
  await openQ(page, DESK, { clockMs: t.getTime() });
  await page.waitForTimeout(2500);
  await page.mouse.move(1, 1);
  writeFileSync(`${DIR}/l1/${L1_NAME}.png`, await page.screenshot());
  const dom = await page.evaluate(() => (document.querySelector(".ws-main") ?? document.body).outerHTML.replace(/index-[A-Za-z0-9_-]+\.(js|css)/g, "index.$1"));
  writeFileSync(`${DIR}/l1/${L1_NAME}.html`, dom);
});
test("QM1 · L1 desktop compare", async ({ page }) => {
  test.skip(L1 !== "compare");
  const a = readFileSync(`${DIR}/l1/base.png`).toString("base64");
  const b = readFileSync(`${DIR}/l1/${L1_NAME}.png`).toString("base64");
  const domSame = readFileSync(`${DIR}/l1/base.html`, "utf8") === readFileSync(`${DIR}/l1/${L1_NAME}.html`, "utf8");
  await page.setContent("<canvas></canvas>");
  const r = await page.evaluate(async ([x, y]) => {
    const load = (s: string) => new Promise<HTMLImageElement>((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = `data:image/png;base64,${s}`; });
    const [ia, ib] = await Promise.all([load(x), load(y)]);
    const px = (i: HTMLImageElement) => { const c = document.createElement("canvas"); c.width = i.width; c.height = i.height; const g = c.getContext("2d")!; g.drawImage(i, 0, 0); return g.getImageData(0, 0, i.width, i.height).data; };
    const da = px(ia), db = px(ib);
    let diff = 0;
    for (let i = 0; i < da.length; i += 4) if (da[i] !== db[i] || da[i + 1] !== db[i + 1] || da[i + 2] !== db[i + 2] || da[i + 3] !== db[i + 3]) diff++;
    return { pixels: da.length / 4, diff };
  }, [a, b] as const);
  console.log("L1", JSON.stringify({ ...r, domSame }));
  writeFileSync(`${DIR}/l1/result-${L1_NAME}.json`, JSON.stringify({ ...r, domSame }, null, 1));
  expect(r.diff, "the desktop Query Centre's pixels changed").toBe(0);
  expect(domSame, "the desktop Query Centre's DOM changed").toBe(true);
});
