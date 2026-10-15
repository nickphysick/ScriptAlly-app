/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v5 — locks TD5 A1 … L1 on the rendered page at 1512 × 900 and 1280 × 800 with the shell (L1 at five
 * widths). B1 and C3 also have unit halves (src/lib/todoCleared.test.ts, src/lib/todoTray.test.ts).
 *
 * Each lock was run against the build before this pack (`TD5_BASE=1`, ledger `base-<lock>.json`) and with its named
 * break (`TD5_MUTATE=<lock>`, ledger `mut-<lock>-<lock>.json`) before its green was believed. A2, B1, C1, C2, C3,
 * D1, G1 and L1 break in the page (td5Lib's MUTATIONS); A1, D2, E1 and F1 break in source, made and undone in the
 * measurement worktree.
 *
 * ⚠️ D2, E1 AND F1 WRITE TO THE SHARED ACCOUNT AND PUT IT BACK IN THE SAME RUN. D2's save is undone by the slip's
 *    own Undo and checked byte-for-byte; a `journeyGuard` restores anything still different whatever happens. E1's
 *    own-task tick is undone by its toast and checked; F1's probe task is deleted.
 */
import { expect, test, type Page } from "@playwright/test";
import { collection, deleteDoc, doc, getDoc, getDocs, query as fsQuery, updateDoc, where, deleteField } from "firebase/firestore";
import { harnessDb } from "./harnessDocs";
import { rawSet, restoreSet, type Raw } from "./journeyGuard";
import { BASE, Ledger, MUT, SIZES, diffSets, leaveDesk, mutate, near, openTodo, readBadge, readSet, type VP } from "./td5Lib";


test.setTimeout(420_000);

type W = { __td5: () => { r: HTMLElement; sc: HTMLElement; q: (s: string) => HTMLElement | null; qa: (s: string) => HTMLElement[] }; __box: (e: Element | null) => { x: number; y: number; w: number; h: number; b: number; r: number } | null };

/* ── A1 · the header ─────────────────────────────────────────────────────────────────────────── */
test("TD5 A1 — header: shadow only, the title's n is the badge, the inset", async ({ page }) => {
  const L = new Ledger("A1");
  for (const vp of SIZES) {
    await openTodo(page, vp);
    await mutate(page, "A1");
    const at = `${vp.width}`;
    const r = await page.evaluate(() => {
      const w = window as unknown as W;
      const { q } = w.__td5();
      const hd = q('[data-td5="header"]')!;
      const imgs = [...hd.querySelectorAll("img")].map((i) => ({ cls: i.className, op: Number(getComputedStyle(i).opacity) }));
      const h1 = hd.querySelector("h1")!;
      const cs = getComputedStyle(h1);
      return {
        wide: !!document.querySelector(".ws-app.sheet-wide"), imgs, text: (h1.textContent || "").trim(), fs: parseFloat(cs.fontSize), face: cs.fontFamily,
        h: h1.getBoundingClientRect().height, lh: parseFloat(cs.lineHeight) || parseFloat(cs.fontSize),
        hd: w.__box(hd), tb: w.__box(hd.querySelector('[data-td5="title-block"]')), card: w.__box(hd.querySelector('[data-td5="card"]')),
      };
    });
    const badge = await readBadge(page);
    L.check("A1", `${at} images`, r.imgs.length === 1 && /td5-shadow/.test(r.imgs[0].cls) && near(r.imgs[0].op, 0.15, 0.01), JSON.stringify(r.imgs));
    const m = /^(\d+) tasks? in your tray$/.exec(r.text);
    L.check("A1", `${at} title words`, !!m, r.text);
    L.check("A1", `${at} n = sidebar badge`, !!m && badge !== null && Number(m![1]) === badge, `title ${m?.[1]} badge ${badge}`);
    L.check("A1", `${at} Special Elite`, /Special Elite/i.test(r.face), r.face);
    L.check("A1", `${at} size`, near(r.fs, r.wide ? 50 : 44, 1), `${r.fs} (wide ${r.wide})`);
    L.check("A1", `${at} one line`, r.h < r.lh * 1.5, `h ${r.h} lh ${r.lh}`);
    const w = r.hd!.w;
    const inset = w < 900 ? 0 : r.wide ? Math.max(64, (w - 1080) / 2) : Math.max(40, (w - 900) / 2);
    L.check("A1", `${at} title left = header left + inset`, near(r.tb!.x, r.hd!.x + inset, 1), `${r.tb!.x} vs ${r.hd!.x + inset}`);
    L.check("A1", `${at} card right = header right − inset`, near(r.card!.r, r.hd!.r - inset, 1), `${r.card!.r} vs ${r.hd!.r - inset}`);
  }
  L.done(16);
});

/* ── A2 · the card ───────────────────────────────────────────────────────────────────────────── */
test("TD5 A2 — card: the rows sum to n, the bar is in proportion, a press filters and never scrolls", async ({ page }) => {
  const L = new Ledger("A2");
  for (const vp of SIZES) {
    await openTodo(page, vp);
    await mutate(page, "A2");
    const at = `${vp.width}`;
    const c = await page.evaluate(() => {
      const w = window as unknown as W;
      const { q, qa } = w.__td5();
      const rows = qa('[data-td5="card-row"]').map((b) => ({ k: b.dataset.k, n: Number(b.querySelector('[data-td5="card-n"]')!.textContent) }));
      const segs = qa('[data-td5="card-seg"]').map((s) => ({ k: s.dataset.k, w: s.getBoundingClientRect().width }));
      const t = (q("h1")!.textContent || "").match(/\d+/);
      return { rows, segs, n: t ? Number(t[0]) : NaN, trayRows: qa('[data-td5="row"]').length };
    });
    const sum = c.rows.reduce((s, r) => s + r.n, 0);
    L.check("A2", `${at} population`, c.trayRows > 0 && c.rows.length === 3, `${c.trayRows} rows`);
    L.check("A2", `${at} rows sum to n`, sum === c.n, `${sum} vs ${c.n}`);
    const segW = c.segs.reduce((s, x) => s + x.w, 0);
    for (const s of c.segs) {
      const want = (c.rows.find((r) => r.k === s.k)!.n / sum) * segW;
      L.check("A2", `${at} bar ${s.k}`, near(s.w, want, 2), `${s.w.toFixed(1)} vs ${want.toFixed(1)}`);
    }
    const chase = c.rows.find((r) => r.k === "chase")!;
    L.check("A2", `${at} To chase has members`, chase.n > 0, `${chase.n}`);
    const before = await page.evaluate(() => (window as unknown as W).__td5().sc.scrollTop);
    await page.locator('[data-todo-v5] [data-td5="card-row"][data-k="chase"]').click();
    await page.waitForTimeout(400);
    const p = await page.evaluate(() => {
      const { sc, q, qa } = (window as unknown as W).__td5();
      return {
        top: sc.scrollTop,
        groups: [...new Set(qa('[data-td5="row"]').map((r) => r.dataset.group))],
        n: qa('[data-td5="row"]').length,
        pressed: q('[data-td5="card-row"][data-k="chase"]')!.getAttribute("aria-pressed"),
        others: qa('[data-td5="card-row"]').filter((b) => b.dataset.k !== "chase").map((b) => Number(getComputedStyle(b).opacity)),
        pill: { on: q('[data-td5-pill="type"]')!.classList.contains("on"), text: (q('[data-td5-pill="type"] .td5-fp')!.textContent || "").trim() },
        sayH: q('[data-td5="say"]')!.getBoundingClientRect().height, sayLh: parseFloat(getComputedStyle(q('[data-td5="say"]')!).lineHeight),
      };
    });
    L.check("A2", `${at} only chase and quiet rows`, p.n > 0 && p.groups.every((g) => g === "chase" || g === "quiet"), JSON.stringify(p.groups));
    L.check("A2", `${at} row count = the row's figure`, p.n === chase.n, `${p.n} vs ${chase.n}`);
    L.check("A2", `${at} others fade to .32`, p.others.length === 2 && p.others.every((o) => near(o, 0.32, 0.02)), JSON.stringify(p.others));
    L.check("A2", `${at} aria-pressed`, p.pressed === "true", String(p.pressed));
    L.check("A2", `${at} Task type pill`, p.pill.on && p.pill.text === "To chase", JSON.stringify(p.pill));
    L.check("A2", `${at} no scroll`, p.top === before, `${before} → ${p.top}`);
    /* filtered, the row reads "Showing n of N  Clear all" on ONE line (a class collision once made the link a grid block) */
    L.check("A2", `${at} the filtered sentence is one line`, p.sayH < p.sayLh * 1.5, `height ${p.sayH} against a ${p.sayLh}px line`);
    await page.locator('[data-todo-v5] [data-td5="card-row"][data-k="chase"]').click();
  }
  L.done(22);
});

/* ── B1 · the ring, rendered ─────────────────────────────────────────────────────────────────── */
test("TD5 B1 — the ring's arc is cleared ÷ (cleared + n)", async ({ page }) => {
  const L = new Ledger("B1");
  for (const vp of SIZES) {
    await openTodo(page, vp);
    await mutate(page, "B1");
    const r = await page.evaluate(() => {
      const { q } = (window as unknown as W).__td5();
      const ink = q('[data-td5="ring-ink"]');
      const C = 2 * Math.PI * 42;
      return {
        cleared: Number(q('[data-td5="ring-n"]')!.textContent), n: Number((q("h1")!.textContent || "").match(/\d+/)?.[0]),
        arc: ink ? Number((ink.getAttribute("stroke-dasharray") || "").split(/\s+/)[0]) / C : 0,
        label: q('[data-td5="cleared"]')!.getAttribute("aria-label"),
      };
    });
    const want = r.cleared / (r.cleared + r.n);
    console.log(`[B1] ${vp.width}: cleared this week ${r.cleared}, in the tray ${r.n}`);
    L.check("B1", `${vp.width} arc ∝ cleared`, near(r.arc, want, 0.01), `${r.arc.toFixed(4)} vs ${want.toFixed(4)}`);
    L.check("B1", `${vp.width} ink drawn only when something was cleared`, r.cleared > 0 ? r.arc > 0 : r.arc === 0, `cleared ${r.cleared}, arc ${r.arc}`);
    L.check("B1", `${vp.width} label`, r.label === `Cleared this week: ${r.cleared}. ${r.n} still to do.`, String(r.label));
  }
  L.done(6);
});

/* ── C1 · the sheet's sticky stack ───────────────────────────────────────────────────────────── */
test("TD5 C1 — the navy row is the sheet's fixed top; the strip and a band stick beneath it inside the tray", async ({ page }) => {
  /* v5.1 §J: the sheet is one screen, so the navy row no longer sticks to the page — it is the sheet's fixed top, and
     the tray scrolls under it. The strip sticks at the tray's top (= the row's foot) and the bands under the strip. */
  const L = new Ledger("C1");
  for (const vp of SIZES) {
    await openTodo(page, vp);
    await mutate(page, "C1");
    const at = `${vp.width}`;
    const bg = await page.evaluate(() => getComputedStyle((window as unknown as W).__td5().q('[data-td5="nav"]')!).backgroundColor);
    L.check("C1", `${at} navy`, bg === "rgb(45, 58, 80)", bg);
    await page.evaluate(() => { (window as unknown as W).__td5().q('[data-td5="tray"]')!.scrollTop += 420; });
    await page.waitForTimeout(400);
    const s = await page.evaluate(() => {
      const { q, qa } = (window as unknown as W).__td5();
      const nav = q('[data-td5="nav"]')!, strip = q('[data-td5="strip"]')!, sheet = q('[data-td5="sheet"]')!, tray = q('[data-td5="tray"]')!;
      const sb = strip.getBoundingClientRect().bottom;
      const bands = qa('[data-td5="band"]').map((b) => b.getBoundingClientRect().top);
      return {
        scrolled: tray.scrollTop, sheetTop: sheet.getBoundingClientRect().top, navTop: nav.getBoundingClientRect().top, navB: nav.getBoundingClientRect().bottom,
        stripTop: strip.getBoundingClientRect().top, stripB: sb, stuckBand: bands.some((t) => Math.abs(t - sb) <= 1), bands,
      };
    });
    L.check("C1", `${at} the tray scrolled (the precondition)`, s.scrolled > 100, `${s.scrolled}`);
    L.check("C1", `${at} the navy row is the sheet's top`, near(s.navTop, s.sheetTop, 1), `${s.navTop} vs ${s.sheetTop}`);
    L.check("C1", `${at} strip under the nav`, near(s.stripTop, s.navB, 1), `${s.stripTop} vs ${s.navB}`);
    L.check("C1", `${at} a band under the strip`, s.stuckBand, `strip ${s.stripB}, bands ${s.bands.map((b) => b.toFixed(0)).join(",")}`);
  }
  L.done(10);
});

/* ── C2 · the tray ───────────────────────────────────────────────────────────────────────────── */
const ORDER = ["you", "chase", "quiet", "tidy", "mine"];
test("TD5 C2 — the tray: table order, art breaking out, a row click selects and writes nothing", async ({ page }) => {
  const L = new Ledger("C2");
  for (const vp of SIZES) {
    await openTodo(page, vp);
    await mutate(page, "C2");
    const at = `${vp.width}`;
    const g = await page.evaluate(() => {
      const { qa } = (window as unknown as W).__td5();
      return qa('[data-td5="group-block"]').map((b) => {
        const band = b.querySelector('[data-td5="band"]')!;
        const art = band.querySelector("img")!;
        return { g: b.dataset.g, tint: getComputedStyle(band).backgroundColor, out: art.getBoundingClientRect().top < band.getBoundingClientRect().top };
      });
    });
    const seen = g.map((x) => x.g!);
    L.check("C2", `${at} groups present`, seen.length >= 2, seen.join(","));
    L.check("C2", `${at} table order`, seen.join() === ORDER.filter((o) => seen.includes(o)).join(), seen.join(","));
    for (const x of g) L.check("C2", `${at} ${x.g} art breaks out`, x.out, x.tint);
    const writes: string[] = [];
    const onReq = (r: { url: () => string; method: () => string }) => { if (/google\.firestore\.v1\.Firestore\/Write/.test(r.url()) && r.method() === "POST") writes.push(r.url()); };
    page.on("request", onReq);
    const target = page.locator('[data-todo-v5] [data-td5="row"]').nth(2);
    const key = await target.getAttribute("data-td5-row");
    await target.click();
    await page.waitForTimeout(900);
    page.off("request", onReq);
    const desk = await page.evaluate(() => (window as unknown as W).__td5().q('[data-td5="desk-card"]')?.getAttribute("data-key"));
    const drawer = await page.locator("[data-qad-drawer]:visible, [data-hdr]:visible, .tdb-ff:visible").count();
    L.check("C2", `${at} the desk follows`, desk === key, `${desk} vs ${key}`);
    L.check("C2", `${at} nothing opened`, drawer === 0, `${drawer} surfaces`);
    L.check("C2", `${at} zero writes`, writes.length === 0, `${writes.length}`);
    if (drawer) { await page.keyboard.press("Escape"); await page.waitForTimeout(400); }
  }
  L.done(14);
});

/* ── C3 · the desk ───────────────────────────────────────────────────────────────────────────── */
const FORBIDDEN = /\b(overdue|late|honest|fair|oldest|he|she|him|her|his|hers|himself|herself)\b/i;
test("TD5 C3 — the desk: the deed's size, Today inside the card, the real StatusDot, ledes state facts", async ({ page }) => {
  const L = new Ledger("C3");
  for (const vp of SIZES) {
    await openTodo(page, vp);
    await mutate(page, "C3");
    const at = `${vp.width}`;
    /* the walk happens INSIDE the page: one call that steps through every task with the desk's own "Next" button and
       reads each card (a round trip per task timed out at ~50 tasks) */
    const seen = await page.evaluate(async () => {
      const w = window as unknown as W;
      const { q, qa } = w.__td5();
      const total = qa('[data-td5="row"]').length;
      const out: { key?: string; wide: boolean; fs: number; lede: string; tlR: number | null; cardR: number; hasStatus: boolean; dot: string | null }[] = [];
      const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      for (let k = 0; k < total; k++) {
        const card = q('[data-td5="desk-card"]')!;
        const deed = card.querySelector('[data-td5="deed"]')!;
        const tl = card.querySelector('[data-td5="today-label"]');
        const st = card.querySelector('[data-td5="desk-status"] svg');
        out.push({
          key: card.dataset.key, wide: !!document.querySelector(".ws-app.sheet-wide"), fs: parseFloat(getComputedStyle(deed).fontSize),
          lede: card.querySelector('[data-td5="lede"]')?.textContent ?? "", tlR: tl ? tl.getBoundingClientRect().right : null, cardR: card.getBoundingClientRect().right,
          hasStatus: !!card.querySelector('[data-td5="desk-status"]'), dot: st ? st.getAttribute("viewBox") : null,
        });
        (q('[aria-label="Next task"]') as HTMLButtonElement | null)?.click();
        await frame();
      }
      return out;
    });
    const limit = seen.length;
    let ledes = 0, today = 0, dots = 0;
    for (const [k, d] of seen.entries()) {
      if (k === 0) L.check("C3", `${at} deed size`, near(d.fs, d.wide ? 40 : 34, 1), `${d.fs}`);
      if (d.lede) { ledes++; L.check("C3", `${at} lede ${d.key}`, !FORBIDDEN.test(d.lede), d.lede); }
      if (d.tlR !== null) { today++; L.check("C3", `${at} Today inside ${d.key}`, d.tlR <= d.cardR, `${d.tlR} vs ${d.cardR}`); }
      if (d.hasStatus) { dots++; L.check("C3", `${at} StatusDot ${d.key}`, d.dot === "0 0 24 24", String(d.dot)); }
    }
    L.check("C3", `${at} every task walked`, new Set(seen.map((d) => d.key)).size === limit && limit > 5, `${new Set(seen.map((d) => d.key)).size} of ${limit}`);
    L.check("C3", `${at} ledes swept`, ledes >= Math.min(5, limit), `${ledes} of ${limit}`);
    L.check("C3", `${at} a Today tick seen`, today > 0, `${today}`);
    L.check("C3", `${at} a StatusDot seen`, dots > 0, `${dots}`);
  }
  L.done(20);
});

/* ── D1 · keys ───────────────────────────────────────────────────────────────────────────────── */
test("TD5 D1 — J moves; j in Find or a journey moves nothing; E starts the journey on the desk; S and D open the popover; N composes", async ({ page }) => {
  const L = new Ledger("D1");
  for (const vp of SIZES) {
    await openTodo(page, vp);
    await page.evaluate(() => sessionStorage.removeItem("sa.todoTray.draft"));
    await mutate(page, "D1");
    const at = `${vp.width}`;
    const read = () => page.evaluate(() => {
      const { qa, q } = (window as unknown as W).__td5();
      const rows = qa('[data-td5="row"]');
      return { keys: rows.map((r) => r.dataset.td5Row), cur: rows.findIndex((r) => r.getAttribute("aria-current") === "true"), desk: q('[data-td5="desk-card"]')?.dataset.key };
    });
    await page.locator("[data-todo-v5] h1").click();
    const a = await read();
    await page.keyboard.press("j"); await page.keyboard.press("j");
    await page.waitForTimeout(300);
    const b = await read();
    L.check("D1", `${at} J ×2`, b.cur === a.cur + 2, `${a.cur} → ${b.cur}`);
    L.check("D1", `${at} the desk follows`, b.desk === b.keys[b.cur], `${b.desk} vs ${b.keys[b.cur]}`);
    /* "j" typed in Find FILTERS the tray, which can rightly change the desk; the claim is that it did not MOVE the
       selection, so it is read once Find is cleared again */
    const find = page.locator('[data-todo-v5] [data-td5="find"] input');
    await find.click();
    await page.keyboard.type("j");
    await page.waitForTimeout(300);
    await find.fill("");
    await page.waitForTimeout(300);
    const c = await read();
    L.check("D1", `${at} j in Find moves nothing`, c.desk === b.desk, `${b.desk} → ${c.desk}`);
    /* a query task on the desk, then E: the journey starts INSIDE the desk card */
    await page.locator('[data-todo-v5] [data-td5="row"][data-bucket="send"]').first().click();
    await page.waitForTimeout(300);
    const before = await read();
    await page.locator("[data-todo-v5] h1").click();
    await page.keyboard.press("e");
    const opened = await page.locator("[data-td5-slot] [data-qad-drawer]").first().waitFor({ state: "visible", timeout: 8000 }).then(() => true).catch(() => false);
    L.check("D1", `${at} E starts the journey on the desk`, opened, "");
    await page.locator("[data-td5-slot] .qad-h2").click().catch(() => {});
    await page.keyboard.press("j");
    await page.waitForTimeout(300);
    const inJ = await read();
    L.check("D1", `${at} j in a journey moves nothing`, inJ.desk === before.desk && (await page.locator("[data-td5-slot] [data-qad-drawer]:visible").count()) === 1, `${before.desk} → ${inJ.desk}`);
    await page.keyboard.press("Escape");
    await page.locator("[data-td5-slot] [data-qad-drawer]:visible").first().waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
    const after = await read();
    L.check("D1", `${at} Escape (no answers) leaves the journey, the task stays`, (await page.locator("[data-td5-slot] [data-qad-drawer]:visible").count()) === 0 && after.desk === before.desk, `${before.desk} → ${after.desk}`);
    /* S and D: the popover, with the right section focused (a nudge, which may be dismissed) */
    await page.locator('[data-todo-v5] [data-td5="row"][data-bucket="chase"]').first().click();
    await page.waitForTimeout(300);
    await page.locator("[data-todo-v5] h1").click();
    for (const [key, sec] of [["s", "pop-snooze"], ["d", "pop-dismiss"]] as const) {
      await page.keyboard.press(key);
      const hit = await page.waitForFunction((sec) => {
        const p = document.querySelector('[data-td5="aside-pop"]');
        return p ? !!document.activeElement?.closest(`[data-td5="${sec}"]`) : null;
      }, sec, { timeout: 4000 }).then((h) => h.jsonValue()).catch(() => false);
      L.check("D1", `${at} ${key.toUpperCase()} opens the popover at ${sec}`, hit === true, String(hit));
      await page.keyboard.press("Escape");
      await page.waitForTimeout(250);
    }
    await page.keyboard.press("n");
    L.check("D1", `${at} N opens the compose card`, await page.locator('[data-todo-v5] [data-td5="compose"]').waitFor({ timeout: 4000 }).then(() => true).catch(() => false), "");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(250);
  }
  L.done(18);
});

/* ── D2 · the commit sequence ────────────────────────────────────────────────────────────────── */
/* ⚠️ THE GUARDS ACCUMULATE. A single slot let D2's second save overwrite the first's guard, so the first save — whose
   slip never offered Undo on the run that found the noon-date bug — was never put back (seed-pkgq-3, repaired by hand
   and recorded in the report). Every save adds its own; every one is restored after the case, pass or fail. */
const guards: { before: Raw; ids: string[] }[] = [];
test.afterEach(async () => {
  while (guards.length) {
    const g = guards.pop()!;
    const fixed = await restoreSet(g.before, g.ids);
    if (fixed.length) console.log(`[journeyGuard] restored directly:\n  ${fixed.join("\n  ")}`);
  }
});

async function sendFromDesk(page: Page, L: Ledger, at: string, reduced: boolean) {
  const row = page.locator('[data-todo-v5] [data-td5="row"][data-bucket="send"]').first();
  L.check("D2", `${at} a send task to save`, (await row.count()) > 0, "");
  await row.click();
  await page.waitForTimeout(300);
  const desk = page.locator('[data-todo-v5] [data-td5="desk-card"]');
  const key = await desk.getAttribute("data-key");
  const qid = await desk.getAttribute("data-query");
  const ids = [qid!];
  const before = await readSet(ids);
  const mine = { before: await rawSet(ids), ids };
  guards.push(mine);
  const order = await page.evaluate(() => (window as unknown as W).__td5().qa('[data-td5="row"]').map((r) => r.dataset.td5Row));
  const next = order[order.indexOf(key!) + 1] ?? order[order.indexOf(key!) - 1];
  const cleared0 = Number(await page.locator('[data-todo-v5] [data-td5="ring-n"]').textContent());
  const slips0 = await page.locator('[data-todo-v5] [data-td5="slip"]').count();
  await page.locator('[data-todo-v5] [data-td5="act"]').click();
  /* v5.1 §E — the journey runs in the desk card */
  await expect(page.locator('[data-td5-slot] [data-qad-drawer="sent"]')).toBeVisible({ timeout: 10_000 });
  for (let i = 0; i < 8 && !(await page.locator("[data-td5-slot] [data-qad-review]").count()); i++) await page.locator("[data-td5-slot] [data-qad-primary]").click();
  await page.locator("[data-td5-slot] [data-qad-primary]").click();
  /* ⚠️ THE STAMP IS ON SCREEN FOR UNDER A SECOND, so it is detected and read in ONE in-page call: a wait followed by a
     separate read lost the race once under load (the stamp had already left), on the integration branch. */
  const on = await page.waitForFunction(() => {
    const s = document.querySelector('[data-todo-v5] [data-td5="stamp"]');
    if (!s) return null;
    const d = [...document.querySelectorAll("[data-qad-drawer]")].some((e) => e.getBoundingClientRect().width > 0 && getComputedStyle(e).visibility !== "hidden");
    return { key: s.closest('[data-td5="desk-card"]')?.getAttribute("data-key") ?? null, anim: getComputedStyle(s).animationName, word: s.textContent, drawer: d };
  }, null, { timeout: reduced ? 4_000 : 30_000, polling: "raf" }).then((h) => h.jsonValue()).catch(() => null);
  const stamped = !!on;
  if (!reduced) L.check("D2", `${at} a stamp comes down`, stamped, "");
  else await page.locator("[data-qad-drawer]").waitFor({ state: "detached", timeout: 30_000 }).catch(() => {});
  if (stamped && !reduced && process.env.TD5_SHOTS === "1") await page.screenshot({ path: "reports/todo-list-v5-1/shots/04-stamp-1512.png" });
  if (on) {
    L.check("D2", `${at} on the saved card`, on.key === key, `${on.key} vs ${key}`);
    L.check("D2", `${at} the word`, on.word === "SENT", String(on.word));
    L.check("D2", `${at} the stamp comes down once the drawer has gone`, !on.drawer, on.drawer ? "the drawer was still on screen over the desk" : "");
    L.check("D2", `${at} motion ${reduced ? "off" : "on"}`, reduced ? on.anim === "none" : on.anim !== "none", on.anim);
  }
  await page.waitForTimeout(1600);
  const end = await page.evaluate((key) => {
    const { qa, q } = (window as unknown as W).__td5();
    return {
      rowGone: !qa('[data-td5="row"]').some((r) => r.dataset.td5Row === key), desk: q('[data-td5="desk-card"]')?.dataset.key,
      slips: qa('[data-td5="slip"]').length, undo: qa('[data-td5="slip-undo"]').length, cleared: Number(q('[data-td5="ring-n"]')!.textContent),
    };
  }, key);
  L.check("D2", `${at} the row leaves`, end.rowGone, "");
  L.check("D2", `${at} the next task is on the desk`, end.desk === next, `${end.desk} vs ${next}`);
  L.check("D2", `${at} a slip lands`, end.slips === slips0 + 1, `${slips0} → ${end.slips}`);
  L.check("D2", `${at} cleared +1`, end.cleared === cleared0 + 1, `${cleared0} → ${end.cleared}`);
  L.check("D2", `${at} the slip offers Undo`, end.undo > 0, `${end.undo}`);
  /* B1 with something cleared: the shared account clears nothing this week on its own, so the ring's proportion is
     read here, between the save and its Undo, where cleared is above zero */
  const ring = await page.evaluate(() => {
    const { q } = (window as unknown as W).__td5();
    const ink = q('[data-td5="ring-ink"]');
    const C = 2 * Math.PI * 42;
    return { cleared: Number(q('[data-td5="ring-n"]')!.textContent), n: Number((q("h1")!.textContent || "").match(/\d+/)?.[0]), arc: ink ? Number((ink.getAttribute("stroke-dasharray") || "").split(/\s+/)[0]) / C : 0 };
  });
  L.check("B1", `${at} arc ∝ cleared with cleared > 0`, ring.cleared > 0 && near(ring.arc, ring.cleared / (ring.cleared + ring.n), 0.01), JSON.stringify(ring));
  if (end.undo > 0) {
    await page.locator('[data-todo-v5] [data-td5="slip-undo"]').first().click();
    await expect.poll(async () => diffSets(before, await readSet(ids)), { timeout: 20_000, message: "the slip's Undo left the account different" }).toEqual([]);
    L.check("D2", `${at} Undo restores byte-for-byte`, true, "");
    guards.splice(guards.indexOf(mine), 1);
  }
}
test("TD5 D2 — a save from the desk: stamp, the row leaves, the next rises, a slip, cleared +1; Undo is exact", async ({ page }) => {
  const L = new Ledger("D2");
  await openTodo(page, { width: 1512, height: 900 }, { motion: true });
  await mutate(page, "B1");
  await sendFromDesk(page, L, "1512", false);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openTodo(page, { width: 1512, height: 900 }, { motion: true });
  await sendFromDesk(page, L, "1512 reduced", true);
  L.done(17);
});

/* ── E1 · the doors ──────────────────────────────────────────────────────────────────────────── */
const DOOR: Record<string, string> = { send: "sent", chase: "nudge", close: "close" };
/** the journey open ON THE DESK, or null — BOUNDED: an attribute read on a locator that matches nothing waits out the test */
const deskMode = async (page: Page) => {
  const d = page.locator("[data-td5-slot] [data-qad-drawer]").first();
  if (!(await d.waitFor({ state: "visible", timeout: 5000 }).then(() => true).catch(() => false))) return null;
  return d.getAttribute("data-qad-drawer", { timeout: 2000 }).catch(() => null);
};
/** nothing slides over the page: no drawer outside the desk's slot, no scrim */
const nothingOver = (page: Page) => page.evaluate(() => {
  const out = [...document.querySelectorAll("[data-qad-drawer]")].filter((e) => !e.closest("[data-td5-slot]") && e.getBoundingClientRect().width > 0).length;
  const scrim = [...document.querySelectorAll("[data-qad-scrim]")].filter((e) => e.getBoundingClientRect().width > 0).length;
  const inCard = !!document.querySelector('[data-td5="desk-card"][data-work] [data-td5-slot] [data-qad-drawer]');
  return { out, scrim, inCard, step: document.querySelector('[data-td5-slot] [data-qad-step][aria-current="step"]')?.getAttribute("data-qad-step") ?? null };
});
test("TD5 E1 — each bucket's action opens its journey INSIDE the desk card; fix → the agent card; an own task ticks", async ({ page }) => {
  const L = new Ledger("E1");
  await openTodo(page, { width: 1512, height: 900 });
  /* one row per DOOR KIND: Housekeeping holds three doors (an agent's own gaps → the agent card; a grouped gap → the
     sweep; a gap with no journey → the sweep), and the first row of a bucket enters only one of them */
  const reps = await page.evaluate(() => {
    const out: { b: string; sel: string }[] = [];
    const seen = new Set<string>();
    for (const r of (window as unknown as W).__td5().qa('[data-td5="row"]')) {
      const b = r.dataset.bucket!;
      const one = r.dataset.taskType === "data_quality_poor" && (!r.hasAttribute("data-sweep") || r.dataset.sweep === "1");
      const many = r.dataset.taskType === "data_quality_poor" && r.hasAttribute("data-sweep") && Number(r.dataset.sweep) > 1;
      const kind = b === "fix" ? `fix:${one ? "agent" : many ? "sweep" : "other"}` : b === "decide" ? `decide:${r.dataset.taskType}` : b;
      if (seen.has(kind)) continue;
      seen.add(kind);
      out.push({ b, sel: `[data-td5-row="${CSS.escape(r.dataset.td5Row!)}"]` });
    }
    return out;
  });
  const buckets = [...new Set(reps.map((r) => r.b))];
  for (const { b, sel } of reps) {
    const row = page.locator(`[data-todo-v5] ${sel}`).first();
    await row.click({ timeout: 15_000 });
    await page.waitForTimeout(250);
    const desk = await page.evaluate(() => { const c = (window as unknown as W).__td5().q('[data-td5="desk-card"]')!; return { type: c.dataset.taskType, sweep: c.hasAttribute("data-sweep"), members: Number(c.dataset.sweep || 0), key: c.dataset.key }; });
    if (b === "note") {
      const { db, uid } = await harnessDb();
      const ref = doc(db, "users", uid, "tasks", desk.key!);
      const was = (await getDoc(ref)).data() as Record<string, unknown>;
      await page.locator('[data-todo-v5] [data-td5="act"]').click();
      await expect.poll(async () => ((await getDoc(ref)).data() as Record<string, unknown>)?.done, { timeout: 10_000 }).toBe(true);
      L.check("E1", "note → the own-task tick (completedAt stamped)", typeof ((await getDoc(ref)).data() as Record<string, unknown>).completedAt === "string", "");
      const undo = page.locator(".tdb-toast .tdb-toast-act");
      if (await undo.count()) await undo.click();
      await expect.poll(async () => ((await getDoc(ref)).data() as Record<string, unknown>)?.done, { timeout: 10_000 }).toBe(false);
      const now = (await getDoc(ref)).data() as Record<string, unknown>;
      if (now.completedAt !== undefined || now.done !== was.done) await updateDoc(ref, { done: !!was.done, completedAt: deleteField() });
      L.check("E1", "note → its undo restores it", now.done === false && now.completedAt === undefined, JSON.stringify({ done: now.done, completedAt: now.completedAt }));
      continue;
    }
    await page.locator('[data-todo-v5] [data-td5="act"]').click();
    await page.waitForTimeout(800);
    if (b === "fix" && desk.type === "data_quality_poor" && (!desk.sweep || desk.members === 1)) {
      const card = await page.locator('[data-ac="card"]:visible').count();
      const drawer = await page.locator("[data-qad-drawer]:visible").count();
      L.check("E1", "fix → the agent card (not a journey)", card > 0 && drawer === 0, `card ${card} drawer ${drawer}`);
    } else if (b === "fix") {
      const sweep = await page.locator(".tdb-ff:visible").count();
      const mode = sweep ? null : await deskMode(page);
      L.check("E1", `fix (${desk.type}${desk.sweep ? ", grouped" : ""}) → its own door`, sweep > 0 || !!mode, `sweep ${sweep} journey ${mode}`);
    } else {
      const want = b === "decide" ? (desk.type === "offer_received" ? "offer" : "sent") : DOOR[b];
      const mode = await deskMode(page);
      const o = await nothingOver(page);
      L.check("E1", `${b}${b === "decide" ? ` (${desk.type})` : ""} → the ${want} journey on the desk, at step ${o.step}`, mode === want && o.inCard, `${mode} in card ${o.inCard}`);
      L.check("E1", `${b} → no drawer over the page, no scrim`, o.out === 0 && o.scrim === 0, JSON.stringify(o));
      await leaveDesk(page);
    }
    for (let i = 0; i < 3; i++) { await page.keyboard.press("Escape"); await page.waitForTimeout(300); }
    if (await page.locator(".tdb-ff:visible").count()) await page.locator(".tdb-ffx").first().evaluate((e) => (e as HTMLElement).click()).catch(() => {});
    await page.locator(".tdb-ff:visible").waitFor({ state: "detached", timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(300);
  }
  L.check("E1", "buckets entered", buckets.length >= 4, buckets.join(","));
  L.check("E1", "the agent-card door was entered", L.rows.some((r) => r.where.startsWith("fix → the agent card")), L.rows.map((r) => r.where).join(" | "));
  L.done(9);
});

/* ── F1 · the compose card ───────────────────────────────────────────────────────────────────── */
const PROBE = "Zz td5 probe";
const taskByText = async (text: string) => {
  const { db, uid } = await harnessDb();
  return (await getDocs(collection(db, "users", uid, "tasks"))).docs.find((d) => d.data().text === text)?.data() as Record<string, unknown> | undefined;
};
const nextSunday = (weeks: number) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + ((7 - d.getDay()) % 7) + 7 * weeks); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
test("TD5 F1 — Add a task opens the compose card on the desk and writes every field; a task surfacing today lands, selected", async ({ page }) => {
  const L = new Ledger("F1");
  const ts = Date.now();
  const A = `${PROBE} A ${ts}`, B = `${PROBE} B ${ts}`, C = `${PROBE} C ${ts}`, N = `${PROBE} note ${ts}`;
  try {
    await openTodo(page, { width: 1512, height: 900 });
    await page.evaluate(() => sessionStorage.removeItem("sa.todoTray.draft"));
    const doors: [string, () => Promise<void>][] = [
      ["the header's + Add a task", () => page.locator('[data-todo-v5] [data-td5="add"]').click()],
      ["the tray's add row", () => page.locator('[data-todo-v5] [data-td5="add-row"]').click()],
      ["N", async () => { await page.locator("[data-todo-v5] h1").click(); await page.keyboard.press("n"); }],
    ];
    for (const [name, open] of doors) {
      await open();
      const ok = await page.locator('[data-todo-v5] [data-td5="compose"]').waitFor({ timeout: 5000 }).then(() => true).catch(() => false);
      L.check("F1", `${name} opens the compose card on the desk (no drawer)`, ok && (await page.locator('[data-hdr="todo-compose"]').count()) === 0, "");
      await page.keyboard.press("Escape");
      await page.waitForTimeout(250);
    }
    /* every field, through addUserTask */
    await page.locator('[data-todo-v5] [data-td5="add"]').click();
    const card = page.locator('[data-todo-v5] [data-td5="compose"]');
    await card.locator('[data-td5="compose-title"]').fill(A);
    await card.locator('[data-td5="compose-detail"]').fill("A little more.");
    await card.locator('[data-when="next"]').click();
    await card.locator('[data-surf="day-before"]').click();
    await card.locator('[data-td5="compose-addlink"]').click();
    /* the find list shows queries first, so an agent is found as a writer finds one: by typing the name */
    const { db: fdb, uid: fuid } = await harnessDb();
    const anAgent = (await getDocs(collection(fdb, "users", fuid, "agents"))).docs.map((d) => String(d.data().name || "")).find((x) => x.length > 3) ?? "";
    await card.locator('[data-td5="compose-find"] input').fill(anAgent);
    const link = card.locator('[data-link^="agent:"]').first();
    const agentId = (await link.getAttribute("data-link"))!.slice("agent:".length);
    const agentName = (await link.locator("b").textContent())!.trim();
    await link.click();
    const tag = card.locator(".tgp-chip").first();
    const hasTag = (await tag.count()) > 0;
    if (hasTag) await tag.click();
    await card.locator('[data-td5="compose-save"]').click();
    await expect.poll(() => taskByText(A), { timeout: 10_000 }).toBeTruthy();
    const a = (await taskByText(A))!;
    L.check("F1", "text and detail", a.text === A && a.detail === "A little more.", JSON.stringify(a));
    L.check("F1", "the due date (next week's Sunday)", a.dueDate === nextSunday(1), `${a.dueDate} vs ${nextSunday(1)}`);
    L.check("F1", "surfaceOffset", a.surfaceOffset === "day-before", String(a.surfaceOffset));
    L.check("F1", "one link: the agent", a.agentId === agentId && a.queryId === undefined && a.manuscriptId === undefined, JSON.stringify({ agentId: a.agentId, queryId: a.queryId }));
    L.check("F1", "tags", !hasTag || (Array.isArray(a.tags) && (a.tags as unknown[]).length === 1), JSON.stringify(a.tags));
    /* the same input through the v2 composer (the phone's page): the fields both write agree */
    /* the phone's page has no sidebar for the shared opener to wait on: the viewport, then the route */
    await page.setViewportSize({ width: 760, height: 900 });
    await page.goto("/todo");
    const v2 = page.locator('[data-todo-v2="composer"]:visible').first();
    if (await v2.waitFor({ timeout: 20_000 }).then(() => true).catch(() => false)) {
      await v2.locator('[data-todo-v2="capture"]').fill(B);
      await v2.locator('[data-when="next"]').click();
      await v2.locator('[data-todo-v2="attach"]').click();
      await v2.locator(".tdv2-picker input").fill(agentName);
      await v2.locator(".tdv2-pickrow").first().click();
      await v2.locator('[data-todo-v2="add"]').click();
      await expect.poll(() => taskByText(B), { timeout: 10_000 }).toBeTruthy();
      const b = (await taskByText(B))!;
      L.check("F1", "the v2 composer's write of the same input agrees (dueDate, agentId)", b.dueDate === a.dueDate && b.agentId === a.agentId, JSON.stringify({ v2: { dueDate: b.dueDate, agentId: b.agentId }, desk: { dueDate: a.dueDate, agentId: a.agentId } }));
    } else L.check("F1", "the v2 composer's write of the same input agrees (dueDate, agentId)", false, "no v2 composer on the phone page");
    /* a task surfacing today lands in Your tasks, selected */
    await openTodo(page, { width: 1512, height: 900 });
    await page.locator('[data-todo-v5] [data-td5="add"]').click();
    await card.locator('[data-td5="compose-title"]').fill(C);
    await card.locator('[data-when="pick"]').click();
    await card.locator('[data-td5="calendar"] [data-today]').click();
    await card.locator('[data-td5="compose-save"]').click();
    const landed = await page.waitForFunction((C) => {
      const r = [...document.querySelectorAll<HTMLElement>('[data-todo-v5] [data-td5="row"]')].find((x) => (x.textContent || "").includes(C));
      /* the row lands with the board's snapshot; it is selected once the stamp has played (~620ms) */
      return r && r.getAttribute("aria-current") === "true" ? { group: r.dataset.group, cur: r.getAttribute("aria-current") } : null;
    }, C, { timeout: 15_000 }).then((h) => h.jsonValue()).catch(async () => page.evaluate((C) => {
      const r = [...document.querySelectorAll<HTMLElement>('[data-todo-v5] [data-td5="row"]')].find((x) => (x.textContent || "").includes(C));
      return r ? { group: r.dataset.group, cur: r.getAttribute("aria-current") } : null;
    }, C));
    L.check("F1", "a task due today lands under Your tasks", landed?.group === "mine", JSON.stringify(landed));
    L.check("F1", "…selected", landed?.cur === "true", JSON.stringify(landed));
    /* a note goes to the corkboard, with its paper, and does not join the tray */
    await page.locator('[data-todo-v5] [data-td5="add"]').click();
    await card.locator('[data-td5="mode-note"]').click();
    await card.locator('[data-td5="compose-title"]').fill(N);
    await card.locator('[data-paper="pink"]').click();
    await card.locator('[data-td5="compose-save"]').click();
    await expect.poll(async () => (await taskByText(N))?.colour, { timeout: 10_000 }).toBe("pink");
    const n = (await taskByText(N))!;
    await page.waitForTimeout(800);
    const inTray = await page.evaluate((N) => [...document.querySelectorAll('[data-todo-v5] [data-td5="row"]')].some((x) => (x.textContent || "").includes(N)), N);
    L.check("F1", "a note: no date, its paper, not in the tray", !n.dueDate && n.colour === "pink" && !inTray, JSON.stringify({ dueDate: n.dueDate, colour: n.colour, inTray }));
    /* the Calendar's and Corkboard's door: sa.todoCompose */
    await page.evaluate(() => sessionStorage.setItem("sa.todoCompose", "task"));
    await page.goto("/todo");
    L.check("F1", "sa.todoCompose opens the compose card", await page.locator('[data-todo-v5] [data-td5="compose"]').waitFor({ timeout: 30_000 }).then(() => true).catch(() => false), "");
  } finally {
    const { db, uid } = await harnessDb();
    const hits = (await getDocs(collection(db, "users", uid, "tasks"))).docs.filter((d) => String(d.data().text || "").startsWith(PROBE));
    for (const d of hits) await deleteDoc(d.ref);
    console.log(`[F1] probe tasks removed: ${hits.length}`);
  }
  L.done(13);
});

/* ── G1 · the quiet states ───────────────────────────────────────────────────────────────────── */
test("TD5 G1 — all caught up, and nothing yet", async ({ page }) => {
  const L = new Ledger("G1");
  for (const vp of SIZES) {
    await openTodo(page, vp, { state: "caught" });
    const c = await page.evaluate(() => {
      const { q, qa } = (window as unknown as W).__td5();
      return {
        title: (q("h1")!.textContent || "").trim(), left: !!q('[data-td5="ring-left"]'), ink: !!q('[data-td5="ring-ink"]'),
        ups: qa('[data-td5="up"]').map((u) => u.dataset.ymd!), counts: qa('[data-td5="card-n"]').map((n) => n.textContent),
      };
    });
    const today = new Date().toISOString().slice(0, 10);
    L.check("G1", `${vp.width} caught title`, c.title === "Your tray is empty", c.title);
    L.check("G1", `${vp.width} ring full`, c.ink && !c.left, JSON.stringify(c));
    L.check("G1", `${vp.width} counts 0`, c.counts.every((n) => n === "0"), c.counts.join());
    L.check("G1", `${vp.width} Coming up ≤ 3, future, in order`, c.ups.length <= 3 && c.ups.every((y, k) => y > today && (k === 0 || y >= c.ups[k - 1])), c.ups.join());
  }
  for (const vp of SIZES) {
    await openTodo(page, vp, { state: "nothing" });
    await mutate(page, "G1");
    const n = await page.evaluate(() => {
      const { q, qa } = (window as unknown as W).__td5();
      return { panel: !!q('[data-td5="empty-panel"]'), how: !!q('[data-td5="example"]'), ways: !!q('[data-td5="ways"]'), rows: qa('[data-td5="row"]').length, card: !!q('[data-td5="card"]') };
    });
    L.check("G1", `${vp.width} nothing: the three sections`, n.panel && n.how && n.ways && !n.card, JSON.stringify(n));
    L.check("G1", `${vp.width} the example is not a task`, n.rows === 0, `${n.rows} rows`);
  }
  /* the page reads its state live: the inputs change, the page follows, no reload */
  await page.evaluate(() => { delete (window as unknown as { __SA_TD5_STATE?: string }).__SA_TD5_STATE; });
  await page.locator('[data-todo-v5] [data-td5="empty-add"]').click();
  const live = await page.locator('[data-todo-v5][data-state="list"]').waitFor({ timeout: 10_000 }).then(() => true).catch(() => false);
  L.check("G1", "nothing → populated without a reload", live, "");
  await page.keyboard.press("Escape");
  L.done(13);
});

/* ── L1 · no sideways overflow ───────────────────────────────────────────────────────────────── */
test("TD5 L1 — no horizontal overflow at five widths", async ({ page }) => {
  const L = new Ledger("L1");
  for (const width of [1920, 1512, 1280, 1180, 1024]) {
    await openTodo(page, { width, height: 900 });
    await mutate(page, "L1");
    const o = await page.evaluate(() => {
      const { sc } = (window as unknown as W).__td5();
      const app = [...document.querySelectorAll<HTMLElement>(".ws-app")].find((e) => e.getBoundingClientRect().height > 0)!;
      const d = document.documentElement;
      return { doc: [d.scrollWidth, d.clientWidth], sc: [sc.scrollWidth, sc.clientWidth], app: [app.scrollWidth, app.clientWidth] };
    });
    for (const k of ["doc", "sc", "app"] as const) L.check("L1", `${width} ${k}`, o[k][0] === o[k][1], `${o[k][0]} vs ${o[k][1]}`);
    /* overflow is not the only collision: the navy row's sentence ran INTO the keys hint at 1024 with nothing overflowing.
       Its ink must end before the next control drawn in the row. */
    const row = await page.evaluate(() => {
      const { q } = (window as unknown as W).__td5();
      const say = q('[data-td5="say"]')!;
      const r = document.createRange(); r.selectNodeContents(say);
      const ink = Math.max(...[...r.getClientRects()].map((x) => x.right));
      const next = [...q('[data-td5="nav"]')!.children].filter((e) => e !== say && !e.classList.contains("td5-sp") && e.getBoundingClientRect().width > 0)
        .map((e) => e.getBoundingClientRect().left).sort((a, b) => a - b)[0] ?? Infinity;
      return { ink, next };
    });
    L.check("L1", `${width} the navy row's sentence clears its controls`, row.ink <= row.next + 0.5, `ink ends ${row.ink.toFixed(1)}, next control at ${row.next.toFixed(1)}`);
  }
  L.done(20);
});

void BASE; void MUT; void ({} as VP);
