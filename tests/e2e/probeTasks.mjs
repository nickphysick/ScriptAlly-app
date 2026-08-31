/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Remove the tasks a measurement created, from the harness account.
 *
 * ⚠️ THIS EXISTS BECAUSE A MEASUREMENT THAT WRITES MUST PUT THE ACCOUNT BACK, AND ONE OF THEM WAS
 * NOT. `completionUndo` creates a real task, completes it, and presses Undo — which restores the
 * QUERY and leaves the TASK. Four had accumulated by the time anyone looked, and they were not
 * inert: they render on the calendar as real rows, in the row order, with real deeds. A dev board
 * that fills with `Undo probe 1787873161410` is a board nobody can read, and every run made it
 * worse.
 *
 * ⚠️ IT MATCHES ON A PREFIX AND REFUSES ANYTHING ELSE. A cleanup that took a filter would
 * eventually be handed a wider one; this can only ever delete a title beginning `Undo probe `,
 * so the worst case is that it deletes nothing.
 *
 * Usage:
 *   node tests/e2e/probeTasks.mjs            report what is there, delete nothing
 *   node tests/e2e/probeTasks.mjs --delete   remove them, naming each
 * or, from a spec:  await removeProbeTasks()      // in a finally
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs, deleteDoc, doc } from "firebase/firestore";

const PREFIX = "Undo probe ";

/** how many task documents the last call looked at — so an empty result can be told apart from an unread collection */
export let lastScanned = 0;

const env = (file) => Object.fromEntries(
  readFileSync(file, "utf8").split("\n")
    .map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }),
);

/**
 * @param {{ dryRun?: boolean, title?: string }} [opts]
 *   `title` narrows to one exact title; without it, every task carrying the prefix.
 * @returns {Promise<string[]>} the titles removed (or, dry, the titles found)
 */
export async function removeProbeTasks(opts = {}) {
  const dev = env(".env.development");
  const local = existsSync(".env.local") ? env(".env.local") : {};
  const PROJECT = dev.VITE_FIREBASE_PROJECT_ID;
  /* ⚠️ THE SAME REFUSAL THE SEEDER MAKES. A deletion pointed at prod by a stray env is not a thing
     to find out about afterwards. */
  if (PROJECT !== "scriptally-dev") {
    throw new Error(`Refusing to touch "${PROJECT}" — this script is for scriptally-dev only.`);
  }
  const EMAIL = process.env.SA_E2E_EMAIL ?? "harness@scriptally.test";
  const PASSWORD = process.env.SA_E2E_PASSWORD ?? local.SA_E2E_PASSWORD;
  if (!PASSWORD) throw new Error("No SA_E2E_PASSWORD in .env.local");

  const app = initializeApp({
    apiKey: dev.VITE_FIREBASE_API_KEY,
    authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: PROJECT,
    storageBucket: dev.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: dev.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: dev.VITE_FIREBASE_APP_ID,
  }, `probe-${Date.now()}`);
  const db = getFirestore(app);
  const { user } = await signInWithEmailAndPassword(getAuth(app), EMAIL, PASSWORD);

  const snap = await getDocs(collection(db, "users", user.uid, "tasks"));
  /**
   * ⚠️ THE FIELD IS `text`, AND GUESSING `title` COST A CONFIDENT ZERO.
   *
   * The first version of this read `title`, found nothing, and reported "0 probe tasks" about an
   * account holding five. Nothing errored: a wrong field name and an empty result are the same
   * shape. Both are read now, and the caller is told how many documents were SCANNED as well as
   * how many matched — so "the collection is empty", "I read the wrong field" and "there is
   * genuinely nothing left" stop being one number.
   */
  const hits = [];
  for (const d of snap.docs) {
    const x = d.data();
    const t = String(x.text ?? x.title ?? "");
    if (!t.startsWith(PREFIX)) continue;
    if (opts.title && t !== opts.title) continue;
    hits.push({ id: d.id, title: t });
  }
  lastScanned = snap.size;
  if (!opts.dryRun) {
    for (const h of hits) await deleteDoc(doc(db, "users", user.uid, "tasks", h.id));
  }
  return hits.map((h) => h.title);
}

/* run directly — `--delete` to act, otherwise report */
if (process.argv[1] && process.argv[1].endsWith("probeTasks.mjs")) {
  const del = process.argv.includes("--delete");
  const found = await removeProbeTasks({ dryRun: !del });
  console.log(`${del ? "removed" : "found"} ${found.length} probe task(s) of ${lastScanned} task(s) scanned`);
  for (const t of found) console.log(`  ${t}`);
  process.exit(0);
}
