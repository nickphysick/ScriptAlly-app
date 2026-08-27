import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const here = new URL(".", import.meta.url).pathname;
const css = readFileSync(join(here, "todoCalendar.css"), "utf8");
/** ⚠️ COMMENTS STRIPPED FIRST. Every retirement in this repo is documented by quoting what it
 *  retired, so a sweep for hexes over raw source finds the prose explaining the hexes it removed. */
const decls = css.replace(/\/\*[\s\S]*?\*\//g, "");

const STATES = ["theirs", "theirsq", "nudged", "y1", "y2", "y3", "quiet", "offer", "closed", "task"];

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
    for (const name of ["tlUrge", "tlUrgeFlat"]) {
      const kf = decls.match(new RegExp(`@keyframes ${name}\\s*\\{([\\s\\S]*?)\\n\\}`))![1];
      expect(kf, `${name} does not rest at --bar-y3-fill (${rest})`).toContain(rest);
      expect(kf, `${name} does not deepen to --bar-urgent-fill (${deep})`).toContain(deep);
      expect(kf, `${name} reads a var(), which fails silently inside keyframes`).not.toContain("var(");
    }
    /* the flat variant exists for the clamped case and animates the background alone */
    const flat = decls.match(/@keyframes tlUrgeFlat\s*\{([\s\S]*?)\n\}/)![1];
    expect(flat, "the flat variant animates a border it was written to leave alone").not.toContain("border-color");
    expect(decls, "the flat variant has no consumer").toMatch(/\.tl-seg\.s-y3\.(openleft|future)[^{]*\{[^}]*tlUrgeFlat/);
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

  it("⚠️ borders match fill, and closed is the only exception", () => {
    for (const s of STATES) {
      if (s === "closed" || s === "quiet" || s === "task") continue;
      const rule = decls.match(new RegExp(`\\n\\.tl-seg\\.s-${s}\\s*\\{([^}]*)\\}`));
      expect(rule, `.tl-seg.s-${s} has no rule`).not.toBeNull();
      const body = rule![1];
      expect(body, `s-${s} does not paint from its fill token`).toContain(`background: var(--bar-${s}-fill)`);
      /* the claim, stated as the two reading the SAME token rather than as two equal literals */
      expect(body, `s-${s}: the border does not read the fill token`)
        .toContain(`border-color: var(--bar-${s}-fill)`);
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
