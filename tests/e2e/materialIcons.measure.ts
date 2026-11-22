/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Material icons v1 — the RENDERED check, one surface per phase (reports/material-icons-v1/REPORT.md).
 *
 * Two runs, one spec, captured in the SAME session:
 *   MI_PHASE=base  — against the unmodified dev line (origin/main @ 347dfa639 built in a scratch worktree): writes
 *                    every row's height to reports/material-icons-v1/base.json.
 *   MI_PHASE=new   — against this branch: every row's height equals the base row's, and each row that names a
 *                    material draws `svg.mat-ico` with a non-zero box, immediately before its words.
 *
 * ⚠️ HEIGHTS ARE `offsetHeight`, not rects: the query and agent cards lean, and a rotated box's rect is skewed.
 * ⚠️ THE POPULATION IS PROVED NON-ZERO before anything is asserted over it.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { openRoute } from "./measure";

const PHASE = process.env.MI_PHASE === "base" ? "base" : "new";
const DIR = "reports/material-icons-v1";
const BASE = `${DIR}/base.json`;
const VP = { width: 1512, height: 982 };
mkdirSync(DIR, { recursive: true });
test.setTimeout(300_000);

type Row = { key: string; text: string; h: number; icon: { w: number; h: number; before: boolean; kind: string } | null };
type Surface = { name: string; rows: Row[] };

const H = JSON.parse(readFileSync("tests/emulator-seed/harness.json", "utf8")) as { docs: Record<string, Record<string, unknown>> };
const docId = (p: string, d: Record<string, unknown>) => String(d.id ?? p.split("/").pop());
const QUERY = "seed-query-10";
const AGENT = (() => {
  const q = Object.entries(H.docs).find(([p, d]) => /\/queries\/[^/]+$/.test(p) && docId(p, d) === QUERY)?.[1];
  return String(q?.agentId ?? "");
})();

/** read rows under `scope` (the first VISIBLE match); each row's label is its text with the right-hand note removed */
const readRows = (page: Page, scope: string, row: string, label?: string) => page.evaluate(({ scope, row, label }) => {
  const root = [...document.querySelectorAll<HTMLElement>(scope)].find((e) => e.offsetHeight > 0);
  if (!root) return [];
  return [...root.querySelectorAll<HTMLElement>(row)].filter((r) => r.offsetHeight > 0).map((r, i) => {
    const lab = label ? r.querySelector<HTMLElement>(label) ?? r : r;
    const svg = lab.querySelector<SVGSVGElement>("svg.mat-ico");
    let before = false;
    if (svg) {
      /* the icon is immediately before its words: the next sibling node carries the label's text */
      let n: Node | null = svg.nextSibling;
      while (n && n.nodeType === 3 && !(n.textContent ?? "").trim()) n = n.nextSibling;
      const sb = svg.getBoundingClientRect();
      before = !!n && !!(n.textContent ?? "").trim() && (() => {
        const rg = document.createRange(); rg.selectNodeContents(n!); const tb = rg.getBoundingClientRect();
        return sb.right <= tb.left + 0.5;
      })();
    }
    const text = (lab.textContent ?? "").replace(/\s+/g, " ").trim();
    return { key: `${i}:${text}`, text, h: r.offsetHeight,
      icon: svg ? { w: svg.getBoundingClientRect().width, h: svg.getBoundingClientRect().height, before, kind: svg.dataset.matIcon ?? "" } : null };
  });
}, { scope, row, label });

/** which rows MUST carry an icon on this branch (the words are a material that has a drawing) */
const MATERIAL = /^(Covering letter|Query letter|Letter v3|Synopsis|Opening sample|Sample|First \d|15 pages|\d[\d,]* (pages|words|chapters))/i;

function judge(s: Surface) {
  const base = existsSync(BASE) ? (JSON.parse(readFileSync(BASE, "utf8")) as Surface[]) : [];
  if (PHASE === "base") {
    writeFileSync(BASE, JSON.stringify([...base.filter((b) => b.name !== s.name), s], null, 1));
    expect(s.rows.length, `${s.name}: no rows on the base line`).toBeGreaterThan(0);
    return;
  }
  writeFileSync(`${DIR}/new-${s.name}.json`, JSON.stringify(s, null, 1));
  const b = base.find((x) => x.name === s.name);
  expect(b, `${s.name}: no base reading from this run`).toBeTruthy();
  expect(s.rows.length, `${s.name}: no rows`).toBeGreaterThan(0);
  const mats = s.rows.filter((r) => MATERIAL.test(r.text));
  expect(mats.length, `${s.name}: no material rows to check`).toBeGreaterThan(0);
  const bad: string[] = [];
  for (const r of mats) {
    if (!r.icon) bad.push(`${r.text}: no icon`);
    else if (!(r.icon.w >= 14 && r.icon.h >= 14)) bad.push(`${r.text}: icon box ${r.icon.w}×${r.icon.h}`);
    else if (!r.icon.before) bad.push(`${r.text}: icon not before its words`);
  }
  expect(s.rows.map((r) => r.h), `${s.name}: row heights vs the unmodified dev line`).toEqual(b!.rows.map((r) => r.h));
  console.log(`[${s.name}] ${s.rows.length} rows, ${mats.length} material rows, heights ${s.rows.map((r) => r.h).join("/")}`);
  expect(bad).toEqual([]);
}

test("Phase 2 · the query card's Agent tab, What X asks for", async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.setItem("sa.guide.queries", "1"); localStorage.setItem("sa.guide.queries-explainer", "1"); } catch { /* private */ } });
  await openRoute(page, "/queries", VP);
  const PAGE = ".qc151.qc153";
  await page.waitForSelector(`${PAGE} [data-qc153="bar"]`, { timeout: 60_000 });
  const b = page.locator(`${PAGE} [data-qc153="bar"] button[data-v="list"]`);
  if ((await b.getAttribute("aria-pressed")) !== "true" && await b.isEnabled()) await b.click();
  const more = page.locator(`${PAGE} [data-qc153='show-all']`);
  for (let i = 0; i < 6 && (await more.count()) > 0; i++) await more.first().click({ timeout: 5_000 });
  const c = page.locator(`${PAGE} [data-qc154='card'][data-id='${QUERY}']`);
  await c.scrollIntoViewIfNeeded();
  await c.locator("[data-qc154='name']").first().click();
  const CARD = "[data-qp='panel'] [data-qc152='card']";
  await page.locator(`${CARD}[data-id='${QUERY}']`).first().waitFor({ timeout: 15_000 });
  await page.locator(`${CARD} [data-qc152='tab'][data-tab='agent']`).first().click();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);
  judge({ name: "qc-agent-asks", rows: await readRows(page, CARD, "[data-qc158='ask']") });
});

test("Phase 3 · the agent card, What X asks for", async ({ page }) => {
  expect(AGENT, "the harness query names no agent").not.toBe("");
  await openRoute(page, "/agents", VP);
  const row = page.locator(`.aglist [data-cl26='row'][data-id='${AGENT}']`).first();
  await row.scrollIntoViewIfNeeded();
  await row.locator("[data-cl26='name']").click();
  const AC = "[data-cl262='panel'] [data-acv2='card']";
  await page.locator(AC).first().waitFor({ timeout: 15_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(900);
  judge({ name: "agent-card-asks", rows: await readRows(page, AC, "[data-acv2='ask']") });
});

test("Phase 4 · a package, Sent with it", async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.setItem("scriptally_active_manuscript_id", "cv25-ms"); } catch { /* private */ } });
  await openRoute(page, "/queries/packages?pkg=cv25-pkg-coast", VP);
  await expect(page.locator("[data-pk62='page']").locator("visible=true").first()).toBeVisible({ timeout: 30_000 });
  await page.locator(".k62-encl").locator("visible=true").first().waitFor({ timeout: 15_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
  judge({ name: "package-sent-with", rows: await readRows(page, "[data-pk62='page']", ".k62-encl li") });
});

test("Phase 5 · the landing card's attachments", async ({ page }) => {
  await page.setViewportSize(VP);
  await page.goto("/");
  await page.locator(".mk-lc-att span").first().waitFor({ state: "attached", timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  /* the card animates in; read its final layout */
  await page.waitForTimeout(1500);
  const rows = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".mk-lc-att span")].map((r, i) => {
    const svg = r.querySelector<SVGSVGElement>("svg.mat-ico");
    /* an answered chip (.mk-ok) keeps its tick in place of the icon, as the app's "ok" tone does: not a material row here */
    const text = `${r.classList.contains("mk-ok") ? "answered: " : ""}${(r.textContent ?? "").trim()}`;
    let before = false;
    if (svg) { const n = svg.nextSibling; before = !!n && n.nodeType === 3 && !!(n.textContent ?? "").trim(); }
    /* the card may be mid-animation or scaled: size from the layout box, not the rect */
    return { key: `${i}:${text}`, text, h: r.offsetHeight, icon: svg ? { w: svg.width.baseVal.value, h: svg.height.baseVal.value, before, kind: svg.dataset.matIcon ?? "" } : null };
  }));
  judge({ name: "landing-att", rows });
});
