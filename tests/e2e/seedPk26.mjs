/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v26 — the fixture the PK26 locks write against, on a manuscript of its own so no other page's
 * data moves ("Locks of v26", pk26-ms):
 *
 *   pk26-let-a / pk26-let-b   two query letters ("Letter A", "Letter B"), pk26-syn a synopsis
 *   pk26-pkg-open             an unsent, EMPTY package — the drag target (B1)
 *   pk26-pkg-sent             a SENT package holding Letter A, its 1st edition, with pk26-q1 credited to that edition
 *   pk26-ext                  one named extra on the manuscript ("Author bio"), ticked by nothing
 *   pk26-pkg-old              a RETIRED package with one query (pk26-q2, passed) — Results lists it last, "Retired" (v26.1)
 *   pk26-let-c                a letter with a long name, for the one-line name (v26.1); the sent package carries a note
 *
 *   node tests/e2e/seedPk26.mjs           # write (clean first)
 *   node tests/e2e/seedPk26.mjs --dump    # print the sent package and its query, as stored
 *   node tests/e2e/seedPk26.mjs --clean   # remove every pk26- document
 *
 * ⚠️ SELF-CLEANING: every document carries the `pk26-` prefix; the locks call --clean in afterAll.
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc, getDocs, deleteDoc, collection, writeBatch } from "firebase/firestore";

const env = (f) => Object.fromEntries(readFileSync(f, "utf8").split("\n").map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#"))
  .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }));
const dev = env(".env.development");
const local = existsSync(".env.local") ? env(".env.local") : {};
if (dev.VITE_FIREBASE_PROJECT_ID !== "scriptally-dev") throw new Error("dev only");
const PASSWORD = process.env.SA_E2E_PASSWORD ?? local.SA_E2E_PASSWORD;
if (!PASSWORD) throw new Error("No SA_E2E_PASSWORD in .env.local");
const app = initializeApp({ apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN, projectId: dev.VITE_FIREBASE_PROJECT_ID, appId: dev.VITE_FIREBASE_APP_ID });
const dbId = dev.VITE_FIREBASE_DATABASE_ID;
const db = !dbId || dbId === "(default)" ? getFirestore(app) : getFirestore(app, dbId);
const { user } = await signInWithEmailAndPassword(getAuth(app), process.env.SA_E2E_EMAIL ?? "harness@scriptally.test", PASSWORD);
const uid = user.uid;
const PREFIX = "pk26-";
const iso = (d) => new Date(Date.now() - d * 86_400_000).toISOString();
const ref = (c, id) => doc(db, "users", uid, c, id);

async function clean() {
  let n = 0;
  for (const c of ["queries", "packages", "versions", "manuscripts", "activities"]) {
    const snap = await getDocs(collection(db, "users", uid, c));
    for (const d of snap.docs) {
      const x = d.data();
      if (d.id.startsWith(PREFIX) || x.manuscriptId === "pk26-ms") { await deleteDoc(d.ref); n++; }
    }
  }
  console.log(`removed ${n}`);
}

if (process.argv.includes("--clean")) { await clean(); process.exit(0); }
if (process.argv.includes("--dump")) {
  const out = {};
  for (const [c, id] of [["packages", "pk26-pkg-sent"], ["packages", "pk26-pkg-open"], ["queries", "pk26-q1"], ["manuscripts", "pk26-ms"]]) out[id] = (await getDoc(ref(c, id))).data() ?? null;
  console.log(JSON.stringify(out));
  process.exit(0);
}
await clean();
const b = writeBatch(db);
b.set(ref("manuscripts", "pk26-ms"), {
  id: "pk26-ms", userId: uid, title: "Locks of v26", genre: "Literary Fiction", ageCategory: "Adult", wordCount: 80000, logline: "",
  status: "Querying", statusChangedDate: iso(30).slice(0, 10), comps: [], shelved: false,
  extras: [{ id: "pk26-ext", name: "Author bio" }],
});
const letter = (id, name, days, type = "Query Letter") => b.set(ref("versions", id), {
  id, userId: uid, manuscriptId: "pk26-ms", componentType: type, versionName: name, fileAttached: false,
  createdDate: iso(days), contentType: "text", contentDraft: `${name} — Dear agent, …`, wordCount: 4,
});
letter("pk26-let-a", "Letter A", 40);
letter("pk26-let-b", "Letter B", 20);
letter("pk26-syn", "One-page", 30, "Synopsis");
letter("pk26-let-c", "The longer comps-forward letter for agents in London, Dublin and Edinburgh", 10);
b.set(ref("packages", "pk26-pkg-open"), {
  id: "pk26-pkg-open", userId: uid, manuscriptId: "pk26-ms", packageName: "Drag target", queryLetterVersionId: "", synopsisVersionId: "",
  samplePagesVersionId: "", status: "Active", createdDate: iso(5), edition: 1, icon: "flask", extraIds: [],
});
b.set(ref("packages", "pk26-pkg-sent"), {
  id: "pk26-pkg-sent", userId: uid, manuscriptId: "pk26-ms", packageName: "Sent one", note: "For agents who ask for a synopsis and the first three chapters, in the UK and Ireland", queryLetterVersionId: "pk26-let-a", synopsisVersionId: "",
  samplePagesVersionId: "", status: "Active", createdDate: iso(35), edition: 1, firstSentAt: iso(30), icon: "crown", extraIds: [],
});
b.set(ref("queries", "pk26-q1"), {
  id: "pk26-q1", userId: uid, agentId: "seed-agent-1", manuscriptId: "pk26-ms", dateSent: iso(30), status: "Queried", sendMethod: "Email",
  personalisationNotes: "", packageId: "pk26-pkg-sent", sentHow: "package", sentPackageId: "pk26-pkg-sent", sentPackageEdition: 1,
  sentPackageName: "Sent one", sentMaterials: "Query letter Letter A", sentVersions: ["pk26-let-a"],
});
b.set(ref("packages", "pk26-pkg-old"), {
  id: "pk26-pkg-old", userId: uid, manuscriptId: "pk26-ms", packageName: "Retired one", queryLetterVersionId: "pk26-let-a", synopsisVersionId: "",
  samplePagesVersionId: "", status: "Retired", createdDate: iso(60), edition: 1, firstSentAt: iso(55), icon: "box", extraIds: [],
});
b.set(ref("queries", "pk26-q2"), {
  id: "pk26-q2", userId: uid, agentId: "seed-agent-2", manuscriptId: "pk26-ms", dateSent: iso(55), status: "Rejected", sendMethod: "Email",
  personalisationNotes: "", packageId: "pk26-pkg-old", sentHow: "package", sentPackageId: "pk26-pkg-old", sentPackageEdition: 1,
  sentPackageName: "Retired one", sentMaterials: "Query letter Letter A", sentVersions: ["pk26-let-a"], lastStatusChange: iso(40),
});
await b.commit();
console.log("wrote pk26-ms: 3 letters, a synopsis, an empty package, a sent package with one credited query, a retired package with one, one extra");
process.exit(0);
