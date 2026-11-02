/**
 * Emulator smoke: a script built the standard way (targetEnv → initializeApp → getFirestore) reaches
 * the EMULATOR, signs in as the seeded harness user, reads its own data, and is DENIED someone
 * else's — i.e. firestore.rules are enforced on the emulator's (default) database.
 *   node scripts/emu.mjs is not needed: run inside `firebase emulators:exec … "node tests/emulator-seed/smoke.mjs"`.
 */
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs, doc, getDoc } from "firebase/firestore";
import { targetEnv, harnessPassword, EMULATOR_PROJECT } from "../e2e/fsTarget.mjs";

const dev = targetEnv();
if (dev.VITE_FIREBASE_PROJECT_ID !== EMULATOR_PROJECT) throw new Error("smoke runs against the emulator only");
const app = initializeApp({ apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN, projectId: dev.VITE_FIREBASE_PROJECT_ID, appId: dev.VITE_FIREBASE_APP_ID });
const { user } = await signInWithEmailAndPassword(getAuth(app), "harness@scriptally.test", harnessPassword());
const db = getFirestore(app);
const own = (await getDocs(collection(db, "users", user.uid, "queries"))).size;
let denied = false;
try { await getDoc(doc(db, "users", "someone-else")); } catch (e) { denied = /permission/i.test(String(e)); }
console.log(JSON.stringify({ host: db._settings?.host, ownQueries: own, otherUserDenied: denied }));
process.exit(own > 0 && denied ? 0 : 1);
