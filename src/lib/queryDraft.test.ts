import { describe, it, expect } from "vitest";
import {
  HOUSE_NUDGE_WEEKS,
  initialReminder,
  nudgeDerivedLine,
  emptyDraft,
  draftReady,
  draftDirty,
  suggestedReminderDate,
  reminderChipLabel,
  resolveReminder,
  draftMaterialsToQuery,
  draftToPayload,
  CREATE_SEND_METHODS,
  type QueryDraft,
} from "./queryDraft";
import { SubmissionMethod, type Agent } from "../types";
import type { MaterialRow } from "./agentMaterials";

const NOW = new Date("2026-07-29T09:00:00.000Z").getTime();
const agent = (over: Partial<Agent> = {}): Agent =>
  ({ id: "a1", name: "Aisha Kapoor", agency: "The Lantern Agency", responseTimeWeeks: 6, ...over }) as Agent;

describe("emptyDraft — the create-mode starting point", () => {
  it("defaults the date to today and the method to Email; nothing else is assumed", () => {
    const d = emptyDraft({}, NOW);
    expect(d.dateSent).toBe("2026-07-29");
    expect(d.sendMethod).toBe(SubmissionMethod.EMAIL);
    expect(d.agentId).toBeNull();
    expect(d.manuscriptId).toBe("");
    expect(d.journal).toBe("");
    /* `seeded` is part of the starting value: nothing has been chosen yet, which is exactly what
       the provenance line needs to know before it explains where a default came from. */
    expect(d.reminder).toEqual({ kind: "preset", weeks: HOUSE_NUDGE_WEEKS, seeded: true });
  });

  it("carries the seeds the launch points pass (agent card / manuscript plate)", () => {
    const d = emptyDraft({ agentId: "a1", manuscriptId: "m1" }, NOW);
    expect(d.agentId).toBe("a1");
    expect(d.manuscriptId).toBe("m1");
  });
});

describe("draftReady — Save is offered only with an agent, a manuscript and a date", () => {
  const full = { ...emptyDraft({}, NOW), agentId: "a1", manuscriptId: "m1" };
  it("all three present → ready", () => expect(draftReady(full)).toBe(true));
  it("no agent → not ready", () => expect(draftReady({ ...full, agentId: null })).toBe(false));
  it("no manuscript → not ready", () => expect(draftReady({ ...full, manuscriptId: "" })).toBe(false));
  it("no date → not ready", () => expect(draftReady({ ...full, dateSent: "" })).toBe(false));
});

describe("draftDirty — defaults are NOT work (untouched discards silently)", () => {
  const base = emptyDraft({}, NOW);
  it("an untouched draft is clean", () => expect(draftDirty(base, base)).toBe(false));
  it("a SEEDED agent is part of the baseline, not a change", () => {
    const seeded = emptyDraft({ agentId: "a1" }, NOW);
    expect(draftDirty(seeded, seeded)).toBe(false);
  });
  it("picking an agent, a manuscript, a method or a date marks it dirty", () => {
    expect(draftDirty({ ...base, agentId: "a1" }, base)).toBe(true);
    expect(draftDirty({ ...base, manuscriptId: "m1" }, base)).toBe(true);
    expect(draftDirty({ ...base, sendMethod: SubmissionMethod.POST }, base)).toBe(true);
    expect(draftDirty({ ...base, dateSent: "2026-07-01" }, base)).toBe(true);
  });
  it("typing a journal note marks it dirty; whitespace alone does not", () => {
    expect(draftDirty({ ...base, journal: "  " }, base)).toBe(false);
    expect(draftDirty({ ...base, journal: "Met at a festival" }, base)).toBe(true);
  });
  it("ticking a material marks it dirty", () => {
    const rows = base.materials.map((r) => (r.key === "synopsis" ? { ...r, on: true } : r)) as MaterialRow[];
    expect(draftDirty({ ...base, materials: rows }, base)).toBe(true);
  });
  it("changing the reminder choice marks it dirty", () => {
    expect(draftDirty({ ...base, reminder: { kind: "none" } }, base)).toBe(true);
    expect(draftDirty({ ...base, reminder: { kind: "custom", date: "2026-09-08" } }, base)).toBe(true);
  });
});

describe("the nudge reminder — derived from the agent's stated turnaround", () => {
  it("suggests send date + responseTimeWeeks", () => {
    expect(suggestedReminderDate("2026-07-29", 6)).toBe("2026-09-09");
  });
  it("no stated turnaround → no suggestion (the chip has nothing to offer)", () => {
    expect(suggestedReminderDate("2026-07-29", undefined)).toBeNull();
    expect(suggestedReminderDate("2026-07-29", 0)).toBeNull();
  });
  it("labels the chip date + relative distance, in the page-wide elapsed vocabulary", () => {
    // The day-month half comes from the same toLocaleDateString("en-GB", short) call every other
    // date on the page uses, so the expectation is built the same way rather than pinning a CLDR
    // spelling ("Sep" vs "Sept" moves with the ICU version).
    const day = new Date("2026-09-09").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    expect(reminderChipLabel("2026-09-09", "2026-07-29")).toBe(`${day} · in 6 weeks`);
    expect(reminderChipLabel("2026-09-09", "2026-07-29")).toMatch(/· in 6 weeks$/);
  });
  /* ⚠️ A PRESET CARRIES WEEKS, NOT A DATE — which is what makes "moving the sent date moves the
     nudge, but a date you picked yourself stays put" true by construction rather than by a handler
     remembering to do it. The agent is NOT consulted at resolve time: their figure was baked into
     `weeks` when the preset was chosen, and re-reading it would overwrite a writer who picked a
     different interval on purpose. */
  it("resolveReminder honours the choice: preset / custom / none", () => {
    const d: QueryDraft = { ...emptyDraft({}, NOW), agentId: "a1", manuscriptId: "m1" };
    expect(resolveReminder({ ...d, reminder: { kind: "preset", weeks: 6 } })).toBe("2026-09-09");
    expect(resolveReminder({ ...d, reminder: { kind: "custom", date: "2026-08-01" } })).toBe("2026-08-01");
    expect(resolveReminder({ ...d, reminder: { kind: "none" } })).toBeNull();
  });

  it("moving the sent date moves a preset and leaves a custom date alone", () => {
    const d: QueryDraft = { ...emptyDraft({}, NOW), reminder: { kind: "preset", weeks: 6 } };
    expect(resolveReminder({ ...d, dateSent: "2026-08-05" })).toBe("2026-09-16");
    const custom: QueryDraft = { ...d, reminder: { kind: "custom", date: "2026-09-09" } };
    expect(resolveReminder({ ...custom, dateSent: "2026-08-05" }), "a chosen day is a chosen day")
      .toBe("2026-09-09");
  });

  /* ⚠️ A MISSING AGENT FIGURE IS A GAP IN THEIR RECORD, NEVER A DECISION THE WRITER MADE. The old
     `suggested` kind resolved to null when the agent stated nothing, so the query went quiet with
     no reminder scheduled and nobody had chosen that. */
  it("an agent with no stated turnaround gets the house default, not silence", () => {
    /* ⚠️ `seeded: true` IS PART OF THE VALUE. It is what lets the provenance line tell "the app
       chose 8 weeks" from "the writer chose 8 weeks" — the same date, two different facts. */
    expect(initialReminder(agent({ responseTimeWeeks: undefined })))
      .toEqual({ kind: "preset", weeks: HOUSE_NUDGE_WEEKS, seeded: true });
    expect(initialReminder(agent({ responseTimeWeeks: 6 }))).toEqual({ kind: "preset", weeks: 6, seeded: true });
    expect(initialReminder(null)).toEqual({ kind: "preset", weeks: HOUSE_NUDGE_WEEKS, seeded: true });
    expect(initialReminder(agent({ responseTimeWeeks: 0 })), "zero is not a turnaround")
      .toEqual({ kind: "preset", weeks: HOUSE_NUDGE_WEEKS, seeded: true });
  });

  /* ⚠️ AND THE LINE SAYS SO OUT LOUD. Presenting eight weeks as though the agent had said it would
     put words in their mouth, and the writer could not tell a stated turnaround from a convention
     when deciding whether to trust it. */
  /* ══════════════════════════════════════════════════════════════════════════════════════
     ⚠️ THE CLAUSE EXPLAINS WHERE A **DEFAULT** CAME FROM. It was flagged off "the selection
     differs from the agent's figure", so a writer who picked 12 weeks for an agent stating 6 was
     told no response time was listed — while the panel beside it showed six. Once the writer has
     chosen, the provenance is the writer, and the app says nothing about it.
     ══════════════════════════════════════════════════════════════════════════════════════ */
  const CLAUSE = "a default, as no response time is listed for them";

  it("case 1 — agent states a figure, preset untouched: the bare sentence", () => {
    const d: QueryDraft = { ...emptyDraft({}, NOW), reminder: initialReminder(agent({ responseTimeWeeks: 6 })) };
    expect(nudgeDerivedLine(d, agent({ responseTimeWeeks: 6 }))).toMatch(/^A task appears on .+\.$/);
    expect(nudgeDerivedLine(d, agent({ responseTimeWeeks: 6 }))).not.toContain(CLAUSE);
  });

  it("case 2 — agent states nothing, house fallback untouched: the clause", () => {
    const bare = agent({ responseTimeWeeks: undefined });
    const d: QueryDraft = { ...emptyDraft({}, NOW), reminder: initialReminder(bare) };
    expect(nudgeDerivedLine(d, bare)).toContain(CLAUSE);
  });

  /* ⚠️ AND IT GOES THE MOMENT THE WRITER PICKS ANYTHING — including picking the same number the
     app had already chosen. Arriving at 8 weeks by default and choosing 8 weeks by hand are
     different facts about provenance, which is why `seeded` lives on the choice. */
  it("case 3 — the writer chose: no clause, whatever the agent states", () => {
    const bare = agent({ responseTimeWeeks: undefined });
    const chosen: QueryDraft = { ...emptyDraft({}, NOW), reminder: { kind: "preset", weeks: 8 } };
    expect(nudgeDerivedLine(chosen, bare), "the writer's own pick needs no explanation")
      .not.toContain(CLAUSE);
    const twelve: QueryDraft = { ...emptyDraft({}, NOW), reminder: { kind: "preset", weeks: 12 } };
    expect(nudgeDerivedLine(twelve, agent({ responseTimeWeeks: 6 })),
      "this is the case that shipped the bug — a different preset is not a missing figure")
      .not.toContain(CLAUSE);
  });

  it("and nothing resolving claims nothing", () => {
    const d: QueryDraft = { ...emptyDraft({}, NOW), reminder: { kind: "none" } };
    expect(nudgeDerivedLine(d, agent())).toBeNull();
  });

  it("and a custom date reports the interval back to the send", () => {
    const d: QueryDraft = { ...emptyDraft({}, NOW), reminder: { kind: "custom", date: "2026-09-30" } };
    expect(nudgeDerivedLine(d, agent())).toContain("9 weeks after sending");
  });
});

describe("draftMaterialsToQuery — the checklist as the query's materialsWanted", () => {
  const rows = (over: Partial<Record<string, unknown>> = {}): MaterialRow[] => ([
    { key: "queryLetter", kind: "binary", name: "Query letter", on: true },
    { key: "synopsis", kind: "binary", name: "Synopsis", on: true, pages: "" },
    { key: "sample", kind: "qty", name: "Opening sample", on: true, unit: "Chapters", amount: "5" },
    { key: "other", kind: "text", name: "Other", on: false, text: "" },
    ...[],
  ] as MaterialRow[]).map((r) => ({ ...r, ...(over[r.key] as object ?? {}) })) as MaterialRow[];

  it("ticked rows only; the sample carries its unit + quantity", () => {
    expect(draftMaterialsToQuery(rows())).toEqual([
      "Query Letter",
      "Synopsis",
      { material: "Sample Pages", type: "chapters", quantity: 5 },
    ]);
  });

  it("an unticked row writes nothing", () => {
    const out = draftMaterialsToQuery(rows({ synopsis: { on: false } }));
    expect(out).not.toContain("Synopsis");
  });

  it("a sample with no quantity degrades to the bare label, never a bogus 0", () => {
    expect(draftMaterialsToQuery(rows({ sample: { amount: "" } }))).toContainEqual("Sample Pages");
  });

  it("Other keeps the writer's prose verbatim behind type:'other' — never mistaken for a sample", () => {
    const out = draftMaterialsToQuery(rows({ other: { on: true, text: "First 3 pages, single-spaced" } }));
    expect(out).toContainEqual({ material: "Other", type: "other", quantity: "First 3 pages, single-spaced" });
  });

  it("an Other row ticked but empty writes nothing", () => {
    expect(draftMaterialsToQuery(rows({ other: { on: true, text: "   " } }))).toHaveLength(3);
  });
});

describe("draftToPayload — the SAME shape the retired popup handed addQuery", () => {
  const d: QueryDraft = { ...emptyDraft({ agentId: "a1", manuscriptId: "m1" }, NOW) };

  it("carries the query's facts; the date becomes an ISO instant", () => {
    const p = draftToPayload(d, agent());
    expect(p.agentId).toBe("a1");
    expect(p.manuscriptId).toBe("m1");
    expect(p.sendMethod).toBe(SubmissionMethod.EMAIL);
    expect(p.dateSent).toBe(new Date("2026-07-29").toISOString());
    expect(p.packageId).toBe(""); // free-text materials, never both (materialsLinkWrites' rule)
  });

  it("writes nudgeDate only when a reminder resolves — parity with the popup", () => {
    expect(draftToPayload(d, agent())).toHaveProperty("nudgeDate");
    expect(draftToPayload({ ...d, reminder: { kind: "none" } }, agent())).not.toHaveProperty("nudgeDate");
    /* ⚠️ AMENDED: an agent with no stated window USED to write nothing, because `suggested`
       resolved against their record and found nothing there. It now writes the house default —
       the whole point of the preset model is that a gap in their record is not a decision. */
    expect(draftToPayload(d, agent({ responseTimeWeeks: undefined })), "the house default still writes")
      .toHaveProperty("nudgeDate");
  });

  it("never sets a status — addQuery defaults Queried and seeds the QUERY_SENT activity", () => {
    expect(draftToPayload(d, agent())).not.toHaveProperty("status");
  });
});

describe("CREATE_SEND_METHODS — the three segments, on the real enum", () => {
  it("Email / Form / Post map to existing SubmissionMethod values", () => {
    expect(CREATE_SEND_METHODS.map((m) => m.label)).toEqual(["Email", "Form", "Post"]);
    expect(CREATE_SEND_METHODS.map((m) => m.value)).toEqual([
      SubmissionMethod.EMAIL,
      SubmissionMethod.ONLINE_FORM,
      SubmissionMethod.POST,
    ]);
  });
});
