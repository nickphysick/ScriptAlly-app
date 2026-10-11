import { test, expect } from "@playwright/test";
import { openMatcher, runMatcher, snapshot, cleanup } from "./matcherDrive";
import { devDb } from "./devWrite";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
test.setTimeout(420_000);

test("Ruling 1 — an imported agent carries no words the writer did not supply", async ({ page }) => {
  page.setDefaultTimeout(25_000);
  const { db, uid } = await devDb();
  const before = (await getDocs(collection(db, "users", uid, "agents"))).docs.map((d) => d.id);

  /* Re-pointed (onboarding v5 part 3): the matcher is behind the Import page's "Match columns" tile and
     its labels changed. The rule is unchanged: what does the app write into fields the CSV did not fill? */
  const snap = await snapshot(db, uid);
  /* ⚠️ THE CLEAN-UP IS IN `finally`. A failed assertion used to skip it and leave the run's rows on
     the shared account (ten such rows from 20 Sep are still there). */
  try {
  await openMatcher(page, "Agents");
  /* ⚠️ NAME ONLY — every other column absent, which is the whole question. */
  await runMatcher(page, `Name
Empty Fields Probe`);

  const fresh = (await getDocs(collection(db, "users", uid, "agents"))).docs.filter((d) => !before.includes(d.id));
  console.log(`agents created: ${fresh.length}`);
  expect(fresh.length).toBe(1);
  const a = fresh[0].data() as Record<string, unknown>;
  console.log(`AGENT: ${JSON.stringify({ name: a.name, agency: a.agency, email: a.email, notes: a.notes, mswlNotes: a.mswlNotes, responseTimeWeeks: a.responseTimeWeeks })}`);
  expect(a.name).toBe("Empty Fields Probe");
  expect(a.notes, "provenance was written into the writer's notes").toBe("");
  expect(a.agency, "an agency was invented").toBe("");
  expect(a.email, "an email address was invented").toBe("");
  expect(a.mswlNotes, "wish-list notes were invented").toBe("");
  /* Ruling 1 kept an 8-week reply window here. The import-truth pack reversed it: the sheet gave
     no window, rating, status, reply rule, materials or genre, so the agent holds none. */
  expect("responseTimeWeeks" in a, "a reply window was invented").toBe(false);
  expect("starRating" in a, "a rating was invented").toBe(false);
  expect("noResponseMeansNo" in a, "a reply rule was invented").toBe(false);
  expect(a.submissionStatus, "a status was invented").toBe("Unknown");
  expect(a.materialsWanted, "materials were invented").toEqual([]);
  expect(a.genres, "a genre was invented").toEqual([]);

  } finally {
    const removed = await cleanup(db, uid, snap);
    expect((await snapshot(db, uid)).agents.length, "the account's agents are as they were").toBe(snap.agents.length);
    console.log(`probe removed (${removed} documents)`);
  }
});
