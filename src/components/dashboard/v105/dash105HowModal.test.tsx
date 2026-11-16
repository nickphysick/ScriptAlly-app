/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shortcut guard (16 Nov) — Dash105How stays mounted while closed (its closing transition, its reopening at slide 1),
 * so it may carry aria-modal="true" ONLY while open: closed, shortcuts.ts modalOpen() would count it on every page
 * and M — every plain-key shortcut — would do nothing. Report: reports/shortcut-guard-v1/REPORT.md.
 *
 * Rendered through react-dom/server (this suite runs in node): the portal is passed through and `document` stubbed,
 * which is all the component asks of either before its effects, and effects do not run on the server.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("react-dom", async (orig) => ({ ...(await orig<typeof import("react-dom")>()), createPortal: (n: React.ReactNode) => n }));

beforeAll(() => { vi.stubGlobal("document", { body: {} }); });
afterAll(() => { vi.unstubAllGlobals(); });

const dialogTag = async (open: boolean) => {
  const { Dash105How } = await import("./Dash105How");
  const html = renderToStaticMarkup(<Dash105How open={open} onClose={() => {}} />);
  const tags = html.match(/<div[^>]*data-d105h="modal"[^>]*>/g) ?? [];
  expect(tags, "exactly one dialog rendered (the population)").toHaveLength(1);
  return tags[0];
};

describe("Dash105How — aria-modal only while open", () => {
  it("closed: still mounted, still a dialog, hidden and inert, with NO aria-modal attribute", async () => {
    const tag = await dialogTag(false);
    expect(tag).toMatch(/role="dialog"/);
    expect(tag).toMatch(/aria-hidden="true"/);
    expect(tag).toMatch(/inert/);
    expect(tag).not.toMatch(/aria-modal/);
  });

  it('open: aria-modal="true"', async () => {
    const tag = await dialogTag(true);
    expect(tag).toMatch(/role="dialog"/);
    expect(tag).toMatch(/aria-modal="true"/);
    expect(tag).not.toMatch(/aria-hidden="true"/);
  });
});
