/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { useScriptAllyDb } from "../lib/db";
import { 
  QueryStatus, 
  Agent, 
  Manuscript, 
  SubmissionPackage, 
  SubmissionMethod, 
  Query, 
  ActivityType, 
  Activity 
} from "../types";
import { 
  X, 
  Check, 
  ChevronRight, 
  ArrowLeft, 
  Send, 
  Star, 
  Paperclip, 
  Upload, 
  FolderOpen, 
  Calendar,
  AlertCircle,
  FileCheck,
  Edit2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface LogQueryFocusFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessToast: (message: string) => void;
}

export const LogQueryFocusForm: React.FC<LogQueryFocusFormProps> = ({
  isOpen,
  onClose,
  onSuccessToast,
}) => {
  const {
    currentUser,
    manuscripts,
    agents,
    packages,
    addQuery,
  } = useScriptAllyDb();

  // Step wizard flow: 1, 2, 3
  const [step, setStep] = useState<number>(1);
  const [visitedSteps, setVisitedSteps] = useState<Record<number, boolean>>({ 1: true });

  // Step 1: Essentials state
  const [selectedManuscriptId, setSelectedManuscriptId] = useState<string>("");
  const [agentSearchInput, setAgentSearchInput] = useState<string>("");
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showAgentSuggestions, setShowAgentSuggestions] = useState<boolean>(false);
  const [dateSent, setDateSent] = useState<string>("");
  const [sendMethod, setSendMethod] = useState<SubmissionMethod>(SubmissionMethod.EMAIL);
  const [personalizationNotes, setPersonalizationNotes] = useState<string>("");

  // Step 2: What you sent state
  const [queryLetterChecked, setQueryLetterChecked] = useState<boolean>(false);
  const [synopsisChecked, setSynopsisChecked] = useState<boolean>(false);
  const [samplePagesChecked, setSamplePagesChecked] = useState<boolean>(false);

  const [queryLetterNotes, setQueryLetterNotes] = useState<string>("");
  const [synopsisNotes, setSynopsisNotes] = useState<string>("");
  const [samplePagesNotes, setSamplePagesNotes] = useState<string>("");

  const [queryLetterFile, setQueryLetterFile] = useState<string | null>(null);
  const [synopsisFile, setSynopsisFile] = useState<string | null>(null);
  const [samplePagesFile, setSamplePagesFile] = useState<string | null>(null);

  const [selectedPackageId, setSelectedPackageId] = useState<string>("");
  const [selectedPackageName, setSelectedPackageName] = useState<string>("");
  const [showPackageBrowser, setShowPackageBrowser] = useState<boolean>(false);

  // Step 3: Response tracking state
  const [responseDeadlineDate, setResponseDeadlineDate] = useState<string>("");
  const [isEditingDeadline, setIsEditingDeadline] = useState<boolean>(false);
  const [ifNoResponseAction, setIfNoResponseAction] = useState<"nudge" | "close" | "nothing">("nudge");
  const [nudgeReminderWhen, setNudgeReminderWhen] = useState<"week_before" | "day_before" | "on_deadline">("week_before");

  // Error handling
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Unsaved changes confirmation dialog
  const [showDiscardConfirm, setShowDiscardConfirm] = useState<boolean>(false);

  // File Reference Inputs
  const qlFileInputRef = useRef<HTMLInputElement>(null);
  const synFileInputRef = useRef<HTMLInputElement>(null);
  const spFileInputRef = useRef<HTMLInputElement>(null);

  // Reset all states when form opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setVisitedSteps({ 1: true });
      if (manuscripts.length > 0) {
        setSelectedManuscriptId(manuscripts[0].id);
      } else {
        setSelectedManuscriptId("");
      }
      setAgentSearchInput("");
      setSelectedAgent(null);
      setShowAgentSuggestions(false);
      setDateSent(new Date().toISOString().split("T")[0]);
      setSendMethod(SubmissionMethod.EMAIL);
      setPersonalizationNotes("");
      setQueryLetterChecked(false);
      setSynopsisChecked(false);
      setSamplePagesChecked(false);
      setQueryLetterNotes("");
      setSynopsisNotes("");
      setSamplePagesNotes("");
      setQueryLetterFile(null);
      setSynopsisFile(null);
      setSamplePagesFile(null);
      setSelectedPackageId("");
      setSelectedPackageName("");
      setShowPackageBrowser(false);
      setResponseDeadlineDate("");
      setIsEditingDeadline(false);
      setIfNoResponseAction("nudge");
      setNudgeReminderWhen("week_before");
      setFormError(null);
      setIsSubmitting(false);
      setShowDiscardConfirm(false);
    }
  }, [isOpen, manuscripts]);

  // Handle auto-calculating expected response deadlines on agent selection
  useEffect(() => {
    if (selectedAgent) {
      const weeks = selectedAgent.responseTimeWeeks || 6;
      const targetDate = new Date(dateSent || new Date());
      targetDate.setDate(targetDate.getDate() + (weeks * 7));
      setResponseDeadlineDate(targetDate.toISOString().split("T")[0]);
    }
  }, [selectedAgent, dateSent]);

  // Listen for Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        triggerClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, selectedAgent, personalizationNotes, dateSent, sendMethod, queryLetterChecked, synopsisChecked, samplePagesChecked, queryLetterNotes, synopsisNotes, samplePagesNotes, queryLetterFile, synopsisFile, samplePagesFile, selectedPackageId, ifNoResponseAction]);

  if (!isOpen) return null;

  const todayStr = new Date().toISOString().split("T")[0];
  const isDirty = 
    selectedAgent !== null ||
    personalizationNotes !== "" ||
    dateSent !== todayStr ||
    sendMethod !== SubmissionMethod.EMAIL ||
    queryLetterChecked ||
    synopsisChecked ||
    samplePagesChecked ||
    queryLetterNotes !== "" ||
    synopsisNotes !== "" ||
    samplePagesNotes !== "" ||
    queryLetterFile !== null ||
    synopsisFile !== null ||
    samplePagesFile !== null ||
    selectedPackageId !== "" ||
    ifNoResponseAction !== "nudge";

  const triggerClose = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  const handleDiscard = () => {
    setShowDiscardConfirm(false);
    onClose();
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!selectedAgent) {
        setFormError("Please select an agent to proceed.");
        return;
      }
      setFormError(null);
    }
    const next = step + 1;
    setStep(next);
    setVisitedSteps(prev => ({ ...prev, [next]: true }));
  };

  const handleBackStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const jumpToStep = (target: number) => {
    if (visitedSteps[target] || target < step) {
      setStep(target);
    }
  };

  // Agent autocomplete filter list matching
  const matchingAgents = agents.filter(a => {
    const term = agentSearchInput.toLowerCase();
    return a.name.toLowerCase().includes(term) || a.agency.toLowerCase().includes(term);
  });

  const selectAgentOption = (agent: Agent) => {
    setSelectedAgent(agent);
    setAgentSearchInput(agent.name);
    setShowAgentSuggestions(false);
    setFormError(null);
    // Auto populate default agent delivery model if any
    if (agent.submissionMethod === "Online Form") {
      setSendMethod(SubmissionMethod.ONLINE_FORM);
    } else {
      setSendMethod(SubmissionMethod.EMAIL);
    }
  };

  // File choice simulations
  const handleFileChange = (row: "ql" | "syn" | "sp", e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (row === "ql") setQueryLetterFile(file.name);
      if (row === "syn") setSynopsisFile(file.name);
      if (row === "sp") setSamplePagesFile(file.name);
    }
  };

  const simulateDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const simulateFileDrop = (row: "ql" | "syn" | "sp", e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (row === "ql") setQueryLetterFile(file.name);
      if (row === "syn") setSynopsisFile(file.name);
      if (row === "sp") setSamplePagesFile(file.name);
    }
  };

  const handlePackageSelect = (pkg: SubmissionPackage) => {
    setSelectedPackageId(pkg.id);
    setSelectedPackageName(pkg.packageName);
    
    // Automatically tick all appropriate rows
    setQueryLetterChecked(true);
    setSynopsisChecked(true);
    setSamplePagesChecked(true);

    setQueryLetterNotes(`Materials from package: "${pkg.packageName}"`);
    setSynopsisNotes(`Materials from package: "${pkg.packageName}"`);
    setSamplePagesNotes(`Materials from package: "${pkg.packageName}"`);

    setShowPackageBrowser(false);
  };

  // Calculations for Step 3 confirmation strip
  const calculatedNudgeDateStr = (() => {
    if (!responseDeadlineDate) return "";
    const deadline = new Date(responseDeadlineDate);
    if (nudgeReminderWhen === "week_before") {
      deadline.setDate(deadline.getDate() - 7);
    } else if (nudgeReminderWhen === "day_before") {
      deadline.setDate(deadline.getDate() - 1);
    }
    return deadline.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  })();

  const deadlineFormattedStr = responseDeadlineDate 
    ? new Date(responseDeadlineDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "";

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgent) {
      setFormError("Agent is required.");
      return;
    }
    if (!selectedManuscriptId) {
      setFormError("Manuscript selection is required.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    // Calc custom nudgeDate if selected
    let nudgeDate: string | undefined = undefined;
    if (ifNoResponseAction === "nudge" && responseDeadlineDate) {
      const d = new Date(responseDeadlineDate);
      if (nudgeReminderWhen === "week_before") {
        d.setDate(d.getDate() - 7);
      } else if (nudgeReminderWhen === "day_before") {
        d.setDate(d.getDate() - 1);
      }
      nudgeDate = d.toISOString();
    }

    // Combine materials list for the query record. Values use the app's canonical vocabulary
    // ("Query Letter" / "Synopsis" / "Sample Pages") so the screens that read materialsWanted
    // (RecordResponseModal, the query detail, etc.) display and filter them consistently.
    const materials: string[] = [];
    if (queryLetterChecked) materials.push("Query Letter");
    if (synopsisChecked) materials.push("Synopsis");
    if (samplePagesChecked) materials.push("Sample Pages");

    // Persist the "if no response" choice in the existing ifNoResponse field/vocabulary used by
    // the query edit form, so both forms read/write the same field and the auto-close mechanism
    // (db.tsx) can key off "Mark as no response automatically".
    const ifNoResponseValue =
      ifNoResponseAction === "nudge"
        ? "Remind me to nudge"
        : ifNoResponseAction === "close"
        ? "Mark as no response automatically"
        : "Do nothing";

    try {
      const newQueryPayload = {
        manuscriptId: selectedManuscriptId,
        agentId: selectedAgent.id,
        packageId: selectedPackageId,
        personalisationNotes: personalizationNotes,
        sendMethod,
        dateSent: new Date(dateSent).toISOString(),
        responseDeadline: new Date(responseDeadlineDate).toISOString(),
        nudgeDate,
        materialsWanted: materials,
        ifNoResponse: ifNoResponseValue,
        status: QueryStatus.QUERIED
      };

      const result = await addQuery(newQueryPayload);

      if (result.success) {
        setIsSubmitting(false);
        onSuccessToast("Query logged successfully");
        onClose();
      } else {
        setFormError(result.error || "An error occurred while saving the query.");
        setIsSubmitting(false);
      }
    } catch (err: any) {
      setFormError(err.message || "An unexpected error occurred.");
      setIsSubmitting(false);
    }
  };

  // Helper to extract initials
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(part => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <>
      {/* Dynamic Success/Discard Confirmation Overlays and Main Form Body */}
      <div 
        className="fixed inset-0 bg-stone-950/75 backdrop-blur-sm flex flex-col items-center justify-center p-4 z-50 animate-fade-in"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            triggerClose();
          }
        }}
        style={{ animationDuration: "200ms" }}
      >
        {/* Subtle subtext above card */}
        <p className="text-center italic text-[#F8F5F0]/45 text-[12px] mb-3 select-none tracking-wide">
          Take your time. We'll track everything from here.
        </p>

        {/* Main form visual card wrapper */}
        <div 
          className="bg-white rounded-[16px] w-[640px] max-w-[90vw] overflow-hidden flex flex-col border-t-[3px] border-t-[#7c3a2a] relative font-sans text-[#3a1c14] focus:outline-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header block with #7c3a2a background */}
          <div className="bg-[#7c3a2a] p-[16px_24px] text-white flex items-center justify-between relative">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-white/60 mb-0.5">New entry</p>
              <h2 className="font-serif text-[16px] font-normal text-[#F8F5F0]">Send a query</h2>
            </div>
            <button 
              onClick={triggerClose}
              className="p-1 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all cursor-pointer"
              title="Close and discard form"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Thin progress bar underneath the header */}
          <div className="w-full h-[3px] bg-[#5a2a1a] relative">
            <motion.div 
              className="absolute left-0 top-0 bottom-0 bg-[#c47a5a] transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>

          {/* Three-step navigation header tabs */}
          <div className="flex border-b border-stone-200">
            {[1, 2, 3].map((stepNum) => {
              const titles = ["Essentials", "What you sent", "Response tracking"];
              const label = titles[stepNum - 1];
              const isActive = step === stepNum;
              const isCompleted = step > stepNum;
              const canClick = visitedSteps[stepNum] || stepNum < step;

              return (
                <button
                  key={stepNum}
                  onClick={() => canClick && jumpToStep(stepNum)}
                  disabled={!canClick}
                  className={`flex-1 py-3 px-2 flex items-center justify-center gap-2 border-b-2 text-xs font-semibold select-none transition-all ${
                    isActive 
                      ? "border-b-[#7c3a2a] text-[#7c3a2a]" 
                      : "border-b-transparent text-stone-400"
                  } ${canClick ? "cursor-pointer hover:bg-[#FAF1EF]/30" : "cursor-not-allowed"}`}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isCompleted 
                      ? "bg-[#3B6D11] text-white" 
                      : isActive 
                        ? "bg-[#7c3a2a] text-white" 
                        : "bg-stone-100 text-stone-500"
                  }`}>
                    {isCompleted ? <Check className="w-3 h-3 stroke-[3]" /> : stepNum}
                  </div>
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          {/* Form scrollable workspace box */}
          <div className="p-6 max-h-[60vh] overflow-y-auto text-left space-y-5">
            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* ==================== STEP 1: ESSENTIALS ==================== */}
            {step === 1 && (
              <div className="space-y-4 animate-fade-in" style={{ animationDuration: "150ms" }}>
                <div>
                  <h3 className="text-[10px] uppercase font-bold tracking-wider text-stone-400 mb-2">The basics</h3>
                </div>

                {/* Field 1: Manuscript Selector */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-stone-700">Manuscript</label>
                  <select
                    value={selectedManuscriptId}
                    onChange={(e) => setSelectedManuscriptId(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7c3a2a] focus:border-[#7c3a2a]"
                  >
                    {manuscripts.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title} ({m.genre})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Field 2: Agent Live Selection search input */}
                <div className="space-y-1 relative">
                  <label className="block text-xs font-bold text-stone-700">Agent</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={agentSearchInput}
                      onChange={(e) => {
                        setAgentSearchInput(e.target.value);
                        setSelectedAgent(null);
                        setShowAgentSuggestions(true);
                      }}
                      onFocus={() => setShowAgentSuggestions(true)}
                      placeholder="Type to search literary agents..."
                      className="w-full text-xs p-2.5 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7c3a2a] focus:border-[#7c3a2a]"
                    />
                    {agentSearchInput && (
                      <button
                        onClick={() => {
                          setAgentSearchInput("");
                          setSelectedAgent(null);
                        }}
                        className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-700 text-xs font-bold"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Autocomplete Suggestion Dropdown */}
                  <AnimatePresence>
                    {showAgentSuggestions && agentSearchInput && !selectedAgent && (
                      <motion.div 
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-stone-200 rounded-lg shadow-xl z-20"
                      >
                        {matchingAgents.length === 0 ? (
                          <div className="p-3 text-xs text-stone-500 italic">No matching agents found in records</div>
                        ) : (
                          matchingAgents.map((ag) => (
                            <div
                              key={ag.id}
                              onClick={() => selectAgentOption(ag)}
                              className="p-2.5 hover:bg-stone-50 cursor-pointer text-xs flex justify-between items-center border-b border-stone-100 last:border-0"
                            >
                              <div>
                                <p className="font-bold text-stone-900">{ag.name}</p>
                                <p className="text-[10px] text-stone-500">{ag.agency}</p>
                              </div>
                              <span className="text-[9px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full font-semibold">
                                {ag.submissionStatus}
                              </span>
                            </div>
                          ))
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Selected Agent Summary Card */}
                  {selectedAgent && (
                    <div className="mt-3 bg-stone-50 border border-stone-200/90 rounded-xl p-3.5 flex items-center justify-between gap-4 animate-fade-in" style={{ animationDuration: "180ms" }}>
                      <div className="flex items-center gap-3">
                        {/* Circular Avatar initials */}
                        <div className="w-10 h-10 rounded-full bg-[#FAF1EF] border border-[#7c3a2a]/30 flex items-center justify-center text-[#7c3a2a] text-xs font-bold shrink-0">
                          {getInitials(selectedAgent.name)}
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-[#3a1c14]">{selectedAgent.name}</p>
                          <p className="text-[11px] text-stone-500">{selectedAgent.agency}</p>
                          <div className="flex items-center gap-1 mt-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star 
                                key={i}
                                className={`w-3.5 h-3.5 ${
                                  i < selectedAgent.starRating ? "fill-amber-400 text-amber-400" : "text-stone-200"
                                }`} 
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          selectedAgent.submissionStatus === "Open" 
                            ? "bg-[#EAF3DE] text-[#3B6D11]" 
                            : "bg-[#FAF1EF] text-[#7c3a2a]"
                        }`}>
                          {selectedAgent.submissionStatus}
                        </span>
                        <span className="text-[10px] bg-stone-200 text-stone-700 px-2 py-0.5 rounded-full font-bold">
                          {selectedAgent.submissionMethod}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Date Sent & Dispatch Method side by side */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-stone-700">Date sent</label>
                    <input
                      type="date"
                      value={dateSent}
                      onChange={(e) => setDateSent(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7c3a2a]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-stone-700">Send method</label>
                    <select
                      value={sendMethod}
                      onChange={(e) => setSendMethod(e.target.value as SubmissionMethod)}
                      className="w-full text-xs p-2.5 bg-white border border-stone-200 rounded-lg focus:outline-none"
                    >
                      <option value={SubmissionMethod.EMAIL}>Email</option>
                      <option value="Query Manager">Query Manager</option>
                      <option value={SubmissionMethod.ONLINE_FORM}>Online form</option>
                    </select>
                  </div>
                </div>

                {/* Field 5: Personalisation Notes */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-stone-700">Personalisation notes <span className="text-stone-400 font-normal text-[10px]">(optional)</span></label>
                  <textarea
                    value={personalizationNotes}
                    onChange={(e) => setPersonalizationNotes(e.target.value)}
                    placeholder="e.g. Referenced her MSWL post about gothic fiction..."
                    className="w-full text-xs p-2.5 bg-white border border-stone-200 rounded-lg focus:outline-none min-h-[75px]"
                  />
                </div>
              </div>
            )}

            {/* ==================== STEP 2: WHAT YOU SENT ==================== */}
            {step === 2 && (
              <div className="space-y-4 animate-fade-in" style={{ animationDuration: "150ms" }}>
                <div>
                  <h3 className="text-[10px] uppercase font-bold tracking-wider text-stone-400 mb-2">Materials sent</h3>
                </div>

                <div className="space-y-3">
                  {/* Material Row 1: Query Letter */}
                  <div className="border border-stone-200 rounded-xl overflow-hidden transition-all">
                    <div 
                      onClick={() => setQueryLetterChecked(!queryLetterChecked)}
                      className={`p-3.5 flex items-center justify-between cursor-pointer transition-colors ${
                        queryLetterChecked ? "bg-[#FBF6F4]" : "hover:bg-stone-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={queryLetterChecked}
                          onChange={(e) => {
                            e.stopPropagation();
                            setQueryLetterChecked(e.target.checked);
                          }}
                          className="w-4.5 h-4.5 rounded text-[#7c3a2a] bg-white accent-[#7c3a2a] focus:ring-[#7c3a2a] cursor-pointer"
                        />
                        <span className="text-xs font-bold text-[#3a1c14]">Query letter</span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setQueryLetterChecked(true);
                          qlFileInputRef.current?.click();
                        }}
                        className="flex items-center gap-1 text-[11px] font-semibold text-[#7c3a2a]/80 hover:text-[#7c3a2a] hover:underline"
                      >
                        <Paperclip className="w-3.5 h-3.5" />
                        <span>{queryLetterFile ? "Attached" : "Attach"}</span>
                      </button>
                    </div>

                    {/* Hidden Native File Input */}
                    <input 
                      type="file" 
                      ref={qlFileInputRef} 
                      onChange={(e) => handleFileChange("ql", e)}
                      className="hidden" 
                    />

                    {/* Expandable note and upload area */}
                    {queryLetterChecked && (
                      <div className="p-3.5 border-t border-stone-200/80 bg-white space-y-3">
                        <textarea
                          placeholder="Describe exactly what you sent — version, length, format..."
                          value={queryLetterNotes}
                          onChange={(e) => setQueryLetterNotes(e.target.value)}
                          className="w-full text-xs p-2 bg-stone-50/50 border border-stone-200 rounded-lg focus:outline-none min-h-[50px]"
                        />

                        {/* File Upload Zone */}
                        <div 
                          className="border border-dashed border-stone-300 rounded-lg p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[#FAF1EF]/10 transition-colors"
                          onDragOver={simulateDragOver}
                          onDrop={(e) => simulateFileDrop("ql", e)}
                          onClick={() => qlFileInputRef.current?.click()}
                        >
                          <Upload className="w-5 h-5 text-stone-400 mb-1" />
                          <p className="text-[11px] font-semibold text-stone-600">
                            {queryLetterFile ? `File: ${queryLetterFile}` : "Attach file — drag or click to upload"}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Material Row 2: Synopsis */}
                  <div className="border border-stone-200 rounded-xl overflow-hidden transition-all">
                    <div 
                      onClick={() => setSynopsisChecked(!synopsisChecked)}
                      className={`p-3.5 flex items-center justify-between cursor-pointer transition-colors ${
                        synopsisChecked ? "bg-[#FBF6F4]" : "hover:bg-stone-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={synopsisChecked}
                          onChange={(e) => {
                            e.stopPropagation();
                            setSynopsisChecked(e.target.checked);
                          }}
                          className="w-4.5 h-4.5 rounded text-[#7c3a2a] bg-white accent-[#7c3a2a] cursor-pointer"
                        />
                        <span className="text-xs font-bold text-[#3a1c14]">Synopsis</span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSynopsisChecked(true);
                          synFileInputRef.current?.click();
                        }}
                        className="flex items-center gap-1 text-[11px] font-semibold text-[#7c3a2a]/80 hover:text-[#7c3a2a]"
                      >
                        <Paperclip className="w-3.5 h-3.5" />
                        <span>{synopsisFile ? "Attached" : "Attach"}</span>
                      </button>
                    </div>

                    <input 
                      type="file" 
                      ref={synFileInputRef} 
                      onChange={(e) => handleFileChange("syn", e)}
                      className="hidden" 
                    />

                    {/* Expandable note and upload area */}
                    {synopsisChecked && (
                      <div className="p-3.5 border-t border-stone-200/80 bg-white space-y-3">
                        <textarea
                          placeholder="Describe exactly what you sent — version, length, format..."
                          value={synopsisNotes}
                          onChange={(e) => setSynopsisNotes(e.target.value)}
                          className="w-full text-xs p-2 bg-stone-50/50 border border-stone-200 rounded-lg focus:outline-none min-h-[50px]"
                        />

                        {/* File Upload Zone */}
                        <div 
                          className="border border-dashed border-stone-300 rounded-lg p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[#FAF1EF]/10"
                          onDragOver={simulateDragOver}
                          onDrop={(e) => simulateFileDrop("syn", e)}
                          onClick={() => synFileInputRef.current?.click()}
                        >
                          <Upload className="w-5 h-5 text-stone-400 mb-1" />
                          <p className="text-[11px] font-semibold text-stone-600">
                            {synopsisFile ? `File: ${synopsisFile}` : "Attach file — drag or click to upload"}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Material Row 3: Manuscript Sample */}
                  <div className="border border-stone-200 rounded-xl overflow-hidden transition-all">
                    <div 
                      onClick={() => setSamplePagesChecked(!samplePagesChecked)}
                      className={`p-3.5 flex items-center justify-between cursor-pointer transition-colors ${
                        samplePagesChecked ? "bg-[#FBF6F4]" : "hover:bg-stone-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={samplePagesChecked}
                          onChange={(e) => {
                            e.stopPropagation();
                            setSamplePagesChecked(e.target.checked);
                          }}
                          className="w-4.5 h-4.5 rounded text-[#7c3a2a] bg-white accent-[#7c3a2a] cursor-pointer"
                        />
                        <span className="text-xs font-bold text-[#3a1c14]">Manuscript sample</span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSamplePagesChecked(true);
                          spFileInputRef.current?.click();
                        }}
                        className="flex items-center gap-1 text-[11px] font-semibold text-[#7c3a2a]/80 hover:text-[#7c3a2a]"
                      >
                        <Paperclip className="w-3.5 h-3.5" />
                        <span>{samplePagesFile ? "Attached" : "Attach"}</span>
                      </button>
                    </div>

                    <input 
                      type="file" 
                      ref={spFileInputRef} 
                      onChange={(e) => handleFileChange("sp", e)}
                      className="hidden" 
                    />

                    {/* Expandable note and upload area */}
                    {samplePagesChecked && (
                      <div className="p-3.5 border-t border-stone-200/80 bg-white space-y-3">
                        <textarea
                          placeholder="Describe exactly what you sent — version, length, format..."
                          value={samplePagesNotes}
                          onChange={(e) => setSamplePagesNotes(e.target.value)}
                          className="w-full text-xs p-2 bg-stone-50/50 border border-stone-200 rounded-lg focus:outline-none min-h-[50px]"
                        />

                        {/* File Upload Zone */}
                        <div 
                          className="border border-dashed border-stone-300 rounded-lg p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[#FAF1EF]/10"
                          onDragOver={simulateDragOver}
                          onDrop={(e) => simulateFileDrop("sp", e)}
                          onClick={() => spFileInputRef.current?.click()}
                        >
                          <Upload className="w-5 h-5 text-stone-400 mb-1" />
                          <p className="text-[11px] font-semibold text-stone-600">
                            {samplePagesFile ? `File: ${samplePagesFile}` : "Attach file — drag or click to upload"}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Saved Package Split Divider */}
                <div className="flex items-center gap-4 py-2 select-none">
                  <div className="flex-1 h-[1px] bg-stone-200" />
                  <span className="text-[10px] text-stone-400 font-semibold uppercase">or select a saved package</span>
                  <div className="flex-1 h-[1px] bg-stone-200" />
                </div>

                {/* Browse Submission Packages button trigger */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowPackageBrowser(!showPackageBrowser)}
                    className="w-full p-3.5 border border-dashed border-stone-300 rounded-xl flex items-center justify-center gap-2 hover:bg-stone-50 cursor-pointer text-xs font-semibold text-stone-600 transition-colors"
                  >
                    <FolderOpen className="w-4.5 h-4.5 text-[#7c3a2a]" />
                    <span>
                      {selectedPackageName ? `Selected Package: "${selectedPackageName}"` : "Browse submission packages"}
                    </span>
                  </button>

                  <AnimatePresence>
                    {showPackageBrowser && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="absolute left-0 right-0 mt-1 max-h-52 overflow-y-auto bg-white border border-stone-200 rounded-lg shadow-2xl z-20 p-1.5"
                      >
                        {packages.filter(p => !selectedManuscriptId || p.manuscriptId === selectedManuscriptId).length === 0 ? (
                          <div className="p-4 text-center text-stone-400 italic text-xs">
                            No packages logged for this manuscript
                          </div>
                        ) : (
                          packages
                            .filter(p => !selectedManuscriptId || p.manuscriptId === selectedManuscriptId)
                            .map((pkg) => (
                              <div
                                key={pkg.id}
                                onClick={() => handlePackageSelect(pkg)}
                                className="p-2 hover:bg-stone-50 rounded-md cursor-pointer text-left border-b border-stone-100 last:border-0"
                              >
                                <p className="text-xs font-bold text-stone-900">{pkg.packageName}</p>
                                <p className="text-[10px] text-stone-400 capitalize">
                                  Manuscript ID: {pkg.manuscriptId} &middot; Created on {new Date(pkg.createdDate).toLocaleDateString()}
                                </p>
                              </div>
                            ))
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* ==================== STEP 3: RESPONSE TRACKING ==================== */}
            {step === 3 && (
              <div className="space-y-4 animate-fade-in animate-duration-200" style={{ animationDuration: "150ms" }}>
                <div>
                  <h3 className="text-[10px] uppercase font-bold tracking-wider text-stone-400 mb-2">Response tracking</h3>
                </div>

                {/* Expected Response Deadline Box: #FBF6F4 bg, #EBDCD3 border */}
                <div className="bg-[#FBF6F4] border border-[#EBDCD3] rounded-xl p-4 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <p className="text-stone-400 text-[11px] font-bold uppercase tracking-wider">Expected response deadline</p>
                    
                    {isEditingDeadline ? (
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="date"
                          value={responseDeadlineDate}
                          onChange={(e) => setResponseDeadlineDate(e.target.value)}
                          className="text-xs p-1 bg-white border border-stone-300 rounded focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setIsEditingDeadline(false)}
                          className="px-2 py-1 bg-[#7c3a2a] text-white text-[10px] rounded font-bold cursor-pointer"
                        >
                          Done
                        </button>
                      </div>
                    ) : (
                      <p className="text-[#7c3a2a] text-[15px] font-black tracking-wide">
                        {deadlineFormattedStr}
                      </p>
                    )}

                    <p className="text-[11px] text-stone-500 leading-normal italic">
                      Auto-calculated &middot; {selectedAgent?.name || "Agent"} responds in ~{selectedAgent?.responseTimeWeeks || 6} weeks
                    </p>
                  </div>

                  {!isEditingDeadline && (
                    <button
                      type="button"
                      onClick={() => setIsEditingDeadline(true)}
                      className="p-1.5 text-stone-400 hover:text-[#7c3a2a] rounded hover:bg-stone-100 transition-colors cursor-pointer shrink-0"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* If no response by deadline dropdown */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-stone-700">If no response by deadline</label>
                  <select
                    value={ifNoResponseAction}
                    onChange={(e) => setIfNoResponseAction(e.target.value as any)}
                    className="w-full text-xs p-2.5 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7c3a2a]"
                  >
                    <option value="nudge">Remind me to send a nudge</option>
                    <option value="close">Mark as closed</option>
                    <option value="nothing">Do nothing</option>
                  </select>
                </div>

                {/* Follow-up reminder timing if nudge selected */}
                {ifNoResponseAction === "nudge" && (
                  <div className="space-y-1 animate-fade-in" style={{ animationDuration: "100ms" }}>
                    <label className="block text-xs font-bold text-stone-700">When would you like the reminder?</label>
                    <select
                      value={nudgeReminderWhen}
                      onChange={(e) => setNudgeReminderWhen(e.target.value as any)}
                      className="w-full text-xs p-2.5 bg-white border border-stone-200 rounded-lg focus:outline-none"
                    >
                      <option value="week_before">One week before the deadline</option>
                      <option value="day_before">The day before the deadline</option>
                      <option value="on_deadline">On the deadline</option>
                    </select>
                  </div>
                )}

                {/* DYNAMIC CONFIRMATION STRIP BASED ON SELECTIONS */}
                <div className="mt-4">
                  {ifNoResponseAction === "nudge" && (
                    <div className="p-3 bg-[#EAF3DE] text-[#3B6D11] border border-[#d9ecd1] rounded-lg text-xs leading-relaxed flex items-start gap-2.5 animate-fade-in" style={{ animationDuration: "180ms" }}>
                      <FileCheck className="w-4.5 h-4.5 shrink-0 mt-0.5" />
                      <div>
                        A nudge reminder will appear in your task list{" "}
                        <strong>
                          {nudgeReminderWhen === "week_before" && "one week before"}
                          {nudgeReminderWhen === "day_before" && "one day before"}
                          {nudgeReminderWhen === "on_deadline" && "on the deadline"}
                        </strong>
                        , on <strong>{calculatedNudgeDateStr}</strong>.
                      </div>
                    </div>
                  )}

                  {ifNoResponseAction === "close" && (
                    <div className="p-3 bg-[#FBF6F4] text-[#7c3a2a] border border-[#EBDCD3] rounded-lg text-xs leading-relaxed flex items-start gap-2.5 animate-fade-in" style={{ animationDuration: "180ms" }}>
                      <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.1" />
                      <div>
                        If <strong>{selectedAgent?.name || "the agent"}</strong> hasn't responded by <strong>{deadlineFormattedStr}</strong>, this query will be automatically marked as closed.
                      </div>
                    </div>
                  )}

                  {ifNoResponseAction === "nothing" && (
                    <div className="p-3 bg-stone-50 text-stone-500 border border-stone-150 rounded-lg text-xs leading-relaxed flex items-start gap-2.5 animate-fade-in" style={{ animationDuration: "180ms" }}>
                      <Calendar className="w-4.5 h-4.5 shrink-0 text-stone-400 mt-0.5" />
                      <div>
                        No action will be taken when the deadline passes. You can update this query manually at any time.
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>

          {/* Form Footer area (always visible) */}
          <div className="p-[14px_24px] border-t border-stone-200/90 flex items-center justify-between bg-stone-50 select-none">
            {/* Back indicator (hidden on step 1) */}
            <div>
              {step > 1 ? (
                <button
                  type="button"
                  onClick={handleBackStep}
                  className="px-3.5 py-2 hover:bg-stone-100 flex items-center gap-1 text-xs font-semibold text-stone-500 rounded-lg transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
              ) : (
                <div />
              )}
            </div>

            {/* Cancel/Next Buttons */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={triggerClose}
                className="px-3.5 py-2 border border-stone-200 hover:bg-stone-150 hover:text-stone-700 text-stone-500 rounded-lg text-xs font-semibold transition-all cursor-pointer bg-white"
              >
                Cancel
              </button>

              {step < 3 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-4 py-2 bg-[#7c3a2a] hover:bg-[#7c3a2a]/95 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm cursor-pointer transition-all active:scale-98"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFormSubmit}
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#7c3a2a] hover:bg-[#5f2b1d] text-[#F8F5F0] rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-98"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? "Logging..." : "Log query"}</span>
                </button>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Discard confirmation dialog panel */}
      <AnimatePresence>
        {showDiscardConfirm && (
          <div 
            className="fixed inset-0 bg-stone-900/60 flex items-center justify-center p-4 z-[60] select-none text-left"
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              className="bg-white rounded-2xl max-w-sm w-full p-6 border border-stone-200 shadow-2xl relative"
            >
              <h3 className="font-serif text-[16px] font-bold text-[#3a1c14] mb-2 leading-tight">Discard this query?</h3>
              <p className="text-xs text-stone-500 mb-6 font-normal leading-normal">
                You have inputted data on this query entry. Closing now will permanently discard all details entered. This action cannot be undone.
              </p>
              
              <div className="flex items-center justify-end gap-2.5">
                <button
                  onClick={() => setShowDiscardConfirm(false)}
                  className="px-4 py-1.5 text-stone-600 hover:bg-stone-50 text-xs font-bold rounded-lg cursor-pointer border border-stone-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDiscard}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg cursor-pointer shadow-sm"
                >
                  Discard
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
