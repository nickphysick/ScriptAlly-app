/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CREATE MODE'S RENDERED FRAMES — a standing guard, not a style lock.
 *
 * Five states of the create takeover are rendered and compared byte-for-byte against a committed
 * fixture. It began as a one-off proof that extracting the step stack changed nothing; it is kept
 * because the same comparison is what catches the NEXT person changing create mode by accident
 * while working on the response journey, which now shares its chassis.
 *
 * ⚠️ THIS IS THE ONE THING THE SOURCE-STRING SUITES CANNOT DO. They read the file, so they prove
 * the code was WRITTEN; they cannot prove it RAN, and they cannot see a change that moves markup
 * between files. This renders.
 *
 * ⚠️ AND IT IS DELIBERATELY IN TENSION WITH "a smoke that pins appearance becomes the next false
 * red" (CLAUDE.md). The resolution is that this fixture is EXPECTED to change whenever create mode
 * genuinely changes — a diff here is a question, not a verdict. What it must never be is a
 * surprise. Regenerate deliberately, read the diff, and only then commit it:
 *
 *     SA_UPDATE_CREATE_FRAMES=1 npx vitest run src/lib/createFrames.test.tsx
 *
 * ⚠️ EVERY INPUT IS FIXED. No `Date.now()`, no randomness, no live data — the draft's date comes
 * from the fixture agents, not from today, or this would go red at midnight for nobody's benefit.
 */
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync, writeFileSync } from "fs";
import React from "react";
import { QueryCreatePane } from "../components/queries/QueryCreatePane";
import { emptyDraft, materialRowsForDraft } from "./queryDraft";
import { SubmissionStatus, SubmissionMethod, type Agent, type Manuscript } from "../types";

const FIXTURE = new URL("./createFrames.fixture.html", import.meta.url);

const AGENT = {
  id: "a1", name: "Elinor Hale", agency: "Cavendish & Roe", email: "e@cr.co",
  dateAdded: "2026-05-02", submissionStatus: SubmissionStatus.OPEN,
  submissionMethod: SubmissionMethod.EMAIL, responseTimeWeeks: 8,
  materialsWanted: ["Query letter", "Synopsis", "Opening sample · 50 Pages"],
} as unknown as Agent;
/** The agent who states no turnaround — the branch that resolves to the house default. */
const BARE = { ...AGENT, responseTimeWeeks: undefined } as unknown as Agent;
const AGENT2 = { ...AGENT, id: "a2", name: "Tom Ellery", agency: "Curtis Vane" } as unknown as Agent;
const MS = [{ id: "m1", title: "Murphy's Day Out" }] as unknown as Manuscript[];
const MS2 = [...MS, { id: "m2", title: "The Long Field" }] as unknown as Manuscript[];
const noop = async () => ({ ok: true });

const render = (draft: ReturnType<typeof emptyDraft>, agents: Agent[], ms: Manuscript[] = MS) =>
  renderToStaticMarkup(
    <QueryCreatePane draft={draft} onChange={() => {}} agents={agents} manuscripts={ms}
      onCreateAgent={noop as never} queries={[]} />,
  );

const seeded = (a: Agent) => ({
  ...emptyDraft({ agentId: a.id, manuscriptId: "m1" }),
  materials: materialRowsForDraft(a),
});

/* The five frames, chosen to reach every branch the stack renders: stage 1 with nothing and with
   contacts, stage 2 seeded, the no-stated-turnaround fallback, and the multi-manuscript picker. */
const frames = (): string => [
  "─── stage 1 · cold (no agents) ───",
  render(emptyDraft({ manuscriptId: "m1" }), []),
  "─── stage 1 · with agents ───",
  render(emptyDraft({ manuscriptId: "m1" }), [AGENT, AGENT2]),
  "─── stage 2 · seeded agent, When open ───",
  render(seeded(AGENT), [AGENT]),
  "─── stage 2 · agent with no stated turnaround ───",
  render(seeded(BARE), [BARE]),
  "─── stage 2 · several manuscripts ───",
  render(seeded(AGENT), [AGENT], MS2),
].join("\n\n");

describe("create mode renders the frames it is committed to", () => {
  it("every frame is byte-identical to the fixture", () => {
    const now = frames();
    if (process.env.SA_UPDATE_CREATE_FRAMES) {
      writeFileSync(FIXTURE, now, "utf8");
      return;
    }
    const golden = readFileSync(FIXTURE, "utf8");
    /* Length first: a byte count is a readable failure, where a 56kB string diff is not. */
    expect(now.length, "create mode's rendered output changed size — regenerate deliberately and read the diff")
      .toBe(golden.length);
    expect(now, "create mode's rendered output changed").toBe(golden);
  });

  /* A guard on the guard: a fixture that silently emptied would make the comparison above pass on
     nothing, which is the failure mode this repo has hit before with string slicing. */
  it("and the fixture is a real render rather than an empty file", () => {
    const golden = readFileSync(FIXTURE, "utf8");
    expect(golden.length, "the fixture is suspiciously small").toBeGreaterThan(10_000);
    expect(golden, "the stack did not render").toContain('class="qc-stack"');
    expect(golden, "stage 1 did not render").toContain("Who are you querying?");
    expect(golden, "stage 2 did not render").toContain("Elinor Hale");
  });
});
