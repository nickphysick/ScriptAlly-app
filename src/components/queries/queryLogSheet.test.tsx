/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Log-sheet run · §2 — the four steps' laws, at the level each can honestly be asserted:
 * the unit physics and the override are PURE (createQty / queryDraft); the pinned summaries are
 * RENDERED from the draft; the new-agent write is a SOURCE claim about the one call.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { QueryLogSheet } from "./QueryLogSheet";
import { emptyDraft, draftExpectedOverrideIso, type QueryDraft } from "../../lib/queryDraft";
import { CREATE_QTY, floorCopy } from "../../lib/createQty";
import { snapToUnit } from "../../lib/agentMaterials";
import { cardFacts } from "../../lib/queryCardFacts";
import { QueryStatus, SubmissionMethod, SubmissionStatus } from "../../types";

const agent = {
  id: "a1", userId: "u", name: "Priya Raman", agency: "Raman Literary", email: "", website: "",
  genres: [], mswlNotes: "", submissionStatus: SubmissionStatus.OPEN,
  submissionMethod: SubmissionMethod.EMAIL, responseTimeWeeks: 6,
  materialsWanted: ["Query letter"], dateAdded: "2026-01-01", lastCheckedDate: "2026-01-01", notes: "",
} as never;
const ms = { id: "m1", title: "Murphy's Day Out", genre: "Thriller", wordCount: 50000 } as never;

const draftAt = (over: Partial<QueryDraft> = {}): QueryDraft =>
  ({ ...emptyDraft({ agentId: "a1", manuscriptId: "m1" }), dateSent: "2026-09-04", ...over });

const draw = (draft: QueryDraft, step: 1 | 2 | 3 | 4) =>
  renderToStaticMarkup(
    React.createElement(QueryLogSheet, {
      draft, onDraft: () => {}, step, onStep: () => {},
      agents: [agent], queries: [], manuscripts: [ms], packages: [],
      onAddAgent: async () => null, qtyError: null, onQtyError: () => {},
    }),
  );

describe("§2 · the unit physics are the ref's, from the one table", () => {
  it("Words snaps to 5,000 on unit change and the floor speaks its own words", () => {
    expect(snapToUnit("Words")).toBe("5000");
    expect(CREATE_QTY.Words).toMatchObject({ step: 500, min: 500 });
    expect(floorCopy("Words")).toBe("At least 500 words");
    expect(CREATE_QTY.Chapters).toMatchObject({ step: 1, min: 1 });
    expect(CREATE_QTY.Pages).toMatchObject({ step: 5, min: 1 });
    /* and the sheet routes a below-floor typed value through that copy, gated on Save */
    const src = readFileSync(join(process.cwd(), "src/components/queries/QueryLogSheet.tsx"), "utf8");
    expect(src).toContain("onQtyError(Number.isFinite(n) && n < CREATE_QTY[sm.unit].min ? floorCopy(sm.unit) : null)");
    const page = readFileSync(join(process.cwd(), "src/components/Queries.tsx"), "utf8");
    expect(page, "Save ignores the floor's complaint").toContain("&& !createQtyError");
  });
});

describe("§2 · the nudge choice IS the expected line — one derivation, ghost and save", () => {
  it("keeping the agent's window writes NO override; choosing otherwise writes the choice", () => {
    expect(draftExpectedOverrideIso(draftAt({ reminder: { kind: "preset", weeks: 6 } }), agent)).toBeNull();
    const eight = draftExpectedOverrideIso(draftAt({ reminder: { kind: "preset", weeks: 8 } }), agent);
    expect(eight?.slice(0, 10)).toBe("2026-10-30");
    const custom = draftExpectedOverrideIso(draftAt({ reminder: { kind: "custom", date: "2026-11-02" } }), agent);
    expect(custom?.slice(0, 10)).toBe("2026-11-02");
    expect(draftExpectedOverrideIso(draftAt({ reminder: { kind: "none" } }), agent)).toBeNull();
    /* a windowless agent: ANY preset is the writer's choice, not the agency's */
    const bare = { ...(agent as Record<string, unknown>), responseTimeWeeks: undefined } as never;
    expect(draftExpectedOverrideIso(draftAt({ reminder: { kind: "preset", weeks: 6 } }), bare)?.slice(0, 10)).toBe("2026-10-16");
  });

  it("the override reaches cardFacts as the expected reply — the seam the ghost renders", () => {
    const iso = draftExpectedOverrideIso(draftAt({ reminder: { kind: "custom", date: "2026-11-02" } }), agent)!;
    const facts = cardFacts(
      { id: "g", status: QueryStatus.QUERIED, dateSent: "2026-09-04T12:00:00.000Z", writerExpectedDate: iso } as never,
      new Date("2026-09-06"), { agencyWeeks: 6 },
    );
    expect(facts.expectedReply?.toISOString().slice(0, 10)).toBe("2026-11-02");
    /* and the page wires exactly this: the stub carries the override, from the one derivation */
    const page = readFileSync(join(process.cwd(), "src/components/Queries.tsx"), "utf8");
    expect(page).toContain("const overrideIso = draftExpectedOverrideIso(createDraft, agent ?? null)");
    expect(page).toContain("...(overrideIso ? { writerExpectedDate: overrideIso } : {})");
  });
});

describe("§2 · the new agent is ONE minimal write", () => {
  it("the page's onAddAgent calls addAgent once, with the sub-card's four facts", () => {
    const page = readFileSync(join(process.cwd(), "src/components/Queries.tsx"), "utf8");
    const at = page.indexOf("onAddAgent={async (a) => {");
    expect(at, "the sheet's add-agent seam is missing").toBeGreaterThan(-1);
    const block = page.slice(at, page.indexOf("onOpenQuery=", at));
    expect((block.match(/await addAgent\(/g) ?? []).length).toBe(1);
    for (const field of ["name: a.name.trim()", "agency: a.agency.trim()", "email: a.email.trim()", "submissionMethod: a.submissionMethod"]) {
      expect(block, `${field} missing from the minimal write`).toContain(field);
    }
    /* the optional window is OMITTED when unstated — absence is an origin state, never 0 */
    expect(block).toContain("...(a.responseTimeWeeks != null ? { responseTimeWeeks: a.responseTimeWeeks } : {})");
  });
});

describe("§2 · pinned rows derive their summaries at render", () => {
  it("the When row restates the draft after a Back edit — nothing is stored at pin time", () => {
    const a = draw(draftAt({ dateSent: "2026-09-04" }), 3);
    const b = draw(draftAt({ dateSent: "2026-08-11" }), 3);
    expect(a).toContain("4 Sept");
    expect(b).toContain("11 Aug");
    expect(a).not.toContain("11 Aug");
    /* the What row names the manuscript and materials once completed */
    const c = draw(draftAt(), 4);
    expect(c).toContain("Murphy&#x27;s Day Out ·");
  });

  it("the window pill leads, pre-selected, sage-bordered — and absent without a window", () => {
    const withWin = draw(draftAt({ reminder: { kind: "preset", weeks: 6 } }), 2);
    expect(withWin).toMatch(/qls-chipb--win on/);
    expect(withWin).toContain("· their window");
    const bareAgent = { ...(agent as Record<string, unknown>), responseTimeWeeks: undefined } as never;
    const without = renderToStaticMarkup(
      React.createElement(QueryLogSheet, {
        draft: draftAt(), onDraft: () => {}, step: 2, onStep: () => {},
        agents: [bareAgent], queries: [], manuscripts: [ms], packages: [],
        onAddAgent: async () => null, qtyError: null, onQtyError: () => {},
      }),
    );
    expect(without, "a window pill rendered for an agent with no window").not.toContain("their window");
  });
});

/* ══ §3 — ghost and save ══════════════════════════════════════════════════════════════════════ */
describe("§3 · one activity per save, the override on the payload, the ghost never counted", () => {
  const page = readFileSync(join(process.cwd(), "src/components/Queries.tsx"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  it("saveCreate writes through the ONE primitive, exactly once", () => {
    const at = page.indexOf("const saveCreate = async");
    expect(at).toBeGreaterThan(-1);
    const body = page.slice(at, page.indexOf("const undoCreate", at));
    expect((body.match(/await addQuery\(/g) ?? []).length, "a second write path grew beside addQuery").toBe(1);
    expect(body).toContain("undo: () => undoCreate(newId, logAnother)");
  });

  it("the payload carries the writer-expected override from the one derivation", () => {
    const draft = readFileSync(join(process.cwd(), "src/lib/queryDraft.ts"), "utf8");
    expect(draft).toMatch(/const o = draftExpectedOverrideIso\(d, agent\);[\s\S]{0,120}writerExpectedDate: o/);
  });

  it("the saved card's expected date equals the chosen nudge date — both cases", () => {
    /* chosen ≠ window: the override carries it */
    const chosen = draftAt({ reminder: { kind: "custom", date: "2026-11-02" } });
    const iso = draftExpectedOverrideIso(chosen, agent)!;
    const factsChosen = cardFacts(
      { id: "s", status: QueryStatus.QUERIED, dateSent: "2026-09-04T12:00:00.000Z", writerExpectedDate: iso } as never,
      new Date("2026-09-06"), { agencyWeeks: 6 },
    );
    expect(factsChosen.expectedReply?.toISOString().slice(0, 10)).toBe("2026-11-02");
    /* window kept: NO override — the derived window lands on the same day the nudge does */
    const kept = draftAt({ reminder: { kind: "preset", weeks: 6 } });
    expect(draftExpectedOverrideIso(kept, agent)).toBeNull();
    const factsKept = cardFacts(
      { id: "s2", status: QueryStatus.QUERIED, dateSent: "2026-09-04T12:00:00.000Z" } as never,
      new Date("2026-09-06"), { agencyWeeks: 6 },
    );
    expect(factsKept.expectedReply?.toISOString().slice(0, 10)).toBe("2026-10-16");
  });

  it("the ghost hint renders the sub-card's typing, and a real agent silences it", () => {
    expect(page).toContain('name: agent ? agentPrimary(agent) : (createHint?.name.trim() || "New query")');
    expect(page).toContain("onGhostHint={setCreateHint}");
  });

  it("save lands on Tracking; save-and-log-another resets to a fresh step 1", () => {
    expect(page).toContain('sessionStorage.setItem("sa.qpnTab", "tracking")');
    const again = page.slice(page.indexOf("if (pendingSave.again)"), page.indexOf("setCreateDraft(null)", page.indexOf("if (pendingSave.again)")));
    expect(again).toContain("setCreateStep(1)");
    expect(again).toContain("setCreateHint(null)");
  });

  it("the saved card pulses once and the pulse honours reduced motion", () => {
    expect(page).toContain("freshId={landedId}");
    const css = readFileSync(join(process.cwd(), "src/components/queries/queryCard.css"), "utf8");
    expect(css).toMatch(/\.qcc--fresh \{ animation: qccFresh/);
    expect(css).toMatch(/prefers-reduced-motion[\s\S]{0,80}\.qcc--fresh \{ animation: none/);
  });
});
