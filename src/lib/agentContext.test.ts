/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE AGENT CONTEXT PANEL — quiet reference.
 * Refs: qc-agent-panel-v2.html (sections, three data states) · qc-focus.html panel 2 (weight).
 *
 * ⚠️ SUPERSEDES two earlier locks. The first panel was a flat label/value table in a column that
 * STRETCHED to fill. The second gave it an identity block — monogram, agency in Playfair 18, the
 * agent's name — all of which already sit in the agent row on the LEFT at twice the size, so the
 * panel read as a second subject competing with the form. It is now an aside: flat ground, no
 * shadow, Inter values, and a caption bar saying what the column is for.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import {
  panelHeader, statCells, noReplyPolicy, agentHistory, historyLine, seekingChips, agentAsks,
  freshnessStamp, panelState, WORD_COUNT_BLOCKED, PARTIAL_TAIL, NAME_ONLY_NOTE,
} from "./agentContext";
import { SubmissionStatus, SubmissionMethod, QueryStatus, type Agent, type Query } from "../types";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const css = read("../components/shell/f12.css");
const panel = read("../components/queries/AgentContextPanel.tsx");
const pane = read("../components/queries/QueryCreatePane.tsx");

const bare = (over: Partial<Agent> = {}): Agent => ({
  id: "a1", userId: "u", name: "William Tan", agency: "Foxglove Literary", email: "", website: "",
  genres: [], mswlNotes: "", submissionStatus: SubmissionStatus.OPEN,
  submissionMethod: SubmissionMethod.EMAIL, materialsWanted: [], dateAdded: "2026-01-01",
  lastCheckedDate: "2026-08-01", notes: "", ...over,
}) as Agent;

const rich = (over: Partial<Agent> = {}) => bare({
  genres: ["Literary", "Upmarket"], responseTimeWeeks: 8, noResponseMeansNo: true,
  materialsWanted: ["Query Letter", "Synopsis"],
  mswlNotes: "Voice-driven literary fiction with a strong sense of place.", ...over,
});

const q = (id: string, status: QueryStatus, dateSent: string): Query =>
  ({ id, agentId: "a1", manuscriptId: "m1", status, dateSent }) as never;

const rule = (sel: string): string => {
  const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = new RegExp("\\n[ \\t]*" + esc + "\\s*[,{]").exec(css);
  if (!m) return "";
  const open = css.indexOf("{", m.index);
  return open < 0 ? "" : css.slice(m.index, css.indexOf("}", open) + 1);
};

/* ══════════════════════════════════════════════════════════════════════════════════════════
   ⚠️ A MALFORMED CSS COMMENT SWALLOWS THE RULE AFTER IT, IN SILENCE. Closing a block early with
   a stray terminator leaves the remaining prose as CSS garbage, and the browser drops it with
   whatever declaration follows — no error, a green build, and a panel that has simply lost its
   border and its tilt. It happened in this pass: the `.qc-ctx` rule vanished from `dist/` while
   every source-string assertion below still passed, because they read the SOURCE, where the rule
   is plainly there.

   The tell is cheap. Every ⚠️ in this sheet lives inside a comment, so if one survives
   comment-stripping, a block was closed early.
   ══════════════════════════════════════════════════════════════════════════════════════════ */
describe("f12.css is a valid sheet, not just a file containing the right words", () => {
  it("no comment block is closed early", () => {
    const stripped = css.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(stripped, "a stray terminator left prose outside a comment — the next rule is dropped")
      .not.toContain("*" + "/");
    expect(stripped, "a ⚠️ outside a comment means a block closed early").not.toContain("⚠");
  });
});

/* ══ QUIET REFERENCE — an aside, not a second subject ══════════════════════════════════════ */
describe("the panel reads as quieter than the form", () => {
  it("flat ground, no shadow — a shadow would imply floating", () => {
    const r = rule(".qc-ctx");
    expect(r, "the panel rule is missing").not.toBe("");
    expect(r).toContain("background: #fbf9f5");
    expect(r, "a shadow makes it float; this sits back").not.toContain("box-shadow");
  });

  /* ══ A CARD LAID ON THE DESK (ref qc-tilt.html, b2 + t1) ══════════════════════════════════ */
  it("a dotted edge and six-tenths of a degree — not a hairline UI box", () => {
    const r = rule(".qc-ctx");
    expect(r).toContain("border: 1.5px dotted #cdbfa9");
    expect(r).toContain("transform: rotate(-0.6deg)");
  });

  /* ⚠️ DOTTED, NOT DASHED. Dashed already means draft/placeholder in this app — the create draft
     row and every un-commissioned ArtSlot wear it — so a dashed panel would say "this content is
     provisional" about a record that is anything but. */
  it("dotted, because dashed already means provisional here", () => {
    expect(rule(".qc-ctx"), "dashed collides with the app's placeholder grammar")
      .not.toContain("dashed");
    expect(read("../components/todo/artSlot.css"), "the grammar this must stay distinct from")
      .toContain("dashed");
  });

  /* ⚠️ `transform` CREATES A CONTAINING BLOCK. A `position: fixed` descendant would anchor to the
     panel instead of the viewport and land wherever the rotation put it. The panel is
     reference-only — links and the wish-list toggle — and must stay that way while it is tilted. */
  it("nothing inside is position:fixed, and the reason is written down", () => {
    expect(panel, "a fixed child would anchor to the panel, not the viewport")
      .not.toContain("position: \"fixed\"");
    expect(css).toContain("NO `position: fixed` DESCENDANT MAY LIVE IN HERE");
    expect(css, "the instruction must be to drop the rotation, not to hack the popover")
      .toContain("REMOVE THE ROTATION");
  });

  /* ⚠️ ROTATION NEEDS CLEARANCE — a rotated box's corners extend past its layout box by about
     (height · sin θ)/2 horizontally, ~4px at this panel's tallest. */
  /* ⚠️ THE OVERHANG IS DRIVEN BY HEIGHT, NOT WIDTH: (h · sin θ)/2 sideways, which at θ = 0.6° is
     h / 191. 6px was measured as sufficient at 1440×900 (h = 558 → 2.89px) and would have clipped
     on a portrait display, where the row runs ~1400px tall. 10px holds to h = 1910px. */
  it("and it has margin to rotate into, sized off the tallest it can get", () => {
    expect(rule(".qc-ctx")).toContain("margin: 10px");
    const HEIGHT_LIMIT = 10 / (Math.sin((0.6 * Math.PI) / 180) / 2);
    expect(HEIGHT_LIMIT, "10px must clear any real display's row height").toBeGreaterThan(1800);
  });

  /* ⚠️ NOT GATED ON prefers-reduced-motion. This is a static transform, not motion: nothing
     animates and there is no vestibular effect to spare anyone. Gating it would hand those users
     a different design rather than a calmer one. */
  it("reduced motion does not straighten it — there is no motion to reduce", () => {
    const at = css.indexOf("prefers-reduced-motion");
    const reduced = css.slice(at);
    expect(reduced, "the tilt was gated on reduced motion").not.toContain("rotate(0");
  });

  it("values are Inter, not Playfair — serif numerals read as a second headline", () => {
    expect(rule(".qc-ctxv")).toContain("font-family: inherit");
    expect(rule(".qc-ctxv"), "the serif came back").not.toContain("var(--f12-serif)");
  });

  /* ⚠️ "THIS AGENT AT A GLANCE" REPLACES THE "FOR REFERENCE" CAPTION BAR. That bar named the
     column's FUNCTION and nothing else, on the reasoning that an identity block would compete
     with the agent row on the left — so the one line of a reference card that tells you whose
     card it is was the line it did not have. The name is a 7.5px mono CAPTION under the title,
     not a second headline, so the hierarchy the old bar protected survives. */
  it("the header names the agent, and the full identity block stays gone", () => {
    expect(panel, "the monogram came back").not.toContain("qc-ctxmg");
    expect(panel, "the agency heading came back").not.toContain("<h3>");
    expect(panel, "the caption bar was not replaced").not.toContain("For reference");
    expect(panel).toContain("This agent at a glance");
    expect(panel, "the name must come from the shared display helper").toContain("{agentPrimary(agent)}");
    expect(rule(".qc-glancew"), "the name is a caption, never a headline")
      .toContain("var(--f12-mono)");
    expect(rule(".qc-glanceh")).toContain("font-size: 15px");
  });

  /* The disc is a wash bleeding off the top-right corner — it is what stops the gradient reading
     as a flat tinted strip. The pill must sit ABOVE it or the wash tints it a different green
     from every other pill in the app. */
  it("a soft gradient ground with a burgundy disc bleeding off the corner", () => {
    expect(rule(".qc-glance")).toContain("linear-gradient(135deg, #f4efe6, #faf7f2)");
    const disc = rule(".qc-glance::after");
    expect(disc).toContain("border-radius: 50%");
    expect(disc).toContain("rgba(180, 90, 64, 0.05)");
    expect(rule(".qc-ctxpill"), "the disc would tint the pill").toContain("z-index: 1");
  });

  it("the person mark is bordered, not a bare glyph", () => {
    const mk = rule(".qc-glancemk");
    expect(mk).toContain("width: 30px");
    expect(mk).toContain("var(--pink-b)");
    expect(mk).toContain("var(--pink-i)");
  });

  it("but the one fact the left column does not carry survives — their door", () => {
    expect(panelHeader(bare({ submissionStatus: SubmissionStatus.CLOSED })).status).toMatchObject({ open: false });
    expect(panelHeader(bare()).status).toMatchObject({ open: true });
    expect(panelHeader(bare({ submissionStatus: SubmissionStatus.UNKNOWN })).status,
      "UNKNOWN reads as open app-wide and is not a stated fact").toBeNull();
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════
   ⚠️ THE MARGINALIA TREATMENT — CAPPUCCINO ONLY (fix pack 2 §5, ref 69 treatment C).
   Read-only surfaces recede by dropping their AFFORDANCE SIGNALS, not by taking a new hue, and
   the text colour never changes — the whole point is that it gets read.
   ══════════════════════════════════════════════════════════════════════════════════════════ */
describe("the reference panel reads as marginalia, not as a second card", () => {
  const index = read("../index.css");

  /* Tokens in the THEME scope, never the base sheet — that is what keeps Bold and Editorial out
     of it without a single override of their own. */
  it("the tokens live under .t-capp, and the base sheet holds none of them", () => {
    const capp = index.slice(index.indexOf(".t-capp {"), index.indexOf("--bd: #d8cebf"));
    expect(capp).toContain("--qc-ref-rim: 1px dashed rgba(124, 58, 42, 0.28)");
    expect(capp).toContain("--qc-ref-rule:");
    expect(capp).toContain("--qc-ref-plate:");
    expect(css, "a theme token in the base sheet would apply to every theme")
      .not.toContain("--qc-ref-rim:");
  });

  /* ⚠️ THE DASHED RIM IS PERMITTED HERE AND NOWHERE ELSE — dashed means draft/placeholder
     everywhere else in this app. Scoping it to one component in one theme is what stops it
     spreading. */
  it("the dashed rim is scoped to .t-capp, and the base rim is untouched", () => {
    expect(css).toContain(".t-capp .qc-ctx { border: var(--qc-ref-rim); }");
    expect(rule(".qc-ctx"), "the unthemed rim must stay dotted").toContain("dotted");
    const dashed = [...css.matchAll(/^[^\n]*dashed[^\n]*$/gm)].map((m) => m[0]);
    for (const line of dashed) {
      if (line.includes("--qc-ref-rim") || line.includes("*")) continue;
      expect(line, "a second dashed rim would dilute the exception").not.toContain(".qc-ctx");
    }
  });

  /* ⚠️ VALUES KEEP THE STANDARD INK. Dimming them is the one change that would cost the panel its
     job. Captions and the stamp are the muted ones, and already were. */
  it("values keep the ink token; only captions are muted", () => {
    expect(css).toContain(".t-capp .qc-ctxv { color: var(--ink); }");
    expect(rule(".qc-ctxk"), "captions are the muted ones").toContain("var(--muted)");
    expect(rule(".qc-ctxfoot"), "the footer stamp too").toContain("var(--faint)");
  });

  it("no drop shadow — the panel does not sit above the page", () => {
    expect(rule(".qc-ctx")).not.toContain("box-shadow");
    const capp = css.slice(css.indexOf(".t-capp .qc-ctx"), css.indexOf("QUIET REFERENCE"));
    expect(capp, "the treatment must not add one either").not.toContain("box-shadow");
  });

  /* Fills say "surface"; rules say "record". */
  it("fills go, rules stay", () => {
    for (const sel of [".t-capp .qc-glance", ".t-capp .qc-ctxstats", ".t-capp .qc-ctxpolicy", ".t-capp .qc-ctxhist", ".t-capp .qc-ctxg"]) {
      expect(rule(sel), `${sel} kept its fill`).toContain("background: none");
    }
    expect(rule(".t-capp .qc-glance")).toContain("border-bottom: var(--qc-ref-rule)");
    expect(rule(".t-capp .qc-ctxpolicy"), "a sentence should read as one").toContain("font-style: italic");
    expect(rule(".t-capp .qc-ctxquote"), "a pull-quote is set apart, not a row")
      .toContain("var(--qc-ref-plate)");
  });

  /* ⚠️ RECEDED IS NOT DISABLED. It is reference, and reference gets read and clicked. */
  it("the panel stays reachable — no pointer-events, no tabindex, no dimming", () => {
    const capp = css.slice(css.indexOf(".t-capp .qc-ctx"), css.indexOf("QUIET REFERENCE"));
    expect(capp).not.toContain("pointer-events");
    expect(capp, "a receded panel must not be a dimmed one").not.toContain("opacity");
    expect(panel, "its controls must stay in tab order").not.toContain('tabIndex={-1}');
    expect(panel, "the wish-list toggle is a real button").toContain('<button type="button" className="qc-ctxmore"');
  });

  /* Bold is locked and correct in dev; Editorial is monochrome and has nothing to recede from. */
  it("Bold Pastille and Editorial are untouched", () => {
    for (const theme of [".t-bold .qc-ctx", ".t-edn .qc-ctx", ".t-bold .qc-glance", ".t-edn .qc-glance"]) {
      expect(rule(theme), `${theme} gained an override`).toBe("");
    }
  });

  /* The pill is a STATE signal, not part of the surface treatment. */
  it("and the sage status pill is left alone", () => {
    expect(rule(".qc-ctxpill")).toContain("#e9ede6");
    expect(rule(".t-capp .qc-ctxpill"), "the treatment must not reach it").toBe("");
  });
});

/* ══ THE PANEL COLUMN ══════════════════════════════════════════════════════════════════════ */
describe("the panel is a fixed column that does not scroll away", () => {
  /* ⚠️ FIXED, NOT PROPORTIONAL. It was 52% / rest, which made the reference column grow with the
     viewport — a record of two stats and four short rows does not become more useful at 620px
     than at 322px, it just becomes emptier, while the form loses width it can use. */
  it("322px, with the flow taking the remainder", () => {
    expect(rule(".qc-ctx")).toContain("flex: 0 0 322px");
    expect(rule(".qc-form")).toContain("flex: 1 1 0");
  });

  /* ⚠️ IT IS ALREADY "STICKY", AND `position: sticky` WOULD BE A DEAD PROPERTY. The spec asks for
     a panel that does not scroll away with the flow, and it does not: `.qc-form` is the scroll
     container and the panel is its SIBLING, so the row itself never scrolls. Browser-measured —
     scrolling the flow 104px moved the panel 0.0px. There is no scrolling ancestor for a sticky
     element to stick within, so the property would resolve to `relative` and read as
     load-bearing when it is not. This asserts the STRUCTURE that delivers the behaviour. */
  it("and the structure is what keeps it in place — not a sticky rule with no scrollport", () => {
    expect(rule(".qc-form"), "the flow is the scroll container").toContain("overflow-y: auto");
    expect(rule(".qc-ctx"), "the panel must not stretch with the row").toContain("align-self: flex-start");
    expect(rule(".qc-ctx")).toContain("max-height: 100%");
    expect(rule(".qc-two"), "if the ROW ever scrolls, this reasoning stops holding")
      .toContain("min-height: 0");
    expect(rule(".qc-ctx"), "a sticky rule here would have nothing to stick within")
      .not.toContain("position: sticky");
    expect(css).toContain("THE PANEL IS ALREADY \"STICKY\"");
  });
});

/* ══ THE POINT OF THE HEIGHT REDESIGN ══════════════════════════════════════════════════════ */
describe("the panel ends where its content ends", () => {
  it("height auto, capped at the column — never stretched to fill it", () => {
    const r = rule(".qc-ctx");
    expect(r).toContain("height: auto");
    expect(r).toContain("max-height: 100%");
    expect(r).toContain("min-height: 200px");
    /* Without this the row's default `align-items: stretch` overrides the auto height and the
       panel fills the column again — the exact bug the redesign fixes. */
    expect(r, "stretch would beat the auto height").toContain("align-self: flex-start");
  });

  it("only the body scrolls; head, strip and footer stay put", () => {
    expect(rule(".qc-ctxbody")).toContain("overflow-y: auto");
    expect(rule(".qc-ctxbody")).toContain("min-height: 0");
    for (const fixed of [".qc-glance", ".qc-ctxstats", ".qc-ctxfoot"]) {
      expect(rule(fixed), `${fixed} must not flex`).toContain("flex: none");
    }
  });

  it("the wish list is clamped to four lines, with a real toggle", () => {
    expect(rule(".qc-ctxclamp")).toContain("-webkit-line-clamp: 4");
    expect(panel).toContain('className={showAll ? undefined : "qc-ctxclamp"}');
    expect(panel).toContain("aria-expanded={showAll}");
  });
});

/* ⚠️ THE GLYPHS ARE KEYED, NOT POSITIONAL. Either cell omits itself when the agent has not
   stated that fact, so "the first one is the clock" holds only until an agent with no reply time
   arrives — and then the envelope would sit under "Expected response time". */
describe("the stat cells carry a glyph apiece", () => {
  it("a pink-tinted rounded square, keyed to the cell", () => {
    expect(panel).toContain("const STAT_GLYPH: Record<string, React.ReactNode>");
    expect(panel).toContain("{STAT_GLYPH[c.key] && <span className=\"qc-ctxsi\"");
    expect(panel, "a positional lookup would mislabel a one-cell strip").not.toContain("STAT_GLYPH[0]");
    const si = rule(".qc-ctxsi");
    expect(si).toContain("var(--pink-t)");
    expect(si).toContain("var(--pink-i)");
    expect(si).toContain("border-radius: 7px");
  });

  it("and the long captions still wrap rather than truncate", () => {
    expect(statCells(bare({ submissionMethod: SubmissionMethod.EMAIL })).map((c) => c.caption))
      .toContain("Preferred submission method");
    expect(rule(".qc-ctxk"), "an ellipsis here would abbreviate a reference panel")
      .not.toContain("text-overflow");
  });
});

describe("the stat strip carries statistics only", () => {
  it("two cells, with the long honest captions", () => {
    const cells = statCells(rich());
    expect(cells.map((c) => c.key)).toEqual(["reply", "submit"]);
    expect(cells.map((c) => c.caption)).toEqual(["Expected response time", "Preferred submission method"]);
  });

  /* ⚠️ THE POLICY IS A SENTENCE, NOT A STATISTIC — and it WAS a third cell: "Yes" under "No
     reply = pass", which states the shape of a fact without stating the fact. */
  it("the no-reply policy is prose beneath the strip, never a cell", () => {
    expect(statCells(rich()).some((c) => (c.key as string) === "noreply")).toBe(false);
    expect(noReplyPolicy(bare({ noResponseMeansNo: true, responseTimeWeeks: 8 })))
      .toBe("No reply after 8 weeks means a pass.");
    expect(noReplyPolicy(bare({ noResponseMeansNo: true }))).toBe("No reply means a pass.");
    expect(panel).toContain('className="qc-ctxpolicy"');
  });

  it("absent is not stated — a different thing from 'they always reply'", () => {
    expect(noReplyPolicy(bare({ noResponseMeansNo: false }))).toBeNull();
    expect(noReplyPolicy(bare({ noResponseMeansNo: undefined }))).toBeNull();
  });

  it("cells are equal width and their captions wrap rather than truncate", () => {
    expect(rule(".qc-ctxstat")).toContain("flex: 1 1 0");
    expect(rule(".qc-ctxk"), "a wrapped caption needs its line-height").toContain("line-height");
    expect(rule(".qc-ctxk"), "truncation would abbreviate the caption").not.toContain("text-overflow");
  });

  it("it thins, then disappears", () => {
    expect(statCells(bare()).map((c) => c.key)).toEqual(["submit"]);
    expect(statCells(bare({ submissionMethod: undefined as never }))).toHaveLength(0);
    expect(panel).toContain("cells.length > 0 &&");
  });
});

/* ══ THE THREE DATA STATES ═════════════════════════════════════════════════════════════════ */
describe("the three data states", () => {
  it("rich: everything recorded", () => {
    expect(panelState(rich(), [q("q1", QueryStatus.QUERIED, "2026-08-01")])).toBe("rich");
  });

  it("partial: some sections survive, and it says so once at the foot", () => {
    expect(panelState(bare({ genres: ["Literary"], responseTimeWeeks: 8 }), [])).toBe("partial");
    expect(panel).toContain("PARTIAL_TAIL");
    expect(PARTIAL_TAIL).toBe("Nothing else recorded for this agent yet.");
  });

  /* ⚠️ COUNT WHAT WAS RECORDED, NOT WHAT RENDERS. submissionStatus and submissionMethod are
     required fields with defaults, so every agent already yields a pill and a Submit-by cell.
     Judging by "does anything render" would call every record rich. */
  it("name-only: a name and nothing else", () => {
    expect(panelState(bare(), [])).toBe("name-only");
    expect(panel).toContain("NAME_ONLY_NOTE");
    expect(NAME_ONLY_NOTE, "it must offer the next step, not report a lack").toContain("You can still log the query");
  });

  it("and the name-only state gets art, not an empty table", () => {
    expect(panel).toContain('<ArtSlot name="agent-unknown"');
    expect(read("../components/todo/ArtSlot.tsx")).toContain('"agent-unknown"');
    expect(read("../components/todo/artSlots.test.tsx"), "the census must count it").toContain('"agent-unknown"');
  });
});

describe("a missing thing omits itself, entirely", () => {
  it("each section renders only once its data does", () => {
    expect(seekingChips(bare())).toHaveLength(0);
    expect(seekingChips(bare({ genres: ["  ", ""] })), "whitespace is not data").toHaveLength(0);
    expect(agentAsks(bare())).toHaveLength(0);
    for (const guard of ["chips.length > 0 &&", "asks.length > 0 &&", "mswl && ("]) {
      expect(panel, `a section renders unguarded: ${guard}`).toContain(guard);
    }
  });

  it("no dash, no placeholder, anywhere", () => {
    expect(panel).not.toMatch(/["']—["']/);
    expect(panel).not.toMatch(/["']N\/A["']/);
  });

  it("history counts open and closed and points at the most recent", () => {
    const h = agentHistory("a1", [
      q("q1", QueryStatus.REJECTED, "2026-01-04"),
      q("q2", QueryStatus.QUERIED, "2026-08-01"),
    ], Date.parse("2026-08-09"))!;
    expect(h).toMatchObject({ open: 1, closed: 1, latestId: "q2" });
    expect(historyLine(h)).toBe("1 open · 1 closed · last sent 1 Aug");
  });

  /* The zero case is worth STATING — "this is your first" is information, not an empty row. */
  it("and says so when there are none", () => {
    expect(agentHistory("a1", [])).toBeNull();
    expect(historyLine(null)).toBe("No queries yet · this is your first");
  });

  it("what they ask for carries its quantity, from the checklist's own derivation", () => {
    expect(agentAsks(bare({ materialsWanted: ["Query Letter", "First 5 Chapters"] })))
      .toEqual([{ name: "Query letter", qty: null }, { name: "Opening sample", qty: "5 chapters" }]);
    expect(read("./agentContext.ts")).toContain("materialRowsFromAgent");
  });
});

/* ⚠️ THE ONE THING THREE SPECS HAVE NOW ASKED FOR THAT CANNOT BE BUILT. */
describe("the word-count line is omitted because the field does not exist", () => {
  it("the reason and the remedy are both recorded", () => {
    expect(WORD_COUNT_BLOCKED).toContain("do not exist");
    expect(read("./agentContext.ts"), "the next reader needs to know what would unblock it")
      .toContain("WHAT IT NEEDS");
  });

  it("the Agent model really has no range to read", () => {
    const types = read("../types.ts");
    const at = types.indexOf("export interface Agent {");
    expect(types.slice(at, types.indexOf("\n}", at))).not.toMatch(/wordCount/i);
  });
});

describe("the freshness stamp", () => {
  it("appears whenever MSWL or genres are shown", () => {
    expect(freshnessStamp(bare({ mswlNotes: "Send me ghosts" }), Date.parse("2026-08-09"))).toBe("Updated 1 Aug");
    expect(freshnessStamp(bare({ genres: ["Literary"] }), Date.parse("2026-08-09"))).toBe("Updated 1 Aug");
  });

  it("and not when neither is", () => {
    expect(freshnessStamp(bare())).toBeNull();
  });

  it("an unchecked record says so rather than showing an empty stamp", () => {
    expect(freshnessStamp(bare({ genres: ["Literary"], lastCheckedDate: "" }))).toBe("Never checked");
  });
});

describe("it reports; the writer judges", () => {
  it("no score, no rating, no match language anywhere", () => {
    // Comments stripped: both files EXPLAIN that they carry none, and an assertion about the
    // code must not be able to match prose about the code.
    const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    const src = strip(read("./agentContext.ts")) + strip(panel);
    for (const banned of ["fitScore", "matchScore", "starRating", "good fit", "great match", "recommend"]) {
      expect(src, `${banned} turns a report into an opinion`).not.toContain(banned);
    }
  });
});

/* ══ THE ACTIVE-STEP CUE (cue D, qc-focus.html) ════════════════════════════════════════════ */
describe("the pulse is an invitation, not a status", () => {
  it("a burgundy halo on the active step, CSS keyframes only", () => {
    expect(css).toContain("@keyframes qc-pulse");
    expect(rule(".qc-sec.qc-active.qc-pulse")).toContain("animation: qc-pulse 2.1s ease-in-out infinite");
    expect(css, "the ref's own bloom").toContain("rgba(180, 90, 64, 0.26)");
  });

  /* ⚠️ IT STOPS ON ENGAGEMENT and does not return for that step. A halo still breathing while
     you type reads as an unresolved alert about the thing you are already doing. CSS cannot know
     about engagement, so the class is REMOVED rather than overridden. */
  it("it stops the moment the writer engages with that step", () => {
    expect(pane).toContain('states.when === "active" && !engaged ? " qc-pulse" : ""');
    expect(pane).toContain("onFocusCapture={() => setEngaged(true)}");
    expect(pane).toContain("onInput={() => setEngaged(true)}");
  });

  it("and begins again only when a new step becomes active", () => {
    expect(pane, "engagement must reset with the step, not persist across the stack")
      .toMatch(/useEffect\(\(\) => \{\s*setEngaged\(false\);/);
  });

  it("reduced motion drops it entirely, leaving the lifted border", () => {
    const at = css.indexOf("@media (prefers-reduced-motion: reduce) { .qc-sec.qc-active.qc-pulse");
    expect(at, "the pulse's reduced-motion rule is missing").toBeGreaterThan(-1);
    expect(css.slice(at, css.indexOf("}", at) + 1)).toContain("animation: none");
    expect(rule(".qc-sec.qc-active"), "the border must survive as the fallback treatment")
      .toContain("border-color");
  });

  /* ⚠️ THE REAL "YOU ARE HERE" IS DOM FOCUS — a focus ring and caret beat any animation, and
     without focus inside the section Enter has nothing to accept from. The pulse is decoration;
     this is the mechanism, which is why reduced motion loses nothing that matters. */
  it("the first control of a newly active step takes real focus", () => {
    expect(pane).toContain('[data-step="${active}"] .qc-body');
    expect(pane).toContain("first?.focus()");
    expect(pane, "focus must never land on something inert").toContain(':not([disabled])');
    expect(pane).toContain('[tabindex]:not([tabindex="-1"])');
  });
});

describe("placement and reach", () => {
  it("the panel is not rendered below 1100px", () => {
    /* ⚠️ Anchor on THIS block: there are two max-width:1100px blocks in the sheet — the header's
       came first — and slicing from the first match over-ran into this one. */
    const at = css.indexOf("@media (max-width: 1100px) {\n  .qc-two");
    expect(at, "the panel's own breakpoint block is missing").toBeGreaterThan(-1);
    const block = css.slice(at, css.indexOf("\n}", at) + 2);
    expect(block).toContain(".qc-two > .qc-ctx { display: none; }");
    expect(block, "the form must take the freed width").toContain(".qc-form { flex: 1 1 0;");
  });

  /* The panel is reference: Tab must walk the form stack and reach Save. Its three real controls
     — the wish-list disclosure, the history link and the agency link — do deserve a stop; an
     INPUT never appears. */
  it("no inputs — the panel is not a second form", () => {
    const bareSrc = panel.replace(/\{?\/\*[\s\S]*?\*\/\}?/g, "");
    expect(bareSrc).not.toContain("<input");
    expect(bareSrc).not.toContain("<textarea");
    expect(bareSrc).not.toContain("<select");
    expect(bareSrc, "the panel must not take a tab stop it did not earn").not.toContain("tabIndex");
  });
});
