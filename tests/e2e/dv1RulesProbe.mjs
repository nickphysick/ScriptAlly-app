/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Discover v1 — probe the DEPLOYED dev rules for the four new stores, as the harness writer, undoing every write.
 * `agentSubmissions` is create-only for a client and cannot be removed by one, so it is probed ONLY on paths that
 * must be denied (an extra key; another writer's id) — a real create would leave a document behind.
 * Waits `--wait <s>` first (rules take seconds to propagate; an impatient probe reports a false denial).
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, deleteDoc, updateDoc, deleteField, getDoc } from "firebase/firestore";

const env = (f) => Object.fromEntries(readFileSync(f, "utf8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }));
const dev = env(".env.development");
const local = existsSync(".env.local") ? env(".env.local") : {};
if (dev.VITE_FIREBASE_PROJECT_ID !== "scriptally-dev") throw new Error("dev only");
const wi = process.argv.indexOf("--wait");
if (wi > 0) await new Promise((r) => setTimeout(r, Number(process.argv[wi + 1]) * 1000));
const app = initializeApp({ apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN, projectId: dev.VITE_FIREBASE_PROJECT_ID, appId: dev.VITE_FIREBASE_APP_ID });
const db = getFirestore(app);
const { user } = await signInWithEmailAndPassword(getAuth(app), process.env.SA_E2E_EMAIL ?? "harness@scriptally.test", process.env.SA_E2E_PASSWORD ?? local.SA_E2E_PASSWORD);
const uid = user.uid;
let ok = 0, bad = 0;
const expect = async (label, want, fn, undo) => {
  let got;
  try { await fn(); got = "ACCEPTED"; if (undo) { try { await undo(); } catch {} } } catch (e) { got = /permission|insufficient/i.test(e.message || "") ? "DENIED" : "ERROR " + e.message.slice(0, 60); }
  const pass = got === want; pass ? ok++ : bad++;
  console.log(`${pass ? "✅" : "❌"} ${label.padEnd(52)} want ${want} · got ${got}`);
};
const before = (await getDoc(doc(db, "users", uid))).data()?.discoverPrefs;
await expect("scoutDecisions: an add", "ACCEPTED", () => setDoc(doc(db, "users", uid, "scoutDecisions", "dv1-probe"), { decision: "added", at: new Date().toISOString(), manuscriptId: "seed-ms-1" }), () => deleteDoc(doc(db, "users", uid, "scoutDecisions", "dv1-probe")));
await expect("scoutDecisions: an extra key", "DENIED", () => setDoc(doc(db, "users", uid, "scoutDecisions", "dv1-probe"), { decision: "added", at: "x", manuscriptId: "m", note: 1 }));
await expect("scoutShares: the echo", "ACCEPTED", () => setDoc(doc(db, "users", uid, "scoutShares", "dv1-probe"), { at: new Date().toISOString() }), () => deleteDoc(doc(db, "users", uid, "scoutShares", "dv1-probe")));
await expect("discoverPrefs.lens leaf", "ACCEPTED", () => updateDoc(doc(db, "users", uid), { "discoverPrefs.lens": "fast" }),
  () => updateDoc(doc(db, "users", uid), before === undefined ? { discoverPrefs: deleteField() } : { discoverPrefs: before }));
await expect("agentSubmissions: a private field", "DENIED", () => setDoc(doc(db, "agentSubmissions", `${uid}_dv1-probe`), { userId: uid, sourceAgentId: "dv1-probe", createdAt: "x", name: "N", notes: "private" }));
await expect("agentSubmissions: another writer's id", "DENIED", () => setDoc(doc(db, "agentSubmissions", `someone_dv1-probe`), { userId: "someone", sourceAgentId: "dv1-probe", createdAt: "x", name: "N" }));
const after = (await getDoc(doc(db, "users", uid))).data()?.discoverPrefs;
console.log(`discoverPrefs restored: ${JSON.stringify(before) === JSON.stringify(after)} (${JSON.stringify(after)})`);
console.log(`${ok} as expected, ${bad} not`);
process.exit(bad ? 1 : 0);
