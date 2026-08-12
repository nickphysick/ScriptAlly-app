/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ THE LEGACY TAIL IS DELETED, NOT REPAIRED — and these locks are what stop it growing back.
 *
 * Onboarding used to end with two screens inherited from an older flow: an agents step and a
 * completion step. Between them they carried four separate faults, and every one of them was a
 * consequence of the screens existing at all rather than of how they were written:
 *
 *   - two dead buttons ("Download template" and "Upload my spreadsheet" both called onSkip, so
 *     they silently ended onboarding and dropped the writer on the dashboard);
 *   - two captured-then-discarded fields (email and genres were typed, held, and never passed to
 *     addAgent, which wrote `email: ""` and `genres: []`);
 *   - six invented agent defaults on the writer's very first agent;
 *   - a completion screen asserting "Your manuscript is ready and your agents are on file" above
 *     a summary block that could read "Agents added — Not added".
 *
 * Onboarding now ends where the real work starts: both branch exits finish onto the agent list,
 * where the app's own Add-an-agent form lives. These tests read source because what they assert is
 * an ABSENCE, and an absence has no render to inspect.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const here = dirname(fileURLToPath(import.meta.url));

/**
 * ⚠️ COMMENTS ARE STRIPPED BEFORE MATCHING, and that is load-bearing for an absence lock.
 *
 * Every deletion here left a comment behind explaining what went and why — which means those
 * comments necessarily NAME the deleted things ("starRating", "ImportTidyAnimation", "1200ms").
 * A lock reading them fails on its own documentation, and the obvious response to that false
 * alarm is to delete the explanation, which is exactly the knowledge worth keeping. Code is what
 * these tests are about; prose about code is not code.
 */
const stripComments = (src: string): string =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n");

const read = (rel: string) => stripComments(readFileSync(resolve(here, rel), "utf8"));

const ONBOARDING = read("../Onboarding.tsx");
const BRANCH_B = read("BranchB.tsx");
const CHROME = read("chrome.tsx");

describe("the legacy agents and completion screens are gone", () => {
  for (const gone of ["Screen5Agents", "Screen6Complete", "handleScreen5Continue"]) {
    it(`${gone} no longer exists`, () => {
      expect(ONBOARDING).not.toContain(gone);
    });
  }

  /**
   * ⚠️ THE SHARPEST OF THE FOUR: absence is a first-class state for starRating,
   * responseTimeWeeks and noResponseMeansNo, and new agents are born with all three OMITTED.
   * The deleted writer stamped all three, so the writer's first agent arrived in a condition the
   * rest of the app treats as impossible — and the invented rating fed the agent list's default
   * sort as though someone had chosen it.
   */
  it("onboarding no longer writes an agent at all, so it cannot invent one's facts", () => {
    expect(ONBOARDING).not.toContain("addAgent");
    for (const invented of ["starRating", "responseTimeWeeks", "noResponseMeansNo", "materialsWanted"]) {
      expect(ONBOARDING).not.toContain(invented);
    }
  });

  it("no completion screen claims agents are on file", () => {
    expect(ONBOARDING).not.toMatch(/agents are on file/i);
    expect(ONBOARDING).not.toMatch(/You're all set/i);
  });
});

describe("both branch exits finish onto the agent list", () => {
  /** The hand-off mechanism App.tsx reads and clears on completion. */
  const HATCH = 'sessionStorage.setItem("scriptally_post_onboarding_tab", "agents")';

  it("Branch A's ready-to-query path finishes rather than stepping to a deleted screen", () => {
    const anchor = "const handleBranchASaveReady = async (r: BranchAResult) => {";
    expect(ONBOARDING).toContain(anchor);
    const from = ONBOARDING.slice(ONBOARDING.indexOf(anchor));
    const body = from.slice(0, from.indexOf("\n  };"));
    expect(body).toContain(HATCH);
    expect(body).toContain("finishOnboarding");
    expect(body).not.toContain("goTo(5)");
  });

  it("Branch B's add-by-hand does the same", () => {
    const anchor = "onAddByHand={async () => {";
    expect(ONBOARDING).toContain(anchor);
    const from = ONBOARDING.slice(ONBOARDING.indexOf(anchor));
    const body = from.slice(0, from.indexOf("}}"));
    expect(body).toContain(HATCH);
    expect(body).not.toContain("goTo(5)");
  });

  it("nothing anywhere still routes to a numbered step above zero", () => {
    expect(ONBOARDING).not.toMatch(/goTo\([1-9]\)/);
  });
});

describe("the transition beat and the progress dots are gone", () => {
  it("no cream Understood card", () => {
    expect(ONBOARDING).not.toContain("CreamUnderstood");
    expect(CHROME).not.toContain("CreamUnderstood");
  });

  it("no 'understood' flow state, so nothing holds the writer on a timer", () => {
    expect(ONBOARDING).not.toContain('"understood"');
    expect(ONBOARDING).not.toContain("1200");
  });

  it("no ProgressDots and no five-step total", () => {
    expect(ONBOARDING).not.toContain("ProgressDots");
    expect(ONBOARDING).not.toContain("TOTAL_MODAL_STEPS");
  });
});

describe("the unreachable tidying screen is gone", () => {
  it("BranchB's screen union no longer offers it", () => {
    const anchor = "type B3Screen =";
    expect(BRANCH_B).toContain(anchor);
    const line = BRANCH_B.slice(BRANCH_B.indexOf(anchor), BRANCH_B.indexOf(anchor) + 400);
    expect(line).not.toContain('"tidying"');
  });

  it("and nothing imports the component behind it", () => {
    expect(BRANCH_B).not.toContain("ImportTidyAnimation");
  });
});

describe("a returning writer mid-flight is not stranded", () => {
  /**
   * ⚠️ THE RESUME PATH IS THE ONE THING DELETION COULD HAVE BROKEN. A saved `step` of 5 or 6 from
   * an earlier build points at a screen that no longer exists; without normalisation that writer
   * gets a blank overlay with no way out, and the overlay is `position: fixed; inset: 0` over the
   * whole app. Every saved step must resolve to the welcome, which can reach everywhere else.
   */
  it("normalizeStep sends every saved step to the welcome", () => {
    const anchor = "const normalizeStep =";
    expect(ONBOARDING).toContain(anchor);
    const line = ONBOARDING.slice(ONBOARDING.indexOf(anchor));
    const body = line.slice(0, line.indexOf(";") + 1);
    expect(body).toContain("=> 0");
    // The old form kept 5 and 6 alive; if either reappears the resume is stranded again.
    expect(body).not.toContain("=== 5");
    expect(body).not.toContain("=== 6");
  });
});
