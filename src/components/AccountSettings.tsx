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
import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { useScriptAllyDb } from "../lib/db";
import { buildExport, downloadExport, exportFilename, ACCOUNT_DELETION_ENABLED, deletionConfirmed } from "../lib/dataExport";
import { TODO_OPEN_TASK_SETTINGS } from "../lib/todoRoutes";
import { ACCOUNT_ROUTES, AccountSectionId } from "../lib/accountRoutes";
import { useDirtyField } from "../lib/useSaveState";
import { dirtyFieldKeys } from "../lib/saveSignal";
import { useToast } from "./toast/ToastProvider";
import { validateDisplayName } from "../lib/accountValidation";
import { MountPanel } from "./MountPanel";
import { SECTION_BANDS } from "./settings/sectionBands";
import { initialsOf } from "../lib/searchSuggestionsCore";
import "./settings/settings.css";
import { CountryCombobox } from "./forms";
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

/* ⚠️ `CardShell` IS GONE — IT WAS `MountPanel` RETYPED. Both declared the same three layers with
   the same values (parchment panel + 6px rim, a 1px `insetBorder` frame with `overflow:hidden` as
   the clipping context, children inside it), and the shared one carries the docblock explaining
   why the frame is a real clipping container rather than an overlay border. One card, one place. */

/**
 * A section card: the sage band header + body, inside MountPanel's clipping frame.
 *
 * ⚠️ THE BAND CARRIES NO RADIUS AND NO MARGIN. The frame's `overflow: hidden` rounds it and stops
 * the fill at the frame border. The design ref instead draws the frame as a `::before` overlay
 * and then hand-matches `border-radius: 8px 8px 0 0` + `margin: 6px 6px 0` on the band to fake
 * the same result — an overlay border cannot contain a fill, so the fill reaches the card's outer
 * edge at the corners. Do not port that.
 *
 * The band's anatomy is the ref's: disc · mono pre-label · Playfair name · sub-line, with the
 * section's own mark repeated faint and large at the right.
 */
const SectionCard: React.FC<{
  section: SectionId;
  /** Overrides the band's Playfair line — Profile puts the writer's name here. */
  name?: string;
  /** Overrides the band's sub-line — Profile puts the account email here. */
  sub?: string;
  /** Replaces the disc's icon with initials (Profile only). */
  disc?: string;
  danger?: boolean;
  headingId?: string;
  children: React.ReactNode;
}> = ({ section, name, sub, disc, danger, headingId, children }) => {
  const band = SECTION_BANDS[section];
  const Icon = band.Icon;
  const ink = danger ? DANGER_INK : burgundy;
  return (
    <MountPanel style={{ marginBottom: 20 }}>
      <div
        className="acct-band"
        style={{
          background: danger ? DANGER_BAND : sageBandGradient,
          borderBottom: `1px solid ${danger ? DANGER_RULE : sageBandRule}`,
        }}
      >
        <Icon
          className="acct-band-motif"
          width={62}
          height={62}
          strokeWidth={0.9}
          style={{ color: bodyInk, opacity: 0.3 }}
          aria-hidden="true"
        />
        <span className="acct-band-id">
          <span className="acct-band-disc" aria-hidden="true" style={danger ? { color: DANGER_INK } : undefined}>
            {disc ?? <Icon width={16} height={16} strokeWidth={1.8} style={{ color: ink }} />}
          </span>
          <span style={{ minWidth: 0 }}>
            <span className="acct-band-pre">{band.pre}</span>
            <span
              id={headingId}
              role="heading"
              aria-level={2}
              className="acct-band-name"
              style={{ display: "block", color: danger ? DANGER_INK : headingInk }}
            >
              {name ?? band.name}
            </span>
            {(sub ?? band.sub) && <span className="acct-band-sub" style={{ display: "block" }}>{sub ?? band.sub}</span>}
          </span>
        </span>
      </div>
      <div style={{ padding: 18 }}>{children}</div>
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

/* ── Delete-account modal: a typed-confirmation pattern. The confirm step is present and
 *    functional, but the final action is DISABLED ("coming soon") — no deletion endpoint
 *    exists and irreversible deletion is never wired unsupervised. ───────────────────── */
/**
 * ⚠️ THE CONFIRMATION IS THE ACCOUNT EMAIL, NOT THE WORD "DELETE" — and not a checkbox.
 * "DELETE" is a word anyone can type without reading; your own address is a sentence you have to
 * mean, and it is the one string that is different for every account. `deletionConfirmed` also
 * refuses an empty account email, so a half-loaded user document cannot arm the button.
 *
 * ⚠️ AND THE BUTTON STAYS DISABLED WHATEVER IS TYPED. `ACCOUNT_DELETION_ENABLED` is the outer gate:
 * nothing in this repo deletes a user's records, and the flag exists so the mechanism gets reviewed
 * before it is switched on. The confirm proves intent; the flag proves the code has been read.
 */
const DeleteAccountModal: React.FC<{ onClose: () => void; accountEmail?: string; onContact: () => void }> = ({ onClose, accountEmail, onContact }) => {
  const [confirm, setConfirm] = useState("");
  const matched = deletionConfirmed(confirm, accountEmail);
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
            <p style={{ ...helpText, color: bodyInk, marginBottom: 14 }}>
              This permanently removes your account and every manuscript, agent and query you've tracked.
              This <strong>cannot be undone</strong>.
            </p>
            <label htmlFor="del-confirm" style={labelStyle}>
              Type your account email to confirm
            </label>
            <input
              id="del-confirm"
              ref={inputRef}
              type="text"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="off"
              placeholder={accountEmail ?? "you@example.com"}
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
            {/* ⚠️ SAID PLAINLY, AND WITH A ROUTE THAT WORKS. A writer who wants out needs one; a
                disabled button and "coming soon" leaves them with nowhere to go. */}
            <p id="del-note" style={{ ...helpText, marginTop: 12 }}>
              Self-service deletion isn't switched on yet.{" "}
              <button
                type="button"
                onClick={onContact}
                style={{ background: "none", border: "none", padding: 0, font: "inherit", color: DANGER_INK, textDecoration: "underline", textUnderlineOffset: 2, cursor: "pointer" }}
              >
                Write to us
              </button>{" "}
              and we'll close your account by hand. Nothing has been deleted.
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
  const [exportMsg, setExportMsg] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);

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
    <SectionCard section="profile" name={currentUser.name || "Your account"} sub={currentUser.email} disc={initialsOf(currentUser.name || currentUser.email)} headingId="acct-h-profile">
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
    </SectionCard>
  );

  const securitySection = (
    <SectionCard section="security" headingId="acct-h-security">
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
    <SectionCard section="plan" headingId="acct-h-plan">
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
        {/* In-app upgrade CTAs target /plans (a workspace route in the capsule shell — the
            focus tier is retired); the public /pricing keeps the marketing tier. */}
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
    <SectionCard section="notifications" headingId="acct-h-notifications">
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
      {taskSettingsRow}
    </SectionCard>
  );

  const dataSection = (
    <>
      <SectionCard section="data" headingId="acct-h-data">
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
      </SubCard>
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
    <div className="acct-page font-sans" style={{ background: pageGround, color: bodyInk }}>
      {/* Fixed page grain — over the kraft ground, under the positioned cards (matches the dashboard). */}
      <div aria-hidden="true" style={{ position: "fixed", inset: 0, opacity: 0.25, pointerEvents: "none", zIndex: 0, backgroundImage: PAGE_GRAIN }} />

      {/* On-brand field focus ring (scoped; inline can't express :focus). The rail's own states
          live in settings.css beside the chassis they belong to. */}
      <style>{`
        .acct-input:focus { border-color: ${burgundy}; box-shadow: 0 0 0 3px rgba(124,58,42,0.12); }
      `}</style>

      {/* ⚠️ NO SUBTITLE, AND NO `PageHeader`. The bar above already carries the saved-status line
          and the breadcrumb already reads Setup / Account, so "Manage your profile, plan and
          preferences." was the third statement of the same fact inside one screen-height. The
          title is plain Playfair in ink — no italic accent word: that treatment is an artefact of
          the form-11 demo file, not a heading style this app has. */}
      <header className="acct-head" style={{ position: "relative", zIndex: 1 }}>
        <h1 className="acct-title">Account settings</h1>
      </header>

      <div className="acct-plane" style={{ position: "relative", zIndex: 1 }}>
        <div className={`acct-grid${active === "plan" ? " acct-grid--wide" : ""}`}>
          <div className="acct-rail">
            <Rail active={active} onSelect={goSection} />
          </div>
          <div
            id="acct-panel"
            role="tabpanel"
            aria-labelledby={`acct-tab-${active}`}
            tabIndex={0}
            className="acct-col"
          >
            {sectionContent[active]}
          </div>
        </div>
      </div>

      {showDelete && <DeleteAccountModal onClose={() => setShowDelete(false)} accountEmail={currentUser.email} onContact={() => onNavigate("contact")} />}
    </div>
  );
};
