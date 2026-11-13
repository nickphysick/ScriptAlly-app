/**
 * sendContactMessage — the contact form's send path, against a real Firestore (non-workspace v1.1, 13 Nov).
 *
 * ⚠️ THE DELIVERY IS STUBBED. `handleContactMessage` takes `deliver` as a dependency; every case but
 * the last passes a spy, so what reaches "the desk" is read off the spy and nothing lands in
 * `contactMessages`. The rate limit's transaction is real (it is the part only an emulator can prove).
 * The last case runs the default delivery once and deletes what it wrote.
 *
 * `.emulator.spec.ts`: picked up only by `npm run test:functions` (vitest.config.emulator.ts under emulators:exec).
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import * as admin from "firebase-admin";
import { createHash } from "crypto";
/* ⚠️ THE SHARED HANDLE, not a second one (firestoreHandle.test.ts allows exactly one exempt spec). */
import { db } from "./firestore";
import { handleContactMessage, ContactRecord } from "./contactMessage";

beforeAll(() => {
  expect(process.env.FIRESTORE_EMULATOR_HOST, "run under `firebase emulators:exec` — npm run test:functions").toBeTruthy();
});
afterAll(async () => { await Promise.all(admin.apps.map((a) => a?.delete())); });

/* Own addresses only: other specs share this emulator. */
const EMAILS = ["cm-one@example.com", "cm-two@example.com", "cm-three@example.com", "cm-four@example.com"];
const senderDoc = (email: string) => db.doc(`contactSenders/${createHash("sha256").update(email).digest("hex")}`);
beforeEach(async () => { await Promise.all(EMAILS.map((e) => senderDoc(e).delete())); });

const NOW = Date.parse("2026-11-13T09:00:00Z");
const good = (over: Record<string, unknown> = {}) => ({
  name: "  Marianne Webb ", email: " CM-One@Example.com ", topic: "Something's broken",
  message: "The dates on my imported queries are a day out.\n\nPage: Queries", website: "", ...over,
});
const spy = () => {
  const got: ContactRecord[] = [];
  return { got, deliver: vi.fn(async (m: ContactRecord) => { got.push(m); }) };
};

describe("a real send", () => {
  it("delivers one message, tidied, with no uid for a signed-out sender", async () => {
    const s = spy();
    expect(await handleContactMessage(good(), undefined, { now: () => NOW, deliver: s.deliver })).toEqual({ ok: true });
    expect(s.got).toEqual([{
      name: "Marianne Webb", email: "cm-one@example.com", topic: "Something's broken",
      message: "The dates on my imported queries are a day out.\n\nPage: Queries",
    }]);
    expect((await senderDoc(EMAILS[0]).get()).get("lastSentMs"), "the throttle is recorded").toBe(NOW);
  });

  it("carries the uid when the sender is signed in", async () => {
    const s = spy();
    await handleContactMessage(good({ email: EMAILS[1] }), "cm-uid", { now: () => NOW, deliver: s.deliver });
    expect(s.got[0].uid).toBe("cm-uid");
  });

  it("accepts every topic the form offers", async () => {
    const topics = ["A question or an idea", "Something's broken", "Founding writer access", "Your data", "Something else"];
    const s = spy();
    let t = NOW;
    for (const topic of topics) {
      t += 60_000;
      await handleContactMessage(good({ email: EMAILS[2], topic }), undefined, { now: () => t, deliver: s.deliver });
    }
    expect(s.got.map((m) => m.topic)).toEqual(topics);
  });
});

describe("what is refused, and what is never written", () => {
  it("the honeypot reports success and delivers nothing, writing no throttle", async () => {
    const s = spy();
    expect(await handleContactMessage(good({ website: "http://spam" }), undefined, { now: () => NOW, deliver: s.deliver })).toEqual({ ok: true });
    expect(s.deliver).not.toHaveBeenCalled();
    expect((await senderDoc(EMAILS[0]).get()).exists).toBe(false);
  });

  it("a bad address, an empty message or an unknown topic is invalid-argument, and nothing is delivered", async () => {
    const s = spy();
    for (const over of [{ email: "webb at co uk" }, { message: "   " }, { topic: "Billing or account" }]) {
      await expect(handleContactMessage(good(over), undefined, { now: () => NOW, deliver: s.deliver }))
        .rejects.toMatchObject({ code: "invalid-argument" });
    }
    expect(s.deliver).not.toHaveBeenCalled();
  });

  it("a second message from one address inside 30 seconds is resource-exhausted; after it, it goes", async () => {
    const s = spy();
    await handleContactMessage(good(), undefined, { now: () => NOW, deliver: s.deliver });
    await expect(handleContactMessage(good(), undefined, { now: () => NOW + 29_999, deliver: s.deliver }))
      .rejects.toMatchObject({ code: "resource-exhausted" });
    expect(s.deliver).toHaveBeenCalledTimes(1);
    await handleContactMessage(good(), undefined, { now: () => NOW + 30_000, deliver: s.deliver });
    expect(s.deliver).toHaveBeenCalledTimes(2);
  });

  it("a delivery that throws is internal, with no detail for the caller", async () => {
    const deliver = vi.fn(async () => { throw new Error("desk unavailable"); });
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(handleContactMessage(good({ email: EMAILS[3] }), undefined, { now: () => NOW, deliver }))
      .rejects.toMatchObject({ code: "internal", message: "Something went wrong. Please try again." });
    quiet.mockRestore();
  });
});

describe("the default delivery", () => {
  it("writes the message to contactMessages", async () => {
    const marker = `cm-default-${Date.now()}`;
    await handleContactMessage(good({ email: EMAILS[3], message: marker }), undefined, { now: () => NOW });
    const q = await db.collection("contactMessages").where("message", "==", marker).get();
    expect(q.size).toBe(1);
    const d = q.docs[0].data();
    expect(d).toMatchObject({ name: "Marianne Webb", email: EMAILS[3], topic: "Something's broken", message: marker });
    expect(d.uid).toBeUndefined();
    expect(d.createdAt).toBeTruthy();
    await Promise.all(q.docs.map((x) => x.ref.delete()));
  });
});
