/**
 * Comp suggestions — PURE CORE (no Firebase, no Firestore, no secrets).
 *
 * Everything unit-runnable without the Functions runtime: the caution allow-list, the system
 * prompt, the user-message builder, and the parse/validate/normalise step. `suggestFromModel`
 * takes an already-built Anthropic client, so tests drive it with a mock — no emulator.
 *
 * The callable wrapper (suggestComps.ts) does auth, the Pro gate, input validation and builds
 * the client; it hands off here. READ-ONLY — nothing writes to Firestore.
 */

/* Only these scale cautions may come from the model; anything else is dropped. The age caution
 * ("N YEARS OLD") is DERIVED CLIENT-SIDE from `year` — never emitted here. */
export const ALLOWED_CAUTIONS = ["MEGA-BESTSELLER", "FRANCHISE-SCALE"] as const;
const CAUTION_SET: ReadonlySet<string> = new Set(ALLOWED_CAUTIONS);

/* ── Model config — mirrors emailImportCore, except temperature: suggestions want variety
 *    between Refresh passes, extraction wants determinism. ── */
export const MODEL = "claude-sonnet-4-6";
export const MAX_TOKENS = 1200;
export const TEMPERATURE = 0.7;

export const MAX_SUGGESTIONS = 6;
export const MAX_RATIONALE_CHARS = 160;

export interface SuggestInput {
  manuscriptTitle: string;
  ageCategory: string;
  genre: string;
  logline: string;
  synopsis?: string;
  /** Current shelf titles — excluded in the prompt AND re-filtered after parsing. */
  shelfTitles: string[];
}

export interface Suggestion {
  title: string;
  author: string;
  year: number;
  rationale: string;
  cautions: string[];
}

/** Thrown when the model output can't be parsed/validated even after one retry. The callable
 *  maps this to HttpsError('internal', …); everything else is a transport error. */
export class MalformedSuggestionsError extends Error {
  code = "MALFORMED";
  constructor(message: string) {
    super(message);
    this.name = "MalformedSuggestionsError";
  }
}

/* ── System prompt ─────────────────────────────────────────────────────── */
export const SYSTEM_PROMPT = `
You suggest comparable titles ("comps") for a fiction writer's query letter. You are given their
manuscript's age category, genre, logline (and sometimes a synopsis), plus the comps already on
their shelf.

Suggest 4–6 REAL, PUBLISHED, VERIFIABLE books. Inventing a title, author or year is far worse
than returning fewer suggestions — if you are not certain a book is real, leave it out.

Selection rules — enforce all of them:
- STRONGLY prefer books published in the LAST FIVE YEARS. An older book is only worth including
  when it is genuinely the closest match, and never more than one or two.
- Match on age category, genre and tone — a comp tells an agent where the book sits on the shelf.
- NEVER suggest a title already on the writer's shelf (they are listed). Do not suggest the
  writer's own manuscript.
- "cautions" may ONLY contain values from this exact set, and is usually empty:
  ["MEGA-BESTSELLER", "FRANCHISE-SCALE"]. Use MEGA-BESTSELLER for era-defining phenomenon-scale
  books that read as naive in a query letter; FRANCHISE-SCALE for franchise/IP-scale properties.
  Do NOT flag age — the app derives that from "year".

Return ONLY a single valid JSON object — no prose, no markdown, no code fences. Exact shape:

{
  "suggestions": [
    {
      "title": "<the book's exact title>",
      "author": "<the author's name>",
      "year": <first publication year, integer>,
      "rationale": "<why it comps, one line, max ${MAX_RATIONALE_CHARS} characters>",
      "cautions": []
    }
  ]
}
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
      ? `ALREADY ON THE SHELF (never suggest these): ${input.shelfTitles.join(" · ")}`
      : "ALREADY ON THE SHELF: (nothing yet)",
    "",
    "Return only the JSON object described in the system prompt."
  );
  return lines.join("\n");
}

/* ── Parse + validate + normalise ──────────────────────────────────────── */
function stripFences(text: string): string {
  return text.replace(/^\s*```(?:json)?/i, "").replace(/```\s*$/i, "").trim();
}

/**
 * Validate the model's JSON. Hard-fails (throw) only when `suggestions` is not an array —
 * individual malformed items are DROPPED, not fatal. Normalises: trims strings, caps the
 * rationale, filters cautions to the allow-list, de-duplicates (within the list and against the
 * shelf, case-insensitively), caps the list at MAX_SUGGESTIONS.
 */
export function validateSuggestions(raw: unknown, shelfTitles: string[]): Suggestion[] {
  if (!raw || typeof raw !== "object" || !Array.isArray((raw as Record<string, unknown>).suggestions)) {
    throw new MalformedSuggestionsError("suggestions is not an array");
  }
  const shelf = new Set(shelfTitles.map((t) => t.trim().toLowerCase()));
  const seen = new Set<string>();
  const out: Suggestion[] = [];
  for (const item of (raw as { suggestions: unknown[] }).suggestions) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const title = typeof rec.title === "string" ? rec.title.trim() : "";
    const author = typeof rec.author === "string" ? rec.author.trim() : "";
    const year = typeof rec.year === "number" && Number.isInteger(rec.year) ? rec.year : NaN;
    const rationale = typeof rec.rationale === "string" ? rec.rationale.trim() : "";
    if (!title || !author || !Number.isFinite(year) || year < 1000 || year > 2100) continue;
    const key = title.toLowerCase();
    if (shelf.has(key) || seen.has(key)) continue;
    const cautions = Array.isArray(rec.cautions)
      ? rec.cautions.filter((c): c is string => typeof c === "string" && CAUTION_SET.has(c))
      : [];
    seen.add(key);
    out.push({ title, author, year, rationale: rationale.slice(0, MAX_RATIONALE_CHARS), cautions });
    if (out.length >= MAX_SUGGESTIONS) break;
  }
  return out;
}

/** Minimal structural Anthropic client — no SDK import needed in the core (mirrors emailImportCore,
 *  including the `any` parameter: the real SDK's overloaded create is not assignable to a
 *  narrower structural signature). */
export interface AnthropicLike {
  messages: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    create: (args: any) => Promise<{
      content: Array<{ type: string; text?: string }>;
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
 * Call Claude, parse + validate, return suggestions. On a malformed first response, retries ONCE
 * with a terse "valid JSON only" nudge; if that also fails, throws MalformedSuggestionsError.
 * Transport/API errors propagate unchanged. Token usage is logged per call for cost visibility.
 */
export async function suggestFromModel(client: AnthropicLike, input: SuggestInput): Promise<Suggestion[]> {
  const baseMessages = [{ role: "user" as const, content: buildUserMessage(input) }];

  const callOnce = async (messages: Array<{ role: "user" | "assistant"; content: string }>) => {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      temperature: TEMPERATURE,
      system: SYSTEM_PROMPT,
      messages,
    });
    console.log(
      `suggestComps: tokens in=${res.usage?.input_tokens ?? "?"} out=${res.usage?.output_tokens ?? "?"}`
    );
    return res;
  };

  const first = await callOnce(baseMessages);
  const firstText = textOf(first);
  try {
    return validateSuggestions(JSON.parse(stripFences(firstText)), input.shelfTitles);
  } catch (_e) {
    const retryMessages = [
      ...baseMessages,
      { role: "assistant" as const, content: firstText },
      {
        role: "user" as const,
        content:
          "That was not valid. Return ONLY the JSON object described, with no prose and no code " +
          "fences, and cautions only from the allowed set.",
      },
    ];
    const second = await callOnce(retryMessages);
    try {
      return validateSuggestions(JSON.parse(stripFences(textOf(second))), input.shelfTitles);
    } catch (e2) {
      throw new MalformedSuggestionsError(
        `invalid after retry: ${e2 instanceof Error ? e2.message : String(e2)}`
      );
    }
  }
}
