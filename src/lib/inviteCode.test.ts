/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The beta invite gate — the client half.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { INVITE_REJECTED, looksLikeInviteCode, normaliseInviteCode } from "./inviteCode";

describe("normalising a typed code", () => {
  it("upper-cases and strips spaces", () => {
    expect(normaliseInviteCode("  sa-7f2k-qm19 ")).toBe("SA-7F2K-QM19");
  });

  /**
   * ⚠️ THE EM DASH IS NOT PEDANTRY. Copying a code out of a formatted email hands you an en or em
   * dash often enough to matter, and a code rejected for a character the writer cannot see is the
   * worst possible first impression of a product they were invited to.
   */
  it("folds every dash a mail client might substitute", () => {
    for (const dash of ["‐", "‑", "–", "—", "―", "−"]) {
      expect(normaliseInviteCode(`SA${dash}7F2K${dash}QM19`)).toBe("SA-7F2K-QM19");
    }
  });
});

describe("what reaches the server", () => {
  it("holds back an empty or trivially short code", () => {
    expect(looksLikeInviteCode("")).toBe(false);
    expect(looksLikeInviteCode("  ")).toBe(false);
    expect(looksLikeInviteCode("SA")).toBe(false);
  });

  it("lets a plausible one through", () => {
    expect(looksLikeInviteCode("SA-7F2K-QM19")).toBe(true);
  });

  /**
   * ⚠️ NOT A FORMAT CHECK. Bounds only — guessing the shape of a code here would reject a valid one
   * the day the format changes, and the server is the thing that actually knows.
   */
  it("does not insist on the example's shape", () => {
    expect(looksLikeInviteCode("EARLYBIRD")).toBe(true);
  });
});

describe("⚠️ one message for every failure", () => {
  /**
   * Wrong code and spent code read identically. Telling them apart turns the form into an oracle:
   * feed it codes and it reports which ones are real.
   */
  it("never distinguishes unknown from already-used", () => {
    expect(INVITE_REJECTED).toContain("isn't one of ours, or it's already been used");
    expect(INVITE_REJECTED).not.toMatch(/\balready used\b(?!.*one of ours)/);
  });

  it("the server returns the same sentence", () => {
    const fn = readFileSync(resolve(__dirname, "../../functions/src/inviteCode.ts"), "utf8");
    expect(fn).toContain("isn't one of ours, or it's already been used");
  });
});

describe("⚠️ the gate is server-side, and the client says so", () => {
  const client = readFileSync(resolve(__dirname, "inviteCode.ts"), "utf8");
  const auth = readFileSync(resolve(__dirname, "../components/Auth.tsx"), "utf8");

  /** A browser-only check gates nothing: the Auth SDK creates the account and anyone can call it. */
  it("the client module holds no codes and cannot reach the collection", () => {
    /* ⚠️ THE FIRST VERSION OF THIS ASSERTION WENT RED ON THE PLACEHOLDER. `SA-XXXX-XXXX` matches
       any regex for "a code-shaped string", because X is a letter — the same prefix trap this repo
       keeps meeting. The honest question is not "does a code-shaped string appear" but "can this
       module reach the store", and that has an exact answer. */
    expect(client).not.toContain("inviteCodes");
    for (const forbidden of ["firebase/firestore", "getDoc", "collection(", "doc("]) {
      expect(client).not.toContain(forbidden);
    }
  });

  it("signup redeems through the callable before creating the account", () => {
    const submit = auth.slice(auth.indexOf("const handleSubmit"), auth.indexOf("const handleGoogle"));
    expect(submit).toContain("redeemInviteCode");
    expect(submit.indexOf("redeemInviteCode")).toBeLessThan(submit.indexOf("await signup("));
  });

  /** The Google route is gated too — on the Create-account tab. Its known limit is in the comment. */
  it("the Google route redeems as well", () => {
    const google = auth.slice(auth.indexOf("const handleGoogle"));
    expect(google).toContain("redeemInviteCode");
  });
});
