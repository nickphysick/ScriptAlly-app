/**
 * accountEmailsCore — the four account emails' one server path, as a pure function of its dependencies
 * (non-workspace v1, 9c; ref design-refs/emails-v1.html, "Your account").
 *
 *   signin       — no account needed. "Email me a sign-in link instead".
 *   reset        — no account needed. "Forgot your password?".
 *   newEmail     — SIGNED IN. Settings › Change email: a confirm link to the NEW address.
 *   emailChanged — SIGNED IN. Once the change has gone through, the notice to the OLD address.
 *
 * The callable (`accountEmails.ts`) wires the Admin SDK, the rate limit, Firestore and the sender into this. This
 * file imports neither firebase-admin nor firebase-functions, so the root suite runs every branch with fakes.
 *
 * ⚠️ THE TWO SIGNED-OUT KINDS NEVER SAY WHETHER AN ACCOUNT EXISTS. An unknown address, a disabled account, a
 *    rate-limited address, a link the SDK refused and a send that failed all answer `{ ok: true }`, and every answer
 *    is padded to the same minimum time, so neither the reply nor its timing tells a caller anything. What did
 *    happen is a log line (with no address in it).
 * ⚠️ A REFUSAL BEFORE THE LOOKUP IS FINE, AND IS HOW NOBODY GETS LOCKED OUT. A malformed address, or a server that
 *    cannot send at all (no sender key, no public origin), is refused BEFORE any account is looked up, so the
 *    refusal is the same for every address — and the client wrapper (`src/lib/accountEmail.ts`) then falls back to
 *    Firebase's own sender.
 * ⚠️ THE CODE NEVER WRITES FOR THE WRITER: these are action links and notices, nothing drafted.
 */
import type { SendOutcome, RenderedEmail } from "./email";
import { APP_PATHS, EmailKind, MailConfig, resolveMailConfig } from "./emailConfig";
import { Prepared, prepareEmailChanged, prepareNewEmail, prepareReset, prepareSignIn } from "./emailTemplates";
import { createHash } from "crypto";

export type AccountEmailKind = "signin" | "reset" | "newEmail" | "emailChanged";
export const ACCOUNT_EMAIL_KINDS: readonly AccountEmailKind[] = ["signin", "reset", "newEmail", "emailChanged"];

/** The one answer every successful call gets, whatever happened behind it. */
export const SAME_ANSWER = Object.freeze({ ok: true as const });
export type AccountEmailAnswer = typeof SAME_ANSWER;

/** The floor every signed-out answer is padded to, so an unknown address is not the fast one. */
export const MIN_ANSWER_MS = 1200;

/** Mirrors `HttpsError` codes; the callable maps it. Only ever thrown where the answer cannot depend on an account. */
export class AccountEmailError extends Error {
  constructor(
    public readonly code: "invalid-argument" | "unauthenticated" | "failed-precondition" | "resource-exhausted" | "already-exists" | "unavailable",
    message: string,
  ) { super(message); }
}

export interface AuthUserLite { uid: string; email?: string | null; disabled?: boolean }
interface ActionCodeSettings { url: string; handleCodeInApp?: boolean }

export interface AccountEmailDeps {
  env: Record<string, string | undefined>;
  now: () => number;
  sleep: (ms: number) => Promise<void>;
  /** Whether a message can be sent at all (the sender key is set). Checked before any lookup. */
  canSend: () => boolean;
  auth: {
    getUserByEmail: (email: string) => Promise<AuthUserLite>;
    getUser: (uid: string) => Promise<AuthUserLite>;
    generateSignInWithEmailLink: (email: string, s: ActionCodeSettings) => Promise<string>;
    generatePasswordResetLink: (email: string, s: ActionCodeSettings) => Promise<string>;
    generateVerifyAndChangeEmailLink: (email: string, newEmail: string, s: ActionCodeSettings) => Promise<string>;
  };
  /** Claim one attempt for this key; false once the window's allowance is spent. */
  allow: (key: string) => Promise<boolean>;
  send: (to: string, kind: EmailKind, rendered: RenderedEmail) => Promise<SendOutcome>;
  /** The pending change of address, held server-side so the notice goes to the address it was changed FROM. */
  pending: {
    put: (uid: string, v: { oldEmail: string; newEmail: string; requestedAt: number }) => Promise<void>;
    /** Remove and return the pending change if the account's address is now its `newEmail`; otherwise null. */
    take: (uid: string, currentEmail: string) => Promise<{ oldEmail: string; newEmail: string } | null>;
  };
  minAnswerMs?: number;
}

export interface AccountEmailRequest {
  kind: unknown;
  data: Record<string, unknown>;
  uid: string | null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL = 254;
const cleanEmail = (raw: unknown): string =>
  typeof raw === "string" ? raw.trim().toLowerCase().slice(0, MAX_EMAIL + 1) : "";
const validEmail = (e: string) => !!e && e.length <= MAX_EMAIL && EMAIL_RE.test(e);
const hash = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 32);
const log = (fields: Record<string, unknown>) => console.info(JSON.stringify({ event: "account.email", ...fields }));

/**
 * The continue URL's origin: the caller's, when it is a well-formed https origin (or http on localhost), else the
 * configured app origin. Firebase refuses any domain not on the project's authorised list, so this cannot be used
 * to point a link somewhere foreign; the path is always ours.
 */
export const continueOrigin = (raw: unknown, cfg: MailConfig): string | null => {
  if (typeof raw === "string" && raw) {
    try {
      const u = new URL(raw);
      const local = u.hostname === "localhost" || u.hostname === "127.0.0.1";
      if (u.protocol === "https:" || (u.protocol === "http:" && local)) return u.origin;
    } catch { /* fall through */ }
    throw new AccountEmailError("invalid-argument", "origin");
  }
  if (!cfg.appUrl) return null;
  try { return new URL(cfg.appUrl).origin; } catch { return null; }
};

const isNotFound = (e: unknown) => {
  const code = (e as { code?: unknown })?.code;
  return code === "auth/user-not-found" || code === "auth/email-not-found";
};

const sendPrepared = async (deps: AccountEmailDeps, to: string, kind: EmailKind, p: Prepared): Promise<boolean> => {
  if (!p.ok) {
    console.error(JSON.stringify({ event: "email.refused", template: kind, missing: p.missing }));
    return false;
  }
  const out = await deps.send(to, kind, p.email);
  return out.ok;
};

/**
 * Handle one request. Resolves `SAME_ANSWER` or throws `AccountEmailError` — and for the two signed-out kinds it
 * throws only BEFORE an account has been looked up.
 */
export async function handleAccountEmail(req: AccountEmailRequest, deps: AccountEmailDeps): Promise<AccountEmailAnswer> {
  const kind = req.kind;
  if (typeof kind !== "string" || !(ACCOUNT_EMAIL_KINDS as readonly string[]).includes(kind)) {
    throw new AccountEmailError("invalid-argument", "kind");
  }
  const k = kind as AccountEmailKind;
  const cfg = resolveMailConfig(deps.env);
  /* The things every kind needs, checked first: refusing here is the same for every address. */
  const ready = deps.canSend() && !!cfg.publicUrl && !!cfg.appUrl;

  switch (k) {
    case "signin":
    case "reset": {
      const email = cleanEmail(req.data.email);
      if (!validEmail(email)) throw new AccountEmailError("invalid-argument", "email");
      if (!ready) throw new AccountEmailError("failed-precondition", "not configured");
      const origin = continueOrigin(req.data.origin, cfg);
      if (!origin) throw new AccountEmailError("failed-precondition", "no origin");
      const started = deps.now();
      const settle = async (outcome: string) => {
        log({ kind: k, outcome });
        const wait = (deps.minAnswerMs ?? MIN_ANSWER_MS) - (deps.now() - started);
        if (wait > 0) await deps.sleep(wait);
        return SAME_ANSWER;
      };

      /* The sign-in link does not need an account to be made, so it is made FIRST: a refused continue URL is then
         refused for every address alike, and the client falls back. */
      let signInLink: string | null = null;
      if (k === "signin") {
        try {
          signInLink = await deps.auth.generateSignInWithEmailLink(email, { url: `${origin}${APP_PATHS.signInLink}`, handleCodeInApp: true });
        } catch (e) {
          console.error(JSON.stringify({ event: "account.email", kind: k, outcome: "link-refused", code: String((e as { code?: unknown })?.code ?? "") }));
          throw new AccountEmailError("failed-precondition", "link");
        }
      }

      if (!(await deps.allow(`acct-${k}-${hash(email)}`))) return settle("rate-limited");
      try {
        let user: AuthUserLite | null = null;
        try { user = await deps.auth.getUserByEmail(email); } catch (e) { if (!isNotFound(e)) throw e; }
        if (!user || user.disabled) return settle("no-account");
        if (k === "signin") {
          return settle((await sendPrepared(deps, email, "signin", prepareSignIn(cfg, signInLink))) ? "sent" : "not-sent");
        }
        const link = await deps.auth.generatePasswordResetLink(email, { url: `${origin}/` });
        return settle((await sendPrepared(deps, email, "reset", prepareReset(cfg, link))) ? "sent" : "not-sent");
      } catch (e) {
        /* ⚠️ AFTER THE LOOKUP NOTHING IS THROWN: a failure here would only happen for a real account. */
        console.error(JSON.stringify({ event: "account.email", kind: k, outcome: "error", code: String((e as { code?: unknown })?.code ?? "") }));
        return settle("error");
      }
    }

    case "newEmail": {
      if (!req.uid) throw new AccountEmailError("unauthenticated", "sign in");
      const newEmail = cleanEmail(req.data.newEmail);
      if (!validEmail(newEmail)) throw new AccountEmailError("invalid-argument", "newEmail");
      if (!ready) throw new AccountEmailError("failed-precondition", "not configured");
      const origin = continueOrigin(req.data.origin, cfg);
      if (!origin) throw new AccountEmailError("failed-precondition", "no origin");
      if (!(await deps.allow(`acct-newEmail-${req.uid}`))) throw new AccountEmailError("resource-exhausted", "limit");
      const user = await deps.auth.getUser(req.uid);
      const oldEmail = cleanEmail(user.email);
      if (!oldEmail) throw new AccountEmailError("failed-precondition", "no current address");
      if (oldEmail === newEmail) throw new AccountEmailError("invalid-argument", "same address");
      let link: string;
      try {
        link = await deps.auth.generateVerifyAndChangeEmailLink(oldEmail, newEmail, { url: `${origin}${APP_PATHS.profile}` });
      } catch (e) {
        const code = String((e as { code?: unknown })?.code ?? "");
        if (code === "auth/email-already-exists") throw new AccountEmailError("already-exists", "in use");
        console.error(JSON.stringify({ event: "account.email", kind: k, outcome: "link-refused", code }));
        throw new AccountEmailError("unavailable", "link");
      }
      await deps.pending.put(req.uid, { oldEmail, newEmail, requestedAt: deps.now() });
      const sent = await sendPrepared(deps, newEmail, "newEmail", prepareNewEmail(cfg, link));
      log({ kind: k, outcome: sent ? "sent" : "not-sent" });
      /* Signed in, so no existence question: a failed send is said, and the client falls back to Firebase's sender. */
      if (!sent) throw new AccountEmailError("unavailable", "send");
      return SAME_ANSWER;
    }

    case "emailChanged": {
      if (!req.uid) throw new AccountEmailError("unauthenticated", "sign in");
      if (!ready) throw new AccountEmailError("failed-precondition", "not configured");
      const user = await deps.auth.getUser(req.uid);
      const current = cleanEmail(user.email);
      const change = current ? await deps.pending.take(req.uid, current) : null;
      /* Nothing pending, or the change has not gone through yet: nothing to say, and nothing is said. */
      if (!change) { log({ kind: k, outcome: "nothing-pending" }); return SAME_ANSWER; }
      const sent = await sendPrepared(deps, change.oldEmail, "emailChanged",
        prepareEmailChanged(cfg, { oldEmail: change.oldEmail, newEmail: change.newEmail, whenMs: deps.now() }));
      log({ kind: k, outcome: sent ? "sent" : "not-sent" });
      return SAME_ANSWER;
    }

    default: {
      const unhandled: never = k;
      throw new AccountEmailError("invalid-argument", `kind ${String(unhandled)}`);
    }
  }
}
