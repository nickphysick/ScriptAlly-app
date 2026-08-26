/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ FIXTURES FOR PART E PHASE 4 — built BEFORE the feature ════════════════════════════════════
 *
 * ⚠️ THIS IS THE RUN'S INSURANCE, NOT ITS OVERHEAD. Every fault in this feature so far — the D17
 * denominator, the unsent scorecard, the chip on the wrong builder — passed a check and was found by
 * meeting a state the fixtures did not contain. So the states that hurt are seeded first, and the
 * feature is written against them.
 *
 * `seedQueryVersions.mjs` already covers three (match · differs · send-unrecorded) on `seed-ms-1`,
 * which carries THREE versions. This adds the two it cannot:
 *
 *   NOTHING KNOWN      a query whose package sample carries no version and whose send carries none
 *                      — so both derived lines and the list column have nothing to say
 *   ONE-VERSION BOOK   a second manuscript with exactly ONE version, and queries on it. The gate's
 *                      closed side, and the only way to prove the census at scope All is not
 *                      silently omitting another manuscript's queries.
 *
 *   node tests/e2e/seedPartE4.mjs        # write
 *   node tests/e2e/seedPartE4.mjs rm     # remove
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
const ref = (...p) => doc(db, "users", uid, ...p);
const gone = async (r) => { await deleteDoc(r).catch(() => {}); };

/* ── (1) NOTHING KNOWN — a package whose sample carries no version ───────────────────────────── */
const NOPKG = "seed-pkg-noversion";
const NOSAMPLE = "seed-mat-pag-noversion";
if (RM) {
  await gone(ref("packages", NOPKG));
  await gone(ref("versions", NOSAMPLE));
  await updateDoc(ref("queries", "seed-query-14"), { packageId: "" }).catch(() => {});
  await gone(ref("activities", "seed-act-pe4-nothing"));
} else {
  await setDoc(ref("versions", NOSAMPLE), {
    id: NOSAMPLE, manuscriptId: "seed-ms-1", userId: uid, componentType: "Sample Pages",
    versionName: "Unattributed pages", fileAttached: false,
    createdDate: "2026-04-01T00:00:00.000Z", contentType: "text",
  });
  await setDoc(ref("packages", NOPKG), {
    id: NOPKG, userId: uid, manuscriptId: "seed-ms-1", packageName: "Unattributed set",
    queryLetterVersionId: "seed-mat-ql1", synopsisVersionId: "", samplePagesVersionId: NOSAMPLE,
    status: "Active", createdDate: new Date(0).toISOString(),
  });
  /* a send with NO version, on a package whose sample has NO version: nothing is known either way */
  await updateDoc(ref("queries", "seed-query-14"), { packageId: NOPKG }).catch(() => {});
  await setDoc(ref("activities", "seed-act-pe4-nothing"), {
    id: "seed-act-pe4-nothing", userId: uid, queryId: "seed-query-14", manuscriptId: "seed-ms-1",
    activityType: "Materials Sent", description: "Full manuscript sent",
    date: "2026-08-20T09:00:00.000Z", details: "", resultingStatus: "Full Sent",
  });
}

/* ── (2) A ONE-VERSION BOOK, on its own manuscript ───────────────────────────────────────────── */
const MS2 = "seed-ms-2";
if (RM) {
  for (const q of ["seed-query-ms2-a", "seed-query-ms2-b"]) await gone(ref("queries", q));
  await gone(ref("manuscripts", MS2));
} else {
  await setDoc(ref("manuscripts", MS2), {
    id: MS2, userId: uid,
    title: "The Quiet Second",
    genre: "Literary Fiction", ageCategory: "Adult",
    wordCount: 74000,
    logline: "One opening, and no reason to name it.",
    status: "Querying", statusChangedDate: "2026-05-01T00:00:00.000Z", comps: [], shelved: false,
    /* ⚠️ EXACTLY ONE. The gate is >= 2, so this manuscript must see no chip, no column, no filter
       and no field — and its queries must still be swept by a census at scope All. */
    bookVersions: [{ id: "bv-solo", name: "The only one", kind: "initial", createdDate: "2026-05-01" }],
  });
  const agents = ["seed-agent-1", "seed-agent-2"];
  let i = 0;
  for (const [q, status] of [["seed-query-ms2-a", "Queried"], ["seed-query-ms2-b", "Full Sent"]]) {
    await setDoc(ref("queries", q), {
      id: q, userId: uid, agentId: agents[i++ % agents.length], manuscriptId: MS2,
      dateSent: "2026-06-01T00:00:00.000Z", status, sendMethod: "Email",
      personalisationNotes: "", packageId: "",
    });
  }
}

console.log(RM ? "removed" : [
  "seeded:",
  "  seed-query-14        NOTHING KNOWN — package sample has no version, send has no version",
  "  seed-ms-2            ONE-VERSION BOOK — 'The Quiet Second', 1 version, 2 queries",
  "  (seed-ms-1 keeps its three versions and the match/differs/unrecorded trio)",
].join("\n"));
process.exit(0);
