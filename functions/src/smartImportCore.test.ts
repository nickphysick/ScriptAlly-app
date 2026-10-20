import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { mapSheet, mappingRequest, MAX_OUTPUT_TOKENS, STRICT_SUFFIX, type MapClient } from "./smartImportCore";
import { SYSTEM_PROMPT } from "./smartImportPrompt";
import { MODEL } from "./emailImportCore";

/** A client that returns one canned body per call (or throws), and records what it was sent. */
function fakeClient(replies: (string | Error)[]): MapClient & { calls: any[] } {
  let i = 0;
  const calls: any[] = [];
  return {
    calls,
    messages: {
      stream: (args: any) => ({
        finalMessage: async () => {
          calls.push(args);
          const r = replies[i++];
          if (r instanceof Error) throw r;
          return {
            content: [{ type: "text", text: r ?? "" }],
            stop_reason: "end_turn",
            usage: { input_tokens: 100, output_tokens: 20, cache_read_input_tokens: 7, cache_creation_input_tokens: 3 },
          };
        },
      }),
    },
  };
}

const GOOD = '{"agents":[{"ref":"a1","name":"Clara Voss","agency":"Pemberton"}],"queries":[{"agentRef":"a1","status":"Queried","sentDateRaw":"14/03/2024"}]}';

describe("mapSheet", () => {
  it("makes the callable's exact request and assembles a good reply", async () => {
    const c = fakeClient([GOOD]);
    const out = await mapSheet(c, "Agent,Agency\nClara Voss,Pemberton");
    expect(out.failure).toBeNull();
    expect(out.attempts).toBe(1);
    expect(c.calls).toHaveLength(1);
    expect(c.calls[0]).toEqual({
      model: MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      temperature: 0,
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: "Agent,Agency\nClara Voss,Pemberton" }],
    });
    // Assembled: the parser ran over sentDateRaw.
    expect(out.result.queries[0].sentDate).toBe("2024-03-14");
    expect(out.usage).toEqual({ inputTokens: 100, outputTokens: 20, cacheReadTokens: 7, cacheWriteTokens: 3 });
  });

  it("retries ONCE, strictly, when the reply is prose, and sums usage over both calls", async () => {
    const c = fakeClient(["Sure! Here is the mapping you asked for.", GOOD]);
    const out = await mapSheet(c, "x");
    expect(out.failure).toBeNull();
    expect(out.attempts).toBe(2);
    expect(c.calls[1].system[0].text).toBe(SYSTEM_PROMPT + STRICT_SUFFIX);
    expect(c.calls[0].system[0].text).toBe(SYSTEM_PROMPT);
    expect(out.usage.inputTokens).toBe(200);
    expect(out.result.queries).toHaveLength(1);
  });

  it("reports nonjson when the strict retry is still prose", async () => {
    const out = await mapSheet(fakeClient(["no", "still no"]), "x");
    expect(out).toMatchObject({ result: null, failure: "nonjson", attempts: 2 });
  });

  it("does NOT retry a truncated JSON reply", async () => {
    const c = fakeClient(['{"agents":[{"ref":"a1","name":"Clara']);
    // A JSON-shaped reply needs a closing brace somewhere to read as JSON-shaped.
    const c2 = fakeClient(['{"agents":[{"ref":"a1"}],"queries":[{"agentRef":"a1","status":"Quer}']);
    const out = await mapSheet(c2, "x");
    expect(out).toMatchObject({ result: null, failure: "badjson", attempts: 1 });
    expect(c2.calls).toHaveLength(1);
    // With no closing brace at all there is no object structure: that is the prose branch.
    const out1 = await mapSheet(c, "x");
    expect(out1.failure).toBe("nonjson");
  });

  it("reports an API failure on either call without throwing", async () => {
    expect((await mapSheet(fakeClient([new Error("529")]), "x")).failure).toBe("api");
    expect((await mapSheet(fakeClient(["prose", new Error("529")]), "x"))).toMatchObject({ failure: "api", attempts: 2 });
  });

  it("strips fences and prose around the object", async () => {
    const out = await mapSheet(fakeClient(["Here:\n```json\n" + GOOD + "\n```"]), "x");
    expect(out.failure).toBeNull();
  });

  it("builds the strict request only for the retry", () => {
    expect(mappingRequest("x", false).system[0].text).toBe(SYSTEM_PROMPT);
    expect(mappingRequest("x", true).system[0].text.endsWith(STRICT_SUFFIX)).toBe(true);
  });

  it("marks the system prompt for caching, as ONE block whose text is the prompt unchanged", () => {
    for (const strict of [false, true]) {
      const sys = mappingRequest("x", strict).system;
      expect(sys).toHaveLength(1);
      expect(sys[0].cache_control).toEqual({ type: "ephemeral" });
    }
    // Nothing volatile in the cached prefix: two requests for different sheets share it byte for byte.
    expect(JSON.stringify(mappingRequest("sheet A", false).system)).toBe(JSON.stringify(mappingRequest("sheet B", false).system));
  });
});

describe("the callable delegates to the core (locked)", () => {
  const src = readFileSync(resolve(process.cwd(), "functions/src/smartImport.ts"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  it("imports mapSheet", () => {
    expect(src).toMatch(/import\s*\{[^}]*\bmapSheet\b[^}]*\}\s*from\s*"\.\/smartImportCore"/);
    expect(src).toMatch(/mapSheet\(client,\s*sheetText/);
  });
  it("no longer calls the model itself, nor restates the request", () => {
    expect(src).not.toContain("messages.create");
    expect(src).not.toContain("messages.stream");
    expect(src).not.toContain("max_tokens");
    expect(src).not.toContain("SYSTEM_PROMPT");
  });
  it("keeps its gate and its consume-on-success", () => {
    expect(src).toContain('reason: "pro_month_used"');
    expect(src).toContain('reason: "free_used"');
    expect(src.indexOf("await consume()")).toBeGreaterThan(src.indexOf("outcome.failure"));
  });
});

describe("time to first output token", () => {
  it("is measured at the first streamed text delta, once", async () => {
    let t = 0;
    const c: MapClient = { messages: { stream: () => {
      let cb: ((d: string) => void) | null = null;
      return {
        on: (_e: "text", f: (d: string) => void) => { cb = f; },
        finalMessage: async () => {
          t = 1200; cb?.("{"); t = 1500; cb?.('"agents"'); t = 9000;
          return { content: [{ type: "text", text: GOOD }], usage: {} };
        },
      };
    } } };
    const out = await mapSheet(c, "x", { now: () => t });
    expect(out.firstTokenMs).toBe(1200);
    expect(out.ms).toBe(9000);
  });
  it("is null when the client streams no events", async () => {
    expect((await mapSheet(fakeClient([GOOD]), "x")).firstTokenMs).toBeNull();
  });
});

describe("the 32k ceiling needs the streamed call (locked)", () => {
  it("is above what the installed SDK accepts non-streaming, so the call must stay streamed", async () => {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const real: any = new Anthropic({ apiKey: "test-not-a-key" });
    expect(MAX_OUTPUT_TOKENS).toBeGreaterThan(21_333);
    expect(() => real._calculateNonstreamingTimeout(MAX_OUTPUT_TOKENS)).toThrow(/Streaming is strongly recommended/);
    expect(typeof real.messages.stream).toBe("function");
  });

  it("a reply cut off at the ceiling is still badjson and still not retried", async () => {
    let n = 0;
    const c: MapClient = { messages: { stream: () => ({ finalMessage: async () => {
      n++;
      return { content: [{ type: "text", text: '{"agents":[{"ref":"a1"}],"queries":[{"agentRef":"a1","status":"Que' + "}" }], stop_reason: "max_tokens", usage: { input_tokens: 1, output_tokens: 32000 } };
    } }) } };
    const out = await mapSheet(c, "x");
    expect(out).toMatchObject({ result: null, failure: "badjson", attempts: 1, stopReason: "max_tokens" });
    expect(n).toBe(1);
  });
});
