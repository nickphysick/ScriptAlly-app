/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * FV2-B — Dashboard first visit v2, Part B: the set-up card starts from the sign-up answer. The write through the app
 * (Change it → "still writing or revising" sets DRAFTING, re-read from Firestore) is FV2 B1, on the running page.
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../../lib/db", async () => (await import("../../../test/pageSmoke")).dbMock());
vi.mock("../../../lib/firebase", async () => (await import("../../../test/pageSmoke")).firebaseMock());

import { Dash58 } from "../v58/Dash58";
import { SetUpCard, SETUP_CHOICES } from "../fv1/SetUpCard";
import { ManuscriptStatus, type Agent, type Manuscript, type User } from "../../../types";
import { answerFor, answerWrite, pathAfter, type StartPath } from "../../../lib/dashFirstVisit";

const noop = () => {};
const card = (path: StartPath | null, agents = 0) => renderToStaticMarkup(
  <SetUpCard loading={false} title="Murphy's Day Out" path={path} onChoose={noop} agents={agents} onImport={noop} onLog={noop} onAddAgent={noop} onDiscover={noop} onComps={noop} />,
);

describe("FV2-B · the answer is read from sign-up", () => {
  it("the stage first, then the readiness, then 'starting', then first visit v1's stored answer; nothing said → null", () => {
    expect(answerFor({ stage: "deep", status: ManuscriptStatus.DRAFTING, legacy: null })).toBe("querying");
    expect(answerFor({ stage: "starting", status: ManuscriptStatus.DRAFTING, legacy: null })).toBe("writing");
    expect(answerFor({ stage: "starting", status: ManuscriptStatus.REVISING, legacy: null })).toBe("revising");
    expect(answerFor({ stage: "starting", status: ManuscriptStatus.READY_TO_QUERY, legacy: "yes" })).toBe("ready");
    expect(answerFor({ stage: undefined, status: ManuscriptStatus.READY_TO_QUERY, legacy: "yes" })).toBe("querying");
    expect(answerFor({ stage: undefined, status: ManuscriptStatus.READY_TO_QUERY, legacy: null })).toBe(null);
  });
  it("changing it writes the fields sign-up wrote", () => {
    expect(answerWrite("writing", "starting", ManuscriptStatus.READY_TO_QUERY)).toEqual({ queryingStage: "starting", status: ManuscriptStatus.DRAFTING });
    expect(answerWrite("writing", "starting", ManuscriptStatus.REVISING)).toEqual({ queryingStage: "starting", status: null });
    expect(answerWrite("ready", "early", ManuscriptStatus.DRAFTING)).toEqual({ queryingStage: "starting", status: ManuscriptStatus.READY_TO_QUERY });
    expect(answerWrite("querying", "interest", ManuscriptStatus.READY_TO_QUERY)).toEqual({ queryingStage: "interest", status: null });
    expect(answerWrite("querying", "starting", ManuscriptStatus.DRAFTING)).toEqual({ queryingStage: "early", status: ManuscriptStatus.READY_TO_QUERY });
    expect(pathAfter("writing", ManuscriptStatus.REVISING)).toBe("revising");
  });
});

describe("FV2-B · the card", () => {
  it("states each answer as a sentence, with Not right? Change it", () => {
    expect(card("querying")).toContain("You said you&#x27;ve already sent some queries for <em>Murphy&#x27;s Day Out</em>.");
    expect(card("ready")).toContain("You said <em>Murphy&#x27;s Day Out</em> is ready, and you haven&#x27;t sent any queries yet.");
    expect(card("writing")).toContain("You said <em>Murphy&#x27;s Day Out</em> is still being written.");
    expect(card("revising")).toContain("You said <em>Murphy&#x27;s Day Out</em> is in revision.");
    for (const p of ["querying", "ready", "writing", "revising"] as const) expect(card(p)).toContain(">Not right? Change it<");
    expect(card("querying")).not.toContain('role="radiogroup"');
  });
  it("draws each path's heading, text and actions", () => {
    expect(card("querying")).toContain(">Bring your tracker across<");
    expect(card("ready")).toContain(">Start your contact list<");
    expect(card("writing")).toContain(">Get ahead while you write<");
    expect(card("revising")).toContain(">Get ahead while you revise<");
    expect(card("writing")).toContain("Pick three comparable titles, start a shortlist of agents who&#x27;d suit the book, and draft your query letter. Querying can wait until the book&#x27;s ready.");
    expect(card("writing")).toContain('data-fv1="go-comps"');
  });
  it("one agent, no query: the answer line is hidden and the path says so", () => {
    const html = card("ready", 1);
    expect(html).toContain(">You have 1 agent on file<");
    expect(html).not.toContain('data-fv1="answer"');
  });
  it("nothing said: the question, the three answers, and no Done", () => {
    const html = card(null);
    expect(html).toContain("Where are you with <em>Murphy&#x27;s Day Out</em>?");
    expect(SETUP_CHOICES.map((c) => [c.label, c.sub])).toEqual([
      ["I'm already querying", "Bring what you've sent so far"],
      ["It's ready, I haven't started", "Start with the agents you'd like to query"],
      ["I'm still writing or revising", "Get things ready for when it's done"],
    ]);
    expect(html).not.toContain('data-fv1="change-done"');
    expect(html).not.toContain("You said");
  });
});

describe("FV2-B · the page reads the account's answer", () => {
  const ms = { id: "ms-1", title: "The Lantern Keepers", status: ManuscriptStatus.READY_TO_QUERY } as unknown as Manuscript;
  const page = (stage: string, agents: Agent[] = []) => renderToStaticMarkup(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Dash58 loading={false} queries={[]} agents={agents} manuscripts={[ms]} tasks={[]} userTasks={[]} activities={[]} taskFlags={[]}
        currentUser={{ id: "u1", name: "Audit S1", queryingStage: stage } as unknown as User} activeManuscript={ms} onNavigate={noop} now={new Date(2026, 9, 29, 12)} />
    </MemoryRouter>,
  );
  it("ready, not querying, from the stage 'starting'", () => {
    expect(page("starting")).toContain('data-fv1="path-ready"');
    expect(page("starting")).toContain("is ready, and you haven&#x27;t sent any queries yet.");
  });
  it("already querying, from the stage 'early'", () => expect(page("early")).toContain('data-fv1="path-querying"'));
});
