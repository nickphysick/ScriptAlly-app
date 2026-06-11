/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { 
  FileSpreadsheet, LayoutGrid, BarChart3, Plus, Sparkles, BookOpen, 
  ThumbsUp, Clock, AlertCircle, Lightbulb, Book, ChevronRight, 
  ArrowUpRight, Undo2, Quote, Camera, X, ZoomIn, ZoomOut,
  ArrowLeft, ArrowRight, ArrowUp, ArrowDown
} from "lucide-react";
import { useScriptAllyDb } from "../lib/db";
import { QueryStatus, Manuscript } from "../types";
import { seedFacts } from "../lib/seeds";
import { QuerySlideInPanel } from "./QuerySlideInPanel";
import { RecordResponseModal } from "./RecordResponseModal";
import { recordQueryResponse } from "../lib/recordResponse";

interface QueriesLandingProps {
  onNavigate: (tab: string, subPageName?: string) => void;
}

export const QueriesLanding: React.FC<QueriesLandingProps> = ({ onNavigate }) => {
  const {
    currentUser, queries, agents, manuscripts, tasks, updateQueryStatus, undoQueryStatus, activities
  } = useScriptAllyDb();

  // State for Query Detail Slide-in Panel
  const [selectedQueryIdForPanel, setSelectedQueryIdForPanel] = useState<string | null>(null);
  const [isQueryPanelOpen, setIsQueryPanelOpen] = useState(false);

  // Undo Toast States
  const [undoToastInfo, setUndoToastInfo] = useState<{
    queryId: string;
    previousStatus: QueryStatus;
    newStatus: QueryStatus;
    agentName: string;
    notes?: string;
    /** Unified revert from recordQueryResponse(); when present, Undo uses this. */
    undoFn?: () => Promise<void>;
  } | null>(null);
  const [undoToastTimer, setUndoToastTimer] = useState<number>(10);

  // Drives the unified RecordResponseModal launched from the query slide-in panel.
  const [recordResponseQueryId, setRecordResponseQueryId] = useState<string | null>(null);

  // Random Tip Selected on Mount
  const [selectedTip, setSelectedTip] = useState<{ title: string; fact: string } | null>(null);

  // Watermark fallback state (matches dashboard)
  const [useSvgWatermark, setUseSvgWatermark] = useState(false);

  const [queriesImage, setQueriesImage] = useState<string | null>(() => {
    return localStorage.getItem("queries_welcome_image") || null;
  });

  const [queriesImageScale, setQueriesImageScale] = useState<number>(() => {
    const saved = localStorage.getItem("queries_welcome_image_scale");
    return saved ? parseInt(saved, 10) : 100;
  });

  const [queriesImageX, setQueriesImageX] = useState<number>(() => {
    const saved = localStorage.getItem("queries_welcome_image_x");
    return saved ? parseInt(saved, 10) : 0;
  });

  const [queriesImageY, setQueriesImageY] = useState<number>(() => {
    const saved = localStorage.getItem("queries_welcome_image_y");
    return saved ? parseInt(saved, 10) : 0;
  });

  const handleIncreaseScale = () => {
    setQueriesImageScale(prev => {
      const next = Math.min(300, prev + 10);
      localStorage.setItem("queries_welcome_image_scale", next.toString());
      return next;
    });
  };

  const handleDecreaseScale = () => {
    setQueriesImageScale(prev => {
      const next = Math.max(30, prev - 10);
      localStorage.setItem("queries_welcome_image_scale", next.toString());
      return next;
    });
  };

  const handleMoveLeft = () => {
    setQueriesImageX(prev => {
      const next = prev - 5;
      localStorage.setItem("queries_welcome_image_x", next.toString());
      return next;
    });
  };

  const handleMoveRight = () => {
    setQueriesImageX(prev => {
      const next = prev + 5;
      localStorage.setItem("queries_welcome_image_x", next.toString());
      return next;
    });
  };

  const handleMoveUp = () => {
    setQueriesImageY(prev => {
      const next = prev - 5;
      localStorage.setItem("queries_welcome_image_y", next.toString());
      return next;
    });
  };

  const handleMoveDown = () => {
    setQueriesImageY(prev => {
      const next = prev + 5;
      localStorage.setItem("queries_welcome_image_y", next.toString());
      return next;
    });
  };

  const handleResetPosition = () => {
    setQueriesImageX(0);
    setQueriesImageY(0);
    setQueriesImageScale(100);
    localStorage.setItem("queries_welcome_image_x", "0");
    localStorage.setItem("queries_welcome_image_y", "0");
    localStorage.setItem("queries_welcome_image_scale", "100");
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setQueriesImage(base64String);
        localStorage.setItem("queries_welcome_image", base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setQueriesImage(null);
    localStorage.removeItem("queries_welcome_image");
    handleResetPosition();
  };

  useEffect(() => {
    if (seedFacts && seedFacts.length > 0) {
      const randomIndex = Math.floor(Math.random() * seedFacts.length);
      setSelectedTip(seedFacts[randomIndex]);
    }
  }, []);

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

  // Handle Save Callback from Slide-in Panel
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

  const handleUndoStatusChange = async () => {
    if (!undoToastInfo) return;
    try {
      if (undoToastInfo.undoFn) {
        // Unified revert (recorded via RecordResponseModal).
        await undoToastInfo.undoFn();
      } else {
        // Legacy path (inline status form).
        await undoQueryStatus(undoToastInfo.queryId, undoToastInfo.previousStatus, undoToastInfo.newStatus);
      }
      setUndoToastInfo(null);
    } catch (e) {
      console.error("Undo failed:", e);
    }
  };

  // Live calculation of status list for dark hero headline
  const urgentList = useMemo(() => {
    return tasks.filter(t => t.priority === "urgent" || ["offer_received", "partial_requested", "full_requested", "revise_resubmit"].includes(t.taskType));
  }, [tasks]);

  const overdueList = useMemo(() => {
    return tasks.filter(t => t.priority === "overdue" || ["nudge_overdue", "response_overdue", "no_response_close"].includes(t.taskType));
  }, [tasks]);

  const headline = useMemo(() => {
    if (urgentList.length > 0) {
      const s = urgentList.length === 1 ? "" : "s";
      return `You have ${urgentList.length} urgent item${s} that need${urgentList.length === 1 ? "s" : ""} your attention.`;
    } else if (overdueList.length > 0) {
      const firstOverdue = overdueList[0];
      let resolvedAgentName = "An agent";
      if (firstOverdue && firstOverdue.relatedRecordId) {
        const q = queries.find(item => item.id === firstOverdue.relatedRecordId);
        if (q) {
          const ag = agents.find(a => a.id === q.agentId);
          if (ag && ag.name) {
            resolvedAgentName = ag.name;
          }
        }
      }
      return `${resolvedAgentName} is waiting for a follow-up. Don't leave them hanging.`;
    }
    return "You're all caught up. Your querying journey is on track.";
  }, [urgentList, overdueList, queries, agents]);

  // Subtitle variables
  const activeQueriesCount = useMemo(() => {
    return queries.filter(q => q.status !== QueryStatus.REJECTED && q.status !== QueryStatus.WITHDRAWN && q.status !== QueryStatus.NO_RESPONSE).length;
  }, [queries]);

  const manuscriptsWithActiveQueriesCount = useMemo(() => {
    const activeQManuscriptIds = queries
      .filter(q => q.status !== QueryStatus.REJECTED && q.status !== QueryStatus.WITHDRAWN && q.status !== QueryStatus.NO_RESPONSE)
      .map(q => q.manuscriptId);
    return new Set(activeQManuscriptIds).size;
  }, [queries]);

  const sentQueriesSorted = useMemo(() => {
    return [...queries]
      .filter(q => q.dateSent)
      .sort((a, b) => new Date(b.dateSent).getTime() - new Date(a.dateSent).getTime());
  }, [queries]);

  const heroSubtitle = useMemo(() => {
    if (queries.length === 0) {
      return "Start logging your publisher query pitches to track progress.";
    }
    if (activeQueriesCount > 0) {
      const s = manuscriptsWithActiveQueriesCount === 1 ? "" : "s";
      return `${activeQueriesCount} active query${activeQueriesCount === 1 ? "" : "ies"} across ${manuscriptsWithActiveQueriesCount} manuscript${s}.`;
    }
    const lastSent = sentQueriesSorted[0];
    if (lastSent && lastSent.dateSent) {
      const formattedDate = new Date(lastSent.dateSent).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      return `Last query sent on ${formattedDate}. No active queries at the moment.`;
    }
    return "All dispatches resolved or archived.";
  }, [queries, activeQueriesCount, manuscriptsWithActiveQueriesCount, sentQueriesSorted]);

  // Section 2 Navigation Cards calculations
  const totalQueriesCount = queries.length;

  const overallResponseRate = useMemo(() => {
    if (queries.length === 0) return 0;
    const RESPONSE_RECEIVED_STATUSES = [
      QueryStatus.PARTIAL_REQUESTED,
      QueryStatus.PARTIAL_SENT,
      QueryStatus.FULL_REQUESTED,
      QueryStatus.FULL_SENT,
      QueryStatus.REVISE_RESUBMIT,
      QueryStatus.OFFER,
      QueryStatus.REJECTED,
      QueryStatus.WITHDRAWN,
      QueryStatus.NO_RESPONSE,
    ];
    const responsesReceived = queries.filter(q => 
      RESPONSE_RECEIVED_STATUSES.includes(q.status as QueryStatus)
    ).length;
    return Math.round((responsesReceived / queries.length) * 100);
  }, [queries]);

  // Section 3 Recent Queries
  const recentFiveQueries = useMemo(() => {
    return sentQueriesSorted.slice(0, 5);
  }, [sentQueriesSorted]);

  // Section 4 Querying Health metrics calculations
  const responseRate = overallResponseRate;

  const progressColor = useMemo(() => {
    if (responseRate > 30) return "#3B6D11"; // Green
    if (responseRate >= 10) return "#FAC775"; // Amber
    return "#CD4E46"; // Dark Red
  }, [responseRate]);

  const positiveRequestRate = useMemo(() => {
    if (queries.length === 0) return 0;
    
    // Check if query status is one of requests/offers, or has history of requests in activities
    const positiveQueryIds = new Set<string>();
    
    activities.forEach(act => {
      const desc = (act.description || "").toLowerCase();
      const match = (desc.includes("partial") && desc.includes("request")) ||
                    (desc.includes("full manuscript") && desc.includes("request")) ||
                    desc.includes("offer") ||
                    desc.includes("revise") ||
                    desc.includes("r&r");
      if (match && act.queryId) {
        positiveQueryIds.add(act.queryId);
      }
    });

    queries.forEach(q => {
      if ([
        QueryStatus.PARTIAL_REQUESTED, 
        QueryStatus.PARTIAL_SENT, 
        QueryStatus.FULL_REQUESTED, 
        QueryStatus.FULL_SENT, 
        QueryStatus.REVISE_RESUBMIT, 
        QueryStatus.OFFER
      ].includes(q.status)) {
        positiveQueryIds.add(q.id);
      }
    });

    return Math.round((positiveQueryIds.size / queries.length) * 100);
  }, [queries, activities]);

  const averageDaysToResponse = useMemo(() => {
    let totalDays = 0;
    let responsesCount = 0;

    queries.forEach(q => {
      if (!q.dateSent) return;
      const sentDate = new Date(q.dateSent);

      // Find first activity that occurred after sending (excluding current-second setup activities)
      const qActs = activities
        .filter(act => act.queryId === q.id)
        .map(act => new Date(act.date))
        .filter(d => d.getTime() > sentDate.getTime() + 1000)
        .sort((a, b) => a.getTime() - b.getTime());

      if (qActs.length > 0) {
        const firstResponseDate = qActs[0];
        const diffTime = firstResponseDate.getTime() - sentDate.getTime();
        const diffDays = Math.max(0, diffTime / (1000 * 60 * 60 * 24));
        totalDays += diffDays;
        responsesCount++;
      }
    });

    return responsesCount > 0 ? Math.round(totalDays / responsesCount) : 0;
  }, [queries, activities]);

  const nudgeReadyCount = useMemo(() => {
    const activeList = queries.filter(q => 
      ![QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE, QueryStatus.OFFER].includes(q.status)
    );

    return activeList.filter(q => {
      if (!q.responseDeadline) return false;
      const deadlinePassed = new Date(q.responseDeadline) < new Date();
      if (!deadlinePassed) return false;

      // Check if not nudged
      const hasNudgeAct = activities.some(act => 
        act.queryId === q.id && (act.description || "").toLowerCase().includes("nudge")
      );
      return !hasNudgeAct;
    }).length;
  }, [queries, activities]);

  // Circle progress bar maths
  const radius = 22;
  const stroke = 4;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffsetValue = circumference - (responseRate / 100) * circumference;

  const containerPaddingClass = "px-4 md:px-10 lg:px-14 xl:px-16";

  return (
    <div className="min-h-screen bg-[#F5F0EA] pb-16 font-sans text-[#3a1c14] overflow-x-hidden relative">
      
      {/* Undo Toast Window */}
      {undoToastInfo && (
        <div 
          className="fixed bottom-6 right-6 z-55 flex items-center justify-between gap-4 bg-[#3a1c14] text-[#F8F5F0] rounded-xl px-4.5 py-3 shadow-xl border border-white/10 animate-fade-in w-80 max-w-full font-sans text-xs select-none"
          id="undo-toast-window"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center font-mono font-bold text-[#FAC775]">
              {undoToastTimer}
            </div>
            <div>
              <p className="font-semibold">{undoToastInfo.agentName} updated</p>
              <p className="text-stone-400 text-[10px] mt-0.5">Moved to {undoToastInfo.newStatus}</p>
            </div>
          </div>
          <button 
            onClick={handleUndoStatusChange}
            className="text-amber-300 hover:text-amber-400 font-bold flex items-center gap-1.5 focus:outline-none transition-colors cursor-pointer"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>UNDO</span>
          </button>
        </div>
      )}

      {/* Hero section */}
      <div className="w-full bg-[#3a1c14] text-[#F8F5F0] relative overflow-hidden select-none mb-6">
        {/* Subtle background watercolor pattern grid */}
        <div className="absolute inset-0 bg-[#F8F5F0]/5 pointer-events-none" />

        {/* Paper airplane illustration watermark matching dashboard (INTERACTIVE WITH CUSTOM UPLOAD) */}
        <div className="absolute top-4 right-4 md:right-10 lg:right-14 xl:right-16 p-3 w-44 h-44 flex flex-col items-center justify-center z-20 group/img transition-all duration-300 ease-out transform">
          <input
            type="file"
            id="queries-image-input"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
          
          <label htmlFor="queries-image-input" className="relative w-full h-full block cursor-pointer select-none">
            {queriesImage ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  src={queriesImage}
                  alt="Custom welcome graphic"
                  style={{ transform: `translate(${queriesImageX}px, ${queriesImageY}px) scale(${queriesImageScale / 100})`, transformOrigin: 'center center' }}
                  className="object-contain w-full h-full rounded-xl opacity-80 hover:opacity-100 transition-all duration-300"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  src="/input_file_0.png"
                  alt="Paper plane watercolor sketch"
                  style={{ transform: `translate(${queriesImageX}px, ${queriesImageY}px) scale(${queriesImageScale / 100})`, transformOrigin: 'center center' }}
                  className="object-contain w-full h-full opacity-[0.08] group-hover/img:opacity-[0.25] transition-all duration-300"
                  referrerPolicy="no-referrer"
                />
                {/* Hover Overlay indicator to prompt upload */}
                <div className="absolute inset-0 bg-[#F8F5F0]/5 rounded-xl flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">
                  <span className="bg-[#3a1c14]/90 text-[#F8F5F0] text-[10px] font-semibold px-2.5 py-1.5 rounded-lg shadow-sm border border-white/20 flex items-center gap-1.5 hover:bg-[#3a1c14] transition-colors">
                    <Camera className="w-3.5 h-3.5 text-[#FAC775]" /> Choose Image
                  </span>
                </div>
              </div>
            )}
          </label>

          {/* Elegant builder floating bar - ONLY visible on hover */}
          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 bg-white/95 border border-[#EBDCD3] rounded-full px-3 py-1.5 shadow-md flex items-center gap-2.5 z-30 opacity-0 group-hover/img:opacity-100 transition-opacity pointer-events-auto whitespace-nowrap">
            {/* Positioning Section */}
            <div className="flex items-center gap-0.5 font-sans">
              <button
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleMoveLeft(); }}
                className="p-1 hover:bg-[#FAF1EF] text-stone-600 hover:text-[#7c3a2a] rounded transition-colors cursor-pointer"
                title="Move Left (X - 5px)"
                type="button"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-[9px] font-mono font-bold text-stone-500 min-w-[28px] text-center" title="Horizontal position offset">
                X:{queriesImageX}
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
                Y:{queriesImageY}
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
                {queriesImageScale}%
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

            {queriesImage && (
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

        <div className={`${containerPaddingClass} py-10 md:py-12 flex flex-col justify-center min-h-[190px] relative z-10`}>
          <div className="max-w-[65%]">
            <span className="text-[10px] uppercase font-mono tracking-widest text-[#FAC775] font-bold block mb-1">
              Right now
            </span>
            <h1 className="font-serif text-xl md:text-2xl font-normal text-[#F8F5F0] leading-snug tracking-tight">
              {headline}
            </h1>
            <p className="text-xs text-[#F8F5F0]/65 font-medium mt-1.5">
              {heroSubtitle}
            </p>

            <div className="flex flex-wrap gap-3 mt-5">
              {(urgentList.length > 0 || overdueList.length > 0) && (
                <button
                  onClick={() => onNavigate("dashboard")}
                  className="bg-[#FAC775] hover:bg-[#ebd0a3] text-[#412402] text-xs font-bold py-1.5 px-4 rounded-xl duration-150 flex items-center gap-1 cursor-pointer transition-all shadow-sm"
                >
                  <span>View urgent tasks</span>
                  <ChevronRight className="w-3.5 h-3.5 mt-0.5" />
                </button>
              )}
              <button
                onClick={() => onNavigate("queries", "All queries")}
                className="bg-transparent hover:bg-[#F8F5F0]/10 text-[#F8F5F0] border border-white/20 text-xs font-bold py-1.5 px-4 rounded-xl duration-150 flex items-center gap-0.5 cursor-pointer transition-all"
              >
                <span>Browse all queries</span>
                <ChevronRight className="w-3.5 h-3.5 mt-0.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Navigation Cards */}
      <div className={`${containerPaddingClass} mb-6`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {/* Card 1: All Queries */}
          <div 
            onClick={() => onNavigate("queries", "All queries")}
            className="bg-white border border-[#EBDCD3] border-t-4 border-t-[#7c3a2a] rounded-2xl p-4 cursor-pointer hover:bg-[#FBF6F4] hover:border-[#7c3a2a] transition-all flex flex-col justify-between h-40 group"
          >
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-[#3a1c14] group-hover:text-[#7c3a2a] transition-colors leading-tight">All queries</h3>
                <FileSpreadsheet className="w-4 h-4 text-[#7c3a2a]/40" />
              </div>
              <p className="text-xs text-stone-500 leading-normal mt-1.5">Browse and filter your full submission history</p>
            </div>
            <div className="self-start">
              <span className="inline-flex items-center py-0.5 px-2.5 bg-stone-100 text-stone-700 rounded-full font-mono text-[10px] font-bold">
                {totalQueriesCount} dispatches
              </span>
            </div>
          </div>

          {/* Card 2: Query Board */}
          <div 
            onClick={() => onNavigate("queries", "Queries database")}
            className="bg-white border border-[#EBDCD3] border-t-4 border-t-[#7c3a2a] rounded-2xl p-4 cursor-pointer hover:bg-[#FBF6F4] hover:border-[#7c3a2a] transition-all flex flex-col justify-between h-40 group"
          >
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-[#3a1c14] group-hover:text-[#7c3a2a] transition-colors leading-tight">Query board</h3>
                <LayoutGrid className="w-4 h-4 text-[#7c3a2a]/40" />
              </div>
              <p className="text-xs text-stone-500 leading-normal mt-1.5">Visual pipeline view by status stage</p>
            </div>
            <div className="self-start">
              <span className="inline-flex items-center py-0.5 px-2.5 bg-amber-50 text-amber-800 rounded-full font-mono text-[10px] font-bold border border-amber-100">
                {activeQueriesCount} active
              </span>
            </div>
          </div>

          {/* Card 3: Analytics */}
          <div 
            onClick={() => onNavigate("queries", "Querying analytics")}
            className="bg-white border border-[#EBDCD3] border-t-4 border-t-[#7c3a2a] rounded-2xl p-4 cursor-pointer hover:bg-[#FBF6F4] hover:border-[#7c3a2a] transition-all flex flex-col justify-between h-40 group"
          >
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-[#3a1c14] group-hover:text-[#7c3a2a] transition-colors leading-tight">Analytics</h3>
                <BarChart3 className="w-4 h-4 text-[#7c3a2a]/40" />
              </div>
              <p className="text-xs text-stone-500 leading-normal mt-1.5">Response rates, trends and insights</p>
            </div>
            <div className="self-start">
              <span className="inline-flex items-center py-0.5 px-2.5 bg-emerald-50 text-emerald-800 rounded-full font-mono text-[10px] font-bold border border-emerald-100">
                {overallResponseRate}% feedback
              </span>
            </div>
          </div>

          {/* Card 4: Send a Query */}
          <div 
            onClick={() => onNavigate("queries", "Send a query")}
            className="bg-white border border-[#EBDCD3] border-t-4 border-t-[#7c3a2a] rounded-2xl p-4 cursor-pointer hover:bg-[#FBF6F4] hover:border-[#7c3a2a] transition-all flex flex-col justify-between h-40 group"
          >
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-[#3a1c14] group-hover:text-[#7c3a2a] transition-colors leading-tight">Send a query</h3>
                <Plus className="w-4 h-4 text-[#7c3a2a]" />
              </div>
              <p className="text-xs text-stone-500 leading-normal mt-1.5">Record a new agent submission</p>
            </div>
            <div className="self-flex-start">
              <span className="inline-flex items-center py-0.5 px-2.5 bg-[#7c3a2a] text-white rounded-full font-sans text-[9px] font-extrabold uppercase tracking-wide">
                Quick action
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Recent Queries Strip */}
      <div className={`${containerPaddingClass} mb-6`}>
        <div className="bg-white border border-[#EBDCD3] rounded-2xl p-4.5 shadow-xs">
          <span className="block text-[10px] font-mono tracking-widest text-[#7c3a2a]/65 uppercase font-bold mb-3 select-none">
            Recent queries
          </span>

          {recentFiveQueries.length === 0 ? (
            <div className="bg-[#FCFAF7] border border-stone-200/40 rounded-xl p-8 text-center" id="empty-recent-queries">
              <BookOpen className="w-8 h-8 text-stone-300 mx-auto mb-2" />
              <p className="text-xs text-stone-500 italic">You have no sent queries yet. Log your first query dispatch to populate this timeline.</p>
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2 min-w-0" id="recent-queries-scroller">
              {recentFiveQueries.map((q) => {
                const agent = agents.find(a => a.id === q.agentId);
                const ms = manuscripts.find(m => m.id === q.manuscriptId);
                const formattedDate = q.dateSent 
                  ? new Date(q.dateSent).toLocaleDateString("en-US", { month: "short", day: "numeric" }) 
                  : "unknown";

                return (
                  <div 
                    key={q.id}
                    onClick={() => {
                      setSelectedQueryIdForPanel(q.id);
                      setIsQueryPanelOpen(true);
                    }}
                    className="min-w-[220px] max-w-[220px] bg-[#FCFAF7] border border-stone-200/50 rounded-xl p-3.5 cursor-pointer hover:bg-[#FBF6F4] hover:border-[#7c3a2a] transition-all hover:-translate-y-0.5 shrink-0 flex flex-col justify-between h-36"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-[#3a1c14] truncate">{agent?.name || "Unmapped Agent"}</h4>
                      <p className="text-[10px] text-stone-400 font-medium font-mono truncate mb-1.5">{agent?.agency || "Independent"}</p>
                      <p className="text-[11px] text-[#7c3a2a] font-serif italic truncate">"{ms?.title || "Untitled Draft"}"</p>
                    </div>
                    <div className="flex items-center justify-between border-t border-stone-100 pt-2 text-[10px]">
                      <span className="text-stone-400 font-mono">Sent {formattedDate}</span>
                      <span className="font-mono font-semibold tracking-wider uppercase text-[8px] bg-white px-2 py-0.5 rounded-full border border-stone-200 text-[#3a1c14]/80">
                        {q.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Section 4: Querying Health Summary */}
      <div className={`${containerPaddingClass} mb-6`}>
        <div className="bg-[#FBF6F4] border border-[#EBDCD3] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#EBDCD3]/50 pb-3 mb-4 select-none">
            <span className="block text-[10px] font-mono tracking-widest text-[#7c3a2a]/65 uppercase font-bold">
              Querying health
            </span>
            <span className="text-[10px] font-mono text-stone-400">
              Based on your query history
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {/* Metric 1: Response Rate */}
            <div className="flex items-center justify-between bg-white/40 rounded-xl p-4 border border-stone-200/30">
              <div>
                <span className="text-[10px] font-mono text-stone-400 uppercase block font-medium">Response Rate</span>
                <span className="text-2xl font-mono font-bold text-stone-800 tracking-tight block mt-1">{responseRate}%</span>
                <span className="text-[9.5px] text-stone-400 mt-0.5 block">Resolved vs. sent</span>
              </div>
              
              <div className="relative flex items-center justify-center w-12 h-12 select-none">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    className="text-stone-200/50"
                    strokeWidth={stroke}
                    stroke="currentColor"
                    fill="transparent"
                    r={normalizedRadius}
                    cx={radius + stroke}
                    cy={radius + stroke}
                  />
                  <circle
                    stroke={progressColor}
                    strokeWidth={stroke}
                    strokeDasharray={circumference + " " + circumference}
                    style={{ strokeDashoffset: strokeDashoffsetValue }}
                    strokeLinecap="round"
                    fill="transparent"
                    r={normalizedRadius}
                    cx={radius + stroke}
                    cy={radius + stroke}
                  />
                </svg>
                <span className="absolute text-[10px] font-mono font-bold text-stone-700">{responseRate}%</span>
              </div>
            </div>

            {/* Metric 2: Positive Request Rate */}
            <div className="flex flex-col justify-between bg-white/40 rounded-xl p-4 border border-stone-200/30">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono text-stone-400 uppercase block font-medium">Positive Rate</span>
                  <span className="text-2xl font-mono font-bold text-stone-800 tracking-tight block mt-1">{positiveRequestRate}%</span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
                  <ThumbsUp className="w-4 h-4" />
                </div>
              </div>
              <span className="text-[9.5px] text-stone-450 mt-1 block leading-normal text-stone-400">Partials, Fulls, offers & R&Rs</span>
            </div>

            {/* Metric 3: Average Days to First Response */}
            <div className="flex flex-col justify-between bg-white/40 rounded-xl p-4 border border-stone-200/30">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono text-stone-400 uppercase block font-medium">Average Response</span>
                  <span className="text-2xl font-mono font-bold text-stone-800 tracking-tight block mt-1">
                    {averageDaysToResponse > 0 ? `${averageDaysToResponse} days` : "—"}
                  </span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <span className="text-[9.5px] text-stone-450 mt-1 block leading-normal text-stone-400">Time to first timeline activity</span>
            </div>

            {/* Metric 4: Nudge-ready count */}
            <div className="flex flex-col justify-between bg-white/40 rounded-xl p-4 border border-stone-200/30">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono text-stone-400 uppercase block font-medium">Nudge-Ready</span>
                  <span className="text-2xl font-mono font-bold text-stone-800 tracking-tight block mt-1">{nudgeReadyCount}</span>
                </div>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${
                  nudgeReadyCount > 0 
                    ? "bg-amber-100 text-amber-700 border-amber-200 animate-pulse" 
                    : "bg-stone-50 text-stone-400 border-stone-200"
                }`}>
                  <AlertCircle className="w-4 h-4" />
                </div>
              </div>
              <span className="text-[9.5px] text-stone-400 mt-1 block leading-normal">Past response deadline without nudge</span>
            </div>
          </div>
        </div>
      </div>

      {/* Section 5: Querying Tip */}
      <div className={`${containerPaddingClass} mb-6`}>
        {selectedTip && (
          <div className="w-full bg-[#FBF6F4] border border-dashed border-[#EBDCD3] rounded-2xl p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-5 relative">
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-[#FAF1EF] text-[#7c3a2a] rounded-xl border border-[#7c3a2a]/10 shrink-0 flex items-center justify-center h-10 w-10">
                <Lightbulb className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-[#7c3a2a]/70 block mb-0.5 select-none">
                  Querying Tip
                </span>
                <blockquote className="font-serif italic text-[#3a1c14] text-[13px] leading-relaxed max-w-2xl">
                  "{selectedTip.fact}"
                </blockquote>
              </div>
            </div>
            <div className="text-[10px] font-mono text-stone-450 text-right shrink-0 mt-2 md:mt-0 select-none flex items-center justify-end gap-1.5 opacity-60">
              <span>— {selectedTip.title}</span>
            </div>
          </div>
        )}
      </div>

      {/* Section 6: Manuscripts Overview */}
      <div className={`${containerPaddingClass} pb-6`}>
        <div className="bg-white border border-[#EBDCD3] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#EBDCD3]/50 pb-3.5 mb-5">
            <span className="block text-[10px] font-mono tracking-widest text-[#7c3a2a]/65 uppercase font-bold select-none">
              Your manuscripts
            </span>
            <button
              onClick={() => onNavigate("manuscripts", "Add a manuscript")}
              className="bg-[#FAF1EF] hover:bg-[#ebd0a3]/20 text-[#7c3a2a] border border-[#7c3a2a]/10 font-bold text-xs py-1.5 px-3.5 rounded-xl transition-all duration-150 flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add manuscript</span>
            </button>
          </div>

          {manuscripts.length === 0 ? (
            <div className="text-center py-12" id="empty-manuscripts-deck">
              <Book className="w-10 h-10 text-stone-300 mx-auto mb-2" />
              <p className="text-xs text-stone-500 italic">No manuscripts registered yet. Begin tracking your projects now.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" id="manuscripts-cards-grid">
              {manuscripts.map((ms) => {
                const msQueries = queries.filter(q => q.manuscriptId === ms.id);
                const counts = {
                  total: msQueries.length,
                  pending: msQueries.filter(q => [QueryStatus.QUERIED, QueryStatus.PARTIAL_SENT, QueryStatus.FULL_SENT].includes(q.status)).length,
                  requests: msQueries.filter(q => [QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED].includes(q.status)).length,
                  offers: msQueries.filter(q => q.status === QueryStatus.OFFER).length
                };

                return (
                  <div 
                    key={ms.id}
                    onClick={() => {
                      localStorage.setItem("scriptally_active_manuscript_id", ms.id);
                      onNavigate("manuscripts");
                    }}
                    className="bg-[#FCFAF7] border border-stone-200/50 hover:border-[#7c3a2a] rounded-2xl p-4.5 cursor-pointer hover:bg-[#FBF6F4] transition-all duration-150 flex flex-col justify-between hover:-translate-y-0.5 group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2.5 mb-2 select-none">
                        <span className="font-mono text-[9px] font-bold text-[#7c3a2a]/70 bg-[#7c3a2a]/5 border border-[#7c3a2a]/10 rounded px-2 py-0.5">
                          {ms.genre}
                        </span>
                        <span className="font-mono text-[9px] font-extrabold tracking-wide uppercase bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-md px-2 py-0.5">
                          {ms.status}
                        </span>
                      </div>
                      
                      <h4 className="font-serif text-[14px] font-bold text-[#3a1c14] group-hover:text-[#7c3a2a] transition-colors leading-tight">
                        {ms.title}
                      </h4>
                      <p className="text-[11px] text-stone-500 line-clamp-2 mt-1.5 mb-4 leading-normal font-light">
                        {ms.logline || "No logline established."}
                      </p>
                    </div>

                    <div className="border-t border-stone-200/40 pt-3 mt-1.5 font-mono text-[10px] flex items-center justify-between text-stone-500">
                      <div>
                        <span className="text-[9.5px] block font-light text-stone-400">WORDS</span>
                        <span className="font-semibold text-stone-700">{ms.wordCount.toLocaleString()}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9.5px] block font-light text-stone-400">DISPATCHES</span>
                        <div className="space-x-1.5 text-stone-600 block text-[9.5px] mt-0.5">
                          <span>{counts.total} tot</span>
                          <span>•</span>
                          <span className="text-amber-750">{counts.pending} pend</span>
                          <span>•</span>
                          <span className="text-indigo-650">{counts.requests} req</span>
                          <span>•</span>
                          <span className="text-emerald-750 font-bold">{counts.offers} off</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Query Detail Slide-in Panel Rendering Block (Unified tracking details view) */}
      <QuerySlideInPanel
        isOpen={isQueryPanelOpen}
        queryId={selectedQueryIdForPanel}
        onClose={() => {
          setIsQueryPanelOpen(false);
          setSelectedQueryIdForPanel(null);
        }}
        onNavigate={onNavigate}
        onSaveStatusChange={handleSaveStatusChange}
        onRecordResponse={(qid) => setRecordResponseQueryId(qid)}
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

    </div>
  );
};
