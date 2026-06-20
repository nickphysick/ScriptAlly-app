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
import { QueryStatus, Agent, Manuscript, Query, SubmissionMethod, ActivityType, QueryMaterial } from "../types";
import { StatusPill, getStatusLabel } from "./StatusPill";
import { StatusDot } from "./StatusDot";
import { RecordResponseModal } from "./RecordResponseModal";
import { RecordResponseFocusForm } from "./RecordResponseFocusForm";
import { recordQueryResponse } from "../lib/recordResponse";
import { formatQueryMaterial, materialLabel } from "../lib/materials";
import { MarkSentPopover, MarkSentKind } from "./MarkSentPopover";
import { useFixedMenu } from "./forms/useFixedMenu";
import { MaterialsField } from "./MaterialsField";
import { editMaterialsUpdate } from "../lib/packageMetrics";
import { MountCard } from "./MountCard";
import { ScriptAllyLogo } from "./ScriptAllyLogo";
import {
  kraft, parchment, PAPER_TEXTURE,
  burgundy, FONT_SERIF, FONT_MONO, mountShadow, labelColor,
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

export const Queries: React.FC<{ searchQuery: string; onNavigate?: (tab: string, subPageName?: string) => void; activeSubPage?: string }> = ({ searchQuery, onNavigate, activeSubPage }) => {
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
  
  // Left Filters state (configured to always align with Agents-style)
  const [selectedStatusFilters, setSelectedStatusFilters] = useState<string[]>(["All"]);
  const [selectedManuscriptFilter, setSelectedManuscriptFilter] = useState<string>("All");
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<string>("All");
  const [sortOption, setSortOption] = useState<string>("Newest first");
  const [groupOption, setGroupOption] = useState<"None" | "Status" | "Action Required" | "Manuscript" | "Agent Fit Rating">("None");
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
  
  // Journal text input
  const [journalInput, setJournalInput] = useState("");

  // Chat scroll container ref
  const chatContainerRef = React.useRef<HTMLDivElement>(null);

  // Contextual action states
  const [showActionDropdown, setShowActionDropdown] = useState(false);

  // Edit mode states
  const [isEditMode, setIsEditMode] = useState(false);
  const [editMsId, setEditMsId] = useState("");
  const [editDateSent, setEditDateSent] = useState("");
  const [editSendMethod, setEditSendMethod] = useState("");
  const [editPersonalisationNotes, setEditPersonalisationNotes] = useState("");
  const [editResponseDeadline, setEditResponseDeadline] = useState("");
  const [editIfNoResponse, setEditIfNoResponse] = useState("Remind me to nudge");
  const [editMaterials, setEditMaterials] = useState<(string | QueryMaterial)[]>([]);
  // The attached submission package (mutually exclusive with editMaterials — see the
  // materialsLinkWrites guard in handleSaveChanges). "" === free text.
  const [editPackageId, setEditPackageId] = useState<string>("");
  // True once the user touches materials OR the package link in this edit session. When false,
  // handleSaveChanges omits both fields so an unrelated edit (or saving a legacy query) preserves
  // the stored values verbatim — never downgrading structured quantities or clobbering the link.
  const [materialsTouched, setMaterialsTouched] = useState(false);
  const [editRejectionType, setEditRejectionType] = useState("Form rejection");
  const [editAgentComments, setEditAgentComments] = useState("");
  
  const [allAvailableMaterials, setAllAvailableMaterials] = useState<string[]>([
    "Query Letter", "Synopsis", "Sample Pages", "Full Manuscript"
  ]);

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

  // Synchronise edit values when selectedQuery changes
  const activeQuery = selectedQueryId ? (selectedQuery || queries.find(q => q.id === selectedQueryId)) : null;
  const currentStatus = activeQuery?.status ?? selectedQuery?.status;
  const activeAgent = activeQuery ? agents.find(a => a.id === activeQuery.agentId) : null;
  const activeMs = activeQuery ? manuscripts.find(m => m.id === activeQuery.manuscriptId) : null;

  useEffect(() => {
    if (activeQuery) {
      setEditMsId(activeQuery.manuscriptId);
      setEditDateSent(activeQuery.dateSent ? activeQuery.dateSent.split("T")[0] : "");
      setEditSendMethod(activeQuery.sendMethod || "Email");
      setEditPersonalisationNotes(activeQuery.personalisationNotes || "");
      setEditResponseDeadline(activeQuery.responseDeadline ? activeQuery.responseDeadline.split("T")[0] : "");
      setEditIfNoResponse((activeQuery as any).ifNoResponse || "Remind me to nudge");
      
      // Seed the editor from the query's own record (structured — preserves type/quantity) when
      // it has one; otherwise fall back to the agent's requested materials as plain labels.
      // materialsTouched starts false so an untouched save preserves the stored value verbatim.
      const queryMats: (string | QueryMaterial)[] = activeQuery.materialsWanted || [];
      const agentMats: string[] = activeAgent && Array.isArray(activeAgent.materialsWanted)
        ? (activeAgent.materialsWanted as string[])
        : [];
      setEditMaterials(queryMats.length > 0 ? queryMats : agentMats);
      setEditPackageId(activeQuery.packageId || "");
      setMaterialsTouched(false);

      // Chip palette: the standard set plus any custom labels already present on the query/agent.
      const presentLabels = [...queryMats.map(materialLabel), ...agentMats];
      const initialAvailable = Array.from(new Set([
        "Query Letter", "Synopsis", "Sample Pages", "Full Manuscript",
        ...presentLabels
      ]));
      setAllAvailableMaterials(initialAvailable);

      setEditRejectionType(activeQuery.rejectionType || "Form rejection");
      setEditAgentComments(activeQuery.agentComments || "");
    }
    setShowActionDropdown(false);
  }, [selectedQueryId, isEditMode, activeQuery?.id, activeAgent?.id]);

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
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [journalEntries, selectedQueryId]);

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
  const sortedList = [...filteredList].sort((a, b) => {
    const agA = agents.find(ag => ag.id === a.agentId)?.name || "";
    const agB = agents.find(ag => ag.id === b.agentId)?.name || "";

    if (sortOption === "Newest first") {
      return (b.dateSent ? new Date(b.dateSent).getTime() : 0) - (a.dateSent ? new Date(a.dateSent).getTime() : 0);
    } else if (sortOption === "Oldest first") {
      return (a.dateSent ? new Date(a.dateSent).getTime() : 0) - (b.dateSent ? new Date(b.dateSent).getTime() : 0);
    } else if (sortOption === "Agent name A-Z") {
      return agA.localeCompare(agB);
    } else if (sortOption === "Agent name Z-A") {
      return agB.localeCompare(agA);
    } else if (sortOption === "Status") {
      return a.status.localeCompare(b.status);
    } else if (sortOption === "Response due soonest") {
      const deadA = a.responseDeadline ? new Date(a.responseDeadline).getTime() : Infinity;
      const deadB = b.responseDeadline ? new Date(b.responseDeadline).getTime() : Infinity;
      return deadA - deadB;
    }
    return 0;
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

  // Reactive date sent change handler that automatically projects response due expectations
  const handleDateSentChange = (val: string) => {
    setEditDateSent(val);
    if (activeAgent) {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        d.setDate(d.getDate() + (activeAgent.responseTimeWeeks * 7));
        setEditResponseDeadline(d.toISOString().split("T")[0]);
      }
    }
  };

  const handleSaveChanges = async () => {
    if (!activeQuery) return;
    const updates: Partial<Query> = {
      manuscriptId: editMsId,
      dateSent: editDateSent ? new Date(editDateSent).toISOString() : activeQuery.dateSent,
      sendMethod: editSendMethod as any,
      personalisationNotes: editPersonalisationNotes,
      responseDeadline: editResponseDeadline ? new Date(editResponseDeadline).toISOString() : activeQuery.responseDeadline,
    };
    
    updates.ifNoResponse = editIfNoResponse;
    // Guard #1 + omit-when-untouched: when the user touched materials OR the package link this
    // session, persist exactly one source of truth (package → clear materialsWanted; free text →
    // clear packageId). Untouched → editMaterialsUpdate returns {} so BOTH keys are omitted and the
    // stored values are preserved verbatim (updateQuery merges) — an agent-seeded list never lands
    // behind a packageId, and a status/notes-only edit keeps the existing packageId.
    Object.assign(updates, editMaterialsUpdate({ touched: materialsTouched, packageId: editPackageId, materials: editMaterials }));

    if ([QueryStatus.REJECTED, QueryStatus.WITHDRAWN].includes(activeQuery.status)) {
      updates.rejectionType = editRejectionType;
      updates.agentComments = editAgentComments;
    }

    await updateQuery(activeQuery.id, updates);
    setIsEditMode(false);
  };

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

  return (
    <div 
      className="w-full flex flex-col overflow-hidden text-[#3a1c14] font-sans relative queries-container-theme"
      style={{ minHeight: "calc(100vh - 36px)", backgroundColor: "#ffffff" }}
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
        .pane-reading-card > div[aria-hidden="true"] {
          border-top: 1.5px solid #7c3a2a !important;
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
                    <option key={a.id} value={a.id}>{a.name} ({a.agency})</option>
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

      {/* FIXED SIDEBAR — sits in front of Nav (z-51) covering its left portion */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: 252,
          height: "100vh",
          zIndex: 51,
          background: "#f8ece5",
          backgroundImage: PAPER_TEXTURE,
          boxShadow: "2px 0 16px rgba(58,28,20,0.10)",
          borderRight: "1px solid rgba(124,58,42,0.13)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Wordmark */}
        <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid rgba(124,58,42,0.10)", flexShrink: 0 }}>
          <ScriptAllyLogo size="sm" iconColor={burgundy} textColor="#3a1c14" />
        </div>

        {/* Page title — "Agent database" with blinking cursor + selection highlight on "database" */}
        <div style={{ padding: "18px 20px 10px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", flexWrap: "nowrap" }}>
            <span style={{ fontFamily: FONT_SERIF, fontSize: 24, fontWeight: 600, color: "#3a1c14", lineHeight: 1.2 }}>
              Agent{" "}
            </span>
            <span style={{
              fontFamily: FONT_SERIF, fontSize: 24, fontWeight: 600, color: "#3a1c14", lineHeight: 1.2,
              background: "rgba(124,58,42,.22)", borderRadius: 3,
              WebkitBoxDecorationBreak: "clone", boxDecorationBreak: "clone" as any,
              paddingLeft: 2, paddingRight: 2,
            }}>
              database
            </span>
            <span
              className="queries-cursor-blink"
              style={{ display: "inline-block", width: 4.5, height: 34, background: burgundy, borderRadius: 1, marginLeft: 6, verticalAlign: "middle", transform: "translateY(7px)", flexShrink: 0 }}
            />
          </div>
        </div>

        {/* Back to dashboard */}
        <div style={{ padding: "10px 14px 0", flexShrink: 0 }}>
          <button
            onClick={() => onNavigate?.("dashboard")}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              width: "100%", padding: "7px 10px", borderRadius: 8,
              border: "none", background: "transparent", cursor: "pointer",
              color: "#7c3a2a", fontSize: 12, fontWeight: 600,
            }}
            className="hover:bg-[rgba(124,58,42,0.07)] transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Back to dashboard
          </button>
        </div>

        <div style={{ height: 1, margin: "10px 14px", background: "rgba(124,58,42,0.10)" }} />

        {/* Scrollable filter region */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 14px 12px" }} className="custom-query-list-scrollbar">

          {/* "All queries" pinned row */}
          <button
            onClick={() => { setSelectedStatusFilters(["All"]); setSelectedManuscriptFilter("All"); }}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              width: "100%", padding: "7px 10px", borderRadius: 8,
              border: "none", cursor: "pointer", marginBottom: 6,
              background: selectedStatusFilters.includes("All") && selectedManuscriptFilter === "All"
                ? "rgba(124,58,42,0.09)" : "transparent",
              color: selectedStatusFilters.includes("All") && selectedManuscriptFilter === "All"
                ? burgundy : "#3a1c14",
              fontWeight: selectedStatusFilters.includes("All") && selectedManuscriptFilter === "All" ? 700 : 500,
              fontSize: 12,
            }}
            className="hover:bg-[rgba(124,58,42,0.05)] transition-colors"
          >
            <span>All queries</span>
            <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: "#9a8579" }}>{queries.length}</span>
          </button>

          {/* Filter accordion */}
          <div style={{ marginBottom: 4 }}>
            <button
              onClick={() => setFilterAccordionOpen(o => !o)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                width: "100%", padding: "5px 10px 5px 4px",
                border: "none", background: "transparent", cursor: "pointer",
                borderBottom: "1px solid rgba(124,58,42,0.10)", marginBottom: 6,
              }}
            >
              <span style={{ fontFamily: FONT_MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9a8579" }}>Filter</span>
              <ChevronRight className="w-3 h-3 text-stone-400" style={{ transform: filterAccordionOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s" }} />
            </button>
            {filterAccordionOpen && (
              <div>
                {/* Status sub-section */}
                <div style={{ marginBottom: 10 }}>
                  <span style={{ display: "block", fontFamily: FONT_MONO, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: `${burgundy}99`, marginBottom: 4, paddingLeft: 4 }}>Status</span>
                  <div style={{ marginBottom: 2 }}>
                    <span style={{ display: "block", fontFamily: FONT_MONO, fontSize: 9, color: "#9a8579", textTransform: "uppercase", letterSpacing: "0.05em", padding: "3px 4px", fontWeight: 600 }}>Active</span>
                  </div>
                  {[
                    { id: QueryStatus.QUERIED, label: "Queried", count: queries.filter(q => q.status === QueryStatus.QUERIED).length },
                    { id: QueryStatus.PARTIAL_REQUESTED, label: "Partial req", count: queries.filter(q => q.status === QueryStatus.PARTIAL_REQUESTED).length },
                    { id: QueryStatus.PARTIAL_SENT, label: "Partial sent", count: queries.filter(q => q.status === QueryStatus.PARTIAL_SENT).length },
                    { id: QueryStatus.FULL_REQUESTED, label: "Full req", count: queries.filter(q => q.status === QueryStatus.FULL_REQUESTED).length },
                    { id: QueryStatus.FULL_SENT, label: "Full sent", count: queries.filter(q => q.status === QueryStatus.FULL_SENT).length },
                    { id: QueryStatus.REVISE_RESUBMIT, label: "R&R", count: queries.filter(q => q.status === QueryStatus.REVISE_RESUBMIT).length },
                    { id: QueryStatus.OFFER, label: "Offers", count: queries.filter(q => q.status === QueryStatus.OFFER).length },
                  ].map(item => {
                    const isActive = selectedStatusFilters.includes(item.id);
                    return (
                      <button key={item.id} onClick={() => {
                        let next = [...selectedStatusFilters].filter(f => f !== "All");
                        if (next.includes(item.id)) { next = next.filter(f => f !== item.id); }
                        else { next.push(item.id); }
                        setSelectedStatusFilters(next.length === 0 ? ["All"] : next);
                      }}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          width: "100%", padding: "5px 8px", borderRadius: 7,
                          border: "none", cursor: "pointer", marginBottom: 1,
                          background: isActive ? "rgba(124,58,42,0.09)" : "transparent",
                          color: isActive ? burgundy : "#5a5047",
                          fontWeight: isActive ? 700 : 500, fontSize: 11,
                        }}
                        className="hover:bg-[rgba(124,58,42,0.05)] transition-colors"
                      >
                        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <StatusDot status={item.id} size={11} />
                          {item.label}
                        </span>
                        <span style={{ fontFamily: FONT_MONO, fontSize: 9, color: "#9a8579" }}>{item.count || "-"}</span>
                      </button>
                    );
                  })}
                  <div style={{ marginTop: 6, marginBottom: 2 }}>
                    <span style={{ display: "block", fontFamily: FONT_MONO, fontSize: 9, color: "#9a8579", textTransform: "uppercase", letterSpacing: "0.05em", padding: "3px 4px", fontWeight: 600 }}>Closed</span>
                  </div>
                  {[
                    { id: QueryStatus.REJECTED, label: "Rejected", count: queries.filter(q => q.status === QueryStatus.REJECTED).length },
                    { id: QueryStatus.WITHDRAWN, label: "Withdrawn", count: queries.filter(q => q.status === QueryStatus.WITHDRAWN).length },
                    { id: QueryStatus.NO_RESPONSE, label: "No response", count: queries.filter(q => q.status === QueryStatus.NO_RESPONSE).length },
                  ].map(item => {
                    const isActive = selectedStatusFilters.includes(item.id);
                    return (
                      <button key={item.id} onClick={() => {
                        let next = [...selectedStatusFilters].filter(f => f !== "All");
                        if (next.includes(item.id)) { next = next.filter(f => f !== item.id); }
                        else { next.push(item.id); }
                        setSelectedStatusFilters(next.length === 0 ? ["All"] : next);
                      }}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          width: "100%", padding: "5px 8px", borderRadius: 7,
                          border: "none", cursor: "pointer", marginBottom: 1,
                          background: isActive ? "rgba(124,58,42,0.09)" : "transparent",
                          color: isActive ? burgundy : "#5a5047",
                          fontWeight: isActive ? 700 : 500, fontSize: 11,
                        }}
                        className="hover:bg-[rgba(124,58,42,0.05)] transition-colors"
                      >
                        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <StatusDot status={item.id} size={11} />
                          {item.label}
                        </span>
                        <span style={{ fontFamily: FONT_MONO, fontSize: 9, color: "#9a8579" }}>{item.count || "-"}</span>
                      </button>
                    );
                  })}
                </div>
                {/* Manuscripts sub-section */}
                {manuscripts.length > 0 && (
                  <div>
                    <span style={{ display: "block", fontFamily: FONT_MONO, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: `${burgundy}99`, marginBottom: 4, paddingLeft: 4 }}>Manuscript</span>
                    {manuscripts.map(m => {
                      const isActive = selectedManuscriptFilter === m.id;
                      const count = queries.filter(q => q.manuscriptId === m.id).length;
                      return (
                        <button key={m.id} onClick={() => setSelectedManuscriptFilter(isActive ? "All" : m.id)}
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            width: "100%", padding: "5px 8px", borderRadius: 7,
                            border: "none", cursor: "pointer", marginBottom: 1,
                            background: isActive ? "rgba(124,58,42,0.09)" : "transparent",
                            color: isActive ? burgundy : "#5a5047",
                            fontWeight: isActive ? 700 : 500, fontSize: 11, textAlign: "left",
                          }}
                          className="hover:bg-[rgba(124,58,42,0.05)] transition-colors"
                        >
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, marginRight: 4 }}>{m.title}</span>
                          <span style={{ fontFamily: FONT_MONO, fontSize: 9, color: "#9a8579", flexShrink: 0 }}>{count || "-"}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Group accordion */}
          <div style={{ marginBottom: 4 }}>
            <button
              onClick={() => setGroupAccordionOpen(o => !o)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                width: "100%", padding: "5px 10px 5px 4px",
                border: "none", background: "transparent", cursor: "pointer",
                borderBottom: "1px solid rgba(124,58,42,0.10)", marginBottom: 6,
              }}
            >
              <span style={{ fontFamily: FONT_MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9a8579" }}>Group</span>
              <ChevronRight className="w-3 h-3 text-stone-400" style={{ transform: groupAccordionOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s" }} />
            </button>
            {groupAccordionOpen && (
              <div>
                {[
                  { id: "None", label: "No grouping" },
                  { id: "Status", label: "Status" },
                  { id: "Action Required", label: "Action required" },
                  { id: "Manuscript", label: "Manuscript" },
                  { id: "Agent Fit Rating", label: "Agent fit rating" },
                ].map(item => {
                  const isActive = groupOption === item.id;
                  return (
                    <button key={item.id} onClick={() => setGroupOption(item.id as any)}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        width: "100%", padding: "5px 8px", borderRadius: 7,
                        border: "none", cursor: "pointer", marginBottom: 1,
                        background: isActive ? "rgba(124,58,42,0.09)" : "transparent",
                        color: isActive ? burgundy : "#5a5047",
                        fontWeight: isActive ? 700 : 500, fontSize: 11,
                      }}
                      className="hover:bg-[rgba(124,58,42,0.05)] transition-colors"
                    >
                      <span>{item.label}</span>
                      {isActive && <Check className="w-3 h-3" style={{ color: burgundy }} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sort accordion */}
          <div style={{ marginBottom: 4 }}>
            <button
              onClick={() => setSortAccordionOpen(o => !o)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                width: "100%", padding: "5px 10px 5px 4px",
                border: "none", background: "transparent", cursor: "pointer",
                borderBottom: "1px solid rgba(124,58,42,0.10)", marginBottom: 6,
              }}
            >
              <span style={{ fontFamily: FONT_MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9a8579" }}>Sort</span>
              <ChevronRight className="w-3 h-3 text-stone-400" style={{ transform: sortAccordionOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s" }} />
            </button>
            {sortAccordionOpen && (
              <div>
                {[
                  { id: "Newest first", label: "Newest first" },
                  { id: "Oldest first", label: "Oldest first" },
                  { id: "Agent name A-Z", label: "Agent A–Z" },
                  { id: "Agent name Z-A", label: "Agent Z–A" },
                  { id: "Status", label: "Status" },
                  { id: "Response due soonest", label: "Response due soonest" },
                ].map(item => {
                  const isActive = sortOption === item.id;
                  return (
                    <button key={item.id} onClick={() => setSortOption(item.id)}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        width: "100%", padding: "5px 8px", borderRadius: 7,
                        border: "none", cursor: "pointer", marginBottom: 1,
                        background: isActive ? "rgba(124,58,42,0.09)" : "transparent",
                        color: isActive ? burgundy : "#5a5047",
                        fontWeight: isActive ? 700 : 500, fontSize: 11,
                      }}
                      className="hover:bg-[rgba(124,58,42,0.05)] transition-colors"
                    >
                      <span>{item.label}</span>
                      {isActive && <Check className="w-3 h-3" style={{ color: burgundy }} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Export all pinned at bottom */}
        <div style={{ padding: "12px 14px", borderTop: "1px solid rgba(124,58,42,0.10)", flexShrink: 0 }}>
          <button
            onClick={() => exportQueriesToCSV(queries, `ScriptAlly_Queries_${new Date().toISOString().slice(0, 10)}`)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              width: "100%", padding: "8px 12px", borderRadius: 8,
              border: "1px solid rgba(124,58,42,0.18)", background: "rgba(124,58,42,0.05)",
              color: burgundy, fontSize: 11, fontWeight: 600, cursor: "pointer",
            }}
            className="hover:bg-[rgba(124,58,42,0.10)] transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export all as CSV
          </button>
        </div>
      </div>

      {/* TWO-PANEL LAYOUT CONTAINER — offset by sidebar width */}
      <div
        className="flex-grow bg-white min-h-0 w-full flex flex-row p-[8px] gap-[8px]"
        style={{ minHeight: "calc(100vh - 36px - 16px)", alignItems: "start", paddingLeft: 260 }}
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
                               <StatusDot status={item.id as QueryStatus} size={13} />
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
                             <StatusDot status={item.id as QueryStatus} size={13} />
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

        {/* ---------------- panel 2: middle list panel (MountCard) ---------------- */}
        <MountCard
          style={{
            width: "calc(20% + 50px)", minWidth: "calc(20% + 50px)", maxWidth: "calc(20% + 50px)",
            flexShrink: 0, display: "flex", flexDirection: "column", height: "calc(100vh - 36px - 16px)", overflow: "hidden",
          }}
        >
          {/* List header — plain, no band */}
          <div style={{
            padding: "14px 15px 12px",
            borderBottom: "1px solid rgba(124,58,42,0.12)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexShrink: 0, position: "relative", zIndex: 4,
          }}>
            <span style={{ fontFamily: FONT_SERIF, fontSize: 16, fontWeight: 600, color: "#2e3a2c" }}>
              {sortedList.length} {sortedList.length === 1 ? "query" : "queries"}
            </span>
            <button
              onClick={handleExportFilteredCSV}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: "transparent", border: "none", cursor: "pointer",
                fontFamily: FONT_MONO, fontSize: 9.5, letterSpacing: ".05em", textTransform: "uppercase",
                color: burgundy, opacity: 0.78,
              }}
            >
              <Download className="w-3 h-3" />
              Export these as CSV
            </button>
          </div>

          {/* Search bar */}
          <div style={{ padding: "8px 12px 6px", borderBottom: "1px solid rgba(124,58,42,0.10)", flexShrink: 0, position: "relative", zIndex: 4 }}>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-stone-400" />
              <input
                type="text"
                placeholder="Find query..."
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-[#FAF8F5] rounded border border-[#EBDCD3] placeholder-stone-400 focus:outline-[#7c3a2a] text-[#3a1c14]"
              />
            </div>
          </div>

          {/* Scrolling query cards list — mx-[6px] keeps row backgrounds inside the inner frame border */}
          <div className="flex-1 overflow-y-scroll custom-query-list-scrollbar divide-y divide-[#EBDCD3]/60 mx-[6px]" style={{ position: "relative", zIndex: 4, background: parchment }}>
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
                const isClosed = [QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE].includes(q.status);
                
                const dateObj = new Date(q.dateSent);
                const daysDiff = Math.max(1, Math.round((new Date().getTime() - dateObj.getTime()) / (1000 * 60 * 60 * 24)));
                const relativeText = `${daysDiff} days ago`;

                const statusChip = undoingQueryIds.has(q.id) ? (
                  <div className="animate-pulse flex items-center gap-1 min-h-[20px]">
                    <span className="w-1.5 h-1.5 bg-[#7c3a2a] rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 bg-[#7c3a2a] rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 bg-[#7c3a2a] rounded-full animate-bounce"></span>
                  </div>
                ) : (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    padding: "2px 7px 2px 5px", borderRadius: 20,
                    background: isClosed ? "#ece7df" : "rgba(253,250,245,0.95)",
                    border: `1px solid ${isClosed ? "rgba(154,144,130,0.3)" : "rgba(124,58,42,0.18)"}`,
                    fontSize: 9, fontWeight: 700, fontFamily: FONT_MONO,
                    color: isClosed ? "#9a9082" : burgundy,
                    whiteSpace: "nowrap", flexShrink: 0,
                  }}>
                    <StatusDot status={q.status} size={9} />
                    {getStatusLabel(q.status)}
                  </span>
                );

                return (
                  <div
                    key={q.id}
                    onClick={() => setSelectedQueryId(q.id)}
                    className={`cursor-pointer transition-all flex flex-col gap-1 ${isClosed ? "opacity-60" : ""}`}
                    style={{
                      padding: "10px 10px 10px 12px",
                      background: isSelected ? "#e4ebdf" : "transparent",
                      borderLeft: isSelected ? "3px solid #8a9e88" : "3px solid transparent",
                      borderRadius: isSelected ? "0 6px 6px 0" : undefined,
                    }}
                  >
                    {/* Top row: Agent name (Playfair) and status chip */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
                      <h4 style={{
                        fontFamily: FONT_SERIF, fontSize: 13, fontWeight: 700,
                        color: "#3a1c14", lineHeight: 1.2,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        flex: 1, minWidth: 0,
                      }}>
                        {agent.name?.trim() || agent.agency}
                      </h4>
                      {statusChip}
                    </div>

                    {/* Agency in mono-muted (or fallback kicker for agency-only agents) */}
                    <p style={{ fontFamily: FONT_MONO, fontSize: 10, color: "#9a8579", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {agent.name?.trim() ? agent.agency : "Agency · no named agent"}
                    </p>

                    {/* Bottom: manuscript in burgundy, time in mono */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, marginTop: 2 }}>
                      <span style={{ fontSize: 10, color: burgundy, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                        {ms.title}
                      </span>
                      <span style={{ fontFamily: FONT_MONO, fontSize: 9, color: "#b0a89e", flexShrink: 0 }}>
                        {relativeText}
                      </span>
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
                      <div className="divide-y divide-[#EBDCD3]/30">
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
                      <div className="divide-y divide-[#EBDCD3]/30">
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
                      <div className="divide-y divide-[#EBDCD3]/30">
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
                      <div className="divide-y divide-[#EBDCD3]/30">
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
          </div>

        </MountCard>

        {/* ATELIER READING PANEL */}
        <div style={{ flexGrow: 1, flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignSelf: "start" }}>

          {/* Pane MountCard — sizes to content */}
          <MountCard className="pane-reading-card" style={{ minWidth: 0, display: "flex", flexDirection: "column", position: "relative" }}>
            {activeQuery && activeAgent && activeMs ? (
              <>
                {/* Masthead — 3-column: [left: seal+status+turn] [center: nameplate+agency+stars+genres] [right: edit+pdf+cta] */}
                {(() => {
                  const action = getPrimaryAction(currentStatus as QueryStatus);
                  const hasName = !!(activeAgent.name?.trim());
                  const nameplate = hasName ? activeAgent.name : activeAgent.agency;
                  const agentFirstName = (activeAgent.name || activeAgent.agency || "Agent").split(" ")[0];
                  const whoseTurnText = action.ballHolder === "writer" ? "Your move"
                    : action.ballHolder === "agent" ? `waiting on ${agentFirstName}…`
                    : null;
                  return (
                    <div style={{ display: "grid", gridTemplateColumns: "210px 1fr 210px", gap: 18, alignItems: "start", padding: "24px 26px 22px", background: "linear-gradient(180deg,#faece4 0%,rgba(250,236,228,0) 100%)", position: "relative", zIndex: 4 }}>

                      {/* Left: wax seal + status label + whose-turn */}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                          <div style={{ width: 42, height: 42, borderRadius: "50%", background: "radial-gradient(circle at 35% 30%,#fbeee6,#f1d4c6)", border: "1.5px solid rgba(124,58,42,0.7)", boxShadow: "inset 0 1px 3px rgba(124,58,42,.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <StatusDot status={activeQuery.status} size={18} />
                          </div>
                          <span style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase" as const, color: burgundy }}>
                            {statusDisplayLabel(activeQuery)}
                          </span>
                        </div>
                        {whoseTurnText && (
                          <div style={{ fontFamily: "'Caveat', cursive", fontSize: 21, color: "#9a5240", lineHeight: 1 }}>
                            {whoseTurnText}
                          </div>
                        )}
                      </div>

                      {/* Center: agent identity */}
                      <div style={{ textAlign: "center" }}>
                        {!hasName && (
                          <div style={{ fontFamily: FONT_MONO, fontSize: 9, textTransform: "uppercase" as const, letterSpacing: ".14em", color: labelColor, marginBottom: 4 }}>
                            Agency · no named agent
                          </div>
                        )}
                        <div style={{ display: "flex", alignItems: "center", gap: 15, justifyContent: "center" }}>
                          <div style={{ flex: 1, height: 1, background: "rgba(124,58,42,.4)", maxWidth: 30 }} />
                          <h2 style={{ fontFamily: FONT_SERIF, fontSize: 29, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: ".15em", color: "#3a1c14", margin: 0, lineHeight: 1.1 }}>
                            {nameplate}
                          </h2>
                          <div style={{ flex: 1, height: 1, background: "rgba(124,58,42,.4)", maxWidth: 30 }} />
                        </div>
                        {hasName && activeAgent.agency && (
                          <p style={{ fontFamily: FONT_SERIF, fontStyle: "italic", color: burgundy, fontSize: 16, marginTop: 9, marginBottom: 0 }}>
                            {activeAgent.agency}
                          </p>
                        )}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, margin: "13px auto" }}>
                          <div style={{ width: 46, height: 1, background: "rgba(124,58,42,.35)" }} />
                          <div style={{ width: 5, height: 5, background: burgundy, transform: "rotate(45deg)" }} />
                          <div style={{ width: 46, height: 1, background: "rgba(124,58,42,.35)" }} />
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 7, alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <span style={{ fontFamily: FONT_MONO, fontSize: 8, letterSpacing: ".16em", textTransform: "uppercase" as const, color: labelColor }}>Agent fit</span>
                            <div style={{ display: "flex", gap: 3 }}>
                              {Array.from({ length: 5 }).map((_, idx) => (
                                <Star key={idx} style={{ width: 14, height: 14, color: idx < activeAgent.starRating ? "#7c3a2a" : "#cdbfae" }} className={idx < activeAgent.starRating ? "fill-current" : ""} />
                              ))}
                            </div>
                          </div>
                          {activeAgent.genres && activeAgent.genres.length > 0 && (
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              <span style={{ fontFamily: FONT_MONO, fontSize: 8, letterSpacing: ".16em", textTransform: "uppercase" as const, color: labelColor }}>Seeking</span>
                              <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6, justifyContent: "center" }}>
                                {activeAgent.genres.map((genre, gIdx) => (
                                  <span key={gIdx} style={{ fontFamily: FONT_MONO, fontSize: 9.5, textTransform: "uppercase" as const, letterSpacing: ".05em", background: "#f1eae0", color: "#6b5d52", borderRadius: 7, padding: "5px 11px" }}>
                                    {genre}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: icon buttons (Edit + PDF) + primary CTA — all in one row */}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <button
                            type="button"
                            onClick={() => setIsEditMode(prev => !prev)}
                            title="Edit query" aria-label="Edit query"
                            style={{ width: 34, height: 34, borderRadius: 9, border: "1px solid rgba(124,58,42,.22)", background: "#fff", color: burgundy, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "#f8e7dc")}
                            onMouseLeave={e => (e.currentTarget.style.background = "#fff")}
                          >
                            <Pencil style={{ width: 14, height: 14 }} />
                          </button>
                          <button
                            type="button"
                            disabled={isGeneratingPDF}
                            onClick={handleDownloadPDF}
                            title={isGeneratingPDF ? "Generating PDF…" : "Download PDF"} aria-label="Download PDF"
                            style={{ width: 34, height: 34, borderRadius: 9, border: "1px solid rgba(124,58,42,.22)", background: "#fff", color: burgundy, display: "flex", alignItems: "center", justifyContent: "center", cursor: isGeneratingPDF ? "not-allowed" : "pointer", opacity: isGeneratingPDF ? 0.5 : 1 }}
                            onMouseEnter={e => { if (!isGeneratingPDF) e.currentTarget.style.background = "#f8e7dc"; }}
                            onMouseLeave={e => (e.currentTarget.style.background = "#fff")}
                          >
                            <Download style={{ width: 14, height: 14 }} />
                          </button>
                        {action.kind === "mark-sent" ? (
                          <button
                            ref={markSentTriggerRef}
                            type="button"
                            onClick={() => setIsMarkSentOpen(o => !o)}
                            style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 500, color: burgundy, background: "linear-gradient(180deg,#f5e2da,#efd5ca)", border: "1px solid rgba(124,58,42,.28)", borderRadius: 9, padding: "10px 16px", cursor: "pointer", boxShadow: "0 1px 2px rgba(124,58,42,.12)" }}
                          >
                            <Send style={{ width: 15, height: 15, strokeWidth: 2 } as any} />
                            {action.label}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setIsRecordResponseFocusFormOpen(true)}
                            style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 500, color: burgundy, background: "linear-gradient(180deg,#f5e2da,#efd5ca)", border: "1px solid rgba(124,58,42,.28)", borderRadius: 9, padding: "10px 16px", cursor: "pointer", boxShadow: "0 1px 2px rgba(124,58,42,.12)" }}
                          >
                            <Send style={{ width: 15, height: 15, strokeWidth: 2 } as any} />
                            {action.label}
                          </button>
                        )}
                        </div>
                        <AnimatePresence>
                          {isMarkSentOpen && (() => {
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
                      </div>

                    </div>
                  );
                })()}

                {/* Body: ledger */}
                <div style={{ display: "flex", flexDirection: "column", position: "relative", zIndex: 4, paddingBottom: 24 }}>

                  {/* Hairline — masthead/ledger divider */}
                  <div style={{ height: 1, background: "rgba(124,58,42,.38)", flexShrink: 0, margin: "0 16px" }} />

                  {/* 4d — Three-column ledger — natural height */}
                  <div style={{ display: "flex", minHeight: 280 }}>

                    {/* ── Column 1: Tracking ── */}
                    <div style={{ flex: 1, padding: "12px 14px", display: "flex", flexDirection: "column", minWidth: 0 }}>
                      {/* Running head */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, flexShrink: 0 }}>
                        <div style={{ flex: 1, height: 1, background: "rgba(124,58,42,.2)" }} />
                        <span style={{ fontFamily: FONT_MONO, fontSize: 9.5, textTransform: "uppercase" as const, letterSpacing: ".18em", color: labelColor, whiteSpace: "nowrap" as const }}>Tracking</span>
                        <div style={{ flex: 1, height: 1, background: "rgba(124,58,42,.2)" }} />
                      </div>
                      {/* Timeline (same logic as before) */}
                      {(() => {
                        const validEnumValues = Object.values(QueryStatus);
                        const activityEventsRaw = trackingEvents.filter(evt => validEnumValues.includes(evt.type as QueryStatus));
                        const getTime = (val: any) => {
                          if (!val) return Date.now();
                          if (val.toDate) return val.toDate().getTime();
                          if (val.seconds) return val.seconds * 1000;
                          return new Date(val).getTime();
                        };
                        const deduplicatedMap: { [key: string]: any } = {};
                        activityEventsRaw.forEach(evt => {
                          const typeVal = evt.type as string;
                          if (!deduplicatedMap[typeVal]) {
                            deduplicatedMap[typeVal] = evt;
                          } else {
                            const existingTime = getTime(deduplicatedMap[typeVal].createdAt);
                            const incomingTime = getTime(evt.createdAt);
                            if (incomingTime < existingTime) deduplicatedMap[typeVal] = evt;
                          }
                        });
                        const activityEvents = Object.values(deduplicatedMap);
                        activityEvents.sort((a, b) => getTime(a.createdAt) - getTime(b.createdAt));
                        const isQueriedStored = activityEvents.some(evt => evt.type === QueryStatus.QUERIED);
                        if (!isQueriedStored && activeQuery.dateSent) {
                          activityEvents.unshift({ type: QueryStatus.QUERIED, createdAt: activeQuery.dateSent, note: `Query sent via ${activeQuery.sendMethod || "Email"}` } as any);
                        }
                        const WAITING_STATUSES = [QueryStatus.QUERIED, QueryStatus.PARTIAL_SENT, QueryStatus.FULL_SENT];
                        const showWaiting = WAITING_STATUSES.includes(currentStatus as QueryStatus);
                        const timelineItems = [...activityEvents, ...(showWaiting ? [{ type: 'waiting', synthetic: true } as any] : [])];
                        const formatDate = (val: any) => {
                          if (!val) return "";
                          const d = val && val.toDate ? val.toDate() : (val && val.seconds ? new Date(val.seconds * 1000) : new Date(val));
                          if (isNaN(d.getTime())) return "";
                          return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
                        };
                        const TIMELINE_TITLES: Record<QueryStatus, string> = {
                          [QueryStatus.QUERIED]: 'Query sent',
                          [QueryStatus.PARTIAL_REQUESTED]: 'Partial manuscript requested',
                          [QueryStatus.PARTIAL_SENT]: 'Partial manuscript sent',
                          [QueryStatus.FULL_REQUESTED]: 'Full manuscript requested',
                          [QueryStatus.FULL_SENT]: 'Full manuscript sent',
                          [QueryStatus.REVISE_RESUBMIT]: 'Revise & resubmit requested',
                          [QueryStatus.OFFER]: 'Offer of representation',
                          [QueryStatus.REJECTED]: 'Query rejected',
                          [QueryStatus.WITHDRAWN]: 'Query withdrawn',
                          [QueryStatus.NO_RESPONSE]: 'Closed — no response',
                        };
                        return timelineItems.map((item, index) => {
                          const isLast = index === timelineItems.length - 1;
                          let dotElement = null;
                          if (item.type === 'waiting') {
                            dotElement = <div className="rounded-full z-10 bg-transparent border-[1.5px] border-[#c9a89e] shrink-0 mt-[4px]" style={{ width: 12, height: 12 }} />;
                          } else {
                            const isClosed = [QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE].includes(item.type as QueryStatus);
                            const isOffer = item.type === QueryStatus.OFFER;
                            if (isClosed) {
                              dotElement = <div className="rounded-full z-10 bg-[#888] flex items-center justify-center text-white shrink-0 mt-[4px] select-none" style={{ width: 12, height: 12 }}><span className="text-[7.5px] font-bold leading-none">✕</span></div>;
                            } else if (isOffer) {
                              dotElement = <div className="rounded-full z-10 bg-[#6b0f1a] shrink-0 mt-[4px]" style={{ width: 12, height: 12 }} />;
                            } else {
                              dotElement = <div className="rounded-full z-10 bg-[#7c3d3d] shrink-0 mt-[4px]" style={{ width: 12, height: 12 }} />;
                            }
                          }
                          const baseTitle = item.type === 'waiting' ? 'Waiting to hear back' : (TIMELINE_TITLES[item.type as QueryStatus] || item.type);
                          const titleText = item.type === QueryStatus.FULL_SENT && (activeQuery.revisionRound ?? 1) >= 2 ? `${baseTitle} (v${activeQuery.revisionRound})` : baseTitle;
                          const dateText = item.type === 'waiting' ? (activeQuery.responseDeadline ? formatDate(activeQuery.responseDeadline) : "") : formatDate(item.createdAt);
                          let displaySubDetail = "";
                          if (item.type !== 'waiting') {
                            if (item.type === QueryStatus.QUERIED) {
                              displaySubDetail = `via ${activeQuery.sendMethod || "Email"}`;
                            } else if (item.type === QueryStatus.PARTIAL_REQUESTED || item.type === QueryStatus.FULL_REQUESTED) {
                              const qty = item.materialsQuantity || activeQuery.materialsRequestedQuantity;
                              const mType = item.materialsType || activeQuery.materialsRequestedType;
                              if (qty && mType) {
                                const formattedType = mType.toLowerCase() === "other" ? "" : mType;
                                displaySubDetail = `Requested: ${qty} ${formattedType}`.trim();
                              } else if (item.note) {
                                const parts = item.note.split("—");
                                displaySubDetail = parts.length > 1 ? `Requested: ${parts[1].trim()}` : item.note;
                              } else {
                                displaySubDetail = "Requested materials details";
                              }
                            } else if (item.type === QueryStatus.REJECTED) {
                              const feedbackType = item.feedbackType || activeQuery.rejectionFeedbackType;
                              if (feedbackType === "detailed" || (item.note && item.note.toLowerCase().includes("detailed feedback"))) displaySubDetail = "Detailed feedback recorded";
                              else if (feedbackType === "standard" || (item.note && item.note.toLowerCase().includes("standard"))) displaySubDetail = "Standard rejection";
                              else if (feedbackType === "form" || (item.note && item.note.toLowerCase().includes("form"))) displaySubDetail = "Form rejection";
                              else displaySubDetail = "Standard rejection";
                            }
                          }
                          const hasExpected = !!activeQuery.responseDeadline;
                          const hasNudge = !!activeQuery.nudgeDate;
                          const hasTintedBox = hasExpected || hasNudge;
                          return (
                            <div key={index} className="flex gap-4 animate-fade-in">
                              <div className="flex flex-col items-center shrink-0 w-3 relative">
                                {dotElement}
                                {!isLast && <div className="absolute top-[16px] bottom-[-14px] bg-[#e8e0d8]" style={{ width: 1 }} />}
                              </div>
                              <div className="flex-grow pb-4">
                                <div className="flex justify-between items-baseline gap-1.5">
                                  <h5 className="text-[12px] font-medium text-[#3a1c14] leading-tight select-none">{titleText}</h5>
                                  {dateText && <span className="text-[10px] text-[#c9a89e] shrink-0 font-mono select-none">{dateText}</span>}
                                </div>
                                {item.type !== 'waiting' && displaySubDetail && (
                                  <p className="text-[11px] text-[#a08070] mt-0.5 font-sans leading-tight">{displaySubDetail}</p>
                                )}
                                {item.type === 'waiting' && hasTintedBox && (
                                  <div className="mt-2.5 p-2 px-3 bg-[#FFF0F0] border border-[#fbdcd5] rounded-md text-[11px] leading-relaxed text-[#7c3a2a] space-y-0.5">
                                    {hasExpected && <div>Response expected by {formatDate(activeQuery.responseDeadline)}</div>}
                                    {hasNudge && <div>Nudge set for {formatDate(activeQuery.nudgeDate)}</div>}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        });
                      })()}
                      {/* Action required prompt */}
                      {[QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED].includes(currentStatus as QueryStatus) && (
                        <div className="pt-3 mt-auto shrink-0">
                          <div className="p-3 bg-[#FAF1EF] border border-[#7c3a2a]/20 rounded-lg shadow-3xs">
                            <span className="text-[9px] font-mono text-[#7c3a2a] font-bold uppercase tracking-wider block mb-0.5">ACTION REQUIRED</span>
                            <p className="text-[11px] text-[#3a1c14] leading-relaxed font-sans font-medium">
                              {currentStatus === QueryStatus.PARTIAL_REQUESTED ? "Partial manuscript has been requested. Polish your pages and send them to the agent." : "Full manuscript has been requested. Take a deep breath, verify all requirements, and send the full manuscript!"}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Ledger divider */}
                    <div style={{ width: 1, display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, margin: "16px 0" }}>
                      <div style={{ flex: 1, width: 1, background: "linear-gradient(to bottom, transparent, rgba(124,58,42,.28) 30%)" }} />
                      <div style={{ width: 5, height: 5, background: burgundy, transform: "rotate(45deg)", flexShrink: 0 }} />
                      <div style={{ flex: 1, width: 1, background: "linear-gradient(to bottom, rgba(124,58,42,.28) 70%, transparent)" }} />
                    </div>

                    {/* ── Column 2: What you sent ── */}
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, padding: "12px 14px" }}>
                      {/* Running head */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, flexShrink: 0 }}>
                        <div style={{ flex: 1, height: 1, background: "rgba(124,58,42,.2)" }} />
                        <span style={{ fontFamily: FONT_MONO, fontSize: 9.5, textTransform: "uppercase" as const, letterSpacing: ".18em", color: labelColor, whiteSpace: "nowrap" as const }}>What you sent</span>
                        <div style={{ flex: 1, height: 1, background: "rgba(124,58,42,.2)" }} />
                      </div>
                      {/* Content area */}
                      <div style={{ flex: 1 }}>
                        {isEditMode ? (
                          <div className="space-y-4 text-xs">
                            <div>
                              <label className="block text-[10px] uppercase font-bold text-stone-400 mb-1">Target Agent</label>
                              <div className="w-full p-2 bg-stone-150 text-stone-500 rounded border border-stone-200 text-xs">{activeAgent.name} ({activeAgent.agency})</div>
                              <span className="text-[9px] text-stone-400 mt-0.5 block italic">Cannot be changed</span>
                            </div>
                            <div>
                              <label className="block text-[10px] uppercase font-bold text-stone-400 mb-1">Manuscript Title</label>
                              <select value={editMsId} onChange={(e) => setEditMsId(e.target.value)} className="w-full text-xs p-2 bg-white border border-[#EBDCD3] rounded focus:outline-[#7c3a2a] cursor-pointer">
                                {manuscripts.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] uppercase font-bold text-stone-400 mb-1">Date Sent</label>
                              <input type="date" value={editDateSent} onChange={(e) => handleDateSentChange(e.target.value)} className="w-full text-xs p-2 bg-white border border-[#EBDCD3] rounded focus:outline-[#7c3a2a]" />
                            </div>
                            <div>
                              <label className="block text-[10px] uppercase font-bold text-stone-400 mb-1">Send Method</label>
                              <select value={editSendMethod} onChange={(e) => setEditSendMethod(e.target.value)} className="w-full text-xs p-2 bg-white border border-[#EBDCD3] rounded focus:outline-[#7c3a2a] cursor-pointer">
                                <option value="Email">Email</option>
                                <option value="Online Form">Online Form</option>
                                <option value="Query Manager">Query Manager</option>
                                <option value="Post">Post</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] uppercase font-bold text-stone-400 mb-1">Personalisation Notes</label>
                              <textarea value={editPersonalisationNotes} onChange={(e) => setEditPersonalisationNotes(e.target.value)} className="w-full text-xs p-2 bg-white border border-[#EBDCD3] rounded focus:outline-[#7c3a2a] min-h-[60px]" placeholder="Hook details..." />
                            </div>
                            <div>
                              <label className="block text-[10px] uppercase font-bold text-stone-400 mb-1">Response Deadline</label>
                              <input type="date" value={editResponseDeadline} onChange={(e) => setEditResponseDeadline(e.target.value)} className="w-full text-xs p-2 bg-white border border-[#EBDCD3] rounded focus:outline-[#7c3a2a]" />
                            </div>
                            <div>
                              <label className="block text-[10px] uppercase font-bold text-stone-400 mb-1">If no response</label>
                              <select value={editIfNoResponse} onChange={(e) => setEditIfNoResponse(e.target.value)} className="w-full text-xs p-2 bg-white border border-[#EBDCD3] rounded focus:outline-[#7c3a2a] cursor-pointer">
                                <option value="Remind me to nudge">Remind me to nudge</option>
                                <option value="Mark as no response automatically">Mark as no response automatically</option>
                                <option value="Do nothing">Do nothing</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] uppercase font-bold text-stone-400 mb-1.5">Materials Sent</label>
                              <MaterialsField
                                materials={editMaterials}
                                onMaterialsChange={(next) => { setEditMaterials(next); setMaterialsTouched(true); }}
                                packageId={editPackageId}
                                onPackageChange={(id) => { setEditPackageId(id); setMaterialsTouched(true); }}
                                manuscriptId={activeQuery.manuscriptId}
                                palette={allAvailableMaterials}
                                allowCustom
                                onNavigate={onNavigate}
                              />
                            </div>
                            {[QueryStatus.REJECTED, QueryStatus.WITHDRAWN].includes(activeQuery.status) && (
                              <div className="border-t border-[#EBDCD3] pt-3.5 space-y-3.5">
                                <div>
                                  <label className="block text-[10px] uppercase font-bold text-[#A32D2D] mb-1">Rejection Type</label>
                                  <select value={editRejectionType} onChange={(e) => setEditRejectionType(e.target.value)} className="w-full text-xs p-2 bg-white border border-[#EBDCD3] rounded focus:outline-[#7c3a2a] cursor-pointer">
                                    <option value="Personalised rejection">Personalised rejection</option>
                                    <option value="Form rejection">Form rejection</option>
                                    <option value="No reason given">No reason given</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-[10px] uppercase font-bold text-[#A32D2D] mb-1">Agent Comments / Feedback</label>
                                  <textarea value={editAgentComments} onChange={(e) => setEditAgentComments(e.target.value)} className="w-full text-xs p-2 bg-white border border-[#EBDCD3] rounded focus:outline-[#7c3a2a] min-h-[60px]" placeholder="Paste comments here..." />
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="bg-[#FAF8F5] border border-[#e8d5cc] rounded-md p-3 space-y-2.5">
                              <span className="text-[10px] text-stone-400 font-mono uppercase tracking-wider block leading-none font-bold">Manuscript</span>
                              <div className="inline-block bg-white border border-[#d1d5db] rounded-full px-3.5 py-1 text-[13px] font-normal text-[#7c3d3d] leading-snug shadow-3xs" style={{ fontFamily: FONT_SERIF }}>{activeMs.title}</div>
                              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                                <div><span className="text-stone-400 block uppercase">Genre</span><span className="font-medium text-[#3a1c14]">{activeMs.genre}</span></div>
                                <div><span className="text-stone-400 block uppercase">Word count</span><span className="font-medium text-[#3a1c14]">{activeMs.wordCount.toLocaleString()} words</span></div>
                              </div>
                              <div className="border-t border-[#e8d5cc] my-2" />
                              <p className="text-[11px] italic text-[#6a5045] leading-relaxed">{activeMs.logline}</p>
                            </div>
                            <div className="space-y-1.5">
                              <span className="block text-[10px] font-medium font-mono text-[#c9a89e] uppercase tracking-wider select-none" style={{ letterSpacing: "0.060em" }}>Materials included</span>
                              <div className="flex flex-wrap gap-1.5">
                                {(() => {
                                  const mats = Array.isArray((activeQuery as any).materialsWanted) ? (activeQuery as any).materialsWanted : Array.isArray(activeAgent.materialsWanted) ? activeAgent.materialsWanted : [];
                                  if (mats && mats.length > 0) return mats.map((mat: string | QueryMaterial, mIdx: number) => (
                                    <span key={mIdx} className="py-[3px] px-[10px] bg-[#FAF1EF] text-[#7c3a2a] rounded-full text-[11px] font-medium leading-none whitespace-nowrap shadow-3xs select-none">{formatQueryMaterial(mat)}</span>
                                  ));
                                  return <span className="text-[11px] text-[#7c3a2a] bg-[#FAF1EF] rounded-full py-[3px] px-[10px] italic">No materials recorded.</span>;
                                })()}
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <span className="block text-[10px] font-medium font-mono text-[#c9a89e] uppercase tracking-wider select-none" style={{ letterSpacing: "0.060em" }}>Your personalisation note</span>
                              <p className="text-[11px] italic text-[#a08070] leading-relaxed">{activeQuery.personalisationNotes ? `"${activeQuery.personalisationNotes}"` : "No personalisation note recorded."}</p>
                            </div>
                            {[QueryStatus.REJECTED, QueryStatus.WITHDRAWN].includes(activeQuery.status) && (activeQuery.rejectionFeedbackType || activeQuery.rejectionFeedbackText || activeQuery.rejectionLesson || activeQuery.rejectionType) && (
                              <div className="bg-[#FAF1EF] border border-[#e8d5cc]/60 p-3 rounded-lg space-y-1.5 mt-2">
                                <span className="text-[10px] font-mono text-[#7c3a2a] font-bold uppercase block">Archived Rejection Details</span>
                                <div className="text-[11px] space-y-1">
                                  {(() => {
                                    const typeLabel = activeQuery.rejectionFeedbackType === "detailed" ? "Personalised — they left a note" : activeQuery.rejectionFeedbackType === "standard" ? "Standard pass" : activeQuery.rejectionFeedbackType === "form" ? "Form rejection" : activeQuery.rejectionType;
                                    const stageLabel = activeQuery.rejectedFromStatus && activeQuery.rejectedFromStatus !== QueryStatus.QUERIED ? `After: ${activeQuery.rejectedFromStatus}` : null;
                                    return (
                                      <>
                                        {typeLabel && <span className="font-semibold text-stone-600 block">Type: <span className="text-stone-800">{typeLabel}</span></span>}
                                        {stageLabel && <span className="font-semibold text-stone-600 block">{stageLabel}</span>}
                                      </>
                                    );
                                  })()}
                                  {(activeQuery.rejectionFeedbackText || activeQuery.agentComments) && (
                                    <p className="italic text-stone-600 bg-white p-2 border border-stone-200/55 rounded-md mt-1 leading-snug">"{activeQuery.rejectionFeedbackText || activeQuery.agentComments}"</p>
                                  )}
                                  {activeQuery.rejectionLesson && (
                                    <div className="mt-1">
                                      <span className="font-semibold text-stone-600 block">Note to self:</span>
                                      <p className="italic text-stone-600 leading-snug">{activeQuery.rejectionLesson}</p>
                                    </div>
                                  )}
                                  {activeAgent?.requeryPreference && (
                                    <span className="font-semibold text-stone-600 block mt-1">Query this agent again? <span className="text-stone-800 capitalize">{activeAgent.requeryPreference}</span></span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {/* Edit mode save/cancel footer */}
                      {isEditMode && (
                        <div style={{ flexShrink: 0, paddingTop: 10, borderTop: "1px solid #EBDCD3", display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                          <button type="button" onClick={() => setIsEditMode(false)} style={{ padding: "5px 14px", border: "1px solid #d1d5db", background: "white", color: "#6b7280", fontSize: 11, fontWeight: 700, borderRadius: 6, cursor: "pointer" }}>Cancel</button>
                          <button type="button" onClick={handleSaveChanges} style={{ padding: "5px 14px", background: "#7c3a2a", color: "white", fontSize: 11, fontWeight: 700, borderRadius: 6, cursor: "pointer", border: "none" }}>Save changes</button>
                        </div>
                      )}
                    </div>

                    {/* Ledger divider */}
                    <div style={{ width: 1, display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, margin: "16px 0" }}>
                      <div style={{ flex: 1, width: 1, background: "linear-gradient(to bottom, transparent, rgba(124,58,42,.28) 30%)" }} />
                      <div style={{ width: 5, height: 5, background: burgundy, transform: "rotate(45deg)", flexShrink: 0 }} />
                      <div style={{ flex: 1, width: 1, background: "linear-gradient(to bottom, rgba(124,58,42,.28) 70%, transparent)" }} />
                    </div>

                    {/* ── Column 3: Notes ── */}
                    <div style={{ flex: 1, padding: "12px 14px", display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0 }}>
                      {/* Running head */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, flexShrink: 0 }}>
                        <div style={{ flex: 1, height: 1, background: "rgba(124,58,42,.2)" }} />
                        <span style={{ fontFamily: FONT_MONO, fontSize: 9.5, textTransform: "uppercase" as const, letterSpacing: ".18em", color: labelColor, whiteSpace: "nowrap" as const }}>Notes</span>
                        <div style={{ flex: 1, height: 1, background: "rgba(124,58,42,.2)" }} />
                      </div>
                      {/* Notes content */}
                      {(() => {
                        const activeJournalEntries = journalEntries
                          .filter(entry => entry.queryId === activeQuery.id)
                          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                        return (
                          <div className="flex flex-col p-3.5 bg-[#FAF8F5] rounded-xl border border-[#ebd8c5]/40" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
                            <div ref={chatContainerRef} className="flex flex-col space-y-2 pr-1" style={{ backgroundColor: "transparent", flex: 1, overflowY: "auto", minHeight: 0 }}>
                              {activeJournalEntries.map((entry, index) => {
                                const isEditing = editingJournalId === entry.id;
                                return (
                                  <div key={entry.id} className="relative group max-w-[85%] bg-white text-[#3a1c14] rounded-[15px] pl-[20px] pr-[20px] py-2 shadow-sm text-[11.5px] leading-relaxed text-left self-start animate-fade-in" style={{ borderStyle: "none", borderWidth: "0px", backgroundColor: "#ffffff" }}>
                                    {isEditing ? (
                                      <div className="flex flex-col gap-1.5 py-1 min-w-[200px] w-full">
                                        <textarea value={editingJournalText} onChange={(e) => setEditingJournalText(e.target.value)} className="w-full text-[11.5px] border border-stone-200 rounded-md p-1.5 outline-none font-sans bg-[#faf8f5] focus:border-[#7c3d3d] resize-none" rows={2} autoFocus />
                                        <div className="flex items-center justify-end gap-1.5">
                                          <button type="button" onClick={() => setEditingJournalId(null)} className="px-2 py-0.5 text-[9px] font-medium text-stone-500 hover:bg-[#faf8f5] rounded cursor-pointer transition-colors">Cancel</button>
                                          <button type="button" onClick={async () => { if (!editingJournalText.trim()) return; await updateJournalEntry(entry.id, editingJournalText.trim()); setEditingJournalId(null); }} className="px-2 py-0.5 text-[9px] font-medium text-white bg-[#7c3d3d] hover:bg-[#6e3528] rounded cursor-pointer transition-colors">Save</button>
                                        </div>
                                      </div>
                                    ) : (
                                      <>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white/90 backdrop-blur-xs px-1 rounded-md border border-stone-100 absolute top-1 right-2 z-10 pointer-events-auto">
                                          <button type="button" onClick={() => { setEditingJournalId(entry.id); setEditingJournalText(entry.entryText); }} className="text-stone-500 hover:text-[#7c3d3d] transition-colors cursor-pointer p-0.5" title="Edit Note"><Pencil className="w-3 h-3" /></button>
                                          <button type="button" onClick={async () => { const confirmDelete = window.confirm("Are you sure you want to delete this journal note?"); if (confirmDelete) await deleteJournalEntry(entry.id); }} className="text-stone-500 hover:text-red-500 transition-colors cursor-pointer p-0.5" title="Delete Note"><Trash2 className="w-3 h-3" /></button>
                                        </div>
                                        <p className={`break-words font-sans text-[#3a1c14] whitespace-pre-wrap text-left pr-4 ${index === 0 ? "font-normal italic" : "font-medium"}`}>{entry.entryText}</p>
                                        <div className="text-[9px] text-[#8c706d] text-left mt-1.5 select-none font-mono flex items-center justify-start gap-1 font-light leading-none"><span>{formatWhatsAppDate(entry.createdAt)}</span></div>
                                      </>
                                    )}
                                  </div>
                                );
                              })}
                              {activeJournalEntries.length === 0 && (
                                <div className="flex-grow flex flex-col items-center justify-center text-center py-8 px-4 h-full my-auto">
                                  <div className="w-10 h-10 rounded-full bg-white/80 flex items-center justify-center mb-2 shadow-4xs"><Send className="w-4 h-4 text-stone-400 rotate-45 -translate-x-[1px]" /></div>
                                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider font-mono">Activity Journal</span>
                                  <p className="text-[11px] text-stone-400 mt-1 max-w-[180px] leading-snug font-sans">Send notes on phone calls, agent feedback, or private status updates here.</p>
                                </div>
                              )}
                            </div>
                            <form onSubmit={handlePostJournal} className="mt-3 flex items-center gap-2 select-none shrink-0">
                              <div className="flex-grow bg-white border border-stone-200 rounded-full py-1.5 px-4 flex items-center shadow-3xs">
                                <input type="text" placeholder="Type a journal note..." value={journalInput} onChange={(e) => setJournalInput(e.target.value)} className="w-full text-xs bg-transparent outline-none border-none text-[#333333] placeholder-stone-400 py-0.5 leading-tight font-sans" />
                              </div>
                              <button type="submit" disabled={!journalInput.trim()} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0 ${journalInput.trim() ? "bg-[#00a884] hover:bg-[#008f72] text-white cursor-pointer shadow-3xs hover:scale-105" : "bg-stone-100 text-stone-300 cursor-not-allowed border border-stone-200"}`}>
                                <Send className={`w-3.5 h-3.5 ${journalInput.trim() ? "text-white" : "text-stone-300"}`} />
                              </button>
                            </form>
                          </div>
                        );
                      })()}
                    </div>

                  </div>{/* end three-column ledger */}
                </div>{/* end scrollable body */}
              </>
            ) : (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 32, color: "#9c8878", position: "relative", zIndex: 4 }}>
                <Notebook style={{ width: 48, height: 48, color: "rgba(124,58,42,.2)", marginBottom: 8 }} />
                <span>Select a query to open the reading pane.</span>
              </div>
            )}
          </MountCard>
        </div>
      </div>

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
