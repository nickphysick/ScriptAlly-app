/**
 * §2 · ATTACHING A SUBMISSION PACKAGE, MEASURED.
 *
 * ⚠️ THE SNAPSHOT CLAIM IS THE ONE THAT MATTERS, and it cannot be seen on a page: "editing the
 * package afterwards leaves this send unchanged" is a statement about two documents over time. So
 * the package is edited THROUGH FIRESTORE between two reads of the query, and the assertion is on
 * the query's own materials — not on what the pills happen to render.
 *
 *   npx playwright test --project=measure qcPackageAttach
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
import { harnessDb, snapshotQuery, stable } from "./harnessDocs";
import { doc, getDoc, updateDoc } from "firebase/firestore";

const PKG_QUERY = "seed-pkgq-1";

const materials = async (queryId: string): Promise<any[]> => {
  const snap = await snapshotQuery(queryId);
  return ((snap.query as any).materialsWanted ?? []) as any[];
};

const openQuery = async (page: any, id: string) => {
  await openRoute(page, `/queries?q=${id}`, { width: 1440, height: 900 });
  await page.waitForTimeout(2200);
};

const openAttachMenu = async (page: any) => {
  const add = page.locator(".qc-mchip-add");
  expect(await add.count(), "no Attach chip on this query").toBeGreaterThan(0);
  await add.first().click();
  await page.waitForTimeout(500);
};

test("§2 · a package's items land as ordinary pills, and overlaps are declared first", async ({ page }) => {
  test.setTimeout(240000);
  /* start from a known state: no package-sourced materials on this query */
  const { db, uid } = await harnessDb();
  const before = await materials(PKG_QUERY);
  const cleaned = before.filter((m: any) => typeof m === "string" || !m.fromPackageId);
  if (cleaned.length !== before.length) {
    await updateDoc(doc(db, "users", uid, "queries", PKG_QUERY), { materialsWanted: cleaned });
    await page.waitForTimeout(800);
  }
  console.log(`  materials before: ${JSON.stringify(cleaned)}`);

  await openQuery(page, PKG_QUERY);
  await openAttachMenu(page);

  const row = page.locator("[role=menuitem]", { hasText: /Attach a submission package/i });
  expect(await row.count(), "no package row in the Attach menu").toBeGreaterThan(0);
  /* ⚠️ §3 — the row sells nothing */
  const label = (await row.first().textContent()) || "";
  console.log(`  the menu row reads: "${label.trim()}"`);
  expect(label, "the row carries upsell wording").not.toMatch(/pro\b|upgrade|unlock/i);
  await row.first().click();
  await page.waitForTimeout(700);

  const picker = page.locator(".qc-pkgpick");
  expect(await picker.count(), "the picker did not open").toBe(1);
  const rows = await page.evaluate(() =>
    Array.from(document.querySelectorAll(".qc-pkgrow")).map((r) => ({
      name: (r.querySelector(".qc-pkgname")?.textContent || "").trim(),
      count: (r.querySelector(".qc-pkgcount")?.textContent || "").trim(),
      items: Array.from(r.querySelectorAll(".qc-pkgitem")).map((i) => (i.textContent || "").trim()),
      clashes: Array.from(r.querySelectorAll(".qc-pkgclash")).map((c) => (c.textContent || "").trim()),
    })));
  console.log(`  the picker lists: ${JSON.stringify(rows, null, 0)}`);
  expect(rows.length, "no packages offered").toBeGreaterThan(0);
  expect(rows[0].items.length, "a package listed no contents").toBeGreaterThan(0);
  /* ⚠️ NO INVENTED SIZE — packages store none */
  for (const r of rows) for (const i of r.items) expect(i, "the picker printed a size the data cannot hold").not.toMatch(/first \d|\d+ (pages|chapters|words)/i);
  expect(await page.locator(".qc-pkgmanage").count(), "no Manage packages… at the foot").toBe(1);

  /* the overlap declaration — this query already carries materials of its own */
  const declared = rows.flatMap((r) => r.clashes);
  console.log(`  overlaps declared: ${declared.length ? declared.join(" | ") : "(none — no clash on this fixture)"}`);
  if (declared.length) expect(declared[0]).toMatch(/already attached/i);

  await page.locator(".qc-pkgrow").first().click();
  await page.waitForTimeout(3000);

  const after = await materials(PKG_QUERY);
  console.log(`  materials after: ${JSON.stringify(after)}`);
  const brought = after.filter((m: any) => typeof m !== "string" && m.fromPackageId);
  expect(brought.length, "the package's items did not land").toBe(rows[0].items.length);
  /* ⚠️ ORDINARY MATERIALS — nothing sets the package LINK, or the send would have two answers */
  const q = await getDoc(doc(db, "users", uid, "queries", PKG_QUERY));
  /**
   * ⚠️ THE LINK MUST BE EMPTY AFTER A SNAPSHOT LANDS — and this fixture starts WITH one, which is
   * why the assertion is worth making here rather than on a clean query. `materialsLinkWrites`
   * states the invariant: a query carries the package link OR its own materials, never both. The
   * first version of the attach wrote only the materials and left the stale link sitting beside
   * them, giving one send two answers to "what did you send".
   */
  console.log(`  packageId after attach: "${(q.data() as any).packageId ?? ""}" (must be empty — a snapshot replaces a link, never sits beside it)`);
  expect((q.data() as any).packageId || "", "the snapshot landed beside a live package LINK").toBe("");

  /* the pills render, and the tag beneath them states provenance */
  const pills = await page.evaluate(() => Array.from(document.querySelectorAll(".qc-mchip")).map((c) => (c.textContent || "").trim()));
  console.log(`  pills: ${pills.join(" · ")}`);
  const tag = (await page.locator(".qc-pkgtag").first().textContent()) || "";
  console.log(`  the origin tag reads: "${tag.replace(/\s+/g, " ").trim()}"`);
  expect(tag, "no origin tag under the pills").toMatch(/items? from/i);
});

test("§2 · editing the package afterwards leaves the send unchanged", async ({ page }) => {
  test.setTimeout(240000);
  const { db, uid } = await harnessDb();
  const before = await materials(PKG_QUERY);
  const brought = before.filter((m: any) => typeof m !== "string" && m.fromPackageId);
  expect(brought.length, "run the attach test first — nothing package-sourced on this query").toBeGreaterThan(0);
  const pkgId = brought[0].fromPackageId;
  const pkgRef = doc(db, "users", uid, "packages", pkgId);
  const pkgBefore = (await getDoc(pkgRef)).data() as any;
  console.log(`  the package "${pkgBefore.packageName}" holds ql=${pkgBefore.queryLetterVersionId} syn=${pkgBefore.synopsisVersionId} smp=${pkgBefore.samplePagesVersionId}`);

  /**
   * ⚠️ THE EDIT IS REAL: rename it AND empty a slot. If the send were a reference, the second of
   * those would take an item off it — which is precisely the failure a snapshot exists to prevent.
   */
  await updateDoc(pkgRef, { packageName: `${pkgBefore.packageName} (revised)`, synopsisVersionId: "" });
  await page.waitForTimeout(2500);

  const after = await materials(PKG_QUERY);
  console.log(`  the send's materials after the package changed: ${JSON.stringify(after)}`);
  expect(stable(after), "EDITING THE PACKAGE CHANGED A SEND — the attach is behaving as a reference").toBe(stable(before));

  /* ⚠️ AND THE TAG STILL READS THE OLD NAME, because the receipt records what it was at the time */
  await openQuery(page, PKG_QUERY);
  const tag = (await page.locator(".qc-pkgtag").first().textContent()) || "";
  console.log(`  the tag still reads: "${tag.replace(/\s+/g, " ").trim()}"`);
  expect(tag, "the tag followed the package's rename — the receipt is not a snapshot").not.toMatch(/revised/i);

  await updateDoc(pkgRef, { packageName: pkgBefore.packageName, synopsisVersionId: pkgBefore.synopsisVersionId });
});

test("§2 · the tag's undo removes exactly what the package brought", async ({ page }) => {
  test.setTimeout(240000);
  const { db, uid } = await harnessDb();
  const before = await materials(PKG_QUERY);
  const brought = before.filter((m: any) => typeof m !== "string" && m.fromPackageId);
  expect(brought.length, "nothing package-sourced — run the attach test first").toBeGreaterThan(0);

  /**
   * ⚠️ A HAND-ADDED ITEM OF THE SAME KIND IS PLANTED FIRST. That is the whole test: a name-based
   * removal cannot tell it from the package's copy and would take both.
   */
  const own = { material: brought[0].material };
  await updateDoc(doc(db, "users", uid, "queries", PKG_QUERY), { materialsWanted: [...before, own] });
  await page.waitForTimeout(1200);
  console.log(`  planted a hand-added "${own.material}" beside the package's copy`);

  await openQuery(page, PKG_QUERY);
  const undo = page.locator(".qc-pkgtag button");
  expect(await undo.count(), "no undo on the origin tag").toBeGreaterThan(0);
  await undo.first().click();
  await page.waitForTimeout(3000);

  const after = await materials(PKG_QUERY);
  console.log(`  after undo: ${JSON.stringify(after)}`);
  expect(after.some((m: any) => typeof m !== "string" && m.fromPackageId), "package items survived the undo").toBe(false);
  expect(after.some((m: any) => typeof m !== "string" && !m.fromPackageId && m.material === own.material),
    "THE UNDO TOOK A HAND-ADDED ITEM — it is matching on name, not on provenance").toBe(true);
  expect(await page.locator(".qc-pkgtag").count(), "the tag survived its own items").toBe(0);
});
