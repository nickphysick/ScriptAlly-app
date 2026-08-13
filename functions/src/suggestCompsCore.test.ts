import { describe, it, expect } from "vitest";
import {
  MODEL,
  MAX_SUGGESTIONS,
  MalformedSuggestionsError,
  ScoutRefusedError,
  SYSTEM_PROMPT,
  buildUserMessage,
  proposeCandidates,
  validateCandidates,
  verifyCandidates,
  type AnthropicLike,
  type Candidate,
} from "./suggestCompsCore";
import type { FetchLike } from "./compCatalogue";

const input = {
  manuscriptTitle: "Murphy's Day Out",
  ageCategory: "Adult",
  genre: "Crime",
  logline: "A funeral director investigates her own client list.",
  shelfTitles: ["The Appeal"],
};

/** A client that returns one canned text body per call, and records what it was sent. */
function fakeClient(bodies: string[], stopReasons: (string | undefined)[] = []): AnthropicLike & { calls: any[] } {
  let i = 0;
  const calls: any[] = [];
  return {
    calls,
    messages: {
      create: async (args: any) => {
        calls.push(args);
        const n = i++;
        return {
          content: [{ type: "text", text: bodies[n] ?? "" }],
          stop_reason: stopReasons[n],
          usage: { input_tokens: 1, output_tokens: 1 },
        };
      },
    },
  };
}

describe("the request shape", () => {
  /**
   * ⚠️ A SAMPLING PARAMETER IS A 400 ON THIS MODEL TIER. The previous version set
   * `temperature: 0.7` for variety between runs; sending it now fails the whole call. Asserted
   * because the failure is a deploy-time 400 on a function nobody can run locally.
   */
  it("sends no sampling parameters", async () => {
    const c = fakeClient(['{"candidates":[]}']);
    await proposeCandidates(c, input);
    expect("temperature" in c.calls[0]).toBe(false);
    expect("top_p" in c.calls[0]).toBe(false);
    expect("top_k" in c.calls[0]).toBe(false);
  });

  /** ⚠️ WEB SEARCH IS THE POINT OF THE CALL — "published in the last five years" cannot be
   *  honoured from training data older than the market the writer is querying into. */
  it("gives the model web search", async () => {
    const c = fakeClient(['{"candidates":[]}']);
    await proposeCandidates(c, input);
    expect(c.calls[0].tools).toEqual([{ type: "web_search_20260209", name: "web_search" }]);
  });

  it("names the current model and asks for adaptive thinking", async () => {
    const c = fakeClient(['{"candidates":[]}']);
    await proposeCandidates(c, input);
    expect(c.calls[0].model).toBe(MODEL);
    expect(MODEL).toBe("claude-opus-5");
    expect(c.calls[0].thinking).toEqual({ type: "adaptive" });
  });

  it("lists the shelf so the model does not propose what is already there", () => {
    expect(buildUserMessage(input)).toContain("The Appeal");
  });
});

describe("the system prompt", () => {
  /**
   * ⚠️ IT MUST NOT ASK THE MODEL NOT TO INVENT BOOKS AS ITS VERIFICATION STORY. That was the old
   * design ("Inventing a title, author or year is far worse…") and it cannot work: a careful model
   * and a hallucinating one produce identical output. The prompt states the consequence instead —
   * an unverifiable title is discarded downstream — and the CHECK lives in compCatalogue.
   */
  it("tells the model titles are checked downstream, and that unverifiable ones are discarded", () => {
    expect(SYSTEM_PROMPT).toMatch(/checked against a real book catalogue/i);
    expect(SYSTEM_PROMPT).toMatch(/discarded/i);
  });

  /** ⚠️ `why` AND `matchAxis` REPORT, THEY DO NOT APPRAISE (baked decision 17 + Amendment 3). */
  it("forbids appraisal in the model's own prose, by name", () => {
    expect(SYSTEM_PROMPT).toMatch(/Neither may appraise/i);
    for (const word of ["strong", "weak", "perfect", "ideal", "great fit", "best match"]) {
      expect(SYSTEM_PROMPT.toLowerCase()).toContain(word);
    }
  });

  it("states that order carries no meaning", () => {
    expect(SYSTEM_PROMPT).toMatch(/Order carries no meaning/i);
  });

  /** ⚠️ NO `facts` FIELD — a model-composed display string is the shape the trust rule stops. */
  it("asks for no composed display string", () => {
    expect(SYSTEM_PROMPT).not.toMatch(/"facts"/);
  });
});

describe("validateCandidates", () => {
  const body = (candidates: unknown[]) => ({ candidates });

  it("keeps well-formed candidates and defaults media to book", () => {
    const out = validateCandidates(
      body([{ title: "A", author: "B", why: "shares a register" }]),
      []
    );
    expect(out).toEqual([{ title: "A", author: "B", media: "book", why: "shares a register" }]);
  });

  it("drops items missing a title, author or why — one bad item is not fatal", () => {
    const out = validateCandidates(
      body([
        { title: "", author: "B", why: "w" },
        { title: "A", author: "", why: "w" },
        { title: "A", author: "B", why: "" },
        { title: "Keeper", author: "B", why: "w" },
      ]),
      []
    );
    expect(out.map((c) => c.title)).toEqual(["Keeper"]);
  });

  it("throws only when the envelope itself is wrong", () => {
    expect(() => validateCandidates({}, [])).toThrow(MalformedSuggestionsError);
    expect(() => validateCandidates({ candidates: "nope" }, [])).toThrow(MalformedSuggestionsError);
  });

  it("never returns a title already on the shelf, case-insensitively", () => {
    const out = validateCandidates(body([{ title: "the appeal", author: "B", why: "w" }]), ["The Appeal"]);
    expect(out).toEqual([]);
  });

  it("de-duplicates within one response and caps the list", () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ title: `T${i}`, author: "B", why: "w" }));
    expect(validateCandidates(body([...many, ...many]), [])).toHaveLength(MAX_SUGGESTIONS);
  });
});

describe("proposeCandidates", () => {
  it("retries once on unparseable output, then succeeds", async () => {
    const c = fakeClient(["not json at all", '{"candidates":[{"title":"A","author":"B","why":"w"}]}']);
    const out = await proposeCandidates(c, input);
    expect(out.map((x) => x.title)).toEqual(["A"]);
    expect(c.calls).toHaveLength(2);
  });

  it("gives up after the retry", async () => {
    const c = fakeClient(["nope", "still nope"]);
    await expect(proposeCandidates(c, input)).rejects.toBeInstanceOf(MalformedSuggestionsError);
  });

  /**
   * ⚠️ A REFUSAL IS NOT A PARSE FAILURE. This tier can decline outright, returning a successful
   * response with no usable content; retrying that with a "return valid JSON" nudge burns a second
   * call on a request that was never going to be answered.
   */
  it("surfaces a refusal without spending a retry", async () => {
    const c = fakeClient([""], ["refusal"]);
    await expect(proposeCandidates(c, input)).rejects.toBeInstanceOf(ScoutRefusedError);
    expect(c.calls).toHaveLength(1);
  });
});

describe("verifyCandidates — nothing reaches the client unchecked", () => {
  const NOW = () => new Date("2026-08-13T09:41:00.000Z");
  const cand = (over: Partial<Candidate> = {}): Candidate => ({
    title: "Piranesi", author: "Susanna Clarke", media: "book", why: "shares a form", ...over,
  });

  const volume = (over: Record<string, unknown> = {}) => ({
    items: [{
      id: "gb-1",
      volumeInfo: {
        title: "Piranesi", authors: ["Susanna Clarke"],
        publishedDate: "2020-09-15", publisher: "Bloomsbury", ...over,
      },
    }],
  });
  const fetchOk = (payload: unknown): FetchLike => async () => ({ ok: true, json: async () => payload });

  it("attaches the catalogue's record, and prefers the catalogue's facts to the model's", async () => {
    const out = await verifyCandidates(fetchOk(volume()), [cand({ title: "piranesi" })], NOW);
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe("Piranesi");
    expect(out[0].year).toBe(2020);
    expect(out[0].publisher).toBe("Bloomsbury");
    expect(out[0].verification).toEqual({
      catalogue: "Google Books",
      checkedAt: "2026-08-13T09:41:00.000Z",
      externalId: "gb-1",
    });
  });

  it("drops a candidate the catalogue does not have", async () => {
    expect(await verifyCandidates(fetchOk({ items: [] }), [cand()], NOW)).toEqual([]);
  });

  /** ⚠️ FAILING OPEN WOULD MAKE THE FOOTER'S CLAIM DEPEND ON GOOGLE'S UPTIME. */
  it("drops a candidate when the lookup fails", async () => {
    const boom: FetchLike = async () => { throw new Error("network"); };
    expect(await verifyCandidates(boom, [cand()], NOW)).toEqual([]);
    const notOk: FetchLike = async () => ({ ok: false, json: async () => ({}) });
    expect(await verifyCandidates(notOk, [cand()], NOW)).toEqual([]);
  });

  /** ⚠️ A BOOK CATALOGUE CANNOT CONFIRM A FILM, and there is no unverified path. */
  it("drops non-book media rather than waving it through", async () => {
    expect(await verifyCandidates(fetchOk(volume()), [cand({ media: "film" })], NOW)).toEqual([]);
  });

  /** ⚠️ THE YEAR IS THE CATALOGUE'S OR THERE IS NONE — an unchecked number inside a checked record. */
  it("drops a match that carries no publication year", async () => {
    const out = await verifyCandidates(fetchOk(volume({ publishedDate: undefined })), [cand()], NOW);
    expect(out).toEqual([]);
  });

  it("carries the model's why and matchAxis through untouched", async () => {
    const out = await verifyCandidates(
      fetchOk(volume()), [cand({ why: "found-document form", matchAxis: "form · voice" })], NOW
    );
    expect(out[0].why).toBe("found-document form");
    expect(out[0].matchAxis).toBe("form · voice");
  });
});
