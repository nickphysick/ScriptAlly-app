/**
 * Contact list v25.5's independent figures (the agents' contact fields and each query's dated stages, from the query document) (v25.2's, plus each agent's reply time): read (never write) the harness account's agents and queries, and print
 * {"agents": {id: {stars, genres, mswl, email}}, "queries": [{agentId, status, sent, partial, full, offer}]}. The CL252
 * locks hold the rendered tally, pills, wishlist line and day counts to these, so they do not share a derivation with
 * the page. The password is never printed.
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, getDocs, collection } from "firebase/firestore";

const env = (file) => Object.fromEntries(readFileSync(file, "utf8").split("\n").map((l) => /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(l)).filter(Boolean).map((m) => [m[1], m[2].replace(/^["']|["']$/g, "")]));
const dev = env(".env.development");
const local = existsSync(".env.local") ? env(".env.local") : {};
const PASSWORD = process.env.SA_E2E_PASSWORD || local.SA_E2E_PASSWORD;
if (!PASSWORD) throw new Error("No SA_E2E_PASSWORD");
if (dev.VITE_FIREBASE_PROJECT_ID !== "scriptally-dev") throw new Error("refusing: not the dev project");
const app = initializeApp({ apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN, projectId: dev.VITE_FIREBASE_PROJECT_ID, appId: dev.VITE_FIREBASE_APP_ID }, "cl255-data");
const { user } = await signInWithEmailAndPassword(getAuth(app), process.env.SA_E2E_EMAIL || local.SA_E2E_EMAIL || "harness@scriptally.test", PASSWORD);
const dbId = dev.VITE_FIREBASE_DATABASE_ID && dev.VITE_FIREBASE_DATABASE_ID !== "(default)" ? dev.VITE_FIREBASE_DATABASE_ID : undefined;
const db = dbId ? getFirestore(app, dbId) : getFirestore(app);
const agents = {};
for (const d of (await getDocs(collection(db, "users", user.uid, "agents"))).docs) {
  const a = d.data();
  agents[d.id] = { stars: typeof a.starRating === "number" && a.starRating > 0 ? Math.min(5, Math.round(a.starRating)) : null, genres: (a.genres ?? []).length,
    mswl: (a.mswlNotes ?? "").trim(), email: (a.email ?? "").trim(),
    weeks: typeof a.responseTimeWeeks === "number" && a.responseTimeWeeks > 0 ? a.responseTimeWeeks : null,
    agency: (a.agency ?? "").trim(), website: (a.website ?? "").trim(), nrmn: a.noResponseMeansNo ?? null,
    form: ((a.socials ?? []).find((x) => /^submission form$/i.test((x.platform ?? "").trim()))?.handle ?? "").trim() };
}
const ms = (v) => (v == null ? null : typeof v === "string" ? Date.parse(v) : typeof v.toMillis === "function" ? v.toMillis() : typeof v.seconds === "number" ? v.seconds * 1000 : null);
const queries = (await getDocs(collection(db, "users", user.uid, "queries"))).docs.map((d) => {
  const q = d.data();
  return { id: d.id, agentId: q.agentId, manuscriptId: q.manuscriptId, status: q.status, sent: ms(q.dateSent), partial: !!(q.partialRequestedDate || q.partialSentDate), full: !!(q.fullRequestedDate || q.fullSentDate), offer: !!q.offerDate,
    pr: ms(q.partialRequestedDate), ps: ms(q.partialSentDate), fr: ms(q.fullRequestedDate), fs: ms(q.fullSentDate), of: ms(q.offerDate) };
});
const out = { agents, queries };
console.log(JSON.stringify(out));
process.exit(0);
