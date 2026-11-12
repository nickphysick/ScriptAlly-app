/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v4 — THE MEASUREMENT (design-refs/phone-app-v4/), on the emulator harness account, at 390 × 844 and 360 × 740.
 *
 *   npm run e2e:emu -- tests/e2e/phoneAppV4.measure.ts --project=pixel     the phone locks PA4-1…10 (Chromium)
 *   … --project=iphone                                                      the same, once, in WebKit
 *   PA4_DESKTOP=base|new … --project=measure                                PA4-11: the desktop at 1512, base then new
 *   PA4_MUTATE=<name>                                                       a mutation that must turn its lock red
 *   PA4_PAIRS=1 … --project=pixel                                           board-beside-built shots into reports/…/pairs
 *   PA4_PROBE=1                                                             a look, nothing asserted
 *
 * ⚠️ EVERYTHING IT WRITES IT UNDOES: the quick log through its own Undo (the snapshot restore v3's journey used).
 * ⚠️ READINGS ARE ON THE VISIBLE PAGE: every workspace page stays mounted, so each probe scopes to the stage's visible
 *    page (`offsetParent` set) or to the overlay layer.
 */
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { openRoute } from "./measure";
import { materialsWantedFromRows } from "../../src/lib/agentMaterials";

const DIR = "reports/phone-app-v4";
const MUT = process.env.PA4_MUTATE ?? "";
/* ⚠️ WEBKIT RUNS AT THE iPHONE 13 PROFILE'S OWN VIEWPORT (390 × 664, Safari's visible area): resized taller, its hit
   testing stayed at 664 and every tap on the bar reported "<html> intercepts pointer events" (12 Nov) */
export const PA4_PHONES: readonly { width: number; height: number }[] = [{ width: 390, height: 844 }, { width: 360, height: 740 }];
const WK_PHONE = { width: 390, height: 664 } as const;
const isWebKit = (page: Page) => page.context().browser()?.browserType().name() === "webkit";
const tag = (v: { width: number; height: number }) => `${v.width}x${v.height}`;
const isPhoneProject = (name: string) => name === "pixel" || name === "iphone";

/* ── the ledger: every reading kept, the failures listed, a floor on how many there were ── */
type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(lock: string, where: string, ok: boolean, detail: string) { this.rows.push({ lock, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${this.name}${MUT ? `.mut-${MUT}` : ""}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 40)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    console.log(`  ${this.name}: ${this.rows.length} readings, ${this.rows.filter((r) => !r.ok).length} red`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.lock} · ${r.where} — ${r.detail}`)).toEqual([]);
  }
}

/* ── opening a phone page (signed in once per run: a second sign-in races the app's own redirect in WebKit) ── */
const signedIn = new WeakSet<Page>();
/** sign in on a page (the shared helper; when its click cannot land in WebKit, the filled form is submitted with Enter) */
async function signIn(page: Page) {
  page.setDefaultTimeout(45_000);
  try { await openRoute(page, "/dashboard", { width: 1440, height: 900 }); }
  catch {
    await page.locator("#au-pw").press("Enter");
    await page.waitForTimeout(4000);
    await openRoute(page, "/dashboard", { width: 1440, height: 900 });
  }
  page.setDefaultTimeout(20_000);
}
/* ⚠️ IN WEBKIT THE TEST PAGE IS NEVER RESIZED: a resized iPhone page kept hit-testing at its first size, so every tap on
   the bar reported "<html> intercepts pointer events" (12 Nov). So WebKit signs in on a throwaway desktop-sized page in
   the same context (the session is the context's), and the test's own page opens at the iPhone 13 profile's viewport. */
test.beforeEach(async ({ context }, info) => {
  if (info.project.name !== "iphone") return;
  const p = await context.newPage();
  await signIn(p);
  await p.close();
});
export async function openPhone4(page: Page, path: string, vpAsked: { width: number; height: number }) {
  const wk = isWebKit(page);
  if (!wk && !signedIn.has(page)) { await signIn(page); signedIn.add(page); }
  const vp = wk ? page.viewportSize() ?? WK_PHONE : vpAsked;
  const now = page.viewportSize();
  if (!wk && (!now || now.width !== vp.width || now.height !== vp.height)) await page.setViewportSize(vp);
  await go(page, path);
}
async function go(page: Page, path: string) {
  await page.goto(path);
  await page.locator('[data-pa4="tabbar"]').first().waitFor({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1400);
  await mutate(page);
}
/* ⚠️ IN WEBKIT (the iPhone profile) PLAYWRIGHT'S CLICKS DO NOT LAND ON THE BAR: its pre-click check reports "<html> intercepts
   pointer events", and a forced click reaches nothing, while the page's own hit test (`elementFromPoint` at the tab's
   centre) returns the tab's icon (12 Nov). So in WebKit a tap dispatches the click on the element itself — the engine's
   rendering and wiring are measured, Playwright's touch coordinates are not. Chromium keeps real clicks. */
async function press(page: Page, loc: ReturnType<Page["locator"]>, timeout = 15_000) {
  if (isWebKit(page)) { await loc.waitFor({ state: "visible", timeout }); await loc.dispatchEvent("click"); }
  else await loc.click({ timeout });
}
const tap = async (page: Page, sel: string) => { await press(page, page.locator(sel).filter({ visible: true }).first()); await page.waitForTimeout(800); };
const stageTo = (page: Page, y: number) => page.evaluate((yy) => { const s = document.getElementById("app-stage-scroll"); if (s) s.scrollTo({ top: yy, behavior: "instant" as ScrollBehavior }); }, y);

/** the mutations: each is the smallest change that should turn exactly its own lock red */
async function mutate(page: Page) {
  if (!MUT) return;
  const css: Record<string, string> = {
    small: ".pa4-link { min-height: 40px !important; height: 40px !important; padding: 0 !important; }",
    pxtitle: ".pa4 .pa4-h, .pa4-layer .pa4-h { font-size: 20px !important; white-space: nowrap !important; }",
    motion: "@media (prefers-reduced-motion: reduce) { .pa4 .pa4-btr .bbeacon, .pa4-layer .pa4-btr .bbeacon { animation: pa4-bpulse 1.8s ease-out infinite !important; } .pa4-ring circle.arc { animation: pa4-sweep 9s ease-out both !important; } .pa4-stamp { animation: pa4-stampin 9s both !important; } }",
    shared: "body { letter-spacing: 0.4px !important; }",
    /* the old 92% sheet: the query page no longer fills the screen */
    sheet: "[data-pa4='qpage'] { top: 8% !important; }",
  };
  if (css[MUT]) await page.addStyleTag({ content: css[MUT] });
  await page.evaluate((m) => {
    const vis = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].filter((e) => e.offsetParent || e.closest(".pa4-layer"));
    if (m === "twobuttons") for (const c of vis('[data-cta="1"]')) { const b = c.cloneNode(true) as HTMLElement; c.after(b); }
    if (m === "overdue") { const d = document.createElement("p"); d.className = "pa4-s"; d.textContent = "Overdue"; vis(".pa4")[0]?.appendChild(d); }
    if (m === "byname") for (const g of vis('[data-pa4="be-group"]')) { const w = g.nextElementSibling as HTMLElement | null; if (!w) continue; const bars = [...w.querySelectorAll<HTMLElement>('[data-pa4="be-bar"]')]; bars.sort((a, b) => (a.querySelector("b")?.textContent ?? "").localeCompare(b.querySelector("b")?.textContent ?? "")); for (const b of bars) w.appendChild(b); }
  }, MUT);
}

const OTHER_MODE = !!process.env.PA4_PROBE || !!process.env.PA4_DESKTOP || !!process.env.PA4_PAIRS;

/* ═══════════════════════════════ PROBE — a look, nothing asserted ═══════════════════════════════ */
test.describe("PA4 probe", () => {
  test.skip(!process.env.PA4_PROBE, "probe only");
  test("probe", async ({ page }, info) => {
    test.skip(!isPhoneProject(info.project.name), "phone projects only");
    test.setTimeout(600_000);
    const out = `${DIR}/probe`;
    mkdirSync(out, { recursive: true });
    const vp = PA4_PHONES[0];
    const shot = async (name: string) => { await page.waitForTimeout(500); await page.screenshot({ path: `${out}/${name}.png` }); };
    for (const p of (process.env.PA4_PATHS ?? "/dashboard,/queries,/agents,/you").split(",")) {
      await openPhone4(page, p, vp);
      const n = p.replace(/\W+/g, "_");
      await shot(`${n}-0`);
      for (const y of [600, 1300, 2000]) { await stageTo(page, y); await shot(`${n}-${y}`); }
    }
    if (process.env.PA4_SHOTS?.includes("jitter")) {
      const r = await page.evaluate(async () => {
        const el = document.querySelector('[data-pa4="tab"][data-tab="you"]') as HTMLElement;
        const out: string[] = [];
        for (let i = 0; i < 12; i++) { const b = el.getBoundingClientRect(); out.push(`${b.x.toFixed(2)},${b.y.toFixed(2)},${b.width.toFixed(2)},${b.height.toFixed(2)}`); await new Promise((ok) => requestAnimationFrame(ok)); }
        const bar = el.closest("nav") as HTMLElement;
        const b = el.getBoundingClientRect();
        const hit = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
        out.push(`hit=${hit?.tagName}.${(hit as HTMLElement)?.className} inner=${innerWidth}x${innerHeight} vv=${visualViewport?.width}x${visualViewport?.height}@${visualViewport?.offsetTop} doc=${document.documentElement.clientHeight} scrollY=${scrollY} bodyH=${document.body.scrollHeight}`);
        return { rects: out, bar: getComputedStyle(bar).transform, cls: bar.className, anims: document.getAnimations().map((a) => (a as CSSAnimation).animationName ?? "t").slice(0, 10) };
      });
      console.log("JITTER", JSON.stringify(r));
    }
    if (process.env.PA4_SHOTS?.includes("birds")) { await go(page, "/queries"); await tap(page, '[data-pa4="view"][data-k="bird"]'); await shot("birds"); await tap(page, '[data-pa4="be-bar"]'); await shot("birds-peek"); await tap(page, '[data-pa4="peek-open"]'); await shot("qpage"); }
    if (process.env.PA4_SHOTS?.includes("search")) { await go(page, "/queries"); await tap(page, '[data-pa4="search"]'); await page.keyboard.type("a"); await shot("search"); }
    if (process.env.PA4_SHOTS?.includes("plus")) {
      await go(page, "/dashboard"); await tap(page, '[data-pa4="plus"]'); await shot("plus");
      await tap(page, '[data-pa4="face"]'); await shot("plus-filled");
      await tap(page, '[data-pa4="line"][data-k="mats"]'); await shot("plus-mats");
      await tap(page, '[data-pa4="line-done"]'); await tap(page, '[data-pa4="line"][data-k="reply"]'); await shot("plus-reply");
    }
    if (process.env.PA4_SHOTS?.includes("agent")) { await go(page, "/agents"); await tap(page, '[data-pa4="fit-card"]'); await shot("agent-sheet"); await go(page, "/agents"); await tap(page, '[data-pa4="everyone"]'); await shot("agents-all"); }
    if (process.env.PA4_SHOTS?.includes("tasks")) { await go(page, "/dashboard"); await tap(page, '[data-pa4="see-all"]'); await shot("tasks"); }
  });
});


/* ══ the readings, in the page: the visible screen is the overlay layer when it holds a panel, else the stage's page ══ */
type Sweep = { ctas: { h: number; bg: string; label: string }[]; smallText: string[]; smallTap: string[]; texts: number[]; wide: string[]; clipped: string[]; words: string[]; anims: number };
async function sweep(page: Page): Promise<Sweep> {
  return page.evaluate(() => {
    const layer = document.querySelector<HTMLElement>('[data-pa3="layer"]');
    const panel = layer && [...layer.children].some((c) => !(c as HTMLElement).matches('[data-pa4="snack"]'));
    const roots: HTMLElement[] = panel ? [layer!] : [
      ...[...document.querySelectorAll<HTMLElement>(".pa4")].filter((e) => e.offsetParent && !e.closest('[data-pa3="layer"]') && !e.parentElement?.closest(".pa4")),
      ...[...document.querySelectorAll<HTMLElement>('[data-pa4="tabbar"], [data-pa4="mini"].on, [data-pa4="pushed-header"]')],
    ];
    const vw = document.documentElement.clientWidth;
    const shown = (e: Element) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none"; };
    const foreign = (e: Element) => !!e.closest('[class*="ssp"], [class*="aap-"], svg, [aria-hidden="true"]');
    const name = (e: Element) => `${e.tagName.toLowerCase()}${(e as HTMLElement).dataset.pa4 ? `[${(e as HTMLElement).dataset.pa4}]` : ""} "${(e.textContent ?? "").trim().slice(0, 30)}"`;
    const all = roots.flatMap((r) => [r, ...r.querySelectorAll<HTMLElement>("*")]);
    const out: Sweep = { ctas: [], smallText: [], smallTap: [], texts: [], wide: [], clipped: [], words: [], anims: 0 };
    for (const e of all) {
      if (!shown(e)) continue;
      const cs = getComputedStyle(e);
      const isCta = e.matches('[data-cta="1"], .pa3-btn:not(.q)') || (e.tagName === "BUTTON" && cs.backgroundColor === "rgb(42, 58, 82)" && e.getBoundingClientRect().width > 120);
      if (isCta) out.ctas.push({ h: Math.round(e.getBoundingClientRect().height * 10) / 10, bg: cs.backgroundColor, label: (e.textContent ?? "").trim() });
      const own = [...e.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? "").trim());
      if (own && !foreign(e)) {
        const fs = parseFloat(cs.fontSize);
        out.texts.push(fs);
        const floor = e.closest('[data-pa4="tabbar"]') ? 12 : 14;
        if (fs < floor - 0.01) out.smallText.push(`${name(e)} ${fs}px`);
        if (e.scrollWidth > e.clientWidth + 1 && /hidden|clip/.test(cs.overflowX) && cs.display !== "inline") out.clipped.push(name(e));
        out.words.push((e.textContent ?? "").trim());
      }
      if (e.matches('button, a[href], [role="button"], [role="tab"], input:not([type="hidden"]), select, textarea') && !foreign(e)) {
        const r = e.getBoundingClientRect();
        if (r.width < 47.5 || r.height < 47.5) out.smallTap.push(`${name(e)} ${Math.round(r.width)}×${Math.round(r.height)}`);
      }
      const r = e.getBoundingClientRect();
      if (r.right > vw + 1) {
        let a: HTMLElement | null = e.parentElement, inScroller = false;
        while (a) { if (/auto|scroll/.test(getComputedStyle(a).overflowX)) { inScroller = true; break; } a = a.parentElement; }
        if (!inScroller) out.wide.push(`${name(e)} right ${Math.round(r.right)}`);
      }
    }
    out.anims = document.getAnimations().filter((a) => a.playState === "running").length;
    return out;
  });
}

/* the screens every sweep visits: the four tabs (top and scrolled), the pushed pages v4 draws, the sheets and journeys */
type Screen = { where: string; open: (page: Page) => Promise<void> };
const tabScreens = (vp: { width: number; height: number }): Screen[] => [
  ...["/dashboard", "/queries", "/agents", "/you"].map((p) => ({ where: p, open: async (page: Page) => { void vp; await go(page, p); } })),
  { where: "birds", open: async (page) => { await go(page, "/queries"); await tap(page, '[data-pa4="view"][data-k="bird"]'); } },
  { where: "birds-peek", open: async (page) => { await tap(page, '[data-pa4="be-bar"]'); } },
  { where: "birds-6m", open: async (page) => { await go(page, "/queries"); await tap(page, '[data-pa4="zoom"][data-k="m6"]'); } },
  { where: "query-page", open: async (page) => { await go(page, "/queries"); await tap(page, '[data-pa4="view"][data-k="list"]'); await tap(page, '[data-pa4="qrow"]'); } },
  { where: "agent-sheet", open: async (page) => { await go(page, "/agents"); await tap(page, '[data-pa4="fit-card"]'); } },
  { where: "agents-all", open: async (page) => { await go(page, "/agents"); await tap(page, '[data-pa4="everyone"]'); } },
  { where: "tasks-page", open: async (page) => { await go(page, "/dashboard"); await tap(page, '[data-pa4="see-all"]'); } },
  { where: "search", open: async (page) => { await go(page, "/queries"); await tap(page, '[data-pa4="search"]'); await page.keyboard.type("ma"); await page.waitForTimeout(500); } },
  { where: "quick-log", open: async (page) => { await go(page, "/dashboard"); await tap(page, '[data-pa4="plus"]'); } },
  { where: "quick-log-filled", open: async (page) => { await tap(page, '[data-pa4="face"]'); } },
  { where: "quick-log-mats", open: async (page) => { await tap(page, '[data-pa4="line"][data-k="mats"]'); } },
  { where: "quick-log-reply", open: async (page) => { await tap(page, '[data-pa4="line-done"]'); await tap(page, '[data-pa4="line"][data-k="reply"]'); } },
  { where: "quick-log-date", open: async (page) => { await tap(page, '[data-pa4="line-done"]'); await tap(page, '[data-pa4="line"][data-k="date"]'); } },
  { where: "reply-journey", open: async (page) => { await go(page, "/dashboard"); await tap(page, '[data-pa4="plus"]'); await tap(page, '[data-pa4="plus-reply"]'); } },
  { where: "add-agent", open: async (page) => { await go(page, "/agents"); await tap(page, '[data-pa4="add-agent"]'); } },
];
const WORDS = /\bOverdue\b|\blate\b|\b(?:hawk|we|I)\s*(?:will|['’]ll)\s+(?:watch|keep an eye)|watch(?:es|ing)? for (?:your )?repl/i;

/* ═══════════════ PA4-1 one button · PA4-2 sizes · PA4-3 text size · PA4-9 words — every screen, both phones ═══════════════ */
test.describe("PA4 screens", () => {
  test.skip(OTHER_MODE || !!process.env.PA4_ONLY && process.env.PA4_ONLY !== "screens", "another mode");
  test("PA4-1 · PA4-2 · PA4-3 · PA4-9", async ({ page }, info) => {
    test.skip(!isPhoneProject(info.project.name), "phone projects only");
    test.setTimeout(1_500_000);
    page.setDefaultTimeout(20_000);
    const L = new Ledger(`screens-${info.project.name}`);
    for (const vp of isWebKit(page) ? [page.viewportSize() ?? WK_PHONE] : PA4_PHONES) {
      await openPhone4(page, "/dashboard", vp);
      for (const sc of tabScreens(vp)) {
        const where = `${sc.where} @${tag(vp)}`;
        await sc.open(page);
        await page.waitForTimeout(600);
        for (const y of sc.where.startsWith("/") ? [0, 900, 2200] : [0]) {
          if (y) { await stageTo(page, y); await page.waitForTimeout(500); }
          const w = `${where}${y ? ` ↓${y}` : ""}`;
          const a = await sweep(page);
          L.check("PA4-2", `${w} · text population`, a.texts.length > 3, `${a.texts.length} text elements`);
          L.check("PA4-1", w, a.ctas.length <= 1 && a.ctas.every((c) => c.h >= 55.5 && c.h <= 56.5 && c.bg === "rgb(42, 58, 82)"), JSON.stringify(a.ctas));
          L.check("PA4-2", `${w} · text`, a.smallText.length === 0, a.smallText.slice(0, 6).join(" | "));
          L.check("PA4-2", `${w} · targets`, a.smallTap.length === 0, a.smallTap.slice(0, 6).join(" | "));
          const bad = a.words.filter((t) => WORDS.test(t));
          L.check("PA4-9", `${w} · words`, bad.length === 0, bad.slice(0, 3).join(" | "));
          if (sc.where === "/queries" && !y) {
            const names = await page.locator('[data-pa4="chip"], [data-pa4="qgroup"] h2').allTextContents();
            L.check("PA4-9", `${w} · chip and group names (population ${names.length})`, names.length >= 5 && !names.some((n) => /need you|with agents/i.test(n) || /^quiet/i.test(n.trim())), names.join(", "));
          }
        }
        /* PA4-3: at a 125% root size every text grows by a quarter, nothing clips, nothing passes the right edge */
        if (["/dashboard", "/queries", "/agents", "/you", "quick-log", "quick-log-filled"].includes(sc.where)) {
          await stageTo(page, 0);
          /* each text element keyed, read at 16px, then at 20px root, and compared one to one */
          const scale = await page.evaluate(async () => {
            const layer = document.querySelector<HTMLElement>('[data-pa3="layer"]');
            const panel = layer && [...layer.children].some((c) => !(c as HTMLElement).matches('[data-pa4="snack"]'));
            const roots: HTMLElement[] = panel ? [layer!] : [...document.querySelectorAll<HTMLElement>(".pa4")].filter((e) => e.offsetParent && !e.closest('[data-pa3="layer"]'));
            const els = roots.flatMap((r) => [...r.querySelectorAll<HTMLElement>("*")]).filter((e) => {
              const r = e.getBoundingClientRect();
              return r.width > 0 && r.height > 0 && !e.closest('[class*="ssp"], [class*="aap-"], svg, [aria-hidden="true"]') && [...e.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? "").trim());
            });
            const a = els.map((e) => parseFloat(getComputedStyle(e).fontSize));
            document.documentElement.style.fontSize = "20px";
            await new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
            const b = els.map((e) => parseFloat(getComputedStyle(e).fontSize));
            const off = els.map((e, i) => ({ i, t: (e.textContent ?? "").trim().slice(0, 24), a: a[i], b: b[i] })).filter((x) => Math.abs(x.b / x.a - 1.25) > 0.03);
            return { n: els.length, off: off.slice(0, 5).map((x) => `"${x.t}" ${x.a}→${x.b}`) };
          });
          await page.waitForTimeout(500);
          const after = await sweep(page);
          await page.evaluate(() => { document.documentElement.style.fontSize = ""; });
          await page.waitForTimeout(300);
          L.check("PA4-3", `${where} · every text scales (population ${scale.n})`, scale.n > 3 && scale.off.length === 0, scale.off.join(" | "));
          L.check("PA4-3", `${where} · nothing clips at 125%`, after.clipped.length === 0, after.clipped.slice(0, 5).join(" | "));
          L.check("PA4-3", `${where} · nothing past the right edge at 125%`, after.wide.length === 0, after.wide.slice(0, 5).join(" | "));
        }
      }
      await page.keyboard.press("Escape").catch(() => {});
    }
    L.done(isWebKit(page) ? 100 : 200);
  });
});

/* ═══════════════ PA4-4 Today's four states · PA4-10 motion ═══════════════ */
const setAid = (page: Page, aid: Record<string, unknown> | null) => page.evaluate((a) => { (window as unknown as { __SA_PA4_TODAY: unknown }).__SA_PA4_TODAY = a; }, aid);
/* in-app navigation (no reload, which would drop the aid): Queries, then back to Today */
async function reToday(page: Page) {
  if (!page.url().includes("/dashboard")) await go(page, "/dashboard");
  await tap(page, '[data-pa4="tab"][data-tab="queries"]');
  await tap(page, '[data-pa4="tab"][data-tab="today"]');
  await page.waitForTimeout(600);
}
test.describe("PA4 Today and motion", () => {
  test.skip(OTHER_MODE || !!process.env.PA4_ONLY && process.env.PA4_ONLY !== "today", "another mode");
  test("PA4-4 states · PA4-10 reduced motion", async ({ page }, info) => {
    test.skip(!isPhoneProject(info.project.name), "phone projects only");
    test.setTimeout(600_000);
    page.setDefaultTimeout(20_000);
    const L = new Ledger(`today-${info.project.name}`);
    const vp = PA4_PHONES[0];
    await openPhone4(page, "/dashboard", vp);
    const read = () => page.evaluate(() => {
      const t = [...document.querySelectorAll<HTMLElement>('[data-pa4="today"]')].find((e) => e.offsetParent);
      const has = (k: string) => !!t?.querySelector(`[data-pa4="${k}"]`);
      return { state: t?.dataset.state ?? "", tasks: Number(t?.dataset.tasks ?? -1), upNext: has("up-next"), stamp: has("stamp"), cont: has("continue"), whos: has("whos-next"), first: has("log-first"), ring: has("ring-card"), health: has("health") };
    });
    const muteTaskCard = async () => { if (MUT === "taskcard") await page.evaluate(() => { const t = [...document.querySelectorAll<HTMLElement>('[data-pa4="today"]')].find((e) => e.offsetParent); const d = document.createElement("div"); d.dataset.pa4 = "up-next"; t?.appendChild(d); }); };
    await setAid(page, null); await reToday(page); await muteTaskCard();
    let r = await read();
    L.check("PA4-4", "everyday: tasks on the board (population)", r.tasks > 0, `tasks ${r.tasks}`);
    L.check("PA4-4", "everyday", r.state === "everyday" && r.upNext && !r.whos && !r.first, JSON.stringify(r));
    L.check("PA4-4", "List health shows below 100% (population)", r.health, JSON.stringify(r));
    await setAid(page, { healthPct: 100 }); await reToday(page); await muteTaskCard();
    r = await read();
    L.check("PA4-4", "List health absent at 100%", !r.health, JSON.stringify(r));
    await setAid(page, { did: true }); await reToday(page); await muteTaskCard();
    r = await read();
    L.check("PA4-4", "straight after a task", r.state === "after" && r.stamp && r.cont && !r.upNext, JSON.stringify(r));
    await setAid(page, { tasks: 0 }); await reToday(page); await muteTaskCard();
    r = await read();
    L.check("PA4-4", "a quiet day: no task card", r.state === "quiet" && !r.upNext && r.whos, JSON.stringify(r));
    await setAid(page, { queries: 0 }); await reToday(page); await muteTaskCard();
    r = await read();
    L.check("PA4-4", "day one", r.state === "dayone" && r.first && !r.ring && !r.upNext, JSON.stringify(r));
    await setAid(page, null);

    /* PA4-10: with reduced motion, nothing is running on Today, the query page or the quick log */
    await page.emulateMedia({ reducedMotion: "reduce" });
    await setAid(page, { did: true }); await reToday(page); await mutate(page); await page.waitForTimeout(400);
    const live = async () => page.evaluate(() => document.getAnimations().filter((a) => a.playState === "running").map((a) => (a as CSSAnimation).animationName ?? "transition"));
    let an = await live();
    L.check("PA4-10", "Today (stamp, ring)", an.length === 0, an.join(", "));
    await setAid(page, null);
    await go(page, "/queries"); await tap(page, '[data-pa4="view"][data-k="bird"]'); await page.waitForTimeout(300);
    an = await live();
    L.check("PA4-10", "Birds-eye (the pulsing ring)", an.length === 0, an.join(", "));
    const beacons = await page.locator('[data-pa4="beacon"]').filter({ visible: true }).count();
    L.check("PA4-10", "Birds-eye has rings to stop (population)", beacons > 0, `${beacons} rings`);
    await tap(page, '[data-pa4="be-bar"]'); await tap(page, '[data-pa4="peek-open"]'); await page.waitForTimeout(300);
    an = await live();
    L.check("PA4-10", "the query page", an.length === 0, an.join(", "));
    await go(page, "/dashboard"); await tap(page, '[data-pa4="plus"]'); await tap(page, '[data-pa4="face"]'); await page.waitForTimeout(300);
    an = await live();
    L.check("PA4-10", "the quick log", an.length === 0, an.join(", "));
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await go(page, "/queries"); await page.waitForTimeout(200);
    const moving = await page.evaluate(() => document.getAnimations().length);
    L.check("PA4-10", "without the setting the ring still pulses (control)", moving > 0, `${moving} animations`);
    L.done(13);
  });
});

/* ═══════════════ PA4-5 Birds-eye · PA4-6 the query page from every door ═══════════════ */
const FIRST = (n: string) => n.trim().split(/\s+/)[0];
function expectedLabel(state: string, name: string): string | null {
  const f = FIRST(name);
  if (state === "offer") return "Record your answer";
  if (state === "nudge") return `I’ve nudged ${f}`;
  if (state === "quiet") return "Close this query";
  if (state === "agent") return `Log ${f}’s reply`;
  if (state === "materials") return "Mark (partial|full|revision) sent";
  return null;
}
test.describe("PA4 Birds-eye and the query page", () => {
  test.skip(OTHER_MODE || !!process.env.PA4_ONLY && process.env.PA4_ONLY !== "birds", "another mode");
  test("PA4-5 · PA4-6", async ({ page }, info) => {
    test.skip(!isPhoneProject(info.project.name), "phone projects only");
    test.setTimeout(600_000);
    page.setDefaultTimeout(20_000);
    const L = new Ledger(`birds-${info.project.name}`);
    const vp = PA4_PHONES[0];
    await openPhone4(page, "/queries", vp);
    await tap(page, '[data-pa4="view"][data-k="list"]');
    const vis = (sel: string) => page.locator(sel).filter({ visible: true }).count();
    L.check("PA4-5", "list shows rows, no bars", (await vis('[data-pa4="qrow"]')) > 0 && (await vis('[data-pa4="be-bar"]')) === 0, "");
    await tap(page, '[data-pa4="view"][data-k="bird"]');
    await mutate(page);
    L.check("PA4-5", "the switch swaps to bars", (await vis('[data-pa4="be-bar"]')) > 0 && (await vis('[data-pa4="qrow"]')) === 0, "");
    const groups = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-pa4="be-group"]')].filter((g) => g.offsetParent).map((g) => {
      const bars = [...(g.nextElementSibling as HTMLElement).querySelectorAll<HTMLElement>('[data-pa4="be-bar"]')];
      return { k: g.dataset.k, f: bars.map((b) => (b.dataset.f === "" ? null : Number(b.dataset.f))), past: bars.map((b) => ({ p: b.dataset.past === "1", ring: !!b.querySelector('[data-pa4="beacon"]') })) };
    }));
    L.check("PA4-5", `groups (population ${groups.length})`, groups.length >= 2, groups.map((g) => `${g.k}:${g.f.length}`).join(" "));
    for (const g of groups) {
      const fs = g.f;
      const sorted = fs.every((x, i) => i === 0 || (fs[i - 1] == null ? x == null : x == null || (fs[i - 1] as number) >= x - 1e-9));
      L.check("PA4-5", `How close orders ${g.k} closest first (${fs.length} bars)`, fs.length > 0 && sorted, fs.map((x) => (x == null ? "–" : x.toFixed(2))).join(" "));
      const pastN = g.past.filter((x) => x.p).length;
      L.check("PA4-5", `${g.k}: every bar past its date has the ring (${pastN} past)`, g.past.every((x) => x.p === x.ring), "");
    }
    L.check("PA4-5", "some query is past its date (population)", groups.some((g) => g.past.some((x) => x.p)), "");
    await go(page, "/dashboard");
    await stageTo(page, 900); await page.waitForTimeout(300);
    const prev = await page.locator('[data-pa4="closest"] [data-pa4="be-bar"]').filter({ visible: true }).count();
    L.check("PA4-5", "Today's preview shows three bars", prev === 3, `${prev}`);
    await tap(page, '[data-pa4="closest-all"]');
    L.check("PA4-5", "the preview opens the Birds-eye view", (await vis('[data-pa4="birds"]')) === 1 && page.url().includes("view=birds"), page.url());

    /* PA4-6: every door opens the full-screen page with a back arrow; its one button is the next step */
    const doors: [string, (p: Page) => Promise<void>][] = [
      ["Today", async (p) => { await go(p, "/dashboard"); await stageTo(p, 900); await tap(p, '[data-pa4="closest"] [data-pa4="be-bar"]'); }],
      ["Queries", async (p) => { await go(p, "/queries"); await tap(p, '[data-pa4="view"][data-k="list"]'); await tap(p, '[data-pa4="qrow"][data-court="agent"]'); }],
      ["Queries (with you)", async (p) => { await go(p, "/queries"); await tap(p, '[data-pa4="qrow"][data-court="you"]'); }],
      ["Birds-eye", async (p) => { await go(p, "/queries"); await tap(p, '[data-pa4="view"][data-k="bird"]'); await tap(p, '[data-pa4="be-bar"]'); await tap(p, '[data-pa4="peek-open"]'); }],
      ["Agents", async (p) => { await go(p, "/agents"); await tap(p, '[data-pa4="waiting-face"]'); }],
      ["search", async (p) => { await go(p, "/agents"); await tap(p, '[data-pa4="search"], [data-pa4="mini-search"]').catch(async () => { await go(p, "/queries"); await tap(p, '[data-pa4="search"]'); }); await p.keyboard.type("a"); await p.waitForTimeout(400); await tap(p, '[data-pa4="search-page"] [data-pa4="qrow"]'); }],
    ];
    for (const [door, open] of doors) {
      await open(page);
      await mutate(page);
      await page.waitForTimeout(400);
      const q = await page.evaluate(() => {
        const e = document.querySelector<HTMLElement>('[data-pa4="qpage"]');
        if (!e) return null;
        const r = e.getBoundingClientRect();
        const btn = e.querySelector<HTMLElement>('[data-pa4="qact"]');
        return { w: r.width, h: r.height, top: r.top, back: !!e.querySelector('[data-pa4="back"]'), state: e.dataset.state ?? "", name: e.querySelector(".who b")?.textContent ?? "", label: btn?.textContent?.trim() ?? null };
      });
      const vpx = page.viewportSize()!;
      L.check("PA4-6", `${door}: full screen with a back arrow`, !!q && Math.abs(q.w - vpx.width) < 1 && Math.abs(q.h - vpx.height) < 1 && q.top === 0 && q.back, JSON.stringify(q));
      const want = q ? expectedLabel(q.state, q.name) : null;
      L.check("PA4-6", `${door}: the button is the next step (${q?.state})`, !!q && (want == null ? q.label == null : new RegExp(`^${want}$`).test(q.label ?? "")), `${q?.label} vs ${want}`);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
    }
    L.done(16);
  });
});

/* ═══════════════ PA4-7 the quick log fills from the card and stores v3's record (then Undo) ═══════════════ */
const UID = (JSON.parse(readFileSync(resolve("tests/emulator-seed/harness.json"), "utf8")) as { uid: string }).uid;
const FS = "http://127.0.0.1:8085/v1/projects/demo-scriptally/databases/(default)/documents";
type FsDoc = { name: string; fields?: Record<string, Record<string, unknown>> };
async function fsList(col: string): Promise<FsDoc[]> {
  const out: FsDoc[] = []; let token = "";
  do {
    const r = await fetch(`${FS}/users/${UID}/${col}?pageSize=300${token ? `&pageToken=${token}` : ""}`, { headers: { Authorization: "Bearer owner" } });
    const j = (await r.json()) as { documents?: FsDoc[]; nextPageToken?: string };
    out.push(...(j.documents ?? [])); token = j.nextPageToken ?? "";
  } while (token);
  return out;
}
async function fsPatch(path: string, fields: Record<string, unknown>, mask: string[]): Promise<void> {
  const q = mask.map((m) => `updateMask.fieldPaths=${m}`).join("&");
  await fetch(`${FS}/users/${UID}/${path}?${q}`, { method: "PATCH", headers: { Authorization: "Bearer owner", "Content-Type": "application/json" }, body: JSON.stringify({ fields }) });
}
const idOf = (d: FsDoc) => d.name.split("/").pop()!;
const str = (d: FsDoc, k: string) => (d.fields?.[k]?.stringValue as string | undefined) ?? null;
const DAY = 86_400_000;
const isoDay = (ms: number) => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const shortDay = (ms: number) => new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
test.describe("PA4 quick log", () => {
  test.skip(OTHER_MODE || !!process.env.PA4_ONLY && process.env.PA4_ONLY !== "log", "another mode");
  test("PA4-7", async ({ page }, info) => {
    test.skip(info.project.name !== "pixel", "writes once, in Chromium");
    test.setTimeout(400_000);
    page.setDefaultTimeout(20_000);
    const L = new Ledger(`log-${info.project.name}`);
    const queries0 = await fsList("queries");
    const queried = new Set(queries0.map((d) => str(d, "agentId")));
    const agents = await fsList("agents");
    const target = agents.find((a) => !queried.has(idOf(a)) && str(a, "name"));
    L.check("PA4-7", "an agent with no query yet (population)", !!target, `${agents.length} agents`);
    if (!target) { L.done(1); return; }
    const aid = idOf(target);
    /* the agent asks for 50 pages and replies in 8 weeks — set for the run, put back after */
    const wanted = materialsWantedFromRows([
      { key: "queryLetter", kind: "binary", name: "Query letter", on: true },
      { key: "synopsis", kind: "binary", name: "Synopsis", on: true, pages: "" },
      { key: "sample", kind: "qty", name: "Opening sample", on: true, unit: "Pages", amount: "50" },
    ] as never);
    const was = { materialsWanted: target.fields?.materialsWanted ?? { arrayValue: {} }, responseTimeWeeks: target.fields?.responseTimeWeeks ?? { nullValue: null }, noResponseMeansNo: target.fields?.noResponseMeansNo ?? { booleanValue: false } };
    await fsPatch(`agents/${aid}`, { materialsWanted: { arrayValue: { values: wanted.map((w) => ({ stringValue: w })) } }, responseTimeWeeks: { integerValue: "8" }, noResponseMeansNo: { booleanValue: false } }, ["materialsWanted", "responseTimeWeeks", "noResponseMeansNo"]);
    let made: string[] = [];
    try {
      await openPhone4(page, "/queries", PA4_PHONES[0]);
      await tap(page, '[data-pa4="search"]');
      await page.keyboard.type(str(target, "name")!);
      await page.waitForTimeout(600);
      await tap(page, `[data-pa4="s-agent"][data-id="${aid}"] [data-pa4="s-log"]`);
      await mutate(page);
      if (MUT === "empty") await page.evaluate(() => { for (const e of document.querySelectorAll('[data-pa4="line-mats"], [data-pa4="line-reply"]')) e.textContent = ""; });
      const mats = (await page.locator('[data-pa4="line-mats"]').textContent()) ?? "";
      const reply = (await page.locator('[data-pa4="line-reply"]').textContent()) ?? "";
      const now = Date.now();
      const exp = now + 56 * DAY;
      L.check("PA4-7", "With it says first 50 pages, untouched", /first 50 pages/i.test(mats), mats);
      L.check("PA4-7", "Reply expected is 8 weeks out, with its date", reply.includes("8 weeks") && reply.includes(shortDay(exp)), `${reply} vs ${shortDay(exp)}`);
      await tap(page, '[data-pa4="log-query"]');
      await page.locator('[data-pa4="logged"]').waitFor();
      await page.waitForTimeout(1500);
      const after = await fsList("queries");
      made = after.filter((d) => !queries0.some((x) => idOf(x) === idOf(d))).map(idOf);
      const doc = after.find((d) => made.includes(idOf(d)));
      L.check("PA4-7", "one query stored", made.length === 1 && !!doc, made.join(","));
      if (doc) {
        const f = doc.fields ?? {};
        const mw = ((f.materialsWanted?.arrayValue as { values?: Record<string, unknown>[] } | undefined)?.values ?? []).map((v) => JSON.stringify(v));
        L.check("PA4-7", "v3's record: agent, today, the sample, the nudge a week after the date", str(doc, "agentId") === aid && (str(doc, "dateSent") ?? "").startsWith(isoDay(now))
          && mw.some((m) => m.includes("\"Query Letter\"")) && mw.some((m) => m.includes("Synopsis")) && mw.some((m) => /pages/.test(m) && /"50"/.test(m))
          && (str(doc, "nudgeDate") ?? "").startsWith(isoDay(exp + 7 * DAY)) && str(doc, "ifNoResponse") === "Remind me to nudge" && !f.writerExpectedDate, JSON.stringify({ dateSent: str(doc, "dateSent"), nudge: str(doc, "nudgeDate"), mw, ifNo: str(doc, "ifNoResponse"), we: !!f.writerExpectedDate }));
      }
      await tap(page, '[data-pa4="logged-done"]');
      await tap(page, '[data-pa4="snack"] [data-pa3="undo"]');
      await page.waitForTimeout(2500);
      const back = await fsList("queries");
      L.check("PA4-7", "Undo removes it", !back.some((d) => made.includes(idOf(d))), "");
    } finally {
      await fsPatch(`agents/${aid}`, was, ["materialsWanted", "responseTimeWeeks", "noResponseMeansNo"]);
    }
    L.done(6);
  });
});

/* ═══════════════ PA4-8 every page v3 reached is within three taps of a tab ═══════════════ */
const PATHS: [string, string[], string][] = [
  ["Responses", ['[data-pa4="tab"][data-tab="you"]', '[data-pa4="you-row"][data-path="/queries/responses"]'], "/queries/responses"],
  ["Analytics", ['[data-pa4="tab"][data-tab="you"]', '[data-pa4="full-picture"]'], "/queries/analytics"],
  ["Packages", ['[data-pa4="tab"][data-tab="you"]', '[data-pa4="you-row"][data-path="/queries/packages"]'], "/queries/packages"],
  ["Query letters", ['[data-pa4="tab"][data-tab="you"]', '[data-pa4="you-row"][data-path="/manuscripts#materials"]'], "#materials"],
  ["Synopses and comps", ['[data-pa4="tab"][data-tab="you"]', '[data-pa4="you-row"][data-path="/manuscripts#comps"]'], "#comps"],
  ["Your book", ['[data-pa4="tab"][data-tab="you"]', '[data-pa4="you-row"][data-path="/manuscripts"]'], "/manuscripts"],
  ["Corkboard", ['[data-pa4="tab"][data-tab="you"]', '[data-pa4="you-row"][data-path="/todo/corkboard"]'], "/todo/corkboard"],
  ["Wall of no", ['[data-pa4="tab"][data-tab="you"]', '[data-pa4="open-wall"]'], "#wall"],
  ["Streaks and goals", ['[data-pa4="tab"][data-tab="you"]', '[data-pa4="streak-card"]'], "/goals"],
  ["Settings", ['[data-pa4="tab"][data-tab="you"]', '[data-pa4="settings"]'], "/account"],
  ["Help centre", ['[data-pa4="tab"][data-tab="you"]', '[data-pa4="settings"]', 'text=Help centre'], "/help"],
  ["Import queries", ['[data-pa4="tab"][data-tab="you"]', '[data-pa4="settings"]', 'text=Import queries'], "/import"],
  ["Discover", ['[data-pa4="tab"][data-tab="queries"]', '[data-pa4="search"]', '[data-pa4="s-page"][data-path="/agents/discover"]'], "/agents/discover"],
  ["Everyone on your list", ['[data-pa4="tab"][data-tab="agents"]', '[data-pa4="everyone"]'], "overlay:agents-all"],
  ["Every task", ['[data-pa4="tab"][data-tab="today"]', '[data-pa4="see-all"]'], "overlay:tasks-page"],
  ["Add an agent", ['[data-pa4="tab"][data-tab="agents"]', '[data-pa4="add-agent"]'], "overlay:agent-flow"],
  ["An agent replied", ['[data-pa4="plus"]', '[data-pa4="plus-reply"]'], "overlay:reply-flow"],
];
test.describe("PA4 reachable", () => {
  test.skip(OTHER_MODE || !!process.env.PA4_ONLY && process.env.PA4_ONLY !== "reach", "another mode");
  test("PA4-8", async ({ page }, info) => {
    test.skip(!isPhoneProject(info.project.name), "phone projects only");
    test.setTimeout(600_000);
    page.setDefaultTimeout(15_000);
    const L = new Ledger(`reach-${info.project.name}`);
    await openPhone4(page, "/dashboard", PA4_PHONES[0]);
    for (const [label, steps, want] of PATHS) {
      await go(page, "/dashboard");
      const drop = () => (MUT === "noresponses" ? page.evaluate(() => { for (const e of document.querySelectorAll('[data-path="/queries/responses"]')) e.remove(); }) : Promise.resolve());
      let ok = steps.length <= 3, why = "";
      for (const s of steps) {
        try { await drop(); await press(page, page.locator(s).filter({ visible: true }).first(), 8000); await page.waitForTimeout(700); }
        catch (e) { ok = false; why = `no ${s}: ${String((e as Error).message).split("\n").filter((l) => /intercept|outside|stable|visible|waiting/.test(l)).slice(-3).join(" / ").slice(0, 300)}`; break; }
      }
      if (ok) {
        if (want.startsWith("overlay:")) ok = (await page.locator(`[data-pa4="${want.slice(8)}"], [data-pa3="${want.slice(8)}"]`).count()) > 0;
        else ok = page.url().includes(want);
        if (!ok) why = page.url();
      }
      L.check("PA4-8", `${label} in ${steps.length} taps`, ok, why);
      await page.keyboard.press("Escape").catch(() => {});
    }
    L.done(PATHS.length);
  });
});

/* ═══════════════ PA4-11 the desktop at 1512, unchanged: DOM identical, pixels within the base's own noise ═══════════════ */
test.describe("PA4-11 desktop", () => {
  test.skip(!process.env.PA4_DESKTOP, "set PA4_DESKTOP=base|new");
  test("capture, and compare against the base", async ({ page }, info) => {
    test.skip(info.project.name !== "measure", "the desktop project");
    test.setTimeout(300_000);
    const mode = process.env.PA4_DESKTOP!;
    const root = process.env.PA4_OUT ?? DIR;
    const out = `${root}/desktop/${mode}`;
    mkdirSync(out, { recursive: true });
    const PAGES: [string, string][] = [["dashboard", "/dashboard"], ["queries", "/queries"], ["agents", "/agents"], ["todo", "/todo"]];
    await openRoute(page, "/dashboard", { width: 1512, height: 982 });
    for (const [n, p] of PAGES) {
      await page.goto(p);
      await page.waitForTimeout(5000);
      await mutate(page);
      await page.addStyleTag({ content: "*{caret-color:transparent!important;animation:none!important;transition:none!important}" });
      await page.waitForTimeout(600);
      const dom = await page.evaluate(() => {
        const r = document.querySelector(".sa-shellframe") ?? document.body;
        return r.outerHTML.replace(/\s(style|data-loading)="[^"]*"/g, "").replace(/\sdata-at="\d{12,14}"/g, ' data-at="T"');
      });
      writeFileSync(`${out}/${n}.html`, dom);
      await page.screenshot({ path: `${out}/${n}.png`, fullPage: false });
    }
    if (mode !== "new") { expect(true).toBe(true); return; }
    const L = new Ledger("desktop");
    for (const [n] of PAGES) {
      const a = `${DIR}/desktop/base/${n}`, b = `${DIR}/desktop/new/${n}`;
      if (!existsSync(`${a}.html`)) { L.check("PA4-11", n, false, "no base capture: run PA4_DESKTOP=base on the served branch first"); continue; }
      const da = readFileSync(`${a}.html`, "utf8"), db = readFileSync(`${b}.html`, "utf8");
      let first = -1;
      for (let i = 0; i < Math.max(da.length, db.length); i++) if (da[i] !== db[i]) { first = i; break; }
      L.check("PA4-11", `${n} DOM`, da === db, first < 0 ? `${da.length} chars, identical` : `differs at ${first}: …${da.slice(Math.max(0, first - 80), first + 80)}… ⇄ …${db.slice(Math.max(0, first - 80), first + 80)}…`);
      const px = await page.evaluate(async ([x, y]) => {
        const load = (s: string) => new Promise<HTMLImageElement>((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = s; });
        const [ia, ib] = await Promise.all([load(x), load(y)]);
        if (ia.width !== ib.width || ia.height !== ib.height) return { diff: -1, total: 0 };
        const c = (i: HTMLImageElement) => { const cv = document.createElement("canvas"); cv.width = i.width; cv.height = i.height; const g = cv.getContext("2d")!; g.drawImage(i, 0, 0); return g.getImageData(0, 0, i.width, i.height).data; };
        const pa = c(ia), pb = c(ib);
        let d = 0;
        for (let i = 0; i < pa.length; i += 4) if (pa[i] !== pb[i] || pa[i + 1] !== pb[i + 1] || pa[i + 2] !== pb[i + 2]) d++;
        return { diff: d, total: pa.length / 4 };
      }, [`data:image/png;base64,${readFileSync(`${a}.png`).toString("base64")}`, `data:image/png;base64,${readFileSync(`${b}.png`).toString("base64")}`] as const);
      /* ⚠️ pixels are not stable run to run on this machine even on one build (v3 measured up to 4,891), so the DOM is held
         identical and the pixels to that noise floor */
      L.check("PA4-11", `${n} pixels`, px.diff >= 0 && px.diff <= 5000, `${px.diff} of ${px.total} pixels differ`);
    }
    L.done(8);
  });
});

/* ═══════════════ the pairs: each board phone beside the built screen ═══════════════ */
test.describe("PA4 pairs", () => {
  test.skip(!process.env.PA4_PAIRS, "set PA4_PAIRS=1");
  test("board beside built", async ({ page }, info) => {
    test.skip(info.project.name !== "pixel", "Chromium");
    test.setTimeout(900_000);
    page.setDefaultTimeout(20_000);
    const out = `${DIR}/pairs`;
    mkdirSync(out, { recursive: true });
    type Shot = { name: string; board: "today" | "pages"; i: number; built: null | (() => Promise<void>) };
    const T = (k: string) => `[data-pa4="${k}"]`;
    const SHOTS: Shot[] = [
      { name: "01-today", board: "today", i: 0, built: async () => { await setAid(page, null); await reToday(page); } },
      { name: "02-today-after", board: "today", i: 1, built: async () => { await setAid(page, { did: true }); await reToday(page); } },
      { name: "03-today-quiet", board: "today", i: 2, built: async () => { await setAid(page, { tasks: 0 }); await reToday(page); } },
      { name: "04-today-dayone", board: "today", i: 3, built: async () => { await setAid(page, { queries: 0 }); await reToday(page); await setAid(page, null); } },
      { name: "05-queries", board: "pages", i: 0, built: async () => { await go(page, "/queries"); await tap(page, '[data-pa4="view"][data-k="list"]'); } },
      { name: "06-search", board: "pages", i: 1, built: async () => { await tap(page, T("search")); await page.keyboard.type("mar"); } },
      { name: "07-queries-first", board: "pages", i: 2, built: null },
      { name: "08-birds", board: "pages", i: 3, built: async () => { await go(page, "/queries"); await tap(page, '[data-pa4="view"][data-k="bird"]'); } },
      { name: "09-birds-peek", board: "pages", i: 4, built: async () => { await tap(page, T("be-bar")); } },
      { name: "10-birds-6m", board: "pages", i: 5, built: async () => { await go(page, "/queries"); await tap(page, '[data-pa4="zoom"][data-k="m6"]'); } },
      { name: "11-birds-on-today", board: "pages", i: 6, built: async () => { await go(page, "/dashboard"); await page.evaluate(() => document.querySelector('[data-pa4="closest"]')?.scrollIntoView({ block: "center", behavior: "instant" as ScrollBehavior })); } },
      { name: "12-query-your-move", board: "pages", i: 7, built: async () => { await go(page, "/queries"); await tap(page, '[data-pa4="view"][data-k="list"]'); await tap(page, '[data-pa4="qrow"][data-court="you"]'); } },
      { name: "13-query-waiting", board: "pages", i: 8, built: async () => { await go(page, "/queries"); await tap(page, '[data-pa4="qrow"][data-court="agent"]'); } },
      { name: "14-query-after-logging", board: "pages", i: 9, built: null },
      { name: "15-agents", board: "pages", i: 10, built: async () => { await go(page, "/agents"); } },
      { name: "16-agent-card", board: "pages", i: 11, built: async () => { await tap(page, T("fit-card")); } },
      { name: "17-agents-all-queried", board: "pages", i: 12, built: null },
      { name: "18-you", board: "pages", i: 13, built: async () => { await go(page, "/you"); } },
      { name: "19-you-early", board: "pages", i: 14, built: null },
      { name: "20-log-who", board: "pages", i: 15, built: async () => { await go(page, "/dashboard"); await tap(page, T("plus")); } },
      { name: "21-log-filled", board: "pages", i: 16, built: async () => { await tap(page, T("face")); } },
      { name: "22-log-line", board: "pages", i: 17, built: async () => { await tap(page, '[data-pa4="line"][data-k="mats"]'); } },
      { name: "23-log-logged", board: "pages", i: 18, built: null },
    ];
    /* the boards, at the 1720-wide window they were drawn for; each phone is a `.ph` */
    await page.setViewportSize({ width: 1720, height: 1100 });
    for (const b of ["today", "pages"] as const) {
      await page.goto(`file://${resolve(`design-refs/phone-app-v4/phone-app-v4-${b}.html`)}`);
      await page.waitForTimeout(1500);
      const phones = page.locator(".ph");
      for (const s of SHOTS.filter((x) => x.board === b)) await phones.nth(s.i).screenshot({ path: `${out}/${s.name}-board.png`, animations: "disabled" });
    }
    await openPhone4(page, "/dashboard", { width: 375, height: 780 });
    for (const s of SHOTS) {
      if (!s.built) continue;
      await s.built();
      await page.waitForTimeout(900);
      await page.screenshot({ path: `${out}/${s.name}-built.png` });
    }
    await setAid(page, null);
  });
});
