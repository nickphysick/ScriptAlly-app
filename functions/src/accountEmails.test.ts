/**
 * Non-workspace v1, 9c — AE-1 to AE-4: the account emails' one server path (accountEmailsCore.ts), with fakes for the
 * Admin SDK, the rate limit, Firestore and the transport. Nothing here reaches a network or a Firebase project.
 *
 * AE-1 is the lock that matters: the two signed-out kinds answer the same, in the same time, for an address with an
 * account and one without — and for a disabled account, a spent rate limit, a failed send and an SDK error.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  AccountEmailDeps, AccountEmailError, MIN_ANSWER_MS, SAME_ANSWER, handleAccountEmail,
} from "./accountEmailsCore";

const ENV = { WAITLIST_PUBLIC_URL: "https://queryhawk.net", APP_PUBLIC_URL: "https://scriptally-app.web.app" };
const KNOWN = "maya@example.com";

type Spy = ReturnType<typeof vi.fn>;
interface Rig { deps: AccountEmailDeps; send: Spy; lookup: Spy; slept: number[]; clock: { t: number } }

const rig = (o: {
  known?: Record<string, { uid: string; disabled?: boolean }>;
  allow?: boolean; canSend?: boolean; sendOk?: boolean; sendMs?: number;
  lookupError?: unknown; env?: Record<string, string>;
  current?: string; pending?: { oldEmail: string; newEmail: string } | null;
} = {}): Rig => {
  const clock = { t: 1_000_000 };
  const slept: number[] = [];
  const known = o.known ?? { [KNOWN]: { uid: "u1" } };
  const lookup = vi.fn(async (email: string) => {
    if (o.lookupError) throw o.lookupError;
    const u = known[email];
    if (!u) throw Object.assign(new Error("no user"), { code: "auth/user-not-found" });
    return { uid: u.uid, email, disabled: u.disabled };
  });
  const send = vi.fn(async () => { clock.t += o.sendMs ?? 300; return o.sendOk === false ? { ok: false, reason: "http-500" } : { ok: true, id: "m" }; });
  const deps: AccountEmailDeps = {
    env: o.env ?? ENV,
    now: () => clock.t,
    sleep: async (ms) => { slept.push(ms); clock.t += ms; },
    canSend: () => o.canSend ?? true,
    auth: {
      getUserByEmail: lookup,
      getUser: vi.fn(async (uid: string) => ({ uid, email: o.current ?? KNOWN })),
      generateSignInWithEmailLink: vi.fn(async (_e: string, s: { url: string }) => `https://fb.example/action?mode=signIn&continueUrl=${encodeURIComponent(s.url)}`),
      generatePasswordResetLink: vi.fn(async () => "https://fb.example/action?mode=resetPassword"),
      generateVerifyAndChangeEmailLink: vi.fn(async () => "https://fb.example/action?mode=verifyAndChangeEmail"),
    },
    allow: vi.fn(async () => o.allow ?? true),
    send,
    pending: {
      put: vi.fn(async () => {}),
      take: vi.fn(async () => (o.pending === undefined ? null : o.pending)),
    },
  };
  return { deps, send, lookup, slept, clock };
};

beforeEach(() => {
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

const ask = (r: Rig, kind: string, data: Record<string, unknown>, uid: string | null = null) => {
  const start = r.clock.t;
  return handleAccountEmail({ kind, data, uid }, r.deps).then((answer) => ({ answer, took: r.clock.t - start }));
};

describe("AE-1 · a signed-out request never reveals whether an account exists", () => {
  for (const kind of ["signin", "reset"] as const) {
    it(`${kind}: known and unknown addresses get the same answer, in the same time; only the known one is emailed`, async () => {
      const a = rig(), b = rig();
      const known = await ask(a, kind, { email: KNOWN });
      const unknown = await ask(b, kind, { email: "nobody@example.com" });
      expect(known.answer).toBe(SAME_ANSWER);
      expect(unknown.answer).toBe(SAME_ANSWER);
      expect(known.took).toBe(MIN_ANSWER_MS);
      expect(unknown.took).toBe(MIN_ANSWER_MS);
      expect(a.send).toHaveBeenCalledTimes(1);
      expect(a.send.mock.calls[0][0]).toBe(KNOWN);
      expect(a.send.mock.calls[0][1]).toBe(kind);
      expect(b.send).not.toHaveBeenCalled();
    });

    it(`${kind}: a disabled account, a spent limit, a failed send and an SDK error all answer the same`, async () => {
      const cases: [string, Rig][] = [
        ["disabled", rig({ known: { [KNOWN]: { uid: "u1", disabled: true } } })],
        ["rate-limited", rig({ allow: false })],
        ["send failed", rig({ sendOk: false })],
        ["sdk error", rig({ lookupError: Object.assign(new Error("boom"), { code: "auth/internal-error" }) })],
      ];
      for (const [name, r] of cases) {
        const out = await ask(r, kind, { email: KNOWN });
        expect(out.answer, name).toBe(SAME_ANSWER);
        expect(out.took, name).toBe(MIN_ANSWER_MS);
      }
      expect(cases[0][1].send, "disabled: nothing sent").not.toHaveBeenCalled();
      expect(cases[1][1].lookup, "rate-limited: not even looked up").not.toHaveBeenCalled();
    });

    it(`${kind}: refusals happen BEFORE any lookup, so they are the same for every address`, async () => {
      const bad = rig();
      await expect(ask(bad, kind, { email: "not an address" })).rejects.toMatchObject({ code: "invalid-argument" });
      const off = rig({ canSend: false });
      await expect(ask(off, kind, { email: KNOWN })).rejects.toMatchObject({ code: "failed-precondition" });
      const noApp = rig({ env: { WAITLIST_PUBLIC_URL: "https://queryhawk.net" } });
      await expect(ask(noApp, kind, { email: KNOWN })).rejects.toMatchObject({ code: "failed-precondition" });
      for (const r of [bad, off, noApp]) expect(r.lookup).not.toHaveBeenCalled();
    });
  }

  it("the rate limit is keyed on the kind and a hash of the address, never the address itself", async () => {
    const r = rig();
    await ask(r, "reset", { email: "Maya@Example.com " });
    const key = (r.deps.allow as Spy).mock.calls[0][0] as string;
    expect(key).toMatch(/^acct-reset-[0-9a-f]{32}$/);
    expect(key).not.toContain("maya");
  });
});

describe("AE-2 · the sign-in link comes back to /signin-link in the app", () => {
  it("continue URL is the caller's origin plus /signin-link, handled in the app", async () => {
    const r = rig();
    await ask(r, "signin", { email: KNOWN, origin: "https://scriptally-dev.web.app" });
    expect(r.deps.auth.generateSignInWithEmailLink).toHaveBeenCalledWith(KNOWN, { url: "https://scriptally-dev.web.app/signin-link", handleCodeInApp: true });
    const sent = r.send.mock.calls[0][2] as { html: string };
    expect(sent.html).toContain(encodeURIComponent("https://scriptally-dev.web.app/signin-link"));
  });
  it("no origin given: the configured app origin; a malformed or plain-http one is refused", async () => {
    const r = rig();
    await ask(r, "signin", { email: KNOWN });
    expect((r.deps.auth.generateSignInWithEmailLink as Spy).mock.calls[0][1].url).toBe("https://scriptally-app.web.app/signin-link");
    await expect(ask(rig(), "signin", { email: KNOWN, origin: "http://evil.example" })).rejects.toMatchObject({ code: "invalid-argument" });
    await ask(rig(), "signin", { email: KNOWN, origin: "http://127.0.0.1:4321" });
  });
});

describe("AE-3 · change of address: confirm to the new one, then the notice to the old one", () => {
  it("newEmail needs a signed-in account", async () => {
    await expect(ask(rig(), "newEmail", { newEmail: "new@example.com" })).rejects.toMatchObject({ code: "unauthenticated" });
  });
  it("newEmail: the link is made for this account's address, the change is held server-side, the email goes to the NEW address", async () => {
    const r = rig();
    const out = await ask(r, "newEmail", { newEmail: "New@Example.com" }, "u1");
    expect(out.answer).toBe(SAME_ANSWER);
    expect(r.deps.auth.generateVerifyAndChangeEmailLink).toHaveBeenCalledWith(KNOWN, "new@example.com", { url: "https://scriptally-app.web.app/account/profile" });
    expect(r.deps.pending.put).toHaveBeenCalledWith("u1", { oldEmail: KNOWN, newEmail: "new@example.com", requestedAt: expect.any(Number) });
    expect(r.send.mock.calls[0].slice(0, 2)).toEqual(["new@example.com", "newEmail"]);
  });
  it("newEmail: an address in use, the hourly limit and a failed send are said (signed in, so nothing is revealed)", async () => {
    const used = rig();
    (used.deps.auth.generateVerifyAndChangeEmailLink as Spy).mockRejectedValueOnce(Object.assign(new Error("x"), { code: "auth/email-already-exists" }));
    await expect(ask(used, "newEmail", { newEmail: "new@example.com" }, "u1")).rejects.toMatchObject({ code: "already-exists" });
    await expect(ask(rig({ allow: false }), "newEmail", { newEmail: "new@example.com" }, "u1")).rejects.toMatchObject({ code: "resource-exhausted" });
    await expect(ask(rig({ sendOk: false }), "newEmail", { newEmail: "new@example.com" }, "u1")).rejects.toMatchObject({ code: "unavailable" });
  });
  it("emailChanged: once the account's address IS the new one, the notice goes to the OLD address, part-hiding the new", async () => {
    const r = rig({ current: "new@example.com", pending: { oldEmail: KNOWN, newEmail: "new@example.com" } });
    await ask(r, "emailChanged", {}, "u1");
    expect(r.deps.pending.take).toHaveBeenCalledWith("u1", "new@example.com");
    expect(r.send.mock.calls[0].slice(0, 2)).toEqual([KNOWN, "emailChanged"]);
    const html = (r.send.mock.calls[0][2] as { html: string }).html;
    expect(html).toContain("n•••@example.com");
    expect(html).not.toContain("new@example.com");
  });
  it("emailChanged: nothing pending, nothing sent; and it needs a signed-in account", async () => {
    const r = rig({ pending: null });
    expect((await ask(r, "emailChanged", {}, "u1")).answer).toBe(SAME_ANSWER);
    expect(r.send).not.toHaveBeenCalled();
    await expect(ask(rig(), "emailChanged", {})).rejects.toBeInstanceOf(AccountEmailError);
  });
  it("an unknown kind is refused", async () => {
    await expect(ask(rig(), "deleteEverything", {})).rejects.toMatchObject({ code: "invalid-argument" });
  });
});

describe("AE-4 · one callable, wired once", () => {
  const src = (f: string) => readFileSync(join(process.cwd(), "functions/src", f), "utf8");
  it("index exports sendAccountEmail; it binds the mail key and goes through sendEmail, the shared rate limit and `db`", () => {
    expect(src("index.ts")).toContain('export { sendAccountEmail } from "./accountEmails";');
    const s = src("accountEmails.ts");
    expect(s).toMatch(/secrets: \[RESEND_API_KEY\]/);
    expect(s).toContain('import { db } from "./firestore";');
    expect(s).toContain('import { consumeRateLimit } from "./waitlistStore";');
    expect(s).toMatch(/send: \(to, kind, rendered\) => sendEmail\(to, kind, rendered\)/);
  });
  it("the Admin SDK makes all three kinds of link (no hand-built action URL)", () => {
    const s = src("accountEmails.ts");
    for (const m of ["generateSignInWithEmailLink", "generatePasswordResetLink", "generateVerifyAndChangeEmailLink"]) expect(s).toContain(`auth.${m}(`);
    expect(src("accountEmailsCore.ts")).not.toMatch(/__\/auth\/action/);
  });
});
