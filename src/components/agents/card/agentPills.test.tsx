/**
 * Add agent v1 Phase 1 — the shared controls' pure rules (agentPills.tsx). The rendered behaviour is locked on the page
 * (tests/e2e/addAgentV1.measure.ts, AA1–AA14); this file holds the words and the small derivations both hosts read.
 */
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { SubmissionMethod } from "../../../types";
import {
  CountryPills, FIT_WORDS, FitStars, MaterialPills, MethodPills, fitWord, formLinkLabel, sampleBad, socialFromHost, weeksHint,
} from "./agentPills";
import { emptyCardDraft } from "../../../lib/cardDraft";

describe("Agent fit words", () => {
  it("has its own words for each star, and 'Not rated yet' for none", () => {
    expect(FIT_WORDS.slice(1)).toEqual(["Poor fit", "Worth a try", "Good fit", "Great fit", "Dream agent"]);
    expect(fitWord(null)).toBe("Not rated yet");
    expect(fitWord(4)).toBe("Great fit");
  });
  it("renders five ★ stars and the empty word", () => {
    const html = renderToStaticMarkup(React.createElement(FitStars, { value: null, onPick: () => {} }));
    expect((html.match(/data-star=/g) ?? []).length).toBe(5);
    expect(html).toContain("Not rated yet");
  });
});

describe("the submission link follows the method", () => {
  it("labels it by method, and shows no field for email or post", () => {
    expect(formLinkLabel(SubmissionMethod.ONLINE_FORM)).toBe("Submission form");
    expect(formLinkLabel(SubmissionMethod.QUERY_MANAGER)).toBe("QueryManager");
    expect(formLinkLabel(SubmissionMethod.OTHER)).toBe("Link, if there is one");
    expect(formLinkLabel(SubmissionMethod.EMAIL)).toBeNull();
    expect(formLinkLabel(null)).toBeNull();
  });
  it("offers + Other as a pill", () => {
    const html = renderToStaticMarkup(React.createElement(MethodPills, { method: null, other: "", onChange: () => {} }));
    expect(html).toContain(">Other</button>");
  });
});

describe("social", () => {
  it("recognises a pasted link by host, and leaves a bare handle to ask", () => {
    expect(socialFromHost("https://instagram.com/x")).toBe("Instagram");
    expect(socialFromHost("https://x.com/x")).toBe("X / Twitter");
    expect(socialFromHost("bsky.app/profile/x")).toBe("Bluesky");
    expect(socialFromHost("@x")).toBeNull();
  });
});

describe("the opening sample's floor", () => {
  it("is bad under the unit's floor, and fine at it", () => {
    const m = emptyCardDraft().mats;
    expect(sampleBad({ ...m, smp: { on: true, unit: "Words", qty: 200 } })).toBe(true);
    expect(sampleBad({ ...m, smp: { on: true, unit: "Words", qty: 500 } })).toBe(false);
    expect(sampleBad({ ...m, smp: { on: false, unit: "Words", qty: 200 } })).toBe(false);
  });
  it("draws the floor line under a sample below it", () => {
    const m = emptyCardDraft().mats;
    const html = renderToStaticMarkup(React.createElement(MaterialPills, { mats: { ...m, smp: { on: true, unit: "Words", qty: 200 } }, onMats: () => {} }));
    expect(html).toContain("At least 500 words for the opening sample.");
  });
});

describe("the rest", () => {
  it("says what the response time sets", () => {
    expect(weeksHint(8)).toBe("We’ll suggest a nudge once 8 weeks have passed.");
    expect(weeksHint(null)).toContain("Leave it as Unknown");
  });
  it("draws a flag on every country pill (flag-icons, never emoji)", () => {
    const html = renderToStaticMarkup(React.createElement(CountryPills, { country: "GB", onCountry: () => {} }));
    for (const c of ["gb", "ie", "us"]) expect(html).toContain(`fi fi-${c}`);
    expect(html).not.toMatch(/[\u{1F1E6}-\u{1F1FF}]/u);
  });
});
