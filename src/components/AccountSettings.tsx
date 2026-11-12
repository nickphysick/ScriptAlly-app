/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Settings — five sections, each with a live headline (non-workspace v1, Phase 2; ref: design-refs/settings-v2.html,
 * Redesign view, the sheet only — the app shell's rail and bar are this branch's and stay).
 *
 *   You ........... identity, display name, home country; signing in (email, Google, password, other devices)
 *   Preferences ... a query's clock (Phase 3), what reaches your list, keeping it current, time zone
 *   Emails ........ nudge reminders, weekly summary, product news; what is always sent
 *   Plan .......... founding / Free / Pro (Phase 4 draws the plan table)
 *   Your data ..... take a copy, bring more in, delete your account
 *
 * ⚠️ EVERY CHANGE SAVES ON THE SPOT AND CONFIRMS THE SAME WAY: the postmark stamp (the Contact list's desktop
 *    `Stamp`) and the snackbar with Undo (`showToast({ message, undo })`). The display name saves on blur or
 *    Enter; Escape puts it back. No Save buttons except where the ref draws one.
 * ⚠️ ONE FILLED BUTTON PER SECTION (settingsLaws.test).
 * ⚠️ THE SECTION IS THE URL (accountRoutes.ts), never state.
 * Wiring rule: a control is drawn only when its behaviour exists. Not built: billing (no payment path), the
 *   account purge (deletion is a dated request, completed by hand), passkeys and two-step verification.
 */
import { planColumn } from "../lib/entitlements";
import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useScriptAllyDb } from "../lib/db";
import {
  notifyPrefs, marketingGranted,
  resolveTimeZone, tzOptions,
} from "../lib/accountPrefs";
import { buildExport, downloadExport, exportFilename } from "../lib/dataExport";
import {
  DELETION_GRACE_DAYS, DELETION_CONFIRM_WORD, DELETION_REMOVES,
  deletionArmed, deletionRequest, scheduledDeletion, deletionCancelled,
} from "../lib/accountDeletion";
import { AccountSectionId } from "../lib/accountRoutes";
import { auth } from "../lib/firebase";
import { sendEmailVerification } from "firebase/auth";
import { passwordMode, federatedNames, SECURITY_AFTER_LAUNCH, PASSWORD_ABSENT_NOTE } from "../lib/accountSecurity";
import { readAuthFacts } from "../lib/accountAuthFacts";
import { useToast } from "./toast/ToastProvider";
import { validateDisplayName } from "../lib/accountValidation";
import { MountPanel } from "./MountPanel";
import { AddPassword } from "./settings/AddPassword";
import { SettingsCard, SettingsRow, SettingsNote, IdentityRow } from "./settings/SettingsCards";
import "./settings/settings.css";
import "./agents/contact/contactPrinciples.css"; // the desktop postmark stamp (.clp-stamp-at)
import { CountryCombobox } from "./forms";
import { PlanTable } from "./plans/PlanTable";
import { todoPrefs, STALE_MONTHS_CHOICES } from "../lib/todoPrefs";
import { QUIET_WEEKS, quietWeeksPaths } from "../lib/queryState";
import { queryClock, CLOCK_DEFAULTS } from "../lib/queryClock";
import { ClockTimeline, wk } from "./settings/ClockTimeline";
import { deskPrefPaths, type DeskPrefPatch } from "../lib/userPaths";
import { useSmartImportEntitlement } from "../lib/useSmartImportEntitlement";
import { optionalTaskTypes, staleOptionLabel } from "../lib/accountTasks";
import { countryName } from "../lib/territory";
import { MONTHS_SHORT } from "../lib/dates";
import { startEmailChange, pendingEmailChange, settlePendingEmailChange, signOutOtherDevices } from "../lib/authActions";
import { settingsHeadline } from "../lib/settingsHeadline";
import { saveEmailToggle, finishQuerying, EMAIL_LABEL, type EmailToggle } from "../lib/settingsSaves";
import { DAY_MS } from "../lib/entitlements";
import { Stamp } from "./phone/v4/V4Parts";
import { bodyInk, burgundy, mutedInk, FONT_SERIF, FONT_SANS } from "../lib/designTokens";
import { Trash2, LogOut, Download, Upload, KeyRound, AlertTriangle, X, Lock, Check } from "lucide-react";

const DANGER_INK = "#8c2f2f";
const DANGER_BAND = "linear-gradient(135deg, #f1ddd7 0%, #ecccc4 100%)";
const DANGER_RULE = "rgba(140,47,47,0.22)";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", fontFamily: FONT_SANS, fontSize: 16, color: bodyInk,
  background: "#fffdfa", border: "1px solid rgba(124,58,42,0.18)", borderRadius: 8, outline: "none", minHeight: 40,
};
const primaryBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 16px", fontFamily: FONT_SERIF, fontSize: 14,
  fontWeight: 500, color: "#fff", background: burgundy, border: "none", borderRadius: 8, cursor: "pointer", minHeight: 36,
};
const ghostBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 16px", fontFamily: FONT_SERIF, fontSize: 14,
  fontWeight: 500, color: burgundy, background: "#fff", border: `1px solid ${burgundy}`, borderRadius: 8, cursor: "pointer", minHeight: 36,
};
const linkBtn: React.CSSProperties = {
  background: "none", border: "none", padding: 0, font: "inherit", color: burgundy, textDecoration: "underline",
  textUnderlineOffset: 2, cursor: "pointer", minHeight: 24,
};
const helpText: React.CSSProperties = { fontFamily: FONT_SANS, fontSize: 14, color: mutedInk, lineHeight: 1.45 };

/** The ink toggle, 24px tall (the target floor), with its On/Off word beside it. */
const Toggle: React.FC<{ on: boolean; onChange: (next: boolean, el: HTMLElement) => void; label: string }> = ({ on, onChange, label }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
    <span aria-hidden="true" style={{ fontSize: 14, color: mutedInk, minWidth: 22 }}>{on ? "On" : "Off"}</span>
    <button
      type="button" role="switch" aria-checked={on} aria-label={label} className="acct-toggle"
      onClick={(e) => onChange(!on, e.currentTarget)}
      style={{ width: 42, height: 24, borderRadius: 999, background: on ? "var(--ink-band, #2a3a52)" : "#e2d7c9", border: "none", padding: 0, position: "relative", flexShrink: 0, cursor: "pointer", transition: "background 0.15s" }}
    >
      <span aria-hidden="true" className="acct-toggle-k" style={{ position: "absolute", top: 3, left: on ? 21 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 2px rgba(58,28,20,0.2)", transition: "left 0.15s" }} />
    </button>
  </span>
);

/** A quiet chip: "Always on", "Confirmed", "Connected". Never green. */
const Chip: React.FC<{ children: React.ReactNode; warn?: boolean }> = ({ children, warn }) => (
  <span className={`acct-chip${warn ? "" : " acct-chip--muted"}`} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 14 }}>{children}</span>
);

/**
 * The delete dialog — a typed confirmation that schedules, rather than deletes, with the ref's two ways out:
 * download a copy first, or "finished querying" (turns the two reminder emails off and keeps everything).
 */
const DeleteAccountModal: React.FC<{
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  onCopy: () => void;
  onFinished: () => void;
  copied: boolean;
  busy: boolean;
  summary: string;
}> = ({ onClose, onConfirm, onCopy, onFinished, copied, busy, summary }) => {
  const [confirm, setConfirm] = useState("");
  const matched = deletionArmed(confirm);
  const keepRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    keepRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div role="presentation" onMouseDown={onClose} style={{ position: "fixed", inset: 0, zIndex: 120, background: "rgba(46,28,20,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div role="dialog" aria-modal="true" aria-labelledby="del-title" onMouseDown={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 480 }}>
        <MountPanel>
          <div style={{ padding: "13px 18px 11px", background: DANGER_BAND, borderBottom: `1px solid ${DANGER_RULE}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <span className="flex items-center">
              <AlertTriangle style={{ width: 18, height: 18, color: DANGER_INK, marginRight: 10, flexShrink: 0 }} strokeWidth={2} aria-hidden="true" />
              <span id="del-title" style={{ fontFamily: FONT_SERIF, fontSize: 18, fontWeight: 500, color: DANGER_INK }}>Delete your account?</span>
            </span>
            <button onClick={onClose} aria-label="Close" style={{ background: "transparent", border: "none", cursor: "pointer", color: DANGER_INK, display: "inline-flex", padding: 3, minWidth: 24, minHeight: 24 }}>
              <X style={{ width: 18, height: 18 }} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
          <div style={{ padding: 18, fontSize: 16, color: bodyInk }}>
            <p style={{ margin: "0 0 8px" }}>This removes your account and everything in it: {summary}.</p>
            <ul style={{ margin: "0 0 12px", padding: "0 0 0 18px", listStyle: "disc" }}>
              {DELETION_REMOVES.map((line) => <li key={line} style={{ ...helpText, color: bodyInk, marginBottom: 3 }}>{line}</li>)}
            </ul>
            <p style={{ margin: "0 0 12px" }}>Nothing goes straight away. You'll have <b>{DELETION_GRACE_DAYS} days</b> to change your mind.</p>
            <p style={{ ...helpText, margin: "0 0 8px" }} data-del="copy">
              {copied ? "Your copy is downloading." : <>Want to keep your records? <button type="button" style={linkBtn} onClick={onCopy}>Download a copy first</button></>}
            </p>
            <p style={{ ...helpText, margin: "0 0 14px" }}>
              Just finished querying? <button type="button" style={linkBtn} data-del="finished" onClick={onFinished}>Keep your records and stop the reminder emails instead</button>
            </p>
            <label htmlFor="del-confirm" style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Type {DELETION_CONFIRM_WORD} to confirm</label>
            <input id="del-confirm" type="text" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" placeholder={DELETION_CONFIRM_WORD} className="acct-input" style={inputStyle} />
            <div className="flex items-center justify-between" style={{ gap: 12, marginTop: 16 }}>
              <button ref={keepRef} onClick={onClose} className="acct-btn acct-btn--ghost" style={ghostBtn}>Keep my account</button>
              <button
                type="button" id="del-confirm-btn" disabled={!matched || busy} aria-disabled={!matched || busy} onClick={() => { void onConfirm(); }}
                style={{ ...primaryBtn, background: DANGER_INK, opacity: !matched || busy ? 0.4 : 1, cursor: matched && !busy ? "pointer" : "not-allowed" }}
              >
                <Trash2 style={{ width: 14, height: 14 }} aria-hidden="true" />{busy ? "Scheduling…" : "Delete account"}
              </button>
            </div>
            <p id="del-note" style={{ ...helpText, marginTop: 12 }}>Confirming records the request and starts the {DELETION_GRACE_DAYS}-day window. Nothing is removed at this point.</p>
          </div>
        </MountPanel>
      </div>
    </div>,
    document.body,
  );
};

const longDate = (iso: string | null | undefined) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
};

export const AccountSettings: React.FC<{
  /** The section the URL resolves to — App.tsx redirects anything that resolves to nothing. */
  section: AccountSectionId;
  onNavigate: (tab: string, subPageName?: string) => void;
}> = ({ section, onNavigate }) => {
  const {
    currentUser, updateUserProfile, updateUserPaths, resetPassword, entitlement,
    agents, queries, manuscripts, versions, packages, activities, notes, userTasks,
  } = useScriptAllyDb();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const active = section;

  const [name, setName] = useState(currentUser?.name ?? "");
  const [nameErr, setNameErr] = useState<string | null>(null);
  useEffect(() => { setName(currentUser?.name ?? ""); }, [currentUser?.name]);
  const [pwSent, setPwSent] = useState(false);
  const [verifySent, setVerifySent] = useState(false);
  const [authKey, setAuthKey] = useState(0);
  const authFacts = useMemo(() => readAuthFacts(), [authKey]);
  const refreshAuthFacts = useCallback(() => setAuthKey((n) => n + 1), []);
  const [exported, setExported] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [tzOpen, setTzOpen] = useState(false);
  /* Phase 5 — change email and other devices */
  const [emailOpen, setEmailOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailPw, setEmailPw] = useState("");
  const [emailErr, setEmailErr] = useState<string | null>(null);
  const [emailBusy, setEmailBusy] = useState(false);
  const [pending, setPending] = useState(() => pendingEmailChange());
  const [outAll, setOutAll] = useState(false);
  const [outBusy, setOutBusy] = useState(false);
  useEffect(() => { void settlePendingEmailChange().then((done) => { if (done) setPending(null); }); }, []);
  const smartImportUsedUp = useSmartImportEntitlement().reason === "used";

  /* ── the stamp: the Contact list's desktop postmark, at the control that changed ─────────────────── */
  const [stampAt, setStampAt] = useState<{ left: number; top: number; key: number } | null>(null);
  const stamp = useCallback((el: Element | null | undefined) => {
    if (!el || typeof window === "undefined") return;
    const r = el.getBoundingClientRect();
    setStampAt({ left: r.left + r.width / 2 - 37, top: r.top + r.height / 2 - 37, key: Date.now() });
    window.setTimeout(() => setStampAt(null), 1700);
  }, []);
  const today = new Date();
  const stampDate = `${today.getDate()} ${MONTHS_SHORT[today.getMonth()]}`;

  /** The one confirmation: the stamp, then the snackbar with Undo. */
  const saved = (el: Element | null | undefined, message: string, undo?: () => void | Promise<void>) => {
    stamp(el);
    showToast({ message, ...(undo ? { undo } : {}), replaces: "settings-saved" });
  };
  const failed = (what: string) => showToast({ message: `Couldn't save ${what}. Try again?`, replaces: "settings-saved" });

  const exportData = useCallback(() => {
    if (!currentUser) return;
    const now = new Date();
    const bundle = buildExport({ user: currentUser, manuscripts, versions, packages, agents, queries, activities, notes, userTasks }, now);
    downloadExport(bundle, exportFilename(now));
    setExported(true);
  }, [currentUser, manuscripts, versions, packages, agents, queries, activities, notes, userTasks]);

  if (!currentUser) return null;

  const pwMode = passwordMode(authFacts?.providerIds ?? ["password"]);
  const pendingDeletion = scheduledDeletion(currentUser.scheduledDeletion);
  const prefs = todoPrefs(currentUser.todoPrefs);
  const clock = queryClock(currentUser);
  const quietWeeks = clock.quietWeeks;
  const notify = notifyPrefs(currentUser.notifyPrefs);
  const newsOn = marketingGranted(currentUser.marketingConsent);
  const timezone = resolveTimeZone(currentUser.workspacePrefs?.timezone);
  const basis = entitlement.basis;
  const founding = basis === "founding";
  const trialDaysLeft = entitlement.trialEndsMs ? Math.max(1, Math.ceil((entitlement.trialEndsMs - Date.now()) / DAY_MS)) : null;
  const counts = { queries: queries.length, agents: agents.length, manuscripts: manuscripts.length };
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const summary = `${plural(counts.manuscripts, "manuscript", "manuscripts")}, ${plural(counts.agents, "agent", "agents")}, ${plural(counts.queries, "query", "queries")} and their history`;
  const [headline, sub] = settingsHeadline(active, {
    name: currentUser.name || "Your account",
    country: countryName(currentUser.homeCountry) ?? null,
    email: currentUser.email,
    basis, trialDaysLeft,
    emailsOn: { nudges: notify.nudges, weekly: notify.weeklyDigest, news: newsOn },
    quietWeeks, counts,
  });

  /* ── writes ─────────────────────────────────────────────────────────────────────────────────────── */
  const saveName = async (el: HTMLInputElement) => {
    const v = validateDisplayName(name);
    if (!v.ok) { setNameErr("Add a name so we know what to call you."); return false; }
    setNameErr(null);
    if (v.value === (currentUser.name ?? "")) { setName(v.value); return true; }
    const old = currentUser.name ?? "";
    try {
      await updateUserProfile({ name: v.value });
      setName(v.value);
      saved(el, "Display name saved", async () => { await updateUserProfile({ name: old }); setName(old); showToast({ message: "Display name put back", replaces: "settings-saved" }); });
    } catch { failed("your name"); }
    return true;
  };

  const saveHomeCountry = async (code: string) => {
    if (!code || code === currentUser.homeCountry) return;
    const old = currentUser.homeCountry;
    try {
      await updateUserProfile({ homeCountry: code });
      saved(document.getElementById("account-homecountry"), "Home country saved", old ? async () => { await updateUserProfile({ homeCountry: old }); } : undefined);
    } catch { failed("your home country"); }
  };

  /* ⚠️ THE EMAIL TOGGLES GO THROUGH `saveEmailToggle` (lib/settingsSaves), which returns the Undo that writes back
     exactly what was there. Notify keys merge into the whole map; product news rewrites the consent record in both
     directions (UK PECR), never deleting it. */
  const toggleEmail = async (kind: EmailToggle, on: boolean, el: HTMLElement) => {
    try {
      const { message, undo } = await saveEmailToggle(kind, on, { notify, updateUserProfile });
      saved(el, message, async () => { await undo(); showToast({ message: `${EMAIL_LABEL[kind]} back ${on ? "off" : "on"}`, replaces: "settings-saved" }); });
    } catch { failed(EMAIL_LABEL[kind].toLowerCase()); }
  };

  /* ⚠️ BY LEAF, NEVER AS A MAP (`deskPrefPaths`): spreading the view back deleted sibling prefs once. */
  const saveTodoPref = async (patch: DeskPrefPatch, undoPatch: DeskPrefPatch, message: string, el: Element | null) => {
    try {
      await updateUserPaths(deskPrefPaths(patch));
      saved(el, message, async () => { await updateUserPaths(deskPrefPaths(undoPatch)); showToast({ message: "Put back as it was", replaces: "settings-saved" }); });
    } catch { failed("that"); }
  };

  const saveQuietWeeks = async (w: number, el: Element | null) => {
    const old = quietWeeks;
    try {
      await updateUserPaths(quietWeeksPaths(w));
      saved(el, "A query goes quiet after: saved", async () => { await updateUserPaths(quietWeeksPaths(old)); showToast({ message: "Put back as it was", replaces: "settings-saved" }); });
    } catch { failed("that"); }
  };

  const saveTimezone = async (tz: string, el: Element | null) => {
    setTzOpen(false);
    if (tz === timezone) return;
    const old = timezone;
    try {
      await updateUserProfile({ workspacePrefs: { ...(currentUser.workspacePrefs ?? {}), timezone: tz } });
      saved(el, "Time zone saved", async () => { await updateUserProfile({ workspacePrefs: { ...(currentUser.workspacePrefs ?? {}), timezone: old } }); showToast({ message: "Time zone put back", replaces: "settings-saved" }); });
    } catch { failed("your time zone"); }
  };

  const sendReset = async (el: HTMLElement) => {
    try {
      await resetPassword(currentUser.email);
      setPwSent(true);
      saved(el, `Reset link sent to ${currentUser.email}`);
    } catch (e: any) {
      showToast({ message: e?.message || "Couldn't send the reset link. Please try again.", replaces: "settings-saved" });
    }
  };

  const resendVerification = async (el: HTMLElement) => {
    if (!auth.currentUser) return;
    try {
      await sendEmailVerification(auth.currentUser);
      setVerifySent(true);
      saved(el, `Confirmation link sent to ${currentUser.email}`);
    } catch {
      showToast({ message: "Couldn't send it just now. Please try again.", replaces: "settings-saved" });
    }
  };

  /* ⚠️ CONFIRMING WRITES A DATED, CANCELLABLE REQUEST AND DELETES NOTHING (accountDeletion). */
  const requestDeletion = async () => {
    setDeleteBusy(true);
    try {
      await updateUserProfile({ scheduledDeletion: deletionRequest() });
      setShowDelete(false);
      showToast({
        message: `Deletion scheduled. You have ${DELETION_GRACE_DAYS} days to cancel.`,
        undo: async () => { await updateUserProfile({ scheduledDeletion: deletionCancelled() }); showToast({ message: "Deletion cancelled. Nothing was removed.", replaces: "settings-saved" }); },
        replaces: "settings-saved",
      });
    } catch {
      showToast({ message: "Couldn't schedule that. Try again?", replaces: "settings-saved" });
    } finally {
      setDeleteBusy(false);
    }
  };
  const cancelDeletion = async () => {
    try {
      await updateUserProfile({ scheduledDeletion: deletionCancelled() });
      showToast({ message: "Deletion cancelled. Nothing was removed.", replaces: "settings-saved" });
    } catch {
      showToast({ message: "Couldn't cancel that. Try again?", replaces: "settings-saved" });
    }
  };

  /** "Just finished querying?" — `finishQuerying` turns the two reminder emails off and nothing else; we go to Emails to show it. */
  const finishedQuerying = async () => {
    setShowDelete(false);
    try {
      const { message, undo } = await finishQuerying({ notify, updateUserProfile });
      navigate("/account/emails");
      showToast({ message, undo: async () => { await undo(); showToast({ message: "Reminder emails back as they were", replaces: "settings-saved" }); }, replaces: "settings-saved" });
    } catch { failed("your email settings"); }
  };

  const submitEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = newEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { setEmailErr("That doesn't look like an email address."); return; }
    if (v.toLowerCase() === currentUser.email.toLowerCase()) { setEmailErr("That's the address you already use."); return; }
    if (pwMode !== "federated-only" && !emailPw) { setEmailErr("Enter your password, so we know it's you."); return; }
    setEmailErr(null); setEmailBusy(true);
    try {
      await startEmailChange(v, pwMode !== "federated-only" ? emailPw : null);
      setPending({ from: currentUser.email, to: v });
      setEmailOpen(false); setNewEmail(""); setEmailPw("");
      showToast({ message: `Confirmation sent to ${v}`, replaces: "settings-saved" });
    } catch (err: any) {
      setEmailErr(err?.message || "Something went wrong. Please try again.");
    } finally { setEmailBusy(false); }
  };
  const outEverywhere = async (el: HTMLElement) => {
    setOutBusy(true);
    try {
      await signOutOtherDevices();
      setOutAll(true);
      saved(el, "Signed out on your other devices");
    } catch (err: any) {
      showToast({ message: err?.message || "Something went wrong. Please try again.", replaces: "settings-saved" });
    } finally { setOutBusy(false); }
  };

  /* ── sections ───────────────────────────────────────────────────────────────────────────────────── */
  const joined = longDate(authFacts?.createdAt);
  const emailVerified = authFacts?.emailVerified ?? true;

  const youSection = (
    <>
      <SettingsCard heading="You" headingId="acct-h-profile" aside="How you appear in QueryHawk and on anything you export." note="Changes save as you make them.">
        <IdentityRow name={currentUser.name} email={founding ? "Founding writer" : "Writer"} />
        {joined && <SettingsNote>With QueryHawk since {joined}</SettingsNote>}
        <SettingsRow
          label="Display name"
          control={
            <input
              id="account-name" aria-label="Display name" type="text" value={name} maxLength={256} autoComplete="name"
              onChange={(e) => { setName(e.target.value); if (nameErr && e.target.value.trim()) setNameErr(null); }}
              onBlur={(e) => { void saveName(e.currentTarget); }}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); void saveName(e.currentTarget); }
                if (e.key === "Escape") { e.stopPropagation(); setName(currentUser.name ?? ""); setNameErr(null); }
              }}
              className="acct-input sc-grow" style={inputStyle}
              aria-invalid={nameErr ? true : undefined} aria-describedby={nameErr ? "account-name-error" : undefined}
            />
          }
        />
        {nameErr && <SettingsNote><span id="account-name-error" className="acct-err" role="alert">{nameErr}</span></SettingsNote>}
        <SettingsRow
          label="Home country"
          description="Tells your agent list which agents are in your country and which are international."
          control={<div className="sc-grow"><CountryCombobox id="account-homecountry" value={currentUser.homeCountry ?? ""} onChange={saveHomeCountry} placeholder="Not set" /></div>}
        />
      </SettingsCard>

      <SettingsCard heading="Signing in" headingId="acct-h-security" blurb="Keep more than one way in, so you can always get back to your work." note={SECURITY_AFTER_LAUNCH}>
        <SettingsRow
          label="Email address"
          description={<><span className="sc-val">{currentUser.email}</span><br />The address you sign in with, and where our emails go.</>}
          control={
            <>
              {emailVerified ? <Chip><Check style={{ width: 13, height: 13 }} aria-hidden="true" />Confirmed</Chip> : <Chip warn><AlertTriangle style={{ width: 13, height: 13 }} aria-hidden="true" />Not confirmed yet</Chip>}
              {!emailOpen && !pending && <button type="button" data-acct="email-open" onClick={() => setEmailOpen(true)} className="acct-btn acct-btn--ghost" style={ghostBtn}>Change email</button>}
            </>
          }
        />
        {pending && (
          <SettingsNote>
            <span data-acct="email-pending">We've emailed <b>{pending.to}</b>. Your sign-in changes once you've confirmed it from there, and we'll let <b>{pending.from}</b> know when it has.</span>
          </SettingsNote>
        )}
        {emailOpen && (
          <div className="sc-row sc-row--full">
            <form onSubmit={submitEmailChange} noValidate data-acct="email-form" style={{ display: "grid", gap: 10, maxWidth: 460 }}>
              <label htmlFor="acct-newemail" style={{ fontSize: 15, fontWeight: 600 }}>New email address</label>
              <input id="acct-newemail" type="email" autoComplete="email" autoFocus value={newEmail} onChange={(e) => { setNewEmail(e.target.value); setEmailErr(null); }} className="acct-input" style={inputStyle} aria-invalid={emailErr ? true : undefined} aria-describedby={emailErr ? "acct-newemail-e" : undefined} />
              {pwMode !== "federated-only" && (
                <>
                  <label htmlFor="acct-emailpw" style={{ fontSize: 15, fontWeight: 600 }}>Your password</label>
                  <input id="acct-emailpw" type="password" autoComplete="current-password" value={emailPw} onChange={(e) => { setEmailPw(e.target.value); setEmailErr(null); }} className="acct-input" style={inputStyle} />
                </>
              )}
              {emailErr && <span id="acct-newemail-e" className="acct-err" role="alert">{emailErr}</span>}
              <p style={{ ...helpText, margin: 0 }}>We'll send a confirmation to the new address. Nothing changes until you confirm it there.</p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button type="submit" disabled={emailBusy} className="acct-btn acct-btn--primary" style={primaryBtn}>{emailBusy ? "Sending…" : "Send confirmation"}</button>
                <button type="button" onClick={() => { setEmailOpen(false); setEmailErr(null); }} className="acct-btn acct-btn--ghost" style={ghostBtn}>Cancel</button>
              </div>
            </form>
          </div>
        )}
        {!emailVerified && (
          <SettingsRow
            label="Confirm this address"
            description={verifySent ? "Sent just now. Click the link in it, then come back here." : "Until it's confirmed we can't be sure a reset link reaches you."}
            control={<button type="button" onClick={(e) => void resendVerification(e.currentTarget)} className="acct-btn acct-btn--primary" style={primaryBtn}>{verifySent ? "Send again" : "Send the link"}</button>}
          />
        )}
        {federatedNames(authFacts?.providerIds ?? []).map((n) => (
          <SettingsRow key={n} label={n} description={`Sign in with your ${n} account.`} control={<Chip><Check style={{ width: 13, height: 13 }} aria-hidden="true" />Connected</Chip>} />
        ))}
        {pwMode === "federated-only" ? (
          <SettingsRow key={`pw-${authKey}`} label="Password" description={PASSWORD_ABSENT_NOTE} full>
            <div style={{ marginTop: 10 }}><AddPassword buttonStyle={ghostBtn} buttonClassName="acct-btn acct-btn--ghost" onAdded={refreshAuthFacts} /></div>
          </SettingsRow>
        ) : (
          <SettingsRow
            label="Password"
            description={pwSent ? <>Link sent to <b>{currentUser.email}</b> just now.</> : "We'll email you a secure link to set a new one."}
            control={<button type="button" onClick={(e) => void sendReset(e.currentTarget)} className="acct-btn acct-btn--ghost" style={ghostBtn}><KeyRound style={{ width: 14, height: 14 }} aria-hidden="true" />{pwSent ? "Send again" : "Change password"}</button>}
          />
        )}
        <SettingsRow
          label="Other devices"
          description={outAll ? "Done. You're only signed in here now." : "Signs you out everywhere except here. Handy if you've lost a laptop or used a shared computer."}
          control={<button type="button" data-acct="outall" disabled={outBusy} onClick={(e) => void outEverywhere(e.currentTarget)} className="acct-btn acct-btn--ghost" style={ghostBtn}><LogOut style={{ width: 14, height: 14 }} aria-hidden="true" />Sign out of all other devices</button>}
        />
      </SettingsCard>
    </>
  );

  const prefsSection = (
    <>
      <SettingsCard
        heading="A query's clock" headingId="acct-h-preferences"
        blurb="How long QueryHawk waits before it suggests your next move. An agent's own response time always comes first."
        note={clock.quietWeeks !== CLOCK_DEFAULTS.quietWeeks
          ? <>You've changed these from the usual timings. <button type="button" style={linkBtn} onClick={(e) => void saveQuietWeeks(CLOCK_DEFAULTS.quietWeeks, e.currentTarget)}>Put them back</button></>
          : "These are the usual timings. Change any of them to suit how you query."}
      >
        <SettingsRow label="" full><ClockTimeline clock={clock} /></SettingsRow>
        {/* ⚠️ THREE FIXED FIGURES, NOT CONTROLS (Phase 3 partly landed): their readers are not on the one clock yet, and a
            control that changes nothing is a dead control. See lib/queryClock. */}
        <SettingsRow label="Reply expected within" description="Used only when an agent hasn't said how long they take." control={<span className="sc-val" data-clock="reply">{wk(clock.replyWeeks)}</span>} />
        <SettingsRow label="Suggest a nudge" description="Once the reply date has passed." control={<span className="sc-val" data-clock="nudge">{wk(clock.nudgeAfterWeeks)} after</span>} />
        <SettingsRow label="After a nudge, check back in" description="When QueryHawk suggests nudging again if there's still no reply." control={<span className="sc-val" data-clock="check">{wk(clock.checkBackWeeks)}</span>} />
        <SettingsRow
          label="A query goes quiet after"
          description="Counted from the reply date or your last nudge, whichever is later. Quiet queries drop to the back, and QueryHawk suggests closing them."
          control={
            <select id="pf-quiet" className="acct-input sc-grow" style={inputStyle} aria-label="A query goes quiet after" value={clock.quietWeeks} onChange={(e) => void saveQuietWeeks(Number(e.target.value), e.currentTarget)}>
              {QUIET_WEEKS.map((w) => <option key={w} value={w}>{w} weeks</option>)}
            </select>
          }
        />
      </SettingsCard>

      <SettingsCard heading="What reaches your list" headingId="acct-h-tasks" blurb="QueryHawk adds tasks to your to-do list as your queries move. Choose which kinds.">
        <SettingsRow label="Decide" description="When an offer of representation arrives" control={<Chip><Lock style={{ width: 13, height: 13 }} aria-hidden="true" />Always on</Chip>} />
        {optionalTaskTypes().map((t) => (
          <SettingsRow
            key={t.key} label={t.label} description={t.gloss}
            control={<Toggle on={prefs.types[t.key]} label={t.label} onChange={(v, el) => void saveTodoPref({ types: { [t.key]: v } }, { types: { [t.key]: !v } }, `${t.label} tasks ${v ? "on" : "off"}`, el)} />}
          />
        ))}
      </SettingsCard>

      <SettingsCard heading="Keeping your list current" blurb="So it leads with what matters now.">
        <SettingsRow
          label="Keep unfinished tasks"
          description="Anything you don't finish moves to today rather than being left behind."
          control={<Toggle on={prefs.rollForward} label="Keep unfinished tasks" onChange={(v, el) => void saveTodoPref({ rollForward: v }, { rollForward: !v }, `Keep unfinished tasks ${v ? "on" : "off"}`, el)} />}
        />
        <SettingsRow
          label="Move a task to the back of the list after"
          description="Nothing is deleted."
          control={
            <select id="account-stale" aria-label="Move a task to the back of the list after" className="acct-input sc-grow" style={inputStyle} value={prefs.staleMonths} onChange={(e) => void saveTodoPref({ staleMonths: Number(e.target.value) }, { staleMonths: prefs.staleMonths }, "Waiting time saved", e.currentTarget)}>
              {STALE_MONTHS_CHOICES.map((m) => <option key={m} value={m}>{staleOptionLabel(m)}</option>)}
            </select>
          }
        />
      </SettingsCard>

      <SettingsCard heading="Dates and times" blurb="For when reminders and summaries are sent.">
        <SettingsRow
          label="Time zone"
          description={<><b>{timezone.replace(/_/g, " ")}</b><br />{currentUser.workspacePrefs?.timezone ? "Chosen by you." : "Taken from this device."}</>}
          control={tzOpen ? (
            <select id="account-tz" className="acct-input sc-grow" style={inputStyle} aria-label="Time zone" value={timezone} autoFocus onChange={(e) => void saveTimezone(e.target.value, e.currentTarget)} onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); setTzOpen(false); } }}>
              {tzOptions(timezone).map((z) => <option key={z} value={z}>{z.replace(/_/g, " ")}</option>)}
            </select>
          ) : (
            <button type="button" data-acct="tz-open" onClick={() => setTzOpen(true)} className="acct-btn acct-btn--ghost" style={ghostBtn}>Change</button>
          )}
        />
      </SettingsCard>
    </>
  );

  const emailsSection = (
    <>
      <SettingsCard heading="About your querying" headingId="acct-h-emails" blurb="Reminders that keep your queries moving.">
        <SettingsRow
          label="Nudge reminders"
          description={<>When a query is due a nudge. <button type="button" style={linkBtn} onClick={() => navigate("/account/preferences")}>Change when that is</button></>}
          control={<Toggle on={notify.nudges} label="Nudge reminders" onChange={(v, el) => void toggleEmail("nudges", v, el)} />}
        />
        <SettingsRow
          label="Weekly summary"
          description="One email each Monday with what happened in the past week."
          control={<Toggle on={notify.weeklyDigest} label="Weekly summary" onChange={(v, el) => void toggleEmail("weekly", v, el)} />}
        />
      </SettingsCard>
      <SettingsCard heading="News from QueryHawk" blurb="Off unless you turn it on.">
        <SettingsRow
          label="Product news"
          description="Occasional news about new QueryHawk features. One click to stop."
          control={<Toggle on={newsOn} label="Product news" onChange={(v, el) => void toggleEmail("news", v, el)} />}
        />
      </SettingsCard>
      <SettingsCard
        heading="Always sent" blurb="The few we can't switch off."
        note={<>Sent to {currentUser.email}. <button type="button" style={linkBtn} onClick={() => navigate("/account/profile")}>Change it</button><br />Every email we send has a link back to this page.</>}
      >
        <SettingsRow label="About your account" description="Sign-in links, confirmations and anything about your data. These always reach you." control={<Chip><Lock style={{ width: 13, height: 13 }} aria-hidden="true" />Always on</Chip>} />
      </SettingsCard>
    </>
  );

  const smartLine = smartImportUsedUp ? "Used." : "Bring your existing tracker across from a spreadsheet or photos. You haven't used yours yet.";
  const planSection = founding ? (
    <>
      <SettingsCard heading="Your plan" headingId="acct-h-plan" blurb="You're one of our first 50 writers. Thank you for helping us get this right.">
        <SettingsRow label="Founding writer" description="Full QueryHawk Pro, free for your whole querying campaign." control={<Chip><Check style={{ width: 13, height: 13 }} aria-hidden="true" />Everything included</Chip>} />
        <SettingsRow label="Smart Import" description={smartLine} control={<button type="button" onClick={() => onNavigate("import")} className="acct-btn acct-btn--ghost" style={ghostBtn}><Upload style={{ width: 14, height: 14 }} aria-hidden="true" />Open import</button>} />
      </SettingsCard>
      <SettingsCard heading="When your campaign ends" blurb="No lock-in, and nothing to cancel.">
        <SettingsRow label="Finished querying?" description="Just drop us a note to say you're done. Your records stay yours either way." control={<button type="button" onClick={() => onNavigate("contact")} className="acct-btn acct-btn--ghost" style={ghostBtn}>Get in touch</button>} />
        <SettingsRow label="Once we launch" description="There'll be a Free plan and Pro plans." control={<button type="button" onClick={() => onNavigate("plans")} className="acct-btn acct-btn--ghost" style={ghostBtn}>See the plans</button>} />
      </SettingsCard>
    </>
  ) : (
    <>
      <SettingsCard heading="Your plan" headingId="acct-h-plan">
        <SettingsRow
          label={basis === "pro" ? "Pro" : "Free"}
          description={basis === "pro" ? "Every QueryHawk feature." : "One manuscript, unlimited agents, unlimited queries."}
          control={basis === "pro" ? undefined : <button type="button" onClick={() => onNavigate("plans")} className="acct-btn acct-btn--primary" style={primaryBtn}>See Pro plans</button>}
        />
        <SettingsRow label="Smart Import" description={smartImportUsedUp ? "Used." : "Once on every plan. You haven't used yours yet."} control={smartImportUsedUp ? <Chip>Used</Chip> : <button type="button" onClick={() => onNavigate("import")} className="acct-btn acct-btn--ghost" style={ghostBtn}><Upload style={{ width: 14, height: 14 }} aria-hidden="true" />Open import</button>} />
      </SettingsCard>
      <PlanTable viewer={planColumn(entitlement) === "pro" ? "pro" : "free"} />
    </>
  );

  const dataSection = (
    <>
      <SettingsCard
        heading="Take a copy" headingId="acct-h-data" blurb="Everything QueryHawk holds about your querying, in one file."
        note={<>We keep your data while your account exists. If you delete your account, it's gone from our backups within 30 days.{" "}
          <button type="button" style={linkBtn} onClick={() => onNavigate("privacy")}>Privacy policy</button> · <button type="button" style={linkBtn} onClick={() => onNavigate("terms")}>Terms</button></>}
      >
        <SettingsRow
          label="Everything you've put in"
          description={
            counts.queries + counts.agents + counts.manuscripts === 0
              ? "There's nothing to copy yet. Once you've added agents and queries, this is where you take them with you."
              : exported ? `Downloaded just now: ${plural(counts.manuscripts, "manuscript", "manuscripts")}, ${plural(counts.agents, "agent", "agents")}, ${plural(counts.queries, "query", "queries")} and your full activity history.`
              : "Your manuscripts, versions, packages, agents, queries, activity history, notes and tasks."
          }
          control={<button type="button" onClick={(e) => { exportData(); saved(e.currentTarget, "Your copy is downloading"); }} className={`acct-btn ${pendingDeletion ? "acct-btn--ghost" : "acct-btn--primary"}`} style={pendingDeletion ? ghostBtn : primaryBtn}><Download style={{ width: 14, height: 14 }} aria-hidden="true" />Download a copy</button>}
        />
      </SettingsCard>
      <SettingsCard heading="Bring more in" blurb="Add to what you have, or fix what we hold.">
        <SettingsRow label="Import agents and queries" description="Bring in your existing tracking from a spreadsheet or photos." control={<button type="button" onClick={() => onNavigate("import")} className="acct-btn acct-btn--ghost" style={ghostBtn}><Upload style={{ width: 14, height: 14 }} aria-hidden="true" />Open import</button>} />
        <SettingsRow label="Put something right" description="Most things you can edit yourself. For anything you can't, write to us and we'll sort it." control={<button type="button" onClick={() => onNavigate("contact")} className="acct-btn acct-btn--ghost" style={ghostBtn}>Get in touch</button>} />
      </SettingsCard>
      <SettingsCard heading="Delete your account" danger headingId="acct-h-danger" blurb={`${DELETION_GRACE_DAYS} days to change your mind.`}>
        {pendingDeletion ? (
          <>
            <SettingsNote>Your account is set to be deleted on {longDate(pendingDeletion.purgeAfter)}. Nothing has been removed. Cancel any time before then and your account carries on exactly as it is.</SettingsNote>
            <SettingsRow
              label="Changed your mind?"
              description="We complete deletions by hand, so write to us if you need it done sooner."
              control={<button type="button" onClick={() => void cancelDeletion()} className="acct-btn acct-btn--primary" style={primaryBtn}>Cancel deletion</button>}
            />
          </>
        ) : (
          <SettingsRow
            label="Delete account"
            description={`This removes your account and everything in it: manuscripts, agents, queries and history. You'll have ${DELETION_GRACE_DAYS} days to change your mind.`}
            control={<button type="button" data-acct="del-open" onClick={() => setShowDelete(true)} className="acct-btn acct-btn--danger" style={{ ...ghostBtn, color: DANGER_INK, borderColor: DANGER_INK }}><Trash2 style={{ width: 14, height: 14 }} aria-hidden="true" />Delete account…</button>}
          />
        )}
      </SettingsCard>
    </>
  );

  const sectionContent: Record<AccountSectionId, React.ReactNode> = {
    profile: youSection,
    preferences: prefsSection,
    emails: emailsSection,
    plan: planSection,
    data: dataSection,
  };

  return (
    <div className="acct-page font-sans" style={{ color: bodyInk }}>
      <style>{`.acct-input:focus { border-color: ${burgundy}; box-shadow: 0 0 0 3px rgba(124,58,42,0.12); }`}</style>
      <div className="acct-plane" style={{ position: "relative", zIndex: 1 }}>
        <div className="acct-grid">
          <div id="acct-panel" role="tabpanel" aria-labelledby={`acct-tab-${active}`} tabIndex={0} className="acct-work" data-acct-section={active}>
            {pendingDeletion && (
              <div className="sc-banner" role="status" data-acct="deletion-banner">
                <AlertTriangle style={{ width: 16, height: 16, flexShrink: 0 }} aria-hidden="true" />
                <span>Your account is set to be deleted on <b>{longDate(pendingDeletion.purgeAfter)}</b>. Nothing has been removed yet.</span>
                {active !== "data" && <button type="button" onClick={() => void cancelDeletion()} className="acct-btn acct-btn--ghost" style={ghostBtn}>Cancel deletion</button>}
              </div>
            )}
            <header className="sc-ttl sc-ttl--live" data-acct="headline">
              <h1 className="sc-ttl-h" aria-live="polite">{headline}</h1>
              <p className="sc-ttl-d">{sub}</p>
            </header>
            {sectionContent[active]}
          </div>
        </div>
      </div>
      {stampAt && <div key={stampAt.key} className="clp-stamp-at" data-acct="stamp" style={{ left: stampAt.left, top: stampAt.top }}><Stamp word="SAVED" date={stampDate} /></div>}
      {showDelete && (
        <DeleteAccountModal
          onClose={() => setShowDelete(false)} onConfirm={requestDeletion} busy={deleteBusy} summary={summary}
          onCopy={exportData} copied={exported} onFinished={() => void finishedQuerying()}
        />
      )}
    </div>
  );
};
