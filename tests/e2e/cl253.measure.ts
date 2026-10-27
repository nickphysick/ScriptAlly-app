/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v25.3 (design-refs/contact-list-v25-3/) — CL253 E1–E5 on the rendered page at 1512 × 900 and 1280 × 800
 * with the shell. L1 is the existing suites, run beside this one.
 *
 * ⚠️ EVERY LOCK PROVES ITS POPULATION IS NON-ZERO FIRST. The harness account's `clv181-bare` has no genres, no wishlist,
 *    no reply time and no email, so the blank and gap branches are always present (no fixture is written).
 * ⚠️ E2's n is held to Housekeeping's OWN rendering — the drawer's By agent view, its gap chips per agent — never to a
 *    count taken from the row. E5's shown + n is held to Firestore (cl253Data.mjs, read-only).
 * ⚠️ RED FIRST: `CL253_BASE=1` against v25.2 (the base build); `CL253_MUTATE=<lock>` applies the lock's break in the page,
 *    or, for E2 and E3, against a build carrying it (see the report).
 */
import { test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { Ledger, MUT, SIZES, mutate, mutateJs, openCl24 } from "./cl253Lib";

const T = { timeout: 8000 };
function doneAll(...xs: [Ledger, number][]) {
  let err: unknown = null;
  for (const [L, floor] of xs) { try { L.done(floor); } catch (e) { err ??= e; } }
  if (err) throw err;
}
type Data = { agents: Record<string, { stars: number | null; genres: number; mswl: string; email: string; weeks: number | null }> };
const data = (): Data => JSON.parse(execFileSync("node", ["tests/e2e/cl253Data.mjs"], { encoding: "utf8" }));
const BANNED = ["+ Add", "No genres yet", "No wishlist yet", "Not rated"];

async function toList(page: Page) {
  await page.evaluate(() => {
    const t = document.querySelector("[data-cl25='title']");
    const sc = [...document.querySelectorAll<HTMLElement>(".agl-wpg .wpg-scroll")].find((e) => e.offsetWidth);
    if (t && sc) sc.scrollBy(0, t.getBoundingClientRect().top - sc.getBoundingClientRect().top - 10);
  });
  await page.waitForTimeout(300);
}
/** a row's words as a reader sees them (innerText skips what is not displayed) */
const rowText = (page: Page, id: string) => page.evaluate((i) => document.querySelector<HTMLElement>(`[data-cl24='row'][data-id='${i}']`)?.innerText ?? "", id);
/** show a row's hover state through keyboard focus (the group is shown on :focus-within as on :hover) */
const focusRow = (page: Page, id: string) => page.evaluate((i) => {
  const r = document.querySelector<HTMLElement>(`[data-cl24='row'][data-id='${i}']`);
  r?.scrollIntoView({ block: "center" }); r?.focus({ preventScroll: true });
}, id);

/* ═════════ E1 · blank ═════════ */
test("CL253-E1 · empty cells are blank, at rest and on hover; no wishlist, no line", async ({ page }) => {
  test.setTimeout(300_000);
  const E1 = new Ledger("E1");
  for (const vp of SIZES) {
    const at = `${vp.width}`;
    await openCl24(page, vp);
    await mutateJs(page, "E1", () => { for (const r of document.querySelectorAll<HTMLElement>("[data-cl24='row']")) if (!r.querySelector("[data-cl252='wishlist']")) { const s = document.createElement("span"); s.textContent = "No wishlist yet"; r.appendChild(s); } });
    await toList(page);
    const R = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-cl24='table'] [data-cl24='row']")].filter((r) => r.offsetHeight).map((r) => ({
      id: r.dataset.id ?? "", text: r.innerText, wl: !!r.querySelector("[data-cl252='wishlist']"), h: r.getBoundingClientRect().height,
      dash: !!r.querySelector(".cl252-dash, [data-cl252='pills-none']"),
    })));
    const noWl = R.filter((r) => !r.wl), wl = R.filter((r) => r.wl);
    E1.check(`${at} population`, R.length >= 8 && noWl.length > 0 && wl.length > 0 && R.some((r) => r.id === "clv181-bare"), `${R.length} rows, ${wl.length} with a wishlist`);
    const bad = R.filter((r) => BANNED.some((b) => r.text.includes(b)) || /(^|\n)\s*—\s*($|\n)/.test(r.text) || r.dash);
    E1.check(`${at} at rest`, bad.length === 0, bad.length ? `${bad[0].id}: ${bad[0].text.replace(/\s+/g, " ").slice(0, 120)}` : "none");
    if (wl.length && noWl.length) E1.check(`${at} no wishlist, shorter row`, Math.max(...noWl.map((r) => r.h)) < Math.min(...wl.map((r) => r.h)), `${Math.max(...noWl.map((r) => r.h)).toFixed(1)} < ${Math.min(...wl.map((r) => r.h)).toFixed(1)}`);
    /* on hover: the bare agent and a few others */
    for (const id of ["clv181-bare", ...noWl.slice(0, 4).map((r) => r.id)]) {
      await page.locator(`[data-cl24='row'][data-id='${id}']`).first().hover().catch(() => {});
      await page.waitForTimeout(150);
      const t = await rowText(page, id);
      E1.check(`${at} hover ${id}`, !BANNED.some((b) => t.includes(b)), t.replace(/\s+/g, " ").slice(0, 120));
    }
    await page.mouse.move(3, 3);
  }
  E1.done(10);
});

/* ═════════ E2 · E3 · E4 — RETIRED by Contact list v25.4 D ═════════
   E2 (one "Fill in {n} gaps" action per row, n = Housekeeping's count), E3 (it opens the edit mode at the first gap)
   and E4 (the hover group never lies over Your query) all measured v25.3's hover button, which v25.4 removes from the
   row with the copy / website icons. Their laws moved rather than lapsed: CL254-F4 asserts the row has no hover
   action but "Log a query"; F6 holds the card's "{n} details missing" and the Missing details filter to Housekeeping's
   count; F3 holds the sparse-profile link's door to the edit mode at the first gap. Recover the cases from
   `contact-list-v25-3` if the button ever returns. */

/* ═════════ E5 · whole pills ═════════ */
test("CL253-E5 · every pill is whole inside its cell; shown + n = genres", async ({ page }) => {
  test.setTimeout(300_000);
  const E5 = new Ledger("E5");
  /* the fixture: one agent with seven long genres, which no cell can hold — written now, removed in the same run */
  execFileSync("node", ["tests/e2e/seedCl253Genres.mjs"], { encoding: "utf8" });
  try {
  const D = data();
  for (const vp of SIZES) {
    const at = `${vp.width}`;
    await openCl24(page, vp);
    /* E5's break is carried in a build (the pills rendered without \`fit\`): a stylesheet cannot switch the measuring off */
    await toList(page);
    await page.waitForTimeout(400);
    const R = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-cl24='table'] [data-cl24='row']")].filter((r) => r.offsetHeight).map((r) => {
      const cell = r.querySelector<HTMLElement>("[data-cl24='genres']")!;
      const cr = cell.getBoundingClientRect();
      const pills = [...cell.querySelectorAll<HTMLElement>("[data-cl252='pill']")].map((p) => p.getBoundingClientRect().right);
      const more = cell.querySelector<HTMLElement>("[data-cl252='pill-more']");
      return { id: r.dataset.id ?? "", right: cr.right, pills, moreR: more ? more.getBoundingClientRect().right : null, more: Number(more?.dataset.n ?? 0) };
    }));
    const fx = R.find((r) => r.id === "cl253fx-ag");
    E5.check(`${at} population`, R.filter((r) => r.pills.length).length >= 8 && !!fx && (D.agents["cl253fx-ag"]?.genres ?? 0) === 7, `${R.filter((r) => r.pills.length).length} rows with pills; fixture ${fx ? `${fx.pills.length} shown + ${fx.more}` : "missing"}`);
    const cut = R.filter((r) => r.pills.some((x) => x > r.right + 0.5) || (r.moreR != null && r.moreR > r.right + 0.5));
    E5.check(`${at} whole pills`, cut.length === 0, cut.length ? `${cut.length} rows — ${cut[0].id}: ${cut[0].pills.map((x) => x.toFixed(0)).join(",")} past ${cut[0].right.toFixed(0)}` : "inside");
    const sum = R.filter((r) => D.agents[r.id] && r.pills.length + r.more !== D.agents[r.id].genres);
    E5.check(`${at} shown + n = genres`, sum.length === 0, sum.length ? `${sum[0].id}: ${sum[0].pills.length}+${sum[0].more} vs ${D.agents[sum[0].id].genres}` : "all");
  }
  } finally {
    execFileSync("node", ["tests/e2e/seedCl253Genres.mjs", "--clean"], { encoding: "utf8" });
  }
  E5.done(6);
});
void MUT;
