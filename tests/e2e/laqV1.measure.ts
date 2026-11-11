/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Log a query v1 — LAQ1–LAQ8, read off the rendered panel (never the source):
 *   LAQ1  no <select>, no date input and no free-text date anywhere in the log panel, on every stage
 *   LAQ2  the inline calendar: future days disabled, the next month disabled past today
 *   LAQ3  the stepper: each answered segment shows its answer
 *   LAQ4  skip-to-check: a segment reached from the strip returns straight to the check
 *   LAQ5  the preview slip is the real QcSlip153, on the check
 *   LAQ6  Log and start another: the toast, then the next agent lands on the check with the date and materials carried
 *   LAQ7  the milestone at n = 25 (the book padded to 24 by seedLaq.mjs, removed after)
 *   LAQ8  reduced motion: the finished celebration at once (headline whole, no confetti, no stamp)
 *   LAQ9  v1.1, the track: each node's state on every stage (navy ✓ done, the 40px ringed disc now, faint outlines
 *         to come); finished nodes are buttons in the tab order and nothing else on the track is focusable; Enter on
 *         a finished node opens its stage, and answering it returns to the check
 * Every log is undone in the same run (the celebration's Undo, or the batch toast's), and a run writing fewer readings
 * than it claims fails (LAQ_FLOOR).
 */
import { expect, test, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { openLog, settledReady } from "./laqLib";

const OUT = "reports/log-a-query-v1-1";
const READ: Record<string, unknown> = {};
let checks = 0;
/* soft: a red check never stops a case before its Undo, so a failing run still leaves the account as it found it */
const ok = (cond: boolean, label: string) => { checks++; expect.soft(cond, label).toBe(true); };
const P = (page: Page) => page.locator('[data-qls="root"]');
const step = async (page: Page) => P(page).getAttribute("data-step");
const val = async (page: Page, k: string) => ((await page.locator(`[data-qls="step"][data-k="${k}"] [data-qls="step-value"]`).textContent()) ?? "").trim();

async function inputsReport(page: Page) {
  return page.evaluate(() => {
    const root = document.querySelector('[data-qls="root"]')!;
    const ins = [...root.querySelectorAll("input")].map((i) => ({ type: i.type, qls: i.getAttribute("data-qls") }));
    return { selects: root.querySelectorAll("select").length, dates: ins.filter((i) => i.type === "date" || i.type === "datetime-local").length, inputs: ins };
  });
}
async function noFormControls(page: Page, where: string) {
  const r = await inputsReport(page);
  READ[`LAQ1 ${where}`] = r;
  ok(r.selects === 0, `${where}: no <select>`);
  ok(r.dates === 0, `${where}: no date input`);
  ok(r.inputs.every((i) => i.qls === "find"), `${where}: the only text field is the agent search (${JSON.stringify(r.inputs)})`);
}
async function toCheck(page: Page) {
  const id = await settledReady(page);
  await page.locator(`[data-qls="agent"][data-id="${id}"]`).click();
  await page.locator('[data-qls="when-opt"][data-k="today"]').click();
  if (await page.locator('[data-qls="package"]').count()) await page.locator('[data-qls="package"]').first().click();
  else await page.locator('[data-qls="pieces-continue"]').click();
  if ((await step(page)) === "how") await page.locator('[data-qls="how-opt"]').first().click();
  await expect(P(page)).toHaveAttribute("data-step", "check");
}
async function undoCelebration(page: Page) {
  await page.locator('[data-qls="undo"]').click();
  await expect(P(page)).toHaveAttribute("data-step", "check", { timeout: 120_000 });
}

test.describe.configure({ mode: "serial" });
test.afterAll(() => {
  mkdirSync(OUT, { recursive: true });
  writeFileSync(`${OUT}/readings.json`, JSON.stringify({ checks, ...READ }, null, 2));
  execSync("node tests/e2e/seedLaq.mjs --clean --clean-today", { stdio: "inherit" });
});

test("LAQ1 · LAQ2 · LAQ3 · LAQ4 · LAQ5 — the stages, the calendar, the stepper, skip-to-check, the preview", async ({ page }) => {
  test.setTimeout(600_000);
  await openLog(page);
  await noFormControls(page, "Agent");
  /* pin the agent by id: the list can re-sort under a read (an earlier Undo still settling) */
  const id = await settledReady(page);
  const first = ((await page.locator(`[data-qls="agent"][data-id="${id}"] b`).textContent()) ?? "").split(/\s+/)[0];
  await page.locator(`[data-qls="agent"][data-id="${id}"]`).click();
  ok((await step(page)) === "when", "answering the Agent stage moves on to Sent");
  await noFormControls(page, "Sent");
  await page.locator('[data-qls="when-opt"][data-k="earlier"]').click();
  await noFormControls(page, "Sent, calendar open");
  /* LAQ2 */
  const cal = await page.evaluate(() => {
    const days = [...document.querySelectorAll<HTMLButtonElement>('[data-qls="cal-day"]')];
    const today = new Date().getDate();
    return {
      future: days.filter((d) => Number(d.dataset.day) > today).map((d) => d.disabled),
      past: days.filter((d) => Number(d.dataset.day) <= today).map((d) => d.disabled),
      next: document.querySelector<HTMLButtonElement>('[data-qls="cal-next"]')?.disabled ?? null,
    };
  });
  READ.LAQ2 = cal;
  ok(cal.future.length === 0 || cal.future.every(Boolean), "LAQ2: every day after today is disabled");
  ok(cal.past.every((d) => !d), "LAQ2: today and the days before it can be picked");
  ok(cal.next === true, "LAQ2: the next month is disabled in this month");
  await page.locator('[data-qls="cal-prev"]').click();
  ok((await page.locator('[data-qls="cal-day"]:disabled').count()) === 0, "LAQ2: last month has no disabled day");
  await page.locator('[data-qls="cal-day"][data-day="12"]').click();
  ok((await step(page)) === "what", "LAQ2: picking a day moves on");
  await noFormControls(page, "Materials");
  const pk = page.locator('[data-qls="package"]');
  let what: string;
  if (await pk.count()) { what = ((await pk.first().locator("b").textContent()) ?? "").trim(); await pk.first().click(); }
  else { await page.locator('[data-qls="pieces-continue"]').click(); what = "pieces"; }
  if ((await step(page)) === "how") { await noFormControls(page, "How"); await page.locator('[data-qls="how-opt"]').first().click(); }
  await noFormControls(page, "Check");
  /* LAQ3 */
  const values = { who: await val(page, "who"), when: await val(page, "when"), what: await val(page, "what"), how: await val(page, "how") };
  READ.LAQ3 = values;
  ok(values.who === first, `LAQ3: Agent shows the first name (${values.who})`);
  ok(/^\d{1,2} [A-Z][a-z]{2}$/.test(values.when), `LAQ3: Sent shows the day picked (${values.when})`);
  ok(what === "pieces" ? /^\d piece/.test(values.what) : values.what === what, `LAQ3: Materials shows the package or the piece count (${values.what})`);
  ok(["Email", "QueryManager", "Online form", "Post"].includes(values.how), `LAQ3: How shows the method (${values.how})`);
  /* LAQ5 */
  const slip = page.locator('[data-qls="preview"] [data-qc153="slip"]');
  ok((await slip.count()) === 1, "LAQ5: the check shows the real slip");
  ok((await slip.getAttribute("role")) === "group" && (await slip.getAttribute("tabindex")) === null, "LAQ5: the preview slip is not a control");
  ok((await page.locator('[data-qls="preview-tag"]').textContent()) === "Preview", "LAQ5: tagged Preview");
  ok((await slip.locator('[data-qc1533="tab"]').count()) === 1, "LAQ5: the paperclip tab is on it");
  /* LAQ4 — Sent from the strip, then Yesterday, lands back on the check */
  await page.locator('[data-qls="step"][data-k="when"]').click();
  ok((await step(page)) === "when", "LAQ4: a done segment goes back to its stage");
  await page.locator('[data-qls="when-opt"][data-k="yesterday"]').click();
  ok((await step(page)) === "check", "LAQ4: answering it returns straight to the check");
  ok((await val(page, "when")) === "Yesterday", "LAQ4: …with the new answer in the strip");
  ok((await val(page, "what")) === values.what && (await val(page, "how")) === values.how, "LAQ4: …and the other answers kept");
});

/* v1.1 — the track's nodes, read off the page */
async function trackRead(page: Page) {
  /* the nodes' size and fill animate over .25s: read once the track has settled (two reads alike) */
  let last = "";
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(150);
    const now = JSON.stringify(await trackRead1(page));
    if (now === last) break;
    last = now;
  }
  return trackRead1(page);
}
async function trackRead1(page: Page) {
  return page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-qls="step"]')].map((el) => {
    const nd = el.querySelector<HTMLElement>('[data-laq="node"]')!;
    const c = getComputedStyle(nd);
    return { k: el.dataset.k, state: el.dataset.state, tag: el.tagName, focusable: el.tabIndex >= 0 && !(el as HTMLButtonElement).disabled,
      w: Math.round(nd.getBoundingClientRect().width), bg: c.backgroundColor, text: (nd.textContent ?? "").trim() };
  }));
}
test("LAQ9 — the track: node states, keyboard, a finished node opens its stage", async ({ page }) => {
  test.setTimeout(600_000);
  await openLog(page);
  const expectStates = async (stage: string, states: string[]) => {
    const t = await trackRead(page);
    READ[`LAQ9 ${stage}`] = t;
    ok(t.map((x) => x.state).join() === states.join(), `LAQ9 ${stage}: states ${t.map((x) => x.state).join()}`);
    for (const [i, n] of t.entries()) {
      if (n.state === "done") ok(n.tag === "BUTTON" && n.focusable && n.w === 32 && n.bg === "rgb(255, 255, 255)" && n.text === "✓", `LAQ9 ${stage}: ${n.k} is a finished node (v1.2, on the navy header: white with a navy ✓, a button) ${JSON.stringify(n)}`);
      else if (n.state === "now") ok(n.tag !== "BUTTON" && !n.focusable && n.w === 40 && n.bg === "rgb(255, 255, 255)" && n.text === String(i + 1), `LAQ9 ${stage}: ${n.k} is the current disc ${JSON.stringify(n)}`);
      else ok(n.tag !== "BUTTON" && !n.focusable && n.w === 32 && n.text === String(i + 1), `LAQ9 ${stage}: ${n.k} is to come, not focusable ${JSON.stringify(n)}`);
    }
  };
  await expectStates("Agent", ["now", "todo", "todo", "todo", "todo"]);
  await page.locator(`[data-qls="agent"][data-id="${await settledReady(page)}"]`).click();
  await expectStates("Sent", ["done", "now", "todo", "todo", "todo"]);
  await page.locator('[data-qls="when-opt"][data-k="today"]').click();
  await expectStates("Materials", ["done", "done", "now", "todo", "todo"]);
  if (await page.locator('[data-qls="package"]').count()) await page.locator('[data-qls="package"]').first().click();
  else await page.locator('[data-qls="pieces-continue"]').click();
  if ((await step(page)) === "how") {
    await expectStates("How", ["done", "done", "done", "now", "todo"]);
    await page.locator('[data-qls="how-opt"]').first().click();
  }
  await expectStates("Check", ["done", "done", "done", "done", "now"]);
  /* the keyboard: Tab reaches the finished nodes, Enter opens one, and answering returns to the check */
  await page.locator('[data-qls="step"][data-k="who"]').focus();
  await page.keyboard.press("Tab");
  ok((await page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.k ?? null)) === "when", "LAQ9: Tab moves from Agent to the next finished node");
  await page.keyboard.press("Enter");
  ok((await step(page)) === "when", "LAQ9: Enter on a finished node opens its stage");
  await expectStates("Sent, reopened", ["done", "now", "done", "done", "todo"]);
  await page.locator('[data-qls="when-opt"][data-k="yesterday"]').click();
  ok((await step(page)) === "check", "LAQ9: answering it returns straight to the check");
  ok((await val(page, "when")) === "Yesterday", "LAQ9: the track shows the new answer");
});

test("LAQ6 — Log and start another: toast, carried date and materials, the next agent's own method", async ({ page }) => {
  test.setTimeout(600_000);
  await openLog(page);
  await toCheck(page);
  const firstName = await val(page, "who");
  const whenBefore = await val(page, "when"), whatBefore = await val(page, "what");
  await page.locator('[data-qls="log-more"]').click();
  await expect(P(page)).toHaveAttribute("data-step", "who", { timeout: 120_000 });
  const toast = ((await page.locator('[data-qls="toast"]').textContent()) ?? "").trim();
  const line = ((await page.locator('[data-flh="line"]').textContent()) ?? "").trim();
  READ.LAQ6 = { toast, line, whenBefore, whatBefore };
  ok(toast.startsWith(`${firstName} logged`) && /Undo$/.test(toast), `LAQ6: the toast "${toast}"`);
  /* v1.2 — one line for the journey; after "Log and start another" it names the agent just logged */
  ok(line === `Same date and materials as ${firstName}.`, `LAQ6: the batch line "${line}"`);
  await page.locator(`[data-qls="agent"][data-id="${await settledReady(page)}"]`).click();
  const at = await step(page);
  (READ.LAQ6 as Record<string, unknown>).landed = at;
  ok(at === "check" || at === "how", `LAQ6: the next agent skips Sent and Materials (landed on ${at})`);
  ok((await val(page, "when")) === whenBefore && (await val(page, "what")) === whatBefore, "LAQ6: the date and materials carried over");
  if (at === "check") ok(((await page.locator('[data-flh="line"]').textContent()) ?? "").startsWith(`Same date and materials as ${firstName}.`), "LAQ6: the check says what carried over");
  /* undo the first query (the toast's own Undo) — back on its check */
  await page.locator('[data-qls="toast-undo"]').click();
  /* the page is already on a check (the next agent's), so wait for the FIRST agent's check, not for any check */
  const back = await expect.poll(async () => `${await step(page)}:${await val(page, "who")}`, { timeout: 120_000 }).toBe(`check:${firstName}`).then(() => true, () => false);
  ok(back, "LAQ6: the toast's Undo returns to that query's check");
});

test("LAQ7 — the milestone at the 25th query", async ({ page }) => {
  test.setTimeout(600_000);
  execSync('node tests/e2e/seedLaq.mjs --to 24 --book "Murphy\'s Day Out"', { stdio: "ignore" });
  try {
    await openLog(page);
    await toCheck(page);
    const line = ((await page.locator('[data-flh="line"]').textContent()) ?? "").trim();
    /* v1.2 — the check's line is the journey's one line now; the count is the celebration's (asserted below) */
    ok(line === "Add as much detail as you can.", `LAQ7: the check's line "${line}"`);
    await page.locator('[data-qls="log"]').click();
    await page.locator('[data-qls="yay"]').waitFor({ state: "visible", timeout: 120_000 });
    const ms = ((await page.locator('[data-qls="milestone"]').textContent({ timeout: 3_000 }).catch(() => null)) ?? "").trim();
    const n = await page.locator('[data-qls="odometer"]').getAttribute("data-n");
    READ.LAQ7 = { ms, n, line };
    ok(n === "25", `LAQ7: query number 25 (${n})`);
    ok(ms === "Twenty-five queries. That takes some nerve.", `LAQ7: the milestone "${ms}"`);
    await undoCelebration(page);
  } finally {
    execSync("node tests/e2e/seedLaq.mjs --clean", { stdio: "ignore" });
  }
});

test("LAQ8 — reduced motion: the finished celebration at once", async ({ page }) => {
  test.setTimeout(600_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openLog(page);
  await toCheck(page);
  const first = await val(page, "who");
  await page.locator('[data-qls="log"]').click();
  await page.locator('[data-qls="yay"]').waitFor({ state: "visible", timeout: 120_000 });
  /* read at once: nothing may still be arriving */
  const r = await page.evaluate(() => ({
    head: document.querySelector('[data-qls="yay-head"] span')?.textContent ?? "",
    cursor: !!document.querySelector(".laq-cur"),
    confetti: !!document.querySelector('[data-qls="confetti"]'),
    anims: document.getAnimations().filter((a) => (a.effect as KeyframeEffect | null)?.target instanceof Element && ((a.effect as KeyframeEffect).target as Element).closest('[data-qls="root"]')).length,
  }));
  READ.LAQ8 = r;
  ok(r.head === `Off to ${first}.`, `LAQ8: the headline whole at once ("${r.head}")`);
  ok(!r.cursor, "LAQ8: no typing cursor");
  ok(!r.confetti, "LAQ8: no confetti");
  ok(r.anims === 0, `LAQ8: no animation running in the panel (${r.anims})`);
  await undoCelebration(page);
});

test("LAQ floor — the run measured what it claims", () => {
  const floor = Number(process.env.LAQ_FLOOR ?? 45);
  expect(checks, `only ${checks} checks ran`).toBeGreaterThanOrEqual(floor);
});
