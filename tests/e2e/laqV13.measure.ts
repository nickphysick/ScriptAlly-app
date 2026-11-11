/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Log a query v1.3 — read off the rendered page, over the reference's own data (tests/e2e/seedLaq13.mjs, written in
 * `beforeAll` and removed in `afterAll`):
 *   V13-1  MATERIALS NEVER SPILL: "The Long Names" (Bethuses Version, Prologue cut, Flashback first and a 40-character
 *          name), the sample control open, at panel widths 420, 540 and 640 and with each version chosen: the stage body
 *          and every row have scrollWidth == clientWidth and sit inside the body. The version is one pill and a menu;
 *          the control ends with "Sending the … of …." and Done, which closes it and is scrolled into view on opening;
 *          Continue works with the control open.
 *   V13-2  Joanna (nothing on her card) → Unknown → 6 weeks → the save to her card ticked → Log: the query has the
 *          reply date and the nudge, and her card says 6 weeks. The slip says "Reply expected by" and the nudge.
 *   V13-3  Marcus (8 weeks) → 10 weeks, the update left unticked → Log: his card still says 8.
 *   V13-4  Rosalind (no reply means no) → Close it is preselected and says why → Log: the close date is saved, and
 *          SURVIVES A RELOAD (the expected-date migration used to delete it); the Query Centre's slip says it closes.
 *   V13-5  "Log and start another" asks the Nudge stage again for the next agent.
 * V13-2 and V13-3 are undone in the same run (the celebration's Undo); V13-4 reloads to prove its close date stays, so
 * its query is removed by the fixture's own `--clean` in `afterAll`.
 */
import { expect, test, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { ensureSignedIn } from "./measure";

const OUT = "reports/log-a-query-v1-3";
const READ: Record<string, unknown> = {};
let checks = 0;
const ok = (cond: boolean, label: string) => { checks++; expect.soft(cond, label).toBe(true); };
const R = (page: Page) => page.locator('[data-qls="root"]');
const text = async (page: Page, sel: string) => ((await page.locator(sel).first().textContent({ timeout: 5_000 }).catch(() => null)) ?? "").replace(/\s+/g, " ").trim();
const step = (page: Page) => R(page).getAttribute("data-step");
const saved = (agentId: string) => JSON.parse(execSync(`node tests/e2e/seedLaq13.mjs --queries ${agentId}`).toString().trim().split("\n").pop()!);
const ymdLocal = (iso: string | null) => { if (!iso) return null; const d = new Date(iso); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
const plusDays = (days: number) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + days); return d; };
const ymd = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
const offWeekend = (d: Date) => { const x = new Date(d); if (x.getDay() === 6) x.setDate(x.getDate() + 2); else if (x.getDay() === 0) x.setDate(x.getDate() + 1); return x; };

test.describe.configure({ mode: "serial" });
test.beforeAll(() => { execSync("node tests/e2e/seedLaq13.mjs --clean && node tests/e2e/seedLaq13.mjs", { stdio: "ignore" }); });
test.afterAll(() => {
  execSync("node tests/e2e/seedLaq13.mjs --clean", { stdio: "ignore" });
  mkdirSync(OUT, { recursive: true });
  writeFileSync(`${OUT}/readings.json`, JSON.stringify({ checks, ...READ }, null, 2));
});

async function open(page: Page, ms: string) {
  await page.addInitScript((id) => { try { localStorage.setItem("scriptally_active_manuscript_id", id); } catch { /* none */ } }, ms);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/dashboard");
  await ensureSignedIn(page);
  await page.goto("/dashboard");
}
async function door(page: Page) {
  const d = page.getByRole("button", { name: /^\+?\s*Log a query$/ }).locator("visible=true").first();
  await d.waitFor({ state: "visible", timeout: 60_000 });
  await d.click();
  await R(page).waitFor({ state: "visible", timeout: 30_000 });
}
async function toNudge(page: Page, agentId: string) {
  const row = page.locator(`[data-qls="agent"][data-id="${agentId}"]`);
  await row.waitFor({ state: "visible", timeout: 60_000 });
  await row.click();
  await page.locator('[data-qls="when-opt"][data-k="today"]').click();
  await page.locator('[data-qls="package"][data-id="laq13-pa"]').click();
  if ((await step(page)) === "how") await page.locator('[data-qls="how-opt"]').first().click();
  await expect(R(page)).toHaveAttribute("data-step", "nudge");
}
/** the slider, as a person's drag would set it: the native value, then the input event React listens for */
const slide = (page: Page, n: number) => page.locator('[data-qls="weeks"] input[type="range"]').evaluate((el, v) => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(el, String(v));
  el.dispatchEvent(new Event("input", { bubbles: true }));
}, n);
const optOn = (page: Page, k: string) => page.locator(`[data-qls="nudge-opt"][data-k="${k}"]`).getAttribute("data-on");
async function logAndWait(page: Page) {
  await page.locator('[data-qls="nudge-continue"]').click();
  await expect(R(page)).toHaveAttribute("data-step", "check");
  const next = { label: await text(page, '[data-qls="preview"] [data-k="next"] .qc153-fl'), value: await text(page, '[data-qls="preview"] [data-k="next"] b'), line: await text(page, '[data-qls="preview"] [data-k="next"] em') };
  await page.locator('[data-qls="log"]').click();
  await page.locator('[data-qls="yay"]').waitFor({ state: "visible", timeout: 120_000 });
  return next;
}
async function undo(page: Page) {
  await page.locator('[data-qls="undo"]').click();
  await expect(R(page)).toHaveAttribute("data-step", "check", { timeout: 60_000 });
}

/* ── V13-1 ── */
const overflow = (page: Page) => page.evaluate(() => {
  const body = document.querySelector<HTMLElement>('[data-qls="root"] .laq-sb')!;
  const b = body.getBoundingClientRect();
  const parts = [body, ...body.querySelectorAll<HTMLElement>(".laq-pcs, .laq-pc, .laq-pcw, .laq-qsamp, .laq-vrow, .laq-sdone, .laq-asks, .laq-pc .laq-vr, .laq-vr2")];
  const bad = parts.filter((el) => {
    const r = el.getBoundingClientRect();
    return el.scrollWidth > el.clientWidth + 0 || r.right > b.right + 0.5 || r.left < b.left - 0.5;
  }).map((el) => `${el.className.split(" ")[0]} sw ${el.scrollWidth} cw ${el.clientWidth} right ${Math.round(el.getBoundingClientRect().right)} / ${Math.round(b.right)}`);
  return { n: parts.length, bodySW: body.scrollWidth, bodyCW: body.clientWidth, bad };
});
test("V13-1 — Materials never spill: the long version names at 420, 540 and 640", async ({ page }) => {
  test.setTimeout(600_000);
  await open(page, "laq13-ms2");
  await door(page);
  await page.locator('[data-qls="agent"][data-id="laq13-jl"]').click();
  await page.locator('[data-qls="when-opt"][data-k="today"]').click();
  await expect(R(page)).toHaveAttribute("data-step", "what");
  /* no packages for this book: the pieces, the letter and synopsis already ticked; ticking Opening pages opens the control */
  await page.locator('[data-qls="piece"][data-k="sample"]').click();
  await expect(page.locator('[data-qls="sample-control"]')).toHaveCount(1);
  await page.waitForTimeout(700);
  const doneIn = await page.evaluate(() => {
    const d = document.querySelector<HTMLElement>('[data-qls="sample-done"]')!.getBoundingClientRect();
    const b = document.querySelector<HTMLElement>('[data-qls="root"] .laq-sb')!.getBoundingClientRect();
    return d.top >= b.top - 1 && d.bottom <= b.bottom + 1;
  });
  ok(doneIn, "V13-1: opening the control scrolls its Done line into view");
  ok((await page.locator('[data-qls="version"] .qad-seg').count()) === 0, "V13-1: the version is no longer a seg");
  const names = ["Bethuses Version", "Prologue cut", "Flashback first", "The one where the ferry never quite docks"];
  const rows: Record<string, unknown> = {};
  for (const w of [420, 540, 640]) {
    await page.evaluate((px) => { const p = document.querySelector<HTMLElement>(".spanel:has([data-qls='root'])")!; p.style.setProperty("width", `${px}px`, "important"); }, w);
    for (const nm of names) {
      await page.locator('[data-qls="vr"][data-k="ver"]').click();
      const menu = page.locator('[data-qls="menu"][data-k="ver"]');
      await expect(menu).toBeVisible();
      if (w === 420 && nm === names[0]) {
        const head = await text(page, '[data-qls="menu"][data-k="ver"] .laq-ph');
        const items = await menu.locator('[data-qls="menu-item"]').allTextContents();
        rows.menu = { head, items };
        ok(head === "Which version?" && items.length === 4, `V13-1: the pill opens "Which version?" with every version (${items.length})`);
      }
      await menu.locator('[data-qls="menu-item"]', { hasText: nm }).click();
      await page.waitForTimeout(150);
      const o = await overflow(page);
      const pill = await text(page, '[data-qls="vr"][data-k="ver"]');
      const done = await text(page, '[data-qls="sample-done"] p');
      rows[`${w} · ${nm}`] = { ...o, pill, done };
      ok(o.bad.length === 0 && o.bodySW === o.bodyCW, `V13-1 ${w} · ${nm}: nothing wider than the panel (${o.bad.join(" | ") || `${o.n} parts`})`);
      ok(done === `Sending the first 3 chapters of ${nm}.`, `V13-1 ${w} · ${nm}: the Done line ("${done}")`);
    }
    /* the value pill on a row ellipsises inside 58% of the row */
    const cap = await page.evaluate(() => {
      const r = document.querySelector<HTMLElement>('[data-qls="piece"][data-k="letter"]')!;
      const v = r.querySelector<HTMLElement>(".laq-vr")!;
      return Math.round((v.getBoundingClientRect().width / r.getBoundingClientRect().width) * 100);
    });
    ok(cap <= 58, `V13-1 ${w}: the letter's long name stays within 58% of its row (${cap}%)`);
  }
  READ.V13_1 = rows;
  /* Done closes the control, and the rows show again; Continue works with it open */
  await page.locator('[data-qls="sample-done-btn"]').click();
  ok((await page.locator('[data-qls="sample-control"]').count()) === 0, "V13-1: Done closes the control");
  await page.locator('[data-qls="vr"][data-k="sample"]').click();
  ok((await page.locator('[data-qls="sample-control"]').count()) === 1, "V13-1: the row opens it again");
  await page.locator('[data-qls="pieces-continue"]').click();
  ok((await step(page)) === "how", "V13-1: Continue works with the control open");
  await page.keyboard.press("Escape");
});

/* ── V13-2 ── */
test("V13-2 — Joanna: Unknown, then 6 weeks, saved to her card on Log", async ({ page }) => {
  test.setTimeout(600_000);
  await open(page, "laq13-ms");
  await door(page);
  await toNudge(page, "laq13-jl");
  const q = await text(page, '[data-qls="root"] .laq-qh');
  const sub = await text(page, '[data-qls="nudge-sub"]');
  const read0 = await text(page, '[data-qls="weeks"] .sa-wk-read');
  const by0 = await text(page, '[data-qls="reply-by"]');
  const chips0 = await page.locator('[data-qls="nudge-chip"]').allTextContents();
  const on0 = await page.locator('[data-qls="nudge-chip"][aria-checked="true"]').getAttribute("data-k");
  const closeDis = await page.locator('[data-qls="nudge-opt"][data-k="close"] button').isDisabled();
  const closeSub = await text(page, '[data-qls="nudge-opt"][data-k="close"] [data-qls="nudge-opt-sub"]');
  const unkOn = await page.locator('[data-qls="weeks"] .sa-wk-unkbtn').getAttribute("aria-pressed");
  READ.V13_2 = { q, sub, read0, by0, chips0, on0, closeDis, closeSub, unkOn };
  ok(q === "When might Joanna reply?", `V13-2: the question ("${q}")`);
  ok(sub === "Nothing on Joanna's card about how long they take. Your best guess is fine.", `V13-2: the sub-line ("${sub}")`);
  ok(read0 === "Unknown" && unkOn === "true", `V13-2: it starts Unknown (${read0}, pressed ${unkOn})`);
  ok(by0 === "No reply date, so choose when to be reminded below.", `V13-2: no reply date ("${by0}")`);
  ok(chips0.join("|") === "In 6 weeks|In 8 weeks|In 12 weeks|Pick a date" && on0 === "8w", `V13-2: the chips count from the send (${chips0.join("|")}, ${on0})`);
  ok(closeDis && closeSub === "Needs a response time first.", `V13-2: Close it waits for a response time ("${closeSub}")`);
  ok((await page.locator('[data-qls="save-weeks"]').count()) === 0, "V13-2: no card offer while Unknown");
  ok((await page.locator('[data-qls="weeks"] input[type="range"]').evaluate((el) => (el as HTMLInputElement).min + "-" + (el as HTMLInputElement).max)) === "1-26", "V13-2: 1 to 26 weeks");
  /* the slider is navy */
  /* the fill is the WeekSlider's own inline gradient: navy (#2a3a52), never burgundy */
  const thumb = await page.locator('[data-qls="weeks"] input[type="range"]').evaluate((el) => (el as HTMLElement).style.background);
  ok(/rgb\(42, 58, 82\)/.test(thumb) && !/124, 58, 42/.test(thumb), `V13-2: the slider is the navy one (${thumb})`);
  await slide(page, 6);
  const by1 = await text(page, '[data-qls="reply-by"]');
  const offer = page.locator('[data-qls="save-weeks"]');
  const offerTxt = `${await text(page, '[data-qls="save-weeks"] b')} / ${await text(page, '[data-qls="save-weeks"] i')}`;
  const on1 = await page.locator('[data-qls="nudge-chip"][aria-checked="true"]').getAttribute("data-k");
  const expect6 = plusDays(42);
  Object.assign(READ.V13_2 as object, { by1, offerTxt, on1 });
  ok(by1.startsWith("Reply expected by ") && by1.includes(`${expect6.getDate()} `), `V13-2: the reply date ("${by1}")`);
  ok((await offer.getAttribute("data-kind")) === "save" && (await offer.getAttribute("data-on")) === "1", "V13-2: the save to her card is offered, ticked");
  ok(offerTxt === "Save 6 weeks to Joanna's card / It keeps your Contact list complete, so your tracking and analysis are more accurate.", `V13-2: the offer's words ("${offerTxt}")`);
  ok(on1 === "week", `V13-2: the reminder now counts from the reply date (${on1})`);
  ok(!(await page.locator('[data-qls="nudge-opt"][data-k="close"] button').isDisabled()), "V13-2: Close it is open now");
  /* nothing saved to the card before Log */
  ok(saved("laq13-jl").agentWeeks === null, "V13-2: the card is untouched before Log");
  const next = await logAndWait(page);
  const nudgeDay = offWeekend(plusDays(49));
  Object.assign(READ.V13_2 as object, { next });
  ok(next.label === "Reply expected by" && next.line.startsWith("Nudge scheduled for ") && next.line.includes(`${nudgeDay.getDate()} `), `V13-2: the slip ("${next.label} · ${next.value} · ${next.line}")`);
  const s = saved("laq13-jl");
  Object.assign(READ.V13_2 as object, { saved: s });
  ok(s.queries.length === 1, "V13-2: one query logged");
  ok(ymdLocal(s.queries[0]?.writerExpectedDate) === ymd(expect6), `V13-2: the reply date is saved (${s.queries[0]?.writerExpectedDate})`);
  ok(ymdLocal(s.queries[0]?.nudgeDate) === ymd(nudgeDay) && s.queries[0]?.ifNoResponse === "Remind me to nudge", `V13-2: the nudge is saved (${s.queries[0]?.nudgeDate})`);
  ok(s.agentWeeks === 6, `V13-2: Joanna's card says 6 weeks (${s.agentWeeks})`);
  await undo(page);
  const u = saved("laq13-jl");
  ok(u.queries.length === 0 && u.agentWeeks === null, `V13-2: Undo takes back the query and the card (${u.queries.length}, ${u.agentWeeks})`);
  await page.keyboard.press("Escape");
});

/* ── V13-3 ── */
test("V13-3 — Marcus: 10 weeks, the update left unticked, his card stays at 8", async ({ page }) => {
  test.setTimeout(600_000);
  await open(page, "laq13-ms");
  await door(page);
  await toNudge(page, "laq13-mr");
  const sub = await text(page, '[data-qls="nudge-sub"]');
  const read0 = await text(page, '[data-qls="weeks"] .sa-wk-read');
  ok(sub === "Marcus's card says 8 weeks." && read0 === "8 weeks", `V13-3: from the card ("${sub}", ${read0})`);
  ok((await page.locator('[data-qls="save-weeks"]').count()) === 0, "V13-3: no offer while it matches the card");
  ok((await optOn(page, "nudge")) === "1", "V13-3: Remind me is the default");
  await slide(page, 10);
  const offer = page.locator('[data-qls="save-weeks"]');
  const offerTxt = `${await text(page, '[data-qls="save-weeks"] b')} / ${await text(page, '[data-qls="save-weeks"] i')}`;
  READ.V13_3 = { sub, read0, offerTxt };
  ok((await offer.getAttribute("data-kind")) === "update" && (await offer.getAttribute("data-on")) === "0", "V13-3: the update is offered, unticked");
  ok(offerTxt === "Update Marcus's card to 10 weeks / It says 8 weeks now. Keeping it current makes your tracking and analysis more accurate.", `V13-3: its words ("${offerTxt}")`);
  await logAndWait(page);
  const s = saved("laq13-mr");
  Object.assign(READ.V13_3 as object, { saved: s });
  ok(s.agentWeeks === 8, `V13-3: Marcus's card still says 8 (${s.agentWeeks})`);
  ok(ymdLocal(s.queries[0]?.writerExpectedDate) === ymd(plusDays(70)), `V13-3: the query has its own 10-week date (${s.queries[0]?.writerExpectedDate})`);
  await undo(page);
  ok(saved("laq13-mr").queries.length === 0, "V13-3: Undo removed the query");
  await page.keyboard.press("Escape");
});

/* ── V13-4 ── */
test("V13-4 — Rosalind: Close it preselected; the close date is saved and survives a reload; the Query Centre says so", async ({ page }) => {
  test.setTimeout(600_000);
  await open(page, "laq13-ms");
  await door(page);
  await toNudge(page, "laq13-ra");
  const tag = await text(page, '[data-qls="nudge-opt"][data-k="close"] [data-qls="nudge-tag"]');
  const closeSub = await text(page, '[data-qls="nudge-opt"][data-k="close"] [data-qls="nudge-opt-sub"]');
  READ.V13_4 = { tag, closeSub, how: await text(page, '[data-qls="step"][data-k="how"] [data-qls="step-value"]') };
  ok((await optOn(page, "close")) === "1", "V13-4: Close it is preselected");
  ok(tag === "Rosalind's card says no reply means no", `V13-4: and says why ("${tag}")`);
  const closeDay = plusDays(85);
  ok(closeSub.startsWith("On ") && closeSub.includes(`${closeDay.getDate()} `) && closeSub.endsWith(", marked as no reply."), `V13-4: the day after the reply date ("${closeSub}")`);
  const next = await logAndWait(page);
  Object.assign(READ.V13_4 as object, { next });
  ok(next.line.startsWith("Closes ") && next.line.endsWith(" if no reply") && next.line.includes(`${closeDay.getDate()} `), `V13-4: the slip says when it closes ("${next.line}")`);
  const s = saved("laq13-ra");
  ok(s.queries[0]?.ifNoResponse === "Mark as no response automatically" && ymdLocal(s.queries[0]?.responseDeadline) === ymd(closeDay), `V13-4: the close date is saved (${s.queries[0]?.responseDeadline})`);
  /* the reload: the expected-date migration runs once the queries and agents are loaded */
  await page.goto("/queries");
  const slip = page.locator(`[data-qc153="slip"][data-id="${s.queries[0]?.id}"]`).first();
  await slip.waitFor({ state: "visible", timeout: 60_000 }).catch(() => {});
  await page.waitForTimeout(6000);
  const after = saved("laq13-ra");
  const qc = { label: await text(page, `[data-qc153="slip"][data-id="${s.queries[0]?.id}"] [data-k="next"] .qc153-fl`), line: await text(page, `[data-qc153="slip"][data-id="${s.queries[0]?.id}"] [data-k="next"] em`) };
  Object.assign(READ.V13_4 as object, { saved: s, afterReload: after, qc });
  ok(after.queries[0]?.responseDeadline === s.queries[0]?.responseDeadline && after.queries[0]?.status === "Queried", `V13-4: the close date survives a reload (${after.queries[0]?.responseDeadline})`);
  ok(qc.label === "Reply expected by" && qc.line === next.line, `V13-4: the Query Centre's slip says the same ("${qc.label} · ${qc.line}")`);
});

/* ── V13-5 ── */
test("V13-5 — Log and start another asks the Nudge stage again", async ({ page }) => {
  test.setTimeout(600_000);
  await open(page, "laq13-ms");
  await door(page);
  await toNudge(page, "laq13-mr");
  await page.locator('[data-qls="nudge-continue"]').click();
  await expect(R(page)).toHaveAttribute("data-step", "check");
  await page.locator('[data-qls="log-more"]').click();
  await expect(R(page)).toHaveAttribute("data-step", "who", { timeout: 120_000 });
  await page.locator('[data-qls="agent"][data-id="laq13-jl"]').click();
  const at = await step(page);
  if (at === "how") await page.locator('[data-qls="how-opt"]').first().click();
  const now = await step(page);
  const sub = await text(page, '[data-qls="nudge-sub"]');
  READ.V13_5 = { at, now, sub };
  ok(now === "nudge" && sub.startsWith("Nothing on Joanna's card"), `V13-5: the next agent is asked again, from their own card (${now}, "${sub}")`);
  await page.locator('[data-qls="toast-undo"]').click().catch(() => {});
  await page.waitForTimeout(1500);
  ok(saved("laq13-mr").queries.length === 0, "V13-5: the toast's Undo took back Marcus's query");
});

test("V13 floor — the run measured what it claims", () => {
  expect(checks).toBeGreaterThanOrEqual(50);
});
