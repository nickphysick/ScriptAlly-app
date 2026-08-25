/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE VERSIONS PANEL (Part B) ═══════════════════════════════════════════════════════════════
 *
 * Rendered through `renderToStaticMarkup` — this repo has no jsdom, so these read the HTML string.
 * They prove what the component EMITS in each data state; they prove nothing about layout, which is
 * measured in `tests/e2e/` and reported separately.
 *
 * ⚠️ CLASS ASSERTIONS ARE BOUNDED, not substrings. `bv-chip` is a prefix of `bv-chip--rr`, and a
 * bare `toContain` would pass on the wrong element in both directions — the standing rule here.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BookVersionsPanel, monthYear } from "./BookVersionsPanel";
import { ComponentType, QueryStatus } from "../../types";
import type { Activity, BookVersion, ManuscriptVersion, Query } from "../../types";

const v = (id: string, over: Partial<BookVersion> = {}): BookVersion =>
  ({ id, name: id, kind: "reordering", createdDate: "2026-05-04", ...over });

const sample = (id: string, bookVersionId?: string): ManuscriptVersion =>
  ({ id, manuscriptId: "m1", userId: "u", componentType: ComponentType.SAMPLE_PAGES,
     versionName: id, fileAttached: false, createdDate: "", bookVersionId } as ManuscriptVersion);

const q = (id: string, status: QueryStatus): Query =>
  ({ id, userId: "u", manuscriptId: "m1", agentId: "a", status } as unknown as Query);

const send = (queryId: string, bookVersionId: string, date = "2026-06-01"): Activity =>
  ({ id: `act-${queryId}`, userId: "u", queryId, manuscriptId: "m1", activityType: "Materials Sent",
     description: "", date, details: "", resultingStatus: QueryStatus.FULL_SENT,
     bookVersionId } as unknown as Activity);

const render = (over: Partial<React.ComponentProps<typeof BookVersionsPanel>> = {}) =>
  renderToStaticMarkup(
    <BookVersionsPanel
      versions={[]} materials={[]} queries={[]} activities={[]}
      today="2026-08-25" onSave={() => {}} {...over}
    />,
  );

/** A complete class name, delimited on both sides — never a substring. */
const hasClass = (html: string, c: string) => new RegExp(`class="[^"]*\\b${c}\\b[^"]*"`).test(html);

// ─────────────────────────────────────────────────────────────────────────────
describe("D8 — the list appears at two versions, and not before", () => {
  it("shows no band, no count and no row at nought versions", () => {
    const html = render();
    expect(hasClass(html, "bv-band")).toBe(false);
    expect(hasClass(html, "bv-row")).toBe(false);
    expect(html).not.toContain("Versions");
  });

  it("shows no band and no row at ONE version — one version is just the book", () => {
    const html = render({ versions: [v("a", { name: "Prologue-first" })] });
    expect(hasClass(html, "bv-band")).toBe(false);
    expect(hasClass(html, "bv-row")).toBe(false);
    /* and the one version's NAME is not rendered either — a list of one is still a list */
    expect(html).not.toContain("Prologue-first");
  });

  it("shows the band, the count and a row per version at two", () => {
    const html = render({ versions: [v("a", { name: "Prologue-first" }), v("b", { name: "Worldbuilding-first" })] });
    expect(hasClass(html, "bv-band")).toBe(true);
    expect(html).toContain("Prologue-first");
    expect(html).toContain("Worldbuilding-first");
    expect(html.match(/class="bv-row"/g)?.length).toBe(2);
  });

  it("⚠️ but the DOOR is open below the gate — the panel is the only way to make a version", () => {
    /* A deliberate deviation from D8's literal reading, flagged in the report as F-AZ: a gate at
       two with nothing below it would make the feature permanently unreachable. */
    for (const versions of [[], [v("a")]]) {
      expect(hasClass(render({ versions }), "bv-ghost"), "no way to add a version").toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("D7 — the row's derived meta", () => {
  const versions = [v("a", { name: "A" }), v("b", { name: "B" })];

  it("counts the samples carrying each version, and the agents holding it", () => {
    const html = render({
      versions,
      materials: [sample("s1", "a"), sample("s2", "a"), sample("s3", "b")],
      queries: [q("q1", QueryStatus.FULL_SENT), q("q2", QueryStatus.PARTIAL_SENT), q("q3", QueryStatus.QUERIED)],
      activities: [send("q1", "a"), send("q2", "a"), send("q3", "b")],
    });
    /* q3 is QUERIED — nobody is holding anything for it, so `b` is held by nought. */
    expect(html).toContain("2 samples");
    expect(html).toContain("held by 2 agents");
    expect(html).toContain("1 sample<");
    expect(html).toContain("held by 0 agents");
  });

  it("states a zero rather than dropping the clause", () => {
    const html = render({ versions });
    expect(html.match(/0 samples/g)?.length).toBe(2);
    expect(html.match(/held by 0 agents/g)?.length).toBe(2);
  });

  it("renders the date as month and year", () => {
    expect(render({ versions })).toContain("MAY 2026");
  });
});

describe("the date is parsed by hand, not through Date()", () => {
  it("gives the stored month for the first of a month, in any timezone", () => {
    /* ⚠️ `new Date("2026-03-01")` is UTC midnight, so a browser west of Greenwich renders FEB. */
    expect(monthYear("2026-03-01")).toBe("MAR 2026");
    expect(monthYear("2026-12-31")).toBe("DEC 2026");
    expect(monthYear("")).toBe("");
    expect(monthYear("nonsense")).toBe("");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("D10 — the chips", () => {
  it("marks the NEWEST by date as Latest, once", () => {
    const html = render({ versions: [v("a", { createdDate: "2026-07-01" }), v("b", { createdDate: "2026-03-01" })] });
    expect(html.match(/bv-chip--latest/g)?.length).toBe(1);
    /* the July one, not the last in the list */
    const idx = html.indexOf("bv-chip--latest");
    expect(html.lastIndexOf("JUL 2026", idx + 400)).toBeGreaterThan(idx - 400);
  });

  it("shows the kind chip when nothing prompted the version", () => {
    const html = render({ versions: [v("a", { kind: "initial" }), v("b")] });
    expect(html).toContain("Initial");
    expect(html).toContain("Reordering");
    expect(hasClass(html, "bv-chip--rr")).toBe(false);
  });

  it("⚠️ the R&R chip STANDS IN PLACE OF the kind chip — two chips saying one thing is noise", () => {
    const a = send("q1", "a");
    const html = render({ versions: [v("a"), v("b", { kind: "revision", fromActivityId: a.id })], activities: [a] });
    expect(html).toContain("From R&amp;R");
    /* exactly one kind chip survives — version `a`'s. Version `b`'s is replaced, not accompanied. */
    expect(html.match(/bv-chip--kind/g)?.length).toBe(1);
    expect(html).not.toContain("Revision");
  });

  it("⚠️ a link to a deleted or re-filed activity renders NOTHING, not a dead chip", () => {
    const html = render({ versions: [v("a"), v("b", { kind: "revision", fromActivityId: "gone" })], activities: [] });
    expect(html).not.toContain("From R&amp;R");
    /* it falls back to the kind, so the row still says what the version is */
    expect(html).toContain("Revision");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("D9 — append-only, and the note", () => {
  it("offers no delete, archive or remove anywhere on the panel", () => {
    const html = render({ versions: [v("a"), v("b")] });
    for (const word of ["Delete", "Remove", "Archive", "Retire"]) {
      expect(html, `${word} is offered — versions are append-only`).not.toContain(word);
    }
  });

  it("renders the note when there is one, and no empty element when there is not", () => {
    const html = render({ versions: [v("a", { note: "Prologue cut." }), v("b")] });
    expect(html).toContain("Prologue cut.");
    expect(html.match(/class="bv-note"/g)?.length).toBe(1);
  });
});

describe("⚠️ the panel appraises nothing", () => {
  it("renders no verdict, no recommendation and no imperative", () => {
    const html = render({
      versions: [v("a", { note: "x" }), v("b")],
      materials: [sample("s1", "a")],
      queries: [q("q1", QueryStatus.FULL_SENT)],
      activities: [send("q1", "a")],
    });
    for (const w of ["best", "better", "recommend", "prefer", "strongest", "working", "winner", "%"]) {
      expect(html, `the panel says "${w}"`).not.toMatch(new RegExp(`\\b${w}`, "i"));
    }
  });
});
