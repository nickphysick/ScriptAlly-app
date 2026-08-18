/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Timeline event family resolution — the shared classifier the Dashboard "story so far" card
 * grammar consumes (and the housekeeping cut keys on). Pure logic, no JSX (the glyph lives in
 * components/TimelineDot.tsx).
 *
 * Family derives primarily from the stamped resultingStatus, then activityType, then a desc-based
 * fallback — so it never depends on display copy.
 */
import { ActivityType, QueryStatus } from "../types";
import { getActivityKeyAndDefaults } from "./activityUtils";

/**
 * ⚠️ F1 (holding-reply pack) · `unknown` EXISTS SO A TYPE THIS BUILD HAS NEVER HEARD OF IS
 * INVISIBLE RATHER THAN WRONG.
 *
 * The fault was the SILENT DEFAULT, not the mapping. Anything this function could not place fell
 * through to `outgoing` — a direction claim — so an activity type added after a client shipped
 * would be drawn on that client as something the WRITER sent. That is not a hypothetical: the
 * holding reply is an INCOMING event, and every browser still running today's bundle would have
 * filed it outgoing the moment a newer one wrote the first record.
 *
 * ⚠️ THE TEST IS "IS THE TYPE A MEMBER OF THIS BUILD'S ENUM", NOT "DID THE DESCRIPTION MATCH".
 * Those are different questions and conflating them would hide real history: a legacy
 * `Status Changed` row whose prose matches none of the substrings is a KNOWN type with an
 * uncategorised description, and it keeps the neutral reading it has always had. Only a type
 * string that is not in `ActivityType` at all is unplaceable, and only that is made invisible.
 */
export type TimelineFamily = "incoming" | "outgoing" | "closed" | "offer" | "nudge" | "housekeeping" | "unknown";

export interface TimelineActivityLike {
  activityType?: ActivityType;
  description?: string;
  resultingStatus?: QueryStatus;
}

const KNOWN_ACTIVITY_TYPES = new Set<string>(Object.values(ActivityType));

/**
 * ⚠️ LOGGED ONCE PER UNRECOGNISED VALUE, not once per row. A feed holding two hundred rows of a
 * type this build does not know would otherwise write two hundred identical lines and bury the one
 * fact worth reading. The set is module-level and never cleared — the point is that the FIRST
 * sighting is reported, and a second report says nothing new.
 */
const warnedTypes = new Set<string>();
const warnUnknownType = (value: string): void => {
  if (warnedTypes.has(value)) return;
  warnedTypes.add(value);
  console.warn(
    `[ScriptAlly] timeline: activity type "${value}" is not in this build's ActivityType. `
    + `Its events are drawn as "unknown" and cut from the story feed rather than guessed at — `
    + `this client is older than the record.`,
  );
};

const HOUSEKEEPING_TYPES = new Set<ActivityType>([
  ActivityType.AGENT_ADDED,
  ActivityType.AGENT_UPDATED,
  ActivityType.AGENT_DELETED,
  ActivityType.MANUSCRIPT_ADDED,
  ActivityType.MANUSCRIPT_UPDATED,
  ActivityType.MANUSCRIPT_DELETED,
]);

export const getTimelineFamily = (act: TimelineActivityLike): TimelineFamily => {
  /* ⚠️ F1 · CHECKED FIRST, because every branch below is a guess about a type we can place, and a
     type we cannot place must reach none of them. `resultingStatus` is deliberately not consulted:
     a rung stamped with a status this build DOES know is placeable whatever its type says. */
  const t = act.activityType as string | undefined;
  if (t != null && !KNOWN_ACTIVITY_TYPES.has(t) && !act.resultingStatus) {
    warnUnknownType(t);
    return "unknown";
  }

  if (act.activityType && HOUSEKEEPING_TYPES.has(act.activityType)) return "housekeeping";
  if (act.activityType === ActivityType.NUDGE_SENT) return "nudge";

  // Status-bearing events: the stamped resultingStatus is the authority.
  switch (act.resultingStatus) {
    case QueryStatus.OFFER:
      return "offer";
    case QueryStatus.PARTIAL_REQUESTED:
    case QueryStatus.FULL_REQUESTED:
    case QueryStatus.REVISE_RESUBMIT:
      return "incoming";
    case QueryStatus.QUERIED:
    case QueryStatus.PARTIAL_SENT:
    case QueryStatus.FULL_SENT:
      return "outgoing";
    case QueryStatus.REJECTED:
    case QueryStatus.WITHDRAWN:
    case QueryStatus.NO_RESPONSE:
      return "closed";
  }

  // Pre-migration / unstamped events: fall back to the desc-based key.
  const { key } = getActivityKeyAndDefaults(act.description || "", act.activityType);
  switch (key) {
    case "offer":
      return "offer";
    case "partial_req":
    case "full_req":
    case "rr":
      return "incoming";
    case "queried":
    case "partial_sent":
    case "full_sent":
      return "outgoing";
    case "rejected":
    case "withdrawn":
    case "no_response":
      return "closed";
    case "nudge_sent":
      return "nudge";
    case "agent_added":
    case "agent_updated":
    case "ms_added":
    case "ms_updated":
      return "housekeeping";
    default:
      return "outgoing"; // bare "Status changed" / uncategorised — neutral, no consequence tag
  }
};

export const isHousekeeping = (act: TimelineActivityLike): boolean => getTimelineFamily(act) === "housekeeping";

/**
 * ⚠️ F1 · WHAT THE STORY FEED DRAWS. Housekeeping is cut because it is noise; `unknown` is cut
 * because this build cannot say what it is, and a row whose direction, glyph and wording would all
 * be guesses is worse than a row that is not there. It is a ONE-LINE seam so the two reasons stay
 * separable — the day the feed learns a type, it stops being cut for the second reason only.
 */
export const isFeedDrawable = (act: TimelineActivityLike): boolean => {
  const f = getTimelineFamily(act);
  return f !== "housekeeping" && f !== "unknown";
};

/** Card styling per family (Dashboard "story so far"). Nudge reuses the outgoing palette; offer is
 *  rendered as a bespoke hero, so it has no entry here. */
export const FAMILY_CARD_STYLE: Record<"incoming" | "outgoing" | "closed", { accent: string; chipBg: string; chipText: string }> = {
  incoming: { accent: "#8a9e88", chipBg: "#e9ede6", chipText: "#5a6e58" },
  outgoing: { accent: "#7c3a2a", chipBg: "#f8e7dc", chipText: "#7c3a2a" },
  closed: { accent: "#cdbfb2", chipBg: "#f1ede7", chipText: "#8a7a6c" },
};
