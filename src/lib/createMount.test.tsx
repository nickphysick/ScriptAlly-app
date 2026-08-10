/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE CREATE TAKEOVER RENDERS ON MOUNT — a REAL render, not a source-string check.
 *
 * ⚠️ THIS IS THE ONE THING THE OTHER TWENTY-ODD SUITES IN THIS AREA CANNOT DO. They read source,
 * so they prove the code was WRITTEN; they cannot prove it RAN. A module that throws on load, or a
 * `const` read before its declaration by a helper the render calls, renders nothing at all — and
 * every source-string assertion about it still passes, because the text is right there in the
 * file. That exact shape shipped a page that would not load through a fully green suite (CLAUDE.md,
 * "COMMENTS ARE NOT GUARDS" and the TDZ note beside it).
 *
 * It is deliberately thin. A mount test that pinned appearance would become the next false red;
 * what it is for is "it renders, and the first frame is the one we designed".
 */
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { QueryCreatePane } from "../components/queries/QueryCreatePane";
import { emptyDraft, materialRowsForDraft, HOUSE_NUDGE_WEEKS } from "./queryDraft";
import { SubmissionStatus, SubmissionMethod, type Agent, type Manuscript } from "../types";

const AGENT = {
  id: "a1", name: "Elinor Hale", agency: "Cavendish & Roe", email: "e@cr.co",
  dateAdded: "2026-05-02", submissionStatus: SubmissionStatus.OPEN,
  submissionMethod: SubmissionMethod.EMAIL, responseTimeWeeks: 8,
  materialsWanted: ["Query letter", "Synopsis", "Opening sample · 50 Pages"],
} as unknown as Agent;

const MS = [{ id: "m1", title: "Murphy's Day Out" }] as unknown as Manuscript[];
const noop = async () => ({ ok: true });

const render = (draft: ReturnType<typeof emptyDraft>, agents: Agent[] = [AGENT]) =>
  renderToStaticMarkup(
    <QueryCreatePane
      draft={draft}
      onChange={() => {}}
      agents={agents}
      manuscripts={MS}
      onCreateAgent={noop as never}
      queries={[]}
    />,
  );

describe("the create takeover renders its first frame without throwing", () => {
  it("stage 1 mounts: the picker, and no popup", () => {
    const html = render(emptyDraft({ manuscriptId: "m1" }));
    expect(html).toContain("Who are you querying?");
    expect(html, "the grid is the result set").toContain('role="listbox"');
    expect(html, "the retired overlay came back").not.toContain("sa-ag-menu");
  });

  /* ⚠️ THE POPULATED BRANCH TOO — mounting only the empty state leaves every agent-dependent
     derivation unexecuted, which is how the fault this guards against reached dev in the first
     place.

     ⚠️ AND NEITHER THE STEPPER NOR THE MATERIALS SUMMARY IS IN THE FIRST FRAME, correctly. Only
     the ACTIVE step's body is mounted and the stack opens on When, so the stepper is not rendered;
     and an UPCOMING row states its hint rather than a value, so What reads "Manuscript and
     materials" until it has been visited. The brief asked this test to assert both — asserting
     them would have been asserting a bug into place. What the mount proves is that the frame the
     writer actually sees renders, and that every derivation it does run, runs. */
  it("stage 2 mounts with its open step and derived nudge", () => {
    const draft = {
      ...emptyDraft({ agentId: "a1", manuscriptId: "m1" }),
      materials: materialRowsForDraft(AGENT),
    };
    const html = render(draft);
    expect(html, "the agent hero did not render").toContain("Elinor Hale");
    expect(html, "the derived nudge line did not render").toContain("A task appears on");
    expect(html, "the When step must be the one that is open").toContain("Date sent");
    expect(html, "How you sent it did not render").toContain("How you sent it");
    expect(html, "an upcoming row states its hint, not a value").toContain("Manuscript and materials");
    expect(draft.materials.some((r) => r.key === "queryLetter" && r.on),
      "the seeding itself must have happened, even though this frame does not show it").toBe(true);
  });

  /* The house default is what makes the first frame non-empty for an agent who states nothing —
     the case that used to resolve to no reminder at all. */
  it("and an agent with no stated turnaround still lands on a nudge", () => {
    const bare = { ...AGENT, responseTimeWeeks: undefined } as unknown as Agent;
    const draft = { ...emptyDraft({ agentId: "a1", manuscriptId: "m1" }), materials: materialRowsForDraft(bare) };
    const html = render(draft, [bare]);
    expect(html).toContain("A task appears on");
    expect(html).toContain("a default, as no response time is listed for them");
    expect(HOUSE_NUDGE_WEEKS).toBe(8);
  });
});
