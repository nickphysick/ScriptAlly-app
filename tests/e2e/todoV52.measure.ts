/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v52 — TD52 L1–L12, measured on the rendered page (design-refs/todo-list-v52/).
 * Against the emulator: `SA_E2E_BASE_URL=http://127.0.0.1:<port> npx playwright test tests/e2e/todoV52.measure.ts
 * --project=measure` with `npm run dev:emu` serving, or through `npm run e2e:emu -- tests/e2e/todoV52.measure.ts`.
 *
 * `TD52_MUTATE=<lock>` applies that lock's named break in the page (L11's break is a source change, applied by hand:
 * the preview rendering QcOpenCard again). One case writes (L10 logs a nudge and presses Undo); every other case reads.
 * Readings go to reports/todo-list-v52/readings/.
 */
import { expect, test, type Locator, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

const DIR = "reports/todo-list-v52";
const READ = `${DIR}/readings`;
mkdirSync(READ, { recursive: true });
const MUT = process.env.TD52_MUTATE ?? "";
const SIZES = [{ width: 1280, height: 800 }, { width: 1512, height: 982 }, { width: 1920, height: 1080 }] as const;
const PG = '[data-tws="page"]:visible';
/* readings are held and written once the file's tests are done: against `npm run dev:emu`, a file written under the
   project root mid-test makes Vite reload the page (it cut L10's Undo off once) */
const held = new Map<string, unknown>();
const note = (name: string, v: unknown) => { held.set(name, v); };
test.afterAll(() => { for (const [name, v] of held) writeFileSync(`${READ}/${name}.json`, JSON.stringify(v, null, 1)); });

/* the tray starts open for each test (the collapse is remembered per device); L5 reloads inside one test */
async function open(page: Page, vp: { width: number; height: number }) {
  await page.addInitScript(() => {
    try { if (!sessionStorage.getItem("td52-init")) { localStorage.removeItem("sa.todoTraySlim"); sessionStorage.setItem("td52-init", "1"); } } catch { /* */ }
  });
  await openRoute(page, "/todo", vp);
  await expect(page.locator(PG)).toHaveCount(1, { timeout: 30_000 });
  await expect(page.locator(`${PG} [data-tws-row]`).first()).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(500);
}

/* ── the named breaks (page-side) ── */
async function mutate(page: Page, lock: string) {
  if (MUT !== lock) return;
  await page.evaluate((l) => {
    const root = [...document.querySelectorAll<HTMLElement>('[data-tws="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
    const css = (t: string) => { const s = document.createElement("style"); s.textContent = t; document.head.appendChild(s); };
    if (l === "L1") css(".tws { --tws-w: calc(var(--hsheet-w, 100%) - 80px) !important; }");
    if (l === "L2") { const sp = document.createElement("span"); sp.textContent = "Sending Clara your partial is highest priority right now"; root.querySelector('[data-tws="header"]')!.appendChild(sp); }
    if (l === "L3") { const st = root.querySelector('[data-tws="start"]'); if (st) root.querySelector('[data-tws="header"]')!.appendChild(st); }
    if (l === "L4") css(".tws-wp { width: 30vw !important; }");
    if (l === "L5") document.addEventListener("mouseover", (e) => { const t = e.target as HTMLElement; if (t.closest('[data-tws="tray"][data-slim]')) (document.querySelector('[data-tws="expand"]') as HTMLElement | null)?.click(); });
    if (l === "L7") css(".tws-wf { overflow: hidden !important; } .tws-wf .tws-sb { width: auto !important; padding: 0 12px !important; } .tws-wf .tws-sb span, .tws-wf .tws-sb kbd { display: inline !important; } .tws-wf em.tws-prog { display: inline !important; } .tws-wf .tws-go { flex: 0 0 auto !important; }");
    if (l === "L8") document.addEventListener("click", (e) => { const t = e.target as HTMLElement; if (t.closest(".tws-q") && !t.closest('[data-tws="primary"]')) window.setTimeout(() => (document.querySelector('[data-tws="primary"][data-next]') as HTMLElement | null)?.click(), 380); }, true);
    if (l === "L12") for (const hk of root.querySelectorAll(".tws-hk")) { const av = document.createElement("span"); av.className = "tws-av"; av.textContent = "AB"; hk.replaceWith(av); }
  }, lock);
}
/* the breaks that need the desk in a state first */
async function mutateDesk(page: Page, lock: string) {
  if (MUT !== lock) return;
  await page.evaluate((l) => {
    const root = [...document.querySelectorAll<HTMLElement>('[data-tws="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
    if (l === "L6") { const q = root.querySelector(".tws-q"); if (q) { const c = q.cloneNode(true) as HTMLElement; c.setAttribute("data-tws-q", "__upcoming"); q.after(c); } }
    if (l === "L9") { const t = root.querySelector<HTMLElement>(".tws-dstrip .tws-dchip2"); t?.setAttribute("aria-pressed", "true"); }
    if (l === "L10") { const b = document.createElement("button"); b.className = "tws-lnk"; b.textContent = "Check it on the card first"; root.querySelector(".tws-wq")!.appendChild(b); }
  }, lock);
}

const desk = (page: Page) => page.locator(`${PG} [data-tws="desk"]`);
const primary = (page: Page) => desk(page).locator('[data-tws="primary"]');

/** the open question's key, or "summary" / "none" */
async function stepKey(page: Page): Promise<string> {
  return page.evaluate(() => {
    const root = [...document.querySelectorAll<HTMLElement>('[data-tws="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
    const qs = [...root.querySelectorAll<HTMLElement>("[data-tws-q]")];
    if (qs.length) return qs.map((q) => q.getAttribute("data-tws-q")).join("+");
    return root.querySelector('[data-tws="story"]') ? "summary" : "none";
  });
}

/** answer the open question with its first choice; returns whether a choice control was pressed */
async function answer(page: Page): Promise<boolean> {
  const q = desk(page).locator(".tws-q").first();
  const tile = q.locator(".tws-tile:not(:disabled)").first();
  if (await tile.count()) { await tile.click(); return true; }
  const range = q.locator('input[type="range"]');
  if (await range.count()) { await range.focus(); await page.keyboard.press("ArrowRight"); return true; }
  const ta = q.locator("textarea");
  if (await ta.count()) { await ta.fill("Upmarket book club fiction."); return true; }
  const chip = q.locator(".tws-dchip2").nth(1);
  if (await chip.count()) { await chip.click(); return true; }
  return false;
}

/** the primary button's box against its column and the viewport, and what owns its centre */
async function primaryReading(page: Page) {
  return page.evaluate(() => {
    const root = [...document.querySelectorAll<HTMLElement>('[data-tws="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
    const p = root.querySelector<HTMLElement>('[data-tws="primary"]');
    const col = root.querySelector<HTMLElement>('[data-tws="qcol"]');
    if (!p || !col) return { has: !!p, ok: !p };
    const r = p.getBoundingClientRect(), c = col.getBoundingClientRect();
    const inCol = r.left >= c.left - 0.5 && r.right <= c.right + 0.5 && r.top >= c.top - 0.5 && r.bottom <= c.bottom + 0.5;
    const inVp = r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight;
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    const hit = !!top && p.contains(top);
    return { has: true, ok: inCol && inVp && hit, inCol, inVp, hit, r: [r.left, r.top, r.width, r.height].map((x) => Math.round(x)), col: [c.left, c.right].map((x) => Math.round(x)), label: (p.textContent ?? "").trim() };
  });
}

/** one row of each kind the tray holds (the first of each) */
async function kindsInTray(page: Page): Promise<{ kind: string; key: string }[]> {
  const more = page.locator(`${PG} .tws-more`);
  if (await more.count()) await more.first().click();
  return page.evaluate(() => {
    const root = [...document.querySelectorAll<HTMLElement>('[data-tws="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
    const out: { kind: string; key: string }[] = []; const seen = new Set<string>();
    for (const r of root.querySelectorAll<HTMLElement>("[data-tws-row]")) {
      const t = (r.querySelector(".tws-tx b")?.textContent ?? "").trim();
      const kind = /^Send .* your (full|partial)/.test(t) ? "send" : /^Answer .* offer/.test(t) ? "offer" : /^Nudge/.test(t) ? "nudge" : /gone quiet/.test(t) ? "quiet"
        : /take to reply/.test(t) ? "reply-time" : /wishlist/.test(t) ? "wishlist" : /^Fill in what you sent/.test(t) ? "batch" : r.querySelector('[data-k="own"]') ? "own" : "other";
      if (seen.has(kind)) continue;
      seen.add(kind); out.push({ kind, key: r.getAttribute("data-tws-row")! });
    }
    return out;
  });
}
const rowByKey = (page: Page, key: string): Locator => page.locator(`${PG} [data-tws-row="${key.replace(/"/g, '\\"')}"]`).first();

/* ══ L1 width · L4 widths ═══════════════════════════════════════════════════════════════════════════════════════ */
for (const vp of SIZES) {
  test(`L1 + L4 · the frame and the fixed widths at ${vp.width}`, async ({ page }) => {
    await open(page, vp);
    await mutate(page, "L1"); await mutate(page, "L4");
    await page.locator(`${PG} [data-tws-row]`).first().click();
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => {
      const root = [...document.querySelectorAll<HTMLElement>('[data-tws="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
      const b = (s: string) => { const e = root.querySelector<HTMLElement>(s); if (!e) return null; const x = e.getBoundingClientRect(); return { l: x.left, r: x.right, w: x.width }; };
      const sc = root.closest<HTMLElement>(".wpg-scroll")!; const sr = sc.getBoundingClientRect();
      return { hd: b('[data-tws="header"]'), ws: b('[data-tws="workspace"]'), tray: b('[data-tws="tray"]'), wp: b('[data-tws="side"]'), sc: { l: sr.left, r: sr.right }, sh: sc.scrollHeight, ch: sc.clientHeight };
    });
    note(`L1-${vp.width}${MUT ? `-${MUT}` : ""}`, r);
    expect(r.hd && r.ws, "header and workspace are drawn").toBeTruthy();
    expect(Math.abs(r.hd!.l - r.ws!.l), "L1: equal left edges").toBeLessThanOrEqual(1);
    expect(Math.abs(r.hd!.r - r.ws!.r), "L1: equal right edges").toBeLessThanOrEqual(1);
    expect(r.hd!.w, "L1: at most 1320 wide").toBeLessThanOrEqual(1320.5);
    expect(Math.abs((r.hd!.l - r.sc.l) - (r.sc.r - r.hd!.r)), "L1: centred in the page").toBeLessThanOrEqual(1);
    expect(r.sh, "L1: the page itself does not scroll").toBe(r.ch);
    expect(Math.abs(r.tray!.w - 340), "L4: the tray is 340").toBeLessThanOrEqual(1);
    expect(r.wp, "L4: the preview is drawn").not.toBeNull();
    expect(Math.abs(r.wp!.w - 390), "L4: the preview is 390").toBeLessThanOrEqual(1);
  });
}

/* ══ L2 header ══════════════════════════════════════════════════════════════════════════════════════════════════ */
/* RE-POINTED (workspace width v2, 8 Nov): the navy card is gone. The header is one light row: the book's name (one
   book) or "To-do list", a late pill (absent at 0), a to-do pill, + Add a task. "Cleared this week" left the header;
   the Done tab and its intro still say it (L14). */
test("L2 · the header: title, pills, + Add a task; no priority line", async ({ page }) => {
  test.skip(true, "Retired by To-do list v53 — v53 D2: the thin header has no pills; TD53 L10 and the header's own words replace it.");
  await open(page, SIZES[1]);
  await mutate(page, "L2"); await mutate(page, "L3");
  const hd = page.locator(`${PG} [data-tws="header"]`);
  const title = ((await hd.locator("h1").textContent()) ?? "").trim();
  const todo = ((await hd.locator('[data-tws="todo-pill"]').textContent()) ?? "").replace(/\s+/g, " ").trim();
  const late = await hd.locator('[data-tws="late-pill"]').count() ? ((await hd.locator('[data-tws="late-pill"]').textContent()) ?? "").replace(/\s+/g, " ").trim() : null;
  note(`L2${MUT ? `-${MUT}` : ""}`, { title, todo, late, text: await hd.textContent() });
  expect(title.length, "the title row names the page or the book").toBeGreaterThan(0);
  expect(todo).toMatch(/^\d+ to do$/);
  if (late !== null) expect(late).toMatch(/^● [1-9]\d* late$/);
  expect(await hd.textContent(), "the header no longer says how many were cleared").not.toMatch(/cleared/);
  await expect(hd.getByRole("button", { name: "+ Add a task" })).toBeVisible();
  const bad = await hd.evaluate((h) => [...h.querySelectorAll("*")].filter((e) => /highest priority|Start here/.test(e.textContent ?? "")).length);
  expect(bad, "nothing in the header says “highest priority” or “Start here”").toBe(0);
});

/* ══ L3 Start here ══════════════════════════════════════════════════════════════════════════════════════════════ */
test("L3 · Start here: first in the To do list; the quill, the phrase; opens its task; absent elsewhere", async ({ page }) => {
  test.skip(true, "Retired by To-do list v53 — v53 D4: Start here is gone; TD53 L10 holds its absence.");
  await open(page, SIZES[1]);
  await mutate(page, "L3");
  const list = page.locator(`${PG} [data-tws="list"]`);
  const first = await list.evaluate((l) => l.firstElementChild?.getAttribute("data-tws") ?? null);
  expect(first, "Start here is the list's first child").toBe("start");
  const st = list.locator('[data-tws="start"]');
  expect(await st.locator("img").getAttribute("src")).toMatch(/quill/);
  const phrase = ((await st.locator('[data-tws="start-phrase"]').textContent()) ?? "").trim();
  /* the phrase is the builder's (lib/todoWs doingPhrase, its apostrophe locks in todoWs.test.ts): never raw card text */
  expect(phrase).toMatch(/^(Answering|Sending|Nudging|Deciding what to do about|Adding|Filling in|Telling|Checking on|Querying|Starting to query) /);
  await st.click();
  await page.waitForTimeout(400);
  const cur = page.locator(`${PG} [data-tws-row][aria-current="true"]`);
  await expect(cur).toHaveCount(1);
  await expect(st.locator("em")).toHaveText("You’re on it");
  await expect(st.locator(".tws-sarr")).toHaveCount(0);
  note(`L3${MUT ? `-${MUT}` : ""}`, { phrase, row: await cur.getAttribute("data-tws-row"), desk: await desk(page).locator('[data-tws="desk-title"]').textContent() });
  for (const tab of ["Snoozed", "Done"]) {
    await page.locator(`${PG} .tws-seg button`, { hasText: tab }).click();
    await expect(page.locator(`${PG} [data-tws="start"]`), `no Start here in ${tab}`).toHaveCount(0);
  }
  await page.locator(`${PG} .tws-seg button`, { hasText: "To do" }).click();
  await page.locator(`${PG} [data-tws="collapse"]`).click();
  await expect(page.locator(`${PG} [data-tws="start"]`), "no Start here in the collapsed strip").toHaveCount(0);
  await page.locator(`${PG} [data-tws="expand"]`).click();
});

/* ══ L5 collapse ════════════════════════════════════════════════════════════════════════════════════════════════ */
test("L5 · the collapse: 112, the desk gains it, no hover-open, it survives a reload, every item is labelled", async ({ page }) => {
  await open(page, SIZES[1]);
  await mutate(page, "L5");
  const w = (sel: string) => page.locator(`${PG} ${sel}`).evaluate((e) => e.getBoundingClientRect().width);
  const deskBefore = await w('[data-tws="desk-col"]');
  await page.locator(`${PG} [data-tws="collapse"]`).click();
  await page.waitForTimeout(300);
  expect(Math.abs((await w('[data-tws="tray"]')) - 112)).toBeLessThanOrEqual(1);
  expect(Math.abs((await w('[data-tws="desk-col"]')) - deskBefore - 228), "the desk gains the freed width").toBeLessThanOrEqual(1.5);
  await page.locator(`${PG} [data-tws="tray"] [data-tws-strip]`).nth(1).hover();
  await page.waitForTimeout(1000);
  expect(Math.abs((await w('[data-tws="tray"]')) - 112), "hovering the strip does not expand it").toBeLessThanOrEqual(1);
  const items = await page.locator(`${PG} [data-tws-strip]`).evaluateAll((els) => els.map((e) => ({
    name: e.querySelector('[data-tws="strip-name"]')?.textContent ?? "", what: e.querySelector('[data-tws="strip-what"]')?.textContent ?? "",
    when: e.querySelector('[data-tws="strip-when"]')?.textContent ?? null, title: e.getAttribute("title"),
  })));
  note(`L5${MUT ? `-${MUT}` : ""}`, { n: items.length, sample: items.slice(0, 12), withWhen: items.filter((i) => i.when).length });
  expect(items.length).toBeGreaterThan(3);
  for (const i of items) { expect(i.name.trim(), `a first name: ${i.title}`).not.toBe(""); expect(i.what.trim(), `a kind: ${i.title}`).not.toBe(""); }
  expect(items.filter((i) => i.when).length, "dated items carry a due label").toBeGreaterThan(0);
  await page.reload();
  await expect(page.locator(PG)).toHaveCount(1, { timeout: 30_000 });
  await page.waitForTimeout(600);
  expect(Math.abs((await w('[data-tws="tray"]')) - 112), "the collapse survives a reload").toBeLessThanOrEqual(1);
  await page.locator(`${PG} [data-tws="expand"]`).click();
  await page.waitForTimeout(300);
  expect(Math.abs((await w('[data-tws="tray"]')) - 340), "All tasks restores it").toBeLessThanOrEqual(1);
});

/* ══ L6 one question · L7 footer button · L8 no auto-advance ═══════════════════════════════════════════════════════ */
type StepRead = { kind: string; step: number; key: string; qs: number; chips: number; p: Awaited<ReturnType<typeof primaryReading>> };
async function walkAll(page: Page, kinds: { kind: string; key: string }[], opts: { checkL6: boolean; checkL8: boolean; tag: string }): Promise<StepRead[]> {
  const out: StepRead[] = [];
  expect(kinds.length, "the tray holds several kinds").toBeGreaterThan(3);
  for (const { kind, key } of kinds) {
    await rowByKey(page, key).click();
    await page.waitForTimeout(350);
    const keys: string[] = [];
    for (let step = 0; step < 8; step++) {
      await mutateDesk(page, "L6");
      const k0 = await stepKey(page);
      keys.push(k0);
      const shape = await page.evaluate(() => {
        const root = [...document.querySelectorAll<HTMLElement>('[data-tws="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
        /* v53 (D6): an earlier answer is a finished step on the rail, one line each (it was a chip in v52) */
        return { qs: root.querySelectorAll("[data-tws-q]").length, chips: root.querySelectorAll('[data-tws="rail"] [data-st="done"] [data-tws-qa]').length };
      });
      const p = await primaryReading(page);
      out.push({ kind, step, key: k0, qs: shape.qs, chips: shape.chips, p });
      if (opts.checkL6 && k0 !== "summary" && k0 !== "none") {
        expect(shape.qs, `L6 ${kind} step ${step}: exactly one open question`).toBe(1);
        expect(shape.chips, `L6 ${kind} step ${step}: each earlier answer is a finished step on the rail`).toBe(step);
      }
      expect(p.ok, `L7 ${opts.tag} ${kind} step ${step}: the primary sits in its column, on screen, and owns its centre ${JSON.stringify(p)}`).toBe(true);
      const btn = primary(page);
      if (!(await btn.count()) || k0 === "summary" || k0 === "none" || !(await btn.getAttribute("data-next") !== null)) break;
      if (!(await btn.isEnabled())) {
        const pressed = await answer(page);
        if (opts.checkL8 && pressed) {
          await page.waitForTimeout(1000);
          expect(await stepKey(page), `L8 ${kind} step ${step}: a choice alone does not move on`).toBe(k0);
        }
      }
      if (!(await btn.isEnabled())) break;
      await btn.click();
      await page.waitForTimeout(250);
      const k1 = await stepKey(page);
      if (opts.checkL8) expect(k1, `L8 ${kind} step ${step}: the primary moves on by one`).not.toBe(k0);
      /* L6: a chip goes back to its question with the later answers kept */
      /* (two answers in, now on the third question) */
      if (opts.checkL6 && step === 1 && k1 !== "summary" && k1 !== "none") {
        /* v53 (D6): the earlier answer is a finished step on the rail, and its "change" goes back */
        const chip0 = desk(page).locator('[data-tws="rail"] [data-st="done"] [data-tws-qa]').first();
        const back = await chip0.getAttribute("data-tws-qa");
        await chip0.locator(".tws-chg").click();
        await page.waitForTimeout(200);
        expect(await stepKey(page), `L6 ${kind}: the chip returns to its question`).toBe(back);
        expect(back).toBe(keys[0]);
        await expect(primary(page), `L6 ${kind}: its answer is kept`).toBeEnabled();
        await primary(page).click();
        await page.waitForTimeout(200);
        expect(await stepKey(page)).toBe(keys[1]);
        await expect(primary(page), `L6 ${kind}: the later answer is kept too`).toBeEnabled();
        await primary(page).click();
        await page.waitForTimeout(200);
        expect(await stepKey(page), `L6 ${kind}: back where it was`).toBe(k1);
      }
    }
  }
  return out;
}

test("L6 + L8 · one question at a time; nothing moves on until the primary is pressed (1512)", async ({ page }) => {
  test.setTimeout(240_000);
  await open(page, SIZES[1]);
  await mutate(page, "L8");
  const r = await walkAll(page, await kindsInTray(page), { checkL6: true, checkL8: true, tag: "1512 open" });
  note(`L6L8${MUT ? `-${MUT}` : ""}`, r);
});

for (const vp of SIZES) {
  for (const slim of [false, true]) {
    test(`L7 · the primary is always in its column and on screen (${vp.width}, tray ${slim ? "collapsed" : "open"})`, async ({ page }) => {
      test.setTimeout(240_000);
      await open(page, vp);
      const kinds = await kindsInTray(page);
      if (slim) { await page.locator(`${PG} [data-tws="collapse"]`).click(); await page.waitForTimeout(300); }
      await mutate(page, "L7");
      const r = await walkAll(page, kinds, { checkL6: false, checkL8: false, tag: `${vp.width} ${slim ? "slim" : "open"}` });
      note(`L7-${vp.width}-${slim ? "slim" : "open"}${MUT ? `-${MUT}` : ""}`, r.map((x) => ({ kind: x.kind, step: x.step, key: x.key, p: x.p })));
      if (slim) { await page.locator(`${PG} [data-tws="expand"]`).click(); }
    });
  }
}

/* ══ L9 date ════════════════════════════════════════════════════════════════════════════════════════════════════ */
test("L9 · the date: with the month open only Older is selected; the month clears the footer; no hint", async ({ page }) => {
  test.skip(true, "Retired by To-do list v53 — v53 D5: the date is three tiles (Today, Yesterday, Older); TD53 L2 walks every step.");
  await open(page, SIZES[0]);
  const send = page.locator(`${PG} [data-tws-row]`).filter({ hasText: /^Send .* your (full|partial)/ }).first();
  await send.click();
  await page.waitForTimeout(300);
  for (let i = 0; i < 4 && !(await desk(page).locator('.tws-q [data-tws="date"]').count()); i++) {
    if (!(await primary(page).isEnabled())) await answer(page);
    await primary(page).click();
    await page.waitForTimeout(250);
  }
  await desk(page).locator('.tws-q [aria-label="An older date"]').click();
  await page.waitForTimeout(400);
  await mutateDesk(page, "L9");
  const r = await page.evaluate(() => {
    const root = [...document.querySelectorAll<HTMLElement>('[data-tws="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
    const chips = [...root.querySelectorAll<HTMLElement>(".tws-dstrip .tws-dchip2")];
    const sel = chips.filter((c) => getComputedStyle(c).backgroundColor === "rgb(42, 58, 82)").map((c) => (c.textContent ?? "").replace(/\s+/g, " ").trim());
    const cal = root.querySelector<HTMLElement>('[data-tws="calendar"]')!.getBoundingClientRect();
    const ft = root.querySelector<HTMLElement>('[data-tws="footer"]')!.getBoundingClientRect();
    const meet = !(cal.bottom <= ft.top || cal.top >= ft.bottom || cal.right <= ft.left || cal.left >= ft.right);
    return { sel, meet, cal: [cal.top, cal.bottom], foot: [ft.top, ft.bottom], hint: /Today’s picked/.test(root.textContent ?? "") };
  });
  note(`L9${MUT ? `-${MUT}` : ""}`, r);
  expect(r.sel.length, `only one chip is selected: ${JSON.stringify(r.sel)}`).toBe(1);
  expect(r.sel[0]).toMatch(/^Older/);
  expect(r.meet, "the month and the footer do not meet").toBe(false);
  expect(r.hint, "no “Today’s picked” hint").toBe(false);
});

/* ══ L10 no review route (writes, and puts the account back) ═══════════════════════════════════════════════════════ */
/** Every document write on Firestore's write channel while `fn` runs: the path under /documents/, the fields it sets,
 *  and its update mask (a field in the mask but not in `fields` is a delete). Read from the request bodies, so it
 *  counts DOCUMENTS, never requests: the SDK may batch several writes into one request, or split them across several. */
interface DocWrite { path: string; fields: string[]; mask: string[] | null }
async function docWritesDuring(page: Page, fn: () => Promise<void>, settleMs = 2500): Promise<DocWrite[]> {
  const out: DocWrite[] = [];
  const on = (req: import("@playwright/test").Request) => {
    if (req.method() !== "POST" || !/\/Write\/channel/.test(req.url())) return;
    const body = new URLSearchParams(req.postData() ?? "");
    for (const [k, v] of body) {
      if (!/^req\d+___data__$/.test(k)) continue;
      let j: { writes?: { update?: { name: string; fields?: Record<string, unknown> }; updateMask?: { fieldPaths?: string[] } }[] };
      try { j = JSON.parse(v); } catch { continue; }
      for (const w of j.writes ?? []) {
        if (!w.update) continue;
        out.push({ path: w.update.name.split("/documents/")[1] ?? w.update.name, fields: Object.keys(w.update.fields ?? {}).sort(), mask: w.updateMask?.fieldPaths?.slice().sort() ?? null });
      }
    }
  };
  page.on("request", on);
  try { await fn(); await page.waitForTimeout(settleMs); } finally { page.off("request", on); }
  return out;
}
test("L10 · no review route: Log it saves once and lands on the celebration (then Undo)", async ({ page }) => {
  test.skip(true, "Retired by To-do list v53 — v53 D10: the celebration is gone; TD53 L7 holds the three writes, the snackbar and Undo.");
  /* the log-and-undo steps are todoWs.measure.ts's own ("a nudge, logged and undone"), which restore the account */
  await open(page, SIZES[1]);
  const pg = page.locator(PG);
  const nudge = pg.locator("[data-tws-row]").filter({ hasText: /^Nudge / }).first();
  test.skip(!(await nudge.count()), "the account has no nudge task");
  const title = ((await nudge.locator(".tws-tx b").textContent()) ?? "").trim();
  await nudge.click();
  const d = desk(page);
  await d.locator('[data-tws-q="sent"] .tws-tile').click();
  await d.locator('[data-tws="primary"][data-next]').click();
  await d.locator('[data-tws="primary"][data-next]').click();
  await expect(d.locator('[data-tws="story"]')).toContainText("You nudged");
  await mutateDesk(page, "L10");
  const link = await d.getByText("Check it on the card first").count();
  /* asserted before anything is written, so a red here changes nothing on the account */
  expect(link, "nothing on the desk says “Check it on the card first”").toBe(0);
  const log = d.locator('[data-tws="primary"][data-log]');
  await expect(log).toBeEnabled();
  let presses = 0;
  const docs = await docWritesDuring(page, async () => {
    await log.click(); presses++;
    /* a second press, straight after: it must not land (the button is gone or disabled) */
    await log.click({ timeout: 300 }).then(() => presses++).catch(() => undefined);
  });
  const yay = page.locator('[data-tws="yay"]:visible');
  await expect(yay).toBeVisible({ timeout: 15_000 });
  await expect(yay).toContainText("Nudge logged.");
  await expect(pg.locator("[data-tws-row]").filter({ hasText: title })).toHaveCount(0, { timeout: 15_000 });
  /* put the account back before any assertion can stop the run (see `note`: nothing is written to disk mid-test) */
  await yay.getByRole("button", { name: "Undo" }).click();
  await expect(pg.locator("[data-tws-row]").filter({ hasText: title })).toHaveCount(1, { timeout: 20_000 });
  note(`L10${MUT ? `-${MUT}` : ""}`, { link, docs, presses, title });
  /* exactly three documents, each written once (saveNudgeSent, lib/queryActions/stepSaves.ts): the step in the query's
     own log, its projection in the global feed (one id, two stores), and the query's two nudge fields with the planned
     nudge date cleared. Nothing completes a task: the nudge task is derived from the query, so these fields clear it. */
  const shape = docs.map((d) => {
    const rel = d.path.replace(/^users\/[^/]+\//, "");
    const kind = /^queries\/[^/]+\/activity\/act-/.test(rel) ? "step" : /^activities\/act-/.test(rel) ? "feed" : /^queries\/[^/]+$/.test(rel) ? "query" : rel;
    return { kind, fields: d.fields.join(","), mask: d.mask?.join(",") ?? null };
  });
  expect(shape, "one press writes exactly these three documents, once each").toEqual([
    { kind: "step", fields: "agentName,createdAt,eventKey,note,queryId,reminderDate,type", mask: null },
    { kind: "feed", fields: "activityType,date,description,details,eventKey,id,manuscriptId,queryId,userId", mask: null },
    { kind: "query", fields: "closePlan,lastNudgeSentDate", mask: "closePlan,lastNudgeSentDate,nudgeDate" },
  ]);
  const ids = docs.filter((d) => /\/act-/.test(d.path)).map((d) => d.path.split("/").pop());
  expect(new Set(ids).size, "the step and its feed row share one id").toBe(1);
  expect(presses, "Log it takes one press: a second cannot land").toBe(1);
});

/* ══ L11 live card ══════════════════════════════════════════════════════════════════════════════════════════════ */
test("L11 · the preview is the Query Centre's own card, and the Contact list's for an agent task", async ({ page }) => {
  test.setTimeout(120_000);
  await open(page, SIZES[1]);
  const send = page.locator(`${PG} [data-tws-row]`).filter({ hasText: /^Send .* your (full|partial)/ }).first();
  await send.click();
  await page.waitForTimeout(800);
  const pv = page.locator(`${PG} [data-tws="preview-card"]`);
  const readCard = (root: Locator) => root.evaluate((r) => {
    const c = r.querySelector<HTMLElement>('[data-qc152="card"]');
    if (!c) return null;
    const t = (s: string) => (c.querySelector(s)?.textContent ?? "").replace(/\s+/g, " ").trim();
    return { id: c.getAttribute("data-id"), band: t('[data-qc152="band-word"]'), pill: t('[data-qc152="pill"]'), name: t('[data-qc149c="name"]'), tabs: [...c.querySelectorAll('[data-qc152="tab"]')].map((x) => x.textContent?.trim()) };
  });
  const mine = await readCard(pv);
  expect(mine, "the preview's root is the Query Centre card (data-qc152=card)").not.toBeNull();
  /* the same query, opened on the Query Centre */
  const qid = mine!.id;
  await page.locator(`${PG} [data-tws="preview"]`).click();
  const real = page.locator(".spanel.qsp:not(.tws-pvpanel)").first();
  await expect(real).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(800);
  const theirs = await readCard(real);
  note(`L11${MUT ? `-${MUT}` : ""}`, { mine, theirs, qid });
  expect(theirs, "the Query Centre opens the same card").not.toBeNull();
  expect(theirs!.id, "the same query").toBe(qid);
  expect(mine!.band).toBe(theirs!.band);
  expect(mine!.pill).toBe(theirs!.pill);
  expect(mine!.name).toBe(theirs!.name);
  expect(mine!.tabs).toEqual(theirs!.tabs);
  expect(mine!.tabs).toEqual(["Tracking", "Agent", "Materials", "Notes"]);
  await page.keyboard.press("Escape");
  /* an agent task: the address book's card */
  await open(page, SIZES[1]);
  const more = page.locator(`${PG} .tws-more`);
  if (await more.count()) await more.first().click();
  /* v53 (D4): Housekeeping starts folded */
  const fold = page.locator(`${PG} [data-tws-group="house"] .tws-gb[aria-expanded="false"]`);
  if (await fold.count()) await fold.click();
  if (await more.count()) await more.first().click();
  const fix = page.locator(`${PG} [data-tws-row]`).filter({ hasText: /take to reply|wishlist/ }).first();
  await fix.click();
  await page.waitForTimeout(800);
  expect(await page.locator(`${PG} [data-tws="preview-card"] .cl262-card`).count(), "the agent preview is AgentCard262").toBe(1);
});

/* ══ L12 housekeeping ═══════════════════════════════════════════════════════════════════════════════════════════ */
test("L12 · Housekeeping: the slate header, icon tiles with initials, Quick fill, no “No date”", async ({ page }) => {
  test.skip(true, "Retired by To-do list v53 — v53 D4: housekeeping starts folded with a form icon per row; TD53 L10 + L11 hold it.");
  await open(page, SIZES[1]);
  await mutate(page, "L12");
  const r = await page.evaluate(() => {
    const root = [...document.querySelectorAll<HTMLElement>('[data-tws="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
    const head = root.querySelector<HTMLElement>('.tws-gb[data-band="house"]');
    const rows: { title: string; tile: boolean; badge: boolean; chip: string; noDate: boolean }[] = [];
    for (let e = head?.nextElementSibling; e && !e.classList.contains("tws-gb"); e = e.nextElementSibling) {
      if (!e.hasAttribute("data-tws-row")) continue;
      const t = (e.querySelector(".tws-tx b")?.textContent ?? "").trim();
      rows.push({ title: t, tile: !!e.querySelector(".tws-hk"), badge: !!e.querySelector(".tws-hk i"), chip: e.querySelector('[data-tws="quick-fill"]')?.textContent ?? "", noDate: /No date/.test(e.textContent ?? "") });
    }
    return { bg: head ? getComputedStyle(head).backgroundColor : null, rows };
  });
  note(`L12${MUT ? `-${MUT}` : ""}`, r);
  expect(r.bg).toBe("rgb(228, 235, 241)");
  expect(r.rows.length).toBeGreaterThan(0);
  for (const x of r.rows) {
    expect(x.tile, `${x.title}: an icon tile`).toBe(true);
    if (!/^Fill in what you sent/.test(x.title)) expect(x.badge, `${x.title}: an initials badge`).toBe(true);
    expect(x.chip).toBe("Quick fill");
    expect(x.noDate, `${x.title}: no “No date”`).toBe(false);
  }
});

/* ══ L14 one count for "cleared this week" (7 Nov) ═══════════════════════════════════════════════════════════════════
   Fixtures written straight to the emulator (owner token, so no rules), and removed in the same run: one own task
   ticked off now, one dismissal now, and one dismissal eight days ago (always before this week's Monday). The header
   and the Done tab must say the same number, the tab must show exactly that many rows, and last week's dismissal must
   not be among them. */
const EMU = "http://127.0.0.1:8085/v1/projects/demo-scriptally/databases/(default)/documents";
const OWNER = { Authorization: "Bearer owner", "Content-Type": "application/json" };
const fsVal = (v: unknown): unknown => typeof v === "boolean" ? { booleanValue: v } : typeof v === "number" ? { integerValue: String(v) } : { stringValue: String(v) };
const fsDoc = (o: Record<string, unknown>) => ({ fields: Object.fromEntries(Object.entries(o).map(([k, v]) => [k, fsVal(v)])) });
async function emuPut(path: string, o: Record<string, unknown>) {
  const r = await fetch(`${EMU}/${path}`, { method: "PATCH", headers: OWNER, body: JSON.stringify(fsDoc(o)) });
  if (!r.ok) throw new Error(`emulator write ${path}: ${r.status} ${await r.text()}`);
}
const emuDel = (path: string) => fetch(`${EMU}/${path}`, { method: "DELETE", headers: OWNER });

test("L14 · one count: the Done tab and its intro both say how many were cleared this week, and nothing older shows", async ({ page }) => {
  test.setTimeout(120_000);
  await open(page, SIZES[1]);
  const uid = await page.evaluate(() => {
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i)!; if (k.startsWith("firebase:authUser:")) return JSON.parse(localStorage.getItem(k)!).uid as string; }
    return null;
  }) ?? await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((res, rej) => { const o = indexedDB.open("firebaseLocalStorageDb"); o.onsuccess = () => res(o.result); o.onerror = () => rej(o.error); });
    const all = await new Promise<{ value: { uid: string } }[]>((res) => { const r = db.transaction("firebaseLocalStorage").objectStore("firebaseLocalStorage").getAll(); r.onsuccess = () => res(r.result); });
    return all.find((x) => x.value?.uid)?.value.uid ?? null;
  });
  expect(uid, "the signed-in uid").toBeTruthy();
  const ag = await (await fetch(`${EMU}/users/${uid}/agents?pageSize=2`, { headers: OWNER })).json() as { documents?: { name: string }[] };
  const [a1, a2] = (ag.documents ?? []).map((d) => d.name.split("/").pop()!);
  expect(a2, "two agents on the account").toBeTruthy();
  const now = Date.now();
  const paths = { done: `users/${uid}/tasks/td52-l14-done`, mine: `users/${uid}/taskFlags/td52-l14-this`, old: `users/${uid}/taskFlags/td52-l14-last` };
  const tabBtn = page.locator(`${PG} .tws-seg button`, { hasText: "Done" });
  const nOf = async (l: Locator) => Number(((await l.textContent()) ?? "").match(/(\d+) cleared this week|Done\s*(\d+)/)?.slice(1).find(Boolean) ?? NaN);
  try {
    await emuPut(paths.done, { id: "td52-l14-done", userId: uid, text: "L14 ticked off this week", done: true, createdAt: new Date(now - 3600e3).toISOString(), completedAt: new Date(now).toISOString() });
    await emuPut(paths.mine, { id: "td52-l14-this", userId: uid, taskType: "data_quality_poor", agentId: a1, snoozeCount: 0, skippedAt: new Date(now).toISOString() });
    await emuPut(paths.old, { id: "td52-l14-last", userId: uid, taskType: "data_quality_poor", agentId: a2, snoozeCount: 0, skippedAt: new Date(now - 8 * 864e5).toISOString() });
    await mutate(page, "L14");
    await tabBtn.click();
    const list = page.locator(`${PG} [data-tws-done]`);
    await expect(page.locator(`${PG} [data-tws-done="task:td52-l14-done"]`)).toHaveCount(1, { timeout: 15_000 });
    await expect(page.locator(`${PG} [data-tws-done="flag-td52-l14-this"]`)).toHaveCount(1);
    const tab = await nOf(tabBtn), rows = await list.count();
    const lastShown = await page.locator(`${PG} [data-tws-done="flag-td52-l14-last"]`).count();
    const intro = ((await page.locator(`${PG} .tws-note`).first().textContent()) ?? "").replace(/\s+/g, " ").trim();
    note(`L14${MUT ? `-${MUT}` : ""}`, { tab, rows, lastShown, intro });
    expect(lastShown, "last week's dismissal is not shown").toBe(0);
    expect(tab, "the Done tab's count is the rows it shows").toBe(rows);
    /* workspace width v2: the header no longer states this count; the tab and its intro are the two that must agree */
    expect(intro).toBe(`${tab} cleared this week. Anything you dismissed is here too, in case you change your mind.`);
    expect(rows, "with only the fixtures this week, the count is 2 (the harness snapshot holds nothing cleared this week)").toBe(2);
  } finally {
    await Promise.all(Object.values(paths).map(emuDel));
  }
});

/* ══ L15 the way back for a switched-off rule (7 Nov) ════════════════════════════════════════════════════════════════
   Switch off "reply time, every agent" from a reply-time task's Dismiss pop-up; the rule is listed under "Tasks you've
   switched off" on the Done tab; Turn back on brings every reply-time task back to To do; the toast's Undo takes them
   away again. The account's mutedTaskRules and todoPrefs.switchedOffAt are put back from what was read first. */
test("L15 · a switched-off rule is listed, comes back on, and Undo switches it off again", async ({ page }) => {
  test.setTimeout(180_000);
  await open(page, SIZES[1]);
  const uid = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((res, rej) => { const o = indexedDB.open("firebaseLocalStorageDb"); o.onsuccess = () => res(o.result); o.onerror = () => rej(o.error); });
    const all = await new Promise<{ value: { uid: string } }[]>((res) => { const r = db.transaction("firebaseLocalStorage").objectStore("firebaseLocalStorage").getAll(); r.onsuccess = () => res(r.result); });
    return all.find((x) => x.value?.uid)?.value.uid ?? null;
  });
  expect(uid, "the signed-in uid").toBeTruthy();
  const userDoc = `${EMU}/users/${uid}`;
  const before = await (await fetch(userDoc, { headers: OWNER })).json() as { fields?: Record<string, unknown> };
  const pg = page.locator(PG);
  const more = pg.locator(".tws-more");
  /* v53 (D4): Housekeeping starts folded, so it is opened first */
  const replyRows = async () => {
    const fold = pg.locator('[data-tws-group="house"] .tws-gb[aria-expanded="false"]');
    if (await fold.count()) await fold.click().catch(() => undefined);
    if (await more.count()) await more.first().click().catch(() => undefined);
    return pg.locator("[data-tws-row]").filter({ hasText: /take to reply/ }).count();
  };
  try {
    const n0 = await replyRows();
    expect(n0, "the account has reply-time tasks to switch off").toBeGreaterThan(0);
    await pg.locator("[data-tws-row]").filter({ hasText: /take to reply/ }).first().click();
    await pg.locator('[data-tws="footer"] .tws-sb').nth(1).click();
    const dp = page.locator('[data-tws="dismiss-pop"]');
    await dp.locator(".tws-po", { hasText: /Stop asking about missing reply times/ }).click();
    await expect(dp.locator(".tws-po", { hasText: /Stop asking/ }).locator("small")).toHaveText("You can turn them back on from the Done tab.");
    await dp.locator(".tws-go").click();
    await expect.poll(replyRows, { timeout: 15_000, message: "switched off: no reply-time tasks in To do" }).toBe(0);
    await pg.locator(".tws-seg button", { hasText: "Done" }).click();
    const link = pg.locator('[data-tws="off-open"]');
    await expect(link, "the Done tab's foot names the switched-off tasks").toHaveText(/Tasks you’ve switched off \(\d+\)/, { timeout: 10_000 });
    await link.click();
    const pop = page.locator('[data-tws="off-pop"]');
    const row = pop.locator('[data-tws-off="dq_responseTime"]');
    await expect(row).toContainText("Reply-time questions, for every agent");
    await expect(row).toContainText(/Switched off \w{3} \d{1,2} \w{3}/);
    await row.getByRole("button", { name: "Turn back on" }).click();
    /* the pop-up stays open while other rules are still off (the harness account has one); Escape closes it */
    await expect(row).toHaveCount(0);
    if (await pop.count()) { await page.keyboard.press("Escape"); await expect(pop).toHaveCount(0); }
    await pg.locator(".tws-seg button", { hasText: "To do" }).click();
    await expect.poll(replyRows, { timeout: 15_000, message: "turned back on: the reply-time tasks are back" }).toBe(n0);
    const toast = page.locator('[data-tws="toast"]');
    await expect(toast).toContainText("Reply-time questions are back on.");
    await toast.getByRole("button", { name: "Undo" }).click();
    await expect.poll(replyRows, { timeout: 15_000, message: "Undo: switched off again" }).toBe(0);
    note(`L15${MUT ? `-${MUT}` : ""}`, { n0 });
  } finally {
    /* put the two fields back exactly as read: a field absent before is deleted by naming it in the mask with no value */
    const keep: Record<string, unknown> = {};
    if (before.fields?.mutedTaskRules) keep.mutedTaskRules = before.fields.mutedTaskRules;
    const tp = (before.fields?.todoPrefs as { mapValue?: { fields?: Record<string, unknown> } } | undefined)?.mapValue?.fields?.switchedOffAt;
    const mask = "updateMask.fieldPaths=mutedTaskRules&updateMask.fieldPaths=todoPrefs.switchedOffAt";
    const body = { fields: { ...keep, ...(tp ? { todoPrefs: { mapValue: { fields: { switchedOffAt: tp } } } } : {}) } };
    await fetch(`${userDoc}?${mask}`, { method: "PATCH", headers: OWNER, body: JSON.stringify(body) });
  }
});
