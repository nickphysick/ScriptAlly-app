/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import {
  User,
  UserPlan,
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
  DismissedTask,
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
  setDoc,
  getDoc,
  getDocFromServer,
  updateDoc,
  deleteDoc,
  collection,
  onSnapshot,
  getDocs,
  deleteField,
  writeBatch,
  Timestamp,
  serverTimestamp,
  type DocumentReference
} from "firebase/firestore";

import { db, auth, handleFirestoreError, OperationType } from "./firebase";
import { deriveQueryFields, getActivityTime, normalizeResultingStatus } from "./queryDerivation";
import { queriesForManuscript, queriesForAgent, activityIdsForQueries } from "./cascade";
import { recomputeQuery as recomputeQueryOnline, subcollectionDocToDerivable, monotonicEventTime } from "./recomputeQuery";

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
  manuscripts: Manuscript[];
  versions: ManuscriptVersion[];
  packages: SubmissionPackage[];
  agents: Agent[];
  communityAgents: CommunityAgent[];
  queries: Query[];
  activities: Activity[];
  journalEntries: JournalEntry[];
  dismissedTasks: DismissedTask[];
  tasks: Task[];
  login: (email: string, password?: string) => Promise<boolean>;
  signup: (name: string, email: string, password?: string) => Promise<boolean>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  upgradeToPro: () => Promise<void>;
  downgradeToFree: () => Promise<void>;
  
  // Manuscript Actions
  addManuscript: (m: Omit<Manuscript, "id" | "userId" | "statusChangedDate"> & { id?: string }, bypassLimits?: boolean) => Promise<{ success: boolean; error?: string; id?: string }>;
  updateManuscript: (id: string, fields: Partial<Manuscript>) => Promise<void>;
  deleteManuscript: (id: string) => Promise<void>;
  /** Shelve/reactivate — a reversible lifecycle overlay (hides from picker/suggestions; keeps everything). */
  setManuscriptShelved: (id: string, shelved: boolean) => Promise<void>;
  
  // Version Actions
  addVersion: (v: Omit<ManuscriptVersion, "id" | "userId" | "createdDate">) => Promise<void>;
  deleteVersion: (id: string) => Promise<void>;
  
  // Package Actions
  addPackage: (p: Omit<SubmissionPackage, "id" | "userId" | "status" | "createdDate">) => Promise<{ success: boolean; error?: string }>;
  retirePackage: (id: string) => Promise<void>;
  
  // Agent Actions
  addAgent: (a: Omit<Agent, "id" | "userId" | "dateAdded" | "lastCheckedDate"> & { id?: string }, bypassLimits?: boolean) => Promise<{ success: boolean; error?: string; id?: string }>;
  updateAgent: (id: string, fields: Partial<Agent>) => Promise<void>;
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
    responseDeadline?: string; // ISO — optional, set when the writer opts into a reminder
    nudgeDate?: string; // ISO — optional, set when a nudge reminder is chosen
  }) => Promise<void>;
  undoQueryStatus: (id: string, previousStatus: QueryStatus, newStatus: QueryStatus) => Promise<void>;
  updateQuery: (id: string, fields: Partial<Query>) => Promise<void>;
  
  // Journal Actions
  addJournalEntry: (queryId: string, entryText: string) => Promise<void>;
  deleteJournalEntry: (id: string) => Promise<void>;
  updateJournalEntry: (id: string, entryText: string) => Promise<void>;

  // Activity Actions
  addActivity: (act: Omit<Activity, "id" | "userId"> & { id?: string }) => Promise<{ success: boolean; error?: string }>;
  deleteActivity: (id: string) => Promise<void>;
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

  // Clean Utilities
  cleanDuplicates: () => Promise<{ manuscriptsRemoved: number; agentsRemoved: number; queriesMapped: number; queriesRemoved?: number }>;
  wipeAndResetDatabase: () => Promise<void>;
}

const DbContext = createContext<DbContextType | undefined>(undefined);

export const DbProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [versions, setVersions] = useState<ManuscriptVersion[]>([]);
  const [packages, setPackages] = useState<SubmissionPackage[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [communityAgents, setCommunityAgents] = useState<CommunityAgent[]>([]);
  const [queries, setQueries] = useState<Query[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [dismissedTasks, setDismissedTasks] = useState<DismissedTask[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  // Temporary buffer to retain signup pen names
  const signupTempNameRef = useRef<string | null>(null);

  // Helper inside standard DB seeding
  const seedUserDatabase = async (uid: string) => {
    try {
      // Seed Manuscripts
      for (const ms of seedManuscripts) {
        await setDoc(doc(db, "users", uid, "manuscripts", ms.id), { ...ms, userId: uid });
      }
      // Seed Versions
      for (const ver of seedVersions) {
        await setDoc(doc(db, "users", uid, "versions", ver.id), { ...ver, userId: uid });
      }
      // Seed Packages
      for (const pkg of seedPackages) {
        await setDoc(doc(db, "users", uid, "packages", pkg.id), { ...pkg, userId: uid });
      }
      // Seed Agents
      for (const ag of seedAgents) {
        await setDoc(doc(db, "users", uid, "agents", ag.id), { ...ag, userId: uid });
      }
      // Seed Queries
      for (const q of seedQueries) {
        await setDoc(doc(db, "users", uid, "queries", q.id), { ...q, userId: uid });
      }
      // Seed Activities
      for (const act of seedActivities) {
        await setDoc(doc(db, "users", uid, "activities", act.id), { ...act, userId: uid });
      }
      // Seed Journal Entries
      for (const j of seedJournalEntries) {
        await setDoc(doc(db, "users", uid, "journalEntries", j.id), { ...j, userId: uid });
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${uid}/[seed]`);
    }
  };

  // Synchronous database tracking in active real-time subscriber model
  useEffect(() => {
    let unsubUser: () => void = () => {};
    let unsubManuscripts: () => void = () => {};
    let unsubVersions: () => void = () => {};
    let unsubPackages: () => void = () => {};
    let unsubAgents: () => void = () => {};
    let unsubQueries: () => void = () => {};
    let unsubActivities: () => void = () => {};
    let unsubJournal: () => void = () => {};
    let unsubDismissed: () => void = () => {};

    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        // No authenticated user — show the Auth screen
        setCurrentUser(null);

        // Clean up any active listeners
        unsubUser();
        unsubManuscripts();
        unsubVersions();
        unsubPackages();
        unsubAgents();
        unsubQueries();
        unsubActivities();
        unsubJournal();
        unsubDismissed();
        return;
      }

      const uid = firebaseUser.uid;

      // Seed community agents once after authenticated session is established
      seedCommunityAgentsIfEmpty().catch(err => {
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
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${uid}`);
        });

        // Manuscripts reader snap
        unsubManuscripts = onSnapshot(collection(db, "users", uid, "manuscripts"), (snap) => {
          const arr: Manuscript[] = [];
          snap.forEach(d => arr.push(d.data() as Manuscript));
          setManuscripts(arr);
        }, (error) => {
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
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${uid}/agents`);
        });

        // Queries snapshot reader
        unsubQueries = onSnapshot(collection(db, "users", uid, "queries"), (snap) => {
          const arr: Query[] = [];
          snap.forEach(d => arr.push(d.data() as Query));
          setQueries(arr);
        }, (error) => {
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

        // Dismissed snap
        unsubDismissed = onSnapshot(collection(db, "users", uid, "dismissedTasks"), (snap) => {
          const arr: DismissedTask[] = [];
          snap.forEach(d => arr.push(d.data() as DismissedTask));
          setDismissedTasks(arr);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${uid}/dismissedTasks`);
        });

      } catch (err) {
        console.error("Bootstrapping/authentication loading failures:", err);
      }
    });

    return () => {
      unsubAuth();
      unsubUser();
      unsubManuscripts();
      unsubVersions();
      unsubPackages();
      unsubAgents();
      unsubQueries();
      unsubActivities();
      unsubJournal();
      unsubDismissed();
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
    const now = new Date();

    queries.forEach(q => {
      const manuscript = manuscripts.find(m => m.id === q.manuscriptId);
      const agent = agents.find(a => a.id === q.agentId);
      if (!manuscript || !agent) return;

      const mTitle = manuscript.title;
      const aName = agent.name;

      if (q.status === QueryStatus.OFFER) {
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

      if (q.responseDeadline) {
        const deadline = new Date(q.responseDeadline);
        const hasPassed = deadline < now;
        const isAwaiting = q.status === QueryStatus.QUERIED || q.status === QueryStatus.PARTIAL_SENT || q.status === QueryStatus.FULL_SENT;

        if (hasPassed && isAwaiting) {
          if (agent.noResponseMeansNo) {
            calculatedTasks.push({
              id: `task-no-res-close-${q.id}`,
              priority: "suggested",
              title: `No response limit hit: ${aName}`,
              description: `Response deadline passed. Under guidelines, this is a soft pass. Consider archiving.`,
              manuscriptTitle: mTitle,
              context: `Archiving recommendation`,
              relatedRecordId: q.id,
              taskType: "no_response_close",
              actionLabel: "Close Query",
              actionPath: "queries"
            });
          } else {
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
        }
      }
    });

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
            title: `Query Dream Agent: ${a.name}`,
            description: `${a.name} is a 5★ fit for your catalog and is open to subs. Build a pitch!`,
            manuscriptTitle: manuscripts[0]?.title || "Your manuscript",
            context: `High-value match`,
            relatedRecordId: a.id,
            taskType: "dream_agent_unqueried",
            actionLabel: "Send Query",
            actionPath: "queries"
          });
        }
      }

      const hasNoMaterials = !a.materialsWanted || 
        (Array.isArray(a.materialsWanted) 
          ? a.materialsWanted.length === 0 
          : !Object.values(a.materialsWanted).some((v: any) => v === true || v?.selected === true));

      if (a.mswlNotes.trim().length === 0 || hasNoMaterials) {
        calculatedTasks.push({
          id: `task-dq-${a.id}`,
          priority: "suggested",
          title: `Complete MSWL details for ${a.name}`,
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

    const activeTasks = calculatedTasks.filter(t => {
      const match = dismissedTasks.find(d => d.taskType === t.taskType && d.relatedRecordId === t.relatedRecordId);
      if (!match) return true;
      if (match.dismissType === "permanent") return false;
      if (match.resurfaceDate) {
        return new Date(match.resurfaceDate) <= now;
      }
      return false;
    });

    setTasks(activeTasks);
  }, [queries, manuscripts, agents, dismissedTasks, currentUser]);

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
            description: `Added new agent ${ag.name} at ${ag.agency} to your agent list`,
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
        const healId = `act-status-${q.status.replace(/\s+/g, "-").toLowerCase()}-${q.id}`;

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

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Sign out process error:", e);
    }
  };

  const upgradeToPro = async () => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, "users", currentUser.id), {
        plan: UserPlan.PRO,
        subscriptionStatus: "active"
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${currentUser.id}`);
    }
  };

  const downgradeToFree = async () => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, "users", currentUser.id), {
        plan: UserPlan.FREE,
        subscriptionStatus: "none"
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${currentUser.id}`);
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

  // Delete a list of doc refs, batched (Firestore caps a batch at 500 writes, so larger cascades
  // split). Callers order the PARENT ref LAST so a mid-way failure leaves the parent — and a clean
  // retry — intact rather than half-deleting it (D2: no un-batched sequential half-deletes).
  const commitDeletesInBatches = async (refs: DocumentReference[]) => {
    const CHUNK = 450;
    for (let i = 0; i < refs.length; i += CHUNK) {
      const batch = writeBatch(db);
      for (const ref of refs.slice(i, i + CHUNK)) batch.delete(ref);
      await batch.commit();
    }
  };

  const deleteManuscript = async (id: string) => {
    if (!currentUser) return;
    const uid = currentUser.id;
    // Capture title + query count BEFORE the cascade removes them — for the durable delete record.
    const msTitle = manuscripts.find(m => m.id === id)?.title || "a manuscript";
    const qIds = queriesForManuscript(queries, id);
    try {
      const refs: DocumentReference[] = [];
      // Records meaningless without the manuscript: versions, submission packages, notes.
      for (const v of versions.filter(ver => ver.manuscriptId === id)) refs.push(doc(db, "users", uid, "versions", v.id));
      for (const p of packages.filter(pkg => pkg.manuscriptId === id)) refs.push(doc(db, "users", uid, "packages", p.id));
      try {
        const notesSnap = await getDocs(collection(db, "users", uid, "manuscripts", id, "notes"));
        notesSnap.forEach(n => refs.push(n.ref));
      } catch {
        // Best-effort: an unreadable notes subcollection must not block the delete itself.
      }
      // Cascade the dependent queries + their per-query activity log + global-feed projections.
      // (Previously ORPHANED — invisible in the UI yet still counting toward the free-tier limit
      // and unrecoverable. D1/D2.)
      for (const qid of qIds) {
        const actSnap = await getDocs(collection(db, "users", uid, "queries", qid, "activity"));
        actSnap.forEach(a => refs.push(a.ref));
        refs.push(doc(db, "users", uid, "queries", qid));
      }
      for (const aid of activityIdsForQueries(activities, qIds)) refs.push(doc(db, "users", uid, "activities", aid));
      // The manuscript itself — last, so a mid-way failure leaves it (and a retry) intact.
      refs.push(doc(db, "users", uid, "manuscripts", id));
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
  const addVersion = async (v: Omit<ManuscriptVersion, "id" | "userId" | "createdDate">) => {
    if (!currentUser) return;
    const id = "ver-" + Math.random().toString(36).substr(2, 9);
    const newVer: ManuscriptVersion = {
      ...v,
      id,
      userId: currentUser.id,
      createdDate: new Date().toISOString()
    };
    try {
      await setDoc(doc(db, "users", currentUser.id, "versions", id), newVer);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${currentUser.id}/versions/${id}`);
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
  const addPackage = async (p: Omit<SubmissionPackage, "id" | "userId" | "status" | "createdDate">): Promise<{ success: boolean; error?: string }> => {
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
      return { success: true };
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${currentUser.id}/packages/${id}`);
      return { success: false, error: "Database transaction error." };
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
        description: `You added a new agent ${newAg.name} at ${newAg.agency} to your contact list`,
        manuscriptId: "",
        queryId: "",
        date: new Date().toISOString(),
        details: ""
      });
      return { success: true, id };
    }
    return { success: false, error: "Operation failed." };
  };

  const updateAgent = async (id: string, fields: Partial<Agent>) => {
    if (!currentUser) return;
    const existingAgent = agents.find(a => a.id === id);
    if (!existingAgent) return;
    const previousStarRating = existingAgent.starRating;
    const agentName = existingAgent.name;
    const agencyName = existingAgent.agency;

    let writeSuccess = false;
    try {
      await updateDoc(doc(db, "users", currentUser.id, "agents", id), {
        ...fields,
        lastCheckedDate: new Date().toISOString()
      });
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

  const deleteAgent = async (id: string) => {
    if (!currentUser) return;
    const uid = currentUser.id;
    // Capture name + query count BEFORE the cascade removes them — for the durable delete record.
    const agentName = agents.find(a => a.id === id)?.name || "an agent";
    const qIds = queriesForAgent(queries, id);
    try {
      const refs: DocumentReference[] = [];
      // Agent notes subcollection.
      try {
        const notesSnap = await getDocs(collection(db, "users", uid, "agents", id, "notes"));
        notesSnap.forEach(n => refs.push(n.ref));
      } catch {
        // Best-effort: an unreadable notes subcollection must not block the delete.
      }
      // Cascade the dependent queries + their per-query activity log + global-feed projections
      // (previously ORPHANED — invisible yet quota-consuming and unrecoverable. D1/D2).
      for (const qid of qIds) {
        const actSnap = await getDocs(collection(db, "users", uid, "queries", qid, "activity"));
        actSnap.forEach(a => refs.push(a.ref));
        refs.push(doc(db, "users", uid, "queries", qid));
      }
      for (const aid of activityIdsForQueries(activities, qIds)) refs.push(doc(db, "users", uid, "activities", aid));
      // The agent itself — last, so a mid-way failure leaves it (and a retry) intact.
      refs.push(doc(db, "users", uid, "agents", id));
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

    if (!bypassLimits && currentUser.plan === UserPlan.FREE && queries.length >= 10) {
      return {
        success: false,
        error: "Free tier limit is 10 queries. Upgrade to Pro for unlimited query dispatches and pipeline tracking!"
      };
    }

    const agent = agents.find(a => a.id === q.agentId);
    let dead: string | undefined = undefined;
    if (agent) {
      const d = new Date();
      d.setDate(d.getDate() + (agent.responseTimeWeeks * 7));
      dead = d.toISOString();
    }

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
  // matching *SentDate + optional responseDeadline/nudgeDate + one MATERIALS_SENT activity.
  // NOT a response: never touches responseReceivedAt and never increments the response count.
  const recordMaterialsSent = async (args: {
    queryId: string;
    targetStatus: QueryStatus.PARTIAL_SENT | QueryStatus.FULL_SENT;
    sentDate: string;
    isResubmit?: boolean;
    responseDeadline?: string;
    nudgeDate?: string;
  }) => {
    if (!currentUser) return;
    const { queryId, targetStatus, sentDate, isResubmit, responseDeadline, nudgeDate } = args;
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
    if (responseDeadline) qUpdates.responseDeadline = new Date(responseDeadline).toISOString();
    if (nudgeDate) qUpdates.nudgeDate = new Date(nudgeDate).toISOString();

    const description = materialsSentDescription(targetStatus, agent, {
      resubmit: isResubmit,
      round: descriptionRound,
    });
    const details = responseDeadline ? `Expected a response by ${formatHumanDate(responseDeadline)}` : "";

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
  // status change + "No response received…" timeline activity, then stamps the response date so it
  // surfaces in Fortnight in Focus as the response event it conceptually is. Idempotent — once a
  // query leaves QUERIED it no longer matches, so this never re-fires or loops.
  //
  // TODO (future unification pass): the three close paths — this auto-close, manual
  // updateQueryStatus, and RecordResponseModal/recordQueryResponse — now stamp responseReceivedAt
  // inconsistently (updateQueryStatus alone never sets it). Consolidate them onto one path so a
  // "close" always records the response date the same way, regardless of how it was triggered.
  useEffect(() => {
    if (!currentUser || queries.length === 0) return;
    const cu = currentUser;
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
          // updateQueryStatus doesn't stamp the response date — do it here so the auto-close shows
          // up in Fortnight in Focus (which derives its response event from responseReceivedAt).
          await updateDoc(doc(db, "users", cu.id, "queries", q.id), {
            responseReceivedAt: serverTimestamp(),
            lastStatusChange: serverTimestamp(),
          });
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

  const updateJournalEntry = async (id: string, entryText: string) => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, "users", currentUser.id, "journalEntries", id), { entryText });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${currentUser.id}/journalEntries/${id}`);
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

  // Task dismissal and snoozing
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

    let resurfaceDate: string | undefined = undefined;
    if (dismissType === "fixed snooze" && snoozeDays) {
      const d = new Date();
      d.setDate(d.getDate() + snoozeDays);
      resurfaceDate = d.toISOString();
    }

    const id = "dsm-" + Math.random().toString(36).substr(2, 9);
    const newDismiss: DismissedTask = {
      id,
      userId: currentUser.id,
      taskType,
      relatedRecordId,
      dismissedDate: new Date().toISOString(),
      ...(resurfaceDate !== undefined ? { resurfaceDate } : {}),
      dismissType
    };

    try {
      await setDoc(doc(db, "users", currentUser.id, "dismissedTasks", id), newDismiss);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${currentUser.id}/dismissedTasks/${id}`);
    }
  };

  const cleanDuplicates = async (): Promise<{ manuscriptsRemoved: number; agentsRemoved: number; queriesMapped: number; queriesRemoved?: number }> => {
    if (!currentUser) return { manuscriptsRemoved: 0, agentsRemoved: 0, queriesMapped: 0, queriesRemoved: 0 };

    // Part 1: Manuscripts
    const msGroup: { [title: string]: Manuscript[] } = {};
    for (const m of manuscripts) {
      const key = m.title.trim().toLowerCase();
      if (!msGroup[key]) {
        msGroup[key] = [];
      }
      msGroup[key].push(m);
    }

    const mKeep: Manuscript[] = [];
    const mDeleteIds: string[] = [];
    const msIdMap: { [dupId: string]: string } = {}; // maps duplicateId -> masterId

    for (const key of Object.keys(msGroup)) {
      const list = msGroup[key];
      const master = list[0];
      mKeep.push(master);
      for (let i = 1; i < list.length; i++) {
        mDeleteIds.push(list[i].id);
        msIdMap[list[i].id] = master.id;
      }
    }

    // Part 2: Agents
    const agGroup: { [name: string]: Agent[] } = {};
    for (const a of agents) {
      const key = a.name.trim().toLowerCase();
      if (!agGroup[key]) {
        agGroup[key] = [];
      }
      agGroup[key].push(a);
    }

    const aKeep: Agent[] = [];
    const aDeleteIds: string[] = [];
    const agIdMap: { [dupId: string]: string } = {}; // maps duplicateId -> masterId

    for (const key of Object.keys(agGroup)) {
      const list = agGroup[key];
      const master = list[0];
      aKeep.push(master);
      for (let i = 1; i < list.length; i++) {
        aDeleteIds.push(list[i].id);
        agIdMap[list[i].id] = master.id;
      }
    }

    // Part 3: Map Queries & Remap IDs
    let queriesMappedCount = 0;
    const mappedQueries = queries.map(q => {
      let isChanged = false;
      let newMsId = q.manuscriptId;
      let newAgentId = q.agentId;

      if (msIdMap[q.manuscriptId]) {
        newMsId = msIdMap[q.manuscriptId];
        isChanged = true;
      }
      if (agIdMap[q.agentId]) {
        newAgentId = agIdMap[q.agentId];
        isChanged = true;
      }

      if (isChanged) {
        queriesMappedCount++;
        return {
          ...q,
          manuscriptId: newMsId,
          agentId: newAgentId
        };
      }
      return q;
    });

    // Part 4: Deduplicate identical queries (pointing to same manuscript and agent)
    const qGroup: { [key: string]: Query[] } = {};
    for (const q of mappedQueries) {
      const key = `${q.manuscriptId}_${q.agentId}`;
      if (!qGroup[key]) {
        qGroup[key] = [];
      }
      qGroup[key].push(q);
    }

    const qKeep: Query[] = [];
    const qDeleteIds: string[] = [];
    for (const key of Object.keys(qGroup)) {
      const list = qGroup[key];
      const master = list[0];
      qKeep.push(master);
      for (let i = 1; i < list.length; i++) {
        qDeleteIds.push(list[i].id);
      }
    }

    // Save outputs
    // Online DB updates - delete duplicate manuscripts
    for (const dId of mDeleteIds) {
      try {
        await deleteDoc(doc(db, "users", currentUser.id, "manuscripts", dId));
      } catch (e) {
        console.error("Error deleting duplicate manuscript", dId, e);
      }
    }

    // Delete duplicate agents
    for (const aId of aDeleteIds) {
      try {
        await deleteDoc(doc(db, "users", currentUser.id, "agents", aId));
      } catch (e) {
        console.error("Error deleting duplicate agent", aId, e);
      }
    }

    // Delete duplicate queries
    for (const qId of qDeleteIds) {
      try {
        await deleteDoc(doc(db, "users", currentUser.id, "queries", qId));
      } catch (e) {
        console.error("Error deleting duplicate query", qId, e);
      }
    }

    // Update mapped remaining queries in Firestore
    for (const q of qKeep) {
      if (msIdMap[q.manuscriptId] || agIdMap[q.agentId]) {
        try {
          await updateDoc(doc(db, "users", currentUser.id, "queries", q.id), {
            manuscriptId: q.manuscriptId,
            agentId: q.agentId
          });
        } catch (e) {
          console.error("Error updating query mapping", q.id, e);
        }
      }
    }

    // Trigger local React state refreshes so the UI automatically re-reflects correct totals instantly!
    setManuscripts(mKeep);
    setAgents(aKeep);
    setQueries(qKeep);

    return {
      manuscriptsRemoved: mDeleteIds.length,
      agentsRemoved: aDeleteIds.length,
      queriesMapped: queriesMappedCount,
      queriesRemoved: qDeleteIds.length
    };
  };

  const wipeAndResetDatabase = async (): Promise<void> => {
    if (!currentUser) return;
    const uid = currentUser.id;

    const subcollections = [
      "manuscripts",
      "versions",
      "packages",
      "agents",
      "queries",
      "activities",
      "journalEntries",
      "dismissedTasks"
    ];

    for (const subcol of subcollections) {
      try {
        const snapshot = await getDocs(collection(db, "users", uid, subcol));
        for (const docSnap of snapshot.docs) {
          await deleteDoc(doc(db, "users", uid, subcol, docSnap.id));
        }
      } catch (e) {
        console.error(`Error deleting subcollection ${subcol}:`, e);
      }
    }

    await seedUserDatabase(uid);
  };

  return (
    <DbContext.Provider
      value={{
        currentUser,
        manuscripts,
        versions,
        packages,
        agents,
        communityAgents,
        queries,
        activities,
        journalEntries,
        dismissedTasks,
        tasks,
        login,
        signup,
        resetPassword,
        logout,
        upgradeToPro,
        downgradeToFree,
        addManuscript,
        updateManuscript,
        deleteManuscript,
        setManuscriptShelved,
        addVersion,
        deleteVersion,
        addPackage,
        retirePackage,
        addAgent,
        updateAgent,
        deleteAgent,
        setAgentSetAside,
        addQuery,
        updateQueryStatus,
        recordMaterialsSent,
        undoQueryStatus,
        updateQuery,
        addJournalEntry,
        deleteJournalEntry,
        updateJournalEntry,
        addActivity,
        deleteActivity,
        editActivity,
        updateUserProfile,
        dismissTask,
        cleanDuplicates,
        wipeAndResetDatabase
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

