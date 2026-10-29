/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v39.3 — the locks on the rendered page (Steps + preview). FIXTURE: seedPk40.mjs (pk40-ms in use),
 * re-seeded before each case that writes, so "Draft one" starts empty; cleaned in afterAll by manuscript.
 *
 *   L10 Steps: on an empty package the version step is open; picking a version opens the letter step; picking a letter
 *       closes every step and shows two green discs; each pick writes once (one Write to that package, and the writer's
 *       one toast)
 *   L11 Preview: the body quotes the chosen letter's STORED TEXT, never its summary; the pages attachment names the
 *       chosen version; toggling an extra adds and removes its attachment; "To" is a real agent not queried for this book
 *       (the first by surname), or "An agent"
 *   L12 Linking: hovering each step outlines exactly its part of the preview (a 2px Harbour ring on #eef4f7), and nothing
 *       else
 *   L13 Primary: disabled with the missing-pieces copy until a version and a letter are both in, then "Log a query with
 *       it", which opens the log journey with the package chosen. A sent package (Nick, 29 Oct): the note and Make a copy;
 *       its steps cannot be opened or changed, no pick writes, and the primary is never disabled
 *   L14 Retired: no Your materials card, no draggable rows, no packing-list slot markup
 *
 * Breaks: `PK393_MUTATE=<name>` applies that break in the page.
 */
import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

const DIR = "reports/submission-packages-v39-3";
const MUT = process.env.PK393_MUTATE ?? "";
const SIZE = { width: 1512, height: 982 };
const seed = (...args: string[]) => execFileSync("node", ["tests/e2e/seedPk40.mjs", ...args], { stdio: "pipe" }).toString();
/* the fixture's letter A (seedPk40.mjs): its stored text and its summary differ on purpose */
const LETTER_A_TEXT_START = "Murphy has twelve hours to get his father";
const LETTER_A_SUMMARY = "Names The Trees, Small Pleasures";
const RING = "rgb(29, 75, 99) 0px 0px 0px 2px";

type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail: string) { this.rows.push({ lock: this.name, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${MUT ? `mut-${MUT}-` : ""}${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 30)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.where} — ${r.detail}`)).toEqual([]);
  }
}

const MUTATIONS: Record<string, { css?: string; js?: string }> = {
  /* L10: a pick no longer moves on to the next step (every step stays shut after a pick) */
  L10: { css: `.p93-step.p93-open .p93-sb { display: none !important; } .p93-step.p93-open { box-shadow: 0 0 0 1px rgba(28,19,15,.09) !important; }` },
  /* L11: the body quotes the summary instead of the text */
  L11: { js: `new MutationObserver(() => { const o = document.querySelector('[data-pk393="opening"]'); if (o && o.textContent !== ${JSON.stringify(LETTER_A_SUMMARY)}) o.textContent = ${JSON.stringify(LETTER_A_SUMMARY)}; }).observe(document, { subtree: true, childList: true, characterData: true });` },
  /* L12: the whole mail card lights up for every step */
  L12: { css: `[data-pk393="preview"]:not([data-hov=""]) [data-pk393-part] { background: #eef4f7 !important; box-shadow: 0 0 0 2px #1d4b63 !important; }` },
  /* L13: the primary is never disabled */
  L13: { js: `new MutationObserver(() => { const b = document.querySelector('[data-pk393="primary"]'); if (b && b.disabled) b.disabled = false; }).observe(document, { subtree: true, childList: true, attributes: true });` },
  /* L13s: a sent package's step heads open again (they become buttons) */
  L13s: { js: `document.addEventListener('click', (e) => { const h = e.target.closest && e.target.closest('.p93-ro .p93-sh'); if (h) h.closest('.p93-step').classList.add('p93-open'); }, true);` },
  /* L14: a draggable row comes back */
  L14: { js: `new MutationObserver(() => { const pg = document.querySelector('[data-pk26="page"]'); const c = pg && pg.querySelector('.p93-step'); if (c && !pg.querySelector('[draggable="true"]')) c.setAttribute('draggable', 'true'); }).observe(document, { subtree: true, childList: true });` },
};

async function open(page: Page, pkg: string) {
  await page.addInitScript(() => { try { localStorage.setItem("scriptally_active_manuscript_id", "pk40-ms"); localStorage.setItem("sa.guide.packages-explainer", "1"); } catch { /* */ } });
  const m = MUTATIONS[MUT];
  if (m?.js) await page.addInitScript(m.js);
  if (m?.css) await page.addInitScript((css) => document.addEventListener("DOMContentLoaded", () => { const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st); }), m.css);
  await openRoute(page, "/queries/packages", SIZE);
  await page.locator('[data-pk39="labels"]').first().waitFor({ state: "visible", timeout: 30_000 });
  await page.locator(`[data-pk26="page"] [data-pk39="labels"] [data-pkid="${pkg}"]`).first().click();
  await page.waitForTimeout(900);
  /* bring the builder into view: hover and clicks then land on the steps */
  await page.evaluate(() => { const sc = [...document.querySelectorAll(".wpg-scroll")].find((x) => x.querySelector('[data-pk26="page"]')) as HTMLElement; const k = sc?.querySelector('[data-pk39="kicker"]'); if (sc && k) sc.scrollTop += k.getBoundingClientRect().top - sc.getBoundingClientRect().top - 12; });
  await page.waitForTimeout(400);
}
const pg = `[data-pk26="page"]`;
/** Count the Firestore Write requests that name a package document. */
function writesTo(page: Page, id: string) {
  const seen: string[] = [];
  page.on("request", (r) => { if (r.method() === "POST" && /\/Write\//.test(r.url()) && (r.postData() ?? "").includes(id)) seen.push(r.url()); });
  return seen;
}
const state = (page: Page) => page.evaluate((p) => {
  const root = document.querySelector(p)!;
  return [...root.querySelectorAll("[data-pk393-step]")].map((s) => ({
    k: (s as HTMLElement).dataset.pk393Step, open: s.classList.contains("p93-open"), done: s.classList.contains("p93-done"),
    disc: getComputedStyle(s.querySelector(".p93-sn")!).backgroundColor,
  }));
}, pg);

test.describe.configure({ mode: "default" });
test.beforeAll(() => { console.log(seed()); });
test.afterAll(() => { console.log(seed("--clean")); });

/* ── L10 · the steps ── */
test("L10 the version step opens first; a version opens the letter step; a letter closes them all; each pick writes once", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("L10");
  seed();
  const writes = writesTo(page, "pk40-draft");
  await open(page, "pk40-draft");
  let s = await state(page);
  L.check("the four steps are on the page", s.length === 4, JSON.stringify(s));
  L.check("an empty package opens on the version step, and only that one", s.find((x) => x.k === "ver")?.open && s.filter((x) => x.open).length === 1, JSON.stringify(s));
  const toasts = async () => page.locator(".sa-toast, [role=status]").allInnerTexts().then((t) => t.join(" | "));
  await page.locator(`${pg} [data-pk393-step="ver"] [role=radio]`).first().click({ timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(1800);
  s = await state(page);
  const w1 = writes.length, t1 = await toasts();
  L.check("picking a version fills it and opens the letter step", s.find((x) => x.k === "ver")?.done && s.find((x) => x.k === "let")?.open && s.filter((x) => x.open).length === 1, JSON.stringify(s));
  L.check("…with ONE write to the package", w1 === 1, `${w1} writes`);
  L.check("…through the writer (its toast)", /added to Draft one/.test(t1), t1);
  await page.locator(`${pg} [data-pk393-step="let"] [role=radio]`).first().click({ timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(1800);
  s = await state(page);
  const w2 = writes.length - w1;
  L.check("picking a letter closes every step", s.every((x) => !x.open), JSON.stringify(s));
  L.check("…and shows two green discs (#3e7d5a)", s.filter((x) => x.done && x.disc === "rgb(62, 125, 90)").length === 2, JSON.stringify(s));
  L.check("…with ONE write to the package", w2 === 1, `${w2} writes`);
  L.done(7);
});

/* ── L11 · the preview ── */
test("L11 the body quotes the letter's text, the pages name the version, an extra comes and goes, To is a real not-queried agent", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("L11");
  seed();
  const roster = JSON.parse(seed("--agents")) as { agents: { id: string; name: string; agency: string }[]; queried: string[] };
  await open(page, "pk40-ready");
  const r = await page.evaluate((p) => {
    const root = document.querySelector(p)!;
    const q = (s: string) => (root.querySelector(s)?.textContent ?? "").replace(/\s+/g, " ").trim();
    return { opening: q('[data-pk393="opening"]'), body: q('[data-pk393-part="let"]'), pages: q('[data-pk393-part="ver"]'), to: q('[data-pk393="to"]'), exts: root.querySelectorAll('[data-pk393-part="ext"]').length };
  }, pg);
  L.check("the body quotes the letter's stored text", r.opening.startsWith(LETTER_A_TEXT_START), r.opening);
  L.check("…cut at about 200 characters, with an ellipsis", r.opening.endsWith("…") && r.opening.length <= 201, `${r.opening.length}`);
  L.check("…and never the summary", !r.body.includes(LETTER_A_SUMMARY), r.body);
  L.check("the pages attachment names the chosen version", /Opening pages/.test(r.pages) && /Fast-paced opening/.test(r.pages), r.pages);
  /* the extra: Author bio on, then off again */
  const chip = page.locator(`${pg} [data-pk393-step="ext"] [data-pk393="extra"] > button[aria-pressed]`).first();
  L.check("no extra attached to begin with", r.exts === 0, String(r.exts));
  await chip.click(); await page.waitForTimeout(1600);
  const on = await page.locator(`${pg} [data-pk393-part="ext"]`).allInnerTexts();
  L.check("ticking Author bio adds its attachment, 'if asked'", on.length === 1 && /Author bio/.test(on[0]) && /if asked/.test(on[0]), JSON.stringify(on));
  await chip.click(); await page.waitForTimeout(1600);
  L.check("…and unticking takes it away", (await page.locator(`${pg} [data-pk393-part="ext"]`).count()) === 0, "ext");
  /* To: a real agent with no query for this book, the first by surname — or "An agent" */
  const name = r.to.replace(/\s*\(example\)\s*$/, "");
  const sur = (a: { name: string; agency: string }) => { const w = (a.name.trim() || a.agency).trim().split(/\s+/); return (w[w.length - 1] ?? "").toLowerCase(); };
  const open3 = roster.agents.filter((a) => !roster.queried.includes(a.id) && (a.name.trim() || a.agency.trim()));
  const hit = open3.find((a) => (a.name.trim() || a.agency) === name);
  L.check("the roster was read (agents and queries)", roster.agents.length > 0, `${roster.agents.length} agents`);
  L.check("'To' is a real agent with no query for this book, marked (example)", (!!hit && /\(example\)$/.test(r.to)) || (open3.length === 0 && r.to === "An agent (example)"), r.to);
  L.check("…the first by surname", !!hit && open3.every((a) => sur(a) >= sur(hit)), `${name} vs ${open3.map(sur).sort()[0]}`);
  L.done(10);
});

/* ── L12 · linking ── */
test("L12 hovering each step outlines exactly its part of the preview", async ({ page }) => {
  test.setTimeout(180_000);
  const L = new Ledger("L12");
  seed();
  /* Standard: every part is present (version, letter, synopsis, an extra) */
  await open(page, "pk40-std");
  for (const k of ["ver", "let", "syn", "ext"] as const) {
    await page.locator(`${pg} [data-pk393-step="${k}"] .p93-sh`).first().hover();
    await page.waitForTimeout(250);
    const r = await page.evaluate((p) => [...document.querySelectorAll(`${p} [data-pk393-part]`)].map((e) => {
      const cs = getComputedStyle(e); return { part: (e as HTMLElement).dataset.pk393Part, sh: cs.boxShadow, bg: cs.backgroundColor };
    }), pg);
    const lit = r.filter((x) => x.sh.includes("rgb(29, 75, 99) 0px 0px 0px 2px"));
    L.check(`${k}: its parts are on the page`, r.some((x) => x.part === k), JSON.stringify(r.map((x) => x.part)));
    L.check(`${k}: exactly its part is outlined (2px Harbour on #eef4f7)`, lit.length > 0 && lit.every((x) => x.part === k && x.bg === "rgb(238, 244, 247)") && r.filter((x) => x.part === k).every((x) => x.sh.includes(RING)), JSON.stringify(lit));
  }
  await page.mouse.move(2, 2); await page.waitForTimeout(250);
  const none = await page.evaluate((p) => [...document.querySelectorAll(`${p} [data-pk393-part]`)].filter((e) => getComputedStyle(e).boxShadow.includes("rgb(29, 75, 99) 0px 0px 0px 2px")).length, pg);
  L.check("with no step hovered, nothing is outlined", none === 0, String(none));
  L.done(9);
});

/* ── L13 · the primary ── */
test("L13 disabled with the missing pieces until a version and a letter are in, then it opens the log journey with the package", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("L13");
  seed();
  await open(page, "pk40-draft");
  const btn = page.locator(`${pg} [data-pk393="primary"]`).first();
  const read = async () => ({ text: (await btn.innerText()).trim(), off: await btn.isDisabled() });
  let b = await read();
  L.check("empty: disabled, 'Add a version and a letter to send it'", b.off && b.text === "Add a version and a letter to send it", JSON.stringify(b));
  await page.locator(`${pg} [data-pk393-step="ver"] [role=radio]`).first().click(); await page.waitForTimeout(1800);
  b = await read();
  L.check("with a version: disabled, 'Add a letter to send it'", b.off && b.text === "Add a letter to send it", JSON.stringify(b));
  await page.locator(`${pg} [data-pk393-step="let"] [role=radio]`).first().click(); await page.waitForTimeout(1800);
  b = await read();
  L.check("with both: enabled, 'Log a query with it'", !b.off && b.text === "Log a query with it", JSON.stringify(b));
  await btn.click(); await page.waitForTimeout(1500);
  const d = await page.evaluate(() => { const r = [...document.querySelectorAll("[data-qad-drawer='log']")].find((e) => (e as HTMLElement).getBoundingClientRect().height > 0); return r ? (r.textContent ?? "") : null; });
  L.check("it opens the log-a-query journey", d != null, String(d?.slice(0, 80)));
  /* the journey opens on its agent step; the package is chosen at its next step: pick an agent, go on, read the chip */
  if (d != null) {
    await page.locator("[data-qad-drawer='log'] [data-qad-agent-input]").first().fill("a").catch(() => {});
    await page.waitForTimeout(400);
    await page.locator("[data-qad-drawer='log'] [data-qad-agent]").first().dispatchEvent("mousedown").catch(() => {});
    await page.waitForTimeout(600);
    for (let i = 0; i < 3; i++) {
      const has = await page.evaluate(() => [...document.querySelectorAll("[data-qad-drawer='log'] [aria-pressed='true'], [data-qad-drawer='log'] .on")].some((e) => (e.textContent ?? "").includes("Draft one")));
      if (has) break;
      await page.locator("[data-qad-drawer='log'] [data-qad-primary]").first().click({ timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(600);
    }
  }
  const chosen = await page.evaluate(() => [...document.querySelectorAll("[data-qad-drawer='log'] [aria-pressed='true'], [data-qad-drawer='log'] .on")].map((e) => (e.textContent ?? "").trim()).filter((t) => t.includes("Draft one")));
  L.check("…with this package chosen (its chip is the one pressed)", chosen.length > 0, JSON.stringify(chosen));
  if (d != null) { await page.locator("[data-qad-drawer='log'] .qad-dx").first().click().catch(() => {}); await page.waitForTimeout(400); await page.locator("[data-qad-drawer='log'] .disc").first().click({ timeout: 1500 }).catch(() => {}); }
  L.done(5);
});

test("L13 a sent package: the note and Make a copy; its steps cannot be opened or changed; nothing writes; the primary is enabled", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("L13-sent");
  seed();
  const writes = writesTo(page, "pk40-std");
  await open(page, "pk40-std");
  const note = (await page.locator(`${pg} [data-pk393="sent-note"]`).first().innerText().catch(() => "")).replace(/\s+/g, " ");
  L.check("the note says what is true (Nick's copy)", /^Out with \d+ agents?\. What went stays as it went\. To change anything, make a copy\./.test(note), note);
  L.check("…with Make a copy", (await page.locator(`${pg} [data-pk393="copy-link"]`).count()) === 1, "copy link");
  L.check("no step head is a button", (await page.locator(`${pg} [data-pk393-step] button.p93-sh`).count()) === 0, "buttons");
  for (const k of ["ver", "let", "syn"] as const) await page.locator(`${pg} [data-pk393-step="${k}"] .p93-sh`).first().click({ force: true }).catch(() => {});
  await page.waitForTimeout(500);
  const st = await state(page);
  L.check("clicking the heads opens nothing", st.every((x) => !x.open), JSON.stringify(st));
  L.check("no choice rows on the page", (await page.locator(`${pg} [role=radio]`).count()) === 0, "radios");
  L.check("the extras are read-only (no toggle, no + Add)", (await page.locator(`${pg} [data-pk393-step="ext"] button`).count()) === 0, "ext buttons");
  await page.waitForTimeout(800);
  L.check("nothing wrote to the package", writes.length === 0, `${writes.length} writes`);
  const b = page.locator(`${pg} [data-pk393="primary"]`).first();
  L.check("the primary is enabled: 'Log a query with it'", !(await b.isDisabled()) && (await b.innerText()).trim() === "Log a query with it", "primary");
  L.check("…with Make a copy beside it", (await page.locator(`${pg} [data-pk393="copy"]`).count()) === 1, "copy button");
  L.done(9);
});

/* ── L14 · retired ── */
test("L14 no Your materials card, no draggable rows, no packing-list slot markup", async ({ page }) => {
  test.setTimeout(180_000);
  const L = new Ledger("L14");
  seed();
  await open(page, "pk40-ready");
  const r = await page.evaluate((p) => {
    const root = document.querySelector(p)!;
    return { builder: !!root.querySelector('[data-pk393="builder"]'), lib: root.querySelectorAll('[data-pk26="lib"], .p9-pb-lib, [data-pk39="lib-head"]').length, drag: root.querySelectorAll('[draggable="true"]').length, slots: root.querySelectorAll("[data-slot], .p9-mf, .p9-slt, .p9-mr").length };
  }, pg);
  L.check("the new builder is on the page", r.builder, String(r.builder));
  L.check("no Your materials card", r.lib === 0, String(r.lib));
  L.check("no draggable rows", r.drag === 0, String(r.drag));
  L.check("no packing-list slot markup", r.slots === 0, String(r.slots));
  L.done(4);
});
