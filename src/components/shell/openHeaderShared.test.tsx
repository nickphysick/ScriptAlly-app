/**
 * Your notes v1 — THE EXTRACTION CHANGED NOTHING ON THE QUERY CENTRE. Its header and ring now render through the shared
 * `shell/OpenHeader` and `shell/OpenRing`; this holds their markup, in nine states, byte-identical to a capture taken
 * from the components BEFORE the extraction (`__fixtures__/openHeaderShared.fixture.json`, committed with this lock).
 * Identical markup over unchanged CSS is identical rendering.
 */
import { describe, expect, it } from "vitest";
import fixture from "./__fixtures__/openHeaderShared.fixture.json";
import { captureQcHeaderStates } from "./openHeaderCapture";

describe("the Query Centre's header and ring, after the extraction", () => {
  const now = captureQcHeaderStates();
  it("captures the same nine states", () => { expect(Object.keys(now).sort()).toEqual(Object.keys(fixture).sort()); });
  for (const k of Object.keys(fixture)) {
    it(`${k} is byte-identical`, () => { expect(now[k]).toBe((fixture as Record<string, string>)[k]); });
  }
});
