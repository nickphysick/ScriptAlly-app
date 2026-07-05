/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Account settings — rebuilt onto the Form 11 / dashboard design system:
 * the dashboard ground (pageGround + fixed page grain), a sticky left section rail,
 * and parchment cards carrying the sage-band uniform header (3px burgundy rule + Playfair
 * title + far-right lucide emblem). Section/danger cards use CardShell — the same three-layer
 * clipping structure the app already uses correctly (the onboarding "Database populated" card):
 * an outer parchment panel whose even padding is the rim, an inner 1px frame with overflow:hidden
 * as the clipping context, and a header with no radius/margin so its fill stops at the frame border
 * and is clipped to the rounded corners (never an overlay border, which can't contain a fill → spill).
 *
 * Wiring rule: a control is wired only when its end-to-end behaviour already exists (or is
 * trivially self-contained this pass). Everything else is rendered on-brand but clearly inert
 * and persists NOTHING (a dead stored pref is a desync trap).
 *   WIRED ........ display name (updateUserProfile), password reset (resetPassword),
 *                  plan + trial display, View plans (onNavigate "plans" — focus chrome),
 *                  data export (client-side JSON of the already-loaded data),
 *                  data import (onNavigate "import" → ImportCsv).
 *   COMING-SOON .. pen name, email change, two-factor, active sessions, manage billing,
 *                  notification prefs, time zone / date format, account deletion (the
 *                  typed-confirmation modal is present; the final delete action is disabled —
 *                  irreversible deletion is never wired unsupervised, and no endpoint exists).
 */
import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useScriptAllyDb } from "../lib/db";
import { validateDisplayName } from "../lib/accountValidation";
import { MountCard } from "./MountCard";
import {
  pageGround,
  PAGE_GRAIN,
  parchment,
  PAPER_TEXTURE,
  mountShadow,
  insetBorder,
  sageBandGradient,
  sageBandRule,
  sageAccent,
  burgundy,
  headingInk,
  bodyInk,
  mutedInk,
  labelColor,
  FONT_SERIF,
  FONT_SANS,
  FONT_MONO,
} from "../lib/designTokens";
import {
  User as UserIcon,
  Mail,
  Shield,
  Sparkles,
  Bell,
  SlidersHorizontal,
  Database,
  Trash2,
  Check,
  ChevronRight,
  Download,
  Upload,
  Smartphone,
  KeyRound,
  AlertTriangle,
  X,
} from "lucide-react";

/* ── Danger palette (kept in the warm parchment family, reads as a warning) ── */
const DANGER_INK = "#8c2f2f";
const DANGER_BAND = "linear-gradient(135deg, #f1ddd7 0%, #ecccc4 100%)";
const DANGER_RULE = "rgba(140,47,47,0.22)";
const SUCCESS_GREEN = "#3B6D11";
const ERROR_RED = "#A32D2D";

/* ── The six rail sections (Danger zone lives at the foot of "Your data") ── */
type SectionId = "profile" | "security" | "plan" | "notifications" | "preferences" | "data";
const SECTIONS: { id: SectionId; label: string; Icon: React.ComponentType<any> }[] = [
  { id: "profile", label: "Profile", Icon: UserIcon },
  { id: "security", label: "Sign-in & security", Icon: Shield },
  { id: "plan", label: "Plan & billing", Icon: Sparkles },
  { id: "notifications", label: "Notifications", Icon: Bell },
  { id: "preferences", label: "Preferences", Icon: SlidersHorizontal },
  { id: "data", label: "Your data", Icon: Database },
];

/* ── Shared field/label/button styling (inline so brand.tsx's non-important body-font
 *    rule can't override it, and Tailwind can't silently re-colour it) ──────────────── */
const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: FONT_MONO,
  fontSize: 9,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  fontWeight: 500,
  color: labelColor,
  marginBottom: 6,
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  fontFamily: FONT_SANS,
  fontSize: 14,
  color: bodyInk,
  background: "#fffdfa",
  border: "1px solid rgba(124,58,42,0.18)",
  borderRadius: 8,
  outline: "none",
};
const primaryBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "9px 16px",
  fontFamily: FONT_SERIF,
  fontSize: 14,
  fontWeight: 500,
  color: "#fff",
  background: burgundy,
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
};
const ghostBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "9px 16px",
  fontFamily: FONT_SERIF,
  fontSize: 14,
  fontWeight: 500,
  color: burgundy,
  background: "#fff",
  border: `1px solid ${burgundy}`,
  borderRadius: 8,
  cursor: "pointer",
};
const helpText: React.CSSProperties = { fontFamily: FONT_SANS, fontSize: 12.5, color: mutedInk, lineHeight: 1.45 };

/* ── Small inert affordances ─────────────────────────────────────────────── */
const ComingSoonPill: React.FC = () => (
  <span
    style={{
      fontFamily: FONT_MONO,
      fontSize: 9,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: mutedInk,
      background: "rgba(124,58,42,0.06)",
      border: "0.5px solid rgba(124,58,42,0.16)",
      borderRadius: 999,
      padding: "3px 8px",
      whiteSpace: "nowrap",
    }}
  >
    Coming soon
  </span>
);

/** A purely visual, non-interactive toggle (off, dimmed) — marks a setting as not-yet-live. */
const InertToggle: React.FC<{ on?: boolean }> = ({ on = false }) => (
  <span
    aria-hidden="true"
    style={{
      width: 38,
      height: 22,
      borderRadius: 999,
      background: on ? sageAccent : "#e2d7c9",
      position: "relative",
      display: "inline-block",
      flexShrink: 0,
      opacity: 0.55,
    }}
  >
    <span
      style={{
        position: "absolute",
        top: 2,
        left: on ? 18 : 2,
        width: 18,
        height: 18,
        borderRadius: "50%",
        background: "#fff",
        boxShadow: "0 1px 2px rgba(58,28,20,0.2)",
      }}
    />
  </span>
);

/** One inert preference row: label + description on the left, an inert control + Coming soon on the right. */
const InertRow: React.FC<{ title: string; desc: string; control?: React.ReactNode; first?: boolean }> = ({
  title,
  desc,
  control,
  first,
}) => (
  <div
    aria-disabled="true"
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 14,
      padding: "14px 0",
      borderTop: first ? "none" : "0.5px solid #efe5da",
      opacity: 0.72,
    }}
  >
    <div style={{ minWidth: 0 }}>
      <p style={{ fontFamily: FONT_SANS, fontSize: 13.5, fontWeight: 600, color: bodyInk, marginBottom: 2 }}>{title}</p>
      <p style={helpText}>{desc}</p>
    </div>
    <div className="flex items-center" style={{ gap: 10, flexShrink: 0 }}>
      {control ?? <InertToggle />}
      <ComingSoonPill />
    </div>
  </div>
);

/** A notice banner shown atop a section whose behaviour isn't switched on yet. */
const InertNotice: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      display: "flex",
      gap: 8,
      alignItems: "flex-start",
      background: "rgba(124,58,42,0.045)",
      border: "0.5px solid rgba(124,58,42,0.14)",
      borderRadius: 10,
      padding: "10px 12px",
      marginBottom: 16,
    }}
  >
    <span style={helpText}>{children}</span>
  </div>
);

/**
 * CardShell — the three-layer clipping card the app already uses correctly elsewhere (the
 * onboarding "Database populated" card; mirrors scriptally-header-fill-target.html):
 *   1. panel — the Form 11 parchment surface (+ paper grain), outer radius + shadow, and an even
 *              `padding` on all four sides → that padding IS the uniform rim.
 *   2. frame — a 1px burgundy border with its own (smaller) radius + `overflow:hidden`; this is the
 *              clipping context. Its transparent interior lets the panel's grain show through the body.
 *   3. header/body — laid INSIDE the frame; a header fill stops at the frame border and is clipped to
 *              the frame's rounded corners by overflow:hidden, so it never reaches the card's outer edge.
 * This replaces the old overlay-border frame (a border drawn over the fill can't contain it → spill).
 */
const CardShell: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; className?: string }> = ({ children, style, className }) => (
  <div
    className={className}
    style={{ background: parchment, backgroundImage: PAPER_TEXTURE, borderRadius: 14, boxShadow: mountShadow, padding: 6, border: "1px solid rgba(124,58,42,0.10)", ...style }}
  >
    <div style={{ border: insetBorder, borderRadius: 9, overflow: "hidden" }}>{children}</div>
  </div>
);

/** A section card: the sage-band (or danger-tinted) uniform header + body, inside the clipping frame. */
const SectionCard: React.FC<{
  title: string;
  Icon: React.ComponentType<any>;
  danger?: boolean;
  headingId?: string;
  children: React.ReactNode;
}> = ({ title, Icon, danger, headingId, children }) => (
  <CardShell style={{ marginBottom: 20 }}>
    {/* header — NO radius and NO margin of its own; the frame's overflow:hidden clips it to the
        rounded top corners and the fill stops at the frame border (never the card's outer edge). */}
    <div
      style={{
        padding: "13px 18px 11px",
        background: danger ? DANGER_BAND : sageBandGradient,
        borderBottom: `1px solid ${danger ? DANGER_RULE : sageBandRule}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
      }}
    >
      <span className="flex items-center" style={{ minWidth: 0 }}>
        <span
          aria-hidden="true"
          style={{
            width: 3,
            height: 18,
            borderRadius: 2,
            background: danger ? DANGER_INK : burgundy,
            marginRight: 12,
            flexShrink: 0,
            display: "inline-block",
          }}
        />
        <span
          id={headingId}
          role="heading"
          aria-level={2}
          style={{ fontFamily: FONT_SERIF, fontSize: 18, fontWeight: 500, color: danger ? DANGER_INK : headingInk, lineHeight: 1.1 }}
        >
          {title}
        </span>
      </span>
      <Icon style={{ width: 19, height: 19, color: danger ? DANGER_INK : burgundy, flexShrink: 0 }} strokeWidth={1.8} aria-hidden="true" />
    </div>
    <div style={{ padding: 18 }}>{children}</div>
  </CardShell>
);

/* ── The left section rail — a lighter/secondary MountCard, keyboard-navigable (tablist) ── */
const Rail: React.FC<{ active: SectionId; onSelect: (id: SectionId) => void }> = ({ active, onSelect }) => {
  const idx = SECTIONS.findIndex((s) => s.id === active);
  const focusTab = (i: number) => requestAnimationFrame(() => document.getElementById(`acct-tab-${SECTIONS[i].id}`)?.focus());
  const onKeyDown = (e: React.KeyboardEvent) => {
    let next = idx;
    switch (e.key) {
      case "ArrowDown":
      case "ArrowRight":
        next = (idx + 1) % SECTIONS.length;
        break;
      case "ArrowUp":
      case "ArrowLeft":
        next = (idx - 1 + SECTIONS.length) % SECTIONS.length;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = SECTIONS.length - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    onSelect(SECTIONS[next].id);
    focusTab(next);
  };

  return (
    <MountCard className="md:sticky md:self-start" style={{ top: 84 }}>
      <div style={{ position: "relative", zIndex: 4, margin: 6, padding: 8 }}>
        <p style={{ ...labelStyle, padding: "2px 8px 8px", marginBottom: 0, color: mutedInk }}>Settings</p>
        <div
          role="tablist"
          aria-label="Account settings sections"
          aria-orientation="vertical"
          className="flex md:flex-col"
          style={{ gap: 2, overflowX: "auto" }}
        >
          {SECTIONS.map((s) => {
            const isActive = s.id === active;
            return (
              <button
                key={s.id}
                id={`acct-tab-${s.id}`}
                role="tab"
                aria-selected={isActive}
                aria-controls="acct-panel"
                tabIndex={isActive ? 0 : -1}
                onClick={() => onSelect(s.id)}
                onKeyDown={onKeyDown}
                className="acct-rail-item"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  textAlign: "left",
                  whiteSpace: "nowrap",
                  padding: "9px 12px",
                  borderRadius: 9,
                  border: "none",
                  cursor: "pointer",
                  fontFamily: FONT_SANS,
                  fontSize: 13.5,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? burgundy : "#6a5a50",
                  background: isActive ? "#f8e7dc" : "transparent",
                  transition: "background 0.12s, color 0.12s",
                }}
              >
                <s.Icon style={{ width: 16, height: 16, flexShrink: 0, color: isActive ? burgundy : mutedInk }} strokeWidth={1.9} aria-hidden="true" />
                {s.label}
              </button>
            );
          })}
        </div>
      </div>
    </MountCard>
  );
};

/* ── Delete-account modal: a typed-confirmation pattern. The confirm step is present and
 *    functional, but the final action is DISABLED ("coming soon") — no deletion endpoint
 *    exists and irreversible deletion is never wired unsupervised. ───────────────────── */
const DeleteAccountModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [confirm, setConfirm] = useState("");
  const matched = confirm.trim().toUpperCase() === "DELETE";
  const inputRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div
      role="presentation"
      onMouseDown={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 120,
        background: "rgba(46,28,20,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="del-title"
        onMouseDown={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 460 }}
      >
        <CardShell>
          <div
            style={{
              padding: "13px 18px 11px",
              background: DANGER_BAND,
              borderBottom: `1px solid ${DANGER_RULE}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <span className="flex items-center">
              <AlertTriangle style={{ width: 18, height: 18, color: DANGER_INK, marginRight: 10, flexShrink: 0 }} strokeWidth={2} aria-hidden="true" />
              <span id="del-title" style={{ fontFamily: FONT_SERIF, fontSize: 18, fontWeight: 500, color: DANGER_INK }}>
                Delete account
              </span>
            </span>
            <button ref={closeRef} onClick={onClose} aria-label="Close" style={{ background: "transparent", border: "none", cursor: "pointer", color: DANGER_INK, display: "inline-flex", padding: 2 }}>
              <X style={{ width: 18, height: 18 }} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
          <div style={{ padding: 18 }}>
            <p style={{ ...helpText, color: bodyInk, marginBottom: 14 }}>
              This permanently removes your account and every manuscript, agent and query you've tracked.
              This <strong>cannot be undone</strong>.
            </p>
            <label htmlFor="del-confirm" style={labelStyle}>
              Type DELETE to confirm
            </label>
            <input
              id="del-confirm"
              ref={inputRef}
              type="text"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="off"
              className="acct-input"
              style={inputStyle}
              aria-describedby="del-note"
            />
            <div style={{ minHeight: 18, marginTop: 6 }}>
              {matched && (
                <span className="flex items-center" style={{ gap: 5, fontFamily: FONT_SANS, fontSize: 12, fontWeight: 500, color: SUCCESS_GREEN }}>
                  <Check style={{ width: 13, height: 13 }} aria-hidden="true" /> Confirmation matches
                </span>
              )}
            </div>
            <div className="flex items-center justify-between" style={{ gap: 12, marginTop: 14 }}>
              <button onClick={onClose} style={{ ...ghostBtn, borderColor: "#d8cdc0", color: "#6a5a50" }}>
                Cancel
              </button>
              <button
                type="button"
                disabled
                aria-disabled="true"
                title="Account deletion isn't available yet"
                style={{
                  ...primaryBtn,
                  background: DANGER_INK,
                  opacity: 0.4,
                  cursor: "not-allowed",
                }}
              >
                <Trash2 style={{ width: 14, height: 14 }} aria-hidden="true" /> Delete account
              </button>
            </div>
            <p id="del-note" style={{ ...helpText, marginTop: 12, fontStyle: "italic" }}>
              Account deletion isn't available yet — it's coming soon. Nothing has been deleted.
            </p>
          </div>
        </CardShell>
      </div>
    </div>,
    document.body,
  );
};

export const AccountSettings: React.FC<{ onNavigate: (tab: string, subPageName?: string) => void }> = ({ onNavigate }) => {
  const { currentUser, updateUserProfile, resetPassword, agents, queries, manuscripts } = useScriptAllyDb();

  const [active, setActive] = useState<SectionId>("profile");
  const [name, setName] = useState(currentUser?.name ?? "");
  const [nameStatus, setNameStatus] = useState<{ type: "idle" | "saving" | "saved" | "error"; msg?: string }>({ type: "idle" });
  const [resetMsg, setResetMsg] = useState<string | null>(null);
  const [exportMsg, setExportMsg] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);

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

  /** Self-contained client-side export of the already-loaded data — no backend, no writes. */
  const exportData = useCallback(() => {
    const payload = {
      exportedAt: new Date().toISOString(),
      account: { name: currentUser.name, email: currentUser.email, plan: currentUser.plan },
      manuscripts,
      agents,
      queries,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scriptally-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setExportMsg(
      `Downloaded ${manuscripts.length} manuscript${manuscripts.length === 1 ? "" : "s"}, ${agents.length} agent${
        agents.length === 1 ? "" : "s"
      } and ${queries.length} quer${queries.length === 1 ? "y" : "ies"} as JSON.`,
    );
  }, [currentUser, manuscripts, agents, queries]);

  const initial = (currentUser.name || currentUser.email || "?").trim().charAt(0).toUpperCase();
  const fmtDate = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    return isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  };
  const statusLabel: Record<typeof currentUser.subscriptionStatus, string> = {
    trialing: "Free trial",
    active: "Active subscription",
    canceled: "Cancelled",
    none: "No active subscription",
  };

  const profileSection = (
    <SectionCard title="Profile" Icon={UserIcon} headingId="acct-h-profile">
      <div className="flex items-center" style={{ gap: 14, marginBottom: 20 }}>
        <span
          aria-hidden="true"
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: "#f8e7dc",
            border: "1px solid rgba(124,58,42,0.18)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: FONT_SERIF,
            fontSize: 22,
            color: burgundy,
            flexShrink: 0,
          }}
        >
          {initial}
        </span>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontFamily: FONT_SERIF, fontSize: 17, color: bodyInk, lineHeight: 1.2 }}>{currentUser.name || "—"}</p>
          <p style={helpText}>{currentUser.email}</p>
        </div>
      </div>

      <label htmlFor="account-name" style={labelStyle}>
        Display name
      </label>
      <input
        id="account-name"
        type="text"
        value={name}
        maxLength={256}
        onChange={(e) => setName(e.target.value)}
        className="acct-input"
        style={inputStyle}
      />
      <div className="flex items-center" style={{ gap: 12, marginTop: 12, flexWrap: "wrap" }}>
        <button
          onClick={saveName}
          disabled={!nameChanged || !nameValid || nameStatus.type === "saving"}
          style={{ ...primaryBtn, opacity: !nameChanged || !nameValid || nameStatus.type === "saving" ? 0.4 : 1, cursor: !nameChanged || !nameValid ? "not-allowed" : "pointer" }}
        >
          {nameStatus.type === "saving" ? "Saving…" : "Save name"}
        </button>
        {nameStatus.type === "saved" && (
          <span className="flex items-center" style={{ gap: 5, fontFamily: FONT_SANS, fontSize: 12.5, fontWeight: 500, color: SUCCESS_GREEN }}>
            <Check style={{ width: 14, height: 14 }} aria-hidden="true" /> {nameStatus.msg}
          </span>
        )}
        {nameStatus.type === "error" && (
          <span style={{ fontFamily: FONT_SANS, fontSize: 12.5, fontWeight: 500, color: ERROR_RED }}>{nameStatus.msg}</span>
        )}
      </div>

      {/* Pen name — coming soon. Not a User field and not in the Firestore allowlist, so it
          can't be stored; rendering it live would silently drop the value (a desync trap). */}
      <div style={{ marginTop: 22, paddingTop: 18, borderTop: "0.5px solid #efe5da" }}>
        <div className="flex items-center" style={{ gap: 10, marginBottom: 6 }}>
          <label htmlFor="account-penname" style={{ ...labelStyle, marginBottom: 0 }}>
            Pen name
          </label>
          <ComingSoonPill />
        </div>
        <input id="account-penname" type="text" disabled placeholder="The name your work is published under" className="acct-input" style={{ ...inputStyle, opacity: 0.6, cursor: "not-allowed" }} />
        <p style={{ ...helpText, marginTop: 6 }}>A separate publishing name is coming soon.</p>
      </div>
    </SectionCard>
  );

  const securitySection = (
    <SectionCard title="Sign-in & security" Icon={Shield} headingId="acct-h-security">
      <label htmlFor="account-email" style={labelStyle}>
        Email
      </label>
      <div style={{ position: "relative", marginBottom: 6 }}>
        <Mail style={{ position: "absolute", left: 11, top: 11, width: 16, height: 16, color: "rgba(58,28,20,0.4)" }} aria-hidden="true" />
        <input
          id="account-email"
          type="email"
          value={currentUser.email}
          readOnly
          disabled
          className="acct-input"
          style={{ ...inputStyle, paddingLeft: 34, opacity: 0.7, cursor: "not-allowed" }}
        />
      </div>
      <p style={helpText}>Changing your email is coming soon — it needs you to re-enter your password for security.</p>

      {/* Password — fully working via the existing reset-email flow (no reauth needed). */}
      <div style={{ marginTop: 20, paddingTop: 18, borderTop: "0.5px solid #efe5da" }}>
        <p style={{ fontFamily: FONT_SANS, fontSize: 13.5, fontWeight: 600, color: bodyInk, marginBottom: 3 }}>Password</p>
        <p style={{ ...helpText, marginBottom: 12 }}>We'll email you a secure link to set a new password.</p>
        <button onClick={sendReset} style={ghostBtn}>
          <KeyRound style={{ width: 14, height: 14 }} aria-hidden="true" /> Send password reset email
        </button>
        {resetMsg && <p style={{ fontFamily: FONT_SANS, fontSize: 12.5, fontWeight: 500, color: SUCCESS_GREEN, marginTop: 12 }}>{resetMsg}</p>}
      </div>

      <div style={{ marginTop: 20, paddingTop: 4 }}>
        <InertRow
          first
          title="Two-factor authentication"
          desc="Add a one-time code at sign-in for extra protection."
        />
        <InertRow
          title="Active sessions"
          desc="Review and sign out devices currently signed in."
          control={
            <span className="flex items-center" style={{ gap: 6, ...helpText }}>
              <Smartphone style={{ width: 15, height: 15, color: mutedInk }} aria-hidden="true" /> This device
            </span>
          }
        />
      </div>
    </SectionCard>
  );

  const planSection = (
    <SectionCard title="Plan & billing" Icon={Sparkles} headingId="acct-h-plan">
      <div className="flex items-center justify-between" style={{ gap: 14, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontFamily: FONT_SERIF, fontSize: 18, color: bodyInk, lineHeight: 1.2 }}>{currentUser.plan} plan</p>
          <p style={{ ...helpText, marginTop: 2 }}>
            {statusLabel[currentUser.subscriptionStatus] ?? currentUser.subscriptionStatus}
            {currentUser.subscriptionStatus === "trialing" && currentUser.trialStartDate
              ? ` · started ${fmtDate(currentUser.trialStartDate)}`
              : ""}
          </p>
        </div>
        {/* In-app upgrade CTAs target /plans (focus chrome) — the public /pricing keeps the
            marketing tier (route-tier journeys table, landing build). */}
        <button onClick={() => onNavigate("plans")} style={primaryBtn}>
          View plans &amp; upgrade <ChevronRight style={{ width: 15, height: 15 }} aria-hidden="true" />
        </button>
      </div>

      <div style={{ marginTop: 20, paddingTop: 4 }}>
        <InertRow
          first
          title="Manage billing"
          desc="Update your payment method, view invoices and receipts."
          control={
            <button type="button" disabled aria-disabled="true" style={{ ...ghostBtn, padding: "7px 12px", fontSize: 13, borderColor: "#d8cdc0", color: "#6a5a50", opacity: 0.55, cursor: "not-allowed" }}>
              Manage billing
            </button>
          }
        />
      </div>
    </SectionCard>
  );

  const notificationsSection = (
    <SectionCard title="Notifications" Icon={Bell} headingId="acct-h-notifications">
      <InertNotice>
        Email notifications aren't switched on yet — these preferences are coming soon, so nothing is saved here for now.
      </InertNotice>
      <InertRow first title="Follow-up reminders" desc="Email me when a query is due a nudge." />
      <InertRow title="Weekly digest" desc="A Monday summary of what's coming up." />
      <InertRow title="Product updates" desc="Occasional news about new ScriptAlly features." />
      <InertRow
        title="Reminder timing"
        desc="When to send a follow-up reminder."
        control={
          <select disabled aria-disabled="true" className="acct-input" style={{ ...inputStyle, width: "auto", padding: "7px 10px", fontSize: 13, opacity: 0.6, cursor: "not-allowed" }}>
            <option>On the due date</option>
          </select>
        }
      />
    </SectionCard>
  );

  const preferencesSection = (
    <SectionCard title="Preferences" Icon={SlidersHorizontal} headingId="acct-h-preferences">
      {/* Theme — functional today (applies to the Queries page). Persisted on the user profile. */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, padding: "14px 0", borderBottom: "0.5px solid #efe5da", marginBottom: 4 }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontFamily: FONT_SANS, fontSize: 13.5, fontWeight: 600, color: bodyInk, marginBottom: 2 }}>Theme</p>
          <p style={helpText}>The look of your Queries page. (Coming to the rest of the app later.)</p>
        </div>
        <div role="radiogroup" aria-label="Queries page theme" style={{ display: "inline-flex", gap: 3, flexShrink: 0, background: "#f3ece2", border: "1px solid #e2d6c6", borderRadius: 10, padding: 3 }}>
          {([["cappuccino", "Cappuccino"], ["bold", "Bold Pastille"], ["editorial", "Editorial"]] as const).map(([val, label]) => {
            const on = (currentUser?.queriesTheme ?? "cappuccino") === val;
            return (
              <button
                key={val}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => updateUserProfile({ queriesTheme: val })}
                style={{ fontFamily: FONT_SANS, fontSize: 12.5, fontWeight: on ? 700 : 500, color: on ? bodyInk : "#8a7d6c", background: on ? "#fffefb" : "transparent", border: on ? "1px solid #d8cebf" : "1px solid transparent", boxShadow: on ? "0 1px 2px rgba(29,23,18,.10)" : "none", borderRadius: 8, padding: "6px 13px", cursor: "pointer", whiteSpace: "nowrap" }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
      <InertNotice>
        ScriptAlly doesn't apply these app-wide yet — they're coming soon. Dates currently follow your device's UK locale.
      </InertNotice>
      <InertRow
        first
        title="Time zone"
        desc="Used for deadlines and reminder timing."
        control={
          <select disabled aria-disabled="true" className="acct-input" style={{ ...inputStyle, width: "auto", padding: "7px 10px", fontSize: 13, opacity: 0.6, cursor: "not-allowed" }}>
            <option>Europe/London</option>
          </select>
        }
      />
      <InertRow
        title="Date format"
        desc="How dates appear across the app."
        control={
          <select disabled aria-disabled="true" className="acct-input" style={{ ...inputStyle, width: "auto", padding: "7px 10px", fontSize: 13, opacity: 0.6, cursor: "not-allowed" }}>
            <option>DD/MM/YYYY</option>
          </select>
        }
      />
    </SectionCard>
  );

  const dataSection = (
    <>
      <SectionCard title="Your data" Icon={Database} headingId="acct-h-data">
        <div className="flex items-start justify-between" style={{ gap: 14, flexWrap: "wrap", paddingBottom: 16, borderBottom: "0.5px solid #efe5da", marginBottom: 16 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ fontFamily: FONT_SANS, fontSize: 13.5, fontWeight: 600, color: bodyInk, marginBottom: 2 }}>Export your data</p>
            <p style={helpText}>Download your manuscripts, agents and queries as a JSON file.</p>
          </div>
          <button onClick={exportData} style={ghostBtn}>
            <Download style={{ width: 14, height: 14 }} aria-hidden="true" /> Export JSON
          </button>
        </div>
        {exportMsg && <p style={{ fontFamily: FONT_SANS, fontSize: 12.5, fontWeight: 500, color: SUCCESS_GREEN, marginTop: -4, marginBottom: 16 }}>{exportMsg}</p>}

        <div className="flex items-start justify-between" style={{ gap: 14, flexWrap: "wrap" }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ fontFamily: FONT_SANS, fontSize: 13.5, fontWeight: 600, color: bodyInk, marginBottom: 2 }}>Import agents &amp; queries</p>
            <p style={helpText}>Bring in your existing tracking from a spreadsheet.</p>
          </div>
          <button onClick={() => onNavigate("import")} style={ghostBtn}>
            <Upload style={{ width: 14, height: 14 }} aria-hidden="true" /> Open import
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Danger zone" Icon={Trash2} danger headingId="acct-h-danger">
        <div className="flex items-start justify-between" style={{ gap: 14, flexWrap: "wrap" }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ fontFamily: FONT_SANS, fontSize: 13.5, fontWeight: 600, color: bodyInk, marginBottom: 2 }}>Delete account</p>
            <p style={helpText}>Permanently remove your account and all of your data. This cannot be undone.</p>
          </div>
          <button
            onClick={() => setShowDelete(true)}
            style={{ ...ghostBtn, color: DANGER_INK, borderColor: DANGER_INK }}
          >
            <Trash2 style={{ width: 14, height: 14 }} aria-hidden="true" /> Delete account…
          </button>
        </div>
      </SectionCard>
    </>
  );

  const sectionContent: Record<SectionId, React.ReactNode> = {
    profile: profileSection,
    security: securitySection,
    plan: planSection,
    notifications: notificationsSection,
    preferences: preferencesSection,
    data: dataSection,
  };

  return (
    <div className="min-h-screen pb-16 font-sans" style={{ background: pageGround, color: bodyInk }}>
      {/* Fixed page grain — over the kraft ground, under the positioned cards (matches the dashboard). */}
      <div aria-hidden="true" style={{ position: "fixed", inset: 0, opacity: 0.25, pointerEvents: "none", zIndex: 0, backgroundImage: PAGE_GRAIN }} />

      {/* On-brand focus ring + rail hover (scoped; inline can't express :focus/:hover). */}
      <style>{`
        .acct-input:focus { border-color: ${burgundy}; box-shadow: 0 0 0 3px rgba(124,58,42,0.12); }
        .acct-rail-item:hover:not([aria-selected="true"]) { background: rgba(124,58,42,0.05); }
        .acct-rail-item:focus-visible { outline: 2px solid ${burgundy}; outline-offset: 2px; }
      `}</style>

      <div className="relative" style={{ zIndex: 1, maxWidth: 1040, margin: "0 auto", padding: "40px 16px 0" }}>
        <h1 style={{ fontFamily: FONT_SERIF, fontSize: 30, fontWeight: 500, color: headingInk, lineHeight: 1.15, marginBottom: 4 }}>
          Account settings
        </h1>
        <p style={{ fontFamily: FONT_SANS, fontSize: 14, color: mutedInk, marginBottom: 28 }}>
          Manage your profile, plan and preferences.
        </p>

        <div className="flex flex-col md:flex-row" style={{ gap: 24, alignItems: "flex-start" }}>
          <div className="w-full md:w-56 md:flex-shrink-0">
            <Rail active={active} onSelect={setActive} />
          </div>
          <div id="acct-panel" role="tabpanel" aria-labelledby={`acct-tab-${active}`} tabIndex={0} className="flex-1 min-w-0" style={{ outline: "none" }}>
            {sectionContent[active]}
          </div>
        </div>
      </div>

      {showDelete && <DeleteAccountModal onClose={() => setShowDelete(false)} />}
    </div>
  );
};
