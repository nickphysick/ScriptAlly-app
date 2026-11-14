/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v43 — the PK43 locks on the rendered page, at 1440 × 900 and 1717 × 1000, with the e2e user on
 * the emulator. FIXTURE: seedPk40.mjs (pk40-ms: Standard and Standard 2 out with agents, Ready one, Draft one, the
 * retired Old one; Standard is the current batch) and pk41Fixture.mjs, restored in afterAll.
 *
 *   P2  the Query Centre, Contact list, To-do and Query letters headers and collapsed bars equal before.json
 *       (`PK43_BEFORE=write` records before.json from the build under test — run once, on the baseline build)
 *
 * Breaks: `PK43_MUTATE=<P1…P11>` applies that lock's break in the page.
 */
import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { OTHERS, SIZES, headerSnap, openPage, scrollPage, slimSnap, stable } from "./pk43Probe";

const DIR = "reports/submission-packages-v43";
const BEFORE = `${DIR}/before.json`;
const MUT = process.env.PK43_MUTATE ?? "";
const node = (file: string, ...args: string[]) => execFileSync("node", [`tests/e2e/${file}`, ...args], { stdio: "pipe" }).toString();

/* Each lock's break, applied in the page. */
const MUTATIONS: Record<string, { css?: string; js?: string }> = {
  /* P2: qcv156's navy shifted by one channel */
  P2: { css: `@media (min-width: 768px) { :is(.qc151.qc153, .cl27, .tws56-hdw) > .qc1531-hd.qc1531-hd { background-color: rgb(42, 58, 83) !important; } }` },
};
async function applyMutation(page: import("@playwright/test").Page) {
  const m = MUTATIONS[MUT];
  if (m?.js) await page.addInitScript(m.js);
  if (m?.css) await page.addInitScript((css) => document.addEventListener("DOMContentLoaded", () => { const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st); }), m.css);
}

test.describe.configure({ mode: "default" });
test.beforeAll(() => { node("seedPk40.mjs"); });
test.afterAll(() => { node("seedPk40.mjs", "--clean"); });

test("P2 the other four pages' headers and collapsed bars are unchanged", async ({ page }) => {
  test.setTimeout(400_000);
  await applyMutation(page);
  const now: Record<string, unknown> = {};
  for (const size of SIZES) {
    for (const p of OTHERS) {
      await openPage(page, p.route, p.root, size);
      await scrollPage(page, p.root, 0);
      const header = await headerSnap(page, p.root);
      const slimRest = await slimSnap(page, p.root);
      await scrollPage(page, p.root, 600);
      const slim600 = await slimSnap(page, p.root);
      now[`${p.name} @${size.width}`] = { header, slimRest, slim600 };
    }
  }
  mkdirSync(DIR, { recursive: true });
  if (process.env.PK43_BEFORE === "write") {
    writeFileSync(BEFORE, JSON.stringify(now, null, 1));
    console.log(`[P2] wrote ${BEFORE}`);
    return;
  }
  writeFileSync(`${DIR}/${MUT ? `mut-${MUT}-` : ""}after.json`, JSON.stringify(now, null, 1));
  expect(existsSync(BEFORE), "before.json is missing").toBe(true);
  const before = JSON.parse(readFileSync(BEFORE, "utf8")) as Record<string, unknown>;
  /* the population: four pages at two sizes, every header found */
  expect(Object.keys(before).length).toBe(8);
  for (const k of Object.keys(before)) expect((before[k] as { header: unknown }).header, `${k}: no header found before`).not.toBeNull();
  for (const k of Object.keys(before)) expect(stable(now[k]), k).toEqual(stable(before[k]));
});
