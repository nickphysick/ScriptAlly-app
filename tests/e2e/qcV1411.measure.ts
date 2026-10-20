/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v141.1 — the QC1411 locks: the four sets on the nudge window (lib/nudgeWindow).
 *
 * L1 same set · L2 matches Next action · L3 boundaries · L4 sum. (L5, no regression, is QC141 / QC140 / QC1401 / HR1 /
 * CL19.x run on the same build.)
 *
 * ⚠️ A FIXED CLOCK, AND SIX SEEDED QUERIES ON THE EDGES. The page runs at T (`page.clock.setFixedTime`), a minute boundary
 *    at or before the real time so the sign-in token never reads as expired; tests/e2e/seedQc1411.mjs places six
 *    agent-court queries against the same T: their expected dates are T + 1 day, T, T − 1, T − 28, T − 28.5 and T − 29
 *    days. The shared account has nothing that close to either edge, so without them `<` and `<=` (and 28 against 29
 *    days) would read the same. They are removed in the same run.
 * ⚠️ L1 DOES NOT TAKE THE QUICK PICK'S WORD FOR WHAT "WITH YOU" IS. Both read `whereItStands`, so comparing them alone
 *    proves only that two callers call one function. The set is also derived from each ROW: its own court, and the
 *    Next move it shows ("Nudge" is the nudge window, read by `leadDoors`).
 * ⚠️ EVERY CASE PROVES ITS POPULATION FIRST, and the guide is put back after.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { openRoute } from "./measure";

const DIR = "reports/qc-v141-1";
const MUT = process.env.QC1411_MUTATE ?? "";
const KEYS = ["you", "agent", "quiet", "closed"] as const;
const W1512 = { width: 1512, height: 900 }, W1280 = { width: 1280, height: 800 };

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

const flags = (a: string) => execSync(`node tests/e2e/guideFlags.mjs --page queries ${a}`, { encoding: "utf8" }).trim().split("\n").pop()!;
/** the clock: a minute boundary at or before now */
const T = Math.floor(Date.now() / 60_000) * 60_000;
let original = "null";
test.beforeAll(() => {
  original = flags("");
  execSync(`node tests/e2e/seedQc1411.mjs --t ${T}`, { encoding: "utf8", stdio: "pipe" });
});
test.afterAll(() => {
  execSync("node tests/e2e/seedQc1411.mjs --clean", { encoding: "utf8", stdio: "pipe" });
  flags(`--restore '${original}'`);
});

async function open(page: Page, vp: { width: number; height: number }, group?: string) {
  await page.clock.setFixedTime(T);
  await page.addInitScript(() => {
    try { sessionStorage.removeItem("qh.qc.filters"); localStorage.removeItem("qh.qc.view"); localStorage.setItem("sa.guide.queries", "1"); localStorage.removeItem("sa.pinList.queries"); } catch { /* */ }
  });
  await openRoute(page, "/queries", vp);
  await page.locator(".qcv-group[data-v138]").first().waitFor({ timeout: 30_000 });
  await page.locator(".qc138-sheet [data-qcv='row'][data-qid^='q1411-']").first().waitFor({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);
  await page.mouse.move(5, 5);
  if (group) await pickGroup(page, group);
}
const G = ".qcv-group[data-v138]";
const press = (page: Page, sel: string) => page.evaluate((s) => { const e = [...document.querySelectorAll<HTMLElement>(s)].find((x) => x.getBoundingClientRect().height > 0); e?.click(); return !!e; }, sel);
async function pickGroup(page: Page, g: string) {
  await press(page, `${G} [data-qc140='group']`); await page.waitForTimeout(400);
  await press(page, `[data-qc140='group-opt'][data-g='${g}']`); await page.waitForTimeout(900);
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);
}
const isPinned = (page: Page) => page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-qc140='pin']")].find((e) => e.getBoundingClientRect().height > 0)?.getAttribute("aria-pressed") === "true");
async function pin(page: Page, on: boolean) { if (on !== (await isPinned(page))) { await press(page, "[data-qc140='pin']"); await page.waitForTimeout(900); } }
const NEXT = ["Nudge", "Consider closing", "Waiting", "Reply due", "Send partial", "Send full", "Send revision", "Decide on offer", "Passed", "Closed with no reply", "Withdrawn", "Signed", "Resubmitted"];
/** every row the list draws: its id, court, and the Next move phrase it shows */
const rows = (page: Page) => page.evaluate((next) => {
  const g = [...document.querySelectorAll<HTMLElement>(".qcv-group[data-v138]")].find((e) => e.getBoundingClientRect().width > 0)!;
  return [...g.querySelectorAll<HTMLElement>(".qc138-sheet [data-qcv='row']")].map((r) => ({
    id: r.dataset.qid!, court: r.dataset.court!, next: r.innerText.split("\n").map((t) => t.trim()).find((t) => next.includes(t)) ?? "?",
  }));
}, NEXT);
const ids = async (page: Page) => (await rows(page)).map((r) => r.id).sort();
const counts = (page: Page, sel: string, key: string) => page.evaluate(([s, k]) => Object.fromEntries([...document.querySelectorAll<HTMLElement>(s)].filter((e) => e.getBoundingClientRect().height > 0 || !!e.closest("[data-qc140='filter-menu']")).map((e) => [e.dataset[k as "k"], Number(e.dataset.n)])), [sel, key] as const);
const total = (page: Page) => page.evaluate(() => Number([...document.querySelectorAll<HTMLElement>("[data-qc138='title-n']")].find((e) => e.getBoundingClientRect().height > 0)?.textContent));
const same = (a: string[], b: string[]) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
const diff = (a: string[], b: string[]) => `only left: ${a.filter((x) => !b.includes(x)).slice(0, 6).join(" ")} · only right: ${b.filter((x) => !a.includes(x)).slice(0, 6).join(" ")}`;
/** the list's ids with one where-set on, through the card's own row */
async function setIds(page: Page, k: string) {
  await press(page, `[data-qc141='card-row'][data-k='${k}']`); await page.waitForTimeout(700);
  const out = await ids(page);
  await press(page, `[data-qc141='card-row'][data-k='${k}']`); await page.waitForTimeout(500);
  return out;
}

test.describe("Query Centre v141.1", () => {
  test("L1 · same set: the Your move quick pick is the With you set — and the rows say so; the card, band and menu agree", async ({ page }) => {
    test.setTimeout(240_000);
    const L = new Ledger("L1");
    await open(page, W1512);
    const all = await rows(page);
    const fromRows = all.filter((r) => r.court === "you" || (r.court === "agent" && r.next === "Nudge")).map((r) => r.id);
    L.check("L1", "population: With you holds both kinds (the writer's court and nudge-due agent-court rows)",
      all.some((r) => r.court === "you") && all.some((r) => r.court === "agent" && r.next === "Nudge"), `${fromRows.length} of ${all.length}`);
    const youSet = await setIds(page, "you");
    await press(page, `${G} [data-qc140='filters']`); await page.waitForTimeout(600);
    const menuQuick = await counts(page, "[data-qc140='quick']", "qp");
    const menuWhere = await counts(page, "[data-qc141='where-opt']", "k");
    await press(page, "[data-qc140='quick'][data-qp='you']"); await page.waitForTimeout(700);
    const pickSet = await ids(page);
    await press(page, "[data-qc140='filter-clear']"); await press(page, "[data-qc140='filter-close']"); await page.waitForTimeout(500);
    L.check("L1", "the quick pick's ids are the card's With you ids", pickSet.length > 0 && same(pickSet, youSet), `${pickSet.length} vs ${youSet.length}; ${diff(pickSet, youSet)}`);
    L.check("L1", "…and the rows': the writer's court plus every agent-court row whose Next move is Nudge", same(youSet, fromRows), `${youSet.length} vs ${fromRows.length}; ${diff(youSet, fromRows)}`);
    const card = await counts(page, "[data-qc141='card-row']", "k");
    await pin(page, true);
    const band = await counts(page, "[data-qc141='band-set']", "k");
    await pin(page, false);
    L.check("L1", "card, band and menu state one With you count, and the quick pick's", card.you === youSet.length && band.you === card.you && menuWhere.you === card.you && menuQuick.you === card.you,
      `card ${card.you} · band ${band.you} · menu ${menuWhere.you} · quick pick ${menuQuick.you} · rows ${youSet.length}`);
    L.check("L1", "card, band and menu agree on all four", KEYS.every((k) => card[k] === band[k] && card[k] === menuWhere[k]), `${JSON.stringify(card)} · ${JSON.stringify(band)} · ${JSON.stringify(menuWhere)}`);
    L.done(5);
  });

  test("L2 · matches Next action: Gone quiet is Consider closing; the agent-court With you is Nudge", async ({ page }) => {
    test.setTimeout(240_000);
    const L = new Ledger("L2");
    await open(page, W1512);
    const all = await rows(page);
    const agentCourt = new Set(all.filter((r) => r.court === "agent").map((r) => r.id));
    const quiet = await setIds(page, "quiet");
    const you = (await setIds(page, "you")).filter((id) => agentCourt.has(id));
    await pickGroup(page, "action");
    const bands = await page.evaluate(() => {
      const g = [...document.querySelectorAll<HTMLElement>(".qcv-group[data-v138]")].find((e) => e.getBoundingClientRect().width > 0)!;
      const out: Record<string, string[]> = {}; let cur = "";
      for (const el of g.querySelectorAll<HTMLElement>(".qc138-sheet [data-qcv='gband'], .qc138-sheet [data-qcv='row']")) {
        if (el.dataset.qcv === "gband") cur = el.dataset.group ?? "?"; else (out[cur] ??= []).push(el.dataset.qid!);
      }
      return out;
    });
    const close = bands.close ?? [], nudge = bands.nudge ?? [];
    L.check("L2", "population: both sets, and the seeded edges in each", quiet.length > 0 && you.length > 0 && quiet.includes("q1411-past29") && you.includes("q1411-at28"), `quiet ${quiet.length} · agent-court you ${you.length}`);
    L.check("L2", "Gone quiet = Consider closing", same(quiet, close), `${quiet.length} vs ${close.length}; ${diff(quiet, close)}`);
    L.check("L2", "the agent-court With you = Nudge", same(you, nudge), `${you.length} vs ${nudge.length}; ${diff(you, nudge)}`);
    L.done(3);
  });

  test("L3 · boundaries: at a fixed clock, before the reply date is With the agent, past it With you, past the nudge window Gone quiet", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("L3");
    /* the pack's three points, and the two exact edges a ≤/< swap moves */
    const WANT: [string, string][] = [["q1411-before1", "agent"], ["q1411-at0", "agent"], ["q1411-past1", "you"], ["q1411-at28", "you"], ["q1411-past28h", "quiet"], ["q1411-past29", "quiet"]];
    for (const vp of [W1512, W1280]) {
      await open(page, vp);
      const inSet: Record<string, string[]> = {};
      for (const k of KEYS) inSet[k] = await setIds(page, k);
      const seeded = (await ids(page)).filter((id) => id.startsWith("q1411-"));
      L.check("L3", `${vp.width} population: the six seeded queries are on the page`, seeded.length === 6, seeded.join(" "));
      for (const [id, k] of WANT) {
        const got = KEYS.filter((x) => inSet[x].includes(id));
        L.check("L3", `${vp.width} ${id} is ${k}`, got.length === 1 && got[0] === k, `in ${got.join(",") || "none"}`);
      }
    }
    L.done(14);
  });

  test("L4 · sum: the four sets are disjoint and sum to the hero total", async ({ page }) => {
    test.setTimeout(240_000);
    const L = new Ledger("L4");
    await open(page, W1512);
    const all = (await ids(page));
    const t = await total(page);
    const card = await counts(page, "[data-qc141='card-row']", "k");
    L.check("L4", "population", all.length > 0 && t === all.length, `${all.length} rows · total ${t}`);
    L.check("L4", "the card's four sum to the total", KEYS.reduce((a, k) => a + card[k], 0) === t, `${JSON.stringify(card)} vs ${t}`);
    const seen = new Map<string, string[]>();
    for (const k of KEYS) for (const id of await setIds(page, k)) seen.set(id, [...(seen.get(id) ?? []), k]);
    const multi = [...seen].filter(([, ks]) => ks.length !== 1);
    L.check("L4", "every id in exactly one set", multi.length === 0 && seen.size === all.length, `${seen.size}/${all.length}; twice: ${multi.slice(0, 5).map(([id, ks]) => `${id}:${ks}`).join(" ")}`);
    L.done(3);
  });
});
