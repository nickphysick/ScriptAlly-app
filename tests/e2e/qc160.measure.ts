/**
 * Query card v160 — the card bumps on save, and confirm and undo ease in (design-refs/query-card-v160/). Measured on the
 * emulator harness (seedQc152.mjs's q152-* queries) at 1512 × 900.
 *
 *   SA_PHASE=before  Step 0.6: a per-frame trace of one save and one undo, to reports/query-card-v160/trace-*.json —
 *                    every property that changes in a single frame, and whether the card re-mounts.
 *   SA_PHASE=mutant  the mutation build: every lock must read red.
 *   (default)        QC160-1 … QC160-13, each a ledger in reports/query-card-v160/ledger/.
 *
 * ⚠️ THE CARD LEANS: boxes are layout boxes (offsetTop/Height), never bounding rects, which the rotation skews.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { liftMotionSuppression, openRoute } from "./measure";

const PHASE = process.env.SA_PHASE === "before" ? "before" : /^mutant[A-Z]?$/.test(process.env.SA_PHASE ?? "") ? process.env.SA_PHASE! /* each mutant build keeps its own ledgers */ : "after";
const ONLY = process.env.QC160_ONLY ?? "";
const run = (id: string) => !ONLY || ONLY.split(",").includes(id);
const DIR = "reports/query-card-v160";
const VP = { width: 1512, height: 900 };
const PAGE = ".qc151.qc153";
const CARD = "[data-qp='panel'] [data-qc152='card']";
const C = (s: string) => `${CARD} ${s}`;
test.setTimeout(600_000);
mkdirSync(`${DIR}/ledger`, { recursive: true });
mkdirSync(`${DIR}/frames`, { recursive: true });

const seed = (a = "") => execSync(`node tests/e2e/seedQc152.mjs ${a}`, { encoding: "utf8", stdio: "pipe", timeout: 60_000, killSignal: "SIGKILL" });
const dump = (key: string) => JSON.parse(execSync(`node tests/e2e/seedQc152.mjs --dump ${key}`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 60_000, killSignal: "SIGKILL" }).trim().split("\n").pop()!);
test.beforeAll(() => { seed(); });
test.afterAll(() => { seed("--clean"); });

class Ledger {
  rows: { name: string; ok: boolean; got: string }[] = [];
  skipped: string[] = [];
  constructor(public id: string) {}
  check(name: string, ok: unknown, got: string) { this.rows.push({ name, ok: !!ok, got }); console.log(`${this.id} ${ok ? "✓" : "✗"} ${name} — ${got}`); }
  done(min: number) {
    writeFileSync(`${DIR}/ledger/${PHASE}-${this.id}.json`, JSON.stringify(this.rows, null, 1));
    expect(this.rows.length, `${this.id}: assertions run`).toBeGreaterThanOrEqual(min);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.name} — ${r.got}`)).toEqual([]);
  }
}

/** ⚠️ THE HARNESS KILLS CSS MOTION (measure.ts KILL_MOTION: every transition and animation `none !important`). v160 is
 *  motion, and its reduced-motion lock is only true with the app's own CSS live, so every page here lifts it. */
async function open(page: Page, reduced = false, group = "attention") {
  if (reduced) await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript((g) => {
    try {
      sessionStorage.removeItem("qh.qc.filters"); sessionStorage.removeItem("qh.qc.collapsed1511"); sessionStorage.setItem("qh.qc.view150", "list");
      localStorage.setItem("qh.qc.view", JSON.stringify({ v: 1, group: g, sort: { key: "due", reversed: false }, density: "comfortable" }));
      localStorage.setItem("sa.guide.queries", "1"); localStorage.setItem("sa.guide.queries-explainer", "1"); localStorage.removeItem("sa.pinList.queries");
    } catch { /* private mode */ }
  }, group);
  await openRoute(page, "/queries", VP);
  await liftMotionSuppression(page);
  await page.waitForSelector(`${PAGE} [data-qc153="bar"]`, { timeout: 60_000 });
  const lb = page.locator(`${PAGE} [data-qc153="bar"] button[data-v="list"]`);
  if ((await lb.getAttribute("aria-pressed")) !== "true" && await lb.isEnabled()) await lb.click();
  await page.locator(`${PAGE} [data-qc154='card'][data-id^='q152-']`).first().waitFor({ timeout: 60_000 });
  const more = page.locator(`${PAGE} [data-qc153='show-all']`);
  for (let i = 0; i < 6 && (await more.count()) > 0; i++) await more.first().click({ timeout: 5_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);
  await page.mouse.move(2, 2);
}
async function openCard(page: Page, key: string) {
  const c = page.locator(`${PAGE} [data-qc154='card'][data-id='q152-${key}']`);
  await c.scrollIntoViewIfNeeded();
  await c.locator("[data-qc154='name']").first().click();
  await page.locator(`${CARD}[data-id='q152-${key}']`).waitFor({ timeout: 15_000 });
  await page.waitForTimeout(900);
}
const click = async (page: Page, sel: string, wait = 350) => { await page.locator(sel).first().click({ timeout: 8000 }); await page.waitForTimeout(wait); };

/** a per-frame recorder of everything the card draws that a save or an undo changes */
async function startTrace(page: Page) {
  await page.evaluate((cardSel) => {
    const w = window as unknown as { __tr: unknown[]; __trOn: boolean; __ids: WeakMap<object, number>; __n: number };
    w.__tr = []; w.__trOn = true; w.__ids = w.__ids ?? new WeakMap(); w.__n = w.__n ?? 0;
    const idOf = (o: object | null) => { if (!o) return 0; if (!w.__ids.has(o)) w.__ids.set(o, ++w.__n); return w.__ids.get(o)!; };
    const t0 = performance.now();
    const tick = () => {
      if (!w.__trOn) return;
      const card = document.querySelector<HTMLElement>(cardSel);
      const frame = card?.closest<HTMLElement>(".spanel") ?? null;
      const band = card?.querySelector<HTMLElement>("[data-qc152='band']") ?? null;
      const pill = card?.querySelector<HTMLElement>("[data-qc152='pill']") ?? null;
      const foot = card?.querySelector<HTMLElement>("[data-qc152='reply']") ?? null;
      const msgs = card ? [...card.querySelectorAll<HTMLElement>("[data-qc152='thread'] > .qc152-m")] : [];
      const last = msgs[msgs.length - 1] ?? null;
      const bx = last?.querySelector<HTMLElement>(".qc152-bx") ?? null;
      const toast = card?.querySelector<HTMLElement>("[data-qc1522='toast']") ?? null;
      const cs = (e: HTMLElement | null) => (e ? getComputedStyle(e) : null);
      const anims = card ? [...(frame ?? card).getAnimations({ subtree: true })].map((a) => {
        const t = (a.effect as KeyframeEffect | null)?.target as HTMLElement | null;
        const props = ((a.effect as KeyframeEffect | null)?.getKeyframes() ?? []).flatMap((k) => Object.keys(k).filter((x) => !["offset", "easing", "composite", "computedOffset"].includes(x)));
        return `${t?.className?.toString().split(" ")[0] ?? "?"}:${(a as CSSAnimation).animationName ?? [...new Set(props)].join("+")}`;
      }) : [];
      w.__tr.push({
        t: Math.round(performance.now() - t0), card: idOf(card), frame: idOf(frame),
        frameScale: cs(frame)?.scale, frameRotate: cs(frame)?.rotate, frameTranslate: cs(frame)?.translate, frameTransform: cs(frame)?.transform,
        bandBg: cs(band)?.backgroundColor, bandImg: cs(band)?.backgroundImage?.slice(0, 60), bandWord: band?.querySelector("[data-qc152='band-word']")?.textContent,
        pill: pill?.textContent, pillBg: cs(pill)?.backgroundColor,
        foot: foot?.textContent?.slice(0, 80), footH: foot?.offsetHeight, footOp: cs(foot)?.opacity,
        msgs: msgs.length, lastId: idOf(last), lastCls: last?.className, lastTitle: last?.querySelector("[data-qc152='msg-title']")?.textContent, lastText: last?.textContent?.slice(0, 60),
        lastBg: cs(bx)?.backgroundColor, lastBorder: cs(bx)?.borderTopStyle, lastOutline: `${cs(bx)?.outlineStyle} ${cs(bx)?.outlineColor}`, lastOp: cs(last)?.opacity, lastH: last?.offsetHeight,
        toast: toast?.textContent, toastOp: cs(toast)?.opacity, anims,
        ghost: card?.querySelector("[data-qc160='toast-out']")?.textContent ?? null, ghostOp: cs(card?.querySelector<HTMLElement>("[data-qc160='toast-out']") ?? null)?.opacity ?? null,
        lastBgSize: cs(bx)?.backgroundSize, lastBgImg: cs(bx)?.backgroundImage?.slice(0, 50), lastScale: cs(last)?.scale, lastDraft: last?.dataset.qc1522 === "draft",
        lastBxAnims: bx ? bx.getAnimations().map((a) => a.id || (a as CSSAnimation).animationName || "?") : [],
        tagged: (() => { const g = (window as unknown as { __tag?: HTMLElement }).__tag; return g ? { in: g.isConnected, draft: g.dataset.qc1522 === "draft", isLast: g === last, cls: g.className } : null; })(),
        cardBand: card ? getComputedStyle(card).getPropertyValue("--band").trim() : null,
      });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, CARD);
}
async function stopTrace(page: Page): Promise<Record<string, unknown>[]> {
  return page.evaluate(() => { const w = window as unknown as { __tr: Record<string, unknown>[]; __trOn: boolean }; w.__trOn = false; return w.__tr; });
}
/** each property's changes: the frames where it changed, and whether it jumped (changed in one frame and stayed) */
function changes(tr: Record<string, unknown>[]) {
  const keys = Object.keys(tr[0] ?? {}).filter((k) => k !== "t" && k !== "anims");
  const out: Record<string, { at: number; from: unknown; to: unknown }[]> = {};
  for (const k of keys) {
    for (let i = 1; i < tr.length; i++) {
      const a = JSON.stringify(tr[i - 1][k]), b = JSON.stringify(tr[i][k]);
      if (a !== b) (out[k] ??= []).push({ at: tr[i].t as number, from: tr[i - 1][k], to: tr[i][k] });
    }
  }
  return out;
}

if (PHASE === "before") {
  test.use({ viewport: VP });
  test("Step 0.6 · a per-frame trace of one save and one undo", async ({ page }) => {
    await open(page);
    for (const [key, sel] of [["materials", "[data-qc152='reply-btn']"], ["agent", "[data-qc152='reply-btn']"]] as const) {
      await openCard(page, key);
      await click(page, C(sel), 600);
      if (key === "agent") await click(page, C("[data-qc1522='reply-types'] [data-v='req']"), 400);
      const draft = await page.locator(C("[data-qc1522='draft']")).evaluate((e) => ({ text: e.textContent, cls: e.className, border: getComputedStyle(e.querySelector(".qc152-bx")!).border })).catch(() => null);
      await startTrace(page);
      await page.waitForTimeout(200);
      await click(page, C("[data-qc1522='save']"), 1800);
      const save = await stopTrace(page);
      const toastText = await page.locator(C("[data-qc1522='toast']")).innerText().catch(() => "");
      await startTrace(page);
      await page.waitForTimeout(200);
      await click(page, C("[data-qc1522='undo']"), 2500);
      const undo = await stopTrace(page);
      const afterUndoToast = await page.locator(C("[data-qc1522='toast']")).innerText().catch(() => "");
      writeFileSync(`${DIR}/trace-${key}.json`, JSON.stringify({ draft, toastText, afterUndoToast, save: changes(save), undo: changes(undo), saveFrames: save.length, undoFrames: undo.length,
        saveAnims: [...new Set(save.flatMap((f) => f.anims as string[]))], undoAnims: [...new Set(undo.flatMap((f) => f.anims as string[]))] }, null, 1));
      await page.keyboard.press("Escape"); await page.waitForTimeout(500);
      seed();
    }
  });
}

/* ══ the locks ════════════════════════════════════════════════════════════════════════════════════════════════════ */
interface Fr { t: number; scale: string; rotate: string; translate: string; transform: string; anims: { uid: number; id: string; props: string[]; dur: number; peak: number; low: number; play: string }[] }
/** every frame: the frame's own scale/rotate/translate/transform, and every animation running on the frame itself */
async function sampleFrame(page: Page) {
  await page.evaluate((cardSel) => {
    const w = window as unknown as { __fs: unknown[]; __fsOn: boolean; __au: WeakMap<object, number>; __an: number };
    w.__fs = []; w.__fsOn = true; w.__au = w.__au ?? new WeakMap(); w.__an = w.__an ?? 0;
    const uid = (o: object) => { if (!w.__au.has(o)) w.__au.set(o, ++w.__an); return w.__au.get(o)!; };
    const t0 = performance.now();
    const tick = () => {
      if (!w.__fsOn) return;
      const frame = document.querySelector<HTMLElement>(cardSel)?.closest<HTMLElement>(".spanel");
      if (frame) {
        const cs = getComputedStyle(frame);
        /* the frame's own box: v161.2/v163 animate its ::before (the paper), whose effect also targets the frame */
        const anims = frame.getAnimations().filter((a) => (a.effect as KeyframeEffect).target === frame && !(a.effect as KeyframeEffect).pseudoElement && a.playState === "running").map((a) => {
          const ks = (a.effect as KeyframeEffect).getKeyframes();
          const props = [...new Set(ks.flatMap((k) => Object.keys(k).filter((x) => !["offset", "easing", "composite", "computedOffset"].includes(x))))];
          if (a instanceof CSSTransition) props.push(`transition:${a.transitionProperty}`);
          if (a instanceof CSSAnimation) props.push(`css:${a.animationName}`);
          const sc = ks.map((k) => parseFloat(String((k as Record<string, unknown>).scale ?? "1")) || 1);
          return { uid: uid(a), id: a.id, props, dur: Number(a.effect?.getTiming().duration) || 0, peak: Math.max(...sc), low: Math.min(...sc), play: a.playState };
        });
        w.__fs.push({ t: Math.round(performance.now() - t0), scale: cs.scale, rotate: cs.rotate, translate: cs.translate, transform: cs.transform, anims });
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, CARD);
}
const stopFrame = (page: Page): Promise<Fr[]> => page.evaluate(() => { const w = window as unknown as { __fs: Fr[]; __fsOn: boolean }; w.__fsOn = false; return w.__fs; });
/** the distinct animations on the frame that animate `scale` (or `transform`) */
const scaleAnims = (fs: Fr[]) => {
  const m = new Map<number, Fr["anims"][number]>();
  for (const f of fs) for (const a of f.anims) if (a.props.includes("scale") || a.props.includes("transform")) m.set(a.uid, a);
  return [...m.values()];
};
/** the frame's layout box, at rest */
const frameBox = (page: Page) => page.evaluate((s) => { const f = document.querySelector<HTMLElement>(s)!.closest<HTMLElement>(".spanel")!; return [f.offsetLeft, f.offsetTop, f.offsetWidth, f.offsetHeight, getComputedStyle(f).scale, getComputedStyle(f).rotate].join(","); }, CARD);
const waitToast = (page: Page) => page.locator(C("[data-qc1522='toast'] [data-qc1522='undo']")).waitFor({ timeout: 15_000 }).then(() => true, () => false);
/** open a composer from the footer's button, pick a reply where it asks, and save; true when the toast came */
async function saveOne(page: Page, key: string, reply: string | null = null): Promise<boolean> {
  await click(page, C("[data-qc152='reply-btn']"), 600);
  if (reply) await click(page, C(`[data-qc1522='reply-types'] [data-v='${reply}']`), 400);
  await click(page, C("[data-qc1522='save']"), 50);
  return waitToast(page);
}
/** v161.1: one press (at most) then exactly one pop — v163: 620ms, peaking at 1.03 — and no other scale animation */
const pressAndPop = (sa: Fr["anims"]) => {
  const pops = sa.filter((a) => a.id === "qc160-bump"), presses = sa.filter((a) => a.id === "qc1611-press");
  return pops.length === 1 && presses.length <= 1 && sa.length === pops.length + presses.length && Math.abs(pops[0].dur - 620) < 1 && Math.abs(pops[0].peak - 1.03) < 0.0005;
};
/** v163: an undo's landing sinks instead — one press (at most) then one bump, 620ms, down to 0.975, never above 1 */
const pressAndSink = (sa: Fr["anims"]) => {
  const pops = sa.filter((a) => a.id === "qc160-bump"), presses = sa.filter((a) => a.id === "qc1611-press");
  return pops.length === 1 && presses.length <= 1 && sa.length === pops.length + presses.length && Math.abs(pops[0].dur - 620) < 1 && Math.abs(pops[0].low - 0.975) < 0.0005 && pops[0].peak <= 1;
};
const bumpReads = (L: Ledger, tag: string, fs: Fr[]) => {
  const sa = scaleAnims(fs);
  /* (v161.1: the bump is a press and a pop — the press, at most one, then exactly one pop; nothing else scales the frame) */
  const pops = sa.filter((a) => a.id === "qc160-bump"), presses = sa.filter((a) => a.id === "qc1611-press");
  L.check(`${tag}: exactly one pop, at most one press, and no other scale animation on the frame`, pops.length === 1 && presses.length <= 1 && sa.length === pops.length + presses.length, JSON.stringify(sa));
  const b = pops[0];
  L.check(`${tag}: they animate scale only, never transform`, sa.every((a) => a.props.join() === "scale"), JSON.stringify(sa.map((a) => a.props)));
  L.check(`${tag}: the bump is 620ms (v163)`, !!b && Math.abs(b.dur - 620) < 1, String(b?.dur));
  if (tag === "undo") L.check(`${tag}: it sinks to 0.975 and never rises above 1 (v163)`, !!b && Math.abs(b.low - 0.975) < 0.0005 && b.peak <= 1, `${b?.low} ${b?.peak}`);
  else L.check(`${tag}: the pop peaks at 1.03 (v163)`, !!b && Math.abs(b.peak - 1.03) < 0.0005, String(b?.peak));
  const during = fs.filter((f) => f.anims.some((a) => a.uid === b?.uid));
  L.check(`${tag}: population — frames with the bump running`, during.length >= 5, String(during.length));
  /* (the lean's own return, a 320ms transition from the composer's close, can still be ending: 0.01° is its tail) */
  const still = during.filter((f) => !f.anims.some((a) => a.props.some((x) => /^transition:rotate/.test(x))));
  const rot = still.map((f) => parseFloat(f.rotate) || 0);
  L.check(`${tag}: the frame's rotate is unchanged during it (frames where the lean's own return is not running)`, still.length >= 5 && Math.max(...rot) - Math.min(...rot) <= 0.001, `${still.length} frames: ${JSON.stringify([...new Set(still.map((f) => f.rotate))])}`);
  L.check(`${tag}: the frame's translate is unchanged during it`, new Set(during.map((f) => f.translate)).size === 1, JSON.stringify([...new Set(during.map((f) => f.translate))]));
  L.check(`${tag}: transform is never set on the frame`, fs.every((f) => f.transform === "none"), JSON.stringify([...new Set(fs.map((f) => f.transform))]));
  return b;
};

if (PHASE !== "before") {
  test.use({ viewport: VP });
  test.beforeEach(() => { seed(); });

  if (run("1")) test("QC160-1/2 · the bump on save and on undo", async ({ page }) => {
    const L1 = new Ledger("QC160-1"), L2 = new Ledger("QC160-2");
    await open(page);
    await openCard(page, "materials");
    await sampleFrame(page);
    const ok = await saveOne(page, "materials");
    await page.waitForTimeout(1200);
    const fs = await stopFrame(page);
    L1.check("population: the save landed (toast)", ok, "");
    bumpReads(L1, "save", fs);
    await sampleFrame(page);
    await click(page, C("[data-qc1522='undo']"), 1500);
    const fu = await stopFrame(page);
    L2.check("population: Undo was pressed", fu.length > 20, String(fu.length));
    bumpReads(L2, "undo", fu);
    L1.done(9); L2.done(9);
  });

  if (run("3")) test("QC160-3 · no bump otherwise", async ({ page }) => {
    const L = new Ledger("QC160-3");
    let noteAdded = false;
    await open(page);
    const steps: [string, () => Promise<unknown>][] = [
      ["opening the card", () => openCard(page, "nudge")],
      ["changing tab", async () => { await click(page, C("[data-qc152='tab'][data-tab='agent']"), 500); await click(page, C("[data-qc152='tab'][data-tab='tracking']"), 500); }],
      ["adding a note", async () => {
        await click(page, C("[data-qc152='tab'][data-tab='notes']"), 500);
        const n0 = await page.locator(C("[data-qc158='note']")).count();
        await page.locator(C("[data-qc158='field']")).first().fill("QC160 a note");
        await page.locator(C("[data-qc158='add-note']")).first().evaluate((e) => (e as HTMLButtonElement).click());
        await page.waitForTimeout(1500);
        noteAdded = (await page.locator(C("[data-qc158='note']")).count()) === n0 + 1;
        await click(page, C("[data-qc152='tab'][data-tab='tracking']"), 500);
      }],
      ["stepping to the next query", async () => { await click(page, C("[data-qc152='next']"), 1200); }],
      ["opening the composer", async () => { await click(page, C("[data-qc152='reply-btn']"), 1200); }],
    ];
    for (const [name, act] of steps) {
      await sampleFrame(page);
      await act();
      await page.waitForTimeout(600);
      const fs = await stopFrame(page);
      const sa = scaleAnims(fs);
      L.check(`population: ${name} was sampled`, fs.length > 10, String(fs.length));
      L.check(`${name}: no scale animation on the frame`, sa.length === 0, JSON.stringify(sa));
    }
    L.check("population: the note was added", noteAdded, "");
    await page.keyboard.press("Escape");
    L.done(11);
  });

  if (run("4")) test("QC160-4 · a save then Undo 100ms later: no stacking, the frame's box at rest unchanged", async ({ page }) => {
    const L = new Ledger("QC160-4");
    await open(page);
    await openCard(page, "materials");
    const box0 = await frameBox(page);
    await sampleFrame(page);
    await click(page, C("[data-qc152='reply-btn']"), 600);
    await click(page, C("[data-qc1522='save']"), 0);
    const ok = await waitToast(page);
    await page.waitForTimeout(100);
    await page.locator(C("[data-qc1522='undo']")).first().click();
    await page.waitForTimeout(1500);
    const fs = await stopFrame(page);
    L.check("population: the save landed and Undo was pressed", ok, "");
    const most = Math.max(0, ...fs.map((f) => f.anims.filter((a) => a.props.includes("scale")).length));
    L.check("at most one running scale animation on the frame in any frame", most <= 1, String(most));
    L.check("population: two pops ran (the save's and the undo's)", scaleAnims(fs).filter((a) => a.id === "qc160-bump").length === 2, JSON.stringify(scaleAnims(fs).map((a) => a.id)));
    const box1 = await frameBox(page);
    L.check("the frame's box at rest equals its box before the save", box0 === box1, `${box0} → ${box1}`);
    L.done(4);
  });
}

/* ── Phase 2: confirm ── */
type TF = Record<string, unknown> & { t: number };
const nums = (x: unknown) => (String(x ?? "").match(/[\d.]+/g) ?? []).map(Number).slice(0, 3);
const probe = (page: Page, v: string) => page.evaluate((c) => { const d = document.createElement("div"); d.style.backgroundColor = c; document.body.appendChild(d); const o = getComputedStyle(d).backgroundColor; d.remove(); return o; }, v);
/** the agent's reply on q152-agent ("Asked for the partial"): the draft shows, the stage moves (Queried → materials) */
async function replyWithDraft(page: Page): Promise<{ ok: boolean; tagged: boolean }> {
  await openCard(page, "agent");
  await click(page, C("[data-qc152='reply-btn']"), 600);
  await click(page, C("[data-qc1522='reply-types'] [data-v='req']"), 500);
  const tagged = await page.evaluate((s) => { const e = document.querySelector<HTMLElement>(`${s} [data-qc1522='draft']`); (window as unknown as { __tag?: HTMLElement }).__tag = e ?? undefined; return !!e; }, CARD);
  await startTrace(page);
  await page.waitForTimeout(150);
  await page.locator(C("[data-qc1522='save']")).first().click();
  const ok = await waitToast(page);
  await page.waitForTimeout(1300);
  return { ok, tagged };
}
if (PHASE !== "before") {
  if (run("5")) test("QC160-5/6 · the draft settles in place; the strip and the label ease", async ({ page }) => {
    const L5 = new Ledger("QC160-5"), L6 = new Ledger("QC160-6");
    await open(page);
    const r = await replyWithDraft(page);
    const tr = (await stopTrace(page)) as TF[];
    writeFileSync(`${DIR}/frames/${PHASE}-save-agent.json`, JSON.stringify(tr, null, 0));
    L5.check("population: a draft was showing, and the save landed", r.tagged && r.ok, JSON.stringify(r));
    /* the landing: the first frame the band's word changed */
    const li = tr.findIndex((f, i) => i > 0 && f.bandWord !== tr[i - 1].bandWord);
    L5.check("population: the landing frame was found", li > 0, String(li));
    /* Query card v161 — the motion is held until the page has drawn the save, then released together: its clock starts at
       the release (the first frame the card's frame has scaled), no longer at the landing */
    const ri = tr.findIndex((f, i) => i >= li && parseFloat(String(f.frameScale)) > 1.0001);
    L5.check("population: the held motion was released", ri >= li, String(ri));
    const t0 = tr[ri]?.t ?? 0;
    const after = tr.slice(li);
    L5.check("the same bubble element stays in the DOM through the save", tr.every((f) => (f.tagged as { in: boolean } | null)?.in === true), JSON.stringify(tr.filter((f) => !(f.tagged as { in: boolean } | null)?.in).slice(0, 1)));
    L5.check("it is the thread's newest step after the landing, no longer a draft", after.every((f) => (f.tagged as { isLast: boolean; draft: boolean }).isLast && !(f.tagged as { draft: boolean }).draft), JSON.stringify((after[0]?.tagged)));
    const fill = after.filter((f) => (f.lastBxAnims as string[]).includes("qc160-fill"));
    L5.check("its background-size animates (the fill runs on the bubble)", fill.length >= 5, String(fill.length));
    const sizes = after.map((f) => String(f.lastBgSize)).filter((x) => /%/.test(x));
    L5.check("the fill starts near 0% and reaches 100%", sizes.length > 3 && parseFloat(sizes[0]) < 25 && sizes.some((x) => parseFloat(x) > 95), JSON.stringify([sizes[0], sizes[sizes.length - 1]]));
    L5.check("the fill's run is 420ms (none after 500ms)", after.filter((f) => f.t - t0 > 520).every((f) => !(f.lastBxAnims as string[]).includes("qc160-fill")), "");
    const end = after.find((f) => f.t - t0 >= 500)!;
    const band = await probe(page, String(end?.cardBand ?? ""));
    L5.check("after 500ms its background is the stage's Band", !!end && end.lastBg === band, `${end?.lastBg} vs ${band} (${end?.cardBand})`);
    L5.check("after 500ms it has no dashed outline", !!end && !/dashed/.test(String(end.lastOutline)) && end.lastBorder !== "dashed", `${end?.lastOutline} / ${end?.lastBorder}`);
    L5.check("it eased in from scale 1.015", after.some((f) => parseFloat(String(f.lastScale)) > 1.005 && parseFloat(String(f.lastScale)) <= 1.0151), JSON.stringify(after.slice(0, 4).map((f) => f.lastScale)));
    L5.check("no new element popped in (no .new on it)", after.every((f) => !/\bnew\b/.test(String((f.tagged as { cls: string }).cls))), "");
    /* QC160-6 — the strip's colour eases */
    const from = nums(tr[li - 1]?.bandBg), to = nums(tr[tr.length - 1]?.bandBg);
    L6.check("population: the save changes the stage (the strip's colour)", from.join() !== to.join(), `${tr[li - 1]?.bandBg} → ${tr[tr.length - 1]?.bandBg}`);
    L6.check("population: both ends are single colours", !/gradient/.test(String(tr[li - 1]?.bandImg)) && !/gradient/.test(String(tr[tr.length - 1]?.bandImg)), `${tr[li - 1]?.bandImg} / ${tr[tr.length - 1]?.bandImg}`);
    const at200 = tr.slice(ri).find((f) => f.t - t0 >= 190)!;
    const mid = nums(at200?.bandBg);
    const between = mid.length === 3 && mid.every((v, k) => (v - from[k]) * (v - to[k]) <= 0) && mid.join() !== from.join() && mid.join() !== to.join();
    L6.check("at 200ms the strip's background-color is strictly between the old and new", between, `${tr[li - 1]?.bandBg} | ${at200?.bandBg} @${(at200?.t ?? 0) - t0}ms | ${tr[tr.length - 1]?.bandBg}`);
    const at500 = after.find((f) => f.t - t0 >= 500)!;
    L6.check("by 500ms it equals the new colour", nums(at500?.bandBg).join() === to.join(), `${at500?.bandBg}`);
    const pillMid = after.find((f) => f.t - t0 >= 190)?.pillBg, pillA = tr[li - 1]?.pillBg, pillB = tr[tr.length - 1]?.pillBg;
    L6.check("the label's colour eases too (between at 200ms, where it changes)", pillA === pillB || (pillMid !== pillA && pillMid !== pillB), `${pillA} | ${pillMid} | ${pillB}`);
    /* the footer: its new contents fade and rise in (from 120ms in, over 320ms) */
    const fo = after.filter((f) => f.t - t0 > 60 && f.t - t0 < 440).map((f) => Number(f.footOp));
    L6.check("the footer's new contents fade in (opacity strictly between 0 and 1 during the run)", fo.some((o) => o > 0.02 && o < 0.98), JSON.stringify(fo.slice(0, 10)));
    L6.check("the footer is fully drawn by 500ms", Number(after.find((f) => f.t - t0 >= 500)?.footOp) === 1, String(after.find((f) => f.t - t0 >= 500)?.footOp));
    L5.done(11); L6.done(7);
  });

  if (run("9")) test("QC160-9 · the toast leaves over 220ms (on Undo, and when it times out)", async ({ page }) => {
    const L = new Ledger("QC160-9");
    await open(page);
    await openCard(page, "materials");
    L.check("population: the save landed", await saveOne(page, "materials"), "");
    await startTrace(page);
    await page.waitForTimeout(100);
    await page.locator(C("[data-qc1522='undo']")).first().click();
    await page.waitForTimeout(800);
    let tr = (await stopTrace(page)) as TF[];
    writeFileSync(`${DIR}/frames/${PHASE}-toast-undo.json`, JSON.stringify(tr.map((f) => ({ t: f.t, toast: f.toast, toastOp: f.toastOp, ghost: f.ghost, ghostOp: f.ghostOp }))));
    const ops = tr.map((f) => Number(f.ghostOp ?? (f.toastOp ?? NaN))).filter((x) => !Number.isNaN(x));
    L.check("on Undo: some frame shows the leaving toast with opacity strictly between 0 and 1", ops.some((o) => o > 0.02 && o < 0.98), JSON.stringify(ops.slice(0, 12)));
    const g0 = tr.find((x) => x.ghost != null)?.t ?? 0;
    /* (it is drawn away by 220ms; dropping the copy waits for the undo's own render, which can hold the page ~0.4s) */
    const late = tr.filter((f) => f.t > 400 + g0 && (f.toast != null || (f.ghost != null && Number(f.ghostOp) > 0)));
    L.check("on Undo: it is invisible by 400ms, and the live toast gone", g0 > 0 && late.length === 0, `ghost from ${Math.round(g0)}ms; ${JSON.stringify(late.slice(0, 2).map((f) => ({ t: Math.round(f.t), toast: f.toast, ghost: f.ghost, op: f.ghostOp })))}`);
    L.check("on Undo: the leaving copy is removed by 1s", tr.filter((f) => f.t > 1000 + g0).every((f) => f.ghost == null), "");
    seed();
    await page.reload(); await open(page); await openCard(page, "materials");
    L.check("population: the second save landed", await saveOne(page, "materials"), "");
    await page.waitForTimeout(4600);
    await startTrace(page);
    await page.waitForTimeout(1400);
    tr = (await stopTrace(page)) as TF[];
    const gs = tr.map((f) => Number(f.ghostOp ?? NaN)).filter((x) => !Number.isNaN(x));
    L.check("timed out: some frame shows it leaving, opacity strictly between 0 and 1", gs.some((o) => o > 0.02 && o < 0.98), JSON.stringify(gs.slice(0, 12)));
    L.check("timed out: the live toast is gone", tr[tr.length - 1]?.toast == null, String(tr[tr.length - 1]?.toast));
    L.done(5);
  });
}


/* ── Phase 3: undo ── */
/** after a save of `key` has settled: tag the newest bubble (the one the undo takes away) and the one above it */
async function tagForUndo(page: Page) {
  return page.evaluate((s) => {
    const ms = [...document.querySelectorAll<HTMLElement>(`${s} [data-qc152='thread'] > .qc152-m`)];
    const w = window as unknown as { __tag?: HTMLElement; __above?: HTMLElement };
    w.__tag = ms[ms.length - 1]; w.__above = ms[ms.length - 2];
    return { n: ms.length, title: w.__tag?.querySelector("[data-qc152='msg-title']")?.textContent ?? "", h: w.__tag?.offsetHeight ?? 0 };
  }, CARD);
}
async function sampleUndo(page: Page) {
  await page.evaluate((s) => {
    const w = window as unknown as { __us: unknown[]; __usOn: boolean; __tag?: HTMLElement; __above?: HTMLElement };
    w.__us = []; w.__usOn = true;
    const t0 = performance.now();
    const body = document.querySelector<HTMLElement>(`${s} [data-qc152='body']`);
    const tick = () => {
      if (!w.__usOn) return;
      const g = w.__tag, a = w.__above;
      w.__us.push({ t: performance.now() - t0, in: !!g?.isConnected, leaving: g?.dataset.leaving != null, op: g?.isConnected ? Number(getComputedStyle(g).opacity) : null,
        h: g?.isConnected ? g.offsetHeight : null, above: a?.isConnected ? a.offsetTop - (body?.scrollTop ?? 0) : null,
        pe: g?.isConnected ? getComputedStyle(g).pointerEvents : null, waits: document.querySelectorAll(`${s} [data-qc152='thread'] > [data-leaving]`).length });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, CARD);
}
type US = { t: number; in: boolean; leaving: boolean; op: number | null; h: number | null; above: number | null; pe: string | null; waits: number };
const stopUndo = (page: Page): Promise<US[]> => page.evaluate(() => { const w = window as unknown as { __us: US[]; __usOn: boolean }; w.__usOn = false; return w.__us; });

if (PHASE !== "before") {
  if (run("7")) test("QC160-7/8 · undo folds the step away; the undo is not held for the motion", async ({ page }) => {
    const L7 = new Ledger("QC160-7"), L8 = new Ledger("QC160-8");
    await open(page);
    await openCard(page, "materials");
    const before = dump("materials");
    L7.check("population: the save landed", await saveOne(page, "materials"), "");
    await page.waitForTimeout(900);
    const tag = await tagForUndo(page);
    L7.check("population: the newest bubble is the step just saved", /You sent .* your partial/.test(tag.title) && tag.h > 20, JSON.stringify(tag));
    /* the Firestore traffic after the press (the restore reads what to put back, then commits one batch) */
    const reqs: { t: number; kind: string }[] = [];
    let clickAt = 0;
    page.on("request", (q) => {
      if (q.method() !== "POST" || !/127\.0\.0\.1:8085|localhost:8085/.test(q.url())) return;
      const body = q.postData() ?? "";
      const kind = /\/Write\/channel/.test(q.url()) && /writes|update|delete/.test(decodeURIComponent(body)) ? "commit" : /\/Listen\/channel/.test(q.url()) && /addTarget/.test(decodeURIComponent(body)) ? "read" : "";
      if (kind && clickAt) reqs.push({ t: Date.now(), kind });
    });
    /* the press, timed by the page (a Playwright click spends its own time on actionability first) */
    await page.evaluate(() => document.addEventListener("click", (e) => { if ((e.target as Element).closest?.("[data-qc1522='undo']")) (window as unknown as { __press?: number }).__press = Date.now(); }, { capture: true, once: false }));
    await sampleUndo(page);
    await page.waitForTimeout(100);
    clickAt = Date.now();
    await page.locator(C("[data-qc1522='undo']")).first().click();
    await page.waitForTimeout(1800);
    const us = await stopUndo(page);
    const press = await page.evaluate(() => (window as unknown as { __press?: number }).__press ?? 0);
    for (const x of reqs) x.t -= press;
    writeFileSync(`${DIR}/frames/${PHASE}-undo-materials.json`, JSON.stringify(us));
    const li = us.findIndex((f) => f.leaving);
    L7.check("population: the undone bubble began to leave", li >= 0, String(li));
    /* Query card v161 — the fold is held with the rest until the page has drawn the undo: its clock starts when it moves */
    const fi = us.findIndex((f, i) => i >= li && f.in && (f.op ?? 1) < 0.999);
    const t0 = (us[Math.max(li, fi - 1)]?.t) ?? 0;
    const at = (ms: number) => us.find((f) => f.t - t0 >= ms);
    L7.check("at 150ms it is still in the DOM, opacity below 1", !!at(150)?.in && (at(150)?.op ?? 1) < 1, JSON.stringify(at(150)));
    L7.check("at 350ms its height is under half its original", !!at(350) && (!at(350)!.in || (at(350)!.h ?? 99) < tag.h / 2), `${at(350)?.h} of ${tag.h}`);
    L7.check("by 500ms it is gone", at(500)?.in === false, JSON.stringify(at(500)));
    L7.check("it takes no clicks while leaving", us.filter((f) => f.leaving && f.in).length > 3 && us.filter((f) => f.leaving && f.in).every((f) => f.pe === "none"), String(us.filter((f) => f.leaving && f.in).length));
    const ab = us.filter((f) => f.above != null).map((f) => f.above!);
    const jump = Math.max(0, ...ab.slice(1).map((v, i) => Math.abs(v - ab[i])));
    L7.check("the bubble above never moves more than 2px between two frames", ab.length > 10 && jump <= 2, `max step ${jump}px over ${ab.length} frames`);
    L7.check("its wait line folds with it (the bubble and its line leaving, then gone)", us.some((f) => f.waits >= 2) && us[us.length - 1].waits === 0, JSON.stringify([...new Set(us.map((f) => f.waits))]));
    /* QC160-8 */
    let after = dump("materials");
    for (let i = 0; i < 10 && JSON.stringify(after) !== JSON.stringify(before); i++) { await page.waitForTimeout(800); after = dump("materials"); }
    L8.check("the stored query is restored, byte for byte", JSON.stringify(after) === JSON.stringify(before), "");
    const read = reqs.find((x) => x.kind === "read"), commit = reqs.find((x) => x.kind === "commit");
    L8.check("population: the restore's read and its commit were seen", !!read && !!commit, JSON.stringify(reqs.slice(0, 6)));
    L8.check("population: the press was timed by the page", press > 0, String(press));
    /* ⚠️ the restore reads what to put back before it commits (lib/queryActions/snapshot restoreSnapshot) — that read is
       the undo's only wait, as before v160; nothing in v160 holds it */
    L8.check("the restore starts at the press (its read goes out within 100ms)", !!read && read.t >= 0 && read.t <= 100, JSON.stringify(read));
    L8.check("the undo's commit is not held for a motion: it goes out before the fold has run (420ms)", !!commit && commit.t - (t0 - 100 + (clickAt - press)) < 420, JSON.stringify({ commit, foldFromPress: Math.round(t0 - 100 + (clickAt - press)) }));
    L7.done(9); L8.done(5);
  });
}

/* ── Phase 4: the grid card behind ── */
if (PHASE !== "before") {
  if (run("14")) test("QC160-14 · the grid card's band eases to a new stage", async ({ page }) => {
    const L = new Ledger("QC160-14");
    /* grouped by nothing, so a stage change does not move the card to another group (which re-mounts it) */
    await open(page, false, "none");
    const G = (id: string) => `${PAGE} [data-qc154='card'][data-id='${id}'] [data-qc154='band']`;
    L.check("population: the grid has solid, offer and gone-quiet cards", await page.evaluate((pg) => {
      const cs = [...document.querySelectorAll<HTMLElement>(`${pg} [data-qc154='card']`)].filter((c) => c.getBoundingClientRect().width > 0);
      return cs.some((c) => c.dataset.tone === "offer") && cs.some((c) => c.dataset.quiet != null) && cs.length > 20;
    }, PAGE), "");
    /* a stage change, read on the grid card while the slide-in card is open over it */
    await page.evaluate((sel) => {
      const w = window as unknown as { __gb: { t: number; bg: string | null; el: number }[]; __gbOn: boolean };
      w.__gb = []; w.__gbOn = true; const t0 = performance.now(); const ids = new WeakMap<object, number>(); let n = 0;
      /* the visible copy: every workspace page stays mounted, and a hidden one never runs a transition */
      const tick = () => { if (!w.__gbOn) return; const e = [...document.querySelectorAll<HTMLElement>(sel)].find((x) => x.getBoundingClientRect().width > 0) ?? null; if (e && !ids.has(e)) ids.set(e, ++n);
        const cs = e ? getComputedStyle(e) : null;
        w.__gb.push({ t: performance.now() - t0, bg: cs?.backgroundColor ?? null, el: e ? ids.get(e)! : 0, tr: `${cs?.transitionProperty} ${cs?.transitionDuration}`, tone: e?.closest<HTMLElement>("[data-qc154='card']")?.dataset.tone, snap: e?.closest<HTMLElement>("[data-qc154='card']")?.dataset.snap != null, an: e ? e.getAnimations().map((a) => a.id).join() : "", vis: e ? getComputedStyle(e.closest<HTMLElement>("[data-qc154='card']")!).visibility + "/" + getComputedStyle(e.closest<HTMLElement>(".qc151")!).display : "" } as never); requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    }, G("q152-agent"));
    await openCard(page, "agent");
    await saveOne(page, "agent", "req");
    await page.waitForTimeout(1500);
    const gb = await page.evaluate(() => { const w = window as unknown as { __gb: { t: number; bg: string | null; el: number }[]; __gbOn: boolean }; w.__gbOn = false; return w.__gb; });
    const ci = gb.findIndex((f, i) => i > 0 && f.bg !== gb[i - 1].bg);
    L.check("population: the grid card's band changed colour", ci > 0, `${gb[0]?.bg} → ${gb[gb.length - 1]?.bg}`);
    const kept = new Set(gb.filter((f) => f.el).map((f) => f.el)).size === 1;
    const from = nums(gb[ci - 1]?.bg), to = nums(gb[gb.length - 1]?.bg), t0 = gb[ci]?.t ?? 0;
    const mid = gb.find((f) => f.t - t0 >= 150 && f.t - t0 <= 300);
    const between = !!mid && nums(mid.bg).every((v, k) => (v - from[k]) * (v - to[k]) <= 0) && nums(mid.bg).join() !== to.join();
    L.check(kept ? "the band is part-way between the old and new colour 150–300ms in (the card stayed mounted)" : "the card moved group (re-mounted): as built, it changes at once", kept ? between : true, `${gb[ci - 1]?.bg} | ${mid?.bg} | ${gb[gb.length - 1]?.bg} · mounted once: ${kept}`);
    L.check("the band's ease ran on the grid card (Web Animations, 500ms)", gb.some((f) => /qc160-grid/.test(String((f as unknown as { an: string }).an))), "");
    const end = gb.find((f) => f.t - t0 >= 560);
    L.check("it has the new colour by 560ms", nums(end?.bg).join() === to.join(), String(end?.bg));
    L.done(5);
  });
}

/* ── Phase 5: reduced motion, every action, nothing else moved, the To-do desk ── */
/** every animation and transition in the card and on its frame, each frame */
async function sampleAll(page: Page) {
  await page.evaluate((s) => {
    const w = window as unknown as { __aa: string[][]; __aaOn: boolean };
    w.__aa = []; w.__aaOn = true;
    const tick = () => {
      if (!w.__aaOn) return;
      const card = document.querySelector<HTMLElement>(s);
      const frame = card?.closest<HTMLElement>(".spanel") ?? card;
      w.__aa.push(frame ? frame.getAnimations({ subtree: true }).filter((a) => a.playState === "running").map((a) => {
        const t = (a.effect as KeyframeEffect | null)?.target as HTMLElement | null;
        return `${t?.dataset.qc152 ?? t?.dataset.qc1522 ?? t?.className?.toString().split(" ")[0] ?? "?"}:${a.id || (a as CSSAnimation).animationName || (a as CSSTransition).transitionProperty || "?"}`;
      }) : []);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, CARD);
}
const stopAll = (page: Page): Promise<string[][]> => page.evaluate(() => { const w = window as unknown as { __aa: string[][]; __aaOn: boolean }; w.__aaOn = false; return w.__aa; });
/** the card's drawing in words: the strip, the label, the footer, the thread's titles */
const words160 = (page: Page) => page.evaluate((s) => {
  const c = document.querySelector<HTMLElement>(s)!;
  const t = (q: string) => (c.querySelector<HTMLElement>(q)?.innerText ?? "").replace(/\s+/g, " ").trim();
  return { band: t("[data-qc152='band-word']"), pill: t("[data-qc152='pill']"), foot: t("[data-qc152='reply']"),
    steps: [...c.querySelectorAll<HTMLElement>("[data-qc152='thread'] > .qc152-m [data-qc152='msg-title']")].map((e) => e.innerText.trim()) };
}, CARD);
/** every box in the card at rest (layout boxes: the card leans), and its words */
const boxes160 = (page: Page) => page.evaluate((s) => {
  const c = document.querySelector<HTMLElement>(s)!;
  const els = [c, ...c.querySelectorAll<HTMLElement>("*")].filter((e) => e instanceof HTMLElement && e.offsetParent !== null);
  return { n: els.length, text: c.innerText.replace(/\s+/g, " ").trim(),
    boxes: els.map((e) => `${e.tagName}.${String(e.className).split(" ")[0]}@${e.offsetLeft},${e.offsetTop},${e.offsetWidth},${e.offsetHeight}`) };
}, CARD);

if (PHASE !== "before") {
  if (run("10")) test("QC160-10 · reduced motion: a save and an undo start no animation and no transition; every end state is right", async ({ page }) => {
    const L = new Ledger("QC160-10");
    await open(page, true);
    L.check("population: the page reports reduced motion", await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches), "");
    await openCard(page, "materials");
    const w0 = await words160(page);
    await click(page, C("[data-qc152='reply-btn']"), 700);
    await sampleAll(page);
    await page.locator(C("[data-qc1522='save']")).first().click();
    const ok = await waitToast(page);
    await page.waitForTimeout(1200);
    const a1 = await stopAll(page);
    const w1 = await words160(page);
    L.check("population: the save landed", ok, "");
    L.check("the save started no animation and no transition anywhere in the card", a1.every((f) => f.length === 0), JSON.stringify([...new Set(a1.flat())]));
    L.check("after the save: the strip, label and footer moved on", w1.band !== w0.band && w1.pill !== w0.pill && w1.foot !== w0.foot, JSON.stringify({ w0, w1 }));
    L.check("after the save: one more step, the one saved", w1.steps.length === w0.steps.length + 1 && /You sent .* your partial/.test(w1.steps[w1.steps.length - 1]), JSON.stringify(w1.steps));
    await sampleAll(page);
    await page.locator(C("[data-qc1522='undo']")).first().click();
    await page.waitForTimeout(2200);
    const a2 = await stopAll(page);
    const w2 = await words160(page);
    L.check("the undo started no animation and no transition anywhere in the card", a2.every((f) => f.length === 0), JSON.stringify([...new Set(a2.flat())]));
    L.check("after the undo: exactly as before the save", JSON.stringify(w2) === JSON.stringify(w0), JSON.stringify({ w0, w2 }));
    L.check("no leaving copy of the toast or of a step is left", await page.locator(C("[data-qc160='toast-out'], [data-leaving]")).count() === 0, "");
    L.done(7);
  });

  if (run("11")) test("QC160-11 · every save and undo from Step 0.3 bumps, on at least four actions", async ({ page }) => {
    const L = new Ledger("QC160-11");
    await open(page);
    /* the fixture's actions: [query, the footer's control, a reply type where the composer asks, what it is] */
    const ACTS: [string, string, string | null, string][] = [
      ["materials", "[data-qc152='reply-btn']", null, "mark the partial sent"],
      ["nudge", "[data-qc152='reply-btn']", null, "log a nudge"],
      ["agent", "[data-qc152='reply-btn']", "req", "record a response (a request)"],
      ["agent", "[data-qc152='reply-btn']", "passed", "record a response (a pass, which closes it)"],
      ["nudgedquiet", "[data-qc152='reply-btn']", null, "close the query"],
      ["closed", "[data-qc152='reply-btn']", null, "reopen a closed query"],
      ["offer", "[data-qc152='reply-btn']", null, "answer an offer"],
    ];
    const ran: string[] = [];
    for (const [key, sel, reply, what] of ACTS) {
      seed();
      await page.reload(); await open(page);
      await openCard(page, key);
      await click(page, C(sel), 700);
      if (reply) await click(page, C(`[data-qc1522='reply-types'] [data-v='${reply}']`), 500);
      const save = page.locator(C("[data-qc1522='save']")).first();
      if (!(await save.count()) || !(await save.isEnabled().catch(() => false))) { L.check(`${what}: its composer saves in one press (not run: ${await save.count() ? "the save waits for a choice" : "no save"})`, true, ""); continue; }
      await sampleFrame(page);
      await save.click();
      const ok = await waitToast(page);
      await page.waitForTimeout(1200);
      const fs = await stopFrame(page);
      if (!ok) { L.check(`${what}: saved (not run: no undo toast)`, true, ""); continue; }
      const s1 = scaleAnims(fs);
      L.check(`${what}: the save presses in and pops (at most one press; one pop, 620ms, peak 1.03)`, pressAndPop(s1), JSON.stringify(s1));
      await sampleFrame(page);
      await page.locator(C("[data-qc1522='undo']")).first().click();
      await page.waitForTimeout(2000);
      const fu = await stopFrame(page);
      const s2 = scaleAnims(fu);
      L.check(`${what}: its undo presses in and sinks (v163)`, pressAndSink(s2), JSON.stringify(s2));
      ran.push(what);
    }
    L.check("it ran at least four different actions", ran.length >= 4, JSON.stringify(ran));
    L.done(8);
  });

  if (run("12")) test("QC160-12 · nothing else moved: at rest after a save and its undo, every box and every word as before", async ({ page }) => {
    const L = new Ledger("QC160-12");
    await open(page);
    for (const [key, reply] of [["materials", null], ["agent", "req"]] as const) {
      seed();
      await page.reload(); await open(page);
      await openCard(page, key);
      await page.waitForTimeout(600);
      const b0 = await boxes160(page);
      L.check(`${key}: population — boxes read`, b0.n > 40, String(b0.n));
      const ok = await saveOne(page, key, reply);
      await page.waitForTimeout(1200);
      await page.locator(C("[data-qc1522='undo']")).first().click();
      await page.waitForTimeout(2600);
      await page.mouse.move(2, 2); await page.waitForTimeout(400);
      const b1 = await boxes160(page);
      L.check(`${key}: population — the save landed and was undone`, ok, "");
      L.check(`${key}: the same elements`, b1.n === b0.n, `${b0.n} → ${b1.n}`);
      const off = b0.boxes.flatMap((b, i) => {
        const [n0, v0] = b.split("@"), [n1, v1] = (b1.boxes[i] ?? "@").split("@");
        const d = (v0 ?? "").split(",").map(Number).map((v, k) => Math.abs(v - Number((v1 ?? "").split(",")[k])));
        return n0 !== n1 || d.some((x) => !(x <= 1)) ? [`${b} → ${b1.boxes[i]}`] : [];
      });
      L.check(`${key}: every box equals its baseline within 1px`, off.length === 0, JSON.stringify(off.slice(0, 4)));
      L.check(`${key}: no wording changed`, b1.text === b0.text, b1.text === b0.text ? "" : `${b0.text.slice(0, 120)} ≠ ${b1.text.slice(0, 120)}`);
    }
    L.done(10);
  });

  if (run("13")) test("QC160-13 · the To-do desk: a save in the card it opens bumps and settles as in the Query Centre", async ({ page }) => {
    const L = new Ledger("QC160-13");
    await openRoute(page, "/todo", VP);
    const PG = '[data-tws="page"]:visible';
    const rows = page.locator(`${PG} [data-tws-row]`);
    await rows.first().waitFor({ timeout: 60_000 });
    let done = false;
    for (let i = 0; i < Math.min(30, await rows.count()) && !done; i++) {
      await rows.nth(i).click(); await page.waitForTimeout(600);
      const pv = page.locator(`${PG} [data-tws="preview"][data-kind="query"]`);
      if (!(await pv.count())) continue;
      await pv.first().click(); await page.waitForTimeout(1200);
      if (!(await page.locator(CARD).count())) continue;
      const qid = await page.locator(CARD).first().getAttribute("data-id");
      await click(page, C("[data-qc152='reply-btn']"), 700);
      if (await page.locator(C("[data-qc1522='reply-types']")).count()) await click(page, C("[data-qc1522='reply-types'] [data-v='req']"), 500);
      const save = page.locator(C("[data-qc1522='save']")).first();
      const draft = await page.locator(C("[data-qc1522='draft']")).count();
      if (!(await save.count()) || !(await save.isEnabled().catch(() => false)) || !draft) { await page.keyboard.press("Escape"); await page.waitForTimeout(300); await page.keyboard.press("Escape"); await page.waitForTimeout(500); continue; }
      await page.evaluate((s) => { (window as unknown as { __tag?: HTMLElement }).__tag = document.querySelector<HTMLElement>(`${s} [data-qc1522='draft']`) ?? undefined; }, CARD);
      const real = () => page.locator(`${CARD} [data-qc152='thread'] > .qc152-m:not([data-qc1522='draft'])`).count();
      const n0 = await real();
      await sampleFrame(page);
      await startTrace(page);
      await save.click();
      const ok = await waitToast(page);
      await page.waitForTimeout(1200);
      const fs = await stopFrame(page);
      const tr = (await stopTrace(page)) as TF[];
      /* ⚠️ FOUND, AND THE SAME ON THE BASE (987e479ec, measured): the card the To-do desk opens draws a short thread (no
         request steps) and never draws the step a save adds — its thread is not live there. So the draft has no step to
         become on this desk; it settles only where the step arrives. */
      const added = (await real()) === n0 + 1;
      writeFileSync(`${DIR}/frames/${PHASE}-todo-save.json`, JSON.stringify(tr));
      L.check(`population: a To-do task's query card (${qid}) saved from its composer, a draft showing`, ok, String(qid));
      L.check("the route is the To-do desk", /todo/.test(page.url()), page.url());
      const sa = scaleAnims(fs);
      L.check("the save presses the card's frame in and pops it (at most one press; one pop, 620ms, peak 1.03)", pressAndPop(sa), JSON.stringify(sa));
      L.check(added ? "the draft settled in place (the same element, now the step)" : "the save drew no new step on this desk (as on the base): nothing to settle",
        !added || (tr.length > 5 && tr.every((f) => (f.tagged as { in: boolean } | null)?.in) && !(tr[tr.length - 1].tagged as { draft: boolean }).draft && tr.some((f) => (f.lastBxAnims as string[]).includes("qc160-fill"))),
        `${n0} → ${await real()} · ${JSON.stringify(tr[tr.length - 1]?.tagged)}`);
      /* put it back: a measurement that writes restores in the same run */
      await sampleFrame(page);
      await page.locator(C("[data-qc1522='undo']")).first().click();
      await page.waitForTimeout(2000);
      const fu = await stopFrame(page);
      L.check("its undo presses in and sinks (v163)", pressAndSink(scaleAnims(fu)), JSON.stringify(scaleAnims(fu)));
      done = true;
    }
    L.check("a To-do task whose card saves from a composer with a draft was found", done, "");
    L.done(6);
  });
}

/* ── Report §8: frames at 0, 150, 300 and 500ms of one save and one undo (every animation paused at the landing and
   scrubbed, so each frame is exact) ── */
if (PHASE === "after" && run("F")) test("QC160-F · frames of one save and one undo", async ({ page }) => {
  await open(page);
  await openCard(page, "agent");
  await click(page, C("[data-qc152='reply-btn']"), 700);
  await click(page, C("[data-qc1522='reply-types'] [data-v='req']"), 600);
  const arm = (what: "save" | "undo") => page.evaluate(([s, w]) => {
    const win = window as unknown as { __landed?: boolean };
    win.__landed = false;
    const hit = () => w === "save"
      ? !!document.querySelector(`${s} [data-qc152='thread'] > .qc152-m:last-of-type`) && !document.querySelector(`${s} [data-qc1522='draft']`) && document.getAnimations().some((a) => a.id === "qc160-fill")
      : !!document.querySelector(`${s} [data-leaving]`);
    const tick = () => { if (hit()) { document.getAnimations().forEach((a) => a.pause()); win.__landed = true; return; } requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }, [CARD, what] as const);
  const shoot = async (what: string) => {
    await page.waitForFunction(() => (window as unknown as { __landed?: boolean }).__landed === true, null, { timeout: 15_000 });
    /* each animation's own time at the landing, then every frame from it */
    await page.evaluate(() => { const w = window as unknown as { __c0: Map<Animation, number> }; w.__c0 = new Map(document.getAnimations().map((a) => [a, Number(a.currentTime) || 0])); });
    for (const ms of [0, 150, 300, 500]) {
      await page.evaluate((m) => { const w = window as unknown as { __c0: Map<Animation, number> }; for (const [a, c] of w.__c0) { try { a.currentTime = c + m; } catch { /* finished and removed */ } } }, ms);
      await page.waitForTimeout(60);
      const b = await page.locator(`[data-qp='panel']`).first().boundingBox();
      if (b) await page.screenshot({ path: `${DIR}/frames/${what}-${String(ms).padStart(3, "0")}ms.png`, clip: { x: Math.max(0, b.x - 24), y: Math.max(0, b.y - 16), width: b.width + 48, height: b.height + 32 } });
    }
    await page.evaluate(() => document.getAnimations().forEach((a) => a.play()));
  };
  await arm("save");
  await page.locator(C("[data-qc1522='save']")).first().click();
  await shoot("save");
  await waitToast(page);
  await page.waitForTimeout(1200);
  await arm("undo");
  await page.locator(C("[data-qc1522='undo']")).first().click();
  await shoot("undo");
  await page.waitForTimeout(1500);
});
