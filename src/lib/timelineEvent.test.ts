/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * F1 (holding-reply pack) — an activity type this build cannot place is INVISIBLE, NOT WRONG.
 *
 * ⚠️ THE MODULE HAD NO TESTS AT ALL, which is why the fault survived: `getTimelineFamily`'s final
 * `default: return "outgoing"` was reached by anything unplaceable, and "outgoing" is a claim about
 * DIRECTION — that the writer sent it. The holding reply is the case that makes it bite: a client
 * running today's bundle, reading a record a newer bundle wrote, would file an incoming event as
 * something the writer did.
 *
 * ⚠️ THE INPUTS HERE ARE ONES THE SYSTEM REALLY PRODUCES. An unknown `activityType` is not a
 * hypothetical or a hand-made edge case: it is exactly what an older client reads out of Firestore
 * after a newer one has written a type it has never heard of, which is the ordinary state of a
 * rolling deploy. The cast is on the TYPE, not on the shape — the document is a real document.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { getTimelineFamily, isFeedDrawable, isHousekeeping } from "./timelineEvent";
import { ActivityType, QueryStatus } from "../types";

/** A row as it arrives from the store — `activityType` is whatever string the writer put there. */
const act = (over: Partial<{ activityType: string; description: string; resultingStatus: QueryStatus }> = {}) =>
  ({ description: "", ...over }) as never;

afterEach(() => vi.restoreAllMocks());

describe("F1 · a type this build does not know", () => {
  it("resolves to `unknown` rather than claiming a direction", () => {
    /* the real shape: a future ActivityType member, read by a client that predates it */
    expect(getTimelineFamily(act({ activityType: "Holding Reply", description: "Aisha replied" }))).toBe("unknown");
    expect(getTimelineFamily(act({ activityType: "Something Nobody Has Written Yet" }))).toBe("unknown");
  });

  it("is cut from the story feed — drawn as nothing beats drawn as a guess", () => {
    expect(isFeedDrawable(act({ activityType: "Holding Reply" }))).toBe(false);
    /* ⚠️ AND IT IS NOT HOUSEKEEPING. Two reasons to cut a row, kept separable: the day the feed
       learns this type it stops being cut, and housekeeping never does. */
    expect(isHousekeeping(act({ activityType: "Holding Reply" }))).toBe(false);
  });

  it("says so once per unrecognised value, not once per row", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    /* a value used by no other test in this file, so the module-level dedupe set is clean for it */
    for (let i = 0; i < 5; i++) getTimelineFamily(act({ activityType: "Type Seen Five Times" }));
    expect(warn, "a feed of 200 such rows would write 200 identical lines").toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain("Type Seen Five Times");
  });

  /**
   * ⚠️ THE DISCRIMINATOR IS THE TYPE, NOT THE DESCRIPTION — and getting this wrong would HIDE REAL
   * HISTORY. A legacy `Status Changed` whose prose matches none of the substrings is a known type
   * with an uncategorised description; it has always read neutral and it still does.
   */
  it("a known type with uncategorised prose is untouched — still drawn, still neutral", () => {
    const legacy = act({ activityType: ActivityType.STATUS_CHANGED, description: "something nobody wrote a rule for" });
    expect(getTimelineFamily(legacy)).toBe("outgoing");
    expect(isFeedDrawable(legacy), "legacy history was hidden by the guard").toBe(true);
  });

  /**
   * ⚠️ A ROW THIS BUILD CAN PLACE BY STATUS IS PLACEABLE WHATEVER ITS TYPE SAYS. The stamped
   * `resultingStatus` is the authority everywhere else in this app; letting an unknown type
   * override it would throw away the one signal that is already validated.
   */
  it("an unknown type carrying a known status is still placed by the status", () => {
    expect(getTimelineFamily(act({ activityType: "Some New Type", resultingStatus: QueryStatus.FULL_REQUESTED }))).toBe("incoming");
    expect(getTimelineFamily(act({ activityType: "Some New Type", resultingStatus: QueryStatus.REJECTED }))).toBe("closed");
  });

  it("every known family still resolves as it did", () => {
    expect(getTimelineFamily(act({ activityType: ActivityType.NUDGE_SENT }))).toBe("nudge");
    expect(getTimelineFamily(act({ activityType: ActivityType.AGENT_UPDATED }))).toBe("housekeeping");
    expect(getTimelineFamily(act({ resultingStatus: QueryStatus.OFFER }))).toBe("offer");
    expect(getTimelineFamily(act({ resultingStatus: QueryStatus.PARTIAL_SENT }))).toBe("outgoing");
    /* no type at all — a pre-migration row; the desc fallback is untouched */
    expect(getTimelineFamily(act({ description: "Query sent to Aisha" }))).toBe("outgoing");
    expect(getTimelineFamily(act({ description: "Rejection received from Aisha" }))).toBe("closed");
  });
});
