/**
 * foundingStats — writes `foundingStats/{uid}` for every founding writer (Dashboard v93): their contributions, waiting
 * count, tier, next tier and standing, from the rules in `foundingContributions.ts`.
 *
 * ⚠️ COUNTING IS SERVER-SIDE BECAUSE A WRITER CAN READ ONLY THEIR OWN FEEDBACK — and a standing needs everyone's. The
 *    client reads only its own `foundingStats` doc (rules: owner or admin read, no client writes).
 * ⚠️ IT RECOMPUTES EVERY WRITER ON EVERY RUN. The volume is tiny (a hundred founding writers, a few notes a week each),
 *    and a full recompute cannot drift: a standing moves when ANYONE's total moves, so an incremental update would
 *    have to touch everyone anyway.
 * ⚠️ WHO IS A FOUNDING WRITER. Since plan rules v1 an account carries a server-written flag on
 *    `users/{uid}/private/entitlement` (`markFoundingFlags` below is its backstop). This ranking does not read it: the
 *    waitlist is keyed by email and never linked to a uid, and the card is shown to every signed-in writer, as v77's was. The writers that can HAVE contributions are
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
import { COUNTER_PATH, DEFAULT_CAP, emailHash, normaliseEmail } from "./waitlistModel";
import { planFoundingFlags } from "./foundingFlagPlan";

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

export interface Account { uid: string; email?: string | null; createdMs?: number | null }
export interface RecomputeDeps { listUsers?: () => Promise<Account[]> }

/** Every sign-in account's uid and email (the Admin SDK pages through them; the volume is small). */
export async function listAllUsers(): Promise<Account[]> {
  const out: Account[] = [];
  let token: string | undefined;
  do {
    const page = await getAuth().listUsers(1000, token);
    for (const u of page.users) {
      const t = Date.parse(u.metadata.creationTime);
      out.push({ uid: u.uid, email: u.email ?? null, createdMs: Number.isNaN(t) ? null : t });
    }
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
  await markFoundingFlags(store, accounts, waitlist.docs.filter((d) => d.get("status") === "verified").map((d) => d.id));
  return entries.length;
}

/**
 * Plan rules v1 — THE BACKSTOP FOR THE FOUNDING FLAG on `users/{uid}/private/entitlement`. Marks an account whose
 * sign-in email redeemed a founder's code or holds a verified waitlist place, when its flag is ABSENT and the cap
 * (`counters/waitlist.cap`, else `DEFAULT_CAP`) has room. Never unmarks. Each account refused by the cap is logged.
 * The rule is `foundingFlagPlan.ts`; this only reads and writes.
 */
export async function markFoundingFlags(store: Firestore, accounts: Account[], verifiedHashes: string[]): Promise<{ set: number; capped: number }> {
  const [entDocs, invites, counter] = await Promise.all([
    Promise.all(accounts.map((a) => store.doc(`users/${a.uid}/private/entitlement`).get())),
    store.collection("inviteCodes").get(),
    store.doc(COUNTER_PATH).get(),
  ]);
  const flags = new Map<string, boolean | undefined>(accounts.map((a, i) => {
    const v = entDocs[i].exists ? entDocs[i].get("founding") : undefined;
    return [a.uid, typeof v === "boolean" ? v : undefined];
  }));
  const invited = new Set(invites.docs.filter((d) => d.get("usedAt")).map((d) => normaliseEmail(d.get("usedBy"))).filter(Boolean));
  const hashes = new Set(verifiedHashes);
  const flagAccounts = accounts.map((a) => ({ uid: a.uid, email: normaliseEmail(a.email) || null, createdMs: a.createdMs ?? null }));
  const placed = new Set(flagAccounts.filter((a) => a.email && hashes.has(emailHash(a.email))).map((a) => a.email as string));
  const cap = typeof counter.get("cap") === "number" && counter.get("cap") > 0 ? (counter.get("cap") as number) : DEFAULT_CAP;
  const plan = planFoundingFlags(flagAccounts, flags, invited, placed, cap);
  for (let i = 0; i < plan.set.length; i += 400) {
    const batch = store.batch();
    for (const { uid, source } of plan.set.slice(i, i + 400)) {
      batch.set(store.doc(`users/${uid}/private/entitlement`), { founding: true, foundingSince: FieldValue.serverTimestamp(), foundingSource: source }, { merge: true });
    }
    await batch.commit();
  }
  for (const c of plan.capped) console.warn(JSON.stringify({ event: "founding.flag.capped", uid: c.uid, source: c.source, cap }));
  console.info(JSON.stringify({ event: "founding.flags", already: plan.already, set: plan.set.length, capped: plan.capped.length, cap }));
  return { set: plan.set.length, capped: plan.capped.length };
}

export const foundingStatsOnFeedback = onDocumentWritten(
  { document: `${FEEDBACK}/{id}`, database: DATABASE_ID, region: "europe-west2", timeoutSeconds: 120, memory: "256MiB" },
  async () => { await recomputeFoundingStats(); },
);

export const foundingStatsNightly = onSchedule(
  { schedule: "0 3 * * *", timeZone: "Europe/London", region: "europe-west2", timeoutSeconds: 300, memory: "256MiB" },
  async () => { await recomputeFoundingStats(); },
);
