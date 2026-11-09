/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v54 — TD54 L1–L12 on the rendered page (design-refs/todo-list-v54/todo-desk-v15.html, todo-batch-v3.html),
 * at 1440 × 900, 1920 × 1080 and 1366 × 768 where the lock is about layout, once otherwise.
 *   SA_E2E_BASE_URL=http://127.0.0.1:3000 npx playwright test tests/e2e/todoV54.measure.ts --project=measure --no-deps --workers=1
 * against `npm run dev:emu`.
 *
 * `TD54_MUTATE=<lock>` applies that lock's page-side break; tests/e2e/td54Mutate.sh runs each (and the source breaks).
 * The writing cases (L8, L9) put every query back through the snackbar's Undo and check it; the fixture's agent
 * guidelines and the saved view are put back in afterAll (tests/e2e/seedTd54.mjs).
 * ⚠️ RUN AT ONE WORKER: the cases share the account's batch and its saved view.
 */
import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";
import { openPhone } from "./pa2Lib";

test.describe.configure({ mode: "serial" });
const DIR = "reports/todo-list-v54";
const READ = `${DIR}/readings`;
mkdirSync(READ, { recursive: true });
const MUT = process.env.TD54_MUTATE ?? "";
const SIZES = [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }, { width: 1366, height: 768 }] as const;
const PG = '[data-tws="page"]:visible';
const held = new Map<string, unknown>();
const note = (name: string, v: unknown) => { held.set(name, v); };

/* ── the fixture (seedTd54.mjs) ── */
const seed = (cmd: string, arg: unknown): Record<string, unknown> => {
  const out = execFileSync("node", ["tests/e2e/seedTd54.mjs", cmd, JSON.stringify(arg)], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  return JSON.parse(out.trim().split("\n").pop()!);
};
const restoreAgents: Record<string, unknown> = {};
const restoreDates: Record<string, unknown> = {};
let restoreView: unknown = undefined;
test.afterAll(() => {
  for (const [name, v] of held) writeFileSync(`${READ}/${name}${MUT ? `-${MUT}` : ""}.json`, JSON.stringify(v, null, 1));
  if (Object.keys(restoreAgents).length) seed("set", restoreAgents);
  if (restoreView !== undefined) seed("view", restoreView);
  if (Object.keys(restoreDates).length) seed("date", restoreDates);
});
const setGuidelines = (m: Record<string, string[]>) => {
  const before = seed("set", m);
  for (const [k, v] of Object.entries(before)) if (!(k in restoreAgents)) restoreAgents[k] = v;
};
/** poll the store until every id holds what `want` says (Undo's writes land a moment after the press) */
const settle = async (page: Page, ids: string[], want: Record<string, unknown>) => {
  let got: Record<string, unknown> = {};
  for (let i = 0; i < 15; i++) { got = seed("query", ids); if (ids.every((q) => JSON.stringify(got[q]) === JSON.stringify(want[q]))) break; await page.waitForTimeout(1000); }
  return got;
};
const setView = (v: "one" | "table" | null) => { const b = seed("view", v) as { before: unknown }; if (restoreView === undefined) restoreView = b.before; };

async function open(page: Page, vp: { width: number; height: number }, cap?: number) {
  await page.addInitScript((c) => {
    try { localStorage.removeItem("sa.todoTraySlim"); } catch { /* */ }
    if (c) (window as unknown as { __SA_TD54_BATCH?: number }).__SA_TD54_BATCH = c;
  }, cap ?? 0);
  await openRoute(page, "/todo", vp);
  await expect(page.locator(PG)).toHaveCount(1, { timeout: 30_000 });
  await expect(page.locator(`${PG} [data-tws-row]`).first()).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(500);
  await mutate(page);
}

/* ── the named breaks (page-side) ── */
async function mutate(page: Page) {
  if (!MUT) return;
  await page.evaluate((l) => {
    const css = (t: string) => { const s = document.createElement("style"); s.textContent = t; document.head.appendChild(s); };
    if (l === "L1") css(".tws .tws-ws { height: calc(var(--tws-port) + 80px) !important; }");
    if (l === "L2") css(".tws .tws-wq { flex: none !important; overflow: visible !important; }");
    if (l === "L3") css('.tws .tws-wq[data-tws54-view="table"] { padding-top: 16px !important; }');
    /* a break that must outlive re-renders runs now AND on a timer (a timer alone fires after an immediate read) */
    const keep = (f: () => void) => { f(); window.setInterval(f, 100); };
    if (l === "L4") keep(() => { const i = document.querySelector<HTMLImageElement>('[data-tws54="art"]'); if (i && !i.src.includes("armchair")) { i.src = "/images/qc/qc-armchair-hawk.png?v=1"; i.parentElement!.style.background = "#eee"; } });
    if (l === "L5") keep(() => { const b = document.querySelector('[data-tws54="legend-row"][data-k="nudge"] [data-tws54="legend-n"]'); if (b && b.textContent !== "99") b.textContent = "99"; });
    if (l === "L12") window.setInterval(() => { const pg = document.querySelector("[data-tdp]"); if (pg && !pg.querySelector("[data-tws54]")) { const r = document.createElement("div"); r.setAttribute("data-tws54", "header"); pg.appendChild(r); } }, 100);
  }, MUT);
}

const scrollerOf = async (page: Page) => page.evaluate(() => {
  const sc = [...document.querySelectorAll<HTMLElement>(".wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0)!;
  return { sh: sc.scrollHeight, ch: sc.clientHeight };
});
const toBottom = (page: Page) => page.evaluate(() => {
  const sc = [...document.querySelectorAll<HTMLElement>(".wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0)!;
  sc.scrollTop = sc.scrollHeight;
});

async function openBatch(page: Page) {
  const shut = page.locator(`${PG} [data-tws-group="house"] .tws-gb[aria-expanded="false"]`);
  if (await shut.count()) await shut.click();
  const row = page.locator(`${PG} [data-tws-row="materials-batch"]`);
  await row.scrollIntoViewIfNeeded();
  await row.click();
  await expect(page.locator(`${PG} [data-tws54="band"]`)).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(400);
}
const view = (page: Page) => page.locator(`${PG} [data-tws="questions"]`).getAttribute("data-tws54-view");
const switchTo = async (page: Page, v: "one" | "table") => { await page.locator(`${PG} [data-tws54="view-switch"] [data-v="${v}"]`).click(); await page.waitForTimeout(300); };

/** the footer against the desk card: its bottom within 2px of the desk's, and on screen */
async function footFit(page: Page) {
  return page.evaluate(() => {
    const root = [...document.querySelectorAll<HTMLElement>('[data-tws="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
    const d = root.querySelector<HTMLElement>('[data-tws="desk"]')!.getBoundingClientRect();
    const f = root.querySelector<HTMLElement>('[data-tws="footer"]')!.getBoundingClientRect();
    return { gap: Math.abs(d.bottom - f.bottom), onScreen: f.bottom <= window.innerHeight + 0.5 && f.top >= 0 };
  });
}

/* ══ L1 · the page scrolls by at most the header's height, then the frame fills the window ═════════════════════ */
for (const vp of SIZES) {
  test(`L1 · the header scrolls away and the frame fills the window (${vp.width})`, async ({ page }) => {
    await open(page, vp);
    const r = await page.evaluate(() => {
      const sc = [...document.querySelectorAll<HTMLElement>(".wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0)!;
      const hd = sc.querySelector<HTMLElement>('[data-tws="header"]')!;
      const ws = sc.querySelector<HTMLElement>('[data-tws="workspace"]')!;
      const before = { over: sc.scrollHeight - sc.clientHeight, hd: hd.offsetHeight, ch: sc.clientHeight };
      sc.scrollTop = sc.scrollHeight;
      const s = sc.getBoundingClientRect(), w = ws.getBoundingClientRect(), h = hd.getBoundingClientRect();
      return { ...before, top: w.top - s.top, bottom: s.top + sc.clientHeight - w.bottom, hdBottom: h.bottom - s.top, scrolled: sc.scrollTop };
    });
    expect(r.ch, "L1 · a real scrollport").toBeGreaterThan(300);
    expect(r.hd, "L1 · the header is there").toBeGreaterThan(150);
    expect(r.over, "L1 · the page scrolls by no more than the header's height").toBeLessThanOrEqual(r.hd);
    expect(r.over, "L1 · and it does scroll (the header leaves)").toBeGreaterThan(100);
    expect(Math.abs(r.top - 12), "L1 · scrolled, the frame's top is 12px under the window's").toBeLessThanOrEqual(1);
    expect(Math.abs(r.bottom - 12), "L1 · and its foot 12px above the window's").toBeLessThanOrEqual(1);
    expect(r.hdBottom, "L1 · the header has gone above the frame").toBeLessThanOrEqual(12.5);
    note(`L1-${vp.width}`, r);
  });
}

/* ══ L2 · the footer is pinned on every step once the header has gone ══════════════════════════════════════════ */
for (const vp of SIZES) {
  test(`L2 · the footer is pinned on every step, header gone (${vp.width})`, async ({ page }) => {
    test.setTimeout(120_000);
    await open(page, vp, 14);
    await toBottom(page);
    const out: Record<string, unknown> = {};
    const check = async (step: string) => { await toBottom(page); const f = await footFit(page); out[step] = f; expect(f.gap, `L2 · ${step}: the footer's bottom on the desk's`).toBeLessThanOrEqual(2); expect(f.onScreen, `L2 · ${step}: on screen`).toBe(true); };
    await check("first task");
    const send = page.locator(`${PG} [data-tws-row][data-kind="send"]`).first();
    if (await send.count()) { await send.click(); await page.waitForTimeout(300); await check("send"); }
    await openBatch(page);
    await check(`batch ${await view(page)}`);
    await switchTo(page, "one"); await check("one at a time · what went");
    await page.locator(`${PG} [data-tws54="tiles"] [data-tws-opt="ql"]`).click({ force: false });
    const next = page.locator(`${PG} [data-tws="primary"]`);
    if (!(await next.isDisabled())) { await next.click(); await page.waitForTimeout(200); await check("one at a time · the same"); }
    await switchTo(page, "table"); await check("all at once");
    await page.locator(`${PG} [data-tws54="sample-cell"]`).first().click(); await page.waitForTimeout(200); await check("all at once · sample panel");
    note(`L2-${vp.width}`, out);
  });
}

/* ══ L3 · nothing shows above a sticky header while its box scrolls ═══════════════════════════════════════════
   Every sticky element inside the To-do's scrolling boxes (the workspace itself is excluded: its 12px is the window's
   gutter, D2). The box is scrolled; then the point 1px inside its top edge must belong to the sticky header, never to
   what is scrolling under it, and the header's top must be flush with the box's. */
for (const vp of SIZES) {
  test(`L3 · sticky headers sit flush, nothing shows above them (${vp.width})`, async ({ page }) => {
    await open(page, vp, 14);
    await openBatch(page);
    if ((await view(page)) !== "table") await switchTo(page, "table");
    await toBottom(page);
    const r = await page.evaluate(() => {
      const root = [...document.querySelectorAll<HTMLElement>('[data-tws="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
      const stickies = [...root.querySelectorAll<HTMLElement>("*")].filter((e) => getComputedStyle(e).position === "sticky" && e.getAttribute("data-tws") !== "workspace");
      const out: { sel: string; box: string; gap: number; topAt: string; owned: boolean; scrolled: number }[] = [];
      for (const st of stickies) {
        let box: HTMLElement | null = st.parentElement;
        while (box && !/(auto|scroll)/.test(getComputedStyle(box).overflowY)) box = box.parentElement;
        if (!box || box.scrollHeight <= box.clientHeight + 2) continue;
        box.scrollTop = Math.min(220, box.scrollHeight - box.clientHeight);
        const b = box.getBoundingClientRect(), s = st.getBoundingClientRect();
        const x = s.left + Math.min(20, s.width / 2), y = b.top + box.clientTop + 1;
        const hit = document.elementFromPoint(x, y) as HTMLElement | null;
        out.push({ sel: `${st.tagName}.${[...st.classList].join(".")}`, box: `${box.tagName}.${[...box.classList].join(".")}`, gap: s.top - (b.top + box.clientTop),
          topAt: hit ? `${hit.tagName}.${[...hit.classList].join(".")}` : "nothing", owned: !!hit && (hit === st || st.contains(hit) || !!hit.closest("thead")), scrolled: box.scrollTop });
      }
      return out;
    });
    expect(r.length, "L3 · at least the batch table's headings are checked").toBeGreaterThan(0);
    for (const s of r) {
      expect(s.scrolled, `L3 · ${s.sel}: its box really scrolled`).toBeGreaterThan(0);
      expect(Math.abs(s.gap), `L3 · ${s.sel} in ${s.box}: flush with the box's top`).toBeLessThanOrEqual(0.5);
      expect(s.owned, `L3 · ${s.sel}: the pixel above it is the header's, not ${s.topAt}`).toBe(true);
    }
    note(`L3-${vp.width}`, r);
  });
}

/* ══ L4 · the illustration is the new asset, on nothing ══════════════════════════════════════════════════════ */
test("L4 · the hawk at the desk, no box behind it", async ({ page }) => {
  await open(page, { width: 1440, height: 900 });
  const r = await page.evaluate(async () => {
    const img = document.querySelector<HTMLImageElement>('[data-tws54="art"]')!;
    const cs = (e: Element) => getComputedStyle(e);
    const bytes = (await (await fetch(img.src)).arrayBuffer()).byteLength;
    const chain = [img, img.parentElement!].map((e) => ({ bg: cs(e).backgroundColor, img: cs(e).backgroundImage, radius: cs(e).borderRadius, shadow: cs(e).boxShadow, border: cs(e).borderTopWidth }));
    return { src: img.getAttribute("src"), natural: img.naturalWidth, width: img.getBoundingClientRect().width, bytes, chain };
  });
  expect(r.src, "L4 · the new asset").toContain("/images/todo/todo-desk-hawk.webp");
  expect(r.natural, "L4 · it loaded (480px WebP)").toBe(480);
  expect(r.bytes, "L4 · the file shipped with this pack").toBe(48592);
  expect(Math.round(r.width), "L4 · the armchair hawk's 190px").toBe(190);
  for (const c of r.chain) {
    expect(c.bg, "L4 · no fill behind it").toBe("rgba(0, 0, 0, 0)");
    expect(c.img, "L4 · no image behind it").toBe("none");
    expect(c.radius, "L4 · no rounded box").toBe("0px");
    expect(c.border, "L4 · no border").toBe("0px");
  }
  note("L4", r);
});

/* ══ L5 · "need you" = waiting + nudges + quiet; the legend's counts are the tray's ═══════════════════════════ */
test("L5 · the ring and the legend match the tray", async ({ page }) => {
  await open(page, { width: 1440, height: 900 });
  const r = await page.evaluate(() => {
    const root = [...document.querySelectorAll<HTMLElement>('[data-tws="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
    const leg = (k: string) => Number(root.querySelector(`[data-tws54="legend-row"][data-k="${k}"] [data-tws54="legend-n"]`)?.textContent ?? NaN);
    const tray = (k: string) => Number(root.querySelector(`[data-tws-group="${k}"] .tws-gb em`)?.textContent ?? 0);
    const todo = Number(root.querySelector('[data-tws="todo-count"]')?.textContent ?? NaN);
    return {
      need: Number(root.querySelector('[data-tws54="need"]')?.textContent ?? NaN),
      legend: { wait: leg("wait"), nudge: leg("nudge"), quiet: leg("quiet"), house: leg("house") },
      tray: { wait: tray("wait"), nudge: tray("nudge"), quiet: tray("quiet"), house: tray("house") },
      title: root.querySelector('[data-tws54="title"]')?.textContent, todo,
    };
  });
  expect(r.need, "L5 · need you = waiting + nudges + quiet").toBe(r.legend.wait + r.legend.nudge + r.legend.quiet);
  expect(r.legend, "L5 · the legend's counts are the tray's group counts").toEqual(r.tray);
  expect(r.title, "L5 · the title is the To do count").toBe(`${r.todo} things to do`);
  expect(r.need, "L5 · the account has something that needs the writer").toBeGreaterThan(0);
  note("L5", r);
});

/* ══ L6 · which view opens ═══════════════════════════════════════════════════════════════════════════════════ */
test("L6 · under 8 opens one at a time, 8+ the table, a saved choice wins, Quick fill is always the table", async ({ page, context }) => {
  test.setTimeout(120_000);
  setView(null);
  await open(page, { width: 1440, height: 900 }, 6);
  await openBatch(page);
  expect(await view(page), "L6 · 6 queries, no saved choice: one at a time").toBe("one");
  await page.close();
  const p2 = await context.newPage();
  await open(p2, { width: 1440, height: 900 }, 14);
  await openBatch(p2);
  expect(await view(p2), "L6 · 14 queries, no saved choice: all at once").toBe("table");
  await switchTo(p2, "one");                               /* the writer picks: saved */
  await p2.waitForTimeout(800);
  await p2.close();
  const p3 = await context.newPage();
  await open(p3, { width: 1440, height: 900 }, 14);
  await openBatch(p3);
  expect(await view(p3), "L6 · 14 queries, saved 'one at a time': one at a time").toBe("one");
  await p3.locator(`${PG} [data-tws54="quick-fill"]`).click();
  await p3.waitForTimeout(400);
  expect(await view(p3), "L6 · Quick fill: all at once, whatever was saved").toBe("table");
  await p3.close();
  setView(null);
});

/* ── the batch's first query and the next one with a different agent (the fixture for L7, L8, L11) ── */
async function batchHead(page: Page): Promise<{ q: string; agent: string }[]> {
  if ((await view(page)) !== "table") await switchTo(page, "table");
  const rows = await page.locator(`${PG} [data-tws54-row]`).evaluateAll((els) => els.map((e) => ({ q: e.getAttribute("data-tws54-row")!, agent: e.getAttribute("data-tws54-agent") ?? "" })));
  return rows;
}
const ASK_3CH = ["Query letter", "Synopsis", "First 3 chapters"];

/* ══ L7 · pre-filled from guidelines, sample included; none saved, the choices and nothing ticked ══════════════ */
test("L7 · guidelines pre-fill (sample too); with none saved, the two choices and nothing ticked", async ({ page }) => {
  test.setTimeout(120_000);
  setView(null);
  await open(page, { width: 1440, height: 900 }, 6);
  await openBatch(page);
  const rows = await batchHead(page);
  const a1 = rows[0].agent, a2 = rows.find((r) => r.agent && r.agent !== a1)!.agent;
  setGuidelines({ [a1]: ASK_3CH, [a2]: [] });
  await page.reload(); await expect(page.locator(`${PG} [data-tws-row]`).first()).toBeVisible({ timeout: 30_000 }); await mutate(page);
  await openBatch(page);
  if ((await view(page)) !== "one") await switchTo(page, "one");
  const step = page.locator(`${PG} [data-tws54="step"][data-step="what"]`);
  const pressed = async () => step.locator('[data-tws-opt][aria-pressed="true"]').evaluateAll((els) => els.map((e) => e.getAttribute("data-tws-opt")));
  const first = { agent: await step.getAttribute("data-tws54-agent"), pressed: await pressed(), note: await step.locator('[data-tws54="tile-note"]').textContent().catch(() => null), asks: await step.locator('[data-tws54="asks"]').textContent().catch(() => null) };
  expect(first.agent, "L7 · the batch opens on the fixture's first query").toBe(a1);
  expect(first.pressed.sort(), "L7 · pre-filled from the guidelines").toEqual(["ql", "samp", "syn"]);
  expect(first.note, "L7 · the sample too").toBe("first 3 chapters");
  expect(first.asks, "L7 · the sand note names the guidelines").toMatch(/^From .+’s guidelines$/);
  /* skip forward to the query whose agent has none saved */
  let second: Record<string, unknown> = {};
  for (let i = 0; i < 6; i++) {
    if ((await step.getAttribute("data-tws54-agent")) === a2) {
      second = { pressed: await pressed(), noAsks: await step.locator('[data-tws54="no-asks"]').count(), add: await step.locator('[data-tws54="add-asks"]').count(), startFrom: await step.locator('[data-tws54="start-from"]').count(), hawk: await step.locator('[data-tws="hawk"] p').textContent() };
      break;
    }
    await page.locator(`${PG} [data-tws="skip"]`).click(); await page.waitForTimeout(150);
  }
  expect(second.pressed, "L7 · none saved: nothing ticked").toEqual([]);
  expect(second.noAsks, "L7 · none saved: the no-guidelines note").toBe(1);
  expect(second.add, "L7 · 'Add their guidelines'").toBe(1);
  expect(second.startFrom, "L7 · 'Start from …' waits until something is logged in this batch").toBe(0);
  expect(String(second.hawk), "L7 · the hawk says it can't fill this in").toMatch(/guidelines aren’t saved, so I can’t fill this in for you\.$/);
  note("L7", { a1, a2, first, second });
});

/* ══ L8 · "Did the same go…" pre-ticks same-week and same-asks only; one Log writes each once; Undo restores all ═ */
test("L8 · the same-week and same-asks pre-ticks, one Log for all of them, Undo for all of them", async ({ page }) => {
  test.setTimeout(180_000);
  setView(null);
  await open(page, { width: 1440, height: 900 }, 6);
  await openBatch(page);
  const rows = await batchHead(page);
  const sentOf = async (q: string) => Number(await page.locator(`${PG} [data-tws54-row="${q}"]`).getAttribute("data-tws54-sent"));
  const a1 = rows[0].agent;
  const other = rows.find((r) => r.agent && r.agent !== a1);
  /* BOTH BRANCHES ARE ENTERED, or the lock proves one third of itself: one more agent asks for the same as the first
     ("asks"), and another query is moved to the day after the first's send ("week"); both are put back in afterAll */
  if (other) setGuidelines({ [a1]: ASK_3CH, [other.agent]: ASK_3CH });
  const weekRow = rows.find((r) => r !== rows[0] && r !== other && r.agent !== a1 && r.agent !== other?.agent);
  if (weekRow) {
    const d0 = await sentOf(rows[0].q);
    const before = seed("date", { [weekRow.q]: new Date(d0 + 86400000).toISOString() });
    for (const [k, v] of Object.entries(before)) if (!(k in restoreDates)) restoreDates[k] = v;
  }
  const agentAsks = seed("read", [...new Set(rows.map((r) => r.agent).filter(Boolean))]) as Record<string, string[]>;
  await page.reload(); await expect(page.locator(`${PG} [data-tws-row]`).first()).toBeVisible({ timeout: 30_000 }); await mutate(page);
  await openBatch(page);
  if ((await view(page)) !== "one") await switchTo(page, "one");
  await page.locator(`${PG} [data-tws="primary"]`).click();
  const same = page.locator(`${PG} [data-tws54="step"][data-step="same"]`);
  await expect(same).toBeVisible();
  const cur = { q: await same.getAttribute("data-tws54-cur"), agent: await same.getAttribute("data-tws54-agent"), sent: Number(await same.getAttribute("data-tws54-sent")) };
  const list = await same.locator("[data-tws54-same]").evaluateAll((els) => els.map((e) => ({ q: e.getAttribute("data-tws54-same")!, agent: e.getAttribute("data-tws54-agent") ?? "", sent: Number(e.getAttribute("data-tws54-sent")), on: e.getAttribute("aria-pressed") === "true", why: e.getAttribute("data-why") })));
  /* the rule, computed here from the data: within 3 days of this one, or an agent whose saved guidelines are the same */
  const key = (a: string) => JSON.stringify([...(agentAsks[a] ?? [])].sort());
  const expected = list.filter((x) => (Number.isFinite(cur.sent) && Number.isFinite(x.sent) && cur.sent > 0 && x.sent > 0 && Math.abs(cur.sent - x.sent) <= 3 * 86400000)
    || ((agentAsks[cur.agent!] ?? []).length > 0 && key(x.agent) === key(cur.agent!))).map((x) => x.q).sort();
  expect(list.filter((x) => x.on).map((x) => x.q).sort(), "L8 · pre-ticked = same week or same asks, and only those").toEqual(expected);
  const tally = { week: list.filter((x) => x.why === "week").length, asks: list.filter((x) => x.why === "asks").length, none: list.filter((x) => !x.why).length };
  expect(tally.week, "L8 · the 'queried the same week' branch was entered").toBeGreaterThan(0);
  expect(tally.asks, "L8 · the 'asks for the same' branch was entered").toBeGreaterThan(0);
  expect(tally.none, "L8 · and a query that fits neither, left unticked").toBeGreaterThan(0);
  const ticked = [cur.q!, ...list.filter((x) => x.on).map((x) => x.q)];
  const untouched = list.filter((x) => !x.on).map((x) => x.q);
  const before = seed("query", [...ticked, ...untouched]);
  await page.locator(`${PG} [data-tws="primary"]`).click();
  await expect(page.locator('[data-tws="toast"]')).toBeVisible({ timeout: 10_000 });
  const toast = await page.locator('[data-tws="toast"]').textContent();
  await page.waitForTimeout(800);
  const after = seed("query", [...ticked, ...untouched]);
  const undo = page.locator('[data-tws="undo"]');
  const pressed = await undo.count() ? (await undo.click(), true) : false;
  expect(pressed, "L8 · the snackbar offers Undo (the account is changed until it is pressed)").toBe(true);
  const undone = await settle(page, [...ticked, ...untouched], before);
  expect(toast, "L8 · one snackbar for all of them").toContain(`Logged for ${ticked.length} quer`);
  for (const q of ticked) {
    expect(after[q], `L8 · ${q} written`).toEqual(after[cur.q!]);
    expect(undone[q], `L8 · ${q} put back by Undo`).toEqual(before[q]);
  }
  for (const q of untouched) expect(after[q], `L8 · ${q} (unticked) not written`).toEqual(before[q]);
  note("L8", { cur, list, expected, tally, written: after[cur.q!] });
});

/* ══ L9 · the table's sample cell: the picker; typed 37 pages saves as 37; from page 40 reads "pages 40–76" ═════ */
test("L9 · a typed 37 pages from page 40 reads 'pages 40–76' and saves so", async ({ page }) => {
  test.setTimeout(150_000);
  await open(page, { width: 1440, height: 900 }, 14);
  await openBatch(page);
  if ((await view(page)) !== "table") await switchTo(page, "table");
  const row = page.locator(`${PG} [data-tws54-row]`).first();
  const qid = (await row.getAttribute("data-tws54-row"))!;
  await row.locator('[data-tws54="sample-cell"]').click();
  const panel = page.locator(`${PG} [data-tws54="sample-panel"]`);
  await expect(panel.locator('[data-snt="picker"]'), "L9 · the cell opens the full picker under its row").toBeVisible();
  await panel.locator('[data-snt-unit="pages"] .snt-ul').click();
  const amt = panel.locator('[data-snt="amount"]');
  await amt.fill("37"); await amt.press("Enter");
  await expect(panel.locator('[data-snt="reads"] b')).toHaveText("first 37 pages");
  await panel.locator('[data-snt="section"]').check();
  await panel.locator('[data-snt-from="page"] .snt-ul').click();
  const from = panel.locator('[data-snt="from"]');
  await from.fill("40"); await from.press("Enter");
  await expect(panel.locator('[data-snt="reads"] b'), "L9 · reads as").toHaveText("pages 40–76");
  await expect(row.locator('[data-tws54="sample-cell"]'), "L9 · the cell reads what went").toContainText("pages 40–76");
  const before = seed("query", [qid]);
  const filled = await page.locator(`${PG} [data-tws54-row]`).evaluateAll((els) => els.map((e) => e.getAttribute("data-tws54-row")!));
  const beforeAll = seed("query", filled);
  await page.locator(`${PG} [data-tws="primary"]`).click();
  await expect(page.locator('[data-tws="toast"]')).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(800);
  const after = seed("query", [qid]);
  const sample = (after[qid] as { material?: string; type?: string; quantity?: number; from?: number; fromUnit?: string }[]).find((m) => typeof m === "object" && m?.material === "Sample Pages");
  await page.locator('[data-tws="undo"]').click();
  const undone = await settle(page, filled, beforeAll);
  expect(sample, "L9 · saved as 37 pages from page 40").toEqual({ material: "Sample Pages", type: "pages", quantity: 37, from: 40, fromUnit: "page" });
  for (const q of filled) expect(undone[q], `L9 · ${q} put back by Undo`).toEqual(beforeAll[q]);
  note("L9", { qid, before: before[qid], sample });
});

/* ══ L10 · "Copy the first row to the gaps" never overwrites a filled row ═══════════════════════════════════════ */
test("L10 · copying the first row fills empty rows only", async ({ page }) => {
  await open(page, { width: 1440, height: 900 }, 14);
  await openBatch(page);
  if ((await view(page)) !== "table") await switchTo(page, "table");
  const rows = page.locator(`${PG} [data-tws54-row]`);
  const state = async () => rows.evaluateAll((els) => els.map((e) => ({ id: e.getAttribute("data-tws54-row"), ql: e.querySelector('[data-tws54-tick="ql"]')?.getAttribute("aria-pressed"), syn: e.querySelector('[data-tws54-tick="syn"]')?.getAttribute("aria-pressed"), s: e.querySelector('[data-tws54="sample-cell"]')?.textContent })));
  const set = async (i: number, ql: boolean, syn: boolean) => {
    for (const [k, v] of [["ql", ql], ["syn", syn]] as const) {
      const b = rows.nth(i).locator(`[data-tws54-tick="${k}"]`);
      if ((await b.getAttribute("aria-pressed") === "true") !== v) await b.click();
    }
  };
  /* an empty row is empty of the sample too (earlier cases' fixture can have given its agent a sample to ask for) */
  const noSample = async (i: number) => {
    const cell = rows.nth(i).locator('[data-tws54="sample-cell"]');
    if (((await cell.textContent()) ?? "").startsWith("None")) return;
    await cell.click();
    const panel = page.locator(`${PG} [data-tws54="sample-panel"]`);
    await panel.locator('input[type="checkbox"]').uncheck();
    await panel.locator('[data-tws54="sample-done"]').click();
  };
  await set(0, true, true);   /* the first row: query letter and synopsis */
  await set(1, true, false);  /* a filled row that differs */
  await set(2, false, false); /* an empty row */
  await noSample(2);
  await expect(rows.nth(2).locator('[data-tws54="sample-cell"]'), "L10 · the empty row is empty").toHaveText("None▾");
  const s0 = await state();
  const emptyBefore = s0.filter((r, i) => i > 0 && r.ql !== "true" && r.syn !== "true" && r.s === "None▾").length;
  await page.locator(`${PG} [data-tws54="copy-gaps"]`).click();
  const s1 = await state();
  expect(s1[1], "L10 · a filled row is never overwritten").toEqual(s0[1]);
  expect({ ql: s1[2].ql, syn: s1[2].syn, s: s1[2].s }, "L10 · an empty row takes the first row").toEqual({ ql: s0[0].ql, syn: s0[0].syn, s: s0[0].s });
  for (let i = 1; i < s0.length; i++) {
    const was = s0[i];
    if (was.ql === "true" || was.syn === "true" || was.s !== "None▾") expect(s1[i], `L10 · row ${i} (filled) unchanged`).toEqual(was);
  }
  await expect(page.locator(`${PG} [data-tws54="table-msg"]`), "L10 · says how many it filled").toContainText(`to ${emptyBefore} empty row`);
  note("L10", { emptyBefore, s0: s0.slice(0, 4), s1: s1.slice(0, 4) });
});

/* ══ L11 · a mismatched sample shows the note and isn't changed ══════════════════════════════════════════════════ */
test("L11 · a sample that differs from the guidelines: the note, and the answer kept", async ({ page }) => {
  setView(null);
  await open(page, { width: 1440, height: 900 }, 6);
  await openBatch(page);
  const rows = await batchHead(page);
  setGuidelines({ [rows[0].agent]: ASK_3CH });
  await page.reload(); await expect(page.locator(`${PG} [data-tws-row]`).first()).toBeVisible({ timeout: 30_000 });
  await openBatch(page);
  if ((await view(page)) !== "one") await switchTo(page, "one");
  const step = page.locator(`${PG} [data-tws54="step"][data-step="what"]`);
  await expect(step.locator('[data-snt="mismatch"]'), "L11 · no note while it matches").toHaveCount(0);
  await step.locator(".snt-pres button", { hasText: /^5$/ }).click();
  await expect(step.locator('[data-tws54="tile-note"]'), "L11 · the answer is what was entered").toHaveText("first 5 chapters");
  const mm = step.locator('[data-snt="mismatch"]');
  await expect(mm, "L11 · the note under the picker").toContainText("’s guidelines ask for first 3 chapters");
  expect(await mm.evaluate((e) => ({ c: getComputedStyle(e).color, i: getComputedStyle(e).fontStyle })), "L11 · navy italic").toEqual({ c: "rgb(42, 58, 82)", i: "italic" });
  await page.waitForTimeout(600);
  await expect(step.locator('[data-tws54="tile-note"]'), "L11 · and still what was entered").toHaveText("first 5 chapters");
  /* the table's row says so too */
  await switchTo(page, "table");
  await expect(page.locator(`${PG} [data-tws54-row]`).first().locator('[data-tws54="mismatch"]'), "L11 · the table row's note").toContainText("guidelines ask for first 3 chapters");
  await expect(page.locator(`${PG} [data-tws54-row]`).first().locator('[data-tws54="sample-cell"]')).toContainText("first 5 chapters");
});

/* ══ L12 · the phone To-do is unchanged ══════════════════════════════════════════════════════════════════════ */
test("L12 · the phone To-do has none of v54", async ({ page }) => {
  await openPhone(page, "/todo", { width: 390, height: 844 });
  await page.waitForTimeout(1200);
  await mutate(page);
  await page.waitForTimeout(300);
  const r = await page.evaluate(() => ({
    phone: !!document.querySelector("[data-tdp]"),
    v54: document.querySelectorAll("[data-tws54], .tws54-hdw, .tws54-band, .snt").length,
    deskHawk: [...document.images].filter((i) => i.src.includes("todo-desk-hawk") && i.getBoundingClientRect().width > 0).length,
  }));
  expect(r.phone, "L12 · the phone's own To-do").toBe(true);
  expect(r.v54, "L12 · no v54 parts on the phone").toBe(0);
  expect(r.deskHawk, "L12 · no desk hawk on the phone").toBe(0);
});
