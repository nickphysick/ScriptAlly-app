/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CLEAN-UP PASS, ITEM 3 ON THE BUILT APP (28 Sep): the materials treatments appear everywhere a
 * query's history or header is shown — and each place shows the RIGHT one for a package, an
 * individual log and an unrecorded query. The shared component marks its treatment in
 * `data-sent-how` (the chip) and `data-sent-box` (the box); every case reads those, per query.
 *
 * ⚠️ IT PLANTS ITS OWN SUBJECTS: three agents cloned from a real one and three queries at Partial
 * Requested (so each is a To-do task), one per treatment, with a send in each log and in the feed.
 * All of it is removed in afterAll, whatever the cases say.
 *
 *   SA_E2E_BASE_URL=http://127.0.0.1:<port> npx playwright test tests/e2e/materialsEverywhere.measure.ts
 */
import { test, expect, type Page } from "@playwright/test";
import { collection, doc, getDocs, setDoc, deleteDoc, Timestamp, query as fsQuery, where } from "firebase/firestore";
import { ensureSignedIn, openRoute, liftMotionSuppression, visiblePage } from "./measure";
import { selectTodoView } from "./todoOpen";
import { harnessDb } from "./harnessDocs";

const MS = "seed-ms-1";
type Kind = "package" | "individual" | "unrecorded";
const CASES: { kind: Kind; agent: string; name: string; q: string; fields: Record<string, unknown> }[] = [
  { kind: "package", agent: "me-a-pkg", name: "Pembroke Ashcroft", q: "me-q-pkg", fields: { sentHow: "package", sentPackageId: "me-pkg", packageId: "me-pkg", sentPackageEdition: 1, sentPackageName: "Cleanup Standard", sentMaterials: "Cleanup Standard package: Query letter v3 · Synopsis v2" } },
  { kind: "individual", agent: "me-a-ind", name: "Isolde Branwell", q: "me-q-ind", fields: { sentHow: "individual", packageId: "", sentMaterials: "Query letter v3 · Synopsis v2" } },
  { kind: "unrecorded", agent: "me-a-unr", name: "Ursula Penhale", q: "me-q-unr", fields: { sentHow: "unrecorded", packageId: "" } },
];
let asserted = 0;
const ok = (c: boolean, m: string) => { expect(c, m).toBe(true); asserted++; };
test.describe.configure({ mode: "serial" });

const daysAgo = (d: number) => Date.now() - d * 86_400_000;
test.beforeAll(async () => {
  const { db, uid } = await harnessDb();
  const base = (await getDocs(collection(db, "users", uid, "agents"))).docs.find((d) => !d.id.startsWith("me-") && !d.id.startsWith("rc-"))!.data();
  for (const c of CASES) {
    await setDoc(doc(db, "users", uid, "agents", c.agent), { ...base, id: c.agent, name: c.name, agency: "Everywhere Literary", dateAdded: new Date(daysAgo(30)).toISOString() });
    await setDoc(doc(db, "users", uid, "queries", c.q), {
      id: c.q, userId: uid, manuscriptId: MS, agentId: c.agent, status: "Partial Requested",
      dateSent: new Date(daysAgo(12)).toISOString().slice(0, 10), partialRequestedDate: new Date(daysAgo(4)).toISOString(),
      lastStatusChange: new Date(daysAgo(4)).toISOString(), hasAgentResponded: true, sendMethod: "Email",
      personalisationNotes: "", materialsWanted: [], ...c.fields,
    });
    await setDoc(doc(db, "users", uid, "queries", c.q, "activity", `${c.q}-s1`), { type: "Queried", resultingStatus: "Queried", createdAt: Timestamp.fromMillis(daysAgo(12)), note: "Query sent", queryId: c.q });
    await setDoc(doc(db, "users", uid, "queries", c.q, "activity", `${c.q}-s2`), { type: "Partial Requested", resultingStatus: "Partial Requested", createdAt: Timestamp.fromMillis(daysAgo(4)), note: "Partial manuscript requested", queryId: c.q });
    await setDoc(doc(db, "users", uid, "activities", `${c.q}-f1`), { id: `${c.q}-f1`, userId: uid, activityType: "Query Sent", description: `Query sent to ${c.name} at Everywhere Literary`, manuscriptId: MS, queryId: c.q, date: new Date(daysAgo(12)).toISOString(), details: "", resultingStatus: "Queried" });
  }
});
test.afterAll(async () => {
  const { db, uid } = await harnessDb();
  for (const c of CASES) {
    for (const d of (await getDocs(collection(db, "users", uid, "queries", c.q, "activity"))).docs) await deleteDoc(d.ref);
    for (const d of (await getDocs(fsQuery(collection(db, "users", uid, "activities"), where("queryId", "==", c.q)))).docs) await deleteDoc(d.ref);
    for (const d of (await getDocs(fsQuery(collection(db, "users", uid, "taskFlags"), where("queryId", "==", c.q)))).docs) await deleteDoc(d.ref);
    await deleteDoc(doc(db, "users", uid, "queries", c.q));
    await deleteDoc(doc(db, "users", uid, "agents", c.agent));
  }
  console.log(`MATERIALS-EVERYWHERE assertions: ${asserted}`);
});

async function start(page: Page, route: string, width = 1440) {
  await ensureSignedIn(page);
  await page.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch { /* */ } }, ["scriptally_active_manuscript_id", MS]);
  await openRoute(page, route, { width, height: 900 });
  await liftMotionSuppression(page);
  await page.waitForTimeout(1500);
}
/** the treatments visible inside `scope` (an element that is on screen) */
const seen = (page: Page, scope: string) => page.evaluate((sel) => {
  const root = [...document.querySelectorAll<HTMLElement>(sel)].find((e) => e.getBoundingClientRect().height > 0);
  if (!root) return null;
  return {
    chip: root.querySelector("[data-sent-how]")?.getAttribute("data-sent-how") ?? null,
    box: root.querySelector("[data-sent-box]")?.getAttribute("data-sent-box") ?? null,
  };
}, scope);

test("the dashboard quick card: the chip in its header and the box on the send", async ({ page }) => {
  test.setTimeout(240_000);
  await start(page, "/dashboard");
  for (const c of CASES) {
    const row = page.locator(".os-fent").filter({ hasText: c.name }).first();
    await expect(row, `no feed row for ${c.name}`).toBeVisible({ timeout: 20_000 });
    await row.click();
    await expect(page.locator(".qcard").filter({ hasText: c.name }).first()).toBeVisible({ timeout: 10_000 });
    /* the card's rail arrives from its own listener a moment after the card — wait for the send rung */
    await page.locator(".qcard .qcard-ev").nth(1).waitFor({ timeout: 10_000 }).catch(() => {});
    const s = await seen(page, ".qcard");
    const tl = s?.box ? "" : ((await page.locator(".qcard-tl").first().innerHTML().catch(() => "")) || "").replace(/<svg[\s\S]*?<\/svg>/g, "").slice(0, 900);
    ok(s?.chip === c.kind && s?.box === c.kind, `quick card for ${c.kind}: ${JSON.stringify(s)} ${tl}`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
  }
});

/* ⚠️ REWRITTEN AGAINST THE AGENT CARD (Agent card v1 P2, 5 Oct). The Contact list's pop-up is the
   app-level agent card now; its face is the mock's quick view, which has no room for what was sent,
   so the chip and the box ride at the top of the card's History disclosure — above the steps, as
   they sat above the pop-up's trail. The case opens the disclosure, then reads both, VISIBLE. */
test("the agent card: the chip and the box above the steps, in its History", async ({ page }) => {
  test.setTimeout(240_000);
  await start(page, "/agents");
  for (const c of CASES) {
    const row = page.locator(`[data-agent-card="${c.agent}"]`).first();
    await expect(row, `no row for ${c.name}`).toBeVisible({ timeout: 20_000 });
    await row.click();
    await page.waitForSelector('[data-ac="card"] [data-ac="hist"]');
    await page.click('[data-ac="card"] [data-ac="hist"]');
    await page.waitForSelector('[data-ac="card"] [data-ac="histbody"]');
    const s = await seen(page, '[data-ac="card"] [data-ac="histbody"]');
    ok(s?.chip === c.kind && s?.box === c.kind, `agent card for ${c.kind}: ${JSON.stringify(s)}`);
    /* above the steps, as on the pop-up — order is part of the claim */
    const above = await page.evaluate(() => {
      const box = document.querySelector('[data-ac="card"] [data-ac="histbody"] [data-sent-box]');
      const trail = document.querySelector('[data-ac="card"] [data-ac="trail"]');
      return !!box && !!trail && box.getBoundingClientRect().bottom <= trail.getBoundingClientRect().top + 0.5;
    });
    ok(above, `agent card for ${c.kind}: what was sent is not above the steps`);
    await page.keyboard.press("Escape");
    await page.waitForSelector('[data-ac="card"]', { state: "detached" });
  }
});

test("the Query Centre drawer (under 900px of column): the chip under the name", async ({ page }) => {
  test.setTimeout(240_000);
  for (const c of CASES) {
    await start(page, `/queries?q=${c.q}`, 1024);
    const s = await seen(page, ".qpn-inner");
    ok(s?.chip === c.kind, `QueryPanel header for ${c.kind}: ${JSON.stringify(s)}`);
  }
});

test("the To-do pane: the chip beneath the agent and the box on the send rung", async ({ page }) => {
  test.setTimeout(300_000);
  await start(page, "/todo");
  const scope = await visiblePage(page, ".wpg");
  await selectTodoView(page, "list");
  for (const c of CASES) {
    const row = page.locator(`${scope}.tlc .row`).filter({ hasText: c.name }).first();
    await expect(row, `no To-do row for ${c.name}`).toBeVisible({ timeout: 20_000 });
    /* a List row's first click FOCUSES it (and shows its strip); the second opens the pane */
    await row.click();
    await page.waitForTimeout(300);
    if (!(await page.locator(".tpn").count())) await row.click();
    await page.locator(".tpn").first().waitFor({ timeout: 10_000 }).catch(() => {});
    await page.locator(".tpn [data-sent-box]").first().waitFor({ timeout: 10_000 }).catch(() => {});
    const s = await seen(page, ".tpn");
    if (!s) console.log("TODO-DIAG", JSON.stringify(await page.evaluate(() => ({ url: location.href, tpn: document.querySelectorAll(".tpn").length, drawer: document.querySelectorAll("[data-qad-drawer]").length, dialogs: [...document.querySelectorAll("[role=dialog]")].filter((e) => e.getBoundingClientRect().height > 0).map((e) => e.className).slice(0, 5) }))));
    ok(s?.chip === c.kind && s?.box === c.kind, `To-do pane for ${c.kind}: ${JSON.stringify(s)}`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
  }
});

test("the Calendar drawer: the chip under the agency and the box under the send", async ({ page }) => {
  test.setTimeout(300_000);
  await start(page, "/todo/calendar");
  for (const c of CASES) {
    const bar = page.locator(`.tl-p[data-rel*="${c.agent}"]`).first();
    await expect(bar, `no calendar bar for ${c.name}`).toHaveCount(1, { timeout: 20_000 });
    await bar.evaluate((e) => (e as HTMLElement).click());
    await page.locator(".tl-cc .tl-ccopen").first().evaluate((e) => (e as HTMLElement).click());
    await page.locator("body > .tl-dw").first().waitFor({ timeout: 10_000 });
    /* an urgent row opens on Actions; the chip and the box are on View, the first tab */
    await page.locator("body > .tl-dw .tl-dwtabs button").first().evaluate((e) => (e as HTMLElement).click());
    await page.waitForTimeout(400);
    const s = await seen(page, "body > .tl-dw");
    ok(s?.chip === c.kind && s?.box === c.kind, `Calendar drawer for ${c.kind}: ${JSON.stringify(s)}`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
  }
});
