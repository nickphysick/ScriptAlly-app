/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ SEED THE MANUSCRIPTS-v21 FIXTURE ══════════════════════════════════════════════════════════
 *
 * Three DEDICATED accounts, both owned by this script (see ms21Fixture.mjs, the one source this and
 * the measure file read):
 *   · ms21-filled@scriptally.test — two books; the first is the page's subject
 *   · ms21-empty@scriptally.test  — no manuscripts at all
 *   · ms21-delete@scriptally.test — one manuscript, which `--delete-ms` removes mid-run
 *
 * ⚠️ WIPE, THEN WRITE. Every collection the page reads is emptied and rewritten whole, the feed
 *    included. The measure file's own writes (M5's new version, M7's saved details) each narrate a
 *    feed row; a seeder that only overwrote its own ids would let those pile up and silently
 *    reorder the next run's Recent activity. Wiping is safe because nothing else signs in as these.
 * ⚠️ BOTH STORES. A query's journey goes to its own `activity` log (the shape `seed.mjs` writes,
 *    `act-status-<status>-<qid>`, which the drawer and the timeline read) AND to the global feed
 *    (which this page's Recent activity reads). One journey, two stores, as the app writes them.
 * ⚠️ ONE APP INSTANCE PER ACCOUNT — one Firestore connection serving two sign-ins retries
 *    in-flight streams under the wrong token (v12's lesson).
 * ⚠️ DEV ONLY — refuses anything but scriptally-dev.
 *
 * USAGE
 *   node tests/e2e/seedManuscriptsV21.mjs                 both accounts
 *   node tests/e2e/seedManuscriptsV21.mjs --only filled   the filled account (the measure's restore)
 *   node tests/e2e/seedManuscriptsV21.mjs --only empty
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, updateDoc, deleteDoc, getDocs, collection, Timestamp } from "firebase/firestore";
import {
  FILLED_EMAIL, FILLED_NAME, EMPTY_EMAIL, EMPTY_NAME, MS_ID, MS_TITLE, MS, OTHER_MS_ID, OTHER_MS_TITLE,
  BV, LETTERS, SYNOPSES, PKGS, ACTIVE_PKG, AGENTS, QUERIES, MS_UPDATED, COMPS,
  DELETE_EMAIL, DELETE_NAME, DELETE_MS_ID, DELETE_MS_TITLE,
} from "./ms21Fixture.mjs";

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

const args = process.argv.slice(2);
const only = (() => { const i = args.indexOf("--only"); return i >= 0 ? args[i + 1] : null; })();
if (only && !["filled", "empty", "delete"].includes(only)) throw new Error(`--only takes filled, empty or delete, not "${only}"`);
/** `--delete-ms`: remove the delete account's one manuscript, as a deletion elsewhere would — the
 *  measure runs this while the page is open (nothing on the routed page deletes a manuscript). */
const deleteMs = args.includes("--delete-ms");

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

/** A client may not change its own `plan`, so the user doc is recreated with the one wanted. */
const recreateUserDoc = async (db, uid, name, email, plan) => {
  await deleteDoc(doc(db, "users", uid));
  await setDoc(doc(db, "users", uid), {
    id: uid, name, email, plan,
    trialStartDate: "2026-02-01T09:00:00.000Z", subscriptionStatus: plan === "Pro" ? "active" : "none",
    onboardingComplete: true,
  });
  /* the dashboard's first-visit tour floats over every workspace page (the dashboard stays mounted)
     and scrims the page under test; a returning writer has finished it. An update, not part of the
     create — the field is in the user update allowlist. */
  await updateDoc(doc(db, "users", uid), { tourCompletedAt: "2026-02-01T09:05:00.000Z" });
};

/** Empty every collection the page reads — the query logs included. Returns the count removed. */
const WIPE = ["activities", "agents", "manuscripts", "versions", "packages", "queries", "taskFlags", "tasks"];
const wipe = async (db, uid) => {
  let n = 0;
  for (const c of WIPE) {
    const snap = await getDocs(collection(db, "users", uid, c));
    for (const d of snap.docs) {
      if (c === "queries") {
        for (const a of (await getDocs(collection(db, "users", uid, "queries", d.id, "activity"))).docs) {
          await deleteDoc(a.ref); n += 1;
        }
      }
      await deleteDoc(d.ref); n += 1;
    }
  }
  return n;
};

/** Local noon on the named day, as the app would date it (UTC would cross midnight in BST). */
const noon = (day) => { const [y, m, d] = day.split("-").map(Number); return new Date(y, m - 1, d, 12); };
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const KEY = {
  "Queried": "query_sent", "Partial Requested": "partial_requested", "Full Requested": "full_requested",
  "Full Sent": "full_sent", "Partial Sent": "partial_sent", "Rejected": "pass",
};
const TYPE = {
  "Queried": "Query Sent", "Partial Requested": "Status Changed", "Full Requested": "Status Changed",
  "Full Sent": "Materials Sent", "Partial Sent": "Materials Sent", "Rejected": "Status Changed",
};

/* ── the delete account ── */
if (deleteMs) {
  const s = await session(DELETE_EMAIL, "ms21-delete");
  await deleteDoc(doc(s.db, "users", s.uid, "manuscripts", DELETE_MS_ID));
  console.log(`deleted ${DELETE_MS_ID} from the delete account`);
  process.exit(0);
}
if (!only || only === "delete") {
  const s = await session(DELETE_EMAIL, "ms21-delete");
  const n = await wipe(s.db, s.uid);
  await recreateUserDoc(s.db, s.uid, DELETE_NAME, DELETE_EMAIL, "Free");
  await setDoc(doc(s.db, "users", s.uid, "manuscripts", DELETE_MS_ID), {
    id: DELETE_MS_ID, userId: s.uid, title: DELETE_MS_TITLE, genre: "Crime", ageCategory: "Adult",
    wordCount: 71000, logline: "A bookkeeper finds a second set of accounts in a dead man's hand.",
    comps: [], status: "Drafting", statusChangedDate: "2026-09-01T12:00:00.000Z",
    bookVersions: [{ id: "ms21-del-bv", name: "First draft", kind: "initial", createdDate: "2026-09-01" }],
  });
  console.log(`delete account ready (${s.uid}) — wiped ${n}, one manuscript`);
}

/* ── the empty account ──────────────────────────────────────────────────────────────────────── */
if (!only || only === "empty") {
  const s = await session(EMPTY_EMAIL, "ms21-empty");
  const n = await wipe(s.db, s.uid);
  await recreateUserDoc(s.db, s.uid, EMPTY_NAME, EMPTY_EMAIL, "Free");
  console.log(`empty account ready (${s.uid}) — wiped ${n}, owns nothing, plan Free`);
}

/* ── the filled account ─────────────────────────────────────────────────────────────────────── */
if (!only || only === "filled") {
  const { db, uid } = await session(FILLED_EMAIL, "ms21-filled");
  const n = await wipe(db, uid);
  await recreateUserDoc(db, uid, FILLED_NAME, FILLED_EMAIL, "Pro");
  console.log(`filled account (${uid}) — wiped ${n}`);
  const put = (path, data) => setDoc(doc(db, "users", uid, ...path), data)
    .catch((e) => { console.error(`DENIED writing ${path.join("/")}: ${e.code}`); throw e; });

  await put(["manuscripts", MS_ID], {
    id: MS_ID, userId: uid, title: MS_TITLE, ...MS, comps: COMPS,
    bookVersions: BV.map((b) => ({ id: b.id, name: b.name, kind: b.kind, createdDate: b.createdDate, note: b.note, ...(b.wordCount ? { wordCount: b.wordCount } : {}) })),
    activePackageId: ACTIVE_PKG,
  });
  await put(["manuscripts", OTHER_MS_ID], {
    id: OTHER_MS_ID, userId: uid, title: OTHER_MS_TITLE, genre: "Literary Fiction", ageCategory: "Adult",
    wordCount: 82000, logline: "A lighthouse keeper's daughter keeps a year of other people's letters.",
    comps: [], status: "Drafting", statusChangedDate: "2026-09-30T12:00:00.000Z",
  });
  for (const a of AGENTS) {
    await put(["agents", a.id], {
      id: a.id, userId: uid, name: a.name, agency: a.agency, email: "", website: "",
      genres: ["Thriller"], mswlNotes: "", submissionStatus: "Open",
      ...(a.responseTimeWeeks ? { responseTimeWeeks: a.responseTimeWeeks } : {}),
      submissionMethod: "Email", materialsWanted: ["Query Letter", "Synopsis"],
      dateAdded: "2026-02-01T09:00:00.000Z", lastCheckedDate: "2026-02-01T09:00:00.000Z", notes: "",
    });
  }
  for (const [list, type] of [[LETTERS, "Query Letter"], [SYNOPSES, "Synopsis"]]) {
    for (const v of list) {
      await put(["versions", v.id], {
        id: v.id, manuscriptId: MS_ID, userId: uid, componentType: type,
        versionName: v.versionName, fileAttached: false, createdDate: v.createdDate,
        contentType: "text", contentDraft: type === "Synopsis" ? "It begins on the water." : "Dear agent,",
        wordCount: v.wordCount,
      });
    }
  }
  for (const p of PKGS) {
    await put(["packages", p.id], {
      id: p.id, manuscriptId: MS_ID, userId: uid, packageName: p.packageName,
      queryLetterVersionId: p.letter, synopsisVersionId: p.synopsis, samplePagesVersionId: "",
      bookVersionId: p.bookVersionId,
      ...(p.firstSentAt ? { firstSentAt: p.firstSentAt } : {}),
      status: "Active", createdDate: p.firstSentAt ?? "2026-09-20T12:00:00.000Z",
    });
  }

  const agentOf = (id) => AGENTS.find((a) => a.id === id);
  let feed = 0, logs = 0;
  for (const q of QUERIES) {
    const ag = agentOf(q.agent);
    const at = (st) => q.steps.find((s) => s.status === st);
    const dated = (st) => (at(st) ? noon(at(st).day).toISOString() : undefined);
    const statusSteps = q.steps.filter((s) => s.status);
    const last = statusSteps[statusSteps.length - 1];
    const nudge = q.steps.find((s) => s.nudge);
    await put(["queries", q.id], {
      id: q.id, userId: uid, manuscriptId: q.ms, agentId: q.agent, packageId: q.pkg,
      status: q.status, dateSent: noon(q.steps[0].day).toISOString(),
      personalisationNotes: "", sendMethod: "Email",
      ...(dated("Partial Requested") ? { partialRequestedDate: dated("Partial Requested") } : {}),
      ...(dated("Full Requested") ? { fullRequestedDate: dated("Full Requested") } : {}),
      ...(dated("Full Sent") ? { fullSentDate: dated("Full Sent") } : {}),
      ...(dated("Rejected") ? { rejectedDate: dated("Rejected") } : {}),
      ...(nudge ? { lastNudgeSentDate: noon(nudge.day).toISOString() } : {}),
      ...(q.expectedSendDate ? { expectedSendDate: q.expectedSendDate } : {}),
      ...(q.materialsRequestedType ? { materialsRequestedType: q.materialsRequestedType, materialsRequestedQuantity: q.materialsRequestedQuantity } : {}),
      ...(last && last.status !== "Queried" ? { lastStatusChange: noon(last.day).toISOString() } : {}),
    });
    for (const s of q.steps) {
      const when = noon(s.day);
      if (s.nudge) {
        await put(["activities", `ms21-act-${q.id}-nudge`], {
          id: `ms21-act-${q.id}-nudge`, userId: uid, queryId: q.id, manuscriptId: q.ms,
          activityType: "Nudge Sent", description: `Nudge sent to ${ag.name} at ${ag.agency}`,
          date: when.toISOString(), details: "", eventKey: "nudge_sent",
        });
        feed += 1;
        continue;
      }
      /* the query's own log — the shape seed.mjs writes */
      const logId = `act-status-${slug(s.status)}-${q.id}`;
      await put(["queries", q.id, "activity", logId], {
        type: s.status, resultingStatus: s.status, createdAt: Timestamp.fromMillis(when.getTime()),
        note: s.status, queryId: q.id, reconstructed: true, ...(KEY[s.status] ? { eventKey: KEY[s.status] } : {}),
      });
      logs += 1;
      /* the global feed — what this page's Recent activity reads */
      const fid = `ms21-act-${q.id}-${slug(s.status)}`;
      await put(["activities", fid], {
        id: fid, userId: uid, queryId: q.id, manuscriptId: q.ms,
        activityType: TYPE[s.status],
        description: s.status === "Queried" ? `Query sent to ${ag.name} at ${ag.agency}` : `${s.status} — ${ag.name}`,
        date: when.toISOString(), details: "", resultingStatus: s.status,
        ...(KEY[s.status] ? { eventKey: KEY[s.status] } : {}),
        ...(s.version ? { bookVersionId: s.version } : {}),
      });
      feed += 1;
    }
  }
  /* the version save, narrated exactly as `updateManuscript` narrates every manuscript write */
  await put(["activities", MS_UPDATED.id], {
    id: MS_UPDATED.id, userId: uid, queryId: "", manuscriptId: MS_ID,
    activityType: "Manuscript Updated", description: "You updated a manuscript's details",
    date: noon(MS_UPDATED.day).toISOString(), details: "",
  });
  feed += 1;

  console.log(`filled account ready — 2 manuscripts · ${AGENTS.length} agents · ${LETTERS.length + SYNOPSES.length} materials · ${PKGS.length} packages · ${QUERIES.length} queries · ${feed} feed records · ${logs} log rungs`);
}
process.exit(0);
