/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ THE CLAIMS HERE ARE ABOUT THE COMPOSED CARD, NOT ABOUT ITS PIECES. A card's real faults are
 * compositional — a sentence that lost a space where two runs meet, a cluster that renders four
 * empty slots instead of none, a band whose class disagrees with the facts it was handed. Querying
 * each piece separately cannot see any of them.
 *
 * This repo renders to a STRING (`environment: "node"`, no jsdom, no testing-library), so the
 * assertions read markup. Where a claim is geometric it does not belong here — it belongs in a
 * measurement over the rendered page.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { QueryCard } from "./QueryCard";
import { QueryStatus } from "../../types";
import type { Query } from "../../types";
import { cardFacts, sentenceText } from "../../lib/queryCardFacts";

const HERE = join(process.cwd(), "src/components/queries");
const tsx = readFileSync(join(HERE, "QueryCard.tsx"), "utf8");
const css = readFileSync(join(HERE, "queryCard.css"), "utf8");
/** ⚠️ COMMENT-STRIPPED. Both files DISCUSS the things they must not contain — "no burgundy", the
 *  retired `.qc-card` — so a raw scan fails on the prose explaining the rule. */
const decls = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const TODAY = new Date("2026-09-04T12:00:00Z");
const ago = (d: number) => new Date(TODAY.getTime() - d * 86_400_000).toISOString();
const q = (over: Partial<Query>): Query =>
  ({ id: "q1", userId: "u", manuscriptId: "m", agentId: "a", status: QueryStatus.QUERIED, dateSent: ago(20), ...over }) as Query;

const render = (over: Partial<Query>, props: Partial<React.ComponentProps<typeof QueryCard>> = {}) => {
  const query = q(over);
  const facts = cardFacts(query, TODAY, { agencyWeeks: 8 });
  return {
    facts,
    html: renderToStaticMarkup(
      <QueryCard
        id={query.id}
        status={query.status}
        name="Harriet Vane-Coe"
        agency="Stillwater Reps"
        initials="HV"
        facts={facts}
        {...props}
      />,
    ),
  };
};

describe("⚠️ the dot is StatusDot — never a recreation", () => {
  it("imports the canonical component and draws no circle of its own", () => {
    expect(decls(tsx)).toMatch(/import \{[^}]*\bStatusDot\b[^}]*\} from "\.\.\/StatusDot"/);
    /* The ref draws inline SVG circles because a standalone mockup has nothing to import. The four
       material marks are the only SVG this file may contain, and none of them is a circle. */
    expect(decls(tsx)).not.toContain("<circle");
    expect(decls(tsx)).not.toContain("borderRadius: \"50%\"");
  });

  it("renders it once per card, at the size the card asks for, named by the status", () => {
    const { html } = render({ status: QueryStatus.FULL_SENT, fullSentDate: ago(9), lastStatusChange: ago(9) });
    /* StatusDot's own markup: one `role="img"` wrapper carrying the exact enum string as its name.
       Asserting THAT rather than a `data-` attribute means this cannot pass on a lookalike. */
    const dots = html.match(/role="img" aria-label="([^"]*)"/g) ?? [];
    expect(dots, "the card drew no StatusDot").toHaveLength(1);
    expect(dots[0]).toContain('aria-label="Full Sent"');
    /* ⚠️ 24px, and it must be the DOT that is 24 — the component ignores `size` and honours
       `overrideSize`, so a card passing the wrong prop would silently render the app-wide 30. */
    expect(html).toMatch(/width:24px;height:24px/);
  });
});

describe("⚠️ burgundy is not a brand colour, and neither file may hold it", () => {
  it("no #7c3a2a, no --burg, in the component or its sheet", () => {
    for (const [what, src] of [["QueryCard.tsx", tsx], ["queryCard.css", css]] as const) {
      const d = decls(src);
      expect(d, `${what} holds a burgundy literal`).not.toMatch(/#7c3a2a/i);
      expect(d, `${what} reads a burgundy token`).not.toMatch(/var\(--burg\b/);
    }
  });

  it("⚠️ and nothing red reaches the card at all — the marker is ink", () => {
    const d = decls(css);
    /* Any hex the sheet states must be one the ref states. A new red would be a new hex. */
    const reds = (d.match(/#[0-9a-f]{6}\b/gi) ?? []).filter((h) => {
      const r = parseInt(h.slice(1, 3), 16), g = parseInt(h.slice(3, 5), 16), b = parseInt(h.slice(5, 7), 16);
      return r > 150 && r - g > 60 && r - b > 60;
    });
    expect(reds, `the card sheet states a red: ${reds.join(", ")}`).toHaveLength(0);
  });
});

describe("⚠️ the retired placeholder is not resurrected by prefix", () => {
  it("emits qcc- classes and never a bare qc-card", () => {
    const { html } = render({});
    /* Bounded on both sides — `not.toContain("qc-card")` would also match `qc-cards`, which is the
       prefix fault this repo has an audit about. */
    expect(html).not.toMatch(/["\s]qc-card["\s]/);
    expect(html).toMatch(/["\s]qcc["\s]/);
  });
});

describe("⚠️ the sentence survives being split into runs", () => {
  it("the rendered text equals the sentence, exactly — spaces included", () => {
    for (const over of [
      { dateSent: ago(14) },
      { dateSent: ago(120) },
      { status: QueryStatus.FULL_REQUESTED, lastStatusChange: ago(3) },
      { status: QueryStatus.OFFER, lastStatusChange: ago(2) },
    ]) {
      const { html, facts } = render(over);
      /* Read the PARENT's text, not each run's — a lost space between two runs exists only in the
         composition, and per-run assertions are exactly what cannot see it. */
      const m = html.match(/<span class="qcc-s">[\s\S]*?<\/span><\/span>/);
      expect(m, "the fact line is missing").not.toBeNull();
      const text = m![0].replace(/<[^>]+>/g, "").replace(/&#x27;/g, "'").replace(/&quot;/g, '"');
      expect(text.replace(/^!/, "")).toBe(sentenceText(facts.sentence));
    }
  });

  it("emphasis is a <b>, and the strong run is the one marked strong", () => {
    const { html, facts } = render({ dateSent: ago(14) });
    const strong = facts.sentence.find((r) => r.strong);
    expect(strong, "this shape has no emphasis to check").toBeTruthy();
    expect(html).toContain(`<b>${strong!.text}</b>`);
  });
});

describe("⚠️ the materials cluster is absent, not empty, when nothing is recorded", () => {
  it("no cluster at all — four faded slots would claim the query went out empty", () => {
    const { html } = render({});
    expect(html).not.toContain("qcc-mats");
    expect(html).not.toContain("qcc-ic");
  });

  it("four slots once anything is recorded, and the unrecorded ones are faded not dropped", () => {
    const { html } = render({ materialsWanted: ["Query letter"] });
    expect(html.match(/class="qcc-ic[^"]*"/g)?.length, "the cluster is not four slots").toBe(4);
    expect(html.match(/qcc-ic--off/g)?.length, "three slots should be faded").toBe(3);
    /* The tooltip states every slot including the absent ones — an em dash, never a blank. */
    expect(html.match(/qcc-tip-row/g)?.length).toBeGreaterThanOrEqual(4);
    expect(html).toContain("—");
  });
});

describe("the band, the leaf and the marker say what the facts say", () => {
  /**
   * ⚠️ RETARGETED, AND THE LAW IS UNCHANGED: the band's class comes from the DERIVATION and is
   * never re-decided in the component. What moved is which derivation — the band is the tint
   * ladder's rung (`stage`, eight of them) rather than the court (`turn`, five), because Queried
   * and Full Sent shared a colour under the courts and the ladder exists to separate them.
   * Both halves are asserted, since `turn` still drives the filters and the grouping.
   */
  it("the band class is the derived STATE — five values, not re-derived here", () => {
    /* ⚠️ RETARGETED (colours v2): the eight-rung ladder is retired from this page and the card
       wears `qcc--st-{state}`. The claim is unchanged in kind — the class is the DERIVATION's, not
       a second mapping in the component — and the table below is what changed: the two sends fold
       into sage, the three asks (R&R included) into pink, and depth leaves colour for StatusDot.
       `stage` is still asserted because the To-do stream reads it; the two keys are checked
       TOGETHER so a future edit cannot quietly change one and leave the other. */
    for (const [over, stage, state, turn] of [
      [{}, "out-1", "queried", "sand"],
      [{ status: QueryStatus.PARTIAL_SENT, partialSentDate: ago(9), lastStatusChange: ago(9) }, "out-2", "agent", "agent"],
      [{ status: QueryStatus.FULL_SENT, fullSentDate: ago(10), lastStatusChange: ago(10) }, "out-3", "agent", "agent"],
      [{ status: QueryStatus.PARTIAL_REQUESTED, lastStatusChange: ago(3) }, "in-1", "you", "you"],
      [{ status: QueryStatus.FULL_REQUESTED, lastStatusChange: ago(3) }, "in-2", "you", "you"],
      [{ status: QueryStatus.REVISE_RESUBMIT, lastStatusChange: ago(3) }, "in-3", "you", "you"],
      [{ status: QueryStatus.OFFER, lastStatusChange: ago(1) }, "offer", "offer", "offer"],
      [{ status: QueryStatus.REJECTED, lastStatusChange: ago(1) }, "closed", "closed", "closed"],
    ] as const) {
      const { html, facts } = render(over as Partial<Query>);
      expect(facts.stage, `stage for ${JSON.stringify(over)}`).toBe(stage);
      expect(facts.state, `state for ${JSON.stringify(over)}`).toBe(state);
      expect(facts.turn).toBe(turn);
      expect(html, `${state} card lost its band class`).toContain(`qcc--st-${state}`);
      expect(html, "the retired ladder class is still emitted").not.toContain(`qcc--s-${stage}`);
      expect(html).toContain(`data-qcc-turn="${turn}"`);
    }
  });

  it("⚠️ the retired court classes are gone from the rendered card", () => {
    const { html } = render({});
    for (const c of ["qcc--sand", "qcc--you", "qcc--agent"]) {
      expect(html, `${c} is still emitted`).not.toMatch(new RegExp(`["\\s]${c}["\\s]`));
    }
  });

  it("⚠️ the leaf caption is ONE word, on every shape", () => {
    for (const over of [
      {},
      { status: QueryStatus.PARTIAL_SENT, partialSentDate: ago(9), lastStatusChange: ago(9) },
      { status: QueryStatus.FULL_REQUESTED, lastStatusChange: ago(3) },
      { status: QueryStatus.OFFER, lastStatusChange: ago(1) },
      { status: QueryStatus.NO_RESPONSE, dateSent: ago(200) },
    ]) {
      const { html } = render(over);
      const cap = html.match(/<span class="qcc-leaf-cap">([^<]*)</)?.[1] ?? "";
      expect(cap, "no leaf caption rendered").not.toBe("");
      expect(cap.trim().split(/\s+/), `"${cap}" is more than one word`).toHaveLength(1);
    }
  });

  /* ⚠️ RETARGETED FROM THE `!` RING, WHICH IS RETIRED. The ring said "something here" in one shape
     and made the reader parse the sentence to find out what; the chip NAMES the register. The law
     is unchanged in kind — a marker appears exactly when the facts say so — and stronger in effect,
     because it now appears on EVERY card and the claim is that it says the right thing.

     ⚠️ AND THE CHIP CARRIES NO `aria-label`, DELIBERATELY. The ring needed one because "!" is a
     shape with no reading; the chip's own text is its name, and labelling it would make a screen
     reader say the register twice. Asserted, so nobody "restores" the label the ring had. */
  it("the register chip states the register, on every card, and is never double-labelled", () => {
    const late = render({ dateSent: ago(200) });
    expect(late.facts.register).toBe("late");
    expect(late.html).toContain("qcc-fact--late");
    expect(late.html).toContain("Past expected");

    const fine = render({ dateSent: ago(14) });
    expect(fine.facts.register).toBe("calm");
    expect(fine.html).toContain("qcc-fact--calm");
    expect(fine.html).toContain("Waiting");

    /* the ring is gone from the render, not hidden by a rule */
    for (const h of [late.html, fine.html]) {
      expect(h, "the retired ! ring still renders").not.toMatch(/["\s]qcc-mk["\s]/);
      expect(h, "the chip is labelled twice").not.toContain('aria-label="Needs attention"');
    }
  });
});

describe("⚠️ the ghost is inert and silent", () => {
  it("is hidden from assistive technology and is not a button", () => {
    const { html } = render({}, { ghost: true });
    /* ⚠️ THE ROOT'S OWN TAG, NOT THE STRING ANYWHERE. The monogram chip inside every card also
       carries `aria-hidden`, so a whole-document `toContain` passes on a ghost that lost its own —
       proved by mutation, which is the only reason this reads the opening tag. */
    const root = html.slice(0, html.indexOf(">") + 1);
    expect(root, "the ghost root is not hidden").toContain('aria-hidden="true"');
    expect(root).toContain("qcc--ghost");
    expect(root.startsWith("<div")).toBe(true);
    expect(html).not.toContain("<button");
  });

  it("a real card IS a button, and names itself", () => {
    const { html, facts } = render({});
    expect(html.startsWith("<button")).toBe(true);
    expect(html).toContain("Harriet Vane-Coe, Stillwater Reps");
    expect(html).toContain(sentenceText(facts.sentence));
  });
});

describe("⚠️ the stylesheet's own traps", () => {
  it("no var() inside @keyframes — it fails silently in this setup", () => {
    const frames = decls(css).match(/@keyframes[^{]*\{[\s\S]*?\n\}/g) ?? [];
    expect(frames.length, "the enter animation is missing").toBeGreaterThan(0);
    for (const f of frames) expect(f, "a keyframe block reads a token").not.toContain("var(");
  });

  it("every STATE token the sheet reads is one the page declares — and no ladder token survives here", () => {
    /* ⚠️ RETARGETED (colours v2). The law is the same one — a `var()` on an undeclared property
       paints nothing, silently — pointed at the five that replaced the eight. And the inverse is
       asserted too: this sheet may no longer read a `--stage-*` at all, which is the grep the
       palette run promised, expressed where it cannot rot. */
    const f12 = readFileSync(join(process.cwd(), "src/components/shell/f12.css"), "utf8");
    const read = new Set((decls(css).match(/var\((--state-[a-z0-9-]+)/g) ?? []).map((m) => m.slice(4)));
    expect(read.size, "the sheet reads no state token at all").toBeGreaterThan(4);
    for (const t of read) expect(f12, `${t} is read but never declared`).toContain(`${t}:`);
    expect(decls(css), "the retired ladder is still read here").not.toMatch(/var\(--stage-/);
  });

  it("⚠️ the retired turn tints are GONE, not left inert", () => {
    /* Bounded so `--turn-` cannot match some future longer token by prefix. */
    for (const [what, src] of [["QueryCard.tsx", tsx], ["queryCard.css", css]] as const) {
      expect(decls(src), `${what} still reads a retired turn token`).not.toMatch(/var\(--turn-/);
      expect(decls(src), `${what} still emits a retired court class`).not.toMatch(/qcc--(sand|you|agent)\b/);
    }
    /* the rejected sand pair from the ref's own demo toggle */
    expect(decls(css)).not.toMatch(/#f7ebd7|#f1e1c8/i);
  });

  it("⚠️ hover changes the shadow and never the transform — a lift fights the grid's FLIP", () => {
    const hover = decls(css).match(/\.qcc:hover\s*\{[^}]*\}/)?.[0] ?? "";
    expect(hover, ".qcc:hover is missing").not.toBe("");
    expect(hover).toContain("box-shadow");
    expect(hover).not.toContain("transform");
  });
});
