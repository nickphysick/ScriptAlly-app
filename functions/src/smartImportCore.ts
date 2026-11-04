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
import { SYSTEM_PROMPT, PHOTO_ADDENDUM } from "./smartImportPrompt";
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

// ── Photos (smart-import-photos-v1) ───────────────────────────────────────────────────────────────

/** At most ten pages: most lists are one to three, and every page is read in one call. */
export const MAX_PAGES = 10;
/** The media types a page may be. The client always sends JPEG; PNG is accepted for a screenshot. */
export const PAGE_MEDIA_TYPES = ["image/jpeg", "image/png"] as const;
/** One page's base64, at most. Anthropic refuses an image over 5 MB (5,242,880 bytes of base64);
 *  this sits under it. A 1568px JPEG at quality 0.82 is far smaller (~0.3–1 MB). */
export const MAX_PAGE_CHARS = 5_000_000;
/**
 * All pages' base64 together, at most. MEASURED against the callable's request limit
 * (reports/smart-import-photos-v1/: Cloud Functions 2nd gen, i.e. Cloud Run, refuses an HTTP/1
 * request body over 32 MiB), with more than 25% margin — and under the Anthropic API's own 32 MB
 * request limit. The client caps at the same number (src/lib/photoImport.ts), held equal by a lock.
 */
export const MAX_PAGES_CHARS = 20_000_000;

export interface PageIn { mediaType: (typeof PAGE_MEDIA_TYPES)[number]; data: string }

/** What the callable was asked to read. A string discriminant: the root typecheck runs with
 *  strictNullChecks off and cannot narrow a boolean one. */
export type ImportInput =
  | { kind: "sheet"; sheetText: string }
  | { kind: "pages"; pages: PageIn[] }
  | { kind: "error"; message: string };

const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;
/** The first bytes a real file of each type starts with, as its base64 begins. */
const MAGIC: Record<PageIn["mediaType"], string> = { "image/jpeg": "/9j/", "image/png": "iVBORw0KGgo" };

/**
 * Which of the two inputs the request carries, and whether a photo request is well formed. Pure, and
 * the callable runs it BEFORE it reads anything — so a malformed request is refused without the
 * entitlement being touched. A spreadsheet request is passed on as it always was (its own size checks
 * stay in the callable); with neither key it reads as an empty sheet, so the message is the one it
 * always was ("No file content.").
 */
export function pickImportInput(data: unknown): ImportInput {
  const d = (data && typeof data === "object" ? data : {}) as { sheetText?: unknown; pages?: unknown };
  const hasSheet = d.sheetText !== undefined && d.sheetText !== null;
  const hasPages = d.pages !== undefined && d.pages !== null;
  if (hasSheet && hasPages) return { kind: "error", message: "Send a sheet or photos, not both." };
  if (!hasPages) return { kind: "sheet", sheetText: typeof d.sheetText === "string" ? d.sheetText : "" };
  if (!Array.isArray(d.pages) || d.pages.length === 0) return { kind: "error", message: "No photos." };
  if (d.pages.length > MAX_PAGES) return { kind: "error", message: `Up to ${MAX_PAGES} photos at a time.` };
  let total = 0;
  const pages: PageIn[] = [];
  for (const raw of d.pages) {
    const pg = (raw && typeof raw === "object" ? raw : {}) as { mediaType?: unknown; data?: unknown };
    const mt = pg.mediaType;
    if (typeof mt !== "string" || !(PAGE_MEDIA_TYPES as readonly string[]).includes(mt)) return { kind: "error", message: "Photos must be JPEG or PNG." };
    const b64 = typeof pg.data === "string" ? pg.data : "";
    if (!b64 || b64.length % 4 !== 0 || !BASE64.test(b64)) return { kind: "error", message: "A photo could not be read." };
    if (!b64.startsWith(MAGIC[mt as PageIn["mediaType"]])) return { kind: "error", message: "A photo could not be read." };
    if (b64.length > MAX_PAGE_CHARS) return { kind: "error", message: "A photo is too large." };
    total += b64.length;
    if (total > MAX_PAGES_CHARS) return { kind: "error", message: "The photos are too large together." };
    pages.push({ mediaType: mt as PageIn["mediaType"], data: b64 });
  }
  return { kind: "pages", pages };
}

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

/**
 * The request body for one PHOTO mapping call. Two cached system blocks: SYSTEM_PROMPT unchanged
 * (so it shares the sheet request's cache entry), then PHOTO_ADDENDUM — which carries the strict
 * reminder on the retry, leaving the first block untouched. The user message is the pages in order,
 * each image after a "Page N" text block.
 */
export function photoRequest(pages: PageIn[], strict: boolean) {
  const content: any[] = [];
  pages.forEach((pg, i) => {
    content.push({ type: "text", text: `Page ${i + 1}` });
    content.push({ type: "image", source: { type: "base64", media_type: pg.mediaType, data: pg.data } });
  });
  return {
    model: MODEL,
    max_tokens: MAX_OUTPUT_TOKENS,
    temperature: 0,
    system: [
      { type: "text" as const, text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" as const } },
      { type: "text" as const, text: strict ? PHOTO_ADDENDUM + STRICT_SUFFIX : PHOTO_ADDENDUM, cache_control: { type: "ephemeral" as const } },
    ],
    messages: [{ role: "user" as const, content }],
  };
}

/** Map one sheet's text. Never throws: every failure comes back as `failure`. */
export function mapSheet(client: MapClient, sheetText: string, opts: MapOpts = {}): Promise<MapOutcome> {
  return mapWith(client, (strict) => mappingRequest(sheetText, strict), (v) => assembleResult(v), opts);
}

/** Map photos of a list. The same parse-and-repair, retry rule and ceiling as a sheet; the result
 *  carries the photo fields (src, lineRaw, markRaw, readings), range-checked by the assembler. */
export function mapPages(client: MapClient, pages: PageIn[], opts: MapOpts = {}): Promise<MapOutcome> {
  return mapWith(client, (strict) => photoRequest(pages, strict), (v) => assembleResult(v, { photos: { pageCount: pages.length } }), opts);
}

/** The one mapping loop both inputs share. */
async function mapWith(client: MapClient, build: (strict: boolean) => any, assemble: (v: any) => any, opts: MapOpts): Promise<MapOutcome> {
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
    msg = await call(client, build(false), w1.onText);
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
    return done(assemble(first.value), null, msg?.stop_reason);
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
    retryMsg = await call(client, build(true), w2.onText);
    w2.end();
  } catch (e) {
    logError("Anthropic mapping retry call failed:", e);
    return done(null, "api");
  }
  addUsage(retryMsg);
  const second = parseReply(extractText(retryMsg));
  if (second.ok) {
    log(`smartImportMap: mapped on retry in ${now() - startedMs}ms`);
    return done(assemble(second.value), null, retryMsg?.stop_reason);
  }
  // Still unusable. Log cause + duration only (no payload / user data / key).
  logError(`smartImportMap: mapping unusable after retry (${second.kind}) after ${now() - startedMs}ms`);
  return done(null, second.kind, retryMsg?.stop_reason);
}
