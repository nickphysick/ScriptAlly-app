/**
 * Sign out of other devices (non-workspace v1, Phase 5). A fake Auth that applies Firebase's own revocation rule:
 * a session is refused once it was issued before the account's `tokensValidAfterTime`.
 */
import { describe, it, expect } from "vitest";
import { signOutOthersCore } from "./signOutOthers";

function fakeAuth() {
  let clock = 1000;
  let validAfter = 0;
  const sessions = new Map<string, number>(); // session id → issued at
  const issue = (id: string) => { sessions.set(id, clock++); return id; };
  const accepted = (id: string) => (sessions.get(id) ?? -1) >= validAfter;
  return {
    issue, accepted,
    deps: {
      revokeRefreshTokens: async () => { validAfter = clock++; },
      createCustomToken: async () => issue(`fresh-${clock}`),
    },
  };
}

describe("other sessions are refused after sign-out-everywhere, and this one is not", () => {
  it("the laptop and the phone are out; the device that asked is back in on its fresh session", async () => {
    const a = fakeAuth();
    const laptop = a.issue("laptop"), phone = a.issue("phone"), here = a.issue("here");
    const { token } = await signOutOthersCore("u1", a.deps);
    expect(a.accepted(laptop)).toBe(false);
    expect(a.accepted(phone)).toBe(false);
    expect(a.accepted(here)).toBe(false); // the old session here too — which is why the client signs in with the token
    expect(a.accepted(token)).toBe(true);
  });
  it("refuses a caller who is not signed in, and revokes nothing", async () => {
    const a = fakeAuth();
    const laptop = a.issue("laptop");
    await expect(signOutOthersCore(undefined, a.deps)).rejects.toMatchObject({ code: "unauthenticated" });
    expect(a.accepted(laptop)).toBe(true);
  });
  it("mints the fresh session only after revoking", async () => {
    const order: string[] = [];
    await signOutOthersCore("u1", { revokeRefreshTokens: async () => { order.push("revoke"); }, createCustomToken: async () => { order.push("mint"); return "t"; } });
    expect(order).toEqual(["revoke", "mint"]);
  });
});
