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
import { sliceBetween } from "../test/sliceBetween";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const css = read("../components/shell/f12.css");
const queries = read("../components/Queries.tsx");
const ambient = read("./queryAmbient.ts");
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
    /* ⚠️ 32 → 40 AND 8 → 10 (§3) — the verbs were lighter than the things they act on. The clause is
       unchanged and is the reason this case exists: the values are TOKENS, declared once, so "one
       button" stays enforceable by grep as well as by eye. */
    expect(css, "the button tokens are gone").toContain("--btn-h: 40px; --btn-r: 10px; --btn-line: #e2d8ca;");
  });

  it("the base button reads them, and states one rim and one hover", () => {
    const r = rule(".qc-btn");
    expect(r, "the button rule is missing").not.toBe("");
    expect(declValue(r, "height"), "the height stopped being the token").toBe("var(--btn-h)");
    expect(declValue(r, "border-radius"), "the radius stopped being the token").toBe("var(--btn-r)");
    expect(declValue(r, "font-size"), "the type size moved off 13px").toBe("13px");
    expect(declValue(r, "font-weight"), "the weight moved off 500").toBe("500");
    expect(declValue(r, "gap"), "the icon gap moved off 7px").toBe("7px");
    /* ⚠️ TRANSPARENT AT REST (§3), AND THE RIM IS KEPT RATHER THAN REMOVED — a `border: 0` state
       and a `border: 1px` hover would move every label by a pixel on hover. The single border
       COLOUR is now the hover's, which is where a rim is drawn at all. */
    expect(declValue(r, "border"), "the rim stopped being a transparent placeholder").toContain("transparent");
    expect(rule(".qc-btn:hover"), "the hover rim is not the single border colour").toContain("var(--btn-line)");
    expect(declValue(rule(".qc-btn svg"), "width"), "the icon moved off 13px").toBe("16px");
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
  /**
   * ⚠️ INVERTED BY §3 — THE PRIMARY IS TEXT WEIGHT NOW, NOT A HEAVIER RIM. With no rim at rest
   * there is nothing to thicken, and the pack's rule is that weight alone separates the two verbs
   * that move the query forward from the three that end it.
   *
   * ⚠️ THE OLD CASE'S FINDING IS WORTH KEEPING EVEN THOUGH ITS SUBJECT IS GONE: `calc(1px * 1.5)`
   * computed to `1px` at DPR 1 and 1.5px at 2×, so whether the page had a visible primary depended
   * on the monitor. A rim distinction has to be a whole device pixel. Recorded here because the
   * next person reaching for a fractional rim will not have measured it.
   */
  it("Record response is the family's button, heavier by weight rather than by rim", () => {
    const r = rule(".qc-btn-pri");
    expect(r, "the primary rule is missing").not.toBe("");
    expect(declValue(r, "border-width"), "the primary took a rim back").toBe("");
    expect(parseInt(declValue(r, "font-weight"), 10), "the primary is not heavier than the base")
      .toBeGreaterThan(parseInt(declValue(rule(".qc-btn"), "font-weight"), 10));
    /* ⚠️ AND NO GROUND, EVER. A second filled button one column from `Log new query` is the
       collision the pack names by hand: if the primary fails to read, the correction is full ink
       on it and muted on the rest. */
    expect(declValue(r, "background"), "the primary took a ground").toBe("");
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
    /* ⚠️ FOUR SINCE §5 — `View related tasks` joined the bar and sheds its label at the same width
       as the other secondaries. What this clause is for is that the PRIMARY is not among them. */
    expect((row.match(/qc-btn-shrink/g) || []).length, "the shrinking set is not the secondaries").toBe(4);
  });
});

/**
 * ⚠️ §6 DESCRIBED A PLATE THAT IS NOW HALF OF THE PAIRING CARD. Three of its four cases inverted
 * outright — the portrait, the status word and the dot beside it were all REMOVED by §1, each for
 * a stated reason — and the fourth (the contact pills) survives unchanged. Kept as inversions,
 * because "the header lost its portrait and its status" is exactly the regression that reads as a
 * bug to anyone who did not follow the merge.
 */
describe("§6 · the agent header — now the mail header's AGENT row", () => {
  /**
   * ⚠️ THE PORTRAIT IS GONE AND THE NAME GREW. A monogram was decoration once the position holds
   * the query's real StatusDot; the name went 27 → 26px, which is not a reduction but an
   * ALIGNMENT — the manuscript opposite reads at the same size, because the card's claim is that
   * the two are peers.
   */
  it("no portrait, and the name is the same step as the manuscript's", () => {
    expect(rule(".f12-heroband .f12-bigav"), "the monogram came back").toBe("");
    expect(code, "the initials are computed again with nothing to render them").not.toContain("agentInitials(activeAgent)");
    /* ⚠️ 26 → 20 (subrows §1). Not a reduction but a re-scaling: the pairing card gave each name a
       half of the card, and a row gives it a line. 20 is a step above the reading cards' 18px
       headers, which is the hierarchy this card already had. Both names still read one element. */
    /* ⚠️ 20 → 24 → 23 ACROSS THREE PACKS, and it is one shared step again. The middle one gave the
       agent a larger face to say which line was the subject; §4 takes the hierarchy off the TYPE
       and puts it on the CARD, because type carrying it survives neither a long title nor a later
       change to the scale. */
    const n = rule(".qc-mname");
    expect(declValue(n, "font-size"), "the two names are no longer one type step").toBe("23px");
    expect(declValue(n, "font-family"), "the name lost its serif").toBe("var(--f12-serif)");
  });

  /**
   * ⚠️ INVERTED: THE STATE IS NOT DRAWN HERE AT ALL. §6's law was "no tile, no fill — a FACT must
   * not look like a control", and it was right; §1 goes further on the same reasoning. Tracking's
   * header meta states the status and Tracking's first event states the date, both within a
   * hundred pixels, so the plate's copy was a second statement rather than a badly-dressed one.
   */
  it("the state is not restated — Tracking's header and first event carry it", () => {
    expect(rule(".f12-hs"), "the state block came back").toBe("");
    const card = code.slice(code.indexOf('<div className="qc-pair">'), code.indexOf('<div className="qp-cols"'));
    expect(card, "the status word came back to the card").not.toContain("statusDisplayLabel");
    expect(card, "the state's date came back to the card").not.toMatch(/lastStatusChange|heroQueriedOn/);
    /* and Tracking still states both, which is what makes the removal a de-duplication */
    expect(code, "Tracking stopped stating the status").toContain("meta={statusDisplayLabel(activeQuery)}");
  });

  /**
   * ⚠️ THE DOT SURVIVES AND BECAME THE MARK. It is still the locked component, never a recreation,
   * still outboard, and still declared before what it sits beside — what changed is that it has no
   * label any more: at 66px it IS the statement, which is why the word could go.
   */
  it("the dot is the real StatusDot, and it is the card's left mark", () => {
    expect(code, "the mark is not the locked component at the stated size")
      .toContain("<StatusDot status={activeQuery.status} overrideSize={56} />");
    /* ⚠️ THE MARK IS THE STATUS BLOCK'S NOW, NOT THE AGENT ROW'S — one mark on the card, in the
       right-hand column, which is what let the second one go. "It leads its name" was true of a
       two-subject card and has no subject here. */
    const block = code.slice(code.indexOf('<div className="qc-mstatus">'), code.indexOf('<div className="qp-cols"'));
    expect(block, "the status block does not hold the mark").toContain("<StatusDot");
    expect(block.indexOf("<StatusDot"), "the mark fell behind its own label")
      .toBeLessThan(block.indexOf("qc-mswd"));
    const card = code.slice(code.indexOf('<div className="qc-mail">'), code.indexOf('<div className="qp-cols"'));
    expect((card.match(/<StatusDot/g) ?? []).length, "a second mark was drawn on the card").toBe(1);
  });

  it("the contact pills sit on their own line, and grey rather than vanish", () => {
    /* ⚠️ THEY ARE CHIPS ON THE RAIL NOW, AND THEY SHOW THEIR VALUE. Under the name rather than
       beside it, because beside it the longest agency decided where every address began. */
    expect(rule(".qc-msub"), "the sub-row that holds them is missing").not.toBe("");
    expect(rule(".qc-mchip-con"), "the contact chips have no rule").not.toBe("");
    /**
     * ⚠️ INVERTED BY §7 — AN ABSENT VALUE IS AN ACTION NOW, so the pill with no target is precisely
     * the one that must be clickable. `pointer-events: none` was the right treatment while there
     * was nothing to click and is the wrong one the moment there is; the `.off` state goes with it.
     *
     * ⚠️ AND THE ABSENCE IS STILL STATED, which is what the old clause was for — as an invitation
     * rather than as a fact with no way out of it.
     */
    expect(code, "the dead-pill treatment is back").not.toContain('qc-mchip-con${email ? "" : " off"}');
    expect(code, "the email pill stopped offering the way out of its absence").toContain("Add an email");
    expect(code, "the website pill stopped offering the way out of its absence").toContain("Add a website");
    expect(code, "adding an email does not write to the agent").toContain('updateAgent(activeAgent.id, agentEdit === "email" ? { email: value } : { website: value })');
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
    /* ⚠️ THE FOLD MOVED INTO THE SHARED DERIVATION (§4c) — the arrows need to know which rows are
       showing, and computing that twice is how Down comes to skip a row that is plainly on screen.
       Both clauses are unchanged; what changed is that they are now computed once, above the
       render, and read by the keyboard model as well. */
    expect(code, "a fold can hide the selected row — the pane would have a subject the list does not show")
      .toContain("const holdsSelection = foldable && items.some((r) => r.q.id === selectedQueryId);");
    expect(code, "the fold does not read the selection").toContain("shut: foldable && !closedOpen && !holdsSelection");
    expect(code, "a folded group still contributes rows to the arrows' order")
      .toContain("visibleIds = listGroups.flatMap(({ items, shut }) => (shut ? [] : items.map((r) => r.q.id)))");
  });

  /**
   * ⚠️ THE TINT IS GONE, AND WHAT THE CASE WAS FOR SURVIVES IT. It asserted two things: that the
   * overdue ACCENT is terracotta and not `--burg` (which means OUTGOING on every dot in the list
   * beneath it), and that the row carried a tint. The first is the durable one and is unchanged.
   *
   * ⚠️ THE SECOND IS INVERTED RATHER THAN DELETED, BECAUSE THE TINT HAD THREE LIVES — a warm pink,
   * then the scale's n2, now nothing — and a deleted case would let a fourth arrive unremarked. An
   * overdue row sits on the same ground as every other row: the state is already stated by the
   * `+N DAYS` figure and by the dot, and a tint was the row saying in colour what it says twice
   * already in words and in a mark.
   */
  it("overdue is terracotta, and the row carries no tint at all", () => {
    expect(declValue(rule(".qc-gh-od span"), "color"), "the overdue label stopped reading its token").toBe("var(--qc-acc-late)");
    expect(css, "the overdue accent is not terracotta").toContain("--qc-acc-late: #a05a45;");
    expect(css, "the overdue accent went burgundy").not.toContain("--qc-acc-late: var(--burg)");
    /* the rules, the tokens and the class are all gone — a rule that paints nothing is the next
       thing someone puts a value back into */
    expect(rule(".f12-row-od"), "the overdue tint came back").toBe("");
    expect(rule(".f12-row-od:hover"), "the overdue hover came back").toBe("");
    expect(css, "the tint's token came back").not.toContain("--qc-surf-row-od");
    expect(code, "the row still carries the class the tint hung off").not.toContain("f12-row-od");
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

  /**
   * ⚠️ INVERTED BY THE PAIRING PACK'S §2 — THE TODAY MARKER IS REMOVED, and §7's own two arguments
   * are what removed it. It was built as "the only point on the line that is true right now" and it
   * "states a position, not a judgement" — both defensible, and both undone by what sits around it:
   * `Waiting to hear back` already carries the elapsed figure as its date, and the stats strip above
   * counts the same days against the same expected date, so the position was stated three times.
   *
   * ⚠️ AND IT WAS A MARK WITH NO EVENT BEHIND IT — the one node on the timeline recording that
   * nothing had happened — drawn only on waiting-and-dated queries, which is most of what made two
   * Tracking cards look differently spaced. Asserted dead in both files, because a burgundy dot
   * among hollow ones is a good idea that will be had again.
   */
  /**
   * ⚠️ §2 · THE STRIP IS A FIXED SKELETON, AND THIS REVERSES ITS OWN BLOCK'S RULE. The render
   * carried "a dash against a caption states nothing while taking a line to do it" — true of a
   * DASH, and still true. `Not set` is not a dash: it states that nobody has recorded an expected
   * reply, which is a fact about the record and the one the timeline below offers to fix. Omitting
   * the cell made two queries differing by one absent field into two different card SHAPES.
   *
   * ⚠️ ASSERTED AS A CONSTRUCTION, NOT AS A COUNT. The old code pushed conditionally into an array,
   * so "two cells" was an outcome; the array is a literal of two now, and no `if` can shorten it.
   * That is the difference between a skeleton and a coincidence.
   */
  it("the stats strip renders both cells whether or not an expected date exists", () => {
    /* ⚠️ THE DERIVATION MOVED OUT OF THE CARD, and that is the case. It was built inline, so the
       "Not set" branch could only be exercised by a record the dev account does not hold — every
       query there has an expected date, and the browser measure proved the SHAPE while never
       running the branch. `trackingStatCells` is pure and exhaustively covered in
       `queryAmbient.test.ts`, from inputs the real derivation produced. */
    expect(code, "the cells are built in the card again — the absent branch becomes untestable")
      .toContain("const cells = trackingStatCells(amb);");
    expect(code, "the cells are pushed conditionally again — a shape that depends on the data")
      .not.toContain("cells.push(");
    /* ⚠️ AND THE GLYPH STAYED BEHIND, which is why the move was possible: a lib returning JSX is a
       lib a node-environment test cannot call. */
    expect(code, "the glyphs followed the derivation into the lib").toContain("STAT_GLYPH[c.key]");
    expect(ambient, "the derivation lost its absent state").toContain('caption: "Reply expected by", absent: true');
    expect(ambient, "the waiting cell lost its absent state").toContain('caption: "Date sent", absent: true');
    expect(ambient, "the strip stopped being scoped to the state its figures describe")
      .toContain('if (a.mode !== "waiting") return [];');
  });

  it("the today marker is REMOVED — its position is stated by the events themselves", () => {
    expect(tl, "the today marker came back").not.toMatch(/["\s`]tl-today["\s`]/);
    expect(tl, "its copy came back under another class").not.toContain("Day {day} of ~{span}");
    expect(rule(".tl-today"), "its rules survive with nothing wearing them").toBe("");
    expect(rule(".tl-todaywhen"), "its label's rule survives").toBe("");
    /* ⚠️ AND THE FIGURE IT STATED IS STILL ON THE PAGE, which is what makes this a de-duplication
       rather than a loss: the waiting event carries the elapsed label as its own date. */
    /* ⚠️ `elapsedLabel` → `elapsedPhrase` (§4a): one formatter, and the unit scales. The old one
       stopped at weeks, so a two-year-old query read "121 weeks". */
    expect(tl, "the elapsed figure went with the marker").toContain("elapsedPhrase(waiting.nDays)");
  });

  it("materials are chips on the Query sent entry, not a second list", () => {
    expect(tl, "the materials chips went").toContain("tl-pills");
    expect(tl, "the chips left the Query sent rung")
      .toContain("pills: status === QueryStatus.QUERIED && queryMaterials.length ? queryMaterials : undefined");
  });

  it("the card heads carry a mono count on the right", () => {
    /* ⚠️ THE MATERIALS COUNT WENT WITH ITS CARD (§1). Three rows are their own inventory; a band
       counting what the reader can already see was a header convention rather than a fact worth
       stating. Notes keeps its count because its list scrolls and the band is the only place a
       total fits — which is the distinction, not a carve-out. */
    expect(code, "a materials count came back over rows the reader can see")
      .not.toMatch(/\$\{n\} item\$\{n === 1 \? "" : "s"\}/);
    expect(rule(".qp-cardmeta"), "the band's meta slot went").not.toBe("");
  });
});

/**
 * ⚠️ §8 IS RETIRED BY §1 OF THE PAIRING PACK, AND THE WHOLE DESCRIBE INVERTS. Its four cases held
 * a careful mechanism — measure the stack, hide "What you sent", pin the column at the height it
 * had, collapse on an outside click, reset per query — and every one of them existed because Notes
 * SHARED the right column and got whatever height was left. The merge removed the sharing rather
 * than the symptom: Notes has the column outright.
 *
 * ⚠️ ASSERTED DEAD RATHER THAN DELETED, because "Notes lost its expand button" is exactly the
 * regression a future reader would repair — and repairing it would rebuild a toggle whose only
 * effect was `display: none` on an element that is no longer rendered.
 */
describe("§8 · Notes expands — RETIRED with the column it shared", () => {
  it("the expansion state, its floor and its listener are gone from the page", () => {
    for (const t of ["notesOpen", "notesFloor", "notesStackRef", "notesCardRef", "setNotesOpen"]) {
      expect(code, `${t} survives with nothing rendering it`).not.toContain(t);
    }
  });

  it("its three rules are gone from the stylesheet", () => {
    for (const sel of [".qp-stack--open > .f12-card:first-child", ".qp-notes-open", ".qp-cardexp"]) {
      expect(rule(sel), `${sel} survives with nothing wearing it`).toBe("");
    }
  });

  /* ⚠️ AND THE THING IT WAS FOR IS TRUE WITHOUT IT: the stack holds ONE card, which fills. */
  it("Notes has the column outright, which is what the toggle was reaching for", () => {
    expect(code, "the stack is conditional again").toContain('className="qp-stack"');
    expect(rule(".qp-stack > .f12-card"), "the card no longer takes the column's height")
      .toContain("flex: 1 1 0");
    expect((code.match(/<PaneCard/g) ?? []).length, "a second card returned to the stack").toBe(2);
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
    /**
     * ⚠️ THE UNCONDITIONAL VERBS ONLY, SINCE §5. `View related tasks` is HIDDEN at zero — a control
     * that opens onto nothing is a control that lies — so it is absent on most queries and cannot
     * be in a shape drawn for no query at all. Putting it in the ghost would promise a button most
     * selections do not produce, which is the same reflow this clause guards against, pointing the
     * other way.
     *
     * ⚠️ SO THE COMPARISON DROPS IT FROM THE LIVE SIDE rather than adding it to the ghost, and the
     * clause is unchanged for the four verbs that are always there.
     */
    const withoutTasks = live.replace(/\{queryTaskBadge\(tasks, activeQuery\.id\)\.count > 0 && \([\s\S]*?\)\}/, "");
    expect(withoutTasks.length, "the tasks control was not found in the live row — the comparison below is vacuous")
      .toBeLessThan(live.length);
    for (const part of ["qc-btn-shrink", "qc-sep", "qc-btn-icon"]) {
      const n = (s: string) => (s.match(new RegExp(part, "g")) || []).length;
      expect(n(ghost), `the inert row has a different number of ${part} — selection would reflow the row`).toBe(n(withoutTasks));
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
    /* ⚠️ THE RULE IS `.f12-chh`, UNSCOPED SINCE §1, so the list panel wears the same declarations
       rather than a copy. The clause is unchanged: no radius of its own, because the frame clips. */
    expect(declValue(rule(".f12-chh"), "border-radius"), "the header grew a radius of its own").toBe("");
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
  it("the header card is white, lifted, and not the headers' parchment", () => {
    /* ⚠️ THE ELEMENT CHANGED, THE RULING DID NOT (§1). The plate is the pairing card now, and the
       argument transfers intact: give the object above the cards their parchment and it becomes a
       peer of the things it describes. It has a second defence now — a 2px frame nothing else on
       the page carries — but the ground is still the first one. */
    const plate = rule(".qc-mail");
    expect(plate, "the header card's rule is missing").not.toBe("");
    expect(declValue(plate, "background"), "the plate took the card headers' ground — it would become their peer")
      .toBe("var(--white)");
    expect(declValue(plate, "background"), "the plate went parchment").not.toContain("--shell-rail");
    expect(declValue(plate, "box-shadow"), "the plate lost the lift that says it is the parent").toBe("var(--sh-2)");
  });
});

describe("fix pack 7 §4 · the discs", () => {
  /* ⚠️ A PINK DISC ON A PINK GROUND IS NOT A DISC. The selected row's monogram needs a ground it can
     sit ON — the same reasoning the ref gives for the header plate's avatar. */
  /**
   * ⚠️ SUPERSEDED BY §4a — THE ROW HAS NO DISC AT ALL. The monogram was replaced by the status mark
   * at the row's left, so the initials, their pink token and the selected inversion all went with
   * it. The case is turned round rather than deleted: it now asserts the absence, so the disc
   * cannot quietly return alongside the mark and give the row two round objects.
   *
   * ⚠️ AND `.f12-av` ITSELF IS UNTOUCHED — it is a different disc elsewhere on the page. What is
   * gone is every rule that scoped it to a list row.
   */
  /**
   * ⚠️ THE DISC IS BACK (§3's reset) — and what does NOT come back with it is the closed-agency
   * variant, which tinted the monogram for an agency shut to submissions. That is a fact the Agent
   * list carries and this row never explained; a reset is a layout, not a licence to revive
   * everything that was ever attached to it.
   */
  it("the row's disc returns, and the closed-agency variant does not", () => {
    expect(rule(".f12-row .f12-av"), "the monogram has no rule").not.toBe("");
    expect(declValue(rule(".f12-row.f12-sel .f12-av"), "background"), "the selected disc no longer inverts").toBe("var(--white)");
    expect(rule(".f12-row.f12-shut .f12-av"), "the closed-agency tint came back with it").toBe("");
    expect(code, "the row stopped computing its initials").toContain("agentInitials(agent)");
  });
});
