/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre · P3 — the toolbar moves into the pane column
 * (ref design-refs/query-centre-final.html).
 *
 * The scrim's MOUNT is not revised by this pass. It is a child of .f12-root, not portalled,
 * because of the pageIn containing-block window (v10) — nothing here changes that reasoning.
 * The audit below is what licenses leaving it alone: no ancestor of a lit element creates a
 * stacking context, so the new workspace frame traps nothing.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const queries = read("../components/Queries.tsx");
const css = read("../components/shell/f12.css");
const code = queries.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const rule = (selector: string): string => {
  const at = css.indexOf("\n" + selector + " {");
  return at < 0 ? "" : css.slice(at, css.indexOf("}", at) + 1);
};

describe("the query's verbs live in one kebab, not a bar", () => {
  /**
   * ⚠️ THE TOOLBAR IS RETIRED (§1c), AND THIS DESCRIBE USED TO BE ABOUT WHERE IT SAT. It moved from
   * the page column into the pane, which was an improvement to the wrong object: all six of its
   * controls — View tasks, Nudge, Agent, Manuscript, ⋯, Delete — were gated on `!sel`, so it was
   * six selected-query verbs parked above a list, dead until you picked a row.
   *
   * They are one kebab in the reading pane's hero now, beside the primary that acts on the same
   * query. Scope decides placement: the LIST's three controls (search, Filter, Sort) went the other
   * way, up into the grid's toolbar row.
   */
  it("no toolbar renders anywhere", () => {
    expect(code, "the pane toolbar came back").not.toMatch(/className="f12-ctl[ "]/);
  });

  /**
   * ⚠️ REWRITTEN BY §2 — THE ⋯ IS DELETED, AND WITH IT THE ARGUMENT FOR HAVING ONE. §1c's fix was
   * "six selected-query verbs parked above a list, dead until you picked a row → one kebab beside
   * the primary". §1 moved that kebab into the pane's control cell; §2 opens it. The reason is the
   * same reason, one step further on: a menu is still a place for verbs to hide, and the verbs that
   * were hiding in it were mostly NOT query verbs at all — they were contact details, a manuscript
   * and a send method, filed under the wrong noun because a menu will accept anything.
   *
   * Four verbs stay: Record response · Nudge ‖ Mark closed · Delete. Everything else moved to where
   * its subject is named, and those relocations are asserted below.
   */
  it("the ⋯ is gone, and nothing hides behind one", () => {
    expect(code, "the query-actions menu came back").not.toContain('ariaLabel="Actions for this query"');
    expect(code, "the kebab button came back").not.toContain("qc-kebab");
    expect(code, "a second menu component arrived on this page").not.toContain("PortalMenu");
  });

  it("the four verbs sit in the pane's control cell, and only there", () => {
    const cell = code.indexOf('className="qc-phead"');
    expect(cell, "the pane's control cell is missing — this test is anchored on nothing").toBeGreaterThan(-1);
    const row = code.slice(cell, code.indexOf("})() : null}", cell));
    expect(row, "the slice is empty").toContain("qc-btn");
    for (const verb of ["Nudge", "Mark closed", "Delete"]) {
      expect(row, `${verb} left the row`).toContain(`<span>${verb}</span>`);
    }
    /* the primary's label is CONTEXTUAL — the CTA engine's, shared with the mobile bar and the
       to-do flows — so it is asserted by its derivation rather than by one of its four words. */
    expect(row, "the primary stopped reading the CTA engine").toContain("getPrimaryAction(activeQuery.status as QueryStatus)");
    expect(row, "the primary is not the one filled control").toContain('className="qc-btn qc-btn-pri"');
  });

  it("⚠️ Nudge greys, never vanishes — and on the rule that fires its to-do task", () => {
    const cell = code.indexOf('className="qc-phead"');
    const row = code.slice(cell, code.indexOf("})() : null}", cell));
    expect(row, "the slice is empty").toContain("Nudge");
    /* ⚠️ THE SAME PREDICATE THE TASK GENERATOR READS, through the shared input assembler — never a
       second opinion about whether a chase is due. */
    expect(row, "Nudge stopped reading the shared reply rule").toContain('replyTaskFor(activeQuery as never, activeAgent, Date.now()) === "nudge"');
    expect(row, "Nudge vanishes instead of greying — the row would reflow between selections").toContain("disabled={!nudgeDue}");
    expect(row, "the disabled state stopped saying why").toContain("Not due yet");
  });

  it("the verbs cannot outlive their subject — the cell is guarded on the selection", () => {
    const cell = code.indexOf('className="qc-phead"');
    expect(cell, "the pane's control cell is missing").toBeGreaterThan(-1);
    const guard = code.indexOf("{activeQuery && activeAgent ? (() => {", cell);
    expect(guard, "the selection guard is missing from the control cell").toBeGreaterThan(cell);
    expect(guard, "the guard fell below the verbs it wraps").toBeLessThan(code.indexOf("qc-btn-pri", cell));
  });

  /**
   * ⚠️ THE RELOCATIONS ARE THE OTHER HALF OF §2, and they are what makes deleting the ⋯ a
   * correction rather than a loss. Each one is a control whose SUBJECT is named somewhere on this
   * page; the menu was where they went when nobody had named it yet.
   */
  it("every non-verb moved to where its subject is named", () => {
    /* the agent record — the ⋯ carried a permanently-disabled `Agent`; the name is the way there */
    /* ⚠️ `qp-hlink` RETIRED WITH THE PLATE (§1) — the agent's name is the pairing card's left-hand
       subject now, in the same element and at the same size as the manuscript opposite. What this
       clause asserts is the DESTINATION, which the disabled ⋯ item never had. */
    expect(code, "the agent's name is not the link to the record").toContain('onNavigate("agents")');
    /* email + website — pills under the agency, not menu items */
    expect(code, "the contact pills are missing").toContain('className="qc-pairlinks"');
    expect(code, "the website pill stopped going through the scheme guard").toContain("agentWebsiteHref(activeAgent.website)");
    /* ⚠️ THE MANUSCRIPT'S NAME IS THE PAIRING CARD'S RIGHT-HAND SUBJECT NOW (§1), not a link inside
       "What you sent" — the clause is unchanged (the disabled ⋯ item's destination is the name
       itself), and the name simply became the more prominent of the card's two. */
    expect(code, "the manuscript's name is not the way to its record").toContain('onNavigate("manuscripts")');
    /* the send method — edited in place on the event that states it */
    expect(code, "the send-method picker lost its in-place trigger").toContain("onEditSendMethod={(anchor)");
    expect(code, "the picker menu was not re-mounted beside the event").toContain('ariaLabel="Change send method"');
  });

  /**
   * ⚠️ AMENDED (§1c): the list's controls went DOWN into the list COLUMN, not up into a page-wide
   * toolbar row. The scope argument is unchanged and is the whole point — search, Filter and Sort
   * narrow the LIST — but a strip spanning both columns claimed a reach over the reading pane that
   * they do not have, and sat further from the rows they govern than from the pane they do not.
   * The grid's `toolbar` prop is gone from this page entirely.
   */
  it("the list's own controls sit in the LIST column, not in a page-wide row", () => {
    expect(code, "the page-wide toolbar row came back").not.toContain("toolbar={");
    /* ⚠️ ANCHOR ON THE POPULATED BRANCH, NOT THE FIRST `.f12-list`. The empty-database branch
       renders its own list column — placeholder rows and a disabled foot — and it comes FIRST in
       the file, so an unqualified `indexOf` measures that one and compares it against the populated
       branch's head. Caught by this very case on the first run: it reported the head sitting below
       the rows, comparing two different columns. The populated body is the one WITHOUT
       `f12-body-empty`. */
    const body = code.indexOf('className="f12-body">');
    expect(body, "the populated list/pane row is missing").toBeGreaterThan(-1);
    const list = code.indexOf('className="f12-list"', body);
    const head = code.indexOf('className="f12-lhead"', body);
    const rows = code.indexOf('className="f12-rows"', body);
    expect(list, "the list column is missing").toBeGreaterThan(-1);
    expect(head, "the list head is missing").toBeGreaterThan(-1);
    expect(rows, "the rows container is missing").toBeGreaterThan(-1);
    expect(head, "the head escaped the list column").toBeGreaterThan(list);
    expect(head, "the head is below the rows — it must be the column's head, and it stays fixed while they scroll")
      .toBeLessThan(rows);

    /* ⚠️ AND NOTHING SELECTED-QUERY-SCOPED CAME WITH IT. `View tasks` and `Nudge` sound page-level
       and are not: both are gated on `!sel`. In a list-scope head they would be dead controls
       whenever nothing is selected — the fault the split exists to remove. */
    const slice = code.slice(head, rows);
    for (const verb of ["Nudge", "View tasks", "Delete"]) {
      expect(slice, `${verb} acts on the selected query and must not be in the list head`).not.toContain(verb);
    }
    /* ⚠️ NOTHING IN THE HEAD IS EVER DISABLED (§1 tests). These three act on the list, which always
       exists in this branch — a control here that could go dead would be the very fault §1c cured. */
    expect(slice, "a control in the list head can go dead").not.toContain("disabled");
  });

  /* ⚠️ SUPERSEDED (create-mode v2 P3). Create mode used to TAKE the toolbar's seat — same box,
     swapped contents, so the bar neither moved nor changed height as it swapped. It now VACATES
     it: the record verbs do not apply to a query that does not exist, and the illustrated header
     below is the create view's one action surface. The seat stays empty rather than holding a
     row of greyed buttons. */
  /**
   * ⚠️ THE SEAT IS GONE, NOT MERELY VACATED (§1c). This asserted `if (creating || recording) return
   * null;` — the toolbar's early return during a journey. There is no toolbar to return from now.
   *
   * What the case protected remains true and is worth keeping: a takeover must not draw browsing
   * verbs over the record it has replaced. With the verbs inside the reading pane's hero, and the
   * hero replaced wholesale by the journey, that holds by construction.
   */
});

describe("the redundant raises are gone", () => {
  /* ⚠️ AMENDED (create-mode v2, Phase 1): this used to assert that Cancel and Save carry NO
     qh-lit while the pane and the draft row do — a live distinction while a scrim existed to
     rank things against. The scrim is gone, so the assertion becomes the stronger and simpler
     one: NOTHING carries a raise, because there is nothing left to be raised above. */
  it("no z-raise survives anywhere — the scrim it existed for is gone", () => {
    /* Both buttons moved to the illustrated header (P3) and the primary's handler is wrapped
       now — onClick={saveCreate} would hand the click event in as the batch flag. */
    expect(code).toContain('className="f12-btn-sec" onClick={() => closeCreate()}');
    expect(code).toContain("onClick={() => saveCreate()}");
    expect(code, "a raise outlived the scrim").not.toContain("qh-lit");
    expect(code, "the scrim element outlived its system").not.toContain("qh-scrim");
    expect(code, "the focus class outlived its system").not.toContain("qh-focus");
  });
});

describe("the scrim system is gone, and stays gone", () => {
  /* A deletion this wide needs a lock, or it comes back one rule at a time. The three names and
     the token are asserted absent from BOTH stylesheets and the page — anywhere a fragment could
     survive and quietly do nothing (or, worse, quietly do something). */
  const indexCss = readFileSync(new URL("../index.css", import.meta.url), "utf8");
  for (const name of ["qh-scrim", "qh-focus", "qh-lit"]) {
    it(`.${name} is absent from the page and both stylesheets`, () => {
      expect(code, `${name} survives in Queries.tsx`).not.toContain(name);
      expect(css, `${name} survives in f12.css`).not.toContain(name);
      expect(indexCss, `${name} survives in index.css`).not.toContain(name);
    });
  }

  it("the --qh-scrim token went with it — an unread token is a landmine, not a spare", () => {
    expect(indexCss).not.toContain("--qh-scrim");
  });

  /* ⚠️ NOT a scrim-system class, and deliberately KEPT: .qh-enter is the ROUTE-ENTRY stagger
     (masthead → toolbar → list → hero → cards → rows), shipped as its own phase with its own
     lock. It shares a prefix with the deleted classes and nothing else. */
  it("but the route-entry animation is untouched", () => {
    expect(code, "the load animation was deleted along with the scrim").toContain("qh-enter");
    expect(css).toContain(".qh-enter .f12-list");
  });
});

describe("the journey's strip offers no exit of its own", () => {
  /**
   * ⚠️ IT WAS A DUPLICATE, NOT AN EXIT. The strip carried a `Close` whose handler was byte for byte
   * the one the in-pane `Cancel` already calls — the same act offered twice, eight pixels apart, on
   * the same screen. Cancel and Esc keep doing the job, on the journey's own header, which is where
   * the writer is looking.
   *
   * ⚠️ THE HEADER BAND ITSELF STAYS, and that distinction is the whole of this case. The band is
   * the page's own chrome; it strips on `creating || recording`, and removing it would undo three
   * packs of that work. What a journey must not do is offer a SECOND way out of itself.
   */
  it("a journey renders no actions at all", () => {
    expect(code, "the journey's action list is not empty").toContain("actions={creating || recording\n              ? []");
  });

  it("and no `Close` label survives in the header's actions", () => {
    const at = code.indexOf("actions={creating || recording");
    expect(at, "the actions prop moved — this slice is testing nothing").toBeGreaterThan(-1);
    const slice = code.slice(at, at + 400);
    expect(slice, "the duplicate exit came back").not.toContain('label: "Close"');
  });

  /* ⚠️ REPO LAW, RESTATED WHERE IT CAN BE BROKEN: nothing in this page's height chain may be sized
     to the viewport. The takeover fills because the PAGE fills — a `100vh` or a `calc(100vh - Npx)`
     anywhere here would be bar-offset arithmetic, which the shell forbids outright. */
  it("no viewport unit appears in the height chain", () => {
    /* ⚠️ THE CHAIN, NOT THE FILE. A blanket scan flags `.f12-pop-body { max-height: min(520px,
       70vh) }` — a POPOVER bounded by the viewport, which is both legitimate and nowhere near the
       page's height chain. The law is about the chain: the elements between the scroll row and the
       takeover's content, where a viewport unit would be the bar-offset arithmetic the shell
       forbids. Naming them is also what makes this fail if someone adds one. */
    /* ⚠️ `.qc-take-body` IS DELIBERATELY ABSENT FROM THIS LIST. It carries no CSS rule at all —
       QueryCreatePane calls it "a hook only: no layout hangs off it", precisely so the height chain
       stays where it can be read. Its box comes from inline styles, which the source scan below
       covers. Asserting it as a CSS rule failed, correctly. */
    const CHAIN = [".f12-root", ".f12-body", ".f12-list", ".f12-detail",
                   ".qc-two", ".qc-form", ".qc-stack"];
    for (const sel of CHAIN) {
      const at = css.indexOf(`\n${sel} {`);
      expect(at, `${sel} is missing from f12.css — this case would be testing nothing`).toBeGreaterThan(-1);
      const rule = css.slice(at, css.indexOf("}", at)).replace(/\/\*[\s\S]*?\*\//g, "");
      expect(rule, `${sel} sizes itself to the viewport`).not.toMatch(/\b\d+(\.\d+)?(vh|dvh|svh|lvh)\b/);
    }
    /* and no INLINE style in the journey's own components reaches for the viewport either —
       that is where `.qc-take-body` and the takeover column get their boxes */
    for (const rel of ["../components/Queries.tsx", "../components/queries/QueryCreatePane.tsx",
                       "../components/queries/ResponsePane.tsx", "../components/queries/StepStack.tsx"]) {
      const src = read(rel).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
      expect(src, `${rel} sizes something to the viewport inline`).not.toMatch(/\b\d+(\.\d+)?(vh|dvh|svh|lvh)\b/);
      expect(src, `${rel} is doing bar-offset arithmetic`).not.toMatch(/calc\(100vh/);
    }
  });
});
