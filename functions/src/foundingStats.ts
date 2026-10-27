/**
 * foundingStats — writes `foundingStats/{uid}` for every founding writer (Dashboard v93): their contributions, waiting
 * count, tier, next tier and standing, from the rules in `foundingContributions.ts`.
 *
 * ⚠️ COUNTING IS SERVER-SIDE BECAUSE A WRITER CAN READ ONLY THEIR OWN FEEDBACK — and a standing needs everyone's. The
 *    client reads only its own `foundingStats` doc (rules: owner or admin read, no client writes).
 * ⚠️ IT RECOMPUTES EVERY WRITER ON EVERY RUN. The volume is tiny (a hundred founding writers, a few notes a week each),
 *    and a full recompute cannot drift: a standing moves when ANYONE's total moves, so an incremental update would
 *    have to touch everyone anyway.
 * ⚠️ WHO IS A FOUNDING WRITER. No account carries a founding flag (the waitlist is keyed by email and never linked to a
 *    uid), and the card is shown to every signed-in writer, as v77's was. The writers that can HAVE contributions are
 *    exactly the uids on `betaFeedback` (the callable stamps the verified uid), so those are the population ranked here,
 *    plus anyone already holding a `foundingStats` doc (their peak is kept). A writer with no doc reads as 0.
 * ⚠️ A LEVEL NEVER GOES DOWN: the stored `peakTier` is read back and the shown tier is never below it.
 *
 * ⚠️ THE FOUNDING NUMBER (Dashboard v105) IS AN EMAIL JOIN, AND ONLY THAT. No account is linked to the waitlist, so each
 *    sign-in email is normalised and hashed exactly as the waitlist keys its docs (`waitlistModel`), and a `verified`
 *    entry's `position` becomes `foundingNo`. A writer with no proven place gets `foundingNo: null`. Writers who hold a
 *    place are added to the population so the number reaches them before their first note. `lastSentAt` is the newest
 *    note's `createdAt`.
 *
 * Runs on any `betaFeedback` write (a status set in the console) and nightly at 03:00 Europe/London.
 */
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { FieldValue, Timestamp, type Firestore } from "firebase-admin/firestore";
import { DATABASE_ID, db } from "./firestore";
import { getAuth } from "firebase-admin/auth";
import { computeAll, lastSentAt, placeFrom, TIERS, type FeedbackFacts, type Place, type TierKey } from "./foundingContributions";
import { emailHash, normaliseEmail } from "./waitlistModel";

export const STATS_COLLECTION = "foundingStats";
const FEEDBACK = "betaFeedback";
const WAITLIST = "waitlist";

const toMs = (v: unknown): number | null => {
  if (v instanceof Timestamp) return v.toMillis();
  if (v instanceof Date) return v.getTime();
  if (typeof v === "number") return v;
  if (typeof v === "string") { const t = Date.parse(v); return Number.isNaN(t) ? null : t; }
  return null;
};
const isTier = (v: unknown): v is TierKey => typeof v === "string" && TIERS.some((t) => t.key === v);

export interface Account { uid: string; email?: string | null }
export interface RecomputeDeps { listUsers?: () => Promise<Account[]> }

/** Every sign-in account's uid and email (the Admin SDK pages through them; the volume is small). */
async function listAllUsers(): Promise<Account[]> {
  const out: Account[] = [];
  let token: string | undefined;
  do {
    const page = await getAuth().listUsers(1000, token);
    for (const u of page.users) out.push({ uid: u.uid, email: u.email ?? null });
    token = page.pageToken;
  } while (token);
  return out;
}

/** Read everything, compute everyone, write every stats doc. Returns how many were written. */
export async function recomputeFoundingStats(store: Firestore = db, deps: RecomputeDeps = {}): Promise<number> {
  const [feedback, stats, waitlist, accounts] = await Promise.all([
    store.collection(FEEDBACK).get(), store.collection(STATS_COLLECTION).get(), store.collection(WAITLIST).get(),
    (deps.listUsers ?? listAllUsers)(),
  ]);
  const docs: FeedbackFacts[] = feedback.docs.map((d) => {
    const x = d.data();
    return { uid: typeof x.uid === "string" ? x.uid : null, status: typeof x.status === "string" ? x.status : null, counted: typeof x.counted === "boolean" ? x.counted : null, message: typeof x.message === "string" ? x.message : null, createdAt: toMs(x.createdAt) };
  });
  const peaks = new Map<string, TierKey | null>(stats.docs.map((d) => [d.id, isTier(d.get("peakTier")) ? d.get("peakTier") : null]));
  const byHash = new Map(waitlist.docs.map((d) => [d.id, d]));
  const places = new Map<string, Place>();
  for (const a of accounts) {
    const email = normaliseEmail(a.email);
    if (!email) continue;
    const w = byHash.get(emailHash(email));
    const p = w ? placeFrom({ status: w.get("status"), position: w.get("position"), verifiedAt: toMs(w.get("verifiedAt")), createdAt: toMs(w.get("createdAt")) }) : null;
    if (p) places.set(a.uid, p);
  }
  const all = computeAll(docs, peaks, [...places.keys()]);
  const entries = [...all.entries()];
  const ts = (ms: number | null) => (ms == null ? null : Timestamp.fromMillis(ms));
  for (let i = 0; i < entries.length; i += 400) {
    const batch = store.batch();
    for (const [uid, s] of entries.slice(i, i + 400)) {
      const place = places.get(uid) ?? null;
      batch.set(store.collection(STATS_COLLECTION).doc(uid), {
        ...s, foundingNo: place?.foundingNo ?? null, joinedAt: ts(place?.joinedAt ?? null),
        lastSentAt: ts(lastSentAt(docs.filter((d) => d.uid === uid))), updatedAt: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
  }
  console.info(JSON.stringify({ event: "founding.stats", writers: entries.length, feedback: docs.length, places: places.size }));
  return entries.length;
}

export const foundingStatsOnFeedback = onDocumentWritten(
  { document: `${FEEDBACK}/{id}`, database: DATABASE_ID, region: "europe-west2", timeoutSeconds: 120, memory: "256MiB" },
  async () => { await recomputeFoundingStats(); },
);

export const foundingStatsNightly = onSchedule(
  { schedule: "0 3 * * *", timeZone: "Europe/London", region: "europe-west2", timeoutSeconds: 300, memory: "256MiB" },
  async () => { await recomputeFoundingStats(); },
);
