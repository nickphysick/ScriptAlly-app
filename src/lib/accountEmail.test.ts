/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Non-workspace v1, 9c — the client wrapper: the server first, Firebase's own sender when the server cannot be used,
 * and a real refusal passed on rather than routed round. Fakes only: no Firebase app starts.
 */
import { describe, it, expect, vi } from "vitest";
import { requestAccountEmail, type AccountEmailDeps } from "./accountEmail";

const deps = (callError?: unknown) => {
  const d: AccountEmailDeps = {
    call: vi.fn(async () => { if (callError) throw callError; return { ok: true }; }),
    origin: () => "https://scriptally-app.web.app",
    firebase: { signin: vi.fn(async () => {}), reset: vi.fn(async () => {}), newEmail: vi.fn(async () => {}) },
  };
  return d;
};
const err = (code: string) => Object.assign(new Error(code), { code });

describe("requestAccountEmail", () => {
  it("asks the server first, with the kind, the payload and this origin; Firebase is not touched", async () => {
    const d = deps();
    expect(await requestAccountEmail("signin", { email: "maya@example.com" }, d)).toBe("server");
    expect(d.call).toHaveBeenCalledWith({ kind: "signin", email: "maya@example.com", origin: "https://scriptally-app.web.app" });
    expect(d.firebase.signin).not.toHaveBeenCalled();
  });

  for (const code of ["functions/unavailable", "functions/internal", "functions/not-found", "functions/failed-precondition"]) {
    it(`${code}: falls back to Firebase's own sender, so nobody is locked out`, async () => {
      const a = deps(err(code));
      expect(await requestAccountEmail("signin", { email: " maya@example.com " }, a)).toBe("firebase");
      expect(a.firebase.signin).toHaveBeenCalledWith("maya@example.com", "https://scriptally-app.web.app/signin-link");
      const b = deps(err(code));
      expect(await requestAccountEmail("reset", { email: "maya@example.com" }, b)).toBe("firebase");
      expect(b.firebase.reset).toHaveBeenCalledWith("maya@example.com");
      const c = deps(err(code));
      expect(await requestAccountEmail("newEmail", { newEmail: "new@example.com" }, c)).toBe("firebase");
      expect(c.firebase.newEmail).toHaveBeenCalledWith("new@example.com", "https://scriptally-app.web.app/account/profile");
    });
  }

  it("a network failure with no code falls back too", async () => {
    const d = deps(new TypeError("Failed to fetch"));
    expect(await requestAccountEmail("reset", { email: "maya@example.com" }, d)).toBe("firebase");
  });

  for (const code of ["functions/invalid-argument", "functions/resource-exhausted", "functions/already-exists", "functions/unauthenticated"]) {
    it(`${code}: a real answer, passed on, never routed round the limit or the check`, async () => {
      const d = deps(err(code));
      await expect(requestAccountEmail("newEmail", { newEmail: "new@example.com" }, d)).rejects.toMatchObject({ code });
      expect(d.firebase.newEmail).not.toHaveBeenCalled();
    });
  }

  it("emailChanged has no Firebase equivalent: a failure is 'none', never a throw", async () => {
    expect(await requestAccountEmail("emailChanged", {}, deps(err("functions/unavailable")))).toBe("none");
  });

  it("importing the module starts no Firebase app (the SDK loads only when a fallback runs)", async () => {
    const { readFileSync } = await import("node:fs");
    const s = readFileSync(new URL("./accountEmail.ts", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(s).not.toMatch(/^import [^\n]*from "(firebase\/auth|\.\/firebase)";/m);
    expect(s).toContain('"sendAccountEmail"');
  });
});
