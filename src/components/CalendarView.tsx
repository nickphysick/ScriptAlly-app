/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useScriptAllyDb } from "../lib/db";
import { QueryStatus } from "../types";
import {
  Calendar,
  X,
  BookOpen,
  ArrowRight
} from "lucide-react";

interface CalendarViewProps {
  onNavigate: (tab: string, subPageName?: string) => void;
  isDashboard?: boolean;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ onNavigate, isDashboard = false }) => {
  const { queries, agents, manuscripts, activities } = useScriptAllyDb();

  // Baseline "Today" context matching user's additional metadata current date (June 5, 2026)
  const sysToday = new Date("2026-06-05T17:14:25Z");

  // Date context representing the navigated month/week/day view anchor
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date(sysToday));
  const [viewMode, setViewMode] = useState<"Month" | "Week" | "List">("Month");
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [popoverDay, setPopoverDay] = useState<Date | null>(null);

  const [filters, setFilters] = useState<{ [key: string]: boolean }>({
    "Query sent": true,
    "Response expected": true,
    "Nudge reminder": true,
    "Pages requested": true,
    "Rejected": true,
  });

  // Automatically scroll Today center into view on load if in Week or Month view
  useEffect(() => {
    const timer = setTimeout(() => {
      document.getElementById("today-cell")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 200);
    return () => clearTimeout(timer);
  }, [viewMode, currentDate]);

  const getDayMidnight = (d: Date) => {
    const temp = new Date(d);
    temp.setHours(0, 0, 0, 0);
    return temp.getTime();
  };

  const getStatusDot = (status: string) => {
    if (status === "Partial Requested") {
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" className="shrink-0">
          <circle cx="7" cy="7" r="5" fill="none" stroke="#7c3d3d" strokeWidth="1.5"/><path d="M7 2 A5 5 0 0 1 10.76 4.5 L7 7 Z" fill="#7c3d3d"/>
        </svg>
      );
    }
    if (status === "Partial Sent") {
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" className="shrink-0">
          <circle cx="7" cy="7" r="5" fill="none" stroke="#7c3d3d" strokeWidth="1.5"/><path d="M7 2 A5 5 0 0 1 12 7 L7 7 Z" fill="#7c3d3d"/>
        </svg>
      );
    }
    if (status === "Full Requested") {
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" className="shrink-0">
          <circle cx="7" cy="7" r="5" fill="none" stroke="#7c3d3d" strokeWidth="1.5"/><path d="M7 2 A5 5 0 0 1 12 7 A5 5 0 0 1 7 12 L7 7 Z" fill="#7c3d3d"/>
        </svg>
      );
    }
    if (status === "Full Sent") {
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" className="shrink-0">
          <circle cx="7" cy="7" r="5" fill="none" stroke="#7c3d3d" strokeWidth="1.5"/><path d="M7 2 A5 5 0 0 1 12 7 A5 5 0 0 1 3.24 9.5 L7 7 Z" fill="#7c3d3d"/>
        </svg>
      );
    }
    if (status === "Revise & Resubmit") {
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" className="shrink-0">
          <circle cx="7" cy="7" r="5" fill="none" stroke="#7c3d3d" strokeWidth="1.5"/><path d="M7 2 A5 5 0 0 1 12 7 A5 5 0 0 1 2 7 A5 5 0 0 1 5.5 2.67 L7 7 Z" fill="#7c3d3d"/>
        </svg>
      );
    }
    if (status === "Offer") {
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" className="shrink-0">
          <circle cx="7" cy="7" r="5" fill="#7c3d3d" stroke="#7c3d3d" strokeWidth="1.5"/>
        </svg>
      );
    }
    if (status === "Rejected" || status === "Withdrawn" || status === "No Response") {
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" className="shrink-0">
          <circle cx="7" cy="7" r="5" fill="#888888" stroke="#888888" strokeWidth="1.5"/><line x1="4.5" y1="4.5" x2="9.5" y2="9.5" stroke="#ffffff" strokeWidth="1.5"/><line x1="9.5" y1="4.5" x2="4.5" y2="9.5" stroke="#ffffff" strokeWidth="1.5"/>
        </svg>
      );
    }
    // Default is "Queried"
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" className="shrink-0">
        <circle cx="7" cy="7" r="5" fill="none" stroke="#7c3d3d" strokeWidth="1.5" />
      </svg>
    );
  };

  // Derive calendar events from existing query records
  const deriveEvents = () => {
    const eventsList: any[] = [];
    const sysMidnight = getDayMidnight(sysToday);

    queries.forEach((q) => {
      const agent = agents.find((a) => a.id === q.agentId);
      const ms = manuscripts.find((m) => m.id === q.manuscriptId);
      const agentName = agent ? agent.name : "Unknown Agent";
      const agentAgency = agent ? agent.agency : "Unknown Agency";
      const agentEmail = agent ? agent.email : "No Email";
      const manuscriptTitle = ms ? ms.title : "Project";
      const msGenre = ms ? ms.genre : "Unknown Genre";
      const msWordCount = ms ? ms.wordCount : 0;

      // 1. Query sent → appears on dateSent/sentAt date if in past/today
      const querySentDateStr = q.dateSent || (q as any).sentAt;
      if (querySentDateStr) {
        const d = new Date(querySentDateStr);
        if (getDayMidnight(d) <= sysMidnight) {
          eventsList.push({
            id: `${q.id}-sent`,
            queryId: q.id,
            date: d,
            type: "Query sent",
            filterType: "Query sent",
            agentName,
            agentAgency,
            agentEmail,
            manuscriptTitle,
            msGenre,
            msWordCount,
            subLabel: "Query sent",
            description: "Manuscript query letter dispatched to the agent."
          });
        }
      }

      // 2. Response expected → appears on expected date if in future
      const expectedDateStr = q.responseDeadline || (q as any).expectedResponseDate;
      if (expectedDateStr) {
        const d = new Date(expectedDateStr);
        if (getDayMidnight(d) > sysMidnight) {
          eventsList.push({
            id: `${q.id}-expected`,
            queryId: q.id,
            date: d,
            type: "Response expected",
            filterType: "Response expected",
            agentName,
            agentAgency,
            agentEmail,
            manuscriptTitle,
            msGenre,
            msWordCount,
            subLabel: "Response expected",
            description: "Implicit deadline or expected communication timeline response target."
          });
        }
      }

      // 3. Nudge reminder → appears on nudgeDate if set and in future
      if (q.nudgeDate) {
        const d = new Date(q.nudgeDate);
        if (getDayMidnight(d) > sysMidnight) {
          eventsList.push({
            id: `${q.id}-nudge`,
            queryId: q.id,
            date: d,
            type: "Nudge reminder",
            filterType: "Nudge reminder",
            agentName,
            agentAgency,
            agentEmail,
            manuscriptTitle,
            msGenre,
            msWordCount,
            subLabel: "Nudge reminder",
            description: "Follow-up nudge reminder trigger date."
          });
        }
      }

      // 3b. Materials send deadline (defined by expectedSendDate)
      const expectedSendDateStr = q.expectedSendDate;
      if (expectedSendDateStr) {
        const d = (expectedSendDateStr.toDate && typeof expectedSendDateStr.toDate === "function") 
          ? expectedSendDateStr.toDate() 
          : (expectedSendDateStr.seconds ? new Date(expectedSendDateStr.seconds * 1000) : new Date(expectedSendDateStr));
        if (!isNaN(d.getTime()) && getDayMidnight(d) > sysMidnight) {
          eventsList.push({
            id: `${q.id}-expected-send-deadline`,
            queryId: q.id,
            date: d,
            type: "Material send deadline",
            filterType: "Pages requested",
            agentName,
            agentAgency,
            agentEmail,
            manuscriptTitle,
            msGenre,
            msWordCount,
            subLabel: "Material send deadline",
            description: "Target date to submit the requested manuscript materials to the agent."
          });
        }
      }

      // 4. Partial requested → appears on partialRequestedDate if set and in past/today
      if (q.partialRequestedDate) {
        const d = new Date(q.partialRequestedDate);
        if (getDayMidnight(d) <= sysMidnight) {
          eventsList.push({
            id: `${q.id}-part-req`,
            queryId: q.id,
            date: d,
            type: "Partial requested",
            filterType: "Pages requested",
            agentName,
            agentAgency,
            agentEmail,
            manuscriptTitle,
            msGenre,
            msWordCount,
            subLabel: "Partial requested",
            description: "The agent made a request for partial manuscript materials."
          });
        }
      }

      // 5. Partial sent → appears on partialSentDate if set and in past/today
      if (q.partialSentDate) {
        const d = new Date(q.partialSentDate);
        if (getDayMidnight(d) <= sysMidnight) {
          eventsList.push({
            id: `${q.id}-part-sent`,
            queryId: q.id,
            date: d,
            type: "Partial sent",
            filterType: "Pages requested",
            agentName,
            agentAgency,
            agentEmail,
            manuscriptTitle,
            msGenre,
            msWordCount,
            subLabel: "Partial sent",
            description: "Partial draft chapters or requested materials uploaded and sent."
          });
        }
      }

      // 6. Full requested → appears on fullRequestedDate if set and in past/today
      if (q.fullRequestedDate) {
        const d = new Date(q.fullRequestedDate);
        if (getDayMidnight(d) <= sysMidnight) {
          eventsList.push({
            id: `${q.id}-full-req`,
            queryId: q.id,
            date: d,
            type: "Full requested",
            filterType: "Pages requested",
            agentName,
            agentAgency,
            agentEmail,
            manuscriptTitle,
            msGenre,
            msWordCount,
            subLabel: "Full requested",
            description: "The agent requested the full package manuscripts or versions."
          });
        }
      }

      // 7. Full sent → appears on fullSentDate if set and in past/today
      if (q.fullSentDate) {
        const d = new Date(q.fullSentDate);
        if (getDayMidnight(d) <= sysMidnight) {
          eventsList.push({
            id: `${q.id}-full-sent`,
            queryId: q.id,
            date: d,
            type: "Full sent",
            filterType: "Pages requested",
            agentName,
            agentAgency,
            agentEmail,
            manuscriptTitle,
            msGenre,
            msWordCount,
            subLabel: "Full sent",
            description: "The complete materials and full novel manuscript completed and sent."
          });
        }
      }

      // 8. Rejected / Withdrawn / No response → appears on state changed date if in past/today
      if (q.status === "Rejected" || q.status === "Withdrawn" || q.status === "No Response" || q.status === "Passed") {
        const qActs = activities.filter(
          (act) => act.queryId === q.id && act.activityType === "Status Changed"
        );
        const matchedAct = qActs.find(
          (act) =>
            act.description?.toLowerCase().includes("reject") ||
            act.description?.toLowerCase().includes("withdr") ||
            act.description?.toLowerCase().includes("no response") ||
            act.description?.toLowerCase().includes("passed") ||
            act.details?.toLowerCase().includes("closed")
        );

        const passDate = matchedAct
          ? new Date(matchedAct.date)
          : q.responseDeadline
          ? new Date(q.responseDeadline)
          : new Date(q.dateSent);

        if (getDayMidnight(passDate) <= sysMidnight) {
          let passedVal = "Rejected";
          if (q.status === "Withdrawn") passedVal = "Withdrawn";
          else if (q.status === "No Response") passedVal = "No response";

          eventsList.push({
            id: `${q.id}-passed`,
            queryId: q.id,
            date: passDate,
            type: passedVal,
            filterType: "Rejected",
            agentName,
            agentAgency,
            agentEmail,
            manuscriptTitle,
            msGenre,
            msWordCount,
            subLabel: q.status,
            description: `Query closed via status update: ${q.status}.`
          });
        }
      }
    });

    return eventsList;
  };

  const allEvents = deriveEvents();
  const filteredEvents = allEvents.filter((ev) => filters[ev.filterType]);

  const isSameDay = (d1: Date, d2: Date) => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const getEventsForDay = (day: Date) => {
    return filteredEvents.filter((e) => isSameDay(e.date, day));
  };

  // Event Card Style lookup map based on "Event visual system"
  const getEventVisualProps = (ev: any) => {
    const eventTime = getDayMidnight(ev.date);
    const todayTime = getDayMidnight(sysToday);
    const isPast = eventTime <= todayTime;

    // Default fallbacks
    let bg = "bg-[#FAF1EF]";
    let nameColor = "text-[#3a1c14]";
    let borderStyle = "border border-[#e8d5cc]";
    let tagBg = "rgba(124,58,42,0.1)";
    let tagTextClass = "text-[#7c3a2a]";
    let tagLabel = ev.type; // Matches ev.type exactly (e.g. "Query sent")
    let dotElement: React.ReactNode = null;

    if (isPast) {
      const query = queries.find((q) => q.id === ev.queryId);
      const queryStatus = query ? query.status : "Queried";
      dotElement = getStatusDot(queryStatus);

      if (ev.type === "Query sent") {
        bg = "bg-[#FAF1EF]";
        borderStyle = "border border-[#e8d5cc]";
        nameColor = "text-[#3a1c14]";
        tagBg = "rgba(124,58,42,0.1)";
        tagTextClass = "text-[#7c3a2a]";
      } else if (ev.type === "Partial requested" || ev.type === "Partial sent") {
        bg = "bg-[#F2DDD8]";
        borderStyle = "border border-[#dbbdb5]";
        nameColor = "text-[#3a1c14]";
        tagBg = "rgba(90,32,16,0.1)";
        tagTextClass = "text-[#5a2010]";
      } else if (ev.type === "Full requested" || ev.type === "Full sent") {
        bg = "bg-[#3a1c14]";
        borderStyle = "border border-[#2a1008]";
        nameColor = "text-[#F8F5F0]";
        tagBg = "rgba(248,245,240,0.12)";
        tagTextClass = "text-[rgba(248,245,240,0.8)]";
      } else if (ev.type === "Rejected" || ev.type === "Withdrawn" || ev.type === "No response") {
        bg = "bg-[#F0EAE6]";
        borderStyle = "border border-[#e0d0c8]";
        nameColor = "text-[#a08070]";
        tagBg = "rgba(160,128,112,0.1)";
        tagTextClass = "text-[#a08070]";
      }
    } else {
      // Future
      if (ev.type === "Response expected") {
        // Future passive
        bg = "bg-[#FDFAF8]";
        borderStyle = "border-[1.5px] border-dashed border-[#c9a89e]";
        nameColor = "text-[#7c4a3a]";
        tagBg = "rgba(124,58,42,0.08)";
        tagTextClass = "text-[#7c3a2a]";
        dotElement = (
          <svg width="14" height="14" viewBox="0 0 14 14" className="shrink-0">
            <circle cx="7" cy="7" r="5" stroke="#c9a89e" strokeWidth="1.5" fill="none" />
          </svg>
        );
      } else if (ev.type === "Nudge reminder") {
        // Future active
        bg = "bg-[#FDFAF8]";
        borderStyle = "border-[1.5px] border-dashed border-[#dbbdb5]";
        nameColor = "text-[#9a6858]";
        tagBg = "rgba(154,104,88,0.1)";
        tagTextClass = "text-[#9a6858]";
        dotElement = (
          <span className="font-bold text-[15px] text-[#c9a89e] shrink-0 w-[14px] leading-none flex items-center justify-center">
            !
          </span>
        );
      }
    }

    return {
      bg,
      nameColor,
      borderStyle,
      tagBg,
      tagTextClass,
      tagLabel,
      dot: dotElement,
    };
  };

  // Navigations helpers (local state only as requested)
  const handlePrev = () => {
    const nextDate = new Date(currentDate);
    if (viewMode === "Month" || viewMode === "List") {
      nextDate.setMonth(currentDate.getMonth() - 1);
    } else {
      nextDate.setDate(currentDate.getDate() - 7);
    }
    setCurrentDate(nextDate);
  };

  const handleNext = () => {
    const nextDate = new Date(currentDate);
    if (viewMode === "Month" || viewMode === "List") {
      nextDate.setMonth(currentDate.getMonth() + 1);
    } else {
      nextDate.setDate(currentDate.getDate() + 7);
    }
    setCurrentDate(nextDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date(sysToday));
  };

  // Grid date generation
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Mon=0 ... Sun=6 start padding logic
  const getGridDays = () => {
    const firstDay = new Date(year, month, 1);
    // JS getDay(): Sun=0, Mon=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat=6
    // We want Mon=0, Tue=1, ..., Sun=6
    const startPadding = (firstDay.getDay() + 6) % 7;
    const gridStartDate = new Date(year, month, 1 - startPadding);

    const days: Date[] = [];
    // 42 days grid is standard (6 weeks) to show consecutive calendar months cleanly
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStartDate);
      d.setDate(gridStartDate.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const getWeekDays = () => {
    const currentDayOfWeek = (currentDate.getDay() + 6) % 7;
    const weekStartDate = new Date(currentDate);
    weekStartDate.setDate(currentDate.getDate() - currentDayOfWeek);

    const weekDays: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStartDate);
      d.setDate(weekStartDate.getDate() + i);
      weekDays.push(d);
    }
    return weekDays;
  };

  // List group view sorting
  const getListGroupedEvents = () => {
    const upcomingEvents = filteredEvents
      .filter((e) => {
        const eventDay = new Date(e.date);
        eventDay.setHours(0, 0, 0, 0);
        const comparisonDay = new Date(currentDate);
        comparisonDay.setHours(0, 0, 0, 0);
        return eventDay.getTime() >= comparisonDay.getTime();
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    const groupedEvents: { [dateStr: string]: { date: Date; events: any[] } } = {};
    upcomingEvents.forEach((e) => {
      const dateStr = e.date.toDateString();
      if (!groupedEvents[dateStr]) {
        groupedEvents[dateStr] = { date: e.date, events: [] };
      }
      groupedEvents[dateStr].events.push(e);
    });

    return Object.keys(groupedEvents)
      .map((key) => groupedEvents[key])
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  const gridDays = getGridDays();
  const weekDays = getWeekDays();
  const groupedList = getListGroupedEvents();

  const formattedMonthTitle = currentDate.toLocaleString("en-US", {
    month: "long",
    year: "numeric"
  });

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className={isDashboard ? "w-full bg-white transition-all duration-300" : "min-h-[calc(100vh-64px)] w-full bg-[#F5F0EA] p-[20px] px-[24px]"}>
      <div className={isDashboard ? "flex flex-col gap-3" : "max-w-7xl mx-auto flex flex-col gap-3"}>
        
        {/* ==================== TOOLBAR ==================== */}
        <div className="flex flex-row items-center justify-between gap-[8px] w-full bg-transparent select-none">
          {/* Left Group */}
          <div className="flex items-center gap-[8px]" style={{ flex: 1 }}>
            <button
              onClick={handlePrev}
              className="w-[28px] h-[28px] flex items-center justify-center rounded-[6px] border border-[#e8d5cc] bg-[#FFFDF9] text-[#7c3a2a] hover:bg-[#FAF1EF] active:scale-95 transition-all cursor-pointer shadow-3xs"
              title="Previous target"
            >
              <i className="ti ti-chevron-left" style={{ fontSize: "13px" }} />
            </button>
            
            <h2 className="font-serif text-[20px] font-medium text-[#3a1c14] min-w-[150px] text-center capitalize leading-none select-text">
              {viewMode === "Week"
                ? `Week of ${weekDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                : formattedMonthTitle}
            </h2>

            <button
              onClick={handleNext}
              className="w-[28px] h-[28px] flex items-center justify-center rounded-[6px] border border-[#e8d5cc] bg-[#FFFDF9] text-[#7c3a2a] hover:bg-[#FAF1EF] active:scale-95 transition-all cursor-pointer shadow-3xs"
              title="Next target"
            >
              <i className="ti ti-chevron-right" style={{ fontSize: "13px" }} />
            </button>

            <button
              onClick={handleToday}
              className="text-[11px] px-[12px] py-[5px] border border-[#e8d5cc] rounded-[6px] bg-[#FAF1EF] text-[#7c3a2a] font-medium hover:bg-[#FAF1EF]/75 active:scale-95 transition-all cursor-pointer shadow-3xs leading-none"
            >
              Today
            </button>
          </div>

          {/* Right Group */}
          <div className="flex items-center gap-[8px] shrink-0">
            
            {/* Filter Dropdown Toggle Button */}
            <div className="relative">
              <button
                id="filter-dropdown-btn"
                onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                className="flex items-center gap-1.5 text-[11px] px-[12px] py-[5px] border border-[#e8d5cc] rounded-[6px] bg-[#FFFDF9] text-[#a08070] font-sans active:scale-95 transition-all cursor-pointer shadow-3xs leading-none"
              >
                <i className="ti ti-adjustments-horizontal" style={{ fontSize: "12px" }} />
                <span className="font-semibold">Filter</span>
                <i className="ti ti-chevron-down" style={{ fontSize: "10px" }} />
              </button>

              {/* Filter dropdown panel */}
              {isFilterDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40 bg-transparent" 
                    onClick={() => setIsFilterDropdownOpen(false)} 
                  />
                  <div 
                    className="absolute right-0 top-[34px] bg-[#FFFDF9] border border-[#e8d5cc] rounded-2xl p-2 min-w-[190px] z-50 shadow-md flex flex-col gap-1"
                  >
                    <span className="text-[10px] uppercase font-bold text-stone-400 px-2.5 py-1 font-mono tracking-wider text-left">
                      Event Categories
                    </span>

                    {/* Filter row: Query sent */}
                    <div
                      onClick={() => setFilters({ ...filters, "Query sent": !filters["Query sent"] })}
                      className="flex items-center justify-between gap-3 p-1.5 px-2.5 rounded-lg text-xs font-semibold text-[#3a1c14] hover:bg-[#FAF1EF] cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div className="bg-[#FAF1EF] border border-[#e8d5cc] rounded w-5 h-5 flex items-center justify-center shrink-0">
                          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                            <circle cx="7" cy="7" r="5" fill="none" stroke="#7c3d3d" strokeWidth="1.5" />
                          </svg>
                        </div>
                        <span>Query sent</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={filters["Query sent"]}
                        readOnly
                        className="w-3.5 h-3.5 rounded text-[#7c3a2a] focus:ring-[#7c3a2a]/35 cursor-pointer accent-[#7c3a2a]"
                      />
                    </div>

                    {/* Filter row: Response expected */}
                    <div
                      onClick={() => setFilters({ ...filters, "Response expected": !filters["Response expected"] })}
                      className="flex items-center justify-between gap-3 p-1.5 px-2.5 rounded-lg text-xs font-semibold text-[#3a1c14] hover:bg-[#FAF1EF] cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div className="bg-transparent border border-dashed border-[#c9a89e] rounded w-5 h-5 flex items-center justify-center shrink-0">
                          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                            <circle cx="7" cy="7" r="5" stroke="#c9a89e" strokeWidth="1.5" strokeDasharray="2.5 2" />
                          </svg>
                        </div>
                        <span>Response expected</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={filters["Response expected"]}
                        readOnly
                        className="w-3.5 h-3.5 rounded text-[#7c3a2a] focus:ring-[#7c3a2a]/35 cursor-pointer accent-[#7c3a2a]"
                      />
                    </div>

                    {/* Filter row: Nudge reminder */}
                    <div
                      onClick={() => setFilters({ ...filters, "Nudge reminder": !filters["Nudge reminder"] })}
                      className="flex items-center justify-between gap-3 p-1.5 px-2.5 rounded-lg text-xs font-semibold text-[#3a1c14] hover:bg-[#FAF1EF] cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div className="bg-transparent border border-dashed border-[#e0c8bc] rounded w-5 h-5 flex items-center justify-center shrink-0">
                          <span className="font-bold text-[11px] text-[#9a6858] leading-none mb-0.5">!</span>
                        </div>
                        <span>Nudge reminder</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={filters["Nudge reminder"]}
                        readOnly
                        className="w-3.5 h-3.5 rounded text-[#7c3a2a] focus:ring-[#7c3a2a]/35 cursor-pointer accent-[#7c3a2a]"
                      />
                    </div>

                    {/* Filter row: Pages requested */}
                    <div
                      onClick={() => setFilters({ ...filters, "Pages requested": !filters["Pages requested"] })}
                      className="flex items-center justify-between gap-3 p-1.5 px-2.5 rounded-lg text-xs font-semibold text-[#3a1c14] hover:bg-[#FAF1EF] cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div className="bg-[#F2DDD8] border border-transparent rounded w-5 h-5 flex items-center justify-center shrink-0">
                          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                            <circle cx="7" cy="7" r="5" fill="none" stroke="#7c3d3d" strokeWidth="1.5" />
                            <path d="M7 2 A5 5 0 0 1 10.76 4.5 L7 7 Z" fill="#7c3d3d" />
                          </svg>
                        </div>
                        <span>Pages requested</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={filters["Pages requested"]}
                        readOnly
                        className="w-3.5 h-3.5 rounded text-[#7c3a2a] focus:ring-[#7c3a2a]/35 cursor-pointer accent-[#7c3a2a]"
                      />
                    </div>

                    {/* Filter row: Rejected */}
                    <div
                      onClick={() => setFilters({ ...filters, "Rejected": !filters["Rejected"] })}
                      className="flex items-center justify-between gap-3 p-1.5 px-2.5 rounded-lg text-xs font-semibold text-[#3a1c14] hover:bg-[#FAF1EF] cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div className="bg-[#F5F0EC] border border-transparent rounded w-5 h-5 flex items-center justify-center shrink-0">
                          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                            <circle cx="7" cy="7" r="5" fill="#888888" stroke="#888888" strokeWidth="1.5" />
                            <line x1="4.5" y1="4.5" x2="9.5" y2="9.5" stroke="#ffffff" strokeWidth="1.5" />
                            <line x1="9.5" y1="4.5" x2="4.5" y2="9.5" stroke="#ffffff" strokeWidth="1.5" />
                          </svg>
                        </div>
                        <span>Rejected</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={filters["Rejected"]}
                        readOnly
                        className="w-3.5 h-3.5 rounded text-[#7c3a2a] focus:ring-[#7c3a2a]/35 cursor-pointer accent-[#7c3a2a]"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* View Switching Buttons */}
            <div className="flex items-center border border-[#e8d5cc] rounded-[8px] overflow-hidden shadow-3xs select-none">
              {(["Month", "Week", "List"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setViewMode(v)}
                  className={`text-[11px] px-[12px] py-[5px] font-semibold transition-all cursor-pointer leading-none ${
                    viewMode === v
                      ? "bg-[#7c3a2a] text-[#F8F5F0]"
                      : "bg-[#FFFDF9] text-[#a08070] hover:bg-[#FAF1EF]"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ==================== CALENDAR CONTAINER ==================== */}
        <div className="w-full bg-[#FFFDF9] border border-[#e8d5cc] rounded-2xl overflow-hidden shadow-xs">
          
          {/* Calendar Headers (Only Month & Week Views) */}
          {viewMode !== "List" && (
            <div className="grid grid-cols-7 border-b border-[#e8d5cc] bg-[#FAF8F5] select-none">
              {dayNames.map((name, idx) => (
                <div
                  key={name}
                  className={`text-center font-sans tracking-[0.07em] text-[10px] font-bold uppercase text-[#c9a89e] py-2 ${
                    idx < 6 ? "border-r border-[#f0e6e0]" : ""
                  }`}
                >
                  {name}
                </div>
              ))}
            </div>
          )}

          {/* Month Grid Rendering */}
          {viewMode === "Month" && (
            <div className="grid grid-cols-7 bg-[#FFFDF9]">
              {gridDays.map((day, dIdx) => {
                const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                const isToday = isSameDay(day, sysToday);
                const dayEvents = getEventsForDay(day);
                const visibleEvents = dayEvents.slice(0, 2);
                const remainingCount = dayEvents.length - 2;

                let cellBg = isCurrentMonth ? "bg-[#FFFDF9]" : "bg-[#FDFBF9]";
                let numberColor = isCurrentMonth ? "text-[#c9a89e]" : "text-[#e8d5cc]";
                
                if (isToday) {
                  cellBg = "bg-[#FDF5F2]";
                }

                return (
                  <div
                    key={day.toISOString() + "-" + dIdx}
                    id={isToday ? "today-cell" : undefined}
                    className={`p-1.5 flex flex-col min-h-[115px] ${cellBg} border-b border-[#f0e6e0] cursor-default transition-all ${
                      (dIdx + 1) % 7 !== 0 ? "border-r border-[#f0e6e0]" : ""
                    }`}
                  >
                    {/* Day indicator section */}
                    <div className="flex justify-between items-center mb-1 select-none">
                      {isToday ? (
                        <div 
                           className="w-5 h-5 rounded-full bg-[#7c3a2a] flex items-center justify-center text-white text-[10px] font-bold leading-none"
                          title="Today's Date"
                        >
                          {day.getDate()}
                        </div>
                      ) : (
                        <span className={`text-[11px] font-medium leading-none ${numberColor}`}>
                          {day.getDate()}
                        </span>
                      )}
                    </div>

                    {/* Visible Event Stack */}
                    <div className="flex flex-col gap-1 flex-grow justify-start">
                      {visibleEvents.map((ev) => {
                        const style = getEventVisualProps(ev);
                        return (
                          <div
                            key={ev.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEvent(ev);
                            }}
                            className={`rounded-[4px] p-2 flex items-center gap-1.5 cursor-pointer leading-none relative shadow-3xs hover:brightness-[0.98] transition-all ${style.bg} ${style.borderStyle}`}
                          >
                            {style.dot}
                            <div className="flex-1 min-w-0 flex flex-col">
                              <span className={`text-[11px] font-medium truncate whitespace-nowrap overflow-hidden text-ellipsis block tracking-tight leading-tight ${style.nameColor}`}>
                                {ev.agentName}
                              </span>
                              <span 
                                className={`text-[8px] font-medium rounded-full uppercase tracking-[0.04em] leading-[1.5] mt-1 w-fit block whitespace-nowrap overflow-hidden text-ellipsis ${style.tagTextClass}`}
                                style={{ backgroundColor: style.tagBg, padding: "1px 5px" }}
                              >
                                {style.tagLabel}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                      
                      {remainingCount > 0 && (
                        <button
                           type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPopoverDay(day);
                          }}
                          className="text-[9px] text-[#c9a89e] hover:text-[#7c3a2a] cursor-pointer font-bold self-center mt-auto py-0.5 leading-none transition-colors"
                        >
                          +{remainingCount} more
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Week Grid Rendering */}
          {viewMode === "Week" && (
            <div className="grid grid-cols-7 bg-[#FFFDF9]">
              {weekDays.map((day, dIdx) => {
                const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                const isToday = isSameDay(day, sysToday);
                const dayEvents = getEventsForDay(day);
                const visibleEvents = dayEvents.slice(0, 4); // Show more since cell is taller
                const remainingCount = dayEvents.length - 4;

                let cellBg = isCurrentMonth ? "bg-[#FFFDF9]" : "bg-[#FDFBF9]";
                let numberColor = isCurrentMonth ? "text-[#c9a89e]" : "text-[#e8d5cc]";
                
                if (isToday) {
                  cellBg = "bg-[#FDF5F2]";
                }

                return (
                  <div
                    key={day.toISOString() + "-" + dIdx}
                    id={isToday ? "today-cell" : undefined}
                    className={`p-2 flex flex-col min-h-[220px] ${cellBg} border-b border-[#f0e6e0] cursor-default transition-all ${
                      (dIdx + 1) % 7 !== 0 ? "border-r border-[#f0e6e0]" : ""
                    }`}
                  >
                    {/* Day indicator section */}
                    <div className="flex justify-between items-center mb-2 select-none">
                      {isToday ? (
                        <div 
                          className="w-5 h-5 rounded-full bg-[#7c3a2a] flex items-center justify-center text-white text-[10px] font-bold leading-none"
                          title="Today's Date"
                        >
                          {day.getDate()}
                        </div>
                      ) : (
                        <span className={`text-[11px] font-medium leading-none ${numberColor}`}>
                          {day.getDate()}
                        </span>
                      )}
                    </div>

                    {/* Visible Event Stack */}
                    <div className="flex flex-col gap-1 flex-grow justify-start">
                      {visibleEvents.map((ev) => {
                        const style = getEventVisualProps(ev);
                        return (
                          <div
                            key={ev.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEvent(ev);
                            }}
                            className={`rounded-[4px] p-2 flex items-center gap-1.5 cursor-pointer leading-none relative shadow-3xs hover:brightness-[0.98] transition-all ${style.bg} ${style.borderStyle}`}
                          >
                            {style.dot}
                            <div className="flex-1 min-w-0 flex flex-col">
                              <span className={`text-[11px] font-medium truncate whitespace-nowrap overflow-hidden text-ellipsis block tracking-tight leading-tight ${style.nameColor}`}>
                                {ev.agentName}
                              </span>
                              <span 
                                className={`text-[8px] font-medium rounded-full uppercase tracking-[0.04em] leading-[1.5] mt-1 w-fit block whitespace-nowrap overflow-hidden text-ellipsis ${style.tagTextClass}`}
                                style={{ backgroundColor: style.tagBg, padding: "1px 5px" }}
                              >
                                {style.tagLabel}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                      {remainingCount > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPopoverDay(day);
                          }}
                          className="text-[9px] text-[#c9a89e] hover:text-[#7c3a2a] cursor-pointer font-bold self-center mt-auto py-0.5 leading-none transition-colors"
                        >
                          +{remainingCount} more
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* List/Timeline View Rendering */}
          {viewMode === "List" && (
            <div className="bg-[#FFFDF9] min-h-[350px]">
              {groupedList.length === 0 ? (
                <div className="flex flex-col justify-center items-center text-center p-16 text-stone-400 italic font-sans">
                  <Calendar className="w-12 h-12 text-[#7c3a2a]/20 mx-auto mb-2" />
                  No upcoming events matched the filters for this time frame onwards.
                </div>
              ) : (
                <div className="divide-y divide-[#f0e6e0]">
                  {groupedList.map((group) => {
                    const isGroupToday = isSameDay(group.date, sysToday);
                    return (
                      <div key={group.date.toDateString()} className="p-4 md:px-6 flex flex-col md:flex-row gap-4 md:items-start font-sans">
                        {/* Left date header */}
                        <div className="md:w-36 shrink-0 font-sans select-none">
                          <p className={`text-[10px] uppercase tracking-wider font-bold ${isGroupToday ? "text-[#7c3a2a]" : "text-stone-400"}`}>
                            {isGroupToday ? "● Today" : group.date.toLocaleDateString("en-US", { weekday: "short" })}
                          </p>
                          <h4 className="text-[16px] font-serif font-semibold text-[#3a1c14] tracking-tight">
                            {group.date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </h4>
                        </div>
                        {/* Right event list */}
                        <div className="flex-grow flex flex-col gap-2">
                          {group.events.map((ev) => {
                            const style = getEventVisualProps(ev);
                            return (
                              <div
                                key={ev.id}
                                onClick={() => setSelectedEvent(ev)}
                                className={`group/item flex items-center justify-between rounded-xl p-3 transition-all cursor-pointer shadow-3xs ${style.bg} ${style.borderStyle}`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-[18px] h-[18px] flex items-center justify-center shrink-0">
                                    {style.dot}
                                  </div>
                                  <div className="text-left">
                                    <h5 className={`text-[13px] font-bold leading-tight flex items-center gap-1.5 ${style.nameColor}`}>
                                      <span>{ev.agentName}</span>
                                      <span className="text-stone-400 text-xs font-normal font-sans">
                                        &middot; {ev.agentAgency}
                                      </span>
                                    </h5>
                                    <span 
                                      className={`text-[8px] font-medium rounded-full uppercase tracking-[0.04em] leading-[1.5] mt-1.5 w-fit block ${style.tagTextClass}`}
                                      style={{ backgroundColor: style.tagBg, padding: "1px 5px" }}
                                    >
                                      {style.tagLabel}
                                    </span>
                                  </div>
                                </div>
                                <span className="text-[10px] text-stone-400 font-mono flex items-center gap-1 opacity-100 sm:opacity-0 group-hover/item:opacity-100 transition-opacity">
                                  <span>Details</span>
                                  <ArrowRight className="w-3 h-3" />
                                </span>
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
          )}
        </div>
      </div>

      {/* ==================== EXPANDED CELL MODAL (+N MORE) ==================== */}
      {popoverDay && (
        <div className="fixed inset-0 z-50 bg-stone-900/35 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div 
            className="fixed inset-0" 
            onClick={() => setPopoverDay(null)} 
          />
          <div className="relative bg-[#FFFDF9] border border-[#e8d5cc] rounded-3xl w-full max-w-md p-6 shadow-2xl z-50 text-left animate-fade-in-scale font-sans">
            <button
              onClick={() => setPopoverDay(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer transition-all"
              title="Close Panel"
            >
              <X className="w-4 h-4" />
            </button>
            
            <span className="text-[10px] font-bold font-mono tracking-widest text-[#c9a89e] uppercase block mb-1">
              {popoverDay.toLocaleDateString("en-US", { weekday: "long" })}
            </span>
            <h3 className="text-lg font-serif font-semibold text-[#3a1c14] pb-4 border-b border-[#f0e6e0]">
              Events for {popoverDay.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </h3>

            <div className="mt-4 flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
              {getEventsForDay(popoverDay).map((ev) => {
                const style = getEventVisualProps(ev);
                return (
                  <div
                    key={ev.id}
                    onClick={() => {
                      setSelectedEvent(ev);
                      setPopoverDay(null);
                    }}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${style.bg} ${style.borderStyle}`}
                  >
                    <div className="w-[18px] h-[18px] flex items-center justify-center shrink-0">
                      {style.dot}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className={`text-[12px] font-bold leading-tight ${style.nameColor}`}>
                        {ev.agentName}
                      </h5>
                      <span 
                        className={`text-[8px] font-medium rounded-full uppercase tracking-[0.04em] leading-[1.5] mt-1 w-fit block ${style.tagTextClass}`}
                        style={{ backgroundColor: style.tagBg, padding: "1px 5px" }}
                      >
                        {style.tagLabel}
                      </span>
                    </div>
                    <ArrowRight className="w-3 h-3 text-stone-400 shrink-0" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ==================== DETAILED EVENT SPECIFIC POPUP ==================== */}
      {selectedEvent && (
        <div className="fixed inset-0 z-55 bg-stone-900/35 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div 
            className="fixed inset-0" 
            onClick={() => setSelectedEvent(null)} 
          />
          <div className="relative bg-[#FFFDF9] border border-[#e8d5cc] rounded-[24px] w-full max-w-lg p-6 shadow-2xl z-55 text-left animate-fade-in-scale font-sans">
            <button
              onClick={() => setSelectedEvent(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer transition-all"
              title="Close details"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header style header with colors matching category */}
            {(() => {
              const style = getEventVisualProps(selectedEvent);
              return (
                <div className="flex items-center gap-3 pb-4 border-b border-[#f0e6e0]">
                  <span
                    className={`text-[8px] font-medium rounded-full uppercase tracking-[0.04em] leading-[1.5] select-none ${style.tagTextClass}`}
                    style={{ backgroundColor: style.tagBg, padding: "1px 5px" }}
                  >
                    {style.tagLabel}
                  </span>
                  <span className="text-stone-400 text-xs font-mono font-semibold">
                    {selectedEvent.date.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric"
                    })}
                  </span>
                </div>
              );
            })()}

            <div className="space-y-4 pt-4">
              <div>
                <span className="text-[9px] uppercase font-bold text-stone-400 tracking-wider block mb-1 font-mono">
                  Literary Agent Context
                </span>
                <h4 className="text-[17px] font-serif font-semibold text-[#3a1c14] leading-tight">
                  {selectedEvent.agentName}
                </h4>
                <p className="text-stone-500 text-xs mt-1 leading-snug">
                  {selectedEvent.agentAgency} &middot; <span className="font-mono">{selectedEvent.agentEmail}</span>
                </p>
              </div>

              <div className="bg-[#FAF8F5] border border-[#e8d5cc]/35 rounded-2xl p-4 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[9px] uppercase font-bold text-stone-400 tracking-wider block mb-0.5 font-mono">
                    Manuscript Title
                  </span>
                  <p className="font-bold text-[#3a1c14] truncate">
                    {selectedEvent.manuscriptTitle}
                  </p>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-stone-400 tracking-wider block mb-0.5 font-mono">
                    Genre / Theme
                  </span>
                  <p className="font-medium text-[#7c3a2a] truncate">
                    {selectedEvent.msGenre}
                  </p>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-stone-400 tracking-wider block mb-0.5 font-mono">
                    Novel Word Count
                  </span>
                  <p className="font-medium text-[#7c3a2a] inline-block font-mono bg-[#FAF1EF] border border-[#F2DDD5]/20 rounded px-1.5 py-0.5 text-[10px]">
                    {selectedEvent.msWordCount?.toLocaleString()} words
                  </p>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-stone-400 tracking-wider block mb-0.5 font-mono">
                    Dispatch ID
                  </span>
                  <p className="font-mono text-[9px] text-stone-400 truncate">
                    {selectedEvent.queryId}
                  </p>
                </div>
              </div>

              <div>
                <span className="text-[9px] uppercase font-bold text-stone-400 tracking-wider block mb-1 font-mono">
                  Event Timeline Detail
                </span>
                <p className="text-xs text-stone-600 leading-relaxed italic pr-2">
                  {selectedEvent.description}
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-dashed border-[#e8d5cc] mt-2">
                <button
                  type="button"
                  onClick={() => setSelectedEvent(null)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-[#3a1c14] text-xs font-semibold rounded-xl cursor-pointer transition-colors"
                >
                  Dismiss Focus
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedEvent(null);
                    onNavigate("queries", "Queries database");
                  }}
                  className="px-4 py-2 bg-[#7c3a2a] hover:bg-[#7c3a2a]/90 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                >
                  <BookOpen className="w-3.5 h-3.5 shrink-0" />
                  <span>Open Queries Board</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
