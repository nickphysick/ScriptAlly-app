/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Log a query — materials fork v1 (design-refs/log-query-materials-fork-v1/): step 3 opens on two tiles, A package and
 * Materials, then the package list or the pieces in three groups. Read off the rendered page over the v1.3 fixture
 * (tests/e2e/seedLaq13.mjs: Murphy's Day Out, two packages, Letter A/B, two synopses, three versions; Marcus asks for a
 * letter, a synopsis and 10 pages; Joanna's card says nothing), written in `beforeAll` and removed in `afterAll`:
 *   MF-1  THE FORK: two real buttons, the nil hint "…so tell us what went.", "2 saved packages", "Choose what went",
 *         "Tap one to carry on"; side by side on the 540 panel (1440), stacked on the 504 panel (1280); each ≥ 44 tall.
 *   MF-2  EACH TILE OPENS ITS SCREEN, AND BACK IS THE FORK: the packages ("Which package went to Joanna?", both rows, "Tap a
 *         package to carry on"), the pieces ("Which pieces went to Joanna?", three groups each "Pick one"); Back from
 *         either lands on the fork, still on step 3.
 *   MF-3  CARRY ON ONLY WITH SOMETHING PICKED (today's rule: any one piece): the tip until a piece is picked, then Carry
 *         on, with the footer's height unchanged; picks are radios (aria-pressed, filled ring), one per group, and a
 *         second tap clears one; picks survive Back to the fork and a trip to the packages.
 *   MF-4  ONLY THE SCREEN CARRIED ON FROM IS SAVED, AND COMING BACK LANDS ON IT: pick pieces, switch, tap a package →
 *         How; the stepper's Materials → the packages with that package pressed; "Choose the pieces myself instead" →
 *         the picks still there; Carry on → How; Back → the pieces.
 *   MF-5  THE SAVED RECORD: Marcus logged with "First round", then with Letter B + Two-page synopsis + V3, each read
 *         back from the emulator and undone in the same run (the celebration's Undo).
 */
import { expect, test, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { ensureSignedIn } from "./measure";

const OUT = "reports/log-query-materials-fork-v1";
const READ: Record<string, unknown> = {};
let checks = 0;
const ok = (cond: boolean, label: string) => { checks++; expect.soft(cond, label).toBe(true); };
const R = (page: Page) => page.locator('[data-qls="root"]');
const text = async (page: Page, sel: string) => ((await page.locator(sel).first().textContent({ timeout: 5_000 }).catch(() => null)) ?? "").replace(/\s+/g, " ").trim();
const saved = (agentId: string) => JSON.parse(execSync(`node tests/e2e/seedLaq13.mjs --materials ${agentId}`).toString().trim().split("\n").pop()!);
const MS = "laq13-ms";

test.describe.configure({ mode: "serial" });
test.beforeAll(() => { execSync("node tests/e2e/seedLaq13.mjs --clean && node tests/e2e/seedLaq13.mjs", { stdio: "ignore" }); });
test.afterAll(() => {
  execSync("node tests/e2e/seedLaq13.mjs --clean", { stdio: "ignore" });
  mkdirSync(OUT, { recursive: true });
  writeFileSync(`${OUT}/readings.json`, JSON.stringify({ checks, ...READ }, null, 2));
});

async function open(page: Page, width = 1440) {
  await page.addInitScript((id) => { try { localStorage.setItem("scriptally_active_manuscript_id", id); } catch { /* none */ } }, MS);
  await page.setViewportSize({ width, height: 900 });
  await page.goto("/dashboard");
  await ensureSignedIn(page);
  await page.goto("/dashboard");
  const d = page.getByRole("button", { name: /^\+?\s*Log a query$/ }).locator("visible=true").first();
  await d.waitFor({ state: "visible", timeout: 60_000 });
  await d.click();
  await R(page).waitFor({ state: "visible", timeout: 30_000 });
}
async function toMaterials(page: Page, agentId: string) {
  const row = page.locator(`[data-qls="agent"][data-id="${agentId}"]`);
  await row.waitFor({ state: "visible", timeout: 60_000 });
  await row.click();
  await page.locator('[data-qls="when-opt"][data-k="today"]').click();
  await expect(R(page)).toHaveAttribute("data-step", "what");
}
const tile = (page: Page, k: "pkg" | "pcs") => page.locator(`[data-qls="fork-tile"][data-k="${k}"]`);
const opt = (page: Page, k: string, id: string) => page.locator(`[data-qls="pc-opt"][data-k="${k}"][data-id="${id}"]`);
const footH = (page: Page) => page.locator('[data-qls="foot"]').evaluate((el) => el.getBoundingClientRect().height);
const shot = async (page: Page, name: string) => {
  mkdirSync(`${OUT}/shots`, { recursive: true });
  await page.waitForTimeout(400);
  await R(page).locator("xpath=ancestor::*[contains(concat(' ',normalize-space(@class),' '),' spanel ')][1]").screenshot({ path: `${OUT}/shots/${name}.png` });
};

test("MF-1 — the fork: two tiles, the hint, the counts; side by side at 540, stacked at 504", async ({ page }) => {
  test.setTimeout(240_000);
  for (const width of [1440, 1280]) {
    await open(page, width);
    await toMaterials(page, "laq13-jl");
    const t = await page.locator('[data-qls="fork-tile"]').evaluateAll((els) => els.map((el) => {
      const r = el.getBoundingClientRect();
      return { tag: el.tagName, k: el.getAttribute("data-k"), top: Math.round(r.top), left: Math.round(r.left), w: Math.round(r.width), h: Math.round(r.height), foot: el.querySelector("[data-qls=\"fork-foot\"] > span")?.textContent?.trim() };
    }));
    const panelW = await R(page).locator("xpath=ancestor::*[contains(concat(' ',normalize-space(@class),' '),' spanel ')][1]").evaluate((el) => Math.round(el.getBoundingClientRect().width));
    READ[`fork@${width}`] = { panelW, tiles: t };
    ok(t.length === 2 && t.every((x) => x.tag === "BUTTON" && x.h >= 44), `MF-1 two button tiles at ${width}`);
    ok(t[0]?.foot === "2 saved packages" && t[1]?.foot === "Choose what went", `MF-1 foot lines at ${width}: ${t.map((x) => x.foot).join(" | ")}`);
    if (width === 1440) ok(panelW === 540 && t[0].top === t[1].top && t[0].w === t[1].w, `MF-1 side by side at 540 (${JSON.stringify(t)})`);
    else ok(panelW === 504 && t[1].top > t[0].top && t[0].left === t[1].left, `MF-1 stacked at 504 (${JSON.stringify(t)})`);
    ok((await text(page, '[data-qls="asks"]')) === "Nothing on Joanna's card about what they ask for, so tell us what went.", "MF-1 nil hint");
    ok((await text(page, '[data-qls="foot"] [data-qls="hint"], [data-qls="foot"] .laq-hint')) === "Tap one to carry on", "MF-1 tip");
    ok((await text(page, ".laq-qh")) === "What did you send Joanna?", "MF-1 heading");
    await shot(page, `01-fork-${width}`);
  }
});

test("MF-2/3/4 — the screens, Back to the fork, Carry on, picks kept, the branch carried on from", async ({ page }) => {
  test.setTimeout(300_000);
  await open(page);
  await toMaterials(page, "laq13-jl");
  /* MF-2 the packages */
  await tile(page, "pkg").click();
  ok((await text(page, ".laq-qh")) === "Which package went to Joanna?", "MF-2 packages heading");
  ok((await page.locator('[data-qls="package"]').count()) === 2, "MF-2 both packages");
  ok((await text(page, '[data-qls="foot"] .laq-hint')) === "Tap a package to carry on", "MF-2 packages tip");
  await shot(page, "02-packages");
  await page.locator('[data-qls="foot"] [data-qls="back"]').click();
  ok((await page.locator('[data-qls="fork"]').count()) === 1 && (await R(page).getAttribute("data-step")) === "what", "MF-2 Back from packages → the fork");
  /* the pieces */
  await tile(page, "pcs").click();
  ok((await text(page, ".laq-qh")) === "Which pieces went to Joanna?", "MF-2 pieces heading");
  const groups = await page.locator('[data-qls="pc-group"]').evaluateAll((els) => els.map((el) => ({ k: el.getAttribute("data-k"), title: el.querySelector(".laq-gh b")?.textContent, state: el.querySelector('[data-qls="pc-state"]')?.textContent })));
  READ.groups = groups;
  ok(JSON.stringify(groups.map((g) => g.title)) === JSON.stringify(["Query letter", "Synopsis", "Which version is your opening from?"]), "MF-2 three groups in order");
  ok(groups.every((g) => g.state === "Pick one"), "MF-2 each says Pick one");
  ok(!(await R(page).locator(".laq-on").getByText(/^Opening/i).count()) && !groups.some((g) => /^Opening/i.test(g.title ?? "")), "MF-2 no group or choice is labelled Opening");
  /* MF-3 the tip, then Carry on, the footer unmoved */
  ok((await page.locator('[data-qls="pieces-continue"]').count()) === 0 && (await text(page, '[data-qls="foot"] .laq-hint')) === "Pick at least one to carry on", "MF-3 tip until something is picked");
  await shot(page, "03-pieces-empty");
  const h0 = await footH(page);
  await opt(page, "letter", "laq13-lb").click();
  const h1 = await footH(page);
  READ.footer = { h0, h1 };
  ok((await page.locator('[data-qls="pieces-continue"]').count()) === 1 && Math.abs(h0 - h1) < 0.5, `MF-3 Carry on appears, footer ${h0} → ${h1}`);
  ok((await opt(page, "letter", "laq13-lb").getAttribute("aria-pressed")) === "true", "MF-3 aria-pressed");
  const ring = await opt(page, "letter", "laq13-lb").locator(".laq-rdo").evaluate((el) => getComputedStyle(el).backgroundColor);
  ok(ring !== "rgb(255, 255, 255)", `MF-3 the ring fills (${ring})`);
  ok((await text(page, '[data-qls="pc-group"][data-k="letter"] [data-qls="pc-state"]')) === "Chosen", "MF-3 Chosen");
  await shot(page, "04-pieces-partial");
  await opt(page, "letter", "laq13-la").click();
  ok((await page.locator('[data-qls="pc-opt"][data-k="letter"][aria-pressed="true"]').count()) === 1, "MF-3 one per group");
  await opt(page, "letter", "laq13-la").click();
  ok((await page.locator('[data-qls="pc-opt"][data-k="letter"][aria-pressed="true"]').count()) === 0 && (await page.locator('[data-qls="pieces-continue"]').count()) === 0, "MF-3 a second tap clears it, and Carry on goes");
  await opt(page, "letter", "laq13-lb").click();
  await opt(page, "syn", "laq13-s2").click();
  await opt(page, "ver", "laq13-v3").click();
  ok((await text(page, '[data-qls="sample-line"] p')).startsWith("Sending the first 3 chapters of Prologue cut, flashback first"), `MF-3 the sample line (${await text(page, '[data-qls="sample-line"] p')})`);
  await shot(page, "05-pieces-complete");
  /* picks survive Back and a trip to the packages */
  await page.locator('[data-qls="foot"] [data-qls="back"]').click();
  ok((await page.locator('[data-qls="fork"]').count()) === 1, "MF-2 Back from pieces → the fork");
  await tile(page, "pcs").click();
  const kept = async () => page.locator('[data-qls="pc-opt"][aria-pressed="true"]').evaluateAll((els) => els.map((el) => el.getAttribute("data-id")).join(","));
  ok((await kept()) === "laq13-lb,laq13-s2,laq13-v3", `MF-3 picks kept over Back (${await kept()})`);
  /* MF-4 switch, tap a package: the package is the answer */
  await page.locator('[data-qls="back-packages"]').click();
  await page.locator('[data-qls="package"][data-id="laq13-pa"]').click();
  await expect(R(page)).toHaveAttribute("data-step", "how");
  ok((await text(page, '[data-qls="step"][data-k="what"] [data-qls="step-value"]')) === "First round", "MF-4 the stepper names the package");
  await page.locator('[data-qls="step"][data-k="what"]').click();
  ok((await page.locator('[data-qls="packages"]').count()) === 1 && (await page.locator('[data-qls="package"][data-id="laq13-pa"]').getAttribute("aria-pressed")) === "true", "MF-4 back on the packages, First round pressed");
  await page.locator('[data-qls="choose-pieces"]').click();
  ok((await kept()) === "laq13-lb,laq13-s2,laq13-v3", "MF-4 the picks are still there");
  await page.locator('[data-qls="pieces-continue"]').click();
  await expect(R(page)).toHaveAttribute("data-step", "how");
  ok((await text(page, '[data-qls="step"][data-k="what"] [data-qls="step-value"]')) === "3 pieces", "MF-4 the stepper says 3 pieces");
  await page.locator('[data-qls="foot"] [data-qls="back"]').click();
  ok((await page.locator('[data-qls="pieces"]').count()) === 1 && (await kept()) === "laq13-lb,laq13-s2,laq13-v3", "MF-4 Back from How → the pieces, picks showing");
  /* keyboard: the tiles are reachable by Tab */
  await page.locator('[data-qls="foot"] [data-qls="back"]').click();
  await tile(page, "pcs").focus();
  await page.keyboard.press("Shift+Tab");
  ok(await tile(page, "pkg").evaluate((el) => el === document.activeElement && el.matches(":focus-visible") && getComputedStyle(el).outlineStyle !== "none"), "MF-1 Tab reaches a tile, with a ring");
});

test("MF-5 — the saved record from each screen", async ({ page }) => {
  test.setTimeout(400_000);
  const through = async () => {
    if ((await R(page).getAttribute("data-step")) === "how") await page.locator('[data-qls="how-opt"]').first().click();
    await expect(R(page)).toHaveAttribute("data-step", "nudge");
    await page.locator('[data-qls="nudge-continue"]').click();
    await expect(R(page)).toHaveAttribute("data-step", "check");
    await page.locator('[data-qls="log"]').click();
    await page.locator('[data-qls="yay"]').waitFor({ state: "visible", timeout: 120_000 });
    await page.waitForTimeout(1500);
  };
  const undo = async () => {
    await page.locator('[data-qls="undo"]').click();
    await expect(R(page)).toHaveAttribute("data-step", "check", { timeout: 60_000 });
    await page.waitForTimeout(1500);
  };
  await open(page);
  await toMaterials(page, "laq13-mr");
  await tile(page, "pkg").click();
  await page.locator('[data-qls="package"][data-id="laq13-pa"]').click();
  await through();
  const pk = saved("laq13-mr");
  READ.savedPackage = pk;
  ok(pk.length === 1 && pk[0].sentHow === "package" && pk[0].sentPackageId === "laq13-pa" && pk[0].packageId === "laq13-pa", `MF-5 package saved (${JSON.stringify(pk)})`);
  ok(JSON.stringify(pk[0]?.sentVersions) === JSON.stringify(["laq13-la", "laq13-s1"]), "MF-5 package versions");
  await undo();
  ok(saved("laq13-mr").length === 0, "MF-5 package query undone");

  await page.locator('[data-qls="step"][data-k="what"]').click();
  await page.locator('[data-qls="choose-pieces"]').click();
  await opt(page, "letter", "laq13-lb").click();
  if ((await opt(page, "syn", "laq13-s2").getAttribute("aria-pressed")) !== "true") await opt(page, "syn", "laq13-s2").click();
  if ((await opt(page, "ver", "laq13-v3").getAttribute("aria-pressed")) !== "true") await opt(page, "ver", "laq13-v3").click();
  await page.locator('[data-qls="pieces-continue"]').click();
  /* every later stage is answered already: Carry on lands on the check */
  await expect(R(page)).toHaveAttribute("data-step", "check");
  await page.locator('[data-qls="log"]').click();
  await page.locator('[data-qls="yay"]').waitFor({ state: "visible", timeout: 120_000 });
  await page.waitForTimeout(1500);
  const pc = saved("laq13-mr");
  READ.savedPieces = pc;
  ok(pc.length === 1 && pc[0].sentHow === "individual" && pc[0].packageId === "", `MF-5 pieces saved (${JSON.stringify(pc)})`);
  ok(JSON.stringify(pc[0]?.sentVersions) === JSON.stringify(["laq13-lb", "laq13-s2"]), "MF-5 pieces versions");
  await undo();
  ok(saved("laq13-mr").length === 0, "MF-5 pieces query undone");
});
