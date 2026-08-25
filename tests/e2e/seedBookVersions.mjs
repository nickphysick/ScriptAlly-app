/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ SEED — book versions, at a chosen count ═══════════════════════════════════════════════════
 *
 * The versions feature is GATED ON A COUNT (nought, one, two or more), and the whole point of the
 * gate is that the first two states show nothing. So the seed takes the count as an argument rather
 * than writing one fixed world: measuring "absent at one, present at two" needs the same account in
 * both states, and a fixture that only ever seeds the populated one can only prove half of it.
 *
 *   node tests/e2e/seedBookVersions.mjs 0     # clears the field entirely
 *   node tests/e2e/seedBookVersions.mjs 1
 *   node tests/e2e/seedBookVersions.mjs 3     # the ref's own three
 *
 * ⚠️ IT ALSO WRITES THE REFERENCES, because the panel's counts are DERIVED and a version with
 * nothing pointing at it measures every count as nought — which would pass a check written against
 * the wrong thing. The sample material and two send activities are written with the versions, so
 * "2 samples · held by 2 agents" is a real derivation over real documents.
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, updateDoc, setDoc, deleteDoc, deleteField, initializeFirestore, getDoc } from "firebase/firestore";

const env = (file) => Object.fromEntries(
  readFileSync(file, "utf8").split("\n")
    .map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }),
);
const dev = env(".env.development");
const local = existsSync(".env.local") ? env(".env.local") : {};
const PROJECT = dev.VITE_FIREBASE_PROJECT_ID;
if (PROJECT !== "scriptally-dev") throw new Error(`Refusing to seed "${PROJECT}".`);
const PASSWORD = process.env.SA_E2E_PASSWORD ?? local.SA_E2E_PASSWORD;
if (!PASSWORD) throw new Error("No SA_E2E_PASSWORD in .env.local");

const app = initializeApp({
  apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN, projectId: PROJECT,
  storageBucket: dev.VITE_FIREBASE_STORAGE_BUCKET, messagingSenderId: dev.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: dev.VITE_FIREBASE_APP_ID,
});
const dbId = dev.VITE_FIREBASE_DATABASE_ID;
const db = dbId ? initializeFirestore(app, {}, dbId) : getFirestore(app);
const { user } = await signInWithEmailAndPassword(
  getAuth(app), process.env.SA_E2E_EMAIL ?? "harness@scriptally.test", PASSWORD);
const uid = user.uid;

const N = Number(process.argv[2] ?? 3);
const MS = doc(db, "users", uid, "manuscripts", "seed-ms-1");

/* ⚠️ THE THIRD IS THE R&R ONE, and it points at an activity this script also writes — a version
   linked to an event that does not exist renders no chip, so seeding the link without the event
   would quietly measure the fallback and call it the R&R case. */
const RR_ACT = "seed-act-rr";
const ALL = [
  { id: "bv-prologue", name: "Prologue-first", kind: "initial", createdDate: "2026-03-04",
    note: "Opens on the prologue — the storm, then chapter one." },
  { id: "bv-world", name: "Worldbuilding-first", kind: "reordering", createdDate: "2026-05-11",
    note: "Prologue cut; opens inside the settlement." },
  { id: "bv-postrr", name: "Post-R&R (T. Marsh)", kind: "revision", createdDate: "2026-07-02",
    fromActivityId: RR_ACT, note: "Tightened part two, new final chapter." },
];
const versions = ALL.slice(0, Math.max(0, Math.min(3, N)));

/* The R&R event the third version hangs off. Written first, so the link always resolves. */
if (versions.some((v) => v.fromActivityId)) {
  await setDoc(doc(db, "users", uid, "activities", RR_ACT), {
    id: RR_ACT, userId: uid, queryId: "seed-query-11", manuscriptId: "seed-ms-1",
    activityType: "Status Changed", description: "Revise & resubmit from the agent",
    date: "2026-06-28T09:00:00.000Z", details: "", resultingStatus: "Revise & Resubmit",
  });
} else {
  await deleteDoc(doc(db, "users", uid, "activities", RR_ACT)).catch(() => {});
}

await updateDoc(MS, versions.length ? { bookVersions: versions } : { bookVersions: deleteField() });
console.log(`bookVersions on seed-ms-1: ${versions.length} — ${versions.map((v) => v.name).join(" · ") || "(cleared)"}`);

/* ── the references the panel's counts derive from ────────────────────────────────────────────
   Two samples on the first version, one on the second; the seed's two holders (seed-query-8 is
   Partial Sent, seed-query-10 is Full Sent) hold the first and the second. */
const SAMPLES = [["seed-mat-pag", "bv-prologue"], ["seed-mat-pag2", "bv-prologue"], ["seed-mat-pag3", "bv-world"]];
/* ⚠️ CREATE AND UPDATE ARE DIFFERENT RULES AND THIS SCRIPT LEARNED IT THE HARD WAY. `setDoc` with
   `merge: true` on an EXISTING material is an UPDATE, and the versions update allowlist is a
   `hasOnly` — so re-sending `createdDate` with a different value denies the whole write, silently,
   about a field the seed had no business touching. Existing documents get the ONE field; missing
   ones get a full, valid create. */
for (const [id, bv] of SAMPLES) {
  const ref = doc(db, "users", uid, "versions", id);
  const present = versions.some((v) => v.id === bv);
  const exists = (await getDoc(ref)).exists();
  if (!exists) {
    await setDoc(ref, {
      id, manuscriptId: "seed-ms-1", userId: uid, componentType: "Sample Pages",
      versionName: id === "seed-mat-pag" ? "Chapters 1–3" : `Sample ${id.slice(-1)}`,
      fileAttached: false, createdDate: "2026-03-05T00:00:00.000Z", contentType: "text",
      ...(present ? { bookVersionId: bv } : {}),
    });
  } else {
    await updateDoc(ref, present ? { bookVersionId: bv } : { bookVersionId: deleteField() });
  }
}

const SENDS = [["seed-query-8", "bv-prologue", "Partial Sent", "2026-06-11"],
               ["seed-query-10", "bv-world", "Full Sent", "2026-06-19"]];
for (const [qid, bv, status, day] of SENDS) {
  const id = `seed-act-send-${qid}`;
  const present = versions.some((v) => v.id === bv);
  await setDoc(doc(db, "users", uid, "activities", id), {
    id, userId: uid, queryId: qid, manuscriptId: "seed-ms-1", activityType: "Materials Sent",
    description: `${status === "Full Sent" ? "Full manuscript" : "Partial"} sent`,
    date: `${day}T09:00:00.000Z`, details: "", resultingStatus: status,
    ...(present ? { bookVersionId: bv } : {}),
  });
  if (!present) await updateDoc(doc(db, "users", uid, "activities", id), { bookVersionId: deleteField() }).catch(() => {});
}
console.log(`samples: ${SAMPLES.length} · sends: ${SENDS.length} (references present for seeded versions only)`);
process.exit(0);
