import React, { useState } from "react";
import {
  FileText,
  Files,
  Pencil,
  Trophy,
  X,
  Clock,
  Send,
  List,
  Type,
  MoreHorizontal,
  Bell,
  ArrowRight,
} from "lucide-react";
import { Query, QueryStatus, SubmissionMethod, QueryMaterial } from "../types";
import { StatusPill } from "./StatusPill";
import { formatQueryMaterial } from "../lib/materials";
import { FormShell, BrandDatePicker } from "./forms";

export interface RecordResponseModalProps {
  isOpen: boolean;
  onClose: () => void;
  query: Query;
  agent: { name: string; agency: string; responseTimeWeeks: number; submissionMethod: string };
  manuscript: { title: string };
  materialsOriginallySent: (string | QueryMaterial)[];
  onSave: (data: {
    responseType: "partial" | "full" | "rr" | "offer" | "rejected" | "close";
    materialsType: "Pages" | "Words" | "Chapters" | "Other";
    materialsQuantity: number;
    materialsOtherText: string;
    expectedBy: string;
    sendReminderDate: string;
    dateReceived: string;
    rrNotes: string;
    feedbackType: "Yes" | "No" | "Form";
    feedbackText: string;
    privateReflection: string;
    rejectionLesson: string;
    requeryPreference: "yes" | "maybe" | "no" | "";
    offerDate: string;
    offerDeadline: string;
    offerNotes: string;
    closingReason: "No response after expected window" | "Withdrew my submission" | "Agent no longer accepting queries" | "Other";
    closingNotes: string;
  }) => Promise<void>;
  onNavigate?: (tab: string, subPageName?: string) => void;
}

const today = () => new Date().toISOString().split("T")[0];

/** Static line-art envelope — the corner motif for the response form. Swappable for a Lottie later. */
const EnvelopeMotif = (
  <svg width="84" height="84" viewBox="0 0 84 84" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="13" y="25" width="58" height="40" rx="4" stroke="#7c3a2a" strokeWidth="1.5" fill="#fdfaf5" />
    <path d="M13.5 29 L42 48 L70.5 29" stroke="#7c3a2a" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M14 61 L33 45 M70 61 L51 45" stroke="#7c3a2a" strokeWidth="1.2" opacity="0.45" strokeLinecap="round" />
  </svg>
);

export const RecordResponseModal: React.FC<RecordResponseModalProps> = ({
  isOpen,
  onClose,
  query,
  agent,
  manuscript,
  materialsOriginallySent,
  onSave,
  onNavigate,
}) => {
  // Steps: 1 Context · 2 Type · 3 Branch form · 4 Confirm
  const [step, setStep] = useState<number>(1);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [responseType, setResponseType] = useState<"partial" | "full" | "rr" | "offer" | "rejected" | "close" | null>(null);

  // Pages requested (partial / full)
  const [materialsType, setMaterialsType] = useState<"Pages" | "Words" | "Chapters" | "Other">("Pages");
  const [materialsQuantity, setMaterialsQuantity] = useState<number>(50);
  const [materialsOtherText, setMaterialsOtherText] = useState<string>("");
  const [expectedBy, setExpectedBy] = useState<string>("");
  const [sendReminderDate, setSendReminderDate] = useState<string>("");

  // #4 — when the response actually arrived (partial / full / rejected). Defaults today, editable.
  const [dateReceived, setDateReceived] = useState<string>(today);

  // #2 — Revise & Resubmit: the agent's revision guidance.
  const [rrNotes, setRrNotes] = useState<string>("");

  // Rejection
  const [feedbackType, setFeedbackType] = useState<"Yes" | "No" | "Form">("Form");
  const [feedbackText, setFeedbackText] = useState<string>("");
  const [privateReflection, setPrivateReflection] = useState<string>("");
  const [rejectionLesson, setRejectionLesson] = useState<string>("");
  const [requeryPreference, setRequeryPreference] = useState<"yes" | "maybe" | "no" | "">("");

  // Offer
  const [offerDate, setOfferDate] = useState<string>(today);
  const [offerDeadline, setOfferDeadline] = useState<string>("");
  const [offerNotes, setOfferNotes] = useState<string>("");

  // Closing
  const [closingReason, setClosingReason] = useState<
    "No response after expected window" | "Withdrew my submission" | "Agent no longer accepting queries" | "Other"
  >("No response after expected window");
  const [closingNotes, setClosingNotes] = useState<string>("");

  if (!isOpen) return null;

  const calculateDaysWithAgent = () => {
    if (!query.dateSent) return 0;
    const diff = Math.abs(Date.now() - new Date(query.dateSent).getTime());
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const fmt = (dateStr: string, fallback = "Not specified") => {
    if (!dateStr) return fallback;
    return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  // ── SAVE PATH — unchanged shared write. Gains dateReceived (#4) + rrNotes (#2) in the payload;
  //    the 3 hosts forward `data` verbatim to recordQueryResponse. ──
  const handleSaveAndDone = async () => {
    setSaveError(null);
    try {
      setIsSaving(true);
      await onSave({
        responseType: responseType!,
        materialsType,
        materialsQuantity,
        materialsOtherText,
        expectedBy,
        sendReminderDate,
        dateReceived,
        rrNotes,
        feedbackType,
        feedbackText,
        privateReflection,
        rejectionLesson,
        requeryPreference,
        offerDate,
        offerDeadline,
        offerNotes,
        closingReason,
        closingNotes,
      });
      onClose();
    } catch (e) {
      console.error("Failed to save response:", e);
      setSaveError("Something went wrong — please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const responseTypeLabel = () =>
    ({ partial: "Partial requested", full: "Full requested", rr: "Revise & resubmit", offer: "Offer of representation", rejected: "Rejected", close: "No response / closing" }[
      responseType || "partial"
    ] || "");

  const confirmStatusEnum = (): QueryStatus => {
    if (responseType === "partial") return QueryStatus.PARTIAL_REQUESTED;
    if (responseType === "full") return QueryStatus.FULL_REQUESTED;
    if (responseType === "rr") return QueryStatus.REVISE_RESUBMIT;
    if (responseType === "offer") return QueryStatus.OFFER;
    if (responseType === "rejected") return QueryStatus.REJECTED;
    if (responseType === "close") return closingReason === "Withdrew my submission" ? QueryStatus.WITHDRAWN : QueryStatus.NO_RESPONSE;
    return QueryStatus.QUERIED;
  };

  // Materials originally sent — routed through the single #2 formatter (no second formatter).
  const materialsString =
    materialsOriginallySent && materialsOriginallySent.length > 0
      ? materialsOriginallySent.map(formatQueryMaterial).join(", ")
      : "Query Letter";

  // Per-step forward action + button label.
  const stepConfig = (): { label: string; advance: () => void; disabled: boolean } => {
    if (step === 1) return { label: "Record their response →", advance: () => setStep(2), disabled: false };
    if (step === 2) return { label: "Continue →", advance: () => responseType && setStep(3), disabled: !responseType };
    if (step === 3) {
      const label =
        responseType === "offer" ? "Record this offer →" :
        responseType === "rejected" ? "Record and close →" :
        responseType === "close" ? "Close this query →" : "Continue →";
      return { label, advance: () => setStep(4), disabled: false };
    }
    return { label: "Done", advance: () => void handleSaveAndDone(), disabled: isSaving };
  };
  const cfg = stepConfig();

  // The form holds real work once a response type is chosen — gates the discard confirm.
  const dirty = responseType !== null;

  const cardSelect = (active: boolean, accent = "#7c3d3d", activeBg = "#FFF0F0") => ({
    borderColor: active ? accent : "#e8d5cc",
    backgroundColor: active ? activeBg : "#ffffff",
  });

  return (
    <FormShell
      preLabel="Recording a response"
      name={agent.name}
      subLine={agent.agency || "Independent agent"}
      cornerMotif={EnvelopeMotif}
      buttonLabel={cfg.label}
      onSubmit={cfg.advance}
      submitDisabled={cfg.disabled}
      submitting={step === 4 && isSaving}
      onClose={onClose}
      dirty={dirty}
    >
      {step > 1 && (
        <button type="button" className="sa-back" onClick={() => setStep(step - 1)}>
          ← Back
        </button>
      )}

      {/* STEP 1 — CONTEXT */}
      {step === 1 && (
        <div>
          <div className="sa-step-cap">A response has arrived</div>
          <p className="text-xs text-[#a08070] leading-relaxed mb-3 font-sans">
            Take a moment — this is what those weeks of waiting were for. Let's record exactly what happened.
          </p>
          <div className="bg-[#fdf8f6] border-[0.5px] border-[#e8d5cc] rounded-[10px] p-[12px_14px] flex justify-between items-center mb-3">
            <div className="flex flex-col text-left">
              <span className="font-serif text-[14px] font-bold text-[#3a1c14] leading-snug">{agent.name}</span>
              <span className="text-[11px] text-[#a08070] leading-tight mt-0.5">{agent.agency || "Independent Agent"}</span>
              <span className="text-[11px] italic text-[#7c3d3d] mt-1 font-medium leading-tight">{manuscript.title}</span>
            </div>
            <div className="flex flex-col items-end shrink-0">
              <span className="font-serif text-[18px] font-semibold text-[#3a1c14] leading-none mb-0.5">{calculateDaysWithAgent()}</span>
              <span className="text-[11px] text-[#c9a89e] leading-none font-medium">days with agent</span>
            </div>
          </div>
          <div className="bg-[#fdf8f6] rounded-md p-2 flex items-center gap-2.5">
            <Send className="w-3.5 h-3.5 text-[#c9a89e] shrink-0" />
            <span className="text-[11px] text-[#6a5045] leading-normal font-sans">
              Queried via <span className="font-semibold">{query.sendMethod || agent.submissionMethod || "Email"}</span> on{" "}
              <span className="font-semibold">{fmt(query.dateSent)}</span> · <span className="text-stone-500 font-medium">{materialsString}</span>
            </span>
          </div>
        </div>
      )}

      {/* STEP 2 — RESPONSE TYPE */}
      {step === 2 && (
        <div>
          <div className="sa-step-cap">Step 1 of 3</div>
          <h3 className="font-serif text-lg font-bold text-[#3a1c14] leading-tight mb-1">What did {agent.name} say?</h3>
          <p className="text-xs text-[#a08070] leading-snug mb-3">Choose the response that best describes what you heard.</p>
          <div className="grid grid-cols-2 gap-2">
            {([
              { val: "partial", icon: <FileText className="w-4 h-4 text-[#7c3a2a] shrink-0" />, title: "Partial requested", desc: "They want the first portion of your manuscript." },
              { val: "full", icon: <Files className="w-4 h-4 text-[#7c3a2a] shrink-0" />, title: "Full requested", desc: "They want to read the entire manuscript." },
              { val: "rr", icon: <Pencil className="w-3.5 h-3.5 text-[#7c3a2a] shrink-0" />, title: "Revise & resubmit", desc: "They like it with changes — and want to see it again." },
              { val: "offer", icon: <Trophy className="w-3.5 h-3.5 text-[#6b0f1a] shrink-0" />, title: "Offer of representation", desc: "They want to represent you and your book.", accent: "#6b0f1a", activeBg: "#fff5f5" },
              { val: "rejected", icon: <X className="w-3.5 h-3.5 text-stone-600 shrink-0" />, title: "Rejected", desc: "They passed on this query. It happens to everyone.", accent: "#b0b0b0", activeBg: "#f8f8f8" },
              { val: "close", icon: <Clock className="w-3.5 h-3.5 text-[#7c3a2a] shrink-0" />, title: "No response / closing", desc: "You're closing this query without a formal reply." },
            ] as const).map((c) => (
              <div
                key={c.val}
                onClick={() => setResponseType(c.val)}
                style={cardSelect(responseType === c.val, (c as any).accent, (c as any).activeBg)}
                className="border rounded-xl p-[11px_12px] flex flex-col text-left cursor-pointer transition-all hover:border-[#c9a89e]"
              >
                <div className="flex items-center gap-2 mb-1 text-[#3a1c14]">
                  {c.icon}
                  <span className="text-xs font-bold leading-tight">{c.title}</span>
                </div>
                <p className="text-[10px] text-[#a08070] leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 3a — PARTIAL / FULL */}
      {step === 3 && (responseType === "partial" || responseType === "full") && (
        <div>
          <div className="sa-step-cap">Step 2 of 3 · {responseTypeLabel()}</div>
          <h3 className="font-serif text-lg font-bold text-[#3a1c14] leading-tight mb-1">{agent.name} wants to read more.</h3>
          <p className="text-xs font-sans text-[#a08070] leading-relaxed mb-3">Record exactly what they asked for, when it's due, and the date their reply arrived.</p>

          <label className="sa-label">What did they request?</label>
          <div className="grid grid-cols-4 gap-1.5 mb-3">
            {([
              { t: "Pages", icon: FileText },
              { t: "Words", icon: Type },
              { t: "Chapters", icon: List },
              { t: "Other", icon: MoreHorizontal },
            ] as const).map(({ t, icon: Icon }) => (
              <div
                key={t}
                onClick={() => setMaterialsType(t)}
                style={cardSelect(materialsType === t)}
                className="border rounded-lg p-2 flex flex-col items-center justify-center cursor-pointer text-center"
              >
                <Icon className={`w-3.5 h-3.5 mb-1 shrink-0 ${materialsType === t ? "text-[#7c3d3d]" : "text-[#c9a89e]"}`} />
                <span className="text-[11px] font-semibold text-[#3a1c14]">{t}</span>
              </div>
            ))}
          </div>

          {materialsType === "Other" ? (
            <input
              className="sa-input"
              placeholder="Describe what they asked for…"
              value={materialsOtherText}
              onChange={(e) => setMaterialsOtherText(e.target.value)}
            />
          ) : (
            <div className="flex items-center gap-3 mb-3.5">
              <input
                type="number"
                min={1}
                inputMode="numeric"
                className="sa-input"
                style={{ width: 100, marginBottom: 0, textAlign: "center" }}
                value={materialsQuantity}
                onChange={(e) => setMaterialsQuantity(parseInt(e.target.value) || 0)}
              />
              <span className="text-xs text-[#a08070] font-sans">{materialsType.toLowerCase()} from the start of your manuscript</span>
            </div>
          )}

          <label className="sa-label">Expected by</label>
          <BrandDatePicker value={expectedBy} onChange={setExpectedBy} placeholder="When do they want it?" />

          <label className="sa-label">Send yourself a reminder</label>
          <BrandDatePicker value={sendReminderDate} onChange={setSendReminderDate} placeholder="Remind me to prepare & send" />

          <label className="sa-label">Date received</label>
          <BrandDatePicker value={dateReceived} onChange={setDateReceived} placeholder="When their reply arrived" />
        </div>
      )}

      {/* STEP 3 (R&R) — revisions, not pages */}
      {step === 3 && responseType === "rr" && (
        <div>
          <div className="sa-step-cap">Step 2 of 3 · Revise & resubmit</div>
          <h3 className="font-serif text-lg font-bold text-[#3a1c14] leading-tight mb-1">They want to see it again.</h3>
          <p className="text-xs font-sans text-[#a08070] leading-relaxed mb-3">
            An R&R is about the revisions they've asked for — capture their guidance and set yourself a resubmit reminder.
          </p>

          <label className="sa-label">What revisions did they ask for?</label>
          <textarea
            className="sa-input sa-textarea"
            value={rrNotes}
            onChange={(e) => setRrNotes(e.target.value)}
            placeholder="e.g. 'Deepen the second-act stakes, trim the prologue, bring the romance subplot forward…'"
          />

          <label className="sa-label">Remind yourself to resubmit by</label>
          <BrandDatePicker value={sendReminderDate} onChange={setSendReminderDate} placeholder="Set a resubmit reminder" />

          <label className="sa-label">Date received</label>
          <BrandDatePicker value={dateReceived} onChange={setDateReceived} placeholder="When their R&R arrived" />
        </div>
      )}

      {/* STEP 3c — OFFER */}
      {step === 3 && responseType === "offer" && (
        <div>
          <div className="sa-step-cap">Step 2 of 3 · Offer</div>
          <div className="flex flex-col items-center text-center px-2 mb-3">
            <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mb-2">
              <Trophy className="w-7 h-7 text-[#7c3d3d]" />
            </div>
            <h3 className="font-serif text-[20px] font-bold text-[#3a1c14] leading-tight mb-1">{agent.name} made an offer.</h3>
            <p className="text-xs text-[#a08070] leading-relaxed">This is the moment you've been working towards. Take a breath, then record the details.</p>
          </div>

          <label className="sa-label">Date of offer</label>
          <BrandDatePicker value={offerDate} onChange={setOfferDate} placeholder="When they offered" />

          <label className="sa-label">Deadline to respond by (if given)</label>
          <BrandDatePicker value={offerDeadline} onChange={setOfferDeadline} placeholder="Most agents give 2–4 weeks" />

          <label className="sa-label">Notes about the offer (optional)</label>
          <textarea
            className="sa-input sa-textarea"
            value={offerNotes}
            onChange={(e) => setOfferNotes(e.target.value)}
            placeholder="e.g. 'Offered revision thoughts, mentioned interest from publishers…'"
          />

          <div className="bg-[#FFF0F0] border-[0.5px] border-[#f5c8c8] rounded-lg p-2.5 flex gap-2.5 items-start mt-1">
            <Bell className="w-4 h-4 text-[#7c3d3d] shrink-0 mt-0.5" />
            <p className="text-[11.5px] text-[#6a5045] leading-relaxed">
              Have other open queries? It's standard to tell those agents you have an offer — they may fast-track their read.
            </p>
          </div>
        </div>
      )}

      {/* STEP 3b — REJECTION */}
      {step === 3 && responseType === "rejected" && (
        <div>
          <div className="sa-step-cap">Step 2 of 3 · Rejected</div>
          <h3 className="font-serif text-lg font-bold text-[#3a1c14] leading-tight mb-2">Not this time.</h3>
          <div className="bg-[#fdf8f6] border-l-[3px] border-[#97a090]/50 rounded-[0_6px_6px_0] p-[10px_12px] mb-3">
            <p className="text-[11px] italic text-[#6a5045] leading-relaxed">
              "Every rejection is just a redirection. The right agent is still out there reading queries today."
            </p>
          </div>

          <label className="sa-label">Did {agent.name} give you any feedback?</label>
          <div className="flex gap-2 mb-3.5 font-sans">
            {([
              { v: "Yes", label: "Yes — a note" },
              { v: "No", label: "No — standard pass" },
              { v: "Form", label: "Form rejection" },
            ] as const).map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => setFeedbackType(o.v)}
                style={{ ...cardSelect(feedbackType === o.v), fontWeight: feedbackType === o.v ? 600 : 400 }}
                className="flex-1 py-2 px-1 text-center border rounded-lg text-xs text-[#6a5045] cursor-pointer"
              >
                {o.label}
              </button>
            ))}
          </div>

          {feedbackType === "Yes" && (
            <>
              <label className="sa-label">Their feedback (in their words if possible)</label>
              <textarea
                className="sa-input sa-textarea"
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="e.g. 'The voice didn't quite connect for me, but the premise is strong…'"
              />
            </>
          )}

          <label className="sa-label">Your reflection (optional — just for you)</label>
          <textarea
            className="sa-input sa-textarea"
            style={{ minHeight: 56 }}
            value={privateReflection}
            onChange={(e) => setPrivateReflection(e.target.value)}
            placeholder="What might you take from this, if anything?"
          />

          <label className="sa-label">Anything you'd do differently? (optional)</label>
          <textarea
            className="sa-input sa-textarea"
            style={{ minHeight: 56 }}
            value={rejectionLesson}
            onChange={(e) => setRejectionLesson(e.target.value)}
            placeholder="A note to your future self — e.g. 'Check their MSWL, tailor the comps.'"
          />

          <label className="sa-label">Query {agent.name} again in future? (optional)</label>
          <div className="flex gap-2 font-sans mb-3.5">
            {([
              { val: "yes", label: "Yes — different book" },
              { val: "maybe", label: "Maybe — keep watching" },
              { val: "no", label: "No — not a fit" },
            ] as const).map((o) => {
              const sel = requeryPreference === o.val;
              return (
                <button
                  key={o.val}
                  type="button"
                  aria-pressed={sel}
                  onClick={() => setRequeryPreference(sel ? "" : o.val)}
                  style={{ ...cardSelect(sel), fontWeight: sel ? 600 : 400 }}
                  className="flex-1 py-2 px-1 text-center border rounded-lg text-[11px] text-[#6a5045] cursor-pointer transition-all hover:border-[#c9a89e]"
                >
                  {o.label}
                </button>
              );
            })}
          </div>

          <label className="sa-label">Date received</label>
          <BrandDatePicker value={dateReceived} onChange={setDateReceived} placeholder="When the rejection arrived" />
        </div>
      )}

      {/* STEP 3d — NO RESPONSE / CLOSING */}
      {step === 3 && responseType === "close" && (
        <div>
          <div className="sa-step-cap">Step 2 of 3 · Closing query</div>
          <h3 className="font-serif text-lg font-bold text-[#3a1c14] leading-tight mb-1">Closing without a reply.</h3>
          <p className="text-xs text-[#a08070] mb-3">Sometimes silence is its own answer. Let's close this one out cleanly.</p>

          <label className="sa-label">Reason for closing</label>
          <div className="flex flex-col gap-2 mb-3.5 font-sans">
            {["No response after expected window", "Withdrew my submission", "Agent no longer accepting queries", "Other"].map((o) => (
              <div
                key={o}
                onClick={() => setClosingReason(o as any)}
                style={cardSelect(closingReason === o)}
                className="border rounded-lg p-2.5 text-xs text-[#6a5045] cursor-pointer transition-all hover:bg-stone-50 font-medium"
              >
                {o}
              </div>
            ))}
          </div>

          <label className="sa-label">Any notes? (just for you)</label>
          <textarea
            className="sa-input sa-textarea"
            style={{ minHeight: 56 }}
            value={closingNotes}
            onChange={(e) => setClosingNotes(e.target.value)}
            placeholder="Reflections on this closing…"
          />
        </div>
      )}

      {/* STEP 4 — CONFIRMATION */}
      {step === 4 && (
        <div>
          <div className="sa-step-cap">All recorded</div>
          <h3 className="font-serif text-lg font-bold text-[#3a1c14] leading-tight mb-1">
            {responseType === "partial" && "Partial request logged."}
            {responseType === "full" && "Full request logged."}
            {responseType === "rr" && "R&R logged."}
            {responseType === "offer" && "Offer recorded. Congratulations."}
            {responseType === "rejected" && "Rejection recorded."}
            {responseType === "close" && "Query closed."}
          </h3>
          <p className="text-xs text-[#a08070] leading-normal mb-3 font-sans">Here's what we've saved. You can edit this any time from the query detail.</p>

          <div className="bg-[#fdf8f6] border-[0.5px] border-[#e8d5cc] rounded-lg p-3.5 mb-3 flex flex-col gap-2 font-sans text-xs">
            <Row label="Agent" value={<span className="font-serif font-bold text-[#3a1c14]">{agent.name}</span>} />
            <Row label="New status" value={<StatusPill status={confirmStatusEnum()} size="sm" />} />

            {(responseType === "partial" || responseType === "full") && (
              <>
                <Row label="Materials to send" value={materialsType === "Other" ? materialsOtherText || "Other" : `${materialsQuantity} ${materialsType}`} />
                <Row label="Expected by" value={fmt(expectedBy)} />
                <Row label="Reminder set" value={fmt(sendReminderDate)} />
                <Row label="Date received" value={fmt(dateReceived)} last />
              </>
            )}

            {responseType === "rr" && (
              <>
                <Row label="Revisions noted" value={rrNotes.trim() ? "Yes" : "—"} />
                <Row label="Resubmit reminder" value={fmt(sendReminderDate)} />
                <Row label="Date received" value={fmt(dateReceived)} last />
              </>
            )}

            {responseType === "offer" && (
              <>
                <Row label="Date of offer" value={fmt(offerDate)} />
                <Row label="Response deadline" value={fmt(offerDeadline)} last />
              </>
            )}

            {responseType === "rejected" && (
              <>
                <Row label="Feedback received" value={feedbackType === "Yes" ? "Yes — a note" : feedbackType === "No" ? "No — standard pass" : "Form rejection"} />
                <Row label="Note to self" value={rejectionLesson.trim() ? "Saved" : "—"} />
                <Row label="Query again?" value={requeryPreference ? requeryPreference[0].toUpperCase() + requeryPreference.slice(1) : "—"} />
                <Row label="Date received" value={fmt(dateReceived)} last />
              </>
            )}

            {responseType === "close" && (
              <>
                <Row label="Reason for closing" value={closingReason} />
                <Row label="Notes saved" value={closingNotes ? "Yes" : "No"} last />
              </>
            )}
          </div>

          {saveError && <div className="sa-error">{saveError}</div>}

          <div className="bg-[#FFF0F0] border-[0.5px] border-[#f5c8c8] rounded-lg p-3 flex gap-2.5 items-start">
            <ArrowRight className="w-4 h-4 text-[#7c3d3d] shrink-0 mt-0.5" />
            <div className="flex flex-col text-left">
              <p className="text-xs text-[#6a5045] leading-relaxed">
                {(responseType === "partial" || responseType === "full") && "Your next step is to prepare and send the requested manuscript."}
                {responseType === "rr" && "Your next step is to revise and resubmit when you're ready."}
                {responseType === "offer" && "Consider notifying your other open queries that you have an offer."}
                {responseType === "rejected" && "Keep going. Your next query is out there."}
                {responseType === "close" && "Your query list has been updated."}
              </p>
              {onNavigate && (
                <span
                  onClick={() => {
                    onClose();
                    onNavigate("queries");
                  }}
                  className="text-[11px] font-bold text-[#7c3d3d] mt-1.5 hover:underline cursor-pointer"
                >
                  {responseType === "offer" ? "View open queries →" : responseType === "rejected" ? "View your remaining open queries →" : responseType === "close" ? "Back to queries →" : "View query and mark as sent when ready →"}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {step !== 4 && saveError && <div className="sa-error">{saveError}</div>}
    </FormShell>
  );
};

const Row: React.FC<{ label: string; value: React.ReactNode; last?: boolean }> = ({ label, value, last }) => (
  <div className={`flex justify-between items-center py-0.5 ${last ? "" : "border-b border-[#e8d5cc]/30"}`}>
    <span className="text-[#c9a89e] font-medium font-mono">{label}</span>
    <span className="text-[#3a1c14] font-semibold">{value}</span>
  </div>
);
