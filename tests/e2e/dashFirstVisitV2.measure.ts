/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD FIRST VISIT v2 — the rendered locks (ref design-refs/dashboard-first-visit-v2/), at 1512×982 and 1280×800.
 *
 *   A1 placement · A2 labels · B1 the answer · C1 "It's ready" · D1 the tour · E1 the example · F1 resume · G1 the
 *   nudge-email ask · H1 the finish line. (I1, the event log, is the emulator suite tests/rules/events.rules.test.ts.)
 *
 * The harness account is shared: every lock that changes it puts back what it changed, in the same run, through
 * tests/e2e/seedFv2.mjs. The pre-query manuscript is seedDash60's `db60-pre`. FV2_MUTATE=<lock> is how each lock's named
 * break is applied (reports/dashboard-first-visit-v2/mutations.txt).
 */
import { test, expect, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

type VP = { width: number; height: number };
const SIZES: VP[] = [{ width: 1512, height: 982 }, { width: 1280, height: 800 }];
const PRE = "db60-pre";
const DIR = "reports/dashboard-first-visit-v2";
/* the named break each lock is proved red by (FV2_MUTATE=<lock>), declared before any test reads it */
const MUT = process.env.FV2_MUTATE ?? "";
const seed = (args: string) => execSync(`node tests/e2e/seedFv2.mjs ${args}`, { encoding: "utf8" }).trim();
const dump = (ms = PRE) => JSON.parse(seed(`dump ${ms}`).split("\n").pop()!);

type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(lock: string, where: string, ok: boolean, detail: string) { this.rows.push({ lock, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.lock} · ${r.where} — ${r.detail}`)).toEqual([]);
  }
}

async function openDash(page: Page, vp: VP, ms: string, flags: Record<string, unknown> = {}) {
  await page.addInitScript(([m, f]) => { Object.assign(window, f); try { localStorage.setItem("scriptally_active_manuscript_id", m as string); } catch { /* private mode */ } }, [ms, flags] as const);
  await openRoute(page, "/dashboard", vp);
  await page.locator('[data-d58="page"][data-loading="0"]').first().waitFor({ timeout: 25_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
}
const vis = (page: Page, sel: string) => page.locator(sel).filter({ visible: true }).first();

/* ── F1 · pick up where you left off ─────────────────────────────────────────────────────────────── */
test("F1 · a review left at agent 23 of 31 is kept, resumed at row 24, and goes when discarded or finished", async ({ page }) => {
  test.setTimeout(420_000);
  const L = new Ledger("F1");
  seed("draft-clear");
  seed("imports-clean");
  const vp = SIZES[0];
  try {
    await openDash(page, vp, PRE);
    L.check("F1", "before", (await page.locator('[data-fv2-card="resume"]').count()) === 0, "no resume card before a review is left");
    /* the template path: parsed in the browser, no model and no entitlement */
    await page.goto("/import");
    await page.locator('input[data-picker="template"]').setInputFiles("tests/e2e/fixtures/fv2-tracker-31.xlsx");
    await vis(page, '[data-im="summary"] [data-im="primary"]').click();
    await vis(page, '[data-im="deck"]').waitFor({ timeout: 20_000 });
    const first = await vis(page, '[data-im="deck-pos"]').textContent();
    L.check("F1", "deck", /^1 of 31$/.test((first ?? "").trim()), `the deck opens on ${first}`);
    const order: string[] = [];
    for (let i = 0; i < 23; i += 1) {
      const card = vis(page, '[data-im="deck-card"]');
      order.push((await card.getAttribute("data-card")) ?? "");
      await card.getByRole("button", { name: "Carry on without an agency" }).click();
      await expect(vis(page, '[data-im="deck-pos"]')).toHaveText(`${i + 2} of 31`, { timeout: 10_000 });
    }
    const row24 = await vis(page, '[data-im="deck-card"]').getAttribute("data-card");
    await page.waitForTimeout(2500); /* the draft is saved 800ms after the last change */
    const kept = dump().draft;
    L.check("F1", "kept", kept?.a === "23/31" && kept?.file === "fv2-tracker-31.xlsx" && kept?.step === "agents", JSON.stringify(kept));

    /* leave, and come back after a reload */
    if (MUT === "F1") seed("draft-clear"); /* the named break: keep nothing on leaving */
    await openDash(page, vp, PRE);
    await page.reload();
    await page.locator('[data-d58="page"][data-loading="0"]').first().waitFor({ timeout: 25_000 });
    const card = vis(page, '[data-fv2-card="resume"]');
    await card.waitFor({ timeout: 15_000 });
    const tile = (await vis(page, '[data-fv2="resume-agents"]').textContent()) ?? "";
    const qtile = (await vis(page, '[data-fv2="resume-queries"]').textContent()) ?? "";
    L.check("F1", "card", /23 of 31 checked/.test(tile), `agents tile: ${tile}`);
    L.check("F1", "card", /not started/.test(qtile), `queries tile: ${qtile}`);
    L.check("F1", "card", (await vis(page, '[data-fv2="resume-file"]').textContent())?.trim() === "fv2-tracker-31.xlsx", "the file's name");
    L.check("F1", "card", (await page.locator('[data-fv1="setup"]').filter({ visible: true }).count()) === 0, "it takes the set-up card's place");
    const at = await card.boundingBox();
    const mid = await vis(page, '[data-df1="feed"]').boundingBox();
    L.check("F1", "card", !!at && !!mid && Math.abs(at.y - mid.y) <= 1, `first in the middle column (${at?.y} vs ${mid?.y})`);

    /* carry on: the review reopens at the step and the row it was left on */
    await vis(page, '[data-fv2="resume-carry-on"]').click();
    await vis(page, '[data-im="deck"]').waitFor({ timeout: 20_000 });
    const pos = (await vis(page, '[data-im="deck-pos"]').textContent())?.trim();
    const now = await vis(page, '[data-im="deck-card"]').getAttribute("data-card");
    /* ⚠️ THE DECK COUNTS THE ROWS STILL ASKING SOMETHING (and any answered in this visit), so a resumed review reads
       "1 of 8": the 8 left of 31. The review is not this pack's to change; the row it opens on is the claim. */
    L.check("F1", "resume", pos === "1 of 8", `the deck reopens on ${pos} (the 8 still to check)`);
    L.check("F1", "resume", !!row24 && now === row24, `on the 24th row (${now} vs ${row24})`);
    L.check("F1", "resume", !order.includes(now ?? "-"), "not on a row already answered");

    /* discard (Cancel → Discard): the draft goes */
    await vis(page, '[data-im="cancel"]').click();
    await page.getByRole("button", { name: /^Discard/ }).filter({ visible: true }).first().click();
    await page.waitForTimeout(2000);
    L.check("F1", "discard", dump().draft === null, "discarding deletes the draft");

    /* finishing deletes it: a one-row file, imported into the pre-query book, then taken out again */
    await page.goto("/import");
    await page.locator('input[data-picker="template"]').setInputFiles("tests/e2e/fixtures/fv2-tracker-1.xlsx");
    await vis(page, '[data-im="summary"] [data-im="primary"]').click();
    await vis(page, '[data-im="deck"]').waitFor({ timeout: 20_000 });
    await vis(page, '[data-im="deck-card"]').getByRole("button", { name: "Carry on without an agency" }).click();
    await page.waitForTimeout(2500);
    L.check("F1", "finish", dump().draft?.a === "1/1", `kept before finishing: ${JSON.stringify(dump().draft)}`);
    const go = vis(page, '[data-im="primary"]');
    await go.click();
    if (await page.locator('[data-im="review"][data-step="queries"]').count()) await vis(page, '[data-im="primary"]').click();
    await page.waitForURL(/\/dashboard/, { timeout: 60_000 }).catch(() => {});
    await page.waitForTimeout(2000);
    L.check("F1", "finish", dump().draft === null, "finishing the import deletes the draft");
  } finally {
    seed("draft-clear");
    console.log(seed("imports-clean"));
  }
  L.done(13);
});

/* ── G1 · the nudge-email ask ─────────────────────────────────────────────────────────────────────── */
const Q = "seed-ms-1";
test("G1 · the ask shows after the first query; Yes writes one leaf and it never shows again", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("G1");
  const before = dump(Q);
  seed("g1-prep");
  try {
    const prepped = dump(Q);
    L.check("G1", "setup", prepped.notify?.nudges === undefined && prepped.reminder === null, `an account that never chose: ${JSON.stringify(prepped.notify)}`);
    await openDash(page, SIZES[0], Q);
    const ask = vis(page, '[data-fv2="reminder-ask"]');
    await ask.waitFor({ timeout: 15_000 });
    const t = (await ask.textContent()) ?? "";
    L.check("G1", "ask", /Want an email when a nudge is due\?/.test(t) && /If \S+ hasn't replied in time/.test(t), t.slice(0, 120));
    L.check("G1", "ask", (await ask.locator("xpath=ancestor::*[@data-df1='feedcol']").count()) === 1, "in the feed");
    await vis(page, '[data-fv2="reminder-yes"]').click();
    await vis(page, '[data-fv2="reminder-done"]').waitFor({ timeout: 10_000 });
    if (MUT === "G1") { await page.waitForTimeout(1500); seed("notify-whole"); } /* the named break: write the whole map */
    L.check("G1", "answered", /We'll email you when a nudge is due\./.test((await vis(page, '[data-fv2="reminder-done"]').textContent()) ?? ""), "one line");
    await page.waitForTimeout(2000);
    const after = dump(Q);
    L.check("G1", "write", after.notify?.nudges === true, `nudges ${after.notify?.nudges}`);
    L.check("G1", "write", after.notify?.weeklyDigest === prepped.notify?.weeklyDigest, `weeklyDigest kept (${after.notify?.weeklyDigest})`);
    L.check("G1", "write", after.notify?.discover === prepped.notify?.discover, `discover kept (${after.notify?.discover})`);
    L.check("G1", "write", JSON.stringify(Object.keys(after.notify ?? {}).sort()) === JSON.stringify([...Object.keys(prepped.notify ?? {}), "nudges"].sort()), `no other key: ${JSON.stringify(after.notify)}`);
    await page.reload();
    await page.locator('[data-d58="page"][data-loading="0"]').first().waitFor({ timeout: 25_000 });
    await page.waitForTimeout(1500);
    L.check("G1", "once", (await page.locator('[data-fv2="reminder-ask"], [data-fv2="reminder-done"]').filter({ visible: true }).count()) === 0, "never shown again");
  } finally {
    seed("g1-restore");
    const back = dump(Q);
    const canon = (o: unknown) => JSON.stringify(Object.entries((o ?? {}) as Record<string, unknown>).sort());
    L.check("G1", "restore", canon(back.notify) === canon(before.notify) && back.reminder === before.reminder, `restored ${JSON.stringify(back.notify)}`);
  }
  L.done(9);
});

/* ── H1 · the finish line ─────────────────────────────────────────────────────────────────────────── */
test("H1 · ticking the fifth step shows the finish line; Close this list brings the goal sheet back for good", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("H1");
  seed(`h1-prep ${Q}`);
  try {
    await openDash(page, SIZES[0], Q);
    const count = (await vis(page, '[data-fv2="gs-count"]').textContent())?.trim() ?? "";
    L.check("H1", "before", /^4 of 5 done/.test(count), `the list: ${count}`);
    /* every page of the task card is drawn in one cell (the ghosts carry their "Then:" too); the LAST names Getting started */
    const thens = () => vis(page, '[data-d71="task"]').locator(".df1-then").allTextContents();
    const thenBefore = (await thens()).pop() ?? "";
    L.check("H1", "before", /finish getting started/.test(thenBefore), `Then: ${thenBefore}`);
    /* the fifth step, ticked by its record (three comparable titles) — the page follows its own data */
    seed(`h1-finish ${Q}`);
    const fin = vis(page, '[data-fv2="finish"]');
    await fin.waitFor({ timeout: 20_000 });
    L.check("H1", "finish", (await vis(page, '[data-fv2="finish-title"]').textContent())?.trim() === "That's you set up", "That's you set up");
    L.check("H1", "finish", (await fin.textContent())?.includes("Your weekly goal and streak go here instead.") ?? false, "the note");
    const sheet = await vis(page, '[data-fv2="gs"]').boundingBox();
    const book = await vis(page, '[data-df1="book"]').boundingBox();
    L.check("H1", "finish", !!sheet && !!book && Math.abs(sheet.y - (book.y + book.height)) <= 1, `in the goal slot, on the card's bottom (${sheet?.y} vs ${book ? book.y + book.height : "?"})`);
    const thenFin = (await thens()).join(" | ");
    L.check("H1", "then", !/getting started/i.test(thenFin), `Then: no longer names it (${thenFin || "none"})`);
    await vis(page, '[data-fv2="finish-close"]').click();
    await vis(page, '[data-df1="goal"]').waitFor({ timeout: 10_000 });
    if (MUT === "H1") { await page.waitForTimeout(1500); seed(`h1-unclose ${Q}`); } /* the named break: keep the list */
    L.check("H1", "closed", (await page.locator('[data-fv2="gs"]').filter({ visible: true }).count()) === 0, "the goal sheet has the slot");
    await page.waitForTimeout(1500);
    await page.reload();
    await page.locator('[data-d58="page"][data-loading="0"]').first().waitFor({ timeout: 25_000 });
    await page.waitForTimeout(800);
    L.check("H1", "closed", (await page.locator('[data-df1="goal"]').filter({ visible: true }).count()) === 1 && (await page.locator('[data-fv2="gs"]').filter({ visible: true }).count()) === 0, "still the goal sheet after a reload");
    L.check("H1", "closed", JSON.parse(seed(`h1-dump ${Q}`)).closed === true, "the flag is stored");
  } finally {
    seed(`h1-restore ${Q}`);
    const back = JSON.parse(seed(`h1-dump ${Q}`));
    L.check("H1", "restore", back.comps === 0 && back.closed === null && back.hidden === null, `restored ${JSON.stringify(back)}`);
  }
  L.done(10);
});

const box = (page: Page, sel: string) => vis(page, sel).boundingBox();

/* ── A1 · placement ───────────────────────────────────────────────────────────────────────────────── */
test("A1 · pre-query: the set-up card leads the middle column, Getting started hangs on the book; first query: the queries card", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("A1");
  for (const vp of SIZES) {
    const w = `${vp.width}`;
    await openDash(page, vp, PRE);
    if (MUT === "A1") await page.evaluate(() => { const c = document.querySelector('[data-fv2="start-card"]'); const l = document.querySelector('[data-df1="left"]'); if (c && l) l.prepend(c); });
    const card = await box(page, '[data-fv2="start-card"]');
    const mid = await box(page, '[data-df1="feed"]');
    const firstInMid = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-df1="feed"]')].find((e) => e.offsetHeight > 0)?.firstElementChild?.getAttribute("data-fv2") ?? null);
    L.check("A1", `pre ${w}`, firstInMid === "start-card", `the middle column's first card: ${firstInMid}`);
    L.check("A1", `pre ${w}`, !!card && !!mid && Math.abs(card.y - mid.y) <= 1 && Math.abs(card.x - mid.x) <= 1, `card ${card?.x},${card?.y} · column ${mid?.x},${mid?.y}`);
    const gs = await box(page, '[data-fv2="gs"]');
    const book = await box(page, '[data-df1="book"]');
    L.check("A1", `pre ${w}`, !!gs && !!book && Math.abs(gs.y - (book.y + book.height)) <= 1, `Getting started's top ${gs?.y} · the book's bottom ${book ? book.y + book.height : "?"}`);
    L.check("A1", `pre ${w}`, (await page.locator('[data-df1="queries"]').filter({ visible: true }).count()) === 0, "no queries card");
    L.check("A1", `pre ${w}`, (await page.locator('[data-df1="btn-log"], [data-df1="btn-record"], [data-df1="btn-agent"]').filter({ visible: true }).count()) === 0, "no buttons on the book");
    L.check("A1", `pre ${w}`, (await page.locator('[data-d71="task"]').filter({ visible: true }).count()) === 0, "no task card before a task");
    await openDash(page, vp, Q);
    L.check("A1", `first query ${w}`, (await page.locator('[data-df1="queries"]').filter({ visible: true }).count()) === 1, "the queries card");
    const gs2 = await box(page, '[data-fv2="gs"]');
    const book2 = await box(page, '[data-df1="book"]');
    L.check("A1", `first query ${w}`, !!gs2 && !!book2 && Math.abs(gs2.y - (book2.y + book2.height)) <= 1, `Getting started still in the goal slot (${gs2?.y} vs ${book2 ? book2.y + book2.height : "?"})`);
    if (w === "1512") await page.screenshot({ path: `${DIR}/shots/a1-first-query-1512.png` });
  }
  L.done(16);
});

/* ── A2 · the manuscript card's label ─────────────────────────────────────────────────────────────── */
test("A2 · the label is each of the five strings", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("A2");
  const before = dump(PRE).msStatus;
  const label = async () => {
    if (MUT === "A2") await page.evaluate(() => { const s = [...document.querySelectorAll<HTMLElement>('[data-df1="status"]')].find((e) => e.offsetHeight > 0); if (s) s.textContent = (s.textContent ?? "").toUpperCase(); });
    return (await vis(page, '[data-df1="status"]').textContent())?.trim();
  };
  seed("between-make");
  try {
    for (const [st, want] of [["Ready to Query", "Getting ready"], ["Drafting", "Still writing"], ["Revising", "In revision"]] as const) {
      seed(`status ${PRE} "${st}"`);
      await openDash(page, SIZES[0], PRE);
      const got = await label();
      L.check("A2", st, got === want, `${got}`);
    }
    await openDash(page, SIZES[0], Q);
    L.check("A2", "querying", (await label()) === "Querying", `${await label()}`);
    await openDash(page, SIZES[0], "fv2-between");
    L.check("A2", "between", (await label()) === "Between rounds", `${await label()}`);
  } finally {
    seed(`status ${PRE} "${before}"`);
    seed("between-clean");
  }
  L.done(5);
});

/* ── B1 · the answer ──────────────────────────────────────────────────────────────────────────────── */
test("B1 · the ready sentence; Change it → still writing sets DRAFTING and reorders Getting started", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("B1");
  const was = dump(PRE);
  seed(`stage ${MUT === "B1" ? "none" : "starting"}`);
  seed(`status ${PRE} "Ready to Query"`);
  try {
    /* ⚠️ NO AGENTS (the dashboard's dev aid): with agents on file the ready path is "You have N agents on file", which
       hides the answer line by design (screen 09) — this account has many */
    await openDash(page, SIZES[0], PRE, { __SA_DASH_NO_AGENTS: true });
    const said = (await vis(page, '[data-fv1="answer"]').textContent({ timeout: 10_000 }).catch(() => null)) ?? "";
    L.check("B1", "said", /You said DB60 Pre-query is ready, and you haven't sent any queries yet\./.test(said) && /Not right\? Change it/.test(said), said);
    await vis(page, '[data-fv1="change"]').click({ timeout: 10_000 }).catch(() => {});
    await vis(page, '[data-fv1="choice-writing"]').click({ timeout: 10_000 });
    await page.waitForTimeout(2500);
    L.check("B1", "write", dump(PRE).msStatus === "Drafting", `Manuscript.status re-read: ${dump(PRE).msStatus}`);
    L.check("B1", "path", (await vis(page, '[data-fv1="path-head"]').textContent())?.trim() === "Get ahead while you write", "the path heading");
    const keys = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-fv2="gs"] [data-fv1="gs-row"]')].filter((e) => e.offsetHeight > 0).map((e) => e.dataset.key));
    L.check("B1", "order", JSON.stringify(keys) === JSON.stringify(["manuscript", "comps", "agent", "letter", "ready"]), JSON.stringify(keys));
    L.check("B1", "label", (await vis(page, '[data-df1="status"]').textContent())?.trim() === "Still writing", "the label follows");
    await page.screenshot({ path: `${DIR}/shots/b1-change-1512.png` });
  } finally {
    seed(`stage ${was.stage ?? "none"}`);
    seed(`status ${PRE} "${was.msStatus}"`);
  }
  L.done(5);
});

/* ── C1 · It's ready ──────────────────────────────────────────────────────────────────────────────── */
test("C1 · on the still-writing path, It's ready → READY_TO_QUERY and the ready path, done steps still ticked", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("C1");
  const was = dump(PRE);
  /* every row above "Tell us when it's ready" done, so it is the current row with its link: the book's materials and
     a letter (seedDash60 --full), three comps (h1-finish), and the account's own agents */
  execSync("node tests/e2e/seedDash60.mjs --full", { stdio: "ignore" });
  seed(`h1-finish ${PRE}`);
  seed("stage starting");
  seed(`status ${PRE} "Drafting"`);
  try {
    await openDash(page, SIZES[0], PRE);
    const rows = async () => page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-fv2="gs"] [data-fv1="gs-row"]')].filter((e) => e.offsetHeight > 0).map((e) => `${e.dataset.key}:${e.dataset.state}`));
    const before = await rows();
    L.check("C1", "before", JSON.stringify(before) === JSON.stringify(["manuscript:done", "comps:done", "agent:done", "letter:done", "ready:current"]), JSON.stringify(before));
    await vis(page, '[data-fv2="gs"] [data-fv1="gs-link"][data-go="ready"]').click();
    await page.waitForTimeout(2500);
    if (MUT === "C1") seed(`status ${PRE} "Drafting"`);
    await page.waitForTimeout(1500);
    L.check("C1", "write", dump(PRE).msStatus === "Ready to Query" && dump(PRE).stage === "starting", `status ${dump(PRE).msStatus}, stage ${dump(PRE).stage}`);
    L.check("C1", "path", (await page.locator('[data-fv1="path-ready"]').filter({ visible: true }).count()) === 1, "the ready-not-querying path");
    const after = await rows();
    L.check("C1", "ticks", ["manuscript:done", "agent:done", "comps:done"].every((r) => after.includes(r)), `the ready path's rows: ${JSON.stringify(after)}`);
    L.check("C1", "label", (await vis(page, '[data-df1="status"]').textContent())?.trim() === "Getting ready", "the label follows");
  } finally {
    execSync("node tests/e2e/seedDash60.mjs", { stdio: "ignore" });
    seed(`stage ${was.stage ?? "none"}`);
    seed(`status ${PRE} "${was.msStatus}"`);
  }
  L.done(5);
});

/* ── D1 · the tour ────────────────────────────────────────────────────────────────────────────────── */
test("D1 · the first load runs the tour once; the ? menu replays it; a first load with queries never shows it", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("D1");
  const was = dump().tour;
  seed("tour-reset");
  try {
    await openDash(page, SIZES[0], PRE);
    await vis(page, '[data-fv2="tour"][data-stop="1"] [data-pck="card"]:not([style*="hidden"])').waitFor({ timeout: 15_000 });
    const hole = JSON.parse((await vis(page, '[data-fv2="tour"] [data-pck="dim"]').getAttribute("data-hole")) ?? "null");
    const card = await box(page, '[data-fv2="start-card"]');
    L.check("D1", "stop 1", !!hole && !!card && hole.left <= card.x && hole.top <= card.y && hole.left + hole.width >= card.x + card.width - 1, `the hole ${JSON.stringify(hole)} round the set-up card`);
    L.check("D1", "stop 1", (await page.evaluate(() => document.activeElement?.getAttribute("data-fv2"))) === "tour-next", "focus on Next");
    await vis(page, '[data-fv2="tour-next"]').click();
    await vis(page, '[data-fv2="tour"][data-stop="2"] [data-pck="card"]').waitFor({ timeout: 10_000 });
    await vis(page, '[data-fv2="tour-next"]').click();
    await vis(page, '[data-fv2="tour"][data-stop="3"] [data-pck="card"]').waitFor({ timeout: 10_000 });
    L.check("D1", "stop 3", (await vis(page, '[data-fv2="tour-next"]').textContent())?.trim() === "Got it", "Got it on the last");
    await vis(page, '[data-fv2="tour-next"]').click();
    L.check("D1", "end", (await page.locator('[data-fv2="tour"]').count()) === 0, "Got it ends it");
    const evs = await page.evaluate(() => ((window as unknown as { __saEvents?: { name: string; props: Record<string, unknown> }[] }).__saEvents ?? []).map((e) => `${e.name}${e.props.stop ? `:${e.props.stop}` : ""}`));
    L.check("D1", "events", evs.includes("dashboard_first_seen") && evs.includes("tour_finished:3"), JSON.stringify(evs));
    await page.waitForTimeout(1500);
    if (MUT === "D1") seed("tour-reset");
    await page.reload();
    await page.locator('[data-d58="page"][data-loading="0"]').first().waitFor({ timeout: 25_000 });
    await page.waitForTimeout(2600);
    L.check("D1", "once", (await page.locator('[data-fv2="tour"]').count()) === 0, "a reload shows no tour");
    await page.getByRole("button", { name: "Help" }).filter({ visible: true }).first().click();
    await vis(page, '[data-hm="tour"]').click();
    await vis(page, '[data-fv2="tour"][data-stop="1"] [data-pck="card"]').waitFor({ timeout: 10_000 });
    L.check("D1", "replay", true, "Show me round again shows it");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    L.check("D1", "replay", (await page.locator('[data-fv2="tour"]').count()) === 0, "Escape skips");
    /* an account whose first load already has queries: never */
    seed("tour-reset");
    await openDash(page, SIZES[0], Q);
    await page.waitForTimeout(2600);
    L.check("D1", "with queries", (await page.locator('[data-fv2="tour"]').count()) === 0, "no tour");
    await page.waitForTimeout(1200);
    L.check("D1", "with queries", dump().tour === "done", "and it is recorded as never to run");
  } finally {
    if (was === null) seed("tour-reset"); else seed("tour-done");
  }
  L.done(10);
});

/* ── E1 · the example ─────────────────────────────────────────────────────────────────────────────── */
test("E1 · the example opens with its bar, writes nothing, and goes back by the button or Escape", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("E1");
  await openDash(page, SIZES[0], PRE);
  await page.waitForTimeout(2500); /* the page's own load-time writes are over */
  const writes: string[] = [];
  /* ⚠️ A WRITE IS A REQUEST CARRYING A WRITE: the Write stream's channel also polls and acknowledges, so its URL alone
     says nothing. A document write's body names the document (`"update"`/`"delete"` with a `name`). */
  page.on("request", (r) => {
    if (!/firestore\.googleapis\.com/.test(r.url())) return;
    const body = r.postData() ?? "";
    if (/Write/.test(r.url()) && /update|delete/.test(decodeURIComponent(body))) writes.push(decodeURIComponent(body).slice(0, 300));
  });
  await vis(page, '[data-fv2="example-link"]').click();
  await vis(page, '[data-fv2="example-bar"]').waitFor({ timeout: 10_000 });
  L.check("E1", "open", /This is an example dashboard with made-up queries, so you can see where things go\./.test((await vis(page, '[data-fv2="example-bar"]').textContent()) ?? ""), "the bar");
  L.check("E1", "open", (await page.locator('[data-fv2="example"] [data-fv2="querying"]').count()) === 1, "the querying page over sample data");
  await page.waitForTimeout(4000);
  if (MUT === "E1") await page.evaluate(() => (document.querySelector('[data-fv2="example-body"]') as HTMLElement | null)?.removeAttribute("inert"));
  await page.locator('[data-fv2="example-body"] [data-df1="scout-ask"]').first().click({ force: true, timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(2500);
  /* ⚠️ THE EVENT LOG IS NOT THE WRITER'S DATA: opening the example records `example_opened` (Part I) — that one write
     is counted apart, and nothing else may be written */
  const isEvent = (w: string) => /\/documents\/events\//.test(w);
  L.check("E1", "writes", writes.filter((w) => !isEvent(w)).length === 0, `writes to the writer's data while open: ${writes.filter((w) => !isEvent(w)).length} ${JSON.stringify(writes.filter((w) => !isEvent(w))).slice(0, 300)}`);
  L.check("E1", "writes", writes.filter(isEvent).length <= 1, `events: ${writes.filter(isEvent).length} (example_opened)`);
  await vis(page, '[data-fv2="example-back"]').click();
  L.check("E1", "back", (await page.locator('[data-fv2="example"]').count()) === 0 && (await page.locator('[data-fv2="start-card"]').filter({ visible: true }).count()) === 1, "Back to yours");
  await vis(page, '[data-fv2="example-link"]').click();
  await vis(page, '[data-fv2="example-bar"]').waitFor({ timeout: 10_000 });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  L.check("E1", "back", (await page.locator('[data-fv2="example"]').count()) === 0, "Escape");
  L.done(6);
});
