/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks for the Submission packages pane.
 *
 * ⚠️ THE FAULT THIS PANE EXISTS TO AVOID IS SELLING SOMETHING THE USER ALREADY HAS. The package
 * builder has no Pro gate, so the ref's Free half — a centred pitch, three bullet cards, `See how
 * it works`, `Upgrade to Pro` — would advertise a page reachable from the rail in one click. That
 * mistake has already been made once on that route and retired. Most of these assert its absence.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ManuscriptPackagesPane } from "./ManuscriptPackagesPane";
import { materialsOnFile, PACKAGE_MATERIALS, MATERIAL_LABEL } from "../../lib/manuscriptPackages";
import { submissionMaterials } from "../../lib/manuscriptTiles";
import { ComponentType, ManuscriptVersion, SubmissionPackage } from "../../types";

const ver = (t: ComponentType, id: string): ManuscriptVersion =>
  ({ id, manuscriptId: "m1", userId: "u", componentType: t, versionName: id, fileAttached: false, createdDate: "2026-06-01" } as ManuscriptVersion);

const pkg = (id: string): SubmissionPackage =>
  ({ id, manuscriptId: "m1", userId: "u", packageName: id, queryLetterVersionId: "", synopsisVersionId: "", samplePagesVersionId: "", status: "Active", createdDate: "2026-06-01" } as SubmissionPackage);

const pane = (versions: ManuscriptVersion[] = [], packages: SubmissionPackage[] = []) =>
  renderToStaticMarkup(React.createElement(ManuscriptPackagesPane, { versions, packages }));

describe("the four rows always render, and absence is SAID", () => {
  it("names all four slots even with nothing on file", () => {
    const html = pane();
    for (const label of ["Query letter", "Synopsis", "Sample pages", "Packages compiled"]) {
      expect(html).toContain(label);
    }
    expect(html.match(/class="msv-frow"/g)).toHaveLength(4);
  });

  /**
   * ⚠️ A ROW THAT VANISHES STATES NOTHING; `—` STATES "THIS SLOT IS EMPTY". This is also what earns
   * the Details tile the right to OMIT its absent materials — absence is spelled out here, so the
   * tile repeating it would be the same information twice.
   */
  it("an empty slot reads an em dash, in the quieter tone, and is never dropped", () => {
    const html = pane();
    expect(html.match(/—/g)).toHaveLength(4);
    expect(html.match(/msv-fcount none/g)).toHaveLength(4);
  });

  it("counts carry their unit and agree in number", () => {
    const rows = materialsOnFile(
      [ver(ComponentType.QUERY_LETTER, "a"), ver(ComponentType.QUERY_LETTER, "b"), ver(ComponentType.SYNOPSIS, "c")],
      [pkg("p")],
    );
    expect(rows).toEqual([
      { label: "Query letter", count: "2 versions" },
      { label: "Synopsis", count: "1 version" },
      { label: "Sample pages", count: null },
      { label: "Packages compiled", count: "1 package" },
    ]);
  });

  it("and a filled slot renders its count rather than the dash", () => {
    const html = pane([ver(ComponentType.SAMPLE_PAGES, "s")], [pkg("a"), pkg("b")]);
    expect(html).toContain("1 version");
    expect(html).toContain("2 packages");
    expect(html.match(/—/g)).toHaveLength(2); // query letter + synopsis
  });

  it("the footer link is the only action", () => {
    const html = pane();
    expect(html).toContain("Open package builder");
    expect(html.match(/<button/g)).toHaveLength(1);
  });
});

describe("⚠️ ONE PANE — no plan fork, no chip, no upsell, no fake preview", () => {
  it("sells nothing, on any data", () => {
    for (const html of [pane(), pane([ver(ComponentType.SYNOPSIS, "s")], [pkg("a")])]) {
      expect(html).not.toMatch(/prochip|>Pro</i);
      expect(html).not.toMatch(/Upgrade/i);
      expect(html).not.toMatch(/See how it works/i);
      expect(html).not.toMatch(/One tidy package/i);
      expect(html).not.toMatch(/part of Pro/i);
    }
  });

  it("and none of the ref's Free-half furniture was built", () => {
    const html = pane();
    for (const bullet of ["Versioned materials", "Per-agent packages", "Export when asked"]) {
      expect(html).not.toContain(bullet);
    }
  });

  /** No dimmed or blurred preview of real-looking data behind a gate — there is no gate. */
  it("renders no placeholder or skeleton content", () => {
    expect(pane()).not.toMatch(/blur|skeleton|placeholder|opacity:\s*0\./i);
  });

  /**
   * ⚠️ THE PANE TAKES NO PLAN AT ALL, so a fork cannot be slipped in — adding one means changing
   * the component's signature, which is a change someone has to mean. Asserted against the SOURCE
   * rather than the rendered output, because a fork would also arrive as an import.
   */
  it("takes no plan input: it cannot branch on who is looking", () => {
    const src = readFileSync(resolve(__dirname, "./ManuscriptPackagesPane.tsx"), "utf8");
    expect(src).not.toMatch(/isPro|UserPlan|isProUser|currentUser/);
  });
});

describe("⚠️ the material list is SHARED with the Details tile, not restated", () => {
  /**
   * `SubmissionPackage` has exactly three slots, so these three ARE the package materials.
   * FULL_MANUSCRIPT is deliberately absent — not a package slot. If that is wrong it is ONE list
   * to change, and the tile follows automatically because it imports this one.
   */
  it("is the three package-slot materials, in slot order", () => {
    expect(PACKAGE_MATERIALS).toEqual([
      ComponentType.QUERY_LETTER, ComponentType.SYNOPSIS, ComponentType.SAMPLE_PAGES,
    ]);
    expect(PACKAGE_MATERIALS).not.toContain(ComponentType.FULL_MANUSCRIPT);
  });

  it("the pane and the tile name the same materials in the same words", () => {
    const versions = PACKAGE_MATERIALS.map((t, i) => ver(t, `v${i}`));
    const tile = submissionMaterials([pkg("p")], versions);
    for (const t of PACKAGE_MATERIALS) {
      expect(tile.detail).toContain(MATERIAL_LABEL[t]);
      expect(pane(versions, [pkg("p")])).toContain(MATERIAL_LABEL[t]);
    }
  });

  /** A full-manuscript version is on neither surface — one decision, not two omissions. */
  it("a full-manuscript version appears on neither surface", () => {
    const vs = [ver(ComponentType.FULL_MANUSCRIPT, "f")];
    expect(pane(vs)).not.toContain("Full manuscript");
    expect(submissionMaterials([], vs).detail).toBe("No materials added yet.");
  });
});
