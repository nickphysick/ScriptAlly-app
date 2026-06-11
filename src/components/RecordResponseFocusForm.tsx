/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Record a Response — Form 11 single-page variant.
 * Replaces the multi-step RecordResponseModal for surfaces that prefer a direct form.
 * All Firestore writes still go through recordQueryResponse (memory rule: single write path).
 */

import React, { useEffect, useState } from "react";
import { collection, deleteDoc, doc, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useScriptAllyDb } from "../lib/db";
import { Agent, Query, QueryStatus } from "../types";
import { recordQueryResponse } from "../lib/recordResponse";
import { BrandDatePicker, BrandDropdown, FormShell } from "./forms";
import { StatusCircle } from "./StatusPill";

// ── Date helpers (local-date-safe, no UTC off-by-one) ────────────────────

const pad = (n: number) => String(n).padStart(2, "0");
const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromISO = (s: string): Date | null => {
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
};
const todayISO = () => toISO(new Date());
const fmtLong = (iso: string) => {
  const d = fromISO(iso);
  if (!d) return "Not specified";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};
const addDays = (iso: string, days: number): string => {
  const d = fromISO(iso);
  if (!d) return "";
  d.setDate(d.getDate() + days);
  return toISO(d);
};
const addWeeks = (iso: string, weeks: number) => addDays(iso, weeks * 7);

// ── Pipeline rank for transition-mode detection ───────────────────────────

const PIPELINE_RANK: Partial<Record<QueryStatus, number>> = {
  [QueryStatus.QUERIED]: 0,
  [QueryStatus.PARTIAL_REQUESTED]: 1,
  [QueryStatus.PARTIAL_SENT]: 1.5,
  [QueryStatus.FULL_REQUESTED]: 2,
  [QueryStatus.FULL_SENT]: 2.5,
  [QueryStatus.REVISE_RESUBMIT]: 3,
  [QueryStatus.OFFER]: 4,
};
const TERMINAL_STATUSES = new Set<QueryStatus>([QueryStatus.REJECTED, QueryStatus.OFFER]);

type TransitionMode = "forward" | "same" | "backward";
function getTransitionMode(selected: QueryStatus, currentStatus: QueryStatus): TransitionMode {
  if (TERMINAL_STATUSES.has(selected)) return "forward";
  const selRank = PIPELINE_RANK[selected];
  const curRank = PIPELINE_RANK[currentStatus];
  if (selRank === undefined || curRank === undefined) return "forward";
  if (selRank === curRank) return "same";
  if (selRank < curRank) return "backward";
  return "forward";
}

// ── Reminder date computation ─────────────────────────────────────────────

type ReminderOffset = "on_day" | "3days" | "1week" | "2weeks" | "custom" | "none";
function computeReminderDate(
  deadline: string,
  offset: ReminderOffset,
  customN: number,
  customUnit: "days" | "weeks"
): string {
  if (!deadline || offset === "none") return "";
  switch (offset) {
    case "on_day":  return deadline;
    case "3days":   return addDays(deadline, -3);
    case "1week":   return addDays(deadline, -7);
    case "2weeks":  return addDays(deadline, -14);
    case "custom":  return addDays(deadline, -(customUnit === "weeks" ? customN * 7 : customN));
    default: return "";
  }
}

// ── Corner motif ──────────────────────────────────────────────────────────

const EnvelopeMotif = (
  <svg viewBox="0 0 64 64" fill="none" stroke="#3a1c14" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
    width="80" height="80" aria-hidden="true">
    <rect x="17" y="8" width="30" height="26" rx="2.5" fill="#fdfaf5" />
    <line x1="23" y1="17" x2="41" y2="17" />
    <line x1="23" y1="23" x2="37" y2="23" />
    <rect x="5" y="29" width="54" height="27" rx="3" fill="#fdfaf5" />
    <path d="M6 31 L32 46 L58 31" />
  </svg>
);

// ── Response type options (with status dots) ──────────────────────────────

const RESPONSE_OPTIONS = [
  { value: QueryStatus.QUERIED,           label: "Queried" },
  { value: QueryStatus.PARTIAL_REQUESTED, label: "Partial Requested" },
  { value: QueryStatus.FULL_REQUESTED,    label: "Full Requested" },
  { value: QueryStatus.REVISE_RESUBMIT,   label: "Revise & Resubmit" },
  { value: QueryStatus.OFFER,             label: "Offer of Representation" },
  { value: QueryStatus.REJECTED,          label: "Rejected" },
].map((o) => ({
  ...o,
  icon: <StatusCircle status={o.value} className="shrink-0" />,
}));

// ── Reminder offset options ───────────────────────────────────────────────

const REMINDER_OPTIONS = [
  { value: "on_day",  label: "On the day" },
  { value: "3days",   label: "3 days before" },
  { value: "1week",   label: "1 week before" },
  { value: "2weeks",  label: "2 weeks before" },
  { value: "custom",  label: "Custom…" },
  { value: "none",    label: "No reminder" },
];

// ── Props ─────────────────────────────────────────────────────────────────

export interface RecordResponseFocusFormProps {
  isOpen: boolean;
  onClose: () => void;
  query: Query;
  agent: Agent;
  manuscript: { title: string };
  onSuccessToast: (message: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────

export const RecordResponseFocusForm: React.FC<RecordResponseFocusFormProps> = ({
  isOpen,
  onClose,
  query,
  agent,
  manuscript,
  onSuccessToast,
}) => {
  const { currentUser } = useScriptAllyDb();

  // ── Core state ──
  const [responseType, setResponseType] = useState<QueryStatus | "">("");
  const [dateReceived, setDateReceived] = useState(todayISO());

  // Partial-specific
  const [materialsUnit, setMaterialsUnit] = useState<"Pages" | "Chapters" | "Words" | "Other">("Pages");
  const [materialsQuantity, setMaterialsQuantity] = useState("");
  const [materialsOtherText, setMaterialsOtherText] = useState("");

  // Full-specific — which draft/version of the full they're sending
  const [fullVersion, setFullVersion] = useState("");

  // R&R-specific
  const [rrNotes, setRrNotes] = useState("");

  // Rejection-specific
  const [rejectionType, setRejectionType] = useState<"Form rejection" | "Personalised">("Form rejection");
  const [rejectionNote, setRejectionNote] = useState("");

  // Offer-specific
  const [offerDeadline, setOfferDeadline] = useState("");

  // Hear-back flow (Partial / Full / R&R)
  const [agentHearBackDate, setAgentHearBackDate] = useState("");
  const [hearBackNotSpecified, setHearBackNotSpecified] = useState(false);
  const [wantOwnDeadline, setWantOwnDeadline] = useState<boolean | null>(null);
  const [ownDeadlinePreset, setOwnDeadlinePreset] = useState<"2w" | "4w" | "6w" | "8w" | "custom" | "">("");
  const [ownDeadlineCustomDate, setOwnDeadlineCustomDate] = useState("");

  // Reminder
  const [reminderOffset, setReminderOffset] = useState<ReminderOffset>("1week");
  const [customReminderN, setCustomReminderN] = useState(1);
  const [customReminderUnit, setCustomReminderUnit] = useState<"days" | "weeks">("weeks");

  // Transition
  const [confirmingBackward, setConfirmingBackward] = useState(false);
  const [subActivities, setSubActivities] = useState<Array<{ id: string; type?: string }>>([]);

  // Save
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Reset on open ──
  useEffect(() => {
    if (!isOpen) return;
    setResponseType("");
    setDateReceived(todayISO());
    setMaterialsUnit("Pages");
    setMaterialsQuantity("");
    setMaterialsOtherText("");
    setFullVersion("");
    setRrNotes("");
    setRejectionType("Form rejection");
    setRejectionNote("");
    setOfferDeadline("");
    setAgentHearBackDate("");
    setHearBackNotSpecified(false);
    setWantOwnDeadline(null);
    setOwnDeadlinePreset("");
    setOwnDeadlineCustomDate("");
    setReminderOffset("1week");
    setCustomReminderN(1);
    setCustomReminderUnit("weeks");
    setConfirmingBackward(false);
    setSaveError(null);

    // Pre-fill if current query status is one the form records as a reply (same-mode amend).
    // Queried is excluded — selecting it is always a backward reversion, never a pre-filled state.
    const qt = query.status;
    if (qt !== QueryStatus.QUERIED && RESPONSE_OPTIONS.some((o) => o.value === qt)) {
      setResponseType(qt);
      // Pre-fill type-specific fields from query doc
      if (qt === QueryStatus.PARTIAL_REQUESTED) {
        const unit = (query as any).materialsRequestedType;
        const qty  = (query as any).materialsRequestedQuantity;
        if (unit === "pages")    { setMaterialsUnit("Pages");    if (qty) setMaterialsQuantity(String(qty)); }
        if (unit === "chapters") { setMaterialsUnit("Chapters"); if (qty) setMaterialsQuantity(String(qty)); }
        if (unit === "words")    { setMaterialsUnit("Words");    if (qty) setMaterialsQuantity(String(qty)); }
        if (unit === "other")    { setMaterialsUnit("Other");    if (qty) setMaterialsOtherText(String(qty)); }
      }
      if (qt === QueryStatus.FULL_REQUESTED) {
        const v = (query as any).fullVersionSent;
        if (v) setFullVersion(String(v));
      }
      if (qt === QueryStatus.REVISE_RESUBMIT && (query as any).rrNotes) {
        setRrNotes((query as any).rrNotes);
      }
    }
    // The host remounts this component per query (key={query.id}), so a reset on each open is
    // enough — no cross-query state can survive the remount.
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch per-query subcollection activities for same/backward writes
  useEffect(() => {
    if (!isOpen || !currentUser) return;
    getDocs(collection(db, `users/${currentUser.id}/queries/${query.id}/activity`))
      .then((snap) => setSubActivities(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))))
      .catch(() => setSubActivities([]));
  }, [isOpen, currentUser, query.id]);

  if (!isOpen) return null;

  // ── Derived values ──

  // Queried is a status reversion, not a recorded reply — it hides every response-detail field.
  const isQueriedRevert = responseType === QueryStatus.QUERIED;

  const showHearBackSection =
    responseType === QueryStatus.PARTIAL_REQUESTED ||
    responseType === QueryStatus.FULL_REQUESTED ||
    responseType === QueryStatus.REVISE_RESUBMIT;

  const isExpanded = showHearBackSection && hearBackNotSpecified;

  const resolvedDeadline = (): string => {
    if (responseType === QueryStatus.OFFER) return offerDeadline;
    if (showHearBackSection) {
      if (!hearBackNotSpecified) return agentHearBackDate;
      if (wantOwnDeadline) {
        if (ownDeadlinePreset === "custom") return ownDeadlineCustomDate;
        if (ownDeadlinePreset) return addWeeks(dateReceived || todayISO(), { "2w": 2, "4w": 4, "6w": 6, "8w": 8 }[ownDeadlinePreset] ?? 0);
      }
    }
    return "";
  };

  const deadline = resolvedDeadline();
  const reminderDate = deadline ? computeReminderDate(deadline, reminderOffset, customReminderN, customReminderUnit) : "";
  const showReminderStep = !!deadline && responseType !== QueryStatus.REJECTED;

  const transitionMode: TransitionMode | null = responseType
    ? getTransitionMode(responseType as QueryStatus, query.status)
    : null;

  const buttonLabel =
    confirmingBackward ? "Confirm — move back" :
    transitionMode === "same" ? "Update response" :
    "Record response";

  const dirty = !!responseType;

  // ── Hear-back "not specified" toggle ──
  const markNotSpecified = () => {
    setHearBackNotSpecified(true);
    setAgentHearBackDate("");
  };
  const clearNotSpecified = () => {
    setHearBackNotSpecified(false);
    setWantOwnDeadline(null);
    setOwnDeadlinePreset("");
    setOwnDeadlineCustomDate("");
  };

  // ── Save handler ──
  const handleSubmit = async () => {
    if (!responseType || !currentUser) return;
    setSaveError(null);

    // Intercept backward — first press shows confirm, second press proceeds
    if (transitionMode === "backward" && !confirmingBackward) {
      setConfirmingBackward(true);
      return;
    }

    setIsSaving(true);
    try {
      const selectedStatus = responseType as QueryStatus;

      // For "same" or "backward" modes, delete the relevant existing subcollection docs first
      // so recordQueryResponse can re-write them cleanly (it always appends; we pre-clear).
      if (transitionMode === "same") {
        const matchDocs = subActivities.filter((a) => a.type === selectedStatus);
        await Promise.all(
          matchDocs.map((a) =>
            deleteDoc(doc(db, `users/${currentUser.id}/queries/${query.id}/activity/${a.id}`))
          )
        );
      }
      if (transitionMode === "backward") {
        const selRank = PIPELINE_RANK[selectedStatus] ?? 0;
        const advancedDocs = subActivities.filter(
          (a) => a.type && !TERMINAL_STATUSES.has(a.type as QueryStatus) &&
                  (PIPELINE_RANK[a.type as QueryStatus] ?? 0) > selRank
        );
        await Promise.all(
          advancedDocs.map((a) =>
            deleteDoc(doc(db, `users/${currentUser.id}/queries/${query.id}/activity/${a.id}`))
          )
        );
      }

      // Map form state to RecordResponseData
      const feedbackType =
        rejectionType === "Personalised" && rejectionNote.trim() ? "Yes" :
        rejectionType === "Personalised" ? "No" : "Form";

      const result = await recordQueryResponse(
        {
          userId: currentUser.id,
          query,
          agent,
          manuscript,
        },
        {
          responseType:
            selectedStatus === QueryStatus.QUERIED           ? "queried" :
            selectedStatus === QueryStatus.PARTIAL_REQUESTED ? "partial" :
            selectedStatus === QueryStatus.FULL_REQUESTED    ? "full" :
            selectedStatus === QueryStatus.REVISE_RESUBMIT  ? "rr" :
            selectedStatus === QueryStatus.OFFER             ? "offer" : "rejected",
          materialsType: materialsUnit,
          materialsQuantity: Number(materialsQuantity) || 0,
          materialsOtherText,
          fullVersionSent: fullVersion,
          expectedBy: deadline,
          sendReminderDate: reminderDate,
          dateReceived,
          rrNotes,
          feedbackType,
          feedbackText: rejectionNote,
          privateReflection: "",
          rejectionLesson: "",
          requeryPreference: "",
          offerDate: selectedStatus === QueryStatus.OFFER ? dateReceived : "",
          offerDeadline,
          offerNotes: "",
          closingReason: "No response after expected window",
          closingNotes: "",
        }
      );

      const successMessages: Record<string, string> = {
        [QueryStatus.QUERIED]:           "Query rolled back to Queried",
        [QueryStatus.PARTIAL_REQUESTED]: "Partial request recorded",
        [QueryStatus.FULL_REQUESTED]:    "Full request recorded",
        [QueryStatus.REVISE_RESUBMIT]:   "Revise & Resubmit recorded",
        [QueryStatus.OFFER]:             "Offer recorded — congratulations!",
        [QueryStatus.REJECTED]:          "Rejection recorded",
      };
      onSuccessToast(successMessages[selectedStatus] ?? "Response recorded");
      void result; // result.undo available for host to wire an undo toast if desired
      onClose();
    } catch (e) {
      console.error("Failed to record response:", e);
      setSaveError("Something went wrong — please try again.");
      setConfirmingBackward(false);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────

  const col1 = (
    <div>
      {/* Backward-confirm banner */}
      {confirmingBackward && (
        <div className="sa-backward-confirm">
          <p>
            This moves <strong>{manuscript.title}</strong> back from{" "}
            <strong>{query.status}</strong> to <strong>{responseType}</strong>. More advanced
            activity entries will be removed.
          </p>
          <div className="sa-backward-confirm-actions">
            <button className="sa-backward-yes" onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? "Saving…" : "Yes, move back"}
            </button>
            <button className="sa-backward-no" onClick={() => setConfirmingBackward(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Response type */}
      <label className="sa-label">Response type</label>
      <BrandDropdown
        value={responseType}
        options={RESPONSE_OPTIONS}
        onChange={(v) => {
          setResponseType(v as QueryStatus);
          setConfirmingBackward(false);
          // Reset hear-back state when type changes
          setHearBackNotSpecified(false);
          setAgentHearBackDate("");
          setWantOwnDeadline(null);
          setOwnDeadlinePreset("");
          setOwnDeadlineCustomDate("");
          setReminderOffset("1week");
        }}
        placeholder="Select response type…"
      />

      {/* ── Queried: a status reversion — no reply details to capture ── */}
      {isQueriedRevert && (
        <p className="sa-muted-note">
          This rolls the query back to Queried and removes the later response.
        </p>
      )}

      {/* Date received */}
      {!isQueriedRevert && (
        <>
          <label className="sa-label">Date received</label>
          <BrandDatePicker value={dateReceived} onChange={setDateReceived} placeholder="When their reply arrived" />
        </>
      )}

      {/* ── Partial-specific: materials requested ── */}
      {responseType === QueryStatus.PARTIAL_REQUESTED && (
        <>
          <label className="sa-label">Materials requested</label>
          <div className="sa-chip-row" style={{ marginBottom: 8 }}>
            {(["Pages", "Chapters", "Words", "Other"] as const).map((u) => (
              <button
                key={u}
                type="button"
                className={`sa-chip${materialsUnit === u ? " active" : ""}`}
                onClick={() => setMaterialsUnit(u)}
              >
                {u}
              </button>
            ))}
          </div>
          {materialsUnit === "Other" ? (
            <input
              className="sa-input"
              placeholder="e.g. synopsis + 3 chapters"
              value={materialsOtherText}
              onChange={(e) => setMaterialsOtherText(e.target.value)}
            />
          ) : (
            <input
              className="sa-input"
              type="number"
              min={1}
              placeholder="Quantity requested"
              value={materialsQuantity}
              onChange={(e) => setMaterialsQuantity(e.target.value)}
            />
          )}
        </>
      )}

      {/* ── Full-specific: which draft/version of the full is going out ── */}
      {responseType === QueryStatus.FULL_REQUESTED && (
        <>
          <label className="sa-label">Which version are you sending?</label>
          <input
            className="sa-input"
            placeholder="e.g. Draft 4 / agent submission version"
            value={fullVersion}
            onChange={(e) => setFullVersion(e.target.value)}
          />
        </>
      )}

      {/* ── R&R-specific: revision notes ── */}
      {responseType === QueryStatus.REVISE_RESUBMIT && (
        <>
          <label className="sa-label">What they'd like revised</label>
          <textarea
            className="sa-input sa-textarea"
            value={rrNotes}
            onChange={(e) => setRrNotes(e.target.value)}
            placeholder="e.g. Deepen the second-act stakes, trim the prologue…"
          />
        </>
      )}

      {/* ── Offer-specific: respond-by deadline ── */}
      {responseType === QueryStatus.OFFER && (
        <>
          <p className="sa-muted-note">
            Congratulations! Let's record a couple of key details and then we'll move on to what happens next.
          </p>
          <label className="sa-label">Respond to the offer by</label>
          <BrandDatePicker value={offerDeadline} onChange={setOfferDeadline} placeholder="Most agents give 2–4 weeks" />
        </>
      )}

      {/* ── Rejection-specific: type + note ── */}
      {responseType === QueryStatus.REJECTED && (
        <>
          <p className="sa-muted-note">
            It wasn't meant to be. Don't worry, rejections are part of the journey. Learn from it and we'll keep going.
          </p>
          <label className="sa-label">Rejection type</label>
          <BrandDropdown
            value={rejectionType}
            options={[
              { value: "Form rejection", label: "Form rejection" },
              { value: "Personalised",   label: "Personalised" },
            ]}
            onChange={(v) => setRejectionType(v as "Form rejection" | "Personalised")}
          />
          <label className="sa-label">Note (optional)</label>
          <textarea
            className="sa-input sa-textarea"
            value={rejectionNote}
            onChange={(e) => setRejectionNote(e.target.value)}
            placeholder="Any feedback or context worth recording…"
          />
        </>
      )}

      {/* ── Hear-back section (Partial / Full / R&R) ── */}
      {showHearBackSection && (
        <>
          <label className="sa-label">When does the agent expect to hear back by?</label>

          {hearBackNotSpecified ? (
            <div className="sa-notspec-badge">
              <span>Not specified</span>
              <button type="button" onClick={clearNotSpecified} aria-label="Clear">×</button>
            </div>
          ) : (
            <>
              <BrandDatePicker
                value={agentHearBackDate}
                onChange={setAgentHearBackDate}
                placeholder="Agent's expected date"
              />
              <button type="button" className="sa-notspec-link" onClick={markNotSpecified}>
                Not specified
              </button>
            </>
          )}
        </>
      )}

      {/* ── Reminder step — inline when a deadline exists and NOT expanded ── */}
      {showReminderStep && !isExpanded && (
        <>
          <label className="sa-label">Remind me</label>
          <BrandDropdown
            value={reminderOffset}
            options={REMINDER_OPTIONS}
            onChange={(v) => setReminderOffset(v as ReminderOffset)}
          />
          {reminderOffset === "custom" && (
            <div className="flex items-center gap-2 mb-3.5">
              <input
                type="number"
                min={1}
                className="sa-input"
                style={{ width: 68, marginBottom: 0, textAlign: "center" }}
                value={customReminderN}
                onChange={(e) => setCustomReminderN(Math.max(1, parseInt(e.target.value) || 1))}
              />
              <BrandDropdown
                value={customReminderUnit}
                options={[
                  { value: "days",  label: "days before" },
                  { value: "weeks", label: "weeks before" },
                ]}
                onChange={(v) => setCustomReminderUnit(v as "days" | "weeks")}
              />
            </div>
          )}
          {reminderDate && reminderOffset !== "none" && (
            <p className="sa-quiet-note">Reminder set for <strong>{fmtLong(reminderDate)}</strong></p>
          )}
        </>
      )}

      {saveError && <div className="sa-error">{saveError}</div>}
    </div>
  );

  const col2 = isExpanded ? (
    <div>
      <div className="sa-col2-head">Following up</div>
      <p className="sa-quiet-note">No agent date is set. Would you like to set your own response deadline?</p>
      <div className="sa-yn-row">
        <button
          type="button"
          className={`sa-yn-btn yes${wantOwnDeadline === true ? " active" : ""}`}
          onClick={() => setWantOwnDeadline(true)}
        >
          Yes
        </button>
        <button
          type="button"
          className={`sa-yn-btn no${wantOwnDeadline === false ? " active" : ""}`}
          onClick={() => { setWantOwnDeadline(false); setOwnDeadlinePreset(""); setOwnDeadlineCustomDate(""); }}
        >
          No
        </button>
      </div>

      {wantOwnDeadline === false && (
        <p className="sa-muted-note">No reminder will be set for this query.</p>
      )}

      {wantOwnDeadline === true && (
        <>
          <label className="sa-label">Set a deadline</label>
          <div className="sa-chip-row">
            {(["2w", "4w", "6w", "8w"] as const).map((p) => {
              const weeks = { "2w": 2, "4w": 4, "6w": 6, "8w": 8 }[p];
              return (
                <button
                  key={p}
                  type="button"
                  className={`sa-chip${ownDeadlinePreset === p ? " active" : ""}`}
                  onClick={() => { setOwnDeadlinePreset(p); setOwnDeadlineCustomDate(""); }}
                >
                  In {weeks} weeks
                </button>
              );
            })}
            <button
              type="button"
              className={`sa-chip${ownDeadlinePreset === "custom" ? " active" : ""}`}
              onClick={() => setOwnDeadlinePreset("custom")}
            >
              Pick a date
            </button>
          </div>

          {ownDeadlinePreset === "custom" && (
            <BrandDatePicker
              value={ownDeadlineCustomDate}
              onChange={setOwnDeadlineCustomDate}
              placeholder="Choose your deadline"
            />
          )}

          {ownDeadlinePreset && ownDeadlinePreset !== "custom" && (
            <p className="sa-quiet-note">
              Deadline: <strong>{fmtLong(addWeeks(dateReceived || todayISO(), { "2w": 2, "4w": 4, "6w": 6, "8w": 8 }[ownDeadlinePreset] ?? 0))}</strong>
            </p>
          )}

          {/* Reminder step in column 2 */}
          {showReminderStep && (
            <>
              <label className="sa-label">Remind me</label>
              <BrandDropdown
                value={reminderOffset}
                options={REMINDER_OPTIONS}
                onChange={(v) => setReminderOffset(v as ReminderOffset)}
              />
              {reminderOffset === "custom" && (
                <div className="flex items-center gap-2 mb-3.5">
                  <input
                    type="number"
                    min={1}
                    className="sa-input"
                    style={{ width: 68, marginBottom: 0, textAlign: "center" }}
                    value={customReminderN}
                    onChange={(e) => setCustomReminderN(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                  <BrandDropdown
                    value={customReminderUnit}
                    options={[
                      { value: "days",  label: "days before" },
                      { value: "weeks", label: "weeks before" },
                    ]}
                    onChange={(v) => setCustomReminderUnit(v as "days" | "weeks")}
                  />
                </div>
              )}
              {reminderDate && reminderOffset !== "none" && (
                <p className="sa-quiet-note">Reminder set for <strong>{fmtLong(reminderDate)}</strong></p>
              )}
            </>
          )}
        </>
      )}
    </div>
  ) : null;

  return (
    <FormShell
      preLabel="Recording a response from"
      name={agent.name}
      subLine={agent.agency || "Independent agent"}
      cornerMotif={EnvelopeMotif}
      buttonLabel={confirmingBackward ? "Confirm — move back" : buttonLabel}
      onSubmit={confirmingBackward ? undefined : handleSubmit}
      submitDisabled={!responseType || isSaving || confirmingBackward}
      submitting={isSaving}
      onClose={onClose}
      dirty={dirty}
      containerStyle={isExpanded ? { maxWidth: 704 } : undefined}
    >
      {isExpanded ? (
        <div className="sa-two-col">
          {col1}
          {col2}
        </div>
      ) : (
        col1
      )}
    </FormShell>
  );
};

