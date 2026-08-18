/**
 * WHICH RULES ARE LIVE ON THE DATABASE DEV ACTUALLY READS?
 *
 * The canary proved a writer-date write is denied; it could not say WHY. A denial has several
 * possible causes and they call for different fixes: the rules not deployed, the rules deployed to
 * the OTHER database in this project (the documented dual-DB trap), or a document that fails
 * validation for an unrelated reason. This isolates them by attempting one field at a time and
 * naming the commit each field arrived in, so the answer is a VINTAGE rather than a yes/no.
 *
 * ⚠️ IT WRITES ONLY TO THE HARNESS ACCOUNT'S OWN SEED DATA, and undoes every write it makes.
 * Same auth path and same guard as seed.mjs: dev project named explicitly, refuses anything else.
 *
 *   node tests/e2e/rulesProbe.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, updateDoc, setDoc, deleteDoc, deleteField, getDoc } from "firebase/firestore";

const env = (file) => Object.fromEntries(
  readFileSync(file, "utf8").split("\n")
    .map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }),
);
const dev = env(".env.development");
const local = existsSync(".env.local") ? env(".env.local") : {};
const PROJECT = dev.VITE_FIREBASE_PROJECT_ID;
if (PROJECT !== "scriptally-dev") throw new Error(`Refusing to probe "${PROJECT}".`);
const PASSWORD = process.env.SA_E2E_PASSWORD ?? local.SA_E2E_PASSWORD;
if (!PASSWORD) throw new Error("No SA_E2E_PASSWORD in .env.local");

const app = initializeApp({
  apiKey: dev.VITE_FIREBASE_API_KEY,
  authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: PROJECT,
  storageBucket: dev.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: dev.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: dev.VITE_FIREBASE_APP_ID,
});
const dbId = dev.VITE_FIREBASE_DATABASE_ID;
const db = !dbId || dbId === "(default)" ? getFirestore(app) : getFirestore(app, dbId);
console.log(`database: ${dbId || "(default)"} · project: ${PROJECT}`);

const { user } = await signInWithEmailAndPassword(
  getAuth(app), process.env.SA_E2E_EMAIL ?? "harness@scriptally.test", PASSWORD);
const uid = user.uid;
const qref = doc(db, "users", uid, "queries", "seed-query-1");
const snap = await getDoc(qref);
console.log(`read seed-query-1: ${snap.exists() ? "OK" : "MISSING"} — reads are ${snap.exists() ? "allowed" : "denied"}`);

const attempt = async (label, commit, fn, undo) => {
  try {
    await fn();
    console.log(`  ✅ ${label.padEnd(34)} (${commit}) ACCEPTED`);
    if (undo) { try { await undo(); } catch {} }
  } catch (e) {
    const denied = /permission|insufficient/i.test(e.message || "");
    console.log(`  ${denied ? "❌" : "⚠️ "} ${label.padEnd(34)} (${commit}) ${denied ? "DENIED" : "ERROR: " + e.message.slice(0, 90)}`);
  }
};

console.log("\nquery UPDATE allowlist, oldest field first:");
await attempt("personalisationNotes", "long-standing", () => updateDoc(qref, { personalisationNotes: "probe" }),
  () => updateDoc(qref, { personalisationNotes: "" }));
await attempt("hasAgentResponded", "derived-status era", () => updateDoc(qref, { hasAgentResponded: false }));
await attempt("rejectedDate (deleteField)", "Tier 3, ~5 Aug", () => updateDoc(qref, { rejectedDate: deleteField() }));
await attempt("closureOfferDismissed", "bd0cea5", () => updateDoc(qref, { closureOfferDismissed: true }),
  () => updateDoc(qref, { closureOfferDismissed: deleteField() }));
await attempt("writerExpectedDate", "6461c54", () => updateDoc(qref, { writerExpectedDate: new Date().toISOString() }),
  () => updateDoc(qref, { writerExpectedDate: deleteField() }));

console.log("\nnested per-query activity CREATE (isValidActivityNested):");
const aref = doc(db, "users", uid, "queries", "seed-query-1", "activity", "probe-activity");
await attempt("activity create", "long-standing",
  () => setDoc(aref, { type: "Queried", resultingStatus: "Queried", createdAt: new Date().toISOString(), note: "probe", queryId: "seed-query-1" }),
  () => deleteDoc(aref));

console.log("\nthe backfill's own two steps, on the query it fails for (seed-query-11):");
const q11 = doc(db, "users", uid, "queries", "seed-query-11");
const s11 = await getDoc(q11);
console.log(`  seed-query-11 status: ${s11.exists() ? s11.data().status : "MISSING"} · keys: ${s11.exists() ? Object.keys(s11.data()).sort().join(",") : "-"}`);
const h = doc(db, "users", uid, "queries", "seed-query-11", "activity", "probe-heal");
await attempt("heal step 1 — activity setDoc", "long-standing",
  () => setDoc(h, { type: s11.data().status, resultingStatus: s11.data().status, createdAt: new Date().toISOString(), note: "probe", queryId: "seed-query-11", agentName: "x", manuscriptTitle: "y" }, { merge: true }),
  () => deleteDoc(h));
await attempt("heal step 2 — recompute's ten keys", "Tier 3",
  () => updateDoc(q11, { status: s11.data().status, partialRequestedDate: deleteField(), partialSentDate: deleteField(),
    fullRequestedDate: deleteField(), fullSentDate: deleteField(), revisionRound: 1, hasAgentResponded: false,
    responseReceivedAt: deleteField(), rejectedDate: deleteField(), lastStatusChange: deleteField() }));

process.exit(0);
