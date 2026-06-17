/**
 * Email-import extraction — PURE CORE (no Firebase, no Firestore, no secrets).
 *
 * This module holds everything that can be unit-run without the Functions runtime: the canonical
 * QueryStatus set, the status→direction map, the system prompt, the user-message builder, and the
 * parse/validate/normalise step. `extractProposal` takes an already-built Anthropic client and an
 * already-read context object, so the dev harness (functions/scripts/testEmailImport.js) can drive
 * it directly with seeded fixtures — no emulator, no prod data.
 *
 * The callable wrapper (emailImport.ts) does auth, the Pro gate, the Firestore reads, and builds
 * the Anthropic client; it then hands off to extractProposal here.
 *
 * READ-ONLY: nothing in this prompt writes to Firestore. The returned proposal is reviewed and
 * committed by separate, later prompts.
 */

/* ── Canonical QueryStatus values — EXACT strings, mirroring src/types.ts `enum QueryStatus`.
 *    Functions compile from their own tsconfig (rootDir: src) and can't import the app's types, so
 *    this is duplicated here the same way smartImportPrompt.ts hardcodes the enum. Keep in sync. ── */
export const QUERY_STATUSES = [
  "Queried",
  "Partial Requested",
  "Partial Sent",
  "Full Requested",
  "Full Sent",
  "Revise & Resubmit",
  "Offer",
  "Rejected",
  "Withdrawn",
  "No Response",
] as const;
export type QueryStatusString = (typeof QUERY_STATUSES)[number];

const STATUS_SET: ReadonlySet<string> = new Set(QUERY_STATUSES);

/* ── Status → direction. Mirrors src/lib/timelineEvent.ts `getTimelineFamily`, collapsed to the two
 *    values the proposal contract allows. incoming = the agent acted (their turn done → writer's
 *    turn next); outgoing = the writer acted. Rejected/Offer are the agent acting (incoming);
 *    Withdrawn/No Response are the writer's own closing move (outgoing). ── */
export const STATUS_DIRECTION: Record<QueryStatusString, "incoming" | "outgoing"> = {
  Queried: "outgoing",
  "Partial Sent": "outgoing",
  "Full Sent": "outgoing",
  Withdrawn: "outgoing",
  "No Response": "outgoing",
  "Partial Requested": "incoming",
  "Full Requested": "incoming",
  "Revise & Resubmit": "incoming",
  Offer: "incoming",
  Rejected: "incoming",
};

/* ── Model config ──────────────────────────────────────────────────────── */
export const MODEL = "claude-sonnet-4-6";
export const MAX_TOKENS = 1500;
export const TEMPERATURE = 0;

/* ── Context (read server-side, passed in) ─────────────────────────────── */
export interface ContextAgent {
  id: string;
  agency: string;
  name: string | null;
}
export interface ContextRung {
  status: string; // a QueryStatus string from the existing log
  date: string | null; // ISO YYYY-MM-DD or null
}
export interface ContextQuery {
  id: string;
  agentId: string;
  status: string; // current QueryStatus string
  rungs: ContextRung[];
}
export interface ExistingContext {
  agents: ContextAgent[];
  queries: ContextQuery[];
}

export interface ExtractInput {
  manuscriptId: string;
  direction: "received" | "sent";
  emailText: string;
  context: ExistingContext;
}

/* ── Proposal contract (reconciled to the live Activity/Query types) ───────
 *  resultingStatus → maps to Activity.resultingStatus / the per-query rung's `resultingStatus`.
 *  date            → maps to the rung's date (rung `createdAt` Timestamp / Activity.date ISO).
 *  direction, dateProvisional, sourceQuote, note → PROPOSAL-ONLY signals for the review/commit
 *                    step; they are NOT stored Activity fields. direction is derived from status. ── */
export interface ProposalRecord {
  resultingStatus: QueryStatusString;
  direction: "incoming" | "outgoing";
  date: string | null;
  dateProvisional: boolean;
  sourceQuote: string;
  note: string;
}
export interface ProposalSubject {
  kind: "matched" | "new_agent";
  agentId: string | null;
  queryId: string | null;
  agency: string;
  agentName: string | null;
  manuscriptId: string;
}
export interface ProposalUnplaced {
  text: string;
  reason: string;
}
export interface Proposal {
  subject: ProposalSubject;
  records: ProposalRecord[];
  unplaced: ProposalUnplaced[];
}

/** Thrown when the model output can't be parsed/validated even after one retry. The callable maps
 *  this to HttpsError('internal', …) with a safe message; everything else is a transport error. */
export class MalformedProposalError extends Error {
  code = "MALFORMED";
  constructor(message: string) {
    super(message);
    this.name = "MalformedProposalError";
  }
}

/* ── System prompt ─────────────────────────────────────────────────────── */
export const SYSTEM_PROMPT = `
You read ONE email a fiction writer pasted into ScriptAlly and propose what to log about their
agent submissions. You only PROPOSE — nothing is saved. Another step lets the writer review and
confirm. Be honest and conservative: it is far better to leave something unplaced than to invent it.

Return ONLY a single valid JSON object — no prose, no markdown, no code fences. Exact shape:

{
  "subject": {
    "kind": "matched" | "new_agent",
    "agentId": string | null,        // the real id of the matched agent, else null
    "queryId": string | null,        // the real id of the matched query, else null
    "agency": string,                // REQUIRED — the agency is the identity
    "agentName": string | null,      // null unless a person's name is actually stated
    "manuscriptId": string           // echo the manuscriptId you are given
  },
  "records": [
    {
      "resultingStatus": "<one EXACT QueryStatus string>",
      "direction": "incoming" | "outgoing",
      "date": "YYYY-MM-DD" | null,   // only if a real date is in the email; else null
      "dateProvisional": boolean,    // true when the date is absent or only inferred
      "sourceQuote": "<the phrase in the email this came from>",
      "note": "<one plain-English line explaining the record>"
    }
  ],
  "unplaced": [ { "text": "<the bit you couldn't place>", "reason": "<why>" } ]
}

QueryStatus must be EXACTLY one of:
"Queried", "Partial Requested", "Partial Sent", "Full Requested", "Full Sent",
"Revise & Resubmit", "Offer", "Rejected", "Withdrawn", "No Response".
Never emit any other status string, casing, or variant.

Direction of each status (this is fixed — use it):
- outgoing (the WRITER acted): "Queried", "Partial Sent", "Full Sent", "Withdrawn", "No Response".
- incoming (the AGENT acted): "Partial Requested", "Full Requested", "Revise & Resubmit", "Offer", "Rejected".
e.g. "Full Requested" is incoming (the agent asked to see the full); "Full Sent" is outgoing (the writer sent it).

You are told whether the writer RECEIVED or SENT this email. A received email is usually the agent
acting (expect incoming records, e.g. a request); a sent email is usually the writer acting (expect
outgoing records). Let the words decide the exact status; use this only as a steer.

Rules — enforce all of them:
- MATCH BEFORE CREATING. You are given the writer's existing agents and queries for this manuscript.
  If the email plausibly corresponds to one (same agency, or same agent name + agency), set
  "kind":"matched" and fill the real "agentId" (and "queryId" when an existing query clearly fits).
  Only use "kind":"new_agent" when there is no reasonable match in the provided context.
- NEVER INVENT A NAME. "agency" is required and is the identity. Set "agentName" to null unless a
  person's name is explicitly written (a sign-off, "I'm <Name>", etc.). Do NOT guess a name from an
  email address, a greeting, or the agency name.
- NEVER FABRICATE A DATE. Attach "date" only when a real date for that event is present in the text.
  If there is no date, set "date": null and "dateProvisional": true. Never guess "today" or infer a
  date from context. A relative phrase you cannot resolve to a calendar date is date: null, provisional.
- IMPLIED EARLIER STEPS. If a reply implies the writer already queried but gives no date, you may add
  a "Queried" outgoing record with date null and dateProvisional true — clearly an inference, never a
  guessed date.
- HONESTY OVER COMPLETENESS. If a sentence is ambiguous and you cannot confidently turn it into a
  record, put it in "unplaced" with a short reason instead of forcing a record.
- One record per real event. Order records oldest → newest where the email makes that clear.
- "sourceQuote" must be an actual substring/phrase from the email. "note" is one friendly sentence.
`.trim();

/* ── User message ──────────────────────────────────────────────────────── */
export function buildUserMessage(input: ExtractInput): string {
  const ctx = {
    manuscriptId: input.manuscriptId,
    agents: input.context.agents,
    queries: input.context.queries,
  };
  return [
    `THE WRITER ${input.direction === "received" ? "RECEIVED" : "SENT"} THIS EMAIL.`,
    `manuscriptId: ${input.manuscriptId}`,
    "",
    "=== EMAIL (verbatim) ===",
    input.emailText,
    "=== END EMAIL ===",
    "",
    "=== EXISTING RECORDS (the writer's agents & queries for this manuscript — match against these) ===",
    JSON.stringify(ctx, null, 1),
    "=== END EXISTING RECORDS ===",
    "",
    "Return only the JSON object described in the system prompt.",
  ].join("\n");
}

/* ── Parse + validate + normalise ──────────────────────────────────────── */
function stripFences(text: string): string {
  return text.replace(/^\s*```(?:json)?/i, "").replace(/```\s*$/i, "").trim();
}

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validate the model's JSON against the contract and normalise it. Hard-fails (throw
 * MalformedProposalError) on: non-object, missing/empty agency, bad subject.kind, no records array,
 * or any record whose resultingStatus is not an exact QueryStatus. direction is always re-derived
 * from the status (the model's value is never trusted). manuscriptId is forced to the server value.
 */
export function validateAndNormalise(raw: unknown, manuscriptId: string): Proposal {
  if (!raw || typeof raw !== "object") throw new MalformedProposalError("not an object");
  const obj = raw as Record<string, any>;

  const subjRaw = obj.subject;
  if (!subjRaw || typeof subjRaw !== "object") throw new MalformedProposalError("missing subject");
  const kind = subjRaw.kind;
  if (kind !== "matched" && kind !== "new_agent") throw new MalformedProposalError("bad subject.kind");
  const agency = asString(subjRaw.agency).trim();
  if (!agency) throw new MalformedProposalError("subject.agency is required");

  const subject: ProposalSubject = {
    kind,
    agentId: typeof subjRaw.agentId === "string" && subjRaw.agentId ? subjRaw.agentId : null,
    queryId: typeof subjRaw.queryId === "string" && subjRaw.queryId ? subjRaw.queryId : null,
    agency,
    agentName: typeof subjRaw.agentName === "string" && subjRaw.agentName.trim() ? subjRaw.agentName.trim() : null,
    manuscriptId, // server-authoritative — never trust the model's echo
  };

  if (!Array.isArray(obj.records)) throw new MalformedProposalError("records is not an array");
  const records: ProposalRecord[] = obj.records.map((r: any, i: number) => {
    const status = asString(r?.resultingStatus);
    if (!STATUS_SET.has(status)) {
      throw new MalformedProposalError(`record[${i}].resultingStatus "${status}" is not a QueryStatus`);
    }
    const s = status as QueryStatusString;
    const date = typeof r?.date === "string" && ISO_DATE.test(r.date.trim()) ? r.date.trim() : null;
    // Provisional whenever there is no real date; otherwise honour the model's flag (default false).
    const dateProvisional = date === null ? true : r?.dateProvisional === true;
    return {
      resultingStatus: s,
      direction: STATUS_DIRECTION[s], // authoritative — derived, not trusted
      date,
      dateProvisional,
      sourceQuote: asString(r?.sourceQuote),
      note: asString(r?.note),
    };
  });

  const unplaced: ProposalUnplaced[] = Array.isArray(obj.unplaced)
    ? obj.unplaced.map((u: any) => ({ text: asString(u?.text), reason: asString(u?.reason) }))
    : [];

  return { subject, records, unplaced };
}

/** Minimal shape of the Anthropic client we use — kept structural so the core needs no SDK import. */
export interface AnthropicLike {
  messages: {
    create: (args: any) => Promise<{ content: Array<{ type: string; text?: string }> }>;
  };
}

function textOf(msg: { content: Array<{ type: string; text?: string }> }): string {
  return msg.content
    .filter((b) => b.type === "text")
    .map((b) => b.text || "")
    .join("");
}

/**
 * Call Claude with the extraction prompt, parse + validate the JSON, and return the proposal.
 * On a malformed first response, retries ONCE with a terse "valid JSON only" nudge; if that also
 * fails, throws MalformedProposalError. Transport/API errors propagate to the caller unchanged.
 */
export async function extractProposal(client: AnthropicLike, input: ExtractInput): Promise<Proposal> {
  const baseMessages = [{ role: "user" as const, content: buildUserMessage(input) }];

  const callOnce = (messages: any[]) =>
    client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      temperature: TEMPERATURE,
      system: SYSTEM_PROMPT,
      messages,
    });

  // Attempt 1
  const first = await callOnce(baseMessages);
  const firstText = textOf(first);
  try {
    return validateAndNormalise(JSON.parse(stripFences(firstText)), input.manuscriptId);
  } catch (_e) {
    // Attempt 2 — show the model its own output and demand clean JSON.
    const retryMessages = [
      ...baseMessages,
      { role: "assistant" as const, content: firstText },
      {
        role: "user" as const,
        content:
          "That was not valid. Return ONLY the JSON object described, with no prose and no code fences, " +
          "and resultingStatus values exactly from the allowed list.",
      },
    ];
    const second = await callOnce(retryMessages);
    try {
      return validateAndNormalise(JSON.parse(stripFences(textOf(second))), input.manuscriptId);
    } catch (e2: any) {
      throw new MalformedProposalError(`invalid after retry: ${e2?.message || e2}`);
    }
  }
}
