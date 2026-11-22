/**
 * DASHBOARD v105 — read, set or clear the harness account's `users/{uid}.foundingSeenTier` on DEV (the C1 lock writes it
 * through the card, and must put the account back in the same run).
 *
 *   node tests/e2e/foundingSeen.mjs get          → prints the stored value, or "absent"
 *   node tests/e2e/foundingSeen.mjs set <0–5>
 *   node tests/e2e/foundingSeen.mjs clear        → removes the field (absent is the account's original state)
 *
 * Signs in as the harness user with the client SDK, so it goes through the same rules the card does. Dev only.
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc, updateDoc, deleteField } from "firebase/firestore";

const env = (f) => Object.fromEntries(readFileSync(f, "utf8").split("\n").map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#"))
  .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }));
const dev = env(".env.development");
const local = existsSync(".env.local") ? env(".env.local") : {};
if (dev.VITE_FIREBASE_PROJECT_ID !== "scriptally-dev") throw new Error("dev only");
const EMAIL = process.env.SA_E2E_EMAIL ?? "harness@scriptally.test";
const PASSWORD = process.env.SA_E2E_PASSWORD ?? local.SA_E2E_PASSWORD;
if (!PASSWORD) throw new Error("No SA_E2E_PASSWORD in .env.local");

const app = initializeApp({ apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN, projectId: dev.VITE_FIREBASE_PROJECT_ID, appId: dev.VITE_FIREBASE_APP_ID });
const db = getFirestore(app);
const { user } = await signInWithEmailAndPassword(getAuth(app), EMAIL, PASSWORD);
const ref = doc(db, "users", user.uid);
const [cmd, arg] = process.argv.slice(2);
if (cmd === "set") await updateDoc(ref, { foundingSeenTier: Number(arg) });
else if (cmd === "clear") await updateDoc(ref, { foundingSeenTier: deleteField() });
else if (cmd !== "get") throw new Error("get | set <n> | clear");
const v = (await getDoc(ref)).get("foundingSeenTier");
console.log(v === undefined ? "absent" : String(v));
process.exit(0);
