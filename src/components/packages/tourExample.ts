/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Package Workshop guided tour — the 4 verbatim steps (ref design-refs/scriptally-workshop-firstrun.html)
 * plus the PURE example-data fixture the workshop renders WHILE the tour runs so every region has
 * something to spotlight. The fixture is display-only: it is NEVER written to Firestore, never persisted
 * and needs no cleanup — the host simply stops passing it when the tour ends.
 *
 * Queries/Agents are minimal stubs (the analytics engine reads only packageId/status and name/agency);
 * the `as unknown as` casts are deliberate for these throwaway display objects.
 */
import { ManuscriptVersion, SubmissionPackage, Query, Agent, ComponentType, QueryStatus } from "../../types";
import { TourStep } from "../Tour";

const MS = "ex-ms";
const UID = "ex-user";
const ISO = "2026-01-01T00:00:00.000Z";

const v = (id: string, componentType: ComponentType, versionName: string, fileName: string): ManuscriptVersion => ({
  id, manuscriptId: MS, userId: UID, componentType, versionName, fileAttached: true, fileName, createdDate: ISO, contentType: "text",
});

export const EXAMPLE_VERSIONS: ManuscriptVersion[] = [
  v("ex-ql-char", ComponentType.QUERY_LETTER, "Character-led letter", "MDO_Query_character.docx"),
  v("ex-ql-comp", ComponentType.QUERY_LETTER, "Comp-led rework", "MDO_Query_compled.docx"),
  v("ex-syn", ComponentType.SYNOPSIS, "One-page synopsis", "MDO_Synopsis.docx"),
  v("ex-pg", ComponentType.SAMPLE_PAGES, "Chapters 1–3", "MDO_Pages_1-3.docx"),
];

export const EXAMPLE_PACKAGES: SubmissionPackage[] = [
  { id: "ex-pkg", manuscriptId: MS, userId: UID, packageName: "Character-led · v2", queryLetterVersionId: "ex-ql-char", synopsisVersionId: "ex-syn", samplePagesVersionId: "ex-pg", status: "Active", createdDate: ISO },
];

export const EXAMPLE_AGENTS: Agent[] = [
  { id: "ex-a1", name: "Hartley Books", agency: "Hartley Literary" } as unknown as Agent,
  { id: "ex-a2", name: "Vane & Co", agency: "Vane & Co" } as unknown as Agent,
  { id: "ex-a3", name: "Marsh Literary", agency: "Marsh Literary" } as unknown as Agent,
  { id: "ex-a4", name: "Ash & Quill", agency: "Ash & Quill" } as unknown as Agent,
];

// Four sends of the example package; the first won a full request (ref: "four agents — and one asked
// for the full manuscript"). The rest are rejected so the panel reads "1 full request from 4 sent".
export const EXAMPLE_QUERIES: Query[] = EXAMPLE_AGENTS.map((a, i) => ({
  id: `ex-q${i}`, manuscriptId: MS, packageId: "ex-pkg", agentId: a.id,
  status: i === 0 ? QueryStatus.FULL_REQUESTED : QueryStatus.REJECTED,
} as unknown as Query));

/** The workshop walkthrough — 4 steps, verbatim from the ref, mapped to the workshop's target ids. */
export const WORKSHOP_TOUR_STEPS: TourStep[] = [
  { targetId: "tgt-palette", title: "Your materials", body: "The pieces of your submission live here — <b>letters, synopses and sample pages</b>. We’ve filled it with an example library so you can see how yours will look: every piece is a draggable card." },
  { targetId: "tgt-bench", title: "The active package", body: "A package is one version of your submission. This example — <b>Character-led · v2</b> — was built by dragging three materials into these slots. The letter’s the only must-have. Name it, hit Save." },
  { targetId: "tgt-analytics", title: "See what wins", body: "This example went to <b>four agents — and one asked for the full manuscript</b>. Attach your packages to queries in the Queries Hub and this panel tracks exactly that: which version wins requests." },
  { targetId: "tgt-editmat", title: "Start here", body: "That’s the loop: write → build → send → see what wins. The example data clears now — <b>Add materials</b> is where your real story starts." },
];
