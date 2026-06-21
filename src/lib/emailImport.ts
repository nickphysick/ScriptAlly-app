/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smart Email Import — client side. Calls the `extractFromEmail` Cloud Function (europe-west2; the
 * Anthropic key lives only there) and returns the proposal it produced. Nothing here writes — the
 * proposal is reviewed, and the commit/write step is a later prompt.
 *
 * Mirrors the smartImport.ts client pattern, incl. the dev-only mock escape hatch so the review UI
 * can be exercised without the function being deployed.
 */
import { getFunctions, httpsCallable } from "firebase/functions";

export type EmailDirection = "received" | "sent";

/** The proposal contract returned by extractFromEmail (mirrors functions/src/emailImportCore.ts). */
export interface ProposalSubject {
  kind: "matched" | "new_agent";
  agentId: string | null;
  queryId: string | null;
  agency: string;
  agentName: string | null;
  manuscriptId: string;
}
export interface ProposalRecord {
  resultingStatus: string; // exact QueryStatus string (validated server-side)
  direction: "incoming" | "outgoing";
  date: string | null; // ISO YYYY-MM-DD or null
  dateProvisional: boolean;
  sourceQuote: string;
  note: string;
}
export interface ProposalUnplaced {
  text: string;
  reason: string;
}
export interface EmailProposal {
  subject: ProposalSubject;
  records: ProposalRecord[];
  unplaced: ProposalUnplaced[];
}

export interface RunEmailImportArgs {
  manuscriptId: string;
  direction: EmailDirection;
  emailText: string;
}

/** A normalised error the flow can branch on: `permission-denied` → upsell; anything else → retry. */
export class EmailImportError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "EmailImportError";
    this.code = code;
  }
}

export async function runEmailImport(args: RunEmailImportArgs): Promise<EmailProposal> {
  // Dev-only escape hatch — set window.__SA_EMAIL_IMPORT_MOCK to an EmailProposal in the console to
  // exercise the review screen without a deployed function. Never set in code.
  const mock = (window as any).__SA_EMAIL_IMPORT_MOCK as EmailProposal | undefined;
  if (mock) return mock;

  const fn = httpsCallable(getFunctions(undefined, "europe-west2"), "extractFromEmail");
  try {
    const res = await fn(args);
    return res.data as EmailProposal;
  } catch (e: any) {
    // Firebase callable errors arrive as code "functions/<reason>" (permission-denied, unavailable,
    // internal, unauthenticated, …). A network/not-deployed failure surfaces as internal/unavailable.
    const code = String(e?.code || "").replace(/^functions\//, "") || "unknown";
    throw new EmailImportError(code, e?.message || "Couldn't reach the importer.");
  }
}

/* ── Sample proposals (canned) — used by the dev preview so the review screen can be seen without
 *    the function deployed. These mirror the two harness fixtures (matched / new agent). ── */
export const SAMPLE_PROPOSAL_MATCHED: EmailProposal = {
  subject: {
    kind: "matched",
    agentId: "agent_mh",
    queryId: "q_mh",
    agency: "Pemberton Literary Agency",
    agentName: "Margaret Holloway",
    manuscriptId: "ms_clockworks",
  },
  records: [
    {
      resultingStatus: "Full Requested",
      direction: "incoming",
      date: "2026-06-15",
      dateProvisional: false,
      sourceQuote: "I'd be delighted to see the full manuscript",
      note: "The agent has asked for the full — that puts the ball in your court.",
    },
  ],
  unplaced: [],
};

export const SAMPLE_PROPOSAL_NEW_AGENT: EmailProposal = {
  subject: {
    kind: "new_agent",
    agentId: null,
    queryId: null,
    agency: "Ardal & Crewe Literary Agency",
    agentName: "James Ardal",
    manuscriptId: "ms_clockworks",
  },
  records: [
    {
      resultingStatus: "Queried",
      direction: "outgoing",
      date: null,
      dateProvisional: true,
      sourceQuote: "Your query for The Book of Lost Clockworks reached me",
      note: "Implied by the reply — but no date was given, so I've left it for you to confirm rather than guess one.",
    },
    {
      resultingStatus: "Partial Requested",
      direction: "incoming",
      date: "2026-06-15",
      dateProvisional: false,
      sourceQuote: "I'd love to read the first fifty pages",
      note: "The agent has asked for a partial — your turn next.",
    },
  ],
  unplaced: [
    { text: "the premise really caught my eye", reason: "A warm aside, not a status change — nothing to log." },
  ],
};
