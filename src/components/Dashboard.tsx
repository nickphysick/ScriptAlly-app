/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { useScriptAllyDb } from "../lib/db";
import { UserPlan, QueryStatus, ManuscriptStatus, ActivityType, Query, Task, Manuscript, Agent, Note } from "../types";
import { STATUS_ORDER } from "../lib/statusOrder";
import { lockStageScroll } from "../lib/stageScroll";
import { manuscriptGenres } from "../lib/manuscripts";
import { agentBuckets } from "../lib/lifecycle";
import { useOpenEditQuery } from "./EditQueryHost";
import { RecordResponseModal } from "./RecordResponseModal";
import { RecordResponseScreen } from "./RecordResponseScreen";
import { NudgeModal } from "./NudgeModal";
import { recordQueryResponse } from "../lib/recordResponse";
import { StatusDot } from "./StatusDot";
import { getPillLabelAndDot, renderTimelineDot } from "./TimelineDot";
import { getTimelineFamily, FAMILY_CARD_STYLE } from "../lib/timelineEvent";
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
  PAPER_TEXTURE,
  mountShadow,
  insetBorder,
} from "../lib/designTokens";
import { MountCard } from "./MountCard";
import { buildOverToYouRows } from "./dashboard/OverToYou";
// Mobile Pass 1 — the <md desk line + To-do doorway read the To-do board's OWN tallies (the
// sidebar's recipe), so the doorway can never disagree with the page it opens.
import { deskNotice, sidebarBoardTiles } from "../lib/shellSidebar";
// v37 consolidated dashboard pieces (BUILD-REPORT 4 Jul: layout = top bar → salutation greeting
// (settled desk): hero zone → stat row → story/diary → pipeline → Pro banner.
import { agentPrimary, AGENT_NOT_SPECIFIED } from "../lib/agentDisplay";
import { OneScreenDashboard } from "./dashboard/OneScreenDashboard";
import { StatCardFull, useStatDefs } from "./dashboard/DashboardStatsRow";
import "./dashboard/dashboardV37.css";
import { useOpenEditAgent } from "./EditAgentHost";
import { replacePlaceholders, extractAgentFromText } from "../lib/activityUtils";
import {
  Sparkles,
  CalendarClock,
  RefreshCw,
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
  Footprints,
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

// Timeline dot/label resolution + the family classifier now live in the shared primitives
// (./TimelineDot, ../lib/timelineEvent) — imported above and consumed by the story-so-far feed.

/** A single consequence tag on a story-so-far card (in-colour lucide icon, never emoji). */
const STORY_TAG_TONE: Record<"sage" | "gold" | "burgundy" | "muted", { bg: string; color: string; border: string }> = {
  sage: { bg: "#e9ede6", color: "#5a6e58", border: "transparent" },
  gold: { bg: "#fbf3e2", color: "#9a6a12", border: "rgba(186,117,23,0.35)" },
  burgundy: { bg: "#f8e7dc", color: "#7c3a2a", border: "transparent" },
  muted: { bg: "#f1ede7", color: "#8a7a6c", border: "transparent" },
};
const StoryTag: React.FC<{ tone: "sage" | "gold" | "burgundy" | "muted"; Icon?: React.ComponentType<{ className?: string }>; children: React.ReactNode }> = ({ tone, Icon, children }) => {
  const t = STORY_TAG_TONE[tone];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 7, maxWidth: "100%", fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.03em", padding: "4px 9px", borderRadius: 8, background: t.bg, color: t.color, border: `0.5px solid ${t.border}` }}>
      {Icon && <Icon className="w-[11px] h-[11px] shrink-0" />}
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{children}</span>
    </span>
  );
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
  const openEditAgent = useOpenEditAgent();
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
    // The "Edit Agent" housekeeping task opens the Edit Agent drawer in place (app-level overlay —
    // no route change); every other task navigates.
    if (task.taskType === "data_quality_poor") openEditAgent(task.relatedRecordId, { fromTask: true });
    else onNavigate(task.actionPath, task.title);
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
  /** Wires the dashboard top-bar search into the app's shared search state (optional so any
   *  legacy call site without it still compiles; the bar's input is inert without it). */
  setSearchQuery?: (q: string) => void;
}> = ({
  onNavigate,
  searchQuery,
  setSearchQuery
}) => {
  const openEditAgent = useOpenEditAgent();
  const openEditQuery = useOpenEditQuery();
  const {
    currentUser,
    collectionsReady,
    manuscripts,
    agents,
    queries,
    activities,
    tasks,
    taskFlags,
    notes,
    dismissTask,
    logNudge,
    updateQueryStatus,
    undoQueryStatus,
    addNote,
    updateNote,
    deleteNote,
    // the Notes-to-self tab reads the writer's OWN to-do store (the /todo composer's store)
    userTasks,
    addUserTask,
    updateUserTask,
    deleteUserTask,
    updateUserProfile
  } = useScriptAllyDb();

  // Stat definitions (hook — must precede every conditional return).
  // ⚠️ THE FOCUS SLOT IS GONE (settled-desk Phase 1). `useFocusSlot` and its reducer survive in
  // dashboard/focusSlot.ts, unused, with their unit tests — deleting a tested pure module is a
  // separate decision from restructuring a layout. Flagged in the build report.
  // NOTE: activities (not mergedActivities) — the raw feed is available above the guards; the
  // hover panels' median-reply footer reads agent-response activities from it.
  const statDefs = useStatDefs(queries, agents, activities);

  // Note desk/to-do callbacks. Complete + delete both raise an undo toast; the user-facing verb is
  // "Completed" (the field stays done/doneAt). Delete-undo re-creates via addNote (new id/createdAt).
  const handleSaveNote = (id: string, fields: { text: string; colour: Note["colour"]; dueDate: string | null }) =>
    updateNote(id, fields);
  const [noteToast, setNoteToast] = useState<{ msg: string; onUndo: () => void } | null>(null);
  const noteToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showNoteToast = (msg: string, onUndo: () => void) => {
    if (noteToastTimer.current) clearTimeout(noteToastTimer.current);
    setNoteToast({ msg, onUndo });
    noteToastTimer.current = setTimeout(() => setNoteToast(null), 4500);
  };
  const completeNoteWithUndo = (id: string) => {
    updateNote(id, { done: true, doneAt: new Date().toISOString() });
    showNoteToast("Post-it completed", () => updateNote(id, { done: false, doneAt: null }));
  };
  const deleteNoteWithUndo = (id: string) => {
    const snap = notes.find((n) => n.id === id);
    deleteNote(id);
    showNoteToast("Post-it deleted", () => {
      if (snap) addNote({ text: snap.text, colour: snap.colour, dueDate: snap.dueDate });
    });
  };
  const dismissNoteToast = () => {
    if (noteToastTimer.current) clearTimeout(noteToastTimer.current);
    setNoteToast(null);
  };

  // Loading vs loaded-empty vs loaded-with-data. While the user's collections are still loading we
  // show the skeleton — never the empty/onboarding state — but only if the load takes a moment
  // (~180ms), so fast loads don't flash it.
  const [showSkeleton, setShowSkeleton] = useState(false);
  useEffect(() => {
    if (collectionsReady) { setShowSkeleton(false); return; }
    const t = setTimeout(() => setShowSkeleton(true), 180);
    return () => clearTimeout(t);
  }, [collectionsReady]);

  const [isTasksPanelOpen, setIsTasksPanelOpen] = useState(false);
  const [spotlightTaskIndex, setSpotlightTaskIndex] = useState(0);
  const [activeSnoozeTaskId, setActiveSnoozeTaskId] = useState<string | null>(null);
  const [activeTouchTaskId, setActiveTouchTaskId] = useState<string | null>(null);
  const [isTouch, setIsTouch] = useState(false);

  // (The legacy top-level `users/{uid}/activity` listener is RETIRED — Tier 3 · Phase 7. The
  // store has had zero writers since the derived-status era, and the listener fed timelineItems,
  // which nothing rendered: a wasted subscription + 20 document reads on every Dashboard mount.
  // Rules now default-deny the store; legacy documents stay in Firestore, orphaned by design.)

  // Undo Toast + calendar states (the query slide-in panel is retired — query editing is the
  // app-level Edit Query drawer, opened via openEditQuery).
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
  // The hero "Record a response" screen (paste-email fast lane + manual flow).
  const [recordResponseScreenOpen, setRecordResponseScreenOpen] = useState(false);

  // Drives the Nudge modal (opened from a nudge_overdue row's "Nudge" button).
  const [nudgeTask, setNudgeTask] = useState<Task | null>(null);

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
    // The page scrolls inside the AppShell stage now — lock it alongside the body (belt-and-braces).
    const releaseStage = lockStageScroll();
    const originalStyle = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      releaseStage();
      document.body.style.overflow = originalStyle;
    };
  }, [isTasksPanelOpen]);

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

  // Agents stat card / idle bucket (lifecycle.ts). Agents I've queried always count as queried;
  // agents I HAVEN'T queried that are closed or set aside drop out entirely (they're not
  // "idle/suggestable"), so the card shows only the in-play agents.
  const { queried: queriedAgents, idle: idleAgents } = agentBuckets<Agent>(agents, queries);
  const byName = (a: Agent, b: Agent) => a.name.localeCompare(b.name);
  // Queried first (solid glyphs), then idle (outline); alphabetical within each group.
  const sortedDisplayAgents = [...[...queriedAgents].sort(byName), ...[...idleAgents].sort(byName)];
  const totalAgentsCount = sortedDisplayAgents.length; // queried + idle (excludes parked/closed-unqueried)
  const queriedAgentsCount = queriedAgents.length;
  const notQueriedAgentsCount = idleAgents.length;

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
      const sentTime = q.dateSent ? new Date(q.dateSent).getTime() : Infinity;
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

  // ── Stat-card popup data (enriched; kept consistent with the visuals computed above) ──────
  const STAT_ACTIVE_STATUSES = [
    QueryStatus.QUERIED, QueryStatus.PARTIAL_REQUESTED, QueryStatus.PARTIAL_SENT,
    QueryStatus.FULL_REQUESTED, QueryStatus.FULL_SENT, QueryStatus.REVISE_RESUBMIT,
  ];
  // Bars: the agents/agencies queried each week (bins 1..7 = the last 7 weeks shown by sentPerWeek).
  const sentWeekItems: { agentName: string; agency: string }[][] = Array.from({ length: 8 }, () => []);
  queries.forEach(q => {
    const binIndex = 7 - Math.floor((nowTime - new Date(q.dateSent).getTime()) / ONE_WEEK_MS);
    if (binIndex >= 0 && binIndex < 8) {
      const ag = agents.find(a => a.id === q.agentId);
      sentWeekItems[binIndex].push({ agentName: ag ? agentPrimary(ag) : AGENT_NOT_SPECIFIED, agency: ag && ag.name?.trim() ? ag.agency || "" : "" });
    }
  });
  const fmtWeekCommencing = (binIdx: number) =>
    new Date(nowTime - (8 - binIdx) * ONE_WEEK_MS).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const statSentWeeks = [1, 2, 3, 4, 5, 6, 7].map(idx => ({
    weekLabel: fmtWeekCommencing(idx),
    count: dynamicQueriesSentPerWeek[idx],
    queries: sentWeekItems[idx],
  }));

  // Line: per-week active total + status composition. Mirrors dynamicActiveQueriesPerWeek's filter
  // (queries sent by week-end whose CURRENT status is active), so each composition sums exactly to
  // the line point. NB: historical composition therefore reflects current status, not a full log replay.
  const statActiveWeeks = [1, 2, 3, 4, 5, 6, 7].map(idx => {
    const weekEndTime = nowTime - (7 - idx) * ONE_WEEK_MS;
    const atWeek = queries.filter(q =>
      q.dateSent && new Date(q.dateSent).getTime() <= weekEndTime && STAT_ACTIVE_STATUSES.includes(q.status));
    const counts = new Map<QueryStatus, number>();
    atWeek.forEach(q => counts.set(q.status, (counts.get(q.status) || 0) + 1));
    const composition = STATUS_ORDER
      .filter(s => (counts.get(s) || 0) > 0)
      .map(s => ({ status: s, count: counts.get(s) as number }));
    const weeksAgo = 7 - idx;
    return {
      label: weeksAgo === 0 ? "Now" : `${weeksAgo} week${weeksAgo === 1 ? "" : "s"} ago`,
      count: atWeek.length,
      composition,
    };
  });

  // Agents: per-icon popup data, in the icon-row display order (queried first, then idle).
  const statAgents = sortedDisplayAgents.map(a => ({
    name: a.name,
    agency: a.agency,
    queried: queries.some(q => q.agentId === a.id),
    genres: a.genres || [],
    fit: a.starRating || 0,
    mswl: a.mswlNotes || "",
  }));

  // Responses: replied of total, for the progress popup.
  const statResponses = { replied: responsesReceived, total: totalQueries, ratePct: responseRatePercent };

  // Group activities/events for Timeline
  const mergedActivities = useMemo(() => {
    // Single source of truth: the global `activities` collection. The legacy top-level
    // `activity` feed is RETIRED outright (Tier 3 · Phase 7 — writer-less, listener removed):
    // merging the two collections — de-duped only by document id — had produced two rows for a
    // single recorded response. Reading one store keeps every recorded event exactly once.
    const seen = new Set<string>();
    return [...activities].filter(item => {
      if (!item.id || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [activities]);

  const groupedEventsByDate: Record<string, typeof activities> = {};
  // Story-so-far feed cuts the housekeeping family (agent/manuscript add/update/delete) at the
  // render-grouping level only — mergedActivities itself stays intact for Fortnight in Focus's
  // related-activity lookup. A day left with only housekeeping yields no group key, so no empty
  // day-separator renders, and an emptied feed falls through to the existing empty-state.
  mergedActivities.filter(act => getTimelineFamily(act) !== "housekeeping").forEach(act => {
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

  // ── v37 derivations (plain values, computed each render — no hooks below the guards) ──
  // Route visibility: the dashboard StagePage stays mounted; AppContent re-renders on every
  // navigation, so reading location directly stays fresh without a hook-ordering hazard.
  const isDashRoute = typeof window !== "undefined" && window.location.pathname === "/dashboard";
  // The chip and the To-do card must agree — both read buildOverToYouRows.
  const urgentRowCount = buildOverToYouRows(tasks, queries, agents).length;
  // Mobile Pass 1 (<md only — the surfaces are CSS-gated): the desk line + To-do doorway read
  // the To-do BOARD's tallies via the sidebar recipe, so they agree with /todo, their target.
  const mobileTiles = sidebarBoardTiles({
    tasks, userTasks, queries, agents, manuscripts, taskFlags, activities,
    now: Date.now(), mutedTaskRules: currentUser?.mutedTaskRules,
  });
  const mobileNotice = deskNotice(mobileTiles);
  /* ⚠️ THE SAME KEY THE SHELL WRITES — `scriptally_active_manuscript_id`. Packages, Comps and
     Manuscripts all read it; resolving the scoped book any other way would put a different title
     in the kicker from the one the chrome says you are working on. */
  const activeManuscriptForKicker = (() => {
    const stored = typeof window === "undefined" ? null : localStorage.getItem("scriptally_active_manuscript_id");
    return manuscripts.find((m) => m.id === stored) ?? manuscripts[0] ?? null;
  })();
  const fortnightCount = mergedActivities.filter((a: any) => {
    const t = new Date(a.date).getTime();
    return Number.isFinite(t) && t >= Date.now() - 14 * 86400000;
  }).length;
  /* The DeskTodoCard host is gone with the settled desk — the one-screen tasks card derives
     its own rows from the same builders. */

  /* ⚠️ NO EARLY SKELETON RETURN ANY MORE — §8's per-card skeletons ARE the loading state, and
     they need the page's layout mounted so nothing shifts when data lands. `loading` is passed
     down instead. DashboardSkeleton survives on disk unmounted. */
  return (
    <div
      className="sa-dashroot font-sans"
      /* ⚠️ `min-h-screen pb-16` REMOVED — they were what broke the one-screen lock, and they are
         invisible from inside OneScreenDashboard, which is why this wrapper went unmeasured
         through two rounds of "fixing" the scroll.

         `min-height: 100vh` sits INSIDE a slot that is already the viewport MINUS the 66px bar,
         so it could never fit by construction; and `min-height` does not make a box definite, so
         `.os-root`'s `height: 100%` had nothing to resolve against and fell back to content
         height — 6,499px of wrapper in an 840px scroller, measured.

         The height now comes from `.sa-dashroot` in oneScreen.css, which keeps it `height:100%`
         where the page is locked and hands back `auto` + the dvh min-height + the bottom padding
         in the releases, where the page is SUPPOSED to scroll. */
      style={{ color: bodyInk }}
    >

      {/* ══ THE ONE-SCREEN DASHBOARD (spec design-refs/dashboard-one-screen-spec.md) ══
          Replaces the settled desk WHOLESALE (§13): the hero, the four stat cards, the story,
          the diary, the pipeline, the to-do card, the guided empty state and the bottom Pro
          banner all leave this page. Day one is §9's job now; loading is §8's per-card
          skeletons, passed down rather than gated up here. */}
      <OneScreenDashboard
        loading={!collectionsReady}
        queries={queries}
        agents={agents}
        manuscripts={manuscripts}
        tasks={tasks}
        userTasks={userTasks}
        activities={mergedActivities}
        currentUser={currentUser}
        activeManuscript={activeManuscriptForKicker}
        onNavigate={onNavigate}
        onTaskAction={(task) => task.taskType === "data_quality_poor"
          ? openEditAgent(task.relatedRecordId, { fromTask: true })
          : onNavigate(task.actionPath, task.title)}
        updateUserProfile={updateUserProfile}
      />

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
                                  onOpenQuery={(qId) => openEditQuery(qId)}
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
                                  onOpenQuery={(qId) => openEditQuery(qId)}
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
                                  onOpenQuery={(qId) => openEditQuery(qId)}
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

      {/* Edit Query is now an app-level overlay (EditQueryHost) opened via openEditQuery(id) — the
          legacy QuerySlideInPanel slab is retired. */}

      {/* Record-a-response screen (hero entry): paste-email fast lane + manual record-a-response flow. */}
      <RecordResponseScreen
        isOpen={recordResponseScreenOpen}
        onClose={() => setRecordResponseScreenOpen(false)}
        onNavigate={onNavigate}
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
              name: ag?.name || ag?.agency || "the agent",
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
                agentName: ag?.name || ag?.agency || "the agent",
                undoFn: result.undo,
              });
            }}
          />
        );
      })()}

      {/* Nudge modal (opened from a nudge_overdue To-do row) */}
      {nudgeTask && (() => {
        const q = queries.find(item => item.id === nudgeTask.relatedRecordId);
        if (!q) return null;
        const ag = agents.find(a => a.id === q.agentId);
        return (
          <NudgeModal
            agentName={ag ? agentPrimary(ag) : null}
            agency={ag && ag.name?.trim() ? ag.agency || "" : ""}
            dateSent={q.dateSent}
            responseDeadline={q.responseDeadline}
            onClose={() => setNudgeTask(null)}
            onConfirm={async ({ checkBackDate, note }) => {
              await logNudge(q.id, { checkBackDate, note });
              setNudgeTask(null);
            }}
            onCloseInstead={() => {
              setNudgeTask(null);
              setRecordResponseQueryId(q.id);
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

      {/* Note undo toast — Complete / Delete both land here (portalled to <body>). */}
      {noteToast
        ? createPortal(
            <div
              style={{
                position: "fixed",
                left: "50%",
                bottom: 34,
                transform: "translateX(-50%)",
                background: "#3a2c26",
                color: "#fdfaf5",
                borderRadius: 11,
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                gap: 16,
                boxShadow: "0 10px 30px rgba(0,0,0,0.28)",
                zIndex: 1000,
                fontFamily: '"Source Sans Pro", system-ui, sans-serif',
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9fc09a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
                {noteToast.msg}
              </span>
              <button
                onClick={() => { noteToast.onUndo(); dismissNoteToast(); }}
                style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "#f3c8b8", background: "none", border: "none", cursor: "pointer" }}
              >
                Undo
              </button>
            </div>,
            document.body
          )
        : null}
    </div>
  );
};
