/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks for the plate's inline editors — the pure helpers, and the two render modes.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ManuscriptPlate, ManuscriptPlateProps, ManuscriptPlateEdit } from "./ManuscriptPlate";
import {
  parseWordCount,
  stepWordCount,
  genreList,
  splitGenres,
  WORD_STEP,
  WORD_COUNT_HINT,
  WORD_COUNT_REJECTED,
  WORD_COUNT_HINT_LINE,
  REJECTED_KEYS,
  isRejectedKey,
  MAX_MANUSCRIPT_GENRES,
  themeClassOf,
  THEME_CLASSES,
} from "./plateEdit";
import { readFileSync as read } from "node:fs";
import { commonGenresFor, COMMON_GENRES_BY_AGE, canonicalGenreById } from "../../lib/genres";

const noop = () => {};
const BASE: ManuscriptPlateProps = {
  title: "Murphy's Day Out",
  status: "Querying",
  genres: ["Young Adult", "Thriller"],
  wordCount: 50000,
  logline: "Murphy catches a fly",
  stats: { queriesSent: 4, responses: 1, lastActivity: "8 Aug" },
};

const EDIT: ManuscriptPlateEdit = {
  onTitle: noop,
  onWordCount: noop,
  onLogline: noop,
  genre: {
    ageCategory: "Young Adult",
    ids: ["thriller"],
    personal: [],
    onCreatePersonal: async () => ({ ok: false, reason: "x" }),
    onSave: noop,
  },
};

const plate = (over: Partial<ManuscriptPlateProps> = {}) =>
  renderToStaticMarkup(React.createElement(ManuscriptPlate, { ...BASE, ...over }));

describe("a word count is a number the writer types, and nothing suggests one", () => {
  /**
   * ⚠️ THE RANGE GUIDANCE IS RETIRED — no typical range, no placeholder range, no target, anywhere
   * this pass reaches. The creation form and onboarding still carry `genreWordCountRange`; those are
   * outside this file set and the retirement there is REPORTED, not silently done.
   */
  it("offers no range, and its own hint constant is null so nothing can render one", () => {
    expect(WORD_COUNT_HINT).toBeNull();
    const html = plate({ edit: EDIT });
    expect(html).not.toMatch(/\b(typical|usually|aim|target|recommended|should be)\b/i);
    expect(html).not.toMatch(/\d{2},\d{3}\s*[–-]\s*\d{2,3},\d{3}/);
  });

  it("parses a plain number", () => {
    expect(parseWordCount("50000")).toBe(50000);
    expect(parseWordCount("0")).toBe(0);
  });

  /* The field PRINTS "50,000", so a writer retyping what they see must not be rejected by it. */
  it("accepts the separators the plate itself renders", () => {
    expect(parseWordCount("50,000")).toBe(50000);
    expect(parseWordCount(" 84 000 ")).toBe(84000);
  });

  it("rejects anything that is not a number, and says so in one line", () => {
    for (const bad of ["abc", "50k", "12.5", "-400", ""]) expect(parseWordCount(bad)).toBeNull();
    expect(WORD_COUNT_REJECTED).toBe("Numbers only.");
    /* States what is wrong; asks for nothing and blames nobody. */
    expect(WORD_COUNT_REJECTED).not.toMatch(/\b(you|your|please|try|must|should)\b/i);
  });

  /**
   * ⚠️ REJECTED AT THE KEYSTROKE, NOT AT SAVE. Every one of these is valid to a numeric input and
   * none is valid as a word count — and the browser then reports the value as `""` rather than as
   * the text that was typed, so a save-time check cannot even say what went wrong.
   */
  it("refuses the keys a numeric field would otherwise accept", () => {
    expect(REJECTED_KEYS).toEqual(["e", "E", "+", "-", "."]);
    for (const k of REJECTED_KEYS) expect(isRejectedKey(k)).toBe(true);
    /* …and refuses nothing else: digits, editing keys and the steppers all pass. */
    for (const k of ["0", "9", "Backspace", "ArrowUp", "ArrowDown", "Enter", "Escape", "Tab"]) {
      expect(isRejectedKey(k), `${k} must not be rejected`).toBe(false);
    }
  });

  /* ⚠️ THE HINT SAYS WHAT THE KEYS DO. It is not a range and not a target — those are retired. */
  it("hints at the keys, and reads its step from the one constant", () => {
    expect(WORD_COUNT_HINT_LINE).toBe(`↑ ↓ steps ${WORD_STEP}`);
    expect(WORD_COUNT_HINT_LINE).not.toMatch(/\b(typical|aim|target|recommended|between)\b/i);
  });

  /* An empty field is not zero — a writer clearing it has not said the manuscript is empty. */
  it("treats an empty field as no answer rather than as zero", () => {
    expect(parseWordCount("")).toBeNull();
    expect(parseWordCount("   ")).toBeNull();
  });

  it("steps from the current value, and floors at zero", () => {
    expect(stepWordCount(50000, WORD_STEP)).toBe(50500);
    expect(stepWordCount(50000, -WORD_STEP)).toBe(49500);
    expect(stepWordCount(200, -WORD_STEP)).toBe(0);
  });
});

describe("the genre list joins `genre` and `subGenres`, in one place", () => {
  it("puts the primary first", () => {
    expect(genreList("thriller", ["crime"])).toEqual(["thriller", "crime"]);
    expect(genreList("thriller")).toEqual(["thriller"]);
    expect(genreList("", [])).toEqual([]);
  });

  it("splits back, primary first", () => {
    expect(splitGenres(["thriller", "crime"])).toEqual({ genre: "thriller", subGenres: ["crime"] });
    expect(splitGenres([])).toEqual({ genre: "", subGenres: [] });
  });

  it("round-trips", () => {
    const { genre, subGenres } = splitGenres(["a", "b", "c"]);
    expect(genreList(genre, subGenres)).toEqual(["a", "b", "c"]);
  });

  it("caps at three", () => {
    expect(MAX_MANUSCRIPT_GENRES).toBe(3);
  });
});

describe("the age-category shortcuts are a shortcut, not a constraint", () => {
  it("names real canonical genres for every category", () => {
    for (const [age, ids] of Object.entries(COMMON_GENRES_BY_AGE)) {
      expect(ids.length, `${age} has no shortcuts`).toBeGreaterThan(0);
      for (const id of ids) {
        expect(canonicalGenreById(id), `${age} names "${id}", which is not a canonical genre`).toBeDefined();
      }
    }
  });

  /* An unknown category offers nothing rather than the wrong thing. */
  it("yields nothing for a category it does not know", () => {
    expect(commonGenresFor("Graphic Novel")).toEqual([]);
    expect(commonGenresFor(undefined)).toEqual([]);
  });

  /**
   * ⚠️ IT MUST NEVER BECOME A FILTER. Every canonical genre stays reachable by typing for every
   * category — a Middle Grade horror is a real book. Asserted by pointing at a genre that appears in
   * no shortcut list at all and confirming it is still canonical.
   */
  it("leaves every genre reachable — the lists are not the taxonomy", () => {
    const shortlisted = new Set(Object.values(COMMON_GENRES_BY_AGE).flat());
    expect(shortlisted.has("horror")).toBe(false);
    expect(canonicalGenreById("horror")).toBeDefined();
  });
});

describe("editing is opt-in — the plate is read-only without it", () => {
  it("renders no editor affordances when `edit` is absent", () => {
    const html = plate();
    expect(html).not.toContain("editable");
    expect(html).not.toContain("msv-titleinput");
    expect(html).toContain("Murphy&#x27;s Day Out");
  });

  it("and marks title, genre, word count and logline editable when it is present", () => {
    const html = plate({ edit: EDIT });
    expect(html).toContain("msv-platetitle editable");
    expect(html).toContain("msv-gp editable");
    expect(html).toContain("msv-wc editable");
    expect(html).toContain("msv-platelog editable");
  });

  /* Each editable target is one control with one accessible name. */
  it("names what each control edits", () => {
    const html = plate({ edit: EDIT });
    expect(html).toContain('aria-label="Edit title — Murphy&#x27;s Day Out"');
    expect(html).toContain('aria-label="Edit word count — 50,000 words"');
  });

  /**
   * ⚠️ THE LOGLINE IS NOT EDITED HERE. It is a pitch-shelf asset, so the plate's control jumps to
   * the shelf instead of opening an editor — one home per asset. There is no logline input on this
   * component, in either mode.
   */
  it("gives the logline a jump, never an editor", () => {
    const src = readFileSync(resolve(__dirname, "./ManuscriptPlate.tsx"), "utf8");
    expect(src).not.toMatch(/aria-label="Logline"/);
    expect(src).toContain("edit.onLogline");
    expect(plate({ edit: EDIT })).toContain("msv-platelog editable");
  });

  /* The genre editor renders the age row only when opened, so the resting plate stays a plate. */
  it("keeps the genre editor closed at rest", () => {
    expect(plate({ edit: EDIT })).not.toContain("msv-ageseg");
  });
});


/**
 * The corrected field is ONE box, not three controls in a row. These read the built markup and the
 * stylesheet, because the fault being fixed was structural rather than behavioural.
 */
describe("the word-count field is one box", () => {
  const SRC = read(resolve(__dirname, "./ManuscriptPlate.tsx"), "utf8");
  /**
   * ⚠️ COMMENTS STRIPPED AND `@media` UNWRAPPED BEFORE PARSING. A flat `selector { body }` sweep
   * DESYNCS at the first at-rule: it reads `@media (…)` as a selector and that block's first inner
   * rule as its body, and every rule after it is then off by one. This file has a `max-width` media
   * query above the stepper, and the first version of this lock reported `.msv-stepper` missing from
   * a stylesheet that declares it.
   */
  const CSS = read(resolve(__dirname, "./manuscriptPlate.css"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/@media[^{]*\{/g, "");

  /** Every declaration for a selector, joined — grouping must not defeat the anchor. */
  const rule = (sel: string) => {
    const bodies = [...CSS.matchAll(/([^{}]+)\{([^}]*)\}/g)]
      .filter(([, s]) => s.split(",").some((x) => x.trim() === sel))
      .map(([, , b]) => b);
    expect(bodies.length, `${sel} must appear in at least one rule`).toBeGreaterThan(0);
    return bodies.join("\n");
  };

  it("parses the stylesheet at all — a desynced sweep finds nothing and blames the source", () => {
    expect(rule(".msv-plateband")).toContain("background:");
    expect(rule(".msv-wordpop")).toContain("width: 270px");
  });

  it("wraps the input, its unit and the steppers in one bordered box", () => {
    expect(SRC).toContain('className="msv-stepper"');
    expect(SRC).toContain('className="msv-stepinput"');
    expect(SRC).toContain('className="msv-stepunit"');
    expect(SRC).toContain('className="msv-steps"');
    const box = rule(".msv-stepper");
    expect(box).toContain("border:");
    expect(box).toContain("border-radius");
  });

  /* ⚠️ THE RING IS ON THE BOX, not the bare input — that is what makes the three parts one field. */
  it("puts the focus ring on the box", () => {
    expect(rule(".msv-stepper:focus-within")).toContain("box-shadow");
    expect(rule(".msv-stepinput")).toContain("outline: none");
  });

  /* ⚠️ THE STACKED BUTTONS ARE THE ONLY SPINNER — a native one beside them is a second control. */
  it("suppresses the native spinners, in both engines", () => {
    expect(rule(".msv-stepinput")).toContain("-moz-appearance: textfield");
    expect(CSS).toContain("::-webkit-inner-spin-button");
    expect(CSS).toContain("::-webkit-outer-spin-button");
    expect(CSS).toContain("-webkit-appearance: none");
  });

  it("divides the stepper column from the field, and its two buttons from each other", () => {
    expect(rule(".msv-steps")).toContain("border-left");
    expect(rule(".msv-steps")).toContain("width: 36px");
    expect(rule(".msv-steps button:first-child")).toContain("border-bottom");
  });

  /* ⚠️ THE OLD SHAPE IS GONE, not merely unused — three labels in a row was the fault. */
  it("leaves none of the three-in-a-row markup behind", () => {
    for (const dead of ["msv-wordrow", "msv-wordinput"]) {
      expect(CSS, `${dead} survives in the stylesheet`).not.toContain(dead);
      expect(SRC, `${dead} survives in the markup`).not.toContain(dead);
    }
  });

  /* Cancel restores rather than merely closing, so the next open never shows an abandoned edit. */
  it("restores the stored value on Cancel", () => {
    expect(SRC).toContain("const cancelWords");
    expect(SRC).toContain("onClick={cancelWords}");
  });
});


/**
 * The genre editor is a POPOVER over the plate, not a row inside it. The fault being fixed was
 * structural — an inline bar reflowed the plateband and pushed the logline down, and age category
 * and genre were told apart only by chip colour — so these read structure, not behaviour.
 */
describe("the genre editor floats, and its two columns carry the distinction", () => {
  const SRC = read(resolve(__dirname, "./ManuscriptPlate.tsx"), "utf8");
  const CSS = read(resolve(__dirname, "./manuscriptPlate.css"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/@media[^{]*\{/g, "");
  const rule = (sel: string) => {
    const bodies = [...CSS.matchAll(/([^{}]+)\{([^}]*)\}/g)]
      .filter(([, s]) => s.split(",").some((x) => x.trim() === sel))
      .map(([, , b]) => b);
    expect(bodies.length, `${sel} must appear in at least one rule`).toBeGreaterThan(0);
    return bodies.join("\n");
  };

  /* ⚠️ PORTALLED AND FIXED — an in-flow editor moves the plate every time it opens. */
  it("is portalled and positioned out of flow", () => {
    expect(SRC).toContain('className="msv-genrepop"');
    expect(SRC).toContain("createPortal");
    expect(rule(".msv-genrepop")).toContain("position: fixed");
  });

  /* The inline bar is GONE, not merely unused — it was the fault. */
  it("leaves none of the inline bar behind", () => {
    for (const dead of ["msv-genreedit", "msv-ageseg", "msv-agebtn", "msv-genredone"]) {
      expect(SRC, `${dead} survives in the markup`).not.toContain(dead);
      expect(CSS, `${dead} survives in the stylesheet`).not.toContain(dead);
    }
  });

  /**
   * ⚠️ THE COLUMNS ARE THE DISTINCTION. Age category and genre are told apart by sitting in
   * different columns under their own labels — not by colour, which is what failed.
   */
  it("splits the two into columns with a rule between them", () => {
    expect(rule(".msv-gcols")).toContain("grid-template-columns: 186px 1fr");
    expect(rule(".msv-gcolL")).toContain("border-right");
    expect(SRC).toContain(">Age category<");
    expect(SRC).toMatch(/Genre <span className="msv-glabsub">/);
  });

  it("marks the current category with a bar, weight and a tick", () => {
    expect(rule(".msv-agerow.on")).toContain("font-weight: 600");
    expect(rule(".msv-agerow.on .msv-agebar")).toContain("background");
    expect(rule(".msv-agerow.on .msv-agetick")).toContain("visibility: visible");
    expect(rule(".msv-agetick")).toContain("visibility: hidden");
  });

  /**
   * ⚠️ BUFFERED — Cancel discards, Done commits BOTH fields in one write. Saving on each change
   * would leave Cancel with nothing to cancel back to.
   */
  it("buffers a draft and commits once", () => {
    expect(SRC).toContain("const [genreDraft, setGenreDraft]");
    expect(SRC).toContain("const saveGenre");
    expect(SRC).toContain("edit.genre.onSave(genreDraft)");
    expect(SRC).toMatch(/onClick=\{close\}>Cancel</);
    expect(SRC).toMatch(/onClick=\{saveGenre\}>Done</);
  });

  /**
   * ⚠️ PLACEMENT IS THE SHARED `placeMenu` — the same pure function `PortalMenu` positions with,
   * flip at the viewport edge included. The COMPONENT cannot host this (it renders a `MenuGroup[]`
   * of `role="menuitem"` buttons and has no slot for a token field); its placement is the part that
   * is genuinely shared, and this is that part.
   */
  it("positions with the shared placeMenu rather than a second implementation", () => {
    expect(SRC).toContain('import { placeMenu } from "../../lib/todoMenu"');
    /* ⚠️ WORD-ANCHORED, NOT A SUBSTRING. `toContain("placeMenu(")` is satisfied by `XplaceMenu(` —
       it passed a deliberately-broken source on its first red check, which is the whole reason this
       is a regex with a boundary rather than a substring. */
    expect(SRC).toMatch(/\bplaceMenu\(/);
  });

  /* ⚠️ ONE PICKER, ONE TAXONOMY. A second genre list would fork personal-genre creation. */
  it("uses the shared picker in its embedded shell", () => {
    expect(SRC).toContain("<GenrePicker");
    expect(SRC).toContain("embedded");
    expect(SRC).toContain(`cap={MAX_MANUSCRIPT_GENRES}`);
    /* …and builds no genre list of its own. */
    expect(SRC).not.toContain("CANONICAL_GENRES");
  });

  /* The anchor wraps the pills, and its class must not be a prefix of theirs. */
  it("anchors on the pill group under a name that is not a prefix of the pills'", () => {
    expect(SRC).toContain('className="msv-genreanchor"');
    expect(SRC).not.toContain("msv-gpgroup");
  });
});


/**
 * ⚠️ THE POPOVERS WERE TRANSLUCENT, AND THE CAUSE WAS THE PORTAL'S MISSING THEME CLASS.
 * Every `--msv-*` is declared on a DESCENDANT selector (`.t-capp .msv1` …), so a wrapper rendered
 * into `document.body` matched none of them: measured on the shipped build, `--msv-card` resolved to
 * EMPTY, `background-color` computed `rgba(0, 0, 0, 0)` and `border-width` `0px`. Identical in all
 * three themes — there was no theme for it to be wrong in.
 *
 * The apparent overlap of the hint, the footer and the tab bar was the SAME fault: the rows measured
 * strictly sequential (`overlaps: []`); it was the page printing through an unfilled panel.
 */
describe("the portalled popovers carry their theme, and an opaque surface", () => {
  const SRC = read(resolve(__dirname, "./ManuscriptPlate.tsx"), "utf8");
  const CSS = read(resolve(__dirname, "./manuscriptPlate.css"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/@media[^{]*\{/g, "");
  const rule = (sel: string) => {
    const bodies = [...CSS.matchAll(/([^{}]+)\{([^}]*)\}/g)]
      .filter(([, s]) => s.split(",").some((x) => x.trim() === sel))
      .map(([, , b]) => b);
    expect(bodies.length, `${sel} must appear in at least one rule`).toBeGreaterThan(0);
    return bodies.join("\n");
  };

  /* ⚠️ NO jsdom IN THIS REPO (`environment: 'node'`), so the walk is exercised against stubs of the
     two members it actually uses. Reaching for `document.createElement` here threw on the first run. */
  const node = (classes: string[], parent: unknown = null): any => ({
    classList: { contains: (c: string) => classes.includes(c) },
    parentElement: parent,
  });

  it("finds the theme class by walking up from the element", () => {
    expect(themeClassOf(node([], node([], node(["t-edn"]))))).toBe("t-edn");
    expect(themeClassOf(node(["t-bold"]))).toBe("t-bold");
    /* The NEAREST themed ancestor wins, so a nested theme cannot be overruled from above. */
    expect(themeClassOf(node([], node(["t-capp"], node(["t-edn"]))))).toBe("t-capp");
    /* No themed ancestor → an empty string, never a guessed default that would be wrong in two
       themes out of three. */
    expect(themeClassOf(node([], node([])))).toBe("");
    expect(themeClassOf(null)).toBe("");
    expect([...THEME_CLASSES]).toEqual(["t-capp", "t-bold", "t-edn"]);
  });

  /**
   * ⚠️ THE THEME CLASS MUST BE ON A PARENT OF `.msv1`, NEVER ON THE SAME ELEMENT — and this lock is
   * the one that would have caught the first attempt. `.t-capp .msv1` is a DESCENDANT combinator, so
   * `class="t-capp msv1"` matches nothing at all: measured `--msv-card` EMPTY and
   * `background-color: rgba(0, 0, 0, 0)`. A harness carrying `<body class="t-capp">` supplied the
   * missing ancestor and reported it fixed — against a page the app never serves.
   */
  it("nests the theme class ABOVE the token class, never beside it", () => {
    expect(SRC).toContain("themeClassOf(bandRef.current)");
    /* The exact nesting, twice — one per portal. */
    const nested = SRC.match(/<div className=\{themeClass\}><div className="msv1 msv-portal">/g) ?? [];
    expect(nested.length, "both portals must nest the theme class above .msv1").toBe(2);
    /* ⚠️ AND THE TWO CLASSES NEVER SHARE ONE `className`. Checked per attribute rather than with a
       span-matching regex — the first version used `[^}]*`, which runs straight across the nesting
       and flagged the correct shape as the broken one. Every className this file writes is read out
       and inspected on its own. */
    const attrs = [...SRC.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)].map((m) => m[1] ?? m[2] ?? "");
    expect(attrs.length, "no className attributes found — the sweep is reading nothing").toBeGreaterThan(5);
    for (const a of attrs) {
      const themed = /\bt-(capp|bold|edn)\b/.test(a);
      expect(themed && /\bmsv1\b/.test(a), `"${a}" puts a theme class beside msv1 — the descendant selector cannot match`).toBe(false);
    }
  });

  /**
   * ⚠️ THE FILL CANNOT BE TRANSPARENT EVEN IF THE TOKEN STOPS RESOLVING. `var(--x, <literal>)` uses
   * the literal exactly when `--x` is empty — the state that produced `rgba(0,0,0,0)`. And nothing
   * on these roots may reintroduce see-through by another route.
   */
  it.each([".msv-wordpop", ".msv-genrepop"])("%s can never resolve to transparent", (sel) => {
    const r = rule(sel);
    expect(r).toMatch(/background:\s*var\(--msv-card,\s*#[0-9a-f]{6}\)/i);
    for (const banned of ["opacity", "mix-blend-mode", "backdrop-filter", "filter:"]) {
      expect(r, `${sel} declares ${banned}`).not.toContain(banned);
    }
    /* No alpha anywhere in the fill — rgba/hsla or an 8-digit hex would all reintroduce it. */
    expect(r).not.toMatch(/background[^;]*(rgba|hsla|#[0-9a-f]{8})/i);
  });

  /* ⚠️ THE WRAPPER NEEDS `.msv1` FOR TOKENS AND MUST NOT INHERIT ITS PAGE LAYOUT — measured a
     0px-tall clipped flex container in `document.body`. */
  it("undoes the page-root layout `.msv1` would otherwise impose", () => {
    const r = rule(".msv1.msv-portal");
    expect(r).toContain("height: auto");
    expect(r).toContain("overflow: visible");
    expect(r).toContain("display: block");
  });

  it.each([".msv-wordpop", ".msv-genrepop"])("%s has an opaque fill, a hairline and the shadow", (sel) => {
    const r = rule(sel);
    expect(r).toContain("background: var(--msv-card,");
    /* A literal 1px hairline, not `--msv-cardbd`, which is `none` in Editorial. */
    expect(r).toContain("border: 1px solid var(--msv-hair,");
    expect(r).toContain("border-radius: 14px");
    expect(r).toContain("box-shadow");
  });

  /* ⚠️ EVERY `var()` THESE COMPONENTS READ MUST RESOLVE — the fault was an unresolved token, so the
     sweep that would have caught it belongs here. */
  it("reads no token that is defined nowhere", () => {
    const DEFINED = [
      CSS,
      read(resolve(__dirname, "./manuscripts.css"), "utf8"),
      read(resolve(__dirname, "./manuscriptLibrary.css"), "utf8"),
      read(resolve(__dirname, "../forms/genrePicker.css"), "utf8"),
      read(resolve(__dirname, "../shell/pageHeader.css"), "utf8"),
    ].join("\n");
    const read_ = new Set([...CSS.matchAll(/var\((--[a-z0-9-]+)/gi)].map((m) => m[1]));
    expect(read_.size).toBeGreaterThan(10);
    for (const name of read_) {
      expect(new RegExp(`${name}\\s*:`).test(DEFINED), `${name} is read and defined nowhere`).toBe(true);
    }
  });
});

/**
 * ⚠️ THE GENRE POPOVER LANDED IN THE WINDOW'S TOP-LEFT because its anchor had NO BOX.
 * `display: contents` generates none, so `getBoundingClientRect()` returned zeros and `placeMenu`
 * resolved them to left 8, top 6 — over the nav and the sidebar.
 */
describe("the genre popover is anchored to its trigger", () => {
  const SRC = read(resolve(__dirname, "./ManuscriptPlate.tsx"), "utf8");
  const CSS = read(resolve(__dirname, "./manuscriptPlate.css"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/@media[^{]*\{/g, "");
  const rule = (sel: string) => {
    const bodies = [...CSS.matchAll(/([^{}]+)\{([^}]*)\}/g)]
      .filter(([, s]) => s.split(",").some((x) => x.trim() === sel))
      .map(([, , b]) => b);
    expect(bodies.length, `${sel} must appear in at least one rule`).toBeGreaterThan(0);
    return bodies.join("\n");
  };

  it("gives the anchor a real box — `display: contents` has none to measure", () => {
    const r = rule(".msv-genreanchor");
    expect(r).toContain("display: inline-flex");
    expect(r).not.toContain("display: contents");
  });

  it("places 8px below the trigger, left-aligned, via the shared placeMenu", () => {
    expect(SRC).toMatch(/placeMenu\(r, \{[^}]*\},\s*\{[^}]*\}, 8, "left"\)/s);
  });

  /* A zero rect means the anchor lost its box again — placing against it is how this fault looked. */
  it("refuses to place against a zero rect", () => {
    expect(SRC).toContain("r.width === 0 && r.height === 0");
  });

  /* ⚠️ REPOSITION, NOT CLOSE — the popover holds a buffered draft, and closing on scroll would
     discard an edit nobody asked to abandon. Capture phase: the pane scrolls, not the window. */
  it("repositions on scroll and resize rather than closing", () => {
    expect(SRC).toContain('window.addEventListener("scroll", place, true)');
    expect(SRC).toContain('window.addEventListener("resize", place)');
    expect(SRC).toContain('window.removeEventListener("scroll", place, true)');
  });

  /* The columns pulled apart because the panel inherited width from wherever it landed. */
  it("keeps its own width and its two-column grid wherever it lands", () => {
    const r = rule(".msv-genrepop");
    expect(r).toContain("width: 520px");
    expect(r).toContain("box-sizing: border-box");
    expect(rule(".msv-gcols")).toContain("grid-template-columns: 186px 1fr");
  });
});

/** ⚠️ PLAYFAIR FOR HEADINGS AND FIGURES, MONO FOR LABELS AND HINTS, INTER FOR CONTENT. */
describe("the popovers follow the app's type grammar", () => {
  const CSS = read(resolve(__dirname, "./manuscriptPlate.css"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/@media[^{]*\{/g, "");
  const rule = (sel: string) => {
    const bodies = [...CSS.matchAll(/([^{}]+)\{([^}]*)\}/g)]
      .filter(([, s]) => s.split(",").some((x) => x.trim() === sel))
      .map(([, , b]) => b);
    expect(bodies.length, `${sel} must appear in at least one rule`).toBeGreaterThan(0);
    return bodies.join("\n");
  };

  it.each([".msv-wordlab", ".msv-glab"])("%s is a Playfair heading, not a mono label", (sel) => {
    const r = rule(sel);
    expect(r).toContain("'Playfair Display'");
    expect(r).not.toContain("monospace");
    expect(r).not.toContain("text-transform: uppercase");
    expect(r).not.toContain("letter-spacing");
  });

  it("the word-count figure is Playfair, like the stat strip's numerals", () => {
    const r = rule(".msv-stepinput");
    expect(r).toContain("'Playfair Display'");
    expect(r).toContain("font-size: 22px");
    expect(r).not.toContain("monospace");
  });

  it("and the unit and the hint stay mono, because they are labels", () => {
    expect(rule(".msv-stepunit")).toContain("monospace");
    expect(rule(".msv-wordhint")).toContain("monospace");
  });
});
