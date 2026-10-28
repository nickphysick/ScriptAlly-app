/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Responses v5 — the reference's own data (design-refs/responses-v5/responses-v5.html, `Q`), on three manuscripts of
 * their own, so the page can be measured against the mock with the mock's figures:
 *
 *   rs5-ms-full   "Murphy's Day Out"   the reference's 34 queries: 22 answers, 12 still waiting
 *   rs5-ms-early  "Early Days"         the same 34 with only three answered (the reference's EARLY set)
 *   rs5-ms-empty  "Nothing Back Yet"   only the 12 that have no answer: the empty page
 *
 * ⚠️ EVERY DATE IS RELATIVE TO TODAY. The reference's clock is 28 Oct 2026; each date is stored as that many days
 *    before (or after) today, so the fixture keeps its state on every day it is run.
 * ⚠️ SELF-CLEANING. Every document carries the `rs5-` prefix and a deterministic id; `--clean` removes them all,
 *    with each query's activity log and the global feed rows. A run deletes before it writes.
 *
 *   node tests/e2e/seedRs5.mjs          # write
 *   node tests/e2e/seedRs5.mjs --clean  # remove
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

const PREFIX = "rs5-";
const REF_TODAY = Date.UTC(2026, 9, 28, 12);
/** a reference date as days before today (negative = ahead) */
const ago = (s) => Math.round((REF_TODAY - Date.parse(s + "T12:00:00Z")) / 86_400_000);
const at = (daysAgo) => new Date(Date.now() - daysAgo * 86_400_000).toISOString();

async function clean() {
  let n = 0;
  const qs = await getDocs(collection(db, "users", uid, "queries"));
  for (const d of qs.docs) {
    if (!d.id.startsWith(PREFIX)) continue;
    for (const a of (await getDocs(collection(db, "users", uid, "queries", d.id, "activity"))).docs) { await deleteDoc(a.ref); n++; }
    await deleteDoc(d.ref); n++;
  }
  for (const c of ["agents", "manuscripts", "activities"]) {
    const snap = await getDocs(collection(db, "users", uid, c));
    for (const d of snap.docs) {
      const x = d.data();
      if (d.id.startsWith(PREFIX) || (c === "activities" && String(x.queryId ?? "").startsWith(PREFIX))) { await deleteDoc(d.ref); n++; }
    }
  }
  console.log(`removed ${n}`);
}
if (process.argv.includes("--clean")) { await clean(); process.exit(0); }
await clean();

/* the reference's Q, verbatim (n, a, s, w, st, note, due, exp) */
const Q = [
 {n:'Tom Ellery',a:'Ellery & Finch',s:'2026-05-10',w:8,st:[['pr','2026-06-02'],['ps','2026-06-04'],['fr','2026-07-30'],['fs','2026-08-01'],['of','2026-10-20']],due:'2026-11-03'},
 {n:'Jonathan Marsh',a:'The Marsh Agency',s:'2026-07-02',w:6,st:[['pr','2026-07-26'],['ps','2026-07-28'],['fr','2026-10-24']],due:'2026-11-07'},
 {n:'Clara Beaumont',a:'Harbour Lane',s:'2026-09-01',w:8,st:[['pr','2026-10-21']],due:'2026-11-04'},
 {n:'Hannah Okafor',a:'Okafor & Lowe',s:'2026-06-14',w:6,st:[['pr','2026-07-09'],['ps','2026-07-11'],['fr','2026-08-12'],['fs','2026-08-15'],['rr','2026-10-15']],
   note:'Murphy’s voice carried me straight through. I’d love to see it again if you tighten the middle third, especially the ferry chapters.',due:null},
 {n:'Marcus Reed',a:'Bloomsbury Quill',s:'2026-09-14',w:6,st:[['pr','2026-10-08'],['ps','2026-10-12']],exp:'2026-11-23'},
 {n:'Priya Shah',a:'Shah Literary',s:'2026-08-11',w:4,st:[['pr','2026-09-02'],['ps','2026-09-05'],['fr','2026-09-29'],['fs','2026-10-03']],exp:'2026-11-28'},
 {n:'Sophie Grant',a:'Grant & Lowe',s:'2026-08-30',w:8,st:[['pr','2026-09-18'],['ps','2026-09-20']],exp:'2026-11-15'},
 {n:'Mei Takahashi',a:'Takahashi Literary',s:'2026-08-25',w:6,st:[['pr','2026-09-10'],['ps','2026-09-12'],['x','2026-09-30']],note:'The opening pages are tense and well paced. I didn’t connect with Murphy as strongly as I’d hoped, and I need to love a lead to take a book on.'},
 {n:'Daniel Okoro',a:'Okoro Associates',s:'2026-06-07',w:8,st:[['pr','2026-06-20'],['ps','2026-06-22'],['fr','2026-07-15'],['fs','2026-07-16'],['x','2026-09-02']],note:'A close call. The premise is strong and I can see it finding a home, but I’m not the right champion for it.'},
 {n:'Sam Kerr',a:'Kerr Literary',s:'2026-07-28',w:null,st:[['pr','2026-08-20'],['ps','2026-08-22'],['x','2026-10-14']]},
 {n:'Felix Hart',a:'Hart & Quill',s:'2026-07-02',w:6,st:[['x','2026-07-30']],note:'Not quite right for my list at the moment, but I enjoyed the pitch and the comp titles were spot on.'},
 {n:'Nadia Haddad',a:'Haddad Literary',s:'2026-08-09',w:8,st:[['x','2026-09-16']],note:'I’ve recently taken on a title with a similar hook, so I’ll step back from this one.'},
 {n:'Ellie Turner',a:'Turner Hale',s:'2026-09-04',w:6,st:[['x','2026-10-08']],note:'Cosy crime with a dog at its heart is a crowded corner of my list just now.'},
 {n:'Ruth Adeyemi',a:'Northlight Literary',s:'2026-08-14',w:6,st:[['x','2026-09-22']]},
 {n:'Isla Fraser',a:'Fraser Bell',s:'2026-07-19',w:4,st:[['x','2026-07-23']]},
 {n:'Owen Pryce',a:'Pryce Management',s:'2026-06-12',w:6,st:[['x','2026-07-28']]},
 {n:'Grace Liu',a:'Liu Agency',s:'2026-06-30',w:8,st:[['x','2026-08-19']]},
 {n:'Ben Walsh',a:'Walsh & Co',s:'2026-08-20',w:null,st:[['x','2026-10-01']]},
 {n:'Amara Bell',a:'Bellweather Literary',s:'2026-08-04',w:8,st:[['nr','2026-09-29']]},
 {n:'Lucas Grey',a:'Greyfriars Agency',s:'2026-08-03',w:8,st:[['nr','2026-09-28']]},
 {n:'Rosa Fenn',a:'Fenn Lane',s:'2026-05-20',w:8,st:[['nr','2026-07-15']]},
 {n:'Jack Morrow',a:'Morrow Literary',s:'2026-06-01',w:8,st:[['nr','2026-07-27']]},
 {n:'Lena Voss',a:'Voss & Pike',s:'2026-09-02',w:6,st:[]},
 {n:'Kit Ansell',a:'Ansell Books',s:'2026-09-09',w:4,st:[]},
 {n:'Maya Rowe',a:'Rowe Literary',s:'2026-09-15',w:8,st:[]},
 {n:'Theo Blake',a:'Blake & Wren',s:'2026-09-22',w:6,st:[]},
 {n:'Alice Moreno',a:'Moreno Agency',s:'2026-09-29',w:null,st:[]},
 {n:'Ravi Patel',a:'Patel Lit',s:'2026-10-03',w:8,st:[]},
 {n:'Eve Larkin',a:'Larkin House',s:'2026-10-07',w:6,st:[]},
 {n:'Joe Harlow',a:'Harlow Literary',s:'2026-10-10',w:8,st:[]},
 {n:'Freya Lund',a:'Lund & Hale',s:'2026-10-14',w:12,st:[]},
 {n:'Imogen Price',a:'Price Wilde',s:'2026-10-17',w:6,st:[]},
 {n:'Will Nash',a:'Nash Literary',s:'2026-10-21',w:8,st:[]},
 {n:'Zara Quinn',a:'Quinn Agency',s:'2026-10-24',w:6,st:[]},
];
const EARLY = new Set(['Isla Fraser', 'Felix Hart', 'Rosa Fenn']);
const STATUS = { q: "Queried", pr: "Partial Requested", ps: "Partial Sent", fr: "Full Requested", fs: "Full Sent", rr: "Revise & Resubmit", of: "Offer", x: "Rejected", nr: "No Response" };
const FIELD = { "Queried": "dateSent", "Partial Requested": "partialRequestedDate", "Partial Sent": "partialSentDate", "Full Requested": "fullRequestedDate", "Full Sent": "fullSentDate", "Rejected": "rejectedDate", "Offer": "offerDate" };
const KEY = { "Queried": "query_sent", "Partial Requested": "partial_requested", "Full Requested": "full_requested", "Revise & Resubmit": "rr_requested", "Partial Sent": "partial_sent", "Full Sent": "full_sent", "Offer": "offer", "Rejected": "pass", "No Response": "closed_no_reply" };
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const writes = [];
const put = (coll, id, data) => writes.push([doc(db, "users", uid, coll, id), data]);
const putAct = (qid, id, data) => writes.push([doc(db, "users", uid, "queries", qid, "activity", id), data]);

Q.forEach((x, i) => {
  const id = `rs5-agent-${i + 1}`;
  put("agents", id, {
    id, userId: uid, name: x.n, agency: x.a, email: `${x.n.split(" ")[0].toLowerCase()}@example.com`,
    website: "", genres: ["Crime"], notes: "", agentNotes: "", mswlNotes: "", twitter: "", bluesky: "", instagram: "", socials: [],
    city: "London", country: "GB", submissionStatus: "Open", submissionMethod: "Email", starRating: 3,
    ...(x.w ? { responseTimeWeeks: x.w } : {}),
    noResponseMeansNo: x.st.some((s) => s[0] === "nr"), setAside: false, importedNeedsReview: false, materialsWanted: ["Query letter", "Synopsis"],
    dateAdded: at(300), lastCheckedDate: at(10),
  });
});
const ms = (id, title) => put("manuscripts", id, {
  id, userId: uid, title, genre: "Crime", ageCategory: "Adult", wordCount: 82000, logline: "",
  status: "Querying", statusChangedDate: new Date().toISOString().slice(0, 10), comps: [], shelved: false,
});
function query(msTag, msId, i, x, st) {
  const id = `rs5-q-${msTag}-${i + 1}`;
  const steps = [["q", x.s], ...st].map(([k, d]) => [STATUS[k], ago(d)]);
  const status = steps[steps.length - 1][0];
  const dates = {};
  for (const [s, d] of steps) if (FIELD[s]) dates[FIELD[s]] = at(d);
  const last = st.length ? st[st.length - 1][0] : "q";
  const extra = {};
  if (x.note && last === "x") Object.assign(extra, { rejectionFeedbackType: "detailed", rejectionFeedbackText: x.note });
  else if (last === "x") extra.rejectionFeedbackType = "form";
  if (x.note && st.some((s) => s[0] === "rr")) extra.rrNotes = x.note;
  if (x.due && (last === "pr" || last === "fr")) extra.expectedSendDate = at(ago(x.due));
  if (x.due && last === "of") extra.offerResponseDeadline = at(ago(x.due));
  put("queries", id, {
    id, userId: uid, agentId: `rs5-agent-${i + 1}`, manuscriptId: msId, ...dates, status, lastStatusChange: at(steps[steps.length - 1][1]),
    sendMethod: "Email", personalisationNotes: "", packageId: "", materialsWanted: ["Query letter", "Synopsis"], ...extra,
  });
  for (const [s, d] of steps) {
    putAct(id, `act-status-${slug(s)}-${id}`, { type: s, resultingStatus: s, createdAt: new Date(Date.now() - d * 86_400_000), note: s, queryId: id, eventKey: KEY[s] });
  }
}
ms("rs5-ms-full", "Murphy’s Day Out");
ms("rs5-ms-early", "Early Days");
ms("rs5-ms-empty", "Nothing Back Yet");
Q.forEach((x, i) => {
  query("full", "rs5-ms-full", i, x, x.st);
  query("early", "rs5-ms-early", i, x, EARLY.has(x.n) ? x.st : []);
  if (!x.st.length) query("empty", "rs5-ms-empty", i, x, []);
});

for (let i = 0; i < writes.length; i += 400) {
  const b = writeBatch(db);
  for (const [ref, data] of writes.slice(i, i + 400)) b.set(ref, data);
  await b.commit();
}
console.log(`wrote ${writes.length} documents`);
process.exit(0);
