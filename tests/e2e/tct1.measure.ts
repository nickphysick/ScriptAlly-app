/**
 * To-do card thread v1 — the card the To-do desk opens draws its own query's thread, live.
 *
 * The bug (measured on query-card-v160 and on its base 987e479ec): the page's activity listener followed
 * `selectedQueryId` (the Query Centre's selected row), while the card describes `cardQueryId` (the shared panel's query,
 * Birds-eye's, else the selected row). A card opened from another page was drawn from another query's activity, or
 * none: a short thread, and a save's new step never drawn.
 *
 *   TCT-1  a card opened from the To-do desk shows the same thread as the Query Centre's card for that query
 *   TCT-2  a save from the To-do desk's card draws its new step (the draft settles into it), and Undo puts it back
 *
 * Emulator harness, 1512 × 900; seedQc152.mjs's q152-* queries are reset first and cleaned after.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { liftMotionSuppression, openRoute } from "./measure";

const PHASE = process.env.SA_PHASE === "before" ? "before" : "after";
const DIR = "reports/todo-card-thread-v1";
const VP = { width: 1512, height: 900 };
const CARD = "[data-qp='panel'] [data-qc152='card']";
const C = (s: string) => `${CARD} ${s}`;
const PG = '[data-tws="page"]:visible';
test.setTimeout(600_000);
test.use({ viewport: VP });
mkdirSync(`${DIR}/ledger`, { recursive: true });
const seed = (a = "") => execSync(`node tests/e2e/seedQc152.mjs ${a}`, { encoding: "utf8", stdio: "pipe" });
const dump = (key: string) => JSON.parse(execSync(`node tests/e2e/seedQc152.mjs --dump ${key}`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim().split("\n").pop()!);
test.beforeAll(() => { seed(); });
test.afterAll(() => { seed("--clean"); });

class Ledger {
  rows: { name: string; ok: boolean; got: string }[] = [];
  constructor(public id: string) {}
  check(name: string, ok: unknown, got: string) { this.rows.push({ name, ok: !!ok, got }); console.log(`${this.id} ${ok ? "✓" : "✗"} ${name} — ${got}`); }
  done(min: number) {
    writeFileSync(`${DIR}/ledger/${PHASE}-${this.id}.json`, JSON.stringify(this.rows, null, 1));
    expect(this.rows.length, `${this.id}: assertions run`).toBeGreaterThanOrEqual(min);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.name} — ${r.got}`)).toEqual([]);
  }
}
const titles = (page: Page) => page.locator(`${CARD} [data-qc152='thread'] > .qc152-m:not([data-qc1522='draft']) [data-qc152='msg-title']`).allInnerTexts();

/** the To-do desk: open each task's query card in turn; `fn` returns true to stop */
async function eachTodoCard(page: Page, fn: (id: string) => Promise<boolean>) {
  await openRoute(page, "/todo", VP);
  await liftMotionSuppression(page);
  const rows = page.locator(`${PG} [data-tws-row]`);
  await rows.first().waitFor({ timeout: 60_000 });
  const n = Math.min(40, await rows.count());
  for (let i = 0; i < n; i++) {
    await rows.nth(i).click(); await page.waitForTimeout(500);
    const pv = page.locator(`${PG} [data-tws="preview"][data-kind="query"]`);
    if (!(await pv.count())) continue;
    await pv.first().click(); await page.waitForTimeout(1500);
    const id = await page.locator(CARD).first().getAttribute("data-id").catch(() => null);
    if (id && await fn(id)) return;
    await page.keyboard.press("Escape"); await page.waitForTimeout(300);
    await page.keyboard.press("Escape"); await page.waitForTimeout(500);
  }
}
/** the Query Centre's card for `id`, grouped by nothing so every card is on the grid */
async function qcTitles(page: Page, id: string): Promise<string[] | null> {
  await page.addInitScript(() => { try { sessionStorage.setItem("qh.qc.view150", "list"); localStorage.setItem("qh.qc.view", JSON.stringify({ v: 1, group: "none", sort: { key: "due", reversed: false }, density: "comfortable" })); localStorage.setItem("sa.guide.queries", "1"); localStorage.setItem("sa.guide.queries-explainer", "1"); } catch { /* private */ } });
  await openRoute(page, "/queries", VP);
  const more = page.locator(".qc151.qc153 [data-qc153='show-all']");
  for (let i = 0; i < 6 && (await more.count()) > 0; i++) await more.first().click();
  const c = page.locator(`.qc151.qc153 [data-qc154='card'][data-id='${id}']`);
  if (!(await c.count())) return null;
  await c.scrollIntoViewIfNeeded(); await c.locator("[data-qc154='name']").first().click();
  await page.locator(`${CARD}[data-id='${id}']`).waitFor({ timeout: 15_000 });
  await page.waitForTimeout(1200);
  return titles(page);
}

test("TCT-1 · a card opened from the To-do desk shows its own query's whole thread (the Query Centre's)", async ({ page, browser }) => {
  const L = new Ledger("TCT-1");
  const seen: { id: string; todo: string[] }[] = [];
  await eachTodoCard(page, async (id) => {
    if (seen.some((s) => s.id === id)) return false;
    seen.push({ id, todo: await titles(page) });
    return seen.length >= 3;
  });
  L.check("population: three To-do tasks' query cards", seen.length >= 3, JSON.stringify(seen.map((s) => s.id)));
  const qc = await browser.newPage({ viewport: VP });
  for (const s of seen) {
    const q = await qcTitles(qc, s.id);
    L.check(`${s.id}: population — the Query Centre's card`, !!q && q.length > 0, JSON.stringify(q));
    L.check(`${s.id}: the To-do desk's card draws the same thread`, JSON.stringify(s.todo) === JSON.stringify(q), `To-do ${JSON.stringify(s.todo)} · Query Centre ${JSON.stringify(q)}`);
  }
  await qc.close();
  L.done(7);
});

test("TCT-2 · a save from the To-do desk's card draws its new step, the draft settling into it; Undo puts it back", async ({ page }) => {
  const L = new Ledger("TCT-2");
  let done = false;
  await eachTodoCard(page, async (id) => {
    if (!/^q152-/.test(id)) return false;
    const key = id.slice(5);
    await page.locator(C("[data-qc152='reply-btn']")).first().click(); await page.waitForTimeout(700);
    if (await page.locator(C("[data-qc1522='reply-types']")).count()) { await page.locator(C("[data-qc1522='reply-types'] [data-v='req']")).first().click(); await page.waitForTimeout(500); }
    const save = page.locator(C("[data-qc1522='save']")).first();
    if (!(await save.count()) || !(await save.isEnabled().catch(() => false)) || !(await page.locator(C("[data-qc1522='draft']")).count())) return false;
    const before = dump(key), t0 = await titles(page);
    await page.evaluate((s) => { (window as unknown as { __tag?: HTMLElement }).__tag = document.querySelector<HTMLElement>(`${s} [data-qc1522='draft']`) ?? undefined; }, CARD);
    await save.click();
    const ok = await page.locator(C("[data-qc1522='undo']")).waitFor({ timeout: 15_000 }).then(() => true, () => false);
    await page.waitForTimeout(1500);
    const mid = dump(key), t1 = await titles(page);
    const tag = await page.evaluate((s) => { const g = (window as unknown as { __tag?: HTMLElement }).__tag; const ms = [...document.querySelectorAll(`${s} [data-qc152='thread'] > .qc152-m`)]; return { in: !!g?.isConnected, draft: g?.dataset.qc1522 === "draft", last: g === ms[ms.length - 1] }; }, CARD);
    L.check(`${id}: population — the save landed and wrote one step`, ok && mid.log.length === before.log.length + 1, `${before.log.length} → ${mid.log.length}`);
    L.check(`${id}: the card draws the new step`, t1.length === t0.length + 1, `${JSON.stringify(t0)} → ${JSON.stringify(t1)}`);
    L.check(`${id}: the draft settled into it (the same element, now the thread's newest step)`, tag.in && !tag.draft && tag.last, JSON.stringify(tag));
    await page.locator(C("[data-qc1522='undo']")).first().click();
    let after = dump(key);
    for (let i = 0; i < 12 && JSON.stringify(after) !== JSON.stringify(before); i++) { await page.waitForTimeout(800); after = dump(key); }
    await page.waitForTimeout(1200);
    L.check(`${id}: Undo restores the stored query byte for byte`, JSON.stringify(after) === JSON.stringify(before), "");
    L.check(`${id}: and the card's thread as it was`, JSON.stringify(await titles(page)) === JSON.stringify(t0), JSON.stringify(await titles(page)));
    done = true;
    return true;
  });
  L.check("a To-do task for a q152 query whose card saves from a composer with a draft was found", done, "");
  L.done(6);
});
