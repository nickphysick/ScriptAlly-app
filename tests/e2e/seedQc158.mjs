/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query card v158 — the Notes tab's fixture (QC158-10 … 13). The harness holds no journal note and no recorded quote, so
 * the lock writes its own and removes them in the same run.
 * ⚠️ Emulator only (fsTarget), and SELF-CLEANING: every note's id carries the `q158-` prefix; every quote written onto an
 *    activity starts "q158 ·" and `--clean` removes exactly those fields.
 *
 *   node tests/e2e/seedQc158.mjs --notes <queryId> <n>   # n journal notes on the query, a day apart, oldest first
 *   node tests/e2e/seedQc158.mjs --quotes <queryId>      # a recorded quote on each of the agent's responses
 *   node tests/e2e/seedQc158.mjs --clean                 # remove both
 *   node tests/e2e/seedQc158.mjs --count                 # q158 notes, and tasks whose text starts "q158"
 *   node tests/e2e/seedQc158.mjs --deciding <queryId>    # v158.1: tellLater on the offer's step, so the card is "deciding"
 *   node tests/e2e/seedQc158.mjs --undeciding <queryId>  # remove it again (the harness has none)
 */
import { targetEnv, TARGET_PROJECT } from "./fsTarget.mjs";
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDocs, deleteDoc, deleteField, collection, setDoc, updateDoc } from "firebase/firestore";
const env = (f) => Object.fromEntries(readFileSync(f, "utf8").split("\n").map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#"))
  .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }));
const dev = targetEnv();
const local = existsSync(".env.local") ? env(".env.local") : {};
if (dev.VITE_FIREBASE_PROJECT_ID !== TARGET_PROJECT) throw new Error("emulator only");
const EMAIL = process.env.SA_E2E_EMAIL ?? "harness@scriptally.test";
const PASSWORD = process.env.SA_E2E_PASSWORD ?? local.SA_E2E_PASSWORD;
if (!PASSWORD) throw new Error("No SA_E2E_PASSWORD in .env.local");
const app = initializeApp({ apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN, projectId: dev.VITE_FIREBASE_PROJECT_ID, appId: dev.VITE_FIREBASE_APP_ID });
const db = getFirestore(app);
const { user } = await signInWithEmailAndPassword(getAuth(app), EMAIL, PASSWORD);
const uid = user.uid;
const DAY = 86_400_000;
const RESPONSES = new Set(["Partial Requested", "Full Requested", "Revise & Resubmit", "Rejected", "Offer"]);
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv.slice(i + 1) : null; };

if (process.argv.includes("--clean")) {
  let gone = 0;
  for (const d of (await getDocs(collection(db, "users", uid, "journalEntries"))).docs) if (d.id.startsWith("q158-")) { await deleteDoc(d.ref); gone++; }
  for (const q of (await getDocs(collection(db, "users", uid, "queries"))).docs) {
    for (const a of (await getDocs(collection(db, "users", uid, "queries", q.id, "activity"))).docs) {
      if (String(a.data().replyNote ?? "").startsWith("q158 ·")) { await updateDoc(a.ref, { replyNote: deleteField() }); gone++; }
    }
  }
  for (const t of (await getDocs(collection(db, "users", uid, "tasks"))).docs) if (String(t.data().text ?? "").startsWith("q158")) { await deleteDoc(t.ref); gone++; }
  console.log(`q158: removed ${gone}`);
  process.exit(0);
}
if (process.argv.includes("--count")) {
  const notes = (await getDocs(collection(db, "users", uid, "journalEntries"))).docs.filter((d) => d.id.startsWith("q158-") || String(d.data().entryText ?? "").startsWith("q158"));
  const tasks = (await getDocs(collection(db, "users", uid, "tasks"))).docs.filter((t) => String(t.data().text ?? "").startsWith("q158"));
  console.log(JSON.stringify({ notes: notes.map((d) => ({ id: d.id, text: d.data().entryText, pinned: !!d.data().pinned })), tasks: tasks.map((t) => ({ text: t.data().text, dueDate: t.data().dueDate ?? null })) }));
  process.exit(0);
}
const dc = arg("--deciding") ?? arg("--undeciding");
if (dc) {
  const on = process.argv.includes("--deciding");
  let k = 0;
  for (const a of (await getDocs(collection(db, "users", uid, "queries", dc[0], "activity"))).docs) {
    if (String(a.data().resultingStatus ?? "") !== "Offer") continue;
    await updateDoc(a.ref, { tellLater: on ? true : deleteField() }); k++;
  }
  /* two other live queries still to be told of this offer (lib/qcCardView toTell): the deciding footer's "Tell them" */
  for (const other of ["seed-query-9", "seed-query-20"]) {
    await updateDoc(doc(db, "users", uid, "queries", other), on ? { offerRefQueryId: dc[0], offerTold: false } : { offerRefQueryId: deleteField(), offerTold: deleteField() }).catch((e) => console.log(`skip ${other}: ${e.code ?? e}`));
  }
  console.log(`q158: ${on ? "deciding" : "undeciding"} on ${k} offer step(s) of ${dc[0]}`);
  process.exit(0);
}
const n = arg("--notes");
if (n) {
  const [qid, count] = [n[0], Number(n[1] ?? 3)];
  for (let i = 0; i < count; i++) {
    const id = `q158-n${String(i).padStart(2, "0")}`;
    await setDoc(doc(db, "users", uid, "journalEntries", id), { id, userId: uid, queryId: qid, entryText: `q158 note ${i + 1}: why this agent, and what to try next.`, createdAt: new Date(Date.now() - (count - i) * DAY).toISOString() });
  }
  console.log(`q158: ${count} notes on ${qid}`);
  process.exit(0);
}
const qa = arg("--quotes");
if (qa) {
  let k = 0;
  for (const a of (await getDocs(collection(db, "users", uid, "queries", qa[0], "activity"))).docs) {
    if (!RESPONSES.has(String(a.data().resultingStatus ?? ""))) continue;
    await updateDoc(a.ref, { replyNote: `q158 · thank you for sending this (${++k})` });
  }
  console.log(`q158: ${k} quotes on ${qa[0]}`);
  process.exit(0);
}
console.log("nothing asked");
