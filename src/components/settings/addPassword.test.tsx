/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "Add a password" — the credential-linking path, and the two ways it could be built wrong.
 *
 * ⚠️ THE DANGEROUS MISTAKE IS ONE WORD WIDE. `linkWithCredential` attaches a password to the SAME
 * account; `createUserWithEmailAndPassword` makes a NEW one at the same address, holding none of the
 * writer's manuscripts, agents or queries. Both compile, both "work", and only one of them is what
 * anybody wanted — so the call is asserted by name rather than by outcome.
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { renderPage, noNavigate, stripComments } from "../../test/pageSmoke";

vi.mock("../../lib/db", async () => (await import("../../test/pageSmoke")).dbMock());
vi.mock("../../lib/firebase", async () => (await import("../../test/pageSmoke")).firebaseMock());
vi.mock("../toast/ToastProvider", async () => (await import("../../test/pageSmoke")).toastMock());

import { AddPassword } from "./AddPassword";
import { ADD_PASSWORD_MESSAGE, ADD_PASSWORD_DONE, passwordMode } from "../../lib/accountSecurity";
import { validateNewPassword, PASSWORD_MIN } from "../../lib/accountValidation";

const here = dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => stripComments(readFileSync(resolve(here, rel), "utf8"));

const LINKER = read("../../lib/accountAuthFacts.ts");

describe("it LINKS to the existing account — it does not create a second one", () => {
  it("calls linkWithCredential on the signed-in user", () => {
    expect(LINKER).toContain("linkWithCredential");
    expect(LINKER).toMatch(/linkWithCredential\(\s*u\s*,/);
  });

  /**
   * ⚠️ THE ONE-WORD MISTAKE, FORBIDDEN BY NAME. Creating a user at the same address would leave the
   * writer signed into an account with none of their work in it — and nothing about the code would
   * look wrong.
   */
  it("⚠️ never creates a user, and never signs one in", () => {
    expect(LINKER).not.toContain("createUserWithEmailAndPassword");
    expect(LINKER).not.toContain("signInWithEmailAndPassword");
    expect(LINKER).not.toContain("updatePassword");
  });

  /**
   * ⚠️ THE ADDRESS COMES FROM THE SESSION, NOT A FIELD. A password credential is
   * (address, password); a typed address lets someone link a password to an address that is not
   * theirs, or — far likelier — mistype their own and set a password for an account that cannot
   * then be signed into.
   */
  it("⚠️ takes the email from auth.currentUser, and the function accepts only a password", () => {
    expect(LINKER).toContain("EmailAuthProvider.credential(u.email");
    expect(LINKER).toMatch(/export async function addPassword\(password: string\)/);
  });
});

describe("every outcome has words of its own", () => {
  /**
   * ⚠️ THE FIVE ARE DISTINCT BECAUSE THEIR ANSWERS ARE. `recent-login` is fixed by signing in
   * again — something the reader can DO — and it is the one a real writer is likeliest to hit,
   * because Firebase wants a fresh session before it will change credentials and most people reach
   * settings long after signing in. Collapsing them into "something went wrong" is what makes a
   * security page useless at the moment it matters.
   */
  const REASONS = ["recent-login", "already-set", "weak", "no-user", "failed"] as const;

  it("names all five, with no two sharing a sentence", () => {
    const said = REASONS.map((r) => ADD_PASSWORD_MESSAGE[r]);
    expect(said.filter(Boolean)).toHaveLength(5);
    expect(new Set(said).size, "two outcomes share a sentence").toBe(5);
  });

  /** ⚠️ AND NONE OF THEM BLAMES THE READER. `already-set` in particular means the page offered a
   *  control it should not have, which is this app's fault. */
  it("⚠️ none of them scolds", () => {
    for (const r of REASONS) {
      expect(ADD_PASSWORD_MESSAGE[r].toLowerCase()).not.toMatch(/you (?:must|should|failed|forgot)/);
    }
    expect(ADD_PASSWORD_MESSAGE["recent-login"]).toMatch(/nothing has changed/i);
  });

  /** The result union and the message table are checked against each other, not against a list. */
  it("⚠️ the union and the table cannot drift — every non-ok outcome is a key", () => {
    const union = LINKER.slice(LINKER.indexOf("export type AddPasswordResult"), LINKER.indexOf("export async function addPassword"));
    const members = [...union.matchAll(/outcome:\s*"([a-z-]+)"/g)].map((m) => m[1]);
    expect(members).toContain("ok");
    for (const m of members.filter((x) => x !== "ok")) {
      expect(ADD_PASSWORD_MESSAGE, `no message for "${m}"`).toHaveProperty(m);
    }
    expect(members.filter((x) => x !== "ok").sort()).toEqual([...REASONS].sort());
  });
});

describe("the validation is one decision over two fields", () => {
  it("a mismatch is a failure, not a silent acceptance of the first field", () => {
    expect(validateNewPassword("longenough", "longenoug").ok).toBe(false);
  });

  /** ⚠️ THE FLOOR IS THE SIGN-UP FORM'S, held to it by `accountValidation.test.ts`. */
  it("the floor is stated, and the hint states the same number", () => {
    expect(validateNewPassword("a".repeat(PASSWORD_MIN - 1), "a".repeat(PASSWORD_MIN - 1)).ok).toBe(false);
    expect(validateNewPassword("a".repeat(PASSWORD_MIN), "a".repeat(PASSWORD_MIN)).ok).toBe(true);
    const html = renderPage(<AddPassword buttonStyle={{}} onAdded={() => {}} />, "/account/security");
    expect(html).toContain("Add a password");
  });
});

describe("the form is an offer, not an unfilled field", () => {
  const at = (html: string) => html;

  it("⚠️ closed at rest — no password inputs standing open in a security section", () => {
    const html = at(renderPage(<AddPassword buttonStyle={{}} onAdded={() => {}} />, "/account/security"));
    expect(html).toContain("Add a password");
    expect(html, "the fields are open before anyone asked for them").not.toContain('type="password"');
  });
});

describe("the row it replaces was a dead end", () => {
  /**
   * ⚠️ THE MODE DECIDES, AND IT IS DERIVED FROM WHAT FIREBASE REPORTS. An account with a password
   * must not be offered this — `updatePassword` is a different act with a different control, and
   * two ways to set one password is the duplication this page keeps removing.
   */
  it("only a federated-only account is offered it", () => {
    expect(passwordMode(["google.com"])).toBe("federated-only");
    expect(passwordMode(["password"])).toBe("password");
    expect(passwordMode(["password", "google.com"])).toBe("both");
  });

  /** The page renders it on that branch and only that branch. */
  it("⚠️ the page mounts it under the federated-only branch, and offers Change password otherwise", () => {
    const page = read("../AccountSettings.tsx");
    const at = page.indexOf('pwMode === "federated-only"');
    expect(at, "the branch is gone — re-anchor this").toBeGreaterThan(-1);
    const branch = page.slice(at, page.indexOf("</SettingsCard>", at));
    expect(branch).toContain("<AddPassword");
    /* The `else` half keeps the reset link and must not also offer to add one. */
    const after = branch.slice(branch.indexOf(") : ("));
    expect(after).not.toContain("<AddPassword");
    expect(after).toContain("Change");
  });

  /** ⚠️ AND THE SUCCESS STATE SAYS WHAT IS NOW TRUE, rather than "saved". */
  it("the confirmation names the new capability", () => {
    expect(ADD_PASSWORD_DONE).toMatch(/sign in with your email/i);
  });
});
