/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * FEED WORDING v1 — the writer's own housekeeping, as the activity feed records and says it.
 *
 * Three jobs, one file, so the write and the sentence cannot disagree about what a group means:
 *   1. WHO a row is about, carried on the activity at write time (`subjectName`, `subjectAgency`), never parsed back
 *      out of its `description`. A row the feed cannot name is dropped by `feedEntries`, never printed as a name.
 *   2. WHAT a save changed, decided once by comparing the patch with the stored record (`agentChange`,
 *      `manuscriptChange`). Both agent save paths call it and write ONE row per save; a save that changes nothing, or
 *      only private jottings (notes), writes none.
 *   3. THE SENTENCE (`houseSay`), and the burst rule: updates to one agent less than ten minutes apart read as one row.
 *
 * ⚠️ `description` IS LEFT AS THE OLD WRITERS WROTE IT. Other surfaces read it (the closed stamp in lib/agentList
 * matches "… for {name} at {agency}" and `details` "Submission status updated to Closed"), so the feed builds its own
 * sentence from the carried fields instead of rewording the stored one.
 */
import { ActivityType, type Activity, type Agent, type Manuscript, ManuscriptStatus, SubmissionStatus } from "../types";
import type { FeedSeg } from "./dashFeed";
import type { ActivityInput } from "./activityWrite";
import { CLOSED_DETAIL } from "./agentList";

/* ── 1 · the subject ───────────────────────────────────────────────────────────────────────────── */

/** The agent's subject fields: the name only when it has one, the agency only when it has one, and (feed wording v1.1)
 *  the agent's id, which is what the feed links the name by. */
export function agentSubject(a: (Pick<Agent, "name" | "agency"> & { id?: string }) | undefined): Pick<Activity, "subjectName" | "subjectAgency" | "subjectId"> {
  const name = (a?.name ?? "").trim();
  const agency = (a?.agency ?? "").trim();
  const id = (a?.id ?? "").trim();
  return { ...(name ? { subjectName: name } : {}), ...(agency ? { subjectAgency: agency } : {}), ...(id ? { subjectId: id } : {}) };
}

/** A manuscript's subject: its title, in `subjectName`. */
export function manuscriptSubject(m: Pick<Manuscript, "title"> | undefined): Pick<Activity, "subjectName"> {
  const title = (m?.title ?? "").trim();
  return title ? { subjectName: title } : {};
}

/** `removedQueries`, absent at zero. */
export const removedOf = (n: number): Pick<Activity, "removedQueries"> => (n > 0 ? { removedQueries: n } : {});

/* ── 2 · what a save changed ───────────────────────────────────────────────────────────────────── */

export type AgentGroup = "name" | "agency" | "open" | "fit" | "wishlist" | "genres" | "contact" | "replyTime" | "asks" | "reopens";

/** The groups, in the order the sentences name them. */
export const AGENT_GROUPS: readonly AgentGroup[] = ["name", "agency", "open", "fit", "wishlist", "genres", "contact", "replyTime", "asks", "reopens"];

/** Every agent field a save can carry that the feed narrates, by its group. */
export const AGENT_GROUP_OF: Readonly<Record<string, AgentGroup>> = {
  name: "name",
  agency: "agency",
  submissionStatus: "open",
  starRating: "fit",
  mswlNotes: "wishlist",
  genres: "genres",
  email: "contact", website: "contact", twitter: "contact", bluesky: "contact", instagram: "contact", socials: "contact",
  city: "contact", country: "contact",
  responseTimeWeeks: "replyTime", noResponseMeansNo: "replyTime",
  submissionMethod: "asks", submissionMethodOther: "asks", materialsWanted: "asks",
  reopensOn: "reopens",
};

/**
 * Fields whose change alone writes no row. The first nine are the pack's list; the rest are the Agent fields a save
 * path can carry that the pack's table does not name (reported): ids and stamps, the "agency unknown" flag that rides
 * an agency change, the card's cached note preview, and the found-value provenance map.
 */
export const AGENT_SILENT: ReadonlySet<string> = new Set([
  "notes", "agentNotes", "pinnedNoteId", "image", "lastCheckedDate", "mswlCheckedAt", "importedNeedsReview", "requeryPreference", "setAside",
  "id", "userId", "dateAdded", "agencyUnknown", "notePreview", "fieldSources",
]);

/** "not there" in any of its spellings — absent, null, "", [] — is one value. */
const norm = (v: unknown): string => {
  if (v === undefined || v === null || v === "") return "∅";
  if (Array.isArray(v) && v.length === 0) return "∅";
  return JSON.stringify(v);
};

export interface FeedChange {
  changed: string[];
  previousName?: string;
  changedTo?: string;
}

/** What an agent save changed: the groups whose fields differ from the stored record. Empty = narrate nothing. */
export function agentChange(stored: Agent, patch: Partial<Record<string, unknown>>): FeedChange {
  const groups = new Set<AgentGroup>();
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    const g = AGENT_GROUP_OF[k];
    if (!g) continue; // silent, or not an agent field the feed knows
    if (norm(v) === norm((stored as unknown as Record<string, unknown>)[k])) continue;
    groups.add(g);
  }
  const changed = AGENT_GROUPS.filter((g) => groups.has(g));
  const prev = (stored.name ?? "").trim();
  return {
    changed,
    ...(groups.has("name") && prev ? { previousName: prev } : {}),
    ...(groups.has("open") && typeof patch.submissionStatus === "string" && patch.submissionStatus ? { changedTo: patch.submissionStatus } : {}),
  };
}

/** The stored `details` the old writer stamped — the closed stamp (lib/agentList) reads the Closed one. */
function agentDetails(stored: Agent, patch: Partial<Record<string, unknown>>, c: FeedChange): string {
  if (c.changed.includes("open") && c.changedTo === SubmissionStatus.CLOSED) return CLOSED_DETAIL;
  if (c.changed.includes("open") && c.changedTo === SubmissionStatus.OPEN) return "Submission status updated to Open";
  if (c.changed.includes("fit")) return `Updated agent fit from ${stored.starRating} to ${patch.starRating}`;
  if (c.changed.includes("wishlist")) return "Updated wishlist notes field";
  return "";
}

/**
 * The ONE Agent Updated row a save writes, or null when the save changed nothing the feed narrates. The subject is the
 * agent AFTER the save (a rename carries the old name in `previousName`).
 */
export function agentUpdateActivity(stored: Agent, patch: Partial<Record<string, unknown>>, dateIso: string): ActivityInput | null {
  const c = agentChange(stored, patch);
  if (c.changed.length === 0) return null;
  const after = {
    id: stored.id,
    name: typeof patch.name === "string" ? patch.name : stored.name,
    agency: typeof patch.agency === "string" ? patch.agency : stored.agency,
  };
  return {
    activityType: ActivityType.AGENT_UPDATED,
    description: `You updated details for ${after.name} at ${after.agency}`,
    manuscriptId: "", queryId: "", date: dateIso,
    details: agentDetails(stored, patch, c),
    ...agentSubject(after),
    changed: c.changed,
    ...(c.previousName ? { previousName: c.previousName } : {}),
    ...(c.changedTo ? { changedTo: c.changedTo } : {}),
  };
}

/** A sweep of several agents: ONE row, no subject, `batchCount`. */
export function agentSweepActivity(n: number, dateIso: string): ActivityInput {
  return {
    activityType: ActivityType.AGENT_UPDATED,
    description: `You updated ${n} agents' details`,
    manuscriptId: "", queryId: "", date: dateIso, details: "",
    batchCount: n,
  };
}

/** A manuscript save: `title` (with `previousName`), `status` (with `changedTo`), else `details`. Empty = nothing. */
export function manuscriptChange(stored: Manuscript, fields: Partial<Record<string, unknown>>): FeedChange {
  const keys = Object.entries(fields).filter(([k, v]) => v !== undefined
    && norm(v) !== norm((stored as unknown as Record<string, unknown>)[k])).map(([k]) => k);
  /* comps-only writes stay silent, as built (lib/manuscriptFeed) */
  const loud = keys.filter((k) => k !== "comps" && k !== "statusChangedDate");
  if (loud.length === 0) return { changed: [] };
  const title = loud.includes("title");
  const status = loud.includes("status");
  const changed = [...(title ? ["title"] : []), ...(status ? ["status"] : []), ...(loud.some((k) => k !== "title" && k !== "status") ? ["details"] : [])];
  const prev = (stored.title ?? "").trim();
  return {
    changed,
    ...(title && prev ? { previousName: prev } : {}),
    ...(status && typeof fields.status === "string" ? { changedTo: fields.status } : {}),
  };
}

/* ── 3 · the sentences ─────────────────────────────────────────────────────────────────────────── */

/** The app's own words for a manuscript status (lib/manuscriptV21 STATUS_WORDS), as they sit inside a sentence. */
const MS_STATUS_WORDS: Record<string, string> = {
  [ManuscriptStatus.DRAFTING]: "drafting",
  [ManuscriptStatus.REVISING]: "revising",
  [ManuscriptStatus.READY_TO_QUERY]: "ready to query",
  [ManuscriptStatus.QUERYING]: "querying",
  [ManuscriptStatus.SHELVED]: "shelved",
  [ManuscriptStatus.ON_SUBMISSION]: "on submission",
};

/** The groups a two-group sentence may name, and the words it names them with. */
const PAIR_WORDS: Partial<Record<string, string>> = {
  fit: "agent fit", wishlist: "wishlist", genres: "genres", contact: "contact details", replyTime: "reply time",
};
const PAIR_ORDER = ["fit", "wishlist", "genres", "contact", "replyTime"];

const along = (n: number | undefined): FeedSeg[] =>
  n && n > 0 ? [{ t: `, along with ${n} ${n === 1 ? "query" : "queries"}` }] : [];

export type HouseFields = Pick<Activity, "activityType" | "changed" | "previousName" | "changedTo" | "removedQueries" | "batchCount">;

/** One agent update's sentence. `x` is the person's run. */
function agentUpdatedSay(a: HouseFields, x: FeedSeg): FeedSeg[] {
  const g = (a.changed ?? []).filter((k) => (AGENT_GROUPS as readonly string[]).includes(k));
  const details: FeedSeg[] = [{ t: "You updated " }, x, { t: "'s details" }];
  if (g.length === 1) {
    switch (g[0] as AgentGroup) {
      case "name": return a.previousName ? [{ t: `You renamed ${a.previousName} to ` }, x] : details;
      case "agency": return details; // a move with its agency known is worded in `houseSay`
      case "open":
        if (a.changedTo === SubmissionStatus.OPEN) return [{ t: "You marked " }, x, { t: " as open to queries" }];
        if (a.changedTo === SubmissionStatus.CLOSED) return [{ t: "You marked " }, x, { t: " as closed to queries" }];
        /* Feed wording v1.1 (Nick's ruling): the third value has no sentence of its own */
        return details;
      case "fit": return [{ t: "You updated " }, x, { t: "'s agent fit" }];
      case "wishlist": return [{ t: "You updated " }, x, { t: "'s wishlist" }];
      case "genres": return [{ t: "You updated " }, x, { t: "'s genres" }];
      case "contact": return [{ t: "You updated " }, x, { t: "'s contact details" }];
      case "replyTime": return [{ t: "You updated " }, x, { t: "'s reply time" }];
      case "asks": return [{ t: "You updated what " }, x, { t: " asks for" }];
      case "reopens": return [{ t: "You updated when " }, x, { t: " reopens" }];
    }
  }
  if (g.length === 2 && g.every((k) => PAIR_WORDS[k])) {
    const [p, q] = PAIR_ORDER.filter((k) => g.includes(k));
    return [{ t: "You updated " }, x, { t: `'s ${PAIR_WORDS[p]} and ${PAIR_WORDS[q]}` }];
  }
  return details;
}

/**
 * The sentence for one of the writer's housekeeping rows. `x` is the subject's run: the person (`who`) for an agent
 * row, the title (`em`) for a manuscript row. `agency` is the agent's agency, for a move.
 */
export function houseSay(a: HouseFields, x: FeedSeg, agency = ""): FeedSeg[] | null {
  switch (a.activityType) {
    case ActivityType.AGENT_ADDED: return [{ t: "You added " }, x, { t: " to your contact list" }];
    case ActivityType.AGENT_DELETED: return [{ t: "You removed " }, x, { t: " from your contact list" }, ...along(a.removedQueries)];
    case ActivityType.AGENT_UPDATED: {
      const g = a.changed ?? [];
      if (g.length === 1 && g[0] === "agency") return agency ? [{ t: "You moved " }, x, { t: ` to ${agency}` }] : [{ t: "You updated " }, x, { t: "'s details" }];
      return agentUpdatedSay(a, x);
    }
    case ActivityType.MANUSCRIPT_ADDED: return [{ t: "You added " }, x, { t: " to your manuscripts" }];
    case ActivityType.MANUSCRIPT_DELETED: return [{ t: "You removed " }, x, { t: " from your manuscripts" }, ...along(a.removedQueries)];
    case ActivityType.MANUSCRIPT_UPDATED: {
      const g = a.changed ?? [];
      if (g.length === 1 && g[0] === "title" && a.previousName) return [{ t: `You renamed ${a.previousName} to ` }, x];
      if (g.length === 1 && g[0] === "status" && a.changedTo && MS_STATUS_WORDS[a.changedTo]) return [{ t: "You marked " }, x, { t: ` as ${MS_STATUS_WORDS[a.changedTo]}` }];
      return [{ t: "You updated the details of " }, x];
    }
    default: return null;
  }
}

/** A sweep's sentence — no person run, because it names no one. Its "{n} agents' details" goes to the Contact list. */
export const sweepSay = (n: number): FeedSeg[] => [{ t: "You updated " }, { t: `${n} agents' details`, to: "/agents" }];

/* ── the burst ─────────────────────────────────────────────────────────────────────────────────── */

/** Updates to one agent less than this far apart read as one row. */
export const BURST_MS = 10 * 60_000;

const keyOf = (name: string | undefined, agency: string | undefined) => `${(name ?? "").trim().toLowerCase()}|${(agency ?? "").trim().toLowerCase()}`;

/**
 * Folds bursts of Agent Updated rows into one, at the NEWEST row's id and time, worded from the union of their groups.
 * The rows are matched on the subject they carry, and a rename inside the burst carries the old name into the match, so
 * "fit at 10:00, rename at 10:04" is one row. Display only: nothing stored changes.
 */
export function foldAgentBursts(activities: readonly Activity[]): Activity[] {
  const isUpd = (a: Activity) => a.activityType === ActivityType.AGENT_UPDATED && !a.batchCount && !a.queryId
    && (!!a.subjectName || !!a.subjectAgency);
  const t = (a: Activity) => new Date(a.date).getTime();
  const upd = activities.filter(isUpd).slice().sort((x, y) => t(y) - t(x));
  type Burst = { head: Activity; keys: Set<string>; oldestAt: number; groups: Set<string>; previousName?: string; changedTo?: string; agency?: string };
  const bursts: Burst[] = [];
  const absorbed = new Set<string>();
  const merged = new Map<string, Activity>();
  for (const a of upd) {
    const k = keyOf(a.subjectName, a.subjectAgency);
    const b = bursts.find((x) => x.keys.has(k) && x.oldestAt - t(a) < BURST_MS && x.oldestAt - t(a) >= 0);
    if (!b) {
      const nb: Burst = { head: a, keys: new Set([k]), oldestAt: t(a), groups: new Set(a.changed ?? []), previousName: a.previousName, changedTo: a.changedTo };
      if (a.previousName) nb.keys.add(keyOf(a.previousName, a.subjectAgency));
      bursts.push(nb);
      continue;
    }
    absorbed.add(a.id);
    b.oldestAt = t(a);
    for (const g of a.changed ?? []) b.groups.add(g);
    /* the OLDEST rename's old name is the name the burst started from; the NEWEST open value is where it ended */
    if (a.previousName) { b.previousName = a.previousName; b.keys.add(keyOf(a.previousName, a.subjectAgency)); }
    if (!b.changedTo && a.changedTo) b.changedTo = a.changedTo;
  }
  for (const b of bursts) {
    if (b.groups.size === (b.head.changed ?? []).length && b.previousName === b.head.previousName) continue;
    const changed = AGENT_GROUPS.filter((g) => b.groups.has(g));
    merged.set(b.head.id, {
      ...b.head,
      changed,
      ...(b.groups.has("name") && b.previousName ? { previousName: b.previousName } : {}),
      ...(b.changedTo ? { changedTo: b.changedTo } : {}),
    });
  }
  return activities.filter((a) => !absorbed.has(a.id)).map((a) => merged.get(a.id) ?? a);
}
