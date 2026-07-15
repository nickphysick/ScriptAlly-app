/**
 * TimelineComposer — the "What happened next?" composer pinned at the foot of the Tracking card
 * (interaction layer, Stage 5a). Chips come from composerChips() (built on the CTA engine, so it
 * can't disagree with the "Your move" panel). Friction scales with rarity:
 *
 *  - Common outcomes (Rejection · Partial/Full requested · No-response-close) → an INLINE row
 *    (when · how · note; + a DEFAULTED expected-by on the two requests, seeded from the agent's
 *    response window — it drives the waiting bar / overdue filter / close chip). Records through
 *    recordQueryResponse (the single write path) and shows an undo toast wired to the closure that
 *    call returns (deletes the record — never a compensating append).
 *  - Offer · Revise & Resubmit (detail IS the point) → open the rich RecordResponseFocusForm via
 *    onOpenRichForm (the additive initialResponseType seam). Never crammed inline.
 *  - Mark-sent (writer owes materials) → onMarkSent opens the existing MarkSentPopover.
 *  - Every inline row keeps an "Add more detail" link → the same rich form, pre-filled with what
 *    was just captured. Nothing recordable is ever lost.
 *
 * It NEVER auto-writes and NEVER auto-closes: the No-response chip only appears once the agent's
 * stated window has passed, and even then the user commits it.
 */
import React, { useImperativeHandle, useMemo, useRef, useState } from "react";
import { Agent, Query, QueryStatus, SubmissionMethod } from "../../types";
import { composerChips, type ComposerChip } from "../../lib/composerChips";
import { queryBucket, queryAmbientStatus, deriveEscalation, suggestedAction, type SuggestedAction } from "../../lib/queryAmbient";
import { getPrimaryAction } from "../../lib/queryPrimaryAction";
import { StatusDot } from "../StatusDot";
import { recordQueryResponse, type RecordResponseData } from "../../lib/recordResponse";
import { useScriptAllyDb } from "../../lib/db";
import { useToast } from "../toast/ToastProvider";
import "./timelineComposer.css";

const todayISO = () => new Date().toISOString().slice(0, 10);
const toMs = (v: any): number => {
  if (!v) return NaN;
  if (typeof v === "object" && typeof v.toDate === "function") return v.toDate().getTime();
  if (typeof v === "object" && typeof v.seconds === "number") return v.seconds * 1000;
  return new Date(v).getTime();
};
const isoOf = (v: any): string => {
  const ms = toMs(v);
  return Number.isNaN(ms) ? "" : new Date(ms).toISOString().slice(0, 10);
};
const addDaysISO = (iso: string, days: number) => {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

/** The inline row records a minimal RecordResponseData — the SAME shape RecordResponseFocusForm
 *  builds, with sensible defaults for the fields the quick path doesn't ask for. */
function quickData(
  responseType: RecordResponseData["responseType"],
  o: { date: string; note: string; method: string; expectedBy: string; closingReason?: RecordResponseData["closingReason"] }
): RecordResponseData {
  const feedbackText = [o.note.trim(), o.method ? `Received via ${o.method}` : ""].filter(Boolean).join(o.note.trim() ? " · " : "");
  return {
    responseType,
    materialsType: "Pages",
    materialsQuantity: 0,
    materialsOtherText: "",
    fullVersionSent: "",
    expectedBy: o.expectedBy || "",
    sendReminderDate: "",
    dateReceived: o.date,
    rrNotes: "",
    feedbackType: o.note.trim() ? "Yes" : "Form",
    feedbackText,
    privateReflection: "",
    rejectionLesson: "",
    requeryPreference: "",
    offerDate: "",
    offerDeadline: "",
    offerNotes: "",
    closingReason: o.closingReason ?? "No response after expected window",
    closingNotes: "",
  };
}

export interface ComposerEditEntry { activityId: string; status: QueryStatus; label: string; dateISO: string; note: string; }
export interface TimelineComposerHandle {
  focus: () => void;
  /** Open the composer in correct-in-place edit mode for an existing timeline entry (5b). */
  startEdit: (entry: ComposerEditEntry) => void;
}

export interface TimelineComposerProps {
  query: Query;
  agent: Agent;
  manuscript: { title: string };
  /** Open the rich form pre-set to a response type (Offer / R&R, and "Add more detail"). */
  onOpenRichForm: (responseType: QueryStatus, draft?: { dateReceived?: string; note?: string }) => void;
  /** Open the existing MarkSentPopover (writer's-turn mark-sent chips). */
  onMarkSent: () => void;
  /** TWS P3 — fire the nudge + reminder flow (the nudge fork chip; not a status change). */
  onNudge?: () => void;
}

const METHOD_OPTIONS: SubmissionMethod[] = [
  SubmissionMethod.EMAIL,
  SubmissionMethod.ONLINE_FORM,
  SubmissionMethod.QUERY_MANAGER,
  SubmissionMethod.POST,
];

export const TimelineComposer = React.forwardRef<TimelineComposerHandle, TimelineComposerProps>(
  ({ query, agent, manuscript, onOpenRichForm, onMarkSent, onNudge }, ref) => {
    const { currentUser, editActivity } = useScriptAllyDb();
    const { showToast } = useToast();
    const rootRef = useRef<HTMLDivElement>(null);
    const firstChipRef = useRef<HTMLButtonElement>(null);

    const status = query.status as QueryStatus;
    const sentISO = isoOf(query.dateSent);

    // The give-up "Close query" chip is OFFERED (never fired) in overdue/grace + your-move; and exactly
    // ONE chip may be the SUGGESTED action (pulse), chosen by rule from the same escalation the readout
    // reads — overdue→nudge, hugely overdue→close, grace/within→none. Nothing stored; can't disagree.
    const reminderMs = query.nudgeDate ? toMs(query.nudgeDate) : null;
    const { canClose, suggested } = useMemo<{ canClose: boolean; suggested: SuggestedAction }>(() => {
      const bucket = queryBucket(status);
      if (bucket === "move") return { canClose: true, suggested: null };
      if (bucket !== "waiting") return { canClose: false, suggested: null };
      const pa = getPrimaryAction(status);
      const ambient = queryAmbientStatus(query, pa.kind === "record" ? pa.ballHolder : "writer", pa.kind === "mark-sent" ? pa.markKind : undefined);
      const escal = deriveEscalation(ambient, {
        reminderMs: Number.isFinite(reminderMs as number) ? (reminderMs as number) : null,
        lastNudgeMs: query.lastNudgeSentDate ? toMs(query.lastNudgeSentDate) : null,
        now: Date.now(),
      });
      return { canClose: escal === "overdue" || escal === "grace", suggested: suggestedAction(escal, ambient.daysOverdue, agent.responseTimeWeeks) };
    }, [status, query, reminderMs, agent.responseTimeWeeks]);
    // "Nudge again" once a future follow-up reminder is already set (you're chasing, not first-nudging).
    const hasFutureReminder = Number.isFinite(reminderMs as number) && (reminderMs as number) > Date.now();

    const model = useMemo(() => composerChips(status, { canClose, hasFutureReminder }), [status, canClose, hasFutureReminder]);

    const [openChip, setOpenChip] = useState<ComposerChip | null>(null);
    const [editing, setEditing] = useState<ComposerEditEntry | null>(null);
    const [showOther, setShowOther] = useState(false); // TWS P3 — the "Other…" expander
    const [date, setDate] = useState(todayISO());
    const [method, setMethod] = useState<string>(agent.submissionMethod || "");
    const [note, setNote] = useState("");
    const [expectedBy, setExpectedBy] = useState("");
    const [saving, setSaving] = useState(false);

    // The CTA button in the command bar scrolls here + focuses the first chip (one flow, two doors);
    // the timeline ⋯ → Edit opens this same surface in correct-in-place mode (5b).
    useImperativeHandle(ref, () => ({
      focus: () => {
        rootRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        firstChipRef.current?.focus();
      },
      startEdit: (entry) => {
        setOpenChip(null);
        setDate(entry.dateISO || todayISO());
        setMethod("");
        setNote(entry.note || "");
        setExpectedBy("");
        setEditing(entry);
        rootRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      },
    }));

    const closeForm = () => { setOpenChip(null); setEditing(null); };

    const onChip = (chip: ComposerChip) => {
      const a = chip.action;
      if (a.kind === "nudge") { onNudge?.(); return; } // fires the nudge flow, never a status change
      if (a.kind === "mark-sent") { onMarkSent(); return; }
      if (a.kind === "record" && (a.responseType === "offer" || a.responseType === "rr")) {
        onOpenRichForm(a.responseType === "offer" ? QueryStatus.OFFER : QueryStatus.REVISE_RESUBMIT);
        return;
      }
      if (a.kind === "reopen") {
        void record("queried", chip);
        return;
      }
      // inline row (rejected / partial / full / close)
      const today = todayISO();
      setDate(today);
      setMethod(agent.submissionMethod || "");
      setNote("");
      // default the expected-by on the two requests, from the agent's stated window
      const isRequest = a.kind === "record" && (a.responseType === "partial" || a.responseType === "full");
      setExpectedBy(isRequest && agent.responseTimeWeeks ? addDaysISO(today, agent.responseTimeWeeks * 7) : "");
      setOpenChip(chip);
    };

    // Date validation — never in the future, never before the query was sent.
    const dateError =
      !date ? "Pick a date."
      : date > todayISO() ? "That’s in the future — you can only record things that have happened."
      : sentISO && date < sentISO ? `This is before you sent the query (${sentISO}). Check the date.`
      : "";

    const responseTypeOf = (chip: ComposerChip): RecordResponseData["responseType"] => {
      const a = chip.action;
      if (a.kind === "close") return "close";
      if (a.kind === "record") return a.responseType;
      return "queried"; // reopen
    };

    async function record(rt: RecordResponseData["responseType"], chip: ComposerChip) {
      if (!currentUser || saving) return;
      setSaving(true);
      try {
        // Close query — pick the reason by whose court it's in: your-move = the writer withdrawing
        // (→ Withdrawn), waiting overdue/grace = no reply in the window (→ No response). TR P5.
        const closingReason: RecordResponseData["closingReason"] | undefined =
          rt === "close" ? (queryBucket(status) === "move" ? "Withdrew my submission" : "No response after expected window") : undefined;
        const result = await recordQueryResponse(
          { userId: currentUser.id, query, agent, manuscript },
          rt === "queried" && chip.action.kind === "reopen"
            ? quickData("queried", { date: todayISO(), note: "", method: "", expectedBy: "" })
            : quickData(rt, { date, note, method, expectedBy, closingReason })
        );
        closeForm();
        showToast({ message: `Logged — ${chip.label.toLowerCase()}`, undo: () => result.undo() });
      } catch {
        showToast({ message: "Couldn’t save that — please try again." });
      } finally {
        setSaving(false);
      }
    }

    // 5b — correct an existing entry in place (editActivity patches date + note; never a new record).
    async function saveEdit() {
      if (!currentUser || !editing || saving) return;
      setSaving(true);
      try {
        await editActivity(query.id, editing.activityId, { date, description: note });
        closeForm();
        showToast({ message: "Entry updated" });
      } catch {
        showToast({ message: "Couldn’t update that — please try again." });
      } finally {
        setSaving(false);
      }
    }

    const save = () => {
      if (dateError) return;
      if (editing) { void saveEdit(); return; }
      if (!openChip) return;
      void record(responseTypeOf(openChip), openChip);
    };

    const formOpen = !!(openChip || editing);
    const formTitle = editing ? `Edit — ${editing.label}` : openChip?.label ?? "";
    const showExpectedBy = !editing && openChip?.action.kind === "record" && (openChip.action.responseType === "partial" || openChip.action.responseType === "full");

    return (
      <div className="tc-root" ref={rootRef}>
        <div className="tc-q">{model.question}</div>
        {!formOpen ? (
          <>
            <div className="tc-chips">
              {model.chips.map((c, i) => {
                // Exactly one chip pulses — the derived suggested action (nudge / close), or none.
                const isSuggested = !!suggested && c.action.kind === suggested;
                return (
                  <button
                    key={c.key}
                    ref={i === 0 ? firstChipRef : undefined}
                    type="button"
                    className={`tc-chip tc-${c.tone}${isSuggested ? " tc-suggested" : ""}`}
                    title={isSuggested ? "Suggested next step" : undefined}
                    onClick={() => onChip(c)}
                  >
                    {c.tone === "close"
                      ? <span className="tc-x" aria-hidden="true">×</span>
                      : <StatusDot status={c.dotStatus} overrideSize={15} decorative />}
                    {c.label}
                  </button>
                );
              })}
            </div>
            {model.otherChips.length > 0 && (
              /* TWS P3 — implausible-from-here steps tucked behind an expander. */
              <div className="tc-other">
                <button type="button" className="tc-othertoggle" aria-expanded={showOther} onClick={() => setShowOther((o) => !o)}>
                  {showOther ? "Less" : "Other…"}
                </button>
                {showOther && (
                  <div className="tc-chips tc-otherchips">
                    {model.otherChips.map((c) => (
                      <button key={c.key} type="button" className={`tc-chip tc-${c.tone}`} onClick={() => onChip(c)}>
                        {c.tone === "close"
                          ? <span className="tc-x" aria-hidden="true">×</span>
                          : <StatusDot status={c.dotStatus} overrideSize={15} decorative />}
                        {c.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="tc-form" role="group" aria-label={formTitle}>
            <div className="tc-fh">{formTitle}</div>
            <div className="tc-frow">
              <label className="tc-field">
                <span className="tc-lb">When</span>
                <input type="date" value={date} min={sentISO || undefined} max={todayISO()} onChange={(e) => setDate(e.target.value)} className={dateError ? "tc-bad" : ""} />
              </label>
              <label className="tc-field">
                <span className="tc-lb">How</span>
                <select value={method} onChange={(e) => setMethod(e.target.value)}>
                  <option value="">—</option>
                  {METHOD_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </label>
            </div>
            {showExpectedBy && (
              <label className="tc-field tc-full">
                <span className="tc-lb">Expected reply by <span className="tc-hint">— from their usual turnaround</span></span>
                <input type="date" value={expectedBy} min={date || undefined} onChange={(e) => setExpectedBy(e.target.value)} />
              </label>
            )}
            {dateError && <div className="tc-err">⚠ {dateError}</div>}
            <label className="tc-field tc-full">
              <span className="tc-lb">Note (optional)</span>
              <textarea value={note} placeholder="Anything they said worth keeping…" onChange={(e) => setNote(e.target.value)} />
            </label>
            <div className="tc-fa">
              <button type="button" className="tc-save" disabled={!!dateError || saving} onClick={save}>{saving ? "Saving…" : "Save"}</button>
              <button type="button" className="tc-cancel" onClick={closeForm}>Cancel</button>
              {!editing && openChip && (
                <button
                  type="button"
                  className="tc-detail"
                  onClick={() => { const rt = statusForChip(openChip); if (rt) onOpenRichForm(rt, { dateReceived: date, note }); }}
                >
                  Add more detail
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
);
TimelineComposer.displayName = "TimelineComposer";

/** The QueryStatus a chip's response maps to — for the "Add more detail" hand-off to the rich form. */
function statusForChip(chip: ComposerChip): QueryStatus | null {
  const a = chip.action;
  if (a.kind !== "record") return a.kind === "close" ? QueryStatus.NO_RESPONSE : null;
  switch (a.responseType) {
    case "partial": return QueryStatus.PARTIAL_REQUESTED;
    case "full": return QueryStatus.FULL_REQUESTED;
    case "rr": return QueryStatus.REVISE_RESUBMIT;
    case "offer": return QueryStatus.OFFER;
    case "rejected": return QueryStatus.REJECTED;
  }
}
