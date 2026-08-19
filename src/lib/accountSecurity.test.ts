/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * accountSecurity — the provider branch, and the two things the section must never claim.
 */
import { describe, it, expect } from "vitest";
import {
  passwordMode,
  federatedNames,
  federatedLine,
  signOutOtherSessions,
  PASSWORD_LAST_CHANGED_AVAILABLE,
  SESSION_REVOKE_UNAVAILABLE,
} from "./accountSecurity";

describe("passwordMode — which block the security section renders", () => {
  it("a password-only account gets the password block", () => {
    expect(passwordMode(["password"])).toBe("password");
  });

  /* ⚠️ THE BRANCH THAT MATTERS. A change-password form on a Google-only account is a control that
     cannot apply to anything the account has. */
  it("a Google-only account gets NO password block", () => {
    expect(passwordMode(["google.com"])).toBe("federated-only");
  });

  it("a linked account gets the password block AND names the provider", () => {
    expect(passwordMode(["password", "google.com"])).toBe("both");
    expect(passwordMode(["google.com", "password"])).toBe("both");
  });

  /* An account with no providers at all cannot have a password to change — the same branch as
     federated-only, and reaching it must not throw. */
  it("no providers reads as federated-only rather than crashing", () => {
    expect(passwordMode([])).toBe("federated-only");
  });
});

describe("federated names and the sentence that replaces the password field", () => {
  it("names the provider a reader will recognise, not its id", () => {
    expect(federatedNames(["google.com"])).toEqual(["Google"]);
    expect(federatedNames(["password", "google.com"])).toEqual(["Google"]);
  });

  it("passes an unknown provider id through rather than dropping it", () => {
    expect(federatedNames(["apple.com"])).toEqual(["apple.com"]);
  });

  it("states the provider and the account it belongs to", () => {
    expect(federatedLine(["google.com"], "writer@example.com")).toBe(
      "You sign in with Google, as writer@example.com.",
    );
  });

  it("drops the address rather than printing an empty one", () => {
    expect(federatedLine(["google.com"], null)).toBe("You sign in with Google.");
  });

  it("degrades to a true generic when the provider is unrecognised and unnamed", () => {
    expect(federatedLine([], null)).toBe("You sign in with an external provider.");
  });
});

/* ⚠️ TWO ABSENCES, ASSERTED. Both are things the design asks for that the system cannot honestly
   produce, and both would be easy for a later pass to "fix" by printing something plausible. */
describe("what the section must not claim", () => {
  it("there is no password-last-changed date, and the flag says so", () => {
    /* Firebase exposes creationTime and lastSignInTime only. Printing lastSignInTime under a
       "Last changed" label is a real date wearing the wrong name — the manuscripts "Added {date}"
       fault. A real line needs a stored passwordUpdatedAt written when the password changes. */
    expect(PASSWORD_LAST_CHANGED_AVAILABLE).toBe(false);
  });

  it("sign-out-everywhere reports a reason and NEVER resolves as success", async () => {
    const r = await signOutOtherSessions();
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("not-implemented");
  });

  it("and its message does not assert what else ends a session", () => {
    expect(SESSION_REVOKE_UNAVAILABLE).toContain("isn't available yet");
    for (const overclaim of ["password signs", "signs out every other", "in the meantime"]) {
      expect(SESSION_REVOKE_UNAVAILABLE).not.toContain(overclaim);
    }
  });
});
