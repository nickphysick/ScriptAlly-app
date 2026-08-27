import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const here = new URL(".", import.meta.url).pathname;
const css = readFileSync(join(here, "todoCalendar.css"), "utf8");
/** ⚠️ COMMENTS STRIPPED FIRST. Every retirement in this repo is documented by quoting what it
 *  retired, so a sweep for hexes over raw source finds the prose explaining the hexes it removed. */
const decls = css.replace(/\/\*[\s\S]*?\*\//g, "");

const STATES = ["theirs", "theirsq", "nudged", "y1", "y2", "y3", "quiet", "offer", "closed", "task"];

describe("⚠️ the tiers answer geometry, never whether a bar speaks (density pack, Phase 1)", () => {
  it("no tier hides or shrinks a label, an end label or a note", () => {
    /* ⚠️ SELECTORS SPAN LINES, so this reads whole rules rather than lines. The rule this pack
       deleted was found only on a second attempt because the first sweep could not cross a
       newline — it did not error, it under-reported, which is the answer that would have made
       the whole pack look unnecessary. */
    const rules = [...decls.matchAll(/([^{}]*)\{([^}]*)\}/g)]
      .map((m) => [m[1].replace(/\s+/g, " ").trim(), m[2]] as const)
      .filter(([sel]) => /dense[1-4]/.test(sel));
    expect(rules.length, "no tier rules at all — the extraction is broken, not the sheet").toBeGreaterThan(0);
    for (const [sel, body] of rules) {
      for (const target of ["tl-lbl", "tl-cnt", "tl-tail"]) {
        if (!sel.includes(target)) continue;
        expect(body, `a tier suppresses ${target}: ${sel}`).not.toMatch(/display:\s*none|font-size:\s*0/);
      }
    }
  });

  it("⚠️ the tiers that remain are geometry, and each is named", () => {
    const sels = [...decls.matchAll(/([^{}]*)\{[^}]*\}/g)]
      .map((m) => m[1].replace(/\s+/g, " ").trim())
      .filter((sel) => /dense[1-4]/.test(sel));
    /* marker size, and the halo that gives a shrunken marker an edge against its own bar */
    expect(sels.every((s) => s.includes(".tl-node")),
      `a tier reaches something that is not a marker: ${sels.join(" | ")}`).toBe(true);
  });

  it("⚠️ bar height comes from `--bar-h` and nothing else", () => {
    const rules = [...decls.matchAll(/([^{}]*)\{([^}]*)\}/g)]
      .map((m) => [m[1].replace(/\s+/g, " ").trim(), m[2]] as const);
    const sets = rules.filter(([, b]) => /--bar-h\s*:/.test(b)).map(([s]) => s);
    expect(sets, "more than one rule declares the bar height").toEqual([".tl-row"]);
    /* and nothing gives a segment a height of its own */
    for (const [sel, body] of rules) {
      if (!sel.includes(".tl-seg") || sel.includes(".d")) continue;
      const h = body.match(/(?:^|;|\s)height\s*:\s*([^;]+)/);
      if (h) expect(h[1].trim(), `${sel} sets its own height`).toBe("var(--bar-h)");
    }
  });
});

describe("⚠️ urgency is breath, and reduced motion carries the same fact (Phase 3)", () => {
  it("the pulse is on long-standing, and no longer on the waiting bar", () => {
    expect(decls, "long-standing does not breathe").toMatch(/\.tl-seg\.s-y3\s*\{[^}]*animation:\s*tlUrge\s/);
    /* ⚠️ THE OLD BREATH IS GONE, ASSERTED. It was on `.tl-seg.theirs` — waiting on the AGENT — and
       a pack that only adds the new one leaves two bars pulsing for opposite reasons. */
    expect(decls, "the waiting bar still breathes").not.toMatch(/tlBreathe/);
  });

  it("⚠️ the keyframes carry LITERALS, and they are the state's own two stops", () => {
    /* A `var()` inside `@keyframes` fails silently in this setup — no error, no animation, no
       warning — so the values must be written out, and the risk is that written-out values drift
       from the tokens they duplicate. This asserts the four against the two. */
    const board = decls.slice(decls.indexOf("\n.tl-board {"));
    const tok = (n: string) => board.match(new RegExp(`--bar-${n}:\\s*([^;]+);`))![1].trim();
    const rest = tok("y3-fill"), deep = tok("urgent-fill");
    for (const name of ["tlUrge"]) {
      const kf = decls.match(new RegExp(`@keyframes ${name}\\s*\\{([\\s\\S]*?)\\n\\}`))![1];
      expect(kf, `${name} does not rest at --bar-y3-fill (${rest})`).toContain(rest);
      expect(kf, `${name} does not deepen to --bar-urgent-fill (${deep})`).toContain(deep);
      expect(kf, `${name} reads a var(), which fails silently inside keyframes`).not.toContain("var(");
    }
    /**
     * ⚠️ THE BACKGROUND ALONE, AND NO BORDER. Borders are transparent, so the fill breathes THROUGH
     * them; a keyframe that also set `border-color` would do nothing but outrank the clamps, whose
     * `currentColor` edge says "this began before the board" / "this runs past it". That version
     * was written first and the acceptance sweep caught it — a clamped bar whose border held still
     * while its background moved, which is "borders match fill" failing for 1.3 seconds at a time.
     */
    const kf = decls.match(/@keyframes tlUrge\s*\{([\s\S]*?)\n\}/)![1];
    expect(kf, "the pulse animates a border, which outranks the clamps").not.toContain("border-color");
    expect(decls, "nothing consumes the pulse").toMatch(/\.tl-seg\.s-y3\s*\{[^}]*animation:\s*tlUrge\s/);
  });

  it("⚠️ reduced motion stops the pulse AND states the fact another way", () => {
    const m = decls.match(/@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/g) ?? [];
    const block = m.find((b) => b.includes("s-y3"));
    expect(block, "long-standing has no reduced-motion rule at all").toBeTruthy();
    expect(block!, "the pulse does not stop").toContain("animation: none");
    /* ⚠️ THE HALF THAT MATTERS. Stopping is easy; carrying the information without motion is the
       claim, and a check that only asserts `animation: none` passes on the old broken rule. */
    expect(block!, "reduced motion says nothing — motion was the only signal")
      .toContain("background: var(--bar-urgent-fill)");
    /* ⚠️ AND IT SETS NO BORDER, for the same reason the keyframes set none: transparent shows the
       fill, so the border deepens with it and a second declaration would only outrank the clamps. */
    expect(block!, "reduced motion recolours a border the clamps own").not.toContain("border-color:");
  });
});

describe("⚠️ bar colour is a token, never a literal (settled pack, Phase 2)", () => {
  it("no rule that paints a bar carries a hex or an rgb", () => {
    const bad: string[] = [];
    for (const m of decls.matchAll(/(?:^|\n)([^\n{}]*\.tl-seg[^\n{}]*)\{([^}]*)\}/g)) {
      const sel = m[1].trim();
      for (const [, prop, val] of m[2].matchAll(/(background[a-z-]*|border[a-z-]*|color)\s*:\s*([^;]+)/g)) {
        if (/#[0-9a-fA-F]{3,8}|rgba?\(/.test(val)) bad.push(`${sel} → ${prop}: ${val.trim()}`);
      }
    }
    /* ⚠️ THE POPULATION FIRST. An extraction that matched nothing would report a clean sheet. */
    const rules = [...decls.matchAll(/(?:^|\n)[^\n{}]*\.tl-seg[^\n{}]*\{/g)].length;
    expect(rules, "no .tl-seg rules found — the extraction is broken, not the sheet").toBeGreaterThan(10);
    expect(bad, `${bad.length} literal bar colours survive`).toEqual([]);
  });

  it("every state declares its triple, and the board owns them", () => {
    /* ⚠️ ANCHORED ON THE BOARD'S OWN RULE, not on the file. A token declared anywhere resolves
       nowhere in particular; these have to be on `.tl-board`, which is the ancestor of every
       element that reads them and nothing else. */
    const board = decls.slice(decls.indexOf("\n.tl-board {"));
    const block = board.slice(0, board.indexOf("\n}"));
    for (const s of STATES) {
      /* closed has no fill by design — a transparent bar is what it IS */
      for (const k of s === "closed" ? ["line", "text"] : ["fill", "line", "text"]) {
        expect(block, `--bar-${s}-${k} is not declared on the board`).toContain(`--bar-${s}-${k}:`);
      }
    }
    expect(block, "the quiet hatch has no token").toContain("--bar-quiet-hatch:");
    expect(block, "the pulse's deeper end has no token").toContain("--bar-urgent-fill:");
    expect(block, "the board has no ground token").toContain("--board-ground:");
  });

  it("⚠️ borders match fill via `transparent`, and closed is the only exception", () => {
    for (const s of STATES) {
      if (s === "closed" || s === "quiet" || s === "task") continue;
      const rule = decls.match(new RegExp(`\\n\\.tl-seg\\.s-${s}\\s*\\{([^}]*)\\}`));
      expect(rule, `.tl-seg.s-${s} has no rule`).not.toBeNull();
      const body = rule![1];
      expect(body, `s-${s} does not paint from its fill token`).toContain(`background: var(--bar-${s}-fill)`);
      /**
       * ⚠️ `transparent`, NOT A SECOND COPY OF THE FILL TOKEN. A background paints UNDER its
       * border, so a transparent border shows the bar's own fill and the two cannot be told apart.
       * The version that read `border-color: var(--bar-X-fill)` looked identical at rest and
       * diverged the moment the pulse deepened the background, because the border was a frozen
       * copy of a value that was changing — caught by the acceptance sweep, not by reading.
       */
      expect(body, `s-${s}: the border is a frozen copy of the fill rather than transparent`)
        .toContain("border-color: transparent");
    }
    const closed = decls.match(/\n\.tl-seg\.s-closed\s*\{([^}]*)\}/)![1];
    expect(closed, "closed grew a fill").toContain("background: transparent");
    expect(closed, "closed lost its dash — a transparent bar with a matching border is invisible")
      .toContain("border-style: dashed");
  });

  it("⚠️ the five your-move states share one text rule, not five that agree", () => {
    /* ⚠️ ONE SELECTOR LIST, ASSERTED AS ONE. Five separate rules carrying equal values would pass
       a value comparison and drift the day one is retuned; sharing a rule is what makes them
       identical by construction rather than by coincidence. */
    const m = decls.match(/\n((?:\.tl-seg\.s-\w+ \.tl-lbl,?\s*)+)\{([^}]*)\}/);
    expect(m, "no shared your-move label rule").not.toBeNull();
    const sels = m![1];
    for (const s of ["y1", "y2", "y3", "quiet", "offer"]) {
      expect(sels, `s-${s} is not in the shared wording rule`).toContain(`.tl-seg.s-${s} .tl-lbl`);
    }
    expect(sels, "an agent-side state was given the writer's wording").not.toContain("s-theirs");
    expect(sels, "a closed state was given the writer's wording").not.toContain("s-closed");
    for (const d of ["font-size: 10px", "font-weight: 500", "letter-spacing: 0", "text-transform: none"]) {
      expect(m![2], `the shared wording is missing ${d}`).toContain(d);
    }
  });
});
