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
  genre: string;
  ageCategory: string;
  wordCount: number;
  logline: string;
  comparableTitles: string;
  status: ManuscriptStatus;
  shelvedReason?: string;
  statusChangedDate: string; // ISO String
  notes?: string;
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
  contentDraft?: string; // rich editing mock content
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
}

export interface Agent {
  id: string;
  userId: string;
  name: string;
  agency: string;
  email: string;
  website: string;
  twitter?: string;
  bluesky?: string;
  instagram?: string;
  genres: string[]; // multi-select genres
  mswlNotes: string;
  starRating: 1 | 2 | 3 | 4 | 5;
  submissionStatus: SubmissionStatus;
  responseTimeWeeks: number;
  noResponseMeansNo: boolean; // True: no response means rejection/close
  submissionMethod: SubmissionMethod;
  materialsWanted: string[]; // e.g. ["Query Letter", "Synopsis", "Sample Pages"]
  dateAdded: string; // ISO String
  lastCheckedDate: string; // ISO String
  notes: string;
  agentNotes?: string;
  // Standing disposition set when logging a rejection: would you query this agent again (different MS)?
  requeryPreference?: "yes" | "maybe" | "no";
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
  dateSent: string; // ISO String
  personalisationNotes: string;
  sendMethod: SubmissionMethod;
  nudgeDate?: string; // ISO String or date (when they plan to nudge)
  lastNudgeSentDate?: string; // ISO String when they actually nudged
  responseDeadline?: string; // Computed or explicit response expectation date (ISO String)
  materialsWanted?: string[]; // Materials sent with the query, e.g. ["Query Letter", "Synopsis", "Sample Pages"]
  ifNoResponse?: string; // Preference if no response by deadline: "Remind me to nudge" | "Mark as no response automatically" | "Do nothing"
  partialRequestedDate?: string;
  partialSentDate?: string;
  fullRequestedDate?: string;
  fullSentDate?: string;
  rejectedDate?: string;
  rejectionType?: string;
  rejectionDetails?: string;
  // Written by RecordResponseModal when logging a rejection
  rejectionFeedbackType?: "form" | "standard" | "detailed";
  rejectionFeedbackText?: string;
  rejectionReflection?: string; // private — never shown in stats
  rejectionLesson?: string; // "anything you'd do differently?" — private note to future self
  rejectedFromStatus?: QueryStatus; // the status held immediately before rejection (e.g. Full Sent → "full declined")
}

export enum ActivityType {
  STATUS_CHANGED = "Status Changed",
  NUDGE_SENT = "Nudge Sent",
  QUERY_SENT = "Query Sent",
  MATERIALS_SENT = "Materials Sent",
  AGENT_ADDED = "Agent Added",
  AGENT_UPDATED = "Agent Updated",
  MANUSCRIPT_ADDED = "Manuscript Added",
  MANUSCRIPT_UPDATED = "Manuscript Updated",
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
}

export interface JournalEntry {
  id: string;
  userId: string;
  queryId: string;
  entryText: string;
  createdAt: string; // ISO String
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
