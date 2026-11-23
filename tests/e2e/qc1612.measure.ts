/**
 * Query card v161.2 — the card breathes while the writer is recording (design-refs/query-card-v161-2/). Emulator harness
 * at 1512 × 900, motion suppression lifted, CPU 1× (the breath is a slow, visible motion; nothing here is about a long
 * task); seedQc152.mjs's q152-* queries are reset first and cleaned after.
 *
 *   It is the RIM that breathes: the frame's ::before (qcv152card.css), read here as `scale`; the frame's own scale
 *   (`frameScale`) is v161.1's press and pop only.
 *   SA_PHASE=base    the branch tip's build: the at-rest pictures (QC1612-R)
 *   SA_PHASE=mutant  the mutation builds
 *   (default)        QC1612-1 … QC1612-7, each a ledger in reports/query-card-v161-2/ledger/
 *   QC1612_ONLY=rec  the screen recording (reports/query-card-v161-2/recording/)
 *   (QC1612-8 is read against dev itself after the deploy — see the report)
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync, renameSync, readdirSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { liftMotionSuppression, openRoute } from "./measure";

const PHASE = /^mutant[A-Z]?$/.test(process.env.SA_PHASE ?? "") ? process.env.SA_PHASE! /* each mutant build keeps its own ledgers */ : process.env.SA_PHASE === "base" ? "base" : "after";
const ONLY = process.env.QC1612_ONLY ?? "";
const run = (id: string) => PHASE === "base" ? id === "R" : (!ONLY && id !== "rec") || ONLY.split(",").includes(id);
const DIR = "reports/query-card-v161-2";
const VP = { width: 1512, height: 900 };
const PAGE = ".qc151.qc153";
const CARD = "[data-qp='panel'] [data-qc152='card']";
const C = (s: string) => `${CARD} ${s}`;
const CP = C("[data-qc1522='composer']");
/* 90s a test: a hung click fails fast and frees the shared slot (v161.2's first run inherited 900s from a copied
   header and held the slot for 15 minutes on one click) */
test.setTimeout(90_000);
test.use({ viewport: VP });
mkdirSync(`${DIR}/ledger`, { recursive: true });
const seed = (a = "") => execSync(`node tests/e2e/seedQc152.mjs ${a}`, { encoding: "utf8", stdio: "pipe", timeout: 60_000, killSignal: "SIGKILL" });
test.beforeAll(() => { seed(); });
test.afterAll(() => { seed("--clean"); });

class Ledger {
  rows: { name: string; ok: boolean; got: string }[] = [];
  constructor(public id: string, public part = "") {}
  check(name: string, ok: unknown, got: string) { this.rows.push({ name, ok: !!ok, got }); console.log(`${this.id} ${ok ? "✓" : "✗"} ${name} — ${got}`); }
  done(min: number) {
    writeFileSync(`${DIR}/ledger/${PHASE}-${this.id}${this.part ? `-${this.part}` : ""}.json`, JSON.stringify(this.rows, null, 1));
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
async function openAt(page: Page, route: string, reduced = false) {
  if (reduced) await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(prefs);
  await openRoute(page, route, VP);
  await liftMotionSuppression(page);
}
async function openQc(page: Page, reduced = false) {
  await openAt(page, "/queries", reduced);
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
const fresh = async (page: Page, id: string | null, reduced = false) => {
  await page.goto("about:blank");
  await openQc(page, reduced);
  if (id) await openCard(page, id);
};

/* every painted (rAF) frame: the frame's scale and transform, the animations on it (id:playState and what they animate);
   the press (pointerdown on a save) with the scale at that instant; every key typed in the drawer */
type An = { id: string; play: string; props: string[]; kf0: string | null; dur: number; rim: boolean };
type Fr = { t: number; scale: number; frameScale: number; transform: string; anims: An[]; gone: boolean; cp: boolean; boxes: string };
type Tr = { frames: Fr[]; press: number | null; atPress: number | null; keys: number[]; clicks: number[]; mark: Record<string, number> };
async function startTrace(page: Page) {
  await page.evaluate((s) => {
    const w = window as unknown as { __t: Tr & { on: boolean } };
    w.__t = { frames: [], press: null, atPress: null, keys: [], clicks: [], mark: {}, on: true };
    document.addEventListener("click", () => { w.__t.clicks.push(performance.now()); }, { capture: true });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") w.__t.clicks.push(performance.now()); }, { capture: true });
    const frameOf = () => document.querySelector<HTMLElement>(s)?.closest<HTMLElement>(".spanel") ?? null;
    const sc = (f: HTMLElement, pe?: string) => { const v = getComputedStyle(f, pe).scale; return v === "none" ? 1 : parseFloat(v); };
    document.addEventListener("pointerdown", (e) => {
      if (w.__t.press == null && (e.target as Element).closest?.("[data-qc1522='save'], [data-qc1522='later']")) {
        w.__t.press = performance.now(); const f = frameOf(); w.__t.atPress = f ? sc(f, "::before") : null;
      }
    }, { capture: true });
    document.addEventListener("keydown", (e) => { if ((e.target as Element).closest?.("[data-qc1522='composer']")) w.__t.keys.push(performance.now()); }, { capture: true });
    const tick = (t: number) => {
      if (!w.__t.on) return;
      const f = frameOf();
      if (f) {
        /* the frame's own animations and its ::before's (the rim) */
        const an = f.getAnimations({ subtree: true }).filter((a) => (a.effect as KeyframeEffect).target === f);
        /* every button in the drawer, by its box: nothing clickable may move */
        const boxes = [...f.querySelectorAll<HTMLElement>("[data-qc1522='composer'] button")].map((b) => { const r = b.getBoundingClientRect(); return `${r.x},${r.y},${r.width},${r.height}`; }).join("|");
        w.__t.frames.push({ t, scale: sc(f, "::before"), frameScale: sc(f), transform: getComputedStyle(f).transform, gone: false, cp: !!f.querySelector("[data-qc1522='composer']"), boxes,
          anims: an.map((a) => {
            const ef = a.effect as KeyframeEffect;
            const kf = ef.getKeyframes();
            const props = [...new Set(kf.flatMap((k) => Object.keys(k).filter((x) => !["offset", "computedOffset", "easing", "composite"].includes(x))))];
            return { id: a.id || (a as CSSAnimation).animationName || (a as CSSTransition).transitionProperty || "?", play: a.playState, props,
              kf0: kf[0]?.scale != null ? String(kf[0].scale) : null, dur: Number(ef.getTiming().duration) || 0, rim: ef.pseudoElement === "::before" };
          }) });
      } else w.__t.frames.push({ t, scale: 1, frameScale: 1, transform: "none", anims: [], gone: true, cp: false, boxes: "" });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, CARD);
}
const mark = (page: Page, k: string) => page.evaluate((k) => { (window as unknown as { __t: Tr }).__t.mark[k] = performance.now(); }, k);
const stopTrace = (page: Page): Promise<Tr> => page.evaluate(() => { const w = window as unknown as { __t: Tr & { on: boolean } }; w.__t.on = false; return w.__t; });
const breathing = (f: Fr) => f.anims.some((a) => a.id === "qc1612-breath" && a.play === "running");
/** the breath's shape over a window: peaks above 1.008, dips below 1.002 between, the highest value */
function breathShape(frames: Fr[]) {
  let peaks = 0, armed = true, dipsBetween = 0, seenPeak = false;
  for (const f of frames) {
    if (armed && f.scale > 1.008) { peaks++; armed = false; seenPeak = true; }
    if (!armed && f.scale < 1.002) { armed = true; if (seenPeak) dipsBetween++; }
  }
  return { peaks, dipsBetween, max: frames.length ? Math.max(...frames.map((f) => f.scale)) : null };
}
/** a click at the element's centre, by the pointer: no "stable" wait — inside the breathing frame nothing is still
 *  (that is the point), and Playwright's own click waits for two frames with the same box */
async function tap(page: Page, sel: string) {
  const l = page.locator(sel).first();
  await l.waitFor({ state: "visible", timeout: 20_000 });
  const b = (await l.boundingBox())!;
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
}
async function pointAt(page: Page, sel: string) {
  const l = page.locator(sel).first();
  await l.waitFor({ state: "visible", timeout: 20_000 });
  const b = (await l.boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
}
/** a press as a person makes one: the pointer already there, the button held for 90ms, then released */
async function press(page: Page, sel: string) {
  await pointAt(page, sel); await page.waitForTimeout(250);
  await page.mouse.down(); await page.waitForTimeout(90); await page.mouse.up();
}
const SAVE = C("[data-qc1522='composer'] [data-qc1522='save']");
const waitUndo = (page: Page) => page.locator(C("[data-qc1522='undo']")).waitFor({ timeout: 30_000 }).then(() => true, () => false);
const undo = async (page: Page) => { await page.locator(C("[data-qc1522='undo']")).first().click().catch(() => {}); await page.waitForTimeout(2500); };
const footer = async (page: Page) => { await tap(page, C("[data-qc152='reply-btn']")); };
/** "Who replied?" (the page header's and the Dashboard's Record a response): pick Rufus */
const pickRufus = async (page: Page) => {
  const it = page.locator("[data-qcrr='row'][data-id='q152-agent']").first();
  await it.waitFor({ timeout: 15_000 }); await it.click();
};
const framesAfter = (tr: Tr, t0: number, t1 = Infinity) => tr.frames.filter((f) => f.t >= t0 && f.t <= t1);

if (run("1")) test("QC1612-1 · it breathes: the drawer open and untouched for 6s (v163: one breath is 3.2s, so two peaks need 6s)", async ({ page }) => {
  const L = new Ledger("QC1612-1");
  await fresh(page, "q152-agent");
  await startTrace(page);
  await mark(page, "open");
  await footer(page);
  await page.locator(CP).waitFor();
  const title = (await page.locator(C("[data-qc1522='composer-title']")).innerText()).trim();
  L.check(`population: the drawer is "What did Rufus say?"`, title === "What did Rufus say?", title);
  await page.waitForTimeout(6000);
  const tr = await stopTrace(page);
  const o = tr.mark.open;
  const win = framesAfter(tr, o, o + 6000);
  const s = breathShape(win);
  L.check("population: frames sampled over the 6s", win.length > 160, String(win.length));
  L.check("the frame's scale passes above 1.008 at least twice", s.peaks >= 2, `${s.peaks} peaks`);
  L.check("and returns below 1.002 between", s.dipsBetween >= 1, `${s.dipsBetween} dips`);
  L.check("it never exceeds 1.011", s.max != null && s.max <= 1.011, String(s.max));
  const first = win.find((f) => f.scale > 1.0005);
  L.check("it starts 300ms after the drawer's 320ms entrance (no sooner than 600ms after the press)", first != null && first.t - o >= 600, `${first ? Math.round(first.t - o) : "—"}ms`);
  const breaths = new Set(win.flatMap((f) => f.anims.filter((a) => a.id === "qc1612-breath")).map((a) => a.kf0));
  L.check("one breathing animation at most in any frame", win.every((f) => f.anims.filter((a) => a.id === "qc1612-breath").length <= 1), String(Math.max(...win.map((f) => f.anims.filter((a) => a.id === "qc1612-breath").length))));
  L.check("it animates scale only, never transform", win.flatMap((f) => f.anims).filter((a) => a.id === "qc1612-breath").every((a) => a.props.join() === "scale") && win.every((f) => f.transform === "none"), JSON.stringify([...breaths]));
  L.check("it is the rim that breathes (the frame's ::before)", win.flatMap((f) => f.anims).filter((a) => a.id === "qc1612-breath").every((a) => a.rim), "");
  const settled = win.filter((f) => f.t - o >= 700);
  L.check("the frame itself never scales: scale 1 in every frame", settled.length > 60 && settled.every((f) => f.frameScale === 1), JSON.stringify([...new Set(settled.map((f) => f.frameScale))].slice(0, 5)));
  const bx = new Set(settled.map((f) => f.boxes));
  L.check("nothing clickable moves: every button in the drawer has one box throughout", bx.size === 1 && [...bx][0].length > 0, `${bx.size} distinct`);
  L.done(10);
});

const WAYS_IN: { what: string; j: string; go: (p: Page, L: Ledger) => Promise<void> }[] = [
    { what: "the footer's Record a response (reply)", j: "reply", go: async (p) => { await fresh(p, "q152-agent"); await footer(p); } },
    { what: "the grid card's arrow chip", j: "send", go: async (p, L) => {
      await fresh(p, null);
      /* a chip that opens a journey (a waiting or quiet card's chip only opens the card: lib/qc154 chipPress) */
      const chip = p.locator(`${PAGE} [data-qc154='card'][data-id='q152-materials'] [data-qc154='act']`).first();
      L.check("the grid card's arrow chip: population — Mira's chip acts", (await chip.getAttribute("data-mode")) === "sent", String(await chip.getAttribute("data-mode")));
      await chip.scrollIntoViewIfNeeded(); await p.locator(`${PAGE} [data-qc154='card'][data-id='q152-materials']`).first().hover(); await chip.click({ force: true });
    } },
    { what: "the page header's Record a response", j: "reply", go: async (p) => { await fresh(p, null); await p.locator("[data-qc151='record']").first().click(); await pickRufus(p); } },
    { what: "the Dashboard's Record a response", j: "reply", go: async (p) => {
      await p.goto("about:blank"); await openAt(p, "/dashboard");
      const b = p.locator("[data-d2='record']").first(); await b.waitFor({ timeout: 30_000 }); await b.click(); await pickRufus(p);
    } },
    { what: "the To-do desk's They did reply → Record what {first} said", j: "reply", go: async (p, L) => {
      await p.goto("about:blank"); await openAt(p, "/todo");
      /* a gone-quiet task (todoWs.measure.ts reads a row's kind the same way); Quinn's if it is listed */
      const rows = p.locator('[data-tws="page"]:visible [data-tws-row]');
      await rows.first().waitFor({ timeout: 30_000 });
      const quiet = rows.filter({ has: p.locator(".tws-tx b", { hasText: /gone quiet/ }) });
      const quinn = quiet.filter({ hasText: /Quinn/ });
      const row = (await quinn.count()) ? quinn.first() : quiet.first();
      L.check("the To-do desk: population — a gone-quiet task", (await quiet.count()) > 0, `${await quiet.count()} (${await quinn.count()} Quinn's)`);
      await row.click(); await p.waitForTimeout(800);
      const desk = p.locator('[data-tws="desk"]:visible');
      await desk.locator("[data-tws-opt='replied']").first().click(); await p.waitForTimeout(500);
      await desk.getByRole("button", { name: /^Record what .+ said/ }).first().click();
    } },
    { what: "a send journey (Mira's Mark partial sent)", j: "send", go: async (p) => { await fresh(p, "q152-materials"); await footer(p); } },
    { what: "a nudge journey (Priya's Log a nudge)", j: "nudge", go: async (p) => { await fresh(p, "q152-nudge"); await footer(p); } },
    { what: "a close journey (Nell's Close the query)", j: "close", go: async (p) => { await fresh(p, "q152-nudgedquiet"); await footer(p); } },
  ];
if (run("2")) for (const [i, w] of WAYS_IN.entries()) test(`QC1612-2.${i + 1} · every way in: ${w.what}`, async ({ page }) => {
  const L = new Ledger("QC1612-2", String(i + 1));
  try { await w.go(page, L); await page.locator(CP).waitFor({ timeout: 20_000 }); }
  catch (e) { L.check(`${w.what}: the drawer opened`, false, String(e).slice(0, 160)); L.done(1); return; }
  const j = await page.locator(CP).getAttribute("data-j");
  L.check(`${w.what}: population — the drawer is the ${w.j} journey`, j === w.j, String(j));
  await startTrace(page); await page.waitForTimeout(2800);
  const tr = await stopTrace(page);
  const s = breathShape(tr.frames);
  L.check(`${w.what}: it breathes (a running breath, the scale above 1.008)`, tr.frames.some(breathing) && s.peaks >= 1 && (s.max ?? 0) <= 1.011, `${s.peaks} peaks, max ${s.max}`);
  L.done(2);
});

const toReq = async (p: Page) => { await tap(p, C("[data-qc1522='reply-types'] [data-v='req']")); await p.waitForTimeout(400); };
const WAYS_OUT: { what: string; open?: (p: Page) => Promise<void>; prep?: (p: Page) => Promise<void>; act: (p: Page) => Promise<void>; save?: boolean; key?: boolean }[] = [
    { what: "Cancel", act: async (p) => { await tap(p, C("[data-qc1522='cancel']")); } },
    { what: "✕", act: async (p) => { await tap(p, C("[data-qc1522='composer-x']")); } },
    { what: "Escape", act: async (p) => { await p.keyboard.press("Escape"); }, key: true },
    { what: "discard (Cancel with words typed, then Discard)", prep: async (p) => { await toReq(p); await p.locator(C("[data-qc1522='their-words']")).fill("QC1612"); await tap(p, C("[data-qc1522='cancel']")); await p.waitForTimeout(300); await p.waitForTimeout(2300); },
      act: async (p) => { await tap(p, C("[data-qc1522='discard']")); } },
    { what: "stepping to another query", act: async (p) => { await tap(p, C("[data-qc152='next']")); } },
    { what: "closing the card", act: async (p) => { await tap(p, C("[data-qc149c='close']")); } },
    { what: "a save", prep: toReq, act: async (p) => { await press(p, SAVE); }, save: true },
    { what: "← Someone else (Cancel, when the query came from Who replied?)", open: async (p) => { await fresh(p, null); await p.locator("[data-qc151='record']").first().click(); await pickRufus(p); },
      act: async (p) => { await tap(p, C("[data-qc1522='cancel']")); } },
  ];
if (run("3")) for (const [i, o] of WAYS_OUT.entries()) test(`QC1612-3.${i + 1} · every way out: ${o.what}`, async ({ page }) => {
  const L = new Ledger("QC1612-3", String(i + 1));
    if (o.save) seed();
    if (o.open) await o.open(page); else { await fresh(page, "q152-agent"); await footer(page); }
    await page.locator(CP).waitFor();
    if (o.prep) await o.prep(page);
    await page.waitForTimeout(2400);
    await startTrace(page); await page.waitForTimeout(150);
    const was = await page.evaluate((s) => !!document.querySelector<HTMLElement>(s)?.closest<HTMLElement>(".spanel")?.getAnimations({ subtree: true }).some((a) => a.id === "qc1612-breath" && a.playState === "running"), CARD);
    L.check(`${o.what}: population — breathing before it`, was, "");
    try { await mark(page, "out"); await o.act(page); } catch (e) { L.check(`${o.what}: could be done`, false, String(e).slice(0, 160)); await stopTrace(page); L.done(1); return; }
    /* (1500ms, not 700: closing the card re-renders the page under it, and in 500ms it may paint only one frame) */
    if (o.save) { await waitUndo(page); await page.waitForTimeout(1600); } else await page.waitForTimeout(1500);
    const tr = await stopTrace(page);
    /* the moment the way out happened: the page's own click (or Escape) after the mark */
    /* (a key has no actionability wait: the mark is its moment; the app's Escape layer takes the key before a listener here) */
    const at = o.key ? tr.mark.out : tr.clicks.find((c) => c >= tr.mark.out) ?? tr.mark.out;
    L.check(`${o.what}: population — the action reached the page`, o.key || o.save || tr.clicks.some((c) => c >= tr.mark.out), "");
    const left = tr.frames.find((f) => f.t >= at && !f.cp);
    console.log(`QC1612-3 note · ${o.what}: the drawer left the page ${left ? Math.round(left.t - at) : "—"}ms after it`);
    if (o.save) {
      const after = framesAfter(tr, (tr.press ?? at) + 200);
      L.check(`${o.what}: the press took over — no breath 200ms after the press`, after.length > 10 && !after.some(breathing), `${after.filter(breathing).length} frames breathing`);
      const last = tr.frames[tr.frames.length - 1];
      L.check(`${o.what}: at scale 1 once the pop ends, no breath left`, last?.scale === 1 && !last.anims.some((a) => a.id === "qc1612-breath"), `${last?.scale} ${JSON.stringify(last?.anims.map((a) => a.id))}`);
      await undo(page);
    } else {
      const after = framesAfter(tr, at + 200);
      /* (closing the card re-renders the page under it: fewer frames are painted, so the population floor is 3) */
      L.check(`${o.what}: the frame is at scale 1 within 200ms, and stays there`, after.length >= 3 && after.every((f) => f.scale === 1 && f.frameScale === 1), `${after.length} frames: ${JSON.stringify([...new Set(after.map((f) => f.scale))].slice(0, 6))}`);
      L.check(`${o.what}: no breathing animation remains`, after.every((f) => !f.anims.some((a) => a.id === "qc1612-breath")), JSON.stringify([...new Set(after.flatMap((f) => f.anims.map((a) => `${a.id}:${a.play}`)))]));
    }
    L.done(4);
});

if (run("4")) test("QC1612-4 · still while typing in Their words; breathing again 2.5s after the last key", async ({ page }) => {
  const L = new Ledger("QC1612-4");
  await fresh(page, "q152-agent");
  await footer(page); await page.locator(CP).waitFor();
  await tap(page, C("[data-qc1522='reply-types'] [data-v='req']")); await page.waitForTimeout(400);
  await tap(page, C("[data-qc1522='their-words']"));
  await page.waitForTimeout(2600);
  await startTrace(page); await page.waitForTimeout(100);
  const was = await page.evaluate((s) => document.querySelector<HTMLElement>(s)!.closest<HTMLElement>(".spanel")!.getAnimations({ subtree: true }).some((a) => a.id === "qc1612-breath"), CARD);
  L.check("population: breathing before the first key", was, "");
  await page.keyboard.type("They loved the voice.", { delay: 110 });
  await page.waitForTimeout(3600);
  const tr = await stopTrace(page);
  const k0 = tr.keys[0], kL = tr.keys[tr.keys.length - 1];
  L.check("population: the keys were seen in the drawer", tr.keys.length >= 15, String(tr.keys.length));
  const typing = framesAfter(tr, k0 + 250, kL + 100);
  L.check("from 250ms after the first key to the last, the frame is at scale 1", typing.length > 20 && typing.every((f) => f.scale === 1), JSON.stringify([...new Set(typing.map((f) => f.scale))].slice(0, 6)));
  L.check("and no breath runs while typing", typing.every((f) => !breathing(f)), "");
  const back = framesAfter(tr, kL + 2500, kL + 3600);
  L.check("2.5s after the last key it is breathing again", back.some(breathing) && back.some((f) => f.scale > 1.0005), `${back.filter(breathing).length} frames, max ${Math.max(...back.map((f) => f.scale))}`);
  const early = framesAfter(tr, kL + 100, kL + 1900);
  L.check("and not before 2s after it", early.length > 10 && early.every((f) => f.scale === 1), JSON.stringify([...new Set(early.map((f) => f.scale))].slice(0, 6)));
  L.done(6);
});

if (run("5")) test("QC1612-5 · hands over: a press mid-breath, no jump, then the press-in and the pop", async ({ page }) => {
  const L = new Ledger("QC1612-5");
  seed();
  await fresh(page, "q152-agent");
  await footer(page); await page.locator(CP).waitFor();
  await tap(page, C("[data-qc1522='reply-types'] [data-v='req']")); await page.waitForTimeout(400);
  await pointAt(page, SAVE); await page.waitForTimeout(1500);
  /* wait for mid-breath: the rim above 1.006 */
  await page.waitForFunction((s) => { const f = document.querySelector<HTMLElement>(s)?.closest<HTMLElement>(".spanel"); return !!f && parseFloat(getComputedStyle(f, "::before").scale) > 1.006; }, CARD, { timeout: 8000, polling: "raf" });
  await startTrace(page); await page.waitForTimeout(40);
  await page.mouse.down(); await page.waitForTimeout(90); await page.mouse.up();
  const ok = await waitUndo(page); await page.waitForTimeout(1800);
  const tr = await stopTrace(page);
  L.check("population: the save landed", ok, "");
  L.check("population: pressed mid-breath (the rim at the press above 1.004)", (tr.atPress ?? 0) > 1.004, String(tr.atPress));
  const rest = tr.frames.flatMap((f) => f.anims).find((a) => a.id === "qc1612-rest");
  L.check("the rim eases back from where it was (within 0.004), over the press-in's 120ms", rest?.kf0 != null && tr.atPress != null && Math.abs(parseFloat(rest.kf0) - tr.atPress) <= 0.004 && rest.dur === 120 && rest.rim, `${rest?.kf0} from ${tr.atPress}, ${rest?.dur}ms`);
  const p = tr.press ?? 0;
  const span = tr.frames.filter((f) => f.t >= p - 60 && f.t <= p + 400);
  const step = (k: "scale" | "frameScale") => span.slice(1).map((f, i) => ({ d: Math.abs(f[k] - span[i][k]), gap: f.t - span[i].t })).filter((x) => x.gap <= 20);
  const rs = step("scale"), fs = step("frameScale");
  L.check("population: painted frames across the hand-over", rs.length >= 4, String(rs.length));
  L.check("no frame-to-frame change greater than 0.004 in the rim, nor in the frame, from the press", rs.every((x) => x.d <= 0.004) && fs.every((x) => x.d <= 0.004), `rim ${Math.max(...rs.map((x) => x.d)).toFixed(5)} · frame ${Math.max(...fs.map((x) => x.d)).toFixed(5)}`);
  const held = tr.frames.find((f) => f.t > p && Math.abs(f.frameScale - 0.985) < 0.0005);
  L.check("then the press-in to 0.985 (the frame, as v161.1 built it)", !!held, held ? `${Math.round(held.t - p)}ms` : "—");
  const peak = Math.max(...tr.frames.filter((f) => f.anims.some((a) => a.id === "qc160-bump")).map((f) => f.frameScale));
  L.check("and the pop to above 1.025, never above 1.03 (v163)", peak > 1.025 && peak <= 1.0301, String(peak));
  L.check("the rim is at 1 by then, and stays", tr.frames.filter((f) => f.anims.some((a) => a.id === "qc160-bump")).every((f) => f.scale === 1), "");
  await undo(page);
  L.done(8);
});

if (run("6")) test("QC1612-6 · not otherwise: reading the card, a tab change and the edit mode start no scale animation", async ({ page }) => {
  const L = new Ledger("QC1612-6");
  await fresh(page, null);
  await startTrace(page);
  await page.locator(`${PAGE} [data-qc154='card'][data-id='q152-agent'] [data-qc154='name']`).first().click();
  await page.locator(`${CARD}[data-id='q152-agent']`).waitFor();
  await page.waitForTimeout(3000);
  let tr = await stopTrace(page);
  const scaleAnims = (t: Tr) => [...new Set(t.frames.flatMap((f) => f.anims.filter((a) => a.props.includes("scale") || a.props.includes("transform")).map((a) => a.id)))];
  L.check("reading the card (3s from opening): population — sampled", tr.frames.filter((f) => !f.gone).length > 60, String(tr.frames.length));
  L.check("reading the card: no scale animation on the frame or its rim", scaleAnims(tr).length === 0 && tr.frames.every((f) => f.scale === 1 && f.frameScale === 1), JSON.stringify(scaleAnims(tr)));
  await startTrace(page);
  await tap(page, C("[data-qc152='tab'][data-tab='agent']")); await page.waitForTimeout(1200);
  await tap(page, C("[data-qc152='tab'][data-tab='tracking']")); await page.waitForTimeout(1500);
  tr = await stopTrace(page);
  L.check("a tab change: no scale animation on the frame", tr.frames.length > 60 && scaleAnims(tr).length === 0 && tr.frames.every((f) => f.scale === 1 && f.frameScale === 1), JSON.stringify(scaleAnims(tr)));
  await startTrace(page);
  /* Query card v168 — re-pointed: the whole-card edit mode (the band's pencil) is retired; the editing that remains is
     one thing opened from its pencil, here a step in place */
  await page.locator(C("[data-qc152='thread'] > [data-qc168-host]")).first().hover();
  await tap(page, C("[data-qc152='thread'] > [data-qc168-host] [data-qc168='pen']"));
  await page.waitForTimeout(400);
  const edit = await page.locator(C("[data-qc1522='step-edit']")).count();
  await page.waitForTimeout(2600);
  tr = await stopTrace(page);
  L.check("population: a step is open in place", edit > 0, String(edit));
  L.check("a step open in place: no scale animation on the frame", tr.frames.length > 60 && scaleAnims(tr).length === 0 && tr.frames.every((f) => f.scale === 1 && f.frameScale === 1), JSON.stringify(scaleAnims(tr)));
  L.done(5);
});

if (run("7")) test("QC1612-7 · reduced motion: opening the drawer creates no animation on the frame", async ({ page }) => {
  const L = new Ledger("QC1612-7");
  await fresh(page, "q152-agent", true);
  L.check("population: reduced motion is on", await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches), "");
  await startTrace(page);
  await footer(page); await page.locator(CP).waitFor();
  await page.waitForTimeout(3000);
  await tap(page, C("[data-qc1522='reply-types'] [data-v='req']")); await page.waitForTimeout(300);
  await tap(page, C("[data-qc1522='their-words']")); await page.keyboard.type("QC1612", { delay: 80 });
  await page.waitForTimeout(2600);
  const tr = await stopTrace(page);
  L.check("population: the drawer was open throughout (sampled)", tr.frames.length > 120, String(tr.frames.length));
  L.check("no animation of any kind on the frame", tr.frames.every((f) => f.anims.length === 0), JSON.stringify([...new Set(tr.frames.flatMap((f) => f.anims.map((a) => a.id)))]));
  L.check("its scale and its rim's are 1 throughout", tr.frames.every((f) => f.scale === 1 && f.frameScale === 1), JSON.stringify([...new Set(tr.frames.map((f) => f.scale))]));
  await tap(page, C("[data-qc1522='cancel']")).catch(() => {});
  await tap(page, C("[data-qc1522='discard']")).catch(() => {});
  L.done(4);
});

/* QC1612-R · the card at rest is the branch tip's, pixel for pixel: the rim and its shadow moved from the frame onto its
   ::before. Reduced motion (nothing animates); the reading card, then the drawer open. SA_PHASE=base writes the tip's. */
if (run("R")) test("QC1612-R · at rest, the card is pixel-identical to the branch tip's", async ({ page }) => {
  const L = new Ledger("QC1612-R");
  mkdirSync(`${DIR}/rest`, { recursive: true });
  await fresh(page, "q152-agent", true);
  await page.mouse.move(2, 2); await page.waitForTimeout(800);
  const clip = await page.evaluate((s) => { const r = document.querySelector<HTMLElement>(s)!.closest<HTMLElement>(".spanel")!.getBoundingClientRect(); const x = Math.max(0, r.x - 110), y = Math.max(0, r.y - 60); return { x, y, width: Math.min(innerWidth - x, r.width + 220), height: Math.min(innerHeight - y, r.height + 170) }; }, CARD);
  const shots: Record<string, Buffer> = {};
  shots.read = await page.screenshot({ clip });
  await footer(page); await page.locator(CP).waitFor(); await page.mouse.move(2, 2); await page.waitForTimeout(800);
  shots.drawer = await page.screenshot({ clip });
  for (const [k, b] of Object.entries(shots)) writeFileSync(`${DIR}/rest/${PHASE}-${k}.png`, b);
  writeFileSync(`${DIR}/rest/${PHASE}-clip.json`, JSON.stringify(clip));
  if (PHASE === "base") { L.check("the branch tip's pictures written", true, JSON.stringify(clip)); L.done(1); return; }
  const baseClip = JSON.parse(readFileSync(`${DIR}/rest/base-clip.json`, "utf8"));
  L.check("population: the same clip as the tip's", JSON.stringify(baseClip) === JSON.stringify(clip), `${JSON.stringify(baseClip)} · ${JSON.stringify(clip)}`);
  for (const k of Object.keys(shots)) {
    const a = readFileSync(`${DIR}/rest/base-${k}.png`).toString("base64"), b = shots[k].toString("base64");
    /* decoded in the page: the count of pixels whose RGBA differs at all */
    const diff = await page.evaluate(async ([a, b]) => {
      const img = async (d: string) => { const i = new Image(); i.src = `data:image/png;base64,${d}`; await i.decode(); return i; };
      const [ia, ib] = [await img(a), await img(b)];
      if (ia.width !== ib.width || ia.height !== ib.height) return -1;
      const px = (i: HTMLImageElement) => { const c = document.createElement("canvas"); c.width = i.width; c.height = i.height; const x = c.getContext("2d")!; x.drawImage(i, 0, 0); return x.getImageData(0, 0, i.width, i.height).data; };
      const da = px(ia), db = px(ib);
      let n = 0;
      for (let j = 0; j < da.length; j += 4) if (da[j] !== db[j] || da[j + 1] !== db[j + 1] || da[j + 2] !== db[j + 2] || da[j + 3] !== db[j + 3]) n++;
      return n;
    }, [a, b]);
    L.check(`${k}: no pixel differs from the branch tip's`, diff === 0, `${diff} pixels`);
  }
  await tap(page, C("[data-qc1522='cancel']"));
  L.done(3);
});

/* an ordinary Playwright click (its actionability checks, "stable" included) on a drawer button, suppression lifted and
   the breath running: it lands, within its own 30s action timeout */
if (run("click")) test("QC1612 · an ordinary locator click lands on a breathing card", async ({ page }) => {
  const L = new Ledger("QC1612-click");
  await fresh(page, "q152-agent");
  await footer(page); await page.locator(CP).waitFor();
  await page.waitForTimeout(1500);
  const was = await page.evaluate((s) => !!document.querySelector<HTMLElement>(s)?.closest<HTMLElement>(".spanel")?.getAnimations({ subtree: true }).some((a) => a.id === "qc1612-breath" && a.playState === "running"), CARD);
  L.check("population: the breath is running", was, "");
  const t0 = Date.now();
  let err = "";
  await page.locator(C("[data-qc1522='reply-types'] [data-v='req']")).click({ timeout: 30_000 }).catch((e) => { err = String(e).slice(0, 200); });
  const ms = Date.now() - t0;
  L.check("the click resolved", !err, err || `${ms}ms`);
  L.check("it landed: the reply's questions are showing (Their words)", await page.locator(C("[data-qc1522='their-words']")).count() > 0, `${ms}ms`);
  L.done(3);
});

/* the screen recording: the drawer opening, four seconds of breathing, typing, then a save (and its Undo, to restore) */
if (run("rec")) test("QC1612 · recording", async ({ browser }) => {
  seed();
  mkdirSync(`${DIR}/recording`, { recursive: true });
  const ctx = await browser.newContext({ storageState: test.info().project.use.storageState as string, viewport: VP, recordVideo: { dir: `${DIR}/recording/raw`, size: VP } });
  const page = await ctx.newPage();
  await openQc(page);
  await openCard(page, "q152-agent");
  await page.waitForTimeout(800);
  await footer(page); await page.locator(CP).waitFor();
  await page.waitForTimeout(4600);
  await tap(page, C("[data-qc1522='reply-types'] [data-v='req']")); await page.waitForTimeout(900);
  await tap(page, C("[data-qc1522='their-words']"));
  await page.keyboard.type("Loved the opening. Send the first fifty pages.", { delay: 95 });
  await page.waitForTimeout(3000);
  await press(page, SAVE);
  await waitUndo(page); await page.waitForTimeout(2200);
  await undo(page);
  await ctx.close();
  const raw = readdirSync(`${DIR}/recording/raw`).filter((f) => f.endsWith(".webm"));
  renameSync(`${DIR}/recording/raw/${raw[0]}`, `${DIR}/recording/qc1612-breathe.webm`);
  execSync(`rm -rf ${DIR}/recording/raw`);
});
