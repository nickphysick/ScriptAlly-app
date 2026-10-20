/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Help system v1, Part D — QUERYHAWK'S OWN WORDS, DEFINED. One entry per term: the eyebrow, the title, a sentence or two,
 * an optional example, and the article it opens. `<Term id>` (shell/Term) draws the dotted word and its card.
 *
 * ⚠️ FACTS ONLY. No verdict words ("overdue", "urgent", any appraisal); a status that waits on the writer says "your move".
 * ⚠️ A STATUS'S ICON IS THE REAL `StatusDot`, drawn by the card from `status` — never a copied glyph.
 * ⚠️ COPY ASSERTS ONLY WHAT THE CODE DOES TODAY. The mock's response-policy example said a "no response means no" query
 *    "closes quietly"; nothing closes a query by itself — the To-do list SUGGESTS closing it — so the example says that.
 */
import { QueryStatus } from "../types";

/** Runs of an example line: plain text, or `{ b }` for the bold part. */
export type GlossRun = string | { b: string };

export interface GlossaryEntry {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  example?: readonly GlossRun[];
  /** the help article the card's foot links to (lib/helpArticles) */
  article: string;
  /** a query status: the card draws its StatusDot before the title */
  status?: QueryStatus;
}

const STATUS_EYEBROW = "Query status";

export const GLOSSARY: Record<string, GlossaryEntry> = {
  listHealth: {
    id: "listHealth", eyebrow: "Contact list", title: "List health",
    body: "How much of the useful detail on your agents is filled in: genres, wishlist, response policy, contact route. Each gap you fill helps QueryHawk tell you when queries are due and who suits your book.",
    article: "list-health",
  },
  replies: {
    id: "replies", eyebrow: "Column", title: "Replies",
    body: "How long this agent usually takes to answer a query, as their website states it. \"Not stated\" means they haven't said.",
    example: [{ b: "~6 weeks" }, " means QueryHawk counts six weeks from the day you queried before showing a query as past expected."],
    article: "expected-dates",
  },
  responsePolicy: {
    id: "responsePolicy", eyebrow: "Agent detail", title: "Response policy",
    body: "Whether this agent replies to every query or treats silence as a no. QueryHawk uses it to decide what happens when their reply time passes.",
    example: [{ b: "No response means no" }, ": once their reply time passes, your to-do list suggests closing the query. ", { b: "Always replies" }, ": it suggests a nudge instead."],
    article: "response-policy",
  },

  /* ── query statuses ── */
  queried: {
    id: "queried", eyebrow: STATUS_EYEBROW, title: "Queried", status: QueryStatus.QUERIED,
    body: "You've sent your query and the agent hasn't answered yet. Nothing is needed from you while you wait.",
    article: "status-key",
  },
  partialRequested: {
    id: "partialRequested", eyebrow: STATUS_EYEBROW, title: "Partial requested", status: QueryStatus.PARTIAL_REQUESTED,
    body: "The agent has asked to see part of your manuscript, usually the first few chapters or a set number of pages. It's your move: send it when it's ready.",
    example: ["Dashed ring = they've asked for something. Half filled = a partial. Once you send it, the ring turns solid."],
    article: "status-key",
  },
  partialSent: {
    id: "partialSent", eyebrow: STATUS_EYEBROW, title: "Partial sent", status: QueryStatus.PARTIAL_SENT,
    body: "You've sent the pages the agent asked for. They're with the agent now, and the next reply is theirs.",
    article: "status-key",
  },
  fullRequested: {
    id: "fullRequested", eyebrow: STATUS_EYEBROW, title: "Full requested", status: QueryStatus.FULL_REQUESTED,
    body: "The agent has asked to read the whole manuscript. It's your move: send it when it's ready.",
    article: "status-key",
  },
  fullSent: {
    id: "fullSent", eyebrow: STATUS_EYEBROW, title: "Full sent", status: QueryStatus.FULL_SENT,
    body: "You've sent the whole manuscript. It's with the agent now, and the next reply is theirs.",
    article: "status-key",
  },
  reviseResubmit: {
    id: "reviseResubmit", eyebrow: STATUS_EYEBROW, title: "Revise & resubmit", status: QueryStatus.REVISE_RESUBMIT,
    body: "The agent has asked for changes and would like to see a new version. It's your move: send the revised manuscript when it's ready.",
    article: "status-key",
  },
  resubmitted: {
    id: "resubmitted", eyebrow: STATUS_EYEBROW, title: "Resubmitted", status: QueryStatus.RESUBMITTED,
    body: "You've sent the revised manuscript back after a revise and resubmit. It's with the agent now, and the next reply is theirs.",
    article: "status-key",
  },
  offer: {
    id: "offer", eyebrow: STATUS_EYEBROW, title: "Offer", status: QueryStatus.OFFER,
    body: "The agent has offered to represent you. It's your move: you decide, and you can tell the other agents still reading.",
    article: "status-key",
  },
  signed: {
    id: "signed", eyebrow: STATUS_EYEBROW, title: "Signed", status: QueryStatus.SIGNED,
    body: "You accepted this agent's offer. The query is finished.",
    article: "status-key",
  },
  closed: {
    id: "closed", eyebrow: STATUS_EYEBROW, title: "Closed", status: QueryStatus.REJECTED,
    body: "This query has ended: the agent passed, it closed with no reply, or you withdrew it. The words beside it say which.",
    article: "status-key",
  },
};

/** The glossary entry for a query status (every status the app shows has one). */
export function statusTermId(status: QueryStatus | string): string {
  switch (status) {
    case QueryStatus.QUERIED: return "queried";
    case QueryStatus.PARTIAL_REQUESTED: return "partialRequested";
    case QueryStatus.PARTIAL_SENT: return "partialSent";
    case QueryStatus.FULL_REQUESTED: return "fullRequested";
    case QueryStatus.FULL_SENT: return "fullSent";
    case QueryStatus.REVISE_RESUBMIT: return "reviseResubmit";
    case QueryStatus.RESUBMITTED: return "resubmitted";
    case QueryStatus.OFFER: return "offer";
    case QueryStatus.SIGNED: return "signed";
    default: return "closed";
  }
}
