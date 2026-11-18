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
import { openRoute } from "./measure";

const PHASE = process.env.SA_PHASE === "before" ? "before" : process.env.SA_PHASE === "mutant" ? "mutant" : "after";
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

const seed = (a = "") => execSync(`node tests/e2e/seedQc152.mjs ${a}`, { encoding: "utf8", stdio: "pipe" });
const dump = (key: string) => JSON.parse(execSync(`node tests/e2e/seedQc152.mjs --dump ${key}`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim().split("\n").pop()!);
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

async function open(page: Page, reduced = false) {
  if (reduced) await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    try {
      sessionStorage.removeItem("qh.qc.filters"); sessionStorage.removeItem("qh.qc.collapsed1511"); sessionStorage.setItem("qh.qc.view150", "list");
      localStorage.setItem("qh.qc.view", JSON.stringify({ v: 1, group: "attention", sort: { key: "due", reversed: false }, density: "comfortable" }));
      localStorage.setItem("sa.guide.queries", "1"); localStorage.setItem("sa.guide.queries-explainer", "1"); localStorage.removeItem("sa.pinList.queries");
    } catch { /* private mode */ }
  });
  await openRoute(page, "/queries", VP);
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
interface Fr { t: number; scale: string; rotate: string; translate: string; transform: string; anims: { uid: number; props: string[]; dur: number; peak: number; play: string }[] }
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
        const anims = frame.getAnimations().filter((a) => (a.effect as KeyframeEffect).target === frame && a.playState === "running").map((a) => {
          const ks = (a.effect as KeyframeEffect).getKeyframes();
          const props = [...new Set(ks.flatMap((k) => Object.keys(k).filter((x) => !["offset", "easing", "composite", "computedOffset"].includes(x))))];
          if (a instanceof CSSTransition) props.push(`transition:${a.transitionProperty}`);
          if (a instanceof CSSAnimation) props.push(`css:${a.animationName}`);
          const peak = Math.max(...ks.map((k) => parseFloat(String((k as Record<string, unknown>).scale ?? "1")) || 1));
          return { uid: uid(a), props, dur: Number(a.effect?.getTiming().duration) || 0, peak, play: a.playState };
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
const bumpReads = (L: Ledger, tag: string, fs: Fr[]) => {
  const sa = scaleAnims(fs);
  L.check(`${tag}: exactly one scale animation on the frame`, sa.length === 1, JSON.stringify(sa));
  const b = sa[0];
  L.check(`${tag}: it animates scale only, never transform`, !!b && b.props.join() === "scale", JSON.stringify(b?.props));
  L.check(`${tag}: 500ms`, !!b && Math.abs(b.dur - 500) < 1, String(b?.dur));
  L.check(`${tag}: peaks between 1.02 and 1.025`, !!b && b.peak >= 1.02 && b.peak <= 1.025, String(b?.peak));
  const during = fs.filter((f) => f.anims.some((a) => a.uid === b?.uid));
  L.check(`${tag}: population — frames with the bump running`, during.length >= 5, String(during.length));
  L.check(`${tag}: the frame's rotate is unchanged during it`, new Set(during.map((f) => f.rotate)).size === 1, JSON.stringify([...new Set(during.map((f) => f.rotate))]));
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
    L.check("population: two bumps ran (the save's and the undo's)", scaleAnims(fs).length === 2, String(scaleAnims(fs).length));
    const box1 = await frameBox(page);
    L.check("the frame's box at rest equals its box before the save", box0 === box1, `${box0} → ${box1}`);
    L.done(4);
  });
}
