/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Account settings. Low-risk, fully-working pieces are live now:
 *   - Display name (validated, written to the user doc via updateUserProfile)
 *   - Password change via the existing email reset link (no reauth needed — Firebase handles it)
 *   - Plan / subscription shown read-only, with a link to Pricing
 *
 * Email change is SCAFFOLDED ONLY (see the section below). Changing a Firebase Auth email requires
 * recent re-authentication and ideally verifyBeforeUpdateEmail; shipping it half-working would risk
 * locking a user out of their account, so it is intentionally disabled until done properly.
 */
import React, { useState } from "react";
import { useScriptAllyDb } from "../lib/db";
import { validateDisplayName } from "../lib/accountValidation";
import { User as UserIcon, Mail, Key, Sparkles, Check, ChevronRight } from "lucide-react";

const INK = "#3a1c14";
const BURGUNDY = "#7c3a2a";
const CARD = "#F8F5F0";
const HAIRLINE = "rgba(124,58,42,0.12)";

const Section: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
  <section className="rounded-2xl border p-6 mb-5" style={{ background: CARD, borderColor: HAIRLINE }}>
    <h2 className="flex items-center gap-2 font-serif text-lg mb-4" style={{ color: INK }}>
      <span style={{ color: BURGUNDY }}>{icon}</span> {title}
    </h2>
    {children}
  </section>
);

const inputClass =
  "w-full px-3 py-2 text-sm bg-white rounded border focus:outline-none focus:ring-1 text-[#3a1c14]";

export const AccountSettings: React.FC<{ onNavigate: (tab: string, subPageName?: string) => void }> = ({ onNavigate }) => {
  const { currentUser, updateUserProfile, resetPassword } = useScriptAllyDb();
  const [name, setName] = useState(currentUser?.name ?? "");
  const [nameStatus, setNameStatus] = useState<{ type: "idle" | "saving" | "saved" | "error"; msg?: string }>({ type: "idle" });
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  if (!currentUser) return null;

  const nameChanged = name.trim() !== (currentUser.name ?? "").trim();
  const nameValid = validateDisplayName(name).ok;

  const saveName = async () => {
    const v = validateDisplayName(name);
    if (!v.ok) {
      setNameStatus({ type: "error", msg: v.error });
      return;
    }
    setNameStatus({ type: "saving" });
    try {
      await updateUserProfile({ name: v.value });
      setNameStatus({ type: "saved", msg: "Saved" });
      setTimeout(() => setNameStatus({ type: "idle" }), 2500);
    } catch {
      setNameStatus({ type: "error", msg: "Couldn't save. Please try again." });
    }
  };

  const sendReset = async () => {
    setResetMsg(null);
    try {
      await resetPassword(currentUser.email);
      setResetMsg(`Password reset link sent to ${currentUser.email}. Check your inbox.`);
    } catch (e: any) {
      setResetMsg(e?.message || "Couldn't send the reset link. Please try again.");
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "#F5F0EA" }}>
      <div className="max-w-2xl mx-auto px-4 md:px-8 py-10">
        <h1 className="font-serif text-3xl mb-1" style={{ color: INK }}>My account</h1>
        <p className="text-sm mb-8" style={{ color: "rgba(58,28,20,0.6)" }}>
          Manage your profile and sign-in details.
        </p>

        {/* Profile — display name (live) */}
        <Section title="Profile" icon={<UserIcon className="w-4 h-4" />}>
          <label htmlFor="account-name" className="block text-xs font-semibold mb-1" style={{ color: "rgba(58,28,20,0.7)" }}>
            DISPLAY NAME
          </label>
          <input
            id="account-name"
            type="text"
            value={name}
            maxLength={256}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            style={{ borderColor: HAIRLINE }}
          />
          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={saveName}
              disabled={!nameChanged || !nameValid || nameStatus.type === "saving"}
              className="px-4 py-2 text-sm rounded font-serif font-medium text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: BURGUNDY }}
            >
              {nameStatus.type === "saving" ? "Saving…" : "Save name"}
            </button>
            {nameStatus.type === "saved" && (
              <span className="flex items-center gap-1 text-xs font-medium" style={{ color: "#3B6D11" }}>
                <Check className="w-3.5 h-3.5" /> {nameStatus.msg}
              </span>
            )}
            {nameStatus.type === "error" && (
              <span className="text-xs font-medium" style={{ color: "#A32D2D" }}>{nameStatus.msg}</span>
            )}
          </div>
        </Section>

        {/* Plan (read-only) */}
        <Section title="Plan" icon={<Sparkles className="w-4 h-4" />}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: INK }}>
                {currentUser.plan} plan
              </p>
              <p className="text-xs" style={{ color: "rgba(58,28,20,0.6)" }}>
                Subscription: {currentUser.subscriptionStatus}
              </p>
            </div>
            <button
              onClick={() => onNavigate("pricing")}
              className="flex items-center gap-1 text-xs font-semibold"
              style={{ color: BURGUNDY }}
            >
              View plans <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </Section>

        {/* Sign-in & security */}
        <Section title="Sign-in & security" icon={<Key className="w-4 h-4" />}>
          {/* Email — read-only for now (changing it needs reauth; see scaffold below) */}
          <label htmlFor="account-email" className="block text-xs font-semibold mb-1" style={{ color: "rgba(58,28,20,0.7)" }}>
            EMAIL
          </label>
          <div className="relative mb-1">
            <Mail className="absolute left-3 top-2.5 w-4 h-4" style={{ color: "rgba(58,28,20,0.4)" }} />
            <input
              id="account-email"
              type="email"
              value={currentUser.email}
              readOnly
              disabled
              className={inputClass + " pl-9 opacity-70 cursor-not-allowed"}
              style={{ borderColor: HAIRLINE }}
            />
          </div>
          {/*
            TODO(email change — needs reauthentication, intentionally not wired):
            Firebase Auth updateEmail() throws auth/requires-recent-login, and a bare updateEmail can
            strand a user on an unverified address. Implement as:
              1. reauthenticateWithCredential(user, EmailAuthProvider.credential(email, currentPassword))
              2. verifyBeforeUpdateEmail(user, newEmail)  // sends a confirm link; email changes only after
              3. on confirm, mirror the new email onto the user doc (rules allow 'email' is NOT in the
                 user update allowlist today — add it there first, or write via a trusted path)
            Until then this is disabled so we never ship a half-working change that could lock someone out.
          */}
          <p className="text-xs mb-5" style={{ color: "rgba(58,28,20,0.5)" }}>
            Changing your email is coming soon — it needs you to re-enter your password for security.
          </p>

          {/* Password — fully working via the existing reset-email flow (no reauth needed). */}
          <div className="pt-4" style={{ borderTop: `0.5px solid ${HAIRLINE}` }}>
            <p className="text-sm font-medium mb-1" style={{ color: INK }}>Password</p>
            <p className="text-xs mb-3" style={{ color: "rgba(58,28,20,0.6)" }}>
              We'll email you a secure link to set a new password.
            </p>
            <button
              onClick={sendReset}
              className="px-4 py-2 text-sm rounded font-serif font-medium border transition-colors"
              style={{ borderColor: BURGUNDY, color: BURGUNDY, background: "transparent" }}
            >
              Send password reset email
            </button>
            {resetMsg && (
              <p className="text-xs mt-3 font-medium" style={{ color: "#3B6D11" }}>{resetMsg}</p>
            )}
          </div>
        </Section>
      </div>
    </div>
  );
};
