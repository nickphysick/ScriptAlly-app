/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v57 — TD57 M1–M11 on the rendered page (design-refs/todo-list-v57/todoWs57.css, ported wholesale to
 * src/components/todo/ws/todoWs57.css). Plain readings, no mutation proofs (a visual change).
 *   TD57_TAG=before SA_E2E_BASE_URL=http://127.0.0.1:4321 npm run e2e:emu -- tests/e2e/todoV57.measure.ts --project=measure --workers=1
 * on the BASE build (the served dev line, before the import) records readings/before.json, the "before" shots and
 * M10's base shots, and asserts nothing v57-specific. Without TD57_TAG (= "after") every lock asserts, M10 against
 * the base shots in reports/todo-list-v57/shots/ (or TD57_BASE_SHOTS).
 * M9 logs one task and puts it back through the snackbar's Undo in the same run; the tray prefs are read before the
 * run and written back afterwards (tests/e2e/seedTd55.mjs).
 * ⚠️ RUN AT ONE WORKER: the cases share the account's saved tray state.
 */
import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

test.describe.configure({ mode: "default" });
test.setTimeout(300_000);
const DIR = "reports/todo-list-v57";
const READ = `${DIR}/readings`;
const SHOTS = `${DIR}/shots`;
mkdirSync(READ, { recursive: true });
mkdirSync(SHOTS, { recursive: true });
const TAG = process.env.TD57_TAG ?? "after";
const AFTER = TAG !== "before";
const BASE_SHOTS = process.env.TD57_BASE_SHOTS ?? SHOTS;
const BASE_REF = process.env.TD57_BASE_REF ?? "b9226fc5e";
const SIZES = [{ width: 1280, height: 800 }, { width: 1440, height: 900 }, { width: 1717, height: 1000 }, { width: 1920, height: 1080 }] as const;
const TD = '[data-tws="page"]';
const PG = `${TD}:visible`;
const QC = ".qc151.qc153";

/* readings: one file per tag, merged across cases (each case adds its own key) */
const readings: Record<string, unknown> = {};
const note = (k: string, v: unknown) => { readings[k] = v; };
const seed = (cmd: string, arg: unknown): Record<string, unknown> => {
  const out = execFileSync("node", ["tests/e2e/seedTd55.mjs", cmd, JSON.stringify(arg)], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  return JSON.parse(out.trim().split("\n").pop()!);
};
let prefs: Record<string, unknown> | null = null;
test.beforeAll(() => { prefs = seed("prefs", { trayGrouping: null, trayCollapsed: null }); });
test.afterAll(() => {
  const file = `${READ}/${TAG}.json`;
  const prev = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown> : {};
  writeFileSync(file, JSON.stringify({ ...prev, ...readings }, null, 1));
  if (prefs) seed("prefs", prefs);
});

const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;
const clamp = (lo: number, v: number, hi: number) => Math.min(hi, Math.max(lo, v));

/* ── opening the pages ── */
async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
  await page.mouse.move(2, 2);
}
async function openTodo(page: Page, vp: { width: number; height: number }) {
  seed("prefs", { trayGrouping: null, trayCollapsed: null });
  await openRoute(page, "/todo", vp);
  await expect(page.locator(`${PG} [data-tws-row]`).first()).toBeVisible({ timeout: 60_000 });
  let last = "";
  for (let i = 0; i < 20; i++) {
    const t = (await page.locator(`${PG} [data-tws54="title"]`).textContent()) ?? "";
    if (t === last && t) break;
    last = t;
    await page.waitForTimeout(1200);
  }
  await settle(page);
}
async function openQc(page: Page, vp: { width: number; height: number }) {
  await page.addInitScript(() => { try { localStorage.setItem("sa.guide.queries", "1"); localStorage.setItem("sa.guide.queries-explainer", "1"); } catch { /* private */ } });
  await openRoute(page, "/queries", vp);
  await expect(page.locator(`${QC} [data-qc1531='header']`).first()).toBeVisible({ timeout: 60_000 });
  await expect(page.locator(`${QC} [data-qc154="card"]`).first()).toBeVisible({ timeout: 60_000 });
  await settle(page);
}
async function openCl(page: Page, vp: { width: number; height: number }) {
  await openRoute(page, "/agents", vp);
  await expect(page.locator(".cl27 [data-clq='header']").first()).toBeVisible({ timeout: 60_000 });
  await settle(page);
  await page.waitForTimeout(1500);
}
async function scroll(page: Page, root: string, y: number | "end") {
  await page.evaluate(([rs, v]) => {
    const r = [...document.querySelectorAll<HTMLElement>(rs as string)].find((e) => e.getBoundingClientRect().width > 0)!;
    const sc = (r.closest<HTMLElement>(".wpg-scroll") ?? r.querySelector<HTMLElement>(".wpg-scroll"))!;
    sc.scrollTop = v === "end" ? sc.scrollHeight : (v as number);
  }, [root, y] as const);
  await page.waitForTimeout(700);
}
/** open a shut group by its id */
async function openGroup(page: Page, id: string) {
  const gb = page.locator(`${PG} [data-tws-group="${id}"] .tws-gb`);
  if ((await gb.count()) && (await gb.first().getAttribute("aria-expanded")) === "false") { await gb.first().click(); await page.waitForTimeout(300); }
}
/** put the first row of a kind on the desk; its title, or null */
async function pick(page: Page, kind: string): Promise<string | null> {
  if (kind === "send") await openGroup(page, "wait");
  if (kind === "nudge") await openGroup(page, "nudge");
  if (kind === "quiet") await openGroup(page, "quiet");
  const row = page.locator(`${PG} [data-tws="list"] [data-tws-row][data-kind="${kind}"]`).first();
  if (!(await row.count())) return null;
  const title = ((await row.locator(".tws-tx b").textContent()) ?? "").trim();
  await row.click();
  await page.waitForTimeout(600);
  return title;
}
const desk = (page: Page) => page.locator(`${PG} [data-tws="desk"]`);
const primary = (page: Page) => desk(page).locator('[data-tws="primary"]');
async function openStep(page: Page): Promise<string> {
  return page.evaluate(() => {
    const root = [...document.querySelectorAll<HTMLElement>('[data-tws="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
    return root.querySelector<HTMLElement>('[data-tws="desk"] [data-st="open"]')?.getAttribute("data-tws-step") ?? "none";
  });
}
async function answer(page: Page): Promise<boolean> {
  const q = desk(page).locator('[data-st="open"]').first();
  const tile = q.locator(".tws-tile:not(:disabled)").first();
  if (await tile.count()) { await tile.click(); return true; }
  const range = q.locator('input[type="range"]');
  if (await range.count()) { await range.focus(); await page.keyboard.press("ArrowRight"); return true; }
  const ta = q.locator("textarea");
  if (await ta.count()) { await ta.fill("Upmarket book club fiction."); return true; }
  return false;
}
async function walkToCheck(page: Page, kind: string): Promise<{ title: string | null; steps: string[] }> {
  const title = await pick(page, kind);
  const steps: string[] = [];
  if (!title) return { title, steps };
  for (let i = 0; i < 8; i++) {
    const s = await openStep(page);
    steps.push(s);
    if (s === "check" || s === "none") break;
    await answer(page);
    const nx = primary(page).and(page.locator("[data-next]"));
    if (!(await nx.count()) || !(await nx.isEnabled())) break;
    await nx.click();
    await page.waitForTimeout(250);
  }
  return { title: (await openStep(page)) === "check" ? title : null, steps };
}

/* ── the readings the brief names (Step 0 · 4 / M1–M7) ── */
const readAll = (page: Page) => page.evaluate(() => {
  const root = [...document.querySelectorAll<HTMLElement>('[data-tws="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
  const w = (s: string) => { const e = root.querySelector<HTMLElement>(s); return e ? e.getBoundingClientRect().width : null; };
  const sc = [...document.querySelectorAll<HTMLElement>(".tws-wpg > .wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0) ?? null;
  const rows = [...root.querySelectorAll<HTMLElement>('[data-tws="list"] [data-tws-row]')];
  const second = rows.slice(1).find((r) => r.getAttribute("aria-current") !== "true") ?? null;
  const sends = [...root.querySelectorAll<HTMLElement>('[data-tws="list"] [data-tws-row][data-kind="send"] .tws-tx b')].slice(0, 12);
  const qh = root.querySelector<HTMLElement>('[data-tws="desk"] .tws-wq h3.tws-qh') ?? root.querySelector<HTMLElement>('[data-tws="desk"] .tws-qh');
  const tiles = root.querySelector<HTMLElement>('[data-tws="desk"] [data-st="open"] .tws-tiles[data-desk]') ?? root.querySelector<HTMLElement>('[data-tws="desk"] .tws-tiles[data-desk]');
  const pvz = root.querySelector<HTMLElement>(".tws-pvz");
  const gb = root.querySelector<HTMLElement>(".tws-gb");
  return {
    workspace: w('[data-tws="workspace"]'), tray: w('[data-tws="tray"]'), desk: w('[data-tws="desk"]'), side: w('[data-tws="side"]'),
    zoom: pvz ? Number(pvz.style.zoom || getComputedStyle(pvz).zoom) : null,
    sendTitles: sends.map((b) => ({ t: b.textContent, h: Math.round(b.getBoundingClientRect().height * 10) / 10 })),
    secondRow: second ? { key: second.getAttribute("data-tws-row"), opacity: getComputedStyle(second).opacity } : null,
    bandOpacity: gb ? getComputedStyle(gb).opacity : null,
    qh: qh ? { text: qh.textContent, family: getComputedStyle(qh).fontFamily, size: getComputedStyle(qh).fontSize, weight: getComputedStyle(qh).fontWeight } : null,
    scroller: sc ? { found: true, bg: getComputedStyle(sc).backgroundImage, parent: sc.parentElement?.className ?? "" } : { found: false },
    tiles: tiles ? { cols: getComputedStyle(tiles).gridTemplateColumns.split(" ").filter(Boolean).length, n: tiles.children.length, gtc: getComputedStyle(tiles).gridTemplateColumns } : null,
    trayFocus: null as boolean | null,
    deskContainer: (() => { const d = root.querySelector<HTMLElement>('[data-tws="desk"]'); return d ? getComputedStyle(d).containerType : null; })(),
  };
});

/* ══ M1–M5, M7 (and Step 0's baseline) · per viewport, the workspace pinned, a request on the desk ═══════════════ */
const READS = new Map<number, Awaited<ReturnType<typeof readAll>>>();
for (const vp of SIZES) {
  test(`M1–M5 + M7 · tray, titles, row strength, preview, tiles, ground (${vp.width})`, async ({ page }) => {
    await openTodo(page, vp);
    await scroll(page, TD, "end");
    const title = await pick(page, "send");
    expect(title, "a request task to put on the desk").not.toBeNull();
    await page.mouse.move(2, 2);
    /* ⚠️ the clicked row keeps focus, and todoWs.css lifts every row on `.tws-tray:focus-within` — so M3 would read 1
       on the base build too. Nothing in the tray may hold focus when the row strength is read. */
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.());
    await page.waitForTimeout(500);
    const r = await readAll(page);
    r.trayFocus = await page.evaluate(() => !!document.activeElement?.closest('[data-tws="tray"]'));
    READS.set(vp.width, r);
    note(`R-${vp.width}`, r);
    await page.screenshot({ path: `${SHOTS}/${TAG}-pinned-${vp.width}.png` });
    if (!AFTER) return;
    const tray = clamp(340, 0.29 * r.workspace!, 396);
    const side = clamp(390, 0.42 * r.desk!, 568);
    /* M1 */
    const m1 = vp.width === 1280 ? 340 : vp.width === 1440 ? 373.5 : 396;
    expect(near(r.tray!, m1, 1), `M1 · tray ${r.tray} vs ${m1}`).toBe(true);
    expect(near(r.tray!, tray, 1), `M1 · tray ${r.tray} = clamp(340, 29% of ${r.workspace}, 396) = ${tray}`).toBe(true);
    /* M2 */
    if (vp.width >= 1440) {
      expect(r.sendTitles.length, "M2 · twelve send titles found").toBe(12);
      for (const s of r.sendTitles) expect(s.h, `M2 · "${s.t}" is one line (${s.h})`).toBeLessThanOrEqual(20);
    }
    /* M3 */
    expect(r.trayFocus, "M3 · nothing in the tray holds focus").toBe(false);
    expect(r.secondRow?.opacity, "M3 · the second row at full strength").toBe("1");
    /* M4 */
    const m4 = vp.width <= 1440 ? 390 : vp.width === 1717 ? 479 : 492;
    expect(near(r.side!, m4, 1.5), `M4 · preview ${r.side} vs ${m4}`).toBe(true);
    expect(near(r.side!, side, 1), `M4 · preview ${r.side} = clamp(390, 42% of desk ${r.desk}, 568) = ${side}`).toBe(true);
    /* M5 */
    expect(r.tiles, "M5 · answer tiles on the desk").not.toBeNull();
    expect(r.tiles!.cols, `M5 · tile columns (${r.tiles!.gtc})`).toBe(vp.width === 1280 ? 1 : 2);
    /* M6 (the heading half) */
    expect(r.qh?.family ?? "", "M6 · question heading in Source Serif 4").toMatch(/^"?Source Serif 4/);
    /* M7 */
    expect(r.scroller.found, "M7 · the To-do scroller").toBe(true);
    expect((r.scroller as { bg: string }).bg, "M7 · the doodle ground").toContain("todo/doodle-tile.svg");
  });
}
test("M4 · the card is drawn larger at 1717 than at 1440", async () => {
  test.skip(!AFTER, "before: recorded only");
  const a = READS.get(1440), b = READS.get(1717);
  test.skip(!a || !b, "needs the 1440 and 1717 readings from this run");
  note("M4-zoom", { z1440: a!.zoom, z1717: b!.zoom });
  expect(b!.zoom!, `M4 · zoom ${b!.zoom} at 1717 > ${a!.zoom} at 1440`).toBeGreaterThan(a!.zoom!);
});

/* ══ M6 · the snooze pop-up's faces ════════════════════════════════════════════════════════════════════════════ */
test("M6 · the snooze pop-up: options in Source Serif 4, heading in Special Elite", async ({ page }) => {
  await openTodo(page, SIZES[1]);
  await scroll(page, TD, "end");
  await pick(page, "send");
  await desk(page).locator('[data-tws="footer"] .tws-sb[aria-label="Snooze"]').click();
  const pop = page.locator('[data-tws="snooze-pop"]');
  await expect(pop).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(300);
  const r = await pop.evaluate((p) => ({
    span: getComputedStyle(p.querySelector(".tws-po span")!).fontFamily,
    head: getComputedStyle(p.querySelector(".tws-ph b")!).fontFamily,
  }));
  note("M6-pop", r);
  if (!AFTER) return;
  expect(r.span, "M6 · option label").toMatch(/^"?Source Serif 4/);
  expect(r.head, "M6 · pop-up heading").toMatch(/^"?Special Elite/);
});

/* ══ M8 · a hovered row swaps its figure for the quick actions ═════════════════════════════════════════════════ */
test("M8 · hover hides the figure and shows both quick actions", async ({ page }) => {
  await openTodo(page, SIZES[1]);
  await scroll(page, TD, "end");
  const row = page.locator(`${PG} [data-tws="list"] [data-tws-row]:has(.tws-qact):not([aria-current="true"])`).first();
  await expect(row).toBeVisible();
  const read = () => row.evaluate((r) => {
    const fig = r.querySelector<HTMLElement>('[data-tws="figure"], [data-tws="quick-fill"]')!;
    const acts = [...r.querySelectorAll<HTMLElement>(".tws-qact [role=button]")];
    return {
      fig: getComputedStyle(fig).visibility,
      acts: acts.map((a) => { const b = a.getBoundingClientRect(); const cs = getComputedStyle(a); const p = getComputedStyle(a.parentElement!); return { vis: cs.visibility, op: p.opacity, pvis: p.visibility, w: b.width, h: b.height }; }),
    };
  });
  await page.mouse.move(2, 2);
  await page.waitForTimeout(300);
  const off = await read();
  await row.hover();
  await page.waitForTimeout(400);
  const on = await read();
  note("M8", { off, on });
  if (!AFTER) return;
  expect(off.fig, "M8 · unhovered, the figure shows").toBe("visible");
  expect(on.fig, "M8 · hovered, the figure is hidden").toBe("hidden");
  expect(on.acts.length, "M8 · two quick actions").toBe(2);
  for (const a of on.acts) expect(a.vis === "visible" && a.pvis === "visible" && Number(a.op) > 0.9 && a.w > 0 && a.h > 0, `M8 · action visible ${JSON.stringify(a)}`).toBe(true);
});

/* ══ M9 · nothing lost ═════════════════════════════════════════════════════════════════════════════════════════ */
test("M9 · log a send task end to end (and Undo it); the pop-ups, tabs, search, filter menu and collapse open", async ({ page }) => {
  test.skip(!AFTER, "before: the journey writes; run on the after build only");
  await openTodo(page, SIZES[1]);
  await scroll(page, TD, "end");
  const count = async () => Number(((await page.locator(`${PG} [data-tws54="title"]`).textContent()) ?? "").match(/\d+/)?.[0] ?? -1);
  const n0 = await count();
  const w = await walkToCheck(page, "send");
  expect(w.title, `M9 · the send task reaches the check step (${w.steps.join(" → ")})`).not.toBeNull();
  await page.screenshot({ path: `${SHOTS}/${TAG}-check-1440.png` });
  await primary(page).click();
  const toast = page.locator('[data-tws="toast"][data-snack]');
  await expect(toast, "M9 · the snackbar").toBeVisible({ timeout: 8000 });
  const undo = page.locator('[data-tws="toast"] [data-tws="undo"]');
  const hasUndo = await undo.count();
  await page.waitForTimeout(600);
  const n1 = await count();
  const snack = ((await toast.textContent()) ?? "").trim();
  if (hasUndo) await undo.click();
  await expect(page.locator(`${PG} [data-tws-row]`).filter({ hasText: w.title! }).first(), "M9 · Undo puts the task back").toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(800);
  const n2 = await count();
  /* the footer's pop-ups */
  await pick(page, "send");
  const sb = (l: string) => desk(page).locator(`[data-tws="footer"] .tws-sb[aria-label="${l}"]`);
  await sb("Snooze").click();
  await expect(page.locator('[data-tws="snooze-pop"]'), "M9 · Snooze opens").toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator('[data-tws="snooze-pop"]')).toHaveCount(0);
  await sb("Dismiss").click();
  await expect(page.locator('[data-tws="dismiss-pop"]'), "M9 · Dismiss opens").toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator('[data-tws="dismiss-pop"]')).toHaveCount(0);
  /* tabs, search, filter menu, collapse */
  for (const t of ["snoozed", "done", "todo"]) {
    await page.locator(`${PG} [data-tws55-tab="${t}"]`).click();
    await expect(page.locator(`${PG} [data-tws55-tab="${t}"]`), `M9 · the ${t} tab`).toHaveAttribute("aria-pressed", "true");
  }
  await page.locator(`${PG} [data-tws55="search-btn"]`).click();
  await expect(page.locator(`${PG} [data-tws55="search"]`), "M9 · search opens").toBeVisible();
  await page.locator(`${PG} [data-tws55="search-close"]`).click();
  await page.locator(`${PG} [data-tws55="menu-btn"]`).click();
  await expect(page.locator(`${PG} [data-tws55="menu"]`), "M9 · the filter menu opens").toBeVisible();
  await page.keyboard.press("Escape");
  await page.locator(`${PG} [data-tws="collapse"]`).click();
  await expect(page.locator(`${PG} [data-tws55-strip]`).first(), "M9 · the collapse").toBeVisible();
  await page.locator(`${PG} [data-tws="expand"]`).click();
  await expect(page.locator(`${PG} [data-tws="list"] [data-tws-row]`).first(), "M9 · and back").toBeVisible();
  note("M9", { title: w.title, steps: w.steps, n0, n1, n2, snack, hasUndo });
  expect(n1, `M9 · the header's count drops by one (${n0} → ${n1})`).toBe(n0 - 1);
  expect(hasUndo, "M9 · the snackbar offers Undo").toBe(1);
  expect(n2, "M9 · Undo restores the count").toBe(n0);
});

/* ══ M10 · the Query Centre and the Contact list do not change ═════════════════════════════════════════════════ */
for (const pg of ["qc", "cl"] as const) {
  test(`M10 · ${pg === "qc" ? "Query Centre" : "Contact list"} unchanged at rest and scrolled (1440)`, async ({ page }) => {
    const vp = SIZES[1];
    if (pg === "qc") await openQc(page, vp); else await openCl(page, vp);
    const root = pg === "qc" ? QC : ".cl27";
    const shots: Record<string, Buffer> = {};
    for (const st of ["rest", "scrolled"] as const) {
      await scroll(page, root, st === "rest" ? 0 : 600);
      await page.mouse.move(2, 2);
      await page.waitForTimeout(500);
      shots[st] = await page.screenshot();
      writeFileSync(`${SHOTS}/M10-${TAG}-${pg}-${st}-1440.png`, shots[st]);
    }
    if (!AFTER) return;
    const res: Record<string, unknown> = {};
    for (const st of ["rest", "scrolled"] as const) {
      const f = `${BASE_SHOTS}/M10-before-${pg}-${st}-1440.png`;
      expect(existsSync(f), `M10 · the base shot ${f}`).toBe(true);
      const d = await page.evaluate(async ([a, b]) => {
        const img = async (s: string) => { const i = new Image(); i.src = `data:image/png;base64,${s}`; await i.decode(); return i; };
        const [ia, ib] = [await img(a), await img(b)];
        if (ia.width !== ib.width || ia.height !== ib.height) return { size: false, frac: 1, n: -1 };
        const px = (i: HTMLImageElement) => { const c = document.createElement("canvas"); c.width = i.width; c.height = i.height; const x = c.getContext("2d")!; x.drawImage(i, 0, 0); return x.getImageData(0, 0, i.width, i.height).data; };
        const [pa, pb] = [px(ia), px(ib)];
        let n = 0;
        for (let i = 0; i < pa.length; i += 4) if (pa[i] !== pb[i] || pa[i + 1] !== pb[i + 1] || pa[i + 2] !== pb[i + 2]) n++;
        return { size: true, n, frac: n / (pa.length / 4) };
      }, [readFileSync(f).toString("base64"), shots[st].toString("base64")]);
      res[st] = d;
      expect(d.size, `M10 · ${pg} ${st}: same size`).toBe(true);
      expect(d.frac, `M10 · ${pg} ${st}: ${d.n} pixels differ (${(d.frac * 100).toFixed(4)}%)`).toBeLessThanOrEqual(0.0001);
    }
    note(`M10-${pg}`, res);
  });
}

/* ══ M11 · no phone file changed ═══════════════════════════════════════════════════════════════════════════════ */
test("M11 · no phone file changed since the served line", async () => {
  const out = execFileSync("git", ["diff", "--name-only", `${BASE_REF}..HEAD`, "--", "src/components/phone", "src/components/todo/phone"], { encoding: "utf8" }).trim();
  note("M11", { base: BASE_REF, out });
  expect(out, "M11 · git diff --name-only <base>..HEAD -- the phone folders").toBe("");
});

/* ══ the shots (Phase 3): before/after pairs at 1440 and 1920 ═════════════════════════════════════════════════ */
for (const vp of [SIZES[1], SIZES[3]]) {
  test(`shots · the To-do states (${vp.width})`, async ({ page }) => {
    const shot = (n: string) => page.screenshot({ path: `${SHOTS}/${TAG}-${n}-${vp.width}.png` });
    await openTodo(page, vp);
    await shot("rest");
    await scroll(page, TD, "end");
    await openGroup(page, "house");
    await page.locator(`${PG} [data-tws-group="house"]`).first().scrollIntoViewIfNeeded().catch(() => undefined);
    await page.mouse.move(2, 2); await page.waitForTimeout(400);
    await shot("housekeeping");
    if (await pick(page, "nudge")) { await page.mouse.move(2, 2); await page.waitForTimeout(400); await shot("nudge"); }
    if (await pick(page, "quiet")) { await page.mouse.move(2, 2); await page.waitForTimeout(400); await shot("quiet"); }
    await pick(page, "send");
    await desk(page).locator('[data-tws="footer"] .tws-sb[aria-label="Snooze"]').click();
    await expect(page.locator('[data-tws="snooze-pop"]')).toBeVisible();
    await page.waitForTimeout(300);
    await shot("snooze-pop");
    await page.keyboard.press("Escape");
    if (vp.width !== 1440) {
      /* the 1440 check step is M9's (after); the 1920 one is walked here without logging */
      const w = await walkToCheck(page, "send");
      if (w.title) { await page.mouse.move(2, 2); await page.waitForTimeout(400); await shot("check"); }
    } else if (!AFTER) {
      const w = await walkToCheck(page, "send");
      if (w.title) { await page.mouse.move(2, 2); await page.waitForTimeout(400); await shot("check"); }
    }
    await page.locator(`${PG} [data-tws55-tab="snoozed"]`).click();
    await page.waitForTimeout(500);
    await shot("snoozed");
    await page.locator(`${PG} [data-tws55-tab="todo"]`).click();
    await page.locator(`${PG} [data-tws="collapse"]`).click();
    await expect(page.locator(`${PG} [data-tws55-strip]`).first()).toBeVisible();
    await page.mouse.move(2, 2); await page.waitForTimeout(500);
    await shot("collapsed");
    await page.locator(`${PG} [data-tws="expand"]`).click();
    await page.waitForTimeout(500);
  });
}
