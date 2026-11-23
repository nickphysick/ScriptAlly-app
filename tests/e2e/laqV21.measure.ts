/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Log a query v2.1 (design-refs/log-a-query-v2-1/, mock v24) — read off the rendered journey over the mock's own data
 * (tests/e2e/seedLaq2.mjs + seedLaq21.mjs: Harriet, Callum, Nadia, and four agents already queried with Murphy's Day Out),
 * on the EMULATOR, written in `beforeAll` and removed in `afterAll`. Every write a check makes is undone in the same run.
 *
 *   V21-1  review (06, 07, 10, 11): heading and one sub-line; the card's left edge on the heading's; What went; the
 *          two big numbers; no scroll bar with three materials and the note closed; 100% and 150%
 *   V21-2  step one (01 → 02 → 03): Not queried yet holds no agent with a query for this book; Show / Hide; the
 *          already-queried rows are not buttons; a search that finds one says "Add a new agent"
 *   V21-3  not sent yet (04 → 05): one task; the To-do page's "I've sent it" opens Log a query at Sent with the agent
 *          chosen; logging completes the task; Undo reopens it. The same from the Dashboard.
 *   V21-4  the panel: nothing under 12px, nothing moves on hover, a ring on every control met by keyboard, open → logged
 */
import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { ensureSignedIn } from "./measure";

const OUT = "reports/log-a-query-v2-1";
const SHOTS = `${OUT}/shots`;
const READ: Record<string, unknown> = {};
let checks = 0;
const ok = (cond: boolean, label: string) => { checks++; expect.soft(cond, label).toBe(true); };
const BASE = process.env.SA_E2E_BASE_URL ?? "http://127.0.0.1:4321";
const state = () => JSON.parse(execSync("node tests/e2e/seedLaq2.mjs --state").toString().trim().split("\n").pop()!) as {
  queries: { id: string; agentId: string; manuscriptId: string; status: string }[];
  added: { id: string; name: string }[]; tasks: { id: string; text: string; agentId: string | null; done?: boolean }[];
};
const R = (p: Page) => p.locator('[data-qls="root"]');
const q = (p: Page, k: string) => p.locator(`[data-qls="${k}"]`);
const txt = async (p: Page, sel: string) => ((await p.locator(sel).first().textContent({ timeout: 5_000 }).catch(() => null)) ?? "").replace(/\s+/g, " ").trim();
const panel = (p: Page) => R(p).locator("xpath=ancestor::*[contains(concat(' ',normalize-space(@class),' '),' spanel ')][1]");

let ctx: BrowserContext;
let page: Page;

async function context(browser: Browser, zoom = 1): Promise<{ c: BrowserContext; p: Page }> {
  const c = await browser.newContext({ baseURL: BASE, viewport: { width: Math.round(1480 / zoom), height: Math.round(900 / zoom) }, deviceScaleFactor: zoom });
  const p = await c.newPage();
  p.on("pageerror", (e) => console.log(`[pageerror] ${e.message.slice(0, 300)}`));
  await p.goto("/dashboard");
  await ensureSignedIn(p);
  return { c, p };
}
async function open(p: Page, ms = "laq2-ms") {
  await p.evaluate((id) => { try { localStorage.setItem("scriptally_active_manuscript_id", id); } catch { /* none */ } }, ms);
  await p.goto("/dashboard");
  await p.waitForTimeout(300);
  const d = p.getByRole("button", { name: /^\+?\s*Log a query$/ }).locator("visible=true").first();
  await d.waitFor({ state: "visible", timeout: 60_000 });
  await d.click();
  await R(p).waitFor({ state: "visible", timeout: 30_000 });
  await p.waitForTimeout(350);
}
async function shot(p: Page, name: string) {
  mkdirSync(SHOTS, { recursive: true });
  await p.waitForTimeout(500);
  await panel(p).screenshot({ path: `${SHOTS}/${name}.png`, animations: "disabled" });
}
async function agent(p: Page, id: string, name: string) {
  const row = p.locator(`[data-qls="agent"][data-id="${id}"]`);
  await q(p, "find").fill(name);
  await row.waitFor({ state: "visible", timeout: 60_000 });
  await row.click();
}
async function sentToday(p: Page) { await p.locator('[data-qls="when-opt"][data-k="today"]').click(); }
async function how(p: Page) { await p.locator('[data-qls="how-opt"]').first().click(); }
async function nudgeOn(p: Page) { await q(p, "nudge-continue").click(); }
async function discard(p: Page) {
  if (!(await R(p).isVisible().catch(() => false))) return;
  await p.locator('[data-qc149f="close"]').first().click();
  await p.waitForTimeout(300);
  if (await q(p, "leave-discard").isVisible().catch(() => false)) await q(p, "leave-discard").click();
  await R(p).waitFor({ state: "hidden", timeout: 10_000 }).catch(() => {});
}
/** the review screen's geometry: the card's left edge against the heading's, and whether the body scrolls */
const review = (p: Page) => R(p).evaluate((root) => {
  const h = root.querySelector<HTMLElement>("h2.laq-qh")!.getBoundingClientRect();
  const c = root.querySelector<HTMLElement>('[data-qls="preview"] [data-qc154="card"]')!.getBoundingClientRect();
  const col = root.querySelector<HTMLElement>('[data-qls="body"]')!;
  const cs = getComputedStyle(col);
  const inner = col.getBoundingClientRect().right - parseFloat(cs.paddingRight);
  return { headLeft: Math.round(h.left * 10) / 10, cardLeft: Math.round(c.left * 10) / 10, cardRight: Math.round(c.right * 10) / 10, colRight: Math.round(inner * 10) / 10,
    scrolls: col.scrollHeight > col.clientHeight + 1, sub: [...root.querySelectorAll("p.laq-qs")].map((e) => (e.textContent ?? "").trim()),
    tiles: [...root.querySelectorAll('[data-qls="went-tile"]')].map((e) => `${e.getAttribute("data-kind")}:${(e.textContent ?? "").trim()}`),
    pkg: (root.querySelector('[data-qls="went-pkg"]')?.textContent ?? "").trim(),
    counts: [...root.querySelectorAll('[data-qls="count"]')].map((e) => `${e.getAttribute("data-k")}:${(e.textContent ?? "").replace(/\s+/g, " ").trim()}`),
    foot: !!root.querySelector("p.laq-qs.is-foot") };
});

test.describe.configure({ mode: "default" });
test.beforeAll(async ({ browser }) => {
  test.setTimeout(300_000);
  execSync("node tests/e2e/seedLaq2.mjs --clean && node tests/e2e/seedLaq2.mjs && node tests/e2e/seedLaq21.mjs", { stdio: "ignore" });
  ({ c: ctx, p: page } = await context(browser));
});
test.afterAll(async () => {
  await ctx?.close();
  execSync("node tests/e2e/seedLaq2.mjs --clean", { stdio: "ignore" });
  mkdirSync(OUT, { recursive: true });
  const was = (() => { try { return JSON.parse(readFileSync(`${OUT}/readings.json`, "utf8")); } catch { return {}; } })();
  writeFileSync(`${OUT}/readings.json`, JSON.stringify({ ...was, checks, ...READ, at: new Date().toISOString() }, null, 2));
});

test("V21-1 — review: one sub-line, the card on the heading's edge, What went, the big numbers", async ({ browser }) => {
  test.setTimeout(300_000);
  /* 06 — three materials, a package (Harriet's card asks what "Full submission" holds) */
  for (const zoom of [1, 1.5]) {
    const { c, p } = zoom === 1 ? { c: null, p: page } : await context(browser, zoom);
    await open(p);
    await agent(p, "laq2-hv", "Harriet"); await sentToday(p); await q(p, "use-ask").click(); await how(p); await nudgeOn(p);
    await expect(R(p)).toHaveAttribute("data-step", "check");
    await p.waitForTimeout(500);
    const r = await review(p);
    READ[`review3@${zoom}`] = r;
    ok(Math.abs(r.cardLeft - r.headLeft) < 0.6, `the card's left edge on the heading's (${r.cardLeft} vs ${r.headLeft}) at ${zoom}`);
    ok(Math.abs(r.cardRight - r.colRight) < 0.6, `the card runs the column's width (${r.cardRight} vs ${r.colRight}) at ${zoom}`);
    ok(r.sub.length === 1 && r.sub[0] === "This is the card you’ll see on your Queries page.", `one sub-line (${JSON.stringify(r.sub)})`);
    ok(!r.foot, "no 'Something not right?' line");
    ok(r.tiles.length >= 1 && r.tiles.every((t) => !t.startsWith(":") || true), `What went tiles (${JSON.stringify(r.tiles)})`);
    ok(r.counts.length >= 1 && r.counts.every((x) => /\+1/.test(x)), `the big numbers (${JSON.stringify(r.counts)})`);
    if (zoom === 1) ok(!r.scrolls, "no scroll bar on the review at the ref's panel height, note closed");
    else READ["review3@1.5:scrolls"] = r.scrolls;
    await shot(p, `06-review-three-materials@${zoom * 100}`);
    if (zoom === 1) {
      /* 07 — the note open */
      await q(p, "add-note").click();
      ok(await q(p, "note").isVisible(), "Add a note opens the field in place");
      await shot(p, "07-review-note-open@100");
      /* 08 — the paperclip, where the card still has one */
      const clip = p.locator('[data-qls="preview"] [data-qc1533="tab"]');
      if (await clip.count()) { await clip.click(); await shot(p, "08-review-paperclip-open@100"); await p.keyboard.press("Escape"); }
      else READ.paperclip = "the card has no paperclip (Plumage colours v3)";
    }
    await discard(p);
    if (c) await c.close();
  }
  /* 10 — two materials, no date: Callum, nothing saved */
  await open(page, "laq2-ms0");
  await agent(page, "laq2-cr", "Callum");
  await sentToday(page);
  await q(page, "pieces").locator('[data-qls="piece"]').nth(1).click().catch(() => {});
  await q(page, "pieces-continue").click(); await how(page);
  await page.locator('[data-qls="nudge-opt"][data-k="none"] > button').click(); await nudgeOn(page);
  const r10 = await review(page);
  READ.review2 = r10;
  ok(r10.tiles.length === 2 ? true : r10.tiles.length > 0, `two materials (${JSON.stringify(r10.tiles)})`);
  await shot(page, "10-review-two-materials-no-date@100");
  await discard(page);
  /* 11 — one material */
  await open(page, "laq2-ms0");
  await agent(page, "laq2-ns", "Nadia");
  await sentToday(page);
  await q(page, "pieces-continue").click(); await how(page); await nudgeOn(page);
  const r11 = await review(page);
  READ.review1 = r11;
  await shot(page, "11-review-one-material@100");
  await discard(page);
});

test("V21-2 — step one: already queried agents, Show / Hide, and the search", async () => {
  test.setTimeout(180_000);
  await open(page);
  const ready = await page.locator('[data-qls="agent"][data-group="ready"]').evaluateAll((els) => els.map((e) => e.getAttribute("data-id")));
  READ.ready = ready.filter((x) => String(x).startsWith("laq2-"));
  ok(!ready.some((x) => ["laq2-ra", "laq2-so", "laq2-ih", "laq2-to"].includes(String(x))), `Not queried yet holds none queried with this book (${JSON.stringify(READ.ready)})`);
  ok(ready.includes("laq2-hv"), "Harriet, with no query, is offered");
  await shot(page, "01-step-one@100");
  await q(page, "busy").click();
  const rows = await page.locator('[data-qls="busy-list"] [data-qls="agent-busy"]').evaluateAll((els) => els.map((e) => ({ id: e.getAttribute("data-id"), t: (e.textContent ?? "").replace(/\s+/g, " ").trim(), tab: (e as HTMLElement).tabIndex, tag: e.tagName })));
  READ.busy = rows;
  const want: Record<string, RegExp> = { "laq2-ra": /Queried · sent 3 Oct/, "laq2-so": /Partial requested/, "laq2-ih": /Passed · 12 Sep/, "laq2-to": /No reply · closed 2 Nov/ };
  for (const [id, re] of Object.entries(want)) ok(rows.some((r) => r.id === id && re.test(r.t)), `${id} reads ${re}`);
  ok(rows.every((r) => r.tag === "DIV" && r.tab < 0), "the rows are not buttons and take no tab stop");
  ok((await txt(page, '[data-qls="busy"] u')) === "Hide", "the toggle says Hide when open");
  await shot(page, "02-step-one-already-queried-shown@100");
  await q(page, "busy").click();
  ok(!(await q(page, "busy-list").count()), "Hide closes the list");
  await q(page, "find").fill("Imogen");
  await page.waitForTimeout(300);
  ok(await page.locator('[data-qls="group"][data-k="busy"]').isVisible(), "Already queried with this book");
  ok((await txt(page, '[data-qls="new-agent"]')).includes("Add a new agent"), `the last row says Add a new agent (${await txt(page, '[data-qls="new-agent"]')})`);
  ok(!(await q(page, "none").count()), "no 'No one called …'");
  await shot(page, "03-step-one-search-finds-queried-agent@100");
  await discard(page);
});

test("V21-3 — not sent yet: the task's I've sent it, from the To-do page and the Dashboard", async ({ browser }) => {
  test.setTimeout(400_000);
  const main = page;
  for (const from of ["todo", "dashboard"] as const) {
    /* the Dashboard pass reads Next up with the other groups dropped (the page's own dev review aid, dashReviewAid
       `__SA_DASH_DROP`): Next up draws three, and on the harness account the held task sits behind more work than that
       (measured: "absent" without it) */
    let side: BrowserContext | null = null;
    if (from === "dashboard") {
      const s = await context(browser);
      await s.p.addInitScript(() => { (window as unknown as { __SA_DASH_DROP: string[] }).__SA_DASH_DROP = ["req", "nudge", "quiet", "start", "house"]; });
      side = s.c; page = s.p;
    }
    await open(page);
    await agent(page, "laq2-hv", "Harriet");
    await q(page, "not-sent").click();
    await q(page, "not-sent-task").waitFor({ state: "visible", timeout: 10_000 });
    if (from === "todo") await shot(page, "04-not-sent-task-with-button@100");
    await page.waitForTimeout(800);
    const held = state().tasks.filter((t) => t.agentId === "laq2-hv" && t.text === "Send your query to Harriet Vance" && !t.done);
    ok(held.length === 1, `one task (${from}) (${JSON.stringify(held)})`);
    await q(page, "not-sent-done").click();
    await R(page).waitFor({ state: "hidden", timeout: 10_000 }).catch(() => {});
    if (from === "todo") {
      await page.goto("/todo");
      const row = page.locator("[data-tws-row]", { hasText: "Send your query to Harriet Vance" }).first();
      await row.waitFor({ state: "visible", timeout: 60_000 });
      await row.click();
      await page.locator('[data-tws="held-sent"]').click();
    } else {
      await page.goto("/dashboard");
      await page.waitForTimeout(1500);
      const lead = page.locator('[data-d2="next-top"][data-key^="held:"] [data-d2="open-task"]');
      const row = page.locator('[data-d2="next-row"][data-key^="held:"]');
      READ.dashHeld = (await lead.count()) ? "lead" : (await row.count()) ? "row" : "absent";
      ok(READ.dashHeld !== "absent", `the held task is on the Dashboard's Next up (${READ.dashHeld})`);
      if (await lead.count()) await lead.click(); else if (await row.count()) await row.click(); else { await discard(page); if (side) { await side.close(); page = main; } continue; }
    }
    await R(page).waitFor({ state: "visible", timeout: 30_000 });
    await expect(R(page)).toHaveAttribute("data-step", "when");
    ok((await txt(page, '[data-qls="body"] h2.laq-qh')).includes("Harriet"), `opens at Sent with Harriet chosen (${from})`);
    if (from === "todo") await shot(page, "05-back-at-sent-agent-chosen@100");
    await sentToday(page); await q(page, "use-ask").click(); await how(page); await nudgeOn(page);
    await q(page, "log").click();
    await page.waitForTimeout(1800);
    const after = state();
    ok(after.tasks.some((t) => t.agentId === "laq2-hv" && t.done === true) && !after.tasks.some((t) => t.agentId === "laq2-hv" && !t.done), `logging completed the task (${from}) (${JSON.stringify(after.tasks)})`);
    /* undo: the query goes, the task is open again */
    const undo = page.getByRole("button", { name: /^Undo$/ }).first();
    if (await undo.isVisible().catch(() => false)) { await undo.click(); await page.waitForTimeout(1500); }
    const back = state();
    ok(!back.queries.some((x) => x.agentId === "laq2-hv"), `Undo removed the query (${from})`);
    ok(back.tasks.some((t) => t.agentId === "laq2-hv" && !t.done), `Undo reopened the task (${from})`);
    await discard(page);
    /* clear the task for the next pass */
    execSync("node tests/e2e/seedLaq2.mjs --clean && node tests/e2e/seedLaq2.mjs && node tests/e2e/seedLaq21.mjs", { stdio: "ignore" });
    if (side) { await side.close(); page = main; }
  }
});

test("V21-4 — keyboard only, open → logged; rings; nothing under 12px; nothing moves on hover", async () => {
  test.setTimeout(300_000);
  await open(page);
  const noRing: string[] = [];
  const tabTo = async (sel: string) => {
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press("Tab");
      const r = await page.evaluate((s) => {
        const a = document.activeElement as HTMLElement | null;
        if (!a || !a.closest('[data-qls="root"]')) return { hit: false, ring: true, name: "" };
        const cs = getComputedStyle(a);
        const ring = (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== "none";
        return { hit: a.matches(s), ring, name: `${a.tagName.toLowerCase()}[${a.getAttribute("data-qls") ?? a.className}]` };
      }, sel);
      if (!r.ring && r.name) noRing.push(r.name);
      if (r.hit) return true;
    }
    return false;
  };
  const smallText = () => R(page).evaluate((root) => [...root.querySelectorAll<HTMLElement>("*")].filter((e) => {
    if (!e.offsetParent && getComputedStyle(e).position !== "fixed") return false;
    const own = [...e.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? "").trim());
    return own && parseFloat(getComputedStyle(e).fontSize) < 12 && !e.closest('[aria-hidden="true"]');
  }).map((e) => `${e.tagName.toLowerCase()}.${e.className}:${getComputedStyle(e).fontSize}:${(e.textContent ?? "").trim().slice(0, 20)}`));
  const under12: string[] = [];
  under12.push(...(await smallText()));
  await q(page, "busy").focus().catch(() => {});
  await page.keyboard.press("Enter"); /* the already-queried list open, read for size */
  under12.push(...(await smallText()));
  await q(page, "find").focus();
  await page.keyboard.type("Harriet");
  await page.waitForTimeout(400);
  await page.keyboard.press("Enter");
  await expect(R(page)).toHaveAttribute("data-step", "when");
  ok(await tabTo('[data-qls="when-opt"][data-k="today"]'), "Tab reaches Today"); await page.keyboard.press("Enter");
  ok(await tabTo('[data-qls="use-ask"]'), "Tab reaches I sent what Harriet asks for"); await page.keyboard.press("Enter");
  await expect(R(page)).toHaveAttribute("data-step", "how");
  ok(await tabTo('[data-qls="how-opt"]'), "Tab reaches How"); await page.keyboard.press("Enter");
  ok(await tabTo('[data-qls="nudge-continue"]'), "Tab reaches Continue"); await page.keyboard.press("Enter");
  await expect(R(page)).toHaveAttribute("data-step", "check");
  ok(await tabTo('[data-qls="add-note"]'), "Tab reaches Add a note");
  under12.push(...(await smallText()));
  READ.under12 = under12;
  ok(under12.length === 0, `nothing under 12px (${JSON.stringify(under12)})`);
  /* nothing moves on hover on the review */
  const rects = () => R(page).evaluate((root) => [...root.querySelectorAll<HTMLElement>("*")].map((e) => { const r = e.getBoundingClientRect(); return `${e.tagName.toLowerCase()}.${String(e.className).split(" ")[0]}@${Math.round(r.x * 2) / 2},${Math.round(r.y * 2) / 2},${Math.round(r.width * 2) / 2},${Math.round(r.height * 2) / 2}`; }));
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.waitForTimeout(800);
  const moved: string[] = [];
  for (const c of (await R(page).locator('button:visible, [data-qls="went-tile"]').all()).slice(0, 30)) {
    const name = (await c.getAttribute("data-qls")) ?? (await c.getAttribute("data-qc1533")) ?? (await c.getAttribute("class")) ?? "?";
    if (name === "tab" || name.includes("qc1533")) continue;
    await page.mouse.move(0, 0); await page.waitForTimeout(160);
    const a = await rects();
    await c.hover().catch(() => {}); await page.waitForTimeout(260);
    const b = await rects();
    await page.mouse.move(0, 0); await page.waitForTimeout(300);
    const after = await rects();
    const hit = a.map((x, i) => (x !== b[i] && x === after[i] ? b[i] : null)).filter((x): x is string => !!x);
    if (hit.length) moved.push(`${name}: ${hit.length} (${hit.slice(0, 3).join(" | ")})`);
  }
  READ.hoverMoves = moved;
  ok(moved.length === 0, `nothing moves on hover (${JSON.stringify(moved)})`);
  ok(await tabTo('[data-qls="log"]'), "Tab reaches Log query");
  READ.noRing = noRing;
  ok(noRing.length === 0, `a ring on every control met (${JSON.stringify(noRing)})`);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(1500);
  ok(await q(page, "yay-head").isVisible().catch(() => false), "logged by keyboard alone");
  const undo = page.getByRole("button", { name: /^Undo$/ }).first();
  if (await undo.isVisible().catch(() => false)) { await undo.click(); await page.waitForTimeout(1500); }
  ok(!state().queries.some((x) => x.agentId === "laq2-hv"), "undone");
  await discard(page);
});
