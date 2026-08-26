/**
 * waitlistStore — every Firestore transaction the waitlist performs.
 *
 * Separated from the HTTP handler so it can be driven directly against the Firestore emulator.
 * The handler's job is method, origin, content-type, size and response shape; this file's job is
 * the data, and the data is where getting it wrong is expensive and invisible.
 *
 * ⚠️ EVERY DECISION THAT DEPENDS ON THE COUNTER HAPPENS INSIDE A TRANSACTION. Read-then-write
 * outside one means two simultaneous verifications both see 99, both take the last place, and the
 * founding hundred quietly becomes a hundred and one. There is no error, no log line and no way to
 * tell afterwards which of them was the extra — the only trace is a number that is one too high.
 *
 * ⚠️ AND FIRESTORE REQUIRES ALL READS BEFORE ALL WRITES. Each transaction below reads everything
 * it needs first, decides, then writes. Interleaving them throws at runtime, not at compile time.
 */

import type { firestore } from "firebase-admin";
import {
  CounterState, COUNTER_PATH, DEFAULT_CAP, RATELIMIT_COLLECTION, RATE_LIMIT_WINDOW_MS,
  VERIFY_TTL_MS, WaitlistSource, WaitlistStatus,
  emailHash, newVerifyToken, overRateLimit, rateLimitKey, readCounter, tokenHash, tokensMatch,
} from "./waitlistModel";

type Db = firestore.Firestore;
type Tx = firestore.Transaction;

/* ══════════════ Rate limiting ══════════════ */

/**
 * ⚠️ ITS OWN TRANSACTION, RUN BEFORE VALIDATION, AND IT COSTS A WRITE EVEN WHEN IT REFUSES. An
 * attacker who can spend attempts on malformed addresses for free has an unlimited oracle; the
 * limit has to bite on the ATTEMPT, not on the well-formed attempt.
 *
 * The window is baked into the document id, so yesterday's documents are inert and TTL-eligible
 * rather than one ever-growing counter per address.
 */
export const consumeRateLimit = async (
  db: Db, hashedIp: string, nowMs: number,
): Promise<{ allowed: boolean; countInWindow: number }> => {
  const ref = db.doc(`${RATELIMIT_COLLECTION}/${rateLimitKey(hashedIp, nowMs)}`);
  return db.runTransaction(async (tx: Tx) => {
    const snap = await tx.get(ref);
    const raw = snap.exists ? (snap.get("count") as unknown) : 0;
    const count = typeof raw === "number" && Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : 0;
    if (overRateLimit(count)) return { allowed: false, countInWindow: count };
    tx.set(ref, {
      count: count + 1,
      windowStart: Math.floor(nowMs / RATE_LIMIT_WINDOW_MS) * RATE_LIMIT_WINDOW_MS,
      /* A plain millisecond field so a TTL policy can be pointed at it without a schema change. */
      expiresAt: new Date(nowMs + 2 * RATE_LIMIT_WINDOW_MS),
    }, { merge: true });
    return { allowed: true, countInWindow: count + 1 };
  });
};

/* ══════════════ Reading the count ══════════════ */

/**
 * ⚠️ `null` WHEN THE DOCUMENT DOES NOT EXIST, rather than a zero. With the floor at 0 those two
 * would otherwise be the same payload, and an outage or a wiped database would render `0/100` —
 * a false claim about how many founding writers there are. Inside the transactions below a
 * missing counter genuinely does mean zero (it is created lazily on the first join), which is why
 * they keep using `readCounter` directly and only this reader distinguishes them.
 */
export const readCounterState = async (db: Db): Promise<CounterState | null> => {
  const snap = await db.doc(COUNTER_PATH).get();
  if (!snap.exists) return null;
  return readCounter(snap.data() as Record<string, unknown>);
};

/* ══════════════ Joining ══════════════ */

export interface JoinArgs {
  emailNormalised: string;
  hashedIp: string | null;
  source: WaitlistSource;
  nowMs: number;
  /** When false a join verifies immediately — see `REQUIRE_VERIFICATION` in the model. */
  requireVerification: boolean;
}

export interface JoinResult {
  /** `already` covers pending, verified and waiting alike — see below. */
  outcome: "joined" | "already" | "waiting";
  status: WaitlistStatus;
  position: number | null;
  counter: CounterState;
  /**
   * The plain token, returned ONLY when a new pending document was created, so the caller can put
   * it in an email. It is never stored in plain and never returned to the browser.
   */
  verifyToken?: string;
}

/**
 * ⚠️ ONE NEUTRAL ANSWER FOR EVERY EXISTING ADDRESS. Pending, verified and waiting all return
 * `already`, because an unauthenticated caller who can tell them apart has an oracle: feed it
 * addresses and it reports which are registered and how far along. The reader who genuinely
 * signed up twice is told the true and useful thing — they are already on the list.
 */
export const joinWaitlist = async (db: Db, args: JoinArgs): Promise<JoinResult> => {
  const { emailNormalised, hashedIp, source, nowMs, requireVerification } = args;
  const sRef = db.doc(`waitlist/${emailHash(emailNormalised)}`);
  const cRef = db.doc(COUNTER_PATH);
  const now = new Date(nowMs);

  return db.runTransaction(async (tx: Tx) => {
    /* Reads first, all of them. */
    const [sSnap, cSnap] = await Promise.all([tx.get(sRef), tx.get(cRef)]);
    const counter = readCounter(cSnap.exists ? (cSnap.data() as Record<string, unknown>) : undefined);

    if (sSnap.exists) {
      const status = (sSnap.get("status") as WaitlistStatus) ?? "verified";
      const position = (sSnap.get("position") as number | undefined) ?? null;
      /* Touching `lastInteractionAt` is what makes retention "since we last heard from you"
         rather than "since you first signed up". */
      tx.set(sRef, { lastInteractionAt: now }, { merge: true });
      return { outcome: "already" as const, status, position, counter };
    }

    const roomLeft = counter.verifiedCount < counter.cap;

    /* ── The cap is full: they join the plain waiting list, and are told so. ── */
    if (!roomLeft) {
      tx.set(sRef, {
        email: emailNormalised, emailNormalised,
        createdAt: now, lastInteractionAt: now,
        verified: false, status: "waiting" as WaitlistStatus,
        position: null, source, ...(hashedIp ? { ipHash: hashedIp } : {}),
      });
      return { outcome: "waiting" as const, status: "waiting" as WaitlistStatus, position: null, counter };
    }

    /* ── Double opt-in ON: a pending document and a token to email them. Not counted yet. ── */
    if (requireVerification) {
      const token = newVerifyToken();
      tx.set(sRef, {
        email: emailNormalised, emailNormalised,
        createdAt: now, lastInteractionAt: now,
        verified: false, status: "pending" as WaitlistStatus, position: null,
        verifyTokenHash: tokenHash(token),
        verifyTokenExpiresAt: new Date(nowMs + VERIFY_TTL_MS),
        source, ...(hashedIp ? { ipHash: hashedIp } : {}),
      });
      return {
        outcome: "joined" as const, status: "pending" as WaitlistStatus,
        position: null, counter, verifyToken: token,
      };
    }

    /* ── Double opt-in OFF: verified on the spot, which is today's behaviour. ── */
    const position = counter.verifiedCount + 1;
    tx.set(sRef, {
      email: emailNormalised, emailNormalised,
      createdAt: now, lastInteractionAt: now,
      verified: true, verifiedAt: now, status: "verified" as WaitlistStatus,
      position, source, ...(hashedIp ? { ipHash: hashedIp } : {}),
    });
    writeCounter(tx, cRef, counter, position, now);
    return {
      outcome: "joined" as const, status: "verified" as WaitlistStatus,
      position, counter: { ...counter, verifiedCount: position },
    };
  });
};

/**
 * ⚠️ AN EXPLICIT SET, NEVER `FieldValue.increment`. Increment on an absent field creates it at 1 —
 * so a counter carrying a legacy `count: 37` and no `verifiedCount` would restart at one and
 * silently lose thirty-six founding writers. Inside a transaction `read + 1` is safe, because
 * contention re-runs the whole thing.
 */
const writeCounter = (
  tx: Tx, cRef: firestore.DocumentReference, counter: CounterState, next: number, now: Date,
): void => {
  tx.set(cRef, { verifiedCount: next, cap: counter.cap || DEFAULT_CAP, updatedAt: now }, { merge: true });
};

/* ══════════════ Verifying ══════════════ */

export type VerifyOutcome =
  | { kind: "verified"; position: number; counter: CounterState }
  /** Verified after the cap filled — a real race with an honest answer. */
  | { kind: "waiting"; counter: CounterState }
  /** Already done. Clicking the link twice is not an error. */
  | { kind: "already"; position: number | null }
  | { kind: "expired" }
  | { kind: "unknown" };

/**
 * ⚠️ THE WHOLE DECISION IS ONE TRANSACTION, AND THIS IS THE PLACE THAT MATTERS. Re-reading the
 * counter, checking the cap, setting `verified`, assigning the position and raising the count are
 * one atomic step or they are a bug: two people clicking their links at the same moment both read
 * 99, both take place 100, and the cap is quietly breached with nothing in the logs.
 *
 * ⚠️ AND THE CAP IS RE-CHECKED HERE, NOT TRUSTED FROM THE JOIN. The join saw room; the inbox may
 * have taken a day. If it filled in between, the honest answer is to say so rather than to honour
 * a place that no longer exists.
 */
export const verifyWaitlist = async (
  db: Db, token: string, nowMs: number,
): Promise<VerifyOutcome> => {
  const hash = tokenHash(token);
  const cRef = db.doc(COUNTER_PATH);
  const now = new Date(nowMs);

  return db.runTransaction(async (tx: Tx) => {
    /* A single-field equality query needs no composite index. Reads first, as always. */
    const q = db.collection("waitlist").where("verifyTokenHash", "==", hash).limit(1);
    const [found, cSnap] = await Promise.all([tx.get(q), tx.get(cRef)]);
    if (found.empty) return { kind: "unknown" as const };

    const doc = found.docs[0];
    const storedHash = (doc.get("verifyTokenHash") as string) ?? "";
    /* Belt and braces: the query matched, but compare in constant time anyway. */
    if (!tokensMatch(storedHash, hash)) return { kind: "unknown" as const };

    const status = (doc.get("status") as WaitlistStatus) ?? "pending";
    if (status === "verified" || status === "waiting") {
      return { kind: "already" as const, position: (doc.get("position") as number | undefined) ?? null };
    }

    const expiresRaw = doc.get("verifyTokenExpiresAt") as { toMillis?: () => number } | Date | undefined;
    const expiresMs =
      expiresRaw instanceof Date ? expiresRaw.getTime()
      : typeof expiresRaw?.toMillis === "function" ? expiresRaw.toMillis()
      : 0;
    if (!expiresMs || expiresMs < nowMs) {
      /* ⚠️ THE TOKEN IS CLEARED ON EXPIRY, so a stale link cannot be replayed if the cap later
         moves. The document stays — they are still a person who asked to join. */
      tx.set(doc.ref, {
        lastInteractionAt: now,
        verifyTokenHash: null,
        verifyTokenExpiresAt: null,
      }, { merge: true });
      return { kind: "expired" as const };
    }

    const counter = readCounter(cSnap.exists ? (cSnap.data() as Record<string, unknown>) : undefined);

    if (counter.verifiedCount >= counter.cap) {
      tx.set(doc.ref, {
        status: "waiting" as WaitlistStatus, verified: false,
        lastInteractionAt: now, verifyTokenHash: null, verifyTokenExpiresAt: null,
      }, { merge: true });
      return { kind: "waiting" as const, counter };
    }

    const position = counter.verifiedCount + 1;
    tx.set(doc.ref, {
      verified: true, verifiedAt: now, status: "verified" as WaitlistStatus, position,
      lastInteractionAt: now,
      /* ⚠️ THE TOKEN IS SPENT. Leaving it usable makes a verify link a permanent credential. */
      verifyTokenHash: null, verifyTokenExpiresAt: null,
    }, { merge: true });
    writeCounter(tx, cRef, counter, position, now);
    return { kind: "verified" as const, position, counter: { ...counter, verifiedCount: position } };
  });
};

/* ══════════════ Unsubscribing ══════════════ */

/**
 * ⚠️ A VERIFIED UNSUBSCRIBE GIVES THE PLACE BACK, IN THE SAME TRANSACTION. Decrementing separately
 * would leave a window where the place is neither theirs nor available, and a crash inside it
 * loses a founding place permanently.
 */
export const unsubscribe = async (
  db: Db, emailNormalised: string, nowMs: number,
): Promise<{ found: boolean; wasVerified: boolean }> => {
  const sRef = db.doc(`waitlist/${emailHash(emailNormalised)}`);
  const cRef = db.doc(COUNTER_PATH);
  const now = new Date(nowMs);

  return db.runTransaction(async (tx: Tx) => {
    const [sSnap, cSnap] = await Promise.all([tx.get(sRef), tx.get(cRef)]);
    if (!sSnap.exists) return { found: false, wasVerified: false };
    const wasVerified = (sSnap.get("status") as WaitlistStatus) === "verified";
    const counter = readCounter(cSnap.exists ? (cSnap.data() as Record<string, unknown>) : undefined);

    tx.set(sRef, {
      status: "unsubscribed" as WaitlistStatus, verified: false, position: null,
      lastInteractionAt: now, verifyTokenHash: null, verifyTokenExpiresAt: null,
    }, { merge: true });
    if (wasVerified && counter.verifiedCount > 0) {
      writeCounter(tx, cRef, counter, counter.verifiedCount - 1, now);
    }
    return { found: true, wasVerified };
  });
};
