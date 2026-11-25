/**
 * App site v1, Phase 1 — the invite check on account creation (`inviteGate`, a `beforeUserCreated` blocking function).
 *
 * The rule: an account may be created only for an email that an UNUSED `inviteCodes` doc names — as `issuedToEmail`
 * (the address the invitation went to) or `allowedEmail` (the other address a code-holder chose on the invite screen).
 * Email sign-up, Google and a sign-in link all arrive here as the same event, so one check covers all three.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isInvited, gateDecision, allowEmailFor, NOT_INVITED, type InviteStore } from "./inviteGateCore";

type Doc = Record<string, unknown>;
const fake = (docs: Doc[], fail = false): InviteStore => ({
  collection: (name: string) => ({
    where: (field: string, _op: "==", value: string) => ({
      limit: () => ({
        get: async () => {
          if (fail) throw new Error("unavailable");
          if (name !== "inviteCodes") return { docs: [] };
          return { docs: docs.filter((d) => d[field] === value).map((d) => ({ get: (k: string) => d[k] })) };
        },
      }),
    }),
  }),
});

describe("isInvited — the source of truth is inviteCodes", () => {
  it("an unused code issued to the address lets it in, whatever its case and spaces", async () => {
    const s = fake([{ issuedToEmail: "writer@example.com" }]);
    expect(await isInvited(s, "writer@example.com")).toBe(true);
    expect(await isInvited(s, "  Writer@Example.COM ")).toBe(true);
  });
  it("a used code does not", async () => {
    expect(await isInvited(fake([{ issuedToEmail: "w@example.com", usedAt: { seconds: 1 } }]), "w@example.com")).toBe(false);
  });
  it("an address no code names does not", async () => {
    expect(await isInvited(fake([{ issuedToEmail: "w@example.com" }]), "stranger@example.com")).toBe(false);
  });
  it("the other address a code-holder chose lets it in while the code is unused", async () => {
    expect(await isInvited(fake([{ issuedToEmail: "w@example.com", allowedEmail: "other@example.com" }]), "Other@example.com")).toBe(true);
    expect(await isInvited(fake([{ issuedToEmail: "w@example.com", allowedEmail: "other@example.com", usedAt: 1 }]), "other@example.com")).toBe(false);
  });
  it("an expired LINK still lets the address in: the place is held (inviteCode.ts)", async () => {
    expect(await isInvited(fake([{ issuedToEmail: "w@example.com", linkExpiresAt: 1 }]), "w@example.com")).toBe(true);
  });
  it("no email (phone, anonymous) is never invited", async () => {
    const s = fake([{ issuedToEmail: "" }]);
    expect(await isInvited(s, null)).toBe(false);
    expect(await isInvited(s, "")).toBe(false);
    expect(await isInvited(s, "   ")).toBe(false);
  });
});

describe("gateDecision — what the blocking function does", () => {
  it("allows an invited address", async () => {
    expect(await gateDecision(fake([{ issuedToEmail: "w@example.com" }]), "w@example.com")).toEqual({ allow: true });
  });
  it("refuses everyone else with the marker the client looks for", async () => {
    expect(await gateDecision(fake([]), "w@example.com")).toEqual({ allow: false, reason: NOT_INVITED });
  });
  it("fails CLOSED when the invite list cannot be read", async () => {
    expect(await gateDecision(fake([], true), "w@example.com")).toEqual({ allow: false, reason: "unavailable" });
  });
  it("the marker is the client's (src/lib/notInvited.ts), byte for byte", () => {
    const client = readFileSync(resolve(__dirname, "../../src/lib/notInvited.ts"), "utf8");
    expect(client).toContain(`export const NOT_INVITED_MARK = "${NOT_INVITED}";`);
  });
});

describe("the blocking function is wired", () => {
  const src = (f: string) => readFileSync(resolve(__dirname, f), "utf8");
  it("is exported from index.ts", () => {
    expect(src("index.ts")).toMatch(/export \{ inviteGate \} from "\.\/inviteGate";/);
  });
  it("is a beforeUserCreated trigger in europe-west2 that reads the named database through ./firestore", () => {
    const g = src("inviteGate.ts");
    expect(g).toMatch(/beforeUserCreated\(\s*\{\s*region: "europe-west2"/);
    expect(g).toContain('import { db } from "./firestore";');
    expect(g).toMatch(/throw new HttpsError\("permission-denied", NOT_INVITED\)/);
  });
});

describe("allowEmailFor — the other address, recorded on an unused code", () => {
  const NOW = 1_000_000;
  it("an unused, unexpired code records the address, lower-cased", () => {
    expect(allowEmailFor({ exists: true, usedAt: null, linkExpiresAt: NOW + 1 }, " New@Example.com ", NOW)).toEqual({ write: "new@example.com" });
  });
  it("a used, missing or expired code records nothing", () => {
    expect(allowEmailFor({ exists: true, usedAt: 5, linkExpiresAt: NOW + 1 }, "a@b.co", NOW)).toEqual({ write: null });
    expect(allowEmailFor({ exists: false, usedAt: null, linkExpiresAt: null }, "a@b.co", NOW)).toEqual({ write: null });
    expect(allowEmailFor({ exists: true, usedAt: null, linkExpiresAt: NOW - 1 }, "a@b.co", NOW)).toEqual({ write: null });
  });
  it("something that is not an email address records nothing", () => {
    expect(allowEmailFor({ exists: true, usedAt: null, linkExpiresAt: null }, "not an email", NOW)).toEqual({ write: null });
    expect(allowEmailFor({ exists: true, usedAt: null, linkExpiresAt: null }, 42, NOW)).toEqual({ write: null });
  });
});
