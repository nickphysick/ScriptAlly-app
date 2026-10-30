/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PHONE FIXES v1, PHASE G — THE WHOLE PHONE APP, AS JOURNEYS (J1–J7), on both phone projects with touch.
 *
 *   SA_E2E_BASE_URL=http://127.0.0.1:<port> | https://scriptally-dev.web.app
 *   PFJ_ONLY=J1,J3     run only these journeys
 *
 * ⚠️ EVERY JOURNEY RUNS ON ITS OWN FRESH ACCOUNT, signed up through the app's own sign-up page and removed whole in
 *    `afterEach` (`freshAccount.ts`). The shared e2e account is never signed into here. A leftover from a killed run is
 *    removed by the `pfj-` sweep (tests/e2e/pfjSweep.cjs), which needs no password.
 *
 * ⚠️ EVERY STEP IS CHECKED, AND A STEP'S FINDINGS ARE KEPT, NOT THROWN: a journey runs to its end and fails at the end
 *    listing every step that broke a law, so one bad screen does not hide the next ten.
 *      console   no console error (WebKit's harness-only googleapis fetch failures are counted apart, see below)
 *      network   no failed request and no 4xx/5xx, apart from the expected ones
 *      small     no text under 12px, apart from the exempt tags (the beta pill, screen-reader-only text)
 *      colour    text on navy is white, text on blush is ink (pa2Lib `colourSweep`)
 *      green     no green fill or text anywhere
 *      tap       every visible tap target is at least 44 × 44
 *    A screenshot at every step: reports/phone-fixes-v1/journeys/<journey>/<project>/NN-<step>.png
 */
import { test, expect, type Page, type ConsoleMessage, type Request } from "@playwright/test";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { colourSweep } from "./pa2Lib";
import { PAGES } from "./phonePages";
import { touchDrag, touchSwipeX, engine } from "./touch";
import { makeCreds, removeAccount, seedCampaign, CAMPAIGN, type Creds } from "./freshAccount";

const ONLY = (process.env.PFJ_ONLY ?? "").split(",").filter(Boolean);
const READINGS = process.env.PFJ_READINGS ?? "";
const want = (j: string) => !ONLY.length || ONLY.includes(j);
const proj = () => test.info().project.name;
const where = () => (/scriptally-dev\.web\.app/.test(process.env.SA_E2E_BASE_URL ?? "") ? "dev" : "local");

test.use({ storageState: { cookies: [], origins: [] }, actionTimeout: 20_000 });

/* ───────────────────────────── the per-step check ───────────────────────────── */

type Finding = { step: string; law: string; what: string };
class Journey {
  n = 0; findings: Finding[] = []; steps: string[] = [];
  lastWaitlist = false;
  private errs: string[] = []; private harness: string[] = []; private bad: string[] = [];
  constructor(public page: Page, public name: string) {
    page.on("console", (m: ConsoleMessage) => { if (m.type() === "error") this.sortError(m.text()); });
    page.on("pageerror", (e) => this.sortError(String(e)));
    page.on("requestfailed", (r: Request) => { if (!this.expectedFail(r.url(), r.failure()?.errorText ?? "")) this.bad.push(`failed ${r.failure()?.errorText} ${r.url().slice(0, 120)}`); });
    page.on("request", (r) => { this.lastWaitlist = /\/api\/waitlist/.test(r.url()); });
    page.on("response", (r) => { if (r.status() >= 400 && !this.expectedFail(r.url(), String(r.status()))) this.bad.push(`${r.status()} ${r.url().slice(0, 120)}`); });
  }
  /* WebKit in this harness cannot hold Firestore's streaming channels ("Fetch API cannot load …googleapis…"); the
     app retries and recovers. That is the harness's network, so it is counted apart rather than failing the step. */
  private sortError(t: string) {
    if (engine(this.page) === "webkit" && /Fetch API cannot load .*googleapis|access control checks/.test(t)) this.harness.push(t.slice(0, 120));
    else if (where() === "local" && /status of 404/.test(t) && this.lastWaitlist) this.harness.push("local preview has no /api/waitlist");
    else this.errs.push(t.slice(0, 200));
  }
  /* Expected failures: Firestore's long-poll channels are closed by the client on every navigation (aborted), and
     analytics/fonts the harness cannot reach. Nothing the app itself asked for and needed. */
  private expectedFail(url: string, why: string) {
    return /firestore\.googleapis\.com\/.*\/(Listen|Write)\/channel/.test(url) && /abort|cancel|ERR_ABORTED|NS_BINDING_ABORTED|Load request cancelled/i.test(why)
      || /google-analytics|googletagmanager|favicon/.test(url)
      || where() === "local" && /\/api\/waitlist/.test(url)
      || engine(this.page) === "webkit" && /googleapis\.com/.test(url);
  }
  async step(label: string) {
    const page = this.page;
    this.n++; const tag = `${String(this.n).padStart(2, "0")}-${label.replace(/[^a-z0-9]+/gi, "-").toLowerCase().replace(/^-|-$/g, "")}`;
    this.steps.push(tag);
    await page.waitForTimeout(350);
    const dir = `reports/phone-fixes-v1/journeys/${this.name}/${proj()}${where() === "dev" ? "-dev" : ""}`;
    mkdirSync(dir, { recursive: true });
    writeFileSync(`${dir}/${tag}.png`, await page.screenshot());
    const add = (law: string, what: string[]) => { for (const w of what) this.findings.push({ step: tag, law, what: w }); };
    add("console", this.errs.splice(0)); add("network", this.bad.splice(0));
    const r = await page.evaluate(() => {
      const vis = (e: Element) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && Number(cs.opacity) > 0.05 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; };
      const name = (e: Element) => `${e.tagName.toLowerCase()}${e.id ? "#" + e.id : ""}.${String(e.getAttribute("class") ?? "").split(" ")[0]}`;
      const small: string[] = [];
      const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let t = tw.nextNode(); t; t = tw.nextNode()) {
        const el = t.parentElement; if (!el || !t.textContent?.trim() || !vis(el)) continue;
        if (el.closest(".ws-beta, .sa-betapill, .sr-only, [aria-hidden='true'] .sr-only, script, style, svg")) continue;
        const fs = parseFloat(getComputedStyle(el).fontSize); if (fs < 12) small.push(`${name(el)} ${fs}px "${t.textContent.trim().slice(0, 24)}"`);
      }
      const taps: string[] = [];
      for (const el of document.querySelectorAll<HTMLElement>("button, a[href], [role=button], input:not([type=hidden]), select, textarea, [role=tab], [role=option]")) {
        if (!vis(el) || el.closest("[inert], [aria-hidden='true']")) continue;
        const r = el.getBoundingClientRect();
        /* a link inside a sentence is a word, not a target; its line is the target (WCAG 2.5.8's inline exception) */
        if (el.tagName === "A" && getComputedStyle(el).display === "inline") continue;
        if ((el as HTMLInputElement).type === "checkbox" || (el as HTMLInputElement).type === "radio") continue;
        if (r.width < 44 - 0.5 || r.height < 44 - 0.5) taps.push(`${name(el)} ${Math.round(r.width)}×${Math.round(r.height)} "${(el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 22)}"`);
      }
      const hscroll = document.documentElement.scrollWidth > innerWidth + 1;
      return { small: [...new Set(small)].slice(0, 12), taps: [...new Set(taps)].slice(0, 16), hscroll };
    });
    add("small", r.small); add("tap", r.taps); if (r.hscroll) add("hscroll", ["the page scrolls sideways"]);
    const col = await colourSweep(page, { allowBurgundy: true, roots: "body" });
    add("green", col.bad.filter((b) => /^green/.test(b)));
    add("colour", col.bad.filter((b) => /navy|blush/.test(b)));
  }
  record() {
    const row = { journey: this.name, project: proj(), where: where(), steps: this.steps.length, harnessFetchErrors: this.harness.length, findings: this.findings };
    if (READINGS) appendFileSync(READINGS, JSON.stringify(row) + "\n");
    return row;
  }
}

/* ───────────────────────────── shared moves ───────────────────────────── */

let creds: Creds | null = null;
const facts: Record<string, unknown> = {};
test.afterEach(async () => {
  test.setTimeout(180_000);
  if (creds) { const r = await removeAccount(creds); if (READINGS) appendFileSync(READINGS, JSON.stringify({ removed: r, project: proj(), where: where() }) + "\n"); creds = null; }
});

async function signUp(page: Page, j: Journey, c: Creds, fromHash = "#/signup") {
  if (!/\/#\/signup/.test(page.url())) { await page.goto(`/${fromHash}`); }
  await page.locator("#au-email").waitFor({ timeout: 30_000 });
  await j.step("sign-up");
  await page.locator("#au-name").fill(c.name); await page.locator("#au-email").fill(c.email); await page.locator("#au-pw").fill(c.password);
  await page.getByRole("button", { name: "Create your account" }).tap();
  await page.locator('[data-sf="pband-step"]').waitFor({ timeout: 45_000 });
}

/** the VISIBLE button by name — after Back the previous step's buttons stay mounted, hidden, and a plain role query
    picks the hidden one first (it waited 20s on a "Continue" that was not the one on screen) */
const vis = (page: Page, name: RegExp) => page.locator("button:visible").filter({ hasText: name }).last();

/** Set-up as a writer just getting started: each step through the band, Back once, then Continue. */
async function setUpFresh(page: Page, j: Journey) {
  const stepText = () => page.locator('[data-sf="pband-step"]').textContent();
  await j.step("setup-1-welcome");
  await page.locator(".sf-opt:visible").first().tap();
  await vis(page, /^Continue/).tap(); await page.waitForTimeout(900);
  await j.step("setup-2-book");
  const s2 = await stepText();
  await vis(page, /Back/).tap(); await page.waitForTimeout(700);
  const back = await stepText();
  expect.soft(back, "Back returns to the first step").toMatch(/^Step 1 of/);
  await j.step("setup-1-after-back");
  /* is the first answer still chosen after Back? recorded — the journey re-chooses it if not */
  const kept = await vis(page, /^Continue/).isEnabled();
  facts.backKeepsAnswer = kept;
  if (!kept) await page.locator(".sf-opt:visible").first().tap();
  await vis(page, /^Continue/).tap(); await page.waitForTimeout(900);
  expect.soft(await stepText(), "Continue returns to the same step").toBe(s2);
  const title = page.locator(".sf input[type=text]:visible").first();
  await title.tap(); await title.pressSequentially("The Lantern Keeper", { delay: 15 });
  await page.locator(".sf-opt:visible").first().tap();
  await j.step("setup-2-filled");
  await vis(page, /^Continue/).tap(); await page.waitForTimeout(900);
  await j.step("setup-2-more");
  /* the genre and age chips are toggles by their own role, not buttons — tapped by their exact words */
  await page.getByText("Literary fiction", { exact: true }).locator("visible=true").first().tap();
  await page.waitForTimeout(300);
  await page.getByText("Adult", { exact: true }).locator("visible=true").first().tap();
  const words = page.locator("#o9-words:visible").first(); await words.tap(); await words.pressSequentially("85000", { delay: 15 });
  await vis(page, /^(Continue|Finish|Done)/).tap();
  await page.getByText(/Setting up your dashboard/i).first().waitFor({ timeout: 20_000 }).then(() => j.step("setting-up"), () => j.step("setting-up-not-seen"));
  await page.locator('[data-pa="band"]').first().waitFor({ timeout: 45_000 });
  await page.waitForTimeout(1500);
}

/** Log a query from the open flow with a NEW agent, using the reply wheel. Ends on the check screen's Log press. */
async function logWithNewAgent(page: Page, j: Journey, agentName: string) {
  await page.locator(".pa-flow").waitFor({ timeout: 15_000 });
  await j.step("log-open");
  await page.getByText("Someone not on my list").first().tap(); await page.waitForTimeout(600);
  await j.step("log-new-agent");
  /* G3's regression check: the panel's footer note is one line or two, never a word per line */
  facts.newAgentNoteLines = await page.locator('.spanel.apn--over [data-ae="sum"]').evaluate((e) => Math.round(e.getBoundingClientRect().height / parseFloat(getComputedStyle(e).lineHeight))).catch(() => null);
  /* the new-agent panel, over the flow (G1): name and agency, then "Add to your list" hands the new agent back */
  const panel = page.locator(".spanel.apn--over");
  await panel.waitFor({ timeout: 10_000 });
  const fields = panel.locator("input[type=text]:visible, input:not([type]):visible");
  await fields.nth(0).fill(agentName);
  await fields.nth(1).fill("Penhallow Literary").catch(() => {});
  await j.step("log-new-agent-filled");
  await panel.locator("button:visible", { hasText: /^Add to your list/ }).tap();
  await panel.waitFor({ state: "detached", timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(1200);
  await j.step("log-agent-picked");
  for (let i = 0; i < 14; i++) {
    await page.waitForTimeout(450);
    const step = await page.evaluate(() => document.querySelector("[data-pf-step]")?.getAttribute("data-pf-step") ?? "check");
    if (step === "Response expectations") {
      await j.step("log-reply-wheel");
      await page.locator('[data-rw="col-weeks"]').evaluate((e) => { e.scrollTop = 6 * 40; });
      await page.waitForTimeout(500);
    }
    const pri = page.locator('[data-pf="primary"]');
    if (!(await pri.count())) break;
    const label = ((await pri.textContent()) ?? "").trim();
    if (!(await pri.isEnabled())) {
      const opt = page.locator("[data-pf-step] button:visible").first();
      if (await opt.count()) { await opt.tap(); continue; }
      break;
    }
    if (/^Log/.test(label)) { await j.step("log-check"); await pri.tap(); return; }
    await pri.tap();
  }
}

/* ───────────────────────────── J1 new writer ───────────────────────────── */

test("J1 new writer: landing → founding writer → sign up → set-up → first query → 1 active", async ({ page }) => {
  test.skip(!want("J1"));
  test.setTimeout(600_000);
  const j = new Journey(page, "J1"); creds = makeCreds("j1", proj());
  await page.goto("/"); await page.waitForTimeout(2000);
  await j.step("landing");
  await page.getByRole("button", { name: "Menu" }).tap(); await page.waitForTimeout(600);
  await j.step("landing-menu");
  await page.getByRole("button", { name: "Become a founding writer" }).tap(); await page.waitForTimeout(1800);
  await j.step("founders");
  /* The founders page's call to action is the waitlist form ("Claim your place"); nothing there leads to sign-up, so
     the journey continues at sign-up directly. Recorded for Nick (question b1). */
  const foundersToSignUp = await page.locator('a[href*="signup"], button:has-text("Sign up"), button:has-text("Create")').count();
  await page.goto("/#/signup");
  await signUp(page, j, creds);
  await setUpFresh(page, j);
  await j.step("home-empty");
  const empty = await page.getByText("Let’s start tracking your campaign").count();
  await page.getByRole("button", { name: /Log your first query/ }).first().tap();
  await logWithNewAgent(page, j, "Margot Ellery");
  await page.waitForTimeout(2500);
  const celebrated = await dismissCelebration(page, j, "log");
  await page.goto("/dashboard"); await page.locator('[data-pa="band"]').first().waitFor({ timeout: 30_000 }); await page.waitForTimeout(2500);
  await j.step("home-one-active");
  const active = await page.evaluate(() => (document.querySelector('[aria-label$="active queries, open Queries"], [aria-label$="active query, open Queries"]')?.getAttribute("aria-label") ?? "").match(/^(\d+)/)?.[1] ?? null);
  const row = j.record();
  appendFileSync(READINGS || "/dev/null", JSON.stringify({ journey: "J1", project: proj(), facts: { foundersToSignUp, empty, celebrated, active, ...facts } }) + "\n");
  expect.soft(empty, "the empty Home says Let’s start tracking your campaign").toBeGreaterThan(0);
  expect.soft(active, "Home shows 1 active").toBe("1");
  expect.soft(facts.newAgentNoteLines as number, "G3: the new-agent note is not squeezed a word per line").toBeLessThanOrEqual(2);
  expect(row.findings, JSON.stringify(row.findings.slice(0, 20), null, 1)).toEqual([]);
});

/* ───────────────────────────── shared: a fresh account straight to Home, and driving a flow ───────────────────────────── */

async function freshHome(page: Page, j: Journey, c: Creds, opts: { seed?: boolean } = {}) {
  await page.goto("/#/signup");
  await signUp(page, j, c);
  await vis(page, /^Skip for now/).tap().catch(() => page.locator('[data-sf="exit"]').first().tap());
  await page.locator('[data-pa="band"]').first().waitFor({ timeout: 45_000 });
  if (opts.seed) {
    await seedCampaign(c);
    await page.addInitScript((ms) => { try { localStorage.setItem("scriptally_active_manuscript_id", ms); } catch { /* */ } }, CAMPAIGN.ms);
    await page.goto("/dashboard"); await page.locator('[data-pa="band"]').first().waitFor({ timeout: 45_000 });
  }
  await page.waitForTimeout(1500);
}

/** in-app navigation, as the menu and tabs do it (a reload would reset the stage) */
async function go(page: Page, path: string) {
  await page.evaluate((p) => { history.pushState({}, "", p); dispatchEvent(new PopStateEvent("popstate")); }, path);
  await page.waitForTimeout(1200);
}

/** Press a phone flow's primary until the flow closes, choosing the first option on any step that needs one. */
async function driveFlow(page: Page, j: Journey, name: string, onStep?: (step: string) => Promise<void>) {
  await page.locator(".pa-flow").first().waitFor({ timeout: 15_000 });
  await j.step(`${name}-open`);
  for (let i = 0; i < 16; i++) {
    await page.waitForTimeout(450);
    if (!(await page.locator(".pa-flow").count())) break;
    const step = await page.evaluate(() => document.querySelector("[data-pf-step]")?.getAttribute("data-pf-step") ?? "check");
    if (onStep) await onStep(step);
    const pri = page.locator('[data-pf="primary"]');
    if (!(await pri.count())) break;
    if (!(await pri.isEnabled())) {
      const opt = page.locator("[data-pf-step] button:visible, [data-pf-step] [role=radio]:visible").first();
      if (await opt.count()) { await opt.tap(); continue; }
      break;
    }
    const label = ((await pri.textContent()) ?? "").trim();
    /* a busy primary ("Saving", "Logging") is the write in flight: wait it out, never press it again */
    if (/busy/.test((await pri.getAttribute("class")) ?? "") || /^(Saving|Logging|Recording|Closing|Sending)/.test(label)) { await page.waitForTimeout(800); continue; }
    const final = step === "check" || /^(Log|Save|Record|Close|Mark|Send|Done|Confirm)/.test(label);
    if (final) await j.step(`${name}-${step === "check" ? "check" : "last"}`);
    await pri.tap();
    if (final) { await page.locator(".pa-flow").first().waitFor({ state: "detached", timeout: 20_000 }).catch(() => {}); }
  }
  await page.waitForTimeout(1500);
  await dismissCelebration(page, j, name);
  return !(await page.locator(".pa-flow").count());
}

/** A request, an offer or a first query ends on a full-screen celebration; its "Done" is how a writer leaves it. */
async function dismissCelebration(page: Page, j: Journey, name: string) {
  const done = page.locator('[data-pa="cele-done"]:visible').first();
  await done.waitFor({ timeout: 4000 }).catch(() => {});
  if (await done.count()) { await j.step(`${name}-celebration`); await done.tap(); await page.waitForTimeout(900); return true; }
  return false;
}

const rowOf = (page: Page, qid: string) => page.locator(`[data-qm1="row"][data-id="${qid}"] .pa-row`).first();
async function swipeRow(page: Page, qid: string, dx: number) {
  const row = rowOf(page, qid);
  /* centre it first: at the bottom edge a row sits behind the floating tab bar, and the swipe lands on the bar
     (scrolling by touch is J4's subject; here only the swipe is) */
  await row.evaluate((e) => e.scrollIntoView({ block: "center" })); await page.waitForTimeout(400);
  const b = (await row.boundingBox())!;
  await touchSwipeX(page, b.x + b.width / 2, b.y + b.height / 2, dx);
}
const statusOf = (page: Page, qid: string) => page.locator(`[data-qm1="row"][data-id="${qid}"]`).first().getAttribute("data-status");

/* ───────────────────────────── J3 a day's querying ───────────────────────────── */

test("J3 a day's querying: nudge, a response, send the full, close and undo, Birds-eye, search", async ({ page }) => {
  test.skip(!want("J3"));
  test.setTimeout(720_000);
  const j = new Journey(page, "J3"); creds = makeCreds("j3", proj());
  await freshHome(page, j, creds, { seed: true });
  await j.step("home-seeded");
  await go(page, "/queries"); await page.locator('[data-qm1="row"]').first().waitFor({ timeout: 30_000 });
  await j.step("queries");
  const f: Record<string, unknown> = {};

  /* nudge: a right swipe on an agent's-turn query past its window, then the nudge journey to its end */
  await swipeRow(page, "pfj-q1", 120);
  f.nudgeRevealed = await page.locator('[data-qm1="row"][data-id="pfj-q1"]').getAttribute("data-swipe");
  await j.step("swipe-nudge");
  await page.locator('[data-qm1="row"][data-id="pfj-q1"] .pa-acts .l').tap();
  f.nudgeDone = await driveFlow(page, j, "nudge");
  f.q1 = await statusOf(page, "pfj-q1");

  /* a response, from the query sheet: Full requested */
  await rowOf(page, "pfj-q2").tap();
  await page.locator('.pa-qsheet, [data-qc149c="sheet-body"]').first().waitFor({ timeout: 15_000 });
  await j.step("query-sheet");
  await page.locator(".pa-qsheet button:visible", { hasText: /^Record a response$/ }).first().tap();
  f.respDone = await driveFlow(page, j, "response", async (step) => {
    const full = page.locator("[data-pf-step] button:visible", { hasText: /full/i }).first();
    if (/what|reply|response|happen/i.test(step) && await full.count()) await full.tap();
  });
  await go(page, "/queries"); await page.waitForTimeout(1500);
  f.q2 = await statusOf(page, "pfj-q2");

  /* send the full, from To-do */
  await go(page, "/todo"); await page.waitForTimeout(2000);
  await j.step("todo");
  /* Lena's own card (q3's full request) — after the response, Owen has a full request too, and the first Send is his */
  const send = page.locator('[data-pa="task-row"]', { hasText: "Lena Ostrow" }).locator('[data-pa="verb"][data-verb="Send"]').first();
  f.todoSend = await send.count();
  if (f.todoSend) { await send.tap(); f.sendDone = await driveFlow(page, j, "send-full"); }
  await go(page, "/queries"); await page.waitForTimeout(1500);
  f.q3 = await statusOf(page, "pfj-q3");

  /* close from a left swipe, then Undo from the snackbar */
  const before = await statusOf(page, "pfj-q4");
  await swipeRow(page, "pfj-q4", -120);
  await j.step("swipe-close");
  await page.locator('[data-qm1="row"][data-id="pfj-q4"] .pa-acts .r').tap();
  let reason = false;
  f.closeDone = await driveFlow(page, j, "close", async () => {
    const nr = page.getByText("No reply", { exact: true }).locator("visible=true").first();
    if (!reason && await nr.count()) { await nr.tap(); reason = true; await page.waitForTimeout(300); }
  });
  await j.step("snackbar");
  f.closed = await statusOf(page, "pfj-q4");
  f.undo = await page.locator("[data-qad-undo]:visible, button:visible:has-text('Undo')").first().tap().then(() => true, () => false);
  await page.waitForTimeout(2500);
  f.afterUndo = await statusOf(page, "pfj-q4");
  await j.step("after-undo");

  /* Birds-eye reflects each change */
  await page.locator('[data-pa="birds-btn"]').tap(); await page.locator('[data-pa="birds"]').waitFor({ timeout: 10_000 });
  await j.step("birds-eye");
  f.birds = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-pa="birds-row"]')].map((r) => `${r.dataset.id}:${r.dataset.where}`));
  await page.keyboard.press("Escape").catch(() => {}); await page.locator('[data-pa="birds"]').waitFor({ state: "detached", timeout: 5000 }).catch(() => page.goBack());

  /* search finds each agent touched */
  const found: Record<string, number> = {};
  for (const a of CAMPAIGN.agents) {
    await page.locator('[data-pa="search-btn"]').first().tap();
    await page.locator('[data-pa="search-input"]').fill(a.name.split(" ")[1]);
    await page.waitForTimeout(500);
    found[a.name] = await page.locator('[data-pa="search-query"], [data-pa="search-agent"]').count();
    if (a === CAMPAIGN.agents[0]) await j.step("search");
    await page.locator('[data-pa="search-cancel"]').tap();
  }
  f.found = found;
  appendFileSync(READINGS || "/dev/null", JSON.stringify({ journey: "J3", project: proj(), where: where(), facts: f }) + "\n");
  const row = j.record();
  expect.soft(f.q2, "the response moved q2 to Full Requested").toBe("Full Requested");
  expect.soft(f.q3, "sending the full moved q3 to Full Sent").toBe("Full Sent");
  expect.soft(f.closed, "the close took").not.toBe(before);
  expect.soft(f.afterUndo, "Undo put q4 back").toBe(before);
  expect.soft(Object.values(found).every((n) => n > 0), `search finds each agent ${JSON.stringify(found)}`).toBe(true);
  expect(row.findings, JSON.stringify(row.findings.slice(0, 20), null, 1)).toEqual([]);
});

/* ───────────────────────────── J4 every page ───────────────────────────── */

const DECISION_2 = PAGES;

test("J4 every page: reaches its end by touch, opens an item and comes back, the bar tucks, no sideways scroll", async ({ page }) => {
  test.skip(!want("J4"));
  test.setTimeout(900_000);
  const j = new Journey(page, "J4"); creds = makeCreds("j4", proj());
  await freshHome(page, j, creds, { seed: true });
  const vp = page.viewportSize()!;
  const pages: Record<string, unknown>[] = [];
  for (const path of DECISION_2) {
    await go(page, path); await page.waitForTimeout(800);
    const st = () => page.evaluate(() => { const s = document.getElementById("app-stage-scroll"); return s ? { top: s.scrollTop, max: s.scrollHeight - s.clientHeight } : { top: scrollY, max: document.documentElement.scrollHeight - innerHeight }; });
    const s0 = await st();
    let away = false;
    for (let i = 0; i < 30; i++) {
      const a = await st(); if (a.max - a.top < 2) break;
      await touchDrag(page, Math.round(vp.width / 2), Math.round(vp.height * 0.7), -Math.round(vp.height * 0.4));
      away = away || await page.locator(".pa-tabbar.away").count() > 0;
    }
    const s1 = await st();
    /* a page that did not move: what is under the finger, and what each ancestor says about touch and overflow */
    const diag = s1.max - s1.top < 2 ? null : await page.evaluate(([x, y]) => {
      const out: string[] = [];
      for (let e: Element | null = document.elementFromPoint(x, y); e && e !== document.documentElement; e = e.parentElement) {
        const cs = getComputedStyle(e); const r = e.getBoundingClientRect();
        if (cs.touchAction !== "auto" || /(auto|scroll|hidden)/.test(cs.overflowY + cs.overflowX) || e.id === "app-stage-scroll")
          out.push(`${e.tagName}.${String(e.getAttribute("class") ?? "").split(" ")[0]}${e.id ? "#" + e.id : ""} ta=${cs.touchAction} ov=${cs.overflowX}/${cs.overflowY} sh=${e.scrollHeight}/${e.clientHeight} y=${Math.round(r.top)}`);
      }
      const st = document.getElementById("app-stage-scroll")!;
      return { chain: out.slice(0, 8), stage: { st: st.scrollTop, sh: st.scrollHeight, ch: st.clientHeight, ov: getComputedStyle(st).overflowY } };
    }, [Math.round(vp.width / 2), Math.round(vp.height * 0.7)] as const);
    await j.step(`end-${path}`);
    await touchDrag(page, Math.round(vp.width / 2), Math.round(vp.height * 0.4), 80, 6);
    const back = await page.locator(".pa-tabbar.away").count() === 0;
    /* open one item and come back, with the back button */
    const item = page.locator('.ws-wbody [data-qm1="row"] .pa-row, .ws-wbody [data-pa="ag-row"], .ws-wbody [data-pa$="-row"]').locator("visible=true").first();
    let opened = false, returned = false, sheetLeft = 0;
    if (await item.count()) {
      const from = page.url(); await item.tap().catch(() => {}); await page.waitForTimeout(1200);
      opened = page.url() !== from || await page.locator('[role=dialog]:visible, .pa-qsheet:visible').count() > 0;
      await page.goBack(); await page.waitForTimeout(1200);
      returned = new URL(page.url()).pathname === path;
      /* G2's regression check: the back button leaves no sheet behind (the agent sheet used to follow the writer) */
      sheetLeft = await page.locator(".pa-sheet:visible").count();
      if (!returned) await go(page, path);
    }
    const hasBar = await page.locator(".pa-tabbar:visible").count() > 0;
    pages.push({ path, s0, s1, diag, reachedEnd: s1.max - s1.top < 2, tucked: !hasBar ? "no bar (menu page)" : s0.max > 300 ? away : "short page", back, opened, returned, sheetLeft });
  }
  /* no sideways scroll at 320, 360, 390, 430 */
  const hs: Record<string, string[]> = {};
  for (const w of [320, 360, 390, 430]) {
    await page.setViewportSize({ width: w, height: 800 }); hs[w] = [];
    for (const path of DECISION_2) { await go(page, path); if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) hs[w].push(path); }
  }
  await page.setViewportSize(vp);
  appendFileSync(READINGS || "/dev/null", JSON.stringify({ journey: "J4", project: proj(), where: where(), facts: { pages, hs } }) + "\n");
  const row = j.record();
  expect.soft(pages.filter((p) => !p.reachedEnd).map((p) => p.path), "every page reaches its end").toEqual([]);
  expect.soft(Object.values(hs).flat(), "no sideways scroll at 320–430").toEqual([]);
  expect.soft(pages.filter((p) => p.sheetLeft).map((p) => p.path), "back leaves no sheet open (G2)").toEqual([]);
  expect(row.findings, JSON.stringify(row.findings.slice(0, 20), null, 1)).toEqual([]);
});

/* ───────────────────────────── J6 account ───────────────────────────── */

test("J6 account: settings, plan, sign out, Forgot?, sign in, sign-in ↔ sign-up, the error page", async ({ page }) => {
  test.skip(!want("J6"));
  test.setTimeout(600_000);
  const j = new Journey(page, "J6"); creds = makeCreds("j6", proj());
  await freshHome(page, j, creds);
  const f: Record<string, unknown> = {};
  await go(page, "/account"); await j.step("settings");
  const sections = await page.locator(".ws-wbody a[href^='/account'], .ws-wbody button[data-pa*='set'], .ws-wbody [data-pa='set-row']").locator("visible=true").count();
  f.sections = sections;
  for (let i = 0; i < Math.min(sections, 8); i++) {
    const s = page.locator(".ws-wbody a[href^='/account'], .ws-wbody button[data-pa*='set'], .ws-wbody [data-pa='set-row']").locator("visible=true").nth(i);
    await s.tap().catch(() => {}); await page.waitForTimeout(900); await j.step(`settings-section-${i + 1}`);
    await page.goBack(); await page.waitForTimeout(900);
  }
  await go(page, "/plans"); await j.step("plan-billing");
  await page.locator('[data-pa="menu-btn"]').first().tap(); await page.waitForTimeout(600);
  await page.locator('[data-pa="menu-signout"]').tap(); await page.waitForTimeout(2500);
  await j.step("signed-out");
  await page.goto("/#/login"); await page.locator("#au-email").waitFor({ timeout: 20_000 });
  await page.getByRole("button", { name: /Forgot/ }).tap(); await page.waitForTimeout(600); await j.step("forgot");
  f.reset = await page.locator("#au-reset").count();
  /* a goto that only changes the hash does not reload, and the reset form would stay up */
  await page.goto("about:blank"); await page.goto("/#/login"); await page.locator("#au-email").waitFor();
  const loads = await page.evaluate(() => performance.getEntriesByType("navigation").length);
  await page.getByRole("button", { name: /^Sign up|^Create/ }).first().tap().catch(() => page.evaluate(() => { location.hash = "#/signup"; }));
  await page.waitForTimeout(600); f.toSignup = await page.locator("#au-name").count(); await j.step("to-signup");
  await page.getByRole("button", { name: /^Sign in|^Log in/ }).first().tap().catch(() => page.evaluate(() => { location.hash = "#/login"; }));
  await page.waitForTimeout(600); f.backToSignin = await page.locator("#au-name").count() === 0;
  f.noReload = (await page.evaluate(() => performance.getEntriesByType("navigation").length)) === loads;
  await page.locator("#au-email").fill(creds.email); await page.locator("#au-pw").fill(creds.password);
  await page.getByRole("button", { name: /^Sign in$/ }).last().tap();
  f.signedIn = await page.locator('[data-pa="band"]').first().waitFor({ timeout: 45_000 }).then(() => true, () => false);
  await j.step("signed-in");
  /* the error page: the existing dev-only hook, if this build has one */
  f.errorHook = await page.evaluate(() => typeof (window as unknown as { __SA_FORCE_RENDER_ERROR?: unknown }).__SA_FORCE_RENDER_ERROR !== "undefined");
  appendFileSync(READINGS || "/dev/null", JSON.stringify({ journey: "J6", project: proj(), where: where(), facts: f }) + "\n");
  const row = j.record();
  expect.soft(f.reset, "Forgot? shows the reset form").toBe(1);
  expect.soft(f.toSignup, "#/login → sign up without a reload").toBe(1);
  expect.soft(f.backToSignin && f.noReload, "and back, without a reload").toBe(true);
  expect.soft(f.signedIn, "signs in again").toBe(true);
  expect(row.findings, JSON.stringify(row.findings.slice(0, 20), null, 1)).toEqual([]);
});

/* ───────────────────────────── J7 the keyboard ───────────────────────────── */

test("J7 the keyboard: the focused field and the pinned button are both visible with the keyboard up", async ({ page }) => {
  test.skip(!want("J7"));
  test.setTimeout(600_000);
  const j = new Journey(page, "J7"); creds = makeCreds("j7", proj());
  const vp = page.viewportSize()!;
  /* THE KEYBOARD IS SIMULATED BY SHRINKING THE VIEWPORT to what visualViewport would leave (~45% of the height), the
     way the earlier phone suites do; a real on-screen keyboard is on Nick's tap-through list. */
  const kb = async (label: string, field: string, pinned: string) => {
    await page.setViewportSize({ width: vp.width, height: Math.round(vp.height * 0.55) });
    /* the VISIBLE field — a previous step's input stays mounted, hidden, and focusing it scrolls nothing into view */
    await page.locator(field).locator("visible=true").first().focus(); await page.waitForTimeout(500);
    const r = await page.evaluate(([f, p]) => {
      /* "text=Words" finds the visible button with those words (native querySelector has no :has-text) */
      const find = (s: string) => s.startsWith("text=") ? [...document.querySelectorAll("button")].find((x) => x.textContent?.trim() === s.slice(5) && x.getBoundingClientRect().height > 0) ?? null
        : [...document.querySelectorAll(s)].find((x) => x.getBoundingClientRect().height > 0) ?? null;
      const inView = (s: string) => { const e = find(s); if (!e) return null; const b = e.getBoundingClientRect(); return b.top >= 0 && b.bottom <= (visualViewport?.height ?? innerHeight) + 0.5; };
      const box = (s: string) => { const e = find(s); if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.top), Math.round(b.bottom)]; };
      const fe = find(f); let sc: string | null = null;
      for (let e = fe?.parentElement ?? null; e; e = e.parentElement) { const cs = getComputedStyle(e); if (/(auto|scroll)/.test(cs.overflowY) && e.scrollHeight > e.clientHeight) { sc = `${e.className}`.slice(0, 40) + ` st=${e.scrollTop}`; break; } }
      return { field: inView(f), pinned: inView(p), at: { field: box(f), pinned: box(p), vh: Math.round(visualViewport?.height ?? innerHeight), focused: document.activeElement === fe, scroller: sc, win: scrollY } };
    }, [field, pinned]);
    await j.step(`kb-${label}`);
    await page.setViewportSize(vp);
    return r;
  };
  const out: Record<string, unknown> = {};
  await page.goto("/#/signup"); await page.locator("#au-email").waitFor({ timeout: 30_000 });
  out.signup = await kb("signup", "#au-pw", "text=Create your account");
  await signUp(page, j, creds);
  await vis(page, /^Continue/).waitFor();
  await page.locator(".sf-opt:visible").first().tap(); await vis(page, /^Continue/).tap(); await page.waitForTimeout(900);
  out.setup = await kb("setup", ".sf input[type=text]", ".sf-foothost button");
  await vis(page, /^Skip for now/).tap().catch(() => {});
  await page.locator('[data-pa="band"]').first().waitFor({ timeout: 45_000 });
  await page.locator('[data-pa="plus"]').tap(); await page.locator('[data-pa="plus-sent"]').tap(); await page.locator(".pa-flow").waitFor();
  out.log = await kb("log", "[data-qad-agent-input]", '[data-pf="primary"]');
  await page.locator('.pa-flow [data-pf="close"]').tap().catch(() => {});
  appendFileSync(READINGS || "/dev/null", JSON.stringify({ journey: "J7", project: proj(), where: where(), facts: out }) + "\n");
  const row = j.record();
  for (const [k, v] of Object.entries(out)) expect.soft({ field: (v as { field: unknown }).field, pinned: (v as { pinned: unknown }).pinned }, `${k}: field and pinned button both in view ${JSON.stringify((v as { at: unknown }).at)}`).toEqual({ field: true, pinned: true });
  expect(row.findings, JSON.stringify(row.findings.slice(0, 20), null, 1)).toEqual([]);
});

/* ───────────────────────────── J2 importer ───────────────────────────── */

test("J2 importer: set-up imports the messy tracker; piles = overview; every question; Home and Queries = overview", async ({ page }) => {
  test.skip(!want("J2"));
  test.setTimeout(900_000);
  const j = new Journey(page, "J2"); creds = makeCreds("j2", proj());
  const f: Record<string, unknown> = {};
  await page.goto("/#/signup");
  await signUp(page, j, creds);
  /* welcome: "A few queries out" (the importer), then the book, to the capture fork */
  await page.locator(".sf-opt:visible").nth(1).tap(); await vis(page, /^Continue/).tap(); await page.waitForTimeout(900);
  for (let i = 0; i < 6 && !(await page.locator('[data-act="smart"]:visible').count()); i++) {
    const title = page.locator(".sf input[type=text]:visible").first();
    if (await title.count() && !(await title.inputValue())) { await title.tap(); await title.pressSequentially("The Lantern Keeper", { delay: 10 }); }
    const opt = page.locator(".sf-opt:visible").first();
    if (await opt.count() && !(await page.locator(".sf-opt.is-on:visible, .sf-opt[aria-checked=true]:visible").count())) await opt.tap().catch(() => {});
    if (await page.getByText("Literary fiction", { exact: true }).locator("visible=true").count()) {
      await page.getByText("Literary fiction", { exact: true }).locator("visible=true").first().tap();
      await page.getByText("Adult", { exact: true }).locator("visible=true").first().tap();
      const w = page.locator("#o9-words:visible"); if (await w.count()) { await w.tap(); await w.pressSequentially("85000", { delay: 10 }); }
    }
    await j.step(`setup-${i + 1}`);
    const c = vis(page, /^(Continue|Next)/);
    if (await c.count() && await c.isEnabled()) await c.tap(); else break;
    await page.waitForTimeout(900);
  }
  await j.step("fork");
  f.fork = await page.locator('[data-act="smart"]:visible').count();
  await page.locator('input[data-picker="smart"]').setInputFiles("tests/fixtures/import/smart-messy.xlsx");
  /* the confirm screen: the file named, "Read my file" to go on */
  await vis(page, /^Read my file/).waitFor({ timeout: 20_000 });
  await j.step("confirm");
  await vis(page, /^Read my file/).tap();
  /* the sorting animation, to its end */
  await page.locator('[data-im="reading"]').first().waitFor({ timeout: 30_000 }).catch(() => {});
  await j.step("reading");
  await page.locator('[data-im="reading"][data-im-state="done"]').first().waitFor({ timeout: 120_000 }).catch(() => {});
  f.piles = await page.evaluate(() => [...document.querySelectorAll('[data-im^="pile-"]')].map((e) => Number(e.textContent)));
  await page.locator('[data-im="card-agents"], [data-im="card-queries"]').first().waitFor({ timeout: 120_000 });
  await j.step("overview");
  f.overview = await page.evaluate(() => [...document.querySelectorAll('[data-im="card-agents"] [data-im="total"], [data-im="card-queries"] [data-im="total"]')].map((e) => Number(e.textContent)));
  await page.locator('[data-im="primary"]:visible').first().tap(); await page.waitForTimeout(800);
  /* the review: one question per screen, the set-up suite's phone path */
  let answered = 0, repeats = 0, matched = 0, skipped = 0, stuck = 0, lastSig = "";
  for (let k = 0; k < 120; k++) {
    if (await page.locator('[data-pa="band"]').count()) break;
    if (await page.locator('[data-im="deck-answer"]:visible').count() && !(await page.locator('[data-im="q-layer"]').count())) { await page.locator('[data-im="deck-answer"]:visible').first().tap(); await page.waitForTimeout(250); }
    const card = page.locator('[data-im="q-layer"] [data-im="deck-card"]').first();
    if (await card.count() && (await card.getAttribute("data-answered")) !== "1") {
      const sig = ((await card.textContent()) ?? "").slice(0, 120);
      if (answered < 3 || sig !== lastSig) { if (answered < 6) await j.step(`question-${answered + 1}`); }
      stuck = sig === lastSig ? stuck + 1 : 0; lastSig = sig;
      /* the card's own answers, in order: an escape answer, a pick, the card's own button (Save date, Looks right…),
         a quiet link (Keep as month); a card that does not move after three tries is skipped from the foot */
      const esc = card.locator('.o9-esc .sf-link:not([data-im="deck-change"])'), pick = card.locator(".o9-pick:visible, .im-choice:visible");
      const own = page.locator('[data-im="q-layer"] button.sf-btn:visible, [data-im="q-layer"] [data-im="q-save"]:visible').first();
      const quiet = page.locator('[data-im="q-layer"] .sf-link:visible:not([data-im="deck-change"])').first();
      if (stuck >= 3) { await page.getByText("Skip", { exact: true }).locator("visible=true").first().tap().catch(() => {}); skipped++; stuck = 0; }
      else if (await page.locator('[data-im="q-layer"] :is(button, a):visible', { hasText: /^Keep as month$/ }).count()) await page.locator('[data-im="q-layer"] :is(button, a):visible', { hasText: /^Keep as month$/ }).first().tap();
      else if (await esc.count()) await esc.first().tap();
      else if (await pick.count()) await pick.first().tap();
      else if (await own.count()) {
        for (const t of await page.locator('[data-im="q-layer"] input[type="text"]:visible').all()) if (!(await t.inputValue())) await t.fill("Penhallow Literary");
        for (const t of await page.locator('[data-im="q-layer"] input[type="date"]:visible').all()) if (!(await t.inputValue())) await t.fill("2024-04-15");
        await own.tap();
      } else if (await quiet.count()) await quiet.tap();
      answered++; await page.waitForTimeout(350); continue;
    }
    /* a repeat: the first "Looks right" / keep choice */
    const rep = page.locator('[data-im^="dupe"] button:visible, .im-dupe button:visible').first();
    if (await rep.count()) { if (!repeats) await j.step("repeat"); await rep.tap(); repeats++; await page.waitForTimeout(300); continue; }
    if (await page.getByText(/match columns/i).locator("visible=true").count()) { matched++; await j.step("match-columns"); }
    const pri = page.locator('[data-im="primary"]:visible').first();
    if (!(await pri.count())) { await page.waitForTimeout(800); continue; }
    const label = ((await pri.textContent()) ?? "").trim();
    if (/Import and get started/i.test(label)) await j.step("import-and-get-started");
    if (!(await pri.isEnabled())) break;
    await pri.tap(); await page.waitForTimeout(700);
  }
  f.answered = answered; f.skipped = skipped; f.repeats = repeats; f.matched = matched;
  const home = await page.locator('[data-pa="band"]').first().waitFor({ timeout: 120_000 }).then(() => true, () => false);
  await page.waitForTimeout(3000);
  await j.step("home");
  f.home = await page.evaluate(() => (document.querySelector('[aria-label*="active queries, open Queries"], [aria-label*="active query, open Queries"]')?.getAttribute("aria-label") ?? "").match(/^(\d+)/)?.[1] ?? null);
  await go(page, "/queries"); await page.waitForTimeout(2500);
  await j.step("queries");
  f.queries = await page.locator('[data-qm1="row"]').count();
  await go(page, "/agents"); await page.waitForTimeout(2000);
  f.agents = await page.locator('[data-pa="ag-row"]').count();
  appendFileSync(READINGS || "/dev/null", JSON.stringify({ journey: "J2", project: proj(), where: where(), facts: f }) + "\n");
  const row = j.record();
  const [ovAgents, ovQueries] = (f.overview as number[]) ?? [];
  expect.soft(f.piles, "the piles end on the overview's totals").toEqual(f.overview);
  expect.soft(home, "Import and get started lands on Home").toBe(true);
  expect.soft(f.queries, "Queries holds the overview's queries").toBe(ovQueries);
  expect.soft(f.agents, "Agents holds the overview's agents").toBe(ovAgents);
  expect(row.findings, JSON.stringify(row.findings.slice(0, 20), null, 1)).toEqual([]);
});
