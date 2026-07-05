import { describe, it, expect } from "vitest";
import { resolveInitialManuscriptId } from "./logQuerySeed";

const pickable = [{ id: "ms-1" }, { id: "ms-2" }, { id: "ms-3" }];

describe("resolveInitialManuscriptId", () => {
  it("preselects the requested manuscript when it is pickable (happy path)", () => {
    expect(resolveInitialManuscriptId("ms-2", pickable)).toBe("ms-2");
  });

  it("falls back silently to the first pickable when the id is not in the picker (e.g. overlay-shelved)", () => {
    expect(resolveInitialManuscriptId("ms-shelved", pickable)).toBe("ms-1");
  });

  it("matches today's default exactly when no id is passed (absent-prop behaviour unchanged)", () => {
    const legacyDefault = pickable.length > 0 ? pickable[0].id : "";
    expect(resolveInitialManuscriptId(undefined, pickable)).toBe(legacyDefault);
    expect(resolveInitialManuscriptId("", pickable)).toBe(legacyDefault);
  });

  it("returns '' with an empty library, seeded or not", () => {
    expect(resolveInitialManuscriptId(undefined, [])).toBe("");
    expect(resolveInitialManuscriptId("ms-1", [])).toBe("");
  });
});
