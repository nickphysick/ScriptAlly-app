/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Getting in — create an account, sign in, set a new password (non-workspace v1, Phase 1;
 * ref: design-refs/getting-in-v1.html, screens 1–5). The Redesign view only.
 *
 * ⚠️ THE FOUNDER'S CODE COMES WITH THE LINK. `/join/QH-XXXX-XXXX` carries it; it is checked with the server and kept
 *    for the visit (`keepCode`), so the writer never types it and is never asked for it twice. The typed screen is
 *    the fallback for a writer who arrives without the link. Redeeming happens AFTER the account exists (App calls
 *    `redeemKeptCode`), which is what lets the server set the founding flag through its one setter.
 * ⚠️ THE GATE IS PRESENTATION; THE GATE THAT COUNTS IS THE CALLABLE. A browser check gates nothing — the account is
 *    created by the Auth SDK, which anyone can call from a console.
 * ⚠️ GOOGLE ON THE SIGN-IN TAB STILL CREATES AN ACCOUNT WHEN NONE EXISTS. Closing that needs a `beforeUserCreated`
 *    blocking trigger, not built (unchanged from before this phase).
 * ⚠️ IN-APP NAVIGATION, NOT href, for "Back to site" and the Terms and Privacy links: leaving the screen any other way
 *    loses the deep link the visitor arrived on. Clearing the pre-auth hash matters for the same reason.
 */
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useScriptAllyDb } from "../lib/db";
import { SetupFrame, ACCOUNT_GROUP } from "./onboarding/SetupFrame";
import { BETA_MODE, INVITE_GATE_ENABLED } from "../lib/beta";
import {
  CODE_ACCEPTED, CODE_CONTINUE, CODE_HAVE_ACCOUNT, CODE_HEADING, CODE_LABEL, CODE_LEDE, CODE_NO_CODE, CODE_NO_CODE_LINK,
  CODE_PLACEHOLDER, CODE_SHORT, CODE_UNKNOWN, CODE_UNREACHABLE, CODE_USED, CODE_USED_LINK, CODE_LENGTH, INVITE_LEDE,
  callFoundersCode, codeFromPath, formatCodeInput, keepCode, keptCode, normaliseInviteCode, readCodeStatus,
  type CodeStatus,
} from "../lib/inviteCode";
import {
  signInWithGoogle, sendReset, isValidEmail, sendSignInLink, arrivedFromSignInLink, finishSignInLink, keptSignInEmail,
  sendConfirmation,
} from "../lib/authActions";
import "./auth.css";

/** The flock: the Founders page's own drawing. The hawk portrait greets a locked-out or expired visitor. */
const FLOCK = { src: "/images/off-the-ground.png", version: "430029d2", width: 1200, height: 1200 };
const PORT = { src: "/images/hawk-portrait.webp", width: 160, height: 160 };

/* ── The ref's words ─────────────────────────────────────────────────────────────────────── */
export const AUTH_COPY = {
  inviteHeading: (first: string | null) => (first ? `Your place is held, ${first}.` : "Your place is held."),
  inviteLead: "You're one of our first 50 writers. Set a way to sign in and your desk is ready.",
  inviteGets: [
    "Full QueryHawk Pro, free for your whole querying campaign",
    "A direct line to our founder",
    "Smart Import, to bring your list across",
  ],
  codeHeading: "The hunt begins.",
  codeLead: "QueryHawk is opening to its first 50 writers, a few at a time.",
  createHeading: "Create your account",
  useOther: "Use a different one",
  otherHint: "Your pass stays yours. We'll send one confirmation to the new address.",
  google: "Continue with Google",
  orPassword: "or set a password",
  orEmail: "or with your email",
  name: "Your name",
  email: "Email address",
  password: "Password",
  pwHint: "At least 8 characters",
  create: "Create your account",
  agreeLead: "By continuing you agree to our ",
  terms: "Terms",
  privacy: "Privacy policy",
  signinHeading: "Welcome back.",
  signinLead: "Pick up your querying where you left off.",
  signin: "Sign in",
  forgot: "Forgotten it?",
  linkInstead: "Email me a sign-in link instead",
  checkEmail: "Check your email.",
  linkSent: (e: string) => `We've sent a sign-in link to ${e}. It works once, for the next hour.`,
  backToSignin: "Back to sign in",
  resetLeft: "Locked out?",
  resetLeftLead: "It happens. Your queries are exactly where you left them.",
  resetHeading: "Set a new password",
  resetLede: "Tell us the email you sign in with and we'll send you a link.",
  resetSend: "Send me the link",
  resetSent: (e: string) => `If ${e} has a QueryHawk account, a link to set a new password is on its way.`,
  resetAgainLead: "Nothing after a few minutes? ",
  resetAgain: "Send it again",
  expiredHeading: "That link has run out.",
  expiredBody: (no: number | null, e: string | null) =>
    `Invite links last 48 hours. Your place${no ? `, No. ${no},` : ""} is still held${e ? ` for ${e}` : ""}.`,
  fresh: "Send me a fresh link",
  haveAccount: "I already have an account",
  freshHeading: "A fresh link is on its way.",
  freshBody: (no: number | null, e: string | null) =>
    `${e ? `Sent to ${e}. ` : ""}Your place${no ? `, No. ${no},` : ""} is still held.`,
  /* Validation, from the ref's script */
  badEmail: "That doesn't look like an email address.",
  noName: "Add a name so we know what to call you.",
  pwShort: (n: number) => `That's ${n} characters. It needs at least 8.`,
  pwNone: "Choose a password of at least 8 characters, or continue with Google.",
  signinEmail: "Enter the email address you sign in with.",
  signinPw: "Enter your password, or have us email you a sign-in link.",
  linkNeedsEmail: "Add your email address first, then we can send the link.",
  /* Words I had to write: a sign-in link opened on a different device */
  linkConfirmHeading: "Finish signing in",
  linkConfirmLede: "You opened the sign-in link on a different device or browser. Tell us the address it was sent to.",
  linkConfirm: "Sign in",
  checking: "Checking your founder's code…",
} as const;

type Screen = "checking" | "invite" | "code" | "signin" | "reset" | "expired" | "emailLink";

/** Lab-only starting state (`#/onb-lab`): holds a screen a real visit would have to drive. */
export interface AuthLabState {
  view?: "auth" | "reset";
  resetSent?: boolean;
  email?: string;
  /** Draw the typed-code fallback regardless of the flag (draws only; every handler reads the flag). */
  showInvite?: boolean;
  /** Draw a screen with a code status already answered. */
  code?: { code: string; status: CodeStatus };
}

const firstName = (name: string | null) => (name ? name.trim().split(/\s+/)[0] || null : null);
const gateOn = () => BETA_MODE && INVITE_GATE_ENABLED;

/** Show/hide password field, as the ref draws it: label (with a hint or a link), input, eye. */
const PwField: React.FC<{
  id: string; label: string; hint?: string; extra?: React.ReactNode; auto: string; value: string;
  onChange: (v: string) => void; err?: string; inputRef?: React.Ref<HTMLInputElement>;
}> = ({ id, label, hint, extra, auto, value, onChange, err, inputRef }) => {
  const [show, setShow] = useState(false);
  const errId = `${id}-e`;
  return (
    <div className={`sf-field${err ? " is-bad" : ""}`}>
      <div className="sf-labrow">
        <label className="sf-lab" htmlFor={id}>{label}{hint && <span className="au-hint"> {hint}</span>}</label>
        {extra}
      </div>
      <div className="sf-inwrap sf-inwrap--eye">
        <input
          ref={inputRef} className="sf-in" id={id} type={show ? "text" : "password"} autoComplete={auto} value={value}
          onChange={(e) => onChange(e.target.value)} aria-invalid={err ? true : undefined} aria-describedby={err ? errId : undefined}
        />
        <button type="button" className="sf-eye" aria-label={show ? "Hide password" : "Show password"} aria-pressed={show} onClick={() => setShow((v) => !v)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
        </button>
      </div>
      {err && <p className="sf-err" id={errId} role="alert">{err}</p>}
    </div>
  );
};

const GoogleMark = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.15-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
    <path fill="#FBBC05" d="M5.85 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.67-2.84z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.67 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
  </svg>
);

const Check = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
);

export const Auth: React.FC<{ initialMode?: "login" | "signup"; lab?: AuthLabState }> = ({ initialMode, lab }) => {
  const { login, signup } = useScriptAllyDb();
  const navigate = useNavigate();
  const goPublic = (path: string) => {
    if (window.location.hash) window.history.replaceState(null, "", window.location.pathname + window.location.search);
    navigate(path);
  };

  /* ── Where the visit starts ─────────────────────────────────────────────────────────────── */
  const linkCode = typeof window !== "undefined" ? codeFromPath(window.location.pathname) : null;
  const startCode = lab?.code?.code ?? linkCode ?? keptCode();
  const startScreen = (): Screen => {
    if (lab?.code) return lab.code.status.status === "ok" ? "invite" : lab.code.status.status === "expired" ? "expired" : "code";
    if (lab?.view === "reset") return "reset";
    if (!lab && arrivedFromSignInLink()) return "emailLink";
    if (initialMode === "login") return "signin";
    if (startCode) return "checking";
    if (lab?.showInvite || gateOn()) return "code";
    return "invite";
  };
  const [screen, setScreen] = useState<Screen>(startScreen);
  const [code, setCode] = useState<string>(startCode ?? "");
  const [status, setStatus] = useState<CodeStatus | null>(lab?.code?.status ?? null);

  const labOk = lab?.code?.status.status === "ok" ? lab.code.status : null;
  const [name, setName] = useState(labOk?.name ?? "");
  const [email, setEmail] = useState(lab?.email ?? labOk?.email ?? "");
  const [otherEmail, setOtherEmail] = useState(false);
  const [password, setPassword] = useState("");
  const [errs, setErrs] = useState<Record<string, string | undefined>>({});
  const [usedCode, setUsedCode] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [linkSentTo, setLinkSentTo] = useState<string | null>(null);
  const [resetSentTo, setResetSentTo] = useState<string | null>(lab?.resetSent ? (lab.email ?? "") : null);
  const [freshSent, setFreshSent] = useState(false);

  const focusRef = useRef<string | null>(null);
  const focusNext = (id: string) => { focusRef.current = id; };
  useEffect(() => {
    if (!focusRef.current) return;
    const el = document.getElementById(focusRef.current) as HTMLElement | null;
    focusRef.current = null;
    el?.focus();
  });

  const go = (s: Screen, focusId?: string) => {
    setScreen(s); setErrs({}); setBanner(null); setUsedCode(false); setLinkSentTo(null); setFreshSent(false);
    if (s !== "reset") setResetSentTo(null);
    if (focusId) focusNext(focusId);
  };

  /* The address follows the prop App passes (#/login ↔ #/signup with no reload). */
  const firstMode = useRef(true);
  useEffect(() => {
    if (firstMode.current) { firstMode.current = false; return; }
    if (!initialMode) return;
    go(initialMode === "login" ? "signin" : (status?.status === "ok" || !gateOn() ? "invite" : "code"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMode]);

  /* ── The code: checked once on arrival, then held ───────────────────────────────────────── */
  const applyStatus = (c: string, s: CodeStatus) => {
    setStatus(s);
    switch (s.status) {
      case "ok":
        keepCode(c);
        if (s.email) setEmail(s.email);
        if (s.name) setName(s.name);
        go("invite", "au-name");
        return;
      case "expired":
        keepCode(c);
        if (s.email) setEmail(s.email);
        go("expired");
        return;
      case "used":
        keepCode(null);
        go("code", "au-code");
        setErrs({ code: CODE_USED }); setUsedCode(true);
        return;
      case "unknown":
        keepCode(null);
        go("code", "au-code");
        setErrs({ code: CODE_UNKNOWN });
        return;
      default: {
        const unhandled: never = s;
        return unhandled;
      }
    }
  };
  const check = async (c: string) => {
    try {
      applyStatus(c, readCodeStatus(await callFoundersCode("check", c)));
    } catch {
      go("code", "au-code");
      setErrs({ code: CODE_UNREACHABLE });
    }
  };
  useEffect(() => {
    if (screen === "checking" && code) void check(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Handlers ───────────────────────────────────────────────────────────────────────────── */
  const onCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrs({}); setUsedCode(false);
    const c = normaliseInviteCode(code);
    if (c.length < CODE_LENGTH) { setErrs({ code: CODE_SHORT }); focusNext("au-code"); return; }
    setScreen("checking");
    void check(c);
  };

  const emailLocked = screen === "invite" && status?.status === "ok" && !!status.email && !otherEmail;

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBanner(null);
    const em = email.trim();
    if (!emailLocked && !isValidEmail(em)) { setErrs({ email: AUTH_COPY.badEmail }); focusNext("au-email"); return; }
    if (!name.trim()) { setErrs({ name: AUTH_COPY.noName }); focusNext("au-name"); return; }
    if (password.length < 8) { setErrs({ pw: password ? AUTH_COPY.pwShort(password.length) : AUTH_COPY.pwNone }); focusNext("au-pw"); return; }
    if (gateOn() && status?.status !== "ok") { go("code", "au-code"); return; }
    setErrs({});
    setBusy(true);
    try {
      await signup(name.trim(), em, password); // the auth listener takes over; App redeems the kept code
      /* "We'll send one confirmation to the new address" — made true here: an address other than the invite's gets one. */
      if (otherEmail) await sendConfirmation().catch(() => undefined);
    } catch (err: any) {
      setBanner(err?.message || "Something went wrong. Please try again.");
      setBusy(false);
    }
  };

  const onGoogle = async () => {
    setBanner(null); setErrs({});
    if (screen === "invite" && gateOn() && status?.status !== "ok") { go("code", "au-code"); return; }
    setBusy(true);
    try {
      await signInWithGoogle(); // success unmounts this screen; App redeems a kept code. Cancel is silent.
    } catch (err: any) {
      setBanner(err?.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const onSignin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBanner(null);
    const em = email.trim();
    if (!isValidEmail(em)) { setErrs({ email: AUTH_COPY.signinEmail }); focusNext("au-email"); return; }
    if (!password) { setErrs({ pw: AUTH_COPY.signinPw }); focusNext("au-pw"); return; }
    setErrs({});
    setBusy(true);
    try {
      await login(em, password);
    } catch (err: any) {
      setErrs({ pw: err?.message || "Something went wrong. Please try again." });
      focusNext("au-pw");
      setBusy(false);
    }
  };

  const onLinkInstead = async () => {
    setBanner(null);
    const em = email.trim();
    if (!isValidEmail(em)) { setErrs({ email: AUTH_COPY.linkNeedsEmail }); focusNext("au-email"); return; }
    setErrs({});
    setBusy(true);
    try {
      await sendSignInLink(em);
      setLinkSentTo(em);
      focusNext("au-unlink");
    } catch (err: any) {
      setErrs({ email: err?.message || "Something went wrong. Please try again." });
    } finally {
      setBusy(false);
    }
  };

  const onFinishLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const em = email.trim();
    if (!isValidEmail(em)) { setErrs({ email: AUTH_COPY.signinEmail }); focusNext("au-email"); return; }
    setErrs({}); setBusy(true);
    try {
      await finishSignInLink(em);
    } catch (err: any) {
      setErrs({ email: err?.message }); focusNext("au-email"); setBusy(false);
    }
  };
  /* Same device: the address was kept when the link was sent, so finish at once. */
  useEffect(() => {
    if (screen !== "emailLink") return;
    const kept = keptSignInEmail();
    if (!kept) { focusNext("au-email"); return; }
    setEmail(kept); setBusy(true);
    finishSignInLink(kept).catch((err: any) => { setErrs({ email: err?.message }); setBusy(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onReset = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const em = email.trim();
    if (!isValidEmail(em)) { setErrs({ reset: AUTH_COPY.signinEmail }); focusNext("au-reset"); return; }
    setErrs({}); setBusy(true);
    try {
      await sendReset(em);
      setResetSentTo(em);
      focusNext("au-reset-back");
    } catch (err: any) {
      setErrs({ reset: err?.message || "Something went wrong. Please try again." });
    } finally {
      setBusy(false);
    }
  };

  const onFresh = async () => {
    setBusy(true);
    try { await callFoundersCode("fresh", code); } catch { /* the place is held either way; say what is true below */ }
    setBusy(false);
    setFreshSent(true);
  };

  /* ── Drawing ────────────────────────────────────────────────────────────────────────────── */
  const tab: "signup" | "signin" = screen === "signin" || screen === "reset" || screen === "emailLink" ? "signin" : "signup";
  const toSignin = () => go("signin", "au-email");
  const toCreate = () => go(status?.status === "ok" || !gateOn() ? "invite" : "code", status?.status === "ok" ? "au-name" : "au-code");

  const Flock = () => <img className="sf-flock" src={`${FLOCK.src}?v=${FLOCK.version}`} width={FLOCK.width} height={FLOCK.height} alt="" />;
  const Port = ({ cls = "au-port" }: { cls?: string }) => <img className={cls} src={PORT.src} width={PORT.width} height={PORT.height} alt="" />;
  const err = (k: string, id: string) => errs[k] ? <p className="sf-err" id={`${id}-e`} role="alert">{errs[k]}</p> : null;
  const invalid = (k: string, id: string) => (errs[k] ? { "aria-invalid": true as const, "aria-describedby": `${id}-e` } : {});
  const Agree = () => (
    <p className="sf-under">
      {AUTH_COPY.agreeLead}
      <button type="button" className="sf-link sf-link--in" onClick={() => goPublic("/terms")}>{AUTH_COPY.terms}</button> and{" "}
      <button type="button" className="sf-link sf-link--in" onClick={() => goPublic("/privacy")}>{AUTH_COPY.privacy}</button>.
    </p>
  );

  const offer = (() => {
    switch (screen) {
      case "invite": {
        const viaCode = status?.status === "ok";
        return (
          <section className="sf-offer" data-sf="offer">
            <h1 className="sf-offerh">{viaCode ? AUTH_COPY.inviteHeading(firstName(status.name)) : AUTH_COPY.codeHeading}</h1>
            <p className="sf-offerp">{viaCode ? AUTH_COPY.inviteLead : AUTH_COPY.codeLead}</p>
            {viaCode && <ul className="au-gets">{AUTH_COPY.inviteGets.map((g) => <li key={g}><Check /><span>{g}</span></li>)}</ul>}
            <Flock />
          </section>
        );
      }
      case "code":
      case "checking":
        return (
          <section className="sf-offer" data-sf="offer">
            <h1 className="sf-offerh">{AUTH_COPY.codeHeading}</h1>
            <p className="sf-offerp">{AUTH_COPY.codeLead}</p>
            <Flock />
          </section>
        );
      case "signin":
      case "emailLink":
        return (
          <section className="sf-offer" data-sf="offer">
            <h1 className="sf-offerh">{AUTH_COPY.signinHeading}</h1>
            <p className="sf-offerp">{AUTH_COPY.signinLead}</p>
            <Flock />
          </section>
        );
      case "reset":
        return (
          <section className="sf-offer" data-sf="offer">
            <h1 className="sf-offerh">{AUTH_COPY.resetLeft}</h1>
            <p className="sf-offerp">{AUTH_COPY.resetLeftLead}</p>
            <Port cls="au-port au-port--offer" />
          </section>
        );
      case "expired":
        return null;
      default: {
        const unhandled: never = screen;
        return unhandled;
      }
    }
  })();

  const card = (() => {
    switch (screen) {
      case "checking":
        return <p className="sf-lede" role="status">{AUTH_COPY.checking}</p>;
      case "code":
        return (
          <form onSubmit={onCodeSubmit} noValidate data-auth="code">
            <h2 className="sf-h">{CODE_HEADING}</h2>
            <p className="sf-lede">{CODE_LEDE}</p>
            <div className={`sf-field${errs.code ? " is-bad" : ""}`}>
              <label className="sf-lab" htmlFor="au-code">{CODE_LABEL}</label>
              <input
                className="sf-in au-code" id="au-code" type="text" inputMode="text" autoComplete="off" autoCapitalize="characters"
                spellCheck={false} maxLength={CODE_LENGTH} placeholder={CODE_PLACEHOLDER} value={code}
                onChange={(e) => { setCode(formatCodeInput(e.target.value)); if (errs.code) { setErrs({}); setUsedCode(false); } }}
                {...invalid("code", "au-code")}
              />
              {errs.code && (
                <p className="sf-err" id="au-code-e" role="alert">
                  {errs.code}
                  {usedCode && <> <button type="button" className="sf-link sf-link--in" onClick={toSignin}>{CODE_USED_LINK}</button></>}
                </p>
              )}
            </div>
            <button type="submit" className="sf-btn sf-btn--full au-gap">{CODE_CONTINUE}</button>
            <p className="sf-under">
              {CODE_NO_CODE}<button type="button" className="sf-link sf-link--in" onClick={() => goPublic("/founders")}>{CODE_NO_CODE_LINK}</button>.{" "}
              {CODE_HAVE_ACCOUNT}<button type="button" className="sf-link sf-link--in" onClick={toSignin}>{AUTH_COPY.signin}</button>.
            </p>
          </form>
        );
      case "invite": {
        const viaCode = status?.status === "ok";
        return (
          <form onSubmit={onCreate} noValidate data-auth="signup">
            <h2 className="sf-h">{AUTH_COPY.createHeading}</h2>
            {viaCode && <p className="sf-lede">{INVITE_LEDE}</p>}
            {viaCode && (
              <p className="au-codeok" data-auth="code-ok"><Check /><span>{CODE_ACCEPTED(normaliseInviteCode(code))}</span></p>
            )}
            <div className={`sf-field${errs.email ? " is-bad" : ""}`}>
              <label className="sf-lab" htmlFor="au-email">{AUTH_COPY.email}</label>
              {emailLocked ? (
                <p className="au-locked" id="au-email">
                  <b>{email}</b>
                  <button type="button" className="sf-link sf-link--in" onClick={() => { setOtherEmail(true); focusNext("au-email"); }}>{AUTH_COPY.useOther}</button>
                </p>
              ) : (
                <>
                  <input className="sf-in" id="au-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} {...invalid("email", "au-email")} />
                  {viaCode && otherEmail && <p className="au-hint au-hint--below">{AUTH_COPY.otherHint}</p>}
                </>
              )}
              {err("email", "au-email")}
            </div>
            <button type="button" className="sf-google au-gap" onClick={onGoogle} disabled={busy}><GoogleMark />{AUTH_COPY.google}</button>
            <div className="sf-or"><span>{AUTH_COPY.orPassword}</span></div>
            <div className={`sf-field${errs.name ? " is-bad" : ""}`}>
              <label className="sf-lab" htmlFor="au-name">{AUTH_COPY.name}</label>
              <input className="sf-in" id="au-name" type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} {...invalid("name", "au-name")} />
              {err("name", "au-name")}
            </div>
            <PwField id="au-pw" label={AUTH_COPY.password} hint={AUTH_COPY.pwHint} auto="new-password" value={password} onChange={setPassword} err={errs.pw} />
            {banner && <p className="sf-msg sf-msg--error" role="alert">{banner}</p>}
            <button type="submit" className="sf-btn sf-btn--full au-gap" disabled={busy}>{AUTH_COPY.create}</button>
            <Agree />
          </form>
        );
      }
      case "signin":
        return linkSentTo ? (
          <div className="au-done" data-auth="link-sent">
            <span className="au-big"><Check /></span>
            <h2 className="sf-h">{AUTH_COPY.checkEmail}</h2>
            <p className="sf-lede">{AUTH_COPY.linkSent(linkSentTo)}</p>
            <button type="button" id="au-unlink" className="sf-btn sf-btn--line sf-btn--full" onClick={() => { setLinkSentTo(null); focusNext("au-email"); }}>{AUTH_COPY.backToSignin}</button>
          </div>
        ) : (
          <form onSubmit={onSignin} noValidate data-auth="signin">
            <h2 className="sf-h">{AUTH_COPY.signin}</h2>
            <button type="button" className="sf-google au-gap" onClick={onGoogle} disabled={busy}><GoogleMark />{AUTH_COPY.google}</button>
            <div className="sf-or"><span>{AUTH_COPY.orEmail}</span></div>
            <div className={`sf-field${errs.email ? " is-bad" : ""}`}>
              <label className="sf-lab" htmlFor="au-email">{AUTH_COPY.email}</label>
              <input className="sf-in" id="au-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} {...invalid("email", "au-email")} />
              {err("email", "au-email")}
            </div>
            <PwField
              id="au-pw" label={AUTH_COPY.password} auto="current-password" value={password} onChange={setPassword} err={errs.pw}
              extra={<button type="button" className="sf-link sf-link--quiet" onClick={() => go("reset", "au-reset")}>{AUTH_COPY.forgot}</button>}
            />
            <button type="submit" className="sf-btn sf-btn--full au-gap" disabled={busy}>{AUTH_COPY.signin}</button>
            <p className="sf-under"><button type="button" className="sf-link sf-link--in" onClick={onLinkInstead} disabled={busy} data-auth="link-instead">{AUTH_COPY.linkInstead}</button></p>
          </form>
        );
      case "emailLink":
        return (
          <form onSubmit={onFinishLink} noValidate data-auth="email-link">
            <h2 className="sf-h">{AUTH_COPY.linkConfirmHeading}</h2>
            <p className="sf-lede">{AUTH_COPY.linkConfirmLede}</p>
            <div className={`sf-field${errs.email ? " is-bad" : ""}`}>
              <label className="sf-lab" htmlFor="au-email">{AUTH_COPY.email}</label>
              <input className="sf-in" id="au-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} {...invalid("email", "au-email")} />
              {err("email", "au-email")}
            </div>
            <button type="submit" className="sf-btn sf-btn--full au-gap" disabled={busy}>{AUTH_COPY.linkConfirm}</button>
            <p className="sf-under"><button type="button" className="sf-link sf-link--in" onClick={toSignin}>{AUTH_COPY.backToSignin}</button></p>
          </form>
        );
      case "reset":
        return resetSentTo !== null ? (
          <div className="au-done" data-auth="reset-sent">
            <span className="au-big"><Check /></span>
            <h2 className="sf-h">{AUTH_COPY.checkEmail}</h2>
            <p className="sf-lede">{AUTH_COPY.resetSent(resetSentTo)}</p>
            <button type="button" id="au-reset-back" className="sf-btn sf-btn--full" onClick={toSignin}>{AUTH_COPY.backToSignin}</button>
            <p className="sf-under">{AUTH_COPY.resetAgainLead}<button type="button" className="sf-link sf-link--in" onClick={() => void onReset()} disabled={busy}>{AUTH_COPY.resetAgain}</button></p>
          </div>
        ) : (
          <form onSubmit={onReset} noValidate data-auth="reset">
            <h2 className="sf-h">{AUTH_COPY.resetHeading}</h2>
            <p className="sf-lede">{AUTH_COPY.resetLede}</p>
            <div className={`sf-field${errs.reset ? " is-bad" : ""}`}>
              <label className="sf-lab" htmlFor="au-reset">{AUTH_COPY.email}</label>
              <input className="sf-in" id="au-reset" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} {...invalid("reset", "au-reset")} />
              {err("reset", "au-reset")}
            </div>
            <button type="submit" className="sf-btn sf-btn--full au-gap" disabled={busy}>{AUTH_COPY.resetSend}</button>
            <p className="sf-under"><button type="button" className="sf-link sf-link--in" onClick={toSignin}>{AUTH_COPY.backToSignin}</button></p>
          </form>
        );
      case "expired": {
        const no = status && status.status === "expired" ? status.foundingNo : null;
        const to = status && status.status === "expired" ? status.email : null;
        return (
          <div className="au-solo" data-auth={freshSent ? "fresh-sent" : "expired"}>
            <Port />
            {freshSent ? (
              <div><h2 className="sf-h">{AUTH_COPY.freshHeading}</h2><p className="sf-lede" role="status">{AUTH_COPY.freshBody(no, to)}</p></div>
            ) : (
              <div>
                <h2 className="sf-h">{AUTH_COPY.expiredHeading}</h2>
                <p className="sf-lede">{AUTH_COPY.expiredBody(no, to)}</p>
                <div className="au-acts">
                  <button type="button" className="sf-btn" onClick={onFresh} disabled={busy}>{AUTH_COPY.fresh}</button>
                  <button type="button" className="sf-btn sf-btn--line" onClick={toSignin}>{AUTH_COPY.haveAccount}</button>
                </div>
              </div>
            )}
          </div>
        );
      }
      default: {
        const unhandled: never = screen;
        return unhandled;
      }
    }
  })();

  return (
    <SetupFrame
      form="account"
      group={ACCOUNT_GROUP}
      name={tab === "signin" ? "Sign in" : "Create account"}
      otherTab={tab === "signin" ? { id: "signup", label: "Create account" } : { id: "signin", label: "Sign in" }}
      onTab={(id) => (id === "signin" ? toSignin() : toCreate())}
      exitLabel="Back to site"
      onExit={() => goPublic("/")}
    >
      {offer ? (
        <div className="sf-pair" data-auth-screen={screen}>
          {offer}
          <section className="sf-card sf-authcard" data-sf="card">{card}</section>
        </div>
      ) : (
        <div className="au-solowrap" data-auth-screen={screen}>
          <section className="sf-card sf-authcard" data-sf="card">{card}</section>
        </div>
      )}
    </SetupFrame>
  );
};
