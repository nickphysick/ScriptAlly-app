/* Remove the query the failed §5 save stranded (today, agent Imogen Rackham, status Queried),
   with its activity docs and global-feed twins — the same cascade shape undoCreate leans on. */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDocs, collection, deleteDoc, query, where } from "firebase/firestore";

const env = (f) => Object.fromEntries(readFileSync(f, "utf8").split("\n").map(l=>l.trim()).filter(l=>l&&!l.startsWith("#")).map(l=>{const i=l.indexOf("=");return [l.slice(0,i),l.slice(i+1).replace(/^["']|["']$/g,"")];}));
const dev = env(".env.development"); const local = existsSync(".env.local") ? env(".env.local") : {};
if (dev.VITE_FIREBASE_PROJECT_ID !== "scriptally-dev") throw new Error("dev only");
const app = initializeApp({ apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN, projectId: dev.VITE_FIREBASE_PROJECT_ID });
const auth = getAuth(app);
const { user } = await signInWithEmailAndPassword(auth, process.env.SA_E2E_EMAIL ?? "harness@scriptally.test", process.env.SA_E2E_PASSWORD ?? local.SA_E2E_PASSWORD);
const db = getFirestore(app);
const uid = user.uid;

const qs = await getDocs(collection(db, "users", uid, "queries"));
const today = new Date().toISOString().slice(0, 10);
let removed = 0;
for (const d of qs.docs) {
  const v = d.data();
  if (v.status !== "Queried") continue;
  if (!(v.dateSent ?? "").startsWith(today)) continue;
  /* the stranded one: created by the run, id q-<random> (never a seed- or cor- id) */
  if (!d.id.startsWith("q-")) continue;
  console.log("removing stranded query", d.id, v.agentId, v.dateSent);
  const acts = await getDocs(collection(db, "users", uid, "queries", d.id, "activity"));
  for (const a of acts.docs) {
    await deleteDoc(a.ref);
    await deleteDoc(doc(db, "users", uid, "activities", a.id)).catch(() => {});
  }
  const feed = await getDocs(query(collection(db, "users", uid, "activities"), where("queryId", "==", d.id)));
  for (const a of feed.docs) await deleteDoc(a.ref);
  await deleteDoc(d.ref);
  removed++;
}
console.log("removed:", removed);
process.exit(0);
