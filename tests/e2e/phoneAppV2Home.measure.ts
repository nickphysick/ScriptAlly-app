/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PHONE APP v2, PART 2 — HOME, PA2-2 (design-refs/phone-app-v2/ screens 01–03). H1–H7 at 390 × 844 and 360 × 780; H8 is
 * PA2-1 S9 re-run on this build (tests/e2e/phoneAppV2Shell.measure.ts, PA2_L1=capture|compare).
 *
 * Every lock proved red by a named mutation first (`PA2_MUTATE`, or a code mutation built in its own folder) — see
 * reports/phone-app-v2/part-2/REPORT.md.
 */
import { test, type Page } from "@playwright/test";
import { openRoute } from "./measure";
import { Ledger, PHONES, colourSweep, imageSweep, openPhone, prime, shot, tag } from "./pa2Lib";

test.setTimeout(480_000);
const PART = "part-2";

const hero = (page: Page) => page.evaluate(() => {
  const h = document.querySelector<HTMLElement>('[data-pa="hero"]');
  return h ? { series: h.dataset.series, range: h.dataset.range, values: (h.dataset.values ?? "").split(",").filter(Boolean).map(Number), change: Number(h.dataset.change),
    num: Number(h.querySelector('[data-pa="hero-num"]')?.textContent ?? NaN), changeText: h.querySelector('[data-pa="hero-change"]')?.textContent ?? "" } : null;
});

for (const vp of PHONES) {
  test(`PA2-2 · Home · ${tag(vp)}`, async ({ page }) => {
    const L = new Ledger(PART, `home-${tag(vp)}`);
    /* the desktop's own figures for the same account and book: the chart's headline and the task card's first key */
    await prime(page);
    await openRoute(page, "/dashboard", { width: 1512, height: 900 });
    await page.locator('[data-probe-text="chart-title"]').first().waitFor({ timeout: 30_000 });
    await page.waitForTimeout(2500);
    const desk = await page.evaluate(() => ({
      active: Number(((document.querySelector('[data-probe-text="chart-title"]')?.textContent ?? "").match(/^([0-9,]+) active/) ?? [])[1]?.replace(/,/g, "") ?? NaN),
      first: [...document.querySelectorAll<HTMLElement>('[data-d71="task"][data-key]')].find((e) => e.getBoundingClientRect().height > 0)?.dataset.key ?? null,
    }));
    L.check("pop", `${tag(vp)} the desktop's figures`, Number.isFinite(desk.active) && !!desk.first, JSON.stringify(desk));

    await page.evaluate(() => { try { localStorage.removeItem("sa.phoneHero"); } catch { /* */ } });
    await openPhone(page, "/queries", vp);
    const qline = await page.evaluate(() => ({ sent: Number(document.querySelector('[data-qm1="sent"]')?.textContent ?? NaN),
      counts: Object.fromEntries([...document.querySelectorAll<HTMLElement>('[data-qm1="chip"]')].map((c) => [c.dataset.key!, Number(c.dataset.count)])) as Record<string, number> }));
    L.check("pop", `${tag(vp)} the Queries tab's own counts`, Number.isFinite(qline.sent) && Object.keys(qline.counts).length >= 4, JSON.stringify(qline));
    await page.goto("/dashboard"); await page.locator('[data-pa="hero"]').waitFor({ timeout: 20_000 }); await page.waitForTimeout(1500);

    /* H1 — every series × range: the number is the derivation's, the line has the range's points, the change is last − first */
    const h0 = await hero(page);
    L.check("H1", `${tag(vp)} defaults: Active · 3M`, h0?.series === "active" && h0.range === "3M", JSON.stringify(h0));
    let allPoints = 0;
    for (const s of ["active", "sent"]) for (const r of ["All", "1M", "3M"]) {
      await page.locator(`[data-pa="hero-series"][data-k="${s}"]`).click();
      await page.locator(`[data-pa="hero-range"][data-k="${r}"]`).click();
      await page.waitForTimeout(250);
      const h = await hero(page);
      if (!h) { L.check("H1", `${tag(vp)} ${s} ${r}: the hero is drawn`, false, ""); continue; }
      if (r === "All") allPoints = h.values.length;
      const want = r === "1M" ? Math.min(5, allPoints) : r === "3M" ? Math.min(13, allPoints) : allPoints;
      L.check("H1", `${tag(vp)} ${s} ${r}: ${want} points`, h.values.length === want && want > 0, `${h.values.length} vs ${want}`);
      L.check("H1", `${tag(vp)} ${s} ${r}: the number`, s === "active" ? h.num === desk.active : h.num === qline.sent, `${h.num} vs ${s === "active" ? desk.active : qline.sent}`);
      L.check("H1", `${tag(vp)} ${s} ${r}: the change is last − first`, h.change === h.values[h.values.length - 1] - h.values[0] && h.changeText.includes(r === "1M" ? "last month" : r === "3M" ? "3 months" : "since"), `${h.change} "${h.changeText}"`);
    }
    /* H2 — the switch persists across a reload */
    await page.locator('[data-pa="hero-series"][data-k="sent"]').click();
    await page.locator('[data-pa="hero-range"][data-k="1M"]').click();
    await page.reload(); await page.locator('[data-pa="hero"]').waitFor(); await page.waitForTimeout(1200);
    const h2 = await hero(page);
    L.check("H2", `${tag(vp)} Sent · 1M survives a reload`, h2?.series === "sent" && h2.range === "1M", JSON.stringify({ s: h2?.series, r: h2?.range }));
    await page.locator('[data-pa="hero-series"][data-k="active"]').click(); await page.locator('[data-pa="hero-range"][data-k="3M"]').click();
    await shot(page, PART, `01-home-${tag(vp)}`);

    /* H3 — the split bar's counts are the Queries chips', and each button lands on its chip */
    const stand = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll<HTMLElement>('[data-pa="stand-key"]')].map((b) => [b.dataset.k!, Number(b.dataset.count)])) as Record<string, number>);
    const closedN = Number(await page.locator('[data-pa="closed-line"]').getAttribute("data-count").catch(() => "NaN"));
    for (const k of ["you", "agent", "quiet"]) L.check("H3", `${tag(vp)} ${k}: ${stand[k]} = the Queries chip`, stand[k] === qline.counts[k], `${stand[k]} vs ${qline.counts[k]}`);
    L.check("H3", `${tag(vp)} the total is the three summed`, Number((await page.locator('[data-pa="stand-total"]').textContent())?.match(/\d+/)?.[0]) === stand.you + stand.agent + stand.quiet, "");
    let chipSplit = { passed: -1, withdrawn: -1 };
    for (const k of ["you", "agent", "quiet", "closed"]) {
      await page.goto("/dashboard"); await page.locator('[data-pa="stand"]').waitFor(); await page.waitForTimeout(900);
      await page.locator(k === "closed" ? '[data-pa="closed-line"]' : `[data-pa="stand-key"][data-k="${k}"]`).click();
      await page.locator('[data-qm1="list"]').waitFor({ timeout: 15_000 }); await page.waitForTimeout(900);
      const on = await page.evaluate(() => ({ chip: document.querySelector<HTMLElement>('[data-qm1="list"]')?.dataset.chip, url: location.search }));
      L.check("H3", `${tag(vp)} ${k}: lands on the ${k} chip`, on.chip === k && !on.url.includes("chip="), JSON.stringify(on));
      if (k === "closed") {
        /* H4 — the closed line: its count is the Closed chip's, and its split is the chip's passes and no-replies */
        for (let i = 0; i < 6; i++) { const more = page.locator('[data-qm1="show-more"]'); if (!(await more.count())) break; await more.first().click(); await page.waitForTimeout(150); }
        const words = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-qm1="row"]')].filter((r) => r.getBoundingClientRect().height > 0).map((r) => r.textContent ?? ""));
        L.check("H4", `${tag(vp)} closed: ${closedN} = the Closed chip`, closedN === qline.counts.closed, `${closedN} vs ${qline.counts.closed}`);
        L.check("H4", `${tag(vp)} closed: the chip shows that many rows`, words.length === closedN, `${words.length}`);
        /* the chip's own rows, by their stage word: STAGE_NAME's "Passed" and "Withdrawn" (no word boundary: a row's
           text runs into the name before it, "HalePassed 28 Oct") */
        chipSplit = { passed: words.filter((w) => /Passed/.test(w)).length, withdrawn: words.filter((w) => /Withdrawn/.test(w)).length };
      }
    }
    await page.goto("/dashboard"); await page.locator('[data-pa="closed-line"]').waitFor(); await page.waitForTimeout(900);
    const split = (await page.locator('[data-pa="closed-line"]').textContent()) ?? "";
    const m = split.match(/(\d+) passed, (\d+) no response/);
    L.check("H4", `${tag(vp)} the split is stated`, !!m, split);
    if (m) L.check("H4", `${tag(vp)} passes + no-replies never exceed the closed count`, Number(m[1]) + Number(m[2]) <= closedN, split);
    /* the passes are the Closed chip's "Passed" rows — a withdrawal is never counted as a pass */
    if (m) L.check("H4", `${tag(vp)} passed = the Closed chip's Passed rows`, Number(m[1]) === chipSplit.passed, `${m[1]} vs ${JSON.stringify(chipSplit)}`);

    /* H5 — Up next's item is the desktop's first */
    const upKey = await page.locator('[data-pa="upnext"]').getAttribute("data-key");
    L.check("H5", `${tag(vp)} Up next is the desktop's first task`, upKey === desk.first, `${upKey} vs ${desk.first}`);

    /* H6 — the order and the colour laws */
    const order = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-pa="stand"], [data-pa="upnext"], [data-pa="latest"], [data-pa="founding"]')].map((e) => [e.dataset.pa, e.getBoundingClientRect().top] as const));
    L.check("H6", `${tag(vp)} stand · up next · latest · founding, in that order`, order.map((o) => o[0]).join(",") === "stand,upnext,latest,founding" && order.every((o, i) => i === 0 || o[1] > order[i - 1][1]), JSON.stringify(order));
    const col = await colourSweep(page, { roots: ".pa-band, .pa-home, .pa-tabbar" });
    L.check("H6", `${tag(vp)} navy and blush grounds judged`, col.navy > 3 && col.blush > 0, JSON.stringify({ navy: col.navy, blush: col.blush }));
    L.check("H6", `${tag(vp)} white on navy, ink on blush, no green or red`, col.bad.length === 0, col.bad.slice(0, 4).join(" | "));
    /* H7 — no image twice */
    for (const s of await imageSweep(page)) L.check("H7", `${tag(vp)} no image twice`, new Set(s).size === s.length, JSON.stringify(s.filter((x, i) => s.indexOf(x) !== i)));
    L.done(30);
  });
}
