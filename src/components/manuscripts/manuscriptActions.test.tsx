/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE MANUSCRIPT'S ⋯ — the acts that have no other surface ══════════════════════════════════
 *
 * ⚠️ THESE CASES CAME FROM `manuscriptDossier.test.tsx` WHEN THE MENU LEFT THE HERO (amendment 2).
 * They are not new rules and they did not lapse in the move: shelve, reactivate and the guarded
 * delete have NO other surface on this page, and since "Edit details" left the plate, STATUS,
 * SHELVED REASON and NOTES reach their form through here alone. Losing this menu is a functional
 * regression wearing a design decision's clothes — the brief retired the hero's action cluster, and
 * this was the one member of it that could not go.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ManuscriptActions } from "./ManuscriptActions";

/** The menu renders CLOSED, so its items are asserted at source rather than in the markup. */
const src = readFileSync(join(__dirname, "ManuscriptActions.tsx"), "utf8");

const menu = (shelved = false) =>
  renderToStaticMarkup(
    <ManuscriptActions shelved={shelved} onEditDetails={() => {}} onShelveToggle={() => {}} onDelete={() => {}} />,
  );

describe("the lifecycle menu", () => {
  it("is a ⋯ that names itself for a screen reader", () => {
    const html = menu();
    expect(html).toContain('aria-label="More actions"');
    expect(html).toContain('aria-expanded="false"');
  });

  /**
   * ⚠️ THE FORM IS NOT DELETED, IT IS REHOMED. Three fields have no inline editor anywhere —
   * status, shelved reason and notes — so removing "Edit details" would strand them.
   */
  it("keeps Edit details, which is the only route to status, shelved reason and notes", () => {
    expect(src).toContain("Edit details…");
  });

  it("offers shelve and the guarded delete", () => {
    expect(src).toContain("Shelve");
    expect(src).toContain("Reactivate");
    expect(src).toContain("Delete…");
  });

  /** The verb follows the state — a shelved manuscript is reactivated, not shelved again. */
  it("says Reactivate on a shelved manuscript and Shelve otherwise", () => {
    expect(src).toContain('{shelved ? "Reactivate" : "Shelve"}');
  });

  it("renders closed, so nothing is open until it is asked for", () => {
    expect(menu()).not.toContain("Delete…");
    expect(menu(true)).not.toContain("Reactivate");
  });
});

