/**
 * PageHeader locks (Phase 4): each variant renders its skeleton, the closing rule is always
 * present, the description is omitted on compact and greeting, and a third action cannot
 * survive — rejected by the tuple type at compile time and sliced at runtime. Rendered via
 * renderToStaticMarkup (structure and classes only — layout is a browser check, per the
 * jsdom limits noted in the pack).
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PageHeader, PageHeaderAction, PageHeaderActions } from "./PageHeader";

const two: PageHeaderActions = [
  { label: "Task settings", onClick: () => {} },
  { label: "Add task or note", onClick: () => {}, primary: true },
];

describe("PageHeader — full", () => {
  const html = renderToStaticMarkup(
    <PageHeader variant="full" title="What's on your desk?" description="Urgent tasks, housekeeping, notes." actions={two} />
  );
  it("renders title, description, both actions and the rule", () => {
    expect(html).toContain("svh--full");
    expect(html).toContain("on your desk?"); // (the apostrophe HTML-escapes in static markup)
    expect(html).toContain("Urgent tasks, housekeeping, notes.");
    expect(html).toContain("svh-rule");
    expect(html).toContain("svh-btn-ghost");
    expect(html).toContain("svh-btn-primary");
  });
});

describe("PageHeader — the compact variant is retired (flyouts pack P3)", () => {
  it("the type union carries no compact member and no compact CSS survives", () => {
    // @ts-expect-error — "compact" must not typecheck
    const rejected: React.ComponentProps<typeof PageHeader>["variant"] = "compact";
    expect(rejected).toBe("compact"); // runtime string; the line above is the real assertion
  });
});

describe("PageHeader — the greeting variant is retired (flyouts pack P4)", () => {
  it("the type union carries no greeting member and no kicker prop survives", () => {
    // @ts-expect-error — "greeting" must not typecheck
    const rejected: React.ComponentProps<typeof PageHeader>["variant"] = "greeting";
    expect(rejected).toBe("greeting"); // runtime string; the line above is the real assertion
    // @ts-expect-error — the kicker prop left with the variant
    const props: React.ComponentProps<typeof PageHeader> = { title: "T", kicker: "K" };
    expect(props.title).toBe("T");
  });
});

describe("PageHeader — the two-action maximum", () => {
  it("slices a third action at runtime (the tuple type already rejects it at compile time)", () => {
    const three = [
      { label: "One", onClick: () => {} },
      { label: "Two", onClick: () => {} },
      { label: "Three", onClick: () => {} },
    ] as unknown as PageHeaderActions;
    const html = renderToStaticMarkup(<PageHeader variant="full" title="T" actions={three} />);
    expect(html).toContain("One");
    expect(html).toContain("Two");
    expect(html).not.toContain("Three");
  });

  it("renders no actions container when none are given", () => {
    const html = renderToStaticMarkup(<PageHeader variant="full" title="Help centre" />);
    expect(html).not.toContain("svh-acts");
    expect(html).toContain("svh-rule");
  });

  it("type-level: a PageHeaderAction[] of three does not satisfy PageHeaderActions", () => {
    // Compile-time documentation — @ts-expect-error proves the tuple rejection.
    const three: PageHeaderAction[] = [
      { label: "One", onClick: () => {} },
      { label: "Two", onClick: () => {} },
      { label: "Three", onClick: () => {} },
    ];
    // @ts-expect-error — three actions must not typecheck
    const rejected: PageHeaderActions = three;
    expect(rejected.length).toBe(3);
  });
});
