import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ConfirmScreen } from "./ConfirmScreen";
import { IMPORT_IN_PROGRESS_MESSAGE } from "../../lib/aiRefusal";

const noop = () => {};
const render = (note?: string | null) =>
  renderToStaticMarkup(<ConfirmScreen fileName="agents.csv" fileSize={1200} onChange={noop} onBack={noop} onRead={noop} note={note} />);

describe("ConfirmScreen note (AI spend guard, in_progress)", () => {
  it("without a note, the lead line names the file as before", () => {
    const html = render();
    expect(html).toContain('data-sf="confirm-lead"');
    expect(html).not.toContain(IMPORT_IN_PROGRESS_MESSAGE.replace("'", "&#x27;"));
  });
  it("with a note, the lead line says it instead", () => {
    const html = render(IMPORT_IN_PROGRESS_MESSAGE);
    const lead = html.slice(html.indexOf('data-sf="confirm-lead"'));
    expect(lead).toContain("Your import is already being read. Give it a moment.");
  });
});
