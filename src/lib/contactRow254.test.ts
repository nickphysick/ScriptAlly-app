import { describe, expect, it } from "vitest";
import { QueryStatus } from "../types";
import { profileLink, queryLine, queryLineText } from "./contactRow254";

describe("Contact list v25.4 — the row's words", () => {
  it("Queried alone while the latest stage is Queried; otherwise the app's own stage name after the dot", () => {
    expect(queryLine(QueryStatus.QUERIED)).toEqual({ head: "Queried", stage: null });
    expect(queryLineText(QueryStatus.QUERIED)).toBe("Queried");
    expect(queryLineText(QueryStatus.PARTIAL_REQUESTED)).toBe("Queried · Partial requested");
    expect(queryLineText(QueryStatus.FULL_SENT)).toBe("Queried · Full sent");
    expect(queryLineText(QueryStatus.OFFER)).toBe("Queried · Offer");
    expect(queryLineText(QueryStatus.REJECTED)).toBe("Queried · Passed");
  });
  it("every QueryStatus has words", () => {
    for (const s of Object.values(QueryStatus)) expect(queryLineText(s as QueryStatus)).toMatch(/^Queried( · \S.*)?$/);
  });
  it("the link only for an agent with no genres; it spans Replies in when there is no reply time", () => {
    expect(profileLink({ name: "Clara Moss", agency: "Moss", genres: ["Fantasy"], responseTimeWeeks: 0 })).toBeNull();
    expect(profileLink({ name: "Clara Moss", agency: "Moss", genres: [], responseTimeWeeks: 6 })).toEqual({ words: "Fill in Clara’s profile →", span2: false });
    expect(profileLink({ name: "Clara Moss", agency: "Moss", genres: [] })).toEqual({ words: "Fill in Clara’s profile →", span2: true });
    expect(profileLink({ name: "", agency: "Penhallow Literary", genres: [" "] })?.words).toBe("Fill in this profile →");
  });
});
