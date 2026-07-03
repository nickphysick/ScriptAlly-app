/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import jsPDF from "jspdf";
import { motion, AnimatePresence } from "motion/react";
import { useScriptAllyDb } from "../lib/db";
import { 
  doc, 
  updateDoc, 
  setDoc, 
  deleteDoc, 
  collection, 
  serverTimestamp, 
  Timestamp, 
  deleteField,
  onSnapshot,
  query,
  orderBy,
  limit,
  getDocs,
  where,
  addDoc
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { QueryStatus, Agent, Manuscript, Query, SubmissionMethod, ActivityType, QueryMaterial, UserPlan } from "../types";
import { StatusPill, getStatusLabel } from "./StatusPill";
import { StatusDot, statusDirection } from "./StatusDot";
import { RecordResponseModal } from "./RecordResponseModal";
import { RecordResponseFocusForm } from "./RecordResponseFocusForm";
import { recordQueryResponse } from "../lib/recordResponse";
import { agentLabel, agentAgencyLine } from "../lib/agentDisplay";
import { formatQueryMaterial } from "../lib/materials";
import { MarkSentPopover, MarkSentKind } from "./MarkSentPopover";
import { useFixedMenu } from "./forms/useFixedMenu";
import { useOpenEditQuery } from "./EditQueryHost";
import { useOpenEditAgent } from "./EditAgentHost";
import { QueryTimeline } from "./reading-pane/QueryTimeline";
import { MountCard } from "./MountCard";
import { ScriptAllyLogo } from "./ScriptAllyLogo";
import {
  kraft, parchment, PAPER_TEXTURE,
  burgundy, FONT_SERIF, FONT_MONO, mountShadow, labelColor,
  qdbCardLine,
  qdbBoldInk, qdbBoldInk2, qdbBoldMuted,
} from "../lib/designTokens";

const normalizeStatus = (status: string | QueryStatus): QueryStatus => {
  if (!status) return QueryStatus.QUERIED;
  const s = status.trim();
  if (s.toLowerCase() === 'passed') return QueryStatus.REJECTED;
  for (const key of Object.values(QueryStatus)) {
    if (key.toLowerCase() === s.toLowerCase()) {
      return key;
    }
  }
  return status as QueryStatus;
};

// ── Contextual primary CTA ──────────────────────────────────────────────────
// Whose turn is it? The agent's-turn states record a response; the writer's-turn states
// (the agent asked, the writer owes materials) open the Mark-Sent popover instead. Terminal
// states keep the existing "Record response" behaviour untouched.
type BallHolder = "writer" | "agent";
type PrimaryAction =
  | { kind: "record"; label: string; ballHolder: BallHolder | null }
  | { kind: "mark-sent"; markKind: MarkSentKind; target: QueryStatus; label: string; ballHolder: "writer" };

const getPrimaryAction = (status: QueryStatus): PrimaryAction => {
  switch (status) {
    case QueryStatus.PARTIAL_REQUESTED:
      return { kind: "mark-sent", markKind: "partial", target: QueryStatus.PARTIAL_SENT, label: "Mark partial as sent", ballHolder: "writer" };
    case QueryStatus.FULL_REQUESTED:
      return { kind: "mark-sent", markKind: "full", target: QueryStatus.FULL_SENT, label: "Mark full as sent", ballHolder: "writer" };
    case QueryStatus.REVISE_RESUBMIT:
      return { kind: "mark-sent", markKind: "resubmit", target: QueryStatus.FULL_SENT, label: "Record your resubmission", ballHolder: "writer" };
    case QueryStatus.QUERIED:
    case QueryStatus.PARTIAL_SENT:
    case QueryStatus.FULL_SENT:
      return { kind: "record", label: "Record response", ballHolder: "agent" };
    default:
      // OFFER / REJECTED / WITHDRAWN / NO_RESPONSE — unchanged, no ball-holder chip.
      return { kind: "record", label: "Record response", ballHolder: null };
  }
};

// Display-only label: appends a revision marker once a query has been resubmitted as a full (v2+).
// Renders from revisionRound and never enters `status`, so every status === comparison is safe.
const statusDisplayLabel = (q: { status: QueryStatus; revisionRound?: number }): string => {
  const base = getStatusLabel(q.status);
  if (q.status === QueryStatus.FULL_SENT && (q.revisionRound ?? 1) >= 2) {
    return `${base} (v${q.revisionRound})`;
  }
  return base;
};

import {
  Search,
  Clock,
  Star,
  ChevronRight,
  ChevronLeft,
  Check,
  Download,
  Plus,
  Pencil,
  Activity,
  Paperclip,
  Notebook,
  FolderLock,
  Send,
  Sparkles,
  AlertTriangle,
  Book,
  GitCommit,
  MessageSquare,
  X,
  Camera,
  Trash2,
  Move,
  Image as ImageIcon
} from "lucide-react";

// Materials are rendered through the single formatQueryMaterial helper (src/lib/materials.ts) —
// the one place a material (legacy string or structured QueryMaterial) becomes display text.

function formatWhatsAppDate(dateString: string): string {
  const d = new Date(dateString);
  const day = d.getDate();
  const month = d.toLocaleString("en-GB", { month: "short" });
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${day} ${month}, ${time}`;
}

export const Queries: React.FC<{ searchQuery: string; onNavigate?: (tab: string, subPageName?: string) => void; activeSubPage?: string; inShell?: boolean }> = ({ searchQuery, onNavigate, activeSubPage, inShell = false }) => {
  const {
    currentUser,
    manuscripts,
    agents,
    queries,
    packages,
    activities,
    journalEntries,
    tasks,
    addJournalEntry,
    addQuery,
    updateQuery,
    recordMaterialsSent,
    deleteJournalEntry,
    updateJournalEntry,
    deleteActivity,
    updateAgent
  } = useScriptAllyDb();
  // Query editing is the app-level Edit Query drawer (the inline isEditMode editor is retired).
  const openEditQuery = useOpenEditQuery();
  const openEditAgent = useOpenEditAgent();

  const [selectedQueryId, setSelectedQueryId] = useState<string | null>(null);
  const [selectedQuery, setSelectedQuery] = useState<any | null>(null);
  
  // Refs for State and Listener Management
  const unsubscribeRef = useRef<any>(null);
  // Snapshot of the query before the last recorded response, for an instant optimistic revert on Undo.
  const preSubmissionSnapshotRef = useRef<any>(null);
  // Reverts the most recent recorded response (status, activity docs, agent pref). Set by recordQueryResponse().
  const undoFnRef = useRef<(() => Promise<void>) | null>(null);
  const [trackingEvents, setTrackingEvents] = useState<any[]>([]);

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isRecordResponseModalOpen, setIsRecordResponseModalOpen] = useState(false);
  const [isRecordResponseFocusFormOpen, setIsRecordResponseFocusFormOpen] = useState(false);
  // Mark-Sent popover — anchored to the contextual CTA via useFixedMenu so the reading panel's
  // overflow-hidden can't clip it.
  const [isMarkSentOpen, setIsMarkSentOpen] = useState(false);
  const { triggerRef: markSentTriggerRef, menuStyle: markSentMenuStyle } = useFixedMenu<HTMLButtonElement>(isMarkSentOpen);
  // Close the popover whenever the reader moves to a different query.
  useEffect(() => { setIsMarkSentOpen(false); }, [selectedQueryId]);

  // Toast state for Undo
  const [undoToast, setUndoToast] = useState<{
    id: string;
    queryId: string;
    agentName: string;
    manuscriptTitle: string;
    responseStyle: string;
  } | null>(null);

  // Second toast state for status feedback of Undo
  const [feedbackToast, setFeedbackToast] = useState<{
    message: string;
    subMessage?: string;
  } | null>(null);

  // Keyset of query IDs currently undergoing undoing write
  const [undoingQueryIds, setUndoingQueryIds] = useState<Set<string>>(new Set());

  // Setup the single query listener (Fix 5)
  useEffect(() => {
    if (!currentUser || !selectedQueryId) {
      setSelectedQuery(null);
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      return;
    }

    // Unsubscribe from previous listener if any
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    unsubscribeRef.current = onSnapshot(
      doc(db, `users/${currentUser.id}/queries/${selectedQueryId}`),
      (snap) => {
        if (snap.exists()) {
          setSelectedQuery({ id: snap.id, ...snap.data() });
        } else {
          setSelectedQuery(null);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${currentUser.id}/queries/${selectedQueryId}`);
      }
    );

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [currentUser?.id, selectedQueryId]);

  // Setup real-time listener for the query's activity subcollection (Fix 3)
  useEffect(() => {
    if (!currentUser || !selectedQueryId) {
      setTrackingEvents([]);
      return;
    }

    const unsubscribe = onSnapshot(
      query(
        collection(db, 'users', currentUser.id, 'queries', selectedQueryId, 'activity'),
        orderBy('createdAt', 'asc')
      ),
      (snapshot) => {
        const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setTrackingEvents(events);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${currentUser.id}/queries/${selectedQueryId}/activity`);
      }
    );

    return () => unsubscribe();
  }, [selectedQueryId, currentUser?.id]);

  // Run Part 1 & Part 6 cleanup/retrospective logic once on app load
  useEffect(() => {
    if (!currentUser?.id) return;

    const runTimelineCleanup = async () => {
      try {
        if (localStorage.getItem('timelineCleanupV3')) return;
        const userId = currentUser.id;

        const validStatuses = Object.values(QueryStatus);

        const queriesSnap = await getDocs(
          collection(db, 'users', userId, 'queries')
        );

        for (const queryDoc of queriesSnap.docs) {
          const activitySnap = await getDocs(
            collection(db, 'users', userId, 'queries', queryDoc.id, 'activity')
          );

          for (const activityDoc of activitySnap.docs) {
            const type = activityDoc.data().type;
            // Delete any document whose type is not a valid QueryStatus enum value
            if (!validStatuses.includes(type)) {
              await deleteDoc(activityDoc.ref);
            }
          }

          // Also delete duplicates — if two documents have the same type, keep only the latest
          const validDocs = activitySnap.docs.filter(d =>
            validStatuses.includes(d.data().type)
          );
          const seenTypes = new Set<string>();
          const sortedByDate = [...validDocs].sort((a, b) => {
            const aTime = a.data().createdAt?.seconds ?? 0;
            const bTime = b.data().createdAt?.seconds ?? 0;
            return bTime - aTime; // newest first
          });
          for (const d of sortedByDate) {
            const type = d.data().type;
            if (seenTypes.has(type)) {
              await deleteDoc(d.ref); // delete older duplicate
            } else {
              seenTypes.add(type);
            }
          }
        }

        // Run Part 6: Retrospective activity document for Murphy Wurph query
        const murphyQuery = queriesSnap.docs.find(d =>
          d.data().agentName === 'Murphy Wurph' &&
          d.data().status === QueryStatus.PARTIAL_REQUESTED
        );

        if (murphyQuery) {
          const existingActivity = await getDocs(
            query(
              collection(db, 'users', userId, 'queries', murphyQuery.id, 'activity'),
              where('type', '==', QueryStatus.PARTIAL_REQUESTED)
            )
          );

          if (existingActivity.empty) {
            const data = murphyQuery.data();
            await addDoc(
              collection(db, 'users', userId, 'queries', murphyQuery.id, 'activity'),
              {
                type: QueryStatus.PARTIAL_REQUESTED,
                createdAt: data.lastStatusChange ?? serverTimestamp(),
                note: data.materialsRequestedQuantity
                  ? `Partial manuscript requested — ${data.materialsRequestedQuantity} ${data.materialsRequestedType}`
                  : 'Partial manuscript requested',
                queryId: murphyQuery.id,
                agentName: data.agentName ?? 'Murphy Wurph',
                manuscriptTitle: data.manuscriptTitle ?? "Bethus' Beautiful Peonies",
                materialsType: data.materialsRequestedType ?? null,
                materialsQuantity: data.materialsRequestedQuantity ?? null,
              }
            );
          }
        }

        localStorage.setItem('timelineCleanupV3', 'true');
      } catch (err) {
        console.error("Cleanup/Retrospective error:", err);
      }
    };

    runTimelineCleanup();
  }, [currentUser?.id]);

  const triggerToast = (config: {
    queryId: string;
    agentName: string;
    manuscriptTitle: string;
    responseStyle: string;
  }) => {
    // Generate unique ID for toast to prevent any stale timeout collision
    const toastId = Math.random().toString(36).substr(2, 9);
    setUndoToast({
      id: toastId,
      ...config
    });

    // Auto dismiss after 10 seconds
    setTimeout(() => {
      setUndoToast(current => {
        if (current && current.id === toastId) {
          return null;
        }
        return current;
      });
    }, 10000);
  };

  const handleUndo = async () => {
    if (!undoToast || !currentUser) return;

    const { queryId, agentName } = undoToast;
    const undoFn = undoFnRef.current;

    // Immediately dismiss toast
    setUndoToast(null);

    // Show inline loading state on the query card
    setUndoingQueryIds(prev => {
      const next = new Set(prev);
      next.add(queryId);
      return next;
    });

    // Pause the live listener and optimistically restore the pre-change snapshot so the
    // revert feels instant; we resubscribe once the revert write lands.
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }
    if (preSubmissionSnapshotRef.current) {
      setSelectedQuery(preSubmissionSnapshotRef.current);
    }

    const resubscribe = () => {
      const unsub = onSnapshot(
        doc(db, `users/${currentUser.id}/queries/${queryId}`),
        (snap) => {
          setSelectedQuery(snap.exists() ? { id: snap.id, ...snap.data() } : null);
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${currentUser.id}/queries/${queryId}`);
        }
      );
      unsubscribeRef.current = unsub;
    };

    try {
      // Single shared revert: undoes status, the activity docs and any agent-pref write.
      if (undoFn) {
        await undoFn();
      }
      undoFnRef.current = null;
      resubscribe();

      setFeedbackToast({ message: "Changes undone", subMessage: agentName });
      setTimeout(() => setFeedbackToast(null), 3000);
    } catch (err) {
      console.error("Failed to undo Firestore write", err);
      resubscribe();

      setFeedbackToast({ message: "Couldn't undo — please refresh", subMessage: "" });
      setTimeout(() => setFeedbackToast(null), 3000);

      handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.id}/queries/${queryId}`);
    } finally {
      setUndoingQueryIds(prev => {
        const next = new Set(prev);
        next.delete(queryId);
        return next;
      });
    }
  };

  const getToastTitle = (resType: string) => {
    if (resType === "partial" || resType === "partialRequested") return "Partial request recorded";
    if (resType === "full" || resType === "fullRequested") return "Full request recorded";
    if (resType === "rr" || resType === "reviseAndResubmit") return "R&R recorded";
    if (resType === "offer") return "Offer recorded";
    if (resType === "rejected") return "Rejection recorded";
    if (resType === "close" || resType === "noResponse") return "Query closed";
    return "Response recorded";
  };

  const [editingJournalId, setEditingJournalId] = useState<string | null>(null);
  const [editingJournalText, setEditingJournalText] = useState("");

  // States and Handlers for Query Attachment Image Upload & Edit
  const [queryImage, setQueryImage] = useState<string | null>(null);
  const [queryImageX, setQueryImageX] = useState<number>(0);
  const [queryImageY, setQueryImageY] = useState<number>(0);
  const [queryImageScale, setQueryImageScale] = useState<number>(100);

  useEffect(() => {
    if (selectedQueryId) {
      const storedImg = localStorage.getItem(`query_image_${selectedQueryId}`);
      const storedX = localStorage.getItem(`query_image_x_${selectedQueryId}`);
      const storedY = localStorage.getItem(`query_image_y_${selectedQueryId}`);
      const storedScale = localStorage.getItem(`query_image_scale_${selectedQueryId}`);
      
      setQueryImage(storedImg || null);
      setQueryImageX(storedX ? parseInt(storedX) : 0);
      setQueryImageY(storedY ? parseInt(storedY) : 0);
      setQueryImageScale(storedScale ? parseInt(storedScale) : 100);
    } else {
      setQueryImage(null);
      setQueryImageX(0);
      setQueryImageY(0);
      setQueryImageScale(100);
    }
  }, [selectedQueryId]);

  const handleQueryImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedQueryId) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setQueryImage(base64String);
        localStorage.setItem(`query_image_${selectedQueryId}`, base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveQueryImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (selectedQueryId) {
      setQueryImage(null);
      localStorage.removeItem(`query_image_${selectedQueryId}`);
      localStorage.removeItem(`query_image_x_${selectedQueryId}`);
      localStorage.removeItem(`query_image_y_${selectedQueryId}`);
      localStorage.removeItem(`query_image_scale_${selectedQueryId}`);
      setQueryImageX(0);
      setQueryImageY(0);
      setQueryImageScale(100);
    }
  };

  const handleUpdateImageOffset = (dx: number, dy: number) => {
    if (selectedQueryId) {
      const newX = queryImageX + dx;
      const newY = queryImageY + dy;
      setQueryImageX(newX);
      setQueryImageY(newY);
      localStorage.setItem(`query_image_x_${selectedQueryId}`, String(newX));
      localStorage.setItem(`query_image_y_${selectedQueryId}`, String(newY));
    }
  };

  const handleUpdateImageScale = (newScale: number) => {
    if (selectedQueryId) {
      setQueryImageScale(newScale);
      localStorage.setItem(`query_image_scale_${selectedQueryId}`, String(newScale));
    }
  };

  const handleResetImagePosition = () => {
    if (selectedQueryId) {
      setQueryImageX(0);
      setQueryImageY(0);
      setQueryImageScale(100);
      localStorage.setItem(`query_image_x_${selectedQueryId}`, "0");
      localStorage.setItem(`query_image_y_${selectedQueryId}`, "0");
      localStorage.setItem(`query_image_scale_${selectedQueryId}`, "100");
    }
  };
  
  // States for Agent Notes card
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");
  const [notesFade, setNotesFade] = useState({ top: false, bottom: false });
  
  // Left Filters state (configured to always align with Agents-style)
  const [selectedStatusFilters, setSelectedStatusFilters] = useState<string[]>(["All"]);
  const [selectedManuscriptFilter, setSelectedManuscriptFilter] = useState<string>("All");
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<string>("All");
  const [sortOption, setSortOption] = useState<string>("Newest first");
  const [groupOption, setGroupOption] = useState<"None" | "Status" | "Action Required" | "Manuscript" | "Agent Fit Rating">("None");
  const [sortKey, setSortKey] = useState<string>("date_queried");
  const [sortDirs, setSortDirs] = useState<Record<string, number>>({});
  const [devTheme, setDevTheme] = useState<"burgundy" | "slate" | "emerald">("burgundy");
  const [filterAccordionOpen, setFilterAccordionOpen] = useState(true);
  const [groupAccordionOpen, setGroupAccordionOpen] = useState(false);
  const [sortAccordionOpen, setSortAccordionOpen] = useState(false);

  const THEMES = {
    burgundy: {
      name: "Burgundy Heritage",
      primary: "#7c3a2a",
      primaryHover: "#632e22",
      primaryLight: "#FAF1EF",
      primaryDark: "#3a1c14",
      bgMain: "#FDF8F6",
      bgContainer: "#FBF6F4",
      borderMain: "#EBDCD3",
      borderLight: "border-[#EBDCD3]/60",
      textPrimary: "text-[#3a1c14]",
      textAccent: "text-[#7c3a2a]",
      bgSelected: "bg-[#FDF8F6]",
      bgHover: "hover:bg-[#FBF6F4]",
      borderLeftSelected: "3.5px solid #7c3a2a",
      timelineDot: "bg-[#7c3a2a]",
      timelineDotBorder: "border-[#c9a89e]",
      timelineLine: "bg-[#e8d5cc]",
      starRating: "text-[#BA7517]",
      cardHeaderBg: "bg-[#7c3a2a]",
      primaryRGB: "124, 58, 42",
      accentRGB: "124, 58, 42",
      primaryLightRGB: "250, 241, 239",
      whiteCardBg: "#ffffff",
      outerBg: "#F5F0EA",
      containerMainBg: "#FAFAF9",
      folderRailBg: "#efefef"
    },
    slate: {
      name: "Slate Minimalist",
      primary: "#1e293b",
      primaryHover: "#0f172a",
      primaryLight: "#f1f5f9",
      primaryDark: "#0f172a",
      bgMain: "#f8fafc",
      bgContainer: "#f1f5f9",
      borderMain: "#cbd5e1",
      borderLight: "border-slate-200/60",
      textPrimary: "text-slate-900",
      textAccent: "text-slate-800",
      bgSelected: "bg-slate-200",
      bgHover: "hover:bg-slate-50",
      borderLeftSelected: "3.5px solid #1e293b",
      timelineDot: "bg-[#1e293b]",
      timelineDotBorder: "border-[#94a3b8]",
      timelineLine: "bg-[#cbd5e1]",
      starRating: "text-slate-600",
      cardHeaderBg: "bg-slate-800",
      primaryRGB: "30, 41, 59",
      accentRGB: "30, 41, 59",
      primaryLightRGB: "241, 245, 249",
      whiteCardBg: "#ffffff",
      outerBg: "#f1f5f9",
      containerMainBg: "#f8fafc",
      folderRailBg: "#e2e8f0"
    },
    emerald: {
      name: "Oxford Library",
      primary: "#1b4332",
      primaryHover: "#122a1f",
      primaryLight: "#f4f6f0",
      primaryDark: "#0c1f16",
      bgMain: "#fdfbf7",
      bgContainer: "#ecefe6",
      borderMain: "#d8dbcf",
      borderLight: "border-[#d8dbcf]/60",
      textPrimary: "text-[#112211]",
      textAccent: "text-[#1b4332]",
      bgSelected: "bg-[#e2e6d8]",
      bgHover: "hover:bg-[#FAF9F4]",
      borderLeftSelected: "3.5px solid #1b4332",
      timelineDot: "bg-[#1b4332]",
      timelineDotBorder: "border-[#aab199]",
      timelineLine: "bg-[#d8dbcf]",
      starRating: "text-[#854d0e]",
      cardHeaderBg: "bg-[#1b4332]",
      primaryRGB: "27, 67, 50",
      accentRGB: "27, 67, 50",
      primaryLightRGB: "244, 246, 240",
      whiteCardBg: "#ffffff",
      outerBg: "#ecefe6",
      containerMainBg: "#fdfbf7",
      folderRailBg: "#dfe3d6"
    }
  };

  const curTheme = THEMES[devTheme];
  
  // Quick list search
  const [listSearch, setListSearch] = useState("");
  // List-header dropdowns (Filter / Sort) — the menus themselves are built in a later phase.
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);

  // Journal text input
  const [journalInput, setJournalInput] = useState("");

  // Chat scroll container ref
  const chatContainerRef = React.useRef<HTMLDivElement>(null);
  // Query-list scroll container + scroll-aware edge fades: top/bottom overlays show only when there
  // is content beyond that edge. Default hidden; recomputed on scroll, resize, and list change.
  const listScrollRef = React.useRef<HTMLDivElement>(null);
  const [listFade, setListFade] = useState<{ top: boolean; bottom: boolean }>({ top: false, bottom: false });
  const recomputeListFades = React.useCallback(() => {
    const el = listScrollRef.current;
    const nextTop = !!el && el.scrollHeight > el.clientHeight + 3 && el.scrollTop > 3;
    const nextBottom = !!el && el.scrollHeight > el.clientHeight + 3 && el.scrollTop + el.clientHeight < el.scrollHeight - 3;
    // Bail out (return prev) when unchanged so the resize/content effects can't loop.
    setListFade(prev => (prev.top === nextTop && prev.bottom === nextBottom ? prev : { top: nextTop, bottom: nextBottom }));
  }, []);
  // Stable refs for keyboard navigation (updated each render before return)
  const sortedListRef = useRef<any[]>([]);
  const selectedQueryIdRef = useRef<string | null>(null);

  // Contextual action states
  const [showActionDropdown, setShowActionDropdown] = useState(false);

  // Query editing now lives entirely in the Edit Query drawer (openEditQuery) — the inline
  // isEditMode editor and its edit-state are retired. The reading pane below is view-only.

  // Create query inputs for inline quick-log portal
  const [showLogModal, setShowLogModal] = useState(false);
  const [logMsId, setLogMsId] = useState("");
  const [logAgId, setLogAgId] = useState("");
  const [logPkgId, setLogPkgId] = useState("");
  const [logNotes, setLogNotes] = useState("");
  const [logMethod, setLogMethod] = useState("Email");
  const [logError, setLogError] = useState("");

  // Select initial query on mount or use activeSubPage preselection
  useEffect(() => {
    if (activeSubPage && activeSubPage !== "All queries" && activeSubPage !== "Queries database") {
      const matched = queries.find(q => q.id === activeSubPage);
      if (matched) {
        setSelectedQueryId(activeSubPage);
        return;
      }
    }
    if (queries.length > 0 && !selectedQueryId) {
      setSelectedQueryId(queries[0].id);
    }
  }, [queries, selectedQueryId, activeSubPage]);

  // Sync log defaults
  useEffect(() => {
    if (manuscripts.length > 0 && !logMsId) setLogMsId(manuscripts[0].id);
    const activePkgs = packages.filter(p => p.status === "Active");
    if (activePkgs.length > 0 && !logPkgId) setLogPkgId(activePkgs[0].id);
    if (agents.length > 0 && !logAgId) setLogAgId(agents[0].id);
  }, [manuscripts, packages, agents, logMsId, logAgId, logPkgId]);

  // The active query + its agent/manuscript, resolved live. The reading pane is view-only — editing
  // is the Edit Query drawer (openEditQuery).
  const activeQuery = selectedQueryId ? (selectedQuery || queries.find(q => q.id === selectedQueryId)) : null;
  const currentStatus = activeQuery?.status ?? selectedQuery?.status;
  const activeAgent = activeQuery ? agents.find(a => a.id === activeQuery.agentId) : null;
  const activeMs = activeQuery ? manuscripts.find(m => m.id === activeQuery.manuscriptId) : null;
  // Queries Hub subtitle — the manuscript currently in scope ("Tracking …").
  const trackedManuscript = selectedManuscriptFilter !== "All" ? manuscripts.find(m => m.id === selectedManuscriptFilter) : null;
  const hubSubtitle = trackedManuscript ? trackedManuscript.title : "all manuscripts";

  // Synchronise Agent Notes values when activeAgent changes
  useEffect(() => {
    if (activeAgent) {
      setNotesValue(activeAgent.notes || "");
    } else {
      setNotesValue("");
    }
    setIsEditingNotes(false);
  }, [activeAgent?.id]);

  // Auto scroll chat container to bottom when journalEntries or selectedQueryId changes
  useEffect(() => {
    const el = chatContainerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
      setNotesFade({ top: el.scrollHeight > el.clientHeight, bottom: false });
    }
  }, [journalEntries, selectedQueryId]);

  // Arrow-key navigation through the query list — registers once, reads state via stable refs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      e.preventDefault();
      const list = sortedListRef.current;
      const currentId = selectedQueryIdRef.current;
      const idx = list.findIndex((q: any) => q.id === currentId);
      if (idx === -1) return;
      const nextIdx = e.key === "ArrowDown"
        ? Math.min(idx + 1, list.length - 1)
        : Math.max(idx - 1, 0);
      if (nextIdx === idx) return;
      setSelectedQueryId(list[nextIdx].id);
      document.getElementById(`query-row-${list[nextIdx].id}`)?.scrollIntoView({ block: "nearest" });
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const triggerNotesEdit = () => {
    if (activeAgent) {
      setNotesValue(activeAgent.notes || "");
      setIsEditingNotes(true);
    }
  };

  const handleSaveNotes = async () => {
    if (activeAgent) {
      await updateAgent(activeAgent.id, { notes: notesValue });
      setIsEditingNotes(false);
    }
  };

  if (!currentUser) return null;

  // Aggregate stats row
  const activeQueriesCount = queries.filter(q =>
    ![QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE].includes(q.status)
  ).length;
  
  const requestCount = queries.filter(q =>
    [QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED].includes(q.status)
  ).length;
  
  const closedCount = queries.filter(q =>
    [QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE].includes(q.status)
  ).length;
  
  const offerCount = queries.filter(q => q.status === QueryStatus.OFFER).length;

  // Sidebar filter group visibility (only show group label when ≥1 row would render)
  const hasActiveQueries = queries.some(q =>
    [QueryStatus.QUERIED, QueryStatus.PARTIAL_REQUESTED, QueryStatus.PARTIAL_SENT,
     QueryStatus.FULL_REQUESTED, QueryStatus.FULL_SENT, QueryStatus.REVISE_RESUBMIT, QueryStatus.OFFER]
     .includes(q.status)
  );
  const hasClosedQueries = queries.some(q =>
    [QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE].includes(q.status)
  );

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

  const responsesReceivedVal = queries.filter(q =>
    RESPONSE_RECEIVED_STATUSES.includes(q.status as QueryStatus)
  ).length;

  const responseRate = queries.length > 0
    ? Math.round((responsesReceivedVal / queries.length) * 100)
    : 0;

  const ACTIVE_STATUSES = [QueryStatus.QUERIED, QueryStatus.PARTIAL_REQUESTED, QueryStatus.PARTIAL_SENT, QueryStatus.FULL_REQUESTED, QueryStatus.FULL_SENT, QueryStatus.REVISE_RESUBMIT, QueryStatus.OFFER];
  const CLOSED_STATUSES = [QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE];
  const nonZeroActiveStatuses = ACTIVE_STATUSES.filter(s => queries.some(q => q.status === s));
  const nonZeroClosedStatuses = CLOSED_STATUSES.filter(s => queries.some(q => q.status === s));
  const allActiveHighlighted = nonZeroActiveStatuses.length > 0 && !selectedStatusFilters.includes("All") && nonZeroActiveStatuses.every(s => selectedStatusFilters.includes(s)) && !CLOSED_STATUSES.some(s => selectedStatusFilters.includes(s));
  const allClosedHighlighted = nonZeroClosedStatuses.length > 0 && !selectedStatusFilters.includes("All") && nonZeroClosedStatuses.every(s => selectedStatusFilters.includes(s)) && !ACTIVE_STATUSES.some(s => selectedStatusFilters.includes(s));

  // Filter queries matching Left Panel filters + Search Query
  const filteredList = queries.filter(q => {
    const agent = agents.find(a => a.id === q.agentId);
    const ms = manuscripts.find(m => m.id === q.manuscriptId);
    
    if (!agent || !ms) return false;

    // Status filter (supports multiple selection)
    if (selectedStatusFilters && !selectedStatusFilters.includes("All") && selectedStatusFilters.length > 0) {
      if (!selectedStatusFilters.includes(q.status)) {
        return false;
      }
    }

    // Manuscript filter
    if (selectedManuscriptFilter !== "All" && q.manuscriptId !== selectedManuscriptFilter) {
      return false;
    }

    // Agent dropdown filter
    if (selectedAgentFilter !== "All" && q.agentId !== selectedAgentFilter) {
      return false;
    }

    // Search bar filters
    const term = (listSearch || searchQuery).toLowerCase();
    if (term) {
      return (
        agent.name.toLowerCase().includes(term) ||
        agent.agency.toLowerCase().includes(term) ||
        ms.title.toLowerCase().includes(term)
      );
    }

    return true;
  });

  // Sort queries matching Sort selector
  const STATUS_SORT_ORDER = [
    QueryStatus.QUERIED, QueryStatus.PARTIAL_REQUESTED, QueryStatus.PARTIAL_SENT,
    QueryStatus.FULL_REQUESTED, QueryStatus.FULL_SENT, QueryStatus.REVISE_RESUBMIT,
    QueryStatus.OFFER, QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE,
  ];
  const sortDir = sortDirs[sortKey] ?? 0;
  const sortedList = [...filteredList].sort((a, b) => {
    const agA = agents.find(ag => ag.id === a.agentId)?.name || "";
    const agB = agents.find(ag => ag.id === b.agentId)?.name || "";
    let cmp = 0;
    if (sortKey === "a_z") {
      cmp = agA.localeCompare(agB);
    } else if (sortKey === "status") {
      cmp = STATUS_SORT_ORDER.indexOf(a.status as QueryStatus) - STATUS_SORT_ORDER.indexOf(b.status as QueryStatus);
    } else if (sortKey === "date_queried") {
      const tA = a.dateSent ? new Date(a.dateSent).getTime() : 0;
      const tB = b.dateSent ? new Date(b.dateSent).getTime() : 0;
      cmp = tB - tA;
    } else if (sortKey === "last_updated") {
      const toMs = (v: any) => !v ? 0 : typeof v === "string" ? new Date(v).getTime() : (v?.toDate?.()?.getTime?.() ?? 0);
      cmp = toMs(b.lastStatusChange) - toMs(a.lastStatusChange);
    } else if (sortKey === "next_response_due") {
      const dA = a.responseDeadline ? new Date(a.responseDeadline).getTime() : Infinity;
      const dB = b.responseDeadline ? new Date(b.responseDeadline).getTime() : Infinity;
      cmp = dA - dB;
    }
    return sortDir === 1 ? -cmp : cmp;
  });

  // Automatically select first element if currently selected is filtered out
  const statusFiltersKey = selectedStatusFilters.join(",");
  useEffect(() => {
    if (sortedList.length > 0) {
      const isStillInList = sortedList.some(q => q.id === selectedQueryId);
      if (!isStillInList) {
        setSelectedQueryId(sortedList[0].id);
      }
    } else {
      setSelectedQueryId(null);
    }
  }, [statusFiltersKey, selectedManuscriptFilter, listSearch, searchQuery, queries.length]);

  // Keep the list edge-fades in sync as content height, grouping, or selection changes, and on
  // viewport resize. Scroll-driven updates come from the container's onScroll handler.
  useEffect(() => {
    recomputeListFades();
    window.addEventListener("resize", recomputeListFades);
    return () => window.removeEventListener("resize", recomputeListFades);
  }, [recomputeListFades, sortedList.length, selectedQueryId, groupOption]);

  // Reactive date sent change handler that automatically projects response due expectations
  // Query-field editing (manuscript, dates, method, materials/package, personalisation, deadline,
  // if-no-response, rejection details) now lives in the Edit Query drawer (openEditQuery), which
  // commits through saveQueryEdits. The inline handleSaveChanges path is retired.

  // Active query activity timeline logs
  const activeActivities = activities
    .filter(act => act.queryId === selectedQueryId)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const handlePostJournal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQueryId || !journalInput.trim()) return;
    addJournalEntry(selectedQueryId, journalInput.trim());
    setJournalInput("");
  };

  // Quick submission logger handler
  // NOTE: this inline "Log query" modal is DEAD — showLogModal is never set true (the live path is
  // LogQueryFocusForm). Left in place but made type-correct (async + await) for the migration; flagged
  // for removal. The await is a no-op on live behaviour because this handler is never reached.
  const handleLogQuerySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logMsId || !logAgId) {
      setLogError("Please select a valid manuscript and target agent.");
      return;
    }
    const res = await addQuery({
      manuscriptId: logMsId,
      agentId: logAgId,
      packageId: logPkgId,
      personalisationNotes: logNotes,
      sendMethod: logMethod as any
    });

    if (res.success) {
      setShowLogModal(false);
      setLogNotes("");
      setLogError("");
    } else {
      setLogError(res.error || "Internal error logging query.");
    }
  };

  const getListStatusPill = (status: QueryStatus) => {
    return <StatusPill status={status} size="sm" />;
  };

  const exportQueriesToCSV = (listToExport: Query[], baseFilename: string) => {
    const escapeCSVField = (val: string | number | undefined | null): string => {
      if (val === undefined || val === null) return "";
      const str = String(val).trim();
      if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const formatCSVDate = (isoString?: string): string => {
      if (!isoString) return "";
      try {
        const d = new Date(isoString);
        if (isNaN(d.getTime())) return "";
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
      } catch (e) {
        return "";
      }
    };

    const formatJournalDate = (isoString?: string): string => {
      if (!isoString) return "";
      try {
        const d = new Date(isoString);
        if (isNaN(d.getTime())) return "";
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return `${d.getDate()} ${months[d.getMonth()]}`;
      } catch (e) {
        return "";
      }
    };

    const getCSVStatusLabel = (status: string | QueryStatus): string => {
      const norm = normalizeStatus(status);
      switch (norm) {
        case QueryStatus.QUERIED: return "Queried";
        case QueryStatus.PARTIAL_REQUESTED: return "Partial requested";
        case QueryStatus.PARTIAL_SENT: return "Partial sent";
        case QueryStatus.FULL_REQUESTED: return "Full requested";
        case QueryStatus.FULL_SENT: return "Full sent";
        case QueryStatus.REVISE_RESUBMIT: return "Revise & Resubmit";
        case QueryStatus.OFFER: return "Offer";
        case QueryStatus.REJECTED: return "Rejected";
        case QueryStatus.WITHDRAWN: return "Withdrawn";
        case QueryStatus.NO_RESPONSE: return "No response";
        default: return norm || "";
      }
    };

    const calculateDaysSince = (dateSentIso?: string): string => {
      if (!dateSentIso) return "";
      try {
        const sent = new Date(dateSentIso);
        if (isNaN(sent.getTime())) return "";
        const today = new Date();
        const diffTime = today.getTime() - sent.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= 0 ? String(diffDays) : "0";
      } catch (e) {
        return "";
      }
    };

    const getSentViaLabel = (method?: string): string => {
      if (!method) return "";
      const m = method.toLowerCase().trim();
      if (m === "email") return "Email";
      if (m === "online form" || m === "online_form") return "Online form";
      if (m === "querymanager" || m === "query manager") return "QueryManager";
      return method;
    };

    const getLastStatusChangeDate = (q: Query, activitiesList: any[]): string => {
      const dates: Date[] = [];
      if (q.dateSent) {
        const d = new Date(q.dateSent);
        if (!isNaN(d.getTime())) dates.push(d);
      }
      if (q.partialRequestedDate) {
        const d = new Date(q.partialRequestedDate);
        if (!isNaN(d.getTime())) dates.push(d);
      }
      if (q.partialSentDate) {
        const d = new Date(q.partialSentDate);
        if (!isNaN(d.getTime())) dates.push(d);
      }
      if (q.fullRequestedDate) {
        const d = new Date(q.fullRequestedDate);
        if (!isNaN(d.getTime())) dates.push(d);
      }
      if (q.fullSentDate) {
        const d = new Date(q.fullSentDate);
        if (!isNaN(d.getTime())) dates.push(d);
      }

      const qActs = activitiesList.filter(
        (act) =>
          act.queryId === q.id &&
          (act.activityType === ActivityType.STATUS_CHANGED || act.activityType === ActivityType.MATERIALS_SENT)
      );
      qActs.forEach((act) => {
        if (act.date) {
          const d = new Date(act.date);
          if (!isNaN(d.getTime())) dates.push(d);
        }
      });

      if (dates.length === 0) return "";
      const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));
      return formatCSVDate(maxDate.toISOString());
    };

    const headers = [
      "Agent",
      "Agency",
      "Agent email",
      "Manuscript",
      "Status",
      "Date sent",
      "Days since sent",
      "Sent via",
      "Materials included",
      "Personalisation note",
      "Response deadline",
      "Nudge date",
      "Last status change",
      "Guidelines URL",
      "Notes",
      "Query ID"
    ];

    let csvContent = headers.join(",") + "\n";

    listToExport.forEach(q => {
      const ag = agents.find(a => a.id === q.agentId);
      const ms = manuscripts.find(m => m.id === q.manuscriptId);

      const agentName = ag?.name || "";
      const agencyName = ag?.agency || "";
      const agentEmail = ag?.email || "";
      const manuscriptTitle = ms?.title || "";
      const statusLabel = getCSVStatusLabel(q.status);
      const dateSentClean = formatCSVDate(q.dateSent);
      const daysSinceSent = calculateDaysSince(q.dateSent);
      const sentVia = getSentViaLabel(q.sendMethod || ag?.submissionMethod);

      const matsRaw = Array.isArray((q as any).materials)
        ? (q as any).materials
        : Array.isArray((q as any).materialsWanted)
          ? (q as any).materialsWanted
          : Array.isArray(ag?.materialsWanted)
            ? ag.materialsWanted
            : [];
      const cleanMats = matsRaw.map((v: string | QueryMaterial) => formatQueryMaterial(v)).filter((v: string) => !!v);
      const materialsIncluded = cleanMats.join(", ");

      const personalisationNote = q.personalisationNotes || "";
      const responseDeadlineClean = formatCSVDate(q.responseDeadline);
      const nudgeDateClean = formatCSVDate(q.nudgeDate);
      const lastStatusChange = getLastStatusChangeDate(q, activities);
      const guidelinesUrl = ag?.website || "";

      const qNotesMatched = journalEntries
        .filter(j => j.queryId === q.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      const notesSerialized = qNotesMatched
        .map(entry => {
          const dateStr = formatJournalDate(entry.createdAt);
          const txt = entry.entryText || "";
          return dateStr ? `${dateStr}: ${txt}` : txt;
        })
        .filter(t => !!t)
        .join(" | ");

      const queryIdVal = q.id || "";

      const rowValues = [
        agentName,
        agencyName,
        agentEmail,
        manuscriptTitle,
        statusLabel,
        dateSentClean,
        daysSinceSent,
        sentVia,
        materialsIncluded,
        personalisationNote,
        responseDeadlineClean,
        nudgeDateClean,
        lastStatusChange,
        guidelinesUrl,
        notesSerialized,
        queryIdVal
      ];

      csvContent += rowValues.map(v => escapeCSVField(v)).join(",") + "\n";
    });

    const bom = "\uFEFF";
    const fileBlob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
    const fileUrl = URL.createObjectURL(fileBlob);
    const linkObj = document.createElement("a");
    linkObj.href = fileUrl;
    linkObj.setAttribute("download", `${baseFilename}.csv`);
    document.body.appendChild(linkObj);
    linkObj.click();
    document.body.removeChild(linkObj);
  };

  const handleExportFilteredCSV = () => {
    exportQueriesToCSV(sortedList, `ScriptAlly_Filtered_Queries_${new Date().toISOString().slice(0, 10)}`);
  };

  const renderContextualActionBanner = () => null;


  const countQueried = queries.filter(q => q.status === QueryStatus.QUERIED).length;
  const countPartialReq = queries.filter(q => q.status === QueryStatus.PARTIAL_REQUESTED).length;
  const countPartialSent = queries.filter(q => q.status === QueryStatus.PARTIAL_SENT).length;
  const countFullReq = queries.filter(q => q.status === QueryStatus.FULL_REQUESTED).length;
  const countFullSent = queries.filter(q => q.status === QueryStatus.FULL_SENT).length;
  const countRR = queries.filter(q => q.status === QueryStatus.REVISE_RESUBMIT).length;
  const countOffer = queries.filter(q => q.status === QueryStatus.OFFER).length;
  const countClosed = closedCount;

  const handleDownloadPDF = async () => {
    if (!activeQuery || !activeAgent || !activeMs) return;
    setIsGeneratingPDF(true);
    try {
      const agentName = activeAgent.name;
      const agencyName = activeAgent.agency;
      const status = getStatusLabel(activeQuery.status);
      const sendMethod = activeQuery.sendMethod;
      const starCount = activeAgent.starRating;
      const manuscriptTitle = activeMs.title;
      const genre = activeMs.genre;
      const wordCount = activeMs.wordCount;
      const synopsis = activeMs.logline || "";

      const timelineEvents: {
        title: string;
        date: string;
        formattedDate: string;
        detail: string | null;
        materials: string | null;
        expectedDate: string | null;
        nudgeDate: string | null;
      }[] = [];

      const sendMethodLabel = activeQuery.sendMethod || "Email";
      const queryMaterialsList = (() => {
        const list = Array.isArray((activeQuery as any).materialsWanted)
          ? (activeQuery as any).materialsWanted
          : Array.isArray(activeAgent.materialsWanted)
            ? activeAgent.materialsWanted
            : [];
        return list;
      })();
      timelineEvents.push({
        title: "Query sent",
        date: activeQuery.dateSent,
        formattedDate: new Date(activeQuery.dateSent).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
        detail: `via ${sendMethodLabel}`,
        materials: queryMaterialsList.length > 0 ? queryMaterialsList.map(formatQueryMaterial).join(", ") : null,
        expectedDate: null,
        nudgeDate: null
      });

      const mapActivityToEvent = (act: any): string | null => {
        const desc = act.description || "";
        const lower = desc.toLowerCase();
        if (act.activityType === ActivityType.QUERY_SENT || lower.includes("dispatched query") || lower.includes("logged query")) return null;
        if (lower.includes("nudge sent") || act.activityType === ActivityType.NUDGE_SENT || lower.includes("nudged")) return "Nudge sent";
        if (lower.includes("requested a partial") || lower.includes("partial manuscript requested") || lower.includes("partial requested")) return "Partial requested";
        if (lower.includes("sent partial") || lower.includes("partial sent") || lower.includes("partial manuscript sent")) return "Partial sent";
        if (lower.includes("requested a full") || lower.includes("full manuscript requested") || lower.includes("full requested")) return "Full requested";
        if (lower.includes("full manuscript sent") || lower.includes("full sent")) return "Full sent";
        if (lower.includes("revise") || lower.includes("r&r") || lower.includes("revise and resubmit")) return "Revise & resubmit";
        if (lower.includes("offer of representation") || lower.includes("received an offer") || lower.includes("offer received")) return "Offer received";
        if (lower.includes("rejected") || lower.includes("passed") || lower.includes("has rejected")) return "Rejected";
        if (lower.includes("withdrew") || lower.includes("withdrawn")) return "Withdrawn";
        if (lower.includes("no response") || lower.includes("archived as no response")) return "No response";
        return null;
      };

      const otherActs = activeActivities
        .filter(act => mapActivityToEvent(act) !== null)
        .map(act => ({ type: mapActivityToEvent(act)!, date: act.date, details: act.details || null }));
      otherActs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      otherActs.forEach(act => {
        let materialsSent: string | null = null;
        if (act.type === "Partial sent") materialsSent = "Partial Manuscript";
        else if (act.type === "Full sent") materialsSent = "Full Manuscript";
        let displayedDetail = act.details;
        if (displayedDetail && displayedDetail.toLowerCase().includes("heard back")) {
          const isQuerySentStatus = activeQuery.status === QueryStatus.QUERIED;
          const isPartialSentStatus = activeQuery.status === QueryStatus.PARTIAL_SENT;
          const isFullSentStatus = activeQuery.status === QueryStatus.FULL_SENT;
          if (!isQuerySentStatus && !isPartialSentStatus && !isFullSentStatus) displayedDetail = null;
        }
        timelineEvents.push({
          title: act.type,
          date: act.date,
          formattedDate: new Date(act.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
          detail: displayedDetail,
          materials: materialsSent,
          expectedDate: null,
          nudgeDate: null
        });
      });

      const isQueryActive = [
        QueryStatus.QUERIED, QueryStatus.PARTIAL_SENT, QueryStatus.FULL_SENT,
        QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED, QueryStatus.REVISE_RESUBMIT
      ].includes(activeQuery.status);

      if (isQueryActive) {
        const deadlineDate = activeQuery.responseDeadline || activeQuery.dateSent;
        timelineEvents.push({
          title: "Waiting to hear back",
          date: deadlineDate,
          formattedDate: new Date(deadlineDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
          detail: null,
          materials: null,
          expectedDate: activeQuery.responseDeadline ? new Date(activeQuery.responseDeadline).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "None set",
          nudgeDate: activeQuery.nudgeDate ? new Date(activeQuery.nudgeDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null
        });
      } else {
        let finalLabel = "Final Decision Outcome Marker Logged";
        if (activeQuery.status === QueryStatus.REJECTED) finalLabel = "Rejected";
        if (activeQuery.status === QueryStatus.WITHDRAWN) finalLabel = "Withdrawn Pipeline";
        if (activeQuery.status === QueryStatus.NO_RESPONSE) finalLabel = "Archived as No Response";
        if (activeQuery.status === QueryStatus.OFFER) finalLabel = "Offer of Representation! 🏆";
        const lastActivityDate = activeActivities.length > 0 ? activeActivities[activeActivities.length - 1].date : activeQuery.dateSent;
        timelineEvents.push({
          title: finalLabel,
          date: lastActivityDate,
          formattedDate: new Date(lastActivityDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
          detail: activeQuery.status === QueryStatus.REJECTED ? "Pipeline archived. We keep tracking performance metrics on packages." : null,
          materials: null,
          expectedDate: null,
          nudgeDate: null
        });
      }

      const notes = journalEntries
        .filter(entry => entry.queryId === activeQuery.id)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .map(entry => ({
          text: entry.entryText,
          formattedDate: new Date(entry.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
        }));

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = 210;
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);

      doc.setFillColor(124, 61, 61);
      doc.rect(0, 0, 210, 4, 'F');
      let y = 14;

      const checkPageBreak = (neededSpace = 10) => {
        if (y + neededSpace > 277) {
          doc.addPage();
          doc.setFillColor(124, 61, 61);
          doc.rect(0, 0, 210, 4, 'F');
          y = 20;
        }
      };

      const addLine = (yPos: number) => {
        doc.setDrawColor(232, 224, 216);
        doc.setLineWidth(0.2);
        doc.line(margin, yPos, pageWidth - margin, yPos);
      };

      const logoImg = document.querySelector('nav img, header img, .logo img, img[alt*="ScriptAlly"], img[alt*="Script"]') as HTMLImageElement | null;
      if (logoImg && logoImg.naturalWidth && logoImg.naturalHeight) {
        const logoCanvas = document.createElement('canvas');
        logoCanvas.width = logoImg.naturalWidth;
        logoCanvas.height = logoImg.naturalHeight;
        const ctx = logoCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(logoImg, 0, 0);
          const logoData = logoCanvas.toDataURL('image/png');
          const logoW = 36;
          const logoH = (logoImg.naturalHeight / logoImg.naturalWidth) * logoW;
          doc.addImage(logoData, 'PNG', (210 - logoW) / 2, y, logoW, logoH);
          y += logoH + 4;
        } else {
          doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(124, 61, 61);
          doc.text('ScriptAlly', 105, y, { align: 'center' }); y += 8;
        }
      } else {
        doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(124, 61, 61);
        doc.text('ScriptAlly', 105, y, { align: 'center' }); y += 8;
      }

      doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(201, 168, 158);
      doc.text('EXPORTED QUERY RECORD', 105, y, { align: 'center' }); y += 5;
      doc.setDrawColor(232, 224, 216); doc.setLineWidth(0.2);
      doc.line(margin, y, pageWidth - margin, y); y += 8;

      const statusLabel = status;
      const exportedDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      const headerStartY = y;

      doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.setTextColor(58, 28, 20);
      doc.text(agentName, margin, y); y += 7;
      doc.setFontSize(11); doc.setFont('helvetica', 'normal'); doc.setTextColor(160, 128, 112);
      doc.text(agencyName, margin, y); y += 8;

      const metaRows = [['Status', statusLabel], ['Sent via', sendMethod], ['Rating', `${starCount} stars`], ['Exported', exportedDate]];
      metaRows.forEach(([label, value]) => {
        doc.setFontSize(10); doc.setTextColor(160, 128, 112);
        doc.text(label, margin, y);
        doc.setTextColor(58, 28, 20);
        doc.text(String(value || '—'), margin + 30, y); y += 5.5;
      });

      const agentBlockBottomY = y;
      doc.setFontSize(18); doc.setTextColor(232, 224, 216);
      doc.text('→', 105, agentBlockBottomY - 16, { align: 'center' });

      const msX = 113;
      const msW = pageWidth - margin - msX;
      const msBoxH = 52;
      doc.setFillColor(253, 248, 246); doc.setDrawColor(232, 224, 216); doc.setLineWidth(0.3);
      doc.roundedRect(msX, headerStartY - 5, msW, msBoxH, 3, 3, 'FD');
      let msY = headerStartY + 1;
      doc.setFontSize(7); doc.setTextColor(201, 168, 158); doc.setFont('helvetica', 'normal');
      doc.text('MANUSCRIPT', msX + 5, msY); msY += 5;
      doc.setFontSize(12); doc.setTextColor(58, 28, 20); doc.setFont('helvetica', 'bold');
      const msTitleLines = doc.splitTextToSize(manuscriptTitle, msW - 10);
      doc.text(msTitleLines, msX + 5, msY); msY += msTitleLines.length * 5 + 2;
      doc.setFontSize(9); doc.setTextColor(160, 128, 112); doc.setFont('helvetica', 'normal');
      doc.text(genre || '—', msX + 5, msY); msY += 5;
      doc.setDrawColor(232, 224, 216); doc.line(msX + 5, msY, msX + msW - 5, msY); msY += 4;
      doc.setFontSize(9); doc.setTextColor(106, 80, 69); doc.setFont('helvetica', 'italic');
      const blurbLines = doc.splitTextToSize(`"${synopsis || ''}"`, msW - 10);
      doc.text(blurbLines, msX + 5, msY);

      const msBottomY = headerStartY - 5 + msBoxH + 4;
      y = Math.max(agentBlockBottomY, msBottomY) + 6;
      doc.setDrawColor(232, 224, 216); doc.setLineWidth(0.2);
      doc.line(margin, y, pageWidth - margin, y); y += 8;

      checkPageBreak(10);
      doc.setFontSize(8); doc.setTextColor(201, 168, 158); doc.setFont('helvetica', 'normal');
      doc.text('TRACKING', margin, y); y += 2;
      doc.setDrawColor(232, 224, 216); doc.line(margin + 22, y - 1, pageWidth - margin, y - 1); y += 8;

      (timelineEvents || []).forEach((event, i) => {
        checkPageBreak(20);
        const isFuture = new Date(event.date) > new Date();
        if (!isFuture) { doc.setFillColor(124, 61, 61); doc.circle(margin + 2, y - 1, 2, 'F'); }
        else { doc.setDrawColor(201, 168, 158); doc.setLineWidth(0.5); doc.circle(margin + 2, y - 1, 2, 'S'); }
        if (i < (timelineEvents.length - 1)) { doc.setDrawColor(232, 224, 216); doc.setLineWidth(0.3); doc.line(margin + 2, y + 1, margin + 2, y + 16); }
        doc.setFontSize(11); doc.setTextColor(58, 28, 20); doc.setFont('helvetica', 'bold');
        doc.text(event.title, margin + 8, y);
        doc.setFontSize(10); doc.setTextColor(201, 168, 158); doc.setFont('helvetica', 'normal');
        doc.text(event.formattedDate || '', pageWidth - margin, y, { align: 'right' }); y += 5;
        if (event.detail) { doc.setFontSize(10); doc.setTextColor(160, 128, 112); doc.text(event.detail, margin + 8, y); y += 5; }
        if (event.materials) { doc.setFontSize(10); doc.setTextColor(160, 128, 112); doc.text('Sent: ', margin + 8, y); doc.setTextColor(58, 28, 20); doc.text(event.materials, margin + 18, y); y += 5; }
        if (isFuture && event.expectedDate) {
          doc.setFillColor(255, 240, 240); doc.setDrawColor(245, 200, 200); doc.roundedRect(margin + 8, y - 3, contentWidth - 8, 10, 2, 2, 'FD');
          doc.setFontSize(10); doc.setTextColor(124, 61, 61);
          const hasNudgeStr = (event.nudgeDate && event.nudgeDate !== '!') ? ` · Nudge: ${event.nudgeDate}` : '';
          doc.text(`Response expected: ${event.expectedDate}${hasNudgeStr}`, margin + 11, y + 3); y += 12;
        }
        y += 6;
      });

      y += 4; checkPageBreak(10); addLine(y); y += 8;

      doc.setFontSize(8); doc.setTextColor(201, 168, 158); doc.setFont('helvetica', 'normal');
      doc.text('NOTES', margin, y); y += 2;
      doc.setDrawColor(232, 224, 216); doc.line(margin + 14, y - 1, pageWidth - margin, y - 1); y += 8;

      if (!notes || notes.length === 0) {
        checkPageBreak(10);
        doc.setFontSize(11); doc.setTextColor(201, 168, 158); doc.setFont('helvetica', 'italic');
        doc.text('No notes recorded.', margin, y); y += 8;
      } else {
        notes.forEach((note) => {
          checkPageBreak(15);
          doc.setFontSize(9); doc.setTextColor(201, 168, 158); doc.setFont('helvetica', 'normal');
          doc.text(note.formattedDate || '', margin, y); y += 5;
          doc.setFontSize(11); doc.setTextColor(58, 28, 20);
          const noteLines = doc.splitTextToSize(note.text, contentWidth);
          doc.text(noteLines, margin, y); y += noteLines.length * 5 + 4;
          doc.setDrawColor(240, 232, 224); doc.line(margin, y, pageWidth - margin, y); y += 5;
        });
      }

      checkPageBreak(10); y += 4; addLine(y); y += 6;
      doc.setFontSize(10); doc.setTextColor(201, 168, 158); doc.setFont('helvetica', 'normal');
      doc.text('ScriptAlly', margin, y);
      doc.text(`Generated ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`, pageWidth - margin, y, { align: 'right' });

      const pdfFilename = `${(agentName || 'agent').toLowerCase().replace(/\s+/g, '-')}-${(manuscriptTitle || 'manuscript').toLowerCase().replace(/\s+/g, '-')}-query.pdf`;
      doc.save(pdfFilename);
    } catch (error: any) {
      console.error('PDF generation failed:', error?.message || error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Keep stable refs in sync for keydown handler (runs before each render's effects)
  sortedListRef.current = sortedList;
  selectedQueryIdRef.current = selectedQueryId;

  return (
    <div
      className="w-full flex flex-col overflow-hidden text-[#3a1c14] font-sans relative queries-container-theme"
      style={{ height: "100%", backgroundColor: "#faf5ee" }}
    >
      <style>{`
        .custom-query-list-scrollbar::-webkit-scrollbar {
          width: 8px !important;
          display: block !important;
        }
        .custom-query-list-scrollbar::-webkit-scrollbar-track {
          background: ${curTheme.bgMain} !important;
        }
        .custom-query-list-scrollbar::-webkit-scrollbar-thumb {
          background-color: ${curTheme.borderMain} !important;
          border-radius: 999px !important;
          border: 1.5px solid ${curTheme.bgMain} !important;
        }
        .custom-query-list-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: ${curTheme.primary} !important;
        }
        .custom-query-list-scrollbar {
          scrollbar-width: thin !important;
          scrollbar-color: ${curTheme.borderMain} ${curTheme.bgMain} !important;
        }

        /* DYNAMIC COLORS - OVERRIDING DEFAULT BURGUNDY */
        .queries-container-theme .bg-\[\#FAF1EF\] {
          background-color: ${curTheme.primaryLight} !important;
        }
        .queries-container-theme .text-\[\#7c3a2a\] {
          color: ${curTheme.primary} !important;
        }
        .queries-container-theme .border-\[\#7c3a2a\] {
          border-color: ${curTheme.primary} !important;
        }
        .queries-container-theme .border-\[\#7c3a2a\]\/20 {
          border-color: rgba(${curTheme.primaryRGB}, 0.2) !important;
        }
        .queries-container-theme .border-\[\#7c3a2a\]\/40 {
          border-color: rgba(${curTheme.primaryRGB}, 0.4) !important;
        }
        .queries-container-theme .text-\[\#7c3a2a\]\/80 {
          color: rgba(${curTheme.primaryRGB}, 0.8) !important;
        }
        .queries-container-theme .hover\:text-\[\#7c3a2a\]:hover {
          color: ${curTheme.primary} !important;
        }
        .queries-container-theme .hover\:bg-\[\#7c3a2a\]\/5:hover {
          background-color: rgba(${curTheme.primaryRGB}, 0.05) !important;
        }
        .queries-container-theme .hover\:bg-\[\#7c3a2a\]\/10:hover {
          background-color: rgba(${curTheme.primaryRGB}, 0.1) !important;
        }
        .queries-container-theme .bg-\[\#FAF1EF\]\/85 {
          background-color: rgba(${curTheme.primaryRGB}, 0.08) !important;
        }
        .queries-container-theme .hover\:bg-\[\#FAF1EF\]\/85:hover {
          background-color: rgba(${curTheme.primaryRGB}, 0.12) !important;
        }
        .queries-container-theme .bg-\[\#7c3a2a\] {
          background-color: ${curTheme.primary} !important;
        }
        .queries-container-theme .hover\:bg-\[\#632e22\]:hover {
          background-color: ${curTheme.primaryHover} !important;
        }
        .queries-container-theme .bg-\[\#3a1c14\] {
          background-color: ${curTheme.primaryDark} !important;
        }
        .queries-container-theme .text-\[\#3a1c14\] {
          color: ${curTheme.primaryDark} !important;
        }
        .queries-container-theme h4.text-\[\#3a1c14\], .queries-container-theme h2.text-\[\#3a1c14\], .queries-container-theme h3.text-\[\#3a1c14\] {
          color: ${curTheme.primaryDark} !important;
        }
        .queries-container-theme .text-\[\#3a1c14\]\/75 {
          color: rgba(${curTheme.primaryRGB}, 0.75) !important;
        }
        .queries-container-theme .text-\[\#3a1c14\]\/65 {
          color: rgba(${curTheme.primaryRGB}, 0.65) !important;
        }
        .queries-container-theme .bg-\[\#FDF8F6\] {
          background-color: ${curTheme.bgMain} !important;
        }
        .queries-container-theme .hover\:bg-\[\#FBF6F4\]:hover {
          background-color: ${curTheme.primaryLight} !important;
        }
        .queries-container-theme .bg-\[\#FBF6F4\] {
          background-color: ${curTheme.bgContainer} !important;
        }
        .queries-container-theme .bg-\[\#FAF8F5\] {
          background-color: ${curTheme.primaryLight} !important;
        }
        .queries-container-theme .border-\[\#EBDCD3\] {
          border-color: ${curTheme.borderMain} !important;
        }
        .queries-container-theme .border-\[\#EBDCD3\]\/60 {
          border-color: rgba(${curTheme.primaryRGB}, 0.25) !important;
        }
        .queries-container-theme .border-\[\#EBDCD3\]\/85 {
          border-color: rgba(${curTheme.primaryRGB}, 0.4) !important;
        }
        .queries-container-theme .border-\[\#EBDCD3\]\/40 {
          border-color: rgba(${curTheme.primaryRGB}, 0.15) !important;
        }
        .queries-container-theme .border-\[\#e8d5cc\] {
          border-color: ${curTheme.borderMain} !important;
        }
        .queries-container-theme .border-\[\#e8d5cc\]\/60 {
          border-color: rgba(${curTheme.primaryRGB}, 0.25) !important;
        }
        .queries-container-theme .border-\[\#e8d5cc\]\/30 {
          border-color: rgba(${curTheme.primaryRGB}, 0.15) !important;
        }
        .queries-container-theme .border-\[#ebd5cc\]\/20 {
          border-color: rgba(${curTheme.primaryRGB}, 0.1) !important;
        }
        .queries-container-theme .focus\:outline-\[#7c3a2a\]:focus {
          outline-color: ${curTheme.primary} !important;
        }
        .queries-container-theme .hover\:border-\[\#7c3a2a\]\/40:hover {
          border-color: rgba(${curTheme.primaryRGB}, 0.45) !important;
        }
        .queries-container-theme .bg-\[\#7c3d3d\] {
          background-color: ${curTheme.primary} !important;
        }
        .queries-container-theme .hover\:bg-\[\#632f2f\]:hover {
          background-color: ${curTheme.primaryHover} !important;
        }
        @keyframes queriesCursorBlink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        .queries-cursor-blink {
          animation: queriesCursorBlink 1s steps(1, end) infinite;
        }
        /* Short-screen fallback: below 620px viewport height, release fixed shell */
        @media (max-height: 620px) {
          .queries-container-theme {
            height: auto !important;
            min-height: 100vh !important;
            overflow: auto !important;
            overflow-y: auto !important;
          }
          .queries-content-grid {
            min-height: 560px;
          }
        }
      `}</style>

      {/* QUICK INLINE LOG DIALOG PORTAL */}
      {showLogModal && (
        <div className="fixed inset-0 bg-[#3a1c14]/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 border border-[#7c3a2a]/20 shadow-2xl max-w-md w-full relative">
            <h3 className="font-serif text-xl font-bold text-[#3a1c14] mb-4">Log a Query</h3>
            
            {logError && (
              <p className="p-2 mb-3 bg-[#A32D2D]/10 text-[#A32D2D] text-xs font-semibold rounded">{logError}</p>
            )}

            <form onSubmit={handleLogQuerySubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-[#3a1c14]/65 mb-1.5">Manuscript</label>
                <select
                  value={logMsId}
                  onChange={(e) => setLogMsId(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white rounded border border-[#7c3a2a]/10 focus:outline-[#7c3a2a]"
                >
                  {manuscripts.map(m => (
                    <option key={m.id} value={m.id}>{m.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-[#3a1c14]/65 mb-1.5">Target Agent</label>
                <select
                  value={logAgId}
                  onChange={(e) => setLogAgId(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white rounded border border-[#7c3a2a]/10"
                >
                  {agents.map(a => (
                    <option key={a.id} value={a.id}>{agentLabel(a)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-[#3a1c14]/65 mb-1.5">Submission Package</label>
                <select
                  value={logPkgId}
                  onChange={(e) => setLogPkgId(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white rounded border border-[#7c3a2a]/10"
                >
                  {packages.map(p => (
                    <option key={p.id} value={p.id}>{p.packageName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-[#3a1c14]/65 mb-1.5">Personalised Hook Notes</label>
                <textarea
                  value={logNotes}
                  onChange={(e) => setLogNotes(e.target.value)}
                  placeholder="Discussed her MSWL tweet..."
                  className="w-full text-xs p-2.5 bg-white rounded border border-[#7c3a2a]/10 min-h-[60px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pb-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Send Method</label>
                  <select
                    value={logMethod}
                    onChange={(e) => setLogMethod(e.target.value)}
                    className="w-full text-xs p-2 border border-[#7c3a2a]/10 bg-white mr-2"
                  >
                    <option value="Email">Email</option>
                    <option value="Online Form">QueryManager</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#7c3a2a]/10">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-3.5 py-1.5 bg-stone-100 font-bold hover:bg-stone-200 text-stone-700 rounded text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#7c3a2a] inline-flex items-center gap-1 hover:bg-[#7c3a2a]/95 text-white rounded text-xs font-bold whitespace-nowrap"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send query</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}




      {/* MAIN CONTENT — the control bar then the two-column desk (list + reading pane). */}
      <div
        className="w-full"
        style={{ paddingLeft: 0, background: "#faf5ee", flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column" }}
        id="queries-main-panel-container"
      >

        {/* OLD LEFT PANEL — hidden, kept for structural integrity */}
        <div style={{ display: "none" }}>
          

         {/* Scrollable subdivisions */}
         <div 
           className="flex-grow overflow-y-auto space-y-4 pt-3 pb-1.5 px-3 select-none custom-query-list-scrollbar" 
           
         >
           
           {false ? (
             <>
               {/* FILTER SECTION */}
               <div className="space-y-2">
                 <span className="block text-[10px] font-mono uppercase tracking-wider text-stone-400 font-bold select-none border-b border-[#EBDCD3]/63 pb-0.5 mb-1.5">
                   Filter
                 </span>

                 {/* Status nested filter */}
                 <div>
                   <span className="block text-[9px] font-mono uppercase text-[#7c3a2a]/65 font-bold mb-1 pl-1">
                     Query Status
                   </span>
                   <div className="space-y-0.5">
                     {[
                       { type: "filter", id: "All", label: "All queries", count: queries.length },
                       { type: "sublabel", label: "Active" },
                       { type: "filter", id: QueryStatus.QUERIED, label: "Queried", count: queries.filter(q => q.status === QueryStatus.QUERIED).length },
                       { type: "filter", id: QueryStatus.PARTIAL_REQUESTED, label: "Partial requested", count: queries.filter(q => q.status === QueryStatus.PARTIAL_REQUESTED).length },
                       { type: "filter", id: QueryStatus.PARTIAL_SENT, label: "Partial sent", count: queries.filter(q => q.status === QueryStatus.PARTIAL_SENT).length },
                       { type: "filter", id: QueryStatus.FULL_REQUESTED, label: "Full requested", count: queries.filter(q => q.status === QueryStatus.FULL_REQUESTED).length },
                       { type: "filter", id: QueryStatus.FULL_SENT, label: "Full sent", count: queries.filter(q => q.status === QueryStatus.FULL_SENT).length },
                       { type: "filter", id: QueryStatus.REVISE_RESUBMIT, label: "Revise & resubmit", count: queries.filter(q => q.status === QueryStatus.REVISE_RESUBMIT).length },
                       { type: "filter", id: QueryStatus.OFFER, label: "Offers", count: queries.filter(q => q.status === QueryStatus.OFFER).length, isOffer: true },
                       { type: "sublabel", label: "Closed" },
                       { type: "filter", id: QueryStatus.REJECTED, label: "Rejected", count: queries.filter(q => q.status === QueryStatus.REJECTED).length, isClosed: true },
                       { type: "filter", id: QueryStatus.WITHDRAWN, label: "Withdrawn", count: queries.filter(q => q.status === QueryStatus.WITHDRAWN).length, isClosed: true },
                       { type: "filter", id: QueryStatus.NO_RESPONSE, label: "No response", count: queries.filter(q => q.status === QueryStatus.NO_RESPONSE).length, isClosed: true },
                     ].map((item, idx) => {
                       if (item.type === "sublabel") {
                         return (
                           <div key={idx} className="text-[9px] font-mono tracking-wider text-stone-400 mt-1 mb-0.5 uppercase font-medium pl-1 select-none font-sans">
                             {item.label}
                           </div>
                         );
                       }

                       const isActive = item.id ? selectedStatusFilters.includes(item.id) : false;
                       const isZero = item.count === 0;

                       const handleStatusClick = () => {
                         if (!item.id) return;
                         if (item.id === "All") {
                           setSelectedStatusFilters(["All"]);
                         } else {
                           let nextFilters = [...selectedStatusFilters];
                           if (nextFilters.includes("All")) {
                             nextFilters = nextFilters.filter(f => f !== "All");
                           }
                           if (nextFilters.includes(item.id)) {
                             nextFilters = nextFilters.filter(f => f !== item.id);
                           } else {
                             nextFilters.push(item.id);
                           }
                           if (nextFilters.length === 0) {
                             nextFilters = ["All"];
                           }
                           setSelectedStatusFilters(nextFilters);
                         }
                       };

                       return (
                         <button
                           key={idx}
                           onClick={handleStatusClick}
                           className="w-full text-left px-1.5 py-0.5 rounded text-[11px] font-medium transition-all flex justify-between items-center cursor-pointer border-0"
                           style={{ backgroundColor: isActive ? "#FAF1EF" : "transparent" }}
                         >
                           <span className="flex items-center gap-1.5 min-w-0" style={{ color: isActive ? "#7c3a2a" : "#3a1c14" }}>
                             {item.type === "filter" && item.id !== "All" && (
                               <StatusDot status={item.id as QueryStatus} size={13} decorative />
                             )}
                             <span className={`truncate ${isActive ? "font-bold" : ""}`}>{item.label}</span>
                           </span>
                           <span className={`text-[10px] font-mono font-semibold ${isActive ? "text-[#7c3a2a]" : isZero ? "text-stone-400" : "text-[#7c3a2a]"}`}>
                             {isZero ? "-" : item.count}
                           </span>
                         </button>
                       );
                     })}
                   </div>
                 </div>

                 {/* Manuscript nested filter */}
                 <div>
                   <span className="block text-[9px] font-mono uppercase text-[#7c3a2a]/65 font-bold mb-1 pl-1">
                     Manuscript
                   </span>
                   <div className="space-y-0.5">
                     {[
                       { id: "All", title: "All queries", count: queries.length },
                       ...manuscripts.map(m => ({ id: m.id, title: m.title, count: queries.filter(q => q.manuscriptId === m.id).length }))
                     ].map((mOpt, mIdx) => {
                       const isActive = selectedManuscriptFilter === mOpt.id;
                       const isZero = mOpt.count === 0;
                       return (
                         <button
                           key={mIdx}
                           onClick={() => setSelectedManuscriptFilter(mOpt.id)}
                           className="w-full text-left px-1.5 py-0.5 rounded text-[11px] font-medium transition-all flex justify-between items-center cursor-pointer border-0"
                           style={{ backgroundColor: isActive ? "#FAF1EF" : "transparent" }}
                         >
                           <span className={`min-w-0 flex-1 leading-snug mr-2 text-left ${isActive ? "text-[#7c3a2a] font-bold" : "text-[#3a1c14]/75"}`}>{mOpt.title}</span>
                           <span className={`text-[10px] font-mono font-semibold shrink-0 ${isActive ? "text-[#7c3a2a]" : isZero ? "text-stone-400" : "text-[#7c3a2a]"}`}>
                             {isZero ? "-" : mOpt.count}
                           </span>
                         </button>
                       );
                     })}
                   </div>
                 </div>
               </div>

               <hr className="border-[#EBDCD3]/80" />

               {/* SORT SECTION */}
               <div>
                 <span className="block text-[10px] font-mono uppercase tracking-wider text-stone-400 font-bold select-none border-b border-[#EBDCD3]/63 pb-0.5 mb-1.5">
                   Sort
                 </span>
                 <select
                   value={sortOption}
                   onChange={(e) => setSortOption(e.target.value)}
                   className="w-full text-[11px] p-1 bg-white border border-[#EBDCD3] rounded text-[#3a1c14] focus:outline-[#7c3a2a] cursor-pointer"
                 >
                   <option value="Newest first">Newest first</option>
                   <option value="Oldest first">Oldest first</option>
                   <option value="Agent name A-Z">Agent A–Z</option>
                   <option value="Agent name Z-A">Agent Z–A</option>
                   <option value="Status">Status</option>
                   <option value="Response due soonest">Response due soonest</option>
                 </select>
               </div>
             </>
           ) : (
             <>
               {/* AGENTS-STYLE FILTERS & SORT */}
               {/* 1. Query Status */}
               <div className="space-y-1">
                 <span className="block text-[10px] font-mono uppercase tracking-wider text-stone-400 font-bold border-b border-[#ebdcd3] pb-0.5 mb-1.5 pl-1">
                   Query status
                 </span>
                 <div className="space-y-0.5">
                   {[
                     { type: "filter", id: "All", label: "All queries", count: queries.length },
                     { type: "sublabel", label: "Active" },
                     { type: "filter", id: QueryStatus.QUERIED, label: "Queried", count: queries.filter(q => q.status === QueryStatus.QUERIED).length },
                     { type: "filter", id: QueryStatus.PARTIAL_REQUESTED, label: "Partial req", count: queries.filter(q => q.status === QueryStatus.PARTIAL_REQUESTED).length },
                     { type: "filter", id: QueryStatus.PARTIAL_SENT, label: "Partial sent", count: queries.filter(q => q.status === QueryStatus.PARTIAL_SENT).length },
                     { type: "filter", id: QueryStatus.FULL_REQUESTED, label: "Full req", count: queries.filter(q => q.status === QueryStatus.FULL_REQUESTED).length },
                     { type: "filter", id: QueryStatus.FULL_SENT, label: "Full sent", count: queries.filter(q => q.status === QueryStatus.FULL_SENT).length },
                     { type: "filter", id: QueryStatus.REVISE_RESUBMIT, label: "R&R", count: queries.filter(q => q.status === QueryStatus.REVISE_RESUBMIT).length },
                     { type: "filter", id: QueryStatus.OFFER, label: "Offers", count: queries.filter(q => q.status === QueryStatus.OFFER).length, isOffer: true },
                     { type: "sublabel", label: "Closed" },
                     { type: "filter", id: QueryStatus.REJECTED, label: "Rejected", count: queries.filter(q => q.status === QueryStatus.REJECTED).length, isClosed: true },
                     { type: "filter", id: QueryStatus.WITHDRAWN, label: "Withdrawn", count: queries.filter(q => q.status === QueryStatus.WITHDRAWN).length, isClosed: true },
                     { type: "filter", id: QueryStatus.NO_RESPONSE, label: "No response", count: queries.filter(q => q.status === QueryStatus.NO_RESPONSE).length, isClosed: true },
                   ].map((item, idx) => {
                     if (item.type === "sublabel") {
                       return (
                         <div key={idx} className="text-[9px] font-mono tracking-wider text-stone-400 mt-2 mb-0.5 uppercase font-medium pl-1.5 select-none font-sans">
                           {item.label}
                         </div>
                       );
                     }

                     const isActive = item.id ? selectedStatusFilters.includes(item.id) : false;

                     const handleStatusClick = () => {
                       if (!item.id) return;
                       if (item.id === "All") {
                         setSelectedStatusFilters(["All"]);
                       } else {
                         let nextFilters = [...selectedStatusFilters];
                         if (nextFilters.includes("All")) {
                           nextFilters = nextFilters.filter(f => f !== "All");
                         }
                         if (nextFilters.includes(item.id)) {
                           nextFilters = nextFilters.filter(f => f !== item.id);
                         } else {
                           nextFilters.push(item.id);
                         }
                         if (nextFilters.length === 0) {
                           nextFilters = ["All"];
                         }
                         setSelectedStatusFilters(nextFilters);
                       }
                     };

                     return (
                       <button
                         key={idx}
                         onClick={handleStatusClick}
                         className={`w-full text-left py-1 px-1.5 text-[11px] rounded transition-all cursor-pointer flex justify-between items-center border-0 ${
                           isActive 
                             ? "bg-[#FAF1EF] text-[#7c3a2a] font-bold border-l-2 border-[#7c3a2a]" 
                             : "text-stone-600 hover:bg-stone-50"
                         }`}
                       >
                         <span className="flex items-center gap-1.5 min-w-0">
                           {item.id !== "All" && (
                             <StatusDot status={item.id as QueryStatus} size={13} decorative />
                           )}
                           <span className="truncate">{item.label}</span>
                         </span>
                         <span className="text-[9px] text-stone-400 font-mono">
                           ({item.count})
                         </span>
                       </button>
                     );
                   })}
                 </div>
               </div>

               {/* 2. Manuscripts */}
               <div className="space-y-1">
                 <span className="block text-[10px] font-mono uppercase tracking-wider text-stone-400 font-bold border-b border-[#ebdcd3] pb-0.5 mb-1.5 pl-1">
                   Manuscripts
                 </span>
                 <div className="space-y-0.5">
                   {[
                     { id: "All", title: "All queries", count: queries.length },
                     ...manuscripts.map(m => ({ id: m.id, title: m.title, count: queries.filter(q => q.manuscriptId === m.id).length }))
                   ].map((mOpt, mIdx) => {
                     const isActive = selectedManuscriptFilter === mOpt.id;
                     return (
                       <button
                         key={mIdx}
                         onClick={() => setSelectedManuscriptFilter(mOpt.id)}
                         className={`w-full text-left py-1 px-1.5 text-[11px] rounded transition-all cursor-pointer flex justify-between items-center border-0 ${
                           isActive 
                             ? "bg-[#FAF1EF] text-[#7c3a2a] font-bold border-l-2 border-[#7c3a2a]" 
                             : "text-stone-600 hover:bg-stone-50"
                         }`}
                       >
                         <span className="truncate flex-1 text-left leading-normal mr-2 pr-1">{mOpt.title}</span>
                         <span className="text-[9px] text-stone-400 font-mono shrink-0">
                           ({mOpt.count})
                         </span>
                       </button>
                     );
                   })}
                 </div>
               </div>

               {/* 3. Sort Options */}
               <div className="space-y-1">
                 <span className="block text-[10px] font-mono uppercase tracking-wider text-stone-400 font-bold border-b border-[#ebdcd3] pb-0.5 mb-1.5 pl-1">
                   Sort Options
                 </span>
                 <div className="space-y-0.5">
                   {[
                     { id: "Newest first", label: "Newest first" },
                     { id: "Oldest first", label: "Oldest first" },
                     { id: "Agent name A-Z", label: "Agent A–Z" },
                     { id: "Agent name Z-A", label: "Agent Z–A" },
                     { id: "Status", label: "Status" },
                     { id: "Response due soonest", label: "Response due soonest" }
                   ].map(item => {
                     const isActive = sortOption === item.id;
                     return (
                       <button
                         key={item.id}
                         onClick={() => setSortOption(item.id)}
                         className={`w-full text-left py-1 px-1.5 text-[11px] rounded transition-all cursor-pointer flex justify-between items-center border-0 ${
                           isActive 
                             ? "bg-[#FAF1EF] text-[#7c3a2a] font-bold border-l-2 border-[#7c3a2a]" 
                             : "text-stone-600 hover:bg-stone-50"
                         }`}
                       >
                         <span>{item.label}</span>
                         {isActive && <Check className="w-3.5 h-3.5 text-[#7c3a2a]" />}
                       </button>
                     );
                   })}
                 </div>
               </div>
             </>
           )}

         </div>

         {/* Bottom Control & CSV Buttons */}
         <div className="p-3 border-t border-[#EBDCD3]/80 bg-[#FAF8F5]/30 shrink-0 space-y-1.5">
           <button
             type="button"
             onClick={() => {
               const next = false;
               // no-op
               localStorage.setItem("scriptally_classic_filters", next ? "true" : "false");
             }}
             className="w-full py-1.5 px-2 bg-[#FAF1EF] hover:bg-[#ebdcd3]/45 text-[#7c3a2a] border border-dashed border-[#7c3a2a]/30 rounded-lg text-[9.5px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer shadow-3xs hidden"
           >
             {false ? "✨ Apply Agents-Style" : "⏪ Undo Style (Classic)"}
           </button>

           <button
             type="button"
             onClick={() => {
               exportQueriesToCSV(queries, `ScriptAlly_Queries_${new Date().toISOString().slice(0, 10)}`);
             }}
             className="w-full py-2 px-3 bg-white hover:bg-[#FAF1EF] text-[#7c3a2a] border border-[#d1d5db] rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-3xs"
           >
             <Download className="w-3.5 h-3.5" />
             <span>Download all as CSV</span>
           </button>
         </div>

      </div>

        {/* ── The desk — control bar over a list card + reading pane on the shell's cream well.
            (The legacy black .qdesk frame + rail/glint is retired; the chrome frame is the shell.) ── */}
        <style>{`
          /* list rows (ledger + monogram, Design A) — hairline-divided, no card/border/spine/lift.
             Selected = muted warm fill (not pink); hover = faint warm tint. */
          .qrow{ position:relative; padding:12px 15px; cursor:pointer; border-bottom:1px solid #ece3d6; transition:background .14s ease; }
          .qrow:last-child{ border-bottom:none; }
          .qrow:hover:not(.sel){ background:#faf6f0; }
          .qrow.sel{ background:#f1e7dd; }
        `}</style>
        {/* Desk (bold theme) — a cool blue-grey full-bleed working panel on which the list + reading
            pane sit as cards. Sidebar stays outside (shell chrome, untouched). */}
        {/* Fit-to-screen: the desk FILLS the height below the header (flex:1) in BOTH states — the
            list rows scroll internally so the page never exceeds 100vh; the empty state fills the
            same way (centred placeholder + welcome pane). */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
          <div className="qdesk" style={{ position: "relative", display: "flex", flexDirection: "column", border: "none", borderRadius: 0, background: "var(--desk)", overflow: "hidden", flex: 1, minHeight: 0 }}>
            {/* desk surface — full-bleed blue-grey working area, 22/28/30 content inset (mockup .desk) */}
            <div style={{ padding: "22px 28px 30px", display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>

        {queries.length === 0 ? (
          /* ── Empty database — the Queries Hub header, a list card with a "No queries yet"
             placeholder (Export disabled), and a welcome pane with Smart Import + manual add. ── */
          <>
          {/* Queries Hub header — shared look with the populated state */}
          <div className="qhbar" style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, background: "#fffefb", border: "var(--bdw) solid var(--bd)", borderRadius: "var(--chromerad)", padding: "13px 22px", marginBottom: 14, boxShadow: "0 8px 20px rgba(29,23,18,.18)", flexShrink: 0 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: FONT_SERIF, fontWeight: 800, fontSize: 25, color: "#1d1712", lineHeight: 1 }}>Queries Hub</div>
              <div style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: ".04em", textTransform: "uppercase" as const, color: "#5a6472", marginTop: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Tracking {hubSubtitle}</div>
            </div>
            <button type="button" onClick={() => onNavigate?.("queries", "Log a query")} onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.05)"; }} onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 17px", borderRadius: 12, fontFamily: FONT_SERIF, fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", cursor: "pointer", background: "#f5e2da", border: "1.5px solid #e8c8bc", color: "#7c3a2a", boxShadow: "0 3px 0 #e2c2b5", flexShrink: 0, transition: "transform .15s ease" }}>
              <Plus style={{ width: 15, height: 15 }} />
              Log a new query
            </button>
          </div>

          {/* Empty split — list placeholder (col 1) + welcome pane (col 2), both full desk height */}
          <div className="queries-content-grid" style={{ display: "grid", gridTemplateColumns: "330px 1fr", columnGap: 20, flex: 1, minHeight: 0, alignItems: "stretch" }}>

            {/* List card — search + header (0 queries · Sort · Filter) + centred placeholder + disabled CSV */}
            <div style={{ alignSelf: "stretch", background: "var(--listbg)", border: "var(--bdw) solid var(--bd)", borderRadius: "var(--chromerad)", overflow: "hidden", boxShadow: "0 8px 26px rgba(29,23,18,.12)", display: "flex", flexDirection: "column", minHeight: 0 }}>
              <div style={{ position: "relative", margin: "10px 6px 8px", flexShrink: 0 }}>
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 pointer-events-none" />
                <input type="text" placeholder="Search..." value={listSearch} onChange={(e) => setListSearch(e.target.value)} style={{ width: "100%", background: "#fff", border: "1px solid var(--bd)", borderRadius: 13, padding: "10px 15px 10px 38px", fontSize: 13.5, color: "#8a7a6c", fontFamily: "inherit", outline: "none", boxShadow: "0 2px 8px rgba(29,23,18,.10)" }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 6px 12px", flexShrink: 0 }}>
                <span style={{ fontFamily: FONT_SERIF, fontSize: 18, fontWeight: 800, color: qdbBoldInk }}>0 queries</span>
                <div style={{ display: "flex", gap: 14 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: FONT_MONO, fontSize: 10, fontWeight: 600, letterSpacing: ".03em", textTransform: "uppercase" as const, color: "#c3b8a8" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M7 12h10M10 18h4" /></svg>
                    Sort
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: FONT_MONO, fontSize: 10, fontWeight: 600, letterSpacing: ".03em", textTransform: "uppercase" as const, color: "#c3b8a8" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 5h18l-7 8v6l-4 2v-8z" /></svg>
                    Filter
                  </span>
                </div>
              </div>
              <div style={{ height: 1, background: "#cfc6ba", margin: "0 6px", flexShrink: 0 }} />
              {/* centred placeholder */}
              <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 24, gap: 8 }}>
                <span style={{ color: "#c9bcab", display: "flex" }}>
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
                </span>
                <span style={{ fontFamily: FONT_SERIF, fontWeight: 700, fontSize: 15, color: "#5a5048" }}>No queries yet</span>
                <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, lineHeight: 1.5, color: "#7d7268", maxWidth: 200 }}>Your queries will appear here once you log or import them.</span>
              </div>
              {/* CSV export — disabled (nothing to export) */}
              <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, borderTop: "1px solid #ece3d6", padding: 11, fontFamily: FONT_MONO, fontSize: 9.5, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase" as const, color: "#c3b8a8" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v11M7 9l5 5 5-5M5 21h14" /></svg>
                Export as CSV
              </div>
            </div>

            {/* Welcome pane — blush, centred onboarding (mockup .emptypane) */}
            <div className="qp-pane" style={{ alignSelf: "stretch", minHeight: 0, background: "var(--pane)", border: "var(--bdw) solid var(--bd)", borderRadius: 22, boxShadow: "0 8px 26px rgba(29,23,18,.12)", overflowY: "auto", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
              <div style={{ maxWidth: 460, width: "100%", textAlign: "center" }}>
                <div style={{ fontFamily: FONT_SERIF, fontWeight: 800, fontSize: 25, color: qdbBoldInk, marginBottom: 9 }}>No queries yet</div>
                <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 13.5, color: "#5a5048", lineHeight: 1.55, maxWidth: 360, margin: "0 auto 20px" }}>This is where you'll track every agent you query — what you sent, when it went, and what came back.</div>

                {/* Smart Import */}
                <div style={{ position: "relative", background: "#fcf9f3", border: "1px solid #e7ddce", borderRadius: 15, padding: "19px 21px", textAlign: "left" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 11 }}>
                    <span style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 12, background: "#eef2f5", color: "#5e7e9c", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Sparkles style={{ width: 23, height: 23 }} />
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 9, fontFamily: FONT_SERIF, fontWeight: 800, fontSize: 20, color: qdbBoldInk }}>Smart Import <span style={{ fontFamily: FONT_MONO, fontSize: 7.5, letterSpacing: ".1em", textTransform: "uppercase" as const, color: "#fff", background: "#6A89A7", border: "1px solid #4f6e8a", borderRadius: 999, padding: "2px 7px" }}>Pro</span></span>
                  </div>
                  <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: "#4f463c", lineHeight: 1.55, marginBottom: 16 }}>Upload your messy old spreadsheet and watch ScriptAlly build your whole database — every agent matched, sorted and dated, ready to track in seconds.</div>
                  <button type="button" onClick={() => onNavigate?.("import")} style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: FONT_SERIF, fontWeight: 700, fontSize: 14, padding: "11px 21px", borderRadius: 11, cursor: "pointer", background: "#fff", border: "1.5px solid #9db4c6", color: "#42637e" }}>
                    <Sparkles style={{ width: 18, height: 18 }} />
                    Try Smart Import
                  </button>
                </div>

                {/* divider */}
                <div style={{ display: "flex", alignItems: "center", gap: 13, margin: "20px 2px 16px" }}>
                  <div style={{ flex: 1, height: 1, background: "#e6ddce" }} />
                  <span style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: ".08em", textTransform: "uppercase" as const, color: "#a89a8b" }}>or add them yourself</span>
                  <div style={{ flex: 1, height: 1, background: "#e6ddce" }} />
                </div>

                {/* manual add — ink-outline buttons */}
                <div style={{ display: "flex", gap: 11, justifyContent: "center", flexWrap: "wrap" }}>
                  <button type="button" onClick={() => onNavigate?.("queries", "Log a query")} style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: FONT_SERIF, fontWeight: 700, fontSize: 14, padding: "11px 20px", borderRadius: 11, cursor: "pointer", background: "#fffefb", border: "1.5px solid #1d1712", color: "#1d1712" }}>
                    <Plus style={{ width: 15, height: 15 }} />
                    Add a query
                  </button>
                  <a href="/ScriptAlly-pipeline-import-template.xlsx" download style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: FONT_SERIF, fontWeight: 700, fontSize: 14, padding: "11px 20px", borderRadius: 11, textDecoration: "none", background: "#fffefb", border: "1.5px solid #1d1712", color: "#1d1712" }}>
                    <Download style={{ width: 15, height: 15 }} />
                    Download import template
                  </a>
                </div>
              </div>
            </div>
          </div>
          </>
        ) : (
        <>

        {/* ── Queries Hub header — white bar spanning the desk: title + subtitle · soft-pink Log CTA ── */}
        <div className="qhbar" style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, background: "#fffefb", border: "var(--bdw) solid var(--bd)", borderRadius: "var(--chromerad)", padding: "13px 22px", marginBottom: 14, boxShadow: "0 8px 20px rgba(29,23,18,.18)", flexShrink: 0 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: FONT_SERIF, fontWeight: 800, fontSize: 25, color: "#1d1712", lineHeight: 1 }}>Queries Hub</div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: ".04em", textTransform: "uppercase" as const, color: "#5a6472", marginTop: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Tracking {hubSubtitle}</div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate?.("queries", "Log a query")}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.05)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
            style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 17px", borderRadius: 12, fontFamily: FONT_SERIF, fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", cursor: "pointer", background: "#f5e2da", border: "1.5px solid #e8c8bc", color: "#7c3a2a", boxShadow: "0 3px 0 #e2c2b5", flexShrink: 0, transition: "transform .15s ease" }}
          >
            <Plus style={{ width: 15, height: 15 }} />
            Log a new query
          </button>
        </div>

        {/* MarkSentPopover — anchored via useFixedMenu to the actions-toolbar CTA */}
        <AnimatePresence>
          {isMarkSentOpen && activeQuery && activeAgent && (() => {
            const a2 = getPrimaryAction(currentStatus as QueryStatus);
            if (a2.kind !== "mark-sent") return null;
            return (
              <MarkSentPopover
                key="mark-sent"
                style={markSentMenuStyle}
                kind={a2.markKind}
                query={activeQuery}
                agent={activeAgent}
                triggerRef={markSentTriggerRef}
                onClose={() => setIsMarkSentOpen(false)}
                onRecordResponseInstead={() => {
                  setIsMarkSentOpen(false);
                  setIsRecordResponseFocusFormOpen(true);
                }}
                onSave={async ({ sentDate, responseDeadline, nudgeDate }) => {
                  await recordMaterialsSent({
                    queryId: activeQuery.id,
                    targetStatus: a2.target as QueryStatus.PARTIAL_SENT | QueryStatus.FULL_SENT,
                    sentDate,
                    isResubmit: a2.markKind === "resubmit",
                    responseDeadline,
                    nudgeDate,
                  });
                }}
              />
            );
          })()}
        </AnimatePresence>

        {/* ── Split — list card (full desk height, col 1) · actions toolbar (col 2 row 1) over the
            reading pane (col 2 row 2). Rows: auto (toolbar) then 1fr (pane). ── */}
        <div className="queries-content-grid" style={{ display: "grid", gridTemplateColumns: "330px 1fr", gridTemplateRows: "auto 1fr", columnGap: 20, rowGap: 14, flex: 1, minHeight: 0, alignItems: "start" }}>

          {/* List card — spans both rows so it fills the desk height; search + header + CSV footer are
              fixed, only the rows scroll (fit-to-screen, independent of row count). */}
          <div style={{ gridColumn: 1, gridRow: "1 / span 2", alignSelf: "stretch", background: "var(--listbg)", border: "var(--bdw) solid var(--bd)", borderRadius: "var(--chromerad)", overflow: "hidden", boxShadow: "0 8px 26px rgba(29,23,18,.12)", display: "flex", flexDirection: "column", minHeight: 0 }}>

              {/* Search — fixed at the top of the list card */}
              <div style={{ position: "relative", margin: "10px 6px 8px", flexShrink: 0 }}>
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={listSearch}
                  onChange={(e) => setListSearch(e.target.value)}
                  style={{ width: "100%", background: "#fff", border: "1px solid var(--bd)", borderRadius: 13, padding: "10px 15px 10px 38px", fontSize: 13.5, color: "#8a7a6c", fontFamily: "inherit", outline: "none", boxShadow: "0 2px 8px rgba(29,23,18,.10)" }}
                />
              </div>

              {/* List head — count (Playfair) + Sort / Filter mono icon-buttons */}
              <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 6px 12px", flexShrink: 0 }}>
                <span style={{ fontFamily: FONT_SERIF, fontSize: 18, fontWeight: 800, color: qdbBoldInk }}>
                  {sortedList.length} {sortedList.length === 1 ? "query" : "queries"}
                </span>
                <div style={{ display: "flex", gap: 14 }}>
                  <button
                    type="button"
                    onClick={() => { setSortMenuOpen((o) => !o); setFilterMenuOpen(false); }}
                    style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "transparent", border: "none", cursor: "pointer", fontFamily: FONT_MONO, fontSize: 10, fontWeight: 600, letterSpacing: ".03em", textTransform: "uppercase" as const, color: qdbBoldInk2 }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M7 12h10M10 18h4" /></svg>
                    Sort
                  </button>
                  <button
                    type="button"
                    onClick={() => { setFilterMenuOpen((o) => !o); setSortMenuOpen(false); }}
                    style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "transparent", border: "none", cursor: "pointer", fontFamily: FONT_MONO, fontSize: 10, fontWeight: 600, letterSpacing: ".03em", textTransform: "uppercase" as const, color: qdbBoldInk2 }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 5h18l-7 8v6l-4 2v-8z" /></svg>
                    Filter
                  </button>
                </div>

                {/* click-away backdrop for the Filter / Sort menus */}
                {(filterMenuOpen || sortMenuOpen) && (
                  <div onClick={() => { setFilterMenuOpen(false); setSortMenuOpen(false); }} style={{ position: "fixed", inset: 0, zIndex: 20 }} />
                )}

                {/* Sort menu */}
                {sortMenuOpen && (
                  <div style={{ position: "absolute", top: "100%", right: 2, marginTop: 8, width: 178, background: "#fff", border: "1px solid var(--bd)", borderRadius: 12, boxShadow: "0 12px 30px rgba(29,23,18,.22)", padding: 7, zIndex: 30 }}>
                    <div style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: ".12em", textTransform: "uppercase" as const, color: qdbBoldMuted, padding: "4px 9px 7px" }}>Sort</div>
                    {["Newest first", "Oldest first", "Agent name A-Z", "Agent name Z-A"].map((opt) => {
                      const on = sortOption === opt;
                      return (
                        <button key={opt} type="button" onClick={() => { setSortOption(opt); setSortMenuOpen(false); }} style={{ display: "flex", alignItems: "center", width: "100%", textAlign: "left", border: "none", cursor: "pointer", padding: "7px 9px", borderRadius: 8, fontFamily: "'Inter',sans-serif", fontSize: 13, color: "#3a2c24", fontWeight: on ? 600 : 400, background: on ? "#f4ebe2" : "transparent" }}>
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Filter menu — status set with live counts + direction dots (+ manuscript scope) */}
                {filterMenuOpen && (() => {
                  const countOf = (s: QueryStatus) => queries.filter((q) => q.status === s).length;
                  const activeSum = ACTIVE_STATUSES.reduce((a, s) => a + countOf(s), 0);
                  const closedSum = CLOSED_STATUSES.reduce((a, s) => a + countOf(s), 0);
                  const toggleStatus = (id: QueryStatus) => {
                    let next = selectedStatusFilters.filter((f) => f !== "All");
                    next = next.includes(id) ? next.filter((f) => f !== id) : [...next, id];
                    setSelectedStatusFilters(next.length === 0 ? ["All"] : next);
                  };
                  const dot = (kind: "nul" | "out" | "in" | "closed"): React.CSSProperties => ({
                    width: 12, height: 12, borderRadius: "50%", border: "2px solid", flexShrink: 0,
                    ...(kind === "nul" ? { borderColor: "#7d7268" }
                      : kind === "out" ? { borderColor: "#7c3a2a", background: "#f8e7dc" }
                      : kind === "in" ? { borderColor: "#8a9e88", background: "#e9ede6" }
                      : { borderColor: "#a89f92", background: "#efece7" }),
                  });
                  const rowStyle = (on: boolean): React.CSSProperties => ({ display: "flex", alignItems: "center", gap: 9, width: "100%", textAlign: "left", border: "none", cursor: "pointer", padding: "7px 9px", borderRadius: 8, fontSize: 13, background: on ? "#f4ebe2" : "transparent" });
                  const lbl = (on: boolean): React.CSSProperties => ({ flex: 1, color: "#3a2c24", fontFamily: "'Inter',sans-serif", fontWeight: on ? 600 : 400 });
                  const cnt: React.CSSProperties = { fontFamily: FONT_MONO, fontSize: 11, color: qdbBoldMuted };
                  const STATUS_ROWS: { id: QueryStatus; label: string; kind: "out" | "in" }[] = [
                    { id: QueryStatus.QUERIED, label: "Queried", kind: "out" },
                    { id: QueryStatus.PARTIAL_REQUESTED, label: "Partial req.", kind: "in" },
                    { id: QueryStatus.PARTIAL_SENT, label: "Partial sent", kind: "out" },
                    { id: QueryStatus.FULL_REQUESTED, label: "Full req.", kind: "in" },
                    { id: QueryStatus.FULL_SENT, label: "Full sent", kind: "out" },
                    { id: QueryStatus.REVISE_RESUBMIT, label: "R&R", kind: "in" },
                    { id: QueryStatus.OFFER, label: "Offers", kind: "out" },
                  ];
                  return (
                    <div style={{ position: "absolute", top: "100%", right: 2, marginTop: 8, width: 216, background: "#fff", border: "1px solid var(--bd)", borderRadius: 12, boxShadow: "0 12px 30px rgba(29,23,18,.22)", padding: 7, zIndex: 30, maxHeight: 380, overflowY: "auto" }}>
                      {/* Manuscript scope — only when tracking more than one book */}
                      {manuscripts.length > 1 && (
                        <>
                          <div style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: ".12em", textTransform: "uppercase" as const, color: qdbBoldMuted, padding: "4px 9px 7px" }}>Manuscript</div>
                          <button type="button" onClick={() => setSelectedManuscriptFilter("All")} style={rowStyle(selectedManuscriptFilter === "All")}>
                            <span style={lbl(selectedManuscriptFilter === "All")}>All manuscripts</span>
                            <span style={cnt}>{queries.length}</span>
                          </button>
                          {manuscripts.map((m) => {
                            const on = selectedManuscriptFilter === m.id;
                            return (
                              <button key={m.id} type="button" onClick={() => setSelectedManuscriptFilter(m.id)} style={rowStyle(on)}>
                                <span style={{ ...lbl(on), overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.title}</span>
                                <span style={cnt}>{queries.filter((q) => q.manuscriptId === m.id).length}</span>
                              </button>
                            );
                          })}
                          <div style={{ height: 1, background: "#ece3d6", margin: "6px 4px" }} />
                        </>
                      )}
                      <div style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: ".12em", textTransform: "uppercase" as const, color: qdbBoldMuted, padding: "4px 9px 7px" }}>Filter</div>
                      <button type="button" onClick={() => setSelectedStatusFilters(allActiveHighlighted ? ["All"] : [...ACTIVE_STATUSES])} style={rowStyle(allActiveHighlighted)}>
                        <span style={dot("nul")} /><span style={lbl(allActiveHighlighted)}>All active</span><span style={cnt}>{activeSum}</span>
                      </button>
                      {STATUS_ROWS.map((r) => {
                        const on = selectedStatusFilters.includes(r.id);
                        return (
                          <button key={r.id} type="button" onClick={() => toggleStatus(r.id)} style={rowStyle(on)}>
                            <span style={dot(r.kind)} /><span style={lbl(on)}>{r.label}</span><span style={cnt}>{countOf(r.id)}</span>
                          </button>
                        );
                      })}
                      <button type="button" onClick={() => setSelectedStatusFilters(allClosedHighlighted ? ["All"] : [...CLOSED_STATUSES])} style={rowStyle(allClosedHighlighted)}>
                        <span style={dot("closed")} /><span style={lbl(allClosedHighlighted)}>All closed</span><span style={cnt}>{closedSum}</span>
                      </button>
                    </div>
                  );
                })()}
              </div>
              {/* thin inset grey rule beneath the header (doesn't reach the container edges) */}
              <div style={{ height: 1, background: "#cfc6ba", margin: "0 6px", flexShrink: 0 }} />

              {/* Rows area — flex:1 so it fills the list card below the fixed header; the inner scroll
                  keeps the list within one screen and reactivates the top/bottom fade overlays. */}
              <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
                <div aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, top: 0, height: 26, pointerEvents: "none", zIndex: 2, background: "linear-gradient(to bottom, #fff, rgba(255,255,255,0))", opacity: listFade.top ? 1 : 0, transition: "opacity .16s ease" }} />
                <div ref={listScrollRef} onScroll={recomputeListFades} style={{ height: "100%", overflowY: "auto", overflowX: "hidden", padding: "2px 0 4px" }} className="custom-query-list-scrollbar">
                  <div>
            {(() => {
              const statusOrder = [
                QueryStatus.QUERIED,
                QueryStatus.PARTIAL_REQUESTED,
                QueryStatus.PARTIAL_SENT,
                QueryStatus.FULL_REQUESTED,
                QueryStatus.FULL_SENT,
                QueryStatus.REVISE_RESUBMIT,
                QueryStatus.OFFER,
                QueryStatus.REJECTED,
                QueryStatus.WITHDRAWN,
                QueryStatus.NO_RESPONSE
              ];

              const getStatusHeaderLabel = (status: QueryStatus) => {
                switch (status) {
                  case QueryStatus.QUERIED: return "Sent / Queried";
                  case QueryStatus.PARTIAL_REQUESTED: return "Partial Requested";
                  case QueryStatus.PARTIAL_SENT: return "Partial Sent";
                  case QueryStatus.FULL_REQUESTED: return "Full Requested";
                  case QueryStatus.FULL_SENT: return "Full Sent";
                  case QueryStatus.REVISE_RESUBMIT: return "Revise & Resubmit";
                  case QueryStatus.OFFER: return "Offers of Representation";
                  case QueryStatus.REJECTED: return "Rejected";
                  case QueryStatus.WITHDRAWN: return "Withdrawn";
                  case QueryStatus.NO_RESPONSE: return "No Response";
                  default: return status;
                }
              };

              const renderQueryCard = (q: Query) => {
                const agent = agents.find(a => a.id === q.agentId);
                const ms = manuscripts.find(m => m.id === q.manuscriptId);
                if (!agent || !ms) return null;

                const isSelected = selectedQueryId === q.id;
                
                // Queried date — bare, quiet "14 Mar" (UK day-month); the year shows only when it
                // isn't the current year ("30 Jun 2024"). No "Queried" label; it sits in the corner.
                const dateObj = new Date(q.dateSent);
                const queriedDate = `${dateObj.getDate()} ${dateObj.toLocaleString("en-GB", { month: "short" })}${dateObj.getFullYear() !== new Date().getFullYear() ? ` ${dateObj.getFullYear()}` : ""}`;

                const statusChip = undoingQueryIds.has(q.id) ? (
                  <div className="animate-pulse flex items-center gap-1 min-h-[20px]">
                    <span className="w-1.5 h-1.5 bg-[#7c3a2a] rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 bg-[#7c3a2a] rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 bg-[#7c3a2a] rounded-full animate-bounce"></span>
                  </div>
                ) : (
                  <span style={{ display: "inline-flex", flexShrink: 0 }}>
                    <StatusDot status={q.status} overrideSize={20} />
                  </span>
                );

                // Monogram initials — first + last initial of the agent name (or agency); echoes the hero.
                const monoInitials = (() => {
                  const src = (agent.name?.trim() || agent.agency?.trim() || "");
                  const parts = src.split(/\s+/).filter(Boolean);
                  if (parts.length === 0) return "?";
                  if (parts.length === 1) return parts[0][0].toUpperCase();
                  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
                })();

                return (
                  <div
                    key={q.id}
                    id={`query-row-${q.id}`}
                    onClick={() => setSelectedQueryId(q.id)}
                    className={`qrow ${isSelected ? "sel" : ""}`}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                      {/* monogram disc — pink gradient + burgundy initials, echoing the hero avatar */}
                      <span style={{ flexShrink: 0, width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg,#f5e2da,#efd5ca)", border: "1px solid #e8c8bc", color: qdbBoldInk2, display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_SERIF, fontSize: 13, fontWeight: 700 }}>{monoInitials}</span>
                      {/* middle — name over agency */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: FONT_SERIF, fontSize: 16, fontWeight: 700, color: qdbBoldInk, lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{agent.name?.trim() || agent.agency}</div>
                        <div style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: ".05em", textTransform: "uppercase" as const, color: qdbBoldMuted, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{agentAgencyLine(agent)}</div>
                      </div>
                      {/* right — StatusDot over the date sent, stacked */}
                      <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                        {statusChip}
                        <span style={{ fontFamily: FONT_MONO, fontSize: 9, fontWeight: 600, color: "#8a8076", whiteSpace: "nowrap" }}>{queriedDate}</span>
                      </div>
                    </div>
                  </div>
                );
              };

              const queryHasActionRequired = (qId: string) => {
                const q = queries.find(qi => qi.id === qId);
                if (!q) return false;
                const statusNeedsAction = [QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED, QueryStatus.REVISE_RESUBMIT, QueryStatus.OFFER].includes(q.status);
                const hasMatchingTask = tasks ? tasks.some(t => t.relatedRecordId === qId) : false;
                return statusNeedsAction || hasMatchingTask;
              };

              if (groupOption === "Status") {
                const statusGroups = [
                  { label: "Queried", statuses: [QueryStatus.QUERIED] },
                  { label: "Partial Requested", statuses: [QueryStatus.PARTIAL_REQUESTED] },
                  { label: "Partial Sent", statuses: [QueryStatus.PARTIAL_SENT] },
                  { label: "Full Requested", statuses: [QueryStatus.FULL_REQUESTED] },
                  { label: "Full Sent", statuses: [QueryStatus.FULL_SENT] },
                  { label: "Revise & Resubmit", statuses: [QueryStatus.REVISE_RESUBMIT] },
                  { label: "Offers of Representation", statuses: [QueryStatus.OFFER] },
                  { label: "Closed", statuses: [QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE] },
                ];

                return statusGroups.map((group, grpIdx) => {
                  const grpQueries = sortedList.filter(q => group.statuses.includes(q.status));
                  if (grpQueries.length === 0) return null;
                  return (
                    <div key={grpIdx} className="py-2">
                      <div className="px-2.5 py-1.5 bg-[#FAF8F5] border border-[#EBDCD3]/65 rounded-lg mb-1 flex items-center justify-between select-none">
                        <span className="text-[11px] font-sans text-[#7c3a2a] font-bold">
                          {group.label}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-stone-400">
                          {grpQueries.length}
                        </span>
                      </div>
                      <div>
                        {grpQueries.map(q => renderQueryCard(q))}
                      </div>
                    </div>
                  );
                });
              }

              if (groupOption === "Action Required") {
                const groups = [
                  { label: "Action Required: Yes", value: true },
                  { label: "Action Required: No", value: false }
                ];
                return groups.map(grp => {
                  const grpQueries = sortedList.filter(q => queryHasActionRequired(q.id) === grp.value);
                  if (grpQueries.length === 0) return null;
                  return (
                    <div key={grp.label} className="py-2">
                      <div className="px-2.5 py-1 bg-[#FAF8F5] border border-[#EBDCD3]/65 rounded-lg mb-1 flex items-center justify-between select-none">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-[#7c3a2a] font-bold">
                          {grp.label}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-stone-400">
                          {grpQueries.length}
                        </span>
                      </div>
                      <div>
                        {grpQueries.map(q => renderQueryCard(q))}
                      </div>
                    </div>
                  );
                });
              }

              if (groupOption === "Manuscript") {
                return [
                  ...manuscripts.map(m => ({ id: m.id, label: m.title })),
                  { id: "unknown", label: "Other Manuscript" }
                ].map(grp => {
                  const grpQueries = sortedList.filter(q => {
                    if (grp.id === "unknown") {
                      return !manuscripts.some(m => m.id === q.manuscriptId);
                    }
                    return q.manuscriptId === grp.id;
                  });
                  if (grpQueries.length === 0) return null;
                  return (
                    <div key={grp.id} className="py-2">
                      <div className="px-2.5 py-1 bg-[#FAF8F5] border border-[#EBDCD3]/65 rounded-lg mb-1 flex items-center justify-between select-none">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-[#7c3a2a] font-bold truncate max-w-[150px]">
                          {grp.label}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-stone-400">
                          {grpQueries.length}
                        </span>
                      </div>
                      <div>
                        {grpQueries.map(q => renderQueryCard(q))}
                      </div>
                    </div>
                  );
                });
              }

              if (groupOption === "Agent Fit Rating") {
                const stars = [5, 4, 3, 2, 1] as const;
                const getRatingLabel = (star: number) => {
                  switch (star) {
                    case 5: return "⭐⭐⭐⭐⭐ Excellent Fit";
                    case 4: return "⭐⭐⭐⭐ Great Fit";
                    case 3: return "⭐⭐⭐ Good Fit";
                    case 2: return "⭐⭐ Balanced Fit";
                    case 1: return "⭐ Standard Fit";
                    default: return `${star} Star Fit`;
                  }
                };
                return stars.map(star => {
                  const starQueries = sortedList.filter(q => {
                    const agent = agents.find(a => a.id === q.agentId);
                    return agent?.starRating === star;
                  });
                  if (starQueries.length === 0) return null;
                  return (
                    <div key={star} className="py-2">
                      <div className="px-2.5 py-1 bg-[#FAF8F5] border border-[#EBDCD3]/65 rounded-lg mb-1 flex items-center justify-between select-none">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-[#7c3a2a] font-bold">
                          {getRatingLabel(star)}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-stone-400">
                          {starQueries.length}
                        </span>
                      </div>
                      <div>
                        {starQueries.map(q => renderQueryCard(q))}
                      </div>
                    </div>
                  );
                });
              }

              return sortedList.map(q => renderQueryCard(q));
            })()}

            {sortedList.length === 0 && (
              <div className="text-center py-12 px-4 text-[#3a1c14]/40 text-xs italic select-none">
                No matching queries found.
              </div>
            )}
                  </div>{/* closes rows wrapper */}
                </div>{/* closes scroll container */}
                <div aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 26, pointerEvents: "none", zIndex: 2, background: "linear-gradient(to top, #fff, rgba(255,255,255,0))", opacity: listFade.bottom ? 1 : 0, transition: "opacity .16s ease" }} />
              </div>{/* closes scroll-area wrapper */}

              {/* CSV export — muted footer pinned to the list-card foot; disabled when nothing to export */}
              <button
                type="button"
                onClick={() => sortedList.length > 0 && handleExportFilteredCSV()}
                disabled={sortedList.length === 0}
                style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "transparent", border: "none", borderTop: "1px solid #ece3d6", padding: 11, fontFamily: FONT_MONO, fontSize: 9.5, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase" as const, color: sortedList.length === 0 ? "#c3b8a8" : qdbBoldMuted, cursor: sortedList.length === 0 ? "default" : "pointer" }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v11M7 9l5 5 5-5M5 21h14" /></svg>
                Export as CSV
              </button>
          </div>{/* closes list card */}

          {/* Actions toolbar — Record response + Edit begin at the pane's left edge; Download as PDF is
              pushed to the far right. All three share the outlined ghost style (white, ink border). */}
          {(() => {
            const ctrlAction = currentStatus
              ? getPrimaryAction(currentStatus as QueryStatus)
              : { kind: "record" as const, label: "Record response", ballHolder: null as null };
            const hasActive = !!(activeQuery && activeAgent && activeMs);
            const abtn: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 7, fontFamily: FONT_SERIF, fontSize: 14, fontWeight: 700, color: qdbBoldInk, background: "#ffffff", border: "1px solid var(--bd)", borderRadius: 12, padding: "9px 15px", whiteSpace: "nowrap", boxShadow: "0 4px 11px rgba(29,23,18,.20)", transition: "transform .16s ease" };
            const swell = (on: boolean) => ({
              onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => { if (on) e.currentTarget.style.transform = "scale(1.04)"; },
              onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.transform = "scale(1)"; },
            });
            return (
              <div style={{ gridColumn: 2, gridRow: 1, display: "flex", gap: 12, alignItems: "center" }}>
                {ctrlAction.kind === "mark-sent" ? (
                  <button ref={markSentTriggerRef} type="button" onClick={() => hasActive && setIsMarkSentOpen(o => !o)} {...swell(hasActive)} style={{ ...abtn, gap: 8, cursor: hasActive ? "pointer" : "default", opacity: hasActive ? 1 : 0.5 }}>
                    <Send style={{ width: 14, height: 14, strokeWidth: 1.8 } as any} />
                    {ctrlAction.label}
                  </button>
                ) : (
                  <button type="button" onClick={() => hasActive && setIsRecordResponseFocusFormOpen(true)} {...swell(hasActive)} style={{ ...abtn, gap: 8, cursor: hasActive ? "pointer" : "default", opacity: hasActive ? 1 : 0.5 }}>
                    <Send style={{ width: 14, height: 14, strokeWidth: 1.8 } as any} />
                    {ctrlAction.label}
                  </button>
                )}
                <button type="button" onClick={() => { if (hasActive && activeQuery) openEditQuery(activeQuery.id); }} {...swell(hasActive)} style={{ ...abtn, cursor: hasActive ? "pointer" : "default", opacity: hasActive ? 1 : 0.5 }}>
                  <Pencil style={{ width: 13, height: 13 }} />
                  Edit
                </button>
                <button type="button" onClick={() => hasActive && !isGeneratingPDF && handleDownloadPDF()} {...swell(hasActive && !isGeneratingPDF)} style={{ ...abtn, marginLeft: "auto", cursor: (hasActive && !isGeneratingPDF) ? "pointer" : "default", opacity: (hasActive && !isGeneratingPDF) ? 1 : 0.5 }}>
                  <Download style={{ width: 13, height: 13 }} />
                  {isGeneratingPDF ? "Generating…" : "Download as PDF"}
                </button>
              </div>
            );
          })()}

          {/* Reading pane — blush paper card (col 2, row 2). Fit: HUGS its content (blue desk shows
              beneath); caps at the row height (maxHeight:100%) and scrolls internally if tall. */}
          <div className="qp-pane" style={{ gridColumn: 2, gridRow: 2, position: "relative", alignSelf: "start", maxHeight: "100%", minHeight: 0, border: "var(--bdw) solid var(--bd)", borderRadius: 22, background: "var(--pane)", boxShadow: "0 8px 26px rgba(29,23,18,.12)", overflowY: "auto", overflowX: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "contents" }}>
            {activeQuery && activeAgent && activeMs ? (
              <>
                <style>{`
                  .qp-noteacts{ opacity:0; transition:opacity .14s; }
                  .qp-note:hover .qp-noteacts{ opacity:1; }
                  .qp-noteact{ width:22px; height:22px; border:none; background:transparent; border-radius:5px; color:#bcae9e; display:flex; align-items:center; justify-content:center; cursor:pointer; }
                  .qp-noteact:hover{ background:#f3ebe0; color:#7c3a2a; }
                  /* column swell on hover */
                  .qp-card{ transition:transform .18s ease, box-shadow .18s ease; }
                  .qp-card:hover{ transform:scale(1.02); box-shadow:0 16px 30px rgba(29,23,18,.24); z-index:2; }
                  /* empty-state "add" pills — dashed, tappable, open the Edit Agent drawer */
                  .qaddpill{ display:inline-flex; align-items:center; gap:6px; font-family:'Inter',sans-serif; font-size:12px; font-weight:500; color:#6a5f54; background:#ffffff; border:1.5px dashed #c2b6a6; border-radius:999px; padding:6px 13px; cursor:pointer; transition:color .14s, border-color .14s, background .14s; }
                  .qaddpill:hover{ color:#3a5066; border-color:#6A89A7; background:#fff; }
                  .qaddpill svg{ flex-shrink:0; opacity:.85; }
                  @media (prefers-reduced-motion: reduce){ .qp-card:hover{ transform:none; } }
                `}</style>
                {/* ── Masthead — a bordered card inset to the columns' width, content centred:
                    avatar beside name/agency, then email · genres · add-pills. Status chip pinned
                    top-right inside the box. ── */}
                {(() => {
                  const hasName = !!(activeAgent.name?.trim());
                  const nameplate = (hasName ? activeAgent.name : activeAgent.agency) || "Unknown agent";
                  // Initials: first + last initial of the agent name (or agency), single token → one.
                  const initials = (() => {
                    const src = (activeAgent.name?.trim() || activeAgent.agency?.trim() || "");
                    const parts = src.split(/\s+/).filter(Boolean);
                    if (parts.length === 0) return "?";
                    if (parts.length === 1) return parts[0][0].toUpperCase();
                    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
                  })();
                  const email = activeAgent.email?.trim();
                  const mswl = activeAgent.mswlNotes?.trim();
                  const genres = (activeAgent.genres || []).filter(Boolean);
                  // Status-tint hero: white → a soft tint of the query's status-direction colour, with
                  // an enlarged StatusDot watermark on the right. Real status announced via the label.
                  const heroDir = statusDirection(activeQuery.status);
                  const heroTint = heroDir === "out" ? "#f9efe9" : heroDir === "in" ? "#eef3ec" : "#f0ece7";
                  const heroStatColour = heroDir === "out" ? "#7c3a2a" : heroDir === "in" ? "#5a6e58" : "#8a7d6c";
                  return (
                    <div className="qp-hero" style={{ position: "relative", overflow: "hidden", margin: "16px 18px 0", padding: "22px 26px", border: "var(--bdw) solid var(--bd)", borderRadius: 20, background: `linear-gradient(90deg, #ffffff 36%, ${heroTint} 100%)`, boxShadow: "0 8px 20px rgba(29,23,18,.18)", flexShrink: 0 }}>
                      {/* top row — avatar centred against the name + agency + status label */}
                      <div style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", gap: 18 }}>
                        {/* avatar — solid ink disc + white initials (per the Queries Hub mockup) */}
                        <span style={{ flexShrink: 0, width: 66, height: 66, borderRadius: "50%", background: "#1d1712", border: "none", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_SERIF, fontSize: 22, fontWeight: 700 }}>{initials}</span>
                        <div style={{ flex: 1, minWidth: 0, paddingRight: 120 }}>
                          <div style={{ fontFamily: FONT_SERIF, fontSize: 33, fontWeight: 800, color: qdbBoldInk, lineHeight: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nameplate}</div>
                          {hasName && !!activeAgent.agency?.trim() && (
                            <div style={{ fontFamily: FONT_SERIF, fontSize: 17, fontWeight: 600, color: "#4a423a", marginTop: 2 }}>{activeAgent.agency}</div>
                          )}
                          {/* real status — the accessible announcement (the watermark dot is aria-hidden) */}
                          <div style={{ fontFamily: FONT_MONO, fontSize: 9.5, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase" as const, color: heroStatColour, marginTop: 8 }}>{statusDisplayLabel(activeQuery)}</div>
                        </div>
                      </div>
                      {/* meta — email / wish list / genres, indented to align under the name (avatar 66 + gap 18) */}
                      <div style={{ position: "relative", zIndex: 2, marginTop: 12, marginLeft: 84, display: "flex", flexDirection: "column", gap: 8 }}>
                          {email && (
                            <div style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: "'Inter',sans-serif", fontSize: 13, fontWeight: 500, color: qdbBoldInk }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" style={{ opacity: .85, flexShrink: 0 }}><rect x="2.5" y="4.5" width="19" height="15" rx="2.5" /><path d="M3 6l9 6.5L21 6" /></svg>
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email}</span>
                            </div>
                          )}
                          {mswl && (
                            <div style={{ fontFamily: "'Inter',sans-serif", fontStyle: "italic", fontSize: 12, lineHeight: 1.45, color: "#5a5048", maxWidth: 560 }}>“{mswl}”</div>
                          )}
                          {genres.length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
                              {genres.map((genre, gIdx) => (
                                <span key={gIdx} style={{ fontFamily: FONT_MONO, fontSize: 8, letterSpacing: ".12em", textTransform: "uppercase" as const, color: "#5a6e58", background: "#fdfaf5", border: "1px solid #cdddc7", borderRadius: 999, padding: "3px 10px" }}>{genre}</span>
                              ))}
                            </div>
                          )}
                          {(!email || !mswl || genres.length === 0) && (
                          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8 }}>
                            {!email && (
                              <span role="button" tabIndex={0} onClick={() => openEditAgent(activeAgent.id)} className="qaddpill">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><rect x="2.5" y="4.5" width="19" height="15" rx="2.5" /><path d="M3 6l9 6.5L21 6" /></svg>
                                Add an email address
                              </span>
                            )}
                            {!mswl && (
                              <span role="button" tabIndex={0} onClick={() => openEditAgent(activeAgent.id)} className="qaddpill">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                                Add their wish list
                              </span>
                            )}
                            {genres.length === 0 && (
                              <span role="button" tabIndex={0} onClick={() => openEditAgent(activeAgent.id)} className="qaddpill">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                                Add the genres they represent
                              </span>
                            )}
                          </div>
                        )}
                      </div>{/* meta */}
                      {/* status watermark — enlarged StatusDot, low-opacity, inset right so it isn't
                          clipped; aria-hidden (the real status is announced by the label above). */}
                      <div aria-hidden="true" style={{ position: "absolute", top: "50%", right: 16, transform: "translateY(-50%)", zIndex: 1, opacity: 0.22, pointerEvents: "none", display: "flex" }}>
                        <StatusDot status={activeQuery.status} overrideSize={124} decorative />
                      </div>
                    </div>
                  );
                })()}

                {/* Columns — equal-height grid (rows size to the tallest column's content; the grid
                    shrinks + the columns scroll internally only when the pane hits its ceiling) */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18, padding: "16px 18px 20px", flex: "0 1 auto", minHeight: 0, alignItems: "stretch" }}>

                  {/* ── Sub-card 1: Tracking ── */}
                  <div className="qp-card" style={{ minWidth: 0, background: "#fffefb", border: "var(--bdw) solid var(--bd)", borderRadius: 18, overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 300, boxShadow: "0 2px 7px rgba(29,23,18,.07)" }}>
                      {/* pink header band */}
                      <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "var(--band)", borderBottom: "var(--bdw) solid var(--bd)", flexShrink: 0 }}>
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={qdbBoldInk2} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M3 12h4l3 8 4-16 3 8h4" /></svg>
                        <span style={{ fontFamily: FONT_SERIF, fontSize: 19, fontWeight: 800, color: qdbBoldInk2 }}>Tracking</span>
                      </div>
                      <div style={{ padding: "16px 16px 18px", flex: 1, minHeight: 0, overflowY: "auto" }}>
                        {(() => {
                          // Pass the same open-state fact the control bar uses, so the trailing block
                          // switches agent's-turn / writer's-turn / closed identically.
                          const ta = getPrimaryAction(activeQuery.status as QueryStatus);
                          return (
                            <QueryTimeline
                              query={activeQuery}
                              agent={activeAgent}
                              events={trackingEvents}
                              primaryAction={{ ballHolder: ta.ballHolder, markKind: ta.kind === "mark-sent" ? ta.markKind : undefined }}
                              onMarkSent={() => setIsMarkSentOpen(true)}
                            />
                          );
                        })()}
                      </div>
                    </div>{/* ── end sub-card 1: Tracking ── */}

                  {/* ── Sub-card 2: What you sent ── */}
                  <div className="qp-card" style={{ minWidth: 0, background: "#fffefb", border: "var(--bdw) solid var(--bd)", borderRadius: 18, overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 300, boxShadow: "0 2px 7px rgba(29,23,18,.07)" }}>
                      {/* pink header band */}
                      <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "var(--band)", borderBottom: "var(--bdw) solid var(--bd)", flexShrink: 0 }}>
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={qdbBoldInk2} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
                        <span style={{ fontFamily: FONT_SERIF, fontSize: 19, fontWeight: 800, color: qdbBoldInk2 }}>What you sent</span>
                      </div>
                      {/* spec sheet */}
                      <div style={{ padding: "16px 16px 18px", flex: 1, minHeight: 0, overflowY: "auto" }}>
                        {(() => {
                          const mats: (string | QueryMaterial)[] = Array.isArray((activeQuery as any).materialsWanted) && (activeQuery as any).materialsWanted.length
                            ? (activeQuery as any).materialsWanted
                            : (Array.isArray(activeAgent.materialsWanted) ? activeAgent.materialsWanted : []);
                          const materials = mats.map(formatQueryMaterial).filter(Boolean);
                          const linkedPackage = activeQuery.packageId ? packages.find(p => p.id === activeQuery.packageId) : null;
                          const minilabel: React.CSSProperties = { fontFamily: FONT_MONO, fontSize: 8.5, letterSpacing: "0.15em", textTransform: "uppercase", color: "#a89a8a" };
                          const pillStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", fontFamily: "'Inter',sans-serif", fontSize: 11, fontWeight: 500, color: "#6a5b4c", background: "#fdfaf5", border: "1px solid #ddcdbb", borderRadius: 999, padding: "4px 11px" };
                          const pkgComponents = linkedPackage
                            ? [["Query letter", linkedPackage.queryLetterVersionId], ["Synopsis", linkedPackage.synopsisVersionId], ["Sample pages", linkedPackage.samplePagesVersionId]].filter(([, v]) => !!v).map(([l]) => l as string)
                            : [];
                          const isPro = currentUser?.plan === UserPlan.PRO;
                          const proBadge = (ml: number) => (<span style={{ display: "inline-block", fontFamily: FONT_MONO, fontSize: 7, fontWeight: 500, letterSpacing: ".1em", textTransform: "uppercase" as const, color: "#fff", background: "#6A89A7", border: "1px solid #4f6e8a", borderRadius: 999, padding: "2px 7px", marginLeft: ml, verticalAlign: "middle" }}>Pro</span>);
                          const openPackages = () => onNavigate?.("manuscripts", "Submission packages");
                          return (
                            <>
                              {/* title + book icon */}
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#7c3a2a" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H19v15H6a2 2 0 0 0-2 2z" /><path d="M4 19.5A1.5 1.5 0 0 1 5.5 18H19" /></svg>
                                <span style={{ fontFamily: FONT_SERIF, fontSize: 18, fontWeight: 600, color: "#241c15", lineHeight: 1.15 }}>{activeMs.title}</span>
                              </div>
                              {/* meta line — sage genre tag + muted word count */}
                              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                                {activeMs.genre && <span style={{ fontFamily: FONT_MONO, fontSize: 8.5, letterSpacing: ".1em", textTransform: "uppercase" as const, color: "#5a6e58", background: "#eef2ec", border: "1px solid #d8e0d4", borderRadius: 999, padding: "3px 10px" }}>{activeMs.genre}</span>}
                                {!!activeMs.wordCount && <span style={{ fontFamily: FONT_MONO, fontSize: 10.5, color: "#a89a8a", letterSpacing: ".03em" }}>{activeMs.wordCount.toLocaleString()} words</span>}
                              </div>
                              {/* Sent via {method} — no date (that lives in Tracking) */}
                              {activeQuery.sendMethod && (
                                <div style={{ fontFamily: FONT_MONO, fontSize: 8.5, letterSpacing: ".08em", textTransform: "uppercase" as const, color: "#8a7d6c", marginBottom: 15 }}>Sent via {activeQuery.sendMethod}</div>
                              )}
                              {linkedPackage ? (
                                /* Package attached — show its contents, no upsell */
                                <div>
                                  <div style={{ ...minilabel, display: "block", marginBottom: 8 }}>Submission package{proBadge(6)}</div>
                                  <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, fontWeight: 600, color: "#241c15", marginBottom: 7 }}>{linkedPackage.packageName}</div>
                                  {pkgComponents.length > 0 && <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{pkgComponents.map((c, i) => <span key={i} style={pillStyle}>{c}</span>)}</div>}
                                </div>
                              ) : (
                                <div>
                                  <div style={{ fontFamily: FONT_SERIF, fontWeight: 700, fontSize: 14, color: "#2c2017", marginBottom: 9 }}>Materials:</div>
                                  {materials.length > 0 ? (
                                    <>
                                      {/* recorded — ticked checklist */}
                                      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                                        {materials.map((m, i) => (
                                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "'Inter',sans-serif", fontSize: 12.5, color: "#2c2017" }}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8a7d6c" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M14 3v5h5" /><path d="M6 3h9l5 5v11a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19V4.5A1.5 1.5 0 0 1 6.5 3" /></svg>
                                            <span style={{ flex: 1, minWidth: 0 }}>{m}</span>
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#5a6e58" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M20 6 9 17l-5-5" /></svg>
                                          </div>
                                        ))}
                                      </div>
                                      {/* non-Pro upsell (only when no package attached) */}
                                      {!isPro && (
                                        <div style={{ marginTop: 15, fontFamily: "'Inter',sans-serif", fontSize: 12, lineHeight: 1.5, color: "#8a7d6c" }}>
                                          <span style={{ fontWeight: 700, color: "#3a2c24" }}>Ready for serious insights?</span><br />
                                          Attach a <span role="button" tabIndex={0} onClick={openPackages} style={{ color: "#42637e", fontWeight: 600, cursor: "pointer", borderBottom: "1px solid #c2d2de" }}>submission package</span>{proBadge(4)} and track performance across versions
                                        </div>
                                      )}
                                    </>
                                  ) : (
                                    <>
                                      {/* empty — pink materials tile · or · neutral package tile (matched pair) */}
                                      <span role="button" tabIndex={0} onClick={() => openEditQuery(activeQuery.id)} style={{ display: "flex", alignItems: "center", gap: 8, background: "#fcf1ec", border: "1.5px dashed #e0b3a4", borderRadius: 10, padding: "9px 12px", fontFamily: "'Inter',sans-serif", fontSize: 12, fontWeight: 500, color: "#7c3a2a", cursor: "pointer" }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M15.5 3.5 7 12a3 3 0 0 0 4.2 4.2l8-8a5 5 0 0 0-7-7l-8.2 8.2a7 7 0 0 0 9.9 9.9l7.3-7.3" /></svg>
                                        Add the materials you sent
                                      </span>
                                      <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: "#9a8e80", margin: "8px 0" }}>or</div>
                                      <div role="button" tabIndex={0} onClick={openPackages} style={{ position: "relative", display: "flex", alignItems: "center", gap: 8, background: "transparent", border: "1.5px dashed #cbb6a6", borderRadius: 10, padding: "9px 12px", fontFamily: "'Inter',sans-serif", fontSize: 12, fontWeight: 500, color: "#6a5f52", cursor: "pointer" }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" style={{ flexShrink: 0 }}><path d="M12 5v14M5 12h14" /></svg>
                                        Add a submission package
                                        <span style={{ position: "absolute", top: -8, right: 10, fontFamily: FONT_MONO, fontSize: 7, fontWeight: 500, letterSpacing: ".1em", textTransform: "uppercase" as const, color: "#fff", background: "#6A89A7", border: "1px solid #4f6e8a", borderRadius: 999, padding: "2px 7px" }}>Pro</span>
                                      </div>
                                    </>
                                  )}
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>{/* ── end sub-card 2: What you sent ── */}

                  {/* ── Sub-card 3: Notes — journal pins to bottom via flex-1 on messages area ── */}
                  <div className="qp-card" style={{ minWidth: 0, background: "#fffefb", border: "var(--bdw) solid var(--bd)", borderRadius: 18, overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 300, boxShadow: "0 2px 7px rgba(29,23,18,.07)" }}>
                      {/* pink header band */}
                      <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "var(--band)", borderBottom: "var(--bdw) solid var(--bd)", flexShrink: 0 }}>
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={qdbBoldInk2} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H19v15H6a2 2 0 0 0-2 2z" /><path d="M4 19.5A1.5 1.5 0 0 1 5.5 18H19" /></svg>
                        <span style={{ fontFamily: FONT_SERIF, fontSize: 19, fontWeight: 800, color: qdbBoldInk2 }}>Journal</span>
                      </div>
                      {/* notes body — list (scrolls) + bottom-pinned composer */}
                      <div style={{ padding: "16px 16px 18px", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                        {(() => {
                          const notes = journalEntries
                            .filter(entry => entry.queryId === activeQuery.id)
                            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); // newest first
                          const send = () => { const t = journalInput.trim(); if (!t) return; addJournalEntry(activeQuery.id, t); setJournalInput(""); };
                          return (
                            <>
                              <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", paddingRight: 2 }}>
                                {notes.length === 0 ? (
                                  /* ghost first entry — dashed, shaped like a real entry; replaced on first save */
                                  <div style={{ background: "#fdfbf7", border: "1px dashed #d8cebf", borderRadius: 11, padding: "11px 13px" }}>
                                    <div style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: ".06em", textTransform: "uppercase" as const, color: "#bcae9d", marginBottom: 5 }}>Today</div>
                                    <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 12.5, lineHeight: 1.5, color: "#9a8d7d" }}>Your notes on this agent appear here — first impressions, things they said, anything worth remembering.</div>
                                  </div>
                                ) : notes.map((entry) => {
                                  const isEditing = editingJournalId === entry.id;
                                  return (
                                    <div key={entry.id} className="qp-note" style={{ background: "#fffdf9", borderRadius: 11, padding: "11px 13px", marginBottom: 9, boxShadow: "0 1px 2px rgba(58,28,20,.05), 0 4px 12px rgba(58,28,20,.07)" }}>
                                      {isEditing ? (
                                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                          <textarea value={editingJournalText} onChange={(e) => setEditingJournalText(e.target.value)} autoFocus rows={2} style={{ width: "100%", fontFamily: "'Inter',sans-serif", fontSize: 12.5, color: "#3a1c14", border: "1px solid #e6dccd", borderRadius: 7, padding: "6px 8px", outline: "none", resize: "vertical", background: "#fff" }} />
                                          <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                                            <button type="button" onClick={() => setEditingJournalId(null)} style={{ fontFamily: FONT_MONO, fontSize: 9, textTransform: "uppercase" as const, letterSpacing: ".04em", background: "transparent", border: "none", color: "#a89a8a", cursor: "pointer" }}>Cancel</button>
                                            <button type="button" onClick={async () => { if (!editingJournalText.trim()) return; await updateJournalEntry(entry.id, editingJournalText.trim()); setEditingJournalId(null); }} style={{ fontFamily: FONT_MONO, fontSize: 9, textTransform: "uppercase" as const, letterSpacing: ".04em", background: burgundy, color: "#fff", border: "none", borderRadius: 6, padding: "5px 11px", cursor: "pointer" }}>Save</button>
                                          </div>
                                        </div>
                                      ) : (
                                        <>
                                          <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 12.5, color: "#4a3c30", lineHeight: 1.48, whiteSpace: "pre-wrap" }}>{entry.entryText}</div>
                                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 9 }}>
                                            <span style={{ fontFamily: FONT_MONO, fontSize: 8, color: "#b3a596", letterSpacing: ".08em", textTransform: "uppercase" as const }}>{formatWhatsAppDate(entry.createdAt)}</span>
                                            <div className="qp-noteacts" style={{ display: "flex", gap: 4 }}>
                                              <button type="button" title="Edit" onClick={() => { setEditingJournalId(entry.id); setEditingJournalText(entry.entryText); }} className="qp-noteact"><Pencil style={{ width: 12, height: 12 }} /></button>
                                              <button type="button" title="Delete" onClick={async () => { if (window.confirm("Delete this note?")) await deleteJournalEntry(entry.id); }} className="qp-noteact"><Trash2 style={{ width: 12, height: 12 }} /></button>
                                            </div>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                              {/* composer — pinned to the column foot */}
                              <div style={{ marginTop: 12, background: "#fffdf9", border: "1px solid #e6dccd", borderRadius: 10, padding: "9px 10px 9px 13px", display: "flex", alignItems: "flex-end", gap: 9, boxShadow: "0 1px 2px rgba(58,28,20,0.04)", flexShrink: 0 }}>
                                <textarea
                                  value={journalInput} rows={1} placeholder="Write a note…"
                                  onChange={(e) => { setJournalInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }}
                                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); (e.target as HTMLTextAreaElement).style.height = "auto"; } }}
                                  style={{ flex: 1, border: "none", outline: "none", background: "transparent", resize: "none", fontFamily: "'Inter',sans-serif", fontSize: 12.5, color: "#3a1c14", lineHeight: 1.4, minHeight: 20, maxHeight: 120, padding: "4px 0", overflowY: "auto" }}
                                />
                                <button type="button" onClick={send} disabled={!journalInput.trim()} style={{ flexShrink: 0, width: 32, height: 32, border: "1px solid #e8c8bc", background: journalInput.trim() ? "#f5e2da" : "#f1f1f0", borderRadius: 8, color: journalInput.trim() ? burgundy : "#c5b9b0", display: "flex", alignItems: "center", justifyContent: "center", cursor: journalInput.trim() ? "pointer" : "not-allowed" }}>
                                  <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
                                </button>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                  </div>{/* ── end sub-card 3: Notes ── */}

                </div>{/* end sub-cards row */}
              </>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 32, color: "#9c8878" }}>
                <Notebook style={{ width: 48, height: 48, color: "rgba(124,58,42,.2)", marginBottom: 8 }} />
                <span>Select a query to open the reading pane.</span>
              </div>
            )}
            </div>{/* closes display:contents */}
          </div>{/* closes qp-pane */}

        </div>{/* closes content grid */}
        </>
        )}

            </div>{/* closes deskpad */}
          </div>{/* closes qdesk frame */}
        </div>{/* closes worktable outer wrapper */}
      </div>{/* closes main container */}

    {activeQuery && (
      <RecordResponseModal
        isOpen={isRecordResponseModalOpen}
        onClose={() => setIsRecordResponseModalOpen(false)}
        query={activeQuery}
        agent={{
          name: activeAgent?.name || activeAgent?.agency || "the agent",
          agency: activeAgent?.agency || "Agency",
          responseTimeWeeks: activeAgent?.responseTimeWeeks || 6,
          submissionMethod: activeAgent?.submissionMethod || "Email"
        }}
        manuscript={{
          title: activeMs?.title || ""
        }}
        materialsOriginallySent={activeQuery?.materialsWanted || []}
        onNavigate={onNavigate}
        onSave={async (data) => {
          if (!currentUser) throw new Error("No user session active.");

          // Snapshot pre-change state so Undo can optimistically restore it before the write reverts.
          preSubmissionSnapshotRef.current = JSON.parse(JSON.stringify(activeQuery));

          // Single canonical write path shared with the Dashboard and Queries landing page.
          // Throws only if the primary write fails (RecordResponseModal surfaces the error);
          // the returned undo() reverts everything and gates the toast below.
          const result = await recordQueryResponse(
            {
              userId: currentUser.id,
              query: activeQuery,
              agent: activeAgent,
              manuscript: activeMs,
            },
            data
          );

          // Optimistic local status so the page behind the modal reflects the change immediately;
          // the query listener reconciles a moment later.
          setSelectedQuery((prev: any) => (prev ? { ...prev, status: result.newStatus } : prev));

          undoFnRef.current = result.undo;
          triggerToast(result.toastConfig);
        }}
      />
    )}

    {activeQuery && activeAgent && (
      <RecordResponseFocusForm
        key={activeQuery.id}
        isOpen={isRecordResponseFocusFormOpen}
        onClose={() => setIsRecordResponseFocusFormOpen(false)}
        query={activeQuery}
        agent={activeAgent}
        manuscript={{ title: activeMs?.title || "" }}
        onSuccessToast={(msg) => {
          triggerToast({ queryId: activeQuery.id, agentName: activeAgent.name, manuscriptTitle: activeMs?.title || "", responseStyle: msg });
        }}
      />
    )}

    {/* Toast Notification Container */}
    <div className="fixed bottom-[24px] left-[24px] z-[1100] flex flex-col gap-3 pointer-events-none select-none">
      <AnimatePresence>
        {undoToast && (
          <motion.div
            id="undo-toast"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            style={{
              background: "#3a1c14",
              borderRadius: "10px",
              padding: "12px 16px",
              minWidth: "300px",
              maxWidth: "380px",
            }}
            className="flex items-center gap-[12px] shadow-lg pointer-events-auto border-0"
          >
            {/* Left Column: SVG Countdown Circle */}
            <div className="flex-shrink-0 w-7 h-7 relative">
              <svg className="w-7 h-7 -rotate-90" viewBox="0 0 28 28">
                {/* Outer Background Tracker Arc */}
                <circle
                  cx="14"
                  cy="14"
                  r="12"
                  fill="transparent"
                  stroke="rgba(255, 255, 255, 0.15)"
                  strokeWidth="2.5"
                />
                {/* Inner Draining Arc */}
                <circle
                  cx="14"
                  cy="14"
                  r="12"
                  fill="transparent"
                  stroke="#c9a89e"
                  strokeWidth="2.5"
                  strokeDasharray="75.4"
                  strokeDashoffset="0"
                  style={{
                    animation: "toast-drain-countdown 10s linear forwards"
                  }}
                />
              </svg>
              <style dangerouslySetInnerHTML={{__html: `
                @keyframes toast-drain-countdown {
                  from { stroke-dashoffset: 0; }
                  to { stroke-dashoffset: 75.4; }
                }
              `}} />
            </div>

            {/* Center Segment */}
            <div className="flex-1 flex flex-col text-left">
              <span className="text-[12px] font-medium text-[#F8F5F0] leading-tight">
                {getToastTitle(undoToast.responseStyle)}
              </span>
              <span className="text-[11px] text-[rgba(248,245,240,0.5)] leading-tight mt-0.5">
                {undoToast.agentName} · {undoToast.manuscriptTitle}
              </span>
            </div>

            {/* Right Stack */}
            <div className="flex flex-col items-end gap-0.5 justify-center pl-1 font-sans shrink-0">
              <button
                type="button"
                onClick={handleUndo}
                className="text-[11px] font-semibold text-[#c9a89e] hover:text-white cursor-pointer py-0.5 select-none transition-colors border-0 bg-transparent focus:outline-none"
              >
                Undo
              </button>
              <button
                type="button"
                onClick={() => setUndoToast(null)}
                className="text-[11px] text-[rgba(248,245,240,0.4)] hover:text-white cursor-pointer py-0.5 select-none transition-colors border-0 bg-transparent focus:outline-none"
              >
                ×
              </button>
            </div>
          </motion.div>
        )}

        {feedbackToast && (
          <motion.div
            id="feedback-toast"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            style={{
              background: "#3a1c14",
              borderRadius: "10px",
              padding: "12px 16px",
              minWidth: "300px",
              maxWidth: "380px",
            }}
            className="flex flex-col text-left shadow-lg pointer-events-auto border-0"
          >
            <span 
              style={{
                color: feedbackToast.message.includes("Couldn't") ? "rgba(248,245,240,0.7)" : "#F8F5F0"
              }}
              className="text-[12px] font-medium leading-tight"
            >
              {feedbackToast.message}
            </span>
            {feedbackToast.subMessage && (
              <span className="text-[11px] text-[rgba(248,245,240,0.5)] leading-tight mt-0.5 font-sans">
                {feedbackToast.subMessage}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </div>
  );
};
