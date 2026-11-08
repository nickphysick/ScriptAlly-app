/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TDP1 — To-do on the phone v1's locks (design-refs/todo-phone-v1/todo-phone-v1.html), at 390×844 and 360×780.
 * L1–L10 here; L11 is the desktop's own TD52 suite (todoV52.measure.ts), run alongside and held to its baseline.
 *
 * `TDP1_MUTATE=<lock>` applies that lock's named break in the page, so each can be watched going red.
 * Every case reads, except L8, which logs one nudge and presses Undo on the snackbar before anything is asserted.
 */
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openPhone } from "./pa2Lib";
import { openRoute } from "./measure";

const DIR = "reports/todo-phone-v1";
mkdirSync(`${DIR}/readings`, { recursive: true });
mkdirSync(`${DIR}/shots`, { recursive: true });
const MUT = process.env.TDP1_MUTATE ?? "";
const SHOTS = !!process.env.TDP1_SHOTS;
const SIZES = [{ width: 390, height: 844 }, { width: 360, height: 780 }] as const;
const held = new Map<string, unknown>();
const note = (name: string, v: unknown) => { held.set(`${name}${MUT ? `-${MUT}` : ""}`, v); };
test.afterAll(() => { for (const [n, v] of held) writeFileSync(`${DIR}/readings/${n}.json`, JSON.stringify(v, null, 1)); });

const LIST = '[data-tdp="list"]';
const TASK = '[data-tdp="task"]';
const WS_ORDER = ["Agents are waiting", "Nudges", "Gone quiet", "Housekeeping", "Your tasks"];

async function css(page: Page, t: string) { await page.addStyleTag({ content: t }); }
async function shot(page: Page, name: string) { if (SHOTS && !MUT) await page.screenshot({ path: `${DIR}/shots/${name}.png` }); }

async function openList(page: Page, vp: { width: number; height: number }) {
  await page.addInitScript(() => { try { if (!sessionStorage.getItem("tdp1-init")) { localStorage.removeItem("sa.todoPhoneShut"); sessionStorage.setItem("tdp1-init", "1"); } } catch { /* */ } });
  await openPhone(page, "/todo", vp);
  await expect(page.locator(LIST)).toHaveCount(1, { timeout: 30_000 });
  await expect(page.locator(`${LIST} [data-tdp="row"]`).first()).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(400);
}
/** the desktop's own readings, from the desktop page at 1280 */
async function desk(page: Page) {
  await openRoute(page, "/todo", { width: 1280, height: 800 });
  const pg = page.locator('[data-tws="page"]:visible');
  await expect(pg.locator("[data-tws-row]").first()).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(500);
  return pg.evaluate((r) => {
    /* To-do list v53 (D2, D3): the desktop's counts are the tray's — late from the breakdown bar, cleared from Done */
    const late = Number((r.querySelector('[data-tws="bar-late"]')?.textContent ?? "0").match(/\d+/)?.[0] ?? 0);
    const cleared = Number([...r.querySelectorAll<HTMLElement>(".tws-seg button")].find((b) => /^Done/.test(b.textContent ?? ""))?.querySelector("b")?.textContent ?? 0);
    return {
      todo: Number(r.querySelector('[data-tws="todo-count"]')?.textContent), late, cleared,
      start: r.querySelector('[data-tws="start-phrase"]')?.textContent ?? null,
      groups: [...r.querySelectorAll(".tws-gb b")].map((b) => b.textContent ?? ""),
    };
  });
}

/** the open question's key on the phone */
const phoneStep = (page: Page) => page.evaluate(() => document.querySelector("[data-tdp-q]")?.getAttribute("data-tdp-q") ?? "none");
/** answer the open question with its first choice (the same answer the desktop walk gives) */
async function answerOn(page: Page, root: string): Promise<boolean> {
  const tile = page.locator(`${root} .tws-tile:not(:disabled)`).first();
  if (await tile.count()) { await tile.click(); return true; }
  const range = page.locator(`${root} input[type="range"]`);
  if (await range.count()) { await range.focus(); await page.keyboard.press("ArrowRight"); return true; }
  const ta = page.locator(`${root} textarea`);
  if (await ta.count()) { await ta.fill("Upmarket book club fiction."); return true; }
  return false;
}

for (const vp of SIZES) {
  const tag = `${vp.width}×${vp.height}`;

  test(`L1 · no week strip, no when-groups, no Up next on /todo · ${tag}`, async ({ page }) => {
    await openList(page, vp);
    if (MUT === "L1") await page.evaluate(() => { const d = document.createElement("div"); d.setAttribute("data-pa", "wk-day"); document.querySelector('[data-tdp="list"]')!.appendChild(d); });
    const n = await page.evaluate(() => ({
      week: document.querySelectorAll('[data-pa="wk-day"], .pa-wk').length,
      when: document.querySelectorAll('[data-pa="when-group"]').length,
      upnext: document.querySelectorAll('[data-pa="todo-upnext"]').length,
      groups: document.querySelectorAll('[data-tdp="group"]').length,
    }));
    note(`L1-${vp.width}`, n);
    expect(n.groups, "the list draws its groups").toBeGreaterThan(0);
    expect(n.week + n.when + n.upnext, "the week strip, the when-groups and Up next are gone").toBe(0);
    await shot(page, `list-${vp.width}`);
  });

  test(`L2 · the band's numbers switch the list; to do and done are the desktop's · ${tag}`, async ({ page }) => {
    const d = await desk(page);
    await openList(page, vp);
    const read = () => page.evaluate(() => Object.fromEntries([...document.querySelectorAll<HTMLElement>('[data-tdp="band-num"]')].map((b) => [b.dataset.k, { n: Number(b.dataset.count), on: b.getAttribute("aria-pressed") === "true", text: b.textContent }])));
    const nums = await read();
    if (MUT === "L2") await page.evaluate(() => { document.querySelector<HTMLElement>('[data-tdp="band-num"][data-k="done"]')!.dataset.count = "999"; });
    const after = MUT === "L2" ? await read() : nums;
    note(`L2-${vp.width}`, { desk: d, phone: after });
    expect(after.todo.n, "to do is the desktop's count").toBe(d.todo);
    expect(after.todo.text, "the late count is the desktop's").toContain(`${d.late} late`);
    expect(after.done.n, "done is doneTabRows' length (the desktop's cleared this week)").toBe(d.cleared);
    expect(after.todo.on).toBe(true);
    for (const k of ["snoozed", "done", "todo"] as const) {
      await page.locator(`[data-tdp="band-num"][data-k="${k}"]`).click();
      await page.waitForTimeout(250);
      const st = await page.evaluate(() => ({
        groups: document.querySelectorAll('[data-tdp="group"]').length, start: document.querySelectorAll('[data-tdp="start"]').length,
        snoozed: document.querySelectorAll('[data-tdp="snoozed"], [data-tdp="snoozed-row"]').length, done: document.querySelectorAll('[data-tdp="done"], [data-tdp="done-row"]').length,
        none: document.querySelector('[data-tdp="none"]')?.textContent ?? "",
        on: document.querySelector('[data-tdp="band-num"][aria-pressed="true"]')?.getAttribute("data-k"),
      }));
      expect(st.on, `the ${k} number is the selected one`).toBe(k);
      if (k === "todo") { expect(st.groups).toBeGreaterThan(0); }
      else {
        expect(st.groups + st.start, `${k}: no groups and no Start here`).toBe(0);
        expect(k === "snoozed" ? st.snoozed || /snoozed/i.test(st.none) : st.done || /cleared/i.test(st.none), `${k}: its own list`).toBeTruthy();
      }
      if (k !== "todo") await shot(page, `${k}-${vp.width}`);
    }
  });

  test(`L3 · Start here is the desktop's priority task · ${tag}`, async ({ page }) => {
    const d = await desk(page);
    await openList(page, vp);
    if (MUT === "L3") await page.evaluate(() => { document.querySelector('[data-tdp="start-phrase"]')!.textContent = "Something else"; });
    const phrase = await page.locator('[data-tdp="start-phrase"]').textContent();
    note(`L3-${vp.width}`, { desk: d.start, phone: phrase });
    /* To-do list v53 (D4) took Start here off the desktop, so there is nothing there to compare with: the phone keeps its
       own Start here (lib/todoWs priorityTask, unit-locked), and this holds that it is drawn (tests/e2e/RETIRED-todo-list-v53.md) */
    expect(d.start, "the desktop has no Start here (v53)").toBeNull();
    expect((phrase ?? "").trim().length, "the phone's Start here names a task").toBeGreaterThan(0);
  });

  test(`L4 · the groups are WS_GROUPS in order, and a collapse survives a reload · ${tag}`, async ({ page }) => {
    await openList(page, vp);
    if (MUT === "L4") await page.evaluate(() => { const l = document.querySelector('[data-tdp="list"] .pa-tdbody')!; const g = [...l.querySelectorAll('[data-tdp="group"]')]; if (g.length > 1) l.appendChild(g[0]); });
    const names = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-tdp="group-head"]')].map((h) => (h.childNodes[0]?.textContent ?? "").trim()));
    const expected = WS_ORDER.filter((n) => names.includes(n));
    note(`L4-${vp.width}`, names);
    expect(names.length).toBeGreaterThan(1);
    expect(names, "the desktop's groups, in WS_GROUPS order").toEqual(expected);
    const first = page.locator('[data-tdp="group"]').first();
    const id = await first.getAttribute("data-group");
    await first.locator('[data-tdp="group-head"]').click();
    await expect(page.locator(`[data-tdp="group"][data-group="${id}"]`)).toHaveAttribute("data-shut", "");
    await shot(page, `collapsed-${vp.width}`);
    /* L4b's break: the remembered collapse is lost before the page reads it again */
    if (MUT === "L4b") await page.evaluate(() => localStorage.removeItem("sa.todoPhoneShut"));
    await page.reload();
    await expect(page.locator(`${LIST} [data-tdp="group"]`).first()).toBeVisible({ timeout: 30_000 });
    const still = await page.locator(`[data-tdp="group"][data-group="${id}"]`).getAttribute("data-shut");
    /* put it back */
    if (still !== null) await page.locator(`[data-tdp="group"][data-group="${id}"] [data-tdp="group-head"]`).click();
    expect(still, "the collapse is remembered on this device").toBe("");
  });

  test(`L5–L7 · every task asks buildFlow's questions in order; no auto-advance; the pill is reachable · ${tag}`, async ({ page }) => {
    test.setTimeout(900_000);
    /* two tabs on one signed-in context, each opened once: the desktop at 1280 and the phone at this size */
    await openList(page, vp);
    const kinds = await page.locator('[data-tdp="row"]').evaluateAll((els) => els.map((e) => ({ key: (e as HTMLElement).dataset.key!, kind: (e as HTMLElement).dataset.kind! })));
    const dk = await page.context().newPage();
    await openRoute(dk, "/todo", { width: 1280, height: 800 });
    const pg = dk.locator('[data-tws="page"]:visible');
    await expect(pg.locator("[data-tws-row]").first()).toBeVisible({ timeout: 30_000 });
    const keys = await pg.locator("[data-tws-row]").evaluateAll((els) => els.map((e) => e.getAttribute("data-tws-row")!));
    const pick = new Map<string, string>();
    for (const r of kinds) if (!pick.has(r.kind) && keys.includes(r.key)) pick.set(r.kind, r.key);
    if (MUT === "L6") await page.evaluate(() => document.addEventListener("click", (e) => { if ((e.target as HTMLElement).closest(".tws-tile")) window.setTimeout(() => (document.querySelector('[data-tdp="primary"][data-next]') as HTMLElement | null)?.click(), 50); }, true));
    if (MUT === "L7") await css(page, ".tdp-foot { bottom: -120px !important; }");
    const tally: Record<string, { desk: string[]; phone: string[]; held: boolean; pill: boolean[] }> = {};
    for (const [kind, key] of pick) {
      /* desktop: select the task, answer each question with its first choice, Next until the summary */
      await pg.locator(`[data-tws-row="${key}"]`).click();
      await dk.waitForTimeout(400);
      const deskSeq: string[] = [];
      for (let i = 0; i < 8; i++) {
        const k = await pg.locator("[data-tws-q]").first().getAttribute("data-tws-q", { timeout: 1500 }).catch(() => null);
        if (!k) break;
        deskSeq.push(k);
        await answerOn(dk, '[data-tws="page"]:visible .tws-q');
        await dk.waitForTimeout(150);
        const next = pg.locator('[data-tws="primary"][data-next]');
        if (!(await next.count()) || !(await next.isEnabled())) break;
        await next.click(); await dk.waitForTimeout(200);
      }
      /* phone: the same task, the same answers */
      await page.locator(`[data-tdp="row"][data-key="${key}"] .tdp-row`).click();
      await expect(page.locator(TASK)).toBeVisible({ timeout: 10_000 });
      const phoneSeq: string[] = [];
      const pill: boolean[] = [];
      let heldStep = true;
      for (let i = 0; i < 8; i++) {
        const k = await phoneStep(page);
        if (k === "none") break;
        phoneSeq.push(k);
        if (MUT === "L5" && i === 0) phoneSeq.push("__extra");
        pill.push(await page.evaluate(() => {
          const p = document.querySelector<HTMLElement>('[data-tdp="primary"]');
          if (!p) return false;
          const r = p.getBoundingClientRect();
          if (r.bottom > innerHeight || r.top < 0 || r.height === 0) return false;
          const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          return !!at && (at === p || p.contains(at));
        }));
        /* an unreachable pill ends the walk here, so its own check fires rather than a click timing out */
        if (!pill[pill.length - 1]) break;
        if (vp.width === 390 && SHOTS && !MUT && (kind === "send" || kind === "quiet")) await shot(page, `task-${kind}-step${i + 1}`);
        if (await answerOn(page, TASK)) { await page.waitForTimeout(1000); if ((await phoneStep(page)) !== k) heldStep = false; }
        const next = page.locator('[data-tdp="primary"][data-next]');
        if (!(await next.count()) || !(await next.isEnabled())) break;
        await next.click(); await page.waitForTimeout(200);
      }
      if (vp.width === 390 && SHOTS && !MUT) await shot(page, `task-${kind}-last`);
      tally[kind] = { desk: deskSeq, phone: phoneSeq, held: heldStep, pill };
      await page.locator('[data-tdp="close"]').click();
      await expect(page.locator(TASK)).toHaveCount(0);
    }
    await dk.close();
    note(`L5-${vp.width}`, tally);
    expect(Object.keys(tally).length, "more than one kind of task was walked").toBeGreaterThan(1);
    for (const [kind, r] of Object.entries(tally)) {
      /* each break is caught by its own check: L6's first, then L7's, then L5's */
      expect(r.held, `${kind}: a choice never moves you on (L6)`).toBe(true);
      expect(r.pill.every(Boolean), `${kind}: the pill is in view and uncovered on every step (L7)`).toBe(true);
      expect(r.phone, `${kind}: the phone asks buildFlow's questions, in order`).toEqual(r.desk);
    }
  });

  test(`L9 · the card sheet: the footer meets the thread, and the sheet is no taller than its card · ${tag}`, async ({ page }) => {
    await openList(page, vp);
    const send = page.locator('[data-tdp="row"][data-kind="send"] .tdp-row').first();
    test.skip(!(await send.count()), "no send task on the account");
    await send.click();
    await expect(page.locator(TASK)).toBeVisible();
    await answerOn(page, TASK);
    await page.locator('[data-tdp="mini"]').click();
    const card = page.locator('[data-tdp="card"] [data-qc152="card"]');
    await expect(card).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(800);
    if (MUT === "L9") await css(page, '[data-tdp="card"] [data-qc152="thread"] { padding-bottom: 80px !important; }');
    if (MUT === "L9b") await css(page, ".pa-sheet.tdp-csheet { height: 92% !important; }");
    const m = await page.evaluate(() => {
      const c = document.querySelector<HTMLElement>('[data-tdp="card"] [data-qc152="card"]')!;
      const th = c.querySelector<HTMLElement>('[data-qc152="thread"]');
      const foot = c.querySelector<HTMLElement>('[data-qc152="reply"]');
      const kids = th ? [...th.querySelectorAll<HTMLElement>("*")].filter((e) => e.getBoundingClientRect().height > 0 && !e.children.length) : [];
      const lastB = kids.length ? Math.max(...kids.map((e) => e.getBoundingClientRect().bottom)) : NaN;
      const sheet = c.closest<HTMLElement>(".pa-sheet")!;
      const body = sheet.querySelector<HTMLElement>(".pa-sheet-body") ?? sheet;
      const sr = sheet.getBoundingClientRect();
      const content = [...body.children].reduce((s, e) => s + (e as HTMLElement).getBoundingClientRect().height, 0);
      return { gap: foot ? foot.getBoundingClientRect().top - lastB : null, sheetH: sr.height, cardBottom: c.getBoundingClientRect().bottom, sheetBottom: sr.bottom, content, max: innerHeight - 70, draft: !!c.querySelector('[data-qc152="thread"] [class*="draft"], [data-qc1522="draft"]') };
    });
    note(`L9-${vp.width}`, m);
    await shot(page, `card-${vp.width}`);
    /* L9b's break is caught by the height checks, L9's by the gap */
    expect(m.sheetH, "the sheet stays under the screen less 70px").toBeLessThanOrEqual(m.max + 1);
    expect(m.sheetBottom - m.cardBottom, "the sheet is only as tall as its card").toBeLessThanOrEqual(40);
    expect(m.gap, "the footer is under the thread").not.toBeNull();
    expect(m.gap!, "no empty space between the last bubble and the footer").toBeLessThanOrEqual(24);
  });

  test(`L10 · Home's task opens the task screen, not the drawer · ${tag}`, async ({ page }) => {
    await openPhone(page, "/dashboard", vp);
    const row = page.locator('[data-pa="home-todo"] [data-pa="check-open"]').first();
    test.skip(!(await row.count()), "nothing due on Home");
    if (MUT === "L10") await page.evaluate(() => document.addEventListener("click", (e) => { if ((e.target as HTMLElement).closest('[data-pa="home-todo"]')) { e.stopPropagation(); e.preventDefault(); } }, true));
    await row.click();
    await page.waitForTimeout(800);
    const r = await page.evaluate(() => ({ task: !!document.querySelector('[data-tdp="task"]'), drawer: [...document.querySelectorAll<HTMLElement>("[data-qad-drawer]")].filter((e) => e.getBoundingClientRect().height > 0).length }));
    note(`L10-${vp.width}`, r);
    expect(r.task, "the task screen opened").toBe(true);
    expect(r.drawer, "the Query Centre drawer did not").toBe(0);
  });
}

test("L8 · Log it on a nudge writes the desktop's three documents once each, and Undo puts them back · 390×844", async ({ page }) => {
  const vp = SIZES[0];
  await openList(page, vp);
  const nudge = page.locator('[data-tdp="row"][data-kind="nudge"]').first();
  test.skip(!(await nudge.count()), "no nudge on the account");
  const key = await nudge.getAttribute("data-key");
  await nudge.locator(".tdp-row").click();
  await expect(page.locator(TASK)).toBeVisible();
  await page.locator(`${TASK} [data-tdp-q="sent"] .tws-tile`).click();
  for (let i = 0; i < 6; i++) {
    const next = page.locator('[data-tdp="primary"][data-next]');
    if (!(await next.count())) break;
    await next.click(); await page.waitForTimeout(200);
  }
  const log = page.locator('[data-tdp="primary"][data-log]');
  await expect(log).toBeEnabled();
  /* L8's break is a SOURCE break (tdp1Mutate.sh): the task screen commits twice. A second click cannot land on its own —
     the pill is disabled while the save is in flight — so a page-side double click would prove nothing. */
  const docs: { path: string; fields: string[]; mask: string[] | null }[] = [];
  const on = (req: import("@playwright/test").Request) => {
    if (req.method() !== "POST" || !/\/Write\/channel/.test(req.url())) return;
    for (const [k, v] of new URLSearchParams(req.postData() ?? "")) {
      if (!/^req\d+___data__$/.test(k)) continue;
      let j: { writes?: { update?: { name: string; fields?: Record<string, unknown> }; updateMask?: { fieldPaths?: string[] } }[] };
      try { j = JSON.parse(v); } catch { continue; }
      for (const w of j.writes ?? []) if (w.update) docs.push({ path: w.update.name.split("/documents/")[1] ?? w.update.name, fields: Object.keys(w.update.fields ?? {}).sort(), mask: w.updateMask?.fieldPaths?.slice().sort() ?? null });
    }
  };
  page.on("request", on);
  await log.click();
  await page.waitForTimeout(2500);
  page.off("request", on);
  const snack = page.locator(".pa-snack");
  await expect(snack).toBeVisible({ timeout: 10_000 });
  /* D3: then the next task opens (read before Undo, asserted after it) */
  const moved = await page.evaluate((k) => { const t = document.querySelector<HTMLElement>('[data-tdp="task"]'); return { open: !!t, key: t?.dataset.key ?? null, was: k }; }, key);
  await shot(page, "logged-snackbar");
  /* put the account back before any assertion can stop the run */
  await snack.getByRole("button", { name: /undo/i }).click();
  await page.locator('[data-tdp="close"]').click({ timeout: 3000 }).catch(() => undefined);
  await expect(page.locator(`[data-tdp="row"][data-key="${key}"]`)).toHaveCount(1, { timeout: 20_000 });
  const shape = docs.filter((d) => !/taskFlags|scoutDecisions/.test(d.path)).map((d) => {
    const rel = d.path.replace(/^users\/[^/]+\//, "");
    const kind = /^queries\/[^/]+\/activity\/act-/.test(rel) ? "step" : /^activities\/act-/.test(rel) ? "feed" : /^queries\/[^/]+$/.test(rel) ? "query" : rel;
    return { kind, fields: d.fields.join(","), mask: d.mask?.join(",") ?? null };
  });
  note("L8", { docs, shape, moved });
  expect(moved.open, "after Log it the task screen stays open").toBe(true);
  expect(moved.key, "and shows the next task").not.toBe(moved.was);
  expect(shape, "the desktop's L10: exactly these three documents, once each").toEqual([
    { kind: "step", fields: "agentName,createdAt,eventKey,note,queryId,reminderDate,type", mask: null },
    { kind: "feed", fields: "activityType,date,description,details,eventKey,id,manuscriptId,queryId,userId", mask: null },
    { kind: "query", fields: "closePlan,lastNudgeSentDate", mask: "closePlan,lastNudgeSentDate,nudgeDate" },
  ]);
});
