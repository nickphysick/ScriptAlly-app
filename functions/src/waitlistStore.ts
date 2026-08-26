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
  emailHash, mayResendConfirm, newVerifyToken, overRateLimit, rateLimitKey, readCounter,
  tokenHash, tokensMatch,
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
   * The plain token, returned ONLY when a pending document was created OR its confirmation is due
   * a resend, so the caller can put it in an email. Never stored in plain, never returned to the
   * browser, and absent whenever no confirmation should go out — which is what makes "send if
   * present" the whole of the caller's decision.
   */
  verifyToken?: string;
  /** The document id, so the caller can build the signed unsubscribe token without re-hashing. */
  docId: string;
}

/**
 * ⚠️ ONE NEUTRAL ANSWER FOR EVERY EXISTING ADDRESS. Pending, verified and waiting all return
 * `already`, because an unauthenticated caller who can tell them apart has an oracle: feed it
 * addresses and it reports which are registered and how far along. The reader who genuinely
 * signed up twice is told the true and useful thing — they are already on the list.
 */
export const joinWaitlist = async (db: Db, args: JoinArgs): Promise<JoinResult> => {
  const { emailNormalised, hashedIp, source, nowMs, requireVerification } = args;
  const docId = emailHash(emailNormalised);
  const sRef = db.doc(`waitlist/${docId}`);
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
      /* ⚠️ A PENDING DOCUMENT MAY BE DUE A FRESH CONFIRMATION, and only here can that be decided
         atomically. Past the throttle we mint a NEW token, replace the stored hash and stamp the
         send — so the old link dies with the old email, and a reader always has exactly one live
         confirmation. Inside the throttle, no token comes back and the caller sends nothing. */
      let verifyToken: string | undefined;
      if (status === "pending") {
        const lastRaw = sSnap.get("lastConfirmSentAt") as { toMillis?: () => number } | Date | undefined;
        const lastMs =
          lastRaw instanceof Date ? lastRaw.getTime()
          : typeof lastRaw?.toMillis === "function" ? lastRaw.toMillis()
          : null;
        if (mayResendConfirm(lastMs, nowMs)) {
          verifyToken = newVerifyToken();
          tx.set(sRef, {
            verifyTokenHash: tokenHash(verifyToken),
            verifyTokenExpiresAt: new Date(nowMs + VERIFY_TTL_MS),
            lastConfirmSentAt: now,
          }, { merge: true });
        }
      }
      return { outcome: "already" as const, status, position, counter, docId, verifyToken };
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
      return { outcome: "waiting" as const, status: "waiting" as WaitlistStatus, position: null, counter, docId };
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
        /* The throttle's clock starts when the first confirmation is issued, not when it lands. */
        lastConfirmSentAt: now,
        source, ...(hashedIp ? { ipHash: hashedIp } : {}),
      });
      return {
        outcome: "joined" as const, status: "pending" as WaitlistStatus,
        position: null, counter, docId, verifyToken: token,
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
      position, counter: { ...counter, verifiedCount: position }, docId,
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
  | { kind: "verified"; position: number; counter: CounterState; docId: string }
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
    /**
     * ⚠️ THIS BRANCH WAS UNREACHABLE UNTIL 26 Aug AND NOBODY KNEW. Every path that set `verified`
     * or `waiting` also nulled `verifyTokenHash`, which is the field this lookup queries on — so
     * a second click matched nothing and returned `unknown` two lines above. The test asserting
     * `already` had never run (its whole file failed to import in CI), so both halves were wrong
     * and neither could tell you. It returns before the counter is read: clicking twice cannot
     * take two places.
     */
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
        /* Spent, not erased — see the note on the verified path below. Someone who lands in the
           waiting list and clicks again is told `already`, not `unknown`. */
        lastInteractionAt: now, verifyTokenSpentAt: now, verifyTokenExpiresAt: null,
      }, { merge: true });
      return { kind: "waiting" as const, counter };
    }

    const position = counter.verifiedCount + 1;
    tx.set(doc.ref, {
      verified: true, verifiedAt: now, status: "verified" as WaitlistStatus, position,
      lastInteractionAt: now,
      /**
       * ⚠️ THE HASH SURVIVES AS A LOOKUP KEY. IT IS SPENT, NOT ERASED — and the reason is mail
       * security scanners. Outlook Safe Links, corporate gateways and some antivirus tools issue
       * a GET on every URL in an inbound email BEFORE the recipient sees it. Null the hash here
       * and the scanner's fetch IS the verification: it takes the founding place, and the
       * writer's own click finds nothing and is told `unknown`. That is not an edge case, it is
       * a routine failure mode of GET-based verification, and it would have hit a meaningful
       * share of founding writers.
       *
       * Keeping it makes verification IDEMPOTENT: the `already` branch above finds the record,
       * returns the position, and never touches the counter. The cap transaction still fires
       * exactly once, on the first transition.
       *
       * ⚠️ AND IT IS NOT A CREDENTIAL ANY MORE. `verifyTokenSpentAt` marks it used and the
       * `already` branch is reached before any expiry or cap logic, so a replay can only ever
       * learn "you are in" — and whoever holds the link got it from that mailbox, so there is
       * nothing there they did not already know.
       *
       * ⚠️ THE EXPIRED AND UNSUBSCRIBE PATHS STILL NULL IT, deliberately. Neither reached a
       * terminal "you are in" state, so for those a live hash really would be a replayable
       * credential.
       *
       * A retention job may null spent hashes after 90 days. None exists yet — do not read this
       * as a description of one that does.
       */
      verifyTokenSpentAt: now, verifyTokenExpiresAt: null,
    }, { merge: true });
    writeCounter(tx, cRef, counter, position, now);
    return { kind: "verified" as const, position, counter: { ...counter, verifiedCount: position }, docId: doc.id };
  });
};

/* ══════════════ Unsubscribing ══════════════ */

export interface UnsubscribeOutcome {
  /** False when the token authenticated a document that no longer exists. */
  found: boolean;
  /** True only on the transition that actually released a founding place. */
  released: boolean;
  /** Their status before this call — so the page can say "you were already off the list". */
  was: WaitlistStatus | null;
}

/**
 * ⚠️ ONLY A `verified` DOCUMENT DECREMENTS, AND ONLY ONCE. This is the one place in the feature
 * where getting it wrong is both invisible and permanent:
 *   · decrementing a `pending` or `waiting` document subtracts a place that was never taken, so
 *     the counter drifts DOWN and the cap admits more than a hundred founding writers;
 *   · not decrementing a `verified` one leaves the counter claiming a place that was released, so
 *     it drifts UP and eventually the list is "full" while real places sit empty;
 *   · decrementing twice on a repeated click does both at once.
 * Nothing ever reports any of these. The counter simply stops being the number of founding
 * writers, and the only symptom is a page quietly lying.
 *
 * ⚠️ IDEMPOTENT BY READING THE STATUS, NOT BY GUARDING THE CALLER. An unsubscribe link is in an
 * email; it will be clicked twice, prefetched by a scanner, and retried by a flaky connection. The
 * second call finds `unsubscribed`, changes nothing and reports `released: false` — so the
 * transition is what decrements, never the request.
 *
 * ⚠️ AND THE WHOLE OF IT IS ONE TRANSACTION. Releasing the place and lowering the count are the
 * same fact; a crash between two writes would leave one of them true.
 */
export const unsubscribeById = async (
  db: Db, docId: string, nowMs: number,
): Promise<UnsubscribeOutcome> => {
  const sRef = db.doc(`waitlist/${docId}`);
  const cRef = db.doc(COUNTER_PATH);
  const now = new Date(nowMs);

  return db.runTransaction(async (tx: Tx) => {
    const [sSnap, cSnap] = await Promise.all([tx.get(sRef), tx.get(cRef)]);
    if (!sSnap.exists) return { found: false, released: false, was: null };

    const was = (sSnap.get("status") as WaitlistStatus) ?? "verified";
    if (was === "unsubscribed") {
      /* Already off the list. Nothing to write and nothing to release — but it is not an error,
         and the page says so warmly rather than as a failure. */
      return { found: true, released: false, was };
    }

    const counter = readCounter(cSnap.exists ? (cSnap.data() as Record<string, unknown>) : undefined);
    const releases = was === "verified";

    tx.set(sRef, {
      status: "unsubscribed" as WaitlistStatus, verified: false, position: null,
      lastInteractionAt: now, unsubscribedAt: now,
      /* Both tokens die with the subscription. The signed unsubscribe token keeps working —
         it is derived, not stored — which is what makes a second click idempotent rather than
         `unknown`. */
      verifyTokenHash: null, verifyTokenExpiresAt: null,
    }, { merge: true });

    if (releases && counter.verifiedCount > 0) {
      writeCounter(tx, cRef, counter, counter.verifiedCount - 1, now);
    }
    return { found: true, released: releases, was };
  });
};

/**
 * ⚠️ KEPT FOR THE ADDRESS-KEYED PATH (the retention job and any future admin action). It is the
 * same transaction, entered by hashing an address instead of trusting a signed token.
 */
export const unsubscribe = async (
  db: Db, emailNormalised: string, nowMs: number,
): Promise<UnsubscribeOutcome> =>
  unsubscribeById(db, emailHash(emailNormalised), nowMs);
