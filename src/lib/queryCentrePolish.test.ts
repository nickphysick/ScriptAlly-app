/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre — the polish pass (ref design-refs/104-query-centre-final.html).
 *
 * ⚠️ THE MEASURED HALF LIVES IN `tests/e2e/qcControlRow.measure.ts`, NOT HERE. This repo's vitest
 * runs in `environment: 'node'` and reads SOURCE — it can prove a rule was written, never that it
 * rendered. "The row fits at four widths" is a question about a laid-out page and is asked of the
 * real app; what belongs here is the rule the measurement is a check ON, so that changing the rule
 * fails immediately rather than at the next deploy.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const css = read("../components/shell/f12.css");
const queries = read("../components/Queries.tsx");
const code = queries.replace(/\{?\/\*[\s\S]*?\*\/\}?/g, "").replace(/^\s*\/\/.*$/gm, "");

/** The FULL rule for a selector — every block, joined. A first-match slice reads whichever block
 *  comes first, which in this stylesheet has silently repointed a lock twice. */
const rule = (sel: string): string => {
  const out: string[] = [];
  let from = 0;
  for (;;) {
    const at = css.indexOf("\n" + sel + " {", from);
    if (at < 0) break;
    const end = css.indexOf("}", at) + 1;
    out.push(css.slice(at, end));
    from = end;
  }
  return out.join("\n");
};
const declValue = (r: string, prop: string): string => {
  const body = r.replace(/\/\*[\s\S]*?\*\//g, "");
  const m = new RegExp("(?:^|;|\\{)\\s*" + prop + "\\s*:\\s*([^;}]+)").exec(body);
  return m ? m[1].trim() : "";
};

describe("§3 · one button rule, app-wide on this page", () => {
  it("the three values are TOKENS, declared once", () => {
    /* ⚠️ TOKENS RATHER THAN THREE MATCHED NUMBERS. §1's control cells read `--btn-h` for their
       min-height, so the heads stay on one line whatever the height becomes; a literal here would
       agree today and drift the first time anyone tuned the button. */
    expect(css, "the button tokens are gone").toContain("--btn-h: 32px; --btn-r: 8px; --btn-line: #e2d8ca;");
  });

  it("the base button reads them, and states one rim and one hover", () => {
    const r = rule(".qc-btn");
    expect(r, "the button rule is missing").not.toBe("");
    expect(declValue(r, "height"), "the height stopped being the token").toBe("var(--btn-h)");
    expect(declValue(r, "border-radius"), "the radius stopped being the token").toBe("var(--btn-r)");
    expect(declValue(r, "font-size"), "the type size moved off 12px").toBe("12px");
    expect(declValue(r, "font-weight"), "the weight moved off 500").toBe("500");
    expect(declValue(r, "gap"), "the icon gap moved off 7px").toBe("7px");
    expect(declValue(r, "border"), "the rim is not the single border colour").toContain("var(--btn-line)");
    expect(declValue(rule(".qc-btn svg"), "width"), "the icon moved off 13px").toBe("13px");
  });

  /**
   * ⚠️ ONE EXCEPTION, AND IT IS NOT BURGUNDY. Burgundy means OUTGOING in the StatusDot system — it
   * is on this very page, on every waiting row's dot — so a primary wearing it would borrow a
   * colour that already says something else, and the two meanings would be told apart by position.
   */
  /**
   * ⚠️ INVERTED BY FIX PACK 7 §5, AND THE INVERSION IS THE POINT. This asserted the primary was the
   * ONLY FILLED control — pink ground, black ink. It is now the same button as its neighbours and
   * differs in one property: a rim half again as heavy. Pink did not leave the page, it changed
   * job — §4 makes it the LIST's selection fill, so it says "you are reading this" rather than
   * "press this". One colour, one job, the rule §1 applies to sage.
   *
   * ⚠️ AND THE DIFFERENCE IS A RELATIONSHIP, NOT A SECOND NUMBER. `calc(--btn-rim * 1.5)` follows
   * the standard rim if it ever moves; `1.5px` beside `1px` is two values that agree until one is
   * edited. Asserted as the expression, because the expression is the decision.
   */
  it("Record response is the family's button, heavier by a stated relationship", () => {
    const r = rule(".qc-btn-pri");
    expect(r, "the primary rule is missing").not.toBe("");
    expect(declValue(r, "border-width"), "the extra weight is not a relationship to the standard rim")
      .toBe("calc(var(--btn-rim) * 1.5)");
    /* the extra weight is in the rim ONLY — no fill, no colour, no shadow, no bolder label */
    for (const prop of ["background", "color", "box-shadow", "font-weight", "padding"]) {
      expect(declValue(r, prop), `the primary took a ${prop} of its own — the weight is the rim alone`).toBe("");
    }
    /* and the standard rim it multiplies is a token, declared once */
    expect(css, "the standard rim stopped being a token").toContain("--btn-rim: 1px;");
    expect(declValue(rule(".qc-btn"), "border"), "the base button's rim is not the token")
      .toBe("var(--btn-rim) solid var(--btn-line)");
    expect(declValue(rule(".qc-btn"), "background"), "the base button grew a fill").toBe("var(--white)");
  });

  it("the header's Export and Log query follow it, and only on this page", () => {
    const r = rule(".qc-wpg .svh-btn");
    expect(r, "the header override is missing — the two would stay at 38px/13px").not.toBe("");
    expect(declValue(r, "height"), "the header buttons are not on the shared height").toBe("var(--btn-h)");
    expect(declValue(r, "border-radius"), "the header buttons are not on the shared radius").toBe("var(--btn-r)");
    /* ⚠️ SCOPED. `.svh-btn` is ten pages; retuning it to satisfy one would move the other nine. */
    const shell = read("../components/shell/pageHeader.css");
    expect(shell, "the shell's own button height was changed — that is every page, not this one").toContain("height: 38px");
  });

  /**
   * ⚠️ THE PRIMARY NEVER SHEDS ITS LABEL. The three secondaries are recognisable as icons and give
   * the width back; the one that names what you are about to do keeps its words at every size.
   */
  it("below ~1300 the three secondaries shed their labels, and the primary is not among them", () => {
    expect(css, "the narrow rule is gone").toMatch(/@media \(max-width: 1299\.98px\) \{[\s\S]*?\.qc-phead \.qc-btn-shrink span \{ display: none; \}/);
    /* ⚠️ THE LIVE ROW ONLY. §9 added an inert twin below it in the same cell, so a slice to the end
       of the cell counts both and reports six — which this case did, correctly, on the first run
       after §9 landed. The boundary is the live branch's own close. */
    const cell = code.indexOf('className="qc-phead"');
    const row = code.slice(cell, code.indexOf("})() : (", cell));
    expect(row, "the slice is empty — this case is testing nothing").toContain("qc-btn");
    /* the primary does not carry the shrinking modifier … */
    expect(row, "the primary was given the shrinking modifier — it would lose its label at 1280")
      .not.toMatch(/qc-btn qc-btn-pri[^"]*qc-btn-shrink/);
    /* … and exactly three controls do */
    expect((row.match(/qc-btn-shrink/g) || []).length, "the shrinking set is not the three secondaries").toBe(3);
  });
});

describe("§6 · the agent header", () => {
  it("the portrait is 58 and the name is Playfair 27", () => {
    expect(rule(".f12-heroband .f12-bigav"), "the portrait is not 58px").toContain("width: 58px");
    const n = rule(".f12-heroband .f12-hn");
    expect(declValue(n, "font-size"), "the name is not 27px").toBe("27px");
    expect(declValue(n, "font-family"), "the name lost its serif").toBe("var(--f12-serif)");
  });

  /**
   * ⚠️ NO TILE, NO FILL — and the reason is sharper than "the ref draws it plain". The state was a
   * bordered pink capsule, which made a FACT look like a control; §2 then put two REAL pills in the
   * same band (Email, Website), so the one thing that could not be pressed looked exactly like the
   * two that could.
   */
  it("the state is plain — no pill, no fill, no border", () => {
    const r = rule(".f12-hs");
    expect(r, "the state rule is missing").not.toBe("");
    expect(declValue(r, "background"), "the state took a fill again").toBe("none");
    expect(declValue(r, "border"), "the state took a rim again").toBe("0");
    expect(declValue(r, "border-radius"), "the state went back to a capsule").toBe("0");
    expect(declValue(rule(".f12-hs .f12-hsw"), "font-family"), "the status word is not Playfair").toBe("var(--f12-serif)");
  });

  /* ⚠️ THE DOT IS THE LOCKED COMPONENT AND IT SITS OUTBOARD OF THE WORD — never a recreation, and
     never tucked inside a label where it reads as decoration. */
  it("the dot is the real StatusDot, outboard of the word", () => {
    const at = code.indexOf('className="f12-hs"');
    expect(at, "the state block is missing").toBeGreaterThan(-1);
    const block = code.slice(at, code.indexOf("</span>", code.indexOf("<StatusDot", at)));
    expect(block, "the status dot went").toContain("<StatusDot status={activeQuery.status}");
    /* the word is declared BEFORE the dot in source, so the dot renders to its right */
    expect(block.indexOf("f12-hsw"), "the dot came inboard of the word").toBeLessThan(block.indexOf("<StatusDot"));
  });

  it("the contact pills sit on their own line, and grey rather than vanish", () => {
    expect(rule(".qp-hlinks"), "the pills' row is missing").not.toBe("");
    expect(declValue(rule(".qp-lnk-off"), "pointer-events"), "a pill with no target is still clickable").toBe("none");
    expect(code, "the email pill stopped stating its absence")
      .toContain("No email address on this agent's record");
  });
});

describe("§5 · the list's groups, as rendered", () => {
  it("the rules are drawn from the shared order and labels, never restated", () => {
    expect(code, "the render stopped reading the shared order").toContain("GROUP_ORDER");
    expect(code, "the render restates a group label").toContain("{GROUP_LABEL[g]} · {items.length}");
  });

  /* ⚠️ AN EMPTY GROUP DRAWS NOTHING. "OVERDUE · 0" is a heading for a state you are not in. */
  it("an empty group draws no rule", () => {
    expect(code, "empty groups still draw their rule").toContain(".filter((s) => s.items.length > 0)");
  });

  it("the fold is the closed group's alone, and only once it earns its place", () => {
    expect(code, "the fold stopped being gated on the shared threshold")
      .toContain('const foldable = g === "closed" && foldClosed(items.length)');
    expect(code, "the fold is not reachable by keyboard").toContain('e.key === "Enter" || e.key === " "');
    expect(code, "the fold does not state which way it goes").toContain('{shut ? "show" : "hide"}');
    /* ⚠️ AND IT NEVER HIDES THE ROW THE PANE IS READING — measured on dev, where the auto-select
       (first in SORT order, not group order) opened on a closed query and the list folded away the
       only marked row. Derived per render rather than an effect, so the group shuts again the
       moment the writer leaves it. */
    expect(code, "a fold can hide the selected row — the pane would have a subject the list does not show")
      .toContain("const holdsSelection = foldable && items.some((r) => r.q.id === selectedQueryId);");
    expect(code, "the fold does not read the selection").toContain("const shut = foldable && !closedOpen && !holdsSelection;");
  });

  /* ⚠️ THE OVERDUE TINT IS NOT `--burg`. Burgundy means OUTGOING on every dot in the list beneath. */
  it("overdue is terracotta, and the row ladder still rides on its tint", () => {
    expect(declValue(rule(".qc-gh-od span"), "color"), "the overdue label is not terracotta").toBe("#a05a45");
    expect(rule(".f12-row-od"), "the overdue tint went").toContain("background: #fdf6f3");
    expect(rule(".f12-row-od:hover"), "an overdue row stopped answering the pointer").not.toBe("");
  });
});

describe("§7 · the reading pane", () => {
  const tl = read("../components/reading-pane/QueryTimeline.tsx");

  /**
   * ⚠️ THE FINDING OF THIS SECTION: THE PAGE HAD TWO CLOCKS, AND §5 MADE IT VISIBLE. The pane's
   * figures came from `STAGE_RESPONSE_WINDOWS` — a house assumption of 8/12/12 weeks — while the
   * list's new position figure comes from the agent's OWN stated window, which is what
   * `taskPrecedence` has always read. An agency stating four weeks produced a list row counting to
   * week 4 and a pane counting to week 8, about one query, on one screen.
   *
   * ⚠️ THE SEAM IS ADDITIVE AND OPT-IN, so nothing else moved underneath. The to-do surfaces still
   * read the house window and that divergence is REPORTED rather than silently changed.
   */
  it("the pane counts against the agent's stated window, falling back to the house one", () => {
    const amb = read("./queryAmbient.ts");
    expect(amb, "the opt-in window seam is missing").toContain("windowWeeks?: number,");
    expect(amb, "the stated window does not win over the house assumption")
      .toContain("(windowWeeks && windowWeeks > 0 ? windowWeeks : STAGE_RESPONSE_WINDOWS[stage]) * 7");
    expect(tl, "the timeline did not pass the agent's window").toContain("agent?.responseTimeWeeks");
    expect(code, "the Tracking stats did not pass the agent's window").toContain("activeAgent.responseTimeWeeks)");
  });

  /* ⚠️ SOLID AMONG HOLLOW — the contrast IS the marker. Everything below it is a projection. */
  it("the today marker is a solid burgundy dot stating a position, not a judgement", () => {
    expect(tl, "the today marker is missing").toContain('className="tl-today"');
    expect(tl, "the marker stopped stating the position").toContain("Day {day} of ~{span}");
    expect(declValue(rule(".tl-today::before"), "background"), "the marker's dot is not solid burgundy").toBe("var(--burg)");
    /* the projections are hollow through `StatusDot`'s own `ghost` — the locked component's
       drained treatment, never a second hollow dot drawn beside it */
    expect(tl, "the projections stopped being ghosts").toContain("<StatusDot status={status} overrideSize={28} ghost decorative />");
    /* ⚠️ AND IT OMITS ITSELF RATHER THAN GUESSING. An undated import has no day to be on. */
    expect(tl, "the marker renders without a window to count against")
      .toContain("waiting.sentMs != null && waiting.expMs != null");
    /* no adjective — the app reports, it does not appraise */
    expect(tl.slice(tl.indexOf('className="tl-today"'), tl.indexOf('className="tl-today"') + 240))
      .not.toMatch(/still|only|already|good|slow|plenty/i);
  });

  it("materials are chips on the Query sent entry, not a second list", () => {
    expect(tl, "the materials chips went").toContain("tl-pills");
    expect(tl, "the chips left the Query sent rung")
      .toContain("pills: status === QueryStatus.QUERIED && queryMaterials.length ? queryMaterials : undefined");
  });

  it("the card heads carry a mono count on the right", () => {
    expect(code, "What you sent lost its count").toMatch(/\$\{n\} item\$\{n === 1 \? "" : "s"\}/);
    expect(rule(".qp-cardmeta"), "the band's meta slot went").not.toBe("");
  });
});

describe("§8 · Notes expands", () => {
  /**
   * ⚠️ THE MEASUREMENT IS THE SECTION. `height: 100%` would work only while the stack's height came
   * from its parent; the moment the first card is hidden, the box being measured against is a
   * different box and everything below jumps by the difference. The column's height is read BEFORE
   * the hide and applied as a floor.
   */
  it("the column is measured on the way in, and the floor is applied to the card", () => {
    expect(code, "the stack is not measured").toContain("notesStackRef.current?.getBoundingClientRect().height");
    expect(code, "the measurement happens after the hide — it would read the outcome, not the intent")
      .toMatch(/setNotesFloor\([\s\S]{0,80}setNotesOpen\(true\)/);
    expect(code, "the floor is not applied").toContain("style={notesOpen && notesFloor ? { minHeight: notesFloor } : undefined}");
  });

  /* ⚠️ LIFTED, NOT RELAID — What you sent HIDES and the notes card takes a deeper cast, so the state
     reads as one card raised over the column rather than as a layout change. */
  it("What you sent hides beneath it, and the open card is lifted", () => {
    expect(rule(".qp-stack--open > .f12-card:first-child"), "the first card no longer hides").toContain("display: none");
    expect(rule(".qp-notes-open"), "the open card lost its deeper cast").toContain("box-shadow:");
  });

  it("one control, both directions", () => {
    const at = code.indexOf("qp-cardexp");
    expect(at, "the expand control is missing").toBeGreaterThan(-1);
    const block = code.slice(at, at + 900);
    expect(block, "the control does not state which way it goes").toContain('notesOpen ? "Collapse notes" : "Expand notes"');
    expect(block, "the icon does not flip").toContain("notesOpen ? (");
    expect(code, "a second control was built to close what the first opened")
      .not.toMatch(/Close notes|collapseNotes/);
  });

  /* ⚠️ THE EXPANDED STATE BELONGS TO THE QUERY YOU WERE READING. Carried across, it would show a
     different query's notes at full height without being asked. */
  it("an outside click collapses it, and switching query closes it", () => {
    expect(code, "the outside-click collapse went").toContain('document.addEventListener("pointerdown", away)');
    expect(code, "a click inside the card would collapse it").toContain("card.contains(e.target)) return");
    expect(code, "the expansion survives a query change").toContain("useEffect(() => { setNotesOpen(false); setNotesFloor(null); }, [selectedQueryId]);");
  });
});


describe("§9 · nothing selected", () => {
  it("the pane names what it would hold, in the order it holds it", () => {
    expect(code, "the empty state is missing").toContain('className="qc-blank"');
    expect(code, "the heading changed").toContain("<h4>Nothing selected</h4>");
    expect(code, "the line stopped naming the three things the pane holds")
      .toContain("where it stands, what you sent, and what you&rsquo;ve noted");
    /* ⚠️ AND IT DESCRIBES THE RESULT, NOT THE MECHANISM. "Select a query to open the reading pane"
       explained the interface to someone already looking at it. */
    expect(code, "the mechanism copy came back").not.toContain("open the reading pane");
  });

  /**
   * ⚠️ THE GHOST ROW MIRRORS THE LIVE ONE, and that is the point rather than a nicety: if the two
   * differ in shape, choosing a query reflows the row the writer has just clicked next to.
   */
  it("the verbs fade and stay, in the same shape as the live row", () => {
    const cell = code.indexOf('className="qc-phead"');
    const live = code.slice(cell, code.indexOf("})() : (", cell));
    const ghost = code.slice(code.indexOf('className="qc-verbs-inert"'), code.indexOf("</span>\n            )}", cell));
    expect(ghost, "the inert row is missing").toContain("qc-btn-pri");
    for (const verb of ["Nudge", "Mark closed", "Delete"]) {
      expect(ghost, `${verb} is missing from the inert row — the row would reflow on selection`).toContain(`<span>${verb}</span>`);
    }
    /* same counts of every structural part */
    for (const part of ["qc-btn-shrink", "qc-sep", "qc-btn-icon"]) {
      const n = (s: string) => (s.match(new RegExp(part, "g")) || []).length;
      expect(n(ghost), `the inert row has a different number of ${part} — selection would reflow the row`).toBe(n(live));
    }
  });

  it("faded is not the same as reachable — the ghosts are disabled and out of the tab order", () => {
    const ghost = code.slice(code.indexOf('className="qc-verbs-inert"'), code.indexOf('className="qc-verbs-inert"') + 2200);
    expect((ghost.match(/disabled/g) || []).length, "an inert verb is still pressable").toBe(5);
    expect((ghost.match(/tabIndex=\{-1\}/g) || []).length, "an inert verb is still tabbable").toBe(5);
    expect(declValue(rule(".qc-verbs-inert"), "opacity"), "the fade is not ~35%").toBe("0.35");
    expect(declValue(rule(".qc-verbs-inert"), "pointer-events"), "the ghost row still takes the pointer").toBe("none");
  });

  /**
   * ⚠️ THE UNDO IS NOT BUILT, AND THIS RECORDS WHY RATHER THAN PRETENDING IT IS. Neither verb has an
   * undoable write today: `updateQueryStatus` returns `Promise<void>` with no revert, and
   * `deleteQuery` is a hard cascade with no restore path. Wiring `showToast`'s `undo` to something
   * that cannot revert would be a control that lies — worse than the confirm it was meant to
   * replace — so Delete keeps its counted dialogue and Mark closed keeps its reason menu.
   *
   * The shape the work needs: `updateQueryStatus` returns an undo the way `recordResponse` already
   * does (`result.undo`, which this page's `undoFnRef` already consumes and which correctly DELETES
   * the activity records rather than appending compensating ones), and Delete waits for a restore
   * path or a soft delete — which needs a field, a rules allowlist entry and a prod rules deploy.
   */
  it("the delete confirm is still the safety, because nothing can yet undo it", () => {
    expect(code, "the counted delete confirm went before an undo existed to replace it")
      .toContain('title: "Delete this query?"');
    expect(code, "a toast promises an undo the write path cannot perform")
      .not.toMatch(/undoLabel:\s*"Undo"/);
  });
});

/**
 * ══ FIX PACK 7 — the clauses the repointed locks above do not already carry ═══════════════════
 *
 * ⚠️ WHAT IS NOT HERE IS AS DELIBERATE AS WHAT IS. §2's and §4's own "Test:" lines describe a
 * LAID-OUT page — all four edges showing the rim across the header's vertical range, at rest and on
 * hover — and this repo's vitest reads source. Those are browser questions, the pack forbids a
 * deploy, and the measured harness only reaches the deployed build. What is asserted here is the
 * structure that makes those things true; the pixels are stated as unverified in the report rather
 * than implied by a green suite.
 */
describe("fix pack 7 §2 · the ring's three layers", () => {
  it("the card positions and does not clip; the frame clips; the ring overlays", () => {
    const card = rule(".f12-card");
    expect(card, "the card rule is missing").not.toBe("");
    expect(declValue(card, "position"), "the ring has nothing to position against").toBe("relative");
    /* ⚠️ CLIPPING HERE WOULD CLIP THE RING'S OWN OUTER EDGE — the reason the frame is a second
       element rather than a class on the section. */
    expect(declValue(card, "overflow"), "the card clips again — it would clip its own ring").toBe("");
    const frame = rule(".f12-card > .f12-cfr");
    expect(frame, "the clipping frame is missing").not.toBe("");
    expect(declValue(frame, "overflow"), "the frame stopped clipping — the header would square the corners").toBe("hidden");
    const ring = rule(".f12-card::after");
    expect(declValue(ring, "pointer-events"), "the ring intercepts clicks").toBe("none");
    expect(declValue(ring, "inset"), "the ring does not cover the card").toBe("0");
  });

  /* ⚠️ ONE RADIUS, INHERITED IN BOTH PLACES. The alignment amendment sets it on `.qc-wpg .f12-card`
     and it has moved twice; restating it on the frame and the ring would be two more numbers to
     keep in step. */
  it("the frame and the ring inherit the card's radius rather than restating it", () => {
    for (const sel of [".f12-card > .f12-cfr", ".f12-card::after"]) {
      expect(declValue(rule(sel), "border-radius"), `${sel} restates the radius instead of inheriting it`).toBe("inherit");
    }
  });

  /* the frame is a real element in the markup, and the header sits INSIDE it */
  it("PaneCard renders the frame, with the header inside it", () => {
    const pc = read("../components/queries/PaneCard.tsx");
    expect(pc, "the frame is not rendered").toContain('<div className="f12-cfr">');
    expect(pc.indexOf('className="f12-cfr"'), "the frame is missing").toBeGreaterThan(-1);
    expect(pc.indexOf('className="f12-chh"'), "the header escaped the frame — its fill would square the corners")
      .toBeGreaterThan(pc.indexOf('className="f12-cfr"'));
    /* ⚠️ AND NO RADIUS-MATCHING HACK ON THE HEADER, which is what the frame exists to make unnecessary */
    expect(declValue(rule(".f12-card .f12-chh"), "border-radius"), "the header grew a radius of its own").toBe("");
  });
});

describe("fix pack 7 §3 · the agent header stays white", () => {
  /**
   * ⚠️ THIS SECTION IS A LOCK AND NOTHING ELSE — §3 changes no code. The plate was made a contained,
   * raised object because it must read as THE SUBJECT the cards describe; give it the card headers'
   * parchment and it becomes a peer of them, four parchment surfaces in a column with only the lift
   * saying which is the parent. The ref explores that and recommends it; the pack rejects it. A
   * section whose whole content is "do not sweep this into §1" is precisely the kind that needs an
   * assertion rather than a note, because the next parchment pass will look exactly like §1 did.
   */
  it("the plate is white, lifted, and not the headers' parchment", () => {
    const plate = rule(".f12-heroband");
    expect(plate, "the plate rule is missing").not.toBe("");
    expect(declValue(plate, "background"), "the plate took the card headers' ground — it would become their peer")
      .toBe("var(--white)");
    expect(declValue(plate, "background"), "the plate went parchment").not.toContain("--shell-rail");
    expect(declValue(plate, "box-shadow"), "the plate lost the lift that says it is the parent").toBe("var(--sh-2)");
  });
});

describe("fix pack 7 §4 · the discs", () => {
  /* ⚠️ A PINK DISC ON A PINK GROUND IS NOT A DISC. The selected row's monogram needs a ground it can
     sit ON — the same reasoning the ref gives for the header plate's avatar. */
  it("the selected disc inverts, and the unselected ones are the pink token", () => {
    const on = rule(".f12-row.f12-sel .f12-av");
    expect(on, "the selected disc has no treatment of its own").not.toBe("");
    expect(declValue(on, "background"), "the selected disc did not invert").toBe("var(--white)");
    expect(declValue(on, "color"), "the selected disc's initials are not near-black").toBe("var(--ink)");
    /* the base disc is the soft pink token, and the list's `--sm` modifier no longer overrides it */
    expect(declValue(rule(".f12-row .f12-av"), "background"), "the base disc left the pink token").toBe("var(--pink-av)");
    expect(declValue(rule(".f12-row .f12-av--sm"), "background"), "the warm-neutral override came back").toBe("");
    /* ⚠️ AND THE TOKEN IT READ IS GONE WITH ITS ONLY READER — a token left defined and unread is an
       invitation for the override to return without its argument. */
    expect(css, "--mono-tonal came back").not.toContain("--mono-tonal:");
  });
});
