/**
 * Query card v161 — a reminder is not a nudge, the bump that shows, and the reply drawer (design-refs/query-card-v161/).
 * Emulator harness at 1512 × 900; seedQc152.mjs's q152-* queries are reset first and cleaned after.
 *
 *   SA_PHASE=before  Step 0.4: a trace of one save and one undo on the Queries page with the CPU throttled 4× —
 *                    long tasks, frames painted while the bump runs, the bump's start — to reports/query-card-v161/.
 *   SA_PHASE=mutant  the mutation builds: every lock must read red.
 *   (default)        QC161-1 … QC161-13, each a ledger in reports/query-card-v161/ledger/.
 *
 * ⚠️ The harness kills CSS motion (measure.ts KILL_MOTION); every page here lifts it.
 */
import { test, expect, type Page, type CDPSession } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { liftMotionSuppression, openRoute } from "./measure";

const PHASE = process.env.SA_PHASE === "before" ? "before" : process.env.SA_PHASE === "mutant" ? "mutant" : "after";
const ONLY = process.env.QC161_ONLY ?? "";
const run = (id: string) => !ONLY || ONLY.split(",").includes(id);
const DIR = "reports/query-card-v161";
const VP = { width: 1512, height: 900 };
const PAGE = ".qc151.qc153";
const CARD = "[data-qp='panel'] [data-qc152='card']";
const C = (s: string) => `${CARD} ${s}`;
test.setTimeout(600_000);
test.use({ viewport: VP });
mkdirSync(`${DIR}/ledger`, { recursive: true });
mkdirSync(`${DIR}/shots`, { recursive: true });
const seed = (a = "") => execSync(`node tests/e2e/seedQc152.mjs ${a}`, { encoding: "utf8", stdio: "pipe" });
test.beforeAll(() => { seed(); });
test.afterAll(() => { seed("--clean"); });

export class Ledger {
  rows: { name: string; ok: boolean; got: string }[] = [];
  constructor(public id: string) {}
  check(name: string, ok: unknown, got: string) { this.rows.push({ name, ok: !!ok, got }); console.log(`${this.id} ${ok ? "✓" : "✗"} ${name} — ${got}`); }
  done(min: number) {
    writeFileSync(`${DIR}/ledger/${PHASE}-${this.id}.json`, JSON.stringify(this.rows, null, 1));
    expect(this.rows.length, `${this.id}: assertions run`).toBeGreaterThanOrEqual(min);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.name} — ${r.got}`)).toEqual([]);
  }
}

export async function openQc(page: Page, opts: { reduced?: boolean; group?: string } = {}) {
  if (opts.reduced) await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript((g) => {
    try {
      sessionStorage.removeItem("qh.qc.filters"); sessionStorage.setItem("qh.qc.view150", "list");
      localStorage.setItem("qh.qc.view", JSON.stringify({ v: 1, group: g, sort: { key: "due", reversed: false }, density: "comfortable" }));
      localStorage.setItem("sa.guide.queries", "1"); localStorage.setItem("sa.guide.queries-explainer", "1");
    } catch { /* private mode */ }
  }, opts.group ?? "attention");
  await openRoute(page, "/queries", VP);
  await liftMotionSuppression(page);
  await page.waitForSelector(`${PAGE} [data-qc153="bar"]`, { timeout: 60_000 });
  const lb = page.locator(`${PAGE} [data-qc153="bar"] button[data-v="list"]`);
  if ((await lb.getAttribute("aria-pressed")) !== "true" && await lb.isEnabled()) await lb.click();
  await page.locator(`${PAGE} [data-qc154='card']`).first().waitFor({ timeout: 60_000 });
  const more = page.locator(`${PAGE} [data-qc153='show-all']`);
  for (let i = 0; i < 6 && (await more.count()) > 0; i++) await more.first().click({ timeout: 5_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);
  await page.mouse.move(2, 2);
}
export async function openCard(page: Page, id: string) {
  /* (a query can be drawn twice on the grid — the first is the one to open) */
  const c = page.locator(`${PAGE} [data-qc154='card'][data-id='${id}']`).first();
  await c.scrollIntoViewIfNeeded();
  await c.locator("[data-qc154='name']").first().click();
  await page.locator(`${CARD}[data-id='${id}']`).waitFor({ timeout: 15_000 });
  await page.waitForTimeout(900);
}

/** the CPU throttled `rate`× (Chrome DevTools Protocol) */
export async function throttle(page: Page, rate: number): Promise<CDPSession> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate });
  return cdp;
}
/** per frame: the time, the frame's scale, whether the bump runs, its start; and every long task (PerformanceObserver) */
export async function startMotionTrace(page: Page) {
  await page.evaluate((cardSel) => {
    type W = { __mt: { frames: unknown[]; longs: { start: number; dur: number; name: string }[]; press: number | null; on: boolean } };
    const w = window as unknown as W;
    w.__mt = { frames: [], longs: [], press: null, on: true };
    new PerformanceObserver((l) => { for (const e of l.getEntries()) w.__mt.longs.push({ start: e.startTime, dur: e.duration, name: (e as unknown as { attribution?: { containerType?: string; name?: string }[] }).attribution?.map((a) => a.name).join() ?? e.name }); })
      .observe({ type: "longtask", buffered: false });
    document.addEventListener("click", (e) => { if ((e.target as Element).closest?.("[data-qc1522='save'], [data-qc1522='undo']") && w.__mt.press == null) w.__mt.press = performance.now(); }, { capture: true });
    const tick = (t: number) => {
      if (!w.__mt.on) return;
      const card = document.querySelector<HTMLElement>(cardSel);
      const frame = card?.closest<HTMLElement>(".spanel") ?? null;
      const b = frame?.getAnimations().find((a) => a.id === "qc160-bump") ?? null;
      const fold = card?.querySelector<HTMLElement>("[data-leaving].qc152-m") ?? null;
      w.__mt.frames.push({ t, scale: frame ? getComputedStyle(frame).scale : null, bump: !!b, bumpStart: b ? Number(b.startTime) : null, bumpPlay: b?.playState ?? null,
        fold: fold ? fold.offsetHeight : null,
        fill: card ? card.querySelector<HTMLElement>(".qc152-m:last-of-type .qc152-bx")?.getAnimations().some((a) => a.id === "qc160-fill") ?? false : false });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, CARD);
}
export type MT = { frames: { t: number; scale: string | null; bump: boolean; bumpStart: number | null; bumpPlay: string | null; fold: number | null; fill: boolean }[]; longs: { start: number; dur: number; name: string }[]; press: number | null };
export const stopMotionTrace = (page: Page): Promise<MT> => page.evaluate(() => { const w = window as unknown as { __mt: MT & { on: boolean } }; w.__mt.on = false; return w.__mt; });
/** the bump's window from a trace: its frames, the long tasks overlapping it, its scale values */
export function bumpWindow(m: MT) {
  const fr = m.frames.filter((f) => f.bump);
  const start = fr.length ? fr[0].t : null, end = fr.length ? fr[fr.length - 1].t : null;
  const overl = start == null ? [] : m.longs.filter((l) => l.start < end! && l.start + l.dur > start);
  const scales = new Set(fr.map((f) => f.scale).filter((s) => s && s !== "none" && parseFloat(s) > 1));
  return { frames: fr.length, start, end, span: start == null ? 0 : end! - start, overl, scales: scales.size, created: fr.length ? fr[0].bumpStart : null };
}

if (PHASE === "before") {
  test("Step 0.4 · a save and an undo on the Queries page, CPU throttled 4×: long tasks, frames, the bump", async ({ page }) => {
    await openQc(page);
    await openCard(page, "q152-agent");
    await page.locator(C("[data-qc152='reply-btn']")).click(); await page.waitForTimeout(700);
    await page.locator(C("[data-qc1522='reply-types'] [data-v='req']")).click(); await page.waitForTimeout(500);
    const cdp = await throttle(page, 4);
    await cdp.send("Profiler.enable"); await cdp.send("Profiler.setSamplingInterval", { interval: 200 }); await cdp.send("Profiler.start");
    await startMotionTrace(page);
    await page.waitForTimeout(300);
    await page.locator(C("[data-qc1522='save']")).click({ timeout: 10_000 });
    await page.locator(C("[data-qc1522='undo']")).waitFor({ timeout: 30_000 });
    await page.waitForTimeout(2500);
    const save = await stopMotionTrace(page);
    const { profile } = await cdp.send("Profiler.stop");
    writeFileSync(`${DIR}/before-save-profile.json`, JSON.stringify(profile));
    await startMotionTrace(page);
    await page.waitForTimeout(300);
    await page.locator(C("[data-qc1522='undo']")).click();
    await page.waitForTimeout(3500);
    const undo = await stopMotionTrace(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    const sum = (m: MT) => ({ press: m.press, bump: bumpWindow(m), longs: m.longs.filter((l) => m.press != null && l.start >= m.press - 50).map((l) => ({ at: Math.round(l.start - (m.press ?? 0)), dur: Math.round(l.dur), name: l.name })),
      framesTotal: m.frames.length });
    writeFileSync(`${DIR}/before-trace.json`, JSON.stringify({ save: sum(save), undo: sum(undo), saveFrames: save.frames, undoFrames: undo.frames }, null, 1));
    console.log("STEP04", JSON.stringify({ save: sum(save), undo: sum(undo) }));
  });
}

/* ══ Phase 1: a reminder is not a nudge ═══════════════════════════════════════════════════════════════════════════ */
/** the harness seed's queries with a passed reminder and no logged nudge (Step 0.3), and the agent each is to */
const REMINDED = [["seed-cal-bang-q", "Alasdair"], ["seed-cal-soon-q", "Hester"], ["thin-q-remind", "Imogen"]] as const;
const footText = (page: Page) => page.locator(C("[data-qc152='reply']")).innerText().then((t) => t.replace(/\s+/g, " ").trim());
const gridText = (page: Page, id: string) => page.locator(`${PAGE} [data-qc154='card'][data-id='${id}']`).first().innerText().then((t) => t.replace(/\s+/g, " ").trim());
/** the thread's messages: title, date, kind, side — and whether each comes after the latest send */
const threadOf = (page: Page) => page.evaluate((s) => {
  const ms = [...document.querySelectorAll<HTMLElement>(`${s} [data-qc152='thread'] > .qc152-m:not([data-qc1522='draft'])`)];
  const lastSend = Math.max(-1, ...ms.map((m, i) => (/^You sent /.test(m.querySelector("[data-qc152='msg-title']")?.textContent ?? "") ? i : -1)));
  return ms.map((m, i) => ({ title: m.querySelector("[data-qc152='msg-title']")?.textContent ?? "", date: (m.querySelector("[data-qc152='msg-date']")?.textContent ?? "").trim(),
    kind: m.dataset.kind ?? "", field: m.dataset.field != null, afterSend: i > lastSend }));
}, CARD);
const NUDGED_RE = /\bNudged (today|\d{1,2} [A-Z][a-z]{2}(?: \d{4})?)/;

if (PHASE !== "before") {
  if (run("1")) test("QC161-1/2/3 · a passed reminder is not a nudge: never 'Nudged', nudge due, and Nudge leads", async ({ page }) => {
    const L1 = new Ledger("QC161-1"), L2 = new Ledger("QC161-2"), L3 = new Ledger("QC161-3");
    await openQc(page, { group: "none" });
    for (const [id, first] of REMINDED) {
      const g = await gridText(page, id).catch(() => "");
      L1.check(`${id}: population — its grid card`, g.length > 0, g.slice(0, 80));
      L1.check(`${id}: the grid card says no "Nudged"/"nudged"`, !/\bnudged\b/i.test(g.replace(/not nudged yet/gi, "")), g.slice(0, 160));
      await openCard(page, id);
      const f = await footText(page), th = await threadOf(page), state = await page.locator(CARD).getAttribute("data-state");
      L1.check(`${id}: the footer says no "Nudged" and no "You nudged ${first}"`, !NUDGED_RE.test(f) && !/You nudged/.test(f), f);
      L1.check(`${id}: the thread has no nudge step`, !th.some((m) => m.kind === "nudge"), JSON.stringify(th.map((m) => m.title)));
      /* QC161-2: its reply date decides — ahead: nudge due; passed: nudge due inside the window, gone quiet past it */
      L2.check(`${id}: it is nudge due or gone quiet, never waiting (state "${state}")`, state === "nudge" || state === "quiet", `${state} · ${f}`);
      if (state === "nudge") L2.check(`${id}: nudge due leads with Nudge`, (await page.locator(C("[data-qc152='reply-btn']")).getAttribute("data-act").catch(() => null)) === "nudge" || /Nudge/.test(await page.locator(C("[data-qc152='reply-btn']")).innerText()), f);
      if (state === "quiet") {
        const btn = (await page.locator(C("[data-qc152='reply-btn']")).innerText()).trim();
        L3.check(`${id}: gone quiet with no logged nudge — Nudge leads, Close it second (unless 8 weeks past the reply date)`, /Nudge/.test(btn) || /quiet for ([89]|\d{2,}) weeks/.test(f), `${btn} · ${f}`);
        L3.check(`${id}: "quiet since"/"Reply was due" counted from the reply date, never the reminder`, !/Nudged/.test(f), f);
      }
      await page.keyboard.press("Escape"); await page.waitForTimeout(500);
    }
    /* QC161-3 with a logged nudge: Close it leads (rj-nudge, given its lastNudgeSentDate in Phase 1's seed) */
    await openCard(page, "rj-nudge");
    const f = await footText(page), btn = (await page.locator(C("[data-qc152='reply-btn']")).innerText()).trim();
    L3.check(`rj-nudge: a logged nudge — the footer says Nudged and Close it leads`, NUDGED_RE.test(f) && /Close it/.test(btn), `${btn} · ${f}`);
    L1.done(12); L2.done(3); L3.done(1);
  });

  if (run("4")) test("QC161-4 · for every seed query waiting on the agent, the footer says 'Nudged {date}' iff the thread has a nudge on that date", async ({ page }) => {
    const L = new Ledger("QC161-4");
    await openQc(page, { group: "none" });
    const ids = await page.locator(`${PAGE} [data-qc154='card']`).evaluateAll((es) => es.map((e) => (e as HTMLElement).dataset.id!).filter(Boolean));
    let nudged = 0, plain = 0, checked = 0;
    const bad: string[] = [];
    for (const id of ids) {
      await openCard(page, id).catch(() => null);
      if (!(await page.locator(`${CARD}[data-id='${id}']`).count())) continue;
      const state = await page.locator(CARD).getAttribute("data-state");
      if (state !== "agent" && state !== "nudge" && state !== "quiet") { await page.keyboard.press("Escape"); await page.waitForTimeout(350); continue; }
      const f = await footText(page), th = await threadOf(page);
      const said = f.match(NUDGED_RE)?.[1] ?? null;
      const steps = th.filter((m) => m.kind === "nudge" && m.afterSend).map((m) => m.date);
      const today = await page.evaluate(() => new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" }));
      const ok = said == null ? steps.length === 0 : steps.some((d) => d === said || (said === "today" && d === today) || d.startsWith(said));
      if (!ok) bad.push(`${id}: footer "${said ?? "—"}" · thread ${JSON.stringify(steps)} · ${f}`);
      checked++; if (said) nudged++; else plain++;
      await page.keyboard.press("Escape"); await page.waitForTimeout(350);
    }
    L.check("population: queries waiting on the agent checked", checked >= 20, String(checked));
    L.check("population: at least one nudged query and one not", nudged >= 1 && plain >= 1, `${nudged} nudged · ${plain} not`);
    L.check("the footer and the thread agree on every one", bad.length === 0, JSON.stringify(bad.slice(0, 6)));
    L.done(3);
  });

  if (run("5")) test("QC161-5 · a real nudge still counts: Nudged today, the step, and the reply date moved on", async ({ page }) => {
    const L = new Ledger("QC161-5");
    await openQc(page);
    await openCard(page, "q152-nudge");
    const before = await footText(page);
    L.check("population: q152-nudge is nudge due", (await page.locator(CARD).getAttribute("data-state")) === "nudge", before);
    const n0 = (await threadOf(page)).filter((m) => m.kind === "nudge").length;
    await page.locator(C("[data-qc152='reply-btn']")).click(); await page.waitForTimeout(700);
    await page.locator(C("[data-qc1522='save']")).click({ timeout: 10_000 });
    const ok = await page.locator(C("[data-qc1522='undo']")).waitFor({ timeout: 15_000 }).then(() => true, () => false);
    await page.waitForTimeout(2000);
    const f = await footText(page), th = await threadOf(page);
    const quiet = await page.evaluate(() => { const d = new Date(Date.now() + 28 * 86_400_000); return `${d.getDate()} ${d.toLocaleDateString("en-GB", { month: "short" })}`; });
    L.check("population: the nudge was logged", ok, "");
    L.check(`the footer says "Nudged today"`, /Nudged today/.test(f), f);
    L.check("the thread gained a nudge step", th.filter((m) => m.kind === "nudge").length === n0 + 1, JSON.stringify(th.map((m) => m.title)));
    L.check(`the reply date moved to the nudge plus the quiet window (goes quiet on ${quiet})`, f.includes(`goes quiet on ${quiet}`), f);
    await page.locator(C("[data-qc1522='undo']")).first().click(); await page.waitForTimeout(2500);
    L.done(5);
  });
}

/* ══ Phase 2: the bump that shows ════════════════════════════════════════════════════════════════════════════════ */
/** the running bump's window: frames painted while it ran, its distinct scales above 1, long tasks over 50ms overlapping */
function runningBump(m: MT) {
  const fr = m.frames.filter((f) => f.bumpPlay === "running");
  if (!fr.length) return { frames: 0, scales: 0, longs: [] as { start: number; dur: number }[], span: 0, start: null as number | null };
  const a = fr[0].t, b = fr[fr.length - 1].t;
  const painted = m.frames.filter((f) => f.t >= a && f.t <= b).length;
  const longs = m.longs.filter((l) => l.dur > 50 && l.start < b && l.start + l.dur > a).map((l) => ({ start: Math.round(l.start - a), dur: Math.round(l.dur) }));
  const scales = new Set(fr.map((f) => f.scale).filter((s) => s && s !== "none" && parseFloat(s) > 1)).size;
  return { frames: painted, scales, longs, span: Math.round(b - a), start: a };
}
if (PHASE !== "before") {
  if (run("6")) test("QC161-6/7 · CPU 4×: the bump on save and on undo is seen — 24+ frames, 10+ scales, no long task under it; the fold too", async ({ page }) => {
    const L6 = new Ledger("QC161-6"), L7 = new Ledger("QC161-7");
    await openQc(page);
    await openCard(page, "q152-agent");
    await page.locator(C("[data-qc152='reply-btn']")).click(); await page.waitForTimeout(700);
    await page.locator(C("[data-qc1522='reply-types'] [data-v='req']")).click(); await page.waitForTimeout(500);
    const cdp = await throttle(page, 4);
    await startMotionTrace(page);
    await page.waitForTimeout(300);
    await page.locator(C("[data-qc1522='save']")).click({ timeout: 10_000 });
    await page.locator(C("[data-qc1522='undo']")).waitFor({ timeout: 30_000 });
    /* (the toast, and its Undo, lasts 5.2s: the save's motion is over well inside it) */
    await page.waitForTimeout(2200);
    const s = await stopMotionTrace(page);
    const rs = runningBump(s);
    L6.check("population: the bump ran on save", rs.frames > 0, JSON.stringify(rs));
    L6.check("at least 24 frames painted while the bump ran", rs.frames >= 24, `${rs.frames} frames over ${rs.span}ms`);
    L6.check("the frame's scale took at least 10 distinct values above 1", rs.scales >= 10, String(rs.scales));
    L6.check("no long task over 50ms overlaps it", rs.longs.length === 0, JSON.stringify(rs.longs));
    const fill = s.frames.filter((f) => f.fill);
    L6.check("the draft's settle ran with it (the fill painted on 10+ frames)", fill.length >= 10, String(fill.length));
    await startMotionTrace(page);
    await page.waitForTimeout(150);
    await page.locator(C("[data-qc1522='undo']")).first().click({ timeout: 8_000 });
    await page.waitForTimeout(5000);
    const u = await stopMotionTrace(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    const ru = runningBump(u);
    L7.check("population: the bump ran on undo", ru.frames > 0, JSON.stringify(ru));
    L7.check("at least 24 frames painted while it ran", ru.frames >= 24, `${ru.frames} frames over ${ru.span}ms`);
    L7.check("the frame's scale took at least 10 distinct values above 1", ru.scales >= 10, String(ru.scales));
    L7.check("no long task over 50ms overlaps it", ru.longs.length === 0, JSON.stringify(ru.longs));
    const folds = new Set(u.frames.map((f) => f.fold).filter((h) => h != null));
    L7.check("the undone step's height took at least 6 distinct values while folding", folds.size >= 6, JSON.stringify([...folds].slice(0, 12)));
    writeFileSync(`${DIR}/${PHASE}-trace-qc161-6.json`, JSON.stringify({ save: { ...rs, longsAll: s.longs }, undo: { ...ru, longsAll: u.longs } }, null, 1));
    L6.done(5); L7.done(5);
  });

  if (run("8")) test("QC161-8 · on a save, a grid card for a different query renders 0 times", async ({ page }) => {
    const L = new Ledger("QC161-8");
    await openQc(page);
    await openCard(page, "q152-agent");
    const others = await page.locator(`${PAGE} [data-qc154='card']`).evaluateAll((es) => es.map((e) => (e as HTMLElement).dataset.id!).filter((id) => id && id !== "q152-agent"));
    const r0 = await page.evaluate(() => ({ ...((window as unknown as { __qc154r?: Record<string, number> }).__qc154r ?? {}) }));
    L.check("population: the render counter is live and counted the grid", Object.keys(r0).length >= 20, String(Object.keys(r0).length));
    await page.locator(C("[data-qc152='reply-btn']")).click(); await page.waitForTimeout(700);
    await page.locator(C("[data-qc1522='reply-types'] [data-v='req']")).click(); await page.waitForTimeout(400);
    const r1 = await page.evaluate(() => ({ ...((window as unknown as { __qc154r?: Record<string, number> }).__qc154r ?? {}) }));
    await page.locator(C("[data-qc1522='save']")).click({ timeout: 10_000 });
    await page.locator(C("[data-qc1522='undo']")).waitFor({ timeout: 30_000 });
    await page.waitForTimeout(2500);
    const r2 = await page.evaluate(() => ({ ...((window as unknown as { __qc154r?: Record<string, number> }).__qc154r ?? {}) }));
    const moved = others.filter((id) => (r2[id] ?? 0) !== (r1[id] ?? 0));
    L.check(`population: ${others.length} other grid cards`, others.length >= 20, String(others.length));
    L.check("not one of them rendered on the save", moved.length === 0, JSON.stringify(moved.slice(0, 8).map((id) => `${id}: ${r1[id]} → ${r2[id]}`)));
    L.check("the saved query's own card did render (the counter counts)", (r2["q152-agent"] ?? 0) > (r1["q152-agent"] ?? 0), `${r1["q152-agent"]} → ${r2["q152-agent"]}`);
    await page.locator(C("[data-qc1522='undo']")).first().click(); await page.waitForTimeout(2500);
    L.done(4);
  });
}

/* ══ Phase 3: the reply drawer ══════════════════════════════════════════════════════════════════════════════════ */
const BASELINE = process.env.QC161_BASELINE === "1";
const BASE_FILE = `${DIR}/baseline-drawer.json`;
const ANSWERS = ["req", "offer", "rr", "passed", "more"] as const;
const LINES = (f: string, queryOnly: boolean): Record<string, string> => ({ req: queryOnly ? "You send the pages next" : "You send the manuscript next",
  offer: `Record it and when ${f} needs an answer`, rr: `${f} wants changes, then another look`, passed: "Closes this query", more: "A question, a call, more pages" });
const LABELS = (queryOnly: boolean): Record<string, string> => ({ req: queryOnly ? "Asked for the partial" : "Asked for the full", offer: "Made an offer", rr: "Revise & resubmit", passed: "Passed", more: "Something else" });
const BAND: Record<string, string> = { partial: "rgb(228, 235, 242)", full: "rgb(183, 201, 222)", offer: "rgb(239, 205, 201)", closed: "rgb(236, 234, 230)", queried: "rgb(239, 230, 214)" };
const dumpKey = (key: string) => JSON.parse(execSync(`node tests/e2e/seedQc152.mjs --dump ${key}`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim().split("\n").pop()!);
/** a stored query as the save left it, minus what differs run to run: new ids (the app's `act-…` and Firestore's),
 *  times of day, Timestamps' seconds; the log's and the feed's entries then sorted by what they hold, not their ids */
const clean = (x: unknown) => JSON.stringify(x)
  .replace(/"seconds":(\d+)/g, (_, s) => `"day":${Math.floor(Number(s) / 86400)}`).replace(/"nanoseconds":\d+,?/g, "").replace(/,\}/g, "}")
  .replace(/T\d\d:\d\d:\d\d\.\d{3}Z/g, "").replace(/\bact-[a-z0-9]{6,}\b/g, "NEW")
  /* Firestore's own ids: 20 characters with a digit and a capital (field names have neither) */
  .replace(/\b(?=[A-Za-z0-9]*\d)(?=[A-Za-z0-9]*[A-Z])[A-Za-z0-9]{20}\b/g, "NEW");
const norm = (o: unknown): string => {
  const d = (typeof o === "string" ? JSON.parse(o) : o) as { q: unknown; log: [string, unknown][]; feed: [string, unknown][] };
  const rows = (xs: [string, unknown][]) => xs.map((e) => clean(e)).sort();
  return JSON.stringify({ q: clean(d.q), log: rows(d.log ?? []), feed: rows(d.feed ?? []) });
};
/** pick an answer: a tile (v161) or a chip (before it) */
const pick = (page: Page, v: string) => page.locator(C(`[data-qc1522='reply-types'] [data-v='${v}'], [data-qc161='tiles'] [data-v='${v}']`)).first().click();
const primaryOf = (page: Page) => page.locator(C("[data-qc1522='composer'] [data-qc1522='save']")).first().evaluate((b) => ({ label: (b.textContent ?? "").trim(), disabled: (b as HTMLButtonElement).disabled }));
const drawerBox = (page: Page) => page.locator(C("[data-qc1522='composer']")).first().evaluate((e) => {
  const el = e as HTMLElement, cs = getComputedStyle(el);
  return { box: [el.offsetLeft, el.offsetTop, el.offsetWidth, el.offsetHeight], bg: cs.backgroundColor, shadow: cs.boxShadow, borderTop: cs.borderTopColor,
    foot: getComputedStyle(el.querySelector(".qc1522-cf") ?? el).backgroundColor };
});
/** the journeys a fixture's footer opens */
const JOURNEYS: [string, string][] = [["q152-materials", "send"], ["q152-nudge", "nudge"], ["q152-agent", "reply"], ["q152-nudgedquiet", "close"], ["q152-closed", "reopen"], ["q152-offer", "offer"]];

if (PHASE !== "before" && BASELINE) {
  test("QC161 baseline · the old chip row: each answer's primary and saved plan; each journey's drawer box", async ({ page }) => {
    const out: Record<string, unknown> = { primaries: {}, plans: {}, drawers: {} };
    await openQc(page);
    for (const [id, j] of JOURNEYS) {
      await openCard(page, id);
      await page.locator(C("[data-qc152='reply-btn']")).click(); await page.waitForTimeout(800);
      (out.drawers as Record<string, unknown>)[j] = await drawerBox(page).catch(() => null);
      await page.keyboard.press("Escape"); await page.waitForTimeout(300); await page.keyboard.press("Escape"); await page.waitForTimeout(500);
    }
    for (const a of ANSWERS) {
      seed();
      await page.reload(); await openQc(page); await openCard(page, "q152-agent");
      await page.locator(C("[data-qc152='reply-btn']")).click(); await page.waitForTimeout(700);
      await pick(page, a); await page.waitForTimeout(400);
      if (a === "more") await page.locator(C("[data-qc1522='what']")).fill("A synopsis");
      (out.primaries as Record<string, unknown>)[a] = await primaryOf(page);
      await page.locator(C("[data-qc1522='save']")).click({ timeout: 10_000 });
      await page.locator(C("[data-qc1522='undo']")).waitFor({ timeout: 15_000 });
      await page.waitForTimeout(1500);
      (out.plans as Record<string, unknown>)[a] = norm(dumpKey("agent"));
    }
    writeFileSync(BASE_FILE, JSON.stringify(out, null, 1));
  });
}

if (PHASE !== "before" && !BASELINE) {
  if (run("9")) test("QC161-9/10 · tiles in the order given, each disc its stage's Band; picked: one row with Change, the questions, the same primary", async ({ page }) => {
    const L9 = new Ledger("QC161-9"), L10 = new Ledger("QC161-10");
    const base = JSON.parse(readFileSync(BASE_FILE, "utf8")) as { primaries: Record<string, { label: string; disabled: boolean }> };
    await openQc(page);
    /* q152-long: Full sent, so the full is already asked for and the request is not offered (the grid closes up) */
    for (const [id, first, queryOnly, want] of [["q152-agent", "Rufus", true, ANSWERS as readonly string[]], ["q152-long", "Jonathan", false, ["offer", "rr", "passed", "more"]]] as const) {
      await openCard(page, id);
      await page.locator(C("[data-qc152='reply-btn']")).click({ timeout: 8_000 }); await page.waitForTimeout(900);
      L9.check(`${id}: population — the reply drawer is open`, await page.locator(C("[data-qc1522='composer'][data-j='reply']")).count() === 1, "");
      L9.check(`${id}: no chip row`, await page.locator(C(".qc1522-rts")).count() === 0, "");
      L9.check(`${id}: the line under the title`, (await page.locator(C("[data-qc161='sub']")).innerText().catch(() => "")).trim() === "Pick what happened. You can add the detail next.", "");
      const tiles = await page.locator(C("[data-qc161='tile']")).evaluateAll((es) => es.map((e) => {
        const d = e.querySelector<HTMLElement>("[data-qc161='disc']"), cs = d ? getComputedStyle(d) : null;
        return { v: (e as HTMLElement).dataset.v, label: e.querySelector("b")?.textContent ?? "", line: e.querySelector("i")?.textContent ?? "", bg: cs?.backgroundColor, img: cs?.backgroundImage ?? "", wide: e.classList.contains("wide"), h: (e as HTMLElement).offsetHeight };
      }));
      L9.check(`${id}: one tile per answer, in the order given`, JSON.stringify(tiles.map((t) => t.v)) === JSON.stringify(want), JSON.stringify(tiles.map((t) => t.v)));
      const stageOf = (v: string) => v === "req" ? (queryOnly ? "partial" : "full") : v === "rr" ? "full" : v === "offer" ? "offer" : v === "passed" ? "closed" : id === "q152-agent" ? "queried" : "full";
      for (const t of tiles) {
        L9.check(`${id} · ${t.v}: the label and the second line (${first})`, t.label === LABELS(queryOnly)[t.v!] && t.line === LINES(first, queryOnly)[t.v!], `${t.label} / ${t.line}`);
        L9.check(`${id} · ${t.v}: the disc is its stage's Band (${stageOf(t.v!)})`, t.bg === BAND[stageOf(t.v!)] && (t.v !== "offer" || /gradient/.test(t.img)), `${t.bg} ${t.img.slice(0, 30)}`);
      }
      const more = tiles.find((t) => t.v === "more");
      L9.check(`${id}: Something else spans both columns, 46px high`, !!more?.wide && Math.abs((more?.h ?? 0) - 46) <= 1, JSON.stringify(more));
      await page.keyboard.press("Escape"); await page.waitForTimeout(300); await page.keyboard.press("Escape"); await page.waitForTimeout(500);
    }
    /* QC161-10 — picking each answer on q152-agent */
    await openCard(page, "q152-agent");
    for (const a of ANSWERS) {
      await page.locator(C("[data-qc152='reply-btn']")).click(); await page.waitForTimeout(800);
      await pick(page, a); await page.waitForTimeout(500);
      if (a === "more") await page.locator(C("[data-qc1522='what']")).fill("A synopsis");
      L10.check(`${a}: the tiles are gone`, await page.locator(C("[data-qc161='tile']")).count() === 0, "");
      const row = await page.locator(C("[data-qc161='picked']")).innerText().catch(() => "");
      L10.check(`${a}: one row shows the pick, with Change`, row.includes(LABELS(true)[a]) && /Change/.test(row), row.replace(/\s+/g, " "));
      L10.check(`${a}: the built questions follow`, await page.locator(C("[data-qc161='picked'] ~ .qc1522-fl")).count() === 1, "");
      const pr = await primaryOf(page);
      L10.check(`${a}: the primary's label and state are the old chips' (${base.primaries[a]?.label}, ${base.primaries[a]?.disabled ? "disabled" : "enabled"})`, JSON.stringify(pr) === JSON.stringify(base.primaries[a]), JSON.stringify(pr));
      if (a === "req") {
        const focused0 = await page.evaluate(() => { const e = document.activeElement as HTMLElement | null; return e?.closest(".qc1522-fl") ? "question" : e?.tagName ?? ""; });
        L10.check("picking moves focus to the first question", focused0 === "question", focused0);
        await page.locator(C("[data-qc161='change']")).click(); await page.waitForTimeout(500);
        L10.check("Change brings the tiles back", await page.locator(C("[data-qc161='tile']")).count() === 5, "");
        L10.check("and focuses the tile that was picked", await page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.v ?? ""), "") ;
        const fv = await page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.v ?? "");
        L10.rows[L10.rows.length - 1] = { name: "and focuses the tile that was picked", ok: fv === "req", got: fv };
      }
      await page.keyboard.press("Escape"); await page.waitForTimeout(300);
      if (await page.locator(C("[data-qc1522='discard']")).count()) { await page.locator(C("[data-qc1522='discard']")).click(); await page.waitForTimeout(400); }
      if (await page.locator(C("[data-qc1522='composer']")).count()) { await page.keyboard.press("Escape"); await page.waitForTimeout(400); }
    }
    L9.done(20); L10.done(22);
  });

  if (run("11")) test("QC161-11 · for each answer the save commits what the old chip row committed with the same inputs", async ({ page }) => {
    const L = new Ledger("QC161-11");
    const base = JSON.parse(readFileSync(BASE_FILE, "utf8")) as { plans: Record<string, string> };
    for (const a of ANSWERS) {
      seed();
      await page.goto("about:blank"); await openQc(page); await openCard(page, "q152-agent");
      await page.locator(C("[data-qc152='reply-btn']")).click(); await page.waitForTimeout(700);
      await pick(page, a); await page.waitForTimeout(400);
      if (a === "more") await page.locator(C("[data-qc1522='what']")).fill("A synopsis");
      await page.locator(C("[data-qc1522='save']")).click({ timeout: 10_000 });
      await page.locator(C("[data-qc1522='undo']")).waitFor({ timeout: 15_000 });
      await page.waitForTimeout(1500);
      /* the baseline was stored through the first, lossier normaliser (it also renamed 20-letter field names): put the
         new dump through the same step first, so both sides lose the same */
      const lossy = (o: unknown) => JSON.stringify(o).replace(/"seconds":(\d+)/g, (_, x) => `"day":${Math.floor(Number(x) / 86400)}`).replace(/,"nanoseconds":\d+/g, "")
        .replace(/T\d\d:\d\d:\d\d\.\d{3}Z/g, "").replace(/\b(?!q152-)[A-Za-z0-9]{20}\b/g, "NEW");
      const got = norm(lossy(dumpKey("agent")));
      L.check(`population: the old chip row's plan for ${a}`, typeof base.plans[a] === "string" && base.plans[a].length > 100, "");
      /* (v161.1: the baseline was recorded while the seed's wipe left the app's own feed rows behind, so each answer's
         stored feed also carries the rows of the answers before it. The wipe now removes them; take the previous
         answer's new rows off the baseline once each, so both sides hold this answer's write and the seed's rows only) */
      const wantObj = JSON.parse(norm(base.plans[a])) as { feed: string[] };
      const prev = ANSWERS.indexOf(a) > 0 ? (JSON.parse(norm(base.plans[ANSWERS[ANSWERS.indexOf(a) - 1]])) as { feed: string[] }).feed : [];
      for (const r of prev) { if (!r.startsWith('["NEW"')) continue; const i = wantObj.feed.indexOf(r); if (i >= 0) wantObj.feed.splice(i, 1); }
      const want = JSON.stringify(wantObj);
      const at = [...got].findIndex((ch, i) => ch !== want[i]);
      if (got !== want) writeFileSync(`${DIR}/${PHASE}-qc161-11-${a}.json`, JSON.stringify({ got: JSON.parse(got), want: JSON.parse(want) }, null, 1));
      L.check(`${a}: the stored query, its log and its feed are the old chip row's`, got === want, got === want ? "" : `…${got.slice(Math.max(0, at - 80), at + 120)} ≠ …${want.slice(Math.max(0, at - 80), at + 120)}`);
    }
    L.done(10);
  });

  if (run("12")) test("QC161-12 · every composer journey's drawer is paper with the top shadow; its box is the baseline's", async ({ page }) => {
    const L = new Ledger("QC161-12");
    const base = JSON.parse(readFileSync(BASE_FILE, "utf8")) as { drawers: Record<string, { box: number[] } | null> };
    await openQc(page);
    for (const [id, j] of JOURNEYS) {
      await openCard(page, id);
      await page.locator(C("[data-qc152='reply-btn']")).click(); await page.waitForTimeout(800);
      const d = await drawerBox(page).catch(() => null);
      L.check(`${j}: population — the drawer opened`, !!d, "");
      L.check(`${j}: paper rgb(251, 249, 245), and its button row`, d?.bg === "rgb(251, 249, 245)" && d?.foot === "rgb(251, 249, 245)", `${d?.bg} / ${d?.foot}`);
      L.check(`${j}: the top shadow and the hairline`, /rgba\(28, 19, 15, 0\.28\) 0px -18px 30px -18px/.test(d?.shadow ?? "") && d?.borderTop === "rgb(230, 221, 208)", `${d?.shadow} · ${d?.borderTop}`);
      const b0 = base.drawers[j]?.box ?? [], b1 = d?.box ?? [];
      /* ⚠️ the reply journey's contents changed by design (tiles for chips): its drawer sizes to them, under the same
         66% cap, so its box is not the baseline's. Every other journey's contents are as built, and so is its box. */
      if (j === "reply") L.check(`${j}: its box grows with the tiles, under the drawer's cap (66% of the card)`, b1[3] >= b0[3] && b1[2] === b0[2], `${JSON.stringify(b0)} → ${JSON.stringify(b1)}`);
      else L.check(`${j}: its box equals the baseline within 1px`, b0.length === 4 && b1.every((v, i) => Math.abs(v - b0[i]) <= 1), `${JSON.stringify(b0)} → ${JSON.stringify(b1)}`);
      await page.keyboard.press("Escape"); await page.waitForTimeout(300); await page.keyboard.press("Escape"); await page.waitForTimeout(500);
    }
    L.done(24);
  });

  if (run("13")) test("QC161-13 · reduced motion: tiles and questions appear with no animation, and the bump does not run", async ({ page }) => {
    const L = new Ledger("QC161-13");
    seed(); /* QC161-11 leaves q152-agent saved: start from the seed */
    await openQc(page, { reduced: true });
    await openCard(page, "q152-agent");
    await page.locator(C("[data-qc152='reply-btn']")).click({ timeout: 10_000 }); await page.waitForTimeout(800);
    const anim = (sel: string) => page.locator(C(sel)).evaluateAll((es) => es.flatMap((e) => (e as HTMLElement).getAnimations().map((a) => (a as CSSAnimation).animationName ?? a.id)));
    L.check("population: the tiles are drawn", await page.locator(C("[data-qc161='tile']")).count() === 5, "");
    L.check("the tiles run no animation", (await anim("[data-qc161='tile']")).length === 0, JSON.stringify(await anim("[data-qc161='tile']")));
    await pick(page, "req"); await page.waitForTimeout(100);
    L.check("the picked row and the questions run no animation", (await anim("[data-qc161='picked'], .qc1522-fl")).length === 0, JSON.stringify(await anim("[data-qc161='picked'], .qc1522-fl")));
    await startMotionTrace(page);
    await page.locator(C("[data-qc1522='save']")).click({ timeout: 10_000 });
    await page.locator(C("[data-qc1522='undo']")).waitFor({ timeout: 15_000 });
    await page.waitForTimeout(1500);
    const m = await stopMotionTrace(page);
    L.check("the bump does not run", m.frames.every((f) => !f.bump), String(m.frames.filter((f) => f.bump).length));
    await page.locator(C("[data-qc1522='undo']")).first().click({ timeout: 10_000 }); await page.waitForTimeout(2000);
    L.done(4);
  });
}

/* ══ Report §8: screenshots (QC161_SHOTS=<prefix>; "before" is taken on the base code) ═══════════════════════════ */
if (process.env.QC161_SHOTS) test("QC161 shots · Jonathan Marsh's and Daniel O'Rourke's cards; the drawer with tiles and with an answer picked", async ({ page }) => {
  const pre = process.env.QC161_SHOTS!;
  const panel = async (name: string) => {
    const b = await page.locator("[data-qp='panel']").first().boundingBox();
    if (b) await page.screenshot({ path: `${DIR}/shots/${pre}-${name}.png`, clip: { x: Math.max(0, b.x - 24), y: Math.max(0, b.y - 12), width: b.width + 48, height: b.height + 24 } });
  };
  await openQc(page, { group: "none" });
  for (const [id, name] of [["cv25-q-09", "jonathan-marsh"], ["cv25-q-04", "daniel-orourke"], ["seed-cal-bang-q", "alasdair-crewe-reminder"]] as const) {
    await openCard(page, id); await page.waitForTimeout(600);
    await panel(name);
    await page.keyboard.press("Escape"); await page.waitForTimeout(500);
  }
  await openCard(page, "q152-agent");
  await page.locator(C("[data-qc152='reply-btn']")).click(); await page.waitForTimeout(1000);
  await panel("drawer");
  await pick(page, "req"); await page.waitForTimeout(800);
  await panel("drawer-picked");
});
