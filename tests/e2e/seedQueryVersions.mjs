/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ SEED — the three states Part E has to get right ═══════════════════════════════════════════
 *
 * ⚠️ THE AWKWARD STATES ARE SEEDED DELIBERATELY, NOT WAITED FOR. Two faults in two days passed every
 * check and were found only in a state the fixtures did not contain. The three that matter here:
 *
 *   MATCH      sent the version they read
 *   DIFFERS    sent something else — deliberate, and the app must state it without a verdict
 *   UNRECORDED sent before the feature existed, which is EVERY existing query in the world
 *
 *   node tests/e2e/seedQueryVersions.mjs        # write them
 *   node tests/e2e/seedQueryVersions.mjs rm     # take them away
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, updateDoc, deleteDoc, deleteField, initializeFirestore, getDoc } from "firebase/firestore";

const env = (f) => Object.fromEntries(readFileSync(f, "utf8").split("\n").map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }));
const dev = env(".env.development"), local = existsSync(".env.local") ? env(".env.local") : {};
if (dev.VITE_FIREBASE_PROJECT_ID !== "scriptally-dev") throw new Error("dev only");
const app = initializeApp({ apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: dev.VITE_FIREBASE_PROJECT_ID, storageBucket: dev.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: dev.VITE_FIREBASE_MESSAGING_SENDER_ID, appId: dev.VITE_FIREBASE_APP_ID });
const db = dev.VITE_FIREBASE_DATABASE_ID ? initializeFirestore(app, {}, dev.VITE_FIREBASE_DATABASE_ID) : getFirestore(app);
const { user } = await signInWithEmailAndPassword(getAuth(app),
  process.env.SA_E2E_EMAIL ?? "harness@scriptally.test", process.env.SA_E2E_PASSWORD ?? local.SA_E2E_PASSWORD);
const uid = user.uid;
const RM = process.argv[2] === "rm";

/* seed-pkg-1 holds seed-mat-pag, which seedBookVersions points at bv-prologue.
   So every query attached to seed-pkg-1 READS Prologue-first. */
const CASES = [
  { q: "seed-query-8",  sent: "bv-prologue", label: "MATCH — sent what they read" },
  { q: "seed-query-10", sent: "bv-world",    label: "DIFFERS — sent another opening, deliberately" },
  { q: "seed-query-12", sent: undefined,     label: "UNRECORDED — a send from before the feature" },
];

for (const c of CASES) {
  const qref = doc(db, "users", uid, "queries", c.q);
  if (!(await getDoc(qref)).exists()) { console.log(`  ${c.q} missing — run seed.mjs first`); continue; }
  const actId = `seed-act-pe-${c.q}`;
  const aref = doc(db, "users", uid, "activities", actId);
  if (RM) { await deleteDoc(aref).catch(() => {}); await updateDoc(qref, { packageId: "" }).catch(() => {}); continue; }
  /* every case reads Prologue-first, because every case rides seed-pkg-1 */
  await updateDoc(qref, { packageId: "seed-pkg-1" });
  await setDoc(aref, {
    id: actId, userId: uid, queryId: c.q, manuscriptId: "seed-ms-1",
    activityType: "Materials Sent", description: "Full manuscript sent",
    date: "2026-08-14T09:00:00.000Z", details: "", resultingStatus: "Full Sent",
    ...(c.sent ? { bookVersionId: c.sent } : {}),
  });
  if (!c.sent) await updateDoc(aref, { bookVersionId: deleteField() }).catch(() => {});
  console.log(`  ${c.q}  ${c.label}`);
}
console.log(RM ? "removed" : "seeded — all three read Prologue-first via seed-pkg-1");
process.exit(0);
