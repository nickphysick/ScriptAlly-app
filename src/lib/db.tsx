/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import {
  User,
  UserPlan,
  SmartImportUsage,
  Manuscript,
  ManuscriptStatus,
  ManuscriptVersion,
  ComponentType,
  SubmissionPackage,
  Agent,
  SubmissionStatus,
  SubmissionMethod,
  Query,
  QueryStatus,
  Activity,
  ActivityType,
  JournalEntry,
  Note,
  UserTask,
  SurfaceOffset,
  DismissedTask,
  TaskFlag,
  Task,
  CommunityAgent
} from "../types";

import {
  seedManuscripts,
  seedVersions,
  seedPackages,
  seedAgents,
  seedQueries,
  seedActivities,
  seedJournalEntries
} from "./seeds";

import { seedCommunityAgentsIfEmpty, localSeedCommunityAgents } from "./seedCommunityAgents";

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged
} from "firebase/auth";

import {
  doc,
  setDoc as _setDoc,
  getDoc,
  getDocFromServer,
  updateDoc as _updateDoc,
  deleteDoc as _deleteDoc,
  collection,
  onSnapshot,
  getDocs,
  deleteField,
  writeBatch as _writeBatch,
  Timestamp,
  serverTimestamp,
  type DocumentReference
} from "firebase/firestore";

import { tracked, trackWrite } from "./saveSignal";

/* ⚠️ THE WRITE PRIMITIVES ARE INSTRUMENTED AT THE IMPORT BOUNDARY, not at their call sites. The
   bar's status whisper must never claim "saved" while a write is in the air, and this file makes
   roughly a hundred writes — aliasing the four primitives once catches every one of them without
   editing (or missing) a single call. Reads are deliberately NOT tracked: fetching is not saving,
   and a whisper that said "Saving…" while a list loaded would be lying in the other direction.

   `writeBatch` is wrapped by its COMMIT, because a batch is one write when it commits and no
   write at all if it is built and abandoned. */
const setDoc: typeof _setDoc = tracked(_setDoc) as typeof _setDoc;
const updateDoc: typeof _updateDoc = tracked(_updateDoc) as typeof _updateDoc;
const deleteDoc: typeof _deleteDoc = tracked(_deleteDoc as (...a: unknown[]) => Promise<void>) as typeof _deleteDoc;
const writeBatch: typeof _writeBatch = ((...args: Parameters<typeof _writeBatch>) => {
  const batch = _writeBatch(...args);
  const commit = batch.commit.bind(batch);
  batch.commit = () => trackWrite(commit());
  return batch;
}) as typeof _writeBatch;

import { db, auth, handleFirestoreError, OperationType } from "./firebase";
import { TodoWriteError, classifyWriteError } from "./todoWrite";
import { deriveQueryFields, getActivityTime, normalizeResultingStatus } from "./queryDerivation";
import { queriesForManuscript, queriesForAgent, activityIdsForQueries, flagIdsForCascade, cascadePlan, chunkArray } from "./cascade";
import { recomputeQuery as recomputeQueryOnline, subcollectionDocToDerivable, monotonicEventTime } from "./recomputeQuery";
import { buildNudgeWrites, reconcileNudge, NUDGE_NESTED_TYPE, type StoredNudge } from "./logNudge";
import { resolveGenre, matchKey } from "./genres";
import { commitAgentEdits, AgentEditPatch, AgentExtraWrite, SaveAgentResult } from "./saveAgentEdits";
import { computeAgentDeadlineWrites } from "./computeAgentDeadlineWrites";
import { computeResponseDeadline } from "./responseDeadline";
import { writerExpectedWrite, WRITER_EXPECTED_FIELD, WRITER_EXPECTED_SET_AT_FIELD } from "./expectedDate";
import { buildHoldingReplyWrites, HOLDING_REPLY_TYPE } from "./holdingReply";
/* §1 (provenance pack) — the one-time move of the expected date into the field that names its owner. */
import { planExpectedDateMigration, type MigrationQuery } from "./expectedDate";
import { replyTask } from "./taskPrecedence";
/* §3 — the suggestion's wording and its suppression both need these: `scheduledReminder` is the
   same predicate the tracker's ghost rung uses, and `elapsedPhrase` is the app's one scaled figure. */
import { scheduledReminder } from "./nudgeState";
import { elapsedPhrase, daysBetween } from "./elapsed";
import { TaskFlagKey, taskFlagId, flagKeyForTask, flagMatchesTask, isFlagSuppressing, buildTaskFlagFromDismissed } from "./taskFlags";
import { homeCountrySeed } from "./territory";
import { agentDataQualityNeeds } from "./agentDataQuality";
import { queriesMissingMaterials, isBulkMaterialsGap, MATERIALS_BULK_RECORD_ID } from "./queryMaterialsGap";
import { agentPrimary } from "./agentDisplay";
import { taskSurvivesMute } from "./todoHousekeeping";
import { buildOfferDecisionWrites, hasOfferDecision, OfferDecision } from "./offerDecision";

// Connection validation test on boot as requested by skill
async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error("Please check your Firebase configuration; offline mode triggered.");
    }
  }
}
testConnection();

/**
 * Single source of truth for the MATERIALS_SENT activity description. Used by both
 * updateQueryStatus (sequence skips + direct change) and recordMaterialsSent so the timeline
 * wording can never diverge. A resubmission reads "Revised manuscript (v2) resubmitted to …".
 */
function materialsSentDescription(
  targetStatus: QueryStatus,
  agent: { name?: string; agency?: string } | undefined,
  opts?: { resubmit?: boolean; round?: number }
): string {
  const name = agent?.name || "the agent";
  const agency = agent?.agency || "agency";
  if (opts?.resubmit) {
    return `Revised manuscript (v${opts.round ?? 2}) resubmitted to ${name} at ${agency}`;
  }
  if (targetStatus === QueryStatus.PARTIAL_SENT) {
    return `Partial manuscript sent to ${name} at ${agency}`;
  }
  return `Full manuscript sent to ${name} at ${agency}`;
}

/**
 * Human-readable note for a status-reconstruction log entry — used when seeding the per-query
 * log for an advanced-status import (addQuery) and when healing a query with an empty
 * authoritative log (backfill). The note is display text only; derivation reads the stamped
 * `resultingStatus`, never this string.
 */
function statusReconstructionNote(status: QueryStatus): string {
  switch (status) {
    case QueryStatus.PARTIAL_REQUESTED: return "Partial manuscript requested";
    case QueryStatus.PARTIAL_SENT:      return "Partial manuscript sent";
    case QueryStatus.FULL_REQUESTED:    return "Full manuscript requested";
    case QueryStatus.FULL_SENT:         return "Full manuscript sent";
    case QueryStatus.REVISE_RESUBMIT:   return "Revise & resubmit requested";
    case QueryStatus.OFFER:             return "Offer of representation received";
    case QueryStatus.REJECTED:          return "Rejection received";
    case QueryStatus.WITHDRAWN:         return "Query withdrawn";
    case QueryStatus.NO_RESPONSE:       return "Query closed — no response";
    default:                            return "Query sent";
  }
}

function formatHumanDate(dateInput: string | Date | undefined): string {
  if (!dateInput) return "unknown date";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "unknown date";
  
  const day = d.getDate();
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

interface DbContextType {
  currentUser: User | null;
  smartImportUsage: SmartImportUsage | null;
  authReady: boolean;
  collectionsReady: boolean;
  manuscripts: Manuscript[];
  versions: ManuscriptVersion[];
  packages: SubmissionPackage[];
  agents: Agent[];
  communityAgents: CommunityAgent[];
  queries: Query[];
  activities: Activity[];
  journalEntries: JournalEntry[];
  notes: Note[];
  dismissedTasks: DismissedTask[];
  // The user's stance on derived tasks (snooze/commit/skip/resolve). Absorbs dismissedTasks.
  taskFlags: TaskFlag[];
  upsertTaskFlag: (key: TaskFlagKey, patch: { snoozedUntil?: string | null; committedDate?: string | null; skippedAt?: string | null; resolvedAt?: string | null; bumpSnooze?: boolean; unbumpSnooze?: boolean }) => Promise<void>;
  snoozeTaskFlag: (key: TaskFlagKey, days: number) => Promise<void>;
  resolveTaskFlag: (key: TaskFlagKey) => Promise<void>;
  migrateDismissedTasks: () => Promise<number>;
  tasks: Task[];
  login: (email: string, password?: string) => Promise<boolean>;
  signup: (name: string, email: string, password?: string) => Promise<boolean>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  // ⚠️ NO upgradeToPro / downgradeToFree, DELIBERATELY. They wrote `plan` straight from the
  // browser, and `plan` is no longer in the rules' user-update allowlist — so re-adding them
  // would produce a silent permission denial rather than an upgrade. A plan change is a billing
  // event and needs a server with a payment processor behind it.

  // Manuscript Actions
  addManuscript: (m: Omit<Manuscript, "id" | "userId" | "statusChangedDate"> & { id?: string }, bypassLimits?: boolean) => Promise<{ success: boolean; error?: string; id?: string }>;
  updateManuscript: (id: string, fields: Partial<Manuscript>) => Promise<void>;
  /**
   * The same write with NO activity entry. `updateManuscript` appends a MANUSCRIPT_UPDATED
   * ("You updated a manuscript's details") on every call, which is right for a details edit and
   * wrong for field maintenance: inline plate editing and the pitch shelf would put three identical
   * entries in the global feed for one writer polishing a blurb three times. The feed records the
   * QUERY JOURNEY, not keystrokes. Precedent: `setActivePackage`, a few lines below.
   *
   * ⚠️ ADDITIVE — `updateManuscript` is untouched and still owns every edit that IS an event.
   */
  updateManuscriptQuiet: (id: string, fields: Partial<Manuscript>) => Promise<void>;
  deleteManuscript: (id: string) => Promise<void>;
  /** Shelve/reactivate — a reversible lifecycle overlay (hides from picker/suggestions; keeps everything). */
  setManuscriptShelved: (id: string, shelved: boolean) => Promise<void>;
  
  // Version Actions
  addVersion: (v: Omit<ManuscriptVersion, "id" | "userId" | "createdDate">) => Promise<string>;
  /** `unknown` values so a mode switch can pass `deleteField()` to UNSET rather than write a zero. */
  updateVersion: (id: string, fields: Partial<Record<"versionName" | "contentDraft" | "fileAttached" | "fileName" | "notes" | "contentType" | "contentLink" | "wordCount", unknown>>) => Promise<void>;
  deleteVersion: (id: string) => Promise<void>;

  // Package Actions
  addPackage: (p: Omit<SubmissionPackage, "id" | "userId" | "status" | "createdDate">) => Promise<{ success: boolean; error?: string; id?: string }>;
  updatePackage: (id: string, fields: Partial<Pick<SubmissionPackage, "packageName" | "queryLetterVersionId" | "synopsisVersionId" | "samplePagesVersionId">>) => Promise<void>;
  retirePackage: (id: string) => Promise<void>;
  // The user-chosen active package for a manuscript (single writer — one field, last write wins).
  // Pass "" to clear. Pre-fills packageId on newly logged queries; never auto-set by the app.
  setActivePackage: (manuscriptId: string, packageId: string) => Promise<void>;
  
  // Agent Actions
  addAgent: (a: Omit<Agent, "id" | "userId" | "dateAdded" | "lastCheckedDate"> & { id?: string }, bypassLimits?: boolean) => Promise<{ success: boolean; error?: string; id?: string }>;
  updateAgent: (id: string, fields: Partial<Agent>) => Promise<void>;
  saveAgentEdits: (agentId: string, patch: AgentEditPatch, extraWrites?: AgentExtraWrite[]) => Promise<SaveAgentResult>;
  deleteAgent: (id: string) => Promise<void>;
  /** Set aside / bring back — reversible: drops from suggestions + idle bucket, keeps queries/history. */
  setAgentSetAside: (id: string, setAside: boolean) => Promise<void>;
  
  // Query Actions
  addQuery: (q: Omit<Query, "id" | "userId" | "status" | "dateSent" | "responseDeadline" | "nudgeDate"> & { status?: QueryStatus; dateSent?: string; id?: string }, bypassLimits?: boolean) => Promise<{ success: boolean; error?: string; id?: string }>;
  updateQueryStatus: (id: string, newStatus: QueryStatus, systemNotes?: string) => Promise<void>;
  /**
   * Writer-side "I've sent the materials" action (Partial Sent / Full Sent). Distinct from
   * recording an agent response: it never stamps responseReceivedAt and never counts as a
   * response. One MATERIALS_SENT activity is appended, reusing the same descriptions as
   * updateQueryStatus. A Revise & Resubmit → Full Sent bumps the display-only revisionRound.
   */
  recordMaterialsSent: (args: {
    queryId: string;
    targetStatus: QueryStatus.PARTIAL_SENT | QueryStatus.FULL_SENT;
    sentDate: string; // ISO
    isResubmit?: boolean;
    writerExpectedDate?: string; // ISO — optional; §2: the writer stating when they expect a reply
    nudgeDate?: string; // ISO — optional, set when a nudge reminder is chosen
  }) => Promise<void>;
  /** Phase 3 — a reply that decides nothing. Non-status by construction; see lib/holdingReply.ts. */
  recordHoldingReply: (
    queryId: string,
    input: { repliedOn: string; weeks?: number | null; note?: string },
  ) => Promise<{ success: boolean; error?: string; undo: () => Promise<void> }>;
  undoQueryStatus: (id: string, previousStatus: QueryStatus, newStatus: QueryStatus) => Promise<void>;
  updateQuery: (id: string, fields: Partial<Query>) => Promise<void>;
  deleteQuery: (id: string) => Promise<void>;
  
  // Journal Actions
  addJournalEntry: (queryId: string, entryText: string) => Promise<void>;
  deleteJournalEntry: (id: string) => Promise<void>;
  updateJournalEntry: (id: string, entryText: string) => Promise<void>;
  /** §1c — pin/unpin one note. Its own writer: see the note on the implementation. */
  pinJournalEntry: (id: string, pinned: boolean) => Promise<void>;

  // Note Actions (user-authored desk notes / dated tasks)
  addNote: (fields: { text: string; colour?: Note["colour"]; dueDate?: string | null }) => Promise<void>;
  // Genre taxonomy (src/lib/genres.ts): resolve a typed genre to a stored id, creating a personal
  // genre (on the user doc) + a promotion-queue entry only when nothing canonical/personal matches.
  addPersonalGenre: (rawLabel: string) => Promise<{ ok: true; id: string; label: string } | { ok: false; reason: string }>;
  updateNote: (id: string, fields: Partial<Pick<Note, "text" | "colour" | "dueDate" | "done" | "doneAt">>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  // To-do page Notes stream — the only stored to-do records.
  // User tasks — the canonical stored to-do object (record-scoped; read by the To-do board + the
  // per-record "View tasks" popovers). Badge counts stay derived.
  userTasks: UserTask[];
  addUserTask: (fields: { id?: string; text?: string; detail?: string; queryId?: string; agentId?: string; manuscriptId?: string; dueDate?: string; surfaceOffset?: SurfaceOffset; tags?: string[] }) => Promise<string | undefined>;
  updateUserTask: (id: string, fields: Partial<Pick<UserTask, "text" | "done" | "completedAt">> & { detail?: string | null; dueDate?: string | null; surfaceOffset?: SurfaceOffset | null; committedDate?: string | null; tags?: string[] | null; estimateMin?: number | null }) => Promise<void>;
  deleteUserTask: (id: string) => Promise<void>;

  // Activity Actions
  addActivity: (act: Omit<Activity, "id" | "userId"> & { id?: string }) => Promise<{ success: boolean; error?: string }>;
  deleteActivity: (id: string) => Promise<void>;
  /** Correction primitive: remove entries and return the closure that puts them back. */
  deleteActivities: (ids: string[]) => Promise<() => Promise<void>>;
  /** Correction primitive: patch an entry in a query's activity log, then recompute its derived fields. */
  editActivity: (
    queryId: string,
    activityId: string,
    patch: Partial<Pick<Activity, "description" | "details" | "date" | "resultingStatus">>
  ) => Promise<void>;

  // User Actions
  updateUserProfile: (fields: Partial<User>) => Promise<void>;
  
  // Task Actions
  dismissTask: (taskType: string, relatedRecordId: string, dismissType: "permanent" | "fixed snooze" | "custom date", snoozeDays?: number) => Promise<void>;
  /**
   * Log a nudge: writes a non-status NUDGE_SENT activity, sets nudgeDate (+ lastNudgeSentDate),
   * and hides-and-resurfaces the nudge_overdue task on the chosen check-back date. Never touches
   * status or responseDeadline and never counts as a response. (Distinct from dismissTask.)
   */
  logNudge: (queryId: string, args: { checkBackDate: string; note?: string; eventDate?: string }) => Promise<{ success: boolean; error?: string }>;
  recordOfferDecision: (queryId: string, decision: OfferDecision) => Promise<{ success: boolean; error?: string }>;

  // ⚠️ NO cleanDuplicates / wipeAndResetDatabase / seedUserDatabase. They backed two panels on the
  // /import page that were reachable by every signed-in user, with no plan, admin or DEV gate —
  // and /import is a direct onboarding exit. "Wipe & Recreate Data" deleted every document in nine
  // subcollections behind a single in-page toggle and replaced them with demo seed data; there was
  // no typed confirmation and no undo. A destructive account-wide operation needs a real guard
  // (ConfirmDestroy's manifest pattern) before it can exist again, not a red button.
}

const DbContext = createContext<DbContextType | undefined>(undefined);

export const DbProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  // Smart Import entitlement usage — read-only mirror of the admin-only subdoc
  // users/{uid}/private/entitlement (the client never writes it). null === not yet loaded / absent,
  // which the entitlement helper reads as "not used".
  const [smartImportUsage, setSmartImportUsage] = useState<SmartImportUsage | null>(null);
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [versions, setVersions] = useState<ManuscriptVersion[]>([]);
  const [packages, setPackages] = useState<SubmissionPackage[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [communityAgents, setCommunityAgents] = useState<CommunityAgent[]>([]);
  const [queries, setQueries] = useState<Query[]>([]);
  // Boot-state flags that drive the clean dashboard load:
  //  · authReady   — false until the first onAuthStateChanged resolves (and, for a signed-in user,
  //                  the user doc loads). While false the app shows a neutral splash, never the landing.
  //  · collectionsReady — false until the signed-in user's manuscripts, agents AND queries have each
  //                  delivered their first snapshot. Lets the dashboard tell "loading" from "empty".
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [collectionsReady, setCollectionsReady] = useState<boolean>(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [userTasks, setUserTasks] = useState<UserTask[]>([]);
  const [dismissedTasks, setDismissedTasks] = useState<DismissedTask[]>([]);
  const [taskFlags, setTaskFlags] = useState<TaskFlag[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  // Temporary buffer to retain signup pen names
  const signupTempNameRef = useRef<string | null>(null);

  // Synchronous database tracking in active real-time subscriber model
  useEffect(() => {
    let unsubUser: () => void = () => {};
    let unsubEntitlement: () => void = () => {};
    let unsubManuscripts: () => void = () => {};
    let unsubVersions: () => void = () => {};
    let unsubPackages: () => void = () => {};
    let unsubAgents: () => void = () => {};
    let unsubQueries: () => void = () => {};
    let unsubActivities: () => void = () => {};
    let unsubJournal: () => void = () => {};
    let unsubNotes: () => void = () => {};
    let unsubUserTasks: () => void = () => {};
    let unsubDismissed: () => void = () => {};
    let unsubTaskFlags: () => void = () => {};

    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        // No authenticated user — show the Auth screen
        setCurrentUser(null);
        setSmartImportUsage(null);
        setAuthReady(true);          // auth resolved: definitively logged out
        setCollectionsReady(false);  // next sign-in starts in the loading state
        try { localStorage.removeItem("scriptally_was_authed"); } catch {}

        // Clean up any active listeners
        unsubUser();
        unsubEntitlement();
        unsubManuscripts();
        unsubVersions();
        unsubPackages();
        unsubAgents();
        unsubQueries();
        unsubActivities();
        unsubJournal();
        unsubNotes();
        unsubDismissed();
        unsubTaskFlags();
        return;
      }

      const uid = firebaseUser.uid;

      // Track first-load of the collections the dashboard's empty-state depends on, so the UI can
      // tell "still loading" from "genuinely empty" (kills the empty-state flicker on boot).
      setCollectionsReady(false);
      let mLoaded = false, aLoaded = false, qLoaded = false;
      const markCollectionsLoaded = () => {
        if (mLoaded && aLoaded && qLoaded) setCollectionsReady(true);
      };

      // Seed community agents once after authenticated session is established. Writes are
      // admin-only (FINDING-1) — the helper no-ops for non-admin uids, so this only writes
      // when the admin signs in; everyone else just reads the already-populated pool.
      seedCommunityAgentsIfEmpty(uid).catch(err => {
        console.error("Error running community agents seeding check:", err);
      });

      try {
        const userDocRef = doc(db, "users", uid);
        let userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
          const emailPrefix = (firebaseUser.email || "").split("@")[0] || "Writer";
          const freshUser: User = {
            id: uid,
            name: signupTempNameRef.current || firebaseUser.displayName || emailPrefix,
            email: firebaseUser.email || "",
            plan: UserPlan.FREE,
            trialStartDate: new Date().toISOString(),
            subscriptionStatus: "trialing",
            onboardingComplete: false,
            // Silent home-market guess from the browser locale (never IP); omits the key when it can't
            // resolve so the stored value is never null/"" — getHomeCountry() covers absent at read time.
            ...homeCountrySeed(),
          };
          await setDoc(userDocRef, freshUser);
          signupTempNameRef.current = null;
        } else if (signupTempNameRef.current && userDoc.data()?.onboardingComplete === undefined) {
          await updateDoc(userDocRef, { onboardingComplete: false });
          signupTempNameRef.current = null;
        } else {
          signupTempNameRef.current = null;
        }

        // Active listener bindings for user document
        unsubUser = onSnapshot(userDocRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data() as User;
            setCurrentUser(data);
            setAuthReady(true); // auth resolved AND user doc loaded — safe to leave the splash
            try { localStorage.setItem("scriptally_was_authed", "1"); } catch {}
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${uid}`);
        });

        // Smart Import entitlement usage — read-only mirror of the admin-only subdoc. Absent doc
        // (never imported) → null, which reads as "not used". A read error must never hang anything;
        // the server gate is the real enforcement, so we just log and leave usage null.
        unsubEntitlement = onSnapshot(doc(db, "users", uid, "private", "entitlement"), (snap) => {
          setSmartImportUsage(snap.exists() ? (snap.data() as SmartImportUsage) : null);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${uid}/private/entitlement`);
        });

        // Manuscripts reader snap
        unsubManuscripts = onSnapshot(collection(db, "users", uid, "manuscripts"), (snap) => {
          const arr: Manuscript[] = [];
          snap.forEach(d => arr.push(d.data() as Manuscript));
          setManuscripts(arr);
          mLoaded = true; markCollectionsLoaded();
        }, (error) => {
          mLoaded = true; markCollectionsLoaded(); // don't hang the loading state on a read error
          handleFirestoreError(error, OperationType.GET, `users/${uid}/manuscripts`);
        });

        // Versions snapshot reader
        unsubVersions = onSnapshot(collection(db, "users", uid, "versions"), (snap) => {
          const arr: ManuscriptVersion[] = [];
          snap.forEach(d => arr.push(d.data() as ManuscriptVersion));
          setVersions(arr);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${uid}/versions`);
        });

        // Packages snapshot reader
        unsubPackages = onSnapshot(collection(db, "users", uid, "packages"), (snap) => {
          const arr: SubmissionPackage[] = [];
          snap.forEach(d => arr.push(d.data() as SubmissionPackage));
          setPackages(arr);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${uid}/packages`);
        });

        // Agents snapshot reader
        unsubAgents = onSnapshot(collection(db, "users", uid, "agents"), (snap) => {
          const arr: Agent[] = [];
          snap.forEach(d => arr.push(d.data() as Agent));
          setAgents(arr);
          aLoaded = true; markCollectionsLoaded();
        }, (error) => {
          aLoaded = true; markCollectionsLoaded();
          handleFirestoreError(error, OperationType.GET, `users/${uid}/agents`);
        });

        // Queries snapshot reader
        unsubQueries = onSnapshot(collection(db, "users", uid, "queries"), (snap) => {
          const arr: Query[] = [];
          snap.forEach(d => arr.push(d.data() as Query));
          setQueries(arr);
          qLoaded = true; markCollectionsLoaded();
        }, (error) => {
          qLoaded = true; markCollectionsLoaded();
          handleFirestoreError(error, OperationType.GET, `users/${uid}/queries`);
        });

        // Activities snapshot reader
        unsubActivities = onSnapshot(collection(db, "users", uid, "activities"), (snap) => {
          const arr: Activity[] = [];
          snap.forEach(d => arr.push(d.data() as Activity));
          const migratedArr = arr.map(actDoc => {
            const seedMatch = seedActivities.find(sAct => sAct.id === actDoc.id);
            let cleanedDesc = actDoc.description || "";
            if (cleanedDesc && (cleanedDesc.toLowerCase().includes("initial query packet dispatched") || cleanedDesc.toLowerCase().includes("dispatched to"))) {
              cleanedDesc = cleanedDesc
                .replace(/Initial Query packet dispatched to /gi, "Query sent to ")
                .replace(/Initial Query packet sent to /gi, "Query sent to ")
                .replace(/dispatched to /gi, "sent to ");
            }
            if (seedMatch) {
              return {
                ...actDoc,
                description: seedMatch.description,
                details: seedMatch.details
              };
            }
            if (cleanedDesc !== actDoc.description) {
              return {
                ...actDoc,
                description: cleanedDesc
              };
            }
            return actDoc;
          });
          setActivities(migratedArr);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${uid}/activities`);
        });

        // JournalEntries snap
        unsubJournal = onSnapshot(collection(db, "users", uid, "journalEntries"), (snap) => {
          const arr: JournalEntry[] = [];
          snap.forEach(d => arr.push(d.data() as JournalEntry));
          setJournalEntries(arr);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${uid}/journalEntries`);
        });

        // Notes snap (user-authored desk notes / dated tasks)
        unsubNotes = onSnapshot(collection(db, "users", uid, "notes"), (snap) => {
          const arr: Note[] = [];
          snap.forEach(d => arr.push(d.data() as Note));
          setNotes(arr);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${uid}/notes`);
        });

        // User tasks snap (users/{uid}/tasks) — the canonical stored, user-authored to-do object
        // (interaction layer): the To-do board AND the per-record "View tasks" popovers read this
        // ONE store. Record scope (queryId/agentId/manuscriptId) is set at creation.
        unsubUserTasks = onSnapshot(collection(db, "users", uid, "tasks"), (snap) => {
          const arr: UserTask[] = [];
          snap.forEach(d => arr.push(d.data() as UserTask));
          setUserTasks(arr);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${uid}/tasks`);
        });

        // Dismissed snap
        unsubDismissed = onSnapshot(collection(db, "users", uid, "dismissedTasks"), (snap) => {
          const arr: DismissedTask[] = [];
          snap.forEach(d => arr.push(d.data() as DismissedTask));
          setDismissedTasks(arr);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${uid}/dismissedTasks`);
        });

        // Task-flags snap (the user's stance on derived tasks — absorbs dismissedTasks)
        unsubTaskFlags = onSnapshot(collection(db, "users", uid, "taskFlags"), (snap) => {
          const arr: TaskFlag[] = [];
          snap.forEach(d => arr.push(d.data() as TaskFlag));
          setTaskFlags(arr);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${uid}/taskFlags`);
        });

      } catch (err) {
        console.error("Bootstrapping/authentication loading failures:", err);
        setAuthReady(true);          // never strand the app on the boot splash
        setCollectionsReady(true);   // …or on the loading skeleton
      }
    });

    return () => {
      unsubAuth();
      unsubUser();
      unsubEntitlement();
      unsubManuscripts();
      unsubVersions();
      unsubPackages();
      unsubAgents();
      unsubQueries();
      unsubActivities();
      unsubJournal();
      unsubNotes();
      unsubUserTasks();
      unsubDismissed();
      unsubTaskFlags();
    };
  }, []);

  // Load/fetch community agents from Firestore (fallback to local seeds on error / no user)
  useEffect(() => {
    if (!currentUser) {
      setCommunityAgents(localSeedCommunityAgents);
      return;
    }

    const fetchCommunityAgents = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "communityAgents"));
        const list: CommunityAgent[] = [];
        querySnapshot.forEach((docSnap) => {
          list.push(docSnap.data() as CommunityAgent);
        });
        setCommunityAgents(list);
      } catch (error) {
        console.error("[ScriptAlly] Failed to fetch community agents from Firestore: ", error);
        // Fallback to local seeds
        setCommunityAgents(localSeedCommunityAgents);
      }
    };

    fetchCommunityAgents();
  }, [currentUser]);

  // Compute Tasks periodically based on records
  useEffect(() => {
    if (!currentUser) return;

    const calculatedTasks: Task[] = [];

    /**

     * PHASE 5 — the newest holding reply per query, from the global feed.

     *

     * ⚠️ BUILT ONCE, NOT PER QUERY. A `.filter()` inside the loop below would walk the whole

     * activity feed for every query on the account, which is the shape that turns a hundred

     * queries into ten thousand passes.

     */

    const holdingReplyByQuery = new Map<string, number>();

    for (const a of activities) {

      if ((a as { activityType?: string }).activityType !== HOLDING_REPLY_TYPE || !a.queryId) continue;

      const t = new Date(a.date as string).getTime();

      if (Number.isNaN(t)) continue;

      const prev = holdingReplyByQuery.get(a.queryId);

      if (prev === undefined || t > prev) holdingReplyByQuery.set(a.queryId, t);

    }

    const lastHoldingReplyFor = (id: string): number | null => holdingReplyByQuery.get(id) ?? null;
    const now = new Date();
    const todayISO = now.toISOString().slice(0, 10);

    queries.forEach(q => {
      const manuscript = manuscripts.find(m => m.id === q.manuscriptId);
      const agent = agents.find(a => a.id === q.agentId);
      if (!manuscript || !agent) return;

      const mTitle = manuscript.title;
      // THE CANONICAL DISPLAY FIELD, not the raw column (workspace P0B). Validity here is "name
      // OR agency", so an agency-only record has an EMPTY name — and every one of the titles
      // below interpolates this straight into a sentence, producing "Nudge due: " with nothing
      // after the colon. agentPrimary exists precisely to answer "what do I call this record",
      // falling back to the agency; the engine was the one derivation still going around it.
      const aName = agentPrimary(agent);

      if (q.status === QueryStatus.OFFER && !hasOfferDecision(q.id, activities)) {
        calculatedTasks.push({
          id: `task-offer-${q.id}`,
          priority: "urgent",
          title: `Offer received from ${aName}!`,
          description: `You have an active offer on '${mTitle}'. It's time to notify other agents.`,
          manuscriptTitle: mTitle,
          context: `With agent ${aName}`,
          relatedRecordId: q.id,
          taskType: "offer_received",
          actionLabel: "View Query",
          actionPath: "queries"
        });
      }

      if (q.status === QueryStatus.PARTIAL_REQUESTED) {
        calculatedTasks.push({
          id: `task-partial-${q.id}`,
          priority: "urgent",
          title: `${aName} requested a partial manuscript`,
          description: `Outstanding partial draft request for '${mTitle}'. Send your sample chapters!`,
          manuscriptTitle: mTitle,
          context: `Request from ${aName}`,
          relatedRecordId: q.id,
          taskType: "partial_requested",
          actionLabel: "Submit Chapters",
          actionPath: "queries"
        });
      }

      if (q.status === QueryStatus.FULL_REQUESTED) {
        calculatedTasks.push({
          id: `task-full-${q.id}`,
          priority: "urgent",
          title: `Full script requested by ${aName}! 🎉`,
          description: `An spectacular milestone! Transmit the master copy of '${mTitle}' immediately.`,
          manuscriptTitle: mTitle,
          context: `Request from ${aName}`,
          relatedRecordId: q.id,
          taskType: "full_requested",
          actionLabel: "Submit Details",
          actionPath: "queries"
        });
      }

      if (q.status === QueryStatus.REVISE_RESUBMIT) {
        calculatedTasks.push({
          id: `task-rr-${q.id}`,
          priority: "urgent",
          title: `R&R Invitation from ${aName}`,
          description: `${aName} has invited a Revise & Resubmit. Check notes for guidelines.`,
          manuscriptTitle: mTitle,
          context: `Revise and Resubmit with ${aName}`,
          relatedRecordId: q.id,
          taskType: "revise_resubmit",
          actionLabel: "Review Comments",
          actionPath: "queries"
        });
      }

      // Nudge/close precedence: one decision, one task (close SUCCEEDS nudge, never competes).
      // No reply window → neither fires; the data_quality_poor "set a window" item does instead.
      const reply = replyTask({
        status: q.status,
        dateSent: q.dateSent,
        responseDeadline: q.responseDeadline,
        responseTimeWeeks: agent.responseTimeWeeks,
        noResponseMeansNo: agent.noResponseMeansNo,
        lastNudgeSentDate: q.lastNudgeSentDate,
        /* §3 — a nudge the writer has already scheduled supersedes both answers. The predicate is
           `scheduledReminder`'s, which is what the tracker's ghost rung draws from, so the feed and
           the timeline cannot disagree about whether a chase is booked. */
        reminderScheduled: !!scheduledReminder(userTasks, q.id, todayISO),
        /**
         * ⚠️ PHASE 5 (D6) · A HOLDING REPLY CLEARS THE CLOSE SUGGESTION. Read from the GLOBAL feed
         * rather than the per-query subcollection, because that is the store this generator has —
         * and the twin is written from the same build under the same id, so the two cannot disagree
         * about whether a reply exists. It does not clear the nudge: chasing an agent who
         * acknowledged you a month ago and then went quiet again is reasonable.
         */
        repliedSinceMs: lastHoldingReplyFor(q.id),
        now: now.getTime(),
      });
      if (reply === "close") {
        /**
         * ⚠️ §3 · "No response limit hit" WAS SYSTEM JARGON — a limit is a thing the app keeps, and
         * a writer reading their own to-do list has no limit in mind. The sentence now states the
         * fact and asks the question, with the elapsed figure from the app's one scaled formatter.
         *
         * ⚠️ MEASURED FROM THE SEND, NOT THE DEADLINE. "No response for two years" is a statement
         * about the silence, which began when the query went out; counting from the window's close
         * would state a smaller number for the same silence and call it the same thing.
         */
        const silentDays = q.dateSent ? daysBetween(new Date(q.dateSent).getTime(), now.getTime()) : null;
        calculatedTasks.push({
          id: `task-no-res-close-${q.id}`,
          priority: "suggested",
          title: silentDays != null
            ? `No response from ${aName} for ${elapsedPhrase(silentDays)}. Consider closing?`
            : `No response from ${aName}. Consider closing?`,
          description: `Their stated window has passed with no reply.`,
          manuscriptTitle: mTitle,
          context: `Archiving recommendation`,
          relatedRecordId: q.id,
          taskType: "no_response_close",
          actionLabel: "Close Query",
          actionPath: "queries"
        });
      } else if (reply === "nudge") {
        calculatedTasks.push({
          id: `task-nudge-${q.id}`,
          priority: "overdue",
          title: `Nudge due: ${aName}`,
          description: `It's been ${agent.responseTimeWeeks} weeks since submission. Time to send a polite nudge letter!`,
          manuscriptTitle: mTitle,
          context: `Follow-up needed`,
          relatedRecordId: q.id,
          taskType: "nudge_overdue",
          actionLabel: "Log Nudge",
          actionPath: "queries"
        });
      }
    });

    /* ── SENDS THAT RECORDED NOTHING (missing-materials pack, Phase 4) ────────────────────────
       ⚠️ DERIVED AT READ TIME, LIKE EVERY OTHER TASK HERE — nothing is stored to make this bucket
       exist. The predicate lives in `queryMaterialsGap` so it stays pure and testable without
       firebase; this loop only turns each gap into the engine's own Task shape.

       ⚠️ IT IS NOT `dq_materials`. That rule asks whether an AGENT has stated what they want;
       this asks whether a SEND recorded what actually went. Two subjects, two fixes — see the
       reconciliation invariants in `queryMaterialsGap.test.ts`.

       ⚠️ AND THE SINGLES ARE SUPPRESSED AT OR ABOVE THE THRESHOLD. Above it the board shows ONE
       bulk task instead, so a gap is never both a row and a member of a group — the same
       double-count `boardColumns` guards for sweeps. */
    const materialsGaps = queriesMissingMaterials({
      queries, activities, agents, manuscripts, displayName: agentPrimary,
    });
    if (isBulkMaterialsGap(materialsGaps.length)) {
      calculatedTasks.push({
        id: "task-materials-bulk",
        priority: "suggested",
        title: `${materialsGaps.length} queries have no record of what you sent`,
        description: `Fill them in together — the oldest first, where the details are hardest to recover.`,
        manuscriptTitle: "",
        context: `Record gap`,
        relatedRecordId: MATERIALS_BULK_RECORD_ID,
        taskType: "materials_unrecorded_bulk",
        actionLabel: "Record materials",
        actionPath: "todo"
      });
    } else {
      materialsGaps.forEach(g => {
        calculatedTasks.push({
          id: `task-materials-${g.queryId}`,
          priority: "suggested",
          title: `No record of what you sent ${g.agentName}`,
          description: `The query on '${g.manuscriptTitle}' went out without its materials recorded.`,
          manuscriptTitle: g.manuscriptTitle,
          context: `Record gap`,
          relatedRecordId: g.queryId,
          taskType: "materials_unrecorded",
          actionLabel: "Record materials",
          actionPath: "todo"
        });
      });
    }

    manuscripts.forEach(m => {
      const qCount = queries.filter(q => q.manuscriptId === m.id).length;
      if (m.status === ManuscriptStatus.READY_TO_QUERY && qCount === 0) {
        calculatedTasks.push({
          id: `task-query-start-${m.id}`,
          priority: "overdue",
          title: `Start querying for '${m.title}'`,
          description: `Your manuscript status is 'Ready to Query' but you haven't sent any submissions yet.`,
          manuscriptTitle: m.title,
          context: `Manuscript prepared`,
          relatedRecordId: m.id,
          taskType: "querying_unstarted",
          actionLabel: "Find Agents",
          actionPath: "agents"
        });
      }
    });

    agents.forEach(a => {
      // Dream-agent nudge: 5★, not closed (Unknown counts as suggestable), and not set aside.
      if (a.starRating === 5 && a.submissionStatus !== SubmissionStatus.CLOSED && !a.setAside) {
        const hasQuery = queries.some(q => q.agentId === a.id);
        if (!hasQuery) {
          calculatedTasks.push({
            id: `task-dream-agent-${a.id}`,
            priority: "suggested",
            title: `Query Dream Agent: ${agentPrimary(a)}`,
            description: `${agentPrimary(a)} is a 5★ fit for your catalog and is open to subs. Build a pitch!`,
            manuscriptTitle: manuscripts[0]?.title || "Your manuscript",
            context: `High-value match`,
            relatedRecordId: a.id,
            taskType: "dream_agent_unqueried",
            actionLabel: "Send Query",
            actionPath: "queries"
          });
        }
      }

      // Shared predicate — the SAME per-field list drives the drawer's needs-highlight + clearing.
      if (agentDataQualityNeeds(a).length > 0) {
        calculatedTasks.push({
          id: `task-dq-${a.id}`,
          priority: "suggested",
          title: `Complete MSWL details for ${agentPrimary(a)}`,
          description: `Keep submission rules clean. Add guidelines or MSWL cues to secure your pitch.`,
          manuscriptTitle: "",
          context: `Research clean-up`,
          relatedRecordId: a.id,
          taskType: "data_quality_poor",
          actionLabel: "Edit Agent",
          actionPath: "agents"
        });
      }
    });

    // Suppression is now taskFlags-based (dismissedTasks absorbed): a derived task is hidden while a
    // matching flag is snoozed into the future (a far-future snooze reads as an indefinite mute).
    const nowMs = now.getTime();
    const mutedRules = currentUser?.mutedTaskRules ?? [];
    const activeTasks = calculatedTasks.filter(t => {
      const flag = taskFlags.find(f => flagMatchesTask(f, t.taskType, t.relatedRecordId));
      // Offers are EXEMPT from snooze-HIDING (journey-logic P4): "I need time" renders the card
      // QUIETER, never hidden — the flag survives to the board, which derives quiet/wake.
      if (flag && isFlagSuppressing(flag, nowMs) && t.taskType !== "offer_received") return false;
      // Rule-scope mute ("Stop asking → All of them"): silence the reminder everywhere from this one
      // point. data_quality_poor dies only when ALL its remaining gaps are muted (todoHousekeeping).
      const ag = t.taskType === "data_quality_poor" ? agents.find(a => a.id === t.relatedRecordId) : undefined;
      return taskSurvivesMute(t.taskType, ag, mutedRules);
    });

    setTasks(activeTasks);
    /* ⚠️ `userTasks` IS A DEPENDENCY SINCE §3 — the close suggestion is suppressed by a scheduled
       reminder, so completing or deleting that reminder has to re-run this. Without it the
       suggestion would reappear only on the next unrelated change, which is the shape of a bug
       nobody can reproduce. */
  }, [queries, manuscripts, agents, taskFlags, activities, currentUser, userTasks]);

  /**
   * ══ §1 (provenance pack) · THE ONE-TIME EXPECTED-DATE MIGRATION ═════════════════════════════
   *
   * ⚠️ IT MOVES A FACT OUT OF THE WRONG FIELD, ONCE. Every stored `responseDeadline` is either the
   * AGENCY's window written down at create time — derivable now, so it goes — or something the
   * agency's window cannot explain, which as far as anything can tell is the writer's date and is
   * copied into the field that says so.
   *
   * ⚠️ THE PLAN IS LOGGED WHETHER OR NOT THE WRITES LAND, because until the rules carrying
   * `writerExpectedDate` are deployed every adopt is silently denied — and a migration that cannot
   * report what it intended is a migration nobody can check.
   *
   * ⚠️ SAFE TO RUN TWICE. A query that already carries a writer's date is only ever dropped, never
   * re-adopted, so a second pass cannot overwrite the first.
   *
   * ⚠️ AND IT NEEDS BOTH STORES LOADED. Running with `agents` empty would derive no window for any
   * query and adopt the entire database into the writer's field — the exact wrong attribution this
   * section exists to avoid, applied to everything at once.
   */
  const migratedExpected = useRef(false);
  useEffect(() => {
    if (!currentUser || migratedExpected.current) return;
    if (queries.length === 0 || agents.length === 0) return;
    migratedExpected.current = true;

    const plan = planExpectedDateMigration(
      queries as unknown as MigrationQuery[],
      (agentId) => agents.find((a) => a.id === agentId)?.responseTimeWeeks,
    );
    console.log(
      `[ScriptAlly] expected-date migration — ${plan.drop.length} agency-derived date${plan.drop.length === 1 ? "" : "s"} dropped, `
      + `${plan.adopt.length} adopted as the writer's, of which ${plan.unresolvable.length} `
      + `unresolvable (agent states no window now, so the stored date is either the writer's or debris from a cleared one)`,
    );

    void (async () => {
      for (const id of plan.drop) {
        try {
          await updateDoc(doc(db, "users", currentUser.id, "queries", id), { responseDeadline: deleteField() });
        } catch (e) { handleFirestoreError(e, OperationType.UPDATE, `users/${currentUser.id}/queries/${id}`); }
      }
      for (const { id, iso } of plan.adopt) {
        try {
          await updateDoc(doc(db, "users", currentUser.id, "queries", id), { writerExpectedDate: iso, responseDeadline: deleteField() });
        } catch (e) { handleFirestoreError(e, OperationType.UPDATE, `users/${currentUser.id}/queries/${id}`); }
      }
      console.log("[ScriptAlly] expected-date migration — writes attempted");
    })();
  }, [currentUser, queries, agents]);

  // Self-healing backfill routine to auto-create missing creation activities for existing agents and manuscripts.
  // This gracefully heals objects that were successfully added but whose activities were rejected by past Firestore rules.
  useEffect(() => {
    if (!currentUser || agents.length === 0 || activities.length === 0) return;

    const backfill = async () => {
      const missingActivities: (Omit<Activity, "id" | "userId"> & { id: string })[] = [];

      // 1. Backfill Agent Added activities
      for (const ag of agents) {
        const hasAddActivity = activities.some(act => 
          (act.id === `act-added-agent-${ag.id}`) ||
          (act.activityType === ActivityType.AGENT_ADDED && act.description.includes(ag.name))
        );

        if (!hasAddActivity) {
          missingActivities.push({
            id: `act-added-agent-${ag.id}`,
            activityType: ActivityType.AGENT_ADDED,
            description: ag.name?.trim()
              ? `Added ${ag.name} at ${ag.agency}`
              : `Added ${ag.agency}`,
            manuscriptId: "",
            queryId: "",
            date: ag.dateAdded || new Date().toISOString(),
            details: ""
          });
        }
      }

      // 2. Backfill Manuscript Added activities
      for (const ms of manuscripts) {
        const hasAddActivity = activities.some(act => 
          (act.id === `act-added-ms-${ms.id}`) ||
          (act.activityType === ActivityType.MANUSCRIPT_ADDED && act.manuscriptId === ms.id)
        );

        if (!hasAddActivity) {
          missingActivities.push({
            id: `act-added-ms-${ms.id}`,
            activityType: ActivityType.MANUSCRIPT_ADDED,
            description: `Added new title ${ms.title} to your manuscripts`,
            manuscriptId: ms.id,
            queryId: "",
            date: ms.createdDate || new Date().toISOString(),
            details: ""
          });
        }
      }

      // 3. Heal queries whose AUTHORITATIVE per-query activity log is empty.
      //    "Authoritative" = the per-query `activity` subcollection (the store derivation reads).
      //    The old check judged against the global feed, so a query with a global-feed row but an
      //    empty subcollection was skipped — leaving derivation to fall back to Queried. We now
      //    judge and seed the SAME store, and only stamp activities (never write status;
      //    recomputeQuery derives it).
      for (const q of queries) {
        if (q.status === QueryStatus.QUERIED) continue;

        // Skip very-recently-changed queries — their own writers just logged in real time; the
        // timer could otherwise race that write and duplicate it.
        const lastChangeRaw: any = (q as any).lastStatusChange || (q as any).responseReceivedAt;
        let lastChangeMs = 0;
        if (lastChangeRaw) {
          if (typeof lastChangeRaw === "string") lastChangeMs = new Date(lastChangeRaw).getTime();
          else if (typeof lastChangeRaw.seconds === "number") lastChangeMs = lastChangeRaw.seconds * 1000;
          else if (typeof lastChangeRaw.toDate === "function") lastChangeMs = lastChangeRaw.toDate().getTime();
          else if (lastChangeRaw instanceof Date) lastChangeMs = lastChangeRaw.getTime();
        }
        if (lastChangeMs && Date.now() - lastChangeMs < 24 * 60 * 60 * 1000) continue;

        // Already has a status-bearing entry in the authoritative store? Leave it untouched (no dup).
        let hasStatusBearing: boolean;
        try {
          const sub = await getDocs(collection(db, "users", currentUser.id, "queries", q.id, "activity"));
          hasStatusBearing = sub.docs.some(d => {
            const data = d.data();
            return (
              normalizeResultingStatus(data.resultingStatus) !== null ||
              normalizeResultingStatus(data.type) !== null
            );
          });
        } catch (err) {
          // Never heal blind on a read error — that could create a duplicate.
          console.error("[ScriptAlly Backfill] Could not read per-query log; skipping heal:", err);
          continue;
        }
        if (hasStatusBearing) continue;

        // Seed one entry stamped with the CURRENT stored status, dated from the best available
        // signal, so derivation reproduces exactly what the user already sees.
        let dateVal = Date.now();
        const rawDate = q.lastStatusChange || q.responseReceivedAt || q.dateSent;
        if (rawDate) {
          if (typeof rawDate === "string") dateVal = new Date(rawDate).getTime();
          else if ((rawDate as any).seconds) dateVal = (rawDate as any).seconds * 1000;
          else if (typeof (rawDate as any).toDate === "function") dateVal = (rawDate as any).toDate().getTime();
          else if (rawDate instanceof Date) dateVal = rawDate.getTime();
        }
        const note = statusReconstructionNote(q.status);
        /**
         * ⚠️ THE ID IS SANITISED TO THE CHARSET THE RULES ACCEPT, AND IT WAS NOT.
         *
         * `isValidId` requires `^[a-zA-Z0-9_-]+$`. This id is built from the STATUS, and one status
         * contains an ampersand — "Revise & Resubmit" produced
         * `act-status-revise-&-resubmit-<qid>`, which the rule rejects. So the heal for EVERY R&R
         * query was denied, permanently and silently: its per-query log was never seeded, so its
         * derived state never computed, and the only trace was one console line.
         *
         * ⚠️ NO OTHER STATUS IS AFFECTED and no working id changes: every other status is letters
         * and spaces, so the collapse below is a no-op for them. The R&R ids this replaces never
         * existed to migrate, because none of those writes ever landed.
         */
        const healId = `act-status-${q.status.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}-${q.id}`;

        try {
          const manuscriptTitle = manuscripts.find(ms => ms.id === q.manuscriptId)?.title || "";
          const agentName = agents.find(ag => ag.id === q.agentId)?.name || "The agent";
          await setDoc(
            doc(db, "users", currentUser.id, "queries", q.id, "activity", healId),
            {
              type: q.status,
              resultingStatus: q.status,
              createdAt: Timestamp.fromMillis(dateVal),
              note,
              queryId: q.id,
              agentName,
              manuscriptTitle,
            },
            { merge: true }
          );
          // Log changed → derive status/dates/flags from it. Stored status is unchanged.
          await recomputeQueryOnline(currentUser.id, q.id);
          console.log(`[ScriptAlly Backfill] Healed missing per-query log for ${q.id} (${q.status}).`);
        } catch (err) {
          console.error("[ScriptAlly Backfill] Online heal failed for query:", q.id, err);
        }
      }

      if (missingActivities.length > 0) {
        console.log(`[ScriptAlly Backfill] Auto-healing ${missingActivities.length} missing activities.`);
        for (const act of missingActivities) {
          await addActivity(act);
        }
      }
    };

    const timer = setTimeout(() => {
      backfill().catch(err => console.error("Error running database backfill", err));
    }, 1500);

    return () => clearTimeout(timer);
  }, [currentUser, agents, activities, manuscripts, queries]);

  // The timer-based "cleanupCorruptedData" self-healing script that used to live here is
  // retired. Status, the pipeline dates, revisionRound, and hasAgentResponded are now DERIVED
  // from the activity log by recomputeQuery — the only writer of those fields — so the
  // status-vs-log desyncs it patched (leftover dates after undo, duplicate timeline rows,
  // contradictory entries) are structurally impossible rather than reactively repaired.

  // Translate raw Firebase auth error codes into clear, actionable messages.
  const friendlyAuthError = (code?: string): string => {
    switch (code) {
      case "auth/invalid-email":
        return "That email address doesn't look valid. Please check and try again.";
      case "auth/invalid-credential":
      case "auth/wrong-password":
        return "Incorrect email or password. Try again, or reset your password using “Forgot secret?”.";
      case "auth/user-not-found":
        return "No account found with that email. Switch to “Sign up” to create one.";
      case "auth/email-already-in-use":
        return "An account with this email already exists. Try logging in instead.";
      case "auth/missing-password":
        return "Please enter your password.";
      case "auth/weak-password":
        return "Please choose a password of at least 6 characters.";
      case "auth/too-many-requests":
        return "Too many attempts. Please wait a moment and try again.";
      case "auth/network-request-failed":
        return "Network error. Check your connection and try again.";
      default:
        return "Something went wrong while signing you in. Please try again.";
    }
  };

  const login = async (email: string, password?: string): Promise<boolean> => {
    const pass = password || "";
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      return true;
    } catch (error: any) {
      // A failed sign-in is just a failed sign-in — surface a clear message and create nothing.
      // (Account creation lives only in signup().)
      console.error("Authentication login failures:", error);
      throw new Error(friendlyAuthError(error?.code));
    }
  };

  const resetPassword = async (email: string): Promise<void> => {
    if (!email) {
      throw new Error("Enter your email address first, then tap “Forgot secret?”.");
    }
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      throw new Error(friendlyAuthError(error?.code));
    }
  };

  const signup = async (name: string, email: string, password?: string): Promise<boolean> => {
    try {
      signupTempNameRef.current = name;
      sessionStorage.setItem("scriptally_new_signup", "true");
      const pass = password || "";
      await createUserWithEmailAndPassword(auth, email, pass);
      return true;
    } catch (error: any) {
      console.error("Sign up failure:", error);
      throw new Error(friendlyAuthError(error?.code));
    }
  };

  /**
   * ⚠️ SIGNING OUT LANDS ON THE LANDING PAGE, NOT THE SIGN-IN FORM. Clearing the session alone left
   * the writer on `<Auth/>` — the app's answer to "who are you", offered to someone who had just
   * said they were leaving. `/` is a real page now (About, Pricing, Contact, the features), so the
   * way out ends somewhere you can read rather than at a form you just declined.
   *
   * ⚠️ IT IS A HARD NAVIGATION BECAUSE THE ROUTER IS NOT AVAILABLE HERE, and that is structural
   * rather than a preference: `DbProvider` is mounted ABOVE `BrowserRouter` in App.tsx, so this
   * function has no router context to navigate with. The reload is a fair price — it guarantees no
   * in-memory state outlives the account it belonged to, which is exactly the guarantee wanted at
   * this moment. `localStorage` survives it, so interface preferences (`sa.*`) are kept; the auth
   * listener has already dropped `scriptally_was_authed` and torn down every collection listener.
   *
   * ⚠️ ONE IMPLEMENTATION, EVERY ENTRY POINT. The account menu, the settings row and the mobile
   * "you" menu all call this — so where sign-out leaves you cannot differ by the door you used.
   */
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Sign out process error:", e);
    } finally {
      // `finally`, not the try: a failed signOut still means the writer asked to leave, and
      // stranding them on a page for an account they believe they have left is the worse outcome.
      window.location.assign("/");
    }
  };


  // Add Manuscript Action with limits checks
  const addManuscript = async (
    m: Omit<Manuscript, "id" | "userId" | "statusChangedDate"> & { id?: string },
    bypassLimits: boolean = false
  ): Promise<{ success: boolean; error?: string; id?: string }> => {
    if (!currentUser) return { success: false, error: "Authentication status required." };

    if (!bypassLimits && currentUser.plan === UserPlan.FREE && manuscripts.length >= 1) {
      return {
        success: false,
        error: "Free tier is limited to 1 manuscript. Please upgrade to Pro to track multiple scripts!"
      };
    }

    const id = m.id || "ms-" + Math.random().toString(36).substr(2, 9);
    const newMs: Manuscript = {
      ...m,
      id,
      userId: currentUser.id,
      statusChangedDate: new Date().toISOString()
    } as any;

    let writeSuccess = false;
    try {
      await setDoc(doc(db, "users", currentUser.id, "manuscripts", id), newMs);
      writeSuccess = true;
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${currentUser.id}/manuscripts/${id}`);
      return { success: false, error: "Database exception occurred." };
    }

    if (writeSuccess) {
      await addActivity({
        activityType: ActivityType.MANUSCRIPT_ADDED,
        description: `You added a new title ${newMs.title} to your manuscripts`,
        manuscriptId: id,
        queryId: "",
        date: new Date().toISOString(),
        details: ""
      });
      return { success: true, id };
    }
    return { success: false, error: "Initialization failed." };
  };

  const updateManuscript = async (id: string, fields: Partial<Manuscript>) => {
    if (!currentUser) return;
    const existingMs = manuscripts.find(m => m.id === id);
    if (!existingMs) return;
    const msTitle = existingMs.title;

    let writeSuccess = false;
    try {
      const hasStatusChanged = fields.status && fields.status !== existingMs?.status;
      const updates = {
        ...fields,
        ...(hasStatusChanged ? { statusChangedDate: new Date().toISOString() } : {})
      };
      await updateDoc(doc(db, "users", currentUser.id, "manuscripts", id), updates);
      writeSuccess = true;
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${currentUser.id}/manuscripts/${id}`);
    }

    if (writeSuccess) {
      const dateStr = new Date().toISOString();
      await addActivity({
        activityType: ActivityType.MANUSCRIPT_UPDATED,
        description: "You updated a manuscript's details",
        manuscriptId: id,
        queryId: "",
        date: dateStr,
        details: ""
      });
    }
  };

  /**
   * A manuscript write that does NOT narrate itself into the activity feed. See the interface note.
   *
   * ⚠️ IT STILL STAMPS `statusChangedDate` when the status moves, because that stamp is DATA the
   * plate and the tiles read — not narration. Dropping it here would make a quiet status change
   * produce a manuscript whose stamp disagrees with its status.
   */
  const updateManuscriptQuiet = async (id: string, fields: Partial<Manuscript>) => {
    if (!currentUser) return;
    const existingMs = manuscripts.find(m => m.id === id);
    if (!existingMs) return;
    try {
      const hasStatusChanged = fields.status && fields.status !== existingMs.status;
      await updateDoc(doc(db, "users", currentUser.id, "manuscripts", id), {
        ...fields,
        ...(hasStatusChanged ? { statusChangedDate: new Date().toISOString() } : {}),
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${currentUser.id}/manuscripts/${id}`);
    }
  };

  // Set (or clear, with "") the manuscript's chosen active package. Direct write — no MANUSCRIPT_UPDATED
  // activity (this is a quiet preference, not an edit). One field = inherently single-writer.
  const setActivePackage = async (manuscriptId: string, packageId: string) => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, "users", currentUser.id, "manuscripts", manuscriptId), { activePackageId: packageId });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${currentUser.id}/manuscripts/${manuscriptId}`);
    }
  };

  // Delete a list of doc refs, batched (Firestore caps a batch at 500 writes, so larger cascades
  // split). Callers order the PARENT ref LAST so a mid-way failure leaves the parent — and a clean
  // retry — intact rather than half-deleting it (D2: no un-batched sequential half-deletes).
  const commitDeletesInBatches = async (refs: DocumentReference[]) => {
    for (const chunk of chunkArray(refs, 450)) {
      const batch = writeBatch(db);
      for (const ref of chunk) batch.delete(ref);
      await batch.commit();
    }
  };

  const deleteManuscript = async (id: string) => {
    if (!currentUser) return;
    const uid = currentUser.id;
    // Capture title + query count BEFORE the cascade removes them — for the durable delete record.
    const msTitle = manuscripts.find(m => m.id === id)?.title || "a manuscript";
    // The ordered plan (cascade.ts, unit-locked): versions + packages → queries (each preceded by its
    // live-fetched activity subcollection) → global-feed projections → taskFlag stances (6A: stances
    // die with their records) → THE MANUSCRIPT LAST, so a mid-way failure leaves it (and a retry)
    // intact — children can be stranded but never orphaned.
    const plan = cascadePlan("manuscript", id, { queries, activities, taskFlags, versions, packages });
    const qIds = plan.queryIds;
    try {
      const refs: DocumentReference[] = [];
      // The manuscripts/{id}/notes subcollection is RETIRED (rules default-deny it — Tier 2 ·
      // Phase 6), so the cascade no longer collects it. Legacy note docs stay put, orphaned by
      // design: unreadable, unwritable, and undeleted.
      for (const d of plan.docs) {
        if (d.col === "queries") {
          const actSnap = await getDocs(collection(db, "users", uid, "queries", d.id, "activity"));
          actSnap.forEach(a => refs.push(a.ref));
        }
        refs.push(doc(db, "users", uid, d.col, d.id));
      }
      await commitDeletesInBatches(refs);

      // Durable record of the permanent delete (parity with deleteAgent): global activities feed with
      // NO queryId, so the cascade can't purge it and it outlives the manuscript + its queries.
      // Best-effort — a failed log must never surface as a failed delete (the delete already committed).
      const qn = qIds.length;
      const detail = qn > 0 ? ` (and ${qn} quer${qn > 1 ? "ies" : "y"} removed)` : "";
      await addActivity({
        activityType: ActivityType.MANUSCRIPT_DELETED,
        description: `You deleted “${msTitle}”${detail}`,
        manuscriptId: "",
        queryId: "",
        date: new Date().toISOString(),
        details: "",
      }).catch(() => { /* best-effort: the delete itself succeeded */ });
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `users/${uid}/manuscripts/${id}`);
    }
  };

  // Shelve / reactivate — writes the single `shelved` overlay flag (reversible). No cascade, no
  // activity-log noise: queries, stats, and history are all kept; only the picker/suggestions hide it.
  const setManuscriptShelved = async (id: string, shelved: boolean) => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, "users", currentUser.id, "manuscripts", id), { shelved });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${currentUser.id}/manuscripts/${id}`);
    }
  };

  // Version Actions
  const addVersion = async (v: Omit<ManuscriptVersion, "id" | "userId" | "createdDate">): Promise<string> => {
    if (!currentUser) return "";
    const id = "ver-" + Math.random().toString(36).substr(2, 9);
    const newVer: ManuscriptVersion = {
      ...v,
      id,
      userId: currentUser.id,
      createdDate: new Date().toISOString()
    };
    try {
      await setDoc(doc(db, "users", currentUser.id, "versions", id), newVer);
      return id; // returned so a build-slot "+ New …" can auto-select the freshly created version
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${currentUser.id}/versions/${id}`);
      return "";
    }
  };

  /**
   * ⚠️ THE IMPLEMENTATION'S FIELD SET WAS NARROWER THAN THE INTERFACE ALREADY DECLARED — it accepted
   * four keys where the context type promised seven. Widened to match, additively, plus the flow
   * pack's `wordCount`. Nothing that compiled before stops compiling; callers simply get the fields
   * the type has been advertising all along.
   *
   * ⚠️ AND IT TAKES `FieldValue`, SO A MODE SWITCH CAN **UNSET** RATHER THAN ZERO. Turning a pasted
   * material into a name-only one has to clear the body and its word count, and writing `0` there
   * would state that the document contains no words rather than that we have not read it. The rules'
   * `wordCount is int` check rejects a literal null, so `deleteField()` is the only honest way to say
   * "not applicable" — the same absent-means-absent idiom as `starRating` and `responseTimeWeeks`.
   */
  const updateVersion = async (
    id: string,
    fields: Partial<Record<
      "versionName" | "contentDraft" | "fileAttached" | "fileName" | "notes" | "contentType" | "contentLink" | "wordCount",
      unknown
    >>,
  ) => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, "users", currentUser.id, "versions", id), fields);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${currentUser.id}/versions/${id}`);
    }
  };

  const deleteVersion = async (id: string) => {
    if (!currentUser) return;
    const isLocked = packages.some(p => p.queryLetterVersionId === id || p.synopsisVersionId === id || p.samplePagesVersionId === id);
    if (isLocked) {
      alert("This version is locked in one of your packages. Modify or retire the package before deleting.");
      return;
    }
    try {
      await deleteDoc(doc(db, "users", currentUser.id, "versions", id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `users/${currentUser.id}/versions/${id}`);
    }
  };

  // Package Action with Pro checking
  const addPackage = async (p: Omit<SubmissionPackage, "id" | "userId" | "status" | "createdDate">): Promise<{ success: boolean; error?: string; id?: string }> => {
    if (!currentUser) return { success: false, error: "Authentication required." };

    if (currentUser.plan === UserPlan.FREE) {
      return {
        success: false,
        error: "Custom Submission Packages & A/B Tracking are premium features. Upgrade to ScriptAlly Pro!"
      };
    }

    const id = "pkg-" + Math.random().toString(36).substr(2, 9);
    const newPkg: SubmissionPackage = {
      ...p,
      id,
      userId: currentUser.id,
      status: "Active",
      createdDate: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, "users", currentUser.id, "packages", id), newPkg);
      return { success: true, id };
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${currentUser.id}/packages/${id}`);
      return { success: false, error: "Database transaction error." };
    }
  };

  const updatePackage = async (
    id: string,
    fields: Partial<Pick<SubmissionPackage, "packageName" | "queryLetterVersionId" | "synopsisVersionId" | "samplePagesVersionId">>,
  ) => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, "users", currentUser.id, "packages", id), fields);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${currentUser.id}/packages/${id}`);
    }
  };

  const retirePackage = async (id: string) => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, "users", currentUser.id, "packages", id), { status: "Retired" });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${currentUser.id}/packages/${id}`);
    }
  };

  // Agent Actions with Free limits
  const addAgent = async (
    a: Omit<Agent, "id" | "userId" | "dateAdded" | "lastCheckedDate"> & { id?: string },
    bypassLimits: boolean = false
  ): Promise<{ success: boolean; error?: string; id?: string }> => {
    if (!currentUser) return { success: false, error: "Not logged in." };

    if (!bypassLimits && currentUser.plan === UserPlan.FREE && agents.length >= 5) {
      return {
        success: false,
        error: "Free tier is capped at 5 agents. Upgrade to ScriptAlly Pro for unlimited research!"
      };
    }

    const id = a.id || "agent-" + Math.random().toString(36).substr(2, 9);
    const rawAg: Agent = {
      ...a,
      id,
      userId: currentUser.id,
      dateAdded: new Date().toISOString(),
      lastCheckedDate: new Date().toISOString()
    } as any;

    // Sanitize the object to remove any 'undefined' properties before writing to Firestore
    const newAg: any = {};
    Object.keys(rawAg).forEach(k => {
      if ((rawAg as any)[k] !== undefined) {
        newAg[k] = (rawAg as any)[k];
      }
    });

    let writeSuccess = false;
    try {
      await setDoc(doc(db, "users", currentUser.id, "agents", id), newAg);
      writeSuccess = true;
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${currentUser.id}/agents/${id}`);
      return { success: false, error: "Database storage failed." };
    }

    if (writeSuccess) {
      await addActivity({
        activityType: ActivityType.AGENT_ADDED,
        description: newAg.name?.trim()
          ? `Added ${newAg.name} at ${newAg.agency}`
          : `Added ${newAg.agency}`,
        manuscriptId: "",
        queryId: "",
        date: new Date().toISOString(),
        details: ""
      });
      return { success: true, id };
    }
    return { success: false, error: "Operation failed." };
  };

  // Deliberately NO lastCheckedDate stamp anywhere in this function: the field means "last
  // VERIFIED", and an edit is not a verification (see the Agent type + saveAgentEdits, which
  // states the same rule). Creation stamps it (addAgent); a future explicit "mark as checked"
  // action is the only other legitimate writer. Comment kept ABOVE the function so the artefact
  // lock (agentLastChecked.test.ts) can assert the body never mentions the field.
  const updateAgent = async (id: string, fields: Partial<Agent>) => {
    if (!currentUser) return;
    const existingAgent = agents.find(a => a.id === id);
    if (!existingAgent) return;
    const previousStarRating = existingAgent.starRating;
    const agentName = existingAgent.name;
    const agencyName = existingAgent.agency;

    let writeSuccess = false;
    try {
      await updateDoc(doc(db, "users", currentUser.id, "agents", id), { ...fields });
      writeSuccess = true;
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${currentUser.id}/agents/${id}`);
    }

    if (writeSuccess) {
      const activitiesToCreate = [];
      const dateStr = new Date().toISOString();

      if (fields.submissionStatus !== undefined) {
        if (fields.submissionStatus === SubmissionStatus.OPEN) {
          activitiesToCreate.push({
            activityType: ActivityType.AGENT_UPDATED,
            description: `You updated details for ${agentName} at ${agencyName}`,
            manuscriptId: "",
            queryId: "",
            date: dateStr,
            details: "Submission status updated to Open"
          });
        } else if (fields.submissionStatus === SubmissionStatus.CLOSED) {
          activitiesToCreate.push({
            activityType: ActivityType.AGENT_UPDATED,
            description: `You updated details for ${agentName} at ${agencyName}`,
            manuscriptId: "",
            queryId: "",
            date: dateStr,
            details: "Submission status updated to Closed"
          });
        }
      }

      if (fields.starRating !== undefined) {
        activitiesToCreate.push({
          activityType: ActivityType.AGENT_UPDATED,
          description: `You updated details for ${agentName} at ${agencyName}`,
          manuscriptId: "",
          queryId: "",
          date: dateStr,
          details: `Updated star rating field from ${previousStarRating} to ${fields.starRating}`
        });
      }

      if (fields.mswlNotes !== undefined && fields.mswlNotes !== "") {
        activitiesToCreate.push({
          activityType: ActivityType.AGENT_UPDATED,
          description: `You updated details for ${agentName} at ${agencyName}`,
          manuscriptId: "",
          queryId: "",
          date: dateStr,
          details: "Updated wishlist notes field"
        });
      }

      const hasSpecificKeys = fields.submissionStatus !== undefined || 
                               fields.starRating !== undefined || 
                               (fields.mswlNotes !== undefined && fields.mswlNotes !== "");

      if (!hasSpecificKeys) {
        const otherKeys = Object.keys(fields).filter(
          k => k !== "submissionStatus" && k !== "starRating" && k !== "mswlNotes" && fields[k as keyof Partial<Agent>] !== undefined
        );
        if (otherKeys.length > 0) {
          activitiesToCreate.push({
            activityType: ActivityType.AGENT_UPDATED,
            description: `You updated details for ${agentName} at ${agencyName}`,
            manuscriptId: "",
            queryId: "",
            date: dateStr,
            details: ""
          });
        }
      }

      for (const act of activitiesToCreate) {
        await addActivity(act);
      }
    }
  };

  // The Edit Agent panel's write path (Prompt 2 UI calls this via useScriptAllyDb). Sanitises the
  // patch (strips undefined, "Not set" → deleteField, guards the rule-enforced fields) and commits
  // via writeBatch, leaving the `extraWrites` seam for the Prompt-3 deadline fan-out. Distinct from
  // `updateAgent` (left untouched for its existing callers); returns a typed { ok } result.
  const saveAgentEdits = (
    agentId: string,
    patch: AgentEditPatch,
    extraWrites: AgentExtraWrite[] = []
  ): Promise<SaveAgentResult> => {
    if (!currentUser) return Promise.resolve({ ok: false, error: "Not signed in." });

    // responseTimeWeeks deadline fan-out (Prompt 3): a NUMERIC turnaround change recomputes the
    // denormalised responseDeadline on this agent's QUERIED queries that already carry one, in the
    // SAME atomic batch as the agent write. Computed in this funnel (not the drawer) so Firestore
    // stays out of the component — the ref factory and the agent's live queries only exist here.
    // "Not set" (null) and a no-op (same number) produce no query writes; computeAgentDeadlineWrites
    // owns the QUERIED ∩ has-deadline filter.
    let allExtra = extraWrites;
    const prevWeeks = agents.find(a => a.id === agentId)?.responseTimeWeeks;
    if (typeof patch.responseTimeWeeks === "number" && patch.responseTimeWeeks !== prevWeeks) {
      const fanOut = computeAgentDeadlineWrites(
        queries.filter(q => q.agentId === agentId),
        patch.responseTimeWeeks,
        (queryId) => doc(db, "users", currentUser.id, "queries", queryId),
      );
      allExtra = extraWrites.concat(fanOut);
    }

    return commitAgentEdits(db, currentUser.id, agentId, patch, allExtra);
  };

  const deleteAgent = async (id: string) => {
    if (!currentUser) return;
    const uid = currentUser.id;
    // Capture name + query count BEFORE the cascade removes them — for the durable delete record.
    const agentName = agents.find(a => a.id === id)?.name || "an agent";
    // The ordered plan (cascade.ts, unit-locked): queries (each preceded by its live-fetched activity
    // subcollection) → global-feed projections → taskFlag stances (query-keyed AND the agent's own
    // dq stance — 6A) → THE AGENT LAST, so a mid-way failure leaves it (and a retry) intact.
    const plan = cascadePlan("agent", id, { queries, activities, taskFlags });
    const qIds = plan.queryIds;
    try {
      const refs: DocumentReference[] = [];
      // Agent notes subcollection.
      try {
        const notesSnap = await getDocs(collection(db, "users", uid, "agents", id, "notes"));
        notesSnap.forEach(n => refs.push(n.ref));
      } catch {
        // Best-effort: an unreadable notes subcollection must not block the delete.
      }
      for (const d of plan.docs) {
        if (d.col === "queries") {
          const actSnap = await getDocs(collection(db, "users", uid, "queries", d.id, "activity"));
          actSnap.forEach(a => refs.push(a.ref));
        }
        refs.push(doc(db, "users", uid, d.col, d.id));
      }
      await commitDeletesInBatches(refs);

      // Durable record of the permanent delete: lives in the global activities feed with NO queryId,
      // so the cascade above can never purge it and it outlives the agent + its queries. Best-effort —
      // a failed log must never surface as a failed delete (the delete already committed).
      const qn = qIds.length;
      const detail = qn > 0 ? ` (and ${qn} quer${qn > 1 ? "ies" : "y"} removed)` : "";
      await addActivity({
        activityType: ActivityType.AGENT_DELETED,
        description: `You deleted ${agentName}${detail}`,
        manuscriptId: "",
        queryId: "",
        date: new Date().toISOString(),
        details: "",
      }).catch(() => { /* best-effort: the delete itself succeeded */ });
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `users/${uid}/agents/${id}`);
    }
  };

  // 5e — permanently delete ONE query + its whole tracking history (the per-query activity
  // subcollection AND the global-feed twins). Models deleteAgent's cascade so no docs are orphaned;
  // no recompute needed (the query is gone → response stats simply re-derive over what remains). No
  // undo (a cascade restore isn't offered — the counted confirm is the safety, mirroring deleteAgent).
  const deleteQuery = async (queryId: string) => {
    if (!currentUser) return;
    const uid = currentUser.id;
    if (!queries.find(q => q.id === queryId)) return;
    try {
      const refs: DocumentReference[] = [];
      const actSnap = await getDocs(collection(db, "users", uid, "queries", queryId, "activity"));
      actSnap.forEach(a => refs.push(a.ref));
      for (const aid of activityIdsForQueries(activities, [queryId])) refs.push(doc(db, "users", uid, "activities", aid));
      // 6A: the query's taskFlag stances die with it (same principle as the big cascades).
      for (const fid of flagIdsForCascade(taskFlags, { queryIds: [queryId] })) refs.push(doc(db, "users", uid, "taskFlags", fid));
      // The query doc last, so a mid-way failure leaves it (and a retry) intact.
      refs.push(doc(db, "users", uid, "queries", queryId));
      await commitDeletesInBatches(refs);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `users/${uid}/queries/${queryId}`);
    }
  };

  // Set aside / bring back — writes the single `setAside` overlay flag (reversible). Queries + history
  // kept; the agent just drops out of "who to query next" and the idle bucket / Agents stat card.
  const setAgentSetAside = async (id: string, setAside: boolean) => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, "users", currentUser.id, "agents", id), { setAside });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${currentUser.id}/agents/${id}`);
    }
  };

  // Query Actions with Free limits
  const addQuery = async (
    q: Omit<Query, "id" | "userId" | "status" | "dateSent" | "responseDeadline" | "nudgeDate"> & { status?: QueryStatus; dateSent?: string; id?: string },
    bypassLimits: boolean = false
  ): Promise<{ success: boolean; error?: string; id?: string }> => {
    if (!currentUser) return { success: false, error: "Session required." };

    /**
     * ⚠️ §1 (provenance pack) · THE CREATE-TIME SEED IS GONE, and it was a derived-over-stored
     * violation that caused a real bug. Writing the AGENT's window onto the query froze a fact that
     * belongs to the agent record: clearing their stated weeks left every query carrying a date
     * derived from a window that no longer existed, and nothing could tell that debris from a date
     * the writer had set. The agency's window is derived at read time now, so it moves and vanishes
     * with them, and `responseDeadline` is no longer written on this path at all.
     *
     * ⚠️ AND IT WAS A LATENT THROW (§3). `computeResponseDeadline(now, undefined)` does
     * `setDate(NaN)` and then `toISOString()` on an invalid date, which raises a RangeError — so
     * this line would have killed `addQuery` for any agent with no stated weeks. The guard §3 adds
     * stays regardless; this path simply no longer reaches it.
     */
    const agent = agents.find(a => a.id === q.agentId);
    const dead: string | undefined = undefined;

    const id = q.id || "q-" + Math.random().toString(36).substr(2, 9);
    const newQ: any = {
      ...q,
      id,
      userId: currentUser.id,
      status: q.status || QueryStatus.QUERIED,
      dateSent: q.dateSent || new Date().toISOString(),
      responseDeadline: q.status === QueryStatus.QUERIED ? (q as any).responseDeadline || dead : undefined
    };
    // Firestore (no ignoreUndefinedProperties) rejects undefined fields. An advanced-status
    // import sets responseDeadline: undefined above; strip every undefined so the write — and
    // therefore the per-query log seed below — actually lands.
    for (const k of Object.keys(newQ)) {
      if (newQ[k] === undefined) delete newQ[k];
    }

    // Query-sent log entry, always present. When the query is created at an ADVANCED status
    // (CSV import can pass one), append a second entry stamped with that status so derivation
    // reproduces the seeded status immediately — without depending on the backfill timer.
    const nowMs = Date.now();
    const seedActivities = (): Activity[] => {
      const out: Activity[] = [
        {
          id: "act-" + Math.random().toString(36).substr(2, 9),
          userId: currentUser.id,
          queryId: id,
          manuscriptId: q.manuscriptId,
          activityType: ActivityType.QUERY_SENT,
          description: `Query sent to ${agent?.name || "agent"} at ${agent?.agency || "agency"}`,
          date: new Date(nowMs).toISOString(),
          details: `Sent via ${q.sendMethod || agent?.submissionMethod || "Email"}`,
          resultingStatus: QueryStatus.QUERIED,
        },
      ];
      if (newQ.status && newQ.status !== QueryStatus.QUERIED) {
        out.push({
          id: "act-" + Math.random().toString(36).substr(2, 9),
          userId: currentUser.id,
          queryId: id,
          manuscriptId: q.manuscriptId,
          activityType: ActivityType.STATUS_CHANGED,
          description: statusReconstructionNote(newQ.status),
          // 1ms after the query-sent entry so it derives as the latest status.
          date: new Date(nowMs + 1).toISOString(),
          details: "",
          resultingStatus: newQ.status,
        });
      }
      return out;
    };

    try {
      await setDoc(doc(db, "users", currentUser.id, "queries", id), newQ);

      const seeded = seedActivities();
      // Global feed projection for every seeded entry.
      for (const act of seeded) {
        await setDoc(doc(db, "users", currentUser.id, "activities", act.id), act);
      }
      // Advanced-status seed goes into the AUTHORITATIVE per-query subcollection too, so the
      // imported query's derived status matches its seed without waiting on the backfill.
      const advanced = seeded.find(a => a.resultingStatus && a.resultingStatus !== QueryStatus.QUERIED);
      if (advanced) {
        const manuscriptTitle = manuscripts.find(m => m.id === q.manuscriptId)?.title || "";
        await setDoc(doc(db, "users", currentUser.id, "queries", id, "activity", advanced.id), {
          type: advanced.resultingStatus,
          resultingStatus: advanced.resultingStatus,
          createdAt: Timestamp.fromDate(new Date(advanced.date)),
          note: advanced.description,
          queryId: id,
          agentName: agent?.name || "The agent",
          manuscriptTitle,
        });
        await recomputeQueryOnline(currentUser.id, id);
      }
      return { success: true, id };
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${currentUser.id}/queries/${id}`);
      return { success: false, error: "Failed to dispatch Query." };
    }
  };

  // ── Derived status: the ONLY writer of status / pipeline dates / revisionRound /
  //    hasAgentResponded. Every mutation appends to the activity log, then recomputes. ──

  /** Change the activity log first, then call this to derive the query's fields from it. */
  const recompute = async (queryId: string) => {
    if (!currentUser) return;
    await recomputeQueryOnline(currentUser.id, queryId);
  };

  // Status logs with multiple events mapping
  const updateQueryStatus = async (queryId: string, newStatus: QueryStatus, systemNotes?: string) => {
    if (!currentUser) return;
    const targetQ = queries.find(q => q.id === queryId);
    if (!targetQ) return;

    const oldStatus = targetQ.status;
    if (oldStatus === newStatus) return;

    const agent = agents.find(a => a.id === targetQ.agentId);
    const agentFirstName = agent?.name ? agent.name.split(" ")[0] : "the agent";
    const calcDeadline = () => {
      if (agent) {
        const d = new Date();
        d.setDate(d.getDate() + (agent.responseTimeWeeks * 7));
        return d.toISOString();
      }
      return new Date(Date.now() + 6 * 7 * 24 * 60 * 60 * 1000).toISOString();
    };
    const formattedDeadStr = formatHumanDate(calcDeadline());

    const missedActivities: Omit<Activity, "id">[] = [];
    const dateStr = new Date().toISOString();

    const sequence: QueryStatus[] = [
      QueryStatus.QUERIED,
      QueryStatus.PARTIAL_REQUESTED,
      QueryStatus.PARTIAL_SENT,
      QueryStatus.FULL_REQUESTED,
      QueryStatus.FULL_SENT
    ];

    const startIndex = sequence.indexOf(oldStatus);
    const endIndex = sequence.indexOf(newStatus);

    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      for (let i = startIndex + 1; i <= endIndex; i++) {
        const skippedState = sequence[i];

        if (skippedState === QueryStatus.PARTIAL_REQUESTED) {
          missedActivities.push({
            userId: currentUser.id,
            queryId,
            manuscriptId: targetQ.manuscriptId,
            activityType: ActivityType.STATUS_CHANGED,
            description: `${agent?.name || "The agent"} at ${agent?.agency || "agency"} requested a partial manuscript`,
            date: dateStr,
            details: `Respond by ${formattedDeadStr}`,
            resultingStatus: QueryStatus.PARTIAL_REQUESTED
          });
        } else if (skippedState === QueryStatus.PARTIAL_SENT) {
          missedActivities.push({
            userId: currentUser.id,
            queryId,
            manuscriptId: targetQ.manuscriptId,
            activityType: ActivityType.MATERIALS_SENT,
            description: materialsSentDescription(QueryStatus.PARTIAL_SENT, agent),
            date: dateStr,
            details: `Expected a response by ${formattedDeadStr}`,
            resultingStatus: QueryStatus.PARTIAL_SENT
          });
        } else if (skippedState === QueryStatus.FULL_REQUESTED) {
          missedActivities.push({
            userId: currentUser.id,
            queryId,
            manuscriptId: targetQ.manuscriptId,
            activityType: ActivityType.STATUS_CHANGED,
            description: `${agent?.name || "The agent"} at ${agent?.agency || "agency"} requested a full manuscript`,
            date: dateStr,
            details: `Respond by ${formattedDeadStr}`,
            resultingStatus: QueryStatus.FULL_REQUESTED
          });
        } else if (skippedState === QueryStatus.FULL_SENT) {
          missedActivities.push({
            userId: currentUser.id,
            queryId,
            manuscriptId: targetQ.manuscriptId,
            activityType: ActivityType.MATERIALS_SENT,
            description: materialsSentDescription(QueryStatus.FULL_SENT, agent),
            date: dateStr,
            details: `Expected a response by ${formattedDeadStr}`,
            resultingStatus: QueryStatus.FULL_SENT
          });
        }
      }
    } else {
      let activityType = ActivityType.STATUS_CHANGED;
      let desc = `Status updated to ${newStatus}`;
      let detailsLine = systemNotes || "";

      if (newStatus === QueryStatus.QUERIED) {
        desc = `Query sent to ${agent?.name || "agent"} at ${agent?.agency || "agency"}`;
        detailsLine = `Sent via ${targetQ.sendMethod || agent?.submissionMethod || "Email"}`;
      } else if (newStatus === QueryStatus.PARTIAL_REQUESTED) {
        desc = `${agent?.name || "The agent"} at ${agent?.agency || "agency"} requested a partial manuscript`;
        detailsLine = `Respond by ${formattedDeadStr}`;
      } else if (newStatus === QueryStatus.PARTIAL_SENT) {
        activityType = ActivityType.MATERIALS_SENT;
        desc = materialsSentDescription(QueryStatus.PARTIAL_SENT, agent);
        detailsLine = `Expected a response by ${formattedDeadStr}`;
      } else if (newStatus === QueryStatus.FULL_REQUESTED) {
        desc = `${agent?.name || "The agent"} at ${agent?.agency || "agency"} requested a full manuscript`;
        detailsLine = `Respond by ${formattedDeadStr}`;
      } else if (newStatus === QueryStatus.FULL_SENT) {
        activityType = ActivityType.MATERIALS_SENT;
        desc = materialsSentDescription(QueryStatus.FULL_SENT, agent);
        detailsLine = `Expected a response by ${formattedDeadStr}`;
      } else if (newStatus === QueryStatus.REVISE_RESUBMIT) {
        desc = `Revise & Resubmit request received from ${agent?.name || "the agent"} at ${agent?.agency || "agency"}`;
        detailsLine = `Respond by ${formattedDeadStr}`;
      } else if (newStatus === QueryStatus.OFFER) {
        desc = `Congratulations! You've received an offer of representation from ${agent?.name || "the agent"} at ${agent?.agency || "agency"}!`;
        detailsLine = `Respond by ${formattedDeadStr}`;
      } else if (newStatus === QueryStatus.REJECTED) {
        desc = `Rejection received from ${agent?.name || "the agent"} at ${agent?.agency || "agency"}`;
        detailsLine = "Query closed. Don't worry - it's all part of the journey.";
      } else if (newStatus === QueryStatus.WITHDRAWN) {
        desc = `Withdrew query from ${agent?.name || "the agent"} at ${agent?.agency || "agency"}.`;
        detailsLine = "Query closed";
      } else if (newStatus === QueryStatus.NO_RESPONSE) {
        desc = `No response received from ${agent?.name || "the agent"} at ${agent?.agency || "agency"}`;
        detailsLine = "This query reached its active tracking deadline and has been closed";
      }

      missedActivities.push({
        userId: currentUser.id,
        queryId,
        manuscriptId: targetQ.manuscriptId,
        activityType,
        description: desc,
        date: dateStr,
        details: detailsLine,
        resultingStatus: newStatus
      });
    }

    // Stagger same-batch timestamps by 1ms so the derived "latest" entry is the last in the
    // sequence deterministically, not whichever random id happens to tiebreak highest.
    const baseTime = new Date(dateStr).getTime();
    missedActivities.forEach((act, i) => {
      act.date = new Date(baseTime + i).toISOString();
    });

    // Status / pipeline dates are NOT written here — the log changes, then recompute derives them.
    try {
      const manuscriptTitle = manuscripts.find(m => m.id === targetQ.manuscriptId)?.title || "";
      for (const act of missedActivities) {
         const actId = "act-" + Math.random().toString(36).substr(2, 9);
         await setDoc(doc(db, "users", currentUser.id, "activities", actId), {
           ...act,
           id: actId
         });
         // Authoritative per-query log entry — this is what recompute derives from (and what
         // the reading-pane timeline renders). The global feed write above is its projection.
         await setDoc(doc(db, "users", currentUser.id, "queries", queryId, "activity", actId), {
           type: act.resultingStatus,
           resultingStatus: act.resultingStatus,
           createdAt: Timestamp.fromDate(new Date(act.date)),
           note: act.description,
           queryId,
           agentName: agent?.name || "The agent",
           manuscriptTitle
         });
      }
      await recompute(queryId);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${currentUser.id}/queries/${queryId}`);
    }
  };

  // Writer marks materials as sent (Partial/Full Sent). One atomic-ish write: status + the
  // matching *SentDate + optional writerExpectedDate/nudgeDate + one MATERIALS_SENT activity.
  // NOT a response: never touches responseReceivedAt and never increments the response count.
  const recordMaterialsSent = async (args: {
    queryId: string;
    targetStatus: QueryStatus.PARTIAL_SENT | QueryStatus.FULL_SENT;
    sentDate: string;
    isResubmit?: boolean;
    /* ⚠️ §2 · NAMED FOR THE FIELD IT WRITES. It was `responseDeadline`, which meant a caller said
       one thing and a different column was written — the same ambiguity at the parameter that §2
       closed at the seam. */
    writerExpectedDate?: string;
    nudgeDate?: string;
  }) => {
    if (!currentUser) return;
    const { queryId, targetStatus, sentDate, isResubmit, writerExpectedDate, nudgeDate } = args;
    const targetQ = queries.find(q => q.id === queryId);
    if (!targetQ) return;

    const agent = agents.find(a => a.id === targetQ.agentId);
    // Chosen date, clamped monotonic with the log: a date-only pick lands at midnight, which
    // would sort BEFORE a same-day "requested" entry — and under derivation, ordering IS status.
    const desiredMillis = new Date(sentDate).getTime();
    const eventMillis = await monotonicEventTime(currentUser.id, queryId, desiredMillis);
    const sentISO = new Date(eventMillis).toISOString();

    // Round used only for the description text ("Revised manuscript (v2) resubmitted…").
    // The STORED revisionRound is derived from the log by recompute, never written here.
    const descriptionRound = isResubmit ? (targetQ.revisionRound ?? 1) + 1 : undefined;

    // Only the writer-supplied inputs are written directly; status/dates/round are derived.
    const qUpdates: Record<string, any> = {};
    /**
     * ⚠️ §2 · THE WRITER'S FIELD, NOT `responseDeadline`. This control asks the writer when they
     * expect to hear back and used to store the answer in the field `addQuery` also seeded from the
     * AGENCY's window — so one column held two people's claims and neither could be told from the
     * other. It is the writer setting a date, so it is writer-attributed, and it carries the §1
     * stamp because `writerExpectedWrite` is the only way either column is written.
     */
    if (writerExpectedDate) Object.assign(qUpdates, writerExpectedWrite(new Date(writerExpectedDate).toISOString()));
    if (nudgeDate) qUpdates.nudgeDate = new Date(nudgeDate).toISOString();

    const description = materialsSentDescription(targetStatus, agent, {
      resubmit: isResubmit,
      round: descriptionRound,
    });
    const details = writerExpectedDate ? `Expected a response by ${formatHumanDate(writerExpectedDate)}` : "";

    const activity: Omit<Activity, "id"> = {
      userId: currentUser.id,
      queryId,
      manuscriptId: targetQ.manuscriptId,
      activityType: ActivityType.MATERIALS_SENT,
      description,
      date: sentISO,
      details,
      resultingStatus: targetStatus,
    };

    try {
      if (Object.keys(qUpdates).length > 0) {
        await updateDoc(doc(db, "users", currentUser.id, "queries", queryId), qUpdates);
      }
      // Two stores, two surfaces (same split recordQueryResponse uses):
      //  - the per-query `activity` subcollection is the AUTHORITATIVE log — recompute derives
      //    from it, and the reading-pane timeline renders it.
      //  - the global `activities` feed is its projection for the Dashboard.
      const manuscriptTitle = manuscripts.find(m => m.id === targetQ.manuscriptId)?.title || "";
      const subRef = doc(collection(db, "users", currentUser.id, "queries", queryId, "activity"));
      await setDoc(subRef, {
        type: targetStatus,
        resultingStatus: targetStatus,
        createdAt: Timestamp.fromDate(new Date(sentISO)),
        note: description,
        queryId,
        agentName: agent?.name || "The agent",
        manuscriptTitle,
      });
      const actId = "act-" + Math.random().toString(36).substr(2, 9);
      await setDoc(doc(db, "users", currentUser.id, "activities", actId), { ...activity, id: actId });
      await recompute(queryId);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${currentUser.id}/queries/${queryId}`);
    }
  };

  // Auto-close: when the writer chose "Mark as no response automatically" at log time, close the
  // query once its response deadline has passed with no reply. Reuses updateQueryStatus for the
  // status change + "No response received…" timeline activity; the recompute inside it derives
  // EVERY audit/date field from the log — lastStatusChange (the latest rung, ≈ the close time,
  // which is what dates the close for Fortnight), responseReceivedAt (absent: a no-response
  // close is not an agent response) and rejectedDate (absent). No close path stamps anything any
  // more, so the paths cannot disagree — the close-path TODO this block carried is CLOSED
  // (Tier 3 · Phase 4). Idempotent — once a query leaves QUERIED it no longer matches.
  useEffect(() => {
    if (!currentUser || queries.length === 0) return;
    const timer = setTimeout(() => {
      const now = Date.now();
      const toClose = queries.filter(q =>
        q.status === QueryStatus.QUERIED &&
        q.ifNoResponse === "Mark as no response automatically" &&
        q.responseDeadline &&
        new Date(q.responseDeadline).getTime() < now
      );
      toClose.forEach(async (q) => {
        try {
          await updateQueryStatus(
            q.id,
            QueryStatus.NO_RESPONSE,
            "Automatically closed — no response by the deadline you set."
          );
        } catch (err) {
          console.error("[ScriptAlly] Auto-close failed:", err);
        }
      });
    }, 2500);
    return () => clearTimeout(timer);
  }, [currentUser, queries]);

  /**
   * Undo a status change: delete the most recent status-bearing activity from the log, then
   * recompute — the status, dates, round, and response flag all follow from the trimmed log.
   * Replaces the old 60-second-window heuristic and the manual fieldsToClear table, both of
   * which recompute supersedes. `previousStatus` is unused (derivation produces it);
   * `newStatus` is used only to prefer deleting the exact entry the undone change created.
   */
  const undoQueryStatus = async (queryId: string, _previousStatus: QueryStatus, newStatus: QueryStatus) => {
    if (!currentUser) return;

    try {
      // Authoritative log: the per-query subcollection.
      const snap = await getDocs(collection(db, "users", currentUser.id, "queries", queryId, "activity"));
      const docs = snap.docs
        .map(d => ({ ref: d.ref, derivable: subcollectionDocToDerivable(d.id, d.data()) }))
        .filter(d => d.derivable.resultingStatus !== null && d.derivable.resultingStatus !== undefined)
        .sort((a, b) => getActivityTime(a.derivable.date) - getActivityTime(b.derivable.date));
      const target =
        [...docs].reverse().find(d => d.derivable.resultingStatus === newStatus) ??
        docs[docs.length - 1];

      if (target) {
        await deleteDoc(target.ref);

        // Best-effort: remove the matching global-feed projection row (same query, same
        // resultingStatus, latest). Legacy rows without resultingStatus can't be matched — the
        // feed is a projection, so an orphan row there can no longer corrupt status.
        const projection = activities
          .filter(act => act.queryId === queryId && act.resultingStatus === target.derivable.resultingStatus)
          .sort((a, b) => getActivityTime(a.date) - getActivityTime(b.date))
          .pop();
        if (projection) {
          try {
            await deleteDoc(doc(db, "users", currentUser.id, "activities", projection.id));
          } catch (e) {
            console.error("Undo: global-feed projection delete failed (non-fatal):", e);
          }
        }
      }

      await recompute(queryId);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${currentUser.id}/queries/${queryId}`);
    }
  };

  // Journal entry logger
  const addJournalEntry = async (queryId: string, entryText: string) => {
    if (!currentUser) return;
    const id = "j-" + Math.random().toString(36).substr(2, 9);
    const newEntry: JournalEntry = {
      id,
      userId: currentUser.id,
      queryId,
      entryText,
      createdAt: new Date().toISOString()
    };
    try {
      await setDoc(doc(db, "users", currentUser.id, "journalEntries", id), newEntry);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${currentUser.id}/journalEntries/${id}`);
    }
  };

  const deleteJournalEntry = async (id: string) => {
    if (!currentUser) return;
    try {
      await deleteDoc(doc(db, "users", currentUser.id, "journalEntries", id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `users/${currentUser.id}/journalEntries/${id}`);
    }
  };

  /**
   * §1c — pin state, per note.
   *
   * ⚠️ ITS OWN WRITER RATHER THAN A WIDENED `updateJournalEntry`, because they carry different
   * risks: one rewrites the writer's prose and one flips a boolean, and a single function taking
   * `Partial<JournalEntry>` is how a pin toggle comes to clear an entry's text. Both keys are in
   * the update allowlist; `pinned` is optional, so an unpinned note simply does not carry it.
   */
  const pinJournalEntry = async (id: string, pinned: boolean) => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, "users", currentUser.id, "journalEntries", id), { pinned });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${currentUser.id}/journalEntries/${id}`);
    }
  };

  const updateJournalEntry = async (id: string, entryText: string) => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, "users", currentUser.id, "journalEntries", id), { entryText });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${currentUser.id}/journalEntries/${id}`);
    }
  };

  // Notes — user-authored desk notes / dated tasks. Owner-scoped subcollection; isolated path,
  // never denormalised onto query/agent records. Dates are ISO strings (dueDate date-only).
  const addNote = async (fields: { text: string; colour?: Note["colour"]; dueDate?: string | null }) => {
    if (!currentUser) return;
    const id = "note-" + Math.random().toString(36).substr(2, 9);
    const now = new Date().toISOString();
    const newNote: Note = {
      id,
      userId: currentUser.id,
      text: fields.text,
      colour: fields.colour ?? "pink",
      dueDate: fields.dueDate ?? null,
      done: false,
      doneAt: null,
      createdAt: now,
      updatedAt: now
    };
    try {
      await setDoc(doc(db, "users", currentUser.id, "notes", id), newNote);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${currentUser.id}/notes/${id}`);
    }
  };

  /**
   * Resolve a typed genre to a stored id (taxonomy guardrails, Stage 3b). Canonical / existing
   * personal → return that id, no write. A genuinely new label → append it to the user's
   * personalGenres (the user doc — no new read) AND write an idempotent genreSuggestions entry
   * (the promotion signal). Junk / at-the-cap → { ok:false, reason } for the picker to surface.
   */
  const addPersonalGenre = async (
    rawLabel: string
  ): Promise<{ ok: true; id: string; label: string } | { ok: false; reason: string }> => {
    if (!currentUser) return { ok: false, reason: "You need to be signed in." };
    const personal = currentUser.personalGenres ?? [];
    const r = resolveGenre(rawLabel, currentUser.id, personal);
    if (r.status === "rejected" || r.status === "at-limit") return { ok: false, reason: r.reason };
    if (r.status === "canonical" || r.status === "personal") return { ok: true, id: r.id, label: r.label };

    // new-personal: persist on the user doc + record the promotion signal.
    const next = [...personal, { id: r.id, label: r.label }];
    await updateUserProfile({ personalGenres: next });
    try {
      const key = matchKey(rawLabel);
      const suggId = `${currentUser.id}__${key.replace(/\s+/g, "-")}`;
      await setDoc(doc(db, "genreSuggestions", suggId), {
        id: suggId,
        normalisedLabel: key,
        label: r.label,
        userId: currentUser.id,
        createdAt: new Date().toISOString(),
      });
    } catch {
      // The suggestion is a nice-to-have signal, not load-bearing — never block the genre add on it.
    }
    return { ok: true, id: r.id, label: r.label };
  };

  const updateNote = async (
    id: string,
    fields: Partial<Pick<Note, "text" | "colour" | "dueDate" | "done" | "doneAt">>
  ) => {
    if (!currentUser) return;
    try {
      // updatedAt is always bumped; completion stamps doneAt at the call site (updateNote(id, { done:true, doneAt: now })).
      await updateDoc(doc(db, "users", currentUser.id, "notes", id), {
        ...fields,
        updatedAt: new Date().toISOString()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${currentUser.id}/notes/${id}`);
    }
  };

  const deleteNote = async (id: string) => {
    if (!currentUser) return;
    try {
      await deleteDoc(doc(db, "users", currentUser.id, "notes", id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `users/${currentUser.id}/notes/${id}`);
    }
  };


  // ── User tasks (users/{uid}/tasks) — the canonical stored to-do object. Record scope is INPUT
  //    (queryId/agentId/manuscriptId), not derived state; omitted when absent (Firestore rejects
  //    undefined). The "N tasks" badge count stays DERIVED — nothing counts is cached here. ──
  const addUserTask = async (fields: { id?: string; text?: string; detail?: string; queryId?: string; agentId?: string; manuscriptId?: string; dueDate?: string; surfaceOffset?: SurfaceOffset; tags?: string[] }): Promise<string | undefined> => {
    if (!currentUser) return undefined;
    const text = (fields.text ?? "").trim();
    if (!text) return undefined; // never create an empty task
    // The caller may supply the id (the composer needs to know it BEFORE the optimistic insert so
    // it can hide the in-flight doc until the write resolves); otherwise generate one.
    const id = fields.id ?? "task-" + Math.random().toString(36).substr(2, 9);
    const now = new Date().toISOString();
    const newTask: UserTask = {
      id, userId: currentUser.id, text, done: false, createdAt: now, updatedAt: now,
      ...(fields.detail && fields.detail.trim() ? { detail: fields.detail.trim() } : {}),
      ...(fields.queryId ? { queryId: fields.queryId } : {}),
      ...(fields.agentId ? { agentId: fields.agentId } : {}),
      ...(fields.manuscriptId ? { manuscriptId: fields.manuscriptId } : {}),
      ...(fields.dueDate ? { dueDate: fields.dueDate } : {}),
      // surfaceOffset only rides a DATED task; the "on-day" default is omitted (leanest write).
      ...(fields.dueDate && fields.surfaceOffset && fields.surfaceOffset !== "on-day" ? { surfaceOffset: fields.surfaceOffset } : {}),
      ...(fields.tags && fields.tags.length ? { tags: fields.tags } : {}),
    };
    try {
      await setDoc(doc(db, "users", currentUser.id, "tasks", id), newTask);
      return id;
    } catch (e) {
      // The save state machine needs the CODE (permission vs network); handleFirestoreError throws
      // a message-only Error that discards it. Log without PII (its format), then throw the typed
      // error so the composer can classify. (setDoc rejects on server denial — the optimistic local
      // write is rolled back by the onSnapshot listener regardless.)
      console.error(`Firestore error [WRITE] users/${currentUser.id}/tasks/${id}: ${e instanceof Error ? e.message : String(e)}`);
      throw new TodoWriteError(classifyWriteError(e), "user task write failed");
    }
  };

  const updateUserTask = async (
    id: string,
    fields: Partial<Pick<UserTask, "text" | "done" | "completedAt">> & {
      detail?: string | null; dueDate?: string | null; surfaceOffset?: SurfaceOffset | null;
      committedDate?: string | null; tags?: string[] | null; estimateMin?: number | null;
    },
  ) => {
    if (!currentUser) return;
    const { committedDate, detail, dueDate, surfaceOffset, tags, estimateMin, ...rest } = fields;
    const patch: Record<string, unknown> = { ...rest, updatedAt: new Date().toISOString() };
    // `null` clears the Today's-list commitment (uncommit); a string sets it.
    if (committedDate !== undefined) patch.committedDate = committedDate === null ? deleteField() : committedDate;
    /* board fixes II P1 — the ⋯ Edit needs to CLEAR fields (a task losing its date becomes a
       note, per the two-natures law), so the committedDate null-convention now covers the three
       optional fields too. `undefined` still means "leave it alone" — never sent. */
    if (detail !== undefined) patch.detail = detail === null ? deleteField() : detail;
    if (dueDate !== undefined) patch.dueDate = dueDate === null ? deleteField() : dueDate;
    if (surfaceOffset !== undefined) patch.surfaceOffset = surfaceOffset === null ? deleteField() : surfaceOffset;
    // tasks-pages P5: null (or an emptied list) detaches every tag — the field leaves the doc.
    if (tags !== undefined) patch.tags = tags === null || tags.length === 0 ? deleteField() : tags;
    // board-optimise P7: null is the ladder's "none" rung — the field leaves the doc
    if (estimateMin !== undefined) patch.estimateMin = estimateMin === null ? deleteField() : estimateMin;
    try {
      await updateDoc(doc(db, "users", currentUser.id, "tasks", id), patch);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${currentUser.id}/tasks/${id}`);
    }
  };

  const deleteUserTask = async (id: string) => {
    if (!currentUser) return;
    try {
      await deleteDoc(doc(db, "users", currentUser.id, "tasks", id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `users/${currentUser.id}/tasks/${id}`);
    }
  };

  const updateQuery = async (queryId: string, fields: Partial<Query>) => {
    if (!currentUser) return;
    const targetQ = queries.find(q => q.id === queryId);
    if (!targetQ) return;

    try {
      await updateDoc(doc(db, "users", currentUser.id, "queries", queryId), fields);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${currentUser.id}/queries/${queryId}`);
    }
  };

  // General add activity logger
  const addActivity = async (act: Omit<Activity, "id" | "userId"> & { id?: string }): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) return { success: false, error: "Session required." };
    const id = act.id || "act-" + Math.random().toString(36).substr(2, 9);
    const newAct: Activity = {
      ...act,
      id,
      userId: currentUser.id
    };

    try {
      await setDoc(doc(db, "users", currentUser.id, "activities", id), newAct);
      return { success: true };
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${currentUser.id}/activities/${id}`);
      return { success: false, error: "Failed to persist activity." };
    }
  };

  /**
   * Correction primitive: delete an activity, then recompute — the query's status, dates,
   * round, and response flag follow the corrected log. Online it also removes the same-id
   * per-query log entry when one exists (updateQueryStatus and the backfill write the two
   * stores under one id; response/mark-sent projections have independent ids and are cosmetic).
   */
  /**
   * ⚠️ REMOVAL WITH AN INVERSE — the correction sheet promises an undo, so one has to exist.
   *
   * `deleteActivity` has no counterpart, and the first wiring of the correction sheet handed its
   * toast an empty restore: the writer would have been offered "Undo", pressed it, and been told
   * the entries were back while nothing moved. That is worse than offering no undo at all, because
   * it converts a recoverable mistake into one the writer believes they already fixed.
   *
   * ⚠️ THE DOCUMENTS ARE READ BEFORE THEY ARE DELETED, and the closure holds them. Restoring "by id"
   * is only possible if something kept the contents, and after the delete there is nowhere left to
   * read them from — so the capture happens first or not at all.
   *
   * ⚠️ AND BOTH STORES TRAVEL TOGETHER. An entry is a projection in the global feed and a document
   * in the query's own log; restoring one would leave the timeline and the feed disagreeing about
   * what happened, which is the exact divergence the two-store arrangement is written to avoid.
   */
  const deleteActivities = async (ids: string[]): Promise<() => Promise<void>> => {
    if (!currentUser) return async () => {};
    const uid = currentUser.id;
    const captured: { id: string; queryId?: string; feed?: any; log?: any }[] = [];

    for (const id of ids) {
      const queryId = activities.find((a) => a.id === id)?.queryId;
      const feedRef = doc(db, "users", uid, "activities", id);
      const feedSnap = await getDoc(feedRef);
      let log: any;
      if (queryId) {
        const logSnap = await getDoc(doc(db, "users", uid, "queries", queryId, "activity", id));
        if (logSnap.exists()) log = logSnap.data();
      }
      captured.push({ id, queryId, feed: feedSnap.exists() ? feedSnap.data() : undefined, log });
    }

    for (const id of ids) await deleteActivity(id);

    return async () => {
      for (const c of captured) {
        if (c.feed) await setDoc(doc(db, "users", uid, "activities", c.id), c.feed);
        if (c.log && c.queryId) await setDoc(doc(db, "users", uid, "queries", c.queryId, "activity", c.id), c.log);
      }
      /* ⚠️ RECOMPUTE ONCE PER QUERY, AFTER EVERY DOCUMENT IS BACK — a recompute run between two
         restores would derive from a log that is momentarily half-restored, and write a status the
         writer never had. */
      const qids = Array.from(new Set(captured.map((c) => c.queryId).filter(Boolean) as string[]));
      for (const qid of qids) await recompute(qid);
    };
  };

  const deleteActivity = async (id: string) => {
    if (!currentUser) return;
    const target = activities.find(act => act.id === id);

    try {
      await deleteDoc(doc(db, "users", currentUser.id, "activities", id));
      if (target?.queryId) {
        try {
          await deleteDoc(doc(db, "users", currentUser.id, "queries", target.queryId, "activity", id));
        } catch {
          // No same-id twin in the authoritative log — nothing status-bearing to remove.
        }
        await recompute(target.queryId);
        // A deleted NUDGE must FULLY undo (the delete-desync fix): recompute derives status/dates but
        // never touches nudgeDate/lastNudgeSentDate, which grace + tasks read. Re-derive that snapshot
        // from the REMAINING nudge activities (or clear it), and release the snoozed reminder flag when
        // none remain — so the query drops out of grace and behaves as never-nudged.
        if (target.activityType === ActivityType.NUDGE_SENT) {
          try {
            const snap = await getDocs(collection(db, "users", currentUser.id, "queries", target.queryId, "activity"));
            const remaining = snap.docs.map((d) => d.data()).filter((d) => (d as any).type === NUDGE_NESTED_TYPE) as StoredNudge[];
            const rec = reconcileNudge(remaining);
            await updateDoc(doc(db, "users", currentUser.id, "queries", target.queryId), {
              nudgeDate: rec.nudgeDate ?? (deleteField() as unknown as string),
              lastNudgeSentDate: rec.lastNudgeSentDate ?? (deleteField() as unknown as string),
            });
            if (!rec.hasNudges) await resolveTaskFlag(flagKeyForTask("nudge_overdue", target.queryId));
          } catch {
            // Best-effort: the activity delete already committed; a failed reconcile must not surface.
          }
        }
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `users/${currentUser.id}/activities/${id}`);
    }
  };

  /**
   * Correction primitive: patch one entry in a query's AUTHORITATIVE activity log (the per-query
   * subcollection), then recompute. Fixing a mis-recorded event — its date, wording, or the
   * status it produced — mutates the log and the derived fields follow. The correction UI (next
   * task) calls this.
   */
  const editActivity = async (
    queryId: string,
    activityId: string,
    patch: Partial<Pick<Activity, "description" | "details" | "date" | "resultingStatus">>
  ) => {
    if (!currentUser) return;

    try {
      // Map the Activity-shaped patch onto the subcollection doc's field names.
      const subPatch: Record<string, any> = {};
      if (patch.description !== undefined) subPatch.note = patch.description;
      /**
       * ⚠️ `details` WAS ACCEPTED AND NEVER MAPPED — a silent divergence between the two stores.
       * The patch type has always listed it, and this block handled description, date and
       * resultingStatus only, so a details edit reached the GLOBAL projection while the
       * AUTHORITATIVE log kept the old value. Nothing caught it because the one caller
       * (`TimelineComposer`) never sent one; the correction form sends details for most of what a
       * note edit is, and the fault would surface later as "the edit didn't save".
       *
       * ⚠️ IT MAPS ONTO `note`, LIKE `description`, because the subcollection has one prose field
       * and the timeline renders it beneath the row — which is where both the nudge's follow-up
       * line and the holding reply's kept words already live. A caller sending both wins with
       * `details`, deliberately: it is the field that carries the writer's own words.
       */
      if (patch.details !== undefined) subPatch.note = patch.details;
      if (patch.date !== undefined) subPatch.createdAt = Timestamp.fromDate(new Date(patch.date));
      if (patch.resultingStatus !== undefined) {
        subPatch.type = patch.resultingStatus;
        subPatch.resultingStatus = patch.resultingStatus;
      }
      if (Object.keys(subPatch).length > 0) {
        await updateDoc(doc(db, "users", currentUser.id, "queries", queryId, "activity", activityId), subPatch);
      }
      // Best-effort same-id projection patch in the global feed.
      try {
        await updateDoc(doc(db, "users", currentUser.id, "activities", activityId), patch as Record<string, any>);
      } catch {
        // Projection row has an independent id — cosmetic only, recompute doesn't read it.
      }
      await recompute(queryId);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${currentUser.id}/queries/${queryId}/activity/${activityId}`);
    }
  };

  // User Profile updater
  const updateUserProfile = async (fields: Partial<User>) => {
    if (!currentUser) return;
    const updated = { ...currentUser, ...fields };

    // Optimistically reflect the change locally so UI gates (e.g. the onboarding
    // gate keyed on onboardingComplete) advance immediately and never get stuck
    // waiting on the Firestore round-trip. The onSnapshot listener reconciles
    // with the server copy once the write lands.
    setCurrentUser(updated);

    try {
      await updateDoc(doc(db, "users", currentUser.id), fields);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${currentUser.id}`);
    }
  };

  // ── Task flags — the user's STANCE on a derived task (snooze / commit / skip / resolve). ──
  const DAY_MS = 86400000;
  const upsertTaskFlag = async (
    key: TaskFlagKey,
    patch: { snoozedUntil?: string | null; committedDate?: string | null; skippedAt?: string | null; resolvedAt?: string | null; bumpSnooze?: boolean; unbumpSnooze?: boolean },
  ) => {
    if (!currentUser) return;
    const id = taskFlagId(key);
    const existing = taskFlags.find(f => f.id === id);
    // `null` in a patch CLEARS the field (full-overwrite write); `undefined` keeps the existing value.
    const resolve = (p: string | null | undefined, cur: string | undefined): string | undefined =>
      p === null ? undefined : p !== undefined ? p : cur;
    // unbumpSnooze = the finishing pack's undo compensator: a snooze undo fully restores,
    // INCLUDING the ×n count the bump added (floored at 0; no rules change — the field exists).
    const next: TaskFlag = { id, userId: currentUser.id, taskType: key.taskType, snoozeCount: Math.max(0, (existing?.snoozeCount ?? 0) + (patch.bumpSnooze ? 1 : 0) - (patch.unbumpSnooze ? 1 : 0)) };
    const qid = key.queryId ?? existing?.queryId; if (qid) next.queryId = qid;
    const aid = key.agentId ?? existing?.agentId; if (aid) next.agentId = aid;
    const rule = key.rule ?? existing?.rule; if (rule) next.rule = rule;
    const su = resolve(patch.snoozedUntil, existing?.snoozedUntil); if (su) next.snoozedUntil = su;
    const cd = resolve(patch.committedDate, existing?.committedDate); if (cd) next.committedDate = cd;
    const sk = resolve(patch.skippedAt, existing?.skippedAt); if (sk) next.skippedAt = sk;
    const ra = resolve(patch.resolvedAt, existing?.resolvedAt); if (ra) next.resolvedAt = ra;
    try {
      await setDoc(doc(db, "users", currentUser.id, "taskFlags", id), next);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${currentUser.id}/taskFlags/${id}`);
    }
  };
  const snoozeTaskFlag = (key: TaskFlagKey, days: number) =>
    upsertTaskFlag(key, { snoozedUntil: new Date(Date.now() + days * DAY_MS).toISOString(), bumpSnooze: true });
  const resolveTaskFlag = (key: TaskFlagKey) => upsertTaskFlag(key, { resolvedAt: new Date().toISOString() });
  /** One-shot backfill of the legacy dismissedTasks collection into taskFlags. Nick runs once. */
  const migrateDismissedTasks = async (): Promise<number> => {
    if (!currentUser) return 0;
    let n = 0;
    for (const d of dismissedTasks) {
      const flag = buildTaskFlagFromDismissed(d, currentUser.id);
      try { await setDoc(doc(db, "users", currentUser.id, "taskFlags", flag.id), flag); n++; } catch { /* best-effort */ }
    }
    return n;
  };

  // Task dismissal and snoozing — now writes a taskFlag (dismissedTasks absorbed).
  const dismissTask = async (taskType: string, relatedRecordId: string, dismissType: "permanent" | "fixed snooze" | "custom date", snoozeDays?: number) => {
    if (!currentUser) return;

    if (taskType === "nudge_overdue") {
      const targetQuery = queries.find(qi => qi.id === relatedRecordId);
      if (targetQuery) {
        const agentObj = agents.find(ag => ag.id === targetQuery.agentId);
        
        let daysDiff = 45; // default fallback
        if (targetQuery.dateSent) {
          try {
            const sentTime = new Date(targetQuery.dateSent).getTime();
            const diff = Date.now() - sentTime;
            daysDiff = Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)));
          } catch (e) {
            daysDiff = 45;
          }
        }

        const actId = "act-" + Math.random().toString(36).substr(2, 9);
        const nudgeActivity: Activity = {
          id: actId,
          userId: currentUser.id,
          queryId: relatedRecordId,
          manuscriptId: targetQuery.manuscriptId,
          activityType: ActivityType.NUDGE_SENT,
          description: `Nudge sent to ${agentObj?.name || "agent"} at ${agentObj?.agency || "agency"}`,
          date: new Date().toISOString(),
          details: `They've had your query for ${daysDiff} days`
        };

        setDoc(doc(db, "users", currentUser.id, "activities", actId), nudgeActivity).catch(err => {
          console.error("Failed to write nudge activity into firestore", err);
        });
      }
    }

    // Persist the stance as a taskFlag: fixed snooze → snoozedUntil in N days; permanent → an
    // indefinite mute (MUTED_UNTIL). ("custom date" flows through logNudge, not here.)
    const key = flagKeyForTask(taskType, relatedRecordId);
    const snoozedUntil =
      dismissType === "fixed snooze" && snoozeDays ? new Date(Date.now() + snoozeDays * DAY_MS).toISOString()
      : dismissType === "permanent" ? "3000-01-01T00:00:00.000Z"
      : undefined;
    await upsertTaskFlag(key, { snoozedUntil, bumpSnooze: true });
  };

  // Log a nudge — the smallest-blast-radius write set (see lib/logNudge.ts). Does NOT piggyback on
  // dismissTask, does NOT touch status/responseDeadline, and is not a response.
  const logNudge = async (
    queryId: string,
    args: { checkBackDate: string; note?: string }
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) return { success: false, error: "Session required." };
    const q = queries.find(item => item.id === queryId);
    if (!q) return { success: false, error: "Query not found." };
    const agent = agents.find(a => a.id === q.agentId) || null;

    const writes = buildNudgeWrites(q, agent, args, new Date());

    // 1) ONE event id for both stores (the saveQueryEdits same-id-twin convention).
    //    1a — AUTHORITATIVE: the per-query subcollection the Tracking timeline reads. A failure
    //    here aborts the nudge (nothing else may land without the source-of-truth row).
    const actId = "act-" + Math.random().toString(36).substr(2, 9);
    try {
      await setDoc(doc(db, "users", currentUser.id, "queries", queryId, "activity", actId), writes.nested);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${currentUser.id}/queries/${queryId}/activity/${actId}`);
      return { success: false, error: "Failed to log nudge." };
    }
    //    1b — PROJECTION twin: the global feed the dashboard reads, derived from the SAME build +
    //    id (never an independent parallel write). Best-effort: a missing twin must never fail the
    //    nudge — the authoritative row already landed. (Pending the parked store consolidation.)
    await addActivity({ ...writes.activity, id: actId });

    try {
      // 2) Set the next-nudge field + bookkeeping. updateQuery never touches status/responseDeadline.
      await updateQuery(queryId, writes.queryUpdates);

      // 3) Hide-and-resurface the nudge_overdue task on the check-back date — a taskFlag snooze.
      //    The deterministic key means a repeat nudge updates the same flag (no stacked duplicates).
      await upsertTaskFlag(flagKeyForTask("nudge_overdue", queryId), { snoozedUntil: writes.dismissal.resurfaceDate });
      return { success: true };
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${currentUser.id}/queries/${queryId} [logNudge]`);
      return { success: false, error: "Failed to log nudge." };
    }
  };

  /**
   * PHASE 3 — record a reply that decides nothing.
   *
   * ⚠️ THE TWIN-WRITE CONVENTION, AND DELIBERATELY NOT `recordQueryResponse`. That function is the
   * app's single RESPONSE path and its whole contract is that a rung carries a `resultingStatus`;
   * this event has none by construction. Same shape as `logNudge` — authoritative nested row first
   * (abort on failure, because nothing may land without the source of truth), then the global
   * projection under the SAME id, best-effort.
   *
   * ⚠️ AND NO `recomputeQuery` CALL. There is nothing to recompute: derivation reads only
   * status-bearing rungs, so running it would do identical work for an identical result. Its
   * absence is the clearest statement in this function that the event changes nothing stored.
   *
   * ⚠️ THE UNDO DELETES WHAT THIS CREATED — both twins, no compensating entries (the repo's undo
   * law). Everything the reply affected was derived from those two documents' existence, so
   * removing them restores the previous state exactly.
   */
  const recordHoldingReply = async (
    queryId: string,
    input: { repliedOn: string; weeks?: number | null; note?: string },
  ): Promise<{ success: boolean; error?: string; undo: () => Promise<void> }> => {
    const noop = async () => {};
    if (!currentUser) return { success: false, error: "Session required.", undo: noop };
    const q = queries.find(item => item.id === queryId);
    if (!q) return { success: false, error: "Query not found.", undo: noop };
    const agent = agents.find(a => a.id === q.agentId) || null;

    const writes = buildHoldingReplyWrites(q, agent, input);
    const actId = "act-" + Math.random().toString(36).substr(2, 9);
    try {
      await setDoc(doc(db, "users", currentUser.id, "queries", queryId, "activity", actId), writes.nested);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${currentUser.id}/queries/${queryId}/activity/${actId}`);
      return { success: false, error: "Failed to record the reply.", undo: noop };
    }
    await addActivity({ ...writes.activity, id: actId });
    return {
      success: true,
      undo: async () => {
        try {
          await deleteDoc(doc(db, "users", currentUser.id, "queries", queryId, "activity", actId));
          await deleteDoc(doc(db, "users", currentUser.id, "activities", actId));
        } catch (e) {
          handleFirestoreError(e, OperationType.DELETE, `users/${currentUser.id}/queries/${queryId}/activity/${actId}`);
        }
      },
    };
  };

  /** The interim offer journey's ONE completion write (journey-logic P3): the writer's decision,
   *  never a re-log of the offer. Twin-write convention from logNudge — authoritative nested row
   *  first (abort on fail), then the global projection under the SAME id, then recompute:
   *  DECLINED's resultingStatus WITHDRAWN closes the query via the single deriver; ACCEPTED is
   *  non-status (status stays OFFER; the task dies via hasOfferDecision in the engine). */
  const recordOfferDecision = async (queryId: string, decision: OfferDecision): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) return { success: false, error: "Not signed in." };
    const targetQ = queries.find(q => q.id === queryId);
    if (!targetQ) return { success: false, error: "Query not found." };
    const agent = agents.find(a => a.id === targetQ.agentId);
    const writes = buildOfferDecisionWrites(targetQ, agent, decision, new Date());

    const actId = "act-" + Math.random().toString(36).substr(2, 9);
    try {
      await setDoc(doc(db, "users", currentUser.id, "queries", queryId, "activity", actId), writes.nested);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${currentUser.id}/queries/${queryId}/activity/${actId}`);
      return { success: false, error: "Failed to record the decision." };
    }
    // Projection twin — best-effort (the authoritative row already landed), same id.
    await addActivity({ ...writes.activity, id: actId });
    try {
      await recompute(queryId);
      return { success: true };
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${currentUser.id}/queries/${queryId} [recordOfferDecision]`);
      return { success: false, error: "Recorded, but the query could not be re-derived." };
    }
  };

  return (
    <DbContext.Provider
      value={{
        currentUser,
        smartImportUsage,
        authReady,
        collectionsReady,
        manuscripts,
        versions,
        packages,
        agents,
        communityAgents,
        queries,
        activities,
        journalEntries,
        notes,
        dismissedTasks,
        taskFlags,
        upsertTaskFlag,
        snoozeTaskFlag,
        resolveTaskFlag,
        migrateDismissedTasks,
        tasks,
        login,
        signup,
        resetPassword,
        logout,
        addManuscript,
        updateManuscript,
        updateManuscriptQuiet,
        deleteManuscript,
        setManuscriptShelved,
        addVersion,
        updateVersion,
        deleteVersion,
        addPackage,
        updatePackage,
        retirePackage,
        setActivePackage,
        addAgent,
        updateAgent,
        saveAgentEdits,
        deleteAgent,
        setAgentSetAside,
        addQuery,
        updateQueryStatus,
        recordMaterialsSent,
        recordHoldingReply,
        undoQueryStatus,
        updateQuery,
        deleteQuery,
        addJournalEntry,
        deleteJournalEntry,
        updateJournalEntry,
        pinJournalEntry,
        addNote,
        addPersonalGenre,
        updateNote,
        deleteNote,
        userTasks,
        addUserTask,
        updateUserTask,
        deleteUserTask,
        addActivity,
        deleteActivity,
        deleteActivities,
        editActivity,
        updateUserProfile,
        dismissTask,
        logNudge,
        recordOfferDecision
      }}
    >
      {children}
    </DbContext.Provider>
  );
};

export const useScriptAllyDb = () => {
  const context = useContext(DbContext);
  if (!context) {
    throw new Error("useScriptAllyDb must be used within a DbProvider");
  }
  return context;
};

