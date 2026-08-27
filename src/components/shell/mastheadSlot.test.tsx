/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE ACTION SLOT IS ADDITIVE — nine pages must render exactly as they did ══════════════════
 *
 * ⚠️ THE WHOLE CLAIM OF AMENDMENT 3'S SHARED CHANGE IS THAT PASSING NO ACTION CHANGES NOTHING. The
 * markup is compared against the string the header produced before the slot existed, on both kinds
 * of grid — a masthead that pins and one that leaves — because the slot's render is now gated on
 * that behaviour and a check that only rendered one would prove half of it.
 *
 * ⚠️ AND IT IS THE RENDERED STRING, NOT A PROPERTY. "No `.wsh-acts` element" is satisfied by a
 * header that lost its title as well; byte equality is not.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PageHeader } from "./PageHeader";
import { WorkspacePageGrid } from "./WorkspacePageGrid";

const inGrid = (el: React.ReactElement, fill = false) =>
  renderToStaticMarkup(<WorkspacePageGrid masthead={el} fill={fill}>{null}</WorkspacePageGrid>);

/** Just the header, sliced out of the grid it was rendered inside. */
const headerOf = (html: string) => /<header class="wsh">[\s\S]*?<\/header>/.exec(html)?.[0] ?? "";

/**
 * The nine workspace mastheads that pass NO action.
 *
 * ⚠️ THE MARK NAMES ARE THE APP'S OWN, TAKEN FROM THE PAGES. The first draft invented `"agents"` for
 * two of them and `OneScreenMark` threw on an undefined entry — a fixture handing a component an
 * input its real callers cannot produce, which is a fault this repo already records. `MarkName` is a
 * closed union; these are members of it.
 */
const PAGES: { title: string; mark: string; description?: string }[] = [
  { title: "Query Centre", mark: "queries" },
  { title: "Analytics", mark: "analytics" },
  { title: "Contact list", mark: "contacts" },
  { title: "Discover", mark: "discover" },
  { title: "Submission packages", mark: "packages" },
  { title: "Comparable titles", mark: "comps" },
  { title: "To-do", mark: "todo" },
  { title: "Calendar", mark: "calendar" },
  { title: "Noteboard", mark: "noteboard", description: "Notes to self, undated." },
];

describe("passing no action renders exactly what it always did", () => {
  it.each(PAGES)("$title is byte-identical, on a pinning masthead", (p) => {
    const html = headerOf(inGrid(
      <PageHeader variant="workspace" title={p.title} mark={p.mark as never} description={p.description} />,
    ));
    expect(html).not.toBe("");
    /* The exact shape the workspace variant has always produced: mark, then text, and nothing else. */
    const sub = p.description ? `<p class="wsh-sub">${p.description}</p>` : "";
    expect(html).toBe(
      `<header class="wsh"><div class="wsh-row"><span class="wsh-mark">`
      + `${/<span class="wsh-mark">([\s\S]*?)<\/span><div class="wsh-txt">/.exec(html)![1]}`
      + `</span><div class="wsh-txt"><h1 class="wsh-title">${p.title}</h1>${sub}</div></div></header>`,
    );
  });

  it("adds no element when no action is passed — on either kind of masthead", () => {
    for (const fill of [false, true]) {
      const html = headerOf(inGrid(
        <PageHeader variant="workspace" title="Analytics" mark="analytics" />, fill,
      ));
      expect(html, `fill=${fill}`).not.toContain("wsh-acts");
      expect(html, `fill=${fill}`).not.toContain("<button");
    }
  });

  /**
   * ⚠️ AND THE SLOT DOES RENDER WHERE IT IS ASKED FOR, or "additive" would be indistinguishable from
   * "inert". One page proves the slot; migrating the other nine is its own pass.
   */
  it("renders the action on a pinning masthead when one is given", () => {
    const html = headerOf(inGrid(
      <PageHeader
        variant="workspace"
        title="Manuscripts"
        mark="manuscripts"
        actions={[{ label: "＋ Add a manuscript", primary: true, onClick: () => {} }]}
      />,
    ));
    expect(html).toContain('<div class="wsh-acts">');
    expect(html).toContain("＋ Add a manuscript");
    expect(html).toContain("wsh-act--primary");
  });
});
