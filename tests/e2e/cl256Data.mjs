/**
 * Contact list v25.6's independent figures for the CL256 H2 lock: read (never write) the harness account's manuscripts,
 * agents (their raw genres) and queries (agent, manuscript, status, last change), and print them as JSON. The lock
 * counts "want {genre}s" and "passed" from these, so it does not share a derivation with the page. The password is
 * never printed.
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, getDocs, collection } from "firebase/firestore";

const env = (file) => Object.fromEntries(readFileSync(file, "utf8").split("\n").map((l) => /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(l)).filter(Boolean).map((m) => [m[1], m[2].replace(/^["']|["']$/g, "")]));
const dev = env(".env.development");
const local = existsSync(".env.local") ? env(".env.local") : {};
const PASSWORD = process.env.SA_E2E_PASSWORD || local.SA_E2E_PASSWORD;
if (!PASSWORD) throw new Error("No SA_E2E_PASSWORD");
if (dev.VITE_FIREBASE_PROJECT_ID !== "scriptally-dev") throw new Error("refusing: not the dev project");
const app = initializeApp({ apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN, projectId: dev.VITE_FIREBASE_PROJECT_ID, appId: dev.VITE_FIREBASE_APP_ID }, "cl256-data");
const { user } = await signInWithEmailAndPassword(getAuth(app), process.env.SA_E2E_EMAIL || local.SA_E2E_EMAIL || "harness@scriptally.test", PASSWORD);
const dbId = dev.VITE_FIREBASE_DATABASE_ID && dev.VITE_FIREBASE_DATABASE_ID !== "(default)" ? dev.VITE_FIREBASE_DATABASE_ID : undefined;
const db = dbId ? getFirestore(app, dbId) : getFirestore(app);
const ms = (v) => (v == null ? null : typeof v === "string" ? Date.parse(v) : typeof v.toMillis === "function" ? v.toMillis() : typeof v.seconds === "number" ? v.seconds * 1000 : null);
const manuscripts = (await getDocs(collection(db, "users", user.uid, "manuscripts"))).docs.map((d) => { const m = d.data(); return { id: d.id, title: m.title, genre: m.genre ?? null, sub: m.subGenres ?? [], created: ms(m.createdDate) }; });
const agents = (await getDocs(collection(db, "users", user.uid, "agents"))).docs.map((d) => ({ id: d.id, genres: d.data().genres ?? [] }));
const queries = (await getDocs(collection(db, "users", user.uid, "queries"))).docs.map((d) => { const q = d.data(); return { agentId: q.agentId, manuscriptId: q.manuscriptId, status: q.status, last: ms(q.lastStatusChange) ?? ms(q.dateSent) }; });
console.log(JSON.stringify({ manuscripts, agents, queries }));
process.exit(0);
