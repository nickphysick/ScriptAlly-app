/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ SEED THE MANUSCRIPTS-v12 FIXTURE ══════════════════════════════════════════════════════════
 *
 * TWO ACCOUNTS, BOTH OWNED BY THIS SCRIPT AND NEITHER SHARED:
 *   · msv12-pro@scriptally.test    — the FILLED fixture: one manuscript, agents, materials,
 *                                    packages, queries (see msv12Fixture.mjs, the one source this
 *                                    and the measure file both read)
 *   · msv12-empty@scriptally.test  — no manuscripts at all, for the empty state
 *
 * ⚠️ WHY NOT THE SHARED HARNESS ACCOUNT. `firestore.rules` denies any client changing its own
 * `plan` (`incoming().plan == existing().plan` — a billing event belongs to a server), so a
 * Free/Pro fixture cannot be flipped in place. The legal route is to CREATE the user doc with the
 * plan wanted — which means delete-and-recreate, which is only safe on a doc this script owns
 * outright. The harness account's doc carries months of prefs; these two carry nothing.
 *
 * ⚠️ DELETE-BEFORE-WRITE over the deterministic id list, the house seeder rule.
 * ⚠️ DEV ONLY — same refusal as seed.mjs.
 * ⚠️ EACH ACCOUNT GETS ITS OWN APP INSTANCE. One Firestore connection serving two sign-ins in
 *    sequence retries in-flight streams under the wrong token; separate instances, separate
 *    connections.
 * ⚠️ `setting` RIDES THE CREATE. `isValidManuscript` has no trailing hasOnly, so a CREATE carrying
 *    `setting` is accepted while an UPDATE carrying it is denied (the affectedKeys gotcha; the
 *    allowlist has no such key yet — the rules line is drafted in the run report).
 *
 * USAGE
 *   node tests/e2e/seedManuscriptsV12.mjs                    seed / restore both accounts (pro → Pro)
 *   node tests/e2e/seedManuscriptsV12.mjs --plan Free|Pro    recreate the FILLED account's user doc
 *                                                            on that plan (fixture data untouched)
 *   node tests/e2e/seedManuscriptsV12.mjs --empty-plan Free|Pro  same for the EMPTY account
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, writeBatch, deleteDoc } from "firebase/firestore";
import {
  MS_ID, MS_TITLE, MS_LOGLINE, MS_SETTING, BV, LETTERS, SYNOPSES, PKGS, AGENTS, QUERIES, COMPS,
  PRO_EMAIL, PRO_NAME, EMPTY_EMAIL, EMPTY_NAME,
} from "./msv12Fixture.mjs";

const env = (file) => Object.fromEntries(
  readFileSync(file, "utf8").split("\n")
    .map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }),
);
const dev = env(".env.development");
const local = existsSync(".env.local") ? env(".env.local") : {};
const PROJECT = dev.VITE_FIREBASE_PROJECT_ID;
if (PROJECT !== "scriptally-dev") throw new Error(`Refusing to seed "${PROJECT}" — scriptally-dev only.`);
const PASSWORD = process.env.SA_E2E_PASSWORD ?? local.SA_E2E_PASSWORD;
if (!PASSWORD) throw new Error("No SA_E2E_PASSWORD in .env.local");

const CFG = {
  apiKey: dev.VITE_FIREBASE_API_KEY,
  authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: PROJECT,
  storageBucket: dev.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: dev.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: dev.VITE_FIREBASE_APP_ID,
};

/** Sign an owned account in on its own app instance; create the auth user on first contact. */
const session = async (email, tag) => {
  const app = initializeApp(CFG, tag);
  const auth = getAuth(app);
  let uid;
  try {
    ({ user: { uid } } = await createUserWithEmailAndPassword(auth, email, PASSWORD));
    console.log(`created ${email}`);
  } catch (e) {
    if (e?.code !== "auth/email-already-in-use") throw e;
    ({ user: { uid } } = await signInWithEmailAndPassword(auth, email, PASSWORD));
  }
  return { db: getFirestore(app), uid };
};

/** The ONLY legal way to a chosen plan: recreate the user doc with it (see the header). */
const recreateUserDoc = async (db, uid, name, email, plan) => {
  await deleteDoc(doc(db, "users", uid));
  await setDoc(doc(db, "users", uid), {
    id: uid, name, email, plan,
    trialStartDate: new Date().toISOString(), subscriptionStatus: plan === "Pro" ? "active" : "none",
    onboardingComplete: true,
  });
};

const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const planFlip = flag("--plan");
const emptyPlanFlip = flag("--empty-plan");
if (planFlip || emptyPlanFlip) {
  const plan = planFlip ?? emptyPlanFlip;
  if (plan !== "Free" && plan !== "Pro") throw new Error(`--plan takes Free or Pro, not "${plan}"`);
  const email = planFlip ? PRO_EMAIL : EMPTY_EMAIL;
  const name = planFlip ? PRO_NAME : EMPTY_NAME;
  const s = await session(email, "flip");
  await recreateUserDoc(s.db, s.uid, name, email, plan);
  console.log(`plan → ${plan} on ${email}`);
  process.exit(0);
}

/* ── the empty account: exists, onboarded, owns NOTHING ─────────────────────────────────────── */
const empty = await session(EMPTY_EMAIL, "msv12-empty");
await recreateUserDoc(empty.db, empty.uid, EMPTY_NAME, EMPTY_EMAIL, "Free");
console.log(`empty account ready (${empty.uid}) — no manuscripts, plan Free`);

/* ── the filled account ─────────────────────────────────────────────────────────────────────── */
const pro = await session(PRO_EMAIL, "msv12-pro");
const { db, uid } = pro;
await recreateUserDoc(db, uid, PRO_NAME, PRO_EMAIL, "Pro");
console.log(`filled account ready (${uid}) — plan Pro`);

/* delete-before-write over the deterministic id list */
const del = [];
for (const a of AGENTS) del.push(["agents", a.id]);
for (const v of [...LETTERS, ...SYNOPSES]) del.push(["versions", v.id]);
for (const p of PKGS) del.push(["packages", p.id]);
for (const q of QUERIES) del.push(["queries", q.id]);
for (const [coll, id] of del) {
  try { await deleteDoc(doc(db, "users", uid, coll, id)); }
  catch (e) { console.error(`DENIED deleting ${coll}/${id}: ${e.code}`); throw e; }
}
console.log("deletes done");

/* the manuscript — whole-document write; this script owns every field it carries */
await setDoc(doc(db, "users", uid, "manuscripts", MS_ID), {
  id: MS_ID, userId: uid,
  title: MS_TITLE, genre: "Thriller", ageCategory: "Adult", wordCount: 50000,
  logline: MS_LOGLINE,
  setting: MS_SETTING, // create tolerates the key; the UPDATE allowlist does not yet (see header)
  comps: COMPS,
  status: "Querying", statusChangedDate: "2026-03-03T09:00:00.000Z",
  bookVersions: BV.map((b) => ({ id: b.id, name: b.name, kind: b.kind, createdDate: b.createdDate, note: b.note })),
}).catch((e) => { console.error(`DENIED writing the manuscript: ${e.code}`); throw e; });
console.log("manuscript written");

const batch = writeBatch(db);
for (const a of AGENTS) {
  batch.set(doc(db, "users", uid, "agents", a.id), {
    id: a.id, userId: uid, name: a.name, agency: a.agency, email: "", website: "",
    genres: ["Thriller"], mswlNotes: "", submissionStatus: "Open",
    ...(a.responseTimeWeeks ? { responseTimeWeeks: a.responseTimeWeeks } : {}),
    submissionMethod: "Email", materialsWanted: ["Query Letter", "Synopsis"],
    dateAdded: "2026-02-01T09:00:00.000Z", lastCheckedDate: "2026-02-01T09:00:00.000Z", notes: "",
  });
}
for (const v of LETTERS) {
  batch.set(doc(db, "users", uid, "versions", v.id), {
    id: v.id, manuscriptId: MS_ID, userId: uid, componentType: "Query Letter",
    versionName: v.versionName, fileAttached: false, createdDate: v.createdDate,
    contentType: "text", contentDraft: "Dear agent,", wordCount: v.wordCount,
  });
}
for (const v of SYNOPSES) {
  batch.set(doc(db, "users", uid, "versions", v.id), {
    id: v.id, manuscriptId: MS_ID, userId: uid, componentType: "Synopsis",
    versionName: v.versionName, fileAttached: false, createdDate: v.createdDate,
    contentType: "text", contentDraft: "It begins on the water.", wordCount: v.wordCount,
  });
}
for (const p of PKGS) {
  batch.set(doc(db, "users", uid, "packages", p.id), {
    id: p.id, manuscriptId: MS_ID, userId: uid, packageName: p.packageName,
    queryLetterVersionId: p.letter, synopsisVersionId: p.synopsis, samplePagesVersionId: "",
    ...(p.bookVersionId ? { bookVersionId: p.bookVersionId } : {}),
    ...(p.otherMaterials ? { otherMaterials: p.otherMaterials } : {}),
    firstSentAt: p.firstSentAt, status: "Active", createdDate: p.firstSentAt,
  });
}
for (const q of QUERIES) {
  batch.set(doc(db, "users", uid, "queries", q.id), {
    id: q.id, userId: uid, manuscriptId: MS_ID, agentId: q.agent, packageId: q.pkg,
    status: q.status, dateSent: q.dateSent, personalisationNotes: "", sendMethod: "Email",
    ...(q.partialRequestedDate ? { partialRequestedDate: q.partialRequestedDate } : {}),
    ...(q.fullRequestedDate ? { fullRequestedDate: q.fullRequestedDate } : {}),
    ...(q.fullSentDate ? { fullSentDate: q.fullSentDate } : {}),
    ...(q.rejectedDate ? { rejectedDate: q.rejectedDate } : {}),
    ...(q.materialsRequestedType ? { materialsRequestedType: q.materialsRequestedType } : {}),
    ...(q.materialsRequestedQuantity ? { materialsRequestedQuantity: q.materialsRequestedQuantity } : {}),
  });
}
await batch.commit().catch((e) => { console.error(`DENIED in the batch: ${e.code}`); throw e; });
console.log("batch committed");

/* read back the one write whose acceptance was reasoned rather than known */
const ms = (await getDoc(doc(db, "users", uid, "manuscripts", MS_ID))).data();
console.log(`manuscript ${MS_ID} ("${MS_TITLE}"): setting ${ms?.setting ? `"${ms.setting}" ACCEPTED` : "REFUSED (report it)"}; ` +
  `${(ms?.bookVersions ?? []).length} book versions, ${(ms?.comps ?? []).length} comps`);
console.log(`seeded: ${AGENTS.length} agents · ${LETTERS.length + SYNOPSES.length} materials · ${PKGS.length} packages · ${QUERIES.length} queries`);
process.exit(0);
