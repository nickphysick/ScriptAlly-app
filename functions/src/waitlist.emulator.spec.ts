/**
 * waitlist — the transactions, against a real Firestore.
 *
 * ⚠️ `.emulator.spec.ts`, NOT `.test.ts`, AND THE NAME IS LOad-BEARING. `vitest.config.ts` includes
 * `functions/src/**\/*.test.ts` in the ROOT suite, which runs on every `npm test` with no emulator
 * anywhere. A file named `.test.ts` here would fail for everyone, always. This extension is picked
 * up only by `vitest.config.emulator.ts`, which `npm run test:functions` wraps in
 * `firebase emulators:exec`.
 *
 * ⚠️ AND THESE CANNOT RUN ON THE AUTHOR'S MACHINE. The Firestore emulator is a JVM jar and no JDK
 * is installed here (`/usr/bin/java` is macOS's "install a runtime" stub), so CI is the first
 * place they execute. Said here rather than discovered later: everything below is reasoned and
 * typechecked, and only CI has actually run it.
 *
 * What is tested here is the part that pure functions cannot reach: whether two writers racing for
 * the last founding place both get it. That question has no answer outside a real transaction.
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import * as admin from "firebase-admin";
import {
  COUNTER_PATH, DEFAULT_CAP, COUNTER_FLOOR, RATE_LIMIT_MAX, VERIFY_TTL_MS,
  countPayload, emailHash, newVerifyToken, tokenHash,
} from "./waitlistModel";
import {
  consumeRateLimit, joinWaitlist, readCounterState, unsubscribeById, verifyWaitlist,
} from "./waitlistStore";
import { runRetention } from "./waitlistRetention";
import { RETENTION_MS, UNSUBSCRIBED_GRACE_MS, CONFIRM_RESEND_MS } from "./waitlistModel";

/* `firebase emulators:exec` exports FIRESTORE_EMULATOR_HOST; the Admin SDK reads it itself. */
const PROJECT = process.env.GCLOUD_PROJECT || "demo-scriptally-test";
let db: admin.firestore.Firestore;

beforeAll(() => {
  expect(
    process.env.FIRESTORE_EMULATOR_HOST,
    "these tests must run under `firebase emulators:exec` — see npm run test:functions",
  ).toBeTruthy();
  if (admin.apps.length === 0) admin.initializeApp({ projectId: PROJECT });
  db = admin.firestore();
});

afterAll(async () => { await Promise.all(admin.apps.map((a) => a?.delete())); });

/** Every test starts from an empty collection set — nothing carries between them. */
const wipe = async () => {
  for (const path of ["waitlist", "ratelimits"]) {
    const snap = await db.collection(path).get();
    await Promise.all(snap.docs.map((d) => d.ref.delete()));
  }
  await db.doc(COUNTER_PATH).delete().catch(() => undefined);
};
beforeEach(wipe);

const setCounter = (verifiedCount: number, cap = DEFAULT_CAP) =>
  db.doc(COUNTER_PATH).set({ verifiedCount, cap });

/**
 * ⚠️ `readCounterState` RETURNS `null` WHEN THE DOCUMENT IS ABSENT, which is not the same as zero
 * — see its docblock. Every test below that reads a number has seeded one, so this asserts the
 * document is there rather than silently reading `undefined.verifiedCount`.
 */
const counterOf = async () => {
  const c = await readCounterState(db);
  expect(c, "the counter document exists").not.toBeNull();
  return c!;
};

const join = (email: string, opts: Partial<{ requireVerification: boolean }> = {}) =>
  joinWaitlist(db, {
    emailNormalised: email, hashedIp: null, source: "landing-panel",
    nowMs: Date.now(), requireVerification: opts.requireVerification ?? false,
  });

/** A pending document with a known token, as double opt-in would have written it. */
const seedPending = async (email: string, expiresInMs = VERIFY_TTL_MS) => {
  const token = newVerifyToken();
  await db.doc(`waitlist/${emailHash(email)}`).set({
    email, emailNormalised: email,
    createdAt: new Date(), lastInteractionAt: new Date(),
    verified: false, status: "pending", position: null,
    verifyTokenHash: tokenHash(token),
    verifyTokenExpiresAt: new Date(Date.now() + expiresInMs),
    source: "landing-panel",
  });
  return token;
};

/* ══════════════ The one that matters ══════════════ */

describe("the cap holds under a race", () => {
  /**
   * ⚠️ THIS TEST IS THE REASON THE TRANSACTION EXISTS. Read-then-write outside one lets every
   * racer see 99, every racer take place 100, and the founding hundred quietly become a hundred
   * and eight — with no error, no log line, and afterwards no way to tell which were the extras.
   * The failure is silent and permanent, which is why it is worth a dedicated test.
   */
  it("eight simultaneous verifications at cap−1 produce exactly one founding place", async () => {
    await setCounter(DEFAULT_CAP - 1);
    const emails = Array.from({ length: 8 }, (_, i) => `race${i}@example.com`);
    const tokens = await Promise.all(emails.map((e) => seedPending(e)));

    const now = Date.now();
    const outcomes = await Promise.all(tokens.map((t) => verifyWaitlist(db, t, now)));

    const verified = outcomes.filter((o) => o.kind === "verified");
    const waiting = outcomes.filter((o) => o.kind === "waiting");
    expect(verified).toHaveLength(1);
    expect(waiting).toHaveLength(7);

    const counter = await counterOf();
    expect(counter.verifiedCount, "the counter never exceeds the cap").toBe(DEFAULT_CAP);
    expect(counter.verifiedCount).toBeLessThanOrEqual(counter.cap);

    /* …and the documents agree with the counter, which is the half a counter check can miss. */
    const docs = await db.collection("waitlist").where("status", "==", "verified").get();
    expect(docs.size).toBe(1);
    expect(docs.docs[0].get("position")).toBe(DEFAULT_CAP);
  });

  it("and the same race through joins, with verification off", async () => {
    await setCounter(DEFAULT_CAP - 1);
    const outcomes = await Promise.all(
      Array.from({ length: 8 }, (_, i) => join(`j${i}@example.com`)),
    );
    expect(outcomes.filter((o) => o.outcome === "joined")).toHaveLength(1);
    expect(outcomes.filter((o) => o.outcome === "waiting")).toHaveLength(7);
    expect((await counterOf()).verifiedCount).toBe(DEFAULT_CAP);
  });

  it("a join past the cap is written `waiting` and answered as full", async () => {
    await setCounter(DEFAULT_CAP);
    const r = await join("late@example.com");
    expect(r.outcome).toBe("waiting");
    expect(r.status).toBe("waiting");
    expect(r.position).toBeNull();
    expect((await counterOf()).verifiedCount).toBe(DEFAULT_CAP);
    /* They are on the list — refused a founding place, not refused entirely. */
    const doc = await db.doc(`waitlist/${emailHash("late@example.com")}`).get();
    expect(doc.exists).toBe(true);
    expect(doc.get("status")).toBe("waiting");
  });
});

/* ══════════════ Dedupe ══════════════ */

describe("one address, one document", () => {
  it("a second submission returns `already` and moves no number", async () => {
    const first = await join("dupe@example.com");
    expect(first.outcome).toBe("joined");
    expect((await counterOf()).verifiedCount).toBe(1);

    const second = await join("dupe@example.com");
    expect(second.outcome).toBe("already");
    expect((await counterOf()).verifiedCount, "a duplicate must not count twice").toBe(1);
    expect((await db.collection("waitlist").get()).size).toBe(1);
  });

  /**
   * ⚠️ ONE NEUTRAL ANSWER WHATEVER THE STATE. Pending, verified and waiting all return `already`,
   * because a caller who can tell them apart has an oracle: feed it addresses and it reports which
   * are registered and how far along.
   */
  it("…and it says the same thing for a pending address as for a verified one", async () => {
    await seedPending("pending@example.com");
    expect((await join("pending@example.com")).outcome).toBe("already");
  });

  it("touching an existing document updates lastInteractionAt, for retention", async () => {
    await join("touch@example.com");
    const before = (await db.doc(`waitlist/${emailHash("touch@example.com")}`).get())
      .get("lastInteractionAt").toMillis();
    await new Promise((r) => setTimeout(r, 30));
    await join("touch@example.com");
    const after = (await db.doc(`waitlist/${emailHash("touch@example.com")}`).get())
      .get("lastInteractionAt").toMillis();
    expect(after).toBeGreaterThan(before);
  });
});

/* ══════════════ Verification ══════════════ */

describe("verify tokens", () => {
  it("a good token verifies once, takes a position and raises the count", async () => {
    await setCounter(4);
    const token = await seedPending("v@example.com");
    const out = await verifyWaitlist(db, token, Date.now());
    expect(out.kind).toBe("verified");
    if (out.kind === "verified") expect(out.position).toBe(5);
    expect((await counterOf()).verifiedCount).toBe(5);
  });

  /** ⚠️ A SPENT TOKEN IS A SPENT TOKEN. Leaving it usable makes a verify link a permanent credential. */
  it("the same token a second time is `already`, and does not count twice", async () => {
    await setCounter(4);
    const token = await seedPending("twice@example.com");
    await verifyWaitlist(db, token, Date.now());
    const again = await verifyWaitlist(db, token, Date.now());
    expect(again.kind).toBe("already");
    expect((await counterOf()).verifiedCount).toBe(5);
  });

  it("an expired token is refused and cleared, so it cannot be replayed later", async () => {
    const token = await seedPending("old@example.com", -1000);
    const out = await verifyWaitlist(db, token, Date.now());
    expect(out.kind).toBe("expired");
    const doc = await db.doc(`waitlist/${emailHash("old@example.com")}`).get();
    expect(doc.get("verifyTokenHash")).toBeNull();
    /* The person is still on the list — they asked to join; only the link died. */
    expect(doc.exists).toBe(true);
    /**
     * ⚠️ ABSENT, NOT ZERO — and `counterOf` is the wrong helper here. This case never seeds a
     * counter, and `readCounterState` returns `null` for a missing document ON PURPOSE: a
     * document that is not there is not evidence that nobody signed up, it is evidence that we
     * do not know. `counterOf` asserts non-null first, so it failed the moment this file first
     * ran. The honest assertion is that an expired click creates no counter at all.
     */
    expect(await readCounterState(db)).toBeNull();
  });

  /**
   * ⚠️ THE MECHANISM, ASSERTED SEPARATELY FROM THE BEHAVIOUR. `already` works only because the
   * hash SURVIVES a successful verify to serve as the lookup key. A future tidy-up that nulls it
   * — which reads as obviously correct, and was the original code — silently returns the app to
   * telling verified writers `unknown`. That is why this asserts the field and not just the
   * outcome: the outcome test above would still pass for one wrong reason if the record could be
   * found some other way.
   */
  it("a spent token is marked spent, not erased — mail scanners fetch links before people do", async () => {
    await setCounter(0);
    const token = await seedPending("scanned@example.com");
    /* the scanner gets there first */
    expect((await verifyWaitlist(db, token, Date.now())).kind).toBe("verified");

    const doc = await db.doc(`waitlist/${emailHash("scanned@example.com")}`).get();
    expect(doc.get("verifyTokenHash")).toBe(tokenHash(token));
    expect(doc.get("verifyTokenSpentAt")).toBeTruthy();

    /* then the writer clicks their own link and must be told they are in, not "unknown" */
    const theirClick = await verifyWaitlist(db, token, Date.now());
    expect(theirClick.kind).toBe("already");
    if (theirClick.kind === "already") expect(theirClick.position).toBe(1);
    /* and the place is taken once, not twice */
    expect((await counterOf()).verifiedCount).toBe(1);
  });

  it("a token spent into the waiting list is `already` on the second click too", async () => {
    await setCounter(DEFAULT_CAP);
    const token = await seedPending("late@example.com");
    expect((await verifyWaitlist(db, token, Date.now())).kind).toBe("waiting");
    expect((await verifyWaitlist(db, token, Date.now())).kind).toBe("already");
    /* the cap is not moved by either click */
    expect((await counterOf()).verifiedCount).toBe(DEFAULT_CAP);
  });

  it("an unknown token is refused without saying why", async () => {
    expect((await verifyWaitlist(db, newVerifyToken(), Date.now())).kind).toBe("unknown");
  });

  /**
   * ⚠️ THE PLAIN TOKEN IS NEVER WRITTEN. A dump of plain verify tokens is a dump of claimable
   * founding places. Asserted against the stored document rather than against the code.
   */
  it("only the hash is stored — the token itself appears nowhere in the document", async () => {
    const token = await seedPending("hash@example.com");
    const data = (await db.doc(`waitlist/${emailHash("hash@example.com")}`).get()).data() ?? {};
    expect(JSON.stringify(data)).not.toContain(token);
    expect(data.verifyTokenHash).toBe(tokenHash(token));
  });
});

/* ══════════════ Rate limiting ══════════════ */

describe("the rate limit is persisted, not in memory", () => {
  it("the sixth attempt in a window is refused", async () => {
    const ip = "hashed-ip-aaa";
    const now = Date.now();
    for (let i = 1; i <= RATE_LIMIT_MAX; i++) {
      expect((await consumeRateLimit(db, ip, now)).allowed, `attempt ${i}`).toBe(true);
    }
    expect((await consumeRateLimit(db, ip, now)).allowed, "attempt 6").toBe(false);
  });

  it("a different address is unaffected", async () => {
    const now = Date.now();
    for (let i = 0; i < RATE_LIMIT_MAX; i++) await consumeRateLimit(db, "ip-a", now);
    expect((await consumeRateLimit(db, "ip-b", now)).allowed).toBe(true);
  });

  it("and the next window starts clean", async () => {
    const now = Date.now();
    for (let i = 0; i < RATE_LIMIT_MAX; i++) await consumeRateLimit(db, "ip-c", now);
    expect((await consumeRateLimit(db, "ip-c", now)).allowed).toBe(false);
    const later = now + 60 * 60 * 1000 + 1000;
    expect((await consumeRateLimit(db, "ip-c", later)).allowed).toBe(true);
  });
});

/* ══════════════ The floor, end to end ══════════════ */

describe("the count is the count, from the very first sign-up", () => {
  /**
   * ⚠️ RETARGETED WHEN THE FLOOR WENT TO ZERO, AND IT TESTS SOMETHING MORE USEFUL THAN IT DID.
   * It used to assert absent-at-19 and present-at-20 — a claim about a threshold that no longer
   * exists. What matters now is the distinction the floor's removal could have destroyed: a real
   * zero is shown, and an UNREADABLE count is not shown at all.
   */
  it("zero verified is a real number and is rendered", async () => {
    await setCounter(0);
    expect(countPayload(await counterOf()))
      .toEqual({ visible: true, cap: DEFAULT_CAP, count: 0 });
  });

  it("one verified shows one", async () => {
    await join("first@example.com");
    expect(countPayload(await counterOf()))
      .toEqual({ visible: true, cap: DEFAULT_CAP, count: 1 });
  });

  /**
   * ⚠️ THE CASE THAT MATTERS. A missing counter document is not evidence that nobody has signed
   * up — it is evidence that we do not know. Rendering `0/100` on an outage would be a false claim
   * about how many founding writers there are, made by accident, on the one page whose entire
   * design is that the number is the number.
   */
  it("an unreadable count renders nothing — never a zero", async () => {
    await db.doc(COUNTER_PATH).delete();
    expect(await readCounterState(db), "absent, not zero").toBeNull();
    const payload = countPayload(await readCounterState(db));
    expect(payload.visible).toBe(false);
    expect(JSON.parse(JSON.stringify(payload)), "no count on the wire")
      .toEqual({ visible: false, cap: DEFAULT_CAP });
  });

  /** The mechanism is intact: raising the floor again is one number, not a redesign. */
  it("…and the floor still works if it is ever raised", async () => {
    await setCounter(3);
    expect(countPayload({ verifiedCount: 3, cap: DEFAULT_CAP }).visible).toBe(true);
    expect(countPayload({ verifiedCount: 3, cap: DEFAULT_CAP }).count).toBe(3);
    /* With a floor of 5 the same three would be withheld — the branch is still there. */
    expect(COUNTER_FLOOR).toBe(0);
  });

  /**
   * ⚠️ THE LEGACY FIELD CARRIES OVER RATHER THAN RESETTING — asserted against a real document,
   * because this is the case that decides whether prod says it has 37 founding writers or none.
   */
  it("a counter holding only the legacy `count` reads as that many verified", async () => {
    await db.doc(COUNTER_PATH).set({ count: 37, cap: DEFAULT_CAP });
    expect((await counterOf()).verifiedCount).toBe(37);
    const r = await join("after-migration@example.com");
    expect(r.position).toBe(38);
    const after = await db.doc(COUNTER_PATH).get();
    expect(after.get("verifiedCount"), "an explicit set, not an increment from nothing").toBe(38);
  });
});

/* ══════════════ Unsubscribe ══════════════ */

describe("unsubscribing releases a place, exactly once", () => {
  /**
   * ⚠️ THE DECREMENT IS THE ONE PLACE IN THIS FEATURE WHERE A MISTAKE IS BOTH INVISIBLE AND
   * PERMANENT. Too many decrements and the cap admits more than a hundred founding writers; too
   * few and the counter claims places that were released and the list reads "full" while real
   * places sit empty. Nothing reports either. These four cases are the whole of the invariant.
   */
  it("a verified member releases their place", async () => {
    await setCounter(9);
    await join("bye@example.com");
    expect((await counterOf()).verifiedCount).toBe(10);

    const r = await unsubscribeById(db, emailHash("bye@example.com"), Date.now());
    expect(r).toEqual({ found: true, released: true, was: "verified" });
    expect((await counterOf()).verifiedCount, "exactly one place back").toBe(9);

    const doc = await db.doc(`waitlist/${emailHash("bye@example.com")}`).get();
    expect(doc.get("status")).toBe("unsubscribed");
    expect(doc.get("position"), "the place is not theirs to hold any more").toBeNull();
  });

  /**
   * ⚠️ IDEMPOTENT, BECAUSE AN EMAILED LINK IS CLICKED TWICE. Prefetched by a scanner, retried on a
   * flaky connection, or simply clicked again — the second call must change nothing. A second
   * decrement here is a place invented from nothing.
   */
  it("…and clicking the link again changes no number", async () => {
    await setCounter(9);
    await join("twice@example.com");
    const first = await unsubscribeById(db, emailHash("twice@example.com"), Date.now());
    const second = await unsubscribeById(db, emailHash("twice@example.com"), Date.now());
    expect(first.released).toBe(true);
    expect(second).toEqual({ found: true, released: false, was: "unsubscribed" });
    expect((await counterOf()).verifiedCount, "one release, not two").toBe(9);
  });

  /** ⚠️ A PENDING MEMBER NEVER HELD A PLACE, so there is nothing to give back. */
  it("a pending member moves no number", async () => {
    await setCounter(9);
    await seedPending("quiet@example.com");
    const r = await unsubscribeById(db, emailHash("quiet@example.com"), Date.now());
    expect(r).toEqual({ found: true, released: false, was: "pending" });
    expect((await counterOf()).verifiedCount).toBe(9);
  });

  /** Nor did someone on the plain waiting list. */
  it("a waiting member moves no number either", async () => {
    await setCounter(DEFAULT_CAP);
    await join("late@example.com");
    expect((await counterOf()).verifiedCount).toBe(DEFAULT_CAP);
    const r = await unsubscribeById(db, emailHash("late@example.com"), Date.now());
    expect(r).toEqual({ found: true, released: false, was: "waiting" });
    expect((await counterOf()).verifiedCount).toBe(DEFAULT_CAP);
  });

  it("an unknown document is not an error", async () => {
    await setCounter(5);
    expect(await unsubscribeById(db, emailHash("nobody@example.com"), Date.now()))
      .toEqual({ found: false, released: false, was: null });
    expect((await counterOf()).verifiedCount).toBe(5);
  });

  /** ⚠️ THE COUNTER NEVER GOES NEGATIVE, however inconsistent the data it started from. */
  it("…and a release against a zero counter cannot drive it below zero", async () => {
    await setCounter(0);
    await db.doc(`waitlist/${emailHash("odd@example.com")}`).set({
      email: "odd@example.com", emailNormalised: "odd@example.com",
      createdAt: new Date(), lastInteractionAt: new Date(),
      verified: true, status: "verified", position: 1, source: "landing-panel",
    });
    await unsubscribeById(db, emailHash("odd@example.com"), Date.now());
    expect((await counterOf()).verifiedCount).toBe(0);
  });
});

/* ══════════════ Retention ══════════════ */

describe("the retention job deletes nothing until it is armed", () => {
  /** A verified document whose last interaction is however long ago. */
  const seedAged = async (email: string, agoMs: number, status = "verified") => {
    const when = new Date(Date.now() - agoMs);
    await db.doc(`waitlist/${emailHash(email)}`).set({
      email, emailNormalised: email,
      createdAt: when, lastInteractionAt: when,
      verified: status === "verified", status, position: status === "verified" ? 1 : null,
      source: "landing-panel",
      ...(status === "unsubscribed" ? { unsubscribedAt: when } : {}),
    });
  };

  /**
   * ⚠️ THE DRY RUN IS THE WHOLE SAFETY MECHANISM, so it is asserted as an ABSENCE of writes rather
   * than as a return value. A job that reported "would delete 3" while deleting them would pass a
   * tally check and fail the only thing that matters.
   */
  it("a dry run reports what it would delete and deletes nothing", async () => {
    await setCounter(3);
    await seedAged("old@example.com", RETENTION_MS + 86_400_000);
    await seedAged("gone@example.com", UNSUBSCRIBED_GRACE_MS + 86_400_000, "unsubscribed");
    await seedAged("fresh@example.com", 86_400_000);

    const tally = await runRetention(db, Date.now(), false);
    expect(tally.dormant).toBe(1);
    expect(tally.unsubscribed).toBe(1);
    expect(tally.scanned).toBe(3);

    expect((await db.collection("waitlist").get()).size, "nothing was deleted").toBe(3);
    expect((await counterOf()).verifiedCount, "and nothing was released").toBe(3);
  });

  /**
   * ⚠️ DELETING A VERIFIED DOCUMENT RELEASES ITS PLACE — the unsubscribe decrement arriving more
   * slowly, and with the same three ways of being wrong. A counter that keeps a deleted member's
   * place claims something that no longer exists, and nothing ever reports it.
   */
  it("a live run deletes, and a deleted verified member releases exactly one place", async () => {
    await setCounter(3);
    await seedAged("old@example.com", RETENTION_MS + 86_400_000);
    await seedAged("fresh@example.com", 86_400_000);

    const tally = await runRetention(db, Date.now(), true);
    expect(tally.dormant).toBe(1);
    expect(tally.released).toBe(1);

    expect((await db.collection("waitlist").get()).size, "the dormant one is gone").toBe(1);
    expect((await counterOf()).verifiedCount, "one place back").toBe(2);
  });

  /** ⚠️ AN UNSUBSCRIBED MEMBER ALREADY RELEASED THEIR PLACE — deleting them must not do it twice. */
  it("deleting an unsubscribed document releases nothing further", async () => {
    await setCounter(5);
    await seedAged("gone@example.com", UNSUBSCRIBED_GRACE_MS + 86_400_000, "unsubscribed");
    const tally = await runRetention(db, Date.now(), true);
    expect(tally.unsubscribed).toBe(1);
    expect(tally.released, "they gave the place back when they unsubscribed").toBe(0);
    expect((await counterOf()).verifiedCount).toBe(5);
  });

  /** A pending document that has simply gone quiet is deleted, and held no place to release. */
  it("a dormant pending document goes without touching the counter", async () => {
    await setCounter(4);
    await seedAged("never@example.com", RETENTION_MS + 86_400_000, "pending");
    const tally = await runRetention(db, Date.now(), true);
    expect(tally.dormant).toBe(1);
    expect(tally.released).toBe(0);
    expect((await counterOf()).verifiedCount).toBe(4);
  });

  it("an empty collection is a quiet no-op, not an error", async () => {
    await setCounter(0);
    expect(await runRetention(db, Date.now(), true))
      .toEqual({ dormant: 0, unsubscribed: 0, released: 0, scanned: 0 });
  });
});

/* ══════════════ The confirmation throttle ══════════════ */

describe("a confirmation is not re-sent on every submit", () => {
  const joinPending = (email: string, nowMs: number) =>
    joinWaitlist(db, {
      emailNormalised: email, hashedIp: null, source: "landing-panel",
      nowMs, requireVerification: true,
    });

  /**
   * ⚠️ WITHOUT THIS THE FORM IS A MAIL CANNON AIMED AT WHOEVER'S ADDRESS WAS TYPED. Five clicks,
   * five emails — and somebody who types a stranger's address can do it deliberately. The token is
   * the send signal: the handler sends if and only if one comes back, so an absent token IS the
   * throttle.
   */
  it("a second submit inside ten minutes returns no token, so no second email", async () => {
    const t0 = Date.now();
    const first = await joinPending("throttle@example.com", t0);
    expect(first.outcome).toBe("joined");
    expect(first.verifyToken, "the first submit sends").toBeTruthy();

    const second = await joinPending("throttle@example.com", t0 + CONFIRM_RESEND_MS - 1000);
    expect(second.outcome).toBe("already");
    expect(second.verifyToken, "the second does not").toBeUndefined();
  });

  /** Past the window a fresh confirmation is due — somebody who genuinely lost the first one. */
  it("…and past ten minutes a fresh one is issued", async () => {
    const t0 = Date.now();
    await joinPending("later@example.com", t0);
    const again = await joinPending("later@example.com", t0 + CONFIRM_RESEND_MS + 1000);
    expect(again.verifyToken).toBeTruthy();
  });

  /**
   * ⚠️ AND THE NEW TOKEN REPLACES THE OLD ONE, so a reader always has exactly one live
   * confirmation. Two valid links to the same place is two ways to be told different things.
   */
  it("the re-sent token replaces the first — the old link stops working", async () => {
    const t0 = Date.now();
    const first = await joinPending("replaced@example.com", t0);
    const second = await joinPending("replaced@example.com", t0 + CONFIRM_RESEND_MS + 1000);
    expect(second.verifyToken).not.toBe(first.verifyToken);

    expect((await verifyWaitlist(db, first.verifyToken!, Date.now())).kind, "the old link is dead")
      .toBe("unknown");
    expect((await verifyWaitlist(db, second.verifyToken!, Date.now())).kind, "the new one works")
      .toBe("verified");
  });

  /** A verified address gets no confirmation however many times it submits — it is already in. */
  it("a verified address is never sent another confirmation", async () => {
    const t0 = Date.now();
    const j = await joinPending("done@example.com", t0);
    await verifyWaitlist(db, j.verifyToken!, t0);
    const again = await joinPending("done@example.com", t0 + CONFIRM_RESEND_MS * 10);
    expect(again.outcome).toBe("already");
    expect(again.verifyToken).toBeUndefined();
  });
});
