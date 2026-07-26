/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Agent list — the buffered editing model (decision 1).
 *
 * Opening the flip editor clones the agent into a DRAFT. Every editor interaction mutates the draft
 * only; Done validates it, diffs it against the original, and commits ONE `updateAgent` call with
 * just the changed fields. Escape (or opening another card) discards the draft. Never write per
 * keystroke — `updateAgent` appends an activity per call.
 *
 * ABSENCE IS A FIRST-CLASS STATE (amendment A) for `starRating`, `responseTimeWeeks` and
 * `noResponseMeansNo`. The draft holds response weeks as a STRING so "" can mean "not stated"
 * distinctly from any number, and the other two as `undefined`. The diff therefore has two halves:
 * `changed` (fields to write) and `deletes` (fields to `deleteField()`), so clearing a stated value
 * removes the key rather than storing a zero or a false that would read as a decision.
 */
import { Agent, AgentSocial, SubmissionMethod, SubmissionStatus } from "../types";

export type AgentEditorTab = "contact" | "wishlist" | "materials" | "notes";

export interface AgentDraft {
  id: string;
  name: string;
  agency: string;
  email: string;
  website: string;
  /** ISO 3166-1 alpha-2, written only through a constrained picker (deployed rules validate it). */
  country: string;
  city: string;
  /** Binary door. UNKNOWN is retired: it reads as Open and is only ever written Open/Closed. */
  open: boolean;
  /** "" === not stated. Validated as a positive integer only when non-empty. */
  responseWeeks: string;
  /** undefined === not stated; the switch only writes true/false once the writer sets it. */
  noResponseMeansNo?: boolean;
  submissionMethod: SubmissionMethod | "Other";
  /** The free-text description behind method "Other" (stored in `agentNotes`). */
  methodOther: string;
  genres: string[];
  mswlNotes: string;
  /** undefined === UNRATED, a distinct fact from any rating. Never stored as 0. */
  starRating?: 1 | 2 | 3 | 4 | 5;
  /** Data-URL photo (Phase 3 uploads it; absent === the initials avatar). */
  image?: string;
  socials: AgentSocial[];
  /** The pinned note's subcollection doc id (Phase 5 wires the pinning UI). */
  pinnedNoteId?: string;
  /** Carried verbatim until Phase 5 owns the materials editor, so it round-trips untouched. */
  materialsWanted: Agent["materialsWanted"];
}

const s = (v: unknown): string => (typeof v === "string" ? v : "");

/**
 * Deep-clone an agent into an editable draft.
 *
 * Read-shims applied here: `socials` falls back to the legacy discrete twitter/bluesky/instagram
 * fields (decision 9); method "Other" recovers its description from `agentNotes`; UNKNOWN collapses
 * to open. Absent numerics stay absent — nothing is invented.
 */
export function draftFromAgent(a: Agent): AgentDraft {
  const known = [SubmissionMethod.EMAIL, SubmissionMethod.ONLINE_FORM] as string[];
  const method = known.includes(a.submissionMethod as string)
    ? (a.submissionMethod as SubmissionMethod)
    : a.submissionMethod
      ? "Other"
      : SubmissionMethod.EMAIL;

  return {
    id: a.id,
    name: s(a.name),
    agency: s(a.agency),
    email: s(a.email),
    website: s(a.website),
    country: s(a.country),
    city: s(a.city),
    open: a.submissionStatus !== SubmissionStatus.CLOSED,
    responseWeeks: a.responseTimeWeeks && a.responseTimeWeeks > 0 ? String(a.responseTimeWeeks) : "",
    noResponseMeansNo: typeof a.noResponseMeansNo === "boolean" ? a.noResponseMeansNo : undefined,
    submissionMethod: method as SubmissionMethod | "Other",
    methodOther: method === "Other" ? s(a.agentNotes) || s(a.submissionMethod) : "",
    genres: [...(a.genres || [])],
    mswlNotes: s(a.mswlNotes),
    starRating: a.starRating,
    image: a.image,
    socials: legacySocials(a),
    pinnedNoteId: a.pinnedNoteId,
    materialsWanted: a.materialsWanted,
  };
}

/** Decision 9's read-shim: prefer `socials`, else derive from the discrete legacy fields. */
export function legacySocials(a: Agent): AgentSocial[] {
  if (a.socials && a.socials.length) {
    return a.socials.filter((x) => x && s(x.handle).trim()).map((x) => ({ platform: x.platform, handle: x.handle }));
  }
  const out: AgentSocial[] = [];
  if (s(a.twitter).trim()) out.push({ platform: "X (Twitter)", handle: a.twitter!.trim() });
  if (s(a.bluesky).trim()) out.push({ platform: "Bluesky", handle: a.bluesky!.trim() });
  if (s(a.instagram).trim()) out.push({ platform: "Instagram", handle: a.instagram!.trim() });
  return out;
}

/** A new agent's draft: open, Email, and all three absence-bearing fields OMITTED (amendment A). */
export function blankDraft(id: string): AgentDraft {
  return {
    id,
    name: "",
    agency: "",
    email: "",
    website: "",
    country: "",
    city: "",
    open: true,
    responseWeeks: "",
    noResponseMeansNo: undefined,
    submissionMethod: SubmissionMethod.EMAIL,
    methodOther: "",
    genres: [],
    mswlNotes: "",
    starRating: undefined,
    image: undefined,
    socials: [],
    pinnedNoteId: undefined,
    materialsWanted: [],
  };
}

/**
 * The no-response-means-no field's tri-state grammar (decision 8 + amendment A):
 *   · unset  — switch off, label GREYED (not struck), "Not stated."
 *   · true   — switch on,  label plain,  "Past the window…"
 *   · false  — switch off, label STRUCK, "Worth chasing…"
 * The strike grammar begins only once the writer has actually set a value.
 */
export type NrnState = "on" | "off" | "unset";
export const nrnState = (v?: boolean): NrnState => (v === undefined ? "unset" : v ? "on" : "off");
export const nrnSubtitle = (v?: boolean): string =>
  v === undefined
    ? "Not stated."
    : v
      ? "Past the window, treat silence as a pass."
      : "Worth chasing, even if the response window has elapsed.";

export interface DraftError {
  tab: AgentEditorTab;
  msg: string;
}

/**
 * Blocking validation on Done (decision 2, as amended). Response weeks is checked ONLY when the
 * writer has typed something — an empty field is the legitimate "not stated" state, not an error.
 * Materials rules land with the materials editor in Phase 5.
 */
export function validateDraft(d: AgentDraft): DraftError | null {
  if (!d.name.trim()) return { tab: "contact", msg: "Agent name is required." };
  if (!d.agency.trim()) return { tab: "contact", msg: "Agency is required." };
  const rw = d.responseWeeks.trim();
  if (rw && (!/^\d+$/.test(rw) || Number(rw) < 1)) {
    return { tab: "contact", msg: "Typical response time must be a whole number of weeks, or left blank if you don't know." };
  }
  if (d.submissionMethod === "Other" && !d.methodOther.trim()) {
    return { tab: "contact", msg: "Describe the 'Other' submission method." };
  }
  return null;
}

export interface DraftDiff {
  /** Fields to write. */
  changed: Partial<Agent>;
  /** Fields to remove with `deleteField()` — a stated value the writer cleared. */
  deletes: (keyof Agent)[];
}

const sameSocials = (a: AgentSocial[], b: AgentSocial[]): boolean =>
  a.length === b.length && a.every((x, i) => x.platform === b[i].platform && x.handle === b[i].handle);

/**
 * Diff a draft against the agent it was cloned from — the single write Done commits. Only genuinely
 * changed fields appear; everything untouched stays out of the payload entirely (which is what keeps
 * an unstated `starRating`/`responseTimeWeeks`/`noResponseMeansNo` unstated).
 */
export function diffDraft(original: Agent, d: AgentDraft): DraftDiff {
  const changed: Partial<Agent> = {};
  const deletes: (keyof Agent)[] = [];

  const text = (key: "name" | "agency" | "email" | "website" | "city" | "mswlNotes", next: string) => {
    if (next.trim() !== s(original[key]).trim()) changed[key] = next.trim();
  };
  text("name", d.name);
  text("agency", d.agency);
  text("email", d.email);
  text("website", d.website);
  text("city", d.city);
  text("mswlNotes", d.mswlNotes);

  // Country is an ISO code from a constrained picker; "" clears it.
  if (d.country.trim() !== s(original.country).trim()) changed.country = d.country.trim();

  // The door: UNKNOWN migrates to an explicit value on the first saved edit.
  const nextStatus = d.open ? SubmissionStatus.OPEN : SubmissionStatus.CLOSED;
  if (nextStatus !== original.submissionStatus) changed.submissionStatus = nextStatus;

  // Response weeks — absence is a state, so clearing deletes the key.
  const rw = d.responseWeeks.trim();
  const hadWeeks = typeof original.responseTimeWeeks === "number" && original.responseTimeWeeks > 0;
  if (rw) {
    const n = Number(rw);
    if (!hadWeeks || n !== original.responseTimeWeeks) changed.responseTimeWeeks = n;
  } else if (hadWeeks) {
    deletes.push("responseTimeWeeks");
  }

  // No-response-means-no — tri-state.
  const hadNrn = typeof original.noResponseMeansNo === "boolean";
  if (typeof d.noResponseMeansNo === "boolean") {
    if (!hadNrn || d.noResponseMeansNo !== original.noResponseMeansNo) changed.noResponseMeansNo = d.noResponseMeansNo;
  } else if (hadNrn) {
    deletes.push("noResponseMeansNo");
  }

  // Method: "Other" stores the description in agentNotes and the label in submissionMethod.
  const nextMethod = (d.submissionMethod === "Other" ? d.methodOther.trim() : d.submissionMethod) as SubmissionMethod;
  if (nextMethod !== original.submissionMethod) changed.submissionMethod = nextMethod;
  if (d.submissionMethod === "Other" && d.methodOther.trim() !== s(original.agentNotes).trim()) {
    changed.agentNotes = d.methodOther.trim();
  }

  // Stars — absence is UNRATED; never store 0.
  if (d.starRating !== original.starRating) {
    if (d.starRating) changed.starRating = d.starRating;
    else if (original.starRating) deletes.push("starRating");
  }

  if ((d.image || "") !== (original.image || "")) {
    if (d.image) changed.image = d.image;
    else if (original.image) deletes.push("image");
  }

  const origGenres = original.genres || [];
  if (d.genres.length !== origGenres.length || d.genres.some((g, i) => g !== origGenres[i])) {
    changed.genres = [...d.genres];
  }

  if (!sameSocials(d.socials, original.socials || [])) changed.socials = d.socials.map((x) => ({ ...x }));

  if ((d.pinnedNoteId || "") !== (original.pinnedNoteId || "")) {
    if (d.pinnedNoteId) changed.pinnedNoteId = d.pinnedNoteId;
    else if (original.pinnedNoteId) deletes.push("pinnedNoteId");
  }

  return { changed, deletes };
}

/** True when the draft holds nothing to write — Done can close without touching Firestore. */
export const isDiffEmpty = (diff: DraftDiff): boolean =>
  Object.keys(diff.changed).length === 0 && diff.deletes.length === 0;
