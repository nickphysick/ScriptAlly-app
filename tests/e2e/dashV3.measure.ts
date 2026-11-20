/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v3 — the DB3 locks, measured on the rendered page (ref design-refs/dashboard-v3.html), at 1512 × 982 and
 * 1280 × 720, in the three states the one page renders, on the emulator's harness account:
 *
 *   day one      db60-pre   — no queries
 *   first weeks  seed-ms-2  — a few queries
 *   established  seed-ms-1  — an established list
 *
 *   npm run e2e:emu -- tests/e2e/dashV3.measure.ts
 *
 * H the header · L the layout and order · C the card heads · N nothing cut, no shadow clipped · K the hawk pinned.
 * Every state states its population before anything is asserted on it.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

const DIR = "reports/dashboard-v3";
/* Next up v1, Phase 3: the one filled button says what it does (lib/nextUp `nextButtons`), where it said "Open task".
   The other kinds' filled button is the task's own action ("Fill in", "Log a query", "Record a response", "Open"). */
const NEXT_UP_BUTTONS = /^(Log it as sent|Log the nudge|Close it|Record your answer|See who to tell|Fill in|Log a query|Record a response|Open)$/;
const SIZES = [{ width: 1512, height: 982 }, { width: 1280, height: 720 }] as const;
const STATES = [
  { key: "day-one", ms: "db60-pre" },
  { key: "first-weeks", ms: "seed-ms-2" },
  { key: "established", ms: "seed-ms-1" },
] as const;

type Row = { lock: string; where: string; ok: boolean; detail: string };
const rows: Row[] = [];
const check = (lock: string, where: string, ok: boolean, detail: string) => rows.push({ lock, where, ok: !!ok, detail });

async function openDash(page: Page, ms: string, vp: { width: number; height: number }) {
  await page.addInitScript((id) => { try { localStorage.setItem("scriptally_active_manuscript_id", id); } catch { /* private mode */ } }, ms);
  await openRoute(page, "/dashboard", vp);
  await page.locator('.d2 [data-d58="page"][data-loading="0"]').first().waitFor({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1600);
}

/* everything read in one pass, in the page */
const read = (page: Page) => page.evaluate(() => {
  const root = [...document.querySelectorAll<HTMLElement>(".d58.d2")].find((e) => e.getBoundingClientRect().width > 0)!;
  const r = (el: Element | null) => (el ? el.getBoundingClientRect().toJSON() as DOMRect : null);
  const q = (s: string) => root.querySelector(s);
  const qa = (s: string) => [...root.querySelectorAll<HTMLElement>(s)];
  const bg = (el: Element | null) => (el ? getComputedStyle(el).backgroundColor : "");
  const band = q('[data-d2="band"]') as HTMLElement | null;
  const port = root.closest(".ws-wbody") as HTMLElement | null;
  const order = (col: string) => qa(`[data-d2="${col}"] > *`).filter((e) => e.getBoundingClientRect().height > 0)
    .map((e) => e.getAttribute("data-d2-card") ?? e.getAttribute("data-d60") ?? e.getAttribute("data-d2") ?? e.getAttribute("data-d3") ?? e.getAttribute("data-fv1") ?? e.className);
  /* every ancestor between a card and the scroller that would clip its shadow */
  const clippers: string[] = [];
  for (const c of qa(".os-card, .d2-gs, .d3-gsrow")) {
    for (let p = c.parentElement; p && p !== port; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (cs.overflow !== "visible" || cs.overflowX !== "visible" || cs.overflowY !== "visible") { clippers.push(`${p.className.slice(0, 40)}:${cs.overflow}`); break; }
    }
  }
  const cards = qa(".os-card, .d3-gsrow, [data-d2='feed']").filter((e) => e.getBoundingClientRect().height > 0).map((e) => ({ name: e.getAttribute("data-d2-card") ?? e.getAttribute("data-d60") ?? e.className.slice(0, 30), ...r(e)! }));
  /* the chart's week circles are plot marks, not actions */
  /* "navy" is whatever the page's one navy is: the band's own fill (Consistency roll-out v1 repoints the token) */
  const navy = band ? getComputedStyle(band).backgroundColor : "rgb(45, 58, 80)";
  const navyFilled = [...root.querySelectorAll<HTMLElement>("button:not([data-d2='week'])")].filter((b) => b.getBoundingClientRect().height > 0 && getComputedStyle(b).backgroundColor === navy).map((b) => b.textContent?.trim() ?? "");
  const hawk = document.querySelector('[data-d2="hawk"]');
  const hawkCs = hawk ? getComputedStyle(hawk) : null;
  return {
    vw: window.innerWidth, vh: window.innerHeight,
    state: root.getAttribute("data-fv2"),
    nQueriesCount: Number(q('[data-d2-card="active"] [data-d2="chart-count"]')?.textContent?.match(/\d+/)?.[0] ?? 0),
    marks: qa('[data-d3="mark"]').map((m) => ({ stage: m.dataset.stage, n: Number(m.dataset.n), vis: m.getBoundingClientRect().width > 0 })),
    band: r(band), bandH: band?.getBoundingClientRect().height ?? 0,
    /* the band's own height less its text column's: its vertical padding alone when nothing wraps */
    bandSlack: band ? band.getBoundingClientRect().height - (q('.d2-bandtx') as HTMLElement).getBoundingClientRect().height : -1,
    title: r(q('[data-d2="title"]')), buttons: r(q('[data-d2="buttons"]')),
    pills: qa('[data-d2="band"] button').map((b) => ({ t: b.textContent?.trim(), bg: bg(b) })),
    logInBand: !!q('[data-d2="band"] [data-d2="log"]'),
    founding: r(q('[data-d2-card="founding"]')), foundingFolded: q('[data-d2-card="founding"]')?.getAttribute("data-folded"),
    left: r(q('[data-d2="left"]')), mid: r(q('[data-d2="mid"]')), right: r(q('[data-d2="right"]')),
    order: { left: order("left"), mid: order("mid") },
    closedHoop: !!q('[data-d60="closed-hoop"]'),
    navy,
    heads: {
      next: bg(q('[data-d2-card="next"] .os-band')), nextStage: q('[data-d2-card="next"]')?.getAttribute("data-stage") ?? null,
      expected: bg(q('[data-d2-card="expected"] .os-band')), chart: bg(q('[data-d2-card="active"] .os-band')),
      agents: bg(q('[data-d60="agents-hoop"] .os-band')),
    },
    expected: { rows: qa('[data-d3="ex-row"]').length, past: qa('[data-d3="ex-past"]').length, say: q('[data-d3="ex-say"]')?.textContent ?? q('.d3-exsay')?.textContent ?? "" },
    gsPlace: q('[data-d2="left"]')?.getAttribute("data-gs"),
    clippers, cards, navyFilled,
    hScroll: port ? port.scrollWidth - port.clientWidth : -1,
    hawk: hawk ? { pos: hawkCs!.position, ...r(hawk)! } : null,
  };
});

for (const s of STATES) for (const vp of SIZES) {
  const where = `${s.key} ${vp.width}x${vp.height}`;
  test(`DB3 · ${where}`, async ({ page }) => {
    test.setTimeout(120_000);
    await openDash(page, s.ms, vp);
    const m = await read(page);
    mkdirSync(`${DIR}/shots`, { recursive: true });
    await page.screenshot({ path: `${DIR}/shots/${s.key}-${vp.width}x${vp.height}.png`, animations: "disabled" });
    /* the whole page: the scroller grown to its content */
    writeFileSync(`${DIR}/ledger-${s.key}-${vp.width}x${vp.height}.json`, JSON.stringify(m, null, 1));

    /* population first */
    const total = m.marks.reduce((t, x) => t + x.n, 0);
    if (s.key === "day-one") check("P", where, m.state === "pre" && total === 0, `state ${m.state}, marks ${total}`);
    else check("P", where, m.state !== "pre" && total > 0, `state ${m.state}, ${total} queries across ${m.marks.length} stages`);

    /* H · the header */
    check("H1", where, !m.logInBand, "no Log a query in the band");
    check("H2", where, m.pills.length === 2 && m.pills.every((p) => p.bg === "rgba(0, 0, 0, 0)"), JSON.stringify(m.pills));
    check("H3", where, s.key === "day-one" ? m.marks.length === 0 : m.marks.length > 0 && m.marks.every((x) => x.vis && x.n > 0), JSON.stringify(m.marks));
    const order = ["queried", "partial", "full", "offer", "closed"];
    check("H4", where, m.marks.every((x, i, a) => i === 0 || order.indexOf(a[i - 1].stage!) < order.indexOf(x.stage!)), m.marks.map((x) => x.stage).join(","));
    check("H5", where, m.bandH > 0 && m.bandSlack > 0 && m.bandSlack <= 46 && !!m.buttons && !!m.title && Math.abs((m.buttons.top + m.buttons.bottom) / 2 - (m.band!.top + m.band!.bottom) / 2) < 30, `band ${m.bandH.toFixed(0)}px, ${m.bandSlack.toFixed(0)}px over its text`);

    /* L · layout */
    check("L1", where, !!m.left && !!m.mid && !!m.right && m.left.right <= m.mid.left && m.mid.right <= m.right.left, "three columns, left to right");
    check("L2", where, m.foundingFolded === "1" && !!m.founding && m.founding.bottom <= m.left!.top, `founding folded=${m.foundingFolded}`);
    check("L3", where, !m.closedHoop, "no Closed queries card");
    const lo = m.order.left.join(" > ");
    if (s.key === "day-one") check("L4", where, m.gsPlace === "lead" && m.order.left[0] === "gs-slot" && !lo.includes("next"), lo);
    else check("L4", where, m.order.left[0] === "next", lo);
    check("L5", where, m.order.mid.indexOf("expected") > 0, m.order.mid.join(" > "));
    check("L6", where, m.navyFilled.length <= 1 && (s.key === "day-one" || m.navyFilled.every((t) => NEXT_UP_BUTTONS.test(t))), JSON.stringify(m.navyFilled));

    /* C · heads */
    if (s.key !== "day-one") check("C1", where, m.heads.expected === "rgb(239, 230, 214)", `expected head ${m.heads.expected}`);
    check("C2", where, m.heads.chart === "" || m.heads.chart === m.navy, `chart head ${m.heads.chart}, the band's navy ${m.navy}`);
    /* the lock is not vacuous: past day one the one filled button is there, and is the page's navy */
    if (s.key !== "day-one") check("L7", where, m.navyFilled.length === 1, JSON.stringify(m.navyFilled));
    check("C3", where, m.heads.agents === "rgb(255, 255, 255)", `agents head ${m.heads.agents}`);
    if (s.key !== "day-one") check("C4", where, m.heads.nextStage === "none" ? m.heads.next === "rgb(255, 255, 255)" : m.heads.next !== "" && m.heads.next !== "rgb(244, 230, 214)", `next ${m.heads.nextStage} ${m.heads.next}`);

    /* N · nothing cut */
    check("N1", where, m.hScroll <= 0, `horizontal overflow ${m.hScroll}px`);
    check("N2", where, m.clippers.length === 0, m.clippers.join(" | "));
    check("N3", where, m.cards.every((c) => c.left >= 0 && c.right <= m.vw), m.cards.filter((c) => c.right > m.vw).map((c) => c.name).join(","));
    /* K · the hawk */
    check("K1", where, !!m.hawk && m.hawk.pos === "fixed" && Math.abs(m.hawk.right - m.vw) < 40 && Math.abs(m.hawk.bottom - m.vh) < 40, JSON.stringify(m.hawk));

    /* the third view and Expected back, where there is anything to read */
    if (s.key !== "day-one") {
      await page.locator('.d2 [data-d2="chart-toggle"] button[data-m="going"]').first().click();
      await page.waitForTimeout(300);
      const g = await page.evaluate(() => {
        const root = [...document.querySelectorAll<HTMLElement>(".d58.d2")].find((e) => e.getBoundingClientRect().width > 0)!;
        const band = root.querySelector('[data-d2-card="active"] .os-bandrow') as HTMLElement | null;
        return { say: root.querySelector('[data-d3="going-say"]')?.textContent ?? "", rows: root.querySelectorAll('[data-d3="going-row"]').length,
          bandOverflow: band ? band.scrollWidth - band.clientWidth : -1 };
      });
      check("G1", where, g.rows === 3 && /^\d+ of \d+ agents? asked to read more\.$/.test(g.say), `${g.say} (${g.rows} bars)`);
      check("G2", where, g.bandOverflow <= 0, `chart band overflow ${g.bandOverflow}px`);
      await page.screenshot({ path: `${DIR}/shots/${s.key}-${vp.width}x${vp.height}-going.png`, animations: "disabled" });
    }
    const mine = rows.filter((x) => x.where === where);
    writeFileSync(`${DIR}/readings-${s.key}-${vp.width}x${vp.height}.json`, JSON.stringify(mine, null, 1));
    for (const x of mine.filter((y) => !y.ok)) console.log(`  ✗ ${x.lock} · ${x.where} — ${x.detail}`);
    expect(mine.length).toBeGreaterThanOrEqual(15);
    expect(mine.filter((x) => !x.ok).map((x) => `${x.lock} — ${x.detail}`)).toEqual([]);
  });
}
