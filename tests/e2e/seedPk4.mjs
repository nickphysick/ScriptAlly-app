/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v4 — the two states the shared account cannot show, as fixtures of their own (PK4 C2, F1).
 *
 *   pk4-ms-ret  "Every One Retired" — one letter and two packages, both retired (C2: In use is one line, Retired open)
 *   pk4-ms-let  "One Letter Saved"  — one query letter and no package       (F1: the first way reads "Your letter's ready")
 *   pk4-pkg-ed  on "The Smoke Test" (seed-ms-1) — a sent package in its 2nd edition, whose 1st held Comps-forward and
 *               whose current holds Voice-led (B1: a letter filter matches the CURRENT edition only; no package on
 *               the account has a stored edition, so without this the claim has no case that could fail)
 *
 * `--clean` also removes duplicates of the fixture's packages ("{name} v2", …) that a D6 mutation run may leave.
 *
 * ⚠️ SELF-CLEANING, AND THE LOCKS THAT USE IT CLEAN IN THE SAME RUN. Every document carries the `pk4-` prefix and a
 * deterministic id; `--clean` removes them all.
 *
 *   node tests/e2e/seedPk4.mjs          # write
 *   node tests/e2e/seedPk4.mjs --clean  # remove
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDocs, deleteDoc, collection, writeBatch } from "firebase/firestore";

const env = (f) => Object.fromEntries(readFileSync(f, "utf8").split("\n").map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#"))
  .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }));
const dev = env(".env.development");
const local = existsSync(".env.local") ? env(".env.local") : {};
if (dev.VITE_FIREBASE_PROJECT_ID !== "scriptally-dev") throw new Error("dev only");
const PASSWORD = process.env.SA_E2E_PASSWORD ?? local.SA_E2E_PASSWORD;
if (!PASSWORD) throw new Error("No SA_E2E_PASSWORD in .env.local");
const app = initializeApp({ apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN, projectId: dev.VITE_FIREBASE_PROJECT_ID, appId: dev.VITE_FIREBASE_APP_ID });
const db = getFirestore(app);
const { user } = await signInWithEmailAndPassword(getAuth(app), process.env.SA_E2E_EMAIL ?? "harness@scriptally.test", PASSWORD);
const uid = user.uid;
const PREFIX = "pk4-";
const iso = (d) => new Date(Date.now() - d * 86_400_000).toISOString();

const FIXTURE_NAMES = ["Prologue-led", "The Complete Autumn Submission Bundle for Literary Agents", "Comps-led variant", "Unattributed set", "Two editions"];
async function clean() {
  let n = 0;
  const pk = await getDocs(collection(db, "users", uid, "packages"));
  for (const d of pk.docs) {
    const x = d.data();
    if (x.manuscriptId === "seed-ms-1" && FIXTURE_NAMES.some((f) => new RegExp(`^${f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} v\\d+$`).test(x.packageName ?? ""))) { await deleteDoc(d.ref); n++; }
  }
  for (const c of ["packages", "versions", "manuscripts"]) {
    const snap = await getDocs(collection(db, "users", uid, c));
    for (const d of snap.docs) if (d.id.startsWith(PREFIX)) { await deleteDoc(d.ref); n++; }
  }
  console.log(`removed ${n}`);
}

if (process.argv.includes("--clean")) { await clean(); process.exit(0); }
await clean();
const b = writeBatch(db);
const ms = (id, title) => b.set(doc(db, "users", uid, "manuscripts", id), {
  id, userId: uid, title, genre: "Literary Fiction", ageCategory: "Adult", wordCount: 0, logline: "",
  status: "Querying", statusChangedDate: new Date().toISOString().slice(0, 10), comps: [], shelved: false,
});
const letter = (id, msId, name, days) => b.set(doc(db, "users", uid, "versions", id), {
  id, userId: uid, manuscriptId: msId, componentType: "Query Letter", versionName: name, fileAttached: false,
  createdDate: iso(days), contentType: "text", contentDraft: "Dear agent, …", wordCount: 3,
});
ms("pk4-ms-ret", "Every One Retired");
letter("pk4-let-r", "pk4-ms-ret", "Plain letter", 9);
for (const [id, name, days] of [["pk4-pkg-r1", "Winter round", 8], ["pk4-pkg-r2", "Spring round", 7]]) {
  b.set(doc(db, "users", uid, "packages", id), {
    id, userId: uid, manuscriptId: "pk4-ms-ret", packageName: name, queryLetterVersionId: "pk4-let-r", synopsisVersionId: "",
    samplePagesVersionId: "", status: "Retired", createdDate: iso(days),
  });
}
b.set(doc(db, "users", uid, "packages", "pk4-pkg-ed"), {
  id: "pk4-pkg-ed", userId: uid, manuscriptId: "seed-ms-1", packageName: "Two editions", queryLetterVersionId: "seed-mat-ql3",
  synopsisVersionId: "seed-mat-syn", samplePagesVersionId: "", status: "Active", createdDate: iso(40), firstSentAt: iso(30), edition: 2,
  editions: [
    { n: 1, startedAt: iso(40), summary: "Query letter Comps-forward · Synopsis One-page", versions: ["seed-mat-ql2", "seed-mat-syn"], queryLetterVersionId: "seed-mat-ql2", synopsisVersionId: "seed-mat-syn" },
    { n: 2, startedAt: iso(20), summary: "Query letter Voice-led · Synopsis One-page", versions: ["seed-mat-ql3", "seed-mat-syn"], queryLetterVersionId: "seed-mat-ql3", synopsisVersionId: "seed-mat-syn" },
  ],
});
ms("pk4-ms-let", "One Letter Saved");
letter("pk4-let-1", "pk4-ms-let", "Hook-first, short", 3);
await b.commit();
console.log("wrote pk4-ms-ret (2 retired packages), pk4-ms-let (1 letter) and pk4-pkg-ed (2 editions, on seed-ms-1)");
process.exit(0);
