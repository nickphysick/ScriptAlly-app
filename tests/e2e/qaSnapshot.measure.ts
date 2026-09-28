/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QUERY ACTIONS v1 — P4 and P3 on the built app (brief §H 11, 12).
 *
 * H11 THE SNAPSHOT HOLDS: log a query with a package, then rename the package and rename the
 * version it carried. The query's own record — `sentMaterials`, `sentVersions`, and the send's
 * activity `details` — still says what went out. "What was sent" is never read back from the live
 * package.
 *
 * H12 THE ADAPTER FALLS BACK: on a manuscript with no packages, D1 offers no package cards and
 * still completes with Custom materials (the other journey file's D1 case logs on exactly such a
 * manuscript; this file asserts the absence of the cards directly).
 *
 * ⚠️ SEEDS THE PACKAGES SESSION'S OWN FIXTURE (`seedPackagesV2Fixture.mjs`, read-only use of its
 * script) and RESTORES it in the same run; the query the case logs is undone by the drawer's Undo.
 */
import { test, expect, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { collection, doc, getDoc, getDocs, query as fsQuery, updateDoc, where } from "firebase/firestore";
import { ensureSignedIn, openRoute, liftMotionSuppression } from "./measure";
import { harnessDb } from "./harnessDocs";

const MS = "seed-ms-pkgv2";
const MS_EMPTY = "seed-ms-pkgv2e";

test.beforeAll(() => { execSync("node tests/e2e/seedPackagesV2Fixture.mjs", { stdio: "inherit" }); });
test.afterAll(() => { execSync("node tests/e2e/seedPackagesV2Fixture.mjs --restore", { stdio: "inherit" }); });

async function openDrawer(page: Page, req: Record<string, unknown>) {
  await page.evaluate((r) => (window as unknown as { __saQueryDrawer: { open: (r: unknown) => Promise<void> } }).__saQueryDrawer.open(r), req);
  await expect(page.locator("[data-qad-drawer]")).toBeVisible({ timeout: 10_000 });
}
async function toReview(page: Page) {
  for (let i = 0; i < 8; i++) {
    if (await page.locator("[data-qad-review]").count()) return;
    await page.locator("[data-qad-primary]").click();
  }
}
async function freeAgentFor(ms: string) {
  const { db, uid } = await harnessDb();
  const qs = (await getDocs(collection(db, "users", uid, "queries"))).docs.map((d) => d.data());
  const ags = (await getDocs(collection(db, "users", uid, "agents"))).docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }) as Record<string, unknown> & { id: string });
  const busy = new Set(qs.filter((q) => q.manuscriptId === ms && !["Rejected", "Withdrawn", "No Response", "Signed"].includes(q.status)).map((q) => q.agentId));
  return ags.find((a) => !busy.has(a.id) && !a.setAside)!;
}

test("H11 — the sent snapshot outlives a renamed package and a renamed version", async ({ page }) => {
  test.setTimeout(300_000);
  await ensureSignedIn(page);
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await liftMotionSuppression(page);
  const { db, uid } = await harnessDb();
  const before = new Set((await getDocs(collection(db, "users", uid, "queries"))).docs.map((d) => d.id));
  const agent = await freeAgentFor(MS);
  await openDrawer(page, { mode: "log", agentId: agent.id, manuscriptId: MS });
  await page.locator("[data-qad-primary]").click();
  await page.locator("[data-qad-primary]").click(); // → What you sent
  const card = page.locator("[data-qad-pkg]").first();
  await expect(card, "the fixture manuscript offers no package cards").toBeVisible();
  const pkgId = await card.getAttribute("data-qad-pkg");
  await card.click();
  await toReview(page);
  await page.locator("[data-qad-primary]").click();
  await expect(page.locator('[data-qad-toast="on"]')).toBeVisible({ timeout: 20_000 });

  let failure: unknown = null;
  const pkgRef = doc(db, "users", uid, "packages", pkgId!);
  const pkgBefore = (await getDoc(pkgRef)).data()!;
  const qlRef = pkgBefore.queryLetterVersionId ? doc(db, "users", uid, "versions", pkgBefore.queryLetterVersionId) : null;
  const qlBefore = qlRef ? (await getDoc(qlRef)).data() : null;
  try {
    const fresh = (await getDocs(collection(db, "users", uid, "queries"))).docs.filter((d) => !before.has(d.id));
    expect(fresh.length, "one query was logged").toBe(1);
    const qid = fresh[0].id;
    const sent = fresh[0].data();
    expect(sent.sentPackageId).toBe(pkgId);
    /* §C3 (28 Sep): the summary is the pieces as they went — the package is `sentPackageId`, not a
       prefix on the summary — so the snapshot is the pieces and the version NAMES they carried. */
    expect(sent.sentHow).toBe("package");
    expect(String(sent.sentMaterials)).toMatch(/^Query letter /);
    const detailsBefore = (await getDocs(fsQuery(collection(db, "users", uid, "activities"), where("queryId", "==", qid)))).docs.map((d) => d.data().details).join("|");

    /* the package is renamed and its letter version renamed, on the packages page's own documents */
    await updateDoc(pkgRef, { packageName: "Renamed by the snapshot lock" });
    if (qlRef) await updateDoc(qlRef, { versionName: "Renamed version" });

    const after = (await getDoc(doc(db, "users", uid, "queries", qid))).data()!;
    expect(after.sentMaterials, "sentMaterials followed the live package").toBe(sent.sentMaterials);
    expect(after.sentVersions).toEqual(sent.sentVersions);
    const detailsAfter = (await getDocs(fsQuery(collection(db, "users", uid, "activities"), where("queryId", "==", qid)))).docs.map((d) => d.data().details).join("|");
    expect(detailsAfter, "the send's history followed the live package").toBe(detailsBefore);
    expect(detailsAfter).not.toContain("Renamed");
  } catch (e) { failure = e; } finally {
    await updateDoc(pkgRef, { packageName: pkgBefore.packageName });
    if (qlRef && qlBefore) await updateDoc(qlRef, { versionName: qlBefore.versionName });
    await page.locator("[data-qad-undo]").click();
    await expect(page.locator('[data-qad-toast="done"]')).toBeVisible({ timeout: 20_000 });
  }
  if (failure) throw failure;
});

test("H12 — a manuscript with no packages offers no package cards, and the query can still be logged as Custom", async ({ page }) => {
  test.setTimeout(180_000);
  await ensureSignedIn(page);
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await liftMotionSuppression(page);
  const agent = await freeAgentFor(MS_EMPTY);
  await openDrawer(page, { mode: "log", agentId: agent.id, manuscriptId: MS_EMPTY });
  await page.locator("[data-qad-primary]").click();
  await page.locator("[data-qad-primary]").click(); // → What you sent
  await expect(page.locator("[data-qad-pkg]")).toHaveCount(0);
  await toReview(page);
  await expect(page.locator("[data-qad-primary]")).toBeEnabled();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Discard" }).click();
});
