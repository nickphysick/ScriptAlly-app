/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TD52 F1 (unit) — the populated title's three forms, rendered: "{o} overdue · {t} due today", a 0 part dropped with its
 * separator, and "Nothing due today" at 0/0 (a branch the harness account cannot show: it always has overdue tasks).
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TrayHeader } from "./TrayHeader";

const title = (urgent: { overdue: number; today: number } | null) => {
  const html = renderToStaticMarkup(
    <TrayHeader loading={false} n={12} msTitle="A Book" counts={{ you: 1, chase: 1, tidy: 1 } as never} active={null} onKind={() => {}} cleared={0}
      onRing={() => {}} ringTitle="" onAdd={() => {}} asideN={0} asideRef={null} onAside={() => {}} calendar={<i />} urgent={urgent} />,
  );
  const m = html.match(/<h1[^>]*aria-label="([^"]*)"[^>]*>([\s\S]*?)<\/h1>/);
  expect(m, "the h1 is rendered").toBeTruthy();
  return { label: m![1], text: m![2].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").trim(), rust: /data-td52="title-od"/.test(m![2]) };
};

describe("TD52 F1 — the title says what's urgent", () => {
  it("both parts, the overdue part rust", () => {
    expect(title({ overdue: 3, today: 1 })).toEqual({ label: "3 overdue · 1 due today", text: "3 overdue · 1 due today", rust: true });
  });
  it("a 0 part drops out with its separator", () => {
    expect(title({ overdue: 0, today: 2 })).toMatchObject({ text: "2 due today", rust: false });
    expect(title({ overdue: 4, today: 0 })).toMatchObject({ text: "4 overdue", rust: true });
  });
  it("Nothing due today at 0/0", () => {
    expect(title({ overdue: 0, today: 0 })).toEqual({ label: "Nothing due today", text: "Nothing due today", rust: false });
  });
  it("without the urgent figures (not the populated page) it keeps v5.1's count", () => {
    expect(title(null).text).toBe("12 tasks in your tray");
  });
});
