/**
 * Manuscripts v28 Step 0 — READ-ONLY: what the harness accounts store for genre, subGenres, ageCategory, setting and
 * series on manuscripts, and which agent genres name an age category. Signs in to each dev harness account (one app
 * instance each) and reads only that account's own documents. Writes nothing.
 *
 *   node tests/e2e/ms28Scan.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { canonicalIdOf } from "../../src/lib/genres.ts";

const env = (f) => Object.fromEntries(readFileSync(f, "utf8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }));
const dev = env(".env.development"); const local = existsSync(".env.local") ? env(".env.local") : {};
if (dev.VITE_FIREBASE_PROJECT_ID !== "scriptally-dev") throw new Error("not dev");
const ACCOUNTS = ["harness@scriptally.test", "dv1@scriptally.test", "ms21-filled@scriptally.test", "ms21-empty@scriptally.test", "ms21-delete@scriptally.test"];
const AGE_WORDS = /^(adult|young adult|ya|middle grade|mg|new adult|na|picture book|early reader|young fiction|young-adult|middle-grade|picture-book|new-adult|childrens|children's)$/i;
const tally = (m, k) => m.set(k, (m.get(k) ?? 0) + 1);
const ages = new Map(), agentAges = new Map(), labels = [], setting = [], series = new Map();
for (const [i, email] of ACCOUNTS.entries()) {
  const app = initializeApp({ apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN, projectId: dev.VITE_FIREBASE_PROJECT_ID, appId: dev.VITE_FIREBASE_APP_ID }, `a${i}`);
  const dbId = dev.VITE_FIREBASE_DATABASE_ID;
  const db = !dbId || dbId === "(default)" ? getFirestore(app) : getFirestore(app, dbId);
  let user;
  try { ({ user } = await signInWithEmailAndPassword(getAuth(app), email, local.SA_E2E_PASSWORD)); } catch (e) { console.log(`${email}: sign-in failed (${e.code})`); continue; }
  const ms = await getDocs(collection(db, "users", user.uid, "manuscripts"));
  const ag = await getDocs(collection(db, "users", user.uid, "agents"));
  console.log(`${email}: ${ms.size} manuscripts, ${ag.size} agents`);
  for (const d of ms.docs) {
    const m = d.data();
    tally(ages, JSON.stringify(m.ageCategory ?? null));
    for (const g of [m.genre, ...(m.subGenres ?? [])].filter((x) => typeof x === "string" && x)) {
      if (canonicalIdOf(g) !== g && !g.startsWith("u:")) labels.push(`${email} ${d.id}: "${g}" → ${canonicalIdOf(g) ?? "no canonical id"}`);
    }
    if (typeof m.setting === "string" && m.setting.trim()) setting.push(`${email} ${d.id}: "${m.setting}"`);
    tally(series, JSON.stringify(m.series ?? null));
  }
  for (const d of ag.docs) for (const g of d.data().genres ?? []) if (AGE_WORDS.test(String(g).trim())) tally(agentAges, String(g));
}
console.log("\nmanuscript ageCategory:", Object.fromEntries(ages));
console.log("agent genres naming an age:", Object.fromEntries(agentAges));
console.log(`\nmanuscript genre values that are LABELS, not ids (${labels.length}):\n  ` + labels.join("\n  "));
console.log(`\nsetting stored (${setting.length}):\n  ` + setting.join("\n  "));
console.log("\nseries:", Object.fromEntries(series));
process.exit(0);
