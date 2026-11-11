/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Log a query v1.2 — read off the rendered page, over the reference's own data (tests/e2e/seedLaq12.mjs, written in
 * `beforeAll` and removed in `afterAll`):
 *   V12-1  from the Dashboard's "Log a query", the staged journey opens over a dimmed page (the same scrim as the action
 *          drawers), with the navy header and one FlowHead line; a press on the page with no answers closes it, and
 *          with answers asks "Discard this?"
 *   V12-2  from a package's builder, that package is preselected on the Materials stage, and the ask card shows over it
 *   V12-3  from an agent's card, the agent is set and the journey starts on Sent
 *   V12-4  the ask card's states over the pieces (matches · differs · not ticked · "Use what … asks for"), and over the
 *          packages for an agent whose card says nothing (the quiet note)
 *   V12-5  the sample control: closed when the card states the ask, open as soon as Opening pages is ticked when it
 *          says nothing; a specific section ("Pages 40–64") is what the row, the check and the save say
 * Every log is undone in the same run, and a run writing fewer readings than it claims fails.
 */
import { expect, test, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { ensureSignedIn } from "./measure";

const OUT = "reports/log-a-query-v1-2";
const READ: Record<string, unknown> = {};
let checks = 0;
const ok = (cond: boolean, label: string) => { checks++; expect.soft(cond, label).toBe(true); };
const R = (page: Page) => page.locator('[data-qls="root"]');
const text = async (page: Page, sel: string) => ((await page.locator(sel).first().textContent({ timeout: 5_000 }).catch(() => null)) ?? "").replace(/\s+/g, " ").trim();
const MS = "laq12-ms";

test.describe.configure({ mode: "serial" });
test.beforeAll(() => { execSync("node tests/e2e/seedLaq12.mjs --clean && node tests/e2e/seedLaq12.mjs", { stdio: "ignore" }); });
test.afterAll(() => {
  execSync("node tests/e2e/seedLaq12.mjs --clean", { stdio: "ignore" });
  mkdirSync(OUT, { recursive: true });
  writeFileSync(`${OUT}/readings.json`, JSON.stringify({ checks, ...READ }, null, 2));
});

async function open(page: Page, path: string) {
  await page.addInitScript((id) => { try { localStorage.setItem("scriptally_active_manuscript_id", id); } catch { /* none */ } }, MS);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(path);
  await ensureSignedIn(page);
  await page.goto(path);
}
const agentRow = (page: Page, id: string) => page.locator(`[data-qls="agent"][data-id="${id}"]`);
async function toMaterials(page: Page, agentId: string) {
  await agentRow(page, agentId).waitFor({ state: "visible", timeout: 60_000 });
  await agentRow(page, agentId).click();
  await page.locator('[data-qls="when-opt"][data-k="today"]').click();
  await expect(R(page)).toHaveAttribute("data-step", "what");
}
const scrimOn = (page: Page) => page.evaluate(() => {
  const s = [...document.querySelectorAll<HTMLElement>("[data-side-scrim]")].find((x) => x.dataset.on === "true");
  const head = document.querySelector<HTMLElement>('[data-qls="root"] .flh');
  return {
    scrim: !!s, bg: s ? getComputedStyle(s).backgroundColor : null, bodyDim: document.body.classList.contains("spanel-dim"),
    head: head ? getComputedStyle(head).backgroundColor : null,
    track: (() => { const t = document.querySelector<HTMLElement>('[data-qls="root"] .laq-trk'); return t ? getComputedStyle(t).backgroundColor : null; })(),
  };
});
async function pressScrim(page: Page) {
  /* the left of the window, well clear of the panel */
  await page.mouse.click(120, 450);
}

test("V12-1 — the Dashboard's door: the staged journey over a dimmed page, the navy header, one line, the leave check", async ({ page }) => {
  test.setTimeout(300_000);
  await open(page, "/dashboard");
  const door = page.getByRole("button", { name: /^\+?\s*Log a query$/ }).locator("visible=true").first();
  await door.waitFor({ state: "visible", timeout: 60_000 });
  await door.click();
  await R(page).waitFor({ state: "visible", timeout: 30_000 });
  await page.waitForTimeout(400);
  const d = await scrimOn(page);
  const line = await text(page, '[data-flh="line"]');
  READ.V12_1 = { ...d, line, url: page.url(), step: await R(page).getAttribute("data-step") };
  ok(new URL(page.url()).pathname === "/dashboard", "V12-1: the journey opens on the Dashboard, without navigating");
  ok(d.scrim && d.bg === "rgba(28, 19, 15, 0.45)" && d.bodyDim, `V12-1: the page dims behind it (${d.bg})`);
  ok(d.head === "rgb(42, 58, 82)" && d.track === "rgb(42, 58, 82)", `V12-1: the header and the track are navy (${d.head} / ${d.track})`);
  ok(line === "Add as much detail as you can.", `V12-1: the FlowHead line "${line}"`);
  ok((await R(page).getAttribute("data-step")) === "who", "V12-1: it starts on Agent");
  /* no answers: a press on the dimmed page closes */
  await pressScrim(page);
  await expect(R(page)).toHaveCount(0, { timeout: 5_000 });
  ok(!(await scrimOn(page)).bodyDim, "V12-1: no answers — a press on the page closes it, and the dim lifts");
  /* with an answer: it asks first, Keep going keeps it, Discard closes */
  await door.click();
  await toMaterials(page, "laq12-jl");
  ok((await text(page, '[data-flh="line"]')) === "Add as much detail as you can.", "V12-1: the same line on Materials");
  await pressScrim(page);
  const ask = await text(page, '[data-qls="foot"]');
  ok(/Discard this\? Nothing has been saved yet\./.test(ask), `V12-1: with answers it asks ("${ask}")`);
  await page.locator('[data-qls="leave-keep"]').click();
  ok((await R(page).getAttribute("data-step")) === "what", "V12-1: Keep going keeps the journey where it was");
  await pressScrim(page);
  await page.locator('[data-qls="leave-discard"]').click();
  await expect(R(page)).toHaveCount(0, { timeout: 5_000 });
  ok(true, "V12-1: Discard closes");
});

test("V12-2 — a package's builder: that package is preselected, under the ask card", async ({ page }) => {
  test.setTimeout(300_000);
  await open(page, "/queries/packages?pkg=laq12-pb");
  const btn = page.locator('[data-pk393="primary"]').locator("visible=true").first();
  const found = await btn.waitFor({ state: "visible", timeout: 60_000 }).then(() => true, () => false);
  READ.V12_2 = { builder: found };
  ok(found, "V12-2: the package's builder offers its log door");
  if (!found) return;
  const pkgName = await text(page, '[data-pk393="name"], .p93-pv-h b, .p93-ttl');
  const before = new URL(page.url()).pathname;
  await btn.click();
  await R(page).waitFor({ state: "visible", timeout: 30_000 });
  ok(new URL(page.url()).pathname === before, `V12-2: it opens on the packages page, without navigating (${before})`);
  ok((await R(page).getAttribute("data-step")) === "who", "V12-2: no agent named, so it starts on Agent");
  ok((await scrimOn(page)).scrim, "V12-2: over a dimmed page");
  await toMaterials(page, "laq12-mr");
  const pressed = await page.locator('[data-qls="package"][aria-pressed="true"]').getAttribute("data-id").catch(() => null);
  const asks = await page.locator('[data-qls="asks"]').getAttribute("data-kind");
  Object.assign(READ.V12_2 as object, { pkgName, pressed, asks });
  ok(pressed === "laq12-pb", `V12-2: the package the door named is preselected (${pressed})`);
  ok(asks === "pkg", `V12-2: the ask card shows over the packages (${asks})`);
  await page.keyboard.press("Escape");
  await expect(R(page)).toHaveCount(0, { timeout: 5_000 });
});

test("V12-3 — an agent's card: the agent is set and the journey starts on Sent", async ({ page }) => {
  test.setTimeout(300_000);
  await open(page, "/agents?agent=laq12-mr");
  /* the card's own door: the next-step box's button (the page header has a "Log a query" too, which names no agent) */
  const btn = page.locator('[data-cl262="next"] button', { hasText: /^Log a query$/ }).locator("visible=true").first();
  const found = await btn.waitFor({ state: "visible", timeout: 60_000 }).then(() => true, () => false);
  READ.V12_3 = { door: found };
  ok(found, "V12-3: the agent's card offers Log a query");
  if (!found) return;
  await btn.click();
  await R(page).waitFor({ state: "visible", timeout: 30_000 });
  const who = await text(page, '[data-qls="step"][data-k="who"] [data-qls="step-value"]');
  const step = await R(page).getAttribute("data-step");
  Object.assign(READ.V12_3 as object, { who, step, dim: (await scrimOn(page)).scrim });
  ok(who === "Marcus", `V12-3: the agent is set (${who})`);
  ok(step === "when", `V12-3: it starts on Sent (${step})`);
  ok((await scrimOn(page)).scrim, "V12-3: over a dimmed page");
  await page.keyboard.press("Escape");
  await expect(R(page)).toHaveCount(0, { timeout: 5_000 });
});

test("V12-4 · V12-5 — the ask card's states, the sample control, and a specific section saved as that section", async ({ page }) => {
  test.setTimeout(600_000);
  await open(page, "/dashboard");
  const door = page.getByRole("button", { name: /^\+?\s*Log a query$/ }).locator("visible=true").first();
  await door.waitFor({ state: "visible", timeout: 60_000 });
  await door.click();
  await toMaterials(page, "laq12-mr");
  /* over the packages: dots, and a package that matches */
  const pk = { kind: await page.locator('[data-qls="asks"]').getAttribute("data-kind"), foot: await text(page, '[data-qls="ask-foot"]'), marks: await page.locator('[data-qls="ask"]').evaluateAll((els) => els.map((e) => `${e.getAttribute("data-k")}:${e.getAttribute("data-mark")}`)) };
  ok(pk.kind === "pkg" && pk.marks.every((m) => m.endsWith(":dot")) && pk.marks.length === 3, `V12-4: over the packages, three dots (${pk.marks})`);
  ok(/^Your .+ package matches it\.$/.test(pk.foot), `V12-4: a package matches ("${pk.foot}")`);
  ok((await page.locator('[data-qls="asks"]').locator('text=/card asks for/').count()) === 0 && (await page.locator('p[data-qls="asks"]').count()) === 0, "V12-4: the old italic line is gone");
  /* over the pieces: starts from the ask → matches */
  await page.locator('[data-qls="choose-pieces"]').click();
  const pcs = async () => ({
    kind: await page.locator('[data-qls="asks"]').getAttribute("data-kind"),
    foot: await page.locator('[data-qls="ask-foot"]').getAttribute("data-k"),
    marks: await page.locator('[data-qls="ask"]').evaluateAll((els) => els.map((e) => `${e.getAttribute("data-k")}:${e.getAttribute("data-mark")}`).join(" ")),
    why: (await page.locator('[data-qls="ask-why"]').allTextContents()).map((x) => x.trim()),
    extra: (await page.locator('[data-qls="ask-extra"]').allTextContents()).map((x) => x.trim()),
    btn: await page.locator('[data-qls="use-ask"]').count(),
  });
  const s0 = await pcs();
  ok(s0.foot === "ok" && s0.marks === "ql:ok syn:ok sample:ok" && s0.btn === 0, `V12-4: matches (${JSON.stringify(s0)})`);
  ok((await text(page, '[data-qls="ask-foot"]')) === "✓ That's what you're sending.", "V12-4: the match line");
  ok((await page.locator('[data-qls="sample-control"]').count()) === 0, "V12-5: the sample control is closed when the card states the ask");
  /* open the control from the row's pill and send 3 chapters: differs */
  await page.locator('[data-qls="vr"][data-k="sample"]').click();
  ok((await page.locator('[data-qls="sample-control"]').count()) === 1, "V12-5: the pill opens the control inline");
  await page.locator('[data-qls="sample-control"] .qad-srow button', { hasText: "Chapters" }).click();
  await page.locator('[data-qls="sample-control"] .qad-presets button', { hasText: /^3$/ }).click();
  const s1 = await pcs();
  READ.V12_4 = { s0, s1 };
  ok(s1.marks === "ql:ok syn:ok sample:diff" && s1.why[0] === "You're sending the first 3 chapters, not the first 10 pages." && s1.btn === 1, `V12-4: differs (${JSON.stringify(s1)})`);
  /* untick the synopsis: not ticked */
  await page.locator('[data-qls="piece"][data-k="syn"]').click();
  const s2 = await pcs();
  ok(s2.marks.includes("syn:no") && s2.why.includes("Synopsis isn't ticked."), `V12-4: not ticked (${JSON.stringify(s2)})`);
  /* Use what Marcus asks for: matches again */
  await page.locator('[data-qls="use-ask"]').click();
  const s3 = await pcs();
  Object.assign(READ.V12_4 as object, { s2, s3 });
  ok(s3.foot === "ok", `V12-4: "Use what … asks for" puts the ask back (${JSON.stringify(s3)})`);
  ok(!(await page.locator('[data-qls="pieces-continue"]').isDisabled()), "V12-4: it never stops Continue");
  await page.keyboard.press("Escape");
  await expect(R(page)).toHaveCount(0, { timeout: 5_000 });

  /* Joanna: nothing on her card */
  await door.click();
  await toMaterials(page, "laq12-jl");
  const nilPk = await page.locator('[data-qls="asks"]').getAttribute("data-kind");
  const nilText = await text(page, '[data-qls="asks"]');
  ok(nilPk === "nil" && nilText === "Nothing on Joanna's card about what they ask for, so tick what went.", `V12-4: nothing stated, over the packages ("${nilText}")`);
  await page.locator('[data-qls="choose-pieces"]').click();
  ok((await page.locator('[data-qls="asks"]').getAttribute("data-kind")) === "nil" && (await page.locator('[data-qls="use-ask"]').count()) === 0, "V12-4: nothing stated, over the pieces, no button");
  ok((await page.locator('[data-qls="sample-control"]').count()) === 0, "V12-5: closed until Opening pages is ticked");
  await page.locator('[data-qls="piece"][data-k="sample"]').click();
  ok((await page.locator('[data-qls="sample-control"]').count()) === 1, "V12-5: open as soon as Opening pages is ticked, when the card says nothing");
  /* 25 pages from page 40 */
  const ctl = page.locator('[data-qls="sample-control"]');
  await ctl.locator(".qad-srow button", { hasText: "Pages" }).click();
  await ctl.locator(".qad-presets button", { hasText: /^25$/ }).click();
  await ctl.locator(".qad-from button", { hasText: "A specific section" }).click();
  await ctl.locator(".qad-sectline button", { hasText: "Page" }).click();
  const pill = await text(page, '[data-qls="vr"][data-k="sample"]');
  const ver = await text(page, '[data-qls="version"]');
  READ.V12_5 = { pill, ver };
  ok(pill.startsWith("Pages 40–64"), `V12-5: the row names the section ("${pill}")`);
  /* v1.3 — the Version row is one pill naming the chosen version; the others are in its menu */
  ok(/Version 2\s*current/.test(ver), `V12-5: the Version row ("${ver}")`);
  await page.locator('[data-qls="pieces-continue"]').click();
  await page.locator('[data-qls="how-opt"][data-k="Email"]').click();
  await page.locator('[data-qls="nudge-continue"]').click();
  await expect(R(page)).toHaveAttribute("data-step", "check");
  await page.locator('[data-qls="log"]').click();
  await page.locator('[data-qls="yay"]').waitFor({ state: "visible", timeout: 120_000 });
  const saved = JSON.parse(execSync("node tests/e2e/seedLaq12.mjs --queries laq12-jl").toString().trim().split("\n").pop()!);
  Object.assign(READ.V12_5 as object, { saved });
  ok(saved.length === 1 && /pages 40–64/.test(saved[0].sentMaterials), `V12-5: the save says "pages 40–64" (${saved[0]?.sentMaterials})`);
  await page.locator('[data-qls="undo"]').click();
  await expect(R(page)).toHaveAttribute("data-step", "check", { timeout: 60_000 });
  const after = JSON.parse(execSync("node tests/e2e/seedLaq12.mjs --queries laq12-jl").toString().trim().split("\n").pop()!);
  ok(after.length === 0, "V12-5: Undo removed the query");
});

test("V12 floor — the run measured what it claims", () => {
  expect(checks).toBeGreaterThanOrEqual(30);
});
