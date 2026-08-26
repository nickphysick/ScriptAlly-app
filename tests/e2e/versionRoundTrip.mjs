/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ D3 — THE ROUND TRIP, AGAINST THE LIVE DEV DATABASE ════════════════════════════════════════
 *
 * record a version → correct it to a different one → correct it to none, reading back each time.
 *
 * ⚠️ IT WRITES THE WAY `editActivity` WRITES, and reads back with a FRESH GET each time — the point
 * is what the store holds, not what a cached object says. A round trip proved against an in-memory
 * value proves the assignment, never the persistence.
 *
 * ⚠️ AND IT USES A THROWAWAY ACTIVITY. Correcting a seeded one would leave the fixture altered for
 * whatever ran next; this creates its own subject and removes it.
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, updateDoc, deleteDoc, deleteField, getDoc, initializeFirestore } from "firebase/firestore";

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

const QID = "seed-query-8";
const AID = "probe-roundtrip-act";
const feed = doc(db, "users", uid, "activities", AID);
const sub = doc(db, "users", uid, "queries", QID, "activity", AID);

/** A fresh read of BOTH stores — the authoritative log and the global projection. */
const readBack = async (label) => {
  const [f, s] = await Promise.all([getDoc(feed), getDoc(sub)]);
  const fv = f.exists() ? f.data().bookVersionId ?? null : "(no doc)";
  const sv = s.exists() ? s.data().bookVersionId ?? null : "(no doc)";
  const agree = String(fv) === String(sv);
  console.log(`  ${label.padEnd(34)} feed=${String(fv).padEnd(14)} log=${String(sv).padEnd(14)} ${agree ? "✅ agree" : "❌ DISAGREE"}`);
  return { fv, sv, agree };
};

/* ── 1 · record a version ─────────────────────────────────────────────────────────────────── */
await setDoc(feed, {
  id: AID, userId: uid, queryId: QID, manuscriptId: "seed-ms-1",
  activityType: "Materials Sent", description: "Round-trip probe", date: "2026-08-22T09:00:00.000Z",
  details: "", resultingStatus: "Full Sent", bookVersionId: "bv-prologue",
});
await setDoc(sub, { type: "Full Sent", resultingStatus: "Full Sent", note: "Round-trip probe",
  createdAt: "2026-08-22T09:00:00.000Z", bookVersionId: "bv-prologue" });
const r1 = await readBack("1 · recorded bv-prologue");

/* ── 2 · correct it to a different one ────────────────────────────────────────────────────── */
await updateDoc(feed, { bookVersionId: "bv-world" });
await updateDoc(sub, { bookVersionId: "bv-world" });
const r2 = await readBack("2 · corrected to bv-world");

/* ── 3 · correct it to none ───────────────────────────────────────────────────────────────── */
await updateDoc(feed, { bookVersionId: deleteField() });
await updateDoc(sub, { bookVersionId: deleteField() });
const r3 = await readBack("3 · cleared");

await deleteDoc(feed).catch(() => {});
await deleteDoc(sub).catch(() => {});
console.log(`  probe removed: ${(await getDoc(feed)).exists() ? "NO" : "yes"}`);

const ok = r1.fv === "bv-prologue" && r2.fv === "bv-world" && r3.fv === null
  && r1.agree && r2.agree && r3.agree;
console.log(ok ? "\n  ✅ ROUND TRIP COMPLETE — set, changed, cleared; both stores agree at every step"
               : "\n  ❌ ROUND TRIP FAILED");
process.exit(ok ? 0 : 1);
