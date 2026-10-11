import { test, expect } from "@playwright/test";
import { openMatcher, runMatcher, readRun, snapshot, cleanup } from "./matcherDrive";
import { devDb } from "./devWrite";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { resolve } from "node:path";
test.setTimeout(420_000);
const SHOT = (n: string) => resolve(process.cwd(), `reports/import-package/${n}.png`);

test("AFTER — a real CSV import lands unattached", async ({ page }) => {
  page.setDefaultTimeout(25_000);
  const { db, uid } = await devDb();
  const before = (await getDocs(collection(db, "users", uid, "queries"))).docs.map((d) => d.id);

  /* Re-pointed (onboarding v5 part 3): the matcher is behind the Import page's "Match columns" tile and
     its labels changed. The rule is unchanged: a query imported from a CSV lands with no package. */
  const snap = await snapshot(db, uid);
  /* ⚠️ THE CLEAN-UP IS IN `finally`. A failed assertion used to skip it and leave the run's rows on
     the shared account (ten such rows from 20 Sep are still there). */
  try {
  await openMatcher(page, "Queries");
  await runMatcher(page, `Manuscript Title,Agent Name,State,Date Sent
The Smoke Test,Dangling Probe Agent,Queried,2026-08-01`);
  await page.screenshot({ path: SHOT("flow-3-done") });
  const run = await readRun(page);
  console.log(`import log: ${JSON.stringify(run.log)}`);
  expect(run.log.some((l) => l.startsWith('Added query: "The Smoke Test" to Dangling Probe Agent')), "the run says the query was added").toBe(true);

  /* ── what did it actually store? ─────────────────────────────────────────────────────── */
  const after = await getDocs(collection(db, "users", uid, "queries"));
  const fresh = after.docs.filter((d) => !before.includes(d.id));
  console.log(`new queries: ${fresh.length}`);
  expect(fresh.length, "the import created no query").toBeGreaterThan(0);
  for (const d of fresh) {
    const q = d.data() as { packageId?: string; materialsWanted?: unknown[]; manuscriptId?: string };
    console.log(`  ${d.id}: packageId=${JSON.stringify(q.packageId)} · materialsWanted=${JSON.stringify(q.materialsWanted ?? null)} · ms=${q.manuscriptId}`);
    expect(q.packageId, "the import still writes a package id").toBe("");
  }

  /* RETIRED HALF: this test went on to click through `.qc-wpg .f12-row` and count attachment blocks.
     That is the three-column pane, unreachable since the Query Centre became a list (see
     tests/e2e/RED-BACKLOG.md); the selector matches nothing, so the half was red before this pack and
     is not a claim about the matcher. The store assertions above are the rule this file holds. */
  } finally {
    const removed = await cleanup(db, uid, snap);
    expect((await snapshot(db, uid)).queries.length, "the account's queries are as they were").toBe(snap.queries.length);
    console.log(`cleaned up ${removed} documents`);
  }
});
