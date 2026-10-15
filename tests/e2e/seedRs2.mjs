/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Responses v2 — the states the shared account cannot show, each on a manuscript of its own (RS2 B3, B4, C1, C3, D1,
 * E1, F1). The Smoke Test (seed-ms-1) is the populated page; The Quiet Second (seed-ms-2) has answers and no nos.
 *
 *   rs2-ms-empty "Nothing Answered Yet"   three queries out with agents, no answer (F1: the empty page)
 *   rs2-ms-two   "Two Nos So Far"         one of each request state (not sent · sent · offer · revise and resubmit,
 *                                         with an answer-by date and a revision note), a personal-note rejection, a
 *                                         form rejection and two still out (B3, C1 at 2, D1's feedback card)
 *   rs2-ms-34    "Thirty-Four Nos"        34 nos (C1 at 34: seven gates, no hint)
 *   rs2-ms-140   "One Hundred and Forty"  140 nos and one request (C3: the pinned list)
 *   rs2-ms-none  "Only Nos"               two nos and no request (B4: "No requests yet")
 *
 * ⚠️ EVERY DATE IS RELATIVE TO TODAY, so the fixtures stay in their state on every day they are run.
 * ⚠️ SELF-CLEANING. Every document carries the `rs2-` prefix and a deterministic id; `--clean` removes them all,
 *    with each query's activity log. A run deletes before it writes.
 *
 *   node tests/e2e/seedRs2.mjs          # write
 *   node tests/e2e/seedRs2.mjs --clean  # remove
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
const PREFIX = "rs2-";
const iso = (daysAgo) => new Date(Date.now() - daysAgo * 86_400_000).toISOString();
const ahead = (days) => new Date(Date.now() + days * 86_400_000).toISOString();

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

/* a seeded generator, so 140 nos are the same 140 on every run */
function seeded(n) { let t = n; return () => { t = (t * 1103515245 + 12345) % 2147483648; return t / 2147483648; }; }
const FN = ["Alice", "Tom", "Priyanka", "Hugo", "Sara", "James", "Leila", "Owen", "Grace", "Kwame", "Rosa", "Felix", "Imogen", "Sam", "Yusuf", "Eve", "Callum", "Nina", "Theo", "Ama"];
const LN = ["Hart", "Okafor", "Lindqvist", "Shaw", "Mendes", "Pike", "Achebe", "Wren", "Doyle", "Castell", "Ahmed", "Quinn", "Fenwick", "Moss", "Varga", "Holt"];
const AG = ["Literary", "Associates", "Agency", "Books", "& Co"];

const writes = [];
const put = (coll, id, data) => writes.push([doc(db, "users", uid, coll, id), data]);
const putAct = (qid, id, data) => writes.push([doc(db, "users", uid, "queries", qid, "activity", id), data]);
const agent = (id, name, agency) => put("agents", id, {
  id, userId: uid, name, agency, email: `${name.split(" ")[0].toLowerCase()}@example.com`,
  website: "", genres: ["Literary Fiction"], notes: "", agentNotes: "", mswlNotes: "", twitter: "", bluesky: "", instagram: "", socials: [],
  city: "London", country: "GB", submissionStatus: "Open", submissionMethod: "Email", responseTimeWeeks: 8, starRating: 3,
  noResponseMeansNo: false, setAside: false, importedNeedsReview: false, materialsWanted: ["Query letter", "Synopsis"],
  dateAdded: iso(200), lastCheckedDate: iso(10),
});
const ms = (id, title) => put("manuscripts", id, {
  id, userId: uid, title, genre: "Thriller", ageCategory: "Adult", wordCount: 92000, logline: "",
  status: "Querying", statusChangedDate: new Date().toISOString().slice(0, 10), comps: [], shelved: false,
});
/** A query and its dated steps. `steps` is [status, daysAgo] oldest first; the doc carries the matching date fields. */
const FIELD = { "Queried": "dateSent", "Partial Requested": "partialRequestedDate", "Partial Sent": "partialSentDate", "Full Requested": "fullRequestedDate", "Full Sent": "fullSentDate", "Rejected": "rejectedDate", "Offer": "offerDate" };
const KEY = { "Queried": "query_sent", "Partial Requested": "partial_requested", "Full Requested": "full_requested", "Revise & Resubmit": "rr_requested", "Partial Sent": "partial_sent", "Full Sent": "full_sent", "Offer": "offer", "Rejected": "pass", "No Response": "closed_no_reply" };
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
function query(id, msId, agentId, steps, extra = {}) {
  const status = steps[steps.length - 1][0];
  const dates = {};
  for (const [s, d] of steps) if (FIELD[s]) dates[FIELD[s]] = iso(d);
  put("queries", id, {
    id, userId: uid, agentId, manuscriptId: msId, ...dates, status, lastStatusChange: iso(steps[steps.length - 1][1]),
    sendMethod: "Email", personalisationNotes: "", packageId: "", materialsWanted: ["Query letter", "Synopsis"], ...extra,
  });
  for (const [s, d] of steps) {
    putAct(id, `act-status-${slug(s)}-${id}`, { type: s, resultingStatus: s, createdAt: new Date(Date.now() - d * 86_400_000), note: s, queryId: id, eventKey: KEY[s] });
  }
}

/* ── the agents: twenty, shared by the fixtures ── */
const R = seeded(7);
const AGENTS = [];
for (let i = 0; i < 20; i++) {
  const ln = LN[i % LN.length], name = `${FN[i]} ${ln}`, agency = `${ln} ${AG[i % AG.length]}`;
  const id = `rs2-agent-${i + 1}`;
  agent(id, name, agency);
  AGENTS.push(id);
}

/* ── F1 · nothing answered ── */
ms("rs2-ms-empty", "Nothing Answered Yet");
for (let i = 0; i < 3; i++) query(`rs2-q-empty-${i + 1}`, "rs2-ms-empty", AGENTS[i], [["Queried", 10 + i * 5]]);

/* ── B3 / C1 at 2 / D1 · one of each request state, two nos, two out ── */
ms("rs2-ms-two", "Two Nos So Far");
query("rs2-q-send", "rs2-ms-two", AGENTS[0], [["Queried", 60], ["Partial Requested", 20], ["Partial Sent", 17], ["Full Requested", 6]], { expectedSendDate: ahead(12) });
query("rs2-q-sent", "rs2-ms-two", AGENTS[1], [["Queried", 70], ["Partial Requested", 40], ["Partial Sent", 36]]);
query("rs2-q-offer", "rs2-ms-two", AGENTS[2], [["Queried", 90], ["Partial Requested", 70], ["Partial Sent", 66], ["Full Requested", 50], ["Full Sent", 45], ["Offer", 4]], { offerResponseDeadline: ahead(10) });
query("rs2-q-rr", "rs2-ms-two", AGENTS[3], [["Queried", 80], ["Partial Requested", 60], ["Partial Sent", 55], ["Revise & Resubmit", 9]], { rrNotes: "Tighten the middle third and give the sister more on the page." });
query("rs2-q-note", "rs2-ms-two", AGENTS[4], [["Queried", 50], ["Rejected", 24]], { rejectionFeedbackType: "detailed", rejectionFeedbackText: "Strong voice, and I liked Murphy a lot. Thrillers are a crowded list for me right now, but I'd be glad to see your next book." });
query("rs2-q-form", "rs2-ms-two", AGENTS[5], [["Queried", 40], ["Rejected", 30]], { rejectionFeedbackType: "form" });
query("rs2-q-out1", "rs2-ms-two", AGENTS[6], [["Queried", 12]]);
query("rs2-q-out2", "rs2-ms-two", AGENTS[7], [["Queried", 8]]);

/* ── the many: 34 and 140 nos, a quarter of them no reply ── */
function nos(msId, n, seed, tag) {
  const r = seeded(seed);
  for (let i = 0; i < n; i++) {
    const quiet = r() < 0.25;
    const answered = 5 + Math.floor(r() * 520);
    const wait = quiet ? 42 + Math.floor(r() * 50) : 1 + Math.floor(r() * 70);
    const a = AGENTS[Math.floor(r() * AGENTS.length)];
    const far = r();
    const steps = [["Queried", answered + wait]];
    if (!quiet && far < 0.12) steps.push(["Partial Requested", answered + Math.round(wait * 0.6)], ["Partial Sent", answered + Math.round(wait * 0.5)]);
    steps.push([quiet ? "No Response" : "Rejected", answered]);
    query(`rs2-q-${tag}-${i + 1}`, msId, a, steps, quiet ? {} : { rejectionFeedbackType: r() < 0.25 ? "detailed" : "form", ...(r() < 0.25 ? { rejectionFeedbackText: "Not quite right for my list, but there is a lot to like here." } : {}) });
  }
}
ms("rs2-ms-34", "Thirty-Four Nos");
nos("rs2-ms-34", 34, 34, "n34");
query("rs2-q-34-req", "rs2-ms-34", AGENTS[8], [["Queried", 30], ["Partial Requested", 3]], { expectedSendDate: ahead(20) });
ms("rs2-ms-140", "One Hundred and Forty");
nos("rs2-ms-140", 140, 140, "n140");
query("rs2-q-140-req", "rs2-ms-140", AGENTS[9], [["Queried", 30], ["Partial Requested", 3]], { expectedSendDate: ahead(20) });

/* ── B4 · nos and no request ── */
ms("rs2-ms-none", "Only Nos");
query("rs2-q-none-1", "rs2-ms-none", AGENTS[10], [["Queried", 40], ["Rejected", 12]], { rejectionFeedbackType: "form" });
query("rs2-q-none-2", "rs2-ms-none", AGENTS[11], [["Queried", 90], ["No Response", 20]]);
query("rs2-q-none-out", "rs2-ms-none", AGENTS[12], [["Queried", 9]]);

void R;
for (let i = 0; i < writes.length; i += 400) {
  const b = writeBatch(db);
  for (const [ref, data] of writes.slice(i, i + 400)) b.set(ref, data);
  await b.commit();
}
console.log(`wrote ${writes.length} documents`);
process.exit(0);
