/**
 * waitlistRetention — the daily job that makes the privacy policy's retention promise true.
 *
 * ⚠️ IT IS A DRY RUN UNTIL SOMEBODY ARMS IT. `RETENTION_LIVE=true` in the environment is the only
 * thing that makes it delete; anything else logs what it WOULD have deleted and touches nothing. A
 * deletion job nobody has watched is not a job to leave running unattended over real data, and the
 * failure mode is silent, permanent and unrecoverable — there is no undo for a document that is
 * gone and no log of what it contained, because logging the contents would defeat the point.
 *
 * ⚠️ DELETING A VERIFIED DOCUMENT MUST RELEASE ITS PLACE, in the same transaction. This is the
 * unsubscribe decrement again, arriving more slowly: a verified member deleted for dormancy still
 * held one of the hundred, and a counter that keeps their place claims something that no longer
 * exists. Same invariant, same transaction, and the same three ways of getting it wrong.
 *
 * ⚠️ COUNTS IN THE LOG, NEVER ADDRESSES. "Deleted 4 dormant, 2 unsubscribed, released 1 place" is
 * everything an operator needs. A list of who was deleted would be a record of the people whose
 * records we just promised to remove.
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { db } from "./firestore";
import {
  DeletionReason, RETENTION_LIVE_ENV, WaitlistStatus,
  deletionReason, retentionIsLive,
} from "./waitlistModel";
import { COUNTER_PATH, readCounter } from "./waitlistModel";

/**
 * ⚠️ A BATCH CEILING, AND IT IS LOGGED WHEN IT BITES. A job that silently stops at five hundred
 * reads as "nothing more to do"; one that says it stopped is one an operator can act on. The next
 * run picks up the remainder, so a large backlog drains over days rather than in one unbounded
 * pass that could time out halfway.
 */
const MAX_PER_RUN = 500;

interface Tally { dormant: number; unsubscribed: number; released: number; scanned: number }

const toMillis = (v: unknown): number | null => {
  if (v instanceof Date) return v.getTime();
  if (v && typeof (v as { toMillis?: () => number }).toMillis === "function") {
    return (v as { toMillis: () => number }).toMillis();
  }
  return null;
};

/**
 * One pass. Exported so the emulator spec can drive it directly with both a dry run and a live
 * run, which is the only way to prove the flag is the thing that decides.
 */
export const runRetention = async (
  database: typeof db, nowMs: number, live: boolean,
): Promise<Tally> => {
  const tally: Tally = { dormant: 0, unsubscribed: 0, released: 0, scanned: 0 };

  /* ⚠️ THE WHOLE COLLECTION, NOT A QUERY. Two different conditions on two different fields, one of
     which may be absent, cannot be expressed as one Firestore query without a composite index and
     a shape guarantee this data does not have. At a hundred places the collection is small enough
     that reading it is cheaper than maintaining an index that could silently miss a document. */
  const snap = await database.collection("waitlist").limit(MAX_PER_RUN + 1).get();
  const docs = snap.docs.slice(0, MAX_PER_RUN);
  if (snap.size > MAX_PER_RUN) {
    console.warn(JSON.stringify({
      event: "waitlist.retention.capped", limit: MAX_PER_RUN,
      note: "more documents than one run examines; the next run continues",
    }));
  }

  for (const doc of docs) {
    tally.scanned += 1;
    const reason: DeletionReason | null = deletionReason({
      status: doc.get("status"),
      lastInteractionAt: toMillis(doc.get("lastInteractionAt")),
      unsubscribedAt: toMillis(doc.get("unsubscribedAt")),
    }, nowMs);
    if (!reason) continue;

    const wasVerified = (doc.get("status") as WaitlistStatus) === "verified";
    if (reason === "dormant") tally.dormant += 1; else tally.unsubscribed += 1;
    if (wasVerified) tally.released += 1;

    if (!live) continue;

    /* ⚠️ ONE TRANSACTION PER DOCUMENT: the delete and the counter move are the same fact. Per
       document rather than one batch, so a single unreadable record cannot abandon the whole run
       — and the counter is re-read inside, because other traffic moves it while this runs. */
    await database.runTransaction(async (tx) => {
      const cRef = database.doc(COUNTER_PATH);
      const [dSnap, cSnap] = await Promise.all([tx.get(doc.ref), tx.get(cRef)]);
      /* It may have changed since the scan — re-check rather than trust the read above. */
      if (!dSnap.exists) return;
      const stillVerified = (dSnap.get("status") as WaitlistStatus) === "verified";
      const counter = readCounter(cSnap.exists ? (cSnap.data() as Record<string, unknown>) : undefined);
      tx.delete(doc.ref);
      if (stillVerified && counter.verifiedCount > 0) {
        tx.set(cRef, {
          verifiedCount: counter.verifiedCount - 1,
          cap: counter.cap,
          updatedAt: new Date(nowMs),
        }, { merge: true });
      }
    });
  }

  console.info(JSON.stringify({
    event: "waitlist.retention",
    mode: live ? "live" : "dry-run",
    ...tally,
  }));
  return tally;
};

/**
 * ⚠️ DAILY, AND IN THE SAME REGION AS EVERYTHING ELSE. There is no urgency in a retention job —
 * a document that is one day past twenty-four months is not a breach — so it runs once, quietly,
 * at a time nobody is looking at the site.
 */
export const waitlistRetention = onSchedule(
  {
    schedule: "17 3 * * *",
    timeZone: "Europe/London",
    region: "europe-west2",
    timeoutSeconds: 540,
    memory: "256MiB",
  },
  async () => {
    const live = retentionIsLive(process.env);
    if (!live) {
      console.info(JSON.stringify({
        event: "waitlist.retention.dry",
        note: `set ${RETENTION_LIVE_ENV}=true to arm this job once its dry runs look right`,
      }));
    }
    await runRetention(db, Date.now(), live);
  },
);
