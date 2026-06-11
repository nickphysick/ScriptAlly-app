/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Single canonical path for recording an agent's response to a query.
 *
 * This module is the ONE place that turns a RecordResponseModal submission into
 * Firestore writes. Every surface that records a response — the Queries page, the
 * Dashboard, the Queries landing page — calls `recordQueryResponse` so behaviour
 * (status fields, timeline activity, Fortnight-in-Focus date fields, undo) can never
 * drift between screens again.
 *
 * It writes to two activity stores intentionally:
 *   - users/{uid}/queries/{queryId}/activity  → the per-query timeline (Queries page)
 *   - users/{uid}/activity                     → the global feed (Dashboard timeline)
 * Only the per-query write is fatal; the global feed and the agent-preference write
 * are best-effort and never block the undo toast.
 */
import {
  doc,
  collection,
  updateDoc,
  setDoc,
  deleteDoc,
  deleteField,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "./firebase";
import { QueryStatus, ActivityType } from "../types";

/** Shape of the payload produced by RecordResponseModal.onSave. */
export interface RecordResponseData {
  responseType: "partial" | "full" | "rr" | "offer" | "rejected" | "close";
  materialsType: "Pages" | "Words" | "Chapters" | "Other";
  materialsQuantity: number;
  materialsOtherText: string;
  expectedBy: string;
  sendReminderDate: string;
  /** #4 — when the response actually arrived (defaults today, user-editable). Drives responseReceivedAt. */
  dateReceived: string;
  /** #2 — Revise & Resubmit: the agent's revision guidance. */
  rrNotes: string;
  feedbackType: "Yes" | "No" | "Form";
  feedbackText: string;
  privateReflection: string;
  rejectionLesson: string;
  requeryPreference: "yes" | "maybe" | "no" | "";
  offerDate: string;
  offerDeadline: string;
  offerNotes: string;
  closingReason:
    | "No response after expected window"
    | "Withdrew my submission"
    | "Agent no longer accepting queries"
    | "Other";
  closingNotes: string;
}

export interface RecordResponseDeps {
  userId: string;
  /** The current query document (must include id, status, agentId, manuscriptId, sendMethod and any fields to snapshot for undo). */
  query: any;
  agent: { id?: string; name?: string; agency?: string; requeryPreference?: any; responseTimeWeeks?: number } | null;
  manuscript: { title?: string } | null;
}

export interface RecordResponseResult {
  newStatus: QueryStatus;
  /** Config for the host's undo toast. */
  toastConfig: {
    queryId: string;
    agentName: string;
    manuscriptTitle: string;
    responseStyle: string;
  };
  /** Reverts every write this call performed. Safe to call once. */
  undo: () => Promise<void>;
}

const STATUS_MAP: Record<string, QueryStatus> = {
  partialRequested: QueryStatus.PARTIAL_REQUESTED,
  fullRequested: QueryStatus.FULL_REQUESTED,
  reviseAndResubmit: QueryStatus.REVISE_RESUBMIT,
  offer: QueryStatus.OFFER,
  rejected: QueryStatus.REJECTED,
  noResponse: QueryStatus.NO_RESPONSE,
};

const getTimestamp = (val: string) => {
  if (!val || val.trim() === "") return undefined;
  return Timestamp.fromDate(new Date(val));
};

/**
 * Normalises a snapshot value (which may be a live Timestamp, a JSON-cloned
 * {seconds,nanoseconds} plain object, or an ISO string) back into something
 * Firestore can store. Returns undefined when there's nothing to restore.
 */
const convertToTimestampOrDate = (val: any) => {
  if (!val) return undefined;
  if (typeof val === "object") {
    if (typeof val.seconds === "number") {
      return new Timestamp(val.seconds, val.nanoseconds || 0);
    }
    if (typeof val._seconds === "number") {
      return new Timestamp(val._seconds, val._nanoseconds || 0);
    }
  }
  if (typeof val === "string") {
    return Timestamp.fromDate(new Date(val));
  }
  return val;
};

/**
 * Performs the canonical writes for recording a response and returns an `undo`
 * closure plus the toast config. Throws only if the PRIMARY write (the status
 * update + per-query timeline entry) fails — in that case nothing is left
 * half-applied and the caller should surface the error.
 */
export async function recordQueryResponse(
  deps: RecordResponseDeps,
  data: RecordResponseData
): Promise<RecordResponseResult> {
  const { userId, query, agent, manuscript } = deps;
  const queryId = query.id;
  const queryRef = doc(db, "users", userId, "queries", queryId);

  // 1. Map the modal payload to status + per-status fields.
  let selectedResponseType = "";
  let materialsRequestedType: string | undefined;
  let materialsRequestedQuantity: any = undefined;
  let expectedSendDate: any = undefined;
  let sendReminderDate: any = undefined;
  let rrNotes: string | undefined;

  let rejectionFeedbackType: string | undefined;
  let rejectionFeedbackText: string | undefined;
  let rejectionReflection: string | undefined;
  let rejectionLesson: string | undefined;
  let rejectedFromStatus: QueryStatus | undefined;

  let offerDate: any = undefined;
  let offerResponseDeadline: any = undefined;
  let offerNotes: string | undefined;

  let closingReason: string | undefined;
  let closingNotes: string | undefined;

  if (data.responseType === "partial" || data.responseType === "full") {
    selectedResponseType = data.responseType === "partial" ? "partialRequested" : "fullRequested";

    materialsRequestedType = data.materialsType.toLowerCase();
    materialsRequestedQuantity =
      data.materialsType === "Other" ? data.materialsOtherText?.trim() : String(data.materialsQuantity ?? "").trim();

    expectedSendDate = getTimestamp(data.expectedBy);
    sendReminderDate = getTimestamp(data.sendReminderDate);
  } else if (data.responseType === "rr") {
    // Revise & Resubmit captures the agent's revision guidance + a self-reminder to resubmit —
    // not a page count, so it writes none of the materialsRequested*/expectedSendDate fields.
    selectedResponseType = "reviseAndResubmit";
    if (data.rrNotes && data.rrNotes.trim() !== "") rrNotes = data.rrNotes.trim();
    sendReminderDate = getTimestamp(data.sendReminderDate);
  } else if (data.responseType === "rejected") {
    selectedResponseType = "rejected";
    if (data.feedbackType === "Yes") rejectionFeedbackType = "detailed";
    else if (data.feedbackType === "No") rejectionFeedbackType = "standard";
    else rejectionFeedbackType = "form";

    if (data.feedbackType === "Yes" && data.feedbackText && data.feedbackText.trim() !== "") {
      rejectionFeedbackText = data.feedbackText;
    }
    if (data.privateReflection && data.privateReflection.trim() !== "") {
      rejectionReflection = data.privateReflection;
    }
    if (data.rejectionLesson && data.rejectionLesson.trim() !== "") {
      rejectionLesson = data.rejectionLesson;
    }
    if (query.status && query.status !== QueryStatus.QUERIED) {
      rejectedFromStatus = query.status;
    }
  } else if (data.responseType === "offer") {
    selectedResponseType = "offer";
    offerDate = getTimestamp(data.offerDate) || Timestamp.now();
    offerResponseDeadline = getTimestamp(data.offerDeadline);
    if (data.offerNotes && data.offerNotes.trim() !== "") {
      offerNotes = data.offerNotes;
    }
  } else if (data.responseType === "close") {
    selectedResponseType = "noResponse";
    if (data.closingReason === "No response after expected window") closingReason = "noResponseAfterWindow";
    else if (data.closingReason === "Withdrew my submission") closingReason = "withdrew";
    else if (data.closingReason === "Agent no longer accepting queries") closingReason = "agentClosedSubmissions";
    else closingReason = "other";
    if (data.closingNotes && data.closingNotes.trim() !== "") {
      closingNotes = data.closingNotes;
    }
  }

  let newStatus = STATUS_MAP[selectedResponseType];
  if (selectedResponseType === "noResponse" && closingReason === "withdrew") {
    newStatus = QueryStatus.WITHDRAWN;
  }
  if (!newStatus) {
    throw new Error(`Unknown response type: ${selectedResponseType}`);
  }

  // 2. Build the query document update. These date fields are what the Dashboard's
  //    Fortnight-in-Focus derives from, so writing them here is what keeps it in sync.
  const updates: Record<string, any> = {
    status: newStatus,
    // lastStatusChange = when you recorded it (audit). responseReceivedAt = when the response
    // actually arrived — user-editable via dateReceived (partial/full/rejected), defaulting today;
    // falls back to now for branches that don't capture it (offer uses offerDate; close has none).
    // Either way responseReceivedAt is ALWAYS stamped — only its value source changes.
    lastStatusChange: serverTimestamp(),
    responseReceivedAt: getTimestamp(data.dateReceived) || serverTimestamp(),
  };

  if (newStatus === QueryStatus.PARTIAL_REQUESTED) {
    updates.partialRequestedDate = new Date().toISOString();
  } else if (newStatus === QueryStatus.FULL_REQUESTED) {
    updates.fullRequestedDate = new Date().toISOString();
  }

  updates.materialsRequestedType = materialsRequestedType !== undefined ? materialsRequestedType : deleteField();
  updates.materialsRequestedQuantity = materialsRequestedQuantity !== undefined ? materialsRequestedQuantity : deleteField();
  updates.expectedSendDate = expectedSendDate !== undefined ? expectedSendDate : deleteField();
  updates.sendReminderDate = sendReminderDate !== undefined ? sendReminderDate : deleteField();

  updates.rrNotes = rrNotes !== undefined ? rrNotes : deleteField();

  updates.rejectionFeedbackType = rejectionFeedbackType !== undefined ? rejectionFeedbackType : deleteField();
  updates.rejectionFeedbackText = rejectionFeedbackText !== undefined ? rejectionFeedbackText : deleteField();
  updates.rejectionReflection = rejectionReflection !== undefined ? rejectionReflection : deleteField();
  updates.rejectionLesson = rejectionLesson !== undefined ? rejectionLesson : deleteField();
  updates.rejectedFromStatus = rejectedFromStatus !== undefined ? rejectedFromStatus : deleteField();

  updates.offerDate = offerDate !== undefined ? offerDate : deleteField();
  updates.offerResponseDeadline = offerResponseDeadline !== undefined ? offerResponseDeadline : deleteField();
  updates.offerNotes = offerNotes !== undefined ? offerNotes : deleteField();

  updates.closingReason = closingReason !== undefined ? closingReason : deleteField();
  updates.closingNotes = closingNotes !== undefined ? closingNotes : deleteField();

  // 3. Snapshot the query for undo, and reserve the activity doc references up front
  //    so undo can delete exactly what we wrote.
  const preSnapshot = JSON.parse(JSON.stringify(query));
  const activityDocRef = doc(collection(db, `users/${userId}/queries/${queryId}/activity`));

  // 4. Human-readable timeline note.
  const activityNote = buildActivityNote(newStatus, {
    sendMethod: query.sendMethod,
    materialsRequestedType,
    materialsRequestedQuantity,
    rejectionFeedbackType,
    rejectedFromStatus,
  });

  const activityPayload: any = {
    type: newStatus,
    createdAt: serverTimestamp(),
    note: activityNote,
    queryId,
    agentName: agent?.name || "The agent",
    manuscriptTitle: manuscript?.title || "",
  };
  if (newStatus === QueryStatus.PARTIAL_REQUESTED || newStatus === QueryStatus.FULL_REQUESTED) {
    if (materialsRequestedType) activityPayload.materialsType = materialsRequestedType;
    if (materialsRequestedQuantity) activityPayload.materialsQuantity = String(materialsRequestedQuantity);
  }
  if (newStatus === QueryStatus.REJECTED && rejectionFeedbackType) {
    activityPayload.feedbackType = rejectionFeedbackType;
  }

  // 5. PRIMARY write — must succeed. Status + per-query timeline entry.
  try {
    await updateDoc(queryRef, updates);
    await setDoc(activityDocRef, activityPayload);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${userId}/queries/${queryId}`);
    throw err;
  }

  // 6. SECONDARY write — best-effort. Failures here must never block undo.
  //
  // The global `activities` collection is the ONE store the dashboard feed (mergedActivities)
  // and the slide-in panel timeline both read. We write the event here exactly once. We must NOT
  // also write the top-level `users/{uid}/activity` feed — the dashboard merges both collections
  // and de-dupes only on document id, so writing both produced two rows for one event.
  const legacyActivityRef = doc(collection(db, `users/${userId}/activities`));
  let legacyWritten = true;
  try {
    const { description, details } = buildLegacyActivity(newStatus, agent);
    await setDoc(legacyActivityRef, {
      id: legacyActivityRef.id,
      userId,
      queryId,
      manuscriptId: query.manuscriptId || "",
      activityType: ActivityType.STATUS_CHANGED,
      description,
      date: new Date().toISOString(),
      details,
    });
  } catch (err) {
    console.error("Legacy activity write failed (non-fatal):", err);
    legacyWritten = false;
  }

  let agentRequeryUndo: { agentId: string; previous: any } | null = null;
  if (data.responseType === "rejected" && data.requeryPreference && agent?.id) {
    try {
      agentRequeryUndo = { agentId: agent.id, previous: agent.requeryPreference ?? null };
      await updateDoc(doc(db, `users/${userId}/agents/${agent.id}`), {
        requeryPreference: data.requeryPreference,
      });
    } catch (err) {
      console.error("Agent requery-preference write failed (non-fatal):", err);
      agentRequeryUndo = null;
    }
  }

  // 7. Build the undo closure that reverts exactly what was written.
  const undo = async () => {
    const revertData = {
      status: preSnapshot.status,
      lastStatusChange: convertToTimestampOrDate(preSnapshot.lastStatusChange) ?? deleteField(),
      responseReceivedAt: convertToTimestampOrDate(preSnapshot.responseReceivedAt) ?? deleteField(),
      partialRequestedDate: preSnapshot.partialRequestedDate ?? deleteField(),
      fullRequestedDate: preSnapshot.fullRequestedDate ?? deleteField(),
      materialsRequestedType: preSnapshot.materialsRequestedType ?? deleteField(),
      materialsRequestedQuantity: preSnapshot.materialsRequestedQuantity ?? deleteField(),
      expectedSendDate: convertToTimestampOrDate(preSnapshot.expectedSendDate) ?? deleteField(),
      sendReminderDate: convertToTimestampOrDate(preSnapshot.sendReminderDate) ?? deleteField(),
      rrNotes: preSnapshot.rrNotes ?? deleteField(),
      rejectionFeedbackType: preSnapshot.rejectionFeedbackType ?? deleteField(),
      rejectionFeedbackText: preSnapshot.rejectionFeedbackText ?? deleteField(),
      rejectionReflection: preSnapshot.rejectionReflection ?? deleteField(),
      rejectionLesson: preSnapshot.rejectionLesson ?? deleteField(),
      rejectedFromStatus: preSnapshot.rejectedFromStatus ?? deleteField(),
      offerDate: convertToTimestampOrDate(preSnapshot.offerDate) ?? deleteField(),
      offerResponseDeadline: convertToTimestampOrDate(preSnapshot.offerResponseDeadline) ?? deleteField(),
      offerNotes: preSnapshot.offerNotes ?? deleteField(),
      closingReason: preSnapshot.closingReason ?? deleteField(),
      closingNotes: preSnapshot.closingNotes ?? deleteField(),
    };

    await Promise.all([
      updateDoc(queryRef, revertData),
      deleteDoc(activityDocRef),
      legacyWritten ? deleteDoc(legacyActivityRef) : Promise.resolve(),
      agentRequeryUndo
        ? updateDoc(doc(db, `users/${userId}/agents/${agentRequeryUndo.agentId}`), {
            requeryPreference: agentRequeryUndo.previous ?? deleteField(),
          })
        : Promise.resolve(),
    ]);
  };

  return {
    newStatus,
    toastConfig: {
      queryId,
      agentName: agent?.name || "The agent",
      manuscriptTitle: manuscript?.title || "",
      responseStyle: data.responseType,
    },
    undo,
  };
}

/**
 * Builds the description/details for the legacy global `activities` doc, mirroring the strings
 * the old updateQueryStatus produced so the slide-in panel's timeline renders them correctly.
 */
function buildLegacyActivity(
  newStatus: QueryStatus,
  agent: { name?: string; agency?: string; responseTimeWeeks?: number } | null
): { description: string; details: string } {
  const name = agent?.name || "The agent";
  const agency = agent?.agency || "agency";

  const respondBy = () => {
    const weeks = agent?.responseTimeWeeks ?? 6;
    const d = new Date();
    d.setDate(d.getDate() + weeks * 7);
    return `Respond by ${d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
  };

  switch (newStatus) {
    case QueryStatus.PARTIAL_REQUESTED:
      return { description: `${name} at ${agency} requested a partial manuscript`, details: respondBy() };
    case QueryStatus.FULL_REQUESTED:
      return { description: `${name} at ${agency} requested a full manuscript`, details: respondBy() };
    case QueryStatus.REVISE_RESUBMIT:
      return { description: `Revise & Resubmit request received from ${name} at ${agency}`, details: respondBy() };
    case QueryStatus.OFFER:
      return {
        description: `Congratulations! You've received an offer of representation from ${name} at ${agency}!`,
        details: respondBy(),
      };
    case QueryStatus.REJECTED:
      return { description: `Rejection received from ${name} at ${agency}`, details: "" };
    case QueryStatus.WITHDRAWN:
      return { description: `Query to ${name} at ${agency} withdrawn`, details: "" };
    case QueryStatus.NO_RESPONSE:
      return { description: `Query to ${name} at ${agency} closed — no response`, details: "" };
    default:
      return { description: `Status updated to ${newStatus}`, details: "" };
  }
}

function buildActivityNote(
  newStatus: QueryStatus,
  ctx: {
    sendMethod?: string;
    materialsRequestedType?: string;
    materialsRequestedQuantity?: any;
    rejectionFeedbackType?: string;
    rejectedFromStatus?: QueryStatus;
  }
): string {
  switch (newStatus) {
    case QueryStatus.QUERIED:
      return `Query sent via ${ctx.sendMethod || "Email"}`;
    case QueryStatus.PARTIAL_REQUESTED:
      return ctx.materialsRequestedQuantity
        ? `Partial manuscript requested — ${ctx.materialsRequestedQuantity} ${ctx.materialsRequestedType || "pages"}`
        : "Partial manuscript requested";
    case QueryStatus.PARTIAL_SENT:
      return "Partial manuscript sent";
    case QueryStatus.FULL_REQUESTED:
      return ctx.materialsRequestedQuantity
        ? `Full manuscript requested — ${ctx.materialsRequestedQuantity} ${ctx.materialsRequestedType || "pages"}`
        : "Full manuscript requested";
    case QueryStatus.FULL_SENT:
      return "Full manuscript sent";
    case QueryStatus.REVISE_RESUBMIT:
      return "Revise & resubmit requested";
    case QueryStatus.OFFER:
      return "Offer of representation received";
    case QueryStatus.REJECTED: {
      let feedbackStr = "";
      if (ctx.rejectionFeedbackType === "detailed") feedbackStr = " — detailed feedback recorded";
      else if (ctx.rejectionFeedbackType === "standard") feedbackStr = " — standard rejection";
      else if (ctx.rejectionFeedbackType === "form") feedbackStr = " — form rejection";

      let rejectedPrefix = "Query rejected";
      if (ctx.rejectedFromStatus === QueryStatus.FULL_REQUESTED || ctx.rejectedFromStatus === QueryStatus.FULL_SENT) {
        rejectedPrefix = "Full manuscript declined";
      } else if (
        ctx.rejectedFromStatus === QueryStatus.PARTIAL_REQUESTED ||
        ctx.rejectedFromStatus === QueryStatus.PARTIAL_SENT
      ) {
        rejectedPrefix = "Partial declined";
      } else if (ctx.rejectedFromStatus === QueryStatus.REVISE_RESUBMIT) {
        rejectedPrefix = "R&R declined";
      }
      return `${rejectedPrefix}${feedbackStr}`;
    }
    case QueryStatus.WITHDRAWN:
      return "Query withdrawn";
    case QueryStatus.NO_RESPONSE:
      return "Query closed — no response";
    default:
      return "";
  }
}
