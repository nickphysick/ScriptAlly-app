/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The SHARED confirm dialog (ref design-refs/qdb-create-polish2.html §1).
 *
 * Restyled where it lives — ToastProvider — so both call sites benefit rather than one being
 * special. Two things here are safety, not decoration: a destructive dialog puts the safe action
 * rightmost, and the destructive action is an outline rather than a filled slab.
 *
 * The focus ring is the sleeper fix. `.f12-root button:focus-visible` never matched portalled UI,
 * because portals mount into a bare `.t-f12` wrapper — so the dialog, the menus and the toasts all
 * fell through to the browser default. Widening the selector fixes the class, not the instance.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const css = read("../components/toast/toast.css");
const provider = read("../components/toast/ToastProvider.tsx");
const f12 = read("../components/shell/f12.css");
const queries = read("../components/Queries.tsx");

const block = (sheet: string, selector: string): string => {
  const at = sheet.indexOf("\n" + selector + " {");
  return at < 0 ? "" : sheet.slice(at, sheet.indexOf("}", at) + 1);
};

describe("the dialog wears the house treatment", () => {
  it("parchment, 18px, deep popover shadow", () => {
    const dlg = block(css, ".sa-confirm");
    expect(dlg, "the .sa-confirm rule is missing").not.toBe("");
    expect(dlg).toContain("border-radius: 18px");
    expect(dlg).toContain("box-shadow: 0 22px 60px");
    expect(dlg).toContain("var(--panel");
  });

  it("Playfair bold heading over body copy in the body face", () => {
    expect(css).toMatch(/\.sa-confirm h2 \{[^}]*--f12-serif[^}]*font-weight: 700/);
    expect(css).toMatch(/\.sa-confirm \.sa-confirm-body \{[^}]*--ink-2/);
  });

  it("the destructive action is an OUTLINE — never a filled red slab", () => {
    expect(css, "the red slab came back").not.toContain("background: #a5342a");
    const danger = block(css, ".sa-confirm--danger .sa-confirm-ok");
    expect(danger, "the danger rule is missing").not.toBe("");
    expect(danger).toContain("background: transparent");
    expect(danger, "the destructive tone should read the shared token").toContain("var(--terra");
  });

  it("in a destructive dialog the SAFE action is the soft-pink primary", () => {
    expect(block(css, ".sa-confirm--danger .sa-confirm-cancel")).toContain("var(--pink-t");
  });
});

describe("button ORDER is conditional — safe-last only when destructive", () => {
  it("destructive: confirm renders BEFORE cancel, so the safe action sits rightmost", () => {
    const actions = provider.slice(provider.indexOf('className="sa-confirm-actions"'));
    const dangerFirst = actions.indexOf("{confirm.danger && (");
    const cancel = actions.indexOf('className="sa-confirm-cancel"');
    const benignLast = actions.indexOf("{!confirm.danger && (");
    expect(dangerFirst, "the danger-first branch is missing").toBeGreaterThan(-1);
    expect(dangerFirst).toBeLessThan(cancel);
    // benign: cancel first, confirm last — a plain "Yes" is never inverted
    expect(benignLast).toBeGreaterThan(cancel);
  });

  it("cancel keeps autofocus either way, so Enter is always the safe key", () => {
    expect(provider).toContain('className="sa-confirm-cancel" autoFocus');
  });
});

describe("portalled surfaces get the house focus ring by construction", () => {
  it("the ring is scoped to the .t-f12 wrapper, not the page root", () => {
    expect(f12, "the ring is still page-only — portals fall through to the browser default")
      .toContain(".t-f12 button:focus-visible {");
    expect(f12).not.toContain(".f12-root button:focus-visible {");
  });

  it("...and the portals really do mount into a bare .t-f12 wrapper", () => {
    // If this ever changes, the ring silently stops applying to portalled UI again.
    expect(provider).toContain('createPortal(\n        <div className="t-f12">');
  });
});

describe("the call sites", () => {
  it("discard names its safe action rather than saying 'Cancel'", () => {
    expect(queries).toContain('cancelLabel: "Keep editing"');
  });

  it("no native window.confirm survives in the Queries hub", () => {
    expect(queries, "a system dialog came back").not.toContain("window.confirm");
    expect(queries).toContain('title: "Delete this note?"');
  });

  it("ConfirmDestroy is deliberately NOT migrated — it guards with type-to-confirm", () => {
    const destroy = read("../components/ConfirmDestroy.tsx");
    expect(destroy, "the hard-delete guard lost its type-the-name gate").toContain("canDestroy");
  });
});

/**
 * A FOURTH confirm turned up after the P1 sweep: the query delete was a bespoke inline-styled
 * modal in Queries.tsx — white card, filled red button, browser focus ring. It was in the
 * aria-modal file list during that recon and I didn't follow it up. It now goes through the
 * shared dialog like the others.
 */
describe("the query delete uses the shared dialog too", () => {
  const src = read("../components/Queries.tsx");

  it("no bespoke modal survives — state, markup and the filled red button are gone", () => {
    expect(src, "the bespoke modal's state is back").not.toContain("isDeleteConfirmOpen");
    expect(src, "the filled red slab is back").not.toContain('background: "#9a3b2a"');
    expect(src).toContain('title: "Delete this query?"');
    expect(src).toContain("danger: true");
  });

  it("the counted body survives verbatim — the count IS the safety", () => {
    expect(src).toContain("This permanently deletes your query to");
    expect(src).toMatch(/tracking event\{evCount > 1 \? "s" : ""\}/);
    expect(src).toContain("This can’t be undone.");
  });

  it("the delete is bound to the query the dialog NAMED, not to whatever is selected later", () => {
    // The shared dialog isn't force-closed on selection change (the bespoke one was), so reading
    // activeQuery at confirm time could delete a different query.
    expect(src).toContain("onConfirm: () => handleDeleteQuery(id)");
    expect(src).toContain("const handleDeleteQuery = (id: string) => {");
  });

  it("the destructive tone is ONE token, so the button and the warning can't drift", () => {
    expect(read("../index.css")).toContain("--terra: #9a3b2a");
    expect(css).toContain("color: var(--terra");
    expect(src).toContain('color: "var(--terra)"');
  });
});
