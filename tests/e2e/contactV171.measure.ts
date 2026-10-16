/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v17.1 — locks CL17-amend A4, B3, B4, C2, D1 and D2, on the rendered page at 1512 × 900 and
 * 1280 × 800 with the shell.
 *
 * Each lock was run against the v17 build (`CL171_BASE=1`, ledger `base-<lock>.json`) and with its named mutation
 * (`CL171_MUTATE=<lock>`, ledger `mut-<lock>.json`) before its green was believed. Most mutations are applied in
 * the page (the table below); D1's and D2's are source edits made and undone in the measurement worktree, because
 * what they break is a decision the code makes, not something drawn.
 *
 * ⚠️ B4 AND D1 NEED A LIST WITH NO GAPS, which the shared account cannot be made into. They set the dev-only review
 *    aid `window.__SA_HK_ALL_FILLED` (lib/hkReviewAid), which runs Housekeeping's own model over the agents that
 *    already have none; the ring, its words and the tab are still the real derivation's.
 * ⚠️ D2 WRITES TO THE ACCOUNT AND PUTS IT BACK IN THE SAME RUN. It needs a Housekeeping with nothing put off at the
 *    start, uses "Later" on one item as the count falling and "Show them now" as it rising, and ends with nothing
 *    put off and no dismissal stored (Undo).
 */
import { expect, test, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { openContacts16 } from "./cl16Lib";

const DIR = "reports/contact-list-v17-1";
const MUT = process.env.CL171_MUTATE ?? "";
const BASE = process.env.CL171_BASE === "1";
const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;
const near = (a: unknown, b: number, t: number) => typeof a === "number" && Number.isFinite(a) && Math.abs(a - b) <= t;

type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail: string) { this.rows.push({ lock: this.name, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${BASE ? "base-" : ""}${MUT ? "mut-" : ""}${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 30)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.where} — ${r.detail}`)).toEqual([]);
  }
}

/** one named break per lock, applied in the page (D1's and D2's are source edits; see the header) */
const MUTATIONS: Record<string, { css?: string; js?: string }> = {
  /* the inset removed */
  A4: { css: `.cl17-hd .cl17-tr, .ws-app.sheet-wide .cl17-hd .cl17-tr { margin-inline: 0 !important; } .cl17-hd .cl17-shadow { left: -70px !important; }` },
  /* pct computed from the card's own counts (Querying over everyone on file), written over the ring's figure */
  B3: { js: `(() => { const fix = () => { const card = [...document.querySelectorAll('.aglist [data-cl17="card"]')].find((e) => e.getBoundingClientRect().height > 0); if (!card) return; const n = [...card.querySelectorAll('[data-cl17="card-n"]')].map((e) => Number(e.textContent) || 0); const t = n.reduce((a, b) => a + b, 0); const p = t ? Math.round((n[1] / t) * 100) : 0; const el = card.querySelector('[data-cl17="ring-pct"]'); if (el && el.textContent !== p + "%") el.innerHTML = p + "<i>%</i>"; }; new MutationObserver(fix).observe(document.body, { subtree: true, childList: true, characterData: true }); fix(); })()` },
  /* the rust circle left drawn at 100 */
  B4: { js: `(() => { const fix = () => { for (const svg of document.querySelectorAll('.aglist [data-cl17="ring"] svg')) if (!svg.querySelector('[data-cl17="ring-gaps"]')) { const c = document.createElementNS("http://www.w3.org/2000/svg", "circle"); c.setAttribute("data-cl17", "ring-gaps"); c.setAttribute("cx", "47.5"); c.setAttribute("cy", "47.5"); c.setAttribute("r", "42"); c.setAttribute("fill", "none"); c.setAttribute("stroke", "#a2452a"); c.setAttribute("stroke-width", "9"); svg.insertBefore(c, svg.firstChild); } }; new MutationObserver(fix).observe(document.body, { subtree: true, childList: true }); fix(); })()` },
  /* the search set back to 300 */
  C2: { css: `.cl17-hd .cl17-fr .cl17-find.cl13-find { flex: 0 0 300px !important; width: 300px !important; }` },
};
const mutate = async (page: Page, lock: string) => {
  const m = MUT === lock ? MUTATIONS[lock] : null;
  if (!m) return;
  if (m.css) await page.addStyleTag({ content: m.css });
  if (m.js) await page.evaluate(m.js);
  await page.waitForTimeout(250);
};

const open = async (page: Page, vp: { width: number; height: number }, lock: string, opts: { allFilled?: boolean } = {}) => {
  if (opts.allFilled) await page.addInitScript(() => { (window as unknown as { __SA_HK_ALL_FILLED?: boolean }).__SA_HK_ALL_FILLED = true; });
  await openContacts16(page, vp);
  await page.waitForTimeout(400);
  await mutate(page, lock);
};

/** what the page shows, read in one go from the visible Contact list */
const read = (page: Page) => page.evaluate(() => {
  const vis = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].filter((e) => e.getBoundingClientRect().height > 0);
  const hd = vis(".aglist .cl17-hd")[0];
  const box = (e: Element | null | undefined) => { if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height }; };
  const card = hd?.querySelector<HTMLElement>('[data-cl17="card"]');
  const tab = document.querySelector<HTMLElement>('[data-ftab="housekeeping"]');
  const ink = card?.querySelector<SVGCircleElement>('[data-cl17="ring-ink"]');
  return {
    wide: !!document.querySelector(".ws-app.sheet-wide"),
    hd: box(hd), tb: box(hd?.querySelector('[data-cl17="title-block"]')), acts: box(hd?.querySelector('[data-cl17="acts"]')),
    card: box(card), cardCount: hd ? hd.querySelectorAll('[data-cl17="card"]').length : 0,
    counts: card?.querySelector<HTMLElement>('[data-cl17="counts"]')?.offsetWidth ?? null,
    countsInCard: !!card?.querySelector('[data-cl17="counts"]'), healthInCard: !!card?.querySelector('[data-cl17="health"]'),
    detail: card ? card.querySelectorAll('[data-cl17="card-detail"]').length : -1,
    countsText: card?.querySelector('[data-cl17="counts"]')?.textContent ?? "",
    ring: box(card?.querySelector('[data-cl17="ring"]')),
    pct: card?.querySelector('[data-cl17="ring-pct"]')?.textContent ?? "",
    inkDash: ink ? Number((ink.getAttribute("stroke-dasharray") ?? "").split(/\s+/)[0]) : null,
    gapsCircle: !!card?.querySelector('[data-cl17="ring-gaps"]'), joins: card ? card.querySelectorAll('[data-cl17="ring-join"]').length : -1,
    gapLine: card?.querySelector('[data-cl17="health-gaps"]')?.textContent ?? "",
    gapStyle: (() => { const e = card?.querySelector<HTMLElement>('[data-cl17="health-gaps"]'); if (!e) return null; const c = getComputedStyle(e); return { color: c.color, deco: c.textDecorationLine }; })(),
    label: card?.querySelector('[data-cl17="health"]')?.getAttribute("aria-label") ?? "",
    hawk: hd ? [...hd.querySelectorAll("img")].filter((i) => /contact-disc-hawk/.test(i.getAttribute("src") ?? "")).length : -1,
    shadow: (() => { const s = hd?.querySelector<HTMLElement>('[data-cl17="shadow"]'); return s ? Number(getComputedStyle(s).opacity) : null; })(),
    fr: (() => { const f = hd?.querySelector<HTMLElement>('[data-cl17="filter-row"]'); return f ? { l: f.getBoundingClientRect().left, r: f.getBoundingClientRect().right, sw: f.scrollWidth, cw: f.clientWidth } : null; })(),
    find: box(hd?.querySelector('[data-cl17="filter-row"] .cl17-find')),
    genre: box(hd?.querySelector('[data-cl17="filter-row"] .cl14-gtok')),
    list: box(vis(".aglist .cl16-list")[0]),
    tab: tab ? { shown: tab.getBoundingClientRect().height > 0 && !tab.classList.contains("is-hidden"), bg: getComputedStyle(tab).backgroundColor, counts: tab.querySelector('[data-hkv="tab-counts"]')?.textContent ?? "" } : null,
    x: !!document.querySelector('[data-ftab-x="housekeeping"]'),
    note: document.querySelector('[data-hkv="tab-note"]')?.textContent ?? null,
    drawer: !!document.querySelector('[data-hdr="housekeeping"].is-in'),
    scroll: vis(".agl-wpg .wpg-scroll")[0]?.scrollTop ?? null,
  };
});
type Reading = Awaited<ReturnType<typeof read>>;
/** "49 gaps · 1 of 37 filled in" → { gaps, filled, total } */
/* RE-POINTED (v18 §F.1): the tab reads "{gaps} gaps · {pct}% list health" */
const tabFigures = (s: string) => { const m = s.match(/(\d+)\s+gaps?\D+(\d+)% list health/i); return m ? { gaps: +m[1], pct: +m[2], filled: NaN, total: NaN } : null; };
const insetOf = (r: Reading) => (r.hd ? (r.wide ? Math.max(64, (r.hd.w - 1080) / 2) : Math.max(40, (r.hd.w - 900) / 2)) : NaN);

/* ───────────────────────── A4 · inset ───────────────────────── */
test("A4 · the title row is inset; the filter row and the list are not; no hawk; the shadow stays", async ({ page }) => {
  const L = new Ledger("A4");
  for (const vp of SIZES) {
    await open(page, vp, "A4");
    const r = await read(page); const w = `@${vp.width}`;
    L.check(`header present ${w}`, !!r.hd && !!r.tb && !!r.card, `hd ${!!r.hd} · title block ${!!r.tb} · card ${!!r.card}`);
    if (!r.hd || !r.tb || !r.card) continue;
    const ins = insetOf(r);
    /* RETIRED (v18.2 §A): the title block starts 28px past the archivist now, not at the row's inset (CL182 A1) */
    void ins;
    L.check(`card's right = header's right − inset (±1) ${w}`, near(r.card.r, r.hd.r - ins, 1), `${r.card.r.toFixed(1)} vs ${(r.hd.r - ins).toFixed(1)}`);
    /* RETIRED (v18 §B): the filter row is gone from the page header */
    L.check(`no contact-disc-hawk image in the header ${w}`, r.hawk === 0, `${r.hawk}`);
    /* RE-POINTED (v18.2 §A): the shadow is at .1 over the List health card */
    L.check(`the shadow at opacity 0.1 (±0.01) ${w}`, near(r.shadow, 0.1, 0.01), `${r.shadow}`);
  }
  L.done(8); /* v18.2: the title-left reading retired at both widths */
});

/* ───────────────────────── B3 · the card ───────────────────────── */
/* RETIRED (Contact list v18): v18 §F.1: List health is the points share now (CL18 F1 holds the number on the ring, the tab and the drawer) */
test.skip("B3 · one card: compact counts, no detail; List health is Housekeeping's figures and opens it", async ({ page }) => {
  const L = new Ledger("B3");
  for (const vp of SIZES) {
    await open(page, vp, "B3");
    const r = await read(page); const w = `@${vp.width}`;
    const f = tabFigures(r.tab?.counts ?? "");
    L.check(`precondition: the tab states Housekeeping's figures ${w}`, !!f, `"${r.tab?.counts}"`);
    L.check(`one card holds both panels ${w}`, r.cardCount === 1 && r.countsInCard && r.healthInCard, `${r.cardCount} cards · counts ${r.countsInCard} · health ${r.healthInCard}`);
    L.check(`counts panel ${r.wide ? 230 : 210} (±1), no detail text ${w}`, near(r.counts, r.wide ? 230 : 210, 1) && r.detail === 0 && !/ready to query|without a reply|waiting/i.test(r.countsText),
      `${r.counts} · ${r.detail} detail · "${r.countsText.slice(0, 60)}"`);
    L.check(`ring ${r.wide ? 92 : 76} (±1) ${w}`, !!r.ring && near(r.ring.w, r.wide ? 92 : 76, 1) && near(r.ring.h, r.wide ? 92 : 76, 1), `${r.ring?.w}×${r.ring?.h}`);
    if (!f) continue;
    const pct = Math.round((f.filled / f.total) * 100);
    L.check(`figure = Housekeeping's filled share ${w}`, r.pct === `${pct}%`, `"${r.pct}" vs ${pct}% (${f.filled} of ${f.total})`);
    const C = 2 * Math.PI * 42;
    L.check(`ink arc in proportion to pct (±1%) ${w}`, pct === 0 ? r.inkDash === null : near(r.inkDash, (C * pct) / 100, C * 0.01), `${r.inkDash?.toFixed(2)} vs ${((C * pct) / 100).toFixed(2)}`);
    L.check(`gap line "${f.gaps} gaps to fill" ${w}`, r.gapLine === (f.gaps === 1 ? "1 gap to fill" : `${f.gaps} gaps to fill`), `"${r.gapLine}"`);
    L.check(`its label ${w}`, r.label === `List health ${pct}%. ${r.gapLine}. Open Housekeeping`, `"${r.label}"`);
    /* a press opens the drawer; Escape closes it; Enter on the panel opens it too */
    await page.locator('.aglist [data-cl17="health"]').filter({ visible: true }).first().click();
    await page.waitForTimeout(500);
    L.check(`a press opens Housekeeping ${w}`, (await read(page)).drawer, "drawer");
    await page.keyboard.press("Escape"); await page.waitForTimeout(500);
    await page.locator('.aglist [data-cl17="health"]').filter({ visible: true }).first().focus();
    await page.keyboard.press("Enter"); await page.waitForTimeout(500);
    L.check(`Enter on it opens Housekeeping ${w}`, (await read(page)).drawer, "drawer");
    await page.keyboard.press("Escape"); await page.waitForTimeout(500);
    /* v17 A2's press behaviour, in the new card */
    const before = (await read(page)).scroll;
    await page.locator('.aglist [data-cl17="card-row"][data-k="live"]').filter({ visible: true }).first().click();
    await page.waitForTimeout(500);
    const pr = await page.evaluate(() => {
      const card = [...document.querySelectorAll<HTMLElement>('.aglist [data-cl17="card"]')].find((e) => e.getBoundingClientRect().height > 0)!;
      const rows = [...card.querySelectorAll<HTMLElement>('[data-cl17="card-row"]')];
      return { on: card.getAttribute("data-on"), rows: rows.map((x) => ({ k: x.dataset.k, p: x.getAttribute("aria-pressed"), o: getComputedStyle(x).opacity, u: getComputedStyle(x.querySelector('[data-cl17="card-label"]')!).textDecorationLine })) };
    });
    const live = pr.rows.find((x) => x.k === "live"); const rest = pr.rows.filter((x) => x.k !== "live");
    L.check(`A2: the press filters and marks its row ${w}`, pr.on === "live" && live?.p === "true" && live.u === "underline", JSON.stringify(live));
    L.check(`A2: the others fade to 0.32 ${w}`, rest.length === 2 && rest.every((x) => near(Number(x.o), 0.32, 0.01) && x.p === "false"), JSON.stringify(rest));
    L.check(`A2: nothing scrolls ${w}`, (await read(page)).scroll === before, `${before} → ${(await read(page)).scroll}`);
    await page.locator('.aglist [data-cl17="card-row"][data-k="live"]').filter({ visible: true }).first().click();
  }
  L.done(26);
});

/* ───────────────────────── B4 · full ───────────────────────── */
test("B4 · every gap filled: a solid ink ring, 100%, All filled in, and no tab", async ({ page }) => {
  const L = new Ledger("B4");
  for (const vp of SIZES) {
    await open(page, vp, "B4", { allFilled: true });
    const r = await read(page); const w = `@${vp.width}`;
    const C = 2 * Math.PI * 42;
    L.check(`precondition: the list is not empty ${w}`, !!r.card, "card");
    L.check(`solid ink: the arc is the whole circle, no rust, no joins ${w}`, near(r.inkDash, C, 0.01) && !r.gapsCircle && r.joins === 0, `ink ${r.inkDash?.toFixed(2)} of ${C.toFixed(2)} · rust ${r.gapsCircle} · joins ${r.joins}`);
    L.check(`reads 100% ${w}`, r.pct === "100%", `"${r.pct}"`);
    L.check(`reads All filled in, ink 60%, not underlined ${w}`, r.gapLine === "All filled in" && r.gapStyle?.color === "rgba(28, 19, 15, 0.6)" && r.gapStyle?.deco === "none", `"${r.gapLine}" ${JSON.stringify(r.gapStyle)}`);
    L.check(`its label ${w}`, r.label === "List health 100%. All filled in. Open Housekeeping", `"${r.label}"`);
    L.check(`no tab ${w}`, r.tab === null && !r.x, `tab ${JSON.stringify(r.tab)} · × ${r.x}`);
  }
  L.done(12);
});

/* ───────────────────────── C2 · search ───────────────────────── */
/* RETIRED (Contact list v18): v18 §B: the filter row is gone; the search is in the list header (CL18 B1 holds it on one line) */
test.skip("C2 · the search is 220 at compact widths and the filter row does not overflow", async ({ page }) => {
  const L = new Ledger("C2");
  for (const vp of SIZES) {
    await open(page, vp, "C2");
    const r = await read(page); const w = `@${vp.width}`;
    if (vp.width === 1280) L.check(`the search box is 220 (±1) ${w}`, near(r.find?.w, 220, 1), `${r.find?.w}`);
    L.check(`scrollWidth = clientWidth ${w}`, !!r.fr && r.fr.sw === r.fr.cw, `${r.fr?.sw} / ${r.fr?.cw}`);
    L.check(`the Genre field's right edge is inside the row ${w}`, !!r.fr && !!r.genre && r.genre.r <= r.fr.r + 0.5, `${r.genre?.r.toFixed(1)} vs ${r.fr?.r.toFixed(1)}`);
  }
  L.done(5);
});

/* ───────────────────────── D1 · the tab shows ───────────────────────── */
test("D1 · the tab shows, in ink, only with gaps", async ({ page }) => {
  const L = new Ledger("D1");
  for (const vp of SIZES) {
    await open(page, vp, "D1");
    const r = await read(page); const w = `@${vp.width}`;
    const f = tabFigures(r.tab?.counts ?? "");
    L.check(`gaps > 0, no dismissal: the tab is visible ${w}`, !!r.tab?.shown && !!f && f.gaps > 0, JSON.stringify(r.tab));
    L.check(`the tab is ink ${w}`, r.tab?.bg === "rgb(42, 58, 82)", `${r.tab?.bg}`);
    L.check(`its × is there ${w}`, r.x, `${r.x}`);
  }
  for (const vp of SIZES) {
    const p2 = await page.context().newPage();
    await open(p2, vp, "D1", { allFilled: true });
    const r = await read(p2);
    L.check(`0 gaps: the tab is not rendered @${vp.width}`, r.tab === null && !r.x && !!r.card, `tab ${JSON.stringify(r.tab)} · card ${!!r.card}`);
    await p2.close();
  }
  L.done(8);
});

/* ───────────────────────── D2 · dismiss ───────────────────────── */
test("D2 · × hides the tab for the account; it stays hidden as gaps are filled and returns for a new one; Undo", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("D2");
  const vp = SIZES[0];
  await open(page, vp, "D2");
  const drawerQ = '[data-hdr="housekeeping"].is-in';
  const openDrawer = async () => { await page.locator('.aglist [data-cl17="health"]').filter({ visible: true }).first().click(); await page.locator(drawerQ).waitFor({ timeout: 10_000 }); await page.waitForTimeout(400); };
  const closeDrawer = async () => { await page.keyboard.press("Escape"); await page.waitForTimeout(600); };
  const settle = async () => { await page.waitForTimeout(1500); };
  const reload = async () => { await page.reload(); await page.locator(".clv-group:not([data-loading]) .clv-row").first().waitFor({ timeout: 60_000 }); await page.waitForTimeout(1200); };

  /* RE-POINTED (Contact list v18 §F): the new drawer has no per-row "Later", so the count falls by answering a reply
     gap with "They don't say" through Focus (the existing settled path), and rises again when that mark is taken out
     (tests/e2e/hkFlags.mjs --unsettle). The stored value is read back from the account. */
  const node = (args: string) => JSON.parse(execSync(`node tests/e2e/hkFlags.mjs ${args}`, { encoding: "utf8" }).trim().split("\n").pop() ?? "{}");
  let r = await read(page);
  const f0 = tabFigures(r.tab?.counts ?? "");
  L.check("precondition: the tab is shown, with gaps", !!r.tab?.shown && !!f0 && f0.gaps > 1, JSON.stringify(r.tab));
  if (!f0) { L.done(1); return; }

  /* dismiss */
  await page.locator('[data-ftab-x="housekeeping"]').click();
  await page.waitForTimeout(500);
  r = await read(page);
  L.check("× hides the tab", r.tab === null && !r.x, JSON.stringify(r.tab));
  L.check("the note shows, with Undo", !!r.note && /^Hidden\. List health at the top of the page opens Housekeeping, and the tab comes back when something new is missing\.\s*Undo$/.test(r.note.trim()), `"${r.note}"`);
  await page.keyboard.press("h"); await page.waitForTimeout(600);
  L.check("H still opens the drawer while dismissed", (await read(page)).drawer, "drawer");
  await closeDrawer();
  await settle();
  await reload();
  r = await read(page);
  L.check("after a reload, still hidden", r.tab === null && node("").tabDismissedAtGaps === f0.gaps, `${JSON.stringify(r.tab)} · stored ${node("").tabDismissedAtGaps}`);

  /* the count falls: one reply gap answered "They don't say" */
  await openDrawer();
  if (await page.locator('[data-hk8="not-now"]').count()) { await page.locator('[data-hk8="not-now"]').click(); await page.waitForTimeout(500); await openDrawer(); }
  const row = page.locator(`${drawerQ} [data-hk8="detail"][data-gap="reply"] [data-hk8="ledger-row"]`).first();
  const key = (await row.getAttribute("data-key")) ?? "";
  await row.click(); await page.waitForTimeout(500);
  await page.locator(`${drawerQ} [data-hk8="not-stated"]`).click(); await page.locator(`${drawerQ} [data-hk8="save"]`).click();
  await page.waitForTimeout(1500);
  await closeDrawer(); await settle();
  await reload();
  r = await read(page);
  L.check("one gap fewer and reloaded: still hidden, the stored value lowered", r.tab === null && r.gapLine === `${f0.gaps - 1} gaps to fill` && node("").tabDismissedAtGaps === f0.gaps - 1, `tab ${JSON.stringify(r.tab)} · "${r.gapLine}" · stored ${node("").tabDismissedAtGaps}`);

  /* the count rises: the tab returns, and the stored value is null */
  node(`--unsettle ${key.split(":")[0]}`);
  await page.waitForTimeout(2500);
  r = await read(page);
  L.check("a new gap: the tab returns", !!r.tab?.shown && r.gapLine === `${f0.gaps} gaps to fill`, `tab ${JSON.stringify(r.tab)} · "${r.gapLine}"`);
  await settle();
  L.check("the stored value was cleared to null", node("").tabDismissedAtGaps === null, `${node("").tabDismissedAtGaps}`);
  L.check("restored: the reply mark is gone again", !node("").settled.includes(`${key.split(":")[0]}:reply`), key);

  /* Undo restores at once */
  await page.locator('[data-ftab-x="housekeeping"]').click(); await page.waitForTimeout(400);
  await page.locator('[data-hkv="tab-undo"]').click(); await page.waitForTimeout(300);
  r = await read(page);
  L.check("Undo brings the tab back at once", !!r.tab?.shown && r.note === null, `tab ${JSON.stringify(r.tab)} · note ${r.note}`);
  await settle(); await reload();
  r = await read(page);
  L.check("restored: no dismissal stored (the tab is there after a reload)", !!r.tab?.shown, JSON.stringify(r.tab));
  L.done(11);
});
