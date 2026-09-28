/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CLEAN-UP PASS, ITEM 1 ON THE BUILT APP (28 Sep): nothing is written behind the writer's back.
 * Each case opens the app (whose data provider used to run the repair 1.5s after any change), waits
 * well past that, and reads Firestore. The pure half is src/lib/recordRepairGone.test.ts.
 *
 * ⚠️ IT PLANTS ITS OWN SUBJECTS AND REMOVES THEM IN THE SAME CASE: an agent `rc-agent` with an
 * "Added" row written the way addAgent USED to write it (a random id, found by name), and a query
 * `rc-q` with a Queried step and a Partial Requested step. The Tracking delete is undone by its Undo.
 *
 *   SA_E2E_BASE_URL=http://127.0.0.1:<port> npx playwright test tests/e2e/recordCleanup.measure.ts
 */
import { test, expect, type Page } from "@playwright/test";
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, updateDoc, Timestamp, query as fsQuery, where } from "firebase/firestore";
import { ensureSignedIn, openRoute, liftMotionSuppression } from "./measure";
import { harnessDb } from "./harnessDocs";
import { openQueryById, openTab } from "./openQuery";

const AG = "rc-agent";
const OLD_ROW = "act-rc0oldrow";
const QID = "rc-q";
const MS = "seed-ms-1";
const WAIT = 5_000; // the repair fired 1.5s after a change; wait well past it
let asserted = 0;
const ok = (c: boolean, m: string) => { expect(c, m).toBe(true); asserted++; };
test.describe.configure({ mode: "serial" });
test.afterAll(() => console.log(`RECORD-CLEANUP assertions: ${asserted}`));

async function addedRowsFor(agentId: string, name: string) {
  const { db, uid } = await harnessDb();
  const rows = (await getDocs(fsQuery(collection(db, "users", uid, "activities"), where("activityType", "==", "Agent Added")))).docs;
  return rows.filter((d) => d.id === `act-added-agent-${agentId}` || String(d.data().description ?? "").includes(name) || d.id === OLD_ROW).map((d) => d.id);
}
async function plantAgent(name: string) {
  const { db, uid } = await harnessDb();
  /* cloned from a real agent so it satisfies isValidAgent whatever its shape grows to */
  const base = (await getDocs(collection(db, "users", uid, "agents"))).docs.find((d) => !d.id.startsWith("rc-"))!.data();
  await setDoc(doc(db, "users", uid, "agents", AG), { ...base, id: AG, name, agency: "Record Cleanup Ltd", dateAdded: "2026-09-01T09:00:00.000Z" });
  await setDoc(doc(db, "users", uid, "activities", OLD_ROW), { id: OLD_ROW, userId: uid, activityType: "Agent Added", description: `Added ${name} at Record Cleanup Ltd`, manuscriptId: "", queryId: "", date: "2026-09-01T09:00:00.000Z", details: "" });
}
async function removeAgent() {
  const { db, uid } = await harnessDb();
  for (const id of [OLD_ROW, `act-added-agent-${AG}`]) await deleteDoc(doc(db, "users", uid, "activities", id));
  await deleteDoc(doc(db, "users", uid, "agents", AG));
}
async function openApp(page: Page) {
  await ensureSignedIn(page);
  await openRoute(page, "/dashboard", { width: 1440, height: 900 });
  await liftMotionSuppression(page);
  await page.waitForTimeout(WAIT);
}

test("1d — a renamed agent still has exactly one 'Added' row", async ({ page }) => {
  test.setTimeout(180_000);
  await plantAgent("Rowan Cleaver");
  try {
    const { db, uid } = await harnessDb();
    await updateDoc(doc(db, "users", uid, "agents", AG), { name: "Rowan Cleaver-Hart" });
    await openApp(page);
    const rows = await addedRowsFor(AG, "Rowan Cleaver");
    ok(rows.length === 1, `exactly one 'Added' row after a rename (got ${JSON.stringify(rows)})`);
  } finally { await removeAgent(); }
});

test("1g — a deleted 'Added' row stays gone after a reload", async ({ page }) => {
  test.setTimeout(180_000);
  await plantAgent("Imogen Stale");
  try {
    const { db, uid } = await harnessDb();
    await deleteDoc(doc(db, "users", uid, "activities", OLD_ROW));
    await openApp(page);
    await page.reload(); await page.waitForTimeout(WAIT);
    const rows = await addedRowsFor(AG, "Imogen Stale");
    ok(rows.length === 0, `the deleted row was not re-created (got ${JSON.stringify(rows)})`);
  } finally { await removeAgent(); }
});

test("1g — a step deleted in Tracking stays gone past the old repair's 1.5 seconds; Undo restores it", async ({ page }) => {
  test.setTimeout(240_000);
  const { db, uid } = await harnessDb();
  const agents = (await getDocs(collection(db, "users", uid, "agents"))).docs;
  const agentId = agents[0].id;
  const old = (days: number) => Timestamp.fromMillis(Date.now() - days * 86_400_000);
  const iso = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();
  await setDoc(doc(db, "users", uid, "queries", QID), {
    id: QID, userId: uid, manuscriptId: MS, agentId, packageId: "", status: "Partial Requested", dateSent: iso(60).slice(0, 10),
    partialRequestedDate: iso(40), lastStatusChange: iso(40), sendMethod: "Email", personalisationNotes: "", materialsWanted: [], hasAgentResponded: true,
  });
  await setDoc(doc(db, "users", uid, "queries", QID, "activity", "rc-s1"), { type: "Queried", resultingStatus: "Queried", createdAt: old(60), note: "Query sent", queryId: QID });
  await setDoc(doc(db, "users", uid, "queries", QID, "activity", "rc-s2"), { type: "Partial Requested", resultingStatus: "Partial Requested", createdAt: old(40), note: "Partial manuscript requested", queryId: QID });
  try {
    await ensureSignedIn(page);
    await openRoute(page, "/queries", { width: 1440, height: 900 });
    await liftMotionSuppression(page);
    const host = await openQueryById(page, QID);
    await openTab(page, host, "Tracking");
    const mores = page.locator(`${host.root} .tl-more`);
    await expect(mores.last()).toBeVisible();
    await mores.last().click();
    await page.locator("[data-cor-delete]").click();
    await page.locator(`${host.root} [data-qcv="entry-delc"] [data-qcv="entry-del-go"]`).click();
    await expect.poll(async () => (await getDoc(doc(db, "users", uid, "queries", QID, "activity", "rc-s2"))).exists(), { timeout: 10_000 }).toBe(false);
    await page.waitForTimeout(WAIT);
    const log = (await getDocs(collection(db, "users", uid, "queries", QID, "activity"))).docs.map((d) => `${d.id}:${d.data().resultingStatus ?? d.data().type}`);
    ok(!log.some((x) => /Partial Requested/.test(x)), `no Partial Requested step came back (log: ${JSON.stringify(log)})`);
    ok(!log.some((x) => x.startsWith("act-status-")), "and no reconstructed step was written behind the writer's back");
    const undo = page.locator(".sa-toast-undo, [data-qad-undo]").last();
    await expect(undo, "NO UNDO WAS OFFERED").toBeVisible({ timeout: 6_000 });
    await undo.click();
    await expect.poll(async () => (await getDoc(doc(db, "users", uid, "queries", QID, "activity", "rc-s2"))).exists(), { timeout: 10_000 }).toBe(true);
    ok(true, "Undo restores the step");
  } finally {
    for (const d of (await getDocs(collection(db, "users", uid, "queries", QID, "activity"))).docs) await deleteDoc(d.ref);
    for (const d of (await getDocs(fsQuery(collection(db, "users", uid, "activities"), where("queryId", "==", QID)))).docs) await deleteDoc(d.ref);
    await deleteDoc(doc(db, "users", uid, "queries", QID));
  }
});

test("1g — the old race, made deterministic: a step gone while the stored status still reads it is not written back", async ({ page }) => {
  /* ⚠️ THE CASE ABOVE CANNOT GO RED ON ITS OWN: the old repair fired only when a log held no status
     step at all, and the old Tracking path re-deleted any rung that came back. This one opens the
     exact window the race lived in — the step gone, the recompute not yet landed — and holds it. */
  test.setTimeout(180_000);
  const { db, uid } = await harnessDb();
  const agentId = (await getDocs(collection(db, "users", uid, "agents"))).docs[0].id;
  const iso = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();
  await setDoc(doc(db, "users", uid, "queries", QID), {
    id: QID, userId: uid, manuscriptId: MS, agentId, packageId: "", status: "Partial Requested", dateSent: iso(60).slice(0, 10),
    partialRequestedDate: iso(40), lastStatusChange: iso(40), sendMethod: "Email", personalisationNotes: "", materialsWanted: [], hasAgentResponded: true,
  });
  try {
    await openApp(page);
    await page.reload(); await page.waitForTimeout(WAIT);
    const log = (await getDocs(collection(db, "users", uid, "queries", QID, "activity"))).docs.map((d) => d.id);
    ok(log.length === 0, `nothing was written into the empty log (got ${JSON.stringify(log)})`);
  } finally {
    for (const d of (await getDocs(collection(db, "users", uid, "queries", QID, "activity"))).docs) await deleteDoc(d.ref);
    await deleteDoc(doc(db, "users", uid, "queries", QID));
  }
});
