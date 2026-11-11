/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v3 — THE MEASUREMENT (design-refs/phone-app-v3/phone-app-v3.html), on the emulator harness account.
 *
 *   npm run e2e:emu -- tests/e2e/phoneAppV3.measure.ts --project=pixel     the phone locks PA3-1…10 (Chromium)
 *   … --project=iphone                                                      the same, once, in WebKit
 *   PA3_DESKTOP=base|new … --project=measure                                PA3-11: capture the desktop (base: the served
 *                                                                           branch's build; new: this one), then compare
 *   PA3_MUTATE=<name>                                                       a mutation that must turn its lock red
 *   PA3_PAIRS=1 … --project=pixel                                           ref-beside-built shots into reports/…/pairs
 *   PA3_PROBE=1 PA3_PATHS=… PA3_SHOTS=…                                     a look, nothing asserted
 *
 * ⚠️ EVERYTHING IT WRITES IT UNDOES OR DELETES (the log and the reply through their own Undo; the fixture agent through
 *    the emulator's REST API, by id). The emulator also starts every run from the committed snapshot.
 * ⚠️ READINGS ARE ON THE VISIBLE PAGE: every workspace page stays mounted, so each probe scopes to `[data-pa3]` roots
 *    whose `offsetParent` is set, or to the overlay layer.
 */
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { openRoute } from "./measure";

const DIR = "reports/phone-app-v3";
const MUT = process.env.PA3_MUTATE ?? "";
export const PA3_PHONES = [{ width: 390, height: 844 }, { width: 360, height: 740 }] as const;
const tag = (v: { width: number; height: number }) => `${v.width}x${v.height}`;
const isPhoneProject = (name: string) => name === "pixel" || name === "iphone";
const UID = (JSON.parse(readFileSync(resolve("tests/emulator-seed/harness.json"), "utf8")) as { uid: string }).uid;
const FS = "http://127.0.0.1:8085/v1/projects/demo-scriptally/databases/(default)/documents";

/* ── the ledger: every reading kept, the failures listed, a floor on how many there were ── */
type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(lock: string, where: string, ok: boolean, detail: string) { this.rows.push({ lock, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${this.name}${MUT ? `.mut-${MUT}` : ""}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 30)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    console.log(`  ${this.name}: ${this.rows.length} readings, ${this.rows.filter((r) => !r.ok).length} red`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.lock} · ${r.where} — ${r.detail}`)).toEqual([]);
  }
}

/* ── the emulator, read and cleaned from node (the emulator's port; never a live project) ── */
type FsDoc = { name: string; fields?: Record<string, unknown> };
async function fsList(col: string): Promise<FsDoc[]> {
  const out: FsDoc[] = [];
  let token = "";
  do {
    const r = await fetch(`${FS}/users/${UID}/${col}?pageSize=300${token ? `&pageToken=${token}` : ""}`, { headers: { Authorization: "Bearer owner" } });
    const j = (await r.json()) as { documents?: FsDoc[]; nextPageToken?: string };
    out.push(...(j.documents ?? []));
    token = j.nextPageToken ?? "";
  } while (token);
  return out;
}
async function fsPut(path: string, d: FsDoc): Promise<void> {
  await fetch(`${FS}/users/${UID}/${path}`, { method: "PATCH", headers: { Authorization: "Bearer owner", "Content-Type": "application/json" }, body: JSON.stringify({ fields: d.fields ?? {} }) });
}
async function fsDelete(path: string): Promise<void> {
  await fetch(`${FS}/users/${UID}/${path}`, { method: "DELETE", headers: { Authorization: "Bearer owner" } });
}
const fval = (d: FsDoc | undefined, k: string): unknown => {
  const v = (d?.fields ?? {})[k] as Record<string, unknown> | undefined;
  if (!v) return undefined;
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("arrayValue" in v) return ((v.arrayValue as { values?: Record<string, unknown>[] }).values ?? []).map((x) => Object.values(x)[0]);
  if ("timestampValue" in v) return v.timestampValue;
  return v;
};
const idOf = (d: FsDoc) => d.name.split("/").pop()!;

/* ── opening a phone page ── */
export async function openPhone3(page: Page, path: string, vp: { width: number; height: number }) {
  await openRoute(page, "/dashboard", { width: 1440, height: 900 });
  await page.setViewportSize(vp);
  await go(page, path);
}
async function go(page: Page, path: string) {
  await page.goto(path);
  await page.locator('[data-pa3="header"]').first().waitFor({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1400);
  await mutate(page);
}
const tap = async (page: Page, sel: string) => { await page.locator(sel).filter({ visible: true }).first().click({ timeout: 15_000 }); await page.waitForTimeout(700); };

/** the mutations: each is the smallest change that should turn exactly its own lock red */
async function mutate(page: Page) {
  if (!MUT) return;
  const css: Record<string, string> = {
    float: ".pa3-tabs{bottom:14px!important;left:14px!important;right:14px!important;border-radius:33px!important}",
    widen: "[data-pa^='pk'], .pa-pg .pa-group { min-width: 640px !important; }",
    /* the log journey's own controls only (the add form's picker and slider are not the lock's subject) */
    chips: "[data-pa3='sample-picker'] .ssp { display: none !important; }",
    slider: "[data-pa3='rt'] input[type=range] { display: none !important; }",
    shared: "body { letter-spacing: 0.4px !important; }",
  };
  if (css[MUT]) await page.addStyleTag({ content: css[MUT] });
  await page.evaluate((m) => {
    const vis = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].filter((e) => e.offsetParent || e.closest(".pa3-layer"));
    if (m === "band") for (const h of vis('[data-pa3="header"]')) { const d = document.createElement("div"); d.style.cssText = "height:90px;flex:none;width:10px"; h.appendChild(d); }
    if (m === "tiles") for (const p of vis(".pa3-page")) { const d = document.createElement("div"); d.style.cssText = "height:320px"; d.textContent = "tiles"; p.prepend(d); }
    if (m === "badge") for (const b of vis('[data-pa3="badge"]')) b.textContent = String(Number(b.textContent) + 5);
    if (m === "courtband") for (const l of vis('[data-pa3="qline"]')) { const word = l.textContent?.split(" · ")[0] ?? ""; l.textContent = `${word} · ${l.textContent}`; }
    if (m === "late") { const d = document.createElement("p"); d.textContent = "3 days late"; vis(".pa3-page")[0]?.appendChild(d); }
  }, MUT);
}

const rectOf = (page: Page, sel: string) => page.evaluate((s) => {
  const e = [...document.querySelectorAll<HTMLElement>(s)].find((x) => x.offsetParent && x.getBoundingClientRect().height > 0);
  if (!e) return null;
  const r = e.getBoundingClientRect();
  return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, height: r.height };
}, sel);

const OTHER_MODE = !!process.env.PA3_PROBE || !!process.env.PA3_DESKTOP || !!process.env.PA3_PAIRS;

/* ═══════════════════════════════ PA3-1 · 2 · 3 · 6 · 10 — the shell, content first, the bar, overflow, words ══════ */
test.describe("PA3 phone shell", () => {
  test.skip(OTHER_MODE || !!process.env.PA3_ONLY && process.env.PA3_ONLY !== "shell", "another mode");
  test("PA3-1 header · PA3-2 content first · PA3-3 bar · PA3-6 overflow · PA3-10 words", async ({ page }, info) => {
    test.skip(!isPhoneProject(info.project.name), "phone projects only");
    test.setTimeout(900_000);
    const L = new Ledger(`shell-${info.project.name}`);
    const ROOTS = ["/dashboard", "/queries", "/agents", "/you"];
    const PUSHED = ["/queries/analytics", "/queries/responses", "/queries/packages", "/goals", "/manuscripts", "/account", "/help", "/import", "/todo/corkboard", "/agents/discover"];
    const WORDS = /\bOverdue\b|\blate\b|Coming in Part|\b(?:hawk|we|I)\s*(?:will|['’]ll)\s+(?:watch|keep an eye)/i;
    const sweepWords = async (where: string) => {
      const t = await page.evaluate(() => {
        const roots = [...document.querySelectorAll<HTMLElement>(".pa3-layer, [data-pa3='header'], [data-pa3='tabbar'], #app-stage-scroll")]
          .filter((e) => e.offsetParent || getComputedStyle(e).position === "fixed" || e.id === "app-stage-scroll");
        return roots.map((e) => e.innerText).join("\n");
      });
      const m = t.match(WORDS);
      L.check("PA3-10", where, t.length > 200 && !m, m ? `found “${m[0]}”` : `${t.length} chars swept`);
    };
    const overflow = async (where: string) => {
      const r = await page.evaluate(() => {
        const vw = innerWidth;
        /* excused only inside a horizontal scroller (a chip row, a carousel): it scrolls, it does not run off */
        const inScroller = (e: Element) => { for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) { const ox = getComputedStyle(p).overflowX; if (ox === "auto" || ox === "scroll" || ox === "hidden") return true; } return false; };
        const all = [...document.querySelectorAll<HTMLElement>("body *")].filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && (e.offsetParent || getComputedStyle(e).position === "fixed"); });
        const bad = all.filter((e) => e.getBoundingClientRect().right > vw + 1 && !inScroller(e)).map((e) => `${e.tagName}.${String(e.className).slice(0, 40)} right=${Math.round(e.getBoundingClientRect().right)}`);
        const stage = document.getElementById("app-stage-scroll");
        const sw = Math.max(document.documentElement.scrollWidth, stage ? stage.getBoundingClientRect().left + stage.scrollWidth : 0);
        return { n: all.length, bad: bad.slice(0, 5), sw: Math.round(sw), vw };
      });
      L.check("PA3-6", where, r.n > 50 && !r.bad.length && r.sw <= r.vw + 1, r.bad.length ? r.bad.join(" | ") : `${r.n} elements, widest ${r.sw}/${r.vw}`);
    };
    /* PA3_FAST=1 (the mutation proofs): 390 only, the four tabs and Packages, no sheets */
    const FAST = !!process.env.PA3_FAST;
    for (const vp of FAST ? [PA3_PHONES[0]] : [...PA3_PHONES, { width: 414, height: 896 }]) {
      const w = tag(vp);
      await openPhone3(page, "/dashboard", vp);
      for (const p of ROOTS) {
        await go(page, p);
        const where = `${p} @${w}`;
        if (vp.width !== 414) {
          const h0 = await rectOf(page, '[data-pa3="header"]');
          const chrome = await page.evaluate(() => ({
            chip: document.querySelectorAll('[data-pa="book-chip"]').length, disc: document.querySelectorAll(".pa-avring").length,
            fb: document.querySelectorAll("[data-pa3='header'] [aria-label*='eedback']").length,
            band: document.querySelectorAll('[data-pa="band"]').length, tiles: document.querySelectorAll(".pa-btiles, .pa-bstats").length,
          }));
          L.check("PA3-1", `rest ${where}`, !!h0 && h0.height <= 76, `header ${h0?.height.toFixed(1)}px at rest`);
          L.check("PA3-1", `chrome ${where}`, !chrome.chip && !chrome.disc && !chrome.fb && !chrome.band && !chrome.tiles, JSON.stringify(chrome));
          /* a page shorter than the screen cannot scroll (You, at rest): a temporary spacer at its foot lets the header's own
             behaviour be read; it is removed straight after, and the report says so */
          await page.evaluate(() => {
            const s = document.getElementById("app-stage-scroll");
            if (s && s.scrollHeight - s.clientHeight < 120) { const pg = [...document.querySelectorAll<HTMLElement>(".pa3-page")].find((e) => e.offsetParent); const d = document.createElement("div"); d.id = "pa3-spacer"; d.style.height = "800px"; pg?.appendChild(d); }
            if (s) s.scrollTop = 100;
          });
          await page.waitForTimeout(600);
          const h1 = await rectOf(page, '[data-pa3="header"]');
          const scrolled = await page.evaluate(() => document.getElementById("app-stage-scroll")?.scrollTop ?? 0);
          L.check("PA3-1", `scrolled ${where}`, !!h1 && h1.height <= 56 && scrolled >= 50, `header ${h1?.height.toFixed(1)}px after ${scrolled}px`);
          await page.evaluate(() => { document.getElementById("pa3-spacer")?.remove(); const s = document.getElementById("app-stage-scroll"); if (s) s.scrollTop = 0; });
          await page.waitForTimeout(300);
          const bar = await page.evaluate(() => {
            const n = document.querySelector<HTMLElement>('[data-pa3="tabbar"]');
            if (!n) return null;
            const r = n.getBoundingClientRect();
            const labels = [...n.children].map((c) => (c.getAttribute("data-pa3") === "plus" ? "+" : (c.textContent ?? "").replace(/\d+/g, "").trim()));
            return { labels, bottom: r.bottom, left: r.left, right: r.right, vh: innerHeight, vw: innerWidth, bg: getComputedStyle(n).backgroundColor };
          });
          L.check("PA3-3", `order ${where}`, !!bar && bar.labels.join(",") === "Today,Queries,+,Agents,You", bar?.labels.join(",") ?? "no bar");
          L.check("PA3-3", `docked ${where}`, !!bar && Math.abs(bar.bottom - bar.vh) <= 1 && bar.left <= 0.5 && Math.abs(bar.right - bar.vw) <= 1 && bar.bg === "rgb(255, 255, 255)",
            bar ? `bottom ${bar.bottom}/${bar.vh} left ${bar.left} right ${bar.right}/${bar.vw} ${bar.bg}` : "no bar");
          if (vp.width === 390 && (p === "/queries" || p === "/dashboard")) {
            const first = await rectOf(page, p === "/queries" ? '[data-pa3="qrow"]' : '[data-pa3="task"]');
            const max = p === "/queries" ? 300 : 420;
            L.check("PA3-2", where, !!first && first.top < max, `first ${p === "/queries" ? "query row" : "task"} at ${first?.top.toFixed(0)}px (< ${max})`);
          }
        }
        await overflow(where);
        if (vp.width === 390) await sweepWords(where);
      }
      for (const p of FAST ? ["/queries/packages"] : PUSHED) { await go(page, p); await overflow(`${p} @${w}`); if (vp.width === 390) await sweepWords(`${p} @${w}`); }
      const STEPS: [string, string[]][] = [
        ["/queries", ['[data-pa3="qrow"]']],
        ["/agents", ['[data-pa3="arow"]']],
        ["/dashboard", ['[data-pa3="plus"]']],
        ["/dashboard", ['[data-pa3="plus"]', '[data-pa3="plus-log"]', '[data-pa3="agent-opt"]', '[data-pa3="fnext"]']],
        ["/dashboard", ['[data-pa3="plus"]', '[data-pa3="plus-log"]', '[data-pa3="agent-opt"]', '[data-pa3="fnext"]', '[data-pa3="fnext"]', '[data-pa3="fnext"]']],
        ["/dashboard", ['[data-pa3="plus"]', '[data-pa3="plus-reply"]', '[data-pa3="reply-opt"]', '[data-pa3="fnext"]']],
        ["/agents", ['[data-pa3="addagent"]']],
        ["/agents", ['[data-pa3="arow"]', '[data-pa3="editagent"]', '[data-pa3="fnext"]', '[data-pa3="fnext"]']],
        ["/dashboard", ['[data-pa3="search"]']],
      ];
      for (const [p, taps] of FAST ? [] : STEPS) {
        await go(page, p);
        for (const t of taps) await tap(page, t);
        await mutate(page);
        const where = `${p} → ${taps.map((t) => t.replace(/\[data-pa3="|"\]/g, "")).join(" › ")} @${w}`;
        await overflow(where);
        if (vp.width === 390) await sweepWords(where);
        await page.keyboard.press("Escape").catch(() => {});
      }
    }
    L.done(process.env.PA3_FAST ? 20 : 130);
  });
});

/* ═══════════════════════════════ PA3-4 one count · PA3-5 said once ═══════════════════════════════════════════════ */
test.describe("PA3 figures", () => {
  test.skip(OTHER_MODE || !!process.env.PA3_ONLY && process.env.PA3_ONLY !== "figures", "another mode");
  test("PA3-4 one count · PA3-5 said once", async ({ page }, info) => {
    test.skip(!isPhoneProject(info.project.name), "phone projects only");
    const L = new Ledger(`figures-${info.project.name}`);
    /* the To-do workspace's own count, read off the desktop To-do page (WsHeader54's "N to do") */
    await openRoute(page, "/todo", { width: 1512, height: 982 });
    await page.locator('[data-tws54="legend-sum"]').first().waitFor({ timeout: 30_000 });
    const desk = Number(((await page.locator('[data-tws54="legend-sum"]').first().textContent()) ?? "").match(/\d+/)?.[0] ?? NaN);
    for (const vp of PA3_PHONES) {
      await page.setViewportSize(vp);
      await go(page, "/dashboard");
      const t = await page.evaluate(() => {
        const root = [...document.querySelectorAll<HTMLElement>('[data-pa3="today"]')].find((e) => e.offsetParent)!;
        return {
          badge: Number(document.querySelector('[data-pa3="badge"]')?.textContent ?? 0),
          rows: root.querySelectorAll('[data-pa3="task"]').length,
          attr: Number(root.getAttribute("data-tasks")),
          you: Number(root.querySelector('[data-pa3="court"][data-k="you"]')?.getAttribute("data-count")),
          agent: Number(root.querySelector('[data-pa3="court"][data-k="agent"]')?.getAttribute("data-count")),
          quiet: Number(root.querySelector('[data-pa3="court"][data-k="quiet"]')?.getAttribute("data-count")),
        };
      });
      L.check("PA3-4", `badge = Today's rows @${tag(vp)}`, t.rows > 0 && t.badge === t.rows, `badge ${t.badge}, rows ${t.rows}`);
      L.check("PA3-4", `rows = the workspace's own count @${tag(vp)}`, t.rows === desk && t.attr === desk, `rows ${t.rows}, desktop To-do “${desk} to do”`);
      await go(page, "/queries");
      const q = await page.evaluate(() => {
        const root = [...document.querySelectorAll<HTMLElement>('[data-pa3="queries"]')].find((e) => e.offsetParent)!;
        const c = (k: string) => Number(root.querySelector(`[data-pa3="chip"][data-k="${k}"]`)?.getAttribute("data-count"));
        const lines = [...root.querySelectorAll<HTMLElement>('[data-pa3="qrow"]')].map((r) => ({ court: r.getAttribute("data-court")!, text: r.innerText, line: r.querySelector('[data-pa3="qline"]')?.textContent ?? "" }));
        return { you: c("you"), agent: c("agent"), quiet: c("quiet"), lines };
      });
      L.check("PA3-4", `Queries' With you = Today's @${tag(vp)}`, q.you > 0 && q.you === t.you && q.agent === t.agent && q.quiet === t.quiet,
        `queries ${q.you}/${q.agent}/${q.quiet}, today ${t.you}/${t.agent}/${t.quiet}`);
      const GROUP: Record<string, string> = { you: "With you", agent: "With the agent", quiet: "Gone quiet", closed: "Closed" };
      const bad: string[] = [];
      for (const r of q.lines) {
        const status = r.line.split(" · ")[0].trim();
        const count = (w: string) => (w ? r.text.toLowerCase().split(w.toLowerCase()).length - 1 : 0);
        if (count(status) > 1 || count(GROUP[r.court]) > 1) bad.push(r.text.replace(/\n/g, " / "));
      }
      L.check("PA3-5", `${q.lines.length} rows @${tag(vp)}`, q.lines.length > 20 && !bad.length, bad.slice(0, 2).join(" ‖ ") || `${q.lines.length} rows, each says it once`);
    }
    L.done(8);
  });
});

/* ═══════════════════════════════ PA3-7 sample · PA3-8 slider · PA3-9 agent — the writes, each undone ═══════════ */
test.describe("PA3 journeys", () => {
  test.skip(OTHER_MODE || !!process.env.PA3_ONLY && process.env.PA3_ONLY !== "journeys", "another mode");
  test("PA3-9 agent · PA3-7 sample · PA3-8 slider (the six journeys walked)", async ({ page }, info) => {
    test.skip(info.project.name !== "pixel", "the writes run once, in Chromium");
    test.setTimeout(600_000);
    page.setDefaultTimeout(20_000);
    const L = new Ledger("journeys");
    let agentId = "";
    let original: FsDoc | undefined;
    try {
      await openPhone3(page, "/agents", PA3_PHONES[0]);
      /* ── journey 5: who's next. The add form's agency rule (PA3-9) ── */
      await tap(page, '[data-pa3="addagent"]');
      await page.locator('[data-pa3="aname"]').fill("Pa3 Probe Name");
      await page.waitForTimeout(300);
      if (MUT === "agency") await page.locator('[data-pa3="fnext"]').evaluate((b) => { (b as HTMLButtonElement).disabled = false; });
      L.check("PA3-9", "Continue with a name and no agency", await page.locator('[data-pa3="fnext"]').isDisabled(), "must be disabled");
      await tap(page, '[data-pa3="no-agency"]');
      L.check("PA3-9", "Continue with “I don’t know the agency”", !(await page.locator('[data-pa3="fnext"]').isDisabled()), "enabled");
      await tap(page, '[data-pa3="fclose"], [data-pa3="fback"]');
      await page.keyboard.press("Escape").catch(() => {});
      /* the full record, through the same four steps, on an agent not yet queried (edit mode: the harness is on the Free
         plan, whose cap refuses a new agent — the add path's refusal is the app's own, and the report says so). The
         agent's document is captured first and written back after. */
      await go(page, "/agents");
      agentId = (await page.locator('[data-pa3="arow"][data-queried="0"]').filter({ visible: true }).first().getAttribute("data-id")) ?? "";
      original = (await fsList("agents")).find((d) => idOf(d) === agentId);
      L.check("PA3-9", "an agent not yet queried", !!agentId && !!original, agentId);
      await page.locator(`[data-pa3="arow"][data-id="${agentId}"]`).filter({ visible: true }).click();
      await page.waitForTimeout(500);
      await tap(page, '[data-pa3="editagent"]');
      await page.locator('[data-aap="country"] button').filter({ hasText: "US" }).first().click();
      await tap(page, '[data-pa3="fnext"]');
      await page.locator('[data-aap="wishlist"]').fill("Quiet, character-led historical fiction.");
      await tap(page, '[data-pa3="fnext"]');
      if (!(await page.locator('[data-door="open"].on, [data-door="open"][aria-pressed="true"]').count())) await page.locator('[data-door="open"]').first().click();
      const ql = page.locator('[data-pa3="want"][data-k="queryLetter"]');
      if ((await ql.getAttribute("aria-pressed")) !== "true") await ql.click();
      await page.locator('[data-pa3="want-picker"] button').filter({ hasText: "Pages" }).first().click();
      const amt = page.locator('[data-pa3="want-picker"] input').first();
      await amt.fill("50"); await amt.press("Enter");
      await page.locator('[data-pa3="art"] input[type=range]').fill("6");
      await page.locator('[data-nrn="no"]').first().click();
      await tap(page, '[data-pa3="fnext"]');
      await page.locator('[data-pa3="aemail"]').fill("fixture@example.com");
      await page.locator('[data-pa3="aweb"]').fill("example.com");
      await tap(page, '[data-pa3="fnext"]');
      await page.waitForTimeout(2000);
      const failed = await page.evaluate(() => document.querySelector('[data-pa3="afail"]')?.textContent ?? "");
      if (failed) L.check("PA3-9", "save failure", false, failed);
      const ag = (await fsList("agents")).find((d) => idOf(d) === agentId);
      const want: Record<string, unknown> = { country: "US", submissionStatus: "Open", email: "fixture@example.com", responseTimeWeeks: 6, noResponseMeansNo: false };
      for (const [k, v] of Object.entries(want)) L.check("PA3-9", `field ${k}`, fval(ag, k) === v, `${k}=${JSON.stringify(fval(ag, k))}`);
      L.check("PA3-9", "field website", /example\.com/.test(String(fval(ag, "website"))), String(fval(ag, "website")));
      L.check("PA3-9", "field mswlNotes", /character-led/.test(String(fval(ag, "mswlNotes"))), String(fval(ag, "mswlNotes")));
      L.check("PA3-9", "field materialsWanted", /50/.test(JSON.stringify(fval(ag, "materialsWanted"))), JSON.stringify(fval(ag, "materialsWanted")));
      L.check("PA3-9", "field agency kept", fval(ag, "agency") === fval(original, "agency"), String(fval(ag, "agency")));

      /* ── journey 3: I've just sent a query (PA3-7, PA3-8), from the agent sheet's own button ── */
      await page.keyboard.press("Escape").catch(() => {});
      await go(page, "/agents");
      await page.locator(`[data-pa3="arow"][data-id="${agentId}"]`).filter({ visible: true }).click();
      await page.waitForTimeout(600);
      await tap(page, '[data-pa3="log-to"]');
      const picker = page.locator('[data-pa3="sample-picker"] input').first();
      const amt0 = (await picker.count()) && (await picker.isVisible()) ? await picker.inputValue() : "";
      const pickerText = await page.locator('[data-pa3="sample-picker"]').innerText().catch(() => "");
      L.check("PA3-7", "opens on the agent's 50 pages", amt0 === "50" && /pages/i.test(pickerText), `amount ${amt0 || "(no picker)"}`);
      if (amt0) { await picker.fill("37"); await picker.press("Enter"); }
      await tap(page, '[data-pa3="from-else"]');
      await page.locator('[data-pa3="from-at"]').fill("12");
      await tap(page, '[data-pa3="fnext"]');
      await tap(page, '[data-pa3="fnext"]');
      const range = page.locator('[data-pa3="rt"] input[type=range]');
      const hasRange = (await range.count()) > 0 && (await range.isVisible());
      L.check("PA3-8", "the control is a range input", hasRange, hasRange ? "range" : "no range input");
      const lineBefore = await page.locator('[data-pa3="expected-line"]').innerText();
      if (hasRange) await range.fill("12");
      await page.waitForTimeout(300);
      const lineAfter = await page.locator('[data-pa3="expected-line"]').innerText();
      L.check("PA3-8", "the expected date follows it", lineBefore !== lineAfter, `${lineBefore.replace(/\n/g, " ")} → ${lineAfter.replace(/\n/g, " ")}`);
      await tap(page, '[data-pa3="fnext"]');
      await tap(page, '[data-pa3="fnext"]');
      await page.locator('[data-pa3="cele"]').waitFor({ timeout: 15_000 });
      await page.waitForTimeout(1500);
      const q = (await fsList("queries")).find((d) => fval(d, "agentId") === agentId);
      L.check("PA3-7", "stored", !!q, q ? idOf(q) : "no query stored");
      const mats = String(fval(q, "sentMaterials"));
      /* the log writer's own words for a section (`sampleName`): 37 pages from page 12 is "pages 12–48" */
      L.check("PA3-7", "37 pages, from page 12", /pages 12[–-]48/.test(mats), mats);
      const sent = Date.parse(String(fval(q, "dateSent")));
      const exp = Date.parse(String(fval(q, "writerExpectedDate")));
      const weeks = Math.round((exp - sent) / (7 * 86_400_000));
      L.check("PA3-8", "the stored reply window", weeks === 12, `${weeks} weeks (dateSent ${fval(q, "dateSent")}, writerExpectedDate ${fval(q, "writerExpectedDate")})`);
      await tap(page, '[data-pa3="cele-done"]');
      await page.locator('[data-pa3="undo"]').click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(2000);
      const left = (await fsList("queries")).filter((d) => fval(d, "agentId") === agentId);
      L.check("PA3-7", "Undo removed the query", left.length === 0, `${left.length} left`);

      /* ── journeys 4 and 2: where does this one stand; an agent replied — on a harness query, then undone ── */
      await go(page, "/queries");
      await tap(page, '[data-pa3="chip"][data-k="agent"]');
      const target = (await page.locator('[data-pa3="qrow"][data-court="agent"]').filter({ visible: true }).first().getAttribute("data-id")) ?? "";
      await page.locator(`[data-pa3="qrow"][data-id="${target}"]`).filter({ visible: true }).click();
      await page.waitForTimeout(600);
      L.check("PA3-7", "journey 4: the query sheet opens", (await page.locator('[data-pa3="qsheet"]').count()) === 1, target);
      const before = (await fsList("queries")).find((d) => idOf(d) === target);
      await tap(page, '[data-pa3="log-reply"]');
      await tap(page, '[data-pa3="outcome"][data-k="partial"]');
      await tap(page, '[data-pa3="fnext"]');
      await tap(page, '[data-pa3="fnext"]');
      await page.locator('[data-pa3="cele"]').waitFor({ timeout: 15_000 });
      await page.waitForTimeout(1500);
      const mid = (await fsList("queries")).find((d) => idOf(d) === target);
      L.check("PA3-7", "journey 2: the reply is recorded", fval(mid, "status") === "Partial Requested", String(fval(mid, "status")));
      await tap(page, '[data-pa3="cele-done"]');
      await page.locator('[data-pa3="undo"]').click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(2000);
      const after = (await fsList("queries")).find((d) => idOf(d) === target);
      L.check("PA3-7", "journey 2: Undo puts the status back", fval(after, "status") === fval(before, "status"), `${fval(before, "status")} → ${fval(after, "status")}`);

      /* journeys 1 and 6 */
      await go(page, "/dashboard");
      L.check("PA3-7", "journey 1: Today lists tasks", (await page.locator('[data-pa3="task"]').count()) > 0, "tasks");
      await go(page, "/you");
      L.check("PA3-7", "journey 6: You says how it's going", /request/.test(await page.locator('[data-pa3="going-figure"]').filter({ visible: true }).innerText()), "figure");
    } finally {
      /* the agent, written back exactly as it was (the whole document, by id, on the emulator) */
      if (agentId && original) await fsPut(`agents/${agentId}`, original);
    }
    const back = (await fsList("agents")).find((d) => idOf(d) === agentId);
    L.check("PA3-9", "the agent is put back as it was", !!back && JSON.stringify(back.fields) === JSON.stringify(original?.fields), agentId);
    L.done(20);
  });
});

/* ═══════════════════════════════ PA3-11 the desktop, unchanged ═══════════════════════════════════════════════════ */
test.describe("PA3-11 desktop", () => {
  test.skip(!process.env.PA3_DESKTOP, "set PA3_DESKTOP=base|new");
  test("capture, and compare against the base", async ({ page }, info) => {
    test.skip(info.project.name !== "measure", "the desktop project");
    const mode = process.env.PA3_DESKTOP!;
    const out = `${DIR}/desktop/${mode}`;
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
        const root = document.querySelector(".sa-shellframe") ?? document.body;
        /* the page's own clock (`data-at`, epoch ms at render) is the one value that moves between two captures */
        return root.outerHTML.replace(/\s(style|data-loading)="[^"]*"/g, "").replace(/\sdata-at="\d{12,14}"/g, ' data-at="T"');
      });
      writeFileSync(`${out}/${n}.html`, dom);
      await page.screenshot({ path: `${out}/${n}.png`, fullPage: false });
    }
    if (mode !== "new") { expect(true).toBe(true); return; }
    const L = new Ledger("desktop");
    for (const [n] of PAGES) {
      const a = `${DIR}/desktop/base/${n}`, b = `${DIR}/desktop/new/${n}`;
      if (!existsSync(`${a}.html`)) { L.check("PA3-11", n, false, "no base capture: run PA3_DESKTOP=base on the served branch first"); continue; }
      const norm = (x: string) => x.replace(/\sdata-at="\d{12,14}"/g, ' data-at="T"');
      const da = norm(readFileSync(`${a}.html`, "utf8")), db = norm(readFileSync(`${b}.html`, "utf8"));
      let first = -1;
      for (let i = 0; i < Math.max(da.length, db.length); i++) if (da[i] !== db[i]) { first = i; break; }
      L.check("PA3-11", `${n} DOM`, da === db, first < 0 ? `${da.length} chars, identical` : `differs at ${first}: …${da.slice(Math.max(0, first - 80), first + 80)}… ⇄ …${db.slice(Math.max(0, first - 80), first + 80)}…`);
      const px = await page.evaluate(async ([x, y]) => {
        const load = (s: string) => new Promise<HTMLImageElement>((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = s; });
        const [ia, ib] = await Promise.all([load(x), load(y)]);
        if (ia.width !== ib.width || ia.height !== ib.height) return { diff: -1, total: 0, box: "" };
        const c = (i: HTMLImageElement) => { const cv = document.createElement("canvas"); cv.width = i.width; cv.height = i.height; const g = cv.getContext("2d")!; g.drawImage(i, 0, 0); return g.getImageData(0, 0, i.width, i.height).data; };
        const pa = c(ia), pb = c(ib);
        let d = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
        for (let i = 0; i < pa.length; i += 4) if (pa[i] !== pb[i] || pa[i + 1] !== pb[i + 1] || pa[i + 2] !== pb[i + 2]) {
          d++; const k = i / 4, x = k % ia.width, y = Math.floor(k / ia.width);
          x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
        }
        return { diff: d, total: pa.length / 4, box: d ? `${x0},${y0}–${x1},${y1}` : "" };
      }, [`data:image/png;base64,${readFileSync(`${a}.png`).toString("base64")}`, `data:image/png;base64,${readFileSync(`${b}.png`).toString("base64")}`] as const);
      /* ⚠️ THE PIXELS ARE NOT STABLE RUN TO RUN ON THIS MACHINE, EVEN ON ONE BUILD: two captures of the served build
         differed by 656–4,891 pixels (sub-pixel rendering in the bar and cards) while their DOM was identical. So the
         DOM is held identical, and the pixels to the base's own measured noise floor (NOISE). */
      const NOISE = 5000;
      L.check("PA3-11", `${n} pixels`, px.diff >= 0 && px.diff <= NOISE, `${px.diff} of ${px.total} pixels differ${px.box ? ` (box ${px.box})` : ""}; the base against itself: up to 4,891`);
    }
    L.done(8);
  });
});

/* ═══════════════════════════════ the pairs: each ref screen beside the built one ═════════════════════════════════ */
test.describe("PA3 pairs", () => {
  test.skip(!process.env.PA3_PAIRS, "set PA3_PAIRS=1");
  test("ref beside built", async ({ page }, info) => {
    test.skip(info.project.name !== "pixel", "Chromium");
    const out = `${DIR}/pairs`;
    mkdirSync(out, { recursive: true });
    const REF = `file://${resolve("design-refs/phone-app-v3/phone-app-v3.html")}`;
    const SHOTS: { name: string; ref: string; built: [string, string[]] }[] = [
      { name: "01-today", ref: "journey(1)", built: ["/dashboard", []] },
      { name: "02-plus", ref: "journey(1);ACT.plus()", built: ["/dashboard", ['[data-pa3="plus"]']] },
      { name: "03-replied-who", ref: "journey(2)", built: ["/dashboard", ['[data-pa3="plus"]', '[data-pa3="plus-reply"]']] },
      { name: "04-log-who", ref: "journey(3)", built: ["/dashboard", ['[data-pa3="plus"]', '[data-pa3="plus-log"]']] },
      { name: "05-log-sent", ref: "ACT.logto({id:'a15'})", built: ["/agents", ['[data-pa3="logto"]']] },
      { name: "06-queries", ref: "journey(4)", built: ["/queries", []] },
      { name: "07-query-sheet", ref: "journey(4);ACT.query({id:'q2'})", built: ["/queries", ['[data-pa3="qrow"]']] },
      { name: "08-birds-eye", ref: "journey(4);ACT.qview()", built: ["/queries", ['[data-pa3="qview"]']] },
      { name: "09-agents", ref: "journey(5)", built: ["/agents", []] },
      { name: "10-agent-sheet", ref: "journey(5);ACT.agent({id:'a15'})", built: ["/agents", ['[data-pa3="arow"]']] },
      { name: "11-add-agent", ref: "journey(5);ACT.addagent()", built: ["/agents", ['[data-pa3="addagent"]']] },
      { name: "12-you", ref: "journey(6)", built: ["/you", []] },
      { name: "13-you-materials", ref: "journey(6);ACT.yseg({k:'materials'})", built: ["/you", ['[data-pa3="yseg"][data-k="materials"]']] },
      { name: "14-settings", ref: "journey(6);ACT.page({p:'account'})", built: ["/account", []] },
      { name: "15-search", ref: "journey(1);ACT.search()", built: ["/dashboard", ['[data-pa3="search"]']] },
      { name: "16-packages", ref: "journey(6);ACT.page({p:'materials'})", built: ["/queries/packages", []] },
    ];
    await page.setViewportSize(PA3_PHONES[0]);
    for (const s of SHOTS) {
      await page.goto(REF);
      await page.waitForTimeout(400);
      await page.evaluate((js) => { (0, eval)(js); }, s.ref);
      await page.waitForTimeout(700);
      await page.screenshot({ path: `${out}/${s.name}-ref.png` });
    }
    await openPhone3(page, "/dashboard", PA3_PHONES[0]);
    for (const s of SHOTS) {
      await go(page, s.built[0]);
      for (const t of s.built[1]) await tap(page, t);
      await page.screenshot({ path: `${out}/${s.name}-built.png` });
      await page.keyboard.press("Escape").catch(() => {});
    }
    expect(SHOTS.length).toBe(16);
  });
});

/* ═══════════════════════════════ a look, on request ═════════════════════════════════════════════════════════════ */
test.describe("PA3 probe", () => {
  test.skip(!process.env.PA3_PROBE, "a look, on request");
  test("shots", async ({ page }) => {
    const dir = process.env.PA3_SHOTS ?? `${DIR}/probe`;
    mkdirSync(dir, { recursive: true });
    const paths = (process.env.PA3_PATHS ?? "/dashboard").split(",");
    let first = true;
    for (const spec of paths) {
      const [p, ...taps] = spec.split("|");
      if (first) { await openPhone3(page, p, PA3_PHONES[0]); first = false; } else await go(page, p);
      for (const t of taps) await tap(page, t);
      const name = spec.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 60) || "root";
      await page.screenshot({ path: `${dir}/${name}.png`, fullPage: false });
    }
    expect(true).toBe(true);
  });
});
