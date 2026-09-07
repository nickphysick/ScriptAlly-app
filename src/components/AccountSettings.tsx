/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Account settings — the STACKED-CARDS chassis (ref design-refs/settings-mode-stacked-cards-v2.html).
 *
 * A page title block, then one flat card per concern: 1px hairline, 12px radius, parchment, no
 * shadow and no header band. Every setting is one row — a label and its explanation on the left, a
 * control in a fixed 280px column on the right, a hairline between. Identity appears ONCE, at the
 * top of Profile. The section rail is NOT here: settings is a mode, and the rail lives in the
 * shell's panel slot (`settings/SettingsRail.tsx`).
 *
 * ⚠️ THE OLD DESCRIPTION OF THIS FILE SURVIVED THE THING IT DESCRIBED BY ONE COMMIT. It opened
 * "parchment cards carrying the sage-band uniform header … an outer parchment panel whose even
 * padding is the rim, an inner 1px frame with overflow:hidden" — a precise account of `SectionCard`,
 * `SubCard` and `MountPanel`, all three of which this chassis retired. A comment that outlives what
 * it describes is worse than no comment, because it is read as fact.
 *
 * Wiring rule: a control is wired only when its end-to-end behaviour already exists. Everything
 * else is absent rather than rendered inert — a dead control is worse than a missing one, and this
 * page has removed four on that grounds (pen name, author photo, session revocation, date format).
 *   WIRED ........ display name (explicit save), home country, theme, time zone, every notification
 *                  and task toggle, password reset, email verification resend, plan display, data
 *                  export, import, deletion request + cancel, sign out.
 *   NOT BUILT .... billing (no payment path exists), the account purge itself (no job runs), 2FA
 *                  and passkeys (named in a sentence, never as a disabled control).
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
import { buildExport, downloadExport, exportFilename, exportCoverageLine } from "../lib/dataExport";
import {
  DELETION_GRACE_DAYS, DELETION_CONFIRM_WORD, DELETION_REMOVES, RETENTION_LINE,
  deletionArmed, deletionRequest, scheduledDeletion, deletionNotice, deletionCancelled,
} from "../lib/accountDeletion";
import { ACCOUNT_ROUTES, AccountSectionId } from "../lib/accountRoutes";
import { useDirtyField } from "../lib/useSaveState";
import { auth } from "../lib/firebase";
import { sendEmailVerification } from "firebase/auth";
import {
  passwordMode, federatedNames, SECURITY_AFTER_LAUNCH, PASSWORD_ABSENT_NOTE,
} from "../lib/accountSecurity";
import { readAuthFacts } from "../lib/accountAuthFacts";
import { dirtyFieldKeys } from "../lib/saveSignal";
import { useToast } from "./toast/ToastProvider";
import { validateDisplayName } from "../lib/accountValidation";
import { MountPanel } from "./MountPanel";
import { SECTION_BANDS } from "./settings/sectionBands";
import { AddPassword } from "./settings/AddPassword";
import {
  SettingsTitle, SettingsCard, SettingsRow, SettingsNote, IdentityRow,
} from "./settings/SettingsCards";
import "./settings/settings.css";
import { CountryCombobox } from "./forms";
import { PlanComparison } from "./plans/PlanComparison";
import { todoPrefs, STALE_MONTHS_CHOICES } from "../lib/todoPrefs";
import { useSmartImportEntitlement } from "../lib/useSmartImportEntitlement";
import { smartImportLine } from "../lib/smartImportEntitlement";
import { planAllowanceLine } from "../lib/planComparison";
import { optionalTaskTypes, ALWAYS_ON_LINE, staleOptionLabel, STALE_NOTE } from "../lib/accountTasks";
/* ⚠️ THE PARCHMENT/RIM/BAND TOKENS ARE GONE FROM THIS IMPORT with the chassis that read them —
   `parchment`, `PAPER_TEXTURE`, `mountShadow`, `insetBorder`, `sageBandGradient`, `sageBandRule`
   and `headingInk`. They are all still exported and still read by the rest of the app; what is
   deleted is this page's use of them, which is the honest half of a chassis change. */
import {
  sageAccent,
  burgundy,
  bodyInk,
  mutedInk,
  labelColor,
  FONT_SERIF,
  FONT_SANS,
  FONT_MONO,
} from "../lib/designTokens";
import {
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
 * decides what they are.
 *
 * ⚠️ THE PAGE'S OWN `SECTIONS` COPY IS GONE WITH THE RAIL (settings-mode pack, Phase 1). It existed
 * to give the rail a label and a glyph; the rail is in the shell now and reads `ACCOUNT_ROUTES` and
 * `SECTION_BANDS` directly. What is left here needs a PATH and nothing else, so it reads the route
 * table — the same one-source rule this note has always stated, with one fewer restatement. */
type SectionId = AccountSectionId;

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
/* ⚠️ `GroupLabel` IS GONE. It drew a mono eyebrow above a run of rows — "Workspace", "Your to-do
   list" — which is exactly what a card's Playfair heading now says, one line higher and in the
   page's own voice. Two ways to name a group of settings, on the same screen, is one more than the
   reader can be asked to interpret. */

/**
 * The LIVE switch — the instant-commit half of the save model.
 *
 * ⚠️ IT IS A `role="switch"` BUTTON, NOT A CHECKBOX PAINTED TO LOOK LIKE ONE. The state has to
 * reach a screen reader as on/off, and `aria-checked` on a switch is the one that does.
 *
 * ⚠️ AND IT COMMITS ON CHANGE, WITH NO SAVE BUTTON ANYWHERE NEAR IT. Flicking a switch is the
 * whole decision; asking for a confirmation afterwards would be asking twice.
 *
 * ⚠️ IT WAS `ToggleRow` AND IS NOW JUST THE SWITCH (settings-mode pack, Phase 2). The row's label
 * and description are `SettingsRow`'s job now, and a component that drew its own would put a second
 * row grammar inside the first — two rhythms, one card. What it keeps is the part only it knows:
 * the switch's geometry, its ARIA and its transition. `label` survives as the accessible name
 * because the visible label is no longer this component's child to point at.
 */
const Toggle: React.FC<{
  on: boolean;
  onChange: (next: boolean) => void;
  label: string;
}> = ({ on, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    aria-label={label}
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
    <span className="acct-note">{children}</span>
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
/* ⚠️ `SectionCard` AND `SubCard` ARE GONE, AND WITH THEM THE SAGE BAND (settings-mode pack,
   Phase 2). Both wore a gradient header — sage, or the danger card's warmer variant — carrying the
   section's name and sub-line above a `MountPanel` rim and inner frame. Three things retired it:

     · THE BAND SAID WHAT THE PAGE ALREADY SAYS. The title block names the section and the rail
       shows which one is selected; the band was a third statement of it, and the loudest element
       on screen carried the least information.
     · A SECTION AND A SUB-SECTION LOOKED LIKE TWO KINDS OF THING. `SubCard`'s own note admitted
       it: it kept a plainer header so the two cards under Your data would not "look like sections
       the rail forgot to list". One flat card per concern removes the question.
     · THE DANGER CARD FILLED. A warning gradient at the foot of Your data shouts at a reader who
       came to download a copy of their work; the deletion card is a hairline and an ink now.

   `MountPanel` is untouched and still carries every other card in the app — see the note in
   `settings/SettingsCards.tsx` for why the flat card is genuinely a different object rather than a
   `flat` prop on it. */

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
            <p className="acct-note">
              You'll have <strong>{DELETION_GRACE_DAYS} days</strong> to change your mind. Nothing
              is removed before then.
            </p>
            <label htmlFor="del-confirm" className="acct-label">
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
            <p id="del-note" className="acct-note">
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
    const hit = ACCOUNT_ROUTES.find((r) => r.id === id);
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
     a subscription could offer, and it does not pretend otherwise.
     ⚠️ AND IT IS RE-READABLE ON DEMAND, WHICH IS A NARROWER CLAIM THAN "REACTIVE". Adding a password
     changes `providerData` on the SAME user object, synchronously, in this tab — so there is one
     moment when a fresh read is both possible and necessary, and `refreshAuthFacts` is it. It is
     not a subscription and must not become one: `emailVerified` still only moves on a reload, and a
     poll would spin waiting for something that cannot change without one. */
  const [authKey, setAuthKey] = useState(0);
  const authFacts = useMemo(() => readAuthFacts(), [authKey]);
  const refreshAuthFacts = useCallback(() => setAuthKey((n) => n + 1), []);
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
  /* ⚠️ THROUGH `todoPrefs()`, WHICH IS TOTAL. An absent map, an absent field and a nonsense value
     all resolve to the same stated default, so this page never needs a `?? false` of its own. */
  const prefs = todoPrefs(currentUser.todoPrefs);

  /* ⚠️ THE ALLOWANCE COMES FROM THE HOOK, NEVER FROM PLAN + USAGE READ AGAIN HERE. The policy is
     stated once in `getSmartImportEntitlement` and mirrored server-side in the callable; a third
     reading of the same two fields on this page would be free to disagree with both — and the
     failure is a settings page telling a writer they have an import that the function then refuses.
     ⚠️ AND THE DATE FORMATTER IS PASSED IN. `smartImportLine` is pure and node-testable; taking a
     locale format inside it would make its output depend on the machine running it. */
  const smartImport = smartImportLine(
    useSmartImportEntitlement(),
    (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
      day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
    }),
  );

  /** Every task pref commits instantly with the standard receipt — the same model as every other
   *  toggle and select on this page. */
  const saveTodoPref = async (patch: Partial<typeof prefs>, what: string) => {
    try {
      await updateUserProfile({ todoPrefs: { ...prefs, ...patch } });
      savedReceipt(what);
    } catch {
      showToast({ message: `Couldn't save ${what.toLowerCase()} — try again?`, duration: 4000 });
    }
  };

  /* ⚠️ `headerFacts` IS GONE WITH THE HEADER. `accountFacts` derived a "joined / manuscripts /
     queries sent" strip for the illustrated plate; the plate is retired and nothing else on this
     page states those figures — they are the dashboard's job, and a settings page that counts your
     queries at you is a settings page doing something else. The helper survives in
     `lib/accountHeaderFacts` with its tests; it is a derivation with no caller, which the run
     report names rather than leaving to be discovered. */
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
      await updateUserProfile({ scheduledDeletion: deletionCancelled() });
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
    <>
      <SettingsTitle name={SECTION_BANDS.profile.name} description={SECTION_BANDS.profile.sub} />

      {/* ⚠️ IDENTITY APPEARS ONCE IN THE WHOLE OF SETTINGS, AND THIS IS IT. It used to be an
          illustrated header above every section — the writer's own name and address restated seven
          times, so the only element that could have held still while you navigated was the one that
          moved most. The rail says which section you are in; this says whose account it is, in the
          section about you.

          ⚠️ NO AUTHOR-PHOTO CONTROL, AND NO DISABLED PLACEHOLDER FOR ONE. Firebase Storage is not
          configured in this project — no `storage.rules`, no storage block in either hosting config,
          no `firebase/storage` import anywhere in src. A "Change photo" button that cannot store a
          photo is the Pen name field wearing a different label, and this build removed that one for
          exactly this reason.
          STANDING FLAG: `OneScreenAuthor.tsx:62`'s "Add a photo +" navigates here and finds nothing
          — a one-line follow-up, deliberately not smuggled into this phase. */}
      <SettingsCard heading="You" headingId="acct-h-profile">
        <IdentityRow name={currentUser.name} email={currentUser.email} />
      </SettingsCard>

      <SettingsCard
        heading="Details"
        note="Your name saves when you press Save. Everything else saves as you change it."
        /* ⚠️ THE SAVE IS ABSENT UNTIL THE FIELD DIVERGES, not present-and-disabled. A permanently
           greyed button spends its whole life saying no; its ARRIVAL is the page telling you there
           is something to do, and it leaves the moment the value matches what is stored — including
           when you type your way back to it by hand. */
        action={nameChanged ? (
          <span className="acct-actions" style={{ margin: 0 }}>
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
          </span>
        ) : undefined}
      >
        <SettingsRow
          label="Display name"
          description="Shown in the app and on anything you export."
          control={
            <input
              id="account-name"
              type="text"
              value={name}
              maxLength={256}
              onChange={(e) => setName(e.target.value)}
              className="acct-input sc-grow"
              style={inputStyle}
              aria-label="Display name"
              aria-describedby={nameStatus.type === "error" ? "account-name-error" : undefined}
            />
          }
        />
        {nameStatus.type === "error" && (
          <SettingsNote><span id="account-name-error" className="acct-err">{nameStatus.msg}</span></SettingsNote>
        )}

        {/* Home country — seeded silently at signup from the browser locale (key omitted when
            unresolvable) and previously never writable again: a wrong guess was a permanent trap
            for the agent territory split (Tier 2 · Phase 4). Absent shows as "Not set" and is
            settable; once set it can be changed but not cleared (the origin-state law).

            ⚠️ IT COMMITS ON SELECT, WITH A RECEIPT AND NO SAVE BUTTON — choosing from a list IS the
            decision. `CountryCombobox` is the app's own control; a native `<select>` would drop the
            flags and take the OS's menu styling into the middle of the card. */}
        <SettingsRow
          label="Home country"
          description="The agent list uses this to tell agents in your country from international ones. You can change it any time."
          control={
            <div className="sc-grow">
              <CountryCombobox
                id="account-homecountry"
                value={currentUser.homeCountry ?? ""}
                onChange={saveHomeCountry}
                placeholder="Not set"
              />
            </div>
          }
        />
        {countryStatus.type === "error" && (
          <SettingsNote><span className="acct-err">{countryStatus.msg}</span></SettingsNote>
        )}
      </SettingsCard>
    </>
  );

  const securitySection = (
    <>
      <SettingsTitle name={SECTION_BANDS.security.name} description={SECTION_BANDS.security.sub} />

      <SettingsCard heading="Email" headingId="acct-h-security">
        {/* ⚠️ "Change email" GOES TO SUPPORT, BECAUSE THERE IS NO FLOW BEHIND IT. Firebase's
            `verifyBeforeUpdateEmail` needs a recent sign-in and a re-auth path this app has never
            built, and a button that opens nothing is the disabled-field fault wearing a verb. This
            reuses Your data's own "Correct something we hold" route, which exists for exactly the
            case where the writer cannot change something themselves. */}
        {/* ⚠️ THE ADDRESS ITSELF IS THE ROW'S VALUE, and leaving it out was a real regression this
            phase's own measurement caught: the card ABOUT your email address did not say what it
            was. Profile's identity row shows it too, which is not a reason to drop it here — that
            is a different section answering a different question, and a reader checking which
            address their reset link goes to should not have to navigate to find out. */}
        <SettingsRow
          label="Email address"
          description={
            <>
              <span className="sc-val">{currentUser.email}</span>
              <br />
              The address you sign in with. To change it, you'll confirm from both the old and the
              new address.
            </>
          }
          control={
            <>
              <VerifiedChip verified={authFacts?.emailVerified ?? true} />
              {/* ⚠️ "Change email", NOT "Change". Shortening both this and the password button to
                  the bare verb — which is what the 280px column first tempted — put TWO buttons on
                  one page with the identical accessible name and different effects. A screen reader
                  announcing "Change, button" twice cannot distinguish them, and neither can a voice
                  command. The column is wide enough for the noun. */}
              <button onClick={() => onNavigate("contact")} style={ghostBtn}>Change email</button>
            </>
          }
        />

        {/* ⚠️ `emailVerified` DOES NOT RE-RENDER. It is a snapshot on the auth user, refreshed only
            by a reload or an explicit `reload()`; polling it would spin, and flipping the chip
            locally after sending would be the UI asserting an outcome it has not observed. So the
            confirmation says to reload — the one honest instruction. */}
        {authFacts && !authFacts.emailVerified && (
          <SettingsRow
            label="Confirm this address"
            description="Until it's confirmed we can't be sure a reset link reaches you."
            control={
              <>
                {verifyMsg && verifyMsg !== "sending" && (
                  <span style={{ fontFamily: FONT_SANS, fontSize: 12.5, fontWeight: 500, color: verifyMsg.startsWith("Couldn") ? ERROR_RED : SUCCESS_GREEN }}>
                    {verifyMsg}
                  </span>
                )}
                <button onClick={resendVerification} disabled={verifyMsg === "sending"} style={ghostBtn}>
                  {verifyMsg === "sending" ? "Sending…" : "Resend"}
                </button>
              </>
            }
          />
        )}
      </SettingsCard>

      {/* ⚠️ NO SESSIONS BLOCK. "Sign out of all other sessions" was built here, wired to a named
          stub, and reported honestly that it could not act — and an honest dead control is still a
          dead control. Settings states what your account IS and offers what it can DO; a button
          whose only outcome is an apology fails that on both counts. Same rule that removed the
          Pen name field and the author-photo control.
          `signOutOtherSessions` and `SESSION_REVOKE_UNAVAILABLE` survive in `lib/accountSecurity`
          with their tests: the seam is where the Cloud Function lands, and deleting it would mean
          rediscovering that the client SDK cannot revoke a session at all. */}
      <SettingsCard
        heading="Ways to sign in"
        blurb="Keep more than one, so you can always get back in."
        note={SECURITY_AFTER_LAUNCH}
      >
        {/* ⚠️ THE PROVIDER ROWS ARE DERIVED, NEVER LISTED. `federatedNames` reads what Firebase
            reports on the account, so an account that gains a provider gains a row without anyone
            editing this file — and one that never had Google never sees a Google row.
            ⚠️ NO CONNECTION DATE. Firebase exposes `creationTime` and `lastSignInTime` on the USER
            and nothing per provider; printing either under "connected" is a real date wearing the
            wrong name, which is the same fault as the password's retired "last changed" line. */}
        {federatedNames(authFacts?.providerIds ?? []).map((n) => (
          <SettingsRow
            key={n}
            label={n}
            description={currentUser.email}
            control={<span className="acct-chip">Connected</span>}
          />
        ))}

        {pwMode === "federated-only" ? (
          /* ⚠️ THIS ROW USED TO BE A DEAD END, AND THAT WAS THE WHOLE DEFECT. It read "there's no
              ScriptAlly password on this account, so there's nothing here to change" — true, and an
              account whose only sign-in route is one provider is one lost Google account away from
              losing every manuscript in it, with no way back the app could offer.
              ⚠️ THE ROW GOES FULL-WIDTH: two labelled fields and two buttons do not belong in a
              280px control column, and a security form should not be the narrowest box on the page.
              The `key` forces a remount when the linking succeeds, so the row re-derives from the
              new provider list rather than holding the form's own "done" state for ever. */
          <SettingsRow key={`pw-${authKey}`} label="Password" description={PASSWORD_ABSENT_NOTE} full>
            <div style={{ marginTop: 10 }}>
              <AddPassword buttonStyle={ghostBtn} onAdded={refreshAuthFacts} />
            </div>
          </SettingsRow>
        ) : (
          /* ⚠️ NO "LAST CHANGED {date}" LINE. Firebase exposes creationTime and lastSignInTime and
             nothing else; printing either under that label is a real date wearing the wrong name.
             See PASSWORD_LAST_CHANGED_AVAILABLE. */
          <SettingsRow
            label="Password"
            description="We'll email you a secure link to set a new one."
            control={
              <>
                {resetMsg && <span style={{ fontFamily: FONT_SANS, fontSize: 12.5, fontWeight: 500, color: SUCCESS_GREEN }}>{resetMsg}</span>}
                <button onClick={sendReset} style={ghostBtn}>
                  <KeyRound style={{ width: 14, height: 14 }} aria-hidden="true" /> Change password
                </button>
              </>
            }
          />
        )}
      </SettingsCard>
    </>
  );

  const planSection = (
    <>
      <SettingsTitle name={SECTION_BANDS.plan.name} description={SECTION_BANDS.plan.sub} />

      {/* ⚠️ NO USAGE BLOCK ANYWHERE ON THIS SECTION — no meters, no counts, no "where you stand".
          The card answers "what do I get" and stops; position against a limit is not what anyone
          opens this page for, and it is the half that ages into nagging.
          ⚠️ AND THE EXPORT IS NOT MENTIONED HERE. It is a data right, it lives in Your data, and
          naming it beside a plan comparison invites the reading that it is a plan feature.
          ⚠️ `PlanComparison` IS UNCHANGED AND KEEPS ITS OWN CHASSIS. It is a table, not a column of
          rows, and forcing it into the row grammar would be re-drawing a locked component to match
          a layout — the rows here are one label, one control; a comparison is one label and TWO
          values, which the row cannot say. */}
      {/* ⚠️ THE ALLOWANCE IS THE ONE FIGURE THIS PAGE STATES ABOUT USAGE, and it is a separate card
          from the comparison DELIBERATELY. The comparison answers "what do I get"; this answers
          "what have I got left", which is a different question about a different moment. Folding it
          into the table would put a live per-account number inside a static price list.
          ⚠️ AND IT IS THE ONLY ONE. No meter on agents, none on queries — both are unlimited on
          both plans, so a meter would invent a limit to measure against. */}
      <SettingsCard heading="Your plan" headingId="acct-h-plan">
        <SettingsRow
          label={currentUser.plan === UserPlan.PRO ? "Pro" : "Free"}
          description={planAllowanceLine(currentUser.plan === UserPlan.PRO ? "pro" : "free") + "."}
          control={<button onClick={() => onNavigate("plans")} style={ghostBtn}>See Pro plans</button>}
        />
        <SettingsRow
          label="Smart Import"
          description={smartImport.note}
          control={
            <span className={`acct-chip${smartImport.tag === "Used" ? " acct-chip--muted" : ""}`}>
              {smartImport.tag}
            </span>
          }
        />
      </SettingsCard>

      <SettingsCard
        heading="What each plan includes"
        note="Price to be confirmed. Nothing to pay on the Free plan — your invoices will appear here if you move to a paid plan."
      >
        <div className="sc-row sc-row--full">
          <PlanComparison
            currentPlan={currentUser.plan === UserPlan.PRO ? "pro" : "free"}
            onSeePlans={() => onNavigate("plans")}
          />
        </div>
      </SettingsCard>
    </>
  );

  const notificationsSection = (
    <>
      <SettingsTitle name={SECTION_BANDS.notifications.name} description={SECTION_BANDS.notifications.sub} />

      {/* ⚠️ THE NOTICE IS WHAT MAKES THESE TOGGLES HONEST. There is no email-sending infrastructure
          in this app and no scheduler to run one — `functions/` holds nine callables and one
          scheduled job, and that job is the waitlist's retention sweep. So these record what you
          want FOR WHEN THERE IS. Without the notice they would claim to govern a live behaviour,
          which is the fault that removed Pen name and the sessions button; with it, they are a
          stored decision that will be honoured the day a job exists. */}
      {/* ⚠️ NO WRAPPER. This carried a `sc-inert` class that no stylesheet declared — a class the
          component emits and nothing selects on, which is the `.wpg--record` fault from the other
          end and just as silent. `InertNotice` already owns its own spacing. */}
      <InertNotice>
          ScriptAlly doesn't send these emails yet. What you choose here is stored and will be
        honoured from the day it does.
      </InertNotice>

      <SettingsCard heading="About your querying" headingId="acct-h-notifications" note={ALWAYS_SENT_LINE}>
        <SettingsRow
          label="Nudge reminders"
          description="When a query is due a nudge."
          control={<Toggle on={notify.nudges} onChange={(v) => saveNotify({ nudges: v }, "Nudge reminders")} label="Nudge reminders" />}
        />
        <SettingsRow
          label="Weekly summary"
          description="One email each Monday with what happened in the past week."
          control={<Toggle on={notify.weeklyDigest} onChange={(v) => saveNotify({ weeklyDigest: v }, "Weekly summary")} label="Weekly summary" />}
        />
      </SettingsCard>

      {/* ⚠️ MARKETING IS ITS OWN CARD, AND ITS OWN STORED FIELD. Under UK PECR consent must be
          affirmative, evidenced and withdrawable in one action — so it defaults OFF, is never
          pre-ticked, writes a timestamped record in BOTH directions, and takes effect on the click
          rather than on a Save. Withdrawal rewrites the record rather than deleting it: the
          evidence that consent existed, and when it stopped, is the half a regulator asks about.
          ⚠️ ITS OWN CARD RATHER THAN A GROUP INSIDE THE ONE ABOVE, because the separation is the
          legal point — transactional and marketing email are different things with different rules,
          and a shared card says they are two settings of one kind. */}
      <SettingsCard heading="News from ScriptAlly" note={`Sent to ${currentUser.email}.`}>
        <SettingsRow
          label="Product news"
          description="Occasional news about new ScriptAlly features. Off unless you turn it on, and one click to stop."
          control={<Toggle on={marketingOn} onChange={saveMarketing} label="Product news" />}
        />
      </SettingsCard>
    </>
  );

  /* ⚠️ THE PREFERENCES LINK ROW IS DELETED, NOT RE-POINTED. Tasks is a rail section again, and a
     link row from inside Preferences to a sibling section is clutter — the rail is already the way
     between sections. What it used to open, `TaskSettingsSheet`, is retired in this same commit. */

  const preferencesSection = (
    <>
      <SettingsTitle name={SECTION_BANDS.preferences.name} description={SECTION_BANDS.preferences.sub} />

      {/* ⚠️ THE TASKS LINK ROW THE REF DRAWS IS DELIBERATELY NOT BUILT. `settings-mode-stacked-
          cards-v2.html` puts a "Task defaults → Open" row at the foot of this section, pointing at
          the sibling Tasks section. `accountRoutes.ts` deleted exactly that row and states its
          reason: Tasks is a rail section again, and a link from inside one section to another is
          clutter beside a rail that is already the way between them. A reasoned value in prose
          beats an unreasoned one in an artefact — the house's own mockup-wins carve-out. Flagged in
          the run report rather than decided quietly. */}
      <SettingsCard heading="Workspace" headingId="acct-h-preferences">
        {/* Theme — the one setting on this page that changes something the moment you click it.
            The three that ship are the segmented switcher's own list (design-refs/themes.md); the
            value written is `queriesTheme`, which the AppShell root reads as .t-capp / .t-bold /
            .t-edn. Instant commit, receipt, no Save button. */}
        <SettingsRow
          label="Theme"
          description="The look of your workspace."
          control={
            <div role="radiogroup" aria-label="Workspace theme" style={{ display: "inline-flex", gap: 3, flexShrink: 0, background: "#f3ece2", border: "1px solid #e2d6c6", borderRadius: 10, padding: 3 }}>
              {/* ⚠️ THE FULL NAMES. They were shortened to "Capp" / "Bold" to fit the control column
                  and that renamed two themes: "Capp" is not a word, and the app calls them
                  Cappuccino, Bold Pastille and Editorial everywhere else — including the rail's own
                  switcher. A layout constraint is not a licence to rename a thing. */}
              {([["cappuccino", "Cappuccino"], ["bold", "Bold"], ["editorial", "Editorial"]] as const).map(([val, label]) => {
                const on = (currentUser?.queriesTheme ?? "cappuccino") === val;
                return (
                  <button
                    key={val}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    /* ⚠️ THE ACCESSIBLE NAME IS THE FULL ONE. The visible labels shortened to fit
                       the 280px control column; "Capp" is not a word, and a screen reader must not
                       be handed an abbreviation the design chose for width. */
                    /* Bold's full name is "Bold Pastille"; the segment shows "Bold" because the
                       second word is the palette's name rather than the theme's, and the rail's
                       switcher does the same. The accessible name carries both. */
                    aria-label={val === "bold" ? "Bold Pastille" : label}
                    onClick={() => { void updateUserProfile({ queriesTheme: val }); savedReceipt("Theme"); }}
                    style={{ fontFamily: FONT_SANS, fontSize: 12.5, fontWeight: on ? 700 : 500, color: on ? bodyInk : "#8a7d6c", background: on ? "#fffefb" : "transparent", border: on ? "1px solid #d8cebf" : "1px solid transparent", boxShadow: on ? "0 1px 2px rgba(29,23,18,.10)" : "none", borderRadius: 8, padding: "6px 11px", cursor: "pointer" }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          }
        />

        {/* ⚠️ TIME ZONE IS STORED AND NOTHING READS IT YET, AND THE HELPER SAYS SO. Dates already
            render in the device's zone — the same zone, for almost every writer — and wiring this
            to DISPLAY would mean threading it through 93 `toLocaleDateString` call sites, several
            in files this build must not touch. It is stored for the scheduled work that does not
            exist yet: a reminder at 9am local needs a server to know which 9am.
            ⚠️ AND THE VALUE IS RESOLVED, NEVER BACKFILLED. An account with nothing stored reads as
            its BROWSER's zone, not Europe/London — pinning a writer in Chicago to London would give
            them wrong day boundaries with nothing on screen to explain it. */}
        <SettingsRow
          label="Time zone"
          description={TZ_HELPER}
          control={
            <select
              id="account-timezone"
              aria-label="Time zone"
              value={timezone}
              onChange={(e) => saveTimezone(e.target.value)}
              className="acct-input sc-grow"
              style={{ ...inputStyle, padding: "7px 10px", fontSize: 13 }}
            >
              {tzOptions(timezone).map((z) => <option key={z} value={z}>{z}</option>)}
            </select>
          }
        />

        {/* ⚠️ NO DATE-FORMAT AND NO WEEK-START CONTROL, THOUGH THE REF DRAWS BOTH. Both are pure
            DISPLAY claims, and every date in this app renders through one of 93
            `toLocaleDateString("en-GB", …)` calls — several of them in files this build must not
            touch. A stored "MM/DD/YYYY" beside a page full of "20 August 2026" is not a deferred
            preference, it is a visible untruth, and it is the same fault that removed Pen name, the
            author-photo control and the sessions button. They arrive with a shared formatter, not
            before one. */}
      </SettingsCard>
    </>
  );

  /**
   * THE TASKS SECTION — preferences only, and the ONLY form for these fields.
   *
   * ⚠️ `TaskSettingsSheet` IS RETIRED. Two forms over one set of fields must not coexist: "two
   * places to change a default and two chances to disagree about it" is the fault the sheet itself
   * was built to prevent.
   *
   * ⚠️ THE MUTED-RULES COLUMN LEFT FOR THE BOARD. It listed one of the THREE kinds of hiding the
   * app has; the other two — permanent dismissals and live snoozes — were never here, so a writer
   * looking for something they had set aside had to know which kind it was before they knew where
   * to look. `hiddenItems()` returns all three in one shape, and the board's "Set aside & tags"
   * panel renders them together.
   *
   * What stays is what a SETTING is: the behaviours that decide what reaches the list at all.
   */
  const tasksSection = (
    <>
      <SettingsTitle name={SECTION_BANDS.tasks.name} description={SECTION_BANDS.tasks.sub} />

      <SettingsCard heading="Your to-do list" headingId="acct-h-tasks" note={STALE_NOTE}>
        <SettingsRow
          label="Keep unfinished tasks"
          description="Anything you don't finish moves to today rather than being left behind."
          control={<Toggle on={prefs.rollForward} onChange={(v) => saveTodoPref({ rollForward: v }, "Keep unfinished tasks")} label="Keep unfinished tasks" />}
        />
        <SettingsRow
          label="Start the week with a summary"
          description="A short review of the week just gone, on Monday."
          control={<Toggle on={prefs.weeklyBriefing} onChange={(v) => saveTodoPref({ weeklyBriefing: v }, "Weekly summary")} label="Start the week with a summary" />}
        />
        <SettingsRow
          label="Move a task to the back of the list after"
          control={
            <select
              id="account-stale"
              aria-label="Move a task to the back of the list after"
              className="acct-input acct-select sc-grow"
              value={prefs.staleMonths}
              onChange={(e) => saveTodoPref({ staleMonths: Number(e.target.value) }, "Waiting time")}
            >
              {STALE_MONTHS_CHOICES.map((m) => (
                <option key={m} value={m}>{staleOptionLabel(m)}</option>
              ))}
            </select>
          }
        />
      </SettingsCard>

      {/* ⚠️ `decide` GETS A SENTENCE, NOT A SWITCH. `todoPrefs` forces it true — the one value the
          prefs resolver refuses to take an instruction on — so a toggle for it would be a control
          that cannot act, which this build has removed three times now. */}
      <SettingsCard heading="What appears on your list" note={ALWAYS_ON_LINE}>
        {optionalTaskTypes().map((t) => (
          <SettingsRow
            key={t.key}
            label={t.label}
            description={t.gloss}
            control={<Toggle on={prefs.types[t.key]} onChange={(v) => saveTodoPref({ types: { ...prefs.types, [t.key]: v } }, t.label)} label={t.label} />}
          />
        ))}
      </SettingsCard>
    </>
  );

  const dataSection = (
    <>
      <SettingsTitle name={SECTION_BANDS.data.name} description={SECTION_BANDS.data.sub} />

      {/* ⚠️ THE EXPORT IS THE PORTABILITY RIGHT, SAID WITHOUT LEGALESE. UK GDPR gives you a copy of
          your own records in a form a machine can read; the copy says that in plain words rather
          than citing an article at someone who just wants their work.
          ⚠️ AND IT IS THE JSON BUNDLE, NOT A CSV. The original brief said "CSV export"; the CSV that
          exists covers the query LIST only, and a partial file is not the complete copy the right
          is about. `buildExport` is the whole account, and `EXPORT_COLLECTIONS` is derived from its
          own shape so a collection cannot be added to one and forgotten in the other. */}
      <SettingsCard
        heading="Take a copy of your data"
        /* ⚠️ THE BRIEF-FIXED SENTENCE IS RESTORED VERBATIM AND THE DERIVED LIST SITS BESIDE IT,
           rather than replacing it. This phase first swapped the sentence for `exportCoverageLine()`
           on the grounds that it is more accurate — see the run report, which raises that as a
           question rather than answering it. Overruling copy a brief fixed is not a layout
           decision, so the sentence stands and the enumeration is ADDED, which understates
           nothing. */
        blurb="Downloads everything ScriptAlly holds about your querying — your agents, queries, and history — as files you can open anywhere."
        headingId="acct-h-data"
        note={exportMsg ? <span style={{ color: SUCCESS_GREEN, fontWeight: 500 }}>{exportMsg}</span> : undefined}
      >
        {/* ⚠️ THE LIST IS DERIVED FROM `EXPORT_COLLECTIONS`, NEVER TYPED OUT. A hand-written list
            beside a real export is a claim about coverage that goes stale the first time a
            collection is added — and the failure is a page telling a reader their notes are in a
            file that does not contain them. */}
        <SettingsRow
          label="Everything you've put in"
          description={exportCoverageLine()}
          control={
            <button onClick={exportData} style={ghostBtn}>
              <Download style={{ width: 14, height: 14 }} aria-hidden="true" /> Download a copy
            </button>
          }
        />

        {/* ⚠️ THE THIRD DATA RIGHT, AND IT HAD NO ROUTE. The privacy policy offers access, export,
            CORRECTION and deletion; export and deletion had surfaces here and correction had none,
            so the one right a writer is most likely to need was the one with nowhere to click. */}
        <SettingsRow
          label="Correct something we hold"
          description="Most things you can edit yourself. For anything you can't, write to us and we'll put it right."
          control={<button onClick={() => onNavigate("contact")} style={ghostBtn}>Get in touch</button>}
        />

        <SettingsRow
          label="Import agents and queries"
          description="Bring in your existing tracking from a spreadsheet."
          control={
            <button onClick={() => onNavigate("import")} style={ghostBtn}>
              <Upload style={{ width: 14, height: 14 }} aria-hidden="true" /> Open import
            </button>
          }
        />
      </SettingsCard>

      {/* Retention — the period comes from the same constant the privacy policy reads, so settings
          and the notice cannot state two different numbers. */}
      <SettingsCard heading="How long we keep it">
        <SettingsNote>{RETENTION_LINE}</SettingsNote>
      </SettingsCard>

      {/* ⚠️ SIGN OUT SITS ABOVE THE DELETION CARD, NOT BELOW IT. Someone scrolling to close their
          account should not pass the way out on the journey to deletion — and someone looking for
          the way out should not have to scroll past a delete button to find it. Two exits, and the
          reversible one comes first.

          ⚠️ ONE IMPLEMENTATION, TWO DOORS. This is the same `logout` the account menu calls, so
          where sign-out leaves you cannot differ by the door you used. */}
      <SettingsCard heading="Signing out" headingId="acct-h-signout">
        <SettingsRow
          label="Sign out"
          description="Ends this session and takes you back to the ScriptAlly home page. Your work stays where it is."
          /* No confirm: leaving is not destructive, and signing back in costs a password. */
          control={
            <button onClick={() => { void logout(); }} style={ghostBtn}>
              <LogOut style={{ width: 14, height: 14 }} aria-hidden="true" /> Sign out
            </button>
          }
        />
      </SettingsCard>

      <SettingsCard heading="Delete your account" danger headingId="acct-h-danger">
        {pendingDeletion ? (
          /* ⚠️ THE SCHEDULED STATE REPLACES THE REQUEST CONTROL — it does not sit beside it. Two
             delete buttons, one of them already pressed, is how someone confirms twice and cannot
             tell what state they are in. */
          <div id="acct-deletion-scheduled">
            <SettingsNote>
              <span style={{ fontWeight: 600, color: DANGER_INK }}>{deletionNotice(pendingDeletion)}</span>
            </SettingsNote>
            <SettingsNote>
              Nothing has been removed. Cancel any time before then and your account carries on
              exactly as it is.
            </SettingsNote>
            {/* ⚠️ STATED, BECAUSE IT IS TRUE AND THE ALTERNATIVE IS A PROMISE NOBODY KEEPS. There is
                no job that purges an account, so the page must not imply one runs on the date. It
                offers the route that does work. */}
            <SettingsRow
              label="Changed your mind?"
              description={
                <>
                  Deletion isn't automatic yet — we complete it by hand.{" "}
                  <button
                    type="button"
                    onClick={() => onNavigate("contact")}
                    style={{ background: "none", border: "none", padding: 0, font: "inherit", color: DANGER_INK, textDecoration: "underline", textUnderlineOffset: 2, cursor: "pointer" }}
                  >
                    Write to us
                  </button>{" "}
                  if you need it done by a particular date.
                </>
              }
              control={<button onClick={cancelDeletion} style={ghostBtn}>Cancel deletion</button>}
            />
          </div>
        ) : (
          <>
            {/* ⚠️ THE BRIEF-FIXED SENTENCE, VERBATIM. It was briefly replaced by a run of
                `DELETION_REMOVES` lines — a longer and more precise list — and the same rule
                applies as to the export blurb above: a more accurate sentence is still a copy
                change, and copy a brief fixed is not this phase's to rewrite. `DELETION_REMOVES`
                is still what the confirmation modal enumerates. */}
            <SettingsRow
              label="Delete account"
              description={`This removes your account and everything in it — manuscripts, agents, queries, and history. You'll have ${DELETION_GRACE_DAYS} days to change your mind: signing in again within that time cancels it.`}
              control={
                <button
                  onClick={() => setShowDelete(true)}
                  style={{ ...ghostBtn, color: DANGER_INK, borderColor: DANGER_INK }}
                >
                  <Trash2 style={{ width: 14, height: 14 }} aria-hidden="true" /> Delete account…
                </button>
              }
            />
          </>
        )}
      </SettingsCard>
    </>
  );

  const sectionContent: Record<SectionId, React.ReactNode> = {
    profile: profileSection,
    security: securitySection,
    plan: planSection,
    notifications: notificationsSection,
    preferences: preferencesSection,
    tasks: tasksSection,
    data: dataSection,
  };

  /* ⚠️ SETTINGS PAINTS NO GROUND OF ITS OWN — AND THE FIX WAS SUBTRACTION, NOT A NEW COLOUR.
        It used to lay `pageGround` (kraft #F5F0EA plus a radial glow) and a fixed grain over the
        shell, which made it the ONLY page not wearing the shared ground: browser-measured,
        `.ws-work` is rgb(254,252,250) on every route including this one, and settings covered it
        with rgb(245,240,234). Painting #FEFCFA here instead would have looked identical today and
        drifted the day the token moved. Deleting the override lets `--ws-window` show through, so
     settings follows the app's ground for free. */
  return (
    <div className="acct-page font-sans" style={{ color: bodyInk }}>

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
        {/* ⚠️ THE RAIL AND THE ASIDE ARE GONE FROM THIS PAGE — they moved into the SHELL's panel
            slot (`shell/WorkspaceShell.tsx` → `settings/SettingsRail.tsx`). Settings is a mode
            now: the panel shows the app's nav or the settings rail, never both, so a page-level
            rail would be a second list of places to go nested inside the first.

            ⚠️ THE GRID SURVIVES AS A ONE-COLUMN WRAPPER RATHER THAN BEING DELETED. `.acct-work` is
            the scroll and width chain the sections sit in; unwrapping it here to save an element
            would move that chain into this file in the same commit that is trying to make the page
            smaller. Its second track is dropped in the stylesheet, where the rail's width was.

            ⚠️ AND `aria-labelledby` STILL POINTS AT THE RAIL'S ITEM ID, WHICH IS NOW IN THE SHELL.
            That is valid — an `id` reference resolves across the document, not within a subtree —
            and it is deliberate: the panel is labelled by the thing that selected it. What it
            breaks is a SMOKE TEST that rendered this page alone and expected both halves in one
            string; that lock is split rather than dropped (see `settingsPageSmoke.test.tsx`). */}
        <div className="acct-grid">
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
