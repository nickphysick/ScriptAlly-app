/**
 * Comp suggestions — PURE CORE (no Firebase, no Firestore, no secrets).
 *
 * The model proposes CANDIDATES; `compCatalogue.ts` turns candidates into SUGGESTIONS by checking
 * each one against a real catalogue. Nothing the model says about a book's existence reaches the
 * client unchecked.
 *
 * ⚠️ THE CONTRACT CHANGED SHAPE, AND THE OLD ONE COULD NOT BE MADE HONEST. It returned
 * `{title, author, year, rationale, cautions}` and asked the model, in prose, not to invent books.
 * There was no `verification` field because there was no verification: a careful model and a
 * hallucinating one produced identical output. The client now derives its ✓ VERIFIED chip from a
 * record, so the record has to exist — see CompVerification in the app's src/types.ts.
 *
 * ⚠️ AND `facts` IS DELIBERATELY ABSENT (baked decision 20). An earlier contract carried a
 * model-composed display string ("MYSTERY · DEBUT · 2024") to fill a chip. A factual-looking chip
 * with nothing behind it but the model's word is the exact shape the trust rule exists to stop; the
 * client composes that chip at render from structured fields instead.
 */
import { CatalogueRecord, FetchLike, verifyTitle } from "./compCatalogue";

/**
 * ⚠️ NO `temperature` ANYWHERE IN THIS FILE, and its absence is load-bearing rather than an
 * oversight. The previous version set `temperature: 0.7` for variety between runs; sampling
 * parameters are REMOVED on this model tier and a request carrying one returns a 400. Variety now
 * comes from the web search actually returning different current titles, which is a better source
 * of it than sampling noise.
 */
export const MODEL = "claude-opus-5";
export const MAX_TOKENS = 8_000;

export const MAX_SUGGESTIONS = 6;
export const MAX_WHY_CHARS = 200;

export interface SuggestInput {
  manuscriptTitle: string;
  ageCategory: string;
  genre: string;
  logline: string;
  synopsis?: string;
  /** Current shelf titles — excluded in the prompt AND re-filtered after parsing. */
  shelfTitles: string[];
}

/** What the model proposes. Not yet a suggestion — nothing here has been checked. */
export interface Candidate {
  title: string;
  author: string;
  media: "book" | "film" | "tv" | "other";
  why: string;
  matchAxis?: string;
}

/** What the client receives. `verification` is present by construction — see the note above. */
export interface Suggestion {
  title: string;
  author: string;
  year: number;
  publisher?: string;
  media: "book" | "film" | "tv" | "other";
  why: string;
  matchAxis?: string;
  verification: CatalogueRecord;
}

/** Thrown when the model output can't be parsed even after one retry. */
export class MalformedSuggestionsError extends Error {
  code = "MALFORMED";
  constructor(message: string) {
    super(message);
    this.name = "MalformedSuggestionsError";
  }
}

/* ── System prompt ─────────────────────────────────────────────────────── */
/**
 * ⚠️ IT DOES NOT ASK THE MODEL TO AVOID INVENTING BOOKS, because that instruction was the old
 * design's entire verification story and it cannot work. It tells the model the truth instead: an
 * unverifiable title is dropped downstream, so proposing one wastes a slot. That aligns the model's
 * incentive with the check rather than substituting for it.
 *
 * ⚠️ `why` AND `matchAxis` MUST NOT APPRAISE (baked decision 17, extended to the Scout by
 * Amendment 3). They state what a title SHARES with the manuscript — form, register, structure,
 * length, audience, recency — never how well it fits, never a score, never ranking language. The
 * page reports; it does not judge the writer's list, and a model-written "a strong match" would put
 * the appraisal back that the client-side sweep removed.
 */
export const SYSTEM_PROMPT = `
You find comparable titles ("comps") for a fiction writer's query letter. You are given their
manuscript's age category, genre, logline (and sometimes a synopsis), plus the comps already on
their list.

Use web search to find titles published recently — your training data is older than the market the
writer is querying into, and a comp's job is partly to show an agent there is a live audience.

Every title you propose is checked against a real book catalogue before it reaches the writer, and
anything the catalogue cannot confirm is discarded. A title you are unsure about therefore costs a
slot and returns nothing — propose fewer, and only ones you can name precisely.

Selection rules:
- STRONGLY prefer books published in the last five years.
- Match on age category, genre, register and form.
- NEVER propose a title already on the writer's list (they are listed below), or the writer's own
  manuscript.
- Order carries no meaning. Do not rank, and do not present one title as better than another.

Writing "why" and "matchAxis":
- "why" is ONE factual sentence about what the title SHARES with the manuscript — its form,
  register, structure, length, audience or recency.
- "matchAxis" is an optional short label for that shared quality, e.g. "tone · atmosphere".
- Neither may appraise. Do not write that a comp is strong, weak, perfect, ideal, a great fit, the
  best match, or any judgement of how well it works. State what is shared and stop.

Return ONLY a single valid JSON object — no prose, no markdown, no code fences. Exact shape:

{
  "candidates": [
    {
      "title": "<the work's exact title>",
      "author": "<the author's name>",
      "media": "book",
      "why": "<one factual sentence, max ${MAX_WHY_CHARS} characters>",
      "matchAxis": "<optional short label>"
    }
  ]
}

"media" is one of "book", "film", "tv", "other". Only "book" can be catalogue-checked, so propose
books unless a screen title is genuinely the closest comparison.
`.trim();

/* ── User message ──────────────────────────────────────────────────────── */
export function buildUserMessage(input: SuggestInput): string {
  const lines = [
    `MANUSCRIPT: ${input.manuscriptTitle}`,
    `AGE CATEGORY: ${input.ageCategory}`,
    `GENRE: ${input.genre}`,
    `LOGLINE: ${input.logline || "(none provided)"}`,
  ];
  if (input.synopsis && input.synopsis.trim()) {
    lines.push("", "=== SYNOPSIS ===", input.synopsis.trim(), "=== END SYNOPSIS ===");
  }
  lines.push(
    "",
    input.shelfTitles.length
      ? `ALREADY ON THE LIST (never propose these): ${input.shelfTitles.join(" · ")}`
      : "ALREADY ON THE LIST: (nothing yet)",
    "",
    "Return only the JSON object described in the system prompt."
  );
  return lines.join("\n");
}

/* ── Parse + validate ──────────────────────────────────────────────────── */
function stripFences(text: string): string {
  return text.replace(/^\s*```(?:json)?/i, "").replace(/```\s*$/i, "").trim();
}

const MEDIA = new Set(["book", "film", "tv", "other"]);

/**
 * Validate the model's JSON into candidates. Throws only when `candidates` is not an array —
 * individual malformed items are DROPPED, never fatal, because one bad item should not cost the
 * writer the other five.
 */
export function validateCandidates(raw: unknown, shelfTitles: string[]): Candidate[] {
  const list = (raw as { candidates?: unknown })?.candidates;
  if (!Array.isArray(list)) throw new MalformedSuggestionsError("candidates is not an array");

  const shelf = new Set(shelfTitles.map((t) => t.trim().toLowerCase()));
  const seen = new Set<string>();
  const out: Candidate[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const title = typeof rec.title === "string" ? rec.title.trim() : "";
    const author = typeof rec.author === "string" ? rec.author.trim() : "";
    const why = typeof rec.why === "string" ? rec.why.trim() : "";
    if (!title || !author || !why) continue;
    const key = title.toLowerCase();
    if (shelf.has(key) || seen.has(key)) continue;
    const media = typeof rec.media === "string" && MEDIA.has(rec.media)
      ? (rec.media as Candidate["media"])
      : "book";
    const axis = typeof rec.matchAxis === "string" ? rec.matchAxis.trim() : "";
    seen.add(key);
    out.push({
      title,
      author,
      media,
      why: why.slice(0, MAX_WHY_CHARS),
      ...(axis ? { matchAxis: axis } : {}),
    });
    if (out.length >= MAX_SUGGESTIONS) break;
  }
  return out;
}

/**
 * Check every candidate and keep only what the catalogue confirms.
 *
 * ⚠️ A NON-BOOK IS DROPPED, NOT WAVED THROUGH. A book catalogue cannot confirm a film, so a film
 * candidate has no verification available — and the client's contract has no unverified path. The
 * writer can still add a film by hand; what the Scout cannot do is claim it checked one.
 *
 * ⚠️ THE YEAR COMES FROM THE CATALOGUE. A candidate whose match carries no publication year is
 * dropped too: `year` is required on the wire and a model-supplied one inside a verified record
 * would be an unchecked number wearing a checked badge.
 */
export async function verifyCandidates(
  fetchImpl: FetchLike,
  candidates: Candidate[],
  now: () => Date
): Promise<Suggestion[]> {
  const out: Suggestion[] = [];
  for (const c of candidates) {
    if (c.media !== "book") continue;
    const match = await verifyTitle(fetchImpl, { title: c.title, author: c.author }, now);
    if (!match || match.year === undefined) continue;
    out.push({
      title: match.title,
      author: match.author,
      year: match.year,
      media: "book",
      why: c.why,
      verification: match.record,
      ...(match.publisher ? { publisher: match.publisher } : {}),
      ...(c.matchAxis ? { matchAxis: c.matchAxis } : {}),
    });
  }
  return out;
}

/** Minimal structural Anthropic client — keeps the core free of SDK types (and of SDK versions:
 *  the tool and model strings below are newer than the pinned SDK's unions). */
export interface AnthropicLike {
  messages: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    create: (args: any) => Promise<{
      content: Array<{ type: string; text?: string }>;
      /* ⚠️ `| null` MATCHES THE SDK, which types this nullable — and the pinned SDK's union does
         not include "refusal" at all, so the narrow string is deliberate: the value arrives on the
         wire whatever the local typings believe. See the SDK-pin note in the report. */
      stop_reason?: string | null;
      usage?: { input_tokens?: number; output_tokens?: number };
    }>;
  };
}

function textOf(msg: { content: Array<{ type: string; text?: string }> }): string {
  return msg.content
    .filter((b) => b.type === "text")
    .map((b) => b.text || "")
    .join("");
}

/**
 * Ask the model for candidates. Retries ONCE on unparseable output, then gives up.
 *
 * ⚠️ WEB SEARCH IS THE POINT OF THE CALL, not a garnish — the model's training data is older than
 * the market the writer is querying into, and "published in the last five years" cannot be honoured
 * from memory alone.
 *
 * ⚠️ A REFUSAL IS NOT A PARSE FAILURE. This model tier can decline a request outright, returning a
 * successful response with `stop_reason: "refusal"` and no usable content. Retrying that with a
 * "return valid JSON" nudge would burn a second call on a request that was never going to be
 * answered, so it is surfaced as its own error instead.
 */
export class ScoutRefusedError extends Error {
  code = "REFUSED";
  constructor() {
    super("The request was declined.");
    this.name = "ScoutRefusedError";
  }
}

export async function proposeCandidates(
  client: AnthropicLike,
  input: SuggestInput
): Promise<Candidate[]> {
  const baseMessages = [{ role: "user" as const, content: buildUserMessage(input) }];

  const callOnce = async (messages: Array<{ role: "user" | "assistant"; content: string }>) => {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      /* adaptive is this model's default; stated so the intent survives a model change */
      thinking: { type: "adaptive" },
      tools: [{ type: "web_search_20260209", name: "web_search" }],
      messages,
    });
    console.log(
      `suggestComps: tokens in=${res.usage?.input_tokens ?? "?"} out=${res.usage?.output_tokens ?? "?"}`
    );
    if (res.stop_reason === "refusal") throw new ScoutRefusedError();
    return res;
  };

  const first = await callOnce(baseMessages);
  const firstText = textOf(first);
  try {
    return validateCandidates(JSON.parse(stripFences(firstText)), input.shelfTitles);
  } catch (e) {
    if (e instanceof ScoutRefusedError) throw e;
    const retryMessages = [
      ...baseMessages,
      { role: "assistant" as const, content: firstText },
      {
        role: "user" as const,
        content:
          "That was not valid. Return ONLY the JSON object described, with no prose and no code fences.",
      },
    ];
    const second = await callOnce(retryMessages);
    try {
      return validateCandidates(JSON.parse(stripFences(textOf(second))), input.shelfTitles);
    } catch (e2) {
      if (e2 instanceof ScoutRefusedError) throw e2;
      throw new MalformedSuggestionsError(
        `invalid after retry: ${e2 instanceof Error ? e2.message : String(e2)}`
      );
    }
  }
}
