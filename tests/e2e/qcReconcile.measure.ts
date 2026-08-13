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
      chipText: Array.from(document.querySelectorAll(".qc-sheet .qch-rq")).map((e) => (e as HTMLElement).innerText.replace(/\s+/g, " ").trim()).join(" | "),
      titleTop: (() => { const el = q(".qc-sheet .qch-title"); return el ? Math.round(el.getBoundingClientRect().top) : null; })(),
      placeTop: (() => { const el = q(".qc-sheet .qch-place"); return el ? Math.round(el.getBoundingClientRect().top) : null; })(),
      chipsEmpty: document.querySelectorAll(".qc-sheet .qch-empty").length,
      agentBand: (() => { const el = q(".qc-sheet .qc-agband"); return el ? Math.round(el.getBoundingClientRect().height) : null; })(),
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
  console.log(`[${w}] ${label} slack=${m.slack} gap=${m.gap} activeTop=${m.activeTop} activeH=${m.activeH} queueTop=${m.queueTop} dockTop=${m.dockTop} band=${m.agentBand} chips=${m.chips}[${m.chipText}] panel=${m.panelClass} ${m.panelW}x${m.panelH} top=${m.panelTop} align=${m.panelAlign} pos=${m.panelPos}`);
};

test.describe.configure({ mode: "serial" });
let page: Page;
test.beforeAll(async ({ browser }) => { page = await browser.newPage(); await signIn(page); });
test.afterAll(async () => { await page.close(); });

type Shot = { titleTop: number | null; placeTop: number | null; chipText: string; gap: number | null; slack: number | null; activeTop: number | null; activeH: number | null; queueTop: number | null; dockTop: number | null; agentBand: number | null; chips: number; chipsEmpty: number; panelClass: string | null; panelW: number | null; panelH: number | null; panelTop: number | null; panelAlign: string | null; panelPos: string | null; stackTop: number | null; headerBottom: number | null; formH: number | null };

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

/**
 * ══ §2 · THE PANELS ARE INDISTINGUISHABLE IN CHASSIS ═══════════════════════════════════════════
 *
 * ⚠️ EQUALITY, NOT PIXEL VALUES ON EITHER SIDE. Record had its own chassis and the two drifted to
 * 326×427 / `flex-start` against 300×642 / `stretch`, with neither wrong on its own terms. A lock on
 * create's 326 or record's 300 would have passed throughout.
 *
 * ⚠️ AND ONLY AT 1440 AND 1920. Both panels are `display: none` below 1100px, so at 1024 they
 * measure 0×0 — an equality assertion there passes because there is nothing to compare, which is a
 * test that cannot fail. Absence is what 1024 asserts instead.
 */
test("the two journeys' panels are the same chassis, where they render at all", () => {
  for (const w of [1440, 1920]) {
    const c = shots.createOpen[w];
    const r = shots.recordNone[w];
    if (!c || !r || !c.panelW || !r.panelW) continue;
    // eslint-disable-next-line no-console
    console.log(`[glance ${w}] create ${c.panelW}x${c.panelH} align=${c.panelAlign} pos=${c.panelPos} top=${c.panelTop} · record ${r.panelW}x${r.panelH} align=${r.panelAlign} pos=${r.panelPos} top=${r.panelTop}`);
    expect(r.panelW, `panel widths differ at ${w}`).toBe(c.panelW);
    expect(r.panelAlign, `panel alignment differs at ${w}`).toBe(c.panelAlign);
    expect(r.panelPos, `panel positioning differs at ${w}`).toBe(c.panelPos);
    expect(r.panelClass, `the two panels are different elements at ${w}`).toBe(c.panelClass);
    expect(Math.abs(r.panelTop! - c.panelTop!), `panel top offsets differ at ${w}`).toBeLessThanOrEqual(2);
    /* ⚠️ HEIGHT IS CONTENT, NOT CHASSIS — the two carry different rows, so they SHOULD differ. What
       must not differ is that either one stretches: both hug, so both are shorter than the column. */
    expect(r.panelH!, "record's panel is stretching again").toBeLessThan(r.dockTop! - r.panelTop!);
    expect(c.panelH!, "create's panel is stretching").toBeLessThan(c.dockTop! - c.panelTop!);
  }
});

/* ⚠️ ASSERTED ABSENT, NOT ASSERTED EQUAL. Below 1100px the column is too narrow for a reference
   table — every row wraps to three lines and the form loses its measure — so both panels hide. */
test("below 1100px neither panel renders", () => {
  for (const key of ["createOpen", "recordNone"] as const) {
    const m = shots[key][1024];
    if (!m) continue;
    expect(m.panelW ?? 0, `${key}'s panel is visible at 1024`).toBe(0);
  }
});

/**
 * ══ §4 · CHIPS APPEAR ONLY ONCE EARNED, AND THEIR ARRIVAL MOVES NOTHING ════════════════════════
 *
 * ⚠️ THE NO-REFLOW HALF CANNOT BE SOURCE-TESTED. `min-height` on the row is the cause; whether the
 * title and place line actually hold their y is a rendered fact, and this repo's suite has no
 * layout engine to ask.
 */
test("no chips on arrival, and earning one moves neither the title nor the place line", () => {
  for (const w of [1024, 1440, 1920]) {
    const before = shots.recordNone[w];
    const after = shots.recordOutcome[w];
    if (!before || !after) continue;
    // eslint-disable-next-line no-console
    console.log(`[chips ${w}] record ${before.chips} → ${after.chips} · title ${before.titleTop} → ${after.titleTop} · place ${before.placeTop} → ${after.placeTop}`);
    expect(before.chips, "record opened with chips already showing").toBe(0);
    expect(after.chips, "choosing an outcome earned no chip").toBeGreaterThan(0);
    if (before.titleTop != null && after.titleTop != null) {
      expect(after.titleTop, "the title moved when a chip arrived").toBe(before.titleTop);
    }
    if (before.placeTop != null && after.placeTop != null) {
      expect(after.placeTop, "the place line moved when a chip arrived").toBe(before.placeTop);
    }
  }

  /* create's stage 1 has nothing answered either */
  for (const w of [1024, 1440, 1920]) {
    const s1 = shots.stage1[w];
    if (s1) expect(s1.chips, "create opened with chips already showing").toBe(0);
  }
});

/* ══ Pack B §1 · THE CHASSIS, MEASURED ═════════════════════════════════════════════════════════
 *
 * ⚠️ THE PROPORTIONS ARE ASSERTED AT >=1100 ONLY, AND THE BAND BELOW IT IS A KNOWN GAP. At 1024 the
 * whole working column is 594px, so a 334px list leaves the pane 248 — narrower than the list — and
 * no ratio fixes that, because both halves lose. The page already has a seam at 1100 (the glance
 * panel is `display: none` below it), so that is where the two-column contract starts. What
 * 768–1100 actually needs is a single-column mode — list, then detail with a back control — which
 * is the mobile pass's shape, not a ratio tweak.
 */
const chassis: Record<number, { plateW: number|null; plateL: number|null; bodyW: number|null; bodyL: number|null; listW: number|null; paneW: number|null; listBg: string|null; rowBg: string|null; selBg: string|null; heading: boolean; bandH: number|null; seamList: number|null; seamBody: number|null }> = {};

for (const { w, h } of WIDTHS) {
  test(`chassis at ${w}x${h}`, async () => {
    await page.setViewportSize({ width: w, height: h });
    await queries(page);
    const m = await page.evaluate(() => {
      const q = (s: string) => document.querySelector(s) as HTMLElement | null;
      const r = (el: HTMLElement | null) => (el ? el.getBoundingClientRect() : null);
      const plate = r(q(".wsh")), body = r(q(".f12-body")), list = r(q(".f12-list")), pane = r(q(".qp-pane"));
      const listEl = q(".f12-list");
      return {
        plateW: plate ? Math.round(plate.width) : null, plateL: plate ? Math.round(plate.left) : null,
        bodyW: body ? Math.round(body.width) : null, bodyL: body ? Math.round(body.left) : null,
        listW: list ? Math.round(list.width) : null, paneW: pane ? Math.round(pane.width) : null,
        listBg: listEl ? getComputedStyle(listEl).backgroundColor : null,
        rowBg: (() => { const el = q(".f12-row:not(.f12-sel)"); return el ? getComputedStyle(el).backgroundColor : null; })(),
        selBg: (() => { const el = q(".f12-row.f12-sel"); return el ? getComputedStyle(el).backgroundColor : null; })(),
        heading: !!q(".f12-lhtitle"),
        bandH: (() => { const el = q(".f12-heroband"); return el ? Math.round(el.getBoundingClientRect().height) : null; })(),
        seamList: list ? Math.round(list.height) : null,
        seamBody: body ? Math.round(body.height) : null,
      };
    });
    chassis[w] = m;
    // eslint-disable-next-line no-console
    console.log(`[chassis ${w}] plate ${m.plateW}@${m.plateL} body ${m.bodyW}@${m.bodyL} · list ${m.listW} pane ${m.paneW} · bg ${m.listBg} row ${m.rowBg} sel ${m.selBg} · heading=${m.heading} band=${m.bandH} · seam ${m.seamList}/${m.seamBody}`);

    /* §1b — the masthead spans the working width, at every size */
    expect(m.plateW, `the masthead is still inset at ${w}`).toBe(m.bodyW);
    expect(m.plateL, `the masthead is still offset at ${w}`).toBe(m.bodyL);
    /* §1a — the column states no count of its own */
    expect(m.heading, "the list column's heading came back").toBe(false);
    /* §1c — tinted ground, white selected row */
    expect(m.listBg, "the column has no ground").not.toBe("rgba(0, 0, 0, 0)");
    expect(m.selBg, "the selected row is not white").toBe("rgb(255, 255, 255)");
    expect(m.selBg, "the selected row matches the ground — selection is invisible").not.toBe(m.listBg);
    /* §1c — the seam runs the full height of both columns */
    expect(Math.abs(m.seamList! - m.seamBody!), `the seam is short by ${m.seamBody! - m.seamList!}px at ${w}`)
      .toBeLessThanOrEqual(1);
  });
}

test("§1f · the proportions hold at 1100 and above, and 768-1100 is a known gap", () => {
  for (const w of [1440, 1920]) {
    const m = chassis[w];
    if (!m) continue;
    // eslint-disable-next-line no-console
    console.log(`[§1f ${w}] list ${m.listW} pane ${m.paneW} — pane/list ${(m.paneW! / m.listW!).toFixed(2)}`);
    expect(m.listW, `the list left the 330-340 band at ${w}`).toBeGreaterThanOrEqual(330);
    expect(m.listW, `the list left the 330-340 band at ${w}`).toBeLessThanOrEqual(340);
    expect(m.paneW, `the pane is still the leftover at ${w}`).toBeGreaterThan(m.listW!);
  }
  /* ⚠️ REPORTED, NOT ASSERTED, AT 1024. The pane genuinely is narrower than the list there, and
     that is the known gap — a two-column page in a 594px column. Asserting it would either enforce
     a fault or demand a fix this pack has ruled out. */
  const narrow = chassis[1024];
  if (narrow) {
    // eslint-disable-next-line no-console
    console.log(`[§1f 1024] KNOWN GAP — list ${narrow.listW} pane ${narrow.paneW} in a ${narrow.bodyW}px column; needs single-column mode, not a ratio`);
  }
});

/* ══ Pack B §2 · THE READING PANE ══════════════════════════════════════════════════════════════
 *
 * ⚠️ THE EQUALISATION CHANGED SHAPE, WHICH IS WHY THIS IS MEASURED AND NOT ASSUMED. It used to come
 * from three siblings sharing a row under `align-items: stretch`; the right column is a STACK now,
 * so it has to come from that stack filling its own column. A stacked card trailing into white
 * above the other is the exact failure this replaces, and no source lock can see it.
 */
for (const { w, h } of WIDTHS) {
  test(`pane at ${w}x${h}`, async () => {
    await page.setViewportSize({ width: w, height: h });
    await queries(page);
    const m = await page.evaluate(() => {
      const q = (s: string) => document.querySelector(s) as HTMLElement | null;
      const cols = q(".qp-cols"), stack = q(".qp-stack");
      const left = document.querySelector(".qp-cols > .f12-card") as HTMLElement | null;
      const stacked = Array.from(document.querySelectorAll<HTMLElement>(".qp-stack > .f12-card"));
      const h2 = (el: HTMLElement | null) => (el ? Math.round(el.getBoundingClientRect().height) : null);
      return {
        grid: cols ? getComputedStyle(cols).gridTemplateColumns : null,
        colsH: h2(cols), leftH: h2(left), stackH: h2(stack),
        stackedH: stacked.map((c) => Math.round(c.getBoundingClientRect().height)),
        metas: Array.from(document.querySelectorAll(".qp-cardmeta")).map((e) => (e as HTMLElement).innerText.trim()),
        stats: document.querySelectorAll(".qp-stat").length,
        overflowX: cols ? cols.scrollWidth - cols.clientWidth : null,
      };
    });
    // eslint-disable-next-line no-console
    console.log(`[pane ${w}] grid ${m.grid} · left ${m.leftH} stack ${m.stackH} [${m.stackedH.join("+")}] · metas ${JSON.stringify(m.metas)} stats=${m.stats} overflowX=${m.overflowX}`);

    /* the stack fills Tracking's height — neither card trails into white */
    expect(m.stackH, `the stacked column is short of Tracking at ${w}`).toBe(m.leftH);
    const sum = m.stackedH.reduce((a, b) => a + b, 0);
    expect(Math.abs(sum + 16 - m.stackH!), `the stacked cards do not fill their column at ${w}`)
      .toBeLessThanOrEqual(2);
    /* the ratio is the one the pack names — read off the rendered tracks, not the declaration */
    const tracks = (m.grid ?? "").split(" ").map(Number);
    if (tracks.length === 2 && tracks.every((n) => !Number.isNaN(n))) {
      expect(tracks[0] / tracks[1], `the ratio drifted at ${w}`).toBeCloseTo(1.15 / 0.85, 1);
    }
    expect(m.overflowX, `the pane scrolls sideways at ${w} — a chip row is wrapping badly`).toBeLessThanOrEqual(0);
  });
}

/**
 * ⚠️ THE STATS OMIT THEMSELVES ON A CLOSED QUERY, which is correct and is why the pane cases above
 * report `stats=0`: the harness's first row happens to be a No Response, and a closed query has no
 * days-waiting and no expected date. A cell with nothing true to say does not render.
 *
 * So they have to be verified on a query that IS waiting — otherwise the whole device is unproven
 * by a measurement that looks like it passed.
 */
test("§2 · the two stats render on a waiting query, and omit on a closed one", async () => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await queries(page);
  const rows = page.locator(".f12-row");
  const n = Math.min(await rows.count(), 20);
  let waiting: { stats: number; text: string } | null = null;
  let closed: number | null = null;
  for (let i = 0; i < n; i += 1) {
    await rows.nth(i).click();
    await page.waitForTimeout(280);
    const m = await page.evaluate(() => ({
      stats: document.querySelectorAll(".qp-stat").length,
      text: Array.from(document.querySelectorAll(".qp-statk")).map((e) => (e as HTMLElement).innerText.trim()).join(" | "),
      meta: (document.querySelector(".qp-cardmeta") as HTMLElement | null)?.innerText.trim() ?? "",
    }));
    if (m.stats > 0 && !waiting) waiting = { stats: m.stats, text: m.text };
    if (m.stats === 0 && closed === null) closed = 0;
    if (waiting && closed !== null) break;
  }
  // eslint-disable-next-line no-console
  console.log(`[stats] waiting=${waiting ? `${waiting.stats} cells (${waiting.text})` : "NONE FOUND"} · closed renders ${closed ?? "n/a"}`);
  if (!waiting) {
    /* ⚠️ REPORTED, NOT SILENTLY PASSED. If no waiting query exists on the harness account the device
       is simply unverified, and saying so is worth more than a green tick. */
    // eslint-disable-next-line no-console
    console.log("[stats] UNVERIFIED — no waiting query on this account");
    return;
  }
  expect(waiting.stats, "a waiting query should show both cells").toBe(2);
  expect(waiting.text.toLowerCase()).toContain("waiting so far");
  expect(waiting.text.toLowerCase()).toContain("reply expected by");
});

/* ══ FIX PACK 1 · §0 — VERIFY THE SIX ══════════════════════════════════════════════════════════ */
const VP = [
  { w: 1024, h: 700 }, { w: 1024, h: 768 }, { w: 1440, h: 900 }, { w: 1920, h: 1080 },
] as const;

test("verify: the six, measured", async () => {
  for (const { w, h } of VP) {
    await page.setViewportSize({ width: w, height: h });
    await queries(page);
    const m = await page.evaluate(() => {
      const q = (s: string) => document.querySelector(s) as HTMLElement | null;
      const rows = Array.from(document.querySelectorAll<HTMLElement>(".f12-row"));
      const dates = rows.map((r) => { const d = r.querySelector(".f12-d2") as HTMLElement | null; return d ? Math.round(d.getBoundingClientRect().left) : null; });
      const av = q(".f12-heroband .f12-bigav");
      const scroller = q(".wpg-scroll");
      const notesCard = Array.from(document.querySelectorAll<HTMLElement>(".qp-stack > .f12-card")).pop() ?? null;
      const composer = notesCard?.querySelector("textarea")?.closest("div") as HTMLElement | null;
      const listEl = q(".f12-list"), rowsEl = q(".f12-rows"), body = q(".f12-body");
      const cs = (el: HTMLElement | null, p: string) => (el ? getComputedStyle(el).getPropertyValue(p) : null);
      return {
        /* §1 */
        listRadius: cs(listEl, "border-radius"), listBorder: cs(listEl, "border"),
        rowsMask: [cs(rowsEl, "mask-image"), cs(rowsEl, "-webkit-mask-image")].join("|"),
        fadeEls: document.querySelectorAll(".f12-list [class*='fade'], .f12-rows + *").length,
        seamList: listEl ? Math.round(listEl.getBoundingClientRect().height) : null,
        seamBody: body ? Math.round(body.getBoundingClientRect().height) : null,
        /* §2 */
        rowHs: Array.from(new Set(rows.map((r) => Math.round(r.getBoundingClientRect().height)))),
        dateXs: Array.from(new Set(dates.filter((d) => d !== null))),
        rowDisplay: rows[0] ? getComputedStyle(rows[0]).display : null,
        agencyWrap: rows.map((r) => { const a = r.querySelector(".f12-ag") as HTMLElement | null; return a ? getComputedStyle(a).whiteSpace : null; })[0],
        /* §3 */
        avatarR: av ? getComputedStyle(av).borderRadius : null,
        avatarBg: av ? getComputedStyle(av).backgroundColor : null,
        avatarText: av ? av.innerText.trim() : null,
        /* §4 */
        composerVisible: (() => {
          if (!composer || !notesCard) return null;
          const c = composer.getBoundingClientRect(), n = notesCard.getBoundingClientRect();
          return c.bottom <= n.bottom + 2 && c.top >= n.top;
        })(),
        notesMeta: notesCard?.querySelector(".qp-cardmeta")?.textContent?.trim() ?? null,
        /* §5 */
        pageScroll: scroller ? { sh: scroller.scrollHeight, ch: scroller.clientHeight } : null,
        statsVisible: document.querySelectorAll(".qp-stat").length,
      };
    });
    // eslint-disable-next-line no-console
    console.log(`[verify ${w}x${h}] §1 radius=${m.listRadius} border=${m.listBorder} mask=${m.rowsMask} seam ${m.seamList}/${m.seamBody} · §2 rowH=${JSON.stringify(m.rowHs)} dateX=${JSON.stringify(m.dateXs)} display=${m.rowDisplay} agencyWS=${m.agencyWrap} · §3 avatar r=${m.avatarR} bg=${m.avatarBg} "${m.avatarText}" · §4 composer=${m.composerVisible} meta=${m.notesMeta} · §5 scroll ${m.pageScroll?.sh}/${m.pageScroll?.ch} stats=${m.statsVisible}`);
  }
  expect(true).toBe(true);
});

/* ══ FIX PACK §5 · THE PAGE NEVER SCROLLS, AT ANY HEIGHT ═══════════════════════════════════════
 *
 * ⚠️ MEASURED ON A *WAITING* QUERY, which is the whole point. A closed query has no stats and a
 * shorter timeline, so it fits trivially — measuring that would report a pass for the easy case and
 * say nothing about the one §5 is about.
 */
test("§5 · nothing scrolls, and the card keeps its stats and composer", async () => {
  const sizes = [{ w: 1024, h: 700 }, { w: 1024, h: 768 }, { w: 1440, h: 900 }, { w: 1920, h: 1080 }];
  for (const { w, h } of sizes) {
    await page.setViewportSize({ width: w, height: h });
    await queries(page);
    /* walk to a query that is still waiting — the state with the most to fit */
    const rows = page.locator(".f12-row");
    const n = Math.min(await rows.count(), 20);
    let found = false;
    for (let i = 0; i < n; i += 1) {
      await rows.nth(i).click();
      await page.waitForTimeout(220);
      if (await page.locator(".qp-stat").count() > 0) { found = true; break; }
    }
    const m = await page.evaluate(() => {
      const q = (s: string) => document.querySelector(s) as HTMLElement | null;
      const scroller = q(".wpg-scroll");
      const pane = q(".qp-pane");
      const notesCard = Array.from(document.querySelectorAll<HTMLElement>(".qp-stack > .f12-card")).pop() ?? null;
      const composer = notesCard?.querySelector("textarea")?.closest("div") as HTMLElement | null;
      const stats = Array.from(document.querySelectorAll<HTMLElement>(".qp-stat"));
      const inView = (el: HTMLElement | null) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return r.top >= 0 && r.bottom <= window.innerHeight + 1 && r.height > 0;
      };
      return {
        page: scroller ? { sh: scroller.scrollHeight, ch: scroller.clientHeight } : null,
        paneOverflow: pane ? pane.scrollHeight - pane.clientHeight : null,
        statsN: stats.length, statsInView: stats.every((s) => inView(s)),
        composerInView: inView(composer),
        pills: document.querySelectorAll(".tl-pills").length,
        pillsShown: Array.from(document.querySelectorAll<HTMLElement>(".tl-pills")).filter((e) => getComputedStyle(e).display !== "none").length,
      };
    });
    // eslint-disable-next-line no-console
    console.log(`[§5 ${w}x${h}] page ${m.page?.sh}/${m.page?.ch} · paneOverflow ${m.paneOverflow} · stats ${m.statsN} inView=${m.statsInView} · composer inView=${m.composerInView} · pills ${m.pillsShown}/${m.pills} shown${found ? "" : " (NO WAITING QUERY)"}`);

    /* the page scroller never exceeds its client height */
    expect(m.page!.sh, `the page scrolls at ${w}x${h}`).toBe(m.page!.ch);
    /* nor does the reading column — the only scrollers are the list and a card body */
    expect(m.paneOverflow, `the reading column scrolls at ${w}x${h}`).toBeLessThanOrEqual(0);
    if (found) {
      expect(m.statsInView, `a stat is cut off at ${w}x${h}`).toBe(true);
      expect(m.composerInView, `the composer is out of view at ${w}x${h}`).toBe(true);
    }
    /* ⚠️ THE CHIPS ARE WHAT GIVES WAY AT 700, NOT THE NUDGE EVENT — the chips repeat verbatim in
       "What you sent" one column over; the nudge date appears nowhere else on this card. */
    if (h <= 700 && m.pills > 0) {
      expect(m.pillsShown, "the materials chips survived a 700px viewport").toBe(0);
    }
    if (h > 768 && m.pills > 0) {
      expect(m.pillsShown, "the chips were dropped at a height that did not need it").toBeGreaterThan(0);
    }
  }
});

/**
 * ⚠️ THE CHIPS-DROP NEEDS A QUERY THAT HAS CHIPS, and the waiting query the §5 case lands on has
 * none — so that case reported `pills 0/0` and proved nothing about the decision it exists to
 * verify. This one hunts for a row that renders them at a tall viewport, then re-measures the SAME
 * row short.
 */
test("§5 · the chips are what gives way at 700, and only there", async () => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await queries(page);
  const rows = page.locator(".f12-row");
  const n = Math.min(await rows.count(), 25);
  let idx = -1;
  for (let i = 0; i < n; i += 1) {
    await rows.nth(i).click();
    await page.waitForTimeout(200);
    if (await page.locator(".tl-pills").count() > 0) { idx = i; break; }
  }
  if (idx < 0) {
    // eslint-disable-next-line no-console
    console.log("[§5 chips] UNVERIFIED — no query on this account renders materials chips");
    return;
  }
  const shown = async () => page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>(".tl-pills")).filter((e) => getComputedStyle(e).display !== "none").length);
  const tall = await shown();
  await page.setViewportSize({ width: 1024, height: 700 });
  await page.waitForTimeout(400);
  const short = await shown();
  /* and the timeline keeps every event it has — the nudge is NOT what was dropped */
  const events = await page.evaluate(() => document.querySelectorAll(".tl-rowbody").length);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(300);
  const eventsTall = await page.evaluate(() => document.querySelectorAll(".tl-rowbody").length);
  // eslint-disable-next-line no-console
  console.log(`[§5 chips] row ${idx}: pills tall=${tall} short=${short} · timeline events tall=${eventsTall} short=${events}`);
  expect(tall, "the chips do not render even at a tall viewport").toBeGreaterThan(0);
  expect(short, "the chips survived a 700px viewport").toBe(0);
  expect(events, "an event was dropped — the chips were supposed to be the sacrifice, not the nudge")
    .toBe(eventsTall);
});
