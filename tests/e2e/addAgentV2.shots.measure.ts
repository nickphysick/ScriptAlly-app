/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Add an agent v2 — SHOTS of every state, in the reference's journey order (design-refs/add-agent-v2/screens/01–21), at
 * 1440 × 900, into reports/add-agent-v2/shots/. A picture for the report and the review, not a lock: the locks are
 * quickActions.measure.ts and addAgentV2.measure.ts. It adds agents and deletes them again before it ends.
 *
 * ⚠️ EMULATOR ONLY: `npm run e2e:emu -- tests/e2e/addAgentV2.shots.measure.ts --project=measure`.
 */
import { test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openApp } from "./pageHeaderV2Lib";

const OUT = "reports/add-agent-v2/shots";
const EMU = "http://127.0.0.1:8085/v1/projects/demo-scriptally/databases/(default)/documents";
const UID = "LS4ymFFCEvhN82advZQJ5zkr7sv2";
type FsDoc = { name: string; fields?: Record<string, { stringValue?: string }> };
async function agents(): Promise<FsDoc[]> {
  const r = await fetch(`${EMU}/users/${UID}/agents?pageSize=300`, { headers: { Authorization: "Bearer owner" } });
  return ((await r.json()) as { documents?: FsDoc[] }).documents ?? [];
}
async function removeNamed(names: string[]) {
  for (const d of await agents()) if (names.includes(d.fields?.name?.stringValue ?? "")) await fetch(`${EMU}/users/${UID}/agents/${d.name.split("/").pop()}`, { method: "DELETE", headers: { Authorization: "Bearer owner" } });
}
const settle = (p: Page, ms = 600) => p.waitForTimeout(ms);
const shot = (p: Page, n: string) => p.screenshot({ path: `${OUT}/${n}.png` });
const t = async (p: Page, k: string, v: string) => { const f = p.locator(`[data-aag="root"] [data-aag="${k}"]`); await f.click(); await f.fill(v); };
const b = (p: Page, k: string) => p.locator(`[data-aag="root"] [data-aag="${k}"]`).filter({ visible: true }).first().click();
async function openAdd(p: Page) {
  await p.locator("[data-shell=quick-btn]").filter({ visible: true }).first().click(); await settle(p, 350);
  await p.locator("[data-quick='agent']").click(); await p.locator('[data-aag="root"]').waitFor(); await settle(p, 700);
}
async function esc(p: Page) {
  for (let i = 0; i < 5; i++) {
    if (!(await p.locator("[data-side-panel], [data-cl262='panel']").count())) break;
    await p.keyboard.press("Escape"); await settle(p, 350);
    for (const d of ['[data-aag="leave-discard"]', '[data-qls="leave-discard"]']) { const x = p.locator(d).filter({ visible: true }); if (await x.count()) { await x.first().click(); await settle(p, 350); } }
  }
}

test("Add an agent v2 · every state", async ({ page }) => {
  test.setTimeout(240_000);
  mkdirSync(OUT, { recursive: true });
  const list = await agents();
  const onList = list.map((d) => ({ name: d.fields?.name?.stringValue ?? "", agency: d.fields?.agency?.stringValue ?? "" }));
  const counts = new Map<string, number>(); for (const a of onList) if (a.agency) counts.set(a.agency, (counts.get(a.agency) ?? 0) + 1);
  const agency = [...counts.entries()].sort((x, y) => y[1] - x[1])[0]?.[0] ?? "";
  const dupe = onList.find((a) => a.name && a.agency)?.name ?? "";
  writeFileSync(`${OUT}/harness.json`, JSON.stringify({ agents: onList.length, agency, dupe }, null, 1));
  try {
    await openApp(page, "/dashboard", { width: 1440, height: 900 });
    await page.locator("[data-shell=quick-btn]").filter({ visible: true }).first().click(); await settle(page, 400);
    await shot(page, "01-quick-actions-menu");
    await page.locator("[data-quick='agent']").click(); await page.locator('[data-aag="root"]').waitFor(); await settle(page, 800);
    await shot(page, "02-agent-empty");
    await t(page, "name", dupe); await settle(page, 400); await shot(page, "03-agent-already-on-list");
    await t(page, "name", "Sarah Jones"); await t(page, "agency", agency.slice(0, 3)); await settle(page, 400); await shot(page, "04-agency-suggestion");
    await t(page, "agency", agency); await page.locator('[data-aag="root"] [data-aag="city"]').click(); await settle(page, 400); await shot(page, "05-same-agency-line");
    await t(page, "agency", ""); await b(page, "next"); await settle(page, 400); await shot(page, "06-agency-ask");
    await b(page, "ask-unknown"); await settle(page, 300);
    await t(page, "city", "Dublin"); await settle(page, 500); await shot(page, "07-agency-unknown");
    await b(page, "next"); await settle(page, 800);
    const g = page.locator('[data-aag="root"] [data-aag="genres"] input').first();
    for (const x of ["Thriller", "Crime"]) { await g.click(); await g.fill(x); await settle(page, 300); await page.keyboard.press("Enter"); await settle(page, 300); }
    await page.locator('[data-aag="wish"]').fill("Twisty, character-led thrillers with a strong sense of place.");
    await shot(page, "08-wishlist");
    await b(page, "next"); await settle(page, 800);
    await page.locator('[data-aag="tile"][data-k="letter"] > button').click();
    await page.locator('[data-aag="tile"][data-k="syn"] > button').click();
    await page.locator('[data-aag="syn"][data-k="1"]').click();
    await page.locator('[data-aag="tile"][data-k="sample"] > button').click(); await settle(page, 400);
    await shot(page, "09-asks-for");
    await page.locator('[data-aag="tile"][data-k="other"] > button').click(); await settle(page, 300);
    await page.locator('[data-aag="other-tx"]').fill("Author photo"); await shot(page, "10-asks-something-else");
    await b(page, "next"); await settle(page, 800);
    await page.locator('[data-aag="method"][data-k="email"]').click(); await settle(page, 200);
    await page.locator('[data-aag="root"] [data-aag="email"]').fill("sarah@fenwick.example");
    await page.locator('[data-aag="root"] [data-aag="web"]').fill("fenwick.example");
    await page.locator('[data-aag="door"][data-k="open"]').click(); await settle(page, 300);
    await shot(page, "11-how");
    await b(page, "next"); await settle(page, 800); await shot(page, "12-replies-unknown");
    const sl = page.locator('[data-aag="weeks"] input[type="range"]');
    await sl.evaluate((e: HTMLInputElement) => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!; set.call(e, "8"); e.dispatchEvent(new Event("input", { bubbles: true })); e.dispatchEvent(new Event("change", { bubbles: true })); });
    await page.locator('[data-aag="policy"][data-k="nrn"]').click(); await settle(page, 300);
    await shot(page, "13-replies-set");
    await b(page, "next"); await settle(page, 1200); await shot(page, "14-review");
    await page.locator('[data-aag="star"][data-n="4"]').click(); await settle(page, 400); await shot(page, "15-review-fit-rated");
    await page.locator('[data-aag="fit-info"]').click(); await settle(page, 300); await shot(page, "16-review-fit-info");
    await page.keyboard.press("Escape"); await settle(page, 300);
    writeFileSync(`${OUT}/review-dom.json`, JSON.stringify(await page.evaluate(() => {
      const pv = document.querySelector<HTMLElement>('[data-aag="preview"]');
      const sb = document.querySelector<HTMLElement>('[data-aag="root"] [data-aag="body"]');
      return { pv: pv?.getBoundingClientRect(), scale: pv?.dataset.scale, sb: sb?.getBoundingClientRect(), sbScroll: sb ? sb.scrollHeight - sb.clientHeight : null, details: document.querySelector('[data-aag="details-n"]')?.textContent };
    }), null, 1));
    await b(page, "add"); await settle(page, 1800); await shot(page, "17-added");
    await esc(page);
    await openAdd(page); await t(page, "name", "Tamsin Ledbury"); await t(page, "agency", "Fenwick & Rowe"); await b(page, "add-later"); await settle(page, 1200);
    await shot(page, "18-review-name-and-agency-only");
    await page.locator('[data-aag="close"]').click(); await settle(page, 300); await shot(page, "19-discard-check");
    await page.locator('[data-aag="leave-discard"]').click(); await settle(page, 600);
    await page.locator("[data-shell=quick-btn]").filter({ visible: true }).first().click(); await settle(page, 350);
    await page.locator("[data-quick='query']").click(); await settle(page, 1200);
    await page.locator("[data-qls='find']").fill("Ottoline Breck"); await settle(page, 400);
    await page.locator("[data-qls='new-agent']").filter({ visible: true }).first().click(); await settle(page, 1000);
    await shot(page, "20-from-log-a-query");
    await t(page, "agency", "Hale & Finch"); await b(page, "add-now"); await settle(page, 1800);
    await shot(page, "21-from-log-a-query-added");
    await b(page, "back-laq"); await settle(page, 1000); await shot(page, "22-back-in-log-a-query");
    await esc(page);
    for (const w of [1280, 1512]) {
      await page.setViewportSize({ width: w, height: w === 1280 ? 800 : 900 }); await settle(page, 400);
      await openAdd(page); await t(page, "name", "Sarah Jones"); await t(page, "agency", "Fenwick & Rowe"); await b(page, "add-later"); await settle(page, 1200);
      await shot(page, `review-${w}`);
      await esc(page);
    }
  } finally {
    await removeNamed(["Sarah Jones", "Tamsin Ledbury", "Ottoline Breck"]);
  }
});
