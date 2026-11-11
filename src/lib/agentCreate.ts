/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE NEW-AGENT RECORD, FROM THE CARD'S DRAFT — lifted unchanged out of AgentCardHost's `createAgent` (Phone app v3), so
 * the desktop's add-agent journey and the phone's four steps build the same record for the same `addAgent` writer, with
 * the house rules: optionals born ABSENT, the links through the scheme allowlist, `reopensOn` only behind a CLOSED door,
 * and `submissionMethod` defaulting to Email when none is chosen.
 */
import { SubmissionMethod, SubmissionStatus, type Agent } from "../types";
import { type CardDraft, FORM_PLATFORM, encodeMats } from "./cardDraft";
import { hrefFor } from "./quickAdd";

export type NewAgentInput = Omit<Agent, "id" | "userId" | "dateAdded" | "lastCheckedDate">;

export function agentFromDraft(d: CardDraft): NewAgentInput {
  const wishlist = d.wishlist.trim();
  const mswl = d.mswl.trim();
  const form = d.form.trim();
  const social = d.social.handle.trim();
  const socials = [
    ...(mswl && hrefFor(mswl) ? [{ platform: "MSWL", handle: hrefFor(mswl)! }] : []),
    ...(form && hrefFor(form) && (d.method === SubmissionMethod.ONLINE_FORM || d.method === SubmissionMethod.QUERY_MANAGER || d.method === SubmissionMethod.OTHER) ? [{ platform: FORM_PLATFORM, handle: hrefFor(form)! }] : []),
    ...(social ? [{ platform: d.social.platform || "Other", handle: social }] : []),
  ];
  const mirror = ({ "X / Twitter": "twitter", Bluesky: "bluesky", Instagram: "instagram" } as Record<string, "twitter" | "bluesky" | "instagram">)[d.social.platform];
  return {
    name: d.name.trim(),
    agency: d.agency.trim(),
    email: d.email.trim(),
    website: hrefFor(d.website) ?? "",
    genres: [...d.genres],
    mswlNotes: wishlist,
    /* Add agent v1 — nothing pre-picked: an unstated door is Unknown, never Open */
    submissionStatus: d.door === "closed" ? SubmissionStatus.CLOSED : d.door === "open" ? SubmissionStatus.OPEN : SubmissionStatus.UNKNOWN,
    submissionMethod: d.method ?? SubmissionMethod.EMAIL,
    ...(d.method === SubmissionMethod.OTHER && d.methodOther.trim() ? { submissionMethodOther: d.methodOther.trim().slice(0, 40) } : {}),
    ...(d.agencyUnknown && d.name.trim() && !d.agency.trim() ? { agencyUnknown: true as const } : {}),
    ...(d.rating ? { starRating: d.rating as 1 | 2 | 3 | 4 | 5 } : {}),
    materialsWanted: encodeMats(d.mats),
    notes: "",
    ...(d.city.trim() ? { city: d.city.trim() } : {}),
    ...(d.country ? { country: d.country } : {}),
    ...(d.weeks != null ? { responseTimeWeeks: d.weeks } : {}),
    ...(d.nrn != null ? { noResponseMeansNo: d.nrn } : {}),
    ...(d.door === "closed" && d.reopens ? { reopensOn: d.reopens } : {}),
    ...(socials.length ? { socials } : {}),
    ...(mirror && social ? { [mirror]: social } : {}),
    /* the wishlist was written just now, so it was checked just now */
    ...(wishlist ? { mswlCheckedAt: new Date().toISOString() } : {}),
  } as NewAgentInput;
}
