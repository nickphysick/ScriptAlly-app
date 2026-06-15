/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, CheckCircle2, ChevronRight, Book, ArrowUpRight, MessageSquare, Trash2, Lock, Clock, Send, Star 
} from "lucide-react";
import { useScriptAllyDb } from "../lib/db";
import { Query, QueryStatus, Activity, ActivityType, JournalEntry, Manuscript } from "../types";
import { getDynamicActivityText, replacePlaceholders, extractAgentFromText, boldAgentAndAgencyInText } from "../lib/activityUtils";
import { renderTimelineDot, getPillLabelAndDot } from "./TimelineDot";
import { STATUS_ORDER as chronologicalQueryStatuses } from "../lib/statusOrder";

const formatRichText = (str: string): React.ReactNode => {
  if (!str) return "";
  const tokens = str.split(/(\*\*[^*]+\*\*|\*[^*]+\*|__[^_]+__|_[^_]+_)/g);
  return (
    <>
      {tokens.map((token, i) => {
        if ((token.startsWith("**") && token.endsWith("**")) || (token.startsWith("__") && token.endsWith("__"))) {
          const content = token.slice(2, -2);
          return <strong key={i} className="font-bold text-[#7c3a2a]">{content}</strong>;
        }
        if ((token.startsWith("*") && token.endsWith("*")) || (token.startsWith("_") && token.endsWith("_"))) {
          const content = token.slice(1, -1);
          return <em key={i} className="italic text-stone-700/90">{content}</em>;
        }
        return token;
      })}
    </>
  );
};

// Helper to map final activity description back to QueryStatus on deletion
const mapActivityToQueryStatus = (description: string, activityType: ActivityType): QueryStatus => {
  const normalized = (description || "").toLowerCase();
  if (normalized.includes("offer of representation") || normalized.includes("congratulations") || normalized.includes("offer of submission")) {
    return QueryStatus.OFFER;
  }
  if (normalized.includes("revise and resubmit") || normalized.includes("r&r") || normalized.includes("revise")) {
    return QueryStatus.REVISE_RESUBMIT;
  }
  if (normalized.includes("full manuscript") && normalized.includes("sent")) {
    return QueryStatus.FULL_SENT;
  }
  if (normalized.includes("full manuscript") && normalized.includes("requested")) {
    return QueryStatus.FULL_REQUESTED;
  }
  if (normalized.includes("partial") && normalized.includes("sent")) {
    return QueryStatus.PARTIAL_SENT;
  }
  if (normalized.includes("partial") && normalized.includes("requested")) {
    return QueryStatus.PARTIAL_REQUESTED;
  }
  if (normalized.includes("rejected") || normalized.includes("rejection")) {
    return QueryStatus.REJECTED;
  }
  if (normalized.includes("withdrew") || normalized.includes("withdrawn")) {
    return QueryStatus.WITHDRAWN;
  }
  if (normalized.includes("no response") || normalized.includes("closed")) {
    return QueryStatus.NO_RESPONSE;
  }
  return QueryStatus.QUERIED; // default / initial query sent fallback
};

interface QuerySlideInPanelProps {
  isOpen: boolean;
  onClose: () => void;
  queryId: string | null;
  onNavigate: (tab: string, subPageName?: string) => void;
  onSaveStatusChange: (
    queryId: string,
    newStatus: QueryStatus,
    previousStatus: QueryStatus,
    notesText: string
  ) => void;
  onActivityDeleted?: () => void;
  /**
   * When provided, the panel's status control becomes a single "Record response" button that
   * opens the unified RecordResponseModal in the parent (instead of the legacy inline form).
   */
  onRecordResponse?: (queryId: string) => void;
}

export const QuerySlideInPanel: React.FC<QuerySlideInPanelProps> = ({
  isOpen,
  onClose,
  queryId,
  onNavigate,
  onSaveStatusChange,
  onActivityDeleted,
  onRecordResponse
}) => {
  const { 
    queries, agents, manuscripts, packages, activities, journalEntries, 
    updateQueryStatus, addJournalEntry, deleteActivity 
  } = useScriptAllyDb();

  const [activeTab, setActiveTab] = useState<"tracking" | "materials" | "journal">("tracking");
  
  // Transition Form States
  const [selectedNewStatus, setSelectedNewStatus] = useState<QueryStatus | "">("");
  const [rejectionType, setRejectionType] = useState<string>("");
  const [rejectionComments, setRejectionComments] = useState<string>("");
  const [withdrawalReason, setWithdrawalReason] = useState<string>("");
  const [withdrawalNotes, setWithdrawalNotes] = useState<string>("");

  // Deletion Confirmation States
  const [activityToDelete, setActivityToDelete] = useState<Activity | null>(null);

  // Journal Entry Input
  const [journalInputText, setJournalInputText] = useState<string>("");

  // Refs for scroll and escape keys
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !queryId) return null;

  // Retrieve matching entities
  const query = queries.find(q => q.id === queryId);
  if (!query) return null;

  const agent = agents.find(ag => ag.id === query.agentId);
  const manuscript = manuscripts.find(ms => ms.id === query.manuscriptId);
  const matchedPackage = packages.find(pkg => pkg.id === query.packageId);

  // Filter current query's activities
  const sortedActivities = [...activities]
    .filter(act => act.queryId === query.id)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Filter journal entries
  const sortedJournalEntries = [...journalEntries]
    .filter(j => j.queryId === query.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Available options for Transition Status
  const availableStatuses = Object.values(QueryStatus).filter(status => status !== query.status);

  // Direction and checks
  const currentIdx = chronologicalQueryStatuses.indexOf(query.status);
  const targetIdx = selectedNewStatus ? chronologicalQueryStatuses.indexOf(selectedNewStatus) : -1;

  let isSkip = false;
  let isBack = false;

  if (selectedNewStatus) {
    if (currentIdx !== -1 && targetIdx !== -1) {
      if (targetIdx < currentIdx) {
        isBack = true;
      } else if (targetIdx > currentIdx + 1) {
        isSkip = true;
      }
    } else if (targetIdx !== -1 && currentIdx === -1) {
      isBack = true;
    }
  }

  // Handle Save Trigger
  const isSaveActive = () => {
    if (!selectedNewStatus) return false;
    if (selectedNewStatus === QueryStatus.REJECTED) {
      return rejectionType !== "";
    }
    return true;
  };

  const handleSaveTransition = async () => {
    if (!selectedNewStatus) return;

    let notesCaptured = "";
    if (selectedNewStatus === QueryStatus.REJECTED) {
      notesCaptured = `Rejection Type: ${rejectionType}. ${rejectionComments ? "Comments: " + rejectionComments : ""}`;
    } else if (selectedNewStatus === QueryStatus.WITHDRAWN) {
      notesCaptured = `Reason: ${withdrawalReason}. ${withdrawalNotes ? "Notes: " + withdrawalNotes : ""}`;
    } else if (selectedNewStatus === QueryStatus.NO_RESPONSE) {
      notesCaptured = "Closed due to lack of agent response after nudge period.";
    }

    const previousStatus = query.status;
    const targetStatus = selectedNewStatus;

    // Reset Form inputs
    setSelectedNewStatus("");
    setRejectionType("");
    setRejectionComments("");
    setWithdrawalReason("");
    setWithdrawalNotes("");

    // Trigger save callback (dashboard will execute the actual status change & display the undo count)
    onSaveStatusChange(query.id, targetStatus, previousStatus, notesCaptured);
  };

  // Activity deletion logic
  const handleConfirmDeleteActivity = async (activityId: string) => {
    if (!activityToDelete) return;

    try {
      // 1. Delete actual record
      await deleteActivity(activityId);

      // 2. Filter local activities list to simulate remaining records
      const remainingActs = sortedActivities.filter(act => act.id !== activityId);
      
      if (remainingActs.length > 0) {
        // Sort newest first to easily obtain the last valid activity record
        const sortedRemaining = [...remainingActs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const lastActivity = sortedRemaining[0];

        // 3. Map this last activity status & revert the transition
        const mappedStatus = mapActivityToQueryStatus(lastActivity.description, lastActivity.activityType);
        
        await updateQueryStatus(query.id, mappedStatus, `Historical Correction: "${activityToDelete.description}" activity was deleted.`);
      }

      setActivityToDelete(null);

      if (onActivityDeleted) {
        onActivityDeleted();
      }
    } catch (e) {
      console.error("Failed to process activity deletion:", e);
    }
  };

  const handleAddJournalNote = async () => {
    if (!journalInputText.trim()) return;
    try {
      await addJournalEntry(query.id, journalInputText.trim());
      setJournalInputText("");
    } catch (e) {
      console.error("Failed to log journal entry:", e);
    }
  };

  return (
    <>
      {/* Background Overlay */}
      <div 
        onClick={onClose}
        className="fixed inset-0 z-50 transition-opacity duration-300"
        style={{ backgroundColor: "rgba(58,28,20,0.5)" }}
      />

      {/* Sliding Dialog Box */}
      <div 
        ref={panelRef}
        id="query-details-slidein-panel"
        className="fixed top-0 right-0 h-screen w-[480px] max-w-full bg-[#FAF8F5] shadow-2xl z-55 flex flex-col font-sans overflow-hidden border-l border-[#EBDCD3]"
      >
        {/* Banner header: Dark burgundy background */}
        <div className="bg-[#3a1c14] px-6 py-5 text-[#F8F5F0] relative select-none">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-stone-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <span className="text-[10px] font-mono tracking-widest text-[#FAC775] font-bold uppercase block mb-1">
            QUERY DETAILS RECORD
          </span>
          <h2 className="text-lg font-serif font-bold tracking-tight text-[#F8F5F0]">
            {agent ? agent.name : "Unmapped Agent"}
          </h2>
          <p className="text-xs text-[#F8F5F0]/60 mt-0.5 font-medium">
            {agent ? agent.agency : "Independent"}
          </p>

          <div className="flex items-center gap-3 mt-3">
            {/* Star Rating visualization */}
            <div className="flex items-center gap-0.5 text-[#FAC775]">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star 
                  key={i} 
                  className={`w-3.5 h-3.5 ${
                    i < (agent ? agent.starRating : 3) ? "fill-current" : "opacity-20"
                  }`} 
                />
              ))}
            </div>

            {/* Current status pill */}
            <span className="bg-[#7c3a2a] border border-[#EBDCD3]/10 text-white font-mono uppercase text-[9px] font-bold px-2 py-0.5 rounded-full tracking-wider">
              {query.status}
            </span>
          </div>
        </div>

        {/* Quick Transition update row */}
        <div className="bg-[#3a1c14]/98 border-t border-white/10 px-6 py-3.5 flex flex-col gap-2 relative">
          {onRecordResponse ? (
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-mono text-stone-300 uppercase font-bold tracking-wider select-none shrink-0">
                Update status
              </span>
              <button
                onClick={() => { onRecordResponse(query.id); onClose(); }}
                className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-[#FAC775] text-[#412402] hover:bg-[#ebd0a3] cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5"
              >
                Record response →
              </button>
            </div>
          ) : (
          <>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-mono text-stone-300 uppercase font-bold tracking-wider select-none shrink-0">
              Update status
            </span>
            <div className="flex items-center gap-1.5 flex-1 justify-end min-w-0">
              <select
                value={selectedNewStatus}
                onChange={(e) => setSelectedNewStatus(e.target.value as QueryStatus)}
                className="bg-stone-900 border border-white/15 text-white rounded-lg px-2.5 py-1 text-xs focus:ring-1 focus:ring-amber-500 font-medium cursor-pointer max-w-[180px] truncate"
              >
                <option value="">Move status...</option>
                {availableStatuses.map((stat) => (
                  <option key={stat} value={stat}>
                    {stat}
                  </option>
                ))}
              </select>
              <button
                onClick={handleSaveTransition}
                disabled={!isSaveActive()}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all shadow-inner whitespace-nowrap ${
                  isSaveActive() 
                    ? "bg-[#FAC775] text-[#412402] hover:bg-[#ebd0a3] cursor-pointer" 
                    : "bg-white/10 text-stone-400 cursor-not-allowed"
                }`}
              >
                Save
              </button>
            </div>
          </div>

          {/* Conditional Input Forms based on target newStatus */}
          <AnimatePresence>
            {selectedNewStatus === QueryStatus.REJECTED && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-black/25 rounded-lg p-3.5 pb-2.5 mt-2 flex flex-col gap-2 text-stone-200 border border-white/5 overflow-hidden"
              >
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-[#FAC775] uppercase block font-bold">
                    Rejection category *
                  </label>
                  <select
                    value={rejectionType}
                    onChange={(e) => setRejectionType(e.target.value)}
                    className="w-full bg-stone-900 border border-white/10 text-stone-200 rounded px-2 py-1 text-xs"
                    required
                  >
                    <option value="">Select rejection style...</option>
                    <option value="Personalised rejection — they commented on the work">
                      Personalised rejection
                    </option>
                    <option value="Form rejection — standard template">
                      Form rejection
                    </option>
                    <option value="No reason given">
                      No reason given
                    </option>
                  </select>
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-stone-300 uppercase block font-medium">
                    Agent's specific quotes/comments
                  </label>
                  <textarea
                    placeholder="Enter any feedback or agent notes here..."
                    value={rejectionComments}
                    onChange={(e) => setRejectionComments(e.target.value)}
                    className="w-full bg-stone-900 border border-white/10 text-stone-200 rounded px-2 py-1 text-xs resize-none h-14"
                  />
                </div>

                <div className="bg-amber-950/40 border border-amber-500/10 text-[10px] text-amber-300 font-mono px-2 py-1.5 rounded mt-0.5 leading-snug">
                  This query will be closed. The agent and manuscript records will remain unchanged.
                </div>
              </motion.div>
            )}

            {selectedNewStatus === QueryStatus.WITHDRAWN && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-black/25 rounded-lg p-3.5 pb-2.5 mt-2 flex flex-col gap-2 text-stone-200 border border-white/5 overflow-hidden"
              >
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-[#FAC775] uppercase block font-bold">
                    Withdrawal Reason
                  </label>
                  <select
                    value={withdrawalReason}
                    onChange={(e) => setWithdrawalReason(e.target.value)}
                    className="w-full bg-stone-900 border border-white/10 text-stone-200 rounded px-2 py-1 text-xs font-medium cursor-pointer"
                  >
                    <option value="">Select withdrawal reason...</option>
                    <option value="Withdrew to revise">Withdrew to revise</option>
                    <option value="Accepted offer elsewhere">Accepted offer elsewhere</option>
                    <option value="Agent closed to submissions">Agent closed to submissions</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-stone-300 uppercase block font-medium">
                    Withdrawal Notes (optional)
                  </label>
                  <textarea
                    placeholder="Provide additional details or context..."
                    value={withdrawalNotes}
                    onChange={(e) => setWithdrawalNotes(e.target.value)}
                    className="w-full bg-stone-900 border border-white/10 text-stone-200 rounded px-2 py-1 text-xs resize-none h-14"
                  />
                </div>
              </motion.div>
            )}

            {selectedNewStatus === QueryStatus.NO_RESPONSE && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-[#3a1d14] rounded-lg p-2.5 pb-2 mt-1.5"
              >
                <div className="bg-amber-500/15 border border-amber-500/25 text-[10px] text-amber-200 font-mono px-3 py-2 rounded leading-snug">
                  No response period elapsed. This record will be marked as closed to keep active lists pristine.
                </div>
              </motion.div>
            )}

            {selectedNewStatus && isSkip && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-[#3a1d14] rounded-lg p-2.5 pb-2 mt-1.5"
              >
                <div className="bg-amber-500/15 border border-amber-500/25 text-[10px] text-amber-200 font-mono px-3 py-2 rounded leading-snug">
                  We'll record the intermediate stages automatically — you can update the details later.
                </div>
              </motion.div>
            )}

            {selectedNewStatus && isBack && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-[#3a1d14] rounded-lg p-2.5 pb-2 mt-1.5"
              >
                <div className="bg-amber-500/15 border border-amber-500/25 text-[10px] text-amber-200 font-mono px-3 py-2 rounded leading-snug">
                  You're moving this query back to {selectedNewStatus}. The existing activity records will remain in the timeline for accuracy.
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          </>
          )}
        </div>

        {/* Tab Selection Area */}
        <div className="border-b border-[#EBDCD3] flex bg-[#F0EDE6] select-none text-[11px] font-mono tracking-wider font-bold text-stone-500">
          <button
            onClick={() => setActiveTab("tracking")}
            className={`flex-1 py-3 text-center transition-all ${
              activeTab === "tracking"
                ? "bg-[#FAF8F5] text-[#7c3a2a] border-b-2 border-b-[#7c3a2a]"
                : "hover:bg-stone-100 hover:text-stone-700"
            }`}
          >
            TRACKING HISTORY
          </button>
          
          <button
            onClick={() => setActiveTab("materials")}
            className={`flex-1 py-3 text-center transition-all ${
              activeTab === "materials"
                ? "bg-[#FAF8F5] text-[#7c3a2a] border-b-2 border-b-[#7c3a2a]"
                : "hover:bg-stone-100 hover:text-stone-700"
            }`}
          >
            WHAT YOU SENT
          </button>

          <button
            onClick={() => setActiveTab("journal")}
            className={`flex-1 py-3 text-center transition-all ${
              activeTab === "journal"
                ? "bg-[#FAF8F5] text-[#7c3a2a] border-b-2 border-b-[#7c3a2a]"
                : "hover:bg-stone-100 hover:text-stone-700"
            }`}
          >
            JOURNAL ({sortedJournalEntries.length})
          </button>
        </div>

        {/* Panel Container body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0 bg-[#FAF8F5]">
          <AnimatePresence mode="wait">
            {/* Tab 1 - TRACKING HISTORY */}
            {activeTab === "tracking" && (
              <motion.div
                key="tracking"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="space-y-4"
              >
                {activityToDelete ? (
                  /* Red deletion confirmation panel replacing standard timeline view */
                  <div className="bg-red-50/50 border border-red-200 rounded-xl p-5 text-left space-y-4 animate-fade-in shadow-2xs">
                    <div className="flex items-center gap-2 text-red-800">
                      <Trash2 className="w-5 h-5" />
                      <h4 className="font-bold text-sm">Delete Activity Record?</h4>
                    </div>

                    <div className="border-l-4 border-red-500 pl-3.5 py-2 bg-white rounded-lg border-t border-r border-b">
                      <p className="font-semibold text-xs text-stone-800">
                        {activityToDelete.description}
                      </p>
                      <p className="text-stone-400 mt-1 text-[10px] font-mono">
                        {new Date(activityToDelete.date).toLocaleString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </p>
                    </div>

                    <div className="space-y-2 text-[11.5px] text-red-950 font-medium">
                      <p className="font-bold text-red-900">Deletion Consequences:</p>
                      <ul className="list-disc list-inside space-y-1 text-stone-600 font-light font-sans pl-1">
                        <li>The activity record will be permanently deleted from database ledger.</li>
                        <li>The query status will automatically revert to match the most recent remaining stage.</li>
                        <li>Dependent records or companion tasks will not be modified automatically.</li>
                      </ul>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => setActivityToDelete(null)}
                        className="flex-1 py-2 border border-stone-200 rounded-xl text-xs font-bold hover:bg-stone-50 text-stone-700 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleConfirmDeleteActivity(activityToDelete.id)}
                        className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      >
                        Delete record
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Chronological vertical timeline feed */
                  <div className="relative pl-8 space-y-6">
                    {/* Vertical connecting line */}
                    {sortedActivities.length > 1 && (
                      <div className="absolute left-[9.5px] top-3.5 bottom-3.5 w-[1.5px] bg-[#E1D7D0] z-0" />
                    )}

                    {sortedActivities.map((act, index) => {
                      const isFirst = index === 0;
                      const isLast = index === sortedActivities.length - 1;
                      const { label, dot, show, key } = getPillLabelAndDot(act.description, act.activityType, act.resultingStatus);
                      const formattedTime = new Date(act.date).toLocaleDateString("en-US", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      });

                      const ms = manuscript || manuscripts[0];
                      const msTitle = ms ? ms.title : "";
                      const showManuscriptPill = (() => {
                        const isAgentAct = act.activityType === ActivityType.AGENT_ADDED || act.activityType === ActivityType.AGENT_UPDATED;
                        if (isAgentAct) {
                          if (!key) return true;
                          const msShowVal = localStorage.getItem(`sc_custom_ms_show_${key}`);
                          return msShowVal !== "false";
                        }
                        if (!msTitle) return false;
                        if (!key) return true;
                        const msShowVal = localStorage.getItem(`sc_custom_ms_show_${key}`);
                        return msShowVal !== "false";
                      })();

                      const resolvedAgent = agent || extractAgentFromText(act.description);

                      const manuscriptPillContent = (() => {
                        if (!showManuscriptPill) return null;
                        const customLabel = key ? localStorage.getItem(`sc_custom_ms_label_${key}`) : null;
                        
                        let defaultTemplate = "{Manuscript Title}";
                        if (act.activityType === ActivityType.AGENT_ADDED || act.activityType === ActivityType.AGENT_UPDATED) {
                          defaultTemplate = "[agent full name] at [agency name]";
                        }
                        
                        const templateText = (customLabel && customLabel.trim()) ? customLabel : defaultTemplate;
                        
                        return replacePlaceholders(
                          templateText,
                          msTitle,
                          resolvedAgent ? { name: resolvedAgent.name, agency: resolvedAgent.agency } : null,
                          query,
                          act.details
                        );
                      })();

                      const { description: displayDesc, details: displayDetails } = getDynamicActivityText(
                        act,
                        key,
                        msTitle,
                        agent ? { name: agent.name, agency: agent.agency } : null,
                        query
                      );

                      const boldedDesc = boldAgentAndAgencyInText(
                        displayDesc,
                        resolvedAgent?.name,
                        resolvedAgent?.agency
                      );

                      const displayPillLabel = replacePlaceholders(
                        label,
                        msTitle,
                        agent ? { name: agent.name, agency: agent.agency } : null,
                        query,
                        act.details
                      );

                      return (
                        <div 
                          key={act.id} 
                          className="relative flex items-start gap-3 group/item animate-fade-in"
                        >
                          {/* Dot wrapper */}
                          <div className="absolute -left-[32px] pt-1 z-10 shrink-0 select-none">
                            {/* Most recent completed stage has solid highlighted ring around dot */}
                            <span className={`w-5 h-5 flex items-center justify-center rounded-full bg-white border ${
                              isLast ? "border-[#7c3a2a] ring-2 ring-[#7c3a2a]/10" : "border-stone-200"
                            }`}>
                              {dot}
                            </span>
                          </div>

                          {/* Detail block */}
                          <div className="flex-1 min-w-0 pr-1 select-none text-left">
                            {show && (
                              <span className="text-[9px] font-mono uppercase tracking-wider text-[#7c3a2a]/70 font-bold block mb-0.5">
                                {formatRichText(displayPillLabel)}
                              </span>
                            )}
                            <p className="text-xs text-stone-800 font-normal leading-normal">
                              {formatRichText(boldedDesc)}
                            </p>
                            {displayDetails && (
                              <p className="text-[10.5px] text-stone-500 font-sans mt-0.5 leading-relaxed">
                                {formatRichText(displayDetails)}
                              </p>
                            )}
                            {manuscriptPillContent && (
                              <div className="flex mt-1">
                                <span className="inline-block text-[9.5px] text-[#7c3a2a] bg-[#FAF1EF] font-semibold px-2 py-0.5 rounded-full border border-[#F2DDD5]/40 shadow-2xs">
                                  {formatRichText(manuscriptPillContent)}
                                </span>
                              </div>
                            )}
                            <span className="text-[10px] text-stone-400 font-medium block mt-1 font-mono">
                              {formattedTime}
                            </span>
                          </div>

                          {/* Hover action delete/lock controls */}
                          <div className="shrink-0 pt-0.5 transition-opacity duration-150 opacity-0 group-hover/item:opacity-100">
                            {isFirst ? (
                              <div 
                                className="flex items-center gap-1 text-[9px] font-mono text-stone-400 select-none cursor-not-allowed bg-stone-100 border border-stone-200/50 px-2 py-1 rounded-md"
                                title="Cannot delete — initial query record"
                              >
                                <Lock className="w-3 h-3 text-stone-400 shrink-0" />
                                <span>Initial</span>
                              </div>
                            ) : (
                              <button
                                onClick={() => setActivityToDelete(act)}
                                className="flex items-center gap-1.5 text-[9px] font-mono text-red-600 hover:text-red-800 bg-red-50 border border-red-100 hover:bg-red-100/60 px-2 py-1 rounded-md transition-colors cursor-pointer font-bold"
                                title="Delete this timeline entry"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Delete</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Derived future-projection nodes (NON-stored — never enter the log, recompute,
                        the response count, or the deletable list). Only dates still in the future
                        render; ordered by date so they read chronologically at the bottom of the
                        oldest-first feed. */}
                    {(() => {
                      const nowMs = Date.now();
                      const derived: { kind: "response" | "followup"; date: Date }[] = [];
                      if (query.responseDeadline) {
                        const d = new Date(query.responseDeadline);
                        if (!isNaN(d.getTime()) && d.getTime() > nowMs) derived.push({ kind: "response", date: d });
                      }
                      if (query.nudgeDate) {
                        const d = new Date(query.nudgeDate);
                        if (!isNaN(d.getTime()) && d.getTime() > nowMs) derived.push({ kind: "followup", date: d });
                      }
                      derived.sort((a, b) => a.date.getTime() - b.date.getTime());
                      return derived.map((node) => {
                        const dateStr = node.date.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
                        if (node.kind === "followup") {
                          return (
                            <div key="derived-followup" className="relative flex items-start gap-3 animate-fade-in">
                              <div className="absolute -left-[32px] pt-1 z-10 shrink-0 select-none">
                                <span className="w-5 h-5 flex items-center justify-center rounded-full bg-white border-2 border-dashed border-[#7c3a2a]/45">
                                  {renderTimelineDot("Nudge sent")}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="inline-flex items-center gap-1.5 py-0.5 px-2 bg-[#FAF1EF] border border-[#f2ddd5] text-[#7c3a2a] rounded-md text-[10px] font-mono tracking-wide font-bold uppercase select-none">
                                  <Clock className="w-3 h-3 text-[#7c3a2a]" />
                                  <span>Follow-up reminder</span>
                                </div>
                                <p className="text-xs font-medium mt-1 leading-normal text-stone-500">
                                  Next nudge planned for {dateStr}
                                </p>
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div key="derived-response" className="relative flex items-start gap-3 animate-fade-in">
                            <div className="absolute -left-[32px] pt-1 z-10 shrink-0 select-none">
                              <span className="w-5 h-5 flex items-center justify-center rounded-full bg-white border-2 border-dashed border-amber-500">
                                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="inline-flex items-center gap-1.5 py-0.5 px-2 bg-amber-50 border border-amber-200 text-[#412402] rounded-md text-[10px] font-mono tracking-wide font-bold uppercase select-none">
                                <Clock className="w-3 h-3 text-amber-500" />
                                <span>Response Expected</span>
                              </div>
                              <p className="text-xs font-medium mt-1 leading-normal text-stone-500">
                                Deadline expected on {dateStr}
                              </p>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </motion.div>
            )}

            {/* Tab 2 - WHAT YOU SENT */}
            {activeTab === "materials" && (
              <motion.div
                key="materials"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="space-y-4"
              >
                {/* 1. Manuscript details */}
                <div className="bg-[#FAF8F5] border border-[#EBDCD3] rounded-2xl p-4 shadow-3xs space-y-3 relative">
                  <div className="flex items-center gap-2 select-none">
                    <Book className="w-4 h-4 text-[#CD4E46]" />
                    <span className="text-[9px] font-mono font-bold tracking-wider text-[#7c3a2a] uppercase">Manuscript Identity</span>
                  </div>
                  <div>
                    <h4 className="font-serif text-sm font-bold text-[#3a1c14] tracking-tight">{manuscript ? manuscript.title : "Unmapped Manuscript"}</h4>
                    <p className="text-[11px] text-stone-500 leading-relaxed font-light mt-1">{manuscript ? manuscript.logline : "No logline established."}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-3.5 border-t border-[#EBDCD3]/60 font-mono text-[9.5px]">
                    <div>
                      <span className="text-stone-400 block pb-0.5">GENRE</span>
                      <span className="font-bold text-[#3a1c14]">{manuscript ? manuscript.genre : "General Fiction"}</span>
                    </div>
                    <div>
                      <span className="text-stone-400 block pb-0.5">WORD COUNT</span>
                      <span className="font-bold text-[#3a1c14]">{manuscript ? manuscript.wordCount.toLocaleString() : "0"} words</span>
                    </div>
                  </div>
                </div>

                {/* 2. Materials sent checklist */}
                <div className="bg-[#FAF8F5] border border-[#EBDCD3] rounded-2xl p-4 shadow-3xs space-y-2.5">
                  <span className="text-[9px] font-mono font-bold tracking-wider text-stone-400 uppercase select-none block">
                    Submission Materials Checklist Sent
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(() => {
                      const mats = agent?.materialsWanted || [];
                      if (mats.length === 0) {
                        return <span className="text-xs text-stone-400 italic">No checklist elements defined.</span>;
                      }
                      return mats.map((m, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1.5 py-1 px-2.5 bg-emerald-50 text-[10.5px] text-[#3B6D11] border border-emerald-100 rounded-lg font-semibold shadow-4xs select-none">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{m}</span>
                        </span>
                      ));
                    })()}
                  </div>
                </div>

                {/* 3. Compilation package */}
                <div className="bg-[#FAF8F5] border border-[#EBDCD3] rounded-2xl p-4 shadow-3xs space-y-1.5 font-sans">
                  <span className="text-[9px] font-mono font-bold tracking-wider text-stone-400 uppercase select-none block">
                    Submission package configuration
                  </span>
                  <p className="text-xs text-[#3a1c14] font-bold">
                    {matchedPackage ? matchedPackage.packageName : "Custom Dispatch letter package"}
                  </p>
                </div>

                {/* 4. Pitch personalization notes */}
                <div className="bg-[#FAF8F5] border border-[#EBDCD3] rounded-2xl p-4 shadow-3xs space-y-2">
                  <span className="text-[9px] font-mono font-bold tracking-wider text-stone-400 uppercase select-none block text-stone-400">
                    Personalisation query hook notes
                  </span>
                  <p className="text-xs font-light italic text-[#3a1c14] leading-relaxed">
                    "{query.personalisationNotes || "No custom query personalization notes logged."}"
                  </p>
                </div>
              </motion.div>
            )}

            {/* Tab 3 - JOURNAL NOTES */}
            {activeTab === "journal" && (
              <motion.div
                key="journal"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="flex flex-col h-full space-y-4"
              >
                {/* Journal posts timeline */}
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[380px] pr-1">
                  {sortedJournalEntries.map((entry) => (
                    <div key={entry.id} className="p-3.5 bg-white border border-[#EBDCD3] rounded-2xl shadow-4xs animate-fade-in relative">
                      <span className="block text-[9.5px] text-stone-400 font-mono font-medium">
                        {new Date(entry.createdAt).toLocaleString("en-GB", { 
                          day: "numeric", 
                          month: "short", 
                          year: "numeric", 
                          hour: "2-digit", 
                          minute: "2-digit" 
                        })}
                      </span>
                      <p className="text-xs text-[#3a1c14] font-light leading-relaxed mt-1.5">
                        {entry.entryText}
                      </p>
                    </div>
                  ))}

                  {sortedJournalEntries.length === 0 && (
                    <div className="text-center py-12 text-stone-400 text-xs italic space-y-3">
                      <MessageSquare className="w-10 h-10 text-stone-300 mx-auto opacity-70" />
                      <p>No journal entries found. Document conversations, status logs, or research for reference here.</p>
                    </div>
                  )}
                </div>

                {/* Adding entries pinned toolbar input */}
                <div className="border-t border-[#EBDCD3]/80 pt-4 flex flex-col gap-2 bg-[#FAF8F5] z-10 shrink-0">
                  <textarea
                    placeholder="Document a call, write reminders, log details..."
                    value={journalInputText}
                    onChange={(e) => setJournalInputText(e.target.value)}
                    className="w-full bg-white border border-[#EBDCD3] text-[#3a1c14] text-xs rounded-xl px-3 py-2 focus:ring-1 focus:ring-[#7c3a2a] resize-none h-18 text-stone-700 shadow-4xs font-sans font-light"
                  />
                  <button
                    onClick={handleAddJournalNote}
                    disabled={!journalInputText.trim()}
                    className={`py-2 px-4 text-xs font-bold rounded-xl transition-all inline-flex items-center justify-center gap-1.5 ${
                      journalInputText.trim()
                        ? "bg-[#7c3a2a] hover:bg-[#632e22] text-white cursor-pointer hover:shadow-sm"
                        : "bg-stone-100 text-stone-400 cursor-not-allowed border border-stone-250"
                    }`}
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Add note</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Locked Footer Row */}
        <div className="bg-[#F0EDE6] border-t border-[#EBDCD3] px-6 py-4 shrink-0 flex items-center justify-between z-10 select-none text-xs">
          <div className="flex items-center gap-2 text-stone-600 font-semibold min-w-0 flex-1 mr-2">
            <Book className="w-4 h-4 text-[#CD4E46] shrink-0" />
            <span className="truncate max-w-[200px]" title={manuscript ? manuscript.title : "Unmapped novel"}>
              {manuscript ? manuscript.title : "No Novel Assigned"}
            </span>
          </div>
          
          <button
            onClick={() => {
              // Pre-select the query and close panel. Navigates to queries page
              onNavigate("queries", query.id);
              onClose();
            }}
            className="text-[#7c3a2a] hover:text-[#5c2a1e] font-bold duration-150 inline-flex items-center gap-1 relative group/btn hover:underline cursor-pointer select-none"
          >
            <span>View full query</span>
            <ArrowUpRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
          </button>
        </div>
      </div>
    </>
  );
};
