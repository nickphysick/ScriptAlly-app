/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v118.1 — the DB118 locks, at 1440×900 and 1280×650. Named breaks: `DB118_MUTATE=<name>` (db118Lib).
 */
import { test, type Page } from "@playwright/test";
import { Ledger, MUT, openDash, slicePoint, stackPlacement, tag } from "./db118Lib";

test.describe.configure({ mode: "serial" });
test.setTimeout(480_000);
const VPS = [{ width: 1440, height: 900 }, { width: 1280, height: 650 }];

/** the pointer's own position for one hover: a key row at three points across it, or a slice at three points along it */
type Target = { card: "closed-hoop" | "agents-hoop"; type: "row" | "slice"; key: string; frac: number };

const rowPoint = (page: Page, card: string, key: string, frac: number) => page.evaluate(([c, k, f]) => {
  const row = document.querySelector<HTMLElement>(`[data-d60="${c}"] [data-d116="key-row"][data-key="${k}"]`);
  if (!row) return null;
  const r = row.getBoundingClientRect();
  return { x: r.left + 4 + (r.width - 8) * f, y: r.top + r.height / 2 };
}, [card, key, frac] as const);

/** the biggest non-zero segment of a hoop, and its key rows that have any */
const segsOf = (page: Page, card: string) => page.evaluate((c) => [...document.querySelectorAll<SVGCircleElement>(`[data-d60="${c}"] [data-d116="slice"]`)]
  .map((h) => ({ key: h.dataset.seg ?? "", len: parseFloat(String(h.getAttribute("stroke-dasharray")).split(/[\s,]+/)[0]) }))
  .sort((a, b) => b.len - a.len), card);

test("DB118-A1 · every stack opens at the pointer", async ({ page }) => {
  const L = new Ledger("A1");
  let placements = 0;
  for (const vp of VPS) {
    await openDash(page, vp);
    const where = tag(vp);
    for (const card of ["closed-hoop", "agents-hoop"] as const) {
      const segs = await segsOf(page, card);
      L.check("A1", `${where} ${card}: population, slices`, segs.length > 0, JSON.stringify(segs));
      if (!segs.length) continue;
      const big = segs[0].key;
      const targets: Target[] = [
        ...[0.15, 0.5, 0.85].map((frac, i) => ({ card, type: "row" as const, key: segs[i % segs.length].key, frac })),
        /* along the biggest slice, the last at its far edge */
        ...[0.2, 0.5, 0.97].map((frac) => ({ card, type: "slice" as const, key: big, frac })),
      ];
      for (const t of targets) {
        await page.mouse.move(2, 2);
        await page.waitForTimeout(200);
        const p = t.type === "row" ? await rowPoint(page, t.card, t.key, t.frac) : await slicePoint(page, t.card, t.key, t.frac);
        const label = `${where} ${t.card} ${t.type} ${t.key} @${t.frac}`;
        if (!p) { L.check("A1", `${label}: population`, false, "no target"); continue; }
        if (t.type === "slice") L.check("A1", `${label}: the slice holds the pointer there`, (p as unknown as { hitIsSlice: boolean }).hitIsSlice, JSON.stringify(p));
        /* arrive from a step away, as a hand does, then settle */
        await page.mouse.move(p.x - 6, p.y + 3);
        await page.mouse.move(p.x, p.y, { steps: 3 });
        await page.waitForTimeout(450);
        const s = await stackPlacement(page);
        if (!s) { L.check("A1", `${label}: a stack shows`, false, "none"); continue; }
        placements++;
        L.check("A1", `${label}: anchored 18 right of and 14 above the pointer`, Math.abs(s.ax - (p.x + 18)) <= 2 && Math.abs(s.ay - (p.y - 14)) <= 2, `anchor ${s.ax},${s.ay} · pointer ${p.x.toFixed(1)},${p.y.toFixed(1)}`);
        /* the shift is exactly the overflow of the unshifted stack past the 12px margin */
        const raw = { l: s.u.l - s.dx, t: s.u.t - s.dy, r: s.u.r - s.dx, b: s.u.b - s.dy };
        const wx = raw.r > s.vw - 12 ? -(raw.r - (s.vw - 12)) : raw.l < 12 ? 12 - raw.l : 0;
        const wy = raw.b > s.vh - 12 ? -(raw.b - (s.vh - 12)) : raw.t < 12 ? 12 - raw.t : 0;
        L.check("A1", `${label}: shifted only by the on-screen rule`, Math.abs(s.dx - wx) <= 1.5 && Math.abs(s.dy - wy) <= 1.5, `shift ${s.dx},${s.dy} · overflow ${wx.toFixed(1)},${wy.toFixed(1)}`);
        L.check("A1", `${label}: inside the window, 12 to spare`, s.u.l >= 11.5 && s.u.t >= 11.5 && s.u.r <= s.vw - 11.5 && s.u.b <= s.vh - 11.5, JSON.stringify(s.u));
        /* a move inside the target re-places it */
        await page.mouse.move(p.x + (t.type === "row" ? 10 : 0), p.y + (t.type === "row" ? 0 : 0.5), { steps: 2 });
        await page.waitForTimeout(150);
        const s2 = await stackPlacement(page);
        if (t.type === "row") L.check("A1", `${label}: re-placed on a move`, !!s2 && Math.abs(s2.ax - (p.x + 28)) <= 2, `${s2?.ax} vs ${(p.x + 28).toFixed(1)}`);
      }
      /* slice to slice and row to row swap in place: no frame without a stack */
      if (segs.length > 1) {
        const a = await rowPoint(page, card, segs[0].key, 0.5), b = await rowPoint(page, card, segs[1].key, 0.5);
        if (a && b) {
          await page.mouse.move(a.x, a.y); await page.waitForTimeout(400);
          await page.evaluate(() => { const w = window as unknown as { __gap: number; __obs: MutationObserver }; w.__gap = 0; const tick = () => { if (!document.querySelector('[data-d116="stack"].is-on')) w.__gap++; if ((window as unknown as { __run: boolean }).__run) requestAnimationFrame(tick); }; (window as unknown as { __run: boolean }).__run = true; requestAnimationFrame(tick); });
          await page.mouse.move(b.x, b.y, { steps: 6 });
          await page.waitForTimeout(400);
          const gap = await page.evaluate(() => { (window as unknown as { __run: boolean }).__run = false; return (window as unknown as { __gap: number }).__gap; });
          L.check("A1", `${where} ${card}: row to row swaps without a gap`, gap === 0, `${gap} frames without a stack`);
        }
      }
    }
  }
  L.check("A1", "twelve or more placements measured", placements >= 12, String(placements));
  L.done(40);
});

/** a hoop's key rows: key, label, count (from the row's own accessible name) and cursor */
const hoopRows = (page: Page, card: string) => page.evaluate((c) => [...document.querySelectorAll<HTMLElement>(`[data-d60="${c}"] [data-d116="key-row"]`)].map((r) => {
  const m = (r.getAttribute("aria-label") ?? "").match(/^(.*): (\d+)$/);
  return { key: r.dataset.key ?? "", label: m?.[1] ?? "", n: Number(m?.[2] ?? NaN), cursor: getComputedStyle(r).cursor };
}), card);

/** what the page arrived at: the address, the scroll, the Query Centre's ids chip and its rows, or the Contact list's */
const arrival = (page: Page) => page.evaluate(() => {
  const vis = (e: Element) => (e as HTMLElement).getBoundingClientRect().height > 0;
  const port = document.getElementById("app-stage-scroll");
  const qids = new Set([...document.querySelectorAll<HTMLElement>("[data-qid]")].filter(vis).map((e) => e.dataset.qid));
  const chips = [...document.querySelectorAll<HTMLElement>("button, span, li, div")].filter((e) => vis(e) && e.children.length <= 2 && / · \d+$/.test((e.textContent ?? "").trim())).map((e) => (e.textContent ?? "").trim()).slice(0, 8);
  const rows = new Set([...document.querySelectorAll<HTMLElement>('[data-cl24="row"], [data-cl24="card"]')].filter(vis).map((e) => e.dataset.id)).size;
  const applied = (document.body.innerText.match(/\b(Not queried|Queried|Closed|Signed|Offer)\b/g) ?? []).length;
  const pressed = [...document.querySelectorAll<HTMLElement>('[data-cl251="cell"][aria-pressed="true"]')].filter(vis).map((e) => e.dataset.k);
  return { path: location.pathname, search: location.search, top: port ? port.scrollTop : null, qids: [...qids], chips, rows, applied, pressed };
});

test("DB118-B1 · slices and rows click through to the filtered list", async ({ page }) => {
  const L = new Ledger("B1");
  let zeroSeen = 0;
  const listed: Record<string, number> = {};
  let agentsTotal = Infinity, hoopLive = 0;
  const vp = { width: 1440, height: 900 };
  for (const card of ["closed-hoop", "agents-hoop"] as const) {
    await openDash(page, vp);
    const rows = await hoopRows(page, card);
    L.check("B1", `${card}: population, the key rows`, rows.length >= 3 && rows.every((r) => Number.isFinite(r.n)), JSON.stringify(rows));
    L.check("B1", `${card}: a row with some`, rows.some((r) => r.n > 0), JSON.stringify(rows.map((r) => r.n)));
    if (rows.some((r) => r.n === 0)) zeroSeen++;
    if (card === "agents-hoop") { agentsTotal = rows.reduce((t, r) => t + r.n, 0); hoopLive = rows.filter((r) => r.key !== "none").reduce((t, r) => t + r.n, 0); }
    for (const r of rows) {
      const label = `${card} row ${r.key} (${r.n})`;
      L.check("B1", `${label}: the cursor says whether it opens`, r.cursor === (r.n > 0 ? "pointer" : "default"), r.cursor);
      for (const how of (r.n > 0 ? ["click", "enter"] : ["click"]) as ("click" | "enter")[]) {
        await openDash(page, vp);
        if (MUT === "B1-dead") await page.addStyleTag({ content: `[data-d116="key-row"], .d116-hit { pointer-events: none !important; }` });
        const row = page.locator(`[data-d60="${card}"] [data-d116="key-row"][data-key="${r.key}"]`).first();
        if (how === "click") await row.click({ timeout: 5000 }).catch(() => {});
        else { await row.focus(); await page.keyboard.press("Enter"); }
        await page.waitForTimeout(r.n > 0 ? 3000 : 800);
        const a = await arrival(page);
        if (r.n === 0) { L.check("B1", `${label} ${how}: a 0 row does nothing`, a.path === "/dashboard", a.path + a.search); continue; }
        if (card === "closed-hoop") {
          const ids = decodeURIComponent((a.search.match(/[?&]ids=([^&]*)/) ?? [])[1] ?? "").split(",").filter(Boolean);
          const from = decodeURIComponent((a.search.match(/[?&]from=([^&]*)/) ?? [])[1] ?? "");
          L.check("B1", `${label} ${how}: opens the Query Centre on exactly the slice's queries`, a.path === "/queries" && ids.length === r.n, `${a.path} · ${ids.length} ids`);
          L.check("B1", `${label} ${how}: the arrival says what the list is`, from === r.label && a.chips.includes(`${r.label} · ${r.n}`), JSON.stringify({ from, chips: a.chips }));
          L.check("B1", `${label} ${how}: every query on show is one of them`, a.qids.length > 0 && a.qids.every((q) => ids.includes(q as string)), `${a.qids.length} on show`);
        } else {
          L.check("B1", `${label} ${how}: opens the Contact list`, a.path === "/agents" && !/status=/.test(a.search), a.path + a.search);
          /* ⚠️ "Not yet queried" is the same fact on both pages and must match exactly. Querying and Closed are not: the hoop
             files an agent by their LATEST query on the book (agentQueryStates), the Contact list by whether ANY is still
             live (contactStanding), so an agent with an older live query and a newer closed one is "closed" here and
             "querying" there. The pack keeps both counting rules; the lock holds what does hold — the two together. */
          if (r.key === "none") L.check("B1", `${label} ${how}: the list holds the hoop's number`, a.rows === r.n, `${a.rows} rows vs ${r.n}`);
          else { listed[r.key] = a.rows; L.check("B1", `${label} ${how}: the list is filtered`, a.rows > 0 && a.rows < agentsTotal, `${a.rows} rows`); }
          L.check("B1", `${label} ${how}: shown as applied — its At a glance card is pressed`, JSON.stringify(a.pressed) === JSON.stringify([r.key]), JSON.stringify(a.pressed));
          if (how === "click") {
            /* clearable: pressing the card again lets the whole list back */
            await page.locator(`[data-cl251="cell"][data-k="${r.key}"]`).first().click({ timeout: 5000 }).catch(() => {});
            await page.waitForTimeout(800);
            const c2 = await arrival(page);
            L.check("B1", `${label}: pressing the card again clears it`, c2.pressed.length === 0 && c2.rows === agentsTotal, `${c2.rows} rows, pressed ${JSON.stringify(c2.pressed)}`);
          }
        }
        L.check("B1", `${label} ${how}: arrives at the top`, a.top === 0, String(a.top));
        if (how === "click") {
          await page.goBack();
          await page.waitForTimeout(1500);
          L.check("B1", `${label}: Back returns to the dashboard`, (await page.evaluate(() => location.pathname)) === "/dashboard", "");
        }
      }
    }
    /* a slice opens the same as its row */
    const sl = await slicePoint(page, card, (await hoopRows(page, card)).find((r) => r.n > 0)?.key ?? "", 0.5);
    if (sl) {
      await openDash(page, vp);
      const p2 = await slicePoint(page, card, (await hoopRows(page, card)).find((r) => r.n > 0)!.key, 0.5);
      await page.mouse.click(p2!.x, p2!.y);
      await page.waitForTimeout(3000);
      const a = await arrival(page);
      L.check("B1", `${card}: a slice click opens its list`, a.path === (card === "closed-hoop" ? "/queries" : "/agents"), a.path + a.search);
    }
  }
  L.check("B1", "a 0 row was exercised (inert)", zeroSeen > 0, String(zeroSeen));
  L.check("B1", "Contact list: querying + closed = the hoop's querying + closed", (listed.querying ?? NaN) + (listed.closed ?? NaN) === hoopLive, `${JSON.stringify(listed)} vs ${hoopLive}`);
  console.log("SPLIT", JSON.stringify({ listed, hoopLive }));
  /* the stack's hint */
  await openDash(page, vp);
  const busy = (await hoopRows(page, "closed-hoop")).sort((a, b) => b.n - a.n)[0];
  const p = await page.evaluate((k) => { const r = document.querySelector<HTMLElement>(`[data-d60="closed-hoop"] [data-d116="key-row"][data-key="${k}"]`)!.getBoundingClientRect(); return { x: r.left + 10, y: r.top + r.height / 2 }; }, busy.key);
  await page.mouse.move(p.x, p.y, { steps: 3 });
  await page.waitForTimeout(500);
  const more = await page.evaluate(() => document.querySelector('[data-d116="more"]')?.textContent ?? null);
  L.check("B1", `the "+N more" pill says a click shows them all`, busy.n <= 5 ? more === null : !!more && /^\+\d+ more · click to see all$/.test(more), `${busy.n} · ${more}`);
  L.done(30);
});

/** the founding card's rotation and whether its header shows the contributions swap */
const tilt = (page: Page) => page.evaluate(() => {
  const c = document.querySelector<HTMLElement>(".d105-fw.d116-tilt");
  const swb = document.querySelector<HTMLElement>('[data-d105="swap"]');
  return c ? { rotate: getComputedStyle(c).rotate, swap: swb ? Number(getComputedStyle(swb).opacity) : null, inCard: c.contains(document.activeElement) } : null;
});

test("DB118-C1 · the founding card keeps its tilt", async ({ page }) => {
  const L = new Ledger("C1");
  for (const vp of [{ width: 1440, height: 900 }, { width: 1280, height: 800 }]) {
    const where = tag(vp);
    /* mouse: open How it works, close it three ways, move away */
    for (const close of ["close", "dim", "gotit"] as const) {
      await openDash(page, vp);
      L.check("C1", `${where} ${close}: population, the card`, !!(await tilt(page)), "");
      await page.locator('[data-d105="info"]').first().click();
      await page.waitForTimeout(500);
      const open = await page.locator('[data-d105h="modal"].on').count();
      L.check("C1", `${where} ${close}: How it works opened`, open > 0, String(open));
      if (close === "close") await page.locator('[data-d105h="close"]').first().click();
      else if (close === "dim") await page.mouse.click(8, vp.height - 8);
      else {
        for (let i = 0; i < 8; i++) { const n = page.locator('[data-d105h="next"]:visible').first(); if (!(await n.count())) break; await n.click({ timeout: 2000 }).catch(() => {}); await page.waitForTimeout(150); if (!(await page.locator('[data-d105h="modal"].on').count())) break; }
      }
      await page.waitForTimeout(400);
      await page.mouse.move(4, 4);
      await page.waitForTimeout(500);
      const t = await tilt(page);
      L.check("C1", `${where} ${close}: closed with the mouse, the card tilts back to −1.8°`, (await page.locator('[data-d105h="modal"].on').count()) === 0 && t?.rotate === "-1.8deg", JSON.stringify(t));
      L.check("C1", `${where} ${close}: the header shows the ID again`, t?.swap === 0, JSON.stringify(t));
    }
    /* keyboard: open with Enter, close with Esc — straight while focus is inside, tilted once Tab takes it out */
    await openDash(page, vp);
    await page.keyboard.press("Shift");
    await page.locator('[data-d105="info"]').first().focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    const k1 = await tilt(page);
    L.check("C1", `${where} keyboard: straight while the ⓘ has focus`, k1?.rotate === "0deg" && k1.inCard, JSON.stringify(k1));
    L.check("C1", `${where} keyboard: the swap shows while straight`, k1?.swap === 1, JSON.stringify(k1));
    for (let i = 0; i < 12 && (await tilt(page))?.inCard; i++) { await page.keyboard.press("Tab"); await page.waitForTimeout(80); }
    await page.waitForTimeout(400);
    const k2 = await tilt(page);
    L.check("C1", `${where} keyboard: −1.8° once Tab takes focus out`, k2?.rotate === "-1.8deg" && !k2.inCard, JSON.stringify(k2));
    /* hover still straightens */
    const box = await page.locator(".d105-fw.d116-tilt").first().boundingBox();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.waitForTimeout(500);
    L.check("C1", `${where} hover: straight`, (await tilt(page))?.rotate === "0deg", JSON.stringify(await tilt(page)));
  }
  L.done(24);
});

test("DB118-D1 · 'Your move' in burgundy, and the step chips", async ({ page }) => {
  const L = new Ledger("D1");
  await openDash(page, { width: 1440, height: 900 });
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  let sends = 0, withSteps = 0, withPast = 0;
  const seen = new Set<string>();
  for (let i = 0; i < 14; i++) {
    const r = await page.evaluate(() => {
      const card = [...document.querySelectorAll<HTMLElement>('[data-d71="task"][data-key]')].find((e) => e.getBoundingClientRect().height > 0);
      if (!card) return null;
      const av = card.querySelector<HTMLElement>(".d71-av");
      const band = card.querySelector<HTMLElement>('[data-d71="band"]');
      const btn = card.querySelector<HTMLElement>('[data-d71="next"]');
      const segs = [...card.querySelectorAll<HTMLElement>('[data-d71="segment"]')];
      const past = segs.find((s) => s.classList.contains("is-past"));
      const steps = [...card.querySelectorAll<HTMLElement>('[data-d71="step-done"], [data-d71="step-todo"]')].map((s) => ({ done: s.dataset.d71 === "step-done", label: (s.firstChild?.textContent ?? "").trim(), date: s.querySelector("small")?.textContent ?? "" }));
      const cs = (e: HTMLElement | null | undefined) => (e ? getComputedStyle(e) : null);
      return {
        key: card.dataset.key ?? "", send: !!av?.classList.contains("d71-av--send"),
        band: cs(band)?.backgroundColor, title: band?.querySelector('[data-d71="band-title"]')?.textContent, av: cs(av)?.backgroundColor, pager: cs(btn)?.backgroundColor,
        past: past ? { bg: cs(past)!.backgroundColor, op: cs(past)!.opacity } : null, steps,
      };
    });
    if (!r || seen.has(r.key)) break;
    seen.add(r.key);
    if (r.send) {
      sends++;
      L.check("D1", `${r.key}: the band is burgundy, the title white "Your move"`, r.band === "rgb(110, 52, 38)" && r.title === "Your move", `${r.band} ${r.title}`);
      L.check("D1", `${r.key}: the avatar takes the accent`, r.av === "rgb(110, 52, 38)", String(r.av));
      L.check("D1", `${r.key}: the pager buttons are a .18 white wash`, r.pager === "rgba(255, 255, 255, 0.18)", String(r.pager));
      if (r.past) { withPast++; L.check("D1", `${r.key}: a past segment is rgba(110,52,38,.4)`, r.past.bg === "rgba(110, 52, 38, 0.4)" && r.past.op === "1", JSON.stringify(r.past)); }
    }
    if (r.steps.length) {
      withSteps++;
      const todo = r.steps.filter((s) => !s.done);
      L.check("D1", `${r.key}: one dashed to-do, last`, todo.length === 1 && !r.steps[r.steps.length - 1].done, JSON.stringify(r.steps));
      L.check("D1", `${r.key}: no stage both done and to do`, !r.steps.some((s) => s.done && s.label === todo[0]?.label), JSON.stringify(r.steps));
      const ms = r.steps.filter((s) => s.done && /\d/.test(s.date)).map((s) => { const [d, m] = s.date.split(" "); return MON.indexOf(m) * 40 + Number(d); });
      L.check("D1", `${r.key}: the done stages are in date order`, ms.every((v, j) => j === 0 || v >= ms[j - 1]), JSON.stringify(r.steps));
    }
    const next = page.locator('[data-d71="next"]').first();
    if (!(await next.count()) || (await next.isDisabled())) break;
    await next.click();
    await page.waitForTimeout(250);
  }
  L.check("D1", "population: 'Your move' cards seen", sends > 0, String(sends));
  L.check("D1", "population: a card with step chips", withSteps > 0, String(withSteps));
  L.check("D1", "population: a past segment on a 'Your move' card", withPast > 0, String(withPast));
  L.done(10);
});

test("DB118-E1 · the Closed stack's names, dates and weeks", async ({ page }) => {
  const L = new Ledger("E1");
  await openDash(page, { width: 1440, height: 900 });
  const rows = await hoopRows(page, "closed-hoop");
  const future: string[] = [];
  let cards = 0;
  for (const r of rows.filter((x) => x.n > 0)) {
    const p = await page.evaluate((k) => { const e = document.querySelector<HTMLElement>(`[data-d60="closed-hoop"] [data-d116="key-row"][data-key="${k}"]`)!.getBoundingClientRect(); return { x: e.left + 12, y: e.top + e.height / 2 }; }, r.key);
    await page.mouse.move(2, 2); await page.waitForTimeout(150);
    await page.mouse.move(p.x, p.y, { steps: 3 }); await page.waitForTimeout(500);
    const got = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-d116="stack"].is-on [data-d116="query-card"]')].map((c) => ({
      id: c.dataset.id ?? "", future: c.dataset.future === "1",
      queried: c.querySelector('[data-d116="queried"]')?.textContent ?? "", end: c.querySelector('[data-d116="end"]')?.textContent ?? "",
      label: c.querySelector('[data-d116="name"]')?.getAttribute("aria-label") ?? "",
    })));
    for (const c of got) {
      cards++;
      if (c.future) future.push(c.id);
      L.check("E1", `${r.key} ${c.id}: a future sent date reads "Queried —"`, !c.future || c.queried === "Queried —", JSON.stringify(c));
      L.check("E1", `${r.key} ${c.id}: never "0 wks"`, !/^0 wk/i.test(c.end), c.end);
      L.check("E1", `${r.key} ${c.id}: the full name is the accessible label`, c.label.length > 0, c.label);
    }
  }
  L.check("E1", "population: cards read", cards >= 3, String(cards));
  console.log("FUTURE", JSON.stringify(future));
  /* a long name, seeded into a shown card: at least 14 characters show, and the pill folds to its icon */
  const busyKey = [...rows].sort((a, b) => b.n - a.n)[0]?.key ?? "";
  const p0 = await page.evaluate((k) => { const e = document.querySelector<HTMLElement>(`[data-d60="closed-hoop"] [data-d116="key-row"][data-key="${k}"]`)!.getBoundingClientRect(); return { x: e.left + 12, y: e.top + e.height / 2 }; }, busyKey);
  await page.mouse.move(2, 2); await page.waitForTimeout(150);
  await page.mouse.move(p0.x, p0.y, { steps: 3 }); await page.waitForTimeout(500);
  if (MUT === "E1-narrow") await page.addStyleTag({ content: `.d116-qm .d116-nm b { max-width: 104px !important; } .d116-qm .d116-nm { min-width: 0 !important; } .d116-qm .d116-pillt { display: inline !important; }` });
  const long = await page.evaluate(() => {
    const b = document.querySelector<HTMLElement>('[data-d116="stack"].is-on [data-d116="query-card"] [data-d116="name"]');
    if (!b) return null;
    /* the account's own long-ish name ("Fenella Strand", cut to "Fenella Str…" in the report), then a longer one */
    b.textContent = "Fenella Strathcarron-Whitby";
    const box = b.getBoundingClientRect();
    const t = b.firstChild as Text;
    /* the characters a reader SEES: when the name overflows, the ellipsis takes the end of the box */
    const probe = document.createElement("span"); probe.textContent = "…"; probe.style.font = getComputedStyle(b).font; probe.style.position = "absolute"; document.body.appendChild(probe);
    const ell = b.scrollWidth > b.clientWidth + 0.5 ? probe.getBoundingClientRect().width : 0; probe.remove();
    const count = () => {
      const bx = b.getBoundingClientRect();
      const pr = document.createElement("span"); pr.textContent = "…"; pr.style.font = getComputedStyle(b).font; pr.style.position = "absolute"; document.body.appendChild(pr);
      const e = b.scrollWidth > b.clientWidth + 0.5 ? pr.getBoundingClientRect().width : 0; pr.remove();
      let n = 0;
      for (let i = 1; i <= t.length; i++) { const r = document.createRange(); r.setStart(t, 0); r.setEnd(t, i); if (r.getBoundingClientRect().right <= bx.right - e + 0.5) n = i; else break; }
      return n;
    };
    void box; void ell;
    const fitWeb = count();
    /* and in a wider fallback face, as a reader sees it before the webfont arrives (the reported "Fenella Str…") */
    b.style.setProperty("font-family", "Georgia, serif", "important");
    const fitFallback = count();
    const fit = Math.min(fitWeb, fitFallback);
    const pillT = b.closest('[data-d116="query-card"]')!.querySelector<HTMLElement>(".d116-pillt");
    const cardW = b.closest<HTMLElement>(".d116-qm")!.getBoundingClientRect().width;
    return { fit, fitWeb, fitFallback, cardW, pillWords: pillT ? getComputedStyle(pillT).display !== "none" : false, ellipsis: getComputedStyle(b).textOverflow };
  });
  L.check("E1", "a seeded long name shows at least 14 characters", !!long && long.fit >= 14, JSON.stringify(long));
  L.check("E1", "below 230px of card the pill is its icon alone", !!long && (long.cardW >= 230 || !long.pillWords), JSON.stringify(long));
  L.check("E1", "past that, an ellipsis", long?.ellipsis === "ellipsis", JSON.stringify(long));
  L.done(8);
});
