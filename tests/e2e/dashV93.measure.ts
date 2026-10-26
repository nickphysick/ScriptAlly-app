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

test("DB93 C1 — the variant comes from the card's own height", async ({ page }) => {
  test.setTimeout(400_000);
  const L = new Ledger("c1");
  const want: Record<string, string> = { "1440x900": "Full", "1366x768": "Medium", "1280x650": "Compact", "1920x1080": "Full", "2560x1440": "Full" };
  for (const vp of FIVE) {
    await openDash(page, vp, seed("6"));
    const c = await readFw(page);
    const w = tag(vp);
    L.check("C1", `${w} population: the card, seeded with 6 contributions`, !!c && c.n >= 6 && (c.variant === "Compact" ? !!c.compactLine : c.title === "The Archivist"), JSON.stringify({ h: c?.h, n: c?.n, variant: c?.variant }));
    if (!c) continue;
    L.check("C1", `${w} the card (${c.h.toFixed(0)}px tall) is ${want[w]}`, c.variant === want[w], c.variant);
    if (vp.height > 900) L.check("C1", `${w} the content is centred vertically (±4)`, c.centred != null && c.centred <= 4, `off ${c.centred?.toFixed(1)}`);
  }
  L.done(12);
});

test("DB93 C2 · C3 — nothing cut at any variant, count or waiting; the ladder's states", async ({ page }) => {
  test.setTimeout(1_500_000);
  const L = new Ledger("c2c3");
  const variants = new Set<string>();
  /* the pack's five sizes, and the narrowest supported window (1100×800, a 250px card — found by DB71 F3) */
  for (const vp of [...FIVE, { width: 1100, height: 800 }]) for (const k of ["0", "1", "6", "11", "25"]) for (const waiting of [0, 2]) {
    await openDash(page, vp, seed(k, waiting));
    const c = await readFw(page);
    const w = `${tag(vp)} ${k}${waiting ? " +2 waiting" : ""}`;
    L.check("C2", `${w} population`, !!c && c.n >= 4 && c.variant !== "none", JSON.stringify({ n: c?.n, v: c?.variant }));
    if (!c) continue;
    variants.add(c.variant);
    L.check("C2", `${w} (${c.variant}) every element inside the card`, c.escapes.length === 0, c.escapes.join(" | ") || "none");
    L.check("C2", `${w} (${c.variant}) nothing scrolls or is cut inside it`, c.over.length === 0, c.over.join(" | ") || "none");
    if (vp.width === 1440 && !waiting) {
      const level = Number(k) === 0 ? 0 : { "1": 1, "6": 2, "11": 3, "25": 5 }[k]!;
      const colour = c.rungs.filter((r) => r.colour).length, you = c.rungs.filter((r) => r.state === "you").length;
      L.check("C3", `${k}: five rungs`, c.rungs.length === 5, `${c.rungs.length}`);
      L.check("C3", `${k}: full-colour heads = level ${level}`, colour === level, `${colour}`);
      L.check("C3", `${k}: ${level ? "exactly one current head" : "no current head, every head faded"}`, you === (level ? 1 : 0), `${you}`);
      if (level === 0) L.check("C3", "0: the medallion's Fledgling is at 45% and the ring empty", c.medOpacity === "0.45" && Number(c.ring) === 0, `${c.medOpacity} · ring ${c.ring}`);
      if (k === "6") L.check("C3", "6: the ring is (6 − 3) ÷ (8 − 3) = 0.6", Math.abs(Number(c.ring) - 0.6) < 0.001, c.ring);
      if (k === "25") L.check("C3", "25: the ring is full at QueryHawk", Number(c.ring) === 1, c.ring);
    }
  }
  L.check("C2", "all three variants were visited", ["Full", "Medium", "Compact"].every((v) => variants.has(v)), [...variants].join(","));
  /* 6 sizes × 5 counts × waiting on/off × 3 (180), C3 at 1440 (15 + the 0, 6 and 25 rings), and the variants seen */
  L.done(199);
});

test("DB93 C4 · C7 — the copy table, a/an, the 0 and 1 forms, no Nick, no green", async ({ page }) => {
  test.setTimeout(600_000);
  const L = new Ledger("c4c7");
  const vp = { width: 1440, height: 900 };
  const cases: Array<[string, Record<string, unknown>, Partial<Record<"kicker" | "title" | "line" | "stat", string>>]> = [
    ["6", STATS["6"], { kicker: "FOUNDING WRITER · LEVEL 2 OF 5", title: "The Archivist", line: "Keeps the record straight.", stat: "6 contributions · top 15% of founding writers. 2 more and you become a Scout." }],
    ["11 (topPct null)", STATS["11"], { kicker: "FOUNDING WRITER · LEVEL 3 OF 5", title: "The Scout", line: "Spots what others miss.", stat: "11 contributions. 4 more and you become a Mentor." }],
    ["2 (an Archivist)", { ...STATS["1"], contributions: 2, toNext: 1 }, { title: "The Fledgling", stat: "2 contributions. 1 more and you become an Archivist." }],
    ["1", STATS["1"], { title: "The Fledgling", line: "Just hatched, and already helping.", stat: "Your first contribution. Welcome to the flock. 2 more and you become an Archivist." }],
    ["0", STATS["0"], { kicker: "FOUNDING WRITER", title: "Your first contribution makes you a Fledgling", line: "Use Give feedback in the sidebar. Anything useful counts." }],
    ["16 (Mentor)", { contributions: 16, waiting: 0, tier: "mentor", nextTier: "queryhawk", toNext: 9, topPct: 10 }, { title: "The Mentor", line: "Helps shape how every writer queries.", stat: "16 contributions · top 10% of founding writers. 9 more and you become a QueryHawk." }],
    ["25", STATS["25"], { kicker: "FOUNDING WRITER · LEVEL 5 OF 5", title: "The QueryHawk", line: "Top of the tree.", stat: "25 contributions · top 5% of founding writers. You’ve reached the top." }],
    ["6 + waiting", withWaiting("6", 3), { stat: "6 contributions · top 15% of founding writers. 2 more and you become a Scout. 3 waiting to be read." }],
  ];
  for (const [name, stats, want] of cases) {
    await openDash(page, vp, { __SA_FOUNDING_STATS: stats });
    if (MUT === "C4-copy") await page.evaluate(() => { const e = document.querySelector('[data-d93="stat"]'); if (e) e.textContent = "Nick says: 6 contributions."; });
    const c = await readFw(page);
    L.check("C4", `${name}: population`, !!c && c.variant === "Full", c?.variant ?? "none");
    if (!c) continue;
    L.check("C4", `${name}: the band`, c.band === "You’re a QueryHawk founding writer", `${c.band}`);
    L.check("C4", `${name}: How it works`, c.how === "How it works", `${c.how}`);
    for (const k of ["kicker", "title", "line", "stat"] as const) if (want[k] !== undefined) L.check("C4", `${name}: ${k}`, c[k] === want[k], `"${c[k]}"`);
    L.check("C4", `${name}: no "Nick" in the card`, !c.allText.toLowerCase().includes("nick"), "");
  }
  /* C7 — no green, in either card or the panel */
  await openDash(page, vp, { __SA_FOUNDING_STATS: STATS["6"] });
  await page.locator('[data-d93="how"]:visible').first().click();
  await page.locator('[data-d93="panel"].on').waitFor({ timeout: 5000 });
  await page.waitForTimeout(400);
  const cols = await page.evaluate(() => {
    const roots = [...document.querySelectorAll<HTMLElement>('[data-d71="task"][data-loading="0"], [data-d58="panel"][data-loading="0"], [data-d93="panel"]')];
    const out: string[] = [];
    for (const r of roots) for (const el of [r, ...r.querySelectorAll<HTMLElement>("*")]) {
      const cs = getComputedStyle(el);
      if (cs.display === "none") continue;
      for (const v of [cs.color, cs.backgroundColor, cs.borderTopColor, cs.fill, cs.stroke]) if (v && v.startsWith("rgb")) out.push(v);
      for (const m of (cs.backgroundImage + " " + cs.boxShadow).matchAll(/rgba?\([^)]*\)/g)) out.push(m[0]);
    }
    return { n: roots.length, cols: [...new Set(out)] };
  });
  L.check("C7", "population: the task card, the founding card and the panel", cols.n === 3 && cols.cols.length > 8, `${cols.n} roots · ${cols.cols.length} colours`);
  const green = cols.cols.filter((c) => {
    const m = c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/); if (!m) return false;
    const [r, g, b] = [m[1], m[2], m[3]].map((v) => Number(v) / 255); const a = m[4] === undefined ? 1 : Number(m[4]);
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    const sat = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
    let hue = 0; if (d) hue = mx === r ? 60 * (((g - b) / d) % 6) : mx === g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4); if (hue < 0) hue += 360;
    return a > 0 && sat > 0.15 && hue >= 80 && hue <= 170;
  });
  L.check("C7", "no colour with hue 80°–170° and saturation over 15%", green.length === 0, green.join(" | ") || "none");
  const ptext = await page.evaluate(() => document.querySelector<HTMLElement>('[data-d93="panel"]')?.innerText ?? "");
  L.check("C4", "the panel names no Nick", !ptext.toLowerCase().includes("nick"), "");
  L.done(50);
});

test("DB93 C5 — How it works: opens, closes by ✕, Esc and the dim layer; focus returns; no weekly question", async ({ page }) => {
  test.setTimeout(400_000);
  const L = new Ledger("c5");
  const vp = { width: 1440, height: 900 };
  await openDash(page, vp, { __SA_FOUNDING_STATS: STATS["6"] });
  const state = () => page.evaluate(() => {
    const p = document.querySelector<HTMLElement>('[data-d93="panel"]');
    const b = p?.getBoundingClientRect();
    const a = document.activeElement as HTMLElement | null;
    return { open: !!p?.classList.contains("on"), w: b?.width ?? 0, right: b ? window.innerWidth - b.right : -1, focus: a?.dataset.d93 ?? a?.tagName ?? "", inPanel: !!(p && a && p.contains(a)), text: p?.innerText ?? "" };
  });
  for (const how of ["close", "esc", "dim"] as const) {
    await page.locator('[data-d93="how"]:visible').first().click();
    await page.waitForTimeout(450);
    const o = await state();
    L.check("C5", `${how}: the panel opens, 440px at the right, focus inside it`, o.open && Math.abs(o.w - 440) <= 1 && Math.abs(o.right - 16) <= 1 && o.inPanel, JSON.stringify({ open: o.open, w: o.w, right: o.right, focus: o.focus }));
    if (how === "close") {
      const t = o.text.toLowerCase();
      L.check("C5", "the panel's sections and rows", ["the flock", "what counts", "the fair-play rules", "reporting a problem we can confirm", "an idea of yours that we build", "up to 3 a week count.", "your level never goes down.", "you give feedback from give feedback in the sidebar."].every((x) => t.includes(x)), "");
      L.check("C5", "no weekly-question rows", !t.includes("question of the week") && !t.includes("weekly question"), "");
      L.check("C5", "the five tiers with their minimums", ["1+ contributions", "3+ contributions", "8+ contributions", "15+ contributions", "25+ contributions"].every((x) => t.includes(x)), "");
      await page.locator('[data-d93="close"]').click();
    } else if (how === "esc") await page.keyboard.press("Escape");
    else await page.mouse.click(40, vp.height / 2);
    await page.waitForTimeout(450);
    const c = await state();
    L.check("C5", `${how}: the panel closes and focus returns to How it works`, !c.open && c.focus === "how", JSON.stringify({ open: c.open, focus: c.focus }));
  }
  L.done(9);
});

test("DB93 C6 — the laptop rows: founding 290, task at least 254, the bottoms in line", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("c6");
  for (const vp of [{ width: 1440, height: 900 }, { width: 1366, height: 768 }, { width: 1512, height: 900 }]) {
    await openDash(page, vp, { __SA_FOUNDING_STATS: STATS["6"] });
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
