/**
 * Query card v163 — the border breathes in the stage colour, a light runs round on save, and back on undo
 * (design-refs/query-card-v163/). Emulator harness at 1512 × 900, motion suppression lifted; seedQc152.mjs's q152-* queries
 * are reset first and cleaned after.
 *
 *   The rim layer is `.spanel > .qc163-rim` (qcMotion160 `rimOf`): `[data-qc163='tint']` and `[data-qc163='light']`.
 *   SA_PHASE=mutant  the mutation builds (ledgers prefixed mutant-)
 *   (default)        QC163-0 … QC163-11 and W, each a ledger in reports/query-card-v163/ledger/
 *   QC163_ONLY=F     the frames (reports/query-card-v163/frames/); QC163_ONLY=1,5 runs only those
 */
import { test, expect, webkit, type Page, type CDPSession } from "@playwright/test";
import { STAGE_COLOURS } from "../../src/lib/stageColours";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { liftMotionSuppression, openRoute } from "./measure";

const PHASE = /^mutant[A-Z]?$/.test(process.env.SA_PHASE ?? "") ? process.env.SA_PHASE! /* each mutant build keeps its own ledgers */ : "after";
const ONLY = process.env.QC163_ONLY ?? "";
const run = (id: string) => (!ONLY && id !== "F") || ONLY.split(",").includes(id);
const DIR = "reports/query-card-v163";
const VP = { width: 1512, height: 900 };
const PAGE = ".qc151.qc153";
const CARD = "[data-qp='panel'] [data-qc152='card']";
const C = (s: string) => `${CARD} ${s}`;
const CP = C("[data-qc1522='composer']");
const SAVE = C("[data-qc1522='composer'] [data-qc1522='save']");
const UNDO = C("[data-qc1522='undo']");
/* 90s a test: a hung click fails fast and frees the shared slot */
test.setTimeout(90_000);
test.use({ viewport: VP });
mkdirSync(`${DIR}/ledger`, { recursive: true });
mkdirSync(`${DIR}/frames`, { recursive: true });
const seed = (a = "") => execSync(`node tests/e2e/seedQc152.mjs ${a}`, { encoding: "utf8", stdio: "pipe", timeout: 60_000, killSignal: "SIGKILL" });
test.beforeAll(() => { seed(); });
test.afterAll(() => { seed("--clean"); });

/** the stage colours this pack added (lib/stageColours `rim`), as the browser writes them */
/* Plumage colours v1 — the rim and its light read the one table (they were literals of the slate ladder's) */
const HEX = Object.fromEntries(Object.entries(STAGE_COLOURS).map(([k, c]) => [k, c.rim])) as Record<keyof typeof STAGE_COLOURS, string>;
const HI = Object.fromEntries(Object.entries(STAGE_COLOURS).map(([k, c]) => [k, c.rimHi])) as Record<keyof typeof STAGE_COLOURS, string>;
type St = keyof typeof HEX;
const rgb = (h: string) => { const n = parseInt(h.slice(1), 16); return `rgb(${n >> 16}, ${(n >> 8) & 255}, ${n & 255})`; };
const rgbArr = (h: string) => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
/** one seeded card in each stage (seedQc152.mjs FIXTURES) */
const BY_STAGE: Record<St, string> = { queried: "q152-agent", partial: "q152-materials", full: "q152-fullreq", offer: "q152-offer", closed: "q152-closed" };

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
const prefs = () => {
  try {
    sessionStorage.removeItem("qh.qc.filters"); sessionStorage.setItem("qh.qc.view150", "list");
    localStorage.setItem("qh.qc.view", JSON.stringify({ v: 1, group: "none", sort: { key: "due", reversed: false }, density: "comfortable" }));
    localStorage.setItem("sa.guide.queries", "1"); localStorage.setItem("sa.guide.queries-explainer", "1");
  } catch { /* private mode */ }
};
async function openQc(page: Page, reduced = false) {
  if (reduced) await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(prefs);
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
const fresh = async (page: Page, id: string, reduced = false) => { await page.goto("about:blank"); await openQc(page, reduced); await openCard(page, id); };
const throttle = async (page: Page, rate: number): Promise<CDPSession> => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate });
  return cdp;
};
async function pointAt(page: Page, sel: string) {
  const l = page.locator(sel).first();
  await l.waitFor({ state: "visible", timeout: 20_000 });
  const b = (await l.boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
}
/** a click at the element's centre, by the pointer */
async function tap(page: Page, sel: string) { await pointAt(page, sel); await page.mouse.down(); await page.mouse.up(); }
/** a press as a person makes one: the pointer already there, the button held for 90ms, then released */
async function press(page: Page, sel: string) { await pointAt(page, sel); await page.waitForTimeout(250); await page.mouse.down(); await page.waitForTimeout(90); await page.mouse.up(); }
const waitUndo = (page: Page) => page.locator(UNDO).waitFor({ timeout: 30_000 }).then(() => true, () => false);
/** open the drawer from the footer's button; on a card whose footer has none, whatever footer button opens the drawer */
async function openDrawer(page: Page): Promise<boolean> {
  const btn = page.locator(C("[data-qc152='reply-btn']"));
  if (await btn.count()) { await tap(page, C("[data-qc152='reply-btn']")); return page.locator(CP).waitFor({ timeout: 8000 }).then(() => true, () => false); }
  const any = page.locator(C("[data-qc152='reply'] button"));
  for (let i = 0; i < (await any.count()); i++) {
    await any.nth(i).click().catch(() => {});
    if (await page.locator(CP).waitFor({ timeout: 2500 }).then(() => true, () => false)) return true;
  }
  return false;
}

/* every painted (rAF) frame: the tint's opacity and colour, the light's opacity/rotate/scale, the paper's (::before) scale,
   the ring's scale, the frame's own scale, and every animation on the frame and its rim layer */
type An = { id: string; on: string; play: string; props: string[]; dur: number; start: number | null; uid: number; kf: Record<string, string>[] };
type Fr = { t: number; tint: number; tintBg: string; light: number; lightRot: string; lightScale: string; lightBg: string; paper: number; ring: number; frame: number; anims: An[]; boxes: string };
type Tr = { frames: Fr[]; press: number | null; keys: number[]; longs: { start: number; dur: number }[]; mark: Record<string, number> };
async function startTrace(page: Page) {
  await page.evaluate((s) => {
    const w = window as unknown as { __t: Tr & { on: boolean } };
    w.__t = { frames: [], press: null, keys: [], longs: [], mark: {}, on: true };
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) w.__t.longs.push({ start: e.startTime, dur: e.duration }); }).observe({ type: "longtask", buffered: false }); } catch { /* none */ }
    const frameOf = () => document.querySelector<HTMLElement>(s)?.closest<HTMLElement>(".spanel") ?? null;
    /* one id per Animation object: a parked animation is seen paused (startTime null) and then playing, and is ONE */
    const uids = new WeakMap<Animation, number>(); let nUid = 0;
    const uidOf = (a: Animation) => { let v = uids.get(a); if (v == null) { v = ++nUid; uids.set(a, v); } return v; };
    const sc = (e: Element | null, pe?: string) => { if (!e) return 1; const v = getComputedStyle(e, pe).scale; return v === "none" ? 1 : parseFloat(v) || 1; };
    document.addEventListener("pointerdown", (e) => { if (w.__t.press == null && (e.target as Element).closest?.("[data-qc1522='save'], [data-qc1522='later'], [data-qc1522='undo']")) w.__t.press = performance.now(); }, { capture: true });
    document.addEventListener("keydown", (e) => { if ((e.target as Element).closest?.("[data-qc1522='composer']")) w.__t.keys.push(performance.now()); }, { capture: true });
    const tick = (t: number) => {
      if (!w.__t.on) return;
      const f = frameOf();
      const tint = f?.querySelector<HTMLElement>(":scope > .qc163-rim > [data-qc163='tint']") ?? null;
      const light = f?.querySelector<HTMLElement>(":scope > .qc163-rim > [data-qc163='light']") ?? null;
      const ring = f?.querySelector<HTMLElement>(":scope > .qc163-rim") ?? null;
      const an = f ? f.getAnimations({ subtree: true }).filter((a) => { const tg = (a.effect as KeyframeEffect).target; return tg === f || tg === ring || tg === tint || tg === light; }) : [];
      const boxes = f ? [...f.querySelectorAll<HTMLElement>("[data-qc1522='composer'] button")].map((b) => { const r = b.getBoundingClientRect(); return `${r.x},${r.y},${r.width},${r.height}`; }).join("|") : "";
      w.__t.frames.push({ t, tint: tint ? parseFloat(getComputedStyle(tint).opacity) : 0, tintBg: tint ? getComputedStyle(tint).backgroundColor : "",
        light: light ? parseFloat(getComputedStyle(light).opacity) : 0, lightRot: light ? getComputedStyle(light).rotate : "", lightScale: light ? getComputedStyle(light).scale : "",
        lightBg: light ? getComputedStyle(light).backgroundImage : "", paper: sc(f, "::before"), ring: sc(ring), frame: sc(f), boxes,
        anims: an.map((a) => {
          const ef = a.effect as KeyframeEffect, tg = ef.target as Element;
          const kf = ef.getKeyframes().map((k) => Object.fromEntries(Object.entries(k).filter(([x]) => !["computedOffset", "composite"].includes(x)).map(([x, v]) => [x, String(v)])));
          const props = [...new Set(kf.flatMap((k) => Object.keys(k).filter((x) => !["offset", "easing"].includes(x))))];
          return { id: a.id || (a as CSSAnimation).animationName || (a as CSSTransition).transitionProperty || "?", on: ef.pseudoElement ? `frame${ef.pseudoElement}` : tg === f ? "frame" : tg === ring ? "ring" : tg === tint ? "tint" : "light",
            play: a.playState, props, dur: Number(ef.getTiming().duration) || 0, start: a.startTime == null ? null : Number(a.startTime), uid: uidOf(a), kf };
        }) });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, CARD);
}
const mark = (page: Page, k: string) => page.evaluate((k) => { (window as unknown as { __t: Tr }).__t.mark[k] = performance.now(); }, k);
const stopTrace = (page: Page): Promise<Tr> => page.evaluate(() => { const w = window as unknown as { __t: Tr & { on: boolean } }; w.__t.on = false; return w.__t; });
const between = (tr: Tr, a: number, b = Infinity) => tr.frames.filter((f) => f.t >= a && f.t <= b);
const RIM_HOLD_MS = 280;
const animsOf = (tr: Tr, id: string) => { const m = new Map<string, An>(); for (const f of tr.frames) for (const a of f.anims) if (a.id === id) m.set(String(a.uid), a); return [...m.values()]; };
const near = (tr: Tr, t: number) => tr.frames.reduce<Fr | null>((b, f) => (!b || Math.abs(f.t - t) < Math.abs(b.t - t) ? f : b), null);

/** screencast: the compositor's own frames, painted even while the main thread is busy */
async function screencast(page: Page, cdp: CDPSession) {
  const origin = await page.evaluate(() => performance.timeOrigin);
  const shots: { t: number; data: string }[] = [];
  cdp.on("Page.screencastFrame", (f: { data: string; sessionId: number; metadata: { timestamp?: number } }) => {
    shots.push({ t: (f.metadata.timestamp ?? 0) * 1000 - origin, data: f.data });
    void cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send("Page.startScreencast", { format: "png", everyNthFrame: 1 });
  return { shots, stop: () => cdp.send("Page.stopScreencast") };
}
/** the rim's top-centre point, mid-ring (3px in), in CSS px */
/** the same point with the frame held at scale k about its centre (the press holds 0.985, so the top edge comes in ~5px) */
const ringPointAt = (page: Page, k: number) => page.evaluate(({ s, k }) => { const r = document.querySelector<HTMLElement>(s)!.closest<HTMLElement>(".spanel")!.getBoundingClientRect(); const cy = r.top + r.height / 2; return { x: r.left + r.width / 2, y: cy - (r.height / 2) * k + 3.5 * k, vw: innerWidth }; }, { s: CARD, k });
/** a pixel on the white → rim line: every channel within tol of white blended toward the rim colour by one opacity */
const onTintLine = (px: number[], hex: string, o: number, tol = 14) => { const c = rgbArr(hex); return [0, 1, 2].every((j) => Math.abs(px[j] - (255 - o * (255 - c[j]))) <= tol); };
const ringPoint = (page: Page) => page.evaluate((s) => { const r = document.querySelector<HTMLElement>(s)!.closest<HTMLElement>(".spanel")!.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + 3.5, vw: innerWidth }; }, CARD);
/** a screencast frame's pixel at a CSS point, read by the page's own canvas (no image library here) */
const pixel = (page: Page, data: string, pt: { x: number; y: number; vw: number }) => page.evaluate(async ({ data, pt }) => {
  const img = new Image(); img.src = `data:image/png;base64,${data}`; await img.decode();
  const k = img.naturalWidth / pt.vw;
  const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
  const g = c.getContext("2d")!; g.drawImage(img, 0, 0);
  return [...g.getImageData(Math.round(pt.x * k), Math.round(pt.y * k), 1, 1).data].slice(0, 3);
}, { data, pt });
/** the tint's opacity read off a pixel of the white ring: how far it has gone from white toward the stage's rim colour */
const opacityOf = (px: number[], hex: string) => { const c = rgbArr(hex); const i = [0, 1, 2].reduce((b, j) => (255 - c[j] > 255 - c[b] ? j : b), 0); return (255 - px[i]) / (255 - c[i]); };

/* ══ QC163-0 (Step 0.6) — the rim layer's opacity, rotate and scale keep moving while the main thread is blocked ═══════ */
if (run("0")) test("QC163-0 · the compositor check: the rim's tint, light and ring keep moving through a 600ms busy loop", async ({ page }) => {
  const L = new Ledger("QC163-0");
  await fresh(page, "q152-agent");
  if (!(await openDrawer(page))) { L.check("population: the drawer opened", false, ""); return L.done(1); }
  await page.waitForTimeout(1200);
  const cdp = await throttle(page, 1);
  /* run all three on the real rim layer, 600ms each way, then block the page for 600ms */
  await page.evaluate((s) => {
    const f = document.querySelector<HTMLElement>(s)!.closest<HTMLElement>(".spanel")!;
    const ring = f.querySelector<HTMLElement>(":scope > .qc163-rim")!;
    for (const a of f.getAnimations({ subtree: true })) a.cancel();
    const light = ring.querySelector<HTMLElement>("[data-qc163='light']")!, tint = ring.querySelector<HTMLElement>("[data-qc163='tint']")!;
    light.style.background = "conic-gradient(from 0deg, transparent 0 58%, #6f8fb3 84%, #d6e1ee 93%, transparent 100%)";
    tint.style.background = "#6f8fb3";
    light.animate([{ rotate: "0deg", opacity: 1 }, { rotate: "360deg", opacity: 1 }], { duration: 1200, iterations: Infinity }).id = "c0-rot";
    tint.animate([{ opacity: 0 }, { opacity: 0.72 }, { opacity: 0 }], { duration: 1200, iterations: Infinity }).id = "c0-op";
    ring.animate([{ scale: "1" }, { scale: "1.03" }, { scale: "1" }], { duration: 1200, iterations: Infinity }).id = "c0-sc";
  }, CARD);
  await page.waitForTimeout(300);
  const sc = await screencast(page, cdp);
  await page.waitForTimeout(300);
  const t0 = await page.evaluate(() => { const t = performance.now(); while (performance.now() - t < 600) { /* blocked */ } return t; });
  await page.waitForTimeout(300);
  await sc.stop();
  const during = sc.shots.filter((x) => x.t > t0 + 50 && x.t < t0 + 550);
  L.check("population: compositor frames arrived during the 600ms block", during.length >= 6, `${during.length} frames`);
  const pt = await ringPoint(page);
  const corner = await page.evaluate((s) => { const r = document.querySelector<HTMLElement>(s)!.closest<HTMLElement>(".spanel")!.getBoundingClientRect(); return { x: r.left + 3.5, y: r.top + r.height * 0.3, vw: innerWidth }; }, CARD);
  const top = await Promise.all(during.map((x) => pixel(page, x.data, pt)));
  const side = await Promise.all(during.map((x) => pixel(page, x.data, corner)));
  const distinct = (ps: number[][]) => new Set(ps.map((p) => p.join(","))).size;
  L.check("the rim changes from frame to frame while the page is blocked (top of the ring)", distinct(top) >= 3, `${distinct(top)} distinct of ${top.length}`);
  L.check("and at its side (the light passing, the tint changing)", distinct(side) >= 3, `${distinct(side)} distinct of ${side.length}`);
  writeFileSync(`${DIR}/frames/0-compositor-during-block.png`, Buffer.from(during[Math.floor(during.length / 2)]?.data ?? "", "base64"));
  L.done(3);
});

/* ══ QC163-1 — while the drawer is open, qc163-tint runs on the rim layer, in the current stage's rim ════════════════ */
if (run("1")) test("QC163-1 · the tint breathes in the current stage's rim (a queried and a partial card)", async ({ page }) => {
  const L = new Ledger("QC163-1");
  for (const st of ["queried", "partial"] as St[]) {
    seed();
    await fresh(page, BY_STAGE[st]);
    await startTrace(page);
    const ok = await openDrawer(page);
    L.check(`${st}: population — the drawer opened`, ok, "");
    await page.waitForTimeout(2600);
    const tr = await stopTrace(page);
    const tints = animsOf(tr, "qc163-tint");
    L.check(`${st}: an animation qc163-tint runs on the rim layer's tint`, tints.length === 1 && tints[0].on === "tint" && tr.frames.some((f) => f.anims.some((a) => a.id === "qc163-tint" && a.play === "running")), JSON.stringify(tints.map((a) => [a.on, a.play])));
    const bgs = [...new Set(between(tr, tr.frames[0].t + 1000).map((f) => f.tintBg))];
    L.check(`${st}: its colour is the stage's rim (${HEX[st]})`, bgs.length === 1 && bgs[0] === rgb(HEX[st]), JSON.stringify(bgs));
    const mx = Math.max(...tr.frames.map((f) => f.tint));
    L.check(`${st}: it rises above 0.5 and never above 0.72`, mx > 0.5 && mx <= 0.7201, String(mx));
  }
  L.done(8);
});

/* ══ QC163-2 — the tint and the scale breath share 3200ms and start within one frame of each other ═════════════════ */
if (run("2")) test("QC163-2 · the tint and the paper share one 3200ms clock, started together", async ({ page }) => {
  const L = new Ledger("QC163-2");
  await fresh(page, "q152-agent");
  await startTrace(page);
  await openDrawer(page);
  await page.waitForTimeout(2600);
  const tr = await stopTrace(page);
  const paper = animsOf(tr, "qc1612-breath"), tint = animsOf(tr, "qc163-tint"), ring = animsOf(tr, "qc163-rim-breath");
  L.check("population: one of each (paper, ring, tint)", paper.length === 1 && tint.length === 1 && ring.length === 1, `${paper.length} ${ring.length} ${tint.length}`);
  L.check("all three are 3200ms", [paper[0]?.dur, ring[0]?.dur, tint[0]?.dur].every((d) => d === 3200), JSON.stringify([paper[0]?.dur, ring[0]?.dur, tint[0]?.dur]));
  const st = [paper[0]?.start, ring[0]?.start, tint[0]?.start].filter((x): x is number => x != null);
  L.check("they start within one frame (16.7ms) of each other", st.length === 3 && Math.max(...st) - Math.min(...st) <= 16.7, JSON.stringify(st));
  L.check("the paper is the frame's ::before, the ring the rim layer", paper[0]?.on === "frame::before" && ring[0]?.on === "ring", `${paper[0]?.on} ${ring[0]?.on}`);
  const live = between(tr, tr.frames[0].t + 1200).filter((f) => f.anims.some((a) => a.id === "qc163-tint"));
  L.check("population: frames with the breath running", live.length > 40, String(live.length));
  L.check("in every one the ring's scale equals the paper's", live.every((f) => Math.abs(f.ring - f.paper) < 0.00005), JSON.stringify(live.slice(0, 3).map((f) => [f.paper, f.ring])));
  L.done(6);
});

/* ══ QC163-3 — typing rests the tint within 200ms; it returns 2s after the last key ══════════════════════════════════ */
if (run("3")) test("QC163-3 · typing rests the tint; it returns 2s after the last key", async ({ page }) => {
  const L = new Ledger("QC163-3");
  await fresh(page, "q152-agent");
  await openDrawer(page);
  await tap(page, C("[data-qc1522='reply-types'] [data-v='req']")); await page.waitForTimeout(300);
  const field = page.locator(`${CP} textarea, ${CP} input[type='text']`).first();
  const has = (await field.count()) > 0;
  L.check("population: the drawer has a field to type in", has, "");
  if (!has) return L.done(1);
  await page.waitForFunction((s) => { const t = document.querySelector<HTMLElement>(s)?.closest(".spanel")?.querySelector<HTMLElement>("[data-qc163='tint']"); return !!t && parseFloat(getComputedStyle(t).opacity) > 0.3; }, CARD, { timeout: 8000, polling: "raf" });
  const b = (await field.boundingBox())!;
  await page.mouse.click(b.x + 10, b.y + b.height / 2);
  await startTrace(page);
  await page.keyboard.type("the agent liked the voice", { delay: 70 });
  await page.waitForTimeout(3400);
  const tr = await stopTrace(page);
  const k0 = tr.keys[0], kL = tr.keys[tr.keys.length - 1];
  L.check("population: the keys were seen in the drawer", tr.keys.length >= 15, String(tr.keys.length));
  const rest = between(tr, k0 + 200, kL + 100);
  L.check("from 200ms after the first key to the last, the tint is at rest (below 0.02)", rest.length > 15 && rest.every((f) => f.tint < 0.02), JSON.stringify([...new Set(rest.map((f) => f.tint.toFixed(3)))].slice(0, 6)));
  const early = between(tr, kL + 100, kL + 1950);
  L.check("and stays so until 2s after the last key", early.length > 10 && early.every((f) => f.tint < 0.02 && !f.anims.some((a) => a.id === "qc163-tint")), "");
  const back = between(tr, kL + 2000, kL + 3300);
  L.check("then it breathes again", back.some((f) => f.anims.some((a) => a.id === "qc163-tint" && a.play === "running")) && back.some((f) => f.tint > 0.1), `max ${Math.max(...back.map((f) => f.tint))}`);
  L.done(4);
});

/* ══ QC163-4 — at the press the tint is ≥ 0.6 within 300ms and still held 500ms into a blocked main thread (CPU 4×) ═ */
if (run("4")) test("QC163-4 · the press holds the tint at 0.72, on the compositor, through the app's freeze (CPU 4×)", async ({ page }) => {
  const L = new Ledger("QC163-4");
  await fresh(page, "q152-agent");
  await openDrawer(page);
  await tap(page, C("[data-qc1522='reply-types'] [data-v='req']")); await page.waitForTimeout(500);
  const pt = await ringPointAt(page, 0.985);
  const cdp = await throttle(page, 4);
  const sc = await screencast(page, cdp);
  await startTrace(page); await page.waitForTimeout(300);
  await press(page, SAVE);
  const ok = await waitUndo(page);
  await page.waitForTimeout(1500);
  const tr = await stopTrace(page);
  await sc.stop();
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  const p = tr.press ?? 0;
  L.check("population: the save landed", ok, "");
  const f300 = between(tr, p, p + 300);
  L.check("within 300ms of the press a painted frame shows the tint at 0.6 or more", f300.some((f) => f.tint >= 0.6), `max ${Math.max(0, ...f300.map((f) => f.tint))}`);
  L.check("in the stage of the press (queried)", f300.filter((f) => f.tint > 0.05).every((f) => f.tintBg === rgb(HEX.queried)), JSON.stringify([...new Set(f300.map((f) => f.tintBg))]));
  const long = tr.longs.filter((l) => l.start > p && l.dur >= 520).sort((a, b) => b.dur - a.dur)[0];
  L.check("population: a long task (the app's freeze) of 520ms or more after the press", !!long, JSON.stringify(tr.longs.map((l) => [Math.round(l.start - p), Math.round(l.dur)])));
  if (long) {
    /* the screencast sends a frame only when the screen changes, so a still card sends none: the screen 500ms into the
       freeze is the LATEST frame sent at or before that moment. It must be one painted after the hold reached its peak. */
    const at = long.start + 500;
    const shot = sc.shots.filter((x) => x.t <= at).pop() ?? null;
    L.check("population: the screen 500ms into the freeze is a compositor frame painted after the hold's 280ms", !!shot && shot.t >= p + RIM_HOLD_MS,
      `${shot ? Math.round(shot.t - p) + "ms after the press" : "none"} · frames inside the freeze: ${sc.shots.filter((x) => x.t > long.start && x.t < long.start + long.dur).length} (a still screen sends none)`);
    if (shot) {
      const px = await pixel(page, shot.data, pt);
      const o = opacityOf(px, HEX.queried);
      L.check("the tint is still held there (0.6 or more, read off the ring's pixel, which lies on the white → queried rim line)", o >= 0.6 && o <= 1 && onTintLine(px, HEX.queried, o), `${o.toFixed(3)} from ${px}`);
      writeFileSync(`${DIR}/frames/4x-press-mid-freeze.png`, Buffer.from(shot.data, "base64"));
    }
    /* and the painted frames either side of the freeze: held, by the hold (the landing's fade may be made, parked on its first frame) */
    const before = tr.frames.filter((f) => f.t <= long.start).pop();
    const after = tr.frames.find((f) => f.t >= long.start + long.dur);
    const ok4 = (f?: Fr) => !!f && f.anims.filter((x) => x.on === "tint").every((x) => x.id === "qc163-tint-hold" || (x.id === "qc163-tint-fade" && x.play === "paused"));
    L.check("the painted frames either side of the freeze show the tint at 0.6 or more, by the hold (any fade parked)",
      !!before && !!after && before.tint >= 0.6 && after.tint >= 0.6 && ok4(before),
      `${before?.tint} → ${after?.tint} across ${Math.round(long.dur)}ms · tint anims before: ${JSON.stringify(before?.anims.filter((x) => x.on === "tint").map((x) => `${x.id}:${x.play}`))}`);
  }
  await page.locator(UNDO).first().click().catch(() => {}); await page.waitForTimeout(2500);
  L.done(7);
});

/* ══ QC163-5/6/7 — the save's light (clockwise, the stage moved to), the undo's (mirrored, back, the stage returned to),
   the pop and the sink ══════════════════════════════════════════════════════════════════════════════════════════════ */
if (run("5") || run("6") || run("7")) test("QC163-5/6/7 · save: the light clockwise in the new stage, the pop; undo: mirrored, back, the old stage, the sink", async ({ page }) => {
  const L5 = new Ledger("QC163-5"), L6 = new Ledger("QC163-6"), L7 = new Ledger("QC163-7");
  await fresh(page, "q152-agent");
  await openDrawer(page);
  await tap(page, C("[data-qc1522='reply-types'] [data-v='req']")); await page.waitForTimeout(500);
  await startTrace(page); await page.waitForTimeout(200);
  await press(page, SAVE);
  const ok = await waitUndo(page);
  await page.waitForTimeout(2200);
  const ts = await stopTrace(page);
  L5.check("population: the save landed (queried → a partial asked for)", ok, "");
  const ls = animsOf(ts, "qc163-light");
  L5.check("one qc163-light, on the light", ls.length === 1 && ls[0].on === "light", JSON.stringify(ls.map((a) => a.on)));
  const k = ls[0]?.kf ?? [];
  L5.check("it rotates from −40deg to 320deg", k[0]?.rotate === "-40deg" && k[k.length - 1]?.rotate === "320deg", `${k[0]?.rotate} → ${k[k.length - 1]?.rotate}`);
  L5.check("1300ms, opacity 0 → 1 (14%) → 1 (76%) → 0", ls[0]?.dur === 1300 && k.map((x) => x.opacity).join() === "0,1,1,0" && k[1]?.offset === "0.14" && k[2]?.offset === "0.76", JSON.stringify(k));
  const lit = ts.frames.filter((f) => f.anims.some((a) => a.id === "qc163-light"));
  L5.check("with scale 1 1 (not mirrored)", lit.length > 10 && lit.every((f) => f.lightScale === "1 1" || f.lightScale === "1"), JSON.stringify([...new Set(lit.map((f) => f.lightScale))]));
  L5.check(`coloured for the stage moved TO (partial: ${HEX.partial} → ${HI.partial})`, lit.length > 0 && lit.every((f) => f.lightBg.includes(rgb(HEX.partial)) && f.lightBg.includes(rgb(HI.partial))), lit[0]?.lightBg ?? "");
  const pop = ts.frames.filter((f) => f.anims.some((a) => a.id === "qc160-bump"));
  const peak = Math.max(...pop.map((f) => f.frame));
  L7.check("save: population — frames with the pop running", pop.length >= 20, String(pop.length));
  L7.check("save: the pop's keyframes peak at 1.03 (42%), 620ms", (() => { const b = animsOf(ts, "qc160-bump")[0]; return b?.dur === 620 && b.kf[1]?.scale === "1.03" && b.kf[1]?.offset === "0.42"; })(), JSON.stringify(animsOf(ts, "qc160-bump")[0]?.kf));
  L7.check("save: the painted peak is above 1.025, never above 1.03", peak > 1.025 && peak <= 1.0301, String(peak));
  /* the undo */
  await startTrace(page); await page.waitForTimeout(200);
  await press(page, UNDO);
  await page.waitForTimeout(3500);
  const tu = await stopTrace(page);
  const reverted = await page.locator(CARD).getAttribute("data-qc163-stage");
  L6.check("population: the undo landed (back to queried)", reverted === "queried", String(reverted));
  const lu = animsOf(tu, "qc163-light");
  L6.check("one qc163-light", lu.length === 1, String(lu.length));
  const ku = lu[0]?.kf ?? [];
  L6.check("it rotates from 40deg to −320deg (anticlockwise)", ku[0]?.rotate === "40deg" && ku[ku.length - 1]?.rotate === "-320deg", `${ku[0]?.rotate} → ${ku[ku.length - 1]?.rotate}`);
  const litU = tu.frames.filter((f) => f.anims.some((a) => a.id === "qc163-light"));
  L6.check("mirrored: scale −1 1", litU.length > 10 && litU.every((f) => f.lightScale === "-1 1"), JSON.stringify([...new Set(litU.map((f) => f.lightScale))]));
  L6.check(`coloured for the stage returned TO (queried: ${HEX.queried} → ${HI.queried})`, litU.length > 0 && litU.every((f) => f.lightBg.includes(rgb(HEX.queried)) && f.lightBg.includes(rgb(HI.queried))), litU[0]?.lightBg ?? "");
  const sink = tu.frames.filter((f) => f.anims.some((a) => a.id === "qc160-bump"));
  L7.check("undo: population — frames with the bump running", sink.length >= 20, String(sink.length));
  L7.check("undo: the bump's keyframes dip to 0.975 (30%), 620ms, none above 1", (() => { const b = animsOf(tu, "qc160-bump")[0]; return b?.dur === 620 && b.kf[1]?.scale === "0.975" && b.kf[1]?.offset === "0.3" && b.kf.every((x) => parseFloat(x.scale) <= 1); })(), JSON.stringify(animsOf(tu, "qc160-bump")[0]?.kf));
  L7.check("undo: the frame never exceeds 1 from the press to rest", between(tu, tu.press ?? 0).every((f) => f.frame <= 1.0001), String(Math.max(...between(tu, tu.press ?? 0).map((f) => f.frame))));
  /* QC163-8's census rides along: every qc163-* and qc1612-* animation changes only opacity, rotate and scale */
  const all = [...ts.frames, ...tu.frames].flatMap((f) => f.anims).filter((a) => /^qc163-|^qc1612-/.test(a.id));
  writeFileSync(`${DIR}/ledger/${PHASE}-QC163-8-census.json`, JSON.stringify([...new Map(all.map((a) => [`${a.id}:${a.props}`, { id: a.id, props: a.props }])).values()], null, 1));
  L5.done(6); L6.done(5); L7.done(6);
});

/* ══ QC163-8 — the new animations change only opacity, rotate and scale ═════════════════════════════════════════════ */
if (run("8")) test("QC163-8 · the breath, the hold, the fade and the light change only opacity, rotate and scale", async ({ page }) => {
  const L = new Ledger("QC163-8");
  await fresh(page, "q152-agent");
  await startTrace(page);
  await openDrawer(page);
  await tap(page, C("[data-qc1522='reply-types'] [data-v='req']"));
  await page.waitForTimeout(2600);
  await press(page, SAVE);
  await waitUndo(page); await page.waitForTimeout(2000);
  await press(page, UNDO); await page.waitForTimeout(3000);
  const tr = await stopTrace(page);
  const all = new Map<string, An>();
  for (const f of tr.frames) for (const a of f.anims) if (/^qc163-|^qc1612-/.test(a.id)) all.set(`${a.id}:${a.start}`, a);
  const ids = [...new Set([...all.values()].map((a) => a.id))].sort();
  L.check("population: the breath, the tint's hold and fade, and the light were all seen", ["qc163-light", "qc163-tint", "qc163-tint-fade", "qc163-tint-hold", "qc1612-breath"].every((x) => ids.includes(x)), JSON.stringify(ids));
  const bad = [...all.values()].filter((a) => a.props.some((p) => !["opacity", "rotate", "scale"].includes(p)));
  L.check("every one animates only opacity, rotate or scale", bad.length === 0, JSON.stringify(bad.map((a) => [a.id, a.props])));
  L.check("none is on the frame's own box (the paper is its ::before)", [...all.values()].every((a) => a.on !== "frame"), JSON.stringify([...all.values()].filter((a) => a.on === "frame").map((a) => a.id)));
  L.done(3);
});

/* ══ QC163-9 — nothing inside the frame moves while the rim breathes; an ordinary click lands on a breathing card ═════ */
if (run("9")) test("QC163-9 · nothing clickable moves while the rim breathes, and an ordinary locator click lands", async ({ page }) => {
  const L = new Ledger("QC163-9");
  await fresh(page, "q152-agent");
  await openDrawer(page);
  await page.waitForTimeout(900);
  await startTrace(page);
  await page.waitForTimeout(3400);
  const tr = await stopTrace(page);
  const breathing = tr.frames.filter((f) => f.anims.some((a) => a.id === "qc163-tint" && a.play === "running"));
  L.check("population: frames with the rim breathing", breathing.length > 60, String(breathing.length));
  L.check("the rim moved in them (the paper's scale above 1.005 somewhere)", breathing.some((f) => f.paper > 1.005), String(Math.max(...breathing.map((f) => f.paper))));
  const bx = new Set(breathing.map((f) => f.boxes));
  L.check("every button in the drawer keeps one box throughout", bx.size === 1 && [...bx][0].length > 0, `${bx.size} distinct`);
  L.check("the frame's own scale stays 1", breathing.every((f) => f.frame === 1), JSON.stringify([...new Set(breathing.map((f) => f.frame))]));
  const tile = page.locator(C("[data-qc1522='reply-types'] [data-v='req']")).first();
  const t0 = Date.now();
  const clicked = await tile.click({ timeout: 30_000 }).then(() => true, () => false);
  const still = await page.evaluate((s) => !!document.querySelector<HTMLElement>(s)?.closest(".spanel")?.getAnimations({ subtree: true }).some((a) => a.id === "qc163-tint" && a.playState === "running"), CARD);
  L.check("an ordinary locator click (Playwright's own, with its stability wait) lands on a tile", clicked, `${Date.now() - t0}ms`);
  L.check("with the breath still running at the click", still || !clicked, String(still));
  L.done(6);
});

/* ══ QC163-10 — reduced motion: no qc163-* animation, the tint at 0 ═════════════════════════════════════════════════ */
if (run("10")) test("QC163-10 · with prefers-reduced-motion: reduce, no qc163-* animation is made and the tint stays at 0", async ({ page }) => {
  const L = new Ledger("QC163-10");
  await fresh(page, "q152-agent", true);
  await page.evaluate(() => { const w = window as unknown as { __made: string[] }; w.__made = []; const o = Element.prototype.animate; Element.prototype.animate = function (k, t) { const a = o.call(this, k, t); queueMicrotask(() => w.__made.push(a.id || "")); return a; }; });
  await startTrace(page);
  await openDrawer(page);
  await page.waitForTimeout(2600);
  await tap(page, C("[data-qc1522='reply-types'] [data-v='req']")); await page.waitForTimeout(300);
  await press(page, SAVE);
  const ok = await waitUndo(page); await page.waitForTimeout(1500);
  await press(page, UNDO); await page.waitForTimeout(2000);
  const tr = await stopTrace(page);
  const made = await page.evaluate(() => (window as unknown as { __made: string[] }).__made);
  L.check("population: the save landed under reduced motion", ok, "");
  L.check("no qc163-* animation was made", !made.some((x) => /^qc163-/.test(x)), JSON.stringify(made.filter((x) => /^qc163|qc1612|qc1611|qc160-bump/.test(x))));
  L.check("the tint's opacity is 0 in every frame", tr.frames.every((f) => f.tint === 0), String(Math.max(...tr.frames.map((f) => f.tint))));
  L.check("and the light's", tr.frames.every((f) => f.light === 0), "");
  L.done(4);
});

/* ══ QC163-11 — nothing lands (the press dragged off): the tint to 0 within 200ms of the press giving back, no light ═ */
if (run("11")) test("QC163-11 · pressBack: the tint back to 0 within 200ms, and no light", async ({ page }) => {
  const L = new Ledger("QC163-11");
  await fresh(page, "q152-agent");
  await openDrawer(page);
  await tap(page, C("[data-qc1522='reply-types'] [data-v='req']")); await page.waitForTimeout(500);
  await startTrace(page);
  await pointAt(page, SAVE); await page.waitForTimeout(200);
  /* down on Save, then drag off and let go elsewhere: no click, so pressAtPointer's 700ms gives it back */
  await page.mouse.down(); await page.waitForTimeout(80);
  await page.mouse.move(4, 4, { steps: 4 }); await page.mouse.up();
  await page.waitForTimeout(1600);
  const tr = await stopTrace(page);
  const p = tr.press ?? 0;
  L.check("population: the press held the tint (0.6 or more within 300ms)", between(tr, p, p + 300).some((f) => f.tint >= 0.6), String(Math.max(0, ...between(tr, p, p + 300).map((f) => f.tint))));
  const backAt = tr.frames.find((f) => f.t > p && f.anims.some((a) => a.id === "qc163-tint-back"))?.t ?? null;
  L.check("population: it was given back (qc163-tint-back) about 700ms after the press", backAt != null && backAt - p >= 650 && backAt - p <= 900, backAt != null ? `${Math.round(backAt - p)}ms` : "—");
  const after = backAt != null ? between(tr, backAt + 200) : [];
  L.check("from 200ms after that the tint is at 0", after.length > 10 && after.every((f) => f.tint < 0.005), JSON.stringify([...new Set(after.map((f) => f.tint.toFixed(3)))].slice(0, 4)));
  L.check("and no light was made", tr.frames.every((f) => !f.anims.some((a) => a.id === "qc163-light")) && tr.frames.every((f) => f.light === 0), "");
  L.check("and nothing was saved (no Undo toast)", (await page.locator(UNDO).count()) === 0, "");
  L.done(5);
});

/* ══ W — the ring's mask in WebKit: only the 7px border shows, the middle is cut out (the rule as qcv152card.css has it) ═ */
if (run("W")) test("QC163-W · the rim layer's mask in WebKit: the ring shows, the middle does not", async () => {
  const L = new Ledger("QC163-W");
  const css = readFileSync("src/components/queries/centre/qcv152card.css", "utf8");
  const rules = css.match(/\.spanel > \.qc163-rim(?: > [ib])? \{[^}]*\}/g) ?? [];
  L.check("population: the three rim rules were read from the stylesheet", rules.length === 3, String(rules.length));
  const browser = await webkit.launch();
  try {
    const p = await browser.newPage({ viewport: { width: 400, height: 400 } });
    await p.setContent(`<style>body{margin:0;background:#fff}.spanel{position:fixed;left:50px;top:50px;width:300px;height:300px;padding:7px;box-sizing:border-box}
      .spanel-own{height:100%;background:#fff}${rules.join("\n")}</style>
      <aside class="spanel"><div class="spanel-own"></div><span class="qc163-rim"><i></i><b style="background:#6f8fb3;opacity:1"></b></span></aside>`);
    const shot = await p.screenshot();
    const at = async (x: number, y: number) => p.evaluate(async ({ d, x, y }) => {
      const img = new Image(); img.src = `data:image/png;base64,${d}`; await img.decode();
      const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight; const g = c.getContext("2d")!; g.drawImage(img, 0, 0);
      const k = img.naturalWidth / 400; return [...g.getImageData(Math.round(x * k), Math.round(y * k), 1, 1).data].slice(0, 3).join(",");
    }, { d: shot.toString("base64"), x, y });
    const ring = await at(200, 53.5), side = await at(53.5, 200), mid = await at(200, 200), inner = await at(200, 62);
    writeFileSync(`${DIR}/frames/webkit-mask.png`, shot);
    L.check("WebKit: the ring (top) shows the tint", ring === "111,143,179", ring);
    L.check("WebKit: the ring (side) shows the tint", side === "111,143,179", side);
    L.check("WebKit: the middle is cut out (white)", mid === "255,255,255", mid);
    L.check("WebKit: just inside the ring is cut out too", inner === "255,255,255", inner);
  } finally { await browser.close(); }
  L.done(5);
});

/* ══ F — the frames, at CPU 1× and 4×: mid-breath on each stage; the press mid-freeze; the light a third of the way round
   on save and on undo; at rest ══════════════════════════════════════════════════════════════════════════════════════ */
if (run("F")) test("QC163-F · frames", async ({ page }) => {
  test.setTimeout(600_000);
  const index: Record<string, unknown> = {};
  const clip = (page: Page) => page.evaluate((s) => { const r = document.querySelector<HTMLElement>(s)!.closest<HTMLElement>(".spanel")!.getBoundingClientRect(); return { x: Math.max(0, r.left - 30), y: Math.max(0, r.top - 30), width: Math.min(innerWidth - Math.max(0, r.left - 30), r.width + 60), height: Math.min(innerHeight - Math.max(0, r.top - 30), r.height + 60) }; }, CARD);
  /* hold every animation where it is, shoot, play on */
  const freeze = (page: Page) => page.evaluate(() => document.getAnimations().forEach((a) => a.pause()));
  const thaw = (page: Page) => page.evaluate(() => document.getAnimations().forEach((a) => { try { a.play(); } catch { /* gone */ } }));
  for (const rate of [1, 4]) {
    for (const st of Object.keys(BY_STAGE) as St[]) {
      seed();
      await fresh(page, BY_STAGE[st]);
      const cdp = await throttle(page, rate);
      const opened = await openDrawer(page);
      if (!opened) { index[`${rate}x-breath-${st}`] = "no drawer route on this card"; await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 }); continue; }
      /* mid-breath: the tint at its peak */
      const got = await page.waitForFunction((s) => { const t = document.querySelector<HTMLElement>(s)?.closest(".spanel")?.querySelector<HTMLElement>("[data-qc163='tint']"); return !!t && parseFloat(getComputedStyle(t).opacity) > 0.66; }, CARD, { timeout: 9000, polling: "raf" }).then(() => true, () => false);
      await freeze(page);
      const o = await page.evaluate((s) => getComputedStyle(document.querySelector<HTMLElement>(s)!.closest(".spanel")!.querySelector<HTMLElement>("[data-qc163='tint']")!).opacity, CARD);
      await page.screenshot({ path: `${DIR}/frames/${rate}x-breath-${st}.png`, clip: await clip(page) });
      await thaw(page);
      index[`${rate}x-breath-${st}`] = { peakReached: got, tint: o };
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    }
    /* the save and the undo on q152-agent: the press mid-freeze (screencast), the light a third round (rotate ≥ 80deg on
       save, ≤ −80deg on undo), at rest */
    seed();
    await fresh(page, "q152-agent");
    await openDrawer(page);
    await tap(page, C("[data-qc1522='reply-types'] [data-v='req']")); await page.waitForTimeout(500);
    await page.screenshot({ path: `${DIR}/frames/${rate}x-at-rest-drawer.png`, clip: await clip(page) });
    const cdp = await throttle(page, rate);
    const sc = await screencast(page, cdp);
    await startTrace(page); await page.waitForTimeout(200);
    await press(page, SAVE);
    const third = (sign: number) => page.waitForFunction(({ s, sign }) => { const l = document.querySelector<HTMLElement>(s)?.closest(".spanel")?.querySelector<HTMLElement>("[data-qc163='light']"); return !!l && l.getAnimations().length > 0 && sign * parseFloat(getComputedStyle(l).rotate) >= 80; }, { s: CARD, sign }, { timeout: 15_000, polling: "raf" }).then(() => true, () => false);
    const s1 = await third(1);
    await freeze(page);
    await page.screenshot({ path: `${DIR}/frames/${rate}x-light-third-save.png`, clip: await clip(page) });
    await thaw(page);
    await waitUndo(page); await page.waitForTimeout(1800);
    const tr = await stopTrace(page);
    const p = tr.press ?? 0;
    const long = tr.longs.filter((l) => l.start > p).sort((a, b) => b.dur - a.dur)[0];
    const at = long ? long.start + long.dur / 2 : p + 200;
    const mid = sc.shots.reduce<{ t: number; data: string } | null>((b, x) => (!b || Math.abs(x.t - at) < Math.abs(b.t - at) ? x : b), null);
    if (mid) writeFileSync(`${DIR}/frames/${rate}x-press-mid-freeze.png`, Buffer.from(mid.data, "base64"));
    await page.screenshot({ path: `${DIR}/frames/${rate}x-at-rest-saved.png`, clip: await clip(page) });
    await press(page, UNDO);
    const s2 = await third(-1);
    await freeze(page);
    await page.screenshot({ path: `${DIR}/frames/${rate}x-light-third-undo.png`, clip: await clip(page) });
    await thaw(page);
    await page.waitForTimeout(2500);
    await sc.stop();
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    await page.screenshot({ path: `${DIR}/frames/${rate}x-at-rest-undone.png`, clip: await clip(page) });
    index[`${rate}x-landing`] = { thirdSave: s1, thirdUndo: s2, long: long ? { at: Math.round(long.start - p), dur: Math.round(long.dur) } : null, midFreezeShotMs: mid ? Math.round(mid.t - p) : null };
    console.log("QC163-F", rate, JSON.stringify(index));
  }
  writeFileSync(`${DIR}/frames/index.json`, JSON.stringify(index, null, 1));
  expect(Object.keys(index).length).toBeGreaterThanOrEqual(12);
});
