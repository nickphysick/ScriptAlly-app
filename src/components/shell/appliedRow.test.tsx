/**
 * List filters v1 Phase 5 — the applied row (shell/AppliedRow) and "Clear all" as the only clearing word on the Queries
 * and Agents lists. The rendered row and its chips against the list are tests/e2e/lf1.measure.ts LF5, LF7 and LF12.
 */
import { describe, expect, it } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryStatus } from "../../types";
import { AppliedRow } from "./AppliedRow";
import { STAGE_COLOURS } from "../../lib/stageColours";

const noop = () => {};
const read = (f: string) => readFileSync(resolve(__dirname, f), "utf8");

describe("the applied row", () => {
  const h = renderToStaticMarkup(<AppliedRow hook="data-tst" onClearAll={noop} chips={[
    { key: "qp:you", label: "Your move", onRemove: noop },
    { key: "stage:partial", label: "Partial", stage: "partial", mark: QueryStatus.PARTIAL_SENT, onRemove: noop },
    { key: "find", label: "“vane”", onRemove: noop },
  ]} />);
  it("\"Filtered by\", one chip per choice, \"Clear all\"", () => {
    expect(h).toMatch(/^<div class="lf-ap" role="status" data-tst="applied"><span class="lf-apl">Filtered by<\/span>/);
    expect([...h.matchAll(/data-tst="applied-chip" data-k="([^"]+)"/g)].map((m) => m[1])).toEqual(["qp:you", "stage:partial", "find"]);
    expect(h).toMatch(/<button type="button" class="lf-apx" data-tst="applied-clear">Clear all<\/button><\/div>$/);
  });
  it("a chip is named for removal; a whole stage's chip is on its band with its mark, the others are navy", () => {
    expect(h).toMatch(/aria-label="Remove Your move"/);
    expect(h).toMatch(/class="lf-apc lf-apc--stage"[^>]*data-stage="partial"[^>]*style="background:#e4ebf2;--sf-edge:#cbd7e4"><span aria-hidden="true"[^>]*><svg[^>]*style="display:block;color:#1c130f"/);
    expect(h).toMatch(/class="lf-apc" data-tst="applied-chip" data-k="find" aria-label="Remove “vane”"><span>“vane”<\/span><i aria-hidden="true">×<\/i>/);
    expect(STAGE_COLOURS.partial.band).toBe("#e4ebf2");
  });
});

describe("one word for clearing", () => {
  const files = ["../queries/centre/QcPage151.tsx", "../agents/contact/ContactSheet26.tsx", "./FilterPanel.tsx", "./AppliedRow.tsx",
    "../queries/centre/QcViews156.tsx", "../agents/contact/ContactViews.tsx"];
  it("the two lists' panel, applied row and no-matches state say \"Clear all\", never Reset, Reset filters or Clear filters", () => {
    for (const f of files) {
      const code = read(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      expect(code, f).not.toMatch(/>\s*(Reset|Reset filters|Clear filters|Clear the filters)\s*</);
    }
    expect(read("../queries/centre/QcPage151.tsx").match(/>Clear all</g)).toHaveLength(2);
    expect(read("../agents/contact/ContactSheet26.tsx")).toContain('data-cl26="reset" onClick={p.onClearAll}>Clear all</button>');
  });
});
