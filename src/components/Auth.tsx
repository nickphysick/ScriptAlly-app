/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useScriptAllyDb } from "../lib/db";
import { signInWithGoogle, sendReset, isValidEmail } from "../lib/authActions";
import { LoginDashboardPreview } from "./auth/LoginDashboardPreview";
import "./auth/auth.css";

type Mode = "signin" | "signup";
type Banner = { type: "error" | "success"; message: string; offerReset?: boolean } | null;

// Brand mark used in the top nav and the form's brand lockup (the quill from the mockup).
const QuillMark: React.FC<{ size?: number }> = ({ size = 17 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 5c-4 1-9 4-12 9-1 1.5-1.8 3.4-2 5" />
    <path d="M20 5c1 5-2 11-8 13" />
    <path d="M6 19c2-3 5-5 9-6" />
  </svg>
);

const BannerIcon: React.FC<{ type: "error" | "success" }> = ({ type }) =>
  type === "success" ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
  );

export const Auth: React.FC<{ initialMode?: "login" | "signup" }> = ({ initialMode }) => {
  const { login, signup } = useScriptAllyDb();

  // Default mode is Create account — the page is the founding-members front door. `initialMode`
  // only forces sign-in when something explicitly asks for it (e.g. a #/login deep link).
  const [mode, setMode] = useState<Mode>(initialMode === "login" ? "signin" : "signup");
  const [view, setView] = useState<"auth" | "reset">("auth");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");

  const [showPw, setShowPw] = useState(false);
  const [errs, setErrs] = useState<{ name?: string; email?: string; pw?: string; reset?: string }>({});
  const [banner, setBanner] = useState<Banner>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const isSignin = mode === "signin";

  const switchMode = (m: Mode) => {
    setMode(m);
    setErrs({});
    setBanner(null);
  };

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
    if (Object.keys(next).length) return;

    setSubmitting(true);
    try {
      // Existing db.tsx exports — unchanged. On success, the onAuthStateChanged listener takes over
      // and App swaps this screen for the app, so there is nothing to do here on the happy path.
      if (isSignin) await login(email.trim(), password);
      else await signup(name.trim(), email.trim(), password);
    } catch (err: any) {
      setBanner({ type: "error", message: err?.message || "Something went wrong. Please try again.", offerReset: isSignin });
      setSubmitting(false);
    }
  };

  // ── Google ──────────────────────────────────────────────────────────────────────────────────
  const handleGoogle = async () => {
    setBanner(null);
    setErrs({});
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

  return (
    <div className="sa-au-root">
      <div className="topnav">
        <div className="nav-brand">
          <div className="nav-chip"><QuillMark size={16} /></div>
          <span className="nav-word">ScriptAlly</span>
        </div>
        <div className="nav-right">
          <span className="nav-pill"><span className="dot" />Founding Members open</span>
          <a className="nav-link" href="https://scriptally.ink">
            Back to site
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7M9 7h8v8" /></svg>
          </a>
        </div>
      </div>

      <div className="scene">
        <div className="split-card paper">
          <div className="au-rim" aria-hidden="true"><div className="au-band" /></div>
          <div className="frame">

            {/* ===== LEFT: FORM ===== */}
            <div className="col-form">
              <div className="brand-lock">
                <div className="chip"><QuillMark size={17} /></div>
                <span className="word">ScriptAlly</span>
              </div>

              {view === "auth" ? (
                <div>
                  <h1 className="lead-h">{isSignin ? "Welcome back" : "Take the eerie out of query"}</h1>
                  <p className="lead-s">
                    {isSignin
                      ? "Sign in to pick up your querying where you left off."
                      : "Let’s put ScriptAlly to work on organising your pipeline."}
                  </p>

                  <div className="seg" role="tablist">
                    <button type="button" className={`seg-opt${isSignin ? " active" : ""}`} onClick={() => switchMode("signin")}>Sign in</button>
                    <button type="button" className={`seg-opt${!isSignin ? " active" : ""}`} onClick={() => switchMode("signup")}>Create account</button>
                  </div>

                  <button type="button" className="g-btn" onClick={handleGoogle} disabled={googleBusy}>
                    <svg viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.15-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
                      <path fill="#FBBC05" d="M5.85 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.67-2.84z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.67 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
                    </svg>
                    {googleBusy ? "Connecting to Google…" : isSignin ? "Continue with Google" : "Sign up with Google"}
                  </button>

                  <div className="divider"><span>or with email</span></div>

                  <form onSubmit={handleSubmit} noValidate>
                    {!isSignin && (
                      <div className="field">
                        <label htmlFor="au-name">Your name</label>
                        <div className={`inp${errs.name ? " bad" : ""}`}>
                          <span className="ic"><QuillMark size={15} /></span>
                          <input id="au-name" type="text" autoComplete="name" placeholder="e.g. Lucy Sterling" value={name} onChange={(e) => setName(e.target.value)} />
                        </div>
                        {errs.name && <div className="err">{errs.name}</div>}
                      </div>
                    )}

                    <div className="field">
                      <label htmlFor="au-email">Email address</label>
                      <div className={`inp${errs.email ? " bad" : ""}`}>
                        <span className="ic">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m3.5 7 8.5 6 8.5-6" /></svg>
                        </span>
                        <input id="au-email" type="email" autoComplete="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                      </div>
                      {errs.email && <div className="err">{errs.email}</div>}
                    </div>

                    <div className="field">
                      <div className="lab-row">
                        <label htmlFor="au-pw">Password</label>
                        <button type="button" className="forgot" onClick={openReset} style={{ visibility: isSignin ? "visible" : "hidden" }}>Forgot?</button>
                      </div>
                      <div className={`inp${errs.pw ? " bad" : ""}`}>
                        <span className="ic">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="15" r="4" /><path d="m11 12 8-8M16 5l3 3M14 7l2 2" /></svg>
                        </span>
                        <input id="au-pw" type={showPw ? "text" : "password"} autoComplete={isSignin ? "current-password" : "new-password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                        <button type="button" className="eye" aria-label={showPw ? "Hide password" : "Show password"} onClick={() => setShowPw((s) => !s)}>
                          {showPw ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.2 4.2" /><path d="M9.4 5.2A9.3 9.3 0 0 1 12 5c6.5 0 10 7 10 7a16 16 0 0 1-3.3 4M6.6 6.6A16 16 0 0 0 2 12s3.5 7 10 7a9.3 9.3 0 0 0 3-.5" /></svg>
                          ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>
                          )}
                        </button>
                      </div>
                      {errs.pw && <div className="err">{errs.pw}</div>}
                    </div>

                    {banner && (
                      <div className={`banner ${banner.type}`}>
                        <span className="b-ic"><BannerIcon type={banner.type} /></span>
                        <span>
                          {banner.message}
                          {banner.offerReset && (
                            <> <button type="button" onClick={openReset}>Reset your password</button>.</>
                          )}
                        </span>
                      </div>
                    )}

                    <div className="btn-row">
                      <button type="submit" className="b-primary" disabled={submitting}>
                        {submitting && <span className="spin" />}
                        {submitting
                          ? isSignin ? "Signing in…" : "Creating account…"
                          : isSignin ? "Sign in" : "Create your account"}
                      </button>
                    </div>
                  </form>

                  <div className="foot">
                    {isSignin ? (
                      <>New to ScriptAlly? <button type="button" className="link" onClick={() => switchMode("signup")}>Create an account</button></>
                    ) : (
                      <>Already have an account? <button type="button" className="link" onClick={() => switchMode("signin")}>Sign in</button></>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  {!resetSent ? (
                    <form onSubmit={handleReset} noValidate>
                      <h1 className="reset-head">Reset your password</h1>
                      <p className="reset-blurb">Enter the email on your account and we’ll send a secure link to set a new password.</p>
                      <div className="field">
                        <label htmlFor="au-reset">Email address</label>
                        <div className={`inp${errs.reset ? " bad" : ""}`}>
                          <span className="ic">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m3.5 7 8.5 6 8.5-6" /></svg>
                          </span>
                          <input id="au-reset" type="email" autoComplete="email" placeholder="you@email.com" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} />
                        </div>
                        {errs.reset && <div className="err">{errs.reset}</div>}
                      </div>
                      <div className="btn-row">
                        <button type="submit" className="b-primary" disabled={resetBusy}>
                          {resetBusy && <span className="spin" />}
                          {resetBusy ? "Sending…" : "Send reset link"}
                        </button>
                      </div>
                      <button type="button" className="back-link" onClick={backToAuth}>← Back to sign in</button>
                    </form>
                  ) : (
                    <div>
                      <div className="reset-ok">
                        <div className="ok-ring">
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                        </div>
                        <h4>Check your inbox</h4>
                        <p>If an account exists for <b>{resetEmail.trim()}</b>, a reset link is on its way. It expires in an hour.</p>
                      </div>
                      <button type="button" className="back-link" onClick={backToAuth}>← Back to sign in</button>
                    </div>
                  )}
                </div>
              )}

              <div className="spacer" />
              {view === "auth" && !isSignin && (
                <p className="terms">By continuing you agree to our <a href="https://scriptally.ink/terms">Terms</a> &amp; <a href="https://scriptally.ink/privacy">Privacy Policy</a>.</p>
              )}
            </div>

            {/* ===== RIGHT: FEATURE PANEL ===== */}
            <div className="col-feature">
              <div className="feat-head">
                <div className="feat-eyebrow">Query with confidence</div>
                <h2 className="feat-h">Every query, request &amp; submission, slotted into a <em>clear, orderly database</em>.</h2>
                <p className="feat-s">Build your agent list, curate your submission packages, set reminders for important dates — ScriptAlly tracks your querying journey from start to finish, so you can get back to writing.</p>
              </div>
              <div className="preview-wrap">
                <LoginDashboardPreview />
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
