/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v56 — TD56 L1–L11 on the rendered page (design-refs/todo-list-v56/todo-navy-header-v1.html, "Ring and
 * words" + "Slim bar"), at 1440 × 900 and 1717 × 1000 unless the lock says otherwise:
 *   SA_E2E_BASE_URL=http://127.0.0.1:4321 npm run e2e:emu -- tests/e2e/todoV56.measure.ts --project=measure --workers=1
 *
 * `TD56_MUTATE=<lock>` applies that lock's named break (page-side, or for L11 the path it reads); `TD56_MUTATE=all` applies
 * each case's OWN lock's break, so one run shows every lock red (each must fail, and each names its break). L10 compares against the Query Centre and Contact list shots of the BASE build, taken by running
 * this file with `TD56_TAG=base` in a checkout of the served line and pointed at with `TD56_BASE_SHOTS=<dir>`.
 * ⚠️ RUN AT ONE WORKER: the cases share the account's saved tray state. Each case opens its own page.
 */
import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { openRoute, startFirstTodoTask } from "./measure";

/* ⚠️ NOT serial: a red case must not skip the ones after it (each is a lock of its own, and the `all` break makes every
   one red at once). One worker still runs them in order. */
test.describe.configure({ mode: "default" });
test.setTimeout(300_000);
const DIR = "reports/todo-list-v56";
const READ = `${DIR}/readings`;
const SHOTS = `${DIR}/shots`;
mkdirSync(READ, { recursive: true });
mkdirSync(SHOTS, { recursive: true });
const MUT = process.env.TD56_MUTATE ?? "";
/** the break in force for the running case: its own lock's under "all" */
const brk = (): string => (MUT === "all" ? (test.info().title.match(/^L\d+/)?.[0] ?? "") : MUT);
const TAG = process.env.TD56_TAG ?? "after";
const BASE_SHOTS = process.env.TD56_BASE_SHOTS ?? "";
const BASE_REF = process.env.TD56_BASE_REF ?? "c24562273";
const SIZES = [{ width: 1440, height: 900 }, { width: 1717, height: 1000 }] as const;
const QC = ".qc151.qc153";
const TD = '[data-tws="page"]';
const held = new Map<string, unknown>();
const note = (name: string, v: unknown) => { held.set(name, v); };
test.afterAll(() => {
  for (const [name, v] of held) writeFileSync(`${READ}/${name}${MUT ? `-${MUT}` : ""}.json`, JSON.stringify(v, null, 1));
});

type Box = { x: number; y: number; w: number; h: number; r: number; b: number };

/* ── opening the pages ── */
async function pinSidebar(page: Page, on: boolean) {
  await page.addInitScript((v) => { try { if (v) localStorage.setItem("scriptally:sidebar-pinned", "1"); else localStorage.removeItem("scriptally:sidebar-pinned"); } catch { /* private */ } }, on);
}
async function openQc(page: Page, vp: { width: number; height: number }) {
  await page.addInitScript(() => { try { localStorage.setItem("sa.guide.queries", "1"); localStorage.setItem("sa.guide.queries-explainer", "1"); } catch { /* private */ } });
  await openRoute(page, "/queries", vp);
  await expect(page.locator(`${QC} [data-qc1531='header']`).first()).toBeVisible({ timeout: 60_000 });
  await expect(page.locator(`${QC} [data-qc154="card"]`).first()).toBeVisible({ timeout: 60_000 });
  await settleFonts(page);
}
async function openCl(page: Page, vp: { width: number; height: number }) {
  await openRoute(page, "/agents", vp);
  await expect(page.locator(".cl27 [data-clq='header']").first()).toBeVisible({ timeout: 60_000 });
  await settleFonts(page);
  await page.waitForTimeout(1500);
}
async function openTodo(page: Page, vp: { width: number; height: number }) {
  await openRoute(page, "/todo", vp);
  /* RE-POINTED (To-do arrival v1): arrival opens no task; Start opens the one it used to */
  await startFirstTodoTask(page);
  await expect(page.locator(`${TD}:visible [data-tws-row]`).first()).toBeVisible({ timeout: 60_000 });
  /* the board settles over a few seconds as the account's collections arrive: wait until the title holds still */
  let last = "";
  for (let i = 0; i < 20; i++) {
    const t = (await page.locator(`${TD}:visible [data-tws54="title"]`).textContent()) ?? "";
    if (t === last && t) break;
    last = t;
    await page.waitForTimeout(1200);
  }
  await settleFonts(page);
  await mutate(page);
}
async function settleFonts(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
  await page.mouse.move(2, 2);
}
/** the visible page's scroller, to a position ("end" = its foot) */
async function scroll(page: Page, root: string, y: number | "end") {
  await page.evaluate(([rs, v]) => {
    const root = [...document.querySelectorAll<HTMLElement>(rs as string)].find((e) => e.getBoundingClientRect().width > 0)!;
    const sc = (root.closest<HTMLElement>(".wpg-scroll") ?? root.querySelector<HTMLElement>(".wpg-scroll"))!;
    sc.scrollTop = v === "end" ? sc.scrollHeight : (v as number);
  }, [root, y] as const);
  await page.waitForTimeout(700);
}

/* ── the named breaks (page-side) ── */
async function mutate(page: Page) {
  if (!brk()) return;
  await page.evaluate((l) => {
    const css = (t: string) => { const s = document.createElement("style"); s.textContent = t; document.head.appendChild(s); };
    const keep = (f: () => void) => { f(); window.setInterval(f, 50); };
    const swallow = (sel: string, types: string[]) => { for (const ty of types) document.addEventListener(ty, (e) => { if ((e.target as Element | null)?.closest?.(sel)) { e.stopImmediatePropagation(); e.preventDefault(); } }, true); };
    if (l === "L1") css(".tws56-hdw .tws56-art { height: auto !important; }");
    if (l === "L2") css(".tws56-hdw h1.qc1531-t { letter-spacing: 0.9em !important; }");
    if (l === "L3") css(".tws56-hdw .tws56-words { display: flex !important; }");
    if (l === "L4") css(".tws.tws56 > .qc156-slim.qc156-slim.qc156-slim { top: 20px !important; }");
    if (l === "L5") css(".tws.tws56:has(> .qc156-slim[data-shown]) .tws-ws { height: calc(var(--tws-port) - 24px) !important; }");
    /* the questions stop scrolling in their own box (v54 L2's break), so the desk's footer and Next are pushed out of the
       desk and below the scroller. (A taller or lower workspace is no break here: the page scrolls with it, and a sticky
       box cannot leave its container's end.) */
    if (l === "L6") css(".tws .tws-wq { flex: none !important; overflow: visible !important; }");
    if (l === "L7") swallow('[data-tws56="seg"]', ["click", "keydown"]);
    if (l === "L8") swallow('[data-tws56="slim-add"]', ["click"]);
    if (l === "L9") keep(() => { const n = document.querySelector('[data-tws="page"] [data-tws56="need"]'); if (n && n.textContent !== "99") n.textContent = "99"; const e = document.querySelector('[data-tws="page"] [data-tws56="late"]'); if (e && e.textContent !== "0") e.textContent = "0"; });
  }, brk());
}
/** L10's break, on the Query Centre and the Contact list */
async function mutateOther(page: Page) {
  if (brk() === "L10") await page.addStyleTag({ content: ":is(.qc151.qc153, .cl27) > .qc1531-hd.qc1531-hd.qc1531-hd { background: #2b3b54 !important; }" });
}

/* ── readings ── */
const readHeader = (page: Page, root: string) => page.evaluate((rs) => {
  const root = [...document.querySelectorAll<HTMLElement>(rs)].find((e) => e.getBoundingClientRect().width > 0)!;
  const box = (e: Element | Range | null | undefined) => { if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, r: r.right, b: r.bottom }; };
  const hd = root.querySelector<HTMLElement>("header.qc1531-hd")!;
  const h1 = hd.querySelector<HTMLElement>("h1")!;
  const rg = document.createRange(); rg.selectNodeContents(h1);
  const cs = getComputedStyle(h1);
  const pad = parseFloat(getComputedStyle(hd).paddingRight);
  return {
    header: box(hd), bg: getComputedStyle(hd).backgroundColor, padRight: pad,
    art: box(hd.querySelector(".qc1531-art img")), h1: box(h1), text: box(rg), size: cs.fontSize, family: cs.fontFamily, title: h1.textContent,
    block: box(hd.querySelector('[data-tws56="rc"]') ?? hd.querySelector(".qc1531-rc > *")),
    ring: box(hd.querySelector('[data-tws56="ring"]')),
    words: (() => { const w = hd.querySelector<HTMLElement>('[data-tws56="words"]'); return w ? { display: getComputedStyle(w).display, box: box(w) } : null; })(),
  };
}, root);

const readPin = (page: Page) => page.evaluate((rs) => {
  const root = [...document.querySelectorAll<HTMLElement>(rs)].find((e) => e.getBoundingClientRect().width > 0)!;
  const box = (e: Element | null | undefined) => { if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, r: r.right, b: r.bottom }; };
  const sc = root.closest<HTMLElement>(".wpg-scroll")!;
  const s = sc.getBoundingClientRect();
  const slim = root.querySelector<HTMLElement>(':scope > [data-tws56="slim"]');
  const cs = slim ? getComputedStyle(slim) : null;
  return {
    scTop: s.top + sc.clientTop, scBottom: s.top + sc.clientTop + sc.clientHeight, scrollTop: sc.scrollTop, scrollMax: sc.scrollHeight - sc.clientHeight,
    slim: box(slim), shown: slim?.hasAttribute("data-shown") ?? null, inert: slim?.hasAttribute("inert") ?? null, ariaHidden: slim?.getAttribute("aria-hidden") ?? null,
    visibility: cs?.visibility ?? null, opacity: cs?.opacity ?? null,
    ws: box(root.querySelector('[data-tws="workspace"]')), wsTop: getComputedStyle(root.querySelector('[data-tws="workspace"]')!).top,
    next: box(root.querySelector('[data-tws="primary"]')), desk: box(root.querySelector('[data-tws="desk"]')),
  };
}, TD);

/** a request task on the desk, so its questions and the Next button show */
async function pickRequest(page: Page) {
  /* a material request ("send"): its desk asks questions and shows Next. The rows are the group heading's siblings, not
     its children, so the row is found by its kind (as todoV54 L2 does); a shut group is opened first */
  const gb = page.locator(`${TD}:visible [data-tws-group="wait"] .tws-gb`);
  await expect(gb, "the Agents are waiting group").toHaveCount(1, { timeout: 30_000 });
  if ((await gb.getAttribute("aria-expanded")) === "false") await gb.click();
  const row = page.locator(`${TD}:visible [data-tws="list"] [data-tws-row][data-kind="send"]`).first();
  await expect(row, "a request task to put on the desk").toBeVisible({ timeout: 15_000 });
  await row.click();
  await expect(page.locator(`${TD}:visible [data-tws="primary"]`)).toBeVisible({ timeout: 10_000 });
}

const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;

/* ══ L1 · the To-do header's box is the Query Centre's ═════════════════════════════════════════════════════════ */
for (const vp of SIZES) {
  test(`L1 · the header is the Query Centre's: box, height, drawing, title (${vp.width})`, async ({ page }) => {
    await openQc(page, vp);
    const qc = await readHeader(page, QC);
    await openTodo(page, vp);
    const td = await readHeader(page, TD);
    note(`L1-${vp.width}`, { qc, td });
    expect(qc.header && td.header && qc.art && td.art, "both headers and drawings render").toBeTruthy();
    expect(near(td.header!.x, qc.header!.x, 0.5), `L1 · left x ${td.header!.x} vs ${qc.header!.x}`).toBe(true);
    expect(near(td.header!.r, qc.header!.r, 0.5), `L1 · right x ${td.header!.r} vs ${qc.header!.r}`).toBe(true);
    expect(near(td.header!.h, qc.header!.h, 1), `L1 · height ${td.header!.h} vs ${qc.header!.h}`).toBe(true);
    expect(near(td.art!.x, qc.art!.x, 0.5) && near(td.art!.w, qc.art!.w, 0.5), `L1 · drawing x/w ${td.art!.x}/${td.art!.w} vs ${qc.art!.x}/${qc.art!.w}`).toBe(true);
    expect(near(td.h1!.x, qc.h1!.x, 0.5), `L1 · h1 x ${td.h1!.x} vs ${qc.h1!.x}`).toBe(true);
    expect(td.size, "L1 · h1 54px").toBe("54px");
    expect(td.family, "L1 · the typewriter").toMatch(/^"?Special Elite/);
    expect(td.bg, "L1 · navy").toBe("rgb(42, 58, 82)");
  });
}

/* ══ L2 · the title clears the right-hand block, and the block sits inside the padding ═══════════════════════════ */
for (const vp of SIZES) {
  test(`L2 · the title clears the ring block by 28px or more (${vp.width})`, async ({ page }) => {
    await openTodo(page, vp);
    const r = await readHeader(page, TD);
    note(`L2-${vp.width}`, r);
    expect(r.title ?? "", "L2 · a real title").toMatch(/^\d+ things? to do$/);
    expect(r.words?.display, "L2 · the words show at this width").not.toBe("none");
    expect(r.block!.x - r.text!.r, `L2 · gap title → block (${r.text!.r} → ${r.block!.x})`).toBeGreaterThanOrEqual(28);
    expect(r.block!.r, `L2 · block inside the padding (${r.block!.r} ≤ ${r.header!.r - r.padRight})`).toBeLessThanOrEqual(r.header!.r - r.padRight + 0.5);
  });
}

/* ══ L3 · a narrow header: the ring alone ══════════════════════════════════════════════════════════════════════ */
for (const c of [{ vp: { width: 1280, height: 800 }, pin: false }, { vp: { width: 1440, height: 900 }, pin: true }]) {
  test(`L3 · under 1200 wide the words go and the ring stands alone (${c.vp.width}${c.pin ? ", full sidebar pinned" : ""})`, async ({ page }) => {
    await pinSidebar(page, c.pin);
    await openTodo(page, c.vp);
    const r = await readHeader(page, TD);
    note(`L3-${c.vp.width}${c.pin ? "-pinned" : ""}`, r);
    expect(r.header!.w, "L3 · the header is under 1200 wide").toBeLessThan(1200);
    expect(r.words?.display, "L3 · the words are not displayed").toBe("none");
    expect(r.ring!.w, "L3 · the ring is").toBeGreaterThan(100);
    expect(r.ring!.x - r.text!.r, `L3 · the title does not overlap the ring (${r.text!.r} → ${r.ring!.x})`).toBeGreaterThan(0);
    await page.locator(`${TD}:visible [data-tws56="header"]`).screenshot({ path: `${SHOTS}/L3-${c.vp.width}${c.pin ? "-pinned" : ""}${MUT ? `-${MUT}` : ""}.png` });
  });
}

/* ══ L4 · the slim bar: hidden and inert at rest; at the end, 60px on the scroller's top, the workspace under it ══ */
for (const vp of SIZES) {
  test(`L4 · the slim bar and the pin (${vp.width})`, async ({ page }) => {
    await openTodo(page, vp);
    const rest = await readPin(page);
    await page.locator(`${TD}:visible [data-tws56="header"]`).screenshot({ path: `${SHOTS}/header-rest-${vp.width}${MUT ? `-${MUT}` : ""}.png` });
    await page.screenshot({ path: `${SHOTS}/page-rest-${vp.width}${MUT ? `-${MUT}` : ""}.png` });
    await scroll(page, TD, "end");
    const end = await readPin(page);
    await page.screenshot({ path: `${SHOTS}/page-end-${vp.width}${MUT ? `-${MUT}` : ""}.png` });
    note(`L4-${vp.width}`, { rest, end });
    expect(rest.slim, "L4 · the bar is mounted").toBeTruthy();
    expect(rest.shown, "L4 · at rest: not shown").toBe(false);
    expect(rest.inert && rest.ariaHidden === "true" && rest.visibility === "hidden", "L4 · at rest: inert, aria-hidden, hidden").toBe(true);
    expect(end.scrollTop, "L4 · scrolled to the end").toBeGreaterThan(0);
    expect(end.shown && !end.inert && end.visibility === "visible", "L4 · scrolled: shown").toBe(true);
    expect(near(end.slim!.h, 60, 0.5), `L4 · 60px tall (${end.slim!.h})`).toBe(true);
    expect(near(end.slim!.y, end.scTop, 1), `L4 · its top on the scroller's (${end.slim!.y} vs ${end.scTop})`).toBe(true);
    expect(near(end.ws!.y, end.slim!.b + 12, 1), `L4 · workspace top = bar bottom + 12 (${end.ws!.y} vs ${end.slim!.b + 12})`).toBe(true);
    expect(near(end.ws!.b, end.scBottom - 12, 1), `L4 · workspace bottom = scroller bottom − 12 (${end.ws!.b} vs ${end.scBottom - 12})`).toBe(true);
  });
}

/* ══ L5 · the workspace's height does not change when the bar appears ═════════════════════════════════════════ */
for (const vp of SIZES) {
  test(`L5 · the workspace is one height at rest and scrolled (${vp.width})`, async ({ page }) => {
    await openTodo(page, vp);
    const rest = await readPin(page);
    await scroll(page, TD, "end");
    const end = await readPin(page);
    note(`L5-${vp.width}`, { rest: rest.ws, end: end.ws, shown: end.shown });
    expect(end.shown, "L5 · the bar is showing when scrolled").toBe(true);
    expect(near(rest.ws!.h, end.ws!.h, 0.5), `L5 · ${rest.ws!.h} at rest, ${end.ws!.h} scrolled`).toBe(true);
  });
}

/* ══ L6 · pinned, the Next button is whole, inside the scroller and the desk ════════════════════════════════════ */
for (const vp of [{ width: 1366, height: 768 }, { width: 1440, height: 900 }]) {
  test(`L6 · Next is inside the scroller and the desk when pinned (${vp.width})`, async ({ page }) => {
    await openTodo(page, vp);
    await pickRequest(page);
    await scroll(page, TD, "end");
    const r = await readPin(page);
    note(`L6-${vp.width}`, r);
    expect(r.next && r.desk, "L6 · Next and the desk render").toBeTruthy();
    expect(r.next!.y >= r.scTop - 0.5 && r.next!.b <= r.scBottom + 0.5, `L6 · Next ${r.next!.y}–${r.next!.b} inside the scroller ${r.scTop}–${r.scBottom}`).toBe(true);
    expect(r.next!.y >= r.desk!.y - 0.5 && r.next!.b <= r.desk!.b + 0.5 && r.next!.x >= r.desk!.x - 0.5 && r.next!.r <= r.desk!.r + 0.5, "L6 · Next inside the desk").toBe(true);
  });
}

/* ══ L7 · each ring segment pins the workspace and brings its group's header into the tray's view ══════════════ */
test("L7 · a segment (click, and Enter) settles the page and scrolls the tray to its group", async ({ page }) => {
  await openTodo(page, SIZES[0]);
  const keys = await page.locator(`${TD}:visible [data-tws56="seg"]`).evaluateAll((els) => els.map((e) => e.getAttribute("data-k")!));
  note("L7-keys", keys);
  expect(keys.length, "L7 · segments to press").toBeGreaterThan(0);
  const where = (k: string) => page.evaluate((key) => {
    const root = [...document.querySelectorAll<HTMLElement>('[data-tws="page"]')].find((e) => e.getBoundingClientRect().width > 0)!;
    const sc = root.closest<HTMLElement>(".wpg-scroll")!;
    const list = root.querySelector<HTMLElement>('[data-tws="list"]')!.getBoundingClientRect();
    const head = root.querySelector<HTMLElement>(`[data-tws-group="${key}"]`)?.getBoundingClientRect() ?? null;
    return { scrollTop: sc.scrollTop, scrollMax: sc.scrollHeight - sc.clientHeight, listTop: list.top, listBottom: list.bottom, headTop: head?.top ?? null };
  }, k);
  const out: Record<string, unknown> = {};
  for (const how of ["click", "Enter"] as const) {
    for (const k of keys) {
      await scroll(page, TD, 0);
      await page.evaluate(() => { const l = [...document.querySelectorAll<HTMLElement>('[data-tws="page"] [data-tws="list"]')].find((e) => e.getBoundingClientRect().width > 0); if (l) l.scrollTop = l.scrollHeight; });
      const seg = page.locator(`${TD}:visible [data-tws56="seg"][data-k="${k}"]`);
      if (how === "click") {
        /* a real pointer on the stroke itself: the arc's midpoint (a full ring's top), mapped to the screen */
        const pt = await seg.evaluate((el) => {
          const g = el as SVGGeometryElement;
          const p = g.tagName === "circle" ? { x: 105, y: 105 - 84 } : g.getPointAtLength(g.getTotalLength() / 2);
          const m = g.getScreenCTM()!;
          return { x: m.a * p.x + m.c * p.y + m.e, y: m.b * p.x + m.d * p.y + m.f };
        });
        await page.mouse.click(pt.x, pt.y);
      } else { await seg.focus(); await page.keyboard.press("Enter"); }
      await page.waitForTimeout(1400);
      const w = await where(k);
      out[`${how}-${k}`] = w;
      expect(w.headTop, `L7 · ${how} ${k}: the group is in the tray`).not.toBeNull();
      expect(near(w.scrollTop, w.scrollMax, 1), `L7 · ${how} ${k}: the page settled on the workspace (${w.scrollTop}/${w.scrollMax})`).toBe(true);
      expect(w.headTop! >= w.listTop - 1 && w.headTop! < w.listBottom - 20, `L7 · ${how} ${k}: the group's header in the tray's view (${w.headTop} in ${w.listTop}–${w.listBottom})`).toBe(true);
    }
  }
  note("L7", out);
});

/* ══ L8 · the slim bar's + Add a task opens the header's add card ═════════════════════════════════════════════ */
test("L8 · the slim bar's + Add a task opens the same add card as the header's", async ({ page }) => {
  await openTodo(page, SIZES[0]);
  const addCard = page.locator(`${TD}:visible [data-tws="add"]`);
  await expect(addCard).toHaveCount(0);
  await page.locator(`${TD}:visible [data-tws54="add"]`).click();
  await expect(addCard, "L8 · the header's button opens the add card").toHaveCount(1);
  const fromHeader = await addCard.evaluate((e) => e.outerHTML.replace(/\s(id|for|aria-[a-z]+)="[^"]*"/g, ""));
  await page.locator(`${TD}:visible [data-tws="add"] button`, { hasText: "Cancel" }).first().click();
  await expect(addCard).toHaveCount(0);
  await scroll(page, TD, "end");
  await expect(page.locator(`${TD}:visible [data-tws56="slim"]`)).toHaveAttribute("data-shown", "");
  await page.locator(`${TD}:visible [data-tws56="slim-add"]`).click();
  await page.waitForTimeout(500);
  note("L8", { count: await addCard.count() });
  await expect(addCard, "L8 · the bar's button opens the add card").toHaveCount(1, { timeout: 3000 });
  const fromBar = await addCard.evaluate((e) => e.outerHTML.replace(/\s(id|for|aria-[a-z]+)="[^"]*"/g, ""));
  expect(fromBar, "L8 · the same card").toBe(fromHeader);
});

/* ══ L9 · no legend; the ring's centre and the italic line are the tray's own figures ══════════════════════════ */
test("L9 · no legend; the figures are the tray's", async ({ page }) => {
  await openTodo(page, SIZES[0]);
  const r = await page.evaluate(() => {
    const root = [...document.querySelectorAll<HTMLElement>('[data-tws="page"]')].find((e) => e.getBoundingClientRect().width > 0)!;
    const n = (id: string) => { const em = root.querySelector(`[data-tws-group="${id}"] .tws-gb em`); return em ? Number(em.textContent) : 0; };
    const rows = [...root.querySelectorAll<HTMLElement>('[data-tws="list"] [data-tws-row]')];
    return {
      legend: root.querySelectorAll('[data-tws54="legend"], .qc1531-lg, .qc1531-lgw').length,
      need: Number(root.querySelector('[data-tws56="need"]')?.textContent),
      groups: { wait: n("wait"), nudge: n("nudge"), quiet: n("quiet"), house: n("house") },
      late: Number(root.querySelector('[data-tws56="late"]')?.textContent ?? 0),
      house: Number(root.querySelector('[data-tws56="house"]')?.textContent ?? 0),
      /* recorded, not asserted: the rows that SAY late. Requests past their date read "n days waiting", and housekeeping
         shows four rows behind "Show more", so this is not an independent count of the breakdown's `late` */
      lateRows: rows.filter((x) => /\blate\b/.test(x.querySelector('[data-tws="figure"]')?.textContent ?? "")).length,
      rowsDrawn: rows.length,
      slimLate: Number(root.querySelector('[data-tws56="slim-late"]')?.textContent?.match(/^\d+/)?.[0] ?? 0),
      line: root.querySelector('[data-tws56="line"]')?.textContent ?? null,
    };
  });
  note("L9", r);
  expect(r.groups.wait + r.groups.nudge + r.groups.quiet, "L9 · the tray has groups that need you").toBeGreaterThan(0);
  expect(r.legend, "L9 · no legend").toBe(0);
  expect(r.need, "L9 · centre = waiting + nudges + quiet").toBe(r.groups.wait + r.groups.nudge + r.groups.quiet);
  expect(r.house, "L9 · to tidy = housekeeping").toBe(r.groups.house);
  /* "late" is the breakdown's (`breakdownOf`, the old counts line's figure, read off the tray's own sections): the line
     and the slim bar show the one figure, and it is never fewer than the rows that say late */
  expect(r.late, "L9 · the line's late = the slim bar's (one figure)").toBe(r.slimLate);
  expect(r.late, "L9 · and at least the rows that say late").toBeGreaterThanOrEqual(r.lateRows);
});

/* ══ L10 · the Query Centre and the Contact list do not change ═════════════════════════════════════════════════ */
for (const vp of SIZES) {
  for (const pg of ["qc", "cl"] as const) {
    test(`L10 · ${pg === "qc" ? "Query Centre" : "Contact list"} unchanged at rest and scrolled (${vp.width})`, async ({ page }) => {
      if (pg === "qc") await openQc(page, vp); else await openCl(page, vp);
      await mutateOther(page);
      const root = pg === "qc" ? QC : ".cl27";
      const shots: Record<string, Buffer> = {};
      for (const st of ["rest", "scrolled"] as const) {
        await scroll(page, root, st === "rest" ? 0 : 600);
        await page.mouse.move(2, 2);
        await page.waitForTimeout(500);
        shots[st] = await page.screenshot();
        writeFileSync(`${SHOTS}/L10-${TAG}-${pg}-${st}-${vp.width}${MUT ? `-${MUT}` : ""}.png`, shots[st]);
      }
      if (TAG === "base") return;
      expect(BASE_SHOTS && existsSync(BASE_SHOTS), "L10 · TD56_BASE_SHOTS names the base build's shots").toBeTruthy();
      const res: Record<string, unknown> = {};
      for (const st of ["rest", "scrolled"] as const) {
        const before = readFileSync(`${BASE_SHOTS}/L10-base-${pg}-${st}-${vp.width}.png`).toString("base64");
        const after = shots[st].toString("base64");
        const d = await page.evaluate(async ([a, b]) => {
          const img = async (s: string) => { const i = new Image(); i.src = `data:image/png;base64,${s}`; await i.decode(); return i; };
          const [ia, ib] = [await img(a), await img(b)];
          if (ia.width !== ib.width || ia.height !== ib.height) return { size: false, frac: 1, n: -1 };
          const px = (i: HTMLImageElement) => { const c = document.createElement("canvas"); c.width = i.width; c.height = i.height; const x = c.getContext("2d")!; x.drawImage(i, 0, 0); return x.getImageData(0, 0, i.width, i.height).data; };
          const [pa, pb] = [px(ia), px(ib)];
          let n = 0;
          for (let i = 0; i < pa.length; i += 4) if (pa[i] !== pb[i] || pa[i + 1] !== pb[i + 1] || pa[i + 2] !== pb[i + 2]) n++;
          return { size: true, n, frac: n / (pa.length / 4) };
        }, [before, after]);
        res[st] = d;
        expect(d.size, `L10 · ${pg} ${st}: same size`).toBe(true);
        expect(d.frac, `L10 · ${pg} ${st}: ${d.n} pixels differ (${(d.frac * 100).toFixed(4)}%)`).toBeLessThanOrEqual(0.001);
      }
      note(`L10-${pg}-${vp.width}`, res);
    });
  }
}

/* ══ L11 · no phone file changed ═══════════════════════════════════════════════════════════════════════════════ */
test("L11 · no phone file changed since the served line", async () => {
  const paths = brk() === "L11" ? ["src/components/todo/ws"] : ["src/components/phone", "src/components/todo/phone"];
  const out = execFileSync("git", ["diff", "--name-only", `${BASE_REF}..HEAD`, "--", ...paths], { encoding: "utf8" }).trim();
  note("L11", { base: BASE_REF, paths, out });
  expect(out, "L11 · git diff --name-only <base>..HEAD -- the phone folders").toBe("");
});
