/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ ONE CARD, ONE DEED — asserted as an IDENTITY between the two surfaces, not as each reading the
 * right variable. There were three wordings for one card (`listDeed` "Consider closing", `rowDeed`
 * "Log the close", and `card.title` on notes), which is the three-activity-stores disease in copy:
 * every one of them read correctly and they disagreed anyway.
 *
 * A test that checked "the band reads `rowDeed`" would have passed throughout. This compares the
 * two DERIVATIONS against each other for every card type, so a future synonym fails here rather
 * than on a screen.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { taskDeed, deedSentence, DEED_FORM, cardBucket, BUCKET_ORDER, type DeedSpan } from "./todoBuckets";
import { listDeed, PANE_COPY } from "./taskListRow";
import { BoardCard } from "./todoBoard";

const card = (over: Partial<BoardCard>): BoardCard => ({
  key: "k", stream: "do", title: "A sentence the card happens to carry", who: "Ana Duarte",
  subtitle: "", due: "", warn: false, snoozes: 0, hk: false, initials: "AD", record: "Duarte Words",
  committed: false, done: false, ...over,
} as BoardCard);

const TYPES = [
  "partial_requested", "full_requested", "revise_resubmit",
  "offer_received", "nudge_overdue", "no_response_close",
  "materials_unrecorded", "materials_unrecorded_bulk",
];

/** the band as the pane renders it — the spans flattened, which is the string a reader sees */
const flat = (spans: DeedSpan[]): string => spans.map((x) => x.text).join("");

describe("the row and the band say the same thing", () => {
  /**
   * ⚠️ RETARGETED AT THE PAIR THE PAGE ACTUALLY RENDERS (chase round, Phase 1).
   *
   * It compared `bandDeed` with `listDeed`. Both were `taskDeed` — `bandDeed` was a one-line alias
   * with NO RENDERER anywhere in `src/` — so the assertion compared a function with itself and was
   * satisfied by construction. Meanwhile the band renders `deedSentence`, which was never in it.
   * The comment above claimed this was "the claim that actually protects this"; it protected the
   * short deed's two aliases and nothing about the band.
   *
   * The right pair is the ROW's deed against the BAND's sentence, judged by what each bucket
   * DECLARES in `DEED_FORM` — because after Phase 1 they are legitimately different for a chase
   * ("Worth a nudge" beside "Nudge Ana Duarte at Duarte Words about …") and that difference is the
   * feature, not a drift.
   */
  it("every task type renders the form its bucket declares, and never the card's own sentence", () => {
    for (const taskType of TYPES) {
      const c = card({ taskType });
      const partial = taskType === "partial_requested";
      const row = listDeed({ card: c, partial });
      const band = flat(deedSentence(c, { title: "The Smoke Test", agent: c.who, agency: c.record, partial }));
      const form = DEED_FORM[cardBucket(c)];

      if (form === "short") {
        expect(band, `${taskType}: declared short, and the band composed a sentence`).toBe(row);
      } else {
        expect(band, `${taskType}: declared ${form}, and the band fell back to the row deed`)
          .not.toBe(row);
      }
      expect(band, `${taskType}: the deed fell back to the card's own sentence`).not.toBe(c.title);
    }
  });

  /**
   * ⚠️ EVERY BUCKET DECLARES, AND THE DECLARATION IS CHECKED AGAINST THE BUILDER — not restated as
   * strings. A bucket declared `sentence` whose output equals the short deed has lost its template;
   * one declared `short` whose output does not is being templated without saying so.
   */
  it("no bucket falls through to the row deed undeclared", () => {
    for (const b of BUCKET_ORDER) {
      expect(DEED_FORM[b], `${b} has no declared deed form`).toBeTruthy();
    }
    /* the one bucket that keeps the short deed says so, and it is the only one */
    expect(BUCKET_ORDER.filter((b) => DEED_FORM[b] === "short")).toEqual(["decide"]);
  });

  it("a note's deed is the writer's own words on both surfaces", () => {
    /* ⚠️ NOT A SYNONYM — a note's deed IS `card.title`, which is a different fact from three
       wordings for one derived deed. Asserted so the collapse above cannot swallow it. */
    const n = card({ nature: "note", userTaskId: "u1", title: "Check W&A for new agents" });
    expect(listDeed({ card: n })).toBe("Check W&A for new agents");
    /* the band, as the pane builds it — `own` words, so the template adds nothing */
    expect(flat(deedSentence(n, { title: "The Smoke Test", agent: n.who, agency: n.record })))
      .toBe("Check W&A for new agents");
    expect(DEED_FORM[cardBucket(n)]).toBe("own");
  });

  it("no retired verb survives in any deed", () => {
    /* the review's four, as WORDS a reader sees */
    for (const taskType of TYPES) {
      const d = taskDeed(card({ taskType })).toLowerCase();
      for (const v of ["log", "record", "mark", "chase"]) {
        /* "Fill in what you sent" is the fix deed; "record" must not appear in any of them */
        expect(d, `${taskType} says "${v}"`).not.toMatch(new RegExp("\\b" + v + "\\b"));
      }
    }
  });

  /**
   * ⚠️ THE OVERRIDE, PINNED — so it cannot be "corrected" back by someone reading the retired-verb
   * rule and not the exception to it (finishing round, Phase 4).
   *
   * "log" is retired as a DEED verb and stays retired: the case above still sweeps every task type.
   * The owner has since permitted it on the pane's PRIMARIES, deliberately and after the previous
   * round shipped the alternative. Both rules are asserted here, together, because the danger is
   * not either rule — it is someone finding one of them alone.
   */
  it("the primaries carry the owner's override, and the deeds still do not", () => {
    expect(PANE_COPY.send.primary).toBe("Log as sent");
    expect(PANE_COPY.close.primary).toBe("Log the close");
    expect(PANE_COPY.fix.primary).toBe("Log as sent");
    expect(PANE_COPY.note.primary).toBe("Tick it off");
    /* and the exception is SCOPED: no deed gained the verb the primaries were given */
    for (const taskType of TYPES) {
      expect(taskDeed(card({ taskType })).toLowerCase(), `${taskType} deed says "log"`)
        .not.toMatch(/\blog\b/);
    }
  });

  /**
   * ⚠️ `bandDeed` IS DELETED, NOT LEFT AS AN ALIAS. An unrendered one-line delegation is what made
   * the identity assertion above look like it was about the band for as long as it was.
   */
  it("⚠️ `bandDeed` stays deleted — an unrendered alias is how a vacuous claim survives", () => {
    const handoff = readFileSync(join(__dirname, "todoHandoff.ts"), "utf8");
    expect(handoff, "bandDeed came back").not.toMatch(/export const bandDeed/);
  });

  it("⚠️ `rowDeed` is an alias, and nothing reads it as a second table", () => {
    /* ⚠️ ON DECLARATIONS — the deprecation note names `rowDeed` while explaining it. */
    const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    const buckets = strip(readFileSync(join(__dirname, "todoBuckets.ts"), "utf8"));
    /* one line, delegating — never a switch of its own */
    expect(buckets).toContain("export const rowDeed = (c: BoardCard): string => taskDeed(c);");
    for (const dead of ["Answer the offer", "Chase your query", "Log the close", "Send your full\""]) {
      expect(buckets, `the old table survives: ${dead}`).not.toContain(dead);
    }
  });
});

/**
 * ⚠️ THE CHASE NAMES WHO IT CONCERNS (chase round, Phase 1).
 *
 * It had no template and fell through to the short deed, so the band read "Worth a nudge" and —
 * once the sub-line was removed — nothing on the card said which agent it was about.
 */
describe("⚠️ the chase deed names the agent", () => {
  const chase = (over: Partial<BoardCard> = {}) => card({ taskType: "nudge_overdue", ...over });
  const say = (p: { title?: string; agent?: string; agency?: string }) =>
    flat(deedSentence(chase({ who: p.agent ?? "", record: p.agency ?? "" }), p));

  it("names agent, agency and title when the record has all three", () => {
    expect(say({ agent: "Ana Duarte", agency: "Duarte Words", title: "The Smoke Test" }))
      .toBe("Nudge Ana Duarte at Duarte Words about The Smoke Test");
  });

  /**
   * ⚠️ EACH PART OMITS ITSELF — never a placeholder. The row's own meta says "no agency" and "agent
   * not specified" because a LIST column has to hold its shape; a sentence does not, and putting
   * those words in one would have the app state an absence as though it were a name.
   */
  it("degrades by dropping, and no degraded form carries a placeholder", () => {
    expect(say({ agent: "Ana Duarte", title: "The Smoke Test" }))
      .toBe("Nudge Ana Duarte about The Smoke Test");
    expect(say({ agency: "Duarte Words", title: "The Smoke Test" }))
      .toBe("Nudge Duarte Words about The Smoke Test");
    expect(say({ title: "The Smoke Test" })).toBe("Nudge them about The Smoke Test");
    /* and with nothing at all it is still a sentence rather than a dangling clause */
    expect(say({})).toBe("Nudge them");

    for (const s of [say({ agent: "Ana Duarte", title: "T" }), say({ agency: "D", title: "T" }),
                     say({ title: "T" }), say({})]) {
      for (const placeholder of ["no agency", "agent not specified", "undefined", "null", "  "]) {
        expect(s, `a degraded chase deed carries "${placeholder}"`).not.toContain(placeholder);
      }
      expect(s.trim(), "a degraded chase deed ends mid-clause").not.toMatch(/\b(at|about|to|for)$/);
    }
  });

  /**
   * ⚠️ THE EMPHASIS IS THE SUBJECT, AND IT IS ITALIC IN THE HEADING'S OWN INK. The spans carry `em`
   * and the stylesheet declares `color: inherit`; a heading that shifts colour mid-sentence reads
   * as two things. Asserted on the spans so a burgundy revival has to get past this first.
   */
  it("the agent, the agency and the title are the emphasised spans", () => {
    const spans = deedSentence(chase({ who: "Ana Duarte", record: "Duarte Words" }),
      { agent: "Ana Duarte", agency: "Duarte Words", title: "The Smoke Test" });
    expect(spans.filter((x) => x.em).map((x) => x.text))
      .toEqual(["Ana Duarte", "Duarte Words", "The Smoke Test"]);
    /* the verb is never emphasised — it is the same on every card in the group */
    expect(spans[0]).toEqual({ text: "Nudge " });
  });

  /** the row is a summary and keeps its own words — the two surfaces differ on purpose now */
  it("the row still reads the short deed", () => {
    expect(listDeed({ card: chase({}) })).toBe("Worth a nudge");
  });
});
