/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v139 — the QC139 locks on the rendered Query Centre, at 1512 × 900 and 1280 × 800 with the shell.
 *
 * A1 one guide · A2 real ticks · B1 nothing written · B2 real screens · B3 flow · B4 early exit · B5 never counted ·
 * C1 rename · C2 icons. A3 (the empty account) is a unit lock (src/lib/qc139Guide.test.tsx): the shared harness
 * account cannot be emptied of its queries.
 *
 * Page-side breaks through `QC139_MUTATE=<lock>`; the source breaks through tests/e2e/qcV139Mutate.sh.
 * ⚠️ THE GUIDE'S STATE IS PER ACCOUNT (todoPrefs.queries.guide). Every case sets it through tests/e2e/guideFlags.mjs
 *    before it opens the page, and the file puts back what it found when it is done.
 * ⚠️ B1 READS THE FIRESTORE WRITE CHANNEL'S REQUEST BODIES: a write naming a query, an activity or "practice-pip" is a
 *    red; the guide's own writes (todoPrefs on the user document) are the one thing allowed.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { openRoute } from "./measure";

const DIR = "reports/qc-v139";
const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;
const MUT = process.env.QC139_MUTATE ?? "";

type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(lock: string, where: string, ok: unknown, detail: string) { this.rows.push({ lock, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${MUT ? `mut-${MUT}-` : ""}${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 40)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.lock} · ${r.where} — ${r.detail}`)).toEqual([]);
  }
}

/* ── the guide's per-account state ── */
const flags = (args: string) => execSync(`node tests/e2e/guideFlags.mjs --page queries ${args}`, { encoding: "utf8" }).trim().split("\n").pop()!;
const setGuide = (v: unknown) => flags(`--restore '${JSON.stringify(v)}'`);
const readGuide = (): { done?: Record<string, boolean>; seen?: boolean; hidden?: boolean; finished?: boolean } | null => JSON.parse(flags(""));
let original = "null";
test.beforeAll(() => { original = flags(""); });
test.afterAll(() => { flags(`--restore '${original}'`); });

const MUTATIONS: Record<string, { js?: string }> = {
  A1: { js: `(() => { const d = document.createElement("div"); d.setAttribute("data-qcv", "guide"); d.textContent = "Your desk, in three bands"; document.querySelector(".qcv-group[data-v138]")?.appendChild(d); })()` },
};

async function open(page: Page, vp: { width: number; height: number }, lock: string, guide: unknown = { seen: true }, oldGuideSeen = true) {
  setGuide(guide);
  /* the retired bottom-right guide's own "seen" flag: A1 leaves it unset, so on a build that still has that guide it shows */
  await page.addInitScript((seenOld: boolean) => { try { for (const k of ["contacts", "manuscripts"]) localStorage.setItem(`sa.guide.${k}`, "1"); if (seenOld) localStorage.setItem("sa.guide.queries", "1"); else localStorage.removeItem("sa.guide.queries"); localStorage.removeItem("sa.pinList.queries"); } catch { /* */ } }, oldGuideSeen);
  await openRoute(page, "/queries", vp);
  await page.locator(".qcv-group[data-v138]").first().waitFor({ timeout: 30_000 });
  await page.locator(".qc138-sheet [data-qcv='row']").first().waitFor({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);
  await page.mouse.move(5, 5);
  const m = MUT === lock ? MUTATIONS[lock] : null;
  if (m?.js) await page.evaluate(m.js);
}
const vis = (page: Page, sel: string) => page.evaluate((s) => [...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().height > 0) ?? null, sel).then((x) => !!x);
const pillText = (page: Page) => page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-pck='pill']")].find((e) => e.getBoundingClientRect().height > 0)?.innerText.replace(/\s+/g, " ").trim() ?? null);
async function openList(page: Page) {
  if (await page.locator("[data-pck='popover']").count()) return;
  await page.locator("[data-pck='pill']").first().click();
  await page.locator("[data-pck='popover']").waitFor({ timeout: 5000 });
}
const doneIn = (page: Page) => page.evaluate(() => Object.fromEntries([...document.querySelectorAll<HTMLElement>("[data-pck='item']")].map((li) => [li.dataset.k, li.dataset.done === "true"])));
const flowId = (page: Page) => page.evaluate(() => document.querySelector<HTMLElement>("[data-pck='flow']")?.dataset.flow ?? null);
const waitFlow = (page: Page, id: RegExp | string, ms = 8000) => page.waitForFunction((x) => {
  const f = document.querySelector<HTMLElement>("[data-pck='flow']")?.dataset.flow ?? "";
  return typeof x === "string" ? f === x : new RegExp(x).test(f);
}, typeof id === "string" ? id : id.source, { timeout: ms }).then(() => true).catch(() => false);
const pressEl = (page: Page, sel: string) => page.evaluate((s) => { const e = [...document.querySelectorAll<HTMLElement>(s)].find((x) => x.getBoundingClientRect().height > 0); e?.click(); return !!e; }, sel);

/* the page's own figures: none may include Pip */
const figures = (page: Page) => page.evaluate(() => {
  const top = [...document.querySelectorAll<HTMLElement>(".qc138-sheet [data-qc138='top']")].find((e) => e.getBoundingClientRect().height > 0);
  const glyphs = [...document.querySelectorAll<HTMLElement>("[data-qc138='glyph-btn']")].filter((e) => e.getBoundingClientRect().height > 0).map((g) => `${g.dataset.k}:${g.dataset.n}`).join(",");
  const tab = document.querySelector<HTMLElement>(".bvd-tab")?.getAttribute("aria-label") ?? "";
  const chart = [...document.querySelectorAll<HTMLElement>(".qcv-group[data-v138] [data-qc138='chart'], .qcv-group[data-v138] [data-qcv='oh-chart']")].map((e) => e.innerText.replace(/\s+/g, " ")).join("|");
  const bands = [...document.querySelectorAll<HTMLElement>(".qc138-sheet [data-qcv='gband']")].filter((b) => b.getBoundingClientRect().height > 0).map((b) => `${b.dataset.group}:${b.querySelector("[data-qcv='gband-n']")?.textContent}`).join(",");
  const todo = [...document.querySelectorAll<HTMLElement>(".ws-panel a, .ws-panel button")].find((e) => /To-do list/.test(e.textContent ?? ""))?.textContent?.replace(/\s+/g, " ") ?? "";
  return { title: (top?.querySelector("h2, [data-qc138='title']") ?? top)?.textContent?.replace(/\s+/g, " ").split("Find")[0].trim() ?? "", glyphs, tab, chart, bands, todo };
});

/* ── the practice walkthrough, driven as a writer would ── */
const ANSWER: Record<string, string> = { partial: "Partial requested", full: "Full requested", rr: "Revise & resubmit", pass: "Pass", offer: "Offer" };
async function startPip(page: Page) {
  await openList(page);
  /* Help system v1 C.5 — a row also holds SKIP and LEARN MORE: the row's own button is the direct child */
  await page.locator("[data-pck='item'][data-k='resp'] > button").click();
  return waitFlow(page, "pip-1");
}
async function toAnswers(page: Page) {
  await pressEl(page, "[data-qc139='practice'] [data-qcv='row']");
  const two = await waitFlow(page, "pip-2");
  await pressEl(page, "[data-qp='panel'] [data-door='resp']");
  const three = await waitFlow(page, "pip-3");
  return two && three;
}
async function answerAndSave(page: Page, kind: string, seen: string[]) {
  await page.locator(".qad-root.is-open button", { hasText: ANSWER[kind] }).first().click();
  await page.waitForTimeout(400);
  for (let i = 0; i < 6; i++) {
    const f = await flowId(page); if (f && !seen.includes(f)) seen.push(f);
    if (await page.locator(".qad-root.is-open button", { hasText: /^Save response/ }).count()) break;
    await page.locator(".qad-root.is-open button", { hasText: /^Next/ }).first().click();
    await page.waitForTimeout(700);
  }
  const f = await flowId(page); if (f && !seen.includes(f)) seen.push(f);
  await page.locator(".qad-root.is-open button", { hasText: /^Save response/ }).first().click();
  return waitFlow(page, "pip-done");
}

test.describe("Query Centre v139", () => {
  test("A1 · one guide: the old bottom-right guide is gone; the pill is the shared one", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("A1");
    for (const vp of SIZES) {
      await open(page, vp, "A1", { seen: true }, false);
      await page.waitForTimeout(2000);
      const old = await page.evaluate(() => ({
        el: [...document.querySelectorAll<HTMLElement>(".qcv-group[data-v138] [data-qcv='guide'], [data-guide='queries']")].length,
        copy: document.body.innerText.includes("Your desk, in three bands"),
      }));
      L.check("A1", `${vp.width} no old page guide`, old.el === 0 && !old.copy, JSON.stringify(old));
      const t = await pillText(page);
      /* Query Centre v140 §G: six items now ("Pin the list" is third) */
      /* RETARGETED by Help system v1 C.1 (the ring pill): "{Page} guide {n} of {N}" */
      L.check("A1", `${vp.width} the pill`, /^Query Centre guide ?[0-6] of 6$/.test(t ?? ""), `${t}`);
      const cls = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-pck='pill']")].find((e) => e.getBoundingClientRect().height > 0)?.className ?? "");
      L.check("A1", `${vp.width} the shared component's pill`, /\bpck-pill\b/.test(cls), cls);
    }
    /* the same component on /agents */
    await openRoute(page, "/agents", SIZES[0]);
    await page.waitForTimeout(1500);
    const a = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-pck='pill']")].find((e) => e.getBoundingClientRect().height > 0)?.className ?? null);
    L.check("A1", "/agents draws the same pill", a === null || /\bpck-pill\b/.test(a), `${a}`);
    L.done(7);
  });

  test("A2 · real ticks: each event ticks its item with no checklist involved, and persists", async ({ page }) => {
    test.setTimeout(420_000);
    const L = new Ledger("A2");
    const vp = SIZES[0];
    /* item 1: an account with queries starts with it ticked */
    await open(page, vp, "A2", { seen: true });
    await openList(page);
    L.check("A2", "imported queries tick item 1", (await doneIn(page)).log === true, JSON.stringify(await doneIn(page)));
    await page.keyboard.press("Escape");
    const cases: { k: string; act: (p: Page) => Promise<unknown> }[] = [
      { k: "find", act: async (p) => { await p.locator(".qc138-sheet [data-qc138='search'] input").first().fill("ma"); } },
      { k: "find", act: async (p) => { await pressEl(p, "[data-qc138='glyph-btn'][data-k='q']"); } },
      { k: "open", act: async (p) => { await pressEl(p, ".qc138-sheet [data-qcv='row']"); } },
      { k: "birds", act: async (p) => { await p.keyboard.press("b"); } },
    ];
    for (const c of cases) {
      await open(page, vp, "A2", { seen: true });
      await c.act(page);
      await page.waitForTimeout(2500);
      const g = readGuide();
      L.check("A2", `${c.k} written by the event`, g?.done?.[c.k] === true, JSON.stringify(g));
      await page.reload();
      await page.locator(".qc138-sheet [data-qcv='row']").first().waitFor({ timeout: 30_000 });
      await page.waitForTimeout(1500);
      await page.keyboard.press("Escape");
      await openList(page);
      L.check("A2", `${c.k} ticked after a reload`, (await doneIn(page))[c.k] === true, JSON.stringify(await doneIn(page)));
      /* no checklist button was pressed in this case */
      L.check("A2", `${c.k} with no spotlight`, (await flowId(page)) === null, "");
    }
    L.done(13);
  });

  for (const kind of ["partial", "full", "pass", "offer", "rr"] as const) {
    test(`B1 · nothing written: the practice journey end to end (${kind})`, async ({ page }) => {
      test.setTimeout(300_000);
      const L = new Ledger(`B1-${kind}`);
      await open(page, SIZES[0], "B1", { seen: true });
      const bad: string[] = []; const all: string[] = [];
      page.on("request", (r) => {
        if (r.method() !== "POST" || !/firestore\.googleapis\.com.*\/Write\//.test(r.url())) return;
        const body = decodeURIComponent(r.postData() ?? "");
        all.push(body.slice(0, 160));
        if (/practice-pip|\/queries\/|\/activities\/|\/activity\//.test(body)) bad.push(body.slice(0, 200));
      });
      const ls0 = await page.evaluate(() => JSON.stringify(Object.entries({ ...localStorage }).filter(([k]) => !/^firebase|^sa\.guide\./.test(k)).sort()));
      const ss0 = await page.evaluate(() => JSON.stringify(Object.keys({ ...sessionStorage }).sort()));
      const f0 = await figures(page);
      L.check("B1", "Pip arrives", await startPip(page), "");
      L.check("B1", "his panel and the journey", await toAnswers(page), "");
      const seen: string[] = [];
      L.check("B1", "saved, the last card", await answerAndSave(page, kind, seen), seen.join(","));
      await pressEl(page, "[data-qc139='clear-pip']");
      await page.waitForTimeout(1500);
      L.check("B1", "no write names a query, an activity or Pip", bad.length === 0, bad.join(" ‖ "));
      const ls1 = await page.evaluate(() => JSON.stringify(Object.entries({ ...localStorage }).filter(([k]) => !/^firebase|^sa\.guide\./.test(k)).sort()));
      const ss1 = await page.evaluate(() => JSON.stringify(Object.keys({ ...sessionStorage }).sort()));
      L.check("B1", "local storage unchanged", ls0 === ls1, ls1.length > 300 ? `${ls1.length} chars` : ls1);
      L.check("B1", "session storage keys unchanged", ss0 === ss1, `${ss0} → ${ss1}`);
      L.check("B1", "Pip is in no session or local store", !(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }).includes("practice-pip"))), "");
      const f1 = await figures(page);
      for (const k of Object.keys(f0) as (keyof typeof f0)[]) L.check("B1", `${k} unchanged`, f0[k] === f1[k], `${f0[k]} → ${f1[k]}`);
      L.done(13);
    });
  }

  test("B2 · real screens: the practice journey is the real one, with the same steps per answer", async ({ page }) => {
    test.setTimeout(360_000);
    const L = new Ledger("B2");
    await open(page, SIZES[0], "B2", { seen: true });
    const stepsOf = () => page.evaluate(() => {
      const root = document.querySelector<HTMLElement>(".qad-root.is-open");
      return { drawer: root?.querySelector<HTMLElement>("[data-qad-drawer]")?.dataset.qadDrawer ?? null, steps: [...(root?.querySelectorAll<HTMLElement>("[data-qad-step]") ?? [])].map((b) => b.getAttribute("aria-label")).join(" › "), stepper: !!root?.querySelector("[data-qad-stepper]") };
    });
    /* a real query's journey, opened from its own panel, read and left without saving */
    const real: Record<string, string> = {};
    await pressEl(page, ".qc138-sheet [data-qcv='row'][data-court='agent']");
    await page.waitForTimeout(1200);
    await pressEl(page, "[data-qp='panel'] [data-door='resp']");
    await page.waitForTimeout(1200);
    for (const k of ["partial", "full", "pass", "offer", "rr"]) {
      await page.locator(".qad-root.is-open button", { hasText: ANSWER[k] }).first().click();
      await page.waitForTimeout(400);
      real[k] = (await stepsOf()).steps;
    }
    /* leave the real journey WITHOUT parking it: ✕, then Discard (Escape would park it, mounted and hidden) */
    await page.locator(".qad-root.is-open .qad-dx").first().click();
    await page.waitForTimeout(400);
    await page.locator(".qad-root.is-open button.disc").first().click();
    await page.waitForTimeout(800);
    await page.keyboard.press("Escape"); await page.waitForTimeout(800);
    L.check("B2", "the real journey was discarded, not parked", !(await page.evaluate(() => !!sessionStorage.getItem("qh.parkedJourney") || !!document.querySelector("[data-qad-root][style*='none']"))), "");
    /* Pip's */
    L.check("B2", "Pip arrives", await startPip(page), "");
    L.check("B2", "the journey opens", await toAnswers(page), "");
    /* the drawer mounts its step list a moment after Pip's third card shows; read it once it is there (up to 5s), and
       record how long that took, so a slow drawer is a number in the ledger rather than a flake */
    const t0 = Date.now();
    await page.waitForFunction(() => !!document.querySelector(".qad-root.is-open [data-qad-drawer]"), null, { timeout: 5000 }).catch(() => {});
    const waited = Date.now() - t0;
    const s = await stepsOf();
    L.check("B2", "the drawer is up within 5s of the third card", waited < 5000, `${waited}ms`);
    L.check("B2", "the real response drawer, stepped into the panel", s.drawer === "resp" && s.stepper, JSON.stringify(s));
    for (const k of ["partial", "full", "pass", "offer", "rr"]) {
      await page.locator(".qad-root.is-open button", { hasText: ANSWER[k] }).first().click();
      await page.waitForTimeout(400);
      const p = (await stepsOf()).steps;
      L.check("B2", `${k}: the same steps`, !!real[k] && p === real[k], `real "${real[k]}" · practice "${p}"`);
    }
    await page.keyboard.press("Escape");
    L.done(10);
  });

  test("B3 · flow: band → row → Record a response → one card per step → saved → cleared and ticked", async ({ page }) => {
    test.setTimeout(420_000);
    const L = new Ledger("B3");
    for (const vp of SIZES) {
      await open(page, vp, "B3", { seen: true });
      L.check("B3", `${vp.width} card 1 on the Practice band`, await startPip(page), `${await flowId(page)}`);
      await page.waitForFunction(() => !!document.querySelector("[data-pck='flow'] [data-pck='dim'][data-hole]"), null, { timeout: 5000 }).catch(() => {});
      const hole = await page.evaluate(() => {
        const d = document.querySelector<HTMLElement>("[data-pck='flow'] [data-pck='dim']");
        const b = document.querySelector<HTMLElement>("[data-qc139='practice']")?.getBoundingClientRect();
        const h = d?.dataset.hole ? JSON.parse(d.dataset.hole) : null;
        return { h, b: b ? { left: b.left, top: b.top, width: b.width, height: b.height } : null };
      });
      L.check("B3", `${vp.width} the hole is round the band and Pip's row`, !!hole.h && !!hole.b && Math.abs(hole.h.left - (hole.b.left - 8)) <= 2 && Math.abs(hole.h.top - (hole.b.top - 8)) <= 2, JSON.stringify(hole));
      L.check("B3", `${vp.width} the band says what it is`, await page.evaluate(() => /Only on this screen · not saved to your account/i.test(document.querySelector("[data-qc139='practice']")?.textContent ?? "")), "");
      L.check("B3", `${vp.width} row → card 2 in his panel`, await toAnswers(page), `${await flowId(page)}`);
      const seen: string[] = ["pip-3"];
      L.check("B3", `${vp.width} saved → the last card`, await answerAndSave(page, "partial", seen), seen.join(","));
      L.check("B3", `${vp.width} one card per journey step`, seen.length >= 3 && seen.every((x, i) => i === 0 || Number(x.split("-")[1]) === Number(seen[i - 1].split("-")[1]) + 1), seen.join(","));
      const after = await page.evaluate(() => ({
        ledger: [...document.querySelectorAll<HTMLElement>("[data-qp='panel'] .qcv-open")].map((e) => e.innerText).join(" "),
        footer: [...document.querySelectorAll<HTMLElement>("[data-qp='panel'] [data-qcv='open-action']")].map((e) => e.textContent).join(","),
        card: document.querySelector<HTMLElement>("[data-pck='flow'] [data-pck='card']")?.textContent ?? "",
      }));
      L.check("B3", `${vp.width} the ledger shows the reply`, /asked for a partial/i.test(after.ledger), after.ledger.slice(0, 160));
      L.check("B3", `${vp.width} the footer is his next action`, /Mark partial sent/.test(after.footer), after.footer);
      L.check("B3", `${vp.width} the last card says your move`, /it’s now your move/.test(after.card), after.card.slice(0, 120));
      await pressEl(page, "[data-qc139='clear-pip']");
      await page.waitForTimeout(1500);
      L.check("B3", `${vp.width} the band is gone`, !(await page.evaluate(() => !!document.querySelector("[data-qc139='practice']"))), "");
      const g = readGuide();
      L.check("B3", `${vp.width} item 4 ticked`, g?.done?.resp === true, JSON.stringify(g));
    }
    L.done(22);
  });

  test("B4 · early exit: Esc at card 3, and the journey's own way out, remove Pip and leave item 4 unticked", async ({ page }) => {
    test.setTimeout(360_000);
    const L = new Ledger("B4");
    const after = async (where: string) => {
      await page.waitForTimeout(1200);
      L.check("B4", `${where}: no band`, !(await page.evaluate(() => !!document.querySelector("[data-qc139='practice']"))), "");
      L.check("B4", `${where}: no panel`, !(await vis(page, "[data-qp='panel'][data-qp-id='practice-pip']")), "");
      L.check("B4", `${where}: item 4 unticked`, readGuide()?.done?.resp !== true, JSON.stringify(readGuide()));
      L.check("B4", `${where}: the checklist is open`, (await page.locator("[data-pck='popover']").count()) === 1, "");
    };
    await open(page, SIZES[0], "B4", { seen: true });
    await startPip(page); await toAnswers(page);
    await page.keyboard.press("Escape");
    await after("Esc at card 3");
    await page.keyboard.press("Escape");
    await open(page, SIZES[0], "B4", { seen: true });
    await startPip(page); await toAnswers(page);
    await page.locator(".qad-root.is-open button", { hasText: ANSWER.partial }).first().click();
    await page.waitForTimeout(300);
    await page.locator(".qad-root.is-open [data-qad-later]").first().click();
    await after("the journey's Finish later");
    await page.keyboard.press("Escape");
    await open(page, SIZES[0], "B4", { seen: true });
    await startPip(page); await toAnswers(page);
    await page.reload();
    await page.locator(".qc138-sheet [data-qcv='row']").first().waitFor({ timeout: 30_000 });
    await page.waitForTimeout(1500);
    L.check("B4", "a reload mid-walkthrough shows no Pip", !(await page.evaluate(() => !!document.querySelector("[data-qc139='practice']") || document.body.innerText.includes("Pip Ledger"))), "");
    L.done(9);
  });

  test("B5 · never counted: during the walkthrough the page's figures exclude Pip; the Birds-eye drawer and the Contact list never show him", async ({ page }) => {
    test.setTimeout(360_000);
    const L = new Ledger("B5");
    await open(page, SIZES[0], "B5", { seen: true });
    const f0 = await figures(page);
    const filt0 = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-qc138='filters-btn']")].map((e) => e.textContent).join("|"));
    await startPip(page);
    await page.waitForTimeout(800);
    const f1 = await figures(page);
    L.check("B5", "Pip is on screen", await vis(page, "[data-qc139='practice'] [data-qcv='row']"), "");
    for (const k of ["title", "glyphs", "tab", "chart", "todo"] as const) L.check("B5", `${k} excludes Pip`, f0[k] === f1[k], `${f0[k]} → ${f1[k]}`);
    L.check("B5", "the bands' counts exclude Pip", f0.bands === f1.bands, `${f0.bands} → ${f1.bands}`);
    await toAnswers(page);
    await page.locator(".qad-root.is-open button", { hasText: ANSWER.partial }).first().click();
    const f2 = await figures(page);
    L.check("B5", "mid-journey, the title excludes Pip", f0.title === f2.title && f0.glyphs === f2.glyphs, `${f2.title} ${f2.glyphs}`);
    const filt1 = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-qc138='filters-btn']")].map((e) => e.textContent).join("|"));
    L.check("B5", "the filters' counts exclude Pip", filt0 === filt1, `${filt0} → ${filt1}`);
    /* the Birds-eye drawer, opened from its own tab: no Pip (the walkthrough is ended first: B stands down during it) */
    await page.keyboard.press("Escape");
    await page.waitForTimeout(800);
    await page.keyboard.press("Escape");
    await startPip(page);
    await pressEl(page, ".bvd-tab");
    await page.waitForTimeout(1500);
    L.check("B5", "Pip is not in the Birds-eye drawer", !(await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-bvd], .bvd")].some((e) => e.getBoundingClientRect().height > 0 && /Pip Ledger/.test(e.innerText)))), "");
    await openRoute(page, "/agents", SIZES[0]);
    await page.waitForTimeout(2000);
    L.check("B5", "Pip is not in the Contact list", !(await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".clv-group")].some((e) => /Pip Ledger|Practice Desk/.test(e.innerText)))), "");
    L.done(11);
  });

  test("C1 · rename: the menu reads Who it's with, the title grouped by who it's with, and a saved Urgency opens on it", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("C1");
    await page.addInitScript(() => { try { localStorage.setItem("sa.qcList.v1", JSON.stringify({ v: 2, density: "comfortable", group: "attention" })); } catch { /* */ } });
    for (const vp of SIZES) {
      await open(page, vp, "C1", { seen: true });
      /* Query Centre v140 §A retired the title; the Group by chip names the grouping (and drops "Grouped by" at 1280) */
      const title = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".qc138-sheet [data-qc140='group']")].find((e) => e.getBoundingClientRect().height > 0)?.innerText.replace(/\s+/g, " ") ?? "");
      L.check("C1", `${vp.width} the Group by chip`, /who it’s with|who it's with/i.test(title), title);
      L.check("C1", `${vp.width} a saved Urgency opens on Who it's with (the talon's band)`, await vis(page, ".qc138-sheet [data-qcv='gband'][data-group='you'] [data-qcv='gband-art']"), "");
      await page.locator(".qc138-sheet [data-ltb='group-name']").first().click();
      await page.waitForTimeout(300);
      const menu = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-qc138='group-menu'] button")].map((b) => b.textContent?.trim()).join("|"));
      L.check("C1", `${vp.width} the menu`, /Who it's with/.test(menu) && !/Urgency/.test(menu), menu);
      await page.keyboard.press("Escape");
    }
    L.done(6);
  });

  test("C2 · icons: Status glyphs, Next action badges, the package cube — and no hourglass", async ({ page }) => {
    test.setTimeout(360_000);
    const L = new Ledger("C2");
    for (const vp of SIZES) {
      await open(page, vp, "C2", { seen: true });
      const pick = async (label: string) => {
        await page.locator(".qc138-sheet [data-ltb='group-name']").first().click();
        await page.waitForTimeout(300);
        await page.locator("[data-qc138='group-menu'] button", { hasText: label }).first().click();
        await page.waitForTimeout(800);
      };
      const read = () => page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".qc138-sheet [data-qcv='gband']")].filter((b) => b.getBoundingClientRect().height > 0).map((b) => {
        const art = b.querySelector<HTMLElement>("[data-qc139='band-art'], [data-qcv='gband-art'], .qc138-gart");
        const r = art?.getBoundingClientRect(); const br = b.getBoundingClientRect();
        return { key: b.dataset.group ?? "", kind: art?.dataset.kind ?? null, svg: !!art?.querySelector("svg"), img: b.querySelectorAll("img").length, badge: !!b.querySelector("[data-qc139='badge'], .badge"), left: r ? r.left - br.left : null };
      }));
      await pick("Who it's with");
      const def = await read();
      const defLeft = def[0]?.left ?? null;
      await pick("Status");
      const st = await read();
      L.check("C2", `${vp.width} Status: bands`, st.length >= 3, `${st.length}`);
      L.check("C2", `${vp.width} Status: each a glyph svg and no img`, st.every((b) => b.kind === "glyph" && b.svg && b.img === 0), JSON.stringify(st.filter((b) => !(b.kind === "glyph" && b.svg && b.img === 0))));
      await pick("Next action");
      const na = await read();
      const closedKeys = ["Rejected", "No Response", "Withdrawn", "Signed"];
      L.check("C2", `${vp.width} Next action: a badge on every band but the closed ones`, na.every((b) => (closedKeys.includes(b.key) ? !b.badge : b.badge)), JSON.stringify(na.map((b) => `${b.key}:${b.badge}`)));
      L.check("C2", `${vp.width} Next action: no img`, na.every((b) => b.img === 0), "");
      await pick("Submission package");
      const pk = await read();
      L.check("C2", `${vp.width} Package: every band's art is the package icon`, pk.length > 0 && pk.every((b) => b.kind === "package" && b.img === 0), JSON.stringify(pk.filter((b) => b.kind !== "package" || b.img)));
      for (const [name, set] of [["Status", st], ["Next action", na], ["Package", pk]] as const) {
        L.check("C2", `${vp.width} ${name}: the art's left edge is the default's (±1)`, defLeft != null && set.every((b) => b.left != null && Math.abs(b.left - defLeft) <= 1), `default ${defLeft} · ${set.map((b) => b.left?.toFixed(1)).join(",")}`);
      }
      await pick("Who it's with");
    }
    L.done(16);
  });
});
