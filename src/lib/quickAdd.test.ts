/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The agent link + genre hygiene — and the one thing in it that is a security boundary.
 *
 * ⚠️ THE QUICK-ADD STRIP'S OWN MODEL IS RETIRED (v11 P4, 25 Sep) — the Tab walk, the per-field
 * diff and the advisory warnings left with the flip card that rendered them (recoverable at
 * 2d160183's parent). What is locked here is what still has a caller: the scheme allowlist the
 * pop-up's Website link renders through, and the typed-genre commit the pop-up form's "+ Other"
 * input goes through.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { commitTypedGenre, hrefFor, isLiveHref, normaliseSubmissionsUrl } from "./quickAdd";

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
    /* Agent card v1: the card's quick view is the ONE renderer of the stored address — the pop-up
       retired with its edit face in P3, as the peek and the flip card had before it. The editor
       shows the cleaned domain as TEXT, never a link. A new renderer joins this list, never builds
       its own. */
    for (const rel of ["../components/agents/card/AgentQuickView.tsx", "./agentCard.ts"]) {
      const src = readFileSync(new URL(rel, import.meta.url), "utf8");
      expect(src, rel + " builds its own href instead of calling hrefFor").not.toMatch(/https:\/\/\$\{/);
      expect(src, rel + " does not use the shared href builder").toMatch(/hrefFor|isLiveHref/);
    }
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

  /* ⚠️ AND THE CARD CONSUMES IT (Agent card v1 §5) — a typed genre reaches the list ONLY through
     the deliberate "+ Add “…” as a new genre", whose handler canonicalises against EVERY source
     before anything becomes the writer's own. A raw push of the typed text in the chip field is
     the case-duplicate fault this function exists to prevent, reintroduced one component along. */
  it("the card's new-genre path goes through commitTypedGenre, and the chip field never pushes what was typed", () => {
    const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/[^\n]*/gm, "");
    const host = strip(readFileSync(new URL("../components/agents/card/AgentCardHost.tsx", import.meta.url), "utf8"));
    const at = host.indexOf("const onNewGenre");
    expect(at, "the new-genre handler left the host").toBeGreaterThan(-1);
    const handler = host.slice(at, host.indexOf("}, [", at));
    expect(handler, "the new-genre path stopped canonicalising").toContain("commitTypedGenre(");
    expect(handler, "the canonical check stopped reading every source").toMatch(/AGENT_GENRES/);
    expect(handler, "a genuinely new genre stopped going through addPersonalGenre (the cap of ten)").toContain("addPersonalGenre(");
    const inputs = strip(readFileSync(new URL("../components/agents/card/cardInputs.tsx", import.meta.url), "utf8"));
    const field = inputs.slice(inputs.indexOf("export const GenreField"), inputs.indexOf("/* ── steppers"));
    expect(field.length, "GenreField moved — re-anchor this lock").toBeGreaterThan(200);
    expect(field, "a pick of the new-genre row stopped handing the typed text to onNew").toMatch(/x\.isNew[\s\S]{0,80}onNew\(x\.value\)/);
    expect(field, "the chip field pushed the typed text straight into the list").not.toMatch(/onGenres\(\[\.\.\.genres,\s*q/);
  });
});
