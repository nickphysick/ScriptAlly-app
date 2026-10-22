/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * navy-bar-address-book v1 — the NB1 locks (refs design-refs/navy-bar-address-book-v1/), on the rendered page at
 * 1280 × 800 and 1512 × 900. Each proves its population before it asserts and writes a ledger to
 * reports/navy-bar-address-book-v1/ledger/ (`base-` for a run against the build before the pack, `mut-` under its break).
 *
 *   NB1_BASE=1        a run against the base build (the red-first reading)
 *   NB1_MUTATE=L<n>   that lock's break: in the page for every lock but L9 and L10, whose breaks are source edits (the
 *                     report names them; they are made from a path-derived backup and undone)
 *
 * L1 QC bar · L2 QC pill · L3 QC full screen · L4 QC headings · L5 CL one view · L6 CL dock · L7 CL count ·
 * L8 CL avatars · L9 CL sections · L10 CL card · L11 CL full screen · L12 CL kept functions
 */
import { test, type Page } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import { BASE, DIR, Ledger, MUT, SIZES, BOOK_ROW, openCl, openQc, tap } from "./nb1Lib";

/** the in-page breaks */
const MUTATIONS: Record<string, { css?: string; js?: string }> = {
  L1: { js: `(() => { const tb = [...document.querySelectorAll('[data-qc140="toolbar"]')].find((e) => e.getBoundingClientRect().height > 0); if (!tb) return; const n = document.createElement('nav'); n.setAttribute('data-qc140', 'jump'); n.style.cssText = 'display:flex;width:120px;height:34px'; n.innerHTML = '<button data-qc140="jump-btn">Offer</button>'; tb.insertBefore(n, tb.firstChild); })()` },
  L2: { js: `(() => { const fs = [...document.querySelectorAll('[data-qc144="full"]')].find((e) => e.getBoundingClientRect().height > 0); const row = fs && fs.parentElement; if (!fs || !row) return; const tr = document.createElement('div'); tr.className = 'cl20-tr'; tr.style.cssText = 'display:flex;justify-content:flex-end;margin:20px 0'; row.parentElement.insertBefore(tr, row); tr.appendChild(fs); })()` },
  L3: { js: `(() => { const f = [...document.querySelectorAll('[data-qc144="find-tb"]')].find((e) => e.getBoundingClientRect().height > 0); const sheet = f && f.closest('.qc138-sheet'); if (!f || !sheet) return; const row = document.createElement('div'); row.className = 'qc144-srow'; row.setAttribute('data-qc144', 'srow'); row.style.cssText = 'display:flex;height:60px'; sheet.parentElement.insertBefore(row, sheet); f.classList.remove('qc144-tfind'); row.appendChild(f); })()` },
  L4: { css: `.qc138-sheet .qc138-band.qc144-rh, .qc142-cards .qc142-rh { background: #f4f0e9 !important; } .qc138-sheet .qc138-band.qc144-rh .qc144-rhl, .qc142-rh .qc142-rhl.qc142-rhl { font-size: 21px !important; } .qc144-rhr, .qc142-rhr { display: none !important; } .qc138-sheet .qc138-band.qc144-rh[data-stuck]::before, .qc142-cards .qc142-rh[data-stuck]::before { display: none !important; }` },
  L5: { js: `(() => { const b = [...document.querySelectorAll('[data-nb1="book"]')].find((e) => e.getBoundingClientRect().height > 0); if (!b) return; const s = document.createElement('div'); s.className = 'cl20-vs'; s.setAttribute('role', 'tablist'); s.setAttribute('data-cl20', 'view-pill'); s.innerHTML = '<button role="tab">Cards</button><button role="tab">List</button>'; b.parentElement.insertBefore(s, b); })()` },
  L6: { css: `.nb1-book:not([data-full]) { height: auto !important; } .nb1-book:not([data-full]) .nb1-lc { overflow: visible !important; } .nb1-book:not([data-full]) .nb1-names { overflow: visible !important; } .nb1-book:not([data-full]) .nb1-top { position: sticky !important; top: 20px !important; z-index: 3; } .nb1-book:not([data-full]) .nb1-rp { align-self: start; }` },
  L7: { js: `(() => { const h = [...document.querySelectorAll('[data-nb1="header"]')].find((e) => e.getBoundingClientRect().height > 0); if (!h) return; const t = document.createElement('div'); t.className = 'nb1-mtitle'; t.textContent = 'Contact list'; t.style.cssText = 'color:#fff;font-size:12px'; h.insertBefore(t, h.firstChild); })()` },
  L8: { css: `.nb1-book .nb1-av.nb1-k-none { background: #f4eee5 !important; color: #24334a !important; border: 0 !important; }` },
  L11: { css: `.nb1-book[data-full] { background: #24334a !important; }` },
  L12: { css: `.nb1-book .nb1-tk { display: none !important; }` },
};
const mutate = async (page: Page, lock: string) => {
  const m = MUT === lock ? MUTATIONS[lock] : null;
  if (!m) return;
  if (m.css) await page.addStyleTag({ content: m.css });
  if (m.js) await page.evaluate(m.js);
  await page.waitForTimeout(300);
};
const near = (a: number | null | undefined, b: number, t: number) => typeof a === "number" && Math.abs(a - b) <= t;
const vis = `const vis = (s, root = document) => [...root.querySelectorAll(s)].find((e) => { const r = e.getBoundingClientRect(); return r.height > 0 && r.width > 0; }) || null;`;
const scroller = (page: Page) => page.evaluate(() => {
  const sc = [...document.querySelectorAll<HTMLElement>(".wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0);
  return sc ? { top: sc.scrollTop, max: sc.scrollHeight - sc.clientHeight } : null;
});
const scrollPageTo = (page: Page, y: number | "end") => page.evaluate((v) => {
  const sc = [...document.querySelectorAll<HTMLElement>(".wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0);
  if (sc) sc.scrollTop = v === "end" ? sc.scrollHeight : v;
}, y);

/* ── L1 · the Query Centre's navy bar ───────────────────────────────────────────────────────────────────────────── */
test("NB1-L1 QC bar", async ({ page }) => {
  test.setTimeout(420_000);
  const L = new Ledger("L1");
  for (const vp of SIZES) for (const view of ["list", "cards"] as const) {
    await openQc(page, vp, { view });
    await mutate(page, "L1");
    const r = await page.evaluate(`(() => { ${vis}
      const tb = vis('[data-qc140="toolbar"]');
      const x = (s) => { const e = tb && vis(s, tb); return e ? Math.round(e.getBoundingClientRect().left) : null; };
      return { tb: !!tb, count: x('[data-qc144="count"]'), toggle: x('[data-qc144="view-bar"]'), filters: x('[data-qc140="filters"]'),
        group: x('[data-qc140="group"]'), sort: x('[data-qc1421="sort-chip"] button'),
        countText: (tb && vis('[data-qc144="count"]', tb)?.textContent) || "",
        jump: !!vis('[data-qc140="jump"]'), titleRow: !!vis('.qcv-group [data-qc142="title-row"], .qcv-group .vw-top') };
    })()`) as Record<string, unknown>;
    const at = `${vp.width} ${view}`;
    L.check(`${at} · population: the bar`, r.tb === true, JSON.stringify(r));
    const xs = [r.count, r.toggle, r.filters, r.group, r.sort] as (number | null)[];
    L.check(`${at} · count, toggle, then Filters, Group by, Sort in order`, xs.every((v) => typeof v === "number") && xs.every((v, i) => i === 0 || (v as number) > (xs[i - 1] as number)), JSON.stringify(xs));
    L.check(`${at} · the count reads "N QUERIES"`, /^\d+\s*queries$/i.test(String(r.countText).trim()), String(r.countText));
    L.check(`${at} · no jump row`, r.jump === false, String(r.jump));
    L.check(`${at} · no title row above the list card`, r.titleRow === false, String(r.titleRow));
  }
  L.done(20);
});

/* ── L2 · the pill above the list ──────────────────────────────────────────────────────────────────────────────── */
test("NB1-L2 QC pill", async ({ page }) => {
  test.setTimeout(420_000);
  const L = new Ledger("L2");
  for (const vp of SIZES) {
    await openQc(page, vp, { view: "list" });
    await mutate(page, "L2");
    const r = await page.evaluate(`(() => { ${vis}
      const f = vis('[data-qc144="find"]'), b = vis('[data-qc144="full"]'), sheet = vis('.qc138-sheet');
      const box = (e) => e ? e.getBoundingClientRect() : null;
      const F = box(f), B = box(b), S = box(sheet);
      /* the page: the sheet under the shell's bar (the bar's own search keeps its ⌘K on every route; reported) */
      const kbd = [...document.querySelectorAll('.ws-window kbd')].filter((k) => { const r = k.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(k).visibility !== 'hidden'; }).length;
      return { f: !!F, b: !!B, s: !!S, fRight: F && F.right, bLeft: B && B.left, fH: F && F.height, bH: B && B.height, fTop: F && F.top, bTop: B && B.top,
        joint: F && B ? (F.left + B.right) / 2 : null, sheetC: S ? (S.left + S.right) / 2 : null, kbd };
    })()`) as Record<string, number | boolean | null>;
    const at = `${vp.width}`;
    L.check(`${at} · population: search, Full screen and the list card`, r.f && r.b && r.s, JSON.stringify(r));
    L.check(`${at} · search and Full screen are adjacent`, near(r.fRight as number, r.bLeft as number, 1) && near(r.fTop as number, r.bTop as number, 1), JSON.stringify(r));
    L.check(`${at} · both 60 tall (±1)`, near(r.fH as number, 60, 1) && near(r.bH as number, 60, 1), JSON.stringify(r));
    L.check(`${at} · their joint centre is the list card's (±2)`, near(r.joint as number, r.sheetC as number, 2), `${r.joint} vs ${r.sheetC}`);
    L.check(`${at} · no keycap visible on the page (the sheet)`, r.kbd === 0, `${r.kbd} visible kbd`);
  }
  L.done(10);
});

/* ── L3 · full screen: search in the cream toolbar ─────────────────────────────────────────────────────────────── */
test("NB1-L3 QC full screen", async ({ page }) => {
  test.setTimeout(420_000);
  const L = new Ledger("L3");
  for (const vp of SIZES) for (const view of ["list", "cards"] as const) {
    await openQc(page, vp, { view, full: true });
    await mutate(page, "L3");
    const r = await page.evaluate(`(() => { ${vis}
      const tb = vis('[data-qc140="toolbar"][data-pinned]');
      const f = tb && vis('[data-qc144="find-tb"]', tb), fil = tb && vis('[data-qc140="filters"]', tb);
      return { tb: !!tb, find: !!f, inTb: !!(f && tb.contains(f)), fRight: f ? f.getBoundingClientRect().right : null, filLeft: fil ? fil.getBoundingClientRect().left : null,
        fH: f ? f.getBoundingClientRect().height : null, srow: !!vis('[data-qc144="srow"]') };
    })()`) as Record<string, number | boolean | null>;
    const at = `${vp.width} ${view}`;
    L.check(`${at} · population: the full-screen toolbar`, r.tb, JSON.stringify(r));
    L.check(`${at} · Find is inside the toolbar, left of Filters`, r.find && r.inTb && (r.fRight as number) <= (r.filLeft as number), JSON.stringify(r));
    L.check(`${at} · Find is 40 tall (±1)`, near(r.fH as number, 40, 1), String(r.fH));
    L.check(`${at} · the pill row is hidden`, r.srow === false, String(r.srow));
  }
  L.done(16);
});

/* ── L4 · the ruled headings, both views ───────────────────────────────────────────────────────────────────────── */
test("NB1-L4 QC headings", async ({ page }) => {
  test.setTimeout(500_000);
  const L = new Ledger("L4");
  for (const vp of SIZES) for (const view of ["list", "cards"] as const) {
    await openQc(page, vp, { view });
    await mutate(page, "L4");
    const at = `${vp.width} ${view}`;
    const sel = view === "list" ? "[data-qcv='gband'][data-qc144='heading']" : "[data-qc142='ruled']";
    const label = view === "list" ? ".qc144-rhl" : ".qc142-rhl";
    const rule = view === "list" ? "[data-qc144='heading-rule']" : ".qc142-rhr";
    const r = await page.evaluate(`(() => { ${vis}
      const sheet = vis('.qc138-sheet'); const hs = [...document.querySelectorAll(${JSON.stringify(sel)})].filter((e) => e.getBoundingClientRect().height > 0);
      return { n: hs.length, sheetRight: sheet ? sheet.getBoundingClientRect().right : null, hs: hs.slice(0, 4).map((h) => {
        const l = h.querySelector(${JSON.stringify(label)}), ru = h.querySelector(${JSON.stringify(rule)});
        const cs = l ? getComputedStyle(l) : null;
        return { font: cs ? cs.fontFamily : '', size: cs ? cs.fontSize : '', ruleRight: ru ? ru.getBoundingClientRect().right : null, ruleH: ru ? ru.getBoundingClientRect().height : null };
      }) };
    })()`) as { n: number; sheetRight: number; hs: { font: string; size: string; ruleRight: number | null; ruleH: number | null }[] };
    L.check(`${at} · population: headings`, r.n >= 2, JSON.stringify(r));
    for (const [i, h] of r.hs.entries()) {
      L.check(`${at} · heading ${i}: Special Elite 23px`, /Special Elite/.test(h.font) && h.size === "23px", `${h.font} ${h.size}`);
      L.check(`${at} · heading ${i}: a rule within 40px of the list's right edge`, h.ruleRight != null && (h.ruleH ?? 0) >= 0.5 && r.sheetRight - h.ruleRight <= 40, `${h.ruleRight} vs ${r.sheetRight}`);
    }
    /* stuck: scroll until a heading other than the first sticks, then read its fade and the 16px band below it */
    const sc = await scroller(page);
    let stuck: Record<string, unknown> | null = null;
    for (let y = 300; sc && y < Math.min(sc.max, 4000) && !stuck; y += 120) {
      await scrollPageTo(page, y);
      await page.waitForTimeout(160);
      stuck = await page.evaluate(`(() => {
        const h = [...document.querySelectorAll(${JSON.stringify(sel)})].find((e) => e.hasAttribute('data-stuck') && e.getBoundingClientRect().height > 0);
        if (!h) return null;
        const r = h.getBoundingClientRect(); const be = getComputedStyle(h, '::before');
        const next = [...h.parentElement.querySelectorAll('[data-qcv="row"], [data-qc142="card"]')].map((e) => e.getBoundingClientRect()).filter((b) => b.bottom > r.bottom + 1)[0];
        return { bottom: r.bottom, left: r.left, width: r.width, bg: getComputedStyle(h).backgroundColor, fade: be.content !== 'none' && be.display !== 'none' ? parseFloat(be.height) : 0,
          bgImg: be.backgroundImage, nextTop: next ? next.top : null };
      })()`) as Record<string, unknown> | null;
    }
    L.check(`${at} · population: a stuck heading`, !!stuck, JSON.stringify(stuck));
    if (stuck) {
      L.check(`${at} · stuck: white`, stuck.bg === "rgb(255, 255, 255)", String(stuck.bg));
      L.check(`${at} · stuck: a 14px fade below it`, near(stuck.fade as number, 14, 0.5) && /gradient/.test(String(stuck.bgImg)), `${stuck.fade} ${stuck.bgImg}`);
      L.check(`${at} · stuck: the fade overlaps the next card or row`, typeof stuck.nextTop === "number" && (stuck.nextTop as number) < (stuck.bottom as number) + 14, `${stuck.nextTop} vs ${stuck.bottom}`);
      /* the 16px band under the heading: no hard cut (a stuck heading drawing a hard band shows as one step) */
      mkdirSync(`${DIR}/runs`, { recursive: true });
      const buf = await page.screenshot({ clip: { x: (stuck.left as number) + 40, y: stuck.bottom as number, width: Math.min(600, (stuck.width as number) - 80), height: 16 } });
      const steps = await page.evaluate(async (b64) => {
        const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode();
        const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; const x = c.getContext("2d")!; x.drawImage(img, 0, 0);
        const d = x.getImageData(0, 0, c.width, c.height).data; const rows: number[] = [];
        for (let y = 0; y < c.height; y++) { let s = 0; for (let i = 0; i < c.width; i++) { const k = (y * c.width + i) * 4; s += (d[k] + d[k + 1] + d[k + 2]) / 3; } rows.push(s / c.width); }
        return { first: rows[0], max: Math.max(...rows.slice(1).map((v, i) => Math.abs(v - rows[i]))) };
      }, buf.toString("base64"));
      L.check(`${at} · stuck: the band below starts white and has no hard step (<1% of rows' range)`, steps.first > 245 && steps.max < 12, JSON.stringify(steps));
    }
  }
  L.done(30);
});

/* ── L5 · the Contact list is one view, one box ────────────────────────────────────────────────────────────────── */
test("NB1-L5 CL one view", async ({ page }) => {
  test.setTimeout(420_000);
  const L = new Ledger("L5");
  for (const vp of SIZES) {
    await openCl(page, vp);
    await mutate(page, "L5");
    const r = await page.evaluate(`(() => { ${vis}
      const g = vis('.aglist .clv-group');
      const books = [...document.querySelectorAll('.aglist [data-nb1="book"]')].filter((e) => e.getBoundingClientRect().height > 0);
      const b = books[0];
      return { group: !!g, books: books.length,
        toggle: [...document.querySelectorAll('.aglist [role="tablist"], .aglist .cl20-vs, .aglist .cl20-vsi')].filter((e) => e.getBoundingClientRect().height > 0).length,
        oldBody: [...document.querySelectorAll('.aglist [data-clv="row"], .aglist [data-cl20="cards"], .aglist .cl14-ws')].filter((e) => e.getBoundingClientRect().height > 0).length,
        cols: b ? getComputedStyle(b).gridTemplateColumns.split(' ').filter(Boolean).length : 0,
        kids: b ? [b.querySelector('[data-nb1="list-col"]'), b.querySelector('[data-nb1="card-col"]')].filter(Boolean).length : 0 };
    })()`) as Record<string, number | boolean>;
    const at = `${vp.width}`;
    L.check(`${at} · population: the Contact list's group`, r.group, JSON.stringify(r));
    L.check(`${at} · no Cards / List toggle`, r.toggle === 0, String(r.toggle));
    L.check(`${at} · no old list body (rows, cards, the list sheet)`, r.oldBody === 0, String(r.oldBody));
    L.check(`${at} · exactly one two-column box`, r.books === 1 && r.cols === 2 && r.kids === 2, JSON.stringify(r));
  }
  L.done(8);
});

/* ── L6 · docked, never sticky ─────────────────────────────────────────────────────────────────────────────────── */
test("NB1-L6 CL dock", async ({ page }) => {
  test.setTimeout(420_000);
  const L = new Ledger("L6");
  for (const vp of SIZES) {
    await openCl(page, vp);
    await mutate(page, "L6");
    const at = `${vp.width}`;
    const read = () => page.evaluate(`(() => { ${vis}
      const b = vis('[data-nb1="book"]'); const sc = b && b.closest('.wpg-scroll');
      if (!b || !sc) return null;
      const B = b.getBoundingClientRect(), S = sc.getBoundingClientRect();
      const top = vis('[data-nb1="header"]', b), rp = vis('[data-nb1="strip"]', b), names = vis('[data-nb1="names"]', b);
      return { bTop: B.top - S.top, bBottom: S.bottom - B.bottom, B: [B.left, B.top, B.right, B.bottom], vw: innerWidth, vh: innerHeight,
        headTop: top ? top.getBoundingClientRect().top : null, stripTop: rp ? rp.getBoundingClientRect().top : null,
        page: sc.scrollTop, list: names ? names.scrollTop : null, listMax: names ? names.scrollHeight - names.clientHeight : null,
        nx: names ? names.getBoundingClientRect().left + 60 : 0, ny: names ? names.getBoundingClientRect().top + 60 : 0 };
    })()`) as Promise<Record<string, number> | null>;
    /* from rest, wheel over the box: header and panel tops agree at every sample */
    let same = true; const samples: string[] = [];
    const r0 = await read();
    L.check(`${at} · population: the box`, !!r0, JSON.stringify(r0));
    if (!r0) continue;
    await page.mouse.move(r0.nx, Math.min(vp.height - 40, r0.ny));
    for (let i = 0; i < 12; i++) {
      await page.mouse.wheel(0, 120); await page.waitForTimeout(120);
      const r = await read(); if (!r) break;
      samples.push(`${Math.round(r.headTop)}/${Math.round(r.stripTop)}`);
      if (!near(r.headTop, r.stripTop, 1)) same = false;
    }
    L.check(`${at} · header and panel tops equal (±1) at every sample`, same, samples.join(" "));
    /* at the page's end */
    await scrollPageTo(page, "end"); await page.waitForTimeout(300);
    const e = await read();
    L.check(`${at} · at the page's end: box top = container top + 20 (±1)`, !!e && near(e.bTop, 20, 1), JSON.stringify(e && e.bTop));
    L.check(`${at} · at the page's end: box bottom = container bottom − 20 (±1)`, !!e && near(e.bBottom, 20, 1), JSON.stringify(e && e.bBottom));
    L.check(`${at} · all four corners in view`, !!e && e.B[0] >= 0 && e.B[1] >= 0 && e.B[2] <= e.vw && e.B[3] <= e.vh, JSON.stringify(e && e.B));
    /* a wheel over the list scrolls the list */
    if (e) {
      await page.evaluate(() => { const n = [...document.querySelectorAll<HTMLElement>("[data-nb1='names']")].find((x) => x.getBoundingClientRect().height > 0); if (n) n.scrollTop = 0; });
      const before = await read();
      await page.mouse.move(before!.nx, before!.ny);
      for (let i = 0; i < 3; i++) { await page.mouse.wheel(0, 200); await page.waitForTimeout(150); }
      const after = await read();
      L.check(`${at} · a wheel over the list scrolls the list (and not the page)`, !!after && !!before && after.list > before.list && near(after.page, before.page, 1), `${before?.list}→${after?.list} page ${before?.page}→${after?.page}`);
    }
  }
  L.done(12);
});

/* ── L7 · the header's count ───────────────────────────────────────────────────────────────────────────────────── */
test("NB1-L7 CL count", async ({ page }) => {
  test.setTimeout(420_000);
  const L = new Ledger("L7");
  for (const vp of SIZES) {
    await openCl(page, vp);
    await mutate(page, "L7");
    const read = () => page.evaluate(`(() => { ${vis}
      const h = vis('[data-nb1="header"]'); if (!h) return null;
      const first = [...h.querySelectorAll('*')].find((e) => e.children.length === 0 && (e.textContent || '').trim());
      return { first: first ? first.textContent.trim() : '', count: (vis('[data-nb1="count"]') || {}).textContent || '',
        texts: [...h.childNodes].filter((n) => n.nodeType === 1 && !n.matches('[data-nb1="search-row"], [data-nb1="pills"], [data-nb1="selection"]')).map((n) => n.textContent.trim()),
        rows: document.querySelectorAll('[data-nb1="book"] [data-nb1="name-row"]').length };
    })()`) as Promise<{ first: string; count: string; texts: string[]; rows: number } | null>;
    const r = await read();
    const at = `${vp.width}`;
    L.check(`${at} · population: the header and its rows`, !!r && r.rows >= 5, JSON.stringify(r));
    if (!r) continue;
    const total = r.rows;
    L.check(`${at} · the header's first text is "${total} agents"`, r.first === `${total} agents`, r.first);
    L.check(`${at} · no other title in the header`, r.texts.length === 1 && r.texts[0] === `${total} agents`, JSON.stringify(r.texts));
    await tap(page, "[data-nb1='book'] [data-nb1='pill'][data-k='you']");
    await page.waitForTimeout(300);
    const y = await read();
    L.check(`${at} · Your move: "{n} of ${total} agents", n = the rows showing`, !!y && y.rows > 0 && y.first === `${y.rows} of ${total} agents`, JSON.stringify(y && { first: y.first, rows: y.rows }));
  }
  L.done(8);
});

/* ── L8 · the avatars ──────────────────────────────────────────────────────────────────────────────────────────── */
const AVATAR = {
  /* `border` is the drawn border: "dashed 1.5px", or "none" (no width — the preflight's solid 0px draws nothing) */
  none: { bg: "rgba(0, 0, 0, 0)", color: "rgb(244, 238, 229)", border: "dashed 1.5px", ring: null, selColor: "rgb(36, 51, 74)" },
  agent: { bg: "rgb(244, 238, 229)", color: "rgb(36, 51, 74)", border: "none", ring: null, selColor: "rgb(244, 238, 229)", selBg: "rgb(36, 51, 74)" },
  you: { bg: "rgb(217, 128, 95)", color: "rgb(255, 255, 255)", border: "none", ring: "rgba(217, 128, 95, 0.22) 0px 0px 0px 3px", selColor: "rgb(255, 255, 255)", selBg: "rgb(217, 128, 95)" },
  closed: { bg: "rgba(0, 0, 0, 0)", color: "rgba(244, 238, 229, 0.42)", border: "none", ring: "rgba(244, 238, 229, 0.22) 0px 0px 0px 1.5px inset", selColor: "rgba(28, 19, 15, 0.45)" },
} as const;
test("NB1-L8 CL avatars", async ({ page }) => {
  test.setTimeout(420_000);
  const L = new Ledger("L8");
  for (const vp of SIZES) {
    await openCl(page, vp);
    await mutate(page, "L8");
    const at = `${vp.width}`;
    for (const k of Object.keys(AVATAR) as (keyof typeof AVATAR)[]) {
      const want = AVATAR[k];
      const id = await page.evaluate((kk) => {
        const row = [...document.querySelectorAll<HTMLElement>(`[data-nb1="book"] [data-nb1="name-row"][data-k="${kk}"]`)].find((r) => r.getAttribute("aria-current") !== "true");
        return row?.dataset.id ?? null;
      }, k);
      L.check(`${at} · population: an agent who is ${k}`, !!id, String(id));
      if (!id) continue;
      const readAv = () => page.evaluate((i) => {
        const row = document.querySelector<HTMLElement>(`[data-nb1="book"] [data-nb1="name-row"][data-id="${i}"]`)!;
        const av = row.querySelector<HTMLElement>("[data-nb1='avatar']")!; const c = getComputedStyle(av); const name = getComputedStyle(row.querySelector(".nb1-tx b")!);
        return { bg: c.backgroundColor, color: c.color, border: parseFloat(c.borderTopWidth) > 0 && c.borderTopStyle !== "none" ? `${c.borderTopStyle} ${c.borderTopWidth}` : "none", shadow: c.boxShadow, name: name.color,
          dots: row.querySelectorAll("[class*='dot'], [class*='-d '], .nb1-sw").length };
      }, id);
      const a = await readAv();
      L.check(`${at} · ${k}: fill ${want.bg}, initials ${want.color}`, a.bg === want.bg && a.color === want.color, JSON.stringify(a));
      /* a declared 1.5px border is snapped to the device pixel (1px on a 1× screen), so dashed is "dashed 1px" or "dashed 1.5px" */
      const borderOk = want.border === "none" ? a.border === "none" : /^dashed 1(\.5)?px$/.test(a.border);
      L.check(`${at} · ${k}: border ${want.border}${want.ring ? `, ring ${want.ring}` : ""}`, borderOk && (!want.ring || a.shadow === want.ring), JSON.stringify(a));
      if (k === "closed") L.check(`${at} · closed: the name dims to 60%`, a.name === "rgba(244, 238, 229, 0.6)", a.name);
      L.check(`${at} · ${k}: no separate status dot in the row`, a.dots === 0, String(a.dots));
      await tap(page, `[data-nb1='book'] [data-nb1='name-row'][data-id='${id}']`);
      await page.waitForTimeout(250);
      const s = await readAv();
      const sw = want as { selColor: string; selBg?: string };
      L.check(`${at} · ${k} on the selected (cream) row: initials ${sw.selColor}${sw.selBg ? `, fill ${sw.selBg}` : ""}`, s.color === sw.selColor && (!sw.selBg || s.bg === sw.selBg), JSON.stringify(s));
    }
  }
  L.done(36);
});

/* ── L9 · the sections follow the sort ─────────────────────────────────────────────────────────────────────────── */
test("NB1-L9 CL sections", async ({ page }) => {
  test.setTimeout(420_000);
  const L = new Ledger("L9");
  for (const vp of SIZES) for (const sort of ["added", "surname"] as const) {
    await openCl(page, vp, { sort });
    const r = await page.evaluate(`(() => {
      const b = [...document.querySelectorAll('[data-nb1="book"]')].find((e) => e.getBoundingClientRect().height > 0);
      const labels = b ? [...b.querySelectorAll('[data-nb1="section"]')].map((s) => s.getAttribute('data-label')) : [];
      const th = b && b.querySelector('[data-nb1="thumb"]');
      return { labels, thumb: !!(th && th.getBoundingClientRect().height > 0) };
    })()`) as { labels: string[]; thumb: boolean };
    const at = `${vp.width} ${sort}`;
    L.check(`${at} · population: sections`, r.labels.length >= 2, JSON.stringify(r.labels.slice(0, 6)));
    if (sort === "added") {
      L.check(`${at} · month headings ("Aug 2026")`, r.labels.every((l) => /^[A-Z][a-z]{2} \d{4}$|^Not dated$/.test(l)), JSON.stringify(r.labels));
      L.check(`${at} · the index is hidden`, r.thumb === false, String(r.thumb));
    } else {
      L.check(`${at} · letter headings`, r.labels.every((l) => /^[A-Z#]$/.test(l)), JSON.stringify(r.labels));
      L.check(`${at} · the index is shown`, r.thumb === true, String(r.thumb));
    }
  }
  L.done(12);
});

/* ── L10 · the card ────────────────────────────────────────────────────────────────────────────────────────────── */
const NOTE = "NB1 lock note — safe to delete";
test("NB1-L10 CL card", async ({ page }) => {
  test.setTimeout(500_000);
  const L = new Ledger("L10");
  for (const vp of SIZES) {
    await openCl(page, vp);
    const at = `${vp.width}`;
    const card = () => page.evaluate(`(() => {
      const b = [...document.querySelectorAll('[data-nb1="book"]')].find((e) => e.getBoundingClientRect().height > 0); if (!b) return null;
      const c = b.querySelector('[data-nb1="card"]'); const sel = b.querySelector('[data-nb1="name-row"][aria-current="true"]');
      const ids = [...b.querySelectorAll('[data-nb1="name-row"]')].map((r) => r.getAttribute('data-id'));
      return { band: c ? c.querySelector('[data-nb1="band"] span').textContent : '', name: c ? c.querySelector('[data-nb1="card-name"]').textContent : '',
        wish: !!(c && c.querySelector('[data-nb1="wishlist"]')), query: !!(c && c.querySelector('[data-nb1="query"]')), notes: !!(c && c.querySelector('[data-nb1="notes"] textarea')),
        cardId: c ? c.getAttribute('data-id') : null, selId: sel ? sel.getAttribute('data-id') : null, selName: sel ? sel.querySelector('.nb1-tx b').textContent : '',
        pos: (b.querySelector('[data-nb1="pos"]') || {}).textContent || '', ids };
    })()`) as Promise<{ band: string; name: string; wish: boolean; query: boolean; notes: boolean; cardId: string | null; selId: string | null; selName: string; pos: string; ids: string[] } | null>;
    const c0 = await card();
    L.check(`${at} · population: the card`, !!c0 && !!c0.cardId && c0.ids.length >= 3, JSON.stringify(c0 && { ...c0, ids: c0.ids.length }));
    if (!c0) continue;
    L.check(`${at} · band word, name, wishlist, query block and Notes`, ["With you", "With the agent", "Not queried yet", "Closed"].includes(c0.band) && c0.name === c0.selName && c0.wish && c0.query && c0.notes, JSON.stringify(c0));
    /* ‹ › step the visible order — narrowed by a pill */
    await tap(page, "[data-nb1='book'] [data-nb1='pill'][data-k='agent']");
    await page.waitForTimeout(300);
    const v0 = await card();
    L.check(`${at} · population: Querying narrows the list`, !!v0 && v0.ids.length >= 2 && v0.ids.length < c0.ids.length, JSON.stringify(v0 && v0.ids.length));
    if (v0) {
      L.check(`${at} · "1 OF ${v0.ids.length}" on the first visible agent`, v0.pos === `1 OF ${v0.ids.length}` && v0.selId === v0.ids[0], `${v0.pos} ${v0.selId}`);
      await tap(page, "[data-nb1='book'] [data-nb1='next']");
      await page.waitForTimeout(250);
      const v1 = await card();
      L.check(`${at} · › steps to the next visible agent, "2 OF ${v0.ids.length}"`, !!v1 && v1.selId === v0.ids[1] && v1.cardId === v0.ids[1] && v1.pos === `2 OF ${v0.ids.length}`, `${v1?.selId} ${v1?.pos}`);
      await tap(page, "[data-nb1='book'] [data-nb1='pill'][data-k='all']");
      await page.waitForTimeout(250);
    }
    /* Notes persist across a reload, then the original is put back */
    if (vp.width === SIZES[0].width && !BASE) {
      const ta = page.locator("[data-nb1='book'] [data-nb1='notes'] textarea").first();
      if (!(await ta.count())) { L.check(`${at} · population: Notes`, false, "no Notes field"); continue; }
      const original = await ta.inputValue();
      const selId = (await card())?.selId;
      await ta.fill(NOTE); await ta.blur(); await page.waitForTimeout(2500);
      await page.reload(); await page.locator(BOOK_ROW).first().waitFor({ timeout: 30_000 }); await page.waitForTimeout(1500);
      const after = await card();
      const kept = await page.locator("[data-nb1='book'] [data-nb1='notes'] textarea").first().inputValue();
      L.check(`${at} · Notes persist across a reload (the same agent selected)`, after?.selId === selId && kept === NOTE, `${after?.selId} vs ${selId} · ${kept}`);
      const t2 = page.locator("[data-nb1='book'] [data-nb1='notes'] textarea").first();
      await t2.fill(original); await t2.blur(); await page.waitForTimeout(2500);
      await page.reload(); await page.locator(BOOK_ROW).first().waitFor({ timeout: 30_000 }); await page.waitForTimeout(1200);
      const back = await page.locator("[data-nb1='book'] [data-nb1='notes'] textarea").first().inputValue();
      L.check(`${at} · the original note is put back`, back === original, JSON.stringify(back));
    }
  }
  L.done(10);
});

/* ── L11 · full screen ─────────────────────────────────────────────────────────────────────────────────────────── */
test("NB1-L11 CL full screen", async ({ page }) => {
  test.setTimeout(420_000);
  const L = new Ledger("L11");
  for (const vp of SIZES) {
    await openCl(page, vp);
    await tap(page, "[data-nb1='book'] [data-nb1='full']");
    await page.waitForTimeout(900);
    await mutate(page, "L11");
    const read = () => page.evaluate(`(() => {
      const b = [...document.querySelectorAll('[data-nb1="book"]')].find((e) => e.getBoundingClientRect().height > 0); if (!b) return null;
      const lc = b.querySelector('[data-nb1="list-col"]').getBoundingClientRect(), rp = b.querySelector('[data-nb1="card-col"]').getBoundingClientRect();
      const page = getComputedStyle(document.querySelector('.ws-main') || document.body).getPropertyValue('--ws-page').trim();
      const toRgb = (c) => { const d = document.createElement('i'); d.style.color = c; document.body.appendChild(d); const v = getComputedStyle(d).color; d.remove(); return v; };
      return { pos: getComputedStyle(b).position, full: b.hasAttribute('data-full'), l: lc.left, t: Math.min(lc.top, rp.top), r: rp.right, bt: Math.max(lc.bottom, rp.bottom),
        vw: innerWidth, vh: innerHeight, cols: getComputedStyle(b).gridTemplateColumns.split(' ').length, strip: !!b.querySelector('[data-nb1="strip"]'), card: !!b.querySelector('[data-nb1="card"]'),
        bg: getComputedStyle(b).backgroundColor, page: page ? toRgb(page) : '' };
    })()`) as Promise<Record<string, number | string | boolean> | null>;
    const r = await read();
    const at = `${vp.width}`;
    L.check(`${at} · population: the box in full screen`, !!r && r.full === true, JSON.stringify(r));
    if (!r) continue;
    L.check(`${at} · fixed, at inset 20 (±1)`, r.pos === "fixed" && near(r.l as number, 20, 1) && near(r.t as number, 20, 1) && near((r.vw as number) - (r.r as number), 20, 1) && near((r.vh as number) - (r.bt as number), 20, 1), JSON.stringify(r));
    L.check(`${at} · the same two columns, strip and card`, r.cols === 2 && r.strip === true && r.card === true, JSON.stringify(r));
    L.check(`${at} · no navy backdrop: the page's own background`, r.bg === r.page && r.bg !== "rgb(36, 51, 74)", `${r.bg} vs ${r.page}`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(900);
    const e = await read();
    L.check(`${at} · Esc exits`, !!e && e.full === false && e.pos !== "fixed", JSON.stringify(e && { full: e.full, pos: e.pos }));
  }
  L.done(10);
});

/* ── L12 · the functions kept ──────────────────────────────────────────────────────────────────────────────────── */
const csvRows = (path: string) => readFileSync(path, "utf8").replace(/^﻿/, "").split(/\r?\n(?=(?:[^"]*"[^"]*")*[^"]*$)/).slice(1).filter((l) => l.trim() !== "").length;
test("NB1-L12 CL kept functions", async ({ page }) => {
  test.setTimeout(420_000);
  const L = new Ledger("L12");
  mkdirSync(`${DIR}/runs`, { recursive: true });
  for (const vp of SIZES) {
    await openCl(page, vp);
    await mutate(page, "L12");
    const at = `${vp.width}`;
    /* two ticks: hover each avatar, press its checkbox */
    const rows = page.locator("[data-nb1='book'] [data-nb1='name-row']");
    for (const i of [1, 2]) {
      const av = rows.nth(i).locator("[data-nb1='avatar']");
      if (!(await av.count())) break;
      await av.hover();
      await page.waitForTimeout(150);
      const tk = rows.nth(i).locator("[data-nb1='tick']");
      if (await tk.isVisible()) await tk.click(); else break;
    }
    await page.waitForTimeout(300);
    const sel = await page.evaluate(`(() => { const s = [...document.querySelectorAll('[data-nb1="selection"]')].find((e) => e.getBoundingClientRect().height > 0);
      return s ? { n: (s.querySelector('[data-nb1="selected-n"]') || {}).textContent, acts: [...s.querySelectorAll('button')].map((b) => b.textContent.trim()) } : null; })()`) as { n: string; acts: string[] } | null;
    L.check(`${at} · two ticks show "2 selected" and the bulk actions`, !!sel && sel.n === "2 selected" && sel.acts.some((a) => /^Export 2$/.test(a)) && sel.acts.includes("Clear"), JSON.stringify(sel));
    if (sel) await tap(page, "[data-nb1='bulk-clear']");
    /* Export in Filters downloads the rows showing */
    await tap(page, "[data-nb1='book'] [data-nb1='pill'][data-k='agent']");
    await page.waitForTimeout(250);
    const v = await page.locator("[data-nb1='book'] [data-nb1='name-row']").count();
    await tap(page, "[data-nb1='book'] [data-nb1='filters']");
    await page.waitForTimeout(300);
    const label = (await page.locator("[data-nb1='export']").count()) ? await page.locator("[data-nb1='export']").first().textContent() : null;
    L.check(`${at} · population: Export in Filters`, !!label && v > 0, `${label} · ${v}`);
    if (label) {
      const dl = page.waitForEvent("download", { timeout: 15_000 });
      await tap(page, "[data-nb1='export']");
      const d = await dl; const p = `${DIR}/runs/L12-${vp.width}${MUT ? `-mut-${MUT}` : ""}.csv`; await d.saveAs(p);
      L.check(`${at} · "Export ${v} agents" downloads ${v} rows`, label.trim() === `Export ${v} agents` && csvRows(p) === v, `${label} · ${csvRows(p)} rows`);
    }
    await page.keyboard.press("Escape");
    await tap(page, "[data-nb1='book'] [data-nb1='pill'][data-k='all']");
    await page.waitForTimeout(250);
    /* "+ Add email" opens the agent form at email */
    const target = await page.evaluate(() => {
      const b = [...document.querySelectorAll<HTMLElement>("[data-nb1='book']")].find((e) => e.getBoundingClientRect().height > 0);
      const add = b?.querySelector<HTMLElement>("[data-nb1='card'] [data-nb1='add'][data-field='email']");
      return !!add;
    });
    if (!target) {
      /* the selected agent has an email: find one without */
      const ids = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-nb1='book'] [data-nb1='name-row']")].map((r) => r.dataset.id!));
      for (const id of ids.slice(0, 20)) {
        await tap(page, `[data-nb1='book'] [data-nb1='name-row'][data-id='${id}']`);
        await page.waitForTimeout(150);
        if (await page.locator("[data-nb1='card'] [data-nb1='add'][data-field='email']").count()) break;
      }
    }
    const add = page.locator("[data-nb1='card'] [data-nb1='add'][data-field='email']").first();
    L.check(`${at} · population: an agent with no email`, (await add.count()) > 0, "");
    if (await add.count()) {
      await add.click();
      await page.waitForTimeout(1200);
      const f = await page.evaluate(() => { const a = document.activeElement as HTMLElement | null; return a ? a.getAttribute("data-ae") : null; });
      L.check(`${at} · "+ Add email" opens the agent form at email`, f === "email", String(f));
      await page.keyboard.press("Escape"); await page.waitForTimeout(400); await page.keyboard.press("Escape"); await page.waitForTimeout(400);
    }
  }
  L.done(10);
});
