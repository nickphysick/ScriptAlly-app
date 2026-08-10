/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ THE DEFAULT VARIANT'S OUTPUT IS FROZEN. THIS IS THE CONTRACT THE WHOLE PACK RESTS ON.
 *
 * `PageHeader` is mounted by ten pages. Five of them — Manuscripts, Comparable titles, Import,
 * Help centre and Plans — are NOT meant to get the band, and they are protected by nothing except
 * the fact that they never pass `variant="workspace"`. That protection is only real if adding the band
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

  it("⚠️ the workspace props are INERT on the default — passing them changes nothing", () => {
    // a page that adds a count before flipping its variant must not half-render the band
    expect(render(<PageHeader title="T" count="9 THINGS" mark="queries" />))
      .toBe(render(<PageHeader title="T" />));
  });

  it("the default still renders its closing rule", () => {
    expect(render(<PageHeader title="T" />)).toContain('<div class="svh-rule">');
  });
});

describe("the workspace variant", () => {
  it("renders title, count, mark and actions", () => {
    const out = render(
      <PageHeader
        variant="workspace"
        title="Query Centre"
        mark="queries"
        count="22 ACTIVE · 3 AWAITING"
        actions={[{ label: "Export", onClick: () => {} }, { label: "Log query", onClick: () => {}, primary: true }]}
      />
    );
    expect(out).toMatch(/class="wsh( wsh--solo)?"/);
    expect(out).toContain("Query Centre");
    expect(out).toContain("22 ACTIVE · 3 AWAITING");
    expect(out).toContain('data-mark="queries"');
    /* ⚠️ THE EXISTING INK BUTTON, REUSED — not a new class of this variant's own. */
    expect(out).toContain("svh-btn-ink");
  });

  it("⚠️ NO count element at all when count is absent — not an empty strip", () => {
    // an empty `.wsh-count` would draw its 1px divider against the title with nothing after it
    const out = render(<PageHeader variant="workspace" title="Settings" mark="settings" />);
    expect(out).not.toContain("wsh-count");
  });

  it("⚠️ LAYOUT IS ON THE INNER ROW — `.wsh` carries the hairline, `.wsh-row` the flex", () => {
    const out = render(<PageHeader variant="workspace" title="T" mark="todo" />);
    expect(out).toMatch(/<header class="wsh( wsh--solo)?"><div class="wsh-row">/);
  });

  it("⚠️ NO DESCRIPTION → no sub element, the title steps up, and the header is 60px", () => {
    const solo = render(<PageHeader variant="workspace" title="Query Centre" mark="queries" />);
    expect(solo).not.toContain("wsh-sub");
    expect(solo).toContain("wsh-title--solo"); // the 25px step
    expect(solo).toContain("wsh--solo");        // …and the 60px height
    const withSub = render(<PageHeader variant="workspace" title="Contact list" mark="contacts" description="Everyone you're querying." />);
    expect(withSub).toContain("wsh-sub");
    expect(withSub).not.toContain("wsh-title--solo");
    expect(withSub).not.toContain("wsh--solo"); // 78px, because it has something to put there
    /* the pixel values are CSS; the CLASSES are the contract, and they are asserted here */
  });

  it("every mark key renders", () => {
    for (const m of ["queries", "todo", "calendar", "contacts", "packages", "analytics",
      "noteboard", "discover", "settings"] as const) {
      expect(render(<PageHeader variant="workspace" title="T" mark={m} />), m).toContain(`data-mark="${m}"`);
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

/**
 * ⚠️ HEIGHT IS A RULE, NOT A KNOB. `compact` and `greeting` were retired because any caller could
 * shrink any header for any reason — the height was a caller's opinion. These assert that no prop
 * can produce a height other than the two DERIVED ones, which is what makes this different from
 * the variants that were removed.
 */
describe("no prop can choose the header's height", () => {
  const heightClass = (el: React.ReactElement) =>
    /class="wsh( wsh--solo)?"/.exec(renderToStaticMarkup(el))?.[0];

  it("only `description` moves it — everything else is inert", () => {
    const tall = 'class="wsh"', short = 'class="wsh wsh--solo"';
    expect(heightClass(<PageHeader variant="workspace" title="T" mark="todo" />)).toBe(short);
    expect(heightClass(<PageHeader variant="workspace" title="T" mark="todo" description="D" />)).toBe(tall);

    // every other prop, with and without a description — none may change the height class
    for (const extra of [
      { count: "9 THINGS" },
      { actions: [{ label: "A", onClick: () => {} }] as const },
      { titleAdornment: <span>Pro</span> },
      { compact: true },          // ⚠️ the retired knob must NOT reach this variant
      { overflow: [{ label: "X", onClick: () => {} }] as const },
    ]) {
      expect(heightClass(<PageHeader variant="workspace" title="T" mark="todo" {...(extra as object)} />), JSON.stringify(Object.keys(extra))).toBe(short);
      expect(heightClass(<PageHeader variant="workspace" title="T" mark="todo" description="D" {...(extra as object)} />)).toBe(tall);
    }
  });

  it("⚠️ an EMPTY description is not a description — it must not buy 18px of nothing", () => {
    expect(heightClass(<PageHeader variant="workspace" title="T" mark="todo" description="" />))
      .toBe('class="wsh wsh--solo"');
  });
});
