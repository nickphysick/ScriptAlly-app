/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Log a query v2 (design-refs/log-a-query-v2/, mock v22) — read off the rendered journey over the mock's own data
 * (tests/e2e/seedLaq2.mjs: Harriet, Callum and Nadia; three books, one per "what is saved"), on the EMULATOR, written in
 * `beforeAll` and removed in `afterAll`. Every write a check makes is undone in the same run (the journey's own Undo,
 * Discard, or the fixture's clean).
 *
 *   V2-1  the header: one navy piece (no seam at 100 / 110 / 125 / 150 %), two lines, the mentor; all six steps shot
 *   V2-2  adding an agent without leaving: 02 → 03 → 04; the record and its Finish task; closing removes both
 *   V2-3  not sent yet: one task, no query; "I've sent it" goes back to Sent and keeps it (v2.1)
 *   V2-4  materials in the three saved states: 12 (asks + package match, one tap), 22 (no packages), 19 (nothing saved), 07
 *   V2-5  nudge: 08 (Unknown), 09 (past the date), 14 (from the card)
 *   V2-6  review: 15, 16 (the materials tile's pop-up open; Esc closes it first), 20 (no date), 10 (past); the two tiles
 *          (v2.2: Plumage colours v3 took the paperclip off the card; the tile keeps its hooks, `data-qc1533="tab"`/`"pop"`)
 *   V2-7  logged: 11 / 18 / 21, each undone
 *   V2-8  three in a row with "Log and start another", the second undone; counts read back
 *   V2-9  Escape at each level; 13 (the leave check)
 *   V2-10 keyboard only, open → logged; focus ring on every control met; nothing under 12px; nothing moves on hover
 */
import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { ensureSignedIn } from "./measure";

const OUT = "reports/log-a-query-v2";
const SHOTS = `${OUT}/shots`;
const READ: Record<string, unknown> = {};
let checks = 0;
const ok = (cond: boolean, label: string) => { checks++; expect.soft(cond, label).toBe(true); };
const BASE = process.env.SA_E2E_BASE_URL ?? "http://127.0.0.1:4321";
const state = () => JSON.parse(execSync("node tests/e2e/seedLaq2.mjs --state").toString().trim().split("\n").pop()!) as {
  queries: { id: string; agentId: string; manuscriptId: string; status: string; nudgeDate: string | null; sentPackageId: string | null }[];
  added: { id: string; name: string; agency: string }[]; tasks: { id: string; text: string; agentId: string | null }[];
};
const R = (p: Page) => p.locator('[data-qls="root"]');
const q = (p: Page, k: string) => p.locator(`[data-qls="${k}"]`);
const txt = async (p: Page, sel: string) => ((await p.locator(sel).first().textContent({ timeout: 5_000 }).catch(() => null)) ?? "").replace(/\s+/g, " ").trim();
const head = (p: Page) => txt(p, '[data-laq="top"] [data-flh="title"]');
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
async function agent(p: Page, id: string) {
  const row = p.locator(`[data-qls="agent"][data-id="${id}"]`);
  const name = id === "laq2-hv" ? "Harriet" : id === "laq2-cr" ? "Callum" : "Nadia";
  await q(p, "find").fill(name);
  await row.waitFor({ state: "visible", timeout: 60_000 });
  await row.click();
}
async function sentToday(p: Page) { await p.locator('[data-qls="when-opt"][data-k="today"]').click(); }
async function sentBack(p: Page, months: number, day = 3) {
  await p.locator('[data-qls="when-opt"][data-k="earlier"]').click();
  for (let i = 0; i < months; i++) await q(p, "cal-prev").click();
  await p.locator(`[data-qls="cal-day"][data-day="${day}"]`).click();
}
async function how(p: Page) { await p.locator('[data-qls="how-opt"]').first().click(); }
async function nudgeOn(p: Page) { await q(p, "nudge-continue").click(); }
async function discard(p: Page) {
  if (!(await R(p).isVisible().catch(() => false))) return;
  await p.locator('[data-qc149f="close"]').first().click();
  await p.waitForTimeout(300);
  if (await q(p, "leave-discard").isVisible().catch(() => false)) await q(p, "leave-discard").click();
  await R(p).waitFor({ state: "hidden", timeout: 10_000 }).catch(() => {});
}

test.describe.configure({ mode: "default" });
test.beforeAll(async ({ browser }) => {
  test.setTimeout(300_000);
  execSync("node tests/e2e/seedLaq2.mjs --clean && node tests/e2e/seedLaq2.mjs", { stdio: "ignore" });
  ({ c: ctx, p: page } = await context(browser));
});
test.afterAll(async () => {
  await ctx?.close();
  execSync("node tests/e2e/seedLaq2.mjs --clean", { stdio: "ignore" });
  mkdirSync(OUT, { recursive: true });
  /* merged into what a fuller run wrote, so a run of one test does not wipe the others' readings */
  const was = (() => { try { return JSON.parse(readFileSync(`${OUT}/readings.json`, "utf8")); } catch { return {}; } })();
  writeFileSync(`${OUT}/readings.json`, JSON.stringify({ ...was, checks, ...READ, at: new Date().toISOString() }, null, 2));
});

test("V2-1 — the header: one navy piece at four zooms, two lines, the mentor; all six steps", async ({ browser }) => {
  test.setTimeout(400_000);
  const seam: Record<string, unknown> = {};
  for (const z of [1, 1.1, 1.25, 1.5]) {
    const { c, p } = z === 1 ? { c: null, p: page } : await context(browser, z);
    await open(p);
    const top = p.locator('[data-laq="top"]');
    const box = (await top.boundingBox())!;
    /* structure: the head and the track paint nothing of their own; the one block paints the navy */
    const paint = await top.evaluate((el) => {
      const cs = (e: Element) => getComputedStyle(e);
      const flh = el.querySelector(".flh")!, trk = el.querySelector(".laq-trk")!;
      return { top: cs(el).backgroundColor, flh: cs(flh).backgroundColor, trk: cs(trk).backgroundColor,
        flhEdge: [cs(flh).borderBottomWidth, cs(flh).boxShadow], trkEdge: [cs(trk).borderTopWidth, cs(trk).borderBottomWidth, cs(trk).boxShadow] };
    });
    /* pixels: a column 8px in from the left edge, the whole height of the block, decoded in the page */
    const png = await p.screenshot({ clip: { x: box.x, y: box.y, width: Math.min(40, box.width), height: box.height }, animations: "disabled" });
    const off = await p.evaluate(async (b64) => {
      const img = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob());
      const cv = new OffscreenCanvas(img.width, img.height); const g = cv.getContext("2d")!; g.drawImage(img, 0, 0);
      const x = Math.round(8 * img.width / 40); let bad = 0; const rows: number[] = [];
      for (let y = 2; y < img.height - 2; y++) {
        const [r, gg, b] = g.getImageData(x, y, 1, 1).data;
        if (Math.abs(r - 0x2a) > 3 || Math.abs(gg - 0x3a) > 3 || Math.abs(b - 0x52) > 3) { bad++; if (rows.length < 5) rows.push(y); }
      }
      return { h: img.height, bad, rows };
    }, png.toString("base64"));
    mkdirSync(SHOTS, { recursive: true });
    await p.screenshot({ path: `${SHOTS}/seam-${Math.round(z * 100)}.png`, clip: { x: box.x, y: box.y + box.height - 70, width: box.width, height: 80 }, animations: "disabled" });
    seam[`${Math.round(z * 100)}%`] = { paint, off };
    ok(paint.flh === "rgba(0, 0, 0, 0)" && paint.trk === "rgba(0, 0, 0, 0)", `${z}: the head and the track paint nothing of their own`);
    ok(off.bad === 0, `${z}: the column down the header is navy all the way (off-navy rows: ${JSON.stringify(off.rows)})`);
    const lines = await p.locator('[data-laq="top"] [data-flh="title"]').evaluate((el) => Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)));
    ok(lines <= 2, `${z}: the headline is two lines (${lines})`);
    seam[`${Math.round(z * 100)}%`] = { ...(seam[`${Math.round(z * 100)}%`] as object), lines, mentor: await p.locator('[data-laq="mentor"]').isVisible() };
    if (z === 1.5) {
      /* every step at 150% */
      await agent(p, "laq2-hv"); await shot(p, "150-step2-sent"); await sentToday(p);
      await shot(p, "150-step3-materials"); await q(p, "use-ask").click(); await shot(p, "150-step4-how"); await how(p);
      await shot(p, "150-step5-nudge"); await nudgeOn(p); await shot(p, "150-step6-log");
      await discard(p);
    }
    if (c) await c.close();
  }
  READ.seam = seam;
  /* 100%: the six steps */
  await open(page);
  ok((await head(page)) === "Another query out. Great work!Let’s log the details.", `the default headline (${await head(page)})`);
  ok(await page.locator('[data-laq="mentor"]').getAttribute("alt") === "", "the mentor is decorative");
  await shot(page, "01-agent-step");
  await agent(page, "laq2-hv"); await shot(page, "100-step2-sent"); await sentToday(page);
  await shot(page, "100-step3-materials"); await q(page, "use-ask").click(); await shot(page, "100-step4-how"); await how(page);
  await shot(page, "100-step5-nudge"); await nudgeOn(page); await shot(page, "100-step6-log");
  await discard(page);
});

test("V2-2 — adding an agent without leaving the journey; closing removes it and its task", async () => {
  test.setTimeout(240_000);
  await open(page);
  await q(page, "find").fill("imogen laqtwo");
  await page.waitForTimeout(300);
  ok((await txt(page, '[data-qls="new-agent"]')).includes("Add Imogen Laqtwo as a new agent"), "the last row names the search");
  ok(await q(page, "none").isVisible(), "no one called that");
  await shot(page, "02-agent-not-found");
  await q(page, "new-agent").click();
  ok(await q(page, "add-name").inputValue() === "Imogen Laqtwo", "the name comes from the search");
  ok((await panel(page).count()) === 1, "still one panel");
  await shot(page, "03-add-agent-in-the-journey");
  await q(page, "add-agency").fill("Fogbound Books");
  await q(page, "add-go").click();
  await expect(R(page)).toHaveAttribute("data-step", "when", { timeout: 15_000 });
  await page.waitForTimeout(800);
  const s1 = state();
  const added = s1.added.find((a) => a.name === "Imogen Laqtwo");
  ok(!!added && added.agency === "Fogbound Books", `the agent is on the Contact list (${JSON.stringify(s1.added)})`);
  ok(s1.tasks.filter((t) => t.agentId === added?.id && /^Finish Imogen Laqtwo.s card$/.test(t.text)).length === 1, `one Finish task (${JSON.stringify(s1.tasks)})`);
  ok((await txt(page, ".laq-qh")) === "When did it go to Imogen?", "the Sent step asks about her");
  await shot(page, "04-sent-step-with-not-sent-link");
  READ.added = s1;
  await discard(page);
  await page.waitForTimeout(1500);
  const s2 = state();
  ok(!s2.added.some((a) => a.name === "Imogen Laqtwo"), `closing removed the agent (${JSON.stringify(s2.added)})`);
  ok(!s2.tasks.some((t) => t.agentId === added?.id), `…and the task (${JSON.stringify(s2.tasks)})`);
});

test("V2-3 — not sent yet: one task, no query; I've sent it goes back to Sent and keeps it", async () => {
  test.setTimeout(180_000);
  await open(page);
  await agent(page, "laq2-hv");
  await q(page, "not-sent").click();
  await q(page, "not-sent-task").waitFor({ state: "visible", timeout: 10_000 });
  ok((await head(page)) === "Not out yet? No problem.It’s on your to-do list.", `the not-sent headline (${await head(page)})`);
  await shot(page, "05-not-sent-yet");
  await page.waitForTimeout(600);
  const s1 = state();
  ok(s1.tasks.filter((t) => t.agentId === "laq2-hv" && t.text === "Send your query to Harriet Vance").length === 1, `one task (${JSON.stringify(s1.tasks)})`);
  ok(s1.queries.length === 0, "no query record");
  await q(page, "sent-after-all").click();
  await expect(R(page)).toHaveAttribute("data-step", "when");
  await q(page, "not-sent").click();
  await q(page, "sent-after-all").click();
  await page.waitForTimeout(800);
  const s2 = state();
  /* v2.1 · Phase 4: the task's "I've sent it" goes back to Sent and keeps the task (logging completes it, V21-3); pressing
     "Put it on your to-do list" again made no second */
  ok(s2.tasks.filter((t) => t.agentId === "laq2-hv").length === 1, `I've sent it keeps the one task (${JSON.stringify(s2.tasks)})`);
  /* catching up: an earlier date more than a week back */
  await sentBack(page, 2);
  ok((await head(page)).startsWith("Catching up."), `catching up (${await head(page)})`);
  await discard(page);
});

test("V2-4 — materials in the three saved states", async () => {
  test.setTimeout(240_000);
  /* packages and named: the asks, the package match, one tap */
  await open(page);
  await agent(page, "laq2-hv"); await sentToday(page);
  ok(await q(page, "fork").isVisible(), "the two tiles with packages saved");
  ok((await txt(page, '[data-qls="ask-fit"]')) === "Your Full submission package matches it.", `the package match (${await txt(page, '[data-qls="ask-fit"]')})`);
  ok((await page.locator('[data-qls="ask"]').allTextContents()).join("|") === "Query letter|Synopsis|First 3 chapters", "what Harriet asks for");
  await shot(page, "12-materials-what-they-ask-for");
  await q(page, "use-ask").click();
  await expect(R(page)).toHaveAttribute("data-step", "how");
  ok((await txt(page, '[data-qls="step"][data-k="what"] [data-qls="step-value"]')) === "Full submission", "one tap used the package");
  await discard(page);
  /* named, no packages: straight to the pieces */
  await open(page, "laq2-msn");
  await agent(page, "laq2-ns"); await sentToday(page);
  ok(!(await q(page, "fork").count()) && await q(page, "pieces").isVisible(), "no packages: straight to the pieces");
  ok((await txt(page, ".laq-qh")) === "What did you send Nadia?", "the question without packages");
  await shot(page, "22-materials-no-packages-skips-the-tiles");
  await page.locator('[data-qls="piece"][data-k="sample"] > button').click();
  ok(await q(page, "sample-control").isVisible(), "a sample opens the app's SampleControl");
  ok((await txt(page, '[data-qls="piece"][data-k="sample"] [data-qls="piece-sub"]')) === "First 50 pages · Version 2", `the sample states its size (${await txt(page, '[data-qls="piece"][data-k="sample"] [data-qls="piece-sub"]')})`);
  await shot(page, "07-pieces-named-sample-open");
  await discard(page);
  /* nothing saved: generic pieces and the note; Callum's card says nothing; catching up */
  await open(page, "laq2-ms0");
  await agent(page, "laq2-cr"); await sentBack(page, 2);
  ok((await txt(page, '[data-qls="asks"]')).includes("Nothing on Callum's card"), "the nil line");
  ok(!(await q(page, "use-ask").count()), "no button with nothing on the card");
  ok(await q(page, "generic-note").isVisible(), "the generic note");
  ok((await head(page)).startsWith("Catching up."), "catching up from the Sent step on");
  await shot(page, "06-catching-up-materials-nothing-on-card");
  await shot(page, "19-pieces-nothing-saved");
  await discard(page);
});

test("V2-5 — nudge: Unknown, past the date, from the card", async () => {
  test.setTimeout(240_000);
  await open(page, "laq2-ms0");
  await agent(page, "laq2-cr"); await sentToday(page);
  await q(page, "pieces-continue").click(); await how(page);
  ok((await txt(page, '[data-qls="reply-by"]')).startsWith("No reply date"), "Unknown works without a date");
  await shot(page, "08-nudge-no-response-time");
  await discard(page);
  await open(page);
  await agent(page, "laq2-hv"); await sentBack(page, 3);
  await q(page, "use-ask").click(); await how(page);
  ok((await txt(page, ".laq-qh.is-q2")) === "It’s past that date. What now?", "past the date");
  ok((await page.locator('[data-qls="nudge-opt"][data-on="1"]').getAttribute("data-k")) === "now", "nudge now is the default");
  await shot(page, "09-nudge-past-the-date");
  await page.locator('[data-qls="nudge-opt"][data-k="nudge"] > button').click();
  ok((await page.locator('[data-qls="nudge-chip"]').allTextContents()).slice(0, 3).join("|") === "In a week|In two weeks|In a month", "give it longer: from today");
  await discard(page);
  await open(page);
  await agent(page, "laq2-hv"); await sentToday(page); await q(page, "use-ask").click(); await how(page);
  await shot(page, "14-nudge-from-card");
  await discard(page);
});

test("V2-6 — review: the grid card in preview, the materials tile, the two numbers", async () => {
  test.setTimeout(240_000);
  await open(page);
  await agent(page, "laq2-hv"); await sentToday(page); await q(page, "use-ask").click(); await how(page); await nudgeOn(page);
  const card = page.locator('[data-qls="preview"] [data-qc154="card"]');
  ok(await card.isVisible(), "the grid card");
  ok((await card.getAttribute("role")) === "group" && (await card.getAttribute("tabindex")) === null, "not a link: no button role, no tab stop");
  ok(!(await card.locator('[data-qc154="act"]').count()), "no hover action in the Next box");
  /* v2.1 · Phase 1 (D2): the two numbers are big numbers, the figure after logging with "+1" (V21-1 reads them) */
  const tiles = await page.locator('[data-qls="count"]').evaluateAll((els) => els.map((e) => ({ k: e.getAttribute("data-k"), t: (e.textContent ?? "").replace(/\s+/g, " ").trim() })));
  READ.tiles = tiles;
  ok(tiles.length === 2 && tiles.every((x) => /\+1/.test(x.t)), `two big numbers (${JSON.stringify(tiles)})`);
  await shot(page, "15-review");
  const hoverBefore = await card.boundingBox();
  await card.hover(); await page.waitForTimeout(300);
  const hoverAfter = await card.boundingBox();
  ok(JSON.stringify(hoverBefore) === JSON.stringify(hoverAfter), "no hover lift");
  await card.locator('[data-qc1533="tab"]').click();
  ok(await card.locator('[data-qc1533="pop"]').isVisible(), "the materials tile opens its pop-up on a click");
  await shot(page, "16-review-materials-tile-open");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  ok(!(await card.locator('[data-qc1533="pop"]').count()) && await R(page).isVisible(), "Escape closes the pop-up first; the journey stays");
  ok(!(await q(page, "leave-keep").isVisible().catch(() => false)), "…and asks nothing yet");
  await discard(page);
  /* no date, no reminder */
  await open(page, "laq2-ms0");
  await agent(page, "laq2-cr"); await sentToday(page); await q(page, "pieces-continue").click(); await how(page);
  await page.locator('[data-qls="nudge-opt"][data-k="none"] > button').click(); await nudgeOn(page);
  ok((await txt(page, '[data-qc154="no-date"]')) === "No date yet", "no reply date: No date yet");
  await shot(page, "20-review-no-date-no-reminder");
  await discard(page);
  /* past the date */
  await open(page);
  await agent(page, "laq2-hv"); await sentBack(page, 3); await q(page, "use-ask").click(); await how(page); await nudgeOn(page);
  READ.pastNext = await txt(page, '[data-qls="preview"] [data-qc154="fact"][data-k="next"]');
  ok(String(READ.pastNext).startsWith("Gone quiet") || String(READ.pastNext).startsWith("NextPast expected"), `past the date: the grid card's own words (${READ.pastNext})`);
  await shot(page, "10-review-past-the-date");
  await discard(page);
});

test("V2-7 — logged: three endings, each undone", async () => {
  test.setTimeout(300_000);
  const logged = async (name: string) => {
    await q(page, "log").click();
    await q(page, "yay").waitFor({ state: "visible", timeout: 20_000 });
    await page.waitForTimeout(1500);
    READ[`${name}-head`] = await head(page);
    READ[`${name}-line`] = await txt(page, '[data-qls="yay-line"]');
    await shot(page, name);
    await q(page, "undo").click();
    await expect(R(page)).toHaveAttribute("data-step", "check", { timeout: 20_000 });
    await discard(page);
  };
  await open(page);
  await agent(page, "laq2-hv"); await sentBack(page, 3); await q(page, "use-ask").click(); await how(page); await nudgeOn(page);
  await logged("11-logged-past-the-date");
  ok(String(READ["11-logged-past-the-date-head"]).startsWith("Logged. Off to Harriet!"), `logged head (${READ["11-logged-past-the-date-head"]})`);
  await open(page);
  await agent(page, "laq2-hv"); await sentToday(page); await q(page, "use-ask").click(); await how(page);
  await page.locator('[data-qls="nudge-opt"][data-k="close"] > button').click(); await nudgeOn(page);
  await logged("18-logged-close-if-no-reply");
  ok(/That makes \d+ active quer/.test(String(READ["18-logged-close-if-no-reply-head"])), `the count read back (${READ["18-logged-close-if-no-reply-head"]})`);
  await open(page, "laq2-ms0");
  await agent(page, "laq2-cr"); await sentToday(page); await q(page, "pieces-continue").click(); await how(page);
  await page.locator('[data-qls="nudge-opt"][data-k="none"] > button').click(); await nudgeOn(page);
  await logged("21-logged-no-date-no-reminder");
  await page.waitForTimeout(1000);
  ok(state().queries.length === 0, "every logged query was undone");
});

test("V2-8 — three in a row with Log and start another, the second undone", async () => {
  test.setTimeout(300_000);
  await open(page);
  const more = async (id: string) => {
    await agent(page, id);
    if (await R(page).getAttribute("data-step") === "when") await sentToday(page);
    if (await R(page).getAttribute("data-step") === "what") { if (await q(page, "use-ask").count()) await q(page, "use-ask").click(); else await q(page, "pieces-continue").click(); }
    if (await R(page).getAttribute("data-step") === "how") await how(page);
    if (await R(page).getAttribute("data-step") === "nudge") await nudgeOn(page);
    await q(page, "log-more").click();
    await expect(R(page)).toHaveAttribute("data-step", "who", { timeout: 20_000 });
    await page.waitForTimeout(800);
  };
  await more("laq2-hv");
  ok((await txt(page, '[data-qls="toast"]')).startsWith("Harriet logged."), "the toast");
  ok((await head(page)) === "That’s 1 logged.Who’s next?", `the sitting (${await head(page)})`);
  await shot(page, "17-after-log-and-start-another");
  await more("laq2-ns");
  ok((await head(page)) === "That’s 2 logged.Who’s next?", "two");
  await q(page, "toast-undo").click();
  await expect(R(page)).toHaveAttribute("data-step", "check", { timeout: 20_000 });
  ok((await head(page)).startsWith("That’s 1 logged."), `undo stepped the count back (${await head(page)})`);
  await page.locator('[data-qls="step"][data-k="who"]').click();
  await more("laq2-cr");
  ok((await head(page)) === "That’s 2 logged.Who’s next?", "two again");
  await page.waitForTimeout(1200);
  const s = state();
  READ.threeInARow = s.queries;
  ok(s.queries.some((x) => x.agentId === "laq2-hv") && s.queries.some((x) => x.agentId === "laq2-cr") && !s.queries.some((x) => x.agentId === "laq2-ns"), `Harriet and Callum logged, Nadia undone (${JSON.stringify(s.queries)})`);
  ok((await page.locator('[data-qls="agent-busy"][data-id="laq2-hv"]').count()) + (await page.locator('[data-qls="busy"]').count()) > 0, "the logged agent moved to the already-queried group");
  await discard(page);
  execSync("node tests/e2e/seedLaq2.mjs --clean && node tests/e2e/seedLaq2.mjs", { stdio: "ignore" });
});

test("V2-9 — Escape at each level", async () => {
  test.setTimeout(180_000);
  await open(page);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  ok(!(await R(page).isVisible().catch(() => false)), "nothing entered: Esc just closes");
  await open(page);
  await agent(page, "laq2-hv");
  await page.locator('[data-qls="when-opt"][data-k="earlier"]').click();
  await page.keyboard.press("Escape");
  ok(!(await q(page, "calendar").count()) && await R(page).isVisible(), "the open calendar closes first");
  await page.keyboard.press("Escape");
  ok(await q(page, "leave-keep").isVisible(), "then the leave check");
  await shot(page, "13-leave-check");
  await page.keyboard.press("Escape");
  ok(!(await q(page, "leave-keep").isVisible().catch(() => false)) && await R(page).isVisible(), "Esc on the leave check keeps the journey");
  await sentToday(page);
  await page.locator('[data-qls="fork-tile"][data-k="pcs"]').click();
  ok(await q(page, "piece-open").count() > 0, "the letter opens in place");
  await page.keyboard.press("Escape");
  ok(!(await q(page, "piece-open").count()) && await R(page).isVisible(), "an open piece folds first");
  await page.keyboard.press("Escape");
  await q(page, "leave-discard").click();
  await R(page).waitFor({ state: "hidden" });
});

test("V2-10 — keyboard only, open → logged; focus rings; nothing under 12px; nothing moves on hover", async () => {
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
        return { hit: a.matches(s), ring, name: `${a.tagName.toLowerCase()}[${a.getAttribute("data-qls") ?? a.getAttribute("data-qc1533") ?? a.className}]` };
      }, sel);
      if (!r.ring && r.name) noRing.push(r.name);
      if (r.hit) return true;
    }
    return false;
  };
  const under12: string[] = [];
  const smallText = () => R(page).evaluate((root) => [...root.querySelectorAll<HTMLElement>("*")].filter((e) => {
    if (!e.offsetParent && getComputedStyle(e).position !== "fixed") return false;
    const own = [...e.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? "").trim());
    return own && parseFloat(getComputedStyle(e).fontSize) < 12;
  }).map((e) => `${e.tagName.toLowerCase()}.${e.className}:${getComputedStyle(e).fontSize}:${(e.textContent ?? "").trim().slice(0, 20)}`));
  await page.keyboard.type("Harriet");
  await page.waitForTimeout(400);
  await page.keyboard.press("Enter");
  await expect(R(page)).toHaveAttribute("data-step", "when");
  ok(await tabTo('[data-qls="when-opt"][data-k="today"]'), "Tab reaches Today"); await page.keyboard.press("Enter");
  ok(await tabTo('[data-qls="use-ask"]'), "Tab reaches I sent what Harriet asks for"); await page.keyboard.press("Enter");
  await expect(R(page)).toHaveAttribute("data-step", "how");
  ok(await tabTo('[data-qls="how-opt"]'), "Tab reaches How"); await page.keyboard.press("Enter");
  under12.push(...(await smallText()));
  ok(await tabTo('[data-qls="nudge-continue"]'), "Tab reaches Continue"); await page.keyboard.press("Enter");
  await expect(R(page)).toHaveAttribute("data-step", "check");
  ok(await tabTo('[data-qc1533="tab"]'), "Tab reaches the materials tile");
  /* nothing under 12px, on the review (and below, on the nudge step and the logged screen) */
  const small = [...under12, ...(await smallText())];
  READ.under12 = small;
  ok(small.length === 0, `nothing under 12px (${JSON.stringify(small)})`);
  /* nothing moves on hover: every control in the panel, the rest of the panel measured before and after */
  const rects = () => R(page).evaluate((root) => [...root.querySelectorAll<HTMLElement>("*")].map((e) => { const r = e.getBoundingClientRect(); return `${e.tagName.toLowerCase()}.${String(e.className).split(" ")[0]}@${Math.round(r.x * 2) / 2},${Math.round(r.y * 2) / 2},${Math.round(r.width * 2) / 2},${Math.round(r.height * 2) / 2}`; }));
  const moved: string[] = [];
  /* a still start: focus off the materials tile (its pop-up shut), the body at the top, animations done */
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await R(page).locator('[data-qls="body"]').evaluate((el) => { el.scrollTop = 0; });
  await page.waitForTimeout(800);
  const controls = await R(page).locator('button:visible, [role="button"]:visible').all();
  for (const c of controls.slice(0, 30)) {
    const name = (await c.getAttribute("data-qls")) ?? (await c.getAttribute("data-qc1533")) ?? (await c.getAttribute("class")) ?? "?";
    if (name === "tab" || name.includes("qc1533")) continue; /* the materials tile opens its pop-up on hover (a layer over, not a move) */
    await page.mouse.move(0, 0); await page.waitForTimeout(160);
    const a = await rects();
    await c.hover().catch(() => {}); await page.waitForTimeout(260);
    const b = await rects();
    await page.mouse.move(0, 0); await page.waitForTimeout(300);
    const after = await rects();
    /* a move ON HOVER is one that comes back when the pointer leaves; a drift that does not (an animation still settling,
       a scroll) is not the hover's */
    const hit = a.map((x, i) => (x !== b[i] && x === after[i] ? b[i] : null)).filter((x): x is string => !!x);
    if (hit.length) moved.push(`${name}: ${hit.length} (${hit.slice(0, 3).join(" | ")})`);
    const drift = a.filter((x, i) => x !== after[i]).length;
    if (drift) (READ.hoverDrift ??= [] as string[]) && (READ.hoverDrift as string[]).push(`${name}: ${drift} (${a.find((x, i) => x !== after[i])})`);
  }
  READ.hoverMoves = moved;
  ok(moved.length === 0, `nothing moves on hover (${JSON.stringify(moved)})`);
  await page.mouse.move(0, 0);
  ok(await tabTo('[data-qls="log"]'), "Tab reaches Log query"); await page.keyboard.press("Enter");
  await q(page, "yay").waitFor({ state: "visible", timeout: 20_000 });
  await page.waitForTimeout(1500);
  const yaySmall = await smallText();
  READ.under12yay = yaySmall;
  ok(yaySmall.length === 0, `nothing under 12px on the logged screen (${JSON.stringify(yaySmall)})`);
  READ.noRing = [...new Set(noRing)];
  ok(noRing.length === 0, `a focus ring on every control met (${JSON.stringify([...new Set(noRing)])})`);
  ok(await tabTo('[data-qls="undo"]'), "Tab reaches Undo"); await page.keyboard.press("Enter");
  await expect(R(page)).toHaveAttribute("data-step", "check", { timeout: 20_000 });
  await discard(page);
  await page.waitForTimeout(800);
  ok(state().queries.length === 0, "the keyboard log was undone");
});
