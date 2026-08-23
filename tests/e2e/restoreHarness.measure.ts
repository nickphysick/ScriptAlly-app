/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ RESTORE THE HARNESS ACCOUNT TO ITS SEED STATE ═════════════════════════════════════════════
 *
 * Two measurement runs attached submission packages to real queries on the dev harness account —
 * the first because there was no packaged send to measure otherwise, and it could not put it back,
 * which is the F-O defect this pack exists to fix. This sweeps every snapshot mark those runs left.
 *
 * ⚠️ THE NODE SDK, NEVER `page.evaluate`. The served page is a BUNDLE: bare specifiers were resolved
 * at build time, so `import("firebase/firestore")` inside the page throws "Failed to resolve module
 * specifier". That is loud when the import is the point and SILENT when it is a cleanup wrapped in
 * a `.catch`, and the next run's baseline is quietly this run's damage. `devWrite.ts` says the same
 * thing in its own header; this is the case it was written for.
 *
 * ⚠️ IT SWEEPS BY MARK, NOT BY A LIST OF QUERY IDS. A hand-written list of "the ones I touched" is
 * the literal-argument fault: it goes stale the moment a run touches a different query, and it
 * cannot know about a run that failed half way. `fromPackageId` is the mark the attach path writes
 * and the only thing that distinguishes an attached item, so it is what the sweep keys off.
 *
 * ⚠️ AND THE SEED WRITES NO `materialsWanted` AT ALL — checked in `seedPackages.mjs`, whose query
 * batch sets `packageId` and nothing else, and in `seed.mjs`. So every snapshot mark on this account
 * is measurement residue and removing all of them IS the restore.
 *
 * ⚠️ THAT CLAIM IS FROM THE SEED'S SOURCE, NOT FROM A DRIVE. An earlier note here justified it with
 * "the previous pack reported `packaged strips: 0`" — which was a reading of ROW 0 ONLY, generalised
 * to all forty-four. It happened to be true; it was not evidence. If the seed ever starts writing
 * marked materials this sweep becomes destructive, so re-read the seed rather than this sentence.
 */
import { test, expect } from "@playwright/test";
import { devDb } from "./devWrite";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";

/**
 * ⚠️ THE SEEDED LINK, FROM `seedPackages.mjs`'s OWN `SENDS` TABLE. Six sends on `seed-pkg-1`, two on
 * `seed-pkg-2`, and the seed writes NO `materialsWanted` at all — a seeded packaged query is linked
 * by `packageId` and nothing else.
 *
 * ⚠️ THIS IS THE HALF THE MARK-SWEEP CANNOT SEE, AND F-P IS EXACTLY WHY. `attachPackage` writes
 * `packageId: ""` as the snapshot lands, so attaching a snapshot to an already-LINKED query silently
 * drops it out of that package's tracking. Removing the marks afterwards restores the materials and
 * NOT the link — so a sweep that only strips marks reports a clean account while a package is still
 * short a send. Measured: the dashboard read 8 sends before this pack and 7 afterwards.
 */
const SEEDED_LINK: Record<string, string> = {
  "seed-pkgq-1": "seed-pkg-1", "seed-pkgq-2": "seed-pkg-1", "seed-pkgq-3": "seed-pkg-1",
  "seed-pkgq-4": "seed-pkg-1", "seed-pkgq-5": "seed-pkg-1", "seed-pkgq-6": "seed-pkg-1",
  "seed-pkgq-7": "seed-pkg-2", "seed-pkgq-8": "seed-pkg-2",
};

test.setTimeout(180_000);

interface Marked { material?: string; fromPackageId?: string; fromPackageName?: string }

test("harness — strip every snapshot mark this pack's measurements left", async () => {
  const { db, uid } = await devDb();
  const snap = await getDocs(collection(db, "users", uid, "queries"));

  // ⚠️ PRECONDITION: we actually read the account. An empty read sweeps nothing and reports success.
  expect(snap.size, "no queries read — the sweep would report a clean account having seen none")
    .toBeGreaterThan(0);
  console.log(`queries on the account: ${snap.size}`);

  const dirty: { id: string; agentId: string; before: number; after: number; packages: string[] }[] = [];

  for (const d of snap.docs) {
    const data = d.data() as { materialsWanted?: (string | Marked)[]; agentId?: string; packageId?: string };
    const list = data.materialsWanted ?? [];
    const marked = list.filter((m) => typeof m !== "string" && !!(m as Marked).fromPackageId) as Marked[];
    if (!marked.length) continue;
    const next = list.filter((m) => typeof m === "string" || !(m as Marked).fromPackageId);
    dirty.push({
      id: d.id,
      agentId: data.agentId ?? "?",
      before: list.length,
      after: next.length,
      packages: [...new Set(marked.map((m) => m.fromPackageName ?? m.fromPackageId ?? "?"))],
    });
    await updateDoc(doc(db, "users", uid, "queries", d.id), { materialsWanted: next });
  }

  if (!dirty.length) { console.log("nothing to restore — no snapshot marks on the account"); }
  for (const q of dirty) {
    console.log(`  ${q.id} (agent ${q.agentId}): ${q.before} → ${q.after} materials, dropped ${q.packages.join(", ")}`);
  }

  /* ── the link half ─────────────────────────────────────────────────────────────────────── */
  const relinked: string[] = [];
  for (const d of snap.docs) {
    const want = SEEDED_LINK[d.id];
    if (!want) continue;
    const got = (d.data() as { packageId?: string }).packageId;
    if (got === want) continue;
    console.log(`  ${d.id}: packageId ${JSON.stringify(got)} → ${JSON.stringify(want)}`);
    await updateDoc(doc(db, "users", uid, "queries", d.id), { packageId: want });
    relinked.push(d.id);
  }
  if (!relinked.length) console.log("every seeded packaged query still carries its link");

  /**
   * ⚠️ RE-READ RATHER THAN TRUST THE WRITE. The whole reason this file exists is a cleanup that was
   * believed and never ran; a restore that reports success from its own intent repeats the fault
   * one layer up.
   */
  const after = await getDocs(collection(db, "users", uid, "queries"));
  const left = after.docs.filter((d) => {
    const list = ((d.data() as { materialsWanted?: (string | Marked)[] }).materialsWanted ?? []);
    return list.some((m) => typeof m !== "string" && !!(m as Marked).fromPackageId);
  });
  const unlinked = after.docs.filter((d) => {
    const want = SEEDED_LINK[d.id];
    return want && (d.data() as { packageId?: string }).packageId !== want;
  });
  console.log(`re-read: ${after.size} queries · ${left.length} still marked · ${unlinked.length} still unlinked`);
  expect(left.map((d) => d.id), "snapshot marks survived the restore").toEqual([]);
  expect(unlinked.map((d) => d.id), "a seeded packaged query is still missing its link").toEqual([]);
});
