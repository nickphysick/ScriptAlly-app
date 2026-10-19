/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v140 C3 — the pinned band's figures, recomputed from the account itself (dev only): every query on the
 * harness account, placed by the app's own `lib/responses` `placeOf` (run through tsx). Prints one JSON line:
 *   { total, more, passed, heard }   heard = round((more + passed) / total × 100)
 * Overdue is checked on the page against the "Past their reply date" switch (the same set by definition).
 */
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs } from "firebase/firestore";
const env = (f) => Object.fromEntries(readFileSync(f, "utf8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }));
const dev = env(".env.development"); const local = existsSync(".env.local") ? env(".env.local") : {};
if (dev.VITE_FIREBASE_PROJECT_ID !== "scriptally-dev") throw new Error("dev only");
const app = initializeApp({ apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN, projectId: dev.VITE_FIREBASE_PROJECT_ID, appId: dev.VITE_FIREBASE_APP_ID });
const db = getFirestore(app);
const { user } = await signInWithEmailAndPassword(getAuth(app), process.env.SA_E2E_EMAIL ?? "harness@scriptally.test", local.SA_E2E_PASSWORD);
const qs = (await getDocs(collection(db, "users", user.uid, "queries"))).docs.map((d) => d.data().status);
/* the app's own placement, not a copy of it */
const placed = JSON.parse(execFileSync("npx", ["tsx", "-e", `import { placeOf } from "./src/lib/responses"; const s = JSON.parse(process.argv[1]); console.log(JSON.stringify(s.map((x) => placeOf(x)?.group ?? null)));`, JSON.stringify(qs)], { encoding: "utf8" }).trim().split("\n").pop());
const more = placed.filter((g) => g === "more").length;
const passed = placed.filter((g) => g === "passed").length;
const total = qs.length;
console.log(JSON.stringify({ total, more, passed, heard: total ? Math.round(((more + passed) / total) * 100) : 0 }));
process.exit(0);
