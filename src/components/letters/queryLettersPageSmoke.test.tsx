/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smoke — `/materials/letters` renders (sidebar materials v1). A placeholder page, so two claims only: it renders, and
 * it carries its title and its one line. The Query letters pack replaces this with its own census.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { QueryLettersPage, QUERY_LETTERS_LINE, QUERY_LETTERS_TITLE } from "./QueryLettersPage";
import { WORKSPACE_PATHS } from "../../marketing/routeTiers";
import { WORKSPACE_SHELL_PATHS } from "../../lib/shellForRoute";

const render = () => renderToStaticMarkup(<MemoryRouter initialEntries={["/materials/letters"]}><QueryLettersPage /></MemoryRouter>);

describe("/materials/letters renders", () => {
  it("the light header's title and its one line, and nothing else yet", () => {
    const h = render();
    expect(h).toContain(QUERY_LETTERS_TITLE);
    expect(h).toContain("Write and keep every version of your letter, then see which one gets agents asking for more.");
    expect(QUERY_LETTERS_LINE).toBe("Write and keep every version of your letter, then see which one gets agents asking for more.");
    expect(h).toContain('data-page-title=""');
    expect(h).not.toContain("slh-card");
    expect(h).not.toContain("slh-k");
  });
  it("the route is registered with the router and the shell", () => {
    expect([...WORKSPACE_PATHS]).toContain("/materials/letters");
    expect([...WORKSPACE_SHELL_PATHS]).toContain("/materials/letters");
  });
});
