/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query panel v1 (design-refs/query-panel-v1/query-panel-v1.html, `#qdroot`) — the QP1 locks, on the rendered
 * page at 1512 × 900 and 1280 × 800 with the shell (P12 at 800 × 900).
 *
 * P1 container · P2 no scrim · P3 swap · P4 selected · P5 keyboard · P6 scroll kept · P7 one surface ·
 * P8 next move · P9 pinned foot · P10 no repeat · P11 URL · P12 narrow. (L1 is the QC137 and feed drawer v2
 * suites, run beside this one.)
 *
 * Each was run with its named mutation (`QP1_MUTATE=<lock>`: one named thing broken IN THE PAGE) before its
 * green was believed: reports/query-panel-v1/mutation-proofs.json.
 *
 * ⚠️ NOTHING HERE SAVES. Every step is opened and left by "← Back to query", Cancel or Escape, so the shared
 *    account is as it was.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

const DIR = "reports/query-panel-v1";
const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;
type VP = { width: number; height: number };
const MUT = process.env.QP1_MUTATE ?? "";
const near = (a: unknown, b: number, t: number) => typeof a === "number" && Number.isFinite(a) && Math.abs(a - b) <= t;
const ROW = '.qcw-list [data-qcv="row"]';
const PANEL = '[data-qp="panel"]';

const MUTATIONS: Record<string, { css?: string; js?: string }> = {
  P1: { css: `.spanel { right: 0 !important; }` },
  /* a 50% scrim under the panel */
  P2: { js: `(() => { if (document.getElementById("m-scrim")) return; const s = document.createElement("div"); s.id = "m-scrim"; s.style.cssText = "position:fixed;inset:0;background:rgba(28,19,15,.5);z-index:65"; document.body.appendChild(s); document.querySelector(".ws-app").style.opacity = "0.5"; })()` },
  /* a swap makes a NEW panel (what close-then-reopen does): when the open query changes, the element is replaced.
     ⚠️ Closing by the × and reopening by the click, in two events, did NOT redden this: the router batches the two
     navigations and React never unmounts the panel between them — so the real page cannot commit this fault that
     way, and the mutation replaces the element outright. */
  P3: { js: `(() => { if (window.__m3) return; window.__m3 = true; new MutationObserver((ms) => { for (const m of ms) { if (m.attributeName === "data-qp-id" && m.target.isConnected) { const c = m.target.cloneNode(true); c.style.width = "500px"; m.target.replaceWith(c); } } }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ["data-qp-id"] }); })()` },
  /* the keyboard ring left on a second row */
  P4: { js: `(() => { const rows = [...document.querySelectorAll('${ROW}')].filter((r) => r.getAttribute("aria-selected") !== "true"); if (rows[0]) rows[0].classList.add("kf"); })()` },
  /* Escape always closes: with a step open it closes the whole panel */
  P5: { js: `(() => { if (window.__m5) return; window.__m5 = true; window.addEventListener("keydown", (e) => { if (e.key === "Escape" && document.querySelector("[data-qp-step]")) { e.stopImmediatePropagation(); const x = document.querySelector('${PANEL} [data-qcv="open-close"]'); x && x.click(); } }, true); })()` },
  /* the opened row is brought to the top of the list */
  P6: { js: `(() => { if (window.__m6) return; window.__m6 = true; document.addEventListener("click", (e) => { const r = e.target.closest && e.target.closest('${ROW}'); if (r) r.scrollIntoView({ block: "start" }); }, true); })()` },
  /* the step is a drawer of its own again: fixed, over everything, a dialog */
  P7: { css: `.qad-root--panel .qad-drawer { position: fixed !important; top: 8px !important; right: 8px !important; bottom: 8px !important; width: 500px !important; z-index: 71 !important; }`, js: `(() => { if (window.__m7) return; window.__m7 = true; new MutationObserver(() => { document.querySelectorAll(".qad-root--panel .qad-drawer").forEach((d) => { if (d.getAttribute("role") !== "dialog") d.setAttribute("role", "dialog"); }); }).observe(document.body, { subtree: true, childList: true, attributes: true }); })()` },
  /* Record a response is the primary for a query that is with you */
  P8: { js: `(() => { if (window.__m8) return; window.__m8 = true; new MutationObserver(() => { const c = document.querySelector('${PANEL} .qcv-open[data-court="you"]'); if (!c) return; const p = c.querySelector('[data-qcv="open-action"]'); if (p && p.textContent !== "Record a response") p.textContent = "Record a response"; }).observe(document.body, { subtree: true, childList: true }); })()` },
  /* the body stops scrolling inside the panel, so it pushes the foot */
  P9: { css: `.qsp .qcv-open-tab { overflow: visible !important; flex: none !important; } .qsp .qcv-open-body { flex: none !important; } .spanel { overflow-y: auto !important; }` },
  /* the "Querying" block shown everywhere */
  P10: { js: `(() => { if (window.__m10) return; window.__m10 = true; new MutationObserver(() => { const b = document.querySelector('${PANEL} .qcv-open-body'); if (b && !b.querySelector(".qcv-open-ms")) { const d = document.createElement("div"); d.className = "qcv-open-ms"; d.innerHTML = "<em>Querying</em><b>The Smoke Test</b>"; b.insertBefore(d, b.children[1] || null); } }).observe(document.body, { subtree: true, childList: true }); })()` },
  /* the param dropped from the address */
  P11: { js: `(() => { if (window.__m11) return; window.__m11 = true; setInterval(() => { const u = new URL(location.href); if (u.searchParams.has("q")) { u.searchParams.delete("q"); history.replaceState(history.state, "", u); } }, 30); })()` },
  /* the 8px float kept on a narrow window */
  P12: { css: `.spanel { top: 8px !important; right: 8px !important; bottom: 8px !important; left: auto !important; width: 520px !important; border-radius: 12px !important; }` },
};

type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(lock: string, where: string, ok: unknown, detail: string) { this.rows.push({ lock, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${MUT ? `mut-${MUT}-` : ""}${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 40)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.lock} · ${r.where} — ${r.detail}`)).toEqual([]);
  }
}

async function mutate(page: Page, lock: string) {
  const m = MUT === lock ? MUTATIONS[lock] : null;
  if (!m) return;
  if (m.css) await page.addStyleTag({ content: m.css });
  if (m.js) await page.evaluate(m.js);
}
async function openQC(page: Page, vp: VP, lock: string, route = "/queries") {
  await page.addInitScript(() => { try { for (const k of ["contacts", "queries", "manuscripts"]) localStorage.setItem(`sa.guide.${k}`, "1"); } catch { /* */ } });
  await openRoute(page, route, vp);
  await expect(page.locator(ROW).first()).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(600);
  /* the list, at a known place: its rows under the pinned header */
  await page.evaluate(() => { const sc = [...document.querySelectorAll<HTMLElement>(".wpg-scroll")].find((e) => e.querySelector(".qcv-group.qc13") && e.getBoundingClientRect().height > 0)!; sc.style.scrollBehavior = "auto"; sc.scrollTop = 1100; });
  await page.waitForTimeout(350);
  await mutate(page, lock);
}
/** ids of the rows on screen, clear of the pinned controls and of where the panel will be */
const visibleRows = (page: Page, court?: string) => page.evaluate((c) => {
  const labs = document.querySelector<HTMLElement>(".qcw-list .lt-labels")!.getBoundingClientRect().bottom;
  return [...document.querySelectorAll<HTMLElement>('.qcw-list [data-qcv="row"]')].filter((r) => { const b = r.getBoundingClientRect(); return b.top > labs + 4 && b.bottom < window.innerHeight - 20 && (!c || r.dataset.court === c); }).map((r) => r.dataset.qid!);
}, court ?? null);
/** bring the first rows of one court into view under the pinned controls, and return the ids on screen */
const courtRows = async (page: Page, court: string): Promise<string[]> => {
  await page.evaluate((c) => {
    const row = [...document.querySelectorAll<HTMLElement>('.qcw-list [data-qcv="row"]')].filter((r) => r.dataset.court === c && r.getBoundingClientRect().height > 0)[1];
    row?.scrollIntoView({ block: "center" });
  }, court);
  await page.waitForTimeout(350);
  const ids = await visibleRows(page, court);
  expect(ids.length, `rows with court ${court} on screen`).toBeGreaterThan(0);
  return ids;
};
const clickRow = async (page: Page, id: string) => { await page.locator(`${ROW}[data-qid="${id}"] .qcw-agt`).click(); await page.waitForTimeout(450); };
const scrollTop = (page: Page) => page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".wpg-scroll")].find((e) => e.querySelector(".qcv-group.qc13") && e.getBoundingClientRect().height > 0)!.scrollTop);
const panel = (page: Page) => page.evaluate(() => {
  const p = document.querySelector<HTMLElement>('[data-qp="panel"]');
  if (!p) return null;
  const r = p.getBoundingClientRect(); const cs = getComputedStyle(p);
  return { l: r.left, t: r.top, r: window.innerWidth - r.right, b: window.innerHeight - r.bottom, w: r.width, h: r.height, radius: cs.borderTopLeftRadius, id: p.dataset.qpId ?? "", from: p.dataset.qpFrom ?? "",
    name: p.querySelector<HTMLElement>(".qcv-open-nm")?.textContent ?? "", step: p.querySelector<HTMLElement>("[data-qp-step]")?.dataset.qpStep ?? null, vw: window.innerWidth, vh: window.innerHeight };
});

test.describe("Query panel v1", () => {
  test("P1 P2 · container: 8px in, 560 or 520 wide, radius 12; and no scrim", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("P1-P2");
    for (const vp of SIZES) {
      await openQC(page, vp, MUT === "P2" ? "P2-defer" : "P1");
      const ids = await visibleRows(page);
      await clickRow(page, ids[0]);
      await mutate(page, "P1"); await mutate(page, "P2");
      await page.waitForTimeout(250);
      const p = await panel(page); const w = `${vp.width}`;
      L.check("P1", `${w} 8 from the right, top and bottom`, !!p && near(p.r, 8, 1) && near(p.t, 8, 1) && near(p.b, 8, 1), p ? `right ${p.r} · top ${p.t} · bottom ${p.b}` : "no panel");
      L.check("P1", `${w} width`, !!p && near(p.w, vp.width <= 1440 ? 520 : 560, 2), `${p?.w}`);
      L.check("P1", `${w} radius 12`, p?.radius === "12px", `${p?.radius}`);
      /* P2: a row clear of the panel is still the thing under the pointer, and nothing on the page is dimmed */
      const s = await page.evaluate((rowSel) => {
        const p = document.querySelector<HTMLElement>('[data-qp="panel"]')!.getBoundingClientRect();
        const row = [...document.querySelectorAll<HTMLElement>(rowSel)].find((r) => { const b = r.getBoundingClientRect(); return b.top > 330 && b.bottom < window.innerHeight - 20; })!;
        const b = row.getBoundingClientRect(); const x = Math.min(b.left + 120, p.left - 40), y = b.top + b.height / 2;
        const hit = document.elementFromPoint(x, y);
        const dim: string[] = [];
        for (const e of [document.body, ...document.querySelectorAll<HTMLElement>(".ws-app, .ws-main, .ws-window, .wpg, .wpg-scroll, .qcv-group, .qcv-page, .qcw-list")]) { const cs = getComputedStyle(e); if (parseFloat(cs.opacity) < 1 || (cs.filter && cs.filter !== "none")) dim.push(`${e.className.toString().split(" ")[0] || e.tagName} ${cs.opacity} ${cs.filter}`); }
        return { onScreen: b.top >= 0 && b.bottom <= window.innerHeight && x > 0, hitRow: !!hit && row.contains(hit), hit: hit ? (hit.className.toString().slice(0, 30) || hit.id || hit.tagName) : "nothing", dim, bodyOverflow: getComputedStyle(document.body).overflow };
      }, ROW);
      L.check("P2", `${w} precondition: the probed row is on screen`, s.onScreen, `${s.onScreen}`);
      L.check("P2", `${w} the row is under the pointer`, s.hitRow, `hit ${s.hit}`);
      L.check("P2", `${w} nothing dimmed or filtered`, s.dim.length === 0, s.dim.join(" · ") || "none");
      L.check("P2", `${w} the page is not scroll-locked`, s.bodyOverflow !== "hidden", s.bodyOverflow);
    }
    L.done(14);
  });

  test("P3 P4 P6 · swap in place, one selected row in its court's colour, and the list does not move", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("P3-P4-P6");
    const COURT: Record<string, string> = { you: "rgb(176, 96, 62)", agent: "rgb(61, 80, 112)", closed: "rgb(124, 113, 104)" };
    for (const vp of SIZES) {
      await openQC(page, vp, MUT === "P4" ? "none" : MUT);
      const ids = await visibleRows(page); const w = `${vp.width}`;
      const y0 = await scrollTop(page);
      await clickRow(page, ids[0]);
      await page.evaluate(() => { (document.querySelector('[data-qp="panel"]') as unknown as { __mark: boolean }).__mark = true; });
      const a = await panel(page); const y1 = await scrollTop(page);
      await clickRow(page, ids[1]);
      await mutate(page, "P4");
      const b = await panel(page); const y2 = await scrollTop(page);
      const same = await page.evaluate(() => !!(document.querySelector('[data-qp="panel"]') as unknown as { __mark?: boolean } | null)?.__mark);
      const sel = await page.evaluate((rowSel) => {
        const rows = [...document.querySelectorAll<HTMLElement>(rowSel)];
        const on = rows.filter((r) => r.getAttribute("aria-selected") === "true");
        const cs = on[0] ? getComputedStyle(on[0]) : null;
        return { n: on.length, id: on[0]?.dataset.qid ?? "", court: on[0]?.dataset.court ?? "", bg: cs?.backgroundColor ?? "", shadow: cs?.boxShadow ?? "", kf: rows.filter((r) => r.classList.contains("kf")).length };
      }, ROW);
      L.check("P3", `${w} the heading is the second row's agent`, !!a && !!b && b.id === ids[1] && a.id === ids[0] && b.name !== "", `${a?.name} → ${b?.name}`);
      L.check("P3", `${w} the panel's box did not change`, !!a && !!b && (["l", "t", "w", "h"] as const).every((k) => Math.abs(a[k] - b[k]) <= 1), `${a?.w}×${a?.h} → ${b?.w}×${b?.h}`);
      L.check("P3", `${w} the same panel, not a new one`, same, `same element ${same}`);
      L.check("P3", `${w} exactly one row selected`, sel.n === 1 && sel.id === ids[1], `${sel.n} selected (${sel.id})`);
      L.check("P4", `${w} the open row's ground`, sel.bg === "rgb(247, 243, 237)", sel.bg);
      L.check("P4", `${w} a 3px inset edge in its court's colour`, sel.shadow.includes(COURT[sel.court] ?? "?") && /3px 0px 0px 0px inset|inset 3px 0px 0px/.test(sel.shadow), `${sel.court}: ${sel.shadow}`);
      L.check("P4", `${w} no keyboard ring while the panel is open`, sel.kf === 0, `${sel.kf} .kf rows`);
      await page.locator(`${PANEL} [data-qcv="open-close"]`).click();
      await page.waitForTimeout(400);
      const y3 = await scrollTop(page);
      L.check("P6", `${w} scrollTop kept`, y0 > 200 && Math.abs(y1 - y0) <= 1 && Math.abs(y2 - y0) <= 1 && Math.abs(y3 - y0) <= 1, `${y0} · open ${y1} · swap ${y2} · closed ${y3}`);
      L.check("P6", `${w} closed`, (await panel(page)) === null, "the panel is gone");
    }
    L.done(18);
  });

  test("P5 · keyboard: Down opens the next row, Escape closes; with a step open Escape steps back and Down does nothing", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("P5");
    for (const vp of SIZES) {
      await openQC(page, vp, "P5");
      const all = await page.evaluate((s) => [...document.querySelectorAll<HTMLElement>(s)].filter((r) => r.getBoundingClientRect().height > 0).map((r) => r.dataset.qid!), ROW);
      const ids = await courtRows(page, "agent"); const w = `${vp.width}`;
      await clickRow(page, ids[0]);
      const at = all.indexOf(ids[0]);
      await page.keyboard.press("ArrowDown"); await page.waitForTimeout(450);
      const down = await panel(page);
      L.check("P5", `${w} Down opens the next visible row`, down?.id === all[at + 1], `${ids[0]} → ${down?.id} (next is ${all[at + 1]})`);
      await page.keyboard.press("ArrowUp"); await page.waitForTimeout(450);
      L.check("P5", `${w} Up opens the previous`, (await panel(page))?.id === ids[0], `${(await panel(page))?.id}`);
      /* a step */
      await page.locator(`${PANEL} [data-door="resp"], ${PANEL} [data-qcv="open-action"]`).first().click();
      await expect(page.locator(`${PANEL} [data-qp-step]`)).toBeVisible({ timeout: 8000 });
      await page.waitForTimeout(500);
      await page.locator(`${PANEL} [data-qp="step-title"]`).click();
      await page.keyboard.press("ArrowDown"); await page.waitForTimeout(350);
      const still = await panel(page);
      L.check("P5", `${w} with a step open, Down does nothing`, still?.id === ids[0] && still.step !== null, `${still?.id} · step ${still?.step}`);
      await page.keyboard.press("Escape"); await page.waitForTimeout(700);
      const back = await panel(page);
      L.check("P5", `${w} Escape steps back to the query`, !!back && back.step === null && back.id === ids[0], back ? `step ${back.step} · ${back.id}` : "the panel closed");
      await page.keyboard.press("Escape"); await page.waitForTimeout(500);
      L.check("P5", `${w} Escape then closes`, (await panel(page)) === null, "closed");
    }
    L.done(10);
  });

  test("P7 P8 · one surface, and the next move is the primary", async ({ page }) => {
    test.setTimeout(600_000);
    const L = new Ledger("P7-P8");
    const want: Record<string, { primary: RegExp; title: (f: string) => string }> = {
      agent: { primary: /^Record a response$/, title: (f) => `What did ${f} say?` },
      silent: { primary: /^Close query$/, title: (f) => `Close ${f}'s query?` },
      you: { primary: /^Mark (partial|full|revision) sent$/, title: (f) => `What went to ${f}?` },
      offer: { primary: /^Record your answer$/, title: (f) => `Your answer to ${f}` },
      /* ⚠️ the brief's table says "Reopen query"; the app has no reopen journey — a late reply is what reopens */
      closed: { primary: /^Record a late reply$/, title: (f) => `What did ${f} say?` },
    };
    const seen: Record<string, number> = {};
    for (const vp of SIZES) {
      await openQC(page, vp, MUT);
      const w = `${vp.width}`;
      const barZ = await page.evaluate(() => { const z = (s: string) => { const e = document.querySelector<HTMLElement>(s); const n = e ? parseInt(getComputedStyle(e).zIndex, 10) : NaN; return Number.isFinite(n) ? n : 0; }; return Math.max(z(".ws-pagebar"), z(".ws-top"), z(".ws-bar"), 1); });
      /* one query for each row of the table, found on the page */
      const pick = await page.evaluate((rowSel) => {
        const rows = [...document.querySelectorAll<HTMLElement>(rowSel)].filter((r) => r.getBoundingClientRect().height > 0);
        const day = (r: HTMLElement) => { const m = /DAY\s+(\d+)/i.exec(r.textContent ?? ""); return m ? Number(m[1]) : null; };
        const f = (p: (r: HTMLElement) => boolean) => rows.find(p)?.dataset.qid ?? null;
        return {
          agent: f((r) => r.dataset.court === "agent" && (day(r) ?? 999) <= 365),
          silent: f((r) => r.dataset.court === "agent" && (day(r) ?? 0) > 365),
          you: f((r) => r.dataset.court === "you" && /Partial Requested|Full Requested/.test(r.dataset.status ?? "")),
          offer: f((r) => r.dataset.status === "Offer"),
          closed: f((r) => r.dataset.court === "closed" && /Rejected|No Response/.test(r.dataset.status ?? "")),
        };
      }, ROW);
      for (const [kind, id] of Object.entries(pick)) {
        if (!id) { console.log(`  P8 ${w}: no ${kind} query on the account`); continue; }
        seen[kind] = (seen[kind] ?? 0) + 1;
        await page.locator(`${ROW}[data-qid="${id}"]`).evaluate((e) => e.scrollIntoView({ block: "center" }));
        await page.waitForTimeout(250);
        await clickRow(page, id);
        const card = await page.evaluate(() => { const p = document.querySelector<HTMLElement>('[data-qp="panel"]')!; return { name: p.querySelector(".qcv-open-nm")?.textContent ?? "", primary: p.querySelector<HTMLElement>('[data-qcv="open-action"]')?.textContent ?? "", doors: [...p.querySelectorAll<HTMLElement>("[data-door]")].map((d) => d.dataset.door!) }; });
        const first = card.name.trim().split(/\s+/)[0];
        L.check("P8", `${w} ${kind}: the primary`, want[kind].primary.test(card.primary), `"${card.primary}" (${card.name})`);
        /* P7: every footer button in turn */
        for (let i = 0; i < card.doors.length; i++) {
          await page.locator(`${PANEL} [data-door]`).nth(i).click();
          await expect(page.locator(`${PANEL} [data-qp-step]`), `${kind} door ${card.doors[i]}`).toBeVisible({ timeout: 8000 });
          await page.waitForTimeout(450);
          const s = await page.evaluate((bar) => {
            const p = document.querySelector<HTMLElement>('[data-qp="panel"]')!;
            const vis = (e: Element) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none"; };
            const dialogs = [...document.querySelectorAll('[role="dialog"], dialog[open]')].filter(vis);
            const over: string[] = [];
            for (const e of document.querySelectorAll<HTMLElement>("body *")) {
              if (p.contains(e) || !vis(e)) continue;
              const cs = getComputedStyle(e); if (cs.position === "static") continue;
              const z = parseInt(cs.zIndex, 10); if (!Number.isFinite(z) || z <= bar) continue;
              const r = e.getBoundingClientRect(); if (r.width * r.height < 400) continue;
              /* ⚠️ PAINTED, NOT MERELY PRESENT: every workspace page stays mounted, so other pages' overlays (a
                 tooltip host at opacity 0, a slide-over parked off-screen) have boxes. What counts is an element
                 the reader can see: on screen, not transparent, and the thing under its own centre. */
              if (r.right <= 0 || r.bottom <= 0 || r.left >= window.innerWidth || r.top >= window.innerHeight) continue;
              let op = 1; for (let n: HTMLElement | null = e; n; n = n.parentElement) op *= parseFloat(getComputedStyle(n).opacity);
              if (op < 0.05 || cs.pointerEvents === "none") continue;
              const hit = document.elementFromPoint(Math.min(Math.max(r.left + r.width / 2, 1), window.innerWidth - 1), Math.min(Math.max(r.top + r.height / 2, 1), window.innerHeight - 1));
              if (!hit || !(e === hit || e.contains(hit))) continue;
              /* the shell's own chrome and the page's own sticky rows are the page, not an overlay */
              if (e.closest(".ws-side, .ws-pagebar, .ws-top, .ws-main, .beta-strip, [data-beta-strip]")) continue;
              over.push(`${(e.className.toString().split(" ")[0] || e.tagName).slice(0, 24)} z${z}`);
            }
            return { dialogs: dialogs.length, over, title: p.querySelector<HTMLElement>('[data-qp="step-title"]')?.textContent ?? "", back: !!p.querySelector('[data-qp="step-back"]'), ownHidden: (p.querySelector<HTMLElement>("[data-side-own]")?.getBoundingClientRect().height ?? 1) === 0 };
          }, barZ);
          L.check("P7", `${w} ${kind} ${card.doors[i]}: one dialog`, s.dialogs === 1, `${s.dialogs} dialogs`);
          L.check("P7", `${w} ${kind} ${card.doors[i]}: nothing stacked outside the panel`, s.over.length === 0, s.over.slice(0, 3).join(" · ") || "none");
          L.check("P7", `${w} ${kind} ${card.doors[i]}: the step replaced the card, with a way back`, s.back && s.ownHidden, `back ${s.back} · card hidden ${s.ownHidden}`);
          if (i === 0) L.check("P8", `${w} ${kind}: the step's title`, s.title === want[kind].title(first), `"${s.title}"`);
          await page.locator(`${PANEL} [data-qp="step-back"]`).click();
          await expect(page.locator(`${PANEL} [data-qp-step]`)).toHaveCount(0, { timeout: 8000 });
          await page.waitForTimeout(350);
        }
        await page.locator(`${PANEL} [data-qcv="open-close"]`).click();
        await page.waitForTimeout(350);
      }
    }
    console.log(`  P8 branches entered: ${JSON.stringify(seen)}`);
    L.check("P8", "population: the table's rows found on the account", (seen.agent ?? 0) > 0 && (seen.you ?? 0) > 0 && (seen.closed ?? 0) > 0, JSON.stringify(seen));
    L.done(30);
  });

  test("P9 · pinned foot: the body scrolls under it", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("P9");
    for (const vp of SIZES) {
      await openQC(page, vp, "none");
      const ids = await visibleRows(page); const w = `${vp.width}`;
      await clickRow(page, ids[0]);
      /* a body long enough to scroll: the harness's own filler, inside the tab */
      await page.evaluate(() => { const t = document.querySelector<HTMLElement>('[data-qp="panel"] .qcv-open-tab')!; const d = document.createElement("div"); d.style.cssText = "height:1400px"; d.setAttribute("data-filler", ""); t.appendChild(d); });
      await mutate(page, "P9");
      const read = () => page.evaluate(() => {
        const p = document.querySelector<HTMLElement>('[data-qp="panel"]')!; const t = p.querySelector<HTMLElement>(".qcv-open-tab")!;
        const foot = p.querySelector<HTMLElement>('[data-qcv="open-foot"]')!.getBoundingClientRect(); const doors = p.querySelector<HTMLElement>('[data-qcv="open-doors"]')?.getBoundingClientRect();
        const last = (t.lastElementChild as HTMLElement).getBoundingClientRect(); const pb = p.getBoundingClientRect();
        return { footTop: foot.top, footH: foot.height, doorsBottom: doors ? doors.bottom : foot.bottom, lastBottom: last.bottom, tabBottom: t.getBoundingClientRect().bottom, can: t.scrollHeight - t.clientHeight, panelBottom: pb.bottom, y: t.scrollTop };
      });
      const a = await read();
      await page.evaluate(() => { const t = document.querySelector<HTMLElement>('[data-qp="panel"] .qcv-open-tab')!; t.scrollTop = t.scrollHeight; const p = document.querySelector<HTMLElement>('[data-qp="panel"]')!; p.scrollTop = p.scrollHeight; });
      await page.waitForTimeout(250);
      const z = await read();
      L.check("P9", `${w} precondition: the body scrolls`, a.can > 200 && z.y > 200, `${a.can}px to scroll, at ${z.y}`);
      L.check("P9", `${w} the foot did not move`, near(z.footTop, a.footTop, 1) && near(z.footH, a.footH, 1), `top ${a.footTop} → ${z.footTop}`);
      L.check("P9", `${w} the foot is inside the panel`, z.doorsBottom <= z.panelBottom + 1, `foot ends ${z.doorsBottom}, panel ${z.panelBottom}`);
      L.check("P9", `${w} the body ends above the foot`, z.tabBottom <= z.footTop + 1, `body ${z.tabBottom} · foot ${z.footTop}`);
    }
    L.done(8);
  });

  test("P10 · no repeat: no manuscript block from the Query Centre; one caption from the Dashboard", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("P10");
    for (const vp of SIZES) {
      await openQC(page, vp, MUT);
      const ids = await courtRows(page, "agent"); const w = `${vp.width}`;
      await clickRow(page, ids[0]);
      const q = await page.evaluate(() => { const p = document.querySelector<HTMLElement>('[data-qp="panel"]')!; return { from: p.dataset.qpFrom, block: p.querySelectorAll(".qcv-open-ms").length, querying: /Querying/.test(p.querySelector(".qcv-open-body")?.textContent ?? ""), caption: p.querySelectorAll('[data-qcv="open-for"]').length, stamp: p.querySelectorAll(".qcv-open-who .qsc, .qcv-open-who [data-qsc]").length }; });
      L.check("P10", `${w} /queries: no "Querying" block`, q.from === "queries" && q.block === 0 && !q.querying, `${q.block} blocks · text ${q.querying}`);
      L.check("P10", `${w} /queries: no caption`, q.caption === 0, `${q.caption}`);
      await openRoute(page, "/dashboard", vp);
      await page.waitForTimeout(2200);
      await mutate(page, "P10");
      await page.evaluate((id) => (window as unknown as { __saQueryPanel: { open: (id: string) => void } }).__saQueryPanel.open(id), ids[0]);
      await expect(page.locator(PANEL)).toBeVisible({ timeout: 8000 });
      await page.waitForTimeout(500);
      const d = await page.evaluate(() => { const p = document.querySelector<HTMLElement>('[data-qp="panel"]')!; const c = p.querySelector<HTMLElement>('[data-qcv="open-for"]'); const i = c?.querySelector("i"); return { from: p.dataset.qpFrom, block: p.querySelectorAll(".qcv-open-ms").length, caption: c?.textContent ?? "", size: c ? getComputedStyle(c).fontSize : "", style: c ? getComputedStyle(c).fontStyle : "", face: i ? getComputedStyle(i).fontFamily : "", path: location.pathname }; });
      L.check("P10", `${w} /dashboard: the panel opened in place`, d.from === "dashboard" && d.path === "/dashboard", `${d.from} on ${d.path}`);
      L.check("P10", `${w} /dashboard: the caption`, /^for .+/.test(d.caption) && d.size === "13.5px" && d.style === "italic" && /Special Elite/.test(d.face), `"${d.caption}" ${d.size} ${d.style}`);
      L.check("P10", `${w} /dashboard: no block`, d.block === 0, `${d.block}`);
    }
    L.done(10);
  });

  test("P11 · URL: opening sets ?q=, Back closes, and loading with ?q= opens", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("P11");
    for (const vp of SIZES) {
      await openQC(page, vp, MUT);
      const ids = await visibleRows(page); const w = `${vp.width}`;
      await clickRow(page, ids[0]);
      await page.waitForTimeout(200);
      const q = await page.evaluate(() => new URL(location.href).searchParams.get("q"));
      L.check("P11", `${w} opening sets ?q=`, q === ids[0], `q=${q}`);
      await page.goBack(); await page.waitForTimeout(600);
      L.check("P11", `${w} browser Back closes`, (await panel(page)) === null && (await page.evaluate(() => new URL(location.href).searchParams.get("q"))) === null, "closed, no param");
      await page.goto(`/queries?q=${encodeURIComponent(ids[0])}`);
      await expect(page.locator(PANEL)).toBeVisible({ timeout: 30_000 });
      await page.waitForTimeout(500);
      L.check("P11", `${w} loading with ?q= opens it`, (await panel(page))?.id === ids[0], `${(await panel(page))?.id}`);
    }
    L.done(6);
  });

  test("P12 · narrow: at 800 × 900 the panel is the whole screen", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("P12");
    await page.addInitScript(() => { try { for (const k of ["contacts", "queries", "manuscripts"]) localStorage.setItem(`sa.guide.${k}`, "1"); } catch { /* */ } });
    await openRoute(page, "/queries", { width: 800, height: 900 });
    await expect(page.locator(ROW).first()).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(600);
    const id = await page.locator(ROW).first().getAttribute("data-qid");
    await page.locator(`${ROW}[data-qid="${id}"] .qcw-agt`).click();
    await expect(page.locator(PANEL)).toBeVisible({ timeout: 8000 });
    await mutate(page, "P12");
    await page.waitForTimeout(400);
    const p = await panel(page);
    const back = await page.evaluate(() => { const x = document.querySelector<HTMLElement>('[data-qp="panel"] [data-qcv="open-close"]'); return x ? { label: getComputedStyle(x, "::before").content, w: x.getBoundingClientRect().width } : null; });
    L.check("P12", "the panel's box is the viewport", !!p && near(p.l, 0, 1) && near(p.t, 0, 1) && near(p.w, 800, 1) && near(p.h, 900, 1), p ? `${p.w}×${p.h} at ${p.l},${p.t}` : "no panel");
    L.check("P12", "no radius", p?.radius === "0px", `${p?.radius}`);
    L.check("P12", "the close reads Back", !!back && /Back/.test(back.label), `${back?.label}`);
    L.done(3);
  });
});
