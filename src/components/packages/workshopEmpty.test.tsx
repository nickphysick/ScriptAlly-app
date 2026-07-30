/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smoke coverage for the Workshop tab's first-run screen — now the zero-package state for EVERY user
 * on every plan, and previously untested. The Pro landing that used to sit in front of it had no
 * specs either; this is the coverage that should have existed for whatever occupies that slot.
 *
 * WHAT THIS DELIBERATELY DOES NOT TEST. No layout, no motion, no snapshots. The repo has no jsdom and
 * no testing-library — the house pattern (pageHeader.test.tsx, shellV2Smoke.test.tsx) is
 * `renderToStaticMarkup`, which is stricter about what it can honestly assert: structure and
 * attributes, never geometry. Effects don't run under it either, so the draft rule is exercised
 * through the pure `firstRunState` predicate rather than by clicking, which is the more durable test
 * anyway — it pins the RULE, not one path to it.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WorkshopEmpty, activeStep, firstRunState } from "./WorkshopEmpty";
import { WorkshopTab } from "./WorkshopTab";
import { ManuscriptVersion, ComponentType } from "../../types";

const ver = (id: string, componentType: ComponentType, versionName: string): ManuscriptVersion =>
  ({ id, manuscriptId: "m", userId: "u", componentType, versionName, fileAttached: false, createdDate: "2026-01-01" }) as ManuscriptVersion;

const noop = () => undefined;
const emptyScreen = (versions: ManuscriptVersion[] = [], packagesOnly = false) =>
  renderToStaticMarkup(
    <WorkshopEmpty versions={versions} onAddMaterial={noop} onNewPackage={noop} onTryExample={noop} packagesOnly={packagesOnly} />,
  );

describe("firstRunState — which screen the tab owes", () => {
  it("gives the first-run screen at zero packages", () => {
    expect(firstRunState(0, 0, 0)).toBe("empty");
  });

  it("does NOT give a first-run screen while an unsaved draft exists — the draft clause", () => {
    // You have a package in progress, so you get the grid. Without this, starting a package from the
    // empty state would bounce you straight back to the empty state.
    expect(firstRunState(0, 0, 1)).toBe("populated");
    expect(firstRunState(3, 0, 1)).toBe("populated");
  });

  it("degrades to the packages-only screen once materials exist", () => {
    expect(firstRunState(1, 0, 0)).toBe("packages-only");
  });

  it("steps aside entirely once a package is saved", () => {
    expect(firstRunState(3, 2, 0)).toBe("populated");
  });
});

describe("the steps strip advances from what exists", () => {
  it("sits at 1 with nothing, and moves to 2 once materials of one type exist", () => {
    expect(activeStep(0, 0)).toBe(1);
    expect(activeStep(1, 0)).toBe(2);
    expect(activeStep(3, 1)).toBe(3);
  });

  it("marks exactly one step active in the rendered strip", () => {
    const html = emptyScreen();
    expect(html.match(/pkgw-stp now/g) ?? []).toHaveLength(1);
    // …and it is step 1 with no materials.
    expect(html).toContain('class="pkgw-stp now"><span class="no">1</span>');
  });
});

describe("the first-run screen renders", () => {
  it("mounts at packagesCount === 0 through WorkshopTab, not just in isolation", () => {
    const html = renderToStaticMarkup(
      <WorkshopTab
        versions={[]}
        packages={[]}
        queries={[]}
        activePackageId={null}
        onCreateVersion={() => undefined}
        onUpdateVersion={noop}
        onDeleteVersion={noop}
        onSavePackage={() => undefined}
        onMakeActive={noop}
        onTryExample={noop}
      />,
    );
    expect(html).toContain("pkgw-steps");
    expect(html).toContain("Start with your materials");
    // the sidebar+grid layout is NOT what renders in this state
    expect(html).not.toContain("pkgw-wrap2");
  });

  it("offers one card per material type", () => {
    expect(emptyScreen().match(/pkgw-mcard/g) ?? []).toHaveLength(3);
  });

  it("drops the type cards but keeps the packages section in the packages-only state", () => {
    const html = emptyScreen([ver("v1", ComponentType.QUERY_LETTER, "Letter")], true);
    expect(html).not.toContain("pkgw-mcard");
    expect(html).toContain("Your packages");
  });
});

describe("exactly one way into the guided tour", () => {
  it("renders a single example-data control", () => {
    const html = emptyScreen();
    expect(html.match(/Try it with example data/g) ?? []).toHaveLength(1);
  });
});

describe("the skeleton cards are decoration, not content", () => {
  const html = emptyScreen();
  // The live "Create your first package" card is a real button; the two shells beside it are not.
  const SHELL_OPEN = '<div class="pkgw-ghost" aria-hidden="true">';
  const SHELL_FOOT = '<div class="gfoot">';
  const shells = html.split(SHELL_OPEN).slice(1);

  it("renders two of them, both aria-hidden", () => {
    expect(html).toContain(SHELL_OPEN); // ANCHOR: the marker we slice on exists at all
    expect(shells).toHaveLength(2);
  });

  it("puts nothing focusable inside them", () => {
    expect(shells).toHaveLength(2); // ANCHOR, restated locally — this `it` must not depend on the one above
    for (const shell of shells) {
      // Each shell closes on its footer. Slice there, or the LAST one runs on into the rest of the
      // page and drags the example band's button in with it (which is exactly what happened once).
      expect(shell).toContain(SHELL_FOOT); // ANCHOR: the boundary exists in THIS shell
      const body = shell.split(SHELL_FOOT)[0];
      expect(body.length).toBeGreaterThan(0); // ANCHOR: and slicing on it left something to test
      expect(body).not.toMatch(/<button|<a |<input|tabindex/i);
    }
  });

  it("keeps the create card itself a real, reachable button", () => {
    expect(html).toContain('<button type="button" class="pkgw-ghost mk"');
  });
});
