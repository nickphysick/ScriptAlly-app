/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD FIRST VISIT v1 — the rendered locks (ref design-refs/dashboard-first-visit-v1/).
 *
 *   DFV-A  the pre-query page at 1280×800, 1512×900 and 1920×1080: the set-up card, the tip bubble, Getting started
 *          as the task card, the founding card at the size it has after the first query, no header buttons, the
 *          eyebrow, and no scroll; the answer persists across a reload; the tip moves on per visit; a first visit's
 *          loading page is the first-visit skeleton.
 *   DFV-C  the pager's "{i} of {n}" shows at every size, and the last page has no "Then:".
 *   DFV-D  after the first query: no zero rows and no "0 ready to query" on the page.
 *
 * The pre-query manuscript is `seedDash60.mjs`'s (`db60-pre`), held only for the run. The one write this suite makes
 * is the set-up answer, and it is put back to what it was before the run ends.
 *
 * (DFV-B — the stamp — is locked in src/lib/firstWin.test.ts: striking it on a rendered page needs a writer's FIRST
 * query or agent, which the shared harness account can never have again.)
 */
import { test, expect, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

type VP = { width: number; height: number };
const SIZES: VP[] = [{ width: 1280, height: 800 }, { width: 1512, height: 900 }, { width: 1920, height: 1080 }];
const tag = (v: VP) => `${v.width}x${v.height}`;
const PRE = "db60-pre";
const Q = "seed-ms-1";
const DIR = "reports/dashboard-first-visit-v1";
const STRAIGHT = `.d58 .d105-fw.d116-tilt { rotate: none !important; transition: none !important; }`;

type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(lock: string, where: string, ok: boolean, detail: string) { this.rows.push({ lock, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.lock} · ${r.where} — ${r.detail}`)).toEqual([]);
  }
}

async function openDash(page: Page, vp: VP, ms: string, flags: Record<string, unknown> = {}, clearShape = false) {
  await page.addInitScript(([f, m, c]) => {
    Object.assign(window, f);
    try {
      localStorage.setItem("scriptally_active_manuscript_id", m as string);
      if (c) localStorage.removeItem("sa.dash58Shape");
    } catch { /* private mode */ }
  }, [flags, ms, clearShape] as const);
  await openRoute(page, "/dashboard", vp);
  if (!flags.__SA_DASH_HOLD_MS) await page.locator('[data-d58="page"][data-loading="0"]').first().waitFor({ timeout: 25_000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: STRAIGHT });
  await page.mouse.move(2, 2);
  await page.waitForTimeout(600);
}

/** The page as a reader meets it. Every probe takes the VISIBLE copy (every workspace page stays mounted). */
const read = (page: Page) => page.evaluate(() => {
  const vis = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().height > 0) ?? null;
  const box = (s: string) => { const e = vis(s); if (!e) return null; const r = e.getBoundingClientRect(); return { t: r.top, b: r.bottom, l: r.left, r: r.right, h: r.height, w: r.width }; };
  const root = vis(".d58");
  const port = root?.closest(".ws-wbody") as HTMLElement | null;
  const task = vis('[data-d71="task"]');
  return {
    mode: root?.dataset.mode ?? null,
    loading: vis('[data-d58="page"]')?.dataset.loading ?? null,
    eyebrow: vis('[data-d58="eyebrow"]')?.textContent?.trim() ?? null,
    /* the buttons row inside the VISIBLE page — read whatever its height, since an empty row has none */
    buttons: (() => { const b = root?.querySelector<HTMLElement>('[data-d58="buttons"]'); return b ? [...b.querySelectorAll("button")].map((x) => x.getAttribute("aria-label")) : null; })(),
    /* RE-POINTED (Dashboard feed v1): once a query exists the buttons and the campaign word are the manuscript card's */
    bookButtons: (() => { const b = root?.querySelector<HTMLElement>(".df1-bkacts"); return b ? [...b.querySelectorAll("button")].map((x) => x.getAttribute("aria-label")) : null; })(),
    status: vis('[data-df1="status"]')?.textContent?.trim() ?? null,
    fwClipped: (() => { const f = vis('[data-d71="fw"]'); return f ? [...f.querySelectorAll<HTMLElement>("*")].filter((e) => e.clientHeight > 1 && e.clientWidth > 1 && e.scrollHeight > e.clientHeight + 1 && getComputedStyle(e).overflowY !== "visible").map((e) => e.className.toString().slice(0, 30)) : null; })(),
    setup: box('[data-fv1="setup"]'), path: vis('[data-fv1="setup"]')?.dataset.path ?? null,
    tip: box('[data-fv1="tip"]'), tipIndex: vis('[data-fv1="tip-text"]')?.dataset.tip ?? null,
    taskGroup: task?.dataset.group ?? null, taskBox: box('[data-d71="task"]'),
    gs: box('[data-fv1="gs"]'), gsOver: (() => { const b = vis(".fv1-gstb"); return b ? b.scrollHeight - b.clientHeight : null; })(),
    fw: box('[data-d71="fw"]'),
    /* which of the founding card's parts are on show — "in full" is these, not a height (its slot follows the left column) */
    fwParts: (() => { const f = vis('[data-d71="fw"]'); if (!f) return [] as string[]; return [...new Set([...f.querySelectorAll<HTMLElement>("[class*='d105-']")].filter((e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none"; }).flatMap((e) => [...e.classList].filter((c) => c.startsWith("d105-"))))].sort(); })(),
    tab: box('[data-d58="tab"]'),
    pos: task?.querySelector('[data-d71="pos-text"]') ? { text: task.querySelector('[data-d71="pos-text"]')!.textContent, shown: getComputedStyle(task.querySelector('[data-d71="pos-text"]')!).display !== "none" } : null,
    then: task?.querySelector('[data-d71="then"]')?.textContent ?? null,
    index: Number(task?.dataset.index ?? -1), counts: task?.dataset.counts ?? null,
    retired: ["d60-door", "d60-way", "wds-btn", "d59-rule"].filter((c) => !!vis(`.${c}`)),
    zeroRows: [...document.querySelectorAll<HTMLElement>('[data-d60="closed-legend"] li, [data-d60="agents-legend"] li')].filter((li) => li.getBoundingClientRect().height > 0 && /^\s*0\D/.test(li.textContent ?? "")).map((li) => li.textContent?.trim()),
    zeroReady: !!vis('[data-d60="ready"]') && /^0 ready/.test(vis('[data-d60="ready"]')!.textContent ?? ""),
    scroll: port ? { sh: port.scrollHeight, ch: port.clientHeight } : null,
  };
});

test.describe("first visit", () => {
  const seed = (mode: "" | "--clean") => execSync(`node tests/e2e/seedDash60.mjs ${mode}`, { stdio: "pipe" }).toString().trim();
  test.beforeAll(() => { seed(""); });
  test.afterAll(() => { seed("--clean"); });

  test("DFV-A — the pre-query page at three sizes, and the founding card as it is after the first query", async ({ page }) => {
    test.setTimeout(600_000);
    const L = new Ledger("A-pre");
    for (const vp of SIZES) {
      for (const flags of [{ __SA_DASH_NO_AGENTS: true }, {}]) {
        const w = `${tag(vp)} ${flags.__SA_DASH_NO_AGENTS ? "S1" : "S2"}`;
        await openDash(page, vp, PRE, flags);
        const r = await read(page);
        await openDash(page, vp, Q, flags);
        const q = await read(page);
        L.check("A1", `${w} the first-visit page`, r.mode === "pre" && !!r.setup && !!r.tip && r.taskGroup === "start", JSON.stringify({ mode: r.mode, setup: !!r.setup, tip: !!r.tip, group: r.taskGroup }));
        L.check("A1", `${w} Getting started's checklist fits its card`, r.gsOver !== null && r.gsOver <= 1, `overflow ${r.gsOver}`);
        /* ⚠️ RE-POINTED (Dashboard feed v1, L1). These two compared the pre-query founding card with the querying page's
           and with the feed tab. The querying page's card is now a full-size card in a scrolling column (290px), so it is
           no longer the yardstick for a one-screen page's slot, and the tab is retired. The law they held — the
           pre-query card is never cut — is asserted directly: nothing in it clips, and no tab is drawn. */
        L.check("A2", `${w} the founding card is drawn and nothing in it is cut`, !!r.fw && r.fwParts.length > 3 && Array.isArray(r.fwClipped) && r.fwClipped.length === 0, `parts ${r.fwParts.length} · clipped ${r.fwClipped?.join(",") || "none"} · pre ${r.fw?.h.toFixed(1)}px`);
        L.check("A2", `${w} no feed tab (retired)`, !r.tab && !q.tab, JSON.stringify({ pre: r.tab, q: q.tab }));
        L.check("A3", `${w} no header buttons; the eyebrow says GETTING READY`, Array.isArray(r.buttons) && r.buttons.length === 0 && r.eyebrow === "— GETTING READY —", JSON.stringify({ b: r.buttons, e: r.eyebrow }));
        /* RE-POINTED (Dashboard feed v1): the querying page has no header; its manuscript card carries the buttons and the word */
        L.check("A3", `${w} once a query exists, Record a response and Querying`, !!q.bookButtons?.includes("Record a response") && q.status === "Querying", JSON.stringify({ b: q.bookButtons, s: q.status }));
        L.check("A4", `${w} no scroll`, !!r.scroll && r.scroll.sh <= r.scroll.ch + 1, JSON.stringify(r.scroll));
        L.check("A5", `${w} the retired pieces are gone`, r.retired.length === 0, r.retired.join(","));
      }
    }
    L.done(48);
  });

  test("DFV-A — the answer persists across a reload, and the tip moves on per visit", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("A-answer");
    const vp = { width: 1512, height: 900 };
    await openDash(page, vp, PRE, { __SA_DASH_NO_AGENTS: true });
    const before = await read(page);
    const other = before.path === "yes" ? "notyet" : "yes";
    await page.locator(`[data-fv1="choice-${other}"]:visible`).click();
    await page.waitForTimeout(2500);
    await page.reload();
    await page.locator('[data-d58="page"][data-loading="0"]').first().waitFor({ timeout: 25_000 }).catch(() => {});
    await page.waitForTimeout(800);
    const after = await read(page);
    L.check("A6", "the answer survives a reload", after.path === other, `${before.path} → ${other} → read back ${after.path}`);
    L.check("A7", "the tip moved on by one visit", before.tipIndex !== null && after.tipIndex !== null && Number(after.tipIndex) === (Number(before.tipIndex) + 1) % 4, `${before.tipIndex} → ${after.tipIndex}`);
    /* put the answer back */
    await page.locator(`[data-fv1="choice-${before.path}"]:visible`).click();
    await page.waitForTimeout(2500);
    L.done(2);
  });

  test("DFV-A — a first visit's loading page is the first-visit skeleton", async ({ page }) => {
    test.setTimeout(120_000);
    const L = new Ledger("A-skeleton");
    await openDash(page, { width: 1512, height: 900 }, PRE, { __SA_DASH_HOLD_MS: 8000 }, true);
    const r = await read(page);
    L.check("A8", "loading, and the pre-query shape", r.loading === "1" && r.mode === "pre" && !!r.setup && Array.isArray(r.buttons) && r.buttons.length === 0, JSON.stringify({ loading: r.loading, mode: r.mode, setup: !!r.setup, b: r.buttons }));
    L.done(1);
  });
});

test("DFV-C · DFV-D — the pager at every size, no wrap-round, and no zeros on the page", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("CD-after");
  for (const vp of SIZES) {
    await openDash(page, vp, Q);
    const r = await read(page);
    L.check("C1", `${tag(vp)} the pager states its count`, !!r.pos && r.pos.shown && /^\d+ of \d+$/.test(r.pos.text ?? ""), JSON.stringify(r.pos));
    const n = Number(/of (\d+)/.exec(r.pos?.text ?? "")?.[1] ?? 0);
    for (let i = r.index; i < n - 1; i++) { await page.locator('[data-d71="next"]:visible').click(); await page.waitForTimeout(200); }
    const last = await read(page);
    L.check("C2", `${tag(vp)} the last page has no Then`, last.index === n - 1 && last.then === null, `index ${last.index} of ${n} · then ${last.then}`);
    L.check("D1", `${tag(vp)} no zero rows and no "0 ready to query"`, r.zeroRows.length === 0 && !r.zeroReady, JSON.stringify({ rows: r.zeroRows, ready: r.zeroReady }));
  }
  L.done(9);
});
