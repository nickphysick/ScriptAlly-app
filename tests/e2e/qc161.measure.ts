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
import { mkdirSync, writeFileSync } from "node:fs";
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
  const c = page.locator(`${PAGE} [data-qc154='card'][data-id='${id}']`);
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
    await page.locator(C("[data-qc1522='save']")).click();
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
    await page.locator(C("[data-qc1522='save']")).click();
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
    await page.locator(C("[data-qc1522='save']")).click();
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
    await page.locator(C("[data-qc1522='save']")).click();
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
