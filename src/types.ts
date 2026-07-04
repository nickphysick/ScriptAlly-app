/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserPlan {
  FREE = "Free",
  PRO = "Pro",
}

export interface User {
  id: string;
  name: string;
  email: string;
  plan: UserPlan;
  trialStartDate: string; // ISO String
  subscriptionStatus: "active" | "trialing" | "canceled" | "none";
  onboardingComplete?: boolean;
  // Where the writer is in their querying journey, captured on the onboarding welcome step.
  // The granular answer — Branch B reads this for its import default (early → add by hand;
  // deep/interest → Smart Import).
  queryingStage?: "starting" | "early" | "deep" | "interest";
  // The collapsed 3-way that drives the onboarding branch: starting → Branch A,
  // querying → Branch B, exploring → Branch C (skip). Derived from queryingStage at the welcome step.
  journeyStage?: "starting" | "querying" | "exploring";
  // The writer's home market — ISO 3166-1 alpha-2 (e.g. "GB"). Seeded silently from the browser locale
  // at signup (never IP), defaults to "GB" at read time via getHomeCountry(), editable in settings.
  // Drives the home-vs-foreign distinction on the agent database. Absent === not set (never null/"").
  homeCountry?: string;
  // App theme. "cappuccino" (default) | "bold" | "editorial". Chosen in Settings → Preferences or
  // the rail-foot switcher (same field); the AppShell root applies .t-capp / .t-bold / .t-edn.
  // Absent === Cappuccino. NOTE: prod firestore.rules still enum-restrict this to the first two —
  // "editorial" persists only once the parked rules edit ships (see BUILD-REPORT.md).
  queriesTheme?: "cappuccino" | "bold" | "editorial";
}

/**
 * Smart Import entitlement usage — stored in the ADMIN-ONLY subdoc `users/{uid}/private/entitlement`,
 * written ONLY by the smartImportMap function via the admin SDK. The client may read it (to derive
 * entitlement state — see src/lib/smartImportEntitlement.ts) but can never write or delete it
 * (firestore.rules: `allow read: if isOwner; allow write: if false`). It lives in a subcollection
 * so it survives a delete-recreate of the user doc — making the free-once gate tamper-proof.
 * Absent fields read as "not used".
 */
export interface SmartImportUsage {
  smartImportFreeUsed?: boolean;        // lifetime free-once flag (Free tier)
  smartImportLastUsedMonth?: string;    // "YYYY-MM" (UTC) of the most recent Pro import
}

export enum ManuscriptStatus {
  DRAFTING = "Drafting",
  REVISING = "Revising",
  READY_TO_QUERY = "Ready to Query",
  QUERYING = "Querying",
  SHELVED = "Shelved",
  ON_SUBMISSION = "On Submission",
}

export interface Manuscript {
  id: string;
  userId: string;
  title: string;
  genre: string; // primary genre
  subGenres?: string[]; // additional genres beyond the primary; existing records read as []
  ageCategory: string;
  wordCount: number;
  logline: string;
  comparableTitles: string;
  status: ManuscriptStatus;
  shelvedReason?: string;
  statusChangedDate: string; // ISO String
  notes?: string;
  // Optional/legacy — read defensively by the activity backfill (`ms.createdDate || now`); not written
  // by the current create path, so it's effectively always absent today.
  createdDate?: string;
  // Lifecycle overlay (independent of `status`): a shelved manuscript is hidden from the Log-a-Query
  // picker and new-query suggestions, but keeps all queries/stats/history. Reversible (Reactivate).
  // Absent === not shelved. Deliberately NOT folded into `status` so the workflow status is preserved.
  shelved?: boolean;
  // The user-chosen default submission package for this manuscript — exactly one, never auto-promoted.
  // Pre-fills `packageId` on a newly logged query. Absent === no active package yet. Resolve via
  // resolveActivePackage() (returns null when it points at a retired/missing/cross-manuscript package).
  activePackageId?: string;
}

export enum ComponentType {
  QUERY_LETTER = "Query Letter",
  SYNOPSIS = "Synopsis",
  SAMPLE_PAGES = "Sample Pages",
  FULL_MANUSCRIPT = "Full Manuscript",
}

export interface ManuscriptVersion {
  id: string;
  manuscriptId: string;
  userId: string;
  componentType: ComponentType;
  versionName: string; // e.g. "QL v1", "QL v2"
  fileAttached: boolean; // attachment mock flag
  fileName?: string;
  createdDate: string; // ISO String
  contentDraft?: string; // the pasted/typed text body (reused as the v1 "Paste" content for text mode)
  // Authoring fields (redesign). `contentType` selects the mode: 'text' uses contentDraft, 'link' uses
  // contentLink; 'file' is reserved (v1 renders Attach-file as a disabled "coming soon" — no Storage).
  notes?: string;
  contentType?: "text" | "link" | "file";
  contentLink?: string;
}

export interface SubmissionPackage {
  id: string;
  manuscriptId: string;
  userId: string;
  packageName: string;
  queryLetterVersionId: string;
  synopsisVersionId: string;
  samplePagesVersionId: string;
  status: "Active" | "Retired";
  createdDate: string; // ISO String
}

export enum SubmissionStatus {
  OPEN = "Open",
  CLOSED = "Closed",
  UNKNOWN = "Unknown",
}

export enum SubmissionMethod {
  EMAIL = "Email",
  ONLINE_FORM = "Online Form",
  QUERY_MANAGER = "Query Manager",
  POST = "Post",
}

/** One repeatable social handle on an agent — platform label + handle/URL. */
export interface AgentSocial {
  platform: string; // e.g. "X / Twitter", "Bluesky", "QueryTracker", "TikTok", "Other"
  handle: string; // handle or profile URL
}

export interface Agent {
  id: string;
  userId: string;
  name: string;
  agency: string;
  email: string;
  website: string;
  // Optional location — simple stored fields (added in the v12 Edit Agent revision). The flag-icon
  // picker + territory tags are a later enhancement; these just hold the agent's country/city.
  country?: string;
  city?: string;
  twitter?: string;
  bluesky?: string;
  instagram?: string;
  // Arbitrary, repeatable social handles from the Add-Agent form. The four known platforms
  // (X / Twitter, Bluesky, Instagram) are ALSO mirrored into the discrete fields above for
  // back-compat with the agent-database display; QueryTracker / TikTok / Other live here only.
  socials?: AgentSocial[];
  genres: string[]; // multi-select genres
  mswlNotes: string;
  starRating: 1 | 2 | 3 | 4 | 5;
  submissionStatus: SubmissionStatus;
  responseTimeWeeks: number;
  noResponseMeansNo: boolean; // True: no response means rejection/close
  submissionMethod: SubmissionMethod;
  materialsWanted: string[]; // e.g. ["Query Letter", "Synopsis", "First 10 pages"]
  dateAdded: string; // ISO String
  lastCheckedDate: string; // ISO String
  notes: string;
  agentNotes?: string;
  // Standing disposition set when logging a rejection: would you query this agent again (different MS)?
  requeryPreference?: "yes" | "maybe" | "no";
  // Set on agents created via Smart Import; surfaces them in the agent database for completion.
  importedNeedsReview?: boolean;
  // Lifecycle overlay, separate from `submissionStatus` (the agent's own open/closed availability):
  // a set-aside agent is one YOU'RE not pursuing — dropped from "who to query next" and the idle
  // bucket/Agents stat card, but all queries + history kept. Reversible (Bring back). Absent === active.
  setAside?: boolean;
  // Pinned to the top of the agents list (a "Pinned" group above every sort). Pure list ordering —
  // no effect on suggestions, stats or Up next. Absent === not pinned (never null).
  pinned?: boolean;
}

export interface CommunityAgent {
  id: string;
  name: string;
  agency: string;
  email: string;
  website: string;
  twitter?: string;
  bluesky?: string;
  instagram?: string;
  genres: string[];
  mswlNotes: string;
  starRating: 1 | 2 | 3 | 4 | 5;
  submissionStatus: SubmissionStatus;
  responseTimeWeeks: number;
  noResponseMeansNo: boolean;
  submissionMethod: SubmissionMethod;
  materialsWanted: string[];
  dateAdded: string;
  lastCheckedDate: string;
  notes: string;
  agentNotes?: string;
  contributedByCount: number;
  lastVerifiedDate: string;
  dataSource: "seed" | "community";
  communityQueryCount: number;
}

/**
 * A material sent with a query, recording WHAT was sent — not just a label.
 * `type` + `quantity` turn "Sample Pages" into "50 pages" / "3 chapters" / "10,000 words".
 * Stored alongside legacy plain-string entries in the same array (backward-compatible union);
 * a structured item with no type/quantity is equivalent to its bare label.
 */
export interface QueryMaterial {
  material: string; // canonical name, e.g. "Query Letter" | "Synopsis" | "Sample Pages"
  type?: "pages" | "words" | "chapters" | "other";
  quantity?: number | string; // number for pages/words/chapters; free text when type === "other"
}

export enum QueryStatus {
  QUERIED = "Queried",
  PARTIAL_REQUESTED = "Partial Requested",
  PARTIAL_SENT = "Partial Sent",
  FULL_REQUESTED = "Full Requested",
  FULL_SENT = "Full Sent",
  REVISE_RESUBMIT = "Revise & Resubmit",
  OFFER = "Offer",
  REJECTED = "Rejected",
  WITHDRAWN = "Withdrawn",
  NO_RESPONSE = "No Response",
}

export interface Query {
  id: string;
  userId: string;
  manuscriptId: string;
  agentId: string;
  packageId: string; // Links to active SubmissionPackage
  status: QueryStatus;
  dateSent?: string; // ISO String; absent for provisional (undated) imported queries
  personalisationNotes: string;
  sendMethod: SubmissionMethod;
  nudgeDate?: string; // ISO String or date (when they plan to nudge)
  lastNudgeSentDate?: string; // ISO String when they actually nudged
  responseDeadline?: string; // Computed or explicit response expectation date (ISO String)
  materialsWanted?: (string | QueryMaterial)[]; // Materials sent with the query. Legacy entries are plain strings ("Sample Pages"); new entries are structured QueryMaterial ("50 pages"). Backward-compatible union — readers must route every item through formatQueryMaterial().
  ifNoResponse?: string; // Preference if no response by deadline: "Remind me to nudge" | "Mark as no response automatically" | "Do nothing"
  partialRequestedDate?: string;
  partialSentDate?: string;
  fullRequestedDate?: string;
  fullSentDate?: string;
  rejectedDate?: string;
  rejectionType?: string; // Edit-form rejection category, e.g. "Form rejection"
  rejectionDetails?: string;
  agentComments?: string; // Edit-form free-text notes about the agent's response

  // Written by RecordResponseModal on a Revise & Resubmit — the agent's revision guidance.
  rrNotes?: string;

  // Written by RecordResponseModal when logging a rejection
  rejectionFeedbackType?: "form" | "standard" | "detailed";
  rejectionFeedbackText?: string;
  rejectionReflection?: string; // private — never shown in stats
  rejectionLesson?: string; // "anything you'd do differently?" — private note to future self
  rejectedFromStatus?: QueryStatus; // the status held immediately before rejection (e.g. Full Sent → "full declined")

  // Written by recordResponse (the single response path) and validated by the Firestore rules, but
  // previously undeclared here. The date-like fields hold Firestore Timestamps at runtime and are
  // read through date-coercion helpers, so they're typed loosely; the rest are strings.
  responseReceivedAt?: any; // Timestamp | string — when the response actually arrived
  lastStatusChange?: any; // Timestamp — audit: when the status change was recorded
  expectedSendDate?: any; // Timestamp | string — partial/full: when the materials are due out
  sendReminderDate?: any; // Timestamp | string — self-reminder to send materials / resubmit
  offerDate?: any; // Timestamp | string
  offerResponseDeadline?: any; // Timestamp | string
  offerNotes?: string;
  closingReason?: string; // internal token: noResponseAfterWindow | withdrew | agentClosedSubmissions | other
  closingNotes?: string;
  materialsRequestedType?: string; // pages | words | chapters | other
  materialsRequestedQuantity?: string | number;
  fullVersionSent?: string; // Full Requested — which draft of the full is going out

  // Display-only revision counter — derived from the activity log by recomputeQuery (1 + count
  // of R&R → Full Sent resubmissions). DELIBERATELY separate from `status`: the "(v2)" marker is
  // rendered from this, never folded into the status string, so every `status === FULL_SENT`
  // comparison keeps working. Absent or 1 means the first/only send; >= 2 renders "(v2)" etc.
  revisionRound?: number;

  // Derived by recomputeQuery: true once any agent-acting activity (partial/full/R&R/offer/
  // rejected received) exists in the log. THE source for "Responses Received" — boolean, so each
  // query counts at most once regardless of pipeline stage. Absent on un-migrated docs.
  hasAgentResponded?: boolean;
}

export enum ActivityType {
  STATUS_CHANGED = "Status Changed",
  NUDGE_SENT = "Nudge Sent",
  QUERY_SENT = "Query Sent",
  MATERIALS_SENT = "Materials Sent",
  AGENT_ADDED = "Agent Added",
  AGENT_UPDATED = "Agent Updated",
  AGENT_DELETED = "Agent Deleted",
  MANUSCRIPT_ADDED = "Manuscript Added",
  MANUSCRIPT_UPDATED = "Manuscript Updated",
  MANUSCRIPT_DELETED = "Manuscript Deleted",
}

export interface Activity {
  id: string;
  userId: string;
  queryId: string;
  manuscriptId: string;
  activityType: ActivityType;
  description: string;
  date: string; // ISO String
  details: string; // details about selection ("QL v2 + Syn v4", agent quote, etc.)
  // The QueryStatus this event produced, stamped at append time by every status-bearing write
  // (query sent, response recorded, materials sent). Query status/dates/flags are DERIVED from
  // these by recomputeQuery — never from parsing description strings. Absent on non-status
  // events (agent added, nudge, …) and on pre-migration records.
  resultingStatus?: QueryStatus;
}

export interface JournalEntry {
  id: string;
  userId: string;
  queryId: string;
  entryText: string;
  createdAt: string; // ISO String
}

/**
 * A user-authored note — the first STORED, user-originated object in the app (everything in the
 * to-do system is otherwise derived). Lives in its own owner-scoped collection and is read by the
 * desk, the To-do list and (later) Fortnight from that single source — never denormalised onto
 * query/agent records.
 *
 * Dates are ISO strings (matching the rest of the per-user collections), split by granularity:
 *  · dueDate — date-only "YYYY-MM-DD" (BrandDatePicker-native). Optional; with one, the note is also
 *    a To-do task. Day-granular so overdue/due-today is a clean string compare, no timezone drift.
 *  · createdAt / updatedAt / doneAt — full ISO datetime strings (new Date().toISOString()).
 * Every ACTIVE (not-done) note lives on the desk — there is no separate "pinned" flag.
 */
export type NoteColour = "pink" | "sage" | "yellow";

export interface Note {
  id: string;
  userId: string;
  text: string;
  colour: NoteColour;
  dueDate: string | null; // "YYYY-MM-DD" — optional; with a date the note is also a task
  done: boolean;
  doneAt: string | null; // full ISO datetime, stamped on completion
  createdAt: string; // full ISO datetime
  updatedAt: string; // full ISO datetime
}

export interface DismissedTask {
  id: string;
  userId: string;
  taskType: string;
  relatedRecordId: string;
  dismissedDate: string; // ISO String
  resurfaceDate?: string; // ISO String
  dismissType: "permanent" | "fixed snooze" | "custom date";
}

export interface Task {
  id: string;
  priority: "urgent" | "overdue" | "suggested";
  title: string;
  description: string;
  manuscriptTitle: string;
  context: string;
  relatedRecordId: string;
  taskType: string;
  actionLabel: string;
  actionPath: string; // routing state context
}
