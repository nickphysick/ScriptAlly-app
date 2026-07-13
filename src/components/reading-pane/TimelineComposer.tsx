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
import { queryBucket } from "../../lib/queryAmbient";
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
  o: { date: string; note: string; method: string; expectedBy: string }
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
    closingReason: "No response after expected window",
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
}

const METHOD_OPTIONS: SubmissionMethod[] = [
  SubmissionMethod.EMAIL,
  SubmissionMethod.ONLINE_FORM,
  SubmissionMethod.QUERY_MANAGER,
  SubmissionMethod.POST,
];

export const TimelineComposer = React.forwardRef<TimelineComposerHandle, TimelineComposerProps>(
  ({ query, agent, manuscript, onOpenRichForm, onMarkSent }, ref) => {
    const { currentUser, editActivity } = useScriptAllyDb();
    const { showToast } = useToast();
    const rootRef = useRef<HTMLDivElement>(null);
    const firstChipRef = useRef<HTMLButtonElement>(null);

    const status = query.status as QueryStatus;
    const sentISO = isoOf(query.dateSent);

    // The close chip is OFFERED (never fired) only when the agent's policy is "no response means no"
    // (6c) AND their stated window has passed. Replies-either-way / not-stated never surface it —
    // the app has done the thinking; the user still commits. It never auto-closes anything.
    const canCloseNoResponse = useMemo(() => {
      if (queryBucket(status) !== "waiting") return false;
      if (agent.noResponseMeansNo !== true) return false;
      const deadline = toMs((query as any).responseDeadline);
      return Number.isFinite(deadline) && Date.now() > deadline;
    }, [status, query, agent.noResponseMeansNo]);

    const model = useMemo(() => composerChips(status, { canCloseNoResponse }), [status, canCloseNoResponse]);

    const [openChip, setOpenChip] = useState<ComposerChip | null>(null);
    const [editing, setEditing] = useState<ComposerEditEntry | null>(null);
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
        const result = await recordQueryResponse(
          { userId: currentUser.id, query, agent, manuscript },
          rt === "queried" && chip.action.kind === "reopen"
            ? quickData("queried", { date: todayISO(), note: "", method: "", expectedBy: "" })
            : quickData(rt, { date, note, method, expectedBy })
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
          <div className="tc-chips">
            {model.chips.map((c, i) => (
              <button
                key={c.key}
                ref={i === 0 ? firstChipRef : undefined}
                type="button"
                className={`tc-chip tc-${c.tone}`}
                onClick={() => onChip(c)}
              >
                <StatusDot status={c.dotStatus} overrideSize={15} decorative />
                {c.label}
              </button>
            ))}
          </div>
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
