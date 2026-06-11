import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
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
  ChevronLeft
} from "lucide-react";
import { Query, QueryStatus, SubmissionMethod, QueryMaterial } from "../types";
import { StatusPill } from "./StatusPill";
import { formatQueryMaterial } from "../lib/materials";

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

export const RecordResponseModal: React.FC<RecordResponseModalProps> = ({
  isOpen,
  onClose,
  query,
  agent,
  manuscript,
  materialsOriginallySent,
  onSave,
  onNavigate
}) => {
  // Modal Steps:
  // 1: Context
  // 2: Response Type
  // 3: Detailed Questionnaire (3a: Pages Requested, 3b: Rejection, 3c: Offer, 3d: No Response / Closing)
  // 4: Confirmation Summary
  const [step, setStep] = useState<number>(1);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Clear save error on step change
  useEffect(() => {
    setSaveError(null);
  }, [step]);

  // Response Type Selection (Step 2)
  // Possible values: "partial" | "full" | "rr" | "offer" | "rejected" | "close"
  const [responseType, setResponseType] = useState<"partial" | "full" | "rr" | "offer" | "rejected" | "close" | null>(null);

  // Step 3a: Pages requested states
  const [materialsType, setMaterialsType] = useState<"Pages" | "Words" | "Chapters" | "Other">("Pages");
  const [materialsQuantity, setMaterialsQuantity] = useState<number>(50);
  const [materialsOtherText, setMaterialsOtherText] = useState<string>("");
  const [expectedBy, setExpectedBy] = useState<string>("");
  const [sendReminderDate, setSendReminderDate] = useState<string>("");

  // Step 3b: Rejection states
  const [feedbackType, setFeedbackType] = useState<"Yes" | "No" | "Form">("Form");
  const [feedbackText, setFeedbackText] = useState<string>("");
  const [privateReflection, setPrivateReflection] = useState<string>("");
  const [rejectionLesson, setRejectionLesson] = useState<string>("");
  const [requeryPreference, setRequeryPreference] = useState<"yes" | "maybe" | "no" | "">("");

  // Step 3c: Offer states
  const [offerDate, setOfferDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });
  const [offerDeadline, setOfferDeadline] = useState<string>("");
  const [offerNotes, setOfferNotes] = useState<string>("");

  // Step 3d: Closing query states
  const [closingReason, setClosingReason] = useState<
    "No response after expected window" | "Withdrew my submission" | "Agent no longer accepting queries" | "Other"
  >("No response after expected window");
  const [closingNotes, setClosingNotes] = useState<string>("");

  // Keyboard Escape listener to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Helper calculation for Days Since sent At
  const calculateDaysWithAgent = () => {
    if (!query.dateSent) return 0;
    const sent = new Date(query.dateSent);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - sent.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatDateSent = () => {
    if (!query.dateSent) return "";
    const date = new Date(query.dateSent);
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  const formatTextDate = (dateStr: string) => {
    if (!dateStr) return "Not specified";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  // Compile final DB update on step 4 Done click
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
        feedbackType,
        feedbackText,
        privateReflection,
        rejectionLesson,
        requeryPreference,
        offerDate,
        offerDeadline,
        offerNotes,
        closingReason,
        closingNotes
      });
      onClose();
    } catch (e) {
      console.error("Failed to save response:", e);
      setSaveError("Something went wrong — please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Status Labels for Screen 3 Headers
  const getResponseTypeLabel = () => {
    switch (responseType) {
      case "partial": return "Partial requested";
      case "full": return "Full requested";
      case "rr": return "Revise & resubmit";
      case "offer": return "Offer of representation";
      case "rejected": return "Rejected";
      case "close": return "No response / closing";
      default: return "";
    }
  };

  // Get status enum for Step 4 Status Pill
  const getConfirmationStatusEnum = (): QueryStatus => {
    if (responseType === "partial") return QueryStatus.PARTIAL_REQUESTED;
    if (responseType === "full") return QueryStatus.FULL_REQUESTED;
    if (responseType === "rr") return QueryStatus.REVISE_RESUBMIT;
    if (responseType === "offer") return QueryStatus.OFFER;
    if (responseType === "rejected") return QueryStatus.REJECTED;
    if (responseType === "close") {
      return closingReason === "Withdrew my submission" ? QueryStatus.WITHDRAWN : QueryStatus.NO_RESPONSE;
    }
    return QueryStatus.QUERIED;
  };

  // Helper rendering materials checklist helper display
  const materialsString = materialsOriginallySent && materialsOriginallySent.length > 0
    ? materialsOriginallySent.map(formatQueryMaterial).join(", ")
    : "Query Letter";

  // Dynamic Border Accent based on Screens
  const getsThemeBorderTop = responseType === "offer" && step === 3;

  return (
    <AnimatePresence>
      <motion.div
        id="record-response-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#28140e]/45 p-4 select-none cursor-pointer"
        onClick={onClose}
      >
        <motion.div
          id="record-response-modal-container"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          style={{ 
            width: '480px', 
            maxWidth: 'calc(100vw - 40px)', 
            borderTop: getsThemeBorderTop ? '3px solid #6b0f1a' : '0.5px solid #e8d5cc' 
          }}
          className="bg-[#FFFDF9] border-[0.5px] border-[#e8d5cc] rounded-2xl overflow-hidden cursor-default pointer-events-auto flex flex-col h-auto max-h-[90vh] shadow-2xl relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Progress row */}
          <div className="flex justify-center items-center gap-1.5 pt-4 pb-2 shrink-0 bg-[#FFFDF9]">
            {[1, 2, 3, 4].map((dotIndex) => {
              const isActive = step === dotIndex;
              const isCompleted = step > dotIndex;
              return (
                <div
                  key={dotIndex}
                  className="transition-all duration-300 h-[6px]"
                  style={{
                    width: isActive ? "18px" : "6px",
                    borderRadius: isActive ? "999px" : "50%",
                    backgroundColor: isActive ? "#7c3d3d" : isCompleted ? "#c9a89e" : "#e8d5cc"
                  }}
                />
              );
            })}
          </div>

          {/* Modal Main Scrollable Section */}
          <div className="flex-1 overflow-y-auto px-6 pb-6 pt-1">
            
            {/* SCREEN 1: CONTEXT */}
            {step === 1 && (
              <div className="animate-fade-in flex flex-col">
                <div className="text-[10px] uppercase font-bold tracking-[0.07em] text-[#c9a89e] mb-1.5 font-mono">
                  Recording a response
                </div>
                <h3 className="font-serif text-lg font-bold text-[#3a1c14] leading-tight mb-1.5">
                  A response has arrived from {agent.name}.
                </h3>
                <p className="text-xs text-[#a08070] leading-relaxed mb-4 font-sans">
                  Take a moment — this is what all those weeks of waiting were for. Let's record exactly what happened.
                </p>

                {/* Context Card */}
                <div className="bg-[#fdf8f6] border-[0.5px] border-[#e8d5cc] rounded-[10px] p-[12px_14px] flex justify-between items-center mb-3">
                  <div className="flex flex-col text-left">
                    <span className="font-serif text-[14px] font-bold text-[#3a1c14] leading-snug">
                      {agent.name}
                    </span>
                    <span className="text-[11px] text-[#a08070] leading-tight mt-0.5">
                      {agent.agency || "Independent Agent"}
                    </span>
                    <span className="text-[11px] italic text-[#7c3d3d] mt-1 font-medium leading-tight">
                      {manuscript.title}
                    </span>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <span className="font-serif text-[18px] font-semibold text-[#3a1c14] leading-none mb-0.5">
                      {calculateDaysWithAgent()}
                    </span>
                    <span className="text-[11px] text-[#c9a89e] leading-none font-medium">
                      days with agent
                    </span>
                  </div>
                </div>

                {/* Secondary Info row */}
                <div className="bg-[#fdf8f6] rounded-md p-2 flex items-center gap-2.5">
                  <Send className="w-3.5 h-3.5 text-[#c9a89e] shrink-0" />
                  <span className="text-[11px] text-[#6a5045] leading-normal font-sans">
                    Queried via <span className="font-semibold">{query.sendMethod || agent.submissionMethod || "Email"}</span> on <span className="font-semibold">{formatDateSent()}</span> · <span className="text-stone-500 font-medium">{materialsString}</span>
                  </span>
                </div>
              </div>
            )}

            {/* SCREEN 2: RESPONSE TYPE */}
            {step === 2 && (
              <div className="animate-fade-in flex flex-col">
                <div className="text-[10px] uppercase font-bold tracking-[0.07em] text-[#c9a89e] mb-1 font-mono">
                  Step 1 of 3
                </div>
                <h3 className="font-serif text-lg font-bold text-[#3a1c14] leading-tight mb-1">
                  What did {agent.name} say?
                </h3>
                <p className="text-xs text-[#a08070] leading-snug mb-4">
                  Choose the response type that best describes what you heard.
                </p>

                {/* Grid container */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Card 1: Partial Requested */}
                  <div 
                    onClick={() => setResponseType("partial")}
                    style={{
                      borderColor: responseType === "partial" ? "#7c3d3d" : "#e8d5cc",
                      backgroundColor: responseType === "partial" ? "#FFF0F0" : "#ffffff"
                    }}
                    className="border rounded-xl p-[11px_12px] flex flex-col text-left cursor-pointer transition-all hover:border-[#c9a89e]"
                  >
                    <div className="flex items-center gap-2 mb-1 text-[#3a1c14]">
                      <FileText className="w-4 h-4 text-[#7c3a2a] shrink-0" />
                      <span className="text-xs font-bold leading-tight">Partial requested</span>
                    </div>
                    <p className="text-[10px] text-[#a08070] leading-relaxed">
                      They want to read the first portion of your manuscript.
                    </p>
                  </div>

                  {/* Card 2: Full Requested */}
                  <div 
                    onClick={() => setResponseType("full")}
                    style={{
                      borderColor: responseType === "full" ? "#7c3d3d" : "#e8d5cc",
                      backgroundColor: responseType === "full" ? "#FFF0F0" : "#ffffff"
                    }}
                    className="border rounded-xl p-[11px_12px] flex flex-col text-left cursor-pointer transition-all hover:border-[#c9a89e]"
                  >
                    <div className="flex items-center gap-2 mb-1 text-[#3a1c14]">
                      <Files className="w-4 h-4 text-[#7c3a2a] shrink-0" />
                      <span className="text-xs font-bold leading-tight">Full requested</span>
                    </div>
                    <p className="text-[10px] text-[#a08070] leading-relaxed">
                      They want to read the entire manuscript.
                    </p>
                  </div>

                  {/* Card 3: Revise and Resubmit */}
                  <div 
                    onClick={() => setResponseType("rr")}
                    style={{
                      borderColor: responseType === "rr" ? "#7c3d3d" : "#e8d5cc",
                      backgroundColor: responseType === "rr" ? "#FFF0F0" : "#ffffff"
                    }}
                    className="border rounded-xl p-[11px_12px] flex flex-col text-left cursor-pointer transition-all hover:border-[#c9a89e]"
                  >
                    <div className="flex items-center gap-2 mb-1 text-[#3a1c14]">
                      <Pencil className="w-3.5 h-3.5 text-[#7c3a2a] shrink-0" />
                      <span className="text-xs font-bold leading-tight">Revise & resubmit</span>
                    </div>
                    <p className="text-[10px] text-[#a08070] leading-relaxed">
                      They like it with changes — and want to see it again.
                    </p>
                  </div>

                  {/* Card 4: Offer of Representation */}
                  <div 
                    onClick={() => setResponseType("offer")}
                    style={{
                      borderColor: responseType === "offer" ? "#6b0f1a" : "#e8d5cc",
                      backgroundColor: responseType === "offer" ? "#fff5f5" : "#ffffff"
                    }}
                    className="border rounded-xl p-[11px_12px] flex flex-col text-left cursor-pointer transition-all hover:border-[#c9a89e]"
                  >
                    <div className="flex items-center gap-2 mb-1 text-[#6b0f1a]">
                      <Trophy className="w-3.5 h-3.5 text-[#6b0f1a] shrink-0" />
                      <span className="text-xs font-bold leading-tight">Offer of representation</span>
                    </div>
                    <p className="text-[10px] text-[#6b0f1a]/80 leading-relaxed">
                      They want to represent you and your book.
                    </p>
                  </div>

                  {/* Card 5: Rejected */}
                  <div 
                    onClick={() => setResponseType("rejected")}
                    style={{
                      borderColor: responseType === "rejected" ? "#b0b0b0" : "#e8d5cc",
                      backgroundColor: responseType === "rejected" ? "#f8f8f8" : "#ffffff"
                    }}
                    className="border rounded-xl p-[11px_12px] flex flex-col text-left cursor-pointer transition-all hover:border-[#c9a89e]"
                  >
                    <div className="flex items-center gap-2 mb-1 text-stone-600">
                      <X className="w-3.5 h-3.5 text-stone-600 shrink-0" />
                      <span className="text-xs font-bold leading-tight">Rejected</span>
                    </div>
                    <p className="text-[10px] text-stone-500 leading-relaxed">
                      They passed on this query. It happens to everyone.
                    </p>
                  </div>

                  {/* Card 6: No reply / closing */}
                  <div 
                    onClick={() => setResponseType("close")}
                    style={{
                      borderColor: responseType === "close" ? "#7c3d3d" : "#e8d5cc",
                      backgroundColor: responseType === "close" ? "#FFF0F0" : "#ffffff"
                    }}
                    className="border rounded-xl p-[11px_12px] flex flex-col text-left cursor-pointer transition-all hover:border-[#c9a89e]"
                  >
                    <div className="flex items-center gap-2 mb-1 text-[#3a1c14]">
                      <Clock className="w-3.5 h-3.5 text-[#7c3a2a] shrink-0" />
                      <span className="text-xs font-bold leading-tight text-stone-800">No response / closing</span>
                    </div>
                    <p className="text-[10px] text-[#a08070] leading-relaxed">
                      You're closing this query without a formal reply.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* SCREEN 3a: PAGES REQUESTED */}
            {step === 3 && (responseType === "partial" || responseType === "full" || responseType === "rr") && (
              <div className="animate-fade-in flex flex-col text-left text-xs font-serif">
                <div className="text-[10px] uppercase font-bold tracking-[0.07em] text-[#c9a89e] mb-1 font-mono">
                  Step 2 of 3 · {getResponseTypeLabel()}
                </div>
                <h3 className="font-serif text-lg font-bold text-[#3a1c14] leading-tight mb-1">
                  {agent.name} wants to read more.
                </h3>
                <p className="text-xs font-sans text-[#a08070] leading-relaxed mb-4">
                  Let's record exactly what they've asked for, and set a reminder so you know when to send it.
                </p>

                <label className="text-[11px] font-sans font-semibold text-[#3a1c14] mb-1.5 block">
                  What did they request?
                </label>
                
                {/* 4 buttons row */}
                <div className="grid grid-cols-4 gap-1.5 mb-3">
                  {/* Pages */}
                  <div 
                    onClick={() => setMaterialsType("Pages")}
                    style={{
                      borderColor: materialsType === "Pages" ? "#7c3d3d" : "#e8d5cc",
                      backgroundColor: materialsType === "Pages" ? "#FFF0F0" : "#ffffff"
                    }}
                    className="border rounded-lg p-2 flex flex-col items-center justify-center cursor-pointer text-center"
                  >
                    <FileText className={`w-3.5 h-3.5 mb-1 shrink-0 ${materialsType === "Pages" ? "text-[#7c3d3d]" : "text-[#c9a89e]"}`} />
                    <span className="text-[10px] sm:text-[11px] font-semibold text-[#3a1c14]">Pages</span>
                  </div>

                  {/* Words */}
                  <div 
                    onClick={() => setMaterialsType("Words")}
                    style={{
                      borderColor: materialsType === "Words" ? "#7c3d3d" : "#e8d5cc",
                      backgroundColor: materialsType === "Words" ? "#FFF0F0" : "#ffffff"
                    }}
                    className="border rounded-lg p-2 flex flex-col items-center justify-center cursor-pointer text-center"
                  >
                    <Type className={`w-3.5 h-3.5 mb-1 shrink-0 ${materialsType === "Words" ? "text-[#7c3d3d]" : "text-[#c9a89e]"}`} />
                    <span className="text-[10px] sm:text-[11px] font-semibold text-[#3a1c14]">Words</span>
                  </div>

                  {/* Chapters */}
                  <div 
                    onClick={() => setMaterialsType("Chapters")}
                    style={{
                      borderColor: materialsType === "Chapters" ? "#7c3d3d" : "#e8d5cc",
                      backgroundColor: materialsType === "Chapters" ? "#FFF0F0" : "#ffffff"
                    }}
                    className="border rounded-lg p-2 flex flex-col items-center justify-center cursor-pointer text-center"
                  >
                    <List className={`w-3.5 h-3.5 mb-1 shrink-0 ${materialsType === "Chapters" ? "text-[#7c3d3d]" : "text-[#c9a89e]"}`} />
                    <span className="text-[10px] sm:text-[11px] font-semibold text-[#3a1c14]">Chapters</span>
                  </div>

                  {/* Other */}
                  <div 
                    onClick={() => setMaterialsType("Other")}
                    style={{
                      borderColor: materialsType === "Other" ? "#7c3d3d" : "#e8d5cc",
                      backgroundColor: materialsType === "Other" ? "#FFF0F0" : "#ffffff"
                    }}
                    className="border rounded-lg p-2 flex flex-col items-center justify-center cursor-pointer text-center"
                  >
                    <MoreHorizontal className={`w-3.5 h-3.5 mb-1 shrink-0 ${materialsType === "Other" ? "text-[#7c3d3d]" : "text-[#c9a89e]"}`} />
                    <span className="text-[10px] sm:text-[11px] font-semibold text-[#3a1c14]">Other</span>
                  </div>
                </div>

                {/* Quantity Block */}
                <div className="bg-[#fdf8f6] border-[0.5px] border-[#e8d5cc] rounded-lg p-3.5 mb-3.5">
                  <span className="text-[11px] font-sans font-semibold text-[#3a1c14] block mb-1.5">
                    {materialsType === "Other" ? "Describe requested materials" : `How many ${materialsType.toLowerCase()}?`}
                  </span>
                  
                  {materialsType === "Other" ? (
                    <input 
                      type="text"
                      className="w-full bg-white border border-[#e8d5cc] rounded-md px-3 py-1.5 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#7c3d3d]/40"
                      placeholder="Describe what they asked for…"
                      value={materialsOtherText}
                      onChange={(e) => setMaterialsOtherText(e.target.value)}
                    />
                  ) : (
                    <div className="flex items-center gap-3">
                      <input 
                        type="number"
                        min="1"
                        className="w-[90px] bg-white border border-[#e8d5cc] rounded-md py-1 px-2.5 text-center text-sm font-semibold text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#7c3d3d]/40"
                        value={materialsQuantity}
                        onChange={(e) => setMaterialsQuantity(parseInt(e.target.value) || 0)}
                      />
                      <span className="text-xs text-[#a08070] font-sans">
                        {materialsType.toLowerCase()} from the start of your manuscript
                      </span>
                    </div>
                  )}
                </div>

                {/* Two column grid */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="flex flex-col">
                    <label className="text-[11px] font-sans font-semibold text-[#333] mb-1">
                      Expected by
                    </label>
                    <input 
                      type="date"
                      className="bg-white border border-[#e8d5cc] rounded-md p-1.5 text-xs w-full text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#7c3d3d]/40 cursor-pointer font-sans"
                      value={expectedBy}
                      onChange={(e) => setExpectedBy(e.target.value)}
                    />
                    <span className="text-[10px] font-sans text-[#a08070] leading-tight mt-1">
                      When would the agent like to receive this?
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <label className="text-[11px] font-sans font-semibold text-[#333] mb-1">
                      Send a reminder to yourself
                    </label>
                    <input 
                      type="date"
                      className="bg-white border border-[#e8d5cc] rounded-md p-1.5 text-xs w-full text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#7c3d3d]/40 cursor-pointer font-sans"
                      value={sendReminderDate}
                      onChange={(e) => setSendReminderDate(e.target.value)}
                    />
                    <span className="text-[10px] font-sans text-[#a08070] leading-tight mt-1">
                      ScriptAlly will remind you to prepare and send materials.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* SCREEN 3b: REJECTION */}
            {step === 3 && responseType === "rejected" && (
              <div className="animate-fade-in flex flex-col text-left">
                <div className="text-[10px] uppercase font-bold tracking-[0.07em] text-[#c9a89e] mb-1 font-mono">
                  Step 2 of 3 · Rejected
                </div>
                <h3 className="font-serif text-lg font-bold text-[#3a1c14] leading-tight mb-2">
                  Not this time.
                </h3>

                {/* Quote block */}
                <div className="bg-[#fdf8f6] border-l-[3px] border-[#97a090]/50 rounded-[0_6px_6px_0] p-[10px_12px] mb-3 leading-normal font-serif">
                  <p className="text-[11px] italic text-[#6a5045] leading-relaxed select-text">
                    "Every rejection is just a redirection. The right agent is still out there reading queries today."
                  </p>
                </div>

                <div className="text-xs text-[#a08070] mb-2 font-sans">
                  Did {agent.name} give you any feedback?
                </div>

                {/* 3 feedback options buttons */}
                <div className="flex gap-2 mb-3.5 font-sans">
                  <button
                    type="button"
                    onClick={() => setFeedbackType("Yes")}
                    style={{
                      borderColor: feedbackType === "Yes" ? "#7c3d3d" : "#e8d5cc",
                      backgroundColor: feedbackType === "Yes" ? "#FFF0F0" : "#ffffff",
                      fontWeight: feedbackType === "Yes" ? "600" : "400"
                    }}
                    className="flex-1 py-2 px-1 text-center border rounded-lg text-xs text-[#6a5045] tracking-tight cursor-pointer"
                  >
                    Yes — they left a note
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeedbackType("No")}
                    style={{
                      borderColor: feedbackType === "No" ? "#7c3d3d" : "#e8d5cc",
                      backgroundColor: feedbackType === "No" ? "#FFF0F0" : "#ffffff",
                      fontWeight: feedbackType === "No" ? "600" : "400"
                    }}
                    className="flex-1 py-2 px-1 text-center border rounded-lg text-xs text-[#6a5045] tracking-tight cursor-pointer"
                  >
                    No — a standard pass
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeedbackType("Form")}
                    style={{
                      borderColor: feedbackType === "Form" ? "#7c3d3d" : "#e8d5cc",
                      backgroundColor: feedbackType === "Form" ? "#FFF0F0" : "#ffffff",
                      fontWeight: feedbackType === "Form" ? "600" : "400"
                    }}
                    className="flex-1 py-2 px-1 text-center border rounded-lg text-xs text-[#6a5045] tracking-tight cursor-pointer"
                  >
                    Form rejection
                  </button>
                </div>

                {/* Text feedback conditional */}
                {feedbackType === "Yes" && (
                  <div className="flex flex-col mb-3">
                    <label className="text-[11px] font-bold text-[#3a1c14] mb-1">
                      Their feedback (in their words if possible)
                    </label>
                    <textarea 
                      rows={3}
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="e.g. 'The voice didn't quite connect for me, but the premise is strong…'"
                      className="bg-white border border-[#e8d5cc] rounded-md p-2 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#7c3d3d]/40"
                    />
                  </div>
                )}

                {/* Private Reflection */}
                <div className="flex flex-col mb-1.5">
                  <label className="text-[11px] font-bold text-[#3a1c14] mb-1">
                    Your reflection (optional — just for you)
                  </label>
                  <textarea 
                    rows={2}
                    value={privateReflection}
                    onChange={(e) => setPrivateReflection(e.target.value)}
                    placeholder="What might you take from this, if anything?"
                    className="bg-white border border-[#e8d5cc] rounded-md p-2 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#7c3d3d]/40"
                  />
                  <span className="text-[10px] text-[#a08070] mt-1 italic">
                    This never affects your stats — it's a private note to yourself.
                  </span>
                </div>

                {/* Lesson — note to future self */}
                <div className="flex flex-col mb-3.5 mt-2">
                  <label className="text-[11px] font-bold text-[#3a1c14] mb-1">
                    Anything you'd do differently? (optional)
                  </label>
                  <textarea
                    rows={2}
                    value={rejectionLesson}
                    onChange={(e) => setRejectionLesson(e.target.value)}
                    placeholder="A note to your future self before the next send — e.g. 'Check their MSWL, tailor the comps.'"
                    className="bg-white border border-[#e8d5cc] rounded-md p-2 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#7c3d3d]/40"
                  />
                </div>

                {/* Re-query disposition (stored on the agent) */}
                <div className="flex flex-col">
                  <label className="text-[11px] font-bold text-[#3a1c14] mb-1.5">
                    Query {agent.name} again in future? (optional)
                  </label>
                  <div className="flex gap-2 font-sans">
                    {([
                      { val: "yes", label: "Yes — different book" },
                      { val: "maybe", label: "Maybe — keep watching" },
                      { val: "no", label: "No — not a fit" },
                    ] as const).map((opt) => {
                      const isSelected = requeryPreference === opt.val;
                      return (
                        <button
                          key={opt.val}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => setRequeryPreference(isSelected ? "" : opt.val)}
                          style={{
                            borderColor: isSelected ? "#7c3d3d" : "#e8d5cc",
                            backgroundColor: isSelected ? "#FFF0F0" : "#ffffff",
                            fontWeight: isSelected ? 600 : 400,
                          }}
                          className="flex-1 py-2 px-1 text-center border rounded-lg text-[11px] text-[#6a5045] tracking-tight cursor-pointer transition-all hover:border-[#c9a89e]"
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-[10px] text-[#a08070] mt-1 italic">
                    Saved to the agent — we'll remind you next time you query them.
                  </span>
                </div>
              </div>
            )}

            {/* SCREEN 3c: OFFER */}
            {step === 3 && responseType === "offer" && (
              <div className="animate-fade-in flex flex-col text-left">
                <div className="text-[10px] uppercase font-bold tracking-[0.07em] text-[#c9a89e] mb-2 font-mono">
                  Step 2 of 3 · Offer
                </div>

                <div className="flex flex-col items-center justify-center text-center px-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mb-2.5">
                    <Trophy className="w-8 h-8 text-[#7c3d3d]" />
                  </div>
                  <h3 className="font-serif text-[20px] font-bold text-[#3a1c14] leading-tight mb-1.5 select-all">
                    {agent.name} made an offer.
                  </h3>
                  <p className="text-xs text-[#a08070] leading-relaxed max-w-[340px]">
                    This is the moment you've been working towards. Take a breath. Let's record the details carefully.
                  </p>
                </div>

                {/* Two inputs */}
                <div className="grid grid-cols-2 gap-3.5 mb-3.5">
                  <div className="flex flex-col">
                    <label className="text-[11px] font-semibold text-stone-700 mb-1">
                      Date of offer
                    </label>
                    <input 
                      type="date"
                      className="bg-white border border-[#e8d5cc] rounded-md p-1.5 text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#7c3d3d]/40 cursor-pointer w-full"
                      value={offerDate}
                      onChange={(e) => setOfferDate(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col">
                    <label className="text-[11px] font-semibold text-stone-700 mb-1">
                      Deadline to respond by (if given)
                    </label>
                    <input 
                      type="date"
                      className="bg-white border border-[#e8d5cc] rounded-md p-1.5 text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#7c3d3d]/40 cursor-pointer w-full"
                      value={offerDeadline}
                      onChange={(e) => setOfferDeadline(e.target.value)}
                    />
                    <span className="text-[10px] text-[#a08070] mt-1 leading-normal italic">
                      Most agents give 2–4 weeks. You're not obligated to rush.
                    </span>
                  </div>
                </div>

                {/* Offer notes text */}
                <div className="flex flex-col mb-4">
                  <label className="text-[11px] font-semibold text-stone-700 mb-1">
                    Notes about the offer (optional)
                  </label>
                  <textarea 
                    rows={2}
                    value={offerNotes}
                    onChange={(e) => setOfferNotes(e.target.value)}
                    placeholder="e.g. 'Offered to do revision thoughts, mentioned interest from publishers...'"
                    className="bg-white border border-[#e8d5cc] rounded-md p-2 text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#7c3d3d]/40 placeholder-stone-400"
                  />
                </div>

                {/* Info block */}
                <div className="bg-[#FFF0F0] border-[0.5px] border-[#f5c8c8] rounded-lg p-2.5 flex gap-2.5 items-start">
                  <Bell className="w-4 h-4 text-[#7c3d3d] shrink-0 mt-0.5" />
                  <div className="flex flex-col text-left">
                    <p className="text-[11.5px] text-[#6a5045] leading-relaxed">
                      Do you have other open queries? It's standard to notify those agents you have an offer — they may want to fast-track their read.
                    </p>
                    <span className="text-[11px] font-bold text-[#7c3d3d] mt-1.5 hover:underline cursor-pointer">
                      We'll help you do this after recording →
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* SCREEN 3d: NO RESPONSE / CLOSING */}
            {step === 3 && responseType === "close" && (
              <div className="animate-fade-in flex flex-col text-left">
                <div className="text-[10px] uppercase font-bold tracking-[0.07em] text-[#c9a89e] mb-1 font-mono">
                  Step 2 of 3 · Closing query
                </div>
                <h3 className="font-serif text-lg font-bold text-[#3a1c14] leading-tight mb-1">
                  Closing without a reply.
                </h3>
                <p className="text-xs text-[#a08070] mb-4">
                  Sometimes silence is its own answer. Let's close this one out cleanly.
                </p>

                <label className="text-[11px] font-semibold text-stone-700 mb-2 block">
                  Reason for closing
                </label>

                {/* 4 Clickable cards stack */}
                <div className="flex flex-col gap-2 mb-4 font-sans">
                  {[
                    "No response after expected window",
                    "Withdrew my submission",
                    "Agent no longer accepting queries",
                    "Other"
                  ].map((option) => {
                    const isChoiceSelected = closingReason === option;
                    return (
                      <div
                        key={option}
                        onClick={() => setClosingReason(option as any)}
                        style={{
                          borderColor: isChoiceSelected ? "#7c3d3d" : "#e8d5cc",
                          backgroundColor: isChoiceSelected ? "#FFF0F0" : "#ffffff"
                        }}
                        className="border rounded-lg p-2.5 text-xs text-[#6a5045] cursor-pointer transition-all hover:bg-stone-50 font-medium"
                      >
                        {option}
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-col">
                  <label className="text-[11px] font-semibold text-stone-700 mb-1">
                    Any notes? (just for you)
                  </label>
                  <textarea 
                    rows={2}
                    value={closingNotes}
                    onChange={(e) => setClosingNotes(e.target.value)}
                    placeholder="Reflections on this closing..."
                    className="bg-white border border-[#e8d5cc] rounded-md p-2 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#7c3d3d]/40"
                  />
                  <span className="text-[10px] text-[#a08070] mt-1 block italic font-normal">
                    Private — never shown in stats.
                  </span>
                </div>
              </div>
            )}

            {/* SCREEN 4: CONFIRMATION */}
            {step === 4 && (
              <div className="animate-fade-in flex flex-col text-left">
                <div className="text-[10px] uppercase font-bold tracking-[0.07em] text-[#c9a89e] mb-1 font-mono">
                  All recorded
                </div>
                <h3 className="font-serif text-lg font-bold text-[#3a1c14] leading-tight mb-1">
                  {responseType === "partial" && "Partial request logged."}
                  {responseType === "full" && "Full request logged."}
                  {responseType === "rr" && "R&R logged."}
                  {responseType === "offer" && "Offer recorded. Congratulations."}
                  {responseType === "rejected" && "Rejection recorded."}
                  {responseType === "close" && "Query closed."}
                </h3>
                <p className="text-xs text-[#a08070] leading-normal mb-4 font-sans">
                  Here's a summary of what we've saved. You can always edit this from the query detail.
                </p>

                {/* Summary Card */}
                <div className="bg-[#fdf8f6] border-[0.5px] border-[#e8d5cc] rounded-lg p-3.5 mb-3.5 flex flex-col gap-2 font-sans text-xs">
                  <div className="flex justify-between items-center py-0.5 border-b border-[#e8d5cc]/30">
                    <span className="text-[#c9a89e] font-medium font-mono">Agent</span>
                    <span className="text-[#3a1c14] font-bold font-serif">{agent.name}</span>
                  </div>

                  <div className="flex justify-between items-center py-0.5 border-b border-[#e8d5cc]/30">
                    <span className="text-[#c9a89e] font-medium font-mono">New status</span>
                    <StatusPill status={getConfirmationStatusEnum()} size="sm" />
                  </div>

                  {/* Contextual values */}
                  {(responseType === "partial" || responseType === "full" || responseType === "rr") && (
                    <>
                      <div className="flex justify-between items-center py-0.5 border-b border-[#e8d5cc]/30">
                        <span className="text-[#c9a89e] font-medium font-mono">Materials to send</span>
                        <span className="text-[#3a1c14] font-semibold">
                          {materialsType === "Other" ? materialsOtherText || "Other" : `${materialsQuantity} ${materialsType}`}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-0.5 border-b border-[#e8d5cc]/30">
                        <span className="text-[#c9a89e] font-medium font-mono">Expected by</span>
                        <span className="text-[#3a1c14] font-semibold">{formatTextDate(expectedBy)}</span>
                      </div>
                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-[#c9a89e] font-medium font-mono">Reminder set</span>
                        <span className="text-[#3a1c14] font-semibold">{formatTextDate(sendReminderDate)}</span>
                      </div>
                    </>
                  )}

                  {responseType === "offer" && (
                    <>
                      <div className="flex justify-between items-center py-0.5 border-b border-[#e8d5cc]/30">
                        <span className="text-[#c9a89e] font-medium font-mono">Date of offer</span>
                        <span className="text-[#3a1c14] font-semibold">{formatTextDate(offerDate)}</span>
                      </div>
                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-[#c9a89e] font-medium font-mono">Response deadline</span>
                        <span className="text-[#3a1c14] font-semibold">{formatTextDate(offerDeadline)}</span>
                      </div>
                    </>
                  )}

                  {responseType === "rejected" && (
                    <>
                      <div className="flex justify-between items-center py-0.5 border-b border-[#e8d5cc]/30">
                        <span className="text-[#c9a89e] font-medium font-mono">Feedback received</span>
                        <span className="text-[#3a1c14] font-semibold">
                          {feedbackType === "Yes" ? "Yes — they left a note" : feedbackType === "No" ? "No — standard pass" : "Form rejection"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-0.5 border-b border-[#e8d5cc]/30">
                        <span className="text-[#c9a89e] font-medium font-mono">Reflection saved</span>
                        <span className="text-[#3a1c14] font-semibold">{privateReflection ? "Yes" : "No"}</span>
                      </div>
                      <div className="flex justify-between items-center py-0.5 border-b border-[#e8d5cc]/30">
                        <span className="text-[#c9a89e] font-medium font-mono">Note to self</span>
                        <span className="text-[#3a1c14] font-semibold">{rejectionLesson.trim() ? "Saved" : "—"}</span>
                      </div>
                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-[#c9a89e] font-medium font-mono">Query again?</span>
                        <span className="text-[#3a1c14] font-semibold">
                          {requeryPreference === "yes" ? "Yes" : requeryPreference === "maybe" ? "Maybe" : requeryPreference === "no" ? "No" : "—"}
                        </span>
                      </div>
                    </>
                  )}

                  {responseType === "close" && (
                    <>
                      <div className="flex justify-between items-center py-0.5 border-b border-[#e8d5cc]/30">
                        <span className="text-[#c9a89e] font-medium font-mono">Reason for closing</span>
                        <span className="text-[#3a1c14] font-semibold">{closingReason}</span>
                      </div>
                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-[#c9a89e] font-medium font-mono">Notes saved</span>
                        <span className="text-[#3a1c14] font-semibold">{closingNotes ? "Yes" : "No"}</span>
                      </div>
                    </>
                  )}
                </div>

                {saveError && (
                  <p className="text-[11px] text-[#a04030] font-sans font-medium text-left mt-1.5 mb-1.5 leading-tight">
                    {saveError}
                  </p>
                )}

                {/* Next step context block */}
                <div className="bg-[#FFF0F0] border-[0.5px] border-[#f5c8c8] rounded-lg p-3 flex gap-2.5 items-start">
                  <ArrowRight className="w-4 h-4 text-[#7c3d3d] shrink-0 mt-0.5" />
                  <div className="flex flex-col text-left">
                    <p className="text-xs text-[#6a5045] leading-relaxed">
                      {responseType === "partial" && "Your next step is to prepare and send your partial manuscript."}
                      {responseType === "full" && "Your next step is to prepare and send your full manuscript."}
                      {responseType === "rr" && "Your next step is to prepare and send your revised manuscript."}
                      {responseType === "offer" && "Consider notifying your other open queries that you have an offer."}
                      {responseType === "rejected" && "Keep going. Your next query is out there."}
                      {responseType === "close" && "Your query list has been updated."}
                    </p>
                    
                    {/* Interactive state links */}
                    {onNavigate && (
                      <span 
                        onClick={() => {
                          onClose();
                          if (responseType === "offer" || responseType === "rejected") {
                            // Go to open queries list or update filters
                            onNavigate("queries");
                          } else {
                            onNavigate("queries");
                          }
                        }}
                        className="text-[11px] font-bold text-[#7c3d3d] mt-1.5 hover:underline cursor-pointer"
                      >
                        {responseType === "partial" && "View query and mark as sent when ready →"}
                        {responseType === "full" && "View query and mark as sent when ready →"}
                        {responseType === "rr" && "View query and mark as sent when ready →"}
                        {responseType === "offer" && "View open queries →"}
                        {responseType === "rejected" && "View your remaining open queries →"}
                        {responseType === "close" && "Back to queries →"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer - fixed bottom padding */}
          <div className="border-t border-[#e8d5cc]/40 bg-[#FAF8F5] px-6 py-4 flex items-center justify-between shrink-0 font-sans">
            {step === 1 && (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-stone-400 hover:text-[#7c3a2a] text-xs font-semibold cursor-pointer transition-colors bg-transparent border-0 focus:outline-none"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="h-[34px] bg-[#7c3a2a] hover:bg-[#6c3224] text-white flex items-center justify-center px-4 rounded-full text-xs font-bold cursor-pointer transition-colors border-0"
                >
                  Record their response →
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-[#c9a89e] hover:text-[#7c3a2a] text-xs font-semibold cursor-pointer transition-colors bg-transparent border-0 flex items-center gap-1 focus:outline-none"
                >
                  <ChevronLeft className="w-3.5 h-3.5 text-[#c9a89e]" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  disabled={!responseType}
                  onClick={() => setStep(3)}
                  style={{ opacity: responseType ? 1 : 0.5, cursor: responseType ? "pointer" : "not-allowed" }}
                  className="h-[34px] bg-[#7c3a2a] hover:bg-[#6c3224] text-white flex items-center justify-center px-4 rounded-full text-xs font-bold transition-all border-0"
                >
                  Continue →
                </button>
              </>
            )}

            {step === 3 && (
              <>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-[#c9a89e] hover:text-[#7c3a2a] text-xs font-semibold cursor-pointer transition-colors bg-transparent border-0 flex items-center gap-1 focus:outline-none"
                >
                  <ChevronLeft className="w-3.5 h-3.5 text-[#c9a89e]" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  style={{
                    backgroundColor: responseType === "offer" ? "#6b0f1a" : "#7c3a2a"
                  }}
                  className="h-[34px] hover:bg-opacity-90 text-white flex items-center justify-center px-4  rounded-full text-xs font-bold cursor-pointer transition-all border-0"
                >
                  {responseType === "rejected" && "Record and close →"}
                  {responseType === "offer" && "Record this offer →"}
                  {responseType === "close" && "Close this query →"}
                  {(responseType === "partial" || responseType === "full" || responseType === "rr") && "Continue →"}
                </button>
              </>
            )}

            {step === 4 && (
              <div className="w-full flex justify-end">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSaveAndDone}
                  style={{ opacity: isSaving ? 0.7 : 1 }}
                  className="h-[34px] bg-[#7c3a2a] hover:bg-[#6c3224] text-white flex items-center justify-center px-6 rounded-full text-xs font-bold cursor-pointer transition-colors border-0"
                >
                  {isSaving ? "Saving..." : "Done"}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
