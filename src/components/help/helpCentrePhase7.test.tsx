/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Non-workspace v1, Phase 7 — the Help centre (design-refs/help-centre-v1.html, the Redesign view). Render to string,
 * node env, no jsdom (see src/test/pageSmoke.tsx).
 *
 *   NW7-D   a draft article's URL (and an unknown one) shows the not-found screen, signed in and signed out
 *   NW7-E   search: the ref's empty state for nonsense, with its one filled button; answers for a body word
 *   NW7-R   signed out and signed in both render, the home and the article; signed out, in the public shell
 *   NW7-A   App reads `readableSignedOut` before the sign-in screen, and renders the Help centre in MarketingShell there
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { readFileSync } from "fs";
import { resolve } from "path";
import { renderToStaticMarkup } from "react-dom/server";
import { renderPage, renderPageSeeded, noNavigate, useSignedOutDb, restoreSmokeUser } from "../../test/pageSmoke";

vi.mock("../../lib/db", async () => (await import("../../test/pageSmoke")).dbMock());
vi.mock("../../lib/firebase", async () => (await import("../../test/pageSmoke")).firebaseMock());
vi.mock("../toast/ToastProvider", async () => (await import("../../test/pageSmoke")).toastMock());

import { HelpCentre } from "../HelpCentre";
import { NOT_FOUND } from "../NotFoundCard";
import { HELP_HOME, SearchAnswers } from "./HelpHome";
import { HELP_ARTICLE } from "./HelpArticlePage";
import { MarketingShell } from "../../marketing/MarketingShell";
import { readableSignedOut, tierForPath } from "../../marketing/routeTiers";
import { WRITTEN_ARTICLES } from "../../content/help/articles";
import { searchArticles } from "../../content/help/search";

const un = (html: string) => html.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
const primaries = (html: string) => (html.match(/class="ph-primary[" ]/g) ?? []).length;

afterEach(() => restoreSmokeUser());

describe("NW7-D · a draft article's URL shows the not-found screen", () => {
  const draft = WRITTEN_ARTICLES.find((a) => a.draft)!.slug;
  it("signed in: the app's not-found card, with its app ways on", () => {
    const html = un(renderPage(<HelpCentre />, `/help/${draft}`));
    expect(html).toContain(NOT_FOUND.heading);
    expect(html).toContain(NOT_FOUND.home);
    expect(html).not.toContain('data-hc="article"');
  });
  it("every draft, and a slug that names nothing, is not found; the published article is", () => {
    for (const a of WRITTEN_ARTICLES.filter((x) => x.draft)) {
      expect(un(renderPage(<HelpCentre />, `/help/${a.slug}`)), a.slug).toContain(NOT_FOUND.heading);
    }
    expect(un(renderPage(<HelpCentre />, "/help/no-such-article"))).toContain(NOT_FOUND.heading);
    const pub = un(renderPage(<HelpCentre />, "/help/add-an-agent"));
    expect(pub).not.toContain(NOT_FOUND.heading);
    expect(pub).toContain('data-hc="article"');
  });
  it("signed out: the same heading and body, with ways on that need no account", () => {
    useSignedOutDb();
    const html = un(renderPage(<HelpCentre />, `/help/${draft}`));
    expect(html).toContain(NOT_FOUND.heading);
    expect(html).toContain(NOT_FOUND.body);
    expect(html).toContain(NOT_FOUND.helpHome);
    expect(html).not.toContain(NOT_FOUND.home);
    expect(primaries(html)).toBe(1);
  });
  it("the home lists no draft", () => {
    const html = un(renderPageSeeded(<HelpCentre />, "/help"));
    for (const a of WRITTEN_ARTICLES.filter((x) => x.draft)) expect(html, a.slug).not.toContain(`data-slug="${a.slug}"`);
    expect(html).toContain('data-slug="add-an-agent"');
  });
});

describe("NW7-E · the search's two states", () => {
  const render = (term: string) => un(renderToStaticMarkup(
    <SearchAnswers term={term} hits={searchArticles(term)} onOpen={() => {}} onTellMissing={() => {}} />,
  ));
  it("nonsense shows the ref's empty state and its one filled button", () => {
    const html = render("zzqxv");
    expect(html).toContain(HELP_HOME.none("zzqxv"));
    expect(html).toContain('Nothing for "zzqxv" yet');
    expect(html).toContain("We haven't written that one. Tell us what you were looking for and we'll add it.");
    expect(html).toContain("Tell us what's missing");
    expect(primaries(html)).toBe(1);
  });
  it("a word only in a published article's body is answered", () => {
    const html = render("wishlist");
    expect(html).toContain('1 answer for "wishlist"');
    expect(html).toContain('data-slug="add-an-agent"');
    expect(html).not.toContain("Nothing for");
  });
});

describe("NW7-R · signed out and signed in both render", () => {
  it("signed in: the home, its heading, its rail and one filled button at most", () => {
    const html = un(renderPageSeeded(<HelpCentre />, "/help"));
    expect(html).toContain(HELP_HOME.h1);
    expect(html).toContain(HELP_HOME.browse);
    expect(html).toContain(HELP_HOME.newH);
    expect(html).toContain("Agency names survive an import in capitals");
    expect(primaries(html)).toBeLessThanOrEqual(1);
  });
  it("signed in: the article, its crumb, its meta, Show me and Did this help?", () => {
    const html = un(renderPage(<HelpCentre />, "/help/add-an-agent"));
    expect(html).toContain("Add an agent");
    expect(html).toContain(HELP_ARTICLE.crumb);
    expect(html).toMatch(/\d+ (min|sec) to read · Checked 20 October 2026/);
    expect(html).toContain(HELP_ARTICLE.showMe);
    expect(html).toContain(HELP_ARTICLE.helped);
    expect(primaries(html)).toBe(1);
  });
  it("signed out, inside the public shell: the home and the article, with nothing that needs an account", () => {
    useSignedOutDb();
    const home = un(renderPage(<MarketingShell user={null} onNavigate={noNavigate} path="/help"><HelpCentre /></MarketingShell>, "/help"));
    expect(home).toContain(HELP_HOME.h1);
    expect(home).toContain('data-slug="add-an-agent"');
    expect(home).not.toContain(HELP_HOME.forYou);
    expect(home).not.toContain(HELP_HOME.newLink);
    const art = un(renderPage(<MarketingShell user={null} onNavigate={noNavigate} path="/help/add-an-agent"><HelpCentre /></MarketingShell>, "/help/add-an-agent"));
    expect(art).toContain('data-hc="article"');
    expect(art).not.toContain(HELP_ARTICLE.showMe);
    expect(art).not.toContain(HELP_ARTICLE.helped);
  });
  it("the route: readable signed out, and still a workspace page", () => {
    expect(readableSignedOut("/help")).toBe(true);
    expect(readableSignedOut("/help/add-an-agent")).toBe(true);
    expect(readableSignedOut("/help/log-a-query")).toBe(true);
    expect(readableSignedOut("/agents")).toBe(false);
    expect(readableSignedOut("/helpdesk")).toBe(false);
    expect(tierForPath("/help")).toBe("workspace");
  });
});

describe("NW7-A · App renders the Help centre signed out in the public shell, ahead of the sign-in screen", () => {
  const app = readFileSync(resolve(__dirname, "../../App.tsx"), "utf8");
  it("the branch comes before the sign-in gate and wraps HelpCentre in MarketingShell", () => {
    const branch = app.indexOf("if (!currentUser && readableSignedOut(path))");
    const gate = app.indexOf("if (!currentUser) {");
    expect(branch).toBeGreaterThan(-1);
    expect(gate).toBeGreaterThan(-1);
    expect(branch).toBeLessThan(gate);
    const body = app.slice(branch, branch + 400);
    expect(body).toContain("<MarketingShell user={null}");
    expect(body).toContain("<HelpCentre />");
  });
});
