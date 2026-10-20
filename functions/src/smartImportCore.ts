/**
 * Smart Import mapping — the pure core of the call the smartImportMap callable makes.
 *
 * The callable owns auth, the size checks and the entitlement gate; this module owns ONE thing: the
 * request to the model and what its reply is turned into. It was lifted out of smartImport.ts so the
 * evaluation harness (functions/eval/) can make exactly the request production makes, through the
 * same parse-and-repair, without going near Firebase, the entitlement subdoc or the Functions secret.
 *
 * Imports only the prompt, the assembler and the MODEL constant — all side-effect free — so it is
 * unit-testable with a fake client and runnable from a plain node process.
 *
 * The behaviour is the callable's, unchanged: temperature 0, MAX_OUTPUT_TOKENS, one strict retry on
 * a reply with no JSON object in it, NO retry on a reply that is JSON-shaped but unparseable (almost
 * always truncation at the ceiling — a second large call would not help).
 */
import { SYSTEM_PROMPT } from "./smartImportPrompt";
import { assembleResult } from "./assembleImport";
import { MODEL } from "./emailImportCore";
import { createRowCounter } from "./progressCounter";

/** Output ceiling — a runaway guard, NOT the speed lever (the slimmed, omit-empty output contract is).
 *  MEASURED, not estimated (reports/smart-import-eval/): 35–70 output tokens per row, ~50 typical, so
 *  12k truncated a 300-row sheet at row ~240. 32k covers 300 messy rows at 70 a row with half again
 *  in hand. A reply that still reaches it is surfaced as "malformed" and NOT retried (a second big
 *  call won't help). Above ~21.3k the SDK refuses a non-streaming request outright, which is why the
 *  call below streams. */
export const MAX_OUTPUT_TOKENS = 32000;

/**
 * THE SIZE CAP, measured (reports/smart-import-quickfixes/): one call per size, one at a time, clean
 * sheets — 150 rows 90 s, 200 rows 117 s, 250 rows 149 s, 300 rows 181 s, all complete, none
 * truncated. 300 data rows is the largest size measured inside the 240 s target (leaving margin under
 * the function's 300 s). The check counts TEXT LINES, so the cap is 300 rows plus the header line;
 * preamble, blank and tab-heading lines only add to the count, so it never admits more than 300 data
 * rows. Messier files are slower per row — measured 17% at 150 rows — and are flagged in the report.
 * The client mirrors this (src/lib/smartImport.ts MAX_SHEET_ROWS), held equal by a lock.
 */
export const MAX_SHEET_LINES = 301;
export const MAX_SHEET_CHARS = 200_000;

/** The reminder appended to the system prompt on the one strict retry. */
export const STRICT_SUFFIX = "\n\nReturn ONLY the JSON object — no prose, no explanation, no code fences.";

/** The slice of the Anthropic client this module uses — so a test can hand it a fake.
 *
 *  STREAMED, because a 32k ceiling is past what the SDK (0.39) accepts non-streaming: it computes
 *  3600 × max_tokens / 128000 seconds and throws above ten minutes, i.e. above ~21,333 tokens.
 *  `finalMessage()` resolves to the same Message a non-streaming call returns — the same content
 *  blocks, stop_reason and usage — and rejects on an API error, so everything below is unchanged. */
export interface MapClient {
  messages: { stream(args: any): { finalMessage(): Promise<any>; on?(event: "text", cb: (delta: string) => void): unknown } };
}

/** One mapping request, streamed to completion. `onText` sees every text delta as it arrives; a
 *  client without `on` (a test fake) simply never reports any. */
const call = (client: MapClient, args: any, onText?: (delta: string) => void) => {
  const stream = client.messages.stream(args);
  if (onText && typeof stream.on === "function") stream.on("text", onText);
  return stream.finalMessage();
};

/** How often, at most, progress is reported while a reply streams. */
export const PROGRESS_EVERY_MS = 250;

/** A progress report: the rows read so far in the reply now streaming (see progressCounter). */
export interface MapProgress { rows: number }

export type MapFailure = "nonjson" | "badjson" | "api";

export interface MapUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

export interface MapOutcome {
  /** The assembled result on success; null on any failure. */
  result: any | null;
  /** Why it failed, or null on success. */
  failure: MapFailure | null;
  /** Summed over every attempt that returned a message. */
  usage: MapUsage;
  /** Wall-clock for the whole mapping, retry included. */
  ms: number;
  /** How many requests were made (1, or 2 when the strict retry ran). */
  attempts: number;
  /** The `stop_reason` of the last message received, when there was one. */
  stopReason?: string | null;
  /** Milliseconds from the start of the mapping to the first streamed output text of the call that
   *  produced the result (the retry's, when the retry ran). Null when the client does not stream
   *  events or no text arrived. */
  firstTokenMs?: number | null;
}

export interface MapOpts {
  /** Where progress lines go. The callable passes console; the harness passes nothing. Duration and
   *  outcome only — never the payload, user data or key. */
  log?: (msg: string) => void;
  logError?: (msg: string, cause?: unknown) => void;
  now?: () => number;
  /** Rows read so far, as the reply streams: once at its first text, then at most every
   *  PROGRESS_EVERY_MS while the count changes, then once when the attempt ends. Optional, and it
   *  changes nothing about the request, the result or the failures. */
  onProgress?: (p: MapProgress) => void;
  /** Called once, just before the one strict retry; progress then starts again from 0. */
  onRetry?: () => void;
}

/** What the callable streams to the browser while a reply is read. The final return value is
 *  unchanged; these are extra messages beside it, and only when the browser asked to stream. */
export type ImportChunk = { rows: number } | { retry: true };

/**
 * The progress hooks for one callable request. When the browser did not ask to stream this returns
 * an EMPTY object — so mapSheet is called with exactly the options it always was, and the request,
 * the result, the failures and when the import is charged are byte-for-byte what they were. When it
 * did, rows go out as `{ rows }` and the strict retry is announced as `{ retry: true }`. A chunk that
 * fails to send is dropped: progress must never be able to fail an import.
 */
export function streamHooks(acceptsStreaming: boolean, send: (chunk: ImportChunk) => unknown): Pick<MapOpts, "onProgress" | "onRetry"> {
  if (!acceptsStreaming) return {};
  const safe = (c: ImportChunk) => { try { void Promise.resolve(send(c)).catch(() => {}); } catch { /* dropped */ } };
  return { onProgress: (p) => safe({ rows: p.rows }), onRetry: () => safe({ retry: true }) };
}

/** Concatenate the text blocks of an Anthropic message into one string. */
export function extractText(msg: { content: any[] }): string {
  return msg.content.filter((b: any) => b.type === "text").map((b: any) => b.text ?? "").join("");
}

export type ParseOutcome =
  | { ok: true; value: any }
  | { ok: false; kind: "nonjson" } // no JSON object at all (prose/refusal) — worth one stricter retry
  | { ok: false; kind: "badjson" }; // an object IS present but won't parse (truncated/malformed) — no retry

/** In-process repair + parse: strip code fences and any prose either side by taking from the first "{"
 *  to the last "}", then JSON.parse. Distinguishes a genuinely non-JSON reply (no object structure —
 *  prose/refusal, worth a stricter retry) from a JSON-shaped-but-unparseable reply (truncated/malformed
 *  — a second large call won't help, so we don't make one). */
export function parseReply(text: string): ParseOutcome {
  const s = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first === -1 || last <= first) return { ok: false, kind: "nonjson" };
  try { return { ok: true, value: JSON.parse(s.slice(first, last + 1)) }; }
  catch { return { ok: false, kind: "badjson" }; }
}

/**
 * The request body for one mapping call. `strict` appends the JSON-only reminder (retry only).
 *
 * PROMPT CACHING. The system prompt is the same ~1.8k tokens on every import — above Sonnet 4.6's
 * 1,024-token minimum — so it is sent as one text block marked `cache_control: ephemeral` and every
 * import within five minutes of another reads it from cache at a tenth of the input price. The text
 * is unchanged. The strict retry's text differs (the reminder is appended), so it is its own block
 * and simply misses the cache; it is rare.
 */
export function mappingRequest(sheetText: string, strict: boolean) {
  return {
    model: MODEL,
    max_tokens: MAX_OUTPUT_TOKENS,
    temperature: 0,
    system: [{ type: "text" as const, text: strict ? SYSTEM_PROMPT + STRICT_SUFFIX : SYSTEM_PROMPT, cache_control: { type: "ephemeral" as const } }],
    messages: [{ role: "user" as const, content: sheetText }],
  };
}

/** Map one sheet's text. Never throws: every failure comes back as `failure`. */
export async function mapSheet(client: MapClient, sheetText: string, opts: MapOpts = {}): Promise<MapOutcome> {
  const log = opts.log ?? (() => {});
  const logError = opts.logError ?? (() => {});
  const now = opts.now ?? Date.now;

  const usage: MapUsage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };
  const addUsage = (msg: any) => {
    const u = msg?.usage ?? {};
    usage.inputTokens += u.input_tokens ?? 0;
    usage.outputTokens += u.output_tokens ?? 0;
    usage.cacheReadTokens += u.cache_read_input_tokens ?? 0;
    usage.cacheWriteTokens += u.cache_creation_input_tokens ?? 0;
  };

  // Bracket the call with timing so the speed-up is visible and a future timeout can't be silent
  // (you'd see "started" with no "mapped …ms"). Duration only — never the payload, user data or key.
  const startedMs = now();
  log("smartImportMap: mapping call started");
  let attempts = 0;
  let firstTokenMs: number | null = null;

  /** One attempt's text handler: time to first token, and the throttled row count. */
  const watch = () => {
    const counter = createRowCounter();
    let seen = false, lastAt = 0, lastRows = -1;
    const emit = (rows: number) => { lastAt = now(); lastRows = rows; opts.onProgress?.({ rows }); };
    return {
      onText: (delta: string) => {
        if (!seen) { seen = true; firstTokenMs = now() - startedMs; }
        if (!opts.onProgress) return;
        counter.push(delta);
        const rows = counter.counts().rows;
        if (lastRows < 0 || (rows !== lastRows && now() - lastAt >= PROGRESS_EVERY_MS)) emit(rows);
      },
      end: () => { if (opts.onProgress && seen) emit(counter.counts().rows); },
    };
  };
  const done = (result: any | null, failure: MapFailure | null, stopReason?: string | null): MapOutcome =>
    ({ result, failure, usage, ms: now() - startedMs, attempts, stopReason, firstTokenMs });

  let msg: any;
  const w1 = watch();
  try {
    attempts++;
    msg = await call(client, mappingRequest(sheetText, false), w1.onText);
    w1.end();
  } catch (e) {
    // Log the underlying cause (status, message) — the caller only ever surfaces a generic error.
    logError("Anthropic mapping call failed:", e);
    return done(null, "api");
  }
  addUsage(msg);

  // Repair-and-parse the reply in-process (handles chatty wrappers with no second call).
  const first = parseReply(extractText(msg));
  if (first.ok) {
    log(`smartImportMap: mapped in ${now() - startedMs}ms`);
    return done(assembleResult(first.value), null, msg?.stop_reason);
  }
  if (first.kind === "badjson") {
    // A JSON object was present but wouldn't parse — almost always truncation at the token ceiling.
    // A second full call won't fix that (raise MAX_OUTPUT_TOKENS instead), so fail fast, no retry.
    logError(`smartImportMap: reply JSON-shaped but unparseable (likely truncated) after ${now() - startedMs}ms`);
    return done(null, "badjson", msg?.stop_reason);
  }

  // first.kind === "nonjson": the reply had no JSON object (prose/refusal) — ONE stricter retry.
  let retryMsg: any;
  opts.onRetry?.();
  const w2 = watch();
  try {
    attempts++;
    firstTokenMs = null;
    retryMsg = await call(client, mappingRequest(sheetText, true), w2.onText);
    w2.end();
  } catch (e) {
    logError("Anthropic mapping retry call failed:", e);
    return done(null, "api");
  }
  addUsage(retryMsg);
  const second = parseReply(extractText(retryMsg));
  if (second.ok) {
    log(`smartImportMap: mapped on retry in ${now() - startedMs}ms`);
    return done(assembleResult(second.value), null, retryMsg?.stop_reason);
  }
  // Still unusable. Log cause + duration only (no payload / user data / key).
  logError(`smartImportMap: mapping unusable after retry (${second.kind}) after ${now() - startedMs}ms`);
  return done(null, second.kind, retryMsg?.stop_reason);
}
