import { describe, expect, it } from "vitest";
import { doorWords, howWords, replyWords } from "./agentsPhone";
import { DOOR_NOT_KNOWN } from "./agentList";
import { SubmissionMethod, SubmissionStatus } from "../types";

describe("the phone Agents tab's words", () => {
  it("names each submission method, and nothing for one the record does not hold", () => {
    expect(howWords(SubmissionMethod.EMAIL)).toBe("By email");
    expect(howWords(SubmissionMethod.ONLINE_FORM)).toBe("Online form");
    expect(howWords(SubmissionMethod.QUERY_MANAGER)).toBe("QueryManager");
    expect(howWords(undefined)).toBeNull();
    expect(howWords("")).toBeNull();
  });
  it("states a reply time as weeks, and leaves out the quick-add stub and an absent one", () => {
    expect(replyWords(6)).toBe("6 weeks");
    expect(replyWords(1)).toBe("1 week");
    expect(replyWords(0)).toBeNull();
    expect(replyWords(undefined)).toBeNull();
  });
  it("never calls a door nobody stated open", () => {
    expect(doorWords({ submissionStatus: SubmissionStatus.OPEN })).toBe("Open to submissions");
    expect(doorWords({ submissionStatus: SubmissionStatus.CLOSED })).toBe("Closed to submissions");
    expect(doorWords({ submissionStatus: undefined as never })).toBe(DOOR_NOT_KNOWN);
  });
});
