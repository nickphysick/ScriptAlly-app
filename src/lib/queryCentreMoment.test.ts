/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre · §5 — THE MOMENT. Three devices, one per phase: the light as it opens, a beat as it
 * arrives, a seal as it saves.
 *
 * ⚠️ THE FAILURE MODE THIS FILE EXISTS FOR IS NOT "the animation broke". It is the animation
 * becoming a PERFORMANCE — a pulse that loops, a stage that darkens for bad news, a seal that
 * promises before the write lands. A journey used weekly has to stay furniture, and every case
 * below is one of the specific ways it stops being.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { OUTCOME_SEAL, OUTCOME_ORDER } from "./responseDraft";
import { consequenceLine } from "./queryAmbient";
import { QueryStatus } from "../types";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const css = read("../components/shell/f12.css");
const sheet = read("../components/queries/QueryJourneySheet.tsx");
const queries = read("../components/Queries.tsx");
const code = queries.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/**
 * The §5 block.
 *
 * ⚠️ COMMENT-STRIPPED, because the block's own prose DISCUSSES what it must not contain — "no
 * `infinite` anywhere in the block" is written in the block, so a raw scan fails on the rule
 * explaining the rule. Seventh time this shape has bitten in this pack alone; a rule about code is
 * asserted against code, always.
 */
const moment = (): string => {
  const marker = css.indexOf("* THE MOMENT (§5)");
  expect(marker, "the §5 block is missing").toBeGreaterThan(-1);
  /* ⚠️ SLICE FROM THE COMMENT'S OPENER, NOT FROM THE MARKER INSIDE IT. Starting at the marker cuts
     the block's leading `/*` off, so the stripper below finds no opening delimiter and leaves that
     whole comment in — which is the one comment that quotes the words being asserted absent. The
     strip looked like it was working and was silently doing nothing to the only part that mattered. */
  const from = css.lastIndexOf("/*", marker);
  expect(from, "the §5 block's comment opener is missing").toBeGreaterThan(-1);
  return css.slice(from).replace(/\/\*[\s\S]*?\*\//g, "");
};

const rule = (selector: string): string => {
  const i = css.indexOf("\n" + selector + " {");
  return i < 0 ? "" : css.slice(i, css.indexOf("}", i) + 1);
};
const frames = (name: string): string => {
  const at = css.indexOf(`@keyframes ${name}`);
  if (at < 0) return "";
  const open = css.indexOf("{", at);
  let depth = 1, i = open + 1;
  while (i < css.length && depth) { if (css[i] === "{") depth++; else if (css[i] === "}") depth--; i++; }
  return css.slice(at, i);
};

describe("§5 · nothing loops, and nothing holds a frame it should not", () => {
  /* ⚠️ A CONTINUOUS PULSE ON A HEADER READS AS AN ALARM. It will be resented by the tenth use, and
     by then it is chrome nobody can point at. One beat, then stillness. */
  it("no device iterates", () => {
    expect(moment(), "a device started looping").not.toContain("infinite");
  });

  /**
   * ⚠️ NO PERSISTENT FILL-MODE ON ANY DEVICE. `forwards` / `both` outrank inline transforms, so a
   * finished animation silently discards a FLIP offset — measured in this repo at ~7px of
   * displacement with every element correct and no error anywhere. The save path FLIPs the landing
   * row, so a device holding its final frame is a real hazard rather than a tidiness rule.
   *
   * These settle because their BASE RULE is already the resting state and the keyframes travel to
   * it — which is what makes the fill-mode unnecessary rather than merely omitted.
   */
  it("no device declares forwards or both", () => {
    for (const sel of [".qc-entering .qc-motif::after", ".qc-seal", ".qc-dock-sealed::before"]) {
      const r = rule(sel);
      expect(r, `${sel} has no rule`).not.toBe("");
      expect(r, `${sel} holds its final frame — it would outrank a FLIP's inline transform`)
        .not.toMatch(/\b(forwards|both)\b/);
    }
  });

  /* ⚠️ A `var()` INSIDE A KEYFRAME IS A DOCUMENTED SILENT FAILURE HERE, and the dock's glow was
     written that way first — `background: rgba(var(--qc-ink-rgb), .05)` in a percentage frame. The
     tint moved onto the rule and only the opacity is animated. */
  it("no device puts a var() in a keyframe", () => {
    for (const name of ["qc-beat", "qc-seal", "qc-dock-glow"]) {
      const f = frames(name);
      expect(f, `${name} is missing`).not.toBe("");
      expect(f, `${name} has a var() in a keyframe`).not.toContain("var(");
    }
  });
});

describe("§5 · 1 · the lamplight dim", () => {
  it("the chrome falls back and desaturates; nothing goes black and nothing blurs", () => {
    const r = rule("#root.qc-lamp");
    expect(r, "the dim rule is missing").not.toBe("");
    expect(r, "the dim stopped being a fade").toContain("opacity:");
    expect(r, "the desaturation went").toContain("saturate(");
    expect(r, "a blur says 'you cannot read this' — the desk is what the writer must still see")
      .not.toContain("blur(");
    expect(moment(), "the room went black").not.toMatch(/#000|rgba\(0,\s*0,\s*0/);
    expect(r, "the dim stopped taking its ~500ms").toContain("500ms");
  });

  /* ⚠️ THREE DEPTHS, AND ONLY ONE OUTCOME MOVES IT. A pass is not darker, just quieter; a room
     that dimmed for a rejection would be reacting to bad news on the writer's behalf. */
  it("record is deeper than create, offer deeper again, and no other outcome moves the light", () => {
    const depth = (sel: string) => {
      const m = /--qc-lamp:\s*([\d.]+)/.exec(rule(sel));
      expect(m, `${sel} states no depth`).toBeTruthy();
      return Number(m![1]);
    };
    const create = depth("#root.qc-lamp");
    const record = depth("#root.qc-lamp-record");
    const offer = depth("#root.qc-lamp-offer");
    expect(record, "record is not deeper than create").toBeLessThan(create);
    expect(offer, "an offer is not deeper than an ordinary reply").toBeLessThan(record);

    /* at source, `offer` is the ONLY outcome consulted */
    expect(code, "the lamp depth stopped being driven by the outcome")
      .toContain('lamp={recording ? (respDraft?.outcome === "offer" ? "offer" : "record") : "create"}');
    for (const o of ["rejected", "noreply", "partial", "full", "rr"]) {
      expect(code, `${o} started changing the light`).not.toContain(`outcome === "${o}" ? "`);
    }
  });

  /* ⚠️ IT PAINTS; IT DOES NOT GATE. What actually seals the desk is `inert` (§3) — a separate
     mechanism on purpose, so the dim can change without touching what is reachable. Escape and the
     dirty guard work throughout. */
  it("the dim never gates interaction", () => {
    const r = rule("#root.qc-lamp");
    expect(r, "the dim started swallowing events").not.toContain("pointer-events");
    expect(r, "the dim started hiding the desk outright").not.toContain("display:");
  });

  it("it is applied and removed by one owner, and cleans up after itself", () => {
    expect(sheet, "the dim is not applied").toContain('classList.add("qc-lamp")');
    expect(sheet, "the dim is never removed — the page would stay dark after the sheet closed")
      .toContain('classList.remove("qc-lamp", "qc-lamp-record", "qc-lamp-offer")');
    /* the three depths are mutually exclusive classes, not booleans that could both be true */
    expect(sheet).toContain('classList.toggle("qc-lamp-offer", depth === "offer")');
  });
});

describe("§5 · 2 · the arrival beat", () => {
  it("one ring, ~900ms, off the motif, then still", () => {
    const r = rule(".qc-entering .qc-motif::after");
    expect(r, "the beat is missing").not.toBe("");
    expect(r).toContain("qc-beat 900ms");
    /* armed by the ENTRANCE scope, so it cannot re-fire on a re-render mid-journey */
    expect(r, "the beat left the entrance scope — it would replay on any re-render")
      .toContain(".qc-entering");
  });

  /**
   * ⚠️ THE RING IS A SIBLING SPAN'S PSEUDO-ELEMENT, NOT `img::after`. An `<img>` is a replaced
   * element and cannot carry one: written that way the rule parses, passes every source lock, and
   * draws absolutely nothing. Both journeys wrap their motif.
   */
  it("the motif is wrapped, because a replaced element cannot carry a pseudo-element", () => {
    expect((code.match(/className="qc-motif"/g) ?? []).length,
      "both journeys must wrap their motif — one unwrapped draws no beat at all").toBe(2);
    expect(code, "the ring was hung off the image itself").not.toMatch(/qch-ill[^>]*::after/);
  });

  /* the register's colour, so the beat says which journey this is before the title is read */
  it("burgundy in create, sage in record", () => {
    expect(rule(".qc-motif::after"), "the beat has no colour").toContain("var(--qc-beat, var(--burg))");
    expect(rule(".qc-sheet--record .qc-motif::after"), "record's beat is not sage")
      .toContain("var(--sage)");
  });
});

describe("§5 · 3 · the seal", () => {
  /* ⚠️ BOUND TO WRITE RESOLUTION, NEVER TO THE CLICK. A seal on press is a promise; this is a
     receipt. Both save paths arm it past the write and past every early return. */
  it("it stamps past the write, in both journeys, and never on a rejected one", () => {
    for (const [name, marker] of [["create", "await addQuery"], ["record", "await recordQueryResponse"]] as const) {
      const at = code.indexOf(marker);
      expect(at, `${name}'s write is missing`).toBeGreaterThan(-1);
      const seal = code.indexOf("setSeal(", at);
      expect(seal, `${name} does not seal at all`).toBeGreaterThan(at);
    }
    /* and no arming sits in a click handler */
    expect(code, "the seal moved into a click handler — it would be a receipt for an unfinished write")
      .not.toMatch(/onClick=\{[^}]*setSeal\(/);
  });

  it("the colour follows the outcome mapping, and endings are never red", () => {
    expect(OUTCOME_SEAL.partial).toBe("sage");
    expect(OUTCOME_SEAL.full).toBe("sage");
    /* ⚠️ R&R IS A REQUEST, NOT AN ENDING. It reads like a setback and is an invitation: the agent
       wants to see the work again. Sealing it grey would close a door that is open. */
    expect(OUTCOME_SEAL.rr, "Revise & Resubmit was sealed as an ending").toBe("sage");
    expect(OUTCOME_SEAL.offer).toBe("burgundy");
    expect(OUTCOME_SEAL.rejected).toBe("grey");
    expect(OUTCOME_SEAL.noreply).toBe("grey");
    /* every outcome has one, so no save can stamp an unstyled seal */
    for (const o of OUTCOME_ORDER) expect(OUTCOME_SEAL[o], `${o} has no seal`).toBeTruthy();
    /* create is always burgundy — one thing can have happened, so nothing varies */
    expect(code, "create's seal started varying").toContain('setSeal({ kind: "burgundy"');
  });

  /* ⚠️ WARM GREY, NEVER RED, AND THE WAX READS TOKENS. A pass is the commonest thing that happens
     to a query; red would make the ordinary outcome of the work look like a fault. */
  it("the three waxes are tokens, and none of them is red", () => {
    for (const [mod, token] of [["sage", "--sage"], ["burgundy", "--burg"], ["grey", "--muted"]] as const) {
      const r = rule(`.qc-seal--${mod}`);
      expect(r, `.qc-seal--${mod} is missing`).not.toBe("");
      expect(r, `${mod} stopped reading a token`).toContain(`var(${token})`);
    }
    const m = moment();
    const hexes = (m.match(/#[0-9a-fA-F]{3,6}\b/g) ?? []);
    expect(hexes, `§5 introduced colour literals: ${hexes.join(", ")}`).toHaveLength(0);
  });

  /**
   * ⚠️ THE SEAL IS THE BEAT BEFORE THE EXIT, and its `animationend` is what arms it. Armed
   * together, a 650ms seal is cut off a third of the way through by a 220ms exit — so the sheet
   * would leave before the receipt had finished being one.
   */
  it("the exit follows the seal, by animationend and not by a timer", () => {
    expect(code, "the seal does not hand off to the exit")
      .toContain('if (seal && e.animationName === "qc-seal")');
    const at = code.indexOf('if (seal && e.animationName === "qc-seal")');
    const handoff = code.slice(at, code.indexOf("return;", at));
    expect(handoff, "the handoff does not arm either exit").toContain("setRespExiting(true)");
    expect(handoff).toContain("setCreateExiting(true)");
    expect(handoff, "a timer stood in for the animation").not.toContain("setTimeout");
    /* `Save & log another` seals without leaving — the seal marks the save, not the departure */
    expect(handoff, "every seal now exits, including the batch save").toContain("if (leaving)");
  });

  /* ⚠️ AND THE SEAL IS CLEARED ON EVERY TEARDOWN AND EVERY FRESH OPEN. Under reduced motion it is
     armed with no `animationend` to retire it, so a stale receipt would greet the next sitting. */
  it("no seal survives into the next sitting", () => {
    for (const fn of ["const shutCreate", "const shutRecord", "const openRecord", "const openCreate"]) {
      const at = code.indexOf(fn);
      if (at < 0) continue;
      const body = code.slice(at, code.indexOf("\n  };", at));
      expect(body, `${fn} does not clear the seal`).toContain("setSeal(null)");
    }
  });

  /* the dock exhales as the row lands behind — a breath, not a state */
  it("the dock's glow is transient", () => {
    const f = frames("qc-dock-glow");
    expect(f, "the glow keyframe is missing").not.toBe("");
    expect(f, "the glow does not return to nothing — it would be a state, not a breath")
      .toMatch(/100%\s*\{\s*opacity:\s*0/);
  });
});

describe("§5 · 4 · the consequence line reports, it never coaches", () => {
  it("it reads its empty state before an outcome is chosen", () => {
    expect(consequenceLine(null)).toBe("Nothing saved yet");
  });

  it("it updates with the outcome, and states what the save will DO", () => {
    for (const o of OUTCOME_ORDER) {
      const line = consequenceLine(OUTCOME_SEAL[o] ? undefined as never : null) as unknown;
      expect(line === undefined || typeof line === "string").toBe(true);
    }
    expect(consequenceLine(QueryStatus.OFFER), "the line stopped naming the outcome").toContain("Offer");
    expect(consequenceLine(QueryStatus.REJECTED), "an ending states it is closed").toContain("closed");
  });

  /* ⚠️ REPORTING, NOT COACHING — asserted across every status, because this is copy that arrives
     one encouraging word at a time. */
  it("it never appraises and never instructs", () => {
    const BAD = /\b(only|already|still|great|well done|nice|good|streak|keep going|remember|don't forget|make sure|should|try to)\b/i;
    for (const status of Object.values(QueryStatus)) {
      expect(consequenceLine(status as QueryStatus), `${status} appraises or instructs`).not.toMatch(BAD);
    }
  });
});

describe("§5 · reduced motion cuts to the final frame", () => {
  /* ⚠️ IT REMOVES THE TRAVEL, NOT THE DEVICE. The dim still dims, the seal still shows — it is a
     receipt, and suppressing it would remove the confirmation rather than the movement — and the
     scrim (§2) stays applied, because a reader who asked for less motion is still owed the dimmed
     desk that says the rest of the page is not currently theirs. */
  it("all three are suppressed, and none of them is deleted", () => {
    const m = moment();
    /* ⚠️ BOUNDED AT BOTH ENDS. This sliced to END OF FILE, so it read every rule appended after the
       reduced-motion block — and the moment a `max-height` block landed below it, the lock reported
       "reduced motion HID the seal" about a `display: none` belonging to something else entirely.
       Third open-ended slice caught this way; an unbounded slice bets nothing will be added below. */
    /**
     * ⚠️ `lastIndexOf` WAS THE WRONG ANCHOR, AND §1 PROVED IT. It meant "the reduced-motion block at
     * the end of the file", which was true until a later section appended one of its own — the
     * thread's settle — and this then sliced THAT block and reported "the reduced-motion block
     * never closes". The fourth open-ended-anchor fault in this suite, and the same lesson: anchor
     * on the CONTENT you are asserting about, never on a position in the file.
     */
    const marker = m.indexOf("#root.qc-lamp { transition: none; }");
    expect(marker, "the §5 reduced-motion rule is missing").toBeGreaterThan(-1);
    const at = m.lastIndexOf("@media (prefers-reduced-motion: reduce)", marker);
    expect(at, "the §5 reduced-motion block is missing").toBeGreaterThan(-1);
    const close = m.indexOf("\n}", at);
    expect(close, "the reduced-motion block never closes").toBeGreaterThan(at);
    const block = m.slice(at, close + 2);
    expect(block, "the dim keeps travelling").toContain("#root.qc-lamp { transition: none; }");
    expect(block, "the beat keeps playing").toContain(".qc-entering .qc-motif::after { animation: none; }");
    expect(block, "the seal keeps stamping").toContain(".qc-seal { animation: none; }");
    expect(block, "reduced motion HID the seal — it would remove the receipt, not the movement")
      .not.toMatch(/display:\s*none/);
    expect(block, "reduced motion zeroed the seal — same fault, quieter").not.toMatch(/opacity:\s*0\s*;/);
  });

  /* ⚠️ AND THE JS HALF: `animation: none` fires no `animationend`, so a seal-armed exit would
     strand the sheet open forever. Both paths branch at the arming site. */
  it("the save paths branch rather than waiting for an event that never arrives", () => {
    expect(code).toContain('if (prefersReducedMotion()) { setSeal({ kind, thenExit: false }); shutRecord();');
    expect(code).toContain('setSeal({ kind: "burgundy", thenExit: false });');
    expect(code, "reduced motion armed a handoff it will never receive")
      .not.toMatch(/prefersReducedMotion\(\)\s*\)\s*\{[^}]*thenExit:\s*true/);
  });
});
