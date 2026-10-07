/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * What Discover shares with the pages that link to it (Contact list v14, ruling Q4): the one gate, and the
 * one mapping from a community agent to the fields `addAgent` takes. Both used to live inside
 * `DiscoverNewAgents.tsx`; a second page reading them is the reason they moved, not a second copy.
 */
import type { Agent, CommunityAgent } from "../types";

/**
 * ⚠️ DISCOVER SHIPS AS A FEATURE PAGE AT LAUNCH — flip to `true` to restore the live matching view.
 *
 * The verified catalogue is not stocked yet, so a page that tried to match would spend its whole
 * life in an empty state. It states what the feature is instead, and says plainly that it is
 * coming — which is why there is NO empty state on the feature page: nothing attempts to match, so
 * nothing can come back empty.
 *
 * ⚠️ THIS IS A GATE, NOT A DELETION. Every derivation, handler and branch of the live view is intact and
 * unreferenced while the flag is false. Flipping this one constant restores the page exactly as it was —
 * AND every Discover link on the Contact list's next-step section (v14 §2, ruling Q4) returns with it.
 *
 * ⚠️ AND IT IS TYPED `boolean`, NOT LEFT TO INFER `false`. A literal-`false` const narrows every
 * `DISCOVER_LIVE && …` to dead code, which is how a "temporarily gated" branch quietly rots: the
 * compiler stops checking the JSX inside it. Typed wide, the live view keeps being typechecked on
 * every build, so it is still correct on the day someone flips it.
 */
export const DISCOVER_LIVE: boolean = false;

/** The fields a community agent becomes on the writer's own list — Discover's "Add" and the Contact list's
 *  "Add to my list" both write exactly these. */
export function communityAgentFields(ca: CommunityAgent, msTitle: string | null): Omit<Agent, "id"> {
  return {
    name: ca.name,
    agency: ca.agency,
    email: ca.email,
    website: ca.website,
    country: ca.country,
    city: ca.city,
    twitter: ca.twitter,
    bluesky: ca.bluesky,
    instagram: ca.instagram,
    genres: ca.genres,
    mswlNotes: ca.mswlNotes,
    starRating: ca.starRating,
    submissionStatus: ca.submissionStatus,
    responseTimeWeeks: ca.responseTimeWeeks,
    noResponseMeansNo: ca.noResponseMeansNo,
    submissionMethod: ca.submissionMethod,
    materialsWanted: ca.materialsWanted,
    notes: msTitle ? `Added from Discover — a genre/wish-list match for "${msTitle}".` : "Added from Discover.",
  } as Omit<Agent, "id">;
}
