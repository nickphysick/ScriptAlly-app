/**
 * Query Centre v154 — the Next box by state: waiting on the agent (the reply date, the window bar, the planned nudge
 * when there is one and nothing when there is not); overdue (words only, no bar, no button at rest); everything else
 * keeps the slip's own Next copy.
 */
import { describe, expect, it } from "vitest";
import { QueryStatus } from "../../../types";
import { card154, row154 } from "./qc154.fixture";

const DAY = 86_400_000;
const NOW = new Date(2026, 10, 8, 12).getTime();
const nextBox = (h: string) => h.match(/<div[^>]*data-k="next"[\s\S]*?<\/button><\/span><\/div>/)?.[0] ?? "";
/** the box at rest: the hover overlay taken out */
const atRest = (box: string) => box.replace(/<span class="qc154-act"[\s\S]*?<\/button><\/span>/, "");

describe("the v154 Next box", () => {
  it("overdue (Nudge due): Next · Response overdue · Send nudge now; no bar and no button at rest", () => {
    const r = row154(QueryStatus.QUERIED, "agent", { qs: "nudge", pastExpected: true, expectedMs: NOW - 23 * DAY });
    const box = nextBox(card154(r, { tone: "nudge", label: "Nudge", mode: "nudge" }));
    expect(box).toContain('data-state="over"');
    const rest = atRest(box);
    expect(rest).toContain(">Next<");
    expect(rest).toContain(">Response overdue<");
    expect(rest).toContain(">Send nudge now<");
    expect(rest).not.toContain("qc154-bar");
    expect(rest).not.toContain("<button");
    /* the nudge is the hover's alone */
    expect(box).toContain("Nudge →");
  });

  it("waiting, no reminder: Reply expected by · the date · the bar, and nothing under the bar", () => {
    const r = row154(QueryStatus.QUERIED, "agent", { qs: "agent", expectedMs: NOW + 10 * DAY, stageStartMs: NOW - 30 * DAY });
    const rest = atRest(nextBox(card154(r)));
    expect(rest).toContain('data-state="wait"');
    expect(rest).toContain(">Reply expected by<");
    expect(rest).toContain(">18 Nov<");
    expect(rest).toMatch(/<u class="qc154-bar"[^>]*><i style="width:75%"><\/i><\/u><\/div>$/);
    expect(rest).not.toMatch(/counts as a pass|Nudge reminder|Nudge on/i);
    expect(rest).not.toContain("<button");
  });

  it("waiting, a nudge planned: one line under the bar, the bell and Nudge on [date]", () => {
    const r = row154(QueryStatus.QUERIED, "agent", { qs: "agent", expectedMs: NOW + 10 * DAY, stageStartMs: NOW - 30 * DAY,
      query: { id: "q1", nudgeDate: new Date(NOW + 17 * DAY).toISOString() } });
    const rest = atRest(nextBox(card154(r)));
    expect(rest).toMatch(/<\/u><em class="qc154-nl"[^>]*><svg[\s\S]*?<\/svg>Nudge on 25 Nov<\/em><\/div>$/);
  });

  it("a nudge date already gone is not a plan: nothing under the bar", () => {
    const r = row154(QueryStatus.QUERIED, "agent", { qs: "agent", expectedMs: NOW + 10 * DAY, stageStartMs: NOW - 30 * DAY,
      query: { id: "q1", nudgeDate: new Date(NOW - 2 * DAY).toISOString() } });
    expect(atRest(nextBox(card154(r)))).not.toContain("Nudge on");
  });

  it("every other state keeps the slip's Next copy", () => {
    const r = row154(QueryStatus.PARTIAL_REQUESTED, "you", { qs: "materials" });
    const rest = atRest(nextBox(card154(r, { tone: "navy", label: "Send your partial", mode: "sent" })));
    expect(rest).toContain('data-state="other"');
    expect(rest).toContain(">Next<");
    expect(rest).toContain("asked 20 days ago");
    expect(rest).not.toContain("qc154-bar");
  });
});
