/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useScriptAllyDb } from "../lib/db";
import { UserPlan, QueryStatus, ManuscriptStatus, ActivityType, Query, Task, CommunityAgent, Manuscript } from "../types";
import { 
  doc, 
  updateDoc, 
  increment, 
  onSnapshot, 
  collection, 
  query, 
  orderBy, 
  limit 
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { ActivityCopyCustomizer } from "./ActivityCopyCustomizer";
import { QuerySlideInPanel } from "./QuerySlideInPanel";
import { CalendarView } from "./CalendarView";
import { StatusPill, StatusCircle } from "./StatusPill";
import { getDynamicActivityText, replacePlaceholders, extractAgentFromText, boldAgentAndAgencyInText } from "../lib/activityUtils";
import {
  Sparkles,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  FileCheck,
  ChevronRight,
  ChevronLeft,
  Bookmark,
  Calendar,
  AlertCircle,
  HelpCircle,
  Clock,
  Send,
  Users,
  MessageSquare,
  CheckCircle2,
  CheckSquare,
  Check,
  X,
  Zap,
  PlusCircle,
  Plus,
  Compass,
  Database,
  Lightbulb,
  Upload,
  Camera,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import { seedQuotes, seedFacts } from "../lib/seeds";

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

const renderTimelineDot = (label: string) => {
  const radius = 17;
  const center = 20;

  const getPiePath = (pct: number) => {
    if (pct <= 0 || pct >= 100) return "";
    const startAngle = -Math.PI / 2; // 12 o'clock
    const angleDiff = (pct / 100) * 2 * Math.PI;
    const endAngle = startAngle + angleDiff;
    
    const startX = center + radius * Math.cos(startAngle);
    const startY = center + radius * Math.sin(startAngle);
    const endX = center + radius * Math.cos(endAngle);
    const endY = center + radius * Math.sin(endAngle);
    
    const largeArcFlag = pct > 50 ? 1 : 0;
    return `M ${center} ${center} L ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;
  };

  if (label === "Query sent") {
    return (
      <svg width="13" height="13" viewBox="0 0 40 40" className="shrink-0 text-[#7c3a2a]">
        <circle cx={center} cy={center} r={radius} stroke="currentColor" strokeWidth="3.5" fill="#ffffff" />
      </svg>
    );
  }
  if (label === "Partial requested" || label === "Partial sent") {
    return (
      <svg width="13" height="13" viewBox="0 0 40 40" className="shrink-0 text-[#7c3a2a]">
        <circle cx={center} cy={center} r={radius} stroke="currentColor" strokeWidth="3.5" fill="#ffffff" />
        <path d={getPiePath(50)} fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (label === "Full requested" || label === "Full sent" || label === "Materials sent") {
    return (
      <svg width="13" height="13" viewBox="0 0 40 40" className="shrink-0 text-[#7c3a2a]">
        <circle cx={center} cy={center} r={radius} stroke="currentColor" strokeWidth="3.5" fill="#ffffff" />
        <path d={getPiePath(75)} fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (label === "Offer received") {
    return (
      <svg width="13" height="13" viewBox="0 0 40 40" className="shrink-0 text-emerald-600">
        <circle cx={center} cy={center} r={radius} fill="currentColor" stroke="none" />
        <path d="M 14,20 L 18,24 L 26,16" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    );
  }
  if (label === "Revise & resubmit") {
    return (
      <svg width="13" height="13" viewBox="0 0 40 40" className="shrink-0 text-amber-500">
        <circle cx={center} cy={center} r={radius} stroke="currentColor" strokeWidth="3.5" fill="#ffffff" />
        <path d={getPiePath(50)} fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (label === "Rejection" || label === "Withdrawn" || label === "Now closed" || label === "Shelved") {
    return (
      <svg width="13" height="13" viewBox="0 0 40 40" className="shrink-0 text-stone-500 opacity-60">
        <circle cx={center} cy={center} r={radius} fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (label === "Nudge sent") {
    return (
      <svg width="13" height="13" viewBox="0 0 40 40" className="shrink-0 text-[#7c3a2a]">
        <circle cx={center} cy={center} r={radius} stroke="currentColor" strokeWidth="3.5" fill="#ffffff" />
        <path d="M 20,11 L 20,20 L 26,20" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    );
  }
  if (label === "Now open" || label === "Ready to query") {
    return (
      <svg width="13" height="13" viewBox="0 0 40 40" className="shrink-0 text-emerald-600">
        <circle cx={center} cy={center} r={radius} fill="currentColor" stroke="none" />
      </svg>
    );
  }
  // fallback "Status changed"
  return (
    <svg width="13" height="13" viewBox="0 0 40 40" className="shrink-0 text-[#7c3a2a]">
      <circle cx={center} cy={center} r={radius} stroke="currentColor" strokeWidth="3.5" fill="#ffffff" />
    </svg>
  );
};

const getPillLabelAndDot = (desc: string, activityType?: ActivityType) => {
  const normalized = (desc || "").toLowerCase();
  
  let key: string | null = null;
  let defaultLabel = "Status changed";

  if (activityType !== undefined) {
    if (activityType === ActivityType.AGENT_ADDED) {
      key = "agent_added";
      defaultLabel = "Agent added";
    }
    else if (activityType === ActivityType.AGENT_UPDATED) {
      key = "agent_updated";
      defaultLabel = "Agent updated";
      if (normalized.includes("open to submissions")) {
        defaultLabel = "Now open";
      } else if (normalized.includes("closed to submissions")) {
        defaultLabel = "Now closed";
      } else if (normalized.includes("rating")) {
        defaultLabel = "Rating updated";
      } else if (normalized.includes("wishlist")) {
        defaultLabel = "MSWL updated";
      }
    }
    else if (activityType === ActivityType.MANUSCRIPT_ADDED) {
      key = "ms_added";
      defaultLabel = "Manuscript added";
    }
    else if (activityType === ActivityType.MANUSCRIPT_UPDATED) {
      key = "ms_updated";
      defaultLabel = "Manuscript updated";
      if (normalized.includes("ready to query")) {
        defaultLabel = "Ready to query";
      } else if (normalized.includes("shelved")) {
        defaultLabel = "Shelved";
      }
    }
  }

  if (!key) {
    if (normalized.includes("query sent") || normalized.includes("dispatched")) {
      key = "queried";
      defaultLabel = "Query sent";
    } else if (normalized.includes("partial") && normalized.includes("requested")) {
      key = "partial_req";
      defaultLabel = "Partial requested";
    } else if (normalized.includes("partial") && normalized.includes("sent")) {
      key = "partial_sent";
      defaultLabel = "Partial sent";
    } else if (normalized.includes("full manuscript") && normalized.includes("requested")) {
      key = "full_req";
      defaultLabel = "Full requested";
    } else if (normalized.includes("full manuscript") && normalized.includes("sent")) {
      key = "full_sent";
      defaultLabel = "Full sent";
    } else if (normalized.includes("offer of representation") || normalized.includes("congratulations")) {
      key = "offer";
      defaultLabel = "Offer received";
    } else if (normalized.includes("revise and resubmit") || normalized.includes("r&r")) {
      key = "rr";
      defaultLabel = "Revise & resubmit";
    } else if (normalized.includes("rejected") || normalized.includes("rejection")) {
      key = "rejected";
      defaultLabel = "Rejection";
    } else if (normalized.includes("withdrew") || normalized.includes("withdrawn")) {
      key = "withdrawn";
      defaultLabel = "Withdrawn";
    } else if (normalized.includes("nudge")) {
      key = "nudge_sent";
      defaultLabel = "Nudge sent";
    } else if (normalized.includes("no response") || normalized.includes("timeout")) {
      key = "no_response";
      defaultLabel = "Status changed";
    } else if (normalized.includes("materials sent") || normalized.includes("transmitted")) {
      defaultLabel = "Materials sent";
    }
  }

  let show = true;
  let customLabel = "";

  if (key) {
    const showVal = localStorage.getItem(`sc_custom_pill_show_${key}`);
    if (showVal === "false") {
      show = false;
    }
    customLabel = localStorage.getItem(`sc_custom_pill_label_${key}`) || "";
  }

  const label = customLabel || defaultLabel;
  const dot = renderTimelineDot(label);

  return { label, dot, show, key };
};

const getPriorityRank = (task: Task) => {
  if (task.priority === "urgent") return 1;
  if (task.priority === "overdue") return 2;
  return 3;
};

const getTaskActionLabel = (task: Task) => {
  if (task.taskType === "partial_requested" || task.taskType === "full_requested") {
    return "Send now";
  }
  if (task.taskType === "nudge_overdue") {
    return "Log nudge";
  }
  return "View";
};

const getTaskContextInfo = (
  task: Task,
  queries: any[],
  agents: any[],
  manuscripts: any[]
) => {
  let agentName = "";
  let agency = "";
  let manuscriptTitle = task.manuscriptTitle || "";

  if (
    task.taskType === "offer_received" || 
    task.taskType === "partial_requested" || 
    task.taskType === "full_requested" || 
    task.taskType === "revise_resubmit" || 
    task.taskType === "nudge_overdue" ||
    task.taskType === "no_response_close"
  ) {
    const q = queries.find(item => item.id === task.relatedRecordId);
    if (q) {
      const a = agents.find(ag => ag.id === q.agentId);
      if (a) {
        agentName = a.name;
        agency = a.agency;
      }
      const m = manuscripts.find(ms => ms.id === q.manuscriptId);
      if (m) {
        manuscriptTitle = m.title;
      }
    }
  } else if (task.taskType === "querying_unstarted") {
    const m = manuscripts.find(ms => ms.id === task.relatedRecordId);
    if (m) {
      manuscriptTitle = m.title;
    }
  } else if (task.taskType === "dream_agent_unqueried" || task.taskType === "data_quality_poor") {
    const a = agents.find(ag => ag.id === task.relatedRecordId);
    if (a) {
      agentName = a.name;
      agency = a.agency;
    }
  }

  return { agentName, agency, manuscriptTitle };
};

const TaskPanelCard: React.FC<{
  task: Task;
  onNavigate: (tab: string, subPageName?: string) => void;
  dismissTask: (taskType: string, relatedRecordId: string, dismissType: "permanent" | "fixed snooze" | "custom date", snoozeDays?: number) => Promise<void>;
  onClosePanel: () => void;
  onOpenQuery?: (queryId: string) => void;
}> = ({ task, onNavigate, dismissTask, onClosePanel, onOpenQuery }) => {
  const { queries, agents, manuscripts } = useScriptAllyDb();
  const [showSnoozeDropdown, setShowSnoozeDropdown] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const [isTouchActive, setIsTouchActive] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsTouch(window.matchMedia("(hover: none)").matches);
    }
  }, []);

  useEffect(() => {
    if (!isTouchActive) return;
    const handleOutsideClick = () => {
      setIsTouchActive(false);
    };
    document.addEventListener("click", handleOutsideClick);
    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, [isTouchActive]);

  useEffect(() => {
    if (!showSnoozeDropdown) return;
    const handleOutsideClick = () => {
      setShowSnoozeDropdown(false);
    };
    document.addEventListener("click", handleOutsideClick);
    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, [showSnoozeDropdown]);

  const { agentName, agency, manuscriptTitle } = getTaskContextInfo(task, queries, agents, manuscripts);

  let contextLine = "";
  if (agentName && agency && manuscriptTitle) {
    contextLine = `${agentName} (${agency}) for ${manuscriptTitle}`;
  } else if (agentName && agency) {
    contextLine = `${agentName} (${agency})`;
  } else if (agentName && manuscriptTitle) {
    contextLine = `${agentName} for ${manuscriptTitle}`;
  } else if (agentName) {
    contextLine = agentName;
  } else if (manuscriptTitle) {
    contextLine = manuscriptTitle;
  }

  if (!contextLine) {
    contextLine = task.manuscriptTitle ? `${task.manuscriptTitle} • ${task.context}` : task.context;
  }

  const getDotColor = (priority: string) => {
    if (priority === "urgent") return "#3a1c14";
    if (priority === "overdue") return "#C4706A";
    return "#C4A882";
  };

  const actionLabel = getTaskActionLabel(task);

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onNavigate(task.actionPath, task.title);
    onClosePanel();
  };

  const handleDismiss = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await dismissTask(task.taskType, task.relatedRecordId, "permanent");
  };

  const handleSnooze = async (days: number) => {
    await dismissTask(task.taskType, task.relatedRecordId, "fixed snooze", days);
    setShowSnoozeDropdown(false);
  };

  const isUrgent = task.priority === "urgent" || ["offer_received", "partial_requested", "full_requested", "revise_resubmit"].includes(task.taskType);
  const isOverdue = task.priority === "overdue" || ["nudge_overdue", "response_overdue"].includes(task.taskType);
  const isSuggested = task.priority === "suggested" || ["dream_agent_unqueried", "data_quality_poor", "no_response_close", "querying_unstarted"].includes(task.taskType);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 8, transition: { duration: 0.2 } }}
      onClick={(e) => {
        const isQueryRelated = ["offer_received", "partial_requested", "full_requested", "revise_resubmit", "nudge_overdue", "no_response_close"].includes(task.taskType);
        if (isQueryRelated && onOpenQuery) {
          onOpenQuery(task.relatedRecordId);
          onClosePanel();
          return;
        }
        if (isTouch) {
          if (!isTouchActive) {
            e.stopPropagation();
            e.preventDefault();
            setIsTouchActive(true);
          }
        }
      }}
      className={`border rounded-2xl p-4 shadow-2xs relative flex flex-col font-sans w-full group/panelcard cursor-pointer transition-all duration-200 ${
        isUrgent ? "bg-[#fff0f0] border-red-200" : "bg-white border-[#EBDCD3]"
      }`}
    >
      {isUrgent && (
        <div 
          className="absolute bg-red-600 text-white text-[11px] font-extrabold rounded-full flex items-center justify-center select-none shadow-3xs" 
          style={{ width: '18px', height: '18px', top: '10px', right: '10px', zIndex: 10 }}
          title="Urgent"
        >
          !
        </div>
      )}
      <div className="flex gap-2.5 items-start">
        <span 
          className="w-2 h-2 rounded-full shrink-0 mt-1.5" 
          style={{ backgroundColor: getDotColor(task.priority) }}
        />
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-semibold text-[#3a1c14] leading-tight">
            {task.title}
          </h4>
          <p className="text-[11px] text-[#7c3a2a] mt-1 font-medium truncate">
            {contextLine}
          </p>
        </div>
      </div>

      <div 
        className={`overflow-hidden transition-all duration-200 ease-in-out ${
          isTouch 
            ? (isTouchActive 
                ? "max-h-[60px] mt-2 pt-2 border-t-[0.5px] border-[#EBDCD3]" 
                : "max-h-0 mt-0 pt-0 border-t-0 border-transparent")
            : "max-h-0 mt-0 pt-0 border-t-0 border-transparent group-hover/panelcard:max-h-[60px] group-hover/panelcard:mt-2 group-hover/panelcard:pt-2 group-hover/panelcard:border-t-[0.5px] group-hover/panelcard:border-[#EBDCD3]"
        }`}
      >
        {isUrgent && (
          <div className="flex items-center">
            <button
              onClick={handleActionClick}
              className="px-3 py-1 bg-[#FAF1EF] text-[#7c3a2a] border border-[#EBDCD3] text-[10.5px] font-bold rounded-lg hover:bg-[#F2DDD5] transition-colors cursor-pointer shrink-0 shadow-2xs"
            >
              {actionLabel}
            </button>
          </div>
        )}

        {isOverdue && (
          <div className="flex items-center justify-between w-full">
            <button
              onClick={handleActionClick}
              className="px-3 py-1 bg-[#FAF1EF] text-[#7c3a2a] border border-[#EBDCD3] text-[10.5px] font-bold rounded-lg hover:bg-[#F2DDD5] transition-colors cursor-pointer shrink-0 shadow-2xs"
            >
              {actionLabel}
            </button>
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSnoozeDropdown(!showSnoozeDropdown);
                  }}
                  className="text-stone-500 hover:text-[#7c3a2a] text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1 hover:bg-[#FAF1EF] px-2.5 py-1 rounded-lg shrink-0"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Snooze</span>
                </button>

                {showSnoozeDropdown && (
                  <div className="absolute right-0 bottom-[calc(100%+4px)] bg-white border border-[#EBDCD3] rounded-lg shadow-[0_4px_12px_rgba(58,28,20,0.08)] p-1 z-50 flex flex-col gap-0.5 min-w-[140px] font-sans text-left animate-fade-in">
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        await handleSnooze(3);
                      }}
                      className="text-left px-2.5 py-1.5 text-[10.5px] text-stone-700 hover:bg-[#FAF1EF] hover:text-[#7c3a2a] rounded-md transition-colors font-medium cursor-pointer"
                    >
                      Snooze 3 days
                    </button>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        await handleSnooze(7);
                      }}
                      className="text-left px-2.5 py-1.5 text-[10.5px] text-stone-700 hover:bg-[#FAF1EF] hover:text-[#7c3a2a] rounded-md transition-colors font-medium cursor-pointer"
                    >
                      Snooze 1 week
                    </button>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        await handleSnooze(14);
                      }}
                      className="text-left px-2.5 py-1.5 text-[10.5px] text-stone-700 hover:bg-[#FAF1EF] hover:text-[#7c3a2a] rounded-md transition-colors font-medium cursor-pointer"
                    >
                      Snooze 2 weeks
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={handleDismiss}
                className="text-stone-500 hover:text-[#7c3a2a] text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1 hover:bg-[#FAF1EF] px-2.5 py-1 rounded-lg shrink-0"
              >
                <X className="w-3.5 h-3.5" />
                <span>Dismiss</span>
              </button>
            </div>
          </div>
        )}

        {isSuggested && (
          <div className="flex items-center justify-between w-full">
            <button
              onClick={handleActionClick}
              className="px-3 py-1 bg-[#FAF1EF] text-[#7c3a2a] border border-[#EBDCD3] text-[10.5px] font-bold rounded-lg hover:bg-[#F2DDD5] transition-colors cursor-pointer shrink-0 shadow-2xs"
            >
              {actionLabel}
            </button>
            <div className="flex-grow" />
            <button
              onClick={handleDismiss}
              className="text-stone-500 hover:text-[#7c3a2a] text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1 hover:bg-[#FAF1EF] px-2.5 py-1 rounded-lg shrink-0"
            >
              <X className="w-3.5 h-3.5" />
              <span>Dismiss</span>
            </button>
          </div>
        )}

        {!isUrgent && !isOverdue && !isSuggested && (
          <div className="flex items-center justify-between w-full">
            <button
              onClick={handleActionClick}
              className="px-3 py-1 bg-[#FAF1EF] text-[#7c3a2a] border border-[#EBDCD3] text-[10.5px] font-bold rounded-lg hover:bg-[#F2DDD5] transition-colors cursor-pointer shrink-0 shadow-2xs"
            >
              {actionLabel}
            </button>
            <div className="flex-grow" />
            <button
              onClick={handleDismiss}
              className="text-stone-500 hover:text-[#7c3a2a] text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1 hover:bg-[#FAF1EF] px-2.5 py-1 rounded-lg shrink-0"
            >
              <X className="w-3.5 h-3.5" />
              <span>Dismiss</span>
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export const Dashboard: React.FC<{
  onNavigate: (tab: string, subPageName?: string) => void;
  searchQuery: string;
}> = ({ 
  onNavigate, 
  searchQuery
}) => {
  const {
    currentUser,
    manuscripts,
    agents,
    communityAgents,
    queries,
    activities,
    tasks,
    isOfflineMode,
    logout,
    dismissTask,
    addAgent,
    updateQueryStatus,
    undoQueryStatus
  } = useScriptAllyDb();

  const [isTasksPanelOpen, setIsTasksPanelOpen] = useState(false);
  const [spotlightTaskIndex, setSpotlightTaskIndex] = useState(0);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [activeSnoozeTaskId, setActiveSnoozeTaskId] = useState<string | null>(null);
  const [activeTouchTaskId, setActiveTouchTaskId] = useState<string | null>(null);
  const [isTouch, setIsTouch] = useState(false);

  const [timelineItems, setTimelineItems] = useState<any[]>([]);

  useEffect(() => {
    if (!currentUser?.id || isOfflineMode || currentUser.id === "writer-pro-lucy") {
      setTimelineItems([]);
      return;
    }
    const unsubscribe = onSnapshot(
      query(
        collection(db, 'users', currentUser.id, 'activity'),
        orderBy('createdAt', 'desc'),
        limit(20)
      ),
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setTimelineItems(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${currentUser.id}/activity`);
      }
    );
    return () => unsubscribe();
  }, [currentUser?.id]);

  // Query Details Slide-in Panel and Undo Toast states
  const [selectedQueryIdForPanel, setSelectedQueryIdForPanel] = useState<string | null>(null);
  const [isQueryPanelOpen, setIsQueryPanelOpen] = useState(false);
  const [isFullCalendarOpen, setIsFullCalendarOpen] = useState(false);
  const [hoveredFortnightDate, setHoveredFortnightDate] = useState<string | null>(null);
  const [undoToastInfo, setUndoToastInfo] = useState<{
    queryId: string;
    previousStatus: QueryStatus;
    newStatus: QueryStatus;
    agentName: string;
    notes?: string;
  } | null>(null);
  const [undoToastTimer, setUndoToastTimer] = useState<number>(10);

  // Timer effect for Status Change Undo window
  useEffect(() => {
    if (!undoToastInfo) return;
    setUndoToastTimer(10);
    const interval = setInterval(() => {
      setUndoToastTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setUndoToastInfo(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [undoToastInfo]);

  const handleSaveStatusChange = async (
    queryId: string, 
    newStatus: QueryStatus, 
    previousStatus: QueryStatus, 
    notesText: string
  ) => {
    try {
      await updateQueryStatus(queryId, newStatus, notesText);

      const q = queries.find(item => item.id === queryId);
      const ag = q ? agents.find(a => a.id === q.agentId) : null;
      const agName = ag ? ag.name : "Unmapped Agent";

      setUndoToastInfo({
        queryId,
        previousStatus,
        newStatus,
        agentName: agName,
        notes: notesText
      });
    } catch (e) {
      console.error("Failed to update status transition:", e);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsTouch(window.matchMedia("(hover: none)").matches);
    }
  }, []);

  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveTouchTaskId(null);
      setActiveSnoozeTaskId(null);
    };
    document.addEventListener("click", handleOutsideClick);
    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, []);

  const [quote, setQuote] = useState({ text: "", author: "" });
  const [fact, setFact] = useState({ title: "", fact: "" });

  const [isMagazineLayout, setIsMagazineLayout] = useState(() => {
    return localStorage.getItem("scriptally_is_magazine_layout") === "true";
  });

  // Customized Radical Designs States
  const [headerStyle, setHeaderStyle] = useState<"bento" | "editorial" | "academic">(() => {
    return (localStorage.getItem("scriptally_header_style") as any) || "bento";
  });
  const [timelineStyle, setTimelineStyle] = useState<"journal" | "bento" | "ribbon">(() => {
    return (localStorage.getItem("scriptally_timeline_style") as any) || "journal";
  });

  // Chart hover tracker states
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);
  const [showChartHelpIndex, setShowChartHelpIndex] = useState<number | null>(null);
  const [hoveredAgentId, setHoveredAgentId] = useState<string | null>(null);
  const [radarToast, setRadarToast] = useState<string | null>(null);
  const [selectedManuscriptId, setSelectedManuscriptId] = useState<string | null>(null);
  const [lowerDeckStyle, setLowerDeckStyle] = useState<"radar" | "minimalist" | "funnel" | "wall" | "studio">("radar");
  const [useSvgWatermark, setUseSvgWatermark] = useState(false);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  const [dashboardImage, setDashboardImage] = useState<string | null>(() => {
    return localStorage.getItem("dashboard_welcome_image") || null;
  });

  const [card1Image, setCard1Image] = useState<string | null>(() => {
    return localStorage.getItem("stat_card_image_1") || null;
  });
  const [card2Image, setCard2Image] = useState<string | null>(() => {
    return localStorage.getItem("stat_card_image_2") || null;
  });
  const [card3Image, setCard3Image] = useState<string | null>(() => {
    return localStorage.getItem("stat_card_image_3") || null;
  });
  const [card4Image, setCard4Image] = useState<string | null>(() => {
    return localStorage.getItem("stat_card_image_4") || null;
  });

  const [card1ImageScale, setCard1ImageScale] = useState<number>(() => {
    const saved = localStorage.getItem("stat_card_image_1_scale");
    return saved ? parseInt(saved, 10) : 100;
  });
  const [card1ImageX, setCard1ImageX] = useState<number>(() => {
    const saved = localStorage.getItem("stat_card_image_1_x");
    return saved ? parseInt(saved, 10) : 0;
  });
  const [card1ImageY, setCard1ImageY] = useState<number>(() => {
    const saved = localStorage.getItem("stat_card_image_1_y");
    return saved ? parseInt(saved, 10) : 0;
  });

  const [card2ImageScale, setCard2ImageScale] = useState<number>(() => {
    const saved = localStorage.getItem("stat_card_image_2_scale");
    return saved ? parseInt(saved, 10) : 100;
  });
  const [card2ImageX, setCard2ImageX] = useState<number>(() => {
    const saved = localStorage.getItem("stat_card_image_2_x");
    return saved ? parseInt(saved, 10) : 0;
  });
  const [card2ImageY, setCard2ImageY] = useState<number>(() => {
    const saved = localStorage.getItem("stat_card_image_2_y");
    return saved ? parseInt(saved, 10) : 0;
  });

  const [card3ImageScale, setCard3ImageScale] = useState<number>(() => {
    const saved = localStorage.getItem("stat_card_image_3_scale");
    return saved ? parseInt(saved, 10) : 100;
  });
  const [card3ImageX, setCard3ImageX] = useState<number>(() => {
    const saved = localStorage.getItem("stat_card_image_3_x");
    return saved ? parseInt(saved, 10) : 0;
  });
  const [card3ImageY, setCard3ImageY] = useState<number>(() => {
    const saved = localStorage.getItem("stat_card_image_3_y");
    return saved ? parseInt(saved, 10) : 0;
  });

  const [card4ImageScale, setCard4ImageScale] = useState<number>(() => {
    const saved = localStorage.getItem("stat_card_image_4_scale");
    return saved ? parseInt(saved, 10) : 100;
  });
  const [card4ImageX, setCard4ImageX] = useState<number>(() => {
    const saved = localStorage.getItem("stat_card_image_4_x");
    return saved ? parseInt(saved, 10) : 0;
  });
  const [card4ImageY, setCard4ImageY] = useState<number>(() => {
    const saved = localStorage.getItem("stat_card_image_4_y");
    return saved ? parseInt(saved, 10) : 0;
  });

  const handleIncreaseCardScale = (idx: number) => {
    if (idx === 1) {
      setCard1ImageScale(prev => {
        const n = Math.min(300, prev + 10);
        localStorage.setItem("stat_card_image_1_scale", n.toString());
        return n;
      });
    } else if (idx === 2) {
      setCard2ImageScale(prev => {
        const n = Math.min(300, prev + 10);
        localStorage.setItem("stat_card_image_2_scale", n.toString());
        return n;
      });
    } else if (idx === 3) {
      setCard3ImageScale(prev => {
        const n = Math.min(300, prev + 10);
        localStorage.setItem("stat_card_image_3_scale", n.toString());
        return n;
      });
    } else if (idx === 4) {
      setCard4ImageScale(prev => {
        const n = Math.min(300, prev + 10);
        localStorage.setItem("stat_card_image_4_scale", n.toString());
        return n;
      });
    }
  };

  const handleDecreaseCardScale = (idx: number) => {
    if (idx === 1) {
      setCard1ImageScale(prev => {
        const n = Math.max(30, prev - 10);
        localStorage.setItem("stat_card_image_1_scale", n.toString());
        return n;
      });
    } else if (idx === 2) {
      setCard2ImageScale(prev => {
        const n = Math.max(30, prev - 10);
        localStorage.setItem("stat_card_image_2_scale", n.toString());
        return n;
      });
    } else if (idx === 3) {
      setCard3ImageScale(prev => {
        const n = Math.max(30, prev - 10);
        localStorage.setItem("stat_card_image_3_scale", n.toString());
        return n;
      });
    } else if (idx === 4) {
      setCard4ImageScale(prev => {
        const n = Math.max(30, prev - 10);
        localStorage.setItem("stat_card_image_4_scale", n.toString());
        return n;
      });
    }
  };

  const handleMoveCardLeft = (idx: number) => {
    if (idx === 1) {
      setCard1ImageX(prev => {
        const n = prev - 5;
        localStorage.setItem("stat_card_image_1_x", n.toString());
        return n;
      });
    } else if (idx === 2) {
      setCard2ImageX(prev => {
        const n = prev - 5;
        localStorage.setItem("stat_card_image_2_x", n.toString());
        return n;
      });
    } else if (idx === 3) {
      setCard3ImageX(prev => {
        const n = prev - 5;
        localStorage.setItem("stat_card_image_3_x", n.toString());
        return n;
      });
    } else if (idx === 4) {
      setCard4ImageX(prev => {
        const n = prev - 5;
        localStorage.setItem("stat_card_image_4_x", n.toString());
        return n;
      });
    }
  };

  const handleMoveCardRight = (idx: number) => {
    if (idx === 1) {
      setCard1ImageX(prev => {
        const n = prev + 5;
        localStorage.setItem("stat_card_image_1_x", n.toString());
        return n;
      });
    } else if (idx === 2) {
      setCard2ImageX(prev => {
        const n = prev + 5;
        localStorage.setItem("stat_card_image_2_x", n.toString());
        return n;
      });
    } else if (idx === 3) {
      setCard3ImageX(prev => {
        const n = prev + 5;
        localStorage.setItem("stat_card_image_3_x", n.toString());
        return n;
      });
    } else if (idx === 4) {
      setCard4ImageX(prev => {
        const n = prev + 5;
        localStorage.setItem("stat_card_image_4_x", n.toString());
        return n;
      });
    }
  };

  const handleMoveCardUp = (idx: number) => {
    if (idx === 1) {
      setCard1ImageY(prev => {
        const n = prev - 5;
        localStorage.setItem("stat_card_image_1_y", n.toString());
        return n;
      });
    } else if (idx === 2) {
      setCard2ImageY(prev => {
        const n = prev - 5;
        localStorage.setItem("stat_card_image_2_y", n.toString());
        return n;
      });
    } else if (idx === 3) {
      setCard3ImageY(prev => {
        const n = prev - 5;
        localStorage.setItem("stat_card_image_3_y", n.toString());
        return n;
      });
    } else if (idx === 4) {
      setCard4ImageY(prev => {
        const n = prev - 5;
        localStorage.setItem("stat_card_image_4_y", n.toString());
        return n;
      });
    }
  };

  const handleMoveCardDown = (idx: number) => {
    if (idx === 1) {
      setCard1ImageY(prev => {
        const n = prev + 5;
        localStorage.setItem("stat_card_image_1_y", n.toString());
        return n;
      });
    } else if (idx === 2) {
      setCard2ImageY(prev => {
        const n = prev + 5;
        localStorage.setItem("stat_card_image_2_y", n.toString());
        return n;
      });
    } else if (idx === 3) {
      setCard3ImageY(prev => {
        const n = prev + 5;
        localStorage.setItem("stat_card_image_3_y", n.toString());
        return n;
      });
    } else if (idx === 4) {
      setCard4ImageY(prev => {
        const n = prev + 5;
        localStorage.setItem("stat_card_image_4_y", n.toString());
        return n;
      });
    }
  };

  const handleResetCardPosition = (idx: number) => {
    if (idx === 1) {
      setCard1ImageX(0);
      setCard1ImageY(0);
      setCard1ImageScale(100);
      localStorage.setItem("stat_card_image_1_x", "0");
      localStorage.setItem("stat_card_image_1_y", "0");
      localStorage.setItem("stat_card_image_1_scale", "100");
    } else if (idx === 2) {
      setCard2ImageX(0);
      setCard2ImageY(0);
      setCard2ImageScale(100);
      localStorage.setItem("stat_card_image_2_x", "0");
      localStorage.setItem("stat_card_image_2_y", "0");
      localStorage.setItem("stat_card_image_2_scale", "100");
    } else if (idx === 3) {
      setCard3ImageX(0);
      setCard3ImageY(0);
      setCard3ImageScale(100);
      localStorage.setItem("stat_card_image_3_x", "0");
      localStorage.setItem("stat_card_image_3_y", "0");
      localStorage.setItem("stat_card_image_3_scale", "100");
    } else if (idx === 4) {
      setCard4ImageX(0);
      setCard4ImageY(0);
      setCard4ImageScale(100);
      localStorage.setItem("stat_card_image_4_x", "0");
      localStorage.setItem("stat_card_image_4_y", "0");
      localStorage.setItem("stat_card_image_4_scale", "100");
    }
  };

  const handleCardImageUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        if (index === 1) { setCard1Image(base64String); localStorage.setItem("stat_card_image_1", base64String); }
        else if (index === 2) { setCard2Image(base64String); localStorage.setItem("stat_card_image_2", base64String); }
        else if (index === 3) { setCard3Image(base64String); localStorage.setItem("stat_card_image_3", base64String); }
        else if (index === 4) { setCard4Image(base64String); localStorage.setItem("stat_card_image_4", base64String); }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveCardImage = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (index === 1) { 
      setCard1Image(null); 
      localStorage.removeItem("stat_card_image_1");
      handleResetCardPosition(1);
    }
    else if (index === 2) { 
      setCard2Image(null); 
      localStorage.removeItem("stat_card_image_2");
      handleResetCardPosition(2);
    }
    else if (index === 3) { 
      setCard3Image(null); 
      localStorage.removeItem("stat_card_image_3");
      handleResetCardPosition(3);
    }
    else if (index === 4) { 
      setCard4Image(null); 
      localStorage.removeItem("stat_card_image_4");
      handleResetCardPosition(4);
    }
  };

  const [dashboardImageScale, setDashboardImageScale] = useState<number>(() => {
    const saved = localStorage.getItem("dashboard_welcome_image_scale");
    return saved ? parseInt(saved, 10) : 100;
  });

  const [dashboardImageX, setDashboardImageX] = useState<number>(() => {
    const saved = localStorage.getItem("dashboard_welcome_image_x");
    return saved ? parseInt(saved, 10) : 0;
  });

  const [dashboardImageY, setDashboardImageY] = useState<number>(() => {
    const saved = localStorage.getItem("dashboard_welcome_image_y");
    return saved ? parseInt(saved, 10) : 0;
  });

  const handleIncreaseScale = () => {
    setDashboardImageScale(prev => {
      const next = Math.min(300, prev + 10);
      localStorage.setItem("dashboard_welcome_image_scale", next.toString());
      return next;
    });
  };

  const handleDecreaseScale = () => {
    setDashboardImageScale(prev => {
      const next = Math.max(30, prev - 10);
      localStorage.setItem("dashboard_welcome_image_scale", next.toString());
      return next;
    });
  };

  const handleMoveLeft = () => {
    setDashboardImageX(prev => {
      const next = prev - 5;
      localStorage.setItem("dashboard_welcome_image_x", next.toString());
      return next;
    });
  };

  const handleMoveRight = () => {
    setDashboardImageX(prev => {
      const next = prev + 5;
      localStorage.setItem("dashboard_welcome_image_x", next.toString());
      return next;
    });
  };

  const handleMoveUp = () => {
    setDashboardImageY(prev => {
      const next = prev - 5;
      localStorage.setItem("dashboard_welcome_image_y", next.toString());
      return next;
    });
  };

  const handleMoveDown = () => {
    setDashboardImageY(prev => {
      const next = prev + 5;
      localStorage.setItem("dashboard_welcome_image_y", next.toString());
      return next;
    });
  };

  const handleResetPosition = () => {
    setDashboardImageX(0);
    setDashboardImageY(0);
    setDashboardImageScale(100);
    localStorage.setItem("dashboard_welcome_image_x", "0");
    localStorage.setItem("dashboard_welcome_image_y", "0");
    localStorage.setItem("dashboard_welcome_image_scale", "100");
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setDashboardImage(base64String);
        localStorage.setItem("dashboard_welcome_image", base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDashboardImage(null);
    localStorage.removeItem("dashboard_welcome_image");
    handleResetPosition();
  };

  const scriptallyTips = [
    {
      title: "Wishlist Radar Match",
      description: "Match your manuscript themes with literary agent requirements live using the Radar visualizer down below.",
      tag: "Pro Tip",
      icon: <Sparkles className="w-4 h-4 text-[#BA7517]" />
    },
    {
      title: "Double-Entry Logging",
      description: "When creating a pitch query, select the relevant manuscript to update status counters and create interactive vertical timelines.",
      tag: "Efficiency",
      icon: <BookOpen className="w-4 h-4 text-[#CD4E46]" />
    },
    {
      title: "Aesthetic Layout Matrix",
      description: "Cycle the deck styles (Radar, Funnel, Minimalist) or change Header Style at the bottom of the page to match your working mood.",
      tag: "Aesthetics",
      icon: <Compass className="w-4 h-4 text-emerald-700" />
    },
    {
      title: "Sync With Cloud Auth",
      description: "Click 'Go Live' to persist your local sandbox entries securely to Firestore, enabling cloud synchronization.",
      tag: "Database",
      icon: <Database className="w-4 h-4 text-[#7c3a2a]" />
    }
  ];

  const timelineScrollRef = React.useRef<HTMLDivElement>(null);
  const [timelineScrollState, setTimelineScrollState] = useState({ isAtTop: true, isAtBottom: true });

  const leftColumnRef = React.useRef<HTMLDivElement>(null);
  const [leftColumnHeight, setLeftColumnHeight] = useState<number | null>(null);
  const [isMobileLayout, setIsMobileLayout] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobileLayout(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const el = leftColumnRef.current;
    if (!el) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setLeftColumnHeight(entry.contentRect.height);
      }
    });
    resizeObserver.observe(el);
    return () => resizeObserver.disconnect();
  }, []);

  const handleTimelineScroll = () => {
    const el = timelineScrollRef.current;
    if (!el) return;
    const isAtTop = el.scrollTop <= 5;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 5;
    setTimelineScrollState(prev => {
      if (prev.isAtTop === isAtTop && prev.isAtBottom === isAtBottom) {
        return prev;
      }
      return { isAtTop, isAtBottom };
    });
  };

  useEffect(() => {
    // Select stable random quote & fact on mount
    const seedTime = new Date().getMinutes();
    setQuote(seedQuotes[seedTime % seedQuotes.length]);
    setFact(seedFacts[seedTime % seedFacts.length]);
  }, []);

  useEffect(() => {
    if (!isTasksPanelOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsTasksPanelOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    const originalStyle = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalStyle;
    };
  }, [isTasksPanelOpen]);

  const handleOptInAgent = async (match: AgentMatch) => {
    try {
      const result = await addAgent({
        name: match.agent.name,
        agency: match.agent.agency,
        email: match.agent.email,
        website: match.agent.website,
        twitter: match.agent.twitter,
        bluesky: match.agent.bluesky,
        instagram: match.agent.instagram,
        genres: match.agent.genres,
        mswlNotes: match.agent.mswlNotes,
        starRating: match.agent.starRating,
        submissionStatus: match.agent.submissionStatus,
        responseTimeWeeks: match.agent.responseTimeWeeks,
        noResponseMeansNo: match.agent.noResponseMeansNo,
        submissionMethod: match.agent.submissionMethod,
        materialsWanted: match.agent.materialsWanted,
        notes: `Selected and imported as a top MSWL match from ScriptAlly Community Agents collection for manuscript: "${match.manuscript.title}".`
      });

      if (result.success) {
        // Trigger Firestore update count to increment contributions by count
        if (!isOfflineMode) {
          try {
            await updateDoc(doc(db, "communityAgents", match.agent.id), {
              contributedByCount: increment(1)
            });
          } catch (countErr) {
            console.error("Failed to increment contributedByCount in Firestore:", countErr);
          }
        }
        
        setRadarToast(`Successfully added "${match.agent.name}" to your agent list!`);
        setTimeout(() => setRadarToast(null), 4000);
      } else {
        alert(result.error || "Failed to add agent.");
      }
    } catch (error) {
      console.error("Error opting in community agent:", error);
    }
  };

  if (!currentUser) return null;

  // Filter manuscripts and queries by search box query or display all
  const filteredQueries = queries.filter(q => {
    if (!searchQuery) return true;
    const ag = agents.find(a => a.id === q.agentId);
    const ms = manuscripts.find(m => m.id === q.manuscriptId);
    return (
      ag?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ag?.agency.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ms?.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Structural types for matches breakdown
  interface MatchBreakdown {
    mswlScore: number;
    genreScore: number;
    ageScore: number;
    wordCountScore: number;
    overlappingWords: string[];
    ageMatchedCategory: string;
    preferredWcRange: { min: number; max: number };
  }

  interface AgentMatch {
    agent: CommunityAgent;
    score: number;
    manuscript: Manuscript;
    breakdown: MatchBreakdown;
  }

  // Helper to calculate match score for a specific community agent against a manuscript
  const calculateCommunityAgentMatch = (commAgent: CommunityAgent, ms: Manuscript): MatchBreakdown => {
    // Check if agent.mswlNotes is actually accessible inside the scoring function for the first agent only
    if (communityAgents && communityAgents.length > 0 && commAgent.id === communityAgents[0].id) {
      console.log(`[MSWL Notes Accessibility Check] Name: ${commAgent.name}, MSWL Notes:`, commAgent.mswlNotes);
    }

    const stopWords = new Set([
      'the', 'a', 'and', 'or', 'of', 'in', 'to', 'for', 'with', 'on', 'at', 'by', 'an', 'is', 'it', 'its', 'that', 
      'from', 'this', 'as', 'are', 'was', 'were', 'be', 'has', 'have', 'had', 'scouting', 'looking', 'seeks', 
      'seeking', 'wanting', 'wants', 'about', 'some', 'any', 'all', 'into', 'out', 'up', 'down', 'no', 'not', 'but',
      'which', 'who', 'whom', 'their', 'they', 'our', 'what', 'where', 'when', 'how', 'why', 'can', 'will', 'just',
      'drawn', 'particularly', 'interested'
    ]);

    // Pull manuscript values directly
    const msLogline = ms.logline;
    const msComparable = ms.comparableTitles;

    // Null checks for empty strings
    const loglineVal = msLogline ? msLogline.trim() : "";
    const comparableVal = msComparable ? msComparable.trim() : "";

    let overlapping: string[] = [];

    const getTokens = (text: string): string[] => {
      if (!text) return [];
      const cleaned = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
      const words = cleaned.split(/\s+/);
      const tokens: string[] = [];
      words.forEach(w => {
        const trimmed = w.trim().toLowerCase();
        if (trimmed.length > 2 && !stopWords.has(trimmed)) {
          tokens.push(trimmed);
        }
      });
      return tokens;
    };

    if (loglineVal || comparableVal) {
      const agentTokens = getTokens(commAgent.mswlNotes || "");
      const manuscriptTokens = getTokens(`${loglineVal} ${comparableVal}`);

      // Genre-based keyword injection
      const msGenreLower = (ms.genre || "").trim().toLowerCase();
      if (msGenreLower === 'historical fantasy') {
        ['historical', 'fantasy', 'period', 'alternate', 'history'].forEach(token => manuscriptTokens.push(token));
      } else if (msGenreLower === 'literary fiction') {
        ['literary', 'fiction', 'voice', 'character'].forEach(token => manuscriptTokens.push(token));
      } else if (msGenreLower === 'fantasy') {
        ['fantasy', 'magic', 'world', 'building'].forEach(token => manuscriptTokens.push(token));
      } else if (msGenreLower === 'science fiction') {
        ['science', 'fiction', 'speculative', 'future'].forEach(token => manuscriptTokens.push(token));
      }

      const agentSet = new Set(agentTokens.map(t => t.toLowerCase().trim()));
      const msSet = new Set(manuscriptTokens.map(t => t.toLowerCase().trim()));

      const synonymMap: Record<string, string[]> = {
        'clockmaker': ['steampunk', 'clockpunk', 'victorian', 'historical'],
        'clockwork': ['steampunk', 'clockpunk', 'victorian', 'historical'],
        'mechanical': ['steampunk', 'clockpunk', 'victorian', 'historical'],
        'pocket': ['steampunk', 'clockpunk', 'victorian', 'historical'],
        'watch': ['steampunk', 'clockpunk', 'victorian', 'historical'],
        '1880': ['victorian', 'british', 'historical', 'period'],
        'london': ['victorian', 'british', 'historical', 'period'],
        'apprentice': ['coming of age', 'debut', 'protagonist'],
        'discovers': ['coming of age', 'debut', 'protagonist'],
        'memories': ['atmospheric', 'literary', 'gothic'],
        'library': ['atmospheric', 'literary', 'gothic']
      };

      msSet.forEach(token => {
        // Direct match
        if (agentSet.has(token)) {
          if (!overlapping.includes(token)) {
            overlapping.push(token);
          }
        }
        // Synonyms / Related terms match
        const syns = synonymMap[token];
        if (syns) {
          syns.forEach(syn => {
            if (agentSet.has(syn)) {
              if (!overlapping.includes(syn)) {
                overlapping.push(syn);
              }
            } else {
              // Also support multi-word synonyms like 'coming of age' in raw lowercased text
              const msNotesLower = (commAgent.mswlNotes || "").toLowerCase();
              if (msNotesLower.includes(syn.toLowerCase())) {
                if (!overlapping.includes(syn)) {
                  overlapping.push(syn);
                }
              }
            }
          });
        }
      });
    }

    // Fourth, increase the points per matching token from 5 to 8, but cap at 40 points maximum
    const mswlScore = Math.min(overlapping.length * 8, 40);

    // B. Genre match (20 points)
    const msGenreRaw = (ms.genre || "").trim();
    const msGenreLower = msGenreRaw.toLowerCase();
    const genresClean = (commAgent.genres || []).map(g => g.trim().toLowerCase());
    
    let genreScore = 0;
    
    // Split the manuscript genre into its component words
    const msGenreComponents = msGenreRaw.split(/\s+/).filter(w => w.length > 0);
    const isCompound = msGenreComponents.length > 1;
    
    if (isCompound) {
      // If the agent's genres array contains an exact match for the full compound genre string (case insensitive) - award 20 points
      if (genresClean.includes(msGenreLower)) {
        genreScore = 20;
      } else {
        // Check how many of those components appear in the agent's genres array
        const matchingComponents = msGenreComponents.filter(c => {
          const cLower = c.toLowerCase();
          return genresClean.some(g => g === cLower || g.includes(cLower));
        });
        const matchCount = matchingComponents.length;
        if (matchCount >= 2) {
          genreScore = 15;
        } else if (matchCount === 1) {
          genreScore = 8;
        } else {
          genreScore = 0;
        }
      }
    } else {
      // For single-word genres (e.g. 'Fantasy', 'Thriller', 'Romance') — keep the existing exact match logic awarding 20 points if found, 0 if not
      const hasExactMatch = genresClean.includes(msGenreLower);
      genreScore = hasExactMatch ? 20 : 0;
    }
    
    const isGenreMatch = genreScore > 0;

    // C. Age category match (15 points): award 15 points only if the specific community agent's genres array contains the manuscript's ageCategory — case insensitive
    const msAge = (ms.ageCategory || "").trim().toLowerCase();
    const isAgeMatch = genresClean.some(g => g === msAge);
    const ageScore = isAgeMatch ? 15 : 0;
    const matchedAgeCat = isAgeMatch ? ms.ageCategory : "";

    // D. Word count range match (15 points)
    // Evaluate manuscript wordCount against a typical range appropriate to the combination of the manuscript's genre and the agent's represented genres
    // If the agent does not typically represent the manuscript's genre at all, the word count check should contribute 0 points
    let wordCountScore = 0;
    let minWc = 80000;
    let maxWc = 100000;

    if (isGenreMatch) {
      const msAgeCategoryLower = (ms.ageCategory || "").toLowerCase();
      const msGenreLower = (ms.genre || "").toLowerCase();

      // Base range by age category and genre
      if (msAgeCategoryLower.includes("middle") || msAgeCategoryLower.includes("mg")) {
        minWc = 40000;
        maxWc = 65000;
        if (msGenreLower.includes("fantasy") || msGenreLower.includes("science") || msGenreLower.includes("sci-fi")) {
          minWc = 50000;
          maxWc = 80000;
        }
      } else if (msAgeCategoryLower.includes("young") || msAgeCategoryLower.includes("ya")) {
        minWc = 60000;
        maxWc = 85000;
        if (msGenreLower.includes("fantasy") || msGenreLower.includes("science") || msGenreLower.includes("sci-fi")) {
          minWc = 70000;
          maxWc = 95000;
        }
      } else {
        // Adult
        if (msGenreLower.includes("fantasy") || msGenreLower.includes("science") || msGenreLower.includes("sci-fi")) {
          minWc = 90000;
          maxWc = 120000;
        } else if (msGenreLower.includes("thriller") || msGenreLower.includes("mystery") || msGenreLower.includes("crime")) {
          minWc = 75000;
          maxWc = 95000;
        } else {
          minWc = 80000;
          maxWc = 100000;
        }
      }

      // Adjust dynamically based on agent's represented genres to make them appropriate to the combination
      if (genresClean.includes("fantasy") || genresClean.includes("science fiction")) {
        maxWc += 5000;
      }
      if (genresClean.includes("literary fiction") || genresClean.includes("memoir")) {
        maxWc -= 2000;
        minWc -= 2000;
      }

      const wc = ms.wordCount || 0;
      if (wc >= minWc && wc <= maxWc) {
        wordCountScore = 15;
      }
    }

    return {
      mswlScore,
      genreScore,
      ageScore,
      wordCountScore,
      overlappingWords: overlapping,
      ageMatchedCategory: matchedAgeCat,
      preferredWcRange: { min: minWc, max: maxWc }
    };
  };

  const activeRadarManuscript = manuscripts.find(m => m.id === selectedManuscriptId) || manuscripts[0];

  // Live computed matching Radar outcomes
  const radarMatches: AgentMatch[] = (communityAgents || [])
    .filter(commAgent => {
      // Filter out any community agents that the current user already has in their own agents list
      // (match by agent name and agency, case-insensitive)
      const alreadyHas = agents.some(userAgent => 
        userAgent.name.trim().toLowerCase() === commAgent.name.trim().toLowerCase() &&
        userAgent.agency.trim().toLowerCase() === commAgent.agency.trim().toLowerCase()
      );
      return !alreadyHas;
    })
    .map(commAgent => {
      if (!activeRadarManuscript) {
        return {
          agent: commAgent,
          score: -1,
          manuscript: null as any,
          breakdown: {
            mswlScore: 0,
            genreScore: 0,
            ageScore: 0,
            wordCountScore: 0,
            overlappingWords: [],
            ageMatchedCategory: "",
            preferredWcRange: { min: 80000, max: 100000 }
          }
        };
      }
      const breakdown = calculateCommunityAgentMatch(commAgent, activeRadarManuscript);
      const score = breakdown.mswlScore + breakdown.genreScore + breakdown.ageScore + breakdown.wordCountScore;

      return {
        agent: commAgent,
        score: score,
        manuscript: activeRadarManuscript,
        breakdown: breakdown
      };
    })
    .filter(match => match.score >= 50 && match.manuscript !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  // Calculate Stat Counts - total queries created of ALL types as requested
  const totalQueriesSent = queries.length;
  
  // Active queries: Queried, Partial Requested, Partial Sent, Full Requested, Full Sent
  const activeQueries = queries.filter(q =>
    [
      QueryStatus.QUERIED,
      QueryStatus.PARTIAL_REQUESTED,
      QueryStatus.PARTIAL_SENT,
      QueryStatus.FULL_REQUESTED,
      QueryStatus.FULL_SENT,
      QueryStatus.REVISE_RESUBMIT
    ].includes(q.status)
  );

  const totalAgentsCount = agents.length;
  const queriedAgentsCount = agents.filter(a =>
    queries.some(q => q.agentId === a.id)
  ).length;
  const notQueriedAgentsCount = totalAgentsCount - queriedAgentsCount;

  // Sorting display agents for Dashboard Card 3: 
  // 1. Queried agents first, then unqueried agents.
  // 2. Sorted alphabetically by name inside each group.
  const sortedDisplayAgents = [...agents].sort((a, b) => {
    const aQueried = queries.some(q => q.agentId === a.id);
    const bQueried = queries.some(q => q.agentId === b.id);
    
    if (aQueried && !bQueried) return -1;
    if (!aQueried && bQueried) return 1;
    
    return a.name.localeCompare(b.name);
  });

  // Compute 8 Weeks Historical Datasets dynamically
  const weeksLabels = ["Wk -7", "Wk -6", "Wk -5", "Wk -4", "Wk -3", "Wk -2", "Wk -1", "Now"];

  const nowTime = new Date().getTime();
  const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

  // Calculate dynamic counts for each of the 8 bins (W7 down to Now)
  const dynamicQueriesSentPerWeek = [0, 0, 0, 0, 0, 0, 0, 0];
  
  // Keep list of queries belonging to each week
  const binQueriesList: Query[][] = Array.from({ length: 8 }, () => []);

  interface ResponseEvent {
    queryId: string;
    agentName: string;
    msTitle: string;
    type: string;
    date: Date;
    isPositive: boolean;
  }

  // Capture all queries sent by week
  queries.forEach(q => {
    const qDate = new Date(q.dateSent);
    const diffMs = nowTime - qDate.getTime();
    const diffWeeks = Math.floor(diffMs / ONE_WEEK_MS);
    const binIndex = 7 - diffWeeks;
    if (binIndex >= 0 && binIndex < 8) {
      dynamicQueriesSentPerWeek[binIndex]++;
      binQueriesList[binIndex].push(q);
    }
  });

  // Calculate all response-related events, bin arrays, and counts inside a useMemo dependent only on queries array.
  // This explicitly prevents any state-flickering or out-of-sync calculations during multi-stage updates.
  const responseData = useMemo(() => {
    const responseEvents: ResponseEvent[] = [];
    const dynamicResponsesPerWeek = [0, 0, 0, 0, 0, 0, 0, 0];

    const getSafeDate = (val: any) => {
      if (!val) return null;
      if (typeof val === "string") return new Date(val);
      if (val.toDate) return val.toDate();
      if (val.seconds) return new Date(val.seconds * 1000);
      return new Date(val);
    };

    queries.forEach(q => {
      // Capture response events
      const agent = agents.find(a => a.id === q.agentId);
      const ms = manuscripts.find(m => m.id === q.manuscriptId);
      const agentName = agent?.name || "Agent";
      const msTitle = ms?.title || "Manuscript";

      // 1. Partial Request Check (using query record only, no activity lagging dependencies)
      const partDate = getSafeDate(q.partialRequestedDate) || 
        (q.status === QueryStatus.PARTIAL_REQUESTED ? (getSafeDate(q.responseReceivedAt) || getSafeDate(q.lastStatusChange)) : null);
      if (partDate) {
        responseEvents.push({
          queryId: q.id,
          agentName,
          msTitle,
          type: "Partial Requested",
          date: partDate,
          isPositive: true
        });
      }

      // 2. Full Request Check
      const fullDate = getSafeDate(q.fullRequestedDate) || 
        (q.status === QueryStatus.FULL_REQUESTED ? (getSafeDate(q.responseReceivedAt) || getSafeDate(q.lastStatusChange)) : null);
      if (fullDate) {
        responseEvents.push({
          queryId: q.id,
          agentName,
          msTitle,
          type: "Full Requested",
          date: fullDate,
          isPositive: true
        });
      }

      // 3. Offer of Representation (OFFER)
      if (q.status === QueryStatus.OFFER) {
        const oDate = (() => {
          const base = getSafeDate(q.offerDate) || getSafeDate(q.responseReceivedAt) || getSafeDate(q.lastStatusChange);
          if (base) return base;
          const d = new Date(q.fullSentDate || q.partialSentDate || q.dateSent);
          d.setDate(d.getDate() + 21);
          return d;
        })();
        responseEvents.push({
          queryId: q.id,
          agentName,
          msTitle,
          type: "Offer of Representation",
          date: oDate,
          isPositive: true
        });
      }

      // 4. Revise & Resubmit (R&R)
      if (q.status === QueryStatus.REVISE_RESUBMIT) {
        const rrDate = (() => {
          const base = getSafeDate(q.responseReceivedAt) || getSafeDate(q.lastStatusChange);
          if (base) return base;
          const d = new Date(q.fullSentDate || q.partialSentDate || q.dateSent);
          d.setDate(d.getDate() + 14);
          return d;
        })();
        responseEvents.push({
          queryId: q.id,
          agentName,
          msTitle,
          type: "Revise & Resubmit Request",
          date: rrDate,
          isPositive: true
        });
      }

      // 5. Rejected
      if (q.status === QueryStatus.REJECTED) {
        const rejDate = getSafeDate(q.responseReceivedAt) || getSafeDate(q.lastStatusChange) || (q.responseDeadline ? new Date(q.responseDeadline) : (() => {
          const d = new Date(q.dateSent);
          d.setDate(d.getDate() + 28);
          return d;
        })());
        responseEvents.push({
          queryId: q.id,
          agentName,
          msTitle,
          type: "Rejection Pass",
          date: rejDate,
          isPositive: false
        });
      }

      // 6. No Response
      if (q.status === QueryStatus.NO_RESPONSE) {
        const nrDate = getSafeDate(q.responseReceivedAt) || getSafeDate(q.lastStatusChange) || (q.responseDeadline ? new Date(q.responseDeadline) : (() => {
          const d = new Date(q.dateSent);
          d.setDate(d.getDate() + 30);
          return d;
        })());
        responseEvents.push({
          queryId: q.id,
          agentName,
          msTitle,
          type: "No Response Closure",
          date: nrDate,
          isPositive: false
        });
      }
    });

    const binResponsesList: ResponseEvent[][] = Array.from({ length: 8 }, () => []);

    // Bin response events into the appropriate weekly buckets
    responseEvents.forEach(ev => {
      const diffMs = nowTime - ev.date.getTime();
      const diffWeeks = Math.floor(diffMs / ONE_WEEK_MS);
      const binIndex = 7 - diffWeeks;
      if (binIndex >= 0 && binIndex < 8) {
        dynamicResponsesPerWeek[binIndex]++;
        binResponsesList[binIndex].push(ev);
      }
    });

    const finalResponsesPerWeek = dynamicResponsesPerWeek;

    const RESPONSE_RECEIVED_STATUSES = [
      QueryStatus.PARTIAL_REQUESTED,
      QueryStatus.PARTIAL_SENT,
      QueryStatus.FULL_REQUESTED,
      QueryStatus.FULL_SENT,
      QueryStatus.REVISE_RESUBMIT,
      QueryStatus.OFFER,
      QueryStatus.REJECTED,
      QueryStatus.NO_RESPONSE,
    ];

    const totalResponsesCalc = queries.filter(q => RESPONSE_RECEIVED_STATUSES.includes(q.status)).length;

    return {
      responseEvents,
      binResponsesList,
      finalResponsesPerWeek,
      totalResponsesCalc
    };
  }, [queries]);

  const {
    responseEvents,
    binResponsesList,
    finalResponsesPerWeek,
    totalResponsesCalc
  } = responseData;

  // Fallback to visually appealing mock values if database queries are sparse
  const finalQueriesSentPerWeek = dynamicQueriesSentPerWeek;

  const dynamicActiveQueriesPerWeek = Array.from({ length: 8 }, (_, idx) => {
    const weekEndTime = nowTime - (7 - idx) * ONE_WEEK_MS;
    return queries.filter(q => {
      const sentTime = new Date(q.dateSent).getTime();
      if (sentTime > weekEndTime) return false;
      return [
        QueryStatus.QUERIED,
        QueryStatus.PARTIAL_REQUESTED,
        QueryStatus.PARTIAL_SENT,
        QueryStatus.FULL_REQUESTED,
        QueryStatus.FULL_SENT,
        QueryStatus.REVISE_RESUBMIT
      ].includes(q.status);
    }).length;
  });

  const finalActiveQueriesPerWeek = dynamicActiveQueriesPerWeek;

  const currentWeekActive = finalActiveQueriesPerWeek[7] ?? 0;
  const lastWeekActive = finalActiveQueriesPerWeek[6] ?? 0;
  const activeDiff = currentWeekActive - lastWeekActive;
  
  let activePillText = "";
  if (activeDiff > 0) {
    activePillText = `${activeDiff} more than last week`;
  } else if (activeDiff < 0) {
    activePillText = `${Math.abs(activeDiff)} less than last week`;
  } else {
    activePillText = "No change vs last week";
  }

  const maxActiveVal = Math.max(...finalActiveQueriesPerWeek, 5);
  const activeSvgWidth = 100;
  const activeSvgHeight = 40;
  const activePoints = finalActiveQueriesPerWeek.map((val, idx) => {
    const x = (idx / 7) * activeSvgWidth;
    const y = activeSvgHeight - 4 - (val / maxActiveVal) * (activeSvgHeight - 8);
    return { x, y, value: val };
  });
  const dLine = activePoints.map((p, idx) => idx === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`).join(" ");
  const dArea = `${dLine} L ${activeSvgWidth} ${activeSvgHeight} L 0 ${activeSvgHeight} Z`;

  const gradientColors = [
    "rgba(124, 61, 61, 0.15)",
    "rgba(124, 61, 61, 0.27)",
    "rgba(124, 61, 61, 0.39)",
    "rgba(124, 61, 61, 0.51)",
    "rgba(124, 61, 61, 0.63)",
    "rgba(124, 61, 61, 0.75)",
    "rgba(124, 61, 61, 0.87)",
    "#7C3D3D"
  ];

  const totalSentCalc = totalQueriesSent;
  
  const responsesReceived = totalResponsesCalc;

  const totalQueries = queries.length;

  const responseRatePercent = totalQueries > 0
    ? Math.round((responsesReceived / totalQueries) * 100)
    : 0;

  // Helper to calculate the Monday range label of a given week offset from today (0-7 index)
  const getWeekMondayLabel = (idx: number) => {
    const d = new Date();
    const weeksAgo = 7 - idx;
    d.setDate(d.getDate() - (weeksAgo * 7));
    const currentDay = d.getDay();
    const diffToMonday = d.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diffToMonday));
    return monday.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };

  // Helper to calculate cumulative queries sent up to the end of week index
  const getCard1TotalToDate = (idx: number) => {
    const weekEndTime = nowTime - (7 - idx) * ONE_WEEK_MS;
    return queries.filter(q => new Date(q.dateSent).getTime() <= weekEndTime).length;
  };

  // Helper to fetch Card 1 (Queries sent) hover details
  const getCard1QueriesText = (idx: number) => {
    const realQueries = binQueriesList[idx];
    if (realQueries && realQueries.length > 0) {
      return realQueries.map(q => {
        const ag = agents.find(a => a.id === q.agentId);
        const ms = manuscripts.find(m => m.id === q.manuscriptId);
        return {
          agentName: ag?.name || "Agent",
          msTitle: ms?.title || "Manuscript",
          status: q.status
        };
      });
    }
    return [];
  };

  // Helper to fetch Card 4 (Responses received) hover details
  const getCard4ResponsesText = (idx: number) => {
    const realResponses = binResponsesList[idx];
    if (realResponses && realResponses.length > 0) {
      return realResponses.map(r => ({
        agentName: r.agentName,
        msTitle: r.msTitle,
        type: r.type,
        isPositive: r.isPositive
      }));
    }
    
    return [];
  };

  const getCard4TotalToDate = (idx: number) => {
    const weekEndTime = nowTime - (7 - idx) * ONE_WEEK_MS;
    return responseEvents.filter(ev => ev.date.getTime() <= weekEndTime).length;
  };

  // Helper to fetch Card 2 (Active Queries) hover details
  const getCard2StatusMetrics = (idx: number) => {
    const weekEndTime = nowTime - (7 - idx) * ONE_WEEK_MS;

    // Process real user queries active status at that specific weekEndTime
    let queried = 0;
    let partialReq = 0;
    let partialSent = 0;
    let fullReq = 0;
    let rr = 0;
    let total = 0;

    queries.forEach(q => {
      const qTime = new Date(q.dateSent).getTime();
      if (qTime > weekEndTime) return; // not sent yet at that point

      // Check if it is currently active, or was active back then
      const isCurrentlyActive = [
        QueryStatus.QUERIED,
        QueryStatus.PARTIAL_REQUESTED,
        QueryStatus.PARTIAL_SENT,
        QueryStatus.FULL_REQUESTED,
        QueryStatus.FULL_SENT,
        QueryStatus.REVISE_RESUBMIT
      ].includes(q.status);

      let isActiveInWeek = isCurrentlyActive;

      // If inactive now, let's see if it was active back then
      if (!isCurrentlyActive) {
        let closedTime = qTime + 21 * 24 * 60 * 60 * 1000; // 3 weeks fallback closure
        if (q.fullSentDate) {
          closedTime = new Date(q.fullSentDate).getTime() + 14 * 24 * 60 * 60 * 1000;
        } else if (q.partialSentDate) {
          closedTime = new Date(q.partialSentDate).getTime() + 14 * 24 * 60 * 60 * 1000;
        }
        if (weekEndTime < closedTime) {
          isActiveInWeek = true;
        }
      }

      if (isActiveInWeek) {
        total++;
        if (q.status === QueryStatus.REVISE_RESUBMIT) {
          rr++;
        } else if (q.fullSentDate && new Date(q.fullSentDate).getTime() <= weekEndTime) {
          fullReq++; 
        } else if (q.fullRequestedDate && new Date(q.fullRequestedDate).getTime() <= weekEndTime) {
          fullReq++;
        } else if (q.partialSentDate && new Date(q.partialSentDate).getTime() <= weekEndTime) {
          partialSent++;
        } else if (q.partialRequestedDate && new Date(q.partialRequestedDate).getTime() <= weekEndTime) {
          partialReq++;
        } else {
          queried++;
        }
      }
    });

    return {
      queried,
      partialReq,
      partialSent,
      fullReq,
      rr,
      total
    };
  };

  // Group activities/events for Timeline
  const mergedActivities = useMemo(() => {
    const arr = [...activities];
    timelineItems.forEach(item => {
      if (arr.some(a => a.id === item.id)) return;
      
      const dateStr = item.createdAt 
        ? (item.createdAt.toDate ? item.createdAt.toDate().toISOString() : new Date(item.createdAt.seconds * 1000).toISOString())
        : new Date().toISOString();

      arr.push({
        id: item.id,
        userId: currentUser?.id || "",
        queryId: item.queryId,
        manuscriptId: queries.find(q => q.id === item.queryId)?.manuscriptId,
        activityType: ActivityType.STATUS_CHANGED,
        description: item.note || `Status updated to ${item.type}`,
        date: dateStr,
        details: item.note,
      });
    });
    
    // Final defensive de-duplication pass to prevent duplicate key errors (e.g. from race conditions during backfill sync/write cycles)
    const seen = new Set<string>();
    return arr.filter(item => {
      if (!item.id || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [activities, timelineItems, queries, currentUser?.id]);

  const groupedEventsByDate: Record<string, typeof activities> = {};
  mergedActivities.forEach(act => {
    const dStr = new Date(act.date).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
    if (!groupedEventsByDate[dStr]) {
      groupedEventsByDate[dStr] = [];
    }
    groupedEventsByDate[dStr].push(act);
  });

  // Timeline ordered keys
  const chronologicalKeys = Object.keys(groupedEventsByDate).sort((a, b) => {
    return new Date(b).getTime() - new Date(a).getTime();
  });

  useEffect(() => {
    const el = timelineScrollRef.current;
    if (el) {
      handleTimelineScroll();
      
      const resizeObserver = new ResizeObserver(() => {
        handleTimelineScroll();
      });
      resizeObserver.observe(el);

      return () => {
        resizeObserver.disconnect();
      };
    }
  }, [chronologicalKeys.join(','), timelineStyle]);

  // Helper to extract the user's first name, defaulting to "Writer"
  const getUserFirstName = () => {
    if (currentUser?.name) {
      return currentUser.name.trim().split(/\s+/)[0];
    }
    if (currentUser?.email) {
      const localPart = currentUser.email.split("@")[0];
      const namePart = localPart.split(/[._-]/)[0];
      return namePart.charAt(0).toUpperCase() + namePart.slice(1);
    }
    return "Writer";
  };

  // Helper to resolve manuscript name for any activity
  const getManuscriptName = (act: any) => {
    if (act.manuscriptId) {
      const ms = manuscripts.find(m => m.id === act.manuscriptId);
      if (ms) return ms.title;
    }
    if (act.queryId) {
      const q = queries.find(qu => qu.id === act.queryId);
      if (q) {
        const ms = manuscripts.find(m => m.id === q.manuscriptId);
        if (ms) return ms.title;
      }
    }
    return "";
  };

  const renderIndividualQueryDotShared = (
    q: Query,
    stage: 'queried' | 'part_req' | 'part_sent' | 'full_req' | 'full_sent' | 'offer' | 'closed',
    size: number
  ) => {
    const agent = agents.find(a => a.id === q.agentId);
    const formattedDate = q.dateSent ? new Date(q.dateSent).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';
    
    let dateLabel = "Sent";
    let displayDate = formattedDate;
    if (stage === 'part_req' && q.partialRequestedDate) {
      dateLabel = "Requested";
      displayDate = new Date(q.partialRequestedDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } else if (stage === 'part_sent' && q.partialSentDate) {
      dateLabel = "Sent";
      displayDate = new Date(q.partialSentDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } else if (stage === 'full_req' && q.fullRequestedDate) {
      dateLabel = "Requested";
      displayDate = new Date(q.fullRequestedDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } else if (stage === 'full_sent' && q.fullSentDate) {
      dateLabel = "Sent";
      displayDate = new Date(q.fullSentDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    }

    const center = size / 2;
    const radius = Math.max(2.5, (size / 2) - 1);
    const strokeWidth = size <= 10 ? 1 : 1.5;

    const getPiePath = (pct: number) => {
      if (pct <= 0 || pct >= 100) return "";
      const startAngle = -Math.PI / 2; // 12 o'clock
      const angleDiff = (pct / 100) * 2 * Math.PI;
      const endAngle = startAngle + angleDiff;
      
      const startX = center + radius * Math.cos(startAngle);
      const startY = center + radius * Math.sin(startAngle);
      const endX = center + radius * Math.cos(endAngle);
      const endY = center + radius * Math.sin(endAngle);
      
      const largeArcFlag = pct > 50 ? 1 : 0;
      return `M ${center} ${center} L ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;
    };

    let percentage = 0;
    if (stage === 'queried') percentage = 0;
    else if (stage === 'part_req') percentage = 20;
    else if (stage === 'part_sent') percentage = 40;
    else if (stage === 'full_req') percentage = 60;
    else if (stage === 'full_sent') percentage = 80;
    else if (stage === 'offer') percentage = 100;

    return (
      <div 
        key={q.id}
        className="relative group/dot inline-flex items-center justify-center select-none transition-all duration-300 hover:scale-130 hover:z-10 cursor-pointer"
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        <svg 
          width={size} 
          height={size} 
          viewBox={`0 0 ${size} ${size}`} 
          className="w-full h-full drop-shadow-[0_1px_1px_rgba(124,58,42,0.06)]"
        >
          {stage === 'closed' ? (
            <>
              <circle cx={center} cy={center} r={radius} fill="#888888" stroke="#888888" strokeWidth={strokeWidth} />
              <line x1={center - (radius * 0.4)} y1={center - (radius * 0.4)} x2={center + (radius * 0.4)} y2={center + (radius * 0.4)} stroke="#ffffff" strokeWidth={strokeWidth} />
              <line x1={center + (radius * 0.4)} y1={center - (radius * 0.4)} x2={center - (radius * 0.4)} y2={center + (radius * 0.4)} stroke="#ffffff" strokeWidth={strokeWidth} />
            </>
          ) : percentage === 0 ? (
            <circle cx={center} cy={center} r={radius} fill="none" stroke="#7c3d3d" strokeWidth={strokeWidth} />
          ) : percentage === 100 ? (
            <circle cx={center} cy={center} r={radius} fill="#7c3d3d" stroke="#7c3d3d" strokeWidth={strokeWidth} />
          ) : (
            <>
              <circle cx={center} cy={center} r={radius} fill="none" stroke="#7c3d3d" strokeWidth={strokeWidth} />
              <path d={getPiePath(percentage)} fill="#7c3d3d" stroke="none" />
            </>
          )}
        </svg>

        {/* Pure CSS Hover Tooltip */}
        <div className="invisible group-hover/dot:visible opacity-0 group-hover/dot:opacity-100 absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-3 bg-stone-900 text-stone-100 rounded-xl text-[11px] font-sans shadow-lg text-left pointer-events-none transition-all duration-200">
          <div className="font-bold text-white truncate">{agent?.name || "Unknown Agent"}</div>
          <div className="text-stone-400 text-[10px] truncate">{agent?.agency || "Independent"}</div>
          <div className="h-[1px] bg-stone-800 my-1.5" />
          <div className="flex justify-between gap-2 text-stone-300 text-[10px]">
            <span>Status:</span>
            <span className="font-semibold text-rose-400">{q.status}</span>
          </div>
          <div className="flex justify-between gap-2 text-stone-300 text-[10px] mt-0.5">
            <span>{dateLabel}:</span>
            <span className="font-mono text-stone-400">{displayDate}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderStageColumnShared = (list: Query[], stageKey: 'queried' | 'part_req' | 'part_sent' | 'full_req' | 'full_sent' | 'offer' | 'closed') => {
    const dotsCount = list.length;
    if (dotsCount === 0) {
      return (
        <div className="flex items-center justify-center min-h-[26px]">
          <span className="text-stone-300 font-medium select-none font-sans">-</span>
        </div>
      );
    }

    let size = 16;
    if (dotsCount > 10) size = 8;
    else if (dotsCount > 6) size = 11;
    else if (dotsCount > 3) size = 13;

    return (
      <div className="flex items-center justify-center min-h-[26px]">
        <div className="flex flex-row flex-wrap gap-[2px] items-center justify-center max-w-full">
          {list.map((q) => renderIndividualQueryDotShared(q, stageKey, size))}
        </div>
      </div>
    );
  };

  const renderMagazinePipelineBuckets = () => {
    const queriedCount = queries.filter(q => q.status === QueryStatus.QUERIED).length;
    const partReqCount = queries.filter(q => q.status === QueryStatus.PARTIAL_REQUESTED).length;
    const partSentCount = queries.filter(q => q.status === QueryStatus.PARTIAL_SENT).length;
    const fullReqCount = queries.filter(q => q.status === QueryStatus.FULL_REQUESTED).length;
    const fullSentCount = queries.filter(q => q.status === QueryStatus.FULL_SENT).length;
    const offerCount = queries.filter(q => q.status === QueryStatus.OFFER).length;
    const closedCount = queries.filter(q => [QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE].includes(q.status)).length;

    const stagesData = [
      { name: "Queried", count: queriedCount, color: "#FFF0F0" },
      { name: "Partial requested", count: partReqCount, color: "#dce0d9" },
      { name: "Partial sent", count: partSentCount, color: "#dce0d9" },
      { name: "Full requested", count: fullReqCount, color: "#D1E3FF" },
      { name: "Full sent", count: fullSentCount, color: "#D1E3FF" },
      { name: "Offer", count: offerCount, color: "#6b0f1a" },
      { name: "Closed", count: closedCount, color: "#e8e8e8" }
    ];

    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 mb-4 mt-1 text-left">
        {stagesData.map((st, sIdx) => {
          const isZero = st.count === 0;
          return (
            <div key={sIdx} className="bg-[#FAF8F5] border border-[#e8d5cc] rounded-lg p-2.5 flex flex-col justify-between min-h-[68px] relative overflow-hidden shadow-2xs">
              <div>
                <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#c9a89e' }} className="font-semibold leading-none">
                  {st.name}
                </div>
                <div 
                  style={{ 
                    fontSize: '18px', 
                    fontWeight: 500, 
                    color: isZero ? '#e8d5cc' : '#3a1c14',
                    fontFamily: 'var(--font-serif)'
                  }} 
                  className="mt-1 font-serif leading-none"
                >
                  {st.count}
                </div>
              </div>
              {/* 3px color bar at the bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ backgroundColor: st.color }} />
            </div>
          );
        })}
      </div>
    );
  };

  const renderTasksSidebarWidget = () => {
    const sortedTasks = [...tasks].sort((a, b) => b.priority === "urgent" ? 1 : -1);
    const currentIdx = spotlightTaskIndex >= sortedTasks.length ? 0 : spotlightTaskIndex;
    const activeTask = sortedTasks[currentIdx];

    // Sweep/swipe states
    let touchStartX = 0;
    let touchEndX = 0;

    const handleTouchStart = (e: React.TouchEvent) => {
      touchStartX = e.changedTouches[0].screenX;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
      touchEndX = e.changedTouches[0].screenX;
      const diff = touchStartX - touchEndX;
      if (Math.abs(diff) > 50) {
        if (diff > 0) {
          setSpotlightTaskIndex((prev) => (sortedTasks.length > 0 ? (prev + 1) % sortedTasks.length : 0));
        } else {
          setSpotlightTaskIndex((prev) => (sortedTasks.length > 0 ? (prev - 1 + sortedTasks.length) % sortedTasks.length : 0));
        }
      }
    };

    const handleCycleNext = (e?: React.MouseEvent) => {
      if (e) {
        e.stopPropagation();
      }
      if (sortedTasks.length > 0) {
        setSpotlightTaskIndex((prev) => (prev + 1) % sortedTasks.length);
      }
    };

    const handleDotClick = (idx: number, e: React.MouseEvent) => {
      e.stopPropagation();
      setSpotlightTaskIndex(idx);
    };

    const isWidgetActiveUrgent = activeTask && (activeTask.priority === "urgent" || ["offer_received", "partial_requested", "full_requested", "revise_resubmit"].includes(activeTask.taskType));

    return (
      <div 
        className={`flex flex-col h-full rounded-xl relative transition-all duration-300 p-3 ${
          isWidgetActiveUrgent ? "bg-[#fff0f0] border border-red-200" : "bg-[#FAF8F5]"
        }`}
      >
        {isWidgetActiveUrgent && (
          <div 
            className="absolute bg-red-600 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center select-none shadow-3xs" 
            style={{ width: "16px", height: "16px", top: "10px", right: "10px", zIndex: 10 }}
            title="Urgent"
          >
            !
          </div>
        )}
        {sortedTasks.length > 0 && activeTask ? (
          (() => {
            const { agentName, agency, manuscriptTitle } = getTaskContextInfo(activeTask, queries, agents, manuscripts);
            let subText = "";
            if (agentName && agency && manuscriptTitle) {
              subText = `${manuscriptTitle} • ${agentName} (${agency})`;
            } else if (agentName && agency) {
              subText = `${agentName} (${agency})`;
            } else if (agentName && manuscriptTitle) {
              subText = `${manuscriptTitle} • ${agentName}`;
            } else {
              subText = activeTask.manuscriptTitle ? `${activeTask.manuscriptTitle} • ${activeTask.context}` : activeTask.context;
            }

            return (
              <div 
                className="flex flex-col h-full justify-between"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                {/* Task Content Area */}
                <div 
                  className="cursor-pointer group text-left flex-grow flex flex-col justify-center min-h-[65px]" 
                  onClick={() => handleCycleNext()}
                  title="Click or swipe to cycle tasks"
                >
                  <h3 className="font-serif text-[14px] text-[#3a1c14] leading-snug mt-1 font-medium pr-4 select-none">
                    {activeTask.title}
                  </h3>
                  <p className="text-[#a08070] text-[10.5px] font-sans mt-1.5 truncate select-none">
                    {subText}
                  </p>
                </div>

                {/* Buttons Row */}
                <div className="flex items-center gap-3 mt-3 flex-wrap" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate(activeTask.actionPath, activeTask.title);
                    }}
                    className="px-3 py-1 text-[10px] leading-none font-medium bg-[#7c3a2a] text-[#F8F5F0] rounded-full hover:bg-[#602d20] transition-colors cursor-pointer"
                  >
                    Send now
                  </button>
                  
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      await dismissTask(activeTask.taskType, activeTask.relatedRecordId, "fixed snooze", 3);
                    }}
                    className="text-[#c9a89e] hover:text-[#7c3a2a] text-[10px] leading-none font-medium transition-colors cursor-pointer bg-transparent border-none p-1 flex items-center gap-1"
                  >
                    <span>Snooze</span>
                    <Clock className="w-3 h-3" />
                  </button>

                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      await dismissTask(activeTask.taskType, activeTask.relatedRecordId, "permanent");
                    }}
                    className="text-[#c9a89e] hover:text-[#7c3a2a] text-[10px] leading-none font-medium transition-colors cursor-pointer bg-transparent border-none p-1"
                  >
                    Dismiss ×
                  </button>
                </div>

                <div className="h-[0.5px] bg-[#e8d5cc]/60 my-2.5" />

                {/* Footer */}
                <div className="flex items-center justify-between text-[10.5px] select-none">
                  <span className="text-[#b09080] font-medium">
                    {sortedTasks.length > 1 ? `+ ${sortedTasks.length - 1} more` : "No other tasks"}
                  </span>

                  {/* Dot navigation with Chevrons */}
                  <div className="flex items-center gap-1 bg-stone-100/40 rounded-full px-1">
                    {sortedTasks.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSpotlightTaskIndex((prev) => (sortedTasks.length > 0 ? (prev - 1 + sortedTasks.length) % sortedTasks.length : 0));
                        }}
                        className="text-[#c9a89e] hover:text-[#7c3a2a] p-0.5 cursor-pointer transition-colors flex items-center justify-center bg-transparent border-0"
                        title="Previous task"
                      >
                        <ChevronLeft className="w-3 h-3 stroke-[2.5]" />
                      </button>
                    )}

                    <div className="flex items-center gap-1">
                      {sortedTasks.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={(e) => handleDotClick(idx, e)}
                          className={`transition-all cursor-pointer rounded-full w-[4px] h-[4px] ${
                            idx === currentIdx ? 'bg-[#7c3a2a]' : 'bg-[#e8d5cc]'
                          }`}
                          title={`Go to task ${idx + 1}`}
                        />
                      ))}
                    </div>

                    {sortedTasks.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSpotlightTaskIndex((prev) => (sortedTasks.length > 0 ? (prev + 1) % sortedTasks.length : 0));
                        }}
                        className="text-[#c9a89e] hover:text-[#7c3a2a] p-0.5 cursor-pointer transition-colors flex items-center justify-center bg-transparent border-0"
                        title="Next task"
                      >
                        <ChevronRight className="w-3 h-3 stroke-[2.5]" />
                      </button>
                    )}
                  </div>

                  {/* View all link */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsTasksPanelOpen(true);
                    }}
                    className="text-[#7c3a2a] hover:text-[#5e2b1e] font-medium flex items-center gap-0.5 transition-all cursor-pointer hover:underline bg-transparent border-0"
                  >
                    <span>View all</span>
                    <ArrowRight className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            );
          })()
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-4 bg-stone-50/40 rounded-lg border border-dashed border-[#e8d5cc]/50">
            <CheckSquare className="w-5 h-5 text-[#c9a89e] mb-1.5" />
            <p className="text-[10px] text-[#3a1c14] font-semibold">All tasks completed</p>
            <p className="text-[9.5px] text-stone-400 mt-0.5 leading-normal max-w-[180px]">
              No outstanding desks require attention. Excellent job!
            </p>
          </div>
        )}
      </div>
    );
  };

  // Helper to format timestamps to 12-hour am/pm clock format, e.g. "10:53pm"
  const getFormattedTime = (dateInput: any) => {
    if (!dateInput) return "12:00pm";
    try {
      const d = new Date(dateInput);
      if (isNaN(d.getTime())) return "12:00pm";
      let hours = d.getHours();
      const minutes = d.getMinutes();
      const ampm = hours >= 12 ? 'pm' : 'am';
      hours = hours % 12;
      hours = hours ? hours : 12; 
      const minutesStr = minutes < 10 ? '0' + minutes : minutes;
      return `${hours}:${minutesStr}${ampm}`;
    } catch (e) {
      return "12:00pm";
    }
  };

  // Helper to format date keys into clean uppercase display headers
  const getDisplayDateHeader = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr.toUpperCase();
      
      const weekdays = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
      const dayName = weekdays[d.getDay()];

      const today = new Date();
      if (d.toDateString() === today.toDateString()) {
        return "TODAY";
      }
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      if (d.toDateString() === yesterday.toDateString()) {
        return "YESTERDAY";
      }

      const diffTime = Math.abs(today.getTime() - d.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 3) {
        return dayName;
      } else {
        const day = d.getDate();
        const monthShort = d.toLocaleDateString("en-GB", { month: "short" }).toUpperCase();
        const weekdayShort = d.toLocaleDateString("en-GB", { weekday: "short" }).toUpperCase();
        return `${weekdayShort} ${day} ${monthShort}`;
      }
    } catch (e) {
      return dateStr.toUpperCase();
    }
  };

  return (
    <div className="min-h-screen bg-[#FCFAF7] pb-16 font-sans text-[#3a1c14]">
      
      {/* Developer-only floating layout toggle */}
      <button
        onClick={() => {
          const next = !isMagazineLayout;
          setIsMagazineLayout(next);
          localStorage.setItem("scriptally_is_magazine_layout", String(next));
        }}
        style={{
          position: 'fixed',
          bottom: '16px',
          left: '16px',
          zIndex: 9999,
          background: '#3a1c14',
          color: '#F8F5F0',
          border: 'none',
          borderRadius: '6px',
          padding: '6px 12px',
          fontSize: '11px',
          cursor: 'pointer',
          opacity: 0.7
        }}
        className="hover:opacity-100 transition-opacity font-mono select-none shadow-md"
      >
        Switch layout
      </button>

      {/* ── Guided empty state for brand-new users ── */}
      {manuscripts.length === 0 && queries.length === 0 && agents.length === 0 && (
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px" }}>
          {/* Welcome card */}
          <div style={{
            background: "#FFFDF9",
            border: "0.5px solid #EBDCD3",
            borderLeft: "4px solid #7c3a2a",
            borderRadius: 14,
            padding: "24px 28px",
            marginBottom: 24,
          }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#c9a89e", marginBottom: 8 }}>
              Welcome to ScriptAlly
            </div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 500, letterSpacing: "-0.02em", color: "#3a1c14", margin: "0 0 10px", lineHeight: 1.3 }}>
              Your querying journey starts here.
            </h2>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 300, color: "#a08070", margin: 0, lineHeight: 1.65 }}>
              You'll need a manuscript and at least one agent before you can log your first query. We'll guide you through it — no rush.
            </p>
          </div>

          {/* Onboarding task card */}
          <div style={{
            background: "#FFFDF9",
            border: "0.5px solid #EBDCD3",
            borderRadius: 14,
            padding: "18px 22px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}>
            <div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "#7c3a2a", marginBottom: 5 }}>
                Urgent · Next step
              </div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 500, color: "#3a1c14", marginBottom: 3 }}>
                Add your manuscript
              </div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 300, color: "#a08070" }}>
                Everything in ScriptAlly starts here — just a title and genre to begin.
              </div>
            </div>
            <button
              onClick={() => onNavigate("manuscripts", "Add a manuscript")}
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                letterSpacing: "0.06em",
                background: "#7c3a2a",
                color: "#f5ede8",
                border: "none",
                borderRadius: 10,
                padding: "9px 18px",
                cursor: "pointer",
                flexShrink: 0,
                whiteSpace: "nowrap",
              }}
            >
              Add now
            </button>
          </div>

          {/* Ghost placeholder cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {[
              { label: "No agents yet", sub: "Add agents or import your spreadsheet", icon: "👥" },
              { label: "No queries logged", sub: "Your pipeline will appear here", icon: "✉️" },
            ].map((card, i) => (
              <div key={i} style={{
                background: "#fffdf9",
                border: "0.5px dashed #EBDCD3",
                borderRadius: 12,
                padding: "24px 20px",
                opacity: 0.6,
                textAlign: "center",
              }}>
                <div style={{ fontSize: 22, marginBottom: 8 }}>{card.icon}</div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500, color: "#3a1c14", marginBottom: 4 }}>
                  {card.label}
                </div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 300, color: "#a08070" }}>
                  {card.sub}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isMagazineLayout ? (
        /* ==================== MAGAZINE EDITORIAL HEADER + STRIP ==================== */
        <div className="w-full flex flex-col">
          {/* Full-bleed dark editorial header */}
          <div style={{ background: '#3a1c14', padding: '24px 28px 28px' }} className="w-full flex flex-col md:flex-row md:items-end md:justify-between gap-6 animate-fade-in border-b border-[#4d261b]">
            {/* Left side */}
            <div className="flex-1 text-left">
              <div style={{ fontSize: '10px', color: 'rgba(248,245,240,0.4)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }} className="font-mono">
                {new Date().toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase()}
              </div>
              <div style={{ fontSize: '14px', color: 'rgba(248,245,240,0.6)', fontFamily: 'var(--font-serif)' }}>
                Welcome back,
              </div>
              <div style={{ fontSize: '32px', fontWeight: 500, color: '#F8F5F0', fontFamily: 'var(--font-serif)', lineHeight: 1 }} className="mt-1 font-serif">
                {getUserFirstName()}.
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(248,245,240,0.45)', fontStyle: 'italic', marginTop: '10px', maxWidth: '400px', lineHeight: 1.5 }} className="font-serif">
                {quote.text ? `"${quote.text}" — ${quote.author || "Unknown"}` : '"There is no greater agony than bearing an untold story inside you." — Maya Angelou'}
              </div>
            </div>

            {/* Right side aligned to bottom */}
            <div className="flex flex-wrap gap-2 md:mb-1 shrink-0 justify-start">
              <button
                onClick={() => onNavigate("queries", "Send a query")}
                className="hover:bg-white/20 transition-all font-sans text-[11px] leading-none font-medium text-white px-3.5 py-2 border cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.2)', borderRadius: '6px' }}
              >
                Send query
              </button>
              <button
                onClick={() => onNavigate("agents", "Add an agent")}
                className="hover:bg-white/20 transition-all font-sans text-[11px] leading-none font-medium text-white px-3.5 py-2 border cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.2)', borderRadius: '6px' }}
              >
                Add agent
              </button>
              <button
                onClick={() => onNavigate("manuscripts", "Add a manuscript")}
                className="hover:bg-white/20 transition-all font-sans text-[11px] leading-none font-medium text-white px-3.5 py-2 border cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.2)', borderRadius: '6px' }}
              >
                Add manuscript
              </button>
            </div>
          </div>

          {/* Stats strip */}
          <div className="w-full bg-white flex flex-col md:flex-row border-b border-[#e8e0d8] shadow-xs" style={{ borderBottomWidth: '0.5px' }}>
            {/* Stat 1: Queries Sent */}
            <div className="flex-1 flex items-center gap-[16px] p-[14px_20px] border-b md:border-b-0 md:border-r border-[#e8e0d8] text-left" style={{ borderBottomWidth: '0.5px', borderRightWidth: '0.5px' }}>
              <span className="font-serif font-medium text-[#3a1c14] leading-none shrink-0" style={{ fontSize: '28px' }}>
                {totalQueriesSent || 7}
              </span>
              <div className="flex flex-col gap-1">
                <span className="font-bold uppercase" style={{ fontSize: '10px', letterSpacing: '0.06em', color: '#c9a89e' }}>
                  Queries sent
                </span>
                <span className="inline-flex self-start py-0.5 px-2 text-[9px] font-bold text-[#7c3a2a] bg-[#FAF1EF] border border-[#F2DDD5] rounded-full leading-none whitespace-nowrap">
                  {dynamicQueriesSentPerWeek[7] > 0 ? `${dynamicQueriesSentPerWeek[7]} this week` : "2 this week"}
                </span>
              </div>
            </div>

            {/* Stat 2: Active Queries */}
            <div className="flex-1 flex items-center gap-[16px] p-[14px_20px] border-b md:border-b-0 md:border-r border-[#e8e0d8] text-left" style={{ borderBottomWidth: '0.5px', borderRightWidth: '0.5px' }}>
              <span className="font-serif font-medium text-[#3a1c14] leading-none shrink-0" style={{ fontSize: '28px' }}>
                {activeQueries.length || 6}
              </span>
              <div className="flex flex-col gap-1">
                <span className="font-bold uppercase" style={{ fontSize: '10px', letterSpacing: '0.06em', color: '#c9a89e' }}>
                  Active queries
                </span>
                <span className="inline-flex self-start py-0.5 px-2 text-[9px] font-bold text-[#7c3a2a] bg-[#FAF1EF] border border-[#F2DDD5] rounded-full leading-none whitespace-nowrap">
                  57% rate
                </span>
              </div>
            </div>

            {/* Stat 3: Agents */}
            <div className="flex-1 flex items-center gap-[16px] p-[14px_20px] border-b md:border-b-0 md:border-r border-[#e8e0d8] text-left" style={{ borderBottomWidth: '0.5px', borderRightWidth: '0.5px' }}>
              <span className="font-serif font-medium text-[#3a1c14] leading-none shrink-0" style={{ fontSize: '28px' }}>
                {totalAgentsCount || 7}
              </span>
              <div className="flex flex-col gap-1">
                <span className="font-bold uppercase" style={{ fontSize: '10px', letterSpacing: '0.06em', color: '#c9a89e' }}>
                  Agents
                </span>
                <span className="inline-flex self-start py-0.5 px-2 text-[9px] font-bold text-[#7c3a2a] bg-[#FAF1EF] border border-[#F2DDD5] rounded-full leading-none whitespace-nowrap">
                  {queriedAgentsCount > 0 ? `${queriedAgentsCount} queried` : "6 queried"}
                </span>
              </div>
            </div>

            {/* Stat 4: Responses Received */}
            <div className="flex-1 flex items-center gap-[16px] p-[14px_20px] text-left">
              <span className="font-serif font-medium text-[#3a1c14] leading-none shrink-0" style={{ fontSize: '28px' }}>
                {totalResponsesCalc || 4}
              </span>
              <div className="flex flex-col gap-1">
                <span className="font-bold uppercase" style={{ fontSize: '10px', letterSpacing: '0.06em', color: '#c9a89e' }}>
                  Responses received
                </span>
                <span className="inline-flex self-start py-0.5 px-2 text-[9px] font-bold text-[#7c3a2a] bg-[#FAF1EF] border border-[#F2DDD5] rounded-full leading-none whitespace-nowrap">
                  2 this week
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ==================== ORIGINAL BENTO HEADER ==================== */
        <div className="w-full max-w-none px-4 md:px-10 lg:px-14 xl:px-16 pt-6 space-y-6">
          {/* CONDITIONALLY RENDERED HEADER SKETCHES */}
          <div className="transition-all duration-300">
          {headerStyle === "bento" && (
            /* ==================== HEADER OPTION 1: MODERN BENTO GRAPHICS GRID ==================== */
            <div className="grid grid-cols-1 md:grid-cols-[1fr_26.67%] gap-8 items-stretch animate-fade-in" id="header-sketch-bento">
              {/* Box 1: Greeting & Literary Quote & Quick Actions Row */}
              <div 
                className="bg-white rounded-2xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden group"
                style={{ 
                  borderLeft: '10px solid #7c3d3d', 
                  borderTop: '1px solid #EBDCD3', 
                  borderRight: '1px solid #EBDCD3', 
                  borderBottom: '1px solid #EBDCD3', 
                  height: '280px' 
                }}
              >
                {/* STYLISH PAPER PLANE ILLUSTRATION ON THE RIGHT SIDE (INTERACTIVE WITH CUSTOM UPLOAD) */}
                <div className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 w-32 h-32 md:w-44 md:h-44 flex flex-col items-center justify-center z-20 group/img transition-all duration-300 ease-out transform">
                  <input
                    type="file"
                    id="dashboard-image-input"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                  
                  <label htmlFor="dashboard-image-input" className="relative w-full h-full block cursor-pointer select-none">
                    {dashboardImage ? (
                      <div className="relative w-full h-full flex items-center justify-center">
                        <img
                          src={dashboardImage}
                          alt="Custom welcome graphic"
                          style={{ transform: `translate(${dashboardImageX}px, ${dashboardImageY}px) scale(${dashboardImageScale / 100})`, transformOrigin: 'center center' }}
                          className="object-contain w-full h-full rounded-xl drop-shadow-[0_4px_10px_rgba(124,58,42,0.12)] transition-all duration-300"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ) : (
                      <div className="relative w-full h-full flex items-center justify-center">
                        <img
                          src="/input_file_0.png"
                          alt="Paper plane watercolor sketch"
                          style={{ transform: `translate(${dashboardImageX}px, ${dashboardImageY}px) scale(${dashboardImageScale / 100})`, transformOrigin: 'center center' }}
                          className="object-contain w-full h-full opacity-80 group-hover/img:opacity-100 drop-shadow-[0_4px_10px_rgba(124,58,42,0.12)] transition-all duration-300 font-mono text-xs text-stone-400"
                          referrerPolicy="no-referrer"
                        />
                        {/* Hover Overlay indicator to prompt upload */}
                        <div className="absolute inset-0 bg-[#7c3a2a]/5 rounded-xl flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">
                          <span className="bg-[#FCFAF7]/95 text-[#7c3a2a] text-[10px] font-semibold px-2.5 py-1.5 rounded-lg shadow-sm border border-[#EBDCD3] flex items-center gap-1.5 hover:bg-[#FAF1EF] transition-colors">
                            <Camera className="w-3.5 h-3.5 text-[#CD4E46]" /> Choose Image
                          </span>
                        </div>
                      </div>
                    )}
                  </label>

                  {/* Elegant builder floating bar - ONLY visible on hover */}
                  <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 bg-white/95 border border-[#EBDCD3] rounded-full px-3 py-1.5 shadow-md flex items-center gap-2.5 z-30 opacity-0 group-hover/img:opacity-100 transition-opacity pointer-events-auto whitespace-nowrap">
                    {/* Positioning Section */}
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleMoveLeft(); }}
                        className="p-1 hover:bg-[#FAF1EF] text-stone-600 hover:text-[#7c3a2a] rounded transition-colors cursor-pointer"
                        title="Move Left (X - 5px)"
                        type="button"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[9px] font-mono font-bold text-stone-500 min-w-[28px] text-center" title="Horizontal position offset">
                        X:{dashboardImageX}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleMoveRight(); }}
                        className="p-1 hover:bg-[#FAF1EF] text-stone-600 hover:text-[#7c3a2a] rounded transition-colors cursor-pointer"
                        title="Move Right (X + 5px)"
                        type="button"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="w-px h-3 bg-[#EBDCD3]" />

                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleMoveUp(); }}
                        className="p-1 hover:bg-[#FAF1EF] text-stone-600 hover:text-[#7c3a2a] rounded transition-colors cursor-pointer"
                        title="Move Up (Y - 5px)"
                        type="button"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[9px] font-mono font-bold text-stone-500 min-w-[28px] text-center" title="Vertical position offset">
                        Y:{dashboardImageY}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleMoveDown(); }}
                        className="p-1 hover:bg-[#FAF1EF] text-stone-600 hover:text-[#7c3a2a] rounded transition-colors cursor-pointer"
                        title="Move Down (Y + 5px)"
                        type="button"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="w-px h-3 bg-[#EBDCD3]" />

                    {/* Scale Section */}
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleDecreaseScale(); }}
                        className="p-1 hover:bg-[#FAF1EF] text-stone-600 hover:text-[#7c3a2a] rounded transition-colors cursor-pointer"
                        title="Decrease size (Scale Down)"
                        type="button"
                      >
                        <ZoomOut className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[9px] font-mono font-bold text-stone-700 min-w-[32px] text-center">
                        {dashboardImageScale}%
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleIncreaseScale(); }}
                        className="p-1 hover:bg-[#FAF1EF] text-stone-600 hover:text-[#7c3a2a] rounded transition-colors cursor-pointer"
                        title="Increase size (Scale Up)"
                        type="button"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="w-px h-3 bg-[#EBDCD3]" />

                    <button
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleResetPosition(); }}
                      className="px-1.5 py-1 hover:bg-[#FAF1EF] text-stone-500 hover:text-stone-700 rounded text-[9px] font-bold tracking-tight transition-colors cursor-pointer"
                      title="Reset position and size scale"
                      type="button"
                    >
                      Reset Pos
                    </button>

                    {dashboardImage && (
                      <>
                        <div className="w-px h-3 bg-[#EBDCD3]" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleRemoveImage(e);
                          }}
                          className="p-1 hover:bg-red-50 text-red-500 hover:text-red-700 rounded transition-colors cursor-pointer"
                          title="Reset to default artwork"
                          type="button"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-3 md:pr-36 ml-4 md:ml-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] font-mono tracking-wider font-bold text-stone-400 uppercase">
                        {new Date().toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase()}
                      </span>
                    </div>
                    <h1 className="font-serif text-[#3a1c14] tracking-tight" style={{ fontSize: '45px' }}>
                      Welcome back, <span className="font-bold text-[#7c3a2a]">{getUserFirstName()}</span>
                    </h1>
                  </div>
                </div>

                <div className="mt-4 md:pr-36 ml-4 md:ml-6">
                  {quote.text ? (
                    <p className="text-xs text-stone-600 font-light italic leading-relaxed">
                      "{quote.text}"
                      {quote.author && (
                        <span className="block text-[10px] font-bold text-[#7c3a2a] not-italic mt-1.5 font-mono">
                          &mdash; {quote.author}
                        </span>
                      )}
                    </p>
                  ) : (
                    <p className="text-xs text-stone-400 italic">Reading the inkwells...</p>
                  )}
                </div>

                <div className="mt-5 flex flex-wrap gap-2.5 z-10 md:pr-36 ml-4 md:ml-6">
                  <button
                    onClick={() => onNavigate("queries", "Send a query")}
                    className="flex items-center gap-1.5 bg-[#7c3a2a] hover:bg-[#632e22] text-white font-semibold py-1.5 px-3.5 rounded-xl text-xs transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 duration-150 cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Send query</span>
                  </button>
                  
                  <button
                    onClick={() => onNavigate("agents", "Add an agent")}
                    className="flex items-center gap-1.5 bg-[#FCFAF7] border border-[#EBDCD3] text-[#3a1c14] hover:bg-[#FAF1EF] font-semibold py-1.5 px-3.5 rounded-xl text-xs transition-all cursor-pointer hover:shadow-xs hover:-translate-y-0.5 duration-150"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#BA7517]" />
                    <span>Add agent</span>
                  </button>
                  
                  <button
                    onClick={() => onNavigate("manuscripts", "Add a manuscript")}
                    className="flex items-center gap-1.5 bg-[#FCFAF7] border border-[#EBDCD3] text-[#3a1c14] hover:bg-[#FAF1EF] font-semibold py-1.5 px-3.5 rounded-xl text-xs transition-all cursor-pointer hover:shadow-xs hover:-translate-y-0.5 duration-150"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-[#CD4E46]" />
                    <span>Add manuscript</span>
                  </button>
                </div>
              </div>

              {/* Box 2 Col Container: Updated To-do checklist (and Tips of the day when empty to fill the dead space) */}
              <div className="flex flex-col gap-4 justify-center h-full">
                {/* To-Do Checklist Card container */}
                {(() => {
                  const sortedTasks = [...tasks].sort((a, b) => getPriorityRank(a) - getPriorityRank(b));
                  const currentIdx = spotlightTaskIndex >= sortedTasks.length ? 0 : spotlightTaskIndex;
                  const activeTask = sortedTasks[currentIdx];
                  const isBentoActiveUrgent = activeTask && (activeTask.priority === "urgent" || ["offer_received", "partial_requested", "full_requested", "revise_resubmit"].includes(activeTask.taskType));

                  return (
                    <div
                      className={`transition-all duration-300 relative rounded-2xl flex flex-col animate-fade-in p-5 select-none border-x-[0.5px] border-b-[0.5px] border-x-[#e8d5cc] border-b-[#e8d5cc] border-t-[3px] border-t-[#7c3a2a] ${
                        isBentoActiveUrgent ? "bg-[#fff0f0]" : "bg-[#FDF6F0]"
                      }`}
                      style={{ 
                        boxShadow: '0 4px 22px rgba(58,28,20,0.07)'
                      }}
                      id="header-bento-todo-list"
                    >
                      {isBentoActiveUrgent && (
                        <div 
                          className="absolute bg-red-600 text-white text-[12px] font-extrabold rounded-full flex items-center justify-center select-none shadow-3xs" 
                          style={{ width: "20px", height: "20px", top: "12px", right: "12px", zIndex: 10 }}
                          title="Urgent"
                        >
                          !
                        </div>
                      )}
                      {(() => {

                    // Swipe states
                    let touchStartX = 0;
                    let touchEndX = 0;

                    const handleTouchStart = (e: React.TouchEvent) => {
                      touchStartX = e.changedTouches[0].screenX;
                    };

                    const handleTouchEnd = (e: React.TouchEvent) => {
                      touchEndX = e.changedTouches[0].screenX;
                      const diff = touchStartX - touchEndX;
                      if (Math.abs(diff) > 50) {
                        if (diff > 0) {
                          setSpotlightTaskIndex((prev) => (sortedTasks.length > 0 ? (prev + 1) % sortedTasks.length : 0));
                        } else {
                          setSpotlightTaskIndex((prev) => (sortedTasks.length > 0 ? (prev - 1 + sortedTasks.length) % sortedTasks.length : 0));
                        }
                      }
                    };

                    const handleCycleNext = (e?: React.MouseEvent) => {
                      if (e) {
                        e.stopPropagation();
                      }
                      if (sortedTasks.length > 0) {
                        setSpotlightTaskIndex((prev) => (prev + 1) % sortedTasks.length);
                      }
                    };

                    const handleDotClick = (idx: number, e: React.MouseEvent) => {
                      e.stopPropagation();
                      setSpotlightTaskIndex(idx);
                    };

                    if (sortedTasks.length > 0 && activeTask) {
                      const { agentName, agency, manuscriptTitle } = getTaskContextInfo(activeTask, queries, agents, manuscripts);
                      let subText = "";
                      if (agentName && agency && manuscriptTitle) {
                        subText = `${manuscriptTitle} • ${agentName} (${agency})`;
                      } else if (agentName && agency) {
                        subText = `${agentName} (${agency})`;
                      } else if (agentName && manuscriptTitle) {
                        subText = `${manuscriptTitle} • ${agentName}`;
                      } else {
                        subText = activeTask.manuscriptTitle ? `${activeTask.manuscriptTitle} • ${activeTask.context}` : activeTask.context;
                      }

                      return (
                        <div 
                          className="flex flex-col h-full justify-between"
                          onTouchStart={handleTouchStart}
                          onTouchEnd={handleTouchEnd}
                        >
                          {/* Task Content Area (clickable to cycle) */}
                          <div 
                            className="cursor-pointer group text-left flex-1 flex flex-col justify-center min-h-[75px]" 
                            onClick={() => handleCycleNext()}
                            title="Click or swipe to cycle tasks"
                          >
                            <span className="text-[#c9a89e] text-[10px] uppercase font-mono tracking-[0.08em] font-bold">
                              Next up
                            </span>
                            <h3 className="font-serif text-[16px] text-[#3a1c14] leading-snug mt-1.5 font-medium pr-4">
                              {activeTask.title}
                            </h3>
                            <p className="text-[#a08070] text-[11px] font-sans mt-1.5 truncate">
                              {subText}
                            </p>
                          </div>

                          {/* Buttons Row */}
                          <div className="flex items-center gap-3 mt-3 flex-wrap" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onNavigate(activeTask.actionPath, activeTask.title);
                              }}
                              className="px-3.5 py-1 text-[11px] leading-none font-medium bg-[#7c3a2a] text-[#F8F5F0] rounded-full hover:bg-[#602d20] transition-colors cursor-pointer shadow-3xs"
                            >
                              {getTaskActionLabel(activeTask)}
                            </button>
                            
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                await dismissTask(activeTask.taskType, activeTask.relatedRecordId, "fixed snooze", 3);
                              }}
                              className="text-[#c9a89e] hover:text-[#7c3a2a] text-[11px] leading-none font-medium transition-colors cursor-pointer bg-transparent border-none p-1 flex items-center gap-1"
                            >
                              <span>Snooze</span>
                              <Clock className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                await dismissTask(activeTask.taskType, activeTask.relatedRecordId, "permanent");
                              }}
                              className="text-[#c9a89e] hover:text-[#7c3a2a] text-[11px] leading-none font-medium transition-colors cursor-pointer bg-transparent border-none p-1"
                            >
                              Dismiss ×
                            </button>
                          </div>

                          <div className="h-[0.5px] bg-[#e8d5cc] my-3.5" />

                          {/* Footer */}
                          <div className="flex items-center justify-between text-xs select-none">
                            <span className="text-[#b09080] text-[12px] font-medium">
                              {sortedTasks.length > 1 ? `+ ${sortedTasks.length - 1} more` : "No other tasks"}
                            </span>

                            {/* Dot navigation with Chevrons */}
                            <div className="flex items-center gap-1">
                              {sortedTasks.length > 1 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSpotlightTaskIndex((prev) => (sortedTasks.length > 0 ? (prev - 1 + sortedTasks.length) % sortedTasks.length : 0));
                                  }}
                                  className="text-[#c9a89e] hover:text-[#7c3a2a] p-1 cursor-pointer transition-colors flex items-center justify-center bg-transparent border-0"
                                  title="Previous task"
                                >
                                  <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
                                </button>
                              )}

                              <div className="flex items-center gap-1">
                                {sortedTasks.map((_, idx) => (
                                  <button
                                    key={idx}
                                    onClick={(e) => handleDotClick(idx, e)}
                                    className={`transition-all cursor-pointer rounded-full w-[5px] h-[5px] ${
                                      idx === currentIdx ? 'bg-[#7c3a2a]' : 'bg-[#e8d5cc]'
                                    }`}
                                    title={`Go to task ${idx + 1}`}
                                  />
                                ))}
                              </div>

                              {sortedTasks.length > 1 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSpotlightTaskIndex((prev) => (sortedTasks.length > 0 ? (prev + 1) % sortedTasks.length : 0));
                                  }}
                                  className="text-[#c9a89e] hover:text-[#7c3a2a] p-1 cursor-pointer transition-colors flex items-center justify-center bg-transparent border-0"
                                  title="Next task"
                                >
                                  <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                                </button>
                              )}
                            </div>

                            {/* View all link */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsTasksPanelOpen(true);
                              }}
                              className="text-[#7c3a2a] hover:text-[#5e2b1e] text-[12px] font-medium flex items-center gap-1 transition-all cursor-pointer hover:underline bg-transparent border-0"
                            >
                              <span>View all</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    } else {
                      // Elegant fallback when 0 tasks are outstanding, keeping the beautiful warm parchment card block
                      return (
                        <div className="flex flex-col h-full justify-between min-h-[140px]">
                          <div className="text-left flex-1 flex flex-col justify-center">
                            <span className="text-[#c9a89e] text-[10px] uppercase font-mono tracking-[0.08em] font-bold">
                              Next up
                            </span>
                            <h3 className="font-serif text-[16px] text-[#3a1c14] leading-snug mt-1.5 font-medium">
                              You're all caught up!
                            </h3>
                            <p className="text-[#a08070] text-[11px] font-sans mt-1.5">
                              No outstanding tasks require your attention.
                            </p>
                          </div>

                          <div className="h-[0.5px] bg-[#e8d5cc] my-3.5" />

                          <div className="flex items-center justify-between text-xs select-none">
                            <span className="text-[#b09080] text-[12px] font-medium">
                              0 tasks remaining
                            </span>
                            
                            <div className="flex items-center gap-1.5">
                              <span 
                                className="rounded-full w-[5px] h-[5px] bg-[#7c3a2a]"
                              />
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsTasksPanelOpen(true);
                              }}
                              className="text-[#7c3a2a] hover:text-[#5e2b1e] text-[12px] font-medium flex items-center gap-1 transition-all cursor-pointer hover:underline bg-transparent border-0"
                            >
                              <span>View history</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    }
                  })()}
                    </div>
                  );
                })()}

                {/* ScriptAlly Top Tip Feature (Fills the exact vertical dead space when tasks are all completed) */}
                {tasks.length === 0 && (
                  <div className="bg-white border border-[#EBDCD3] border-t-[3.5px] border-t-[#7c3a2a] rounded-2xl p-5 shadow-sm relative flex flex-col justify-between flex-1 min-h-[195px] animate-fade-in group select-none" id="scriptally-top-tips">

                    <div>
                      <div className="flex justify-between items-center text-[10px] font-mono text-stone-400 font-bold uppercase tracking-wider mb-2">
                        <span className="flex items-center gap-1">
                          <Lightbulb className="w-3.5 h-3.5 text-[#BA7517]" />
                          ScriptAlly Top Tip
                        </span>
                        <span className="bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded border border-stone-200 text-[9px] font-bold">
                          {currentTipIndex + 1}/{scriptallyTips.length}
                        </span>
                      </div>
                      <div className="flex-1 flex flex-col justify-center my-1.5">
                        <h4 className="font-serif text-[13.5px] font-semibold text-[#3a1c14] tracking-tight leading-snug mb-1">
                          {scriptallyTips[currentTipIndex].title}
                        </h4>
                        <p className="text-[11.5px] text-stone-600 leading-normal font-sans">
                          {scriptallyTips[currentTipIndex].description}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2.5 border-t border-dashed border-stone-200/60 mt-2 z-10">
                      <span className="text-[9px] font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded uppercase">
                        {scriptallyTips[currentTipIndex].tag}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setCurrentTipIndex(prev => (prev - 1 + scriptallyTips.length) % scriptallyTips.length)}
                          className="p-1 rounded-md hover:bg-stone-100 border border-transparent hover:border-stone-200 transition-colors cursor-pointer"
                          title="Previous Tip"
                        >
                          <ChevronLeft className="w-3.5 h-3.5 text-stone-600" />
                        </button>
                        <button
                          onClick={() => setCurrentTipIndex(prev => (prev + 1) % scriptallyTips.length)}
                          className="p-1 rounded-md hover:bg-stone-100 border border-transparent hover:border-stone-200 transition-colors cursor-pointer"
                          title="Next Tip"
                        >
                          <ChevronRight className="w-3.5 h-3.5 text-stone-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {headerStyle === "editorial" && (
            /* ==================== HEADER OPTION 2: DOUBLE-RULED EDITORIAL MASTHEAD ==================== */
            <div className="bg-white border-y-4 border-double border-[#7c3a2a]/30 py-8 px-4 text-center space-y-5 animate-fade-in" id="header-sketch-editorial">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#7c3a2a] font-bold block">
                The Literary Dispatch &amp; Manuscript Chronicle
              </span>
              
              <h1 className="text-4xl md:text-6xl font-serif font-semibold text-[#3a1c14] tracking-tight leading-none uppercase">
                THE SCRIPTALLY LEDGER
              </h1>

              <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#7c3a2a]/10 pt-4 border-t border-[#7c3a2a]/10 max-w-4xl mx-auto">
                <div className="py-2.5 md:py-0 text-center">
                  <span className="text-[9px] font-mono uppercase text-[#3a1c14]/40 block tracking-wider">Date of Issue</span>
                  <span className="font-serif text-[13px] font-semibold text-[#3a1c14] mt-0.5 block">
                    {new Date().toLocaleDateString("en-GB", { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
                <div className="py-2.5 md:py-0 text-center">
                  <span className="text-[9px] font-mono uppercase text-[#3a1c14]/40 block tracking-wider">Aesthetic Matrix Status</span>
                  <span className="font-serif text-[13px] font-semibold text-[#7c3a2a] mt-0.5 block">
                    ACTIVE OUTREACH: {responseRatePercent}% RESPONSE RATE
                  </span>
                </div>
                <div className="py-2.5 md:py-0 text-center">
                  <span className="text-[9px] font-mono uppercase text-[#3a1c14]/40 block tracking-wider">Attention Alert Counts</span>
                  <span className="font-serif text-[13px] font-semibold text-rose-700 mt-0.5 block cursor-pointer hover:underline" onClick={() => onNavigate("queries")}>
                    {tasks.length} MATTERS REQUIRE ATTENTION
                  </span>
                </div>
              </div>
            </div>
          )}

          {headerStyle === "academic" && (
            /* ==================== HEADER OPTION 3: ACADEMIC SPEC COVER PAGE ==================== */
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-8 md:p-12 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] max-w-4xl mx-auto space-y-6 text-left relative overflow-hidden animate-fade-in" id="header-sketch-academic">
              {/* Top accent page layout elements */}
              <div className="absolute top-0 right-0 p-4 font-mono text-[9px] text-[#3a1c14]/30 select-none">
                FORM // SA-D9
              </div>

              {/* Title group */}
              <div className="space-y-2">
                <h1 className="text-3xl md:text-4xl font-mono text-[#3a1c14] tracking-wider uppercase font-bold">
                  S C R I P T A L L Y   //   P R O D U C T I O N   L O G
                </h1>
                <div className="h-[2px] bg-[#7c3a2a] w-24" />
                <p className="text-[11px] font-mono text-stone-500 max-w-lg leading-relaxed pt-1">
                  OFFICIAL SUBMISSION SPECIFICATION DIRECTORY. INDEXED ACCOUNT LOGS CONFIGURED FOR WRITING PORTFOLIOS. DO NOT ACCUMULATE BACKLOGS.
                </p>
              </div>

              {/* Monospace Metadata fields */}
              <div className="pt-6 border-t border-stone-200/60 grid grid-cols-2 md:grid-cols-4 gap-6 font-mono text-xs leading-none text-stone-600">
                <div className="space-y-1.5">
                  <span className="text-[10px] text-stone-400 font-bold tracking-wider block">TRACKED PROJECTS</span>
                  <span className="text-sm font-semibold text-[#3a1c14] block">{manuscripts.length} MANUSCRIPTS</span>
                </div>
                <div className="space-y-1.5">
                  <span className="text-[10px] text-stone-400 font-bold tracking-wider block">OUTREACH DESPATCHES</span>
                  <span className="text-sm font-semibold text-[#3a1c14] block">{queries.length} RECORDED PITCHES</span>
                </div>
                <div className="space-y-1.5">
                  <span className="text-[10px] text-stone-400 font-bold tracking-wider block">ALERT CODES ACTIVE</span>
                  <span className={`text-sm font-semibold block ${tasks.length > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                    {tasks.length} LEVEL-1 ALERTS
                  </span>
                </div>
                <div className="space-y-1.5">
                  <span className="text-[10px] text-stone-400 font-bold tracking-wider block">PORTFOLIO USER STATUS</span>
                  <span className="text-sm font-semibold text-[#7c3a2a] block">Pen: ONLINE SANBOX</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FIREBASE AUTH SETUP EXPLANATION BANNER */}
        {isOfflineMode && (
          <div className="bg-[#FAF1EF] border border-[#7c3a2a]/20 rounded-2xl p-5 md:p-6 shadow-sm flex flex-col md:flex-row gap-4 md:gap-5 items-start">
            <div className="p-2.5 bg-[#7c3a2a]/10 rounded-xl text-[#7c3a2a] shrink-0">
              <Sparkles className="w-5.5 h-5.5 text-[#7c3a2a]" />
            </div>
            <div className="space-y-2.5 w-full">
              <div>
                <h4 className="font-serif text-base font-bold text-[#3a1c14] tracking-tight flex items-baseline gap-2">
                  <span>Activate Live Firebase Cloud Syncing</span>
                  <span className="bg-[#BA7517]/15 text-[#BA7517] border border-[#BA7517]/20 rounded px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase">Ready</span>
                </h4>
                <p className="text-xs text-[#3a1c14]/75 leading-relaxed mt-1">
                  Since you have enabled <strong>Email/Password Sign-In</strong> in your Firebase Console, your project is now ready to authorize live accounts! Disconnect your offline pen to register or sign in with your permanent Google Cloud synchronized account. 
                </p>
              </div>
              
              <div className="flex flex-wrap gap-3 pt-1">
                <button
                  onClick={() => logout()}
                  className="bg-[#7c3a2a] hover:bg-[#5e2b1e] text-white text-[11px] font-bold py-2 px-4 rounded-lg shadow-sm transition-all"
                >
                  Disconnect Sandbox &amp; Go Live &rarr;
                </button>
                
                <button
                  onClick={() => onNavigate("import")}
                  className="border border-[#7c3a2a] text-[#7c3a2a] hover:bg-[#7c3a2a]/5 text-[11px] font-bold py-2 px-4 rounded-lg transition-all"
                >
                  Migrate Zite CSV Data
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      )}

      {/* TWO-COLUMN MAIN WORKSPACE */}
      <div className={isMagazineLayout
        ? "grid grid-cols-1 lg:grid-cols-[1.8fr_1.1fr] xl:grid-cols-[2fr_1fr] gap-0 bg-[#FAF8F5] border-t border-[#e8e0d8] items-stretch"
        : "w-full max-w-none px-4 md:px-10 lg:px-14 xl:px-16 pt-8 grid grid-cols-1 md:grid-cols-[1fr_26.67%] gap-8 items-stretch"
      }>
        
        {/* LEFT COLUMN: Stat Cards & Pipeline Matrix */}
        <div ref={leftColumnRef} className={isMagazineLayout ? "flex flex-col gap-0" : "flex flex-col gap-8"}>
          
          {/* STAT-CHART COMBO CARDS ROW */}
          {!isMagazineLayout && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            
            {/* CARD 1: Queries Sent */}
            <div
              className="bg-white rounded-2xl border border-[#EBDCD3] border-t-[3.5px] border-t-[#7c3a2a] shadow-[0_2px_4px_rgba(58,28,20,0.02)] p-4 relative h-[180px] flex flex-col justify-stretch cursor-pointer transition-all hover:shadow-md"
              onMouseEnter={() => setHoveredCard(1)}
              onMouseLeave={() => { setHoveredCard(null); setHoveredBarIndex(null); }}
            >
              
              <div>
                <div className="flex justify-between items-start">
                  <span className="font-serif text-[14px] font-semibold text-[#4a261a]">Queries sent</span>
                  <div className="relative group/card-pic w-6 h-6 flex items-center justify-center select-none" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="file"
                      id="card-image-input-1"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleCardImageUpload(1, e)}
                    />
                    {card1Image ? (
                      <div className="relative">
                        <label htmlFor="card-image-input-1" className="cursor-pointer">
                          <img
                            src={card1Image}
                            alt="Card icon"
                            className="w-5 h-5 object-contain rounded-sm filter drop-shadow-[0_1px_2px_rgba(124,58,42,0.15)] transition-all duration-250"
                            style={{ transform: `translate(${card1ImageX}px, ${card1ImageY}px) scale(${card1ImageScale / 100})`, transformOrigin: 'center center' }}
                            referrerPolicy="no-referrer"
                          />
                        </label>
                        <button
                          onClick={(e) => handleRemoveCardImage(1, e)}
                          className="absolute -top-1.5 -right-1.5 bg-[#7c3a2a] text-[#F8F5F0] rounded-full flex items-center justify-center opacity-0 group-hover/card-pic:opacity-100 transition-opacity shadow-xs border border-[#EBDCD3]"
                          style={{ width: '11px', height: '11px', zIndex: 50 }}
                          title="Reset to default icon"
                        >
                          <X className="w-2 h-2" />
                        </button>

                        {/* Hover resize/reposition controls */}
                        <div className="absolute top-8 right-0 bg-white/95 border border-[#EBDCD3] rounded-lg px-2 py-1.5 shadow-md flex items-center gap-1.5 z-40 opacity-0 group-hover/card-pic:opacity-100 transition-all pointer-events-auto whitespace-nowrap">
                          {/* Move Left/Right */}
                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleMoveCardLeft(1); }}
                              className="p-0.5 hover:bg-[#FAF1EF] text-stone-600 hover:text-[#7c3a2a] rounded transition-colors cursor-pointer"
                              title="Move Left (X - 5px)"
                              type="button"
                            >
                              <ArrowLeft className="w-3 h-3" />
                            </button>
                            <span className="text-[9px] font-mono font-bold text-stone-500 min-w-[24px] text-center" title="Horizontal offset">
                              X:{card1ImageX}
                            </span>
                            <button
                              onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleMoveCardRight(1); }}
                              className="p-0.5 hover:bg-[#FAF1EF] text-stone-600 hover:text-[#7c3a2a] rounded transition-colors cursor-pointer"
                              title="Move Right (X + 5px)"
                              type="button"
                            >
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="w-px h-3 bg-[#EBDCD3]" />

                          {/* Move Up/Down */}
                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleMoveCardUp(1); }}
                              className="p-0.5 hover:bg-[#FAF1EF] text-stone-600 hover:text-[#7c3a2a] rounded transition-colors cursor-pointer"
                              title="Move Up (Y - 5px)"
                              type="button"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <span className="text-[9px] font-mono font-bold text-stone-500 min-w-[24px] text-center" title="Vertical offset">
                              Y:{card1ImageY}
                            </span>
                            <button
                              onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleMoveCardDown(1); }}
                              className="p-0.5 hover:bg-[#FAF1EF] text-stone-600 hover:text-[#7c3a2a] rounded transition-colors cursor-pointer"
                              title="Move Down (Y + 5px)"
                              type="button"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="w-px h-3 bg-[#EBDCD3]" />

                          {/* Scale */}
                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleDecreaseCardScale(1); }}
                              className="p-0.5 hover:bg-[#FAF1EF] text-stone-600 hover:text-[#7c3a2a] rounded transition-colors cursor-pointer"
                              title="Zoom Out"
                              type="button"
                            >
                              <ZoomOut className="w-3 h-3" />
                            </button>
                            <span className="text-[9px] font-mono font-bold text-stone-700 min-w-[28px] text-center">
                              {card1ImageScale}%
                            </span>
                            <button
                              onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleIncreaseCardScale(1); }}
                              className="p-0.5 hover:bg-[#FAF1EF] text-stone-600 hover:text-[#7c3a2a] rounded transition-colors cursor-pointer"
                              title="Zoom In"
                              type="button"
                            >
                              <ZoomIn className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="w-px h-3 bg-[#EBDCD3]" />

                          <button
                            onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleResetCardPosition(1); }}
                            className="px-1 hover:bg-[#FAF1EF] text-stone-500 hover:text-stone-700 rounded text-[8px] font-bold tracking-tight transition-colors cursor-pointer"
                            title="Reset position"
                            type="button"
                          >
                            Reset
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label htmlFor="card-image-input-1" className="cursor-pointer relative flex items-center justify-center w-full h-full hover:bg-[#FAF1EF] rounded-md transition-colors group-hover/card-pic:border group-hover/card-pic:border-dashed group-hover/card-pic:border-[#7c3a2a]/40" title="Click to upload custom icon">
                        <Send className="w-3.5 h-3.5 text-[#7c3a2a]/60 transform rotate-12 group-hover/card-pic:scale-90 transition-transform" />
                        <Camera className="w-3 h-3 text-[#CD4E46] absolute opacity-0 group-hover/card-pic:opacity-100 transition-opacity" />
                      </label>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-[10px] mt-1">
                  <span className="text-3xl font-serif font-bold text-[#3a1c14]">{totalQueriesSent}</span>
                  <span className="bg-[#FAF1EF] border border-[#EBDCD3] text-[#7c3a2a] rounded-full px-2.5 py-0.5 text-[9px] font-sans font-bold leading-none shrink-0 shadow-sm">
                    {(finalQueriesSentPerWeek[7] ?? 0)} sent this week
                  </span>
                </div>
              </div>

              {/* Vertical bar chart. 8 columns */}
              <div 
                className="mt-3 flex-1 h-full w-full flex items-end justify-stretch gap-[3px] relative"
                onMouseLeave={() => setHoveredBarIndex(null)}
              >
                {finalQueriesSentPerWeek.map((val, idx) => {
                  const isHovered = hoveredCard === 1 && hoveredBarIndex === idx;
                  const ratioHeight = val === 0 ? 0 : Math.max((val / 4) * 100, 15); // cap max week sending to 4 queries
                  const showFaintLine = val === 0;

                  return (
                    <div
                      key={idx}
                      className="flex-1 h-full relative flex flex-col justify-end items-center cursor-pointer"
                      onMouseEnter={() => setHoveredBarIndex(idx)}
                    >
                      {showFaintLine ? (
                        <div className="w-full h-[3.5px] bg-stone-200 rounded-[3px] mb-1 transition-all" />
                      ) : (
                        <div
                          style={{ 
                            height: `${ratioHeight}%`,
                            backgroundColor: gradientColors[idx],
                            boxShadow: isHovered ? `0 0 16px ${gradientColors[idx]}` : undefined
                          }}
                          className={`w-full rounded-[3px] transition-all duration-200 ${
                            isHovered ? "scale-y-110 scale-x-110 -translate-y-0.5 z-10" : ""
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Tooltip Popup on Card 1 Hover - positioned above the card with pointer-events-none */}
              {hoveredCard === 1 && hoveredBarIndex !== null && (
                <div className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 bg-white rounded-2xl p-4 shadow-[0_10px_25px_-5px_rgba(58,28,20,0.12),0_8px_16px_-6px_rgba(58,28,20,0.12)] border border-[#EBDCD3] z-50 w-[240px] pointer-events-none">
                  <div className="text-[10px] font-bold text-[#3a1c14]/45 uppercase tracking-wider border-b border-stone-100 pb-2 flex justify-between font-mono">
                    <span>Week of {getWeekMondayLabel(hoveredBarIndex ?? 7)}</span>
                  </div>
                  
                  {/* Title count */}
                  <h4 className="font-serif text-[15px] font-bold text-[#3a1c14] mt-2 pb-1.5 leading-none">
                    {finalQueriesSentPerWeek[hoveredBarIndex ?? 7]} queries sent
                  </h4>

                  <div className="mt-2 space-y-2.5 max-h-[140px] overflow-y-auto pr-1">
                    {getCard1QueriesText(hoveredBarIndex ?? 7).length === 0 ? (
                      <p className="text-[10px] text-[#3a1c14]/50 italic py-2">No logging dispatches noted during this window.</p>
                    ) : (
                      getCard1QueriesText(hoveredBarIndex ?? 7).map((item, qIdx) => (
                        <div key={qIdx} className="flex items-start gap-2 text-[10px]">
                          <span className="w-2.5 h-2.5 rounded-full border border-[#7c3a2a] shrink-0 mt-0.5 bg-[#FAF1EF]" />
                          <div className="min-w-0">
                            <span className="font-bold text-[#3a1c14] block leading-tight">{item.agentName}</span>
                            <span className="text-[#7c3a2a] font-medium block text-[9px] truncate mt-0.5">{item.msTitle}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="mt-3 pt-2 border-t border-stone-100 text-[9px] font-mono text-stone-400">
                    Total queries to date: <span className="font-bold text-[#7c3a2a]">{getCard1TotalToDate(hoveredBarIndex ?? 7)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* CARD 2: Active Queries */}
            <div
              className="bg-white rounded-2xl border border-[#EBDCD3] border-t-[3.5px] border-t-[#7c3a2a] shadow-[0_2px_4px_rgba(58,28,20,0.02)] p-4 relative h-[180px] flex flex-col justify-stretch cursor-pointer transition-all hover:shadow-md"
              onMouseEnter={() => setHoveredCard(2)}
              onMouseLeave={() => { setHoveredCard(null); setHoveredBarIndex(null); }}
            >
              
              <div>
                <div className="flex justify-between items-start">
                  <span className="font-serif text-[14px] font-semibold text-[#4a261a]">Active Queries</span>
                  <div className="relative group/card-pic w-6 h-6 flex items-center justify-center select-none" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="file"
                      id="card-image-input-2"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleCardImageUpload(2, e)}
                    />
                    {card2Image ? (
                      <div className="relative">
                        <label htmlFor="card-image-input-2" className="cursor-pointer">
                          <img
                            src={card2Image}
                            alt="Card icon"
                            className="w-5 h-5 object-contain rounded-sm filter drop-shadow-[0_1px_2px_rgba(124,58,42,0.15)] hover:scale-110 transition-all duration-250"
                            style={{ transform: `translate(${card2ImageX}px, ${card2ImageY}px) scale(${card2ImageScale / 100})`, transformOrigin: 'center center' }}
                            referrerPolicy="no-referrer"
                          />
                        </label>
                        <button
                          onClick={(e) => handleRemoveCardImage(2, e)}
                          className="absolute -top-1.5 -right-1.5 bg-[#7c3a2a] text-[#F8F5F0] rounded-full flex items-center justify-center opacity-0 group-hover/card-pic:opacity-100 transition-opacity shadow-xs border border-[#EBDCD3]"
                          style={{ width: '11px', height: '11px', zIndex: 50 }}
                          title="Reset to default icon"
                        >
                          <X className="w-2 h-2" />
                        </button>

                        {/* Hover resize/reposition controls */}
                        <div className="absolute top-8 right-0 bg-white/95 border border-[#EBDCD3] rounded-lg px-2 py-1.5 shadow-md flex items-center gap-1.5 z-40 opacity-0 group-hover/card-pic:opacity-100 transition-all pointer-events-auto whitespace-nowrap">
                          {/* Move Left/Right */}
                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleMoveCardLeft(2); }}
                              className="p-0.5 hover:bg-[#FAF1EF] text-stone-600 hover:text-[#7c3a2a] rounded transition-colors cursor-pointer"
                              title="Move Left (X - 5px)"
                              type="button"
                            >
                              <ArrowLeft className="w-3 h-3" />
                            </button>
                            <span className="text-[9px] font-mono font-bold text-stone-500 min-w-[24px] text-center" title="Horizontal offset flex text">
                              X:{card2ImageX}
                            </span>
                            <button
                              onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleMoveCardRight(2); }}
                              className="p-0.5 hover:bg-[#FAF1EF] text-stone-600 hover:text-[#7c3a2a] rounded transition-colors cursor-pointer"
                              title="Move Right (X + 5px)"
                              type="button"
                            >
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="w-px h-3 bg-[#EBDCD3]" />

                          {/* Move Up/Down */}
                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleMoveCardUp(2); }}
                              className="p-0.5 hover:bg-[#FAF1EF] text-stone-600 hover:text-[#7c3a2a] rounded transition-colors cursor-pointer"
                              title="Move Up (Y - 5px)"
                              type="button"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <span className="text-[9px] font-mono font-bold text-stone-500 min-w-[24px] text-center" title="Vertical offset tracker">
                              Y:{card2ImageY}
                            </span>
                            <button
                              onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleMoveCardDown(2); }}
                              className="p-0.5 hover:bg-[#FAF1EF] text-stone-600 hover:text-[#7c3a2a] rounded transition-colors cursor-pointer"
                              title="Move Down (Y + 5px)"
                              type="button"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="w-px h-3 bg-[#EBDCD3]" />

                          {/* Scale */}
                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleDecreaseCardScale(2); }}
                              className="p-0.5 hover:bg-[#FAF1EF] text-stone-600 hover:text-[#7c3a2a] rounded transition-colors cursor-pointer"
                              title="Zoom Out"
                              type="button"
                            >
                              <ZoomOut className="w-3 h-3" />
                            </button>
                            <span className="text-[9px] font-mono font-bold text-stone-700 min-w-[28px] text-center">
                              {card2ImageScale}%
                            </span>
                            <button
                              onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleIncreaseCardScale(2); }}
                              className="p-0.5 hover:bg-[#FAF1EF] text-stone-600 hover:text-[#7c3a2a] rounded transition-colors cursor-pointer"
                              title="Zoom In"
                              type="button"
                            >
                              <ZoomIn className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="w-px h-3 bg-[#EBDCD3]" />

                          <button
                            onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleResetCardPosition(2); }}
                            className="px-1 hover:bg-[#FAF1EF] text-stone-500 hover:text-stone-700 rounded text-[8px] font-bold tracking-tight transition-colors cursor-pointer"
                            title="Reset position"
                            type="button"
                          >
                            Reset
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label htmlFor="card-image-input-2" className="cursor-pointer relative flex items-center justify-center w-full h-full hover:bg-[#FAF1EF] rounded-md transition-colors group-hover/card-pic:border group-hover/card-pic:border-dashed group-hover/card-pic:border-[#7c3a2a]/40" title="Click to upload custom icon">
                        <Clock className="w-3.5 h-3.5 text-[#7c3a2a]/60 group-hover/card-pic:scale-90 transition-transform" />
                        <Camera className="w-3 h-3 text-[#CD4E46] absolute opacity-0 group-hover/card-pic:opacity-100 transition-opacity" />
                      </label>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-[10px] mt-1 pb-1">
                  <span className="text-3xl font-serif font-bold text-[#3a1c14]">{activeQueries.length}</span>
                  <span className="bg-[#FAF1EF] border border-[#EBDCD3] text-[#7c3a2a] rounded-full px-2.5 py-0.5 text-[9px] font-sans font-bold leading-none shrink-0 shadow-sm">
                    {activePillText}
                  </span>
                </div>
              </div>

              {/* End of week active loads area chart - dynamic line and gradient fill */}
              <div 
                className="mt-3 flex-1 h-full w-full relative"
                onMouseLeave={() => setHoveredBarIndex(null)}
              >
                <svg className="w-full h-full max-h-[75px]" viewBox={`0 0 ${activeSvgWidth} ${activeSvgHeight}`} preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="active-grad-dynamic" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7C3D3D" stopOpacity="0.25"/>
                      <stop offset="100%" stopColor="#FAF1EF" stopOpacity="0.0"/>
                    </linearGradient>
                  </defs>
                  
                  {/* Area fill path */}
                  <path
                    d={dArea}
                    fill="url(#active-grad-dynamic)"
                    className="transition-all duration-300"
                  />
                  
                  {/* Core Line path */}
                  <path
                    d={dLine}
                    fill="none"
                    stroke="#7C3D3D"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-all duration-300"
                  />

                  {/* Dotted indicator line for the hovered index */}
                  {hoveredCard === 2 && hoveredBarIndex !== null && activePoints[hoveredBarIndex] && (
                    <line
                      x1={activePoints[hoveredBarIndex].x}
                      y1="0"
                      x2={activePoints[hoveredBarIndex].x}
                      y2={activeSvgHeight}
                      stroke="#7C3D3D"
                      strokeWidth="0.75"
                      strokeDasharray="2,2"
                    />
                  )}

                  {/* Active end point or hovered point bubble */}
                  {activePoints.map((p, idx) => {
                    const isHovered = hoveredCard === 2 && hoveredBarIndex === idx;
                    const isLast = idx === 7;
                    if (!isHovered && !isLast) return null;
                    return (
                      <circle
                        key={idx}
                        cx={p.x}
                        cy={p.y}
                        r={isHovered ? "3.5" : "2.5"}
                        fill="#7C3D3D"
                        stroke="#FCFAF7"
                        strokeWidth={isHovered ? "1.5" : "1"}
                        className="transition-all duration-150"
                      />
                    );
                  })}
                </svg>

                {/* 8 Invisible vertical bars for rich hover feedback mapping */}
                <div className="absolute inset-0 flex">
                  {finalActiveQueriesPerWeek.map((_, idx) => (
                    <div
                      key={idx}
                      className="flex-1 h-full cursor-pointer z-10"
                      onMouseEnter={() => {
                        setHoveredBarIndex(idx);
                        setHoveredCard(2);
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Tooltip Popup on Card 2 Hover - displayed on direct bar hover, placed above constraints */}
              {hoveredCard === 2 && hoveredBarIndex !== null && (
                <div className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 bg-white rounded-2xl p-4 shadow-[0_10px_25px_-5px_rgba(58,28,20,0.12),0_8px_16px_-6px_rgba(58,28,20,0.12)] border border-[#EBDCD3] z-50 w-[240px] pointer-events-none" onClick={e => e.stopPropagation()}>
                  <div className="text-[10px] font-bold text-[#3a1c14]/45 uppercase tracking-wider border-b border-stone-100 pb-2 flex justify-between font-mono">
                    <span>Week of {getWeekMondayLabel(hoveredBarIndex)}</span>
                  </div>
                  
                  {/* Dynamic Total active */}
                  <div className="mt-2 text-left">
                    <h4 className="font-serif text-[15px] font-bold text-[#3a1c14] leading-none">
                      {getCard2StatusMetrics(hoveredBarIndex).total} active queries
                    </h4>
                    <p className="text-[9.5px] text-[#3a1c14]/50 font-sans tracking-tight mt-1">
                      - Status breakdown
                    </p>
                  </div>

                  {/* Status rows by color */}
                  <div className="mt-3 text-[9.5px] font-mono tracking-widest text-[#3a1c14]/40 uppercase font-bold">
                    BY STATUS
                  </div>
                  
                  <div className="mt-2 space-y-1.5 font-sans">
                    <div className="flex items-center justify-between text-[11px] text-[#3a1c14]">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full border border-[#7c3a2a] shrink-0 bg-[#FAF1EF]" />
                        <span>Queried</span>
                      </div>
                      <span className="font-bold leading-none font-mono">{getCard2StatusMetrics(hoveredBarIndex).queried}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#3a1c14]">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-[#BA7517] to-transparent border border-[#BA7517] shrink-0" />
                        <span>Partial Requested</span>
                      </div>
                      <span className="font-bold leading-none font-mono">{getCard2StatusMetrics(hoveredBarIndex).partialReq}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#3a1c14]">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#BA7517] shrink-0 animate-pulse" />
                        <span>Partial Sent</span>
                      </div>
                      <span className="font-bold leading-none font-mono">{getCard2StatusMetrics(hoveredBarIndex).partialSent}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#3a1c14]">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#BA7517] shrink-0" />
                        <span>Full Requested</span>
                      </div>
                      <span className="font-bold leading-none font-mono">{getCard2StatusMetrics(hoveredBarIndex).fullReq}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#3a1c14]">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#A32D2D] shrink-0" />
                        <span>R&amp;R</span>
                      </div>
                      <span className="font-bold leading-none font-mono">{getCard2StatusMetrics(hoveredBarIndex).rr}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* CARD 3: Agents */}
            <div
              className="bg-white rounded-2xl border border-[#EBDCD3] border-t-[3.5px] border-t-[#7c3a2a] shadow-[0_2px_4px_rgba(58,28,20,0.02)] p-4 relative h-[180px] flex flex-col justify-stretch cursor-pointer transition-all hover:shadow-md"
              onMouseEnter={() => setHoveredCard(3)}
              onMouseLeave={() => { setHoveredCard(null); setHoveredAgentId(null); }}
            >
              
              <div>
                <div className="flex justify-between items-start">
                  <span className="font-serif text-[14px] font-semibold text-[#4a261a]">Agents</span>
                  <div className="relative group/card-pic w-6 h-6 flex items-center justify-center select-none" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="file"
                      id="card-image-input-3"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleCardImageUpload(3, e)}
                    />
                    {card3Image ? (
                      <div className="relative">
                        <label htmlFor="card-image-input-3" className="cursor-pointer">
                          <img
                            src={card3Image}
                            alt="Card icon"
                            className="w-5 h-5 object-contain rounded-sm filter drop-shadow-[0_1px_2px_rgba(124,58,42,0.15)] hover:scale-110 transition-all duration-250"
                            style={{ transform: `translate(${card3ImageX}px, ${card3ImageY}px) scale(${card3ImageScale / 100})`, transformOrigin: 'center center' }}
                            referrerPolicy="no-referrer"
                          />
                        </label>
                        <button
                          onClick={(e) => handleRemoveCardImage(3, e)}
                          className="absolute -top-1.5 -right-1.5 bg-[#7c3a2a] text-[#F8F5F0] rounded-full flex items-center justify-center opacity-0 group-hover/card-pic:opacity-100 transition-opacity shadow-xs border border-[#EBDCD3]"
                          style={{ width: '11px', height: '11px', zIndex: 50 }}
                          title="Reset to default icon"
                        >
                          <X className="w-2 h-2" />
                        </button>

                        {/* Hover resize/reposition controls */}
                        <div className="absolute top-8 right-0 bg-white/95 border border-[#EBDCD3] rounded-lg px-2 py-1.5 shadow-md flex items-center gap-1.5 z-40 opacity-0 group-hover/card-pic:opacity-100 transition-all pointer-events-auto whitespace-nowrap">
                          {/* Move Left/Right */}
                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleMoveCardLeft(3); }}
                              className="p-0.5 hover:bg-[#FAF1EF] text-stone-600 hover:text-[#7c3a2a] rounded transition-colors cursor-pointer"
                              title="Move Left (X - 5px)"
                              type="button"
                            >
                              <ArrowLeft className="w-3 h-3" />
                            </button>
                            <span className="text-[9px] font-mono font-bold text-stone-500 min-w-[24px] text-center" title="Horizontal offset tracker">
                              X:{card3ImageX}
                            </span>
                            <button
                              onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleMoveCardRight(3); }}
                              className="p-0.5 hover:bg-[#FAF1EF] text-stone-600 hover:text-[#7c3a2a] rounded transition-colors cursor-pointer"
                              title="Move Right (X + 5px)"
                              type="button"
                            >
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="w-px h-3 bg-[#EBDCD3]" />

                          {/* Move Up/Down */}
                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleMoveCardUp(3); }}
                              className="p-0.5 hover:bg-[#FAF1EF] text-stone-600 hover:text-[#7c3a2a] rounded transition-colors cursor-pointer"
                              title="Move Up (Y - 5px)"
                              type="button"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <span className="text-[9px] font-mono font-bold text-stone-500 min-w-[24px] text-center" title="Vertical offset tracking values">
                              Y:{card3ImageY}
                            </span>
                            <button
                              onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleMoveCardDown(3); }}
                              className="p-0.5 hover:bg-[#FAF1EF] text-stone-600 hover:text-[#7c3a2a] rounded transition-colors cursor-pointer"
                              title="Move Down (Y + 5px)"
                              type="button"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="w-px h-3 bg-[#EBDCD3]" />

                          {/* Scale */}
                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleDecreaseCardScale(3); }}
                              className="p-0.5 hover:bg-[#FAF1EF] text-stone-600 hover:text-[#7c3a2a] rounded transition-colors cursor-pointer"
                              title="Zoom Out"
                              type="button"
                            >
                              <ZoomOut className="w-3 h-3" />
                            </button>
                            <span className="text-[9px] font-mono font-bold text-stone-700 min-w-[28px] text-center">
                              {card3ImageScale}%
                            </span>
                            <button
                              onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleIncreaseCardScale(3); }}
                              className="p-0.5 hover:bg-[#FAF1EF] text-stone-600 hover:text-[#7c3a2a] rounded transition-colors cursor-pointer"
                              title="Zoom In"
                              type="button"
                            >
                              <ZoomIn className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="w-px h-3 bg-[#EBDCD3]" />

                          <button
                            onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleResetCardPosition(3); }}
                            className="px-1 hover:bg-[#FAF1EF] text-stone-500 hover:text-stone-700 rounded text-[8px] font-bold tracking-tight transition-colors cursor-pointer"
                            title="Reset position"
                            type="button"
                          >
                            Reset
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label htmlFor="card-image-input-3" className="cursor-pointer relative flex items-center justify-center w-full h-full hover:bg-[#FAF1EF] rounded-md transition-colors group-hover/card-pic:border group-hover/card-pic:border-dashed group-hover/card-pic:border-[#7c3a2a]/40" title="Click to upload custom icon">
                        <Users className="w-3.5 h-3.5 text-[#7c3a2a]/60 group-hover/card-pic:scale-90 transition-transform" />
                        <Camera className="w-3 h-3 text-[#CD4E46] absolute opacity-0 group-hover/card-pic:opacity-100 transition-opacity" />
                      </label>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-[6px] mt-1">
                  <span className="text-3xl font-serif font-bold text-[#3a1c14]">{totalAgentsCount}</span>
                  <span className="bg-[#FAF1EF] border border-[#EBDCD3] text-[#7c3a2a] rounded-full px-2 py-0.5 text-[9px] font-sans font-bold leading-none shrink-0 shadow-sm whitespace-nowrap animate-fade-in">
                    {queriedAgentsCount} queried
                  </span>
                  <span className="bg-[#EEF1F6] border border-[#D3E1EE] text-[#4A6B82] rounded-full px-2 py-0.5 text-[9px] font-sans font-bold leading-none shrink-0 shadow-sm whitespace-nowrap">
                    {notQueriedAgentsCount} unqueried
                  </span>
                </div>
              </div>

              {/* Flexible agent avatars grid - auto wrap, no scrolls, perfectly fitted */}
              <div className="flex flex-wrap gap-[4px] w-full mt-3 justify-center items-center content-center select-none flex-grow">
                {(() => {
                  const agentCount = sortedDisplayAgents.length;
                  let avatarDimHex = 22; // default
                  if (agentCount > 32) {
                    avatarDimHex = 11;
                  } else if (agentCount > 24) {
                    avatarDimHex = 13;
                  } else if (agentCount > 16) {
                    avatarDimHex = 16;
                  } else if (agentCount > 10) {
                    avatarDimHex = 19;
                  }

                  return sortedDisplayAgents.map((realAgent) => {
                    const isQueried = queries.some(q => q.agentId === realAgent.id);
                    const isHovered = hoveredAgentId === realAgent.id;
                    
                    return (
                      <div 
                        key={realAgent.id} 
                        className="relative cursor-pointer transition-all duration-150 shrink-0"
                        style={{ width: `${avatarDimHex}px`, height: `${avatarDimHex}px` }}
                        onMouseEnter={() => {
                          setHoveredAgentId(realAgent.id);
                          setHoveredCard(3);
                        }}
                        onMouseLeave={() => {
                          setHoveredAgentId(null);
                        }}
                      >
                        <svg 
                          className={`transition-all duration-150 ${isHovered ? "scale-120 drop-shadow-sm" : ""} ${
                            isQueried ? "text-[#7c3a2a]" : "text-[#4A6D8C]/70"
                          }`} 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          style={{ width: '100%', height: '100%' }}
                        >
                          <circle cx="12" cy="7" r="4.5" fill={isQueried ? "#FAF1EF" : "#EEF2F6"} fillOpacity="0.8" />
                          <path d="M 4,21 C 4,16.5 7.5,14.5 12,14.5 C 16.5,14.5 20,16.5 20,21" strokeLinecap="round" />
                        </svg>
                      </div>
                    );
                  });
                })()}

                {sortedDisplayAgents.length === 0 && (
                  <p className="text-[10px] text-stone-400 italic py-4 text-center w-full">No active profiles recorded inside matrix.</p>
                )}
              </div>

              {/* Tooltip Popup on Card 3 Agent Hover */}
              {hoveredCard === 3 && hoveredAgentId !== null && (
                (() => {
                  const agentObj = agents.find(a => a.id === hoveredAgentId);
                  if (!agentObj) return null;
                  const isQueriedObj = queries.some(q => q.agentId === agentObj.id);
                  return (
                    <div className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 bg-white rounded-2xl p-4 shadow-[0_10px_25px_-5px_rgba(58,28,20,0.12),0_8px_16px_-6px_rgba(58,28,20,0.12)] border border-[#EBDCD3] z-50 w-[240px] pointer-events-none text-left">
                      <div className="text-[10px] font-bold text-[#3a1c14]/45 uppercase tracking-wider border-b border-stone-100 pb-2 flex justify-between font-mono">
                        <span>Agent Overview</span>
                        <span className={isQueriedObj ? "text-[#7c3a2a]" : "text-[#4A6D8C]"}>
                          {isQueriedObj ? "Queried" : "Unqueried"}
                        </span>
                      </div>
                      
                      <h4 className="font-serif text-[14px] font-bold text-[#3a1c14] mt-2.5 leading-tight">{agentObj.name}</h4>
                      <p className="text-[10.5px] text-[#7c3a2a] font-medium leading-none mt-0.5">{agentObj.agency}</p>
                      
                      <div className="mt-3.5 space-y-1.5 text-[10.5px] text-stone-600 font-sans">
                        {agentObj.email && (
                          <p className="truncate"><strong>Email:</strong> <span className="font-mono text-[10px]">{agentObj.email}</span></p>
                        )}
                        {agentObj.website && (
                          <p className="truncate"><strong>Web:</strong> <span className="text-[9.5px] text-[#7c3a2a] shrink-0 font-medium">{agentObj.website}</span></p>
                        )}
                        {agentObj.genres && agentObj.genres.length > 0 && (
                          <div className="pt-2">
                            <span className="font-bold text-[8.5px] uppercase tracking-wider text-stone-400 font-mono block mb-1">Genres Covered</span>
                            <div className="flex flex-wrap gap-1 max-h-[36px] overflow-hidden">
                              {agentObj.genres.slice(0, 3).map((g, gIdx) => (
                                <span key={gIdx} className="bg-stone-50 border border-stone-100 text-[#3a1c14]/80 text-[8px] px-1.5 py-0.5 rounded leading-none">
                                  {g}
                                </span>
                              ))}
                              {agentObj.genres.length > 3 && (
                                <span className="text-[8px] text-stone-400 self-center">+{agentObj.genres.length - 3}</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()
              )}
            </div>

            {/* CARD 4: Responses received */}
            <div
              className="bg-white rounded-2xl border border-[#EBDCD3] border-t-[3.5px] border-t-[#7c3a2a] shadow-[0_2px_4px_rgba(58,28,20,0.02)] p-4 relative h-[180px] flex flex-col justify-stretch cursor-pointer transition-all hover:shadow-md"
              onMouseEnter={() => setHoveredCard(4)}
              onMouseLeave={() => { setHoveredCard(null); setHoveredBarIndex(null); }}
            >
              
              <div>
                <div className="flex justify-between items-start">
                  <span className="font-serif text-[14px] font-semibold text-[#4a261a]">Responses received</span>
                  <div className="relative group/card-pic w-6 h-6 flex items-center justify-center select-none" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="file"
                      id="card-image-input-4"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleCardImageUpload(4, e)}
                    />
                    {card4Image ? (
                      <div className="relative">
                        <label htmlFor="card-image-input-4" className="cursor-pointer">
                          <img
                            src={card4Image}
                            alt="Card icon"
                            className="w-5 h-5 object-contain rounded-sm filter drop-shadow-[0_1px_2px_rgba(124,58,42,0.15)] hover:scale-110 transition-all duration-250"
                            style={{ transform: `translate(${card4ImageX}px, ${card4ImageY}px) scale(${card4ImageScale / 100})`, transformOrigin: 'center center' }}
                            referrerPolicy="no-referrer"
                          />
                        </label>
                        <button
                          onClick={(e) => handleRemoveCardImage(4, e)}
                          className="absolute -top-1.5 -right-1.5 bg-[#7c3a2a] text-[#F8F5F0] rounded-full flex items-center justify-center opacity-0 group-hover/card-pic:opacity-100 transition-opacity shadow-xs border border-[#EBDCD3]"
                          style={{ width: '11px', height: '11px', zIndex: 50 }}
                          title="Reset to default icon"
                        >
                          <X className="w-2 h-2" />
                        </button>

                        {/* Hover resize/reposition controls */}
                        <div className="absolute top-8 right-0 bg-white/95 border border-[#EBDCD3] rounded-lg px-2 py-1.5 shadow-md flex items-center gap-1.5 z-40 opacity-0 group-hover/card-pic:opacity-100 transition-all pointer-events-auto whitespace-nowrap">
                          {/* Move Left/Right */}
                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleMoveCardLeft(4); }}
                              className="p-0.5 hover:bg-[#FAF1EF] text-stone-600 hover:text-[#7c3a2a] rounded transition-colors cursor-pointer"
                              title="Move Left (X - 5px)"
                              type="button"
                            >
                              <ArrowLeft className="w-3 h-3" />
                            </button>
                            <span className="text-[9px] font-mono font-bold text-stone-500 min-w-[24px] text-center" title="Horizontal offset tracker font text">
                              X:{card4ImageX}
                            </span>
                            <button
                              onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleMoveCardRight(4); }}
                              className="p-0.5 hover:bg-[#FAF1EF] text-stone-600 hover:text-[#7c3a2a] rounded transition-colors cursor-pointer"
                              title="Move Right (X + 5px)"
                              type="button"
                            >
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="w-px h-3 bg-[#EBDCD3]" />

                          {/* Move Up/Down */}
                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleMoveCardUp(4); }}
                              className="p-0.5 hover:bg-[#FAF1EF] text-stone-600 hover:text-[#7c3a2a] rounded transition-colors cursor-pointer"
                              title="Move Up (Y - 5px)"
                              type="button"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <span className="text-[9px] font-mono font-bold text-stone-500 min-w-[24px] text-center" title="Vertical offset metric tracking">
                              Y:{card4ImageY}
                            </span>
                            <button
                              onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleMoveCardDown(4); }}
                              className="p-0.5 hover:bg-[#FAF1EF] text-stone-600 hover:text-[#7c3a2a] rounded transition-colors cursor-pointer"
                              title="Move Down (Y + 5px)"
                              type="button"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="w-px h-3 bg-[#EBDCD3]" />

                          {/* Scale */}
                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleDecreaseCardScale(4); }}
                              className="p-0.5 hover:bg-[#FAF1EF] text-stone-600 hover:text-[#7c3a2a] rounded transition-colors cursor-pointer"
                              title="Zoom Out"
                              type="button"
                            >
                              <ZoomOut className="w-3 h-3" />
                            </button>
                            <span className="text-[9px] font-mono font-bold text-stone-700 min-w-[28px] text-center">
                              {card4ImageScale}%
                            </span>
                            <button
                              onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleIncreaseCardScale(4); }}
                              className="p-0.5 hover:bg-[#FAF1EF] text-stone-600 hover:text-[#7c3a2a] rounded transition-colors cursor-pointer"
                              title="Zoom In"
                              type="button"
                            >
                              <ZoomIn className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="w-px h-3 bg-[#EBDCD3]" />

                          <button
                            onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleResetCardPosition(4); }}
                            className="px-1 hover:bg-[#FAF1EF] text-stone-500 hover:text-stone-700 rounded text-[8px] font-bold tracking-tight transition-colors cursor-pointer"
                            title="Reset position"
                            type="button"
                          >
                            Reset
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label htmlFor="card-image-input-4" className="cursor-pointer relative flex items-center justify-center w-full h-full hover:bg-[#FAF1EF] rounded-md transition-colors group-hover/card-pic:border group-hover/card-pic:border-dashed group-hover/card-pic:border-[#7c3a2a]/40" title="Click to upload custom icon">
                        <MessageSquare className="w-3.5 h-3.5 text-[#7c3a2a]/60 group-hover/card-pic:scale-90 transition-transform" />
                        <Camera className="w-3 h-3 text-[#CD4E46] absolute opacity-0 group-hover/card-pic:opacity-100 transition-opacity" />
                      </label>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-[10px] mt-1">
                  <span className="text-3xl font-serif font-bold text-[#3a1c14]">{responsesReceived}</span>
                  <span className="bg-[#FAF1EF] border border-[#EBDCD3] text-[#7c3a2a] rounded-full px-2.5 py-0.5 text-[9px] font-sans font-bold leading-none shrink-0 shadow-sm">
                    {responseRatePercent}% response rate
                  </span>
                </div>
              </div>

              {/* Vertical bar chart for responses */}
              <div 
                className="mt-3 flex-1 h-full w-full flex items-end justify-stretch gap-[3px] relative"
                onMouseLeave={() => setHoveredBarIndex(null)}
              >
                {finalResponsesPerWeek.map((val, idx) => {
                  const isHovered = hoveredCard === 4 && hoveredBarIndex === idx;
                  const ratioHeight = val === 0 ? 0 : Math.max((val / 4) * 100, 15);
                  const showFaintLine = val === 0;

                  return (
                    <div
                      key={idx}
                      className="flex-1 h-full relative flex flex-col justify-end items-center cursor-pointer"
                      onMouseEnter={() => setHoveredBarIndex(idx)}
                    >
                      {showFaintLine ? (
                        <div className="w-full h-[3.5px] bg-stone-200 rounded-[3px] mb-1 transition-all" />
                      ) : (
                        <div
                          style={{ 
                            height: `${ratioHeight}%`,
                            backgroundColor: gradientColors[idx],
                            boxShadow: isHovered ? `0 0 16px ${gradientColors[idx]}` : undefined
                          }}
                          className={`w-full rounded-[3px] transition-all duration-200 ${
                            isHovered ? "scale-y-110 scale-x-110 -translate-y-0.5 z-10" : ""
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Tooltip Popup on Card 4 Hover - positioned above the card with pointer-events-none */}
              {hoveredCard === 4 && hoveredBarIndex !== null && (
                <div className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 bg-white rounded-2xl p-4 shadow-[0_10px_25px_-5px_rgba(58,28,20,0.12),0_8px_16px_-6px_rgba(58,28,20,0.12)] border border-[#EBDCD3] z-50 w-[245px] pointer-events-none text-left">
                  <div className="text-[10px] font-bold text-[#3a1c14]/45 uppercase tracking-wider border-b border-stone-100 pb-2 flex justify-between font-mono">
                    <span>Week of {getWeekMondayLabel(hoveredBarIndex)}</span>
                  </div>
                  
                  {/* Title count */}
                  <h4 className="font-serif text-[15px] font-bold text-[#3a1c14] mt-2 pb-1.5 leading-none">
                    {finalResponsesPerWeek[hoveredBarIndex]} responses
                  </h4>

                  <div className="mt-2 space-y-2.5 max-h-[140px] overflow-y-auto pr-1">
                    {getCard4ResponsesText(hoveredBarIndex).length === 0 ? (
                      <p className="text-[10px] text-[#3a1c14]/50 italic py-2">No response updates noted during this window.</p>
                    ) : (
                      getCard4ResponsesText(hoveredBarIndex).map((item, rIdx) => (
                        <div key={rIdx} className="flex items-start gap-2 text-[10px]">
                          <span className={`w-2.5 h-2.5 rounded-full border shrink-0 mt-0.5 ${
                            item.isPositive 
                              ? "bg-emerald-100 border-emerald-500" 
                              : "bg-rose-100 border-rose-400"
                          }`} />
                          <div className="min-w-0">
                            <span className="font-bold text-[#3a1c14] block leading-tight">{item.agentName}</span>
                            <span className="text-[#7c3a2a] font-medium block text-[9px] truncate mt-0.5">{item.msTitle}</span>
                            <span className={`text-[8px] font-mono uppercase font-bold tracking-wider block mt-0.5 leading-none ${
                              item.isPositive ? "text-emerald-700" : "text-rose-600"
                            }`}>{item.type}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="mt-3 pt-2 border-t border-stone-100 text-[9px] font-mono text-stone-400">
                    Total responses to date: <span className="font-bold text-[#7c3a2a]">{getCard4TotalToDate(hoveredBarIndex)}</span>
                  </div>
                </div>
              )}
            </div>

          </div>
          )}

          {isMagazineLayout && (
            /* Magazine Urgent Action card */
            (() => {
              const urgentTasks = tasks.filter(t => t.priority === "urgent" || ["offer_received", "partial_requested", "full_requested", "revise_resubmit"].includes(t.taskType));
              if (urgentTasks.length === 0) return null;
              const actionTask = urgentTasks[0];
              const { agentName, agency, manuscriptTitle } = getTaskContextInfo(actionTask, queries, agents, manuscripts);
              
              return (
                <div className="bg-[#FFF0F0] border-b border-[#f5c8c8] p-[16px_24px] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left relative" style={{ borderBottomWidth: '0.5px' }}>
                  <div 
                    className="absolute bg-red-600 text-white text-[12px] font-extrabold rounded-full flex items-center justify-center select-none shadow-3xs" 
                    style={{ width: "20px", height: "20px", top: "12px", right: "12px", zIndex: 10 }}
                    title="Urgent"
                  >
                    !
                  </div>
                  <div className="text-left w-full sm:w-auto pr-8">
                    <div style={{ fontSize: '9px', color: '#c9a89e', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
                      Action needed
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: '#3a1c14', fontFamily: 'var(--font-serif)' }} className="mt-1 leading-snug font-serif">
                      {agentName ? `${agentName} requested a partial manuscript` : actionTask.title}
                    </div>
                    <div className="text-[11px] text-[#a08070] mt-1 font-sans">
                      {manuscriptTitle || "Manuscript"} &middot; {agency || "Agency"}
                    </div>
                  </div>
                  
                  {/* Action Buttons Row */}
                  <div className="flex items-center gap-[6px] shrink-0 self-end sm:self-center">
                    <button
                      onClick={() => onNavigate(actionTask.actionPath, actionTask.title)}
                      className="bg-[#7c3a2a] text-white hover:bg-[#602d20] text-[11px] font-semibold leading-none py-2 px-3.5 rounded-lg transition-colors cursor-pointer"
                    >
                      Send now
                    </button>
                    <button
                      onClick={async () => {
                        await dismissTask(actionTask.taskType, actionTask.relatedRecordId, "fixed snooze", 3);
                      }}
                      className="text-[#a08070] hover:text-[#7c3a2a] text-[11px] font-medium leading-none py-2 px-3 bg-transparent hover:bg-stone-100/50 rounded-lg transition-all cursor-pointer border-0"
                    >
                      Snooze
                    </button>
                    <button
                      onClick={async () => {
                        await dismissTask(actionTask.taskType, actionTask.relatedRecordId, "permanent");
                      }}
                      className="text-[#a08070] hover:text-[#7c3a2a] text-[11px] font-medium leading-none py-2 px-3 bg-transparent hover:bg-stone-100/50 rounded-lg transition-all cursor-pointer border-0"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              );
            })()
          )}

          {/* QUERY STATUS BREAKDOWN */}
          <div 
            className={isMagazineLayout
              ? "bg-white border-b border-[#e8e0d8] p-[20px_24px] relative transition-all duration-300"
              : "bg-[#FAF8F5] rounded-2xl border border-[#e8d5cc] shadow-sm relative transition-all duration-300"
            } 
            id="query-status-breakdown-card"
            style={isMagazineLayout ? { borderBottomWidth: '0.5px' } : {}}
          >
            
            {isMagazineLayout ? (
              <div className="flex flex-col w-full">
                {/* Clean Section Header */}
                <div className="flex items-center justify-between mb-[14px]">
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#3a1c14' }} className="font-serif uppercase tracking-wider">
                    Your querying pipeline
                  </span>
                  <span style={{ fontSize: '10px', color: '#c9a89e' }} className="font-sans font-medium">
                    {manuscripts.filter(m => queries.some(q => q.manuscriptId === m.id)).length} manuscripts · {queries.length} queries
                  </span>
                </div>

                {/* Horizontal row of stage buckets from design brief */}
                {renderMagazinePipelineBuckets()}

                {/* Flat table header columns */}
                <div className="border-b border-[#e8e0d8] pb-2 mb-2 flex items-center text-[10px] uppercase font-semibold text-[#c9a89e] tracking-wider select-none mt-4">
                  <div className="w-[240px] shrink-0 text-left">Manuscript</div>
                  <div className="flex-grow grid grid-cols-7 gap-2 text-center text-[9px] font-sans">
                    <div>Queried</div>
                    <div>Part Req</div>
                    <div>Part Sent</div>
                    <div>Full Req</div>
                    <div>Full Sent</div>
                    <div>Offer</div>
                    <div>Closed</div>
                  </div>
                </div>
              </div>
            ) : (
              /* Unified Header with Title and Columns */
              <div className="bg-[#F2EAE4] border-b-[0.5px] border-[#e8d5cc] px-[18px] py-[10px] flex items-center rounded-t-2xl">
                <span className="text-[12px] font-semibold text-[#3a1c14] font-sans w-[240px] shrink-0">
                  Your querying pipeline
                </span>
                <div className="flex-grow grid grid-cols-7 gap-2 text-center items-center">
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-[10px] font-normal text-[#3a1c14]/75">
                      Queried
                    </span>
                  </div>
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-[10px] font-normal text-[#3a1c14]/75">
                      Partial Requested
                    </span>
                  </div>
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-[10px] font-normal text-[#3a1c14]/75">
                      Partial Sent
                    </span>
                  </div>
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-[10px] font-normal text-[#3a1c14]/75">
                      Full Requested
                    </span>
                  </div>
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-[10px] font-normal text-[#3a1c14]/75">
                      Full Sent
                    </span>
                  </div>
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-[10px] font-normal text-[#3a1c14]/75">
                      Offer
                    </span>
                  </div>
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-[10px] font-normal text-[#3a1c14]/75">
                      Closed
                    </span>
                  </div>
                </div>
              </div>
            )}

            {(() => {
              const renderIndividualQueryDot = (
                q: Query,
                stage: 'queried' | 'part_req' | 'part_sent' | 'full_req' | 'full_sent' | 'offer' | 'closed',
                size: number
              ) => {
                const agent = agents.find(a => a.id === q.agentId);
                const formattedDate = q.dateSent ? new Date(q.dateSent).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';
                
                let dateLabel = "Sent";
                let displayDate = formattedDate;
                if (stage === 'part_req' && q.partialRequestedDate) {
                  dateLabel = "Requested";
                  displayDate = new Date(q.partialRequestedDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                } else if (stage === 'part_sent' && q.partialSentDate) {
                  dateLabel = "Sent";
                  displayDate = new Date(q.partialSentDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                } else if (stage === 'full_req' && q.fullRequestedDate) {
                  dateLabel = "Requested";
                  displayDate = new Date(q.fullRequestedDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                } else if (stage === 'full_sent' && q.fullSentDate) {
                  dateLabel = "Sent";
                  displayDate = new Date(q.fullSentDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                }

                const center = size / 2;
                const radius = Math.max(2.5, (size / 2) - 1);
                const strokeWidth = size <= 10 ? 1 : 1.5;

                const getPiePath = (pct: number) => {
                  if (pct <= 0 || pct >= 100) return "";
                  const startAngle = -Math.PI / 2; // 12 o'clock
                  const angleDiff = (pct / 100) * 2 * Math.PI;
                  const endAngle = startAngle + angleDiff;
                  
                  const startX = center + radius * Math.cos(startAngle);
                  const startY = center + radius * Math.sin(startAngle);
                  const endX = center + radius * Math.cos(endAngle);
                  const endY = center + radius * Math.sin(endAngle);
                  
                  const largeArcFlag = pct > 50 ? 1 : 0;
                  return `M ${center} ${center} L ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;
                };

                let percentage = 0;
                if (stage === 'queried') percentage = 0;
                else if (stage === 'part_req') percentage = 20;
                else if (stage === 'part_sent') percentage = 40;
                else if (stage === 'full_req') percentage = 60;
                else if (stage === 'full_sent') percentage = 80;
                else if (stage === 'offer') percentage = 100;

                return (
                  <div 
                    key={q.id}
                    className="relative group/dot inline-flex items-center justify-center select-none transition-all duration-300 hover:scale-130 hover:z-10 cursor-pointer"
                    style={{ width: `${size}px`, height: `${size}px` }}
                  >
                    <svg 
                      width={size} 
                      height={size} 
                      viewBox={`0 0 ${size} ${size}`} 
                      className="w-full h-full drop-shadow-[0_1px_1px_rgba(124,58,42,0.06)]"
                    >
                      {stage === 'closed' ? (
                        <>
                          <circle cx={center} cy={center} r={radius} fill="#888888" stroke="#888888" strokeWidth={strokeWidth} />
                          <line x1={center - (radius * 0.4)} y1={center - (radius * 0.4)} x2={center + (radius * 0.4)} y2={center + (radius * 0.4)} stroke="#ffffff" strokeWidth={strokeWidth} />
                          <line x1={center + (radius * 0.4)} y1={center - (radius * 0.4)} x2={center - (radius * 0.4)} y2={center + (radius * 0.4)} stroke="#ffffff" strokeWidth={strokeWidth} />
                        </>
                      ) : percentage === 0 ? (
                        <circle cx={center} cy={center} r={radius} fill="none" stroke="#7c3d3d" strokeWidth={strokeWidth} />
                      ) : percentage === 100 ? (
                        <circle cx={center} cy={center} r={radius} fill="#7c3d3d" stroke="#7c3d3d" strokeWidth={strokeWidth} />
                      ) : (
                        <>
                          <circle cx={center} cy={center} r={radius} fill="none" stroke="#7c3d3d" strokeWidth={strokeWidth} />
                          <path d={getPiePath(percentage)} fill="#7c3d3d" stroke="none" />
                        </>
                      )}
                    </svg>

                    {/* Pure CSS Hover Tooltip */}
                    <div className="invisible group-hover/dot:visible opacity-0 group-hover/dot:opacity-100 absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-3 bg-stone-900 text-stone-100 rounded-xl text-[11px] font-sans shadow-lg text-left pointer-events-none transition-all duration-200">
                      <div className="font-bold text-white truncate">{agent?.name || "Unknown Agent"}</div>
                      <div className="text-stone-400 text-[10px] truncate">{agent?.agency || "Independent"}</div>
                      <div className="h-[1px] bg-stone-800 my-1.5" />
                      <div className="flex justify-between gap-2 text-stone-300 text-[10px]">
                        <span>Status:</span>
                        <span className="font-semibold text-rose-400">{q.status}</span>
                      </div>
                      <div className="flex justify-between gap-2 text-stone-300 text-[10px] mt-0.5">
                        <span>{dateLabel}:</span>
                        <span className="font-mono text-stone-400">{displayDate}</span>
                      </div>
                    </div>
                  </div>
                );
              };

              const renderStageColumn = (list: Query[], stageKey: 'queried' | 'part_req' | 'part_sent' | 'full_req' | 'full_sent' | 'offer' | 'closed') => {
                const dotsCount = list.length;
                if (dotsCount === 0) {
                  return (
                    <div className="flex items-center justify-center min-h-[26px]">
                      <span className="text-stone-300 font-medium select-none font-sans">-</span>
                    </div>
                  );
                }

                // select a size based on count, making sure they never exceed the row height constraint.
                const size = dotsCount <= 1 ? 16 : dotsCount <= 4 ? 12 : dotsCount <= 8 ? 9 : 7;

                return (
                  <div className="flex flex-col items-center justify-center min-h-[26px]">
                    <div className="flex flex-row flex-wrap gap-[2px] items-center justify-center max-w-full">
                      {list.map((q) => renderIndividualQueryDot(q, stageKey, size))}
                    </div>
                  </div>
                );
              };

              return (
                <div id="breakdown-ledger-theme" className="w-full">
                  {/* Manuscript Rows */}
                  <div className="divide-y-0">
                    {manuscripts.map((m, index) => {
                      const mQueries = queries.filter(q => q.manuscriptId === m.id);
                      
                      const qQueried = mQueries.filter(q => q.status === QueryStatus.QUERIED);
                      const qPartReq = mQueries.filter(q => q.status === QueryStatus.PARTIAL_REQUESTED);
                      const qPartSent = mQueries.filter(q => q.status === QueryStatus.PARTIAL_SENT);
                      const qFullReq = mQueries.filter(q => q.status === QueryStatus.FULL_REQUESTED);
                      const qFullSent = mQueries.filter(q => q.status === QueryStatus.FULL_SENT);
                      const qOffer = mQueries.filter(q => q.status === QueryStatus.OFFER);
                      const qClosed = mQueries.filter(q => 
                        [QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE, QueryStatus.REVISE_RESUBMIT].includes(q.status)
                      );

                      const bgClass = isMagazineLayout ? "bg-white" : (index % 2 === 0 ? "bg-[#FFFDF9]" : "bg-[#FAF8F5]");
                      const borderBottomClass = isMagazineLayout ? "border-b border-[#e8e0d8]/50" : (index === manuscripts.length - 1 ? "" : "border-b-[0.5px] border-[#f0e6e0]");
                      const isLast = index === manuscripts.length - 1;
                      const roundedBottomClass = isMagazineLayout ? "" : (isLast ? "rounded-b-2xl" : "");
                      const rowPaddingClass = isMagazineLayout ? "px-0 py-3" : "px-[18px] py-[14px]";

                      return (
                        <div 
                          key={m.id} 
                          className={`flex items-center ${rowPaddingClass} ${bgClass} ${borderBottomClass} ${roundedBottomClass} transition-colors duration-200 group`}
                        >
                          {/* Left area: title & genre, exactly 240px width to avoid truncate / cut-off */}
                          <div className="w-[240px] shrink-0 text-left pr-4">
                            <p className="font-serif text-[13px] font-semibold text-[#3a1c14] leading-tight truncate" title={m.title}>
                              {m.title}
                            </p>
                            <p className="text-[10px] text-[#c9a89e] font-sans truncate mt-0.5">
                              {m.genre} &middot; {m.wordCount?.toLocaleString() || 0} words
                            </p>
                          </div>

                          {/* 7 Grid columns for the stages */}
                          <div className="flex-grow grid grid-cols-7 gap-2 text-center items-center">
                            {renderStageColumn(qQueried, 'queried')}
                            {renderStageColumn(qPartReq, 'part_req')}
                            {renderStageColumn(qPartSent, 'part_sent')}
                            {renderStageColumn(qFullReq, 'full_req')}
                            {renderStageColumn(qFullSent, 'full_sent')}
                            {renderStageColumn(qOffer, 'offer')}
                            {renderStageColumn(qClosed, 'closed')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {manuscripts.length === 0 && (
              <div className="p-8 text-center text-[#3a1c14]/40 text-xs italic">
                Get started by creating your very first manuscript structure!
              </div>
            )}
          </div>

          {/* ==================== FORTNIGHT IN FOCUS ==================== */}
          {(() => {
            // 1. Calculate today and date ranges
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const dLeft = new Date(today);
            dLeft.setDate(today.getDate() - 6);

            const dRight = new Date(today);
            dRight.setDate(today.getDate() + 7);

            const monthsArr = [
              "Jan", "Feb", "Mar", "Apr", "May", "Jun",
              "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
            ];

            const dayLetters = ["S", "M", "T", "W", "T", "F", "S"];

            const getDayDiff = (d1: Date, d2: Date) => {
              const t1 = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate()).getTime();
              const t2 = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate()).getTime();
              return Math.round((t1 - t2) / (1000 * 60 * 60 * 24));
            };

            const formatRangeLabel = (d1: Date, d2: Date) => {
              const y1 = d1.getFullYear();
              const y2 = d2.getFullYear();
              const m1 = monthsArr[d1.getMonth()];
              const m2 = monthsArr[d2.getMonth()];
              const day1 = d1.getDate();
              const day2 = d2.getDate();
              if (y1 !== y2) {
                return `${day1} ${m1} ${y1} – ${day2} ${m2} ${y2}`;
              }
              return `${day1} ${m1} – ${day2} ${m2} ${y1}`;
            };

            // 2. Map all events from queries
            interface FortnightEvent {
              id: string;
              queryId: string;
              query: Query;
              type: 
                | 'sent' 
                | 'pages_requested_no_response' 
                | 'pages_requested_deadline'
                | 'pages_requested_overdue'
                | 'partial_sent' 
                | 'full_sent' 
                | 'expected_upcoming' 
                | 'expected_overdue' 
                | 'nudge';
              date: Date;
              dateStr: string;
            }

            const allEvents: FortnightEvent[] = [];

            // Helper to render action pills
            const renderPill = (bg: string, color: string, border: string, text: string) => (
              <span 
                className="inline-block mt-1 font-medium select-none truncate max-w-full"
                style={{
                  backgroundColor: bg,
                  color: color,
                  border: `1px solid ${border}`,
                  borderRadius: '999px',
                  fontSize: '9px',
                  fontWeight: 500,
                  padding: '2px 8px',
                  width: 'fit-content',
                  lineHeight: '1.2'
                }}
              >
                {text}
              </span>
            );

            queries.forEach((q) => {
              // 1. Query sent — past
              if (q.dateSent) {
                allEvents.push({
                  id: `${q.id}-sent`,
                  queryId: q.id,
                  query: q,
                  type: 'sent',
                  date: new Date(q.dateSent),
                  dateStr: q.dateSent,
                });
              }

              // 2. Partial sent / Full sent — past confirmations
              if (q.partialSentDate) {
                allEvents.push({
                  id: `${q.id}-partial-sent`,
                  queryId: q.id,
                  query: q,
                  type: 'partial_sent',
                  date: new Date(q.partialSentDate),
                  dateStr: q.partialSentDate,
                });
              }
              if (q.fullSentDate) {
                allEvents.push({
                  id: `${q.id}-full-sent`,
                  queryId: q.id,
                  query: q,
                  type: 'full_sent',
                  date: new Date(q.fullSentDate),
                  dateStr: q.fullSentDate,
                });
              }

              // 3. Pages requested by agent — writer has not yet responded
              const isPagesRequestedButNotSent = 
                (q.status === QueryStatus.PARTIAL_REQUESTED && !q.partialSentDate) || 
                (q.status === QueryStatus.FULL_REQUESTED && !q.fullSentDate) || 
                (q.status === QueryStatus.REVISE_RESUBMIT && !q.partialSentDate && !q.fullSentDate);

              if (isPagesRequestedButNotSent) {
                const reqDateStr = 
                  q.status === QueryStatus.PARTIAL_REQUESTED ? (q.partialRequestedDate || q.dateSent)
                  : q.status === QueryStatus.FULL_REQUESTED ? (q.fullRequestedDate || q.dateSent)
                  : (q.fullRequestedDate || q.partialRequestedDate || q.dateSent);
                
                // Show the date that the request was made on
                const eventDateStr = reqDateStr;
                const eventDate = new Date(eventDateStr);
                
                allEvents.push({
                  id: `${q.id}-pages-requested-no-resp`,
                  queryId: q.id,
                  query: q,
                  type: 'pages_requested_no_response',
                  date: eventDate,
                  dateStr: eventDateStr,
                });

                // Expected send deadline in coming up panel (future) or overdue (past)
                const getSafeEventDate = (val: any) => {
                  if (!val) return null;
                  if (typeof val === "string") return new Date(val);
                  if (val.toDate && typeof val.toDate === "function") return val.toDate();
                  if (typeof val.seconds === "number") return new Date(val.seconds * 1000);
                  const parsed = new Date(val);
                  if (!isNaN(parsed.getTime())) return parsed;
                  return null;
                };

                const rawDeadline = q.expectedSendDate || q.responseDeadline;
                const deadlineDate = getSafeEventDate(rawDeadline);

                if (deadlineDate) {
                  const diffFuture = getDayDiff(deadlineDate, today);
                  if (diffFuture >= 1 && diffFuture <= 7) {
                    allEvents.push({
                      id: `${q.id}-pages-requested-deadline`,
                      queryId: q.id,
                      query: q,
                      type: 'pages_requested_deadline',
                      date: deadlineDate,
                      dateStr: deadlineDate.toISOString(),
                    });
                  } else if (diffFuture < 0) {
                    allEvents.push({
                      id: `${q.id}-pages-requested-overdue`,
                      queryId: q.id,
                      query: q,
                      type: 'pages_requested_overdue',
                      date: deadlineDate,
                      dateStr: deadlineDate.toISOString(),
                    });
                  }
                }
              }

              // 4. Response expected from agent — upcoming vs. overdue (only for open queries)
              const isOpen = 
                q.status !== QueryStatus.OFFER && 
                q.status !== QueryStatus.REJECTED && 
                q.status !== QueryStatus.WITHDRAWN && 
                q.status !== QueryStatus.NO_RESPONSE;

              if (isOpen && !isPagesRequestedButNotSent && q.responseDeadline) {
                const deadlineDate = new Date(q.responseDeadline);
                const diffDeadline = getDayDiff(deadlineDate, today);

                if (diffDeadline >= 0) {
                  // Today or future
                  allEvents.push({
                    id: `${q.id}-expected-upcoming`,
                    queryId: q.id,
                    query: q,
                    type: 'expected_upcoming',
                    date: deadlineDate,
                    dateStr: q.responseDeadline,
                  });
                } else {
                  // Past (overdue)
                  const diffPast = getDayDiff(today, deadlineDate);
                  if (diffPast >= 1 && diffPast <= 7) {
                    allEvents.push({
                      id: `${q.id}-expected-overdue`,
                      queryId: q.id,
                      query: q,
                      type: 'expected_overdue',
                      date: deadlineDate,
                      dateStr: q.responseDeadline,
                    });
                  }
                }
              }

              // 5. Nudge reminder — today or upcoming
              if (q.nudgeDate) {
                const nudgeDate = new Date(q.nudgeDate);
                const diffNudge = getDayDiff(nudgeDate, today);
                if (diffNudge >= 0) {
                  allEvents.push({
                    id: `${q.id}-nudge`,
                    queryId: q.id,
                    query: q,
                    type: 'nudge',
                    date: nudgeDate,
                    dateStr: q.nudgeDate,
                  });
                }
              }
            });

            // Past events: any events (including past deadlines or nudges) that fall in the last 7 days (today is diff = 0, past 6 days is diff = 1 to 6)
            const leftEvents = allEvents.filter(ev => {
              if (ev.type === 'pages_requested_overdue') {
                return true;
              }
              if (ev.type === 'expected_overdue') {
                return true;
              }
              if (['sent', 'partial_sent', 'full_sent', 'pages_requested_no_response'].includes(ev.type)) {
                const diff = getDayDiff(today, ev.date);
                return (diff >= 0 && diff <= 6);
              }
              return false;
            });
            leftEvents.sort((a, b) => a.date.getTime() - b.date.getTime());

            // Future events: any events that fall in tomorrow through 7 days ahead
            const rightEvents = allEvents.filter(ev => {
              if (ev.type === 'expected_upcoming' || ev.type === 'nudge' || ev.type === 'pages_requested_deadline') {
                const diff = getDayDiff(ev.date, today);
                return (diff >= 1 && diff <= 7);
              }
              return false;
            });
            rightEvents.sort((a, b) => a.date.getTime() - b.date.getTime());

            // Mini calendar days lists
            const leftPanelDays: Date[] = [];
            for (let i = 6; i >= 0; i--) {
              const d = new Date(today);
              d.setDate(today.getDate() - i);
              leftPanelDays.push(d);
            }

            const rightPanelDays: Date[] = [];
            for (let i = 1; i <= 7; i++) {
              const d = new Date(today);
              d.setDate(today.getDate() + i);
              rightPanelDays.push(d);
            }

            const getTimelineTypeForEvent = (type: FortnightEvent['type']) => {
              if (type === 'pages_requested_no_response') {
                return 'pages_requested_no_response';
              }
              if (type === 'pages_requested_overdue') {
                return 'pages_requested_overdue';
              }
              if (type === 'expected_overdue') {
                return 'expected_overdue';
              }
              if (type === 'nudge') {
                return 'nudge';
              }
              if (type === 'expected_upcoming' || type === 'pages_requested_deadline') {
                return 'expected_upcoming';
              }
              if (type === 'partial_sent' || type === 'full_sent') {
                return 'sent_confirmation';
              }
              if (type === 'sent') {
                return 'sent';
              }
              return null;
            };

            const renderTimelineIcon = (t: string, isHovered: boolean) => {
              const scaleStyle = { transform: isHovered ? "scale(1.2)" : "scale(1)", transition: "transform 200ms" };
              if (t === 'pages_requested_no_response') {
                return <div key={t} className="w-[6px] h-[6px] rounded-full border border-[#7c3d3d] bg-transparent transition-transform" style={scaleStyle} />;
              }
              if (t === 'pages_requested_overdue') {
                return <span key={t} className="text-[10px] font-black text-[#7c3d3d] leading-none select-none transition-transform" style={scaleStyle}>!</span>;
              }
              if (t === 'expected_overdue') {
                return <span key={t} className="text-[10px] font-bold text-[#c9a89e] leading-none select-none transition-transform" style={scaleStyle}>!</span>;
              }
              if (t === 'nudge') {
                return <span key={t} className="text-[10px] font-semibold text-[#9a6858] leading-none select-none transition-transform" style={scaleStyle}>!</span>;
              }
              if (t === 'expected_upcoming') {
                return <div key={t} className="w-[6px] h-[6px] rounded-full border-[1.2px] border-dashed border-[#c9a89e] bg-transparent transition-transform" style={scaleStyle} />;
              }
              if (t === 'sent_confirmation') {
                return <div key={t} className="w-[6px] h-[6px] rounded-full bg-[#5a6858] transition-transform" style={scaleStyle} />;
              }
              if (t === 'sent') {
                return <div key={t} className="w-[6px] h-[6px] rounded-full border border-[#7c3d3d] bg-transparent transition-transform" style={scaleStyle} />;
              }
              return null;
            };

            const getResponseWindowProgress = (query: Query) => {
              if (!query.dateSent || !query.responseDeadline) return 0;
              const sent = new Date(query.dateSent).getTime();
              const deadline = new Date(query.responseDeadline).getTime();
              const curr = today.getTime();
              if (curr >= deadline) return 100;
              if (curr <= sent) return 0;
              const pct = ((curr - sent) / (deadline - sent)) * 100;
              return Math.min(100, Math.max(0, Math.round(pct)));
            };

            const renderProgressCircle = (progressPercent: number) => {
              const radius = 4.5;
              const circumference = 2 * Math.PI * radius;
              const strokeDashoffset = circumference - (progressPercent / 100) * circumference;
              return (
                <svg width="12" height="12" className="transform -rotate-90 shrink-0">
                  <circle
                    cx="6"
                    cy="6"
                    r={radius}
                    className="stroke-[#f0e8e0]"
                    strokeWidth="1.5"
                    fill="transparent"
                  />
                  <circle
                    cx="6"
                    cy="6"
                    r={radius}
                    className="stroke-[#7c3d3d]"
                    strokeWidth="1.5"
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                  />
                </svg>
              );
            };

            const renderMiniCalendar = (days: Date[]) => {
              return (
                <div className="grid grid-cols-7 gap-[3px] mb-[12px] select-none">
                  {days.map((d, idx) => {
                    const isToday = getDayDiff(d, today) === 0;
                    const dayLetter = dayLetters[d.getDay()];
                    const dateNum = d.getDate();
                    const isHovered = hoveredFortnightDate === d.toDateString();
                    
                    const dayEvents = allEvents.filter(ev => getDayDiff(ev.date, d) === 0);
                    const uniqueTypes = Array.from(new Set(
                      dayEvents
                        .map(ev => getTimelineTypeForEvent(ev.type))
                        .filter((t): t is NonNullable<ReturnType<typeof getTimelineTypeForEvent>> => t !== null)
                    ));

                    const hoverBgClass = isHovered 
                      ? "ring-2 ring-rose-300 bg-rose-50/70 scale-[1.08] shadow-sm" 
                      : isToday 
                        ? "bg-[#FFF0F0]" 
                        : "hover:bg-[#FAF1EF]/70 hover:scale-[1.05]";

                    return (
                      <div 
                        className={`rounded-[5px] p-[2px_3px] flex flex-col items-center justify-between min-h-[42px] cursor-pointer transition-all duration-200 ${hoverBgClass}`}
                        key={idx}
                        onMouseEnter={() => setHoveredFortnightDate(d.toDateString())}
                        onMouseLeave={() => setHoveredFortnightDate(null)}
                      >
                        <span className={`text-[8px] uppercase font-semibold leading-tight ${isToday || isHovered ? 'text-[#7c3d3d]' : 'text-stone-400'}`}>
                          {dayLetter}
                        </span>
                        <div className={`w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9px] font-semibold mt-0.5 leading-none transition-colors ${
                          isToday 
                            ? "bg-[#7c3d3d] text-white" 
                            : isHovered 
                              ? "bg-rose-100 text-[#7c3d3d]" 
                              : "text-[#3a1c14]"
                        }`}>
                          {dateNum}
                        </div>
                        <div className="h-[6px] flex items-center justify-center gap-[3px] mt-0.5">
                          {uniqueTypes.map(t => renderTimelineIcon(t, isHovered))}
                          {uniqueTypes.length === 0 && <div className="w-[6px] h-[6px] bg-transparent" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            };

            const renderEventCard = (ev: FortnightEvent, panel: 'left' | 'right') => {
              const agent = agents.find(a => a.id === ev.query.agentId);
              const agentName = agent ? agent.name : "The Agent";
              const isNudge = ev.type === 'nudge';

              const isCardHighlighted = hoveredFortnightDate === ev.date.toDateString();

              let cardBgAndBorder = "";
              if (ev.type === 'sent') {
                cardBgAndBorder = "border-l-2 border-r-0 border-y-0 border-[#7c3d3d] bg-[#FFFAF8]";
              } else if (['partial_sent', 'full_sent'].includes(ev.type)) {
                cardBgAndBorder = "border-l-2 border-r-0 border-y-0 border-[#5a6858] bg-[#F7FBF6]";
              } else if (ev.type === 'pages_requested_no_response') {
                cardBgAndBorder = "border-l-2 border-r-0 border-y-0 border-[#7c3d3d] bg-[#FFFAF8]";
              } else if (ev.type === 'pages_requested_deadline') {
                cardBgAndBorder = "border-[1.5px] border-dashed border-[#c9a89e] bg-[#FDFAF8]";
              } else if (ev.type === 'pages_requested_overdue') {
                cardBgAndBorder = "border-l-2 border-r-0 border-y-0 border-[#7c3d3d] bg-[#FFFAF8]";
              } else if (ev.type === 'expected_upcoming') {
                cardBgAndBorder = "border-[1.5px] border-dashed border-[#c9a89e] bg-[#FDFAF8]";
              } else if (ev.type === 'expected_overdue') {
                cardBgAndBorder = "border-l-2 border-r-0 border-y-0 border-[#7c3d3d] bg-[#FFFAF8]";
              } else if (ev.type === 'nudge') {
                cardBgAndBorder = "border-[1.5px] border-dashed border-[#dbbdb5] bg-[#FDFAF8]";
              }

              let dateLabel: React.ReactNode = (
                <span className="text-[#c9a89e] text-[8px] w-[30px] shrink-0 font-medium transition-colors">
                  {ev.date.getDate()} {monthsArr[ev.date.getMonth()]}
                </span>
              );
              if (getDayDiff(ev.date, today) === 0) {
                dateLabel = (
                  <span className="text-[#7c3d3d] text-[8px] w-[30px] shrink-0 font-semibold transition-colors">
                    Today
                  </span>
                );
              }

              let pillElement: React.ReactNode = null;
              let eventTypeLabel = "";
              let typeColorClass = "";

              if (ev.type === 'sent') {
                eventTypeLabel = "Query sent";
                typeColorClass = "text-[#7c3d3d]";
              } else if (ev.type === 'partial_sent') {
                eventTypeLabel = "Partial sent";
                typeColorClass = "text-[#5a6858] font-medium";
              } else if (ev.type === 'full_sent') {
                eventTypeLabel = "Full sent";
                typeColorClass = "text-[#5a6858] font-medium";
              } else if (ev.type === 'pages_requested_no_response') {
                eventTypeLabel = ev.query.status === QueryStatus.PARTIAL_REQUESTED 
                  ? "Partial manuscript requested" 
                  : ev.query.status === QueryStatus.FULL_REQUESTED 
                    ? "Full manuscript requested" 
                    : "Manuscript requested";
                typeColorClass = "text-[#7c3d3d] font-semibold";
              } else if (ev.type === 'pages_requested_deadline') {
                let reqTypeLabel = "manuscript";
                if (ev.query.status === QueryStatus.PARTIAL_REQUESTED || ev.query.status === QueryStatus.PARTIAL_SENT || ev.query.partialRequestedDate) {
                  reqTypeLabel = "partial manuscript";
                } else if (ev.query.status === QueryStatus.FULL_REQUESTED || ev.query.status === QueryStatus.FULL_SENT || ev.query.fullRequestedDate) {
                  reqTypeLabel = "full manuscript";
                } else if (ev.query.status === QueryStatus.REVISE_RESUBMIT) {
                  reqTypeLabel = "revised & resubmitted manuscript";
                }
                eventTypeLabel = `Agent expecting your ${reqTypeLabel} by this date`;
                typeColorClass = "text-[#7c4a3a] italic";
              } else if (ev.type === 'pages_requested_overdue') {
                const reqTypeLabel = (ev.query.status === QueryStatus.PARTIAL_REQUESTED || ev.query.status === QueryStatus.PARTIAL_SENT || ev.query.partialRequestedDate) 
                  ? "partial manuscript" 
                  : (ev.query.status === QueryStatus.FULL_REQUESTED || ev.query.status === QueryStatus.FULL_SENT || ev.query.fullRequestedDate) 
                    ? "full manuscript" 
                    : "manuscript";
                eventTypeLabel = `A ${reqTypeLabel} was due to be sent`;
                typeColorClass = "text-[#7c3d3d] font-semibold";
                pillElement = null;
              } else if (ev.type === 'expected_upcoming') {
                const daysLeft = getDayDiff(ev.date, today);
                if (daysLeft >= 0 && daysLeft <= 3) {
                  eventTypeLabel = "Final day of response window — consider nudging";
                  typeColorClass = "text-[#7c3d3d] font-semibold";
                  pillElement = null;
                } else {
                  const evDateFormatted = `${ev.date.getDate()} ${monthsArr[ev.date.getMonth()]}`;
                  eventTypeLabel = `Response expected ${evDateFormatted}`;
                  typeColorClass = "text-[#7c4a3a] italic";
                }
              } else if (ev.type === 'expected_overdue') {
                const nDays = Math.max(1, getDayDiff(today, ev.date));
                const nDaysText = nDays === 1 ? "1 day" : `${nDays} days`;
                pillElement = renderPill("#f0e8e0", "#7c4a3a", "#dce0d9", `Response window passed · ${nDaysText} ago`);
              } else if (ev.type === 'nudge') {
                eventTypeLabel = "Nudge reminder";
                typeColorClass = "text-[#9a6858]";
              }

              let tooltipHeaderBg = "#3a1c14";
              if (ev.type === 'nudge') {
                tooltipHeaderBg = "#7c4838";
              } else if (['partial_sent', 'full_sent'].includes(ev.type)) {
                tooltipHeaderBg = "#5a6858";
              } else if (ev.type === 'pages_requested_no_response' || ev.type === 'pages_requested_overdue' || ev.type === 'pages_requested_deadline') {
                tooltipHeaderBg = "#7c3d3d";
              } else if (ev.type === 'expected_overdue') {
                tooltipHeaderBg = "#5c4033";
              }

              const materials = agent?.materialsWanted && agent.materialsWanted.length > 0 
                ? agent.materialsWanted.join(", ") 
                : "Partial Manuscript, Synopsis";

              // Clean above-cursor tooltip with high z-index and compact width (w-[260px]) so no text is cut off, now glassy with a 0.75 second hover delay.
              const tooltipClass = "invisible opacity-0 group-hover:visible group-hover:opacity-100 absolute z-[100] bottom-full left-1/2 -translate-x-1/2 mb-3 w-[260px] bg-white/85 backdrop-blur-md border border-[#e8d5cc]/80 rounded-xl overflow-hidden shadow-xl flex flex-col pointer-events-auto transition-all duration-200 delay-0 group-hover:delay-[750ms] origin-bottom scale-[0.97] group-hover:scale-100";

              const getRecordedRequestMaterials = (q: any) => {
                const qty = q.materialsRequestedQuantity;
                const mType = q.materialsRequestedType;
                
                if (qty && mType) {
                  if (mType.toLowerCase() === "other") {
                    return qty;
                  }
                  const typeLabel = mType.charAt(0).toUpperCase() + mType.slice(1).toLowerCase();
                  return `${qty} ${typeLabel}`;
                }
                if (qty) return String(qty);
                if (mType) {
                  if (mType.toLowerCase() === "other") return "Custom materials";
                  return mType.charAt(0).toUpperCase() + mType.slice(1).toLowerCase();
                }
                
                // Fallbacks if not specifically input
                if (q.status === QueryStatus.PARTIAL_REQUESTED || q.status === QueryStatus.PARTIAL_SENT) {
                  return "Partial manuscript";
                }
                if (q.status === QueryStatus.FULL_REQUESTED || q.status === QueryStatus.FULL_SENT) {
                  return "Full manuscript";
                }
                if (q.status === QueryStatus.REVISE_RESUBMIT) {
                  return "Revised manuscript";
                }
                return "Manuscript materials";
              };

              const recordedMaterials = getRecordedRequestMaterials(ev.query) || "Manuscript materials";

              let eventStatus = ev.query.status;
              if (ev.type === 'sent') {
                eventStatus = QueryStatus.QUERIED;
              } else if (ev.type === 'partial_sent') {
                eventStatus = QueryStatus.PARTIAL_SENT;
              } else if (ev.type === 'full_sent') {
                eventStatus = QueryStatus.FULL_SENT;
              } else if (ev.type === 'pages_requested_no_response' || ev.type === 'pages_requested_overdue' || ev.type === 'pages_requested_deadline') {
                if (ev.query.status === QueryStatus.PARTIAL_REQUESTED || ev.query.status === QueryStatus.PARTIAL_SENT) {
                  eventStatus = QueryStatus.PARTIAL_REQUESTED;
                } else if (ev.query.status === QueryStatus.FULL_REQUESTED || ev.query.status === QueryStatus.FULL_SENT) {
                  eventStatus = QueryStatus.FULL_REQUESTED;
                } else if (ev.query.status === QueryStatus.REVISE_RESUBMIT) {
                  eventStatus = QueryStatus.REVISE_RESUBMIT;
                } else {
                  eventStatus = ev.query.fullRequestedDate ? QueryStatus.FULL_REQUESTED : QueryStatus.PARTIAL_REQUESTED;
                }
              } else if (ev.type === 'expected_upcoming' || ev.type === 'expected_overdue') {
                eventStatus = QueryStatus.QUERIED;
              }

              let dotIndicator: React.ReactNode = null;
              const isMaryShelleyUrgent = ev.type === 'expected_upcoming' && (() => {
                const daysLeft = getDayDiff(ev.date, today);
                return daysLeft >= 0 && daysLeft <= 3;
              })();

              if (isNudge) {
                dotIndicator = <span className="text-[13px] font-bold text-[#c9a89e] select-none leading-none">!</span>;
              } else if (ev.type === 'pages_requested_overdue' || isMaryShelleyUrgent) {
                dotIndicator = <span className="text-[13px] font-extrabold text-[#7c3d3d] select-none leading-none">!</span>;
              } else {
                dotIndicator = <StatusCircle status={eventStatus} className="w-3.5 h-3.5" />;
              }

              let ctaText = "View query";
              if (ev.type === 'pages_requested_no_response' || ev.type === 'pages_requested_overdue' || ev.type === 'pages_requested_deadline') {
                ctaText = "Send pages";
              } else if (ev.type === 'expected_upcoming') {
                const daysLeft = getDayDiff(ev.date, today);
                if (daysLeft >= 0 && daysLeft <= 3) {
                  ctaText = "Log a nudge";
                }
              }

              return (
                <div 
                  key={ev.id}
                  className={`group ev-card flex items-center justify-between gap-[8px] p-[6px_8px] rounded-[6px] cursor-pointer relative select-none transition-all duration-300 ${cardBgAndBorder} ${
                    isCardHighlighted 
                      ? "shadow-[0_4px_12px_rgba(244,63,94,0.12)] ring-1 ring-pink-200/60 scale-[1.015] bg-pink-50/5" 
                      : "hover:scale-[1.01] hover:shadow-xs"
                  }`}
                  onClick={() => {
                    setSelectedQueryIdForPanel(ev.queryId);
                    setIsQueryPanelOpen(true);
                  }}
                  onMouseEnter={() => setHoveredFortnightDate(ev.date.toDateString())}
                  onMouseLeave={() => setHoveredFortnightDate(null)}
                >
                  <div className="flex items-center gap-[8px] truncate flex-1 min-w-0">
                    {dateLabel}
                    <div className="flex flex-col text-left truncate justify-center flex-1 min-w-0">
                      <span className={`text-[11px] font-medium leading-tight truncate ${isNudge ? 'text-[#9a6858]' : 'text-[#3a1c14]'}`}>
                        {agentName}
                      </span>
                      {pillElement ? (
                        <div className="flex mt-0.5">{pillElement}</div>
                      ) : (
                        <span className={`text-[9px] mt-0.5 leading-normal truncate ${typeColorClass}`}>
                          {eventTypeLabel}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="ml-auto shrink-0 flex items-center pr-1 select-none">
                    {dotIndicator}
                  </div>

                  {/* Infographic Hover Tooltip */}
                  <div className={tooltipClass} onClick={(e) => e.stopPropagation()}>
                    {/* Tooltip Header */}
                    <div className="p-[10px_12px] flex items-start justify-between gap-2 rounded-t-xl" style={{ backgroundColor: `${tooltipHeaderBg}CC` }}>
                      <div className="flex flex-col text-left truncate flex-1 min-w-0">
                        <span className="text-[12px] font-semibold text-[#F8F5F0] leading-snug truncate">
                          {agentName}
                        </span>
                        <span className="text-[10px] text-[rgba(248,245,240,0.5)] mt-0.5 truncate animate-none">
                          {agent?.agency || "Agency"}
                        </span>
                      </div>
                      <div className="shrink-0 scale-90 origin-top-right">
                        <StatusPill status={eventStatus} size="sm" />
                      </div>
                    </div>

                    {/* Tooltip Body */}
                    <div className="p-[10px_12px] flex flex-col gap-[8px] relative bg-transparent text-left text-neutral-800">
                      {/* Top Row with Manuscript */}
                      <div className="flex flex-col text-left">
                        <span className="text-[8px] uppercase tracking-wider text-[#c9a89e] font-semibold">Manuscript</span>
                        <span className="text-[11px] text-[#3a1c14] font-medium leading-normal break-words whitespace-normal">
                          {manuscripts.find(m => m.id === ev.query.manuscriptId)?.title || "Untitled"}
                        </span>
                      </div>

                      {/* Custom status layouts based on event type */}
                      {ev.type === 'sent' && (
                        <div className="flex flex-col gap-1 border-t border-[#f0e8e0]/60 pt-2 text-[10px]">
                           <div className="flex justify-between items-center">
                             <span className="text-stone-400">Status</span>
                             <span className="font-semibold text-[#3a1c14]">Query sent</span>
                           </div>
                           <div className="flex justify-between items-center">
                             <span className="text-stone-400">Date Sent</span>
                             <span className="font-semibold text-[#3a1c14]">
                               {new Date(ev.query.dateSent).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                             </span>
                           </div>
                           {ev.query.status !== QueryStatus.QUERIED && (
                             <div className="mt-2 p-2 bg-[#fdf8f6] border-l-2 border-[#ebdcd3] rounded text-left">
                               <p className="text-[10px] text-[#6a5045] font-medium leading-normal">
                                 {(() => {
                                   switch (ev.query.status) {
                                     case QueryStatus.PARTIAL_REQUESTED:
                                       return "A partial manuscript has since been requested.";
                                     case QueryStatus.PARTIAL_SENT:
                                       return "A partial manuscript has since been sent.";
                                     case QueryStatus.FULL_REQUESTED:
                                       return "A full manuscript has since been requested.";
                                     case QueryStatus.FULL_SENT:
                                       return "A full manuscript has since been sent.";
                                     case QueryStatus.REVISE_RESUBMIT:
                                       return "A revised manuscript has since been requested.";
                                     case QueryStatus.OFFER:
                                       return "An offer has since been received.";
                                     case QueryStatus.REJECTED:
                                       return "This query has since received a rejection.";
                                     case QueryStatus.WITHDRAWN:
                                       return "This query has since been withdrawn.";
                                     case QueryStatus.NO_RESPONSE:
                                       return "This query has since been closed as no response.";
                                     default:
                                       return "";
                                   }
                                 })()}
                               </p>
                             </div>
                           )}
                        </div>
                      )}

                      {ev.type === 'pages_requested_no_response' && (
                        <div className="flex flex-col gap-1.5 border-t border-[#f0e8e0]/60 pt-2 text-[10px]">
                          <div className="flex justify-between items-center">
                            <span className="text-stone-400">Date requested</span>
                            <span className="font-medium text-[#3a1c14]">
                              {new Date(ev.query.partialRequestedDate || ev.query.fullRequestedDate || ev.query.dateSent).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-stone-400">Days since request</span>
                            <span className="font-semibold text-[#7c3d3d]">
                              {Math.max(0, getDayDiff(today, ev.date))} days
                            </span>
                          </div>
                          <div className="border-t border-[#f0e8e0]/40 pt-1.5 flex flex-col mt-0.5">
                            <span className="text-stone-400 text-[8px] uppercase font-semibold">What was requested</span>
                            <span className="font-medium text-[#3a1c14] leading-tight mt-0.5">{recordedMaterials}</span>
                          </div>
                        </div>
                      )}

                      {ev.type === 'pages_requested_overdue' && (
                        <div className="flex flex-col gap-1.5 border-t border-[#f0e8e0]/60 pt-2 text-[10px]">
                          <div className="flex justify-between items-center">
                            <span className="text-stone-400">Date requested</span>
                            <span className="font-medium text-[#3a1c14]">
                              {new Date(ev.query.partialRequestedDate || ev.query.fullRequestedDate || ev.query.dateSent).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-stone-400">Your response expected by</span>
                            <span className="font-semibold text-[#3a1c14]">
                              {ev.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-stone-400">Days overdue</span>
                            <span className="font-semibold text-[#7c3d3d]">
                              {Math.max(1, getDayDiff(today, ev.date))} {Math.max(1, getDayDiff(today, ev.date)) === 1 ? "day" : "days"}
                            </span>
                          </div>
                          <div className="border-t border-[#f0e8e0]/40 pt-1.5 flex flex-col mt-0.5">
                            <span className="text-stone-400 text-[8px] uppercase font-semibold">What was requested</span>
                            <span className="font-medium text-[#3a1c14] leading-tight mt-0.5">{recordedMaterials}</span>
                          </div>
                        </div>
                      )}

                      {ev.type === 'pages_requested_deadline' && (
                        <div className="flex flex-col gap-1.5 border-t border-[#f0e8e0]/60 pt-2 text-[10px]">
                          <div className="flex justify-between items-center">
                            <span className="text-stone-400">Date requested</span>
                            <span className="font-medium text-[#c9a89e]">
                              {ev.query.partialRequestedDate || ev.query.fullRequestedDate ? new Date(ev.query.partialRequestedDate || ev.query.fullRequestedDate!).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : "Recently"}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-stone-400">Request type</span>
                            <span className="font-medium text-[#3a1c14]">{ev.query.status}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-stone-400">Deadline</span>
                            <span className="font-semibold text-[#7c3d3d]">
                              {ev.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          <div className="border-t border-[#f0e8e0]/40 pt-1.5 flex flex-col mt-0.5">
                            <span className="text-stone-400 text-[8px] uppercase font-semibold">What was requested</span>
                            <span className="font-medium text-[#3a1c14] leading-tight mt-0.5">{recordedMaterials}</span>
                          </div>
                        </div>
                      )}

                      {ev.type === 'expected_upcoming' && (() => {
                        const daysLeft = getDayDiff(ev.date, today);
                        if (daysLeft >= 0 && daysLeft <= 3) {
                          return (
                            <div className="flex flex-col gap-1 border-t border-[#f0e8e0]/60 pt-2 text-left">
                              <div className="flex flex-col items-center justify-center py-2 text-center bg-rose-50/50 rounded-lg">
                                <span className="text-[28px] font-extrabold text-[#7c3d3d] leading-none" style={{ fontFamily: "Georgia, serif" }}>
                                  {daysLeft}
                                </span>
                                <span className="text-[8px] text-[#7c3d3d] uppercase tracking-wider font-bold mt-1">
                                  {daysLeft === 1 ? "day remaining" : "days remaining"}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-[10px] mt-1.5">
                                <span className="text-stone-400">Due date</span>
                                <span className="font-semibold text-[#3a1c14]">
                                  {ev.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </span>
                              </div>
                            </div>
                          );
                        } else {
                          return (
                            <div className="flex flex-col gap-2 border-t border-[#f0e8e0]/60 pt-2 text-left">
                              <div className="flex flex-col items-center justify-center py-1 text-center">
                                <span className="text-[18px] font-semibold text-[#7c3d3d]" style={{ fontFamily: "Georgia, serif" }}>
                                  {Math.max(0, daysLeft)}
                                </span>
                                <span className="text-[9px] text-[#c9a89e] uppercase tracking-wider font-semibold">
                                  days until response window
                                </span>
                              </div>
                              <div className="w-full bg-[#f0e8e0] h-1 rounded-full overflow-hidden my-0.5">
                                <div 
                                  className="bg-[#c9a89e] h-full rounded-full transition-all duration-300" 
                                  style={{ width: `${getResponseWindowProgress(ev.query)}%` }} 
                                />
                              </div>
                              <div className="flex flex-col gap-0.5 text-[10px]">
                                <div className="flex justify-between items-center">
                                  <span className="text-stone-400">Current status</span>
                                  <span className="font-medium text-[#3a1c14]">{ev.query.status}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-stone-400">Queried on</span>
                                  <span className="font-medium text-[#3a1c14]">
                                    {new Date(ev.query.dateSent).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                      })()}

                      {ev.type === 'expected_overdue' && (
                        <div className="flex flex-col gap-1.5 border-t border-[#f0e8e0]/60 pt-2 text-[10px]">
                          <div className="flex flex-col items-center justify-center py-2 text-center bg-stone-50 rounded-lg">
                            <span className="text-[24px] font-semibold text-[#7c4a3a]" style={{ fontFamily: "Georgia, serif" }}>
                              {Math.max(1, getDayDiff(today, ev.date))}
                            </span>
                            <span className="text-[8px] text-[#7c4a3a] uppercase tracking-wider font-semibold">
                              Days overdue
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-stone-400">Expected response</span>
                            <span className="font-medium text-[#3a1c14]">
                              {ev.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          <div className="border-t border-[#f0e8e0]/40 pt-1.5 text-center mt-1">
                            <p className="text-[9px] text-[#7c4a3a] leading-relaxed">
                              Consider nudging or closing this query.
                            </p>
                          </div>
                        </div>
                      )}

                      {ev.type === 'nudge' && (
                        <div className="flex flex-col gap-1 border-t border-[#f0e8e0]/60 pt-2 text-[10px] text-left">
                          <div className="flex justify-between items-center">
                            <span className="text-stone-400">Nudge set for</span>
                            <span className="font-medium text-[#3a1c14]">
                              {new Date(ev.query.nudgeDate!).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-stone-400">Days away</span>
                            <span className="font-medium text-[#3a1c14]">{Math.max(0, getDayDiff(ev.date, today))} days</span>
                          </div>
                          <div className="bg-[#FFF0F0] border-l-2 border-[#f5c8c8] rounded-[5px] p-[7px_8px] flex flex-col gap-0.5 mt-1.5">
                            <span className="text-[9px] uppercase tracking-wider text-[#c9a89e] font-semibold leading-tight">Action needed</span>
                            <p className="text-[10px] text-[#7c3d3d] leading-normal font-medium text-left">Decide whether to follow up or close this query.</p>
                          </div>
                        </div>
                      )}

                      {['partial_sent', 'full_sent'].includes(ev.type) && (
                        <div className="flex flex-col gap-1 border-t border-[#f0e8e0]/60 pt-2 text-[10px] text-left">
                          <div className="flex justify-between items-center">
                            <span className="text-stone-400">Manuscript</span>
                            <span className="font-medium text-[#3a1c14]">
                              {manuscripts.find(m => m.id === ev.query.manuscriptId)?.title || "Untitled"}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-stone-400">Date sent</span>
                            <span className="font-medium text-[#3A1C14]">
                              {ev.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-stone-400">Current status</span>
                            <span className="font-medium text-[#5a6858] font-semibold">{ev.query.status}</span>
                          </div>
                        </div>
                      )}

                      {/* Optional tinted quote block */}
                      {(() => {
                        const relatedAct = mergedActivities.find(act => act.queryId === ev.queryId && act.activityType === ActivityType.STATUS_CHANGED && act.details && !act.details.startsWith("Respond by") && !act.details.startsWith("Expected a response"));
                        if (relatedAct && !['sent', 'expected_overdue', 'expected_upcoming', 'pages_requested_no_response', 'pages_requested_deadline', 'pages_requested_overdue'].includes(ev.type)) {
                          return (
                            <div className="bg-[#fdf8f6] p-2 mt-2 rounded border-l border-[#ebdcd3] text-left">
                              <p className="text-[10px] italic text-[#6a5045] leading-snug">
                                "{relatedAct.details}"
                              </p>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>

                    {/* Tooltip Footer */}
                    <div 
                      className="border-t border-[#f0e8e0] p-[8px_12px] flex justify-end bg-stone-50 rounded-b-xl cursor-pointer pointer-events-auto"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate("queries");
                      }}
                    >
                      <span className="text-[10px] font-medium text-[#7c3d3d] flex items-center gap-0.5 hover:underline">
                        {ctaText} <ArrowRight className="w-2.5 h-2.5" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            };

            return (
              <div 
                className={isMagazineLayout
                  ? "bg-[#FFFDF9] border-b border-[#e8e0d8] flex flex-col w-full relative"
                  : "bg-[#FFFDF9] border border-[#e8d5cc] rounded-[16px] shadow-[0_8px_30px_rgba(58,28,20,0.06)] flex flex-col w-full relative"
                }
                style={isMagazineLayout ? { borderBottomWidth: '0.5px' } : {}}
                id="fortnight-in-focus-container"
              >
                {/* Header */}
                <div className={isMagazineLayout
                  ? "p-[14px_24px] pb-1.5 flex items-center justify-between border-b border-[#e8d5cc]/30"
                  : "bg-[#dce0d9] rounded-t-[16px] p-[11px_18px] flex items-center justify-between border-b border-[#e8d5cc]/60"
                }>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-[#3a1c14]" />
                    <div className="flex flex-col text-left">
                      <h4 className={isMagazineLayout
                        ? "text-[11px] uppercase tracking-wider font-semibold text-[#3a1c14] font-serif leading-tight"
                        : "text-[12px] font-semibold text-[#3a1c14] leading-tight"
                      }>
                        Fortnight in focus
                      </h4>
                      <span className="text-[10px] text-[#3a1c14]/60 mt-0.5 leading-none font-medium">
                        A summary of last week and a snapshot of next.
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-[#3a1c14]/60 font-semibold font-mono">
                    {formatRangeLabel(dLeft, dRight)}
                  </span>
                </div>

                {/* Two-panel layout */}
                <div className={isMagazineLayout
                  ? "grid grid-cols-[1fr_1px_1fr] bg-[#FFFDF9]"
                  : "grid grid-cols-[1fr_1px_1fr] bg-[#FFFDF9] rounded-b-[16px]"
                }>
                  {/* LEFT PANEL */}
                  <div className={isMagazineLayout
                    ? "p-[16px_24px] flex flex-col"
                    : "p-[14px_16px] flex flex-col rounded-bl-[16px]"
                  }>
                    {/* Section label */}
                    <div className="text-[8px] uppercase tracking-[0.09em] font-semibold text-[#c9a89e] flex items-center gap-2 w-full mb-[10px] after:content-[''] after:h-[0.5px] after:bg-[#f0e8e0] after:flex-grow">
                      Last 7 days
                    </div>
                    
                    {/* Dot Calendar */}
                    {renderMiniCalendar(leftPanelDays)}

                    {/* Event Cards Stack */}
                    <div className="flex flex-col gap-1">
                      {leftEvents.map(ev => renderEventCard(ev, 'left'))}
                      {leftEvents.length === 0 && (
                        <div className="flex flex-col items-center justify-center p-6 py-8 border border-dashed border-[#e8d5cc]/60 rounded-xl bg-[#FFFDF9]/40 text-center my-1 select-none">
                          <div className="w-10 h-10 rounded-full bg-[#FAF1EF] text-[#7c3d3d]/50 flex items-center justify-center mb-2.5 font-serif italic text-sm font-semibold border border-[#e8d5cc]/30">
                            t-7
                          </div>
                          <span className="text-[11px] font-semibold text-[#3a1c14] tracking-wide">A quiet week behind</span>
                          <p className="text-[10px] text-stone-400 max-w-[190px] mt-1 leading-normal">
                            No activities, queries sent, or requests logged in the last seven days.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="bg-[#f0e8e0]" />

                  {/* RIGHT PANEL */}
                  <div className={isMagazineLayout
                    ? "p-[16px_24px] flex flex-col justify-between"
                    : "p-[14px_16px] flex flex-col justify-between rounded-br-[16px]"
                  }>
                    <div className="flex flex-col">
                      {/* Section label */}
                      <div className="text-[8px] uppercase tracking-[0.09em] font-semibold text-[#c9a89e] flex items-center gap-2 w-full mb-[10px] after:content-[''] after:h-[0.5px] after:bg-[#f0e8e0] after:flex-grow">
                        Coming up
                      </div>
                      
                      {/* Dot Calendar */}
                      {renderMiniCalendar(rightPanelDays)}

                      {/* Event Cards Stack */}
                      <div className="flex flex-col gap-1">
                        {rightEvents.map(ev => renderEventCard(ev, 'right'))}
                        {rightEvents.length === 0 && (
                          <div className="flex flex-col items-center justify-center p-6 py-8 border border-dashed border-[#e8d5cc]/60 rounded-xl bg-[#FFFDF9]/40 text-center my-1 select-none">
                            <div className="w-10 h-10 rounded-full bg-[#FAF1EF] text-[#7c3d3d]/50 flex items-center justify-center mb-2.5 font-serif italic text-sm font-semibold border border-[#e8d5cc]/30">
                              t+7
                            </div>
                            <span className="text-[11px] font-semibold text-[#3a1c14] tracking-wide">Clear horizon ahead</span>
                            <p className="text-[10px] text-stone-400 max-w-[190px] mt-1 leading-normal">
                              No deadlines or follow-up nudges scheduled for the upcoming week.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Open Full Calendar trigger */}
                    <div 
                      className="flex items-center gap-[4px] text-[10px] text-[#7c3d3d] font-medium cursor-pointer justify-end mt-[10px] hover:underline"
                      onClick={() => setIsFullCalendarOpen(true)}
                    >
                      <span>Open full calendar</span>
                      <ArrowRight className="w-2.5 h-2.5" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* RIGHT COLUMN: Chronological Timeline Sidebar */}
        <div 
          className={isMagazineLayout
            ? "flex flex-col bg-[#FAF8F5] border-l border-[#e8e0d8] h-full"
            : "flex flex-col"
          }
          style={isMagazineLayout ? { borderLeftWidth: '0.5px' } : { height: (leftColumnHeight && !isMobileLayout) ? `${leftColumnHeight}px` : 'auto' }}
        >
          {isMagazineLayout && (
            <div className="p-[20px] border-b border-[#e8e0d8] text-left" style={{ borderBottomWidth: '0.5px' }}>
              <div className="flex items-center justify-between mb-3 w-full">
                <span className="font-serif text-[11px] font-semibold uppercase tracking-wider text-[#3a1c14]">
                  Next up
                </span>
                <span className="bg-[#FAF1EF] border border-[#f2ddd5] text-[#7c3a2a] text-[9px] font-mono font-bold px-2 py-0.5 rounded-full leading-none">
                  {tasks.length} items
                </span>
              </div>
              {renderTasksSidebarWidget()}
            </div>
          )}

          {/* Chronological Timeline Sidebar section */}
          <div 
            className={isMagazineLayout
              ? "p-[20px] text-left flex-1 flex flex-col justify-between min-h-0 relative"
              : "relative border border-[#EBDCD3] border-t-[3.5px] border-t-[#7c3a2a] rounded-2xl p-5 pt-8 bg-white shadow-[0_4px_12px_rgba(58,28,20,0.03)] flex-1 flex flex-col justify-between transition-all duration-300 min-h-0 relative"
            }
          >
            {isMagazineLayout ? (
              <div className="flex items-center justify-between mb-4 w-full">
                <span className="font-serif text-[11px] font-semibold uppercase tracking-wider text-[#3a1c14]">
                  Timeline
                </span>
                <button
                  onClick={() => setIsCustomizerOpen(true)}
                  className="bg-white hover:bg-stone-50 text-[#7c3a2a] hover:text-[#5c2a1e] border border-[#e8e0d8] rounded-full px-2.5 py-1 shadow-3xs transition-all cursor-pointer flex items-center justify-center gap-1 text-[9px] font-mono font-bold uppercase select-none"
                  title="Customize ledger copy style rules"
                >
                  <Sparkles className="w-2.5 h-2.5 text-amber-500 animate-pulse" />
                  <span>AI Style</span>
                </button>
              </div>
            ) : (
              <>
                {/* Centered Overlap Pill Icon - brought to front with elevated z-30 */}
                <div className={`absolute -top-3.5 left-1/2 -translate-x-1/2 text-[10px] font-bold font-mono px-4 py-1.5 rounded-full uppercase shadow-sm tracking-widest z-30 transition-colors duration-300 border ${
                  timelineStyle === "journal" 
                    ? "bg-[#7c3a2a] text-white border-[#7c3a2a]/20" 
                    : timelineStyle === "bento" 
                      ? "bg-[#BA7517] text-[#FAF8F5] border-[#BA7517]/20" 
                      : "bg-stone-800 text-stone-200 border-stone-800"
                }`}>
                  Timeline
                </div>

                {/* AI Copy customizer trigger button */}
                <button
                  onClick={() => setIsCustomizerOpen(true)}
                  className="absolute -top-3.5 right-4 bg-white hover:bg-stone-50 text-[#7c3a2a] hover:text-[#5c2a1e] border border-[#EBDCD3] rounded-full px-3.5 py-1.5 shadow-xs transition-all cursor-pointer z-30 flex items-center justify-center gap-1.5 text-[9px] font-mono font-bold uppercase select-none active:scale-95 hover:shadow-sm"
                  title="Customize ledger copy style rules"
                >
                  <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
                  <span>AI Style</span>
                </button>
              </>
            )}

            {/* Chronological Vertical Feed Container */}
            <div 
              ref={timelineScrollRef}
              onScroll={handleTimelineScroll}
              className="flex-1 overflow-y-auto pr-1 scrollbar-thin space-y-6 pt-2 min-h-0"
              style={{
                maskImage: `linear-gradient(to bottom, ${
                  timelineScrollState.isAtTop ? "black 0%" : "transparent 0%, black 8%"
                }, ${
                  timelineScrollState.isAtBottom ? "black 100%" : "black 92%, transparent 100%"
                })`,
                WebkitMaskImage: `linear-gradient(to bottom, ${
                  timelineScrollState.isAtTop ? "black 0%" : "transparent 0%, black 8%"
                }, ${
                  timelineScrollState.isAtBottom ? "black 100%" : "black 92%, transparent 100%"
                })`
              }}
            >
              {chronologicalKeys.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-16 px-4 space-y-4 animate-fade-in">
                  <div className="w-12 h-12 bg-[#FAF1EF] border border-[#F2DDD5] text-[#9C6152] rounded-full flex items-center justify-center shadow-sm">
                    <Send className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-serif text-sm font-semibold text-[#3a1c14]">Quiet Desk</h4>
                    <p className="text-[11px] text-[#3a1c14]/60 leading-relaxed mt-1">
                      No recent transmissions, requests, or agent replies logged in your ledger yet.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  {chronologicalKeys.map((dateKey) => {
                    const formattedDateHeader = getDisplayDateHeader(dateKey);
                    const events = [...groupedEventsByDate[dateKey]].sort((a, b) => {
                      return new Date(b.date).getTime() - new Date(a.date).getTime();
                    });
                    
                    return (
                      <div key={dateKey} className="space-y-3.5">
                        {/* Chronological Date Header Group */}
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-mono font-bold tracking-widest text-[#7c3a2a] uppercase select-none">
                            {formattedDateHeader}
                          </span>
                          <div className="h-[1px] bg-[#EBDCD3]/70 flex-1" />
                        </div>

                        {/* List of elements for this group */}
                        <div className="space-y-3">
                          {events.map((act) => {
                            const q = queries.find(item => item.id === act.queryId);
                            const agent = q ? agents.find(ag => ag.id === q.agentId) : null;
                            const ms = manuscripts.find(m => m.id === act.manuscriptId) || manuscripts[0];
                            const msTitle = ms ? ms.title : "";
                            const formattedTime = getFormattedTime(act.date);
                            
                            const pillData = getPillLabelAndDot(act.description, act.activityType);
                            const showManuscriptPill = (() => {
                              const isAgentAct = act.activityType === ActivityType.AGENT_ADDED || act.activityType === ActivityType.AGENT_UPDATED;
                              if (isAgentAct) {
                                if (!pillData.key) return true;
                                const msShowVal = localStorage.getItem(`sc_custom_ms_show_${pillData.key}`);
                                return msShowVal !== "false";
                              }
                              if (!msTitle) return false;
                              if (!pillData.key) return true;
                              const msShowVal = localStorage.getItem(`sc_custom_ms_show_${pillData.key}`);
                              return msShowVal !== "false";
                            })();

                            const manuscriptPillContent = (() => {
                              if (!showManuscriptPill) return null;
                              const customLabel = pillData.key ? localStorage.getItem(`sc_custom_ms_label_${pillData.key}`) : null;
                              
                              let defaultTemplate = "{Manuscript Title}";
                              if (act.activityType === ActivityType.AGENT_ADDED || act.activityType === ActivityType.AGENT_UPDATED) {
                                defaultTemplate = "[agent full name] at [agency name]";
                              }
                              
                              const templateText = (customLabel && customLabel.trim()) ? customLabel : defaultTemplate;
                              const resolvedAgent = agent || extractAgentFromText(act.description);
                              
                              return replacePlaceholders(
                                templateText,
                                msTitle,
                                resolvedAgent ? { name: resolvedAgent.name, agency: resolvedAgent.agency } : null,
                                q,
                                act.details
                              );
                            })();

                            const { description: displayDesc, details: displayDetails } = getDynamicActivityText(
                              act,
                              pillData.key,
                              msTitle,
                              agent ? { name: agent.name, agency: agent.agency } : null,
                              q
                            );

                            const resolvedAgentForBold = agent || extractAgentFromText(act.description);
                            const boldedDesc = boldAgentAndAgencyInText(
                              displayDesc,
                              resolvedAgentForBold?.name,
                              resolvedAgentForBold?.agency
                            );

                            const displayPillLabel = replacePlaceholders(
                              pillData.label,
                              msTitle,
                              agent ? { name: agent.name, agency: agent.agency } : null,
                              q,
                              act.details
                            );

                            // Muted "desktop workspace" background colors (#FCFAF7 is actual desk background)
                            return (
                              <div 
                                key={act.id} 
                                onClick={() => {
                                  if (act.queryId) {
                                    setSelectedQueryIdForPanel(act.queryId);
                                    setIsQueryPanelOpen(true);
                                  } else {
                                    onNavigate("queries", act.description);
                                  }
                                }}
                                className="bg-[#FCFAF7] border border-[#EBDCD3]/70 rounded-xl p-3.5 hover:shadow-xs hover:border-[#7c3a2a]/30 transition-all cursor-pointer flex flex-col gap-1.5 animate-fade-in group font-sans"
                              >
                                {/* Top Line: Activity Type & Time stamp */}
                                <div className="flex items-center justify-between text-[9px] font-mono select-none">
                                  {pillData.show ? (
                                    pillData.key && {
                                      "queried": QueryStatus.QUERIED,
                                      "partial_req": QueryStatus.PARTIAL_REQUESTED,
                                      "partial_sent": QueryStatus.PARTIAL_SENT,
                                      "full_req": QueryStatus.FULL_REQUESTED,
                                      "full_sent": QueryStatus.FULL_SENT,
                                      "offer": QueryStatus.OFFER,
                                      "rr": QueryStatus.REVISE_RESUBMIT,
                                      "rejected": QueryStatus.REJECTED,
                                      "withdrawn": QueryStatus.WITHDRAWN,
                                      "no_response": QueryStatus.NO_RESPONSE
                                    }[pillData.key] ? (
                                      <StatusPill 
                                        status={{
                                          "queried": QueryStatus.QUERIED,
                                          "partial_req": QueryStatus.PARTIAL_REQUESTED,
                                          "partial_sent": QueryStatus.PARTIAL_SENT,
                                          "full_req": QueryStatus.FULL_REQUESTED,
                                          "full_sent": QueryStatus.FULL_SENT,
                                          "offer": QueryStatus.OFFER,
                                          "rr": QueryStatus.REVISE_RESUBMIT,
                                          "rejected": QueryStatus.REJECTED,
                                          "withdrawn": QueryStatus.WITHDRAWN,
                                          "no_response": QueryStatus.NO_RESPONSE
                                        }[pillData.key]!} 
                                        customLabel={displayPillLabel} 
                                        size="sm" 
                                      />
                                    ) : (
                                      <span 
                                        className="font-bold uppercase tracking-wider border rounded-md px-2 py-0.5 inline-flex items-center gap-1.5"
                                        style={{
                                          backgroundColor: 'var(--color-background-secondary, rgb(245 245 244))',
                                          color: 'var(--color-text-secondary, rgb(120 113 108))',
                                          borderColor: 'rgba(120, 113, 108, 0.15)'
                                        }}
                                      >
                                        {pillData.dot}
                                        {formatRichText(displayPillLabel)}
                                      </span>
                                    )
                                  ) : <span />}
                                  <span className="text-stone-400 font-medium">
                                    {formattedTime}
                                  </span>
                                </div>

                                {/* Second Line: Description */}
                                <div className="min-w-0 flex flex-col gap-1">
                                  <h4 className="font-serif text-[13px] text-[#3a1c14] font-normal tracking-tight leading-snug group-hover:text-[#7c3a2a] transition-all">
                                    {formatRichText(boldedDesc)}
                                  </h4>
                                  {displayDetails && (
                                    <p className="text-[11px] text-stone-500 font-sans leading-relaxed">
                                      {formatRichText(displayDetails)}
                                    </p>
                                  )}
                                  {manuscriptPillContent && (
                                    <div className="flex mt-1">
                                      <span className="inline-block text-[10px] text-[#7c3a2a] bg-[#FAF1EF] font-semibold px-2 py-0.5 rounded-full border border-[#F2DDD5]/40 shadow-2xs">
                                        {formatRichText(manuscriptPillContent)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Smart ledger footer display */}
            <div className="p-3 bg-[#FAF1EF]/30 border-t border-[#EBDCD3]/60 text-[10.5px] font-serif italic text-stone-500 text-center select-none mt-4 rounded-b-xl">
              "Every great voice was once a stack of letters."
            </div>
          </div>
        </div>

      </div>

      {/* ======================================================== */}
      {/* FULL-WIDTH PRO UPGRADE DESIGN CHOOSE ARENA */}
      {/* ======================================================== */}
      <div className="w-full max-w-none px-4 md:px-10 lg:px-14 xl:px-16 mt-12 space-y-6 pb-12">
        <div className="relative border-t border-[#7c3a2a]/15 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-3">
            <div>
              <span className="text-[10px] font-mono tracking-widest font-bold text-[#BA7517] uppercase bg-amber-50 border border-amber-200/50 rounded-full px-2.5 py-0.5 select-none animate-pulse">
                Design Palette Options
              </span>
              <h3 className="text-xl font-serif font-bold text-[#3a1c14] tracking-tight mt-1.5">
                "Upgrade to Pro" Banner Layout Formats
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed font-light font-sans">
                Review three highly customized style options prepared below. Each option spans the full width of the container, completing your workspace deck.
              </p>
            </div>
            
            {/* Design system badge */}
            <span className="text-[10px] font-mono text-stone-400 uppercase tracking-wider select-none font-bold">
              SYSTEM CHANNELS V1.2 // PERSISTENT
            </span>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {/* FORMAT 1: CLASSIC EDITORIAL LITERARY BANNER */}
            <div className="bg-white border-y-4 border-double border-[#7c3a2a]/30 p-8 flex flex-col md:flex-row justify-between items-center gap-6 shadow-xs relative overflow-hidden text-left" id="pro-banner-editorial">
              <div className="space-y-2 max-w-3xl">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#7c3a2a]" />
                  <span className="text-[9px] font-mono font-bold tracking-widest text-[#7c3a2a] uppercase">FORMAT #1 // CLASSIC LITERARY MASTHEAD</span>
                </div>
                <h4 className="text-xl md:text-2xl font-serif text-[#3a1c14] tracking-tight uppercase leading-none">
                  Acquire Professional Representation with <span className="font-bold text-[#7c3a2a]">ScriptAlly Pro</span>
                </h4>
                <p className="text-xs text-stone-600 font-light leading-relaxed max-w-2xl font-serif italic">
                  Gain access to unlimited dispatches, track multiple agency branches in tandem, store nested manuscript revisions, and unlock live editor response forecasting metrics.
                </p>
              </div>

              <div className="shrink-0 flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                <button className="w-full md:w-auto bg-[#7c3a2a] hover:bg-[#632e22] text-white font-serif font-semibold py-3 px-6 rounded-lg text-xs transition-colors tracking-tight shadow-xs cursor-pointer text-center">
                  Unlock Representative Suite &rarr;
                </button>
                <span className="text-[10px] font-mono font-bold text-[#7c3a2a]/60 tracking-wider">£12 / MONTH</span>
              </div>
            </div>

            {/* FORMAT 2: COSMIC GOLDEN GLIMMER (LUXURY GRADIENT) */}
            <div className="bg-gradient-to-r from-stone-900 via-stone-950 to-[#2A1C16] border border-amber-500/20 rounded-2xl p-8 flex flex-col md:flex-row justify-between items-center gap-6 shadow-md relative overflow-hidden text-left" id="pro-banner-glimmer">
              {/* Absolutes for elegant styling background hints */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
              
              <div className="space-y-3 max-w-3xl relative z-10">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  <span className="text-[9.5px] font-mono font-bold tracking-widest text-amber-400 uppercase">FORMAT #2 // PREMIUM COSMIC GLIMMER</span>
                </div>
                <h4 className="text-2xl font-serif text-white tracking-tight">
                  Elevate your draft into a <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-300 to-amber-500 font-bold">masterpiece</span>
                </h4>
                <p className="text-xs text-stone-300 font-light leading-relaxed max-w-2xl">
                  ScriptAlly Pro translates agent feedback matching into actionable revisions automatically. Enjoy our smart query generator, daily submission alerts, and real-time wish list scanning.
                </p>
              </div>

              <div className="shrink-0 relative z-10 w-full md:w-auto">
                <button className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-stone-950 font-bold rounded-xl text-xs transition-colors shadow-md transform hover:-translate-y-0.5 cursor-pointer text-center">
                  Go Pro for £12/mo
                </button>
              </div>
            </div>

            {/* FORMAT 3: MINIMALIST MONOSPACE TECH RAIL */}
            <div className="bg-[#FAF1EF]/30 border border-[#EBDCD3] rounded-xl p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center text-left" id="pro-banner-tech">
              <div className="md:col-span-8 space-y-3 font-mono">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-stone-300" />
                  <span className="text-[9px] font-bold tracking-widest text-[#3a1c14] uppercase">FORMAT #3 // MONOSPACE TECH RAIL</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-6 pt-1 text-[10.5px] text-stone-500 font-mono">
                  <div className="space-y-1">
                    <span className="text-[8px] font-bold text-stone-400 uppercase block">MULTIPLE MANUSCRIPTS</span>
                    <span className="text-[#3a1c14]/90 font-bold block">UNLIMITED ACTIVE [PRO_TIER]</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[8px] font-bold text-stone-400 uppercase block">MSWL SCANS RADAR</span>
                    <span className="text-[#BA7517] font-bold block bg-[#BA7517]/5 border border-[#BA7517]/10 px-1 py-0.5 rounded text-center inline-block">REAL-TIME [BETA_MATCHED]</span>
                  </div>
                  <div className="space-y-1 col-span-2 sm:col-span-1">
                    <span className="text-[8px] font-bold text-stone-400 uppercase block">API INTEGRATIONS</span>
                    <span className="text-[#3a1c14]/90 font-bold block">FULL-SYNC OUTBOX [READY]</span>
                  </div>
                </div>
              </div>

              <div className="md:col-span-4 flex justify-end w-full col-span-1">
                <button className="w-full bg-[#3a1c14] hover:bg-[#200f0a] text-stone-150 font-mono font-bold py-3 px-6 rounded-lg text-xs tracking-wider transition-all cursor-pointer text-center border border-stone-800">
                  UPGRADE_SYS_TO_PRO // £12_MO
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Slide-In Tasks Panel (Part 3) */}
      <AnimatePresence>
        {isTasksPanelOpen && (
          <div className="fixed inset-0 z-50">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTasksPanelOpen(false)}
              className="fixed inset-0 bg-stone-950/40 backdrop-blur-xs cursor-pointer"
            />

            {/* Slide-in panel */}
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.3 }}
              className="fixed top-0 right-0 h-full w-full sm:max-w-[420px] sm:w-[420px] bg-[#F5F0EA] shadow-2xl flex flex-col text-left border-l border-[#EBDCD3]/40"
            >
              {/* Header */}
              <div className="bg-[#3a1c14] p-5 relative text-left select-none shrink-0">
                <span className="text-[10px] font-mono tracking-widest uppercase font-bold text-white/50 block mb-1">
                  Dashboard
                </span>
                <h2 className="text-xl font-serif font-bold text-[#F8F5F0]">
                  Your tasks
                </h2>
                <p className="text-xs text-white/55 font-sans mt-0.5">
                  {tasks.length} {tasks.length === 1 ? 'item needs' : 'items need'} attention
                </p>
                <button 
                  onClick={() => setIsTasksPanelOpen(false)}
                  className="absolute top-5 right-5 p-1 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Close panel"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Container */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                <AnimatePresence initial={false}>
                  {(() => {
                    const urgentList = tasks.filter(t => t.priority === "urgent" || ["offer_received", "partial_requested", "full_requested", "revise_resubmit"].includes(t.taskType));
                    const overdueList = tasks.filter(t => t.priority === "overdue" || t.taskType === "nudge_overdue" || t.taskType === "response_overdue");
                    const suggestedList = tasks.filter(t => t.priority === "suggested" || ["dream_agent_unqueried", "data_quality_poor", "no_response_close"].includes(t.taskType));

                    return (
                      <>
                        {/* Urgent section */}
                        {urgentList.length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-1.5 text-[#3a1c14] font-bold text-[10px] uppercase tracking-wider mb-2 select-none">
                              <AlertCircle className="w-4 h-4 text-[#3a1c14]" />
                              <span>Urgent</span>
                            </div>
                            <div className="flex flex-col gap-3">
                              {urgentList.map(t => (
                                <TaskPanelCard 
                                  key={t.id} 
                                  task={t} 
                                  onNavigate={onNavigate} 
                                  dismissTask={dismissTask} 
                                  onClosePanel={() => setIsTasksPanelOpen(false)} 
                                  onOpenQuery={(qId) => {
                                    setSelectedQueryIdForPanel(qId);
                                    setIsQueryPanelOpen(true);
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Overdue section */}
                        {overdueList.length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-1.5 text-[#C4706A] font-bold text-[10px] uppercase tracking-wider mb-2 select-none">
                              <Clock className="w-4 h-4 text-[#C4706A]" />
                              <span>Overdue</span>
                            </div>
                            <div className="flex flex-col gap-3">
                              {overdueList.map(t => (
                                <TaskPanelCard 
                                  key={t.id} 
                                  task={t} 
                                  onNavigate={onNavigate} 
                                  dismissTask={dismissTask} 
                                  onClosePanel={() => setIsTasksPanelOpen(false)} 
                                  onOpenQuery={(qId) => {
                                    setSelectedQueryIdForPanel(qId);
                                    setIsQueryPanelOpen(true);
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Suggested section */}
                        {suggestedList.length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-1.5 text-[#C4A882] font-bold text-[10px] uppercase tracking-wider mb-2 select-none">
                              <Lightbulb className="w-4 h-4 text-[#C4A882]" />
                              <span>Suggested</span>
                            </div>
                            <div className="flex flex-col gap-3">
                              {suggestedList.map(t => (
                                <TaskPanelCard 
                                  key={t.id} 
                                  task={t} 
                                  onNavigate={onNavigate} 
                                  dismissTask={dismissTask} 
                                  onClosePanel={() => setIsTasksPanelOpen(false)} 
                                  onOpenQuery={(qId) => {
                                    setSelectedQueryIdForPanel(qId);
                                    setIsQueryPanelOpen(true);
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI Activity Copy Customizer Modal */}
      <ActivityCopyCustomizer 
        isOpen={isCustomizerOpen} 
        onClose={() => setIsCustomizerOpen(false)} 
      />

      {/* Query Slide-in panel */}
      <QuerySlideInPanel
        isOpen={isQueryPanelOpen}
        onClose={() => {
          setIsQueryPanelOpen(false);
          setSelectedQueryIdForPanel(null);
        }}
        queryId={selectedQueryIdForPanel}
        onNavigate={onNavigate}
        onSaveStatusChange={handleSaveStatusChange}
        onActivityDeleted={() => {
          console.log("Timeline activity record successfully deleted.");
        }}
      />

      {/* Undo Success Status Toast overlay */}
      <AnimatePresence>
        {undoToastInfo && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-100 bg-white border border-[#EBDCD3] rounded-2xl p-4 shadow-xl flex items-center gap-4 max-w-sm select-none font-sans"
          >
            <div className="flex-1 min-w-0 text-left">
              <h5 className="text-xs font-bold text-[#3a1c14] leading-snug">
                Status updated to {undoToastInfo.newStatus}
              </h5>
              <p className="text-[10.5px] text-[#7c3a2a] mt-0.5 truncate font-medium">
                Agent • {undoToastInfo.agentName}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {/* SVG Ring Timer */}
              <div className="relative w-7 h-7 flex items-center justify-center shrink-0">
                <svg className="w-7 h-7 transform -rotate-90">
                  <circle
                    cx="14"
                    cy="14"
                    r="11"
                    stroke="#eae5e0"
                    strokeWidth="2.5"
                    fill="transparent"
                  />
                  <circle
                    cx="14"
                    cy="14"
                    r="11"
                    stroke="#D97706"
                    strokeWidth="2.5"
                    fill="transparent"
                    strokeDasharray="69.1"
                    strokeDashoffset={(69.1 * (10 - undoToastTimer)) / 10}
                    className="transition-all duration-1000 ease-linear"
                  />
                </svg>
                <span className="absolute text-[10px] font-bold text-amber-700 font-mono">
                  {undoToastTimer}
                </span>
              </div>

              {/* Red-accent Undo Trigger Button */}
              <button
                onClick={async () => {
                  try {
                    await undoQueryStatus(
                      undoToastInfo.queryId, 
                      undoToastInfo.previousStatus, 
                      undoToastInfo.newStatus
                    );
                    setUndoToastInfo(null);
                  } catch (e) {
                    console.error("Undo status change failed:", e);
                  }
                }}
                className="px-2.5 py-1.5 text-[10px] font-bold text-[#7c3a2a] hover:bg-[#FAF1EF] border border-[#EBDCD3] rounded-lg transition-all cursor-pointer shadow-3xs"
              >
                Undo
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Calendar Modal Lightbox Overlay */}
      {isFullCalendarOpen && (
        <div className="fixed inset-0 bg-[#3a1c14]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#FCFAF7] rounded-2xl border border-[#e8d5cc] p-6 shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative flex flex-col gap-4 animate-fade-in">
            <button 
              className="absolute top-4 right-4 text-stone-500 hover:text-stone-800 p-1 rounded-full hover:bg-[#FAF1EF] transition-colors"
              onClick={() => setIsFullCalendarOpen(false)}
            >
              <X className="w-5 h-5 text-[#3a1c14]" />
            </button>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#7c3d3d]" />
              <h3 className="text-sm font-bold uppercase font-mono tracking-wider text-[#3a1c14]">Full Query Calendar</h3>
            </div>
            <div className="overflow-hidden rounded-xl border border-[#e8d5cc] bg-white p-2">
              <CalendarView onNavigate={(tab, sub) => {
                setIsFullCalendarOpen(false);
                onNavigate(tab, sub);
              }} isDashboard={false} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
