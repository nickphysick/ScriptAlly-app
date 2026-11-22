/**
 * Versions v1 Step 0 — READ-ONLY: per manuscript on the dev harness accounts, how many live queries resolve to no
 * book version (edition-true, packageReplies.creditedSlot), how many resolve to one, and how many packages state one.
 * Also `unrecordedVersion`'s package-only figure, for comparison. Writes nothing.  npx tsx tests/e2e/ver1Scan.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { creditedSlot } from "../../src/lib/packageReplies.ts";
import { sentRecordOf } from "../../src/lib/queryActions/sentRecord.ts";
import { unrecordedVersion, bookVersionsOf } from "../../src/lib/bookVersions.ts";

const env = (f) => Object.fromEntries(readFileSync(f, "utf8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }));
const dev = env(".env.development"); const local = existsSync(".env.local") ? env(".env.local") : {};
if (dev.VITE_FIREBASE_PROJECT_ID !== "scriptally-dev") throw new Error("not dev");
const CLOSED = new Set(["Rejected", "Withdrawn", "No Response", "Signed"]);
for (const email of ["harness@scriptally.test", "ms21-filled@scriptally.test", "dv1@scriptally.test"]) {
  const app = initializeApp({ apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN, projectId: dev.VITE_FIREBASE_PROJECT_ID, appId: dev.VITE_FIREBASE_APP_ID }, email);
  const dbId = dev.VITE_FIREBASE_DATABASE_ID; const db = !dbId || dbId === "(default)" ? getFirestore(app) : getFirestore(app, dbId);
  const { user } = await signInWithEmailAndPassword(getAuth(app), email, local.SA_E2E_PASSWORD);
  const get = async (c) => (await getDocs(collection(db, "users", user.uid, c))).docs.map((d) => ({ id: d.id, ...d.data() }));
  const [mss, pkgs, qs] = [await get("manuscripts"), await get("packages"), await get("queries")];
  for (const ms of mss) {
    const myP = pkgs.filter((p) => p.manuscriptId === ms.id); const myQ = qs.filter((q) => q.manuscriptId === ms.id);
    const live = myQ.filter((q) => !CLOSED.has(q.status));
    const ver = (q) => creditedSlot(q, "version", myP)?.id ?? null;
    const how = {}; for (const q of myQ) { const h = sentRecordOf(q).how; how[h] = (how[h] ?? 0) + 1; }
    console.log(JSON.stringify({ email, ms: ms.id, versions: bookVersionsOf(ms).length, activePackageId: ms.activePackageId ?? null,
      queries: myQ.length, live: live.length, liveNoVersion: live.filter((q) => !ver(q)).length, liveWithVersion: live.filter((q) => ver(q)).length,
      pkgsWithVersion: myP.filter((p) => p.bookVersionId).length, pkgs: myP.length, how,
      unrecordedVersion_sent: unrecordedVersion(myP, myQ, () => false).sent }));
  }
}
process.exit(0);
