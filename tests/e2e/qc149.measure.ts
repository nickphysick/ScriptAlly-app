/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v149 — QC149-L1…L12 (design-refs/query-centre-v149/), at 1280 × 800 and 1512 × 900. L0 (Versions
 * unchanged by the extraction) is qc149L0.measure.ts; L13 (the earlier suites) is a run of those suites.
 *
 * ⚠️ L9, L10 and L11 WRITE TO THE SHARED HARNESS ACCOUNT and put it back in the same run through the undo bar (or, for
 *    L10's reload, by saving the original values again). A run that cannot undo fails loudly rather than finishing.
 */
import { test, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { openQc } from "./nb1Lib";
import { openApp } from "./pageHeaderV2Lib";
import { BASE, CARD, Ledger, MUT, SIZES, box, chipCounts, closePanel, css, mutateCss, openPanel, rows, tap, text, undo } from "./qc149Lib";

test.describe.configure({ mode: "serial" });
test.setTimeout(300_000);
const ONLY = process.env.QC149_ONLY ?? "";
const run = (id: string) => !ONLY || ONLY.split(",").includes(id);
const near = (a: number | undefined, b: number | undefined, tol = 1) => a != null && b != null && Math.abs(a - b) <= tol;
const WHERE: Record<string, string> = { you: "With you", agent: "With the agent", quiet: "Gone quiet", closed: "Closed" };

/** the Versions page's header card, read once per size: L1 holds the Query Centre's to it */
async function versionsCard(page: Page, vp: { width: number; height: number }) {
  await openApp(page, "/manuscripts/versions", vp);
  await page.locator("[data-vv2='title']").first().waitFor({ timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(800);
  const win = await box(page, ".ws-window");
  const card = await box(page, "[data-vv2='title']");
  const c = await css(page, "[data-vv2='title']", ["border-top-left-radius", "background-color", "box-shadow"]);
  const h = await css(page, "#hbT", ["font-family", "font-size"]);
  return { top: card && win ? card.t - win.t : null, c, h };
}

/* QC149_SIZE=1280|1512 runs one size — a serial file stops at its first red, so a red-first run takes each size alone */
for (const vp of SIZES.filter((v) => !process.env.QC149_SIZE || String(v.width) === process.env.QC149_SIZE)) {
  const narrow = vp.width <= 1440;
  const inset = narrow ? 24 : 32;
  test.describe(`QC149 @ ${vp.width}`, () => {
    test("L1 · the header card is the Versions card, 22 below the content top as Versions sits; the hero and breakdown are gone", async ({ page }) => {
      test.skip(!run("L1"));
      const L = new Ledger(`L1-${vp.width}`);
      const ver = await versionsCard(page, vp);
      await openQc(page, vp);
      await mutateCss(page, "L1", ".qc149-card.phc.phc { border-radius: 4px !important; }");
      const win = await box(page, ".ws-window");
      const card = await box(page, "[data-qc149='card']");
      L.check("population: the Versions card was read", ver.c && ver.h && ver.top != null, JSON.stringify(ver));
      L.check("the header card", !!card, String(!!card));
      L.check("title", (await text(page, "[data-qc149='card'] h1")) === "Query Centre", String(await text(page, "[data-qc149='card'] h1")));
      const body = (await text(page, "[data-qc149='card'] p")) ?? "";
      const ms = await css(page, "[data-qc149='ms']", ["font-weight"]);
      L.check("body names the page's book in bold, or says every query you've sent", ms ? Number(ms["font-weight"]) >= 600 && /^Every query for /.test(body) : /^Every query you’ve sent, wherever it stands\./.test(body), `${body.slice(0, 70)} · ms ${JSON.stringify(ms)}`);
      L.check("+ Log a query", (await text(page, "[data-qc149='log']")) === "+ Log a query", String(await text(page, "[data-qc149='log']")));
      L.check("Record a response", (await text(page, "[data-qc149='record']")) === "Record a response", String(await text(page, "[data-qc149='record']")));
      const art = await page.evaluate(() => { const i = [...document.querySelectorAll<HTMLImageElement>("[data-qc149='card'] img")].find((x) => x.getBoundingClientRect().height > 0); return i ? { w: i.naturalWidth, bw: i.getBoundingClientRect().width, bh: i.getBoundingClientRect().height } : null; });
      L.check("the art, drawn, 180 × 160", !!art && art.w > 0 && near(art.bw, 180) && near(art.bh, 160), JSON.stringify(art));
      L.check("its top equals the Versions card's below the content top", !!card && !!win && near(card.t - win.t, ver.top ?? undefined), `qc ${card && win ? (card.t - win.t).toFixed(1) : "-"} · versions ${ver.top?.toFixed(1)}`);
      const c = await css(page, "[data-qc149='card']", ["border-top-left-radius", "background-color", "box-shadow"]);
      const h = await css(page, "[data-qc149='card'] h1", ["font-family", "font-size"]);
      for (const p of ["border-top-left-radius", "background-color", "box-shadow"]) L.check(`card ${p} equals Versions'`, !!c && !!ver.c && c[p] === ver.c[p], `${c?.[p]} vs ${ver.c?.[p]}`);
      for (const p of ["font-family", "font-size"]) L.check(`title ${p} equals Versions'`, !!h && !!ver.h && h[p] === ver.h[p], `${h?.[p]} vs ${ver.h?.[p]}`);
      L.check("no living hero", (await box(page, "[data-qc138='header']")) === null, "qc138 header present");
      L.check("no breakdown card", (await box(page, "[data-qc141='card']")) === null, "breakdown present");
      L.done(14);
    });

    test("L2 · the header, banner and view row share edges; the list is the inset wider each side", async ({ page }) => {
      test.skip(!run("L2"));
      const L = new Ledger(`L2-${vp.width}`);
      await openQc(page, vp);
      await mutateCss(page, "L2", `.qcv-group[data-v138] .qc138-sheet { margin-left: ${inset}px !important; margin-right: ${inset}px !important; }`);
      const card = await box(page, "[data-qc149='card']");
      const ban = await box(page, "[data-qc149='banner']");
      const row = await box(page, "[data-qc149='views-row']");
      const list = await box(page, "[data-qc138='sheet']");
      L.check("population", !!card && !!ban && !!row && !!list, JSON.stringify({ card: !!card, ban: !!ban, row: !!row, list: !!list }));
      L.check("banner shares the card's left and right", !!card && !!ban && near(ban.l, card.l) && near(ban.r, card.r), `${ban?.l}/${ban?.r} vs ${card?.l}/${card?.r}`);
      L.check("view row shares the card's left and right", !!card && !!row && near(row.l, card.l) && near(row.r, card.r), `${row?.l}/${row?.r} vs ${card?.l}/${card?.r}`);
      L.check(`list's left is ${inset} further out`, !!card && !!list && near(card.l - list.l, inset), `${card && list ? (card.l - list.l).toFixed(1) : "-"}`);
      L.check(`list's right is ${inset} further out`, !!card && !!list && near(list.r - card.r, inset), `${card && list ? (list.r - card.r).toFixed(1) : "-"}`);
      L.done(5);
    });

    test("L3 · the banner counts the With you set; Show them shows it; at zero it is absent", async ({ page }) => {
      test.skip(!run("L3"));
      const L = new Ledger(`L3-${vp.width}`);
      await openQc(page, vp);
      const n = Number(((await text(page, "[data-qc149='banner-n']")) ?? "").match(/^\d+/)?.[0] ?? NaN);
      const chips = await chipCounts(page);
      L.check("population: the banner and the With you chip", Number.isFinite(n) && chips.you != null, `n ${n} · chip ${chips.you}`);
      L.check("its n is the With you chip's count", n === chips.you, `${n} vs ${chips.you}`);
      const all = await rows(page);
      const faces = await page.evaluate(() => [...document.querySelectorAll("[data-qc149='banner'] .pab-g span")].length);
      L.check("one to five faces", faces >= 1 && faces <= 5, String(faces));
      await tap(page, "[data-qc149='show']");
      await page.waitForTimeout(900);
      const shown = await rows(page);
      const pressed = await page.evaluate(() => document.querySelector("[data-qc149='view'][data-k='you']")?.getAttribute("aria-pressed"));
      L.check("Show them presses With you", pressed === "true", String(pressed));
      L.check("…and the list is exactly the With you set", shown.length === n && shown.every((r) => r.where === "you"), `${shown.length} rows, ${shown.filter((r) => r.where !== "you").length} not you`);
      L.check("…which the All view tagged the same", all.filter((r) => r.where === "you").map((r) => r.id).sort().join() === shown.map((r) => r.id).sort().join(), "ids differ");
      /* at zero: unreachable on the harness account (something always waits on the writer, and the banner counts the
         manuscript-scoped set, which the page's Find does not narrow). The zero branch is held by qcHeader149.test.tsx
         ("absent at zero"); here, the other half: drawn because n > 0. */
      L.check("drawn because n > 0", n > 0 && !!(await box(page, "[data-qc149='banner']")), String(n));
      L.done(7);
    });

    test("L4 · each chip is its set, they sum to All, one at a time, and they combine with Filters", async ({ page }) => {
      test.skip(!run("L4"));
      const L = new Ledger(`L4-${vp.width}`);
      await openQc(page, vp);
      const chips = await chipCounts(page);
      const all = await rows(page);
      L.check("population: five chips and rows", Object.keys(chips).length === 5 && all.length > 0, JSON.stringify(chips));
      const sum = ["you", "agent", "quiet", "closed"].reduce((a, k) => a + (chips[k] ?? 0), 0);
      L.check("they sum to All", sum === chips.all, `${sum} vs ${chips.all}`);
      L.check("All is the list's own count", chips.all === all.length, `${chips.all} vs ${all.length} rows`);
      for (const k of ["you", "agent", "quiet", "closed"]) {
        await tap(page, `[data-qc149='view'][data-k='${k}']`);
        await page.waitForTimeout(700);
        const r = await rows(page);
        const want = all.filter((x) => x.where === k).map((x) => x.id).sort().join();
        L.check(`${k}: the count is its set's size`, r.length === chips[k], `${r.length} vs ${chips[k]}`);
        L.check(`${k}: exactly that set (ids)`, r.map((x) => x.id).sort().join() === want, "ids differ");
        const pressed = await page.evaluate(() => [...document.querySelectorAll("[data-qc149='view'][aria-pressed='true']")].map((b) => (b as HTMLElement).dataset.k));
        L.check(`${k}: one chip pressed`, pressed.length === 1 && pressed[0] === k, JSON.stringify(pressed));
      }
      await tap(page, "[data-qc149='view'][data-k='closed']");
      await page.waitForTimeout(700);
      L.check("pressing the chosen chip again restores All", (await rows(page)).length === all.length, String((await rows(page)).length));
      /* combine: With you, then a Filters choice (the first status the strip offers) — the intersection */
      await tap(page, "[data-qc149='view'][data-k='you']");
      await page.waitForTimeout(600);
      const youRows = await rows(page);
      const status = youRows[0]?.status;
      await tap(page, "[data-qc140='filters']");
      await page.waitForTimeout(600);
      const picked = await page.evaluate((st) => {
        const b = [...document.querySelectorAll<HTMLElement>(".qc142-strip button")].find((x) => x.getBoundingClientRect().height > 0 && x.textContent?.trim().toLowerCase().startsWith(String(st).toLowerCase()));
        if (!b) return false; b.click(); return true;
      }, status);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(800);
      const both = await rows(page);
      L.check("population: a status was chosen in Filters", picked && !!status, `${status} · ${picked}`);
      L.check("With you ∩ that status", both.length > 0 && both.every((r) => r.where === "you" && r.status === status) && both.length === youRows.filter((r) => r.status === status).length,
        `${both.length} rows vs ${youRows.filter((r) => r.status === status).length}`);
      L.done(18);
    });

    test("L5 · the navy bar: heard back, Filters, Group by, Sort, Full screen; no switch, count or jump row; flexible columns", async ({ page }) => {
      test.skip(!run("L5"));
      const L = new Ledger(`L5-${vp.width}`);
      await openQc(page, vp);
      /* the named break at 1280 (where the figure is hidden by design): show it */
      await mutateCss(page, "L5", ".qcv-group[data-v138] .qc149-hb { display: inline-flex !important; }");
      const hb = await box(page, "[data-qc149='heard']");
      L.check(narrow ? "heard back hidden at ≤1440" : "heard back shown", narrow ? !hb : !!hb && /^\d+% heard back$/.test((await text(page, "[data-qc149='heard']")) ?? ""), String(await text(page, "[data-qc149='heard']")));
      for (const [k, sel] of [["Filters", "[data-qc140='filters']"], ["Group by", "[data-qc140='group']"], ["Sort", "[data-qc1421='sort']"], ["Full screen", "[data-qc149='full']"]] as const) L.check(`${k} in the bar`, !!(await box(page, sel)), sel);
      for (const [k, sel] of [["the Cards/List switch", ".cl20-vs, [data-qc144='view-bar'], [data-qc142='view-tb']"], ["the count", "[data-qc144='count']"], ["the jump row", "[data-qc140='jump'], .qc140-jump"]] as const) L.check(`no ${k}`, !(await box(page, sel)), sel);
      const tracks = await page.evaluate(() => { const r = [...document.querySelectorAll<HTMLElement>(".qc138-sheet [data-qcv='row']")].find((x) => x.getBoundingClientRect().height > 0); return r ? getComputedStyle(r).gridTemplateColumns.split(" ").length : 0; });
      L.check("six column tracks", tracks === 6 || (tracks === 5 && narrow), String(tracks));
      const lastH = await page.evaluate(() => { const hs = [...document.querySelectorAll<HTMLElement>("[data-qc138='heading']")].filter((h) => h.getBoundingClientRect().width > 0); const s = document.querySelector("[data-qc138='sheet']")!.getBoundingClientRect(); return hs.length ? s.right - hs[hs.length - 1].getBoundingClientRect().right : null; });
      L.check("the last heading is within 40 of the right edge", lastH != null && lastH <= 40, String(lastH));
      /* full screen too: no switch */
      await tap(page, "[data-qc149='full']");
      await page.waitForTimeout(1200);
      L.check("full screen: no Cards/List switch", !(await box(page, ".cl20-vs, .cl20-vsi, [data-qc142='view-tb']")), "switch in full screen");
      L.check("full screen: Exit full screen", !!(await box(page, "[data-qc142='full-tb']")), "no exit");
      /* the full-screen pinned band (v141 b2) is untouched: the header card and the banner go, as the old header did, and
         the band sits at the sheet's top (QC140-C1 found them still drawn above it) */
      await mutateCss(page, "L5fs", ".qcv-group[data-v138][data-full] > .qc149-hd { display: block !important; }");
      const fs = { card: await box(page, "[data-qc149='card']"), banner: await box(page, "[data-qc149='banner']"), band: await box(page, "[data-qc140='band']"), win: await box(page, ".ws-window") };
      L.check("full screen: no header card or banner", !fs.card && !fs.banner, `card ${!!fs.card} · banner ${!!fs.banner}`);
      L.check("full screen: the band is at the sheet's top", !!fs.band && !!fs.win && near(fs.band.t, fs.win.t, 1.5), `${fs.band?.t} vs ${fs.win?.t}`);
      await tap(page, "[data-qc142='full-tb']");
      L.done(13);
    });

    test("L6 · the hover timeline: one-line summary, nothing past the list card's edges", async ({ page }) => {
      test.skip(!run("L6"));
      const L = new Ledger(`L6-${vp.width}`);
      await openQc(page, vp);
      await mutateCss(page, "L6", ".qcv-group[data-v138] .qc138-sheet .qc138-sumc { flex-direction: column !important; }");
      const all = await rows(page);
      const now = Date.now();
      const pick = [
        all.find((r) => r.due != null && r.due < now && r.where !== "closed"),
        all.find((r) => r.due != null && r.due > now && r.where === "agent"),
        all.find((r) => r.status === "Offer"),
      ];
      L.check("population: an overdue, a waiting and an offer row", pick.every(Boolean), JSON.stringify(pick.map((p) => p?.status ?? null)));
      for (const [i, r] of pick.entries()) {
        if (!r) continue;
        const sel = `.qc138-sheet [data-qcv='row'][data-id="${r.id}"]`;
        await page.locator(sel).first().scrollIntoViewIfNeeded();
        await page.locator(`${sel} [data-qcv='row-first']`).first().hover();
        await page.waitForTimeout(1300);
        const m = await page.evaluate((s) => {
          const row = document.querySelector<HTMLElement>(s)!;
          const sum = row.querySelector<HTMLElement>("[data-qcv='peek-summary']");
          const sheet = document.querySelector<HTMLElement>("[data-qc138='sheet']")!.getBoundingClientRect();
          let out = 0;
          for (const e of row.querySelectorAll<HTMLElement>("[data-qcv='peek-drawer'] *")) {
            if (e.closest("svg") && e.tagName !== "svg") continue;
            const b = e.getBoundingClientRect();
            if (b.width === 0) continue;
            if (b.left < sheet.left - 0.5 || b.right > sheet.right + 0.5) out++;
          }
          return { h: sum ? sum.getBoundingClientRect().height : null, out };
        }, sel);
        const label = ["overdue", "waiting", "offer"][i];
        L.check(`${label}: the summary is one line (≤24)`, m.h != null && m.h <= 24, String(m.h));
        L.check(`${label}: nothing past the list card's edges`, m.out === 0, `${m.out} boxes outside`);
        await page.mouse.move(5, 5);
        await page.waitForTimeout(400);
      }
      L.done(7);
    });

    test("L7 · each group heading is a full-width band, #f6f3ee, with no rule", async ({ page }) => {
      test.skip(!run("L7"));
      const L = new Ledger(`L7-${vp.width}`);
      await openQc(page, vp);
      await mutateCss(page, "L7", ".qcv-group[data-v138] .qc138-sheet .qc144-rh .qc144-rhr { display: block !important; } .qcv-group[data-v138] .qc138-sheet .qc138-band.qc144-rh { background: transparent !important; }");
      const m = await page.evaluate(() => {
        const body = document.querySelector<HTMLElement>("[data-qcv='list']")!.getBoundingClientRect();
        return [...document.querySelectorAll<HTMLElement>("[data-qcv='gband']")].filter((b) => b.getBoundingClientRect().height > 0).map((b) => {
          const r = b.querySelector<HTMLElement>("[data-qc144='heading-rule']");
          return { w: b.getBoundingClientRect().width, bw: body.width, bg: getComputedStyle(b).backgroundColor, rule: !!r && r.getBoundingClientRect().width > 0 };
        });
      });
      L.check("population: group headings", m.length >= 2, String(m.length));
      for (const [i, h] of m.entries()) {
        L.check(`#${i} width is the list body's`, near(h.w, h.bw), `${h.w} vs ${h.bw}`);
        L.check(`#${i} background #f6f3ee`, h.bg === "rgb(246, 243, 238)", h.bg);
        L.check(`#${i} no rule after the count`, !h.rule, "rule drawn");
      }
      L.done(4);
    });

    test("L8 · a row opens the panel holding the query card; its band, tabs, ‹ › and Esc", async ({ page }) => {
      test.skip(!run("L8"));
      const L = new Ledger(`L8-${vp.width}`);
      await openQc(page, vp);
      const all = await rows(page);
      const first = all[1] ?? all[0];
      L.check("population", !!first, String(all.length));
      if (first) await openPanel(page, first.id);
      const panel = await box(page, "[data-qp='panel']");
      L.check(`the panel is today's width (${narrow ? 520 : 560})`, !!panel && near(panel.w, narrow ? 520 : 560), String(panel?.w));
      L.check("it holds the query card", !!(await box(page, CARD)), "no card");
      const band = await text(page, `${CARD} [data-qc149c='band-word']`);
      L.check("its band word is the row's set", !!first && band === WHERE[first.where], `${band} vs ${first && WHERE[first.where]}`);
      for (const t of ["agent", "materials", "notes", "tracking"]) {
        await tap(page, `${CARD} [data-qc149c='tab'][data-tab='${t}']`);
        await page.waitForTimeout(250);
        const vis = await page.evaluate((s) => [...document.querySelectorAll<HTMLElement>(`${s} [data-qc149c='pane']`)].filter((p) => !p.hidden).map((p) => p.dataset.pane), CARD);
        L.check(`the ${t} tab shows its pane alone`, vis.length === 1 && vis[0] === t, JSON.stringify(vis));
      }
      const order = all.map((r) => r.id);
      const at = first ? order.indexOf(first.id) : -1;
      L.check("N / M matches the visible order", (await text(page, `${CARD} [data-qc149c='pos']`)) === `${at + 1} / ${order.length}`, `${await text(page, `${CARD} [data-qc149c='pos']`)} vs ${at + 1} / ${order.length}`);
      /* read the button before pressing it: a disabled › is a red reading, never a click that waits out the timeout */
      const nextOn = await page.evaluate((s) => { const b = document.querySelector<HTMLButtonElement>(`${s} [data-qc149c='next']`); return !!b && !b.disabled; }, CARD);
      L.check("› is enabled on a row that has a next", nextOn && at + 1 < order.length, `enabled ${nextOn}`);
      const cardIs = (id: string | undefined) => page.waitForFunction(([s, want]) => document.querySelector<HTMLElement>(s as string)?.dataset.id === want, [CARD, id] as const, { timeout: 6000 }).catch(() => {});
      if (nextOn) { await tap(page, `${CARD} [data-qc149c='next']`); await cardIs(order[at + 1]); }
      const nid = await page.evaluate((s) => document.querySelector<HTMLElement>(s)?.dataset.id ?? null, CARD);
      const cards = await page.evaluate((s) => [...document.querySelectorAll<HTMLElement>(s)].map((c) => `${c.dataset.id}:${c.querySelector("[data-qc149c='name']")?.textContent}:${Math.round(c.getBoundingClientRect().width)}`), CARD);
      L.check("› opens the next row in the visible order", nid === order[at + 1], `${nid} vs ${order[at + 1]} · cards ${cards.join(" | ")}`);
      await tap(page, `${CARD} [data-qc149c='prev']`);
      await cardIs(order[at]);
      L.check("‹ goes back", (await page.evaluate((s) => document.querySelector<HTMLElement>(s)?.dataset.id ?? null, CARD)) === order[at], "not back");
      await page.keyboard.press("Escape");
      await page.waitForTimeout(800);
      L.check("Esc closes it", !(await box(page, "[data-qp='panel']")), "still open");
      L.done(13);
    });

    test("L9 · respond in the card: Save waits for a choice, then the panel stays and everything moves on (undone after)", async ({ page }) => {
      test.skip(!run("L9") || BASE);
      const L = new Ledger(`L9-${vp.width}`);
      await openQc(page, vp);
      const all = await rows(page);
      const r = all.find((x) => x.status === "Queried" && x.where === "agent") ?? all.find((x) => x.status === "Queried");
      L.check("population: a Queried row", !!r, String(all.length));
      if (!r) { L.done(1); return; }
      await openPanel(page, r.id);
      await tap(page, `${CARD} [data-qc149c='record']`);
      await page.waitForTimeout(500);
      L.check("Save is disabled until an answer is chosen", await page.locator(`${CARD} [data-qc149c='save-response']`).isDisabled(), "enabled");
      await tap(page, `${CARD} [data-qc149c='resp-opt'][data-k='full']`);
      L.check("…and enabled after", await page.locator(`${CARD} [data-qc149c='save-response']`).isEnabled(), "disabled");
      await tap(page, `${CARD} [data-qc149c='save-response']`);
      await page.waitForTimeout(3500);
      const card = await box(page, CARD);
      L.check("the panel stays open on the card", !!card && (await page.evaluate((s) => document.querySelector<HTMLElement>(s)?.dataset.mode, CARD)) === "view", "closed or not in view mode");
      const steps = await page.evaluate((s) => [...document.querySelectorAll<HTMLElement>(`${s} [data-qc149c='step']`)].map((e) => ({ t: e.querySelector("[data-qc149c='step-title']")?.textContent ?? "", d: e.querySelector("[data-qc149c='step-day']")?.textContent ?? "" })), CARD);
      const today = new Date();
      const MON = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
      const want = `${today.getDate()} ${MON[today.getMonth()]}`;
      L.check("Tracking gains Full requested, dated today", steps.some((s) => /full requested/i.test(s.t) && s.d === want), JSON.stringify(steps.slice(-2)));
      L.check("the pill reads Full requested", /Full requested/.test((await text(page, `${CARD} [data-qc149c='pill']`)) ?? ""), String(await text(page, `${CARD} [data-qc149c='pill']`)));
      const primary = await text(page, `${CARD} [data-qc149c='primary']`);
      L.check("the primary is Mark full sent", primary === "Mark full sent", String(primary));
      const rowNow = await page.evaluate((id) => document.querySelector<HTMLElement>(`.qc138-sheet [data-qcv='row'][data-id="${id}"]`)?.dataset.status ?? null, r.id);
      L.check("the row in the list moved on", rowNow === "Full Requested", String(rowNow));
      L.check("UNDONE: the account is put back", await undo(page), "no undo bar — the account has been changed");
      await page.waitForTimeout(1500);
      const back = await page.evaluate((id) => document.querySelector<HTMLElement>(`.qc138-sheet [data-qcv='row'][data-id="${id}"]`)?.dataset.status ?? null, r.id);
      L.check("…the row is Queried again", back === "Queried", String(back));
      L.done(9);
    });

    test("L10 · edit in the card: a step's date and the package persist across a reload; Cancel restores", async ({ page }) => {
      test.skip(!run("L10") || BASE || vp.width !== 1512);
      const L = new Ledger(`L10-${vp.width}`);
      page.on("console", (m) => { if (m.type() === "error") console.log("PAGE", m.text().slice(0, 200)); });
      await openQc(page, vp);
      /* its own query (tests/e2e/seedQc149L10.mjs): the shared fixtures sit at the rules' document ceiling, where a package
         correction is refused for every client — measured, and reported rather than measured around */
      execSync("node tests/e2e/seedQc149L10.mjs", { stdio: "ignore" });
      await page.reload();
      await page.locator(".qc138-sheet [data-qcv='row']").first().waitFor({ timeout: 30_000 });
      await page.waitForTimeout(1500);
      const Q = "qc149l10-q";
      let target: string | null = null;
      const stepAt = 1;
      try {
      if ((await rows(page)).some((r) => r.id === Q)) {
        await openPanel(page, Q);
        await tap(page, `${CARD} [data-qc149c='edit']`);
        await page.waitForTimeout(400);
        const ok = await page.evaluate((s) => {
          const ds = [...document.querySelectorAll<HTMLInputElement>(`${s} [data-qc149c='step-date']`)].map((i) => Date.parse(i.value));
          const sel = document.querySelector<HTMLSelectElement>(`${s} [data-qc149c='pkg-select']`);
          return ds.length >= 2 && ds[1] - ds[0] >= 2 * 86_400_000 && !!sel && sel.value !== "__ind"
            && [...sel.options].some((o) => o.value !== "__ind" && o.value !== sel.value);
        }, CARD);
        if (ok) target = Q;
      }
      L.check("population: the seeded query, with a redatable second step and another package to choose", !!target, "the seeded query is missing or not as seeded");
      if (!target) { L.done(1); return; }
      const dateSel = `${CARD} [data-qc149c='step-date']`;
      const orig = await page.locator(dateSel).nth(stepAt).inputValue();
      const origPkg = await page.locator(`${CARD} [data-qc149c='pkg-select']`).inputValue();
      /* Cancel restores */
      await page.locator(dateSel).nth(stepAt).fill("1 Jan 2020");
      await tap(page, `${CARD} [data-qc149c='cancel']`);
      await page.waitForTimeout(400);
      const shown0 = await page.evaluate((s) => [...document.querySelectorAll<HTMLElement>(`${s} [data-qc149c='step-day']`)].map((e) => e.textContent), CARD);
      L.check("Cancel leaves the original dates", !shown0.some((d) => /2020/.test(d ?? "")), JSON.stringify(shown0));
      /* change the second step's date by one day back, and the package */
      const ms = Date.parse(orig);
      const d = new Date(Number.isFinite(ms) ? ms : Date.now());
      d.setDate(d.getDate() - 1);
      const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const nd = `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`;
      await tap(page, `${CARD} [data-qc149c='edit']`);
      await page.locator(dateSel).nth(stepAt).fill(nd);
      const opts = await page.locator(`${CARD} [data-qc149c='pkg-select'] option`).evaluateAll((o) => (o as HTMLOptionElement[]).map((x) => x.value));
      const newPkg = opts.find((v) => v !== origPkg && v !== "__ind")!;
      await page.locator(`${CARD} [data-qc149c='pkg-select']`).selectOption(newPkg);
      const err = await text(page, `${CARD} [data-qc149c='edit-error']`);
      L.check("population: the edit is valid", !err, String(err));
      await tap(page, `${CARD} [data-qc149c='save-edits']`);
      await page.waitForTimeout(1200);
      await page.waitForTimeout(2300);
      await page.reload();
      await page.locator(".qc138-sheet [data-qcv='row']").first().waitFor({ timeout: 30_000 });
      await page.waitForTimeout(1500);
      await openPanel(page, target);
      await tap(page, `${CARD} [data-qc149c='edit']`);
      await page.waitForTimeout(400);
      L.check("the date persists across a reload", (await page.locator(dateSel).nth(stepAt).inputValue()) === nd, `${await page.locator(dateSel).nth(stepAt).inputValue()} vs ${nd}`);
      L.check("the package persists across a reload", (await page.locator(`${CARD} [data-qc149c='pkg-select']`).inputValue()) === newPkg, `${await page.locator(`${CARD} [data-qc149c='pkg-select']`).inputValue()} vs ${newPkg}`);
      /* put it back: the original values, saved again */
      await page.locator(dateSel).nth(stepAt).fill(orig);
      await page.locator(`${CARD} [data-qc149c='pkg-select']`).selectOption(origPkg);
      await tap(page, `${CARD} [data-qc149c='save-edits']`);
      await page.waitForTimeout(3500);
      await tap(page, `${CARD} [data-qc149c='edit']`);
      await page.waitForTimeout(400);
      L.check("RESTORED: the original date", (await page.locator(dateSel).nth(stepAt).inputValue()) === orig, "the account has been changed");
      L.check("RESTORED: the original package", (await page.locator(`${CARD} [data-qc149c='pkg-select']`).inputValue()) === origPkg, "the account has been changed");
      await tap(page, `${CARD} [data-qc149c='cancel']`);
      } finally {
        execSync("node tests/e2e/seedQc149L10.mjs --clean", { stdio: "ignore" });
      }
      L.done(7);
    });

    test("L11 · log from the header: a not-queried agent, logged, in the list and open; queried agents cannot be picked (undone after)", async ({ page }) => {
      test.skip(!run("L11") || BASE || vp.width !== 1512);
      const L = new Ledger(`L11-${vp.width}`);
      await openQc(page, vp);
      const before = (await rows(page)).length;
      await tap(page, "[data-qc149='log']");
      await page.waitForTimeout(1000);
      L.check("the panel opens on the new card", !!(await box(page, "[data-qp='panel'] [data-qc149f='log'][data-step='pick']")), "no pick step");
      const busy = page.locator("[data-qc149f='agent-busy']").first();
      if (await busy.count()) {
        /* aria-disabled: Playwright will not click it, so the click is dispatched on the element itself — what a mouse would do */
        await busy.evaluate((e) => (e as HTMLElement).click());
        await page.waitForTimeout(400);
        L.check("an agent already querying cannot be picked", !!(await box(page, "[data-qc149f='log'][data-step='pick']")), "it was picked");
      } else L.check("population: an agent already querying this book", false, "none listed");
      const agentName = (await text(page, "[data-qc149f='agent'] b")) ?? "";
      await tap(page, "[data-qc149f='agent']");
      await page.waitForTimeout(500);
      L.check("the card fills in", !!(await box(page, "[data-qc149f='log'][data-step='fill']")), "no fill");
      await tap(page, "[data-qc149f='send'][data-k='sample']");
      await tap(page, "[data-qc149f='save']");
      await page.waitForTimeout(3500);
      const band = await text(page, `${CARD} [data-qc149c='band-word']`);
      L.check("it becomes the live query: WITH THE AGENT", band === "With the agent", String(band));
      L.check("…with its day", /Day\s*\d/.test((await text(page, `${CARD} [data-qc149c='day']`)) ?? ""), String(await text(page, `${CARD} [data-qc149c='day']`)));
      const after = await rows(page);
      L.check("the list gains the row", after.length === before + 1 && after.some((r) => r.name === agentName), `${before} → ${after.length} · ${agentName}`);
      L.check("UNDONE: the logged query is removed", await undo(page), "no undo bar — the account has been changed");
      await page.waitForTimeout(1500);
      L.check("…the list is back to its count", (await rows(page)).length === before, String((await rows(page)).length));
      await closePanel(page);
      /* the top bar's "+ Log a query" opens the same card */
      const bar = page.locator(".ws-pagebar button").filter({ hasText: "Log a query" }).first();
      if (await bar.count()) { await bar.click(); await page.waitForTimeout(1000); }
      L.check("the top bar's + Log a query opens the same card", !!(await box(page, "[data-qp='panel'] [data-qc149f='log']")), "no card");
      L.done(9);
    });

    test("L12 · Who replied? lists every live query once, in two groups, and a pick opens it in respond mode", async ({ page }) => {
      test.skip(!run("L12"));
      const L = new Ledger(`L12-${vp.width}`);
      await openQc(page, vp);
      const chips = await chipCounts(page);
      const court = Object.fromEntries((await rows(page)).map((r) => [r.id, r.court]));
      await tap(page, "[data-qc149='record']");
      await page.waitForTimeout(1000);
      const m = await page.evaluate(() => {
        const items = [...document.querySelectorAll<HTMLElement>("[data-qc149f='who-item']")].map((e) => ({ id: e.dataset.id ?? "", g: e.dataset.group ?? "" }));
        const heads = Object.fromEntries([...document.querySelectorAll<HTMLElement>("[data-qc149f='who-group']")].map((h) => [h.dataset.group ?? "", Number(h.textContent?.match(/(\d+)\s*$/)?.[1] ?? NaN)]));
        return { items, heads };
      });
      L.check("population: Who replied? with items", m.items.length > 0, String(m.items.length));
      L.check("each live query once", new Set(m.items.map((i) => i.id)).size === m.items.length, "duplicates");
      L.check("every live query: All less Closed", m.items.length === (chips.all ?? 0) - (chips.closed ?? 0), `${m.items.length} vs ${(chips.all ?? 0) - (chips.closed ?? 0)}`);
      const wrong = m.items.filter((i) => i.g !== (court[i.id] === "agent" ? "waiting" : "you"));
      L.check("each item is in its court's group (waiting = the agent's court)", m.items.length > 0 && wrong.length === 0, `${wrong.length} in the wrong group`);
      for (const g of ["waiting", "you"]) L.check(`the ${g} heading counts its items`, m.heads[g] === m.items.filter((i) => i.g === g).length, `${m.heads[g]} vs ${m.items.filter((i) => i.g === g).length}`);
      const pick = m.items[0];
      if (pick) await tap(page, `[data-qc149f='who-item'][data-id="${pick.id}"]`);
      await page.waitForTimeout(1600);
      L.check("a pick opens that query's card in respond mode", (await page.evaluate((s) => { const c = document.querySelector<HTMLElement>(s); return c ? `${c.dataset.id}|${c.dataset.mode}` : null; }, CARD)) === `${pick?.id}|respond`, "not in respond");
      L.done(7);
    });
  });
}
void MUT;
