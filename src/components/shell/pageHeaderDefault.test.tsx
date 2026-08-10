/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ THE DEFAULT VARIANT'S OUTPUT IS FROZEN. THIS IS THE CONTRACT THE WHOLE PACK RESTS ON.
 *
 * `PageHeader` is mounted by ten pages. Five of them — Manuscripts, Comparable titles, Import,
 * Help centre and Plans — are NOT meant to get the band, and they are protected by nothing except
 * the fact that they never pass `variant="band"`. That protection is only real if adding the band
 * left the default path untouched.
 *
 * So this asserts the rendered markup of `variant="full"` **character for character**, against a
 * string captured before the band existed. It fails if anyone alters default rendering — which is
 * exactly what it is for. If it fails and the change was intended, the frozen string is updated in
 * the SAME commit as the change, deliberately, never as a green-ing fix.
 */
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { PageHeader } from "./PageHeader";

const render = (el: React.ReactElement) => renderToStaticMarkup(el);

describe("⚠️ the default variant is frozen", () => {
  it("title only — byte for byte", () => {
    expect(render(<PageHeader title="Help centre" />)).toBe(
      '<header class="svh svh--full"><div class="svh-top"><div class="svh-txt">'
      + '<h1 class="svh-title">Help centre</h1></div></div><div class="svh-rule"></div></header>'
    );
  });

  it("title + description + one action — byte for byte", () => {
    const out = render(
      <PageHeader
        title="Your agent list"
        description="Everyone you're querying."
        actions={[{ label: "Add new agent", onClick: () => {} }]}
      />
    );
    expect(out).toBe(
      '<header class="svh svh--full"><div class="svh-top"><div class="svh-txt">'
      + '<h1 class="svh-title">Your agent list</h1>'
      + '<div class="svh-sub">Everyone you&#x27;re querying.</div></div></div>'
      + '<div class="svh-tools"><button type="button" class="svh-btn svh-btn-ghost">Add new agent</button></div>'
      + '<div class="svh-rule"></div></header>'
    );
  });

  it("⚠️ an explicit variant=\"full\" is identical to omitting it", () => {
    expect(render(<PageHeader variant="full" title="T" />)).toBe(render(<PageHeader title="T" />));
  });

  it("⚠️ the band's props are INERT on the default — passing them changes nothing", () => {
    // a page that adds a count before flipping its variant must not half-render the band
    expect(render(<PageHeader title="T" count="9 THINGS" mark="queries" />))
      .toBe(render(<PageHeader title="T" />));
  });

  it("the default still renders its closing rule", () => {
    expect(render(<PageHeader title="T" />)).toContain('<div class="svh-rule">');
  });
});

describe("the band variant", () => {
  it("renders title, count, mark and actions", () => {
    const out = render(
      <PageHeader
        variant="band"
        title="Query Centre"
        mark="queries"
        count="22 ACTIVE · 3 AWAITING"
        actions={[{ label: "Export", onClick: () => {} }, { label: "Log query", onClick: () => {}, primary: true }]}
      />
    );
    expect(out).toContain('class="pb"');
    expect(out).toContain('class="pb-title">Query Centre');
    expect(out).toContain("22 ACTIVE · 3 AWAITING");
    expect(out).toContain('data-mark="queries"');
    expect(out).toContain("pb-btn-primary");
  });

  it("⚠️ NO count element at all when count is absent — not an empty strip", () => {
    // an empty `.pb-count` would draw its 1px divider against the title with nothing after it
    const out = render(<PageHeader variant="band" title="Settings" mark="settings" />);
    expect(out).not.toContain("pb-count");
  });

  it("⚠️ LAYOUT IS ON THE INNER ROW — `.pb` carries the ground, `.pb-row` the flex", () => {
    const out = render(<PageHeader variant="band" title="T" mark="todo" />);
    expect(out).toContain('<header class="pb"><div class="pb-row">');
  });

  it("every mark key renders", () => {
    for (const m of ["queries", "todo", "calendar", "contacts", "packages", "analytics",
      "noteboard", "discover", "settings"] as const) {
      expect(render(<PageHeader variant="band" title="T" mark={m} />), m).toContain(`data-mark="${m}"`);
    }
  });
});

describe("⚠️ the shell never mounts PageHeader", () => {
  it("no shell component renders it — or the Dashboard gets a band the day a route is added", () => {
    const { readFileSync, readdirSync } = require("node:fs") as typeof import("node:fs");
    const { join } = require("node:path") as typeof import("node:path");
    for (const f of readdirSync(__dirname).filter((n) => n.endsWith(".tsx") && !n.includes(".test."))) {
      if (f === "PageHeader.tsx") continue;
      expect(readFileSync(join(__dirname, f), "utf8"), `${f} must not mount PageHeader`)
        .not.toMatch(/<PageHeader/);
    }
  });
});
