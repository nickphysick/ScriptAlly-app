/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v116 — the hover detail, measured on the rendered page (ref design-refs/dashboard-v116/).
 *
 * A1 the chart's week callout · B1 the stepped stack's geometry and cap · B2 the on-screen rule · C1/C2 the
 * Closed slices, key rows and mini query cards · D1 the Agents stacks · E1 the task card's frame · F1 the
 * founding card's tilt and header swap · K1 the keyboard. Each lock's named break is `DB116_MUTATE=<name>`
 * (db116Lib's CSS_MUTATIONS, or a code break recorded in the report).
 */
import { expect, test, type Page } from "@playwright/test";
import { Ledger, openDash, tag, type VP } from "./db116Lib";

test.describe.configure({ mode: "serial" });

const VP1440: VP = { width: 1440, height: 900 };

/* ── A1 ── */

interface Read { week: string; x: number; count: number; delta: string; kind: string; flip: boolean; left: number; right: number; frameR: number; bars: { g: string; n: number; w: number }[]; rows: { g: string; n: number }[] }
async function readCallout(page: Page): Promise<Read | null> {
  return page.evaluate(() => {
    const c = document.querySelector<HTMLElement>('[data-d116="callout"]');
    if (!c) return null;
    const plot = document.querySelector('[data-probe="plot"]')!.getBoundingClientRect();
    const frame = c.closest(".os-frame")!.getBoundingClientRect();
    const r = c.getBoundingClientRect();
    return {
      week: c.dataset.week ?? "", x: plot.left + Number(c.dataset.x), count: Number(c.querySelector('[data-d116="count"]')!.textContent!.replace(/,/g, "")),
      delta: c.querySelector('[data-d116="delta"]')!.textContent ?? "", kind: (c.querySelector('[data-d116="delta"]') as HTMLElement).dataset.kind ?? "",
      flip: c.dataset.flip === "1", left: r.left, right: r.right, frameR: frame.right,
      bars: [...c.querySelectorAll<HTMLElement>(".d116-wks i")].map((i) => ({ g: i.dataset.g ?? "", n: Number(i.dataset.n), w: i.getBoundingClientRect().width })),
      rows: [...c.querySelectorAll<HTMLElement>(".d116-wkl li")].map((li) => ({ g: li.dataset.g ?? "", n: Number(li.querySelector("b")!.textContent) })),
    };
  });
}

test("DB116 A1 — the chart's week callout", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("A1");
  await openDash(page, VP1440);
  const box = (await page.locator('[data-probe="plot"]').first().boundingBox())!;
  L.check("A1", "population: the plot", !!box && box.width > 200, JSON.stringify(box));
  /* ⚠️ NO CALLOUT AT REST */
  L.check("A1", "no callout at rest", (await page.locator('[data-d116="callout"]').count()) === 0, "");
  /* the old week popup is gone: sweeping the weeks never opens the dash popup */
  const seen = new Map<string, Read>();
  let popupOnWeek = 0;
  for (let x = box.x + 4; x < box.x + box.width - 2; x += 6) {
    await page.mouse.move(x, box.y + 6);
    const r = await readCallout(page);
    const pop = await page.evaluate(() => document.querySelector('[data-probe="dash-popup"].on') !== null);
    if (!r) continue;
    if (pop) popupOnWeek += 1;
    if (!seen.has(r.week)) seen.set(r.week, r);
  }
  const weeks = [...seen.values()].sort((a, b) => a.x - b.x);
  L.check("A1", "population: weeks swept", weeks.length >= 4, `${weeks.length} weeks: ${weeks.map((w) => w.week).join(", ")}`);
  L.check("A1", "the week popup never shows with the callout", popupOnWeek === 0, `${popupOnWeek} readings`);
  const kinds = new Set<string>();
  for (let i = 0; i < weeks.length; i++) {
    const w = weeks[i];
    kinds.add(w.kind);
    const prev = i ? weeks[i - 1].count : w.count;
    const d = w.count - prev;
    const want = d > 0 ? `▲ ${d} on last week` : d < 0 ? `▼ ${-d} on last week` : "no change";
    L.check("A1", `${w.week} delta`, w.delta === want, `${w.delta} vs ${want} (${prev}→${w.count})`);
    const sum = w.rows.reduce((s, r) => s + r.n, 0);
    L.check("A1", `${w.week} rows sum to the count`, sum === w.count && w.rows.slice(0, 3).map((r) => r.g).join() === "queried,partial,full", `${JSON.stringify(w.rows)} vs ${w.count}`);
    const bw = w.bars.reduce((s, b) => s + b.w, 0), bn = w.bars.reduce((s, b) => s + b.n, 0);
    const off = w.bars.map((b) => Math.abs(b.w - (bw * b.n) / bn));
    L.check("A1", `${w.week} bars proportional ±1px`, bn === w.count && off.every((o) => o <= 1), `${JSON.stringify(w.bars)} off ${off.map((o) => o.toFixed(2))}`);
    /* placement: 10px from the guide, on the right unless that crosses the card's right edge */
    const side = w.flip ? Math.abs(w.right - (w.x - 10)) : Math.abs(w.left - (w.x + 10));
    L.check("A1", `${w.week} 10px from the guide`, side <= 1, `${w.flip ? "left" : "right"} gap off by ${side.toFixed(1)}`);
    L.check("A1", `${w.week} inside the card`, w.right <= w.frameR + 0.5 && (w.flip || w.x + 10 + 208 <= w.frameR - 8 + 0.5), `right ${w.right.toFixed(1)} frame ${w.frameR.toFixed(1)}`);
  }
  L.check("A1", "both sides exercised (the last week flips)", weeks.some((w) => w.flip) && weeks.some((w) => !w.flip), weeks.map((w) => `${w.week}:${w.flip ? "L" : "R"}`).join(" "));
  console.log(`  delta kinds seen on the account: ${[...kinds].join(", ")} (all three are held by the unit lock)`);
  /* the guide line is dashed and runs the plot's full height */
  const g = await page.evaluate(() => { const l = document.querySelector('[data-d116="guide"]'); const p = document.querySelector('[data-probe="plot"]')!.getBoundingClientRect(); const r = l?.getBoundingClientRect(); return r ? { top: r.top - p.top, h: r.height, ph: p.height, dash: l!.getAttribute("stroke-dasharray") } : null; });
  L.check("A1", "the guide runs the plot's height, dashed", !!g && Math.abs(g.top) <= 1 && Math.abs(g.h - g.ph) <= 1 && !!g.dash, JSON.stringify(g));
  /* ⚠️ PINS WIN: on a pin's glyph the event popup shows and the callout does not */
  const pin = page.locator(".os-acglyph").first();
  const pb = (await pin.boundingBox())!;
  L.check("A1", "population: a pin", !!pb, "");
  await page.mouse.move(pb.x + pb.width / 2, pb.y + pb.height / 2);
  await page.waitForTimeout(250);
  const won = await page.evaluate(() => ({ pop: !!document.querySelector('[data-probe="dash-popup"].on'), callout: !!document.querySelector('[data-d116="callout"]') }));
  L.check("A1", "a pin's popup wins over the callout", won.pop && !won.callout, JSON.stringify(won));
  L.done(20);
});

/* ── shared readers for the stacks ── */

/** A point on a slice's own stroke (its middle), in viewport pixels — hovering the circle's box centre would miss it. */
async function slicePoint(page: Page, card: string, seg: string): Promise<{ x: number; y: number } | null> {
  return page.evaluate(([card, seg]) => {
    const c = document.querySelector<SVGCircleElement>(`[data-d60="${card}"] [data-d116="slice"][data-seg="${seg}"]`);
    if (!c) return null;
    const len = Number(c.getAttribute("stroke-dasharray")!.split(" ")[0]), at = -Number(c.getAttribute("stroke-dashoffset"));
    /* the element's own rotate(-90) is in its CTM: the angle here is from 3 o'clock */
    const a = (((at + len / 2) * 3.6) * Math.PI) / 180;
    const m = c.getScreenCTM()!;
    const pt = new DOMPoint(50 + 42 * Math.cos(a), 50 + 42 * Math.sin(a)).matrixTransform(m);
    return { x: pt.x, y: pt.y };
  }, [card, seg] as const);
}

interface StackRead { kind: string; total: number; shown: number; more: number; moreText: string; moreBox: { x: number; y: number } | null; box: { left: number; top: number; right: number; bottom: number } | null;
  cards: { i: number; tx: number; ty: number; rot: number; op: number; id: string; outcome: string; status: string; name: string; agency: string; pill: string; ms: string; queried: string; end: string; bust: boolean; headW: number; cardW: number; headBg: string; headInk: string; none: string }[] }
async function readStack(page: Page): Promise<StackRead | null> {
  return page.evaluate(() => {
    const st = document.querySelector<HTMLElement>('[data-d116="stack"]');
    if (!st) return null;
    const t = (el: Element | null) => (el?.textContent ?? "").trim();
    const rcs = [...st.querySelectorAll<HTMLElement>(":scope > .d116-rc")];
    let L = Infinity, T = Infinity, R = -Infinity, B = -Infinity;
    const grow = (r: DOMRect) => { L = Math.min(L, r.left); T = Math.min(T, r.top); R = Math.max(R, r.right); B = Math.max(B, r.bottom); };
    const cards = rcs.map((rc) => {
      const m = new DOMMatrix(getComputedStyle(rc).transform);
      grow(rc.getBoundingClientRect());
      const card = rc.firstElementChild as HTMLElement;
      const head = card.querySelector<HTMLElement>('[data-d116="agent-head"]');
      return {
        i: Number(rc.dataset.i), tx: m.e, ty: m.f, rot: (Math.atan2(m.b, m.a) * 180) / Math.PI, op: Number(getComputedStyle(rc).opacity),
        id: card.dataset.id ?? "", outcome: card.dataset.outcome ?? "", status: card.dataset.status ?? "",
        name: t(card.querySelector('[data-d116="name"]')), agency: t(card.querySelector('[data-d116="agency"]')), pill: t(card.querySelector('[data-d116="pill"]')),
        ms: t(card.querySelector('[data-d116="ms"]')), queried: t(card.querySelector('[data-d116="queried"]')), end: t(card.querySelector('[data-d116="end"]')),
        bust: !!card.querySelector(".d116-bust svg path"), headW: head ? head.offsetWidth : 0, cardW: card.offsetWidth,
        headBg: head ? getComputedStyle(head).backgroundColor : "", headInk: head ? getComputedStyle(head).color : "",
        none: card.matches('[data-d116="none"]') ? t(card) : "",
      };
    });
    const more = st.querySelector<HTMLElement>('[data-d116="more"]');
    if (more) grow(more.getBoundingClientRect());
    const mr = more?.getBoundingClientRect();
    return { kind: st.dataset.kind ?? "", total: Number(st.dataset.total), shown: Number(st.dataset.shown), more: Number(st.dataset.more), moreText: t(more),
      moreBox: mr ? { x: mr.left, y: mr.top } : null, box: cards.length ? { left: L, top: T, right: R, bottom: B } : null, cards };
  });
}

/** the rows of a key: their counts */
async function keyCounts(page: Page, card: string): Promise<Record<string, number>> {
  return page.evaluate((card) => Object.fromEntries([...document.querySelectorAll<HTMLElement>(`[data-d60="${card}"] [data-d116="key-row"]`)].map((li) => [li.dataset.key!, Number(li.querySelector("b")!.textContent)])), card);
}

const SETTLE = 750;
const MON: Record<string, number> = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
const dayOf = (s: string) => { const m = /(\d{1,2}) ([A-Z][a-z]{2})/.exec(s); return m ? MON[m[2]] * 31 + Number(m[1]) : null; };

/* ── C1 · C2 ── */

test("DB116 C1 · C2 — Closed: slices, key rows and the mini query cards", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("C");
  await openDash(page, VP1440);
  const counts = await keyCounts(page, "closed-hoop");
  L.check("C1", "population: the four key rows", Object.keys(counts).join() === "quiet,letter,partial,full", JSON.stringify(counts));
  const title = (await page.locator('[data-d58="header"] h1, [data-d58="header"] h2').first().textContent().catch(() => ""))?.trim() ?? "";
  let empties = 0, filled = 0, swells = 0;
  const restW = await page.evaluate(() => Number(getComputedStyle(document.querySelector('[data-d60="closed-hoop"] [data-d60="arc"]')!).strokeWidth.replace("px", "")));
  for (const via of ["row", "slice"] as const) {
    for (const k of Object.keys(counts)) {
      await page.mouse.move(2, 2); await page.waitForTimeout(250);
      if (via === "row") {
        const b = (await page.locator(`[data-d60="closed-hoop"] [data-d116="key-row"][data-key="${k}"]`).boundingBox())!;
        await page.mouse.move(b.x + 20, b.y + b.height / 2);
      } else {
        const p = await slicePoint(page, "closed-hoop", k);
        if (!p) { L.check("C1", `slice ${k}`, counts[k] === 0, `no slice for a count of ${counts[k]}`); continue; }
        await page.mouse.move(p.x, p.y);
      }
      await page.waitForTimeout(SETTLE);
      const s = await readStack(page);
      const where = `${via} ${k}`;
      if (!s) { L.check("C1", where, false, "no stack"); continue; }
      L.check("C1", `${where}: one category`, s.kind === "closed", s.kind);
      L.check("C1", `${where}: every card fully shown`, s.cards.every((c) => c.op > 0.99), s.cards.map((c) => c.op.toFixed(2)).join(","));
      if (counts[k] === 0) {
        empties += 1;
        L.check("C1", `${where}: an empty category says None yet`, s.cards.length === 1 && /^None yet/.test(s.cards[0].none), JSON.stringify(s.cards.map((c) => c.none)));
        continue;
      }
      filled += 1;
      L.check("C1", `${where}: cards + more = the row's count`, s.shown + s.more === counts[k] && s.cards.length === s.shown && s.shown <= 5, `${s.shown}+${s.more} vs ${counts[k]}`);
      const want = k === "quiet" ? "No reply" : "Passed";
      L.check("C1", `${where}: only that outcome`, s.cards.every((c) => c.pill === want && c.outcome === (k === "quiet" ? "quiet" : "passed")), s.cards.map((c) => c.pill).join(","));
      if (k !== "quiet") {
        const ds = s.cards.map((c) => dayOf(c.end));
        L.check("C1", `${where}: newest closed first`, ds.every((d, i) => d !== null && (i === 0 || d <= ds[i - 1]!)), s.cards.map((c) => c.end).join(" · "));
      }
      /* C2: what each card carries; never initials */
      for (const c of s.cards) {
        L.check("C2", `${where} ${c.name}: bust, name, agency, pill, manuscript, dates`,
          c.bust && c.name.length > 1 && c.pill.length > 0 && c.ms.length > 0 && (!title || c.ms === title) && /^Queried \d{1,2} [A-Z][a-z]{2}$/.test(c.queried) && (k === "quiet" ? /^\d+ wks$/.test(c.end) : /^Passed \d{1,2} [A-Z][a-z]{2}$/.test(c.end)),
          JSON.stringify({ bust: c.bust, name: c.name, agency: c.agency, pill: c.pill, ms: c.ms, title, queried: c.queried, end: c.end }));
      }
      const initials = await page.evaluate(() => [...document.querySelectorAll('[data-d116="stack"] *')].filter((e) => !e.children.length && /^[A-Z]{2,3}$/.test((e.textContent ?? "").trim())).map((e) => e.textContent));
      L.check("C2", `${where}: no initials anywhere`, initials.length === 0, JSON.stringify(initials));
      if (via === "slice") {
        const w = await page.evaluate((k) => [...document.querySelectorAll<SVGElement>('[data-d60="closed-hoop"] [data-d60="arc"]')].map((a) => ({ k: a.dataset.seg, w: Number(getComputedStyle(a).strokeWidth.replace("px", "")) })), k);
        const me = w.find((x) => x.k === k)!, others = w.filter((x) => x.k !== k);
        swells += 1;
        L.check("C1", `${where}: the slice swells ≥1.4×, the others stay`, me.w >= 1.4 * restW - 0.01 && others.every((o) => Math.abs(o.w - restW) < 0.01), `${JSON.stringify(w)} rest ${restW}`);
      }
      if (s.more > 0) L.check("C1", `${where}: +N more`, s.moreText === `+${s.more} more`, s.moreText);
    }
  }
  L.check("C1", "population: filled, empty and swelling categories all exercised", filled >= 4 && empties >= 1 && swells >= 2, `filled ${filled} · empty ${empties} · swells ${swells}`);
  L.done(30);
});

/* ── D1 · B1 · B2 ── */

const HEAD: Record<string, { bg: string; ink: string }> = {
  querying: { bg: "rgb(42, 58, 82)", ink: "rgb(255, 255, 255)" },
  closed: { bg: "rgb(169, 163, 155)", ink: "rgb(255, 255, 255)" },
  none: { bg: "rgb(223, 230, 238)", ink: "rgb(42, 58, 82)" },
};
async function hoverAgents(page: Page, via: "row" | "slice", k: string, dx = 20): Promise<{ x: number; y: number } | null> {
  await page.mouse.move(2, 2); await page.waitForTimeout(250);
  let p: { x: number; y: number } | null;
  if (via === "row") { const b = (await page.locator(`[data-d60="agents-hoop"] [data-d116="key-row"][data-key="${k}"]`).boundingBox())!; p = { x: b.x + dx, y: b.y + b.height / 2 }; }
  else p = await slicePoint(page, "agents-hoop", k);
  if (!p) return null;
  await page.mouse.move(p.x, p.y);
  await page.waitForTimeout(SETTLE);
  return p;
}
/** the stack's own geometry: each card's step, the pill's place, read from layout (never a rotated rect) */
async function stackGeo(page: Page) {
  return page.evaluate(() => {
    const st = document.querySelector<HTMLElement>('[data-d116="stack"]');
    if (!st) return null;
    const rcs = [...st.querySelectorAll<HTMLElement>(":scope > .d116-rc")];
    const steps = rcs.map((rc) => { const m = new DOMMatrix(getComputedStyle(rc).transform); return { x: m.e, y: m.f, h: rc.offsetHeight, z: Number(getComputedStyle(rc).zIndex) }; });
    const pill = st.querySelector<HTMLElement>('[data-d116="more"]');
    return { steps, pill: pill ? { top: pill.offsetTop, left: pill.offsetLeft } : null, origin: { x: st.getBoundingClientRect().left, y: st.getBoundingClientRect().top } };
  });
}

test("DB116 D1 · B1 — Agents: the stack per status, its header and its steps", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("D1-B1");
  await openDash(page, VP1440);
  const counts = await keyCounts(page, "agents-hoop");
  L.check("D1", "population: the three key rows", Object.keys(counts).join() === "querying,closed,none", JSON.stringify(counts));
  let deep = 0;
  for (const via of ["row", "slice"] as const) for (const k of Object.keys(counts)) {
    const p = await hoverAgents(page, via, k);
    const where = `${via} ${k}`;
    if (!p) { L.check("D1", where, counts[k] === 0, "no slice"); continue; }
    const s = await readStack(page);
    if (!s) { L.check("D1", where, false, "no stack"); continue; }
    L.check("D1", `${where}: that status only`, s.kind === "agents" && s.cards.every((c) => c.status === k), s.cards.map((c) => c.status).join(","));
    L.check("D1", `${where}: cards + more = the row's count, at most five`, s.shown + s.more === counts[k] && s.shown <= 5, `${s.shown}+${s.more} vs ${counts[k]}`);
    for (const c of s.cards) {
      L.check("D1", `${where} ${c.name}: the header is the status's colour`, c.headBg === HEAD[k].bg && c.headInk === HEAD[k].ink, `${c.headBg} / ${c.headInk}`);
      L.check("D1", `${where} ${c.name}: the header spans the card`, c.cardW > 0 && Math.abs(c.headW - c.cardW) <= 1, `${c.headW} of ${c.cardW}`);
      L.check("D1", `${where} ${c.name}: a bust, never initials`, c.bust && !/^[A-Z]{2,3}$/.test(c.name), c.name);
    }
    /* B1 · the steps */
    const g = (await stackGeo(page))!;
    const n = g.steps.length;
    g.steps.forEach((st, i) => L.check("B1", `${where} card ${i} at (14i, 38i)`, Math.abs(st.x - 14 * i) <= 1 && Math.abs(st.y - 38 * i) <= 1, `(${st.x.toFixed(1)}, ${st.y.toFixed(1)})`));
    L.check("B1", `${where}: later cards on top`, g.steps.every((st, i) => i === 0 || st.z > g.steps[i - 1].z), g.steps.map((st) => st.z).join(","));
    L.check("B1", `${where}: at most five cards`, n <= 5, `${n}`);
    if (g.pill) {
      deep += 1;
      const last = g.steps[n - 1];
      L.check("B1", `${where}: +N more 8px under the last card, on its left edge`, Math.abs(g.pill.top - (last.y + last.h + 8)) <= 1 && Math.abs(g.pill.left - last.x) <= 1, `pill ${g.pill.top},${g.pill.left} vs ${last.y + last.h + 8},${last.x}`);
    }
    /* D2 · it follows the pointer: anchored 18px right of and 14px above it (the on-screen rule may then shift it) */
    if (via === "row") {
      const at = () => page.evaluate(() => { const st = document.querySelector<HTMLElement>('[data-d116="stack"]')!; return { x: parseFloat(st.style.left), y: parseFloat(st.style.top) }; });
      const o = await at();
      L.check("D1", `${where}: anchored at the pointer (18, −14)`, Math.abs(o.x - (p.x + 18)) <= 1 && Math.abs(o.y - (p.y - 14)) <= 1, `anchor ${o.x},${o.y} · pointer ${p.x.toFixed(1)},${p.y.toFixed(1)}`);
      await page.mouse.move(p.x + 30, p.y); await page.waitForTimeout(120);
      const o2 = await at();
      L.check("D1", `${where}: re-placed on move`, Math.abs(o2.x - (p.x + 30 + 18)) <= 1, `${o2.x} vs ${p.x + 48}`);
    }
  }
  L.check("B1", "population: a stack with +N more", deep >= 2, `${deep}`);
  L.done(40);
});

test("DB116 B2 — the stack always stays on screen", async ({ page }) => {
  test.setTimeout(420_000);
  const L = new Ledger("B2");
  let tested = 0, reduced = 0;
  for (const vp of [{ width: 1440, height: 700 }, { width: 1280, height: 650 }, { width: 1100, height: 800 }, { width: 1280, height: 220 }] as VP[]) {
    await openDash(page, vp);
    const card = page.locator('[data-d60="agents-hoop"]').first();
    await card.scrollIntoViewIfNeeded();
    const counts = await keyCounts(page, "agents-hoop");
    const big = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
    L.check("B2", `${tag(vp)}: population, the key rows`, !!big, JSON.stringify(counts));
    if (!big) continue;
    const b = (await page.locator(`[data-d60="agents-hoop"] [data-d116="key-row"][data-key="${big}"]`).boundingBox())!;
    const cb = (await card.boundingBox())!;
    /* the pointer near the bottom-right of the hoop card: across the row, then at the card's corner */
    const pts = [{ x: b.x + b.width - 6, y: b.y + b.height / 2 }, { x: b.x + 10, y: b.y + b.height / 2 }, { x: Math.min(cb.x + cb.width - 8, b.x + b.width - 3), y: b.y + b.height * 0.7 }];
    for (const p of pts) {
      await page.mouse.move(2, 2); await page.waitForTimeout(200);
      await page.mouse.move(b.x + 20, b.y + b.height / 2); await page.waitForTimeout(150);
      await page.mouse.move(p.x, p.y); await page.waitForTimeout(SETTLE);
      const s = await readStack(page);
      if (!s?.box) { L.check("B2", `${tag(vp)} @${p.x.toFixed(0)},${p.y.toFixed(0)}`, false, "no stack"); continue; }
      tested += 1;
      const room = { l: s.box.left, t: s.box.top, r: vp.width - s.box.right, b: vp.height - s.box.bottom };
      /* the painted pixels, tilted corners included */
      L.check("B2", `${tag(vp)} @${p.x.toFixed(0)},${p.y.toFixed(0)}: inside with ≥12 to spare`, room.l >= 11.5 && room.t >= 11.5 && room.r >= 11.5 && room.b >= 11.5, JSON.stringify(Object.fromEntries(Object.entries(room).map(([k, v]) => [k, +v.toFixed(1)]))));
      L.check("B2", `${tag(vp)}: cards + more = the count`, s.shown + s.more === counts[big], `${s.shown}+${s.more} vs ${counts[big]}`);
      if (vp.height <= 220) {
        reduced += s.shown < Math.min(5, counts[big]) ? 1 : 0;
        L.check("B2", `${tag(vp)}: fewer than five when five cannot fit`, s.shown < 5 && s.moreText === `+${s.more} more`, `${s.shown} shown, ${s.moreText}`);
      }
    }
  }
  L.check("B2", "population: ≥3 positions at each size, and a reduced stack", tested >= 12 && reduced >= 1, `${tested} positions, ${reduced} reduced`);
  L.done(20);
});

/* ── K1 ── */

test("DB116 K1 — the keyboard reaches each slice and key row", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("K1");
  await openDash(page, VP1440);
  for (const card of ["closed-hoop", "agents-hoop"]) {
    const stops = await page.evaluate((card) => [...document.querySelectorAll<HTMLElement | SVGElement>(`[data-d60="${card}"] [data-d116="slice"], [data-d60="${card}"] [data-d116="key-row"]`)].map((e) => `${e.getAttribute("data-d116")}:${e.getAttribute("data-seg") ?? e.getAttribute("data-key")}`), card);
    L.check("K1", `${card}: population`, stops.length >= 4, stops.join(" "));
    /* Tab reaches every one, in order: start from the band's link and walk */
    await page.locator(`[data-d60="${card}"]`).first().focus().catch(() => {});
    await page.evaluate((card) => { const el = document.querySelector<HTMLElement>(`[data-d60="${card}"] [data-d116="slice"]`) as unknown as HTMLElement; el?.focus(); }, card);
    const reached: string[] = [];
    for (let i = 0; i < stops.length + 2; i++) {
      const at = await page.evaluate(() => { const e = document.activeElement; return e ? `${e.getAttribute("data-d116")}:${e.getAttribute("data-seg") ?? e.getAttribute("data-key")}` : ""; });
      if (stops.includes(at) && !reached.includes(at)) reached.push(at);
      await page.keyboard.press("Tab");
    }
    L.check("K1", `${card}: Tab reaches every slice and row`, stops.every((x) => reached.includes(x)), `reached ${reached.join(" ")}`);
    for (const stop of stops.slice(0, 3)) {
      const [kind, key] = stop.split(":");
      await page.evaluate(([card, kind, key]) => { const el = document.querySelector<HTMLElement>(`[data-d60="${card}"] [data-d116="${kind}"][${kind === "slice" ? "data-seg" : "data-key"}="${key}"]`); (el as HTMLElement).focus(); }, [card, kind, key] as const);
      await page.waitForTimeout(SETTLE);
      const focused = await readStack(page);
      const live = (await page.locator(`[data-d60="${card}"] [data-d116="live"]`).textContent())?.trim() ?? "";
      L.check("K1", `${card} ${stop}: focus shows the stack and the live region names it`, !!focused && focused.cards.length > 0 && focused.cards.every((c) => c.op > 0.99) && /^(No .* yet\.|\d+ (query|queries|agent|agents): .+\.)$/.test(live), `${live}`);
      if (focused && focused.cards[0]?.name) L.check("K1", `${card} ${stop}: the live region names the first card`, live.includes(focused.cards[0].name), live);
      await page.keyboard.press("Escape"); await page.waitForTimeout(SETTLE);
      const gone = await page.evaluate(() => document.querySelector('[data-d116="stack"]') === null);
      L.check("K1", `${card} ${stop}: Esc hides it`, gone, "");
      await page.keyboard.press("Enter"); await page.waitForTimeout(SETTLE);
      const back = await readStack(page);
      L.check("K1", `${card} ${stop}: Enter shows it again`, !!back && back.cards.length > 0, "");
      await page.keyboard.press("Enter"); await page.waitForTimeout(SETTLE);
      L.check("K1", `${card} ${stop}: Enter toggles it off`, await page.evaluate(() => document.querySelector('[data-d116="stack"]') === null), "");
    }
  }
  L.done(20);
});

void expect; void tag;
