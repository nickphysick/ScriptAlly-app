/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PACKAGES THROUGH THE JOURNEY — Part B on the built app (docs/contracts/package-editions.md §C2/§C4;
 * ref design-refs/packages-journey/package-tracking-v1.html). The pure halves are in
 * src/lib/packageEditions.test.ts.
 *
 * ⚠️ USES THE PACKAGES SESSION'S v2 FIXTURE, READ-ONLY USE OF ITS SCRIPT (as packagesJourney does):
 * seeded in beforeAll, restored in afterAll, and every write a case makes is undone inside the case —
 * the toast IS the undo, so nothing navigates between a commit and its Undo.
 *
 *   SA_E2E_BASE_URL=http://127.0.0.1:<port> npx playwright test tests/e2e/packagesPartB.measure.ts
 */
import { test, expect, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { ensureSignedIn, openRoute, liftMotionSuppression } from "./measure";
import { harnessDb } from "./harnessDocs";

const MS = "seed-ms-pkgv2";
const AUTUMN = "pv2-p1";   // sent, active, 8 queries: 5 Queried, 3 requests
const MSWL = "pv2-p2";     // sent: 1 Queried, 1 Partial Sent, 3 Rejected
const WINTER = "pv2-p4";   // never sent
const LETTER_V3 = "pv2-l3"; // in Autumn round, so sent
const SHOTS = "reports/packages-journey/shots";
let asserted = 0;
const ok = (c: boolean, m: string) => { expect(c, m).toBe(true); asserted++; };

test.describe.configure({ mode: "serial" });
test.beforeAll(() => { mkdirSync(SHOTS, { recursive: true }); execSync("node tests/e2e/seedPackagesV2Fixture.mjs", { stdio: "inherit" }); });
test.afterAll(() => {
  execSync("node tests/e2e/seedPackagesV2Fixture.mjs --restore", { stdio: "inherit" });
  console.log(`PACKAGES-PART-B assertions: ${asserted}`);
});

const on = (page: Page, sel: string) => page.locator(`[data-ppv="page"]:visible ${sel}`);
const card = (page: Page, id: string) => on(page, `[data-ppv="pkg"][data-id="${id}"]`);
const tile = (page: Page, id: string, k: string) => card(page, id).locator(`[data-st="${k}"]`);
const tileN = async (page: Page, id: string, k: string) => Number(await tile(page, id, k).locator("b").innerText());
async function pkgDoc(id: string) {
  const { db, uid } = await harnessDb();
  return (await getDoc(doc(db, "users", uid, "packages", id))).data() as Record<string, unknown>;
}
async function openPkgs(page: Page) {
  await ensureSignedIn(page);
  await page.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch { /* */ } }, ["scriptally_active_manuscript_id", MS]);
  await openRoute(page, "/manuscripts/packages", { width: 1440, height: 900 });
  await liftMotionSuppression(page);
  await page.evaluate(async () => { await document.fonts.ready; });
  await expect(card(page, AUTUMN)).toBeVisible({ timeout: 20_000 });
}
/** press the app toast's Undo, and wait for the write it restores */
async function undo(page: Page) {
  const b = page.locator(".sa-toast-undo").last();
  await expect(b, "NO UNDO WAS OFFERED — the account has been changed").toBeVisible({ timeout: 6_000 });
  await b.click();
}

test("PB1 — the six tiles, the fair rate and the queries behind them (§C4)", async ({ page }) => {
  test.setTimeout(240_000);
  await openPkgs(page);
  const t = Object.fromEntries(await Promise.all(["sent", "out", "requests", "offers", "passes", "noreply"].map(async (k) => [k, await tileN(page, AUTUMN, k)])));
  ok(JSON.stringify(t) === JSON.stringify({ sent: 8, out: 5, requests: 3, offers: 0, passes: 0, noreply: 0 }), `Autumn round's tiles (got ${JSON.stringify(t)})`);
  ok(t.sent === t.out + t.requests + t.passes + t.noreply, "every sent query is in exactly one column");
  ok((await tile(page, AUTUMN, "requests").locator("span").innerText()).toLowerCase() === "3 in 3 answered", "the rate counts only answered queries");
  ok((await tile(page, AUTUMN, "sent").locator("span").innerText()).toLowerCase().startsWith("since "), "the current edition's SENT reads since a date");
  const m = { sent: await tileN(page, MSWL, "sent"), out: await tileN(page, MSWL, "out"), req: await tileN(page, MSWL, "requests"), pass: await tileN(page, MSWL, "passes") };
  ok(JSON.stringify(m) === JSON.stringify({ sent: 5, out: 1, req: 1, pass: 3 }), `Agents with MSWL (got ${JSON.stringify(m)})`);
  ok((await tile(page, MSWL, "requests").locator("span").innerText()).toLowerCase() === "1 in 4 answered", "1 in 4: still out never enters the rate");
  ok(await card(page, AUTUMN).locator(".ppv-eds").count() === 0, "one edition: no edition switch");
  ok(/^1st edition · /i.test(await card(page, AUTUMN).locator('[data-ppv="edline"]').innerText()), "the edition line names the 1st edition");
  ok(await card(page, AUTUMN).locator(".ppv-rq li").count() === 5, "the list shows five");
  const more = card(page, AUTUMN).locator(".ppv-more");
  ok((await more.innerText()) === "Show all 8", "and offers the rest");
  await more.click();
  ok(await card(page, AUTUMN).locator(".ppv-rq li").count() === 8, "Show all lists every credited query");
  ok(await card(page, WINTER).locator('[data-ppv="results"]').count() === 0, "an unsent package draws no tiles");
  await card(page, AUTUMN).screenshot({ path: `${SHOTS}/pb-card-1st-edition.png` });
  const first = card(page, AUTUMN).locator(".ppv-rq button").first();
  const qid = await first.getAttribute("data-q");
  await first.click();
  await expect(page).toHaveURL(new RegExp(`/queries\\?q=${qid}`));
  ok(true, "a row opens its query");
});

test("PB2 — editing a sent package starts its 2nd edition; the switch reads each; Undo puts it back exactly", async ({ page }) => {
  test.setTimeout(300_000);
  await openPkgs(page);
  const before = await pkgDoc(AUTUMN);
  ok(before.edition == null && before.editions == null, "the fixture starts before editions");
  await card(page, AUTUMN).locator('[data-act="edit"]').click();
  const comp = on(page, '[data-ppv="composer"]');
  await expect(comp).toBeVisible();
  await comp.locator("#ppv-c-name").fill("Autumn round renamed");
  ok(await comp.locator('[data-ppv="edwarn"]').count() === 0, "a rename alone starts nothing");
  await comp.locator("#ppv-c-name").fill("Autumn round");
  await comp.locator('[data-clear="synopsis"]').click();
  await comp.locator('[data-well="synopsis"] select').selectOption("pv2-s3");
  const warn = comp.locator('[data-ppv="edwarn"]');
  ok((await warn.innerText()).includes("This starts Autumn round's 2nd edition. Queries already sent keep the 1st."), "the edit screen names both editions");
  await comp.screenshot({ path: `${SHOTS}/pb-edition-warning.png` });
  await comp.locator('[data-ppv="create"]').click();
  let restored = false;
  try {
    await expect.poll(async () => (await pkgDoc(AUTUMN)).edition, { timeout: 5_000 }).toBe(2);
    const after = await pkgDoc(AUTUMN);
    const eds = after.editions as { n: number; synopsisVersionId: string }[];
    ok(JSON.stringify(eds.map((e) => [e.n, e.synopsisVersionId])) === JSON.stringify([[1, "pv2-s1"], [2, "pv2-s3"]]), `both editions are kept with their own contents (${JSON.stringify(eds)})`);
    ok(after.firstSentAt === before.firstSentAt, "the first-sent stamp does not move");
    const eds_ = card(page, AUTUMN).locator(".ppv-eds button");
    ok(JSON.stringify(await eds_.allInnerTexts()) === JSON.stringify(["All editions", "2nd edition · current", "1st edition"]), `the switch (${JSON.stringify(await eds_.allInnerTexts())})`);
    ok(await tileN(page, AUTUMN, "sent") === 0 && (await tile(page, AUTUMN, "sent").locator("span").innerText()).toLowerCase() === "none yet", "the new edition has sent nothing");
    await card(page, AUTUMN).screenshot({ path: `${SHOTS}/pb-card-2nd-edition.png` });
    await card(page, AUTUMN).locator('[data-ed="1"]').click();
    ok(await tileN(page, AUTUMN, "sent") === 8, "the 1st edition keeps its eight");
    ok(/ – /.test(await card(page, AUTUMN).locator('[data-ppv="edline"]').innerText()), "a past edition's line is a range");
    await card(page, AUTUMN).screenshot({ path: `${SHOTS}/pb-card-1st-edition-past.png` });
    await card(page, AUTUMN).locator('[data-ed="all"]').click();
    ok(await tileN(page, AUTUMN, "sent") === 8, "All editions is the sum");
    ok(/^all 2 editions together/i.test(await card(page, AUTUMN).locator('[data-ppv="edline"]').innerText()), "and says it is the big picture");
    await card(page, AUTUMN).screenshot({ path: `${SHOTS}/pb-card-all-editions.png` });
    await undo(page);
    restored = true;
    await expect.poll(async () => (await pkgDoc(AUTUMN)).edition ?? null, { timeout: 8_000 }).toBe(null);
    const back = await pkgDoc(AUTUMN);
    ok(back.editions == null && back.synopsisVersionId === "pv2-s1", "Undo puts the package back exactly: no 3rd edition, no list, the old synopsis");
  } finally {
    if (!restored) await undo(page);
  }
});

test("PB3 — a sent package is retired, never deleted; Retired keeps its history; Undo restores", async ({ page }) => {
  test.setTimeout(240_000);
  await openPkgs(page);
  ok(await card(page, AUTUMN).locator('[data-act="delete"]').count() === 0, "a sent package offers no Delete");
  ok(await card(page, WINTER).locator('[data-act="delete"]').count() === 1, "an unsent one does");
  await card(page, MSWL).locator('[data-act="retire"]').click();
  let restored = false;
  try {
    await expect.poll(async () => typeof (await pkgDoc(MSWL)).retiredAt, { timeout: 5_000 }).toBe("string");
    const bandBtn = on(page, '[data-ppv="band"][data-band="retired"][aria-expanded="false"]');
    if (await bandBtn.count()) await bandBtn.click();
    const r = card(page, MSWL);
    await expect(r).toBeVisible();
    ok(/^retired \d{1,2} [a-z]{3}$/i.test(await r.locator('[data-tag="retired"]').innerText()), "the tag carries the date it was retired");
    ok((await r.locator('[data-ppv="retline"]').innerText()).includes("its 5 queries still point here"), "the retired line counts what still points here");
    ok(JSON.stringify(await r.locator(".ppv-pacts [data-act]").evaluateAll((b) => b.map((x) => x.getAttribute("data-act")))) === JSON.stringify(["dup", "restore"]), "retired: Reuse as new and Restore — no Delete");
    ok(await tileN(page, MSWL, "sent") === 5, "its results are kept");
    await r.screenshot({ path: `${SHOTS}/pb-card-retired.png` });
    await undo(page);
    restored = true;
    await expect.poll(async () => (await pkgDoc(MSWL)).retiredAt ?? null, { timeout: 8_000 }).toBe(null);
    ok((await pkgDoc(MSWL)).status === "Active", "Undo restores it");
  } finally {
    if (!restored) await undo(page);
  }
});

test("PB4 — editing a sent letter makes the next version; the sent one is byte-identical", async ({ page }) => {
  test.setTimeout(240_000);
  await openPkgs(page);
  const { db, uid } = await harnessDb();
  const v3Before = JSON.stringify((await getDoc(doc(db, "users", uid, "versions", LETTER_V3))).data());
  const idsBefore = new Set((await getDocs(collection(db, "users", uid, "versions"))).docs.map((d) => d.id));
  await on(page, `[data-ppv="rail"] [data-more="${LETTER_V3}"]`).click();
  await on(page, '[data-ppv="mmenu"] [data-mact="edit"]').click();
  const modal = page.locator('[data-ppv="modal"]');
  await expect(modal).toBeVisible();
  ok((await modal.locator('[data-ppv="lockedit"]').innerText()) === "v3 has been sent, so your changes become v4.", "the modal says why");
  ok((await modal.locator("#ppv-m-name").inputValue()) === "Query letter v4", "the name starts as the next version's");
  ok((await modal.locator('[data-ppv="m-save"]').innerText()) === "Save as Query letter v4", "and the save says so");
  await modal.locator("#ppv-m-text").fill("Dear agent, a fresh opening paragraph.");
  await modal.screenshot({ path: `${SHOTS}/pb-locked-version.png` });
  await modal.locator('[data-ppv="m-save"]').click();
  let restored = false;
  try {
    await expect.poll(async () => (await getDocs(collection(db, "users", uid, "versions"))).docs.filter((d) => !idsBefore.has(d.id)).length, { timeout: 6_000 }).toBe(1);
    const fresh = (await getDocs(collection(db, "users", uid, "versions"))).docs.find((d) => !idsBefore.has(d.id))!.data();
    ok(fresh.versionName === "Query letter v4" && fresh.contentDraft === "Dear agent, a fresh opening paragraph.", "the edit is the next version");
    ok(JSON.stringify((await getDoc(doc(db, "users", uid, "versions", LETTER_V3))).data()) === v3Before, "v3 is byte-identical");
    await undo(page);
    restored = true;
    await expect.poll(async () => (await getDocs(collection(db, "users", uid, "versions"))).docs.filter((d) => !idsBefore.has(d.id)).length, { timeout: 8_000 }).toBe(0);
    ok(true, "Undo removes the new version");
  } finally {
    if (!restored) await undo(page);
  }
});

test("PB5 + PB6 — Log a query with this opens the drawer on that package; the log stamps it, and Undo lifts the stamp", async ({ page }) => {
  test.setTimeout(300_000);
  await openPkgs(page);
  ok(!(await pkgDoc(WINTER)).firstSentAt, "Winter draft starts unsent");
  await card(page, WINTER).locator('[data-act="log"]').click();
  await expect(page.locator("[data-qad-drawer]")).toBeVisible({ timeout: 10_000 });
  /* the agent step first: choose any agent free on this manuscript */
  const { db, uid } = await harnessDb();
  const qs = (await getDocs(collection(db, "users", uid, "queries"))).docs.map((d) => d.data());
  const busy = new Set(qs.filter((q) => q.manuscriptId === MS && !["Rejected", "Withdrawn", "No Response", "Signed"].includes(q.status)).map((q) => q.agentId));
  const agents = (await getDocs(collection(db, "users", uid, "agents"))).docs.filter((d) => !busy.has(d.id) && !d.data().setAside);
  const name = String(agents[0].data().name);
  await page.locator("[data-qad-agent-input]").fill(name);
  await page.locator(`[data-qad-drawer] [data-qad-agent="${agents[0].id}"]`).first().click();
  for (let i = 0; i < 4 && !(await page.locator("[data-qad-how]").count()); i++) await page.locator("[data-qad-primary]").click();
  ok(await page.locator("[data-qad-how].on").getAttribute("data-qad-how") === "package", "PB5: the drawer opens on a package");
  ok(await page.locator(".qad-prow.on").getAttribute("data-qad-pkg") === WINTER, "PB5: and it is this one, not the manuscript's default");
  for (let i = 0; i < 8 && !(await page.locator("[data-qad-review]").count()); i++) await page.locator("[data-qad-primary]").click();
  const idsBefore = new Set(qs.map((q) => q.id));
  await page.locator("[data-qad-primary]").click();
  await expect(page.locator('[data-qad-toast="on"]')).toBeVisible({ timeout: 20_000 });
  let undone = false;
  try {
    const fresh = (await getDocs(collection(db, "users", uid, "queries"))).docs.filter((d) => !idsBefore.has(d.id));
    ok(fresh.length === 1 && fresh[0].data().sentPackageName === "Winter draft", "the log records the package's name as it was");
    await expect.poll(async () => typeof (await pkgDoc(WINTER)).firstSentAt, { timeout: 5_000 }).toBe("string");
    ok(true, "the log stamps the package it went with");
    await page.locator("[data-qad-undo]").click();
    await expect(page.locator('[data-qad-toast="done"]'), "UNDO DID NOT COMPLETE — the account has been changed").toBeVisible({ timeout: 20_000 });
    undone = true;
    await expect.poll(async () => (await pkgDoc(WINTER)).firstSentAt ?? null, { timeout: 8_000 }).toBe(null);
    ok(true, "PB6: with nothing pointing at it, Undo lifts the stamp");
  } finally {
    if (!undone && await page.locator("[data-qad-undo]").count()) await page.locator("[data-qad-undo]").click();
  }
});
