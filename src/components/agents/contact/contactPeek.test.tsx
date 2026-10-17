/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v18.3.3 §C — the email is the copy button, and there is no Copy chip.
 */
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ContactPeek } from "./ContactPeek";
import type { Agent } from "../../../types";

const agent = { id: "a1", name: "Theo Abara", agency: "Abara Grant", email: "theo@abaragrant.co.uk" } as unknown as Agent;

describe("ContactPeek (v18.3.3 §C)", () => {
  const html = renderToStaticMarkup(<ContactPeek agent={agent} onEdit={() => undefined} />);
  it("the email is a focusable button named for what it does", () => {
    expect(html).toMatch(/data-k="email" role="button" tabindex="0" aria-label="Copy email theo@abaragrant.co.uk"/);
  });
  it("the full address is its title, so a shortened one is still readable", () => {
    expect(html).toContain('title="theo@abaragrant.co.uk"');
  });
  it("there is no Copy chip", () => {
    expect(html).not.toMatch(/["\s]cl18-copy["\s]/);
    expect(html).not.toContain('data-cl18="peek-copy"');
  });
});
