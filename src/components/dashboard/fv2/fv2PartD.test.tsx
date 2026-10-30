/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * FV2-D — Dashboard first visit v2, Part D: the first-visit tour. Running it on a page (once, then never by itself; the
 * replay from the "?" menu; never for an account whose first load has queries) is FV2 D1, on the running page.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { HelpMenu } from "../../shell/HelpMenu";
import { TOUR_STOPS, TOUR_LAST, TOUR_NEXT, TOUR_SKIP, SHOW_ME_ROUND, tourDecision, tourKicker, tourState } from "../../../lib/dashTour";
import { dashPrefsOf } from "../../../lib/dashFirstVisit";
import type { User } from "../../../types";

describe("FV2-D · the stops", () => {
  it("three, in the reference's words", () => {
    expect(TOUR_STOPS.map((s) => [s.title, s.text])).toEqual([
      ["Start here", "This is your first step. It's based on what you told us when you signed up, and you can change it."],
      ["Five things to set up", "Do them in any order. Each one ticks itself off once it's done."],
      ["Your activity", "Every query you log, and every reply from an agent, shows up here."],
    ]);
    expect([tourKicker(0), tourKicker(2), TOUR_SKIP, TOUR_NEXT, TOUR_LAST]).toEqual(["1 of 3", "3 of 3", "Skip", "Next", "Got it"]);
    expect(TOUR_STOPS.map((s) => s.target)).toEqual(['[data-fv2="start-card"]', '[data-fv2="gs"]', '[data-fv2="empty-feed"]']);
  });
});

describe("FV2-D · when it runs", () => {
  it("once, on the first load, before the first query; never once decided; never for a first load with queries", () => {
    expect(tourDecision(false, "pre")).toBe("run");
    expect(tourDecision(false, "resume")).toBe("run");
    expect(tourDecision(false, "querying")).toBe("never");
    expect(tourDecision(false, "between")).toBe("never");
    expect(tourDecision(true, "pre")).toBe("none");
    expect(tourState("pre") && tourState("resume") && !tourState("querying")).toBe(true);
  });
  it("the stored flag is one leaf, read back as decided", () => {
    expect(dashPrefsOf({ todoPrefs: { dash: { tour: "done" } } } as unknown as User).tour).toBe(true);
    expect(dashPrefsOf({ todoPrefs: {} } as unknown as User).tour).toBe(false);
  });
});

describe("FV2-D · it is the help system's spotlight, not a new overlay", () => {
  const src = readFileSync(resolve(__dirname, "FirstVisitTour.tsx"), "utf8");
  it("renders through SpotCard, the spotlight's page-driven card PageChecklist draws with", () => {
    expect(src).toContain('from "../../shell/guide/SpotCard"');
    expect(readFileSync(resolve(__dirname, "../../shell/guide/PageChecklist.tsx"), "utf8")).toContain("<SpotCard");
  });
});

describe("FV2-D · Show me round again", () => {
  const menu = (onTour?: () => void) => renderToStaticMarkup(
    <HelpMenu pageName="Dashboard" legacyGuide={false} onLegacyGuide={() => {}} onTour={onTour} onClose={() => {}} onGo={() => {}} menuRef={{ current: null }} style={{}} />,
  );
  it("is in the ? menu only while the dashboard offers it", () => {
    expect(menu(() => {})).toContain(`data-hm="tour"`);
    expect(menu(() => {})).toContain(SHOW_ME_ROUND);
    expect(menu()).not.toContain(`data-hm="tour"`);
  });
});
