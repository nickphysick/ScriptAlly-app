/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The founder's code — client side (ref: design-refs/getting-in-v1.html, screens 1, 2 and 5).
 *
 * ⚠️ THE CHECK THAT MATTERS RUNS ON THE SERVER. Everything in this file is presentation and
 * normalisation: the code that creates the account is the Firebase Auth SDK, and anyone can call it
 * from a console. `redeemInviteCode` (functions/) is the gate and the only thing that marks a writer
 * as founding (through the one setter, `markFoundingFlags`).
 *
 * ⚠️ THE CODE TRAVELS IN THE INVITE LINK (`/join/QH-XXXX-XXXX`) and is kept for the visit in
 * sessionStorage, so the writer never types it and is never asked for it twice. The typed screen is
 * the fallback for a writer who arrives without the link.
 *
 * ⚠️ THREE OUTCOMES, AS THE REF DRAWS THEM: works, already used, not recognised. The old gate gave the
 * last two one sentence (so the form could not be used to test codes); the ref separates them, and the
 * ref is the authority. Listed for Nick in reports/non-workspace-v1/REPORT.md.
 */

/** The code's shape: QH, then two groups of four. */
export const CODE_PLACEHOLDER = "QH-XXXX-XXXX";
export const CODE_LENGTH = CODE_PLACEHOLDER.length;
export const CODE_LABEL = "Founder's code";

/** Where the invite link lands: `/join/<code>`. */
export const JOIN_PREFIX = "/join/";
/** The visit's code, kept so a tab switch, a Google round trip or a reload never asks for it again. */
export const CODE_KEY = "qh.foundersCode";

/* ── The ref's words ────────────────────────────────────────────────────────────────────── */
export const CODE_HEADING = "Enter your founder's code";
export const CODE_LEDE =
  "It's in your invite email, and looks like QH-XXXX-XXXX. Following the button in that email fills it in for you.";
export const CODE_CONTINUE = "Continue";
export const CODE_NO_CODE = "No code yet? ";
export const CODE_NO_CODE_LINK = "Join the waiting list";
export const CODE_HAVE_ACCOUNT = "Already have an account? ";

export const CODE_SHORT = "Enter the whole code from your invite email. It looks like QH-XXXX-XXXX.";
export const CODE_USED = "That code has already been used to create an account.";
export const CODE_USED_LINK = "Sign in instead";
export const CODE_UNKNOWN = "We don't recognise that code. Check it against your invite email, or copy and paste it.";
/** Words I had to write: the server could not answer. */
export const CODE_UNREACHABLE = "We couldn't check your code just now. Try again in a moment.";

export const CODE_ACCEPTED = (code: string) => `Founder's code ${code} accepted`;
export const INVITE_LEDE = "Your founder's code came with the link, so there's nothing to type in.";

/**
 * Normalise a typed code: upper case, spaces stripped, and every kind of dash a mail client might
 * have substituted folded back to a plain hyphen.
 *
 * ⚠️ THE EM DASH IS NOT PEDANTRY. Copying a code out of a formatted email hands you an en or em dash
 * often enough to matter, and a code rejected for a character the writer cannot see is the worst
 * possible first impression of a product they were invited to.
 */
export function normaliseInviteCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "").replace(/[‐-―−]/g, "-");
}

/** The ref's input mask: letters and digits only, hyphens put back after 2 and after 6, 12 at most. */
export function formatCodeInput(raw: string): string {
  let v = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (v.length > 2) v = `${v.slice(0, 2)}-${v.slice(2)}`;
  if (v.length > 7) v = `${v.slice(0, 7)}-${v.slice(7)}`;
  return v.slice(0, CODE_LENGTH);
}

/** Is there enough here to be worth asking the server about? The whole code, nothing less. */
export function looksLikeInviteCode(raw: string): boolean {
  return normaliseInviteCode(raw).length === CODE_LENGTH;
}

/** The code in an invite link's path, or null. */
export function codeFromPath(path: string): string | null {
  if (!path.startsWith(JOIN_PREFIX)) return null;
  let raw = path.slice(JOIN_PREFIX.length).replace(/\/+$/, "");
  try { raw = decodeURIComponent(raw); } catch { /* a broken escape is just an unrecognised code */ }
  const code = normaliseInviteCode(raw);
  return code ? code : null;
}

/** What the server says about a code. */
export type CodeStatus =
  | { status: "ok"; email: string | null; name: string | null; foundingNo: number | null }
  | { status: "expired"; email: string | null; foundingNo: number | null }
  | { status: "used" }
  | { status: "unknown" };

/** Read a check answer defensively: anything unrecognised is "unknown", never "ok". */
export function readCodeStatus(data: unknown): CodeStatus {
  const d = (data ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" && v ? v : null);
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  switch (d.status) {
    case "ok": return { status: "ok", email: str(d.email), name: str(d.name), foundingNo: num(d.foundingNo) };
    case "expired": return { status: "expired", email: str(d.email), foundingNo: num(d.foundingNo) };
    case "used": return { status: "used" };
    default: return { status: "unknown" };
  }
}

/** The visit's kept code, read and written defensively (private windows throw). */
export function keptCode(): string | null {
  try { return sessionStorage.getItem(CODE_KEY); } catch { return null; }
}
export function keepCode(code: string | null): void {
  try { if (code) sessionStorage.setItem(CODE_KEY, code); else sessionStorage.removeItem(CODE_KEY); } catch { /* private window */ }
}

/**
 * Once signed in, redeem the visit's kept code against this account (App calls this when a user appears).
 * ⚠️ AFTER THE ACCOUNT EXISTS, so the server can bind the code to a uid and set the founding flag through the one
 * setter — whichever way the writer signed up (password, Google, a sign-in link). A failure keeps the code for the
 * next sign-in; a used or unknown answer clears it.
 */
export async function redeemKeptCode(): Promise<"none" | "redeemed" | "refused" | "kept"> {
  const code = keptCode();
  if (!code) return "none";
  try {
    await callFoundersCode("redeem", code);
    keepCode(null);
    return "redeemed";
  } catch (e) {
    const c = (e as { code?: string })?.code ?? "";
    if (/not-found|already-exists/.test(c)) { keepCode(null); return "refused"; }
    return "kept";
  }
}

/** One call to the gate. `mode` picks check (no account needed), redeem (signed in) or fresh (a new 48-hour link). */
export async function callFoundersCode(mode: "check" | "redeem" | "fresh", code: string): Promise<unknown> {
  const { getFunctions, httpsCallable } = await import("firebase/functions");
  const res = await httpsCallable(getFunctions(undefined, "europe-west2"), "redeemInviteCode")({ mode, code: normaliseInviteCode(code) });
  return res.data;
}
