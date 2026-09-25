/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * cleanupProbeAgent — removes the §11.9 after-add probe from the dev harness account, in the
 * same run that created it (the house law: a measurement that writes must restore, and a run
 * that cannot restore must fail loudly). It deletes every agent whose NAME is exactly the probe
 * name, and the AGENT_ADDED activity `addAgent` wrote for each — the doc alone would leave a
 * feed line naming an agent that no longer exists.
 *
 * DEV ONLY, like the seeder beside it. Prints what it deleted; the calling test asserts on it.
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { collection, deleteDoc, doc, getDocs, getFirestore, query, where } from "firebase/firestore";

export const PROBE_NAME = "Zz Probe Agent";

const env = (p) => Object.fromEntries(readFileSync(p, "utf8").split("\n").filter((l) => l.includes("="))
  .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }));
const dev = env(new URL("../../.env.development", import.meta.url).pathname);
const localPath = new URL("../../.env.local", import.meta.url).pathname;
const local = existsSync(localPath) ? env(localPath) : {};
if (dev.VITE_FIREBASE_PROJECT_ID !== "scriptally-dev") throw new Error("dev only");

const EMAIL = process.env.SA_E2E_EMAIL ?? "harness@scriptally.test";
const PASSWORD = process.env.SA_E2E_PASSWORD ?? local.SA_E2E_PASSWORD;
if (!PASSWORD) throw new Error("No SA_E2E_PASSWORD in .env.local");

const app = initializeApp({
  apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: dev.VITE_FIREBASE_PROJECT_ID, appId: dev.VITE_FIREBASE_APP_ID,
});
const db = getFirestore(app);
const { user } = await signInWithEmailAndPassword(getAuth(app), EMAIL, PASSWORD);

const agentsQ = query(collection(db, "users", user.uid, "agents"), where("name", "==", PROBE_NAME));
const agents = await getDocs(agentsQ);
let deletedAgents = 0;
for (const d of agents.docs) { await deleteDoc(d.ref); deletedAgents += 1; }

/* the AGENT_ADDED lines the create wrote — matched by the description addAgent builds, so a
   probe run leaves NOTHING in the feed. Filtered locally: the field is prose, not a key. */
const acts = await getDocs(collection(db, "users", user.uid, "activities"));
let deletedActs = 0;
for (const d of acts.docs) {
  const a = d.data();
  if (a.activityType === "Agent Added" && typeof a.description === "string" && a.description.includes(PROBE_NAME)) {
    await deleteDoc(doc(db, "users", user.uid, "activities", d.id));
    deletedActs += 1;
  }
}

console.log(`cleanupProbeAgent: deleted ${deletedAgents} agent(s), ${deletedActs} activity line(s)`);
process.exit(0);
