/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre · Pack A §2 — ONE GLANCE PANEL, TWO ROW-SETS.
 *
 * ⚠️ EQUALITY IS THE REQUIREMENT; PER-JOURNEY PIXEL VALUES ARE HOW THE TWO DRIFTED APART. Record had
 * its own `.qr-ref` chassis beside create's `.qc-ctx`, and browser-measured they had reached
 * 326×427 with `align-self: flex-start` against 300×642 with `align-self: stretch`. NEITHER WAS
 * WRONG ON ITS OWN TERMS — which is exactly why a lock on either side's numbers could never have
 * caught it. What is asserted here is that there is only one chassis and both journeys render it.
 *
 * The rendered geometry is compared in the browser (`tests/e2e/qcReconcile.measure.ts`), at 1440 and
 * 1920 only: both panels are `display: none` below 1100px, so an equality assertion at 1024 would
 * pass because both measure 0×0 — a test that cannot fail.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { QueryStatus } from "../types";
import { responseRefRows, contextRow } from "./responseContext";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const css = read("../components/shell/f12.css");
const panel = read("../components/queries/AgentContextPanel.tsx");
const respPane = read("../components/queries/ResponsePane.tsx");
const createPane = read("../components/queries/QueryCreatePane.tsx");
/** Comment-stripped: both files DISCUSS the deleted chassis where it used to be. */
const strip = (t: string) => t.replace(/\{?\/\*[\s\S]*?\*\/\}?/g, "").replace(/^\s*\/\/.*$/gm, "");
const cssCode = css.replace(/\/\*[\s\S]*?\*\//g, "");

const rule = (selector: string): string => {
  const i = css.indexOf("\n" + selector + " {");
  return i < 0 ? "" : css.slice(i, css.indexOf("}", i) + 1);
};

describe("§2 · there is exactly one panel, and both journeys render it", () => {
  it("the second chassis is gone from the stylesheet and from the page", () => {
    expect(cssCode, "`.qr-ref` came back — a second chassis is how the two drifted")
      .not.toMatch(/\.qr-ref/);
    expect(strip(respPane), "record grew its own panel again").not.toContain("qr-ref");
  });

  it("both panes mount the same component", () => {
    for (const [name, src] of [["create", createPane], ["record", respPane]] as const) {
      expect(strip(src), `${name} does not render the shared panel`).toContain("<AgentContextPanel");
    }
  });

  /* ⚠️ ONE CHASSIS MEANS ONE RULE. Two rules for the panel's box, however carefully matched, is the
     arrangement that produced 326 against 300 — so the width, the alignment and the rim are
     asserted to exist exactly once. */
  it("the box is declared once", () => {
    const ctx = rule(".qc-ctx");
    expect(ctx, "the panel rule is missing").not.toBe("");
    expect((cssCode.match(/\n\.qc-ctx \{/g) ?? []).length, "the panel's box is declared twice").toBe(1);
  });
});

describe("§2 · the chassis carries the parts, and the caller carries the rows", () => {
  it("the content seam exists and defaults to create's body", () => {
    expect(panel, "the body seam is missing").toContain("body?: React.ReactNode");
    expect(panel, "a supplied body must still get the scroller").toContain('className="qc-ctxbody f12-quiet-scroll">{body}');
    /* absent, create's own body renders — so every existing call site is untouched */
    expect(panel).toContain("body !== undefined ?");
  });

  /* The parts the prompt names as the shared chassis. Each is asserted where it lives — in the
     component, not in either caller — because that is what makes them shared. */
  it("cap, glyph, title, name, pill, stats, policy, foot and rim are all the chassis's", () => {
    for (const part of ["qc-glance", "qc-glancemk", "qc-glanceh", "qc-glancew", "qc-ctxpill",
                        "qc-ctxstats", "qc-ctxpolicy", "qc-ctxfoot"]) {
      expect(panel, `${part} left the shared chassis`).toContain(part);
    }
    expect(rule(".qc-ctx"), "the dashed rim went").toContain("dotted");
  });

  /**
   * ⚠️ NO `position: sticky`, AND ITS ABSENCE IS REASONED RATHER THAN ACCIDENTAL. `.qc-form` is the
   * scroll container, the panel is its SIBLING, and `.qc-two` never scrolls — browser-measured,
   * scrolling the flow 104px moved the panel 0.0px. There is no scrolling ancestor for a sticky
   * element to stick within, so the property would resolve to `relative` and read as load-bearing
   * to the next person. `align-self: flex-start; height: auto; max-height: 100%` is the mechanism.
   */
  it("the panel hugs from the top without sticky, and does not stretch", () => {
    const ctx = rule(".qc-ctx");
    expect(ctx).toContain("align-self: flex-start");
    expect(ctx).toContain("height: auto");
    expect(ctx).toContain("max-height: 100%");
    expect(ctx, "the stretch came back — a panel that IS the column is a frame around dead space")
      .not.toContain("align-self: stretch");
    expect(ctx, "a dead sticky was added").not.toContain("position: sticky");
  });

  /* ⚠️ `--qc-ref-*` ARE NOT DEAD. They are create's marginalia treatment and `.qc-ctx` is a live
     consumer; deleting them with the `.qr-ref` rules would have taken the surviving panel's rim. */
  it("the marginalia tokens survive, because the panel that stayed reads them", () => {
    const index = read("../index.css");
    for (const t of ["--qc-ref-rim", "--qc-ref-rule", "--qc-ref-plate"]) {
      expect(index, `${t} was deleted with the panel that did not need it`).toContain(t);
    }
    expect(cssCode, "nothing reads the tokens any more — then they really would be dead")
      .toContain("var(--qc-ref-");
  });
});

describe("§2 · record's rows", () => {
  const q = {
    id: "q1", agentId: "a1", manuscriptId: "m1", status: QueryStatus.QUERIED,
    dateSent: "2026-06-01", materialsWanted: ["Query Letter", "Synopsis"], sendMethod: "Email",
  } as never;
  const agent = { id: "a1", name: "Elinor Hale", responseTimeWeeks: 8 } as never;

  it("three rows: what went out, one contextual, and your history", () => {
    const others = [
      { id: "q2", agentId: "a1", status: QueryStatus.REJECTED },
      { id: "q3", agentId: "a1", status: QueryStatus.QUERIED },
    ] as never[];
    const labels = responseRefRows(q, agent, others, "X", null).map((r) => r.label);
    expect(labels[0]).toBe("You sent");
    expect(labels[labels.length - 1]).toBe("Your history");
    expect(labels).toHaveLength(3);
  });

  it("the middle row is the only one that moves", () => {
    const mid = (o: unknown) => responseRefRows(q, agent, [], "X", o as never)[1]?.label;
    expect(mid(null)).toBe("They said");
    expect(mid("offer")).toBe("An answer is owed");
    expect(mid("noreply")).toBe("Their stated policy");
    expect(mid("partial"), "an ordinary outcome keeps the window").toBe("They said");
  });

  /* ⚠️ THE POLICY IS STATED ONCE. The chassis carries it always; the contextual row carries it when
     the outcome IS closed-no-reply. Two copies of one sentence in a small panel reads as a
     rendering fault, so the row wins and the chassis line is suppressed for that outcome only. */
  it("the chassis policy line is suppressed exactly when the row duplicates it", () => {
    expect(strip(respPane)).toContain('suppressPolicy={draft.outcome === "noreply"}');
    expect(panel, "the suppression is not wired").toContain("policy && !suppressPolicy");
  });

  it("an unstated no-reply policy says so rather than guessing", () => {
    expect(contextRow({ id: "a1" } as never, "noreply" as never)?.text).toBe("Not stated.");
    expect(contextRow({ id: "a1", noResponseMeansNo: true } as never, "noreply" as never)?.text)
      .toBe("No reply means no.");
  });

  /* the history row had no data at all before — the caller handed it a literal `[]` */
  it("the pane passes real queries, so history can render", () => {
    expect(strip(respPane), "the history row is still starved").toContain("responseRefRows(query, agent, queries");
    expect(strip(read("../components/Queries.tsx")), "the host does not supply them")
      .toMatch(/queries=\{queries\}/);
  });
});
