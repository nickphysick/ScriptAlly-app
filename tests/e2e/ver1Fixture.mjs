/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Versions v1 — READS the ms21-filled book straight from Firestore, so the VER1 locks compare the page with facts
 * the page did not compute. Writes nothing.  npx tsx tests/e2e/ver1Fixture.mjs <--ms | --facts>
 *   --ms     the manuscript document, keys sorted (Undo's byte-for-byte comparison)
 *   --facts  the live-query count from raw statuses; the active version's name (activePackageId → that live package's
 *            bookVersionId → the version); and the live queries reaching no version, through packageReplies' edge
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, doc, getDoc, getDocs } from "firebase/firestore";
import { creditedSlot } from "../../src/lib/packageReplies.ts";
import { FILLED_EMAIL, MS_ID } from "./ms21Fixture.mjs";

const env = (f) => Object.fromEntries(readFileSync(f, "utf8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }));
const dev = env(".env.development"); const local = existsSync(".env.local") ? env(".env.local") : {};
if (dev.VITE_FIREBASE_PROJECT_ID !== "scriptally-dev") throw new Error("Refusing: not dev.");
const app = initializeApp({ apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN, projectId: dev.VITE_FIREBASE_PROJECT_ID, appId: dev.VITE_FIREBASE_APP_ID });
const dbId = dev.VITE_FIREBASE_DATABASE_ID;
const db = !dbId || dbId === "(default)" ? getFirestore(app) : getFirestore(app, dbId);
const { user } = await signInWithEmailAndPassword(getAuth(app), FILLED_EMAIL, process.env.SA_E2E_PASSWORD ?? local.SA_E2E_PASSWORD);
const sortKeys = (o) => Array.isArray(o) ? o.map(sortKeys) : o && typeof o === "object" ? Object.fromEntries(Object.keys(o).sort().map((k) => [k, sortKeys(o[k])])) : o;
const ms = (await getDoc(doc(db, "users", user.uid, "manuscripts", MS_ID))).data();
if (process.argv[2] === "--ms") { console.log(JSON.stringify(sortKeys(ms))); process.exit(0); }
const pkgs = (await getDocs(collection(db, "users", user.uid, "packages"))).docs.map((d) => ({ id: d.id, ...d.data() })).filter((p) => p.manuscriptId === MS_ID);
const qs = (await getDocs(collection(db, "users", user.uid, "queries"))).docs.map((d) => ({ id: d.id, ...d.data() })).filter((q) => q.manuscriptId === MS_ID);
const CLOSED = new Set(["Rejected", "Withdrawn", "No Response", "Signed"]);
const live = qs.filter((q) => !CLOSED.has(q.status));
const act = pkgs.find((p) => p.id === ms.activePackageId && p.status !== "Retired");
const activeName = (ms.bookVersions ?? []).find((v) => v.id === act?.bookVersionId)?.name ?? null;
const unversioned = live.filter((q) => !(creditedSlot(q, "version", pkgs)?.id)).length;
console.log(JSON.stringify({ live: live.length, activeName, unversioned, activePackageId: ms.activePackageId ?? null }));
process.exit(0);
