/**
 * redeemInviteCode — the founder's code gate, against a real Firestore (non-workspace v1, Phase 1).
 * `.emulator.spec.ts`: picked up only by `npm run test:functions` (vitest.config.emulator.ts under emulators:exec).
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import * as admin from "firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
/* ⚠️ THE SHARED HANDLE, not a second one (firestoreHandle.test.ts allows exactly one exempt spec). */
import { db } from "./firestore";
import { checkCode, freshLink, redeemCode, LINK_TTL_MS, FRESH_GAP_MS, MSG } from "./inviteCode";

beforeAll(() => {
  expect(process.env.FIRESTORE_EMULATOR_HOST, "run under `firebase emulators:exec` — npm run test:functions").toBeTruthy();
});
afterAll(async () => { await Promise.all(admin.apps.map((a) => a?.delete())); });

/* Own codes and accounts only: other specs share this emulator. */
const CODES = ["QH-TEST-0001", "QH-TEST-0002", "QH-TEST-0003", "QH-TEST-0004", "QH-TEST-0005"];
const UIDS = ["ic-maya", "ic-other"];
const NOW = Date.parse("2026-11-12T12:00:00Z");
beforeEach(async () => {
  await Promise.all(CODES.map((c) => db.doc(`inviteCodes/${c}`).delete()));
  await Promise.all(UIDS.map((u) => db.doc(`users/${u}/private/entitlement`).delete()));
});
const seed = (code: string, extra: Record<string, unknown> = {}) =>
  db.doc(`inviteCodes/${code}`).set({
    issuedToEmail: "maya@example.com", name: "Maya Ellison", foundingNo: 12,
    linkExpiresAt: Timestamp.fromMillis(NOW + LINK_TTL_MS), createdAt: Timestamp.fromMillis(NOW), ...extra,
  });
const accounts = async () => [{ uid: "ic-maya", email: "maya@example.com", createdMs: NOW }, { uid: "ic-other", email: "other@example.com", createdMs: NOW }];

describe("check: what a code is, changing nothing", () => {
  it("works, with the invited address, name and place", async () => {
    await seed(CODES[0]);
    expect(await checkCode(db, "qh-test-0001", { now: () => NOW })).toEqual({ status: "ok", email: "maya@example.com", name: "Maya Ellison", foundingNo: 12 });
    expect((await db.doc(`inviteCodes/${CODES[0]}`).get()).get("usedAt")).toBeUndefined();
  });
  /* Re-pointed (v1.1): the ref's three outcomes are now two — Nick ruled used and unrecognised one answer. */
  it("⚠️ used and unrecognised are ONE answer, byte-identical (and a malformed code too)", async () => {
    await seed(CODES[1], { usedAt: Timestamp.fromMillis(NOW) });
    const unknown = JSON.stringify(await checkCode(db, "QH-NOPE-0000", { now: () => NOW }));
    const used = JSON.stringify(await checkCode(db, CODES[1], { now: () => NOW }));
    const usedPastLink = JSON.stringify(await checkCode(db, CODES[1], { now: () => NOW + 3 * LINK_TTL_MS }));
    expect(unknown).toBe('{"status":"refused"}');
    expect(used).toBe(unknown);
    expect(usedPastLink).toBe(unknown); // a used code is never "expired"
    expect(JSON.stringify(await checkCode(db, "QH/../X"))).toBe(unknown);
  });
  it("an invite link past its 48 hours is expired — and the place is still held", async () => {
    await seed(CODES[2]);
    expect(await checkCode(db, CODES[2], { now: () => NOW + LINK_TTL_MS + 1 })).toEqual({ status: "expired", email: "maya@example.com", foundingNo: 12 });
  });
});

describe("fresh: a new 48-hour link for the same code", () => {
  it("pushes the date on, keeps the code unused, and hands the sender the invited address", async () => {
    await seed(CODES[2]);
    const sent: string[] = [];
    const later = NOW + 3 * LINK_TTL_MS;
    await freshLink(db, CODES[2], { now: () => later, sendFreshInvite: async (to) => { sent.push(to.email); } });
    expect(await checkCode(db, CODES[2], { now: () => later + 1000 })).toMatchObject({ status: "ok" });
    expect(sent).toEqual(["maya@example.com"]);
  });
  it("does nothing for a used code, and answers exactly as for an unknown one", async () => {
    await seed(CODES[3], { usedAt: Timestamp.fromMillis(NOW) });
    const sent: string[] = [];
    const used = await freshLink(db, CODES[3], { now: () => NOW, sendFreshInvite: async (to) => { sent.push(to.email); } });
    const unknown = await freshLink(db, "QH-NOPE-0000", { now: () => NOW, sendFreshInvite: async (to) => { sent.push(to.email); } });
    expect(sent).toEqual([]);
    expect(JSON.stringify(used)).toBe(JSON.stringify(unknown));
  });
});

describe("⚠️ fresh is rate-limited per code: one send in 10 minutes, five in a day — and the answer never says so", () => {
  const MIN = 60 * 1000;
  const run = async (at: number, sent: number[]) => freshLink(db, CODES[4], { now: () => at, sendFreshInvite: async () => { sent.push(at); } });
  const expiry = async () => ((await db.doc(`inviteCodes/${CODES[4]}`).get()).get("linkExpiresAt") as Timestamp).toMillis();

  it("the 2nd call within 10 minutes sends nothing, changes nothing, and answers identically", async () => {
    await seed(CODES[4]);
    const sent: number[] = [];
    const first = await run(NOW, sent);
    const afterFirst = await expiry();
    const second = await run(NOW + FRESH_GAP_MS - 1, sent);
    expect(sent).toEqual([NOW]);
    expect(await expiry()).toBe(afterFirst);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    await run(NOW + FRESH_GAP_MS, sent); // the gap has passed: this one sends
    expect(sent).toEqual([NOW, NOW + FRESH_GAP_MS]);
  });

  it("the 6th call in a day sends nothing and answers identically; the next day sends again", async () => {
    await seed(CODES[4]);
    const sent: number[] = [];
    const answers: string[] = [];
    for (let i = 0; i < 6; i++) answers.push(JSON.stringify(await run(NOW + i * 15 * MIN, sent)));
    expect(sent).toHaveLength(5);
    expect(sent).not.toContain(NOW + 5 * 15 * MIN);
    expect(new Set(answers).size).toBe(1);
    await run(NOW + 24 * 60 * MIN + 1, sent); // the first send has left the 24 hours
    expect(sent).toHaveLength(6);
  });
});

describe("redeem: signed in, single use, and the founding flag through the one setter", () => {
  it("marks the code used by this account and sets founding", async () => {
    await seed(CODES[0]);
    const out = await redeemCode(db, CODES[0], { uid: "ic-maya", email: "Maya@Example.com" }, { listUsers: accounts });
    expect(out).toEqual({ ok: true, founding: true });
    const code = (await db.doc(`inviteCodes/${CODES[0]}`).get()).data();
    expect(code).toMatchObject({ usedBy: "maya@example.com", usedByUid: "ic-maya" });
    const ent = (await db.doc("users/ic-maya/private/entitlement").get()).data();
    expect(ent).toMatchObject({ founding: true, foundingSource: "invite" });
  });
  it("the same account again is fine; another account is refused", async () => {
    await seed(CODES[0]);
    await redeemCode(db, CODES[0], { uid: "ic-maya", email: "maya@example.com" }, { listUsers: accounts });
    await expect(redeemCode(db, CODES[0], { uid: "ic-maya", email: "maya@example.com" }, { listUsers: accounts })).resolves.toMatchObject({ ok: true });
    await expect(redeemCode(db, CODES[0], { uid: "ic-other", email: "other@example.com" }, { listUsers: accounts })).rejects.toMatchObject({ code: "not-found", message: MSG.refused });
    expect((await db.doc("users/ic-other/private/entitlement").get()).exists).toBe(false);
  });
  it("⚠️ a code used by another account and an unknown code fail byte-identically (code, message, wire body)", async () => {
    await seed(CODES[0]);
    await redeemCode(db, CODES[0], { uid: "ic-maya", email: "maya@example.com" }, { listUsers: accounts });
    const caught = async (raw: string) => {
      try { await redeemCode(db, raw, { uid: "ic-other", email: "other@example.com" }, { listUsers: accounts }); }
      catch (e) {
        const h = e as { code: string; message: string; httpErrorCode: unknown; toJSON: () => unknown };
        return JSON.stringify({ code: h.code, message: h.message, http: h.httpErrorCode, wire: h.toJSON() });
      }
      throw new Error("expected a refusal");
    };
    const used = await caught(CODES[0]);
    expect(used).toBe(await caught("QH-NOPE-0000"));
    expect(used).toContain(MSG.refused);
  });
  it("an unknown code is refused and sets nothing", async () => {
    await expect(redeemCode(db, "QH-NOPE-0000", { uid: "ic-other", email: "other@example.com" }, { listUsers: accounts })).rejects.toMatchObject({ code: "not-found" });
    expect((await db.doc("users/ic-other/private/entitlement").get()).exists).toBe(false);
  });
});
