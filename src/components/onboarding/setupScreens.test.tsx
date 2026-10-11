/**
 * The set-up steps (onboarding v5, part 1): welcome, readiness, details, the book. Rendered to a
 * string — what is drawn, in what order, and in which words. Geometry and what a press does are on
 * the rendered page (tests/e2e/onbV5.measure.ts, S1–S4).
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { readFileSync } from "fs";
import { resolve } from "path";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("../../lib/db", async () => (await import("../../test/pageSmoke")).dbMock());
vi.mock("../../lib/firebase", async () => (await import("../../test/pageSmoke")).firebaseMock());
vi.mock("../toast/ToastProvider", async () => (await import("../../test/pageSmoke")).toastMock());

import { WelcomeStageScreen } from "../Onboarding";
import { WELCOME_EYEBROW, WELCOME_LINE, WELCOME_SECOND, welcomeHeading, firstNameOf } from "../../lib/onboardingV9";
import { BranchA, READINESS, READINESS_TITLE, READINESS_SUB, READINESS_LABEL, STILL_WRITING_LEAD, STILL_WRITING_NOTE } from "./BranchA";
import { BOOK_TITLE, BOOK_SUB } from "./BranchB";
import { ManuscriptFields, emptyManuscriptFields } from "./ManuscriptFields";
import { ManuscriptStatus } from "../../types";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/'/g, "&#x27;").replace(/"/g, "&quot;");
const render = (node: React.ReactElement) => renderToStaticMarkup(node).replace(/<!-- -->/g, "");
const noop = () => {};
const branchA = (screen: "readiness" | "details", status: ManuscriptStatus | null) =>
  render(<BranchA initialScreen={screen} initialStatus={status} onExit={noop} onSaveReady={noop} onSaveStillWriting={noop} />);

describe("W1 the words on the set-up steps", () => {
  /* RE-POINTED (onboarding v9): the welcome is the navy panel over a card. The open heading, its
     subline and the card's question line are gone; the options and their words are unchanged. */
  it("welcome: the panel's eyebrow, two-line heading with the first name, and line; the built options", () => {
    expect(WELCOME_EYEBROW).toBe("Welcome");
    expect(WELCOME_SECOND).toBe("Let's get you on board.");
    expect(WELCOME_LINE).toBe("To make your set-up as quick as possible, let us know where you are in your querying journey.");
    expect(welcomeHeading("Lucy Sterling")).toEqual(["Welcome to QueryHawk, Lucy.", "Let's get you on board."]);
    expect(welcomeHeading("  ")).toEqual(["Welcome to QueryHawk.", "Let's get you on board."]);
    expect(welcomeHeading(null)[0]).toBe("Welcome to QueryHawk.");
    expect(firstNameOf("Mary-Jane O'Neil")).toBe("Mary-Jane");
    const h = render(<WelcomeStageScreen name="Lucy Sterling" selected={null} onSelect={noop} onContinue={noop} />);
    expect(h).toContain(`<span>Welcome to QueryHawk, Lucy.</span><span>${esc(WELCOME_SECOND)}</span>`);
    expect(h).toContain(esc(WELCOME_LINE));
    expect(h, "no open heading").not.toContain('class="sf-open"');
    expect(h, "the card asks nothing: the panel has").not.toContain("sf-qlab");
    expect(h).not.toContain("Where are you in your querying journey?");
    expect((h.match(/data-o9="slot"/g) ?? []).length, "one illustration slot").toBe(1);
    for (const t of ["Just getting started", "A few queries out", "Deep in it", "Had some interest"]) expect(h).toContain(t);
    for (const d of ["Haven&#x27;t sent any queries yet", "Early days, waiting to hear back", "Lots of queries in flight", "Requests or an offer on the table"]) expect(h).toContain(d);
    expect(h).toMatch(/<button[^>]*class="sf-btn"[^>]*>Continue<\/button>/);
    expect(h, "no arrow on a primary").not.toContain("→");
  });

  it("readiness: a question keeps its question mark and takes no full stop; three re-worded options", () => {
    expect(READINESS_TITLE).toBe("Where are you with it?");
    expect(READINESS_SUB).toBe("No wrong answer. It points us the right way.");
    expect(READINESS_LABEL).toBe("Your manuscript is…");
    expect(READINESS.map((r) => r.title)).toEqual(["Still being written", "In revision, nearly there", "Ready to query"]);
    expect(READINESS.map((r) => r.desc), "descriptions unchanged").toEqual([
      "I'm partway through the draft.", "Drafted, working through edits.", "Polished and ready to send to agents.",
    ]);
    const h = branchA("readiness", null);
    expect(h).toContain(`<h1 class="sf-title">${esc(READINESS_TITLE)}</h1>`);
    expect(h).toContain("‹ Back");
  });

  it("details and the book: the built headings with a full stop, and the table's sublines", () => {
    const ready = branchA("details", ManuscriptStatus.READY_TO_QUERY);
    expect(ready).toContain('<h1 class="sf-title">A little about it.</h1>');
    expect(ready).toContain('<p class="sf-sub">Just the essentials. You can flesh it out any time.</p>');
    expect(ready).toMatch(/>Continue<\/button>/);
    const still = branchA("details", ManuscriptStatus.DRAFTING);
    expect(still).toContain('<h1 class="sf-title">No rush at all.</h1>');
    expect(still, "unchanged").toContain("We&#x27;ll keep it safe for when you&#x27;re ready");
    expect(still).toMatch(/>Save &amp; explore agents<\/button>/);
    expect(BOOK_TITLE).toBe("The book you're querying.");
    expect(BOOK_SUB).toBe("Just the essentials. Your agents and queries attach to this, and you can flesh it out any time.");
  });
});

describe("S2 option groups are radio groups", () => {
  it("each row is a radio with aria-checked, never aria-pressed", () => {
    for (const h of [
      render(<WelcomeStageScreen selected="deep" onSelect={noop} onContinue={noop} />),
      branchA("readiness", ManuscriptStatus.REVISING),
    ]) {
      expect(h).toMatch(/<div class="sf-opts" role="radiogroup"/);
      expect(h).not.toContain("aria-pressed");
      expect(h.match(/role="radio"/g)!.length).toBeGreaterThanOrEqual(3);
      expect(h.match(/aria-checked="true"/g) ?? [], "exactly one checked").toHaveLength(1);
    }
  });
  it("Continue is disabled until one is chosen", () => {
    expect(render(<WelcomeStageScreen selected={null} onSelect={noop} onContinue={noop} />)).toMatch(/<button[^>]*disabled=""[^>]*>Continue<\/button>/);
    expect(render(<WelcomeStageScreen selected="early" onSelect={noop} onContinue={noop} />)).not.toMatch(/<button[^>]*disabled=""[^>]*>Continue<\/button>/);
    expect(branchA("readiness", null)).toMatch(/<button[^>]*disabled=""[^>]*>Continue<\/button>/);
  });
});

describe("S4 the still-writing note is read before choosing", () => {
  it("absent on arrival and on the other two choices; present while 'Still being written' is selected", () => {
    expect(STILL_WRITING_LEAD).toBe("Still writing?");
    expect(STILL_WRITING_NOTE).toBe("QueryHawk comes into its own once you're ready to query. While you finish the book, you can get a head start researching agents who'd suit it.");
    expect(branchA("readiness", null)).not.toContain("Still writing?");
    expect(branchA("readiness", ManuscriptStatus.REVISING)).not.toContain("Still writing?");
    expect(branchA("readiness", ManuscriptStatus.READY_TO_QUERY)).not.toContain("Still writing?");
    const on = branchA("readiness", ManuscriptStatus.DRAFTING);
    expect(on).toContain(`<strong>${STILL_WRITING_LEAD}</strong> ${esc(STILL_WRITING_NOTE)}`);
  });
  it("…and it no longer appears on the details screen", () => {
    const still = branchA("details", ManuscriptStatus.DRAFTING);
    expect(still).not.toContain("comes into its own");
    expect(still).not.toContain("sf-note");
  });
});

describe("S3 the manuscript fields kept every label, option and placeholder", () => {
  /* The baseline was read off the unchanged component before the first edit of this pack. */
  const was = JSON.parse(readFileSync(resolve(process.cwd(), "reports/onb-v5-setup/baseline/manuscriptFields.json"), "utf8"));
  const read = (html: string) => ({
    labels: [...html.matchAll(/<label[^>]*>([\s\S]*?)<\/label>/g)].map((m) => m[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()),
    placeholders: [...html.matchAll(/placeholder="([^"]*)"/g)].map((m) => m[1]),
    options: [...html.matchAll(/role="option"[^>]*>([\s\S]*?)<\/div>/g)].map((m) => m[1].replace(/<[^>]+>/g, "").replace("✓", "").trim()),
    selectPlaceholders: [...html.matchAll(/sa-placeholder[^>]*>([^<]*)</g)].map((m) => m[1].trim()),
    links: [...html.matchAll(/<button[^>]*>([\s\S]*?)<\/button>/g)].map((m) => m[1].replace(/<[^>]+>/g, "").trim()).filter(Boolean),
  });
  const cases: Record<string, React.ReactElement> = {
    full: <ManuscriptFields value={emptyManuscriptFields()} onChange={noop} />,
    filled: <ManuscriptFields value={{ ...emptyManuscriptFields(), genre: "Fantasy", subGenres: ["Romance"] }} onChange={noop} />,
    stillWriting: <ManuscriptFields value={emptyManuscriptFields()} onChange={noop} titleLabel="Working title" titleOptional showStrapline={false} showWordCount={false} />,
  };
  for (const [name, node] of Object.entries(cases)) {
    it(`${name}: the text sets equal the baseline`, () => {
      const now = read(renderToStaticMarkup(node));
      expect(was[name].options.length, "the baseline holds real options").toBeGreaterThan(10);
      expect(now).toEqual(was[name]);
    });
  }
  it("genre and age category are pick-lists, not free text", () => {
    const h = renderToStaticMarkup(cases.full);
    expect(h.match(/aria-haspopup="listbox"/g)!.length).toBe(2);
    expect(h.match(/<input/g)!.length, "title, strapline and word count are the only inputs").toBe(3);
  });
});
