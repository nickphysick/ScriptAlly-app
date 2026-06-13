/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useScriptAllyDb } from "../lib/db";
import { UserPlan, QueryStatus, ManuscriptStatus, ActivityType, Query, Task, CommunityAgent, Manuscript } from "../types";
import { manuscriptGenres } from "../lib/manuscripts";
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
import { RecordResponseModal } from "./RecordResponseModal";
import { recordQueryResponse } from "../lib/recordResponse";
import { CalendarView } from "./CalendarView";
import { StatusPill } from "./StatusPill";
import { StatusDot } from "./StatusDot";
import {
  pageGround,
  bodyInk,
  PAGE_GRAIN,
  sageBandGradient,
  sageBandRule,
  sageText,
  headingInk,
  labelStyle,
  labelColor,
  burgundy,
  parchment,
  hairline,
  mutedInk,
  FONT_SERIF,
  FONT_MONO,
  FONT_SANS,
  buttonPinkBg,
  buttonPinkBorder,
  ghostButtonText,
  PAPER_TEXTURE,
  mountShadow,
  insetBorder,
} from "../lib/designTokens";
import { MountCard } from "./MountCard";
import { HeroCard } from "./dashboard/HeroCard";
import { OverToYou } from "./dashboard/OverToYou";
import { StatCards } from "./dashboard/StatCards";
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
          return <strong key={i} style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 500, color: "#7c3a2a" }}>{content}</strong>;
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

/**
 * Activity-feed mark for a timeline row. Status-bearing events render the canonical
 * StatusDot; non-status events (nudges, agent/manuscript updates) keep small neutral marks.
 */
const renderTimelineDot = (label: string, resultingStatus?: QueryStatus) => {
  if (resultingStatus) {
    return <StatusDot status={resultingStatus} size={13} />;
  }

  const LABEL_TO_STATUS: Record<string, QueryStatus> = {
    "Query sent": QueryStatus.QUERIED,
    "Partial requested": QueryStatus.PARTIAL_REQUESTED,
    "Partial sent": QueryStatus.PARTIAL_SENT,
    "Full requested": QueryStatus.FULL_REQUESTED,
    "Full sent": QueryStatus.FULL_SENT,
    "Materials sent": QueryStatus.PARTIAL_SENT,
    "Offer received": QueryStatus.OFFER,
    "Revise & resubmit": QueryStatus.REVISE_RESUBMIT,
    "Rejection": QueryStatus.REJECTED,
    "Withdrawn": QueryStatus.WITHDRAWN,
  };
  const mapped = LABEL_TO_STATUS[label];
  if (mapped) {
    return <StatusDot status={mapped} size={13} />;
  }

  if (label === "Nudge sent") {
    return (
      <svg width="13" height="13" viewBox="0 0 40 40" className="shrink-0 text-[#7c3a2a]">
        <circle cx="20" cy="20" r="17" stroke="currentColor" strokeWidth="3.5" fill="#ffffff" />
        <path d="M 20,11 L 20,20 L 26,20" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    );
  }
  if (label === "Now open" || label === "Ready to query") {
    return (
      <svg width="13" height="13" viewBox="0 0 40 40" className="shrink-0 text-[#8a9e88]">
        <circle cx="20" cy="20" r="17" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (label === "Now closed" || label === "Shelved") {
    return (
      <svg width="13" height="13" viewBox="0 0 40 40" className="shrink-0 text-[#cfc6bb]">
        <circle cx="20" cy="20" r="17" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  // fallback neutral mark ("Status changed", agent/manuscript events)
  return (
    <svg width="13" height="13" viewBox="0 0 40 40" className="shrink-0 text-[#7c3a2a]">
      <circle cx="20" cy="20" r="17" stroke="currentColor" strokeWidth="3.5" fill="#ffffff" />
    </svg>
  );
};

const getPillLabelAndDot = (desc: string, activityType?: ActivityType, resultingStatus?: QueryStatus) => {
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
  const dot = renderTimelineDot(defaultLabel, resultingStatus);

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
    if (priority === "urgent") return "#7c3a2a";
    if (priority === "overdue") return "#a86a52";
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
        isUrgent ? "bg-[#fff3ed] border-[#eed6c8]" : "bg-white border-[#EBDCD3]"
      }`}
    >
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
                  title="Snooze"
                  aria-label="Snooze"
                  className="text-stone-500 hover:text-[#7c3a2a] transition-colors cursor-pointer flex items-center justify-center hover:bg-[#FAF1EF] w-7 h-7 rounded-lg shrink-0"
                >
                  <Clock className="w-3.5 h-3.5" />
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
                title="Dismiss"
                aria-label="Dismiss"
                className="text-stone-500 hover:text-[#7c3a2a] transition-colors cursor-pointer flex items-center justify-center hover:bg-[#FAF1EF] w-7 h-7 rounded-lg shrink-0"
              >
                <X className="w-3.5 h-3.5" />
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
              title="Dismiss"
              aria-label="Dismiss"
              className="text-stone-500 hover:text-[#7c3a2a] transition-colors cursor-pointer flex items-center justify-center hover:bg-[#FAF1EF] w-7 h-7 rounded-lg shrink-0"
            >
              <X className="w-3.5 h-3.5" />
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
              title="Dismiss"
              aria-label="Dismiss"
              className="text-stone-500 hover:text-[#7c3a2a] transition-colors cursor-pointer flex items-center justify-center hover:bg-[#FAF1EF] w-7 h-7 rounded-lg shrink-0"
            >
              <X className="w-3.5 h-3.5" />
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
    if (!currentUser?.id) {
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
    /** Unified revert from recordQueryResponse(); when present, the Undo button uses this. */
    undoFn?: () => Promise<void>;
  } | null>(null);
  const [undoToastTimer, setUndoToastTimer] = useState<number>(10);

  // Drives the unified RecordResponseModal launched from the query slide-in panel.
  const [recordResponseQueryId, setRecordResponseQueryId] = useState<string | null>(null);

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


  const [hoveredAgentId, setHoveredAgentId] = useState<string | null>(null);
  const [radarToast, setRadarToast] = useState<string | null>(null);
  const [selectedManuscriptId, setSelectedManuscriptId] = useState<string | null>(null);
  const [lowerDeckStyle, setLowerDeckStyle] = useState<"radar" | "minimalist" | "funnel" | "wall" | "studio">("radar");

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
        try {
          await updateDoc(doc(db, "communityAgents", match.agent.id), {
            contributedByCount: increment(1)
          });
        } catch (countErr) {
          console.error("Failed to increment contributedByCount in Firestore:", countErr);
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
    const genresClean = (commAgent.genres || []).map(g => g.trim().toLowerCase());

    // Score one manuscript genre string against the agent's genres: exact compound match = 20,
    // partial compound = 15 (≥2 components) / 8 (1 component), single-word exact = 20, else 0.
    const scoreOneGenre = (raw: string): number => {
      const gRaw = (raw || "").trim();
      if (!gRaw) return 0;
      const gLower = gRaw.toLowerCase();
      const components = gRaw.split(/\s+/).filter(w => w.length > 0);
      if (components.length > 1) {
        if (genresClean.includes(gLower)) return 20;
        const matchCount = components.filter(c => {
          const cLower = c.toLowerCase();
          return genresClean.some(g => g === cLower || g.includes(cLower));
        }).length;
        if (matchCount >= 2) return 15;
        if (matchCount === 1) return 8;
        return 0;
      }
      return genresClean.includes(gLower) ? 20 : 0;
    };

    // Read the manuscript's primary genre PLUS any sub-genres; take the best-scoring match.
    const genreScore = Math.max(0, ...manuscriptGenres(ms).map(scoreOneGenre));
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

  const nowTime = new Date().getTime();
  const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

  // Calculate dynamic counts for each of the 8 bins (W7 down to Now)
  const dynamicQueriesSentPerWeek = [0, 0, 0, 0, 0, 0, 0, 0];
  
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

    // "Responses Received" = queries where the agent has actually acted, via the derived
    // hasAgentResponded flag (written by recomputeQuery from the activity log). Boolean per
    // query, so each query counts at most once regardless of pipeline stage. Un-migrated docs
    // (flag not yet computed) fall back to the old status-set check until their first recompute.
    const LEGACY_RESPONSE_STATUSES = [
      QueryStatus.PARTIAL_REQUESTED,
      QueryStatus.PARTIAL_SENT,
      QueryStatus.FULL_REQUESTED,
      QueryStatus.FULL_SENT,
      QueryStatus.REVISE_RESUBMIT,
      QueryStatus.OFFER,
      QueryStatus.REJECTED,
    ];

    const totalResponsesCalc = queries.filter(q =>
      q.hasAgentResponded !== undefined
        ? q.hasAgentResponded
        : LEGACY_RESPONSE_STATUSES.includes(q.status)
    ).length;

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

  const totalSentCalc = totalQueriesSent;
  
  const responsesReceived = totalResponsesCalc;

  const totalQueries = queries.length;

  const responseRatePercent = totalQueries > 0
    ? Math.round((responsesReceived / totalQueries) * 100)
    : 0;

  // Group activities/events for Timeline
  const mergedActivities = useMemo(() => {
    // Single source of truth: the global `activities` collection. We deliberately no longer merge
    // the legacy top-level `activity` feed (timelineItems). recordQueryResponse no longer writes
    // that feed, and merging the two collections — which were de-duped only by document id —
    // produced two rows for a single recorded response (e.g. "Query rejected…" + "Rejection
    // received from …"). Reading one store keeps every recorded event on the dashboard exactly once.
    const seen = new Set<string>();
    return [...activities].filter(item => {
      if (!item.id || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [activities]);

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
  }, [chronologicalKeys.join(',')]);

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

  const renderMagazinePipelineBuckets = () => {
    const queriedCount = queries.filter(q => q.status === QueryStatus.QUERIED).length;
    const partReqCount = queries.filter(q => q.status === QueryStatus.PARTIAL_REQUESTED).length;
    const partSentCount = queries.filter(q => q.status === QueryStatus.PARTIAL_SENT).length;
    const fullReqCount = queries.filter(q => q.status === QueryStatus.FULL_REQUESTED).length;
    const fullSentCount = queries.filter(q => q.status === QueryStatus.FULL_SENT).length;
    const offerCount = queries.filter(q => q.status === QueryStatus.OFFER).length;
    const closedCount = queries.filter(q => [QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE].includes(q.status)).length;

    const stagesData = [
      { name: "Queried", count: queriedCount, status: QueryStatus.QUERIED },
      { name: "Partial requested", count: partReqCount, status: QueryStatus.PARTIAL_REQUESTED },
      { name: "Partial sent", count: partSentCount, status: QueryStatus.PARTIAL_SENT },
      { name: "Full requested", count: fullReqCount, status: QueryStatus.FULL_REQUESTED },
      { name: "Full sent", count: fullSentCount, status: QueryStatus.FULL_SENT },
      { name: "Offer", count: offerCount, status: QueryStatus.OFFER },
      { name: "Closed", count: closedCount, status: QueryStatus.REJECTED }
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
              {/* canonical status glyph anchoring the bucket */}
              <div className="absolute bottom-2 right-2.5">
                <StatusDot status={st.status} size={13} />
              </div>
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
    <div
      className="min-h-screen pb-16 font-sans"
      style={{ background: pageGround, color: bodyInk }}
    >
      {/* Fixed page grain - sits over the kraft ground, under the positioned cards */}
      <div
        aria-hidden="true"
        style={{ position: "fixed", inset: 0, opacity: 0.25, pointerEvents: "none", zIndex: 0, backgroundImage: PAGE_GRAIN }}
      />
      
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
          background: '#ffffff',
          color: '#6a5a50',
          border: '0.5px solid #e0d5c8',
          borderRadius: 9,
          padding: '6px 12px',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          letterSpacing: '0.05em',
          cursor: 'pointer',
          opacity: 0.75,
          boxShadow: '0 1px 3px rgba(58,28,20,0.08)'
        }}
        className="hover:opacity-100 transition-opacity select-none"
      >
        Switch layout
      </button>

      {/* ── Guided empty state for brand-new users ── */}
      {manuscripts.length === 0 && queries.length === 0 && agents.length === 0 && (
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px" }}>
          {/* Welcome card */}
          <div style={{
            background: parchment,
            backgroundImage: PAPER_TEXTURE,
            borderLeft: "4px solid #7c3a2a",
            borderRadius: 14,
            boxShadow: mountShadow,
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
            background: parchment,
            backgroundImage: PAPER_TEXTURE,
            borderRadius: 14,
            boxShadow: mountShadow,
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
                background: "rgba(253,250,245,0.6)",
                border: "1px dashed rgba(124,58,42,0.25)",
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
        /* ============ TOP ROW: hero + stat cards (left) · Over to you (right) ============ */
        <div className="w-full max-w-none px-4 md:px-10 lg:px-14 xl:px-16 pt-2">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-[14px] items-stretch">
            {/* Left: hero stacked above the four stat cards (shares the pipeline's width) */}
            <div className="flex flex-col gap-[14px]">
              <HeroCard
                firstName={getUserFirstName()}
                quote={quote}
                onSendQuery={() => onNavigate("queries", "Send a query")}
                onAddAgent={() => onNavigate("agents", "Add an agent")}
                onAddManuscript={() => onNavigate("manuscripts", "Add a manuscript")}
              />
              <StatCards
                queriesSentTotal={totalQueriesSent}
                sentPerWeek={finalQueriesSentPerWeek.slice(1)}
                sentThisWeek={finalQueriesSentPerWeek[7] ?? 0}
                activeCount={activeQueries.length}
                activePerWeek={finalActiveQueriesPerWeek.slice(1)}
                activeDiff={activeDiff}
                agentsTotal={totalAgentsCount}
                agentsIdle={notQueriedAgentsCount}
                agentQueriedFlags={sortedDisplayAgents.map((a) => queries.some((q) => q.agentId === a.id))}
                responsesTotal={responsesReceived}
                responseRatePct={responseRatePercent}
              />
            </div>
            {/* Right: Over to you — stretches to fill the hero + stat-cards height */}
            <OverToYou
              tasks={tasks}
              queries={queries}
              agents={agents}
              onAction={(task) => onNavigate(task.actionPath, task.title)}
              onSnooze={(task) => dismissTask(task.taskType, task.relatedRecordId, "fixed snooze", 3)}
              onDismiss={(task) => dismissTask(task.taskType, task.relatedRecordId, "permanent")}
              onAllTasks={() => setIsTasksPanelOpen(true)}
              onOpenQuery={(qid) => {
                setSelectedQueryIdForPanel(qid);
                setIsQueryPanelOpen(true);
              }}
            />
          </div>
        </div>
      )}

      {/* ============ LOWER ROW: pipeline (left) · timeline (right) ============ */}
      <div className={isMagazineLayout
        ? "grid grid-cols-1 lg:grid-cols-[1.8fr_1.1fr] xl:grid-cols-[2fr_1fr] gap-0 bg-[#FAF8F5] border-t border-[#e8e0d8] items-stretch"
        : "w-full max-w-none px-4 md:px-10 lg:px-14 xl:px-16 pt-[14px] grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-[14px] items-start"
      }>
        
        {/* LEFT COLUMN: Stat Cards & Pipeline Matrix */}
        <div ref={leftColumnRef} className={isMagazineLayout ? "flex flex-col gap-0" : "flex flex-col gap-[14px]"}>
          
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
          {(() => {
            // One hoverable canonical dot per query (StatusDot is the only glyph source)
            const renderIndividualQueryDot = (
              q: Query,
              stage: 'queried' | 'part_req' | 'part_sent' | 'full_req' | 'full_sent' | 'offer' | 'closed'
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

              return (
                <div
                  key={q.id}
                  className="relative group/dot inline-flex items-center justify-center select-none transition-all duration-300 hover:scale-130 hover:z-10 cursor-pointer"
                  style={{ width: 13, height: 13 }}
                >
                  <StatusDot status={q.status} size={13} />

                  {/* Hover tooltip — parchment, token system */}
                  <div
                    className="invisible group-hover/dot:visible opacity-0 group-hover/dot:opacity-100 absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-3 text-left pointer-events-none transition-all duration-200"
                    style={{
                      background: "#fdfaf5",
                      border: "0.5px solid #e0d5c8",
                      borderRadius: 10,
                      boxShadow: "0 6px 20px rgba(58,28,20,0.14)",
                      fontSize: 11,
                    }}
                  >
                    <div className="truncate" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 500, color: "#3a1c14" }}>{agent?.name || "Unknown Agent"}</div>
                    <div className="truncate" style={{ fontSize: 10, color: "#8a7a6c" }}>{agent?.agency || "Independent"}</div>
                    <div style={{ height: 0.5, background: "#ece0d2", margin: "6px 0" }} />
                    <div className="flex justify-between gap-2" style={{ fontSize: 10, color: "#6a5a50" }}>
                      <span>Status:</span>
                      <span style={{ fontWeight: 500, color: "#7c3a2a" }}>{q.status}</span>
                    </div>
                    <div className="flex justify-between gap-2 mt-0.5" style={{ fontSize: 10, color: "#6a5a50" }}>
                      <span>{dateLabel}:</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "#9c8878" }}>{displayDate}</span>
                    </div>
                  </div>
                </div>
              );
            };

            const renderStageColumn = (list: Query[], stageKey: 'queried' | 'part_req' | 'part_sent' | 'full_req' | 'full_sent' | 'offer' | 'closed') => {
              if (list.length === 0) {
                return (
                  <div className="flex items-center justify-center" style={{ minHeight: 26 }}>
                    <span className="select-none" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#b8a898" }}>–</span>
                  </div>
                );
              }
              return (
                <div className="flex items-center justify-center" style={{ minHeight: 26 }}>
                  <div className="flex flex-row flex-wrap items-center justify-center max-w-full" style={{ gap: 4 }}>
                    {list.map((q) => renderIndividualQueryDot(q, stageKey))}
                  </div>
                </div>
              );
            };

            const splitByStage = (m: Manuscript) => {
              const mQueries = queries.filter(q => q.manuscriptId === m.id);
              return {
                qQueried: mQueries.filter(q => q.status === QueryStatus.QUERIED),
                qPartReq: mQueries.filter(q => q.status === QueryStatus.PARTIAL_REQUESTED),
                qPartSent: mQueries.filter(q => q.status === QueryStatus.PARTIAL_SENT),
                qFullReq: mQueries.filter(q => q.status === QueryStatus.FULL_REQUESTED),
                qFullSent: mQueries.filter(q => q.status === QueryStatus.FULL_SENT),
                qOffer: mQueries.filter(q => q.status === QueryStatus.OFFER),
                qClosed: mQueries.filter(q =>
                  [QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE, QueryStatus.REVISE_RESUBMIT].includes(q.status)
                ),
              };
            };

            if (isMagazineLayout) {
              return (
                <div className="bg-white border-b border-[#e8e0d8] p-[20px_24px] relative transition-all duration-300" id="query-status-breakdown-card" style={{ borderBottomWidth: '0.5px' }}>
                  <div className="flex flex-col w-full">
                    <div className="flex items-center justify-between mb-[14px]">
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#3a1c14' }} className="font-serif uppercase tracking-wider">
                        Your querying pipeline
                      </span>
                      <span style={{ fontSize: '10px', color: '#c9a89e' }} className="font-sans font-medium">
                        {manuscripts.filter(m => queries.some(q => q.manuscriptId === m.id)).length} manuscripts · {queries.length} queries
                      </span>
                    </div>
                    {renderMagazinePipelineBuckets()}
                    <div className="border-b border-[#e8e0d8] pb-2 mb-2 flex items-center text-[10px] uppercase font-semibold text-[#c9a89e] tracking-wider select-none mt-4">
                      <div className="w-[240px] shrink-0 text-left">Manuscript</div>
                      <div className="flex-grow grid grid-cols-7 gap-2 text-center text-[9px] font-sans">
                        <div>Queried</div><div>Part Req</div><div>Part Sent</div><div>Full Req</div><div>Full Sent</div><div>Offer</div><div>Closed</div>
                      </div>
                    </div>
                  </div>
                  {manuscripts.map((m) => {
                    const st = splitByStage(m);
                    return (
                      <div key={m.id} className="flex items-center px-0 py-3 bg-white border-b border-[#e8e0d8]/50 transition-colors duration-200">
                        <div className="w-[240px] shrink-0 text-left pr-4">
                          <p className="font-serif text-[13px] font-semibold text-[#3a1c14] leading-tight truncate" title={m.title}>{m.title}</p>
                          <p className="text-[10px] text-[#c9a89e] font-sans truncate mt-0.5">{m.genre} &middot; {m.wordCount?.toLocaleString() || 0} words</p>
                        </div>
                        <div className="flex-grow grid grid-cols-7 gap-2 text-center items-center">
                          {renderStageColumn(st.qQueried, 'queried')}
                          {renderStageColumn(st.qPartReq, 'part_req')}
                          {renderStageColumn(st.qPartSent, 'part_sent')}
                          {renderStageColumn(st.qFullReq, 'full_req')}
                          {renderStageColumn(st.qFullSent, 'full_sent')}
                          {renderStageColumn(st.qOffer, 'offer')}
                          {renderStageColumn(st.qClosed, 'closed')}
                        </div>
                      </div>
                    );
                  })}
                  {manuscripts.length === 0 && (
                    <div className="p-8 text-center text-[#3a1c14]/40 text-xs italic">
                      Get started by creating your very first manuscript structure!
                    </div>
                  )}
                </div>
              );
            }

            const COLUMN_GRID = "230px repeat(7, 1fr)";
            return (
              <MountCard id="query-status-breakdown-card" style={{ overflow: "hidden" }}>
                {/* Edge-to-edge sage band header */}
                <div
                  style={{
                    position: "relative",
                    zIndex: 2,
                    margin: "6px 6px 0",
                    borderRadius: "8px 8px 0 0",
                    padding: "14px 22px 12px",
                    background: sageBandGradient,
                    borderBottom: `1px solid ${sageBandRule}`,
                  }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: COLUMN_GRID, alignItems: "center" }}>
                    <span style={{ fontFamily: FONT_SERIF, fontSize: 15, fontWeight: 500, color: headingInk }}>
                      Your querying pipeline
                    </span>
                    {["Queried", "Part. req", "Part. sent", "Full req", "Full sent", "Offer", "Closed"].map((label) => (
                      <span key={label} style={{ ...labelStyle, textAlign: "center", color: sageText }}>{label}</span>
                    ))}
                  </div>
                </div>

                {/* Rows */}
                <div style={{ position: "relative", zIndex: 2, margin: "0 6px 6px", padding: "6px 16px 14px" }}>
                  {manuscripts.map((m, index) => {
                    const st = splitByStage(m);
                    return (
                      <div
                        key={m.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: COLUMN_GRID,
                          alignItems: "center",
                          borderBottom: index === manuscripts.length - 1 ? undefined : "0.5px solid #ece0d2",
                        }}
                      >
                        <div style={{ padding: "13px 6px" }}>
                          <p className="truncate" style={{ fontFamily: FONT_SERIF, fontSize: 14.5, color: headingInk, lineHeight: 1.3 }} title={m.title}>
                            {m.title}
                          </p>
                          <p className="truncate" style={{ ...labelStyle, marginTop: 2 }}>
                            {m.genre} · {m.wordCount?.toLocaleString() || 0}
                          </p>
                        </div>
                        <div style={{ textAlign: "center", padding: "13px 8px" }}>{renderStageColumn(st.qQueried, 'queried')}</div>
                        <div style={{ textAlign: "center", padding: "13px 8px" }}>{renderStageColumn(st.qPartReq, 'part_req')}</div>
                        <div style={{ textAlign: "center", padding: "13px 8px" }}>{renderStageColumn(st.qPartSent, 'part_sent')}</div>
                        <div style={{ textAlign: "center", padding: "13px 8px" }}>{renderStageColumn(st.qFullReq, 'full_req')}</div>
                        <div style={{ textAlign: "center", padding: "13px 8px" }}>{renderStageColumn(st.qFullSent, 'full_sent')}</div>
                        <div style={{ textAlign: "center", padding: "13px 8px" }}>{renderStageColumn(st.qOffer, 'offer')}</div>
                        <div style={{ textAlign: "center", padding: "13px 8px" }}>{renderStageColumn(st.qClosed, 'closed')}</div>
                      </div>
                    );
                  })}
                  {manuscripts.length === 0 && (
                    <div className="p-8 text-center text-xs italic" style={{ color: "rgba(58,28,20,0.4)" }}>
                      Get started by creating your very first manuscript structure!
                    </div>
                  )}
                </div>
              </MountCard>
            );
          })()}

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
                | 'nudge'
                | 'response_received';
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

              // 6. Response received (rejection / offer / withdrawal / closed) — a past event,
              //    shown in the last-7-days panel, dated when the response was recorded.
              const isClosedResponse = [
                QueryStatus.REJECTED,
                QueryStatus.OFFER,
                QueryStatus.WITHDRAWN,
                QueryStatus.NO_RESPONSE,
              ].includes(q.status);
              if (isClosedResponse) {
                const respRaw: any = (q as any).responseReceivedAt || (q as any).lastStatusChange;
                let respDate: Date | null = null;
                if (respRaw) {
                  if (typeof respRaw === "string") respDate = new Date(respRaw);
                  else if (typeof respRaw.seconds === "number") respDate = new Date(respRaw.seconds * 1000);
                  else if (typeof respRaw.toDate === "function") respDate = respRaw.toDate();
                  else if (respRaw instanceof Date) respDate = respRaw;
                }
                if (respDate && !isNaN(respDate.getTime())) {
                  const diff = getDayDiff(today, respDate);
                  if (diff >= 0 && diff <= 6) {
                    allEvents.push({
                      id: `${q.id}-response`,
                      queryId: q.id,
                      query: q,
                      type: 'response_received',
                      date: respDate,
                      dateStr: respDate.toISOString(),
                    });
                  }
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
              if (['sent', 'partial_sent', 'full_sent', 'pages_requested_no_response', 'response_received'].includes(ev.type)) {
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
              if (type === 'response_received') {
                return 'response_received';
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
              if (t === 'response_received') {
                return <div key={t} className="w-[6px] h-[6px] rounded-full bg-[#8a7268] transition-transform" style={scaleStyle} />;
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
                      ? "ring-2 ring-[#d8a89a] bg-[#f5e2da]/70 scale-[1.08] shadow-sm" 
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
                              ? "bg-[#f5e2da] text-[#7c3a2a]" 
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
              } else if (ev.type === 'response_received') {
                cardBgAndBorder = ev.query.status === QueryStatus.OFFER
                  ? "border-l-2 border-r-0 border-y-0 border-[#b8860b] bg-[#FFFCF3]"
                  : "border-l-2 border-r-0 border-y-0 border-[#b0a59c] bg-[#FAF8F6]";
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
              } else if (ev.type === 'response_received') {
                if (ev.query.status === QueryStatus.OFFER) {
                  eventTypeLabel = "Offer of representation!";
                  typeColorClass = "text-[#9a6a0b] font-bold";
                } else if (ev.query.status === QueryStatus.WITHDRAWN) {
                  eventTypeLabel = "Query withdrawn";
                  typeColorClass = "text-[#8a7268] font-medium";
                } else if (ev.query.status === QueryStatus.NO_RESPONSE) {
                  eventTypeLabel = "Closed — no response";
                  typeColorClass = "text-[#8a7268] font-medium";
                } else {
                  eventTypeLabel = "Rejection received";
                  typeColorClass = "text-[#8a7268] font-medium";
                }
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
                dotIndicator = <StatusDot status={eventStatus} size={13} />;
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
                              <div className="flex flex-col items-center justify-center py-2 text-center bg-[#f7ede7] rounded-lg">
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
                  : "flex flex-col w-full relative"
                }
                style={isMagazineLayout
                  ? { borderBottomWidth: '0.5px' }
                  : { background: parchment, backgroundImage: PAPER_TEXTURE, borderRadius: 14, boxShadow: mountShadow }}
                id="fortnight-in-focus-container"
              >
                {!isMagazineLayout && (
                  <div aria-hidden="true" style={{ position: "absolute", inset: 6, border: insetBorder, borderRadius: 10, pointerEvents: "none", zIndex: 3 }} />
                )}
                {/* Header */}
                <div
                  className={isMagazineLayout
                    ? "p-[14px_24px] pb-1.5 flex items-center justify-between border-b border-[#e8d5cc]/30"
                    : "flex items-center justify-between"
                  }
                  style={isMagazineLayout ? {} : {
                    position: "relative",
                    zIndex: 2,
                    margin: "6px 6px 0",
                    borderRadius: "8px 8px 0 0",
                    padding: "12px 18px 10px",
                    background: sageBandGradient,
                    borderBottom: `1px solid ${sageBandRule}`,
                  }}
                >
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
                <div
                  className="grid grid-cols-[1fr_1px_1fr]"
                  style={isMagazineLayout ? { background: "#FFFDF9" } : { position: "relative", zIndex: 2, margin: "0 6px 6px" }}
                >
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

          {/* "The story so far" — activity timeline */}
          {(() => {
            const timelineBody = (
              <div
                ref={timelineScrollRef}
                onScroll={handleTimelineScroll}
                className="flex-1 overflow-y-auto pr-1 scrollbar-thin min-h-0"
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
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-16 px-4 animate-fade-in">
                    <Send className="w-[22px] h-[22px]" style={{ color: "#aab8a4", marginBottom: 10 }} strokeWidth={1.6} />
                    <div style={{ fontFamily: FONT_SERIF, fontStyle: "italic", fontSize: 13.5, color: "#5a6258", lineHeight: 1.65 }}>
                      The story starts with your first query.
                    </div>
                    <div style={{ ...labelStyle, marginTop: 13 }}>No activity logged yet</div>
                  </div>
                ) : (
                  <div>
                    {chronologicalKeys.map((dateKey) => {
                      const formattedDateHeader = getDisplayDateHeader(dateKey);
                      const events = [...groupedEventsByDate[dateKey]].sort((a, b) => {
                        return new Date(b.date).getTime() - new Date(a.date).getTime();
                      });

                      return (
                        <div key={dateKey} style={{ marginBottom: 4 }}>
                          {/* Day group caption */}
                          <div style={{ ...labelStyle, marginBottom: 12 }}>{formattedDateHeader}</div>

                          {events.map((act, evIdx) => {
                            const q = queries.find(item => item.id === act.queryId);
                            const agent = q ? agents.find(ag => ag.id === q.agentId) : null;
                            const ms = manuscripts.find(m => m.id === act.manuscriptId) || manuscripts[0];
                            const msTitle = ms ? ms.title : "";
                            const formattedTime = getFormattedTime(act.date);

                            const pillData = getPillLabelAndDot(act.description, act.activityType, act.resultingStatus);
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

                            // Label caption beneath the sentence: respond-by date + manuscript
                            const respondBy = q?.responseDeadline
                              ? `Respond by ${new Date(q.responseDeadline).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
                              : "";
                            const isLastInGroup = evIdx === events.length - 1;

                            return (
                              <div key={act.id} className="flex animate-fade-in" style={{ gap: 12, marginBottom: isLastInGroup ? 18 : 14 }}>
                                {/* Dot on the connector thread */}
                                <div className="flex flex-col items-center shrink-0">
                                  <span style={{ marginTop: 3 }}>{pillData.dot}</span>
                                  {!isLastInGroup && <span style={{ width: 1.5, flex: 1, background: "#e8dcd0", marginTop: 4 }} />}
                                </div>

                                {/* Event sub-card */}
                                <div
                                  onClick={() => {
                                    if (act.queryId) {
                                      setSelectedQueryIdForPanel(act.queryId);
                                      setIsQueryPanelOpen(true);
                                    } else {
                                      onNavigate("queries", act.description);
                                    }
                                  }}
                                  className="cursor-pointer transition-all group"
                                  style={{
                                    flex: 1,
                                    minWidth: 0,
                                    background: "#fffdf9",
                                    border: "0.5px solid #ece0d2",
                                    borderRadius: 9,
                                    padding: "12px 14px",
                                  }}
                                >
                                  <div className="flex justify-between items-center" style={{ marginBottom: 5 }}>
                                    {pillData.show ? (
                                      <span
                                        style={{
                                          fontFamily: FONT_MONO,
                                          fontSize: 9,
                                          background: buttonPinkBg,
                                          color: burgundy,
                                          borderRadius: 20,
                                          padding: "4px 9px",
                                          fontWeight: 500,
                                        }}
                                      >
                                        {formatRichText(displayPillLabel)}
                                      </span>
                                    ) : <span />}
                                    <span style={{ ...labelStyle, letterSpacing: "0.08em" }}>{formattedTime}</span>
                                  </div>

                                  <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "#4a3a30" }}>
                                    {formatRichText(boldedDesc)}
                                  </div>
                                  {displayDetails && (
                                    <p style={{ fontSize: 11, color: mutedInk, lineHeight: 1.5, marginTop: 4 }}>
                                      {formatRichText(displayDetails)}
                                    </p>
                                  )}
                                  {(respondBy || manuscriptPillContent) && (
                                    <div style={{ ...labelStyle, marginTop: 6, letterSpacing: "0.1em" }}>
                                      {respondBy}
                                      {respondBy && manuscriptPillContent ? " · " : ""}
                                      {manuscriptPillContent ? formatRichText(manuscriptPillContent) : null}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );

            const aiStyleButton = (
              <button
                onClick={() => setIsCustomizerOpen(true)}
                className="cursor-pointer"
                title="Customize ledger copy style rules"
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 9,
                  fontWeight: 500,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  background: "#ffffff",
                  color: ghostButtonText,
                  border: "0.5px solid #e0d5c8",
                  borderRadius: 9,
                  padding: "5px 10px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = burgundy; e.currentTarget.style.background = buttonPinkBg; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = ghostButtonText; e.currentTarget.style.background = "#ffffff"; }}
              >
                <Sparkles className="w-[11px] h-[11px]" />
                AI style
              </button>
            );

            if (isMagazineLayout) {
              return (
                <div className="p-[20px] text-left flex-1 flex flex-col justify-between min-h-0 relative">
                  <div className="flex items-center justify-between mb-4 w-full">
                    <span className="font-serif text-[11px] font-semibold uppercase tracking-wider text-[#3a1c14]">
                      Timeline
                    </span>
                    {aiStyleButton}
                  </div>
                  {timelineBody}
                </div>
              );
            }

            return (
              <MountCard className="flex-1 flex flex-col" style={{ minHeight: 0, overflow: "hidden" }}>
                {/* Edge-to-edge sage band header */}
                <div
                  className="flex items-center justify-between"
                  style={{
                    position: "relative",
                    zIndex: 2,
                    margin: "6px 6px 0",
                    borderRadius: "8px 8px 0 0",
                    padding: "14px 20px 12px",
                    background: sageBandGradient,
                    borderBottom: `1px solid ${sageBandRule}`,
                  }}
                >
                  <span style={{ fontFamily: FONT_SERIF, fontSize: 15, fontWeight: 500, color: headingInk }}>
                    The story so far
                  </span>
                  <span className="flex items-center" style={{ gap: 10 }}>
                    <span style={{ ...labelStyle, color: sageText }}>Timeline</span>
                    {aiStyleButton}
                  </span>
                </div>

                <div
                  className="flex-1 flex flex-col min-h-0"
                  style={{ position: "relative", zIndex: 2, margin: "0 6px 6px", padding: "16px 20px 12px" }}
                >
                  {timelineBody}

                  {/* Ledger footer line */}
                  <div
                    className="text-center select-none"
                    style={{
                      marginTop: 12,
                      paddingTop: 10,
                      borderTop: hairline,
                      fontFamily: FONT_SERIF,
                      fontStyle: "italic",
                      fontSize: 10.5,
                      color: mutedInk,
                    }}
                  >
                    "Every great voice was once a stack of letters."
                  </div>
                </div>
              </MountCard>
            );
          })()}
        </div>

      </div>

      {/* Quiet Pro upsell (replaces the old three-format banner review arena) */}
      {!isMagazineLayout && currentUser.plan !== UserPlan.PRO && (
        <div className="w-full max-w-none px-4 md:px-10 lg:px-14 xl:px-16 mt-[14px]">
          <MountCard>
            <div
              className="flex flex-col md:flex-row md:items-center justify-between gap-4"
              style={{ position: "relative", zIndex: 4, padding: "18px 22px" }}
            >
              <div>
                <div style={{ ...labelStyle, marginBottom: 6 }}>ScriptAlly Pro</div>
                <div style={{ fontFamily: FONT_SERIF, fontSize: 17, fontWeight: 500, color: headingInk }}>
                  More room for the journey
                </div>
                <p style={{ fontFamily: FONT_SANS, fontSize: 12, color: mutedInk, marginTop: 4, maxWidth: 560, lineHeight: 1.55 }}>
                  Unlimited manuscripts, deeper querying analytics and live wishlist matching — when you're ready for them.
                </p>
              </div>
              <button
                onClick={() => onNavigate("pricing")}
                className="cursor-pointer shrink-0"
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 10.5,
                  fontWeight: 500,
                  letterSpacing: "0.07em",
                  background: buttonPinkBg,
                  color: burgundy,
                  border: `0.5px solid ${buttonPinkBorder}`,
                  borderRadius: 10,
                  padding: "10px 20px",
                  transition: "all 0.2s",
                }}
              >
                See Pro plans →
              </button>
            </div>
          </MountCard>
        </div>
      )}

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
              <div className="p-5 relative text-left select-none shrink-0" style={{ background: sageBandGradient, borderBottom: `1px solid ${sageBandRule}` }}>
                <span style={{ ...labelStyle, color: sageText, display: "block", marginBottom: 4 }}>
                  Dashboard
                </span>
                <h2 style={{ fontFamily: FONT_SERIF, fontSize: 20, fontWeight: 500, color: headingInk }}>
                  Your tasks
                </h2>
                <p style={{ fontFamily: FONT_SANS, fontSize: 12, color: sageText, marginTop: 2 }}>
                  {tasks.length} {tasks.length === 1 ? 'item needs' : 'items need'} attention
                </p>
                <button 
                  onClick={() => setIsTasksPanelOpen(false)}
                  className="absolute top-5 right-5 p-1 rounded-full transition-colors cursor-pointer"
                  style={{ color: sageText }}
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
                            <div className="flex items-center gap-1.5 text-[#a86a52] font-bold text-[10px] uppercase tracking-wider mb-2 select-none">
                              <Clock className="w-4 h-4 text-[#a86a52]" />
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
        onRecordResponse={(qid) => setRecordResponseQueryId(qid)}
        onActivityDeleted={() => {
          console.log("Timeline activity record successfully deleted.");
        }}
      />

      {/* Unified Record-response modal (shared with the Queries page) */}
      {recordResponseQueryId && (() => {
        const q = queries.find(item => item.id === recordResponseQueryId);
        if (!q) return null;
        const ag = agents.find(a => a.id === q.agentId);
        const ms = manuscripts.find(m => m.id === q.manuscriptId);
        return (
          <RecordResponseModal
            isOpen={true}
            onClose={() => setRecordResponseQueryId(null)}
            query={q}
            agent={{
              name: ag?.name || "the agent",
              agency: ag?.agency || "Agency",
              responseTimeWeeks: ag?.responseTimeWeeks || 6,
              submissionMethod: (ag as any)?.submissionMethod || "Email"
            }}
            manuscript={{ title: ms?.title || "" }}
            materialsOriginallySent={q?.materialsWanted || []}
            onNavigate={onNavigate}
            onSave={async (data) => {
              if (!currentUser) throw new Error("No user session active.");
              const result = await recordQueryResponse(
                { userId: currentUser.id, query: q, agent: ag || null, manuscript: ms || null },
                data
              );
              setUndoToastInfo({
                queryId: q.id,
                previousStatus: q.status,
                newStatus: result.newStatus,
                agentName: ag?.name || "the agent",
                undoFn: result.undo,
              });
            }}
          />
        );
      })()}

      {/* Undo Success Status Toast overlay */}
      <AnimatePresence>
        {undoToastInfo && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-100 rounded-2xl p-4 flex items-center gap-4 max-w-sm select-none font-sans"
            style={{ background: parchment, border: "0.5px solid #e0d5c8", boxShadow: "0 8px 24px rgba(58,28,20,0.18)" }}
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
                    stroke="#7c3a2a"
                    strokeWidth="2.5"
                    fill="transparent"
                    strokeDasharray="69.1"
                    strokeDashoffset={(69.1 * (10 - undoToastTimer)) / 10}
                    className="transition-all duration-1000 ease-linear"
                  />
                </svg>
                <span className="absolute text-[10px] font-bold font-mono" style={{ color: "#7c3a2a" }}>
                  {undoToastTimer}
                </span>
              </div>

              {/* Red-accent Undo Trigger Button */}
              <button
                onClick={async () => {
                  try {
                    if (undoToastInfo.undoFn) {
                      // Unified revert (recorded via RecordResponseModal).
                      await undoToastInfo.undoFn();
                    } else {
                      // Legacy path (inline status form).
                      await undoQueryStatus(
                        undoToastInfo.queryId,
                        undoToastInfo.previousStatus,
                        undoToastInfo.newStatus
                      );
                    }
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
