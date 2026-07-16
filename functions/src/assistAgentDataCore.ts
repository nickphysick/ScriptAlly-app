/**
 * assistAgentData — PURE CORE (no Firebase, no Firestore, no secrets).
 *
 * Given a housekeeping rule (reply window / materials / wish list) and a set of agents, ask Claude —
 * WITH WEB SEARCH — for each agent's PUBLIC, VERIFIABLE submission fact, returned WITH PROVENANCE.
 * Everything unit-runnable without the Functions runtime lives here: the per-rule prompt, the
 * user-message builder, and the parse/validate/normalise step. `assistFromModel` takes an
 * already-built Anthropic client, so tests drive it with a mock — no emulator.
 *
 * The callable wrapper (assistAgentData.ts) does auth, the Pro gate, input validation and builds the
 * client; it hands off here. READ-ONLY — nothing writes to Firestore. Anti-hallucination is the whole
 * game: a value with NO source is dropped, and the prompt insists that omitting a value is far better
 * than inventing one (a wrong reply window or materials list would go straight into a query letter).
 */

export const MODEL = "claude-sonnet-4-6";
export const MAX_TOKENS = 1500;
export const TEMPERATURE = 0.2; // facts, not variety — keep it near-deterministic

export const MAX_AGENTS = 20;
export const MAX_SOURCE_CHARS = 300;
export const MAX_VALUE_CHARS = 600;

/** Only the three data-quality rules are assistable (mirrors HkRule minus no_response_close). */
export type AssistRule = "dq_responseTime" | "dq_materials" | "dq_mswl";
const ASSIST_RULES: ReadonlySet<string> = new Set(["dq_responseTime", "dq_materials", "dq_mswl"]);
export const isAssistRule = (r: unknown): r is AssistRule => typeof r === "string" && ASSIST_RULES.has(r);

/** The material vocabulary the drawer understands — the model must choose only from these. */
export const MATERIAL_VOCAB = ["Query Letter", "Synopsis", "Sample Pages", "Full Manuscript"] as const;

export type Confidence = "high" | "medium" | "low";
const CONFIDENCE_SET: ReadonlySet<string> = new Set(["high", "medium", "low"]);

export interface AssistAgentInput {
  agentId: string;
  name: string;
  agency?: string;
}
export interface AssistInput {
  rule: AssistRule;
  agents: AssistAgentInput[];
}
export interface AssistFoundItem {
  agentId: string;
  value: string;
  source: string;
  confidence: Confidence;
}

export class MalformedAssistError extends Error {
  code = "MALFORMED";
  constructor(message: string) {
    super(message);
    this.name = "MalformedAssistError";
  }
}

/* ── Per-rule guidance ─────────────────────────────────────────────────────── */
function ruleGuidance(rule: AssistRule): string {
  switch (rule) {
    case "dq_responseTime":
      return [
        `You are finding each agent's stated RESPONSE TIME — how long they say they take to reply to a query.`,
        `"value" MUST be a single whole number of WEEKS (e.g. "6", "12"). Convert months/days to weeks; round sensibly.`,
        `Use the agent's or agency's own submission guidelines. If they only give a range, use the upper bound.`,
      ].join("\n");
    case "dq_materials":
      return [
        `You are finding what each agent asks to receive WITH A QUERY.`,
        `"value" MUST be a comma-separated list drawn ONLY from this exact set: ${MATERIAL_VOCAB.join(", ")}.`,
        `Map their wording to that set (e.g. "first three chapters" → Sample Pages; "one-page synopsis" → Synopsis).`,
      ].join("\n");
    case "dq_mswl":
      return [
        `You are finding each agent's MANUSCRIPT WISH LIST (MSWL) — the kinds of stories they want.`,
        `"value" MUST be a concise plain-text summary (max 400 characters) of what they're seeking. No markdown.`,
        `Use their public MSWL, agency bio, #MSWL posts or interviews — quote themes, not whole paragraphs.`,
      ].join("\n");
  }
}

export function systemPrompt(rule: AssistRule): string {
  return `
You research literary agents' PUBLIC submission information using web search, for a writer keeping
their agent database clean. You are given a list of agents (name + agency). For each, find ONE fact.

${ruleGuidance(rule)}

Rules — enforce all of them:
- Use web search. Rely on the agent's or agency's OWN pages, QueryTracker/Manuscript Wish List, or a
  clearly-attributable interview — never a guess.
- INVENTING a value is far worse than omitting the agent. If you cannot find a well-sourced value,
  DO NOT include that agent in the output. Fewer, correct answers only.
- Every returned item MUST carry a "source": a short human-readable provenance (the site/page name or
  a URL) that a person could check. No source ⇒ do not return the item.
- "confidence" is "high" (the agent/agency's own current guidance), "medium" (a reputable directory),
  or "low" (older or indirect). Prefer high; never dress up a guess as high.

Return ONLY a single valid JSON object — no prose, no markdown, no code fences. Exact shape:

{
  "found": [
    {
      "agentId": "<the exact agentId you were given>",
      "value": "<the value in the format described above>",
      "source": "<where you found it — site name or URL>",
      "confidence": "high"
    }
  ]
}
`.trim();
}

export function buildUserMessage(input: AssistInput): string {
  const lines = ["AGENTS:"];
  for (const a of input.agents) {
    lines.push(`- agentId=${a.agentId} · ${a.name}${a.agency ? ` (${a.agency})` : ""}`);
  }
  lines.push("", "Return only the JSON object described in the system prompt. Omit any agent you cannot source.");
  return lines.join("\n");
}

/* ── Parse + validate + normalise ──────────────────────────────────────────── */
function stripFences(text: string): string {
  return text.replace(/^\s*```(?:json)?/i, "").replace(/```\s*$/i, "").trim();
}

/**
 * Validate the model's JSON. Hard-fails (throw) only when `found` is not an array — individual
 * malformed items are DROPPED. Keeps only items whose agentId is one we ASKED about, that carry a
 * non-empty value AND source, one per agent (first wins). materials values are filtered to the vocab.
 */
export function validateFound(raw: unknown, input: AssistInput): AssistFoundItem[] {
  if (!raw || typeof raw !== "object" || !Array.isArray((raw as Record<string, unknown>).found)) {
    throw new MalformedAssistError("found is not an array");
  }
  const asked = new Set(input.agents.map((a) => a.agentId));
  const seen = new Set<string>();
  const out: AssistFoundItem[] = [];
  for (const item of (raw as { found: unknown[] }).found) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const agentId = typeof rec.agentId === "string" ? rec.agentId.trim() : "";
    let value = typeof rec.value === "string" ? rec.value.trim() : "";
    const source = typeof rec.source === "string" ? rec.source.trim().slice(0, MAX_SOURCE_CHARS) : "";
    if (!agentId || !asked.has(agentId) || seen.has(agentId) || !value || !source) continue;

    if (input.rule === "dq_responseTime") {
      const weeks = parseInt(value.replace(/[^0-9]/g, ""), 10);
      if (!Number.isFinite(weeks) || weeks <= 0 || weeks > 260) continue;
      value = String(weeks);
    } else if (input.rule === "dq_materials") {
      const picked = MATERIAL_VOCAB.filter((m) => value.toLowerCase().includes(m.toLowerCase()));
      if (picked.length === 0) continue;
      value = picked.join(", ");
    } else {
      value = value.slice(0, MAX_VALUE_CHARS);
    }

    const confidence: Confidence = CONFIDENCE_SET.has(rec.confidence as string) ? (rec.confidence as Confidence) : "low";
    seen.add(agentId);
    out.push({ agentId, value, source, confidence });
  }
  return out;
}

/** Minimal structural Anthropic client — no SDK import in the core (mirrors suggestCompsCore). */
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
  return msg.content.filter((b) => b.type === "text").map((b) => b.text || "").join("");
}

/**
 * Call Claude WITH web search, parse + validate, return found values. On a malformed first response,
 * retries ONCE with a terse "valid JSON only" nudge; if that also fails, throws MalformedAssistError.
 * Transport/API errors propagate unchanged. Token usage is logged per call for cost visibility.
 */
export async function assistFromModel(client: AnthropicLike, input: AssistInput): Promise<AssistFoundItem[]> {
  const baseMessages = [{ role: "user" as const, content: buildUserMessage(input) }];
  const tools = [{ type: "web_search_20250305", name: "web_search", max_uses: Math.min(input.agents.length * 2, 12) }];

  const callOnce = async (messages: Array<{ role: "user" | "assistant"; content: string }>) => {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      temperature: TEMPERATURE,
      system: systemPrompt(input.rule),
      tools,
      messages,
    });
    console.log(`assistAgentData: rule=${input.rule} agents=${input.agents.length} tokens in=${res.usage?.input_tokens ?? "?"} out=${res.usage?.output_tokens ?? "?"}`);
    return res;
  };

  const first = await callOnce(baseMessages);
  const firstText = textOf(first);
  try {
    return validateFound(JSON.parse(stripFences(firstText)), input);
  } catch (_e) {
    const retryMessages = [
      ...baseMessages,
      { role: "assistant" as const, content: firstText },
      { role: "user" as const, content: "That was not valid. Return ONLY the JSON object described, no prose or code fences, and omit any agent you cannot source." },
    ];
    const second = await callOnce(retryMessages);
    try {
      return validateFound(JSON.parse(stripFences(textOf(second))), input);
    } catch (e2) {
      throw new MalformedAssistError(`invalid after retry: ${e2 instanceof Error ? e2.message : String(e2)}`);
    }
  }
}
