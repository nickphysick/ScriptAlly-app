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
  seedUser,
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
  Timestamp
} from "firebase/firestore";

import { db, auth, handleFirestoreError, OperationType } from "./firebase";

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
  isOfflineMode: boolean;
  login: (email: string, password?: string) => Promise<boolean>;
  signup: (name: string, email: string, password?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  upgradeToPro: () => Promise<void>;
  downgradeToFree: () => Promise<void>;
  
  // Manuscript Actions
  addManuscript: (m: Omit<Manuscript, "id" | "userId" | "statusChangedDate"> & { id?: string }, bypassLimits?: boolean) => Promise<{ success: boolean; error?: string; id?: string }>;
  updateManuscript: (id: string, fields: Partial<Manuscript>) => Promise<void>;
  
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
  
  // Query Actions
  addQuery: (q: Omit<Query, "id" | "userId" | "status" | "dateSent" | "responseDeadline" | "nudgeDate"> & { status?: QueryStatus; dateSent?: string; id?: string }, bypassLimits?: boolean) => Promise<{ success: boolean; error?: string; id?: string }>;
  updateQueryStatus: (id: string, newStatus: QueryStatus, systemNotes?: string) => Promise<void>;
  undoQueryStatus: (id: string, previousStatus: QueryStatus, newStatus: QueryStatus) => Promise<void>;
  updateQuery: (id: string, fields: Partial<Query>) => Promise<void>;
  
  // Journal Actions
  addJournalEntry: (queryId: string, entryText: string) => Promise<void>;
  deleteJournalEntry: (id: string) => Promise<void>;
  updateJournalEntry: (id: string, entryText: string) => Promise<void>;

  // Activity Actions
  addActivity: (act: Omit<Activity, "id" | "userId"> & { id?: string }) => Promise<{ success: boolean; error?: string }>;
  deleteActivity: (id: string) => Promise<void>;

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
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const localUserStr = localStorage.getItem("scriptally_user");
    if (localUserStr) {
      try {
        return JSON.parse(localUserStr);
      } catch (e) {
        console.error("Failed to parse cached offline user", e);
      }
    }
    // Set seedUser as default preview/sandbox user
    return seedUser;
  });
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
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(() => {
    return localStorage.getItem("scriptally_offline") !== "false";
  });

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
        // Safe preview: Always default to logged-in Offline Sandbox (seedUser) so user goes straight to dashboard!
        let userToUse = seedUser;
        const localUserStr = localStorage.getItem("scriptally_user");
        if (localUserStr) {
          try {
            userToUse = JSON.parse(localUserStr);
          } catch (e) {
            console.error("Failed to parse cached offline user", e);
          }
        } else {
          localStorage.setItem("scriptally_user", JSON.stringify(seedUser));
        }

        setCurrentUser(userToUse);
        setIsOfflineMode(true);
        localStorage.setItem("scriptally_offline", "true");

        // Clean up listeners immediately since we are in offline sandbox
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
      setIsOfflineMode(false);
      localStorage.removeItem("scriptally_offline");

      // Seed community agents once after authenticated session is established
      seedCommunityAgentsIfEmpty().catch(err => {
        console.error("Error running community agents seeding check:", err);
      });

      try {
        const userDocRef = doc(db, "users", uid);
        let userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
          const isFree = firebaseUser.email === "novice@writer.com";
          const freshUser: User = {
            id: uid,
            name: signupTempNameRef.current || firebaseUser.displayName || (isFree ? "Aspiring Novice" : "Lucy Sterling"),
            email: firebaseUser.email || "nick.physick@gmail.com",
            plan: isFree ? UserPlan.FREE : UserPlan.PRO,
            trialStartDate: new Date().toISOString(),
            subscriptionStatus: isFree ? "none" : "active",
          };
          await setDoc(userDocRef, freshUser);
          await seedUserDatabase(uid);
          signupTempNameRef.current = null;
        } else {
          // Self-heal: If user has a document, but manuscripts or queries subcollections are empty
          try {
            const msCheckDoc = await getDoc(doc(db, "users", uid, "manuscripts", "ms-1"));
            if (!msCheckDoc.exists()) {
              console.log("Empty Live Firebase Collections detected for user. Populating data template...");
              await seedUserDatabase(uid);
            }
          } catch (seedErr) {
            console.error("Self-healing database seeding failed:", seedErr);
          }
        }

        // Active listener bindings for user document
        unsubUser = onSnapshot(userDocRef, (snap) => {
          if (snap.exists()) {
            setCurrentUser(snap.data() as User);
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

  // Save to space helper
  const saveToLocalStorage = (key: string, data: any) => {
    if (!currentUser) return;
    localStorage.setItem(`scriptally_${key}_${currentUser.id}`, JSON.stringify(data));
  };

  // Load and subscribe from localStorage when in offline mode
  useEffect(() => {
    if (!isOfflineMode || !currentUser) return;

    const uid = currentUser.id;

    // Load manuscripts
    const cachedManuscripts = localStorage.getItem(`scriptally_manuscripts_${uid}`);
    if (cachedManuscripts) {
      setManuscripts(JSON.parse(cachedManuscripts));
    } else {
      const seeded = seedManuscripts.map(m => ({ ...m, userId: uid }));
      localStorage.setItem(`scriptally_manuscripts_${uid}`, JSON.stringify(seeded));
      setManuscripts(seeded);
    }

    // Load versions
    const cachedVersions = localStorage.getItem(`scriptally_versions_${uid}`);
    if (cachedVersions) {
      setVersions(JSON.parse(cachedVersions));
    } else {
      const seeded = seedVersions.map(v => ({ ...v, userId: uid }));
      localStorage.setItem(`scriptally_versions_${uid}`, JSON.stringify(seeded));
      setVersions(seeded);
    }

    // Load packages
    const cachedPackages = localStorage.getItem(`scriptally_packages_${uid}`);
    if (cachedPackages) {
      setPackages(JSON.parse(cachedPackages));
    } else {
      const seeded = seedPackages.map(p => ({ ...p, userId: uid }));
      localStorage.setItem(`scriptally_packages_${uid}`, JSON.stringify(seeded));
      setPackages(seeded);
    }

    // Load agents
    const cachedAgents = localStorage.getItem(`scriptally_agents_${uid}`);
    if (cachedAgents) {
      setAgents(JSON.parse(cachedAgents));
    } else {
      const seeded = seedAgents.map(a => ({ ...a, userId: uid }));
      localStorage.setItem(`scriptally_agents_${uid}`, JSON.stringify(seeded));
      setAgents(seeded);
    }

    // Load queries
    const cachedQueries = localStorage.getItem(`scriptally_queries_${uid}`);
    if (cachedQueries) {
      setQueries(JSON.parse(cachedQueries));
    } else {
      const seeded = seedQueries.map(q => ({ ...q, userId: uid }));
      localStorage.setItem(`scriptally_queries_${uid}`, JSON.stringify(seeded));
      setQueries(seeded);
    }

    // Load activities
    const cachedActivities = localStorage.getItem(`scriptally_activities_${uid}`);
    if (cachedActivities) {
      try {
        const parsed = JSON.parse(cachedActivities) as Activity[];
        let hasUpdates = false;
        const migrated = parsed.map(p => {
          const match = seedActivities.find(sa => sa.id === p.id);
          let cleanedDesc = p.description || "";
          if (cleanedDesc && (cleanedDesc.toLowerCase().includes("initial query packet dispatched") || cleanedDesc.toLowerCase().includes("dispatched to"))) {
            cleanedDesc = cleanedDesc
              .replace(/Initial Query packet dispatched to /gi, "Query sent to ")
              .replace(/Initial Query packet sent to /gi, "Query sent to ")
              .replace(/dispatched to /gi, "sent to ");
            hasUpdates = true;
          }
          if (match) {
            if (p.description !== match.description || p.details !== match.details || cleanedDesc !== p.description) {
              hasUpdates = true;
              return {
                ...p,
                description: match.description,
                details: match.details
              };
            }
          }
          if (cleanedDesc !== p.description) {
            hasUpdates = true;
            return {
              ...p,
              description: cleanedDesc
            };
          }
          return p;
        });
        if (hasUpdates) {
          localStorage.setItem(`scriptally_activities_${uid}`, JSON.stringify(migrated));
          setActivities(migrated);
        } else {
          setActivities(parsed);
        }
      } catch (e) {
        console.error("Failed to parse cached activities", e);
        const seeded = seedActivities.map(a => ({ ...a, userId: uid }));
        localStorage.setItem(`scriptally_activities_${uid}`, JSON.stringify(seeded));
        setActivities(seeded);
      }
    } else {
      const seeded = seedActivities.map(a => ({ ...a, userId: uid }));
      localStorage.setItem(`scriptally_activities_${uid}`, JSON.stringify(seeded));
      setActivities(seeded);
    }

    // Load journal entries
    const cachedJournal = localStorage.getItem(`scriptally_journal_${uid}`);
    if (cachedJournal) {
      setJournalEntries(JSON.parse(cachedJournal));
    } else {
      const seeded = seedJournalEntries.map(j => ({ ...j, userId: uid }));
      localStorage.setItem(`scriptally_journal_${uid}`, JSON.stringify(seeded));
      setJournalEntries(seeded);
    }

    // Load dismissed tasks
    const cachedDismissed = localStorage.getItem(`scriptally_dismissed_${uid}`);
    if (cachedDismissed) {
      setDismissedTasks(JSON.parse(cachedDismissed));
    } else {
      setDismissedTasks([]);
    }
  }, [isOfflineMode, currentUser]);

  // Load/fetch community agents depending on online/offline state
  useEffect(() => {
    if (isOfflineMode || !currentUser) {
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
  }, [currentUser, isOfflineMode]);

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
      if (a.starRating === 5 && a.submissionStatus === SubmissionStatus.OPEN) {
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

      // 3. Backfill Query Status Changed activities
      for (const q of queries) {
        if (q.status !== QueryStatus.QUERIED) {
          const matchingAgent = agents.find(ag => ag.id === q.agentId);
          const agentName = matchingAgent ? matchingAgent.name : "The agent";
          const matchingMs = manuscripts.find(ms => ms.id === q.manuscriptId);
          const manuscriptTitle = matchingMs ? matchingMs.title : "";

          // Check if we have an activity matching this status for this query.
          // We check the deterministic backfill ID first, then fall back to pattern matching
          // against the natural-language descriptions that updateQueryStatus produces.
          const deterministicId = `act-status-${q.status.replace(/\s+/g, '-').toLowerCase()}-${q.id}`;
          const naturalLanguagePatterns: Partial<Record<QueryStatus, string[]>> = {
            [QueryStatus.PARTIAL_REQUESTED]: ["requested a partial"],
            [QueryStatus.PARTIAL_SENT]:      ["partial manuscript sent"],
            [QueryStatus.FULL_REQUESTED]:    ["requested a full manuscript"],
            [QueryStatus.FULL_SENT]:         ["full manuscript sent"],
            [QueryStatus.REJECTED]:          ["rejection received", "rejected"],
            [QueryStatus.WITHDRAWN]:         ["withdrew query", "withdrawn"],
          };
          const patterns = naturalLanguagePatterns[q.status] ?? [];
          const hasStatusActivity = activities.some(act => {
            if (act.id === deterministicId) return true;
            if (act.queryId !== q.id) return false;
            const desc = act.description?.toLowerCase() ?? "";
            const details = act.details?.toLowerCase() ?? "";
            if (desc.includes("status") || details.includes("status")) return true;
            if (desc.includes(q.status.toLowerCase())) return true;
            return patterns.some(p => desc.includes(p));
          });

          if (!hasStatusActivity) {
            let expectedNote = `Status updated to ${q.status}`;
            if (q.status === QueryStatus.PARTIAL_REQUESTED) expectedNote = "Partial manuscript requested";
            else if (q.status === QueryStatus.FULL_REQUESTED) expectedNote = "Full manuscript requested";
            else if (q.status === QueryStatus.REVISE_RESUBMIT) expectedNote = "Revise & resubmit requested";
            else if (q.status === QueryStatus.OFFER) expectedNote = "Offer of representation received";
            else if (q.status === QueryStatus.REJECTED) expectedNote = "Query rejected";
            else if (q.status === QueryStatus.NO_RESPONSE) expectedNote = "Query closed — noResponseAfterWindow";

            let dateVal = Date.now();
            const rawDate = q.lastStatusChange || q.responseReceivedAt || q.dateSent;
            if (rawDate) {
              if (typeof rawDate === "string") {
                dateVal = new Date(rawDate).getTime();
              } else if ((rawDate as any).seconds) {
                dateVal = (rawDate as any).seconds * 1000;
              } else if (typeof (rawDate as any).toDate === "function") {
                dateVal = (rawDate as any).toDate().getTime();
              } else if (rawDate instanceof Date) {
                dateVal = rawDate.getTime();
              }
            }

            missingActivities.push({
              id: `act-status-${q.status.replace(/\s+/g, '-').toLowerCase()}-${q.id}`,
              activityType: ActivityType.STATUS_CHANGED,
              description: expectedNote,
              manuscriptId: q.manuscriptId,
              queryId: q.id,
              date: new Date(dateVal).toISOString(),
              details: expectedNote
            });

            if (!isOfflineMode) {
              try {
                const topLevelActivityDocRef = doc(db, `users/${currentUser.id}/activity`, `act-status-${q.status.replace(/\s+/g, '-').toLowerCase()}-${q.id}`);
                await setDoc(topLevelActivityDocRef, {
                  type: q.status,
                  createdAt: Timestamp.fromMillis(dateVal),
                  note: expectedNote,
                  queryId: q.id,
                  agentName,
                  manuscriptTitle
                }, { merge: true });

                const queryActivityDocRef = doc(db, `users/${currentUser.id}/queries/${q.id}/activity`, `act-status-${q.status.replace(/\s+/g, '-').toLowerCase()}-${q.id}`);
                await setDoc(queryActivityDocRef, {
                  type: q.status,
                  createdAt: Timestamp.fromMillis(dateVal),
                  note: expectedNote
                }, { merge: true });
              } catch (err) {
                console.error("[ScriptAlly Backfill] Online backfill failed for query activity:", err);
              }
            }
          }
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

  // Self-healing database cleanup script to fix corrupted data left over from incomplete undo flows
  useEffect(() => {
    if (!currentUser || queries.length === 0 || activities.length === 0) return;

    const cleanupCorruptedData = async () => {
      // Find the query currently showing status Queried that previously had a partialRequestedDate set
      const affectedQueries = queries.filter(q => 
        q.status === QueryStatus.QUERIED && 
        q.partialRequestedDate !== null && 
        q.partialRequestedDate !== undefined &&
        q.partialRequestedDate !== ""
      );

      if (affectedQueries.length > 0) {
        console.log(`[ScriptAlly Cleanup] Resetting ${affectedQueries.length} affected queries.`);
        for (const q of affectedQueries) {
          if (isOfflineMode) {
            const qUpdates = {
              partialRequestedDate: null,
              status: QueryStatus.QUERIED
            };
            setQueries(prev => prev.map(item => item.id === q.id ? { ...item, ...qUpdates } : item));
            const updated = queries.map(item => item.id === q.id ? { ...item, ...qUpdates } : item);
            localStorage.setItem(`scriptally_queries_${currentUser.id}`, JSON.stringify(updated));
          } else {
            try {
              const qUpdates = {
                partialRequestedDate: deleteField(),
                status: QueryStatus.QUERIED
              };
              await updateDoc(doc(db, "users", currentUser.id, "queries", q.id), qUpdates);
            } catch (err) {
              console.error("[ScriptAlly Cleanup] Failed to update query status / clear date fields:", err);
            }
          }
        }
      }

      // Find activities to delete
      const activitiesToDelete = activities.filter(act => {
        // 1. "Status updated to Queried" and "Undo status change requested by user"
        const isUndoQueriedActivity = 
          (act.description?.includes("Status updated to Queried") || act.details?.includes("Status updated to Queried")) &&
          (act.description?.includes("Undo status change requested by user") || act.details?.includes("Undo status change requested by user") ||
           act.description?.includes("Status change undone") || act.details?.includes("Status change undone"));

        // 2. Partial requested activities for any queries that are currently in QUERIED status (indicating they were undone/reverted)
        const isLeftoverPartialRequested = 
          act.description?.toLowerCase().includes("requested a partial manuscript") &&
          queries.some(q => q.id === act.queryId && q.status === QueryStatus.QUERIED);

        return isUndoQueriedActivity || isLeftoverPartialRequested;
      });

      if (activitiesToDelete.length > 0) {
        console.log(`[ScriptAlly Cleanup] Deleting ${activitiesToDelete.length} corrupted activity records.`);
        if (isOfflineMode) {
          setActivities(prev => {
            const updated = prev.filter(act => !activitiesToDelete.some(ad => ad.id === act.id));
            localStorage.setItem(`scriptally_activities_${currentUser.id}`, JSON.stringify(updated));
            return updated;
          });
        } else {
          for (const act of activitiesToDelete) {
            try {
              await deleteDoc(doc(db, "users", currentUser.id, "activities", act.id));
            } catch (err) {
              console.error("[ScriptAlly Cleanup] Failed to delete activity record:", err);
            }
          }
        }
      }
    };

    const timer = setTimeout(() => {
      cleanupCorruptedData().catch(err => console.error("Error executing database cleanup script", err));
    }, 2000);

    return () => clearTimeout(timer);
  }, [currentUser, queries, activities, isOfflineMode]);

  const login = async (email: string, password?: string): Promise<boolean> => {
    try {
      const pass = password || "writerpassword123";
      await signInWithEmailAndPassword(auth, email, pass);
      setIsOfflineMode(false);
      localStorage.removeItem("scriptally_offline");
      return true;
    } catch (error: any) {
      if (error && error.code === "auth/operation-not-allowed") {
        console.warn("Email/Password Auth is disabled in Firebase Console. Falling back to Local Offline Mode!");
        setIsOfflineMode(true);
        localStorage.setItem("scriptally_offline", "true");
        
        const dummy: User = {
          id: "local-user-pro",
          name: email === "novice@writer.com" ? "Aspiring Novice" : "Lucy Sterling",
          email: email,
          plan: email === "novice@writer.com" ? UserPlan.FREE : UserPlan.PRO,
          trialStartDate: new Date().toISOString(),
          subscriptionStatus: email === "novice@writer.com" ? "none" : "active",
        };
        setCurrentUser(dummy);
        localStorage.setItem("scriptally_user", JSON.stringify(dummy));
        return true;
      }

      if (error && (error.code === "auth/user-not-found" || error.code === "auth/invalid-credential")) {
        // Fallback auto-registration for sandbox friendliness of first runs
        try {
          await createUserWithEmailAndPassword(auth, email, "writerpassword123");
          setIsOfflineMode(false);
          localStorage.removeItem("scriptally_offline");
          return true;
        } catch (subErr: any) {
          if (subErr && subErr.code === "auth/operation-not-allowed") {
            setIsOfflineMode(true);
            localStorage.setItem("scriptally_offline", "true");
            
            const dummy: User = {
              id: "local-user-pro",
              name: email === "novice@writer.com" ? "Aspiring Novice" : "Lucy Sterling",
              email: email,
              plan: email === "novice@writer.com" ? UserPlan.FREE : UserPlan.PRO,
              trialStartDate: new Date().toISOString(),
              subscriptionStatus: email === "novice@writer.com" ? "none" : "active",
            };
            setCurrentUser(dummy);
            localStorage.setItem("scriptally_user", JSON.stringify(dummy));
            return true;
          }
          console.error("Auto creation error:", subErr);
        }
      }
      console.error("Authentication login failures:", error);
      return false;
    }
  };

  const signup = async (name: string, email: string, password?: string): Promise<boolean> => {
    try {
      signupTempNameRef.current = name;
      const pass = password || "writerpassword123";
      await createUserWithEmailAndPassword(auth, email, pass);
      setIsOfflineMode(false);
      localStorage.removeItem("scriptally_offline");
      return true;
    } catch (error: any) {
      if (error && error.code === "auth/operation-not-allowed") {
        console.warn("Email/Password Auth is disabled in Firebase Console. Falling back to Local Offline Mode!");
        setIsOfflineMode(true);
        localStorage.setItem("scriptally_offline", "true");
        
        const freshUser: User = {
          id: "local-user-" + Math.random().toString(36).substr(2, 9),
          name: name,
          email: email,
          plan: email === "novice@writer.com" ? UserPlan.FREE : UserPlan.PRO,
          trialStartDate: new Date().toISOString(),
          subscriptionStatus: email === "novice@writer.com" ? "none" : "active",
        };
        setCurrentUser(freshUser);
        localStorage.setItem("scriptally_user", JSON.stringify(freshUser));
        return true;
      }
      console.error("Sign up failure:", error);
      return false;
    }
  };

  const logout = async () => {
    try {
      if (isOfflineMode) {
        // Instead of logging out, reset local storage back to seedUser & reset database
        localStorage.setItem("scriptally_offline", "true");
        localStorage.setItem("scriptally_user", JSON.stringify(seedUser));
        setCurrentUser(seedUser);
        await wipeAndResetDatabase();
        return;
      }
      await signOut(auth);
    } catch (e) {
      console.error("Sign out process error:", e);
    }
  };

  const upgradeToPro = async () => {
    if (!currentUser) return;
    if (isOfflineMode) {
      const upd: User = {
        ...currentUser,
        plan: UserPlan.PRO,
        subscriptionStatus: "active"
      };
      setCurrentUser(upd);
      localStorage.setItem("scriptally_user", JSON.stringify(upd));
      return;
    }
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
    if (isOfflineMode) {
      const downd: User = {
        ...currentUser,
        plan: UserPlan.FREE,
        subscriptionStatus: "none"
      };
      setCurrentUser(downd);
      localStorage.setItem("scriptally_user", JSON.stringify(downd));
      return;
    }
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
    if (isOfflineMode) {
      setManuscripts(prev => {
        const updated = [...prev, newMs];
        localStorage.setItem(`scriptally_manuscripts_${currentUser.id}`, JSON.stringify(updated));
        return updated;
      });
      writeSuccess = true;
    } else {
      try {
        await setDoc(doc(db, "users", currentUser.id, "manuscripts", id), newMs);
        writeSuccess = true;
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `users/${currentUser.id}/manuscripts/${id}`);
        return { success: false, error: "Database exception occurred." };
      }
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
    if (isOfflineMode) {
      const updated = manuscripts.map(m => {
        if (m.id === id) {
          const hasStatusChanged = fields.status && fields.status !== m.status;
          return {
            ...m,
            ...fields,
            statusChangedDate: hasStatusChanged ? new Date().toISOString() : m.statusChangedDate
          };
        }
        return m;
      });
      setManuscripts(updated);
      saveToLocalStorage("manuscripts", updated);
      writeSuccess = true;
    } else {
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
    if (isOfflineMode) {
      const updated = [...versions, newVer];
      setVersions(updated);
      saveToLocalStorage("versions", updated);
      return;
    }
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
    if (isOfflineMode) {
      const updated = versions.filter(v => v.id !== id);
      setVersions(updated);
      saveToLocalStorage("versions", updated);
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

    if (isOfflineMode) {
      const updated = [...packages, newPkg];
      setPackages(updated);
      saveToLocalStorage("packages", updated);
      return { success: true };
    }

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
    if (isOfflineMode) {
      const updated = packages.map(p => {
        if (p.id === id) {
          return { ...p, status: "Retired" as const };
        }
        return p;
      });
      setPackages(updated);
      saveToLocalStorage("packages", updated);
      return;
    }
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
    if (isOfflineMode) {
      setAgents(prev => {
        const updated = [...prev, newAg];
        localStorage.setItem(`scriptally_agents_${currentUser.id}`, JSON.stringify(updated));
        return updated;
      });
      writeSuccess = true;
    } else {
      try {
        await setDoc(doc(db, "users", currentUser.id, "agents", id), newAg);
        writeSuccess = true;
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `users/${currentUser.id}/agents/${id}`);
        return { success: false, error: "Database storage failed." };
      }
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
    if (isOfflineMode) {
      const updated = agents.map(a => {
        if (a.id === id) {
          return {
            ...a,
            ...fields,
            lastCheckedDate: new Date().toISOString()
          };
        }
        return a;
      });
      setAgents(updated);
      saveToLocalStorage("agents", updated);
      writeSuccess = true;
    } else {
      try {
        await updateDoc(doc(db, "users", currentUser.id, "agents", id), {
          ...fields,
          lastCheckedDate: new Date().toISOString()
        });
        writeSuccess = true;
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `users/${currentUser.id}/agents/${id}`);
      }
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
    if (isOfflineMode) {
      const updated = agents.filter(a => a.id !== id);
      setAgents(updated);
      saveToLocalStorage("agents", updated);
      return;
    }
    try {
      await deleteDoc(doc(db, "users", currentUser.id, "agents", id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `users/${currentUser.id}/agents/${id}`);
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
    const newQ: Query = {
      ...q,
      id,
      userId: currentUser.id,
      status: q.status || QueryStatus.QUERIED,
      dateSent: q.dateSent || new Date().toISOString(),
      responseDeadline: q.status === QueryStatus.QUERIED ? (q as any).responseDeadline || dead : undefined
    } as any;

    if (isOfflineMode) {
      setQueries(prev => {
        const updated = [...prev, newQ];
        localStorage.setItem(`scriptally_queries_${currentUser.id}`, JSON.stringify(updated));
        return updated;
      });

      const pkg = packages.find(p => p.id === q.packageId);
      const materialsSummary = pkg ? `${pkg.packageName}` : "Standard pitch materials";

      const actId = "act-" + Math.random().toString(36).substr(2, 9);
      const initialActivity: Activity = {
        id: actId,
        userId: currentUser.id,
        queryId: id,
        manuscriptId: q.manuscriptId,
        activityType: ActivityType.QUERY_SENT,
        description: `Query sent to ${agent?.name || "agent"} at ${agent?.agency || "agency"}`,
        date: new Date().toISOString(),
        details: `Sent via ${q.sendMethod || agent?.submissionMethod || "Email"}`
      };

      setActivities(prevAct => {
        const updated = [...prevAct, initialActivity];
        localStorage.setItem(`scriptally_activities_${currentUser.id}`, JSON.stringify(updated));
        return updated;
      });

      return { success: true, id };
    }

    try {
      await setDoc(doc(db, "users", currentUser.id, "queries", id), newQ);

      const pkg = packages.find(p => p.id === q.packageId);
      const materialsSummary = pkg ? `${pkg.packageName}` : "Standard pitch materials";

      const actId = "act-" + Math.random().toString(36).substr(2, 9);
      const initialActivity: Activity = {
        id: actId,
        userId: currentUser.id,
        queryId: id,
        manuscriptId: q.manuscriptId,
        activityType: ActivityType.QUERY_SENT,
        description: `Query sent to ${agent?.name || "agent"} at ${agent?.agency || "agency"}`,
        date: new Date().toISOString(),
        details: `Sent via ${q.sendMethod || agent?.submissionMethod || "Email"}`
      };

      await setDoc(doc(db, "users", currentUser.id, "activities", actId), initialActivity);
      return { success: true, id };
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${currentUser.id}/queries/${id}`);
      return { success: false, error: "Failed to dispatch Query." };
    }
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
            details: `Respond by ${formattedDeadStr}`
          });
        } else if (skippedState === QueryStatus.PARTIAL_SENT) {
          missedActivities.push({
            userId: currentUser.id,
            queryId,
            manuscriptId: targetQ.manuscriptId,
            activityType: ActivityType.MATERIALS_SENT,
            description: `Partial manuscript sent to ${agent?.name || "the agent"} at ${agent?.agency || "agency"}`,
            date: dateStr,
            details: `Expected a response by ${formattedDeadStr}`
          });
        } else if (skippedState === QueryStatus.FULL_REQUESTED) {
          missedActivities.push({
            userId: currentUser.id,
            queryId,
            manuscriptId: targetQ.manuscriptId,
            activityType: ActivityType.STATUS_CHANGED,
            description: `${agent?.name || "The agent"} at ${agent?.agency || "agency"} requested a full manuscript`,
            date: dateStr,
            details: `Respond by ${formattedDeadStr}`
          });
        } else if (skippedState === QueryStatus.FULL_SENT) {
          missedActivities.push({
            userId: currentUser.id,
            queryId,
            manuscriptId: targetQ.manuscriptId,
            activityType: ActivityType.MATERIALS_SENT,
            description: `Full manuscript sent to ${agent?.name || "the agent"} at ${agent?.agency || "agency"}`,
            date: dateStr,
            details: `Expected a response by ${formattedDeadStr}`
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
        desc = `Partial manuscript sent to ${agent?.name || "the agent"} at ${agent?.agency || "agency"}`;
        detailsLine = `Expected a response by ${formattedDeadStr}`;
      } else if (newStatus === QueryStatus.FULL_REQUESTED) {
        desc = `${agent?.name || "The agent"} at ${agent?.agency || "agency"} requested a full manuscript`;
        detailsLine = `Respond by ${formattedDeadStr}`;
      } else if (newStatus === QueryStatus.FULL_SENT) {
        activityType = ActivityType.MATERIALS_SENT;
        desc = `Full manuscript sent to ${agent?.name || "the agent"} at ${agent?.agency || "agency"}`;
        detailsLine = `Expected a response by ${formattedDeadStr}`;
      } else if (newStatus === QueryStatus.REVISE_RESUBMIT) {
        desc = `Revise & Resubmit request received from ${agent?.name || "the agent"} at ${agent?.agency || "agency"}`;
        detailsLine = `Respond by ${formattedDeadStr}`;
      } else if (newStatus === QueryStatus.OFFER) {
        desc = `Congratulations! You've received an offer of representation from ${agent?.name || "the agent"} at ${agent?.agency || "agency"}!`;
        detailsLine = `Respond by ${formattedDeadStr}`;
      } else if (newStatus === QueryStatus.REJECTED) {
        desc = `Rejection received from ${agent?.name || "the agent"} at ${agent?.agency || "agency"}`;
        detailsLine = systemNotes || "Query closed. Don't worry - it's all part of the journey.";
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
        details: detailsLine
      });
    }

    const qUpdates: Record<string, any> = { status: newStatus };
    if (newStatus === QueryStatus.PARTIAL_REQUESTED) qUpdates.partialRequestedDate = dateStr;
    if (newStatus === QueryStatus.PARTIAL_SENT) qUpdates.partialSentDate = dateStr;
    if (newStatus === QueryStatus.FULL_REQUESTED) qUpdates.fullRequestedDate = dateStr;
    if (newStatus === QueryStatus.FULL_SENT) qUpdates.fullSentDate = dateStr;
    if (newStatus === QueryStatus.REJECTED) {
      qUpdates.rejectedDate = dateStr;
      if (systemNotes) {
        // Parse rejectionType / rejectionDetails out of the notesCaptured string from QuerySlideInPanel
        const typeMatch = systemNotes.match(/^Rejection Type: ([^.]+)\./);
        const commentsMatch = systemNotes.match(/Comments: (.+)$/);
        if (typeMatch) qUpdates.rejectionType = typeMatch[1].trim();
        if (commentsMatch) qUpdates.rejectionDetails = commentsMatch[1].trim();
      }
    }

    if (isOfflineMode) {
      const updatedQueries = queries.map(q => (q.id === queryId ? { ...q, ...qUpdates } : q));
      setQueries(updatedQueries);
      saveToLocalStorage("queries", updatedQueries);

      const generatedActivities: Activity[] = missedActivities.map(act => ({
        ...act,
        id: "act-" + Math.random().toString(36).substr(2, 9)
      }));

      const finalActivities = [...activities, ...generatedActivities];
      setActivities(finalActivities);
      saveToLocalStorage("activities", finalActivities);
      return;
    }

    try {
      await updateDoc(doc(db, "users", currentUser.id, "queries", queryId), qUpdates);

      for (const act of missedActivities) {
         const actId = "act-" + Math.random().toString(36).substr(2, 9);
         await setDoc(doc(db, "users", currentUser.id, "activities", actId), {
           ...act,
           id: actId
         });
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${currentUser.id}/queries/${queryId}`);
    }
  };

  const undoQueryStatus = async (queryId: string, previousStatus: QueryStatus, newStatus: QueryStatus) => {
    if (!currentUser) return;
    const nowTime = Date.now();

    // First, find all activity records that were created as part of the status change being undone.
    // These will be the activity records with a date timestamp within a few seconds of the status change, associated with the same queryId.
    const activitiesToDelete = activities.filter(act => {
      if (act.queryId !== queryId) return false;
      try {
        const actTime = new Date(act.date).getTime();
        return Math.abs(nowTime - actTime) < 60000; // within 60 seconds of status change
      } catch (e) {
        return false;
      }
    });

    if (isOfflineMode) {
      const updatedAc = activities.filter(act => !activitiesToDelete.some(da => da.id === act.id));
      setActivities(updatedAc);
      saveToLocalStorage("activities", updatedAc);
    } else {
      for (const act of activitiesToDelete) {
        try {
          await deleteDoc(doc(db, "users", currentUser.id, "activities", act.id));
        } catch (e) {
          handleFirestoreError(e, OperationType.DELETE, `users/${currentUser.id}/activities/${act.id}`);
        }
      }
    }

    // Second, update the query document directly — set the status field back to previousStatus, and clear any date fields that were set as part of the status change being undone.
    const qUpdatesLocalStorage: Record<string, any> = { status: previousStatus };
    const qUpdatesFirestore: Record<string, any> = { status: previousStatus };

    const fieldsToClear: string[] = [];
    if (previousStatus === QueryStatus.QUERIED) {
      fieldsToClear.push("partialRequestedDate", "partialSentDate", "fullRequestedDate", "fullSentDate");
    } else if (previousStatus === QueryStatus.PARTIAL_REQUESTED) {
      fieldsToClear.push("partialSentDate", "fullRequestedDate", "fullSentDate");
    } else if (previousStatus === QueryStatus.PARTIAL_SENT) {
      fieldsToClear.push("fullRequestedDate", "fullSentDate");
    } else if (previousStatus === QueryStatus.FULL_REQUESTED) {
      fieldsToClear.push("fullSentDate");
    }
    // If undoing a rejection, clear the rejection fields
    if (newStatus === QueryStatus.REJECTED) {
      fieldsToClear.push("rejectedDate", "rejectionType", "rejectionDetails");
    }

    fieldsToClear.forEach(field => {
      qUpdatesLocalStorage[field] = null;
      qUpdatesFirestore[field] = deleteField();
    });

    if (isOfflineMode) {
      const updatedQueries = queries.map(q => (q.id === queryId ? { ...q, ...qUpdatesLocalStorage } : q));
      setQueries(updatedQueries);
      saveToLocalStorage("queries", updatedQueries);
    } else {
      try {
        await updateDoc(doc(db, "users", currentUser.id, "queries", queryId), qUpdatesFirestore);
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `users/${currentUser.id}/queries/${queryId}`);
      }
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
    if (isOfflineMode) {
      const updated = [newEntry, ...journalEntries];
      setJournalEntries(updated);
      saveToLocalStorage("journal", updated);
      return;
    }
    try {
      await setDoc(doc(db, "users", currentUser.id, "journalEntries", id), newEntry);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${currentUser.id}/journalEntries/${id}`);
    }
  };

  const deleteJournalEntry = async (id: string) => {
    if (!currentUser) return;
    if (isOfflineMode) {
      const updated = journalEntries.filter(j => j.id !== id);
      setJournalEntries(updated);
      saveToLocalStorage("journal", updated);
      return;
    }
    try {
      await deleteDoc(doc(db, "users", currentUser.id, "journalEntries", id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `users/${currentUser.id}/journalEntries/${id}`);
    }
  };

  const updateJournalEntry = async (id: string, entryText: string) => {
    if (!currentUser) return;
    if (isOfflineMode) {
      const updated = journalEntries.map(j => (j.id === id ? { ...j, entryText } : j));
      setJournalEntries(updated);
      saveToLocalStorage("journal", updated);
      return;
    }
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

    if (isOfflineMode) {
      const updatedQueries = queries.map(q => (q.id === queryId ? { ...q, ...fields } : q));
      setQueries(updatedQueries);
      saveToLocalStorage("queries", updatedQueries);
    } else {
      try {
        await updateDoc(doc(db, "users", currentUser.id, "queries", queryId), fields);
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `users/${currentUser.id}/queries/${queryId}`);
      }
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

    if (isOfflineMode) {
      setActivities(prevAct => {
        const updated = [...prevAct, newAct];
        localStorage.setItem(`scriptally_activities_${currentUser.id}`, JSON.stringify(updated));
        return updated;
      });
      return { success: true };
    }

    try {
      await setDoc(doc(db, "users", currentUser.id, "activities", id), newAct);
      return { success: true };
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${currentUser.id}/activities/${id}`);
      return { success: false, error: "Failed to persist activity." };
    }
  };

  const deleteActivity = async (id: string) => {
    if (!currentUser) return;
    if (isOfflineMode) {
      setActivities(prevAct => {
        const updated = prevAct.filter(act => act.id !== id);
        localStorage.setItem(`scriptally_activities_${currentUser.id}`, JSON.stringify(updated));
        return updated;
      });
      return;
    }
    try {
      await deleteDoc(doc(db, "users", currentUser.id, "activities", id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `users/${currentUser.id}/activities/${id}`);
    }
  };

  // User Profile updater
  const updateUserProfile = async (fields: Partial<User>) => {
    if (!currentUser) return;
    const updated = { ...currentUser, ...fields };
    
    if (isOfflineMode) {
      setCurrentUser(updated);
      localStorage.setItem("scriptally_user", JSON.stringify(updated));
      return;
    }

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

        if (isOfflineMode) {
          setActivities(prevAct => {
            const updated = [...prevAct, nudgeActivity];
            localStorage.setItem(`scriptally_activities_${currentUser.id}`, JSON.stringify(updated));
            return updated;
          });
        } else {
          setDoc(doc(db, "users", currentUser.id, "activities", actId), nudgeActivity).catch(err => {
            console.error("Failed to write nudge activity into firestore", err);
          });
        }
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

    if (isOfflineMode) {
      const updated = [...dismissedTasks, newDismiss];
      setDismissedTasks(updated);
      saveToLocalStorage("dismissed", updated);
      return;
    }

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
    if (isOfflineMode) {
      setManuscripts(mKeep);
      saveToLocalStorage("manuscripts", mKeep);

      setAgents(aKeep);
      saveToLocalStorage("agents", aKeep);

      setQueries(qKeep);
      saveToLocalStorage("queries", qKeep);
    } else {
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
    }

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

    if (isOfflineMode) {
      localStorage.removeItem(`scriptally_manuscripts_${uid}`);
      localStorage.removeItem(`scriptally_versions_${uid}`);
      localStorage.removeItem(`scriptally_packages_${uid}`);
      localStorage.removeItem(`scriptally_agents_${uid}`);
      localStorage.removeItem(`scriptally_queries_${uid}`);
      localStorage.removeItem(`scriptally_activities_${uid}`);
      localStorage.removeItem(`scriptally_journal_${uid}`);
      localStorage.removeItem(`scriptally_dismissed_${uid}`);

      const freshMs = seedManuscripts.map(m => ({ ...m, userId: uid }));
      const freshVer = seedVersions.map(v => ({ ...v, userId: uid }));
      const freshPkg = seedPackages.map(p => ({ ...p, userId: uid }));
      const freshAg = seedAgents.map(a => ({ ...a, userId: uid }));
      const freshQ = seedQueries.map(q => ({ ...q, userId: uid }));
      const freshAct = seedActivities.map(a => ({ ...a, userId: uid }));
      const freshJournal = seedJournalEntries.map(j => ({ ...j, userId: uid }));

      localStorage.setItem(`scriptally_manuscripts_${uid}`, JSON.stringify(freshMs));
      localStorage.setItem(`scriptally_versions_${uid}`, JSON.stringify(freshVer));
      localStorage.setItem(`scriptally_packages_${uid}`, JSON.stringify(freshPkg));
      localStorage.setItem(`scriptally_agents_${uid}`, JSON.stringify(freshAg));
      localStorage.setItem(`scriptally_queries_${uid}`, JSON.stringify(freshQ));
      localStorage.setItem(`scriptally_activities_${uid}`, JSON.stringify(freshAct));
      localStorage.setItem(`scriptally_journal_${uid}`, JSON.stringify(freshJournal));

      setManuscripts(freshMs);
      setVersions(freshVer);
      setPackages(freshPkg);
      setAgents(freshAg);
      setQueries(freshQ);
      setActivities(freshAct);
      setJournalEntries(freshJournal);
      setDismissedTasks([]);
    } else {
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
    }
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
        isOfflineMode,
        login,
        signup,
        logout,
        upgradeToPro,
        downgradeToFree,
        addManuscript,
        updateManuscript,
        addVersion,
        deleteVersion,
        addPackage,
        retirePackage,
        addAgent,
        updateAgent,
        deleteAgent,
        addQuery,
        updateQueryStatus,
        undoQueryStatus,
        updateQuery,
        addJournalEntry,
        deleteJournalEntry,
        updateJournalEntry,
        addActivity,
        deleteActivity,
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

