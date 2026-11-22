/**
 * Add agent v1 Phase 4 — the save bar counts changes BY NAME (the rendered bar is AA10/AA11): two fields that are one
 * thing to the writer are one change ("how they take queries" is the method and its words alike).
 */
import { describe, expect, it } from "vitest";
import { changeNames, FIELD_NAME } from "./AgentCard262Edit";
import { TAB_FIELDS } from "../../../lib/cardDraft";

describe("the save bar's names", () => {
  it("names every field the editor edits", () => {
    for (const k of Object.values(TAB_FIELDS).flat()) expect(FIELD_NAME[k], String(k)).toBeTruthy();
  });
  it("counts the method and its words as one change", () => {
    expect(changeNames(["method", "methodOther"])).toEqual(["how they take queries"]);
    expect(changeNames(["agency", "agencyUnknown", "weeks"])).toEqual(["agency", "response time"]);
  });
});
