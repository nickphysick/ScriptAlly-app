/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v19.2 — TEMPORARY FIXTURES for the CL192 locks and shots. A plain module: importing a `.measure.ts`
 * would execute its cases in the importer.
 *
 * The harness account has no imported agents, no long-overdue replies and no agent closed with a reopening date, so
 * each lock seeds what it needs as `zz192-*` agents (and queries), and REMOVES them in the same run — with every
 * activity, task or flag that names them — so the account is exactly as it was. `withFixtures` throws if anything
 * `zz192-` is left behind.
 *
 * ⚠️ AN OVERDUE QUERY IS DATED TO THE MILLISECOND, NOT THE DAY. `rowDateLine` counts days as
 *    `round(|expected − now| / day)`; a date-only `dateSent` is UTC midnight, so the count would depend on the hour the
 *    lock runs (10.6 days rounds to 11). The send is written as a full ISO instant exactly (42 + N) days ago against a
 *    stated 6-week window, so the expected date is N days ago to the second, and the boundary fixtures (30 and 31) land
 *    on the side they name. The queries go on the manuscript the page is scoped to.
 */
import { collection, deleteDoc, doc, getDocs, setDoc } from "firebase/firestore";
import { harnessDb } from "./harnessDocs";
import { resolveScopedManuscript } from "../../src/lib/shellSidebar";
import { matcherAgentDoc } from "../../src/lib/importedAgent";

export const DAY = 86_400_000;
export const PREFIX = "zz192-";
export const WINDOW_WEEKS = 6;

export type FixKey = "mat" | "imp1" | "imp2" | "hand" | "shut" | "shutx" | "zero" | "none" | "one" | "both" | "od10" | "od30" | "od31" | "od400";
type Spec = { name: string; agency: string; extra: Record<string, unknown>; overdue?: number };
/** surnames early in the alphabet so the shots find them near the top of the list */
const SPECS: Record<FixKey, Spec> = {
  /* the column matcher's agent: written below as exactly what `matcherAgentDoc` builds (imported, not mirrored) */
  mat: { name: "Mabel Abbas", agency: "Abbas Literary", extra: {} },
  imp1: { name: "Imogen Abbott", agency: "Abbott & Lane", extra: { importedNeedsReview: true, responseTimeWeeks: 6 } },
  imp2: { name: "Isaac Abernethy", agency: "Abernethy Books", extra: { importedNeedsReview: true, responseTimeWeeks: 8 } },
  hand: { name: "Hattie Ackroyd", agency: "Ackroyd Literary", extra: { importedNeedsReview: false, responseTimeWeeks: 6 } },
  shut: { name: "Clara Adair", agency: "Adair Agency", extra: { submissionStatus: "Closed", reopensOn: new Date(Date.now() + 40 * DAY).toISOString(), responseTimeWeeks: 6 } },
  shutx: { name: "Cosmo Adeyemi", agency: "Adeyemi & Rowe", extra: { submissionStatus: "Closed", responseTimeWeeks: 6 } },
  zero: { name: "Zelda Agnew", agency: "Agnew Literary", extra: { responseTimeWeeks: 0 } },
  none: { name: "Nell Ahern", agency: "Ahern Books", extra: {} },
  one: { name: "Otto Aiken", agency: "Aiken House", extra: { responseTimeWeeks: 1 } },
  both: { name: "Bram Ainslie", agency: "Ainslie & Co", extra: { website: "https://ainslieandco.co.uk", responseTimeWeeks: 6 } },
  od10: { name: "Daisy Alcott", agency: "Alcott Agency", extra: { responseTimeWeeks: WINDOW_WEEKS }, overdue: 10 },
  od30: { name: "Dev Aldous", agency: "Aldous Literary", extra: { responseTimeWeeks: WINDOW_WEEKS }, overdue: 30 },
  od31: { name: "Dora Alford", agency: "Alford & Pike", extra: { responseTimeWeeks: WINDOW_WEEKS }, overdue: 31 },
  od400: { name: "Dex Allardyce", agency: "Allardyce Books", extra: { responseTimeWeeks: WINDOW_WEEKS }, overdue: 400 },
};
export const fixId = (k: FixKey) => `${PREFIX}${k}`;
export const fixQueryId = (k: FixKey) => `${PREFIX}q-${k}`;
export const fixName = (k: FixKey) => SPECS[k].name;
export const fixOverdue = (k: FixKey) => SPECS[k].overdue ?? null;

/** the manuscript the page is scoped to: the stored key, else the most recently created (AgentList's own rule) */
export async function scopedMs(stored: string | null): Promise<string | null> {
  const { db, uid } = await harnessDb();
  const mss = (await getDocs(collection(db, "users", uid, "manuscripts"))).docs.map((d) => ({ ...(d.data() as { createdDate?: string }), id: d.id }));
  return resolveScopedManuscript(mss, stored)?.id ?? null;
}

/** the expected date each overdue fixture was written against, for the lock to state */
export const expectedOf = (sentMs: number) => sentMs + WINDOW_WEEKS * 7 * DAY;

export async function seed(keys: FixKey[], msId: string | null): Promise<Record<string, number>> {
  const { db, uid } = await harnessDb();
  const now = Date.now();
  const sent: Record<string, number> = {};
  for (const k of keys) {
    const s = SPECS[k], id = fixId(k);
    if (k === "mat") {
      await setDoc(doc(db, "users", uid, "agents", id), {
        ...matcherAgentDoc({ name: s.name, agency: s.agency, email: "mabel@abbasliterary.co.uk" }),
        id, userId: uid, dateAdded: new Date(now - 30 * DAY).toISOString(), lastCheckedDate: new Date(now - 10 * DAY).toISOString(),
      });
      continue;
    }
    await setDoc(doc(db, "users", uid, "agents", id), {
      id, userId: uid, name: s.name, agency: s.agency,
      email: `${s.name.split(" ")[0].toLowerCase()}@${s.agency.toLowerCase().replace(/[^a-z]+/g, "")}.co.uk`,
      website: "", genres: ["Literary Fiction"], notes: "", agentNotes: "", mswlNotes: "",
      twitter: "", bluesky: "", instagram: "", socials: [], city: "London", country: "GB",
      submissionStatus: "Open", submissionMethod: "Email", noResponseMeansNo: false, setAside: false,
      materialsWanted: ["Query letter"], dateAdded: new Date(now - 30 * DAY).toISOString(), lastCheckedDate: new Date(now - 10 * DAY).toISOString(),
      ...s.extra,
    });
    if (s.overdue != null) {
      if (!msId) throw new Error("no scoped manuscript to put the overdue query on");
      const at = now - (WINDOW_WEEKS * 7 + s.overdue) * DAY;
      sent[k] = at;
      const qid = fixQueryId(k);
      await setDoc(doc(db, "users", uid, "queries", qid), {
        id: qid, userId: uid, agentId: id, manuscriptId: msId, dateSent: new Date(at).toISOString(),
        status: "Queried", sendMethod: "Email", personalisationNotes: "", packageId: "",
      });
    }
  }
  return sent;
}

const mentions = (o: unknown): boolean => JSON.stringify(o ?? null).includes(PREFIX);

/** remove every zz192- agent and query, and anything that names one; returns what it removed */
export async function clean(): Promise<string[]> {
  const { db, uid } = await harnessDb();
  const gone: string[] = [];
  const del = async (path: string[]) => { await deleteDoc(doc(db, ...(path as [string, ...string[]]))); gone.push(path.slice(2).join("/")); };
  for (const q of (await getDocs(collection(db, "users", uid, "queries"))).docs) {
    if (!q.id.startsWith(PREFIX) && q.data().agentId?.startsWith?.(PREFIX) !== true) continue;
    for (const a of (await getDocs(collection(db, "users", uid, "queries", q.id, "activity"))).docs) await del(["users", uid, "queries", q.id, "activity", a.id]);
    await del(["users", uid, "queries", q.id]);
  }
  for (const c of ["activities", "tasks", "taskFlags"]) {
    for (const d of (await getDocs(collection(db, "users", uid, c))).docs) if (d.id.includes(PREFIX) || mentions(d.data())) await del(["users", uid, c, d.id]);
  }
  for (const a of (await getDocs(collection(db, "users", uid, "agents"))).docs) {
    if (!a.id.startsWith(PREFIX)) continue;
    for (const n of (await getDocs(collection(db, "users", uid, "agents", a.id, "notes"))).docs) await del(["users", uid, "agents", a.id, "notes", n.id]);
    await del(["users", uid, "agents", a.id]);
  }
  return gone;
}

export async function leftovers(): Promise<string[]> {
  const { db, uid } = await harnessDb();
  const left: string[] = [];
  for (const c of ["agents", "queries", "activities", "tasks", "taskFlags"]) {
    for (const d of (await getDocs(collection(db, "users", uid, c))).docs) if (d.id.includes(PREFIX) || mentions(d.data())) left.push(`${c}/${d.id}`);
  }
  return left;
}

/** seed, run, and always clean — then refuse to finish if anything zz192- survived */
export async function withFixtures<T>(keys: FixKey[], msId: string | null, fn: (sent: Record<string, number>) => Promise<T>): Promise<T> {
  await clean();
  try {
    const sent = await seed(keys, msId);
    return await fn(sent);
  } finally {
    await clean();
    const left = await leftovers();
    if (left.length) throw new Error(`CL192 fixtures were not all removed: ${left.join(", ")}`);
  }
}
