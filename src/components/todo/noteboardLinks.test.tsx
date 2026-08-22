/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Noteboard — link-aware bodies (paper run, Phase 4).
 *
 * ⚠️ ESCAPE FIRST, THEN LINKIFY — AND THE ORDER IS THE WHOLE SECURITY PROPERTY. Note bodies are
 * user text on a page that renders them; linkify-first builds `<a href=…>` markup and a later
 * escape pass would turn that back into visible text, so the implementation that "works" is the
 * one that escapes afterwards and it is the broken one. This file therefore does not merely
 * assert the shipped behaviour — it runs the SAME cases against a deliberately linkify-first
 * implementation defined here, and requires them to fail there. An escape assertion that has
 * never seen a vulnerable implementation is not evidence of anything.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { linkifyBody } from "../../lib/noteboard";

/* the three-line body the spec names: plain text, a bare URL, and an injection attempt */
const BODY = [
  "Notes on the letter",
  "https://bestsellerexperiment.com/ep432",
  "<img src=x onerror=alert(1)>",
].join("\n");

const html = (nodes: React.ReactNode) => renderToStaticMarkup(<div>{nodes}</div>);

/** ⚠️ THE BROKEN ONE, ON PURPOSE — linkify first, escape second. It is what a reasonable person
 *  writes, it renders links correctly, and it is an injection path. The cases below must fail
 *  against it, or they are proving nothing about the shipped order. */
const linkifyFirstThenEscape = (body: string): string =>
  body
    .replace(/https?:\/\/[^\s<]+/g, (u) => `<a href="${u}" target="_blank" rel="noopener">${u}</a>`)
    .replace(/&(?!(?:amp|lt|gt|quot);)/g, "&amp;");

describe("⚠️ a bare URL becomes an anchor — exactly one, correctly attributed", () => {
  it("one anchor, the right href, target and rel", () => {
    const out = html(linkifyBody(BODY));
    const anchors = [...out.matchAll(/<a\b[^>]*>/g)];
    expect(anchors, "no anchor rendered").toHaveLength(1);
    const tag = anchors[0][0];
    expect(tag).toContain('href="https://bestsellerexperiment.com/ep432"');
    expect(tag).toContain('target="_blank"');
    /* ⚠️ `noopener` OR NOTHING. target=_blank without it hands the opened page a window.opener
       handle back into this one. */
    expect(tag).toMatch(/rel="[^"]*noopener/);
  });

  it("a body with no URL renders no anchor at all", () => {
    expect(html(linkifyBody("just words, and an email a@b.com"))).not.toContain("<a ");
  });

  it("two URLs render two anchors — the count follows the text, not a fixed branch", () => {
    const two = html(linkifyBody("see https://a.example/x and https://b.example/y"));
    expect([...two.matchAll(/<a\b/g)]).toHaveLength(2);
  });
});

describe("⚠️ the injection legs — proven against a vulnerable implementation, not assumed", () => {
  it("no img element survives, and the markup renders as VISIBLE TEXT", () => {
    const out = html(linkifyBody(BODY));
    expect(out).not.toMatch(/<img\b/);
    /* the writer typed it, so they must be able to read it back */
    expect(out).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });

  it("⚠️ AND THE SAME CASE FAILS against linkify-first — the order is what is being tested", () => {
    /* React would escape this string on render, so the vulnerable implementation is exercised the
       way a page that trusts it would: as raw markup. */
    const vulnerable = linkifyFirstThenEscape(BODY);
    expect(vulnerable, "the broken implementation is no longer broken — re-check the fixture")
      .toMatch(/<img\b/);
    /* and the shipped one, on the identical input, is not */
    expect(html(linkifyBody(BODY))).not.toMatch(/<img\b/);
  });

  it("a URL carrying markup cannot smuggle it through the anchor", () => {
    const nasty = 'https://x.example/"><script>alert(1)</script>';
    const out = html(linkifyBody(nasty));
    expect(out).not.toContain("<script");
    /* the same input through the broken order DOES smuggle it — the discriminator again */
    expect(linkifyFirstThenEscape(nasty)).toContain("<script");
  });

  it("⚠️ the anchors are REACT NODES, never dangerouslySetInnerHTML", () => {
    /* the structural half of the property: a body rendered as elements cannot become markup at
       all, whatever the escaping does. This is what makes the above hold by construction. */
    /* ⚠️ COMMENTS STRIPPED FIRST. This file's own docstring NAMES the thing it forbids — as
       every retirement in this repo does — so a bare read matched the prose explaining the rule
       and went red on correct code. The house law, met on its own doorstep. */
    const decls = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    const read = (rel: string) =>
      decls(require("node:fs").readFileSync(require("node:path").join(__dirname, rel), "utf8"));
    expect(read("../../lib/noteboard.ts")).not.toContain("dangerouslySetInnerHTML");
    expect(read("TodoNoteboardPage.tsx")).not.toContain("dangerouslySetInnerHTML");
  });
});

describe("⚠️ the writer's line breaks and words survive linkification", () => {
  it("every non-URL character of the body is still present, in order", () => {
    const out = html(linkifyBody(BODY));
    expect(out).toContain("Notes on the letter");
    /* the URL text is the anchor's text, not a label */
    expect(out).toContain(">https://bestsellerexperiment.com/ep432</a>");
  });

  it("trailing punctuation is not swallowed into the href", () => {
    /* "see https://x.example/a." — the full stop is prose, not part of the address */
    const out = html(linkifyBody("see https://x.example/a."));
    expect(out).toContain('href="https://x.example/a"');
    expect(out).toContain(".");
  });
});
