/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Quick add's model — and the one thing in it that is a security boundary.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  QUICK_ORDER, commitTypedGenre, emptyQuickFields, hrefFor, isLiveHref, nextQuickField,
  normaliseSubmissionsUrl, quickDiff, quickWarning,
} from "./quickAdd";

const agent = (over: Partial<Parameters<typeof emptyQuickFields>[0]> = {}) => ({
  email: "", website: "", city: "", country: "", genres: [] as string[], ...over,
});

/** A tab, a newline and a NUL, built rather than typed — so what is under test is unambiguous. */
const TAB = String.fromCharCode(9);
const LF = String.fromCharCode(10);
const NUL = String.fromCharCode(0);

/**
 * ⚠️ AN ALLOWLIST BY CONSTRUCTION, NOT A DENYLIST — and the difference is the whole of this
 * describe. A denylist hunting for the word loses to a change of case, to a tab inside it, to a
 * leading NUL, and to whatever the next parser quirk turns out to be. The rule here is total: a
 * stored value either already begins http(s):// or it becomes the PATH of an https URL.
 */
describe("the submissions-page normaliser is a scheme allowlist", () => {
  it("keeps an http(s) address as it is", () => {
    expect(normaliseSubmissionsUrl("https://agency.co.uk")).toBe("https://agency.co.uk");
    expect(normaliseSubmissionsUrl("http://agency.co.uk")).toBe("http://agency.co.uk");
    expect(normaliseSubmissionsUrl("HTTPS://Agency.co.uk")).toBe("HTTPS://Agency.co.uk");
  });

  it("prefixes https:// when the scheme is left off", () => {
    expect(normaliseSubmissionsUrl("agency.co.uk/submissions")).toBe("https://agency.co.uk/submissions");
    expect(normaliseSubmissionsUrl("  agency.co.uk  ")).toBe("https://agency.co.uk");
    /* a protocol-relative value loses its slashes, so the host survives as the host */
    expect(normaliseSubmissionsUrl("//agency.co.uk")).toBe("https://agency.co.uk");
  });

  /* ⚠️ THE ONE THAT MATTERS. Every one of these is stored — "validation warns, never blocks" —
     and not one can come back out as a live scheme. */
  it("NO input produces a dangerous scheme, however it is spelled", () => {
    const attacks = [
      "javascript:alert(1)",
      "JaVaScRiPt:alert(1)",
      "  javascript:alert(1)  ",
      "java" + TAB + "script:alert(1)",
      "java" + LF + "script:alert(1)",
      NUL + "javascript:alert(1)",
      "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
      "DATA:text/html,<script>alert(1)</script>",
      "vbscript:msgbox(1)",
      "file:///etc/passwd",
    ];
    for (const raw of attacks) {
      const stored = normaliseSubmissionsUrl(raw);
      expect(stored, JSON.stringify(raw) + " kept a dangerous scheme").toMatch(/^https?:\/\//i);
      expect(hrefFor(stored), JSON.stringify(raw) + " produced a live href with a bad scheme").toMatch(/^https?:\/\//i);
      /* and the value is NOT lost — it is stored, inert, and the writer can still see what they typed */
      expect(stored.length, JSON.stringify(raw) + " was silently discarded").toBeGreaterThan("https://".length);
    }
  });

  it("an empty value stores nothing at all", () => {
    expect(normaliseSubmissionsUrl("")).toBe("");
    expect(normaliseSubmissionsUrl("   ")).toBe("");
    expect(hrefFor("")).toBeNull();
  });

  /* ⚠️ THE RENDER-SIDE GUARD IS SEPARATE, because a value can reach the store by another route —
     an import, a legacy record, a hand-edit — and "it was stored" is not evidence it is safe. */
  it("isLiveHref refuses anything that is not http(s), whatever is in the store", () => {
    expect(isLiveHref("https://a.co")).toBe(true);
    expect(isLiveHref("javascript:alert(1)")).toBe(false);
    expect(isLiveHref("data:text/html,x")).toBe(false);
    expect(hrefFor("javascript:alert(1)"), "a legacy dangerous value became a live href").toMatch(/^https:\/\//);
  });

  /* ⚠️ NO RENDER SITE MAY BUILD ITS OWN HREF. Three of them did it with an inline regex, and three
     copies of a security test is two chances to fix only some of them. */
  it("every surface that renders the address goes through one function", () => {
    for (const rel of ["../components/agents/AgentListView.tsx", "../components/agents/ContactPeek.tsx", "../components/agents/AgentCard.tsx"]) {
      const src = readFileSync(new URL(rel, import.meta.url), "utf8");
      expect(src, rel + " builds its own href instead of calling hrefFor").not.toMatch(/https:\/\/\$\{/);
      expect(src, rel + " does not use the shared href builder").toMatch(/hrefFor|isLiveHref/);
    }
  });
});

describe("the warnings advise, they never gate", () => {
  it("a malformed email says so", () => {
    expect(quickWarning("email", "not-an-email")).toContain("doesn't look like an email");
    expect(quickWarning("email", "a@b.co")).toBeNull();
  });

  /* ⚠️ AND IT STILL SAVES — the sentence says so, and the diff proves it. */
  it("…and the malformed value is still written", () => {
    expect(quickDiff("email", { value: "not-an-email" })).toEqual({ email: "not-an-email" });
  });

  /* ⚠️ A REWRITE THE READER WAS NOT TOLD ABOUT IS WORSE THAN A REFUSAL — far more likely a
     mailto: typed into the wrong field than an attack. */
  it("a non-web scheme is warned about before it is rewritten", () => {
    expect(quickWarning("website", "mailto:a@b.co")).toContain("Only web addresses");
    expect(quickWarning("website", "javascript:alert(1)")).toContain("Only web addresses");
    expect(quickWarning("website", "agency.co.uk")).toContain("https://");
    expect(quickWarning("website", "https://agency.co.uk")).toBeNull();
    expect(quickWarning("website", "two words")).toContain("spaces");
  });
});

describe("the diff, and what counts as nothing", () => {
  /* ⚠️ updateAgent APPENDS AN ACTIVITY PER CALL, so an empty save would put a line in the
     writer's history saying something happened when nothing did. */
  it("an empty field writes nothing", () => {
    expect(quickDiff("email", { value: "   " })).toBeNull();
    expect(quickDiff("website", { value: "" })).toBeNull();
    expect(quickDiff("location", { location: { city: " ", country: "" } })).toBeNull();
    expect(quickDiff("genres", { genres: [] })).toBeNull();
    expect(quickDiff("genres", { genres: ["  "] })).toBeNull();
  });

  it("the address is normalised on the way into the diff, not on the way out", () => {
    expect(quickDiff("website", { value: "agency.co.uk" })).toEqual({ website: "https://agency.co.uk" });
    expect(quickDiff("website", { value: "javascript:alert(1)" })).toEqual({ website: "https://javascript:alert(1)" });
  });

  /* a city without a country cannot draw a flag — which is why they are one popover and one write */
  it("city and country travel together, and either alone is still a fact", () => {
    expect(quickDiff("location", { location: { city: "Bristol", country: "United Kingdom" } })).toEqual({ city: "Bristol", country: "United Kingdom" });
    expect(quickDiff("location", { location: { city: "Bristol", country: "" } })).toEqual({ city: "Bristol", country: "" });
  });
});

describe("where Tab goes", () => {
  it("walks the columns in the order they are read", () => {
    expect(QUICK_ORDER).toEqual(["email", "website", "location", "genres"]);
    expect(emptyQuickFields(agent())).toEqual(["email", "website", "location", "genres"]);
    expect(emptyQuickFields(agent({ email: "a@b.co", genres: ["Crime"] }))).toEqual(["website", "location"]);
  });

  it("goes to the next empty field after the one just filled", () => {
    expect(nextQuickField(agent({ email: "a@b.co" }), "email")).toBe("website");
    expect(nextQuickField(agent({ email: "a@b.co", website: "https://x" }), "email")).toBe("location");
  });

  /* ⚠️ IT STOPS AT THE END OF THE ROW. A keystroke that silently moves you to a different record
     is a data-entry hazard: you would be three fields into somebody else's details before
     anything on screen told you the row had changed. */
  it("stops at the end of the row — it never names another agent", () => {
    const full = agent({ email: "a@b.co", website: "https://x", city: "London", country: "UK", genres: ["Crime"] });
    expect(nextQuickField(full, "genres")).toBeNull();
    expect(nextQuickField(agent({ genres: ["Crime"] }), "genres")).toBe("email");
    const src = readFileSync(new URL("./quickAdd.ts", import.meta.url), "utf8");
    expect(src, "the walk takes a list of agents — it can only ever see one").not.toMatch(/Agent\[\]/);
  });
});

describe("a typed genre is committed, never discarded", () => {
  const SUGG = ["Historical fiction", "Crime", "Literary fiction"];

  it("commits what is in the field", () => {
    expect(commitTypedGenre("Saga", [], SUGG)).toEqual(["Saga"]);
  });

  /* ⚠️ THE FAULT IT EXISTS FOR: Enter used to save the PICKED chips and throw the field away, so
     typing a genre and pressing Enter closed the popover having written nothing. */
  it("a genre matching a suggestion takes the suggestion's own spelling", () => {
    expect(commitTypedGenre("historical FICTION", [], SUGG)).toEqual(["Historical fiction"]);
  });

  it("a genre that matches no suggestion is kept exactly as typed — the list is a convenience", () => {
    expect(commitTypedGenre("Nautical thriller", ["Crime"], SUGG)).toEqual(["Crime", "Nautical thriller"]);
  });

  it("an already-picked genre is not added twice, whatever the case", () => {
    expect(commitTypedGenre("crime", ["Crime"], SUGG)).toBeNull();
  });

  it("an empty field commits nothing, so Enter falls through to the save", () => {
    expect(commitTypedGenre("   ", ["Crime"], SUGG)).toBeNull();
  });
});
