/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * A FRESH TEST ACCOUNT PER JOURNEY (phone fixes v1, Phase G). The journey signs up through the app's own sign-up page;
 * this module makes the credentials and, afterwards, removes the account whole — every document under `users/{uid}`
 * (subcollections first), the user document, then the Auth user. The password is random, held in memory, and never
 * printed or written anywhere.
 *
 * Refuses any Firebase project but `scriptally-dev`, and any email outside `@scriptally.test`.
 */
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { initializeApp, deleteApp, type FirebaseApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, deleteUser } from "firebase/auth";
import { getFirestore, collection, getDocs, deleteDoc, doc, type Firestore } from "firebase/firestore";

export type Creds = { email: string; password: string; name: string };

const env = (): Record<string, string> => Object.fromEntries(readFileSync(".env.development", "utf8").split("\n")
  .map((l) => l.trim()).filter((l) => l && !l.startsWith("#") && l.includes("="))
  .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }));

export function makeCreds(journey: string, project: string): Creds {
  const tag = `${journey}-${project}-${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`.toLowerCase();
  return { email: `pfj-${tag}@scriptally.test`, password: `Pf1!${randomBytes(18).toString("base64url")}`, name: "Ada Tester" };
}

/** the stores the app writes under a user (db.tsx), and the subcollections they hold */
const STORES = ["activities", "agents", "attachments", "dismissedTasks", "journalEntries", "manuscripts", "notes", "packages", "queries", "taskFlags", "tasks", "versions"];
const SUBS: Record<string, string[]> = { queries: ["activity"], manuscripts: ["notes"], agents: ["notes"] };

async function open(c: Creds): Promise<{ app: FirebaseApp; db: Firestore; uid: string } | null> {
  const e = env();
  if (e.VITE_FIREBASE_PROJECT_ID !== "scriptally-dev") throw new Error(`Refusing project "${e.VITE_FIREBASE_PROJECT_ID}"`);
  if (!c.email.endsWith("@scriptally.test")) throw new Error("Refusing an email outside @scriptally.test");
  const app = initializeApp({ apiKey: e.VITE_FIREBASE_API_KEY, authDomain: e.VITE_FIREBASE_AUTH_DOMAIN, projectId: e.VITE_FIREBASE_PROJECT_ID, appId: e.VITE_FIREBASE_APP_ID }, `fresh-${randomBytes(4).toString("hex")}`);
  try {
    const { user } = await signInWithEmailAndPassword(getAuth(app), c.email, c.password);
    const id = e.VITE_FIREBASE_DATABASE_ID;
    return { app, db: !id || id === "(default)" ? getFirestore(app) : getFirestore(app, id), uid: user.uid };
  } catch { await deleteApp(app); return null; }
}

/** Remove the account whole. Returns what it removed; `existed: false` means sign-in failed (never created). */
export async function removeAccount(c: Creds): Promise<{ existed: boolean; docs: number; failed: number }> {
  const s = await open(c);
  if (!s) return { existed: false, docs: 0, failed: 0 };
  let docs = 0, failed = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const del = async (ref: any) => { try { await deleteDoc(ref); docs++; } catch { failed++; } };
  for (const store of STORES) {
    const snap = await getDocs(collection(s.db, "users", s.uid, store)).catch(() => null);
    for (const d of snap?.docs ?? []) {
      for (const sub of SUBS[store] ?? []) for (const x of (await getDocs(collection(d.ref, sub)).catch(() => null))?.docs ?? []) await del(x.ref);
      await del(d.ref);
    }
  }
  await del(doc(s.db, "users", s.uid));
  try { await deleteUser(getAuth(s.app).currentUser!); } catch { failed++; }
  await deleteApp(s.app);
  return { existed: true, docs, failed };
}

/** True when the account can still sign in — the post-run sweep's check that nothing was left behind. */
export async function stillExists(c: Creds): Promise<boolean> { const s = await open(c); if (s) await deleteApp(s.app); return !!s; }

/* ───────── J3's campaign: written with the fresh account's own sign-in, so the dev rules judge every document ───────── */
const isoDaysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString().slice(0, 10) + "T12:00:00.000Z";
export const CAMPAIGN = {
  ms: "pfj-ms",
  agents: [
    { id: "pfj-a1", name: "Harriet Quill", agency: "Quill & Moss" },
    { id: "pfj-a2", name: "Owen Brask", agency: "Brask Literary" },
    { id: "pfj-a3", name: "Lena Ostrow", agency: "Ostrow Bell" },
    { id: "pfj-a4", name: "Felix Darrow", agency: "Darrow House" },
  ],
  queries: [
    { id: "pfj-q1", agent: "pfj-a1", status: "Queried", dates: { dateSent: 70 } },                               // past the window: a nudge
    { id: "pfj-q2", agent: "pfj-a2", status: "Queried", dates: { dateSent: 12 } },                               // inside the window: a reply arrives
    { id: "pfj-q3", agent: "pfj-a3", status: "Full Requested", dates: { dateSent: 40, partialRequestedDate: 30, partialSentDate: 25, fullRequestedDate: 4 } }, // send the full
    { id: "pfj-q4", agent: "pfj-a4", status: "Partial Sent", dates: { dateSent: 50, partialRequestedDate: 35, partialSentDate: 30 } }, // closed, then undone
  ],
};
export async function seedCampaign(c: Creds): Promise<string> {
  const s = await open(c);
  if (!s) throw new Error("seedCampaign: the fresh account cannot sign in");
  const { setDoc: put } = await import("firebase/firestore");
  /* a denial names its document — a bare PERMISSION_DENIED says nothing about which of nine writes the rules refused */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const setDoc = async (ref: any, data: Record<string, unknown>) => { try { await put(ref, data); } catch (e) { throw new Error(`seedCampaign: ${ref.path.split("/").slice(2).join("/")} refused: ${String(e).slice(0, 120)}`); } };
  await setDoc(doc(s.db, "users", s.uid, "manuscripts", CAMPAIGN.ms), {
    id: CAMPAIGN.ms, userId: s.uid, title: "The Lantern Keeper", genre: "Literary Fiction", ageCategory: "Adult",
    wordCount: 85000, logline: "", status: "Querying", statusChangedDate: isoDaysAgo(80), comps: [], shelved: false,
  });
  for (const a of CAMPAIGN.agents) await setDoc(doc(s.db, "users", s.uid, "agents", a.id), {
    id: a.id, userId: s.uid, name: a.name, agency: a.agency, email: `${a.name.split(" ")[0].toLowerCase()}@example.com`,
    website: "", genres: ["Literary Fiction"], notes: "", agentNotes: "", mswlNotes: "", twitter: "", bluesky: "", instagram: "", socials: [],
    city: "London", country: "GB", submissionStatus: "Open", submissionMethod: "Email", responseTimeWeeks: 6, starRating: 4,
    noResponseMeansNo: false, setAside: false, importedNeedsReview: false, materialsWanted: ["Query letter", "Synopsis"], dateAdded: isoDaysAgo(90), lastCheckedDate: isoDaysAgo(10),
  });
  for (const q of CAMPAIGN.queries) await setDoc(doc(s.db, "users", s.uid, "queries", q.id), {
    id: q.id, userId: s.uid, agentId: q.agent, manuscriptId: CAMPAIGN.ms, status: q.status, sendMethod: "Email",
    personalisationNotes: "", packageId: "", ...Object.fromEntries(Object.entries(q.dates).map(([k, d]) => [k, isoDaysAgo(d)])),
  });
  const uid = s.uid; await deleteApp(s.app); return uid;
}
