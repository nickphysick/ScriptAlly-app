import { describe, it, expect } from "vitest";
import {
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
    expect(d.reminder).toEqual({ kind: "suggested" });
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
  it("resolveReminder honours the choice: suggested / custom / none", () => {
    const d: QueryDraft = { ...emptyDraft({}, NOW), agentId: "a1", manuscriptId: "m1" };
    expect(resolveReminder(d, agent())).toBe("2026-09-09");
    expect(resolveReminder({ ...d, reminder: { kind: "custom", date: "2026-08-01" } }, agent())).toBe("2026-08-01");
    expect(resolveReminder({ ...d, reminder: { kind: "none" } }, agent())).toBeNull();
    // suggested, but the agent states no window → nothing to write
    expect(resolveReminder(d, agent({ responseTimeWeeks: undefined }))).toBeNull();
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
    // suggested but the agent states no window → nothing to write
    expect(draftToPayload(d, agent({ responseTimeWeeks: undefined }))).not.toHaveProperty("nudgeDate");
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
