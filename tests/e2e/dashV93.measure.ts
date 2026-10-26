/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v93 — the DB93 locks, measured on the rendered page (refs design-refs/dashboard-v93/).
 *
 * A1 the task band's colour and title per kind · A2 the band is the chart band's height · A3 nothing
 * cut at 254px, for each kind · C1–C7 the "Your contributions" card and its panel.
 *
 * Every lock states its population first: a probe that finds nothing is a red, never a pass.
 * `DB93_MUTATE=<name>` applies a lock's named break in the page.
 * ⚠️ NO REGEX INSIDE `page.evaluate`: strings come back to Node and are matched here.
 */
import { test, type Page } from "@playwright/test";
import { Ledger, TASK_254, eachTask, openDash, tag } from "./db93Lib";

const BAND: Record<string, { bg: string; ink: string; title: string | null }> = {
  nudge: { bg: "rgb(42, 58, 82)", ink: "rgb(255, 255, 255)", title: "Time to nudge" },
  close: { bg: "rgb(228, 223, 215)", ink: "rgb(28, 19, 15)", title: "Consider closing" },
  send: { bg: "rgb(162, 69, 42)", ink: "rgb(255, 255, 255)", title: "Your move" },
  other: { bg: "rgb(95, 117, 145)", ink: "rgb(255, 255, 255)", title: null },
};

const readTask = (page: Page) => page.evaluate(() => {
  const c = [...document.querySelectorAll<HTMLElement>('[data-d71="task"][data-loading="0"]')].find((e) => e.getBoundingClientRect().height > 0);
  if (!c) return null;
  const band = c.querySelector<HTMLElement>('[data-d71="band"]');
  const title = c.querySelector<HTMLElement>('[data-d71="band-title"]');
  const cb = c.getBoundingClientRect();
  const escapes: string[] = []; let n = 0;
  for (const el of c.querySelectorAll<HTMLElement>("*")) {
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    if (r.width <= 0 || r.height <= 0 || cs.display === "none" || cs.visibility === "hidden" || el.closest('[aria-hidden="true"]')) continue;
    n += 1;
    if (r.top < cb.top - 0.5 || r.bottom > cb.bottom + 0.5 || r.left < cb.left - 0.5 || r.right > cb.right + 0.5) escapes.push(`${el.className || el.tagName}`);
  }
  const over: string[] = [];
  for (const el of [c, ...c.querySelectorAll<HTMLElement>('[data-d71="body"], [data-d71="band"], [data-d71="foot"], .d71-title, .d71-line')]) {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || el.getBoundingClientRect().height <= 0) continue;
    if (el.scrollHeight > el.clientHeight + 1) over.push(`${el.className} ${el.scrollHeight}/${el.clientHeight}`);
  }
  /* the reply bar's labels share one row: no two visible labels may overlap (found by A3: "Expected" over "Today") */
  const labs = [...c.querySelectorAll<HTMLElement>(".d71-wlab > span")].filter((e) => getComputedStyle(e).visibility !== "hidden" && e.getBoundingClientRect().width > 0).map((e) => e.getBoundingClientRect());
  let labelHit = false;
  for (let i = 0; i < labs.length; i++) for (let j = i + 1; j < labs.length; j++) if (labs[i].right > labs[j].left + 0.5 && labs[j].right > labs[i].left + 0.5) labelHit = true;
  const pager = c.querySelector<HTMLElement>('[data-d71="pos"]');
  return {
    kind: c.dataset.kind ?? "", label: c.dataset.label ?? "", h: cb.height,
    bandH: band ? band.getBoundingClientRect().height : -1,
    bg: band ? getComputedStyle(band).backgroundColor : "", ink: title ? getComputedStyle(title).color : "",
    title: (title?.textContent ?? "").trim(), titleFont: title ? getComputedStyle(title).fontFamily : "",
    pagerInBand: !!(pager && band && band.contains(pager)), kickerGone: !c.querySelector('[data-d71="kicker"]'),
    titleWhole: !!title && title.scrollWidth <= title.clientWidth + 0.5,
    n, escapes: escapes.slice(0, 5), over, labelHit, labels: labs.length,
  };
});

/* ── A1 · A2 — the band per kind, the chart band's height ─────────────────────────────────────── */

test("DB93 A1 · A2 — the task card's kind band, at the chart band's height", async ({ page }) => {
  test.setTimeout(400_000);
  const L = new Ledger("a1a2");
  await page.emulateMedia({ reducedMotion: "reduce" });
  const vp = { width: 1440, height: 900 };
  await openDash(page, vp);
  const chartBand = await page.evaluate(() => { const e = document.querySelector<HTMLElement>('[data-probe="chart-card-band"]'); return e ? e.getBoundingClientRect().height : -1; });
  const seen = new Set<string>();
  const rows = await eachTask(page, () => readTask(page));
  L.check("A1", "population: the task card cycled through its items", rows.length > 1 && rows.every(Boolean), `${rows.length} items`);
  for (const r of rows) {
    if (!r || seen.has(r.kind)) continue;
    seen.add(r.kind);
    const want = BAND[r.kind];
    L.check("A1", `${r.kind}: a known kind`, !!want, r.kind);
    if (!want) continue;
    const title = want.title ?? r.label;
    L.check("A1", `${r.kind}: band ${want.bg}, title ink ${want.ink}`, r.bg === want.bg && r.ink === want.ink, `${r.bg} · ${r.ink}`);
    L.check("A1", `${r.kind}: title "${title}"`, !!title && r.title === title, `"${r.title}"`);
    L.check("A1", `${r.kind}: Special Elite, the pager in the band, the kicker pill gone`, r.titleFont.includes("Special Elite") && r.pagerInBand && r.kickerGone, `${r.titleFont.slice(0, 20)} · pager ${r.pagerInBand} · kicker gone ${r.kickerGone}`);
    L.check("A2", `${r.kind}: band ${r.bandH.toFixed(1)} = chart band ${chartBand.toFixed(1)} (±1)`, chartBand > 0 && Math.abs(r.bandH - chartBand) <= 1, "");
  }
  L.check("A1", "all four kinds were visited", ["nudge", "close", "send", "other"].every((k) => seen.has(k)), [...seen].join(","));
  L.done(22);
});

/* ── A3 — nothing cut at 254px, for each kind ─────────────────────────────────────────────────── */

test("DB93 A3 — nothing is cut in a 254px task card, for every kind", async ({ page }) => {
  test.setTimeout(400_000);
  const L = new Ledger("a3");
  await page.emulateMedia({ reducedMotion: "reduce" });
  const vp = { width: 1440, height: 900 };
  await openDash(page, vp, {}, "seed-ms-1", TASK_254);
  const rows = await eachTask(page, () => readTask(page));
  const seen = new Set<string>();
  L.check("A3", "population: the items of the cycle", rows.length > 1 && rows.every(Boolean), `${rows.length}`);
  for (const [i, r] of rows.entries()) {
    if (!r) continue;
    seen.add(r.kind);
    L.check("A3", `item ${i + 1} (${r.kind}): the card is 254px (±2)`, Math.abs(r.h - 254) <= 2, `${r.h.toFixed(1)}`);
    L.check("A3", `item ${i + 1} (${r.kind}): every element inside the card`, r.n >= 8 && r.escapes.length === 0, `${r.n} · ${r.escapes.join(" | ") || "none"}`);
    L.check("A3", `item ${i + 1} (${r.kind}): nothing scrolls inside it`, r.over.length === 0, r.over.join(" | ") || "none");
    L.check("A3", `item ${i + 1} (${r.kind}): the band's title "${r.title}" is whole`, r.titleWhole, "");
    if (r.labels > 1) L.check("A3", `item ${i + 1} (${r.kind}): the bar's labels do not overlap`, !r.labelHit, `${r.labels} labels`);
  }
  L.check("A3", "all four kinds were visited", ["nudge", "close", "send", "other"].every((k) => seen.has(k)), [...seen].join(","));
  L.done(30);
});
