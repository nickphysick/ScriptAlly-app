/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre · Pack A §1 — THE DISTRIBUTION RULE, measured.
 *
 * ⚠️ THIS FILE IS THE ONLY THING THAT CAN VERIFY §1, and that is why it is committed rather than
 * kept as scratch. The rule is about where boxes LAND, and this repo's suite runs
 * `environment: 'node'` — no layout engine — so a flex chain reports `auto`, `getBoundingClientRect`
 * returns zeros, and a source assertion that the elements exist passes cheerfully against a broken
 * page. Every number below is the browser's.
 *
 * ⚠️ jsdom CANNOT VERIFY ANY OF THIS. There is no layout engine, so a flex chain reports `auto` and
 * an assertion that the elements exist passes against a broken layout. Every number here is the
 * browser's.
 *
 * THE RULE (§1): the ACTIVE step anchors directly beneath the header block — it is the work, and it
 * stays with the question. Only the COLLAPSED remainder sinks toward the dock. So the gap measured
 * below (header block → active step) should be constant and small in every state where a step is
 * open, and only the queue beneath it should move.
 *
 * ⚠️ SESSION AND TIMING, both learned the hard way in the previous pack: the saved `storageState`
 * carries no Firebase session (it lives in IndexedDB), so this signs in for itself; and the list
 * renders before the query snapshot lands, so it waits for `.qp-pane` before clicking a CTA whose
 * label differs between the empty and populated branches.
 */
import { test, expect, Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const WIDTHS = [
  { w: 1024, h: 768 },
  { w: 1440, h: 900 },
  { w: 1920, h: 1080 },
] as const;

const EMAIL = process.env.SA_E2E_EMAIL ?? "harness@scriptally.test";
function password(): string {
  if (process.env.SA_E2E_PASSWORD) return process.env.SA_E2E_PASSWORD;
  for (const line of readFileSync(resolve(process.cwd(), ".env.local"), "utf8").split("\n")) {
    const m = /^\s*SA_E2E_PASSWORD\s*=\s*(.*)$/.exec(line);
    if (m) return m[1].trim().replace(/^["']|["']$/g, "");
  }
  throw new Error("No SA_E2E_PASSWORD — this would run signed out.");
}

async function signIn(page: Page) {
  await page.goto("/#/signin");
  await page.locator("#au-email").fill(EMAIL);
  await page.locator("#au-pw").fill(password());
  await page.getByRole("button", { name: /^Sign in$/ }).last().click();
  const shell = page.locator(".ws-panel, .sv2-app, #app-stage-scroll").first();
  for (let i = 0; i < 8; i += 1) {
    if (await shell.count()) break;
    const skip = page.getByRole("button", { name: /^Skip this step$/ });
    if (await skip.count()) { await skip.first().click(); await page.waitForTimeout(900); continue; }
    break;
  }
  await expect(shell).toBeVisible({ timeout: 30_000 });
}

async function queries(page: Page) {
  await page.goto("/queries");
  await page.locator(".f12-list").first().waitFor({ state: "visible", timeout: 20000 });
  await page.locator(".qp-pane").first().waitFor({ state: "attached", timeout: 20000 });
  await page.waitForTimeout(1200);
}

/**
 * Header block bottom → active step top, and the queue's own offset.
 *
 * ⚠️ THE HEADER BLOCK IS `.qch`, NOT THE SHEET. What §1 is about is the distance from the question
 * to the work, and the question lives in the journey header.
 */
async function geometry(page: Page) {
  return page.evaluate(() => {
    const q = (s: string) => document.querySelector(s) as HTMLElement | null;
    const header = q(".qc-sheet .qch");
    const stack = q(".qc-sheet .qc-stack");
    const active = q(".qc-sheet .qc-sec.qc-active");
    const secs = Array.from(document.querySelectorAll<HTMLElement>(".qc-sheet .qc-sec"));
    const dock = q(".qc-sheet .qc-dock");
    const form = q(".qc-sheet .qc-form");
    const panel = q(".qc-sheet .qc-ctx, .qc-sheet .qr-ref");
    const r = (el: HTMLElement | null) => (el ? el.getBoundingClientRect() : null);
    const hb = r(header), sb = r(stack), ab = r(active), db = r(dock), fb = r(form), pb = r(panel);
    /* the first COLLAPSED section after the active one — the queue's head */
    const activeIdx = secs.findIndex((s) => s.classList.contains("qc-active"));
    const nextCollapsed = activeIdx > -1 ? secs[activeIdx + 1] : secs[0];
    const nb = r(nextCollapsed ?? null);
    return {
      headerBottom: hb ? Math.round(hb.bottom) : null,
      stackTop: sb ? Math.round(sb.top) : null,
      activeTop: ab ? Math.round(ab.top) : null,
      activeH: ab ? Math.round(ab.height) : null,
      /* THE NUMBER §1 IS ABOUT — but measured from the last thing BEFORE the stack, not from the
         header, because create legitimately puts the agent band in between. Header-relative, a
         118px band reads as 118px of slack. */
      gap: hb && ab ? Math.round(ab.top - hb.bottom) : (hb && sb ? Math.round(sb.top - hb.bottom) : null),
      slack: (() => {
        const stackEl = q(".qc-sheet .qc-stack");
        if (!stackEl) return null;
        const prev = stackEl.previousElementSibling as HTMLElement | null;
        const anchor = prev ? prev.getBoundingClientRect().bottom : (hb ? hb.bottom : null);
        const target = ab ? ab.top : (sb ? sb.top : null);
        return anchor != null && target != null ? Math.round(target - anchor) : null;
      })(),
      queueTop: nb ? Math.round(nb.top) : null,
      dockTop: db ? Math.round(db.top) : null,
      formH: fb ? Math.round(fb.height) : null,
      panelClass: panel ? panel.className.split(" ")[0] : null,
      panelW: pb ? Math.round(pb.width) : null,
      panelH: pb ? Math.round(pb.height) : null,
      panelTop: pb ? Math.round(pb.top) : null,
      panelAlign: panel ? getComputedStyle(panel).alignSelf : null,
      panelPos: panel ? getComputedStyle(panel).position : null,
      chips: document.querySelectorAll(".qc-sheet .qch-rq").length,
      chipsEmpty: document.querySelectorAll(".qc-sheet .qch-empty").length,
      agentBand: (() => { const el = q(".qc-sheet .qc-hero"); return el ? Math.round(el.getBoundingClientRect().height) : null; })(),
    };
  });
}

async function openCreate(page: Page) {
  await queries(page);
  await page.getByRole("button", { name: /^Log query$/ }).first().click();
  await page.locator(".qc-sheet").waitFor({ state: "visible", timeout: 10000 });
  await page.waitForTimeout(800);
}

/** Pick an agent — that is what takes create from stage 1 to the step stack. */
async function pickAgent(page: Page): Promise<boolean> {
  const show = page.getByRole("button", { name: /^Show them$/ });
  if (await show.count()) { await show.first().click(); await page.waitForTimeout(400); }
  const field = page.locator(".qc-sheet .qc-pickfield").first();
  if (await field.count()) { await field.click(); await page.waitForTimeout(500); }
  const row = page.locator(".qc-sheet [role='option']").first();
  if (!(await row.count())) return false;
  await row.click();
  await page.waitForTimeout(700);
  return true;
}

/**
 * ⚠️ THE HERO PRIMARY IS NOT ALWAYS "Record response". It is the CTA engine's output, so on a
 * writer's-turn query it reads "Mark partial as sent" and opens a popover instead — clicking it
 * blind waits 30s for a sheet that was never going to appear, and in serial mode that kills the
 * rest of the file. So: walk the list until a row whose primary IS the record door.
 */
async function openRecord(page: Page): Promise<boolean> {
  await queries(page);
  const rows = page.locator(".f12-row");
  const n = Math.min(await rows.count(), 12);
  for (let i = 0; i < n; i += 1) {
    await rows.nth(i).click();
    await page.waitForTimeout(350);
    const label = await page.locator(".qp-pane .f12-btn-pri").first().textContent().catch(() => null);
    if (label && /record response/i.test(label)) {
      await page.locator(".qp-pane .f12-btn-pri").first().click();
      await page.locator(".qc-sheet").waitFor({ state: "visible", timeout: 8000 });
      await page.waitForTimeout(800);
      return true;
    }
  }
  return false;
}

/** Leave a journey, answering the dirty guard if it asks. */
async function leave(page: Page) {
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
  const disc = page.getByRole("button", { name: /^Discard$/ });
  if (await disc.count()) { await disc.first().click(); await page.waitForTimeout(500); }
}

const log = (w: number, label: string, m: { [k: string]: unknown }) => {
  // eslint-disable-next-line no-console
  console.log(`[${w}] ${label} slack=${m.slack} gap=${m.gap} activeTop=${m.activeTop} activeH=${m.activeH} queueTop=${m.queueTop} dockTop=${m.dockTop} band=${m.agentBand} chips=${m.chips}/${m.chipsEmpty}empty panel=${m.panelClass} ${m.panelW}x${m.panelH} top=${m.panelTop} align=${m.panelAlign} pos=${m.panelPos}`);
};

test.describe.configure({ mode: "serial" });
let page: Page;
test.beforeAll(async ({ browser }) => { page = await browser.newPage(); await signIn(page); });
test.afterAll(async () => { await page.close(); });

type Shot = { gap: number | null; slack: number | null; activeTop: number | null; activeH: number | null; queueTop: number | null; dockTop: number | null; agentBand: number | null; chips: number; chipsEmpty: number; panelClass: string | null; panelW: number | null; panelH: number | null; panelTop: number | null; panelAlign: string | null; panelPos: string | null; stackTop: number | null; headerBottom: number | null; formH: number | null };

const shots: Record<string, Record<number, Shot>> = { stage1: {}, createOpen: {}, recordNone: {}, recordOutcome: {} };

for (const { w, h } of WIDTHS) {
  test(`four states at ${w}x${h}`, async () => {
    await page.setViewportSize({ width: w, height: h });

    /* ── 1 · create, stage 1 (agent not yet chosen: every step collapsed) ── */
    await openCreate(page);
    shots.stage1[w] = await geometry(page);
    log(w, "create-stage1  ", shots.stage1[w]);

    /* ── 2 · create with a step open ── */
    if (await pickAgent(page)) {
      shots.createOpen[w] = await geometry(page);
      log(w, "create-open    ", shots.createOpen[w]);
    } else {
      // eslint-disable-next-line no-console
      console.log(`[${w}] create-open     SKIPPED — no agent row reachable`);
    }
    await leave(page);

    /* ── 3 · record, nothing chosen ── */
    if (!(await openRecord(page))) {
      // eslint-disable-next-line no-console
      console.log(`[${w}] record          SKIPPED — no query offers Record response`);
      return;
    }
    shots.recordNone[w] = await geometry(page);
    log(w, "record-nochoice", shots.recordNone[w]);

    /* ── 4 · record with an outcome chosen and its branch open ── */
    const outcome = page.locator(".qc-sheet .qr-out, .qc-sheet [data-k]").first();
    if (await outcome.count()) {
      await outcome.click();
      await page.waitForTimeout(800);
      shots.recordOutcome[w] = await geometry(page);
      log(w, "record-outcome ", shots.recordOutcome[w]);
    }
    await leave(page);

    expect(shots.stage1[w].gap, "create stage 1 produced no measurable gap").not.toBeNull();
  });
}

/**
 * ══ THE RULE, ASSERTED ACROSS SIZES ═════════════════════════════════════════════════════════════
 *
 * ⚠️ THE TEST IS THAT THE ACTIVE STEP'S POSITION DOES NOT SCALE WITH THE VIEWPORT — not that some
 * absolute gap is under a threshold. Header-relative distance legitimately differs between the two
 * journeys (create puts the agent band in between), so a literal would encode today's band height
 * and fail the moment §3 shrinks it. Constancy is the rule; the numbers are incidental.
 *
 * Before the fix, measured: create 130/195/375 and record 226/358/538 at 1024/1440/1920 — growing
 * with viewport height, which is the signature of the WHOLE stack being pushed rather than the
 * queue after it.
 */
test("the active step holds its position at every viewport height", () => {
  for (const [name, key] of [["create", "createOpen"], ["record", "recordNone"], ["record + outcome", "recordOutcome"]] as const) {
    const byW = shots[key];
    const sizes = Object.keys(byW).map(Number);
    if (sizes.length < 2) continue; // a state we could not reach is reported above, not asserted here
    const gaps = sizes.map((x) => byW[x].slack ?? byW[x].gap!);
    const spread = Math.max(...gaps) - Math.min(...gaps);
    // eslint-disable-next-line no-console
    console.log(`[rule] ${name}: slack ${gaps.join(" / ")} across ${sizes.join("/")} — spread ${spread}`);
    expect(spread, `${name}'s active step moves with the viewport — the whole stack is still sinking`)
      .toBeLessThanOrEqual(2);
  }
});

/**
 * ⚠️ STAGE 1 DOES NOT SINK, AND THAT CORRECTS THE RULE AS WRITTEN. The obvious third clause —
 * "everything collapsed, so the whole stack is remainder and sinks" — describes create's stage 1,
 * and stage 1 is not this stack: it is `.qc-ghosts`, which carries its OWN browser-measured decision
 * against an auto margin ("514px of dead space with it and 12px without", because that column also
 * holds a picker, a panel and a grid).
 *
 * The old `margin-top: auto` on `.qc-stack` was overriding that decision — stage 1 measured
 * 341/473/653. Removing it restored the documented 12px. So this case asserts CONSTANT AND SMALL,
 * exactly like the open states, rather than the growth the rule predicted.
 */
test("stage 1's ghosts hug rather than sink — the measured decision, restored", () => {
  const sizes = Object.keys(shots.stage1).map(Number).sort((a, b) => a - b);
  if (sizes.length < 2) return;
  const slacks = sizes.map((x) => shots.stage1[x].slack!);
  // eslint-disable-next-line no-console
  console.log(`[rule] stage1 slack: ${slacks.join(" / ")} across ${sizes.join("/")}`);
  const spread = Math.max(...slacks) - Math.min(...slacks);
  expect(spread, "stage 1's ghosts moved with the viewport — the auto margin is back")
    .toBeLessThanOrEqual(2);
  expect(Math.max(...slacks), "stage 1 grew a hole — `.qc-ghosts` measured 12px without the margin")
    .toBeLessThanOrEqual(24);
});
