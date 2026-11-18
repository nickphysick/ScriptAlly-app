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
    const t0 = tr[li]?.t ?? 0;
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
    const at200 = after.find((f) => f.t - t0 >= 190)!;
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
    const ops = tr.map((f) => Number(f.ghostOp ?? (f.toastOp ?? NaN))).filter((x) => !Number.isNaN(x));
    L.check("on Undo: some frame shows the leaving toast with opacity strictly between 0 and 1", ops.some((o) => o > 0.02 && o < 0.98), JSON.stringify(ops.slice(0, 12)));
    L.check("on Undo: it has gone by 400ms", tr.filter((f) => f.t > 400 + (tr.find((x) => x.ghost != null)?.t ?? 0)).every((f) => f.ghost == null && f.toast == null), "");
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
    L.done(6);
  });
}

