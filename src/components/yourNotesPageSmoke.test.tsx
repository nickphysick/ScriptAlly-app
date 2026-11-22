/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Render smokes — Your notes v1 (/your-notes). See `src/test/pageSmoke.tsx` for why these exist and why they assert
 * almost nothing. The page reads its notes in an effect, so the populated, empty and failed states are smoked through
 * the props-only `YourNotesView`; the routed `YourNotesPage` is smoked as it first paints (loading).
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderPage } from "../test/pageSmoke";
import type { YourNote } from "../lib/yourNotes";

vi.mock("../lib/db", async () => (await import("../test/pageSmoke")).dbMock());
vi.mock("../lib/firebase", async () => (await import("../test/pageSmoke")).firebaseMock());
vi.mock("./toast/ToastProvider", async () => (await import("../test/pageSmoke")).toastMock());

import { YourNotesPage, YourNotesView } from "./notes/YourNotesPage";

const N = (o: Partial<YourNote> & { id: string }): YourNote => ({
  kind: "An idea", message: "Could a comp link to the book’s page so I can check the blurb quickly?", title: null, status: null, statusAt: null,
  createdAt: Date.parse("2026-11-06T21:14:00Z"), pageName: "Comparable titles", counted: null, reply: null, writerSeenAt: null, statusLog: null, ...o,
});
const NOTES = [
  N({ id: "a" }),
  N({ id: "b", kind: "Something's broken", title: "Agency names missing after an import", status: "fixed", statusAt: 3, reply: { text: "That’s fixed in today’s update.", at: 5 } }),
  N({ id: "c", kind: "Something I liked", status: "read" }),
  N({ id: "d", status: "planned" }),
];
const view = (p: Partial<React.ComponentProps<typeof YourNotesView>>) =>
  <YourNotesView uid="smoke-user" userName="Nick Physick" loading={false} error={false} notes={[]} retry={() => {}} {...p} />;

describe("/your-notes renders", () => {
  it("the routed page renders as it first paints", () => {
    const html = renderPage(<YourNotesPage />, "/your-notes");
    expect(html).toContain("+ Tell us something");
    expect(html).toContain('data-state="loading"');
  });
  it("with notes: the title, the ring, the switch and a row per note", () => {
    const html = renderPage(view({ notes: NOTES }), "/your-notes");
    expect(html).toContain("4 notes sent</h1>");
    expect(html).toContain("Where they are");
    expect(html).toContain("With a reply");
    expect(html.match(/data-yn="row"/g)?.length).toBe(4);
    expect(html).toContain("Agency names missing after an import");
    expect(html).toContain("New reply");
    expect(html).toContain("Counted as <b>4 notes</b>");
    expect(html).toContain("What happens to a note");
  });
  it("empty: Your notes, Nothing sent yet, the three ways in", () => {
    const html = renderPage(view({}), "/your-notes");
    expect(html).toContain(">Your notes</h1>");
    expect(html).toContain("Nothing sent yet");
    expect(html.match(/data-yn="tell"/g)?.length).toBe(3);
  });
  it("a failed read says so — no ring of zeros, no empty list", () => {
    const html = renderPage(view({ error: true }), "/your-notes");
    expect(html).toContain("We couldn’t load your notes. Try again?");
    expect(html).not.toContain("Nothing sent yet");
    expect(html).toContain('data-yn="track"');
  });
});
