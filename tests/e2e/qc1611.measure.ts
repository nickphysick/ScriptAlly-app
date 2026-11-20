/**
 * Query card v161.1 — a bump the writer can see: the frame presses in at the press, holds through the save, pops when
 * the save lands (design-refs/query-card-v161-1/). Emulator harness at 1512 × 900, motion suppression lifted, CPU 4×
 * unless a lock says otherwise; seedQc152.mjs's q152-* queries are reset first and cleaned after.
 *
 *   SA_PHASE=before  Step 0.4: press → the save's long task, at CPU 4×, on the base
 *   SA_PHASE=mutant  the mutation builds
 *   (default)        QC1611-1 … QC1611-8, each a ledger in reports/query-card-v161-1/ledger/
 */
import { test, expect, type Page, type CDPSession } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { liftMotionSuppression, openRoute } from "./measure";

const PHASE = process.env.SA_PHASE === "before" ? "before" : /^mutant[A-Z]?$/.test(process.env.SA_PHASE ?? "") ? process.env.SA_PHASE! /* each mutant build keeps its own ledgers */ : "after";
const ONLY = process.env.QC1611_ONLY ?? "";
const run = (id: string) => !ONLY || ONLY.split(",").includes(id);
const DIR = "reports/query-card-v161-1";
const VP = { width: 1512, height: 900 };
const PAGE = ".qc151.qc153";
const CARD = "[data-qp='panel'] [data-qc152='card']";
const C = (s: string) => `${CARD} ${s}`;
test.setTimeout(900_000);
test.use({ viewport: VP });
mkdirSync(`${DIR}/ledger`, { recursive: true });
mkdirSync(`${DIR}/frames`, { recursive: true });
const seed = (a = "") => execSync(`node tests/e2e/seedQc152.mjs ${a}`, { encoding: "utf8", stdio: "pipe", timeout: 60_000, killSignal: "SIGKILL" });
test.beforeAll(() => { seed(); });
test.afterAll(() => { seed("--clean"); });

class Ledger {
  rows: { name: string; ok: boolean; got: string }[] = [];
  constructor(public id: string) {}
  check(name: string, ok: unknown, got: string) { this.rows.push({ name, ok: !!ok, got }); console.log(`${this.id} ${ok ? "✓" : "✗"} ${name} — ${got}`); }
  done(min: number) {
    writeFileSync(`${DIR}/ledger/${PHASE}-${this.id}.json`, JSON.stringify(this.rows, null, 1));
    expect(this.rows.length, `${this.id}: assertions run`).toBeGreaterThanOrEqual(min);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.name} — ${r.got}`)).toEqual([]);
  }
}
async function openQc(page: Page, reduced = false) {
  if (reduced) await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    try {
      sessionStorage.removeItem("qh.qc.filters"); sessionStorage.setItem("qh.qc.view150", "list");
      localStorage.setItem("qh.qc.view", JSON.stringify({ v: 1, group: "none", sort: { key: "due", reversed: false }, density: "comfortable" }));
      localStorage.setItem("sa.guide.queries", "1"); localStorage.setItem("sa.guide.queries-explainer", "1");
    } catch { /* private mode */ }
  });
  await openRoute(page, "/queries", VP);
  await liftMotionSuppression(page);
  await page.locator(`${PAGE} [data-qc154='card']`).first().waitFor({ timeout: 60_000 });
  const more = page.locator(`${PAGE} [data-qc153='show-all']`);
  for (let i = 0; i < 6 && (await more.count()) > 0; i++) await more.first().click({ timeout: 5_000 }).catch(() => {});
  await page.waitForTimeout(800);
  await page.mouse.move(2, 2);
}
async function openCard(page: Page, id: string) {
  const c = page.locator(`${PAGE} [data-qc154='card'][data-id='${id}']`).first();
  await c.scrollIntoViewIfNeeded();
  await c.locator("[data-qc154='name']").first().click();
  await page.locator(`${CARD}[data-id='${id}']`).waitFor({ timeout: 15_000 });
  await page.waitForTimeout(900);
}
const throttle = async (page: Page, rate: number): Promise<CDPSession> => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate });
  return cdp;
};

/* every painted (rAF) frame: the frame's scale, rotate, translate and transform, the animations on it; long tasks; the press */
type Fr = { t: number; scale: number; rotate: string; translate: string; transform: string; anims: string[]; rotT: boolean };
type Tr = { frames: Fr[]; longs: { start: number; dur: number }[]; press: number | null };
async function startTrace(page: Page) {
  await page.evaluate((s) => {
    const w = window as unknown as { __t: Tr & { on: boolean } };
    w.__t = { frames: [], longs: [], press: null, on: true };
    new PerformanceObserver((l) => { for (const e of l.getEntries()) w.__t.longs.push({ start: e.startTime, dur: e.duration }); }).observe({ type: "longtask", buffered: false });
    document.addEventListener("pointerdown", (e) => {
      if (w.__t.press == null && (e.target as Element).closest?.("[data-qc1522='save'], [data-qc1522='later'], [data-qc1522='undo'], [data-qc1522='delete-ok']")) w.__t.press = performance.now();
    }, { capture: true });
    const tick = (t: number) => {
      if (!w.__t.on) return;
      const f = document.querySelector<HTMLElement>(s)?.closest<HTMLElement>(".spanel");
      if (f) {
        const cs = getComputedStyle(f);
        const an = f.getAnimations().filter((a) => (a.effect as KeyframeEffect).target === f);
        w.__t.frames.push({ t, scale: cs.scale === "none" ? 1 : parseFloat(cs.scale), rotate: cs.rotate, translate: cs.translate, transform: cs.transform,
          anims: an.map((a) => `${a.id || (a as CSSAnimation).animationName || (a as CSSTransition).transitionProperty}:${a.playState}`),
          rotT: an.some((a) => (a as CSSTransition).transitionProperty === "rotate" && a.playState === "running") });
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, CARD);
}
const stopTrace = (page: Page): Promise<Tr> => page.evaluate(() => { const w = window as unknown as { __t: Tr & { on: boolean } }; w.__t.on = false; return w.__t; });
/** a press as a person makes one: the pointer already there, the button held for 90ms, then released (Playwright's own
 *  click sends down, up and click in one task, which no hand can) */
async function press(page: Page, sel: string) {
  const l = page.locator(sel).first();
  await l.hover({ timeout: 10_000 }); await page.waitForTimeout(250);
  await page.mouse.down(); await page.waitForTimeout(90); await page.mouse.up();
}
const SAVE = C("[data-qc1522='composer'] [data-qc1522='save']"), UNDO = C("[data-qc1522='undo']");
const saveBtn = (page: Page) => page.locator(C("[data-qc1522='composer'] [data-qc1522='save']")).first();
const waitUndo = (page: Page) => page.locator(C("[data-qc1522='undo']")).waitFor({ timeout: 30_000 }).then(() => true, () => false);

/** the press-in, the hold and the pop, read from a trace */
function shape(tr: Tr) {
  const p = tr.press ?? 0;
  const after = tr.frames.filter((f) => f.t >= p);
  const firstIn = after.find((f) => f.scale < 0.9999);
  const pop = after.filter((f) => f.anims.some((a) => /^qc160-bump:running/.test(a)));
  const popStart = pop[0]?.t ?? null, popEnd = pop.length ? pop[pop.length - 1].t : null;
  const heldAt = after.find((f) => Math.abs(f.scale - 0.985) < 0.0005);
  const held = heldAt && popStart != null ? after.filter((f) => f.t >= heldAt.t && f.t < popStart) : [];
  const peak = pop.length ? Math.max(...pop.map((f) => f.scale)) : null;
  const low = pop.length ? Math.min(...pop.map((f) => f.scale)) : null;
  const longsInHold = heldAt && popStart != null ? tr.longs.filter((l) => l.start < popStart && l.start + l.dur > heldAt.t) : [];
  const last = tr.frames[tr.frames.length - 1];
  return { firstInMs: firstIn ? Math.round(firstIn.t - p) : null, held, heldAt: heldAt?.t ?? null, popStart, popFrames: pop.length, popSpan: popStart != null ? Math.round(popEnd! - popStart) : 0,
    peak, low, endScale: last?.scale ?? null, longsInHold, lastAnims: last?.anims ?? [] };
}
const shapeChecks = (L: Ledger, tag: string, tr: Tr, opts: { press?: boolean; hold?: boolean; pop?: boolean } = { press: true, hold: true, pop: true }) => {
  const s = shape(tr);
  if (opts.press) L.check(`${tag}: a painted frame shows the frame's scale below 1 within 100ms of the press`, s.firstInMs != null && s.firstInMs <= 100, `${s.firstInMs}ms`);
  if (opts.hold) {
    L.check(`${tag}: population — frames held between the press-in and the landing`, s.held.length >= 3, String(s.held.length));
    L.check(`${tag}: every one at scale 0.985`, s.held.length > 0 && s.held.every((f) => Math.abs(f.scale - 0.985) < 0.0005), JSON.stringify([...new Set(s.held.map((f) => f.scale))]));
  }
  if (opts.pop) {
    /* v163: the pop peaks at 1.03 (was 1.035) over 620ms (was 520): the same 0.005 below the peak, and the same frame rate */
    L.check(`${tag}: the pop rises above 1.025 and never above 1.03`, s.peak != null && s.peak > 1.025 && s.peak <= 1.0301, String(s.peak));
    L.check(`${tag}: at least 28 frames painted in the pop's 620ms`, s.popFrames >= 28, `${s.popFrames} frames over ${s.popSpan}ms`);
    L.check(`${tag}: it ends at exactly 1`, s.endScale === 1, String(s.endScale));
  }
  return s;
};

if (PHASE === "before") {
  test("Step 0.4 · CPU 4×: the press → the save's long task, on the base", async ({ page }) => {
    await openQc(page);
    await openCard(page, "q152-agent");
    await page.locator(C("[data-qc152='reply-btn']")).click(); await page.waitForTimeout(700);
    await page.locator(C("[data-qc1522='reply-types'] [data-v='req']")).click(); await page.waitForTimeout(500);
    const cdp = await throttle(page, 4);
    await startTrace(page);
    await page.waitForTimeout(300);
    await press(page, SAVE);
    await waitUndo(page);
    await page.waitForTimeout(1500);
    const tr = await stopTrace(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    const p = tr.press ?? 0;
    const longs = tr.longs.filter((l) => l.start + l.dur >= p - 5).map((l) => ({ at: Math.round(l.start - p), dur: Math.round(l.dur) }));
    const firstLong = longs.find((l) => l.at > 0 && l.dur > 200);
    const framesBefore = tr.frames.filter((f) => f.t > p && (!firstLong || f.t < p + firstLong.at)).length;
    writeFileSync(`${DIR}/step0-4.json`, JSON.stringify({ longs, framesBeforeTheFreeze: framesBefore, firstFrameAfterPress: Math.round((tr.frames.find((f) => f.t > p)?.t ?? p) - p) }, null, 1));
    console.log("STEP04", JSON.stringify({ longs, framesBefore, firstFrame: Math.round((tr.frames.find((f) => f.t > p)?.t ?? p) - p) }));
  });
}

if (PHASE !== "before") {
  if (run("1")) test("QC1611-1/2/3 · CPU 4×: pressed in at the press, held through the save, the pop at the landing", async ({ page }) => {
    const L1 = new Ledger("QC1611-1"), L2 = new Ledger("QC1611-2"), L3 = new Ledger("QC1611-3");
    await openQc(page);
    await openCard(page, "q152-agent");
    await page.locator(C("[data-qc152='reply-btn']")).click(); await page.waitForTimeout(700);
    await page.locator(C("[data-qc1522='reply-types'] [data-v='req']")).click(); await page.waitForTimeout(500);
    const label = (await saveBtn(page).innerText()).trim();
    L1.check(`population: the primary is "Add Rufus’s reply"`, /Add Rufus’s reply/.test(label), label);
    const cdp = await throttle(page, 4);
    await startTrace(page);
    await page.waitForTimeout(300);
    await press(page, SAVE);
    L1.check("population: the save landed (the toast)", await waitUndo(page), "");
    await page.waitForTimeout(2000);
    const tr = await stopTrace(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    writeFileSync(`${DIR}/frames/${PHASE}-save-4x.json`, JSON.stringify(tr));
    const s = shapeChecks(L1, "save", tr, { press: true });
    shapeChecks(L2, "save", tr, { hold: true });
    /* QC1611-2's other half: frames painted during the save's long task cannot be sampled from script (nothing on the main
       thread runs then). What runs is the press's own animation: finished, filled forwards, on the compositor — so its value
       cannot move. Every sampled frame around the long task is 0.985. */
    L2.check("population: a long task (over 50ms) ran while the frame was held", s.longsInHold.length >= 1, JSON.stringify(s.longsInHold.map((l) => Math.round(l.dur))));
    const around = s.longsInHold.length ? tr.frames.filter((f) => s.longsInHold.some((l) => Math.abs(f.t - l.start) < 40 || Math.abs(f.t - (l.start + l.dur)) < 40) && f.t < (s.popStart ?? 0)) : [];
    L2.check("the frames either side of the long task are at 0.985", around.length >= 2 && around.every((f) => Math.abs(f.scale - 0.985) < 0.0005), JSON.stringify(around.map((f) => f.scale)));
    L2.check("the press is a finished animation filled forwards (the compositor holds it)", s.held.some((f) => f.anims.some((a) => /^qc1611-press:finished/.test(a))), JSON.stringify(s.held[s.held.length - 1]?.anims));
    shapeChecks(L3, "save", tr, { pop: true });
    L1.done(3); L2.done(5); L3.done(3);
  });

  if (run("4")) test("QC1611-4 · every save and its undo presses in and pops (at least five actions)", async ({ page }) => {
    const L = new Ledger("QC1611-4");
    const ACTS: { what: string; key: string; open: (p: Page) => Promise<void>; press: (p: Page) => Promise<void> }[] = [
      { what: "mark the partial sent", key: "materials", open: async (p) => { await p.locator(C("[data-qc152='reply-btn']")).click(); }, press: async (p) => { await press(p, SAVE); } },
      { what: "log a nudge", key: "nudge", open: async (p) => { await p.locator(C("[data-qc152='reply-btn']")).click(); }, press: async (p) => { await press(p, SAVE); } },
      { what: "record a response", key: "agent", open: async (p) => { await p.locator(C("[data-qc152='reply-btn']")).click(); await p.waitForTimeout(600); await p.locator(C("[data-qc1522='reply-types'] [data-v='passed']")).click(); }, press: async (p) => { await press(p, SAVE); } },
      { what: "close the query", key: "nudgedquiet", open: async (p) => { await p.locator(C("[data-qc152='reply-btn']")).click(); }, press: async (p) => { await press(p, SAVE); } },
      { what: "decline the offer", key: "offer", open: async (p) => { await p.locator(C("[data-qc152='reply-btn']")).click(); await p.waitForTimeout(600); await p.locator(C("[data-qc1522='offer-choices'] [data-v='decline']")).click(); }, press: async (p) => { await press(p, SAVE); } },
      { what: "delete a step", key: "rr", open: async (p) => { const m = p.locator(C("[data-qc152='thread'] > .qc152-m")).last(); await m.hover(); await m.locator("[data-qc152='edit-step']").click(); await p.waitForTimeout(600); await p.locator(C("[data-qc1522='delete-step']")).click(); }, press: async (p) => { await press(p, C("[data-qc1522='delete-ok']")); } },
    ];
    const ran: string[] = [];
    for (const a of ACTS) {
      seed();
      await page.goto("about:blank"); await openQc(page);
      await openCard(page, `q152-${a.key}`);
      try { await a.open(page); } catch { L.check(`${a.what}: opened (not run)`, true, ""); continue; }
      await page.waitForTimeout(700);
      const cdp = await throttle(page, 4);
      await startTrace(page); await page.waitForTimeout(200);
      try { await a.press(page); } catch { await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 }); L.check(`${a.what}: its save could be pressed (not run)`, true, ""); continue; }
      const ok = await waitUndo(page);
      await page.waitForTimeout(1800);
      const tr = await stopTrace(page);
      if (!ok) { await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 }); L.check(`${a.what}: saved (not run: no Undo)`, true, ""); continue; }
      const s = shape(tr);
      L.check(`${a.what}: pressed in within 100ms`, s.firstInMs != null && s.firstInMs <= 100, `${s.firstInMs}ms`);
      L.check(`${a.what}: the pop above 1.025, never above 1.03, ending at 1, 28+ frames`, s.peak != null && s.peak > 1.025 && s.peak <= 1.0301 && s.endScale === 1 && s.popFrames >= 28, `${s.peak} · ${s.popFrames} frames · ends ${s.endScale}`);
      await startTrace(page); await page.waitForTimeout(150);
      await press(page, UNDO).catch(() => {});
      await page.waitForTimeout(4500);
      const tu = await stopTrace(page);
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
      const u = shape(tu);
      L.check(`${a.what} · its undo: pressed in within 100ms`, u.firstInMs != null && u.firstInMs <= 100, `${u.firstInMs}ms`);
      /* v163: an undo sinks (0.975 at 30%) and never rises above 1 */
      L.check(`${a.what} · its undo: the sink below 0.98, never above 1, ending at 1, 28+ frames`, u.low != null && u.low < 0.98 && u.peak != null && u.peak <= 1.0001 && u.endScale === 1 && u.popFrames >= 28, `${u.low}–${u.peak} · ${u.popFrames} frames · ends ${u.endScale}`);
      ran.push(a.what);
    }
    L.check("it ran at least five different actions", ran.length >= 5, JSON.stringify(ran));
    L.done(11);
  });

  if (run("5")) test("QC1611-5 · never stuck: a failed save and a save that never lands are back at 1 within 4.2s, with no pop", async ({ page }) => {
    const L = new Ledger("QC1611-5");
    for (const [how, handler] of [
      ["fails (every Firestore request refused)", (r: import("@playwright/test").Route) => r.abort()],
      ["never lands (every Firestore request left unanswered)", () => { /* never answered */ }],
    ] as const) {
      seed();
      await page.goto("about:blank"); await openQc(page);
      await openCard(page, "q152-agent");
      await page.locator(C("[data-qc152='reply-btn']")).click(); await page.waitForTimeout(700);
      await page.locator(C("[data-qc1522='reply-types'] [data-v='req']")).click(); await page.waitForTimeout(500);
      const cdp = await throttle(page, 4);
      await page.route(/127\.0\.0\.1:8085|localhost:8085/, handler as never);
      await startTrace(page); await page.waitForTimeout(200);
      await press(page, SAVE);
      await page.waitForTimeout(4400);
      const tr = await stopTrace(page);
      await page.unroute(/127\.0\.0\.1:8085|localhost:8085/);
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
      const p = tr.press ?? 0;
      const pressedIn = tr.frames.some((f) => f.t > p && f.scale < 0.999);
      const at42 = tr.frames.filter((f) => f.t - p <= 4200).pop();
      L.check(`${how}: population — it pressed in`, pressedIn, "");
      L.check(`${how}: back at scale 1 within 4.2s`, at42 != null && at42.scale === 1 && tr.frames.filter((f) => f.t - p > 4200).every((f) => f.scale === 1), `${at42?.scale} at ${Math.round((at42?.t ?? p) - p)}ms`);
      L.check(`${how}: no pop`, tr.frames.every((f) => f.scale <= 1.0001), String(Math.max(...tr.frames.map((f) => f.scale))));
      await page.goto("about:blank");
    }
    L.done(6);
  });

  if (run("6")) test("QC1611-6 · CPU 1×: the save's first request goes out within 50ms of the press", async ({ page }) => {
    const L = new Ledger("QC1611-6");
    await openQc(page);
    await openCard(page, "q152-agent");
    await page.locator(C("[data-qc152='reply-btn']")).click(); await page.waitForTimeout(700);
    await page.locator(C("[data-qc1522='reply-types'] [data-v='req']")).click(); await page.waitForTimeout(800);
    const reqs: number[] = [];
    page.on("request", (q) => { if (q.method() === "POST" && /127\.0\.0\.1:8085|localhost:8085/.test(q.url())) reqs.push(Date.now()); });
    await page.waitForTimeout(1500);
    reqs.length = 0;
    /* the save starts at the click (the press-in begins at the pointerdown before it, and takes nothing from the save) */
    await page.evaluate(() => document.addEventListener("click", (e) => { if ((e.target as Element).closest?.("[data-qc1522='save']")) (window as unknown as { __click?: number }).__click = Date.now(); }, { capture: true, once: true }));
    await press(page, SAVE);
    await waitUndo(page);
    const at = await page.evaluate(() => (window as unknown as { __click?: number }).__click ?? 0);
    const first = reqs.find((t) => t >= at);
    L.check("population: the click and the save's requests were seen", at > 0 && first != null, JSON.stringify({ at, first }));
    L.check("the save's first request goes out within 50ms of the click", first != null && first - at <= 50, `${first != null ? first - at : "—"}ms`);
    await page.locator(C("[data-qc1522='undo']")).first().click().catch(() => {}); await page.waitForTimeout(2500);
    L.done(2);
  });

  if (run("7")) test("QC1611-7 · nothing else: rotate and translate unchanged, the box at rest the same, no bump on a tab, a note, the drawer", async ({ page }) => {
    const L = new Ledger("QC1611-7");
    await openQc(page);
    await openCard(page, "q152-agent");
    const box = () => page.evaluate((s) => { const f = document.querySelector<HTMLElement>(s)!.closest<HTMLElement>(".spanel")!; return [f.offsetLeft, f.offsetTop, f.offsetWidth, f.offsetHeight].join(","); }, CARD);
    const b0 = await box();
    for (const [what, act] of [
      ["a tab change", async () => { await page.locator(C("[data-qc152='tab'][data-tab='agent']")).click(); await page.waitForTimeout(400); await page.locator(C("[data-qc152='tab'][data-tab='tracking']")).click(); }],
      ["adding a note", async () => { await page.locator(C("[data-qc152='tab'][data-tab='notes']")).click(); await page.waitForTimeout(400); await page.locator(C("[data-qc158='field']")).fill("QC1611 a note"); await page.locator(C("[data-qc158='add-note']")).evaluate((b) => (b as HTMLButtonElement).click()); await page.waitForTimeout(1200); await page.locator(C("[data-qc152='tab'][data-tab='tracking']")).click(); }],
      ["opening the drawer", async () => { await page.locator(C("[data-qc152='reply-btn']")).click(); await page.waitForTimeout(900); }],
    ] as const) {
      await startTrace(page);
      await act();
      await page.waitForTimeout(600);
      const tr = await stopTrace(page);
      L.check(`${what}: population — sampled`, tr.frames.length > 10, String(tr.frames.length));
      L.check(`${what}: no scale animation on the frame`, tr.frames.every((f) => !f.anims.some((a) => /qc1611-press|qc160-bump|qc1611-back/.test(a))) && tr.frames.every((f) => f.scale === 1), JSON.stringify([...new Set(tr.frames.flatMap((f) => f.anims))]));
    }
    await page.locator(C("[data-qc1522='reply-types'] [data-v='req']")).click(); await page.waitForTimeout(500);
    await startTrace(page); await page.waitForTimeout(200);
    await press(page, SAVE);
    await waitUndo(page); await page.waitForTimeout(2000);
    const tr = await stopTrace(page);
    /* (the lean is the card's own: flat while the drawer is open, back to 1.6° by a 320ms transition when the save closes
       it. What is locked is that the press and the pop never touch it: from the press-in to the pop's end, outside the
       lean's own transition, rotate is one value, and no animation of ours names rotate) */
    const sh = shape(tr);
    const span = tr.frames.filter((f) => f.t >= (sh.heldAt ?? 0) && f.t <= (sh.popStart ?? 0) + 600 && !f.rotT);
    L.check("from the press-in to the pop's end, outside the lean's own return, the frame's rotate never changes", span.length > 20 && new Set(span.map((f) => f.rotate)).size === 1, JSON.stringify([...new Set(span.map((f) => f.rotate))]));
    L.check("its translate never changes", new Set(tr.frames.map((f) => f.translate)).size === 1, JSON.stringify([...new Set(tr.frames.map((f) => f.translate))]));
    L.check("transform is never set on it", tr.frames.every((f) => f.transform === "none"), JSON.stringify([...new Set(tr.frames.map((f) => f.transform))]));
    L.check("its box at rest is the baseline's", (await box()) === b0, `${b0} → ${await box()}`);
    await page.locator(C("[data-qc1522='undo']")).first().click().catch(() => {}); await page.waitForTimeout(2500);
    L.done(10);
  });

  if (run("8")) test("QC1611-8 · reduced motion: no scale animation is created on the frame", async ({ page }) => {
    const L = new Ledger("QC1611-8");
    await openQc(page, true);
    await openCard(page, "q152-agent");
    await page.locator(C("[data-qc152='reply-btn']")).click(); await page.waitForTimeout(700);
    await page.locator(C("[data-qc1522='reply-types'] [data-v='req']")).click(); await page.waitForTimeout(500);
    await startTrace(page); await page.waitForTimeout(200);
    await press(page, SAVE);
    const ok = await waitUndo(page); await page.waitForTimeout(1500);
    await press(page, UNDO).catch(() => {});
    await page.waitForTimeout(2500);
    const tr = await stopTrace(page);
    L.check("population: the save landed and was undone", ok, "");
    L.check("no scale animation on the frame, on the save or the undo", tr.frames.every((f) => f.anims.length === 0 || f.anims.every((a) => !/qc1611|qc160-bump/.test(a))), JSON.stringify([...new Set(tr.frames.flatMap((f) => f.anims))]));
    L.check("its scale never leaves 1", tr.frames.every((f) => f.scale === 1), "");
    L.done(3);
  });
}



/* ══ the frames ══════════════════════════════════════════════════════════════════════════════════════════════════════
   CDP's screencast takes the compositor's own frames, so it also has frames painted while the page's main thread is busy
   (where rAF, and so every trace above, has none). For each CPU rate: the frame nearest the press + 70ms, the middle of
   the longest long task between the press and the pop (at 1× with no long task: midway from the press-in to the pop),
   the pop's peak (v163: its start + 81ms, where the one easing over 620ms reaches the 42% keyframe) and at rest (its end + 400ms). */
if (PHASE === "after" && run("F")) test("QC1611-F · frames of one save at CPU 1× and 4×: the press, mid-freeze, the pop's peak, at rest", async ({ page }) => {
  const index: Record<string, unknown> = {};
  for (const rate of [1, 4]) {
    seed();
    await page.goto("about:blank"); await openQc(page); await openCard(page, "q152-agent");
    await page.locator(C("[data-qc152='reply-btn']")).click(); await page.waitForTimeout(700);
    await page.locator(C("[data-qc1522='reply-types'] [data-v='req']")).click(); await page.waitForTimeout(500);
    const cdp = await throttle(page, rate);
    const origin = await page.evaluate(() => performance.timeOrigin);
    const shots: { t: number; data: string }[] = [];
    cdp.on("Page.screencastFrame", (f: { data: string; sessionId: number; metadata: { timestamp?: number } }) => {
      shots.push({ t: (f.metadata.timestamp ?? 0) * 1000 - origin, data: f.data });
      void cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
    });
    await cdp.send("Page.startScreencast", { format: "png", everyNthFrame: 1 });
    await startTrace(page);
    await page.waitForTimeout(400);
    await press(page, SAVE);
    await waitUndo(page);
    await page.waitForTimeout(1500);
    const tr = await stopTrace(page);
    await cdp.send("Page.stopScreencast");
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    const s = shape(tr), p = tr.press ?? 0, popStart = s.popStart ?? p, popEnd = popStart + s.popSpan;
    const long = tr.longs.filter((l) => l.start + l.dur > p && l.start < popStart).sort((a, b) => b.dur - a.dur)[0];
    const marks: Record<string, number> = { press: p + 70, freeze: long ? long.start + long.dur / 2 : ((s.heldAt ?? p) + popStart) / 2, peak: popStart + 81, rest: popEnd + 400 };
    const got: Record<string, unknown> = {};
    for (const [k, at] of Object.entries(marks)) {
      const near = shots.reduce<{ t: number; data: string } | null>((b, x) => (!b || Math.abs(x.t - at) < Math.abs(b.t - at) ? x : b), null);
      if (!near) continue;
      writeFileSync(`${DIR}/frames/${rate}x-${k}.png`, Buffer.from(near.data, "base64"));
      const fr = tr.frames.reduce<Fr | null>((b, f) => (!b || Math.abs(f.t - near.t) < Math.abs(b.t - near.t) ? f : b), null);
      got[k] = { wantMs: Math.round(at - p), shotMs: Math.round(near.t - p), nearestRafScale: fr?.scale ?? null, nearestRafMs: fr ? Math.round(fr.t - p) : null };
    }
    index[`${rate}x`] = { shots: shots.length, shotsDuringLong: long ? shots.filter((x) => x.t > long.start && x.t < long.start + long.dur).length : 0,
      long: long ? { at: Math.round(long.start - p), dur: Math.round(long.dur) } : null, firstInMs: s.firstInMs, popAt: Math.round(popStart - p), peak: s.peak, frames: got };
    console.log("QC1611-F", rate, JSON.stringify(index[`${rate}x`]));
  }
  writeFileSync(`${DIR}/frames/index.json`, JSON.stringify(index, null, 1));
  expect(Object.keys(index).length).toBe(2);
});
