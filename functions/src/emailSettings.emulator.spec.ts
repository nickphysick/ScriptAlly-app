/**
 * emailSettings — the no-sign-in email settings page, against a real Firestore (non-workspace v1.1, item 5b).
 * `.emulator.spec.ts`: picked up only by `npm run test:functions` (vitest.config.emulator.ts under emulators:exec).
 *
 * Three locks: a valid token changes exactly that account's prefs (and not a neighbour's); a tampered token changes
 * nothing; an expired token changes nothing. Seeded users only; nothing is sent.
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import * as admin from "firebase-admin";
/* ⚠️ THE SHARED HANDLE, not a second one (firestoreHandle.test.ts allows exactly one exempt spec). */
import { db } from "./firestore";
import { applyEmailSettings } from "./emailSettings";
import { makeSettingsToken, SETTINGS_TOKEN_TTL_MS } from "./emailSettingsCore";

beforeAll(() => {
  expect(process.env.FIRESTORE_EMULATOR_HOST, "run under `firebase emulators:exec` — npm run test:functions").toBeTruthy();
});
afterAll(async () => { await Promise.all(admin.apps.map((a) => a?.delete())); });

const SECRET = "es-spec-secret";
const NOW = Date.parse("2026-11-13T09:00:00Z");
const ME = "es-maya";
const NEIGHBOUR = "es-neighbour";
const deps = (nowMs = NOW) => ({ secret: SECRET, nowMs, signInUrl: "https://scriptally-dev.web.app/account/emails#/login" });
const seeded = {
  email: "maya@example.com",
  notifyPrefs: { nudges: true, weeklyDigest: true, discover: true, scout: false, comps: false },
  marketingConsent: { granted: false, at: "2026-10-01T00:00:00.000Z" },
  name: "Maya",
};
beforeEach(async () => {
  await db.doc(`users/${ME}`).set(seeded);
  await db.doc(`users/${NEIGHBOUR}`).set({ ...seeded, email: "n@example.com" });
});
const read = async (uid: string) => (await db.doc(`users/${uid}`).get()).data();

describe("⚠️ a valid token changes exactly that account's prefs", () => {
  it("a Turn off link turns that one email off, keeps the rest of the map, and touches no other account", async () => {
    const t = makeSettingsToken(ME, SECRET, NOW)!;
    const view = await applyEmailSettings(db, t, { kind: "off", key: "nudges" }, deps(NOW + 1000));
    expect(view).toMatchObject({ kind: "ok", email: "maya@example.com", state: { nudges: false, weekly: true, news: false }, done: { key: "nudges", on: false } });
    expect((await read(ME))?.notifyPrefs).toEqual({ ...seeded.notifyPrefs, nudges: false });
    expect((await read(ME))?.marketingConsent).toEqual(seeded.marketingConsent); // untouched, its `at` kept
    expect((await read(ME))?.name).toBe("Maya");
    expect(await read(NEIGHBOUR)).toEqual({ ...seeded, email: "n@example.com" });
  });
  it("a switch on the page flips one email; product news is rewritten as { granted, at }", async () => {
    const t = makeSettingsToken(ME, SECRET, NOW)!;
    await applyEmailSettings(db, t, { kind: "flip", key: "news" }, deps(NOW + 5000));
    expect((await read(ME))?.marketingConsent).toEqual({ granted: true, at: new Date(NOW + 5000).toISOString() });
    await applyEmailSettings(db, t, { kind: "flip", key: "weekly" }, deps(NOW + 6000));
    expect((await read(ME))?.notifyPrefs).toEqual({ ...seeded.notifyPrefs, weeklyDigest: false });
    expect(await read(NEIGHBOUR)).toEqual({ ...seeded, email: "n@example.com" });
  });
  it("an account with no prefs stored writes the whole map at the client's defaults", async () => {
    await db.doc(`users/${ME}`).set({ email: "maya@example.com" });
    await applyEmailSettings(db, makeSettingsToken(ME, SECRET, NOW)!, { kind: "off", key: "weekly" }, deps());
    expect((await read(ME))?.notifyPrefs).toEqual({ nudges: true, weeklyDigest: false, discover: false, scout: false, comps: false });
    expect((await read(ME))?.marketingConsent).toBeUndefined();
  });
});

describe("⚠️ a tampered token changes nothing", () => {
  it("another uid under my signature, a bad signature, and a different secret all fail", async () => {
    const t = makeSettingsToken(ME, SECRET, NOW)!;
    const [, exp, sig] = t.split(".");
    const theirs = `${Buffer.from(NEIGHBOUR).toString("base64url")}.${exp}.${sig}`;
    const flipped = `${t.slice(0, -1)}${t.endsWith("A") ? "B" : "A"}`;
    const longer = `${t.split(".")[0]}.${Number(exp) + 999999}.${sig}`;
    const forged = makeSettingsToken(NEIGHBOUR, "not-the-secret", NOW)!;
    for (const bad of [theirs, flipped, longer, forged, "", "x.y.z"]) {
      expect(await applyEmailSettings(db, bad, { kind: "flip", key: "nudges" }, deps())).toEqual({ kind: "bad", signInUrl: deps().signInUrl });
    }
    expect(await read(ME)).toEqual(seeded);
    expect(await read(NEIGHBOUR)).toEqual({ ...seeded, email: "n@example.com" });
  });
});

describe("⚠️ an expired token changes nothing", () => {
  it("past its 60 days it is refused like a tampered one", async () => {
    const t = makeSettingsToken(ME, SECRET, NOW)!;
    const view = await applyEmailSettings(db, t, { kind: "off", key: "nudges" }, deps(NOW + SETTINGS_TOKEN_TTL_MS + 1000));
    expect(view.kind).toBe("bad");
    expect(await read(ME)).toEqual(seeded);
  });
});
