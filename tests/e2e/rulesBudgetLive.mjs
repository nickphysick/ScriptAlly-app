/**
 * RULES BUDGET v1 — DOES REAL DEV FIRESTORE ALLOW AN UPDATE TO A FULL QUERY?
 *
 * The emulator denies an update once ~17 optional fields are present ("maximum of 1000 expressions").
 * Nobody had tried the same write against a real database. This does, on ONE test query it creates
 * under the harness account and deletes before it exits (a `finally`, so a denial still cleans up).
 *
 * Every optional field is taken from `isValidQuery` in the firestore.rules beside it — the same
 * generator as tests/rules/queryExprCount.test.ts — so the "full" document is the rule's own list.
 *
 *   ALLOW_LIVE_FIRESTORE=1 node tests/e2e/rulesBudgetLive.mjs <label>
 *
 * Writes reports/rules-budget-v1/ledger/live-<label>.json.
 */
import { targetEnv, TARGET_PROJECT } from "./fsTarget.mjs";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, updateDoc, setDoc, deleteDoc, getDoc } from "firebase/firestore";

const label = process.argv[2] ?? "run";
const env = (file) => Object.fromEntries(
  readFileSync(file, "utf8").split("\n")
    .map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }),
);
const dev = targetEnv();
const local = existsSync(".env.local") ? env(".env.local") : {};
const PROJECT = dev.VITE_FIREBASE_PROJECT_ID;
if (PROJECT !== TARGET_PROJECT) throw new Error(`Refusing to probe "${PROJECT}".`);
if (PROJECT !== "scriptally-dev") throw new Error(`This probe is for real dev only, not "${PROJECT}".`);
const PASSWORD = process.env.SA_E2E_PASSWORD ?? local.SA_E2E_PASSWORD;
if (!PASSWORD) throw new Error("No SA_E2E_PASSWORD in .env.local");

const RULES = readFileSync("firestore.rules", "utf8");
function fullest() {
  const body = RULES.slice(RULES.indexOf("function isValidQuery("), RULES.indexOf("}", RULES.indexOf("'agentRecheckOn'")));
  const out = {};
  for (const m of body.matchAll(/\(data\.get\('(\w+)', null\) == null \|\| ([^\n]*)\);?(?=\n|$)/g)) {
    const [, f, check] = m;
    const inList = check.match(/in \['([^']+)'/);
    out[f] = inList ? inList[1]
      : /isValidId/.test(check) ? "v1"
      : /is list/.test(check) ? []
      : /is bool/.test(check) ? true
      : /is int/.test(check) && !/is string/.test(check) ? 1
      : "2026-11-24";
  }
  return out;
}
const FULL = fullest();
const nOptional = Object.keys(FULL).length;

const app = initializeApp({
  apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN, projectId: PROJECT,
  storageBucket: dev.VITE_FIREBASE_STORAGE_BUCKET, messagingSenderId: dev.VITE_FIREBASE_MESSAGING_SENDER_ID, appId: dev.VITE_FIREBASE_APP_ID,
});
const dbId = dev.VITE_FIREBASE_DATABASE_ID;
const db = !dbId || dbId === "(default)" ? getFirestore(app) : getFirestore(app, dbId);
const { user } = await signInWithEmailAndPassword(getAuth(app), process.env.SA_E2E_EMAIL ?? "harness@scriptally.test", PASSWORD);
const uid = user.uid;
const id = `rb1-probe-${Date.now()}`;
const ref = doc(db, "users", uid, "queries", id);
const REQUIRED = { id, userId: uid, manuscriptId: "rb1-probe", agentId: "rb1-probe", packageId: "", status: "Queried", sendMethod: "Email" };
const ONE = { nudgeDate: "2026-12-04", nudgeSetAt: "2026-11-24T12:00:00.000Z" };
const out = { label, database: dbId || "(default)", project: PROJECT, optionalFields: nOptional, at: new Date().toISOString() };
const tryIt = (fn) => fn().then(() => "allowed", (e) => `denied: ${String(e?.message ?? e).slice(0, 160)}`);

console.log(`database ${out.database} · project ${PROJECT} · test query ${id} · ${nOptional} optional fields`);
try {
  out.createFullest = await tryIt(() => setDoc(ref, { ...REQUIRED, ...FULL }));
  console.log(`  create, every field present:            ${out.createFullest}`);
  if (out.createFullest === "allowed") {
    out.updateOneFieldOnFullest = await tryIt(() => updateDoc(ref, ONE));
    console.log(`  update the reminder on the full query:  ${out.updateOneFieldOnFullest}`);
  } else {
    /* a full query cannot even be created: build it up one field per update and find where it stops */
    out.createSmallest = await tryIt(() => setDoc(ref, REQUIRED));
    console.log(`  create, required fields only:           ${out.createSmallest}`);
    const entries = Object.entries(FULL);
    out.threshold = null;
    for (let k = 1; k <= entries.length && out.createSmallest === "allowed"; k++) {
      const r = await tryIt(() => updateDoc(ref, Object.fromEntries([entries[k - 1]])));
      if (r !== "allowed") { out.threshold = { firstDeniedAt: k, field: entries[k - 1][0], outcome: r }; break; }
    }
    console.log(`  adding one field per update, denied at: ${JSON.stringify(out.threshold)}`);
    if (out.threshold === null) {
      /* every field is now present: the Step 0 write, then the widest write the app sends (planOfResponse's reply
         step for a partial request, 29 keys, every one changed) */
      out.updateOneFieldOnFullest = await tryIt(() => updateDoc(ref, ONE));
      console.log(`  update the reminder on the full query:  ${out.updateOneFieldOnFullest}`);
      const D = ["materialsRequestedType", "materialsRequestedQuantity", "fullVersionSent", "expectedSendDate", "sendReminderDate", "rrNotes", "rejectionFeedbackType", "rejectionFeedbackText", "rejectionReflection", "rejectionLesson", "rejectedFromStatus", "offerDate", "offerResponseDeadline", "offerNotes", "closingReason", "closingNotes",
        "partialRequestedDate", "partialSentDate", "fullRequestedDate", "fullSentDate", "responseReceivedAt", "rejectedDate", "lastStatusChange"];
      const reply = { status: "Partial Requested", revisionRound: 2, hasAgentResponded: false, requestSynopsis: false, requestFrom: 3, requestFromUnit: "page", ...Object.fromEntries(D.map((f) => [f, "2026-11-25"])) };
      out.widestReply = { keys: Object.keys(reply).length, outcome: await tryIt(() => updateDoc(ref, reply)) };
      console.log(`  the ${out.widestReply.keys}-key reply step on the full query: ${out.widestReply.outcome}`);
    }
  }
} finally {
  const gone = await tryIt(() => deleteDoc(ref));
  const still = (await getDoc(ref).catch(() => null))?.exists() ?? "unknown";
  out.cleanup = { delete: gone, stillExists: still };
  console.log(`  delete the test query: ${gone} · still exists: ${still}`);
  mkdirSync("reports/rules-budget-v1/ledger", { recursive: true });
  writeFileSync(`reports/rules-budget-v1/ledger/live-${label}.json`, JSON.stringify(out, null, 1));
  process.exit(0);
}
