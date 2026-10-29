/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TD52 F1 (unit), RE-POINTED by To-do list v7: the urgent figures left the h1 for the "Your tray" line (`TrayHeadline`)
 * with the same words — "{o} overdue · {t} due today", a 0 part dropped with its separator, "Nothing due today" at 0/0
 * (a branch the harness account cannot show: it always has overdue tasks). The h1 is now "To-do list" on the shared
 * PageHeaderCard; its v5.1 count form ("12 tasks in your tray") is retired with the old title.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TrayHeader, TrayHeadline } from "./TrayHeader";

const line = (urgent: { overdue: number; today: number } | null, caught = false) => {
  const html = renderToStaticMarkup(<TrayHeadline urgent={urgent} caught={caught} />);
  const m = html.match(/<span class="td7-sub"[^>]*>([\s\S]*)<\/span>$/);
  expect(m, "the line is rendered").toBeTruthy();
  const label = html.match(/aria-label="([^"]*)"/)?.[1] ?? null;
  return { label, text: m![1].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").trim(), rust: /data-td52="title-od"/.test(m![1]) };
};

describe("TD52 F1 — the Your tray line says what's urgent", () => {
  it("both parts, the overdue part rust", () => {
    expect(line({ overdue: 3, today: 1 })).toEqual({ label: "3 overdue · 1 due today", text: "3 overdue · 1 due today", rust: true });
  });
  it("a 0 part drops out with its separator", () => {
    expect(line({ overdue: 0, today: 2 })).toMatchObject({ text: "2 due today", rust: false });
    expect(line({ overdue: 4, today: 0 })).toMatchObject({ text: "4 overdue", rust: true });
  });
  it("Nothing due today at 0/0", () => {
    expect(line({ overdue: 0, today: 0 })).toEqual({ label: "Nothing due today", text: "Nothing due today", rust: false });
  });
  it("the empty tray reads All caught up", () => {
    expect(line(null, true).text).toBe("All caught up");
  });
});

describe("v7 L1 (unit) — the header is the shared card", () => {
  const html = (caught: boolean, asideN = 4) => renderToStaticMarkup(
    <TrayHeader loading={false} caught={caught} msTitle="Murphy’s Day Out" onAdd={() => {}} asideN={asideN} asideRef={null} onAside={() => {}} />,
  );
  it("renders PageHeaderCard with the h1, its page-title mark and the highlighter", () => {
    const h = html(false);
    expect(h).toContain('class="phc td7-card"');
    expect(h).toMatch(/<h1 id="td7T" data-page-title="true"[^>]*><span class="hl"[^>]*>To-do list<\/span><\/h1>/);
    expect(h).toContain('src="/images/dash/mentor-leaning.png"');
  });
  it("the body lines, word for word", () => {
    const strip = (s: string) => s.replace(/<[^>]+>/g, "");
    expect(strip(html(false).match(/<p>([\s\S]*?)<\/p>/)![1])).toBe("Everything waiting on you for Murphy’s Day Out: what to send, who to chase and what to tidy, most pressing first.");
    expect(strip(html(true).match(/<p>([\s\S]*?)<\/p>/)![1])).toBe("Nothing needs you right now on Murphy’s Day Out. When an agent’s window passes or a request comes in, it lands here.");
  });
  it("the two buttons, with the live Set aside count", () => {
    expect(html(false)).toContain(">+ Add a task</button>");
    expect(html(false, 4)).toContain(">Set aside · 4</button>");
    expect(html(false, 0)).toContain(">Set aside</button>");
  });
  it("the v5 header's parts are gone", () => {
    const h = html(false);
    for (const gone of ["td5-ey", "td5-shadow", "td5-rg", "Cleared this week", "tasks in your tray"]) expect(h, gone).not.toContain(gone);
  });
});
