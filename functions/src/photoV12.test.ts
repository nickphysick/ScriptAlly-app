/**
 * Smart Import from photos v1.2, decisions 2 and 3, on the function's side: a "?" after a name is the
 * writer's doubt, never the name; a key on the page gives a mark its meaning (markMeaning).
 * Locks PH12-1 (the trailing ?), PH12-2 (markMeaning), PH12-3 (the prompt says both).
 */
import { describe, it, expect } from "vitest";
import { assembleResult, unsureName } from "./assembleImport";
import { PHOTO_ADDENDUM, SYSTEM_PROMPT } from "./smartImportPrompt";

const PHOTOS = { photos: { pageCount: 1 } };
const read = (agents: unknown[], queries: unknown[]) => ({ agents, queries });

describe("PH12-1 a name with a trailing ? is never saved with it", () => {
  it("unsureName: ?, ??, (?) and spacing come off; a name without one is null", () => {
    expect(unsureName("Leo Fairbairn?")).toBe("Leo Fairbairn");
    expect(unsureName("Leo Fairbairn ?")).toBe("Leo Fairbairn");
    expect(unsureName("Leo Fairbairn??")).toBe("Leo Fairbairn");
    expect(unsureName("Leo Fairbairn (?)")).toBe("Leo Fairbairn");
    expect(unsureName("Leo Fairbairn")).toBeNull();
    expect(unsureName("?")).toBeNull();
    expect(unsureName(undefined)).toBeNull();
  });
  it("a photo read: the name without it, the one reading, and check-reading on the agent's queries", () => {
    const out = assembleResult(read(
      [{ ref: "a1", name: "Leo Fairbairn?", agency: "Lattice" }, { ref: "a2", name: "Mia Ward", agency: "Ward" }],
      [{ agentRef: "a1", status: "Queried", sentDateRaw: "3/9" }, { agentRef: "a2", status: "Queried", sentDateRaw: "4/9" }],
    ), PHOTOS);
    expect(out.agents[0].name).toBe("Leo Fairbairn");
    expect(out.agents[0].readings).toEqual(["Leo Fairbairn, Lattice"]);
    expect(out.queries[0].reasons).toContain("check-reading");
    expect(out.agents[1]).toEqual({ ref: "a2", name: "Mia Ward", agency: "Ward" });
    expect(out.queries[1].reasons).not.toContain("check-reading");
    expect(JSON.stringify(out)).not.toMatch(/Fairbairn\s*\(?\?/);
  });
  it("an agent with no agency reads as the name alone", () => {
    const out = assembleResult(read([{ ref: "a1", name: "Leo Fairbairn (?)" }], [{ agentRef: "a1", status: "Queried", sentDateRaw: "3/9" }]), PHOTOS);
    expect(out.agents[0].readings).toEqual(["Leo Fairbairn"]);
  });
});

describe("PH12-2 markMeaning is kept only beside a mark it explains", () => {
  const q = (extra: Record<string, unknown>) =>
    assembleResult(read([{ ref: "a1", name: "A", agency: "B" }], [{ agentRef: "a1", status: "Rejected", sentDateRaw: "3/9", ...extra }]), PHOTOS).queries[0];
  it("kept with markRaw and mark-unclear", () => {
    expect(q({ reasons: ["mark-unclear"], markRaw: "✗", markMeaning: "pass" }).markMeaning).toBe("pass");
  });
  it("dropped without a mark, without the reason, when overlong, and on a sheet read", () => {
    expect(q({ reasons: ["mark-unclear"], markMeaning: "pass" }).markMeaning).toBeUndefined();
    expect(q({ markRaw: "✗", markMeaning: "pass" }).markMeaning).toBeUndefined();
    expect(q({ reasons: ["mark-unclear"], markRaw: "✗", markMeaning: "x".repeat(41) }).markMeaning).toBeUndefined();
    const sheet = assembleResult(read([{ ref: "a1", name: "A", agency: "B" }], [{ agentRef: "a1", status: "Rejected", sentDateRaw: "3/9", reasons: ["mark-unclear"], markRaw: "✗", markMeaning: "pass" }]));
    expect(sheet.queries[0].markMeaning).toBeUndefined();
  });
});

describe("PH12-3 the photo addendum says both, and the sheet prompt says neither", () => {
  it("the ? rule and the key rule", () => {
    expect(PHOTO_ADDENDUM).toMatch(/a "\?" or "\(\?\)" touching the agent's NAME/);
    expect(PHOTO_ADDENDUM).toMatch(/flag "check-reading", and give that name as the only entry/);
    /* the narrowing the eval needed: a "?" ending a line is still a mark (v1.2's first wording lost
       half the mark-unclear recall to exactly this) */
    expect(PHOTO_ADDENDUM).toMatch(/A "\?" anywhere else — at the end of\s+the line[\s\S]*?"mark-unclear" with markRaw "\?"/);
    expect(PHOTO_ADDENDUM).toMatch(/KEYS — a page may carry a key or legend/);
    expect(PHOTO_ADDENDUM).toMatch(/✗ = pass\s+→ "Rejected"/);
    expect(PHOTO_ADDENDUM).toMatch(/"markMeaning" — what the page's own KEY says/);
    expect(SYSTEM_PROMPT).not.toMatch(/markMeaning/);
  });
});
