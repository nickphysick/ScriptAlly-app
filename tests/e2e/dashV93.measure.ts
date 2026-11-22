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
import { Ledger, MUT, STATS, TASK_254, eachTask, openDash, readFw, tag, withWaiting, type VP } from "./db93Lib";

/* ⚠️ RE-POINTED (Dashboard v116): the founding card is tilted −1.8° at rest, and a rotated element's bounding rect is
   its axis-aligned box — ~6px taller and ~9px wider than the card. These checks are about LAYOUT (bottoms in line,
   heights, spacing above the tab), which a rotation never moves, so they read the card straight. Over the Activity
   feed tab the tilt only helps: rotate(-1.8deg) lifts the card's right-hand edge, which is the edge above the tab. */
const STRAIGHT = `.d58 .d105-fw.d116-tilt { rotate: none !important; transition: none !important; }`;


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

/* ── C · the founding card: "Your contributions" ──────────────────────────────────────────────────────────────────── */

const FIVE: VP[] = [{ width: 1440, height: 900 }, { width: 1366, height: 768 }, { width: 1280, height: 650 }, { width: 1920, height: 1080 }, { width: 2560, height: 1440 }];
const seed = (k: string, waiting = 0) => ({ __SA_FOUNDING_STATS: withWaiting(k, waiting) });

/* DB93 C1 · C2 · C3 · C4 · C7 — RETIRED by Dashboard v105 (tests/e2e/RETIRED-dashboard-v105.md): they measured the
   medallion, the ladder and the "Your contributions" copy, which the press-ID card replaces. C5 (the panel) and C6 (the
   laptop rows) stayed until v105 Part D; C5 is retired there, C6 stays. */

/* DB93 C5 — RETIRED by Dashboard v105 Part D: the right-hand panel is replaced by the How it works slides (DB105 D1). */

test("DB93 C6 — the laptop rows: founding 290, task at least 254, the bottoms in line", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("c6");
  for (const vp of [{ width: 1440, height: 900 }, { width: 1366, height: 768 }, { width: 1512, height: 900 }]) {
    await openDash(page, vp, { __SA_FOUNDING_STATS: STATS["6"] }); await page.addStyleTag({ content: STRAIGHT });
    const r = await page.evaluate(() => {
      const b = (s: string) => { const e = [...document.querySelectorAll<HTMLElement>(s)].find((x) => x.getBoundingClientRect().height > 0); return e ? e.getBoundingClientRect() : null; };
      const t = b('[data-d71="task"]'), f = b('[data-d58="panel"]'), h = b('[data-d60="hoops"]'), tab = b('[data-d58="tab"]');
      return t && f && h && tab ? { task: t.height, fw: f.height, fwB: f.bottom, hoopsB: h.bottom, tabT: tab.top } : null;
    });
    const w = tag(vp);
    L.check("C6", `${w} population`, !!r, JSON.stringify(r));
    if (!r) continue;
    /* ⚠️ THE PACK'S "task 254 at 1440×900" IS THE REF'S 560px COLUMN: this app's is 572 there, so with the founding
       card at its 290 the task card is 266. Locked as the rule the pack states — founding up to 290, task at least 254. */
    if (vp.height >= 900) L.check("C6", `${w} the founding card is 290 (±2)`, Math.abs(r.fw - 290) <= 2, r.fw.toFixed(1));
    else L.check("C6", `${w} the founding card is at most 290, at least 194`, r.fw <= 292 && r.fw >= 192, r.fw.toFixed(1));
    L.check("C6", `${w} the task card keeps at least 254 (−2)`, r.task >= 252, r.task.toFixed(1));
    L.check("C6", `${w} the columns' bottoms are equal (±1)`, Math.abs(r.fwB - r.hoopsB) <= 1, `${r.fwB.toFixed(1)} / ${r.hoopsB.toFixed(1)}`);
    L.check("C6", `${w} 14px (±2) above the Activity feed tab`, Math.abs(r.tabT - r.fwB - 14) <= 2, (r.tabT - r.fwB).toFixed(1));
  }
  L.done(15);
});
