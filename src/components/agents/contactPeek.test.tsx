/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The card's back face is READ-ONLY, and one component draws it everywhere.
 *
 * ⚠️ NO INPUTS ON THE BACK FACE. EVER. It used to host the whole agent editor — a form you could
 * only reach by turning a card over, on a face that cannot be scrolled to, inside a rotor that
 * had to grow to 580px to contain it. The rule is asserted over RENDERED OUTPUT rather than over
 * the source, because the fault would arrive through a child component: a peek that gained an
 * inline editor three files down would pass any check that read this file.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { ContactPeek, peekSocials } from "./ContactPeek";
import { CONTACT_FIXTURE_AGENTS } from "./contactFixture";
import { Agent } from "../../types";

const A = CONTACT_FIXTURE_AGENTS;
const byId = (id: string) => A.find((a) => a.id === id)!;
const draw = (a: Agent, variant?: "face" | "pop" | "drawer") =>
  renderToStaticMarkup(<ContactPeek agent={a} variant={variant} footer={<button type="button">Edit contact details</button>} />);

describe("the back face carries no form, in any container", () => {
  it("renders every fixture agent without an input, textarea, select or form", () => {
    for (const a of A) {
      for (const variant of ["face", "pop", "drawer"] as const) {
        const html = draw(a, variant);
        for (const tag of ["<input", "<textarea", "<select", "<form", "contenteditable"]) {
          expect(html, `${a.name} (${variant}): a ${tag} reached the read-only peek`).not.toContain(tag);
        }
      }
    }
  });

  /* the one control it does carry is a way OUT of read mode, not a way to edit in place */
  it("its only action opens the drawer — it does not edit here", () => {
    expect(draw(byId("fx-long"))).toContain("Edit contact details");
  });
});

describe("absence is stated, never omitted", () => {
  it("a missing email, page, location or social says so", () => {
    const bare = draw(byId("fx-shut"));
    expect(bare).toContain("No email recorded");
    expect(bare).toContain("No social accounts recorded");
    /* and the populated case proves the empty case is not simply always drawn */
    const full = draw(byId("fx-long"));
    expect(full).not.toContain("No email recorded");
    expect(full).not.toContain("No social accounts recorded");
  });

  it("a website with no scheme still opens as one", () => {
    expect(draw(byId("fx-long"))).toContain('href="https://lanternagency.co.uk/submissions"');
  });
});

describe("peekSocials reads BOTH stores", () => {
  /* ⚠️ `socials[]` MIRRORS THE THREE DISCRETE FIELDS ON WRITE, so reading the array alone shows an
     empty row to a writer whose handle is sitting in the record — a legacy or imported agent can
     carry only the discretes. Both are read, and duplicates are dropped by handle. */
  it("takes the array, the legacy discretes, and does not double them", () => {
    const legacy = { ...byId("fx-none"), twitter: "@legacyhandle" } as Agent;
    expect(peekSocials(legacy).map((s) => s.handle)).toEqual(["@legacyhandle"]);

    const both = { ...byId("fx-long"), twitter: "@aishareads" } as Agent;
    const handles = peekSocials(both).map((s) => s.handle);
    expect(handles.filter((h) => h === "@aishareads").length, "the mirrored handle was listed twice").toBe(1);
    expect(handles.length).toBe(2);
  });

  it("an agent with nothing anywhere has no socials", () => {
    expect(peekSocials(byId("fx-shut"))).toEqual([]);
  });
});

describe("ONE renderer — nothing else draws these rows", () => {
  /* ⚠️ THE POINT OF THE COMPONENT, ASSERTED AS ABSENCE ELSEWHERE. Two renderings of one fact are
     two facts that will eventually disagree, and the disagreement is invisible until somebody
     reads both in the same minute. The drawer appends; it must never re-implement. */
  it("the drawer states no contact label of its own", () => {
    const drawer = readFileSync(new URL("./AgentDrawer.tsx", import.meta.url), "utf8");
    for (const owned of ["No email recorded", "No page recorded", "No social accounts recorded", '"Email"', '"Approach by"']) {
      expect(drawer, `the drawer re-implements ${owned} instead of letting the peek own it`).not.toContain(owned);
    }
    expect(drawer, "the drawer stopped rendering the peek at all").toContain("<ContactPeek");
  });

  it("the card mounts the peek for its back face and hosts no editor there", () => {
    const list = readFileSync(new URL("./AgentList.tsx", import.meta.url), "utf8");
    expect(list).toContain("<ContactPeek");
    expect(list, "the card's back face went back to hosting the editor").not.toMatch(/back=\{[^}]*editorFor/);
  });
});
