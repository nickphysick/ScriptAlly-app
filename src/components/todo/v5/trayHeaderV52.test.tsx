/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The To-do header (unit), RE-POINTED by To-do list v12. TD52 F1's urgent figures moved twice: v7 put them on the "Your
 * tray" line (`TrayHeadline`), and v12 retires that line for the Needs you now summary (lib/todoUrgent, whose own unit
 * suite holds the words). What stays here is v7 L1's: the header is the shared card, now in all three states.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TrayHeader } from "./TrayHeader";

const html = (asideN = 4, nothing = false) => renderToStaticMarkup(
  <TrayHeader loading={false} msTitle="Murphy’s Day Out" onAdd={() => {}} asideN={asideN} asideRef={null} onAside={() => {}}
    nothing={nothing ? { onLog: () => {}, onImport: () => {} } : null} />,
);
const strip = (s: string) => s.replace(/<[^>]+>/g, "");

describe("v12 L1 (unit) — the header is the shared card in every state", () => {
  it("renders PageHeaderCard with the h1, its page-title mark, the highlighter and the Mentor", () => {
    for (const h of [html(), html(0, true)]) {
      expect(h).toContain('class="phc td7-card"');
      expect(h).toMatch(/<h1 id="td7T" data-page-title="true"[^>]*><span class="hl"[^>]*>To-do list<\/span><\/h1>/);
      expect(h).toContain('src="/images/dash/mentor-leaning.png"');
    }
  });
  it("the body lines, word for word", () => {
    expect(strip(html().match(/<p>([\s\S]*?)<\/p>/)![1])).toBe("Your tasks for Murphy’s Day Out, most urgent first: pages to send, agents to chase and details to fill in.");
    expect(strip(html(0, true).match(/<p>([\s\S]*?)<\/p>/)![1])).toBe("Once you log the queries you’ve sent for Murphy’s Day Out, your tasks will show up here: pages to send, agents to chase and queries to close.");
  });
  it("the two buttons: Add a task and the live Set aside count; Nothing yet's Log and Import", () => {
    expect(html()).toContain(">+ Add a task</button>");
    expect(html(4)).toContain(">Set aside · 4</button>");
    expect(html(0)).toContain(">Set aside</button>");
    expect(html(0, true)).toContain(">+ Log your first query</button>");
    expect(html(0, true)).toContain(">Import from a spreadsheet</button>");
    expect(html(0, true)).not.toContain("Set aside");
  });
  it("the v5 header's parts are gone", () => {
    const h = html();
    for (const gone of ["td5-ey", "td5-shadow", "td5-rg", "Cleared this week", "tasks in your tray", "td7-sub"]) expect(h, gone).not.toContain(gone);
  });
});
