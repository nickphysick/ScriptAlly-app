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
 *   WIRED ........ display name (updateUserProfile), home country (updateUserProfile — drives
 *                  the agent territory split; changeable but never cleared back to unset, per
 *                  the origin-state law), password reset (resetPassword),
 *                  plan + trial display, View plans (onNavigate "plans" — a workspace route;
 *                  the focus tier is retired),
 *                  data export (client-side JSON of the already-loaded data),
 *                  data import (onNavigate "import" → ImportCsv).
 *   COMING-SOON .. pen name, email change, two-factor, active sessions, manage billing,
 *                  notification prefs, time zone / date format, account deletion (the
 *                  typed-confirmation modal is present; the final delete action is disabled —
 *                  irreversible deletion is never wired unsupervised, and no endpoint exists).
 */
import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { useScriptAllyDb } from "../lib/db";
import { UserPlan } from "../types";
import {
  notifyPrefs, NotifyPrefs, marketingGranted, marketingConsentRecord, ALWAYS_SENT_LINE,
  resolveTimeZone, tzOptions, TZ_HELPER,
} from "../lib/accountPrefs";
import { buildExport, downloadExport, exportFilename } from "../lib/dataExport";
import {
  DELETION_GRACE_DAYS, DELETION_CONFIRM_WORD, DELETION_REMOVES, RETENTION_LINE,
  deletionArmed, deletionRequest, scheduledDeletion, deletionNotice,
} from "../lib/accountDeletion";
import { TODO_OPEN_TASK_SETTINGS } from "../lib/todoRoutes";
import { ACCOUNT_ROUTES, AccountSectionId } from "../lib/accountRoutes";
import { useDirtyField } from "../lib/useSaveState";
import { auth } from "../lib/firebase";
import { sendEmailVerification } from "firebase/auth";
import { passwordMode, federatedNames, federatedLine } from "../lib/accountSecurity";
import { readAuthFacts } from "../lib/accountAuthFacts";
import { dirtyFieldKeys } from "../lib/saveSignal";
import { useToast } from "./toast/ToastProvider";
import { validateDisplayName } from "../lib/accountValidation";
import { MountPanel } from "./MountPanel";
import { SECTION_BANDS } from "./settings/sectionBands";
import "./settings/settings.css";
import { CountryCombobox } from "./forms";
import { PlanComparison } from "./plans/PlanComparison";
import { AccountHeader } from "./settings/AccountHeader";
import { RailAside } from "./settings/RailAside";
import { SettingsIllo, hasSectionWatermark } from "./settings/SettingsIllo";
import { accountFacts, sentCount } from "../lib/accountHeaderFacts";
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
  Mail,
  Trash2,
  LogOut,
  Check,
  Download,
  Upload,
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

/* ── The rail sections ──────────────────────────────────────────────────────
 * ⚠️ ORDER, WORDS AND MARK ALL COME FROM ELSEWHERE — `accountRoutes` for the first two,
 * `sectionBands` for the third. The page briefly kept its own icon map beside them; that was a
 * third list of the same six sections, and the rail's glyph could have drifted from the glyph on
 * the card the rail opens. The rail is the thing that WALKS between sections, not a place that
 * decides what they are. */
type SectionId = AccountSectionId;
const SECTIONS: { id: SectionId; label: string; path: string; Icon: React.ComponentType<any> }[] =
  ACCOUNT_ROUTES.map((r) => ({ id: r.id, label: r.label, path: r.path, Icon: SECTION_BANDS[r.id].Icon }));

/**
 * The dirty-field keys this page registers with `saveSignal`, and the words the leave-warning
 * uses for them.
 *
 * ⚠️ ONE MAP, NOT TWO LISTS. The key is what the bar counts and the label is what the toast says;
 * written separately they would drift, and the failure is a warning that names a field the reader
 * cannot find. Free-text fields only — an instant-commit control is never dirty, by construction.
 */
export const DIRTY_DISPLAY_NAME = "settings:display-name";
const DIRTY_LABELS: Record<string, string> = {
  [DIRTY_DISPLAY_NAME]: "Display name",
};

/** The human names of whatever is currently unsaved — used by the leave-warning only. */
function dirtyFieldLabels(): string[] {
  return dirtyFieldKeys().map((k) => DIRTY_LABELS[k]).filter(Boolean);
}

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

/* ⚠️ `ComingSoonPill`, `InertToggle` AND `InertRow` ARE GONE — a three-symbol cascade found by a
   reachability sweep rather than by reading. `InertRow` was the only caller of the other two, and
   once Notifications and Preferences got live controls nothing called `InertRow`. Counting
   references outside each declaration took the cluster from "one obviously dead" to "three
   actually dead". They drew the coming-soon rows this build has been removing one at a time.
   `InertNotice` below SURVIVES: a section whose behaviour is not switched on yet still has to say
   so, and that is a statement rather than a dead control. */

/**
 * The email's Verified / Unverified chip.
 *
 * ⚠️ UNVERIFIED IS NOT AN ERROR, AND IS NOT DRAWN AS ONE. Most accounts reach this page unverified
 * and perfectly functional; a red chip would turn a piece of status into an accusation. It is the
 * muted treatment with a plain word, and the action beside it is what makes it actionable.
 */
const VerifiedChip: React.FC<{ verified: boolean }> = ({ verified }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      flexShrink: 0,
      fontFamily: FONT_MONO,
      fontSize: 9,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      borderRadius: 999,
      padding: "4px 9px",
      color: verified ? "#3B6D11" : mutedInk,
      background: verified ? "rgba(59,109,17,0.07)" : "rgba(124,58,42,0.06)",
      border: `0.5px solid ${verified ? "rgba(59,109,17,0.22)" : "rgba(124,58,42,0.16)"}`,
    }}
  >
    {verified && <Check style={{ width: 11, height: 11 }} aria-hidden="true" />}
    {verified ? "Verified" : "Unverified"}
  </span>
);

/** A group heading inside a section — mono, muted, the same grammar as the rail's SETTINGS label. */
const GroupLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p style={{ ...labelStyle, marginTop: 18, marginBottom: 2, color: mutedInk }}>{children}</p>
);

/**
 * A LIVE toggle row — the instant-commit half of the save model.
 *
 * ⚠️ IT IS A `role="switch"` BUTTON, NOT A CHECKBOX PAINTED TO LOOK LIKE ONE. The state has to
 * reach a screen reader as on/off, and `aria-checked` on a switch is the one that does.
 *
 * ⚠️ AND IT COMMITS ON CHANGE, WITH NO SAVE BUTTON ANYWHERE NEAR IT. Flicking a switch is the
 * whole decision; asking for a confirmation afterwards would be asking twice.
 */
const ToggleRow: React.FC<{
  title: string;
  desc: string;
  on: boolean;
  onChange: (next: boolean) => void;
  first?: boolean;
}> = ({ title, desc, on, onChange, first }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 14,
      padding: "14px 0",
      borderTop: first ? "none" : "0.5px solid #efe5da",
    }}
  >
    <div style={{ minWidth: 0 }}>
      <p style={{ fontFamily: FONT_SANS, fontSize: 13.5, fontWeight: 600, color: bodyInk, marginBottom: 2 }}>{title}</p>
      <p style={helpText}>{desc}</p>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={title}
      onClick={() => onChange(!on)}
      style={{
        width: 38,
        height: 22,
        borderRadius: 999,
        background: on ? sageAccent : "#e2d7c9",
        border: "none",
        padding: 0,
        position: "relative",
        flexShrink: 0,
        cursor: "pointer",
        transition: "background 0.15s",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 2,
          left: on ? 18 : 2,
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 1px 2px rgba(58,28,20,0.2)",
          transition: "left 0.15s",
        }}
      />
    </button>
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

/* ⚠️ `CardShell` IS GONE — IT WAS `MountPanel` RETYPED. Both declared the same three layers with
   the same values (parchment panel + 6px rim, a 1px `insetBorder` frame with `overflow:hidden` as
   the clipping context, children inside it), and the shared one carries the docblock explaining
   why the frame is a real clipping container rather than an overlay border. One card, one place. */

/**
 * A section card: a slim sage head + the body, inside MountPanel's clipping frame.
 *
 * ⚠️ THE HEAD NO LONGER CARRIES AN IDENTITY. It was disc · pre-label · name · sub-line, with the
 * writer's monogram, name and email substituted in on Profile — which meant the page repeated who
 * you are on every section and had nothing that stayed still while you moved between them.
 * Identity is the account header's job now, once, above the grid. What is left here is what a
 * section head is for: which section this is, and one line saying what it covers.
 *
 * ⚠️ THE BAND STILL CARRIES NO RADIUS AND NO MARGIN. The frame's `overflow: hidden` rounds it and
 * stops the fill at the frame border — the ref draws this as a `::before` overlay and then
 * hand-matches a radius on the band to fake the same result, which an overlay border cannot do.
 */
const SectionCard: React.FC<{
  section: SectionId;
  headingId?: string;
  children: React.ReactNode;
}> = ({ section, headingId, children }) => {
  const band = SECTION_BANDS[section];
  return (
    <MountPanel className="acct-card">
      <div
        className="acct-band"
        style={{ background: sageBandGradient, borderBottom: `1px solid ${sageBandRule}` }}
      >
        <span
          id={headingId}
          role="heading"
          aria-level={2}
          className="acct-band-name"
          style={{ color: headingInk }}
        >
          {band.name}
        </span>
        <span className="acct-band-sub">{band.sub}</span>
      </div>
      <div className="acct-cardbody">
        {children}
        {/* ⚠️ LAST IN THE BODY AND UNDER IT. The watermark is what stops a 520px card looking empty
            behind a short section; it is decoration, so it is aria-hidden, takes no pointer events,
            and sits beneath everything the body renders. */}
        {hasSectionWatermark(section) && <SettingsIllo slot="section" section={section} />}
      </div>
    </MountPanel>
  );
};

/**
 * A card WITHIN a section — Signing out and the Danger zone, which sit under Your data.
 *
 * ⚠️ IT KEEPS THE PLAIN TITLED HEADER, DELIBERATELY. The band's disc/pre-label/name/sub-line
 * anatomy says "this is a section of settings"; wearing it twice on one screen would make two of
 * the three cards under Your data look like sections the rail forgot to list.
 */
const SubCard: React.FC<{
  title: string;
  Icon: React.ComponentType<any>;
  danger?: boolean;
  headingId?: string;
  children: React.ReactNode;
}> = ({ title, Icon, danger, headingId, children }) => (
  <MountPanel style={{ marginBottom: 20 }}>
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
          style={{ width: 3, height: 18, borderRadius: 2, background: danger ? DANGER_INK : burgundy, marginRight: 12, flexShrink: 0, display: "inline-block" }}
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
  </MountPanel>
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
    <MountPanel>
      <div style={{ padding: 8 }}>
        <p style={{ ...labelStyle, padding: "2px 8px 8px", marginBottom: 0, color: mutedInk }}>Settings</p>
        <div
          role="tablist"
          aria-label="Account settings sections"
          aria-orientation="vertical"
          className="acct-navlist"
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
                className="acct-navitem"
              >
                <s.Icon style={{ width: 16, height: 16, flexShrink: 0, color: isActive ? burgundy : mutedInk }} strokeWidth={1.9} aria-hidden="true" />
                {s.label}
              </button>
            );
          })}
        </div>
      </div>
    </MountPanel>
  );
};

/**
 * The delete-account modal — a typed confirmation that schedules, rather than deletes.
 *
 * ⚠️ THE CONFIRMATION IS THE WORD `DELETE`, AND THAT SUPERSEDES THE ACCOUNT-EMAIL FORM. The old
 * note here argued that "your own address is a sentence you have to mean" where DELETE "is a word
 * anyone can type without reading". Good reasoning with one hole: YOUR EMAIL IS ON THIS VERY PAGE
 * — in the Profile band and in the security section's field — and browsers autofill it, so it is
 * copyable from two inches away and sometimes typed FOR you. `DELETE` appears nowhere as a value
 * to copy. See `accountDeletion.DELETION_CONFIRM_WORD`.
 *
 * ⚠️ AND THE BUTTON IS NO LONGER PERMANENTLY DISABLED, because what it now does is SAFE:
 * confirming writes a dated, cancellable request and removes nothing. The irreversible half — the
 * purge — still does not exist, and `ACCOUNT_DELETION_ENABLED` still reads false to say so.
 */
const DeleteAccountModal: React.FC<{
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  busy: boolean;
}> = ({ onClose, onConfirm, busy }) => {
  const [confirm, setConfirm] = useState("");
  const matched = deletionArmed(confirm);
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
        <MountPanel>
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
            {/* ⚠️ WHAT GOES IS NAMED, NOT SUMMARISED. "All your data" is not something anyone can
                weigh; a list is. */}
            <p style={{ ...helpText, color: bodyInk, marginBottom: 8 }}>
              This removes, permanently:
            </p>
            <ul style={{ margin: "0 0 14px", padding: "0 0 0 18px", listStyle: "disc" }}>
              {DELETION_REMOVES.map((line) => (
                <li key={line} style={{ ...helpText, color: bodyInk, marginBottom: 3 }}>{line}</li>
              ))}
            </ul>
            <p style={{ ...helpText, marginBottom: 14 }}>
              You'll have <strong>{DELETION_GRACE_DAYS} days</strong> to change your mind. Nothing
              is removed before then.
            </p>
            <label htmlFor="del-confirm" style={labelStyle}>
              Type {DELETION_CONFIRM_WORD} to confirm
            </label>
            <input
              id="del-confirm"
              ref={inputRef}
              type="text"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="off"
              placeholder={DELETION_CONFIRM_WORD}
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
              {/* ⚠️ DISABLED UNTIL THE WORD MATCHES EXACTLY — the gate, not a decoration. */}
              <button
                type="button"
                id="del-confirm-btn"
                disabled={!matched || busy}
                aria-disabled={!matched || busy}
                onClick={() => { void onConfirm(); }}
                style={{
                  ...primaryBtn,
                  background: DANGER_INK,
                  opacity: !matched || busy ? 0.4 : 1,
                  cursor: matched && !busy ? "pointer" : "not-allowed",
                }}
              >
                <Trash2 style={{ width: 14, height: 14 }} aria-hidden="true" />
                {busy ? "Scheduling…" : "Schedule deletion"}
              </button>
            </div>
            {/* ⚠️ IT SAYS WHAT CONFIRMING DOES, AND CONFIRMING DOES EXACTLY THAT. This records a
                dated, cancellable request; it removes nothing today, and no job removes anything
                afterwards either (there is no scheduler in this project). Saying "your account
                will be deleted on the 3rd" would be the one piece of copy in this build the code
                cannot back — on the most consequential control on the page. */}
            <p id="del-note" style={{ ...helpText, marginTop: 12 }}>
              Confirming records the request and starts the {DELETION_GRACE_DAYS}-day window.
              Nothing is removed at this point.
            </p>
          </div>
        </MountPanel>
      </div>
    </div>,
    document.body,
  );
};

export const AccountSettings: React.FC<{
  /** The section the URL resolves to — App.tsx redirects anything that resolves to nothing, so
   *  this is always a real section by the time the page renders. */
  section: AccountSectionId;
  onNavigate: (tab: string, subPageName?: string) => void;
}> = ({ section, onNavigate }) => {
  const {
    currentUser, updateUserProfile, resetPassword,
    agents, queries, manuscripts, versions, packages, activities, notes, userTasks,
    logout,
  } = useScriptAllyDb();

  /* ⚠️ THE SECTION IS THE URL, NOT STATE. It used to be `useState("profile")`, which made every
     section unlinkable and reset the page on refresh — see accountRoutes.ts. `navigate` writes it;
     the prop reads it back through App.tsx, so there is exactly one copy of "where am I". */
  const navigate = useNavigate();
  const active = section;
  /**
   * ⚠️ LEAVING WITH A DIRTY FIELD WARNS AND CONTINUES — it does not block, and it does not discard.
   * A modal asking permission to change SECTION would be the heaviest interruption on the page
   * guarding its lightest edit; and silently dropping typed text is the one outcome nobody can
   * recover from. The value stays in the input, the bar keeps saying "Unsaved changes", and the
   * toast says which field it was — so the writer can walk back to it.
   */
  const goSection = (id: SectionId) => {
    const hit = SECTIONS.find((s) => s.id === id);
    if (!hit || hit.id === active) return;
    for (const label of dirtyFieldLabels()) {
      showToast({ message: `${label} not saved yet`, duration: 4000, replaces: "settings-dirty" });
    }
    navigate(hit.path);
  };
  const [name, setName] = useState(currentUser?.name ?? "");
  const [nameStatus, setNameStatus] = useState<{ type: "idle" | "saving" | "error"; msg?: string }>({ type: "idle" });
  const [countryStatus, setCountryStatus] = useState<{ type: "idle" | "saving" | "error"; msg?: string }>({ type: "idle" });
  const { showToast } = useToast();
  const [resetMsg, setResetMsg] = useState<string | null>(null);
  const [verifyMsg, setVerifyMsg] = useState<string | null>(null);
  /* ⚠️ READ ONCE PER MOUNT, NOT SUBSCRIBED. `auth.currentUser` is not reactive and `emailVerified`
     in particular only moves on a reload — so a snapshot at mount is exactly as fresh as anything
     a subscription could offer, and it does not pretend otherwise. */
  const authFacts = useMemo(() => readAuthFacts(), []);
  const [exportMsg, setExportMsg] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  if (!currentUser) return null;

  /**
   * ⚠️ THE SAVE MODEL IS HYBRID, AND THE SPLIT IS ABOUT WHAT AN EDIT *IS*.
   *
   * A toggle or a select COMMITS INSTANTLY and says so with a receipt: the gesture is the whole
   * decision, and a Save button beside it would ask the writer to confirm something they have
   * already, unambiguously, chosen. FREE TEXT commits EXPLICITLY: half-typed text is not a
   * decision, and a field that saved as you type would write "Nic" on the way to "Nicholas".
   *
   * ⚠️ AND THE BAR MUST NEVER SAY "ALL CHANGES SAVED" OVER A DIRTY FIELD. That is the whisper's
   * own stated law — it exists so the status can never show a false "saved" — so the dirty
   * registration lives in `saveSignal` beside the in-flight counter rather than as a second,
   * quieter status of this page's own. `useDirtyField` clears the key on unmount, so leaving
   * mid-edit cannot strand the bar.
   */
  const pwMode = passwordMode(authFacts?.providerIds ?? ["password"]);
  const pendingDeletion = scheduledDeletion(currentUser.scheduledDeletion);
  /* ⚠️ EVERY FACT IS ALREADY IN MEMORY — no new read, no new field. The plan is on the user doc,
     the joined date rides the auth metadata settings already reads for providers, and the counts
     are the collections the db context loads for every page. */
  const headerFacts = accountFacts({
    plan: `${currentUser.plan} plan`,
    creationTime: authFacts?.createdAt,
    manuscriptCount: manuscripts.length,
    sentCount: sentCount(queries),
  });
  const notify = notifyPrefs(currentUser.notifyPrefs);
  const marketingOn = marketingGranted(currentUser.marketingConsent);
  const timezone = resolveTimeZone(currentUser.workspacePrefs?.timezone);
  const nameChanged = name.trim() !== (currentUser.name ?? "").trim();
  const nameValid = validateDisplayName(name).ok;
  useDirtyField(DIRTY_DISPLAY_NAME, nameChanged);

  /** The one receipt for an instant commit. Channelled, so a run of quick changes replaces rather
   *  than stacks — three toasts each offering nothing to undo is noise, not reassurance. */
  const savedReceipt = (what: string) => showToast({ message: `${what} saved`, duration: 2200, replaces: "settings-saved" });

  const saveName = async () => {
    const v = validateDisplayName(name);
    if (!v.ok) {
      setNameStatus({ type: "error", msg: v.error });
      return;
    }
    setNameStatus({ type: "saving" });
    try {
      await updateUserProfile({ name: v.value });
      setNameStatus({ type: "idle" });
      /* Re-baseline: the field is now what the account says, so the Save/Discard row retreats and
         the bar goes clean — both derive from `nameChanged`, which is why there is nothing else
         to reset here. */
      setName(v.value);
      savedReceipt("Display name");
    } catch {
      setNameStatus({ type: "error", msg: "Couldn't save. Please try again." });
    }
  };

  /** Discard restores the saved value. No confirm: the field is visibly back to what it was, and
   *  the edit was never anywhere but this input. */
  const discardName = () => {
    setName(currentUser.name ?? "");
    setNameStatus({ type: "idle" });
  };

  /** Save-on-select (the Preferences theme-radio convention). An empty pick — the combobox's
   *  "Clear selection" row — is deliberately a no-op: unstated is an ORIGIN state, not a
   *  destination (the agent-editor law), and the territory model never stores "" (unset means
   *  the key is omitted, seeded once at signup). The helper text below states the rule. */
  const saveHomeCountry = async (code: string) => {
    if (!code || code === currentUser?.homeCountry) return;
    setCountryStatus({ type: "saving" });
    try {
      await updateUserProfile({ homeCountry: code });
      setCountryStatus({ type: "idle" });
      savedReceipt("Home country");
    } catch {
      setCountryStatus({ type: "error", msg: "Couldn't save. Please try again." });
    }
  };

  /* ⚠️ IT TELLS YOU TO RELOAD RATHER THAN FLIPPING THE CHIP. `emailVerified` is a snapshot; the
     app cannot know you have clicked the link until the token refreshes, and a chip that turned
     green on send would be asserting an outcome nobody has observed. */
  const resendVerification = async () => {
    if (!auth.currentUser) return;
    setVerifyMsg("sending");
    try {
      await sendEmailVerification(auth.currentUser);
      setVerifyMsg("Verification email sent. Click the link, then reload this page.");
    } catch {
      setVerifyMsg("Couldn't send it just now. Please try again.");
    }
  };

  /* ── The instant-commit writes ────────────────────────────────────────────
     ⚠️ EACH MERGES INTO ITS MAP RATHER THAN REPLACING IT. `updateUserProfile` sends the fields it
     is given, so writing `{ notifyPrefs: { nudges: false } }` would DROP `weeklyDigest` — a map
     is one allowlist entry, which also makes it one thing to overwrite by accident. */
  const saveNotify = async (patch: Partial<NotifyPrefs>, what: string) => {
    const next = { ...notify, ...patch };
    try {
      await updateUserProfile({ notifyPrefs: next });
      savedReceipt(what);
    } catch {
      showToast({ message: `Couldn't save ${what.toLowerCase()}. Try again?`, replaces: "settings-saved" });
    }
  };

  /* ⚠️ THE RECORD IS REWRITTEN IN BOTH DIRECTIONS, never deleted on withdrawal — the evidence that
     consent existed, and the moment it stopped, is the half a regulator asks about. */
  const saveMarketing = async (granted: boolean) => {
    try {
      await updateUserProfile({ marketingConsent: marketingConsentRecord(granted) });
      savedReceipt(granted ? "Product news on" : "Product news off");
    } catch {
      showToast({ message: "Couldn't save that. Try again?", replaces: "settings-saved" });
    }
  };

  const saveTimezone = async (tz: string) => {
    if (tz === timezone) return;
    try {
      await updateUserProfile({ workspacePrefs: { ...(currentUser.workspacePrefs ?? {}), timezone: tz } });
      savedReceipt("Time zone");
    } catch {
      showToast({ message: "Couldn't save your time zone. Try again?", replaces: "settings-saved" });
    }
  };

  /* ⚠️ CONFIRMING WRITES A RECORD; IT DELETES NOTHING. The window is the safety mechanism and the
     record IS the feature that exists — the purge it schedules does not (see accountDeletion). */
  const requestDeletion = async () => {
    setDeleteBusy(true);
    try {
      await updateUserProfile({ scheduledDeletion: deletionRequest() });
      setShowDelete(false);
      showToast({ message: `Deletion scheduled — you have ${DELETION_GRACE_DAYS} days to cancel.`, replaces: "settings-saved" });
    } catch {
      showToast({ message: "Couldn't schedule that. Try again?", replaces: "settings-saved" });
    } finally {
      setDeleteBusy(false);
    }
  };

  /* ⚠️ CANCELLING CLEARS THE MAP RATHER THAN DELETING THE KEY. `updateUserProfile` merges, and the
     allowlist governs which KEYS an update may touch — writing an empty record keeps the write
     inside the same one entry and cannot be mistaken for "no request was ever made" by a reader
     that only checks for the key's presence. `scheduledDeletion()` reads an incomplete record as
     no request, which is exactly what this writes. */
  const cancelDeletion = async () => {
    try {
      await updateUserProfile({ scheduledDeletion: { requestedAt: "", purgeAfter: "" } });
      showToast({ message: "Deletion cancelled. Nothing was removed.", replaces: "settings-saved" });
    } catch {
      showToast({ message: "Couldn't cancel that. Try again?", replaces: "settings-saved" });
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

  /**
   * Self-contained client-side export of the already-loaded data — no backend, no writes.
   *
   * ⚠️ IT USED TO EXPORT THREE COLLECTIONS AND THE POLICY PROMISED SIX. Manuscripts, agents and
   * queries went out; submission packages, notes, activity history, manuscript versions and tasks
   * did not — while section 2 of the privacy policy names the querying records "including
   * submission packages, notes and activity history", and section 8 offers export as a right. The
   * shape now lives in `lib/dataExport.ts` with the collection list asserted against it, so a
   * record type added to the app cannot quietly fall out of the file a writer is told is
   * everything.
   */
  const exportData = useCallback(() => {
    const now = new Date();
    const bundle = buildExport(
      {
        // The account record as the writer's own document, not a hand-picked three fields: an
        // export is a copy of what is held, and choosing which parts to include is the thing that
        // made the old one incomplete.
        user: currentUser,
        manuscripts, versions, packages, agents, queries, activities, notes, userTasks,
      },
      now,
    );
    downloadExport(bundle, exportFilename(now));
    setExportMsg(
      `Downloaded ${manuscripts.length} manuscript${manuscripts.length === 1 ? "" : "s"}, ${agents.length} agent${
        agents.length === 1 ? "" : "s"
      }, ${queries.length} quer${queries.length === 1 ? "y" : "ies"} and your full activity history as JSON.`,
    );
  }, [currentUser, manuscripts, versions, packages, agents, queries, activities, notes, userTasks]);

  const initial = (currentUser.name || currentUser.email || "?").trim().charAt(0).toUpperCase();
  /* ⚠️ `fmtDate` AND `statusLabel` ARE GONE WITH THE OLD PLAN BLOCK. They formatted a trial start
     date and a subscription-status word for a card that now renders `PlanComparison` — and a
     reachability sweep found each referenced exactly once, at its own declaration. A helper whose
     only caller has been deleted is dormant code that reads as a feature. */

  const profileSection = (
    <SectionCard section="profile" headingId="acct-h-profile">
      <div className="acct-two">
        <div>

      {/* ⚠️ NO AUTHOR-PHOTO CONTROL, AND NO DISABLED PLACEHOLDER FOR ONE. Firebase Storage is not
          configured in this project — no `storage.rules`, no storage block in either hosting
          config, no `firebase/storage` import anywhere in src. A "Change photo" button that
          cannot store a photo is the Pen name field wearing a different label, and this build
          removed that one for exactly this reason. The dashboard byline's initials fallback
          stands alone until Storage exists.
          STANDING FLAG: `OneScreenAuthor.tsx:62`'s "Add a photo +" navigates here and will find
          nothing — left untouched, as a one-line follow-up rather than a change smuggled into
          this phase. */}

      {/* ⚠️ NO IDENTITY BLOCK EITHER. A 52px monogram over the name and email used to open this
          body, and the band directly above now carries the same monogram, the same name and the
          same email — the writer's own address printed twice, four centimetres apart. */}

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
        aria-describedby={nameStatus.type === "error" ? "account-name-error" : undefined}
      />

      {/* ⚠️ THE ROW IS ABSENT UNTIL THE FIELD DIVERGES, not present-and-disabled. A permanently
          greyed Save button is a control that spends its whole life saying no; its arrival is the
          page telling you there is something to do. It leaves again the moment the value matches
          what is stored — including when you type your way back to it by hand. */}
      {nameChanged && (
        <div className="flex items-center" style={{ gap: 10, marginTop: 12, flexWrap: "wrap" }}>
          <button
            onClick={saveName}
            disabled={!nameValid || nameStatus.type === "saving"}
            style={{ ...primaryBtn, opacity: !nameValid || nameStatus.type === "saving" ? 0.4 : 1, cursor: nameValid ? "pointer" : "not-allowed" }}
          >
            {nameStatus.type === "saving" ? "Saving…" : "Save"}
          </button>
          <button onClick={discardName} disabled={nameStatus.type === "saving"} style={ghostBtn}>
            Discard
          </button>
        </div>
      )}
      {nameStatus.type === "error" && (
        <p id="account-name-error" style={{ fontFamily: FONT_SANS, fontSize: 12.5, fontWeight: 500, color: ERROR_RED, marginTop: 8 }}>
          {nameStatus.msg}
        </p>
      )}

        </div>
        <div>
      {/* Home country — seeded silently at signup from the browser locale (key omitted when
          unresolvable) and previously never writable again: a wrong guess was a permanent trap
          for the agent territory split (Tier 2 · Phase 4). Absent shows as "Not set" and is
          settable; once set it can be changed but not cleared (the origin-state law).

          ⚠️ IT COMMITS ON SELECT, WITH A RECEIPT AND NO SAVE BUTTON — choosing from a list IS the
          decision. `CountryCombobox` is the app's own control; a native `<select>` would drop the
          flags and take the OS's menu styling into the middle of a Form 11 card. */}
      <div style={{ marginTop: 22, paddingTop: 18, borderTop: "0.5px solid #efe5da" }}>
        <label htmlFor="account-homecountry" style={labelStyle}>
          Home country
        </label>
        <div style={{ maxWidth: 360 }}>
          <CountryCombobox
            id="account-homecountry"
            value={currentUser.homeCountry ?? ""}
            onChange={saveHomeCountry}
            placeholder="Not set"
          />
        </div>
        <div className="flex items-center" style={{ gap: 12, marginTop: 8, flexWrap: "wrap" }}>
          <p style={{ ...helpText, margin: 0 }}>
            Sets your home market — the agent list uses it to tell domestic agents from
            international ones. It can be changed any time, but not cleared once set.
          </p>
        </div>
        {countryStatus.type === "error" && (
          <p style={{ fontFamily: FONT_SANS, fontSize: 12.5, fontWeight: 500, color: ERROR_RED, marginTop: 8 }}>{countryStatus.msg}</p>
        )}
      </div>
        </div>
      </div>
    </SectionCard>
  );

  const securitySection = (
    <SectionCard section="security" headingId="acct-h-security">
      <div className="acct-two">
        <div>

      <label htmlFor="account-email" style={labelStyle}>
        Email
      </label>
      <div className="flex items-center" style={{ gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
          <Mail style={{ position: "absolute", left: 11, top: 11, width: 16, height: 16, color: "rgba(58,28,20,0.4)" }} aria-hidden="true" />
          <input
            id="account-email"
            type="email"
            value={currentUser.email}
            readOnly
            className="acct-input"
            style={{ ...inputStyle, paddingLeft: 34, background: "#faf6f0", color: "#6a5a50" }}
          />
        </div>
        <VerifiedChip verified={authFacts?.emailVerified ?? true} />
      </div>

      {/* ⚠️ `emailVerified` DOES NOT RE-RENDER. It is a snapshot on the auth user, refreshed only
          by a reload or an explicit `reload()`; polling it would spin, and flipping the chip
          locally after sending would be the UI asserting an outcome it has not observed. So the
          confirmation says to reload — the one honest instruction. */}
      {authFacts && !authFacts.emailVerified && (
        <div className="flex items-center" style={{ gap: 12, marginTop: 4, marginBottom: 4, flexWrap: "wrap" }}>
          <button onClick={resendVerification} disabled={verifyMsg === "sending"} style={ghostBtn}>
            {verifyMsg === "sending" ? "Sending…" : "Resend verification"}
          </button>
          {verifyMsg && verifyMsg !== "sending" && (
            <span style={{ fontFamily: FONT_SANS, fontSize: 12.5, fontWeight: 500, color: verifyMsg.startsWith("Couldn") ? ERROR_RED : SUCCESS_GREEN }}>
              {verifyMsg}
            </span>
          )}
        </div>
      )}

      {/* ⚠️ "Change email" GOES TO SUPPORT, BECAUSE THERE IS NO FLOW BEHIND IT. Firebase's
          `verifyBeforeUpdateEmail` needs a recent sign-in and a re-auth path this app has never
          built, and a button that opens nothing is the disabled-field fault wearing a verb. This
          reuses Your data's own "Correct something we hold" route, which exists for exactly the
          case where the writer cannot change something themselves. */}
      <div className="flex items-start justify-between" style={{ gap: 14, flexWrap: "wrap", marginTop: 12 }}>
        <p style={{ ...helpText, margin: 0, flex: 1, minWidth: 200 }}>
          Your email is how you sign in, so changing it is something we do with you rather than
          something you can switch here.
        </p>
        <button onClick={() => onNavigate("contact")} style={ghostBtn}>Change email</button>
      </div>

        </div>
        <div>
      {/* ── Password — provider-aware ──────────────────────────────────────── */}
      <div style={{ marginTop: 20, paddingTop: 18, borderTop: "0.5px solid #efe5da" }}>
        {pwMode === "federated-only" ? (
          <>
            <p style={{ fontFamily: FONT_SANS, fontSize: 13.5, fontWeight: 600, color: bodyInk, marginBottom: 3 }}>How you sign in</p>
            <p style={{ ...helpText, margin: 0 }}>{federatedLine(authFacts?.providerIds ?? [], currentUser.email)}</p>
            <p style={{ ...helpText, marginTop: 6 }}>There's no ScriptAlly password on this account, so there's nothing here to change.</p>
          </>
        ) : (
          <>
            <p style={{ fontFamily: FONT_SANS, fontSize: 13.5, fontWeight: 600, color: bodyInk, marginBottom: 3 }}>Password</p>
            {/* ⚠️ NO "LAST CHANGED {date}" LINE. Firebase exposes creationTime and lastSignInTime
                and nothing else; printing either under that label is a real date wearing the wrong
                name. See PASSWORD_LAST_CHANGED_AVAILABLE. */}
            <div className="flex items-center" style={{ gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
              <input
                type="password"
                value="············"
                readOnly
                aria-label="Password (hidden)"
                className="acct-input"
                style={{ ...inputStyle, width: "auto", minWidth: 180, background: "#faf6f0", color: "#6a5a50", letterSpacing: "0.12em" }}
              />
            </div>
            {pwMode === "both" && (
              <p style={{ ...helpText, marginBottom: 10 }}>
                You can also sign in with {federatedNames(authFacts?.providerIds ?? []).join(" and ")}.
              </p>
            )}
            <p style={{ ...helpText, marginBottom: 12 }}>We'll email you a secure link to set a new one.</p>
            <button onClick={sendReset} style={ghostBtn}>
              <KeyRound style={{ width: 14, height: 14 }} aria-hidden="true" /> Change password
            </button>
            {resetMsg && <p style={{ fontFamily: FONT_SANS, fontSize: 12.5, fontWeight: 500, color: SUCCESS_GREEN, marginTop: 12 }}>{resetMsg}</p>}
          </>
        )}
      </div>

      {/* ⚠️ NO SESSIONS BLOCK. "Sign out of all other sessions" was built here, wired to a named
          stub, and reported honestly that it could not act — and an honest dead control is still a
          dead control. Settings states what your account IS and offers what it can DO; a button
          whose only outcome is an apology fails that on both counts. Same rule that removed the
          Pen name field and the author-photo control.
          `signOutOtherSessions` and `SESSION_REVOKE_UNAVAILABLE` survive in `lib/accountSecurity`
          with their tests: the seam is where the Cloud Function lands, and deleting it would mean
          rediscovering that the client SDK cannot revoke a session at all.
          ⚠️ PASSKEYS, 2FA AND A DEVICE LIST ARE OUT OF SCOPE — absent, not advertised. */}
        </div>
      </div>
    </SectionCard>
  );

  const planSection = (
    <SectionCard section="plan" headingId="acct-h-plan">
      <PlanComparison
        currentPlan={currentUser.plan === UserPlan.PRO ? "pro" : "free"}
        onSeePlans={() => onNavigate("plans")}
      />

      {/* ── Billing ────────────────────────────────────────────────────────────
          ⚠️ NO USAGE BLOCK ANYWHERE ON THIS CARD — no meters, no counts, no "where you stand".
          The card answers "what do I get" and stops; position against a limit is not what anyone
          opens this page for, and it is the half that ages into nagging.
          ⚠️ AND CSV EXPORT IS NOT MENTIONED HERE. It is a data right, it lives in Your data, and
          naming it beside a plan comparison invites the reading that it is a plan feature. */}
      <div style={{ marginTop: 22, paddingTop: 18, borderTop: "0.5px solid #efe5da" }}>
        <p style={{ fontFamily: FONT_SANS, fontSize: 13.5, fontWeight: 600, color: bodyInk, marginBottom: 3 }}>Billing</p>
        {/* The empty state IS the state: there is no payment path in the app at all, so every
            account reads this. It says what will appear and when, rather than pretending a
            payment method is merely missing. */}
        <p style={helpText}>
          No payment details on file. Your payment method and invoices will appear here once a paid
          plan starts.
        </p>
      </div>
    </SectionCard>
  );

  const notificationsSection = (
    <SectionCard section="notifications" headingId="acct-h-notifications">
      <div className="acct-two">
        <div>

      {/* ⚠️ THE NOTICE IS WHAT MAKES THESE TOGGLES HONEST. There is no email-sending
          infrastructure in this app and no scheduler to run one — `functions/` holds eight
          callables and zero scheduled jobs, and even "contact us" writes a Firestore document
          rather than posting mail. So these record what you want FOR WHEN THERE IS. Without the
          notice they would claim to govern a live behaviour, which is the fault that removed Pen
          name and the sessions button; with it, they are a stored decision that will be honoured
          the day a job exists. */}
      <InertNotice>
        ScriptAlly doesn't send these emails yet. What you choose here is stored and will be
        honoured from the day it does.
      </InertNotice>

      <GroupLabel>About your querying</GroupLabel>
      <ToggleRow
        first
        title="Nudge reminders"
        desc="When a query is due a nudge."
        on={notify.nudges}
        onChange={(v) => saveNotify({ nudges: v }, "Nudge reminders")}
      />
      <ToggleRow
        title="Weekly digest"
        desc="A Monday summary of what's coming up."
        on={notify.weeklyDigest}
        onChange={(v) => saveNotify({ weeklyDigest: v }, "Weekly digest")}
      />

        </div>
        <div>
      {/* ⚠️ MARKETING IS ITS OWN GROUP, AND ITS OWN STORED FIELD. Under UK PECR consent must be
          affirmative, evidenced and withdrawable in one action — so it defaults OFF, is never
          pre-ticked, writes a timestamped record in BOTH directions, and takes effect on the
          click rather than on a Save. Withdrawal rewrites the record rather than deleting it: the
          evidence that consent existed, and when it stopped, is the half a regulator asks about. */}
      <GroupLabel>Marketing</GroupLabel>
      <ToggleRow
        first
        title="Product news"
        desc="Occasional news about new ScriptAlly features."
        on={marketingOn}
        onChange={saveMarketing}
      />

      <p style={{ ...helpText, marginTop: 16, paddingTop: 14, borderTop: "0.5px solid #efe5da" }}>
        {ALWAYS_SENT_LINE}
      </p>
        </div>
      </div>
    </SectionCard>
  );

  /* ⚠️ ONE SHEET, TWO DOORS — never a second copy of the settings UI (tasks-viewport P5).
     This section does NOT re-render the four behaviours; it navigates to the board and opens the
     ONE TaskSettingsSheet, which is where they are defined, written and persisted. Building a
     second form here would mean two places to change a default and two chances to disagree about
     it — and the sheet writes `User.todoPrefs` through one path precisely so that cannot happen.
     The navigate-then-dispatch pattern is the account menu's own, already proven: the sheet is
     hosted by the To-do page, so the route has to land before the event can find a listener. */
  /* ⚠️ ONE SHEET, TWO DOORS — never a second copy of the settings UI (tasks-viewport P5).
     This row does NOT re-render the task behaviours; it navigates to the board and opens the ONE
     TaskSettingsSheet, which is where they are defined, written and persisted. Building a second
     form here would mean two places to change a default and two chances to disagree about it.
     The navigate-then-dispatch order is the account menu's own proven pattern: the sheet is
     hosted by the To-do page, so the route has to land before the event can find a listener.

     ⚠️ IT LIVES IN PREFERENCES NOW, NOT IN A RAIL SECTION OF ITS OWN. The rail is six items, and
     "how my tasks behave" is a workspace preference rather than a seventh area of the account.
     The row moved WITH the rail item rather than after it: deleting a working door and rebuilding
     it several commits later would leave the sheet reachable from one page of four in between,
     which is the exact gap this second door was added to close. */
  const taskSettingsRow = (
    <div className="flex items-start justify-between" style={{ gap: 14, flexWrap: "wrap", padding: "14px 0" }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ fontFamily: FONT_SANS, fontSize: 13.5, fontWeight: 600, color: bodyInk, marginBottom: 2 }}>Task settings</p>
        <p style={{ fontFamily: FONT_SANS, fontSize: 12.5, color: mutedInk, lineHeight: 1.5 }}>
          How long before something counts as stale, whether unfinished work rolls forward, and
          your weekly review. Opens on your to-do board.
        </p>
      </div>
      <button
        type="button"
        style={ghostBtn}
        onClick={() => {
          /* the route first — the sheet lives on the board, so the event needs a listener */
          onNavigate("todo");
          window.dispatchEvent(new CustomEvent(TODO_OPEN_TASK_SETTINGS));
        }}
      >
        Open task settings
      </button>
    </div>
  );

  const preferencesSection = (
    <SectionCard section="preferences" headingId="acct-h-preferences">
      <div className="acct-two">
        <div>

      <GroupLabel>Workspace</GroupLabel>

      {/* Theme — the one setting on this card that changes something the moment you click it.
          The three that ship are the segmented switcher's own list (design-refs/themes.md); the
          value written is `queriesTheme`, which the AppShell root reads as .t-capp / .t-bold /
          .t-edn. Instant commit, receipt, no Save button. */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, padding: "14px 0" }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontFamily: FONT_SANS, fontSize: 13.5, fontWeight: 600, color: bodyInk, marginBottom: 2 }}>Theme</p>
          <p style={helpText}>The look of your workspace.</p>
        </div>
        <div role="radiogroup" aria-label="Workspace theme" style={{ display: "inline-flex", gap: 3, flexShrink: 0, background: "#f3ece2", border: "1px solid #e2d6c6", borderRadius: 10, padding: 3 }}>
          {([["cappuccino", "Cappuccino"], ["bold", "Bold Pastille"], ["editorial", "Editorial"]] as const).map(([val, label]) => {
            const on = (currentUser?.queriesTheme ?? "cappuccino") === val;
            return (
              <button
                key={val}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => { void updateUserProfile({ queriesTheme: val }); savedReceipt("Theme"); }}
                style={{ fontFamily: FONT_SANS, fontSize: 12.5, fontWeight: on ? 700 : 500, color: on ? bodyInk : "#8a7d6c", background: on ? "#fffefb" : "transparent", border: on ? "1px solid #d8cebf" : "1px solid transparent", boxShadow: on ? "0 1px 2px rgba(29,23,18,.10)" : "none", borderRadius: 8, padding: "6px 13px", cursor: "pointer", whiteSpace: "nowrap" }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ⚠️ TIME ZONE IS STORED AND NOTHING READS IT YET, AND THE HELPER SAYS SO. Dates already
          render in the device's zone — the same zone, for almost every writer — and wiring this to
          DISPLAY would mean threading it through 93 `toLocaleDateString` call sites, several in
          files this build must not touch. It is stored for the scheduled work that does not exist
          yet: a reminder at 9am local needs a server to know which 9am.
          ⚠️ AND THE VALUE IS RESOLVED, NEVER BACKFILLED. An account with nothing stored reads as
          its BROWSER's zone, not Europe/London — pinning a writer in Chicago to London would give
          them wrong day boundaries with nothing on screen to explain it. */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, padding: "14px 0", borderTop: "0.5px solid #efe5da" }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontFamily: FONT_SANS, fontSize: 13.5, fontWeight: 600, color: bodyInk, marginBottom: 2 }}>Time zone</p>
          <p style={helpText}>{TZ_HELPER}</p>
        </div>
        <select
          id="account-timezone"
          aria-label="Time zone"
          value={timezone}
          onChange={(e) => saveTimezone(e.target.value)}
          className="acct-input"
          style={{ ...inputStyle, width: "auto", maxWidth: 200, padding: "7px 10px", fontSize: 13, flexShrink: 0 }}
        >
          {tzOptions(timezone).map((z) => <option key={z} value={z}>{z}</option>)}
        </select>
      </div>

      {/* ⚠️ NO DATE-FORMAT AND NO WEEK-START CONTROL. Both are pure DISPLAY claims, and every date
          in this app renders through one of 93 `toLocaleDateString("en-GB", …)` calls — several of
          them in files this build must not touch. A stored "MM/DD/YYYY" beside a page full of
          "20 August 2026" is not a deferred preference, it is a visible untruth, and it is the
          same fault that removed Pen name, the author-photo control and the sessions button. They
          arrive with a shared formatter, not before one. */}

        </div>
        <div>
      <GroupLabel>Tasks</GroupLabel>
      {taskSettingsRow}
        </div>
      </div>
    </SectionCard>
  );

  /* ⚠️ YOUR DATA SPLITS AT THE CARD LEVEL, NOT INSIDE ONE CARD — the only section that does. Its
     two independent groups are "what you can take away" and "how you leave", and the second lives
     in its own cards because a deletion control does not belong in the same frame as an export
     button. Putting the destructive column beside the routine one uses the width the way the other
     sections do, and keeps the two apart in the way this page has kept them since the sign-out row
     was placed above the danger zone rather than below it. */
  const dataSection = (
    <div className="acct-two acct-two--cards">
      <SectionCard section="data" headingId="acct-h-data">
        {/* ⚠️ THE EXPORT IS THE PORTABILITY RIGHT, SAID WITHOUT LEGALESE. UK GDPR gives you a copy
            of your own records in a form a machine can read; the copy says that in plain words
            rather than citing an article at someone who just wants their work.
            ⚠️ AND IT IS THE JSON BUNDLE, NOT A CSV. The brief said "CSV export"; the CSV that
            exists covers the query LIST only, and a partial file is not the complete copy the
            right is about. `buildExport` is the whole account. */}
        <div className="flex items-start justify-between" style={{ gap: 14, flexWrap: "wrap", paddingBottom: 16, borderBottom: "0.5px solid #efe5da", marginBottom: 16 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ fontFamily: FONT_SANS, fontSize: 13.5, fontWeight: 600, color: bodyInk, marginBottom: 2 }}>Export your data</p>
            <p style={helpText}>
              A complete copy of everything on your account — manuscripts, agents, queries and their
              full history — in a file another program can read. It's yours to take anywhere.
            </p>
          </div>
          <button onClick={exportData} style={ghostBtn}>
            <Download style={{ width: 14, height: 14 }} aria-hidden="true" /> Export
          </button>
        </div>
        {exportMsg && <p style={{ fontFamily: FONT_SANS, fontSize: 12.5, fontWeight: 500, color: SUCCESS_GREEN, marginTop: -4, marginBottom: 16 }}>{exportMsg}</p>}

        {/* ⚠️ THE THIRD DATA RIGHT, AND IT HAD NO ROUTE. The privacy policy offers access, export,
            CORRECTION and deletion; export and deletion had surfaces here and correction had none,
            so the one right a writer is most likely to need was the one with nowhere to click. */}
        <div className="flex items-start justify-between" style={{ gap: 14, flexWrap: "wrap", paddingBottom: 16, borderBottom: "0.5px solid #efe5da", marginBottom: 16 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ fontFamily: FONT_SANS, fontSize: 13.5, fontWeight: 600, color: bodyInk, marginBottom: 2 }}>Correct something we hold</p>
            <p style={helpText}>Most things you can edit yourself. For anything you can't, write to us and we'll put it right.</p>
          </div>
          <button onClick={() => onNavigate("contact")} style={ghostBtn}>Get in touch</button>
        </div>

        <div className="flex items-start justify-between" style={{ gap: 14, flexWrap: "wrap", paddingBottom: 16, borderBottom: "0.5px solid #efe5da", marginBottom: 16 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ fontFamily: FONT_SANS, fontSize: 13.5, fontWeight: 600, color: bodyInk, marginBottom: 2 }}>Import agents &amp; queries</p>
            <p style={helpText}>Bring in your existing tracking from a spreadsheet.</p>
          </div>
          <button onClick={() => onNavigate("import")} style={ghostBtn}>
            <Upload style={{ width: 14, height: 14 }} aria-hidden="true" /> Open import
          </button>
        </div>

        {/* Retention — the period comes from the same constant the privacy policy reads, brackets
            and all: it is a figure nobody has confirmed, and settings quoting a confident "30 days"
            beside a policy that hedges would be the app disagreeing with its own notice. */}
        <div>
          <p style={{ fontFamily: FONT_SANS, fontSize: 13.5, fontWeight: 600, color: bodyInk, marginBottom: 2 }}>How long we keep it</p>
          <p style={helpText}>{RETENTION_LINE}</p>
        </div>
      </SectionCard>

      <div>
      {/* ⚠️ SIGN OUT SITS ABOVE THE DANGER ZONE, NOT BELOW IT. Someone scrolling to close their
          account should not pass the way out on the journey to deletion — and someone looking for
          the way out should not have to scroll past a delete button to find it. Two exits, and the
          reversible one comes first.

          ⚠️ ONE IMPLEMENTATION, TWO DOORS. This is the same `logout` the account menu calls, so
          where sign-out leaves you cannot differ by the door you used. */}
      <SubCard title="Signing out" Icon={LogOut} headingId="acct-h-signout">
        <div className="flex items-start justify-between" style={{ gap: 14, flexWrap: "wrap" }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ fontFamily: FONT_SANS, fontSize: 13.5, fontWeight: 600, color: bodyInk, marginBottom: 2 }}>Sign out</p>
            <p style={helpText}>Ends this session and takes you back to the ScriptAlly home page. Your work stays where it is.</p>
          </div>
          {/* No confirm: leaving is not destructive, and signing back in costs a password. */}
          <button onClick={() => { void logout(); }} style={ghostBtn}>
            <LogOut style={{ width: 14, height: 14 }} aria-hidden="true" /> Sign out
          </button>
        </div>
      </SubCard>

      <SubCard title="Danger zone" Icon={Trash2} danger headingId="acct-h-danger">
        {pendingDeletion ? (
          /* ⚠️ THE SCHEDULED STATE REPLACES THE REQUEST CONTROL — it does not sit beside it. Two
             delete buttons, one of them already pressed, is how someone confirms twice and cannot
             tell what state they are in. */
          <div id="acct-deletion-scheduled">
            <p style={{ fontFamily: FONT_SANS, fontSize: 13.5, fontWeight: 600, color: DANGER_INK, marginBottom: 4 }}>
              {deletionNotice(pendingDeletion)}
            </p>
            <p style={{ ...helpText, marginBottom: 4 }}>
              Nothing has been removed. Cancel any time before then and your account carries on
              exactly as it is.
            </p>
            {/* ⚠️ STATED, BECAUSE IT IS TRUE AND THE ALTERNATIVE IS A PROMISE NOBODY KEEPS. There
                is no job that purges an account, so the page must not imply one runs on the date.
                It offers the route that does work. */}
            <p style={{ ...helpText, marginBottom: 14 }}>
              Deletion isn't automatic yet — we complete it by hand.{" "}
              <button
                type="button"
                onClick={() => onNavigate("contact")}
                style={{ background: "none", border: "none", padding: 0, font: "inherit", color: DANGER_INK, textDecoration: "underline", textUnderlineOffset: 2, cursor: "pointer" }}
              >
                Write to us
              </button>{" "}
              if you need it done by a particular date.
            </p>
            <button onClick={cancelDeletion} style={ghostBtn}>Cancel deletion</button>
          </div>
        ) : (
          <div className="flex items-start justify-between" style={{ gap: 14, flexWrap: "wrap" }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontFamily: FONT_SANS, fontSize: 13.5, fontWeight: 600, color: bodyInk, marginBottom: 2 }}>Delete account</p>
              <p style={helpText}>
                Removes your account and everything on it, after a {DELETION_GRACE_DAYS}-day window
                in which you can change your mind.
              </p>
            </div>
            <button
              onClick={() => setShowDelete(true)}
              style={{ ...ghostBtn, color: DANGER_INK, borderColor: DANGER_INK }}
            >
              <Trash2 style={{ width: 14, height: 14 }} aria-hidden="true" /> Delete account…
            </button>
          </div>
        )}
      </SubCard>
      </div>
    </div>
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
    <div className="acct-page font-sans" style={{ background: pageGround, color: bodyInk }}>
      {/* Fixed page grain — over the kraft ground, under the positioned cards (matches the dashboard). */}
      <div aria-hidden="true" style={{ position: "fixed", inset: 0, opacity: 0.25, pointerEvents: "none", zIndex: 0, backgroundImage: PAGE_GRAIN }} />

      {/* On-brand field focus ring (scoped; inline can't express :focus). The rail's own states
          live in settings.css beside the chassis they belong to. */}
      <style>{`
        .acct-input:focus { border-color: ${burgundy}; box-shadow: 0 0 0 3px rgba(124,58,42,0.12); }
      `}</style>

      {/* ⚠️ THE HEADER IS RENDERED HERE, OUTSIDE THE SECTION SUBTREE, so nothing about it can
          change when the route does. It is the page's fixed point and its top edge — the two
          things the old centred title could not be, because it moved nothing and anchored nothing.
          There is no page title any more: this says whose account it is, which the title never
          did. */}
      <div className="acct-plane" style={{ position: "relative", zIndex: 1 }}>
        <AccountHeader name={currentUser.name} email={currentUser.email} facts={headerFacts} />
        <div className="acct-grid">
          <div className="acct-rail">
            <Rail active={active} onSelect={goSection} />
            <RailAside plan={currentUser.plan === UserPlan.PRO ? "pro" : "free"} />
          </div>
          <div
            id="acct-panel"
            role="tabpanel"
            aria-labelledby={`acct-tab-${active}`}
            tabIndex={0}
            className="acct-work"
          >
            {sectionContent[active]}
          </div>
        </div>
      </div>

      {showDelete && <DeleteAccountModal onClose={() => setShowDelete(false)} onConfirm={requestDeletion} busy={deleteBusy} />}
    </div>
  );
};
