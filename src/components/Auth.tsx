/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useScriptAllyDb } from "../lib/db";
import { SetupFrame, ACCOUNT_GROUP } from "./onboarding/SetupFrame";
import { useIsMobile } from "./shell/mobileChrome";
import { BETA_MODE, INVITE_GATE_ENABLED } from "../lib/beta";
import {
  INVITE_LABEL, INVITE_PLACEHOLDER, INVITE_MISSING, INVITE_REJECTED,
  looksLikeInviteCode, normaliseInviteCode,
} from "../lib/inviteCode";
import { signInWithGoogle, sendReset, isValidEmail } from "../lib/authActions";
import { HERO_H1, FOUNDING_EYEBROW, FOUNDING_GET_LEAD, FOUNDING_GETS } from "../marketing/landingCopy";

type Mode = "signin" | "signup";
type Banner = { type: "error" | "success"; message: string; offerReset?: boolean } | null;

// Brand mark used in the top nav and the form's brand lockup (the quill from the mockup).
/** The flock: the Founders page's own drawing, and the one drawing in the whole journey. */
const FLOCK = { src: "/images/off-the-ground.png", version: "430029d2", width: 1200, height: 1200 };

/** Lab-only starting state (`#/onb-lab`), so a screen can be held where a real visit would have to
 *  be driven — the reset's "sent" card would otherwise need a real reset email requested. */
export interface AuthLabState {
  view?: "auth" | "reset";
  resetSent?: boolean;
  email?: string;
  /** Draw the invite field regardless of the flag. It changes what is DRAWN and nothing else:
   *  every handler still reads `BETA_MODE && INVITE_GATE_ENABLED`. */
  showInvite?: boolean;
}

export const Auth: React.FC<{ initialMode?: "login" | "signup"; lab?: AuthLabState }> = ({ initialMode, lab }) => {
  /* Phone last screens v1 (1B): below 768px the sibling tab is hidden, so the sign-up card carries the way
     back to sign in (the sign-in card already carries "New to QueryHawk? Create an account"). */
  const isPhone = useIsMobile();
  const { login, signup } = useScriptAllyDb();
  /* ⚠️ IN-APP NAVIGATION, NOT href. This screen used to link out to https://scriptally.ink for
     "Back to site" and to /terms and /privacy on that host — pages which could not exist, because
     both hosting configs rewrite ** to /index.html and would serve the app instead. Leaving the
     screen at all also meant losing any deep link the visitor arrived on. The clearing of the
     pre-auth hash matters: without it, #/signup survives the navigation and App re-renders this
     same screen over the page you asked for. */
  const navigate = useNavigate();
  const goPublic = (path: string) => {
    if (window.location.hash) window.history.replaceState(null, "", window.location.pathname + window.location.search);
    navigate(path);
  };

  // Default mode is Create account — the page is the founding-members front door. `initialMode`
  // only forces sign-in when something explicitly asks for it (e.g. a #/login deep link).
  const [mode, setMode] = useState<Mode>(initialMode === "login" ? "signin" : "signup");
  const [view, setView] = useState<"auth" | "reset">(lab?.view ?? "auth");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetEmail, setResetEmail] = useState(lab?.email ?? "");

  /* ⚠️ THE INVITE GATE IS PRESENTATION; THE GATE IS THE CALLABLE. `redeemInviteCode` validates and
     marks a code used inside a transaction, server-side — a browser check gates nothing, because
     the account is created by the Auth SDK and anyone can call that from a console. This state only
     decides whether the door is drawn and refuses to submit until the server has said yes. */
  const [inviteCode, setInviteCode] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [showPw, setShowPw] = useState(false);
  const [errs, setErrs] = useState<{ name?: string; email?: string; pw?: string; reset?: string }>({});
  const [banner, setBanner] = useState<Banner>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetSent, setResetSent] = useState(lab?.resetSent ?? false);

  const isSignin = mode === "signin";

  const switchMode = (m: Mode) => {
    setMode(m);
    setErrs({});
    setBanner(null);
  };

  /* ⚠️ THE SCREEN FOLLOWS THE ADDRESS (public pages on phones v1). App already listens for
     `hashchange` (`useHash`) and hands a new `initialMode` when the address moves between #/login
     (or #/signin) and #/signup — but this component seeded its mode from the prop once and never
     looked again, so going from #/login to #/signup with no reload kept showing Sign in. The listener
     stays App's; this only follows the prop it passes. Nothing is remounted, so a typed email stays. */
  const firstMode = useRef(true);
  useEffect(() => {
    if (firstMode.current) { firstMode.current = false; return; }
    if (!initialMode) return;
    setView("auth");
    switchMode(initialMode === "login" ? "signin" : "signup");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMode]);

  // ── Email / password ────────────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBanner(null);
    const next: typeof errs = {};
    if (mode === "signup" && !name.trim()) next.name = "Please tell us your name.";
    if (!email.trim()) next.email = "Please enter your email address.";
    else if (!isValidEmail(email)) next.email = "That doesn’t look like a valid email address.";
    if (!password) next.pw = "Please enter your password.";
    else if (mode === "signup" && password.length < 8) next.pw = "Use at least 8 characters for your password.";
    setErrs(next);

    /* An empty or implausible code never reaches the server — not as a security measure (the
       server refuses it too, identically) but so a writer who simply has not pasted it yet is told
       so rather than being handed the rejection message meant for a bad code. */
    const needsInvite = BETA_MODE && INVITE_GATE_ENABLED && mode === "signup";
    const inviteMissing = needsInvite && !looksLikeInviteCode(inviteCode);
    setInviteError(inviteMissing ? INVITE_MISSING : null);

    if (Object.keys(next).length || inviteMissing) return;

    setSubmitting(true);
    try {
      // Existing db.tsx exports — unchanged. On success, the onAuthStateChanged listener takes over
      // and App swaps this screen for the app, so there is nothing to do here on the happy path.
      if (isSignin) {
        await login(email.trim(), password);
      } else {
        /* ⚠️ REDEEMED BEFORE THE ACCOUNT IS CREATED, and the order matters: creating first and
           checking after would leave an account behind every rejected code. A caller can burn a
           code without finishing signup — self-limiting, since they had the code — which is the
           honest trade for a gate that cannot be bypassed. */
        if (BETA_MODE && INVITE_GATE_ENABLED) {
          const { getFunctions, httpsCallable } = await import("firebase/functions");
          const redeem = httpsCallable(getFunctions(undefined, "europe-west2"), "redeemInviteCode");
          try {
            await redeem({ code: normaliseInviteCode(inviteCode), email: email.trim() });
          } catch {
            /* ⚠️ ONE MESSAGE FOR EVERY FAILURE. Wrong code, spent code and a server that could not
               answer all read the same — telling them apart turns the form into an oracle you can
               feed codes to. */
            setInviteError(INVITE_REJECTED);
            setSubmitting(false);
            return;
          }
        }
        await signup(name.trim(), email.trim(), password);
      }
    } catch (err: any) {
      setBanner({ type: "error", message: err?.message || "Something went wrong. Please try again.", offerReset: isSignin });
      setSubmitting(false);
    }
  };

  // ── Google ──────────────────────────────────────────────────────────────────────────────────
  const handleGoogle = async () => {
    setBanner(null);
    setErrs({});
    /* ⚠️ THE GOOGLE PATH NEEDS THE SAME CODE, and this only covers the Create-account tab.
       Google sign-in CREATES an account when none exists, so a determined visitor on the Sign-in
       tab still gets in — closing that needs a `beforeUserCreated` blocking Auth trigger, which is
       flagged in the run report and NOT built here. This is a real gate on the honest route, not a
       complete one. */
    if (BETA_MODE && INVITE_GATE_ENABLED && !isSignin) {
      if (!looksLikeInviteCode(inviteCode)) { setInviteError(INVITE_MISSING); return; }
      try {
        const { getFunctions, httpsCallable } = await import("firebase/functions");
        const redeem = httpsCallable(getFunctions(undefined, "europe-west2"), "redeemInviteCode");
        await redeem({ code: normaliseInviteCode(inviteCode), email: email.trim() });
      } catch {
        setInviteError(INVITE_REJECTED);
        return;
      }
    }
    setGoogleBusy(true);
    try {
      await signInWithGoogle(); // success unmounts this screen via the auth listener; cancel is silent
    } catch (err: any) {
      setBanner({ type: "error", message: err?.message || "Something went wrong. Please try again." });
    } finally {
      setGoogleBusy(false);
    }
  };

  // ── Password reset ──────────────────────────────────────────────────────────────────────────
  const openReset = () => {
    setResetEmail(email.trim());
    setErrs({});
    setBanner(null);
    setResetSent(false);
    setView("reset");
  };
  const backToAuth = () => {
    setView("auth");
    setErrs({});
    setBanner(null);
  };
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim() || !isValidEmail(resetEmail)) {
      setErrs({ reset: "Please enter a valid email address." });
      return;
    }
    setErrs({});
    setResetBusy(true);
    try {
      await sendReset(resetEmail); // resolves even when no account exists (privacy)
      setResetSent(true);
    } catch (err: any) {
      setErrs({ reset: err?.message || "Could not send the reset link. Please try again." });
    } finally {
      setResetBusy(false);
    }
  };

  const inviteShown = (lab?.showInvite ?? (BETA_MODE && INVITE_GATE_ENABLED)) && !isSignin;

  return (
    <SetupFrame
      form="account"
      group={ACCOUNT_GROUP}
      name={isSignin ? "Sign in" : "Create account"}
      otherTab={isSignin ? { id: "signup", label: "Create account" } : { id: "signin", label: "Sign in" }}
      /* The recessed tab switches mode — it replaces the segmented control. Typed email survives:
         the mode is state on this one component, so nothing is remounted. */
      onTab={(id) => { if (view === "reset") backToAuth(); switchMode(id as Mode); }}
      exitLabel="Back to site"
      onExit={() => goPublic("/")}
    >
      <div className="sf-pair" data-auth={view === "reset" ? (resetSent ? "reset-sent" : "reset") : mode}>
        {/* The founding offer, on the app's navy panel. Sign-up states the deal in the landing page's
            own words, imported; sign-in and reset greet a returning writer. */}
        <section className="sf-offer" data-sf="offer">
          <p className="sf-eyebrow">{FOUNDING_EYEBROW}</p>
          {isSignin ? (
            <>
              <h1 className="sf-offerh">Welcome back.</h1>
              <p className="sf-offerp">Sign in to pick up your querying where you left off.</p>
            </>
          ) : (
            <>
              <h1 className="sf-offerh">{HERO_H1}</h1>
              <p className="sf-offerp sf-offerlead">{FOUNDING_GET_LEAD}</p>
              <ul className="sf-offerlist">
                {FOUNDING_GETS.map((line) => <li key={line}>{line}</li>)}
              </ul>
            </>
          )}
          <img className="sf-flock" src={`${FLOCK.src}?v=${FLOCK.version}`} width={FLOCK.width} height={FLOCK.height} alt="" />
        </section>

        <section className="sf-card sf-authcard" data-sf="card">
          {view === "auth" ? (
            <>
              <h2 className="sf-h">{isSignin ? "Sign in" : "Create your account"}</h2>
              {!isSignin && <p className="sf-lede">Let’s put QueryHawk to work on organising your pipeline.</p>}

              <form onSubmit={handleSubmit} noValidate>
                {inviteShown && (
                  <div className="sf-invite">
                    <div className={`sf-field${inviteError ? " is-bad" : ""}`}>
                      <label className="sf-lab" htmlFor="au-invite">{INVITE_LABEL}</label>
                      <input
                        className="sf-in" id="au-invite" type="text" autoComplete="off"
                        placeholder={INVITE_PLACEHOLDER} value={inviteCode}
                        onChange={(e) => { setInviteCode(e.target.value); if (inviteError) setInviteError(null); }}
                      />
                      {inviteError && <p className="sf-err">{inviteError}</p>}
                    </div>
                  </div>
                )}

                <button type="button" className="sf-google" onClick={handleGoogle} disabled={googleBusy}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.15-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
                    <path fill="#FBBC05" d="M5.85 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.67-2.84z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.67 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
                  </svg>
                  {googleBusy ? "Connecting to Google…" : isSignin ? "Continue with Google" : "Sign up with Google"}
                </button>

                <div className="sf-or"><span>or with email</span></div>

                {!isSignin && (
                  <div className={`sf-field${errs.name ? " is-bad" : ""}`}>
                    <label className="sf-lab" htmlFor="au-name">Your name</label>
                    <input className="sf-in" id="au-name" type="text" autoComplete="name" placeholder="e.g. Lucy Sterling" value={name} onChange={(e) => setName(e.target.value)} />
                    {errs.name && <p className="sf-err">{errs.name}</p>}
                  </div>
                )}

                <div className={`sf-field${errs.email ? " is-bad" : ""}`}>
                  <label className="sf-lab" htmlFor="au-email">Email address</label>
                  <input className="sf-in" id="au-email" type="email" autoComplete="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                  {errs.email && <p className="sf-err">{errs.email}</p>}
                </div>

                <div className={`sf-field${errs.pw ? " is-bad" : ""}`}>
                  <div className="sf-labrow">
                    <label className="sf-lab" htmlFor="au-pw">
                      Password{!isSignin && <span className="sf-labq"> · at least 8 characters</span>}
                    </label>
                    {isSignin && <button type="button" className="sf-link sf-link--quiet" onClick={openReset}>Forgot?</button>}
                  </div>
                  <div className="sf-inwrap sf-inwrap--eye">
                    <input className="sf-in" id="au-pw" type={showPw ? "text" : "password"} autoComplete={isSignin ? "current-password" : "new-password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                    <button type="button" className="sf-eye" aria-label={showPw ? "Hide password" : "Show password"} onClick={() => setShowPw((v) => !v)}>
                      {showPw ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.2 4.2" /><path d="M9.4 5.2A9.3 9.3 0 0 1 12 5c6.5 0 10 7 10 7a16 16 0 0 1-3.3 4M6.6 6.6A16 16 0 0 0 2 12s3.5 7 10 7a9.3 9.3 0 0 0 3-.5" /></svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>
                      )}
                    </button>
                  </div>
                  {errs.pw && <p className="sf-err">{errs.pw}</p>}
                </div>

                {/* One sentence: rust for an error, ink for a success. */}
                {banner && (
                  <p className={`sf-msg sf-msg--${banner.type}`} role={banner.type === "error" ? "alert" : "status"}>
                    {banner.message}
                    {banner.offerReset && (
                      <> <button type="button" className="sf-link sf-link--in" onClick={openReset}>Reset your password</button>.</>
                    )}
                  </p>
                )}

                <button type="submit" className="sf-btn sf-btn--full" disabled={submitting}>
                  {submitting && <span className="sf-spin" aria-hidden="true" />}
                  {submitting
                    ? isSignin ? "Signing in…" : "Creating account…"
                    : isSignin ? "Sign in" : "Create your account"}
                </button>
              </form>

              {isSignin ? (
                <p className="sf-under">
                  New to QueryHawk? <button type="button" className="sf-link sf-link--in" onClick={() => switchMode("signup")}>Create an account</button>
                </p>
              ) : (<>
                {isPhone && (
                  <p className="sf-under" data-sf="to-signin-line">
                    Already have an account? <button type="button" className="sf-link sf-link--in" onClick={() => switchMode("signin")} data-sf="to-signin">Sign in</button>
                  </p>
                )}
                <p className="sf-under">
                  By continuing you agree to our{" "}
                  <button type="button" className="sf-link sf-link--in" onClick={() => goPublic("/terms")}>Terms</button> &amp;{" "}
                  <button type="button" className="sf-link sf-link--in" onClick={() => goPublic("/privacy")}>Privacy Policy</button>.
                </p>
              </>)}
            </>
          ) : !resetSent ? (
            <form onSubmit={handleReset} noValidate>
              <h2 className="sf-h">Reset your password</h2>
              <p className="sf-lede">Enter the email on your account and we’ll send a secure link to set a new password.</p>
              <div className={`sf-field${errs.reset ? " is-bad" : ""}`}>
                <label className="sf-lab" htmlFor="au-reset">Email address</label>
                <input className="sf-in" id="au-reset" type="email" autoComplete="email" placeholder="you@email.com" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} />
                {errs.reset && <p className="sf-err">{errs.reset}</p>}
              </div>
              <div className="sf-cfoot">
                <button type="button" className="sf-link" onClick={backToAuth}>‹ Back to sign in</button>
                <button type="submit" className="sf-btn" disabled={resetBusy}>
                  {resetBusy && <span className="sf-spin" aria-hidden="true" />}
                  {resetBusy ? "Sending…" : "Send reset link"}
                </button>
              </div>
            </form>
          ) : (
            <div>
              <h2 className="sf-h">Check your inbox</h2>
              <p className="sf-lede">If an account exists for <strong>{resetEmail.trim()}</strong>, a reset link is on its way. It expires in an hour.</p>
              <div className="sf-cfoot">
                <button type="button" className="sf-link" onClick={backToAuth}>‹ Back to sign in</button>
              </div>
            </div>
          )}
        </section>
      </div>
    </SetupFrame>
  );
};
