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
import { StatusDot } from "./StatusDot";
import { F12Page, F12Account, IconTrig, F12Popover, F12Menu, PopSection, PRow, Chip } from "./shell/F12Shell";
import { READING_PANE_FLOOR_PX } from "../lib/agentsPage";
import { queryAmbientStatus, commandBarStatus, queryBucket, queriesPulse } from "../lib/queryAmbient";
import { getPrimaryAction } from "../lib/queryPrimaryAction";
import { EdgeFadeScroll } from "./EdgeFadeScroll";
import { RecordResponseModal } from "./RecordResponseModal";
import { RecordResponseFocusForm } from "./RecordResponseFocusForm";
import { recordQueryResponse } from "../lib/recordResponse";
import { agentLabel, agentAgencyLine, agentPrimary, agentInitials } from "../lib/agentDisplay";
import { formatQueryMaterial } from "../lib/materials";
import { formatListRowDate } from "../lib/listRowDate";
import { MarkSentPopover } from "./MarkSentPopover";
import { NudgeModal } from "./NudgeModal";
import { queryTaskBadge } from "../lib/queryTaskBadge";
import { useFixedMenu } from "./forms/useFixedMenu";
import { useOpenEditQuery } from "./EditQueryHost";
import { QueryTimeline } from "./reading-pane/QueryTimeline";
import { TimelineComposer, type TimelineComposerHandle } from "./reading-pane/TimelineComposer";
import type { TimelineEntryRef } from "./reading-pane/QueryTimeline";
import { useToast } from "./toast/ToastProvider";
import { deriveQueryFields } from "../lib/queryDerivation";
import { subcollectionDocToDerivable } from "../lib/recomputeQuery";
import { TasksPopover } from "./TasksPopover";
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
// The status→primary-action map (the "CTA engine") now lives in src/lib/queryPrimaryAction.ts so
// the To-do focus/ledger flows share ONE source with this command bar — behaviour here is unchanged.

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
  Image as ImageIcon,
  Bell,
  XCircle,
  User,
  ListChecks,
  RotateCcw
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

/* Send-method label for the What-you-sent "Sent by {method}" line (ref shows lower-case forms). */
const sentViaLabel = (method?: string): string => {
  if (!method) return "";
  const m = method.toLowerCase().trim();
  if (m === "email") return "email";
  if (m === "online form" || m === "online_form") return "online form";
  if (m === "querymanager" || m === "query manager") return "QueryManager";
  return method;
};

/* ── Command-bar button (v2, ref queries-hub-v2.html .c) — icon+label SIDE-BY-SIDE, flat (no fill),
   faint hover; greyed-not-hidden when disabled so the bar keeps its shape. `primary` = coffee icon
   (#6f4e37) + semibold label; `dim`/`iconOnly` = the muted PDF · ⋯ pair. Badge renders inline after
   the label. ── */
const CmdBtn = React.forwardRef<HTMLButtonElement, {
  icon: React.ReactNode;
  label?: string;
  onClick?: () => void;
  disabled?: boolean;
  primary?: boolean;
  dim?: boolean;
  iconOnly?: boolean;
  destructive?: boolean;
  title?: string;
  badge?: React.ReactNode;
}>(({ icon, label, onClick, disabled, primary, dim, iconOnly, destructive, title, badge }, ref) => (
  <button
    ref={ref}
    type="button"
    title={title}
    onClick={disabled ? undefined : onClick}
    disabled={disabled}
    className="qp-c"
    style={{
      position: "relative", display: "inline-flex", alignItems: "center", gap: 8, flexShrink: 0,
      fontFamily: "'Inter',sans-serif", fontWeight: primary ? 600 : 500, fontSize: 13,
      color: disabled ? "#b7ab99" : (destructive ? "#9a3b2a" : (dim ? "var(--hub-label, #8f877b)" : "var(--hub-item, #1a1512)")),
      background: "none", border: "none", borderRadius: 9,
      padding: iconOnly ? "9px 10px" : "9px 13px",
      cursor: disabled ? "default" : "pointer", whiteSpace: "nowrap",
      opacity: disabled ? 0.35 : 1,
    }}
  >
    <span aria-hidden="true" style={{ display: "flex", alignItems: "center", color: disabled || dim || destructive ? "currentColor" : (primary ? "#6f4e37" : "#7a6f61") }}>{icon}</span>
    {label && <span>{label}</span>}
    {badge}
  </button>
));
CmdBtn.displayName = "CmdBtn";

/* ── Overflow-menu row (Close reasons + More). Left-aligned icon + label; greyed when a feature is
   stubbed this pass; destructive tint for Delete. ── */
const RibbonMenuItem: React.FC<{
  icon?: React.ReactNode; label: string; onClick?: () => void; disabled?: boolean; destructive?: boolean; title?: string;
}> = ({ icon, label, onClick, disabled, destructive, title }) => (
  <button
    type="button"
    title={title}
    onClick={disabled ? undefined : onClick}
    disabled={disabled}
    className="qp-menuitem"
    style={{
      display: "flex", alignItems: "center", gap: 9, width: "100%", textAlign: "left",
      background: "transparent", border: "none", borderRadius: 7, padding: "8px 10px",
      fontFamily: "'Inter',sans-serif", fontSize: 12.5, fontWeight: 500,
      color: disabled ? "#b7ab99" : (destructive ? "#9a3b2a" : "#2c2017"),
      cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.7 : 1, whiteSpace: "nowrap",
    }}
  >
    {icon && <span aria-hidden="true" style={{ display: "flex", flexShrink: 0 }}>{icon}</span>}
    <span>{label}</span>
  </button>
);
RibbonMenuItem.displayName = "RibbonMenuItem";

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
    deleteQuery,
    recordMaterialsSent,
    deleteJournalEntry,
    updateJournalEntry,
    deleteActivity,
    editActivity,
    updateAgent,
    updateQueryStatus,
    logNudge
  } = useScriptAllyDb();
  const { showConfirm, showToast } = useToast();
  // Query editing is the app-level Edit Query drawer (the inline isEditMode editor is retired).
  const openEditQuery = useOpenEditQuery();

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
  // The Mark-sent trigger now lives in the pane's command bar (pinned low), so the popover opens
  // UPWARD from it (additive placement — every other useFixedMenu caller keeps the default).
  const { triggerRef: markSentTriggerRef, menuStyle: markSentMenuStyle } = useFixedMenu<HTMLButtonElement>(isMarkSentOpen); // F12: the bar sits at the TOP — menus open downward
  // Control-ribbon secondary surfaces — Nudge (modal), Close-reasons menu (anchored upward off its
  // ribbon tile), and the Delete confirmation dialog. (v3: the More ⋯ menu was removed.)
  const [isNudgeOpen, setIsNudgeOpen] = useState(false);
  const [isCloseMenuOpen, setIsCloseMenuOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  // ⋯ overflow menu on the command bar (PDF demoted here — a rare action, chrome tidy).
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const { triggerRef: moreTrigRef, menuStyle: moreMenuStyle } = useFixedMenu<HTMLButtonElement>(isMoreOpen);
  // View tasks — the record-scoped popover (5c), anchored to the command-bar button.
  const [isTasksOpen, setIsTasksOpen] = useState(false);
  const { triggerRef: tasksTrigRef, menuStyle: tasksMenuStyle } = useFixedMenu<HTMLButtonElement>(isTasksOpen);
  // Timeline composer (5a): the CTA button scrolls + focuses this; Offer/R&R + "Add more detail"
  // open the rich form pre-set via these seam props.
  const composerRef = useRef<TimelineComposerHandle>(null);
  const [richInitialType, setRichInitialType] = useState<QueryStatus | undefined>(undefined);
  const [richInitialDraft, setRichInitialDraft] = useState<{ dateReceived?: string; note?: string } | undefined>(undefined);
  const openRichForm = (rt: QueryStatus, draft?: { dateReceived?: string; note?: string }) => {
    setRichInitialType(rt); setRichInitialDraft(draft); setIsRecordResponseFocusFormOpen(true);
  };
  // 5b — timeline corrections. Edit reopens the composer in place; Delete confirms with the DERIVED
  // consequence (the status the query recomputes to once this entry is gone) — never a bare "sure?".
  const onEditEntry = (entry: TimelineEntryRef) => composerRef.current?.startEdit(entry);
  const onDeleteEntry = (entry: TimelineEntryRef) => {
    const remaining = trackingEvents
      .filter((e) => e.id !== entry.activityId)
      .map((e) => subcollectionDocToDerivable(e.id, e));
    const derived = remaining.length ? deriveQueryFields(remaining).status : "Not yet sent";
    const current = (activeQuery?.status as string) || "";
    const changes = derived !== current;
    showConfirm({
      title: "Delete this entry?",
      danger: true,
      confirmLabel: "Delete entry",
      body: (
        <>
          {changes ? (
            <p style={{ margin: "0 0 8px" }}>
              This query will move <b style={{ textTransform: "uppercase", letterSpacing: "0.04em" }}>{current}</b> → <b style={{ textTransform: "uppercase", letterSpacing: "0.04em" }}>{derived}</b>.
            </p>
          ) : (
            <p style={{ margin: "0 0 8px" }}>This won’t change the query’s status.</p>
          )}
          <p style={{ margin: 0, color: "var(--muted, #7d7469)" }}>
            Use this only if the entry was logged by mistake. If something genuinely changed, record a new entry instead.
          </p>
        </>
      ),
      onConfirm: async () => { await deleteActivity(entry.activityId); showToast({ message: "Entry deleted" }); },
    });
  };
  const { triggerRef: closeTriggerRef, menuStyle: closeMenuStyle } = useFixedMenu<HTMLButtonElement>(isCloseMenuOpen); // F12: downward
  // Close every ribbon popover/modal whenever the reader moves to a different query.
  useEffect(() => { setIsMarkSentOpen(false); setIsNudgeOpen(false); setIsCloseMenuOpen(false); setIsDeleteConfirmOpen(false); setIsTasksOpen(false); setIsMoreOpen(false); }, [selectedQueryId]);
  // 5e — the delete is now WIRED to db.deleteQuery (cascades the per-query activity log + the
  // global-feed twins; models deleteAgent). No undo — a cascade restore isn't offered; the counted
  // confirm below is the safety. Clear the selection so the pane doesn't dangle on a deleted id.
  const handleDeleteQuery = () => {
    if (!activeQuery) return;
    const id = activeQuery.id;
    setIsDeleteConfirmOpen(false);
    setSelectedQueryId(null);
    void deleteQuery(id);
  };

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
  /* ── F12 filter model (ref queries-hub-v14.html filter popover) ──
     turn — WHOSE TURN radio, derived from the CTA engine's queryBucket (the ONE source of
     truth): "move" = writer's turn, "wait" = agent's court; never a second derivation.
     statusSel — exact QueryStatus enum strings, multi-select (empty OR full set = no filter).
     needsOverdue / needsTasks — the NEEDS ATTENTION checkboxes, both derived (reply overdue
     from responseDeadline while waiting; open tasks from the derived tasks array). */
  const [turnFilter, setTurnFilter] = useState<"all" | "move" | "wait">("all");
  const [statusSel, setStatusSel] = useState<QueryStatus[]>([]);     // committed live (no draft/Apply)
  const [selectedManuscriptFilter, setSelectedManuscriptFilter] = useState<string>("All");
  const [needsOverdue, setNeedsOverdue] = useState(false);
  const [needsTasks, setNeedsTasks] = useState(false);
  const [filterPopOpen, setFilterPopOpen] = useState(false);
  const [sortPopOpen, setSortPopOpen] = useState(false);
  // Portalled popovers anchor to their icon triggers via the codebase's fixed-position utility
  // (chrome revision — the list pane keeps overflow:hidden; the portal escapes the clip).
  const { triggerRef: filterTrigRef, menuStyle: filterMenuStyle } = useFixedMenu<HTMLButtonElement>(filterPopOpen);
  const { triggerRef: sortTrigRef, menuStyle: sortMenuStyle } = useFixedMenu<HTMLButtonElement>(sortPopOpen);
  // 5d — reading-pane click-to-pick: send method + manuscript, constrained to valid values, written
  // straight to the query (updateQuery is a plain patch; both keys are in the query update allowlist)
  // with an undo. The Edit drawer stays the home for everything else (agent, dates, materials…).
  const [methodPickOpen, setMethodPickOpen] = useState(false);
  const [msPickOpen, setMsPickOpen] = useState(false);
  const { triggerRef: methodPickTrigRef, menuStyle: methodPickMenuStyle } = useFixedMenu<HTMLButtonElement>(methodPickOpen);
  const { triggerRef: msPickTrigRef, menuStyle: msPickMenuStyle } = useFixedMenu<HTMLButtonElement>(msPickOpen);
  /* F12 sort — grouped Activity / Dates / Pipeline (ref sort popover). Default: last activity. */
  const [sortKey, setSortKey] = useState<string>("last_activity");
  /* Legacy shim — the hidden (display:none) mobile filter region still references this;
     nothing in the F12 chrome drives it. Cleanup candidate. */
  const [sortOption, setSortOption] = useState<string>("Newest first");
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
  // (filterMenuOpen/sortMenuOpen retired with the list-header menus — filtering moved to the bar.)

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
  // rAF-throttled recompute for the high-frequency sources (scroll, ResizeObserver bursts). The
  // timeout is the fallback for throttled/backgrounded windows where rAF never runs.
  const listFadeTick = React.useRef(false);
  const scheduleListFades = React.useCallback(() => {
    if (listFadeTick.current) return;
    listFadeTick.current = true;
    const run = () => { if (!listFadeTick.current) return; listFadeTick.current = false; recomputeListFades(); };
    requestAnimationFrame(run);
    window.setTimeout(run, 80);
  }, [recomputeListFades]);
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
        // Deep-linked arrival (?q=<id>): bring the row into the middle of the list viewport so it
        // lands clear of both edge fades. Only on the selection CHANGE — not on every data tick.
        if (selectedQueryId !== activeSubPage) {
          document.getElementById(`query-row-${activeSubPage}`)?.scrollIntoView({ block: "center" });
        }
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

  // The active query + its agent/manuscript, resolved live. The reading pane is view-only EXCEPT the
  // 5d click-to-pick shortcuts (send method + manuscript); everything else edits via the Edit Query
  // drawer (openEditQuery) — agent, dates, materials, journal, corrections.
  const activeQuery = selectedQueryId ? (selectedQuery || queries.find(q => q.id === selectedQueryId)) : null;
  const currentStatus = activeQuery?.status ?? selectedQuery?.status;
  const activeAgent = activeQuery ? agents.find(a => a.id === activeQuery.agentId) : null;
  const activeMs = activeQuery ? manuscripts.find(m => m.id === activeQuery.manuscriptId) : null;
  // 5d — click-to-pick writers (constrained values, plain updateQuery + undo). No cascade needed:
  // sendMethod is a display field; manuscriptId reassignment is a plain patch (historical activities
  // keep their own manuscriptId — the same derived-over-stored limitation the drawer has).
  const pickSendMethod = (m: SubmissionMethod) => {
    setMethodPickOpen(false);
    if (!activeQuery || m === activeQuery.sendMethod) return;
    const id = activeQuery.id, prev = activeQuery.sendMethod;
    void updateQuery(id, { sendMethod: m });
    showToast({ message: `Sent by ${sentViaLabel(m)}`, undo: () => void updateQuery(id, prev ? { sendMethod: prev } : { sendMethod: deleteField() as unknown as string }) });
  };
  const pickManuscript = (msId: string) => {
    setMsPickOpen(false);
    if (!activeQuery || msId === activeQuery.manuscriptId) return;
    const id = activeQuery.id, prev = activeQuery.manuscriptId;
    void updateQuery(id, { manuscriptId: msId });
    const to = manuscripts.find(m => m.id === msId)?.title || "another manuscript";
    showToast({ message: `Moved to ${to}`, undo: () => void updateQuery(id, { manuscriptId: prev }) });
  };
  // Queries Hub subtitle — the manuscript currently in scope ("Tracking …").
  const trackedManuscript = selectedManuscriptFilter !== "All" ? manuscripts.find(m => m.id === selectedManuscriptFilter) : null;
  // Manuscripts that actually have queries — the MANUSCRIPT pill group only shows these.
  const manuscriptsWithQueries = manuscripts.filter(m => queries.some(q => q.manuscriptId === m.id));
  const hubSubtitle = trackedManuscript ? trackedManuscript.title : "all manuscripts";
  // (The grand masthead + its pulse line are RETIRED with the F12 shell — the breadcrumb and
  // the list footer carry the page name and counts now; queriesPulse remains a lib for others.)

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

  // Status multi-select is "active" (a real filter) only on a proper partial selection —
  // an empty OR complete selection means "All" (no status filtering).
  const ALL_QUERY_STATUSES = Object.values(QueryStatus) as QueryStatus[];
  const statusFilterActive = statusSel.length > 0 && statusSel.length < ALL_QUERY_STATUSES.length;

  // ── F12 filter pipeline (ref queries-hub-v14.html filter popover) ──
  const nowMs = Date.now();
  /** Derived, never stored: still waiting on the agent with the reply expectation in the past. */
  const isOverdueForReply = (q: Query): boolean =>
    queryBucket(q.status as QueryStatus) === "waiting" &&
    !!q.responseDeadline && new Date(q.responseDeadline).getTime() < nowMs;

  const filteredList = queries.filter(q => {
    const agent = agents.find(a => a.id === q.agentId);
    const ms = manuscripts.find(m => m.id === q.manuscriptId);

    if (!agent || !ms) return false;

    // Whose turn — the CTA engine's queryBucket is the ONE source of truth (never re-derived):
    // "move" = the agent replied, over to you; "waiting" = ball in the agent's court.
    const bkt = queryBucket(q.status as QueryStatus);
    if (turnFilter === "move" && bkt !== "move") return false;
    if (turnFilter === "wait" && bkt !== "waiting") return false;

    // Status multi-select — the exact QueryStatus strings; only a partial selection filters.
    if (statusFilterActive && !statusSel.includes(q.status as QueryStatus)) return false;

    // Manuscript filter
    if (selectedManuscriptFilter !== "All" && q.manuscriptId !== selectedManuscriptFilter) {
      return false;
    }

    // Needs attention — both derived (reply overdue; open tasks via the derived Task[]).
    if (needsOverdue && !isOverdueForReply(q)) return false;
    if (needsTasks && queryTaskBadge(tasks, q.id).count === 0) return false;

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

  // ── F12 sort (ref sort popover: Activity / Dates / Pipeline) — all derived from fields
  // already on the query; no reads. MAXT stands in for "missing" so undated rows sink.
  const STATUS_SORT_ORDER = [
    QueryStatus.QUERIED, QueryStatus.PARTIAL_REQUESTED, QueryStatus.PARTIAL_SENT,
    QueryStatus.FULL_REQUESTED, QueryStatus.FULL_SENT, QueryStatus.REVISE_RESUBMIT,
    QueryStatus.OFFER, QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE,
  ];
  const MAXT = Number.MAX_SAFE_INTEGER;
  const toMs = (v: any): number => !v ? 0 : typeof v === "string" ? (new Date(v).getTime() || 0) : (v?.toDate?.()?.getTime?.() ?? 0);
  /** Latest of the query's own date fields — the "last activity" anchor. */
  const lastActivityMs = (q: any): number => Math.max(
    toMs(q.lastStatusChange), toMs(q.responseReceivedAt), toMs(q.dateSent),
    toMs(q.partialSentDate), toMs(q.fullSentDate), toMs(q.nudgeDate), toMs(q.lastNudgeSentDate)
  );
  /** The send the agent is sitting on (latest send date) — the "waiting since" anchor. */
  const waitAnchorMs = (q: any): number => Math.max(toMs(q.dateSent), toMs(q.partialSentDate), toMs(q.fullSentDate));
  /** Pipeline depth rank — deepest active first (Offer → … → Queried), closed statuses last. */
  const journeyRank = (q: Query): number => {
    const idx = STATUS_SORT_ORDER.indexOf(q.status as QueryStatus);
    return idx <= 6 ? 6 - idx : 10 + idx;
  };

  const sortedList = [...filteredList].sort((a, b) => {
    const agA = agents.find(ag => ag.id === a.agentId)?.name || "";
    const agB = agents.find(ag => ag.id === b.agentId)?.name || "";
    switch (sortKey) {
      case "agent_az": return agA.localeCompare(agB);
      case "date_newest": return toMs(b.dateSent) - toMs(a.dateSent);
      case "date_oldest": return (toMs(a.dateSent) || MAXT) - (toMs(b.dateSent) || MAXT);
      case "waiting_longest": {
        const aW = queryBucket(a.status as QueryStatus) === "waiting" ? (waitAnchorMs(a) || MAXT) : MAXT;
        const bW = queryBucket(b.status as QueryStatus) === "waiting" ? (waitAnchorMs(b) || MAXT) : MAXT;
        return aW - bW;
      }
      case "due_soonest": {
        const aD = a.responseDeadline ? new Date(a.responseDeadline).getTime() : MAXT;
        const bD = b.responseDeadline ? new Date(b.responseDeadline).getTime() : MAXT;
        return aD - bD;
      }
      case "journey_depth": return journeyRank(a) - journeyRank(b);
      case "last_activity":
      default: return lastActivityMs(b) - lastActivityMs(a);
    }
  });

  // ── F12 active-filter chips + the FILTER / SORT popovers (ref queries-hub-v14.html) ──
  const resetAllFilters = () => {
    setTurnFilter("all"); setStatusSel([]); setSelectedManuscriptFilter("All");
    setNeedsOverdue(false); setNeedsTasks(false);
  };
  const activeFilterChips: { key: string; label: string; remove: () => void }[] = [
    ...(turnFilter !== "all" ? [{ key: "turn", label: turnFilter === "move" ? "YOUR MOVE" : "WAITING", remove: () => setTurnFilter("all") }] : []),
    ...(selectedManuscriptFilter !== "All" ? [{ key: "ms", label: (manuscriptsWithQueries.find(m => m.id === selectedManuscriptFilter)?.title || "MANUSCRIPT").toUpperCase(), remove: () => setSelectedManuscriptFilter("All") }] : []),
    ...(statusFilterActive ? statusSel.map(s => ({ key: `st:${s}`, label: (s === QueryStatus.REVISE_RESUBMIT ? "R&R" : s).toUpperCase(), remove: () => setStatusSel(prev => prev.filter(x => x !== s)) })) : []),
    ...(needsOverdue ? [{ key: "overdue", label: "OVERDUE FOR A REPLY", remove: () => setNeedsOverdue(false) }] : []),
    ...(needsTasks ? [{ key: "tasks", label: "HAS OPEN TASKS", remove: () => setNeedsTasks(false) }] : []),
  ];
  const activeFilterCount = activeFilterChips.length;

  const OPEN_STATUSES_F12 = STATUS_SORT_ORDER.slice(0, 7);
  const CLOSED_STATUSES_F12 = STATUS_SORT_ORDER.slice(7);
  /* The mockup labels Revise & Resubmit "R&R" — the FILTER VALUE stays the exact enum string. */
  const statusDisplay = (s: QueryStatus) => (s === QueryStatus.REVISE_RESUBMIT ? "R&R" : s);

  const renderFilterPopover = () => (
    <F12Popover
      width={288}
      title="Filter"
      style={filterMenuStyle}
      onClose={() => setFilterPopOpen(false)}
      headAction={<button type="button" className="f12-reset" onClick={resetAllFilters}>RESET ALL</button>}
      footText={<><b>{filteredList.length}</b>&nbsp;OF {queries.length} QUERIES</>}
    >
      <PopSection label="Whose turn">
        <PRow kind="rad" on={turnFilter === "all"} label="All queries" sub="Everything, open and closed" onClick={() => setTurnFilter("all")} />
        <PRow kind="rad" on={turnFilter === "move"} label="Your move" sub="The agent has replied — over to you" onClick={() => setTurnFilter("move")} />
        <PRow kind="rad" on={turnFilter === "wait"} label="Waiting" sub="Ball is in the agent's court" onClick={() => setTurnFilter("wait")} />
      </PopSection>
      <PopSection label="Manuscript">
        <PRow kind="rad" on={selectedManuscriptFilter === "All"} label="All manuscripts" onClick={() => setSelectedManuscriptFilter("All")} />
        {manuscriptsWithQueries.map(m => (
          <PRow key={m.id} kind="rad" on={selectedManuscriptFilter === m.id} label={m.title} onClick={() => setSelectedManuscriptFilter(m.id)} />
        ))}
      </PopSection>
      <PopSection label="Status">
        <div className="f12-quick">
          <button type="button" onClick={() => setStatusSel([...OPEN_STATUSES_F12])}>OPEN ONLY</button>
          <button type="button" onClick={() => setStatusSel([...CLOSED_STATUSES_F12])}>CLOSED ONLY</button>
          <button type="button" onClick={() => setStatusSel([])}>CLEAR</button>
        </div>
        {STATUS_SORT_ORDER.map(s => (
          <PRow
            key={s}
            kind="box"
            on={statusSel.includes(s)}
            label={statusDisplay(s)}
            lead={<StatusDot status={s} overrideSize={15} decorative />}
            onClick={() => setStatusSel(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
          />
        ))}
      </PopSection>
      <PopSection label="Needs attention">
        <PRow kind="box" on={needsOverdue} label="Overdue for a reply" onClick={() => setNeedsOverdue(v => !v)} />
        <PRow kind="box" on={needsTasks} label="Has open tasks" onClick={() => setNeedsTasks(v => !v)} />
      </PopSection>
    </F12Popover>
  );

  const F12_SORT_GROUPS: { group: string; items: { key: string; label: string; sub?: string }[] }[] = [
    { group: "Activity", items: [
      { key: "last_activity", label: "Last activity", sub: "Most recently moved first" },
    ]},
    { group: "Dates", items: [
      { key: "date_newest", label: "Date sent · newest", sub: "Your latest queries first" },
      { key: "date_oldest", label: "Date sent · oldest" },
      { key: "waiting_longest", label: "Waiting longest", sub: "Silence, longest first" },
      { key: "due_soonest", label: "Reply due soonest", sub: "Floats overdue queries to the top" },
    ]},
    { group: "Pipeline", items: [
      { key: "journey_depth", label: "Journey depth", sub: "Offers and fulls above fresh queries" },
      { key: "agent_az", label: "Agent · A to Z" },
    ]},
  ];
  const renderSortPopover = () => (
    <F12Popover
      width={276}
      title="Sort"
      style={sortMenuStyle}
      onClose={() => setSortPopOpen(false)}
      footText={(F12_SORT_GROUPS.flatMap(g => g.items).find(i => i.key === sortKey)?.label || "Last activity").toUpperCase()}
    >
      {F12_SORT_GROUPS.map(g => (
        <PopSection key={g.group} label={g.group}>
          {g.items.map(i => (
            <PRow key={i.key} kind="rad" on={sortKey === i.key} label={i.label} sub={i.sub} onClick={() => setSortKey(i.key)} />
          ))}
        </PopSection>
      ))}
    </F12Popover>
  );

  // Automatically select first element if currently selected is filtered out
  const statusFiltersKey = `${turnFilter}|${statusSel.join(",")}|${needsOverdue}|${needsTasks}`;
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
  // viewport resize. Scroll-driven updates come from the container's onScroll handler. The
  // ResizeObserver covers the display-toggled page slot: data usually lands while this page is
  // hidden (persistent StagePage, display:none → clientHeight 0, fades computed off), and nothing
  // else re-runs when the slot becomes visible — the observer fires on that 0 → real size flip.
  useEffect(() => {
    recomputeListFades();
    const el = listScrollRef.current;
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(scheduleListFades) : null;
    if (ro && el) {
      ro.observe(el);
      if (el.firstElementChild) ro.observe(el.firstElementChild); // rows wrapper — content growth
    }
    window.addEventListener("resize", scheduleListFades);
    return () => { ro?.disconnect(); window.removeEventListener("resize", scheduleListFades); };
  }, [recomputeListFades, scheduleListFades, sortedList.length, selectedQueryId]);

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

      const agentName = ag ? agentPrimary(ag) : "";
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
      const agentName = agentPrimary(activeAgent);
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
    /* ── F12 shell (ref queries-hub-v18.html): white full-bleed header (CrumbStrip repainted by
       the .t-f12 tokens); the only right-side item is the account cluster — export/help/the CTA
       all left this bar (chrome revision; the CTA moved to the control bar's left zone). ── */
    <F12Page
      tools={<F12Account onClick={() => onNavigate?.("account")} />}
    >
    <div
      className="w-full flex flex-col overflow-hidden font-sans relative queries-container-theme"
      style={{ flex: 1, minHeight: 0 }}
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
        /* (The old .qdesk / .queries-content-grid short-screen fallback is retired — both panes
           now live in the shared .f12-body column, same as the Contact List page.) */
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

        {/* ── The F12 work area — control bar + chips + panes stack directly in the oat column
            (the old qdesk/deskpad wrappers are retired with the hub-token paint). Each branch
            renders its own bands; everything below the header sits in the centred --maxw column
            via the f12-ctl / f12-chips / f12-body classes. ── */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>

        {queries.length === 0 ? (
          /* ── Empty database — F12 shell: a list pane with a "No queries yet" placeholder
             (Export disabled) beside the welcome pane (Smart Import + manual add). ── */
          <>
          {/* Empty split — list placeholder + welcome pane in the centred column */}
          <div className="f12-body" style={{ paddingTop: "var(--gut)" }}>

            {/* List pane — search + centred placeholder + disabled CSV foot */}
            <div className="f12-pane f12-list">
              <div className="f12-lsearch">
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                <input type="text" placeholder="Search queries…" value={listSearch} onChange={(e) => setListSearch(e.target.value)} aria-label="Search queries" />
              </div>
              <div className="f12-rows" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 24, gap: 8 }}>
                <span style={{ color: "var(--faint)", display: "flex" }}>
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
                </span>
                <span style={{ fontFamily: "var(--f12-serif)", fontWeight: 600, fontSize: 15, color: "var(--ink)" }}>No queries yet</span>
                <span style={{ fontSize: 12, lineHeight: 1.5, color: "var(--muted)", maxWidth: 200 }}>Your queries will appear here once you log or import them.</span>
              </div>
              <div className="f12-lfoot">
                <span><b>SHOWING 0 OF 0</b></span>
                <span style={{ opacity: 0.5 }}>EXPORT CSV</span>
              </div>
            </div>

            {/* Welcome pane — centred onboarding */}
            <div className="f12-pane f12-detail" style={{ overflowY: "auto", alignItems: "center", justifyContent: "center", padding: 24, display: "flex" }}>
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

        {/* ── F12 CONTROL BAR (ref queries-hub-v14.html .ctl): two zones locked by --listw —
            left = FILTER + SORT pill triggers (nothing else); right = the query actions as
            QUIET buttons (no filled button in this bar), PDF + Delete right-aligned. The old
            masthead + hub-grammar filter bar and the foot control-row cards are retired. ── */}
        {(() => {
          const sel = !!(activeQuery && activeAgent && activeMs);
          const status = activeQuery ? (activeQuery.status as QueryStatus) : null;
          const ctrlAction = status ? getPrimaryAction(status) : null;
          const isMark = ctrlAction?.kind === "mark-sent";
          const isClosed = status === QueryStatus.REJECTED || status === QueryStatus.WITHDRAWN || status === QueryStatus.NO_RESPONSE;
          const waitingOnAgent = ctrlAction?.ballHolder === "agent";
          const taskCount = sel && activeQuery ? queryTaskBadge(tasks, activeQuery.id).count : 0;
          const primaryLabel = isClosed ? "Reopen"
            : (isMark && ctrlAction?.kind === "mark-sent") ? (ctrlAction.markKind === "resubmit" ? "Record resubmission" : "Mark sent")
            : "Record response";
          const primaryRef = (sel && isMark && !isClosed) ? markSentTriggerRef : undefined;
          // Demoted to a shortcut (5a): the contextual CTA keeps its label but now scrolls to the
          // composer + focuses it — one recording flow, two entrances. The composer's chips carry
          // the actual writes (mark-sent → MarkSentPopover, Offer/R&R → rich form, etc.).
          const onPrimary = !sel ? undefined : () => composerRef.current?.focus();

          return (
            <div className="f12-ctl">
              {/* Left zone — flush with the list pane's left edge: the pink CTA + Import data.
                  (Filter/Sort moved into the list-pane head as icon triggers — phase 4.) */}
              <div className="f12-zone-list">
                <button type="button" className="f12-btn-pri" onClick={() => onNavigate?.("queries", "Log a query")}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
                  Log a query
                </button>
                <button type="button" className="f12-btn-sec" onClick={() => onNavigate?.("import")} title="Smart Import — bring in your existing spreadsheet">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 20h16" /></svg>
                  Import data
                </button>
              </div>

              {/* Right zone — inset 20px from both pane edges; verbs, then the link group, then danger. */}
              <div className="f12-zone-read">
                <button ref={primaryRef} type="button" className="f12-act" disabled={!sel} onClick={onPrimary}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4Z" /></svg>
                  {primaryLabel}
                </button>
                <span className="f12-popwrap" style={{ display: "inline-flex" }}>
                  <button ref={tasksTrigRef} type="button" className="f12-act" disabled={!sel} aria-haspopup="dialog" aria-expanded={isTasksOpen} onClick={() => setIsTasksOpen(o => !o)}>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h10M4 12h10M4 18h10" /><path d="m17 6 1.5 1.5L21.5 4" /><path d="m17 12 1.5 1.5L21.5 10" /></svg>
                    View tasks
                    {taskCount > 0 && <span className="f12-cnt">{taskCount}</span>}
                  </button>
                  {isTasksOpen && activeQuery && (
                    <TasksPopover scope={{ queryId: activeQuery.id }} style={tasksMenuStyle} onClose={() => setIsTasksOpen(false)} />
                  )}
                </span>
                <button type="button" className="f12-act" disabled={!sel} onClick={() => activeQuery && openEditQuery(activeQuery.id)}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                  Edit
                </button>
                <button type="button" className="f12-act" disabled={!sel || !waitingOnAgent} onClick={() => setIsNudgeOpen(true)} title={sel && !waitingOnAgent ? "Available while you're waiting on the agent" : undefined}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" /></svg>
                  Nudge
                </button>
                <button ref={closeTriggerRef} type="button" className="f12-act" disabled={!sel || isClosed} onClick={() => setIsCloseMenuOpen(o => !o)} title={sel && isClosed ? "Already closed" : undefined}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="4" rx="1" /><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M9 12h6" /></svg>
                  Mark closed
                </button>
                {/* link group — pushed right by margin-left:auto */}
                <div className="f12-grp-links">
                  <button type="button" className="f12-act" disabled title="Coming soon — jump to the agent's record">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5" /><path d="M5.5 20c.7-3.6 3.3-5.6 6.5-5.6s5.8 2 6.5 5.6" /></svg>
                    Agent
                  </button>
                  <button type="button" className="f12-act" disabled title="Coming soon — jump to the manuscript">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17.5H6.5A2.5 2.5 0 0 0 4 22V4.5z" /></svg>
                    Manuscript
                  </button>
                </div>
                <span className="f12-divv2" aria-hidden="true" />
                <div className="f12-popwrap">
                  <button ref={moreTrigRef} type="button" className="f12-act" disabled={!sel} aria-haspopup="menu" aria-expanded={isMoreOpen} onClick={() => setIsMoreOpen(o => !o)} title="More actions">⋯</button>
                  <F12Menu
                    open={isMoreOpen}
                    onClose={() => setIsMoreOpen(false)}
                    style={moreMenuStyle}
                    ariaLabel="More query actions"
                    items={[
                      {
                        label: isGeneratingPDF ? "Generating…" : "Download as PDF",
                        disabled: isGeneratingPDF,
                        icon: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" /></svg>,
                        onClick: () => handleDownloadPDF(),
                      },
                    ]}
                  />
                </div>
                <button type="button" className="f12-act f12-del" disabled={!sel} onClick={() => setIsDeleteConfirmOpen(true)} title="Delete this query">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>
                  Delete
                </button>
              </div>
            </div>
          );
        })()}

        {/* Active filters — removable pink chips on the oat beneath the bar (panes never resize). */}
        {activeFilterChips.length > 0 && (
          <div className="f12-chips">
            {activeFilterChips.map((c) => (
              <Chip key={c.key} onRemove={c.remove}>{c.label}</Chip>
            ))}
            <button type="button" className="f12-clear" onClick={resetAllFilters}>CLEAR ALL</button>
          </div>
        )}

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

        {/* Close-reasons menu — anchored upward off the Close ribbon tile */}
        {isCloseMenuOpen && activeQuery && (
          <>
            <div onClick={() => setIsCloseMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 59 }} aria-hidden="true" />
            <div style={{ ...closeMenuStyle, zIndex: 60, background: "#fffefb", border: "1px solid var(--bd)", borderRadius: 12, boxShadow: "0 12px 34px rgba(58,44,31,.18)", padding: 6, minWidth: 198 }}>
              <div style={{ fontFamily: FONT_MONO, fontSize: 8.5, letterSpacing: ".12em", textTransform: "uppercase", color: "#b7ab99", padding: "6px 10px 5px" }}>Close this query as…</div>
              {[QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE].map((reason) => (
                <RibbonMenuItem
                  key={reason}
                  icon={<StatusDot status={reason} overrideSize={15} decorative />}
                  label={reason}
                  onClick={() => { setIsCloseMenuOpen(false); updateQueryStatus(activeQuery.id, reason); }}
                />
              ))}
            </div>
          </>
        )}

        {/* Delete confirmation — destructive, no undo. v3 promoted Delete to the bar (the ⋯ More menu
            was removed). The final deletion is a flagged STUB (no deleteQuery handler yet — see the
            handleDeleteQuery note above); the confirm flow itself is real. */}
        {isDeleteConfirmOpen && activeQuery && activeAgent && (() => {
          const agentName = agentPrimary(activeAgent) || "this agent";
          // 5e — counted confirm: the tracking events this delete erases + the stat consequence.
          const evCount = activities.filter(a => a.queryId === activeQuery.id).length;
          const responded = activeQuery.hasAgentResponded === true;
          return (
            <div role="dialog" aria-modal="true" aria-label="Delete query" onClick={() => setIsDeleteConfirmOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 70, background: "rgba(29,23,18,.42)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
              <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 420, background: "#fffefb", border: "1px solid var(--bd)", borderRadius: 16, boxShadow: "0 24px 60px rgba(29,23,18,.28)", padding: "22px 24px" }}>
                <div style={{ fontFamily: FONT_SERIF, fontSize: 19, fontWeight: 700, color: "#1a1512", marginBottom: 9 }}>Delete this query?</div>
                <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 13.5, lineHeight: 1.5, color: "#5a5048" }}>
                  This permanently deletes your query to <b style={{ color: "#1a1512" }}>{agentName}</b>{activeMs?.title ? <> for <b style={{ color: "#1a1512" }}>{activeMs.title}</b></> : null}{evCount > 0 ? <>, along with its <b style={{ color: "#1a1512" }}>{evCount} tracking event{evCount > 1 ? "s" : ""}</b></> : <>, along with its tracking history</>}.{responded ? <> Your <b style={{ color: "#1a1512" }}>response stats</b> will change.</> : null} <b style={{ color: "#9a3b2a" }}>This can’t be undone.</b>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 9, marginTop: 20 }}>
                  <button type="button" onClick={() => setIsDeleteConfirmOpen(false)} style={{ fontFamily: "'Inter',sans-serif", fontSize: 12.5, fontWeight: 500, color: "#5a5048", background: "#ffffff", border: "1px solid var(--bd)", borderRadius: 9, padding: "9px 16px", cursor: "pointer" }}>Cancel</button>
                  <button type="button" onClick={handleDeleteQuery} style={{ fontFamily: "'Inter',sans-serif", fontSize: 12.5, fontWeight: 600, color: "#fff", background: "#9a3b2a", border: "1px solid #9a3b2a", borderRadius: 9, padding: "9px 16px", cursor: "pointer" }}>Delete query</button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── Split — list pane beside the reading pane, in the SAME centred column as the
            Contact List page (.f12-body: max-width --maxw, auto margins, --gut bottom gap;
            the two panes are --listw / flex:1, locked to the control-bar zones above). ── */}
        <div className="f12-body" style={{ paddingTop: activeFilterChips.length ? 0 : "var(--gut)" }}>

          {/* ── List pane (F12, ref queries-hub-v14.html .list): search field only at the top,
              56px rows, slim footer (SHOWING n OF m · EXPORT CSV · key hints). No "your move"
              pills, no manuscript spine — the row is avatar · name/agency · StatusDot + date. ── */}
          <div className="f12-pane f12-list">
            <div className="f12-lhead">
              <div className="f12-lsearch">
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                <input
                  type="text"
                  placeholder="Search"
                  value={listSearch}
                  onChange={(e) => setListSearch(e.target.value)}
                  aria-label="Search queries"
                />
              </div>
              <div className="f12-popwrap">
                <IconTrig
                  ref={filterTrigRef}
                  tip="FILTER"
                  open={filterPopOpen}
                  count={activeFilterCount}
                  onClick={() => { setSortPopOpen(false); setFilterPopOpen(o => !o); }}
                  icon={<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18l-7 8v6l-4-2v-4L3 5z" /></svg>}
                />
                {filterPopOpen && renderFilterPopover()}
              </div>
              <div className="f12-popwrap">
                <IconTrig
                  ref={sortTrigRef}
                  tip={`SORT · ${(F12_SORT_GROUPS.flatMap(g => g.items).find(i => i.key === sortKey)?.label || "Last activity").toUpperCase()}`}
                  open={sortPopOpen}
                  onClick={() => { setFilterPopOpen(false); setSortPopOpen(o => !o); }}
                  icon={<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v14M7 18l-3-3M7 18l3-3M17 20V6M17 6l-3 3M17 6l3 3" /></svg>}
                />
                {sortPopOpen && renderSortPopover()}
              </div>
            </div>
            <div ref={listScrollRef} onScroll={scheduleListFades} className="f12-rows" role="listbox" aria-label="Queries">
              {sortedList.map((q) => {
                const agent = agents.find(a => a.id === q.agentId);
                const ms = manuscripts.find(m => m.id === q.manuscriptId);
                if (!agent || !ms) return null;
                const isSelected = selectedQueryId === q.id;
                // Bare quiet date ("14 Mar"; year only when not current); em-dash for undated imports.
                const queriedDate = formatListRowDate(q.dateSent) ?? "—";
                return (
                  <button
                    key={q.id}
                    type="button"
                    id={`query-row-${q.id}`}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => setSelectedQueryId(q.id)}
                    className={`f12-row${isSelected ? " f12-sel" : ""}`}
                  >
                    <span className="f12-av" aria-hidden="true">{agentInitials(agent)}</span>
                    <span className="f12-mid">
                      <span className="f12-nm">{agentPrimary(agent)}</span>
                      <span className="f12-ag">{agentAgencyLine(agent)}</span>
                    </span>
                    <span className="f12-end">
                      {undoingQueryIds.has(q.id) ? (
                        <span className="animate-pulse" style={{ display: "inline-flex", gap: 3 }} aria-hidden="true">
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--burg)" }} />
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--burg)" }} />
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--burg)" }} />
                        </span>
                      ) : (
                        <StatusDot status={q.status} overrideSize={15} />
                      )}
                      <span className="f12-d2">{queriedDate}</span>
                    </span>
                  </button>
                );
              })}
              {sortedList.length === 0 && (
                <div style={{ textAlign: "center", padding: "48px 16px", color: "var(--faint)", fontSize: 12, fontStyle: "italic" }}>
                  No queries match these filters.
                </div>
              )}
            </div>
            <div className="f12-lfoot">
              <span>SHOWING <b>{sortedList.length}</b> OF {queries.length}</span>
              <button type="button" onClick={() => sortedList.length > 0 && handleExportFilteredCSV()}>EXPORT CSV</button>
            </div>
          </div>{/* closes list pane */}

          {/* Reading pane — the WORKSPACE (desk-rule second clause, ref queries-workspace-v2.html:
              a live process you act on FILLS to the viewport line, unlike the Agents document which
              hugs). A flex column: agent band (flex:none) over three full-height columns that each
              scroll behind their own edge fade (flex:1). The command bar pins to the pane foot in
              Phase 2; the top action toolbar above still exists this phase. */}
          <div className="qp-pane f12-pane f12-detail" style={{ minHeight: 0, background: "var(--paper)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {activeQuery && activeAgent && activeMs ? (
              <>
                <style>{`
                  .qp-noteacts{ opacity:0; transition:opacity .14s; }
                  .qp-note:hover .qp-noteacts{ opacity:1; }
                  .qp-noteact{ width:22px; height:22px; border:none; background:transparent; border-radius:5px; color:#bcae9e; display:flex; align-items:center; justify-content:center; cursor:pointer; }
                  .qp-noteact:hover{ background:#f3ebe0; color:#7c3a2a; }
                `}</style>
                {/* ── Agent header (F12, ref .hero) — SAGE LEFT SPINE (::before in f12.css, clipped
                    by the card radius via overflow:hidden; there is NO top accent rule), pink avatar
                    with black initials, Playfair name, agency, pink status pill, plane ornament. ── */}
                {(() => {
                  const nameplate = agentPrimary(activeAgent);
                  const initials = agentInitials(activeAgent);
                  return (
                    <div className="f12-hero" style={{ margin: "20px 20px 0", flexShrink: 0 }}>
                      <span className="f12-bigav" aria-hidden="true">{initials}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="f12-hn" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nameplate}</div>
                        {!!activeAgent.name?.trim() && !!activeAgent.agency?.trim() && (
                          <div className="f12-ha">{activeAgent.agency}</div>
                        )}
                        <span className="f12-hs">{statusDisplayLabel(activeQuery)}</span>
                      </div>
                      <span aria-hidden="true" style={{ marginLeft: "auto", flexShrink: 0, width: 52, height: 52, borderRadius: "50%", background: "var(--paper)", border: "1px solid var(--hairline)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--faint)" }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"><path d="M21 3 3 10.5l6.5 2.6L12 20l3-5.5L21 3z" /></svg>
                      </span>
                    </div>
                  );
                })()}

                {/* Columns — three FULL-HEIGHT equal columns (workspace fill): the row takes all the
                    space below the agent band, each column scrolls independently behind its own edge
                    fade, the Journal composer pins to its column foot. */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, padding: "16px 20px 20px", flex: 1, minHeight: 0, alignItems: "stretch" }}>

                  {/* ── Sub-card 1: Tracking ── */}
                  <div className="f12-card" style={{ minWidth: 0, minHeight: 0 }}>
                      {/* sage gradient header band (matches the dashboard diary bands) */}
                      <div className="f12-chh">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h4l3 8 4-16 3 8h4" /></svg>
                        <span>Tracking</span>
                      </div>
                      <EdgeFadeScroll outerStyle={{ flex: 1, minHeight: 0 }} scrollStyle={{ padding: "16px 16px 18px" }} fade="var(--panel, #fffdfb)">
                        {(() => {
                          // Pass the same open-state fact the command bar uses, so the trailing block
                          // switches agent's-turn / writer's-turn / closed identically.
                          const ta = getPrimaryAction(activeQuery.status as QueryStatus);
                          return (
                            <QueryTimeline
                              query={activeQuery}
                              agent={activeAgent}
                              events={trackingEvents}
                              primaryAction={{ ballHolder: ta.ballHolder, markKind: ta.kind === "mark-sent" ? ta.markKind : undefined }}
                              onEditEntry={onEditEntry}
                              onDeleteEntry={onDeleteEntry}
                              onNudge={() => setIsNudgeOpen(true)}
                              onSetExpectedDate={() => openEditQuery(activeQuery.id)}
                            />
                          );
                        })()}
                        {/* P6 (Layout A) — the "What happened next?" composer FLOWS directly under the
                            tracking readout, in normal document order (un-pinned from the card foot);
                            any leftover column height falls as whitespace below it. Chips derive from
                            composerChips (the CTA engine); it never auto-writes and stays NEUTRAL — the
                            overdue readout is the pane's only needs-you signal. */}
                        <TimelineComposer
                          ref={composerRef}
                          query={activeQuery}
                          agent={activeAgent}
                          manuscript={{ title: activeMs?.title || "" }}
                          onOpenRichForm={openRichForm}
                          onMarkSent={() => setIsMarkSentOpen(true)}
                          onNudge={() => setIsNudgeOpen(true)}
                        />
                      </EdgeFadeScroll>
                    </div>{/* ── end sub-card 1: Tracking ── */}

                  {/* ── Sub-card 2: What you sent ── */}
                  <div className="f12-card" style={{ minWidth: 0, minHeight: 0 }}>
                      {/* pink header band */}
                      <div className="f12-chh">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
                        <span>What you sent</span>
                      </div>
                      {/* spec sheet */}
                      <EdgeFadeScroll outerStyle={{ flex: 1, minHeight: 0 }} scrollStyle={{ padding: "16px 16px 18px" }} fade="var(--panel, #fffdfb)">
                        {(() => {
                          const mats: (string | QueryMaterial)[] = Array.isArray((activeQuery as any).materialsWanted) && (activeQuery as any).materialsWanted.length
                            ? (activeQuery as any).materialsWanted
                            : (Array.isArray(activeAgent.materialsWanted) ? activeAgent.materialsWanted : []);
                          const materials = mats.map(formatQueryMaterial).filter(Boolean);
                          const linkedPackage = activeQuery.packageId ? packages.find(p => p.id === activeQuery.packageId) : null;
                          const pkgComponents = linkedPackage
                            ? [["Query letter", linkedPackage.queryLetterVersionId], ["Synopsis", linkedPackage.synopsisVersionId], ["Sample pages", linkedPackage.samplePagesVersionId]].filter(([, v]) => !!v).map(([l]) => l as string)
                            : [];
                          const isPro = currentUser?.plan === UserPlan.PRO;
                          const openPackages = () => onNavigate?.("manuscripts", "Submission packages");
                          const method = sentViaLabel(activeQuery.sendMethod || activeAgent.submissionMethod);
                          // dateSent is optional (undated imports) — render the date only when present, never invent one.
                          const sentDate = activeQuery.dateSent ? new Date(activeQuery.dateSent).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "";
                          const EXPECTED = ["Query letter", "Synopsis", "Sample chapters"];

                          const proChip = (auto?: boolean) => (<span style={{ ...(auto ? { marginLeft: "auto" } : { marginLeft: 6 }), fontFamily: FONT_MONO, fontSize: 7.5, letterSpacing: ".1em", textTransform: "uppercase" as const, color: "#fff", background: "#6A89A7", borderRadius: 6, padding: "3px 7px", whiteSpace: "nowrap" as const }}>PRO</span>);
                          const addlinkStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 7, fontFamily: "'Inter',sans-serif", fontSize: 12, color: "#8f877b", marginTop: 14, cursor: "pointer" };
                          const matRow = (label: string, miss: boolean, last: boolean, k: React.Key) => (
                            <div key={k} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: last ? "none" : "1px solid var(--bd)", fontFamily: "'Inter',sans-serif", fontSize: 13.5, color: miss ? "#8f877b" : "var(--hub-item, #1a1512)" }}>
                              <span style={{ width: 17, height: 17, borderRadius: "50%", flexShrink: 0, display: "grid", placeItems: "center", fontSize: 9, ...(miss ? { background: "transparent", border: "1.5px dashed #cfc3b1", color: "transparent" } : { background: "#eef3eb", color: "#4a5d45" }) }}>✓</span>
                              {label}
                            </div>
                          );
                          const sentLine = (
                            <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: FONT_MONO, fontSize: 9.5, letterSpacing: ".07em", textTransform: "uppercase" as const, color: "#8f877b", marginTop: 14 }}>
                              {/* 5d — method click-to-pick */}
                              Sent by
                              <span className="f12-popwrap" style={{ display: "inline-flex" }}>
                                <button ref={methodPickTrigRef} type="button" className="qce-pick" aria-haspopup="menu" aria-expanded={methodPickOpen} title="Change how this query was sent" onClick={() => setMethodPickOpen(o => !o)} style={{ font: "inherit", letterSpacing: "inherit", textTransform: "inherit", color: method ? "var(--hub-item, #1a1512)" : "#8f877b", background: "none", border: "none", padding: 0, cursor: "pointer" }}>
                                  {method || "set method"}
                                </button>
                                <F12Menu open={methodPickOpen} onClose={() => setMethodPickOpen(false)} style={methodPickMenuStyle} ariaLabel="Change send method"
                                  items={[SubmissionMethod.EMAIL, SubmissionMethod.ONLINE_FORM, SubmissionMethod.QUERY_MANAGER, SubmissionMethod.POST].map((m) => ({
                                    label: sentViaLabel(m),
                                    icon: activeQuery.sendMethod === m ? <span aria-hidden="true">✓</span> : undefined,
                                    onClick: () => pickSendMethod(m),
                                  }))}
                                />
                              </span>
                              {sentDate && <>&nbsp;·&nbsp;<span style={{ color: "var(--hub-item, #1a1512)" }}>{sentDate}</span></>}
                            </div>
                          );

                          return (
                            <>
                              {/* shared skeleton — book icon + manuscript title (5d: click-to-reassign) */}
                              <div style={{ display: "flex", alignItems: "center", gap: 9, fontFamily: FONT_SERIF, fontWeight: 700, fontSize: 18, color: "var(--hub-item, #1a1512)", lineHeight: 1.15 }}>
                                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#6f4e37" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M5 3h11l3 3v15H5zM9 3v6l2-1 2 1V3" /></svg>
                                <span className="f12-popwrap" style={{ minWidth: 0, display: "inline-flex" }}>
                                  <button ref={msPickTrigRef} type="button" className="qce-pick" aria-haspopup="menu" aria-expanded={msPickOpen} title="Move this query to a different manuscript" onClick={() => setMsPickOpen(o => !o)} style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", font: "inherit", color: "inherit", background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}>
                                    {activeMs.title}
                                  </button>
                                  <F12Menu open={msPickOpen} onClose={() => setMsPickOpen(false)} style={msPickMenuStyle} ariaLabel="Reassign manuscript"
                                    items={[
                                      ...manuscripts.map((m) => ({ label: m.title, icon: m.id === activeQuery.manuscriptId ? <span aria-hidden="true">✓</span> : undefined, onClick: () => pickManuscript(m.id) })),
                                      "divider" as const,
                                      { label: "＋ Add a manuscript", onClick: () => onNavigate?.("manuscripts", "Add a manuscript") },
                                    ]}
                                  />
                                </span>
                              </div>

                              {linkedPackage ? (
                                /* PRO — slate bundle card (no package-level version field exists; name only). */
                                <>
                                  <div style={{ border: "1px solid #cfd9e2", background: "#f4f7fa", borderRadius: 11, padding: "12px 14px", marginTop: 12 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "'Inter',sans-serif", fontWeight: 600, fontSize: 13.5, color: "#2e4257" }}>
                                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2e4257" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>
                                      <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{linkedPackage.packageName}</span>
                                      {proChip(true)}
                                    </div>
                                    {pkgComponents.length > 0 && <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 11.5, color: "#5a6e80", marginTop: 5 }}>{pkgComponents.join(" · ")}</div>}
                                  </div>
                                  {sentLine}
                                  <div role="button" tabIndex={0} onClick={openPackages} style={addlinkStyle}>✎ Edit package</div>
                                </>
                              ) : materials.length > 0 ? (
                                /* FREE, materials added — ticked checklist (names only, no detail column). */
                                <>
                                  <div style={{ marginTop: 10 }}>
                                    {materials.map((m, i) => matRow(m, false, i === materials.length - 1, i))}
                                  </div>
                                  {sentLine}
                                  <div role="button" tabIndex={0} onClick={openPackages} style={addlinkStyle}>＋ Attach a submission package{!isPro && proChip()}</div>
                                </>
                              ) : (
                                /* EMPTY (P4) — the hollow expected checklist IS the prompt; a quiet link
                                   opens the Edit drawer to record what was sent. The big dashed tile that
                                   stacked above the checklist is retired (one control, not two). */
                                <>
                                  <div>
                                    {EXPECTED.map((l, i) => matRow(l, true, i === EXPECTED.length - 1, l))}
                                  </div>
                                  <div role="button" tabIndex={0} onClick={() => openEditQuery(activeQuery.id)} style={addlinkStyle}>✎ Add the materials you sent</div>
                                  <div role="button" tabIndex={0} onClick={openPackages} style={{ ...addlinkStyle, marginTop: 12 }}>＋ Attach a submission package{!isPro && proChip()}</div>
                                </>
                              )}
                            </>
                          );
                        })()}
                      </EdgeFadeScroll>
                    </div>{/* ── end sub-card 2: What you sent ── */}

                  {/* ── Sub-card 3: Notes — journal pins to bottom via flex-1 on messages area ── */}
                  <div className="f12-card" style={{ minWidth: 0, minHeight: 0 }}>
                      {/* pink header band */}
                      <div className="f12-chh">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H19v15H6a2 2 0 0 0-2 2z" /><path d="M4 19.5A1.5 1.5 0 0 1 5.5 18H19" /></svg>
                        <span>Journal</span>
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
                              <EdgeFadeScroll outerStyle={{ flex: 1, minHeight: 0 }} scrollStyle={{ display: "flex", flexDirection: "column", paddingRight: 2 }} fade="var(--panel, #fffdfb)">
                                {notes.length === 0 ? (
                                  /* ghost first entry — DOTTED outline, no fill (a placeholder that looks
                                     like one; ref .note); replaced on first save */
                                  <div className="f12-note">
                                    <div className="f12-nd">TODAY</div>
                                    <div className="f12-nt">Your notes on this query appear here — first impressions, things they said, anything worth remembering.</div>
                                  </div>
                                ) : notes.map((entry) => {
                                  const isEditing = editingJournalId === entry.id;
                                  return (
                                    <div key={entry.id} className="qp-note" style={{ background: "#ffffff", border: "1px solid var(--bd)", borderRadius: 12, padding: "11px 13px", marginBottom: 9 }}>
                                      {isEditing ? (
                                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                          <textarea value={editingJournalText} onChange={(e) => setEditingJournalText(e.target.value)} autoFocus rows={2} style={{ width: "100%", fontFamily: "'Inter',sans-serif", fontSize: 13, color: "#3a1c14", border: "1px solid #e6dccd", borderRadius: 7, padding: "6px 8px", outline: "none", resize: "vertical", background: "#fff" }} />
                                          <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                                            <button type="button" onClick={() => setEditingJournalId(null)} style={{ fontFamily: FONT_MONO, fontSize: 9, textTransform: "uppercase" as const, letterSpacing: ".04em", background: "transparent", border: "none", color: "#a89a8a", cursor: "pointer" }}>Cancel</button>
                                            <button type="button" onClick={async () => { if (!editingJournalText.trim()) return; await updateJournalEntry(entry.id, editingJournalText.trim()); setEditingJournalId(null); }} style={{ fontFamily: FONT_MONO, fontSize: 9, textTransform: "uppercase" as const, letterSpacing: ".04em", background: burgundy, color: "#fff", border: "none", borderRadius: 6, padding: "5px 11px", cursor: "pointer" }}>Save</button>
                                          </div>
                                        </div>
                                      ) : (
                                        <>
                                          <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: "#4a3c30", lineHeight: 1.48, whiteSpace: "pre-wrap" }}>{entry.entryText}</div>
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
                              </EdgeFadeScroll>
                              {/* composer — pinned to the column foot */}
                              <div style={{ marginTop: 12, background: "#fffdf9", border: "1px solid #e6dccd", borderRadius: 10, padding: "9px 10px 9px 13px", display: "flex", alignItems: "flex-end", gap: 9, boxShadow: "0 1px 2px rgba(58,28,20,0.04)", flexShrink: 0 }}>
                                <textarea
                                  value={journalInput} rows={1} placeholder="Write a note…"
                                  onChange={(e) => { setJournalInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }}
                                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); (e.target as HTMLTextAreaElement).style.height = "auto"; } }}
                                  style={{ flex: 1, border: "none", outline: "none", background: "transparent", resize: "none", fontFamily: "'Inter',sans-serif", fontSize: 13, color: "#3a1c14", lineHeight: 1.4, minHeight: 20, maxHeight: 120, padding: "4px 0", overflowY: "auto" }}
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
              /* No selection — placeholder fills the pane; the command bar does NOT render (Phase 2). */
              <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 32, color: "#9c8878" }}>
                <Notebook style={{ width: 48, height: 48, color: "rgba(124,58,42,.2)", marginBottom: 8 }} />
                <span>Select a query to open the reading pane.</span>
              </div>
            )}
          </div>{/* closes qp-pane */}

          {/* ── Control ROW — two floating cards sharing the workspace column-gap (ref
              queries-hub-stripped.html): a centred LIST card (col 1) beside the QUERY action ribbon
              (col 2). Both keep the strip-back floating-card treatment (--qp-cmd-* surface / border /
              radius / margin / shadow). The single subgrid bar is retired. ── */}
          <style>{`
            .qp-c:hover:not(:disabled){ background: #f3ede4; }
            .qp-menuitem:hover:not(:disabled){ background: rgba(58,44,31,.06); }
          `}</style>

          {/* (The foot control-row cards are retired — the F12 control bar at the top of the
              page carries every action; the list pane's own footer carries count + Export CSV.) */}

        </div>{/* closes f12-body */}
        </>
        )}

        </div>{/* closes the F12 work-area column */}
      </div>{/* closes main container */}

    {activeQuery && (
      <RecordResponseModal
        isOpen={isRecordResponseModalOpen}
        onClose={() => setIsRecordResponseModalOpen(false)}
        query={activeQuery}
        agent={{
          name: (activeAgent ? agentPrimary(activeAgent) : "") || "the agent",
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
        onClose={() => { setIsRecordResponseFocusFormOpen(false); setRichInitialType(undefined); setRichInitialDraft(undefined); }}
        query={activeQuery}
        agent={activeAgent}
        manuscript={{ title: activeMs?.title || "" }}
        initialResponseType={richInitialType}
        initialDraft={richInitialDraft}
        onSuccessToast={(msg) => {
          triggerToast({ queryId: activeQuery.id, agentName: agentPrimary(activeAgent), manuscriptTitle: activeMs?.title || "", responseStyle: msg });
        }}
      />
    )}

    {/* Nudge — the ribbon's Nudge tile (writer waiting on the agent). Mirrors the dashboard mount:
        NudgeModal collects the check-back + note and logs via the isolated logNudge path. */}
    {isNudgeOpen && activeQuery && activeAgent && (
      <NudgeModal
        agentName={agentPrimary(activeAgent) || null}
        agency={activeAgent.name?.trim() ? activeAgent.agency || "" : ""}
        dateSent={activeQuery.dateSent}
        responseDeadline={activeQuery.responseDeadline}
        onClose={() => setIsNudgeOpen(false)}
        onConfirm={async ({ checkBackDate, note }) => {
          await logNudge(activeQuery.id, { checkBackDate, note });
          setIsNudgeOpen(false);
        }}
        onCloseInstead={() => { setIsNudgeOpen(false); setIsCloseMenuOpen(true); }}
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
    </F12Page>
  );
};
